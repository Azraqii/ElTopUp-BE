import { Router } from 'express';
import { requireAdminAuth } from '../middleware/authMiddleware';
import {
  getOrders,
  getOrderDetail,
  updateOrderStatus,
  getBotCookie,
  updateBotCookie,
  getDashboardStats,
} from '../controllers/adminController';

const router = Router();

router.use(requireAdminAuth);

router.get('/dashboard', getDashboardStats);
router.get('/orders', getOrders);
router.get('/orders/:id', getOrderDetail);
router.patch('/orders/:id/status', updateOrderStatus);
router.get('/settings/bot-cookie', getBotCookie);
router.put('/settings/bot-cookie', updateBotCookie);

export default router;
