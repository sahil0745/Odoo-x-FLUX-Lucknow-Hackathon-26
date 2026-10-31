# Development Workflow & Guidelines

## Prerequisites
- Node.js >= 20.x LTS
- npm >= 10.x
- PostgreSQL 16 (local, Docker, or hosted)

## Monorepo Development Commands
From root directory:
```bash
# Run both Backend & Frontend concurrently
npm run dev

# Run only Backend (port 5000)
npm run dev:backend

# Run only Frontend (port 5173)
npm run dev:frontend

# Typecheck both packages
npm run typecheck

# Lint both packages
npm run lint

# Build both packages
npm run build
```

## Security & Architecture Guidelines
1. Never commit `.env` or production secrets.
2. Validate all inputs via Zod on both client and server.
3. Keep financial calculations strictly in integer cents.
4. Keep controllers thin; domain logic lives in services.
5. All endpoints must conform to standard error format.
