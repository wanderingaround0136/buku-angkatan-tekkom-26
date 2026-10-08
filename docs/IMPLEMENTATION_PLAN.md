# Implementation Plan — Backend Task Breakdown

Breakdown task implementasi backend **Web Buku Angkatan**, dikelompokkan per **Epic (fitur besar)** dan dipecah menjadi task-task kecil yang dapat di-track.

**Legend status:** `[ ]` todo · `[~]` in progress · `[x]` done
**Legend prioritas:** 🔴 blocker · 🟡 penting · 🟢 nice-to-have

---

## Urutan Pengerjaan (Dependency)

```
EPIC 1 → 2 → 3 → {4, 5, 6} → {7, 8, 9, 10} → 11 → 12
```

---

## EPIC 1 — Foundation & Infrastructure 🔴
*Scaffold project, DB, env, tooling.*

- [ ] **1.1** Init project Next.js App Router + TypeScript strict mode
- [ ] **1.2** Setup Tailwind + struktur folder (`src/app`, `src/lib`, `scripts`)
- [ ] **1.3** Pilih & setup ORM (Prisma/Drizzle) + config `DATABASE_URL`/`DIRECT_URL`
- [ ] **1.4** Buat `.env.example` + validasi env via Zod (`src/lib/env.ts`)
- [ ] **1.5** Buat Supabase project + jalankan migrasi awal
- [ ] **1.6** Setup `netlify.toml` + Next.js plugin (dasar)
- [ ] **1.7** Setup linter/formatter (ESLint + Prettier) + path alias (`@/*`)

## EPIC 2 — Database Schema & Migration 🔴
*Definisi seluruh tabel, enum, index.*

- [ ] **2.1** Model `students` + enum `ClassEnum`, `ReligionEnum`
- [ ] **2.2** Model `student_contacts`
- [ ] **2.3** Model `student_profiles`
- [ ] **2.4** Model `student_emergencies`
- [ ] **2.5** Model `app_config`
- [ ] **2.6** Model `admin_whitelist`
- [ ] **2.7** Model `admin_otp`
- [ ] **2.8** Model `audit_logs`
- [ ] **2.9** Tambah index: `students.nim`, `students.class_name`, `admin_otp.email`, `audit_logs.action`
- [ ] **2.10** Jalankan migration + generate ORM client
- [ ] **2.11** Tulis & jalankan SQL RLS (tolak `anon`/`authenticated`)

## EPIC 3 — Validation Layer (Zod) 🔴
*Skema validasi dipakai bersama oleh API handler & seeder.*

- [ ] **3.1** Helper sanitizers: `sanitizeWhatsApp`, `sanitizeInstagram`, `parseBirthDate`
- [ ] **3.2** `studentBaseSchema`
- [ ] **3.3** `studentContactSchema` + `studentProfileSchema` + `studentEmergencySchema`
- [ ] **3.4** Auth schemas: `passcodeSchema`, `adminEmailSchema`, `verifyOtpSchema`
- [ ] **3.5** Skema pagination/query params reusable

## EPIC 4 — Auth: Angkatan Passcode (Role student) 🔴
*Gerbang akses internal angkatan.*

- [ ] **4.1** Helper `src/lib/config/app-config.ts` (baca/tulis `app_config`)
- [ ] **4.2** Helper `src/lib/auth/jwt.ts` (`sign`/`verify` via `jose`)
- [ ] **4.3** Helper `src/lib/auth/session.ts` (`getSession()`, `getAuthEpoch()`)
- [ ] **4.4** Rate limiter utility (in-memory dev → Upstash Redis prod)
- [ ] **4.5** `POST /api/auth/passcode` (verify bcrypt + set cookie HttpOnly)
- [ ] **4.6** `DELETE /api/auth/passcode` (logout / clear cookie)
- [ ] **4.7** `GET /api/auth/session` (status role)
- [ ] **4.8** `src/middleware.ts` guard `STUDENT_PATHS` + cek `epoch`

## EPIC 5 — Auth: Admin Whitelist + OTP (Role admin) 🔴
*Login passwordless admin via email OTP.*

- [ ] **5.1** Helper `src/lib/auth/otp.ts` (generate 6 digit + hash + verify)
- [ ] **5.2** Helper `src/lib/email/resend.ts` (kirim OTP)
- [ ] **5.3** `POST /api/auth/admin/request-otp` (cek whitelist, rate-limit, selalu 200 generik)
- [ ] **5.4** `POST /api/auth/admin/verify-otp` (validasi, set `admin_session`, audit `ADMIN_LOGIN`)
- [ ] **5.5** `POST /api/auth/admin/logout`
- [ ] **5.6** Guard `requireAdmin()` + proteksi `ADMIN_PATHS` di middleware
- [ ] **5.7** Cleanup/expiry OTP (cron atau on-demand)

