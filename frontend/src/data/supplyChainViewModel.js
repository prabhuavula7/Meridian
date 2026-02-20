const CITY_COORDINATE_FALLBACKS = {
  shanghai: [121.4737, 31.2304],
  'los angeles': [-118.2437, 34.0522],
  rotterdam: [4.4792, 51.9225],
  singapore: [103.8198, 1.3521],
  dubai: [55.2708, 25.2048],
  hamburg: [9.9937, 53.5511],
  'new york': [-74.006, 40.7128],
  tokyo: [139.6503, 35.6762],
  mumbai: [72.8777, 19.076],
  sydney: [151.2093, -33.8688],
  panama: [-79.5167, 8.9833],
  suez: [32.5498, 30.0055],
  antwerp: [4.4025, 51.2194],
  busan: [129.0756, 35.1796],
  chennai: [80.2707, 13.0827],
  houston: [-95.3698, 29.7604],
};

const INCIDENT_TEMPLATES = [
  { title: 'Typhoon corridor warning', severity: 'high', region: 'North Pacific' },
  { title: 'Port berth congestion', severity: 'medium', region: 'Western Europe' },
  { title: 'Labor strike watch', severity: 'medium', region: 'Middle East' },
  { title: 'Rail interchange outage', severity: 'high', region: 'North America' },
  { title: 'Customs clearance slowdown', severity: 'low', region: 'South Asia' },
];

const formatNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const normalizeMode = (value) => {
  const mode = normalizeText(value);
  if (mode.includes('air') || mode.includes('plane')) return 'air';
  if (mode.includes('rail') || mode.includes('train')) return 'rail';
  if (mode.includes('road') || mode.includes('truck') || mode.includes('land')) return 'road';
  if (mode.includes('multi')) return 'multimodal';
  return 'sea';
};

const toLonLat = (value) => {
  if (Array.isArray(value) && value.length === 2) {
    const lon = Number(value[0]);
    const lat = Number(value[1]);
    if (Number.isFinite(lon) && Number.isFinite(lat)) {
      return [lon, lat];
    }
  }

  if (typeof value !== 'string') {
    return null;
  }

  const commaParts = value.split(',').map((part) => Number(part.trim()));
  if (commaParts.length === 2 && commaParts.every(Number.isFinite)) {
    return [commaParts[0], commaParts[1]];
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

  return null;
};

const parseStructuredValue = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return value;
  }
};

const toCoordinatePath = (value) => {
  const parsed = parseStructuredValue(value);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((point) => {
      if (Array.isArray(point)) {
        return toLonLat(point);
      }

      if (point && typeof point === 'object') {
        return toLonLat([
          point.longitude ?? point.lon ?? point.lng,
          point.latitude ?? point.lat,
        ]);
      }

      return null;
    })
    .filter(Boolean);
};

const providerImpliesFallback = (provider) => /fallback|land-corridor/i.test(String(provider || ''));

const normalizeSegmentRole = (role, index) => {
  const normalized = normalizeText(role);
  if (normalized === 'access' || normalized === 'egress' || normalized === 'main' || normalized === 'connector') {
    return normalized;
  }

  return index === 0 ? 'main' : 'connector';
};

const parseRouteSegments = (value, fallbackMode) => {
  const parsed = parseStructuredValue(value);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((segment, index) => {
      if (!segment || typeof segment !== 'object') {
        return null;
      }

      const coordinates = toCoordinatePath(segment.coordinates);
      if (coordinates.length < 2) {
        return null;
      }

      const provider = String(segment.provider || 'unknown');
      return {
        id: `segment-${index}`,
        mode: normalizeMode(segment.mode || fallbackMode),
        role: normalizeSegmentRole(segment.segment_role || segment.role, index),
        coordinates,
        distanceKm: formatNumber(segment.distance_km ?? segment.distanceKm, 0),
        durationMinutes: segment.duration_minutes === null
          ? null
          : formatNumber(segment.duration_minutes ?? segment.durationMinutes, 0),
        provider,
        isFallback: providerImpliesFallback(provider),
      };
    })
    .filter(Boolean);
};

