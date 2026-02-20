/**
 * OpenAI Service
 * Handles communication with OpenAI GPT-4 API for supply chain analysis
 */

import OpenAI from 'openai';
import { config } from '../config/config';
import { AnalysisRequest, AnalysisResult, DisasterScenario, ImpactAnalysis, MitigationStrategy } from '../types/supplyChain';

/**
 * Custom error class for OpenAI service errors
 */
export class OpenAIServiceError extends Error {
  public statusCode: number;
  public originalError: Error | undefined;

  constructor(message: string, statusCode: number = 500, originalError?: Error) {
    super(message);
    this.name = 'OpenAIServiceError';
    this.statusCode = statusCode;
    this.originalError = originalError;
  }
}

/**
 * OpenAI service class
 */
export class OpenAIService {
  private openai: OpenAI | null = null;

  constructor() {
    // Lazy client initialization allows backend startup even when key is missing.
  }

  private getClient(): OpenAI {
    if (!config.openai.apiKey || config.openai.apiKey === 'your_openai_api_key_here') {
      throw new OpenAIServiceError('OpenAI API key not configured', 503);
    }

    if (!this.openai) {
      this.openai = new OpenAI({
        apiKey: config.openai.apiKey,
        maxRetries: 3,
        timeout: config.api.timeout,
      });
    }

    return this.openai;
  }

  /**
   * Analyze supply chain data using GPT-4
   */
  public async analyzeSupplyChain(request: AnalysisRequest): Promise<AnalysisResult> {
    try {
      console.log('[openaiService] analyzeSupplyChain started', {
        model: config.openai.model,
        locations: request.supplyChainData.locations.length,
        routes: request.supplyChainData.routes.length,
        products: request.supplyChainData.products.length,
        incidents: request.supplyChainData.incidents.length,
      });

      // Generate the analysis prompt
      const prompt = this.generateAnalysisPrompt(request);
      console.log('[openaiService] Prompt generated', { promptLength: prompt.length });

      const openaiClient = this.getClient();
      
      // Call OpenAI API
      const completion = await openaiClient.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: config.openai.maxTokens,
        temperature: config.openai.temperature,
        response_format: { type: 'json_object' },
      });
      console.log('[openaiService] Completion received from OpenAI');

