"""
Geospatial Utility Functions

Provides distance calculations, bearing computations, coordinate transformations,
and bounding box utilities for the North Indian Ocean domain (0–30°N, 45–100°E).
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Tuple, List, Optional

# Earth's mean radius in km (WGS-84 mean)
EARTH_RADIUS_KM = 6371.0088

# North Indian Ocean domain
NIO_BBOX = {
    "lat_min": 0.0,
    "lat_max": 30.0,
    "lon_min": 45.0,
    "lon_max": 100.0,
}


@dataclass
class LatLon:
    """A geographic coordinate."""
    lat: float
    lon: float

    def to_tuple(self) -> Tuple[float, float]:
        return (self.lat, self.lon)

    def is_in_nio(self) -> bool:
        """Check if the point is within the North Indian Ocean domain."""
        return (
            NIO_BBOX["lat_min"] <= self.lat <= NIO_BBOX["lat_max"]
            and NIO_BBOX["lon_min"] <= self.lon <= NIO_BBOX["lon_max"]
        )


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate great-circle distance between two points using Haversine formula.

    Args:
        lat1, lon1: First point in decimal degrees.
        lat2, lon2: Second point in decimal degrees.

    Returns:
        Distance in kilometers.
    """
    lat1_r, lon1_r = math.radians(lat1), math.radians(lon1)
    lat2_r, lon2_r = math.radians(lat2), math.radians(lon2)

    dlat = lat2_r - lat1_r
    dlon = lon2_r - lon1_r

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.asin(math.sqrt(a))
    return EARTH_RADIUS_KM * c


def bearing_deg(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate initial bearing (forward azimuth) from point 1 to point 2.

    Returns:
        Bearing in degrees (0 = North, 90 = East, 180 = South, 270 = West).
    """
    lat1_r, lon1_r = math.radians(lat1), math.radians(lon1)
    lat2_r, lon2_r = math.radians(lat2), math.radians(lon2)
    dlon = lon2_r - lon1_r

    x = math.sin(dlon) * math.cos(lat2_r)
    y = (
        math.cos(lat1_r) * math.sin(lat2_r)
        - math.sin(lat1_r) * math.cos(lat2_r) * math.cos(dlon)
    )
    return (math.degrees(math.atan2(x, y)) + 360) % 360


def destination_point(
    lat: float, lon: float, bearing_deg_val: float, distance_km: float
) -> Tuple[float, float]:
    """
    Calculate destination point given start, bearing, and distance.

    Returns:
        (lat, lon) of the destination point.
    """
    lat_r = math.radians(lat)
    lon_r = math.radians(lon)
    brng_r = math.radians(bearing_deg_val)
    d_r = distance_km / EARTH_RADIUS_KM

    lat2 = math.asin(
        math.sin(lat_r) * math.cos(d_r)
        + math.cos(lat_r) * math.sin(d_r) * math.cos(brng_r)
    )
    lon2 = lon_r + math.atan2(
        math.sin(brng_r) * math.sin(d_r) * math.cos(lat_r),
        math.cos(d_r) - math.sin(lat_r) * math.sin(lat2),
    )
    return (math.degrees(lat2), math.degrees(lon2))


def point_in_bbox(
    lat: float,
    lon: float,
    lat_min: float = NIO_BBOX["lat_min"],
    lat_max: float = NIO_BBOX["lat_max"],
    lon_min: float = NIO_BBOX["lon_min"],
    lon_max: float = NIO_BBOX["lon_max"],
) -> bool:
    """Check if a point is within a bounding box."""
    return lat_min <= lat <= lat_max and lon_min <= lon <= lon_max


def generate_circle_polygon(
    center_lat: float,
    center_lon: float,
    radius_km: float,
    num_points: int = 64,
) -> List[Tuple[float, float]]:
    """
    Generate a circle polygon (list of lon/lat points) on the Earth's surface.
    Useful for drawing wind radii rings.

    Returns:
        List of (lon, lat) tuples forming a closed ring (GeoJSON order).
    """
    points = []
    for i in range(num_points + 1):
        angle = (360.0 / num_points) * i
        lat, lon = destination_point(center_lat, center_lon, angle, radius_km)
        points.append((lon, lat))
    return points


def generate_quadrant_polygon(
    center_lat: float,
    center_lon: float,
    r_ne_km: float,
    r_se_km: float,
    r_sw_km: float,
    r_nw_km: float,
    num_points_per_quadrant: int = 16,
) -> List[Tuple[float, float]]:
    """
    Generate an asymmetric wind-radius polygon using per-quadrant radii.
    NE = 0-90°, SE = 90-180°, SW = 180-270°, NW = 270-360°.

    Returns:
        List of (lon, lat) tuples forming a closed ring (GeoJSON order).
    """
    points = []
    quadrants = [
        (0, 90, r_ne_km),
        (90, 180, r_se_km),
        (180, 270, r_sw_km),
        (270, 360, r_nw_km),
    ]

    for start_angle, end_angle, radius in quadrants:
        for i in range(num_points_per_quadrant):
            angle = start_angle + (end_angle - start_angle) * i / num_points_per_quadrant
            lat, lon = destination_point(center_lat, center_lon, angle, radius)
            points.append((lon, lat))

    # Close the ring
    if points:
        points.append(points[0])
    return points


def km_per_degree_lat() -> float:
    """Approximate km per degree of latitude."""
    return math.pi * EARTH_RADIUS_KM / 180.0


def km_per_degree_lon(lat: float) -> float:
    """Approximate km per degree of longitude at a given latitude."""
    return km_per_degree_lat() * math.cos(math.radians(lat))


def translational_speed_kmh(
    lat1: float, lon1: float, t1_hours: float,
    lat2: float, lon2: float, t2_hours: float,
) -> Tuple[float, float]:
    """
    Calculate translational speed and direction from two track points.

    Returns:
        (speed_kmh, direction_deg)
    """
    dist = haversine_km(lat1, lon1, lat2, lon2)
    dt = abs(t2_hours - t1_hours)
    if dt < 1e-6:
        return (0.0, 0.0)
    speed = dist / dt
    direction = bearing_deg(lat1, lon1, lat2, lon2)
    return (speed, direction)
