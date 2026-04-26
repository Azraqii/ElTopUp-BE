import { Router } from 'express';
import { requireAdminAuth } from '../middleware/authMiddleware';
import { adminLogin, adminChangePassword, adminForgotPassword } from '../controllers/adminAuthController';

const router = Router();

router.post('/login', adminLogin);
router.post('/forgot-password', adminForgotPassword);
router.post('/change-password', requireAdminAuth, adminChangePassword);

export default router;
