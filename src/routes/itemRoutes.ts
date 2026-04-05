// src/routes/itemRoutes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import {
  getGames,
  getGameCategories,
  getGameProducts,
  checkoutItem,
  cancelOrder,
} from '../controllers/itemController';

const router = Router();

// ── Katalog (public — tidak butuh login) ──────────────────────────
// GET /api/items/games
// Daftar semua game yang aktif
router.get('/games', getGames);

// GET /api/items/games/:slug/categories
// Daftar kategori untuk game tertentu
router.get('/games/:slug/categories', getGameCategories);

// GET /api/items/games/:slug/products?categorySlug=game-passes
// Daftar produk per game, bisa filter by kategori
router.get('/games/:slug/products', getGameProducts);

// ── Transaksi (butuh login) ───────────────────────────────────────
// POST /api/items/checkout
// Buat order item game baru
router.post('/checkout', requireAuth, checkoutItem);

// POST /api/items/orders/:id/cancel
// Cancel order (UNPAID: langsung | PAID: request ke admin)
router.post('/orders/:id/cancel', requireAuth, cancelOrder);

export default router;