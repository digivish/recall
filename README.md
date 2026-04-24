# Recall Hero
# Automated recall detection and alerting for e-commerce sellers.

## Stack
- **Frontend:** React 19 + Vite + Tailwind CSS
- **Backend:** Python / FastAPI
- **DB:** PostgreSQL
- **LLM:** Gemini 3.0 Flash

## Quick Start

### 1. Install dependencies
```bash
# Backend
cd backend && pip install -r requirements.txt

# Frontend
cd frontend && npm install
```

### 2. Set environment
```bash
cp .env.example .env
# Fill in your keys
```

### 3. Database migrations
```bash
cd backend
alembic upgrade head
```

### 4. Run
```bash
# Backend (port 8000)
cd backend && uvicorn app.main:app --reload

# Frontend (port 5173)
cd frontend && npm run dev
```

## Deployment
See `scripts/` for PM2 + Nginx deployment scripts.

## Phases
1. Foundation — scaffolding, DB, auth
2. Onboarding — integrations (mock)
3. Recall engine — feed scrapers + LLM matching
4. Alert system — resolve flow, audit log, reports
5. Polish — E2E tests, deployment