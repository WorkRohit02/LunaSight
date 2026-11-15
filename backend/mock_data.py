"""Fake but correctly formatted data. Replace with the real science engine later."""
import math
from datetime import datetime, timedelta, timezone
from schemas import *

PRESET_SITES = [
    Site(id="shackleton_rim", name="Shackleton Crater Rim", lat=-89.9, lon=129.0),
    Site(id="de_gerlache_rim", name="de Gerlache Rim", lat=-88.5, lon=-87.0),
    Site(id="malapert_massif", name="Malapert Massif", lat=-86.0, lon=0.0),
    Site(id="connecting_ridge", name="Connecting Ridge", lat=-89.4, lon=-137.0),
    Site(id="test_horizon_site", name="Solar Horizon Benchmark Site", lat=-85.0, lon=45.0),
]
LUNAR_CYCLE_DAYS = 29.53


def get_site(req: AnalyzeRequest) -> Site:
    if req.site_id:
        for s in PRESET_SITES:
            if s.id == req.site_id:
                return s
        raise KeyError(req.site_id)
    if req.lat is None or req.lon is None:
        raise ValueError("Provide site_id or lat/lon")
    return Site(id="custom", name="Custom point", lat=req.lat, lon=req.lon)


def mock_analysis(req: AnalyzeRequest, shift_days: float = 0) -> SiteAnalysis:
    site = get_site(req)
    start = datetime.fromisoformat(req.start_date).replace(tzinfo=timezone.utc)
    start += timedelta(days=shift_days)
    step = 10
    n = req.days * 24 * 60 // step
    phase = (abs(site.lat) + abs(site.lon)) % 30
    horizon = [HorizonPoint(azimuth_deg=a, elevation_deg=round(1.5 + 1.2 * math.sin(math.radians(a * 3 + phase)), 2))
               for a in range(360)]
    ts, sun_h, earth_h = [], 0, 0
    sun_run = earth_run = max_dark = max_blk = 0
    for i in range(n):
        t = start + timedelta(minutes=step * i)
        days_abs = (t - datetime(2026, 1, 1, tzinfo=timezone.utc)).total_seconds() / 86400
        az = (days_abs / LUNAR_CYCLE_DAYS * 360 + phase) % 360
        sun_el = 1.6 * math.sin(math.radians(az * 1.0)) + 0.5
        earth_el = 6 * math.sin(math.radians(az * 0.5 + 40)) + 3
        hs = horizon[int(az) % 360].elevation_deg
        he = horizon[int((az + 90) % 360)].elevation_deg
        sv, ev = sun_el > hs, earth_el > he
        sun_h += sv * step / 60
        earth_h += ev * step / 60
        sun_run = 0 if sv else sun_run + step / 60
        earth_run = 0 if ev else earth_run + step / 60
        max_dark, max_blk = max(max_dark, sun_run), max(max_blk, earth_run)
        ts.append(TimeStep(time_utc=t.strftime("%Y-%m-%dT%H:%M:%SZ"), sun_el_deg=round(sun_el, 2),
                           earth_el_deg=round(earth_el, 2), horizon_at_sun_deg=hs,
                           horizon_at_earth_deg=he, sun_visible=sv, earth_visible=ev))
    summary = Summary(sunlit_hours=round(sun_h, 1), longest_darkness_hours=round(max_dark, 1),
                      earth_visible_hours=round(earth_h, 1), longest_blackout_hours=round(max_blk, 1),
                      solar_power_wh_per_m2=round(sun_h * 1361 * 0.25, 0))
    end = start + timedelta(minutes=step * n)
    return SiteAnalysis(site=site, start_utc=start.strftime("%Y-%m-%dT%H:%M:%SZ"),
                        end_utc=end.strftime("%Y-%m-%dT%H:%M:%SZ"), step_minutes=step,
                        assumptions=["MOCK DATA, not real results", "Solar power is an estimate (flat panel, 25% efficiency)"],
                        sources=["mock_data.py"], summary=summary, timeseries=ts, horizon=horizon)
