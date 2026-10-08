# Backend Architecture & Systems Design

Document Source of Truth arsitektur backend **Web Buku Angkatan**.

---

## 1. Tech Stack Overview

| Layer | Technology | Infrastructure / Free Tier Provider |
| :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | Netlify Serverless Functions |
| **Language** | TypeScript | Node.js Runtime |
| **Database** | PostgreSQL | Supabase (Free Tier) |
| **ORM** | Prisma / Drizzle | Type-safe Query Builder & Migration Engine |
| **Object Storage** | S3-Compatible Storage | Cloudflare R2 (Free Tier) |
| **S3 SDK** | `@aws-sdk/client-s3` | Presigned URL Upload & S3 Commands |
| **Email (OTP)** | Resend | Transactional Email Service |
| **Auth Token** | `jose` (JWT, HS256) | Custom session untuk student & admin |
| **Validation** | Zod | Runtime Schema Validation & Sanitization |

> **Catatan arsitektur**: Aplikasi **tidak** memakai Supabase Auth. Semua autentikasi (student passcode & admin OTP) dikelola aplikasi sendiri menggunakan JWT (`jose`) yang disimpan di HttpOnly cookie. Backend mengakses Supabase PostgreSQL via koneksi Postgres langsung (Prisma/Drizzle).

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
- `DIRECT_URL`: Direct Connection (Port `5432`) — Digunakan oleh Prisma/Drizzle CLI untuk `db push` / `migrate`.

### Row Level Security (RLS) — Defense-in-Depth

Karena aplikasi **tidak** memakai Supabase Auth, penegakan akses utama ada di **layer aplikasi** (middleware + guards + Prisma query scoping). RLS di sini berperan sebagai **lapis pertahanan terakhir** untuk mencegah **akses langsung** ke DB (mis. bila seseorang mendapat koneksi Postgres atau anon key).

**Prinsip**: Aplikasi hanya mengakses DB via koneksi server-side (Postgres direct). RLS dikonfigurasi untuk **menolak seluruh akses dari role `anon` dan `authenticated`**, sehingga tabel hanya bisa diakses oleh koneksi privileged (role `postgres` / service role) yang dipakai backend.

```sql
-- Enable RLS on all tables
ALTER TABLE students            ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_contacts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_emergencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config          ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_whitelist     ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_otp           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs          ENABLE ROW LEVEL SECURITY;

-- Tidak ada policy untuk role `anon` / `authenticated`.
-- Tanpa policy + RLS aktif => SEMUA akses dari kedua role tsb DITOLAK.
-- Backend memakai koneksi Postgres privileged (role postgres) yang melewati RLS,
-- dan WAJIB menerapkan pembatasan field/role di layer aplikasi (guards).

-- Cabut akses langsung ke schema public dari anon/authenticated (opsional, paling ketat)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
```

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

### Storage Helpers (`src/lib/storage/r2.ts`)

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function generateUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 }); // 5 menit
  const publicUrl = `${process.env.R2_PUBLIC_DOMAIN}/${key}`;

  return { uploadUrl, publicUrl, key };
}
```

---

## 5. Zod Validation Schemas (`src/lib/validations/student.ts`)

```typescript
import { z } from "zod";

// Helper sanitizers
export const sanitizeWhatsApp = (val: string): string => {
  let cleaned = val.replace(/\D/g, "");
  if (cleaned.startsWith("0")) return "62" + cleaned.slice(1);
  if (cleaned.startsWith("8")) return "62" + cleaned;
  return cleaned;
};