const mergeSegmentCoordinates = (segments) => {
  const merged = [];

  segments.forEach((segment) => {
    segment.coordinates.forEach((coord) => {
      const previous = merged[merged.length - 1];
      if (!previous || previous[0] !== coord[0] || previous[1] !== coord[1]) {
        merged.push(coord);
      }
    });
  });

  return merged;
};

const getRiskLevel = (riskScore) => {
  if (riskScore <= 0.35) return 'low';
  if (riskScore <= 0.7) return 'medium';
  return 'high';
};

const getQualityTier = (score) => {
  if (score >= 0.72) return 'strong';
  if (score >= 0.5) return 'watch';
  return 'fragile';
};

const resolveFallbackCoords = (label) => {
  const normalized = normalizeText(label).replace(/[^a-z0-9 ]+/g, ' ');
  if (!normalized) {
    return null;
  }

  const matchKey = Object.keys(CITY_COORDINATE_FALLBACKS).find((key) =>
    normalized.includes(key) || key.includes(normalized)
  );

  return matchKey ? CITY_COORDINATE_FALLBACKS[matchKey] : null;
};

const hashFromString = (value) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const buildDefaultRows = () => ([
  {
    origin_location: 'Shanghai Port',
    destination_location: 'Los Angeles Port',
    mode_of_transport: 'Sea Freight',
    product_name: 'Electronics',
    quantity: 410,
    route_risk_score: 0.72,
  },
  {
    origin_location: 'Singapore Hub',
    destination_location: 'Rotterdam Port',
    mode_of_transport: 'Sea Freight',
    product_name: 'Pharmaceuticals',
    quantity: 160,
    route_risk_score: 0.58,
  },
  {
    origin_location: 'Mumbai Facility',
    destination_location: 'Hamburg Port',
    mode_of_transport: 'Rail',
    product_name: 'Industrial Components',
    quantity: 230,
    route_risk_score: 0.45,
  },
  {
    origin_location: 'Tokyo Distribution Center',
    destination_location: 'Dubai Port',
    mode_of_transport: 'Air',
    product_name: 'Semiconductors',
    quantity: 92,
    route_risk_score: 0.39,
  },
  {
    origin_location: 'New York Terminal',
    destination_location: 'Panama Canal',
    mode_of_transport: 'Sea Freight',
    product_name: 'Automotive Parts',
    quantity: 205,
    route_risk_score: 0.66,
  },
]);

