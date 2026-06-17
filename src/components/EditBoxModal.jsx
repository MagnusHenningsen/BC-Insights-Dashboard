import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { PRESET_QUERIES } from '../queries/presets';

function getInitialKql(box) {
  if (box.customKql) return box.customKql;
  if (box.presetId) {
    const preset = PRESET_QUERIES.find((q) => q.id === box.presetId);
    if (preset) {
      try {
        return preset.type === 'timeseries'
          ? preset.kql('{timeFilter}', '{bucket}')
          : preset.kql('{timeFilter}');
      } catch { return ''; }
    }
  }
  return '';
}

function getInitialDetailKql(box) {
  if (box.customDetailKql) return box.customDetailKql;
  if (box.presetId) {
    const preset = PRESET_QUERIES.find((q) => q.id === box.presetId);
    if (preset?.detailKql) {
      try { return preset.detailKql('{timeFilter}'); } catch { return ''; }
    }
  }
  return '';
}

export default function EditBoxModal({ box, onSave, onClose }) {
  const [name, setName] = useState(box.name);
  const [description, setDescription] = useState(box.description || '');
  const [kql, setKql] = useState(() => getInitialKql(box));
  const [detailKql, setDetailKql] = useState(() => getInitialDetailKql(box));
  const [color, setColor] = useState(box.color || '#378ADD');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name: name.trim() || box.name,
      description: description.trim(),
      color,
      customKql: kql.trim() || undefined,
      customDetailKql: detailKql.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 700 }}>
        <div className="modal-header">
          <h2>Edit box</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="field-row">
            <div className="field" style={{ flex: 1 }}>
              <label>Display name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field" style={{ width: 80 }}>
              <label>Color</label>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ height: 36, padding: 2 }} />
            </div>
          </div>

          <div className="field">
            <label>Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="field">
            <label>KQL query</label>
            <p className="field-hint" style={{ marginBottom: 6 }}>
              Use <code>{'{timeFilter}'}</code> for the time range (e.g. <code>ago(24h)</code>) and <code>{'{bucket}'}</code> for the bucket.
            </p>
            <textarea
              value={kql}
              onChange={(e) => setKql(e.target.value)}
              rows={10}
              spellCheck={false}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </div>

          <div className="field">
            <label>Detail query <span className="optional">(optional)</span></label>
            <p className="field-hint" style={{ marginBottom: 6 }}>
              Record-level query shown in the Details tab. Use <code>{'{timeFilter}'}</code> for the time range.
            </p>
            <textarea
              value={detailKql}
              onChange={(e) => setDetailKql(e.target.value)}
              rows={8}
              spellCheck={false}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">
              <Save size={15} /> Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
