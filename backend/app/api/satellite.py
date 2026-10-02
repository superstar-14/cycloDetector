"""
Satellite Imagery Timeline API Endpoint.

Provides NASA GIBS satellite tile URLs and cloud pattern classifications
for tropical cyclone forecast track time points.
"""
from __future__ import annotations

import logging
import math
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()


class SatelliteTimePoint(BaseModel):
    label: str
    leadHours: int
    timestamp: str
    lat: float
    lon: float
    imageUrl: Optional[str] = None
    pattern: str
    isLatestAvailable: bool = False
    source: str = "NASA GIBS"
    error: Optional[str] = None


def lat_lon_to_tile(lat: float, lon: float, zoom: int = 7) -> tuple[int, int]:
    """Convert lat/lon coordinates to Web Mercator EPSG:3857 tile x/y at given zoom level."""
    # Clamp lat to Web Mercator valid range (-85.05112878 to 85.05112878)
    clamped_lat = max(-85.0511, min(85.0511, lat))
    n = 2 ** zoom
    x = int(math.floor((lon + 180.0) / 360.0 * n))
    lat_rad = math.radians(clamped_lat)
    y = int(math.floor((1.0 - math.log(math.tan(lat_rad) + (1.0 / math.cos(lat_rad))) / math.pi) / 2.0 * n))
    return x, y


def build_gibs_url(date_str: str, lat: float, lon: float, zoom: int = 7) -> str:
    """Build NASA GIBS VIIRS TrueColor WMTS tile URL."""
    x, y = lat_lon_to_tile(lat, lon, zoom)
    return (
        f"https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/"
        f"VIIRS_SNPP_CorrectedReflectance_TrueColor/default/{date_str}/"
        f"GoogleMapsCompatible_Level9/{zoom}/{y}/{x}.jpg"
    )


