import { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { TIME_RANGES } from '../queries/presets';

export default function SettingsPanel({ settings, onSave, onClose }) {
  const [form, setForm] = useState(settings);
  const [showKey, setShowKey] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="field">
          <label>App Insights Application ID</label>
          <input
            value={form.appId}
            onChange={(e) => set('appId', e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            spellCheck={false}
          />
          <p className="field-hint">Azure Portal → App Insights → Configure → API Access → Application ID</p>
        </div>

        <div className="field">
          <label>API Key</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type={showKey ? 'text' : 'password'}
              value={form.apiKey}
              onChange={(e) => set('apiKey', e.target.value)}
              placeholder="••••••••••••••••••••••"
              spellCheck={false}
              style={{ fontFamily: showKey ? 'inherit' : 'monospace', flex: 1 }}
            />
            <button className="icon-btn" type="button" onClick={() => setShowKey((s) => !s)}>
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="field-hint">Needs "Read telemetry" permission. Stored in localStorage.</p>
        </div>

        <div className="field-row">
          <div className="field" style={{ flex: 1 }}>
            <label>Default time range</label>
            <select value={form.timeRange} onChange={(e) => set('timeRange', e.target.value)}>
              {TIME_RANGES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Auto-refresh interval</label>
            <select value={form.refreshInterval} onChange={(e) => set('refreshInterval', Number(e.target.value))}>
              <option value={0}>Manual only</option>
              <option value={30}>Every 30s</option>
              <option value={60}>Every 1 min</option>
              <option value={300}>Every 5 min</option>
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => { onSave(form); onClose(); }}>Save settings</button>
        </div>
      </div>
    </div>
  );
}
