import axios, { AxiosError } from 'axios';
import { prisma } from '../lib/prisma';

const ROBUXSHIP_BASE_URL = 'https://api.robuxship.com/v1';
const ROBUXSHIP_API_KEY = process.env.ROBUXSHIP_API_KEY as string;

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
  price: number;   
  cost: number;    
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
 * Calls POST /orders/validate
 * Returns the validated gamepass details or throws an error.
 */
export async function validateGamepass(
  username: string,
  grossAmount: number,
): Promise<ValidateGamepassResult> {
  try {
    // Sesuai dokumen: POST /orders/validate dengan JSON Body [cite: 215, 216, 218]
    const response = await robuxshipClient.post('/orders/validate', {
      method: 'gamepass', 
      amount: grossAmount, 
      username: username 
    });

    const data = response.data;

    // Sesuai dokumen: response berada langsung di root object [cite: 228-237]
    if (!data.success || !data.valid) { 
      throw new Error('Gamepass validation failed.');
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
  } catch (err: any) {
    // Standar error handling RobuxShip: err.response.data.error.message [cite: 106-114]
    const errorMessage = err.response?.data?.error?.message || err.message || 'Gagal terhubung ke RobuxShip';
    throw new Error(errorMessage);
  }
}

// ------------------------------------------------------------------
// Phase 3 — Create RobuxShip Order
// ------------------------------------------------------------------

/**
 * Posts to POST /orders/create to create the actual Robux delivery order.
 * Should be called immediately after Midtrans payment is confirmed.
 */
export async function createRobuxshipOrder(orderId: string): Promise<void> {
  // Ambil order dinamis kita, tanpa require catalogItem
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
  });

  if (!order.robloxGamepassId) {
    throw new Error(`Order ${orderId} has no gamepassId. Cannot create RobuxShip order.`);
  }

  let apiResponseData: any = null;

  try {
    // Hitung ulang harga kotor untuk dikirim ke RobuxShip
    const grossAmount = Math.ceil(order.robuxAmount / 0.7);

    // Sesuai dokumen: Payload membutuhkan order_id (idempotency key dari sistem kita) [cite: 138, 144-148]
    const payload = {
      order_id: order.id, 
      method: 'gamepass', 
      amount: grossAmount, 
      gamepass_id: parseInt(order.robloxGamepassId, 10), 
    };

    const response = await robuxshipClient.post('/orders/create', payload);
    apiResponseData = response.data;

    if (!apiResponseData.success) { 
      throw new Error('Failed to create order on RobuxShip');
    }

    // Ambil ID internal dari RobuxShip dan status [cite: 156, 158]
    const robuxshipOrderId = String(apiResponseData.data.id); 
    const robuxshipStatus = String(apiResponseData.data.status).toUpperCase(); 

    await prisma.order.update({
      where: { id: orderId },
      data: {
        robuxshipOrderId,
        robuxshipStatus,
      },
    });

    await prisma.systemLog.create({
      data: {
        orderId,
        serviceName: 'ROBUXSHIP',
        eventType: 'CREATE_ORDER_SUCCESS',
        payloadData: apiResponseData,
        status: 'SUCCESS',
      },
    });
  } catch (err: any) {
    await prisma.systemLog.create({
      data: {
        orderId,
        serviceName: 'ROBUXSHIP',
        eventType: 'CREATE_ORDER_FAILED',
        payloadData: err.response?.data || { message: err.message },
        status: 'ERROR',
      },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { robuxshipStatus: 'ERROR' },
    });

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

  // RobuxShip mendukung pencarian menggunakan ID eksternal Anda [cite: 168, 172]
  const queryId = order.robuxshipOrderId || order.id;

  try {
    const response = await robuxshipClient.get(`/orders/${queryId}`); 
    const data = response.data.data; 

    const remoteStatus: string = String(data.status).toUpperCase(); 

    if (remoteStatus !== order.robuxshipStatus) {
      await prisma.order.update({
        where: { id: orderId },
        data: { robuxshipStatus: remoteStatus },
      });
    }

    return {
      orderId: data.id, 
      status: remoteStatus, 
      robuxAmount: data.amount,
    };
  } catch (err: any) {
    console.warn(`[syncRobuxshipStatus] Failed to sync order ${orderId}`);
    return { orderId, status: order.robuxshipStatus };
  }
}