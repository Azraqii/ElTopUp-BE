// src/controllers/itemController.ts
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../lib/prisma';
import { syncUserToDatabase } from '../utils/syncUser';
import { createSnapTransaction } from '../services/midtransService';

// ------------------------------------------------------------------
// GET /api/items/games
// Daftar semua game aktif + jumlah produk
// ------------------------------------------------------------------
export const getGames = async (_req: Request, res: Response): Promise<void> => {
  try {
    const games = await prisma.game.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { products: { where: { isActive: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      games: games.map((g) => ({
        id: g.id,
        name: g.name,
        slug: g.slug,
        imageUrl: g.imageUrl,
        productCount: g._count.products,
      })),
    });
  } catch (err) {
    console.error('[getGames] Error:', err);
    res.status(500).json({ error: 'Gagal mengambil daftar game.' });
  }
};

// ------------------------------------------------------------------
// GET /api/items/games/:slug/categories
// Kategori item untuk game tertentu, diurutkan sortOrder
// ------------------------------------------------------------------
export const getGameCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    const game = await prisma.game.findUnique({
      where: { slug, isActive: true },
    });

    if (!game) {
      res.status(404).json({ error: 'Game tidak ditemukan.' });
      return;
    }

    const categories = await prisma.gameCategory.findMany({
      where: { gameId: game.id, isActive: true },
      include: {
        _count: {
          select: { products: { where: { isActive: true } } },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    res.json({
      gameId: game.id,
      gameName: game.name,
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        sortOrder: c.sortOrder,
        productCount: c._count.products,
      })),
    });
  } catch (err) {
    console.error('[getGameCategories] Error:', err);
    res.status(500).json({ error: 'Gagal mengambil kategori.' });
  }
};

// ------------------------------------------------------------------
// GET /api/items/games/:slug/products?categorySlug=game-passes
// Produk per game, optional filter by kategori
// ------------------------------------------------------------------
export const getGameProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const { categorySlug } = req.query as { categorySlug?: string };

    const game = await prisma.game.findUnique({
      where: { slug, isActive: true },
    });

    if (!game) {
      res.status(404).json({ error: 'Game tidak ditemukan.' });
      return;
    }

    // Build where clause
    const whereClause: any = {
      gameId: game.id,
      isActive: true,
    };

    if (categorySlug) {
      const category = await prisma.gameCategory.findUnique({
        where: { gameId_slug: { gameId: game.id, slug: categorySlug } },
      });

      if (!category) {
        res.status(404).json({ error: 'Kategori tidak ditemukan.' });
        return;
      }

      whereClause.categoryId = category.id;
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: { category: true },
      orderBy: { priceIdr: 'asc' },
    });

    res.json({
      gameId: game.id,
      gameName: game.name,
      meetupWorldName: game.meetupWorldName,
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        priceIdr: p.priceIdr,
        imageUrl: p.imageUrl,
        categoryId: p.categoryId,
        categoryName: p.category?.name ?? null,
        categorySlug: p.category?.slug ?? null,
        minQty: p.minQty,
        maxQty: p.maxQty,
        stockEnabled: p.stockEnabled,
        // Hanya tampilkan stok kalau stockEnabled = true
        stockQty: p.stockEnabled ? p.stockQty : null,
        inStock: p.stockEnabled ? p.stockQty > 0 : true,
      })),
    });
  } catch (err) {
    console.error('[getGameProducts] Error:', err);
    res.status(500).json({ error: 'Gagal mengambil produk.' });
  }
};

