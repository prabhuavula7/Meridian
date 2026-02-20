// Map fallback utilities for when Mapbox is not available
// Provides alternative map sources and error handling

// Alternative map sources (free and open)
export const ALTERNATIVE_MAP_SOURCES = {
  // OpenStreetMap (free, no token required)
  OPENSTREETMAP: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  },
  
  // CartoDB (free, no token required)
  CARTODB: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© CartoDB',
    maxZoom: 20
  },
  
  // Stamen Terrain (free, no token required)
  STAMEN_TERRAIN: {
    url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.png',
    attribution: '© Stamen Design',
    maxZoom: 18
  }
};

// Check if Mapbox token is valid
export const isMapboxTokenValid = (token) => {
  // Basic validation - check if it's not the demo token
  const demoToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';
  return token && token !== demoToken && token.startsWith('pk.');
};

// Get fallback map style based on availability
export const getFallbackMapStyle = (mapboxToken) => {
  if (isMapboxTokenValid(mapboxToken)) {
    return 'mapbox://styles/mapbox/streets-v12';
  }
  
  // Return a basic style that will work with fallback sources
  return 'mapbox://styles/mapbox/light-v11';
};

// Generate fallback map tiles URL
export const getFallbackMapTiles = () => {
  return ALTERNATIVE_MAP_SOURCES.OPENSTREETMAP.url;
};

// Error message for invalid Mapbox token
export const getMapboxErrorMessage = () => {
  return {
    title: 'Map Display Issue',
    message: 'The map background is not displaying because the Mapbox access token is invalid or missing.',
    solution: 'To fix this, you need to get a free Mapbox access token.',
    steps: [
      '1. Go to https://account.mapbox.com/',
      '2. Sign up for a free account',
      '3. Create a new access token',
      '4. Replace the token in src/config/mapConfig.js',
      '5. Restart the application'
    ],
    alternative: 'Alternatively, the map will still show your data overlays (routes, ports, incidents) even without the background map.'
  };
};

// Check map loading status
export const checkMapStatus = async (mapboxToken) => {
  try {
    // Try to load a small map tile to test connectivity
    const testUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/0,0,1/256x256?access_token=${mapboxToken}`;
    const response = await fetch(testUrl);
    
    if (response.ok) {
      return { status: 'success', message: 'Mapbox connection successful' };
    } else {
      return { status: 'error', message: 'Mapbox token invalid or expired' };
    }
  } catch (error) {
    return { status: 'error', message: 'Network error or invalid token' };
  }
};
