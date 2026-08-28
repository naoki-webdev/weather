import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
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
import { formatDateTime, formatNumber, formatPercent, formatTemperature, formatTime, weatherCodeLabel } from "../utils/weatherFormat";
import HelpTooltip from "./HelpTooltip";

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
  const [candidatesOpen, setCandidatesOpen] = useState(false);

  useEffect(() => {
    const nextWindow = defaultWindow(from.timezone);
    setWindowStart(nextWindow.start);
    setWindowEnd(nextWindow.end);
  }, [from.id, from.timezone]);

  useEffect(() => {
    setCandidatesOpen(false);
  }, [plan]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (windowStart && windowEnd && windowStart < windowEnd) onPlan(windowStart, windowEnd);
  };

  const content = <Stack spacing={1.5}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
          <Stack direction="row" spacing={0.25} alignItems="center">
            <Typography variant="subtitle1" fontWeight={850}>{t("weather.travel.best_title")}</Typography>
            <HelpTooltip title={t("weather.travel.best_hint")} label={t("weather.travel.best_help_label")} />
          </Stack>
          {!compact && <Typography variant="body2" fontWeight={800}>{from.name} → {to.name}</Typography>}
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
          <Button type="submit" variant="contained" disabled={loading || !windowStart || !windowEnd} aria-busy={loading} sx={{ whiteSpace: "nowrap" }}>
            {loading ? t("weather.travel.best_loading") : t("weather.travel.find_best")}
          </Button>
        </Stack>
        {error && <Alert severity="error" role="alert" aria-live="assertive">{error}</Alert>}
        {plan && <Stack spacing={1.25}>
          <Box sx={{ py: 1.25, borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
            {plan.recommended ? <Stack spacing={0.5}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
                <Typography variant="subtitle1" fontWeight={850}>{t("weather.travel.best_recommendation", { time: formatTime(plan.recommended.departure_at, plan.from.timezone) })}</Typography>
                <Typography variant="body2" color={`${recommendationSeverity(plan.recommended.recommendation.code)}.main`} fontWeight={800}>{t(`weather.travel.recommendation.${plan.recommended.recommendation.code}`)}</Typography>
              </Stack>
              <Typography variant="body2">{t("weather.travel.arrival")} {formatTime(plan.recommended.arrival_at, plan.to.timezone)} ・ {weatherSummary(plan.recommended.arrival_weather)}</Typography>
            </Stack> : <Stack spacing={0.5}>
              <Typography fontWeight={850}>{t("weather.travel.best_no_recommendation")}</Typography>
              {plan.reason && <Typography variant="body2" color="text.secondary">{plan.reason}</Typography>}
            </Stack>}
          </Box>
          {plan.candidates.length > 0 && <Button size="small" variant="text" onClick={() => setCandidatesOpen((current) => !current)} aria-expanded={candidatesOpen} sx={{ alignSelf: "flex-start" }}>
            {candidatesOpen ? t("weather.travel.hide_candidates") : t("weather.travel.show_candidates", { count: plan.candidates.length })}
          </Button>}
          {candidatesOpen && <TableContainer>
            <Table size="small" aria-label={t("weather.travel.candidates") }>
              <TableHead><TableRow><TableCell>{t("weather.travel.departure")}</TableCell><TableCell>{t("weather.travel.arrival")}</TableCell><TableCell align="right">{t("weather.travel.weather_score")}</TableCell><TableCell align="right">{t("weather.travel.rain_probability_short")}</TableCell></TableRow></TableHead>
              <TableBody>{plan.candidates.map((candidate) => <TableRow key={candidate.departure_at} selected={plan.recommended !== null && candidate.departure_at === plan.recommended.departure_at}>
                <TableCell>{formatDateTime(candidate.departure_at, plan.from.timezone)}</TableCell>
                <TableCell>{formatDateTime(candidate.arrival_at, plan.to.timezone)}</TableCell>
                <TableCell align="right">{candidate.weather_score === null ? "—" : `${candidate.weather_score}点`}</TableCell>
                <TableCell align="right">{formatPercent(candidate.arrival_weather?.precipitation_probability)}</TableCell>
              </TableRow>)}</TableBody>
            </Table>
          </TableContainer>}
        </Stack>}
      </Stack>;
  return compact ? <section>{content}</section> : <Paper component="section" variant="outlined" sx={{ p: 2, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.82)" }}>{content}</Paper>;
}
