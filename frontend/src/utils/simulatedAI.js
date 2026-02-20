// Simulated AI Analysis Engine for Supply Chain
// Generates realistic disaster scenarios and insights without external APIs

// Disaster scenario templates
const DISASTER_SCENARIOS = [
  {
    id: 'geo_political',
    type: 'Geopolitical Tensions',
    description: 'Major shipping lane disruption due to geopolitical tensions and trade restrictions',
    affectedRegions: ['South China Sea', 'Strait of Malacca', 'Red Sea'],
    estimatedDuration: 21,
    probability: 0.35,
    severity: 5,
    impactAreas: ['shipping_routes', 'port_access', 'customs_clearance'],
    keywords: ['sanctions', 'trade_war', 'political_instability', 'maritime_security']
  },
  {
    id: 'natural_disaster',
    type: 'Natural Disaster',
    description: 'Severe weather events and natural disasters affecting multiple port facilities',
    affectedRegions: ['Gulf Coast', 'Pacific Northwest', 'Southeast Asia'],
    estimatedDuration: 14,
    probability: 0.28,
    severity: 4,
    impactAreas: ['port_operations', 'infrastructure', 'transportation_networks'],
    keywords: ['hurricane', 'typhoon', 'earthquake', 'flooding', 'extreme_weather']
  },
  {
    id: 'cyber_attack',
    type: 'Cyber Attack',
    description: 'Large-scale cyber attack targeting port management systems and logistics networks',
    affectedRegions: ['Global', 'Major Ports', 'Logistics Centers'],
    estimatedDuration: 7,
    probability: 0.22,
    severity: 4,
    impactAreas: ['digital_systems', 'communication', 'tracking', 'documentation'],
    keywords: ['ransomware', 'data_breach', 'system_outage', 'cyber_security']
  },
  {
    id: 'labor_dispute',
    type: 'Labor Dispute',
    description: 'Major labor strikes and port worker protests disrupting operations',
    affectedRegions: ['West Coast Ports', 'European Ports', 'Major Hubs'],
    estimatedDuration: 10,
    probability: 0.18,
    severity: 3,
    impactAreas: ['port_operations', 'cargo_handling', 'vessel_operations'],
    keywords: ['strike', 'labor_union', 'working_conditions', 'contract_dispute']
  },
  {
    id: 'equipment_failure',
    type: 'Equipment Failure',
    description: 'Critical infrastructure failures and equipment breakdowns at major ports',
    affectedRegions: ['Automated Ports', 'Major Terminals', 'Logistics Hubs'],
    estimatedDuration: 5,
    probability: 0.15,
    severity: 3,
    impactAreas: ['cargo_handling', 'automation_systems', 'infrastructure'],
    keywords: ['mechanical_failure', 'system_outage', 'maintenance', 'infrastructure']
  },
  {
    id: 'pandemic_impact',
    type: 'Pandemic Impact',
    description: 'Health crisis affecting port workers and logistics personnel globally',
    affectedRegions: ['Global', 'Major Ports', 'Logistics Centers'],
    estimatedDuration: 45,
    probability: 0.12,
    severity: 4,
    impactAreas: ['workforce', 'health_safety', 'operational_capacity'],
    keywords: ['health_crisis', 'workforce_shortage', 'safety_protocols', 'operational_disruption']
  },
  {
    id: 'trade_war',
    type: 'Trade War Escalation',
    description: 'Intensified trade restrictions and tariffs affecting global supply chains',
    affectedRegions: ['Major Trading Nations', 'Strategic Ports', 'Trade Routes'],
    estimatedDuration: 60,
    probability: 0.08,
    severity: 5,
    impactAreas: ['customs_clearance', 'trade_relations', 'route_planning'],
    keywords: ['tariffs', 'trade_restrictions', 'geopolitical_tensions', 'customs_delays']
  }
];

