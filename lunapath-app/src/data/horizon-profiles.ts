import type { HorizonProfile, HorizonRay } from '../types/lunapath';
import { LOLA_80S_DATASET } from './lola-80s-dataset';
import testHorizonData from './test_horizon_profile.json';

/**
 * Generate a smooth horizon elevation value for a given azimuth using a set of
 * peak/valley descriptors. Each descriptor defines a centre azimuth, angular
 * half-width, and target elevation. The base elevation fills in where no
 * descriptor dominates.
 */
interface TerrainFeature {
  centerAz: number;
  halfWidth: number;
  peakDeg: number;
}

function generateRays(
  baseMin: number,
  baseMax: number,
  features: TerrainFeature[],
): HorizonRay[] {
  const rays: HorizonRay[] = [];

  for (let az = 0; az < 360; az++) {
    // Start from a pseudo-random base within [baseMin, baseMax]
    const baseSeed = Math.sin(az * 0.7 + 3.1) * 0.5 + 0.5; // 0-1
    let horizon = baseMin + (baseMax - baseMin) * baseSeed;

    // Layer each terrain feature using a smooth cosine bell
    for (const f of features) {
      let delta = az - f.centerAz;
      // Handle wrapping
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      const absDelta = Math.abs(delta);
      if (absDelta < f.halfWidth) {
        const blend = 0.5 * (1 + Math.cos((Math.PI * absDelta) / f.halfWidth));
        horizon = Math.max(horizon, f.peakDeg * blend + horizon * (1 - blend));
      }
    }

    // Add a small high-frequency ripple for realism
    horizon += 0.3 * Math.sin(az * 1.3) + 0.2 * Math.cos(az * 2.7);
    horizon = Math.round(horizon * 100) / 100;

    // Distance correlates inversely with horizon elevation (higher horizon = nearer obstacle)
    const distance_m = Math.round(
      5000 - (horizon / 14) * 4500 + 200 * Math.sin(az * 0.9),
    );

    rays.push({
      azimuth_deg: az,
      horizon_deg: Math.max(0.1, horizon),
      distance_m: Math.max(500, Math.min(5000, distance_m)),
    });
  }

  return rays;
}

function makeProfile(siteId: string, rays: HorizonRay[]): HorizonProfile {
  return { site_id: siteId, num_rays: rays.length, rays };
}

/**
 * Shackleton: high crater rim with peaks ~6-8° at azimuths 30-90 and 200-260,
 * valleys ~1-2° elsewhere.
 */
const shackletonRays = generateRays(1.0, 2.0, [
  { centerAz: 60, halfWidth: 35, peakDeg: 7.5 },
  { centerAz: 230, halfWidth: 35, peakDeg: 6.8 },
  { centerAz: 150, halfWidth: 15, peakDeg: 3.5 },
]);

/**
 * Malapert: more uniform ~3-5° with a mountain shadow peak ~8-10° at 150-200.
 */
const malapertRays = generateRays(3.0, 5.0, [
  { centerAz: 175, halfWidth: 30, peakDeg: 9.5 },
  { centerAz: 350, halfWidth: 20, peakDeg: 5.5 },
]);

/**
 * de Gerlache: ridge pattern with ~4-7° at 0-60 and 300-359, lower ~1-3° at 120-240.
 */
const degerlacheRays = generateRays(1.5, 3.0, [
  { centerAz: 30, halfWidth: 35, peakDeg: 6.5 },
  { centerAz: 330, halfWidth: 35, peakDeg: 5.8 },
  { centerAz: 0, halfWidth: 20, peakDeg: 6.0 },
  { centerAz: 180, halfWidth: 60, peakDeg: 2.0 },
]);

/**
 * Sverdrup: deep crater with high walls ~8-12° at 60-150, lower ~2-4° elsewhere.
 */
const sverdrupRays = generateRays(2.0, 4.0, [
  { centerAz: 105, halfWidth: 50, peakDeg: 11.0 },
  { centerAz: 75, halfWidth: 25, peakDeg: 9.5 },
  { centerAz: 280, halfWidth: 20, peakDeg: 4.5 },
]);

/**
 * Benchmark test horizon profile loaded directly from test_horizon_profile.json
 * Features full 360° obstruction data and summer/winter solstice sun paths.
 */
const testHorizonRays: HorizonRay[] = Array.from({ length: 360 }, (_, deg) => {
  const azArray = testHorizonData.horizon.azimuth;
  const elArray = testHorizonData.horizon.elevation;
  // Map index cleanly across the 360 source data points
  const idx = Math.min(elArray.length - 1, Math.round((deg / 360) * (elArray.length - 1)));
  const elev = elArray[idx] ?? 10.0;
  return {
    azimuth_deg: deg,
    horizon_deg: Math.round(elev * 100) / 100,
    distance_m: Math.round(5000 - (elev / 16) * 3500),
  };
});

export const TEST_HORIZON_PROFILE: HorizonProfile = {
  site_id: 'test-horizon-site',
  num_rays: testHorizonRays.length,
  rays: testHorizonRays,
  latitude: testHorizonData.latitude,
  sun_path_summer: testHorizonData.sun_path_summer,
  sun_path_winter: testHorizonData.sun_path_winter,
};

export const HORIZON_PROFILES: Record<string, HorizonProfile> = {
  shackleton: makeProfile('shackleton', shackletonRays),
  malapert: makeProfile('malapert', malapertRays),
  degerlache: makeProfile('degerlache', degerlacheRays),
  sverdrup: makeProfile('sverdrup', sverdrupRays),
  'lola-80s-site': {
    site_id: 'lola-80s-site',
    num_rays: LOLA_80S_DATASET.horizon.length,
    rays: LOLA_80S_DATASET.horizon,
  },
  'test-horizon-site': TEST_HORIZON_PROFILE,
  test_horizon_profile: TEST_HORIZON_PROFILE,
};
