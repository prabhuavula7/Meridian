/**
 * Route Enrichment Service
 * Resolves transport hubs and generates mode-aware route geometry for map rendering.
 */

import crypto from 'crypto';
import { RouteEnrichmentRequest, RouteEnrichmentResponse, RouteEnrichmentSummary } from '../types/supplyChain';

type TransportMode = 'sea' | 'air' | 'rail' | 'road' | 'multimodal';
type HubType = 'airport' | 'seaport' | 'city_center';
type Coordinates = [number, number]; // [longitude, latitude]
type EndpointRole = 'origin' | 'destination';
type SegmentRole = 'access' | 'main' | 'egress';

interface StaticHub {
  name: string;
  aliases: string[];
  coordinates: Coordinates;
  type: HubType;
}

interface ResolvedHub {
  name: string;
  coordinates: Coordinates;
  type: HubType;
  source: 'static' | 'geocoder' | 'fallback';
}

interface RouteSegmentResult {
  mode: TransportMode;
  role: SegmentRole;
  coordinates: Coordinates[];
  distanceKm: number;
  durationMinutes: number | null;
  provider: string;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  class?: string;
  type?: string;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface EnrichedRowResult {
  row: Record<string, unknown>;
  mode: TransportMode;
  provider: string;
}

const NOMINATIM_BASE_URL = process.env['NOMINATIM_BASE_URL'] || 'https://nominatim.openstreetmap.org/search';
const OSRM_BASE_URL = process.env['OSRM_BASE_URL'] || 'https://router.project-osrm.org';
const ROUTE_ENRICHMENT_SCHEMA_VERSION = 'v2';
const ROUTE_HTTP_TIMEOUT_MS = parseInt(process.env['ROUTE_HTTP_TIMEOUT_MS'] || '15000', 10);
const NOMINATIM_USER_AGENT =
  process.env['NOMINATIM_USER_AGENT'] || 'Meridian AI Supply Chain Route Service/1.0';

const ENRICHMENT_CACHE_TTL_MS = parseInt(process.env['ROUTE_ENRICHMENT_CACHE_TTL_MS'] || String(60 * 60 * 1000), 10);
const ENRICHMENT_CACHE_MAX_ENTRIES = parseInt(process.env['ROUTE_ENRICHMENT_CACHE_MAX_ENTRIES'] || '20', 10);
const LOCATION_CACHE_MAX_ENTRIES = parseInt(process.env['ROUTE_LOCATION_CACHE_MAX_ENTRIES'] || '2500', 10);
const ROUTE_ENRICH_CONCURRENCY = Math.max(1, parseInt(process.env['ROUTE_ENRICH_CONCURRENCY'] || '4', 10));
const ROUTE_DEBUG_LOGS = process.env['DEBUG_LOGS'] !== 'false';

const CONNECTOR_DISTANCE_THRESHOLD_KM = 15;
const MAX_POINTS_PER_SEGMENT = 80;
const MAX_POINTS_PER_ROUTE = 260;
const MAX_OSRM_CONNECTOR_DISTANCE_KM = parseInt(process.env['MAX_OSRM_CONNECTOR_DISTANCE_KM'] || '1200', 10);
const MAX_OSRM_LAND_DISTANCE_KM = parseInt(process.env['MAX_OSRM_LAND_DISTANCE_KM'] || '3500', 10);
const MAX_OSRM_RAIL_DISTANCE_KM = parseInt(process.env['MAX_OSRM_RAIL_DISTANCE_KM'] || '2800', 10);
const MAX_LAND_NODE_ANCHOR_KM = parseInt(process.env['MAX_LAND_NODE_ANCHOR_KM'] || '1400', 10);

const FIELD_ALIASES: Record<string, string[]> = {
  origin_location: ['origin_location', 'origin', 'from_location', 'source', 'origin point', 'Origin_Point', 'Location'],
  destination_location: ['destination_location', 'destination', 'to_location', 'end_location', 'Destination_Point'],
  mode_of_transport: ['mode_of_transport', 'transport_mode', 'mode', 'shipping_method', 'Transportation modes'],
  lead_time: ['lead_time', 'lead_time_days', 'transit_time', 'delivery_time'],
  route_risk_score: ['route_risk_score', 'risk_score', 'risk'],
  route_risk_level: ['route_risk_level', 'risk_level'],
};

const MAJOR_AIRPORTS: StaticHub[] = [
  { name: 'Los Angeles International Airport (LAX)', aliases: ['los angeles', 'lax', 'los angeles international airport'], coordinates: [-118.4085, 33.9416], type: 'airport' },
  { name: 'John F. Kennedy International Airport (JFK)', aliases: ['new york', 'jfk', 'john f kennedy international airport'], coordinates: [-73.7781, 40.6413], type: 'airport' },
  { name: 'Heathrow Airport (LHR)', aliases: ['london', 'heathrow', 'lhr'], coordinates: [-0.4543, 51.47], type: 'airport' },
  { name: 'Dubai International Airport (DXB)', aliases: ['dubai', 'dxb', 'dubai international airport'], coordinates: [55.3644, 25.2532], type: 'airport' },
  { name: 'Singapore Changi Airport (SIN)', aliases: ['singapore', 'changi', 'sin'], coordinates: [103.9915, 1.3644], type: 'airport' },
  { name: 'Tokyo Haneda Airport (HND)', aliases: ['tokyo', 'haneda', 'hnd'], coordinates: [139.7798, 35.5494], type: 'airport' },
  { name: 'Shanghai Pudong International Airport (PVG)', aliases: ['shanghai', 'pudong', 'pvg'], coordinates: [121.8052, 31.1443], type: 'airport' },
  { name: 'Mumbai Chhatrapati Shivaji Maharaj International Airport (BOM)', aliases: ['mumbai', 'bom', 'chhatrapati shivaji'], coordinates: [72.8679, 19.0896], type: 'airport' },
  { name: 'Sydney Kingsford Smith Airport (SYD)', aliases: ['sydney', 'syd', 'kingsford smith'], coordinates: [151.1772, -33.9399], type: 'airport' },
  { name: 'Amsterdam Schiphol Airport (AMS)', aliases: ['amsterdam', 'schiphol', 'ams'], coordinates: [4.7639, 52.3091], type: 'airport' },
  { name: 'Kempegowda International Airport (BLR)', aliases: ['bangalore', 'bengaluru', 'blr'], coordinates: [77.7063, 13.1986], type: 'airport' },
  { name: 'Netaji Subhas Chandra Bose International Airport (CCU)', aliases: ['kolkata', 'ccu', 'calcutta'], coordinates: [88.4467, 22.6547], type: 'airport' },
  { name: 'Chennai International Airport (MAA)', aliases: ['chennai', 'maa'], coordinates: [80.1693, 12.9941], type: 'airport' },
  { name: "O'Hare International Airport (ORD)", aliases: ['chicago', 'ord', 'ohare'], coordinates: [-87.9073, 41.9742], type: 'airport' },
  { name: 'Miami International Airport (MIA)', aliases: ['miami', 'mia'], coordinates: [-80.2906, 25.7959], type: 'airport' },
  { name: 'Seattle-Tacoma International Airport (SEA)', aliases: ['seattle', 'sea', 'seattle tacoma'], coordinates: [-122.3088, 47.4502], type: 'airport' },
  { name: 'San Francisco International Airport (SFO)', aliases: ['san francisco', 'sfo'], coordinates: [-122.379, 37.6213], type: 'airport' },
  { name: 'Incheon International Airport (ICN)', aliases: ['seoul', 'icn'], coordinates: [126.4505, 37.4602], type: 'airport' },
  { name: 'Southampton Airport (SOU)', aliases: ['southampton', 'sou'], coordinates: [-1.3568, 50.9503], type: 'airport' },
];

const MAJOR_PORTS: StaticHub[] = [
  { name: 'Port of Los Angeles', aliases: ['los angeles port', 'port of los angeles', 'la port'], coordinates: [-118.2641, 33.7284], type: 'seaport' },
  { name: 'Port of Long Beach', aliases: ['long beach port', 'port of long beach'], coordinates: [-118.2167, 33.7542], type: 'seaport' },
  { name: 'Port of Rotterdam', aliases: ['rotterdam', 'port of rotterdam'], coordinates: [4.2865, 51.885], type: 'seaport' },
  { name: 'Port of Singapore', aliases: ['singapore port', 'port of singapore'], coordinates: [103.7073, 1.2644], type: 'seaport' },
  { name: 'Port of Shanghai', aliases: ['shanghai port', 'port of shanghai'], coordinates: [121.4917, 31.2333], type: 'seaport' },
  { name: 'Port of Dubai (Jebel Ali)', aliases: ['dubai port', 'jebel ali', 'port of jebel ali'], coordinates: [55.0262, 24.9854], type: 'seaport' },
  { name: 'Port of Hamburg', aliases: ['hamburg port', 'port of hamburg'], coordinates: [9.9665, 53.5461], type: 'seaport' },
  { name: 'Port of New York and New Jersey', aliases: ['new york port', 'port of new york'], coordinates: [-74.0413, 40.6681], type: 'seaport' },
  { name: 'Port of Tokyo', aliases: ['tokyo port', 'port of tokyo'], coordinates: [139.792, 35.6168], type: 'seaport' },
  { name: 'Port of Sydney', aliases: ['sydney port', 'port of sydney'], coordinates: [151.2093, -33.8688], type: 'seaport' },
  { name: 'Port of Mumbai (Nhava Sheva)', aliases: ['mumbai port', 'nhava sheva', 'jawaharlal nehru port'], coordinates: [72.95, 18.95], type: 'seaport' },
  { name: 'Port of Kolkata', aliases: ['kolkata', 'kolkata port', 'calcutta', 'calcutta port', 'syama prasad mookerjee port'], coordinates: [88.3247, 22.5411], type: 'seaport' },
  { name: 'Port of Chennai', aliases: ['chennai', 'chennai port', 'madras', 'madras port'], coordinates: [80.3022, 13.1067], type: 'seaport' },
  { name: 'Port of Seattle', aliases: ['seattle', 'seattle port', 'port of seattle'], coordinates: [-122.3321, 47.6062], type: 'seaport' },
  { name: 'Port of Miami', aliases: ['miami', 'miami port', 'portmiami'], coordinates: [-80.171, 25.7781], type: 'seaport' },
  { name: 'Port of San Francisco', aliases: ['san francisco', 'sf', 'san francisco port', 'port of san francisco'], coordinates: [-122.3933, 37.7955], type: 'seaport' },
  { name: 'Port of Southampton', aliases: ['southampton', 'southampton port', 'port of southampton'], coordinates: [-1.4043, 50.9014], type: 'seaport' },
  { name: 'Port of Busan', aliases: ['busan', 'seoul', 'busan port', 'seoul port', 'port of busan'], coordinates: [129.0756, 35.1796], type: 'seaport' },
  { name: 'Port of Santos', aliases: ['santos', 'port of santos'], coordinates: [-46.32, -23.96], type: 'seaport' },
  { name: 'Port of Cape Town', aliases: ['cape town port', 'port of cape town'], coordinates: [18.42, -33.9], type: 'seaport' },
];

const CITY_CENTERS: StaticHub[] = [
  { name: 'Los Angeles City Center', aliases: ['los angeles'], coordinates: [-118.2437, 34.0522], type: 'city_center' },
  { name: 'New York City Center', aliases: ['new york'], coordinates: [-74.006, 40.7128], type: 'city_center' },
  { name: 'London City Center', aliases: ['london'], coordinates: [-0.1276, 51.5072], type: 'city_center' },
  { name: 'Dubai City Center', aliases: ['dubai'], coordinates: [55.2708, 25.2048], type: 'city_center' },
  { name: 'Singapore City Center', aliases: ['singapore'], coordinates: [103.8198, 1.3521], type: 'city_center' },
  { name: 'Tokyo City Center', aliases: ['tokyo'], coordinates: [139.6503, 35.6762], type: 'city_center' },
  { name: 'Shanghai City Center', aliases: ['shanghai'], coordinates: [121.4737, 31.2304], type: 'city_center' },
  { name: 'Mumbai City Center', aliases: ['mumbai'], coordinates: [72.8777, 19.076], type: 'city_center' },
  { name: 'Kolkata City Center', aliases: ['kolkata', 'calcutta'], coordinates: [88.3639, 22.5726], type: 'city_center' },
  { name: 'Chennai City Center', aliases: ['chennai', 'madras'], coordinates: [80.2707, 13.0827], type: 'city_center' },
  { name: 'Bangalore City Center', aliases: ['bangalore', 'bengaluru'], coordinates: [77.5946, 12.9716], type: 'city_center' },
  { name: 'Sydney City Center', aliases: ['sydney'], coordinates: [151.2093, -33.8688], type: 'city_center' },
  { name: 'Chicago City Center', aliases: ['chicago'], coordinates: [-87.6298, 41.8781], type: 'city_center' },
  { name: 'Miami City Center', aliases: ['miami'], coordinates: [-80.1918, 25.7617], type: 'city_center' },
  { name: 'Seattle City Center', aliases: ['seattle'], coordinates: [-122.3321, 47.6062], type: 'city_center' },
  { name: 'San Francisco City Center', aliases: ['san francisco', 'sf'], coordinates: [-122.4194, 37.7749], type: 'city_center' },
  { name: 'Amsterdam City Center', aliases: ['amsterdam'], coordinates: [4.9041, 52.3676], type: 'city_center' },
  { name: 'Seoul City Center', aliases: ['seoul'], coordinates: [126.978, 37.5665], type: 'city_center' },
  { name: 'Southampton City Center', aliases: ['southampton'], coordinates: [-1.4044, 50.9097], type: 'city_center' },
  { name: 'Rotterdam City Center', aliases: ['rotterdam'], coordinates: [4.4792, 51.9225], type: 'city_center' },
  { name: 'Delhi City Center', aliases: ['delhi', 'new delhi'], coordinates: [77.1025, 28.7041], type: 'city_center' },
  { name: 'Houston City Center', aliases: ['houston'], coordinates: [-95.3698, 29.7604], type: 'city_center' },
  { name: 'Dallas City Center', aliases: ['dallas'], coordinates: [-96.797, 32.7767], type: 'city_center' },
  { name: 'Sao Paulo City Center', aliases: ['sao paulo'], coordinates: [-46.6333, -23.5505], type: 'city_center' },
  { name: 'Cape Town City Center', aliases: ['cape town'], coordinates: [18.4241, -33.9249], type: 'city_center' },
];

const STATIC_HUBS_BY_MODE: Record<TransportMode, StaticHub[]> = {
  air: MAJOR_AIRPORTS,
  sea: MAJOR_PORTS,
  rail: CITY_CENTERS,
  road: CITY_CENTERS,
  multimodal: CITY_CENTERS,
};

const MARITIME_NODES: Record<string, Coordinates> = {
  us_west: [-124.5, 34.5],
  us_east: [-73.5, 39.5],
  gulf_of_mexico: [-90, 24],
  caribbean: [-72, 18],
  panama_pacific: [-80.6, 8.6],
  panama_atlantic: [-79.3, 9.6],
  north_atlantic_west: [-55, 34],
  north_atlantic_east: [-20, 38],
  north_sea: [2.5, 55.5],
  english_channel: [-1.5, 50],
  bay_biscay: [-8.5, 45],
  iberian_west: [-10.5, 37],
  gibraltar: [-5.5, 36],
  west_mediterranean: [4, 37],
  east_mediterranean: [28, 34],
  suez_north: [32.4, 31],
  suez_south: [32.7, 29],
  red_sea_south: [42.5, 14],
  gulf_of_aden: [48, 12],
  arabian_sea: [60, 16],
  lakshadweep_sea: [72, 10],
  indian_ocean_central: [76, -6],
  indian_ocean_south: [58, -35],
  east_africa: [46, -14],
  cape_good_hope: [18.4, -34.5],
  south_africa_east: [33, -34],
  west_africa: [-17, 17],
  south_atlantic: [-10, -34],
  sumatra_west: [94, 4],
  malacca_west: [99.5, 6],
  malacca_east: [103.2, 2],
  java_sea: [112, -7],
  south_china_sea: [114, 14],
  philippine_sea: [132, 19],
  east_china_sea: [126, 26],
  japan_pacific: [143, 35],
  okhotsk: [150, 47],
  north_pacific_west: [170, 42],
  north_pacific_east: [-150, 40],
  central_pacific: [-160, 18],
  south_pacific: [165, -30],
  australia_west: [114, -31],
  australia_east: [153, -33],
};

const MARITIME_EDGES: Array<[string, string]> = [
  ['us_west', 'central_pacific'],
  ['us_west', 'north_pacific_east'],
  ['us_west', 'panama_pacific'],
  ['us_east', 'north_atlantic_west'],
  ['us_east', 'caribbean'],
  ['gulf_of_mexico', 'caribbean'],
  ['gulf_of_mexico', 'panama_atlantic'],
  ['panama_pacific', 'panama_atlantic'],
  ['panama_atlantic', 'caribbean'],
  ['caribbean', 'north_atlantic_west'],
  ['panama_atlantic', 'north_atlantic_west'],
  ['north_atlantic_west', 'north_atlantic_east'],
  ['north_atlantic_east', 'iberian_west'],
  ['iberian_west', 'bay_biscay'],
  ['bay_biscay', 'english_channel'],
  ['english_channel', 'north_sea'],
  ['north_sea', 'english_channel'],
  ['english_channel', 'gibraltar'],
  ['north_atlantic_east', 'gibraltar'],
  ['gibraltar', 'west_mediterranean'],
  ['west_mediterranean', 'east_mediterranean'],
  ['east_mediterranean', 'suez_north'],
  ['suez_north', 'suez_south'],
  ['suez_south', 'red_sea_south'],
  ['red_sea_south', 'gulf_of_aden'],
  ['gulf_of_aden', 'arabian_sea'],
  ['red_sea_south', 'arabian_sea'],
  ['arabian_sea', 'lakshadweep_sea'],
  ['lakshadweep_sea', 'indian_ocean_central'],
  ['arabian_sea', 'indian_ocean_central'],
  ['indian_ocean_central', 'malacca_west'],
  ['indian_ocean_central', 'east_africa'],
  ['east_africa', 'south_africa_east'],
  ['south_africa_east', 'cape_good_hope'],
  ['malacca_west', 'malacca_east'],
  ['sumatra_west', 'malacca_west'],
  ['indian_ocean_central', 'sumatra_west'],
  ['malacca_east', 'south_china_sea'],
  ['malacca_east', 'java_sea'],
  ['java_sea', 'south_china_sea'],
  ['south_china_sea', 'east_china_sea'],
  ['south_china_sea', 'philippine_sea'],
  ['philippine_sea', 'east_china_sea'],
  ['east_china_sea', 'japan_pacific'],
  ['japan_pacific', 'okhotsk'],
  ['okhotsk', 'north_pacific_west'],
  ['japan_pacific', 'north_pacific_west'],
  ['north_pacific_west', 'north_pacific_east'],
  ['north_pacific_east', 'central_pacific'],
  ['central_pacific', 'south_pacific'],
  ['south_pacific', 'australia_east'],
  ['indian_ocean_central', 'australia_west'],
  ['australia_west', 'australia_east'],
  ['indian_ocean_central', 'indian_ocean_south'],
  ['indian_ocean_south', 'cape_good_hope'],
  ['cape_good_hope', 'south_atlantic'],
  ['west_africa', 'north_atlantic_east'],
  ['west_africa', 'south_atlantic'],
  ['west_africa', 'gibraltar'],
  ['south_atlantic', 'north_atlantic_west'],
  ['south_atlantic', 'north_atlantic_east'],
];

const LAND_NODES: Record<string, Coordinates> = {
  mumbai: [72.8777, 19.076],
  delhi: [77.1025, 28.7041],
  kolkata: [88.3639, 22.5726],
  chennai: [80.2707, 13.0827],
  bangalore: [77.5946, 12.9716],
  lahore: [74.3587, 31.5204],
  tashkent: [69.2401, 41.2995],
  almaty: [76.886, 43.2389],
  urumqi: [87.6168, 43.8256],
  kunming: [102.8329, 24.8801],
  chongqing: [106.5516, 29.563],
  beijing: [116.4074, 39.9042],
  shanghai: [121.4737, 31.2304],
  tehran: [51.389, 35.6892],
  istanbul: [28.9784, 41.0082],
  warsaw: [21.0122, 52.2297],
  berlin: [13.405, 52.52],
  amsterdam: [4.9041, 52.3676],
  paris: [2.3522, 48.8566],
  madrid: [-3.7038, 40.4168],
  rome: [12.4964, 41.9028],
  moscow: [37.6173, 55.7558],
};

const LAND_EDGES: Array<[string, string]> = [
  ['mumbai', 'delhi'],
  ['mumbai', 'bangalore'],
  ['bangalore', 'chennai'],
  ['chennai', 'kolkata'],
  ['delhi', 'kolkata'],
  ['delhi', 'lahore'],
  ['lahore', 'tashkent'],
  ['tashkent', 'almaty'],
  ['almaty', 'urumqi'],
  ['urumqi', 'kunming'],
  ['urumqi', 'chongqing'],
  ['chongqing', 'shanghai'],
  ['kunming', 'shanghai'],
  ['beijing', 'shanghai'],
  ['beijing', 'urumqi'],
  ['tashkent', 'tehran'],
  ['tehran', 'istanbul'],
  ['istanbul', 'warsaw'],
  ['warsaw', 'berlin'],
  ['berlin', 'amsterdam'],
  ['berlin', 'paris'],
  ['paris', 'madrid'],
  ['paris', 'rome'],
  ['warsaw', 'moscow'],
  ['moscow', 'istanbul'],
];

export class RouteEnrichmentService {
  private readonly locationCache = new Map<string, ResolvedHub>();
  private readonly locationInFlight = new Map<string, Promise<ResolvedHub>>();
  private readonly enrichmentCache = new Map<string, CacheEntry<RouteEnrichmentResponse>>();

