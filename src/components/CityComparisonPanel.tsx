import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { t } from "../i18n";
import type { BestDeparturePlan, City, TravelPlan } from "../types/weather";
import ComparisonTable from "./ComparisonTable";
import TravelSection from "./TravelSection";

type CityComparisonPanelProps = {
  selectedCount: number;
  cities: City[];
  leaderId: number | null;
  averageScore: number | null;
  historyPeriodDays: number;
  loading: boolean;
  error: string | null;
  onRemove: (cityId: number) => void;
  onClear: () => void;
  onPlanTravel: (departureAt: string) => void;
  travelPlan: TravelPlan | null;
  travelLoading: boolean;
  travelError: string | null;
  bestDeparturePlan: BestDeparturePlan | null;
  bestDepartureLoading: boolean;
  bestDepartureError: string | null;
  onPlanBestDeparture: (windowStart: string, windowEnd: string) => void;
};

export default function CityComparisonPanel({ selectedCount, cities, leaderId, averageScore, historyPeriodDays, loading, error, onRemove, onClear, onPlanTravel, travelPlan, travelLoading, travelError, bestDeparturePlan, bestDepartureLoading, bestDepartureError, onPlanBestDeparture }: CityComparisonPanelProps) {
  if (selectedCount === 0) return null;

  return <Box component="section" sx={{ borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider", py: { xs: 2, md: 2.5 } }}>
    <Stack spacing={1.75}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }}>
        <div>
          <Typography variant="h6" fontWeight={850}>{t("weather.comparison.title")}</Typography>
          <Typography variant="body2" color="text.secondary">{t("weather.comparison.description", { count: selectedCount })}</Typography>
        </div>
        <Stack direction="row" spacing={1} alignItems="center">
          {averageScore !== null && <Typography variant="body2" color="text.secondary" fontWeight={800}>{t("weather.comparison.average_score", { score: averageScore })}</Typography>}
          <Button size="small" onClick={onClear}>{t("weather.comparison.clear")}</Button>
        </Stack>
      </Stack>
      {selectedCount < 2 && <Alert severity="info" variant="outlined">{t("weather.comparison.select_more")}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      {selectedCount === 2 && cities.length >= 2 && <TravelSection from={cities[0]} to={cities[1]} travelPlan={travelPlan} travelLoading={travelLoading} travelError={travelError} onPlanTravel={onPlanTravel} bestDeparturePlan={bestDeparturePlan} bestDepartureLoading={bestDepartureLoading} bestDepartureError={bestDepartureError} onPlanBestDeparture={onPlanBestDeparture} />}
      <ComparisonTable cities={cities} leaderId={leaderId} historyPeriodDays={historyPeriodDays} loading={loading} onRemove={onRemove} />
    </Stack>
  </Box>;
}
