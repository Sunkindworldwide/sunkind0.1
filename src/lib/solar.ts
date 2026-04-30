/**
 * Solar calculations and utility functions
 */

export function getSunColor(alt: number): string {
  if (alt < 0) return 'text-slate-500';
  if (alt < 10) return 'text-orange-600';
  if (alt < 30) return 'text-amber-500';
  return 'text-yellow-400';
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function getScoreColor(score: number): string {
  if (score >= 65) return 'var(--amber)';
  if (score >= 30) return 'var(--ink3)';
  return 'var(--cloud)';
}

export function getScoreBg(score: number, type?: string): string {
  if (type === 'bar') return 'bg-[#5856D6]/10 text-[#5856D6]';
  if (type === 'park') return 'bg-[#47B26E]/10 text-[#47B26E]';
  if (score >= 65) return 'bg-[#FF9500]/10 text-[#FF9500]';
  if (score >= 30) return 'bg-[#FFCC00]/10 text-amber-700';
  return 'bg-black/5 text-[#8E8E93]';
}

/**
 * Calculates distance between two points in meters
 */
export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // meters
  const f1 = (lat1 * Math.PI) / 180;
  const f2 = (lat2 * Math.PI) / 180;
  const df = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(df / 2) * Math.sin(df / 2) +
    Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function getSunPosition(lat: number, lon: number, date: Date) {
  const rad = Math.PI / 180;
  // Use current date components for declination proxy
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - startOfYear.getTime();
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));

  const decl = 23.45 * Math.sin(rad * (360/365 * (d - 81)));
  const time = date.getHours() + date.getMinutes()/60;

  const ha = (time - 12) * 15;

  const elevation = Math.asin(
    Math.sin(lat*rad)*Math.sin(decl*rad) +
    Math.cos(lat*rad)*Math.cos(decl*rad)*Math.cos(ha*rad)
  ) / rad;

  const azimuth = Math.atan2(
    -Math.sin(ha*rad),
    Math.tan(decl*rad)*Math.cos(lat*rad) -
    Math.sin(lat*rad)*Math.cos(ha*rad)
  ) / rad;

  // Normalize azimuth to 0-360 starting from North
  let normAzimuth = azimuth;
  if (normAzimuth < 0) normAzimuth += 360;

  return { elevation, azimuth: normAzimuth };
}

export function calcSunScore(current: number, futureMinutes: number, continuity: number, timeToSun: number) {
  return Math.round(
    current * 40 +
    (futureMinutes / 180) * 30 +
    continuity * 20 +
    (1 - Math.min(timeToSun / 180, 1)) * 10
  );
}

export function getSunlightStatus(shadowArea: number): string {
  const score = 1 - (shadowArea / 100);
  if (score > 0.8) return 'Sunny';
  if (score > 0.5) return 'Partial';
  return 'Shaded';
}
