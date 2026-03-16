import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request { user?: any; }

export const requireAuth = async (
  req: AuthRequest, res: Response, next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.SUPABASE_JWT_SECRET as string;
    if (!secret) throw new Error('SUPABASE_JWT_SECRET not set');

    // Decode token header to see what algorithm is used
    const decoded = jwt.decode(token, { complete: true });
    
    // Try raw secret first
    let payload: any;
    let method = '';
    
    try {
      payload = jwt.verify(token, secret, { audience: 'authenticated' });
      method = 'raw';
    } catch {
      try {
        payload = jwt.verify(token, Buffer.from(secret, 'base64'), { audience: 'authenticated' });
        method = 'base64';
      } catch (err2: any) {
        // Return debug info
        res.status(403).json({ 
          error: 'Both methods failed',
          tokenHeader: decoded?.header,
          tokenPayload: (decoded?.payload as any)?.aud,
          secretLength: secret.length,
          err: err2.message
        });
        return;
      }
    }

    req.user = payload;
    next();
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
};