import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { syncProfile, getMe } from '../controllers/authController';

const router = Router();

// POST /api/auth/sync — Upsert user into DB after Supabase login (email or Google)
router.post('/sync', requireAuth, syncProfile);

// GET /api/auth/me — Return current user profile
router.get('/me', requireAuth, getMe);

export default router;
