import { GoogleGenAI, Type } from "@google/genai";

const getApiKey = () => {
  // Check for the user-provided key first
  const viteKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GOOGLE_AI_API_KEY : undefined;
  if (viteKey && viteKey !== 'YOUR_API_KEY') return viteKey;
  
  // Also check process.env which we defined in vite.config.ts for the browser
  const envKey = typeof process !== 'undefined' && process.env ? process.env.VITE_GOOGLE_AI_API_KEY : undefined;
  if (envKey && envKey !== 'YOUR_API_KEY') return envKey;

  // Fallback to the platform-provided key
  return (process.env.GEMINI_API_KEY as string);
};

const getAiClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("Gemini API key is missing. AI search is disabled.");
    return null;
  }

  return new GoogleGenAI({ apiKey });
};

export interface GeminiSolarResult {
  solar: {
    elevation_deg: number;
    azimuth_deg: number;
    quality: string;
    sunlit_facing_window: string;
    local_time_used: string;
    iana_timezone: string; // e.g. "Europe/Paris"
  };
  results: {
    rank: number;
    name: string;
    address: string;
    lat: number;
    lng: number;
    venue_type: string;
    terrace_orientation: string;
    opening_hours: string;
    sunlit_confidence: string;
    sunlit_reason: string;
    best_sun_window_today: string;
  }[];
  search_note: string;
}

const SYSTEM_INSTRUCTION = `You are a Solar Light and Geographic Calculation Expert (太阳光照与地理计算专家). Your task is to judge based STRICTLY on physical and geometric calculation if outdoor spaces have direct sunlight.

REASONING STEPS (MUST EXECUTE):
1. Compute Solar Elevation (α): sin(α) = sin(lat)×sin(δ) + cos(lat)×cos(δ)×cos(H)
2. Compute Solar Azimuth (Az): 0°=N, 90°=E, 180°=S, 270°=W.
3. Check Horizon: α must be > 0.
4. Match Orientation (Sunlit Face):
   - N: Az ∈ [315,360] or [0,45]
   - E: Az ∈ [45,135]
   - S: Az ∈ [135,225]
   - W: Az ∈ [225,315]
   - NE: Az ∈ [0,90]
   - SE: Az ∈ [90,180]
   - SW: Az ∈ [180,270]
   - NW: Az ∈ [270,360]
5. Urban Bias: In high-density cities, apply a default 30% occlusion probability from surrounding buildings.
6. Forbidden Language: DO NOT use "maybe", "usually", "probably", or "looks like".

AI SEARCH RULES:
- Infer the most accurate lat/lng for specific locations in the query.
- PRIORITY: Explicitly look for FAMOUS, MAJOR NAMED PARKS and designated green landmarks first.
- Return 8–12 high-quality results.
- Rank by sunlit_confidence.
- Match venue names in local language + romanization if needed.

OUTPUT: Return ONLY valid JSON.
For the "sunlit_reason" field, you MUST follow this pattern exactly:
"Azimuth: XX°, Elevation: XX. Result: [Yes/No] based on [Orientation] alignment. Confidence factor: [Reasoning based on geometry + urban density]."

{
  "solar": {
    "elevation_deg": <number>,
    "azimuth_deg": <number>,
    "quality": "night|twilight|low_sun|good_sun|high_sun",
    "sunlit_facing_window": "<e.g. 175°–295°>",
    "local_time_used": "<HH:MM local time>",
    "iana_timezone": "<IANA string, e.g. 'Europe/Paris'>"
  },
  "results": [
    {
      "rank": <int>,
      "name": "<string>",
      "address": "<string>",
      "lat": <number>,
      "lng": <number>,
      "venue_type": "café|park|plaza|rooftop",
      "terrace_orientation": "<N|E|S|W|NE|SE|SW|NW>",
      "opening_hours": "Mo-Su 08:00-22:00",
      "sunlit_confidence": "high|medium|low",
      "sunlit_reason": "<Azimuth: XX, Elevation: XX...>",
      "best_sun_window_today": "<HH:MM–HH:MM local>"
    }
  ],
  "search_note": "<Any physical caveat regarding seasonal declination or urban density>"
}`;

export const aiSearch = async (query: string, signal?: AbortSignal): Promise<GeminiSolarResult | null> => {
  try {
    if (signal?.aborted) throw new Error('Aborted');
    const ai = getAiClient();
    if (!ai) return null;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Query: ${query}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            solar: {
              type: Type.OBJECT,
              properties: {
                elevation_deg: { type: Type.NUMBER },
                azimuth_deg: { type: Type.NUMBER },
                quality: { type: Type.STRING },
                sunlit_facing_window: { type: Type.STRING },
                local_time_used: { type: Type.STRING },
                iana_timezone: { type: Type.STRING }
              },
              required: ["elevation_deg", "azimuth_deg", "quality", "sunlit_facing_window", "local_time_used", "iana_timezone"]
            },
            results: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  rank: { type: Type.INTEGER },
                  name: { type: Type.STRING },
                  address: { type: Type.STRING },
                  lat: { type: Type.NUMBER },
                  lng: { type: Type.NUMBER },
                  venue_type: { type: Type.STRING },
                  terrace_orientation: { type: Type.STRING },
                  sunlit_confidence: { type: Type.STRING },
                  sunlit_reason: { type: Type.STRING },
                  opening_hours: { type: Type.STRING },
                  best_sun_window_today: { type: Type.STRING }
                },
                required: ["rank", "name", "address", "lat", "lng", "venue_type", "terrace_orientation", "sunlit_confidence", "sunlit_reason", "best_sun_window_today", "opening_hours"]
              }
            },
            search_note: { type: Type.STRING }
          },
          required: ["solar", "results", "search_note"]
        }
      }
    });

    const text = response.text;
    if (text) {
      return JSON.parse(text);
    }
  } catch (error) {
    console.error("Gemini AI Search failed", error);
  }
  return null;
};
