import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User from '../models/userModel';

export interface AuthRequest extends Request {
  user?: any;
}

// 1. PROTECT (Wajib Login)
export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        // Token valid, tapi user sudah dihapus dari DB
        return res.status(401).json({ message: 'User tidak ditemukan (Token Kedaluwarsa/Reset)' });
      }
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// 2. OPTIONAL PROTECT (Debug Version)
export const optionalProtect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
      req.user = await User.findById(decoded.id).select('-password');
      
      // DEBUG LOG: Cek apakah user ketemu?
      if (!req.user) {
          console.log("⚠️ Token valid tapi User tidak ada di DB (Efek Seeding)");
      } else {
          console.log("✅ User ditemukan:", req.user.email);
      }

    } catch (error) {
      console.log("❌ Token Error:", error);
      req.user = undefined;
    }
  }
  next();
};