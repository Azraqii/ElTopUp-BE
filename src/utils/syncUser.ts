import { prisma } from '../lib/prisma';

export const syncUserToDatabase = async (supabaseUser: any) => {
  // Handle both JWT payload format and Supabase user object format
  const userId = supabaseUser.sub || supabaseUser.id;
  const email = supabaseUser.email;

  console.log('[syncUser] userId:', userId, 'length:', userId?.length);

  if (!userId || !email) {
    throw new Error(`Missing userId or email: userId=${userId}, email=${email}`);
  }

  const user = await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: email,
      name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || 'User',
    },
  });

  return user;
};