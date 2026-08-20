import { useEffect, useState } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { t } from "../i18n";
import type { WeatherPreference } from "../types/weather";
import { WEATHER_PREFERENCE_PRESETS } from "../utils/weatherPreferencePresets";

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
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: "100vw", sm: 440 }, p: 3, backgroundColor: "#f5f7fb", minHeight: "100%" }}>
        <Stack spacing={2.5}>
          <Box><Typography variant="h6">{t("weather.preference.title")}</Typography><Typography variant="body2" color="text.secondary">{t("weather.preference.description")}</Typography></Box>
          <FormControl fullWidth disabled={!preference}>
            <InputLabel id="weather-preference-preset-label">{t("weather.preference.preset_title")}</InputLabel>
            <Select labelId="weather-preference-preset-label" value={presetId} label={t("weather.preference.preset_title")} onChange={(event) => applyPreset(event.target.value)}>
              <MenuItem value=""><em>{t("weather.preference.preset_custom")}</em></MenuItem>
              {WEATHER_PREFERENCE_PRESETS.map((preset) => <MenuItem key={preset.id} value={preset.id}>{t(preset.labelKey)}</MenuItem>)}
            </Select>
          </FormControl>
          {presetId && <Typography variant="caption" color="text.secondary">{t(WEATHER_PREFERENCE_PRESETS.find((preset) => preset.id === presetId)?.descriptionKey ?? "weather.preference.preset_custom")}</Typography>}
          <TextField label={t("weather.preference.target_temperature")} type="number" value={values.target_temperature ?? ""} onChange={(event) => setNumber("target_temperature", Number(event.target.value))} disabled={readOnly} InputProps={{ endAdornment: "°C" }} />
          <Stack spacing={2.25}>
            {weightFields.map(([key, labelKey]) => <Box key={key}><Stack direction="row" justifyContent="space-between"><Typography variant="body2" fontWeight={700}>{t(labelKey)}</Typography><Typography variant="body2" color="text.secondary">{values[key] ?? 0}</Typography></Stack><Slider value={values[key] ?? 0} onChange={(_, value) => setNumber(key, Array.isArray(value) ? value[0] : value)} min={0} max={10} step={1} disabled={readOnly} /></Box>)}
          </Stack>
          <Typography variant="caption" color="text.secondary">{t("weather.preference.weight_hint")}</Typography>
          <Stack direction="row" spacing={1} justifyContent="flex-end"><Button onClick={onClose}>{t("actions.cancel")}</Button><Button variant="contained" disabled={readOnly || saving || !preference} onClick={() => onSave(values)}>{saving ? t("actions.saving") : t("actions.save")}</Button></Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
