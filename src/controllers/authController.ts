import { Request, Response } from 'express';
import axios from 'axios';
import { AuthRequest } from '../middleware/authMiddleware';
import { syncUserToDatabase } from '../utils/syncUser';
import { prisma } from '../lib/prisma';

const SUPABASE_URL = `https://${process.env.SUPABASE_PROJECT_REF}.supabase.co`;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY as string;

function friendlyAuthError(body: Record<string, unknown>): string {
  const code = String(body.error_code || body.error || '').toLowerCase();
  const message = String(body.error_description || body.msg || body.message || '').toLowerCase();
  const combined = `${code} ${message}`.trim();

  if (combined.includes('invalid login credentials') || combined.includes('invalid_grant') || combined.includes('invalid email or password'))
    return 'Email atau password salah.';
  if (combined.includes('user_already_exists') || combined.includes('user already registered') || combined.includes('already been registered'))
    return 'Email sudah terdaftar.';
  if (combined.includes('password should be at least') || combined.includes('weak_password'))
    return 'Password minimal 6 karakter.';
  if (combined.includes('unable to validate email') || combined.includes('invalid_email'))
    return 'Format email tidak valid.';
  if (combined.includes('email not confirmed') || combined.includes('email_not_confirmed'))
    return 'Email belum diverifikasi. Cek inbox kamu.';
  if (combined.includes('too many requests') || combined.includes('rate_limit') || combined.includes('over_email_send_rate_limit'))
    return 'Terlalu banyak percobaan. Coba lagi nanti.';
  if (combined.includes('user not found') || combined.includes('email_not_found'))
    return 'Akun dengan email ini tidak ditemukan.';

  return String(body.msg || body.error_description || body.error || 'Terjadi kesalahan autentikasi.');
}

export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, name } = req.body as {
    email?: string;
    password?: string;
    name?: string;
  };

  if (!email || !password) {
    res.status(400).json({ error: 'Email dan password wajib diisi.' });
    return;
  }

  try {
    const response = await axios.post(
      `${SUPABASE_URL}/auth/v1/signup`,
      { email, password, data: { full_name: name } },
      { headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' } },
    );

    const { access_token, refresh_token, user } = response.data;

    if (user) {
      await syncUserToDatabase({
        sub: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
      });
    }

    res.status(201).json({ access_token, refresh_token, user: { id: user?.id, email: user?.email } });
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      res.status(400).json({ error: friendlyAuthError(err.response.data) });
      return;
    }
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'Email dan password wajib diisi.' });
    return;
  }

  try {
    const response = await axios.post(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      { email, password },
      { headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' } },
    );

    const { access_token, refresh_token, user } = response.data;

    await syncUserToDatabase({
      sub: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
    });

    res.status(200).json({ access_token, refresh_token, user: { id: user.id, email: user.email } });
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      res.status(400).json({ error: friendlyAuthError(err.response.data) });
      return;
    }
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
};

export const syncProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await syncUserToDatabase(req.user);
    res.status(200).json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (err) {
    console.error('[syncProfile] Error syncing user:', err);
    res.status(500).json({ error: 'Failed to sync user profile.' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.sub as string;

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      const synced = await syncUserToDatabase(req.user);
      res.status(200).json({
        id: synced.id,
        email: synced.email,
        name: synced.name,
        role: synced.role,
      });
      return;
    }

    res.status(200).json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (err) {
    console.error('[getMe] Error fetching user:', err);
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
};