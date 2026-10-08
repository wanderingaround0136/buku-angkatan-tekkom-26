# API Contracts & Specification

Dokumen API Contracts untuk backend **Web Buku Angkatan**.

---

## 1. Access Level Legend

| Simbol | Level | Deskripsi |
| :---: | :--- | :--- |
| 🔓 | **Public** | Tanpa autentikasi (`guest`) |
| 🔐 | **Protected** | Butuh Angkatan Passcode (`role = student` atau `admin`) |
| 🛡️ | **Admin Only** | Butuh sesi admin (whitelist email + OTP) |

Hierarki: `guest < student < admin`. Admin otomatis lolos guard 🔐.

**Status code guard:**
- `401 Unauthorized` — belum terautentikasi / sesi dicabut (epoch mismatch).
- `403 Forbidden` — terautentikasi tapi role kurang.
- `429 Too Many Requests` — rate limit.

---

## 2. Global JSON Response Format

### Success Response
```json
{
  "success": true,
  "data": {},
  "meta": { "page": 1, "limit": 20, "total": 120, "total_pages": 6 }
}
```
*(`meta` opsional, hanya pada endpoint koleksi/paginated)*

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Validation failed",
    "details": [
      { "field": "whatsapp_number", "message": "Invalid WhatsApp number format. Must start with 628" }
    ]
  }
}
```

### Guard Error Responses
```json
// 401 — passcode belum dimasukkan / sesi kedaluwarsa / dicabut
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "Angkatan passcode required" } }

// 403 — role kurang (student akses admin-only)
{ "success": false, "error": { "code": "FORBIDDEN", "message": "Admin access required" } }
```

---

## 3. Auth Endpoints

### 3.1 Student — Angkatan Passcode

#### 🔓 `POST /api/auth/passcode`
Verifikasi Angkatan Passcode, set cookie `angkatan_session` (JWT HttpOnly).

- **Request Body**: `{ "passcode": "angkatan2022secret" }`
- **Response `200 OK`**:
```json
{ "success": true, "data": { "role": "student", "expires_in": 604800 } }
```
- **Response `401 Unauthorized`**:
```json
{ "success": false, "error": { "code": "INVALID_PASSCODE", "message": "Passcode salah" } }
```
- **Response `429 Too Many Requests`** (5x / 15 menit / IP):
```json
{ "success": false, "error": { "code": "RATE_LIMITED", "message": "Terlalu banyak percobaan, coba lagi nanti" } }
```
> Set-Cookie: `angkatan_session=<jwt>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`
> Audit: `PASSCODE_FAIL` saat gagal.

#### 🔓 `DELETE /api/auth/passcode`
Logout student — clear cookie `angkatan_session`.

- **Response `200 OK`**: `{ "success": true, "data": { "message": "Logged out" } }`

### 3.2 Admin — Whitelist Email + OTP

#### 🔓 `POST /api/auth/admin/request-otp`
Kirim OTP 6 digit ke email admin (harus terdaftar di `admin_whitelist`).

- **Request Body**: `{ "email": "pengurus@gmail.com" }`
- **Response `200 OK`** (SELALU 200 generik — anti email-enumeration, baik email terdaftar maupun tidak):
```json
{ "success": true, "data": { "message": "Jika email terdaftar, kode OTP telah dikirim." } }
```
- **Response `429 Too Many Requests`**:
```json
{ "success": false, "error": { "code": "RATE_LIMITED", "message": "Terlalu banyak permintaan OTP" } }
```
> OTP: 6 digit, expiry 5 menit, single-use. Dikirim via Resend.

#### 🔓 `POST /api/auth/admin/verify-otp`
Verifikasi OTP dan set cookie `admin_session` (JWT HttpOnly).

- **Request Body**: `{ "email": "pengurus@gmail.com", "otp": "123456" }`
- **Response `200 OK`**:
```json
{ "success": true, "data": { "role": "admin", "email": "pengurus@gmail.com" } }
```
- **Response `401 Unauthorized`**:
```json
{ "success": false, "error": { "code": "INVALID_OTP", "message": "OTP salah atau kedaluwarsa" } }
```
> Set-Cookie: `admin_session=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`
> Audit: `ADMIN_LOGIN` (sukses) / `ADMIN_LOGIN_FAIL` (gagal).

#### 🔓 `POST /api/auth/admin/logout`
Logout admin — clear cookie `admin_session` (aman dipanggil tanpa sesi aktif).

#### 🔓 `GET /api/auth/session`
Status sesi aktif (untuk UI). Sesi dengan `epoch` lama dianggap invalid.

- **Response `200 OK`**:
```json
{ "success": true, "data": { "role": "guest" } }
{ "success": true, "data": { "role": "student" } }
{ "success": true, "data": { "role": "admin", "email": "pengurus@gmail.com" } }
```

---

## 4. Public Endpoints (Landing Page)

#### 🔓 `GET /api/public/stats`
Statistik agregat angkatan. **Tanpa data personal.**

- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "total_students": 122,
    "total_classes": 4,
    "hero_title": "Buku Angkatan 2022",
    "hero_subtitle": "Kenalan lebih dekat dengan angkatan kita."
  }
}
```

