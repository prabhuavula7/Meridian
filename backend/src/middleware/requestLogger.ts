/**
 * Request Logging Middleware
 * Provides comprehensive request logging and tracking
 */

import { Request, Response, NextFunction } from 'express';
import { getClientIP, getUserAgent, getRequestSize, sanitizeHeaders } from '../utils/requestUtils';

/**
 * Request logging middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  const clientIP = getClientIP(req);
  const userAgent = getUserAgent(req);
  const requestSize = getRequestSize(req);

  // Log request start
  console.log(`[${requestId}] Request started`, {
    method: req.method,
    url: req.url,
    clientIP,
    userAgent,
    requestSize: `${requestSize} bytes`,
    timestamp: new Date().toISOString(),
    headers: sanitizeHeaders(req.headers),
  });

  // Override res.end to log response details
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const processingTime = Date.now() - startTime;
    const statusCode = res.statusCode;
    const responseSize = chunk ? chunk.length : 0;

    // Log request completion
    console.log(`[${requestId}] Request completed`, {
      method: req.method,
      url: req.url,
      statusCode,
      processingTime: `${processingTime}ms`,
      responseSize: `${responseSize} bytes`,
      timestamp: new Date().toISOString(),
    });

    // Call original end method
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Error logging middleware
 */
export const errorLogger = (err: Error, req: Request, _res: Response, next: NextFunction): void => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  const clientIP = getClientIP(req);
  const userAgent = getUserAgent(req);

  console.error(`[${requestId}] Request error`, {
    method: req.method,
    url: req.url,
    clientIP,
    userAgent,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
    timestamp: new Date().toISOString(),
  });

  next(err);
};
