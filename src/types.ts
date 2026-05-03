export interface Place {
  id: number | string;
  name: string;
  type: 'cafe' | 'park' | 'bar';
  lat: number;
  lon: number;
  dist: number;
  tags: any;
  sunScore?: number;
  currentSun?: boolean;
  score?: number;
  directSun?: {
    status: 'now' | 'soon' | 'none' | 'unavailable';
    label: string;
    score?: number;
    nextMinutes?: number;
    confidence: number;
    confidenceLabel: 'high' | 'medium' | 'low';
    reason: string;
    rank: number;
  };
  spotQuality?: number;
  confidence?: 'high' | 'medium' | 'low';
  reason?: string;
  // Specific analysis fields
  district?: string;
  orientation?: string;
  expertTip?: string;
  neighborhood?: string[];
  condition?: string;
  shadowArea?: number;
  sunInHours?: number;
  futureScore?: number;
  nameSource?: 'osm' | 'fallback';
}

export interface WeatherData {
  temp: number | null;
  cloud: number;
  wind: number | null;
  code: number;
  precipitation?: number | null;
  sunrise?: string;
  sunset?: string;
  uv?: number;
  condition?: string;
  hourly?: {
    time: string[];
    cloudcover?: number[];
    cloud_cover?: number[];
    precipitation?: number[];
    precipitation_probability?: number[];
    weathercode?: number[];
    weather_code?: number[];
  };
  daily?: any;
}

export const TYPE_ICON = {
  cafe: '☕',
  park: '🌳',
  bar: '🍷'
};
