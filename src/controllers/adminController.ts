import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../lib/prisma';
import { purchaseGamepass } from '../services/robloxBotService';
import { Prisma } from '@prisma/client';

// ------------------------------------------------------------------
// GET /api/admin/orders
// ------------------------------------------------------------------
export const getOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      orderType,
      paymentStatus,
      adminStatus,
      botStatus,
      page: pageStr,
      limit: limitStr,
    } = req.query as Record<string, string | undefined>;

    const page = Math.max(1, parseInt(pageStr || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(limitStr || '20', 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};
    if (orderType) where.orderType = orderType;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (adminStatus) where.adminStatus = adminStatus;
    if (botStatus) where.botStatus = botStatus;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, name: true } },
          product: { include: { game: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('[admin/getOrders] Error:', err);
    res.status(500).json({ error: 'Gagal mengambil daftar order.' });
  }
};

// ------------------------------------------------------------------
// GET /api/admin/orders/:id
// ------------------------------------------------------------------
export const getOrderDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true } },
        product: { include: { game: true } },
        meetupSlot: true,
        adminNotes: {
          include: { admin: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
        eventLogs: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order tidak ditemukan.' });
      return;
    }

    res.json(order);
  } catch (err) {
    console.error('[admin/getOrderDetail] Error:', err);
    res.status(500).json({ error: 'Gagal mengambil detail order.' });
  }
};

// ------------------------------------------------------------------
// PATCH /api/admin/orders/:id/status
// ------------------------------------------------------------------
export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = req.user.sub as string;
    const { adminStatus, botStatus, adminNote, meetupWorld, meetupScheduledAt, meetupServerCode } =
      req.body as {
        adminStatus?: string;
        botStatus?: string;
        adminNote?: string;
        meetupWorld?: string;
        meetupScheduledAt?: string;
        meetupServerCode?: string;
      };

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      res.status(404).json({ error: 'Order tidak ditemukan.' });
      return;
    }

    const updateData: Prisma.OrderUpdateInput = {};

    if (adminStatus) {
      if (adminStatus === 'SCHEDULED') {
        if (!meetupWorld || !meetupScheduledAt) {
          res.status(400).json({
            error: 'World name dan jadwal meetup wajib diisi untuk status SCHEDULED.',
          });
          return;
        }

        const scheduledAt = new Date(meetupScheduledAt);

        await prisma.itemMeetupSlot.upsert({
          where: { orderId: id },
          create: {
            orderId: id,
            worldName: meetupWorld,
            serverCode: meetupServerCode || null,
            scheduledAt,
            handledBy: adminId,
            status: 'SCHEDULED',
          },
          update: {
            worldName: meetupWorld,
            serverCode: meetupServerCode || null,
            scheduledAt,
            handledBy: adminId,
            status: 'SCHEDULED',
          },
        });

        updateData.meetupScheduledAt = scheduledAt;
        updateData.meetupWorld = meetupWorld;
        updateData.meetupServerCode = meetupServerCode || null;
      }

      if (adminStatus === 'DELIVERED') {
        const slot = await prisma.itemMeetupSlot.findUnique({ where: { orderId: id } });
        if (slot) {
          await prisma.itemMeetupSlot.update({
            where: { orderId: id },
            data: { status: 'COMPLETED', confirmedAt: new Date() },
          });
        }
      }

      if (adminStatus === 'CANCELLED' && order.adminStatus === 'CANCEL_REQUESTED') {
        updateData.cancelledAt = new Date();
      }

      if (
        adminStatus !== 'CANCEL_REQUESTED' &&
        order.adminStatus === 'CANCEL_REQUESTED' &&
        adminStatus !== 'CANCELLED'
      ) {
        updateData.adminStatus = order.previousAdminStatus || 'PENDING_ADMIN';
        updateData.cancelReason = null;
        updateData.cancelRequestedAt = null;
        updateData.previousAdminStatus = null;
      } else {
        updateData.adminStatus = adminStatus;
      }
    }

    if (botStatus) {
      updateData.botStatus = botStatus;
      if (botStatus === 'PROCESSING' && order.orderType === 'ROBUX' && order.robloxGamepassId) {
        const grossAmount = Math.ceil((order.robuxAmount || 0) / 0.7);
        purchaseGamepass(order.robloxGamepassId, grossAmount)
          .then(async (result) => {
            if (result.success) {
              await prisma.order.update({
                where: { id },
                data: { botStatus: 'COMPLETED' },
              });
            } else {
              await prisma.order.update({
                where: { id },
                data: { botStatus: 'FAILED', botErrorMessage: result.message },
              });
            }
          })
          .catch(async (err: Error) => {
            await prisma.order.update({
              where: { id },
              data: { botStatus: 'FAILED', botErrorMessage: err.message },
            });
          });
      }
    }

    await prisma.order.update({ where: { id }, data: updateData });

    if (adminNote) {
      await prisma.adminOrderNote.create({
        data: {
          orderId: id,
          adminId,
          note: adminNote,
        },
      });
    }

    await prisma.systemLog.create({
      data: {
        orderId: id,
        serviceName: 'ADMIN',
        eventType: 'ORDER_STATUS_UPDATED',
        payloadData: {
          adminId,
          adminStatus: adminStatus || null,
          botStatus: botStatus || null,
          adminNote: adminNote || null,
        },
        status: 'SUCCESS',
      },
    });

    res.json({ success: true, message: 'Status order berhasil diperbarui.' });
  } catch (err) {
    console.error('[admin/updateOrderStatus] Error:', err);
    res.status(500).json({ error: 'Gagal memperbarui status order.' });
  }
};

