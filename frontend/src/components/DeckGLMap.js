import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { AlertTriangle, Bot, CheckCircle2, Map as MapIcon, RotateCcw, Settings2, X } from 'lucide-react';
import DeckGL from '@deck.gl/react';
import { LineLayer, ScatterplotLayer, GridCellLayer } from '@deck.gl/layers';
import { Map } from 'react-map-gl/mapbox';
import { MAP_CONFIG } from '../config/mapConfig';
import { generateAIAnalysis, generateRealTimeAlerts } from '../utils/simulatedAI';
import { isMapboxTokenValid, getMapboxErrorMessage } from '../utils/mapFallback';

const DeckGLMap = ({ data, onAnalysisComplete }) => {
  const [viewState, setViewState] = useState({
    longitude: 0,
    latitude: 20,
    zoom: 2,
    pitch: 0,
    bearing: 0
  });
  const [hoveredRoute, setHoveredRoute] = useState(null);
  const [hoveredIncident, setHoveredIncident] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [mapData, setMapData] = useState({
    routes: [],
    incidents: [],
    warehouses: []
  });
  const [alerts, setAlerts] = useState([]);
  const [analysisStatus, setAnalysisStatus] = useState('idle'); // 'idle', 'loading', 'success'
  const [mapError, setMapError] = useState(null);

  // Check map status on component mount
  useEffect(() => {
    const checkMapStatus = () => {
      console.log('Checking Mapbox token:', MAP_CONFIG.MAPBOX_ACCESS_TOKEN);
      if (!isMapboxTokenValid(MAP_CONFIG.MAPBOX_ACCESS_TOKEN)) {
        console.log('Mapbox token invalid, showing error message');
        setMapError(getMapboxErrorMessage());
      } else {
        console.log('Mapbox token appears valid');
      }
    };
    
    checkMapStatus();
  }, []);

  // Process data for map visualization
  useMemo(() => {
    if (!data || data.length === 0) return;

    const routes = [];
    const warehouses = new Set();
    const incidents = [];

    // Sample port coordinates for demonstration
    const portCoordinates = {
      'Shanghai': [121.4737, 31.2304],
      'Los Angeles': [-118.2437, 34.0522],
      'Rotterdam': [4.4792, 51.9225],
      'Singapore': [103.8198, 1.3521],
      'Dubai': [55.2708, 25.2048],
      'Hamburg': [9.9937, 53.5511],
      'New York': [-74.0060, 40.7128],
      'Tokyo': [139.6503, 35.6762],
      'Mumbai': [72.8777, 19.0760],
      'Sydney': [151.2093, -33.8688]
    };

    // Process shipping routes
    data.forEach((row, index) => {
      // Try different field names for locations
      const origin = row.origin_location || row.origin || row.from_location || row.source || row.Origin_Point;
      const destination = row.destination_location || row.destination || row.to_location || row.end_location || row.Destination_Point;
      
      if (origin && destination) {
        // Find coordinates for origin and destination
        let originCoords = null;
        let destCoords = null;

        // Try to find coordinates by name
        for (const [portName, coords] of Object.entries(portCoordinates)) {
          // Clean up the location names for better matching
          const cleanOrigin = origin.toLowerCase().replace(/\s+(port|dc|hub|warehouse|facility|distribution|center)$/i, '');
          const cleanDest = destination.toLowerCase().replace(/\s+(port|dc|hub|warehouse|facility|distribution|center)$/i, '');
          const cleanPortName = portName.toLowerCase();
          
          if (cleanOrigin.includes(cleanPortName) || cleanPortName.includes(cleanOrigin)) {
            originCoords = coords;
          }
          if (cleanDest.includes(cleanPortName) || cleanPortName.includes(cleanDest)) {
            destCoords = coords;
          }
        }

        // If coordinates found, create route
        if (originCoords && destCoords) {
          routes.push({
            id: index,
            sourcePosition: originCoords,
            targetPosition: destCoords,
            origin: origin,
            destination: destination,
            vessel: row.vessel_name || row.vessel || 'Unknown Vessel',
            cargo: row.product_name || row.cargo_type || 'General Cargo',
            volume: row.quantity || row.volume || 'N/A',
            cost: row.product_cost || row.cost || 'N/A',
            leadTime: row.lead_time || row.lead_time_days || 'N/A',
            transportMode: row.mode_of_transport || row.transport_mode || 'Sea Freight'
          });

          warehouses.add(origin);
          warehouses.add(destination);
        }
      }
    });

    // Generate simulated incidents/heat markers
    const incidentTypes = ['Storm', 'Port Congestion', 'Equipment Failure', 'Labor Strike', 'Weather Delay'];
    const incidentLocations = [
      [139.6503, 35.6762], // Tokyo
      [-74.0060, 40.7128], // New York
      [4.4792, 51.9225],   // Rotterdam
      [55.2708, 25.2048],  // Dubai
      [72.8777, 19.0760],  // Mumbai
      [121.4737, 31.2304], // Shanghai
      [-118.2437, 34.0522], // Los Angeles
      [103.8198, 1.3521],  // Singapore
      [9.9937, 53.5511],   // Hamburg
      [151.2093, -33.8688] // Sydney
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
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() // Random time in last 7 days
      });
    });

    setMapData({ routes, incidents, warehouses: Array.from(warehouses) });
    
    // Generate real-time alerts when data changes
    const newAlerts = generateRealTimeAlerts({ routes, incidents, warehouses: Array.from(warehouses) });
    setAlerts(newAlerts);
  }, [data]);

  // Handle view state changes
  const onViewStateChange = useCallback(({ viewState }) => {
    setViewState(viewState);
  }, []);

  // Handle route hover
  const onRouteHover = useCallback((info) => {
    setHoveredRoute(info.object);
  }, []);

  // Handle incident hover
  const onIncidentHover = useCallback((info) => {
    setHoveredIncident(info.object);
  }, []);

  // Handle route click
  const onRouteClick = useCallback((info) => {
    setSelectedRoute(info.object);
  }, []);

  // Handle incident click
  const onIncidentClick = useCallback((info) => {
    console.log('Incident clicked:', info.object);
  }, []);

  // Route layer for shipping routes
  const routeLayer = useMemo(() => new LineLayer({
    id: 'route-layer',
    data: mapData.routes,
    getPath: d => [d.sourcePosition, d.targetPosition],
    getColor: [59, 130, 246, 180], // Blue with transparency
    getWidth: 3,
    pickable: true,
    onHover: onRouteHover,
    onClick: onRouteClick,
    highlightColor: [147, 197, 253, 255], // Light blue for hover
    highlightWidth: 5,
    // Enable 3D globe projection
    wrapLongitude: true,
    parameters: {
      blend: true,
      blendFunc: [770, 771],
      blendEquation: 32774
    }
  }), [mapData.routes, onRouteHover, onRouteClick]);

  // Incident heatmap layer using GridCellLayer
  const incidentHeatmapLayer = useMemo(() => new GridCellLayer({
    id: 'incident-heatmap-layer',
    data: mapData.incidents,
    getPosition: d => d.position,
    getWeight: d => d.intensity,
    cellSize: 100000, // 100km grid cells
    elevationScale: 1000,
    elevationRange: [0, 1000],
    colorRange: [
      [255, 255, 178, 100], // Light yellow
      [254, 204, 92, 150],  // Yellow
      [253, 141, 60, 200],  // Orange
      [240, 59, 32, 250],   // Red
      [189, 0, 38, 255]     // Dark red
    ],
    pickable: true,
    onHover: onIncidentHover,
    onClick: onIncidentClick,
    parameters: {
      blend: true
    }
  }), [mapData.incidents, onIncidentHover, onIncidentClick]);

  // Incident markers layer
  const incidentMarkersLayer = useMemo(() => new ScatterplotLayer({
    id: 'incident-markers-layer',
    data: mapData.incidents,
    getPosition: d => d.position,
    getRadius: d => Math.max(12, d.intensity / 8),
    getFillColor: d => {
      const severity = d.severity;
      if (severity === 1) return [251, 191, 36, 200]; // Yellow
      if (severity === 2) return [245, 158, 11, 200]; // Orange
      return [239, 68, 68, 200]; // Red
    },
    getLineColor: d => {
      const severity = d.severity;
      if (severity === 2) return [245, 158, 11, 255]; // Orange
      return [239, 68, 68, 255]; // Red
    },
    getLineWidth: 2,
    pickable: true,
    onHover: onIncidentHover,
    onClick: onIncidentClick,
    parameters: {
      blend: true,
      blendFunc: [770, 771],
      blendEquation: 32774
    }
  }), [mapData.incidents, onIncidentHover, onIncidentClick]);

  // Warehouse markers layer
  const warehouseLayer = useMemo(() => new ScatterplotLayer({
    id: 'warehouse-layer',
    data: mapData.routes.flatMap(route => [
      { position: route.sourcePosition, name: route.origin, type: 'origin' },
      { position: route.targetPosition, name: route.destination, type: 'destination' }
    ]),
    getPosition: d => d.position,
    getRadius: 8,
    getFillColor: [156, 163, 175, 200], // Gray
    getLineColor: [75, 85, 99, 255], // Darker gray
    getLineWidth: 2,
    pickable: true,
    parameters: {
      blend: true,
      blendFunc: [770, 771],
      blendEquation: 32774
    }
  }), [mapData.routes]);

  // Handle analysis completion with simulated AI
  const handleAnalyzeData = async () => {
    setAnalysisStatus('loading');
    
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate comprehensive AI analysis
    const aiAnalysis = generateAIAnalysis(mapData);
    
    // Generate real-time alerts
    const alerts = generateRealTimeAlerts(mapData);
    
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
    
    // Auto-reset success status after 3 seconds
    setTimeout(() => setAnalysisStatus('idle'), 3000);

    onAnalysisComplete(analysisResults);
  };

  // Tooltip content for routes
  const renderRouteTooltip = () => {
    if (!hoveredRoute) return null;

    return (
      <div className="absolute z-10 bg-dark-900 border border-dark-700 rounded-lg p-3 shadow-lg max-w-xs">
        <h3 className="font-semibold text-white mb-2">{hoveredRoute.vessel}</h3>
        <div className="space-y-1 text-sm text-dark-300">
          <p><span className="text-primary-400">Route:</span> {hoveredRoute.origin} → {hoveredRoute.destination}</p>
          <p><span className="text-primary-400">Cargo:</span> {hoveredRoute.cargo}</p>
          <p><span className="text-primary-400">Volume:</span> {hoveredRoute.volume}</p>
          <p><span className="text-primary-400">Cost:</span> {hoveredRoute.cost}</p>
          <p><span className="text-primary-400">Lead Time:</span> {hoveredRoute.leadTime}</p>
          <p><span className="text-primary-400">Mode:</span> {hoveredRoute.transportMode}</p>
        </div>
      </div>
    );
  };

  // Tooltip content for incidents
  const renderIncidentTooltip = () => {
    if (!hoveredIncident) return null;

    return (
      <div className="absolute z-10 bg-dark-900 border border-dark-700 rounded-lg p-3 shadow-lg max-w-xs">
        <h3 className="font-semibold text-white mb-2">{hoveredIncident.type}</h3>
        <div className="space-y-1 text-sm text-dark-300">
          <p><span className="text-accent-400">Description:</span> {hoveredIncident.description}</p>
          <p><span className="text-accent-400">Severity:</span> {hoveredIncident.severity}/3</p>
          <p><span className="text-accent-400">Intensity:</span> {hoveredIncident.intensity}</p>
          <p><span className="text-accent-400">Time:</span> {new Date(hoveredIncident.timestamp).toLocaleString()}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="section-title gradient-text">
          Interactive Supply Chain Map
        </h2>
        <p className="text-dark-300 text-lg max-w-3xl mx-auto">
          High-performance visualization of shipping routes and incident monitoring using advanced mapping technology.
        </p>
      </div>

      {/* Map Statistics */}
      <div className="grid lg:grid-cols-5 gap-6 mb-6">
        <div className="card">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-400">{mapData.routes.length}</div>
            <div className="text-dark-400">Active Routes</div>
          </div>
        </div>
        <div className="card">
          <div className="text-center">
            <div className="text-2xl font-bold text-accent-400">{mapData.warehouses.length}</div>
            <div className="text-dark-400">Ports/Facilities</div>
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
                  : 'btn-primary'
              }`}
            >
              {analysisStatus === 'loading' && (
                <span className="inline-flex items-center gap-2"><Bot size={16} />Analyzing...</span>
              )}
              {analysisStatus === 'success' && (
                <span className="inline-flex items-center gap-2"><CheckCircle2 size={16} />Analysis Complete</span>
              )}
              {analysisStatus === 'idle' && (
                <span className="inline-flex items-center gap-2"><Bot size={16} />Run AI Analysis</span>
              )}
            </button>
            {analysisStatus === 'success' && (
              <p className="text-xs text-green-400 mt-2">
                AI analysis completed successfully! Check the Analysis tab for detailed results.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Map Error Display */}
      {mapError && (
        <div className="mb-4 p-4 bg-red-900/20 border border-red-700 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <AlertTriangle size={24} className="text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-400 mb-2">{mapError.title}</h3>
              <p className="text-red-200 mb-3">{mapError.message}</p>
              
              <div className="bg-dark-800 p-3 rounded mb-3">
                <h4 className="font-medium text-white mb-2">{mapError.solution}</h4>
                <ol className="text-sm text-red-200 space-y-1">
                  {mapError.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
              
              <p className="text-sm text-red-200">{mapError.alternative}</p>
            </div>
          </div>
        </div>
      )}

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
        <div className="h-[600px] w-full relative bg-dark-900">
          {/* Map Instructions */}
          <div className="absolute top-4 left-4 z-10 bg-dark-800/80 backdrop-blur-sm text-white p-3 rounded-lg max-w-xs">
            <p className="text-sm font-medium mb-2 inline-flex items-center gap-2">
              <MapIcon size={16} />
              <span>Map Controls</span>
            </p>
            <p className="text-xs text-dark-300">
              • <strong>Drag</strong> to pan the map<br/>
              • <strong>Scroll</strong> to zoom in/out<br/>
              • <strong>Right-click + drag</strong> to rotate<br/>
              • Use buttons on the right for quick actions
            </p>
            {mapError && (
              <div className="mt-2 p-2 bg-red-900/40 rounded border border-red-600">
                <p className="text-xs text-red-200">
                  <span className="inline-flex items-center gap-2">
                    <AlertTriangle size={14} />
                    <span>Map background not loading - see error message above</span>
                  </span>
                </p>
              </div>
            )}
          </div>
          
          {/* Map Controls */}
          <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
            <button
              onClick={() => setViewState({
                longitude: 0,
                latitude: 20,
                zoom: 2,
                pitch: 0,
                bearing: 0
              })}
              className="bg-dark-800 hover:bg-dark-700 text-white p-2 rounded-lg transition-colors"
              title="Reset View"
            >
              <RotateCcw size={18} />
            </button>
            <button
              onClick={() => setViewState(prev => ({
                ...prev,
                pitch: prev.pitch === 0 ? 30 : 0
              }))}
              className="bg-dark-800 hover:bg-dark-700 text-white p-2 rounded-lg transition-colors"
              title="Toggle Tilt"
            >
              <Settings2 size={18} />
            </button>
          </div>
          <DeckGL
            initialViewState={viewState}
            controller={true}
            layers={[routeLayer, incidentHeatmapLayer, incidentMarkersLayer, warehouseLayer]}
            onViewStateChange={onViewStateChange}
            style={{ position: 'relative' }}
          >
            <Map
              mapStyle="mapbox://styles/mapbox/streets-v12"
              mapboxAccessToken={MAP_CONFIG.MAPBOX_ACCESS_TOKEN}
              reuseMaps
            />
          </DeckGL>

          {/* Tooltips */}
          {renderRouteTooltip()}
          {renderIncidentTooltip()}
        </div>
      </div>

      {/* Map Legend */}
      <div className="mt-6 card">
        <h3 className="text-lg font-semibold text-white mb-4 inline-flex items-center gap-2">
          <MapIcon size={18} />
          <span>Interactive Map Legend</span>
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h4 className="font-medium text-primary-400">Shipping Routes</h4>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-3 bg-blue-500 rounded"></div>
              <span className="text-dark-300">Active Routes</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-3 bg-blue-300 rounded"></div>
              <span className="text-dark-300">Hovered Route</span>
            </div>
            <p className="text-xs text-dark-400">Global shipping network</p>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-accent-400">Ports & Facilities</h4>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span className="text-dark-300">Port Locations</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
              <span className="text-dark-300">Warehouse Sites</span>
            </div>
            <p className="text-xs text-dark-400">Global port network</p>
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
              onClick={() => setSelectedRoute(null)}
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
                <p><span className="text-white">Transport Mode:</span> {selectedRoute.transportMode}</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-accent-400 mb-2">Cargo Details</h4>
              <div className="space-y-2 text-sm text-dark-300">
                <p><span className="text-white">Product:</span> {selectedRoute.cargo}</p>
                <p><span className="text-white">Volume:</span> {selectedRoute.volume}</p>
                <p><span className="text-white">Cost:</span> {selectedRoute.cost}</p>
                <p><span className="text-white">Lead Time:</span> {selectedRoute.leadTime}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeckGLMap;
