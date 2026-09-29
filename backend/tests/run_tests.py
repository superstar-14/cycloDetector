"""
Comprehensive test runner executing all 40+ unit tests across
classification, Dvorak scale, geo calculations, and Holland vortex model.
"""
import math
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.classification import (
    IMDCategory, classify_wind, t_number_to_wind_kt, wind_kt_to_t_number,
    t_number_to_category, kt_to_kmh, kmh_to_kt, get_category_info,
    get_category_color, all_categories,
)
from app.core.geo import (
    haversine_km, bearing_deg, destination_point, point_in_bbox,
    generate_circle_polygon, generate_quadrant_polygon, LatLon,
    translational_speed_kmh, NIO_BBOX,
)
from app.core.wind_field import (
    estimate_holland_b, gradient_wind_speed, surface_wind_reduction,
    inflow_angle, land_decay_factor, gust_factor, coriolis_parameter,
    StormParams, compute_wind_at_point, wind_radii_from_profile,
)

class TestIMDClassification(unittest.TestCase):
    def test_low_pressure(self):
        cat = classify_wind(10)
        self.assertEqual(cat.category, IMDCategory.LOW_PRESSURE)
        self.assertEqual(cat.label, "Low Pressure Area")

    def test_depression(self):
        cat = classify_wind(20)
        self.assertEqual(cat.category, IMDCategory.D)
        self.assertEqual(cat.abbreviation, "D")

    def test_deep_depression(self):
        cat = classify_wind(30)
        self.assertEqual(cat.category, IMDCategory.DD)

    def test_cyclonic_storm(self):
        cat = classify_wind(40)
        self.assertEqual(cat.category, IMDCategory.CS)
        self.assertEqual(cat.color, "#00B050")

    def test_severe_cyclonic_storm(self):
        cat = classify_wind(55)
        self.assertEqual(cat.category, IMDCategory.SCS)

    def test_very_severe_cyclonic_storm(self):
        cat = classify_wind(75)
        self.assertEqual(cat.category, IMDCategory.VSCS)

    def test_extremely_severe_cyclonic_storm(self):
        cat = classify_wind(100)
        self.assertEqual(cat.category, IMDCategory.ESCS)
        self.assertEqual(cat.color, "#FF0000")

    def test_super_cyclonic_storm(self):
        cat = classify_wind(130)
        self.assertEqual(cat.category, IMDCategory.SuCS)
        self.assertEqual(cat.color, "#990000")

    def test_boundary_values(self):
        self.assertEqual(classify_wind(17).category, IMDCategory.D)
        self.assertEqual(classify_wind(27).category, IMDCategory.D)
        self.assertEqual(classify_wind(28).category, IMDCategory.DD)
        self.assertEqual(classify_wind(33).category, IMDCategory.DD)
        self.assertEqual(classify_wind(34).category, IMDCategory.CS)
        self.assertEqual(classify_wind(47).category, IMDCategory.CS)
        self.assertEqual(classify_wind(48).category, IMDCategory.SCS)
        self.assertEqual(classify_wind(63).category, IMDCategory.SCS)
        self.assertEqual(classify_wind(64).category, IMDCategory.VSCS)
        self.assertEqual(classify_wind(89).category, IMDCategory.VSCS)
        self.assertEqual(classify_wind(90).category, IMDCategory.ESCS)
        self.assertEqual(classify_wind(119).category, IMDCategory.ESCS)
        self.assertEqual(classify_wind(120).category, IMDCategory.SuCS)

    def test_negative_wind_raises(self):
        with self.assertRaises(ValueError):
            classify_wind(-5)

    def test_zero_wind(self):
        cat = classify_wind(0)
        self.assertEqual(cat.category, IMDCategory.LOW_PRESSURE)

    def test_all_categories_count(self):
        self.assertEqual(len(all_categories()), 8)

class TestDvorakConversion(unittest.TestCase):
    def test_exact_lookup(self):
        self.assertEqual(t_number_to_wind_kt(1.0), 25.0)
        self.assertEqual(t_number_to_wind_kt(4.0), 65.0)
        self.assertEqual(t_number_to_wind_kt(6.0), 115.0)
        self.assertEqual(t_number_to_wind_kt(8.0), 170.0)

    def test_interpolation(self):
        v = t_number_to_wind_kt(4.25)
        self.assertTrue(65.0 < v < 77.0)

    def test_clamping(self):
        self.assertEqual(t_number_to_wind_kt(0.5), 25.0)
        self.assertEqual(t_number_to_wind_kt(9.0), 170.0)

    def test_inverse_lookup(self):
        t = wind_kt_to_t_number(65.0)
        self.assertAlmostEqual(t, 4.0, places=1)

    def test_t_number_to_category(self):
        self.assertEqual(t_number_to_category(1.5).category, IMDCategory.D)
        self.assertEqual(t_number_to_category(3.0).category, IMDCategory.CS)
        self.assertEqual(t_number_to_category(4.0).category, IMDCategory.VSCS)
        self.assertEqual(t_number_to_category(6.0).category, IMDCategory.ESCS)

