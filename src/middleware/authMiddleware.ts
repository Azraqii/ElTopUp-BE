import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User from '../models/userModel';

// Kita extend tipe Request agar TS tahu ada properti 'user' di dalamnya
export interface AuthRequest extends Request {
  user?: any;
}

// 1. PROTECT: Wajib Login (Untuk Admin / Payment / History)
export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
      req.user = await User.findById(decoded.id).select('-password');
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// 2. OPTIONAL PROTECT: Boleh Login, Boleh Tidak (Untuk Create Order)
export const optionalProtect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
      req.user = await User.findById(decoded.id).select('-password');
    } catch (error) {
      // Jika token error/expired, jangan error. Anggap saja Guest (user = undefined)
      console.log("Token invalid/expired di optional route, lanjut sebagai Guest.");
      req.user = undefined;
    }
  }
  
  // Lanjut ke controller, baik req.user ada isinya atau kosong
  next();
};