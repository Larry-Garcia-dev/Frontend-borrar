"""Database engine, session factory, and declarative base."""

from __future__ import annotations

import os
from typing import Generator

from sqlalchemy import text
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:postgres@localhost:5432/ai_generator",
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""


engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=Session,
)


def get_db() -> Generator[Session, None, None]:
    """Yield a database session for FastAPI dependencies."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables if they do not exist."""
    # Import models so SQLAlchemy metadata is fully registered.
    from models import media, prompt, report, task, user  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _sync_legacy_schema()


def _sync_legacy_schema() -> None:
    """Best-effort schema sync for legacy local PostgreSQL databases."""
    if engine.dialect.name != "postgresql":
        return

    with engine.begin() as conn:
        def has_column(table: str, column: str) -> bool:
            return (
                conn.execute(
                    text(
                        "SELECT 1 FROM information_schema.columns "
                        "WHERE table_name = :table AND column_name = :column LIMIT 1"
                    ),
                    {"table": table, "column": column},
                ).first()
                is not None
            )

        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255)"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20)"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_limit INTEGER DEFAULT 10"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS used_quota INTEGER DEFAULT 0"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_unlimited BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS quota_reset_at TIMESTAMP WITH TIME ZONE"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS vendor_id UUID"))
        
        # --- NUEVA COLUMNA DE LÍMITE DE MODELOS ---
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS max_models_limit INTEGER DEFAULT 5 NOT NULL"))

        # Ensure role column is VARCHAR to support all roles including VENDOR
        conn.execute(text(
            "DO $$ BEGIN "
            "  ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(20) USING role::text; "
            "EXCEPTION WHEN others THEN NULL; "
            "END $$"
        ))
        if has_column("users", "google_sub"):
            conn.execute(
                text(
                    "UPDATE users SET google_id = google_sub "
                    "WHERE google_id IS NULL AND google_sub IS NOT NULL"
                )
            )
        
        # Actualizamos nombres a los nuevos Roles si vienen bases de datos heredadas
        if has_column("users", "is_admin"):
            conn.execute(
                text(
                    "UPDATE users SET role = CASE "
                    "WHEN COALESCE(is_admin, FALSE) THEN 'MACONDO_ADMIN' "
                    "ELSE 'MODELO' END "
                    "WHERE role IS NULL"
                )
            )
        else:
            conn.execute(text("UPDATE users SET role = 'MODELO' WHERE role IS NULL"))
        conn.execute(text("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'MODELO'"))
        conn.execute(text("ALTER TABLE users ALTER COLUMN role SET NOT NULL"))

        conn.execute(text("ALTER TABLE IF EXISTS media ADD COLUMN IF NOT EXISTS prompt TEXT"))
        conn.execute(text("ALTER TABLE IF EXISTS media ADD COLUMN IF NOT EXISTS original_prompt TEXT"))
        if has_column("media", "prompt") and has_column("media", "original_prompt"):
            conn.execute(
                text(
                    "UPDATE media SET original_prompt = prompt "
                    "WHERE original_prompt IS NULL AND prompt IS NOT NULL"
                )
            )
            conn.execute(
                text(
                    "UPDATE media SET prompt = original_prompt "
                    "WHERE prompt IS NULL AND original_prompt IS NOT NULL"
                )
            )
            conn.execute(
                text(
                    "UPDATE media SET prompt = 'Legacy generation', original_prompt = 'Legacy generation' "
                    "WHERE prompt IS NULL AND original_prompt IS NULL"
                )
            )
            conn.execute(text("ALTER TABLE media ALTER COLUMN prompt SET NOT NULL"))
            conn.execute(text("ALTER TABLE media ALTER COLUMN original_prompt SET NOT NULL"))

        conn.execute(text("ALTER TABLE IF EXISTS media ADD COLUMN IF NOT EXISTS cost_usd NUMERIC(10,6)"))
        conn.execute(text("ALTER TABLE IF EXISTS media ADD COLUMN IF NOT EXISTS model_used VARCHAR(100)"))
        conn.execute(text("ALTER TABLE IF EXISTS media ADD COLUMN IF NOT EXISTS edit_count INTEGER NOT NULL DEFAULT 0"))
        conn.execute(text("ALTER TABLE IF EXISTS media ADD COLUMN IF NOT EXISTS parent_media_id UUID"))

        # Image reports table
        conn.execute(text(
            """
            CREATE TABLE IF NOT EXISTS image_reports (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                media_id UUID REFERENCES media(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                reason TEXT NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                admin_note TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                reviewed_at TIMESTAMP WITH TIME ZONE
            )
            """
        ))

        # Prompt management tables
        conn.execute(text(
            """
            CREATE TABLE IF NOT EXISTS system_prompts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT FALSE,
                created_by VARCHAR(320) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
            """
        ))
        conn.execute(text(
            """
            CREATE TABLE IF NOT EXISTS prompt_templates (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL UNIQUE,
                content TEXT NOT NULL,
                description VARCHAR(500),
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_by VARCHAR(320) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
            """
        ))