import mongoose, { Schema, Document } from 'mongoose';

// Sub-schema untuk Item dalam Keranjang (Tidak dibuat Model terpisah, ditempel di Order)
const OrderItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Item', required: true }, // Link ke produk asli
  name: { type: String, required: true }, // Snapshot nama (cegah perubahan nama di masa depan)
  price: { type: Number, required: true }, // Snapshot harga saat beli
  quantity: { type: Number, required: true, default: 1 },
  type: { type: String, enum: ['robux', 'item'], required: true },
  
  // Data Spesifik per Item
  gamepassId: { type: String }, // WAJIB jika type='robux' (Bot butuh ini)
  note: { type: String }        // Opsional jika type='item' (Catatan trade)
});

export interface IOrder extends Document {
  user: mongoose.Types.ObjectId;
  robloxUsername: string; // Target Username (Satu order biasanya untuk 1 akun)
  robloxId?: string;      // ID Roblox (didapat dari API Roblox nanti)
  
  orderItems: {
    product: mongoose.Types.ObjectId;
    name: string;
    price: number;
    quantity: number;
    type: 'robux' | 'item';
    gamepassId?: string;
    note?: string;
  }[];

  totalPrice: number;
  paymentStatus: 'UNPAID' | 'PAID' | 'EXPIRED' | 'FAILED';
  orderStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED'; // PROCESSING = Bot kerja / Admin kirim
  midtransOrderId: string; // ID unik buat Midtrans
}

const OrderSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  robloxUsername: { type: String, required: true },
  robloxId: { type: String }, // Opsional, diisi hasil fetch API Roblox

  orderItems: [OrderItemSchema], // <--- Array of Items (KERANJANG)

  totalPrice: { type: Number, required: true },
  paymentStatus: { 
    type: String, 
    enum: ['UNPAID', 'PAID', 'EXPIRED', 'FAILED'], 
    default: 'UNPAID' 
  },
  orderStatus: { 
    type: String, 
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'], 
    default: 'PENDING' 
  },
  midtransOrderId: { type: String }, 
}, { timestamps: true });

export default mongoose.model<IOrder>('Order', OrderSchema);