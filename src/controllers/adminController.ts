// src/controllers/adminController.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../lib/prisma';

// ------------------------------------------------------------------
// GET /api/admin/stats
// Ringkasan penjualan — baca dari DailySalesSummary (cache)
// ------------------------------------------------------------------
export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { days = '30' } = req.query as { days?: string };
    const daysInt = Math.min(parseInt(days) || 30, 90); // max 90 hari

    const since = new Date();
    since.setDate(since.getDate() - daysInt);
    since.setHours(0, 0, 0, 0);

    // Baca dari cache harian
    const summaries = await prisma.dailySalesSummary.findMany({
      where: { date: { gte: since } },
      orderBy: { date: 'asc' },
    });

    // Hitung totals
    const totals = summaries.reduce(
      (acc, s) => ({
        robuxRevenue: acc.robuxRevenue + s.robuxRevenue,
        itemRevenue: acc.itemRevenue + s.itemRevenue,
        totalRevenue: acc.totalRevenue + s.totalRevenue,
        robuxOrders: acc.robuxOrders + s.robuxOrders,
        itemOrders: acc.itemOrders + s.itemOrders,
        cancelledOrders: acc.cancelledOrders + s.cancelledOrders,
        totalOrders: acc.totalOrders + s.totalOrders,
      }),
      {
        robuxRevenue: 0, itemRevenue: 0, totalRevenue: 0,
        robuxOrders: 0, itemOrders: 0, cancelledOrders: 0, totalOrders: 0,
      }
    );

    // Hitung order yang butuh perhatian admin sekarang
    const pendingAdminCount = await prisma.order.count({
      where: { adminStatus: 'PENDING_ADMIN' },
    });

    const cancelRequestedCount = await prisma.order.count({
      where: { adminStatus: 'CANCEL_REQUESTED' },
    });

    res.json({
      period: { days: daysInt, since },
      totals,
      alerts: {
        pendingAdmin: pendingAdminCount,       // order baru butuh dijadwalkan
        cancelRequested: cancelRequestedCount, // request cancel butuh diproses
      },
      daily: summaries, // untuk chart di frontend
    });
  } catch (err) {
    console.error('[getDashboardStats] Error:', err);
    res.status(500).json({ error: 'Gagal mengambil statistik.' });
  }
};

// ------------------------------------------------------------------
// POST /api/admin/sync-daily
// Hitung ulang DailySalesSummary untuk hari ini
// Panggil manual atau via cron job
// ------------------------------------------------------------------
export const syncDailySummary = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Agregasi order hari ini
    const [robuxData, itemData, cancelledData] = await Promise.all([
      prisma.order.aggregate({
        where: {
          orderType: 'ROBUX',
          paymentStatus: 'PAID',
          robuxshipStatus: 'COMPLETED',
          createdAt: { gte: today, lt: tomorrow },
        },
        _sum: { customerPriceIdr: true },
        _count: true,
      }),
      prisma.order.aggregate({
        where: {
          orderType: 'ITEM_GAME',
          adminStatus: 'DELIVERED',
          createdAt: { gte: today, lt: tomorrow },
        },
        _sum: { customerPriceIdr: true },
        _count: true,
      }),
      prisma.order.count({
        where: {
          paymentStatus: 'CANCELLED',
          createdAt: { gte: today, lt: tomorrow },
        },
      }),
    ]);

    const robuxRevenue = robuxData._sum.customerPriceIdr ?? 0;
    const itemRevenue = itemData._sum.customerPriceIdr ?? 0;
    const robuxOrders = robuxData._count;
    const itemOrders = itemData._count;

    await prisma.dailySalesSummary.upsert({
      where: { date: today },
      update: {
        robuxRevenue,
        itemRevenue,
        totalRevenue: robuxRevenue + itemRevenue,
        robuxOrders,
        itemOrders,
        cancelledOrders: cancelledData,
        totalOrders: robuxOrders + itemOrders,
      },
      create: {
        date: today,
        robuxRevenue,
        itemRevenue,
        totalRevenue: robuxRevenue + itemRevenue,
        robuxOrders,
        itemOrders,
        cancelledOrders: cancelledData,
        totalOrders: robuxOrders + itemOrders,
      },
    });

    res.json({
      success: true,
      message: `Summary untuk ${new Date(today.getTime() + 7 * 60 * 60 * 1000).toISOString().split('T')[0]} berhasil disinkronkan.`,
      data: { robuxRevenue, itemRevenue, robuxOrders, itemOrders },
    });
  } catch (err) {
    console.error('[syncDailySummary] Error:', err);
    res.status(500).json({ error: 'Gagal sync daily summary.' });
  }
};