// Port vulnerability assessment
const PORT_VULNERABILITIES = {
  'Shanghai': { risk: 'high', factors: ['high_volume', 'geopolitical', 'weather', 'trade_war'], riskScore: 8.5 },
  'Los Angeles': { risk: 'medium', factors: ['labor_disputes', 'congestion', 'earthquakes', 'pandemic'], riskScore: 6.2 },
  'Rotterdam': { risk: 'low', factors: ['stable_politics', 'good_infrastructure'], riskScore: 3.1 },
  'Singapore': { risk: 'medium', factors: ['geopolitical', 'weather', 'congestion', 'trade_war'], riskScore: 6.8 },
  'Dubai': { risk: 'medium', factors: ['geopolitical', 'weather', 'infrastructure'], riskScore: 5.9 },
  'Hamburg': { risk: 'low', factors: ['stable_politics', 'good_infrastructure'], riskScore: 2.8 },
  'New York': { risk: 'medium', factors: ['congestion', 'weather', 'infrastructure', 'pandemic'], riskScore: 6.5 },
  'Tokyo': { risk: 'medium', factors: ['earthquakes', 'weather', 'congestion', 'pandemic'], riskScore: 6.1 },
  'Mumbai': { risk: 'high', factors: ['infrastructure', 'congestion', 'weather', 'pandemic'], riskScore: 7.8 },
  'Sydney': { risk: 'low', factors: ['stable_politics', 'good_infrastructure'], riskScore: 3.2 }
};

// Generate realistic disaster scenario based on current data
export const generateDisasterScenario = (mapData) => {
  const scenario = DISASTER_SCENARIOS[Math.floor(Math.random() * DISASTER_SCENARIOS.length)];
  
  // Analyze current routes and incidents to make scenario more realistic
  const highRiskPorts = mapData.warehouses.filter(port => 
    PORT_VULNERABILITIES[port]?.risk === 'high'
  );
  
  const activeIncidents = mapData.incidents.length;
  const routeDensity = mapData.routes.length;
  
  // Adjust scenario based on current data
  let adjustedScenario = { ...scenario };
  
  if (highRiskPorts.length > 0) {
    adjustedScenario.affectedRegions = [
      ...scenario.affectedRegions,
      ...highRiskPorts.slice(0, 2)
    ];
  }
  
  if (activeIncidents > 5) {
    adjustedScenario.severity = Math.min(5, adjustedScenario.severity + 1);
    adjustedScenario.probability = Math.min(0.8, adjustedScenario.probability + 0.1);
  }
  
  if (routeDensity > 8) {
    adjustedScenario.estimatedDuration = Math.min(30, adjustedScenario.estimatedDuration + 3);
  }
  
  return adjustedScenario;
};

// Generate financial impact analysis
export const generateFinancialImpact = (scenario, mapData) => {
  const baseCost = 1000000; // Base cost in USD
  const severityMultiplier = scenario.severity * 0.3;
  const routeMultiplier = mapData.routes.length * 0.1;
  const incidentMultiplier = mapData.incidents.length * 0.05;
  
  const totalWithoutMitigation = Math.round(
    baseCost * (1 + severityMultiplier + routeMultiplier + incidentMultiplier)
  );
  
  const mitigationEffectiveness = 0.6 + (Math.random() * 0.3); // 60-90% effectiveness
  const totalWithMitigation = Math.round(totalWithoutMitigation * (1 - mitigationEffectiveness));
  
  return {
    withoutMitigation: totalWithoutMitigation,
    withMitigation: totalWithMitigation,
    savings: totalWithoutMitigation - totalWithMitigation,
    breakdown: {
      operational: Math.round(totalWithoutMitigation * 0.4),
      inventory: Math.round(totalWithoutMitigation * 0.25),
      transportation: Math.round(totalWithoutMitigation * 0.2),
      customer: Math.round(totalWithoutMitigation * 0.1),
      regulatory: Math.round(totalWithoutMitigation * 0.05)
    }
  };
};

// Generate time impact analysis
export const generateTimeImpact = (scenario, mapData) => {
  const baseDelay = scenario.estimatedDuration;
  const routeComplexity = Math.min(10, mapData.routes.length);
  const complexityMultiplier = 1 + (routeComplexity * 0.1);
  
  const withoutMitigation = Math.round(baseDelay * complexityMultiplier);
  const withMitigation = Math.round(withoutMitigation * 0.7); // 30% time reduction
  
  return {
    withoutMitigation,
    withMitigation,
    timeSaved: withoutMitigation - withMitigation,
    breakdown: {
      procurement: Math.round(withMitigation * 0.2),
      production: Math.round(withMitigation * 0.3),
      transportation: Math.round(withMitigation * 0.3),
      delivery: Math.round(withMitigation * 0.2)
    }
  };
};

