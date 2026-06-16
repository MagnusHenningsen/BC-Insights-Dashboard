import { useState } from 'react';
import { X, Eye, EyeOff, Plus, Pencil, Trash2, Check } from 'lucide-react';
import { TIME_RANGES } from '../queries/presets';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function ConnectionEdit({ conn, onSave, onCancel }) {
  const [form, setForm] = useState({ name: conn.name, appId: conn.appId, apiKey: conn.apiKey });
  const [showKey, setShowKey] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="conn-edit-form">
      <div className="field">
        <label>Name</label>
        <input
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Production"
          autoFocus
        />
      </div>
      <div className="field">
        <label>Application ID</label>
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
      <div className="conn-edit-actions">
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" onClick={() => onSave({ ...conn, ...form })}>
          <Check size={14} /> Apply
        </button>
      </div>
    </div>
  );
}

export default function SettingsPanel({ settings, onSave, onClose }) {
  const [connections, setConnections] = useState(settings.connections || []);
  const [editingId, setEditingId] = useState(null);
  const [timeRange, setTimeRange] = useState(settings.timeRange || '24h');
  const [refreshInterval, setRefreshInterval] = useState(settings.refreshInterval ?? 60);

  const startEdit = (id) => setEditingId(id);
  const cancelEdit = () => setEditingId(null);

  const applyEdit = (updated) => {
    setConnections((cs) => cs.map((c) => (c.id === updated.id ? updated : c)));
    setEditingId(null);
  };

  const addConnection = () => {
    const id = uid();
    const newConn = { id, name: 'New connection', appId: '', apiKey: '' };
    setConnections((cs) => [...cs, newConn]);
    setEditingId(id);
  };

  const deleteConnection = (id) => {
    setConnections((cs) => cs.filter((c) => c.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const handleSave = () => {
    const finalConns = editingId
      ? connections
      : connections;
    const activeId = finalConns.find((c) => c.id === settings.activeConnectionId)
      ? settings.activeConnectionId
      : finalConns[0]?.id || '';

    onSave({
      ...settings,
      connections: finalConns,
      activeConnectionId: activeId,
      timeRange,
      refreshInterval,
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="field">
          <div className="conn-field-header">
            <label>Connections</label>
            <button className="conn-add-btn" onClick={addConnection}>
              <Plus size={13} /> Add connection
            </button>
          </div>

          {connections.length === 0 ? (
            <div className="conn-empty">
              No connections yet. Add one to connect to an App Insights resource.
            </div>
          ) : (
            <div className="conn-list">
              {connections.map((conn) =>
                editingId === conn.id ? (
                  <ConnectionEdit
                    key={conn.id}
                    conn={conn}
                    onSave={applyEdit}
                    onCancel={cancelEdit}
                  />
                ) : (
                  <div key={conn.id} className="conn-row">
                    <div className="conn-row-info">
                      <span className="conn-row-name">{conn.name || 'Unnamed'}</span>
                      <span className="conn-row-appid">{conn.appId || '—'}</span>
                    </div>
                    <div className="conn-row-actions">
                      <button
                        className="icon-btn small"
                        onClick={() => startEdit(conn.id)}
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className="icon-btn small danger"
                        onClick={() => deleteConnection(conn.id)}
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <div className="field-row">
          <div className="field" style={{ flex: 1 }}>
            <label>Default time range</label>
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
              {TIME_RANGES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Auto-refresh interval</label>
            <select value={refreshInterval} onChange={(e) => setRefreshInterval(Number(e.target.value))}>
              <option value={0}>Manual only</option>
              <option value={30}>Every 30s</option>
              <option value={60}>Every 1 min</option>
              <option value={300}>Every 5 min</option>
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save settings</button>
        </div>
      </div>
    </div>
  );
}
