# Database Documentation & PostgreSQL Setup Guide

## Overview
The system uses **PostgreSQL 16** with **Prisma ORM**.
All monetary amounts are represented as **integer cents** (e.g. `$10.00` = `1000`) to completely eliminate floating-point precision issues.

## PostgreSQL Setup Options

### Option A: Local Installation (Windows)
1. Download installer from [PostgreSQL Official Website](https://www.postgresql.org/download/windows/).
2. Run installer, select port `5432`, set password for `postgres` user (e.g. `postgres`).
3. Create database:
   ```bash
   psql -U postgres -c "CREATE DATABASE brightloop_subscriptions;"
   ```
4. Verify connection string in `backend/.env`:
   ```
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/brightloop_subscriptions?schema=public"
   ```

### Option B: Docker (Recommended for rapid dev)
```bash
docker run --name brightloop-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=brightloop_subscriptions \
  -p 5432:5432 \
  -d postgres:16-alpine
```

### Option C: Cloud Hosted PostgreSQL (Free Tier)
Use Supabase, Neon.tech, or Railway free PostgreSQL instance and paste the connection string into `backend/.env`.

## Status in Master Prompt 02
In accordance with Master Prompt 02 scope constraints, the full business domain schema (17 entities) will be implemented in **Master Prompt 03**. In this phase, the Prisma environment, client singleton, and database configuration are established and verified.
