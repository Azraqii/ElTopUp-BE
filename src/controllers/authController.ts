import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { syncUserToDatabase } from '../utils/syncUser';

// ------------------------------------------------------------------
// POST /api/auth/sync
// ------------------------------------------------------------------
// Called by the frontend immediately after a successful Supabase login
// (email/password OR Google OAuth). Upserts the user into our DB and
// returns the current user profile.
//
// The Supabase JWT covers both auth methods — no separate handling needed.

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