export const buildSupplyChainModel = (rows = []) => {
  const normalizedRows = Array.isArray(rows) && rows.length > 0 ? rows : buildDefaultRows();

  const hubsById = new Map();
  const routes = [];

  normalizedRows.forEach((row, index) => {
    const originLabel = row.origin_hub_name || row.origin_location || row.origin || row.from_location || row.source || row.origin_port;
    const destinationLabel = row.destination_hub_name || row.destination_location || row.destination || row.to_location || row.destination_port;

    if (!originLabel || !destinationLabel) {
      return;
    }

    const originCoords =
      toLonLat(row.origin_coordinates) ||
      toLonLat([row.origin_longitude, row.origin_latitude]) ||
      resolveFallbackCoords(originLabel);

    const destinationCoords =
      toLonLat(row.destination_coordinates) ||
      toLonLat([row.destination_longitude, row.destination_latitude]) ||
      resolveFallbackCoords(destinationLabel);

    if (!originCoords || !destinationCoords) {
      return;
    }

    const mode = normalizeMode(row.mode_of_transport || row.transport_mode || row.segment_mode);
    const quantity = formatNumber(row.quantity || row.volume, 0);
    const riskScore = formatNumber(row.route_risk_score, (hashFromString(`${originLabel}${destinationLabel}`) % 70) / 100 + 0.2);
    const leadTime = formatNumber(row.lead_time || row.lead_time_days, 8 + (index % 7));
    const cost = formatNumber(row.product_cost || row.cost, 24000 + index * 3800);
    const boundedRisk = clamp(Number(riskScore.toFixed(2)), 0.08, 0.95);

    const routeSegments = parseRouteSegments(row.route_segments || row.routeSegments, mode);
    const explicitRouteGeometry = toCoordinatePath(row.route_geometry || row.routeGeometry);
    const mergedSegmentGeometry = routeSegments.length ? mergeSegmentCoordinates(routeSegments) : [];
    const routeGeometry = explicitRouteGeometry.length >= 2
      ? explicitRouteGeometry
      : (mergedSegmentGeometry.length >= 2 ? mergedSegmentGeometry : [originCoords, destinationCoords]);

    const providers = routeSegments.length
      ? Array.from(new Set(routeSegments.map((segment) => segment.provider).filter(Boolean)))
      : String(row.route_provider || '').split('+').map((provider) => provider.trim()).filter(Boolean);
    const fallbackUsed = routeSegments.some((segment) => segment.isFallback) || providerImpliesFallback(row.route_provider);
    const segmentCount = Math.max(routeSegments.length, 1);
    const explicitQualityScore = formatNumber(row.route_quality_score ?? row.route_quality, Number.NaN);
    const derivedQualityScore = (1 - boundedRisk) - (fallbackUsed ? 0.14 : 0) - (segmentCount > 2 ? 0.06 : 0) + 0.08;
    const routeQualityScore = Number.isFinite(explicitQualityScore)
      ? clamp(explicitQualityScore, 0, 1)
      : clamp(derivedQualityScore, 0.08, 0.97);
    const popupCoords = routeGeometry[Math.floor(routeGeometry.length / 2)] || [
      (originCoords[0] + destinationCoords[0]) / 2,
      (originCoords[1] + destinationCoords[1]) / 2,
    ];

    const route = {
      id: `route-${index}`,
      origin: originLabel,
      destination: destinationLabel,
      originCoords,
      destinationCoords,
      mode,
      cargo: row.product_name || row.cargo_type || 'Mixed Cargo',
      quantity,
      riskScore: boundedRisk,
      riskLevel: normalizeText(row.route_risk_level) || getRiskLevel(boundedRisk),
      leadTime,
      cost,
      provider: providers.join(' + ') || row.route_provider || (index % 2 === 0 ? 'CargoFlux' : 'Meridian Lanes'),
      providers,
      fallbackUsed,
      segmentCount,
      routeSegments,
      routeGeometry,
      popupCoords,
      routeQualityScore: Number(routeQualityScore.toFixed(2)),
      routeQualityTier: getQualityTier(routeQualityScore),
      etaShiftDays: Math.round((boundedRisk * 10) - 2),
    };

    routes.push(route);

    const originKey = `${originLabel}:${originCoords.join(',')}`;
    const destinationKey = `${destinationLabel}:${destinationCoords.join(',')}`;

    if (!hubsById.has(originKey)) {
      hubsById.set(originKey, { id: originKey, name: originLabel, coordinates: originCoords, type: 'origin' });
    }

    if (!hubsById.has(destinationKey)) {
      hubsById.set(destinationKey, { id: destinationKey, name: destinationLabel, coordinates: destinationCoords, type: 'destination' });
    }
  });

  const hubs = Array.from(hubsById.values());

  const incidents = INCIDENT_TEMPLATES.map((template, index) => {
    const anchorRoute = routes[index % Math.max(routes.length, 1)] || null;
    const coordinates = anchorRoute
      ? [
          (anchorRoute.originCoords[0] + anchorRoute.destinationCoords[0]) / 2,
          (anchorRoute.originCoords[1] + anchorRoute.destinationCoords[1]) / 2,
        ]
      : [0, 0];

    return {
      id: `incident-${index}`,
      title: template.title,
      message: `${template.region}: volatility index increased ${18 + index * 5}% over baseline.`,
      severity: template.severity,
      priority: template.severity === 'high' ? 'high' : 'medium',
      coordinates,
      region: template.region,
      impactRoutes: Math.max(1, Math.round((routes.length * (0.16 + index * 0.05)) / 2)),
    };
  });

  const transportMix = ['sea', 'air', 'road', 'rail', 'multimodal'].map((mode) => {
    const modeRoutes = routes.filter((route) => route.mode === mode);
    return {
      mode,
      count: modeRoutes.length,
      avgRisk: modeRoutes.length
        ? Number((modeRoutes.reduce((acc, route) => acc + route.riskScore, 0) / modeRoutes.length).toFixed(2))
        : 0,
    };
  });

  const riskByRegion = incidents.map((incident, index) => ({
    region: incident.region,
    risk: Number((0.38 + (index * 0.1)).toFixed(2)),
    disruptions: incident.impactRoutes,
  }));

  const monthlyBaseline = [
    { month: 'Jan', baseline: 82, disrupted: 77 },
    { month: 'Feb', baseline: 84, disrupted: 78 },
    { month: 'Mar', baseline: 83, disrupted: 74 },
    { month: 'Apr', baseline: 86, disrupted: 79 },
    { month: 'May', baseline: 88, disrupted: 80 },
    { month: 'Jun', baseline: 87, disrupted: 82 },
  ];

  const totalValueAtRisk = routes.reduce((acc, route) => acc + (route.cost * (route.riskScore * 0.6)), 0);
  const onTimeRate = routes.length
    ? Number((100 - ((routes.reduce((acc, route) => acc + route.riskScore, 0) / routes.length) * 41)).toFixed(1))
    : 98;

  const disruptionTimeline = [
    {
      id: 't0',
      time: 'T-48h',
      title: 'Cyclone warning model triggered',
      note: 'AI weather fusion model flagged Pacific lane deviation risk.',
      state: 'warning',
    },
    {
      id: 't1',
      time: 'T-24h',
      title: 'Carrier ETA slippage detected',
      note: '11 vessels rerouted; port berthing windows now constrained.',
      state: 'danger',
    },
    {
      id: 't2',
      time: 'T-8h',
      title: 'Contingency lane activated',
      note: 'Air-rail bridge enabled for priority SKUs.',
      state: 'info',
    },
    {
      id: 't3',
      time: 'Live',
      title: 'Recovery trajectory improving',
      note: 'Current simulation projects 21% faster stabilization.',
      state: 'success',
    },
  ];

  const lanes = routes
    .map((route, index) => ({
      id: route.id,
      lane: `${route.origin} -> ${route.destination}`,
      mode: route.mode,
      riskScore: route.riskScore,
      riskLevel: route.riskLevel,
      qualityScore: route.routeQualityScore,
      qualityTier: route.routeQualityTier,
      fallbackUsed: route.fallbackUsed,
      segmentCount: route.segmentCount,
      etaShiftDays: route.etaShiftDays,
      valueAtRisk: Math.round(route.cost * route.riskScore),
      shipmentCount: Math.max(1, Math.round(route.quantity / 40) + (index % 4)),
      provider: route.provider,
      providerChain: route.providers.join(' + ') || route.provider,
      cargo: route.cargo,
      recommendation: route.riskScore > 0.65
        ? 'Reroute immediately'
        : route.fallbackUsed
          ? 'Validate fallback corridor'
          : route.riskScore > 0.45
            ? 'Monitor + buffer'
            : 'Keep lane',
    }))
    .sort((a, b) => b.riskScore - a.riskScore);

  return {
    routes,
    hubs,
    incidents,
    transportMix,
    riskByRegion,
    monthlyBaseline,
    disruptionTimeline,
    lanes,
    kpis: {
      routes: routes.length,
      hubs: hubs.length,
      disruptions: incidents.length,
      onTimeRate,
      valueAtRisk: Math.round(totalValueAtRisk),
      highRiskLanes: lanes.filter((lane) => lane.riskScore >= 0.65).length,
      fallbackRoutes: lanes.filter((lane) => lane.fallbackUsed).length,
      avgRouteQuality: lanes.length
        ? Number((lanes.reduce((sum, lane) => sum + lane.qualityScore, 0) / lanes.length).toFixed(2))
        : 0,
    },
  };
};

export const currency = (value) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
}).format(value || 0);

export const percent = (value) => `${Math.round((value || 0) * 100)}%`;
