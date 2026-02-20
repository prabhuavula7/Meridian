import React, { useState, lazy, Suspense } from 'react';
import { Bot, KeyRound, Map, Upload } from 'lucide-react';
import Header from './components/Header';
import ErrorBoundary from './components/ErrorBoundary';
import { debugLog } from './utils/logger';

// Lazy load heavy components for better performance
const DataUpload = lazy(() => import('./components/DataUpload'));
const LeafletMap = lazy(() => import('./components/LeafletMap'));
const AnalysisResults = lazy(() => import('./components/AnalysisResults'));
const OpenAIConfig = lazy(() => import('./components/OpenAIConfig'));


function App() {
  const [uploadedData, setUploadedData] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [activeSection, setActiveSection] = useState('upload');

  const handleDataUpload = (uploadResult) => {
    debugLog('App', 'handleDataUpload triggered', {
      hasUploadResult: Boolean(uploadResult),
      hasData: Boolean(uploadResult?.data),
      hasAnalysisResults: Boolean(uploadResult?.analysisResults),
    });

    // Handle the new data structure from enhanced upload
    if (uploadResult && uploadResult.data) {
      setUploadedData(uploadResult.data);
      
      // If we have analysis results, set them and go to analysis
      if (uploadResult.analysisResults) {
        setAnalysisResults(uploadResult.analysisResults);
        setActiveSection('analysis');
      } else {
        setActiveSection('map');
      }
    } else {
      // Fallback for backward compatibility
      setUploadedData(uploadResult);
      setActiveSection('map');
    }
  };

  const handleAnalysisComplete = (results) => {
    debugLog('App', 'handleAnalysisComplete called', {
      hasResults: Boolean(results),
      confidenceScore: results?.confidenceScore,
    });
    setAnalysisResults(results);
    setActiveSection('analysis');
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-dark-950">
        <Header />
        
        <main className="container mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveSection('upload')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeSection === 'upload'
                ? 'bg-primary-600 text-white'
                : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <Upload size={16} />
              <span>Data Upload</span>
            </span>
          </button>
          <button
            onClick={() => setActiveSection('map')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeSection === 'map'
                ? 'bg-primary-600 text-white'
                : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
            }`}
            disabled={!uploadedData}
          >
            <span className="inline-flex items-center gap-2">
              <Map size={16} />
              <span>Interactive Map</span>
            </span>
          </button>
          <button
            onClick={() => setActiveSection('analysis')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeSection === 'analysis'
                ? 'bg-primary-600 text-white'
                : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
            }`}
            disabled={!uploadedData}
          >
            <span className="inline-flex items-center gap-2">
              <Bot size={16} />
              <span>AI Analysis</span>
            </span>
          </button>
          <button
            onClick={() => setActiveSection('openai')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeSection === 'openai'
                ? 'bg-primary-600 text-white'
                : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <KeyRound size={16} />
              <span>OpenAI Config</span>
            </span>
          </button>

        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {activeSection === 'upload' && (
            <Suspense fallback={<div className="card p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div><p className="text-dark-300">Loading data upload...</p></div>}>
              <DataUpload onDataUpload={handleDataUpload} />
            </Suspense>
          )}
          
          {activeSection === 'map' && uploadedData && (
            <Suspense fallback={<div className="card p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div><p className="text-dark-300">Loading interactive map...</p></div>}>
              <LeafletMap 
                data={uploadedData} 
                onAnalysisComplete={handleAnalysisComplete}
              />
            </Suspense>
          )}
          
          {activeSection === 'analysis' && (
            <Suspense fallback={<div className="card p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div><p className="text-dark-300">Loading analysis results...</p></div>}>
              <AnalysisResults 
                data={analysisResults}
              />
            </Suspense>
          )}
          
          {activeSection === 'openai' && (
            <Suspense fallback={<div className="card p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div><p className="text-dark-300">Loading OpenAI configuration...</p></div>}>
              <OpenAIConfig 
                onConfigComplete={() => {
                  setActiveSection('upload');
                }}
              />
            </Suspense>
          )}
          

        </div>
      </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
