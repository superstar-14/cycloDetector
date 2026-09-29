"""
IMD Cyclone Classification Utility

Official IMD tropical cyclone categories based on maximum sustained wind speed.
Also includes Dvorak T-number to wind speed conversion.

References:
  - IMD Tropical Cyclone Classification (RSMC New Delhi)
  - Dvorak (1984) Tropical Cyclone Intensity Analysis
"""
from __future__ import annotations

import bisect
from dataclasses import dataclass
from enum import Enum
from typing import Optional, Tuple, List


# ── IMD Categories ──────────────────────────────────────────

class IMDCategory(str, Enum):
    """Official IMD tropical cyclone intensity categories."""
    LOW_PRESSURE = "LOW_PRESSURE"
    D = "D"           # Depression
    DD = "DD"         # Deep Depression
    CS = "CS"         # Cyclonic Storm
    SCS = "SCS"       # Severe Cyclonic Storm
    VSCS = "VSCS"     # Very Severe Cyclonic Storm
    ESCS = "ESCS"     # Extremely Severe Cyclonic Storm
    SuCS = "SuCS"     # Super Cyclonic Storm


@dataclass(frozen=True)
class CategoryInfo:
    """Complete information about an IMD cyclone category."""
    category: IMDCategory
    label: str
    abbreviation: str
    min_wind_kt: float
    max_wind_kt: Optional[float]
    color: str          # Hex color for UI rendering
    saffir_equivalent: Optional[str]  # Approximate Saffir-Simpson equivalent

    @property
    def min_wind_kmh(self) -> float:
        return kt_to_kmh(self.min_wind_kt)

    @property
    def max_wind_kmh(self) -> Optional[float]:
        return kt_to_kmh(self.max_wind_kt) if self.max_wind_kt else None

    @property
    def wind_range_str(self) -> str:
        if self.max_wind_kt is None:
            return f"≥{self.min_wind_kt} kt ({self.min_wind_kmh:.0f} km/h)"
        return (
            f"{self.min_wind_kt}–{self.max_wind_kt} kt "
            f"({self.min_wind_kmh:.0f}–{self.max_wind_kmh:.0f} km/h)"
        )


# Conversion constants
KT_TO_KMH = 1.852
KMH_TO_KT = 1.0 / KT_TO_KMH


def kt_to_kmh(kt: float) -> float:
    """Convert knots to km/h."""
    return kt * KT_TO_KMH


def kmh_to_kt(kmh: float) -> float:
    """Convert km/h to knots."""
    return kmh * KMH_TO_KT


# Category definitions with exact IMD thresholds
IMD_CATEGORIES: List[CategoryInfo] = [
    CategoryInfo(
        category=IMDCategory.LOW_PRESSURE,
        label="Low Pressure Area",
        abbreviation="LP",
        min_wind_kt=0,
        max_wind_kt=17,
        color="#808080",
        saffir_equivalent=None,
    ),
    CategoryInfo(
        category=IMDCategory.D,
        label="Depression",
        abbreviation="D",
        min_wind_kt=17,
        max_wind_kt=27,
        color="#5B9BD5",
        saffir_equivalent=None,
    ),
    CategoryInfo(
        category=IMDCategory.DD,
        label="Deep Depression",
        abbreviation="DD",
        min_wind_kt=28,
        max_wind_kt=33,
        color="#4472C4",
        saffir_equivalent=None,
    ),
    CategoryInfo(
        category=IMDCategory.CS,
        label="Cyclonic Storm",
        abbreviation="CS",
        min_wind_kt=34,
        max_wind_kt=47,
        color="#00B050",
        saffir_equivalent="TS",
    ),
    CategoryInfo(
        category=IMDCategory.SCS,
        label="Severe Cyclonic Storm",
        abbreviation="SCS",
        min_wind_kt=48,
        max_wind_kt=63,
        color="#FFC000",
        saffir_equivalent="Cat 1",
    ),
    CategoryInfo(
        category=IMDCategory.VSCS,
        label="Very Severe Cyclonic Storm",
        abbreviation="VSCS",
        min_wind_kt=64,
        max_wind_kt=89,
        color="#FF6600",
        saffir_equivalent="Cat 1-2",
    ),
    CategoryInfo(
        category=IMDCategory.ESCS,
        label="Extremely Severe Cyclonic Storm",
        abbreviation="ESCS",
        min_wind_kt=90,
        max_wind_kt=119,
        color="#FF0000",
        saffir_equivalent="Cat 3-4",
    ),
    CategoryInfo(
        category=IMDCategory.SuCS,
        label="Super Cyclonic Storm",
        abbreviation="SuCS",
        min_wind_kt=120,
        max_wind_kt=None,
        color="#990000",
        saffir_equivalent="Cat 5",
    ),
]

