import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const syncUserToDatabase = async (supabaseUser: any) => {
  // 'sub' di JWT Supabase adalah UUID unik user
  const userId = supabaseUser.sub; 
  const email = supabaseUser.email;

  // Lakukan Upsert (Update atau Insert)
  // Jika user sudah ada, abaikan. Jika belum, buat baru.
  const user = await prisma.user.upsert({
    where: { id: userId },
    update: {}, // Tidak ada yang diupdate jika sudah ada
    create: {
      id: userId,
      email: email,
      // Jika login pakai Google, Supabase biasanya menyimpan nama di user_metadata
      name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || 'User',
    },
  });

  return user;
};