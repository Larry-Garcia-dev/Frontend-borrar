from celery import Celery
from celery.signals import worker_init

from core.config import settings
from core.database import init_db

celery_app = Celery(
    "ai_generator",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["worker.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    result_expires=3600,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)


@worker_init.connect
def _init_worker_schema(**_: object) -> None:
    """Ensure legacy local databases are synchronized before tasks run."""
    init_db()