  private log(message: string, details?: Record<string, unknown>): void {
    if (!ROUTE_DEBUG_LOGS) {
      return;
    }

    if (details) {
      console.log(`[routeEnrichmentService] ${message}`, details);
      return;
    }

    console.log(`[routeEnrichmentService] ${message}`);
  }

  public async enrichRoutes(request: RouteEnrichmentRequest): Promise<RouteEnrichmentResponse> {
    const rows = request.rows || [];
    const fieldMappings = request.fieldMappings || {};
    const cacheKey = this.buildRequestCacheKey(rows, fieldMappings);

    this.evictExpiredEntries();

    const cached = this.enrichmentCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      const cachedValue = this.deepClone(cached.value);
      cachedValue.summary.cacheHit = true;
      cachedValue.summary.cacheKey = cacheKey;
      this.log('Request served from in-memory cache', {
        cacheKey,
        rows: rows.length,
      });
      return cachedValue;
    }

    const summary: RouteEnrichmentSummary = {
      totalRows: rows.length,
      enrichedRows: 0,
      cacheHit: false,
      cacheKey,
      modeBreakdown: { sea: 0, air: 0, rail: 0, road: 0, multimodal: 0 },
      providersUsed: [],
    };

    const providers = new Set<string>();
    const enrichedRows: Record<string, unknown>[] = new Array(rows.length);

