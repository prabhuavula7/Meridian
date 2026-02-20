/**
 * Application Configuration
 * Centralized configuration management with environment variables
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const backendRoot = path.resolve(__dirname, '..', '..');
const backendEnvPath = path.join(backendRoot, '.env');
const rootEnvPath = path.join(backendRoot, '..', '.env');
const frontendEnvPath = path.join(backendRoot, '..', 'frontend', '.env');
const debugLogsEnabled = process.env['DEBUG_LOGS'] !== 'false';

const configLog = (message: string, details?: Record<string, unknown>): void => {
  if (!debugLogsEnabled) {
    return;
  }

  if (details) {
    console.log(`[config] ${message}`, details);
    return;
  }

  console.log(`[config] ${message}`);
};

if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
  configLog('Loaded backend .env file', { path: backendEnvPath });
}

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
  configLog('Loaded root .env file', { path: rootEnvPath });
}

if (fs.existsSync(frontendEnvPath)) {
  dotenv.config({ path: frontendEnvPath });
  configLog('Loaded frontend .env file', { path: frontendEnvPath });
}

export interface Config {
  // Server configuration
  server: {
    port: number;
    nodeEnv: string;
    corsOrigin: string;
  };
  
  // OpenAI configuration
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  
  // Security configuration
  security: {
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    requestSizeLimit: string;
  };
  
  // Logging configuration
  logging: {
    level: string;
    enableMorgan: boolean;
  };
  
  // API configuration
  api: {
    version: string;
    basePath: string;
    timeout: number;
  };
}

/**
 * Get configuration from environment variables with defaults
 */
export const getConfig = (): Config => {
  const nodeEnv = process.env['NODE_ENV'] || 'development';
  const openAiKey = process.env['OPENAI_API_KEY'] || process.env['REACT_APP_OPENAI_API_KEY'];
  const openAiModel = process.env['OPENAI_MODEL'] || process.env['REACT_APP_OPENAI_MODEL'] || 'gpt-4';
  const openAiMaxTokens = parseInt(
    process.env['OPENAI_MAX_TOKENS'] || process.env['REACT_APP_OPENAI_MAX_TOKENS'] || '2000',
    10
  );
  const openAiTemperature = parseFloat(
    process.env['OPENAI_TEMPERATURE'] || process.env['REACT_APP_OPENAI_TEMPERATURE'] || '0.7'
  );
  const isPlaceholderKey = openAiKey === 'your_openai_api_key_here';
  const hasValidOpenAiKey = Boolean(openAiKey) && !isPlaceholderKey;
  const openAiKeySource = process.env['OPENAI_API_KEY'] ? 'OPENAI_API_KEY' : 'REACT_APP_OPENAI_API_KEY';

  if (!hasValidOpenAiKey && nodeEnv === 'production') {
    throw new Error('Missing required OPENAI_API_KEY in production environment.');
  }

  if (!hasValidOpenAiKey) {
    configLog('OpenAI key is missing or placeholder; analysis endpoints will return key-not-configured errors', {
      expectedVars: ['OPENAI_API_KEY', 'REACT_APP_OPENAI_API_KEY'],
    });
  }

  const resolvedConfig: Config = {
    server: {
      port: parseInt(process.env['PORT'] || '5050', 10),
      nodeEnv,
      corsOrigin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
    },
    
    openai: {
      apiKey: hasValidOpenAiKey ? openAiKey! : '',
      model: openAiModel,
      maxTokens: openAiMaxTokens,
      temperature: openAiTemperature,
    },
    
    security: {
      rateLimitWindowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000', 10), // 15 minutes
      rateLimitMaxRequests: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100', 10),
      requestSizeLimit: process.env['REQUEST_SIZE_LIMIT'] || '10mb',
    },
    
    logging: {
      level: process.env['LOG_LEVEL'] || 'info',
      enableMorgan: process.env['ENABLE_MORGAN'] !== 'false',
    },
    
    api: {
      version: process.env['API_VERSION'] || 'v1',
      basePath: process.env['API_BASE_PATH'] || '/api',
      timeout: parseInt(process.env['API_TIMEOUT'] || '30000', 10), // 30 seconds
    },
  };

  configLog('Configuration resolved', {
    port: resolvedConfig.server.port,
    nodeEnv: resolvedConfig.server.nodeEnv,
    corsOrigin: resolvedConfig.server.corsOrigin,
    openAiModel: resolvedConfig.openai.model,
    openAiMaxTokens: resolvedConfig.openai.maxTokens,
    openAiKeySource,
    enableMorgan: resolvedConfig.logging.enableMorgan,
  });

  return resolvedConfig;
};

/**
 * Validate configuration values
 */
export const validateConfig = (config: Config): void => {
  const errors: string[] = [];
  
  // Validate server configuration
  if (config.server.port < 1 || config.server.port > 65535) {
    errors.push('Invalid server port number');
  }
  
  // Validate OpenAI configuration
  if (config.openai.maxTokens < 1 || config.openai.maxTokens > 200000) {
    errors.push('Invalid OpenAI max tokens value');
  }
  
  if (config.openai.temperature < 0 || config.openai.temperature > 2) {
    errors.push('Invalid OpenAI temperature value');
  }
  
  // Validate security configuration
  if (config.security.rateLimitWindowMs < 1000) {
    errors.push('Rate limit window must be at least 1 second');
  }
  
  if (config.security.rateLimitMaxRequests < 1) {
    errors.push('Rate limit max requests must be at least 1');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
  }
};

// Export default configuration
export const config = getConfig();

// Validate configuration on import
validateConfig(config);
