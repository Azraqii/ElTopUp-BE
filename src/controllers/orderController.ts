import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../lib/prisma';
import { syncUserToDatabase } from '../utils/syncUser';
import { validateGamepass } from '../services/robuxshipService';
import { createSnapTransaction } from '../services/midtransService';
import { syncRobuxshipStatus } from '../services/robuxshipService';

// ------------------------------------------------------------------
// POST /api/orders/checkout
// ------------------------------------------------------------------
// Phase 1: Validate gamepass → create order → return Midtrans payment URL

export const checkout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const supabaseUser = req.user;

    // 1. Ensure the user exists in our DB (sync from Supabase)
    const user = await syncUserToDatabase(supabaseUser);

    const { catalogItemId, robloxUsername } = req.body as {
      catalogItemId: string;
      robloxUsername: string;
    };

    if (!catalogItemId || !robloxUsername) {
      res.status(400).json({ error: 'catalogItemId and robloxUsername are required.' });
      return;
    }

    // 2. Fetch catalog item
    const catalogItem = await prisma.catalogItem.findUnique({
      where: { id: catalogItemId },
    });

    if (!catalogItem || !catalogItem.isActive) {
      res.status(404).json({ error: 'Catalog item not found or inactive.' });
      return;
    }

    // 3. Validate gamepass via RobuxShip
    let gamepassData;
    try {
      gamepassData = await validateGamepass(robloxUsername, catalogItem.robuxAmount);
    } catch (validationError) {
      await prisma.systemLog.create({
        data: {
          serviceName: 'ROBUXSHIP',
          eventType: 'VALIDATE_GAMEPASS_FAILED',
          payloadData: { username: robloxUsername, error: (validationError as Error).message },
          status: 'ERROR',
        },
      });
      res.status(400).json({
        error: 'Roblox gamepass validation failed.',
        details: (validationError as Error).message,
      });
      return;
    }

    // 4. Create the Order record in DB (UNPAID)
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        catalogItemId,
        robloxUsername,
        robloxGamepassId: gamepassData.gamepassId,
        paymentStatus: 'UNPAID',
        robuxshipStatus: 'PENDING',
        customerPriceIdr: catalogItem.priceIdr,
        robuxshipCostUsd: gamepassData.cost,
      },
    });

    // 5. Create Midtrans Snap transaction
    const snapResult = await createSnapTransaction({
      midtransOrderId: order.id,
      grossAmountIdr: catalogItem.priceIdr,
      customerName: user.name || user.email,
      customerEmail: user.email,
      description: `${catalogItem.name} — El TopUp`,
    });

    // 6. Save the Midtrans order ID back to the Order record
    await prisma.order.update({
      where: { id: order.id },
      data: { midtransOrderId: order.id },
    });

    await prisma.systemLog.create({
      data: {
        orderId: order.id,
        serviceName: 'MIDTRANS',
        eventType: 'SNAP_TRANSACTION_CREATED',
        payloadData: { token: snapResult.token },
        status: 'SUCCESS',
      },
    });

    res.status(201).json({
      orderId: order.id,
      paymentToken: snapResult.token,
      paymentUrl: snapResult.redirectUrl,
    });
  } catch (err) {
    console.error('[checkout] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error during checkout.' });
  }
};

// ------------------------------------------------------------------
// GET /api/orders/:id/status
// ------------------------------------------------------------------
// Phase 4: Poll order status (syncs from RobuxShip)

export const getOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const supabaseUser = req.user;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { catalogItem: true },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    // Ensure the authenticated user owns this order
    if (order.userId !== supabaseUser.sub) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }

    // If order is PAID and RobuxShip order exists, sync latest status
    let robuxshipResult = null;
    if (order.paymentStatus === 'PAID' && order.robuxshipOrderId) {
      try {
        robuxshipResult = await syncRobuxshipStatus(id);
      } catch {
        // Non-fatal — just return current DB state
      }
    }

    res.json({
      orderId: order.id,
      paymentStatus: order.paymentStatus,
      robuxshipStatus: robuxshipResult?.status ?? order.robuxshipStatus,
      catalogItem: {
        name: order.catalogItem.name,
        robuxAmount: order.catalogItem.robuxAmount,
      },
      robloxUsername: order.robloxUsername,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });
  } catch (err) {
    console.error('[getOrderStatus] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// GET /api/orders  (user's own orders)
// ------------------------------------------------------------------

export const getMyOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.sub as string;

    const orders = await prisma.order.findMany({
      where: { userId },
      include: { catalogItem: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ orders });
  } catch (err) {
    console.error('[getMyOrders] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
