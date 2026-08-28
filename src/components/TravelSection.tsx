import { useEffect, useState } from "react";

import Alert from "@mui/material/Alert";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";
import Collapse from "@mui/material/Collapse";
import Box from "@mui/material/Box";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { t } from "../i18n";
import type { BestDeparturePlan, City, TravelPlan } from "../types/weather";
import { timeZoneShortName } from "../utils/travelDateTime";
import BestDeparturePlanner from "./BestDeparturePlanner";
import HelpTooltip from "./HelpTooltip";
import TravelPlanner from "./TravelPlanner";
import TravelResultCard from "./TravelResultCard";

type TravelSectionProps = {
  from: City;
  to: City;
  travelPlan: TravelPlan | null;
  travelLoading: boolean;
  travelError: string | null;
  onPlanTravel: (departureAt: string) => void;
  bestDeparturePlan: BestDeparturePlan | null;
  bestDepartureLoading: boolean;
  bestDepartureError: string | null;
  onPlanBestDeparture: (windowStart: string, windowEnd: string) => void;
};

type TravelMode = "single" | "best";

export default function TravelSection({ from, to, travelPlan, travelLoading, travelError, onPlanTravel, bestDeparturePlan, bestDepartureLoading, bestDepartureError, onPlanBestDeparture }: TravelSectionProps) {
  const [mode, setMode] = useState<TravelMode>("single");
  const [travelResultOpen, setTravelResultOpen] = useState(Boolean(travelPlan));

  useEffect(() => {
    setTravelResultOpen(Boolean(travelPlan));
  }, [travelPlan]);

  return <Box component="section" sx={{ borderTop: "1px solid", borderColor: "divider", pt: { xs: 1.5, md: 2 } }}>
    <Stack spacing={1.5}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
        <Typography variant="subtitle1" fontWeight={850}>{t("weather.travel.section_title")}</Typography>
        <Typography variant="body2" fontWeight={800}>{from.name} → {to.name}</Typography>
      </Stack>
      <Stack direction="row" spacing={0.25} alignItems="center">
        <Typography variant="caption" color="text.secondary">{timeZoneShortName(from.timezone)} → {timeZoneShortName(to.timezone)}</Typography>
        <HelpTooltip title={t("weather.travel.timezone_help", { from: from.timezone, to: to.timezone })} label={t("weather.travel.timezone_help_label")} />
      </Stack>
      <FormControl>
        <FormLabel id="travel-mode-label">{t("weather.travel.mode_label")}</FormLabel>
        <RadioGroup row aria-labelledby="travel-mode-label" name="travel-mode" value={mode} onChange={(event) => setMode(event.target.value as TravelMode)}>
          <FormControlLabel value="single" control={<Radio size="small" />} label={t("weather.travel.mode_single")} />
          <FormControlLabel value="best" control={<Radio size="small" />} label={t("weather.travel.mode_best")} />
        </RadioGroup>
      </FormControl>
      {mode === "single" ? <TravelPlanner from={from} to={to} loading={travelLoading} onPlanTravel={onPlanTravel} compact /> : <BestDeparturePlanner from={from} to={to} loading={bestDepartureLoading} error={bestDepartureError} plan={bestDeparturePlan} onPlan={onPlanBestDeparture} compact />}
      {mode === "single" && travelError && <Alert severity="error" role="alert" aria-live="assertive">{travelError}</Alert>}
      {mode === "single" && travelPlan && <Collapse in={travelResultOpen} unmountOnExit><TravelResultCard plan={travelPlan} onClose={() => setTravelResultOpen(false)} /></Collapse>}
    </Stack>
  </Box>;
}
