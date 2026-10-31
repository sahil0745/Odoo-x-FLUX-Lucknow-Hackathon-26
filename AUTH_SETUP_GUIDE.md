# Brightloop Subscription Management System — Authentication Setup & Operations Guide

> **Document Version:** 1.1 (Security Hardened & Audited)  
> **Target Frameworks:** Express.js 4 (Node.js 20) & React 18 (Vite)  
> **Database ORM:** Prisma ORM 5.x on PostgreSQL 16

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

# Frontend URL & App Defaults
FRONTEND_URL="http://localhost:5173"
DEFAULT_CURRENCY="USD"

# JWT Secrets (Generate secure 64+ char random keys for production)
JWT_ACCESS_SECRET="default_dev_access_secret_min_32_characters_long_12345"
JWT_REFRESH_SECRET="default_dev_refresh_secret_min_32_characters_long_12345"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Optional SMTP Mailer (Leave blank in development for console logger adapter)
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="Brightloop Security <noreply@brightloop.local>"
```

> [!NOTE]
> In production environments (`NODE_ENV=production`), `CORS_ORIGIN` must match `FRONTEND_URL` and wildcard `*` is strictly forbidden when credentials are enabled. Furthermore, valid SMTP credentials are mandatory for password reset operation.

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

## 3. Running Authentication & Security Tests

Execute the automated test suite covering password policy, token cryptography, persistent session store, token family rotation, RBAC matrix, and API middleware:

```powershell
cd backend
npm test
```

### Current Verification Results:
- **Test Files:** 8 passed (8 total)
  - `tests/health.test.ts` (2 tests)
  - `tests/database-integrity.test.ts` (4 tests)
  - `tests/password-policy.test.ts` (6 tests)
  - `tests/token-security.test.ts` (5 tests)
  - `tests/auth-validation.test.ts` (4 tests)
  - `tests/rbac-permissions.test.ts` (8 tests)
  - `tests/auth-api.test.ts` (8 tests)
  - `tests/security-audit.test.ts` (10 tests)
- **Tests Executed:** 47 passed
- **Status:** 100% Passing

---

## 4. Pending Live PostgreSQL Integration Steps

As noted, PostgreSQL activation is deferred while host database services are offline. When PostgreSQL 16 is started:

1. **Apply Migrations to Live Database:**
   ```powershell
   cd backend
   npx prisma migrate dev --name init_and_sessions
   ```
   *Note: This will provision both the initial 24 business domain tables and the new `refresh_token_sessions` table.*
2. **Execute Administrator Bootstrap:**
   ```powershell
   npx tsx scripts/bootstrap_admin.ts
   ```
3. **Verify Live Database Sign-in:**
   Run the dev servers (`npm run dev` in backend and frontend) and log in with the bootstrapped admin credentials.
