# Backend Architecture & Systems Design

Document Source of Truth arsitektur backend **Web Buku Angkatan**.

---

## 1. Tech Stack Overview

| Layer | Technology | Infrastructure / Free Tier Provider |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router) | Netlify Serverless Functions |
| **Language** | TypeScript | Node.js Runtime |
| **Database** | PostgreSQL | Supabase (Free Tier) |
| **ORM** | Drizzle ORM + Drizzle Kit | Type-safe Query Builder & Migration Engine |
| **Package Manager** | pnpm | — |
| **Object Storage** | S3-Compatible Storage | Cloudflare R2 (Free Tier) |
| **S3 SDK** | `@aws-sdk/client-s3` | Presigned URL Upload & S3 Commands |
| **Email (OTP)** | Resend | Transactional Email Service |
| **Auth Token** | `jose` (JWT, HS256) | Custom session untuk student & admin |
| **Validation** | Zod | Runtime Schema Validation & Sanitization |

> **Catatan arsitektur**: Aplikasi **tidak** memakai Supabase Auth. Semua autentikasi (student passcode & admin OTP) dikelola aplikasi sendiri menggunakan JWT (`jose`) yang disimpan di HttpOnly cookie. Backend mengakses Supabase PostgreSQL via koneksi Postgres langsung (Drizzle + driver `postgres`).

---

## 2. Database Schema & ERD

### Entity Relationship Diagram (Mermaid)

```mermaid
erDiagram
    STUDENTS ||--|| STUDENT_CONTACTS : "has"
    STUDENTS ||--|| STUDENT_PROFILES : "has"
    STUDENTS ||--|| STUDENT_EMERGENCIES : "has (RESTRICTED)"

    STUDENTS {
        uuid id PK
        string nim "Unique, Indexed"
        string full_name
        string nickname
        enum class_name "A, B, C, D"
        enum religion
        string birth_place
        date birth_date
        string origin_city
        datetime created_at
        datetime updated_at
    }

    STUDENT_CONTACTS {
        uuid id PK
        uuid student_id FK "Unique"
        string whatsapp_number "ADMIN ONLY"
        string instagram_handle
        text boarding_address "ADMIN ONLY"
    }

    STUDENT_PROFILES {
        uuid id PK
        uuid student_id FK "Unique"
        text_array hobbies
        text quote
        string favorite_food_place
        string spotify_track_url
        string formal_photo_url
        string informal_photo_url
    }

    STUDENT_EMERGENCIES {
        uuid id PK
        uuid student_id FK "Unique"
        string parent_whatsapp "ADMIN ONLY"
        string landlord_whatsapp "ADMIN ONLY"
        datetime created_at
        datetime updated_at
    }

    APP_CONFIG {
        uuid id PK
        string key "Unique"
        text value
        text description
        string updated_by "email admin"
        datetime updated_at
    }

    ADMIN_WHITELIST {
        uuid id PK
        string email "Unique, lowercase"
        string display_name
        boolean is_active
        string added_by "email admin"
        datetime created_at
        datetime updated_at
    }

    ADMIN_OTP {
        uuid id PK
        string email "Indexed"
        text otp_hash
        int attempts
        datetime expires_at
        datetime used_at
        string ip
        datetime created_at
    }

    AUDIT_LOGS {
        uuid id PK
        string actor_email
        string actor_role
        string action "Indexed"
        string target
        jsonb metadata
        string ip
        text user_agent
        datetime created_at
    }
```

### Table Definitions & Enums

#### Enums
- `ClassEnum`: `A`, `B`, `C`, `D`
- `ReligionEnum`: `ISLAM`, `PROTESTANT`, `CATHOLIC`, `HINDU`, `BUDDHA`, `KHONGHUCU`, `OTHER`

> Tidak ada `RoleEnum` di DB — role adalah konsep aplikasi (`guest` / `student` / `admin`), bukan nilai tersimpan. Admin diidentifikasi dari `admin_whitelist.email`.

