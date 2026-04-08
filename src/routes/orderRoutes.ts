import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { checkout, getOrderStatus, getMyOrders, mockPayOrder, cancelOrder } from '../controllers/orderController';

const router = Router();

router.post('/checkout', requireAuth, checkout);
router.get('/', requireAuth, getMyOrders);
router.get('/:id/status', requireAuth, getOrderStatus);

router.post('/:id/cancel', requireAuth, cancelOrder);

// Rute sementara untuk testing
router.post('/:id/mock-pay', requireAuth, mockPayOrder);

export default router;