import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowUpRight, Clock3, Flame, ShieldCheck } from 'lucide-react';
import SupplyChainMap from '../components/maps/SupplyChainMap';
import { MapCard } from '../components/chrome/DataChrome';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { currency } from '../data/supplyChainViewModel';

const ACTIONS = [
  {
    id: 'reroute',
    title: 'Shift to contingency lane',
    body: 'Move top 20% critical SKUs from Pacific lane to hybrid air-rail route for next 72 hours.',
    impact: 'Expected delay reduction: 31%',
  },
  {
    id: 'buffer',
    title: 'Raise safety stock threshold',
    body: 'Increase inventory buffers at Rotterdam and Hamburg by 14 days for high-velocity products.',
    impact: 'Stockout probability reduced by 24%',
  },
  {
    id: 'carrier',
    title: 'Engage alternate carrier block',
    body: 'Reserve emergency carrier capacity to offset labor disruption at two affected terminals.',
    impact: 'Capacity uplift: +18%',
  },
];

const timelineTone = {
  warning: 'warning',
  danger: 'danger',
  info: 'accent',
  success: 'success',
};

const DisruptionDetailPage = ({ model, theme }) => {
  const [selectedAction, setSelectedAction] = useState(null);

  const highlightedIncident = model.incidents.find((incident) => incident.severity === 'high') || model.incidents[0];

  const impactedLanes = useMemo(
    () => model.lanes.slice(0, 6),
    [model.lanes]
  );

  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-12">
        <MapCard
          title={highlightedIncident ? highlightedIncident.title : 'Disruption Focus'}
          description={highlightedIncident ? highlightedIncident.message : 'No active disruptions.'}
          className="xl:col-span-8"
        >
          <SupplyChainMap
            routes={model.routes}
            hubs={model.hubs}
            incidents={model.incidents}
            theme={theme}
            focusIncidentId={highlightedIncident ? highlightedIncident.id : null}
            className="h-[470px]"
          />
        </MapCard>

        <div className="space-y-4 xl:col-span-4">
          <div className="surface rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Event Snapshot</h3>
              <Badge variant="danger" className="inline-flex items-center gap-1">
                <Flame size={12} />
                Critical
              </Badge>
            </div>
            <div className="mt-4 space-y-3 text-sm text-foreground-muted">
              <p className="inline-flex items-center gap-2">
                <Clock3 size={14} className="text-warning" />
                Escalation started 47 hours ago
              </p>
              <p className="inline-flex items-center gap-2">
                <AlertTriangle size={14} className="text-danger" />
                {model.kpis.highRiskLanes} lanes are in red-zone thresholds
              </p>
              <p className="inline-flex items-center gap-2">
                <ShieldCheck size={14} className="text-success" />
                Recovery simulation confidence: 82%
              </p>
            </div>
          </div>

          <div className="surface rounded-lg p-4">
            <p className="text-xs uppercase tracking-wide text-foreground-subtle">Recommended Actions</p>
            <div className="mt-3 space-y-2">
              {ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => setSelectedAction(action)}
                  className="w-full rounded-md border border-border bg-surface-hover/70 px-3 py-2 text-left text-sm transition-colors hover:border-border-hover"
                >
                  <span className="inline-flex items-center gap-1 font-medium text-foreground">
                    {action.title}
                    <ArrowUpRight size={13} className="text-accent-glow" />
                  </span>
                  <p className="mt-1 text-xs text-foreground-muted">{action.impact}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <div className="surface rounded-lg p-4 xl:col-span-5">
          <h3 className="font-display text-lg font-semibold">Incident Timeline</h3>
          <div className="mt-4 space-y-4">
            {model.disruptionTimeline.map((event) => (
              <div key={event.id} className="relative pl-6">
                <span className="absolute left-1 top-1.5 h-2.5 w-2.5 rounded-full border border-white/50 bg-accent" />
                <span className="absolute left-2 top-4 h-[calc(100%+8px)] w-px bg-border" />
                <p className="text-xs uppercase tracking-wide text-foreground-subtle">{event.time}</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-sm font-medium">{event.title}</p>
                  <Badge variant={timelineTone[event.state] || 'default'}>{event.state.toUpperCase()}</Badge>
                </div>
                <p className="mt-1 text-sm text-foreground-muted">{event.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="surface rounded-lg p-4 xl:col-span-7">
          <h3 className="font-display text-lg font-semibold">Impacted Lanes</h3>
          <p className="mt-1 text-sm text-foreground-muted">
            Prioritized by risk score and value-at-risk exposure.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {impactedLanes.map((lane) => (
              <div key={lane.id} className="rounded-md border border-border bg-surface-hover/70 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{lane.lane}</p>
                  <Badge variant={lane.riskScore >= 0.65 ? 'danger' : lane.riskScore >= 0.45 ? 'warning' : 'success'}>
                    {Math.round(lane.riskScore * 100)}%
                  </Badge>
                </div>
                <div className="mt-2 space-y-1 text-xs text-foreground-muted">
                  <p>Provider: {lane.provider}</p>
                  <p>Route quality: {Math.round((lane.qualityScore || 0) * 100)}% ({String(lane.qualityTier || 'n/a').toUpperCase()})</p>
                  <p>Pathing: {lane.fallbackUsed ? 'Fallback corridor active' : 'Primary corridor stable'}</p>
                  <p>ETA shift: {lane.etaShiftDays > 0 ? '+' : ''}{lane.etaShiftDays} days</p>
                  <p>Value at risk: {currency(lane.valueAtRisk)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Dialog open={Boolean(selectedAction)} onOpenChange={(open) => !open && setSelectedAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedAction?.title}</DialogTitle>
            <DialogDescription>
              {selectedAction?.body}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-border bg-surface-hover/70 p-3 text-sm text-foreground-muted">
            <p className="font-medium text-foreground">Projected impact</p>
            <p className="mt-1">{selectedAction?.impact}</p>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setSelectedAction(null)}>Close</Button>
            <Button variant="primary">Queue Playbook</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DisruptionDetailPage;
