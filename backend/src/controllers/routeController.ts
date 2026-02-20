/**
 * Route Controller
 * Handles route enrichment requests for frontend map rendering.
 */

import { NextFunction, Request, Response } from 'express';
import { routeEnrichmentService } from '../services/routeEnrichmentService';
import { APIResponse, RouteEnrichmentRequest, RouteEnrichmentResponse } from '../types/supplyChain';
import { generateRequestId } from '../utils/requestUtils';

export class RouteController {
  public async enrichRoutes(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
      const enrichmentRequest = req.body as RouteEnrichmentRequest;

      console.log(`[${requestId}] Route enrichment request received`, {
        rows: enrichmentRequest.rows?.length || 0,
        hasFieldMappings: Boolean(enrichmentRequest.fieldMappings),
      });

      const enrichmentResult: RouteEnrichmentResponse =
        await routeEnrichmentService.enrichRoutes(enrichmentRequest);

      const processingTimeMs = Date.now() - startTime;
      console.log(`[${requestId}] Route enrichment completed`, {
        processingTimeMs,
        enrichedRows: enrichmentResult.summary.enrichedRows,
        providersUsed: enrichmentResult.summary.providersUsed,
        cacheHit: Boolean(enrichmentResult.summary.cacheHit),
        cacheKey: enrichmentResult.summary.cacheKey || null,
      });

      const response: APIResponse<RouteEnrichmentResponse> = {
        success: true,
        data: enrichmentResult,
        timestamp: new Date(),
        requestId,
      };

      res.status(200).json(response);
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      console.error(`[${requestId}] Route enrichment failed`, {
        processingTimeMs,
        message: error instanceof Error ? error.message : String(error),
      });

      const response: APIResponse<never> = {
        success: false,
        error: 'Failed to enrich routes for map rendering',
        timestamp: new Date(),
        requestId,
      };

      res.status(500).json(response);
    }
  }
}

export const routeController = new RouteController();
