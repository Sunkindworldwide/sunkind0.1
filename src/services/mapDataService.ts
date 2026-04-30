/**
 * Free Map Data Service using Nominatim (Geocoding) and Overpass (Places)
 */

export interface MapSearchResult {
  lat: number;
  lon: number;
  name: string;
}

export interface AutocompleteSuggestion {
  description: string;
  place_id: string;
  source: 'osm';
}

/**
 * Geocodes an address using Nominatim (Free)
 */
export const geocodeFree = async (address: string, signal?: AbortSignal): Promise<MapSearchResult | null> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          'Accept-Language': 'en,fr',
          'User-Agent': 'SunkindSolarApp/1.0 (contact: sunkind@example.com)'
        },
        signal
      }
    );
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        name: data[0].display_name
      };
    }
  } catch (error) {
    console.error("Geocoding failed", error);
  }
  return null;
};

/**
 * Gets autocomplete suggestions using Nominatim (Free)
 */
export const getFreeSuggestions = async (input: string): Promise<AutocompleteSuggestion[]> => {
  if (input.length < 3) return [];
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}&limit=5`,
      {
        headers: {
          'Accept-Language': 'en,fr'
        }
      }
    );
    const data = await response.json();
    return data.map((item: any) => ({
      description: item.display_name,
      place_id: item.place_id.toString(),
      source: 'osm'
    }));
  } catch (error) {
    console.error("Autocomplete failed", error);
    return [];
  }
};

/**
 * Gets coordinates for a specific Nominatim place_id
 */
export const getFreeDetails = async (description: string): Promise<{ lat: number; lon: number } | null> => {
  // Since Nominatim search results already have lat/lon, we use the display_name to re-fetch if needed,
  // but usually we can just parse the description if we store coordinates initially.
  // For simplicity with the existing UI, we'll re-geocode the description.
  const result = await geocodeFree(description);
  if (result) {
    return { lat: result.lat, lon: result.lon };
  }
  return null;
};
