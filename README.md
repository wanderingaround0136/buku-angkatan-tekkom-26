# Documentation Directory

Welcome to the backend architecture & planning documentation for **Web Buku Angkatan**.

All primary architectural documents, API specs, database schemas, and developer guides live inside this `/docs` folder:

- 🏗️ **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)**: Tech stack, Supabase PostgreSQL ERD, RLS security policies, Cloudflare R2 file upload architecture, Netlify deployment setup, and Zod validation specs.
- 📡 **[API_CONTRACTS.md](./docs/API_CONTRACTS.md)**: RESTful API contracts, JSON responses, error handling, R2 upload specs, and strict privacy guarantees.
- 🧹 **[SEEDING_GUIDE.md](./docs/SEEDING_GUIDE.md)**: Google Form CSV data ingestion workflow, sanitization rules (WhatsApp, Instagram, dates), media migration, and `scripts/seed-from-csv.ts` guide.
- 🛠️ **[CONTRIBUTING.md](./docs/CONTRIBUTING.md)**: Development workflow, environment setup, database migrations, vibe coding rules, and code style conventions.
- 📋 **[PROJECT_PLAN.md](./docs/PROJECT_PLAN.md)**: Step-by-step roadmap for database provisioning, API handlers, data ingestion, and future UI integration readiness.
- ✅ **[IMPLEMENTATION_PLAN.md](./docs/IMPLEMENTATION_PLAN.md)**: Task breakdown per Epic (fitur besar) dalam format checklist markdown, dengan urutan dependency & prioritas.

---

## Tech Stack Overview

- **Framework**: Next.js App Router (TypeScript)
- **Database**: Supabase (PostgreSQL Free Tier) + Prisma / Drizzle ORM
- **Auth**: Custom JWT (`jose`, HttpOnly cookie) — Angkatan Passcode untuk student · Whitelist email + OTP (Resend) untuk admin
- **Object Storage**: Cloudflare R2 (Free Tier) via `@aws-sdk/client-s3`
- **Email**: Resend (OTP admin)
- **Hosting / Deployment**: Netlify (Serverless Functions)
- **Validation**: Zod

---

## Access Model (3 Roles)

| Role | Autentikasi | Cakupan |
| :--- | :--- | :--- |
| `guest` | Tanpa auth | **Landing Page** saja |
| `student` | Angkatan Passcode → JWT cookie | Directory, Galeri, Detail Profil |
| `admin` | Whitelist email + OTP (Resend) → JWT cookie | Admin Dashboard + seluruh data (termasuk kontak darurat) |

> 🔒 No WA pribadi, alamat kost, dan kontak darurat **hanya** dapat diakses admin. Semua aksi mutasi data & upload gambar juga admin-only. Akses dapat dicabut seketika via `auth_epoch` (token epoch). Lihat [ARCHITECTURE.md](./docs/ARCHITECTURE.md) (Section 7 & 9) dan [API_CONTRACTS.md](./docs/API_CONTRACTS.md).
