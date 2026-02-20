import React, { useState, useEffect } from 'react';
import { CircleCheckBig, CircleX, Info, KeyRound } from 'lucide-react';
import { testOpenAIConnection } from '../services/openaiService';
import { debugError, debugLog } from '../utils/logger';

const OpenAIConfig = ({ onConfigComplete }) => {
  const [apiKey, setApiKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    // Check if API key is already configured
    const existingKey = process.env.REACT_APP_OPENAI_API_KEY || localStorage.getItem('openai_api_key');
    if (existingKey && existingKey !== 'your_openai_api_key_here') {
      setApiKey(existingKey);
      setIsConfigured(true);
    }
  }, []);

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: 'Please enter an API key first' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    debugLog('OpenAIConfig', 'Testing OpenAI connection');

    try {
      // Test the connection with the provided API key
      const result = await testOpenAIConnection(apiKey);
      setTestResult(result);
      debugLog('OpenAIConfig', 'OpenAI connection test completed', { success: result.success });

      if (result.success) {
        setIsConfigured(true);
        // Save to localStorage for persistence
        localStorage.setItem('openai_api_key', apiKey);
        onConfigComplete && onConfigComplete(apiKey);
      }
    } catch (error) {
      debugError('OpenAIConfig', 'OpenAI connection test failed', { message: error.message });
      setTestResult({ success: false, message: error.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('openai_api_key', apiKey);
      setIsConfigured(true);
      debugLog('OpenAIConfig', 'API key saved to localStorage');
      onConfigComplete && onConfigComplete(apiKey);
    }
  };

  const handleClearKey = () => {
    localStorage.removeItem('openai_api_key');
    setApiKey('');
    setIsConfigured(false);
    setTestResult(null);
    debugLog('OpenAIConfig', 'API key cleared from localStorage');
  };

  if (isConfigured) {
    return (
      <div className="card p-6 text-center">
        <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">OpenAI API Configured!</h3>
        <p className="text-dark-300 mb-4">
          Your OpenAI API key is configured and ready to use for AI-powered supply chain analysis.
        </p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={handleClearKey}
            className="btn-secondary"
          >
            Change API Key
          </button>
          <button
            onClick={() => onConfigComplete && onConfigComplete(apiKey)}
            className="btn-primary"
          >
            Continue to Analysis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-white mb-4 inline-flex items-center gap-2">
        <KeyRound size={18} />
        <span>Configure OpenAI API</span>
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            OpenAI API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <p className="text-xs text-dark-400 mt-1">
            Get your API key from{' '}
            <a 
              href="https://platform.openai.com/api-keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary-400 hover:underline"
            >
              OpenAI Platform
            </a>
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleTestConnection}
            disabled={isTesting || !apiKey.trim()}
            className="btn-primary flex-1"
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            onClick={handleSaveKey}
            disabled={!apiKey.trim()}
            className="btn-secondary flex-1"
          >
            Save Key
          </button>
        </div>

        {testResult && (
          <div className={`p-3 rounded-lg ${
            testResult.success 
              ? 'bg-green-900/20 border border-green-700 text-green-300'
              : 'bg-red-900/20 border border-red-700 text-red-300'
          }`}>
            <p className="text-sm">
              {testResult.success ? (
                <CircleCheckBig size={16} className="inline mr-1" />
              ) : (
                <CircleX size={16} className="inline mr-1" />
              )}
              {testResult.message}
            </p>
          </div>
        )}

        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
          <h4 className="font-medium text-blue-400 mb-2 inline-flex items-center gap-2">
            <Info size={16} />
            <span>How to Get Your API Key</span>
          </h4>
          <ol className="text-sm text-blue-300 space-y-1">
            <li>1. Go to <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer" className="underline">OpenAI Platform</a></li>
            <li>2. Sign in or create an account</li>
            <li>3. Navigate to API Keys section</li>
            <li>4. Create a new API key</li>
            <li>5. Copy and paste it here</li>
          </ol>
          <p className="text-xs text-blue-400 mt-2">
            Note: Keep your API key secure and never share it publicly.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OpenAIConfig;
