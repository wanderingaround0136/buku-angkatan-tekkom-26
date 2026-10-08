# Developer Contributing Guide

Panduan pengembangan, konvensi kode, dan Vibe Coding rules untuk tim dev & AI Assistant di project **Web Buku Angkatan**.

---

## 1. Vibe Coding Rules (AI & Developer Guidelines)

1. **Plan Mode First**:
   - Selalu diskusikan perubahan arsitektur atau skema database terlebih dahulu sebelum melakukan eksekusi file/kode.
2. **Type Safety Strictness**:
   - Dilarang keras menggunakan tipe `any`. Selalu definisikan interface/type TypeScript atau manfaatkan Zod infer type.
3. **Privacy First**:
   - Dilarang menampilkan atau mengekspos field dari tabel `student_emergencies` di komponen UI publik maupun response API publik.
4. **Clean Code & Terse Style**:
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
│   ├── app/
│   │   └── api/                # Next.js Serverless API Route Handlers
│   │       ├── classes/route.ts
│   │       ├── students/
│   │       │   ├── route.ts
│   │       │   └── [nim]/route.ts
│   │       └── upload/route.ts
│   ├── lib/
│   │   ├── db/                 # Prisma / Drizzle Client Setup
│   │   │   └── client.ts
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

SUPABASE_URL="https://[ref].supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

R2_ACCOUNT_ID="your_cloudflare_account_id"
R2_ACCESS_KEY_ID="your_r2_access_key_id"
R2_SECRET_ACCESS_KEY="your_r2_secret_access_key"
R2_BUCKET_NAME="buku-angkatan-assets"
R2_PUBLIC_DOMAIN="https://cdn.bukuangkatan.com"
```

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
