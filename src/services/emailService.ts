import { prisma } from '../lib/prisma';

const RESEND_API_KEY = process.env.RESEND_API_KEY || 'placeholder';
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'El TopUp <noreply@eltopup.id>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string,
  logData: { eventType: string; orderId?: string },
): Promise<void> {
  if (!RESEND_API_KEY || RESEND_API_KEY === 'placeholder') {
    console.log(`📧 [EMAIL PLACEHOLDER] To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body: ${text}`);

    await prisma.systemLog.create({
      data: {
        serviceName: 'EMAIL',
        eventType: logData.eventType,
        payloadData: { to, subject, mode: 'placeholder' },
        status: 'PLACEHOLDER',
      },
    });
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [to],
        subject,
        html,
        text,
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Resend API error ${res.status}: ${errorBody}`);
    }

    await prisma.systemLog.create({
      data: {
        serviceName: 'EMAIL',
        eventType: logData.eventType,
        payloadData: { to, subject },
        status: 'SUCCESS',
      },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[EMAIL] Gagal kirim email ke ${to}:`, errorMessage);

    await prisma.systemLog.create({
      data: {
        serviceName: 'EMAIL',
        eventType: logData.eventType,
        payloadData: { to, subject, error: errorMessage },
        status: 'ERROR',
      },
    });
  }
}

export async function sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
  const verifyUrl = `${FRONTEND_URL}/verify-email?token=${token}`;
  const subject = 'Verifikasi Email — El TopUp';
  const html = `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
      <h2 style="color:#1E40AF;">El TopUp</h2>
      <p>Halo ${name || 'User'},</p>
      <p>Terima kasih telah mendaftar di El TopUp. Klik tombol di bawah untuk memverifikasi email kamu:</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${verifyUrl}" style="background:#1E40AF;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Verifikasi Email</a>
      </p>
      <p style="font-size:13px;color:#666;">Atau salin link ini: ${verifyUrl}</p>
      <p style="font-size:13px;color:#666;">Link berlaku selama 24 jam.</p>
    </div>
  `;
  const text = `Halo ${name || 'User'}, verifikasi email kamu di: ${verifyUrl} (berlaku 24 jam)`;

  await sendEmail(to, subject, html, text, { eventType: 'SEND_VERIFICATION' });
}

export async function sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;
  const subject = 'Reset Password — El TopUp';
  const html = `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
      <h2 style="color:#1E40AF;">El TopUp</h2>
      <p>Halo ${name || 'User'},</p>
      <p>Kami menerima permintaan reset password untuk akun kamu. Klik tombol di bawah:</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${resetUrl}" style="background:#1E40AF;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Reset Password</a>
      </p>
      <p style="font-size:13px;color:#666;">Atau salin link ini: ${resetUrl}</p>
      <p style="font-size:13px;color:#666;">Link berlaku selama 1 jam. Jika kamu tidak meminta reset, abaikan email ini.</p>
    </div>
  `;
  const text = `Halo ${name || 'User'}, reset password kamu di: ${resetUrl} (berlaku 1 jam)`;

  await sendEmail(to, subject, html, text, { eventType: 'SEND_RESET' });
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const subject = 'Selamat Datang di El TopUp!';
  const html = `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
      <h2 style="color:#1E40AF;">El TopUp</h2>
      <p>Halo ${name || 'User'},</p>
      <p>Email kamu sudah terverifikasi! Sekarang kamu bisa login dan mulai top up Roblox.</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${FRONTEND_URL}/login" style="background:#1E40AF;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Login Sekarang</a>
      </p>
    </div>
  `;
  const text = `Halo ${name || 'User'}, email kamu sudah terverifikasi! Login di: ${FRONTEND_URL}/login`;

  await sendEmail(to, subject, html, text, { eventType: 'SEND_WELCOME' });
}