// ------------------------------------------------------------------
// GET /api/admin/settings/bot-cookie
// ------------------------------------------------------------------
export const getBotCookie = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'ROBLOX_BOT_COOKIE' },
    });

    res.json({ hasValue: !!(config && config.value) });
  } catch (err) {
    console.error('[admin/getBotCookie] Error:', err);
    res.status(500).json({ error: 'Gagal mengambil status cookie bot.' });
  }
};

// ------------------------------------------------------------------
// PUT /api/admin/settings/bot-cookie
// ------------------------------------------------------------------
export const updateBotCookie = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const adminId = req.user.sub as string;
    const { cookie } = req.body as { cookie: string };

    if (!cookie || cookie.length < 50) {
      res.status(400).json({ error: 'Cookie tidak valid. Minimal 50 karakter.' });
      return;
    }

    await prisma.systemConfig.upsert({
      where: { key: 'ROBLOX_BOT_COOKIE' },
      create: {
        key: 'ROBLOX_BOT_COOKIE',
        value: cookie,
        description: 'Cookie .ROBLOSECURITY untuk akun bot Roblox',
      },
      update: { value: cookie },
    });

    await prisma.systemLog.create({
      data: {
        serviceName: 'ADMIN',
        eventType: 'BOT_COOKIE_UPDATED',
        payloadData: { message: `Cookie updated by admin ${adminId}` },
        status: 'SUCCESS',
      },
    });

    res.json({ success: true, message: 'Cookie berhasil diperbarui.' });
  } catch (err) {
    console.error('[admin/updateBotCookie] Error:', err);
    res.status(500).json({ error: 'Gagal memperbarui cookie bot.' });
  }
};

// ------------------------------------------------------------------
// GET /api/admin/dashboard
// ------------------------------------------------------------------
export const getDashboardStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalOrdersToday,
      totalRevenueResult,
      ordersPendingAdmin,
      ordersProcessing,
      ordersFailed,
      recentOrders,
    ] = await Promise.all([
      prisma.order.count({
        where: {
          paymentStatus: 'PAID',
          createdAt: { gte: todayStart },
        },
      }),

      prisma.order.aggregate({
        where: {
          paymentStatus: 'PAID',
          createdAt: { gte: todayStart },
        },
        _sum: { customerPriceIdr: true },
      }),

      prisma.order.count({
        where: { adminStatus: 'PENDING_ADMIN' },
      }),

      prisma.order.count({
        where: { botStatus: 'PROCESSING' },
      }),

      prisma.order.count({
        where: {
          botStatus: 'FAILED',
          updatedAt: { gte: last24h },
        },
      }),

      prisma.order.findMany({
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    res.json({
      totalOrdersToday,
      totalRevenueToday: totalRevenueResult._sum.customerPriceIdr || 0,
      ordersPendingAdmin,
      ordersProcessing,
      ordersFailed,
      recentOrders,
    });
  } catch (err) {
    console.error('[admin/getDashboardStats] Error:', err);
    res.status(500).json({ error: 'Gagal mengambil statistik dashboard.' });
  }
};