#### Data Dictionary

1. **`students`** (Data Resmi Utama)
   - `id`: `UUID` (PK, default `gen_random_uuid()`)
   - `nim`: `VARCHAR(20)` (UNIQUE, INDEXED)
   - `full_name`: `VARCHAR(100)`
   - `nickname`: `VARCHAR(50)`
   - `class_name`: `ClassEnum` (INDEXED)
   - `religion`: `ReligionEnum`
   - `birth_place`: `VARCHAR(100)`
   - `birth_date`: `DATE`
   - `origin_city`: `VARCHAR(100)`
   - `created_at`: `TIMESTAMPTZ` (default `now()`)
   - `updated_at`: `TIMESTAMPTZ` (default `now()`)

2. **`student_contacts`** (Kontak — sebagian Admin Only)
   - `id`: `UUID` (PK)
   - `student_id`: `UUID` (FK -> `students.id`, UNIQUE)
   - `whatsapp_number`: `VARCHAR(20)` — 🔒 **admin only**
   - `instagram_handle`: `VARCHAR(50)` — student ✅
   - `boarding_address`: `TEXT` — 🔒 **admin only**

3. **`student_profiles`** (Public Content / Vibes)
   - `id`: `UUID` (PK)
   - `student_id`: `UUID` (FK -> `students.id`, UNIQUE)
   - `hobbies`: `TEXT[]` / `JSONB`
   - `quote`: `TEXT`
   - `favorite_food_place`: `TEXT`
   - `spotify_track_url`: `TEXT`
   - `formal_photo_url`: `TEXT` (Foto KTM background merah)
   - `informal_photo_url`: `TEXT`

4. **`student_emergencies`** (Data Privat / Emergency - STRICT RESTRICTED)
   - `id`: `UUID` (PK)
   - `student_id`: `UUID` (FK -> `students.id`, UNIQUE)
   - `parent_whatsapp`: `VARCHAR(20)` — 🔒 admin only
   - `landlord_whatsapp`: `VARCHAR(20)` — 🔒 admin only
   - `created_at`: `TIMESTAMPTZ` (default `now()`)
   - `updated_at`: `TIMESTAMPTZ` (default `now()`)

5. **`app_config`** (Konfigurasi Aplikasi - Admin Only)
   - `id`: `UUID` (PK)
   - `key`: `VARCHAR(100)` (UNIQUE) — key yang dipakai:
     - `angkatan_passcode` → `value` = bcrypt hash passcode angkatan
     - `auth_epoch` → `value` = integer (string), di-increment untuk mencabut semua sesi
   - `value`: `TEXT`
   - `description`: `TEXT`
   - `updated_by`: `VARCHAR(255)` — email admin yang terakhir mengubah (audit)
   - `updated_at`: `TIMESTAMPTZ` (default `now()`)

6. **`admin_whitelist`** (Daftar Email Admin - dikelola langsung via DB Supabase)
   - `id`: `UUID` (PK)
   - `email`: `VARCHAR(255)` (UNIQUE, lowercase) — **whitelist per email individu**, bukan domain
   - `display_name`: `VARCHAR(100)`
   - `is_active`: `BOOLEAN` (default `true`) — nonaktifkan tanpa hapus
   - `added_by`: `VARCHAR(255)` — email admin yang menambahkan (audit)
   - `created_at`, `updated_at`: `TIMESTAMPTZ`

7. **`admin_otp`** (One-Time Password Admin - sementara)
   - `id`: `UUID` (PK)
   - `email`: `VARCHAR(255)` (INDEXED)
   - `otp_hash`: `TEXT` — hash OTP (bcrypt/scrypt), **tidak pernah plaintext**
   - `attempts`: `INTEGER` (default `0`) — max 5 percobaan
   - `expires_at`: `TIMESTAMPTZ` — ~5 menit setelah dibuat
   - `used_at`: `TIMESTAMPTZ` — single-use; non-null = sudah terpakai
   - `ip`: `VARCHAR(64)`
   - `created_at`: `TIMESTAMPTZ`

