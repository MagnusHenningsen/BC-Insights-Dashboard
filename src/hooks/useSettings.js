import { useState, useEffect } from 'react';

const STORAGE_KEY = 'bc_telemetry_settings';

const defaults = {
  appId: '',
  apiKey: '',
  timeRange: '24h',
  refreshInterval: 60,
};

export function useSettings() {
  const [settings, setSettingsState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
    } catch {
      return defaults;
    }
  });

  const setSettings = (patch) => {
    setSettingsState((prev) => {
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  return [settings, setSettings];
}
