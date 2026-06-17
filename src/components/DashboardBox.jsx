import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { RefreshCw, Eye, EyeOff, Trash2, BarChart2, TrendingUp, Activity, Info, Maximize2, X, Pencil } from 'lucide-react';
import { runKql, fmtMs, fmtNum } from '../lib/appInsights';
import { PRESET_QUERIES, SERIES_COLORS, TIME_RANGES, BUCKET_OPTIONS, injectFilters } from '../queries/presets';
import BoxDetailModal from './BoxDetailModal';
import EditBoxModal from './EditBoxModal';

function buildDetailKql(box, timeFilter, tenantId, companyName) {
  let kql;
  if (box.customDetailKql) {
    kql = box.customDetailKql.replace(/\{timeFilter\}/g, timeFilter);
  } else if (box.presetId) {
    const preset = PRESET_QUERIES.find((q) => q.id === box.presetId);
    if (!preset?.detailKql) return null;
    kql = preset.detailKql(timeFilter);
  } else {
    return null;
  }
  return injectFilters(kql, { tenantId, companyName });
}

function buildKql(box, timeFilter, bucket, tenantId, companyName) {
  let kql;
  if (box.customKql) {
    kql = box.customKql
      .replace(/\{timeFilter\}/g, timeFilter)
      .replace(/\{bucket\}/g, bucket);
  } else if (box.presetId) {
    const preset = PRESET_QUERIES.find((q) => q.id === box.presetId);
    if (!preset) return null;
    kql = preset.type === 'timeseries'
      ? preset.kql(timeFilter, bucket)
      : preset.kql(timeFilter);
  } else {
    return null;
  }
  return injectFilters(kql, { tenantId, companyName });
}

function extractSeriesData(rows, type) {
  if (type === 'metric') {
    const row = rows[0] || {};
    const val = row.value ?? row.Value ?? row.Count ?? row.count ?? Object.values(row)[0];
    return { kind: 'metric', value: val };
  }
  if (type === 'list') {
    return {
      kind: 'list',
      rows: rows.map((r) => ({
        label: r.label ?? r.Label ?? String(Object.values(r).find(v => typeof v === 'string') ?? ''),
        value: r.value ?? r.Value ?? r.Count ?? r.count ?? Object.values(r).find(v => typeof v === 'number') ?? 0,
      })),
    };
  }
  const hasSeriesCol = rows.some((r) => r.series !== undefined);
  if (hasSeriesCol) {
    const seriesNames = [...new Set(rows.map((r) => r.series))];
    const timeMap = {};
    rows.forEach((r) => {
      const ts = r.timestamp;
      if (!timeMap[ts]) timeMap[ts] = { timestamp: ts };
      timeMap[ts][r.series] = r.value;
    });
    return { kind: 'multi', seriesNames, data: Object.values(timeMap).sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp)) };
  }
  const data = rows.map((r) => ({
    timestamp: r.timestamp,
    value: r.value ?? r.Value ?? Object.values(r).find((v) => typeof v === 'number'),
  })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return { kind: 'single', data };
}

function fmtTimestamp(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function MetricDisplay({ value, unit, color }) {
  const isMs = unit === 'ms';
  const display = isMs ? fmtMs(value) : fmtNum(value);
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, padding: '24px 0' }}>
      <span style={{ fontSize: 56, fontWeight: 500, color, lineHeight: 1 }}>{display}</span>
    </div>
  );
}

function ListDisplay({ rows, color }) {
  if (!rows?.length) return <div className="box-empty">No data</div>;
  const max = Math.max(...rows.map(r => Number(r.value) || 0), 1);
  return (
    <div className="list-display">
      {rows.map((row, i) => (
        <div key={i} className="list-row">
          <span className="list-rank">{i + 1}</span>
          <span className="list-label" title={row.label}>{row.label || '(unknown)'}</span>
          <div className="list-bar-wrap">
            <div className="list-bar" style={{ width: `${(Number(row.value) / max) * 100}%`, background: color }} />
          </div>
          <span className="list-value">{fmtNum(Number(row.value))}</span>
        </div>
      ))}
    </div>
  );
}

const tooltipStyle = {
  fontSize: 12,
  background: 'var(--bg)',
  border: '0.5px solid var(--border2)',
  borderRadius: 'var(--radius)',
  color: 'var(--text)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
};

