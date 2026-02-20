import React, { useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { debugLog } from '../utils/logger';

const AnalysisResults = ({ data }) => {
  const [selectedStrategy, setSelectedStrategy] = useState(null);

  // Check if data is available
  if (!data) {
    return (
      <div className="max-w-7xl mx-auto p-6 text-center">
        <div className="card p-8">
          <h2 className="section-title text-2xl mb-4">No Analysis Data Available</h2>
          <p className="text-dark-300 mb-4">
            Please run the AI analysis from the Interactive Map section first.
          </p>
          <button 
            onClick={() => window.history.back()}
            className="btn-primary"
          >
            <span className="inline-flex items-center gap-2">
              <ArrowLeft size={16} />
              <span>Go Back to Map</span>
            </span>
          </button>
        </div>
      </div>
    );
  }

  // Use the actual data passed from the parent
  const analysisData = data;
  
  // Debug logging
  debugLog('AnalysisResults', 'Received analysis data', {
    hasImpactAnalysis: Boolean(analysisData.impactAnalysis),
    strategies: analysisData.mitigationStrategies?.length || 0,
    insights: analysisData.insights?.length || 0,
  });

  // Chart data preparation with safety checks
  const financialChartData = analysisData.impactAnalysis?.financialImpact?.breakdown ? [
    { name: 'Operational', without: analysisData.impactAnalysis.financialImpact.breakdown.operational || 0, with: (analysisData.impactAnalysis.financialImpact.breakdown.operational || 0) * 0.3 },
    { name: 'Inventory', without: analysisData.impactAnalysis.financialImpact.breakdown.inventory || 0, with: (analysisData.impactAnalysis.financialImpact.breakdown.inventory || 0) * 0.4 },
    { name: 'Transportation', without: analysisData.impactAnalysis.financialImpact.breakdown.transportation || 0, with: (analysisData.impactAnalysis.financialImpact.breakdown.transportation || 0) * 0.25 },
    { name: 'Customer', without: analysisData.impactAnalysis.financialImpact.breakdown.customer || 0, with: (analysisData.impactAnalysis.financialImpact.breakdown.customer || 0) * 0.5 },
    { name: 'Regulatory', without: analysisData.impactAnalysis.financialImpact.breakdown.regulatory || 0, with: (analysisData.impactAnalysis.financialImpact.breakdown.regulatory || 0) * 0.8 }
  ] : [];

  const timeChartData = analysisData.impactAnalysis?.timeImpact?.breakdown ? [
    { name: 'Procurement', without: analysisData.impactAnalysis.timeImpact.breakdown.procurement || 0, with: (analysisData.impactAnalysis.timeImpact.breakdown.procurement || 0) * 0.6 },
    { name: 'Production', without: analysisData.impactAnalysis.timeImpact.breakdown.production || 0, with: (analysisData.impactAnalysis.timeImpact.breakdown.production || 0) * 0.5 },
    { name: 'Transportation', without: analysisData.impactAnalysis.timeImpact.breakdown.transportation || 0, with: (analysisData.impactAnalysis.timeImpact.breakdown.transportation || 0) * 0.3 },
    { name: 'Delivery', without: analysisData.impactAnalysis.timeImpact.breakdown.delivery || 0, with: (analysisData.impactAnalysis.timeImpact.breakdown.delivery || 0) * 0.4 }
  ] : [];

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value) => {
    return `${(value * 100).toFixed(0)}%`;
  };

  // Get severity color
  const getSeverityColor = (severity) => {
    const colors = ['#22c55e', '#eab308', '#f97316', '#ef4444', '#7c2d12'];
    return colors[severity - 1] || colors[0];
  };

  // Get risk level color
  const getRiskLevelColor = (riskLevel) => {
    const colors = { low: '#22c55e', medium: '#eab308', high: '#ef4444' };
    return colors[riskLevel] || colors.medium;
  };

  const handleDownloadFullReport = () => {
    const originalTitle = document.title;
    const timestamp = new Date().toISOString().slice(0, 10);
    document.title = `BentTechAI-Supply-Chain-Report-${timestamp}`;

    if (typeof window.print === 'function') {
      window.print();
    } else {
      alert('PDF export is not supported in this browser.');
    }

    window.setTimeout(() => {
      document.title = originalTitle;
    }, 300);
  };

  return (
    <div className="analysis-report-root max-w-7xl mx-auto p-6 space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <h1 className="section-title text-4xl font-bold">
          AI-Powered Supply Chain Analysis
        </h1>
        <p className="text-lg text-gray-300 max-w-3xl mx-auto">
          Comprehensive risk assessment and mitigation strategies for your supply chain operations
        </p>
        <div className="flex items-center justify-center space-x-4 text-sm text-gray-400">
          <span>Confidence Score: <span className="text-green-400 font-semibold">{formatPercentage(analysisData.confidenceScore || 0.85)}</span></span>
          <span>•</span>
          <span>Analysis Date: {new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* Disaster Scenario Overview */}
      <div className="card p-6">
        <h2 className="section-title text-2xl mb-4">Disaster Scenario</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: getSeverityColor(analysisData.disasterScenario?.severity || 3) }}
              ></div>
              <span className="text-sm text-gray-400">Severity Level {analysisData.disasterScenario?.severity || 3}/5</span>
            </div>
            <h3 className="text-xl font-semibold text-white capitalize">
              {analysisData.disasterScenario?.type?.replace(/_/g, ' ') || 'Supply Chain Disruption'}
            </h3>
            <p className="text-gray-300 leading-relaxed">
              {analysisData.disasterScenario?.description || 'Supply chain disruption affecting multiple routes and locations'}
            </p>
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-gray-400">
                Probability: <span className="text-blue-400 font-semibold">{formatPercentage(analysisData.disasterScenario?.probability || 0.3)}</span>
              </span>
              <span className="text-gray-400">
                Duration: <span className="text-orange-400 font-semibold">{analysisData.disasterScenario?.estimatedDuration || 14} days</span>
              </span>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-white">Affected Regions</h4>
            <div className="space-y-2">
              {(analysisData.disasterScenario?.affectedRegions || ['Global Supply Chain']).map((region, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-gray-300">{region}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Financial Impact */}
        <div className="card p-6 text-center">
          <h3 className="text-lg font-semibold text-white mb-2">Financial Impact</h3>
          <div className="space-y-3">
            <div>
              <p className="text-2xl font-bold text-red-400">
                {formatCurrency(analysisData.impactAnalysis?.financialImpact?.withoutMitigation || 0)}
              </p>
              <p className="text-sm text-gray-400">Without Mitigation</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">
                {formatCurrency(analysisData.impactAnalysis?.financialImpact?.withMitigation || 0)}
              </p>
              <p className="text-sm text-gray-400">With Mitigation</p>
            </div>
            <div className="pt-2 border-t border-gray-700">
              <p className="text-lg font-semibold text-blue-400">
                {formatCurrency(analysisData.impactAnalysis?.financialImpact?.savings || 0)} Saved
              </p>
            </div>
          </div>
        </div>

        {/* Time Impact */}
        <div className="card p-6 text-center">
          <h3 className="text-lg font-semibold text-white mb-2">Time Impact</h3>
          <div className="space-y-3">
            <div>
              <p className="text-2xl font-bold text-red-400">
                {analysisData.impactAnalysis?.timeImpact?.withoutMitigation || 0} days
              </p>
              <p className="text-sm text-gray-400">Without Mitigation</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">
                {analysisData.impactAnalysis?.timeImpact?.withMitigation || 0} days
              </p>
              <p className="text-sm text-gray-400">With Mitigation</p>
            </div>
            <div className="pt-2 border-t border-gray-700">
              <p className="text-lg font-semibold text-blue-400">
                {analysisData.impactAnalysis?.timeImpact?.timeSaved || 0} days Saved
              </p>
            </div>
          </div>
        </div>

        {/* Operational Impact */}
        <div className="card p-6 text-center">
          <h3 className="text-lg font-semibold text-white mb-2">Operational Impact</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xl font-bold text-orange-400">{analysisData.impactAnalysis?.operationalImpact?.affectedRoutes || 0}</p>
                <p className="text-gray-400">Routes</p>
              </div>
              <div>
                <p className="text-xl font-bold text-orange-400">{analysisData.impactAnalysis?.operationalImpact?.affectedLocations || 0}</p>
                <p className="text-gray-400">Locations</p>
              </div>
              <div>
                <p className="text-xl font-bold text-orange-400">{analysisData.impactAnalysis?.operationalImpact?.affectedProducts || 0}</p>
                <p className="text-gray-400">Products</p>
              </div>
              <div>
                <p className="text-xl font-bold text-orange-400">{analysisData.impactAnalysis?.operationalImpact?.customerOrdersAffected || 0}</p>
                <p className="text-gray-400">Orders</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="space-y-8">
        {/* Financial Impact Breakdown */}
        <div className="card p-6">
          <h3 className="section-title text-xl mb-6">Financial Impact Breakdown</h3>
          {financialChartData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f9fafb'
                    }}
                  />
                  <Bar dataKey="without" fill="#ef4444" name="Without Mitigation" />
                  <Bar dataKey="with" fill="#22c55e" name="With Mitigation" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400">
              <p>Financial impact data not available</p>
            </div>
          )}
        </div>

        {/* Time Impact Breakdown */}
        <div className="card p-6">
          <h3 className="section-title text-xl mb-6">Time Impact Breakdown</h3>
          {timeChartData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f9fafb'
                    }}
                  />
                  <Area type="monotone" dataKey="without" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Without Mitigation" />
                  <Area type="monotone" dataKey="with" stackId="2" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} name="With Mitigation" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400">
              <p>Time impact data not available</p>
            </div>
          )}
        </div>
      </div>

      {/* Mitigation Strategies */}
      <div className="card p-6">
        <h3 className="section-title text-2xl mb-6">Mitigation Strategies</h3>
        {(analysisData.mitigationStrategies && analysisData.mitigationStrategies.length > 0) ? (
          <div className="grid md:grid-cols-2 gap-6">
            {analysisData.mitigationStrategies.map((strategy) => (
            <div 
              key={strategy.id} 
              className={`card p-4 cursor-pointer transition-all duration-200 hover:scale-105 ${
                selectedStrategy?.id === strategy.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedStrategy(strategy)}
            >
              <div className="flex items-start justify-between mb-3">
                <h4 className="font-semibold text-white">{strategy.name}</h4>
                <div className="flex items-center space-x-2">
                  <span 
                    className="px-2 py-1 text-xs rounded-full text-white"
                    style={{ backgroundColor: getRiskLevelColor(strategy.riskLevel) }}
                  >
                    {strategy.riskLevel}
                  </span>
                  <span className="text-sm text-gray-400">
                    {formatPercentage(strategy.effectiveness)}
                  </span>
                </div>
              </div>
              <p className="text-gray-300 text-sm mb-3">{strategy.description}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Implementation</p>
                  <p className="text-white font-semibold">{strategy.implementationTime} days</p>
                </div>
                <div>
                  <p className="text-gray-400">Cost</p>
                  <p className="text-white font-semibold">{formatCurrency(strategy.implementationCost)}</p>
                </div>
              </div>
            </div>
          ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>No mitigation strategies available for this scenario</p>
          </div>
        )}

        {/* Strategy Details Modal */}
        {selectedStrategy && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="section-title text-xl">{selectedStrategy.name}</h3>
                <button 
                  onClick={() => setSelectedStrategy(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <p className="text-gray-300">{selectedStrategy.description}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400">Implementation Time</p>
                    <p className="text-white font-semibold">{selectedStrategy.implementationTime} days</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Implementation Cost</p>
                    <p className="text-white font-semibold">{formatCurrency(selectedStrategy.implementationCost)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Effectiveness</p>
                    <p className="text-white font-semibold">{formatPercentage(selectedStrategy.effectiveness)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Risk Level</p>
                    <span 
                      className="px-2 py-1 text-xs rounded-full text-white"
                      style={{ backgroundColor: getRiskLevelColor(selectedStrategy.riskLevel) }}
                    >
                      {selectedStrategy.riskLevel}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 mb-2">Required Resources</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedStrategy.requiredResources.map((resource, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                        {resource}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 mb-2">Dependencies</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedStrategy.dependencies.map((dependency, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-900 text-blue-300 text-xs rounded">
                        {dependency}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Insights and Recommendations */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="section-title text-xl mb-4">Key Insights</h3>
          {(analysisData.insights && analysisData.insights.length > 0) ? (
            <div className="space-y-3">
              {analysisData.insights.map((insight, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-300 text-sm">{insight}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400">
              <p>No insights available</p>
            </div>
          )}
        </div>

        <div className="card p-6">
          <h3 className="section-title text-xl mb-4">Recommendations</h3>
          {(analysisData.recommendations && analysisData.recommendations.length > 0) ? (
            <div className="space-y-3">
              {analysisData.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-400 text-sm">{recommendation}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400">
              <p>No recommendations available</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="no-print flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
        <button
          className="btn-primary px-8 py-3"
          onClick={handleDownloadFullReport}
        >
          Download Full Report (PDF)
        </button>
      </div>
    </div>
  );
};

export default AnalysisResults;
