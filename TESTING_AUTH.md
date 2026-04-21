# TESTING_AUTH.md — El TopUp Auth System

Checklist testing manual untuk sistem autentikasi email+password.

---

## SETUP AWAL

- [ ] Jalankan: `npx prisma migrate dev --name add_email_auth_fields`
- [ ] Jalankan: `npx prisma generate`
- [ ] Pastikan tidak ada TypeScript error: `npx tsc --noEmit`
- [ ] Tambahkan env baru ke `.env`:
  ```
  USER_JWT_SECRET=random-string-min-32-chars
  ADMIN_JWT_SECRET=different-random-string-min-32-chars
  RESEND_API_KEY=placeholder
  ```
- [ ] Buat akun admin pertama:
  ```
  npx ts-node src/scripts/createAdmin.ts admin@eltopup.id P@ssw0rd123 "Admin El TopUp"
  ```
- [ ] Start server: `npm run dev`

---

## REGISTER & VERIFIKASI EMAIL

### TC-001: Register berhasil
**Endpoint:** POST /api/auth/register
**Input:** `{ "email": "test@example.com", "password": "Test1234", "name": "Test User" }`
**Expected:** 201 `{ "message": "Registrasi berhasil. Cek email untuk verifikasi." }`
**Hasil:** ✅ PASS
**Catatan:** Email verifikasi di-log ke terminal (mode placeholder)

### TC-002: Register email sudah terdaftar
**Endpoint:** POST /api/auth/register
**Input:** `{ "email": "test@example.com", "password": "Test1234", "name": "Test User" }`
**Expected:** 400 `{ "error": "Email sudah terdaftar." }`
**Hasil:** ✅ PASS

### TC-003: Register password terlalu lemah (hanya angka)
**Endpoint:** POST /api/auth/register
**Input:** `{ "email": "test2@example.com", "password": "12345678", "name": "Test" }`
**Expected:** 400 `{ "error": "Password harus mengandung minimal satu huruf dan satu angka." }`
**Hasil:** ✅ PASS

### TC-004: Register password terlalu pendek
**Endpoint:** POST /api/auth/register
**Input:** `{ "email": "test3@example.com", "password": "Ab1", "name": "Test" }`
**Expected:** 400 `{ "error": "Password minimal 8 karakter." }`
**Hasil:** ✅ PASS

### TC-005: Register nama kosong
**Endpoint:** POST /api/auth/register
**Input:** `{ "email": "test4@example.com", "password": "Test1234", "name": "" }`
**Expected:** 400 `{ "error": "Nama tidak boleh kosong." }`
**Hasil:** ✅ PASS

### TC-006: Register email format tidak valid
**Endpoint:** POST /api/auth/register
**Input:** `{ "email": "bukan-email", "password": "Test1234", "name": "Test" }`
**Expected:** 400 `{ "error": "Format email tidak valid." }`
**Hasil:** ✅ PASS

### TC-007: Verifikasi email berhasil
**Endpoint:** GET /api/auth/verify-email?token={token_dari_db}
**Expected:** 200 `{ "message": "Email berhasil diverifikasi. Silakan login." }`
**Hasil:** ✅ PASS
**Catatan:** Ambil token dari field `emailVerifyToken` di database

### TC-008: Verifikasi email token tidak valid
**Endpoint:** GET /api/auth/verify-email?token=invalid-token
**Expected:** 400 `{ "error": "Token verifikasi tidak valid." }`
**Hasil:** ✅ PASS

### TC-009: Verifikasi email token expired
**Endpoint:** GET /api/auth/verify-email?token={expired_token}
**Expected:** 400 `{ "error": "Token verifikasi sudah kadaluarsa. Minta kirim ulang." }`
**Hasil:** ✅ PASS
**Catatan:** Set `emailVerifyExpiry` ke waktu lampau di DB untuk test

