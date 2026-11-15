import type { EphemerisSample } from '../types/lunapath';

/* ─── Per-site orbital model parameters ─── */

interface SunParams {
  baseDeg: number;
  amplitudeDeg: number;
  phaseOffsetDays: number;
}

interface EarthParams {
  baseDeg: number;
  amplitudeDeg: number;
  librationAmplitudeDeg: number;
}

const SUN_PARAMS: Record<string, SunParams> = {
  shackleton: { baseDeg: -1.5, amplitudeDeg: 3.5, phaseOffsetDays: 0 },
  malapert: { baseDeg: -0.5, amplitudeDeg: 4.0, phaseOffsetDays: 2 },
  degerlache: { baseDeg: -1.0, amplitudeDeg: 3.2, phaseOffsetDays: 5 },
  sverdrup: { baseDeg: -2.0, amplitudeDeg: 3.0, phaseOffsetDays: 8 },
  'lola-80s-site': { baseDeg: -1.2, amplitudeDeg: 3.4, phaseOffsetDays: 3 },
  'test-horizon-site': { baseDeg: -0.8, amplitudeDeg: 3.8, phaseOffsetDays: 1 },
};

const EARTH_PARAMS: Record<string, EarthParams> = {
  shackleton: { baseDeg: 2.0, amplitudeDeg: 4.5, librationAmplitudeDeg: 1.5 },
  malapert: { baseDeg: 5.0, amplitudeDeg: 3.0, librationAmplitudeDeg: 1.0 },
  degerlache: { baseDeg: -1.0, amplitudeDeg: 5.0, librationAmplitudeDeg: 2.0 },
  sverdrup: { baseDeg: 0.5, amplitudeDeg: 4.0, librationAmplitudeDeg: 1.5 },
  'lola-80s-site': { baseDeg: 1.8, amplitudeDeg: 4.2, librationAmplitudeDeg: 1.6 },
  'test-horizon-site': { baseDeg: 2.2, amplitudeDeg: 3.6, librationAmplitudeDeg: 1.4 },
};

/* ─── Constants ─── */

const TWO_PI = 2 * Math.PI;
const SUN_SYNODIC_PERIOD_HOURS = 29.5 * 24; // ~708 hours
const EARTH_SIDEREAL_PERIOD_HOURS = 27.3 * 24; // ~655.2 hours
const EARTH_LIBRATION_PERIOD_HOURS = 6.7 * 24; // ~160.8 hours
const SUN_AZ_RATE_DEG_PER_HOUR = 0.508; // 360° / synodic period
const EARTH_AZ_RATE_DEG_PER_HOUR = 13.2 / 24; // 13.2°/day

/** J2000 epoch: 2000-01-01T12:00:00Z */
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0, 0);

/* ─── Null-gap specification ─── */

interface NullGap {
  /** Centre of the gap in hours elapsed from start */
  centerHour: number;
  /** Half-width of the gap in hours */
  halfWidthHours: number;
}

/** Each site gets 3 null-data stretches at different offsets. */
const NULL_GAPS: Record<string, NullGap[]> = {
  shackleton: [
    { centerHour: 100, halfWidthHours: 2 },
    { centerHour: 300, halfWidthHours: 1 },
    { centerHour: 500, halfWidthHours: 1.5 },
  ],
  malapert: [
    { centerHour: 110, halfWidthHours: 2 },
    { centerHour: 280, halfWidthHours: 1 },
    { centerHour: 520, halfWidthHours: 1.5 },
  ],
  degerlache: [
    { centerHour: 95, halfWidthHours: 2 },
    { centerHour: 310, halfWidthHours: 1 },
    { centerHour: 480, halfWidthHours: 1.5 },
  ],
  sverdrup: [
    { centerHour: 105, halfWidthHours: 2 },
    { centerHour: 290, halfWidthHours: 1 },
    { centerHour: 540, halfWidthHours: 1.5 },
  ],
  'lola-80s-site': [
    { centerHour: 120, halfWidthHours: 1.5 },
    { centerHour: 320, halfWidthHours: 1 },
    { centerHour: 510, halfWidthHours: 1.5 },
  ],
  'test-horizon-site': [
    { centerHour: 100, halfWidthHours: 2 },
    { centerHour: 300, halfWidthHours: 1 },
    { centerHour: 500, halfWidthHours: 1.5 },
  ],
};

function isInNullGap(elapsedHours: number, gaps: NullGap[]): boolean {
  return gaps.some(
    (g) => Math.abs(elapsedHours - g.centerHour) <= g.halfWidthHours,
  );
}

/* ─── Public API ─── */

/**
 * Dynamically generate ephemeris samples for a given site over the requested
 * time window. Returns one `EphemerisSample` per `stepMinutes` interval.
 */
export function getEphemerisSamples(
  siteId: string,
  startUtc: string,
  durationHours: number,
  stepMinutes: number,
): EphemerisSample[] {
  const sunP = SUN_PARAMS[siteId];
  const earthP = EARTH_PARAMS[siteId];
  if (!sunP || !earthP) {
    throw new Error(`Unknown site id: "${siteId}"`);
  }

  const gaps = NULL_GAPS[siteId] ?? [];
  const startMs = new Date(startUtc).getTime();
  const stepMs = stepMinutes * 60 * 1000;
  const totalSteps = Math.floor((durationHours * 60) / stepMinutes);
  const samples: EphemerisSample[] = [];

  for (let i = 0; i <= totalSteps; i++) {
    const epochMs = startMs + i * stepMs;
    const elapsedHours = (i * stepMinutes) / 60;
    const epochUtc = new Date(epochMs).toISOString();
    const etSeconds = (epochMs - J2000_MS) / 1000;

    if (isInNullGap(elapsedHours, gaps)) {
      samples.push({
        epoch_utc: epochUtc,
        et_seconds: etSeconds,
        sun_elevation_deg: null,
        sun_azimuth_deg: null,
        earth_elevation_deg: null,
        earth_azimuth_deg: null,
      });
      continue;
    }

    // ── Sun model ──
    const sunPhaseHours = sunP.phaseOffsetDays * 24;
    const sunElevation =
      sunP.baseDeg +
      sunP.amplitudeDeg *
        Math.sin(
          TWO_PI * (elapsedHours - sunPhaseHours) / SUN_SYNODIC_PERIOD_HOURS,
        );
    const sunAzimuth = (elapsedHours * SUN_AZ_RATE_DEG_PER_HOUR) % 360;

    // ── Earth model ──
    const earthElevation =
      earthP.baseDeg +
      earthP.amplitudeDeg *
        Math.sin(TWO_PI * elapsedHours / EARTH_SIDEREAL_PERIOD_HOURS) +
      earthP.librationAmplitudeDeg *
        Math.sin(TWO_PI * elapsedHours / EARTH_LIBRATION_PERIOD_HOURS);
    const earthAzimuth =
      (elapsedHours * EARTH_AZ_RATE_DEG_PER_HOUR) % 360;

    samples.push({
      epoch_utc: epochUtc,
      et_seconds: Math.round(etSeconds * 1000) / 1000,
      sun_elevation_deg: Math.round(sunElevation * 1000) / 1000,
      sun_azimuth_deg: Math.round(sunAzimuth * 1000) / 1000,
      earth_elevation_deg: Math.round(earthElevation * 1000) / 1000,
      earth_azimuth_deg: Math.round(earthAzimuth * 1000) / 1000,
    });
  }

  return samples;
}
