import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { PRESET_QUERIES, CHART_TYPES, VIEWS } from '../queries/presets';

const DEFAULT_CUSTOM_KQL = `traces
| where timestamp >= {timeFilter}
| where tostring(customDimensions.eventId) == 'RT0005'
| summarize value=count() by bin(timestamp, {bucket})
| order by timestamp asc`;

export default function AddBoxModal({ onAdd, onClose }) {
  const [mode, setMode] = useState('preset'); // 'preset' | 'custom'
  const [presetId, setPresetId] = useState(
    (PRESET_QUERIES.find((q) => q.id.endsWith('_by_company')) || PRESET_QUERIES[0]).id
  );
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [chartType, setChartType] = useState('line');
  const [boxType, setBoxType] = useState('timeseries');
  const [customKql, setCustomKql] = useState(DEFAULT_CUSTOM_KQL);
  const [customDetailKql, setCustomDetailKql] = useState('');
  const [color, setColor] = useState('#378ADD');
  const [viewId, setViewId] = useState('');

  const selectedPreset = PRESET_QUERIES.find((q) => q.id === presetId);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'preset') {
      onAdd({
        name: name || selectedPreset.name,
        description: description || selectedPreset.description,
        chartType,
        type: selectedPreset.type,
        presetId,
        color,
      });
    } else {
      if (!name.trim()) return alert('Name is required for custom queries');
      onAdd({
        name: name.trim(),
        description: description.trim(),
        chartType,
        type: boxType,
        customKql: customKql.trim(),
        customDetailKql: customDetailKql.trim() || undefined,
        color,
        viewId: viewId || undefined,
      });
    }
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Add dashboard box</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="tab-row">
          <button className={`tab ${mode === 'preset' ? 'active' : ''}`} onClick={() => setMode('preset')}>Use preset query</button>
          <button className={`tab ${mode === 'custom' ? 'active' : ''}`} onClick={() => setMode('custom')}>Custom KQL</button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'preset' && (
            <div className="field">
              <label>Preset query</label>
              <select value={presetId} onChange={(e) => setPresetId(e.target.value)}>
                <optgroup label="By company">
                  {PRESET_QUERIES.filter((q) => q.id.endsWith('_by_company')).map((q) => (
                    <option key={q.id} value={q.id}>{q.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Time series">
                  {PRESET_QUERIES.filter((q) => q.type === 'timeseries' && !q.id.endsWith('_by_company')).map((q) => (
                    <option key={q.id} value={q.id}>{q.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Metric (single number)">
                  {PRESET_QUERIES.filter((q) => q.type === 'metric').map((q) => (
                    <option key={q.id} value={q.id}>{q.name}</option>
                  ))}
                </optgroup>
              </select>
              {selectedPreset && (
                <p className="field-hint">{selectedPreset.description}</p>
              )}
            </div>
          )}

          {mode === 'custom' && (
            <>
              <div className="field">
                <label>Box type</label>
                <div className="radio-row">
                  <label className="radio-label">
                    <input type="radio" value="timeseries" checked={boxType === 'timeseries'} onChange={() => setBoxType('timeseries')} />
                    Time series (graph)
                  </label>
                  <label className="radio-label">
                    <input type="radio" value="metric" checked={boxType === 'metric'} onChange={() => setBoxType('metric')} />
                    Metric (single number)
                  </label>
                </div>
                <p className="field-hint">
                  {boxType === 'timeseries'
                    ? 'Query must return: timestamp (datetime), value (number). Optional: series (string) for multi-line.'
                    : 'Query must return a single row with a numeric column named "value" or "Count".'}
                </p>
              </div>
              <div className="field">
                <label>KQL query</label>
                <p className="field-hint" style={{ marginBottom: 6 }}>
                  Use <code>{'{timeFilter}'}</code> for the time range (e.g. <code>ago(24h)</code>) and <code>{'{bucket}'}</code> for the time bucket.
                </p>
                <textarea
                  value={customKql}
                  onChange={(e) => setCustomKql(e.target.value)}
                  rows={8}
                  spellCheck={false}
                  style={{ fontFamily: 'monospace', fontSize: 12 }}
                />
              </div>
              <div className="field">
                <label>Detail query <span className="optional">(optional)</span></label>
                <p className="field-hint" style={{ marginBottom: 6 }}>
                  Record-level query shown in the Details tab. Use <code>{'{timeFilter}'}</code> for the time range.
                  Should return individual rows sorted by relevance (e.g. slowest first or most recent first).
                </p>
                <textarea
                  value={customDetailKql}
                  onChange={(e) => setCustomDetailKql(e.target.value)}
                  rows={6}
                  spellCheck={false}
                  style={{ fontFamily: 'monospace', fontSize: 12 }}
                  placeholder={`traces\n| where timestamp >= {timeFilter}\n| where tostring(customDimensions.eventId) == 'RT0005'\n| extend durMs = toreal(totimespan(customDimensions.executionTime)) / 10000\n| project timestamp, durMs, alObjectName\n| order by durMs desc\n| take 100`}
                />
              </div>
              <div className="field">
                <label>View <span className="optional">(optional)</span></label>
                <select value={viewId} onChange={(e) => setViewId(e.target.value)}>
                  <option value="">All (always visible)</option>
                  {VIEWS.filter((v) => v.id !== 'all').map((v) => (
                    <option key={v.id} value={v.id}>{v.label}</option>
                  ))}
                </select>
                <p className="field-hint">Which view this box appears in. Leave as "All" to always show it.</p>
              </div>
            </>
          )}

          <div className="field-row">
            <div className="field" style={{ flex: 1 }}>
              <label>Display name <span className="optional">(optional for preset)</span></label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={mode === 'preset' ? selectedPreset?.name : 'My query'}
              />
            </div>
            <div className="field" style={{ width: 80 }}>
              <label>Color</label>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ height: 36, padding: 2 }} />
            </div>
          </div>

          <div className="field">
            <label>Description <span className="optional">(optional)</span></label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this box show?"
            />
          </div>

          {(mode === 'custom' ? boxType === 'timeseries' : selectedPreset?.type === 'timeseries') && (
            <div className="field">
              <label>Default chart type</label>
              <div className="chart-type-row">
                {CHART_TYPES.map((ct) => (
                  <button
                    key={ct.value}
                    type="button"
                    className={`chart-type-btn ${chartType === ct.value ? 'active' : ''}`}
                    onClick={() => setChartType(ct.value)}
                  >
                    {ct.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">
              <Plus size={15} /> Add box
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
