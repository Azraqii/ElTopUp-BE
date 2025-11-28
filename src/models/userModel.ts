// src/models/userModel.ts

import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password: string; 
  role: 'user' | 'admin';
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema({
  email: {
    type: String,
    required: [true, 'Email wajib diisi'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password wajib diisi'],
    minlength: 6,
    select: false,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
}, {
  timestamps: true
});

// --- PERBAIKAN DI SINI ---
// Hapus parameter 'next'. Gunakan async function murni.
UserSchema.pre('save', async function () { 
  // 'this' mengacu pada dokumen user yang sedang diproses
  // Kita cast 'this' sebagai any atau IUser agar TS tidak rewel soal properti password
  const user = this as any; 

  if (!user.isModified('password')) {
    return; // Langsung return tanpa next()
  }

  try {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    // Tidak perlu panggil next() di akhir, karena async function otomatis lanjut kalau tidak error
  } catch (error) {
    throw new Error("Gagal mengenkripsi password."); // Lempar error agar save dibatalkan
  }
});

// Method Compare Password
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);