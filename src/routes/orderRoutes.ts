import express from 'express';
import { createOrder, simulatePayment } from '../controllers/orderController';
import { protect, optionalProtect } from '../middleware/authMiddleware';

const router = express.Router();

// Create Order: Bisa Login (Member) atau Tanpa Login (Guest)
// Menggunakan optionalProtect agar controller bisa membedakannya
router.post('/', optionalProtect, createOrder);

// Simulasi Bayar: Tetap butuh login (biar aman saat testing)
router.post('/:id/pay', protect, simulatePayment);

export default router;