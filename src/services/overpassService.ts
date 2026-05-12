
import { getDistance } from '../lib/solar';

export interface OsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  geometry?: { lat: number; lon: number }[]; // For ways
  tags?: Record<string, string>;
  nodes?: number[];
  members?: any[];
}

export interface StructuredOsmData {
  venues: OsmElement[];
  buildings: OsmElement[];
}

/**
 * Fetches cafes/restaurants, quality outdoor spots, and nearby building footprints.
 * Optimized with local caching and fast server selection.
 */
export async function fetchShadowData(lat: number, lon: number, radius: number = 800, signal?: AbortSignal): Promise<StructuredOsmData> {
  // 1. Validation to prevent HTTP 400 from NaN coordinates
  if (isNaN(lat) || isNaN(lon)) {
    console.error("fetchShadowData called with NaN coordinates", { lat, lon });
    return { venues: [], buildings: [] };
  }

  // 2. LOCAL CACHING
  const cacheKey = `sunkind_osm_v4_${lat.toFixed(3)}_${lon.toFixed(3)}_${radius}`;
  const now = Date.now();
  const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { timestamp, data } = JSON.parse(cached);
      if (now - timestamp < CACHE_EXPIRY) {
        return data;
      }
    }
  } catch (e) {
    console.warn("Cache read failed", e);
  }

  // 3. Nearby query. Keep building radius capped so expanded park searches stay fast.
  const buildingRadius = Math.min(radius, 1500);
  const query = `[out:json][timeout:30];
(
  nwr["amenity"~"cafe|restaurant|pub|bar|biergarten|nightclub|wine_bar"](around:${radius},${lat},${lon});
  nwr["leisure"~"park|garden|nature_reserve|recreation_ground|playground"](around:${radius},${lat},${lon});
  nwr["landuse"~"recreation_ground|village_green|forest|meadow|grass"](around:${radius},${lat},${lon});
  nwr["natural"~"wood|grassland|heath|beach"](around:${radius},${lat},${lon});
  nwr["place"~"square|plaza"](around:${radius},${lat},${lon});
  nwr["boundary"~"national_park|protected_area"]["name"](around:${radius},${lat},${lon});
  nwr["tourism"~"viewpoint|attraction"](around:${radius},${lat},${lon});
  nwr["highway"~"pedestrian|footway"]["name"](around:${radius},${lat},${lon});
  nwr["waterway"]["name"](around:${radius},${lat},${lon});
  nwr["building"](around:${buildingRadius},${lat},${lon});
);
out center geom;`;

  try {
    const response = await fetch('/api/overpass', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query }),
      signal,
    });

    if (!response.ok) {
      const text = await response.text();
      // Detect common Overpass errors
      if (text.includes("encoding error")) {
        throw new Error("Overpass encoding error. Check query syntax.");
      }
      throw new Error(`Overpass API error: ${response.status} ${response.statusText} - ${text.substring(0, 100)}`);
    }

    const data = await response.json();
    if (data.remark && data.remark.includes("error")) {
      throw new Error(`Overpass Remark Error: ${data.remark}`);
    }
    const elements: OsmElement[] = data.elements || [];

    const venues: OsmElement[] = [];
    const buildings: OsmElement[] = [];

    elements.forEach(el => {
      if (!el.tags) return;
      
      const tags = el.tags;
      const isAmenity = tags.amenity?.match(/cafe|restaurant|pub|bar|biergarten|nightclub|wine_bar/);
      const isLeisure = tags.leisure?.match(/park|garden|nature_reserve|recreation_ground|playground/);
      const isLanduse = tags.landuse?.match(/recreation_ground|village_green|forest|meadow|grass/);
      const isNatural = tags.natural?.match(/wood|grassland|heath|beach/);
      const isSquare = tags.place?.match(/square|plaza/);
      const isBoundary = tags.boundary?.match(/national_park|protected_area/);
      const isTourism = tags.tourism?.match(/viewpoint|attraction/);
      const isPromenade = tags.highway?.match(/pedestrian|footway/) || tags.waterway;
      const isBuilding = tags.building;

      if (isAmenity || isLeisure || isLanduse || isSquare || isNatural || isBoundary || isTourism || isPromenade) {
        venues.push(el);
      }
      if (isBuilding) {
        buildings.push(el);
      }
    });

    const result: StructuredOsmData = {
      venues: venues.sort((a, b) => {
        const distA = getDistance(lat, lon, a.lat || a.center?.lat || 0, a.lon || a.center?.lon || 0);
        const distB = getDistance(lat, lon, b.lat || b.center?.lat || 0, b.lon || b.center?.lon || 0);
        return distA - distB;
      }).slice(0, 300),
      buildings: buildings.slice(0, 150)
    };

    // Store in cache
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        timestamp: now,
        data: result
      }));
    } catch (e) {
      console.warn("Cache write failed (likely quota reached)", e);
    }

    return result;
  } catch (error) {
    console.error('Failed to fetch Osm data:', error);
    throw error;
  }
}