// Generate operational impact analysis
export const generateOperationalImpact = (scenario, mapData) => {
  const affectedRoutes = Math.min(mapData.routes.length, Math.ceil(mapData.routes.length * 0.4));
  const affectedLocations = Math.min(mapData.warehouses.length, Math.ceil(mapData.warehouses.length * 0.3));
  
  return {
    affectedRoutes,
    affectedLocations,
    affectedProducts: Math.round(affectedRoutes * 1.5),
    customerOrdersAffected: Math.round(affectedRoutes * 100),
    supplyChainDisruption: scenario.severity > 3 ? 'Critical' : scenario.severity > 2 ? 'High' : 'Moderate'
  };
};

// Generate mitigation strategies
export const generateMitigationStrategies = (scenario, mapData) => {
  const strategies = [
    {
      id: 'mit_001',
      name: 'Alternative Route Planning',
      description: 'Establish backup shipping routes through different regions and ports',
      implementationTime: 7,
      implementationCost: 150000,
      effectiveness: 0.85,
      riskLevel: 'low',
      requiredResources: ['Route Analysis', 'Port Agreements', 'Insurance Updates'],
      dependencies: ['Geopolitical Assessment', 'Port Capacity Analysis'],
      applicableScenarios: ['geo_political', 'natural_disaster', 'labor_dispute']
    },
    {
      id: 'mit_002',
      name: 'Inventory Buffer Increase',
      description: 'Increase safety stock levels for critical products and materials',
      implementationTime: 14,
      implementationCost: 300000,
      effectiveness: 0.75,
      riskLevel: 'medium',
      requiredResources: ['Warehouse Space', 'Working Capital', 'Demand Forecasting'],
      dependencies: ['Storage Capacity', 'Financial Approval'],
      applicableScenarios: ['all']
    },
    {
      id: 'mit_003',
      name: 'Multi-Modal Transportation',
      description: 'Develop air freight and rail alternatives to reduce sea route dependency',
      implementationTime: 21,
      implementationCost: 500000,
      effectiveness: 0.8,
      riskLevel: 'medium',
      requiredResources: ['Carrier Agreements', 'Route Planning', 'Cost Analysis'],
      dependencies: ['Infrastructure Assessment', 'Regulatory Compliance'],
      applicableScenarios: ['geo_political', 'natural_disaster', 'cyber_attack']
    },
    {
      id: 'mit_004',
      name: 'Digital Twin Implementation',
      description: 'Create real-time digital replicas of supply chain for scenario planning',
      implementationTime: 30,
      implementationCost: 750000,
      effectiveness: 0.9,
      riskLevel: 'low',
      requiredResources: ['IoT Sensors', 'Data Analytics', 'AI Models'],
      dependencies: ['Technology Infrastructure', 'Data Governance'],
      applicableScenarios: ['all']
    },
    {
      id: 'mit_005',
      name: 'Emergency Response Protocol',
      description: 'Establish comprehensive emergency response and communication protocols',
      implementationTime: 10,
      implementationCost: 100000,
      effectiveness: 0.7,
      riskLevel: 'low',
      requiredResources: ['Process Documentation', 'Training Programs', 'Communication Tools'],
      dependencies: ['Stakeholder Buy-in', 'Resource Allocation'],
      applicableScenarios: ['all']
    }
  ];
  
  // Filter strategies based on scenario type
  return strategies.filter(strategy => 
    strategy.applicableScenarios.includes('all') || 
    strategy.applicableScenarios.includes(scenario.id)
  ).slice(0, 3); // Return top 3 most relevant strategies
};

// Generate insights and recommendations
export const generateInsights = (scenario, mapData, financialImpact, timeImpact) => {
  const insights = [
    `${scenario.type} in the ${scenario.affectedRegions.slice(0, 2).join(' and ')} regions pose significant risks to supply chain operations`,
    `Alternative routes could add ${Math.round(timeImpact.withoutMitigation * 0.3)}-${Math.round(timeImpact.withoutMitigation * 0.5)} days to transit times`,
    `Inventory buffers could provide ${Math.round(timeImpact.withoutMitigation * 0.4)}-${Math.round(timeImpact.withoutMitigation * 0.6)} days of protection against disruptions`,
    `Multi-modal transportation options could reduce dependency on affected routes by up to ${Math.round((1 - timeImpact.withMitigation / timeImpact.withoutMitigation) * 100)}%`,
    `Real-time monitoring systems could reduce response time by ${Math.round(timeImpact.timeSaved * 0.3)}-${Math.round(timeImpact.timeSaved * 0.5)} days`
  ];
  
  const recommendations = [
    'Implement real-time route monitoring and alert systems',
    'Develop relationships with alternative port operators and carriers',
    'Establish emergency response protocols for supply chain disruptions',
    'Consider air freight options for high-value, time-sensitive shipments',
    'Invest in digital transformation for better visibility and control',
    'Build strategic partnerships for risk sharing and resource pooling'
  ];
  
  return { insights, recommendations };
};

