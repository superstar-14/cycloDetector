"""
Map Layers API endpoints.

Serves raster tiles and layer metadata for the map dashboard.
"""
from __future__ import annotations

from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter()


AVAILABLE_LAYERS = [
    {"id": "insat_ir", "name": "INSAT-3D IR (Enhanced)", "type": "raster", "source": "MOSDAC"},
    {"id": "water_vapour", "name": "Water Vapour", "type": "raster", "source": "MOSDAC"},
    {"id": "thermal", "name": "Thermal (Land/Sea Temp)", "type": "raster", "source": "GFS/SST"},
    {"id": "wind_particles", "name": "Wind Streamlines", "type": "particle", "source": "GFS"},
    {"id": "wind_barbs", "name": "Wind Barbs", "type": "vector", "source": "GFS"},
    {"id": "precipitation", "name": "Precipitation/Radar", "type": "raster", "source": "GPM_IMERG"},
    {"id": "humidity", "name": "Mid-Level Humidity", "type": "raster", "source": "GFS"},
    {"id": "wind_shear", "name": "Wind Shear (200-850hPa)", "type": "raster", "source": "GFS"},
    {"id": "sst", "name": "Sea Surface Temperature", "type": "raster", "source": "GHRSST"},
    {"id": "ocean_winds", "name": "Ocean Surface Winds", "type": "vector", "source": "SCATSAT/ASCAT"},
    {"id": "past_track", "name": "Past Track", "type": "line", "source": "MODEL"},
    {"id": "graticule", "name": "Lat/Lon Grid", "type": "line", "source": "LOCAL"},
    {"id": "eye_marker", "name": "Eye of Cyclone", "type": "symbol", "source": "MODEL"},
    {"id": "size_rings", "name": "Wind Radii Rings", "type": "polygon", "source": "MODEL"},
    {"id": "forecast_cone", "name": "Forecast Track & Cone", "type": "polygon", "source": "MODEL"},
    {"id": "impact_zones", "name": "Impact Ring/Cone", "type": "polygon", "source": "MODEL"},
    {"id": "district_prob", "name": "District Probability", "type": "choropleth", "source": "MODEL"},
    {"id": "population", "name": "Population Density", "type": "raster", "source": "GHS-POP"},
]


@router.get("/")
async def list_layers():
    """List all available map layers."""
    return {"layers": AVAILABLE_LAYERS}


@router.get("/{layer_name}")
async def get_layer_data(
    layer_name: str,
    time: Optional[str] = None,
    bbox: Optional[str] = None,
    format: str = Query("geojson", enum=["geojson", "png", "webp"]),
):
    """
    Get layer data for a specific time and bounding box.
    Returns GeoJSON for vector layers, tile URL template for raster layers.
    """
    layer = next((l for l in AVAILABLE_LAYERS if l["id"] == layer_name), None)
    if not layer:
        return {"error": f"Layer '{layer_name}' not found", "available": [l["id"] for l in AVAILABLE_LAYERS]}

    return {
        "layer": layer,
        "time": time,
        "bbox": bbox,
        "data": None,
        "source_timestamp": None,
        "data_age_seconds": None,
        "note": "Layer data serving requires active data ingestion pipelines",
    }
