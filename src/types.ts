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
  uv?: number;
  condition?: string;
  hourly?: {
    time: string[];
    cloudcover: number[];
  };
  daily?: any;
}

export const TYPE_ICON = {
  cafe: '☕',
  park: '🌳',
  bar: '🍷'
};
