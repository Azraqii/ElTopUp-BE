import midtransClient from 'midtrans-client';

const MIDTRANS_WEBHOOK_URL = 'https://api.eltopup.id/api/webhooks/midtrans';

export interface CreateSnapTransactionParams {
  midtransOrderId: string;
  grossAmountIdr: number;
  customerName: string;
  customerEmail: string;
  description: string;
  enabledPayments?: string[];
  callbacks?: {
    finish: string;
    pending: string;
    error: string;
  };
}

function getSnapClient() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const clientKey = process.env.MIDTRANS_CLIENT_KEY;
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';

  if (!serverKey || !clientKey) {
    throw new Error('Konfigurasi Midtrans belum lengkap. Pastikan MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY tersedia.');
  }

  return new midtransClient.Snap({
    isProduction,
    serverKey,
    clientKey,
  });
}

export const createSnapTransaction = async (
  params: CreateSnapTransactionParams,
): Promise<{ token: string; redirectUrl: string }> => {
  const snap = getSnapClient();

  const payload: midtransClient.SnapTransactionParameters & Record<string, unknown> = {
    transaction_details: {
      order_id: params.midtransOrderId,
      gross_amount: params.grossAmountIdr,
    },
    customer_details: {
      first_name: params.customerName,
      email: params.customerEmail,
    },
    item_details: [
      {
        id: 'ROBLOX_TOPUP',
        price: params.grossAmountIdr,
        quantity: 1,
        name: params.description.slice(0, 50),
      },
    ],
  };

  payload.override_notification_url = [MIDTRANS_WEBHOOK_URL];
  console.log(`[Midtrans] Notification URL: ${MIDTRANS_WEBHOOK_URL}`);

  if (params.enabledPayments && params.enabledPayments.length > 0) {
    payload.enabled_payments = params.enabledPayments;
  }

  if (params.callbacks) {
    payload.callbacks = params.callbacks;
  }

  const transaction = await snap.createTransaction(payload);

  if (!transaction.token || !transaction.redirect_url) {
    throw new Error('Midtrans tidak mengembalikan token pembayaran yang valid.');
  }

  return {
    token: transaction.token,
    redirectUrl: transaction.redirect_url,
  };
};

export interface MidtransTransactionStatus {
  transaction_status: string;
  fraud_status: string;
  status_code: string;
  order_id: string;
  gross_amount: string;
  signature_key: string;
  payment_type: string;
}

export async function getTransactionStatus(orderId: string): Promise<MidtransTransactionStatus> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';

  if (!serverKey) {
    throw new Error('MIDTRANS_SERVER_KEY belum di-set.');
  }

  const baseUrl = isProduction
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com';

  const response = await fetch(`${baseUrl}/v2/${orderId}/status`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Basic ${Buffer.from(serverKey + ':').toString('base64')}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Midtrans status check gagal: ${response.status}`);
  }

  return response.json() as Promise<MidtransTransactionStatus>;
}

