import './env.mjs';

import crypto from 'node:crypto';

import cors from 'cors';
import express from 'express';

import { ensureDatabaseSchema, pool, withTransaction } from './db.mjs';
import { sendOtpEmail } from './mailer.mjs';
import { createDefaultProfileData, isValidProfilePayload, normalizeProfilePayload } from './profile.mjs';

const app = express();
const port = Number.parseInt(process.env.PORT ?? '3001', 10);
const otpSecret = process.env.OTP_SECRET ?? 'change-this-otp-secret';
const sessionSecret = process.env.SESSION_SECRET ?? otpSecret;
const otpExpiryMinutes = Number.parseInt(process.env.OTP_EXPIRY_MINUTES ?? '10', 10);
const sessionTtlDays = Number.parseInt(process.env.SESSION_TTL_DAYS ?? '30', 10);
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((item) => item.trim())
  : true;

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '1mb' }));

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hashOtp(email, otp) {
  return crypto.createHash('sha256').update(`${email}:${otp}:${otpSecret}`).digest('hex');
}

function hashSessionToken(token) {
  return crypto.createHash('sha256').update(`${token}:${sessionSecret}`).digest('hex');
}

function generateOtp() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function createSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function buildUserResponse(row) {
  return {
    id: row.id,
    email: row.email,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

async function cleanupAuthArtifacts(client, email) {
  await client.query(
    `
      delete from email_otps
      where email = $1
         or expires_at < now()
         or consumed_at is not null
    `,
    [email]
  );

  await client.query('delete from user_sessions where expires_at < now()');
}

async function loadUserProfile(client, userId) {
  const result = await client.query(
    `
      select profile_data, updated_at
      from user_profiles
      where user_id = $1
    `,
    [userId]
  );

  if (!result.rowCount) {
    return {
      profile: createDefaultProfileData(),
      profileUpdatedAt: null,
    };
  }

  return {
    profile: normalizeProfilePayload(result.rows[0].profile_data),
    profileUpdatedAt: result.rows[0].updated_at,
  };
}

async function requireSession(req, res, next) {
  try {
    const authorization = req.headers.authorization ?? '';
    const sessionToken = authorization.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : '';

    if (!sessionToken) {
      return res.status(401).json({ message: 'Missing session token.' });
    }

    const sessionHash = hashSessionToken(sessionToken);
    const result = await pool.query(
      `
        select s.user_id, s.session_hash, u.email, u.created_at, u.last_login_at
        from user_sessions s
        join app_users u on u.id = s.user_id
        where s.session_hash = $1
          and s.expires_at > now()
        limit 1
      `,
      [sessionHash]
    );

    if (!result.rowCount) {
      return res.status(401).json({ message: 'Session expired. Please request a new OTP.' });
    }

    req.auth = {
      email: result.rows[0].email,
      sessionHash: result.rows[0].session_hash,
      user: buildUserResponse(result.rows[0]),
      userId: result.rows[0].user_id,
    };

    next();
  } catch (error) {
    next(error);
  }
}

app.get('/api/health', async (_req, res) => {
  const result = await pool.query('select now() as now');

  res.json({
    ok: true,
    now: result.rows[0].now,
    service: 'sipup-auth-api',
  });
});

app.post('/api/auth/request-otp', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }

    const recentOtp = await pool.query(
      `
        select created_at
        from email_otps
        where email = $1
        order by created_at desc
        limit 1
      `,
      [email]
    );

    if (recentOtp.rowCount) {
      const secondsSinceLastOtp =
        (Date.now() - new Date(recentOtp.rows[0].created_at).getTime()) / 1000;

      if (secondsSinceLastOtp < 45) {
        return res.status(429).json({
          message: 'Please wait a few seconds before requesting another OTP.',
        });
      }
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + otpExpiryMinutes * 60 * 1000);

    await withTransaction(async (client) => {
      await cleanupAuthArtifacts(client, email);
      await client.query(
        `
          insert into email_otps (email, otp_hash, expires_at)
          values ($1, $2, $3)
        `,
        [email, hashOtp(email, otp), expiresAt]
      );
    });

    await sendOtpEmail({ email, otp });

    res.json({
      message: `OTP sent to ${email}.`,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/verify-otp', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp ?? '').replace(/\D/g, '').slice(0, 6);

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }

    if (otp.length !== 6) {
      return res.status(400).json({ message: 'Enter the 6-digit OTP from your email.' });
    }

    const response = await withTransaction(async (client) => {
      await cleanupAuthArtifacts(client, email);

      const otpResult = await client.query(
        `
          select id, otp_hash
          from email_otps
          where email = $1
            and consumed_at is null
            and expires_at > now()
          order by created_at desc
          limit 1
          for update
        `,
        [email]
      );

      if (!otpResult.rowCount) {
        return { error: 'OTP expired. Request a new code.' };
      }

      if (otpResult.rows[0].otp_hash !== hashOtp(email, otp)) {
        return { error: 'Incorrect OTP. Try again.' };
      }

      await client.query(
        `
          update email_otps
          set consumed_at = now()
          where id = $1
        `,
        [otpResult.rows[0].id]
      );

      const existingUser = await client.query(
        `
          select id
          from app_users
          where email = $1
          limit 1
        `,
        [email]
      );

      const isNewUser = existingUser.rowCount === 0;

      const userResult = await client.query(
        `
          insert into app_users (email, last_login_at)
          values ($1, now())
          on conflict (email)
          do update set last_login_at = now()
          returning id, email, created_at, last_login_at
        `,
        [email]
      );

      const user = userResult.rows[0];
      const sessionToken = createSessionToken();
      const sessionExpiresAt = new Date(Date.now() + sessionTtlDays * 24 * 60 * 60 * 1000);

      await client.query(
        `
          insert into user_sessions (user_id, session_hash, expires_at)
          values ($1, $2, $3)
        `,
        [user.id, hashSessionToken(sessionToken), sessionExpiresAt]
      );

      await client.query(
        `
          insert into user_profiles (user_id, profile_data)
          values ($1, $2::jsonb)
          on conflict (user_id) do nothing
        `,
        [user.id, JSON.stringify(createDefaultProfileData())]
      );

      const profileState = await loadUserProfile(client, user.id);

      return {
        isNewUser,
        profile: profileState.profile,
        profileUpdatedAt: profileState.profileUpdatedAt,
        sessionToken,
        user: buildUserResponse(user),
      };
    });

    if (response.error) {
      return res.status(401).json({ message: response.error });
    }

    res.json({
      isNewUser: response.isNewUser,
      message: 'Email verified successfully.',
      profile: response.profile,
      profileUpdatedAt: response.profileUpdatedAt,
      sessionToken: response.sessionToken,
      user: response.user,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/logout', requireSession, async (req, res, next) => {
  try {
    await pool.query('delete from user_sessions where session_hash = $1', [req.auth.sessionHash]);

    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/me', requireSession, async (req, res, next) => {
  try {
    const profileState = await loadUserProfile(pool, req.auth.userId);

    res.json({
      profile: profileState.profile,
      profileUpdatedAt: profileState.profileUpdatedAt,
      user: req.auth.user,
    });
  } catch (error) {
    next(error);
  }
});

app.put('/api/me/profile', requireSession, async (req, res, next) => {
  try {
    const profile = req.body?.profile;

    if (!isValidProfilePayload(profile)) {
      return res.status(400).json({
        message: 'Profile payload must include history, water, and workout data.',
      });
    }

    const result = await pool.query(
      `
        insert into user_profiles (user_id, profile_data, updated_at)
        values ($1, $2::jsonb, now())
        on conflict (user_id)
        do update set profile_data = excluded.profile_data, updated_at = now()
        returning profile_data, updated_at
      `,
      [req.auth.userId, JSON.stringify(profile)]
    );

    res.json({
      message: 'Profile synced successfully.',
      profile: normalizeProfilePayload(result.rows[0].profile_data),
      profileUpdatedAt: result.rows[0].updated_at,
      user: req.auth.user,
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error('[server]', error);

  res.status(500).json({
    message: error?.message ?? 'Unexpected server error.',
  });
});

async function startServer() {
  await ensureDatabaseSchema();

  app.listen(port, () => {
    console.log(`[server] SipUp auth API running on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error('[server] Failed to start API server.', error);
  process.exit(1);
});