# Pre-sorted thresholds for bisect lookup
_THRESHOLDS = [c.min_wind_kt for c in IMD_CATEGORIES]
_CATEGORY_MAP = {c.category: c for c in IMD_CATEGORIES}


def classify_wind(wind_kt: float) -> CategoryInfo:
    """
    Classify a tropical cyclone based on maximum sustained wind speed (kt).

    Args:
        wind_kt: Maximum sustained wind speed in knots.

    Returns:
        CategoryInfo with full classification details.
    """
    if wind_kt < 0:
        raise ValueError(f"Wind speed cannot be negative: {wind_kt}")

    idx = bisect.bisect_right(_THRESHOLDS, wind_kt) - 1
    return IMD_CATEGORIES[max(0, idx)]


def get_category_info(category: IMDCategory) -> CategoryInfo:
    """Get full info for an IMD category enum value."""
    return _CATEGORY_MAP[category]


def get_category_color(wind_kt: float) -> str:
    """Get the display color for a given wind speed."""
    return classify_wind(wind_kt).color


def all_categories() -> List[CategoryInfo]:
    """Return all IMD categories in order of increasing intensity."""
    return list(IMD_CATEGORIES)


# ── Dvorak T-Number Conversion ──────────────────────────────

# Official Dvorak T-number to maximum sustained wind (kt) table
_DVORAK_TABLE: List[Tuple[float, float]] = [
    (1.0, 25),
    (1.5, 25),
    (2.0, 30),
    (2.5, 35),
    (3.0, 45),
    (3.5, 55),
    (4.0, 65),
    (4.5, 77),
    (5.0, 90),
    (5.5, 102),
    (6.0, 115),
    (6.5, 127),
    (7.0, 140),
    (7.5, 155),
    (8.0, 170),
]

_T_NUMBERS = [t for t, _ in _DVORAK_TABLE]
_T_WINDS = [w for _, w in _DVORAK_TABLE]


def t_number_to_wind_kt(t_number: float) -> float:
    """
    Convert a Dvorak T-number to maximum sustained wind speed (kt).
    Uses linear interpolation between table values.
    """
    if t_number < _T_NUMBERS[0]:
        return _T_WINDS[0]
    if t_number >= _T_NUMBERS[-1]:
        return _T_WINDS[-1]

    idx = bisect.bisect_right(_T_NUMBERS, t_number) - 1
    t_lo, t_hi = _T_NUMBERS[idx], _T_NUMBERS[idx + 1]
    w_lo, w_hi = _T_WINDS[idx], _T_WINDS[idx + 1]

    frac = (t_number - t_lo) / (t_hi - t_lo)
    return w_lo + frac * (w_hi - w_lo)


def wind_kt_to_t_number(wind_kt: float) -> float:
    """
    Inverse: estimate Dvorak T-number from max sustained wind (kt).
    Uses linear interpolation.
    """
    if wind_kt <= _T_WINDS[0]:
        return _T_NUMBERS[0]
    if wind_kt >= _T_WINDS[-1]:
        return _T_NUMBERS[-1]

    idx = bisect.bisect_right(_T_WINDS, wind_kt) - 1
    w_lo, w_hi = _T_WINDS[idx], _T_WINDS[idx + 1]
    t_lo, t_hi = _T_NUMBERS[idx], _T_NUMBERS[idx + 1]

    frac = (wind_kt - w_lo) / (w_hi - w_lo)
    return t_lo + frac * (t_hi - t_lo)


def t_number_to_category(t_number: float) -> CategoryInfo:
    """Classify cyclone intensity from a Dvorak T-number."""
    return classify_wind(t_number_to_wind_kt(t_number))