### TC-010: Kirim ulang verifikasi
**Endpoint:** POST /api/auth/resend-verify
**Input:** `{ "email": "test@example.com" }`
**Expected:** 200 `{ "message": "Email verifikasi dikirim ulang." }`
**Hasil:** ✅ PASS

### TC-011: Kirim ulang verifikasi — sudah verified
**Endpoint:** POST /api/auth/resend-verify
**Input:** `{ "email": "verified-user@example.com" }`
**Expected:** 400 `{ "error": "Email sudah diverifikasi." }`
**Hasil:** ✅ PASS

### TC-012: Kirim ulang verifikasi — rate limit
**Endpoint:** POST /api/auth/resend-verify (2x dalam 1 menit)
**Expected:** 429 `{ "error": "Tunggu 1 menit sebelum kirim ulang." }`
**Hasil:** ✅ PASS

---

## USER LOGIN

### TC-013: Login berhasil
**Endpoint:** POST /api/auth/login
**Input:** `{ "email": "test@example.com", "password": "Test1234" }`
**Expected:** 200 `{ "token": "...", "user": { "id": "...", "email": "...", "name": "...", "role": "customer" } }`
**Hasil:** ✅ PASS
**Catatan:** User harus sudah verified

### TC-014: Login email salah
**Endpoint:** POST /api/auth/login
**Input:** `{ "email": "tidak-ada@example.com", "password": "Test1234" }`
**Expected:** 401 `{ "error": "Email atau password salah." }`
**Hasil:** ✅ PASS

### TC-015: Login password salah
**Endpoint:** POST /api/auth/login
**Input:** `{ "email": "test@example.com", "password": "SalahPassword1" }`
**Expected:** 401 `{ "error": "Email atau password salah." }`
**Hasil:** ✅ PASS

### TC-016: Login belum verifikasi email
**Endpoint:** POST /api/auth/login
**Input:** `{ "email": "unverified@example.com", "password": "Test1234" }`
**Expected:** 401 `{ "error": "Email belum diverifikasi. Cek inbox atau minta kirim ulang." }`
**Hasil:** ✅ PASS

### TC-017: Login user Google (authProvider = google)
**Endpoint:** POST /api/auth/login
**Input:** `{ "email": "google-user@gmail.com", "password": "Test1234" }`
**Expected:** 401 `{ "error": "Email atau password salah." }`
**Hasil:** ✅ PASS
**Catatan:** Tidak bocorkan info bahwa akun ada tapi pakai Google

---

## FORGOT & RESET PASSWORD

### TC-018: Forgot password — email terdaftar
**Endpoint:** POST /api/auth/forgot-password
**Input:** `{ "email": "test@example.com" }`
**Expected:** 200 `{ "message": "Jika email terdaftar, link reset password akan dikirim." }`
**Hasil:** ✅ PASS
**Catatan:** Cek terminal untuk link reset (mode placeholder)

### TC-019: Forgot password — email tidak ada
**Endpoint:** POST /api/auth/forgot-password
**Input:** `{ "email": "tidak-ada@example.com" }`
**Expected:** 200 `{ "message": "Jika email terdaftar, link reset password akan dikirim." }`
**Hasil:** ✅ PASS
**Catatan:** Respons SAMA — mencegah user enumeration

### TC-020: Reset password berhasil
**Endpoint:** POST /api/auth/reset-password
**Input:** `{ "token": "{token_dari_db}", "newPassword": "NewPass123" }`
**Expected:** 200 `{ "message": "Password berhasil direset. Silakan login." }`
**Hasil:** ✅ PASS

### TC-021: Reset password — token tidak valid
**Endpoint:** POST /api/auth/reset-password
**Input:** `{ "token": "invalid-token", "newPassword": "NewPass123" }`
**Expected:** 400 `{ "error": "Token reset tidak valid." }`
**Hasil:** ✅ PASS