// ------------------------------------------------------------------
// POST /api/items/checkout
// Buat order item game baru
//
// Body:
//   productId        string (UUID)
//   robloxUsername   string
//   customerWhatsapp string (wajib)
//   quantity         number (default 1)
// ------------------------------------------------------------------
export const checkoutItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const supabaseUser = req.user;
    const user = await syncUserToDatabase(supabaseUser);

    const { productId, robloxUsername, customerWhatsapp, quantity = 1 } = req.body as {
      productId: string;
      robloxUsername: string;
      customerWhatsapp: string;
      quantity: number;
    };

    // ── Validasi input dasar ──────────────────────────────────────
    if (!productId) {
      res.status(400).json({ error: 'productId wajib diisi.' });
      return;
    }
    if (!robloxUsername?.trim()) {
      res.status(400).json({ error: 'Username Roblox wajib diisi.' });
      return;
    }
    if (!customerWhatsapp?.trim()) {
      res.status(400).json({ error: 'Nomor WhatsApp wajib diisi untuk koordinasi meetup.' });
      return;
    }

    // ── Ambil produk ──────────────────────────────────────────────
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { game: true, category: true },
    });

    if (!product || !product.isActive) {
      res.status(404).json({ error: 'Produk tidak ditemukan atau sudah tidak aktif.' });
      return;
    }

    // ── Validasi quantity ─────────────────────────────────────────
    if (quantity < product.minQty) {
      res.status(400).json({
        error: `Minimum pembelian item ini adalah ${product.minQty}.`,
      });
      return;
    }
    if (quantity > product.maxQty) {
      res.status(400).json({
        error: `Maksimum pembelian item ini adalah ${product.maxQty}.`,
      });
      return;
    }

    // ── Validasi stok ─────────────────────────────────────────────
    if (product.stockEnabled) {
      if (product.stockQty <= 0) {
        res.status(400).json({ error: 'Stok item ini sedang habis.' });
        return;
      }
      if (product.stockQty < quantity) {
        res.status(400).json({
          error: `Stok tersedia hanya ${product.stockQty}, tidak cukup untuk ${quantity}.`,
        });
        return;
      }
    }

    // ── Hitung total harga ────────────────────────────────────────
    const totalPriceIdr = product.priceIdr * quantity;

    // ── Kurangi stok (atomic update dengan optimistic locking) ────
    if (product.stockEnabled) {
      const updated = await prisma.product.updateMany({
        where: {
          id: productId,
          stockQty: { gte: quantity }, // pastikan stok masih cukup
        },
        data: { stockQty: { decrement: quantity } },
      });

      // Kalau tidak ada baris yang terupdate, stok sudah habis di race condition
      if (updated.count === 0) {
        res.status(400).json({ error: 'Stok item habis, silakan coba lagi.' });
        return;
      }
    }

    // ── Buat order UNPAID ─────────────────────────────────────────
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        productId: product.id,
        robloxUsername: robloxUsername.trim(),
        customerWhatsapp: customerWhatsapp.trim(),
        customerPriceIdr: totalPriceIdr,
        quantity,
        orderType: 'ITEM_GAME',
        paymentStatus: 'UNPAID',
        // adminStatus null dulu — diset ke PENDING_ADMIN setelah webhook PAID
      },
    });

    // ── Buat transaksi Midtrans ───────────────────────────────────
    const frontendBaseUrl = (process.env.FRONTEND_URL || 'https://eltopup.id').replace(/\/$/, '');
    const midtransOrderId = order.id;

    let snapTransaction: { token: string; redirectUrl: string };
    try {
      snapTransaction = await createSnapTransaction({
        midtransOrderId,
        grossAmountIdr: totalPriceIdr,
        customerName: user.name || user.email || 'El Top Up Customer',
        customerEmail: user.email || `${user.id}@eltopup.id`,
        description: `${quantity}x ${product.name} @${robloxUsername}`.slice(0, 50),
        callbacks: {
          finish: `${frontendBaseUrl}/pesanan/${order.id}`,
          pending: `${frontendBaseUrl}/pesanan/${order.id}`,
          error: `${frontendBaseUrl}/items/${product.game?.slug}`,
        },
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { midtransOrderId },
      });

      await prisma.systemLog.create({
        data: {
          orderId: order.id,
          serviceName: 'MIDTRANS',
          eventType: 'CREATE_SNAP_SUCCESS',
          payloadData: { midtransOrderId, redirectUrl: snapTransaction.redirectUrl },
          status: 'SUCCESS',
        },
      });
    } catch (midtransError: any) {
      // Kalau Midtrans gagal, kembalikan stok
      if (product.stockEnabled) {
        await prisma.product.update({
          where: { id: productId },
          data: { stockQty: { increment: quantity } },
        });
      }

      await prisma.systemLog.create({
        data: {
          orderId: order.id,
          serviceName: 'MIDTRANS',
          eventType: 'CREATE_SNAP_FAILED',
          payloadData: { message: midtransError.message },
          status: 'ERROR',
        },
      });

      res.status(502).json({
        error: 'Order berhasil dibuat, tetapi gagal membuat transaksi pembayaran.',
        details: midtransError.message,
        orderId: order.id,
      });
      return;
    }

    res.status(201).json({
      success: true,
      orderId: order.id,
      productName: product.name,
      quantity,
      totalPriceIdr,
      payment: {
        provider: 'MIDTRANS',
        midtransOrderId,
        snapToken: snapTransaction.token,
        snapRedirectUrl: snapTransaction.redirectUrl,
      },
      message: 'Order berhasil dibuat. Silakan lanjutkan ke pembayaran.',
    });
  } catch (err) {
    console.error('[checkoutItem] Unexpected error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan internal server saat checkout.' });
  }
};

