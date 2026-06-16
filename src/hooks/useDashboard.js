import { useState } from 'react';
import { DEFAULT_BOXES } from '../queries/presets';

const STORAGE_KEY = 'bc_telemetry_boxes';

function load() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const saved = JSON.parse(s);
      const savedPresetIds = new Set(saved.map((b) => b.presetId).filter(Boolean));
      const missing = DEFAULT_BOXES.filter((b) => b.presetId && !savedPresetIds.has(b.presetId));
      return missing.length > 0 ? [...saved, ...missing] : saved;
    }
  } catch {}
  return DEFAULT_BOXES;
}

function save(boxes) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(boxes)); } catch {}
}

let _id = Date.now();
function uid() { return String(++_id); }

export function useDashboard() {
  const [boxes, setBoxes] = useState(load);

  const update = (next) => { setBoxes(next); save(next); };

  const addBox = (box) => {
    const next = [...boxes, { ...box, id: uid(), visible: true }];
    update(next);
  };

  const removeBox = (id) => update(boxes.filter((b) => b.id !== id));

  const toggleBox = (id) =>
    update(boxes.map((b) => (b.id === id ? { ...b, visible: !b.visible } : b)));

  const updateBox = (id, patch) =>
    update(boxes.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const reorderBoxes = (fromIndex, toIndex) => {
    const next = [...boxes];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    update(next);
  };

  const resetToDefault = () => update(DEFAULT_BOXES);

  return { boxes, addBox, removeBox, toggleBox, updateBox, reorderBoxes, resetToDefault };
}
