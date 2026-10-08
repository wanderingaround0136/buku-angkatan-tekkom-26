# API Contracts & Specification

Dokumen API Contracts untuk backend **Web Buku Angkatan**. 

---

## 1. Global JSON Response Format

Seluruh API response menggunakan struktur standar berikut:

### Success Response Format
```json
{
  "success": true,
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 120,
    "total_pages": 6
  }
}
```
*(Catatan: Object `meta` bersifat opsional, hanya muncul pada endpoint berkoleksi/paginated)*

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Validation failed",
    "details": [
      {
        "field": "whatsapp_number",
        "message": "Invalid WhatsApp number format. Must start with 628"
      }
    ]
  }
}
```

---

## 2. API Endpoints

### A. Public Endpoints (Data Mahasiswa & Kelas)

#### 1. `GET /api/students`
Mengambil daftar mahasiswa angkatan dengan pagination, filter kelas, dan pencarian nama/NIM.

- **Query Parameters**:
  - `page` (optional, default: `1`): Nomor halaman.
  - `limit` (optional, default: `20`): Jumlah data per halaman.
  - `class` (optional): Filter kelas (`A`, `B`, `C`, `D`).
  - `search` (optional): Keyword pencarian nama lengkap, nama panggilan, atau NIM.

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
      "profile": {
        "formal_photo_url": "https://cdn.bukuangkatan.com/formal/21000123.jpg",
        "quote": "Belajar terus sampai faham.",
        "hobbies": ["Coding", "Fotografi"]
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 120,
    "total_pages": 6
  }
}
```

---

#### 2. `GET /api/students/:nim`
Mengambil detail profil lengkap mahasiswa berdasarkan NIM.

- **Path Parameters**:
  - `nim`: String (Contoh: `21000123`)

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
    "contact": {
      "whatsapp_number": "6281234567890",
      "instagram_handle": "ahmadbekti",
      "boarding_address": "Jl. Telekomunikasi No. 1, Bojongsoang, Bandung"
    },
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

- **Response `404 Not Found`**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Student with NIM 21000123 was not found"
  }
}
```

---

#### 3. `GET /api/classes`
Mengambil rekapitulasi daftar kelas angkatan beserta total mahasiswa.

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

### B. Storage & Upload Endpoints

#### `POST /api/upload`
Membuat Presigned PUT URL Cloudflare R2 untuk upload foto mahasiswa secara langsung dari client.

- **Request Body**:
```json
{
  "filename": "21000123-formal.jpg",
  "file_type": "image/jpeg",
  "folder": "formal"
}
```

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

---

## 3. Privacy & Restricted Data Policy

🔒 **STRICT GUARANTEE**:
Seluruh endpoint publik di atas (`GET /api/students`, `GET /api/students/:nim`, `GET /api/classes`) **SAMA SEKALI TIDAK TEREKSPOS** dan **EKSPLISIT MEMBUANG** field data sensitif/darurat dari tabel `student_emergencies`:
- `parent_whatsapp` (Nomor WA Orang Tua)
- `landlord_whatsapp` (Nomor WA Ibu/Bapak Kost)

Data privat hanya dapat diakses melalui internal script seeder atau endpoint internal terproteksi khusus role Admin dengan otentikasi Supabase.
