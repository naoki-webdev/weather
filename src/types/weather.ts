export type WeatherScoreBreakdown = {
  temperature: number;
  precipitation: number;
  humidity: number;
  wind: number;
  air_quality: number;
};

export type WeatherCurrent = {
  temperature: number | null;
  humidity: number | null;
  precipitation: number | null;
  wind_speed: number | null;
  weather_code: number | null;
  us_aqi: number | null;
  pm2_5: number | null;
  pm10: number | null;
};

export type WeatherDaily = {
  time?: string[];
  weather_code?: number[];
  temperature_2m_max?: number[];
  temperature_2m_min?: number[];
  precipitation_sum?: number[];
  precipitation_probability_max?: number[];
};

export type WeatherSnapshot = {
  fetched_at: string;
  current: WeatherCurrent;
  daily: WeatherDaily;
};

export type WeatherHistory = {
  period_days: number;
  from: string;
  to: string;
  snapshot_count: number;
  average_score: number | null;
  current_score: number | null;
  score_delta: number | null;
  averages: {
    temperature: number | null;
    humidity: number | null;
    precipitation: number | null;
    wind_speed: number | null;
    us_aqi: number | null;
  };
};

export type City = {
  id: number;
  name: string;
  country: string;
  country_code: string;
  admin1: string;
  latitude: number;
  longitude: number;
  timezone: string;
  external_id: string;
  source_name: string;
  favorite: boolean;
  score: number;
  score_breakdown: WeatherScoreBreakdown;
  score_weights: WeatherScoreBreakdown;
  score_insight: {
    primary_component: keyof WeatherScoreBreakdown | null;
    primary_weight: number | null;
  };
  weather: WeatherSnapshot | null;
  history?: WeatherHistory | null;
  created_at: string;
  updated_at: string;
};

export type CitySearchResult = Pick<City, "name" | "country" | "country_code" | "admin1" | "latitude" | "longitude" | "timezone" | "external_id" | "source_name">;

export type WeatherPreference = {
  id: number;
  target_temperature: number;
  temperature_weight: number;
  precipitation_weight: number;
  humidity_weight: number;
  wind_weight: number;
  air_quality_weight: number;
  created_at: string;
  updated_at: string;
};

export type CitySortKey = "name" | "score" | "updated_at" | "temperature";
export type SortDirection = "asc" | "desc";

export type CityListParams = {
  keyword?: string;
  favorites_only?: boolean;
  sort?: CitySortKey;
  direction?: SortDirection;
  page?: number;
  per_page?: number;
};

export type CityListResponse = {
  cities: City[];
  meta: {
    page: number;
    per_page: number;
    total_count: number;
    summary: {
      recommended: number;
      average_temperature: number | null;
      refreshed: number;
    };
  };
};

export type CityComparisonResponse = {
  cities: City[];
  meta: {
    count: number;
    leader_id: number | null;
    average_score: number;
    history_period_days: number;
  };
};

export type TravelPlan = {
  from: { id: number; name: string; timezone: string };
  to: { id: number; name: string; timezone: string };
  mode: "driving";
  transfer_count: number;
  departure_at: string;
  arrival_at: string;
  duration_minutes: number;
  distance_km: number;
  arrival_weather: TravelArrivalWeather;
  recommendation: TravelRecommendation;
};

export type TravelArrivalWeather = {
  time: string;
  temperature: number | null;
  precipitation_probability: number | null;
  precipitation: number | null;
  wind_speed: number | null;
  weather_code: number | null;
} | null;

export type TravelRecommendation = {
  code: "clear" | "caution" | "umbrella" | "unknown";
};

export type TravelCandidate = {
  departure_at: string;
  arrival_at: string;
  arrival_weather: TravelArrivalWeather;
  weather_score: number | null;
  recommendation: TravelRecommendation;
};

export type BestDeparturePlan = {
  from: { id: number; name: string; timezone: string };
  to: { id: number; name: string; timezone: string };
  mode: "driving";
  transfer_count: number;
  duration_minutes: number;
  distance_km: number;
  window_start: string;
  window_end: string;
  interval_minutes: number;
  recommended: TravelCandidate | null;
  candidates: TravelCandidate[];
  reason: string;
};
