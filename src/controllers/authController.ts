import { Request, Response } from 'express';
import axios from 'axios';
import { AuthRequest } from '../middleware/authMiddleware';
import { syncUserToDatabase } from '../utils/syncUser';

const SUPABASE_URL = `https://${process.env.SUPABASE_PROJECT_REF}.supabase.co`;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY as string;

// Debug: Log konfigurasi saat startup (tanpa sensitive data)
console.log('[Auth Config] SUPABASE_URL:', SUPABASE_URL);
console.log('[Auth Config] SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? `${SUPABASE_ANON_KEY.substring(0, 20)}...` : 'NOT SET');
console.log('[Auth Config] Project Ref:', process.env.SUPABASE_PROJECT_REF || 'NOT SET');

// Map Supabase error codes/messages to user-friendly messages.
// Supabase uses two inconsistent formats:
//   Format A (OAuth token): { error: "invalid_grant", error_description: "..." }
//   Format B (REST API):    { code: 422, error_code: "user_already_exists", msg: "..." }
function friendlyAuthError(body: Record<string, unknown>): string {
  // Normalise — check all possible fields
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

  // Fallback: return the raw message so we can see unknown errors
  return String(body.msg || body.error_description || body.error || 'Terjadi kesalahan autentikasi.');
}

// ------------------------------------------------------------------
// POST /api/auth/register
// ------------------------------------------------------------------
export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, name } = req.body as {
    email?: string;
    password?: string;
    name?: string;
  };

  console.log('[Register] Attempt for email:', email);

  if (!email || !password) {
    console.log('[Register] Missing credentials');
    res.status(400).json({ error: 'Email dan password wajib diisi.' });
    return;
  }

  try {
    const signupUrl = `${SUPABASE_URL}/auth/v1/signup`;
    console.log('[Register] Calling Supabase:', signupUrl);

    const response = await axios.post(
      signupUrl,
      { email, password, data: { full_name: name } },
      { headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' } },
    );

    console.log('[Register] Supabase response status:', response.status);

    const { access_token, refresh_token, user } = response.data;

    console.log('[Register] User created with ID:', user?.id);

    // Auto-sync user to our DB
    if (user) {
      await syncUserToDatabase({
        sub: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
      });
      console.log('[Register] User synced to database');
    }

    res.status(201).json({ access_token, refresh_token, user: { id: user?.id, email: user?.email } });
  } catch (err) {
    console.error('[Register] Error:', err);
    
    if (axios.isAxiosError(err) && err.response) {
      const body = err.response.data;
      console.error('[Register] Supabase error response:', JSON.stringify(body, null, 2));
      console.error('[Register] Status code:', err.response.status);
      res.status(400).json({ error: friendlyAuthError(body) });
      return;
    }
    
    console.error('[Register] Non-Axios error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
};

// ------------------------------------------------------------------
// POST /api/auth/login
// ------------------------------------------------------------------
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };

  console.log('[Login] Attempt for email:', email);

  if (!email || !password) {
    console.log('[Login] Missing credentials');
    res.status(400).json({ error: 'Email dan password wajib diisi.' });
    return;
  }

  try {
    const loginUrl = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
    console.log('[Login] Calling Supabase:', loginUrl);

    const response = await axios.post(
      loginUrl,
      { email, password },
      { headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' } },
    );

    console.log('[Login] Supabase response status:', response.status);

    const { access_token, refresh_token, user } = response.data;

    console.log('[Login] Supabase returned user ID:', user?.id);

    // Auto-sync user to our DB on every login
    await syncUserToDatabase({
      sub: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
    });

    console.log('[Login] User synced to database');

    res.status(200).json({ access_token, refresh_token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('[Login] Error:', err);
    
    if (axios.isAxiosError(err) && err.response) {
      const body = err.response.data;
      console.error('[Login] Supabase error response:', JSON.stringify(body, null, 2));
      console.error('[Login] Status code:', err.response.status);
      res.status(400).json({ error: friendlyAuthError(body) });
      return;
    }
    
    console.error('[Login] Non-Axios error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
};

// ------------------------------------------------------------------
// POST /api/auth/sync
// ------------------------------------------------------------------
// Called by the frontend after Google OAuth. Upserts the user into our DB.
// For email/password, sync is already done inside login/register above.

export const syncProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const supabaseUser = req.user;

    const user = await syncUserToDatabase(supabaseUser);

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

// ------------------------------------------------------------------
// GET /api/auth/me
// ------------------------------------------------------------------
// Returns the current user's profile from our DB.

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { prisma } = await import('../lib/prisma');
    const userId = req.user.sub as string;

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      // User exists in Supabase but not yet synced — auto-sync
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