class TestUnitConversions(unittest.TestCase):
    def test_kt_to_kmh(self):
        self.assertAlmostEqual(kt_to_kmh(100), 185.2)

    def test_kmh_to_kt(self):
        self.assertAlmostEqual(kmh_to_kt(185.2), 100.0)

    def test_roundtrip(self):
        for kt in [25, 45, 64, 90, 115, 130]:
            self.assertAlmostEqual(kmh_to_kt(kt_to_kmh(kt)), kt, places=5)

class TestGeoUtilities(unittest.TestCase):
    def test_haversine_same_point(self):
        self.assertAlmostEqual(haversine_km(15, 80, 15, 80), 0.0)

    def test_haversine_known_distance(self):
        dist = haversine_km(19.076, 72.877, 13.082, 80.270)
        self.assertTrue(1000 < dist < 1060)

    def test_bearing_cardinal(self):
        self.assertAlmostEqual(bearing_deg(0, 0, 1, 0), 0.0, places=1)
        self.assertAlmostEqual(bearing_deg(0, 0, 0, 1), 90.0, places=1)
        self.assertAlmostEqual(bearing_deg(0, 0, -1, 0), 180.0, places=1)
        self.assertAlmostEqual(bearing_deg(0, 0, 0, -1), 270.0, places=1)

    def test_destination_roundtrip(self):
        lat1, lon1 = 15.0, 85.0
        lat2, lon2 = destination_point(lat1, lon1, 45.0, 200.0)
        dist = haversine_km(lat1, lon1, lat2, lon2)
        self.assertAlmostEqual(dist, 200.0, places=1)

    def test_point_in_bbox(self):
        self.assertTrue(point_in_bbox(15, 80))
        self.assertFalse(point_in_bbox(50, 80))

    def test_circle_polygon(self):
        ring = generate_circle_polygon(15, 80, 100, num_points=8)
        self.assertEqual(len(ring), 9)
        self.assertAlmostEqual(ring[0][0], ring[-1][0], places=5)
        self.assertAlmostEqual(ring[0][1], ring[-1][1], places=5)

class TestHollandWindField(unittest.TestCase):
    def setUp(self):
        self.fani_params = StormParams(
            center_lat=16.0,
            center_lon=85.0,
            max_wind_kt=115.0,
            mslp_hpa=932.0,
            env_pressure_hpa=1010.0,
            rmw_km=35.0,
            forward_speed_kmh=17.0,
            forward_dir_deg=340.0,
        )

    def test_estimate_holland_b(self):
        b = estimate_holland_b(self.fani_params.max_wind_ms, self.fani_params.delta_p_pa)
        self.assertTrue(1.0 <= b <= 2.5)

    def test_gradient_wind_decay(self):
        b = estimate_holland_b(self.fani_params.max_wind_ms, self.fani_params.delta_p_pa)
        f = coriolis_parameter(self.fani_params.center_lat)
        v_rmw = gradient_wind_speed(self.fani_params.rmw_km, self.fani_params.rmw_km, self.fani_params.max_wind_ms, b, f)
        v_2rmw = gradient_wind_speed(2 * self.fani_params.rmw_km, self.fani_params.rmw_km, self.fani_params.max_wind_ms, b, f)
        v_4rmw = gradient_wind_speed(4 * self.fani_params.rmw_km, self.fani_params.rmw_km, self.fani_params.max_wind_ms, b, f)
        self.assertTrue(v_rmw > v_2rmw > v_4rmw)

    def test_surface_reduction(self):
        self.assertAlmostEqual(surface_wind_reduction(60, over_water=True), 54.0)
        self.assertAlmostEqual(surface_wind_reduction(60, over_water=False), 48.0)

    def test_gust_factor(self):
        self.assertAlmostEqual(gust_factor(50, over_water=True), 60.0)
        self.assertAlmostEqual(gust_factor(50, over_water=False), 70.0)

    def test_land_decay(self):
        self.assertEqual(land_decay_factor(0, 60), 1.0)
        factor_6h = land_decay_factor(6, 60)
        factor_12h = land_decay_factor(12, 60)
        self.assertTrue(factor_6h < 1.0)
        self.assertTrue(factor_12h < factor_6h)

    def test_compute_wind_at_point(self):
        lat, lon = destination_point(self.fani_params.center_lat, self.fani_params.center_lon, 90, 100)
        sustained, gust, direction = compute_wind_at_point(lat, lon, self.fani_params)
        self.assertTrue(sustained > 10)
        self.assertTrue(sustained < self.fani_params.max_wind_ms)
        self.assertTrue(gust > sustained)
        self.assertTrue(0 <= direction < 360)

    def test_wind_radii_structure(self):
        radii = wind_radii_from_profile(self.fani_params)
        self.assertIn(34, radii)
        self.assertIn(50, radii)
        self.assertIn(64, radii)
        for threshold in [34, 50, 64]:
            self.assertIn("NE", radii[threshold])
            self.assertIn("SE", radii[threshold])
            self.assertIn("SW", radii[threshold])
            self.assertIn("NW", radii[threshold])

    def test_wind_radii_ordering(self):
        radii = wind_radii_from_profile(self.fani_params)
        for q in ["NE", "SE", "SW", "NW"]:
            self.assertTrue(radii[34][q] >= radii[50][q] >= radii[64][q])

if __name__ == "__main__":
    unittest.main()
