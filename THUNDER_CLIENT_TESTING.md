# Panduan Testing API El TopUp — Thunder Client

## 1. Setup Awal

### Install Thunder Client
1. Buka VS Code → Extensions → cari **Thunder Client** → Install
2. Klik ikon petir ⚡ di sidebar kiri

### Environment Variables
Buat environment baru bernama **El TopUp Local**:

| Variable | Value |
|----------|-------|
| `baseUrl` | `http://localhost:3000` |
| `userToken` | *(isi setelah login)* |
| `adminToken` | *(isi setelah admin login)* |
| `orderId` | *(isi setelah checkout)* |

### Jalankan Server
```bash
cd eltopup-be
npx prisma generate
npm run dev
```

---

## 2. Struktur Collection

Buat collection **El TopUp API** dengan folder:

```
📁 El TopUp API
├── 📁 Auth - User
│   ├── POST Register
│   ├── POST Verify Email
│   ├── POST Resend Verification
│   ├── POST Login
│   ├── POST Forgot Password
│   ├── POST Reset Password
│   └── GET Me
├── 📁 Auth - Admin
│   ├── POST Admin Login
│   └── POST Admin Change Password
├── 📁 Orders - ROBUX
│   ├── POST Scan Gamepass (Preview)
│   ├── POST Checkout ROBUX
│   ├── GET My Orders
│   ├── GET Order Status
│   └── POST Cancel Order
├── 📁 Orders - Item Game
│   ├── POST Checkout Item
│   ├── GET My Orders
│   └── POST Cancel Order
├── 📁 Products (Public)
│   ├── GET Games
│   ├── GET Categories
│   └── GET Products
├── 📁 Admin
│   ├── GET Dashboard Stats
│   ├── GET Bot Balance
│   ├── GET Orders (Admin)
│   ├── GET Order Detail (Admin)
│   ├── PATCH Update Order Status
│   ├── GET Bot Cookie Status
│   └── PUT Update Bot Cookie
└── 📁 Webhooks
    └── POST Midtrans Webhook
```

---

## 3. Detail Request

### 3.1 Auth - User

#### POST Register
```
POST {{baseUrl}}/api/auth/register
Content-Type: application/json

{
  "email": "testuser@example.com",
  "password": "Test1234",
  "name": "Test User"
}
```
**Response 201:**
```json
{
  "success": true,
  "message": "Registrasi berhasil. Cek email untuk verifikasi."
}
```

#### POST Verify Email
```
POST {{baseUrl}}/api/auth/verify-email
Content-Type: application/json

{
  "token": "<token dari email/log terminal>"
}
```
> **Tips:** Jika RESEND_API_KEY tidak di-set, token akan muncul di terminal server (mode placeholder).

#### POST Resend Verification
```
POST {{baseUrl}}/api/auth/resend-verification
Content-Type: application/json

{
  "email": "testuser@example.com"
}
```

#### POST Login
```
POST {{baseUrl}}/api/auth/login
Content-Type: application/json

{
  "email": "testuser@example.com",
  "password": "Test1234"
}
```
**Response 200:**
```json
{
  "token": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "email": "testuser@example.com",
    "name": "Test User",
    "role": "user"
  }
}
```
> **Penting:** Salin nilai `token` ke environment variable `userToken`.

#### POST Forgot Password
```
POST {{baseUrl}}/api/auth/forgot-password
Content-Type: application/json

{
  "email": "testuser@example.com"
}
```

#### POST Reset Password
```
POST {{baseUrl}}/api/auth/reset-password
Content-Type: application/json

{
  "token": "<token dari email/log terminal>",
  "newPassword": "NewPass123"
}
```

#### GET Me
```
GET {{baseUrl}}/api/auth/me
Authorization: Bearer {{userToken}}
```

---

### 3.2 Auth - Admin

#### Buat Admin (CLI)
```bash
npx ts-node src/scripts/createAdmin.ts admin@eltopup.id P@ssw0rd123 "Admin El TopUp"
```

