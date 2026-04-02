import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as string;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const callbackURL = process.env.GOOGLE_CALLBACK_URL as string;

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: callbackURL as string,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email provided by Google'));

        const user = await prisma.user.upsert({
          where: { email },
          update: { name: profile.displayName },
          create: { email, name: profile.displayName },
        });

        done(null, user);
      } catch (err) {
        done(err as Error);
      }
    },
  ),
);

export const googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false,
});

export const googleCallback = (req: Request, res: Response, next: NextFunction): void => {
  passport.authenticate('google', { session: false }, (err: Error | null, user: any) => {
    if (err || !user) {
      res.redirect(`${FRONTEND_URL}/login?error=auth_failed`);
      return;
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as any },
    );

    res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
  })(req, res, next);
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    res.status(200).json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (err) {
    console.error('[getMe] Error:', err);
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
};
