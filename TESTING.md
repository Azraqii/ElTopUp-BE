# TESTING.md — El TopUp Backend Refactor

Checklist testing manual setelah refactor dari RobuxShip ke Bot Cookie internal.

---

## TEST 1: SETUP

- [ ] Jalankan: `npx prisma migrate dev --name rename_robuxship_to_bot_status`
- [ ] Jalankan: `npx prisma generate`
- [ ] Pastikan tidak ada TypeScript error: `npx tsc --noEmit`
- [ ] Start server: `npm run dev`
- [ ] Buka `/admin-ui/settings.html`, isi bot cookie

## TEST 2: VALIDASI GAMEPASS (ROBUX FLOW)

- [ ] POST `/api/orders/checkout`
  - Body: `{ "robloxUsername": "...", "robuxAmount": 100, "gamepassLink": "..." }`
  - Expected: 201 dengan snapToken
- [ ] Coba dengan gamepass yang salah harga
  - Expected: 400 dengan pesan "Harga Gamepass tidak sesuai"
- [ ] Coba dengan username yang tidak ada
  - Expected: 400 "Username Roblox tidak ditemukan"
- [ ] Coba dengan gamepass bukan milik user
  - Expected: 400 "Gamepass ini bukan milik kamu"

## TEST 3: ITEM GAME FLOW

- [ ] POST `/api/orders/checkout-item`
  - Body: `{ "productId": "...", "quantity": 1, "robloxUsername": "...", "customerWhatsapp": "08xxx" }`
  - Expected: 201 dengan snapToken
- [ ] Coba quantity melebihi maxQty
  - Expected: 400 error validasi
- [ ] Coba productId yang tidak ada
  - Expected: 404

## TEST 4: MIDTRANS WEBHOOK

- [ ] Kirim POST ke `/api/webhooks/midtrans` dengan payload:
  ```json
  {
    "order_id": "{orderId}",
    "transaction_status": "settlement",
    "fraud_status": "accept",
    "status_code": "200",
    "gross_amount": "{amount}.00",
    "signature_key": "{hitung manual SHA512}"
  }
  ```
- [ ] Cek order ROBUX: paymentStatus → PAID, botStatus → PROCESSING
- [ ] Cek order ITEM_GAME: paymentStatus → PAID, adminStatus → PENDING_ADMIN
- [ ] Cek SystemLog ada record baru

## TEST 5: BOT PURCHASE

- [ ] Gunakan akun Roblox test, buat gamepass dengan harga sesuai
- [ ] Trigger webhook settlement untuk order ROBUX
- [ ] Cek log terminal: harus ada "🤖 BOT: Memulai pembelian..."
- [ ] Tunggu 5-10 detik, cek order botStatus → COMPLETED
- [ ] Verifikasi di Roblox: gamepass sudah terbeli oleh akun bot

## TEST 6: ADMIN DASHBOARD

- [ ] Login sebagai admin (set role = "admin" di DB langsung)
- [ ] Buka `/admin-ui/dashboard.html` di browser
- [ ] Pastikan stats muncul: tidak ada NaN atau undefined
- [ ] Buka `/admin-ui/orders.html`
- [ ] Filter by orderType = ITEM_GAME, pastikan hasil sesuai
- [ ] Klik salah satu order → masuk order-detail.html
- [ ] Update adminStatus ke SCHEDULED, isi world name + waktu
- [ ] Cek DB: ItemMeetupSlot terbuat, Order.meetupWorld terisi

## TEST 7: COOKIE UPDATE

- [ ] Buka `/admin-ui/settings.html`
- [ ] GET `/api/admin/settings/bot-cookie` → pastikan return `{ hasValue: true/false }`
- [ ] Update cookie via form
- [ ] Cek SystemLog: ada record "BOT_COOKIE_UPDATED"
- [ ] Cek nilai cookie TIDAK ada di log (hanya pesan "updated by admin")
- [ ] Pastikan pembelian berikutnya menggunakan cookie baru (tanpa restart server)

## TEST 8: ERROR HANDLING

- [ ] Matikan bot cookie (set value kosong di DB)
- [ ] Trigger pembelian → pastikan gagal dengan pesan jelas, bukan crash
- [ ] Set cookie invalid → pastikan error 403 ditangkap dengan benar
- [ ] Coba akses `/api/admin/*` tanpa token → pastikan 401
- [ ] Coba akses `/api/admin/*` dengan token user biasa → pastikan 403

## TEST 9: EDGE CASES

- [ ] Double webhook: kirim webhook settlement 2x untuk order yang sama
  - Expected: order tetap PAID, bot tidak dipanggil 2x
- [ ] Order sudah COMPLETED, kirim webhook lagi
  - Expected: diabaikan dengan log "already processed"
- [ ] Gamepass sudah dibeli (AlreadyOwned)
  - Expected: botStatus → COMPLETED (bukan error)
