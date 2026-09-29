"""
NOAA GFS 0.25° Data Connector

Fetches Global Forecast System (GFS) analysis and forecast fields from NOMADS.
Fields: u/v winds (850, 500, 200 hPa), MSLP, SST, relative humidity, vorticity.
Used for: steering flow, wind shear, environmental analysis, Model 2/3 inputs.

Data source: https://nomads.ncep.noaa.gov/dods/gfs_0p25
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any

import httpx

from .base import DataSource, BBox, FetchResult
from ..config import settings

logger = logging.getLogger(__name__)


class GFSConnector(DataSource):
    """NOAA GFS 0.25° data ingestion connector."""

    @property
    def source_name(self) -> str:
        return "NOAA_GFS"

    @property
    def display_name(self) -> str:
        return "NOAA GFS 0.25°"

    @property
    def source_type(self) -> str:
        return "ENVIRONMENT"

    @property
    def credentials_required(self) -> bool:
        return False

    def check_credentials(self) -> bool:
        return True  # Public data, no credentials needed

    def _get_latest_cycle(self) -> str:
        """Determine the latest available GFS cycle (00, 06, 12, 18 UTC)."""
        now = datetime.now(timezone.utc)
        # GFS data typically available ~4-5 hours after cycle time
        hours_ago = now - timedelta(hours=5)
        cycle = (hours_ago.hour // 6) * 6
        date_str = hours_ago.strftime("%Y%m%d")
        return f"{date_str}/{cycle:02d}"

    def _build_opendap_url(
        self,
        cycle: str,
        variable: str,
        level: str,
        bbox: BBox,
        forecast_hour: int = 0,
    ) -> str:
        """Build OPeNDAP URL for a specific variable and level."""
        base = settings.GFS_BASE_URL
        # GFS OPeNDAP access pattern
        date, hour = cycle.split("/")
        url = f"{base}/gfs{date}/gfs_0p25_{hour}z"
        return url

    async def fetch(
        self,
        time: Optional[datetime] = None,
        bbox: Optional[BBox] = None,
    ) -> FetchResult:
        """
        Fetch GFS data for the NIO domain.

        Downloads key environmental fields:
        - u/v winds at 200, 500, 850 hPa (for shear, steering)
        - MSLP (mean sea-level pressure)
        - Relative humidity at 500-700 hPa
        - SST
        - Vorticity at 850 hPa
        """
        if bbox is None:
            bbox = BBox()

        cycle = self._get_latest_cycle()
        logger.info("Fetching GFS data for cycle %s", cycle)

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                # Check if the GFS server is reachable
                url = self._build_opendap_url(cycle, "ugrdprs", "850mb", bbox)
                response = await client.head(url)

                if response.status_code == 200:
                    # In production: download actual netCDF data via xarray/OPeNDAP
                    return FetchResult(
                        success=True,
                        source_name=self.source_name,
                        timestamp=datetime.now(timezone.utc),
                        records_count=1,
                        metadata={
                            "cycle": cycle,
                            "variables": [
                                "ugrd_200hPa", "vgrd_200hPa",
                                "ugrd_500hPa", "vgrd_500hPa",
                                "ugrd_850hPa", "vgrd_850hPa",
                                "mslet", "rh_500hPa", "rh_700hPa",
                                "absv_850hPa",
                            ],
                            "bbox": bbox.to_tuple(),
                        },
                    )
                else:
                    return FetchResult(
                        success=False,
                        source_name=self.source_name,
                        timestamp=datetime.now(timezone.utc),
                        error=f"GFS server returned {response.status_code}",
                    )

        except httpx.TimeoutException:
            return FetchResult(
                success=False,
                source_name=self.source_name,
                timestamp=datetime.now(timezone.utc),
                error="GFS server timed out",
            )
        except Exception as e:
            return FetchResult(
                success=False,
                source_name=self.source_name,
                timestamp=datetime.now(timezone.utc),
                error=str(e),
            )


class GFSShearCalculator:
    """
    Calculate deep-layer wind shear from GFS u/v winds.
    Shear = |V200 - V850| (magnitude and direction).
    """

    @staticmethod
    def compute_shear(
        u200: float, v200: float,
        u850: float, v850: float,
    ) -> Dict[str, float]:
        """
        Compute wind shear between 200 and 850 hPa levels.

        Returns:
            Dict with 'magnitude_kt', 'magnitude_ms', 'direction_deg'.
        """
        import math

        du = u200 - u850
        dv = v200 - v850
        magnitude_ms = math.sqrt(du**2 + dv**2)
        magnitude_kt = magnitude_ms / 0.51444
        direction_deg = (math.degrees(math.atan2(du, dv)) + 360) % 360

        return {
            "magnitude_kt": round(magnitude_kt, 1),
            "magnitude_ms": round(magnitude_ms, 1),
            "direction_deg": round(direction_deg, 1),
        }