### TC-022: Reset password — token expired
**Endpoint:** POST /api/auth/reset-password
**Input:** `{ "token": "{expired_token}", "newPassword": "NewPass123" }`
**Expected:** 400 `{ "error": "Token reset sudah kadaluarsa. Minta link baru." }`
**Hasil:** ✅ PASS

### TC-023: Reset password — password baru lemah
**Endpoint:** POST /api/auth/reset-password
**Input:** `{ "token": "{valid_token}", "newPassword": "12345678" }`
**Expected:** 400 `{ "error": "Password harus mengandung minimal satu huruf dan satu angka." }`
**Hasil:** ✅ PASS

---

## ADMIN LOGIN

### TC-024: Admin login berhasil
**Endpoint:** POST /api/admin/auth/login
**Input:** `{ "email": "admin@eltopup.id", "password": "P@ssw0rd123" }`
**Expected:** 200 `{ "token": "...", "admin": { "id": "...", "email": "...", "name": "...", "role": "admin" } }`
**Hasil:** ✅ PASS
**Catatan:** Gunakan akun yang dibuat via createAdmin.ts

### TC-025: Admin login — bukan admin
**Endpoint:** POST /api/admin/auth/login
**Input:** `{ "email": "test@example.com", "password": "Test1234" }`
**Expected:** 401 `{ "error": "Email atau password salah." }`
**Hasil:** ✅ PASS
**Catatan:** Tidak bocorkan info bahwa akun ada tapi bukan admin

### TC-026: Admin login — password salah
**Endpoint:** POST /api/admin/auth/login
**Input:** `{ "email": "admin@eltopup.id", "password": "WrongPass123" }`
**Expected:** 401 `{ "error": "Email atau password salah." }`
**Hasil:** ✅ PASS

### TC-027: Admin login — email tidak terdaftar
**Endpoint:** POST /api/admin/auth/login
**Input:** `{ "email": "nobody@eltopup.id", "password": "Test1234" }`
**Expected:** 401 `{ "error": "Email atau password salah." }`
**Hasil:** ✅ PASS

---

## ADMIN CHANGE PASSWORD

### TC-028: Ubah password admin berhasil
**Endpoint:** POST /api/admin/auth/change-password
**Headers:** Authorization: Bearer {adminToken}
**Input:** `{ "currentPassword": "P@ssw0rd123", "newPassword": "NewAdmin456" }`
**Expected:** 200 `{ "message": "Password berhasil diubah." }`
**Hasil:** ✅ PASS

### TC-029: Ubah password — password lama salah
**Endpoint:** POST /api/admin/auth/change-password
**Headers:** Authorization: Bearer {adminToken}
**Input:** `{ "currentPassword": "WrongOld1", "newPassword": "NewAdmin456" }`
**Expected:** 401 `{ "error": "Password lama salah." }`
**Hasil:** ✅ PASS

### TC-030: Ubah password — password baru lemah
**Endpoint:** POST /api/admin/auth/change-password
**Headers:** Authorization: Bearer {adminToken}
**Input:** `{ "currentPassword": "P@ssw0rd123", "newPassword": "weak" }`
**Expected:** 400 `{ "error": "Password baru harus minimal 8 karakter, mengandung huruf dan angka." }`
**Hasil:** ✅ PASS

---

## JWT TERPISAH

### TC-031: User token tidak bisa akses admin route
**Endpoint:** GET /api/admin/dashboard
**Headers:** Authorization: Bearer {userToken}
**Expected:** 403 `{ "error": "Token admin tidak valid atau sudah kadaluarsa." }`
**Hasil:** ✅ PASS
**Catatan:** User JWT dan Admin JWT menggunakan secret berbeda

### TC-032: Admin token tidak bisa akses user route
**Endpoint:** GET /api/orders
**Headers:** Authorization: Bearer {adminToken}
**Expected:** 403 `{ "error": "Forbidden: Invalid or expired token" }`
**Hasil:** ✅ PASS

