/* ─── LunaPath Type System ─── */

/** A candidate landing region near the lunar south pole. */
export interface CandidateSite {
  id: string;
  name: string;
  shortName: string;
  lat_deg: number;
  lon_deg: number;
  elevation_m: number;
  slope_deg: number;
  description: string;
  color: string;
}

/** A single ephemeris time-step sample for a given site. */
export interface EphemerisSample {
  /** ISO-8601 UTC timestamp */
  epoch_utc: string;
  /** Seconds since J2000 epoch */
  et_seconds: number;
  /** Geometric solar elevation above local horizon (degrees), null = data unavailable */
  sun_elevation_deg: number | null;
  /** Geometric solar azimuth (degrees, 0=N, 90=E) */
  sun_azimuth_deg: number | null;
  /** Geometric Earth elevation above local horizon (degrees), null = data unavailable */
  earth_elevation_deg: number | null;
  /** Geometric Earth azimuth (degrees) */
  earth_azimuth_deg: number | null;
}

/** A single ray in a 360° terrain horizon profile. */
export interface HorizonRay {
  /** Azimuth angle in degrees (0–359, 0=North, 90=East) */
  azimuth_deg: number;
  /** Horizon elevation angle at this azimuth (degrees above flat plane) */
  horizon_deg: number;
  /** Distance to the horizon-limiting terrain feature (meters) */
  distance_m: number;
}

/** Complete horizon profile for a site. */
export interface HorizonProfile {
  site_id: string;
  num_rays: number;
  rays: HorizonRay[];
  latitude?: number;
  /** Solstice solar azimuth/elevation track for polar & solar charts */
  sun_path_summer?: {
    azimuth: number[];
    elevation: number[];
  };
  sun_path_winter?: {
    azimuth: number[];
    elevation: number[];
  };
}

/** A detected continuous window (sunlit, DTE, etc.) */
export interface ContinuousWindow {
  start_utc: string;
  end_utc: string;
  duration_hours: number;
  /** Average elevation during window */
  avg_elevation_deg: number;
  /** Peak elevation during window */
  peak_elevation_deg: number;
}

/** Detected gap (darkness, blackout, etc.) */
export interface ContinuousGap {
  start_utc: string;
  end_utc: string;
  duration_hours: number;
}

/** Risk severity levels */
export type RiskSeverity = 'nominal' | 'caution' | 'critical';

/** Risk flag types */
export type RiskType = 'POWER_STARVATION' | 'DTE_BLACKOUT' | 'STEEP_TERRAIN' | 'NOMINAL';

/** A computed risk badge for a site/scenario. */
export interface RiskFlag {
  type: RiskType;
  severity: RiskSeverity;
  label: string;
  detail: string;
  /** The metric value that triggered this flag */
  metric_value: number;
  /** The threshold that was exceeded */
  threshold: number;
}

/** Scoring weight configuration. */
export interface ScoringWeights {
  /** Illumination weight (0–1) */
  w_illumination: number;
  /** Earth visibility / comms weight (0–1) */
  w_communication: number;
  /** Terrain suitability weight (0–1) */
  w_terrain: number;
}

/** Weight preset identifiers. */
export type WeightPreset = 'balanced' | 'power-priority' | 'comms-priority';

/** Normalized sub-scores (0–100 each). */
export interface SubScores {
  illumination: number;
  communication: number;
  terrain: number;
}

/** Complete scored result for a candidate site. */
export interface SiteScore {
  site_id: string;
  sub_scores: SubScores;
  weights: ScoringWeights;
  /** Weighted composite score (0–100) */
  total_score: number;
  rank: number;
}

/** Raw computed metrics for a site analysis. */
export interface SiteMetrics {
  site_id: string;
  /** Total analysis window duration (hours) */
  total_hours: number;
  /** Hours of geometric sunlight (sun > terrain horizon) */
  sunlit_hours: number;
  /** Percentage of analysis window with sunlight */
  sunlit_pct: number;
  /** Longest continuous sunlit window (hours) */
  max_continuous_sun_hours: number;
  /** Longest continuous darkness (hours) */
  max_continuous_dark_hours: number;
  /** Hours of geometric Earth visibility */
  dte_hours: number;
  /** Percentage of analysis window with Earth visibility */
  dte_pct: number;
  /** Longest continuous DTE window (hours) */
  max_continuous_dte_hours: number;
  /** Longest DTE blackout (hours) */
  max_dte_blackout_hours: number;
  /** Mean terrain slope (degrees) */
  slope_deg: number;
  /** Mean terrain horizon elevation (degrees) — higher = more obstructed */
  mean_horizon_deg: number;
  /** Sunlit windows */
  sun_windows: ContinuousWindow[];
  /** Dark gaps */
  dark_gaps: ContinuousGap[];
  /** DTE windows */
  dte_windows: ContinuousWindow[];
  /** DTE blackout gaps */
  dte_gaps: ContinuousGap[];
  /** Risk flags */
  risks: RiskFlag[];
  /** Countdown: hours until next sunset from analysis start, null if always dark */
  hours_until_sunset: number | null;
  /** Countdown: hours until next earthset from analysis start, null if always below horizon */
  hours_until_earthset: number | null;
}

/** Scenario configuration. */
export interface Scenario {
  start_utc: string;
  duration_hours: number;
  step_minutes: number;
  selected_site_ids: string[];
}

export type ScenarioConfig = Scenario;

/** "What-If" shift delta display. */
export interface ShiftDelta {
  site_id: string;
  sunlit_pct_delta: number;
  dte_hours_delta: number;
}

/** Display mode. */
export type ViewMode = 'planner' | 'educator';

/** Duration preset. */
export interface DurationPreset {
  label: string;
  hours: number;
}

/** Step preset. */
export interface StepPreset {
  label: string;
  minutes: number;
}

/** Glossary entry for Educator mode. */
export interface GlossaryEntry {
  term: string;
  definition: string;
}

/** Data provenance metadata. */
export interface ProvenanceInfo {
  source: string;
  dataset: string;
  reference_frame: string;
  spatial_resolution: string;
  epoch: string;
  limitations: string[];
}

/** Export report structure. */
export interface MissionBrief {
  generated_utc: string;
  scenario: Scenario;
  site_metrics: SiteMetrics[];
  scores: SiteScore[];
  provenance: ProvenanceInfo[];
}
