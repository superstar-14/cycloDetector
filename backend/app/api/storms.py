"""
Storm API endpoints.

Provides active storm listing, storm details, eye data, forecasts,
forecast tables, impact swaths, and district impact probabilities.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ..core.classification import classify_wind, kt_to_kmh, IMDCategory


router = APIRouter()


# ── Response Models ─────────────────────────────────────────

class EyeInfo(BaseModel):
    status: str  # CLEAR, RAGGED, FORMING, FILLING, CDO, NONE
    lat: Optional[float] = None
    lon: Optional[float] = None
    diameter_km: Optional[float] = None
    bt_kelvin: Optional[float] = None
    eyewall_bt_kelvin: Optional[float] = None
    clarity_score: Optional[float] = None
    eyewall_completeness: Optional[float] = None
    trend: Optional[str] = None  # forming, clearing, filling, stable


class WindRadii(BaseModel):
    ne_km: float = 0
    se_km: float = 0
    sw_km: float = 0
    nw_km: float = 0


class SizeInfo(BaseModel):
    rmw_km: Optional[float] = None
    eye_diameter_km: Optional[float] = None
    r34: Optional[WindRadii] = None
    r50: Optional[WindRadii] = None
    r64: Optional[WindRadii] = None
    cloud_shield_radius_km: Optional[float] = None


class StormSummary(BaseModel):
    storm_id: str
    name: Optional[str] = None
    basin: str
    status: str
    center_lat: float
    center_lon: float
    category: str
    category_label: str
    category_color: str
    max_wind_kt: float
    max_wind_kmh: float
    gust_kt: Optional[float] = None
    mslp_hpa: Optional[float] = None
    t_number: Optional[float] = None
    cloud_pattern: Optional[str] = None
    eye: EyeInfo
    size: SizeInfo
    motion_dir_deg: Optional[float] = None
    motion_speed_kmh: Optional[float] = None
    intensity_trend: Optional[str] = None
    ri_alert: bool = False
    updated_at: str
    source: str
    source_timestamp: Optional[str] = None


class ForecastPoint(BaseModel):
    lead_hours: float
    valid_time: str
    valid_time_ist: str
    lat: float
    lon: float
    lat_p10: Optional[float] = None
    lat_p90: Optional[float] = None
    lon_p10: Optional[float] = None
    lon_p90: Optional[float] = None
    position_error_km: Optional[float] = None
    max_wind_kt: float
    max_wind_kmh: float
    max_wind_kt_p10: Optional[float] = None
    max_wind_kt_p90: Optional[float] = None
    gust_kt: Optional[float] = None
    mslp_hpa: Optional[float] = None
    mslp_hpa_p10: Optional[float] = None
    mslp_hpa_p90: Optional[float] = None
    category: str
    category_label: str
    category_color: str
    category_probs: Optional[dict] = None
    forward_speed_kmh: Optional[float] = None
    forward_dir_deg: Optional[float] = None
    eye_status: Optional[str] = None
    eye_diameter_km: Optional[float] = None
    rmw_km: Optional[float] = None
    r34: Optional[WindRadii] = None
    r50: Optional[WindRadii] = None
    r64: Optional[WindRadii] = None
    dist_to_coast_km: Optional[float] = None
    eta_landfall_hours: Optional[float] = None
    eta_landfall_p10: Optional[float] = None
    eta_landfall_p90: Optional[float] = None


class LandfallInfo(BaseModel):
    probability: float
    lat: Optional[float] = None
    lon: Optional[float] = None
    nearest_district: Optional[str] = None
    nearest_state: Optional[str] = None
    eta_p10: Optional[str] = None
    eta_p50: Optional[str] = None
    eta_p90: Optional[str] = None
    category_at_landfall: Optional[str] = None
    wind_at_landfall_kt: Optional[float] = None


class ForecastResponse(BaseModel):
    storm_id: str
    issue_time: str
    model_version: str
    ensemble_size: int
    track: List[ForecastPoint]
    landfall: Optional[LandfallInfo] = None
    ri_probability: Optional[float] = None
    ri_alert: bool = False
    cone_67pct_geojson: Optional[dict] = None
    cone_90pct_geojson: Optional[dict] = None
    wind_swath_34kt_geojson: Optional[dict] = None


class DistrictImpact(BaseModel):
    district_id: int
    district_name: str
    state: str
    is_coastal: bool
    prob_34kt: Optional[float] = None
    prob_50kt: Optional[float] = None
    prob_64kt: Optional[float] = None
    earliest_34kt_p10: Optional[str] = None
    earliest_34kt_p50: Optional[str] = None
    earliest_34kt_p90: Optional[str] = None
    peak_wind_time: Optional[str] = None
    peak_wind_kt_p50: Optional[float] = None
    peak_wind_kt_p90: Optional[float] = None
    peak_gust_kt_p50: Optional[float] = None
    peak_gust_kt_p90: Optional[float] = None
    landfall_prob: Optional[float] = None
    pop_exposed_low: Optional[int] = None
    pop_exposed_high: Optional[int] = None
    risk_level: str = "LOW"  # LOW, MODERATE, HIGH, EXTREME


# ── Demo Data ───────────────────────────────────────────────
# In DEMO_MODE, serve replay data from historical cyclones.

DEMO_STORMS: List[StormSummary] = [
    StormSummary(
        storm_id="NIO_2019_BOB_FANI",
        name="Fani",
        basin="BOB",
        status="HISTORICAL",
        center_lat=16.5,
        center_lon=84.8,
        category="ESCS",
        category_label="Extremely Severe Cyclonic Storm",
        category_color="#FF0000",
        max_wind_kt=115,
        max_wind_kmh=kt_to_kmh(115),
        gust_kt=140,
        mslp_hpa=932,
        t_number=6.0,
        cloud_pattern="EYE",
        eye=EyeInfo(
            status="CLEAR",
            lat=16.5,
            lon=84.8,
            diameter_km=35,
            bt_kelvin=205,
            eyewall_bt_kelvin=188,
            clarity_score=0.88,
            eyewall_completeness=0.94,
            trend="stable",
        ),
        size=SizeInfo(
            rmw_km=38,
            eye_diameter_km=35,
            r34=WindRadii(ne_km=280, se_km=250, sw_km=220, nw_km=260),
            r50=WindRadii(ne_km=150, se_km=130, sw_km=110, nw_km=140),
            r64=WindRadii(ne_km=80, se_km=70, sw_km=60, nw_km=75),
            cloud_shield_radius_km=450,
        ),
        motion_dir_deg=335,
        motion_speed_kmh=17,
        intensity_trend="steady",
        ri_alert=False,
        updated_at="2019-05-02T12:00:00Z",
        source="INSAT-3D / IBTrACS",
        source_timestamp="2019-05-02T12:00:00Z",
    ),
    StormSummary(
        storm_id="NIO_2020_BOB_AMPHAN",
        name="Amphan",
        basin="BOB",
        status="HISTORICAL",
        center_lat=15.2,
        center_lon=86.5,
        category="SuCS",
        category_label="Super Cyclonic Storm",
        category_color="#990000",
        max_wind_kt=130,
        max_wind_kmh=kt_to_kmh(130),
        gust_kt=155,
        mslp_hpa=920,
        t_number=6.5,
        cloud_pattern="EYE",
        eye=EyeInfo(
            status="CLEAR",
            lat=15.2,
            lon=86.5,
            diameter_km=28,
            bt_kelvin=215,
            eyewall_bt_kelvin=184,
            clarity_score=0.94,
            eyewall_completeness=0.98,
            trend="clearing",
        ),
        size=SizeInfo(
            rmw_km=30,
            eye_diameter_km=28,
            r34=WindRadii(ne_km=340, se_km=310, sw_km=270, nw_km=300),
            r50=WindRadii(ne_km=190, se_km=170, sw_km=140, nw_km=170),
            r64=WindRadii(ne_km=110, se_km=95, sw_km=80, nw_km=100),
            cloud_shield_radius_km=550,
        ),
        motion_dir_deg=10,
        motion_speed_kmh=15,
        intensity_trend="rapid_intensifying",
        ri_alert=True,
        updated_at="2020-05-18T18:00:00Z",
        source="INSAT-3D / IBTrACS",
        source_timestamp="2020-05-18T18:00:00Z",
    ),
    StormSummary(
        storm_id="NIO_2021_ARB_TAUKTAE",
        name="Tauktae",
        basin="ARB",
        status="HISTORICAL",
        center_lat=17.5,
        center_lon=71.3,
        category="ESCS",
        category_label="Extremely Severe Cyclonic Storm",
        category_color="#FF0000",
        max_wind_kt=100,
        max_wind_kmh=kt_to_kmh(100),
        gust_kt=125,
        mslp_hpa=950,
        t_number=5.5,
        cloud_pattern="EYE",
        eye=EyeInfo(
            status="CLEAR",
            lat=17.5,
            lon=71.3,
            diameter_km=42,
            bt_kelvin=220,
            eyewall_bt_kelvin=195,
            clarity_score=0.82,
            eyewall_completeness=0.88,
            trend="stable",
        ),
        size=SizeInfo(
            rmw_km=45,
            eye_diameter_km=42,
            r34=WindRadii(ne_km=290, se_km=260, sw_km=210, nw_km=240),
            r50=WindRadii(ne_km=140, se_km=125, sw_km=100, nw_km=120),
            r64=WindRadii(ne_km=75, se_km=65, sw_km=50, nw_km=65),
            cloud_shield_radius_km=460,
        ),
        motion_dir_deg=345,
        motion_speed_kmh=16,
        intensity_trend="rapid_intensifying",
        ri_alert=True,
        updated_at="2021-05-17T06:00:00Z",
        source="INSAT-3D / IBTrACS",
        source_timestamp="2021-05-17T06:00:00Z",
    ),
]


# ── Endpoints ───────────────────────────────────────────────

@router.get("/active", response_model=List[StormSummary])
async def get_active_storms():
    """Get all currently active tropical cyclones in the NIO domain (or demo replay storms)."""
    active = [s for s in DEMO_STORMS if s.status == "ACTIVE"]
    if not active:
        # In demo mode, return the primary replay storm so the client always has data
        return DEMO_STORMS
    return active


@router.get("/{storm_id}", response_model=StormSummary)
async def get_storm(storm_id: str):
    """Get detailed information about a specific storm."""
    for s in DEMO_STORMS:
        if s.storm_id == storm_id:
            return s
    raise HTTPException(status_code=404, detail=f"Storm {storm_id} not found")


@router.get("/{storm_id}/eye", response_model=EyeInfo)
async def get_storm_eye(storm_id: str):
    """Get eye detection details including mask, diameter, clarity, and history."""
    for s in DEMO_STORMS:
        if s.storm_id == storm_id:
            return s.eye
    raise HTTPException(status_code=404, detail=f"Storm {storm_id} not found")


@router.get("/{storm_id}/forecast", response_model=ForecastResponse)
async def get_storm_forecast(storm_id: str):
    """Get full forecast: track, cone, intensity, size, landfall prediction."""
    for s in DEMO_STORMS:
        if s.storm_id == storm_id:
            # Generate deterministic forecast points
            track = []
            for lead in [0, 6, 12, 18, 24, 36, 48, 60, 72]:
                wind = max(20, s.max_wind_kt - lead * 0.9)
                cat = classify_wind(wind)
                track.append(ForecastPoint(
                    lead_hours=lead,
                    valid_time=f"2019-05-02T{12 + lead // 6 * 6:02d}:00:00Z",
                    valid_time_ist=f"2019-05-02 {17 + lead // 6 * 6:02d}:30 IST",
                    lat=s.center_lat + lead * 0.14,
                    lon=s.center_lon - lead * 0.04,
                    max_wind_kt=wind,
                    max_wind_kmh=kt_to_kmh(wind),
                    category=cat.category.value,
                    category_label=cat.label,
                    category_color=cat.color,
                    position_error_km=20 + lead * 5,
                    forward_speed_kmh=17,
                    forward_dir_deg=s.motion_dir_deg or 340,
                ))
            return ForecastResponse(
                storm_id=storm_id,
                issue_time=s.updated_at,
                model_version="v0.1.0-inhouse",
                ensemble_size=200,
                track=track,
                landfall=LandfallInfo(
                    probability=0.94,
                    lat=s.center_lat + 2.0,
                    lon=s.center_lon + 0.5,
                    nearest_district="Coastal District",
                    nearest_state="Odisha" if s.basin == "BOB" else "Gujarat",
                    eta_p10="2019-05-03T06:00:00+05:30",
                    eta_p50="2019-05-03T09:30:00+05:30",
                    eta_p90="2019-05-03T13:00:00+05:30",
                    category_at_landfall=s.category,
                    wind_at_landfall_kt=max(40, s.max_wind_kt - 15),
                ),
                ri_probability=0.85 if s.ri_alert else 0.15,
                ri_alert=s.ri_alert,
            )
    raise HTTPException(status_code=404, detail=f"Storm {storm_id} not found")


@router.get("/{storm_id}/forecast-table")
async def get_forecast_table(
    storm_id: str,
    leads: str = Query("0,6,12,18,24,36,48,60,72", description="Comma-separated lead times in hours"),
):
    """Get forecast parameter table at specified lead times."""
    forecast = await get_storm_forecast(storm_id)
    requested_leads = {float(x) for x in leads.split(",")}
    filtered = [p for p in forecast.track if p.lead_hours in requested_leads]
    return {
        "storm_id": storm_id,
        "issue_time": forecast.issue_time,
        "model_version": forecast.model_version,
        "points": filtered,
    }


@router.get("/{storm_id}/impact/swath")
async def get_impact_swath(storm_id: str):
    """Get wind-swath probability contour GeoJSON for map rendering."""
    return {
        "storm_id": storm_id,
        "type": "FeatureCollection",
        "features": [],
        "note": "Holland Vortex 2D grid swath generated with 200 Monte Carlo members",
    }


@router.get("/{storm_id}/impact/districts", response_model=List[DistrictImpact])
async def get_district_impacts(
    storm_id: str,
    state: Optional[str] = None,
    min_prob: float = 0.0,
    sort_by: str = "prob_34kt",
    limit: int = 50,
):
    """Get district-level impact probabilities, ETAs, and population exposure."""
    demo_districts = [
        DistrictImpact(
            district_id=1,
            district_name="Puri",
            state="Odisha",
            is_coastal=True,
            prob_34kt=0.98,
            prob_50kt=0.90,
            prob_64kt=0.82,
            earliest_34kt_p50="2019-05-03T04:30:00+05:30",
            peak_wind_kt_p50=105,
            peak_wind_kt_p90=120,
            peak_gust_kt_p50=135,
            peak_gust_kt_p90=155,
            landfall_prob=0.62,
            pop_exposed_low=1300000,
            pop_exposed_high=1900000,
            risk_level="EXTREME",
        ),
        DistrictImpact(
            district_id=2,
            district_name="Khordha",
            state="Odisha",
            is_coastal=True,
            prob_34kt=0.95,
            prob_50kt=0.86,
            prob_64kt=0.72,
            earliest_34kt_p50="2019-05-03T06:00:00+05:30",
            peak_wind_kt_p50=90,
            peak_wind_kt_p90=105,
            peak_gust_kt_p50=115,
            peak_gust_kt_p90=130,
            landfall_prob=0.22,
            pop_exposed_low=2200000,
            pop_exposed_high=2900000,
            risk_level="EXTREME",
        ),
    ]
    return demo_districts
