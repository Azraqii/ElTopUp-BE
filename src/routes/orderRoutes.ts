import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { checkout, checkoutItem, scanGamepass, getOrderStatus, getMyOrders, cancelOrder, checkStock } from '../controllers/orderController';

const router = Router();

router.post('/scan-gamepass', requireAuth, scanGamepass);
router.post('/checkout', requireAuth, checkout);
router.post('/checkout-item', requireAuth, checkoutItem);
router.get('/check-stock', requireAuth, checkStock);
router.get('/', requireAuth, getMyOrders);
router.get('/:id/status', requireAuth, getOrderStatus);
router.post('/:id/cancel', requireAuth, cancelOrder);

export default router;
