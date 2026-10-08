# Backend Development & Implementation Roadmap

Project plan & checklist pengerjaan backend **Web Buku Angkatan**.

---

## Roadmap Overview

```
Phase 1: DB & Storage Provisioning ➔ Phase 2: ORM & Zod Setup ➔ Phase 3: Core API Routes ➔ Phase 4: Ingestion & Seeder Script ➔ Phase 5: Netlify Deploy
```

---

## Checklist Implementasi

### Phase 1: Infrastructure & Environment Setup
- [x] Buat dokumen perencanaan (`docs/` folder & `README.md`).
- [ ] Setup Project Supabase (PostgreSQL DB).
- [ ] Setup Bucket Cloudflare R2 (`buku-angkatan-assets`) & Custom Domain CDN / Public R2 URL.
- [ ] Konfigurasi CORS pada Cloudflare R2 bucket untuk presigned upload URL.
- [ ] Buat file `.env.example` dan `.env.local`.

### Phase 2: Database Schema & ORM Setup
- [ ] Inisialisasi Prisma / Drizzle ORM di project.
- [ ] Definisikan skema model: `User`, `Student`, `StudentContact`, `StudentProfile`, `StudentEmergency`.
- [ ] Jalankan `db push` / `migrate` ke Supabase menggunakan `DIRECT_URL`.
- [ ] Jalankan SQL Script Row Level Security (RLS) di Supabase Dashboard untuk memproteksi `student_emergencies`.
- [ ] Tulis Zod Validation Schemas di `src/lib/validations/student.ts`.

### Phase 3: Storage Helpers & Core API Route Handlers
- [ ] Implementasi S3 Client helper Cloudflare R2 di `src/lib/storage/r2.ts`.
- [ ] Buat Handler `POST /api/upload` (Generates R2 Presigned PUT URL).
- [ ] Buat Handler `GET /api/students` (Public list, pagination, filter `class_name`, search `name/NIM`).
- [ ] Buat Handler `GET /api/students/[nim]` (Public detail profile, eksklusif tanpa `student_emergencies`).
- [ ] Buat Handler `GET /api/classes` (Rekapitulasi total mahasiswa per kelas).

### Phase 4: CSV Data Ingestion & Seeder Script
- [ ] Buat utility parser CSV & helper sanitasi (`sanitizeWhatsApp`, `sanitizeInstagram`, `parseBirthDate`).
- [ ] Implemetasi downloader image Google Drive -> Cloudflare R2 uploader.
- [ ] Tulis CLI script `scripts/seed-from-csv.ts` dengan opsi `--dry-run`.
- [ ] Uji coba import data dummy / real CSV hasil ekspor Google Form.

### Phase 5: Deployment & UI Readiness
- [ ] Konfigurasi `netlify.toml` & Netlify Next.js Plugin.
- [ ] Setup Environment Variables di Netlify Site Settings.
- [ ] Test deployment & verifikasi konektivitas Supabase Transaction Pooler (`DATABASE_URL`).
- [ ] Validasi API Contracts menggunakan Postman / Bruno / cURL.
- [ ] Siapkan mock response data untuk memudahkan tim Frontend/UI/UX.
