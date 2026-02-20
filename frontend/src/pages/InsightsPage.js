import React, { useMemo, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { ChartCard, FilterPanel } from '../components/chrome/DataChrome';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import RegionRiskChart from '../components/charts/RegionRiskChart';
import ModeMixChart from '../components/charts/ModeMixChart';
import LanesTable from '../components/tables/LanesTable';

const InsightsPage = ({ model }) => {
  const [modeFilter, setModeFilter] = useState('all');
  const [minRiskFilter, setMinRiskFilter] = useState('0');

  const filteredLanes = useMemo(() => {
    const minRisk = Number(minRiskFilter);
    return model.lanes.filter((lane) => {
      const modeMatch = modeFilter === 'all' ? true : lane.mode === modeFilter;
      const riskMatch = lane.riskScore >= minRisk;
      return modeMatch && riskMatch;
    });
  }, [model.lanes, modeFilter, minRiskFilter]);

  const filteredMix = useMemo(() => {
    if (modeFilter === 'all') {
      return model.transportMix;
    }

    return model.transportMix.filter((entry) => entry.mode === modeFilter);
  }, [model.transportMix, modeFilter]);

  const resetFilters = () => {
    setModeFilter('all');
    setMinRiskFilter('0');
  };

  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <div className="xl:col-span-3">
        <FilterPanel title="Operational Filters" onReset={resetFilters}>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-foreground-subtle">Transport Mode</p>
            <Select value={modeFilter} onValueChange={setModeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modes</SelectItem>
                <SelectItem value="sea">Sea</SelectItem>
                <SelectItem value="air">Air</SelectItem>
                <SelectItem value="road">Road</SelectItem>
                <SelectItem value="rail">Rail</SelectItem>
                <SelectItem value="multimodal">Multimodal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-foreground-subtle">Minimum Risk Score</p>
            <Select value={minRiskFilter} onValueChange={setMinRiskFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Choose threshold" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Any risk</SelectItem>
                <SelectItem value="0.35">35% and above</SelectItem>
                <SelectItem value="0.5">50% and above</SelectItem>
                <SelectItem value="0.65">65% and above</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border border-border bg-surface-hover/70 p-3 text-xs text-foreground-muted">
            <p className="inline-flex items-center gap-1 font-semibold text-foreground">
              <SlidersHorizontal size={12} />
              Active scope
            </p>
            <p className="mt-1">{filteredLanes.length} lanes currently in focus.</p>
          </div>
        </FilterPanel>
      </div>

      <div className="space-y-4 xl:col-span-9">
        <Tabs defaultValue="risk-overview">
          <TabsList>
            <TabsTrigger value="risk-overview">Risk Overview</TabsTrigger>
            <TabsTrigger value="mode-pressure">Mode Pressure</TabsTrigger>
            <TabsTrigger value="lane-table">Lane Intelligence</TabsTrigger>
          </TabsList>

          <TabsContent value="risk-overview" className="space-y-4">
            <ChartCard title="Regional Risk Concentration" description="Composite risk index by monitored region.">
              <RegionRiskChart data={model.riskByRegion} />
            </ChartCard>
          </TabsContent>

          <TabsContent value="mode-pressure" className="space-y-4">
            <ChartCard title="Transport Pressure and Risk" description="Filtered by current mode selections.">
              <ModeMixChart data={filteredMix} />
            </ChartCard>
          </TabsContent>

          <TabsContent value="lane-table" className="space-y-4">
            <div className="surface rounded-lg p-4">
              <h3 className="font-display text-lg font-semibold">Lane-level Risk Ledger</h3>
              <p className="mt-1 text-sm text-foreground-muted">
                Prioritize reroutes and mitigation sequencing using sortable lane telemetry.
              </p>
              <div className="mt-4">
                <LanesTable data={filteredLanes} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default InsightsPage;
