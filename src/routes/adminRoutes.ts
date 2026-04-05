// src/routes/adminRoutes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/requireAdmin';
import {
  getDashboardStats,
  getAdminOrders,
  getAdminOrderDetail,
  setMeetupSlot,
  confirmDelivered,
  approveCancelRequest,
  rejectCancelRequest,
  confirmRefund,
  syncDailySummary,
} from '../controllers/adminController';

const router = Router();

// Semua endpoint admin butuh login + role admin
router.use(requireAuth, requireAdmin);

// ── Dashboard ─────────────────────────────────────────────────────
// GET /api/admin/stats
// Ringkasan penjualan untuk dashboard (baca dari DailySalesSummary)
router.get('/dashboard', getDashboardStats);

// POST /api/admin/sync-daily
// Hitung ulang DailySalesSummary untuk hari ini
// Dipanggil manual atau via cron job harian
router.post('/sync-daily', syncDailySummary);

// ── Order Management ──────────────────────────────────────────────
// GET /api/admin/orders?orderType=ITEM_GAME&adminStatus=PENDING_ADMIN&page=1
// Daftar semua order dengan filter
router.get('/orders', getAdminOrders);

// GET /api/admin/orders/:id
// Detail lengkap satu order
router.get('/orders/:id', getAdminOrderDetail);

// POST /api/admin/orders/:id/set-meetup
// Set jadwal meetup untuk order ITEM_GAME
// Body: { worldName, serverCode?, scheduledAt, windowMinutes? }
router.post('/orders/:id/set-meetup', setMeetupSlot);

// POST /api/admin/orders/:id/confirm-delivered
// Konfirmasi item sudah diserahkan saat meetup
// Body: { note? }
router.post('/orders/:id/confirm-delivered', confirmDelivered);

// POST /api/admin/orders/:id/approve-cancel
// Approve permintaan cancel dari user (PAID)
// Body: { refundNote }
router.post('/orders/:id/approve-cancel', approveCancelRequest);

// POST /api/admin/orders/:id/reject-cancel
// Tolak permintaan cancel dari user
// Body: { note }
router.post('/orders/:id/reject-cancel', rejectCancelRequest);

// POST /api/admin/orders/:id/confirm-refund
// Konfirmasi refund sudah ditransfer ke user
// Body: { note? }
router.post('/orders/:id/confirm-refund', confirmRefund);

export default router;