// ------------------------------------------------------------------
// POST /api/items/orders/:id/cancel
//
// Aturan cancel:
//   UNPAID (semua tipe)    → langsung CANCELLED, kembalikan stok
//   PAID + ROBUX           → tolak, tidak bisa cancel
//   PAID + ITEM_GAME       → set CANCEL_REQUESTED, admin yang putuskan
//   DELIVERED / CANCELLED  → tolak, sudah final
//
// Body: { reason?: string }
// ------------------------------------------------------------------
export const cancelOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body as { reason?: string };
    const userId = req.user.sub as string;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!order) {
      res.status(404).json({ error: 'Order tidak ditemukan.' });
      return;
    }

    // Hanya pemilik order yang bisa cancel
    if (order.userId !== userId) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }

    const now = new Date();

    // ── CASE 1: Order belum bayar — langsung cancel ───────────────
    if (order.paymentStatus === 'UNPAID') {
      await prisma.order.update({
        where: { id },
        data: {
          paymentStatus: 'CANCELLED',
          cancelReason: reason ?? 'Dibatalkan oleh user',
          cancelRequestedAt: now,
          cancelledAt: now,
        },
      });

      // Kembalikan stok jika produk punya stok terbatas
      if (order.productId && order.product?.stockEnabled) {
        await prisma.product.update({
          where: { id: order.productId },
          data: { stockQty: { increment: order.quantity } },
        });
      }

      res.json({
        success: true,
        message: 'Order berhasil dibatalkan.',
        orderId: id,
      });
      return;
    }

    // ── CASE 2: Order Robux sudah PAID — tidak bisa cancel ────────
    if (order.orderType === 'ROBUX' && order.paymentStatus === 'PAID') {
      res.status(400).json({
        error: 'Order Robux yang sudah dibayar tidak dapat dibatalkan. Robux diproses secara instan.',
      });
      return;
    }

    // ── CASE 3: Order Item Game sudah PAID ───────────────────────
    if (order.orderType === 'ITEM_GAME' && order.paymentStatus === 'PAID') {
      // Sudah final — tidak bisa cancel
      if (order.adminStatus === 'DELIVERED') {
        res.status(400).json({
          error: 'Order yang sudah selesai dikirim tidak dapat dibatalkan.',
        });
        return;
      }

      if (order.adminStatus === 'CANCELLED') {
        res.status(400).json({ error: 'Order ini sudah dibatalkan sebelumnya.' });
        return;
      }

      // Sudah ada request cancel yang menunggu
      if (order.adminStatus === 'CANCEL_REQUESTED') {
        res.status(400).json({
          error: 'Permintaan pembatalan sudah diajukan, menunggu konfirmasi admin.',
        });
        return;
      }

      // Simpan status sebelumnya untuk restore jika admin tolak
      await prisma.order.update({
        where: { id },
        data: {
          previousAdminStatus: order.adminStatus,
          adminStatus: 'CANCEL_REQUESTED',
          cancelReason: reason ?? 'Dibatalkan oleh user',
          cancelRequestedAt: now,
        },
      });

      // Catat di AdminOrderNote sebagai log
      // Tidak ada adminId di sini karena ini dari user — pakai system note
      await prisma.systemLog.create({
        data: {
          orderId: id,
          serviceName: 'CANCEL',
          eventType: 'CANCEL_REQUESTED_BY_USER',
          payloadData: {
            reason: reason ?? 'Dibatalkan oleh user',
            previousAdminStatus: order.adminStatus,
          },
          status: 'INFO',
        },
      });

      res.json({
        success: true,
        message: 'Permintaan pembatalan berhasil diajukan. Admin akan memproses dalam 1x24 jam.',
        orderId: id,
      });
      return;
    }

    // ── CASE 4: Status lain yang tidak bisa di-cancel ─────────────
    res.status(400).json({
      error: 'Order dengan status ini tidak dapat dibatalkan.',
    });
  } catch (err) {
    console.error('[cancelOrder] Unexpected error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan internal server.' });
  }
};