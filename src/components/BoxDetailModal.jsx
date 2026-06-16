import { useState, useEffect } from 'react';
import { X, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { runKql } from '../lib/appInsights';

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
        {cols.map((c) => (
          <td key={c} title={String(row[c] ?? '')}>{String(row[c] ?? '')}</td>
        ))}
      </tr>
      {isExpanded && (
        <tr className="detail-row-expanded">
          <td colSpan={cols.length + 1}>
            <div className="row-kv-grid">
              {cols.map((c) => (
                <div key={c} className="row-kv-item">
                  <span className="row-kv-key">{c}</span>
                  <span className="row-kv-val">{String(row[c] ?? '')}</span>
                </div>
              ))}
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
