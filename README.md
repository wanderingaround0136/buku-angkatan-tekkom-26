# Web Buku Angkatan — Backend

Backend untuk **Web Buku Angkatan**, dibangun dari data Google Form yang sudah dikumpulkan. Project ini menyediakan database, API, autentikasi (Angkatan Passcode & Admin OTP), serta manajemen aset foto.

**Quick info:** Next.js (App Router) · TypeScript · Supabase (PostgreSQL) · Drizzle ORM · Cloudflare R2 · Netlify

---

## 📑 Daftar Isi

1. [Prerequisites](#1-prerequisites-persiapan-awal)
2. [Clone Repo & Masuk Folder](#2-clone-repo--masuk-folder)
3. [Setup Environment Variables](#3-setup-environment-variables)
4. [Install Dependencies](#4-install-dependencies)
5. [Setup & Push Database](#5-setup--push-database)
6. [Jalankan Seeder (Dummy Data)](#6-jalankan-seeder-dummy-data)
7. [Jalankan Development Server](#7-jalankan-development-server)
8. [Troubleshooting Cepat](#8-troubleshooting-cepat)
9. [Dokumentasi Lanjutan (folder docs/)](#9--dokumentasi-lanjutan-folder-docs)

---

## 1. Prerequisites (Persiapan Awal)

> 🧭 **Untuk pemula:** install semua tool di bawah ini dulu **sebelum** mulai. Kalau sudah ada, langsung lanjut ke langkah berikutnya.

| Tool | Versi / Catatan | Cara Cek |
| :--- | :--- | :--- |
| **Node.js** | Versi **20 LTS** (jangan lebih lama) | `node -v` |
| **pnpm** | Package manager project ini (`pnpm@11`) | `pnpm -v` |
| **Git** | Versi terbaru | `git --version` |
| **Code Editor** | **VS Code** atau **OpenCode** | — |

**Cara install singkat:**
- Node.js: unduh installer dari [nodejs.org](https://nodejs.org) (pilih **LTS**), lalu install seperti biasa.
- pnpm: setelah Node.js terinstall, jalankan `npm install -g pnpm` (atau lihat [pnpm.io/installation](https://pnpm.io/installation)).
- Git: unduh dari [git-scm.com](https://git-scm.com).
- VS Code: unduh dari [code.visualstudio.com](https://code.visualstudio.com).

Setelah install, **tutup lalu buka ulang terminal**, dan cek dengan perintah di kolom "Cara Cek" di atas. Jika muncul angka versi, berarti sudah berhasil.

**Akun yang perlu disiapkan (gratis):**
- **Supabase** — untuk database PostgreSQL → [supabase.com](https://supabase.com)
- **Cloudflare** — untuk penyimpanan foto (R2) → [cloudflare.com](https://cloudflare.com)
- **Resend** — untuk kirim OTP email admin (opsional saat development) → [resend.com](https://resend.com)

---

## 2. Clone Repo & Masuk Folder

Buka terminal, lalu jalankan:

```bash
git clone <url-repo-ini>
cd project-buku-angkatan
```

- `git clone` = mengunduh seluruh kode project ke komputermu.
- `cd` = masuk ke folder project yang baru diunduh.

> Ganti `<url-repo-ini>` dengan URL repo dari GitHub/GitLab.

---

## 3. Setup Environment Variables

Environment variables adalah "pengaturan rahasia" yang dibutuhkan aplikasi (seperti alamat database & kunci). Kita copy dari template:

```bash
cp .env.example .env
```

Lalu buka file `.env` di editor dan isi nilainya.

### ✅ Variabel minimal yang WAJIB diisi (agar server lokal bisa menyala)

| Variabel | Wajib? | Keterangan |
| :--- | :---: | :--- |
| `DATABASE_URL` | ✅ **Wajib** | Alamat koneksi database (Supabase pooler) |
| `DIRECT_URL` | ✅ **Wajib** | Alamat koneksi langsung untuk migrasi |
| `AUTH_JWT_SECRET` | ✅ **Wajib** | Kunci penanda tangan sesi. Generate dengan `openssl rand -base64 32` |
| `RESEND_API_KEY` | ⚪ Opsional* | *Wajib hanya jika menguji login admin (OTP email) |
| `RESEND_FROM_EMAIL` | ⚪ Opsional* | *Wajib hanya jika menguji login admin |
| `R2_ACCOUNT_ID` | ⚪ Opsional* | *Wajib hanya jika menguji upload foto |
| `R2_ACCESS_KEY_ID` | ⚪ Opsional* | *Wajib hanya jika menguji upload foto |
| `R2_SECRET_ACCESS_KEY` | ⚪ Opsional* | *Wajib hanya jika menguji upload foto |
| `R2_BUCKET_NAME` | ⚪ Opsional* | *Wajib hanya jika menguji upload foto |
| `R2_PUBLIC_DOMAIN` | ⚪ Opsional* | *Wajib hanya jika menguji upload foto |

> 💡 **Tips:** Untuk sekadar menyalakan server lokal dan mengembangkan API, kamu cukup mengisi 3 variabel wajib (`DATABASE_URL`, `DIRECT_URL`, `AUTH_JWT_SECRET`). Variabel R2 & Resend bisa diisi nanti saat kamu butuh menguji fitur tersebut.

> ⚠️ **Jangan pernah commit file `.env`** ke Git — file ini berisi rahasia. Yang di-commit hanya `.env.example` (template kosong).

**Cara mendapatkan `DATABASE_URL` & `DIRECT_URL` dari Supabase:**
1. Buka project di [supabase.com](https://supabase.com) → **Settings** → **Database**.
2. Salin **Connection Pooling** URL (port `6543`) → tempel ke `DATABASE_URL`.
3. Salin **Direct Connection** URL (port `5432`) → tempel ke `DIRECT_URL`.
4. Ganti `[YOUR-PASSWORD]` dengan password database project kamu.

---

## 4. Install Dependencies

Install semua library yang dibutuhkan project:

```bash
pnpm install
```

Proses ini akan mengunduh semua package. Tunggu sampai selesai (biasanya 1–3 menit). Kalau muncul banyak tulisan lalu berhenti tanpa error, berarti berhasil.

---

## 5. Setup & Push Database

> ⚠️ **Status:** Skema tabel (`db/schema.ts`) belum dibuat — sedang dikerjakan secara terpisah. Langkah ini baru bisa dijalankan setelah skema tersedia.

Langkah ini membuat tabel-tabel database sesuai skema project. Jalankan:

```bash
pnpm db:push
```

- Perintah ini membaca skema Drizzle di `db/schema.ts` dan **membuat/menyinkronkan tabel** ke database Supabase kamu.
- Jika diminta konfirmasi, jawab **yes**.

> ⚠️ Pastikan `DATABASE_URL` dan `DIRECT_URL` sudah benar di `.env` sebelum langkah ini, jika tidak akan muncul error koneksi.

---

## 6. Jalankan Seeder (Dummy Data)

> ⚠️ **Status:** Seeder belum tersedia — menunggu skema database selesai dibuat. Script `db:seed` akan ditambahkan kemudian.

Seeder **development** akan mengisi database dengan data contoh supaya kamu bisa langsung mengembangkan & menguji API tanpa menunggu data asli. Rencananya dijalankan dengan:

```bash
pnpm db:seed
```

Seeder ini nantinya akan mengisi:
- Beberapa data siswa dummy (nama, NIM, kelas, dll.)
- Passcode angkatan (dummy) — dipakai untuk uji akses halaman directory/galeri
- Beberapa email admin dummy di whitelist — dipakai untuk uji login admin

> 📌 **Catatan:** Seeder **khusus untuk development**. Untuk mengisi data **produksi** dari hasil ekspor Google Form asli, gunakan script seeder terpisah yang mengambil data dari CSV Google Form (lihat [docs/SEEDING_GUIDE.md](./docs/SEEDING_GUIDE.md)).

---

## 7. Jalankan Development Server

Nyalakan server lokal:

```bash
pnpm dev
```

Lalu buka browser ke:

```
http://localhost:3000
```

- Halaman **Landing Page** (`/`) bisa dibuka siapa saja.
- Untuk mengakses directory/galeri, masukkan **passcode dummy** yang di-set oleh seeder.
- Untuk masuk admin, gunakan salah satu email dummy di whitelist.

**Alternatif (simulasi Netlify):** jika ingin meniru environment Netlify secara lokal:

```bash
npx netlify dev
```

> Untuk menghentikan server: tekan `Ctrl + C` di terminal.

---

## 8. Troubleshooting Cepat

| Gejala | Kemungkinan Penyebab | Solusi |
| :--- | :--- | :--- |
| **Port 3000 sudah terpakai** | Ada proses lain yang jalan di port itu | Tutup proses lama, atau jalankan `pnpm dev -- -p 3001` untuk ganti port |
| **Koneksi database gagal** | `DATABASE_URL`/`DIRECT_URL` salah, atau IP belum diizinkan | Cek ulang string koneksi di `.env`; pastikan password benar |
| **Env tidak terbaca / undefined** | Lupa copy `.env` dari template | Pastikan file `.env` sudah ada di root project dan terisi |
| **Skema tidak ditemukan (`db/schema.ts`)** | Skema belum dibuat | Skema dikerjakan terpisah; lihat [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) Section 2 |
| **Error Drizzle client / skema tidak ketemu** | Perlu generate ulang | Jalankan `pnpm db:generate` lalu ulangi push |
| **Login admin tidak mengirim OTP** | `RESEND_API_KEY` belum diisi | Isi `RESEND_API_KEY` & `RESEND_FROM_EMAIL`, atau uji fitur non-admin dulu |
| **Upload foto gagal** | Variabel `R2_*` belum diisi | Isi semua variabel `R2_*` di `.env` |
| **`pnpm install` error** | Versi Node.js tidak sesuai | Pastikan Node.js versi **20 LTS** (`node -v`) |

> 💡 Kalau masih stuck: cek pesan error di terminal dari baris paling bawah, lalu cari kata kuncinya di dokumentasi `docs/` atau tanyakan ke tim.

---

## 9. 📚 Dokumentasi Lanjutan (folder `docs/`)

> Ingin memahami arsitektur, kontrak API, atau rencana pengerjaan secara lebih dalam? Semua ada di folder [`docs/`](./docs).

| Dokumen | Isi |
| :--- | :--- |
| 🏗️ **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** | Tech stack, ERD database, skema RLS, arsitektur upload R2, RBAC, keamanan |
| 📡 **[API_CONTRACTS.md](./docs/API_CONTRACTS.md)** | Spesifikasi seluruh endpoint API + format JSON request/response |
| 🧹 **[SEEDING_GUIDE.md](./docs/SEEDING_GUIDE.md)** | Cara migrasi data dari CSV Google Form + aturan sanitasi data |
| 🛠️ **[CONTRIBUTING.md](./docs/CONTRIBUTING.md)** | Git Flow, konvensi commit, dan aturan Vibe Coding |
| 📋 **[PROJECT_PLAN.md](./docs/PROJECT_PLAN.md)** | Roadmap pengerjaan backend per milestone |
| ✅ **[IMPLEMENTATION_PLAN.md](./docs/IMPLEMENTATION_PLAN.md)** | Breakdown task per Epic dalam bentuk checklist |

---

## Tech Stack Overview

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Database**: Supabase (PostgreSQL Free Tier)
- **ORM**: Drizzle ORM + Drizzle Kit (driver `postgres`)
- **Auth**: Custom JWT (`jose`, HttpOnly cookie) — Angkatan Passcode untuk student · Whitelist email + OTP (Resend) untuk admin
- **Object Storage**: Cloudflare R2 (Free Tier) via `@aws-sdk/client-s3`
- **Email**: Resend (OTP admin)
- **Hosting / Deployment**: Netlify (Serverless Functions)
- **Validation**: Zod
- **Package Manager**: pnpm
- **Frontend Stack**: _(akan ditambahkan seiring pengembangan UI/UX)_

**Struktur database & tooling (saat ini):**

```
project-buku-angkatan/
├── app/                    # Next.js App Router (di root, bukan src/)
├── db/
│   └── index.ts            # Konektor Drizzle client (runtime)
│                           # (db/schema.ts → akan dibuat terpisah)
├── drizzle.config.ts       # Konfigurasi Drizzle Kit (pakai DIRECT_URL)
├── .env.example            # Template environment variables
└── docs/                   # Source of Truth (arsitektur & spesifikasi)
```

> ℹ️ **Catatan:** Konektor database (`db/index.ts`) sudah siap. **Skema tabel (`db/schema.ts`)** dikerjakan secara terpisah — lihat [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) Section 2 untuk rancangan tabel.

**Script database (`package.json`):**

| Script | Fungsi |
| :--- | :--- |
| `pnpm db:generate` | Generate file migrasi dari `db/schema.ts` |
| `pnpm db:push` | Push skema langsung ke database |
| `pnpm db:migrate` | Jalankan migrasi yang sudah di-generate |
| `pnpm db:studio` | Buka Drizzle Studio (GUI database) |

---

## Access Model (3 Roles)

| Role | Autentikasi | Cakupan |
| :--- | :--- | :--- |
| `guest` | Tanpa auth | **Landing Page** saja |
| `student` | Angkatan Passcode → JWT cookie | Directory, Galeri, Detail Profil |
| `admin` | Whitelist email + OTP (Resend) → JWT cookie | Admin Dashboard + seluruh data (termasuk kontak darurat) |

> 🔒 No WA pribadi, alamat kost, dan kontak darurat **hanya** dapat diakses admin. Semua aksi mutasi data & upload gambar juga admin-only. Akses dapat dicabut seketika via `auth_epoch` (token epoch). Lihat [ARCHITECTURE.md](./docs/ARCHITECTURE.md) (Section 7 & 9) dan [API_CONTRACTS.md](./docs/API_CONTRACTS.md).
