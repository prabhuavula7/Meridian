/**
 * Validation Middleware
 * Provides request validation using Joi schemas
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
// Types are used in Joi schemas

/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
  public statusCode: number;
  public details: Joi.ValidationErrorItem[];

  constructor(message: string, details: Joi.ValidationErrorItem[], statusCode: number = 400) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Joi schema for SupplyChainLocation
 */
const locationSchema = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().min(1).max(200).required(),
  coordinates: Joi.array().items(Joi.number()).length(2).required(),
  type: Joi.string().valid('warehouse', 'port', 'distribution_center', 'manufacturing_plant').required(),
  status: Joi.string().valid('operational', 'maintenance', 'closed', 'at_capacity').required(),
  capacityUtilization: Joi.number().min(0).max(100).required(),
});

/**
 * Joi schema for SupplyChainRoute
 */
const routeSchema = Joi.object({
  id: Joi.string().required(),
  origin: locationSchema.required(),
  destination: locationSchema.required(),
  transportMode: Joi.string().valid('sea', 'air', 'rail', 'road', 'multimodal').required(),
  transitTime: Joi.number().min(0).max(365).required(),
  status: Joi.string().valid('active', 'suspended', 'maintenance', 'closed').required(),
  costPerUnit: Joi.number().min(0).required(),
  volumeCapacity: Joi.number().min(0).required(),
  utilization: Joi.number().min(0).max(100).required(),
});

/**
 * Joi schema for SupplyChainProduct
 */
const productSchema = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().min(1).max(200).required(),
  category: Joi.string().min(1).max(100).required(),
  sku: Joi.string().min(1).max(50).required(),
  unitCost: Joi.number().min(0).required(),
  inventoryLevel: Joi.number().min(0).required(),
  reorderPoint: Joi.number().min(0).required(),
  leadTime: Joi.number().min(0).max(365).required(),
});

/**
 * Joi schema for SupplyChainIncident
 */
const incidentSchema = Joi.object({
  id: Joi.string().required(),
  type: Joi.string().valid('natural_disaster', 'technical_failure', 'labor_dispute', 'security_breach', 'regulatory_issue').required(),
  severity: Joi.number().valid(1, 2, 3, 4, 5).required(),
  location: locationSchema.required(),
  description: Joi.string().min(1).max(1000).required(),
  startTime: Joi.date().iso().required(),
  estimatedResolutionTime: Joi.date().iso().required(),
  status: Joi.string().valid('active', 'resolved', 'mitigated', 'escalated').required(),
  affectedRoutes: Joi.array().items(Joi.string()).required(),
  estimatedFinancialImpact: Joi.number().min(0).required(),
});

/**
 * Joi schema for SupplyChainData
 */
const supplyChainDataSchema = Joi.object({
  locations: Joi.array().items(locationSchema).min(1).max(1000).required(),
  routes: Joi.array().items(routeSchema).min(1).max(1000).required(),
  products: Joi.array().items(productSchema).min(1).max(1000).required(),
  incidents: Joi.array().items(incidentSchema).max(100).required(),
  metadata: Joi.object({
    source: Joi.string().required(),
    lastUpdated: Joi.date().iso().required(),
    version: Joi.string().required(),
    totalRecords: Joi.number().min(1).required(),
  }).required(),
});

/**
 * Joi schema for AnalysisRequest
 */
const analysisRequestSchema = Joi.object({
  supplyChainData: supplyChainDataSchema.required(),
  customPrompt: Joi.string().max(2000).optional(),
  preferences: Joi.object({
    focusAreas: Joi.array().items(Joi.string()).max(10).optional(),
    riskTolerance: Joi.string().valid('low', 'medium', 'high').optional(),
    timeHorizon: Joi.number().min(1).max(365).optional(),
  }).optional(),
});

/**
 * Joi schema for route enrichment request
 */
const routeEnrichmentRequestSchema = Joi.object({
  rows: Joi.array().items(Joi.object().unknown(true)).min(1).max(10000).required(),
  fieldMappings: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
});

/**
 * Validation middleware factory
 * Creates a middleware function that validates request data against a Joi schema
 */
export const createValidationMiddleware = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        const validationError = new ValidationError(
          'Request validation failed',
          error.details,
          400
        );
        throw validationError;
      }

      // Replace request body with validated and sanitized data
      req.body = value;
      next();
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(err.statusCode).json({
          success: false,
          error: {
            message: err.message,
            details: err.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message,
              code: detail.type,
            })),
            statusCode: err.statusCode,
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        });
      } else {
        // Handle unexpected errors
        console.error('Validation middleware error:', err);
        res.status(500).json({
          success: false,
          error: {
            message: 'Internal validation error',
            statusCode: 500,
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        });
      }
    }
  };
};

/**
 * Predefined validation middleware for common endpoints
 */
export const validateAnalysisRequest = createValidationMiddleware(analysisRequestSchema);
export const validateRouteEnrichmentRequest = createValidationMiddleware(routeEnrichmentRequestSchema);

/**
 * Sanitize and validate coordinates
 */
export const validateCoordinates = (coordinates: [number, number]): boolean => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return false;
  }
  
  const [longitude, latitude] = coordinates;
  
  return (
    typeof longitude === 'number' &&
    typeof latitude === 'number' &&
    longitude >= -180 && longitude <= 180 &&
    latitude >= -90 && latitude <= 90
  );
};

/**
 * Validate and sanitize numeric values
 */
export const sanitizeNumericValue = (value: unknown, min: number = 0, max?: number): number => {
  const num = Number(value);
  
  if (isNaN(num) || num < min) {
    return min;
  }
  
  if (max !== undefined && num > max) {
    return max;
  }
  
  return num;
};

/**
 * Validate and sanitize string values
 */
export const sanitizeStringValue = (value: unknown, maxLength: number = 1000): string => {
  if (typeof value !== 'string') {
    return '';
  }
  
  return value.trim().substring(0, maxLength);
};
