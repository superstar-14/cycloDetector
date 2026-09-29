"""
History API endpoints.

Past cyclone explorer, pattern analysis, and analog search.
"""
from __future__ import annotations

from fastapi import APIRouter, Query
from typing import List, Optional

router = APIRouter()


@router.get("/cyclones")
async def list_historical_cyclones(
    year_start: int = Query(1982, ge=1982),
    year_end: int = Query(2024, le=2030),
    basin: Optional[str] = None,
    min_category: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
):
    """List historical NIO cyclones from IBTrACS data with filters."""
    # In production: query storms table with status='HISTORICAL'
    return {
        "total": 0,
        "cyclones": [],
        "filters": {
            "year_range": [year_start, year_end],
            "basin": basin,
            "min_category": min_category,
        },
        "note": "Historical data requires IBTrACS import",
    }


@router.get("/analogs")
async def find_analog_cyclones(
    storm_id: Optional[str] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    wind_kt: Optional[float] = None,
    month: Optional[int] = None,
    limit: int = 5,
):
    """
    Find the most similar historical cyclones to a given storm.
    Uses track shape, intensity, environment similarity (Model 4).
    """
    return {
        "query_storm": storm_id,
        "analogs": [],
        "note": "Analog search requires Model 4 (Pattern Analyzer) training",
    }


@router.get("/clusters")
async def get_track_clusters():
    """Get pre-computed track clusters from Model 4."""
    return {
        "clusters": [],
        "note": "Track clustering requires Model 4 training on IBTrACS data",
    }


@router.get("/seasonality")
async def get_seasonality_stats():
    """Seasonal distribution of NIO cyclone activity."""
    return {
        "monthly_counts": {
            "Jan": 0.2, "Feb": 0.1, "Mar": 0.1, "Apr": 0.5,
            "May": 1.2, "Jun": 0.8, "Jul": 0.3, "Aug": 0.2,
            "Sep": 0.5, "Oct": 1.5, "Nov": 2.1, "Dec": 0.8,
        },
        "peak_seasons": ["Apr-Jun (pre-monsoon)", "Oct-Dec (post-monsoon)"],
        "average_annual": 5,
        "source": "IBTrACS 1982-2024",
    }
