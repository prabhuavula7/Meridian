import React from 'react';
import { ArrowUpRight, TriangleAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../../lib/cn';

export const MetricCard = ({ title, value, delta, tone = 'default', subtitle }) => {
  const toneMap = {
    default: 'default',
    positive: 'success',
    warning: 'warning',
    danger: 'danger',
  };

  return (
    <Card variant="glass" interactive spotlight className="group">
      <CardHeader className="pb-1">
        <CardDescription>{title}</CardDescription>
        {delta ? <Badge variant={toneMap[tone]}>{delta}</Badge> : null}
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="font-display text-2xl font-semibold tracking-tight">{value}</p>
        {subtitle ? <p className="text-xs text-foreground-subtle">{subtitle}</p> : null}
      </CardContent>
    </Card>
  );
};

export const InsightCard = ({ title, detail, severity = 'medium', source }) => {
  const severityVariant = severity === 'high' ? 'danger' : severity === 'low' ? 'success' : 'warning';

  return (
    <Card interactive spotlight className="group">
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        <Badge variant={severityVariant}>{severity.toUpperCase()}</Badge>
      </CardHeader>
      <CardContent className="space-y-3 pt-1">
        <p className="text-sm text-foreground-muted">{detail}</p>
        <div className="flex items-center justify-between text-xs text-foreground-subtle">
          <span>{source}</span>
          <span className="inline-flex items-center gap-1 text-accent-glow">
            Investigate
            <ArrowUpRight size={13} />
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export const ChartCard = ({ title, description, action, children, className }) => (
  <Card variant="default" interactive className={cn('min-h-[310px]', className)}>
    <CardHeader>
      <div>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </div>
      {action || null}
    </CardHeader>
    <CardContent className="h-[250px]">{children}</CardContent>
  </Card>
);

export const MapCard = ({ title, description, children, className }) => (
  <Card variant="gradient" interactive className={cn('overflow-hidden', className)}>
    <CardHeader>
      <div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>
    </CardHeader>
    <CardContent className="pt-0">{children}</CardContent>
  </Card>
);

export const FilterPanel = ({ title = 'Filters', children, onReset }) => (
  <Card variant="glass" className="sticky top-24">
    <CardHeader>
      <CardTitle className="text-sm uppercase tracking-wide text-foreground-muted">{title}</CardTitle>
      {onReset ? (
        <Button variant="ghost" size="sm" onClick={onReset}>Reset</Button>
      ) : null}
    </CardHeader>
    <CardContent className="space-y-4">{children}</CardContent>
  </Card>
);

export const EmptyState = ({ title, description, actionLabel, onAction }) => (
  <Card className="border-dashed border-border-hover/80">
    <CardContent className="flex min-h-[240px] flex-col items-center justify-center text-center">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface-hover text-warning">
        <TriangleAlert size={20} />
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-foreground-muted">{description}</p>
      {actionLabel && onAction ? (
        <Button className="mt-5" onClick={onAction}>{actionLabel}</Button>
      ) : null}
    </CardContent>
  </Card>
);
