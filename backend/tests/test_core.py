"""
Unit tests for IMD classification, T-number conversion, geo utilities,
and Holland wind field model.
"""
import math
import pytest
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.classification import (
    IMDCategory, classify_wind, t_number_to_wind_kt, wind_kt_to_t_number,
    t_number_to_category, kt_to_kmh, kmh_to_kt, get_category_info,
    get_category_color, all_categories,
)
from app.core.geo import (
    haversine_km, bearing_deg, destination_point, point_in_bbox,
    generate_circle_polygon, generate_quadrant_polygon, LatLon,
    translational_speed_kmh,
)
from app.core.wind_field import (
    estimate_holland_b, gradient_wind_speed, surface_wind_reduction,
    inflow_angle, land_decay_factor, gust_factor, coriolis_parameter,
    StormParams, compute_wind_at_point, wind_radii_from_profile,
)


# ═══════════════════════════════════════════════════════════
# Classification Tests
# ═══════════════════════════════════════════════════════════

class TestIMDClassification:
    """Test IMD cyclone category classification."""

    def test_low_pressure(self):
        cat = classify_wind(10)
        assert cat.category == IMDCategory.LOW_PRESSURE
        assert cat.label == "Low Pressure Area"

    def test_depression(self):
        cat = classify_wind(20)
        assert cat.category == IMDCategory.D
        assert cat.abbreviation == "D"

    def test_deep_depression(self):
        cat = classify_wind(30)
        assert cat.category == IMDCategory.DD

    def test_cyclonic_storm(self):
        cat = classify_wind(40)
        assert cat.category == IMDCategory.CS
        assert cat.color == "#00B050"

    def test_severe_cyclonic_storm(self):
        cat = classify_wind(55)
        assert cat.category == IMDCategory.SCS

    def test_very_severe_cyclonic_storm(self):
        cat = classify_wind(75)
        assert cat.category == IMDCategory.VSCS

    def test_extremely_severe_cyclonic_storm(self):
        cat = classify_wind(100)
        assert cat.category == IMDCategory.ESCS
        assert cat.color == "#FF0000"

    def test_super_cyclonic_storm(self):
        cat = classify_wind(130)
        assert cat.category == IMDCategory.SuCS
        assert cat.color == "#990000"

    def test_boundary_values(self):
        """Test exact boundary wind speeds."""
        assert classify_wind(17).category == IMDCategory.D
        assert classify_wind(27).category == IMDCategory.D
        assert classify_wind(28).category == IMDCategory.DD
        assert classify_wind(33).category == IMDCategory.DD
        assert classify_wind(34).category == IMDCategory.CS
        assert classify_wind(47).category == IMDCategory.CS
        assert classify_wind(48).category == IMDCategory.SCS
        assert classify_wind(63).category == IMDCategory.SCS
        assert classify_wind(64).category == IMDCategory.VSCS
        assert classify_wind(89).category == IMDCategory.VSCS
        assert classify_wind(90).category == IMDCategory.ESCS
        assert classify_wind(119).category == IMDCategory.ESCS
        assert classify_wind(120).category == IMDCategory.SuCS

    def test_negative_wind_raises(self):
        with pytest.raises(ValueError):
            classify_wind(-5)

    def test_zero_wind(self):
        cat = classify_wind(0)
        assert cat.category == IMDCategory.LOW_PRESSURE

    def test_all_categories_count(self):
        assert len(all_categories()) == 8

    def test_get_category_info(self):
        info = get_category_info(IMDCategory.VSCS)
        assert info.min_wind_kt == 64
        assert info.max_wind_kt == 89

    def test_get_category_color(self):
        assert get_category_color(130) == "#990000"
        assert get_category_color(40) == "#00B050"