function ChartContent({ data, chartType, color, boxId, height = 220 }) {
  if (!data || (data.kind !== 'single' && data.kind !== 'multi')) return null;

  const commonProps = { margin: { top: 4, right: 8, left: 0, bottom: 0 } };
  const xAxis = <XAxis dataKey="timestamp" tickFormatter={fmtTimestamp} tick={{ fontSize: 11, fill: 'var(--text3)' }} />;
  const yAxis = <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} width={40} />;
  const grid = <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />;
  const tooltip = (
    <Tooltip
      labelFormatter={(l) => new Date(l).toLocaleString()}
      contentStyle={tooltipStyle}
      labelStyle={{ color: 'var(--text2)', marginBottom: 4, fontWeight: 500 }}
      cursor={{ stroke: 'var(--border2)', strokeWidth: 1 }}
    />
  );

  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data.data} {...commonProps}>
          {grid}{xAxis}{yAxis}{tooltip}
          {data.kind === 'multi'
            ? data.seriesNames.map((s, i) => <Bar key={s} dataKey={s} stackId="a" fill={SERIES_COLORS[i % SERIES_COLORS.length]} />)
            : <Bar dataKey="value" fill={color} radius={[2,2,0,0]} />}
          {data.kind === 'multi' && <Legend wrapperStyle={{ fontSize: 12 }} />}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'area') {
    const gradients = data.kind === 'multi'
      ? data.seriesNames.map((s, i) => (
        <linearGradient key={s} id={`grad-${boxId}-${i}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0.3} />
          <stop offset="95%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0} />
        </linearGradient>
      ))
      : (
        <linearGradient id={`grad-${boxId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={color} stopOpacity={0.3} />
          <stop offset="95%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      );
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data.data} {...commonProps}>
          <defs>{gradients}</defs>
          {grid}{xAxis}{yAxis}{tooltip}
          {data.kind === 'multi'
            ? data.seriesNames.map((s, i) => (
              <Area key={s} type="monotone" dataKey={s} stroke={SERIES_COLORS[i % SERIES_COLORS.length]} fill={`url(#grad-${boxId}-${i})`} strokeWidth={1.5} dot={false} />
            ))
            : <Area type="monotone" dataKey="value" stroke={color} fill={`url(#grad-${boxId})`} strokeWidth={1.5} dot={false} />}
          {data.kind === 'multi' && <Legend wrapperStyle={{ fontSize: 12 }} />}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data.data} {...commonProps}>
        {grid}{xAxis}{yAxis}{tooltip}
        {data.kind === 'multi'
          ? data.seriesNames.map((s, i) => (
            <Line key={s} type="monotone" dataKey={s} stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={1.5} dot={false} />
          ))
          : <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} />}
        {data.kind === 'multi' && <Legend wrapperStyle={{ fontSize: 12 }} />}
      </LineChart>
    </ResponsiveContainer>
  );
}

const CHART_ICONS = { line: TrendingUp, bar: BarChart2, area: Activity };

