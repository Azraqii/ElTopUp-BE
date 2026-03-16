import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

export interface AuthRequest extends Request { user?: any; }

const supabase = createClient(
  `https://${process.env.SUPABASE_PROJECT_REF}.supabase.co`,
  process.env.SUPABASE_ANON_KEY as string,
);

export const requireAuth = async (
  req: AuthRequest, res: Response, next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    res.status(403).json({ error: 'Forbidden: Invalid or expired token', detail: error?.message });
    return;
  }

  req.user = { 
    sub: data.user.id, 
    email: data.user.email, 
    ...data.user.user_metadata 
  };
  next();
};