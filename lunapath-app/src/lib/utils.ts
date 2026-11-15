/** Join class names, filtering out falsy values. */
export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Format a degree value like "+3.42°" or "—" for null. */
export function formatDeg(v: number | null): string {
  if (v === null || v === undefined) return '—';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}°`;
}

/** Format hours like "12.5h" or "3d 4.2h". */
export function formatHours(h: number): string {
  if (h < 24) return `${h.toFixed(1)}h`;
  const days = Math.floor(h / 24);
  const rem = h - days * 24;
  return `${days}d ${rem.toFixed(1)}h`;
}

/** Format a UTC ISO timestamp concisely. */
export function formatUtc(iso: string): string {
  const d = new Date(iso);
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hour = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${month}-${day} ${hour}:${min}Z`;
}

/** Clamp a number between min and max. */
export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
