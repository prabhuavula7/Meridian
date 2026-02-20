/**
 * Request Utilities
 * Common utility functions for request handling
 */

import { Request } from 'express';
import crypto from 'crypto';

/**
 * Generate a unique request ID
 */
export const generateRequestId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `${timestamp}_${random}`;
};

/**
 * Generate a unique analysis ID
 */
export const generateAnalysisId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(8).toString('hex');
  return `analysis_${timestamp}_${random}`;
};

/**
 * Get client IP address from request
 */
export const getClientIP = (req: Request): string => {
  return (
    req.headers['x-forwarded-for'] as string ||
    req.headers['x-real-ip'] as string ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown'
  );
};

/**
 * Get user agent from request
 */
export const getUserAgent = (req: Request): string => {
  return req.get('User-Agent') || 'unknown';
};

/**
 * Sanitize request headers for logging
 */
export const sanitizeHeaders = (headers: Record<string, any>): Record<string, any> => {
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Calculate request size in bytes
 */
export const getRequestSize = (req: Request): number => {
  const contentLength = req.get('Content-Length');
  if (contentLength) {
    return parseInt(contentLength, 10);
  }
  
  // Estimate size from body
  if (req.body) {
    return JSON.stringify(req.body).length;
  }
  
  return 0;
};

/**
 * Format bytes to human readable format
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Validate and sanitize email address
 */
export const sanitizeEmail = (email: string): string | null => {
  if (!email || typeof email !== 'string') {
    return null;
  }
  
  const sanitized = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return emailRegex.test(sanitized) ? sanitized : null;
};

/**
 * Validate and sanitize phone number
 */
export const sanitizePhone = (phone: string): string | null => {
  if (!phone || typeof phone !== 'string') {
    return null;
  }
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Check if it's a valid length (7-15 digits)
  if (digits.length < 7 || digits.length > 15) {
    return null;
  }
  
  return digits;
};

/**
 * Generate a secure random string
 */
export const generateSecureString = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash sensitive data for logging
 */
export const hashSensitiveData = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex').substr(0, 8);
};

/**
 * Check if request is from a mobile device
 */
export const isMobileRequest = (req: Request): boolean => {
  const userAgent = getUserAgent(req).toLowerCase();
  const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'blackberry', 'windows phone'];
  
  return mobileKeywords.some(keyword => userAgent.includes(keyword));
};

/**
 * Get request processing time
 */
export const getProcessingTime = (startTime: number): number => {
  return Date.now() - startTime;
};

/**
 * Format processing time for logging
 */
export const formatProcessingTime = (processingTime: number): string => {
  if (processingTime < 1000) {
    return `${processingTime}ms`;
  } else if (processingTime < 60000) {
    return `${(processingTime / 1000).toFixed(2)}s`;
  } else {
    return `${(processingTime / 60000).toFixed(2)}m`;
  }
};
