# Brightloop Subscription Management System

A production-grade, centralized software platform designed to automate the complete recurring revenue and subscription lifecycle for **Brightloop Software** — from product variants and tiered plans to automated billing, multi-payment reconciliation, and real-time revenue analytics.

Based on the [Subscription Management System Problem Statement](file:///C:/Users/Lenovo/Downloads/Subscription_Management_System.pdf) and the approved system architecture.

---

## 1. Project Overview & Business Context

Brightloop Software provides business software across a range of pricing models:
- **Billing frequencies**: Daily, Weekly, Monthly, and Yearly.
- **Add-ons & Variants**: Additive pricing models (e.g., base product + brand variant).
- **Client tiers**: Small shops on self-service plans to enterprise customers with negotiated quotation templates.
- **Lifecycle automation**: Fully automated billing engine preventing duplicate invoicing, enforcing tax and discount rules, tracking balances across partial payments, and providing executive revenue visibility.

---

## 2. Technology Stack

### Frontend
- **Framework**: React 18 (TypeScript)
- **Bundler & Tooling**: Vite 5.x
- **Styling**: Tailwind CSS 3.4 (with custom brand tokens & typography)
- **Routing**: React Router DOM 6.x
- **Icons**: Lucide React
- **HTTP Client**: Axios with centralized error transformation interceptors

### Backend
- **Runtime**: Node.js 20.x (LTS)
- **Framework**: Express.js 4.x
- **Language**: TypeScript 5.4+ (strict mode enabled)
- **Environment Validation**: Zod runtime schema verification
- **Security**: CORS explicit allowlisting, JSON limiters, centralized typed error masking
- **Logger**: Custom structured timestamped logging

### Database & ORM
- **Database Engine**: PostgreSQL 16 (ACID-compliant relational engine)
- **ORM**: Prisma ORM 5.x
- **Money Handling**: Stored strictly as **integer cents** (e.g. `$15.60` = `1560`) to eliminate IEEE 754 floating-point drift

---

## 3. Monorepo Folder Structure

```
subscription-management-system/
├── frontend/                     # React 18 + TypeScript + Vite SPA
│   ├── public/                   # Static assets
│   ├── src/
│   │   ├── assets/               # Images and design resources
│   │   ├── components/           # Reusable UI component library
│   │   │   ├── common/           # Shared presentation components
│   │   │   ├── layout/           # AppLayout, Header, Footer
│   │   │   └── ui/               # Button, Badge, Card, Spinner
│   │   ├── pages/                # WelcomePage, NotFoundPage
│   │   ├── features/             # Modular feature slices (auth, products, etc.)
│   │   ├── hooks/                # Custom React hooks
│   │   ├── services/             # Axios API client & endpoints
│   │   ├── routes/               # Declarative route configuration
│   │   ├── contexts/             # React context providers
│   │   ├── types/                # Frontend TypeScript type declarations
│   │   ├── utils/                # Formatters, helpers
│   │   ├── constants/            # Application constants
│   │   ├── App.tsx               # Root App wrapper
│   │   ├── main.tsx              # React DOM entry point
│   │   └── index.css             # Tailwind base & component layers
│   ├── index.html                # HTML5 entry with Inter font
│   ├── vite.config.ts            # Vite configuration
│   ├── tailwind.config.js        # Tailwind theme extension & colors
│   ├── postcss.config.js         # PostCSS plugins
│   ├── tsconfig.json             # TypeScript compiler settings
│   ├── .env.example              # Frontend environment template
│   └── package.json              # Frontend dependencies
│
├── backend/                      # Express.js + TypeScript REST API
│   ├── src/
│   │   ├── config/               # Zod env parser, Prisma connection manager
│   │   ├── controllers/          # Health controller (thin HTTP adapters)
│   │   ├── services/             # Domain business logic (Sprint 2+)
│   │   ├── repositories/         # Prisma query abstraction (Sprint 2+)
│   │   ├── routes/               # Versioned API routes (/api/v1)
│   │   ├── middleware/           # Error handler, 404 handler, request logger
│   │   ├── validators/           # Zod request payload schemas
│   │   ├── types/                # API and domain TypeScript types
│   │   ├── utils/                # AppError hierarchy, structured logger
│   │   ├── jobs/                 # Recurring billing schedulers (Sprint 4)
│   │   ├── integrations/         # Email & export integrations
│   │   ├── app.ts                # Express application factory & security
│   │   └── server.ts             # Server entry point & graceful shutdown
│   ├── prisma/
│   │   └── schema.prisma         # Datasource & client generator configuration
│   ├── tests/                    # Vitest integration tests (health, errors)
│   ├── tsconfig.json             # Backend TypeScript strict configuration
│   ├── .env.example              # Backend environment template
│   └── package.json              # Backend dependencies
│
├── docs/                         # Architecture & operational documentation
│   ├── architecture/             # Architecture reference & PDF mappings
│   ├── database/                 # PostgreSQL installation & setup guide
│   └── development/              # Monorepo developer guide
│
├── .gitignore                    # Comprehensive repository gitignore
├── .env.example                  # Monorepo root environment template
├── README.md                     # Project documentation (this file)
└── package.json                  # Root workspace orchestration scripts
```

---

## 4. Prerequisites

- **Node.js**: `v20.x` LTS or later (verified with `v20.10.0`)
- **npm**: `10.x` or later (verified with `10.2.3`)
- **PostgreSQL**: `16.x` (or Docker container / cloud connection)

---

## 5. Installation Instructions

1. **Clone or open the repository workspace**.
2. **Install all dependencies** across root, backend, and frontend with a single command:
   ```bash
   npm run install:all
   ```
   *Or install individually:*
   ```bash
   npm install                  # Root concurrently orchestrator
   cd backend && npm install    # Backend Express & Prisma
   cd ../frontend && npm install # Frontend React & Vite
   ```

---

## 6. Environment Variable Configuration

Copy the example environment files to active `.env` files:

```bash
# Backend environment
cp backend/.env.example backend/.env

# Frontend environment
cp frontend/.env.example frontend/.env
```

### Backend (`backend/.env`)
| Variable | Default Value | Description |
|---|---|---|
| `NODE_ENV` | `development` | Runtime environment (`development`, `production`, `test`) |
| `PORT` | `5000` | HTTP port for Express server |
| `API_PREFIX` | `/api/v1` | Versioned route prefix |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origins (comma-separated) |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/brightloop_subscriptions?schema=public` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | *(placeholder)* | Minimum 32-character secret for access tokens |
| `JWT_REFRESH_SECRET` | *(placeholder)* | Minimum 32-character secret for refresh tokens |

### Frontend (`frontend/.env`)
| Variable | Default Value | Description |
|---|---|---|
| `VITE_APP_NAME` | `Brightloop Subscription Management System` | Application title |
| `VITE_API_BASE_URL` | `http://localhost:5000/api/v1` | Backend REST API endpoint |
| `VITE_APP_ENV` | `development` | Frontend environment label |

---

## 7. PostgreSQL Database Setup

The backend connects to PostgreSQL via Prisma ORM.

### Option A: Local PostgreSQL (Windows)
1. Install PostgreSQL 16 from [postgresql.org](https://www.postgresql.org/download/windows/).
2. Create the database:
   ```bash
   psql -U postgres -c "CREATE DATABASE brightloop_subscriptions;"
   ```
3. Set your connection string in `backend/.env`.

### Option B: Docker Container (Fastest)
```bash
docker run --name brightloop-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=brightloop_subscriptions \
  -p 5432:5432 \
  -d postgres:16-alpine
```

*Note: In accordance with Master Prompt 02 guidelines, the Prisma client is configured but the complete business domain schema will be migrated in Master Prompt 03.*

---

## 8. Running the Application

### Start Both Frontend & Backend Concurrently (Recommended)
From the repository root:
```bash
npm run dev
```
- **Frontend SPA**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
- **API Health Check**: [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)

### Running Independently

#### Run Backend Only
```bash
npm run dev:backend
# or: cd backend && npm run dev
```

#### Run Frontend Only
```bash
npm run dev:frontend
# or: cd frontend && npm run dev
```

---

## 9. Build & Verification Commands

### Type-Checking (TypeScript Strict Mode)
```bash
npm run typecheck
# Checks both frontend and backend without emitting files
```

### Production Build
```bash
npm run build
# Compiles backend to backend/dist and bundles frontend to frontend/dist
```

### Automated Testing
```bash
npm run test
# Executes Vitest suites across backend and frontend
```

---

