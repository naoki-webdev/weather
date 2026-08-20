import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { t } from "../i18n";
import type { City } from "../types/weather";
import { dateTimeInputValue } from "../utils/travelDateTime";

type TravelPlannerProps = {
  from: City;
  to: City;
  loading: boolean;
  onPlanTravel: (departureAt: string) => void;
  compact?: boolean;
};

export default function TravelPlanner({ from, to, loading, onPlanTravel, compact = false }: TravelPlannerProps) {
  const [departureAt, setDepartureAt] = useState(() => dateTimeInputValue(new Date(), from.timezone));

  useEffect(() => {
    setDepartureAt(dateTimeInputValue(new Date(), from.timezone));
  }, [from.id, from.timezone]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (departureAt) onPlanTravel(departureAt);
  };

  const content = <Stack spacing={1.25}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
          {!compact && <div>
            <Typography variant="subtitle1" fontWeight={850}>{t("weather.travel.planner_title")}</Typography>
            <Typography variant="body2" color="text.secondary">{t("weather.travel.planner_description", { from: from.name, to: to.name })}</Typography>
          </div>}
          <Typography variant="body2" fontWeight={800}>{from.name} → {to.name}</Typography>
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ xs: "stretch", sm: "center" }}>
          <TextField
            fullWidth
            size="small"
            required
            type="datetime-local"
            label={t("weather.travel.planned_departure")}
            value={departureAt}
            onChange={(event) => setDepartureAt(event.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ step: 300 }}
          />
          <Button type="submit" variant="contained" disabled={loading || !departureAt} sx={{ whiteSpace: "nowrap" }}>
            {loading ? t("weather.travel.loading") : t("weather.travel.action")}
          </Button>
        </Stack>
        {!compact && <Typography variant="caption" color="text.secondary">{t("weather.travel.timezone_hint", { timezone: from.timezone })} ・ {t("weather.travel.planner_hint")}</Typography>}
      </Stack>
  return compact ? <form onSubmit={submit}>{content}</form> : <Paper component="form" variant="outlined" onSubmit={submit} sx={{ p: 2, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.7)" }}>{content}</Paper>;
}