#### 🔓 `GET /api/classes`
Rekapitulasi jumlah mahasiswa per kelas.

- **Response `200 OK`**:
```json
{
  "success": true,
  "data": [
    { "class_name": "A", "total_students": 32 },
    { "class_name": "B", "total_students": 30 },
    { "class_name": "C", "total_students": 29 },
    { "class_name": "D", "total_students": 31 }
  ]
}
```

---

## 5. Protected Endpoints (Angkatan Passcode)

#### 🔐 `GET /api/students`
Direktori mahasiswa dengan pagination, filter kelas, dan pencarian.

- **Query Parameters**: `page` (default 1), `limit` (default 20), `class` (`A|B|C|D`), `search` (nama/NIM)
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": [
    {
      "id": "c7b8e1a0-4f2b-4d3a-8f1e-9a0b1c2d3e4f",
      "nim": "21000123",
      "full_name": "Ahmad Subekti",
      "nickname": "Bekti",
      "class_name": "A",
      "origin_city": "Semarang",
      "instagram_handle": "ahmadbekti",
      "profile": {
        "formal_photo_url": "https://cdn.bukuangkatan.com/formal/21000123.jpg",
        "quote": "Belajar terus sampai faham.",
        "hobbies": ["Coding", "Fotografi"]
      }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 122, "total_pages": 7 }
}
```

#### 🔐 `GET /api/students/:nim`
Detail profil mahasiswa (data untuk `student` — **tanpa WA pribadi & alamat kost**).

- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "id": "c7b8e1a0-4f2b-4d3a-8f1e-9a0b1c2d3e4f",
    "nim": "21000123",
    "full_name": "Ahmad Subekti",
    "nickname": "Bekti",
    "class_name": "A",
    "religion": "ISLAM",
    "birth_place": "Semarang",
    "birth_date": "2002-08-17",
    "origin_city": "Semarang",
    "instagram_handle": "ahmadbekti",
    "profile": {
      "hobbies": ["Coding", "Fotografi", "Basket"],
      "quote": "Belajar terus sampai faham.",
      "favorite_food_place": "Warung Bu Siti Bojongsoang",
      "spotify_track_url": "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
      "formal_photo_url": "https://cdn.bukuangkatan.com/formal/21000123.jpg",
      "informal_photo_url": "https://cdn.bukuangkatan.com/informal/21000123.jpg"
    }
  }
}
```
> ⚠️ **Tidak ada** `whatsapp_number` dan `boarding_address` — keduanya admin-only.

- **Response `404 Not Found`**:
```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Student with NIM 21000123 was not found" } }
```

#### 🔐 `GET /api/gallery`
Galeri foto seluruh angkatan (formal & non-formal).