### TC-033: Tanpa token — user route
**Endpoint:** GET /api/orders
**Expected:** 401 `{ "error": "Unauthorized: No token provided" }`
**Hasil:** ✅ PASS

### TC-034: Tanpa token — admin route
**Endpoint:** GET /api/admin/dashboard
**Expected:** 401 `{ "error": "Unauthorized: No token provided" }`
**Hasil:** ✅ PASS

---

## GOOGLE OAUTH (BACKWARD COMPAT)

### TC-035: Google OAuth masih berfungsi
**Endpoint:** GET /api/auth/google
**Expected:** Redirect ke Google consent screen
**Hasil:** ✅ PASS

### TC-036: Google OAuth callback menghasilkan user JWT
**Expected:** Redirect ke frontend dengan ?token=... (user JWT, bukan admin JWT)
**Hasil:** ✅ PASS

### TC-037: User Google bisa akses /api/auth/me
**Headers:** Authorization: Bearer {googleUserToken}
**Expected:** 200 `{ "id": "...", "email": "...", "name": "...", "role": "customer" }`
**Hasil:** ✅ PASS

---

## ADMIN UI

### TC-038: Admin login page muncul
**URL:** /admin-ui/login.html
**Expected:** Form login dengan email dan password
**Hasil:** ✅ PASS

### TC-039: Login berhasil redirect ke dashboard
**Action:** Isi form login admin, klik Login
**Expected:** Redirect ke /admin-ui/dashboard.html
**Hasil:** ✅ PASS
**Catatan:** Token disimpan sebagai "adminToken" di localStorage

### TC-040: Dashboard menolak tanpa adminToken
**Action:** Hapus adminToken dari localStorage, akses /admin-ui/dashboard.html
**Expected:** Redirect ke /admin-ui/login.html
**Hasil:** ✅ PASS

### TC-041: Logout dari admin UI
**Action:** Klik tombol Logout di dashboard
**Expected:** adminToken dihapus, redirect ke login
**Hasil:** ✅ PASS

### TC-042: Forgot password page
**URL:** /admin-ui/forgot-password.html
**Expected:** Form input email, tampilkan pesan setelah submit
**Hasil:** ✅ PASS

---

## CREATE ADMIN SCRIPT

### TC-043: Buat admin baru via CLI
**Command:** `npx ts-node src/scripts/createAdmin.ts admin@eltopup.id P@ssw0rd123 "Admin El TopUp"`
**Expected:** Output sukses dengan ID, email, name, role
**Hasil:** ✅ PASS

### TC-044: Update admin existing via CLI
**Command:** `npx ts-node src/scripts/createAdmin.ts admin@eltopup.id NewPass456 "Updated Admin"`
**Expected:** User di-update, bukan error duplicate
**Hasil:** ✅ PASS

### TC-045: Validasi input CLI — password lemah
**Command:** `npx ts-node src/scripts/createAdmin.ts admin@eltopup.id weak "Admin"`
**Expected:** Error: "Password harus minimal 8 karakter, mengandung huruf dan angka."
**Hasil:** ✅ PASS

---

## SYSTEM LOG

### TC-046: Login admin sukses di-log
**Action:** Login admin, cek SystemLog
**Expected:** Ada record serviceName="AUTH" eventType="ADMIN_LOGIN_SUCCESS"
**Hasil:** ✅ PASS

### TC-047: Login admin gagal di-log
**Action:** Login admin dengan password salah, cek SystemLog
**Expected:** Ada record serviceName="AUTH" eventType="ADMIN_LOGIN_FAILED"
**Hasil:** ✅ PASS

### TC-048: Email placeholder di-log
**Action:** Register user baru, cek SystemLog
**Expected:** Ada record serviceName="EMAIL" eventType="SEND_VERIFICATION" status="PLACEHOLDER"
**Hasil:** ✅ PASS
