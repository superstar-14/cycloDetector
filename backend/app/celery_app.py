"""
Celery application configuration.
"""
from celery import Celery
from .config import settings

celery_app = Celery(
    "cyclone_detector",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    beat_schedule={
        # Ingest GFS every 6 hours
        "ingest-gfs": {
            "task": "app.ingestion.tasks.ingest_gfs",
            "schedule": 21600.0,  # 6 hours
        },
        # Poll INSAT every 30 minutes
        "ingest-insat": {
            "task": "app.ingestion.tasks.ingest_insat",
            "schedule": 1800.0,  # 30 min
        },
        # Run live tracker on new INSAT frame
        "live-tracker": {
            "task": "app.ingestion.tasks.run_live_tracker",
            "schedule": 1800.0,  # 30 min, after INSAT
        },
    },
)
