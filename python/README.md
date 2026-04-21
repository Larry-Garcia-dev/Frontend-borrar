# AI Model Generator Internal

Internal tool for asynchronous AI photo and video generation. Built with FastAPI, Reflex, PostgreSQL, Celery, Redis, and Alibaba Model Studio.

## Architecture

```
ai-model-generator-internal/
├── docker-compose.yml      # Orchestrates PostgreSQL and Redis
├── backend/                # FastAPI application
│   ├── main.py             # FastAPI app entry point
│   ├── requirements.txt
│   ├── api/
│   │   ├── router.py       # Aggregates all endpoint routers
│   │   └── endpoints/
│   │       ├── auth/       # Authentication endpoints (login, OAuth)
│   │       ├── generation/ # Image/video generation endpoints
│   │       └── admin/      # Admin-only endpoints
│   ├── core/
│   │   ├── config.py       # Pydantic BaseSettings (reads .env)
│   │   └── security.py     # JWT creation/verification, Google OAuth boilerplate
│   ├── models/
│   │   ├── user.py         # SQLAlchemy User ORM model
│   │   ├── media.py        # SQLAlchemy Media ORM model
│   │   └── task.py         # SQLAlchemy Task ORM model
│   ├── services/
│   │   ├── alibaba_api.py  # Alibaba Model Studio API client
│   │   ├── prompt_engineer.py # Prompt building and transformation logic
│   │   └── storage.py      # File/object storage abstraction
│   └── worker/
│       ├── celery_app.py   # Celery application factory
│       └── tasks.py        # Async generation tasks
└── frontend/               # Reflex application
    ├── rxconfig.py         # Reflex configuration
    ├── requirements.txt
    ├── frontend/
    │   ├── frontend.py     # Main routing and page definitions
    │   └── components/     # Reusable UI components
    └── state/
        └── base_state.py   # Auth state, JWT handling, task polling
```

## Services

| Service    | Description                                        | Port  |
|------------|----------------------------------------------------|-------|
| PostgreSQL | Relational database for users, media, and tasks    | 5432  |
| Redis      | Message broker and result backend for Celery       | 6379  |
| Backend    | FastAPI application served by Uvicorn              | 8000  |
| Worker     | Celery worker processing generation tasks          | —     |
| Frontend   | Reflex web application                             | 3000  |

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Python 3.11+

### 1. Start infrastructure

```bash
docker-compose up -d
```

This starts PostgreSQL (port 5432) and Redis (port 6379).

### 2. Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your secrets
uvicorn main:app --reload --port 8000
```

### 3. Celery worker

```bash
cd backend
celery -A worker.celery_app worker --loglevel=info
```

### 4. Frontend

Reflex 0.6+ is **not compatible with Python 3.9** (import fails with `TypeError: unhashable type: 'list'` inside `reflex.event`). Use **Python 3.10+**; **3.11+** matches the backend prerequisite.

```bash
cd frontend
# Prefer an explicit 3.11+ binary if your default `python` is still 3.9:
# python3 -m venv .venv && source .venv/bin/activate
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
reflex run
```

## Environment Variables

Create a `.env` file inside `backend/` based on the settings defined in `backend/core/config.py`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_generator
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=change-me-in-production
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
ALIBABA_API_KEY=your-alibaba-api-key
STORAGE_BUCKET=your-storage-bucket
```

## License

Internal use only.