# Storm dataset mirror matching frontend historicalStorms.ts
# Ensuring single source of truth across the entire app
STORM_TIMELINE_DATA: dict[str, dict] = {
    "NIO_2019_BOB_FANI": {
        "name": "Fani",
        "pattern": "EYE",
        "status": "HISTORICAL",
        "track": [
            {"lead": 0,  "label": "Now",   "time": "2019-05-02T12:00:00Z", "lat": 16.5, "lon": 84.8, "pattern": "EYE"},
            {"lead": 6,  "label": "+6h",   "time": "2019-05-02T18:00:00Z", "lat": 17.3, "lon": 85.0, "pattern": "EYE"},
            {"lead": 12, "label": "+12h",  "time": "2019-05-03T00:00:00Z", "lat": 18.2, "lon": 85.3, "pattern": "EYE"},
            {"lead": 18, "label": "+18h",  "time": "2019-05-03T06:00:00Z", "lat": 19.3, "lon": 85.7, "pattern": "EYE"},
            {"lead": 24, "label": "+24h",  "time": "2019-05-03T12:00:00Z", "lat": 20.4, "lon": 86.1, "pattern": "EYE"},
            {"lead": 36, "label": "+36h",  "time": "2019-05-04T00:00:00Z", "lat": 22.3, "lon": 87.4, "pattern": "EYE"},
            {"lead": 48, "label": "+48h",  "time": "2019-05-04T12:00:00Z", "lat": 24.2, "lon": 89.2, "pattern": "EYE"},
            {"lead": 60, "label": "+60h",  "time": "2019-05-05T00:00:00Z", "lat": 25.8, "lon": 91.5, "pattern": "EYE"},
            {"lead": 72, "label": "+72h",  "time": "2019-05-05T12:00:00Z", "lat": 26.5, "lon": 93.2, "pattern": "EYE"},
        ],
    },
    "NIO_2020_BOB_AMPHAN": {
        "name": "Amphan",
        "pattern": "EYE",
        "status": "HISTORICAL",
        "track": [
            {"lead": 0,  "label": "Now",   "time": "2020-05-18T18:00:00Z", "lat": 15.2, "lon": 86.5, "pattern": "EYE"},
            {"lead": 6,  "label": "+6h",   "time": "2020-05-19T00:00:00Z", "lat": 16.0, "lon": 86.6, "pattern": "EYE"},
            {"lead": 12, "label": "+12h",  "time": "2020-05-19T06:00:00Z", "lat": 16.8, "lon": 86.8, "pattern": "EYE"},
            {"lead": 18, "label": "+18h",  "time": "2020-05-19T12:00:00Z", "lat": 17.6, "lon": 87.0, "pattern": "EYE"},
            {"lead": 24, "label": "+24h",  "time": "2020-05-19T18:00:00Z", "lat": 18.5, "lon": 87.2, "pattern": "EYE"},
            {"lead": 36, "label": "+36h",  "time": "2020-05-20T06:00:00Z", "lat": 20.4, "lon": 87.9, "pattern": "EYE"},
            {"lead": 48, "label": "+48h",  "time": "2020-05-20T18:00:00Z", "lat": 22.8, "lon": 88.6, "pattern": "EYE"},
            {"lead": 60, "label": "+60h",  "time": "2020-05-21T06:00:00Z", "lat": 25.1, "lon": 89.6, "pattern": "EYE"},
            {"lead": 72, "label": "+72h",  "time": "2020-05-21T18:00:00Z", "lat": 26.8, "lon": 91.8, "pattern": "EYE"},
        ],
    },
    "NIO_2021_ARB_TAUKTAE": {
        "name": "Tauktae",
        "pattern": "EYE",
        "status": "HISTORICAL",
        "track": [
            {"lead": 0,  "label": "Now",   "time": "2021-05-17T06:00:00Z", "lat": 17.5, "lon": 71.3, "pattern": "EYE"},
            {"lead": 6,  "label": "+6h",   "time": "2021-05-17T12:00:00Z", "lat": 18.8, "lon": 71.1, "pattern": "EYE"},
            {"lead": 12, "label": "+12h",  "time": "2021-05-17T18:00:00Z", "lat": 20.3, "lon": 71.0, "pattern": "EYE"},
            {"lead": 18, "label": "+18h",  "time": "2021-05-18T00:00:00Z", "lat": 21.6, "lon": 71.4, "pattern": "EYE"},
            {"lead": 24, "label": "+24h",  "time": "2021-05-18T06:00:00Z", "lat": 22.8, "lon": 72.1, "pattern": "EYE"},
            {"lead": 36, "label": "+36h",  "time": "2021-05-18T18:00:00Z", "lat": 24.6, "lon": 73.8, "pattern": "EYE"},
            {"lead": 48, "label": "+48h",  "time": "2021-05-19T06:00:00Z", "lat": 26.2, "lon": 75.6, "pattern": "EYE"},
            {"lead": 60, "label": "+60h",  "time": "2021-05-19T18:00:00Z", "lat": 27.5, "lon": 77.2, "pattern": "EYE"},
            {"lead": 72, "label": "+72h",  "time": "2021-05-20T06:00:00Z", "lat": 28.5, "lon": 78.8, "pattern": "EYE"},
        ],
    },
    "NIO_2023_ARB_BIPARJOY": {
        "name": "Biparjoy",
        "pattern": "EYE",
        "status": "HISTORICAL",
        "track": [
            {"lead": 0,  "label": "Now",   "time": "2023-06-13T06:00:00Z", "lat": 19.8, "lon": 67.2, "pattern": "EYE"},
            {"lead": 6,  "label": "+6h",   "time": "2023-06-13T12:00:00Z", "lat": 20.2, "lon": 67.3, "pattern": "EYE"},
            {"lead": 12, "label": "+12h",  "time": "2023-06-13T18:00:00Z", "lat": 20.6, "lon": 67.5, "pattern": "EYE"},
            {"lead": 18, "label": "+18h",  "time": "2023-06-14T00:00:00Z", "lat": 21.0, "lon": 67.7, "pattern": "EYE"},
            {"lead": 24, "label": "+24h",  "time": "2023-06-14T06:00:00Z", "lat": 21.5, "lon": 67.9, "pattern": "EYE"},
            {"lead": 36, "label": "+36h",  "time": "2023-06-14T18:00:00Z", "lat": 22.3, "lon": 68.2, "pattern": "EYE"},
            {"lead": 48, "label": "+48h",  "time": "2023-06-15T06:00:00Z", "lat": 22.9, "lon": 68.5, "pattern": "EYE"},
            {"lead": 60, "label": "+60h",  "time": "2023-06-15T18:00:00Z", "lat": 23.4, "lon": 68.9, "pattern": "EYE"},
            {"lead": 72, "label": "+72h",  "time": "2023-06-16T06:00:00Z", "lat": 24.3, "lon": 70.1, "pattern": "EYE"},
        ],
    },
    "NIO_2023_BOB_MICHAUNG": {
        "name": "Michaung",
        "pattern": "CDO",
        "status": "HISTORICAL",
        "track": [
            {"lead": 0,  "label": "Now",   "time": "2023-12-04T06:00:00Z", "lat": 13.8, "lon": 80.6, "pattern": "CDO"},
            {"lead": 6,  "label": "+6h",   "time": "2023-12-04T12:00:00Z", "lat": 14.2, "lon": 80.5, "pattern": "CDO"},
            {"lead": 12, "label": "+12h",  "time": "2023-12-04T18:00:00Z", "lat": 14.6, "lon": 80.4, "pattern": "CDO"},
            {"lead": 18, "label": "+18h",  "time": "2023-12-05T00:00:00Z", "lat": 15.0, "lon": 80.3, "pattern": "CDO"},
            {"lead": 24, "label": "+24h",  "time": "2023-12-05T06:00:00Z", "lat": 15.5, "lon": 80.3, "pattern": "CDO"},
            {"lead": 36, "label": "+36h",  "time": "2023-12-05T18:00:00Z", "lat": 16.5, "lon": 80.6, "pattern": "CDO"},
            {"lead": 48, "label": "+48h",  "time": "2023-12-06T06:00:00Z", "lat": 17.5, "lon": 81.5, "pattern": "CDO"},
            {"lead": 60, "label": "+60h",  "time": "2023-12-06T18:00:00Z", "lat": 18.2, "lon": 82.5, "pattern": "CDO"},
            {"lead": 72, "label": "+72h",  "time": "2023-12-07T06:00:00Z", "lat": 19.0, "lon": 83.5, "pattern": "CDO"},
        ],
    },
    "NIO_2024_BOB_REMAL": {
        "name": "Remal",
        "pattern": "CURVED_BAND",
        "status": "HISTORICAL",
        "track": [
            {"lead": 0,  "label": "Now",   "time": "2024-05-26T06:00:00Z", "lat": 19.5, "lon": 89.2, "pattern": "CURVED_BAND"},
            {"lead": 6,  "label": "+6h",   "time": "2024-05-26T12:00:00Z", "lat": 20.3, "lon": 89.2, "pattern": "CURVED_BAND"},
            {"lead": 12, "label": "+12h",  "time": "2024-05-26T18:00:00Z", "lat": 21.2, "lon": 89.3, "pattern": "CURVED_BAND"},
            {"lead": 18, "label": "+18h",  "time": "2024-05-27T00:00:00Z", "lat": 22.0, "lon": 89.5, "pattern": "CURVED_BAND"},
            {"lead": 24, "label": "+24h",  "time": "2024-05-27T06:00:00Z", "lat": 22.8, "lon": 89.8, "pattern": "CURVED_BAND"},
            {"lead": 36, "label": "+36h",  "time": "2024-05-27T18:00:00Z", "lat": 24.5, "lon": 90.8, "pattern": "CURVED_BAND"},
            {"lead": 48, "label": "+48h",  "time": "2024-05-28T06:00:00Z", "lat": 25.8, "lon": 92.0, "pattern": "CURVED_BAND"},
            {"lead": 60, "label": "+60h",  "time": "2024-05-28T18:00:00Z", "lat": 26.8, "lon": 93.2, "pattern": "CURVED_BAND"},
            {"lead": 72, "label": "+72h",  "time": "2024-05-29T06:00:00Z", "lat": 27.5, "lon": 94.0, "pattern": "CURVED_BAND"},
        ],
    },
    "NIO_2024_BOB_DANA": {
        "name": "Dana",
        "pattern": "CURVED_BAND",
        "status": "HISTORICAL",
        "track": [
            {"lead": 0,  "label": "Now",   "time": "2024-10-24T06:00:00Z", "lat": 18.2, "lon": 88.0, "pattern": "CURVED_BAND"},
            {"lead": 6,  "label": "+6h",   "time": "2024-10-24T12:00:00Z", "lat": 19.0, "lon": 87.6, "pattern": "CURVED_BAND"},
            {"lead": 12, "label": "+12h",  "time": "2024-10-24T18:00:00Z", "lat": 19.8, "lon": 87.3, "pattern": "CURVED_BAND"},
            {"lead": 18, "label": "+18h",  "time": "2024-10-25T00:00:00Z", "lat": 20.5, "lon": 87.0, "pattern": "CURVED_BAND"},
            {"lead": 24, "label": "+24h",  "time": "2024-10-25T06:00:00Z", "lat": 21.2, "lon": 86.6, "pattern": "CURVED_BAND"},
            {"lead": 36, "label": "+36h",  "time": "2024-10-25T18:00:00Z", "lat": 21.8, "lon": 85.8, "pattern": "CURVED_BAND"},
            {"lead": 48, "label": "+48h",  "time": "2024-10-26T06:00:00Z", "lat": 22.2, "lon": 85.0, "pattern": "CURVED_BAND"},
            {"lead": 60, "label": "+60h",  "time": "2024-10-26T18:00:00Z", "lat": 22.5, "lon": 84.2, "pattern": "CURVED_BAND"},
            {"lead": 72, "label": "+72h",  "time": "2024-10-27T06:00:00Z", "lat": 22.8, "lon": 83.5, "pattern": "CURVED_BAND"},
        ],
    },
    "NIO_2024_BOB_BOB05": {
        "name": "BOB 05 (Deep Depression)",
        "pattern": "CURVED_BAND",
        "status": "ACTIVE",
        "track": [
            {"lead": 0,  "label": "Now",   "time": "LIVE", "lat": 9.2,  "lon": 88.5, "pattern": "CURVED_BAND"},
            {"lead": 6,  "label": "+6h",   "time": "LIVE", "lat": 9.8,  "lon": 88.0, "pattern": "CURVED_BAND"},
            {"lead": 12, "label": "+12h",  "time": "LIVE", "lat": 10.4, "lon": 87.6, "pattern": "CURVED_BAND"},
            {"lead": 18, "label": "+18h",  "time": "LIVE", "lat": 11.1, "lon": 87.1, "pattern": "CURVED_BAND"},
            {"lead": 24, "label": "+24h",  "time": "LIVE", "lat": 11.9, "lon": 86.7, "pattern": "CURVED_BAND"},
            {"lead": 36, "label": "+36h",  "time": "LIVE", "lat": 13.6, "lon": 85.8, "pattern": "CURVED_BAND"},
            {"lead": 48, "label": "+48h",  "time": "LIVE", "lat": 15.4, "lon": 85.0, "pattern": "CURVED_BAND"},
            {"lead": 60, "label": "+60h",  "time": "LIVE", "lat": 17.2, "lon": 84.4, "pattern": "CURVED_BAND"},
            {"lead": 72, "label": "+72h",  "time": "LIVE", "lat": 18.8, "lon": 84.2, "pattern": "CURVED_BAND"},
        ],
    },
}