    for (let start = 0; start < rows.length; start += ROUTE_ENRICH_CONCURRENCY) {
      const batch = rows.slice(start, start + ROUTE_ENRICH_CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map((row) => this.enrichSingleRow(row, fieldMappings))
      );

      batchResults.forEach((result, offset) => {
        const index = start + offset;
        enrichedRows[index] = result.row;
        summary.modeBreakdown[result.mode] += 1;
        summary.enrichedRows += 1;
        providers.add(result.provider);
      });
    }

    summary.providersUsed = Array.from(providers).sort();

    const response: RouteEnrichmentResponse = {
      rows: enrichedRows,
      summary,
    };

    this.setEnrichmentCache(cacheKey, response);
    this.log('Request computed and cached', {
      cacheKey,
      rows: rows.length,
      enrichedRows: summary.enrichedRows,
      providersUsed: summary.providersUsed,
    });
    return this.deepClone(response);
  }

  private async enrichSingleRow(
    row: Record<string, unknown>,
    fieldMappings: Record<string, string>
  ): Promise<EnrichedRowResult> {
    const requestedMode = this.normalizeTransportMode(this.readField(row, fieldMappings, 'mode_of_transport'));
    const originInput = String(this.readField(row, fieldMappings, 'origin_location') || '').trim();
    const destinationInput = String(this.readField(row, fieldMappings, 'destination_location') || '').trim();

    const originCity = await this.resolveHub(originInput, 'road', 'origin');
    const destinationCity = await this.resolveHub(destinationInput, 'road', 'destination');

    let primaryMode: TransportMode = requestedMode;
    let originMainHub = originCity;
    let destinationMainHub = destinationCity;

    if (requestedMode === 'sea') {
      originMainHub = await this.resolveModeMainHub(originInput, originCity, 'sea', 'origin');
      destinationMainHub = await this.resolveModeMainHub(destinationInput, destinationCity, 'sea', 'destination');
    } else if (requestedMode === 'air') {
      originMainHub = await this.resolveModeMainHub(originInput, originCity, 'air', 'origin');
      destinationMainHub = await this.resolveModeMainHub(destinationInput, destinationCity, 'air', 'destination');
    } else if (requestedMode === 'multimodal') {
      const cityDistance = this.haversineDistanceKm(originCity.coordinates, destinationCity.coordinates);
      if (cityDistance > 1600) {
        primaryMode = 'sea';
        originMainHub = await this.resolveModeMainHub(originInput, originCity, 'sea', 'origin');
        destinationMainHub = await this.resolveModeMainHub(destinationInput, destinationCity, 'sea', 'destination');
      } else {
        primaryMode = 'road';
      }
    } else if ((requestedMode === 'road' || requestedMode === 'rail') &&
      !this.hasLandCorridorPath(originCity.coordinates, destinationCity.coordinates)) {
      // Force mixed routing when a pure land corridor does not exist between endpoints.
      // This avoids road/rail lines visually crossing oceans.
      this.log('Ground route switched to mixed corridor routing', {
        requestedMode,
        origin: originInput || originCity.name,
        destination: destinationInput || destinationCity.name,
      });
      primaryMode = 'sea';
      originMainHub = await this.resolveModeMainHub(originInput, originCity, 'sea', 'origin');
      destinationMainHub = await this.resolveModeMainHub(destinationInput, destinationCity, 'sea', 'destination');
    }

    const segments: RouteSegmentResult[] = [];

    if ((primaryMode === 'sea' || primaryMode === 'air') &&
      this.haversineDistanceKm(originCity.coordinates, originMainHub.coordinates) > CONNECTOR_DISTANCE_THRESHOLD_KM) {
      const accessSegment = await this.buildLandSegment(
        'road',
        'access',
        originCity.coordinates,
        originMainHub.coordinates,
        'osrm-driving-connector',
        65
      );
      segments.push(accessSegment);
    }

    const mainSegment = await this.buildMainSegment(
      primaryMode,
      originMainHub.coordinates,
      destinationMainHub.coordinates
    );
    segments.push(mainSegment);

    if ((primaryMode === 'sea' || primaryMode === 'air') &&
      this.haversineDistanceKm(destinationMainHub.coordinates, destinationCity.coordinates) > CONNECTOR_DISTANCE_THRESHOLD_KM) {
      const egressSegment = await this.buildLandSegment(
        'road',
        'egress',
        destinationMainHub.coordinates,
        destinationCity.coordinates,
        'osrm-driving-connector',
        65
      );
      segments.push(egressSegment);
    }

    const routeCoordinates = this.mergeSegmentCoordinates(segments.map((segment) => segment.coordinates));
    const totalDistanceKm = segments.reduce((sum, segment) => sum + segment.distanceKm, 0);
    const durationParts = segments.map((segment) => segment.durationMinutes).filter((value): value is number => value !== null);
    const totalDurationMinutes = durationParts.length > 0 ? durationParts.reduce((sum, value) => sum + value, 0) : null;

    const riskScore = this.computeRouteRiskScore(primaryMode, totalDistanceKm, row, segments);
    const riskLevel = this.getRiskLevelLabel(riskScore);

    const enrichedRow: Record<string, unknown> = {
      ...row,
      origin_location: originInput || originCity.name,
      destination_location: destinationInput || destinationCity.name,
      mode_of_transport: primaryMode,
      primary_transport_mode: primaryMode,
      origin_city_name: originCity.name,
      destination_city_name: destinationCity.name,
      origin_hub_name: originMainHub.name,
      destination_hub_name: destinationMainHub.name,
      origin_hub_type: originMainHub.type,
      destination_hub_type: destinationMainHub.type,
      origin_coordinates: originCity.coordinates,
      destination_coordinates: destinationCity.coordinates,
      origin_hub_coordinates: originMainHub.coordinates,
      destination_hub_coordinates: destinationMainHub.coordinates,
      route_segments: segments.map((segment) => ({
        mode: segment.mode,
        segment_role: segment.role,
        coordinates: segment.coordinates,
        distance_km: this.roundTo(segment.distanceKm, 2),
        duration_minutes: segment.durationMinutes === null ? null : Math.round(segment.durationMinutes),
        provider: segment.provider,
      })),
      route_geometry: routeCoordinates,
      route_distance_km: this.roundTo(totalDistanceKm, 2),
      route_duration_minutes: totalDurationMinutes === null ? null : Math.round(totalDurationMinutes),
      route_provider: segments.map((segment) => segment.provider).join('+'),
      route_risk_score: this.roundTo(riskScore, 2),
      route_risk_level: riskLevel,
    };

    return {
      row: enrichedRow,
      mode: primaryMode,
      provider: segments.map((segment) => segment.provider).join('+'),
    };
  }

