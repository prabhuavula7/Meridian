// Map configuration file
// Replace the MAPBOX_ACCESS_TOKEN with your own token from https://account.mapbox.com/

export const MAP_CONFIG = {
  // Get your free Mapbox access token from: https://account.mapbox.com/
  MAPBOX_ACCESS_TOKEN: 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw',
  
  // Default map view state
  DEFAULT_VIEW_STATE: {
    longitude: 0,
    latitude: 20,
    zoom: 2,
    pitch: 0,
    bearing: 0
  },
  
  // Map style options
  MAP_STYLES: {
    DARK: 'mapbox://styles/mapbox/dark-v11',
    LIGHT: 'mapbox://styles/mapbox/light-v11',
    SATELLITE: 'mapbox://styles/mapbox/satellite-v9',
    STREETS: 'mapbox://styles/mapbox/streets-v12'
  },
  
  // Layer configuration
  LAYERS: {
    ROUTES: {
      DEFAULT_COLOR: [59, 130, 246, 180], // Blue with transparency
      HOVER_COLOR: [147, 197, 253, 255],  // Light blue
      DEFAULT_WIDTH: 3,
      HOVER_WIDTH: 5
    },
    INCIDENTS: {
      LOW_RISK: [251, 191, 36, 200],      // Yellow
      MEDIUM_RISK: [245, 158, 11, 200],   // Orange
      HIGH_RISK: [239, 68, 68, 200],      // Red
      HEATMAP_RADIUS: 60,
      HEATMAP_INTENSITY: 1,
      HEATMAP_THRESHOLD: 0.05
    },
    WAREHOUSES: {
      DEFAULT_COLOR: [156, 163, 175, 200], // Gray
      BORDER_COLOR: [75, 85, 99, 255],     // Darker gray
      RADIUS: 6,
      BORDER_WIDTH: 2
    }
  },
  
  // Port coordinates for mapping
  PORT_COORDINATES: {
    'Shanghai': [121.4737, 31.2304],
    'Los Angeles': [-118.2437, 34.0522],
    'Rotterdam': [4.4792, 51.9225],
    'Singapore': [103.8198, 1.3521],
    'Dubai': [55.2708, 25.2048],
    'Hamburg': [9.9937, 53.5511],
    'New York': [-74.0060, 40.7128],
    'Tokyo': [139.6503, 35.6762],
    'Mumbai': [72.8777, 19.0760],
    'Sydney': [151.2093, -33.8688],
    'Hong Kong': [114.1694, 22.3193],
    'Antwerp': [4.4024, 51.2194],
    'Busan': [129.0750, 35.1796],
    'Felixstowe': [1.3134, 51.9617],
    'Long Beach': [-118.1896, 33.7701],
    'Savannah': [-81.0998, 32.0809],
    'Vancouver': [-123.1207, 49.2827],
    'Bremen': [8.8017, 53.0793],
    'Le Havre': [0.1079, 49.4944]
  },
  
  // Incident types and configurations
  INCIDENT_TYPES: [
    'Storm',
    'Port Congestion', 
    'Equipment Failure',
    'Labor Strike',
    'Weather Delay',
    'Technical Issue',
    'Security Alert',
    'Customs Delay',
    'Vessel Breakdown',
    'Route Closure'
  ],
  
  // Performance settings
  PERFORMANCE: {
    MAX_ROUTES: 1000,
    MAX_INCIDENTS: 500,
    RENDER_THROTTLE: 16, // 60 FPS
    PICKING_THROTTLE: 100 // 10 FPS for picking
  }
};

// Helper function to get port coordinates by name
export const getPortCoordinates = (portName) => {
  if (!portName) return null;
  
  const normalizedName = portName.toLowerCase().trim();
  
  for (const [name, coords] of Object.entries(MAP_CONFIG.PORT_COORDINATES)) {
    if (normalizedName.includes(name.toLowerCase()) || 
        name.toLowerCase().includes(normalizedName)) {
      return coords;
    }
  }
  
  return null;
};

// Helper function to validate coordinates
export const isValidCoordinates = (coords) => {
  if (!Array.isArray(coords) || coords.length !== 2) return false;
  
  const [lng, lat] = coords;
  return (
    typeof lng === 'number' && 
    typeof lat === 'number' &&
    lng >= -180 && lng <= 180 &&
    lat >= -90 && lat <= 90
  );
};

// Helper function to calculate distance between two points
export const calculateDistance = (point1, point2) => {
  if (!isValidCoordinates(point1) || !isValidCoordinates(point2)) return 0;
  
  const [lng1, lat1] = point1;
  const [lng2, lat2] = point2;
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
};
