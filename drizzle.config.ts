import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env" });

/**
 * Drizzle Kit configuration.
 *
 * `dbCredentials.url` memakai `DIRECT_URL` (koneksi langsung, port 5432)
 * karena operasi migrate/push tidak kompatibel dengan transaction pooler.
 */

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
