# 🌀 IMD Cyclone Detector

**Tropical Cyclone Identification, Classification & Prediction Platform for the North Indian Ocean**

Smart India Hackathon 2026 • PS SIH26070 • Ministry of Earth Sciences / IMD

---

## Overview

A full-stack, self-hostable platform that ingests real-time multi-source satellite and environmental data for the North Indian Ocean (Bay of Bengal + Arabian Sea), detects and tracks tropical cyclones, locates the eye, classifies storms using official IMD categories, and predicts track, intensity, size, and impact at regular lead times.

**Key Features:**
- 🛰️ Real-time INSAT-3D/3DR/3DS satellite imagery ingestion
- 🧠 4 specialized ML models (detection, track, intensity/RI, pattern analysis)
- 🗺️ Interactive map dashboard with 17+ layer types
- 📊 Probabilistic forecasts with ensemble uncertainty
- 🏘️ District-level impact assessment with population exposure
- 🇮🇳 Fully self-hostable — no foreign AI API dependencies

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React + TypeScript + Vite, Tailwind CSS, MapLibre GL JS |
| **Backend** | Python 3.11, FastAPI, Celery + Redis |
| **Database** | PostgreSQL 16 + PostGIS 3.4 |
| **ML** | PyTorch, scikit-learn, xarray, netCDF4 |
| **Storage** | MinIO (S3-compatible) |
| **Deploy** | Docker Compose (one-command) |

## Quick Start

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env with your credentials (MOSDAC, Earthdata, etc.)

# 2. Start all services
docker compose up -d

# 3. Access
# Frontend:  http://localhost:5173
# API docs:  http://localhost:8000/docs
# MinIO:     http://localhost:9001
```

## Project Structure

```
Cyclone_Predictor/
├── docker-compose.yml          # One-command deployment
├── .env.example                # Configuration template
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py             # FastAPI application
│   │   ├── config.py           # Settings from .env
│   │   ├── celery_app.py       # Task queue config
│   │   ├── impact_engine.py    # Monte Carlo impact simulation
│   │   ├── api/                # REST + WebSocket endpoints
│   │   │   ├── storms.py       # /api/storms/*
│   │   │   ├── layers.py       # /api/layers/*
│   │   │   ├── history.py      # /api/history/*
│   │   │   ├── health.py       # /api/health/*
│   │   │   └── websocket_router.py
│   │   ├── core/               # Utilities
│   │   │   ├── classification.py  # IMD categories + Dvorak
│   │   │   ├── geo.py          # Geospatial helpers
│   │   │   └── wind_field.py   # Holland vortex model
│   │   ├── models/             # ML models
│   │   │   ├── satellite_analyzer.py  # Model 1
│   │   │   ├── track_predictor.py     # Model 2
│   │   │   ├── intensity_predictor.py # Model 3
│   │   │   └── pattern_analyzer.py    # Model 4
│   │   └── ingestion/          # Data connectors
│   │       ├── base.py         # DataSource ABC
│   │       ├── gfs.py          # NOAA GFS 0.25°
│   │       ├── ibtracs.py      # IBTrACS historical data
│   │       └── tasks.py        # Celery scheduled tasks
│   ├── db/
│   │   └── init.sql            # PostGIS schema
│   └── tests/
│       └── test_core.py        # Unit tests
└── frontend/
    ├── Dockerfile
    ├── index.html
    ├── vite.config.ts
    └── src/
        ├── App.tsx             # Main app with routing
        ├── api.ts              # API client + WebSocket
        ├── types.ts            # TypeScript types
        ├── index.css           # Design system
        └── components/
            ├── TopBar.tsx
            ├── Dashboard.tsx
            ├── StormInfoCard.tsx
            ├── EnvironmentPanel.tsx
            ├── LandfallCard.tsx
            ├── LayerControl.tsx
            ├── ForecastTable.tsx
            ├── DistrictImpactPanel.tsx
            ├── PastCyclonesExplorer.tsx
            └── AboutPage.tsx
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/storms/active` | Active storms in NIO |
| `GET /api/storms/{id}` | Storm details |
| `GET /api/storms/{id}/eye` | Eye detection data |
| `GET /api/storms/{id}/forecast` | Track + intensity forecast |
| `GET /api/storms/{id}/forecast-table` | Tabular forecast data |
| `GET /api/storms/{id}/impact/swath` | Wind probability GeoJSON |
| `GET /api/storms/{id}/impact/districts` | District probabilities |
| `GET /api/layers/{name}` | Map layer data |
| `GET /api/history/cyclones` | Historical cyclone database |
| `GET /api/history/analogs` | Analog storm search |
| `GET /api/health/sources` | Data source status |
| `WS /ws/live` | Real-time updates |

## IMD Classification

| Category | Abbreviation | Wind (kt) | Color |
|----------|-------------|-----------|-------|
| Low Pressure Area | LP | ≤17 | ![#808080](https://placehold.co/12/808080/808080) |
| Depression | D | 17–27 | ![#5B9BD5](https://placehold.co/12/5B9BD5/5B9BD5) |
| Deep Depression | DD | 28–33 | ![#4472C4](https://placehold.co/12/4472C4/4472C4) |
| Cyclonic Storm | CS | 34–47 | ![#00B050](https://placehold.co/12/00B050/00B050) |
| Severe Cyclonic Storm | SCS | 48–63 | ![#FFC000](https://placehold.co/12/FFC000/FFC000) |
| Very Severe Cyclonic Storm | VSCS | 64–89 | ![#FF6600](https://placehold.co/12/FF6600/FF6600) |
| Extremely Severe Cyclonic Storm | ESCS | 90–119 | ![#FF0000](https://placehold.co/12/FF0000/FF0000) |
| Super Cyclonic Storm | SuCS | ≥120 | ![#990000](https://placehold.co/12/990000/990000) |

## Data Sources

| Source | Type | Credentials | Status |
|--------|------|-------------|--------|
| MOSDAC INSAT-3D/3DR | Satellite | Required | ⚙️ Connector built |
| NOAA GFS 0.25° | Environment | Public | ⚙️ Connector built |
| IBTrACS | Labels | Public | ⚙️ Connector built |
| GPM IMERG | Precipitation | Earthdata | ⚙️ Planned |
| GHRSST MUR | SST | PO.DAAC | ⚙️ Planned |
| ERA5 | Training only | CDS | ⚙️ Planned |
| SCATSAT-1 | Ocean winds | MOSDAC | ⚙️ Planned |

## ML Models

1. **Satellite Image Analyzer** — U-Net detection + eye segmentation + Dvorak CNN
2. **Track Predictor** — ConvLSTM ensemble with uncertainty cone
3. **Intensity & RI Predictor** — Multi-input fusion with RI alert
4. **Pattern Analyzer** — DTW clustering + analog search

## Credential Setup

See [.env.example](.env.example) for all required credentials:
- **MOSDAC**: Register at https://www.mosdac.gov.in
- **NASA Earthdata**: Register at https://urs.earthdata.nasa.gov
- **Copernicus CDS**: Register at https://cds.climate.copernicus.eu
- **EUMETSAT**: Register at https://eoportal.eumetsat.int

## Development

```bash
# Backend (without Docker)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev

# Run tests
cd backend
pytest tests/ -v
```

## Disclaimer

This is a decision-support tool for research and operational use. **Official cyclone warnings and forecasts are issued exclusively by IMD RSMC New Delhi.** Model outputs are probabilistic and should not be used as the sole basis for public warnings or evacuation decisions.

---

*Built for Smart India Hackathon 2026 • Ministry of Earth Sciences / India Meteorological Department*