8. **`audit_logs`** (Jejak Audit - append only)
   - `id`: `UUID` (PK)
   - `actor_email`: `VARCHAR(255)` — email admin (dari whitelist/JWT), `NULL` untuk aksi anonim
   - `actor_role`: `VARCHAR(20)` — `admin` / `student` / `guest`
   - `action`: `VARCHAR(64)` (INDEXED) — lihat daftar di Section 9
   - `target`: `VARCHAR(255)` — mis. NIM / config key
   - `metadata`: `JSONB`
   - `ip`: `VARCHAR(64)`
   - `user_agent`: `TEXT`
   - `created_at`: `TIMESTAMPTZ` (default `now()`)

### Field Visibility Matrix (per Role)

| Field | guest | student | admin |
| :--- | :---: | :---: | :---: |
| Nama Lengkap, NIM, Kelas, Kota Asal | ❌ | ✅ | ✅ |
| Hobi, Quotes, Tempat Makan, Spotify | ❌ | ✅ | ✅ |
| Foto Formal & Non-Formal | ❌ | ✅ | ✅ |
| Username Instagram | ❌ | ✅ | ✅ |
| **No WhatsApp Pribadi** | ❌ | ❌ | ✅ |
| **Alamat Kost** | ❌ | ❌ | ✅ |
| **Kontak Darurat (ortu/kost)** | ❌ | ❌ | ✅ |

> **Catatan**: Landing Page (`/`) hanya menampilkan **statistik agregat** (jumlah siswa per kelas, total angkatan) — tanpa data personal apa pun. Seluruh data personal hanya terlihat setelah lolos Angkatan Passcode, dan field WA pribadi + alamat kost hanya untuk admin.

---

## 3. Database Connection & Supabase RLS Security

### Connection Pooling (Supabase)
Supabase menyediakan 2 mode URL koneksi:
- `DATABASE_URL`: Transaction Mode Pooler (Port `6543`) — Digunakan oleh App Runtime / Serverless API Next.js.
- `DIRECT_URL`: Direct Connection (Port `5432`) — Digunakan oleh Drizzle Kit untuk `db push` / `migrate`.

### Row Level Security (RLS) — Defense-in-Depth

Karena aplikasi **tidak** memakai Supabase Auth, penegakan akses utama ada di **layer aplikasi** (middleware + guards + query scoping via Drizzle). RLS di sini berperan sebagai **lapis pertahanan terakhir** untuk mencegah **akses langsung** ke DB (mis. bila seseorang mendapat koneksi Postgres atau anon key).

**Prinsip**: Aplikasi hanya mengakses DB via koneksi server-side (Postgres direct). RLS dikonfigurasi untuk **menolak seluruh akses dari role `anon` dan `authenticated`**, sehingga tabel hanya bisa diakses oleh koneksi privileged (role `postgres` / service role) yang dipakai backend.

**Spesifikasi kebijakan RLS (high-level):**

1. **Aktifkan RLS** pada seluruh tabel aplikasi: `students`, `student_contacts`, `student_profiles`, `student_emergencies`, `app_config`, `admin_whitelist`, `admin_otp`, `audit_logs`.
2. **Tidak membuat policy apa pun** untuk role `anon` / `authenticated`. Dengan RLS aktif tanpa policy, **semua akses dari kedua role tersebut otomatis ditolak** (deny-by-default).
3. **Cabut (revoke) hak akses tabel** di schema `public` dari role `anon` dan `authenticated` sebagai lapis tambahan (opsional, paling ketat).
4. Backend tetap dapat membaca/menulis karena memakai koneksi Postgres privileged yang **melewati RLS**.

