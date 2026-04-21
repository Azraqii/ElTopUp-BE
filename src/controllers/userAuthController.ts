import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { generateToken, hashPassword, comparePassword, signUserJwt } from '../services/authService';
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from '../services/emailService';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;

function validatePassword(password: string): string | null {
  if (!password || password.length < 8) {
    return 'Password minimal 8 karakter.';
  }
  if (!PASSWORD_REGEX.test(password)) {
    return 'Password harus mengandung minimal satu huruf dan satu angka.';
  }
  return null;
}

// ------------------------------------------------------------------
// POST /api/auth/register
// ------------------------------------------------------------------
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body as {
      email: string;
      password: string;
      name: string;
    };

    if (!email || !EMAIL_REGEX.test(email)) {
      res.status(400).json({ error: 'Format email tidak valid.' });
      return;
    }

    if (!name || name.trim().length === 0) {
      res.status(400).json({ error: 'Nama tidak boleh kosong.' });
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      res.status(400).json({ error: passwordError });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      res.status(400).json({ error: 'Email sudah terdaftar.' });
      return;
    }

    const hashedPassword = await hashPassword(password);
    const verifyToken = generateToken();
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: name.trim(),
        role: 'customer',
        passwordHash: hashedPassword,
        emailVerified: false,
        emailVerifyToken: verifyToken,
        emailVerifyExpiry: verifyExpiry,
        authProvider: 'email',
      },
    });

    await sendVerificationEmail(email.toLowerCase(), name.trim(), verifyToken);

    res.status(201).json({
      message: 'Registrasi berhasil. Cek email untuk verifikasi.',
    });
  } catch (err) {
    console.error('[register] Error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan saat registrasi.' });
  }
};

// ------------------------------------------------------------------
// GET /api/auth/verify-email?token=xxx
// ------------------------------------------------------------------
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.query as { token: string };

    if (!token) {
      res.status(400).json({ error: 'Token verifikasi tidak valid.' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: { emailVerifyToken: token },
    });

    if (!user) {
      res.status(400).json({ error: 'Token verifikasi tidak valid.' });
      return;
    }

    if (user.emailVerifyExpiry && user.emailVerifyExpiry < new Date()) {
      res.status(400).json({ error: 'Token verifikasi sudah kadaluarsa. Minta kirim ulang.' });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpiry: null,
      },
    });

    await sendWelcomeEmail(user.email, user.name || '');

    res.json({ message: 'Email berhasil diverifikasi. Silakan login.' });
  } catch (err) {
    console.error('[verifyEmail] Error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan saat verifikasi email.' });
  }
};

// ------------------------------------------------------------------
// POST /api/auth/resend-verify
// ------------------------------------------------------------------
export const resendVerification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body as { email: string };

    if (!email) {
      res.status(400).json({ error: 'Email wajib diisi.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user) {
      res.status(400).json({ error: 'Email tidak ditemukan.' });
      return;
    }

    if (user.emailVerified) {
      res.status(400).json({ error: 'Email sudah diverifikasi.' });
      return;
    }

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    if (user.updatedAt > oneMinuteAgo) {
      res.status(429).json({ error: 'Tunggu 1 menit sebelum kirim ulang.' });
      return;
    }

    const verifyToken = generateToken();
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifyToken: verifyToken,
        emailVerifyExpiry: verifyExpiry,
      },
    });

    await sendVerificationEmail(user.email, user.name || '', verifyToken);

    res.json({ message: 'Email verifikasi dikirim ulang.' });
  } catch (err) {
    console.error('[resendVerification] Error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan saat mengirim ulang verifikasi.' });
  }
};

// ------------------------------------------------------------------
// POST /api/auth/login
// ------------------------------------------------------------------
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      res.status(400).json({ error: 'Email dan password wajib diisi.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user || user.authProvider !== 'email' || !user.passwordHash) {
      res.status(401).json({ error: 'Email atau password salah.' });
      return;
    }

    if (!user.emailVerified) {
      res.status(401).json({ error: 'Email belum diverifikasi. Cek inbox atau minta kirim ulang.' });
      return;
    }

    const passwordMatch = await comparePassword(password, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Email atau password salah.' });
      return;
    }

    const token = signUserJwt({ sub: user.id, email: user.email, role: user.role });

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error('[login] Error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan saat login.' });
  }
};

// ------------------------------------------------------------------
// POST /api/auth/forgot-password
// ------------------------------------------------------------------
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body as { email: string };

    res.json({ message: 'Jika email terdaftar, link reset password akan dikirim.' });

    if (!email) return;

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || user.authProvider !== 'email') return;

    const resetToken = generateToken();
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiry: resetExpiry,
      },
    });

    await sendPasswordResetEmail(user.email, user.name || '', resetToken);
  } catch (err) {
    console.error('[forgotPassword] Error:', err);
  }
};

// ------------------------------------------------------------------
// POST /api/auth/reset-password
// ------------------------------------------------------------------
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body as { token: string; newPassword: string };

    if (!token) {
      res.status(400).json({ error: 'Token reset tidak valid.' });
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      res.status(400).json({ error: passwordError });
      return;
    }

    const user = await prisma.user.findFirst({
      where: { passwordResetToken: token },
    });

    if (!user) {
      res.status(400).json({ error: 'Token reset tidak valid.' });
      return;
    }

    if (user.passwordResetExpiry && user.passwordResetExpiry < new Date()) {
      res.status(400).json({ error: 'Token reset sudah kadaluarsa. Minta link baru.' });
      return;
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    res.json({ message: 'Password berhasil direset. Silakan login.' });
  } catch (err) {
    console.error('[resetPassword] Error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan saat reset password.' });
  }
};
