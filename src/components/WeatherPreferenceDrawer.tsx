import { useEffect, useState } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import { t } from "../i18n";
import type { WeatherPreference } from "../types/weather";
import { WEATHER_PREFERENCE_PRESETS } from "../utils/weatherPreferencePresets";
import HelpTooltip from "./HelpTooltip";
import CloseIcon from "./CloseIcon";

type WeatherPreferenceDrawerProps = {
  open: boolean;
  readOnly: boolean;
  saving: boolean;
  preference: WeatherPreference | null;
  onClose: () => void;
  onSave: (values: Partial<WeatherPreference>) => void;
};

const weightFields = [
  ["temperature_weight", "weather.preference.temperature"],
  ["precipitation_weight", "weather.preference.precipitation"],
  ["humidity_weight", "weather.preference.humidity"],
  ["wind_weight", "weather.preference.wind"],
  ["air_quality_weight", "weather.preference.air_quality"],
] as const;

export default function WeatherPreferenceDrawer({ open, readOnly, saving, preference, onClose, onSave }: WeatherPreferenceDrawerProps) {
  const [values, setValues] = useState<Partial<WeatherPreference>>({});
  const [presetId, setPresetId] = useState("");

  useEffect(() => {
    if (preference) {
      setValues(preference);
      setPresetId("");
    }
  }, [preference]);

  const setNumber = (key: keyof WeatherPreference, value: number) => setValues((current) => ({ ...current, [key]: value }));
  const applyPreset = (id: string) => {
    const preset = WEATHER_PREFERENCE_PRESETS.find((candidate) => candidate.id === id);
    setPresetId(id);
    if (preset) setValues((current) => ({ ...current, ...preset.values }));
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} ModalProps={{ "aria-labelledby": "weather-preference-drawer-title" }}>
      <Box sx={{ width: { xs: "100vw", sm: 440 }, p: { xs: 2, sm: 3 }, backgroundColor: "background.paper", minHeight: "100%" }}>
        <Stack spacing={2.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography id="weather-preference-drawer-title" variant="h6">{t("weather.preference.title")}</Typography>
            <IconButton size="small" onClick={onClose} aria-label={t("actions.close")} title={t("actions.close")}><CloseIcon /></IconButton>
          </Stack>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.75 }}>{t("weather.preference.preset_title")}</Typography>
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
              {WEATHER_PREFERENCE_PRESETS.map((preset) => <Tooltip key={preset.id} title={t(preset.descriptionKey)} arrow>
                <span><Button size="small" variant={presetId === preset.id ? "contained" : "outlined"} disabled={!preference || readOnly} onClick={() => applyPreset(preset.id)}>{t(preset.labelKey)}</Button></span>
              </Tooltip>)}
            </Stack>
          </Box>
          <TextField label={t("weather.preference.target_temperature")} type="number" value={values.target_temperature ?? ""} onChange={(event) => setNumber("target_temperature", Number(event.target.value))} disabled={readOnly} InputProps={{ endAdornment: "°C" }} />
          <Stack direction="row" spacing={0.25} alignItems="center">
            <Typography variant="subtitle2">{t("weather.preference.weight_title")}</Typography>
            <HelpTooltip title={t("weather.preference.weight_hint")} label={t("weather.preference.weight_help_label")} />
          </Stack>
          <Stack spacing={2.25}>
            {weightFields.map(([key, labelKey]) => <Box key={key}><Stack direction="row" justifyContent="space-between"><Typography variant="body2" fontWeight={700}>{t(labelKey)}</Typography><Typography variant="body2" color="text.secondary">{values[key] ?? 0}</Typography></Stack><Slider value={values[key] ?? 0} onChange={(_, value) => setNumber(key, Array.isArray(value) ? value[0] : value)} min={0} max={10} step={1} disabled={readOnly} /></Box>)}
          </Stack>
          <Stack direction="row" spacing={1} justifyContent="flex-end"><Button onClick={onClose}>{t("actions.cancel")}</Button><Button variant="contained" aria-busy={saving} disabled={readOnly || saving || !preference} onClick={() => onSave(values)}>{saving ? t("actions.saving") : t("actions.save")}</Button></Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
