import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// Terima parameter sebagai string atau ObjectId
export const generateToken = (id: string | mongoose.Types.ObjectId): string => {
  // Pastikan SECRET ada
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET belum disetting di file .env");
  }
  
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};