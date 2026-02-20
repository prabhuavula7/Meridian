/**
 * Backend API Integration
 * Handles communication with the supply chain analysis backend
 */

import { debugError, debugLog, debugWarn } from './logger';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5050/api/v1';
const REQUEST_CACHE_SCHEMA_VERSION = 'v2';
const REQUEST_CACHE_TTL_MS = Number(process.env.REACT_APP_REQUEST_CACHE_TTL_MS || 15 * 60 * 1000);
const ROUTE_ENRICH_CACHE_MAX = Number(process.env.REACT_APP_ROUTE_ENRICH_CACHE_MAX || 8);
const ANALYSIS_CACHE_MAX = Number(process.env.REACT_APP_ANALYSIS_CACHE_MAX || 6);
const routeEnrichmentCache = new Map();
const analysisCache = new Map();

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createRequestCacheKey(prefix, payload) {
  const serialized = JSON.stringify({
    schemaVersion: REQUEST_CACHE_SCHEMA_VERSION,
    payload,
  });
  return `${prefix}:${hashString(serialized)}`;
}

function getCachedResponse(cache, key) {
  const cachedEntry = cache.get(key);
  if (!cachedEntry) {
    return null;
  }

  if (Date.now() > cachedEntry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return deepClone(cachedEntry.response);
}

function setCachedResponse(cache, key, response, maxEntries) {
  if (cache.size >= maxEntries) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }

  cache.set(key, {
    response: deepClone(response),
    expiresAt: Date.now() + REQUEST_CACHE_TTL_MS,
  });
}

/**
 * API Response wrapper
 */
class APIResponse {
  constructor(success, data, error, timestamp, requestId) {
    this.success = success;
    this.data = data;
    this.error = error;
    this.timestamp = timestamp;
    this.requestId = requestId;
  }

  static fromResponse(response) {
    return new APIResponse(
      response.success,
      response.data,
      response.error,
      response.timestamp,
      response.requestId
    );
  }
}

/**
 * API Error class
 */
class APIError extends Error {
  constructor(message, statusCode, details, requestId) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.details = details;
    this.requestId = requestId;
  }
}

