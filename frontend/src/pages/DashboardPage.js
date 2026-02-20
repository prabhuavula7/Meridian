import React from 'react';
import { Activity, AlertTriangle, ArrowRight, Route, ShieldAlert } from 'lucide-react';
import SupplyChainMap from '../components/maps/SupplyChainMap';
import RiskTrendChart from '../components/charts/RiskTrendChart';
import ModeMixChart from '../components/charts/ModeMixChart';
import { ChartCard, InsightCard, MapCard, MetricCard } from '../components/chrome/DataChrome';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { currency } from '../data/supplyChainViewModel';

const DashboardPage = ({ model, theme, onOpenDisruption }) => {
  const { kpis, incidents, routes, hubs, monthlyBaseline, transportMix } = model;

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="On-time Fulfillment"
          value={`${kpis.onTimeRate}%`}
          delta="+1.8% WoW"
          tone="positive"
          subtitle="Across all monitored lanes"
        />
        <MetricCard
          title="Value at Risk"
          value={currency(kpis.valueAtRisk)}
          delta="Live"
          tone="warning"
          subtitle="Modeled 14-day horizon"
        />
        <MetricCard
          title="High-risk Lanes"
          value={kpis.highRiskLanes}
          delta="Action Needed"
          tone="danger"
          subtitle="Risk score >= 65%"
        />
        <MetricCard
          title="Network Coverage"
          value={`${kpis.routes} lanes / ${kpis.hubs} hubs`}
          delta="Synced"
          tone="default"
          subtitle="Map + AI analytics online"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <MapCard
          title="Global Disruption Radar"
          description="Route overlays, disruption heat and hub telemetry in one surface."
          className="xl:col-span-8"
        >
          <SupplyChainMap routes={routes} hubs={hubs} incidents={incidents} theme={theme} className="h-[460px]" />
        </MapCard>

        <div className="space-y-4 xl:col-span-4">
          <div className="surface rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-foreground-subtle">Disruption Feed</p>
                <h3 className="mt-1 font-display text-lg font-semibold">Now impacting lanes</h3>
              </div>
              <Badge variant="warning" className="inline-flex items-center gap-1">
                <Activity size={12} />
                Live
              </Badge>
            </div>
            <div className="mt-4 space-y-2">
              {incidents.slice(0, 4).map((incident) => (
                <button
                  type="button"
                  key={incident.id}
                  onClick={onOpenDisruption}
                  className="w-full rounded-md border border-border bg-surface-hover/60 p-3 text-left transition-colors hover:border-border-hover"
                >
                  <p className="text-sm font-medium">{incident.title}</p>
                  <p className="mt-1 text-xs text-foreground-muted">{incident.message}</p>
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-accent-glow">
                    <AlertTriangle size={12} />
                    {incident.impactRoutes} impacted lanes
                  </p>
                </button>
              ))}
            </div>
            <Button variant="secondary" className="mt-3 w-full" onClick={onOpenDisruption}>
              Open Disruption Detail
              <ArrowRight size={14} />
            </Button>
          </div>

          <div className="surface rounded-lg p-4">
            <p className="text-xs uppercase tracking-wide text-foreground-subtle">Stability Index</p>
            <div className="mt-3 space-y-3 text-sm">
              <p className="inline-flex items-center gap-2 text-foreground-muted">
                <ShieldAlert size={15} className="text-warning" />
                Pacific lanes at elevated weather volatility.
              </p>
              <p className="inline-flex items-center gap-2 text-foreground-muted">
                <Route size={15} className="text-accent" />
                3 contingency corridors currently active.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Service Level Drift" description="Baseline versus disrupted OTIF trajectory.">
          <RiskTrendChart data={monthlyBaseline} />
        </ChartCard>

        <ChartCard title="Transport Mix Pressure" description="Route volume and average risk by transport mode.">
          <ModeMixChart data={transportMix} />
        </ChartCard>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {incidents.slice(0, 3).map((incident) => (
          <InsightCard
            key={incident.id}
            title={incident.title}
            detail={incident.message}
            severity={incident.severity}
            source={`${incident.region} monitoring`}
          />
        ))}
      </section>
    </div>
  );
};

export default DashboardPage;
