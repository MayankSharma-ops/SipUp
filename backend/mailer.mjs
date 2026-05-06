import './env.mjs';

const otpExpiryMinutes = Number.parseInt(process.env.OTP_EXPIRY_MINUTES ?? '10', 10);

export async function sendOtpEmail({ email, otp }) {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.warn('[mailer] RESEND_API_KEY is missing. OTP email will NOT be sent.');
    console.log(`[mailer] OTP for ${email}: ${otp}`);
    return { id: 'dry-run', to: email };
  }

  const mailFrom = process.env.MAIL_FROM ?? 'SipUp <onboarding@resend.dev>';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: mailFrom,
      to: [email],
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
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Resend API error (${response.status}): ${data?.message ?? JSON.stringify(data)}`);
  }

  console.log(`[mailer] OTP email sent to ${email}, id: ${data.id}`);
  return data;
}
