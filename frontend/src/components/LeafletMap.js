import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Bot, CheckCircle2, KeyRound, Map as MapIcon, X } from 'lucide-react';
import { MapContainer, TileLayer, Popup, Polyline, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { generateAIAnalysis, generateRealTimeAlerts, isOpenAIConfigured } from '../services/openaiService';
import { debounce } from '../utils/debounce';
import { debugError, debugLog } from '../utils/logger';

// Fix for default markers in Leaflet
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const CITY_COORDINATE_FALLBACKS = {
  shanghai: [31.2304, 121.4737],
  losangeles: [34.0522, -118.2437],
  rotterdam: [51.9225, 4.4792],
  singapore: [1.3521, 103.8198],
  dubai: [25.2048, 55.2708],
  hamburg: [53.5511, 9.9937],
  newyork: [40.7128, -74.006],
  tokyo: [35.6762, 139.6503],
  mumbai: [19.076, 72.8777],
  sydney: [-33.8688, 151.2093],
  panama: [8.9833, -79.5167],
  suez: [30.0055, 32.5498],
  malacca: [2.1896, 102.2501]
};

const normalizeLocationLabel = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

const parseLonLat = (value) => {
  if (Array.isArray(value) && value.length === 2) {
    const lon = Number(value[0]);
    const lat = Number(value[1]);
    if (Number.isFinite(lon) && Number.isFinite(lat)) {
      return [lon, lat];
    }
  }

  if (typeof value === 'string') {
    const parts = value.split(',').map((part) => Number(part.trim()));
    if (parts.length === 2 && parts.every((part) => Number.isFinite(part))) {
      return [parts[0], parts[1]];
    }

    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.length === 2) {
        const lon = Number(parsed[0]);
        const lat = Number(parsed[1]);
        if (Number.isFinite(lon) && Number.isFinite(lat)) {
          return [lon, lat];
        }
      }
    } catch (_error) {
      return null;
    }
  }

  return null;
};

const parseRouteGeometry = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((coord) => parseLonLat(coord))
      .filter((coord) => Array.isArray(coord) && coord.length === 2);
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((coord) => parseLonLat(coord))
          .filter((coord) => Array.isArray(coord) && coord.length === 2);
      }
    } catch (_error) {
      return [];
    }
  }

  return [];
};

const toLeafletLatLng = ([lon, lat]) => [lat, lon];

const splitPathOnAntimeridian = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return Array.isArray(coordinates) && coordinates.length ? [coordinates] : [];
  }

  const segments = [];
  let currentSegment = [coordinates[0]];

  for (let index = 1; index < coordinates.length; index += 1) {
    const previous = coordinates[index - 1];
    const next = coordinates[index];
    const prevLon = Number(previous[0]);
    const prevLat = Number(previous[1]);
    const nextLon = Number(next[0]);
    const nextLat = Number(next[1]);

    const crossesPositiveDateline = prevLon > 0 && nextLon < 0 && (prevLon - nextLon) > 180;
    const crossesNegativeDateline = prevLon < 0 && nextLon > 0 && (nextLon - prevLon) > 180;

    if (crossesPositiveDateline) {
      const adjustedNextLon = nextLon + 360;
      const ratio = (180 - prevLon) / (adjustedNextLon - prevLon);
      const crossingLat = prevLat + ((nextLat - prevLat) * ratio);
      currentSegment.push([180, crossingLat]);
      if (currentSegment.length >= 2) {
        segments.push(currentSegment);
      }
      currentSegment = [[-180, crossingLat], next];
      continue;
    }

    if (crossesNegativeDateline) {
      const adjustedNextLon = nextLon - 360;
      const ratio = (-180 - prevLon) / (adjustedNextLon - prevLon);
      const crossingLat = prevLat + ((nextLat - prevLat) * ratio);
      currentSegment.push([-180, crossingLat]);
      if (currentSegment.length >= 2) {
        segments.push(currentSegment);
      }
      currentSegment = [[180, crossingLat], next];
      continue;
    }

    currentSegment.push(next);
  }

  if (currentSegment.length >= 2) {
    segments.push(currentSegment);
  }

  return segments;
};

const buildLeafletPaths = (coordinates) => {
  const splitSegments = splitPathOnAntimeridian(coordinates);
  return splitSegments
    .map((segment) => segment.map(toLeafletLatLng))
    .filter((segment) => Array.isArray(segment) && segment.length >= 2);
};