## EPIC 6 — Audit & Security Helpers 🟡
*Jejak audit + hardening keamanan.*

- [ ] **6.1** Helper `src/lib/audit/logger.ts` (tulis `audit_logs`)
- [ ] **6.2** Helper ekstrak `ip` + `user_agent` dari request
- [ ] **6.3** Implementasi Token Epoch (bump `auth_epoch` untuk cabut sesi)
- [ ] **6.4** Query scoping utility (pilih kolom eksplisit; cegah `SELECT *` pada data sensitif)

## EPIC 7 — Public API (Landing Page) 🟡
*Data agregat tanpa personal.*

- [ ] **7.1** `GET /api/public/stats`
- [ ] **7.2** `GET /api/classes`
- [ ] **7.3** Standard response wrapper (`success`/`error`/`meta`)
- [ ] **7.4** Global error handler + mapping error codes

## EPIC 8 — Protected API (Directory, Detail, Gallery) 🟡
*Konten internal untuk student.*

- [ ] **8.1** `GET /api/students` (pagination + filter class + search)
- [ ] **8.2** `GET /api/students/:nim` (detail — **tanpa** WA pribadi & alamat kost)
- [ ] **8.3** `GET /api/gallery`
- [ ] **8.4** Response shaping per role (field visibility)

## EPIC 9 — Admin API (CRUD, Emergencies, Config, Audit, Export) 🟡
*Kontrol penuh admin.*

- [ ] **9.1** `GET/POST /api/admin/students`
- [ ] **9.2** `GET/PATCH/DELETE /api/admin/students/:nim` (audit `MUTATE_STUDENT`)
- [ ] **9.3** `GET /api/admin/emergencies` (audit `READ_EMERGENCIES`)
- [ ] **9.4** `PATCH /api/admin/config` (rotasi passcode + bump epoch, audit `ROTATE_PASSCODE`)
- [ ] **9.5** `GET /api/admin/audit-logs`
- [ ] **9.6** `GET /api/admin/export` (CSV/XLSX)

## EPIC 10 — Storage: Cloudflare R2 🟡
*Upload/ganti foto (admin-only).*

- [ ] **10.1** Helper `src/lib/storage/r2.ts` (S3 client + presign)
- [ ] **10.2** Setup bucket + CORS + custom domain
- [ ] **10.3** `POST /api/upload` (presigned PUT, expired 5 menit)
- [ ] **10.4** Validasi tipe/ukuran file + naming convention (`folder/nim-*.jpg`)

## EPIC 11 — CSV Ingestion & Seeder 🟢
*Migrasi data Google Form.*

- [ ] **11.1** Parser CSV + mapping kolom → tabel
- [ ] **11.2** Pipeline sanitasi (WA, IG, tanggal)
- [ ] **11.3** Downloader image (Google Drive → R2)
- [ ] **11.4** Batch insert transaksional (students/contacts/profiles/emergencies)
- [ ] **11.5** CLI `scripts/seed-from-csv.ts` + flag `--dry-run`
- [ ] **11.6** `scripts/seed-auth.ts` (passcode + epoch + whitelist)

## EPIC 12 — Deployment & UI Readiness 🟢
*Go-live & kontrak untuk frontend.*

- [ ] **12.1** Set semua env di Netlify Dashboard
- [ ] **12.2** Build & deploy staging
- [ ] **12.3** Verifikasi koneksi pooling Supabase di production
- [ ] **12.4** Uji end-to-end guard (401/403/429)
- [ ] **12.5** Mock response + dokumentasi kontrak API untuk UI

---

## Ringkasan Epic

| Epic | Fokus | Prioritas | Bergantung pada |
| :--- | :--- | :---: | :--- |
| 1 | Foundation & Infrastructure | 🔴 | — |
| 2 | Database Schema & Migration | 🔴 | 1 |
| 3 | Validation Layer (Zod) | 🔴 | 2 |
| 4 | Auth Passcode (student) | 🔴 | 3 |
| 5 | Auth Admin (Whitelist + OTP) | 🔴 | 3 |
| 6 | Audit & Security Helpers | 🟡 | 4, 5 |
| 7 | Public API | 🟡 | 3 |
| 8 | Protected API | 🟡 | 4, 6 |
| 9 | Admin API | 🟡 | 5, 6 |
| 10 | Storage R2 | 🟡 | 5, 6 |
| 11 | CSV Ingestion & Seeder | 🟢 | 2, 3, 10 |
| 12 | Deployment & UI Readiness | 🟢 | semua |
