"""
Celery tasks for data ingestion and model inference.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from ..celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.ingestion.tasks.ingest_gfs")
def ingest_gfs():
    """Ingest latest GFS 0.25° data for the NIO domain."""
    logger.info("Starting GFS ingestion at %s", datetime.now(timezone.utc))
    # In production: instantiate GFSConnector, fetch, store in MinIO/PostGIS
    return {"status": "pending", "message": "GFS ingestion task registered"}


@celery_app.task(name="app.ingestion.tasks.ingest_insat")
def ingest_insat():
    """Ingest latest INSAT-3D/3DR imagery from MOSDAC."""
    logger.info("Starting INSAT ingestion at %s", datetime.now(timezone.utc))
    return {"status": "pending", "message": "INSAT ingestion task registered"}


@celery_app.task(name="app.ingestion.tasks.run_live_tracker")
def run_live_tracker():
    """
    Run the live cyclone tracker pipeline:
    1. Model 1 on latest INSAT frame -> center, eye, parameters
    2. Associate with existing storm or create new
    3. Models 2 & 3 -> forecast
    4. Impact Engine -> district probabilities
    5. Push update via WebSocket
    """
    logger.info("Running live tracker at %s", datetime.now(timezone.utc))
    return {"status": "pending", "message": "Live tracker task registered"}
