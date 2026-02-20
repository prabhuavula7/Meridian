import React from 'react';
import { Bell, Command, Search, Sparkles, UserRound } from 'lucide-react';
import ThemeToggle from '../theme/ThemeToggle';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';

const TopBar = ({ alerts = [] }) => {
  const hasHighAlert = alerts.some((alert) => alert.priority === 'high');

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/80 px-5 py-3 backdrop-blur-2xl">
      <div className="flex items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle" />
          <Input placeholder="Search lanes, ports, disruptions" className="h-10 pl-9 pr-24" />
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-surface-hover px-1.5 py-0.5 font-mono text-[10px] text-foreground-subtle">
            <span className="inline-flex items-center gap-1"><Command size={10} />K</span>
          </kbd>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell size={17} />
              {alerts.length > 0 ? (
                <span
                  className={`absolute right-2 top-2 h-2 w-2 rounded-full ${hasHighAlert ? 'bg-danger' : 'bg-warning'}`}
                  aria-hidden="true"
                />
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Active Alerts</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {alerts.length === 0 ? (
              <DropdownMenuItem disabled>No active alerts</DropdownMenuItem>
            ) : (
              alerts.slice(0, 5).map((alert) => (
                <DropdownMenuItem key={alert.id} className="items-start gap-2">
                  <div className="pt-1">
                    <span className={`inline-block h-2 w-2 rounded-full ${alert.priority === 'high' ? 'bg-danger' : 'bg-warning'}`} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{alert.title}</p>
                    <p className="text-xs text-foreground-muted">{alert.message}</p>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-2 px-3">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface-hover">
                <UserRound size={14} />
              </span>
              <span className="hidden text-sm sm:inline">Ops Lead</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="flex items-center gap-2">
              <Sparkles size={14} className="text-accent" />
              <span>Meridian Operator</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              Profile
              <Badge variant="default" className="ml-auto">Beta</Badge>
            </DropdownMenuItem>
            <DropdownMenuItem>Keyboard Shortcuts</DropdownMenuItem>
            <DropdownMenuItem>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default TopBar;
