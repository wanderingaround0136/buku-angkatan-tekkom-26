# Data Ingestion & CSV Seeding Guide

Panduan resmi migrasi dan penyemaian data dari Google Form (.csv) ke Supabase PostgreSQL & Cloudflare R2 untuk **Web Buku Angkatan**.

---

## 1. Overview Ingestion Pipeline

Proses penyemaian data dilakukan secara otomatis oleh script CLI `scripts/seed-from-csv.ts`.

```
[ Google Form Export (.csv) ] 
            │
            ▼
┌───────────────────────────────────────┐
│  1. CSV Parser & Row Normalization   │
└───────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────┐
│  2. Data Sanitization Rules           │
│     - WA -> '628xxx'                  │
│     - IG -> Username @ stripped       │
│     - Dates -> ISO Date Format        │
└───────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────┐
│  3. Media Processing (Drive -> R2)    │
│     - Download Image Stream           │
│     - Upload to Cloudflare R2 Bucket  │
│     - Get R2 Public CDN URL           │
└───────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────┐
│  4. Database Atomic Insertion         │
│     - students                        │
│     - student_contacts                │
│     - student_profiles                │
│     - student_emergencies             │
└───────────────────────────────────────┘
```

---

## 2. Data Sanitization Specifications

### A. Format Nomor WhatsApp (`sanitizeWhatsApp`)
- Hapus semua karakter non-digit.
- Konversi awalan:
  - `08123456789` ➔ `628123456789`
  - `+628123456789` ➔ `628123456789`
  - `8123456789` ➔ `628123456789`
- Validasi Regex: `/^628\d{8,12}$/`

### B. Handle Instagram (`sanitizeInstagram`)
- Hapus URL prefix (misal `https://instagram.com/`, `www.instagram.com/`).
- Hapus simbol `@` di awal.
- Trim trailing slash `/` dan whitespace.
- Contoh: `@ahmad.bekti/` ➔ `ahmad.bekti`

### C. Parsing Tanggal Lahir (`parseBirthDate`)
- Menangani variasi format input dari Google Form:
  - `17/08/2002` ➔ `2002-08-17`
  - `2002-08-17` ➔ `2002-08-17`
  - `17 Agustus 2002` ➔ Parse via `date-fns` atau ISO conversion.

---

## 3. CSV Column Mapping

Struktur mapping header Google Form CSV ke tabel database:

| Header CSV Google Form | Table & Column Target | Rules & Transform |
| :--- | :--- | :--- |
| `Nama Lengkap` | `students.full_name` | Trim String |
| `Nama Panggilan` | `students.nickname` | Trim String |
| `NIM` | `students.nim` | Uppercase, Unique Index |
| `Kelas` | `students.class_name` | Uppercase (`A`, `B`, `C`, `D`) |
| `Agama` | `students.religion` | Enum mapping (`ISLAM`, `CATHOLIC`, dll) |
| `Tempat Lahir` | `students.birth_place` | Trim String |
| `Tanggal Lahir` | `students.birth_date` | Date parse |
| `Kota Asal / Domisili` | `students.origin_city` | Trim String |
| `No WhatsApp Aktif` | `student_contacts.whatsapp_number` | Sanitize to `628xxx` |
| `Username Instagram` | `student_contacts.instagram_handle` | Sanitize Instagram |
| `Alamat Kost` | `student_contacts.boarding_address` | Text |
| `Hobi / Minat` | `student_profiles.hobbies` | Split by comma `,` to Array |
| `Quotes / Motto` | `student_profiles.quote` | Text |
| `Tempat Makan Favorit` | `student_profiles.favorite_food_place` | Text |
| `Link Spotify Lagu` | `student_profiles.spotify_track_url` | URL string |
| `Foto Formal (KTM)` | `student_profiles.formal_photo_url` | Download Google Drive -> R2 Upload |
| `Foto Non-Formal` | `student_profiles.informal_photo_url` | Download Google Drive -> R2 Upload |
| `No WA Orang Tua` | `student_emergencies.parent_whatsapp` | Sanitize to `628xxx` |
| `No WA Ibu/Bapak Kost` | `student_emergencies.landlord_whatsapp` | Sanitize to `628xxx` |

---

## 4. Execution Guide

### Prerequisites
Pastikan file `.env` sudah terisi dengan credential Supabase & Cloudflare R2.

### Step 1: Letakkan File Export CSV
Simpan file ekspor Google Form di folder data (atau buat folder `data/` jika belum ada):
```bash
mkdir -p data
cp ~/Downloads/data-buku-angkatan.csv data/input.csv
```

### Step 2: Run Seeder Command
Jalankan script menggunakan `tsx` / `ts-node`:

```bash
pnpm exec tsx scripts/seed-from-csv.ts data/input.csv
```

### Dry Run / Testing Mode
Untuk menguji sanitasi tanpa melakukan insert ke database & upload R2:

```bash
pnpm exec tsx scripts/seed-from-csv.ts data/input.csv --dry-run
```

---

## 5. Bootstrap Auth Data (Passcode & Admin Whitelist)

Selain data mahasiswa, ada dua data bootstrap yang perlu di-seed agar sistem akses berfungsi. Keduanya **bukan** dari CSV Google Form.

### A. Passcode Angkatan & Auth Epoch (`app_config`)
Disimpan sebagai bcrypt hash (bukan plaintext). Dua baris yang perlu disisipkan:

| key | value | deskripsi |
| :--- | :--- | :--- |
| `angkatan_passcode` | bcrypt hash passcode | Shared secret akses directory & galeri |
| `auth_epoch` | `1` (integer) | Epoch sesi; increment untuk mencabut semua sesi |

Script helper (opsional) `scripts/seed-auth.ts` dapat men-generate hash dan menyisipkan baris di atas, dipanggil dengan argumen passcode, contoh: `pnpm exec tsx scripts/seed-auth.ts --passcode "angkatan2022secret"`.

### B. Whitelist Admin (`admin_whitelist`)
Dikelola **langsung via SQL / Supabase Table Editor** (bukan via API dashboard). Whitelist bersifat **per email individu**, bukan domain.

**Menambah admin**: sisipkan baris baru dengan `email` (lowercase), `display_name`, dan `is_active = true`.

**Mencabut akses admin**: lakukan dua langkah:
1. Set `is_active = false` pada baris `admin_whitelist` dengan email terkait.
2. Increment nilai `auth_epoch` di `app_config` agar seluruh sesi admin yang sedang aktif langsung mati.
