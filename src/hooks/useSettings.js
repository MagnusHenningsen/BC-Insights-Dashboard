import { useState } from 'react';

const STORAGE_KEY = 'bc_telemetry_settings';

const defaults = {
  connections: [],
  activeConnectionId: '',
  timeRange: '24h',
  refreshInterval: 60,
};

function migrate(stored) {
  if (!stored) return null;
  // Migrate from old single appId/apiKey format
  if (stored.appId && (!stored.connections || stored.connections.length === 0)) {
    return {
      ...stored,
      connections: [{ id: 'default', name: 'Default', appId: stored.appId, apiKey: stored.apiKey || '' }],
      activeConnectionId: 'default',
    };
  }
  return stored;
}

export function useSettings() {
  const [settings, setSettingsState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : null;
      const migrated = migrate(parsed);
      return migrated ? { ...defaults, ...migrated } : defaults;
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
