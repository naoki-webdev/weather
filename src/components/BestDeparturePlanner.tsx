import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { t } from "../i18n";
import type { BestDeparturePlan, City, TravelArrivalWeather, TravelRecommendation } from "../types/weather";
import { dateTimeInputValue } from "../utils/travelDateTime";
import { formatDateTime, formatNumber, formatPercent, formatTemperature, weatherCodeLabel } from "../utils/weatherFormat";

type BestDeparturePlannerProps = {
  from: City;
  to: City;
  loading: boolean;
  error: string | null;
  plan: BestDeparturePlan | null;
  onPlan: (windowStart: string, windowEnd: string) => void;
  compact?: boolean;
};

function defaultWindow(timeZone: string) {
  const start = new Date();
  start.setSeconds(0, 0);
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15);
  const end = new Date(start.getTime() + 60 * 60_000);
  return { start: dateTimeInputValue(start, timeZone), end: dateTimeInputValue(end, timeZone) };
}

function recommendationSeverity(code: TravelRecommendation["code"] | null | undefined) {
  if (code === "clear") return "success" as const;
  if (code === "umbrella" || code === "caution") return "warning" as const;
  return "info" as const;
}

function weatherSummary(weather: TravelArrivalWeather) {
  if (!weather) return t("weather.travel.recommendation.unknown");
  return `${formatTemperature(weather.temperature)} ・ ${weatherCodeLabel(weather.weather_code)} ・ ${t("weather.travel.rain_probability", { value: formatPercent(weather.precipitation_probability) })} ・ ${t("weather.travel.wind", { value: formatNumber(weather.wind_speed, " km/h") })}`;
}

export default function BestDeparturePlanner({ from, to, loading, error, plan, onPlan, compact = false }: BestDeparturePlannerProps) {
  const initialWindow = defaultWindow(from.timezone);
  const [windowStart, setWindowStart] = useState(initialWindow.start);
  const [windowEnd, setWindowEnd] = useState(initialWindow.end);

  useEffect(() => {
    const nextWindow = defaultWindow(from.timezone);
    setWindowStart(nextWindow.start);
    setWindowEnd(nextWindow.end);
  }, [from.id, from.timezone]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (windowStart && windowEnd && windowStart < windowEnd) onPlan(windowStart, windowEnd);
  };

  const content = <Stack spacing={1.5}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
          {!compact && <div>
            <Typography variant="subtitle1" fontWeight={850}>{t("weather.travel.best_title")}</Typography>
            <Typography variant="body2" color="text.secondary">{t("weather.travel.best_description", { from: from.name, to: to.name })}</Typography>
          </div>}
          <Typography variant="body2" fontWeight={800}>{from.name} → {to.name}</Typography>
        </Stack>
        <Stack component="form" direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ xs: "stretch", sm: "center" }} onSubmit={submit}>
          <TextField
            fullWidth
            size="small"
            required
            type="datetime-local"
            label={t("weather.travel.window_start")}
            value={windowStart}
            onChange={(event) => setWindowStart(event.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ step: 900 }}
          />
          <TextField
            fullWidth
            size="small"
            required
            type="datetime-local"
            label={t("weather.travel.window_end")}
            value={windowEnd}
            onChange={(event) => setWindowEnd(event.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ step: 900 }}
          />
          <Button type="submit" variant="contained" disabled={loading || !windowStart || !windowEnd} sx={{ whiteSpace: "nowrap" }}>
            {loading ? t("weather.travel.best_loading") : t("weather.travel.find_best")}
          </Button>
        </Stack>
        {!compact && <Typography variant="caption" color="text.secondary">{t("weather.travel.timezone_hint", { timezone: from.timezone })} ・ {t("weather.travel.best_hint")}</Typography>}
        {error && <Alert severity="error">{error}</Alert>}
        {plan && <Stack spacing={1.25}>
          <Alert severity={recommendationSeverity(plan.recommended?.recommendation.code)} icon={false}>
            {plan.recommended && <Typography fontWeight={850}>{t("weather.travel.best_recommendation", { time: formatDateTime(plan.recommended.departure_at, plan.from.timezone) })}</Typography>}
            {!plan.recommended && <Typography fontWeight={850}>{t("weather.travel.best_no_recommendation")}</Typography>}
            <Typography variant="body2">{plan.reason}</Typography>
          </Alert>
          {plan.recommended && <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5 }}>
            <Stack spacing={0.75}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
                <Typography variant="body2" fontWeight={800}>{t("weather.travel.best_candidate")}</Typography>
                <Typography variant="body2" color={`${recommendationSeverity(plan.recommended.recommendation.code)}.main`} fontWeight={800}>{t(`weather.travel.recommendation.${plan.recommended.recommendation.code}`)}</Typography>
              </Stack>
              <Typography variant="body2">{t("weather.travel.departure")} {formatDateTime(plan.recommended.departure_at, plan.from.timezone)} → {t("weather.travel.arrival")} {formatDateTime(plan.recommended.arrival_at, plan.to.timezone)}</Typography>
              <Typography variant="body2" color="text.secondary">{weatherSummary(plan.recommended.arrival_weather)}</Typography>
            </Stack>
          </Paper>}
          <TableContainer>
            <Table size="small" aria-label={t("weather.travel.candidates") }>
              <TableHead><TableRow><TableCell>{t("weather.travel.departure")}</TableCell><TableCell>{t("weather.travel.arrival")}</TableCell><TableCell align="right">{t("weather.travel.weather_score")}</TableCell><TableCell align="right">{t("weather.travel.rain_probability_short")}</TableCell></TableRow></TableHead>
              <TableBody>{plan.candidates.map((candidate) => <TableRow key={candidate.departure_at} selected={plan.recommended !== null && candidate.departure_at === plan.recommended.departure_at}>
                <TableCell>{formatDateTime(candidate.departure_at, plan.from.timezone)}</TableCell>
                <TableCell>{formatDateTime(candidate.arrival_at, plan.to.timezone)}</TableCell>
                <TableCell align="right">{candidate.weather_score === null ? "—" : `${candidate.weather_score}点`}</TableCell>
                <TableCell align="right">{formatPercent(candidate.arrival_weather?.precipitation_probability)}</TableCell>
              </TableRow>)}</TableBody>
            </Table>
          </TableContainer>
        </Stack>}
      </Stack>;
  return compact ? <section>{content}</section> : <Paper component="section" variant="outlined" sx={{ p: 2, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.82)" }}>{content}</Paper>;
}