// ------------------------------------------------------------------
// GET /api/admin/orders
// Daftar semua order dengan filter dan pagination
//
// Query params:
//   orderType    ROBUX | ITEM_GAME
//   adminStatus  PENDING_ADMIN | SCHEDULED | DELIVERED | CANCEL_REQUESTED | CANCELLED
//   paymentStatus UNPAID | PAID | CANCELLED | EXPIRED | FAILED
//   page         number (default 1)
//   limit        number (default 20, max 50)
// ------------------------------------------------------------------
export const getAdminOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      orderType,
      adminStatus,
      paymentStatus,
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>;

    const pageInt = Math.max(parseInt(page) || 1, 1);
    const limitInt = Math.min(parseInt(limit) || 20, 50);
    const skip = (pageInt - 1) * limitInt;

    const where: any = {};
    if (orderType) where.orderType = orderType;
    if (adminStatus) where.adminStatus = adminStatus;
    if (paymentStatus) where.paymentStatus = paymentStatus;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          product: {
            include: { game: true, category: true },
          },
          meetupSlot: true,
          adminNotes: {
            orderBy: { createdAt: 'desc' },
            take: 1, // hanya note terakhir untuk listing
          },
        },
        orderBy: [
          // Cancel request diurutkan paling atas
          { adminStatus: 'asc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limitInt,
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      orders: orders.map(mapOrderForAdmin),
      pagination: {
        page: pageInt,
        limit: limitInt,
        total,
        totalPages: Math.ceil(total / limitInt),
      },
    });
  } catch (err) {
    console.error('[getAdminOrders] Error:', err);
    res.status(500).json({ error: 'Gagal mengambil daftar order.' });
  }
};

// ------------------------------------------------------------------
// GET /api/admin/orders/:id
// Detail lengkap satu order termasuk semua admin notes
// ------------------------------------------------------------------
export const getAdminOrderDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        product: { include: { game: true, category: true } },
        meetupSlot: true,
        adminNotes: {
          include: {
            admin: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order tidak ditemukan.' });
      return;
    }

    res.json(mapOrderForAdmin(order));
  } catch (err) {
    console.error('[getAdminOrderDetail] Error:', err);
    res.status(500).json({ error: 'Gagal mengambil detail order.' });
  }
};

// ------------------------------------------------------------------
// POST /api/admin/orders/:id/set-meetup
// Set jadwal meetup untuk order ITEM_GAME
//
// Body: { worldName, serverCode?, scheduledAt, windowMinutes? }
// ------------------------------------------------------------------
export const setMeetupSlot = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = req.user.sub as string;
    const { worldName, serverCode, scheduledAt, windowMinutes = 60 } = req.body as {
      worldName: string;
      serverCode?: string;
      scheduledAt: string;
      windowMinutes?: number;
    };

    if (!worldName?.trim()) {
      res.status(400).json({ error: 'Nama world wajib diisi.' });
      return;
    }
    if (!scheduledAt) {
      res.status(400).json({ error: 'Waktu meetup wajib diisi.' });
      return;
    }

    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      res.status(404).json({ error: 'Order tidak ditemukan.' });
      return;
    }
    if (order.orderType !== 'ITEM_GAME') {
      res.status(400).json({ error: 'Hanya order Item Game yang bisa dijadwalkan meetup.' });
      return;
    }
    if (order.paymentStatus !== 'PAID') {
      res.status(400).json({ error: 'Order belum dibayar, tidak bisa dijadwalkan.' });
      return;
    }
    if (order.adminStatus === 'DELIVERED' || order.adminStatus === 'CANCELLED') {
      res.status(400).json({ error: 'Order ini sudah final, tidak bisa diubah.' });
      return;
    }

    const scheduledDate = new Date(scheduledAt);
    const noteText = `Jadwal meetup: ${worldName}${serverCode ? ` | ${serverCode}` : ''} | ${scheduledDate.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`;

    // Upsert meetup slot (bisa override jadwal yang sudah ada)
    await prisma.itemMeetupSlot.upsert({
      where: { orderId: id },
      update: {
        worldName: worldName.trim(),
        serverCode: serverCode?.trim() ?? null,
        scheduledAt: scheduledDate,
        windowMinutes,
        status: 'SCHEDULED',
        handledBy: adminId,
      },
      create: {
        orderId: id,
        worldName: worldName.trim(),
        serverCode: serverCode?.trim() ?? null,
        scheduledAt: scheduledDate,
        windowMinutes,
        status: 'SCHEDULED',
        handledBy: adminId,
      },
    });

    // Update snapshot di Order + set adminStatus SCHEDULED
    await prisma.order.update({
      where: { id },
      data: {
        adminStatus: 'SCHEDULED',
        meetupWorld: worldName.trim(),
        meetupServerCode: serverCode?.trim() ?? null,
        meetupScheduledAt: scheduledDate,
        adminNote: noteText,
      },
    });

    // Catat di AdminOrderNote
    await prisma.adminOrderNote.create({
      data: { orderId: id, adminId, note: noteText },
    });

    res.json({
      success: true,
      message: 'Jadwal meetup berhasil di-set.',
      meetup: { worldName, serverCode, scheduledAt: scheduledDate, windowMinutes },
    });
  } catch (err) {
    console.error('[setMeetupSlot] Error:', err);
    res.status(500).json({ error: 'Gagal set jadwal meetup.' });
  }
};

