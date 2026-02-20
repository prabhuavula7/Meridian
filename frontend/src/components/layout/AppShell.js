import React, { useState } from 'react';
import AppBackground from './AppBackground';
import SidebarNav from './SidebarNav';
import TopBar from './TopBar';
import { cn } from '../../lib/cn';

const AppShell = ({ items, activeView, onViewChange, alerts, children }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="app-shell relative min-h-screen">
      <AppBackground />

      <div className="relative z-10 flex min-h-screen">
        <div className="hidden md:block">
          <SidebarNav
            items={items}
            activeView={activeView}
            onViewChange={onViewChange}
            collapsed={collapsed}
            onToggle={() => setCollapsed((current) => !current)}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar alerts={alerts} />

          <div className="md:hidden border-b border-border/80 bg-surface/70 px-3 py-2 backdrop-blur-xl">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {items.map((item) => {
                const active = item.id === activeView;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    className={cn(
                      'shrink-0 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors',
                      active
                        ? 'border-border-accent bg-accent/16 text-foreground'
                        : 'border-border bg-surface text-foreground-muted'
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <main className="flex-1 px-4 py-4 md:px-6 md:py-6">
            <div className="mx-auto w-full max-w-[1500px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AppShell;
