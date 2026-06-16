import { useRef, useState } from 'react';
import { Eye, EyeOff, Plus, GripVertical } from 'lucide-react';
import { boxInView } from '../queries/presets';

export default function BoxList({ boxes, onToggle, onAdd, onReorder, views, activeView, onViewChange }) {
  const dragIndex = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  const handleDragStart = (i) => { dragIndex.current = i; };

  const handleDragOver = (e, i) => {
    e.preventDefault();
    if (dragIndex.current !== null && dragIndex.current !== i) setDragOver(i);
  };

  const handleDrop = (e, i) => {
    e.preventDefault();
    if (dragIndex.current !== null && dragIndex.current !== i) onReorder(dragIndex.current, i);
    setDragOver(null);
    dragIndex.current = null;
  };

  const handleDragEnd = () => {
    setDragOver(null);
    dragIndex.current = null;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header"><span>Views</span></div>
      <nav className="view-nav">
        {views.map((v) => {
          const count = boxes.filter((b) => boxInView(b, v.id)).length;
          return (
            <button
              key={v.id}
              className={`view-nav-item${activeView === v.id ? ' active' : ''}`}
              onClick={() => onViewChange(v.id)}
            >
              <span className="view-nav-label">{v.label}</span>
              {count > 0 && <span className="view-nav-count">{count}</span>}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-header">
        <span>Boxes</span>
        <button className="icon-btn" onClick={onAdd} title="Add box"><Plus size={16} /></button>
      </div>
      {boxes.length === 0 && (
        <p className="sidebar-empty">No boxes yet. Add one to get started.</p>
      )}
      <ul className="sidebar-list">
        {boxes.map((box, i) => (
          <li
            key={box.id}
            className={`sidebar-item ${!box.visible ? 'hidden' : ''} ${dragOver === i ? 'drag-over' : ''}`}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDrop={(e) => handleDrop(e, i)}
            onDragEnd={handleDragEnd}
          >
            <GripVertical size={14} className="drag-handle" />
            <span className="sidebar-dot" style={{ background: box.color || '#378ADD' }} />
            <span className="sidebar-name">{box.name}</span>
            <button
              className="icon-btn small"
              onClick={() => onToggle(box.id)}
              title={box.visible ? 'Hide' : 'Show'}
            >
              {box.visible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