export const sanitizeInstagram = (val: string): string => {
  let cleaned = val.trim();
  cleaned = cleaned.replace(/https?:\/\/(www\.)?instagram\.com\//i, "");
  cleaned = cleaned.replace(/^@/, "");
  return cleaned.replace(/\/$/, "");
};

export const studentBaseSchema = z.object({
  nim: z.string().min(5).max(20),
  full_name: z.string().min(2).max(100),
  nickname: z.string().min(1).max(50),
  class_name: z.enum(["A", "B", "C", "D"]),
  religion: z.enum(["ISLAM", "PROTESTANT", "CATHOLIC", "HINDU", "BUDDHA", "KHONGHUCU", "OTHER"]),
  birth_place: z.string().min(2),
  birth_date: z.coerce.date(),
  origin_city: z.string().min(2),
});

export const studentContactSchema = z.object({
  whatsapp_number: z.string().transform(sanitizeWhatsApp).pipe(z.string().regex(/^628\d{8,12}$/)),
  instagram_handle: z.string().transform(sanitizeInstagram),
  boarding_address: z.string().min(5),
});

export const studentProfileSchema = z.object({
  hobbies: z.array(z.string()),
  quote: z.string().max(500),
  favorite_food_place: z.string().max(200),
  spotify_track_url: z.string().url().or(z.literal("")),
  formal_photo_url: z.string().url(),
  informal_photo_url: z.string().url(),
});

export const studentEmergencySchema = z.object({
  parent_whatsapp: z.string().transform(sanitizeWhatsApp).pipe(z.string().regex(/^628\d{8,12}$/)),
  landlord_whatsapp: z.string().transform(sanitizeWhatsApp).pipe(z.string().regex(/^628\d{8,12}$/)).or(z.literal("")),
});

// Auth schemas
export const passcodeSchema = z.object({ passcode: z.string().min(1) });

export const adminEmailSchema = z.object({ email: z.string().email().toLowerCase() });

export const verifyOtpSchema = z.object({
  email: z.string().email().toLowerCase(),
  otp: z.string().regex(/^\d{6}$/),
});
```

---

## 6. Deployment & Netlify Environment Config

### `netlify.toml` Configuration

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NODE_VERSION = "20"
```

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
        API->>C: Set-Cookie angkatan_session=<jwt>; HttpOnly; Secure; SameSite=Lax
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

### 7.3 Middleware Guard (`src/middleware.ts`)

```typescript
// src/lib/auth/guards.ts
export type Session =
  | { role: "guest" }
  | { role: "student"; epoch: number }
  | { role: "admin"; email: string; epoch: number };

// src/middleware.ts (pseudocode)
const STUDENT_PATHS = ["/students", "/directory", "/gallery", "/api/students", "/api/gallery"];
const ADMIN_PATHS   = ["/admin", "/api/admin", "/api/upload"];

export async function middleware(req: NextRequest) {
  const session = await getSession(req); // parse & verify JWT cookie (jose)
  const epoch = await getAuthEpoch();    // baca app_config.auth_epoch (cache)

  // Pencabutan sesi seketika: token dengan epoch lama otomatis ditolak
  if ("epoch" in session && session.epoch !== epoch) {
    return clearSessionAndUnauthorized(req);
  }

  if (matches(ADMIN_PATHS, req.nextUrl.pathname)) {
    if (session.role !== "admin") return unauthorized(req);
  } else if (matches(STUDENT_PATHS, req.nextUrl.pathname)) {
    if (session.role === "guest") return unauthorized(req);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/students/:path*", "/directory", "/gallery", "/admin/:path*", "/api/:path*"],
};
```

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

```
src/
├── middleware.ts                     # Route guard global
└── lib/
    ├── auth/
    │   ├── jwt.ts                    # sign/verify JWT (jose)
    │   ├── session.ts                # getSession(), getAuthEpoch()
    │   ├── otp.ts                    # generate & verify OTP admin
    │   └── guards.ts                 # requireStudent(), requireAdmin()
    ├── email/
    │   └── resend.ts                 # kirim email OTP via Resend
    ├── config/
    │   └── app-config.ts             # baca/tulis app_config (passcode, epoch)
    └── audit/
        └── logger.ts                 # tulis audit_logs
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

JWT bersifat stateless sehingga tidak bisa dicabut begitu saja. Solusinya: klaim `epoch` di JWT yang dibandingkan dengan `app_config.auth_epoch`.

```
app_config: key='auth_epoch', value='5'
```

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

```sql
-- Seed awal (jalankan via seeder / SQL admin, ganti <HASH> dgn bcrypt hash)
INSERT INTO app_config (key, value, description) VALUES
  ('angkatan_passcode', '<BCRYPT_HASH>', 'Shared secret untuk akses directory & galeri angkatan'),
  ('auth_epoch',        '1',             'Epoch sesi; increment untuk mencabut semua sesi');
```

- **Baca/ubah hanya via backend** (koneksi privileged); `anon`/`authenticated` ditolak RLS.
- Ganti passcode: `PATCH /api/admin/config` → bcrypt hash baru + increment `auth_epoch`. Tanpa redeploy.
- Seeder/CLI menghasilkan hash: `bcrypt.hash(passcode, 12)`.
- **Whitelist admin**: kelola langsung via Supabase SQL / Table Editor:
  ```sql
  INSERT INTO admin_whitelist (email, display_name, is_active)
  VALUES ('pengurus@gmail.com', 'Pengurus 1', true);
  ```
