import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

const SidebarNav = ({ items, activeView, onViewChange, collapsed, onToggle }) => {
  return (
    <aside
      className={cn(
        'relative flex h-full flex-col border-r border-border bg-surface/75 backdrop-blur-xl transition-all duration-200 ease-expo',
        collapsed ? 'w-20' : 'w-72'
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={`${process.env.PUBLIC_URL}/meridian-mark.svg`}
            alt="Meridian AI logo"
            className="h-9 w-9 shrink-0 rounded-md border border-border bg-background-elevated p-0.5 shadow-soft"
          />
          <div className={cn('min-w-0 transition-opacity duration-200', collapsed && 'opacity-0 pointer-events-none')}>
            <p className="font-display text-lg font-semibold tracking-tight">Meridian AI</p>
            <p className="text-xs uppercase tracking-[0.14em] text-foreground-subtle">Control Plane</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onToggle} aria-label="Toggle sidebar">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
      </div>

      <nav className="flex-1 space-y-1.5 p-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.id === activeView;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              className={cn(
                'group flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-all duration-200 ease-expo',
                active
                  ? 'border-border-accent bg-accent/12 text-foreground shadow-soft'
                  : 'border-transparent text-foreground-muted hover:border-border hover:bg-surface-hover hover:text-foreground'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <span
                className={cn(
                  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border',
                  active
                    ? 'border-border-accent bg-accent/18 text-accent-glow'
                    : 'border-border bg-surface text-foreground-subtle group-hover:text-foreground'
                )}
              >
                <Icon size={16} />
              </span>
              <span className={cn('flex-1 truncate', collapsed && 'hidden')}>{item.label}</span>
              {!collapsed && item.badge ? (
                <Badge variant={active ? 'accent' : 'default'}>{item.badge}</Badge>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className={cn('rounded-md border border-border bg-surface px-3 py-2', collapsed && 'px-2 py-2 text-center')}>
          <p className={cn('text-xs text-foreground-subtle', collapsed && 'hidden')}>System posture</p>
          <p className="text-sm font-semibold text-success">All Systems Green</p>
        </div>
      </div>
    </aside>
  );
};

export default SidebarNav;
