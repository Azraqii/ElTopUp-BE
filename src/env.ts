import dotenv from 'dotenv';
import path from 'path';

// Dipanggil sebelum modul lain agar env var tersedia saat PrismaClient & service diinisialisasi
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}