// ------------------------------------------------------------------
// POST /api/admin/orders/:id/confirm-delivered
// Konfirmasi item sudah diserahkan saat meetup
//
// Body: { note? }
// ------------------------------------------------------------------
export const confirmDelivered = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = req.user.sub as string;
    const { note } = req.body as { note?: string };

    const order = await prisma.order.findUnique({
      where: { id },
      include: { meetupSlot: true },
    });

    if (!order) {
      res.status(404).json({ error: 'Order tidak ditemukan.' });
      return;
    }
    if (order.orderType !== 'ITEM_GAME') {
      res.status(400).json({ error: 'Hanya order Item Game yang bisa dikonfirmasi.' });
      return;
    }
    if (order.adminStatus === 'DELIVERED') {
      res.status(400).json({ error: 'Order ini sudah dikonfirmasi sebelumnya.' });
      return;
    }
    if (order.adminStatus === 'CANCELLED') {
      res.status(400).json({ error: 'Order ini sudah dibatalkan.' });
      return;
    }
    if (order.adminStatus !== 'SCHEDULED') {
      res.status(400).json({ error: 'Order harus dijadwalkan meetup terlebih dahulu sebelum dikonfirmasi terkirim.' });
      return;
    }

    const now = new Date();
    const noteText = note?.trim() || `Item berhasil diserahkan ke @${order.robloxUsername} saat meetup.`;

    // Update order dan meetup slot bersamaan
    await Promise.all([
      prisma.order.update({
        where: { id },
        data: {
          adminStatus: 'DELIVERED',
          adminNote: noteText,
        },
      }),
      order.meetupSlot
        ? prisma.itemMeetupSlot.update({
            where: { orderId: id },
            data: { status: 'COMPLETED', confirmedAt: now, handledBy: adminId },
          })
        : Promise.resolve(),
      prisma.adminOrderNote.create({
        data: { orderId: id, adminId, note: noteText },
      }),
    ]);

    res.json({
      success: true,
      message: 'Order berhasil dikonfirmasi sebagai terkirim.',
    });
  } catch (err) {
    console.error('[confirmDelivered] Error:', err);
    res.status(500).json({ error: 'Gagal konfirmasi pengiriman.' });
  }
};

// ------------------------------------------------------------------
// POST /api/admin/orders/:id/approve-cancel
// Approve permintaan cancel dari user (setelah PAID)
// Tandai refundStatus = PENDING_REFUND, admin transfer manual
//
// Body: { refundNote }
// ------------------------------------------------------------------
export const approveCancelRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = req.user.sub as string;
    const { refundNote } = req.body as { refundNote: string };

    if (!refundNote?.trim()) {
      res.status(400).json({
        error: 'Catatan refund wajib diisi. Contoh: "Transfer Rp16.965 ke BCA 1234 a.n. Budi"',
      });
      return;
    }

    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      res.status(404).json({ error: 'Order tidak ditemukan.' });
      return;
    }
    if (order.adminStatus !== 'CANCEL_REQUESTED') {
      res.status(400).json({ error: 'Order ini tidak sedang dalam status permintaan pembatalan.' });
      return;
    }

    const now = new Date();

    await prisma.order.update({
      where: { id },
      data: {
        adminStatus: 'CANCELLED',
        paymentStatus: 'CANCELLED',
        cancelledAt: now,
        refundStatus: 'PENDING_REFUND',
        refundNote: refundNote.trim(),
      },
    });

    // Kembalikan stok jika produk punya stok terbatas
    if (order.productId) {
      const product = await prisma.product.findUnique({ where: { id: order.productId } });
      if (product?.stockEnabled) {
        await prisma.product.update({
          where: { id: order.productId },
          data: { stockQty: { increment: order.quantity } },
        });
      }
    }

    await prisma.adminOrderNote.create({
      data: {
        orderId: id,
        adminId,
        note: `Cancel disetujui. ${refundNote.trim()}`,
      },
    });

    res.json({
      success: true,
      message: 'Permintaan cancel disetujui. Refund ditandai sebagai pending.',
    });
  } catch (err) {
    console.error('[approveCancelRequest] Error:', err);
    res.status(500).json({ error: 'Gagal approve cancel.' });
  }
};

