// eslint-disable-next-line @typescript-eslint/no-require-imports
const midtransClient = require('midtrans-client');

const IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';

// Snap instance — used for generating payment tokens / redirect URLs
const snap = new midtransClient.Snap({
  isProduction: IS_PRODUCTION,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// Core API instance — used for verifying webhook notifications
const coreApi = new midtransClient.CoreApi({
  isProduction: IS_PRODUCTION,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

export interface CreateSnapTransactionParams {
  midtransOrderId: string;   // Unique order ID sent to Midtrans (our internal Order.id)
  grossAmountIdr: number;    // Amount in IDR (integer)
  customerName: string;
  customerEmail: string;
  description: string;
}

export interface SnapTransactionResult {
  token: string;
  redirectUrl: string;
}

/**
 * Creates a Midtrans Snap transaction and returns the payment token + URL.
 */
export async function createSnapTransaction(
  params: CreateSnapTransactionParams,
): Promise<SnapTransactionResult> {
  const parameter = {
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
        id: params.midtransOrderId,
        price: params.grossAmountIdr,
        quantity: 1,
        name: params.description,
      },
    ],
  };

  const transaction = await snap.createTransaction(parameter);

  return {
    token: transaction.token,
    redirectUrl: transaction.redirect_url,
  };
}

/**
 * Verifies and parses an incoming Midtrans webhook notification.
 * The midtrans-client library handles signature verification internally.
 */
export async function verifyMidtransNotification(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  notificationBody: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Record<string, any>> {
  return coreApi.transaction.notification(notificationBody);
}
