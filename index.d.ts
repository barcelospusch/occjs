export interface PredictionQueryParams {
  startDate?: string | Date;
  endDate?: string | Date;
  date_time_after?: string | Date;
  date_time_before?: string | Date;
  name?: string;
  asteroid?: string;
  number?: number;
  asteroidNumber?: number;
  principal_designation?: string;
  provisional_designation?: string;
  provisionalDesignation?: string;
  magnitude_max?: number;
  maxMagnitude?: number;
  mag_g_max?: number;
  magnitude_min?: number;
  minMagnitude?: number;
  mag_g_min?: number;
  diameter_min?: number;
  minDiameter?: number;
  diameter_max?: number;
  maxDiameter?: number;
  event_duration_min?: number;
  minDuration?: number;
  event_duration_max?: number;
  maxDuration?: number;
  magnitude_drop_min?: number;
  minMagnitudeDrop?: number;
  magnitude_drop_max?: number;
  maxMagnitudeDrop?: number;
  dynclass?: string;
  dynamicalClass?: string;
  base_dynclass?: string;
  baseDynamicalClass?: string;
  nightside?: boolean;
  nighttime?: boolean;
  latitude?: number;
  lat?: number;
  longitude?: number;
  long?: number;
  location_radius?: number;
  radius?: number;
  local_solar_time_after?: string;
  local_solar_time_before?: string;
  closest_approach_uncertainty_km_min?: number;
  closest_approach_uncertainty_km_max?: number;
  closestApproachUncertaintyKmMin?: number;
  closestApproachUncertaintyKmMax?: number;
  jobid?: number;
  hash_id?: string;
  [key: string]: any;
}

export type WeatherSummary = {
  available: false;
  message: string;
  forecastStart: string;
  /** Exclusive UTC upper bound of the forecast window. */
  forecastEnd: string;
  details?: string;
  source: "Open-Meteo";
  reason: "invalid_event_date" | "outside_forecast_range" | "weather_api_error" | "missing_weather_data";
} | {
  available: true;
  source: "Open-Meteo";
  latitude: number;
  longitude: number;
  time: string;
  condition: string;
  weatherCode: number;
  relativeHumidity: number;
};

export interface QueryOptions {
  includeWeather?: boolean;
  latitude?: number;
  longitude?: number;
  limit?: number | "all";
  id?: number | string;
  onProgress?: (progress: {
    page: number;
    totalPages: number;
    fetched: number;
    total: number;
  }) => void;
  signal?: AbortSignal;
}

export interface OccPathCoeff {
  t0: string;
  t1: string;
  nightside?: boolean;
  min_latitude?: number;
  max_latitude?: number;
  min_longitude?: number;
  max_longitude?: number;
  coeff_latitude?: number[];
  coeff_longitude?: number[];
  body_upper_coeff_latitude?: number[];
  body_upper_coeff_longitude?: number[];
  body_lower_coeff_latitude?: number[];
  body_lower_coeff_longitude?: number[];
  ring_upper_coeff_latitude?: number[];
  ring_upper_coeff_longitude?: number[];
  ring_lower_coeff_latitude?: number[];
  ring_lower_coeff_longitude?: number[];
}

export interface OccultationPrediction {
  weather?: WeatherSummary;
  id: number;
  name: string;
  number?: number;
  provisional_designation?: string;
  principal_designation?: string;
  date_time: string;
  gaia_source_id?: number | string;
  ra_star_candidate?: string;
  dec_star_candidate?: string;
  closest_approach?: number;
  position_angle?: number;
  velocity?: number;
  delta?: number;
  g_star?: number;
  long?: number;
  loc_t?: string;
  magnitude_drop?: number;
  apparent_diameter?: number;
  event_duration?: number;
  closest_approach_uncertainty_km?: number;
  occ_path_coeff?: OccPathCoeff | string;
  map_url?: string;
  [key: string]: any;
}

export interface AsteroidData {
  id: number;
  name: string;
  number?: number;
  principal_designation?: string;
  provisional_designation?: string;
  base_dynclass?: string;
  dynclass?: string;
  diameter?: number;
  albedo?: number;
  density?: number;
  [key: string]: any;
}

export interface GeofilterOptions {
  latitude: number;
  longitude: number;
  radius: number;
  nElements?: number;
  checkNighttime?: boolean;
}

export interface GenerateMapOptions {
  path?: string;
  baseUrl?: string;
  onProgress?: (index: number, total: number, item: any) => void;
}

export interface MapResult {
  url: string;
  occultation?: number;
  name?: string;
  date_time?: string;
  filename?: string;
  filesize?: number;
  localPath?: string;
  [key: string]: any;
}

export declare class BaseAPI {
  baseUrl: string;
  endpoint: string;
  pageSize: number;

  constructor(options?: {
    baseUrl?: string;
    endpoint?: string;
    pageSize?: number;
  });

  getData(
    params?: PredictionQueryParams,
    options?: QueryOptions | number | "all",
  ): Promise<any>;

