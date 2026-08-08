import type { ReactNode } from 'react';
import { Icon, type LucideIcon } from './Icon';
import './SidebarItem.css';

export interface SidebarItemProps {
  readonly icon?: LucideIcon;
  readonly label: string;
  readonly active?: boolean;
  readonly collapsed?: boolean;
  readonly onClick?: () => void;
  /** Optional render override (e.g. to wrap in a router link). */
  readonly as?: (props: { className: string; children: ReactNode }) => ReactNode;
}

/** A single sidebar navigation row. Presentational; routing is caller-owned. */
export function SidebarItem({ icon, label, active, collapsed, onClick, as }: SidebarItemProps) {
  const className = ['lm-sideitem', active && 'lm-sideitem--active'].filter(Boolean).join(' ');
  const content = (
    <>
      {icon != null && <Icon icon={icon} size="sm" />}
      {!collapsed && <span className="lm-sideitem__label">{label}</span>}
    </>
  );
  if (as) return <>{as({ className, children: content })}</>;
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      title={collapsed ? label : undefined}
    >
      {content}
    </button>
  );
}
