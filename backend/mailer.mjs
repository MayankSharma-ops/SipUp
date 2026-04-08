import './env.mjs';

import nodemailer from 'nodemailer';

const otpExpiryMinutes = Number.parseInt(process.env.OTP_EXPIRY_MINUTES ?? '10', 10);

function createTransport() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number.parseInt(process.env.SMTP_PORT ?? '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = process.env.SMTP_SECURE === 'true';

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn(
      '[mailer] SMTP credentials are missing. Nodemailer will fall back to jsonTransport until you configure SMTP.'
    );

    return nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

const transport = createTransport();

export async function sendOtpEmail({ email, otp }) {
  const mailFrom = process.env.MAIL_FROM ?? process.env.SMTP_USER ?? 'SipUp <no-reply@sipup.local>';

  const info = await transport.sendMail({
    from: mailFrom,
    to: email,
    subject: 'Your SipUp verification code',
    text: [
      'Your SipUp one-time password is below.',
      '',
      `OTP: ${otp}`,
      `Expires in: ${otpExpiryMinutes} minutes`,
      '',
      `Requested for: ${email}`,
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #10213a;">
        <h2 style="margin-bottom: 12px;">SipUp Email Verification</h2>
        <p style="font-size: 16px; line-height: 24px;">
          Use the one-time password below to finish signing in.
        </p>
        <div style="margin: 24px 0; padding: 18px 20px; border-radius: 18px; background: #eff5ff;">
          <div style="font-size: 12px; letter-spacing: 1.5px; font-weight: 700; text-transform: uppercase; color: #5f6f89;">
            One-Time Password
          </div>
          <div style="font-size: 34px; letter-spacing: 8px; font-weight: 800; margin-top: 10px;">
            ${otp}
          </div>
        </div>
        <p style="font-size: 15px; line-height: 24px; margin: 0;">
          This code expires in ${otpExpiryMinutes} minutes and was requested for <strong>${email}</strong>.
        </p>
      </div>
    `,
  });

  if (info.message) {
    console.log('[mailer] OTP message payload:', info.message.toString());
  }

  return info;
}
