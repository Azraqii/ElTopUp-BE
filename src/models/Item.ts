import mongoose, { Schema, Document } from 'mongoose';

export interface IItem extends Document {
  game: mongoose.Types.ObjectId;
  name: string;       // e.g., "100 Robux" atau "Leopard Fruit"
  type: 'robux' | 'item'; // <--- PEMISAH LOGIKA BOT vs ADMIN
  price: number;      // Harga jual (Rp)
  nominal?: number;   // Jumlah Robux (hanya jika type='robux')
  imageUrl: string;
  isActive: boolean;
}

const ItemSchema: Schema = new Schema({
  game: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
  name: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['robux', 'item'], // Validasi ketat
    required: true 
  }, 
  price: { type: Number, required: true },
  nominal: { type: Number, default: 0 }, // 0 jika tipe 'item'
  imageUrl: { type: String, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<IItem>('Item', ItemSchema);