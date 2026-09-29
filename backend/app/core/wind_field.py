"""
Holland (1980) Parametric Tropical Cyclone Wind Field Model

Computes the radial wind profile and 2D wind field from storm parameters.
Used by the Impact Engine (Section 5) to generate per-member wind fields
for Monte Carlo probability estimation.

Includes:
  - Holland B parameter estimation (Vickery & Wadhera 2008, Willoughby & Rahn 2004)
  - Gradient wind profile
  - Surface wind reduction and inflow angle
  - Asymmetric correction for storm motion
  - Land decay after landfall (Kaplan & DeMaria 1995)

References:
  Holland, G. J. (1980). "An analytic model of the wind and pressure profiles
  in hurricanes." Monthly Weather Review, 108(8), 1212–1218.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Tuple, Optional, List

import numpy as np

from .geo import haversine_km, bearing_deg, destination_point, EARTH_RADIUS_KM


# Constants
RHO_AIR = 1.15          # kg/m³, sea-level tropical air density
CORIOLIS_15N = 3.77e-5  # f at 15°N (s⁻¹), typical NIO latitude


def coriolis_parameter(lat: float) -> float:
    """Coriolis parameter f = 2Ω sin(φ). Returns s⁻¹."""
    OMEGA = 7.2921e-5  # Earth's angular velocity (rad/s)
    return 2 * OMEGA * math.sin(math.radians(abs(lat)))


@dataclass
class StormParams:
    """Parameters defining a tropical cyclone at a single time step."""
    center_lat: float       # degrees
    center_lon: float       # degrees
    max_wind_kt: float      # maximum sustained wind (kt)
    rmw_km: float           # radius of maximum wind (km)
    mslp_hpa: float         # minimum sea-level pressure (hPa)
    env_pressure_hpa: float = 1010.0  # environmental pressure (hPa)
    forward_speed_kmh: float = 0.0    # translational speed (km/h)
    forward_dir_deg: float = 0.0      # heading (0=N, 90=E)
    # Per-quadrant R34 (if known, for constraint)
    r34_ne_km: Optional[float] = None
    r34_se_km: Optional[float] = None
    r34_sw_km: Optional[float] = None
    r34_nw_km: Optional[float] = None

    @property
    def max_wind_ms(self) -> float:
        """Max sustained wind in m/s."""
        return self.max_wind_kt * 0.51444

    @property
    def delta_p_pa(self) -> float:
        """Pressure deficit in Pascals."""
        return (self.env_pressure_hpa - self.mslp_hpa) * 100.0

    @property
    def forward_speed_ms(self) -> float:
        """Translational speed in m/s."""
        return self.forward_speed_kmh / 3.6


def estimate_holland_b(
    max_wind_ms: float,
    delta_p_pa: float,
    rho: float = RHO_AIR,
) -> float:
    """
    Estimate Holland B parameter from Vmax and pressure deficit.

    B = Vmax² · ρ · e / ΔP, clamped to [1.0, 2.5].
    """
    if delta_p_pa <= 0:
        return 1.5  # default
    b = (max_wind_ms ** 2) * rho * math.e / delta_p_pa
    return max(1.0, min(2.5, b))


def gradient_wind_speed(
    r_km: float,
    rmw_km: float,
    max_wind_ms: float,
    holland_b: float,
    f: float,
) -> float:
    """
    Holland gradient wind speed at radius r.

    V(r) = sqrt( B/ρ · (Rmw/r)^B · ΔP · exp(-(Rmw/r)^B) + (r·f/2)² ) - r·f/2

    Simplified using Vmax relationship:
    V(r) = Vmax · sqrt( (Rmw/r)^B · exp(1 - (Rmw/r)^B) )
    """
    if r_km <= 0:
        return 0.0
    if r_km < 0.5:  # very near center, inside eye
        # Linear ramp-up to avoid singularity
        return max_wind_ms * (r_km / rmw_km)

    rr = rmw_km / r_km
    rr_b = rr ** holland_b
    v_sq = max_wind_ms ** 2 * rr_b * math.exp(1 - rr_b)
    return math.sqrt(max(0, v_sq))


def surface_wind_reduction(v_gradient_ms: float, over_water: bool = True) -> float:
    """
    Reduce gradient wind to 10-m sustained surface wind.
    Typical factors: 0.9 over water, 0.8 over land.
    """
    factor = 0.9 if over_water else 0.8
    return v_gradient_ms * factor


def inflow_angle(r_km: float, rmw_km: float) -> float:
    """
    Inflow angle (degrees, inward from tangential).
    Increases from ~10° near RMW to ~25° at large radii.
    """
    if r_km <= rmw_km:
        return 10.0 * (r_km / rmw_km)
    else:
        return 10.0 + 15.0 * (1.0 - rmw_km / r_km)


def asymmetric_correction(
    r_km: float,
    azimuth_deg: float,
    forward_speed_ms: float,
    forward_dir_deg: float,
    rmw_km: float,
) -> float:
    """
    Asymmetric wind correction due to storm motion.
    Maximum enhancement to the right of motion (Northern Hemisphere).

    Uses a simple formulation: V_correction = c1 * Vt * cos(θ - θ_motion - α)
    where α ≈ 70° (right-front maximum in NH).
    """
    if forward_speed_ms < 0.5:
        return 0.0

    # Wavenumber-1 asymmetry
    alpha_offset = 70.0  # degrees, right-front maximum for NH
    angle_diff = math.radians(azimuth_deg - forward_dir_deg - alpha_offset)

    # Decay factor beyond RMW
    decay = 1.0 if r_km <= rmw_km else (rmw_km / r_km) ** 0.5
    c1 = 0.5  # fraction of translational speed added

    return c1 * forward_speed_ms * math.cos(angle_diff) * decay


def land_decay_factor(hours_over_land: float, max_wind_ms: float) -> float:
    """
    Kaplan & DeMaria (1995) land decay model.
    V(t) = Vb + (V0 - Vb) · exp(-α · t)
    where Vb ≈ 13.4 m/s (background wind), α ≈ 0.095 (decay rate/hour).
    """
    vb = 13.4  # background inland wind (m/s)
    alpha = 0.095

    if hours_over_land <= 0:
        return 1.0
    v_decayed = vb + (max_wind_ms - vb) * math.exp(-alpha * hours_over_land)
    if max_wind_ms <= 0:
        return 0.0
    return v_decayed / max_wind_ms


def gust_factor(sustained_ms: float, over_water: bool = True) -> float:
    """
    Estimated 3-second gust from sustained wind.
    Gust factor is ~1.2 over water, ~1.4 over land.
    """
    factor = 1.2 if over_water else 1.4
    return sustained_ms * factor


def compute_wind_at_point(
    point_lat: float,
    point_lon: float,
    storm: StormParams,
    holland_b: Optional[float] = None,
    over_water: bool = True,
    hours_over_land: float = 0.0,
) -> Tuple[float, float, float]:
    """
    Compute wind speed and direction at a single point.

    Args:
        point_lat, point_lon: Location to compute wind at.
        storm: Storm parameters.
        holland_b: Holland B parameter (auto-estimated if None).
        over_water: Whether the point is over water (affects surface reduction).
        hours_over_land: Hours since landfall (for land decay).

    Returns:
        (sustained_wind_ms, gust_ms, wind_direction_deg)
    """
    r_km = haversine_km(storm.center_lat, storm.center_lon, point_lat, point_lon)
    azimuth = bearing_deg(storm.center_lat, storm.center_lon, point_lat, point_lon)

    if holland_b is None:
        holland_b = estimate_holland_b(storm.max_wind_ms, storm.delta_p_pa)

    f = coriolis_parameter(storm.center_lat)

    # Gradient wind
    vg = gradient_wind_speed(r_km, storm.rmw_km, storm.max_wind_ms, holland_b, f)

    # Asymmetric correction
    v_asym = asymmetric_correction(
        r_km, azimuth, storm.forward_speed_ms, storm.forward_dir_deg, storm.rmw_km
    )

    # Total gradient wind
    vg_total = max(0.0, vg + v_asym)

    # Surface reduction
    vs = surface_wind_reduction(vg_total, over_water)

    # Land decay
    if hours_over_land > 0:
        vs *= land_decay_factor(hours_over_land, storm.max_wind_ms)

    # Gust
    vgust = gust_factor(vs, over_water)

    # Wind direction (tangential + inflow)
    inflow = inflow_angle(r_km, storm.rmw_km)
    # NH cyclones rotate counter-clockwise; wind direction is ~perpendicular to radial
    wind_dir = (azimuth + 90.0 + inflow + 180.0) % 360.0  # +180 because meteorological convention

    return (vs, vgust, wind_dir)


def compute_wind_field_grid(
    storm: StormParams,
    grid_lats: np.ndarray,
    grid_lons: np.ndarray,
    holland_b: Optional[float] = None,
    land_mask: Optional[np.ndarray] = None,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Compute 2D wind field on a lat/lon grid.

    Args:
        storm: Storm parameters.
        grid_lats: 1D array of latitudes.
        grid_lons: 1D array of longitudes.
        holland_b: Holland B (auto if None).
        land_mask: 2D boolean array (True = land). Shape (len(lats), len(lons)).

    Returns:
        Tuple of 2D arrays: (sustained_wind_ms, gust_ms, u_component, v_component)
        All shapes: (len(grid_lats), len(grid_lons))
    """
    if holland_b is None:
        holland_b = estimate_holland_b(storm.max_wind_ms, storm.delta_p_pa)

    ny, nx = len(grid_lats), len(grid_lons)
    sustained = np.zeros((ny, nx))
    gusts = np.zeros((ny, nx))
    u_wind = np.zeros((ny, nx))
    v_wind = np.zeros((ny, nx))

    for j in range(ny):
        for i in range(nx):
            over_water = True
            if land_mask is not None:
                over_water = not land_mask[j, i]

            vs, vg, wdir = compute_wind_at_point(
                grid_lats[j], grid_lons[i], storm, holland_b, over_water
            )
            sustained[j, i] = vs
            gusts[j, i] = vg
            # Decompose into u, v (meteorological: direction wind is FROM)
            wdir_math = math.radians(270.0 - wdir)
            u_wind[j, i] = vs * math.cos(wdir_math)
            v_wind[j, i] = vs * math.sin(wdir_math)

    return sustained, gusts, u_wind, v_wind