export default function DashboardBox({ box, settings, timeRange, tenantId, companyName, refreshKey, onRemove, onToggle, onUpdateChartType, onUpdate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState(box.chartType || 'line');
  const [showDetail, setShowDetail] = useState(false);
  const [showExpanded, setShowExpanded] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [rawRows, setRawRows] = useState(null);
  const [builtKql, setBuiltKql] = useState(null);
  const [builtDetailKql, setBuiltDetailKql] = useState(null);

  const tr = TIME_RANGES.find((t) => t.value === timeRange) || TIME_RANGES[2];

  const fetch = useCallback(async () => {
    if (!settings.appId || !settings.apiKey) { setError('No credentials'); return; }
    setLoading(true); setError(null);
    try {
      const kql = buildKql(box, `ago(${tr.value})`, box.bucket || tr.bucket, tenantId, companyName);
      if (!kql) throw new Error('Invalid query config');
      setBuiltKql(kql);
      setBuiltDetailKql(buildDetailKql(box, `ago(${tr.value})`, tenantId, companyName));
      const rows = await runKql({ appId: settings.appId, apiKey: settings.apiKey, query: kql });
      setRawRows(rows);
      setData(extractSeriesData(rows, box.type));
    } catch (e) { setError(e.message); }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box.id, box.presetId, box.customKql, box.customDetailKql, box.type, box.bucket, settings.appId, settings.apiKey, tr, tenantId, companyName, refreshKey]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    if (!showExpanded) return;
    const handler = (e) => { if (e.key === 'Escape') setShowExpanded(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showExpanded]);

  const setChart = (type) => {
    setChartType(type);
    onUpdateChartType(type);
  };

  const color = box.color || SERIES_COLORS[0];
  const preset = box.presetId ? PRESET_QUERIES.find((q) => q.id === box.presetId) : null;
  const unit = preset?.unit || box.unit;
  const hasChart = data && (data.kind === 'single' || data.kind === 'multi');

  return (
    <>
    <div className="box">
      <div className="box-header">
        <div className="box-title-group">
          <span className="box-title">{box.name}</span>
          {box.description && <span className="box-desc">{box.description}</span>}
        </div>
        <div className="box-controls">
          {box.type === 'timeseries' && (
            <select
              className="time-select"
              style={{ fontSize: 11, padding: '3px 6px' }}
              value={box.bucket || ''}
              onChange={(e) => onUpdate({ bucket: e.target.value || undefined })}
              title="Time bucket"
            >
              {BUCKET_OPTIONS.map((b) => (
                <option key={b.value} value={b.value}>{b.value ? b.label : 'Auto bucket'}</option>
              ))}
            </select>
          )}
          {box.type === 'timeseries' && (
            <div className="chart-toggle">
              {['line', 'bar', 'area'].map((t) => {
                const Icon = CHART_ICONS[t];
                return (
                  <button
                    key={t}
                    className={`icon-btn ${chartType === t ? 'active' : ''}`}
                    onClick={() => setChart(t)}
                    title={t}
                  >
                    <Icon size={15} />
                  </button>
                );
              })}
            </div>
          )}
          {box.type === 'timeseries' && hasChart && (
            <button className="icon-btn" onClick={() => setShowExpanded(true)} title="Expand chart">
              <Maximize2 size={15} />
            </button>
          )}
          <button className="icon-btn" onClick={() => setShowDetail(true)} title="Details / debug">
            <Info size={15} />
          </button>
          <button className="icon-btn" onClick={fetch} title="Refresh" disabled={loading}>
            <RefreshCw size={15} className={loading ? 'spinning' : ''} />
          </button>
          <button className="icon-btn" onClick={() => setShowEdit(true)} title="Edit query">
            <Pencil size={15} />
          </button>
          <button className="icon-btn danger" onClick={onToggle} title={box.visible ? 'Hide' : 'Show'}>
            {box.visible ? <Eye size={15} /> : <EyeOff size={15} />}
          </button>
          <button className="icon-btn danger" onClick={onRemove} title="Remove">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="box-body">
        {loading && !data && <div className="box-loading">Loading…</div>}
        {error && <div className="box-error">{error}</div>}
        {!error && data && (
          <>
            {data.kind === 'metric' && (
              <MetricDisplay value={data.value} unit={unit} color={color} />
            )}
            {data.kind === 'list' && (
              <ListDisplay rows={data.rows} color={color} />
            )}
            {hasChart && (
              <ChartContent data={data} chartType={chartType} color={color} boxId={box.id} height={220} />
            )}
          </>
        )}
        {!loading && !error && !data && (
          <div className="box-empty">No data returned</div>
        )}
      </div>
    </div>

    {showExpanded && (
      <div className="chart-expand-backdrop" onClick={(e) => e.target === e.currentTarget && setShowExpanded(false)}>
        <div className="chart-expand-modal">
          <div className="chart-expand-header">
            <div className="chart-expand-title-group">
              <span className="chart-expand-title">{box.name}</span>
              {box.description && <span className="chart-expand-desc">{box.description}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div className="chart-toggle">
                {['line', 'bar', 'area'].map((t) => {
                  const Icon = CHART_ICONS[t];
                  return (
                    <button
                      key={t}
                      className={`icon-btn ${chartType === t ? 'active' : ''}`}
                      onClick={() => setChart(t)}
                      title={t}
                    >
                      <Icon size={15} />
                    </button>
                  );
                })}
              </div>
              <button className="icon-btn" onClick={() => setShowExpanded(false)} title="Close">
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="chart-expand-body">
            <ChartContent data={data} chartType={chartType} color={color} boxId={`${box.id}-exp`} height={480} />
          </div>
        </div>
      </div>
    )}

    {showDetail && (
      <BoxDetailModal
        box={box}
        kql={builtKql}
        detailKql={builtDetailKql}
        rawRows={rawRows}
        settings={settings}
        tr={tr}
        tenantId={tenantId}
        companyName={companyName}
        onClose={() => setShowDetail(false)}
      />
    )}
    {showEdit && (
      <EditBoxModal
        box={box}
        onSave={(patch) => { onUpdate(patch); fetch(); }}
        onClose={() => setShowEdit(false)}
      />
    )}
    </>
  );
}