function createRequestId() {
  return `frontend_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Make HTTP request to the backend
 */
async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const requestId = createRequestId();
  const method = options.method || 'GET';

  const defaultOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
    },
    ...options,
  };

  try {
    debugLog('backendApi', `Request started: ${method} ${url}`, { requestId });
    const response = await fetch(url, defaultOptions);

    let responseData = null;
    try {
      responseData = await response.json();
    } catch (_err) {
      responseData = null;
    }

    if (!response.ok) {
      debugWarn('backendApi', `Request failed: ${method} ${url}`, {
        requestId,
        status: response.status,
        statusText: response.statusText,
        error: responseData?.error,
      });
      throw new APIError(
        responseData?.error?.message
          || responseData?.error
          || responseData?.detail
          || response.statusText
          || 'Request failed',
        response.status,
        responseData?.error?.details || [],
        requestId
      );
    }

    if (!responseData || typeof responseData !== 'object') {
      debugLog('backendApi', `Request completed without JSON payload: ${method} ${url}`, { requestId });
      return new APIResponse(true, null, null, new Date().toISOString(), requestId);
    }

    debugLog('backendApi', `Request completed: ${method} ${url}`, {
      requestId,
      success: responseData.success,
      hasData: Boolean(responseData.data),
    });
    return APIResponse.fromResponse(responseData);
  } catch (error) {
    if (error instanceof APIError) {
      debugError('backendApi', `APIError: ${method} ${url}`, {
        requestId,
        statusCode: error.statusCode,
        message: error.message,
        details: error.details,
      });
      throw error;
    }

    debugError('backendApi', `Unexpected request error: ${method} ${url}`, {
      requestId,
      message: error.message,
    });
    throw new APIError(
      error.message || 'Network error occurred',
      0,
      [],
      requestId
    );
  }
}

/**
 * Analyze supply chain data using the backend
 */
export async function analyzeSupplyChain(supplyChainData, customPrompt = null, preferences = null) {
  debugLog('backendApi', 'Preparing analyzeSupplyChain payload', {
    locations: supplyChainData?.locations?.length || 0,
    routes: supplyChainData?.routes?.length || 0,
    products: supplyChainData?.products?.length || 0,
    incidents: supplyChainData?.incidents?.length || 0,
  });

  const requestBody = {
    supplyChainData,
    ...(customPrompt && { customPrompt }),
    ...(preferences && { preferences }),
  };

  const cacheKey = createRequestCacheKey('analysis', requestBody);
  const cachedResponse = getCachedResponse(analysisCache, cacheKey);
  if (cachedResponse) {
    debugLog('backendApi', 'Analysis cache hit', { cacheKey });
    return cachedResponse;
  }

  const response = await makeRequest('/analyze-supply-chain', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });

  if (response?.success) {
    setCachedResponse(analysisCache, cacheKey, response, ANALYSIS_CACHE_MAX);
    debugLog('backendApi', 'Analysis response cached', { cacheKey });
  }

  return response;
}

/**
 * Resolve map-ready transport hubs and mode-aware route geometry
 */
export async function enrichRoutesForMap(rows, fieldMappings = {}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('No rows available to enrich');
  }

  debugLog('backendApi', 'Preparing route enrichment payload', {
    rows: rows.length,
    mappedFields: Object.keys(fieldMappings || {}).length,
  });

  const requestBody = {
    rows,
    fieldMappings,
  };

  const cacheKey = createRequestCacheKey('route_enrich', requestBody);
  const cachedResponse = getCachedResponse(routeEnrichmentCache, cacheKey);
  if (cachedResponse) {
    debugLog('backendApi', 'Route enrichment cache hit', { cacheKey, rows: rows.length });
    return cachedResponse;
  }

  const response = await makeRequest('/routes/enrich', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });

  if (response?.success) {
    setCachedResponse(routeEnrichmentCache, cacheKey, response, ROUTE_ENRICH_CACHE_MAX);
    debugLog('backendApi', 'Route enrichment response cached', { cacheKey, rows: rows.length });
  }

  return response;
}

/**
 * Check backend health
 */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL.replace('/api/v1', '')}/health`);
    debugLog('backendApi', 'Backend health check completed', { ok: response.ok, status: response.status });
    return response.ok;
  } catch (error) {
    debugError('backendApi', 'Backend health check failed', { message: error.message });
    return false;
  }
}

/**
 * Check analysis service health
 */
export async function checkAnalysisServiceHealth() {
  return makeRequest('/analysis/health');
}

/**
 * Get analysis statistics
 */
export async function getAnalysisStats() {
  return makeRequest('/analysis/stats');
}

/**
 * Upload raw file to Python ingestion API (bronze layer).
 */
export async function uploadIngestionFile(file) {
  if (!file) {
    throw new Error('File is required for ingestion upload.');
  }

  const url = `${API_BASE_URL}/ingest/upload`;
  const requestId = createRequestId();
  const formData = new FormData();
  formData.append('file', file);

  debugLog('backendApi', `Ingestion upload started: ${url}`, {
    requestId,
    fileName: file.name,
    sizeBytes: file.size,
  });

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Request-ID': requestId,
      },
      body: formData,
    });
  } catch (error) {
    throw new APIError(error.message || 'Network error occurred', 0, [], requestId);
  }

  let responseData = null;
  try {
    responseData = await response.json();
  } catch (_err) {
    responseData = null;
  }

  if (!response.ok) {
    throw new APIError(
      responseData?.detail || response.statusText || 'Ingestion upload failed',
      response.status,
      [],
      requestId
    );
  }

  return APIResponse.fromResponse(responseData || { success: true, data: null });
}

export async function listIngestionUploads(limit = 20) {
  return makeRequest(`/ingest/uploads?limit=${limit}`);
}

export async function normalizeIngestionUpload(uploadId, maxErrors = 100) {
  if (!uploadId) {
    throw new Error('uploadId is required.');
  }
  return makeRequest(`/ingest/uploads/${uploadId}/normalize?max_errors=${maxErrors}`, {
    method: 'POST',
  });
}

export async function getIngestionNormalization(uploadId) {
  if (!uploadId) {
    throw new Error('uploadId is required.');
  }
  return makeRequest(`/ingest/uploads/${uploadId}/normalization`);
}

