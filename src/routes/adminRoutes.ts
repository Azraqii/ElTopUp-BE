import express from 'express';
import { 
  getIncomingOrders, 
  completeOrder, 
  addGame, 
  addItem 
} from '../controllers/adminController';
import { protect, admin } from '../middleware/authMiddleware'; 

// Note: Middleware 'admin' belum kita buat di authMiddleware.ts
// Nanti akan kita tambahkan di bawah.

const router = express.Router();

// Semua route di bawah ini butuh Login (protect) DAN Role Admin (admin)
router.use(protect, admin); 

// --- Order Management ---
router.get('/orders/incoming', getIncomingOrders); // Lihat antrian
router.put('/orders/:id/complete', completeOrder); // Selesaikan pesanan

// --- Catalog Management ---
router.post('/games', addGame); // Tambah Game
router.post('/items', addItem); // Tambah Item

export default router;