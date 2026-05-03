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

export default function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const locations = Array.isArray(req.body?.locations) ? req.body.locations : [];
    const weather = req.body?.weather || null;
    const now = new Date();

    const results = locations.map((loc: any, i: number) => {
      const lat = Number(loc?.lat) || 0;
      const lon = Number(loc?.lon) || 0;
      const sun = getSunPosition(lat, lon, now);
      const cloud = Number(loc?.weather?.cloud ?? weather?.cloud);
      const precipitation = Number(loc?.weather?.precipitation ?? weather?.precipitation ?? 0);
      const code = Number(loc?.weather?.code ?? weather?.code ?? 0);
      const hasWeather = Number.isFinite(cloud) && Number.isFinite(code);
      const currentSun = hasWeather && sun.elevation > 3 && cloud < 55 && precipitation <= 0 && code < 51;
      const score = hasWeather ? (currentSun ? Math.round(Math.min(100, Math.max(55, (sun.elevation / 25) * 100))) : 0) : null;
      const confidence = !hasWeather ? 'low' : cloud < 30 && precipitation <= 0 ? 'high' : 'medium';
      const reason = !hasWeather
        ? 'Weather data unavailable'
        : currentSun
          ? 'Sun above horizon, clouds allow direct sunlight, no precipitation'
          : sun.elevation <= 0
            ? 'Sun below horizon'
            : precipitation > 0 || code >= 51
              ? 'Precipitation blocks direct sunlight'
              : 'Cloud cover too high for direct sunlight';

      return {
        id: i,
        name: loc?.name || 'Unknown Place',
        sunscore: score,
        sunStatus: hasWeather ? (currentSun ? 'Direct sun now' : 'No direct sun soon') : 'Sun data unavailable',
        confidence,
        reason,
        score,
        sunScore: score,
        currentSun,
        directSunStatus: hasWeather ? (currentSun ? 'now' : 'none') : 'unavailable',
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