const FIELD_ALIASES = {
  warehouse_location: ['warehouse_location', 'warehouse', 'location', 'facility', 'site', 'plant'],
  origin_location: ['origin_location', 'origin', 'from_location', 'source', 'Origin_Point'],
  destination_location: ['destination_location', 'destination', 'to_location', 'end_location', 'Destination_Point'],
  mode_of_transport: ['mode_of_transport', 'transport_mode', 'mode', 'shipping_method'],
  lead_time: ['lead_time', 'lead_time_days', 'transit_time', 'delivery_time'],
  product_cost: ['product_cost', 'unit_cost', 'cost', 'price'],
  quantity: ['quantity', 'qty', 'volume', 'units', 'pieces'],
  product_name: ['product_name', 'product', 'cargo_type', 'item', 'sku_name'],
  product_category: ['product_category', 'category', 'commodity'],
  sku: ['sku', 'product_sku', 'material_code', 'order_id'],
};

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function hashString(value) {
  return String(value || '').split('').reduce((acc, char) => {
    const next = (acc << 5) - acc + char.charCodeAt(0);
    return next & next;
  }, 0);
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toPositiveInt(value, fallback = 1) {
  const num = Math.round(toNumber(value, fallback));
  return num > 0 ? num : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getMappedValue(row, fieldMappings, canonicalField) {
  if (!fieldMappings || typeof fieldMappings !== 'object') {
    return undefined;
  }

  const directMappedField = fieldMappings[canonicalField];
  if (directMappedField && row[directMappedField] !== undefined && row[directMappedField] !== null && row[directMappedField] !== '') {
    return row[directMappedField];
  }

  for (const [sourceField, targetField] of Object.entries(fieldMappings)) {
    if (targetField === canonicalField && row[sourceField] !== undefined && row[sourceField] !== null && row[sourceField] !== '') {
      return row[sourceField];
    }
  }

  return undefined;
}

function getFieldValue(row, fieldMappings, canonicalField) {
  if (!row || typeof row !== 'object') {
    return undefined;
  }

  if (row[canonicalField] !== undefined && row[canonicalField] !== null && row[canonicalField] !== '') {
    return row[canonicalField];
  }

  const aliases = FIELD_ALIASES[canonicalField] || [];
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== null && row[alias] !== '') {
      return row[alias];
    }
  }

  return getMappedValue(row, fieldMappings, canonicalField);
}

function determineLocationType(locationName) {
  const normalized = String(locationName || '').toLowerCase();

  if (normalized.includes('port') || normalized.includes('harbor')) {
    return 'port';
  }

  if (normalized.includes('warehouse') || normalized.includes('storage')) {
    return 'warehouse';
  }

  if (normalized.includes('factory') || normalized.includes('plant')) {
    return 'manufacturing_plant';
  }

  return 'distribution_center';
}

function generateCoordinatesFromName(locationName) {
  const hash = hashString(locationName);
  const longitude = clamp(((hash % 360) - 180) + (Math.sin(hash) * 0.7), -179.9, 179.9);
  const latitude = clamp(((Math.abs(hash) % 180) - 90) + (Math.cos(hash) * 0.7), -89.9, 89.9);
  return [longitude, latitude];
}

function normalizeTransportMode(mode) {
  const modeMap = {
    sea: 'sea',
    ocean: 'sea',
    ship: 'sea',
    maritime: 'sea',
    air: 'air',
    plane: 'air',
    rail: 'rail',
    train: 'rail',
    road: 'road',
    truck: 'road',
    car: 'road',
    multimodal: 'multimodal',
  };

  const normalized = String(mode || 'sea').toLowerCase().trim();
  return modeMap[normalized] || 'sea';
}

