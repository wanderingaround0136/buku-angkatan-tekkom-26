# Developer Contributing Guide

Panduan pengembangan, konvensi kode, dan Vibe Coding rules untuk tim dev & AI Assistant di project **Web Buku Angkatan**.

---

## 1. Vibe Coding Rules (AI & Developer Guidelines)

1. **Plan Mode First**:
   - Selalu diskusikan perubahan arsitektur atau skema database terlebih dahulu sebelum melakukan eksekusi file/kode.
2. **Type Safety Strictness**:
   - Dilarang keras menggunakan tipe `any`. Selalu definisikan interface/type TypeScript atau manfaatkan Zod infer type.
3. **Privacy First**:
   - Dilarang menampilkan atau mengekspos field dari tabel `student_emergencies`, `student_contacts.whatsapp_number`, dan `student_contacts.boarding_address` di komponen UI maupun response API non-admin. Endpoint non-admin wajib memilih kolom secara eksplisit (dilarang `SELECT *`).
4. **Auth & Secrets**:
   - Sesi memakai JWT (`jose`) di HttpOnly cookie. Jangan pernah menaruh secret/passcode/hash di kode atau log.
   - Perubahan passcode atau pencabutan sesi wajib lewat `app_config` + increment `auth_epoch`.
5. **Audit Everything Sensitive**:
   - Setiap akses data darurat, mutasi data, login, dan rotasi passcode wajib menulis `audit_logs`.
6. **Clean Code & Terse Style**:
   - Tulis kode modular, readable, dan ringkas. Hindari boilerplate yang tidak perlu.

---

## 2. Directory & File Conventions

Struktur folder backend Next.js App Router:

```
project-buku-angkatan/
├── docs/                       # Documentation (Source of Truth)
│   ├── ARCHITECTURE.md
│   ├── API_CONTRACTS.md
│   ├── SEEDING_GUIDE.md
│   ├── CONTRIBUTING.md
│   └── PROJECT_PLAN.md
├── scripts/                    # CLI Utilities & Seeders
│   └── seed-from-csv.ts
├── src/
│   ├── middleware.ts           # Route guard global (student & admin)
│   ├── app/
│   │   ├── api/                # Next.js Serverless API Route Handlers
│   │   │   ├── auth/
│   │   │   │   ├── passcode/route.ts
│   │   │   │   └── admin/{request-otp,verify-otp,logout}/route.ts
│   │   │   ├── public/stats/route.ts
│   │   │   ├── classes/route.ts
│   │   │   ├── students/{route.ts,[nim]/route.ts}
│   │   │   ├── gallery/route.ts
│   │   │   ├── upload/route.ts
│   │   │   └── admin/{students,emergencies,config,audit-logs,export}/route.ts
│   │   └── (pages)             # Landing, /unlock, /directory, /gallery, /admin/*
│   ├── lib/
│   │   ├── db/                 # Prisma / Drizzle Client Setup
│   │   │   └── client.ts
│   │   ├── auth/               # JWT, session, OTP, guards
│   │   │   ├── jwt.ts
│   │   │   ├── session.ts
│   │   │   ├── otp.ts
│   │   │   └── guards.ts
│   │   ├── email/              # Resend client
│   │   │   └── resend.ts
│   │   ├── config/             # app_config (passcode, auth_epoch)
│   │   │   └── app-config.ts
│   │   ├── audit/              # audit_logs writer
│   │   │   └── logger.ts
│   │   ├── storage/            # Cloudflare R2 Helper
│   │   │   └── r2.ts
│   │   └── validations/        # Zod Schemas
│   │       └── student.ts
│   └── types/                  # Shared TypeScript Interfaces
├── netlify.toml                # Netlify Deployment Settings
├── .env.example                # Template Environment Variables
└── README.md
```

---

## 3. Local Development Setup

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-repo/project-buku-angkatan.git
cd project-buku-angkatan
npm install
```

### 2. Configure Environment Variables
Salin `.env.example` ke `.env.local`:
```bash
cp .env.example .env.local
```

Isi variabel environment berikut:
```env
DATABASE_URL="postgres://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgres://postgres.[ref]:[pass]@aws-0-[region].supabase.com:5432/postgres"

# Auth (custom JWT via jose — student passcode & admin OTP)
AUTH_JWT_SECRET="random-32-char-minimum-secret"

# Email OTP (Resend)
RESEND_API_KEY="re_xxxxxxxx"
RESEND_FROM_EMAIL="no-reply@bukuangkatan.com"

# Object Storage (Cloudflare R2)
R2_ACCOUNT_ID="your_cloudflare_account_id"
R2_ACCESS_KEY_ID="your_r2_access_key_id"
R2_SECRET_ACCESS_KEY="your_r2_secret_access_key"
R2_BUCKET_NAME="buku-angkatan-assets"
R2_PUBLIC_DOMAIN="https://cdn.bukuangkatan.com"
```

> **Catatan**: Tidak ada `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — aplikasi tidak memakai Supabase Auth. Passcode angkatan & `auth_epoch` disimpan di tabel `app_config` (bukan env). Whitelist admin dikelola langsung via SQL/Table Editor Supabase.

### 3. Database Migration
Jalankan migrasi ke Supabase DB:
```bash
npx prisma db push # atau drizzle-kit push
```

### 4. Run Development Server
Gunakan `netlify dev` untuk menyimulasikan environment serverless Netlify secara lokal:
```bash
npx netlify dev
```
Atau run via Next.js standard dev server:
```bash
npm run dev
```

---

## 4. Git & Commit Guidelines

Gunakan format Conventional Commits:
- `feat:` Fitur baru (misal: `feat: add GET /api/students search query`)
- `fix:` Bug fix (misal: `fix: sanitize whatsapp starting with 8`)
- `docs:` Pembaruan dokumentasi
- `chore:` Maintenance config / dependency update