#### POST Admin Login
```
POST {{baseUrl}}/api/admin/auth/login
Content-Type: application/json

{
  "email": "admin@eltopup.id",
  "password": "P@ssw0rd123"
}
```
**Response 200:**
```json
{
  "token": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "email": "admin@eltopup.id",
    "name": "Admin El TopUp",
    "role": "admin"
  }
}
```
> **Penting:** Salin nilai `token` ke environment variable `adminToken`.

#### POST Admin Change Password
```
POST {{baseUrl}}/api/admin/auth/change-password
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "currentPassword": "P@ssw0rd123",
  "newPassword": "NewAdmin456"
}
```

---

### 3.3 Orders - ROBUX

#### POST Scan Gamepass (Preview)
Endpoint baru untuk preview scan gamepass sebelum checkout. Tidak membuat order.
```
POST {{baseUrl}}/api/orders/scan-gamepass
Authorization: Bearer {{userToken}}
Content-Type: application/json

{
  "robloxUsername": "NamaUserRoblox",
  "robuxAmount": 100
}
```
**Response 200 (ditemukan):**
```json
{
  "found": true,
  "gamepass": {
    "gamepassId": "123456789",
    "name": "Donate 143",
    "price": 143,
    "isForSale": true,
    "sellerId": 987654321,
    "gameName": "User's Place"
  },
  "scannedGames": 3,
  "scannedGamepasses": 12,
  "userId": 987654321,
  "username": "NamaUserRoblox",
  "requiredPrice": 143,
  "grossRobuxAmount": 143,
  "netRobuxAmount": 100
}
```
**Response 200 (tidak ditemukan):**
```json
{
  "found": false,
  "gamepass": null,
  "scannedGames": 3,
  "scannedGamepasses": 12,
  "userId": 987654321,
  "username": "NamaUserRoblox",
  "requiredPrice": 143,
  "grossRobuxAmount": 143,
  "netRobuxAmount": 100
}
```
> **Catatan:** `grossRobuxAmount = Math.ceil(robuxAmount / 0.7)`. Gamepass harus di-set ke harga gross ini.

#### POST Checkout ROBUX
```
POST {{baseUrl}}/api/orders/checkout
Authorization: Bearer {{userToken}}
Content-Type: application/json

{
  "robloxUsername": "NamaUserRoblox",
  "robuxAmount": 100
}
```
> **Tidak perlu gamepassLink lagi!** Sistem akan otomatis scan gamepass user berdasarkan harga.

**Response 201:**
```json
{
  "success": true,
  "orderId": "uuid",
  "netRobuxAmount": 100,
  "grossRobuxAmount": 143,
  "totalPriceIdr": 11395,
  "gamepassId": "123456789",
  "payment": {
    "provider": "MIDTRANS",
    "method": "qris",
    "midtransOrderId": "uuid",
    "snapToken": "...",
    "snapRedirectUrl": "https://app.sandbox.midtrans.com/snap/..."
  },
  "message": "Order berhasil dibuat. Silakan lanjutkan ke pembayaran."
}
```
> Salin `orderId` ke environment variable `orderId`.

#### GET My Orders
```
GET {{baseUrl}}/api/orders
Authorization: Bearer {{userToken}}
```

#### GET Order Status
```
GET {{baseUrl}}/api/orders/{{orderId}}/status
Authorization: Bearer {{userToken}}
```

#### POST Cancel Order
```
POST {{baseUrl}}/api/orders/{{orderId}}/cancel
Authorization: Bearer {{userToken}}
Content-Type: application/json

{
  "cancelReason": "Berubah pikiran"
}
```

---

### 3.4 Orders - Item Game

#### POST Checkout Item
```
POST {{baseUrl}}/api/orders/checkout-item
Authorization: Bearer {{userToken}}
Content-Type: application/json

{
  "productId": "<product UUID dari GET Products>",
  "quantity": 1,
  "robloxUsername": "NamaUserRoblox",
  "customerWhatsapp": "081234567890"
}
```

---

