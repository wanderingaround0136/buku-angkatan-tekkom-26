# Developer Contributing Guide

Panduan Git Flow, konvensi commit, dan Vibe Coding rules untuk tim dev & AI Assistant di project **Web Buku Angkatan**.

> 📖 **Butuh panduan setup & menjalankan project secara lokal?** Lihat [README.md](../README.md) di root project.

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

Struktur folder project (Next.js App Router + Drizzle, di root):

```
project-buku-angkatan/
├── docs/                       # Documentation (Source of Truth)
│   ├── ARCHITECTURE.md
│   ├── API_CONTRACTS.md
│   ├── SEEDING_GUIDE.md
│   ├── CONTRIBUTING.md
│   ├── PROJECT_PLAN.md
│   └── IMPLEMENTATION_PLAN.md
├── scripts/                    # CLI Utilities & Seeder produksi
│   └── seed-from-csv.ts
├── app/                        # Next.js App Router (di root, bukan src/)
│   ├── api/                    # Serverless API Route Handlers
│   │   ├── auth/
│   │   │   ├── passcode/route.ts
│   │   │   └── admin/{request-otp,verify-otp,logout}/route.ts
│   │   ├── public/stats/route.ts
│   │   ├── classes/route.ts
│   │   ├── students/{route.ts,[nim]/route.ts}
│   │   ├── gallery/route.ts
│   │   ├── upload/route.ts
│   │   └── admin/{students,emergencies,config,audit-logs,export}/route.ts
│   └── (pages)                 # Landing, /unlock, /directory, /gallery, /admin/*
├── db/                         # Drizzle ORM
│   ├── schema.ts               # Definisi tabel (source of truth skema)
│   ├── index.ts                # Drizzle client (runtime)
│   ├── seed.ts                 # Seeder development (data dummy)
│   └── migrations/             # Hasil generate drizzle-kit
├── lib/
│   ├── auth/                   # JWT, session, OTP, guards
│   │   ├── jwt.ts
│   │   ├── session.ts
│   │   ├── otp.ts
│   │   └── guards.ts
│   ├── email/                  # Resend client
│   │   └── resend.ts
│   ├── config/                 # app_config (passcode, auth_epoch)
│   │   └── app-config.ts
│   ├── audit/                  # audit_logs writer
│   │   └── logger.ts
│   ├── storage/                # Cloudflare R2 Helper
│   │   └── r2.ts
│   └── validations/            # Zod Schemas
│       └── student.ts
├── middleware.ts               # Route guard global (student & admin)
├── drizzle.config.ts           # Konfigurasi Drizzle Kit
├── netlify.toml                # Netlify Deployment Settings
├── .env.example                # Template Environment Variables
└── README.md
```

> ℹ️ **Catatan struktur**: Project ini **tidak** memakai folder `src/`. App Router ada di `app/` root, Drizzle di `db/`, dan helper di `lib/`. Path alias `@/*` mengarah ke root (`./*`).

---

## 3. Git Flow & Branching Strategy

### Branch Utama
- `main` — branch produksi. **Hanya** menerima merge dari PR yang sudah direview & lolos.
- `develop` — branch integrasi untuk pengembangan harian.

### Branch Kerja (feature/fix)
Buat branch baru dari `develop` untuk setiap pekerjaan:

| Tipe | Pola Nama | Contoh |
| :--- | :--- | :--- |
| Fitur baru | `feat/<deskripsi-singkat>` | `feat/student-directory-api` |
| Perbaikan bug | `fix/<deskripsi-singkat>` | `fix/whatsapp-sanitizer` |
| Dokumentasi | `docs/<deskripsi-singkat>` | `docs/api-contracts-update` |
| Maintenance | `chore/<deskripsi-singkat>` | `chore/update-deps` |

### Alur Kerja Standar
1. `git checkout develop` → `git pull` (pastikan branch terbaru).
2. `git checkout -b feat/nama-fitur`.
3. Kerjakan perubahan, lalu commit (lihat konvensi di bawah).
4. `git push origin feat/nama-fitur`.
5. Buka **Pull Request** ke `develop`, minta review minimal 1 orang.
6. Setelah di-approve & CI lolos → merge.

### Aturan Pull Request
- Judul PR mengikuti format commit (mis. `feat: add GET /api/students`).
- Sertakan deskripsi singkat: apa yang diubah & kenapa.
- Pastikan `pnpm build` / lint lolos sebelum minta review.
- Jangan merge PR ke `main` langsung tanpa lewat `develop` (kecuali hotfix darurat).

---

## 4. Git & Commit Guidelines

Gunakan format **Conventional Commits**:

- `feat:` Fitur baru (misal: `feat: add GET /api/students search query`)
- `fix:` Bug fix (misal: `fix: sanitize whatsapp starting with 8`)
- `docs:` Pembaruan dokumentasi
- `chore:` Maintenance config / dependency update
- `refactor:` Perubahan kode tanpa mengubah perilaku
- `test:` Menambah / memperbaiki test

**Contoh commit yang baik:**
```
feat: add passcode authentication endpoint
fix: handle whatsapp number starting with 8
docs: update RBAC section in architecture
```
