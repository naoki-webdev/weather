import { useCallback } from "react";

import type { City, CitySearchResult, CitySortKey, SortDirection, WeatherPreference } from "../types/weather";
import { useCitiesList } from "./useCitiesList";
import { useCityComparison } from "./useCityComparison";
import { useCityDetail } from "./useCityDetail";
import { useTravelPlan } from "./useTravelPlan";
import { useWeatherPreference } from "./useWeatherPreference";

export function useWeatherDashboard() {
  const citiesList = useCitiesList();
  const weatherPreference = useWeatherPreference(citiesList.loadCities);
  const cityComparison = useCityComparison(weatherPreference.preference?.updated_at);
  const onCityRemoved = useCallback((cityId: number) => {
    cityComparison.removeCity(cityId);
  }, [cityComparison.removeCity]);
  const onCityUpdated = useCallback((updated: City) => {
    citiesList.replaceCity(updated);
    cityComparison.replaceCity(updated);
  }, [citiesList.replaceCity, cityComparison.replaceCity]);
  const cityDetail = useCityDetail({
    refreshCities: citiesList.loadCities,
    onCityRemoved,
    onCityUpdated,
  });
  const travel = useTravelPlan(cityComparison.selectedIds);

  const toggleFavorite = useCallback(async (cityId: number, favorite: boolean) => {
    const updated = await citiesList.toggleFavorite(cityId, favorite);
    if (!updated) return;
    citiesList.replaceCity(updated);
    cityDetail.mergeCity(updated);
    cityComparison.replaceCity(updated);
  }, [citiesList.replaceCity, citiesList.toggleFavorite, cityComparison.replaceCity, cityDetail.mergeCity]);

  return {
    cities: citiesList.cities,
    selectedCity: cityDetail.selectedCity,
    keyword: citiesList.keyword,
    favoritesOnly: citiesList.favoritesOnly,
    sort: citiesList.sort,
    direction: citiesList.direction,
    page: citiesList.page,
    perPage: citiesList.perPage,
    totalCount: citiesList.totalCount,
    summary: citiesList.summary,
    preference: weatherPreference.preference,
    loading: citiesList.loading,
    saving: cityDetail.saving || weatherPreference.saving,
    error: cityDetail.error ?? weatherPreference.error ?? citiesList.error,
    detailOpen: cityDetail.detailOpen,
    searchOpen: cityDetail.searchOpen,
    preferenceOpen: weatherPreference.preferenceOpen,
    selectedIds: cityComparison.selectedIds,
    comparisonCities: cityComparison.comparisonCities,
    comparisonMeta: cityComparison.comparisonMeta,
    comparisonLoading: cityComparison.comparisonLoading,
    comparisonError: cityComparison.comparisonError,
    favoriteSavingId: citiesList.favoriteSavingId,
    travelPlan: travel.travelPlan,
    travelLoading: travel.travelLoading,
    travelError: travel.travelError,
    bestDeparturePlan: travel.bestDeparturePlan,
    bestDepartureLoading: travel.bestDepartureLoading,
    bestDepartureError: travel.bestDepartureError,
    setKeyword: citiesList.setKeyword,
    setFavoritesOnly: citiesList.setFavoritesOnly,
    setSort: (value: CitySortKey, nextDirection: SortDirection) => citiesList.setSort(value, nextDirection),
    setPage: citiesList.setPage,
    setPerPage: citiesList.setPerPage,
    toggleCitySelection: cityComparison.toggleCitySelection,
    removeComparisonCity: cityComparison.removeComparisonCity,
    clearComparison: cityComparison.clearComparison,
    planTravel: travel.planTravel,
    planBestDeparture: travel.planBestDeparture,
    toggleFavorite,
    clearFilters: citiesList.clearFilters,
    openCity: cityDetail.openCity,
    addCity: (city: CitySearchResult) => cityDetail.addCity(city),
    refreshCity: cityDetail.refreshCity,
    removeCity: cityDetail.removeCity,
    savePreference: (values: Partial<WeatherPreference>) => weatherPreference.savePreference(values),
    exportCsv: citiesList.exportCsv,
    closeDetail: cityDetail.closeDetail,
    openSearch: cityDetail.openSearch,
    closeSearch: cityDetail.closeSearch,
    openPreference: weatherPreference.openPreference,
    closePreference: weatherPreference.closePreference,
  };
}