function generateIncidents(locations, routes) {
  if (locations.length === 0 || routes.length === 0) {
    return [];
  }

  const incidentTypes = ['technical_failure', 'natural_disaster', 'labor_dispute', 'security_breach', 'regulatory_issue'];
  const totalIncidents = Math.min(3, Math.max(1, Math.floor(routes.length / 4)));
  const incidents = [];

  for (let index = 0; index < totalIncidents; index += 1) {
    const route = routes[index % routes.length];
    const location = route.origin;
    const severity = clamp(2 + (index % 3), 1, 5);
    const type = incidentTypes[index % incidentTypes.length];

    incidents.push({
      id: `inc_${index + 1}`,
      type,
      severity,
      location,
      description: `Simulated ${type.replace(/_/g, ' ')} affecting ${location.name}`,
      startTime: new Date(Date.now() - ((index + 1) * 24 * 60 * 60 * 1000)).toISOString(),
      estimatedResolutionTime: new Date(Date.now() + ((index + 2) * 24 * 60 * 60 * 1000)).toISOString(),
      status: 'active',
      affectedRoutes: [route.id],
      estimatedFinancialImpact: 25000 * (index + 1),
    });
  }

  return incidents;
}

/**
 * Transform frontend data to backend format
 */
export function transformDataForBackend(uploadedData, fieldMappings = {}) {
  if (!Array.isArray(uploadedData) || uploadedData.length === 0) {
    throw new Error('No uploaded data available for backend analysis');
  }

  debugLog('backendApi', 'Transform started', {
    rows: uploadedData.length,
    mappedFields: Object.keys(fieldMappings || {}).length,
  });

  const locations = [];
  const locationMap = new Map();
  const routes = [];
  const products = [];

  const getOrCreateLocation = (name) => {
    const locationName = String(name || '').trim();
    if (!locationName) {
      return null;
    }

    const locationId = `loc_${slugify(locationName)}`;
    if (locationMap.has(locationId)) {
      return locationMap.get(locationId);
    }

    const location = {
      id: locationId,
      name: locationName,
      coordinates: generateCoordinatesFromName(locationName),
      type: determineLocationType(locationName),
      status: 'operational',
      capacityUtilization: clamp(65 + (Math.abs(hashString(locationName)) % 30), 0, 100),
    };

    locationMap.set(locationId, location);
    locations.push(location);
    return location;
  };

  uploadedData.forEach((row, index) => {
    const originName = getFieldValue(row, fieldMappings, 'origin_location') || getFieldValue(row, fieldMappings, 'warehouse_location');
    const destinationName = getFieldValue(row, fieldMappings, 'destination_location');

    const origin = getOrCreateLocation(originName);
    const destination = getOrCreateLocation(destinationName);

    if (!origin || !destination) {
      return;
    }

    const transitTime = toPositiveInt(getFieldValue(row, fieldMappings, 'lead_time'), 7);
    const costPerUnit = Math.max(0, toNumber(getFieldValue(row, fieldMappings, 'product_cost'), 0));
    const volumeCapacity = toPositiveInt(getFieldValue(row, fieldMappings, 'quantity'), 100);

    routes.push({
      id: `route_${index + 1}`,
      origin,
      destination,
      transportMode: normalizeTransportMode(getFieldValue(row, fieldMappings, 'mode_of_transport')),
      transitTime,
      status: 'active',
      costPerUnit,
      volumeCapacity,
      utilization: clamp(55 + (index % 40), 0, 100),
    });

    const productName = getFieldValue(row, fieldMappings, 'product_name') || `Product ${index + 1}`;
    const productCategory = getFieldValue(row, fieldMappings, 'product_category') || 'General';
    const sku = getFieldValue(row, fieldMappings, 'sku') || `SKU-${index + 1}`;

    products.push({
      id: `prod_${index + 1}`,
      name: String(productName),
      category: String(productCategory),
      sku: String(sku),
      unitCost: costPerUnit,
      inventoryLevel: volumeCapacity,
      reorderPoint: Math.max(1, Math.floor(volumeCapacity * 0.2)),
      leadTime: transitTime,
    });
  });

  if (routes.length === 0 || locations.length === 0 || products.length === 0) {
    throw new Error('Unable to map uploaded rows to required backend fields (origin/destination/products)');
  }

  const incidents = generateIncidents(locations, routes);

  debugLog('backendApi', 'Transform completed', {
    locations: locations.length,
    routes: routes.length,
    products: products.length,
    incidents: incidents.length,
  });

  return {
    locations,
    routes,
    products,
    incidents,
    metadata: {
      source: 'user_upload',
      lastUpdated: new Date().toISOString(),
      version: '1.0',
      totalRecords: uploadedData.length,
    },
  };
}

/**
 * Export the API functions and classes
 */
export { APIResponse, APIError, makeRequest };
