/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import SunCalc from 'suncalc';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, MapPin, Sun, Wind, Cloud, Clock, Navigation, List, 
  Trophy, ChevronRight, X, Languages, Zap, Sunrise, Sunset, 
  Coffee, Beer, Trees, Moon, Star, Sparkles, ExternalLink,
  SunMedium, Loader2, ChevronLeft, Users, LayoutDashboard
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { Place, WeatherData, TYPE_ICON } from './types';
import { getDistance, getSunPosition, calcSunScore, formatTime, getSunColor, getScoreColor, getScoreBg, getSunlightStatus } from './lib/solar';
import { User } from '@supabase/supabase-js';
import { geocodeFree, getFreeSuggestions, getFreeDetails } from './services/mapDataService';
import { aiSearch } from './services/geminiService';
import { fetchShadowData, OsmElement } from './services/overpassService';
import { calculateShadow, calculateSunlightScore, ShadowResult } from './services/shadowService';
import * as turf from '@turf/turf';
import { getSunDecision } from './services/decisionService';
import ReactMarkdown from 'react-markdown';

const DEFAULT_LOC = { lat: 48.8566, lon: 2.3522, name: 'Search for sun...' };

const T = {
  en: {
    discover: 'Discover',
    ranking: 'Ranking',
    saved: 'Favorites',
    analysis: 'Analysis',
    results: 'Spots',
    searchPlaceholder: 'Search city or street...',
    nearby: 'Nearby Light Spot',
    seeAll: 'See all',
    weather: 'Weather',
    clouds: 'Clouds',
    uv: 'UV Index',
    sunScore: 'Direct sun',
    nearbyResults: 'Nearby',
    foundResults: 'locations found nearby.',
    scanning: 'Scanning local light...',
    geocoding: 'Geocoding address...',
    gpsCapturing: 'Capturing GPS signal...',
    gpsRetry: 'Retrying GPS (Low Accuracy)...',
    gpsFail: 'GPS failed.',
    locNotFound: 'Location not found. Try a broader city name.',
    searchFailed: 'Search failed. Check your internet.',
    logout: 'Logout',
    login: 'Login',
    offline: 'Sync Offline',
    plusMember: 'Sunkind +',
    goPro: 'Go Plus',
    paywallTitle: 'Go Pro for Unlimited Sun',
    paywallDesc: 'Daily search limit reached. Upgrade to plus for infinite discovery.',
    upgrade: 'Upgrade to Plus',
    maybeLater: 'Maybe later',
    noMatching: 'No matching locations found',
    viewMore: 'View More Spots',
    hidden: 'hidden',
    noSpots: 'No spots found in this area',
    collection: 'COLLECTION',
    savedPoints: 'Saved Points',
    savedDesc: "Places you've pinned for future light.",
    top10Title: 'Solar Top 10',
    top10Desc: 'Best exposed spots in real-time in',
    solarAnalysis: 'Solar Analysis',
    analysisDesc: 'Real-time solar calculations powered by IA.',
    globalAccess: 'Global Access',
    unlimitedTesting: 'Unlimited Testing Enabled',
    go: 'GO',
    simMode: 'SIMULATION MODE',
    unlockPower: 'Unlock Full Power',
    plusBenefits: 'Unlimited search • Real-time alerts • Expert Tips',
    intensity: 'Solar Intensity',
    rank: 'RANK',
    multiExposure: 'Multi-exposure',
    expose: 'EXPOSURE',
    noExpert: 'No expert spots verified nearby yet',
    retry: 'Retry Connection',
    elevation: 'Solar Elevation',
    temp: 'Temp',
    sortBySun: 'Sunny First',
    sortByDist: 'Nearest First',
    allDay: 'All Day'
  },
  fr: {
    discover: 'Explorer',
    ranking: 'Top 10',
    saved: 'Favoris',
    analysis: 'Analyse',
    results: 'Spots',
    searchPlaceholder: 'Rechercher ville ou rue...',
    nearby: 'Points lumineux à proximité',
    seeAll: 'Tout voir',
    weather: 'Météo',
    clouds: 'Nuages',
    uv: 'Index UV',
    sunScore: 'Soleil direct',
    nearbyResults: 'À proximité',
    foundResults: 'lieux trouvés à proximité.',
    scanning: 'Analyse de la lumière...',
    geocoding: 'Géocodage de l\'adresse...',
    gpsCapturing: 'Capture du signal GPS...',
    gpsRetry: 'Nouvel essai GPS (basse précision)...',
    gpsFail: 'Échec du GPS.',
    locNotFound: 'Lieu non trouvé. Essayez un nom de ville plus large.',
    searchFailed: 'Échec de la recherche. Vérifiez votre connexion.',
    logout: 'Déconnexion',
    login: 'Connexion',
    offline: 'Hors ligne',
    plusMember: 'Sunkind +',
    goPro: 'Passer Plus',
    paywallTitle: 'Passez Pro pour le soleil illimité',
    paywallDesc: 'Limite de recherche atteinte. Passez à Plus pour une découverte infinie.',
    upgrade: 'Passer à Plus',
    maybeLater: 'Plus tard',
    noMatching: 'Aucun lieu trouvé',
    viewMore: 'Voir plus de lieux',
    hidden: 'cachés',
    noSpots: 'Aucun point trouvé dans cette zone',
    collection: 'COLLECTION',
    savedPoints: 'Points Enregistrés',
    savedDesc: "Lieux que vous avez épinglés pour plus tard.",
    top10Title: 'Top 10 Ensoleillement',
    top10Desc: 'Les terrasses les plus exposées en direct à',
    solarAnalysis: 'Analyse Solaire',
    analysisDesc: 'Calculs solaires en temps réel basés sur l\'IA.',
    globalAccess: 'Accès Global',
    unlimitedTesting: 'Test Illimité Activé',
    go: 'LANCER',
    simMode: 'MODE SIMULATION',
    unlockPower: 'Débloquer tout le potentiel',
    plusBenefits: 'Recherches illimitées • Alertes • Conseils Experts',
    intensity: 'Intensité Solaire',
    rank: 'RANG',
    multiExposure: 'Multi-exposition',
    expose: 'EXPOSITION',
    noExpert: 'Aucun point expert vérifié à proximité',
    retry: 'Réessayer la connexion',
    elevation: 'Élévation Solaire',
    temp: 'Temp',
    sortBySun: 'Ensoleillés d\'abord',
    sortByDist: 'Plus proches',
    allDay: 'Toute la journée'
  }
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isPro, setIsPro] = useState(true);
  const [searchCount, setSearchCount] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const SEARCH_LIMIT = 5;
  const [favorites, setFavorites] = useState<Place[]>([]);
  const [center, setCenter] = useState(DEFAULT_LOC);
  const [places, setPlaces] = useState<Place[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [mode, setMode] = useState<'sun' | 'shade'>('sun');
  const [lang, setLang] = useState<'en' | 'fr'>('en');
  const [simHour, setSimHour] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'list' | 'top10' | 'favorites'>('map');
  const [filters, setFilters] = useState<Set<string>>(new Set(['cafe', 'bar', 'park']));
  const [sortMode, setSortMode] = useState<'sun' | 'dist'>('sun');
  const [loading, setLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<string>('');
  const [zoom, setZoom] = useState(15);
  const [displayLimit, setDisplayLimit] = useState(15); 
  const [categoryLimits, setCategoryLimits] = useState<Record<string, number>>({ cafe: 15, park: 15, bar: 15 });
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearchingGps, setIsSearchingGps] = useState(false);
  const [isExposureOpen, setIsExposureOpen] = useState(true);
  const [locationTimezone, setLocationTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [buildings, setBuildings] = useState<OsmElement[]>([]);
  const [shadows, setShadows] = useState<ShadowResult[]>([]); // Current shadows with pre-calc bboxes
  const [aiDecision, setAiDecision] = useState<string | null>(null);
  const [isDecisionLoading, setIsDecisionLoading] = useState(false);
  const [liveSignals, setLiveSignals] = useState<any[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [isWeatherExpanded, setIsWeatherExpanded] = useState(false);
  const [isMapCompactMode, setIsMapCompactMode] = useState(false);
  const [isMapSectionActive, setIsMapSectionActive] = useState(false);

  // Fetch live signals
  useEffect(() => {
    const fetchInitialSignals = async () => {
      const { data, error } = await supabase
        .from('signals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) console.error("Supabase signal fetch error:", error);
      else setLiveSignals(data || []);
    };

    fetchInitialSignals();

    const channel = supabase
      .channel('public:signals')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'signals' }, (payload) => {
        setLiveSignals(prev => [payload.new, ...prev].slice(0, 50));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const mapRef = useRef<L.Map | null>(null);
  const mapSectionRef = useRef<HTMLDivElement | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const shadowLayersRef = useRef<L.LayerGroup | null>(null);
  const venueLayersRef = useRef<L.LayerGroup | null>(null);
  const cacheRef = useRef<Record<string, Place[]>>({});

  // Invalidate map size when tab changes to ensure visibility
  useEffect(() => {
    if (activeTab === 'map' && mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
    }
  }, [activeTab]);

  useEffect(() => {
    const node = mapSectionRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsMapSectionActive(activeTab === 'map' || activeTab === 'list');
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsMapSectionActive(entry.isIntersecting && entry.intersectionRatio > 0.35);
      },
      { threshold: [0.35, 0.6, 0.85] }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [activeTab]);

  useEffect(() => {
    const mapIsUsableView = isMapSectionActive && (activeTab === 'map' || activeTab === 'list') && !selectedPlace;
    if (!mapIsUsableView) {
      setIsMapCompactMode(false);
      return;
    }

    let touchStartY = 0;

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY > 8) setIsMapCompactMode(true);
      if (event.deltaY < -8) setIsMapCompactMode(false);
    };

    const handleTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? 0;
    };

    const handleTouchMove = (event: TouchEvent) => {
      const currentY = event.touches[0]?.clientY ?? touchStartY;
      const delta = touchStartY - currentY;
      if (delta > 18) setIsMapCompactMode(true);
      if (delta < -18) setIsMapCompactMode(false);
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [activeTab, isMapSectionActive, selectedPlace]);

  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => mapRef.current?.invalidateSize(), 220);
    }
  }, [isMapCompactMode]);

  const submitSignal = async (placeId: number | string, feedback: string) => {
    if (!isSupabaseConfigured) {
      alert("Please connect Supabase to submit signals.");
      return;
    }

    try {
      const { error } = await supabase.from('signals').insert({
        place_id: placeId,
        feedback,
        user_location: center.name,
      });

      if (!error) {
        alert(lang === 'en' ? "Signal received! Thanks for the update." : "Signal reçu ! Merci pour la mise à jour.");
      } else {
        console.error("Signal submit error", error);
        alert("Failed to submit signal.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const containerRef = useRef<HTMLDivElement | null>(null); // New ref for better DOM targeting
  const resultsScrollRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const markerObjectsRef = useRef<Record<string, L.Marker>>({}); // Corrected key type to string
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every minute when not simulating
  useEffect(() => {
    if (simHour !== null) return;
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, [simHour]);

  const now = useMemo(() => {
    if (simHour === null) return currentTime;
    
    // Simple simulation logic relative to local day
    const d = new Date(currentTime);
    d.setHours(Math.floor(simHour));
    d.setMinutes(Math.round((simHour % 1) * 60));
    d.setSeconds(0);
    return d;
  }, [simHour, currentTime]);

  const sunPos = useMemo(() => {
    try {
      const pos = SunCalc.getPosition(now instanceof Date ? now : new Date(), center.lat || 48.8566, center.lon || 2.3522);
      return {
        altitude: isNaN(pos.altitude) ? 0.5 : pos.altitude,
        azimuth: isNaN(pos.azimuth) ? 0 : pos.azimuth
      };
    } catch (e) {
      return { altitude: 0.5, azimuth: 0 };
    }
  }, [now, center]);
  const sunTimes = useMemo(() => {
    try {
      return SunCalc.getTimes(now, center.lat || 48.8566, center.lon || 2.3522);
    } catch (e) {
      const d = new Date();
      return { sunrise: d, sunset: d }; // Minimal fallback
    }
  }, [now, center]);

  // --- EXPERT DATA MAPPING ---
  const EXPERT_DATA: Record<string, Partial<Place>> = {
    'Les Deux Magots': {
      district: '6e', orientation: 'terrasse sud',
      expertTip: 'Grande terrasse plein sud, lumière maximale entre 12h et 16h',
      neighborhood: ['SAINT-GERMAIN', 'ICONIC', 'PLEIN AIR']
    },
    'Le Café de Flore': {
      district: '6e', orientation: 'terrasse sud-ouest',
      expertTip: 'Terrasse légendaire, ensoleillement optimal après 14h',
      neighborhood: ['SAINT-GERMAIN', 'HISTORIQUE']
    },
    'Le Pure Café': {
      district: '11e', orientation: 'terrasse sud',
      expertTip: 'Bastille, terrasse plein sud — lumière toute la journée',
      neighborhood: ['BASTILLE', 'PLEIN SUD']
    },
    'Café Charlot': {
      district: '3e', orientation: 'terrasse sud-ouest',
      expertTip: 'Marais, belle luminosité l\'après-midi côté rue de Bretagne',
      neighborhood: ['MARAIS', 'BRUNCH']
    },
    'Café de la Paix': {
      district: '9e', orientation: 'terrasse est',
      expertTip: 'Vue sur l\'Opéra, soleil matinal jusqu\'à 11h30',
      neighborhood: ['BELLE ÉPOQUE', 'GRANDS BOULEVARDS']
    },
    'Café Marly': {
      district: '1er', orientation: 'terrasse ouest',
      expertTip: 'Arcades du Louvre, lumière filtrée l\'après-midi',
      neighborhood: ['LOUVRE', 'CHIC', 'ARCADES']
    }
  };

  // Update Shadows and Sunlight Scores
  useEffect(() => {
    if (buildings.length === 0) {
      setShadows([]);
      return;
    }

    const newShadows: ShadowResult[] = [];
    buildings.forEach(b => {
      let footprint: any = null;
      
      // Try to use real geometry from Overpass
      if (b.geometry && b.geometry.length > 2) {
        const ring = b.geometry.map((p: any) => [p.lon, p.lat]);
        // Close the ring if needed
        if (ring[0][0] !== ring[ring.length-1][0] || ring[0][1] !== ring[ring.length-1][1]) {
          ring.push(ring[0]);
        }
        footprint = turf.polygon([ring]);
      } else {
        // Fallback to center-based proxy
        const lat = b.lat || b.center?.lat || center.lat;
        const lon = b.lon || b.center?.lon || center.lon;
        footprint = turf.circle([lon, lat], 0.012, { steps: 8, units: 'kilometers' });
      }

      if (!footprint) return;

      const levels = parseInt(b.tags?.['building:levels'] || '3');
      const height = parseFloat(b.tags?.height || (levels * 3.5).toString() || '15');
      const blat = b.lat || b.center?.lat || center.lat;
      const blon = b.lon || b.center?.lon || center.lon;

      const shadow = calculateShadow(footprint, height, now, blat, blon);
      if (shadow) {
        newShadows.push(shadow);
      }
    });

    setShadows(newShadows);
  }, [now, buildings]);

  // Update Score Logic in the loop
  const calculateGeometryScore = (p: Place, targetTime?: Date) => {
    // 1. Solar Math for this location - Safety first
    const tNow = targetTime || now;
    if (!(tNow instanceof Date) || isNaN(tNow.getTime())) return 0;
    if (typeof p.lat !== 'number' || typeof p.lon !== 'number' || isNaN(p.lat) || isNaN(p.lon)) return 0;

    const { elevation, azimuth } = getSunPosition(p.lat, p.lon, tNow);
    
    // Core check: Is the sun above horizon?
    if (elevation <= 0) return 0;

    // 2. Orientation Alignment
    let orientationScore = 1.0;
    if (p.orientation) {
      const orient = p.orientation.toLowerCase();
      let aligned = false;
      const azDeg = (azimuth * 180) / Math.PI + 180; // Map S=0 to S=180, N=180 to N=360/0
      const az = azDeg % 360;

      if (orient.includes('nord') && (az >= 315 || az <= 45)) aligned = true;
      else if (orient.includes('est') && (az >= 45 && az <= 135)) aligned = true;
      else if (orient.includes('sud') && (az >= 135 && az <= 225)) aligned = true;
      else if (orient.includes('ouest') && (az >= 225 && az <= 315)) aligned = true;
      
      if (!aligned) orientationScore = 0.3; 
    }

    // 3. Shadow Geometry (Only for current map state)
    const isPresent = !targetTime || Math.abs(targetTime.getTime() - now.getTime()) < 10000;
    if (isPresent && shadows.length > 0) {
      const terrace = turf.circle([p.lon, p.lat], 0.005, { steps: 8, units: 'kilometers' }); // 5m is more realistic
      const geoScore = calculateSunlightScore(terrace, shadows);
      const weatherSample = getWeatherAtTime(tNow);
      const cloudFactor = (100 - (weatherSample?.cloud ?? 100)) / 100;
      const altDeg = elevation;
      const altFactor = Math.max(0, Math.min(1, altDeg / 20)); // More generous: full intensity at 20°
      return Math.round(geoScore * orientationScore * cloudFactor * altFactor);
    }
    
    const weatherSample = getWeatherAtTime(tNow);
    const cloudFactor = (100 - (weatherSample?.cloud ?? 100)) / 100;
    const altDeg = elevation;
    const altFactor = Math.max(0, Math.min(1, altDeg / 20));
    return Math.round(100 * orientationScore * cloudFactor * altFactor);
  };

  const getWeatherAtTime = (targetTime: Date) => {
    if (!weather) return null;
    const current = {
      cloud: typeof weather.cloud === 'number' ? weather.cloud : null,
      precipitation: typeof weather.precipitation === 'number' ? weather.precipitation : null,
      code: typeof weather.code === 'number' ? weather.code : null,
      forecastType: 'current' as const,
    };

    const hourly = weather.hourly;
    if (!hourly?.time?.length) return current;

    let bestIndex = -1;
    let bestMs = Number.POSITIVE_INFINITY;
    hourly.time.forEach((timeKey, index) => {
      const parsed = new Date(timeKey).getTime();
      if (!Number.isFinite(parsed)) return;
      const diff = Math.abs(parsed - targetTime.getTime());
      if (diff < bestMs) {
        bestMs = diff;
        bestIndex = index;
      }
    });

    if (bestIndex === -1 || bestMs > 75 * 60 * 1000) return current;

    const cloudSeries = hourly.cloudcover || hourly.cloud_cover || [];
    const codeSeries = hourly.weathercode || hourly.weather_code || [];
    const precipSeries = hourly.precipitation || [];
    const precipProbSeries = hourly.precipitation_probability || [];
    return {
      cloud: typeof cloudSeries[bestIndex] === 'number' ? cloudSeries[bestIndex] : current.cloud,
      precipitation: typeof precipSeries[bestIndex] === 'number' ? precipSeries[bestIndex] : current.precipitation,
      precipitationProbability: typeof precipProbSeries[bestIndex] === 'number' ? precipProbSeries[bestIndex] : null,
      code: typeof codeSeries[bestIndex] === 'number' ? codeSeries[bestIndex] : current.code,
      forecastType: 'hourly' as const,
      minutesFromForecast: Math.round(bestMs / 60000),
    };
  };

  const allowsDirectSun = (sample: ReturnType<typeof getWeatherAtTime>) => {
    if (!sample || typeof sample.cloud !== 'number' || typeof sample.code !== 'number') {
      return { allowed: false, confidence: 0 };
    }

    const precip = sample.precipitation ?? 0;
    const precipProb = 'precipitationProbability' in sample ? sample.precipitationProbability ?? 0 : 0;
    const wetWeather = precip > 0 || precipProb >= 55 || sample.code >= 51;
    if (wetWeather) return { allowed: false, confidence: 0.9 };
    if (sample.cloud >= 70) return { allowed: false, confidence: 0.85 };
    if (sample.cloud >= 55) return { allowed: false, confidence: 0.65 };

    const cloudConfidence = sample.cloud <= 30 ? 0.9 : 0.72;
    const forecastPenalty = sample.forecastType === 'hourly' ? 0.18 : 0;
    return { allowed: true, confidence: Math.max(0.45, cloudConfidence - forecastPenalty) };
  };

  const getConfidenceLabel = (confidence: number): 'high' | 'medium' | 'low' => {
    if (confidence >= 0.78) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
  };

  const isWithinSunriseWindow = (targetTime: Date) => {
    if (!weather?.sunrise || !weather?.sunset) return true;
    const sunrise = new Date(weather.sunrise).getTime();
    const sunset = new Date(weather.sunset).getTime();
    if (!Number.isFinite(sunrise) || !Number.isFinite(sunset)) return true;
    return targetTime.getTime() >= sunrise && targetTime.getTime() <= sunset;
  };

  const assessDirectSunAt = (p: Place, targetTime: Date) => {
    if (!weather) return { direct: false, confidence: 0, score: undefined as number | undefined, reason: 'Weather data unavailable' };
    if (!(targetTime instanceof Date) || isNaN(targetTime.getTime())) return { direct: false, confidence: 0, score: undefined as number | undefined, reason: 'Invalid time' };
    if (typeof p.lat !== 'number' || typeof p.lon !== 'number' || isNaN(p.lat) || isNaN(p.lon)) return { direct: false, confidence: 0, score: undefined as number | undefined, reason: 'Invalid spot coordinates' };
    if (!isWithinSunriseWindow(targetTime)) return { direct: false, confidence: 0.95, score: 0, reason: 'Outside sunrise/sunset window' };

    const { elevation } = getSunPosition(p.lat, p.lon, targetTime);
    if (elevation <= 0) return { direct: false, confidence: 0.95, score: 0, reason: 'Sun below horizon' };
    if (elevation <= 3) return { direct: false, confidence: 0.85, score: 0, reason: 'Sun too low for reliable direct light' };

    const sample = getWeatherAtTime(targetTime);
    const weatherGate = allowsDirectSun(sample);
    if (!weatherGate.allowed) {
      const reason = !sample
        ? 'Weather data unavailable'
        : (sample.precipitation ?? 0) > 0 || ('precipitationProbability' in sample && (sample.precipitationProbability ?? 0) >= 55) || (sample.code ?? 0) >= 51
          ? 'Precipitation or storm conditions block direct sun'
          : 'Cloud cover too high for direct sun';
      return { direct: false, confidence: weatherGate.confidence, score: 0, reason };
    }

    const geometryScore = calculateGeometryScore(p, targetTime);
    const cloud = sample?.cloud ?? 100;
    const clearGuardrail = elevation > 5 && cloud < 30 && (sample?.precipitation ?? 0) <= 0;
    const partlyCloudy = elevation > 5 && cloud < 55 && (sample?.precipitation ?? 0) <= 0;
    const direct = clearGuardrail || partlyCloudy || geometryScore >= 35;
    let score = 0;
    if (direct) {
      const base = Math.round(Math.min(100, Math.max(35, geometryScore)));
      if (clearGuardrail) score = Math.max(60, base);
      else if (partlyCloudy) score = Math.max(35, base);
      else score = base;
    }
    const reason = clearGuardrail
      ? 'Sun above horizon, low cloud cover, no precipitation'
      : partlyCloudy
        ? 'Sun above horizon with partial cloud cover'
        : 'Sun position, weather, and local geometry support direct sun';
    return {
      direct,
      confidence: Math.min(0.95, weatherGate.confidence + (shadows.length ? 0.08 : 0)),
      score,
      reason,
    };
  };

  const buildDirectSunStatus = (p: Place): NonNullable<Place['directSun']> => {
    if (!weather) {
      return {
        status: 'unavailable',
        label: lang === 'en' ? 'Sun data unavailable' : 'Données soleil indisponibles',
        confidence: 0,
        confidenceLabel: 'low',
        reason: 'Weather data unavailable',
        rank: 0,
      };
    }

    const current = assessDirectSunAt(p, now);
    if (current.direct && current.confidence >= 0.55) {
      return {
        status: 'now',
        label: lang === 'en' ? 'Direct sun now' : 'Soleil direct maintenant',
        score: current.score,
        confidence: current.confidence,
        confidenceLabel: getConfidenceLabel(current.confidence),
        reason: current.reason || 'Direct sun conditions detected',
        rank: 400 + (current.score || 0),
      };
    }

    for (const minutes of [5, 10, 30]) {
      const targetTime = new Date(now.getTime() + minutes * 60000);
      const future = assessDirectSunAt(p, targetTime);
      const requiredConfidence = minutes <= 10 ? 0.5 : 0.45;
      if (future.direct && future.confidence >= requiredConfidence) {
        const base = minutes <= 10 ? 300 : 200;
        return {
          status: 'soon',
          label: lang === 'en' ? `Direct sun in ~${minutes} min` : `Soleil direct dans ~${minutes} min`,
          score: minutes <= 5 ? 82 : minutes <= 10 ? 72 : 55,
          nextMinutes: minutes,
          confidence: future.confidence,
          confidenceLabel: getConfidenceLabel(future.confidence),
          reason: future.reason || 'Short-term forecast supports direct sun',
          rank: base - minutes,
        };
      }
    }

    return {
      status: 'none',
      label: lang === 'en' ? 'No direct sun soon' : 'Pas de soleil direct bientôt',
      score: 0,
      confidence: Math.max(0.45, current.confidence),
      confidenceLabel: getConfidenceLabel(Math.max(0.45, current.confidence)),
      reason: current.reason || 'No direct sun expected in the next 30 minutes',
      rank: 10,
    };
  };

  const logDirectSunDebug = (p: Place, directSun: NonNullable<Place['directSun']>) => {
    if (!import.meta.env.DEV) return;
    const sample = getWeatherAtTime(now);
    const { elevation } = getSunPosition(p.lat, p.lon, now);
    console.debug('[sunscore]', {
      selectedLat: center.lat,
      selectedLon: center.lon,
      spotLat: p.lat,
      spotLon: p.lon,
      localTime: formatTime(now),
      timezone: locationTimezone,
      sunElevation: elevation,
      cloudCover: sample?.cloud,
      precipitation: sample?.precipitation,
      conditionCode: sample?.code,
      openMeteoCondition: weather?.condition,
      sunrise: weather?.sunrise,
      sunset: weather?.sunset,
      finalSunscore: directSun.score,
      sunStatus: directSun.label,
      confidence: directSun.confidenceLabel,
      reason: directSun.reason,
    });
  };

  const getOrientationAngle = (orient?: string) => {
    if (!orient) return null;
    if (orient.includes('nord')) return 0;
    if (orient.includes('sud-ouest')) return 225;
    if (orient.includes('sud-est')) return 135;
    if (orient.includes('nord-ouest')) return 315;
    if (orient.includes('nord-est')) return 45;
    if (orient.includes('sud')) return 180;
    if (orient.includes('ouest')) return 270;
    if (orient.includes('est')) return 90;
    return null;
  };

  // Improved Scoring function
  const mapVenueType = (venueType: string): Place['type'] => {
    const v = venueType?.toLowerCase() || '';
    if (v.match(/park|garden|plaza|rooftop|playground|square|grass|meadow|leisure|forest|common|nature|pitch|field|scrub/)) return 'park';
    if (v.includes('cafe') || v.includes('café') || v.includes('coffee') || v.includes('brasserie') || v.includes('breakfast') || v.includes('bakery')) return 'cafe';
    return 'bar'; // Default to restau/bar
  };

  const getBestOsmName = (tags: any, langCode: 'en' | 'fr') => {
    const candidates = [
      tags.name,
      tags['name:fr'],
      tags['name:en'],
      tags.official_name,
      tags.short_name,
      tags.alt_name,
      tags.local_name,
      tags.loc_name,
      tags.old_name,
      tags.int_name,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    }

    const nameKeyOrder = langCode === 'en' ? ['name:en', 'name:fr'] : ['name:fr', 'name:en'];
    for (const key of nameKeyOrder) {
      const value = tags[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }

    for (const [key, value] of Object.entries(tags || {})) {
      if (key.startsWith('name:') && typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return '';
  };

  const hasExactOsmName = (tags: any, langCode: 'en' | 'fr') => {
    return !!getBestOsmName(tags, langCode);
  };

  const getParkNamePriority = (p: Place) => {
    return p.type === 'park' ? Math.round(p.spotQuality || 0) : 0;
  };

  const normalizePlaceName = (tags: any, fallbackType: Place['type'], langCode: 'en' | 'fr') => {
    const localizedName = getBestOsmName(tags, langCode);

    if (localizedName) return localizedName;

    const rawType = (tags.leisure || tags.landuse || tags.natural || tags.amenity || tags.place || 'Spot').toString();
    const prettyType = rawType.charAt(0).toUpperCase() + rawType.slice(1).replace(/_/g, ' ');

    if (fallbackType === 'park') {
      return prettyType;
    }

    if (fallbackType === 'cafe') return langCode === 'en' ? `Café (${prettyType})` : `Café (${prettyType})`;
    if (fallbackType === 'bar') return langCode === 'en' ? `Venue (${prettyType})` : `Lieu (${prettyType})`;
    return prettyType;
  };

  const getPlaceDetails = (p: Place) => {
    const tags = p.tags || {};
    const address = tags.address || tags['addr:full'] || [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']].filter(Boolean).join(' ');
    const openingHours = tags.opening_hours || tags.hours || tags['opening_hours:covid19'] || null;
    const website = tags.website || tags.url || tags.contact_website || null;
    const cuisine = tags.cuisine || null;
    const operator = tags.operator || tags.brand || null;
    return { address, openingHours, website, cuisine, operator };
  };

  const getParkBoundary = (el: OsmElement) => {
    if (!el.geometry || el.geometry.length < 4) return null;
    try {
      const ring = el.geometry
        .filter(point => typeof point.lat === 'number' && typeof point.lon === 'number')
        .map(point => [point.lon, point.lat]);
      if (ring.length < 4) return null;
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);
      return turf.polygon([ring]);
    } catch {
      return null;
    }
  };

  const getAreaScore = (areaSqm: number) => {
    if (!areaSqm || areaSqm <= 0) return 20;
    if (areaSqm < 800) return 5;
    if (areaSqm < 2500) return 18;
    if (areaSqm < 10000) return 45;
    if (areaSqm < 50000) return 75;
    return 95;
  };

  const getCategoryQuality = (tags: any) => {
    const tagString = `${tags.leisure || ''} ${tags.landuse || ''} ${tags.natural || ''} ${tags.boundary || ''} ${tags.place || ''} ${tags.tourism || ''} ${tags.highway || ''} ${tags.waterway || ''} ${tags.access || ''}`.toLowerCase();
    if (tags.access === 'private' || tagString.match(/parking|school|hotel|restaurant|shop|office|indoor/)) return 0;
    if (tagString.match(/national_park|nature_reserve|protected_area/)) return 98;
    if (tagString.match(/park|garden/)) return 90;
    if (tagString.match(/recreation_ground|village_green|forest|wood|beach/)) return 72;
    if (tagString.match(/square|plaza|waterway|pedestrian|footway|viewpoint|attraction/)) return 56;
    if (tagString.match(/playground|dog_park|pitch/)) return 22;
    if (tagString.match(/grass|meadow|grassland|heath/)) return 18;
    return 12;
  };

  const getMetadataScore = (tags: any) => {
    const reviews = Number(tags.review_count || tags.reviews || tags.user_ratings_total || tags.ratings_count || 0);
    const photos = Number(tags.photos_count || tags.photo_count || 0);
    const richTags = [
      tags.wikidata,
      tags.wikipedia,
      tags.website,
      tags.image,
      tags.tourism,
      tags.historic,
      tags.operator,
      tags.opening_hours,
    ].filter(Boolean).length;
    return Math.min(100, Math.max(reviews * 3, photos * 2) + richTags * 10);
  };

  const getDistanceQuality = (dist: number) => {
    if (dist <= 500) return 100;
    if (dist <= 1200) return 82;
    if (dist <= 2500) return 58;
    if (dist <= 5000) return 35;
    return 12;
  };

  const getDirectSunQuality = (p: Place) => {
    if (p.directSun?.status === 'now') return 100;
    if (p.directSun?.status === 'soon' && (p.directSun.nextMinutes || 30) <= 10) return 78;
    if (p.directSun?.status === 'soon') return 58;
    if (p.directSun?.status === 'unavailable') return 20;
    return 8;
  };

  const scoreOutdoorSpot = (p: Place) => {
    if (p.type !== 'park') {
      return {
        score: p.spotQuality || 50,
        confidence: p.confidence || 'medium',
        reason: p.reason || 'Indoor venue quality uses existing venue signals'
      };
    }
    const tags = p.tags || {};
    const category = getCategoryQuality(tags);
    const distance = getDistanceQuality(p.dist || 0);
    const area = getAreaScore(Number(tags.area_sqm || 0));
    const metadata = getMetadataScore(tags);
    const sizePopularity = Math.max(area, metadata);
    const sun = getDirectSunQuality(p);
    const score = Math.round(distance * 0.3 + category * 0.3 + sizePopularity * 0.2 + sun * 0.2);
    const lowSignals = category < 30 || (Number(tags.area_sqm || 0) > 0 && Number(tags.area_sqm || 0) < 800 && metadata < 15);
    const confidence: 'high' | 'medium' | 'low' = score >= 72 && !lowSignals ? 'high' : score >= 45 && category >= 45 ? 'medium' : 'low';
    const reason = confidence === 'high'
      ? 'Strong outdoor category, useful distance, and quality signals'
      : confidence === 'medium'
        ? 'Relevant outdoor spot with moderate quality signals'
        : 'Weak category, tiny area, low metadata, or uncertain outdoor usefulness';
    return { score, confidence, reason };
  };

  const isLowQualityPark = (p: Place) => {
    if (p.type !== 'park') return false;
    const tags = p.tags || {};
    const category = getCategoryQuality(tags);
    const area = Number(tags.area_sqm || 0);
    const metadata = getMetadataScore(tags);
    const playgroundOnly = tags.leisure === 'playground' && category < 45;
    const dogOnly = `${tags.leisure || ''} ${tags.amenity || ''}`.includes('dog_park');
    return category <= 22 || playgroundOnly || dogOnly || (area > 0 && area < 800 && metadata < 15);
  };

  const mergeDuplicateOutdoorSpots = (input: Place[]) => {
    const merged: Place[] = [];
    for (const place of input) {
      const externalId = place.tags?.osm_external_id;
      const name = (place.name || '').trim().toLowerCase();
      let mergeIndex = -1;
      for (let i = 0; i < merged.length; i++) {
        const candidate = merged[i];
        if (candidate.type !== place.type) continue;
        const candidateExternalId = candidate.tags?.osm_external_id;
        const distance = getDistance(place.lat, place.lon, candidate.lat, candidate.lon);
        const sameExternalId = externalId && candidateExternalId && externalId === candidateExternalId;
        const sameNameNearby = name && name === (candidate.name || '').trim().toLowerCase() && distance <= 200;
        const sameCoords = distance <= 20;
        if (sameExternalId || sameNameNearby || sameCoords) {
          mergeIndex = i;
          break;
        }
      }

      if (mergeIndex === -1) {
        merged.push(place);
        continue;
      }

      const existing = merged[mergeIndex];
      const keepIncoming = (place.spotQuality || 0) > (existing.spotQuality || 0);
      const best = keepIncoming ? place : existing;
      const other = keepIncoming ? existing : place;
      merged[mergeIndex] = {
        ...best,
        tags: {
          ...other.tags,
          ...best.tags,
          duplicate_merged: true,
        },
      };
    }
    return merged;
  };

  const openPlaceDetails = (p: Place) => {
    setSelectedPlace(p);
    setActiveTab('list');
    if (mapRef.current) {
      mapRef.current.flyTo([p.lat, p.lon], 17, { duration: 1.2 });
    }
  };

  const calculateScore = (p: Place) => {
    const altDeg = sunPos.altitude * (180 / Math.PI);
    if (altDeg < 0) return 0;
    
    // Atmospheric attenuation (more accurate intensity at solar noon vs evening)
    const atmosphereFactor = Math.sin(sunPos.altitude);
    
    const azDeg = sunPos.azimuth * (180 / Math.PI) + 180; // 0 is North
    const cloudFactor = (100 - (weather?.cloud ?? 50)) / 100;
    let baseScore = Math.max(0, Math.min(1, altDeg / 45)) * cloudFactor * 100;
    
    // Atmospheric boost - if sky is clear and sun is up, give a strong base
    if (cloudFactor > 0.8 && altDeg > 15) baseScore = Math.max(baseScore, 70);

    // Orientation modifier
    const targetAngle = getOrientationAngle(p.orientation);
    if (targetAngle !== null) {
      const diff = Math.abs(azDeg - targetAngle);
      const angleDiff = diff > 180 ? 360 - diff : diff;
      // Stricter angular falloff for better accuracy
      const orientFactor = Math.pow(Math.max(0, Math.cos((angleDiff * Math.PI) / 180)), 0.5); 
      baseScore = baseScore * 0.3 + (baseScore * 0.7 * orientFactor);
    }

    return Math.round(mode === 'sun' ? baseScore : (100 - baseScore));
  };

  const processedPlaces = useMemo(() => {
    try {
      if (!Array.isArray(places) || places.length === 0) return [];
      
      // 1. Map scores - limit expensive geometry to top candidates
      const processedLimit = isPro ? 250 : 80;
      const filteredByCategory = places.filter(p => !filters.size || filters.has(p.type));
      const sortedByDist = [...filteredByCategory].sort((a,b) => (a.dist || 0) - (b.dist || 0)).slice(0, processedLimit);
      
      const enriched = sortedByDist.map((p, idx) => {
        if (!p) return null;
        
        const directSun = buildDirectSunStatus(p);
        logDirectSunDebug(p, directSun);
        const quality = scoreOutdoorSpot({ ...p, directSun });
        
        return {
          ...p,
          directSun,
          currentSun: directSun.status === 'now',
          sunScore: directSun.score,
          futureScore: directSun.status === 'soon' ? directSun.score : 0,
          sunInHours: undefined,
          spotQuality: p.type === 'park' ? quality.score : p.spotQuality,
          confidence: p.type === 'park' ? quality.confidence : p.confidence,
          reason: p.type === 'park' ? quality.reason : p.reason,
        };
      }).filter((p): p is NonNullable<typeof p> => !!p);

      // 2. Filter Display Logic
    const filtered = enriched.filter(p => p && p.type && filters.has(p.type));

      // User selectable sort mode
      const sorted = [...filtered].sort((a, b) => {
        if (sortMode === 'sun') {
          if ((b.directSun?.rank || 0) !== (a.directSun?.rank || 0)) {
            return (b.directSun?.rank || 0) - (a.directSun?.rank || 0);
          }
          const qualityDiff = (b.spotQuality || 0) - (a.spotQuality || 0);
          if (Math.abs(qualityDiff) >= 8) return qualityDiff;
          return (a.dist || 0) - (b.dist || 0);
        } else {
          const qualityDiff = (b.spotQuality || 0) - (a.spotQuality || 0);
          if ((a.type === 'park' || b.type === 'park') && Math.abs(qualityDiff) >= 8) return qualityDiff;
          return (a.dist || 0) - (b.dist || 0);
        }
      });

      // 3. Apply Limit per category for the list
      const limited: Place[] = [];
      const counts: Record<string, number> = { cafe: 0, park: 0, bar: 0 };
      const categoryMax = 40; // Increased from 15
      
      for (const p of sorted) {
        const type = p.type;
        if (type && counts[type] !== undefined && counts[type] < (categoryLimits[type] || categoryMax)) {
          limited.push(p);
          counts[type]++;
        }
      }
      
      return limited;
    } catch (e) {
      console.error("Critical error in processedPlaces:", e);
      return [];
    }
  }, [places, filters, mode, now, sunPos, shadows, weather, categoryLimits, lang]);

  // ALL filtered places for the MAP (limited for performance)
  const mapPlaces = useMemo(() => {
    try {
      if (!Array.isArray(processedPlaces)) return [];
      
      // Increased limits for better visibility across zooms
      if (zoom < 14) {
        return [...processedPlaces]
          .sort((a, b) => (b.directSun?.rank || 0) - (a.directSun?.rank || 0))
          .slice(0, 10);
      }
      if (zoom < 16) {
        return [...processedPlaces]
          .sort((a, b) => (b.directSun?.rank || 0) - (a.directSun?.rank || 0))
          .slice(0, 30);
      }
      
      return [...processedPlaces].slice(0, 120);
    } catch (e) {
      return [];
    }
  }, [processedPlaces, zoom]);

  // Top 10 for high-level analysis
  const top10 = useMemo(() => {
    try {
      if (!Array.isArray(places) || places.length === 0) return [];
      
      // Try to get filtered places first
      let relevant = places.filter(p => p && p.type && (filters.has(p.type) || filters.size === 0));
      
      // If none match filters, show everything
      if (relevant.length === 0) relevant = [...places];

      return relevant.map(p => {
          const directSun = buildDirectSunStatus(p);
          const quality = scoreOutdoorSpot({ ...p, directSun });
          return { 
          ...p,
          directSun,
          currentSun: directSun.status === 'now',
          sunScore: directSun.score,
          spotQuality: p.type === 'park' ? quality.score : p.spotQuality,
          district: p.tags?.district || p.tags?.["addr:city"] || center.name.split(',')[0]
        };
        })
        .sort((a, b) => {
          if ((b.directSun?.rank || 0) !== (a.directSun?.rank || 0)) return (b.directSun?.rank || 0) - (a.directSun?.rank || 0);
          const qualityDiff = (b.spotQuality || 0) - (a.spotQuality || 0);
          if (Math.abs(qualityDiff) >= 8) return qualityDiff;
          return (a.dist || 0) - (b.dist || 0);
        })
        .slice(0, 10);
    } catch (e) {
      console.error("Top 10 error:", e);
      return [];
    }
  }, [places, filters, mode, shadows, weather, sunPos, center, lang, now]);

  // Initialize Map
  useEffect(() => {
    // Only initialize or refresh if we are on a tab that shows the map
    if (activeTab === 'map' || activeTab === 'list') {
      if (!mapRef.current) {
        const container = containerRef.current;
        if (container) {
          const map = L.map(container, { 
            zoomControl: false, 
            attributionControl: false,
            dragging: true,
            touchZoom: true
          }).setView([center.lat, center.lon], 15);
          
          L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);
          L.control.zoom({ position: 'bottomright' }).addTo(map);
          
          map.on('zoomend', () => {
            setZoom(map.getZoom());
          });

          mapRef.current = map;
          markersRef.current = L.layerGroup().addTo(map);
          shadowLayersRef.current = L.layerGroup().addTo(map);

          map.on('dblclick', (e) => {
            const { lat, lng } = e.latlng;
            handleMoveTo(lat, lng, lang === 'en' ? 'Custom Point' : 'Point Personnalisé');
          });

          // Essential for Safari: force invalidateSize multiple times during mounting
          const timer1 = setTimeout(() => map.invalidateSize(), 150);
          const timer2 = setTimeout(() => map.invalidateSize(), 600);
          const timer3 = setTimeout(() => map.invalidateSize(), 1800);
          return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
          };
        }
      } else {
        // If map exists, just ensure it's invalidated to handle resize/container shifts
        setTimeout(() => mapRef.current?.invalidateSize(), 200);
        setTimeout(() => mapRef.current?.invalidateSize(), 1000);
      }
    }
    
    return () => {
      // We only want to clean up if the component unmounts, not on every tab change
      // but Leaflet is picky about moving containers. 
      // If the container is destroyed by React, we must remove the map.
    };
  }, [activeTab]);

  // Handle map destruction when tab switches away and destroys the container
  useEffect(() => {
    if (activeTab !== 'map' && activeTab !== 'list') {
       if (mapRef.current) {
         mapRef.current.remove();
         mapRef.current = null;
       }
    }
  }, [activeTab]);

  // Render Shadows on Map
  useEffect(() => {
    if (shadows.length > 0 && places.length > 0) {
      setPlaces(prev => prev.map(p => {
        const directSun = buildDirectSunStatus(p);
        return {
          ...p,
          directSun,
          currentSun: directSun.status === 'now',
          sunScore: directSun.score,
        };
      }));
      setLoading(false); // Ensure loading stops when scores are ready
    }
  }, [shadows.length, places.length, weather, now, lang]);

  useEffect(() => {
    if (shadowLayersRef.current && shadows.length > 0) {
      shadowLayersRef.current.clearLayers();
      
      const shadowCollection: any = {
        type: 'FeatureCollection',
        features: shadows.map(s => ({
          type: 'Feature',
          geometry: s.shadowPolygon.geometry || s.shadowPolygon, // handle both raw geometry and features
          properties: {}
        }))
      };

      L.geoJSON(shadowCollection, {
        style: {
          color: '#1a1a1a',
          weight: 0,
          fillOpacity: 0.35,
          fillColor: '#000'
        },
        // Performance boost: disable mouse events on shadows
        interactive: false
      }).addTo(shadowLayersRef.current!);
    } else if (shadowLayersRef.current) {
      shadowLayersRef.current.clearLayers();
    }
  }, [shadows]);

  // Update Markers
  useEffect(() => {
    if (markersRef.current && mapRef.current) {
      // Small optimization: only clear if markers have actually changed
      markersRef.current.clearLayers();
      markerObjectsRef.current = {};
      const isNight = sunPos.altitude < 0;

      mapPlaces.forEach(p => {
        const score = p.directSun?.score || 0;
        const scoreText = p.directSun?.status === 'unavailable' ? '--' : `${score}%`;
        const status = getStatus(p);
        const iconEmoji = p.type === 'cafe' ? '☕' : p.type === 'bar' ? '🍷' : '🌳';
        const isHigh = p.directSun?.status === 'now' || p.directSun?.status === 'soon';

        const icon = L.divIcon({
          className: '',
          html: `
            <div class="relative group">
              <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 ${isHigh ? 'bg-amber-500' : 'bg-white'} border-r border-b ${isHigh ? 'border-amber-400' : 'border-gray-200'} z-0 shadow-sm"></div>
              <div class="relative z-10 flex items-center gap-1.5 ${isHigh ? 'bg-amber-500 text-white' : 'bg-white text-gray-800'} px-3 py-1.5 rounded-[12px] shadow-[0_8px_20px_rgba(0,0,0,0.15)] border-[1.5px] border-white/40 hover:-translate-y-1 hover:scale-105 transition-all active:scale-95">
                <span class="text-[14px] leading-none drop-shadow-sm">${iconEmoji}</span>
                <span class="text-[11px] font-black tracking-tighter tabular-nums">${scoreText}</span>
              </div>
            </div>
          `,
          iconSize: [40, 34],
          iconAnchor: [20, 34],
          popupAnchor: [0, -34]
        });
        const marker = L.marker([p.lat, p.lon], { icon }).addTo(markersRef.current!);
        
        marker.on('click', () => openPlaceDetails(p));

        markerObjectsRef.current[p.id.toString()] = marker;
      });
    }
  }, [mapPlaces, mode]); // Removed sunPos from here to avoid minute-by-minute marker re-renders

  // Handle fly to
  const handleFlyTo = (p: Place) => {
    if (mapRef.current) {
      setActiveTab('map');
      setSelectedPlace(p);
      mapRef.current.flyTo([p.lat, p.lon], 18, { 
        duration: 2,
        easeLinearity: 0.25
      });
      setTimeout(() => {
        markerObjectsRef.current[p.id.toString()]?.openPopup();
      }, 2100);
    }
  };

  // Location logic
  const handleMoveTo = async (lat: number, lon: number, name: string, force = false) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setCenter({ lat, lon, name });
    if (mapRef.current) mapRef.current.flyTo([lat, lon], 16.5, { duration: 1.5 });
    
    try {
      const weatherPromise = fetchWeather(lat, lon);
      const placesPromise = fetchPlaces(lat, lon, force);
      
      const [_, result] = await Promise.all([
        weatherPromise,
        placesPromise
      ]);
      return result.venues.length;
    } catch (e: any) {
      console.error(e);
      return 0;
    } finally {
      setLoading(false);
    }
  };

  const fetchWeather = async (lat: number, lon: number) => {
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,cloud_cover,wind_speed_10m,weather_code,precipitation&hourly=cloud_cover,precipitation,precipitation_probability,weather_code&daily=sunrise,sunset&timezone=auto&forecast_days=2`);
      const d = await r.json();
      
      const code = d.current.weather_code ?? d.current.weathercode;
      const cloud = d.current.cloud_cover ?? d.current.cloudcover;
      let cond = 'Clear';
      if (code > 0 && code < 3) cond = 'Partly Cloudy';
      else if (code >= 3) cond = 'Cloudy';
      if (code >= 51) cond = 'Rainy';
      if (code >= 71) cond = 'Snowy';
      if (code >= 95) cond = 'Stormy';

      setWeather({
        temp: d.current.temperature_2m,
        cloud,
        wind: d.current.wind_speed_10m ?? d.current.windspeed_10m,
        code: code,
        precipitation: d.current.precipitation ?? null,
        sunrise: d.daily?.sunrise?.[0],
        sunset: d.daily?.sunset?.[0],
        condition: cond,
        hourly: d.hourly,
        daily: d.daily
      });
    } catch (e) {
      console.warn("Weather fetch failed", e);
    }
  };

  const fetchPlaces = async (lat: number, lon: number, force = false, skipState = false) => {
    if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
      console.error("Invalid coordinates for fetchPlaces", { lat, lon });
      return { venues: [], bCount: 0 };
    }

    const cacheKey = `v5:${lat.toFixed(3)},${lon.toFixed(3)}`;
    if (!force && cacheRef.current[cacheKey]) {
      if (!skipState) setPlaces(cacheRef.current[cacheKey]);
      return { venues: cacheRef.current[cacheKey], bCount: 0 };
    }

    if (!isPro && searchCount >= SEARCH_LIMIT) {
      setLoading(false);
      setShowPaywall(true);
      return { venues: [], bCount: 0 };
    }

    setLoading(true);
    setSystemStatus(T[lang].scanning);
    if (!skipState) setPlaces([]); 

    try {
      let data = await fetchShadowData(lat, lon, 1500);
      let sourceRadius = 1500;
      const countQualityParks = (items: OsmElement[]) => items.filter(el => {
        const tags = el.tags || {};
        const category = getCategoryQuality(tags);
        return category >= 45;
      }).length;

      if (countQualityParks(data.venues) < 6) {
        const expanded = await fetchShadowData(lat, lon, 5000);
        data = { venues: expanded.venues, buildings: data.buildings.length ? data.buildings : expanded.buildings };
        sourceRadius = 5000;
      }

      if (countQualityParks(data.venues) < 4) {
        const expanded = await fetchShadowData(lat, lon, 10000);
        data = { venues: expanded.venues, buildings: data.buildings.length ? data.buildings : expanded.buildings };
        sourceRadius = 10000;
      }
      
      // Process Buildings
      setBuildings(data.buildings);
      const bCount = data.buildings.length;

        // Process Venues into Places
        const venuesAsPlaces: Place[] = data.venues.map(el => {
          const tags = el.tags || {};
          
        const fallbackType = mapVenueType(`${tags.amenity || ''} ${tags.leisure || ''} ${tags.landuse || ''} ${tags.place || ''} ${tags.natural || ''} ${tags.boundary || ''} ${tags.tourism || ''} ${tags.highway || ''} ${tags.waterway || ''}`);
        const typeHint = fallbackType;
        const name = normalizePlaceName(tags, typeHint, lang);
        const boundary = getParkBoundary(el);
        const areaSqm = boundary ? Math.round(turf.area(boundary)) : 0;

        const plat = el.lat || el.center?.lat || lat;
        const plon = el.lon || el.center?.lon || lon;
        
        const normalizedName = name.toLowerCase().trim();
        const amenity = tags.amenity || '';
        const leisure = tags.leisure || '';
        const landuse = tags.landuse || '';
        const natural = tags.natural || '';
        const boundaryTag = tags.boundary || '';
        const place = tags.place || '';
        const tourism = tags.tourism || '';
        const highway = tags.highway || '';
        const waterway = tags.waterway || '';
        
        // Prioritize park-like tags if present to avoid misclassification by generic amenity tags
        let type: Place['type'] = fallbackType;
        const tagsString = `${amenity} ${leisure} ${landuse} ${place} ${natural} ${boundaryTag} ${tourism} ${highway} ${waterway}`.toLowerCase();
        
        if (tagsString.match(/park|garden|playground|recreation_ground|grass|meadow|village_green|square|plaza|wood|forest|nature_reserve|national_park|protected_area|beach|waterway|pedestrian|footway|viewpoint/)) {
          type = 'park';
        } else if (tagsString.match(/cafe|café|coffee|brasserie|breakfast|bakery/)) {
          type = 'cafe';
        } else if (tagsString.match(/bar|pub|biergarten|nightclub|wine_bar|restaurant/)) {
          type = 'bar';
        }

        let expert = undefined;
        for (const [key, val] of Object.entries(EXPERT_DATA)) {
          if (normalizedName.includes(key.toLowerCase())) {
            expert = val as Partial<Place>;
            break;
          }
        }

        const details = getPlaceDetails({
          ...({ tags } as Place),
        } as Place);

        const placeDraft: Place = {
          id: el.id,
          name: normalizePlaceName(tags, type, lang),
          type,
          lat: plat,
          lon: plon,
          dist: getDistance(lat, lon, plat, plon),
          nameSource: hasExactOsmName(tags, lang) ? 'osm' : 'fallback',
          tags: {
            ...el.tags,
            osm_external_id: `${el.type}/${el.id}`,
            search_radius_m: sourceRadius,
            ...(areaSqm ? { area_sqm: areaSqm } : {}),
            ...(details.address ? { address: details.address } : {}),
            ...(details.openingHours ? { opening_hours: details.openingHours } : {}),
            ...(details.website ? { website: details.website } : {}),
            ...(details.cuisine ? { cuisine: details.cuisine } : {}),
            ...(details.operator ? { operator: details.operator } : {}),
          },
          ...expert
        };
        const quality = scoreOutdoorSpot(placeDraft);
        return {
          ...placeDraft,
          spotQuality: quality.score,
          confidence: quality.confidence,
          reason: quality.reason,
        };
      });

      const rankedPlaces = mergeDuplicateOutdoorSpots(venuesAsPlaces)
        .filter(p => p.type !== 'park' || !isLowQualityPark(p) || (p.dist || 0) < 500)
        .sort((a, b) => {
          if (a.type === 'park' || b.type === 'park') {
            const qualityDiff = (b.spotQuality || 0) - (a.spotQuality || 0);
            if (Math.abs(qualityDiff) >= 8) return qualityDiff;
          }
          return (a.dist || 0) - (b.dist || 0);
        });

      if (!skipState) setPlaces(rankedPlaces);
      cacheRef.current[cacheKey] = rankedPlaces;
      setLoading(false);
      return { venues: rankedPlaces, bCount };
    } catch (e) {
      console.error('Shadow fetching failed:', e);
      setLoading(false);
      return { venues: [], bCount: 0 };
    }
  };

  // Suggestions and geocoding handled by hybrid free providers
  const handleSearch = (val: string) => {
    setSearchInput(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (val.length < 2) {
      setSuggestions([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const query = val.toLowerCase().trim();
        
        // 1. Fetch from Photon (Global Suggestions)
        const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(val)}&limit=8`);
        const d = await r.json();
        const globalSuggestions = (d.features || []).map((f: any) => ({
          ...f,
          properties: {
            ...f.properties,
            isOsm: true
          }
        }));

        // 2. Local Matching (Spots already loaded on the map)
        const localMatches = (places || [])
          .filter(p => (p.name || '').toLowerCase().includes(query))
          .map(p => ({
            type: 'Feature',
            geometry: { coordinates: [p.lon, p.lat] },
            properties: { 
              name: p.name, 
              city: p.type.toUpperCase(), 
              country: 'Local Spot',
              isLocal: true 
            }
          }))
          .slice(0, 3);
        
        setSuggestions([...localMatches, ...globalSuggestions]);
      } catch (e) {
        console.error("Search error:", e);
        setSuggestions([]);
      }
    }, 300); 
  };

  const selectSuggestion = async (f: any) => {
    const name = f.properties.name || f.properties.city || 'Location';
    
    // If it's a global suggestion (Photon), get coords
    if (f.properties.isOsm) {
      const [lon, lat] = f.geometry.coordinates;
      const localByName = (places || []).find(p => p.name?.toLowerCase() === name.toLowerCase());
      if (localByName) {
        openPlaceDetails(localByName);
      } else {
        handleMoveTo(lat, lon, name);
      }
      setSearchInput(name);
      setSuggestions([]);
      return;
    }

    const [lon, lat] = f.geometry.coordinates;
    const localMatch = (places || []).find(p => {
      const sameName = p.name === name || p.name?.toLowerCase() === name.toLowerCase();
      const sameCoords = Math.abs((p.lon || 0) - lon) < 0.0001 && Math.abs((p.lat || 0) - lat) < 0.0001;
      return sameName || sameCoords;
    });
    if (localMatch) {
      openPlaceDetails(localMatch);
    } else {
      handleMoveTo(lat, lon, name);
    }
    setSearchInput(name);
    setSuggestions([]);
  };

  const formatTimeManual = (d: Date) => {
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  // Optimized Search Execution (3s Target)
  const executeSearch = async () => {
    if (!searchInput.trim() || loading) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setSystemStatus(T[lang].geocoding);
    setPlaces([]); // Clear immediately 
    
    try {
      const signal = abortControllerRef.current.signal;
      const [geoRes, aiRes] = await Promise.allSettled([
        geocodeFree(searchInput, signal),
        aiSearch(`${searchInput} (Context: User Lang: ${lang})`, signal),
      ]);

      const geo = geoRes.status === 'fulfilled' ? geoRes.value : null;
      const ai = aiRes.status === 'fulfilled' ? aiRes.value : null;

      let lat = center.lat;
      let lon = center.lon;
      let name = searchInput;

      if (geo && typeof geo.lat === 'number' && !isNaN(geo.lat)) {
        lat = geo.lat;
        lon = geo.lon;
        name = geo.name;
      } else if (ai?.results?.[0] && typeof ai.results[0].lat === 'number' && !isNaN(ai.results[0].lat)) {
        lat = ai.results[0].lat;
        lon = ai.results[0].lng;
        name = ai.results[0].name;
      }

      if (ai?.solar?.iana_timezone) {
        setLocationTimezone(ai.solar.iana_timezone);
      }

      if (typeof lat === 'number' && !isNaN(lat) && typeof lon === 'number' && !isNaN(lon)) {
        setCenter({ lat, lon, name });
        if (mapRef.current) mapRef.current.flyTo([lat, lon], 15);
      }

      await fetchWeather(lat, lon);
      
      // FETCH PLACES WRAPPER
      let osmResults: Place[] = [];
      let bCount = 0;
      try {
        const fetchResult = await fetchPlaces(lat, lon, false, true);
        osmResults = fetchResult.venues;
        bCount = fetchResult.bCount;
      } catch (osmErr: any) {
        console.error("OSM Fetch failed:", osmErr);
        // Continue with AI results if available
      }
      
      let initialPlaces: Place[] = [...osmResults];
      if (ai?.results) {
        const aiPlaces: Place[] = ai.results.map(r => ({
          id: Math.floor(Math.random() * 9999999) + Date.now(),
          name: r.name,
          type: mapVenueType(r.venue_type),
          lat: r.lat,
          lon: r.lng,
          dist: getDistance(lat, lon, r.lat, r.lng),
          tags: { address: r.address, ai_note: ai.search_note, opening_hours: r.opening_hours },
          orientation: r.terrace_orientation,
          expertTip: r.sunlit_reason,
          condition: `Confidence: ${r.sunlit_confidence}`
        }));
        initialPlaces = [...initialPlaces, ...aiPlaces];
      }

      const seen = new Set<string>();
      const uniquePlaces = initialPlaces.filter(p => {
        const k = p.name?.toLowerCase().trim() || Math.random().toString();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      if (uniquePlaces.length === 0) {
        setLoading(false);
        setSystemStatus('');
        return;
      }

      // BACKEND CALL FOR SCORING
      setSystemStatus(lang === 'en' ? 'Refining sun scores...' : 'Affinage des scores...');
      try {
        const res = await fetch("/sun/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locations: uniquePlaces,
            date: new Date().toISOString().split('T')[0],
            time: formatTimeManual(new Date()),
            weather: weather ? {
              cloud: weather.cloud,
              precipitation: weather.precipitation ?? 0,
              code: weather.code,
            } : null,
          })
        });
        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          const finalized = uniquePlaces.map(p => {
            return {
              ...p,
              currentSun: p.currentSun,
            };
          }).sort((a,b) => a.dist - b.dist);
          setPlaces(finalized);
        } else {
          setPlaces(uniquePlaces.sort((a,b) => a.dist - b.dist));
        }
      } catch (err) {
        console.error("Backend Scoring failed", err);
        setPlaces(uniquePlaces.sort((a,b) => a.dist - b.dist));
      }

    } catch (e: any) {
      if (e.name === 'AbortError') return;
      console.error("Search pipeline failed", e);
      setSystemStatus(T[lang].locNotFound);
      setTimeout(() => setSystemStatus(''), 3000);
    } finally {
      setLoading(false);
      setSystemStatus('');
      setTimeout(() => {
        if (mapRef.current) mapRef.current.invalidateSize();
      }, 400);
    }
  };

  const handleAiDecision = async (query: string = "Where is sunniest now?") => {
    if (isDecisionLoading || places.length === 0) return;
    
    setIsDecisionLoading(true);
    setAiDecision(null);
    
    try {
      const decision = await getSunDecision({
        city: center.name,
        date: now.toISOString().split('T')[0],
        current_time: formatTime(now),
        user_query: query,
        locations: places.map(p => {
          const directSun = p.directSun || buildDirectSunStatus(p);
          return {
            ...p,
            sunScore: directSun.score ?? 0,
            condition: directSun.label,
          };
        }),
        user_signals: liveSignals
      });
      setAiDecision(decision);
    } catch (e) {
      console.error("Decision engine error:", e);
      setAiDecision("Failed to reach Decision Engine.");
    } finally {
      setIsDecisionLoading(false);
    }
  };

  const handleGps = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsSearchingGps(true);
    setSystemStatus(T[lang].gpsCapturing);
    
    const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleMoveTo(pos.coords.latitude, pos.coords.longitude, lang === 'en' ? 'Your Location' : 'Votre Position');
        setLocationTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
        setIsSearchingGps(false);
        setSystemStatus('');
      },
      (err) => {
        setSystemStatus(T[lang].gpsRetry);
        
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            handleMoveTo(pos.coords.latitude, pos.coords.longitude, lang === 'en' ? 'Your Location' : 'Votre Position');
            setIsSearchingGps(false);
            setSystemStatus('');
          },
          (err2) => {
            setIsSearchingGps(false);
            setSystemStatus(T[lang].gpsFail);
            if (err2.code === 1) alert(lang === 'en' ? "Please enable location permissions" : "Veuillez activer les permissions de localisation");
            else alert(lang === 'en' ? "Could not get location. Is your signal strong?" : "Impossible d'obtenir la position.");
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
        );
      },
      options
    );
  };

  const toggleFilter = (f: string) => {
    setFilters(prev => {
      const next = new Set(prev);
      if (next.has(f) && next.size > 1) next.delete(f);
      else next.add(f);
      return next;
    });
  };

  // Initial load
  useEffect(() => {
    // Restore real geolocation on start as requested
    handleGps();
    setPlaces([]);
  }, []);

  // Supabase Auth Listener
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) fetchProfile(currentUser.id, currentUser.email);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, _email?: string) => {
    if (!isSupabaseConfigured) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('is_pro, daily_search_count, last_search_date')
      .eq('id', userId)
      .single();
    
    if (data && !error) {
      const today = new Date().toISOString().split('T')[0];
      if (data.last_search_date !== today) {
        updateProfileSearchCount(0);
      }
    } else if (error && error.code === 'PGRST116') {
      // Profile doesn't exist, create it
      await supabase.from('profiles').insert({ 
        id: userId, 
        is_pro: false, 
        daily_search_count: 0,
        last_search_date: new Date().toISOString().split('T')[0]
      });
    }
  };

  const updateProfileSearchCount = async (count: number) => {
    if (!user || !isSupabaseConfigured) return;
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('profiles').upsert({ 
      id: user.id, 
      daily_search_count: count,
      last_search_date: today
    });
  };

  // Fetch favorites when user changes
  useEffect(() => {
    if (user) {
      fetchFavorites();
    } else {
      setFavorites([]);
    }
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id);
    
    if (data && !error) {
      setFavorites(data.map(f => ({
        ...f,
        id: f.place_id, // Map place_id back to id for UI
      })));
    }
  };

  const toggleFavorite = async (p: Place) => {
    if (!isSupabaseConfigured) {
      alert("Please connect your Supabase project in settings to enable favorites.");
      return;
    }
    
    if (!user) {
      alert("Please sign in to save favorites");
      return;
    }

    const isFav = favorites.some(f => f.id === p.id);
    if (isFav) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('place_id', p.id);
      
      if (!error) {
        setFavorites(prev => prev.filter(f => f.id !== p.id));
      }
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({
          user_id: user.id,
          place_id: p.id,
          name: p.name,
          type: p.type,
          lat: p.lat,
          lon: p.lon,
        });
      
      if (!error) {
        setFavorites(prev => [...prev, p]);
      } else {
        console.error("Save favorite error", error);
        alert("Failed to save favorite. Make sure the 'favorites' table exists in Supabase.");
      }
    }
  };

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) console.error("Login error", error);
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  // Native date formatter helper
  const getStatus = (p: Place) => {
    if (!p) return { isOpen: null, label: null };
    const oh = p.tags?.opening_hours;
    const isNight = sunPos.altitude < 0;
    const now = new Date();
    const h = now.getHours();

    // Standard heuristics if opening_hours is missing
    if (!oh || typeof oh !== 'string') {
      if (p.type === 'park') return { 
        isOpen: !isNight, 
        label: lang === 'en' ? (!isNight ? 'Sunrise-Sunset' : 'Night') : (!isNight ? 'Lever-Coucher' : 'Nuit') 
      };
      if (p.type === 'cafe') {
        const isDay = h >= 8 && h < 19;
        return { isOpen: isDay, label: lang === 'en' ? (isDay ? 'Likely Open' : 'Closed') : (isDay ? 'Prob. Ouvert' : 'Fermé') };
      }
      if (p.type === 'bar') {
        const isEvening = h >= 17 || h < 2;
        return { isOpen: isEvening, label: lang === 'en' ? (isEvening ? 'Open' : 'Opens 5PM') : (isEvening ? 'Ouvert' : 'Ouvre 17h') };
      }
      return { isOpen: null, label: null };
    }

    if (oh === '24/7') return { isOpen: true, label: '24/7' };

    try {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const total = h * 60 + m;

      const ranges = oh.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/g);
      if (ranges) {
        for (const r of ranges) {
          try {
            const parts = r.split('-');
            const [sh, sm] = parts[0].trim().split(':').map(Number);
            const [eh, em] = parts[1].trim().split(':').map(Number);
            const st = sh * 60 + sm;
            const et = eh * 60 + em;

            if (total >= st && total <= et) return { isOpen: true, label: lang === 'en' ? 'Open' : 'Ouvert' };
          } catch (e) { /* skip bad range */ }
        }
        return { isOpen: false, label: lang === 'en' ? 'Closed' : 'Fermé' };
      }
    } catch (e) {}

    return { isOpen: null, label: oh.length > 15 ? oh.substring(0, 12) + '...' : oh };
  };

  const formatDateHeader = (d: Date) => {
    try {
      return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        timeZone: locationTimezone
      });
    } catch (e) {
      return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  const formatLocalTime = (d: Date) => {
    try {
      return d.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false, 
        timeZone: locationTimezone 
      });
    } catch (e) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
  };

  const getLocalTimeParts = (d: Date) => {
    try {
      const options: any = { hour: 'numeric', minute: 'numeric', hour12: false, timeZone: locationTimezone };
      const formatter = new Intl.DateTimeFormat('en-GB', options);
      const parts = formatter.formatToParts(d);
      const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
      const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
      return { h, m };
    } catch (e) {
      return { h: d.getHours(), m: d.getMinutes() };
    }
  };

  const navigateToMaps = (lat: number, lon: number, name: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    window.open(url, '_blank');
  };

  const renderPlaceCard = (p: Place, i: number, showExpert = true) => {
    if (!p) return null;
    const directSun = p.directSun || buildDirectSunStatus(p);
    const score = directSun.score ?? 0;
    const isNight = sunPos.altitude < 0;
    const isFav = Array.isArray(favorites) && favorites.some(f => f && f.id !== undefined && p.id !== undefined && f.id.toString() === p.id.toString());
    const status = getStatus(p);

    // Get Solar Label
    const solarLabel = directSun.status === 'none' ? null : directSun.label;
    const solarColor = directSun.status === 'now'
      ? 'text-orange-500'
      : directSun.status === 'soon'
        ? 'text-yellow-600'
        : directSun.status === 'unavailable'
          ? 'text-slate-400'
          : 'text-[var(--ink3)]';
    
    return (
      <motion.div 
        key={p.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.05 }}
        onClick={() => {
          openPlaceDetails(p);
        }}
        className="card-apple p-5 flex flex-col gap-4 btn-apple mb-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${getScoreBg(score, p.type)}`}>
                {p.type === 'cafe' ? '☕' : p.type === 'bar' ? '🍷' : '🌳'}
              </div>
              {sortMode === 'sun' && i < 10 && (
                <div className="absolute -top-2 -left-2 w-5 h-5 bg-[var(--amber)] text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm italic">
                  {i + 1}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <h3 className="text-md font-bold text-[var(--ink)] leading-tight">{p.name}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {status.label && (
                   <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${status.isOpen ? 'bg-emerald-100/50 text-emerald-700' : (status.isOpen === false ? 'bg-red-100/50 text-red-600' : 'bg-black/5 text-[var(--ink3)]')}`}>
                     {status.label}
                   </span>
                )}
                {p.tags?.ai_note && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[#AF52DE]/10 text-[#AF52DE] text-[8px] font-black uppercase rounded-md tracking-tighter border border-[#AF52DE]/10">
                    <Sparkles size={8} /> AI
                  </span>
                )}
                {solarLabel && (
                  <span className={`text-[9px] font-black uppercase tracking-widest ${solarColor}`}>
                    {solarLabel}
                  </span>
                )}
              </div>
            </div>
              <div className="flex flex-col gap-0.5 mt-1">
                {p.tags?.address && <span className="text-[10px] text-[var(--ink3)] font-medium truncate max-w-[150px]">{p.tags.address}</span>}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-[var(--amber)]">
                    <MapPin size={10} />
                    <span>{p.dist > 1000 ? `${(p.dist/1000).toFixed(1)}km` : `${Math.round(p.dist)}m`}</span>
                  </div>
                </div>
                {p.tags?.best_window && (
                  <div className="flex items-center gap-1 text-[9px] font-black text-[#FF9500] uppercase mt-0.5">
                    <Sunrise size={10} />
                    <span>Best Sun: {p.tags.best_window}</span>
                  </div>
                )}
                {liveSignals.find(s => s.place_id === p.id.toString()) && (
                   <div className="flex items-center gap-1 text-[9px] font-bold text-amber-600 animate-pulse mt-0.5">
                     <Zap size={10} />
                     <span>LIVE: Someone signaled sun here!</span>
                   </div>
                )}
              </div>
            </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={(e) => { e.stopPropagation(); navigateToMaps(p.lat, p.lon, p.name); }}
              className="p-2 rounded-xl bg-[#007AFF]/5 text-[#007AFF] hover:bg-[#007AFF]/10 transition-all border border-[#007AFF]/10"
              title={lang === 'en' ? "Open in Google Maps" : "Ouvrir dans Google Maps"}
            >
              <Navigation size={14} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); submitSignal(p.id.toString(), "It's sunny!"); }}
              className="p-2 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all border border-amber-100"
              title={lang === 'en' ? "Signal as sunny" : "Signaler comme ensoleillé"}
            >
              <Sun size={14} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); toggleFavorite(p); }}
              className={`p-2 rounded-xl transition-all ${isFav ? 'bg-[var(--amber)] text-white' : 'bg-black/5 text-[var(--ink3)]'}`}
            >
              <Star size={14} fill={isFav ? "currentColor" : "none"} />
            </button>
            <div className="text-right">
              <div className="text-2xl font-black text-[var(--amber)]">{isNight ? '🌙' : `${score}%`}</div>
              <div className="text-[8px] font-black text-[var(--ink3)] uppercase tracking-tighter">SUNSCORE</div>
            </div>
          </div>
        </div>
        {showExpert && p.expertTip && (
          <div className="px-4 py-3 bg-[var(--cream2)]/30 rounded-xl border border-[var(--border)] relative overflow-hidden group">
            {p.tags?.ai_note && <div className="absolute top-0 right-0 w-20 h-20 bg-[#AF52DE]/5 blur-2xl -mr-10 -mt-10" />}
            <p className="text-[11px] text-[var(--ink2)] font-medium leading-relaxed italic relative z-10">"{p.expertTip}"</p>
            {p.condition && <div className="text-[8px] font-black text-[#007AFF] uppercase mt-2 tracking-tighter opacity-80">{p.condition}</div>}
          </div>
        )}
      </motion.div>
    );
  };

  const featureFilters = [
    { id: 'cafe', icon: Coffee, lab: lang === 'en' ? 'Cafes' : 'Cafés' },
    { id: 'park', icon: Trees, lab: lang === 'en' ? 'Parks' : 'Parcs' },
    { id: 'bar', icon: Beer, lab: lang === 'en' ? 'Bars' : 'Bars' }
  ];

  const CompactControlButton = ({
    icon: Icon,
    label,
    ariaLabel,
    active,
    onClick
  }: {
    icon: React.ElementType;
    label: string;
    ariaLabel: string;
    active?: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={`h-10 px-3 rounded-2xl border shadow-xl backdrop-blur-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shrink-0 ${
        active
          ? 'bg-[var(--ink)] text-white border-transparent'
          : 'bg-white/90 text-[var(--ink2)] border-[var(--border)] hover:bg-white'
      }`}
    >
      <Icon size={15} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  const FeatureFilterButton = ({ f, compact = false }: { f: typeof featureFilters[number]; compact?: boolean }) => (
    <button
      key={f.id}
      type="button"
      aria-label={`${filters.has(f.id) ? 'Disable' : 'Enable'} ${f.lab} filter`}
      onClick={() => toggleFilter(f.id as any)}
      className={`flex items-center gap-2 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shrink-0 ${
        compact ? 'px-3 py-2' : 'px-4 py-2'
      } ${
        filters.has(f.id)
          ? 'bg-[var(--ink)] text-white shadow-xl'
          : 'bg-black/[0.03] text-[var(--ink3)] hover:bg-black/[0.06]'
      }`}
    >
      <f.icon className="w-3 h-3" />
      <span>{f.lab}</span>
    </button>
  );

  const exitCompactControls = () => {
    setIsMapCompactMode(false);
    setTimeout(() => mapRef.current?.invalidateSize(), 240);
  };

  const showExpandedControls = !isMapCompactMode;

  return (
    <div className={`relative h-screen w-full overflow-hidden bg-[var(--cream)] ${isMapCompactMode ? 'map-compact-mode' : ''}`}>

      {/* 1. LAYER: FULL-SCREEN MAP */}
      <div ref={mapSectionRef} className="absolute inset-0 z-0">
        <div id="map-container" ref={containerRef} className="h-full w-full" />
      </div>

      {/* 2. LAYER: TOP BRANDING & SEARCH OVERLAY */}
      <div className="absolute top-0 inset-x-0 z-[1000] pointer-events-none p-3 sm:p-4 md:p-6 flex flex-col gap-3 md:gap-4 max-h-[calc(100dvh-6rem)] overflow-visible">
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`w-full flex items-center justify-between pointer-events-auto transition-all duration-300 ${
            isMapCompactMode
              ? 'max-w-full sm:max-w-xl md:max-w-sm glass rounded-[1.5rem] px-3 py-2 shadow-2xl'
              : ''
          }`}
        >
          <div className="flex flex-col">
            <h1 className={`${isMapCompactMode ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'} font-black text-[var(--ink)] tracking-tighter leading-none transition-all duration-300`}>
              Sun Kind{!isMapCompactMode && <span className="text-[var(--amber)]"> — Find the Sun</span>}
            </h1>
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.14em] sm:tracking-[0.2em] text-[var(--ink3)] mt-1 truncate max-w-[64vw] sm:max-w-none">
              {formatDateHeader(now)}
            </span>
          </div>
          
          <div className={`${isMapCompactMode ? 'hidden sm:flex' : 'flex'} items-center gap-2 sm:gap-3`}>
             <button 
               onClick={() => setLang(lang === 'en' ? 'fr' : 'en')}
               aria-label={lang === 'en' ? 'Switch language to French' : 'Passer la langue en anglais'}
               className="w-10 h-10 rounded-2xl bg-white/80 backdrop-blur-xl border border-[var(--border)] shadow-xl flex items-center justify-center text-[var(--ink2)] btn-apple"
             >
               <Languages size={18} />
             </button>
             {user ? (
               <button onClick={logout} className="h-10 px-4 rounded-2xl bg-white/80 backdrop-blur-xl border border-[var(--border)] shadow-xl flex items-center gap-2 text-[10px] font-black uppercase text-[var(--ink2)] btn-apple">
                  <div className="w-5 h-5 rounded-full bg-[var(--amber)] text-white flex items-center justify-center">
                    {user.email?.[0].toUpperCase()}
                  </div>
                  {lang === 'en' ? 'Logout' : 'Quitter'}
               </button>
             ) : (
               <button onClick={handleLogin} className="h-10 px-6 rounded-2xl bg-[var(--ink)] text-white shadow-xl flex items-center gap-2 text-[10px] font-black uppercase btn-apple">
                  {lang === 'en' ? 'Login' : 'Connexion'}
               </button>
             )}
          </div>
        </motion.div>

        <AnimatePresence>
          {isMapCompactMode && (
            <motion.div
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.22 }}
              className="w-full pointer-events-auto overflow-x-auto no-scrollbar"
            >
              <div className="flex items-center gap-2 pr-2 max-w-full">
                <CompactControlButton
                  icon={Search}
                  label={lang === 'en' ? 'Search' : 'Recherche'}
                  ariaLabel={lang === 'en' ? 'Expand search controls' : 'Afficher les contrôles de recherche'}
                  onClick={exitCompactControls}
                />
                <CompactControlButton
                  icon={Cloud}
                  label={lang === 'en' ? 'Weather' : 'Météo'}
                  ariaLabel={lang === 'en' ? 'Expand weather controls' : 'Afficher les contrôles météo'}
                  onClick={() => {
                    setIsWeatherExpanded(true);
                    exitCompactControls();
                  }}
                />
                <CompactControlButton
                  icon={Clock}
                  label={formatLocalTime(now)}
                  ariaLabel={lang === 'en' ? 'Expand time controls' : 'Afficher les contrôles horaires'}
                  active={simHour !== null}
                  onClick={exitCompactControls}
                />
                {featureFilters.map(f => (
                  <CompactControlButton
                    key={f.id}
                    icon={f.icon}
                    label={f.lab}
                    ariaLabel={`${filters.has(f.id) ? 'Disable' : 'Enable'} ${f.lab} filter`}
                    active={filters.has(f.id)}
                    onClick={() => toggleFilter(f.id)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* WEATHER FEATURES - REDESIGNED */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={showExpandedControls ? { y: 0, opacity: 1, height: 'auto' } : { y: -28, opacity: 0, height: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full pointer-events-auto overflow-hidden"
          aria-hidden={!showExpandedControls}
        >
          <div 
            onClick={() => setIsWeatherExpanded(!isWeatherExpanded)}
            className={`card-apple p-1 pr-6 flex items-center gap-6 overflow-hidden max-w-2xl cursor-pointer transition-all duration-500 ${isWeatherExpanded ? 'bg-white shadow-2xl' : ''}`}
          >
             <div className={`h-14 px-5 flex flex-col justify-center shrink-0 transition-colors ${
               isWeatherExpanded 
                 ? 'bg-[var(--amber)] text-white' 
                 : ((weather?.cloud ?? 100) < 40 ? 'bg-amber-500 text-white' : 'bg-[var(--ink)] text-white')
             }`}>
                <span className={`text-[8px] font-black uppercase tracking-widest leading-none ${isWeatherExpanded ? 'text-white/80' : 'text-white/60'}`}>{T[lang].weather}</span>
                <span className="text-sm font-black mt-1 leading-none">{weather?.temp ?? '--'}°C</span>
             </div>
             
             {!isWeatherExpanded ? (
               <div className="flex-1 flex items-center justify-around gap-4 overflow-x-auto no-scrollbar animate-in fade-in">
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] font-bold text-[var(--ink3)] uppercase tracking-tighter">{T[lang].clouds}</span>
                    <span className="text-xs font-black text-[var(--amber)]">{weather?.cloud ?? 0}%</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] font-bold text-[var(--ink3)] uppercase tracking-tighter">{T[lang].uv}</span>
                    <span className="text-xs font-black text-[var(--gold)]">{(sunPos.altitude * 5).toFixed(1)}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] font-bold text-[var(--ink3)] uppercase tracking-tighter">{lang === 'en' ? 'Alt' : 'Élév.'}</span>
                    <span className="text-xs font-black text-[var(--ink2)]">{(sunPos.altitude * (180/Math.PI)).toFixed(0)}°</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] font-bold text-[var(--ink3)] uppercase tracking-tighter">Status</span>
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">{weather?.condition || 'Clear'}</span>
                  </div>
               </div>
             ) : (
               <div className="flex-1 flex flex-col gap-3 pb-1 animate-in slide-in-from-left-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-[var(--ink)] uppercase tracking-widest">{lang === 'en' ? 'Weather Plan' : 'Planning Météo'}</span>
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                        {[0, 1, 2, 3].map(day => {
                          const date = new Date();
                          date.setDate(date.getDate() + day);
                          const dayLabel = day === 0 ? (lang === 'en' ? 'Now' : 'Actuel') : 
                                           day === 1 ? (lang === 'en' ? 'Tomorrow' : 'Demain') : 
                                           date.toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', { weekday: 'short' });
                          
                          return (
                            <button 
                              key={day} 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                if (day === 0) setSimHour(null);
                                else setSimHour(12);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap ${day === 0 && simHour === null ? 'bg-[var(--amber)] text-white shadow-lg shadow-amber-500/20' : 'bg-black/5 text-[var(--ink3)] hover:bg-black/10'}`} 
                            >
                              {dayLabel}
                            </button>
                          );
                        })}
                    </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Cloud size={12} className="text-blue-400" />
                      <span className="text-[10px] font-bold text-[var(--ink3)]">{weather?.cloud}% {T[lang].clouds}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pr-4">
                    {[6, 9, 12, 15, 18, 21].map(h => {
                      const isSunny = h >= 10 && h <= 17 && (weather?.cloud ?? 100) < 40;
                      return (
                        <div key={h} className="flex flex-col items-center gap-1 group">
                          <span className="text-[8px] font-bold text-[var(--ink3)]">{h}h</span>
                          {isSunny ? (
                            <Sun size={14} className="text-amber-500 transition-transform group-hover:scale-125" />
                          ) : (
                            <Cloud size={14} className="text-blue-300 transition-transform group-hover:scale-125" />
                          )}
                          <span className="text-[8px] font-black">{weather?.temp! + (h === 12 || h === 15 ? 2 : (h > 18 ? -3 : 0))}°</span>
                        </div>
                      );
                    })}
                  </div>
               </div>
             )}
          </div>
        </motion.div>

        {/* SEARCH BAR */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={showExpandedControls ? { y: 0, opacity: 1, height: 'auto' } : { y: -28, opacity: 0, height: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-2xl pointer-events-auto overflow-hidden"
          aria-hidden={!showExpandedControls}
        >
          <div className="glass rounded-[2rem] p-2 flex flex-col gap-2 shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-1">
              <Search className="text-[var(--ink3)] w-5 h-5" />
              <input
                type="text"
                placeholder={T[lang].searchPlaceholder}
                className="flex-1 bg-transparent border-none focus:outline-none text-[16px] py-1 placeholder:text-[var(--ink3)] font-medium text-[var(--ink)]"
                value={searchInput}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && executeSearch()}
              />
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden z-[2000] pointer-events-auto max-h-[300px] overflow-y-auto">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectSuggestion(s)}
                      className="w-full px-6 py-4 flex items-center gap-4 hover:bg-[var(--amber)]/5 transition-colors border-b border-[var(--border)] last:border-none text-left"
                    >
                      <MapPin size={16} className="text-[var(--amber)] shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-[var(--ink)]">{s.properties.name || s.properties.city}</span>
                        <span className="text-[9px] font-bold text-[var(--ink3)] uppercase tracking-widest">
                          {s.properties.city ? `${s.properties.city}, ` : ''}{s.properties.country || 'Unknown'}
                          {s.properties.isLocal && ` · ${lang === 'en' ? 'LOCAL' : 'LOCAL'}`}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {loading && <Loader2 className="animate-spin w-5 h-5 text-[var(--amber)]" />}
              <button 
                onClick={handleGps}
                disabled={isSearchingGps}
                className={`p-2 border border-[var(--border)] rounded-xl text-[var(--amber)] transition-all ${isSearchingGps ? 'scale-90 opacity-50 ring-2 ring-[var(--amber)]/20' : 'hover:bg-[var(--amber)]/5'}`}
                title={lang === 'en' ? 'Get current location' : 'Ma position'}
              >
                <motion.div 
                  animate={isSearchingGps ? { rotate: 360 } : { rotate: 0 }} 
                  transition={isSearchingGps ? { repeat: Infinity, duration: 2, ease: "linear" } : { duration: 0.1 }}
                >
                  <Navigation className="w-5 h-5" />
                </motion.div>
              </button>
              <button 
                onClick={executeSearch}
                className="ml-1 px-4 py-2 bg-[var(--amber)] text-white text-[10px] font-black uppercase rounded-2xl shadow-lg shadow-[var(--amber)]/20 active:scale-95 transition-all"
              >
                {T[lang].go}
              </button>
            </div>
            
            <div className="flex gap-1.5 px-3 pb-2 border-t border-[var(--border)] pt-2 overflow-x-auto no-scrollbar">
              {featureFilters.map(f => <FeatureFilterButton key={f.id} f={f} />)}
            </div>
          </div>
        </motion.div>

        {/* TIME SLIDER */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={showExpandedControls ? { y: 0, opacity: 1, height: 'auto' } : { y: -28, opacity: 0, height: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-sm pointer-events-auto overflow-hidden"
          aria-hidden={!showExpandedControls}
        >
          <div className="card-apple p-1 pr-5 bg-white/90 backdrop-blur-2xl flex items-center gap-4">
             <div className="px-5 py-3.5 bg-[var(--ink)] rounded-[24px] text-white font-mono text-[10px] font-black tabular-nums transition-colors">
               {formatLocalTime(now)}
             </div>
             <div className="flex-1 flex items-center gap-3">
               <Clock size={14} className="text-[var(--ink3)]" />
               <input 
                 type="range" min="6" max="21" step="0.25"
                 value={simHour ?? getLocalTimeParts(currentTime).h + getLocalTimeParts(currentTime).m/60}
                 onChange={(e) => setSimHour(parseFloat(e.target.value))}
                 className="flex-1 h-3 bg-black/5 appearance-none accent-[var(--amber)] cursor-pointer rounded-full"
               />
               <button 
                 onClick={() => setSimHour(null)} 
                 className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${simHour === null ? 'bg-[var(--amber)] text-white' : 'text-[var(--amber)] hover:bg-[var(--amber)]/5'}`}
               >
                 Now
               </button>
             </div>
          </div>
        </motion.div>
      </div>

      {/* 3. LAYER: FLOATING BOTTOM SHEET (iOS STYLE) */}
      <motion.div 
        drag="y"
        dragConstraints={{ top: 80, bottom: 950 }}
        dragElastic={0.1}
        initial={{ y: '90%' }}
        animate={{ 
          y: isMapCompactMode && activeTab === 'map' && !selectedPlace
            ? '76%'
            : (selectedPlace || activeTab !== 'map' || processedPlaces.length > 0) 
            ? (selectedPlace ? '15%' : '45%') 
            : '82%' 
        }}
        transition={{ type: 'spring', damping: 30, stiffness: 150 }}
        className="absolute inset-x-0 bottom-0 z-[1001] pointer-events-none pt-[100px] sm:pt-[120px]"
      >
        <div className="h-screen w-full max-w-2xl mx-auto glass rounded-t-[3rem] shadow-[0_-20px_60px_rgba(0,0,0,0.25)] pointer-events-auto flex flex-col border-t-2 border-white/60">
          <div className="w-full flex flex-col items-center p-5 shrink-0 cursor-grab active:cursor-grabbing">
            <div className="w-16 h-1.5 bg-black/[0.15] rounded-full mb-4 shadow-inner" />
            
            {/* Sort Toggle in Header for quick access */}
            {(activeTab === 'map' || activeTab === 'list') && !selectedPlace && processedPlaces.length > 0 && (
              <div className="flex bg-black/[0.03] rounded-full p-1 border border-black/5">
                <button 
                  onClick={() => setSortMode('sun')}
                  className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${sortMode === 'sun' ? 'bg-[var(--ink)] text-white shadow-md' : 'text-[var(--ink3)]'}`}
                >
                  {T[lang].sunScore}
                </button>
                <button 
                  onClick={() => setSortMode('dist')}
                  className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${sortMode === 'dist' ? 'bg-[var(--ink)] text-white shadow-md' : 'text-[var(--ink3)]'}`}
                >
                  {T[lang].sortByDist}
                </button>
              </div>
            )}
          </div>

          <div
            ref={resultsScrollRef}
            onScroll={(event) => {
              if ((activeTab === 'map' || activeTab === 'list') && !selectedPlace) {
                setIsMapCompactMode(event.currentTarget.scrollTop > 24);
              }
            }}
            className="flex-1 overflow-y-auto px-4 sm:px-6 pb-40 no-scrollbar ios-scroll pointer-events-auto touch-pan-y"
          >
            {activeTab === 'map' ? (
              <div className="space-y-10 py-2 animate-in fade-in slide-in-from-bottom-5">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-[var(--amber)] uppercase tracking-[0.3em]">{T[lang].nearbyResults}</span>
                    <h2 className="text-3xl font-black tracking-tight text-[var(--ink)]">
                      {lang === 'en' ? 'Solar Discovery' : 'Découverte Solaire'}
                    </h2>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setLang(lang === 'en' ? 'fr' : 'en')}
                      className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-[10px] font-bold uppercase"
                    >
                      {lang === 'en' ? 'FR' : 'EN'}
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-1">
                  {processedPlaces.length > 0 ? (
                    processedPlaces.map((p, i) => renderPlaceCard(p, i, false))
                  ) : !loading && (
                    <div className="py-20 text-center flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-[var(--amber)]/5 rounded-full flex items-center justify-center">
                        <Search className="w-8 h-8 text-[var(--amber)]/40" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--ink)]">
                          {lang === 'en' ? 'Where to go?' : 'Où voulez-vous aller ?'}
                        </span>
                        <span className="text-[9px] font-medium text-[var(--ink3)] uppercase tracking-widest max-w-[200px]">
                          {lang === 'en' ? 'Search a city or use GPS to find the sunniest spots.' : 'Recherchez une ville ou utilisez le GPS pour trouver du soleil.'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : activeTab === 'list' ? (
              <div className="py-2 animate-in fade-in slide-in-from-bottom-5">
                {selectedPlace ? (
                  <div className="mb-10 border-b border-[var(--border)] pb-8">
                    <button onClick={() => setSelectedPlace(null)} className="flex items-center gap-1 text-[var(--amber)] font-black uppercase tracking-widest mb-6 text-[10px]">
                      <ChevronLeft className="w-4 h-4" />
                      {lang === 'en' ? 'Back to Results' : 'Retour aux résultats'}
                    </button>
                    
                    <h2 className="text-3xl font-black tracking-tight text-[var(--ink)] mb-1 leading-none">{selectedPlace.name}</h2>
                    <p className="text-xs font-bold text-[var(--ink3)] uppercase tracking-widest mb-4">
                      {selectedPlace.type.toUpperCase()} · {selectedPlace.dist > 1000 ? `${(selectedPlace.dist/1000).toFixed(1)}km` : `${Math.round(selectedPlace.dist)}m`}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {selectedPlace.tags?.address && (
                        <span className="px-3 py-1.5 rounded-full bg-black/5 text-[10px] font-bold text-[var(--ink2)]">{selectedPlace.tags.address}</span>
                      )}
                      {selectedPlace.tags?.opening_hours && (
                        <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-700">{selectedPlace.tags.opening_hours}</span>
                      )}
                      {selectedPlace.tags?.operator && (
                        <span className="px-3 py-1.5 rounded-full bg-blue-50 text-[10px] font-bold text-blue-700">{selectedPlace.tags.operator}</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                      <div className="p-4 bg-amber-50 rounded-3xl border border-amber-100 flex flex-col items-center justify-center text-center">
                        <Sun className={`w-5 h-5 mb-1 ${(selectedPlace.directSun?.status || buildDirectSunStatus(selectedPlace).status) === 'now' ? 'text-amber-500 animate-pulse' : 'text-amber-300'}`} />
                        <span className="text-[11px] font-black text-amber-600 line-height-none leading-tight">{(selectedPlace.directSun || buildDirectSunStatus(selectedPlace)).label}</span>
                        <span className="text-[8px] font-black text-amber-400 uppercase tracking-tighter mt-1">
                          {(selectedPlace.directSun || buildDirectSunStatus(selectedPlace)).score ?? '--'} Sunscore
                        </span>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-3xl border border-blue-100 flex flex-col items-center justify-center text-center">
                        <Navigation className="text-blue-500 w-5 h-5 mb-1" />
                        <span className="text-[14px] font-black text-blue-600 leading-none">{selectedPlace.dist > 1000 ? `${(selectedPlace.dist/1000).toFixed(1)}km` : `${Math.round(selectedPlace.dist)}m`}</span>
                        <span className="text-[8px] font-black text-blue-400 uppercase tracking-tighter mt-1">Dist.</span>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-3xl border border-purple-100 flex flex-col items-center justify-center text-center col-span-2 md:col-span-1">
                        <Sparkles className="text-purple-500 w-5 h-5 mb-1" />
                        <span className="text-[12px] font-black text-purple-600 leading-none h-4 flex items-center justify-center uppercase truncate w-full">{selectedPlace.type}</span>
                        <span className="text-[8px] font-black text-purple-400 uppercase tracking-tighter mt-1">Zone</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                      <div className="p-6 bg-[var(--cream2)]/30 rounded-[30px] border border-[var(--border)] flex flex-col h-full">
                        <div className="text-[9px] font-black text-[var(--ink3)] uppercase tracking-widest mb-2">Solar Analytics</div>
                        <p className="text-xs font-medium text-[var(--ink2)] leading-relaxed italic flex-1">"{selectedPlace.expertTip || (selectedPlace.directSun || buildDirectSunStatus(selectedPlace)).reason}"</p>
                        {(selectedPlace.directSun || buildDirectSunStatus(selectedPlace)).status === 'none' && (
                          <span className="mt-3 text-[9px] font-bold text-[var(--ink3)] uppercase tracking-widest">
                            No direct sun expected soon
                          </span>
                        )}
                        {selectedPlace.confidence && (
                          <span className="mt-3 text-[9px] font-black text-[var(--ink3)] uppercase tracking-widest">
                            Spot confidence: {selectedPlace.confidence}
                          </span>
                        )}
                        {selectedPlace.tags?.website && (
                          <a
                            href={selectedPlace.tags.website}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--amber)]"
                          >
                            Website <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => navigateToMaps(selectedPlace.lat, selectedPlace.lon, selectedPlace.name)}
                      className="p-6 bg-[var(--ink)] text-white rounded-[30px] flex flex-col justify-center gap-1 btn-apple w-full h-full"
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--amber)]">Directions</span>
                      <span className="text-sm font-bold flex items-center gap-2">Open in Maps <ExternalLink size={14} /></span>
                    </button>
                  </div>
                </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => submitSignal(selectedPlace.id.toString(), 'Too much shade')}
                        className="flex-1 py-4 bg-black/[0.04] hover:bg-black/[0.06] rounded-2xl font-black text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                      >
                        <Cloud size={14} /> Too Shade
                      </button>
                      <button 
                        onClick={() => submitSignal(selectedPlace.id.toString(), 'Perfect sun')}
                        className="flex-1 py-4 bg-[var(--amber)] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-[var(--amber)]/20 flex items-center justify-center gap-2"
                      >
                        <Sun size={14} fill="currentColor" /> Perfect Sun
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 mb-4">
                    <div className="flex flex-col mb-4">
                      <span className="text-[9px] font-black text-[var(--amber)] uppercase tracking-[0.3em]">{processedPlaces.length} SPOTS FOUND</span>
                      <h2 className="text-3xl font-black tracking-tight text-[var(--ink)]">{T[lang].results}</h2>
                    </div>
                  </div>
                )}
                
                {/* Full list always clickable or scrollable below */}
                <div className="space-y-4">
                   {processedPlaces.length > 0 ? (
                     processedPlaces.map((p, i) => renderPlaceCard(p, i, true))
                   ) : !loading && !selectedPlace && (
                     <div className="py-20 text-center flex flex-col items-center gap-4 opacity-30">
                       <SunMedium className="w-12 h-12" />
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] max-w-[250px]">
                         {lang === 'en' ? 'No sunny terraces nearby right now. Check back later ☁️' : 'Aucune terrasse ensoleillée à proximité pour le moment. Revenez plus tard ☁️'}
                       </span>
                     </div>
                   )}
                </div>
              </div>
            ) : activeTab === 'top10' ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 mt-4">
                 <div className="flex flex-col">
                  <span className="text-[9px] font-black text-[var(--amber)] uppercase tracking-[0.3em]">{T[lang].ranking}</span>
                  <h2 className="text-3xl font-black tracking-tight text-[var(--ink)]">{T[lang].top10Title}</h2>
                 </div>
                 <div className="grid grid-cols-1 gap-6 pb-20">
                    {top10.length > 0 ? (
                      top10.map((p, i) => (
                        <div 
                          key={p.id} 
                          onClick={() => {
                          openPlaceDetails(p);
                        }} 
                        className="card-apple overflow-hidden group btn-apple"
                      >
                           <div className="p-6 flex items-center justify-between">
                              <div className="flex items-center gap-5">
                                 <div className="text-4xl font-black text-[var(--amber)] opacity-20 italic">#{i+1}</div>
                                 <div className="flex flex-col">
                                    <h3 className="text-xl font-black text-[var(--ink)] mb-0.5">{p.name}</h3>
                                    <span className="text-[10px] font-bold text-[var(--ink3)] uppercase tracking-widest">{p.dist > 1000 ? `${(p.dist/1000).toFixed(1)}km` : `${Math.round(p.dist)}m`}</span>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <div className="text-3xl font-black text-[var(--amber)]">{p.sunScore ?? '--'}{typeof p.sunScore === 'number' ? '%' : ''}</div>
                              </div>
                           </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                        <Trophy size={48} className="text-[var(--ink3)]" />
                        <span className="text-[10px] font-black uppercase tracking-widest">No ranking available for this area</span>
                      </div>
                    )}
                 </div>
              </div>
            ) : (
               <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 mt-4">
                 <div className="flex flex-col">
                  <span className="text-[9px] font-black text-[var(--amber)] uppercase tracking-[0.3em]">{T[lang].collection}</span>
                  <h2 className="text-3xl font-black tracking-tight text-[var(--ink)]">{T[lang].savedPoints}</h2>
                 </div>
                 {favorites.length === 0 ? (
                   <div className="py-32 text-center opacity-30 flex flex-col items-center gap-4">
                      <Star size={48} className="text-[var(--ink3)]" />
                      <span className="text-[10px] font-black uppercase tracking-widest">No saved spots yet</span>
                   </div>
                 ) : (
                   <div className="space-y-1">
                     {favorites.map((p, i) => renderPlaceCard(p, i, false))}
                   </div>
                 )}
               </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* 5. LAYER: NAVIGATION TAB BAR (SUNKIND DESIGN) */}
      <nav className="fixed bottom-0 inset-x-0 h-[calc(5rem+env(safe-area-inset-bottom))] bg-white/95 backdrop-blur-3xl border-t border-[var(--border)] z-[5000] px-8 pb-[env(safe-area-inset-bottom)] flex items-center justify-between">
         {[
           { id: 'map', label: T[lang].discover, icon: Navigation },
           { id: 'list', label: T[lang].results, icon: List },
           { id: 'top10', label: T[lang].ranking, icon: Trophy },
           { id: 'favorites', label: T[lang].saved, icon: Star }
         ].map(item => (
           <button 
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`flex flex-col items-center gap-1.5 transition-all active:scale-90 flex-1 ${activeTab === item.id ? 'text-[var(--amber)]' : 'text-[var(--ink3)]'}`}
           >
             <div className={`p-1.5 rounded-xl transition-all ${activeTab === item.id ? 'bg-[var(--amber)]/10' : ''}`}>
               <item.icon size={20} className={activeTab === item.id ? 'stroke-[2.5]' : 'stroke-2'} />
             </div>
             <span className="text-[8px] font-black uppercase tracking-[0.1em]">{item.label}</span>
             {activeTab === item.id && (
               <motion.div layoutId="nav-pill" className="absolute -bottom-1 w-12 h-1.5 bg-[var(--amber)] rounded-t-full" />
             )}
           </button>
         ))}
      </nav>

      <AnimatePresence>
        {simHour !== null && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[4000]"
          >
             <div className="bg-black/90 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 text-[10px] font-bold whitespace-nowrap backdrop-blur-xl">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                {T[lang].simMode}: {formatLocalTime(now)}
             </div>
          </motion.div>
        )}
        {showPaywall && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-2xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[var(--cream)] rounded-[50px] p-12 max-w-sm w-full shadow-2xl relative overflow-hidden border border-white/20"
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-[var(--amber)]/20 blur-3xl rounded-full" />
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-[var(--amber)] rounded-[30px] flex items-center justify-center text-white shadow-xl shadow-[var(--amber)]/30 mb-8">
                  <Trophy size={40} />
                </div>
                <h2 className="text-4xl font-black text-[var(--ink)] tracking-tighter leading-tight mb-4">{T[lang].paywallTitle}</h2>
                <p className="text-xs font-medium text-[var(--ink3)] mb-10 leading-relaxed uppercase tracking-widest">{T[lang].paywallDesc}</p>
                <button 
                  onClick={() => setShowPaywall(false)} 
                  className="w-full py-5 bg-[var(--ink)] text-white rounded-3xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl active:scale-95 transition-all mb-4"
                >
                  {T[lang].upgrade}
                </button>
                <button 
                  onClick={() => setShowPaywall(false)}
                  className="text-[9px] font-black uppercase text-[var(--ink3)] tracking-widest hover:text-[var(--ink)] transition-colors"
                >
                  {T[lang].maybeLater}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
