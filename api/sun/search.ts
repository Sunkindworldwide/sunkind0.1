function getSunPosition(lat: number, _lon: number, date: Date) {
  try {
    const rad = Math.PI / 180;
    const day = Math.floor(
      (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
    );
    const decl = 23.45 * Math.sin(rad * ((360 / 365) * (day - 81)));
    const time = date.getHours() + date.getMinutes() / 60;
    const ha = (time - 12) * 15;
    const elevation = Math.asin(
      Math.sin(lat * rad) * Math.sin(decl * rad) +
        Math.cos(lat * rad) * Math.cos(decl * rad) * Math.cos(ha * rad)
    ) / rad;

    return {
      elevation: Number.isNaN(elevation) ? -90 : elevation,
      azimuth: 0,
    };
  } catch {
    return { elevation: -90, azimuth: 0 };
  }
}

function calcSunScore(current: number, futureMinutes: number, continuity: number, timeToSun: number) {
  try {
    return Math.round(
      current * 40 +
        (futureMinutes / 180) * 30 +
        continuity * 20 +
        (1 - Math.min(timeToSun / 180, 1)) * 10
    );
  } catch {
    return 0;
  }
}

export default function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const locations = Array.isArray(req.body?.locations) ? req.body.locations : [];
    const now = new Date();

    const results = locations.map((loc: any, i: number) => {
      const lat = Number(loc?.lat) || 0;
      const lon = Number(loc?.lon) || 0;
      const sun = getSunPosition(lat, lon, now);
      const currentSun = sun.elevation > 0 ? 1 : 0;
      const score = calcSunScore(currentSun, 60, 0.5, currentSun ? 0 : 30);

      return {
        id: i,
        name: loc?.name || 'Unknown Place',
        score: Number(score) || 0,
        sunScore: Number(score) || 0,
        currentSun: Boolean(currentSun),
        nextSunTime: 'N/A',
        duration: 0,
        lat,
        lon,
        type: loc?.type || 'cafe',
        dist: loc?.dist || 0,
      };
    });

    results.sort((a: any, b: any) => (b?.score || 0) - (a?.score || 0));
    res.status(200).json(results.slice(0, 50));
  } catch (error) {
    console.error('API ERROR:', error);
    res.status(200).json([
      {
        id: 0,
        name: 'Fallback Cafe',
        score: 0,
        currentSun: false,
        nextSunTime: 'N/A',
        duration: 0,
      },
    ]);
  }
}
