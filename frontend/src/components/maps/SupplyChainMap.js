import React, { useMemo, useState } from 'react';
import Map, { Layer, Marker, NavigationControl, Popup, Source } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/cn';
import { MAP_CONFIG } from '../../config/mapConfig';

const STYLE_BY_THEME = {
  dark: MAP_CONFIG.MAP_STYLES.DARK,
  light: MAP_CONFIG.MAP_STYLES.LIGHT,
};

const modeColor = {
  sea: '#6f58d8',
  air: '#4f94ff',
  road: '#d6b35c',
  rail: '#f27b6f',
  multimodal: '#8a8f98',
};

const getRiskCircleColor = (severity) => {
  if (severity === 'high') return '#df5671';
  if (severity === 'medium') return '#d8a550';
  return '#42bf81';
};

const SupplyChainMap = ({ routes = [], hubs = [], incidents = [], theme = 'dark', className, focusIncidentId = null }) => {
  const mapboxToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || MAP_CONFIG.MAPBOX_ACCESS_TOKEN;
  const hasMapboxToken = Boolean(
    mapboxToken &&
    mapboxToken !== 'your_mapbox_access_token_here' &&
    mapboxToken.trim().length > 20
  );

  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState(focusIncidentId);
  const [mapError, setMapError] = useState(null);

  const activeRoute = routes.find((route) => route.id === selectedRouteId) || null;
  const activeIncident = incidents.find((incident) => incident.id === selectedIncidentId) || null;

  const lineGeoJson = useMemo(() => ({
    type: 'FeatureCollection',
    features: routes.map((route) => ({
      type: 'Feature',
      properties: {
        id: route.id,
        mode: route.mode,
        riskScore: route.riskScore,
      },
      geometry: {
        type: 'LineString',
        coordinates: [route.originCoords, route.destinationCoords],
      },
    })),
  }), [routes]);

  const incidentGeoJson = useMemo(() => ({
    type: 'FeatureCollection',
    features: incidents.map((incident) => ({
      type: 'Feature',
      properties: {
        id: incident.id,
        severity: incident.severity,
        region: incident.region,
      },
      geometry: {
        type: 'Point',
        coordinates: incident.coordinates,
      },
    })),
  }), [incidents]);

  const routeLayer = {
    id: 'route-lines',
    type: 'line',
    paint: {
      'line-color': [
        'match',
        ['get', 'mode'],
        'sea', modeColor.sea,
        'air', modeColor.air,
        'road', modeColor.road,
        'rail', modeColor.rail,
        modeColor.multimodal,
      ],
      'line-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        1, 1.5,
        3, 2.2,
        6, 3.4,
      ],
      'line-opacity': 0.72,
    },
  };

  const incidentHeatLayer = {
    id: 'incident-heat',
    type: 'heatmap',
    paint: {
      'heatmap-weight': [
        'match',
        ['get', 'severity'],
        'high', 1,
        'medium', 0.65,
        0.42,
      ],
      'heatmap-intensity': 0.9,
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(91,42,174,0)',
        0.32, 'rgba(91,42,174,0.38)',
        0.62, 'rgba(201,164,76,0.5)',
        1, 'rgba(223,86,113,0.75)',
      ],
      'heatmap-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        1, 24,
        6, 42,
      ],
    },
  };

  const incidentCircleLayer = {
    id: 'incident-circles',
    type: 'circle',
    paint: {
      'circle-radius': [
        'match',
        ['get', 'severity'],
        'high', 9,
        'medium', 7,
        5,
      ],
      'circle-color': [
        'match',
        ['get', 'severity'],
        'high', '#df5671',
        'medium', '#d8a550',
        '#42bf81',
      ],
      'circle-opacity': 0.9,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1.2,
    },
  };

  const handleMapClick = (event) => {
    const features = event.features || [];
    const incidentFeature = features.find((feature) => feature.layer.id === 'incident-circles');
    const routeFeature = features.find((feature) => feature.layer.id === 'route-lines');

    if (incidentFeature) {
      setSelectedIncidentId(incidentFeature.properties.id);
      setSelectedRouteId(null);
      return;
    }

    if (routeFeature) {
      setSelectedRouteId(routeFeature.properties.id);
      setSelectedIncidentId(null);
      return;
    }

    setSelectedIncidentId(null);
    setSelectedRouteId(null);
  };

  if (!hasMapboxToken) {
    return (
      <div className={cn('relative h-[440px] overflow-hidden rounded-lg border border-border bg-background-elevated p-6', className)}>
        <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center rounded-lg border border-danger/30 bg-danger/10 px-6 text-center">
          <AlertTriangle size={22} className="text-danger" />
          <h3 className="mt-3 font-display text-lg font-semibold">Mapbox token is missing</h3>
          <p className="mt-2 text-sm text-foreground-muted">
            Set <code>REACT_APP_MAPBOX_ACCESS_TOKEN</code> in <code>frontend/.env</code> (or update <code>MAP_CONFIG.MAPBOX_ACCESS_TOKEN</code>) and restart the frontend server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative h-[440px] overflow-hidden rounded-lg border border-border bg-background-elevated', className)}>
      {mapError ? (
        <div className="absolute inset-x-3 top-3 z-20 rounded-md border border-danger/35 bg-danger/15 px-3 py-2 text-xs text-foreground">
          <p className="inline-flex items-center gap-1 font-medium"><AlertTriangle size={13} className="text-danger" />Map render warning</p>
          <p className="mt-1 text-foreground-muted">{mapError}</p>
        </div>
      ) : null}
      <Map
        initialViewState={{ longitude: 12, latitude: 20, zoom: 1.7 }}
        mapStyle={STYLE_BY_THEME[theme] || STYLE_BY_THEME.dark}
        mapboxAccessToken={mapboxToken}
        interactiveLayerIds={['route-lines', 'incident-circles']}
        onError={(event) => setMapError(event?.error?.message || 'Unable to load map style or tiles.')}
        onClick={handleMapClick}
        reuseMaps
        attributionControl={false}
      >
        <NavigationControl position="top-right" visualizePitch={false} />

        <Source id="routes" type="geojson" data={lineGeoJson}>
          <Layer {...routeLayer} />
        </Source>

        <Source id="incidents" type="geojson" data={incidentGeoJson}>
          <Layer {...incidentHeatLayer} />
          <Layer {...incidentCircleLayer} />
        </Source>

        {hubs.map((hub) => (
          <Marker key={hub.id} longitude={hub.coordinates[0]} latitude={hub.coordinates[1]}>
            <button
              type="button"
              className="h-2.5 w-2.5 rounded-full border border-white/80 bg-accent shadow-[0_0_0_3px_rgba(91,42,174,0.22)]"
              title={hub.name}
            />
          </Marker>
        ))}

        {activeRoute ? (
          <Popup
            longitude={(activeRoute.originCoords[0] + activeRoute.destinationCoords[0]) / 2}
            latitude={(activeRoute.originCoords[1] + activeRoute.destinationCoords[1]) / 2}
            closeButton={false}
            closeOnClick={false}
            className="z-20"
          >
            <div className="space-y-1 text-xs">
              <p className="font-semibold">{activeRoute.origin} -> {activeRoute.destination}</p>
              <p>Mode: {activeRoute.mode.toUpperCase()}</p>
              <p>Risk: {Math.round(activeRoute.riskScore * 100)}%</p>
            </div>
          </Popup>
        ) : null}

        {activeIncident ? (
          <Popup
            longitude={activeIncident.coordinates[0]}
            latitude={activeIncident.coordinates[1]}
            closeButton={false}
            closeOnClick={false}
            className="z-20"
          >
            <div className="space-y-1 text-xs">
              <p className="font-semibold">{activeIncident.title}</p>
              <p>{activeIncident.message}</p>
              <Badge
                variant={activeIncident.severity === 'high' ? 'danger' : activeIncident.severity === 'medium' ? 'warning' : 'success'}
                className="mt-1"
              >
                {activeIncident.severity.toUpperCase()}
              </Badge>
            </div>
          </Popup>
        ) : null}
      </Map>

      <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md border border-border bg-surface/88 px-3 py-2 text-xs shadow-soft backdrop-blur-xl">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: modeColor.sea }} />Sea</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: modeColor.air }} />Air</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: modeColor.road }} />Road</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: getRiskCircleColor('high') }} />Risk</span>
      </div>
    </div>
  );
};

export default SupplyChainMap;
