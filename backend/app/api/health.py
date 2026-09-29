"""
Health API endpoints.

Data source health monitoring, job status, and system diagnostics.
"""
from __future__ import annotations

from datetime import datetime, timezone
from fastapi import APIRouter

router = APIRouter()


@router.get("/sources")
async def get_data_source_health():
    """
    Get health status of all data ingestion sources.
    Shows last success time, freshness, and credential status.
    """
    # In production: query data_source_health table
    sources = [
        {
            "name": "MOSDAC_INSAT",
            "display_name": "MOSDAC INSAT-3D/3DR/3DS",
            "type": "SATELLITE",
            "status": "CREDENTIALS_REQUIRED",
            "last_success": None,
            "last_attempt": None,
            "freshness_seconds": None,
            "credentials_required": True,
            "credentials_set": False,
        },
        {
            "name": "NOAA_GFS",
            "display_name": "NOAA GFS 0.25°",
            "type": "ENVIRONMENT",
            "status": "OFFLINE",
            "last_success": None,
            "last_attempt": None,
            "freshness_seconds": None,
            "credentials_required": False,
            "credentials_set": True,
        },
        {
            "name": "IBTRACS",
            "display_name": "IBTrACS (NOAA NCEI)",
            "type": "LABELS",
            "status": "OFFLINE",
            "last_success": None,
            "last_attempt": None,
            "freshness_seconds": None,
            "credentials_required": False,
            "credentials_set": True,
        },
        {
            "name": "GPM_IMERG",
            "display_name": "GPM IMERG Near-Real-Time",
            "type": "ENVIRONMENT",
            "status": "CREDENTIALS_REQUIRED",
            "last_success": None,
            "last_attempt": None,
            "freshness_seconds": None,
            "credentials_required": True,
            "credentials_set": False,
        },
        {
            "name": "GHRSST_MUR",
            "display_name": "PO.DAAC GHRSST MUR SST",
            "type": "ENVIRONMENT",
            "status": "CREDENTIALS_REQUIRED",
            "last_success": None,
            "last_attempt": None,
            "freshness_seconds": None,
            "credentials_required": True,
            "credentials_set": False,
        },
    ]
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "sources": sources,
        "overall_status": "DEGRADED",
    }


@router.get("/system")
async def system_health():
    """System-level health check."""
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "components": {
            "api": "ok",
            "database": "pending",
            "redis": "pending",
            "minio": "pending",
        },
    }
