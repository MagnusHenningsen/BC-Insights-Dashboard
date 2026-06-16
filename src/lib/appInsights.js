export async function runKql({ appId, apiKey, query }) {
  if (!appId || !apiKey) throw new Error('Missing App ID or API Key');

  const res = await fetch(
    `https://api.applicationinsights.io/v1/apps/${appId}/query`,
    {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  const table = data.tables[0];
  const cols = table.columns.map((c) => c.name);
  return table.rows.map((r) =>
    Object.fromEntries(cols.map((c, i) => [c, r[i]]))
  );
}

export function parseMs(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const s = String(val);
  const m = s.match(/(\d+):(\d+):(\d+)\.?(\d*)/);
  if (m) {
    return (
      (parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3])) * 1000 +
      (m[4] ? parseInt(m[4].substring(0, 3).padEnd(3, '0')) : 0)
    );
  }
  return parseFloat(s) || 0;
}

export function fmtMs(ms) {
  if (!ms || isNaN(ms)) return '—';
  if (ms >= 60000) return (ms / 60000).toFixed(1) + 'm';
  if (ms >= 1000) return (ms / 1000).toFixed(1) + 's';
  return Math.round(ms) + 'ms';
}

export function fmtNum(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return Number(n).toLocaleString();
}
