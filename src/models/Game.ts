import mongoose, { Schema, Document } from 'mongoose';

export interface IGame extends Document {
  name: string;
  slug: string;
  thumbnailUrl: string;
  category: string; // <--- TAMBAHKAN INI
  isActive: boolean;
}

const GameSchema: Schema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  thumbnailUrl: { type: String, required: true },
  category: { type: String, default: 'Game' }, // <--- TAMBAHKAN INI
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<IGame>('Game', GameSchema);