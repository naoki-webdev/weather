import { useCallback, useEffect, useState } from "react";

import { getApiErrorMessage } from "../api/client";
import { fetchWeatherPreference, updateWeatherPreference } from "../api/cityRequests";
import { t } from "../i18n";
import type { WeatherPreference } from "../types/weather";
import { isAbortError } from "./requestUtils";

export function useWeatherPreference(onSaved: () => Promise<void>) {
  const [preference, setPreference] = useState<WeatherPreference | null>(null);
  const [preferenceOpen, setPreferenceOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetchWeatherPreference(controller.signal)
      .then((loadedPreference) => {
        if (active) setPreference(loadedPreference);
      })
      .catch((requestError: unknown) => {
        if (active && !isAbortError(requestError)) {
          setError(getApiErrorMessage(requestError, t("weather.errors.fetch_preferences")));
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
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
    closePreference: () => {
      setPreferenceOpen(false);
      setError(null);
    },
  };
}
