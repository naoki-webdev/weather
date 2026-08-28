import type { City, CityComparisonResponse, CityListParams, CityListResponse, CitySearchResult, WeatherPreference } from "../types/weather";
import { API_BASE_URL, requestBlob, requestJson, requestVoid } from "./client";

function buildCityQuery(params: CityListParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.keyword) searchParams.set("keyword", params.keyword);
  if (params.favorites_only) searchParams.set("favorites_only", "true");
  if (params.sort) searchParams.set("sort", params.sort);
  if (params.direction) searchParams.set("direction", params.direction);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.per_page) searchParams.set("per_page", String(params.per_page));
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export async function fetchCities(params: CityListParams = {}, signal?: AbortSignal): Promise<CityListResponse> {
  return requestJson<CityListResponse>(`${API_BASE_URL}/api/cities${buildCityQuery(params)}`, { signal });
}

export async function fetchCity(id: number, signal?: AbortSignal): Promise<City> {
  return requestJson<City>(`${API_BASE_URL}/api/cities/${id}`, { signal });
}

export async function compareCities(ids: number[], signal?: AbortSignal): Promise<CityComparisonResponse> {
  const searchParams = new URLSearchParams();
  ids.forEach((id) => searchParams.append("ids[]", String(id)));
  return requestJson<CityComparisonResponse>(`${API_BASE_URL}/api/cities/compare?${searchParams.toString()}`, { signal });
}

export async function searchCities(query: string, signal?: AbortSignal): Promise<CitySearchResult[]> {
  const searchParams = new URLSearchParams({ query });
  const response = await requestJson<{ results: CitySearchResult[] }>(`${API_BASE_URL}/api/cities/search?${searchParams.toString()}`, { signal });
  return response.results;
}

export async function createCity(city: CitySearchResult): Promise<City> {
  return requestJson<City>(`${API_BASE_URL}/api/cities`, { method: "POST", body: JSON.stringify({ city }) });
}

export async function deleteCity(id: number): Promise<void> {
  return requestVoid(`${API_BASE_URL}/api/cities/${id}`, { method: "DELETE" });
}

export async function syncCity(id: number, signal?: AbortSignal): Promise<City> {
  return requestJson<City>(`${API_BASE_URL}/api/cities/${id}/sync`, { method: "POST", signal });
}

export async function updateCityFavorite(id: number, favorite: boolean): Promise<City> {
  return requestJson<City>(`${API_BASE_URL}/api/cities/${id}/favorite`, {
    method: "PATCH",
    body: JSON.stringify({ city: { favorite } }),
  });
}

export async function downloadCitiesCsv(params: CityListParams = {}): Promise<{ blob: Blob; filename: string }> {
  return requestBlob(`${API_BASE_URL}/api/cities/export${buildCityQuery(params)}`);
}

export async function fetchWeatherPreference(signal?: AbortSignal): Promise<WeatherPreference> {
  return requestJson<WeatherPreference>(`${API_BASE_URL}/api/weather_preference`, { signal });
}

export async function updateWeatherPreference(preference: Partial<WeatherPreference>): Promise<WeatherPreference> {
  return requestJson<WeatherPreference>(`${API_BASE_URL}/api/weather_preference`, {
    method: "PATCH",
    body: JSON.stringify({ weather_preference: preference }),
  });
}