const parseRouteSegments = (value) => {
  const parsed = typeof value === 'string' ? (() => {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return [];
    }
  })() : value;

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter((segment) => segment && typeof segment === 'object');
};

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const getRiskLevel = (row) => String(row.route_risk_level || '').toLowerCase().trim();

const isLowRiskRoute = (row) => {
  const level = getRiskLevel(row);
  if (level === 'low') {
    return true;
  }

  const riskScore = toNumber(row.route_risk_score);
  return riskScore !== null && riskScore <= 0.35;
};

const getSegmentPointBudget = (routeCount) => {
  if (routeCount >= 1000) return 10;
  if (routeCount >= 600) return 12;
  if (routeCount >= 300) return 18;
  if (routeCount >= 150) return 24;
  return 34;
};

const simplifyLonLatPath = (coordinates, maxPoints) => {
  if (!Array.isArray(coordinates) || coordinates.length <= maxPoints) {
    return coordinates;
  }

  const simplified = [coordinates[0]];
  const middleCount = Math.max(0, maxPoints - 2);
  const stride = (coordinates.length - 2) / Math.max(1, middleCount);

  for (let index = 0; index < middleCount; index += 1) {
    const sourceIndex = Math.max(1, Math.min(coordinates.length - 2, Math.round(1 + (index * stride))));
    const point = coordinates[sourceIndex];
    if (point) {
      simplified.push(point);
    }
  }

  simplified.push(coordinates[coordinates.length - 1]);
  return simplified;
};

const findFallbackCoordinates = (locationName) => {
  const normalized = normalizeLocationLabel(locationName);
  if (!normalized) {
    return null;
  }

  const directKey = Object.keys(CITY_COORDINATE_FALLBACKS).find((key) =>
    normalized.includes(key) || key.includes(normalized)
  );
  if (directKey) {
    const [lat, lng] = CITY_COORDINATE_FALLBACKS[directKey];
    return [lng, lat];
  }

  return null;
};

const ROUTE_MODE_STYLES = {
  sea: { color: '#0ea5e9', hoverColor: '#38bdf8', label: 'Maritime' },
  air: { color: '#22c55e', hoverColor: '#4ade80', label: 'Air' },
  road: { color: '#f97316', hoverColor: '#fb923c', label: 'Land' },
  rail: { color: '#ef4444', hoverColor: '#f87171', label: 'Rail' },
  multimodal: { color: '#a3a3a3', hoverColor: '#d4d4d4', label: 'Multimodal' },
};

const LOW_RISK_STYLE = {
  color: '#9ca3af',
  hoverColor: '#d1d5db',
  label: 'Low Risk',
  opacity: 0.2,
};

const normalizeTransportMode = (rawMode) => {
  const normalized = String(rawMode || 'sea').toLowerCase().trim();
  if (normalized.includes('air') || normalized.includes('plane') || normalized.includes('aviation')) {
    return 'air';
  }
  if (normalized.includes('rail') || normalized.includes('train')) {
    return 'rail';
  }
  if (normalized.includes('road') || normalized.includes('truck') || normalized.includes('land') || normalized.includes('highway')) {
    return 'road';
  }
  if (normalized.includes('multi')) {
    return 'multimodal';
  }
  return 'sea';
};

const getRouteModeStyle = (mode, isHovered = false, lowRisk = false) => {
  if (lowRisk && !isHovered) {
    return {
      mode: normalizeTransportMode(mode),
      label: LOW_RISK_STYLE.label,
      color: LOW_RISK_STYLE.color,
      opacity: LOW_RISK_STYLE.opacity,
    };
  }

  const resolvedMode = normalizeTransportMode(mode);
  const modeStyle = ROUTE_MODE_STYLES[resolvedMode] || ROUTE_MODE_STYLES.sea;
  return {
    mode: resolvedMode,
    label: modeStyle.label,
    color: isHovered ? modeStyle.hoverColor : modeStyle.color,
    opacity: isHovered ? 0.98 : 0.8,
  };
};

