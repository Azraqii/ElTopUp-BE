import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { googleAuth, googleCallback, getMe } from '../controllers/authController';

const router = Router();

// GET /api/auth/google — Redirect ke Google OAuth consent screen
router.get('/google', googleAuth);

// GET /api/auth/google/callback — Google redirect balik ke sini, lalu issue JWT
router.get('/google/callback', googleCallback);

// GET /api/auth/me — Return current user (requires JWT)
router.get('/me', requireAuth, getMe);

export default router;
