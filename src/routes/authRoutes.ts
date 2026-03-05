import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { register, login, syncProfile, getMe } from '../controllers/authController';

const router = Router();

// POST /api/auth/register — Register with email + password
router.post('/register', register);

// POST /api/auth/login — Login with email + password
router.post('/login', login);

// POST /api/auth/sync — Sync Google OAuth user to DB (requires JWT)
router.post('/sync', requireAuth, syncProfile);

// GET /api/auth/me — Return current user profile (requires JWT)
router.get('/me', requireAuth, getMe);

export default router;