const LeafletMap = React.memo(({ data, onAnalysisComplete }) => {
  const viewState = {
    center: [20, 0],
    zoom: 2
  };
  const [hoveredRouteId, setHoveredRouteId] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [hoveredSegmentMode, setHoveredSegmentMode] = useState(null);
  const [modeFilters, setModeFilters] = useState({
    sea: true,
    air: true,
    road: true,
    rail: true,
    multimodal: true,
  });

  const [alerts, setAlerts] = useState([]);
  const [analysisStatus, setAnalysisStatus] = useState('idle');
  
  // Refs for cleanup
  const mapRef = useRef(null);
  const timeoutRef = useRef(null);
  const intervalRef = useRef(null);

  // Process data for map visualization
  const mapData = useMemo(() => {
    if (!data || data.length === 0) {
      return { routes: [], incidents: [], hubs: [], warehouses: [] };
    }

    const routes = [];
    const hubsMap = new Map();
    const incidents = [];
    const pointBudgetPerSegment = getSegmentPointBudget(data.length);

    // Process shipping routes
    data.forEach((row, index) => {
      const origin = row.origin_location || row.origin || row.from_location || row.source || row.Origin_Point;
      const destination = row.destination_location || row.destination || row.to_location || row.end_location || row.Destination_Point;
      const modeRaw = row.mode_of_transport || row.transport_mode || 'sea';
      const mode = normalizeTransportMode(modeRaw);
      const modeStyle = getRouteModeStyle(mode, false, false);

      if (!origin || !destination) {
        return;
      }

      const originLonLat =
        parseLonLat(row.origin_coordinates) ||
        parseLonLat([row.origin_longitude, row.origin_latitude]) ||
        findFallbackCoordinates(origin);
      const destinationLonLat =
        parseLonLat(row.destination_coordinates) ||
        parseLonLat([row.destination_longitude, row.destination_latitude]) ||
        findFallbackCoordinates(destination);

      if (!originLonLat || !destinationLonLat) {
        return;
      }

      const segmentPayload = parseRouteSegments(row.route_segments);
      const routeSegments = segmentPayload
        .map((segment, segmentIndex) => {
          const segmentMode = normalizeTransportMode(segment.mode || mode);
          const segmentCoordinates = simplifyLonLatPath(
            parseRouteGeometry(segment.coordinates),
            pointBudgetPerSegment
          );
          if (!segmentCoordinates || segmentCoordinates.length < 2) {
            return null;
          }

          const pathGroups = buildLeafletPaths(segmentCoordinates);
          if (pathGroups.length === 0) {
            return null;
          }

          return {
            id: `${index}-seg-${segmentIndex}`,
            mode: segmentMode,
            role: String(segment.segment_role || 'main'),
            provider: String(segment.provider || row.route_provider || 'fallback'),
            coordinates: segmentCoordinates,
            pathGroups,
            distanceKm: toNumber(segment.distance_km),
            durationMinutes: toNumber(segment.duration_minutes),
          };
        })
        .filter(Boolean);

      if (routeSegments.length === 0) {
        const routeGeometry = parseRouteGeometry(row.route_geometry);
        const polylineLonLat = simplifyLonLatPath(
          routeGeometry.length >= 2 ? routeGeometry : [originLonLat, destinationLonLat],
          pointBudgetPerSegment
        );
        routeSegments.push({
          id: `${index}-seg-fallback`,
          mode,
          role: 'main',
          provider: String(row.route_provider || 'fallback'),
          coordinates: polylineLonLat,
          pathGroups: buildLeafletPaths(polylineLonLat),
          distanceKm: toNumber(row.route_distance_km),
          durationMinutes: toNumber(row.route_duration_minutes),
        });
      }

      const pathPositions = routeSegments.flatMap((segment, segmentIndex) => (
        segment.pathGroups.flatMap((group, groupIndex) => (
          segmentIndex === 0 && groupIndex === 0 ? group : group.slice(1)
        ))
      ));

      const sourcePosition = toLeafletLatLng(originLonLat);
      const targetPosition = toLeafletLatLng(destinationLonLat);
      const lowRisk = isLowRiskRoute(row);
      const routeRiskScore = toNumber(row.route_risk_score);
      const routeRiskLevel = getRiskLevel(row) || (routeRiskScore !== null && routeRiskScore <= 0.35 ? 'low' : 'medium');

      routes.push({
        id: index,
        sourcePosition,
        targetPosition,
        pathPositions,
        segments: routeSegments,
        origin: row.origin_hub_name || origin,
        destination: row.destination_hub_name || destination,
        originHubType: row.origin_hub_type || 'city_center',
        destinationHubType: row.destination_hub_type || 'city_center',
        vessel: row.vessel_name || row.vessel || 'Route Segment',
        cargo: row.product_name || row.cargo_type || 'General Cargo',
        volume: row.quantity || row.volume || 'N/A',
        cost: row.product_cost || row.cost || 'N/A',
        leadTime: row.lead_time || row.lead_time_days || 'N/A',
        transportMode: mode,
        transportModeLabel: modeStyle.label,
        routeProvider: row.route_provider || 'fallback',
        routeDistanceKm: row.route_distance_km || null,
        routeDurationMinutes: row.route_duration_minutes || null,
        routeRiskScore,
        routeRiskLevel,
        lowRisk,
      });

      const originKey = `${sourcePosition[0].toFixed(4)}:${sourcePosition[1].toFixed(4)}:${String(row.origin_hub_name || origin)}`;
      if (!hubsMap.has(originKey)) {
        hubsMap.set(originKey, {
          id: `hub-${originKey}`,
          name: row.origin_hub_name || origin,
          type: row.origin_hub_type || 'city_center',
          position: sourcePosition,
        });
      }

      const destinationKey = `${targetPosition[0].toFixed(4)}:${targetPosition[1].toFixed(4)}:${String(row.destination_hub_name || destination)}`;
      if (!hubsMap.has(destinationKey)) {
        hubsMap.set(destinationKey, {
          id: `hub-${destinationKey}`,
          name: row.destination_hub_name || destination,
          type: row.destination_hub_type || 'city_center',
          position: targetPosition,
        });
      }
    });

    // Generate simulated incidents/heat markers
    const incidentTypes = ['Storm', 'Port Congestion', 'Equipment Failure', 'Labor Strike', 'Weather Delay'];
    const incidentLocations = [
      [35.6762, 139.6503], // Tokyo
      [40.7128, -74.0060], // New York
      [51.9225, 4.4792],   // Rotterdam
      [25.2048, 55.2708],  // Dubai
      [19.0760, 72.8777],  // Mumbai
      [31.2304, 121.4737], // Shanghai
      [34.0522, -118.2437], // Los Angeles
      [1.3521, 103.8198],  // Singapore
      [53.5511, 9.9937],   // Hamburg
      [-33.8688, 151.2093] // Sydney
    ];

    incidentLocations.forEach((coords, index) => {
      const intensity = Math.floor(Math.random() * 100) + 20; // 20-120
      incidents.push({
        id: `incident-${index}`,
        position: coords,
        intensity: intensity,
        type: incidentTypes[index % incidentTypes.length],
        description: `Simulated ${incidentTypes[index % incidentTypes.length]} event`,
        severity: Math.floor(intensity / 40) + 1, // 1-3 based on intensity
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
      });
    });

    const hubs = Array.from(hubsMap.values());
    return { routes, incidents, hubs, warehouses: hubs.map((hub) => hub.name) };
  }, [data]);

  const routesById = useMemo(() => {
    const keyed = new Map();
    mapData.routes.forEach((route) => keyed.set(route.id, route));
    return keyed;
  }, [mapData.routes]);

  const selectedRoute = selectedRouteId !== null ? routesById.get(selectedRouteId) || null : null;
  const hoveredRoute = hoveredRouteId !== null ? routesById.get(hoveredRouteId) || null : null;

  const filteredRoutes = useMemo(() => {
    return mapData.routes.filter((route) => {
      if (modeFilters[route.transportMode]) {
        return true;
      }
      return route.segments.some((segment) => modeFilters[segment.mode]);
    });
  }, [mapData.routes, modeFilters]);

  useEffect(() => {
    setHoveredRouteId(null);
    setHoveredSegmentMode(null);
    setSelectedRouteId((current) => (current !== null && !routesById.has(current) ? null : current));
  }, [routesById]);

  // Debounced map updates for smooth interactions
  const debouncedMapUpdate = useMemo(
    () => debounce((newData) => {
      // Update map data smoothly
      if (isOpenAIConfigured()) {
        generateRealTimeAlerts(newData)
          .then(newAlerts => setAlerts(newAlerts))
          .catch(error => {
            debugError('LeafletMap', 'Failed to generate realtime alerts', { message: error.message });
            setAlerts([]);
          });
      }
    }, 300), // 300ms delay
    []
  );

  // Generate real-time alerts when data changes (only if OpenAI is configured)
  useEffect(() => {
    debouncedMapUpdate(mapData);
  }, [mapData, debouncedMapUpdate]);

  useEffect(() => {
    debugLog('LeafletMap', 'Map data ready', {
      routes: mapData.routes.length,
      visibleRoutes: filteredRoutes.length,
      incidents: mapData.incidents.length,
      warehouses: mapData.warehouses.length,
    });
  }, [mapData, filteredRoutes.length]);

  useEffect(() => {
    debugLog('LeafletMap', 'Route mode filters changed', modeFilters);
  }, [modeFilters]);

// Hide OpenStreetMap attribution after map loads
useEffect(() => {
  const hideAttribution = () => {
    const attributionElements = document.querySelectorAll('.leaflet-control-attribution');
    attributionElements.forEach(el => {
      el.style.display = 'none';
    });
  };

  // Hide immediately and also after a short delay to ensure map is loaded
  hideAttribution();
  const timer = setTimeout(hideAttribution, 1000);
  
  return () => clearTimeout(timer);
}, []);

// Force English language for map tiles
useEffect(() => {
  // Set document language to English
  document.documentElement.lang = 'en';
  
  // Add meta tag for language
  let metaLang = document.querySelector('meta[name="lang"]');
  if (!metaLang) {
    metaLang = document.createElement('meta');
    metaLang.name = 'lang';
    metaLang.content = 'en';
    document.head.appendChild(metaLang);
  } else {
    metaLang.content = 'en';
  }
}, []);

// Cleanup map instance and event listeners
useEffect(() => {
  return () => {
    // React-Leaflet handles map instance teardown. Only clear local timers here.
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };
}, []);

  // Handle analysis completion with OpenAI AI
  const handleAnalyzeData = useCallback(async () => {
    // Check if OpenAI is configured
    if (!isOpenAIConfigured()) {
      setAnalysisStatus('idle');
      alert('OpenAI API not configured. Please go to the "OpenAI Config" tab to set up your API key.');
      return;
    }

    setAnalysisStatus('loading');
    debugLog('LeafletMap', 'AI analysis started', {
      routes: mapData.routes.length,
      incidents: mapData.incidents.length,
      warehouses: mapData.warehouses.length,
    });
    
    try {
      // Generate comprehensive AI analysis
      const aiAnalysis = await generateAIAnalysis(mapData);
      
      // Generate real-time alerts
      const alerts = await generateRealTimeAlerts(mapData);
      
      // Combine analysis results
      const analysisResults = {
        ...aiAnalysis,
        alerts,
        summary: {
          totalRoutes: mapData.routes.length,
          totalWarehouses: mapData.warehouses.length,
          totalIncidents: mapData.incidents.length,
          riskLevel: aiAnalysis.disasterScenario.severity > 3 ? 'High' : aiAnalysis.disasterScenario.severity > 2 ? 'Medium' : 'Low'
        }
      };

      setAnalysisStatus('success');
      debugLog('LeafletMap', 'AI analysis completed successfully');
      
      // Auto-reset success status after 3 seconds
      timeoutRef.current = setTimeout(() => setAnalysisStatus('idle'), 3000);

      onAnalysisComplete(analysisResults);
    } catch (error) {
      debugError('LeafletMap', 'AI analysis failed', { message: error.message });
      setAnalysisStatus('idle');
      alert(`AI Analysis failed: ${error.message}. Please check your OpenAI configuration.`);
    }
  }, [mapData, onAnalysisComplete]);

  const renderAnalysisButtonContent = () => {
    if (analysisStatus === 'loading') {
      return (
        <span className="inline-flex items-center gap-2">
          <Bot size={16} />
          <span>Analyzing...</span>
        </span>
      );
    }

    if (analysisStatus === 'success') {
      return (
        <span className="inline-flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>Analysis Complete</span>
        </span>
      );
    }

    if (!isOpenAIConfigured()) {
      return (
        <span className="inline-flex items-center gap-2">
          <KeyRound size={16} />
          <span>Configure OpenAI First</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-2">
        <Bot size={16} />
        <span>Run AI Analysis</span>
      </span>
    );
  };

  // Tooltip content for routes
  const renderRouteTooltip = useCallback((route) => {
    const effectiveMode = hoveredSegmentMode || route.transportMode;
    const effectiveStyle = getRouteModeStyle(effectiveMode, false, route.lowRisk);
    const riskLabel = route.routeRiskLevel ? String(route.routeRiskLevel).toUpperCase() : 'N/A';
    return (
      <div className="bg-dark-900 border border-dark-700 rounded-lg p-3 shadow-lg max-w-xs">
        <h3 className="font-semibold text-white mb-2">{route.vessel}</h3>
        <div className="space-y-1 text-sm text-dark-300">
          <p><span className="text-primary-400">Route:</span> {route.origin} → {route.destination}</p>
          <p><span className="text-primary-400">Cargo:</span> {route.cargo}</p>
          <p><span className="text-primary-400">Volume:</span> {route.volume}</p>
          <p><span className="text-primary-400">Cost:</span> {route.cost}</p>
          <p><span className="text-primary-400">Lead Time:</span> {route.leadTime}</p>
          <p className="inline-flex items-center gap-2">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: effectiveStyle.color }}
            />
            <span><span className="text-primary-400">Mode:</span> {effectiveStyle.mode === 'road' ? 'Land' : effectiveStyle.mode === 'sea' ? 'Maritime' : effectiveStyle.mode === 'air' ? 'Air' : effectiveStyle.mode === 'rail' ? 'Rail' : 'Multimodal'}</span>
          </p>
          <p><span className="text-primary-400">Risk:</span> {riskLabel}{route.routeRiskScore !== null ? ` (${route.routeRiskScore})` : ''}</p>
          {route.routeDistanceKm && (
            <p><span className="text-primary-400">Distance:</span> {route.routeDistanceKm} km</p>
          )}
          {route.routeDurationMinutes && (
            <p><span className="text-primary-400">Duration:</span> {route.routeDurationMinutes} mins</p>
          )}
          <p><span className="text-primary-400">Route Source:</span> {route.routeProvider}</p>
        </div>
      </div>
    );
  }, [hoveredSegmentMode]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="section-title gradient-text">
          Interactive Supply Chain Map
        </h2>
        <p className="text-dark-300 text-lg max-w-3xl mx-auto">
          High-performance interactive map visualization with real-time supply chain data.
        </p>
      </div>

      {/* Map Statistics */}
      <div className="grid lg:grid-cols-5 gap-6 mb-6">
        <div className="card">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-400">{filteredRoutes.length}</div>
            <div className="text-dark-400">Visible Routes</div>
            <div className="text-xs text-dark-500">of {mapData.routes.length} total</div>
          </div>
        </div>
        <div className="card">
          <div className="text-center">
            <div className="text-2xl font-bold text-accent-400">{mapData.hubs.length}</div>
            <div className="text-dark-400">Resolved Hubs</div>
          </div>
        </div>
        <div className="card">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{mapData.incidents.length}</div>
            <div className="text-dark-400">Active Incidents</div>
          </div>
        </div>
        <div className="card">
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              alerts.some(a => a.priority === 'high') 
                ? 'text-red-400' 
                : alerts.some(a => a.priority === 'medium')
                ? 'text-yellow-400'
                : 'text-green-400'
            }`}>
              {alerts.some(a => a.priority === 'high') ? 'High' : alerts.some(a => a.priority === 'medium') ? 'Medium' : 'Low'}
            </div>
            <div className="text-dark-400">Risk Level</div>
          </div>
        </div>
        <div className="card">
          <div className="text-center">
            <button
              onClick={handleAnalyzeData}
              disabled={mapData.routes.length === 0 || analysisStatus === 'loading'}
              className={`w-full transition-all duration-200 ${
                analysisStatus === 'success' 
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : analysisStatus === 'loading'
                  ? 'bg-blue-600 cursor-not-allowed'
                  : !isOpenAIConfigured()
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'btn-primary'
              }`}
            >
              {renderAnalysisButtonContent()}
            </button>
            {analysisStatus === 'success' && (
              <p className="text-xs text-green-400 mt-2">
                AI analysis completed successfully! Check the Analysis tab for detailed results.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Route Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {[
            { key: 'sea', label: 'Maritime' },
            { key: 'air', label: 'Air' },
            { key: 'road', label: 'Land' },
            { key: 'rail', label: 'Rail' },
            { key: 'multimodal', label: 'Multimodal' },
          ].map((filter) => {
            const style = ROUTE_MODE_STYLES[filter.key] || ROUTE_MODE_STYLES.sea;
            const checked = modeFilters[filter.key];
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setModeFilters((current) => ({ ...current, [filter.key]: !current[filter.key] }))}
                className={`px-3 py-2 rounded-md border text-sm transition-colors ${
                  checked ? 'border-dark-500 bg-dark-800 text-white' : 'border-dark-700 text-dark-400'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: style.color }}
                  />
                  <span>{filter.label}</span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-dark-400 mt-3">
          Filters apply instantly and only render selected route modes for smoother zoom/pan on large files.
        </p>
      </div>

      {/* Real-time Alerts */}
      {alerts.length > 0 && (
        <div className="mb-4 space-y-3">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-l-4 ${
                alert.type === 'warning' 
                  ? 'bg-yellow-900/20 border-yellow-500 text-yellow-200'
                  : 'bg-blue-900/20 border-blue-500 text-blue-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">{alert.title}</h4>
                  <p className="text-sm opacity-90">{alert.message}</p>
                  <p className="text-xs opacity-70 mt-2">
                    {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className={`ml-4 px-2 py-1 rounded text-xs font-medium ${
                  alert.priority === 'high' 
                    ? 'bg-red-600 text-white'
                    : 'bg-blue-600 text-white'
                }`}>
                  {alert.priority}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Map Container */}
      <div className="card p-0 overflow-hidden">
        <div className="h-[600px] w-full relative">
          {/* Custom CSS to hide attribution */}
          <style>{`
            .leaflet-control-attribution {
              display: none !important;
            }
          `}</style>


          <MapContainer
            center={viewState.center}
            zoom={viewState.zoom}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
            preferCanvas={true}
            zoomControl={true}
            zoomAnimation={false}
            fadeAnimation={false}
            attributionControl={false}
            doubleClickZoom={true}
            scrollWheelZoom={true}
            dragging={true}
            ref={mapRef}
          >
            {/* English Language Map Tiles */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              maxZoom={19}
            />

            {/* Shipping Routes */}
            {filteredRoutes.flatMap((route) => {
              const isHoveredRoute = hoveredRouteId === route.id;
              return route.segments
                .filter((segment) => modeFilters[segment.mode])
                .flatMap((segment) => {
                  const modeStyle = getRouteModeStyle(segment.mode, isHoveredRoute, route.lowRisk);
                  const opacity = route.lowRisk && !isHoveredRoute ? LOW_RISK_STYLE.opacity : modeStyle.opacity;

                  return segment.pathGroups.map((pathPositions, pathIndex) => (
                    <Polyline
                      key={`${segment.id}-${pathIndex}`}
                      positions={pathPositions}
                      color={modeStyle.color}
                      weight={isHoveredRoute ? 5 : 3}
                      opacity={opacity}
                      smoothFactor={1}
                      noClip={true}
                      dashArray={route.lowRisk && !isHoveredRoute ? '10 10' : segment.mode === 'rail' ? '7 5' : null}
                      eventHandlers={{
                        click: () => setSelectedRouteId(route.id),
                        mouseover: () => {
                          setHoveredRouteId(route.id);
                          setHoveredSegmentMode(segment.mode);
                        },
                        mouseout: () => {
                          setHoveredRouteId(null);
                          setHoveredSegmentMode(null);
                        }
                      }}
                    />
                  ));
                });
            })}

            {/* Hub Locations */}
            {mapData.hubs.map((hub) => (
              <CircleMarker
                key={hub.id}
                center={hub.position}
                radius={6}
                fillColor="#9ca3af"
                color="#4b5563"
                weight={2}
                fillOpacity={0.8}
              >
                <Popup>
                  <div className="text-center">
                    <h3 className="font-semibold">{hub.name}</h3>
                    <p className="text-sm text-gray-600">{hub.type}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* Incident Markers */}
            {mapData.incidents.map((incident) => (
              <CircleMarker
                key={incident.id}
                center={incident.position}
                radius={Math.max(8, incident.intensity / 10)}
                fillColor={
                  incident.severity === 1 ? '#fbbf24' : 
                  incident.severity === 2 ? '#f59e0b' : '#ef4444'
                }
                color={
                  incident.severity === 1 ? '#f59e0b' : 
                  incident.severity === 2 ? '#ea580c' : '#dc2626'
                }
                weight={2}
                fillOpacity={0.8}
              >
                <Popup>
                  <div className="text-center">
                    <h3 className="font-semibold">{incident.type}</h3>
                    <p className="text-sm text-gray-600">Severity: {incident.severity}/3</p>
                    <p className="text-xs text-gray-500">{incident.description}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>

          {/* Tooltips */}
          {hoveredRoute && (
            <div className="absolute z-20 bg-dark-900 border border-dark-700 rounded-lg p-3 shadow-lg max-w-xs pointer-events-none">
              {renderRouteTooltip(hoveredRoute)}
            </div>
          )}
        </div>
      </div>

      {/* Map Legend */}
      <div className="mt-6 card">
        <h3 className="text-lg font-semibold text-white mb-4 inline-flex items-center gap-2">
          <MapIcon size={18} />
          <span>Map Legend</span>
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h4 className="font-medium text-primary-400">Route Modes</h4>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-3 rounded" style={{ backgroundColor: ROUTE_MODE_STYLES.sea.color }}></div>
              <span className="text-dark-300">Maritime</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-3 rounded" style={{ backgroundColor: ROUTE_MODE_STYLES.air.color }}></div>
              <span className="text-dark-300">Air</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-3 rounded" style={{ backgroundColor: ROUTE_MODE_STYLES.road.color }}></div>
              <span className="text-dark-300">Land</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-3 rounded" style={{ backgroundColor: ROUTE_MODE_STYLES.rail.color }}></div>
              <span className="text-dark-300">Rail</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-3 rounded" style={{ backgroundColor: LOW_RISK_STYLE.color, opacity: LOW_RISK_STYLE.opacity }}></div>
              <span className="text-dark-300">Low Risk (Greyed)</span>
            </div>
            <p className="text-xs text-dark-400">Hover a route to highlight its mode</p>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-accent-400">Transport Hubs</h4>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span className="text-dark-300">Airports, Ports, City Centers</span>
            </div>
            <p className="text-xs text-dark-400">Resolved from backend enrichment</p>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-yellow-400">Incident Severity</h4>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <span className="text-dark-300">Low Risk</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
              <span className="text-dark-300">Medium Risk</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 bg-red-500 rounded-full"></div>
              <span className="text-dark-300">High Risk</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Route Details */}
      {selectedRoute && (
        <div className="mt-6 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Route Details</h3>
            <button
              onClick={() => setSelectedRouteId(null)}
              className="text-dark-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary-400 mb-2">Route Information</h4>
              <div className="space-y-2 text-sm text-dark-300">
                <p><span className="text-white">Vessel:</span> {selectedRoute.vessel}</p>
                <p><span className="text-white">Origin:</span> {selectedRoute.origin}</p>
                <p><span className="text-white">Destination:</span> {selectedRoute.destination}</p>
                <p><span className="text-white">Transport Mode:</span> {selectedRoute.transportModeLabel}</p>
                <p><span className="text-white">Route Provider:</span> {selectedRoute.routeProvider}</p>
                <p><span className="text-white">Risk:</span> {String(selectedRoute.routeRiskLevel || 'N/A').toUpperCase()}</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-accent-400 mb-2">Cargo Details</h4>
              <div className="space-y-2 text-sm text-dark-300">
                <p><span className="text-white">Product:</span> {selectedRoute.cargo}</p>
                <p><span className="text-white">Volume:</span> {selectedRoute.volume}</p>
                <p><span className="text-white">Cost:</span> {selectedRoute.cost}</p>
                <p><span className="text-white">Lead Time:</span> {selectedRoute.leadTime}</p>
                {selectedRoute.routeDistanceKm && (
                  <p><span className="text-white">Distance:</span> {selectedRoute.routeDistanceKm} km</p>
                )}
                {selectedRoute.routeDurationMinutes && (
                  <p><span className="text-white">Duration:</span> {selectedRoute.routeDurationMinutes} mins</p>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="font-medium text-primary-400 mb-2">Segment Breakdown</h4>
            <div className="grid md:grid-cols-2 gap-2">
              {selectedRoute.segments.map((segment) => {
                const segmentStyle = ROUTE_MODE_STYLES[segment.mode] || ROUTE_MODE_STYLES.sea;
                return (
                  <div key={segment.id} className="p-2 rounded bg-dark-800 text-xs text-dark-200 border border-dark-700">
                    <div className="inline-flex items-center gap-2 mb-1">
                      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: segmentStyle.color }} />
                      <span className="font-medium uppercase tracking-wide">{segment.mode}</span>
                      <span className="text-dark-400">({segment.role})</span>
                    </div>
                    <div>Provider: {segment.provider}</div>
                    {segment.distanceKm !== null && <div>Distance: {segment.distanceKm.toFixed(2)} km</div>}
                    {segment.durationMinutes !== null && <div>Duration: {Math.round(segment.durationMinutes)} mins</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default LeafletMap;
