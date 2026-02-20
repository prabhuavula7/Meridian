/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse and ensures fair usage
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config/config';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store for rate limiting (in production, use Redis or similar)
const rateLimitStore: RateLimitStore = {};

/**
 * Rate limiting middleware
 */
export const rateLimit = (req: Request, res: Response, next: NextFunction): void => {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = config.security.rateLimitWindowMs;
  const maxRequests = config.security.rateLimitMaxRequests;

  // Get or create rate limit entry for this client
  if (!rateLimitStore[clientIP]) {
    rateLimitStore[clientIP] = {
      count: 0,
      resetTime: now + windowMs,
    };
  }

  const clientLimit = rateLimitStore[clientIP];

  // Reset counter if window has expired
  if (now > clientLimit.resetTime) {
    clientLimit.count = 0;
    clientLimit.resetTime = now + windowMs;
  }

  // Check if client has exceeded rate limit
  if (clientLimit.count >= maxRequests) {
    const retryAfter = Math.ceil((clientLimit.resetTime - now) / 1000);
    
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': new Date(clientLimit.resetTime).toISOString(),
      'Retry-After': retryAfter.toString(),
    });

    res.status(429).json({
      success: false,
      error: {
        message: 'Rate limit exceeded. Please try again later.',
        statusCode: 429,
        retryAfter: retryAfter,
        limit: maxRequests,
        window: Math.ceil(windowMs / 1000),
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown',
    });
    return;
  }

  // Increment request count
  clientLimit.count++;

  // Set rate limit headers
  res.set({
    'X-RateLimit-Limit': maxRequests.toString(),
    'X-RateLimit-Remaining': (maxRequests - clientLimit.count).toString(),
    'X-RateLimit-Reset': new Date(clientLimit.resetTime).toISOString(),
  });

  next();
};

/**
 * Clean up expired rate limit entries
 */
export const cleanupRateLimitStore = (): void => {
  const now = Date.now();
  
  for (const [clientIP, limit] of Object.entries(rateLimitStore)) {
    if (now > limit.resetTime) {
      delete rateLimitStore[clientIP];
    }
  }
};

// Clean up expired entries every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
