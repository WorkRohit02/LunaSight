import React, { useState } from 'react';
import type { HorizonProfile, EphemerisSample, CandidateSite } from '../types/lunapath';
import { Sun, Snowflake, Eye } from 'lucide-react';

interface HorizonPolarPlotProps {
  selectedSite?: CandidateSite;
  horizonProfile?: HorizonProfile;
  currentSample?: EphemerisSample | null;
}

export const HorizonPolarPlot: React.FC<HorizonPolarPlotProps> = ({
  selectedSite,
  horizonProfile,
  currentSample,
}) => {
  const [showSummer, setShowSummer] = useState(true);
  const [showWinter, setShowWinter] = useState(true);

  const size = 320;
  const center = size / 2;
  const maxRadius = center - 38;

  // Adapt elevation scale: if solar solstice tracks are present, scale to 90° zenith.
  // Otherwise use 12° grazing lunar south-pole scale.
  const hasSunPaths = Boolean(
    horizonProfile?.sun_path_summer?.azimuth?.length ||
    horizonProfile?.sun_path_winter?.azimuth?.length
  );
  const maxElev = hasSunPaths ? 90 : 12;
  const gridElevationRings = hasSunPaths ? [0, 15, 30, 45, 60, 75, 90] : [0, 3, 6, 9, 12];

  if (!selectedSite || !horizonProfile) {
    return (
      <div className="p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] flex flex-col items-center justify-center h-[360px] text-xs text-[var(--text-muted)]">
        Select a site to inspect its 360° terrain horizon obstruction mask.
      </div>
    );
  }

  // Polar projection: elevation mapped from 0° (outer edge) to maxElev (center)
  const projectPolar = (azimuthDeg: number, elevDeg: number) => {
    const clampedElev = Math.max(-3, Math.min(maxElev, elevDeg));
    const r = maxRadius * (1 - clampedElev / maxElev);
    const rad = ((azimuthDeg - 90) * Math.PI) / 180;
    const x = center + r * Math.cos(rad);
    const y = center + r * Math.sin(rad);
    return { x, y, r };
  };

  // Build SVG polygon path for 360 rays
  const points = horizonProfile.rays.map((ray) => {
    const { x, y } = projectPolar(ray.azimuth_deg, ray.horizon_deg);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const polygonPoints = points.join(' ');

  // Summer Solstice Sun Path (if available from test_horizon_profile.json)
  const summerPathD =
    hasSunPaths && horizonProfile.sun_path_summer
      ? horizonProfile.sun_path_summer.azimuth
          .map((az, i) => {
            const el = horizonProfile.sun_path_summer!.elevation[i];
            const pt = projectPolar(az, el);
            return `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
          })
          .join(' ')
      : null;

  // Winter Solstice Sun Path (if available from test_horizon_profile.json)
  const winterPathD =
    hasSunPaths && horizonProfile.sun_path_winter
      ? horizonProfile.sun_path_winter.azimuth
          .map((az, i) => {
            const el = horizonProfile.sun_path_winter!.elevation[i];
            const pt = projectPolar(az, el);
            return `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
          })
          .join(' ')
      : null;

  // Find peak solar elevations for labels
  const maxSummerEl = horizonProfile.sun_path_summer
    ? Math.max(...horizonProfile.sun_path_summer.elevation)
    : null;
  const maxWinterEl = horizonProfile.sun_path_winter
    ? Math.max(...horizonProfile.sun_path_winter.elevation)
    : null;

  // Current Celestial Body Markers
  const sunAz = currentSample?.sun_azimuth_deg ?? null;
  const sunEl = currentSample?.sun_elevation_deg ?? null;
  const earthAz = currentSample?.earth_azimuth_deg ?? null;
  const earthEl = currentSample?.earth_elevation_deg ?? null;

  const sunPos = sunAz !== null && sunEl !== null ? projectPolar(sunAz, Math.max(0, sunEl)) : null;
  const earthPos = earthAz !== null && earthEl !== null ? projectPolar(earthAz, Math.max(0, earthEl)) : null;

  return (
    <div className="p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] flex flex-col items-center select-none">
      <div className="w-full flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: selectedSite.color }} />
          <span>360° Local Terrain Horizon Profile</span>
        </h3>
        <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
          {selectedSite.id === 'test-horizon-site'
            ? 'test_horizon_profile.json • Active'
            : selectedSite.id === 'lola-80s-site'
            ? 'LOLA 80m/px DEM • Exact Fixture'
            : 'LOLA DEM Ray-Traced'}
        </span>
      </div>

      <div className="relative">
        <svg width={size} height={size} className="bg-[var(--bg-elevated)] rounded-full border border-[var(--border-subtle)] shadow-inner">
          {/* Concentric Elevation Grid Rings */}
          {gridElevationRings.map((el) => {
            const r = maxRadius * (1 - el / maxElev);
            return (
              <g key={el}>
                <circle
                  cx={center}
                  cy={center}
                  r={r}
                  fill="none"
                  stroke="var(--border-subtle)"
                  strokeDasharray={el === 0 ? 'none' : '2 3'}
                  strokeWidth={el === 0 ? '1.5' : '0.8'}
                />
                {el > 0 && el < maxElev && (
                  <text
                    x={center + 3}
                    y={center - r + 9}
                    fill="var(--text-muted)"
                    fontSize="7.5"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {el}°
                  </text>
                )}
              </g>
            );
          })}

          {/* Azimuth Spokes (0° to 315° in 45° increments) */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((az) => {
            const rad = ((az - 90) * Math.PI) / 180;
            const x2 = center + maxRadius * Math.cos(rad);
            const y2 = center + maxRadius * Math.sin(rad);
            return (
              <line
                key={az}
                x1={center}
                y1={center}
                x2={x2}
                y2={y2}
                stroke="var(--border-subtle)"
                strokeDasharray="2 3"
                strokeWidth="0.8"
              />
            );
          })}

          {/* Filled Terrain Obstruction Area */}
          <polygon
            points={polygonPoints}
            fill="var(--terrain)"
            fillOpacity="0.3"
            stroke="var(--terrain)"
            strokeWidth="1.8"
          />

          {/* Summer Solstice Sun Path (from test_horizon_profile.json) */}
          {hasSunPaths && showSummer && summerPathD && (
            <g>
              <path
                d={summerPathD}
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2.5"
                strokeDasharray="5 3"
                strokeLinecap="round"
                className="opacity-90"
              />
              <circle
                cx={projectPolar(180, maxSummerEl ?? 75.7).x}
                cy={projectPolar(180, maxSummerEl ?? 75.7).y}
                r="3.5"
                fill="#F59E0B"
              />
            </g>
          )}

          {/* Winter Solstice Sun Path (from test_horizon_profile.json) */}
          {hasSunPaths && showWinter && winterPathD && (
            <g>
              <path
                d={winterPathD}
                fill="none"
                stroke="#38BDF8"
                strokeWidth="2.2"
                strokeDasharray="4 2"
                strokeLinecap="round"
                className="opacity-90"
              />
              <circle
                cx={projectPolar(180, maxWinterEl ?? 28.8).x}
                cy={projectPolar(180, maxWinterEl ?? 28.8).y}
                r="3"
                fill="#38BDF8"
              />
            </g>
          )}

          {/* Current Sun Position */}
          {sunPos && (
            <g>
              <circle cx={sunPos.x} cy={sunPos.y} r={6} fill="var(--solar)" stroke="#FFF" strokeWidth="1.5" />
              <text
                x={sunPos.x}
                y={sunPos.y - 8}
                textAnchor="middle"
                fill="var(--solar)"
                fontSize="8.5"
                fontWeight="bold"
                fontFamily="JetBrains Mono, monospace"
              >
                SUN ({sunEl?.toFixed(1)}°)
              </text>
            </g>
          )}

          {/* Current Earth Position */}
          {earthPos && (
            <g>
              <circle cx={earthPos.x} cy={earthPos.y} r={6} fill="var(--orbital)" stroke="#FFF" strokeWidth="1.5" />
              <text
                x={earthPos.x}
                y={earthPos.y + 14}
                textAnchor="middle"
                fill="var(--orbital)"
                fontSize="8.5"
                fontWeight="bold"
                fontFamily="JetBrains Mono, monospace"
              >
                EARTH ({earthEl?.toFixed(1)}°)
              </text>
            </g>
          )}

          {/* Center Zenith Indicator (for 90° max elevation) */}
          {hasSunPaths && (
            <circle cx={center} cy={center} r={2} fill="var(--text-muted)" opacity={0.6} />
          )}
        </svg>

        {/* Cardinal Azimuth Labels */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-[var(--text-primary)]">0° N</div>
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-[var(--text-primary)]">180° S</div>
        <div className="absolute top-1/2 left-1 -translate-y-1/2 text-[9px] font-mono font-bold text-[var(--text-primary)]">270° W</div>
        <div className="absolute top-1/2 right-1 -translate-y-1/2 text-[9px] font-mono font-bold text-[var(--text-primary)]">90° E</div>
      </div>

      {/* Solstice Solar Trajectory Controls & Legend (when profile has sun paths) */}
      {hasSunPaths && (
        <div className="w-full mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-[10px]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSummer(!showSummer)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all font-mono ${
                showSummer
                  ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30'
                  : 'text-[var(--text-muted)] opacity-50'
              }`}
              title="Toggle Summer Solstice Sun Path"
            >
              <Sun size={11} />
              <span>Summer Arc ({maxSummerEl?.toFixed(1)}°)</span>
            </button>

            <button
              onClick={() => setShowWinter(!showWinter)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all font-mono ${
                showWinter
                  ? 'bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30'
                  : 'text-[var(--text-muted)] opacity-50'
              }`}
              title="Toggle Winter Solstice Sun Path"
            >
              <Snowflake size={11} />
              <span>Winter Arc ({maxWinterEl?.toFixed(1)}°)</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
            <span className="w-2.5 h-1.5 rounded-sm bg-[var(--terrain)] opacity-60 inline-block" />
            <span>Horizon Mask</span>
          </div>
        </div>
      )}
    </div>
  );
};
