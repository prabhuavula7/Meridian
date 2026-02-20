import OpenAI from 'openai';
import { debugError, debugLog, debugWarn } from '../utils/logger';

// Lazy initialization of OpenAI client
let openai = null;

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2
};

const initializeOpenAI = () => {
  if (!openai) {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY || localStorage.getItem('openai_api_key');
    
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      throw new Error('OpenAI API key not configured. Please configure your API key first.');
    }
    
    openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // Note: In production, use backend proxy
    });
    debugLog('openaiService', 'OpenAI client initialized', {
      apiKeySource: process.env.REACT_APP_OPENAI_API_KEY ? 'env' : 'localStorage',
    });
  }
  return openai;
};

/**
 * Retry operation with exponential backoff
 * @param {Function} operation - Async function to retry
 * @param {string} operationName - Name of operation for logging
 * @returns {Promise} - Result of the operation
 */
const retryOperation = async (operation, operationName = 'API call') => {
  let lastError;
  
  for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain error types
      if (error.code === 'invalid_api_key' || error.code === 'insufficient_quota') {
        console.error(`${operationName} failed permanently:`, error.message);
        throw error;
      }
      
      // Log retry attempt
      if (attempt < RETRY_CONFIG.maxRetries) {
        const delay = Math.min(
          RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1),
          RETRY_CONFIG.maxDelay
        );
        
        console.warn(`${operationName} failed (attempt ${attempt}/${RETRY_CONFIG.maxRetries}), retrying in ${delay}ms:`, error.message);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`${operationName} failed after ${RETRY_CONFIG.maxRetries} attempts:`, error.message);
      }
    }
  }
  
  throw lastError;
};

// System prompt for supply chain risk analysis
const SYSTEM_PROMPT = `You are a supply chain risk analyst. Your role is to analyze supply chain data and simulate major disaster scenarios that would severely disrupt shipping routes in the network.

You will:
1. Identify realistic disaster scenarios (e.g., Suez Canal blockage, major port closure, key transport leg disabled)
2. Analyze which parts of the supply chain are disrupted
3. Estimate total DELAY in lead time (in days) and FINANCIAL IMPACT (in USD) across affected products/routes
4. Propose effective, realistic precautions or backup plans to minimize both time and cost impact
5. Calculate the difference in lost time and money "with precautions" versus "no action"

Always provide realistic, data-driven analysis with specific numbers, costs, and actionable recommendations.`;

// Generate comprehensive AI analysis using OpenAI
export const generateAIAnalysis = async (mapData) => {
  try {
    debugLog('openaiService', 'generateAIAnalysis started', {
      routes: mapData.routes.length,
      warehouses: mapData.warehouses.length,
      incidents: mapData.incidents.length,
    });

    // Initialize OpenAI client
    const openaiClient = initializeOpenAI();
    
    // Prepare the data for analysis using the specific supply chain risk analysis prompt
    const analysisPrompt = `
You are a supply chain risk analyst. I am providing you data extracted from an Excel file, which includes the following standardized fields:

Warehouse Locations (with coordinates or city/country)
Shipping Routes (start, end, intermediate stops if any)
Mode of Transport (sea, air, rail, road)
Lead Time for each route/leg
Product Names assigned to routes
Product Costs and shipment value
Any additional available relevant data

SUPPLY CHAIN DATA TO ANALYZE:
- Total Routes: ${mapData.routes.length} active shipping routes
- Total Locations: ${mapData.warehouses.length} warehouse/port locations
- Active Incidents: ${mapData.incidents.length} current incidents
- Route Details: ${mapData.routes.map(r => `${r.origin} → ${r.destination} (${r.transportMode}, ${r.leadTime} days, $${r.cost})`).join('; ')}
- Product Information: ${mapData.routes.map(r => `${r.cargo}: $${r.cost}`).join('; ')}
- Incident Types: ${mapData.incidents.map(i => i.type).join(', ')}

INSTRUCTIONS:
Using this data, simulate a major disaster scenario that would severely disrupt an important shipping route in the network (for example, a Suez Canal blockage, major port closure, or a key transport leg disabled).

Identify which parts of the supply chain are disrupted and estimate:
- The total DELAY in lead time (in days) and the FINANCIAL IMPACT (in USD) due to the disaster across affected products/routes.
- Propose the most effective, realistic precautions or backup plans to minimize both time and cost impact (e.g., alternate ports, different modes, emergency stock repositioning). Briefly justify each measure.
- Calculate the difference in lost time and money "with precautions" versus "no action."

Please provide a JSON response with this exact structure:
{
  "disasterScenario": {
    "type": "specific_disaster_type",
    "description": "detailed_description_of_disruption",
    "affectedRegions": ["region1", "region2"],
    "estimatedDuration": days_number,
    "probability": 0.0_to_1.0,
    "severity": 1_to_5
  },
  "impactAnalysis": {
    "financialImpact": {
      "withoutMitigation": total_cost_in_usd,
      "withMitigation": total_cost_in_usd,
      "savings": cost_saved_in_usd,
      "breakdown": {
        "operational": cost_in_usd,
        "inventory": cost_in_usd,
        "transportation": cost_in_usd,
        "customer": cost_in_usd,
        "regulatory": cost_in_usd
      }
    },
    "timeImpact": {
      "withoutMitigation": total_delay_days,
      "withMitigation": total_delay_days,
      "timeSaved": days_saved,
      "breakdown": {
        "procurement": delay_days,
        "production": delay_days,
        "transportation": delay_days,
        "delivery": delay_days
      }
    },
    "operationalImpact": {
      "affectedRoutes": number_of_disrupted_routes,
      "affectedLocations": number_of_disrupted_locations,
      "affectedProducts": number_of_affected_products,
      "customerOrdersAffected": estimated_order_count
    }
  },
  "mitigationStrategies": [
    {
      "id": "unique_id",
      "name": "strategy_name",
      "description": "detailed_description_with_justification",
      "implementationTime": days_to_implement,
      "implementationCost": cost_in_usd,
      "effectiveness": 0.0_to_1.0,
      "riskLevel": "low/medium/high",
      "requiredResources": ["resource1", "resource2"],
      "dependencies": ["dependency1", "dependency2"]
    }
  ],
  "insights": ["key_insight1", "key_insight2", "key_insight3"],
  "recommendations": ["actionable_recommendation1", "actionable_recommendation2", "actionable_recommendation3"],
  "confidenceScore": 0.0_to_1.0
}

IMPORTANT: Ensure all numbers are realistic and the analysis is based on the provided data. Focus on specific routes, products, and locations mentioned in the data.`;

    const completion = await retryOperation(
      () => openaiClient.chat.completions.create({
        model: process.env.REACT_APP_OPENAI_MODEL || 'gpt-4',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: analysisPrompt }
        ],
        max_tokens: parseInt(process.env.REACT_APP_OPENAI_MAX_TOKENS) || 4000,
        temperature: parseFloat(process.env.REACT_APP_ANALYSIS_TEMPERATURE) || 0.7,
      }),
      'AI Analysis'
    );
    debugLog('openaiService', 'AI analysis completion received');

    const response = completion.choices[0].message.content;
    
    // Parse the JSON response
    try {
      const analysisData = JSON.parse(response);
      
      // Add timestamp and data quality metrics
      return {
        ...analysisData,
        analysisTimestamp: new Date().toISOString(),
        dataQuality: {
          routesAnalyzed: mapData.routes.length,
          incidentsAnalyzed: mapData.incidents.length,
          portsAnalyzed: mapData.warehouses.length,
          coverageScore: Math.min(1, (mapData.routes.length + mapData.incidents.length) / 15)
        }
      };
    } catch (parseError) {
      debugError('openaiService', 'Error parsing OpenAI analysis response', { message: parseError.message });
      throw new Error('Failed to parse AI analysis response');
    }

  } catch (error) {
    debugError('openaiService', 'OpenAI API analysis error', { message: error.message });
    throw new Error(`AI analysis failed: ${error.message}`);
  }
};

