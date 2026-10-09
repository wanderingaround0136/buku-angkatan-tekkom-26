import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

/**
 * Konektor database (runtime).
 *
 * Menggunakan `DATABASE_URL` (Supabase Transaction Pooler, port 6543).
 * Untuk operasi migrasi/push, Drizzle Kit memakai `DIRECT_URL` (lihat drizzle.config.ts).
 *
 * CATATAN: Skema tabel didefinisikan di `db/schema.ts` dan di-pass ke Drizzle
 * saat schema tersebut tersedia:
 *   import * as schema from "./schema";
 *   export const db = drizzle(client, { schema });
 */

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Salin .env.example ke .env dan isi nilainya.",
  );
}

// `prepare: false` diperlukan untuk kompatibilitas dengan Supabase pooler (pgbouncer).
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client);

export { client };
