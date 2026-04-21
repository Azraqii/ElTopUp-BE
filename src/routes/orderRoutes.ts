import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { checkout, checkoutItem, getOrderStatus, getMyOrders, cancelOrder } from '../controllers/orderController';

const router = Router();

router.post('/checkout', requireAuth, checkout);
router.post('/checkout-item', requireAuth, checkoutItem);
router.get('/', requireAuth, getMyOrders);
router.get('/:id/status', requireAuth, getOrderStatus);
router.post('/:id/cancel', requireAuth, cancelOrder);

export default router;
