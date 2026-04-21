import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../lib/prisma';
import { comparePassword, hashPassword, signAdminJwt, generateToken } from '../services/authService';
import { sendPasswordResetEmail } from '../services/emailService';

const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;

// ------------------------------------------------------------------
// POST /api/admin/auth/login
// ------------------------------------------------------------------
export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      res.status(400).json({ error: 'Email dan password wajib diisi.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user || user.role !== 'admin') {
      await prisma.systemLog.create({
        data: {
          serviceName: 'AUTH',
          eventType: 'ADMIN_LOGIN_FAILED',
          payloadData: { email: email.toLowerCase(), reason: 'user_not_found_or_not_admin' },
          status: 'ERROR',
        },
      });
      res.status(401).json({ error: 'Email atau password salah.' });
      return;
    }

    if (!user.passwordHash) {
      await prisma.systemLog.create({
        data: {
          serviceName: 'AUTH',
          eventType: 'ADMIN_LOGIN_FAILED',
          payloadData: { email: email.toLowerCase(), reason: 'no_password_set' },
          status: 'ERROR',
        },
      });
      res.status(401).json({ error: 'Akun admin belum memiliki password. Hubungi developer.' });
      return;
    }

    if (!user.emailVerified) {
      res.status(401).json({ error: 'Email admin belum diverifikasi.' });
      return;
    }

    const passwordMatch = await comparePassword(password, user.passwordHash);
    if (!passwordMatch) {
      await prisma.systemLog.create({
        data: {
          serviceName: 'AUTH',
          eventType: 'ADMIN_LOGIN_FAILED',
          payloadData: { email: email.toLowerCase(), reason: 'wrong_password' },
          status: 'ERROR',
        },
      });
      res.status(401).json({ error: 'Email atau password salah.' });
      return;
    }

    const token = signAdminJwt({ sub: user.id, email: user.email, role: user.role });

    await prisma.systemLog.create({
      data: {
        serviceName: 'AUTH',
        eventType: 'ADMIN_LOGIN_SUCCESS',
        payloadData: { adminId: user.id, email: user.email },
        status: 'SUCCESS',
      },
    });

    res.json({
      token,
      admin: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error('[adminLogin] Error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan saat login admin.' });
  }
};

// ------------------------------------------------------------------
// POST /api/admin/auth/change-password
// ------------------------------------------------------------------
export const adminChangePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const adminId = req.user.sub as string;
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Password lama dan password baru wajib diisi.' });
      return;
    }

    if (!PASSWORD_REGEX.test(newPassword) || newPassword.length < 8) {
      res.status(400).json({ error: 'Password baru harus minimal 8 karakter, mengandung huruf dan angka.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: adminId } });
    if (!user || !user.passwordHash) {
      res.status(400).json({ error: 'Akun tidak ditemukan.' });
      return;
    }

    const passwordMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Password lama salah.' });
      return;
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: adminId },
      data: { passwordHash: hashedPassword },
    });

    await prisma.systemLog.create({
      data: {
        serviceName: 'AUTH',
        eventType: 'ADMIN_PASSWORD_CHANGED',
        payloadData: { adminId },
        status: 'SUCCESS',
      },
    });

    res.json({ message: 'Password berhasil diubah.' });
  } catch (err) {
    console.error('[adminChangePassword] Error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan saat mengubah password.' });
  }
};

// ------------------------------------------------------------------
// POST /api/admin/auth/forgot-password
// ------------------------------------------------------------------
export const adminForgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body as { email: string };

    res.json({ message: 'Jika email terdaftar sebagai admin, link reset password akan dikirim.' });

    if (!email) return;

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || user.role !== 'admin') return;

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
    console.error('[adminForgotPassword] Error:', err);
  }
};
