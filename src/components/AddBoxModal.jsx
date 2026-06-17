import { useState } from 'react';
import { X, Plus, Copy, Check } from 'lucide-react';
import { PRESET_QUERIES, CHART_TYPES, VIEWS } from '../queries/presets';

const PROMPT_TEMPLATE = `You are helping me add a new box to a Business Central telemetry dashboard.
The dashboard queries Microsoft Application Insights via KQL (Kusto Query Language).

== WHAT TO PRODUCE ==
Give me a box configuration in the exact OUTPUT FORMAT at the bottom.
I will paste each field directly into the dashboard UI.

== BOX FIELDS ==
- Name: display name shown on the box
- Description: one-line subtitle shown under the name
- Type: "timeseries" (graph over time) or "metric" (single number)
- Chart type (timeseries only): "line", "bar", or "area"
- Color: a hex color code for the series
- KQL query: the main chart/metric query (see format below)
- Detail query: optional record-level drill-down query (see format below)

== KQL PLACEHOLDERS ==
Always use these placeholders — the dashboard substitutes the real values at runtime:
  {timeFilter}  →  the time range expression, e.g. ago(24h)
  {bucket}      →  the time bucket for aggregation, e.g. 1h  (timeseries only)

Example time filter usage:  | where timestamp >= {timeFilter}
Example bucket usage:       | summarize value=count() by bin(timestamp, {bucket})

== TIMESERIES QUERY REQUIREMENTS ==
Must return columns:
  timestamp  (datetime)
  value      (number)
  series     (string, optional — use for multi-line charts, one line per distinct value)

Single-series example:
  traces
  | where timestamp >= {timeFilter}
  | where tostring(customDimensions.eventId) == 'RT0005'
  | summarize value=count() by bin(timestamp, {bucket})
  | order by timestamp asc

Multi-series by company (top 5):
  let topCompanies = traces
  | where timestamp >= {timeFilter}
  | where tostring(customDimensions.eventId) == 'RT0005'
  | summarize cnt=count() by company=tostring(customDimensions.companyName)
  | top 5 by cnt desc | project company;
  traces
  | where timestamp >= {timeFilter}
  | where tostring(customDimensions.eventId) == 'RT0005'
  | extend company = tostring(customDimensions.companyName)
  | where company in (topCompanies)
  | make-series value=count() default=0 on timestamp
      from bin({timeFilter}, {bucket}) to now() step {bucket} by series=company
  | mv-expand timestamp to typeof(datetime), value to typeof(long)
  | order by timestamp asc

== METRIC QUERY REQUIREMENTS ==
Must return a single row with a numeric column named "value".
Example:
  traces
  | where timestamp >= {timeFilter}
  | where tostring(customDimensions.eventId) == 'RT0005'
  | count
  | project value=Count

== DETAIL QUERY REQUIREMENTS ==
Record-level query shown in a drill-down tab. Uses {timeFilter} only (no {bucket}).
Return individual rows ordered by relevance. Always include customDimensions last.
Example:
  traces
  | where timestamp >= {timeFilter}
  | where tostring(customDimensions.eventId) == 'RT0005'
  | extend
      durMs = toreal(totimespan(customDimensions.executionTime)) / 10000,
      companyName = tostring(customDimensions.companyName),
      alObjectName = tostring(customDimensions.alObjectName)
  | project timestamp, durMs, companyName, alObjectName, customDimensions
  | order by durMs desc
  | take 100

== TIMESPAN FIELDS ==
These customDimensions fields are stored as TIMESPAN (hh:mm:ss.fffffff), not numbers.
Convert to milliseconds with:  toreal(totimespan(customDimensions.executionTime)) / 10000
Fields:  executionTime (RT0005, RT0018),  totalTime (RT0006),  serverExecutionTime (RT0008)

== AVAILABLE BC TELEMETRY EVENT IDs ==
RT0005  Slow SQL query
  customDimensions: executionTime*, sqlStatement, alObjectName, alObjectType,
                    extensionName, clientType, companyName

RT0006  Report rendering completed
  customDimensions: totalTime*, alObjectName (report name), alObjectId,
                    result, extensionName, clientType, companyName

RT0008  Web service request
  customDimensions: serverExecutionTime*, endpointName, category,
                    httpStatusCode, companyName

RT0012  Database lock timeout
  customDimensions: alObjectName, alObjectType, extensionName, clientType,
                    companyName, snapshotId, sqlStatement, alStackTrace

RT0018  Slow AL method execution
  customDimensions: executionTime*, alObjectName, alObjectType, extensionName,
                    clientType, companyName, alStackTrace

RT0028  Deadlock
  customDimensions: alObjectName, alObjectType, extensionName, clientType,
                    companyName, sqlStatement, deadlockGraph, alStackTrace

RT0030  Error dialog shown to user
  customDimensions: failureReason, alObjectName, alObjectType, extensionName,
                    clientType, companyName, alStackTrace

RT0031  Permission error
  customDimensions: permissionObjectType, permissionObjectId,
                    permissionObjectName, alObjectName, clientType,
                    companyName, usertelemetryid

AL0000HE7  Job queue entry error
  customDimensions: alJobQueueObjectDescription, alJobQueueCategoryCode,
                    alJobQueueIsRecurring, alJobQueueScheduledTaskId, companyName

  * = TIMESPAN field, convert with toreal(totimespan(...)) / 10000 for ms

== OUTPUT FORMAT ==
Respond with only this block — no extra explanation:

Name: <name>
Description: <description>
Type: <timeseries|metric>
Chart type: <line|bar|area>
Color: <#hex>

KQL query:
\`\`\`kql
<main query>
\`\`\`

Detail query:
\`\`\`kql
<detail query, or write "none">
\`\`\`

== MY REQUEST ==
<describe what you want to track here>`;


const DEFAULT_CUSTOM_KQL = `traces
| where timestamp >= {timeFilter}
| where tostring(customDimensions.eventId) == 'RT0005'
| summarize value=count() by bin(timestamp, {bucket})
| order by timestamp asc`;

export default function AddBoxModal({ onAdd, onClose }) {
  const [mode, setMode] = useState('preset'); // 'preset' | 'custom'
  const [promptCopied, setPromptCopied] = useState(false);
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
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                navigator.clipboard.writeText(PROMPT_TEMPLATE);
                setPromptCopied(true);
                setTimeout(() => setPromptCopied(false), 2000);
              }}
              title="Copy a prompt template to send to an AI to help generate a box"
            >
              {promptCopied ? <Check size={14} /> : <Copy size={14} />}
              {promptCopied ? 'Copied!' : 'Prompt template'}
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary">
                <Plus size={15} /> Add box
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
