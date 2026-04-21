import dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../lib/prisma';
import { hashPassword } from '../services/authService';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error('Penggunaan: npx ts-node src/scripts/createAdmin.ts <email> <password> <name>');
    console.error('Contoh: npx ts-node src/scripts/createAdmin.ts admin@eltopup.id P@ssw0rd123 "Admin El TopUp"');
    process.exit(1);
  }

  const [email, password, ...nameParts] = args;
  const name = nameParts.join(' ');

  if (!EMAIL_REGEX.test(email)) {
    console.error('Format email tidak valid.');
    process.exit(1);
  }

  if (!PASSWORD_REGEX.test(password) || password.length < 8) {
    console.error('Password harus minimal 8 karakter, mengandung huruf dan angka.');
    process.exit(1);
  }

  if (!name.trim()) {
    console.error('Nama tidak boleh kosong.');
    process.exit(1);
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {
      role: 'admin',
      passwordHash: hashedPassword,
      emailVerified: true,
      authProvider: 'email',
      name: name.trim(),
    },
    create: {
      email: email.toLowerCase(),
      name: name.trim(),
      role: 'admin',
      passwordHash: hashedPassword,
      emailVerified: true,
      authProvider: 'email',
    },
  });

  console.log(`Admin berhasil dibuat/diperbarui:`);
  console.log(`  ID    : ${user.id}`);
  console.log(`  Email : ${user.email}`);
  console.log(`  Name  : ${user.name}`);
  console.log(`  Role  : ${user.role}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
