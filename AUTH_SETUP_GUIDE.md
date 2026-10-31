# Brightloop Subscription Management System — Authentication Setup & Operations Guide

---

## 1. Environment Configuration

Ensure your `backend/.env` contains the required authentication parameters:

```env
# Application & Database
NODE_ENV=development
PORT=5000
API_PREFIX=/api/v1
CORS_ORIGIN=http://localhost:5173
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/brightloop_subscriptions?schema=public"

# Frontend URL
FRONTEND_URL="http://localhost:5173"
DEFAULT_CURRENCY="USD"

# JWT Secrets (Generate secure 64+ char random keys for production)
JWT_ACCESS_SECRET="default_dev_access_secret_min_32_characters_long_12345"
JWT_REFRESH_SECRET="default_dev_refresh_secret_min_32_characters_long_12345"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Optional SMTP Mailer (Leave blank to use console logger dev adapter)
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="Brightloop Security <noreply@brightloop.local>"
```

---

## 2. Super Administrator Bootstrap Provisioning

To create the initial Super Administrator account securely without hardcoding credentials in source control:

### Step 1: Provide Bootstrap Credentials in Environment
In Windows PowerShell:
```powershell
$env:BOOTSTRAP_ADMIN_EMAIL="admin@brightloop.io"
$env:BOOTSTRAP_ADMIN_PASSWORD="SuperSecretAdmin2026!"
```

### Step 2: Execute the Bootstrap Script
```powershell
cd backend
npx tsx scripts/bootstrap_admin.ts
```

### Expected Output:
```
=== BRIGHTLOOP ADMIN BOOTSTRAP PROVISIONING ===

[Bootstrap] Hashing password with bcrypt (cost factor 12)...

SUCCESS! Administrator account provisioned:
 - Email: admin@brightloop.io
 - Role: ADMIN
 - Department: Executive
 - Title: System Administrator
```

*Note: The script refuses to create a duplicate Administrator if one already exists.*

---

## 3. Running Authentication Tests

Execute the automated test suite covering password policy, token cryptography, RBAC matrix, and API middleware:

```powershell
cd backend
npm test
```

### Verification Counts:
- **Test Files:** 7 passed
- **Tests Executed:** 37 passed
- **Status:** 100% Passing

---

## 4. Pending Live PostgreSQL Integration Steps

As noted, the PostgreSQL daemon is currently offline on the host system. When PostgreSQL 16 is started (via Docker Desktop `docker compose up -d` or native PostgreSQL):

1. **Apply Existing Baseline Migration:**
   ```powershell
   cd backend
   npx prisma migrate deploy
   ```
2. **Execute Administrator Bootstrap:**
   ```powershell
   npx tsx scripts/bootstrap_admin.ts
   ```
3. **Verify Live Database Sign-in:**
   Start backend (`npm run dev`) and frontend (`npm run dev`), then sign in at `http://localhost:5173/login`.