      // Parse and validate the response
      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new OpenAIServiceError('No response content received from OpenAI', 500);
      }

      // Parse JSON response
      let parsedResponse: any;
      try {
        parsedResponse = JSON.parse(responseContent);
        console.log('[openaiService] OpenAI JSON parsed successfully');
      } catch (parseError) {
        throw new OpenAIServiceError('Failed to parse OpenAI response', 500, parseError as Error);
      }

      // Transform the response into our AnalysisResult format
      console.log('[openaiService] Transforming parsed response');
      return this.transformOpenAIResponse(parsedResponse, request);

    } catch (error) {
      if (error instanceof OpenAIServiceError) {
        console.error('[openaiService] OpenAIServiceError raised', { message: error.message, statusCode: error.statusCode });
        throw error;
      }

      // Handle OpenAI-specific errors
      if (error instanceof OpenAI.APIError) {
        const statusCode = error.status || 500;
        const message = this.getOpenAIErrorMessage(error);
        console.error('[openaiService] OpenAI APIError', { message, statusCode });
        throw new OpenAIServiceError(message, statusCode, error);
      }

      // Handle other errors
      console.error('OpenAI service error:', error);
      throw new OpenAIServiceError('Failed to analyze supply chain data', 500, error as Error);
    }
  }

  /**
   * Generate the system prompt for GPT-4
   */
  private getSystemPrompt(): string {
    return `You are an expert supply chain analyst and risk management specialist. Your task is to analyze supply chain data and provide comprehensive disaster scenario analysis, impact assessment, and mitigation strategies.

IMPORTANT: You must respond with valid JSON in the following structure:
{
  "disasterScenario": {
    "type": "shipping_lane_blockage|port_congestion|natural_disaster|cyber_attack|supplier_failure",
    "description": "Detailed description of the scenario",
    "affectedRegions": ["region1", "region2"],
    "estimatedDuration": number_of_days,
    "probability": 0.0_to_1.0,
    "severity": 1_to_5
  },
  "impactAnalysis": {
    "financialImpact": {
      "withoutMitigation": number_in_usd,
      "withMitigation": number_in_usd,
      "savings": number_in_usd,
      "breakdown": {
        "operational": number_in_usd,
        "inventory": number_in_usd,
        "transportation": number_in_usd,
        "customer": number_in_usd,
        "regulatory": number_in_usd
      }
    },
    "timeImpact": {
      "withoutMitigation": number_of_days,
      "withMitigation": number_of_days,
      "timeSaved": number_of_days,
      "breakdown": {
        "procurement": number_of_days,
        "production": number_of_days,
        "transportation": number_of_days,
        "delivery": number_of_days
      }
    },
    "operationalImpact": {
      "affectedRoutes": number,
      "affectedLocations": number,
      "affectedProducts": number,
      "customerOrdersAffected": number
    }
  },
  "mitigationStrategies": [
    {
      "id": "unique_id",
      "name": "Strategy name",
      "description": "Detailed description",
      "implementationTime": number_of_days,
      "implementationCost": number_in_usd,
      "effectiveness": 0.0_to_1.0,
      "riskLevel": "low|medium|high",
      "requiredResources": ["resource1", "resource2"],
      "dependencies": ["dependency1", "dependency2"]
    }
  ],
  "insights": ["insight1", "insight2", "insight3"],
  "recommendations": ["recommendation1", "recommendation2", "recommendation3"],
  "confidenceScore": 0.0_to_1.0
}

Ensure all numeric values are realistic and based on the provided data. The analysis should be comprehensive and actionable.`;
  }

  /**
   * Generate the analysis prompt based on the request
   */
  private generateAnalysisPrompt(request: AnalysisRequest): string {
    const { supplyChainData, customPrompt, preferences } = request;
    
    let prompt = `Analyze the following supply chain data and generate a comprehensive disaster scenario analysis:

SUPPLY CHAIN DATA SUMMARY:
- Locations: ${supplyChainData.locations.length} (${supplyChainData.locations.map(l => l.type).join(', ')})
- Routes: ${supplyChainData.routes.length} (${supplyChainData.routes.map(r => r.transportMode).join(', ')})
- Products: ${supplyChainData.products.length} categories
- Active Incidents: ${supplyChainData.incidents.length}

LOCATION DETAILS:
${supplyChainData.locations.map(l => `- ${l.name} (${l.type}): ${l.status}, ${l.capacityUtilization}% utilization`).join('\n')}

ROUTE DETAILS:
${supplyChainData.routes.map(r => `- ${r.origin.name} → ${r.destination.name} (${r.transportMode}): ${r.transitTime} days, ${r.utilization}% utilization`).join('\n')}

PRODUCT DETAILS:
${supplyChainData.products.map(p => `- ${p.name} (${p.category}): $${p.unitCost}, ${p.inventoryLevel} units, ${p.leadTime} days lead time`).join('\n')}

ACTIVE INCIDENTS:
${supplyChainData.incidents.map(i => `- ${i.type} at ${i.location.name}: ${i.severity}/5 severity, $${i.estimatedFinancialImpact} impact`).join('\n')}`;

    if (customPrompt) {
      prompt += `\n\nCUSTOM ANALYSIS REQUEST: ${customPrompt}`;
    }

    if (preferences) {
      prompt += `\n\nANALYSIS PREFERENCES:`;
      if (preferences.focusAreas) {
        prompt += `\n- Focus Areas: ${preferences.focusAreas.join(', ')}`;
      }
      if (preferences.riskTolerance) {
        prompt += `\n- Risk Tolerance: ${preferences.riskTolerance}`;
      }
      if (preferences.timeHorizon) {
        prompt += `\n- Time Horizon: ${preferences.timeHorizon} days`;
      }
    }

    prompt += `\n\nBased on this data, please provide a comprehensive analysis including:
1. A realistic disaster scenario that could impact this supply chain
2. Detailed financial and time impact analysis (with and without mitigation)
3. Specific mitigation strategies with implementation details
4. Actionable insights and recommendations
5. Confidence score for the analysis

Ensure all financial figures are realistic and based on the scale of the operations described.`;

    return prompt;
  }

  /**
   * Transform OpenAI response into our AnalysisResult format
   */
  private transformOpenAIResponse(response: any, request: AnalysisRequest): AnalysisResult {
    try {
      // Validate required fields
      const requiredFields = ['disasterScenario', 'impactAnalysis', 'mitigationStrategies', 'insights', 'recommendations'];
      for (const field of requiredFields) {
        if (!response[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      console.log('[openaiService] Required fields present in OpenAI response');

      // Generate unique ID for the analysis
      const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        id: analysisId,
        timestamp: new Date(),
        inputData: {
          locationsCount: request.supplyChainData.locations.length,
          routesCount: request.supplyChainData.routes.length,
          productsCount: request.supplyChainData.products.length,
          incidentsCount: request.supplyChainData.incidents.length,
        },
        disasterScenario: response.disasterScenario as DisasterScenario,
        impactAnalysis: response.impactAnalysis as ImpactAnalysis,
        mitigationStrategies: response.mitigationStrategies as MitigationStrategy[],
        insights: Array.isArray(response.insights) ? response.insights : [response.insights],
        recommendations: Array.isArray(response.recommendations) ? response.recommendations : [response.recommendations],
        confidenceScore: response.confidenceScore || 0.8,
      };
    } catch (error) {
      console.error('[openaiService] Response transform failed', {
        message: error instanceof Error ? error.message : 'Unknown transform error',
      });
      throw new OpenAIServiceError(
        `Failed to transform OpenAI response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        error as Error
      );
    }
  }

  /**
   * Get user-friendly error messages for OpenAI API errors
   */
  private getOpenAIErrorMessage(error: any): string {
    switch (error.status) {
      case 400:
        return 'Invalid request to OpenAI API. Please check your input data.';
      case 401:
        return 'OpenAI API authentication failed. Please check your API key.';
      case 403:
        return 'Access denied to OpenAI API. Please check your API permissions.';
      case 429:
        return 'OpenAI API rate limit exceeded. Please try again later.';
      case 500:
        return 'OpenAI API server error. Please try again later.';
      case 502:
      case 503:
      case 504:
        return 'OpenAI API temporarily unavailable. Please try again later.';
      default:
        return `OpenAI API error: ${error.message}`;
    }
  }

  /**
   * Test the OpenAI connection
   */
  public async testConnection(): Promise<boolean> {
    try {
      const openaiClient = this.getClient();
      await openaiClient.models.list();
      return true;
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const openaiService = new OpenAIService();
