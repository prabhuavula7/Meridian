/**
 * Analysis Controller
 * Handles HTTP requests and responses for supply chain analysis
 */

import { Request, Response, NextFunction } from 'express';
import { openaiService, OpenAIServiceError } from '../services/openaiService';
import { AnalysisRequest, AnalysisResult, APIResponse } from '../types/supplyChain';
import { generateRequestId } from '../utils/requestUtils';

/**
 * Controller class for supply chain analysis
 */
export class AnalysisController {
  /**
   * Analyze supply chain data using OpenAI GPT-4
   * POST /api/v1/analyze-supply-chain
   */
  public async analyzeSupplyChain(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
      // Log request details
      console.log(`[${requestId}] Analysis request received`, {
        timestamp: new Date().toISOString(),
        dataSize: JSON.stringify(req.body).length,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });

      // Extract and validate request data
      const analysisRequest: AnalysisRequest = req.body;
      console.log(`[${requestId}] Analysis payload summary`, {
        locations: analysisRequest.supplyChainData?.locations?.length || 0,
        routes: analysisRequest.supplyChainData?.routes?.length || 0,
        products: analysisRequest.supplyChainData?.products?.length || 0,
        incidents: analysisRequest.supplyChainData?.incidents?.length || 0,
        hasCustomPrompt: Boolean(analysisRequest.customPrompt),
        hasPreferences: Boolean(analysisRequest.preferences),
      });

      // Perform the analysis using OpenAI service
      const analysisResult: AnalysisResult = await openaiService.analyzeSupplyChain(analysisRequest);

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      // Prepare success response
      const response: APIResponse<AnalysisResult> = {
        success: true,
        data: analysisResult,
        timestamp: new Date(),
        requestId,
      };

      // Log successful analysis
      console.log(`[${requestId}] Analysis completed successfully`, {
        processingTime: `${processingTime}ms`,
        resultId: analysisResult.id,
        confidenceScore: analysisResult.confidenceScore,
        timestamp: new Date().toISOString(),
      });

      // Send response
      res.status(200).json(response);
      console.log(`[${requestId}] Response sent`, { statusCode: 200 });

    } catch (error) {
      // Handle different types of errors
      if (error instanceof OpenAIServiceError) {
        await this.handleOpenAIError(error, res, requestId, startTime);
      } else {
        await this.handleUnexpectedError(error, res, requestId, startTime);
      }
    }
  }

  /**
   * Handle OpenAI service errors
   */
  private async handleOpenAIError(
    error: OpenAIServiceError,
    res: Response,
    requestId: string,
    startTime: number
  ): Promise<void> {
    const processingTime = Date.now() - startTime;
    const statusCode = error.statusCode;

    // Log the error
    console.error(`[${requestId}] OpenAI service error`, {
      message: error.message,
      statusCode,
      processingTime: `${processingTime}ms`,
      originalError: error.originalError?.message,
      timestamp: new Date().toISOString(),
    });

    // Prepare error response
    const response: APIResponse<never> = {
      success: false,
      error: this.getUserFriendlyErrorMessage(error),
      timestamp: new Date(),
      requestId,
    };

    // Send error response
      res.status(statusCode).json(response);
      console.log(`[${requestId}] Error response sent`, { statusCode });
  }

  /**
   * Handle unexpected errors
   */
  private async handleUnexpectedError(
    error: unknown,
    res: Response,
    requestId: string,
    startTime: number
  ): Promise<void> {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Log the error
    console.error(`[${requestId}] Unexpected error`, {
      message: errorMessage,
      processingTime: `${processingTime}ms`,
      error: error instanceof Error ? error.stack : error,
      timestamp: new Date().toISOString(),
    });

    // Prepare error response
    const response: APIResponse<never> = {
      success: false,
      error: 'An unexpected error occurred while processing your request. Please try again later.',
      timestamp: new Date(),
      requestId,
    };

    // Send error response
    res.status(500).json(response);
    console.log(`[${requestId}] Unexpected error response sent`, { statusCode: 500 });
  }

  /**
   * Get user-friendly error messages
   */
  private getUserFriendlyErrorMessage(error: OpenAIServiceError): string {
    // Map technical error messages to user-friendly ones
    const errorMessageMap: Record<string, string> = {
      'No response content received from OpenAI': 'The AI analysis service is temporarily unavailable. Please try again.',
      'Failed to parse OpenAI response': 'The analysis service encountered an error. Please try again.',
      'Failed to transform OpenAI response': 'The analysis results could not be processed. Please try again.',
      'OpenAI API authentication failed': 'The analysis service is experiencing authentication issues. Please contact support.',
      'OpenAI API key not configured': 'Backend OpenAI API key is not configured. Set OPENAI_API_KEY in root .env.',
      'OpenAI API rate limit exceeded': 'The analysis service is currently busy. Please try again in a few minutes.',
      'OpenAI API server error': 'The AI analysis service is experiencing technical difficulties. Please try again later.',
      'OpenAI API temporarily unavailable': 'The AI analysis service is temporarily unavailable. Please try again later.',
    };

    return errorMessageMap[error.message] || error.message;
  }

  /**
   * Health check for the analysis service
   * GET /api/v1/analysis/health
   */
  public async healthCheck(_req: Request, res: Response, _next: NextFunction): Promise<void> {
    const requestId = generateRequestId();

    try {
      // Test OpenAI connection
      const isOpenAIConnected = await openaiService.testConnection();

      const response = {
        success: true,
        data: {
          service: 'Supply Chain Analysis',
          status: 'operational',
          openai: {
            status: isOpenAIConnected ? 'connected' : 'disconnected',
            model: process.env['OPENAI_MODEL'] || 'gpt-4',
          },
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        },
        timestamp: new Date(),
        requestId,
      };

      res.status(200).json(response);

    } catch (error) {
      console.error(`[${requestId}] Health check failed:`, error);

      const response = {
        success: false,
        error: 'Health check failed',
        timestamp: new Date(),
        requestId,
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get analysis statistics
   * GET /api/v1/analysis/stats
   */
  public async getAnalysisStats(_req: Request, res: Response, _next: NextFunction): Promise<void> {
    const requestId = generateRequestId();

    try {
      // This would typically fetch from a database
      // For now, return mock statistics
      const response = {
        success: true,
        data: {
          totalAnalyses: 0,
          averageProcessingTime: 0,
          successRate: 1.0,
          lastAnalysis: null,
          popularScenarios: [],
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date(),
        requestId,
      };

      res.status(200).json(response);

    } catch (error) {
      console.error(`[${requestId}] Failed to get analysis stats:`, error);

      const response = {
        success: false,
        error: 'Failed to retrieve analysis statistics',
        timestamp: new Date(),
        requestId,
      };

      res.status(500).json(response);
    }
  }
}

// Export controller instance
export const analysisController = new AnalysisController();