  private async resolveModeMainHub(
    locationInput: string,
    cityHub: ResolvedHub,
    mode: 'sea' | 'air',
    role: EndpointRole
  ): Promise<ResolvedHub> {
    const staticCandidates = mode === 'sea' ? MAJOR_PORTS : MAJOR_AIRPORTS;
    const normalizedInput = this.normalizeText(locationInput);

    const directStatic = this.matchStaticHub(normalizedInput, mode);
    if (directStatic) {
      return {
        name: directStatic.name,
        coordinates: directStatic.coordinates,
        type: directStatic.type,
        source: 'static',
      };
    }

    const nearestStatic = this.findNearestStaticHub(cityHub.coordinates, staticCandidates);
    const indicatesSpecificHub = /\b(airport|port|harbor|harbour|terminal|seaport|dock|pier)\b/.test(normalizedInput);

    if (nearestStatic && cityHub.source !== 'fallback' && !indicatesSpecificHub) {
      return {
        name: nearestStatic.name,
        coordinates: nearestStatic.coordinates,
        type: nearestStatic.type,
        source: 'static',
      };
    }

    const resolvedByMode = await this.resolveHub(locationInput, mode, role);

    if (!nearestStatic) {
      return resolvedByMode;
    }

    const resolvedDistance = this.haversineDistanceKm(cityHub.coordinates, resolvedByMode.coordinates);
    const staticDistance = this.haversineDistanceKm(cityHub.coordinates, nearestStatic.coordinates);

    if (resolvedDistance > staticDistance + 180) {
      return {
        name: nearestStatic.name,
        coordinates: nearestStatic.coordinates,
        type: nearestStatic.type,
        source: 'static',
      };
    }

    return resolvedByMode;
  }

