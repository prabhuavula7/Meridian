/**
 * Supply Chain Data Types
 * Defines the structure for supply chain data and analysis results
 */

export interface SupplyChainLocation {
  /** Unique identifier for the location */
  id: string;
  /** Name of the location (warehouse, port, facility) */
  name: string;
  /** Geographic coordinates [longitude, latitude] */
  coordinates: [number, number];
  /** Type of facility */
  type: 'warehouse' | 'port' | 'distribution_center' | 'manufacturing_plant';
  /** Operational status */
  status: 'operational' | 'maintenance' | 'closed' | 'at_capacity';
  /** Capacity utilization percentage */
  capacityUtilization: number;
}

export interface SupplyChainRoute {
  /** Unique identifier for the route */
  id: string;
  /** Origin location */
  origin: SupplyChainLocation;
  /** Destination location */
  destination: SupplyChainLocation;
  /** Transport mode */
  transportMode: 'sea' | 'air' | 'rail' | 'road' | 'multimodal';
  /** Estimated transit time in days */
  transitTime: number;
  /** Route status */
  status: 'active' | 'suspended' | 'maintenance' | 'closed';
  /** Cost per unit */
  costPerUnit: number;
  /** Volume capacity */
  volumeCapacity: number;
  /** Current utilization percentage */
  utilization: number;
}

export interface SupplyChainProduct {
  /** Unique identifier for the product */
  id: string;
  /** Product name */
  name: string;
  /** Product category */
  category: string;
  /** SKU code */
  sku: string;
  /** Unit cost */
  unitCost: number;
  /** Inventory level */
  inventoryLevel: number;
  /** Reorder point */
  reorderPoint: number;
  /** Lead time in days */
  leadTime: number;
}

export interface SupplyChainIncident {
  /** Unique identifier for the incident */
  id: string;
  /** Type of incident */
  type: 'natural_disaster' | 'technical_failure' | 'labor_dispute' | 'security_breach' | 'regulatory_issue';
  /** Severity level (1-5, where 5 is most severe) */
  severity: 1 | 2 | 3 | 4 | 5;
  /** Geographic location affected */
  location: SupplyChainLocation;
  /** Description of the incident */
  description: string;
  /** Start time of the incident */
  startTime: Date;
  /** Estimated resolution time */
  estimatedResolutionTime: Date;
  /** Current status */
  status: 'active' | 'resolved' | 'mitigated' | 'escalated';
  /** Affected routes */
  affectedRoutes: string[];
  /** Financial impact estimate */
  estimatedFinancialImpact: number;
}

export interface SupplyChainData {
  /** Array of supply chain locations */
  locations: SupplyChainLocation[];
  /** Array of supply chain routes */
  routes: SupplyChainRoute[];
  /** Array of products */
  products: SupplyChainProduct[];
  /** Array of active incidents */
  incidents: SupplyChainIncident[];
  /** Metadata about the data */
  metadata: {
    /** Data source */
    source: string;
    /** Last updated timestamp */
    lastUpdated: Date;
    /** Data version */
    version: string;
    /** Total number of records */
    totalRecords: number;
  };
}

export interface DisasterScenario {
  /** Type of disaster scenario */
  type: 'shipping_lane_blockage' | 'port_congestion' | 'natural_disaster' | 'cyber_attack' | 'supplier_failure';
  /** Description of the scenario */
  description: string;
  /** Affected geographic regions */
  affectedRegions: string[];
  /** Estimated duration in days */
  estimatedDuration: number;
  /** Probability of occurrence (0-1) */
  probability: number;
  /** Severity level (1-5) */
  severity: 1 | 2 | 3 | 4 | 5;
}

export interface ImpactAnalysis {
  /** Financial impact in USD */
  financialImpact: {
    /** Total cost without mitigation */
    withoutMitigation: number;
    /** Total cost with mitigation */
    withMitigation: number;
    /** Cost savings from mitigation */
    savings: number;
    /** Breakdown by category */
    breakdown: {
      operational: number;
      inventory: number;
      transportation: number;
      customer: number;
      regulatory: number;
    };
  };
  
  /** Time impact in days */
  timeImpact: {
    /** Total delay without mitigation */
    withoutMitigation: number;
    /** Total delay with mitigation */
    withMitigation: number;
    /** Time saved from mitigation */
    timeSaved: number;
    /** Breakdown by process */
    breakdown: {
      procurement: number;
      production: number;
      transportation: number;
      delivery: number;
    };
  };
  
  /** Operational impact */
  operationalImpact: {
    /** Affected routes count */
    affectedRoutes: number;
    /** Affected locations count */
    affectedLocations: number;
    /** Affected products count */
    affectedProducts: number;
    /** Customer orders affected */
    customerOrdersAffected: number;
  };
}

export interface MitigationStrategy {
  /** Strategy identifier */
  id: string;
  /** Strategy name */
  name: string;
  /** Description of the strategy */
  description: string;
  /** Implementation time in days */
  implementationTime: number;
  /** Implementation cost in USD */
  implementationCost: number;
  /** Expected effectiveness (0-1) */
  effectiveness: number;
  /** Risk level of the strategy */
  riskLevel: 'low' | 'medium' | 'high';
  /** Required resources */
  requiredResources: string[];
  /** Dependencies */
  dependencies: string[];
}

export interface AnalysisResult {
  /** Analysis identifier */
  id: string;
  /** Timestamp of analysis */
  timestamp: Date;
  /** Input data summary */
  inputData: {
    locationsCount: number;
    routesCount: number;
    productsCount: number;
    incidentsCount: number;
  };
  /** Generated disaster scenario */
  disasterScenario: DisasterScenario;
  /** Impact analysis */
  impactAnalysis: ImpactAnalysis;
  /** Recommended mitigation strategies */
  mitigationStrategies: MitigationStrategy[];
  /** AI-generated insights */
  insights: string[];
  /** Recommendations */
  recommendations: string[];
  /** Confidence score (0-1) */
  confidenceScore: number;
}

export interface APIResponse<T> {
  /** Success status */
  success: boolean;
  /** Response data */
  data?: T;
  /** Error message if applicable */
  error?: string;
  /** Response timestamp */
  timestamp: Date;
  /** Request identifier for tracking */
  requestId: string;
}

export interface AnalysisRequest {
  /** Supply chain data to analyze */
  supplyChainData: SupplyChainData;
  /** Optional custom prompt for analysis */
  customPrompt?: string;
  /** Analysis preferences */
  preferences?: {
    /** Focus areas for analysis */
    focusAreas?: string[];
    /** Risk tolerance level */
    riskTolerance?: 'low' | 'medium' | 'high';
    /** Time horizon for analysis (days) */
    timeHorizon?: number;
  };
}

export interface RouteEnrichmentRequest {
  /** Raw uploaded rows from frontend */
  rows: Record<string, unknown>[];
  /** Optional frontend column to canonical-field mapping */
  fieldMappings?: Record<string, string>;
}

export interface RouteEnrichmentSummary {
  totalRows: number;
  enrichedRows: number;
  cacheHit?: boolean;
  cacheKey?: string;
  modeBreakdown: {
    sea: number;
    air: number;
    rail: number;
    road: number;
    multimodal: number;
  };
  providersUsed: string[];
}

export interface RouteEnrichmentResponse {
  rows: Record<string, unknown>[];
  summary: RouteEnrichmentSummary;
}
