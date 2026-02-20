/**
 * Analysis Routes
 * Defines API endpoints for supply chain analysis
 */

import { Router } from 'express';
import { analysisController } from '../controllers/analysisController';
import { routeController } from '../controllers/routeController';
import { validateAnalysisRequest, validateRouteEnrichmentRequest } from '../middleware/validation';
import { rateLimit } from '../middleware/rateLimit';
import { requestLogger } from '../middleware/requestLogger';

const router = Router();

/**
 * @route   POST /api/v1/analyze-supply-chain
 * @desc    Analyze supply chain data using OpenAI GPT-4
 * @access  Public
 * @body    AnalysisRequest
 * @returns AnalysisResult
 */
router.post(
  '/analyze-supply-chain',
  rateLimit,
  requestLogger,
  validateAnalysisRequest,
  analysisController.analyzeSupplyChain.bind(analysisController)
);

/**
 * @route   POST /api/v1/routes/enrich
 * @desc    Resolve transport hubs and generate mode-aware route geometry
 * @access  Public
 */
router.post(
  '/routes/enrich',
  rateLimit,
  requestLogger,
  validateRouteEnrichmentRequest,
  routeController.enrichRoutes.bind(routeController)
);

/**
 * @route   GET /api/v1/analysis/health
 * @desc    Health check for the analysis service
 * @access  Public
 * @returns Health status
 */
router.get(
  '/analysis/health',
  requestLogger,
  analysisController.healthCheck.bind(analysisController)
);

/**
 * @route   GET /api/v1/analysis/stats
 * @desc    Get analysis service statistics
 * @access  Public
 * @returns Analysis statistics
 */
router.get(
  '/analysis/stats',
  requestLogger,
  analysisController.getAnalysisStats.bind(analysisController)
);

export default router;