def wind_radii_from_profile(
    storm: StormParams,
    holland_b: Optional[float] = None,
    thresholds_kt: List[float] = [34, 50, 64],
    azimuths: List[float] = [45, 135, 225, 315],  # NE, SE, SW, NW centers
    max_radius_km: float = 600.0,
    dr_km: float = 5.0,
) -> dict:
    """
    Estimate wind radii (R34, R50, R64) per quadrant from the Holland profile.

    Returns:
        Dict keyed by threshold (e.g. 34), with sub-dict of quadrant radii.
        Example: {34: {"NE": 250.0, "SE": 200.0, ...}, 50: {...}, ...}
    """
    if holland_b is None:
        holland_b = estimate_holland_b(storm.max_wind_ms, storm.delta_p_pa)

    f = coriolis_parameter(storm.center_lat)
    quadrant_names = ["NE", "SE", "SW", "NW"]
    result = {}

    for threshold_kt in thresholds_kt:
        threshold_ms = threshold_kt * 0.51444
        result[threshold_kt] = {}

        for az, qname in zip(azimuths, quadrant_names):
            radius = 0.0
            for r in np.arange(storm.rmw_km, max_radius_km, dr_km):
                vg = gradient_wind_speed(r, storm.rmw_km, storm.max_wind_ms, holland_b, f)
                v_asym = asymmetric_correction(
                    r, az, storm.forward_speed_ms, storm.forward_dir_deg, storm.rmw_km
                )
                vs = surface_wind_reduction(max(0, vg + v_asym))
                if vs >= threshold_ms:
                    radius = r
                else:
                    break
            result[threshold_kt][qname] = radius

    return result
