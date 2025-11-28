import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
  user?: mongoose.Types.ObjectId; // <--- JADI OPTIONAL (?)
  email: string;                  // <--- BARU: Wajib disimpan di order (buat Guest/User)
  robloxUsername: string;
  
  item: mongoose.Types.ObjectId;
  itemName: string;
  itemType: 'robux' | 'item';
  
  quantity: number;
  totalPrice: number;
  
  gamepassId?: string;
  note?: string;

  paymentStatus: 'UNPAID' | 'PAID' | 'EXPIRED' | 'FAILED';
  orderStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  midtransOrderId: string;
}

const OrderSchema: Schema = new Schema({
  // User jadi Optional (required: false)
  user: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  
  // Email jadi Wajib (Entah dari akun user atau input manual guest)
  email: { type: String, required: true }, 

  robloxUsername: { type: String, required: true },

  // ... (Sisanya sama persis seperti sebelumnya) ...
  item: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
  itemName: { type: String, required: true },
  itemType: { type: String, enum: ['robux', 'item'], required: true },
  quantity: { type: Number, required: true, default: 1 },
  totalPrice: { type: Number, required: true },
  gamepassId: { type: String },
  note: { type: String },
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