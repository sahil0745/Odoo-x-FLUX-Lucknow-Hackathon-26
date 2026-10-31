# Brightloop Subscription Management System — Production Deployment Guide

This guide details the step-by-step procedure for deploying the **Brightloop Monorepo** across **Vercel** (Frontend) and **Render** (Backend API + Managed PostgreSQL 16).

---

## Architecture Overview

```
                                      ┌─────────────────────────────────────┐
                                      │         Vercel (Frontend SPA)       │
                                      │  https://<your-app>.vercel.app      │
                                      └──────────────────┬──────────────────┘
                                                         │
                                                         │ HTTPS / REST (Cookies + Bearer)
                                                         ▼
                                      ┌─────────────────────────────────────┐
                                      │       Render Web Service (API)      │
                                      │  https://<your-api>.onrender.com    │
                                      └──────────────────┬──────────────────┘
                                                         │
                                                         │ Internal Private Network
                                                         ▼
                                      ┌─────────────────────────────────────┐
                                      │     Render Managed PostgreSQL 16    │
                                      │  brightloop_subscriptions           │
                                      └─────────────────────────────────────┘
```

---

## 1. Deploying the Backend & Database to Render

### Option A: Render Blueprint (Infrastructure as Code - Recommended)
The repository includes a ready-to-use `render.yaml` blueprint.

1. Log in to [Render](https://render.com).
2. Go to **Blueprints** → **New Blueprint Instance**.
3. Connect your GitHub repository (`sahil0745/Odoo-x-FLUX-Lucknow-Hackathon-26` or your fork).
4. Select the branch (e.g. `shreyansh/billing-invoices-deployment` or merged branch).
5. Render will automatically detect `render.yaml` and configure:
   - **Database**: Managed PostgreSQL instance `brightloop-postgres`
   - **Web Service**: Node.js service `brightloop-backend-api` with automatic database URL linking and secret key generation.
6. Click **Apply**.

### Option B: Manual Service Creation
If setting up manually without Blueprint:

#### 1. PostgreSQL Database
- Click **New +** → **PostgreSQL**.
- **Name**: `brightloop-postgres`
- **Database**: `brightloop_subscriptions`
- **User**: `brightloop_user`
- **Region**: Oregon (or your preferred region)
- Save and copy the **Internal Database URL** (e.g. `postgresql://...`).

#### 2. Backend Web Service
- Click **New +** → **Web Service**.
- Connect your GitHub repository.
- Configure settings:
  - **Name**: `brightloop-backend-api`
  - **Runtime**: `Node`
  - **Region**: Same as database (Oregon)
  - **Build Command**:
    ```bash
    npm install && npm --prefix backend install && npm --prefix backend run prisma:generate && npm --prefix backend run build
    ```
  - **Start Command**:
    ```bash
    npm --prefix backend run start
    ```
  - **Health Check Path**: `/api/v1/health`
- Add Environment Variables:
  | Variable | Value / Description |
  | :--- | :--- |
  | `NODE_ENV` | `production` |
  | `PORT` | `10000` |
  | `API_PREFIX` | `/api/v1` |
  | `DATABASE_URL` | *Your Render PostgreSQL Internal Connection String* |
  | `JWT_ACCESS_SECRET` | *Strong random string (min 32 characters)* |
  | `JWT_REFRESH_SECRET` | *Strong random string (min 32 characters)* |
  | `JWT_ACCESS_EXPIRES_IN` | `15m` |
  | `JWT_REFRESH_EXPIRES_IN` | `7d` |
  | `CORS_ORIGIN` | `https://<your-frontend-app>.vercel.app` |
  | `FRONTEND_URL` | `https://<your-frontend-app>.vercel.app` |
  | `DEFAULT_CURRENCY` | `USD` |

#### 3. Run Database Migrations on Render
In the Render Web Service dashboard, open the **Shell** tab and run:
```bash
npx --prefix backend prisma migrate deploy
```
*(Optional: run seed script if available to populate initial plans and roles).*

---

## 2. Deploying the Frontend to Vercel

The frontend is a modern React 18 + Vite SPA configured with `vercel.json` for routing rewrites and security headers.

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import your GitHub repository.
4. In the **Configure Project** screen:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (leave as root; `vercel.json` controls build output)
   - **Build Command**: `npm --prefix frontend install && npm --prefix frontend run build`
   - **Output Directory**: `frontend/dist`
5. Under **Environment Variables**, add:
   | Variable | Value | Description |
   | :--- | :--- | :--- |
   | `VITE_API_BASE_URL` | `https://brightloop-backend-api.onrender.com/api/v1` | URL of your deployed Render backend API |
6. Click **Deploy**.

---

## 3. Post-Deployment Verification Checklist

1. **Backend Health Check**:
   - Access `https://<your-render-api>.onrender.com/api/v1/health`
   - Should return `{ "status": "ok", "timestamp": "...", "database": "connected" }`.
2. **CORS Validation**:
   - Ensure the Render environment variable `CORS_ORIGIN` matches your exact Vercel frontend URL (e.g. `https://brightloop.vercel.app`, no trailing slash).
3. **Frontend Routing**:
   - Open your Vercel deployment URL.
   - Navigate to `/invoices`, `/subscriptions`, `/billing/logs` and refresh the page to verify SPA rewrites work seamlessly.
4. **Automated Billing Engine Verification**:
   - Navigate to `/invoices` in the application.
   - Click **Run Billing Engine** to test immediate cycle processing against active subscriptions with duplicate prevention.
