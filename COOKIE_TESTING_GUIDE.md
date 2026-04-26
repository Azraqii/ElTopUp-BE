# COOKIE_TESTING_GUIDE.md

Panduan detail perbedaan cookie Roblox di backend El TopUp dan checklist persiapan sebelum testing.

## 1) Ringkasan Cepat

Di backend ini ada 2 konsep cookie Roblox yang beda fungsi:

1. `ROBLOX_SECURITY_COOKIE` (ENV, opsional)
2. `ROBLOX_BOT_COOKIE` (Database `SystemConfig`, wajib untuk flow ROBUX)

Keduanya sama-sama berisi value `.ROBLOSECURITY`, tapi sumber data, hak akses, dan dampak testing-nya berbeda.

## 2) Perbedaan Cookie

## 2.1 ROBLOX_SECURITY_COOKIE (ENV)

Sumber:
- File `.env` / environment variable

Dipakai di:
- `src/routes/robloxRoutes.ts`
- Endpoint `GET /api/roblox/search`

Tujuan:
- Membantu endpoint pencarian username Roblox (`/v1/users/search`) agar hasil autocomplete lebih lengkap/stabil.

Sifat:
- Opsional. Tanpa cookie ini, endpoint search tetap bisa jalan tapi bisa terbatas.

Dampak kalau kosong:
- Bukan blocker untuk payment gateway.
- Biasanya hanya menurunkan kualitas hasil pencarian username di UI.

## 2.2 ROBLOX_BOT_COOKIE (Database)

Sumber:
- Tabel `SystemConfig`, key: `ROBLOX_BOT_COOKIE`
- Diupdate via endpoint admin:
  - `GET /api/admin/settings/bot-cookie`
  - `PUT /api/admin/settings/bot-cookie`

Dipakai di:
- `src/services/robloxBotService.ts`
- Dipanggil oleh:
  - `scan gamepass` (sebelum checkout ROBUX)
  - validasi gamepass saat checkout ROBUX
  - pembelian gamepass setelah webhook settlement
  - cek saldo bot (`GET /api/admin/bot-balance`)

Tujuan:
- Autentikasi akun bot Roblox untuk akses endpoint yang butuh cookie + CSRF Roblox.

Sifat:
- Wajib untuk flow ROBUX end-to-end.

Dampak kalau kosong/invalid:
- `scan-gamepass` dan `checkout ROBUX` berpotensi gagal.
- Webhook settlement bisa menandai payment `PAID`, tapi proses bot purchase jadi `FAILED`.
- Error umum: cookie invalid/expired, rate limit, gagal dapat CSRF token.

## 2.3 Apakah ini akun supplier?

Ya. Untuk flow ROBUX otomatis, `ROBLOX_BOT_COOKIE` adalah identitas akun Roblox yang benar-benar melakukan pembelian gamepass (akun supplier/bot).

Artinya:
- Supplier aktif = cookie yang terakhir tersimpan di `SystemConfig.ROBLOX_BOT_COOKIE`
- Tidak ada multi-select supplier di runtime pada implementasi saat ini
- Tidak ada mapping order → supplier per order (semua order pakai supplier aktif yang sama)

## 2.4 Cara memilih cookie yang dipakai (implementasi saat ini)

Saat ini cara pilihnya adalah overwrite cookie aktif.

Urutan praktis:
1. Login admin
2. Update cookie supplier yang ingin dipakai via `PUT /api/admin/settings/bot-cookie`
3. Verifikasi pakai `GET /api/admin/bot-balance`
4. Jalankan checkout ROBUX baru

Rule penting:
- Last write wins: cookie terakhir yang di-save akan dipakai semua proses berikutnya.
- Jika cookie diganti di tengah banyak order yang sedang masuk, order yang diproses setelah update akan pakai supplier baru.

## 3) Dependency Matrix (Flow vs Cookie)

- `GET /api/roblox/search`:
  - Butuh `ROBLOX_SECURITY_COOKIE`? Tidak wajib (opsional)
  - Butuh `ROBLOX_BOT_COOKIE`? Tidak

- `POST /api/orders/scan-gamepass`:
  - Butuh `ROBLOX_SECURITY_COOKIE`? Tidak
  - Butuh `ROBLOX_BOT_COOKIE`? Ya (wajib)

- `POST /api/orders/checkout` (ROBUX):
  - Butuh `ROBLOX_SECURITY_COOKIE`? Tidak
  - Butuh `ROBLOX_BOT_COOKIE`? Ya (wajib)

- `POST /api/webhooks/midtrans` untuk order ROBUX:
  - Butuh `ROBLOX_SECURITY_COOKIE`? Tidak
  - Butuh `ROBLOX_BOT_COOKIE`? Ya, agar auto-purchase berhasil setelah status `PAID`

- `POST /api/orders/checkout-item` (ITEM_GAME):
  - Butuh `ROBLOX_SECURITY_COOKIE`? Tidak
  - Butuh `ROBLOX_BOT_COOKIE`? Tidak

## 4) Yang Harus Dilakukan Sebelum Testing

## 4.1 Pastikan ENV inti backend

Minimal pastikan ada:

