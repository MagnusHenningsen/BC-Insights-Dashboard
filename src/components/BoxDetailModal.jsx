import { useState, useEffect } from 'react';
import { X, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { runKql } from '../lib/appInsights';

function parseObj(val) {
  if (val && typeof val === 'object') return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return null; }
  }
  return null;
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button className="icon-btn small" onClick={copy} title={copied ? 'Copied!' : 'Copy'} style={{ padding: '1px 5px' }}>
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function CustomDimensionsValue({ val }) {
  const [open, setOpen] = useState(false);
  const obj = parseObj(val);
  if (!obj) {
    const s = String(val ?? '');
    return s.length > 80 ? <pre className="row-kv-val-pre">{s}</pre> : <span className="row-kv-val">{s}</span>;
  }
  const entries = Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== '');
  return (
    <div>
      <button
        className="icon-btn small"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: open ? 6 : 0 }}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span style={{ fontSize: 11 }}>{entries.length} properties</span>
      </button>
      {open && (
        <div className="row-kv-grid" style={{ marginTop: 4, paddingLeft: 10, borderLeft: '2px solid var(--border2)' }}>
          {entries.map(([k, v]) => {
            const strVal = typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v ?? '');
            const isStackTrace = k === 'alStackTrace';
            const isLong = isStackTrace || strVal.length > 80 || strVal.includes('\n');
            return (
              <div key={k} className={`row-kv-item${isLong ? ' row-kv-item-wide' : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="row-kv-key">{k}</span>
                  {isStackTrace && strVal && <CopyButton text={strVal} />}
                </div>
                {isLong ? <pre className="row-kv-val-pre">{strVal}</pre> : <span className="row-kv-val">{strVal}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function cellDisplay(col, val) {
  if (col === 'customDimensions') {
    const obj = parseObj(val);
    return obj ? `{ ${Object.keys(obj).length} props }` : String(val ?? '');
  }
  if (val !== null && val !== undefined && typeof val === 'object') return '{…}';
  return String(val ?? '');
}

function ResultTable({ rows }) {
  const [expanded, setExpanded] = useState(null);
  const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
  if (cols.length === 0) return <div className="box-empty">No rows returned</div>;

  const toggle = (i) => setExpanded(expanded === i ? null : i);

  return (
    <table className="detail-table">
      <thead>
        <tr>
          <th style={{ width: 28 }} />
          {cols.map((c) => <th key={c}>{c}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.slice(0, 500).map((row, i) => (
          <ExpandableRow
            key={i}
            row={row}
            cols={cols}
            isExpanded={expanded === i}
            onToggle={() => toggle(i)}
          />
        ))}
      </tbody>
    </table>
  );
}

function ExpandableRow({ row, cols, isExpanded, onToggle }) {
  return (
    <>
      <tr className={`detail-row${isExpanded ? ' is-expanded' : ''}`} onClick={onToggle}>
        <td className="detail-row-chevron">
          {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </td>
        {cols.map((c) => {
          const display = cellDisplay(c, row[c]);
          return <td key={c} title={display}>{display}</td>;
        })}
      </tr>
      {isExpanded && (
        <tr className="detail-row-expanded">
          <td colSpan={cols.length + 1}>
            <div className="row-kv-grid">
              {cols.map((c) => {
                if (c === 'customDimensions') {
                  return (
                    <div key={c} className="row-kv-item row-kv-item-wide">
                      <span className="row-kv-key">{c}</span>
                      <CustomDimensionsValue val={row[c]} />
                    </div>
                  );
                }
                const val = String(row[c] ?? '');
                const isStackTrace = c === 'alStackTrace';
                const isLong = isStackTrace || val.length > 80 || val.includes('\n');
                return (
                  <div key={c} className={`row-kv-item${isLong ? ' row-kv-item-wide' : ''}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="row-kv-key">{c}</span>
                      {isStackTrace && val && <CopyButton text={val} />}
                    </div>
                    {isLong
                      ? <pre className="row-kv-val-pre">{val}</pre>
                      : <span className="row-kv-val">{val}</span>
                    }
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function BoxDetailModal({ box, kql, detailKql, rawRows, settings, tr, tenantId, companyName, onClose }) {
  const [tab, setTab] = useState('details');
  const [copied, setCopied] = useState(false);
  const [detailRows, setDetailRows] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  useEffect(() => {
    if (!detailKql || !settings?.appId || !settings?.apiKey) return;
    setDetailLoading(true);
    setDetailError(null);
    runKql({ appId: settings.appId, apiKey: settings.apiKey, query: detailKql })
      .then((rows) => { setDetailRows(rows); setDetailLoading(false); })
      .catch((e) => { setDetailError(e.message); setDetailLoading(false); });
  }, [detailKql, settings?.appId, settings?.apiKey]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copyKql = () => {
    navigator.clipboard.writeText(kql || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="detail-page">
      <div className="detail-page-header">
        <div className="detail-modal-title-group">
          <h2 className="detail-modal-title">{box.name}</h2>
          {box.description && <span className="box-desc">{box.description}</span>}
        </div>
        <button className="icon-btn" onClick={onClose}><X size={18} /></button>
      </div>

      <div className="detail-meta">
        <span>{tr.label}</span>
        <span>Bucket: {tr.bucket}</span>
        {tenantId && <span>Tenant: {tenantId}</span>}
        {companyName && <span>Company: {companyName}</span>}
      </div>

      <div className="tab-row detail-tab-row">
        <button className={`tab ${tab === 'details' ? 'active' : ''}`} onClick={() => setTab('details')}>
          Details{detailRows ? ` (${detailRows.length})` : ''}
        </button>
        <button className={`tab ${tab === 'query' ? 'active' : ''}`} onClick={() => setTab('query')}>Query</button>
        <button className={`tab ${tab === 'raw' ? 'active' : ''}`} onClick={() => setTab('raw')}>
          Raw{rawRows ? ` (${rawRows.length})` : ''}
        </button>
      </div>

      <div className="detail-page-body">
        {tab === 'details' && (
          <div className="detail-table-wrap">
            {!detailKql && (
              <div className="box-empty">No detail query configured for this box.</div>
            )}
            {detailKql && detailLoading && (
              <div className="box-loading">Loading records…</div>
            )}
            {detailKql && detailError && (
              <div className="box-error">{detailError}</div>
            )}
            {detailKql && !detailLoading && !detailError && detailRows && (
              <ResultTable rows={detailRows} />
            )}
          </div>
        )}

        {tab === 'query' && (
          <div className="detail-query-wrap">
            <button className="icon-btn small detail-copy-btn" onClick={copyKql} title={copied ? 'Copied!' : 'Copy query'}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <pre className="detail-kql">{kql || '—'}</pre>
          </div>
        )}

        {tab === 'raw' && (
          <div className="detail-table-wrap">
            {rawRows && rawRows.length > 0
              ? <ResultTable rows={rawRows} />
              : <div className="box-empty">No data returned</div>
            }
          </div>
        )}
      </div>
    </div>
  );
}