  byName(
    name: string,
    options?: QueryOptions | number | "all",
  ): Promise<any>;

  byNumber(
    number: number,
    options?: QueryOptions | number | "all",
  ): Promise<any>;

  byProvisionalDesignation(
    designation: string,
    options?: QueryOptions | number | "all",
  ): Promise<any>;
}

export declare class Prediction extends BaseAPI {
  constructor(options?: {
    baseUrl?: string;
    endpoint?: string;
    pageSize?: number;
  });

  asteroidsWithPrediction(): Promise<string[]>;
  dynamicalClassesWithPrediction(): Promise<string[]>;
  dynamicalSubclassesWithPrediction(): Promise<string[]>;

  getPrediction(id: number | string, options?: QueryOptions): Promise<OccultationPrediction>;
  getOccultationPaths(id: number | string): Promise<any>;
  getOccultationMap(id: number | string): Promise<MapResult>;

  generateIotaReport(
    idOrPred: number | string | OccultationPrediction,
    options?: IotaReportOptions,
  ): Promise<string>;
  generateCoraReport(
    idOrPred: number | string | OccultationPrediction,
    options?: Record<string, any>,
  ): Promise<string>;
}

export interface IotaReportOptions {
  observerName?: string;
  siteName?: string;
  latitude?: number;
  longitude?: number;
  elevation?: number;
  telescope?: string;
  detector?: string;
  timingSource?: string;
  remarks?: string;
}

export declare class Asteroid extends BaseAPI {
  constructor(options?: {
    baseUrl?: string;
    endpoint?: string;
    pageSize?: number;
  });

  count(): Promise<number>;
  dynamicalClasses(): Promise<string[]>;
  dynamicalSubclasses(): Promise<string[]>;

  withPrediction(name: string): Promise<AsteroidData[]>;

  getPredictionsByName(
    name: string,
    options?: QueryOptions | number | "all",
  ): Promise<OccultationPrediction[] | OccultationPrediction>;

  getPredictionsByNumber(
    number: number,
    options?: QueryOptions | number | "all",
  ): Promise<OccultationPrediction[] | OccultationPrediction>;

  getPredictionsByProvisionalDesignation(
    designation: string,
    options?: QueryOptions | number | "all",
  ): Promise<OccultationPrediction[] | OccultationPrediction>;

  generateIotaReport(
    nameOrAst: string | number | AsteroidData,
    options?: IotaReportOptions,
  ): Promise<string>;
  generateCoraReport(
    nameOrAst: string | number | AsteroidData,
    options?: Record<string, any>,
  ): Promise<string>;
}

export declare class LineASSP {
  prediction: Prediction;
  asteroid: Asteroid;
  constructor(options?: { baseUrl?: string; pageSize?: number });
}

export declare function geofilter(
  data: OccultationPrediction[] | OccultationPrediction,
  options: GeofilterOptions,
): OccultationPrediction[];
export declare function geofilter(
  data: OccultationPrediction[] | OccultationPrediction,
  latitude: number,
  longitude: number,
  radius: number,
  extraOptions?: { nElements?: number; checkNighttime?: boolean },
): OccultationPrediction[];

export declare function generateMap(
  data: any,
  options?: GenerateMapOptions,
): Promise<MapResult | MapResult[]>;

export declare function formatIotaReport(
  data: OccultationPrediction | AsteroidData | any,
  options?: IotaReportOptions,
): string;

export declare function formatCoraReport(
  data: OccultationPrediction | AsteroidData | any,
  options?: Record<string, any>,
): string;

export declare function generateIotaReport(
  target: OccultationPrediction | AsteroidData | string | number,
  options?: IotaReportOptions & { baseUrl?: string },
): Promise<string>;

export declare function generateCoraReport(
  target: OccultationPrediction | AsteroidData | string | number,
  options?: Record<string, any> & { baseUrl?: string },
): Promise<string>;

export declare function getPredictions(
  options?: PredictionQueryParams & QueryOptions,
): Promise<OccultationPrediction[]>;

export declare function getPrediction(
  hashId: string | number,
  options?: QueryOptions,
): Promise<OccultationPrediction>;

export declare function getOccultationPaths(
  hashId: string | number,
): Promise<any>;

export declare function getOccultationMap(
  hashId: string | number,
): Promise<MapResult>;

export declare function polyval(coeffs: number[], x: number): number;
export declare function pathArc(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  earthRadius?: number,
): number;
export declare function isNighttime(
  latitude: number,
  longitude: number,
  dateTime: string | Date,
  radiusKm?: number,
): boolean;
export declare function visibilityFromCoeff(options: {
  latitude: number;
  longitude: number;
  radius: number;
  dateTime?: string | Date;
  occPathCoeff: OccPathCoeff | string;
  nElements?: number;
  checkNighttime?: boolean;
}): boolean;

export declare class OccJSError extends Error {
  status?: number;
  details?: any;
  constructor(message: string, status?: number, details?: any);
}

export declare class InvalidDatetimeFormatError extends OccJSError {
  examples: string[];
  constructor(message?: string);
}
