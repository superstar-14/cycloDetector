"""
IMD Cyclone Detector – Core Configuration
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App
    APP_ENV: str = "development"
    DEMO_MODE: bool = True
    SECRET_KEY: str = "change-me"
    DEBUG: bool = True

    # Database
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "cyclone_detector"
    POSTGRES_USER: str = "cyclone"
    POSTGRES_PASSWORD: str = "cyclone_secret"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # MinIO
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "cyclone-data"
    MINIO_USE_SSL: bool = False

    # MOSDAC
    MOSDAC_USERNAME: Optional[str] = None
    MOSDAC_PASSWORD: Optional[str] = None
    MOSDAC_BASE_URL: str = "https://www.mosdac.gov.in"

    # CDS (ERA5)
    CDS_API_KEY: Optional[str] = None
    CDS_API_URL: str = "https://cds.climate.copernicus.eu/api/v2"

    # NASA Earthdata
    EARTHDATA_USERNAME: Optional[str] = None
    EARTHDATA_PASSWORD: Optional[str] = None
    EARTHDATA_TOKEN: Optional[str] = None

    # NOAA GFS
    GFS_BASE_URL: str = "https://nomads.ncep.noaa.gov/dods/gfs_0p25"

    # PO.DAAC
    PODAAC_TOKEN: Optional[str] = None

    # EUMETSAT
    EUMETSAT_KEY: Optional[str] = None
    EUMETSAT_SECRET: Optional[str] = None

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"

    @property
    def database_url(self) -> str:
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def async_database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