class TestUnitConversion:
    """Test unit conversions."""

    def test_kt_to_kmh(self):
        assert abs(kt_to_kmh(1) - 1.852) < 0.001

    def test_kmh_to_kt(self):
        assert abs(kmh_to_kt(1.852) - 1.0) < 0.001

    def test_roundtrip(self):
        for kt in [34, 64, 90, 120]:
            assert abs(kmh_to_kt(kt_to_kmh(kt)) - kt) < 0.001

    def test_wind_range_str(self):
        cat = classify_wind(75)
        assert "64" in cat.wind_range_str
        assert "89" in cat.wind_range_str
        assert "kt" in cat.wind_range_str
        assert "km/h" in cat.wind_range_str


class TestDvorakConversion:
    """Test Dvorak T-number to wind speed conversion."""

    def test_known_values(self):
        assert t_number_to_wind_kt(1.0) == 25
        assert t_number_to_wind_kt(2.5) == 35
        assert t_number_to_wind_kt(4.0) == 65
        assert t_number_to_wind_kt(5.5) == 102
        assert t_number_to_wind_kt(7.0) == 140
        assert t_number_to_wind_kt(8.0) == 170

    def test_interpolation(self):
        """T=3.25 should be midway between T3.0(45) and T3.5(55) = 50."""
        assert abs(t_number_to_wind_kt(3.25) - 50.0) < 0.01

    def test_clamp_low(self):
        assert t_number_to_wind_kt(0.5) == 25

    def test_clamp_high(self):
        assert t_number_to_wind_kt(9.0) == 170

    def test_inverse_known_values(self):
        assert abs(wind_kt_to_t_number(65) - 4.0) < 0.01
        assert abs(wind_kt_to_t_number(140) - 7.0) < 0.01

    def test_roundtrip_t_number(self):
        for t in [2.0, 3.5, 5.0, 6.5]:
            wind = t_number_to_wind_kt(t)
            t_back = wind_kt_to_t_number(wind)
            assert abs(t_back - t) < 0.01

    def test_t_to_category(self):
        cat = t_number_to_category(4.0)
        assert cat.category == IMDCategory.VSCS  # T4.0 = 65 kt


# ═══════════════════════════════════════════════════════════
# Geo Tests
# ═══════════════════════════════════════════════════════════

class TestGeoUtilities:
    """Test geospatial utility functions."""

    def test_haversine_zero(self):
        assert haversine_km(15, 80, 15, 80) == 0.0

    def test_haversine_known(self):
        """Chennai (13.08, 80.27) to Kolkata (22.57, 88.36) ≈ 1361 km."""
        d = haversine_km(13.08, 80.27, 22.57, 88.36)
        assert 1350 < d < 1380

    def test_bearing_north(self):
        b = bearing_deg(10, 80, 20, 80)
        assert abs(b - 0.0) < 1.0  # Due north

    def test_bearing_east(self):
        b = bearing_deg(15, 80, 15, 90)
        assert abs(b - 90.0) < 2.0  # Roughly east

    def test_destination_point(self):
        """Go 100 km due north from (15, 80)."""
        lat, lon = destination_point(15, 80, 0, 100)
        assert abs(lat - 15.9) < 0.1
        assert abs(lon - 80.0) < 0.1

    def test_point_in_bbox(self):
        assert point_in_bbox(15, 80)
        assert not point_in_bbox(35, 80)
        assert not point_in_bbox(15, 110)

    def test_latlon_in_nio(self):
        p = LatLon(15, 80)
        assert p.is_in_nio()
        p2 = LatLon(35, 80)
        assert not p2.is_in_nio()

    def test_circle_polygon(self):
        ring = generate_circle_polygon(15, 80, 100, num_points=8)
        assert len(ring) == 9  # closed ring
        assert ring[0] == ring[-1]

    def test_quadrant_polygon(self):
        ring = generate_quadrant_polygon(15, 80, 200, 180, 150, 190, num_points_per_quadrant=4)
        assert len(ring) == 17  # 4*4 + 1 closing point

    def test_translational_speed(self):
        speed, direction = translational_speed_kmh(15, 80, 0, 16, 80, 6)
        assert speed > 0
        # ~111 km due north in 6 hours ≈ 18.5 km/h
        assert 17 < speed < 20


# ═══════════════════════════════════════════════════════════
# Wind Field Tests
# ═══════════════════════════════════════════════════════════

