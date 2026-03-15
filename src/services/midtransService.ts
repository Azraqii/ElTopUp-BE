import midtransClient from 'midtrans-client';

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