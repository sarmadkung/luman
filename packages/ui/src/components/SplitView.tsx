import type { ReactNode } from 'react';
import { ResizablePanel } from './ResizablePanel';
import './SplitView.css';

export interface SplitViewProps {
  readonly primary: ReactNode;
  readonly secondary: ReactNode;
  readonly initialPrimaryWidth?: number;
}

/** Two-pane split: a resizable primary pane and a filling secondary pane. */
export function SplitView({ primary, secondary, initialPrimaryWidth = 280 }: SplitViewProps) {
  return (
    <div className="lm-split">
      <ResizablePanel initialWidth={initialPrimaryWidth}>{primary}</ResizablePanel>
      <div className="lm-split__secondary">{secondary}</div>
    </div>
  );
}
