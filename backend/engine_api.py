"""Adapter between the assistant's /analysis/full request and the engine behind this API.
Swap mock_data for the real science engine here, in one place."""
import math
from datetime import datetime
from pydantic import ValidationError
import mock_data as engine
from schemas import AnalyzeRequest


def _norm(s: str) -> str:
    return "".join(c for c in s.lower() if c.isalnum())


def _match_site(name: str):
    if not name:
        return None
    n = _norm(name)
    # Direct exact match on id or name
    for s in engine.PRESET_SITES:
        if n in (_norm(s.id), _norm(s.name)):
            return s

    # Substring matching (e.g. "shackleton", "malapert", "gerlache", "connecting")
    for s in engine.PRESET_SITES:
        s_id = _norm(s.id)
        s_name = _norm(s.name)
        if n in s_id or n in s_name or s_id in n or s_name in n:
            return s

    # Keyword / alias mapping
    aliases = {
        "shackleton": "shackleton_rim",
        "gerlache": "de_gerlache_rim",
        "malapert": "malapert_massif",
        "connecting": "connecting_ridge",
        "ridge": "connecting_ridge",
        "massif": "malapert_massif",
        "testhorizon": "test_horizon_site",
        "testhorizonsite": "test_horizon_site",
        "solarhorizon": "test_horizon_site",
    }
    for kw, site_id in aliases.items():
        if kw in n:
            for s in engine.PRESET_SITES:
                if s.id == site_id:
                    return s
    return None


def full_analysis(payload: dict) -> dict:
    """payload: site_name | latitude+longitude, start_time (ISO UTC), duration_hours.
    Returns the four headline metrics (plus an estimate flag)."""
    raw_start = payload.get("start_time") or "2027-01-15T00:00:00Z"
    start = datetime.fromisoformat(str(raw_start).replace("Z", "+00:00"))
    days = max(1, math.ceil(float(payload.get("duration_hours", 24)) / 24))
    kwargs = {"start_date": start.strftime("%Y-%m-%d"), "days": min(days, 60)}
    site = _match_site(payload["site_name"]) if payload.get("site_name") else None
    if site:
        kwargs["site_id"] = site.id
    elif payload.get("latitude") is not None and payload.get("longitude") is not None:
        kwargs.update(lat=payload["latitude"], lon=payload["longitude"])
    else:
        raise ValueError(f"Unknown site '{payload.get('site_name')}'. Use a preset site or latitude+longitude.")
    try:
        res = engine.mock_analysis(AnalyzeRequest(**kwargs))
    except ValidationError as e:
        raise ValueError(f"Invalid input: {e.errors()[0]['msg']}")
    s = res.summary
    return {"sunlit_hours": s.sunlit_hours, "longest_darkness_hours": s.longest_darkness_hours,
            "earth_visible_hours": s.earth_visible_hours, "longest_blackout_hours": s.longest_blackout_hours,
            "solar_power_wh_per_m2": s.solar_power_wh_per_m2, "is_estimate": True}