@router.get("/satellite-timeline", response_model=List[SatelliteTimePoint])
async def get_satellite_timeline(stormId: str = Query(..., description="Unique storm identifier")):
    """
    Get satellite imagery timeline for the given storm.
    Returns 9 time points matching dashboard timeline: Now, +6h, +12h, +18h, +24h, +36h, +48h, +60h, +72h.
    """
    storm_info = STORM_TIMELINE_DATA.get(stormId)
    if not storm_info:
        # Default to Fani dataset if stormId is unrecognized
        storm_info = STORM_TIMELINE_DATA["NIO_2019_BOB_FANI"]

    is_active = storm_info.get("status") == "ACTIVE"
    yesterday = datetime.now(timezone.utc) - timedelta(days=1)
    yesterday_str = yesterday.strftime("%Y-%m-%d")

    results: List[SatelliteTimePoint] = []

    for item in storm_info["track"]:
        lead = item["lead"]
        label = item["label"]
        lat = item["lat"]
        lon = item["lon"]
        pattern = item.get("pattern") or storm_info.get("pattern", "CURVED_BAND")
        iso_time = item["time"]

        is_latest_available = False
        date_str = yesterday_str

        if not is_active and iso_time != "LIVE":
            try:
                dt = datetime.fromisoformat(iso_time.replace("Z", "+00:00"))
                date_str = dt.strftime("%Y-%m-%d")
            except Exception as e:
                logger.warning("Could not parse timestamp %s: %s", iso_time, e)
                date_str = yesterday_str
        else:
            # Active/Live mode: GIBS has no future imagery.
            # Use most recent available image (yesterday's date) and mark isLatestAvailable
            is_latest_available = True
            iso_time = (datetime.now(timezone.utc) + timedelta(hours=lead)).isoformat()

        # Build NASA GIBS tile URL wrapped with error handling
        image_url: Optional[str] = None
        error_msg: Optional[str] = None
        try:
            image_url = build_gibs_url(date_str, lat, lon, zoom=7)
        except Exception as e:
            logger.error("Failed to compute GIBS tile URL for %s (lat=%s, lon=%s): %s", label, lat, lon, e)
            error_msg = "Image calculation failed"

        results.append(
            SatelliteTimePoint(
                label=label,
                leadHours=lead,
                timestamp=iso_time,
                lat=lat,
                lon=lon,
                imageUrl=image_url,
                pattern=pattern,
                isLatestAvailable=is_latest_available,
                source="NASA GIBS",
                error=error_msg,
            )
        )

    return results
