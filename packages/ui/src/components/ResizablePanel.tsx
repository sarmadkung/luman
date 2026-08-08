import { useCallback, useRef, useState, type ReactNode } from 'react';
import './ResizablePanel.css';

export interface ResizablePanelProps {
  readonly children: ReactNode;
  readonly initialWidth?: number;
  readonly minWidth?: number;
  readonly maxWidth?: number;
  /** Which edge carries the drag handle. */
  readonly side?: 'right' | 'left';
}

/** A horizontally resizable panel with a keyboard-accessible drag handle. */
export function ResizablePanel({
  children,
  initialWidth = 280,
  minWidth = 180,
  maxWidth = 520,
  side = 'right',
}: ResizablePanelProps) {
  const [width, setWidth] = useState(initialWidth);
  const dragging = useRef(false);

  const clamp = useCallback(
    (w: number) => Math.max(minWidth, Math.min(maxWidth, w)),
    [minWidth, maxWidth],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    setWidth((w) => clamp(side === 'right' ? w + e.movementX : w - e.movementX));
  };
  const onPointerUp = () => {
    dragging.current = false;
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setWidth((w) => clamp(w - 16));
    if (e.key === 'ArrowRight') setWidth((w) => clamp(w + 16));
  };

  return (
    <div className="lm-resizable" style={{ width }}>
      <div className="lm-resizable__content">{children}</div>
      <div
        className={`lm-resizable__handle lm-resizable__handle--${side}`}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
