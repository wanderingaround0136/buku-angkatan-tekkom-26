# Backend Development & Implementation Roadmap

Project plan & checklist pengerjaan backend **Web Buku Angkatan**.

---

## Roadmap Overview

```
Milestone 0: Infra  ➔  A: Public  ➔  B: Passcode (student)  ➔  C: Admin (OTP)  ➔  D: Ingestion & Deploy
```

Model akses: **3 role** — `guest` (landing saja), `student` (passcode → directory/galeri/detail), `admin` (whitelist email + OTP → dashboard + data darurat).

---

## Checklist Implementasi

### Milestone 0: Infrastructure, Schema & Security Baseline
- [ ] Buat dokumen perencanaan (`docs/` folder & `README.md`).
- [ ] Setup Project Supabase (PostgreSQL DB).
- [ ] Setup Bucket Cloudflare R2 (`buku-angkatan-assets`) & Custom Domain CDN / Public R2 URL.
- [ ] Konfigurasi CORS pada Cloudflare R2 bucket untuk presigned upload URL.
- [ ] Setup Resend (API key + verifikasi domain pengirim).
- [ ] Buat file `.env.example` dan `.env.local`.
- [ ] Definisikan model ORM: `Student`, `StudentContact`, `StudentProfile`, `StudentEmergency`, `AppConfig`, `AdminWhitelist`, `AdminOtp`, `AuditLog`.
- [ ] Jalankan `db push` / `migrate` ke Supabase menggunakan `DIRECT_URL`.
- [ ] Jalankan SQL Script RLS (Section 3 ARCHITECTURE.md) — tolak akses `anon`/`authenticated`.
- [ ] Tulis Zod Validation Schemas di `src/lib/validations/student.ts` (+ auth schemas).
- [ ] Buat helper `src/lib/audit/logger.ts` (tulis `audit_logs`).
- [ ] Buat helper `src/lib/config/app-config.ts` (baca/tulis `app_config`: passcode & `auth_epoch`).

---

### Milestone A: Public Access (guest)
- [ ] Handler `GET /api/public/stats` (statistik agregat — tanpa data personal).
- [ ] Handler `GET /api/classes` (rekapitulasi per kelas).
- [ ] Halaman Landing Page `/` (hero section, statistik, pengenalan singkat).
- [ ] Pastikan **tidak ada** data personal yang bocor di endpoint public.

---

### Milestone B: Passcode Access (student)
- [ ] Seed passcode awal + `auth_epoch` ke `app_config` (bcrypt hash).
- [ ] Helper `src/lib/auth/jwt.ts` (sign/verify JWT via `jose`).
- [ ] Helper `src/lib/auth/session.ts` (`getSession()`, `getAuthEpoch()`).
- [ ] Handler `POST /api/auth/passcode` (verifikasi + set cookie HttpOnly) + **rate limiting**.
- [ ] Handler `DELETE /api/auth/passcode` (logout).
- [ ] Handler `GET /api/auth/session` (status role).
- [ ] `src/middleware.ts` guard `STUDENT_PATHS` + cek `epoch`.
- [ ] Handler `GET /api/students` (direktori, pagination, filter, search).
- [ ] Handler `GET /api/students/:nim` (detail — **tanpa** WA pribadi & alamat kost).
- [ ] Handler `GET /api/gallery` (galeri foto).
- [ ] Halaman `/unlock`, `/directory`, `/students/[nim]`, `/gallery`.

---

### Milestone C: Admin Access (Whitelist + OTP)
Fokus: login passwordless + dashboard + data darurat. **Semua mutasi data & upload hanya admin.**
- [ ] Buat tabel `admin_whitelist` + seed email pengurus (via SQL Supabase langsung).
- [ ] Helper `src/lib/auth/otp.ts` (generate/hash/verify OTP).
- [ ] Helper `src/lib/email/resend.ts` (kirim OTP via Resend).
- [ ] Handler `POST /api/auth/admin/request-otp` (anti-enumeration, rate-limit, selalu 200).
- [ ] Handler `POST /api/auth/admin/verify-otp` (set cookie `admin_session`, audit `ADMIN_LOGIN`).
- [ ] Handler `POST /api/auth/admin/logout`.
- [ ] Middleware guard `ADMIN_PATHS` (`/admin`, `/api/admin`, `/api/upload`).
- [ ] Helper `src/lib/storage/r2.ts` (S3 Client Cloudflare R2).
- [ ] Handler `POST /api/upload` (R2 Presigned PUT URL — **admin-only**).
- [ ] Handler CRUD `GET/POST /api/admin/students`, `GET/PATCH/DELETE /api/admin/students/:nim` (audit `MUTATE_STUDENT`).
- [ ] Handler `GET /api/admin/emergencies` (audit `READ_EMERGENCIES`).
- [ ] Handler `PATCH /api/admin/config` (ganti passcode + increment `auth_epoch`, audit `ROTATE_PASSCODE`).
- [ ] Handler `GET /api/admin/audit-logs`.
- [ ] Handler `GET /api/admin/export` (CSV/XLSX termasuk data darurat).
- [ ] Halaman `/admin/login`, `/admin`, `/admin/students`, `/admin/emergencies`, `/admin/config`, `/admin/audit-logs`.
- [ ] Uji alur cabut akses: `is_active=false` + increment epoch → sesi langsung mati.

---

### Milestone D: CSV Ingestion & Deployment
- [ ] Utility parser CSV & helper sanitasi (`sanitizeWhatsApp`, `sanitizeInstagram`, `parseBirthDate`).
- [ ] Implementasi downloader image Google Drive → Cloudflare R2 uploader.
- [ ] CLI script `scripts/seed-from-csv.ts` dengan opsi `--dry-run`.
- [ ] Uji coba import data dummy / real CSV hasil ekspor Google Form.
- [ ] Konfigurasi `netlify.toml` & Netlify Next.js Plugin.
- [ ] Setup Environment Variables di Netlify Site Settings (termasuk `AUTH_JWT_SECRET`, `RESEND_API_KEY`).
- [ ] Test deployment & verifikasi konektivitas Supabase Transaction Pooler (`DATABASE_URL`).
- [ ] Validasi API Contracts & guard (401/403/429) menggunakan Postman / Bruno / cURL.
- [ ] Siapkan mock response data untuk memudahkan tim Frontend/UI/UX.

---

## Milestone Ringkas

| Milestone | Role | Deliverable Utama |
| :--- | :--- | :--- |
| **0** | — | DB, ORM, RLS, audit & config helpers, env |
| **A** | guest | Landing Page + stats publik |
| **B** | student | Passcode gate, directory, galeri, detail |
| **C** | admin | Whitelist + OTP (Resend), dashboard, data darurat, upload, audit log |
| **D** | — | Seeder CSV, deploy Netlify, kontrak API siap UI |

---

## Security Hardening Checklist
- [ ] Token `epoch` di JWT (student & admin) dibandingkan dengan `app_config.auth_epoch`.
- [ ] Rate limiting: passcode (5x/15m/IP), request-otp (per email & IP), verify-otp (max 5/OTP).
- [ ] Anti email-enumeration pada `request-otp` (selalu 200 generik).
- [ ] Cookie HttpOnly + Secure + SameSite (student=Lax, admin=Strict).
- [ ] Query scoping: WA pribadi, alamat kost, & `student_emergencies` hanya di endpoint admin.
- [ ] Audit log untuk: login, gagal login, rotasi passcode, baca emergencies, mutasi data.
- [ ] Rotasi `AUTH_JWT_SECRET` terdokumentasi sebagai prosedur darurat (bump epoch lebih diutamakan).
