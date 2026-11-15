"""Frozen data format (v1.0) shared by the whole team.
Science engine outputs and API responses must match these models."""
from typing import List, Literal, Optional
from pydantic import BaseModel, Field, model_validator

SCHEMA_VERSION = "1.0"


class Site(BaseModel):
    id: str
    name: str
    lat: float = Field(ge=-90, le=-80, description="South-pole latitude, degrees")
    lon: float = Field(ge=-180, le=360, description="Longitude, degrees east")


# ---- Navnoor: terrain horizon ----
class HorizonPoint(BaseModel):
    azimuth_deg: float = Field(ge=0, lt=360)
    elevation_deg: float


class HorizonProfile(BaseModel):
    schema_version: str = SCHEMA_VERSION
    site: Site = Field(default_factory=lambda: Site(id="test_horizon_site", name="Solar Horizon Benchmark Site", lat=-85.0, lon=0.0))
    dem_source: str = "LOLA LDEM_80S_20MPP_ADJ"
    resolution_m: float = 20
    coordinate_system: str = "polar stereographic, south pole"
    missing_data_fraction: float = Field(0.0, ge=0, le=1)
    horizon: List[HorizonPoint]
    latitude: Optional[float] = None
    sun_path_summer: Optional[dict] = None
    sun_path_winter: Optional[dict] = None

    @model_validator(mode="before")
    @classmethod
    def _coerce_horizon(cls, data):
        if not isinstance(data, dict):
            return data
        h = data.get("horizon")
        if isinstance(h, dict) and "azimuth" in h and "elevation" in h:
            points = []
            for az, el in zip(h["azimuth"], h["elevation"]):
                points.append({"azimuth_deg": round(float(az) % 360, 2), "elevation_deg": float(el)})
            data["horizon"] = points
        if "site" not in data:
            lat = data.get("latitude", -85.0)
            valid_lat = lat if -90 <= lat <= -80 else -85.0
            data["site"] = {"id": "test_horizon_site", "name": "Solar Horizon Benchmark Site", "lat": valid_lat, "lon": 0.0}
        if "missing_data_fraction" not in data:
            data["missing_data_fraction"] = 0.0
        return data


# ---- Aryan: ephemeris ----
class EphemerisSample(BaseModel):
    time_utc: str  # ISO 8601, e.g. 2026-11-13T00:00:00Z
    sun_az_deg: float
    sun_el_deg: float
    earth_az_deg: float
    earth_el_deg: float


class Ephemeris(BaseModel):
    schema_version: str = SCHEMA_VERSION
    site: Site
    source: str = "JPL Horizons"
    step_minutes: int = 10
    time_scale: Literal["UTC", "TDB"] = "UTC"
    reference_frame: str = "Moon body-fixed (ME/PA)"
    samples: List[EphemerisSample]


# ---- Tanmay: visibility and metrics ----
class TimeStep(BaseModel):
    time_utc: str
    sun_el_deg: float
    earth_el_deg: float
    horizon_at_sun_deg: float
    horizon_at_earth_deg: float
    sun_visible: bool
    earth_visible: bool


class Summary(BaseModel):
    sunlit_hours: float
    longest_darkness_hours: float
    earth_visible_hours: float
    longest_blackout_hours: float
    solar_power_wh_per_m2: float
    solar_power_is_estimate: bool = True


class SiteAnalysis(BaseModel):
    schema_version: str = SCHEMA_VERSION
    site: Site
    start_utc: str
    end_utc: str
    step_minutes: int = 10
    assumptions: List[str]
    sources: List[str]
    summary: Summary
    timeseries: List[TimeStep]
    horizon: List[HorizonPoint]


# ---- API requests / responses ----
class AnalyzeRequest(BaseModel):
    site_id: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    start_date: str  # YYYY-MM-DD
    days: int = Field(default=30, ge=1, le=60)


class ScenarioRequest(BaseModel):
    base: AnalyzeRequest
    delay: Literal["+1 day", "+7 days", "+1 lunar cycle"]


class ScenarioResult(BaseModel):
    schema_version: str = SCHEMA_VERSION
    delay: str
    baseline: SiteAnalysis
    delayed: SiteAnalysis
    changes: dict  # metric name -> delayed minus baseline


class CompareRequest(BaseModel):
    scenarios: List[AnalyzeRequest] = Field(min_length=1, max_length=3)


class CompareResult(BaseModel):
    schema_version: str = SCHEMA_VERSION
    results: List[SiteAnalysis]