- **Query Parameters**: `page`, `limit`, `class` (opsional)
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": [
    {
      "nim": "21000123",
      "full_name": "Ahmad Subekti",
      "formal_photo_url": "https://cdn.bukuangkatan.com/formal/21000123.jpg",
      "informal_photo_url": "https://cdn.bukuangkatan.com/informal/21000123.jpg"
    }
  ],
  "meta": { "page": 1, "limit": 24, "total": 122, "total_pages": 6 }
}
```

---

## 6. Admin Endpoints (Restricted)

> Semua endpoint 🛡️ memerlukan sesi `admin_session` yang valid (JWT + epoch cocok). **Semua mutasi data & upload hanya admin.**

#### 🛡️ `POST /api/upload`
Presigned PUT URL Cloudflare R2 (upload/ganti foto).

- **Request Body**: `{ "filename": "21000123-formal.jpg", "file_type": "image/jpeg", "folder": "formal" }`
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "upload_url": "https://<account_id>.r2.cloudflarestorage.com/buku-angkatan-assets/formal/21000123-formal.jpg?X-Amz-Algorithm=...",
    "public_url": "https://cdn.bukuangkatan.com/formal/21000123-formal.jpg",
    "key": "formal/21000123-formal.jpg"
  }
}
```
> Presigned URL expired dalam 5 menit.

#### 🛡️ `GET /api/admin/emergencies`
Data darurat (kontak ortu & ibu/bapak kost). **Satu-satunya endpoint yang mengembalikan `student_emergencies`.**

- **Query Parameters**: `page`, `limit`, `class`, `search`
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": [
    {
      "nim": "21000123",
      "full_name": "Ahmad Subekti",
      "parent_whatsapp": "6281200000001",
      "landlord_whatsapp": "6281200000002"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 122, "total_pages": 7 }
}
```
> Audit: `READ_EMERGENCIES` dicatat tiap akses.

#### 🛡️ `GET /api/admin/students` · `POST /api/admin/students`
Kelola data siswa (list lengkap termasuk WA pribadi & alamat kost, serta create).

#### 🛡️ `GET /api/admin/students/:nim` · `PATCH` · `DELETE`
Detail/edit/hapus data siswa (full field, termasuk kontak pribadi). Audit: `MUTATE_STUDENT`.

#### 🛡️ `PATCH /api/admin/config`
Ganti Angkatan Passcode dan/atau increment `auth_epoch`.

- **Request Body**:
```json
{ "key": "angkatan_passcode", "new_passcode": "newSecret2024" }
```
- **Response `200 OK`**:
```json
{ "success": true, "data": { "updated_at": "2024-06-01T10:00:00Z", "epoch": 6 } }
```
> Ganti passcode otomatis menaikkan `auth_epoch` → seluruh sesi student lama langsung mati.
> Audit: `ROTATE_PASSCODE`.

#### 🛡️ `GET /api/admin/audit-logs`
Jejak audit (pagination + filter `action`, `actor_email`, rentang tanggal).

- **Response `200 OK`**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "actor_email": "pengurus@gmail.com",
      "actor_role": "admin",
      "action": "READ_EMERGENCIES",
      "target": null,
      "ip": "103.x.x.x",
      "created_at": "2024-06-01T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 50, "total": 320, "total_pages": 7 }
}
```

#### 🛡️ `GET /api/admin/export`
Ekspor seluruh data (termasuk kontak darurat) ke CSV/XLSX.

---

## 7. Privacy & Restricted Data Policy

🔒 **STRICT GUARANTEE**:

1. Tabel `student_emergencies` (`parent_whatsapp`, `landlord_whatsapp`) **HANYA** dapat diakses via `GET /api/admin/emergencies` dan `GET /api/admin/export` — keduanya ber-guard 🛡️ Admin Only.

2. Field **No WhatsApp Pribadi** (`student_contacts.whatsapp_number`) dan **Alamat Kost** (`student_contacts.boarding_address`) **tidak pernah** muncul di endpoint 🔓 Public maupun 🔐 Protected. Hanya endpoint 🛡️ Admin yang mengembalikannya.

3. Endpoint 🔓 Public (`GET /api/public/stats`, `GET /api/classes`) hanya mengembalikan **data agregat** — tanpa identitas personal.

4. Angkatan Passcode disimpan sebagai **bcrypt hash** di `app_config`; OTP admin disimpan sebagai **hash** di `admin_otp`. Keduanya tidak pernah plaintext dan tidak pernah dikirim ke client.

5. Seluruh akses data sensitif dicatat di `audit_logs`.
