# Brightloop Subscription Management System — Migration & Database Operations Guide

---

## 1. PostgreSQL Database Initialization

To spin up the PostgreSQL 16 database, choose one of the three supported deployment methods:

### Option A: Docker Compose (Recommended)
Make sure Docker Desktop or Docker Engine is active, then execute from project root:
```bash
# Start PostgreSQL 16 container in background
docker compose up -d

# Verify container health
docker compose ps
```
The container will launch `brightloop_postgres` on port `5432` with database `brightloop_subscriptions`.

### Option B: Local PostgreSQL (Windows / Linux / macOS)
1. Install PostgreSQL 16 via official installer or package manager (`apt-get install postgresql-16` / `brew install postgresql@16`).
2. Open terminal or `psql` command line:
   ```bash
   psql -U postgres -c "CREATE DATABASE brightloop_subscriptions;"
   ```
3. Update connection string in `backend/.env`:
   ```env
   DATABASE_URL="postgresql://postgres:your_password@localhost:5432/brightloop_subscriptions?schema=public"
   ```

### Option C: Cloud Hosted PostgreSQL (Neon / Supabase / AWS RDS)
1. Provision a free-tier PostgreSQL instance on [Neon.tech](https://neon.tech) or [Supabase](https://supabase.com).
2. Paste the provided pooled connection string directly into `backend/.env`:
   ```env
   DATABASE_URL="postgresql://user:password@ep-host.region.aws.neon.tech/brightloop_subscriptions?sslmode=require"
   ```

---

## 2. Migration Execution Commands

All migration commands are executed inside the `backend/` directory:

### Step 1: Validate Schema
```bash
cd backend
npx prisma validate
```

### Step 2: Generate Type-Safe Prisma Client
```bash
npx prisma generate
```

### Step 3: Apply Existing Baseline Migration (25 Verified Models)
The baseline migration is already pre-generated and verified in `backend/prisma/migrations/0_init/migration.sql` with `migration_lock.toml` configured for `provider = "postgresql"`.

Once PostgreSQL is active, execute:
```bash
# Apply the baseline migration to create all 25 tables, 11 enums, indexes, and constraints
npx prisma migrate deploy

# Verify migration state
npx prisma migrate status
```

*Note: For local development when adding subsequent schema changes, use `npx prisma migrate dev --name your_migration_name`. Never use `npx prisma migrate reset` in production or on databases with data.*

### Step 4: Inspect Database via Prisma Studio (GUI)
```bash
npx prisma studio
```
Opens interactive web interface at `http://localhost:5555` to view, filter, and verify all 25 tables and relations.

---

## 3. Production Deployment & CI/CD Migrations

For production deployments, **never** run `prisma migrate dev`. Use the idempotent deployment command:
```bash
npx prisma migrate deploy
```
This safely applies all pending versioned migrations without resetting or modifying existing production tables.

---

## 4. Backup & Disaster Recovery Best Practices

1. **Daily Logical Backups:**
   ```bash
   pg_dump -U postgres -d brightloop_subscriptions -Fc -f "backup_$(date +%Y%m%d_%H%M%S).dump"
   ```
2. **Point-in-Time Recovery (PITR):**
   Ensure PostgreSQL WAL archiving is enabled for enterprise production instances to protect revenue records against unexpected hardware failures.
