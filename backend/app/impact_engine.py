"""
Impact Engine

Turns ensemble forecasts into wind probability maps, district impact
probabilities, and impact cones/rings.

Process (Section 5):
1. For each of N>=200 Monte Carlo members:
   - Sample a track from Model 2 ensemble
   - Sample intensity and wind radii from Model 3
   - Generate Holland parametric wind field at 1-hour steps
2. At each district centroid/polygon and grid cell:
   - Compute wind for every member at every time step
3. Derive:
   - P(>=34/50/64 kt) per district and per grid cell
   - Earliest arrival of >=34 kt winds (P10/P50/P90)
   - Expected peak sustained wind and gust per district
   - Probability-of-impact contours (10/30/50/70/90%)
   - Landfall probability distribution along coastline
   - Population exposed per threshold
   - Calibration metrics
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple

import numpy as np

from .core.wind_field import StormParams, compute_wind_at_point, wind_radii_from_profile
from .core.geo import haversine_km

logger = logging.getLogger(__name__)


@dataclass
class DistrictImpactResult:
    """Impact assessment for a single district."""
    district_id: int
    district_name: str
    state: str
    is_coastal: bool
    prob_34kt: float = 0.0
    prob_50kt: float = 0.0
    prob_64kt: float = 0.0
    earliest_34kt_p10: Optional[float] = None  # hours from now
    earliest_34kt_p50: Optional[float] = None
    earliest_34kt_p90: Optional[float] = None
    peak_wind_kt_p50: float = 0.0
    peak_wind_kt_p90: float = 0.0
    peak_gust_kt_p50: float = 0.0
    peak_gust_kt_p90: float = 0.0
    landfall_prob: float = 0.0
    pop_exposed_low: int = 0
    pop_exposed_high: int = 0
    risk_level: str = "LOW"


@dataclass
class ImpactEngineResult:
    """Complete impact assessment."""
    districts: List[DistrictImpactResult] = field(default_factory=list)
    probability_contours: Dict[int, List[Tuple[float, float]]] = field(default_factory=dict)
    wind_swath_34kt: Optional[List[Tuple[float, float]]] = None
    wind_swath_50kt: Optional[List[Tuple[float, float]]] = None
    wind_swath_64kt: Optional[List[Tuple[float, float]]] = None
    landfall_distribution: Optional[Dict] = None
    total_pop_exposed: int = 0
    n_members: int = 0


class ImpactEngine:
    """
    Monte Carlo impact simulation engine.

    Uses ensemble forecast tracks + parametric wind fields to compute
    probabilistic impact on districts and grid cells.
    """

    def __init__(self, n_members: int = 200):
        self.n_members = n_members
        logger.info("ImpactEngine initialized with %d members", n_members)

    def compute(
        self,
        ensemble_tracks: np.ndarray,           # (N, T, 2) lat/lon
        ensemble_winds: np.ndarray,            # (N, T) max wind kt
        ensemble_rmw: np.ndarray,              # (N, T) RMW km
        ensemble_mslp: np.ndarray,             # (N, T) MSLP hPa
        districts: List[Dict],                  # [{id, name, state, centroid_lat, centroid_lon, population}]
        time_step_hours: float = 1.0,
        env_pressure_hpa: float = 1010.0,
    ) -> ImpactEngineResult:
        """
        Run the full Monte Carlo impact simulation.

        For each member and each time step:
        1. Construct StormParams
        2. Compute wind at each district centroid
        3. Track exceedances and arrival times

        Then aggregate across members.
        """
        n_members = ensemble_tracks.shape[0]
        n_steps = ensemble_tracks.shape[1]
        n_districts = len(districts)

        logger.info(
            "Running impact engine: %d members × %d steps × %d districts",
            n_members, n_steps, n_districts,
        )

        # Per-district arrays
        max_winds = np.zeros((n_members, n_districts))
        arrival_34kt = np.full((n_members, n_districts), np.inf)

        for m in range(n_members):
            for t in range(n_steps):
                lat = ensemble_tracks[m, t, 0]
                lon = ensemble_tracks[m, t, 1]
                wind_kt = ensemble_winds[m, t]
                rmw = ensemble_rmw[m, t]
                mslp = ensemble_mslp[m, t]

                if np.isnan(lat) or np.isnan(lon) or wind_kt <= 0:
                    continue

                storm = StormParams(
                    center_lat=lat,
                    center_lon=lon,
                    max_wind_kt=wind_kt,
                    rmw_km=max(10, rmw),
                    mslp_hpa=mslp,
                    env_pressure_hpa=env_pressure_hpa,
                )

                for d_idx, dist in enumerate(districts):
                    d_lat = dist['centroid_lat']
                    d_lon = dist['centroid_lon']

                    # Skip if too far (optimization)
                    dist_km = haversine_km(lat, lon, d_lat, d_lon)
                    if dist_km > 600:
                        continue

                    vs, _, _ = compute_wind_at_point(d_lat, d_lon, storm)
                    vs_kt = vs / 0.51444  # m/s to kt

                    max_winds[m, d_idx] = max(max_winds[m, d_idx], vs_kt)

                    if vs_kt >= 34 and arrival_34kt[m, d_idx] == np.inf:
                        arrival_34kt[m, d_idx] = t * time_step_hours

        # Aggregate probabilities
        results = []
        for d_idx, dist in enumerate(districts):
            p34 = np.mean(max_winds[:, d_idx] >= 34)
            p50 = np.mean(max_winds[:, d_idx] >= 50)
            p64 = np.mean(max_winds[:, d_idx] >= 64)

            valid_arrivals = arrival_34kt[:, d_idx]
            valid_arrivals = valid_arrivals[valid_arrivals < np.inf]

            peak_winds = max_winds[:, d_idx]
            peak_winds = peak_winds[peak_winds > 0]

            risk = self._compute_risk_level(p34, p64, float(np.median(peak_winds)) if len(peak_winds) > 0 else 0)

            pop = dist.get('population', 0)

            results.append(DistrictImpactResult(
                district_id=dist['id'],
                district_name=dist['name'],
                state=dist['state'],
                is_coastal=dist.get('is_coastal', False),
                prob_34kt=round(p34, 3),
                prob_50kt=round(p50, 3),
                prob_64kt=round(p64, 3),
                earliest_34kt_p10=float(np.percentile(valid_arrivals, 10)) if len(valid_arrivals) > 0 else None,
                earliest_34kt_p50=float(np.percentile(valid_arrivals, 50)) if len(valid_arrivals) > 0 else None,
                earliest_34kt_p90=float(np.percentile(valid_arrivals, 90)) if len(valid_arrivals) > 0 else None,
                peak_wind_kt_p50=float(np.percentile(peak_winds, 50)) if len(peak_winds) > 0 else 0,
                peak_wind_kt_p90=float(np.percentile(peak_winds, 90)) if len(peak_winds) > 0 else 0,
                peak_gust_kt_p50=float(np.percentile(peak_winds * 1.2, 50)) if len(peak_winds) > 0 else 0,
                peak_gust_kt_p90=float(np.percentile(peak_winds * 1.2, 90)) if len(peak_winds) > 0 else 0,
                pop_exposed_low=int(pop * p34 * 0.7),
                pop_exposed_high=int(pop * p34 * 1.3),
                risk_level=risk,
            ))

        # Sort by probability
        results.sort(key=lambda x: x.prob_34kt, reverse=True)

        return ImpactEngineResult(
            districts=results,
            n_members=n_members,
            total_pop_exposed=sum(r.pop_exposed_high for r in results),
        )

    @staticmethod
    def _compute_risk_level(p34: float, p64: float, median_wind_kt: float) -> str:
        """Compute risk level from probability and wind speed."""
        if p64 > 0.5 or median_wind_kt >= 90:
            return "EXTREME"
        elif p64 > 0.2 or p34 > 0.7 or median_wind_kt >= 64:
            return "HIGH"
        elif p34 > 0.3 or median_wind_kt >= 34:
            return "MODERATE"
        else:
            return "LOW"
