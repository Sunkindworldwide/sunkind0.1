
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
 * Fetches cafes/restaurants and building footprints within a specified radius.
 * Optimized with local caching and fast server selection.
 */
export async function fetchShadowData(lat: number, lon: number, radius: number = 800): Promise<StructuredOsmData> {
  // 1. Validation to prevent HTTP 400 from NaN coordinates
  if (isNaN(lat) || isNaN(lon)) {
    console.error("fetchShadowData called with NaN coordinates", { lat, lon });
    return { venues: [], buildings: [] };
  }

  // 2. LOCAL CACHING
  const cacheKey = `sunkind_osm_${lat.toFixed(3)}_${lon.toFixed(3)}_${radius}`;
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

  // 3. MINIMAL QUERY - Compact syntax
  const query = `[out:json][timeout:30];
(
  nwr["amenity"~"cafe|restaurant|pub|bar|biergarten|nightclub|wine_bar"](around:${radius},${lat},${lon});
  nwr["leisure"~"park|garden|recreation_ground|playground|nature_reserve|common|pitch"](around:${radius},${lat},${lon});
  nwr["landuse"~"grass|meadow|village_green|forest|orchard|vineyard|recreation_ground|cemetery|allotments"](around:${radius},${lat},${lon});
  nwr["natural"~"wood|scrub|heath|grassland|fell|sand"](around:${radius},${lat},${lon});
  nwr["place"~"square|plaza"](around:${radius},${lat},${lon});
  nwr["boundary"~"national_park|protected_area"](around:${radius},${lat},${lon});
  nwr["building"](around:${radius},${lat},${lon});
);
out center geom;`;

  try {
    const response = await fetch('/api/overpass', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query }),
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
      const isLeisure = tags.leisure?.match(/park|garden|recreation_ground|playground|nature_reserve|common|pitch/);
      const isLanduse = tags.landuse?.match(/grass|meadow|village_green|forest|orchard|vineyard|recreation_ground|cemetery|allotments/);
      const isNatural = tags.natural?.match(/wood|scrub|heath|grassland|fell|sand/);
      const isSquare = tags.place?.match(/square|plaza/);
      const isBuilding = tags.building;

      if (isAmenity || isLeisure || isLanduse || isSquare || isNatural) {
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
