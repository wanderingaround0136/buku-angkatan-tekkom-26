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
| **Validation** | Zod | Runtime Schema Validation & Sanitization |

---

## 2. Database Schema & ERD

### Entity Relationship Diagram (Mermaid)

```mermaid
erDiagram
    USERS ||--o| STUDENTS : "belongs to (optional)"
    STUDENTS ||--|| STUDENT_CONTACTS : "has"
    STUDENTS ||--|| STUDENT_PROFILES : "has"
    STUDENTS ||--|| STUDENT_EMERGENCIES : "has (RESTRICTED)"

    USERS {
        uuid id PK
        string email UK
        string password_hash
        enum role
        datetime created_at
        datetime updated_at
    }

    STUDENTS {
        uuid id PK
        uuid user_id FK "Nullable"
        string nim UK "Indexed"
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
        uuid student_id FK UK
        string whatsapp_number
        string instagram_handle
        text boarding_address
    }

    STUDENT_PROFILES {
        uuid id PK
        uuid student_id FK UK
        text_array hobbies
        text quote
        string favorite_food_place
        string spotify_track_url
        string formal_photo_url
        string informal_photo_url
    }

    STUDENT_EMERGENCIES {
        uuid id PK
        uuid student_id FK UK
        string parent_whatsapp
        string landlord_whatsapp
        datetime created_at
        datetime updated_at
    }
```

### Table Definitions & Enums

#### Enums
- `ClassEnum`: `A`, `B`, `C`, `D`
- `ReligionEnum`: `ISLAM`, `PROTESTANT`, `CATHOLIC`, `HINDU`, `BUDDHA`, `KHONGHUCU`, `OTHER`
- `RoleEnum`: `ADMIN`, `STUDENT`

#### Data Dictionary

1. **`students`** (Data Resmi Utama)
   - `id`: `UUID` (PK, default `gen_random_uuid()`)
   - `user_id`: `UUID` (FK -> `users.id`, NULLABLE)
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

2. **`student_contacts`** (Kontak Publik / Semi-Privat)
   - `id`: `UUID` (PK)
   - `student_id`: `UUID` (FK -> `students.id`, UNIQUE)
   - `whatsapp_number`: `VARCHAR(20)`
   - `instagram_handle`: `VARCHAR(50)`
   - `boarding_address`: `TEXT`

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
   - `parent_whatsapp`: `VARCHAR(20)`
   - `landlord_whatsapp`: `VARCHAR(20)`
   - `created_at`: `TIMESTAMPTZ` (default `now()`)
   - `updated_at`: `TIMESTAMPTZ` (default `now()`)

---

## 3. Database Connection & Supabase RLS Security

### Connection Pooling (Supabase)
Supabase menyediakan 2 mode URL koneksi:
- `DATABASE_URL`: Transaction Mode Pooler (Port `6543`) - Digunakan oleh App Runtime / Serverless API Next.js.
- `DIRECT_URL`: Direct Connection (Port `5432`) - Digunakan oleh Prisma/Drizzle CLI untuk menjalankan `db push` / `migrate`.

### Row Level Security (RLS) Policy Script

Jalankan script SQL ini di Supabase SQL Editor untuk mengunci tabel `student_emergencies`:

```sql
-- Enable RLS on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_emergencies ENABLE ROW LEVEL SECURITY;

-- Allow public read access to non-sensitive student data
CREATE POLICY "Public students read access" ON students
    FOR SELECT USING (true);

CREATE POLICY "Public student contacts read access" ON student_contacts
    FOR SELECT USING (true);

CREATE POLICY "Public student profiles read access" ON student_profiles
    FOR SELECT USING (true);

-- RESTRICT student_emergencies: ONLY authenticated service_role or admin user
CREATE POLICY "Restricted access to student emergencies" ON student_emergencies
    FOR SELECT
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'ADMIN');
```

---

## 4. Cloudflare R2 Storage & Upload Flow

### Architecture Flow Diagram (Presigned URL)

```
[ Frontend / App ] -------- 1. POST /api/upload --------> [ Next.js API Route ]
                                                                 |
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

  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
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
| `SUPABASE_URL` | `https://[ref].supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `R2_ACCOUNT_ID` | Cloudflare Account ID |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 API Token Access Key |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 API Token Secret Key |
| `R2_BUCKET_NAME` | `buku-angkatan-assets` |
| `R2_PUBLIC_DOMAIN` | `https://cdn.bukuangkatan.com` |
