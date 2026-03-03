import axios, { AxiosError } from 'axios';
import { prisma } from '../lib/prisma';

const ROBUXSHIP_BASE_URL = 'https://api.robuxship.com/v1';
const ROBUXSHIP_API_KEY = process.env.ROBUXSHIP_API_KEY as string;
const ROBUXSHIP_SHOP_ID = process.env.ROBUXSHIP_SHOP_ID as string;

const robuxshipClient = axios.create({
  baseURL: ROBUXSHIP_BASE_URL,
  headers: {
    Authorization: `Bearer ${ROBUXSHIP_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export interface ValidateGamepassResult {
  universeId: number;
  placeId: number;
  gamepassId: string;
  userId: number;
  username: string;
  price: number;   // Robux price of the gamepass (already includes 30% tax)
  cost: number;    // USD cost of this validation call
}

export interface RobuxshipOrderResult {
  orderId: string;
  status: string;
}

export interface RobuxshipStatusResult {
  orderId: string;
  status: string;   // PENDING | PROCESSING | COMPLETED | ERROR
  robuxAmount?: number;
}

// ------------------------------------------------------------------
// Phase 1 — Validate Gamepass
// ------------------------------------------------------------------

/**
 * Calls GET /orders/validate?username=...&robux_amount=...
 * Returns the validated gamepass details or throws an error.
 */
export async function validateGamepass(
  username: string,
  robuxAmount: number,
): Promise<ValidateGamepassResult> {
  try {
    const response = await robuxshipClient.get('/orders/validate', {
      params: { username, robux_amount: robuxAmount },
    });

    const data = response.data;

    if (!data.success || !data.valid) {
      throw new Error(data.message || 'Gamepass validation failed.');
    }

    return {
      universeId: data.universe_id,
      placeId: data.place_id,
      gamepassId: String(data.gamepass_id),
      userId: data.user_id,
      username: data.username,
      price: data.price,
      cost: data.cost,
    };
  } catch (err) {
    const error = err as AxiosError<{ success: boolean; error: string; message: string }>;
    if (error.response) {
      const body = error.response.data;
      throw new Error(body?.message || `RobuxShip validation error: ${error.response.status}`);
    }
    throw err;
  }
}

// ------------------------------------------------------------------
// Phase 3 — Create RobuxShip Order
// ------------------------------------------------------------------

/**
 * Posts to POST /orders to create the actual Robux delivery order.
 * Should be called immediately after payment is confirmed.
 */
export async function createRobuxshipOrder(orderId: string): Promise<void> {
  // Fetch the full order so we have gamepass_id and robux amount
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { catalogItem: true },
  });

  if (!order.robloxGamepassId) {
    throw new Error(`Order ${orderId} has no gamepassId. Cannot create RobuxShip order.`);
  }

  let apiResponseData: unknown = null;

  try {
    const payload = {
      shop_id: ROBUXSHIP_SHOP_ID,
      method: 'Gamepass',
      robux_amount: order.catalogItem.robuxAmount,
      gamepass_id: order.robloxGamepassId,
    };

    const response = await robuxshipClient.post('/orders', payload);
    apiResponseData = response.data;

    const robuxshipOrderId = String(response.data?.order_id || response.data?.id);
    const robuxshipStatus = response.data?.status || 'PROCESSING';

    // Update the order with RobuxShip order details
    await prisma.order.update({
      where: { id: orderId },
      data: {
        robuxshipOrderId,
        robuxshipStatus,
      },
    });

    // Log success
    await prisma.systemLog.create({
      data: {
        orderId,
        serviceName: 'ROBUXSHIP',
        eventType: 'CREATE_ORDER_SUCCESS',
        payloadData: response.data as object,
        status: 'SUCCESS',
      },
    });
  } catch (err) {
    const error = err as AxiosError;

    // Log the failure — the order is PAID so we MUST not lose it
    await prisma.systemLog.create({
      data: {
        orderId,
        serviceName: 'ROBUXSHIP',
        eventType: 'CREATE_ORDER_FAILED',
        payloadData: (apiResponseData ?? { message: (error as Error).message }) as object,
        status: 'ERROR',
      },
    });

    // Mark order as needing manual retry (keep paymentStatus PAID, set robuxshipStatus ERROR)
    await prisma.order.update({
      where: { id: orderId },
      data: { robuxshipStatus: 'ERROR' },
    });

    // Re-throw so the caller is aware
    throw err;
  }
}

// ------------------------------------------------------------------
// Phase 4 — Poll RobuxShip Order Status
// ------------------------------------------------------------------

/**
 * Fetches the latest status of a RobuxShip order and syncs it to the DB.
 */
export async function syncRobuxshipStatus(orderId: string): Promise<RobuxshipStatusResult> {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
  });

  if (!order.robuxshipOrderId) {
    return { orderId, status: order.robuxshipStatus };
  }

  const response = await robuxshipClient.get(`/orders/${order.robuxshipOrderId}`);
  const remoteStatus: string = String(response.data?.status || 'PENDING').toUpperCase();

  // Only write if the status changed to avoid unnecessary DB writes
  if (remoteStatus !== order.robuxshipStatus) {
    await prisma.order.update({
      where: { id: orderId },
      data: { robuxshipStatus: remoteStatus },
    });
  }

  return {
    orderId: order.robuxshipOrderId,
    status: remoteStatus,
    robuxAmount: response.data?.robux_amount,
  };
}
