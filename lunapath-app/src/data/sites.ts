import type { CandidateSite } from '../types/lunapath';

export const CANDIDATE_SITES: CandidateSite[] = [
  {
    id: 'shackleton',
    name: 'Shackleton Crater Rim',
    shortName: 'Shackleton',
    lat_deg: -89.9,
    lon_deg: 0.0,
    elevation_m: 4200,
    slope_deg: 8.5,
    description:
      'Elevated rim of Shackleton crater near the lunar south pole. Receives near-continuous sunlight during polar summer with excellent power generation potential.',
    color: '#FFB800',
  },
  {
    id: 'malapert',
    name: 'Malapert Mountain',
    shortName: 'Malapert',
    lat_deg: -86.0,
    lon_deg: 2.0,
    elevation_m: 5000,
    slope_deg: 12.3,
    description:
      'Prominent massif with direct Earth line-of-sight. High elevation offers strong communication coverage but steeper local terrain.',
    color: '#00D4FF',
  },
  {
    id: 'degerlache',
    name: 'de Gerlache Ridge',
    shortName: 'de Gerlache',
    lat_deg: -88.5,
    lon_deg: -70.0,
    elevation_m: 3800,
    slope_deg: 6.2,
    description:
      'Low-slope ridge connecting de Gerlache and Shackleton craters. Gentle terrain favours rover traverses and surface operations.',
    color: '#10B981',
  },
  {
    id: 'sverdrup',
    name: 'Sverdrup Crater Rim',
    shortName: 'Sverdrup',
    lat_deg: -88.3,
    lon_deg: -30.0,
    elevation_m: 3200,
    slope_deg: 18.7,
    description:
      'Rim of Sverdrup crater with deep permanently shadowed interior. Steep walls present terrain challenges but proximity to volatiles is advantageous.',
    color: '#C084FC',
  },
  {
    id: 'lola-80s-site',
    name: 'LOLA 80°S Precision Site',
    shortName: 'LOLA-80S',
    lat_deg: -89.45,
    lon_deg: 222.7,
    elevation_m: 1953,
    slope_deg: 4.8,
    description:
      'High-resolution benchmark site from NASA LOLA ldem_80s_20m/80m DEM (PDS Geosciences). Rigorous 360° ray-traced horizon obstruction profile with 100km horizon radius and curvature correction.',
    color: '#38BDF8',
  },
  {
    id: 'test-horizon-site',
    name: 'Solar Horizon Benchmark Profile',
    shortName: 'Test Horizon',
    lat_deg: -87.77,
    lon_deg: 45.0,
    elevation_m: 2450,
    slope_deg: 10.0,
    description:
      'Benchmark test horizon profile (test_horizon_profile.json) with 360° terrain obstruction mask and dual solstice solar trajectory arcs (sun_path_summer and sun_path_winter).',
    color: '#F59E0B',
  },
];
