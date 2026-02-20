import React, { Suspense, lazy, useMemo, useState } from 'react';
import { AlertTriangle, ChartNoAxesCombined, LayoutDashboard, Route, Upload, Wrench } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary';
import AppShell from './components/layout/AppShell';
import DashboardPage from './pages/DashboardPage';
import InsightsPage from './pages/InsightsPage';
import DisruptionDetailPage from './pages/DisruptionDetailPage';
import { buildSupplyChainModel } from './data/supplyChainViewModel';
import { useTheme } from './components/theme/ThemeProvider';

const UploadPage = lazy(() => import('./pages/UploadPage'));
const OpenAIPage = lazy(() => import('./pages/OpenAIPage'));

const LoadingView = ({ label }) => (
  <div className="surface rounded-lg p-8 text-center">
    <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    <p className="text-sm text-foreground-muted">Loading {label}...</p>
  </div>
);

function App() {
  const { theme } = useTheme();
  const [uploadedData, setUploadedData] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');

  const model = useMemo(() => buildSupplyChainModel(uploadedData || []), [uploadedData]);

  const navItems = useMemo(() => ([
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'insights', label: 'Insights', icon: ChartNoAxesCombined, badge: model.kpis.highRiskLanes ? `${model.kpis.highRiskLanes}` : null },
    { id: 'disruption', label: 'Disruption Detail', icon: AlertTriangle },
    { id: 'upload', label: 'Data Upload', icon: Upload },
    { id: 'openai', label: 'OpenAI Config', icon: Wrench },
  ]), [model.kpis.highRiskLanes]);

  const alerts = useMemo(
    () => model.incidents.map((incident) => ({
      id: incident.id,
      title: incident.title,
      message: incident.message,
      priority: incident.priority,
    })),
    [model.incidents]
  );

  const handleDataUpload = (uploadResult) => {
    if (!uploadResult) {
      return;
    }

    const rows = uploadResult.data || uploadResult;
    setUploadedData(Array.isArray(rows) ? rows : []);

    if (uploadResult.analysisResults) {
      setAnalysisResults(uploadResult.analysisResults);
    }

    setActiveView('dashboard');
  };

  const renderView = () => {
    if (activeView === 'dashboard') {
      return (
        <DashboardPage
          model={model}
          theme={theme}
          onOpenDisruption={() => setActiveView('disruption')}
        />
      );
    }

    if (activeView === 'insights') {
      return <InsightsPage model={model} />;
    }

    if (activeView === 'disruption') {
      return <DisruptionDetailPage model={model} theme={theme} analysisResults={analysisResults} />;
    }

    if (activeView === 'upload') {
      return (
        <Suspense fallback={<LoadingView label="upload workspace" />}>
          <UploadPage onDataUpload={handleDataUpload} />
        </Suspense>
      );
    }

    if (activeView === 'openai') {
      return (
        <Suspense fallback={<LoadingView label="model configuration" />}>
          <OpenAIPage onConfigured={() => setActiveView('dashboard')} />
        </Suspense>
      );
    }

    return (
      <div className="surface rounded-lg p-6">
        <p className="text-sm text-foreground-muted">Unknown view selected.</p>
      </div>
    );
  };

  return (
    <ErrorBoundary>
      <AppShell items={navItems} activeView={activeView} onViewChange={setActiveView} alerts={alerts}>
        {renderView()}
        {analysisResults ? (
          <div className="mt-4 rounded-md border border-border bg-surface/70 px-4 py-3 text-sm text-foreground-muted">
            <p className="inline-flex items-center gap-2 font-medium text-foreground">
              <Route size={15} className="text-accent-glow" />
              Latest AI run saved with confidence {Math.round((analysisResults.confidenceScore || 0) * 100)}%.
            </p>
            <p className="mt-1">Open disruption detail and insights tabs to review mitigation outcomes.</p>
          </div>
        ) : null}
      </AppShell>
    </ErrorBoundary>
  );
}

export default App;
