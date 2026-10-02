-- ============================================================
-- IMD Cyclone Detector – Database Schema
-- PostgreSQL 16 + PostGIS 3.4
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- ── ENUM TYPES ─────────────────────────────────────────────

CREATE TYPE imd_category AS ENUM (
    'LOW_PRESSURE',    -- <=17 kt
    'D',               -- Depression: 17-27 kt
    'DD',              -- Deep Depression: 28-33 kt
    'CS',              -- Cyclonic Storm: 34-47 kt
    'SCS',             -- Severe Cyclonic Storm: 48-63 kt
    'VSCS',            -- Very Severe Cyclonic Storm: 64-89 kt
    'ESCS',            -- Extremely Severe Cyclonic Storm: 90-119 kt
    'SuCS'             -- Super Cyclonic Storm: >=120 kt
);

CREATE TYPE eye_status AS ENUM (
    'CLEAR', 'RAGGED', 'FORMING', 'FILLING', 'CDO', 'NONE'
);

CREATE TYPE cloud_pattern AS ENUM (
    'CURVED_BAND', 'SHEAR', 'EYE', 'CDO', 'EMBEDDED_CENTER', 'UNKNOWN'
);

CREATE TYPE data_source_status AS ENUM (
    'ACTIVE', 'STALE', 'ERROR', 'CREDENTIALS_REQUIRED', 'OFFLINE'
);

CREATE TYPE storm_status AS ENUM (
    'ACTIVE', 'DISSIPATED', 'HISTORICAL', 'MONITORING'
);

-- ── STORMS ─────────────────────────────────────────────────

