import React, { useState, useEffect, useCallback } from 'react';
import { Bot } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet';
import L from 'leaflet';

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapSection = ({ data, onAnalysisComplete }) => {
  const [mapData, setMapData] = useState({
    routes: [],
    ports: [],
    disasters: []
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);


  // Sample port coordinates for demonstration
  const portCoordinates = {
    'Shanghai': [31.2304, 121.4737],
    'Los Angeles': [34.0522, -118.2437],
    'Rotterdam': [51.9225, 4.4792],
    'Singapore': [1.3521, 103.8198],
    'Dubai': [25.2048, 55.2708],
    'Hamburg': [53.5511, 9.9937],
    'New York': [40.7128, -74.0060],
    'Tokyo': [35.6762, 139.6503],
    'Mumbai': [19.0760, 72.8777],
    'Sydney': [-33.8688, 151.2093]
  };

  const processDataForMap = useCallback((rawData) => {
    const routes = [];
    const ports = new Set();
    const disasters = [];

    // Process shipping routes
    rawData.forEach((row, index) => {
      if (row.origin_port && row.destination_port) {
        const origin = portCoordinates[row.origin_port] || [0, 0];
        const destination = portCoordinates[row.destination_port] || [0, 0];
        
        routes.push({
          id: index,
          origin: row.origin_port,
          destination: row.destination_port,
          originCoords: origin,
          destCoords: destination,
          vessel: row.vessel_name || 'Unknown Vessel',
          cargo: row.cargo_type || 'General Cargo',
          volume: row.volume || 'N/A'
        });

        ports.add(row.origin_port);
        ports.add(row.destination_port);
      }
    });

    // Generate simulated disaster markers
    const disasterTypes = ['Storm', 'Port Congestion', 'Equipment Failure', 'Labor Strike'];
    const disasterLocations = [
      [35.6762, 139.6503], // Tokyo
      [40.7128, -74.0060], // New York
      [51.9225, 4.4792],   // Rotterdam
      [25.2048, 55.2708],  // Dubai
      [19.0760, 72.8777]   // Mumbai
    ];

    disasterLocations.forEach((coords, index) => {
      disasters.push({
        id: index,
        type: disasterTypes[index % disasterTypes.length],
        coordinates: coords,
        severity: Math.floor(Math.random() * 3) + 1, // 1-3
        description: `Simulated ${disasterTypes[index % disasterTypes.length]} event`
      });
    });

    setMapData({ routes, ports: Array.from(ports), disasters });
  }, []);

  useEffect(() => {
    if (data && data.length > 0) {
      processDataForMap(data);
    }
  }, [data, processDataForMap]);

  const handleAnalyzeData = async () => {
    setIsAnalyzing(true);
    
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const analysisResults = {
      totalRoutes: mapData.routes.length,
      totalPorts: mapData.ports.length,
      riskAreas: mapData.disasters.length,
      insights: [
        'High congestion detected in Rotterdam port area',
        'Potential storm impact on Pacific routes',
        'Equipment failure affecting 3 major shipping lanes',
        'Recommendation: Reroute vessels through Suez Canal'
      ],
      recommendations: [
        'Implement real-time weather monitoring',
        'Establish backup port agreements',
        'Diversify shipping routes for critical cargo',
        'Increase buffer time for affected routes'
      ]
    };

    onAnalysisComplete(analysisResults);
    setIsAnalyzing(false);
  };

  const getDisasterColor = (severity) => {
    switch (severity) {
      case 1: return '#fbbf24'; // Yellow
      case 2: return '#f59e0b'; // Orange
      case 3: return '#ef4444'; // Red
      default: return '#6b7280';
    }
  };

  const getDisasterSize = (severity) => {
    return severity * 8;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="section-title gradient-text">
          Interactive Supply Chain Map
        </h2>
        <p className="text-dark-300 text-lg max-w-3xl mx-auto">
          Visualize your shipping routes, identify potential disruptions, and analyze 
          supply chain vulnerabilities in real-time.
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6 mb-6">
        <div className="card">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-400">{mapData.routes.length}</div>
            <div className="text-dark-400">Active Routes</div>
          </div>
        </div>
        <div className="card">
          <div className="text-center">
            <div className="text-2xl font-bold text-accent-400">{mapData.ports.length}</div>
            <div className="text-dark-400">Ports</div>
          </div>
        </div>
        <div className="card">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{mapData.disasters.length}</div>
            <div className="text-dark-400">Risk Areas</div>
          </div>
        </div>
        <div className="card">
          <div className="text-center">
            <button
              onClick={handleAnalyzeData}
              disabled={isAnalyzing || mapData.routes.length === 0}
              className="btn-primary w-full"
            >
              {isAnalyzing ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Analyzing...</span>
                </div>
              ) : (
                <span className="inline-flex items-center justify-center gap-2">
                  <Bot size={16} />
                  <span>Run AI Analysis</span>
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="card p-0 overflow-hidden">
        <div className="h-[600px] w-full">
          <MapContainer
            center={[20, 0]}
            zoom={2}
            className="h-full w-full"
            style={{ background: '#0f1720' }}
          >
            {/* Dark theme tile layer */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />

            {/* Port Markers */}
            {mapData.routes.map((route) => (
              <React.Fragment key={`route-${route.id}`}>
                {/* Origin Port */}
                <Marker position={route.originCoords}>
                  <Popup>
                    <div className="text-center">
                      <h3 className="font-semibold text-dark-900">{route.origin}</h3>
                      <p className="text-sm text-dark-600">Origin Port</p>
                    </div>
                  </Popup>
                </Marker>

                {/* Destination Port */}
                <Marker position={route.destCoords}>
                  <Popup>
                    <div className="text-center">
                      <h3 className="font-semibold text-dark-900">{route.destination}</h3>
                      <p className="text-sm text-dark-600">Destination Port</p>
                    </div>
                  </Popup>
                </Marker>

                {/* Shipping Route Line */}
                <Polyline
                  positions={[route.originCoords, route.destCoords]}
                  color="#3b82f6"
                  weight={2}
                  opacity={0.7}
                >
                  <Popup>
                    <div className="text-center">
                      <h3 className="font-semibold text-dark-900">{route.vessel}</h3>
                      <p className="text-sm text-dark-600">
                        {route.origin} → {route.destination}
                      </p>
                      <p className="text-xs text-dark-500">
                        Cargo: {route.cargo} | Volume: {route.volume}
                      </p>
                    </div>
                  </Popup>
                </Polyline>
              </React.Fragment>
            ))}

            {/* Disaster Markers */}
            {mapData.disasters.map((disaster) => (
              <CircleMarker
                key={`disaster-${disaster.id}`}
                center={disaster.coordinates}
                radius={getDisasterSize(disaster.severity)}
                fillColor={getDisasterColor(disaster.severity)}
                color={getDisasterColor(disaster.severity)}
                weight={2}
                opacity={0.8}
                fillOpacity={0.6}
              >
                <Popup>
                  <div className="text-center">
                    <h3 className="font-semibold text-dark-900">{disaster.type}</h3>
                    <p className="text-sm text-dark-600">{disaster.description}</p>
                    <div className="mt-2">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        disaster.severity === 1 ? 'bg-yellow-100 text-yellow-800' :
                        disaster.severity === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        Severity: {disaster.severity}
                      </span>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Map Legend */}
      <div className="mt-6 card">
        <h3 className="text-lg font-semibold text-white mb-4">Map Legend</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <span className="text-dark-300">Shipping Routes</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
            <span className="text-dark-300">Ports</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
              <div className="w-5 h-5 bg-red-500 rounded-full"></div>
            </div>
            <span className="text-dark-300">Risk Levels (Low → High)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapSection;
