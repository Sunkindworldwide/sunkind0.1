
import * as turf from '@turf/turf';
import SunCalc from 'suncalc';

export interface ShadowResult {
  shadowPolygon: any; // GeoJSON Feature<Polygon>
  bbox: any; // Pre-calculated bbox
}

/**
 * Projects a shadow polygon for a given building footprint based on solar position.
 */
export function calculateShadow(
  footprint: any, // GeoJSON (Polygon or Point converted to circle)
  height: number, 
  date: Date, 
  lat: number, 
  lon: number
): ShadowResult | null {
  const sunPos = SunCalc.getPosition(date, lat, lon);
  const altitude = sunPos.altitude; // radians

  if (altitude <= 0) return null; // Dark

  // Shadow length calculation: height / tan(altitude)
  const shadowLength = height / Math.tan(altitude);
  const azimuth = sunPos.azimuth; // radians
  const shadowAzimuth = azimuth + Math.PI; // Opposite to sun

  // Convert meters to degree offsets (approximate for local scale)
  const dx = shadowLength * Math.sin(shadowAzimuth);
  const dy = shadowLength * Math.cos(shadowAzimuth);
  
  const METERS_PER_DEGREE = 111320;
  const latOffset = dy / METERS_PER_DEGREE;
  const lonOffset = dx / (METERS_PER_DEGREE * Math.cos(lat * Math.PI / 180));

  try {
    // Simplify footprint with convex hull
    const hull = turf.convex(footprint);
    if (!hull) return null;

    const coords = turf.getCoords(hull)[0];
    
    // Project every coordinate to form the shadow's tip
    const projectedCoords = coords.map((c: any) => [
      c[0] + lonOffset,
      c[1] + latOffset
    ]);

    // The full shadow is the convex hull of (original points + projected points)
    const combinedPoints = [...coords, ...projectedCoords];
    const shadowPolygon = turf.convex(turf.featureCollection(combinedPoints.map(p => turf.point(p))));

    if (!shadowPolygon) return null;
    return { 
      shadowPolygon, 
      bbox: turf.bbox(shadowPolygon) 
    };
  } catch (e) {
    return null;
  }
}

/**
 * Calculates sunshine score (0-100) using shadow union to avoid double-counting
 */
export function calculateSunlightScore(terrace: any, shadowObjects: ShadowResult[]): number {
  if (!terrace || !shadowObjects || shadowObjects.length === 0) return 100;

  try {
    const terraceArea = turf.area(terrace);
    if (terraceArea === 0) return 100;

    // 1. Filter shadows that might actually hit the terrace using pre-calc bboxes
    const tBbox = turf.bbox(terrace);
    const nearbyShadows = shadowObjects.filter(s => {
      const sb = s.bbox;
      return !(sb[0] > tBbox[2] || sb[2] < tBbox[0] || sb[1] > tBbox[3] || sb[3] < tBbox[1]);
    });

    if (nearbyShadows.length === 0) return 100;

    // 2. Intersect each nearby shadow with the terrace
    const overlaps: any[] = [];
    for (const sObj of nearbyShadows) {
      try {
        const intersection = turf.intersect(turf.featureCollection([terrace, sObj.shadowPolygon]));
        if (intersection) {
          overlaps.push(intersection);
        }
      } catch (e) { /* skip */ }
    }

    if (overlaps.length === 0) return 100;

    // 3. Union the overlaps to get the unique shadowed area on the terrace
    let unionedOverlap = overlaps[0];
    for (let i = 1; i < overlaps.length; i++) {
      try {
        const nextUnion = turf.union(turf.featureCollection([unionedOverlap, overlaps[i]]));
        if (nextUnion) unionedOverlap = nextUnion;
      } catch (e) { /* skip */ }
    }

    const shadowedArea = turf.area(unionedOverlap);
    const coverage = (shadowedArea / terraceArea) * 100;
    
    // Result is 100 - coverage, rounded.
    return Math.max(0, Math.min(100, Math.round(100 - coverage)));
  } catch (e) {
    return 100;
  }
}
