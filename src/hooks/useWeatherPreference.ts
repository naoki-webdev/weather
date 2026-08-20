import { useCallback, useEffect, useState } from "react";

import { getApiErrorMessage } from "../api/client";
import { fetchWeatherPreference, updateWeatherPreference } from "../api/cityRequests";
import { t } from "../i18n";
import type { WeatherPreference } from "../types/weather";

export function useWeatherPreference(onSaved: () => Promise<void>) {
  const [preference, setPreference] = useState<WeatherPreference | null>(null);
  const [preferenceOpen, setPreferenceOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWeatherPreference().then(setPreference).catch((requestError: unknown) => {
      setError(getApiErrorMessage(requestError, t("weather.errors.fetch_preferences")));
    });
  }, []);

  const savePreference = useCallback(async (values: Partial<WeatherPreference>) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateWeatherPreference(values);
      setPreference(updated);
      setPreferenceOpen(false);
      await onSaved();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, t("weather.errors.save_preferences")));
    } finally {
      setSaving(false);
    }
  }, [onSaved]);

  return {
    preference,
    preferenceOpen,
    saving,
    error,
    savePreference,
    openPreference: () => setPreferenceOpen(true),
    closePreference: () => setPreferenceOpen(false),
  };
}