CREATE TABLE storms (
    id              SERIAL PRIMARY KEY,
    storm_id        VARCHAR(32) UNIQUE NOT NULL,  -- e.g. "NIO_2024_BOB_01"
    name            VARCHAR(128),
    basin           VARCHAR(8) DEFAULT 'NIO',     -- NIO, BOB, ARB
    season          INTEGER NOT NULL,
    status          storm_status DEFAULT 'ACTIVE',
    genesis_time    TIMESTAMPTZ,
    dissipation_time TIMESTAMPTZ,
    peak_category   imd_category,
    peak_wind_kt    REAL,
    peak_wind_kmh   REAL,
    min_mslp_hpa    REAL,
    landfall_time   TIMESTAMPTZ,
    landfall_location GEOMETRY(Point, 4326),
    landfall_district VARCHAR(128),
    landfall_state  VARCHAR(64),
    source          VARCHAR(64),                  -- 'MODEL', 'IBTrACS', 'RSMC', 'JTWC'
    ibtracs_sid     VARCHAR(32),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_storms_status ON storms (status);
CREATE INDEX idx_storms_season ON storms (season);
CREATE INDEX idx_storms_landfall ON storms USING GIST (landfall_location);

-- ── TRACK POINTS ───────────────────────────────────────────

CREATE TABLE track_points (
    id              BIGSERIAL PRIMARY KEY,
    storm_id        INTEGER REFERENCES storms(id) ON DELETE CASCADE,
    valid_time      TIMESTAMPTZ NOT NULL,
    location        GEOMETRY(Point, 4326) NOT NULL,
    lat             REAL NOT NULL,
    lon             REAL NOT NULL,
    max_wind_kt     REAL,
    max_wind_kmh    REAL,
    gust_kt         REAL,
    mslp_hpa        REAL,
    category        imd_category,
    t_number        REAL,
    cloud_pattern   cloud_pattern,
    -- Eye parameters
    eye_status      eye_status DEFAULT 'NONE',
    eye_lat         REAL,
    eye_lon         REAL,
    eye_diameter_km REAL,
    eye_bt_kelvin   REAL,
    eyewall_bt_kelvin REAL,
    eye_clarity     REAL,       -- 0..1
    eyewall_completeness REAL,  -- 0..1, fraction of ring closed
    -- Size parameters
    rmw_km          REAL,       -- radius of maximum wind
    r34_ne_km       REAL,
    r34_se_km       REAL,
    r34_sw_km       REAL,
    r34_nw_km       REAL,
    r50_ne_km       REAL,
    r50_se_km       REAL,
    r50_sw_km       REAL,
    r50_nw_km       REAL,
    r64_ne_km       REAL,
    r64_se_km       REAL,
    r64_sw_km       REAL,
    r64_nw_km       REAL,
    cloud_shield_radius_km REAL,
    -- Motion
    motion_dir_deg  REAL,
    motion_speed_kmh REAL,
    -- Source tracking
    source          VARCHAR(64) NOT NULL,  -- 'INSAT_MODEL', 'IBTrACS', 'RSMC', 'GFS'
    source_timestamp TIMESTAMPTZ,
    confidence      REAL,       -- 0..1
    is_forecast     BOOLEAN DEFAULT FALSE,
    lead_hours      REAL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_track_storm ON track_points (storm_id, valid_time);
CREATE INDEX idx_track_location ON track_points USING GIST (location);
CREATE INDEX idx_track_forecast ON track_points (storm_id, is_forecast, lead_hours);

-- ── FORECASTS ──────────────────────────────────────────────

CREATE TABLE forecasts (
    id              BIGSERIAL PRIMARY KEY,
    storm_id        INTEGER REFERENCES storms(id) ON DELETE CASCADE,
    issue_time      TIMESTAMPTZ NOT NULL,
    model_version   VARCHAR(64),
    ensemble_size   INTEGER DEFAULT 200,
    -- Track forecast (stored as JSON array of lead-time objects)
    track_forecast  JSONB NOT NULL,
    -- Cone geometry (widening polygon)
    cone_67pct      GEOMETRY(Polygon, 4326),
    cone_90pct      GEOMETRY(Polygon, 4326),
    -- Wind swath (union of R34 along track)
    wind_swath_34kt GEOMETRY(MultiPolygon, 4326),
    wind_swath_50kt GEOMETRY(MultiPolygon, 4326),
    wind_swath_64kt GEOMETRY(MultiPolygon, 4326),
    -- Landfall prediction
    landfall_prob   REAL,
    landfall_lat    REAL,
    landfall_lon    REAL,
    landfall_time_p10 TIMESTAMPTZ,
    landfall_time_p50 TIMESTAMPTZ,
    landfall_time_p90 TIMESTAMPTZ,
    landfall_wind_kt_p50 REAL,
    landfall_category_p50 imd_category,
    -- RI flag
    ri_probability  REAL,       -- P(>=30kt gain in 24h)
    ri_alert        BOOLEAN DEFAULT FALSE,
    -- Metadata
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_forecast_storm ON forecasts (storm_id, issue_time DESC);

-- ── FORECAST LEAD-TIME DETAIL ──────────────────────────────
-- Denormalized table for the forecast parameter table/charts

CREATE TABLE forecast_points (
    id              BIGSERIAL PRIMARY KEY,
    forecast_id     BIGINT REFERENCES forecasts(id) ON DELETE CASCADE,
    storm_id        INTEGER REFERENCES storms(id) ON DELETE CASCADE,
    lead_hours      REAL NOT NULL,
    valid_time      TIMESTAMPTZ NOT NULL,
    -- Position
    lat             REAL NOT NULL,
    lon             REAL NOT NULL,
    lat_p10         REAL,
    lat_p90         REAL,
    lon_p10         REAL,
    lon_p90         REAL,
    position_error_km REAL,     -- cone radius at this lead time
    -- Intensity
    max_wind_kt     REAL,
    max_wind_kt_p10 REAL,
    max_wind_kt_p90 REAL,
    gust_kt         REAL,
    mslp_hpa        REAL,
    mslp_hpa_p10    REAL,
    mslp_hpa_p90    REAL,
    category        imd_category,
    category_probs  JSONB,      -- {"D":0.05, "DD":0.10, "CS":0.30, ...}
    -- Motion
    forward_speed_kmh REAL,
    forward_dir_deg REAL,
    -- Eye & size
    eye_status      eye_status,
    eye_diameter_km REAL,
    rmw_km          REAL,
    r34_ne_km       REAL,
    r34_se_km       REAL,
    r34_sw_km       REAL,
    r34_nw_km       REAL,
    r50_ne_km       REAL,
    r50_se_km       REAL,
    r50_sw_km       REAL,
    r50_nw_km       REAL,
    r64_ne_km       REAL,
    r64_se_km       REAL,
    r64_sw_km       REAL,
    r64_nw_km       REAL,
    -- Distance / ETA
    dist_to_coast_km REAL,
    eta_landfall_hours REAL,
    eta_landfall_p10 REAL,
    eta_landfall_p90 REAL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fp_forecast ON forecast_points (forecast_id, lead_hours);
CREATE INDEX idx_fp_storm ON forecast_points (storm_id, valid_time);

-- ── DISTRICTS ──────────────────────────────────────────────

CREATE TABLE districts (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(128) NOT NULL,
    state           VARCHAR(64) NOT NULL,
    district_code   VARCHAR(16),
    is_coastal      BOOLEAN DEFAULT FALSE,
    centroid        GEOMETRY(Point, 4326),
    boundary        GEOMETRY(MultiPolygon, 4326),
    area_sq_km      REAL,
    coastline_length_km REAL,
    population      BIGINT,
    population_density REAL,    -- per sq km
    population_source VARCHAR(64),  -- 'GHS-POP', 'WorldPop', 'Census'
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_district_boundary ON districts USING GIST (boundary);
CREATE INDEX idx_district_centroid ON districts USING GIST (centroid);
CREATE INDEX idx_district_state ON districts (state);
CREATE INDEX idx_district_coastal ON districts (is_coastal);

-- ── DISTRICT IMPACT PROBABILITIES ──────────────────────────

CREATE TABLE district_probabilities (
    id              BIGSERIAL PRIMARY KEY,
    forecast_id     BIGINT REFERENCES forecasts(id) ON DELETE CASCADE,
    storm_id        INTEGER REFERENCES storms(id) ON DELETE CASCADE,
    district_id     INTEGER REFERENCES districts(id) ON DELETE CASCADE,
    -- Wind probabilities
    prob_34kt       REAL,       -- P(>=34kt)
    prob_50kt       REAL,       -- P(>=50kt)
    prob_64kt       REAL,       -- P(>=64kt)
    -- Timing
    earliest_34kt_p10 TIMESTAMPTZ,
    earliest_34kt_p50 TIMESTAMPTZ,
    earliest_34kt_p90 TIMESTAMPTZ,
    peak_wind_time  TIMESTAMPTZ,
    -- Wind values
    peak_wind_kt_p50 REAL,
    peak_wind_kt_p90 REAL,
    peak_gust_kt_p50 REAL,
    peak_gust_kt_p90 REAL,
    -- Landfall (coastal districts only)
    landfall_prob   REAL,
    -- Population exposure
    pop_exposed_low BIGINT,
    pop_exposed_high BIGINT,
    -- Risk level (computed)
    risk_level      VARCHAR(16),  -- 'LOW', 'MODERATE', 'HIGH', 'EXTREME'
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dp_forecast ON district_probabilities (forecast_id);
CREATE INDEX idx_dp_storm ON district_probabilities (storm_id);
CREATE INDEX idx_dp_district ON district_probabilities (district_id);
CREATE INDEX idx_dp_prob ON district_probabilities (prob_34kt DESC);

-- ── DATA SOURCE HEALTH ─────────────────────────────────────

CREATE TABLE data_source_health (
    id              SERIAL PRIMARY KEY,
    source_name     VARCHAR(64) UNIQUE NOT NULL,
    display_name    VARCHAR(128),
    source_type     VARCHAR(32),    -- 'SATELLITE', 'ENVIRONMENT', 'LABELS', 'GEO'
    status          data_source_status DEFAULT 'OFFLINE',
    last_success    TIMESTAMPTZ,
    last_attempt    TIMESTAMPTZ,
    last_error      TEXT,
    records_fetched BIGINT DEFAULT 0,
    avg_latency_ms  REAL,
    credentials_required BOOLEAN DEFAULT FALSE,
    credentials_set BOOLEAN DEFAULT FALSE,
    config          JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── SATELLITE IMAGERY METADATA ─────────────────────────────

CREATE TABLE satellite_frames (
    id              BIGSERIAL PRIMARY KEY,
    source          VARCHAR(32) NOT NULL,   -- 'INSAT3D', 'INSAT3DR', 'GIBS'
    channel         VARCHAR(16) NOT NULL,   -- 'TIR1', 'TIR2', 'WV', 'MIR', 'VIS'
    valid_time      TIMESTAMPTZ NOT NULL,
    bbox            GEOMETRY(Polygon, 4326),
    storage_path    TEXT NOT NULL,           -- MinIO path or local path
    resolution_km   REAL,
    calibrated      BOOLEAN DEFAULT FALSE,
    file_size_bytes BIGINT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_satframe_time ON satellite_frames (source, channel, valid_time DESC);
CREATE INDEX idx_satframe_bbox ON satellite_frames USING GIST (bbox);

-- ── MODEL INFERENCE LOG ────────────────────────────────────

CREATE TABLE inference_log (
    id              BIGSERIAL PRIMARY KEY,
    model_name      VARCHAR(64) NOT NULL,   -- 'satellite_analyzer', 'track_predictor', etc.
    model_version   VARCHAR(32),
    storm_id        INTEGER REFERENCES storms(id),
    input_time      TIMESTAMPTZ,
    inference_time_ms REAL,
    result_summary  JSONB,
    error           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inference_model ON inference_log (model_name, created_at DESC);

-- ── SEED DATA SOURCE HEALTH ────────────────────────────────

INSERT INTO data_source_health (source_name, display_name, source_type, credentials_required) VALUES
    ('MOSDAC_INSAT', 'MOSDAC INSAT-3D/3DR/3DS', 'SATELLITE', true),
    ('NASA_GIBS', 'NASA GIBS/Worldview', 'SATELLITE', false),
    ('NOAA_GFS', 'NOAA GFS 0.25°', 'ENVIRONMENT', false),
    ('ECMWF_OPEN', 'ECMWF Open Data', 'ENVIRONMENT', false),
    ('CDS_ERA5', 'Copernicus ERA5', 'ENVIRONMENT', true),
    ('GHRSST_MUR', 'PO.DAAC GHRSST MUR SST', 'ENVIRONMENT', true),
    ('GPM_IMERG', 'GPM IMERG Near-Real-Time', 'ENVIRONMENT', true),
    ('SCATSAT', 'SCATSAT-1 (MOSDAC)', 'ENVIRONMENT', true),
    ('ASCAT', 'ASCAT (EUMETSAT)', 'ENVIRONMENT', true),
    ('IBTRACS', 'IBTrACS (NOAA NCEI)', 'LABELS', false),
    ('RSMC_DELHI', 'RSMC New Delhi Bulletins', 'LABELS', false),
    ('GADM_DISTRICTS', 'District Boundaries (GADM)', 'GEO', false),
    ('GHS_POP', 'GHS-POP Population', 'GEO', false),
    ('IMD_DWR', 'IMD Doppler Weather Radar', 'SATELLITE', true);