// Main function to generate complete AI analysis
export const generateAIAnalysis = (mapData) => {
  // Generate disaster scenario
  const disasterScenario = generateDisasterScenario(mapData);
  
  // Generate impact analysis
  const financialImpact = generateFinancialImpact(disasterScenario, mapData);
  const timeImpact = generateTimeImpact(disasterScenario, mapData);
  const operationalImpact = generateOperationalImpact(disasterScenario, mapData);
  
  // Generate mitigation strategies
  const mitigationStrategies = generateMitigationStrategies(disasterScenario, mapData);
  
  // Generate insights and recommendations
  const { insights, recommendations } = generateInsights(disasterScenario, mapData, financialImpact, timeImpact);
  
  // Calculate confidence score based on data quality
  const dataQuality = Math.min(1, (mapData.routes.length / 10) + (mapData.incidents.length / 5));
  const confidenceScore = 0.7 + (dataQuality * 0.2) + (Math.random() * 0.1);
  
  return {
    disasterScenario,
    impactAnalysis: {
      financialImpact,
      timeImpact,
      operationalImpact
    },
    mitigationStrategies,
    insights,
    recommendations,
    confidenceScore: Math.min(0.95, confidenceScore),
    analysisTimestamp: new Date().toISOString(),
    dataQuality: {
      routesAnalyzed: mapData.routes.length,
      incidentsAnalyzed: mapData.incidents.length,
      portsAnalyzed: mapData.warehouses.length,
      coverageScore: Math.min(1, (mapData.routes.length + mapData.incidents.length) / 15)
    }
  };
};

// Generate real-time alerts based on current data
export const generateRealTimeAlerts = (mapData) => {
  const alerts = [];
  
  // High severity incident alerts
  const highSeverityIncidents = mapData.incidents.filter(i => i.severity === 3);
  if (highSeverityIncidents.length > 0) {
    alerts.push({
      type: 'warning',
      title: 'High Severity Incidents Detected',
      message: `${highSeverityIncidents.length} high-severity incidents require immediate attention`,
      priority: 'high',
      timestamp: new Date().toISOString()
    });
  }
  
  // Route congestion alerts
  if (mapData.routes.length > 8) {
    alerts.push({
      type: 'info',
      title: 'High Route Density',
      message: 'Supply chain network shows high activity - monitor for potential bottlenecks',
      priority: 'medium',
      timestamp: new Date().toISOString()
    });
  }
  
  // Port risk alerts
  const highRiskPorts = mapData.warehouses.filter(port => 
    PORT_VULNERABILITIES[port]?.risk === 'high'
  );
  
  if (highRiskPorts.length > 0) {
    alerts.push({
      type: 'warning',
      title: 'High-Risk Ports Identified',
      message: `${highRiskPorts.length} ports identified as high-risk - consider mitigation strategies`,
      priority: 'medium',
      timestamp: new Date().toISOString()
    });
  }
  
  // Route vulnerability alerts
  const routeDensity = mapData.routes.length;
  if (routeDensity > 10) {
    alerts.push({
      type: 'info',
      title: 'High Network Complexity',
      message: 'Supply chain network shows high complexity - increased risk of cascading failures',
      priority: 'medium',
      timestamp: new Date().toISOString()
    });
  }
  
  // Incident pattern alerts
  const incidentTypes = mapData.incidents.map(i => i.type);
  const uniqueTypes = [...new Set(incidentTypes)];
  if (uniqueTypes.length > 3) {
    alerts.push({
      type: 'warning',
      title: 'Multiple Incident Types',
      message: `${uniqueTypes.length} different types of incidents detected - systemic risk assessment recommended`,
      priority: 'high',
      timestamp: new Date().toISOString()
    });
  }
  
  return alerts;
};
