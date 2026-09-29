"""
Data Source Base Class

Common interface for all data ingestion connectors.
All sources implement: fetch(time, bbox) with retry, backoff, caching, and logging.
"""
from __future__ import annotations

import abc
import logging
from datetime import datetime, timezone
from dataclasses import dataclass, field
from typing import Any, Dict, Optional, Tuple

from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = logging.getLogger(__name__)


@dataclass
class BBox:
    """Bounding box for the NIO domain."""
    lat_min: float = 0.0
    lat_max: float = 30.0
    lon_min: float = 45.0
    lon_max: float = 100.0

    def to_tuple(self) -> Tuple[float, float, float, float]:
        return (self.lat_min, self.lat_max, self.lon_min, self.lon_max)


@dataclass
class FetchResult:
    """Result of a data fetch operation."""
    success: bool
    source_name: str
    timestamp: datetime
    data: Any = None
    storage_path: Optional[str] = None
    records_count: int = 0
    data_age_seconds: Optional[float] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class DataSource(abc.ABC):
    """
    Abstract base class for all data ingestion connectors.

    Subclasses must implement:
      - source_name: unique identifier
      - display_name: human-readable name
      - fetch(time, bbox): main ingestion method
      - check_credentials(): verify required credentials are set
    """

    @property
    @abc.abstractmethod
    def source_name(self) -> str:
        """Unique identifier for this data source."""
        ...

    @property
    @abc.abstractmethod
    def display_name(self) -> str:
        """Human-readable name for UI display."""
        ...

    @property
    def source_type(self) -> str:
        """Category: SATELLITE, ENVIRONMENT, LABELS, GEO."""
        return "ENVIRONMENT"

    @property
    def credentials_required(self) -> bool:
        """Whether this source requires credentials."""
        return False

    @abc.abstractmethod
    def check_credentials(self) -> bool:
        """Check if required credentials are configured."""
        ...

    @abc.abstractmethod
    async def fetch(
        self,
        time: Optional[datetime] = None,
        bbox: Optional[BBox] = None,
    ) -> FetchResult:
        """
        Fetch data from this source.

        Args:
            time: Target time for the data. None = latest available.
            bbox: Bounding box. None = full NIO domain.

        Returns:
            FetchResult with the data or error information.
        """
        ...

    async def fetch_with_retry(
        self,
        time: Optional[datetime] = None,
        bbox: Optional[BBox] = None,
        max_attempts: int = 3,
    ) -> FetchResult:
        """Fetch with exponential backoff retry."""
        last_error = None
        for attempt in range(max_attempts):
            try:
                result = await self.fetch(time, bbox)
                if result.success:
                    logger.info(
                        "Fetch success: %s (attempt %d, %d records)",
                        self.source_name, attempt + 1, result.records_count,
                    )
                    return result
                last_error = result.error
            except Exception as e:
                last_error = str(e)
                logger.warning(
                    "Fetch failed: %s (attempt %d/%d): %s",
                    self.source_name, attempt + 1, max_attempts, e,
                )
                if attempt < max_attempts - 1:
                    import asyncio
                    await asyncio.sleep(2 ** attempt)  # exponential backoff

        return FetchResult(
            success=False,
            source_name=self.source_name,
            timestamp=datetime.now(timezone.utc),
            error=f"All {max_attempts} attempts failed. Last error: {last_error}",
        )
