import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { checkout, getOrderStatus, getMyOrders } from '../controllers/orderController';

const router = Router();

// POST /api/orders/checkout — Phase 1: Validate + create order + get payment URL
router.post('/checkout', requireAuth, checkout);

// GET /api/orders — Fetch authenticated user's orders
router.get('/', requireAuth, getMyOrders);

// GET /api/orders/:id/status — Phase 4: Poll latest status from RobuxShip
router.get('/:id/status', requireAuth, getOrderStatus);

export default router;