> **Konsekuensi penting**: Karena RLS di-bypass oleh koneksi backend, maka **satu-satunya penegak** pembatasan akses adalah kode aplikasi. Semua endpoint wajib melewati guard (`requireStudent` / `requireAdmin`) dan query WAJIB memilih kolom secara eksplisit (tidak boleh `SELECT *` pada `student_contacts`/`student_emergencies` untuk endpoint non-admin). Lihat Section 7.

---

## 4. Cloudflare R2 Storage & Upload Flow

### Architecture Flow Diagram (Presigned URL)

```
[ Frontend / App ] -------- 1. POST /api/upload --------> [ Next.js API Route ]
                                                                 | (ADMIN ONLY)
                                                          2. Generate S3
                                                          Presigned PUT URL
                                                                 |
[ Frontend / App ] <------- 3. Return Presigned URL <-----------+
        |
        +------------------ 4. PUT direct file binary ---------> [ Cloudflare R2 Bucket ]
                                                                 |
                                                          5. Accessible via
                                                          R2 Public Custom Domain
```

> **Semua aksi upload & ganti image hanya untuk admin** (guard 🛡️). Student tidak pernah mendapat presigned URL.

### Alur Logika Storage Helper (pseudocode)

- **Inisialisasi R2 client**: S3 client dengan `region = auto`, endpoint `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`, dan kredensial dari env (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`).
- **`generateUploadUrl(key, contentType)`**:
  1. Buat perintah upload object (PUT) ke bucket `R2_BUCKET_NAME` dengan `key` dan `contentType` yang diminta.
  2. Tanda-tangani perintah tersebut menjadi **presigned URL** dengan masa berlaku **5 menit**.
  3. Bentuk `publicUrl` = `<R2_PUBLIC_DOMAIN>/<key>`.
  4. Kembalikan `{ uploadUrl, publicUrl, key }`.
- Presigned URL hanya boleh dibuat setelah request melewati guard admin.

---

## 5. Validation Layer Specification

Semua input (API handler & seeder) divalidasi dengan Zod. Lokasi file: `lib/validations/student.ts` (+ `auth.ts`).

### 5.1 Sanitizer Helpers

| Helper | Aturan |
| :--- | :--- |
| `sanitizeWhatsApp` | Buang karakter non-digit; normalisasi awalan `08…` / `+628…` / `8…` → `628…`. Hasil harus cocok `^628\d{8,12}$` |
| `sanitizeInstagram` | Trim; buang prefix URL `instagram.com/`; buang `@` di awal; buang trailing `/` |
| `parseBirthDate` | Terima `DD/MM/YYYY`, `YYYY-MM-DD`, atau format teks → normalisasi ke ISO Date |

### 5.2 Skema Validasi

| Skema | Field & Aturan |
| :--- | :--- |
| `studentBaseSchema` | `nim` (5–20 char), `full_name` (2–100), `nickname` (1–50), `class_name` (enum A–D), `religion` (enum), `birth_place` (≥2), `birth_date` (date), `origin_city` (≥2) |
| `studentContactSchema` | `whatsapp_number` (sanitize → regex `628`), `instagram_handle` (sanitize), `boarding_address` (≥5) |
| `studentProfileSchema` | `hobbies` (array string), `quote` (≤500), `favorite_food_place` (≤200), `spotify_track_url` (URL atau kosong), `formal_photo_url` (URL), `informal_photo_url` (URL) |
| `studentEmergencySchema` | `parent_whatsapp` (sanitize → regex `628`), `landlord_whatsapp` (sanitize → regex `628` atau kosong) |
| `passcodeSchema` | `passcode` (≥1) |
| `adminEmailSchema` | `email` (format email, di-lowercase) |
| `verifyOtpSchema` | `email` (format email, lowercase), `otp` (6 digit numerik) |
| `paginationSchema` | `page` (≥1, default 1), `limit` (1–100, default 20), filter/sort opsional |

---

## 6. Deployment & Netlify Environment Config

### Netlify Configuration (deskripsi)

File `netlify.toml` di root project menetapkan:

| Setting | Nilai |
| :--- | :--- |
| Build command | `pnpm build` |
| Publish directory | `.next` |
| Plugin | `@netlify/plugin-nextjs` (adapter Next.js App Router → serverless) |
| Node version | `20` (via `build.environment`) |

> Detail konfigurasi lengkap akan ditulis saat implementasi; dokumen ini hanya menetapkan nilai kontraknya.

### Mandatory Environment Variables

Set variables in **Netlify Dashboard -> Site Settings -> Environment Variables**:

| Variable | Example / Description |
| :--- | :--- |
| `DATABASE_URL` | `postgres://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | `postgres://postgres.[ref]:[pass]@aws-0-[region].supabase.com:5432/postgres` |
| `AUTH_JWT_SECRET` | Random 32+ char secret untuk menandatangani JWT student & admin (`jose`, HS256) |
| `RESEND_API_KEY` | `re_...` — API key Resend untuk kirim OTP admin |
| `RESEND_FROM_EMAIL` | `no-reply@bukuangkatan.com` (domain terverifikasi di Resend) |
| `ADMIN_OTP_PEPPER` | (opsional) pepper tambahan untuk hashing OTP |
| `R2_ACCOUNT_ID` | Cloudflare Account ID |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 API Token Access Key |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 API Token Secret Key |
| `R2_BUCKET_NAME` | `buku-angkatan-assets` |
| `R2_PUBLIC_DOMAIN` | `https://cdn.bukuangkatan.com` |

> **Catatan**: 
> - Tidak ada `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — Supabase Auth tidak dipakai. Backend cukup memakai koneksi Postgres.
> - Passcode angkatan & `auth_epoch` **tidak** di env, melainkan di tabel `app_config`, agar bisa diubah tanpa redeploy.

---

## 7. Application Access Control (RBAC)

### Model 3 Role

| Role | Mekanisme Autentikasi | Cakupan Akses |
| :--- | :--- | :--- |
| `guest` | Tanpa auth | Hanya Landing Page (`/`) |
| `student` | Angkatan Passcode → JWT HttpOnly cookie | Directory, Galeri, Detail Profil |
| `admin` | Whitelist email + OTP (Resend) → JWT HttpOnly cookie | Admin Dashboard + seluruh data termasuk `student_emergencies` |

Hierarki: `guest < student < admin`. Admin **secara implisit lolos** semua guard `student`.

### Route Access Matrix

| Route (UI) | guest | student | admin |
| :--- | :---: | :---: | :---: |
| `/` Landing Page | ✅ | ✅ | ✅ |
| `/unlock` (form passcode) | ✅ | — | — |
| `/students/[nim]` Detail Profil | ❌ | ✅ | ✅ |
| `/directory` Direktori Angkatan | ❌ | ✅ | ✅ |
| `/gallery` Galeri Foto | ❌ | ✅ | ✅ |
| `/admin/login` (form email OTP) | ✅ | ✅ | — |
| `/admin/*` Dashboard | ❌ | ❌ | ✅ |

### Endpoint Access Matrix

| Endpoint | guest | student | admin |
| :--- | :---: | :---: | :---: |
| `POST /api/auth/passcode` | ✅ | — | — |
| `DELETE /api/auth/passcode` | ✅ | ✅ | ✅ |
| `POST /api/auth/admin/request-otp` | ✅ | ✅ | ✅ |
| `POST /api/auth/admin/verify-otp` | ✅ | ✅ | ✅ |
| `POST /api/auth/admin/logout` | ✅ | ✅ | ✅ |
| `GET /api/auth/session` | ✅ | ✅ | ✅ |
| `GET /api/public/stats` | ✅ | ✅ | ✅ |
| `GET /api/classes` | ✅ | ✅ | ✅ |
| `GET /api/students` | ❌ | ✅ | ✅ |
| `GET /api/students/:nim` | ❌ | ✅ | ✅ |
| `GET /api/gallery` | ❌ | ✅ | ✅ |
| `POST /api/upload` | ❌ | ❌ | ✅ |
| `GET /api/admin/emergencies` | ❌ | ❌ | ✅ |
| `GET /api/admin/audit-logs` | ❌ | ❌ | ✅ |
| `PATCH /api/admin/config` | ❌ | ❌ | ✅ |
| `/api/admin/students/*` (CRUD) | ❌ | ❌ | ✅ |

### 7.1 Alur Autentikasi Angkatan Passcode (Role `student`)

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant API as POST /api/auth/passcode
    participant DB as Supabase (app_config)
    participant C as HttpOnly Cookie

    U->>API: { passcode }
    API->>API: Rate limit check (5x / 15 menit / IP)
    API->>DB: SELECT value WHERE key='angkatan_passcode'
    DB-->>API: bcrypt hash
    API->>API: bcrypt.compare(passcode, hash)

    alt passcode valid
        API->>DB: SELECT value WHERE key='auth_epoch'
        API->>API: jose.sign({ role:'student', epoch }, AUTH_JWT_SECRET, { exp:'7d' })
        API->>C: Set-Cookie: angkatan_session=<jwt>, HttpOnly, Secure, SameSite=Lax
        API-->>U: 200 { success:true, role:'student' }
    else passcode salah
        API->>DB: INSERT audit_logs (PASSCODE_FAIL)
        API-->>U: 401 { error: INVALID_PASSCODE }
    end
```

**Keputusan teknis:**
- **`jose`** (bukan `jsonwebtoken`) karena Edge-runtime compatible untuk `middleware.ts`.
- Passcode diverifikasi **server-side**; hash di `app_config` hanya dibaca backend (koneksi privileged).
- Cookie **HttpOnly** → tidak bisa dibaca JavaScript (mitigasi XSS).
- **Rate limiting** wajib (in-memory Map untuk dev, Upstash Redis free tier untuk prod).
- JWT payload `{ role: 'student', epoch }` — `epoch` dipakai untuk pencabutan sesi (Section 9).
- Logout: `DELETE /api/auth/passcode` → clear cookie.

### 7.2 Alur Autentikasi Admin (Whitelist + OTP via Resend)

```mermaid
sequenceDiagram
    participant A as Admin (Browser)
    participant R as POST /api/auth/admin/request-otp
    participant V as POST /api/auth/admin/verify-otp
    participant DB as Supabase
    participant E as Resend API

    A->>R: { email }
    R->>DB: cek email di admin_whitelist (is_active = true)
    Note over R: SELALU return 200 generik (anti email-enumeration)
    R->>R: generate 6-digit OTP -> hash
    R->>DB: INSERT admin_otp (otp_hash, expires_at = now()+5m, attempts=0)
    R->>E: kirim email OTP
    R-->>A: 200 { success:true }

    A->>V: { email, otp }
    V->>DB: SELECT admin_otp terbaru (unused, unexpired, attempts < 5)
    V->>V: bandingkan hash OTP
    alt OTP valid
        V->>DB: UPDATE admin_otp SET used_at = now()
        V->>DB: SELECT value WHERE key='auth_epoch'
        V->>V: jose.sign({ role:'admin', email, epoch }, AUTH_JWT_SECRET)
        V->>DB: INSERT audit_logs (ADMIN_LOGIN)
        V-->>A: 200 { success:true, role:'admin' } + Set-Cookie admin_session
    else OTP invalid/expired
        V->>DB: UPDATE admin_otp SET attempts = attempts + 1
        V-->>A: 401 { error: INVALID_OTP }
    end
```

**Keputusan teknis:**
- **Whitelist per email individu** di `admin_whitelist` (bukan per domain). Dikelola langsung via DB Supabase (tidak ada API kelola whitelist di dashboard).
- **Anti email-enumeration**: `request-otp` selalu membalas `200` generik, terlepas email ada/tidak.
- OTP: 6 digit, expiry 5 menit, max 5 percobaan, single-use.
- Sesi admin = **custom JWT** (`jose`), konsisten dengan student.
- Cabut akses admin: set `admin_whitelist.is_active = false` + increment `auth_epoch`.

### 7.3 Middleware Guard

**Alur logika middleware (pseudocode):**

1. Baca & verifikasi JWT dari cookie → dapatkan `session` (`guest` / `student` / `admin`).
2. Baca `auth_epoch` saat ini dari `app_config` (dengan cache).
3. Jika `session` memiliki `epoch` dan `session.epoch ≠ currentEpoch` → **tolak (401) + clear cookie** (sesi telah dicabut).
4. Jika path termasuk `ADMIN_PATHS` (`/admin`, `/api/admin`, `/api/upload`):
   - jika `session.role ≠ admin` → tolak.
5. Selain itu, jika path termasuk `STUDENT_PATHS` (`/students`, `/directory`, `/gallery`, `/api/students`, `/api/gallery`):
   - jika `session.role = guest` → tolak.
6. Selain semua itu → lanjutkan request.

Matcher middleware mencakup: `/students/*`, `/directory`, `/gallery`, `/admin/*`, `/api/*`.

**Konvensi status code:** `401` = belum terautentikasi, `403` = terautentikasi tapi role kurang.

### 7.4 Konvensi Cookie & JWT

| Item | Nilai |
| :--- | :--- |
| Student JWT cookie | `angkatan_session` (HttpOnly, Secure, SameSite=Lax, Path=/, Max-Age 7 hari) |
| Admin JWT cookie | `admin_session` (HttpOnly, Secure, SameSite=Strict, Path=/, Max-Age 8 jam) |
| JWT payload (student) | `{ role: "student", epoch, iat, exp }` |
| JWT payload (admin) | `{ role: "admin", email, epoch, iat, exp }` |
| Signing lib | `jose` (HS256) |
| Passcode hashing | bcrypt (`app_config` key `angkatan_passcode`) |
| OTP hashing | scrypt/bcrypt (`admin_otp.otp_hash`) |

---

## 8. Route Map & Page Structure

```
/                         → Landing Page (PUBLIC)
                            - Hero section, statistik agregat, pengenalan singkat
                            - Data: GET /api/public/stats, GET /api/classes
/unlock                   → Form Angkatan Passcode (PUBLIC)
                            - Submit ke POST /api/auth/passcode
/students/[nim]           → Student Detail Page (PROTECTED - student)
                            - Bio, quotes, foto, hobi, sosmed (tanpa WA & alamat kost)
/directory                → Angkatan Directory (PROTECTED - student)
                            - Direktori lengkap + filter kelas + pencarian
/gallery                  → Galeri Foto (PROTECTED - student)
                            - Grid foto formal & non-formal
/admin/login              → Form Login Admin (email → OTP)
/admin                    → Admin Dashboard (RESTRICTED - admin)
/admin/students           → Kelola & edit data siswa (+ upload/ganti foto)
/admin/emergencies        → Kontak darurat (ortu & ibu kost)
/admin/config             → Ganti Angkatan Passcode & manajemen sesi
/admin/audit-logs         → Jejak audit
```

### Struktur Folder Tambahan

> Struktur mengikuti project aktual: App Router di root `app/` (bukan `src/app/`), dan Drizzle di folder `db/`.

```
db/
├── schema.ts                         # Definisi tabel Drizzle (source of truth skema)
├── index.ts                          # Inisialisasi Drizzle client (runtime, DATABASE_URL)
├── seed.ts                           # Seeder development (data dummy)
└── migrations/                       # Hasil generate drizzle-kit

lib/
├── auth/
│   ├── jwt.ts                        # sign/verify JWT (jose)
│   ├── session.ts                    # getSession(), getAuthEpoch()
│   ├── otp.ts                        # generate & verify OTP admin
│   └── guards.ts                     # requireStudent(), requireAdmin()
├── email/
│   └── resend.ts                     # kirim email OTP via Resend
├── config/
│   └── app-config.ts                 # baca/tulis app_config (passcode, epoch)
├── validations/
│   └── student.ts                    # skema Zod (student + auth)
└── audit/
    └── logger.ts                     # tulis audit_logs

middleware.ts                         # Route guard global (di root, sejajar app/)
drizzle.config.ts                     # Konfigurasi Drizzle Kit (pakai DIRECT_URL)
```

---

## 9. Audit Logging & Security Hardening

### 9.1 Daftar Aksi yang Dicatat (`audit_logs.action`)

| Action | Kapan |
| :--- | :--- |
| `ADMIN_LOGIN` | OTP admin berhasil diverifikasi |
| `ADMIN_LOGIN_FAIL` | Verifikasi OTP gagal / email tidak whitelisted |
| `PASSCODE_FAIL` | Percobaan passcode salah |
| `ROTATE_PASSCODE` | Passcode angkatan diganti |
| `READ_EMERGENCIES` | Akses endpoint `GET /api/admin/emergencies` |
| `MUTATE_STUDENT` | Create/update/delete data siswa |
| `WHITELIST_CHANGE` | Perubahan `admin_whitelist` (bila dilakukan via app) |

### 9.2 Token Epoch — Pencabutan Sesi Seketika

JWT bersifat stateless sehingga tidak bisa dicabut begitu saja. Solusinya: klaim `epoch` di JWT yang dibandingkan dengan `app_config.auth_epoch` (contoh nilai: `5`).

- Setiap JWT (student & admin) menyimpan `epoch` saat diterbitkan.
- Middleware membandingkan `jwt.epoch === currentEpoch`; jika tidak sama → **tolak (401) + clear cookie**.
- **Rotasi passcode / cabut akses admin** → increment `auth_epoch` → **semua sesi lama langsung mati**, tanpa ganti `AUTH_JWT_SECRET` dan tanpa redeploy.

### 9.3 Prinsip Keamanan Lain

- **Rate limiting**: passcode (5x/15m/IP), request-otp (per email & IP), verify-otp (max 5 percobaan per OTP).
- **Anti-enumeration**: `request-otp` selalu `200` generik.
- **Secret separation**: master secret (`AUTH_JWT_SECRET`, DB creds) di env; operational secret (passcode, epoch) di `app_config` (bisa rotasi instan).
- **HttpOnly + Secure + SameSite** untuk semua cookie sesi.
- **Query scoping**: endpoint non-admin **wajib** memilih kolom eksplisit; `student_contacts.whatsapp_number`, `boarding_address`, dan seluruh `student_emergencies` tidak boleh di-select di endpoint student/public.
- **Admin whitelist** dikelola langsung via DB Supabase (akses fisik terkontrol), bukan via API dashboard.

---

## 10. Tabel `app_config` & Manajemen Passcode

Passcode angkatan disimpan sebagai **bcrypt hash** di `app_config`, bukan plaintext di env.

**Data awal yang perlu di-seed** (`app_config`):

| key | value | deskripsi |
| :--- | :--- | :--- |
| `angkatan_passcode` | bcrypt hash passcode | Shared secret akses directory & galeri |
| `auth_epoch` | `1` (integer) | Epoch sesi; increment untuk mencabut semua sesi |

**Aturan operasional:**
- **Baca/ubah hanya via backend** (koneksi privileged); `anon`/`authenticated` ditolak RLS.
- Ganti passcode: `PATCH /api/admin/config` → bcrypt hash baru + increment `auth_epoch`. Tanpa redeploy.
- Seeder/CLI menghasilkan hash bcrypt (cost factor 12).

**Manajemen whitelist admin** (dikelola langsung via Supabase SQL / Table Editor, bukan via API):
- Menambah admin: sisipkan baris `admin_whitelist` dengan `email`, `display_name`, `is_active = true`.
- Mencabut akses: set `is_active = false` pada email terkait, lalu increment `auth_epoch` agar sesi aktif langsung mati.