// ------------------------------------------------------------------
// POST /api/admin/orders/:id/reject-cancel
// Tolak permintaan cancel dari user
// adminStatus dikembalikan ke previousAdminStatus
//
// Body: { note }
// ------------------------------------------------------------------
export const rejectCancelRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = req.user.sub as string;
    const { note } = req.body as { note: string };

    if (!note?.trim()) {
      res.status(400).json({ error: 'Alasan penolakan wajib diisi.' });
      return;
    }

    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      res.status(404).json({ error: 'Order tidak ditemukan.' });
      return;
    }
    if (order.adminStatus !== 'CANCEL_REQUESTED') {
      res.status(400).json({ error: 'Order ini tidak sedang dalam status permintaan pembatalan.' });
      return;
    }

    // Kembalikan ke status sebelum CANCEL_REQUESTED
    const restoreStatus = order.previousAdminStatus ?? 'PENDING_ADMIN';

    await prisma.order.update({
      where: { id },
      data: {
        adminStatus: restoreStatus,
        previousAdminStatus: null,
        cancelReason: null,
        cancelRequestedAt: null,
      },
    });

    await prisma.adminOrderNote.create({
      data: {
        orderId: id,
        adminId,
        note: `Cancel ditolak: ${note.trim()}`,
      },
    });

    res.json({
      success: true,
      message: `Permintaan cancel ditolak. Order kembali ke status ${restoreStatus}.`,
      restoredStatus: restoreStatus,
    });
  } catch (err) {
    console.error('[rejectCancelRequest] Error:', err);
    res.status(500).json({ error: 'Gagal reject cancel.' });
  }
};

// ------------------------------------------------------------------
// POST /api/admin/orders/:id/confirm-refund
// Konfirmasi bahwa refund sudah ditransfer ke user
//
// Body: { note? }
// ------------------------------------------------------------------
export const confirmRefund = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = req.user.sub as string;
    const { note } = req.body as { note?: string };

    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      res.status(404).json({ error: 'Order tidak ditemukan.' });
      return;
    }
    if (order.refundStatus !== 'PENDING_REFUND') {
      res.status(400).json({ error: 'Order ini tidak dalam status menunggu refund.' });
      return;
    }

    const now = new Date();
    const noteText = note?.trim() || 'Refund sudah dikonfirmasi selesai.';

    await prisma.order.update({
      where: { id },
      data: {
        refundStatus: 'REFUNDED',
        refundedAt: now,
      },
    });

    await prisma.adminOrderNote.create({
      data: { orderId: id, adminId, note: noteText },
    });

    res.json({
      success: true,
      message: 'Refund dikonfirmasi selesai.',
    });
  } catch (err) {
    console.error('[confirmRefund] Error:', err);
    res.status(500).json({ error: 'Gagal konfirmasi refund.' });
  }
};

// ------------------------------------------------------------------
// Helper: map order ke format admin response
// ------------------------------------------------------------------
function mapOrderForAdmin(order: any) {
  return {
    id: order.id,
    orderType: order.orderType,
    orderNumber: order.midtransOrderId || order.id.substring(0, 8).toUpperCase(),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,

    // User info
    user: order.user ?? null,
    robloxUsername: order.robloxUsername,
    customerWhatsapp: order.customerWhatsapp,

    // Product info (untuk ITEM_GAME)
    product: order.product
      ? {
          id: order.product.id,
          name: order.product.name,
          imageUrl: order.product.imageUrl,
          priceIdr: order.product.priceIdr,
          gameName: order.product.game?.name ?? null,
          categoryName: order.product.category?.name ?? null,
        }
      : null,
    quantity: order.quantity,

    // Robux info (untuk ROBUX)
    robuxAmount: order.robuxAmount,

    // Payment
    paymentStatus: order.paymentStatus,
    customerPriceIdr: order.customerPriceIdr,
    midtransOrderId: order.midtransOrderId,

    // Robuxship (untuk ROBUX)
    robuxshipStatus: order.robuxshipStatus,

    // Admin status (untuk ITEM_GAME)
    adminStatus: order.adminStatus,
    adminNote: order.adminNote,

    // Meetup
    meetupScheduledAt: order.meetupScheduledAt,
    meetupWorld: order.meetupWorld,
    meetupServerCode: order.meetupServerCode,
    meetupSlot: order.meetupSlot ?? null,

    // Cancel
    cancelReason: order.cancelReason,
    cancelRequestedAt: order.cancelRequestedAt,
    cancelledAt: order.cancelledAt,

    // Refund
    refundStatus: order.refundStatus,
    refundedAt: order.refundedAt,
    refundNote: order.refundNote,

    // Audit trail
    adminNotes: order.adminNotes ?? [],
  };
}