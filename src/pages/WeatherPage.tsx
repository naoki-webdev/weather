import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { useAuth } from "../auth/AuthContext";
import CityDetailDrawer from "../components/CityDetailDrawer";
import CityComparisonPanel from "../components/CityComparisonPanel";
import CityFilters from "../components/CityFilters";
import CitySearchDrawer from "../components/CitySearchDrawer";
import CityTable from "../components/CityTable";
import PageLoader from "../components/PageLoader";
import WeatherAppShell from "../components/WeatherAppShell";
import WeatherPreferenceDrawer from "../components/WeatherPreferenceDrawer";
import WeatherSummary from "../components/WeatherSummary";
import { t } from "../i18n";
import { useWeatherDashboard } from "../hooks/useWeatherDashboard";

export default function WeatherPage() {
  const { user, signOut } = useAuth();
  const dashboard = useWeatherDashboard();
  const readOnly = user?.read_only ?? false;

  const handleDelete = () => {
    if (window.confirm(t("weather.detail.delete_confirm"))) void dashboard.removeCity();
  };

  return (
    <WeatherAppShell userName={user?.name} readOnly={readOnly} onSearch={dashboard.openSearch} onPreference={dashboard.openPreference} onSignOut={() => { void signOut(); }}>
      <Container component="main" maxWidth="xl" sx={{ py: { xs: 1.5, md: 2 } }}>
        <Stack spacing={2}>
          <Box component="header" sx={{ pb: 1.25, borderBottom: "1px solid rgba(9,30,66,0.12)" }}><Typography variant="h4" sx={{ fontSize: { xs: "1.5rem", md: "1.85rem" }, fontWeight: 800 }}>{t("weather.page_heading")}</Typography></Box>
          {readOnly && <Alert severity="info" variant="outlined" sx={{ py: 0.25, borderRadius: 2 }}>{t("weather.read_only_notice")}</Alert>}
          <WeatherSummary total={dashboard.totalCount} recommended={dashboard.summary.recommended} averageTemperature={dashboard.summary.average_temperature} refreshed={dashboard.summary.refreshed} />
          <CityComparisonPanel selectedCount={dashboard.selectedIds.length} cities={dashboard.comparisonCities} leaderId={dashboard.comparisonMeta?.leader_id ?? null} averageScore={dashboard.comparisonMeta?.average_score ?? null} historyPeriodDays={dashboard.comparisonMeta?.history_period_days ?? 30} loading={dashboard.comparisonLoading} error={dashboard.comparisonError} onRemove={dashboard.removeComparisonCity} onClear={dashboard.clearComparison} onPlanTravel={(departureAt) => void dashboard.planTravel(departureAt)} travelPlan={dashboard.travelPlan} travelLoading={dashboard.travelLoading} travelError={dashboard.travelError} bestDeparturePlan={dashboard.bestDeparturePlan} bestDepartureLoading={dashboard.bestDepartureLoading} bestDepartureError={dashboard.bestDepartureError} onPlanBestDeparture={(windowStart, windowEnd) => void dashboard.planBestDeparture(windowStart, windowEnd)} />
          <Box component="section" sx={{ py: 0.5, borderBottom: "1px solid rgba(9,30,66,0.12)" }}>
            <Stack spacing={1.25}><Box><Typography variant="h5" sx={{ mb: 0.25, fontSize: { xs: "1.2rem", md: "1.35rem" } }}>{t("weather.section_title")}</Typography><Typography variant="body2" color="text.secondary">{t("weather.section_description")}</Typography></Box><CityFilters keyword={dashboard.keyword} favoritesOnly={dashboard.favoritesOnly} totalCount={dashboard.totalCount} onKeywordChange={dashboard.setKeyword} onFavoritesOnlyChange={dashboard.setFavoritesOnly} onClear={dashboard.clearFilters} onExport={() => void dashboard.exportCsv()} /></Stack>
          </Box>
          {dashboard.error && <Alert severity="error">{dashboard.error}</Alert>}
          {dashboard.loading ? <PageLoader /> : <CityTable cities={dashboard.cities} page={dashboard.page} perPage={dashboard.perPage} totalCount={dashboard.totalCount} sort={dashboard.sort} direction={dashboard.direction} onSortChange={dashboard.setSort} onPageChange={dashboard.setPage} onPerPageChange={dashboard.setPerPage} onRowClick={(id) => void dashboard.openCity(id)} selectedIds={dashboard.selectedIds} onToggleSelect={dashboard.toggleCitySelection} onToggleFavorite={dashboard.toggleFavorite} favoriteSavingId={dashboard.favoriteSavingId} readOnly={readOnly} />}
        </Stack>
      </Container>
      <CityDetailDrawer open={dashboard.detailOpen} city={dashboard.selectedCity} readOnly={readOnly} saving={dashboard.saving} onClose={dashboard.closeDetail} onSync={() => void dashboard.refreshCity()} onDelete={handleDelete} />
      <CitySearchDrawer open={dashboard.searchOpen} readOnly={readOnly} submitting={dashboard.saving} onClose={dashboard.closeSearch} onAdd={(city) => void dashboard.addCity(city)} />
      <WeatherPreferenceDrawer open={dashboard.preferenceOpen} readOnly={readOnly} saving={dashboard.saving} preference={dashboard.preference} onClose={dashboard.closePreference} onSave={(values) => void dashboard.savePreference(values)} />
    </WeatherAppShell>
  );
}
