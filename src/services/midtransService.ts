// Mock Service Midtrans untuk Testing
export const createSnapTransaction = async (params: {
  midtransOrderId: string;
  grossAmountIdr: number;
  customerName: string;
  customerEmail: string;
  description: string;
}) => {
  console.log(`[MOCK MIDTRANS] Membuat tagihan untuk Order ID: ${params.midtransOrderId}`);
  
  // Mengembalikan data bohongan
  return {
    token: `mock-token-${params.midtransOrderId}`,
    redirectUrl: `http://localhost:3000/mock-payment?order_id=${params.midtransOrderId}`,
  };
};