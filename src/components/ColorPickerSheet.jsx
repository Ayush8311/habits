import { useCallback, useEffect, useRef, useState } from 'react';
import { describeHsv, hexToHsv, hsvToHex, hueName } from '../lib/color.js';
import { Button } from './ui/Button.jsx';
import { Modal } from './ui/Modal.jsx';
import './ColorPickerSheet.css';

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const round = (value) => Math.round(value * 100);

/**
 * Follows a pointer on `element` (tap or drag), reporting fractions 0–1 across and
 * down. Moves are batched to one update per frame; pointer capture keeps the drag
 * going even when the finger leaves the control.
 */
function usePointerPosition(onChange) {
  const frame = useRef(0);
  const latest = useRef(onChange);
  latest.current = onChange;
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const report = (element, event) => {
    const box = element.getBoundingClientRect();
    const x = clamp01((event.clientX - box.left) / box.width);
    const y = clamp01((event.clientY - box.top) / box.height);
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => latest.current(x, y));
  };

  return {
    onPointerDown: (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      report(event.currentTarget, event);
    },
    onPointerMove: (event) => {
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) report(event.currentTarget, event);
    },
  };
}

/**
 * Custom colour picker: a large saturation/brightness board for the current hue,
 * a full-spectrum hue slider, and a live preview. Nothing is saved until Apply;
 * Cancel, the close button, Escape or Android Back leave the habit's colour as it
 * was. Colours are chosen in HSV and converted to the stored '#rrggbb' only on Apply.
 */
export function ColorPickerSheet({ initialColor, onApply, onClose }) {
  const [hsv, setHsv] = useState(() => {
    const start = hexToHsv(initialColor);
    // A grey has no hue of its own; start the board on green rather than red.
    return start.s < 0.02 ? { ...start, h: 140 } : start;
  });
  const color = hsvToHex(hsv);
  const pure = hsvToHex({ h: hsv.h, s: 1, v: 1 });

  const board = usePointerPosition(useCallback((x, y) => setHsv((current) => ({ ...current, s: x, v: 1 - y })), []));
  const hue = usePointerPosition(useCallback((x) => setHsv((current) => ({ ...current, h: x * 360 })), []));

  const nudgeBoard = (event) => {
    const step = event.shiftKey ? 0.1 : 0.02;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    setHsv((current) => ({ ...current, s: clamp01(current.s + move[0]), v: clamp01(current.v + move[1]) }));
  };
  const nudgeHue = (event) => {
    const step = event.shiftKey ? 30 : 4;
    const delta = { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step }[event.key];
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setHsv((current) => ({ ...current, h: event.key === 'Home' ? 0 : 359 }));
      return;
    }
    if (delta === undefined) return;
    event.preventDefault();
    setHsv((current) => ({ ...current, h: (current.h + delta + 360) % 360 }));
  };

  return (
    <Modal
      title="Custom color"
      onClose={onClose}
      className="color-sheet"
      footer={(close) => (
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onApply(color);
              close();
            }}
          >
            Apply color
          </Button>
        </>
      )}
    >
      <div className="color-sheet-body" data-no-page-swipe>
        <div className="color-preview" aria-live="polite">
          <span className="color-preview-swatches" aria-hidden="true">
            <span className="color-preview-old" style={{ background: initialColor }} />
            <span className="color-preview-new" style={{ background: color }} />
          </span>
          <span className="color-preview-text">
            <span className="color-preview-label">Preview</span>
            <span className="color-preview-name">{describeHsv(hsv)}</span>
          </span>
        </div>

        <div
          className="color-board"
          style={{ '--hue': pure }}
          role="slider"
          tabIndex={0}
          aria-label="Saturation and brightness"
          aria-valuetext={`${describeHsv(hsv)}: saturation ${round(hsv.s)}%, brightness ${round(hsv.v)}%`}
          aria-valuenow={round(hsv.s)}
          aria-valuemin={0}
          aria-valuemax={100}
          onKeyDown={nudgeBoard}
          {...board}
        >
          <span
            className="color-board-thumb"
            style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: color }}
            aria-hidden="true"
          />
        </div>

        <div
          className="color-hue"
          role="slider"
          tabIndex={0}
          aria-label="Hue"
          aria-valuemin={0}
          aria-valuemax={359}
          aria-valuenow={Math.round(hsv.h)}
          aria-valuetext={hueName(hsv.h)}
          onKeyDown={nudgeHue}
          {...hue}
        >
          <span className="color-hue-thumb" style={{ left: `${(hsv.h / 360) * 100}%`, background: pure }} aria-hidden="true" />
        </div>
      </div>
    </Modal>
  );
}