  private readField(
    row: Record<string, unknown>,
    fieldMappings: Record<string, string>,
    canonicalField: string
  ): unknown {
    if (row[canonicalField] !== undefined && row[canonicalField] !== null && row[canonicalField] !== '') {
      return row[canonicalField];
    }

    const directMap = fieldMappings[canonicalField];
    if (directMap && row[directMap] !== undefined && row[directMap] !== null && row[directMap] !== '') {
      return row[directMap];
    }

    const aliases = FIELD_ALIASES[canonicalField] || [];
    for (const alias of aliases) {
      if (row[alias] !== undefined && row[alias] !== null && row[alias] !== '') {
        return row[alias];
      }

      const mappedKey = Object.keys(fieldMappings).find((key) => {
        const mapped = fieldMappings[key];
        return mapped === canonicalField && key === alias;
      });

      if (mappedKey && row[mappedKey] !== undefined && row[mappedKey] !== null && row[mappedKey] !== '') {
        return row[mappedKey];
      }
    }

    return undefined;
  }

  private normalizeTransportMode(modeRaw: unknown): TransportMode {
    const normalized = String(modeRaw || 'sea').toLowerCase().trim();

    if (/air|aviation|plane/.test(normalized)) {
      return 'air';
    }
    if (/rail|train/.test(normalized)) {
      return 'rail';
    }
    if (/road|truck|highway|land/.test(normalized)) {
      return 'road';
    }
    if (/multi|mixed/.test(normalized)) {
      return 'multimodal';
    }

    return 'sea';
  }

  private async resolveHub(locationInput: string, mode: TransportMode, _role: EndpointRole): Promise<ResolvedHub> {
    const sanitizedInput = this.normalizeText(locationInput);
    if (!sanitizedInput) {
      return this.getFallbackHub('Unknown', mode);
    }

    const cacheKey = `${mode}:${sanitizedInput}`;
    const cached = this.locationCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const inFlight = this.locationInFlight.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    const resolverPromise = (async () => {
      const staticHub = this.matchStaticHub(sanitizedInput, mode);
      if (staticHub) {
        const resolved: ResolvedHub = {
          name: staticHub.name,
          coordinates: staticHub.coordinates,
          type: staticHub.type,
          source: 'static',
        };
        this.setLocationCache(cacheKey, resolved);
        return resolved;
      }

      const geocoded = await this.geocodeHub(sanitizedInput, mode);
      if (geocoded) {
        this.setLocationCache(cacheKey, geocoded);
        return geocoded;
      }

      const fallback = this.getFallbackHub(sanitizedInput, mode);
      this.setLocationCache(cacheKey, fallback);
      return fallback;
    })();

    this.locationInFlight.set(cacheKey, resolverPromise);
    try {
      return await resolverPromise;
    } finally {
      this.locationInFlight.delete(cacheKey);
    }
  }

  private matchStaticHub(locationInput: string, mode: TransportMode): StaticHub | null {
    const normalizedInput = this.normalizeText(locationInput);
    const hubs = STATIC_HUBS_BY_MODE[mode];

    let bestMatch: StaticHub | null = null;
    let bestScore = -1;

    for (const hub of hubs) {
      const candidates = [hub.name, ...hub.aliases];
      for (const candidate of candidates) {
        const normalizedCandidate = this.normalizeText(candidate);
        let score = 0;

        if (normalizedInput === normalizedCandidate) {
          score = 100;
        } else if (normalizedInput.includes(normalizedCandidate)) {
          score = normalizedCandidate.length;
        } else if (normalizedCandidate.includes(normalizedInput)) {
          score = normalizedInput.length;
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = hub;
        }
      }
    }

    return bestScore >= 4 ? bestMatch : null;
  }

  private async geocodeHub(locationInput: string, mode: TransportMode): Promise<ResolvedHub | null> {
    const queryVariants = this.buildGeocodeQueries(locationInput, mode);

    for (const query of queryVariants) {
      const results = await this.fetchNominatim(query);
      if (results.length === 0) {
        continue;
      }

      const best = this.pickBestGeocodeResult(results, mode);
      if (!best) {
        continue;
      }

      const lon = Number(best.lon);
      const lat = Number(best.lat);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
        continue;
      }

      return {
        name: best.display_name,
        coordinates: [lon, lat],
        type: mode === 'air' ? 'airport' : mode === 'sea' ? 'seaport' : 'city_center',
        source: 'geocoder',
      };
    }

