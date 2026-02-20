import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bot,
  Database,
  Download,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Wrench,
} from 'lucide-react';
import OpenAIConfig from '../OpenAIConfig';
import { checkAnalysisServiceHealth, checkBackendHealth, getAnalysisStats } from '../../utils/backendApi';
import { MAP_CONFIG } from '../../config/mapConfig';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';

const formatTimestamp = (isoString) => {
  if (!isoString) {
    return 'Not yet checked';
  }

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return 'Invalid timestamp';
  }

  return date.toLocaleString();
};

const StatusRow = ({ icon: Icon, label, value, healthy }) => (
  <div className="flex items-center justify-between rounded-md border border-border bg-surface-hover/65 px-3 py-2">
    <div className="inline-flex items-center gap-2 text-sm text-foreground-muted">
      <Icon size={15} />
      <span>{label}</span>
    </div>
    <div className="inline-flex items-center gap-2">
      <Badge variant={healthy ? 'success' : 'danger'}>
        {healthy ? 'Healthy' : 'Issue'}
      </Badge>
      <span className="text-xs text-foreground-subtle">{value}</span>
    </div>
  </div>
);

const AdminSettingsPanel = ({ onConfigComplete }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const [adminNotes, setAdminNotes] = useState(
    'Operational runbook notes: rotate provider keys monthly and verify diagnostics before production demos.'
  );
  const [health, setHealth] = useState({
    backend: false,
    analysis: false,
    openAIModel: 'unknown',
    analysisStatus: 'unknown',
  });
  const [analysisStats, setAnalysisStats] = useState(null);

  const refreshDiagnostics = useCallback(async () => {
    setIsRefreshing(true);
    setActionMessage('');

    try {
      const [backendAvailable, analysisHealthResponse, analysisStatsResponse] = await Promise.all([
        checkBackendHealth(),
        checkAnalysisServiceHealth().catch(() => null),
        getAnalysisStats().catch(() => null),
      ]);

      const analysisHealthy = Boolean(
        analysisHealthResponse?.success &&
        analysisHealthResponse?.data?.status === 'operational'
      );

      setHealth({
        backend: Boolean(backendAvailable),
        analysis: analysisHealthy,
        openAIModel: analysisHealthResponse?.data?.openai?.model || 'unknown',
        analysisStatus: analysisHealthResponse?.data?.openai?.status || 'unknown',
      });

      setAnalysisStats(analysisStatsResponse?.success ? analysisStatsResponse.data : null);
      setLastCheckedAt(new Date().toISOString());
    } catch (error) {
      setActionMessage(`Diagnostics refresh failed: ${error.message}`);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refreshDiagnostics();
  }, [refreshDiagnostics]);

  const mapToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || MAP_CONFIG.MAPBOX_ACCESS_TOKEN;
  const hasMapToken = Boolean(
    mapToken &&
    mapToken !== 'your_mapbox_access_token_here' &&
    mapToken.trim().length > 20
  );
  const mapTokenSource = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN ? 'root .env' : 'mapConfig fallback';
  const maskedMapToken = hasMapToken
    ? `${mapToken.slice(0, 8)}...${mapToken.slice(-4)}`
    : 'Not configured';

  const runtimeSummary = useMemo(
    () => ({
      apiBaseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5050/api/v1',
      mapTokenSource,
      debugLogs:
        process.env.REACT_APP_DEBUG_LOGS === 'false'
          ? 'disabled'
          : process.env.REACT_APP_DEBUG_LOGS === 'true'
            ? 'enabled'
            : 'auto',
      model: process.env.REACT_APP_OPENAI_MODEL || 'gpt-4',
    }),
    [mapTokenSource]
  );

  const handleClearApiKey = () => {
    localStorage.removeItem('openai_api_key');
    setActionMessage('Cleared locally stored OpenAI API key.');
  };

  const handleClearLocalCaches = () => {
    localStorage.removeItem('app_errors');
    localStorage.removeItem('meridian-theme');
    setActionMessage('Cleared local diagnostics/theme cache.');
  };

  const handleDownloadDiagnostics = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      health,
      analysisStats,
      runtimeSummary,
      adminNotes,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meridian-admin-diagnostics-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setActionMessage('Downloaded diagnostics bundle.');
  };

  return (
    <div className="space-y-4">
      <div className="surface rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-foreground-subtle">Admin Console</p>
            <h3 className="mt-1 font-display text-xl font-semibold">Settings and Platform Controls</h3>
            <p className="mt-1 text-sm text-foreground-muted">
              Manage integrations, verify service posture, and run operational admin actions.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void refreshDiagnostics()}
            disabled={isRefreshing}
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Refreshing' : 'Refresh Diagnostics'}
          </Button>
        </div>
        <p className="mt-3 text-xs text-foreground-subtle">
          Last diagnostics check: {formatTimestamp(lastCheckedAt)}
        </p>
      </div>

      {actionMessage ? (
        <div className="rounded-md border border-info/40 bg-info/10 px-3 py-2 text-sm text-info">
          {actionMessage}
        </div>
      ) : null}

      <Tabs defaultValue="integrations">
        <TabsList className="w-full justify-start gap-1 overflow-x-auto">
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="platform">Platform</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-12">
            <Card variant="glass" className="xl:col-span-7">
              <CardHeader>
                <div>
                  <CardTitle>Provider Health</CardTitle>
                  <CardDescription>Backend and AI service readiness for operator workflows.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <StatusRow
                  icon={Activity}
                  label="Backend API"
                  value={health.backend ? 'Connected' : 'Unavailable'}
                  healthy={health.backend}
                />
                <StatusRow
                  icon={Bot}
                  label="Analysis Service"
                  value={health.analysis ? `${health.openAIModel}` : 'Disconnected'}
                  healthy={health.analysis}
                />
                <StatusRow
                  icon={Database}
                  label="Map Provider"
                  value={maskedMapToken}
                  healthy={hasMapToken}
                />
                <StatusRow
                  icon={KeyRound}
                  label="OpenAI Provider Status"
                  value={health.analysisStatus}
                  healthy={health.analysisStatus === 'connected'}
                />
              </CardContent>
            </Card>

            <Card variant="default" className="xl:col-span-5">
              <CardHeader>
                <div>
                  <CardTitle>Runtime Profile</CardTitle>
                  <CardDescription>Current frontend environment and integration sources.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-md border border-border bg-surface-hover/65 p-3">
                  <p className="text-xs uppercase tracking-wide text-foreground-subtle">API Base URL</p>
                  <p className="mt-1 font-mono text-xs text-foreground">{runtimeSummary.apiBaseUrl}</p>
                </div>
                <div className="rounded-md border border-border bg-surface-hover/65 p-3">
                  <p className="text-xs uppercase tracking-wide text-foreground-subtle">Map Token Source</p>
                  <p className="mt-1 text-foreground">{runtimeSummary.mapTokenSource}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-border bg-surface-hover/65 p-3">
                    <p className="text-xs uppercase tracking-wide text-foreground-subtle">Debug Logs</p>
                    <p className="mt-1 text-foreground">{runtimeSummary.debugLogs}</p>
                  </div>
                  <div className="rounded-md border border-border bg-surface-hover/65 p-3">
                    <p className="text-xs uppercase tracking-wide text-foreground-subtle">Default Model</p>
                    <p className="mt-1 text-foreground">{runtimeSummary.model}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <OpenAIConfig onConfigComplete={onConfigComplete} />
        </TabsContent>

        <TabsContent value="platform" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card variant="glass">
              <CardHeader className="pb-2">
                <CardDescription>Total Analyses</CardDescription>
                <CardTitle>{analysisStats?.totalAnalyses ?? 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card variant="glass">
              <CardHeader className="pb-2">
                <CardDescription>Avg Processing Time</CardDescription>
                <CardTitle>{analysisStats?.averageProcessingTime ?? 0} ms</CardTitle>
              </CardHeader>
            </Card>
            <Card variant="glass">
              <CardHeader className="pb-2">
                <CardDescription>Success Rate</CardDescription>
                <CardTitle>{Math.round((analysisStats?.successRate ?? 0) * 100)}%</CardTitle>
              </CardHeader>
            </Card>
            <Card variant="glass">
              <CardHeader className="pb-2">
                <CardDescription>Last Analysis</CardDescription>
                <CardTitle className="text-base">
                  {analysisStats?.lastAnalysis ? formatTimestamp(analysisStats.lastAnalysis) : 'N/A'}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Operational Notes</CardTitle>
                <CardDescription>
                  Keep release and support notes close to runtime diagnostics for quick handoffs.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={adminNotes}
                onChange={(event) => setAdminNotes(event.target.value)}
                rows={7}
                placeholder="Capture runbook notes, release caveats, and support escalations."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin" className="space-y-4">
          <Card variant="default">
            <CardHeader>
              <div>
                <CardTitle>Administrative Actions</CardTitle>
                <CardDescription>
                  Local maintenance utilities for diagnostics, key hygiene, and operator troubleshooting.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <Button type="button" variant="secondary" onClick={handleClearApiKey}>
                <KeyRound size={14} />
                Clear Local API Key
              </Button>
              <Button type="button" variant="secondary" onClick={handleClearLocalCaches}>
                <Trash2 size={14} />
                Clear Local Caches
              </Button>
              <Button type="button" variant="primary" onClick={handleDownloadDiagnostics}>
                <Download size={14} />
                Download Diagnostics
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card variant="glass">
              <CardHeader>
                <div>
                  <CardTitle className="inline-flex items-center gap-2">
                    <ShieldCheck size={16} />
                    Security Posture
                  </CardTitle>
                  <CardDescription>Current operational guardrails for this workspace.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-foreground-muted">
                <p>• API keys are persisted only in local browser storage.</p>
                <p>• Backend requests include request IDs for traceability.</p>
                <p>• Rate limiting is enforced on analysis and enrichment endpoints.</p>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader>
                <div>
                  <CardTitle className="inline-flex items-center gap-2">
                    <Wrench size={16} />
                    Support Workflow
                  </CardTitle>
                  <CardDescription>Recommended checks before escalating incidents.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-foreground-muted">
                <p>1. Refresh diagnostics and verify backend health.</p>
                <p>2. Validate map token source and API base URL.</p>
                <p>3. Export diagnostics bundle for reproducible bug reports.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettingsPanel;
