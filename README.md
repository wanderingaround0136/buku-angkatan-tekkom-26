# Documentation Directory

Welcome to the backend architecture & planning documentation for **Web Buku Angkatan**.

All primary architectural documents, API specs, database schemas, and developer guides live inside this `/docs` folder:

- 🏗️ **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)**: Tech stack, Supabase PostgreSQL ERD, RLS security policies, Cloudflare R2 file upload architecture, Netlify deployment setup, and Zod validation specs.
- 📡 **[API_CONTRACTS.md](./docs/API_CONTRACTS.md)**: RESTful API contracts, JSON responses, error handling, R2 upload specs, and strict privacy guarantees.
- 🧹 **[SEEDING_GUIDE.md](./docs/SEEDING_GUIDE.md)**: Google Form CSV data ingestion workflow, sanitization rules (WhatsApp, Instagram, dates), media migration, and `scripts/seed-from-csv.ts` guide.
- 🛠️ **[CONTRIBUTING.md](./docs/CONTRIBUTING.md)**: Development workflow, environment setup, database migrations, vibe coding rules, and code style conventions.
- 📋 **[PROJECT_PLAN.md](./docs/PROJECT_PLAN.md)**: Step-by-step roadmap for database provisioning, API handlers, data ingestion, and future UI integration readiness.

---

## Tech Stack Overview

- **Framework**: Next.js App Router (TypeScript)
- **Database**: Supabase (PostgreSQL Free Tier) + Prisma / Drizzle ORM
- **Object Storage**: Cloudflare R2 (Free Tier) via `@aws-sdk/client-s3`
- **Hosting / Deployment**: Netlify (Serverless Functions)
- **Validation**: Zod
