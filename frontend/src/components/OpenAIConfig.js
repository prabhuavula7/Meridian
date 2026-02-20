import React, { useState, useEffect } from 'react';
import { CircleCheckBig, CircleX, Info, KeyRound } from 'lucide-react';
import { testOpenAIConnection } from '../services/openaiService';
import { debugError, debugLog } from '../utils/logger';
import { Button } from './ui/button';
import { Input } from './ui/input';

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

  const canContinue = typeof onConfigComplete === 'function';

  if (isConfigured) {
    return (
      <div className="surface rounded-lg p-6 text-center">
        <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border border-success/40 bg-success/15 text-success">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">OpenAI API Configured</h3>
        <p className="mb-4 text-sm text-foreground-muted">
          Your API key is saved and available for AI-powered supply chain analysis.
        </p>
        <div className="flex justify-center gap-3">
          <Button
            onClick={handleClearKey}
            variant="secondary"
          >
            Change API Key
          </Button>
          {canContinue ? (
            <Button
              onClick={() => onConfigComplete(apiKey)}
              variant="primary"
            >
              Continue to Analysis
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="surface rounded-lg p-6">
      <h3 className="mb-4 inline-flex items-center gap-2 text-lg font-semibold text-foreground">
        <KeyRound size={18} />
        <span>Configure OpenAI API</span>
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground-muted">
            OpenAI API Key
          </label>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
          />
          <p className="mt-1 text-xs text-foreground-subtle">
            Get your API key from{' '}
            <a 
              href="https://platform.openai.com/api-keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-accent-glow hover:underline"
            >
              OpenAI Platform
            </a>
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleTestConnection}
            disabled={isTesting || !apiKey.trim()}
            variant="primary"
            className="flex-1"
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </Button>
          <Button
            onClick={handleSaveKey}
            disabled={!apiKey.trim()}
            variant="secondary"
            className="flex-1"
          >
            Save Key
          </Button>
        </div>

        {testResult && (
          <div className={`rounded-lg border p-3 ${
            testResult.success 
              ? 'border-success/45 bg-success/12 text-success'
              : 'border-danger/45 bg-danger/12 text-danger'
          }`}>
            <p className="text-sm font-medium">
              {testResult.success ? (
                <CircleCheckBig size={16} className="inline mr-1" />
              ) : (
                <CircleX size={16} className="inline mr-1" />
              )}
              {testResult.message}
            </p>
          </div>
        )}

        <div className="rounded-lg border border-info/40 bg-info/10 p-4">
          <h4 className="mb-2 inline-flex items-center gap-2 font-medium text-info">
            <Info size={16} />
            <span>How to Get Your API Key</span>
          </h4>
          <ol className="space-y-1 text-sm text-foreground-muted">
            <li>1. Go to <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer" className="underline text-accent-glow">OpenAI Platform</a></li>
            <li>2. Sign in or create an account</li>
            <li>3. Navigate to API Keys section</li>
            <li>4. Create a new API key</li>
            <li>5. Copy and paste it here</li>
          </ol>
          <p className="mt-2 text-xs text-foreground-subtle">
            Note: Keep your API key secure and never share it publicly.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OpenAIConfig;
