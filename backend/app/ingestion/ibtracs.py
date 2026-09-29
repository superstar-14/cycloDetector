"""
IBTrACS Data Connector

Fetches International Best Track Archive for Climate Stewardship data
from NOAA NCEI for historical cyclone tracks in the North Indian Ocean.

Data source: https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/
"""
from __future__ import annotations

import csv
import io
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

import httpx

from .base import DataSource, BBox, FetchResult
from ..core.classification import classify_wind, kt_to_kmh

logger = logging.getLogger(__name__)

# IBTrACS CSV download URL for the North Indian Ocean basin
IBTRACS_NI_URL = (
    "https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/"
    "v04r01/access/csv/ibtracs.NI.list.v04r01.csv"
)


class IBTrACSConnector(DataSource):
    """IBTrACS historical best-track data connector for NIO basin."""

    @property
    def source_name(self) -> str:
        return "IBTRACS"

    @property
    def display_name(self) -> str:
        return "IBTrACS (NOAA NCEI)"

    @property
    def source_type(self) -> str:
        return "LABELS"

    @property
    def credentials_required(self) -> bool:
        return False

    def check_credentials(self) -> bool:
        return True

    async def fetch(
        self,
        time: Optional[datetime] = None,
        bbox: Optional[BBox] = None,
    ) -> FetchResult:
        """
        Fetch IBTrACS NIO basin data.

        Downloads the full NIO CSV file and parses cyclone tracks.
        In production, this is cached and only re-downloaded periodically.
        """
        logger.info("Fetching IBTrACS NIO data")

        try:
            async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
                response = await client.get(IBTRACS_NI_URL)
                response.raise_for_status()

                tracks = self._parse_ibtracs_csv(response.text)

                return FetchResult(
                    success=True,
                    source_name=self.source_name,
                    timestamp=datetime.now(timezone.utc),
                    data=tracks,
                    records_count=len(tracks),
                    metadata={
                        "basin": "NI",
                        "url": IBTRACS_NI_URL,
                        "format": "csv",
                    },
                )

        except Exception as e:
            logger.error("IBTrACS fetch failed: %s", e)
            return FetchResult(
                success=False,
                source_name=self.source_name,
                timestamp=datetime.now(timezone.utc),
                error=str(e),
            )

    def _parse_ibtracs_csv(self, csv_text: str) -> List[Dict[str, Any]]:
        """
        Parse IBTrACS CSV into a list of storm records.

        Each record contains storm metadata and track points.
        """
        storms: Dict[str, Dict[str, Any]] = {}

        reader = csv.DictReader(io.StringIO(csv_text))
        # Skip the units row (second header in IBTrACS CSV)
        next(reader, None)

        for row in reader:
            sid = row.get("SID", "").strip()
            if not sid:
                continue

            if sid not in storms:
                storms[sid] = {
                    "sid": sid,
                    "name": row.get("NAME", "").strip() or "UNNAMED",
                    "basin": row.get("BASIN", "NI").strip(),
                    "season": int(row.get("SEASON", 0) or 0),
                    "track": [],
                }

            # Parse track point
            try:
                lat = float(row.get("LAT", 0) or 0)
                lon = float(row.get("LON", 0) or 0)
                wind = float(row.get("USA_WIND", 0) or row.get("WMO_WIND", 0) or 0)
                pres = float(row.get("USA_PRES", 0) or row.get("WMO_PRES", 0) or 0)
                iso_time = row.get("ISO_TIME", "")

                if lat != 0 and lon != 0:
                    cat = classify_wind(wind) if wind > 0 else None
                    storms[sid]["track"].append({
                        "time": iso_time,
                        "lat": lat,
                        "lon": lon,
                        "wind_kt": wind,
                        "wind_kmh": kt_to_kmh(wind) if wind > 0 else 0,
                        "pressure_hpa": pres if pres > 0 else None,
                        "category": cat.category.value if cat else None,
                    })
            except (ValueError, TypeError):
                continue

        # Compute peak intensity per storm
        result = []
        for storm in storms.values():
            if not storm["track"]:
                continue
            peak_wind = max(p["wind_kt"] for p in storm["track"])
            if peak_wind > 0:
                peak_cat = classify_wind(peak_wind)
                storm["peak_wind_kt"] = peak_wind
                storm["peak_wind_kmh"] = kt_to_kmh(peak_wind)
                storm["peak_category"] = peak_cat.category.value
                storm["peak_category_label"] = peak_cat.label
            result.append(storm)

        logger.info("Parsed %d storms from IBTrACS", len(result))
        return result