// Generate real-time alerts using OpenAI
export const generateRealTimeAlerts = async (mapData) => {
  try {
    debugLog('openaiService', 'generateRealTimeAlerts started', {
      routes: mapData.routes.length,
      incidents: mapData.incidents.length,
      warehouses: mapData.warehouses.length,
    });

    // Initialize OpenAI client
    const openaiClient = initializeOpenAI();
    
    const alertPrompt = `
Based on this supply chain data, generate 3-5 real-time risk alerts focusing on supply chain vulnerabilities:

SUPPLY CHAIN DATA:
- Routes: ${mapData.routes.length} active shipping routes
- Incidents: ${mapData.incidents.length} current incidents
- Ports: ${mapData.warehouses.length} warehouse/port locations
- Route Details: ${mapData.routes.map(r => `${r.origin} → ${r.destination} (${r.transportMode})`).join('; ')}
- Incident Types: ${mapData.incidents.map(i => i.type).join(', ')}

Generate alerts in this JSON format:
[
  {
    "type": "warning/info",
    "title": "Alert Title",
    "message": "Detailed message",
    "priority": "high/medium/low",
    "timestamp": "ISO timestamp"
  }
]

Focus on supply chain risk factors like:
- High severity incidents that could disrupt routes
- Port vulnerabilities and congestion risks
- Route dependencies and single points of failure
- Transport mode risks (sea route blockages, port closures)
- Geographic concentration risks
- Lead time vulnerabilities
- Cost impact risks`;

        const completion = await retryOperation(
          () => openaiClient.chat.completions.create({
            model: process.env.REACT_APP_OPENAI_MODEL || 'gpt-4',
            messages: [
              { role: 'system', content: 'You are a supply chain risk monitoring system that generates real-time alerts for potential disruptions, vulnerabilities, and risk factors.' },
              { role: 'user', content: alertPrompt }
            ],
            max_tokens: 1000,
            temperature: 0.5,
          }),
          'Real-time Alerts'
        );
    debugLog('openaiService', 'Real-time alerts completion received');

    const response = completion.choices[0].message.content;
    
    try {
      const alerts = JSON.parse(response);
      return alerts.map(alert => ({
        ...alert,
        timestamp: alert.timestamp || new Date().toISOString()
      }));
    } catch (parseError) {
      debugWarn('openaiService', 'Error parsing alerts response', { message: parseError.message });
      return [];
    }

  } catch (error) {
    debugError('openaiService', 'OpenAI alerts error', { message: error.message });
    return [];
  }
};

// Check if OpenAI is configured
export const isOpenAIConfigured = () => {
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY || localStorage.getItem('openai_api_key');
  return apiKey && apiKey !== 'your_openai_api_key_here';
};

// Test OpenAI connection
export const testOpenAIConnection = async (apiKey = null) => {
  try {
    let openaiClient;
    
    if (apiKey) {
      // Use provided API key for testing
      openaiClient = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
      });
    } else {
      // Use configured API key
      openaiClient = initializeOpenAI();
    }
    
    await retryOperation(
      () => openaiClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello, this is a test message.' }],
        max_tokens: 10,
      }),
      'Connection Test'
    );
    return { success: true, message: 'OpenAI connection successful' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