    return null;
  }

  private buildGeocodeQueries(locationInput: string, mode: TransportMode): string[] {
    if (mode === 'air') {
      return [
        `${locationInput} airport`,
        `${locationInput} international airport`,
        locationInput,
      ];
    }

    if (mode === 'sea') {
      return [
        `${locationInput} port`,
        `${locationInput} seaport`,
        `${locationInput} harbor`,
        locationInput,
      ];
    }

    return [locationInput];
  }

  private pickBestGeocodeResult(results: NominatimResult[], mode: TransportMode): NominatimResult | null {
    let bestResult: NominatimResult | null = null;
    let bestScore = -Infinity;

    for (const result of results) {
      const haystack = `${result.display_name || ''} ${result.class || ''} ${result.type || ''}`.toLowerCase();
      let score = 0;

      if (mode === 'air') {
        if (/(airport|aerodrome|airfield|terminal)/.test(haystack)) score += 80;
        if (/(city|town|village|administrative)/.test(haystack)) score -= 20;
      } else if (mode === 'sea') {
        if (/(port|harbour|harbor|dock|pier|marina)/.test(haystack)) score += 80;
        if (/(city|town|village|administrative)/.test(haystack)) score -= 12;
      } else {
        if (/(city|town|village|administrative|municipality)/.test(haystack)) score += 45;
      }

      score += Math.max(0, 10 - (result.display_name || '').length / 35);

      if (score > bestScore) {
        bestScore = score;
        bestResult = result;
      }
    }

    return bestResult;
  }

  private async fetchNominatim(query: string): Promise<NominatimResult[]> {
    const url = new URL(NOMINATIM_BASE_URL);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('q', query);
    url.searchParams.set('limit', '6');
    url.searchParams.set('addressdetails', '1');

    try {
      const response = await this.fetchJson<NominatimResult[]>(url.toString(), {
        headers: {
          'User-Agent': NOMINATIM_USER_AGENT,
          Accept: 'application/json',
        },
      });

      return Array.isArray(response) ? response : [];
    } catch (error) {
      this.log('Nominatim lookup failed; using fallback resolution path', {
        query,
        message: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  private async buildMainSegment(
    mode: TransportMode,
    origin: Coordinates,
    destination: Coordinates
  ): Promise<RouteSegmentResult> {
    if (mode === 'air') {
      return this.buildAirSegment(origin, destination);
    }

    if (mode === 'sea') {
      return this.buildSeaSegment(origin, destination);
    }

    if (mode === 'rail') {
      return this.buildLandSegment('rail', 'main', origin, destination, 'osrm-rail-approx', 75);
    }

    return this.buildLandSegment('road', 'main', origin, destination, 'osrm-driving', 70);
  }

  private buildAirSegment(origin: Coordinates, destination: Coordinates): RouteSegmentResult {
    const distanceKm = this.haversineDistanceKm(origin, destination);
    const steps = Math.max(24, Math.min(72, Math.ceil(distanceKm / 220)));
    const coordinates = this.compressCoordinates(this.buildGreatCircle(origin, destination, steps), MAX_POINTS_PER_SEGMENT);

    return {
      mode: 'air',
      role: 'main',
      coordinates,
      distanceKm,
      durationMinutes: (distanceKm / 820) * 60 + 35,
      provider: 'great-circle-air',
    };
  }

  private buildSeaSegment(origin: Coordinates, destination: Coordinates): RouteSegmentResult {
    const maritimePath = this.buildMaritimePath(origin, destination);
    const coordinates = this.compressCoordinates(maritimePath, MAX_POINTS_PER_ROUTE);
    const distanceKm = this.pathDistanceKm(coordinates);

    return {
      mode: 'sea',
      role: 'main',
      coordinates,
      distanceKm,
      durationMinutes: (distanceKm / 30) * 60, // ~16 knots
      provider: 'maritime-corridor-graph',
    };
  }

  private async buildLandSegment(
    mode: 'road' | 'rail',
    role: SegmentRole,
    origin: Coordinates,
    destination: Coordinates,
    providerLabel: string,
    fallbackSpeedKmh: number
  ): Promise<RouteSegmentResult> {
    let osrmSegment: { coordinates: Coordinates[]; distanceKm: number; durationMinutes: number | null; provider: string } | null = null;
    if (this.shouldAttemptOsrm(mode, role, origin, destination)) {
      osrmSegment = await this.fetchLandRoute(origin, destination, providerLabel);
    }

    if (osrmSegment) {
      return {
        mode,
        role,
        coordinates: this.compressCoordinates(osrmSegment.coordinates, MAX_POINTS_PER_SEGMENT),
        distanceKm: osrmSegment.distanceKm,
        durationMinutes: osrmSegment.durationMinutes,
        provider: osrmSegment.provider,
      };
    }

    const landCorridorPath = this.buildLandCorridorPath(origin, destination);
    if (landCorridorPath.length >= 2) {
      const corridorDistanceKm = this.pathDistanceKm(landCorridorPath);
      return {
        mode,
        role,
        coordinates: this.compressCoordinates(landCorridorPath, MAX_POINTS_PER_SEGMENT),
        distanceKm: corridorDistanceKm,
        durationMinutes: (corridorDistanceKm / fallbackSpeedKmh) * 60,
        provider: `${providerLabel}-land-corridor`,
      };
    }

    const distanceKm = this.haversineDistanceKm(origin, destination);
    const steps = Math.max(10, Math.min(48, Math.ceil(distanceKm / 80)));
    const coordinates = this.compressCoordinates(this.buildGreatCircle(origin, destination, steps), MAX_POINTS_PER_SEGMENT);

    return {
      mode,
      role,
      coordinates,
      distanceKm,
      durationMinutes: (distanceKm / fallbackSpeedKmh) * 60,
      provider: `${providerLabel}-fallback`,
    };
  }

  private shouldAttemptOsrm(
    mode: 'road' | 'rail',
    role: SegmentRole,
    origin: Coordinates,
    destination: Coordinates
  ): boolean {
    if (!this.isValidCoordinate(origin) || !this.isValidCoordinate(destination)) {
      return false;
    }

    const distanceKm = this.haversineDistanceKm(origin, destination);

    if ((role === 'access' || role === 'egress') && distanceKm > MAX_OSRM_CONNECTOR_DISTANCE_KM) {
      return false;
    }

    if (mode === 'rail' && distanceKm > MAX_OSRM_RAIL_DISTANCE_KM) {
      return false;
    }

    if (mode === 'road' && distanceKm > MAX_OSRM_LAND_DISTANCE_KM) {
      return false;
    }

    return true;
  }

  private isValidCoordinate(value: Coordinates): boolean {
    return (
      Array.isArray(value) &&
      value.length === 2 &&
      Number.isFinite(value[0]) &&
      Number.isFinite(value[1]) &&
      value[0] >= -180 &&
      value[0] <= 180 &&
      value[1] >= -90 &&
      value[1] <= 90
    );
  }

  private async fetchLandRoute(
    origin: Coordinates,
    destination: Coordinates,
    providerLabel: string
  ): Promise<{ coordinates: Coordinates[]; distanceKm: number; durationMinutes: number | null; provider: string } | null> {
    if (!this.isValidCoordinate(origin) || !this.isValidCoordinate(destination)) {
      this.log('OSRM skipped because coordinates were invalid', { providerLabel, origin, destination });
      return null;
    }

    const endpoint =
      `${OSRM_BASE_URL}/route/v1/driving/` +
      `${origin[0]},${origin[1]};${destination[0]},${destination[1]}` +
      '?overview=full&geometries=geojson&steps=false';

    try {
      const response = await this.fetchJson<{
        routes?: Array<{ geometry?: { coordinates?: number[][] }; distance?: number; duration?: number }>;
      }>(endpoint, {
        headers: {
          Accept: 'application/json',
          'User-Agent': NOMINATIM_USER_AGENT,
        },
      });

      const route = response.routes?.[0];
      const coordinates = (route?.geometry?.coordinates || [])
        .filter((coord) => Array.isArray(coord) && coord.length === 2)
        .map((coord) => [Number(coord[0]), Number(coord[1])] as Coordinates)
        .filter((coord) => Number.isFinite(coord[0]) && Number.isFinite(coord[1]));

      if (coordinates.length < 2) {
        return null;
      }

      return {
        coordinates,
        distanceKm: Number(route?.distance || 0) / 1000 || this.pathDistanceKm(coordinates),
        durationMinutes: route?.duration ? Number(route.duration) / 60 : null,
        provider: providerLabel,
      };
    } catch (error) {
      this.log('OSRM routing unavailable, using fallback geometry', {
        message: error instanceof Error ? error.message : String(error),
        providerLabel,
        origin,
        destination,
      });
      return null;
    }
  }

  private buildMaritimePath(origin: Coordinates, destination: Coordinates): Coordinates[] {
    const startNode = this.findNearestMaritimeNode(origin);
    const endNode = this.findNearestMaritimeNode(destination);

    if (!startNode || !endNode) {
      return this.buildGreatCircle(origin, destination, 64);
    }

    const nodePath = this.findShortestMaritimePath(startNode.key, endNode.key);
    if (nodePath.length === 0) {
      return this.buildGreatCircle(origin, destination, 64);
    }

    const waypoints: Coordinates[] = [
      origin,
      ...nodePath.map((nodeKey) => MARITIME_NODES[nodeKey]),
      destination,
    ].filter((coord): coord is Coordinates => Array.isArray(coord) && coord.length === 2);

    const fullPath: Coordinates[] = [];

    for (let index = 0; index < waypoints.length - 1; index += 1) {
      const start = waypoints[index];
      const end = waypoints[index + 1];
      if (!start || !end) {
        continue;
      }

      const distance = this.haversineDistanceKm(start, end);
      const steps = Math.max(10, Math.min(60, Math.ceil(distance / 200)));
      const segment = this.buildGreatCircle(start, end, steps);

      if (index === 0) {
        fullPath.push(...segment);
      } else {
        fullPath.push(...segment.slice(1));
      }
    }

    return fullPath;
  }

  private findNearestMaritimeNode(point: Coordinates): { key: string; coordinates: Coordinates; distanceKm: number } | null {
    let best: { key: string; coordinates: Coordinates; distanceKm: number } | null = null;

    for (const [key, coordinates] of Object.entries(MARITIME_NODES)) {
      const distanceKm = this.haversineDistanceKm(point, coordinates);
      if (!best || distanceKm < best.distanceKm) {
        best = { key, coordinates, distanceKm };
      }
    }

    return best;
  }

  private findShortestMaritimePath(startKey: string, endKey: string): string[] {
    if (!MARITIME_NODES[startKey] || !MARITIME_NODES[endKey]) {
      return [];
    }

    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>(Object.keys(MARITIME_NODES));

    Object.keys(MARITIME_NODES).forEach((node) => {
      distances.set(node, Number.POSITIVE_INFINITY);
      previous.set(node, null);
    });

    distances.set(startKey, 0);

    while (unvisited.size > 0) {
      let currentNode: string | null = null;
      let currentDistance = Number.POSITIVE_INFINITY;

      for (const node of unvisited) {
        const candidateDistance = distances.get(node) ?? Number.POSITIVE_INFINITY;
        if (candidateDistance < currentDistance) {
          currentDistance = candidateDistance;
          currentNode = node;
        }
      }

      if (!currentNode) {
        break;
      }

      unvisited.delete(currentNode);

      if (currentNode === endKey) {
        break;
      }

      const neighbors = this.getMaritimeNeighbors(currentNode);
      for (const neighbor of neighbors) {
        if (!unvisited.has(neighbor)) {
          continue;
        }

        const currentCoordinates = MARITIME_NODES[currentNode];
        const neighborCoordinates = MARITIME_NODES[neighbor];
        if (!currentCoordinates || !neighborCoordinates) {
          continue;
        }

        const edgeWeight = this.haversineDistanceKm(currentCoordinates, neighborCoordinates);
        const alt = (distances.get(currentNode) ?? Number.POSITIVE_INFINITY) + edgeWeight;
        if (alt < (distances.get(neighbor) ?? Number.POSITIVE_INFINITY)) {
          distances.set(neighbor, alt);
          previous.set(neighbor, currentNode);
        }
      }
    }

    const path: string[] = [];
    let cursor: string | null = endKey;

    while (cursor) {
      path.unshift(cursor);
      cursor = previous.get(cursor) || null;
    }

    if (path.length === 0 || path[0] !== startKey) {
      return [];
    }

    return path;
  }

  private getMaritimeNeighbors(nodeKey: string): string[] {
    const neighbors: string[] = [];
    for (const [from, to] of MARITIME_EDGES) {
      if (from === nodeKey) {
        neighbors.push(to);
      } else if (to === nodeKey) {
        neighbors.push(from);
      }
    }
    return neighbors;
  }

  private hasLandCorridorPath(origin: Coordinates, destination: Coordinates): boolean {
    const startNode = this.findNearestLandNode(origin);
    const endNode = this.findNearestLandNode(destination);

    if (!startNode || !endNode) {
      return false;
    }

    if (startNode.distanceKm > MAX_LAND_NODE_ANCHOR_KM || endNode.distanceKm > MAX_LAND_NODE_ANCHOR_KM) {
      return false;
    }

    if (startNode.key === endNode.key) {
      return true;
    }

    const nodePath = this.findShortestLandPath(startNode.key, endNode.key);
    return nodePath.length > 0;
  }

  private buildLandCorridorPath(origin: Coordinates, destination: Coordinates): Coordinates[] {
    const startNode = this.findNearestLandNode(origin);
    const endNode = this.findNearestLandNode(destination);

    if (!startNode || !endNode) {
      return [];
    }

    if (startNode.distanceKm > MAX_LAND_NODE_ANCHOR_KM || endNode.distanceKm > MAX_LAND_NODE_ANCHOR_KM) {
      return [];
    }

    const nodePath = startNode.key === endNode.key
      ? [startNode.key]
      : this.findShortestLandPath(startNode.key, endNode.key);

    if (nodePath.length === 0) {
      return [];
    }

    const waypoints: Coordinates[] = [
      origin,
      ...nodePath.map((nodeKey) => LAND_NODES[nodeKey]),
      destination,
    ].filter((coord): coord is Coordinates => Array.isArray(coord) && coord.length === 2);

    const fullPath: Coordinates[] = [];
    for (let index = 0; index < waypoints.length - 1; index += 1) {
      const start = waypoints[index];
      const end = waypoints[index + 1];
      if (!start || !end) {
        continue;
      }

      const distance = this.haversineDistanceKm(start, end);
      const steps = Math.max(6, Math.min(48, Math.ceil(distance / 160)));
      const segment = this.buildGreatCircle(start, end, steps);
      if (index === 0) {
        fullPath.push(...segment);
      } else {
        fullPath.push(...segment.slice(1));
      }
    }

    if (fullPath.length < 2) {
      return [];
    }

    const directDistance = this.haversineDistanceKm(origin, destination);
    const corridorDistance = this.pathDistanceKm(fullPath);
    const isExcessiveDetour = corridorDistance > (directDistance * 3.2) && (corridorDistance - directDistance) > 5000;

    return isExcessiveDetour ? [] : fullPath;
  }

  private findNearestLandNode(point: Coordinates): { key: string; coordinates: Coordinates; distanceKm: number } | null {
    let best: { key: string; coordinates: Coordinates; distanceKm: number } | null = null;

    for (const [key, coordinates] of Object.entries(LAND_NODES)) {
      const distanceKm = this.haversineDistanceKm(point, coordinates);
      if (!best || distanceKm < best.distanceKm) {
        best = { key, coordinates, distanceKm };
      }
    }

    return best;
  }

  private findShortestLandPath(startKey: string, endKey: string): string[] {
    if (!LAND_NODES[startKey] || !LAND_NODES[endKey]) {
      return [];
    }

    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>(Object.keys(LAND_NODES));

    Object.keys(LAND_NODES).forEach((node) => {
      distances.set(node, Number.POSITIVE_INFINITY);
      previous.set(node, null);
    });

    distances.set(startKey, 0);

    while (unvisited.size > 0) {
      let currentNode: string | null = null;
      let currentDistance = Number.POSITIVE_INFINITY;

      for (const node of unvisited) {
        const candidateDistance = distances.get(node) ?? Number.POSITIVE_INFINITY;
        if (candidateDistance < currentDistance) {
          currentDistance = candidateDistance;
          currentNode = node;
        }
      }

      if (!currentNode) {
        break;
      }

      unvisited.delete(currentNode);

      if (currentNode === endKey) {
        break;
      }

      const neighbors = this.getLandNeighbors(currentNode);
      for (const neighbor of neighbors) {
        if (!unvisited.has(neighbor)) {
          continue;
        }

        const currentCoordinates = LAND_NODES[currentNode];
        const neighborCoordinates = LAND_NODES[neighbor];
        if (!currentCoordinates || !neighborCoordinates) {
          continue;
        }

        const edgeWeight = this.haversineDistanceKm(currentCoordinates, neighborCoordinates);
        const alt = (distances.get(currentNode) ?? Number.POSITIVE_INFINITY) + edgeWeight;
        if (alt < (distances.get(neighbor) ?? Number.POSITIVE_INFINITY)) {
          distances.set(neighbor, alt);
          previous.set(neighbor, currentNode);
        }
      }
    }

    const path: string[] = [];
    let cursor: string | null = endKey;
    while (cursor) {
      path.unshift(cursor);
      cursor = previous.get(cursor) || null;
    }

    if (path.length === 0 || path[0] !== startKey) {
      return [];
    }

    return path;
  }

  private getLandNeighbors(nodeKey: string): string[] {
    const neighbors: string[] = [];
    for (const [from, to] of LAND_EDGES) {
      if (from === nodeKey) {
        neighbors.push(to);
      } else if (to === nodeKey) {
        neighbors.push(from);
      }
    }
    return neighbors;
  }

  private buildGreatCircle(origin: Coordinates, destination: Coordinates, steps: number): Coordinates[] {
    const [lon1, lat1] = origin;
    const [lon2, lat2] = destination;

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;

    const phi1 = toRad(lat1);
    const phi2 = toRad(lat2);
    const lambda1 = toRad(lon1);
    const lambda2 = toRad(lon2);

    const delta = 2 * Math.asin(
      Math.sqrt(
        Math.sin((phi2 - phi1) / 2) ** 2 +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin((lambda2 - lambda1) / 2) ** 2
      )
    );

    if (delta === 0) {
      return [origin, destination];
    }

    const coordinates: Coordinates[] = [];

    for (let i = 0; i <= steps; i += 1) {
      const fraction = i / steps;
      const a = Math.sin((1 - fraction) * delta) / Math.sin(delta);
      const b = Math.sin(fraction * delta) / Math.sin(delta);

      const x = a * Math.cos(phi1) * Math.cos(lambda1) + b * Math.cos(phi2) * Math.cos(lambda2);
      const y = a * Math.cos(phi1) * Math.sin(lambda1) + b * Math.cos(phi2) * Math.sin(lambda2);
      const z = a * Math.sin(phi1) + b * Math.sin(phi2);

      const latitude = toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)));
      const longitude = toDeg(Math.atan2(y, x));
      coordinates.push([longitude, latitude]);
    }

    return coordinates;
  }

  private mergeSegmentCoordinates(segmentCoordinates: Coordinates[][]): Coordinates[] {
    const merged: Coordinates[] = [];

    segmentCoordinates.forEach((coordinates, index) => {
      if (!Array.isArray(coordinates) || coordinates.length === 0) {
        return;
      }

      if (index === 0) {
        merged.push(...coordinates);
      } else {
        merged.push(...coordinates.slice(1));
      }
    });

    return this.compressCoordinates(merged, MAX_POINTS_PER_ROUTE);
  }

  private compressCoordinates(coordinates: Coordinates[], maxPoints: number): Coordinates[] {
    if (coordinates.length <= maxPoints) {
      return coordinates;
    }

    const first = coordinates[0];
    if (!first) {
      return [];
    }

    const compressed: Coordinates[] = [first];
    const usable = coordinates.length - 2;
    const targetMiddlePoints = Math.max(0, maxPoints - 2);
    const stride = usable / Math.max(1, targetMiddlePoints);

    for (let i = 0; i < targetMiddlePoints; i += 1) {
      const index = Math.min(coordinates.length - 2, Math.max(1, Math.round(1 + (i * stride))));
      const point = coordinates[index];
      if (point) {
        compressed.push(point);
      }
    }

    const last = coordinates[coordinates.length - 1];
    if (last) {
      compressed.push(last);
    }

    return compressed;
  }

  private computeRouteRiskScore(
    mode: TransportMode,
    distanceKm: number,
    row: Record<string, unknown>,
    segments: RouteSegmentResult[]
  ): number {
    const explicitScore = Number(this.readField(row, {}, 'route_risk_score'));
    if (Number.isFinite(explicitScore)) {
      return this.clamp(explicitScore, 0, 1);
    }

    const explicitLevel = String(this.readField(row, {}, 'route_risk_level') || '').toLowerCase().trim();
    if (explicitLevel === 'low') return 0.2;
    if (explicitLevel === 'medium') return 0.55;
    if (explicitLevel === 'high') return 0.85;

    const leadTime = Number(this.readField(row, {}, 'lead_time'));
    const normalizedLeadTime = Number.isFinite(leadTime) ? this.clamp(leadTime / 45, 0, 1) : 0.35;

    const baseRiskByMode: Record<TransportMode, number> = {
      sea: 0.42,
      air: 0.48,
      road: 0.3,
      rail: 0.26,
      multimodal: 0.58,
    };

    const distanceFactor = this.clamp(distanceKm / 12000, 0, 1) * 0.33;
    const leadTimeFactor = normalizedLeadTime * 0.18;
    const fallbackFactor = segments.some((segment) => segment.provider.includes('fallback')) ? 0.1 : 0;

    return this.clamp(baseRiskByMode[mode] + distanceFactor + leadTimeFactor + fallbackFactor, 0, 1);
  }

  private getRiskLevelLabel(score: number): 'low' | 'medium' | 'high' {
    if (score <= 0.35) {
      return 'low';
    }
    if (score <= 0.7) {
      return 'medium';
    }
    return 'high';
  }

  private findNearestStaticHub(from: Coordinates, hubs: StaticHub[]): StaticHub | null {
    let nearest: StaticHub | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    hubs.forEach((hub) => {
      const distance = this.haversineDistanceKm(from, hub.coordinates);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = hub;
      }
    });

    return nearest;
  }

  private pathDistanceKm(coordinates: Coordinates[]): number {
    let total = 0;
    for (let i = 0; i < coordinates.length - 1; i += 1) {
      const current = coordinates[i];
      const next = coordinates[i + 1];
      if (!current || !next) {
        continue;
      }
      total += this.haversineDistanceKm(current, next);
    }
    return total;
  }

  private haversineDistanceKm(origin: Coordinates, destination: Coordinates): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const [lon1, lat1] = origin;
    const [lon2, lat2] = destination;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371 * c;
  }

  private roundTo(value: number, precision: number): number {
    const factor = 10 ** precision;
    return Math.round(value * factor) / factor;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private normalizeText(value: string): string {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getFallbackHub(locationInput: string, mode: TransportMode): ResolvedHub {
    const cityFallback = this.matchStaticHub(locationInput, mode) || this.matchStaticHub(locationInput, 'road');
    if (cityFallback) {
      return {
        name: cityFallback.name,
        coordinates: cityFallback.coordinates,
        type: mode === 'air' ? 'airport' : mode === 'sea' ? 'seaport' : 'city_center',
        source: 'fallback',
      };
    }

    const coordinates = this.hashCoordinates(locationInput || `${mode}-fallback`);
    return {
      name: locationInput || `${mode.toUpperCase()} Hub`,
      coordinates,
      type: mode === 'air' ? 'airport' : mode === 'sea' ? 'seaport' : 'city_center',
      source: 'fallback',
    };
  }

  private hashCoordinates(seed: string): Coordinates {
    const chars = seed.split('');
    const hash = chars.reduce((acc, char) => {
      const next = (acc << 5) - acc + char.charCodeAt(0);
      return next & next;
    }, 0);

    const lon = Math.max(-179.9, Math.min(179.9, ((hash % 360) - 180) + (Math.sin(hash) * 0.35)));
    const lat = Math.max(-89.9, Math.min(89.9, ((Math.abs(hash) % 180) - 90) + (Math.cos(hash) * 0.35)));

    return [lon, lat];
  }

  private setLocationCache(cacheKey: string, value: ResolvedHub): void {
    if (this.locationCache.size >= LOCATION_CACHE_MAX_ENTRIES) {
      const firstKey = this.locationCache.keys().next().value;
      if (firstKey) {
        this.locationCache.delete(firstKey);
      }
    }
    this.locationCache.set(cacheKey, value);
  }

  private setEnrichmentCache(cacheKey: string, value: RouteEnrichmentResponse): void {
    if (this.enrichmentCache.size >= ENRICHMENT_CACHE_MAX_ENTRIES) {
      const firstKey = this.enrichmentCache.keys().next().value;
      if (firstKey) {
        this.enrichmentCache.delete(firstKey);
      }
    }

    this.enrichmentCache.set(cacheKey, {
      value: this.deepClone(value),
      expiresAt: Date.now() + ENRICHMENT_CACHE_TTL_MS,
    });
  }

  private evictExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.enrichmentCache.entries()) {
      if (entry.expiresAt <= now) {
        this.enrichmentCache.delete(key);
      }
    }
  }

  private buildRequestCacheKey(rows: Record<string, unknown>[], fieldMappings: Record<string, string>): string {
    const serialized = JSON.stringify({
      schemaVersion: ROUTE_ENRICHMENT_SCHEMA_VERSION,
      rows,
      fieldMappings,
    });
    return crypto.createHash('sha1').update(serialized).digest('hex');
  }

  private deepClone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  private async fetchJson<T>(url: string, options: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ROUTE_HTTP_TIMEOUT_MS);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return await response.json() as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timed out after ${ROUTE_HTTP_TIMEOUT_MS}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const routeEnrichmentService = new RouteEnrichmentService();
