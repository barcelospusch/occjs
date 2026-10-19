import { OccJSError, InvalidDatetimeFormatError } from "./errors.js";

export const DEFAULT_BASE_URL = "https://solarsystem.linea.org.br";
export const DEFAULT_PAGE_SIZE = 1000;

const PARAMETER_ALIASES = {
  startDate: "date_time_after",
  endDate: "date_time_before",
  asteroid: "name",
  asteroidNumber: "number",
  provisionalDesignation: "principal_designation",
  provisional_designation: "principal_designation",
  maxMagnitude: "magnitude_max",
  minMagnitude: "magnitude_min",
  mag_g_max: "magnitude_max",
  mag_g_min: "magnitude_min",
  minDiameter: "diameter_min",
  maxDiameter: "diameter_max",
  minDuration: "event_duration_min",
  maxDuration: "event_duration_max",
  minMagnitudeDrop: "magnitude_drop_min",
  maxMagnitudeDrop: "magnitude_drop_max",
  dynamicalClass: "dynclass",
  baseDynamicalClass: "base_dynclass",
  nighttime: "nightside",
  radius: "location_radius",
  lat: "latitude",
  long: "longitude",
  closestApproachUncertaintyKmMin: "closest_approach_uncertainty_km_min",
  closestApproachUncertaintyKmMax: "closest_approach_uncertainty_km_max",
};

const ISO_8601_REGEX =
  /^\d{4}-\d{2}-\d{2}$|^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}$|^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;

/**
 * BaseAPI class for interacting with the LineA Solar System Portal API.
 * Mirrors the BaseAPI implementation of the lineaSSP Python package.
 */
