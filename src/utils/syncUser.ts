import { prisma } from '../lib/prisma';

export const syncUserToDatabase = async (jwtUser: any) => {
  const userId = jwtUser.sub as string;
  const email = jwtUser.email as string;

  if (!userId || !email) {
    throw new Error(`Missing userId or email: userId=${userId}, email=${email}`);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  return user;
};