### 3.5 Products (Public — tanpa auth)

#### GET Games
```
GET {{baseUrl}}/api/items/games
```

#### GET Categories
```
GET {{baseUrl}}/api/items/games/roblox/categories
```
> Ganti `roblox` dengan slug game yang tersedia.

#### GET Products
```
GET {{baseUrl}}/api/items/games/roblox/products?categorySlug=accessories
```

---

### 3.6 Admin Endpoints

Semua endpoint admin membutuhkan header:
```
Authorization: Bearer {{adminToken}}
```

#### GET Dashboard Stats
```
GET {{baseUrl}}/api/admin/dashboard
Authorization: Bearer {{adminToken}}
```

#### GET Bot Balance
```
GET {{baseUrl}}/api/admin/bot-balance
Authorization: Bearer {{adminToken}}
```
**Response 200:**
```json
{
  "robux": 5000
}
```

#### GET Orders (Admin)
```
GET {{baseUrl}}/api/admin/orders?orderType=ROBUX&page=1&limit=20
Authorization: Bearer {{adminToken}}
```
Filter opsional: `orderType`, `paymentStatus`, `adminStatus`, `botStatus`, `page`, `limit`.

#### GET Order Detail (Admin)
```
GET {{baseUrl}}/api/admin/orders/{{orderId}}
Authorization: Bearer {{adminToken}}
```

#### PATCH Update Order Status
```
PATCH {{baseUrl}}/api/admin/orders/{{orderId}}/status
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "adminStatus": "SCHEDULED",
  "meetupWorld": "NamaWorld",
  "meetupScheduledAt": "2026-04-21T14:00:00Z",
  "meetupServerCode": "ABC123",
  "adminNote": "Sudah dijadwalkan meetup"
}
```
Status yang tersedia:
- `adminStatus`: `PENDING_ADMIN`, `SCHEDULED`, `DELIVERED`, `CANCELLED`
- `botStatus`: `PROCESSING`, `COMPLETED`, `FAILED`

#### GET Bot Cookie Status
```
GET {{baseUrl}}/api/admin/settings/bot-cookie
Authorization: Bearer {{adminToken}}
```

#### PUT Update Bot Cookie
```
PUT {{baseUrl}}/api/admin/settings/bot-cookie
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "cookie": "_|WARNING:-DO-NOT-SHARE-THIS...isi-cookie-lengkap-minimal-50-karakter..."
}
```

---

### 3.7 Webhooks

#### POST Midtrans Webhook (Simulasi Pembayaran)
```
POST {{baseUrl}}/api/webhooks/midtrans
Content-Type: application/json

{
  "order_id": "{{orderId}}",
  "transaction_status": "settlement",
  "payment_type": "qris",
  "gross_amount": "11395.00",
  "signature_key": "<hitung dari SHA512>"
}
```
> **Catatan:** Di production, webhook dikirim otomatis oleh Midtrans. Untuk testing manual, gunakan Midtrans Sandbox Dashboard → Settings → Payment Notification URL.

---

## 4. Flow Testing Step-by-Step

### Flow A: Registrasi & Login User
1. **POST Register** — catat token dari log terminal
2. **POST Verify Email** — pakai token dari step 1
3. **POST Login** — salin `token` ke `{{userToken}}`
4. **GET Me** — pastikan data user benar

### Flow B: Top Up ROBUX (Auto-Scan)
**Persiapan:** Pastikan user Roblox sudah membuat gamepass dengan harga yang sesuai dan On Sale.

1. **POST Scan Gamepass** — preview dulu, pastikan `found: true`
2. Jika `found: false`, minta user buat gamepass dengan harga `requiredPrice` Robux
3. **POST Checkout ROBUX** — sistem akan auto-scan dan buat order + Midtrans snap
4. Bayar via Midtrans Sandbox (buka `snapRedirectUrl`)
5. **GET Order Status** — cek status berubah ke `PAID`
6. Bot otomatis beli gamepass → `botStatus` berubah ke `COMPLETED`

