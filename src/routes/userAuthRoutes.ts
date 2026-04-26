import { Router } from 'express';
import {
  register,
  verifyEmail,
  resendVerification,
  login,
  forgotPassword,
  resetPassword,
} from '../controllers/userAuthController';

const router = Router();

router.post('/register', register);
router.get('/verify-email', verifyEmail);
router.post('/resend-verify', resendVerification);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