class TestWindField:
    """Test Holland parametric wind field model."""

    @pytest.fixture
    def fani_params(self):
        """Cyclone Fani parameters near peak intensity."""
        return StormParams(
            center_lat=13.5,
            center_lon=85.2,
            max_wind_kt=115,
            rmw_km=40,
            mslp_hpa=932,
            env_pressure_hpa=1010,
            forward_speed_kmh=17,
            forward_dir_deg=335,
        )

    def test_coriolis(self):
        f = coriolis_parameter(15)
        assert 3.5e-5 < f < 4.0e-5

    def test_coriolis_equator(self):
        f = coriolis_parameter(0)
        assert f == 0.0

    def test_holland_b_range(self):
        b = estimate_holland_b(60, 8000)
        assert 1.0 <= b <= 2.5

    def test_gradient_wind_at_rmw(self, fani_params):
        """Wind at RMW should approximately equal Vmax."""
        b = estimate_holland_b(fani_params.max_wind_ms, fani_params.delta_p_pa)
        f = coriolis_parameter(fani_params.center_lat)
        v = gradient_wind_speed(
            fani_params.rmw_km, fani_params.rmw_km,
            fani_params.max_wind_ms, b, f,
        )
        # At r=RMW, V should equal Vmax (by Holland definition)
        assert abs(v - fani_params.max_wind_ms) < 1.0

    def test_gradient_wind_decay(self, fani_params):
        """Wind should decrease beyond RMW."""
        b = estimate_holland_b(fani_params.max_wind_ms, fani_params.delta_p_pa)
        f = coriolis_parameter(fani_params.center_lat)
        v_rmw = gradient_wind_speed(fani_params.rmw_km, fani_params.rmw_km, fani_params.max_wind_ms, b, f)
        v_2rmw = gradient_wind_speed(2 * fani_params.rmw_km, fani_params.rmw_km, fani_params.max_wind_ms, b, f)
        v_4rmw = gradient_wind_speed(4 * fani_params.rmw_km, fani_params.rmw_km, fani_params.max_wind_ms, b, f)
        assert v_rmw > v_2rmw > v_4rmw

    def test_surface_reduction(self):
        assert surface_wind_reduction(60, over_water=True) == 54.0
        assert surface_wind_reduction(60, over_water=False) == 48.0

    def test_inflow_angle(self):
        assert inflow_angle(40, 40) == pytest.approx(10.0, abs=0.1)
        assert inflow_angle(80, 40) > 10.0

    def test_gust_factor(self):
        assert gust_factor(50, over_water=True) == 60.0
        assert gust_factor(50, over_water=False) == 70.0

    def test_land_decay(self):
        assert land_decay_factor(0, 60) == 1.0
        factor_6h = land_decay_factor(6, 60)
        factor_12h = land_decay_factor(12, 60)
        assert factor_6h < 1.0
        assert factor_12h < factor_6h

    def test_compute_wind_at_point(self, fani_params):
        """Wind at 100 km from center should be significant but less than Vmax."""
        lat, lon = destination_point(fani_params.center_lat, fani_params.center_lon, 90, 100)
        sustained, gust, direction = compute_wind_at_point(lat, lon, fani_params)
        assert sustained > 10  # should be significant
        assert sustained < fani_params.max_wind_ms  # less than max
        assert gust > sustained  # gust > sustained
        assert 0 <= direction < 360

    def test_wind_radii_structure(self, fani_params):
        radii = wind_radii_from_profile(fani_params)
        assert 34 in radii
        assert 50 in radii
        assert 64 in radii
        for threshold in [34, 50, 64]:
            assert "NE" in radii[threshold]
            assert "SE" in radii[threshold]
            assert "SW" in radii[threshold]
            assert "NW" in radii[threshold]

    def test_wind_radii_ordering(self, fani_params):
        """R34 > R50 > R64 (outer threshold has larger radius)."""
        radii = wind_radii_from_profile(fani_params)
        for q in ["NE", "SE", "SW", "NW"]:
            assert radii[34][q] >= radii[50][q] >= radii[64][q]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
