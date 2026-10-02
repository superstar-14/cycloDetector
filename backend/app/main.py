"""
IMD Cyclone Detector – FastAPI Application

Main entrypoint for the backend API server.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

from .config import settings
from .api import storms, layers, history, health, websocket_router, alerts, satellite


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info(
        "Starting IMD Cyclone Detector (DEMO_MODE=%s, ENV=%s)",
        settings.DEMO_MODE,
        settings.APP_ENV,
    )
    yield
    logger.info("Shutting down IMD Cyclone Detector")


app = FastAPI(
    title="IMD Cyclone Detector API",
    description=(
        "Tropical Cyclone Identification, Classification & Prediction Platform "
        "for the North Indian Ocean. Ingests real-time satellite and environmental "
        "data, detects and tracks cyclones, and predicts track, intensity, and impact."
    ),
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    default_response_class=ORJSONResponse,
    lifespan=lifespan,
)

# CORS – allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API Routes ──────────────────────────────────────────────
app.include_router(storms.router, prefix="/api/storms", tags=["Storms"])
app.include_router(layers.router, prefix="/api/layers", tags=["Map Layers"])
app.include_router(history.router, prefix="/api/history", tags=["History"])
app.include_router(health.router, prefix="/api/health", tags=["Health"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Vulnerability Alerts"])
app.include_router(websocket_router.router, prefix="/ws", tags=["WebSocket"])
app.include_router(satellite.router, prefix="/api", tags=["Satellite"])


@app.get("/", tags=["Root"])
async def root():
    """API root – basic info."""
    return {
        "service": "IMD Cyclone Detector",
        "version": "0.1.0",
        "demo_mode": settings.DEMO_MODE,
        "docs": "/docs",
        "status": "operational",
    }


@app.get("/api/config", tags=["Config"])
async def get_config():
    """Public configuration for the frontend."""
    return {
        "demo_mode": settings.DEMO_MODE,
        "domain": {
            "lat_min": 0,
            "lat_max": 30,
            "lon_min": 45,
            "lon_max": 100,
        },
        "categories": [
            {
                "key": "LOW_PRESSURE",
                "label": "Low Pressure Area",
                "abbr": "LP",
                "min_kt": 0,
                "max_kt": 17,
                "color": "#808080",
            },
            {
                "key": "D",
                "label": "Depression",
                "abbr": "D",
                "min_kt": 17,
                "max_kt": 27,
                "color": "#5B9BD5",
            },
            {
                "key": "DD",
                "label": "Deep Depression",
                "abbr": "DD",
                "min_kt": 28,
                "max_kt": 33,
                "color": "#4472C4",
            },
            {
                "key": "CS",
                "label": "Cyclonic Storm",
                "abbr": "CS",
                "min_kt": 34,
                "max_kt": 47,
                "color": "#00B050",
            },
            {
                "key": "SCS",
                "label": "Severe Cyclonic Storm",
                "abbr": "SCS",
                "min_kt": 48,
                "max_kt": 63,
                "color": "#FFC000",
            },
            {
                "key": "VSCS",
                "label": "Very Severe Cyclonic Storm",
                "abbr": "VSCS",
                "min_kt": 64,
                "max_kt": 89,
                "color": "#FF6600",
            },
            {
                "key": "ESCS",
                "label": "Extremely Severe Cyclonic Storm",
                "abbr": "ESCS",
                "min_kt": 90,
                "max_kt": 119,
                "color": "#FF0000",
            },
            {
                "key": "SuCS",
                "label": "Super Cyclonic Storm",
                "abbr": "SuCS",
                "min_kt": 120,
                "max_kt": None,
                "color": "#990000",
            },
        ],
        "lead_times_hours": [0, 6, 12, 18, 24, 36, 48, 60, 72],
        "wind_thresholds_kt": [34, 50, 64],
    }