export class BaseAPI {
  /**
   * @param {Object} [options]
   * @param {string} [options.baseUrl] - Base URL of the API.
   * @param {string} [options.endpoint] - API endpoint path.
   * @param {number} [options.pageSize] - Default page size for pagination.
   */
  constructor({
    baseUrl = DEFAULT_BASE_URL,
    endpoint = "",
    pageSize = DEFAULT_PAGE_SIZE,
  } = {}) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.endpoint = endpoint;
    this.pageSize = pageSize;
  }

  /**
   * Validates date/datetime strings against accepted ISO-8601 formats.
   * @param {string|Date} dateValue
   * @returns {string}
   */
  _validateDatetime(dateValue) {
    if (dateValue instanceof Date) {
      return dateValue.toISOString();
    }

    if (typeof dateValue === "string" && ISO_8601_REGEX.test(dateValue.trim())) {
      return dateValue.trim();
    }

    throw new InvalidDatetimeFormatError();
  }

  /**
   * Parses and normalizes query parameters matching LineA standards.
   * @param {Object} params
   * @returns {Object}
   */
  _parseValues(params = {}) {
    const parsed = {};

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }

      const normalizedKey = PARAMETER_ALIASES[key] ?? key;
      parsed[normalizedKey] = value;
    }

    if (typeof parsed.name === "string") {
      const trimmed = parsed.name.trim();
      const segments = trimmed.split(/\s+/);
      if (segments.length === 1) {
        parsed.name =
          trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
      } else {
        parsed.name = segments.map((s) => s.toUpperCase()).join(" ");
      }
    }

    if (typeof parsed.principal_designation === "string") {
      parsed.principal_designation = parsed.principal_designation
        .trim()
        .toUpperCase();
    }

    if (parsed.date_time_after !== undefined) {
      parsed.date_time_after = this._validateDatetime(parsed.date_time_after);
    }

    if (parsed.date_time_before !== undefined) {
      parsed.date_time_before = this._validateDatetime(parsed.date_time_before);
    }

    return parsed;
  }

  /**
   * Renames a key in an object.
   * @param {Object} data
   * @param {string} oldKey
   * @param {string} newKey
   * @returns {Object}
   */
  _replaceKey(data, oldKey, newKey) {
    if (!data || typeof data !== "object") return data;
    if (!(oldKey in data)) return data;

    const copy = { ...data };
    copy[newKey] = copy[oldKey];
    delete copy[oldKey];
    return copy;
  }

  /**
   * Performs a single HTTP GET request to the API.
   * @param {Object} params
   * @param {number|string} [id]
   * @param {AbortSignal} [signal]
   * @returns {Promise<Object>}
   */
  async _fetchData(params = {}, id = null, signal = null) {
    const cleanEndpoint = this.endpoint.replace(/^\/+|\/+$/g, "");
    let path = cleanEndpoint;

    if (id !== null && id !== undefined) {
      path = `${cleanEndpoint}/${encodeURIComponent(String(id))}/`;
    } else if (path) {
      path = `${path}/`;
    }

    const url = new URL(path, `${this.baseUrl}/`);

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }
      url.searchParams.set(
        key,
        Array.isArray(value) ? value.join(",") : String(value),
      );
    }

    let response;
    try {
      response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        signal,
      });
    } catch (error) {
      throw new OccJSError(
        `Could not connect to the LineA API: ${error.message}`,
      );
    }

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw new OccJSError(
        `LineA API returned HTTP ${response.status}`,
        response.status,
        details,
      );
    }

    try {
      return await response.json();
    } catch {
      throw new OccJSError(
        "LineA API returned an invalid JSON response.",
        response.status,
      );
    }
  }

  /**
   * Fetches data with automatic pagination support.
   * @param {Object} [params] - Query parameters.
   * @param {Object|number|string} [options] - Options or limit.
   * @param {number|string} [options.limit] - Max results or 'all'. Defaults to pageSize.
   * @param {number|string} [options.id] - Single item ID.
   * @param {Function} [options.onProgress] - Callback for progress reporting.
   * @param {AbortSignal} [options.signal] - AbortController signal.
   * @returns {Promise<Array<Object>|Object>}
   */
  async getData(params = {}, options = {}) {
    let opts = options;
    if (typeof options === "number" || options === "all") {
      opts = { limit: options };
    }

    const {
      limit: inputLimit = null,
      id = null,
      onProgress = null,
      signal = null,
    } = opts;

    const parsedParams = this._parseValues(params);

    // If fetching a specific ID
    if (id !== null && id !== undefined) {
      const result = await this._fetchData(parsedParams, id, signal);
      const item = this._replaceKey(
        result,
        "principal_designation",
        "provisional_designation",
      );
      return item;
    }

    const effectivePageSize = this.pageSize;
    parsedParams.pageSize = effectivePageSize;
    parsedParams.page = 1;

    const firstPage = await this._fetchData(parsedParams, null, signal);
    const totalCount =
      typeof firstPage.count === "number"
        ? firstPage.count
        : Array.isArray(firstPage.results)
          ? firstPage.results.length
          : Array.isArray(firstPage)
            ? firstPage.length
            : 0;

    let targetLimit =
      inputLimit === null ? effectivePageSize : inputLimit;
    if (targetLimit === "all") {
      targetLimit = totalCount;
    }

    const initialResults = Array.isArray(firstPage.results)
      ? firstPage.results
      : Array.isArray(firstPage)
        ? firstPage
        : [];

    if (totalCount === 0 || initialResults.length === 0) {
      return [];
    }

    let output = [...initialResults];
    const nPages =
      targetLimit > 0
        ? Math.ceil(Math.min(targetLimit, totalCount) / effectivePageSize)
        : 1;

    if (onProgress) {
      onProgress({
        page: 1,
        totalPages: nPages,
        fetched: Math.min(output.length, targetLimit),
        total: totalCount,
      });
    }

    // Fetch subsequent pages if needed
    for (let page = 2; page <= nPages; page++) {
      if (output.length >= targetLimit) break;

      parsedParams.page = page;
      const nextPage = await this._fetchData(parsedParams, null, signal);
      const nextResults = Array.isArray(nextPage.results)
        ? nextPage.results
        : Array.isArray(nextPage)
          ? nextPage
          : [];

      if (nextResults.length === 0) break;

      output.push(...nextResults);

      if (onProgress) {
        onProgress({
          page,
          totalPages: nPages,
          fetched: Math.min(output.length, targetLimit),
          total: totalCount,
        });
      }
    }

    const sliced =
      typeof targetLimit === "number" ? output.slice(0, targetLimit) : output;

    return sliced.map((item) =>
      this._replaceKey(
        item,
        "principal_designation",
        "provisional_designation",
      ),
    );
  }

  /**
   * Fetches entries by asteroid name.
   * Returns a single dictionary if 1 result, otherwise a list of dictionaries (matching lineaSSP).
   * @param {string} name
   * @param {Object|number|string} [options]
   * @returns {Promise<Object|Array<Object>>}
   */
  async byName(name, options = { limit: "all" }) {
    if (typeof name !== "string") {
      throw new TypeError(
        `The name must be a string, got ${typeof name} instead.`,
      );
    }

    const opts = typeof options === "object" ? options : { limit: options };
    const result = await this.getData({ name }, opts);

    if (Array.isArray(result) && result.length === 1) {
      return result[0];
    }
    return result;
  }

  /**
   * Fetches entries by asteroid number.
   * @param {number} number
   * @param {Object|number|string} [options]
   * @returns {Promise<Object|Array<Object>>}
   */
  async byNumber(number, options = { limit: "all" }) {
    if (typeof number !== "number" || Number.isNaN(number)) {
      throw new TypeError(
        `The number must be a number, got ${typeof number} instead.`,
      );
    }

    const opts = typeof options === "object" ? options : { limit: options };
    const result = await this.getData({ number }, opts);

    if (Array.isArray(result) && result.length === 1) {
      return result[0];
    }
    return result;
  }

  /**
   * Fetches entries by provisional designation.
   * @param {string} provisionalDesignation
   * @param {Object|number|string} [options]
   * @returns {Promise<Object|Array<Object>>}
   */
  async byProvisionalDesignation(
    provisionalDesignation,
    options = { limit: "all" },
  ) {
    if (typeof provisionalDesignation !== "string") {
      throw new TypeError(
        `The provisional_designation must be a string, got ${typeof provisionalDesignation} instead.`,
      );
    }

    const opts = typeof options === "object" ? options : { limit: options };
    const result = await this.getData(
      { principal_designation: provisionalDesignation },
      opts,
    );

    if (Array.isArray(result) && result.length === 1) {
      return result[0];
    }
    return result;
  }
}