- `DATABASE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `MIDTRANS_SERVER_KEY`
- `MIDTRANS_CLIENT_KEY`
- `USER_JWT_SECRET` (atau fallback `JWT_SECRET`)
- `ADMIN_JWT_SECRET`

Sangat disarankan untuk sandbox testing:

- `MIDTRANS_IS_PRODUCTION=false`
- `FRONTEND_URL=http://localhost:5173`
- `RESEND_API_KEY=placeholder`
- `PORT=5001`
- `NODE_ENV=development`

Opsional untuk autocomplete username:

- `ROBLOX_SECURITY_COOKIE=<cookie akun Roblox read-only>`

## 4.2 Siapkan database dan service

Jalankan dari folder `eltopup-be`:

```bash
npx prisma migrate dev
npx prisma generate
npx tsc --noEmit
npm run dev
```

Catatan:
- Saat startup, backend akan memastikan key `ROBLOX_BOT_COOKIE` ada di `SystemConfig` (bisa kosong dulu).

## 4.3 Isi ROBLOX_BOT_COOKIE (WAJIB untuk flow ROBUX)

1. Login admin
2. Cek status cookie bot:

```bash
curl -X GET http://localhost:5001/api/admin/settings/bot-cookie \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

3. Set cookie bot:

```bash
curl -X PUT http://localhost:5001/api/admin/settings/bot-cookie \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -d '{"cookie":"_|WARNING:-DO-NOT-SHARE-THIS..."}'
```

4. Verifikasi bot bisa akses Roblox:

```bash
curl -X GET http://localhost:5001/api/admin/bot-balance \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

Jika endpoint ini gagal 403/401 dari Roblox, cookie bot biasanya expired atau invalid.

## 4.4 Siapkan data uji ROBUX

Sebelum checkout ROBUX:
- User Roblox target harus punya gamepass.
- Harga gamepass harus sama dengan gross price:
  - `gross = ceil(netRobux / 0.7)`
- Gamepass harus `On Sale`.
- Seller gamepass harus akun Roblox yang sama dengan username input checkout.

Contoh:
- Mau kirim 100 Robux net
- Maka gamepass harus dipasang harga 143 Robux

## 4.5 Siapkan Midtrans Sandbox

- Gunakan key sandbox (`SB-...`).
- Set notification URL ke endpoint webhook backend:
  - `POST /api/webhooks/midtrans`
- Untuk simulasi manual, kirim payload settlement dengan `order_id` sesuai order.

## 5) Urutan Testing yang Direkomendasikan

1. Testing auth user/admin (dapat token)
2. Set `ROBLOX_BOT_COOKIE` via admin endpoint
3. Cek `GET /api/admin/bot-balance`
4. `POST /api/orders/scan-gamepass`
5. `POST /api/orders/checkout` (ROBUX)
6. Simulasi/real sandbox payment sampai webhook `settlement`
7. `GET /api/orders/:id/status`:
   - `paymentStatus` menjadi `PAID`
   - `botStatus` bergerak ke `COMPLETED` (atau `FAILED` jika cookie bermasalah)
8. Uji idempotency webhook (kirim settlement dua kali)

## 5.1 Workflow jika cookie supplier sering diupdate

Supaya tidak rancu saat rotasi supplier:

1. Tentukan "supplier aktif" untuk 1 batch order (misal 30-60 menit)
2. Update cookie sekali di awal batch
3. Jalankan verifikasi `GET /api/admin/bot-balance`
4. Proses order dalam batch tersebut
5. Kalau perlu ganti supplier, lakukan saat batch selesai (hindari ganti cookie per order)

Jika kamu butuh multi-supplier yang benar-benar bisa dipilih per order, implementasi saat ini belum mendukung. Perlu perubahan arsitektur (mis. tabel supplier + assign supplierId ke order saat checkout).

## 6) Gejala Umum dan Arti Masalah

- Pesan: `Bot cookie belum dikonfigurasi`
  - Penyebab: `ROBLOX_BOT_COOKIE` kosong di DB
  - Aksi: set cookie via endpoint admin

- Pesan: `Cookie bot tidak valid atau sudah expired`
  - Penyebab: cookie bot kedaluwarsa/tidak valid
  - Aksi: ambil cookie baru, update lagi

- `scan-gamepass` gagal walau username ada
  - Kemungkinan: bot cookie invalid, gamepass tidak On Sale, harga gamepass tidak cocok, seller mismatch

- Payment sukses tapi botStatus gagal
  - Midtrans + webhook oke, tapi eksekusi Roblox bot gagal (cookie/rate-limit/validasi gamepass)

## 7) Best Practice Keamanan

- Jangan simpan cookie Roblox asli di git atau dokumen publik.
- Jangan log value cookie mentah ke terminal.
- Gunakan akun bot khusus, jangan akun pribadi.
- Rotasi cookie secara berkala dan update via admin endpoint.

## 8) Referensi Implementasi

- `src/routes/robloxRoutes.ts`
- `src/services/robloxBotService.ts`
- `src/services/gamepassValidationService.ts`
- `src/controllers/adminController.ts`
- `src/controllers/orderController.ts`
- `src/controllers/webhookController.ts`
- `src/utils/validateEnv.ts`
