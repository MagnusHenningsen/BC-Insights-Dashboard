import { useState } from 'react';
import { DEFAULT_BOXES } from '../queries/presets';

const STORAGE_KEY = 'bc_telemetry_boxes';
const VERSION_KEY  = 'bc_telemetry_schema_version';
const SCHEMA_VERSION = 4;

function save(boxes) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(boxes)); } catch {}
}

function load() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const storedVersion = Number(localStorage.getItem(VERSION_KEY) || 0);
      let boxes = JSON.parse(s);

      if (storedVersion < SCHEMA_VERSION) {
        // Backfill missing presetIds by matching saved box names to DEFAULT_BOXES names.
        // This repairs boxes that were saved before presetId was introduced.
        const presetByName = new Map(DEFAULT_BOXES.map((b) => [b.name, b.presetId]));
        boxes = boxes.map((b) => b.presetId ? b : { ...b, presetId: presetByName.get(b.name) });

        // Add any presets that are entirely absent.
        const savedPresetIds = new Set(boxes.map((b) => b.presetId).filter(Boolean));
        const missing = DEFAULT_BOXES.filter((b) => b.presetId && !savedPresetIds.has(b.presetId));
        if (missing.length > 0) boxes = [...boxes, ...missing];

        // Remove boxes for presets that no longer exist (e.g. removed _by_company presets).
        const validPresetIds = new Set(DEFAULT_BOXES.map((b) => b.presetId).filter(Boolean));
        boxes = boxes.filter((b) => !b.presetId || validPresetIds.has(b.presetId));

        // Remove duplicate presets — keep first occurrence (user's saved visibility/state).
        const seen = new Set();
        boxes = boxes.filter((b) => {
          if (!b.presetId) return true;
          if (seen.has(b.presetId)) return false;
          seen.add(b.presetId);
          return true;
        });

        // Re-sort presets to match DEFAULT_BOXES order.
        const presetOrder = new Map(DEFAULT_BOXES.map((b, i) => [b.presetId, i]));
        const presets = boxes
          .filter((b) => b.presetId)
          .sort((a, b) => (presetOrder.get(a.presetId) ?? 999) - (presetOrder.get(b.presetId) ?? 999));
        const customs = boxes.filter((b) => !b.presetId);
        boxes = [...presets, ...customs];

        localStorage.setItem(VERSION_KEY, String(SCHEMA_VERSION));
        save(boxes);
      } else {
        // Schema is current — just append any newly added presets.
        const savedPresetIds = new Set(boxes.map((b) => b.presetId).filter(Boolean));
        const missing = DEFAULT_BOXES.filter((b) => b.presetId && !savedPresetIds.has(b.presetId));
        if (missing.length > 0) {
          boxes = [...boxes, ...missing];
          save(boxes);
        }
      }

      return boxes;
    }
  } catch {}
  return DEFAULT_BOXES;
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