### Flow C: Order Item Game
1. **GET Games** → **GET Categories** → **GET Products** — cari `productId`
2. **POST Checkout Item** — buat order item
3. Bayar via Midtrans Sandbox
4. **GET Order Status** — cek `adminStatus: PENDING_ADMIN`
5. (Admin) **PATCH Update Order Status** → set `SCHEDULED` + meetup info
6. (Admin) **PATCH Update Order Status** → set `DELIVERED`
7. **GET Order Status** — cek `uiStatus: Completed`

### Flow D: Cancel Order
1. Buat order (UNPAID) → **POST Cancel Order** langsung
2. Buat order item (bayar dulu) → **POST Cancel Order** → `CANCEL_REQUESTED`
3. (Admin) **PATCH Update Order Status** → `CANCELLED` untuk approve

### Flow E: Admin Login & Dashboard
1. Jalankan CLI `createAdmin.ts` kalau belum
2. **POST Admin Login** — salin `token` ke `{{adminToken}}`
3. **GET Dashboard Stats** — lihat ringkasan order
4. **GET Bot Balance** — cek saldo Robux bot
5. **GET Orders** — filter berdasarkan status
6. **GET Order Detail** — detail lengkap satu order

---

## 5. Troubleshooting

### Error: "Bot cookie belum dikonfigurasi"
- Login admin → **PUT Update Bot Cookie** dengan cookie `.ROBLOSECURITY` valid
- Atau isi via admin UI: `/admin-ui/settings.html`

### Error: "Cookie bot tidak valid atau sudah expired"
- Cookie Roblox expired. Ambil cookie baru dari browser (DevTools → Application → Cookies → `.ROBLOSECURITY`)
- Update via **PUT Update Bot Cookie**

### Error: "Gamepass dengan harga X Robux tidak ditemukan"
- User belum membuat gamepass dengan harga yang tepat
- Harga gamepass harus = `Math.ceil(robuxAmount / 0.7)` (gross price)
- Contoh: 100 Robux net → gamepass harus di-set harga **143 Robux**
- Pastikan gamepass sudah **On Sale** (aktif dijual)

### Error: "Username Roblox tidak ditemukan"
- Cek penulisan username (case-insensitive, tapi harus ada)
- User mungkin banned atau akun private

### Error: "Rate limit Roblox tercapai"
- Tunggu 1-2 menit, lalu coba lagi
- Scan gamepass melakukan banyak request ke Roblox API

### Error: "Token tidak valid" / 401 Unauthorized
- Token JWT expired — login ulang
- Pastikan pakai token yang benar: `userToken` untuk endpoint user, `adminToken` untuk endpoint admin
- Admin token pakai secret berbeda (`ADMIN_JWT_SECRET`) — tidak bisa dipakai di endpoint user dan sebaliknya

### Error: "Email belum diverifikasi"
- Lakukan verifikasi email dulu sebelum login
- Cek terminal server untuk link/token verifikasi (mode placeholder)

### Midtrans Webhook tidak masuk
- Pastikan `MIDTRANS_SERVER_KEY` di `.env` sesuai dengan Sandbox/Production
- Untuk testing lokal, gunakan ngrok: `ngrok http 3000`
- Set notification URL di Midtrans Dashboard ke `https://<ngrok-url>/api/webhooks/midtrans`

### Prisma error / Database connection
- Pastikan `DATABASE_URL` valid di `.env`
- Jalankan `npx prisma generate` setelah pull
- Jalankan `npx prisma db push` untuk sync schema

---

## 6. Catatan Harga & Rumus

| Parameter | Rumus | Contoh (100 Robux) |
|-----------|-------|---------------------|
| Net Robux (yang user terima) | Input user | 100 |
| Gross Robux (harga gamepass) | `Math.ceil(net / 0.7)` | 143 |
| Harga IDR | `Math.ceil((gross / 1000) * 4.7 * 16950)` | Rp 11.395 |
| Rate | $4.7 per 1000 gross Robux × Rp 16.950/USD | — |
