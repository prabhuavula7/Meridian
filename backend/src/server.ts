/**
 * Main Server File
 * Express server with TypeScript support and comprehensive middleware
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/config';
import analysisRoutes from './routes/analysis';
import { errorLogger } from './middleware/requestLogger';

// Create Express app
const app = express();
const logPrefix = '[server]';

console.log(`${logPrefix} Initializing Express app`);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
console.log(`${logPrefix} Security middleware configured`);

// CORS configuration
app.use(cors({
  origin: config.server.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));
console.log(`${logPrefix} CORS configured`, { origin: config.server.corsOrigin });

// Request parsing middleware
app.use(express.json({ limit: config.security.requestSizeLimit }));
app.use(express.urlencoded({ extended: true, limit: config.security.requestSizeLimit }));
console.log(`${logPrefix} Body parser configured`, { limit: config.security.requestSizeLimit });

// Logging middleware
if (config.logging.enableMorgan) {
  app.use(morgan('combined'));
  console.log(`${logPrefix} Morgan request logging enabled`);
}

// Request ID middleware
app.use((req, _res, next) => {
  if (!req.headers['x-request-id']) {
    req.headers['x-request-id'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  if (config.server.nodeEnv === 'development') {
    console.log(`${logPrefix} Request id attached`, {
      requestId: req.headers['x-request-id'],
      method: req.method,
      path: req.path,
    });
  }
  next();
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Meridian AI Backend',
    version: '1.0.0',
    environment: config.server.nodeEnv,
    uptime: process.uptime(),
  });
});

// API routes
app.use(`${config.api.basePath}/${config.api.version}`, analysisRoutes);
console.log(`${logPrefix} Analysis routes mounted`, { basePath: `${config.api.basePath}/${config.api.version}` });

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Endpoint not found',
      statusCode: 404,
      path: req.originalUrl,
    },
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown',
    availableEndpoints: [
      'GET /health',
      'POST /api/v1/analyze-supply-chain',
      'POST /api/v1/routes/enrich',
      'GET /api/v1/analysis/health',
      'GET /api/v1/analysis/stats',
    ],
  });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Log the error
  errorLogger(err, req, res, next);

  // Determine status code
  let statusCode = 500;
  let message = 'Internal server error';

  if ('statusCode' in err && typeof (err as any).statusCode === 'number') {
    statusCode = (err as any).statusCode;
  }

  if (err.message) {
    message = err.message;
  }

  // Don't expose internal errors in production
  if (config.server.nodeEnv === 'production' && statusCode === 500) {
    message = 'An unexpected error occurred. Please try again later.';
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      ...(config.server.nodeEnv === 'development' && { stack: err.stack }),
    },
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown',
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start server
app.listen(config.server.port, () => {
  console.log(`${logPrefix} Meridian AI Backend started successfully`);
  console.log(`${logPrefix} Environment`, { nodeEnv: config.server.nodeEnv });
  console.log(`${logPrefix} Server URL`, { url: `http://localhost:${config.server.port}` });
  console.log(`${logPrefix} Health URL`, { url: `http://localhost:${config.server.port}/health` });
  console.log(`${logPrefix} Analysis URL`, { url: `http://localhost:${config.server.port}${config.api.basePath}/${config.api.version}/analyze-supply-chain` });
  console.log(`${logPrefix} OpenAI model`, { model: config.openai.model });
  console.log(`${logPrefix} Rate limit`, { maxRequests: config.security.rateLimitMaxRequests, windowSeconds: Math.ceil(config.security.rateLimitWindowMs / 1000) });
});

// Export for testing
export default app;
