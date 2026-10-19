import { BaseAPI, DEFAULT_BASE_URL, DEFAULT_PAGE_SIZE } from "./base.js";
import { OccJSError } from "./errors.js";

/**
 * Prediction API class for querying stellar occultations.
 * Direct equivalent of Prediction class in Python's lineaSSP package.
 */
export class Prediction extends BaseAPI {
  /**
   * @param {Object} [options]
   * @param {string} [options.baseUrl] - Base URL of the API.
   * @param {string} [options.endpoint] - API endpoint path. Defaults to '/api/occultations'.
   * @param {number} [options.pageSize] - Default page size.
   */
  constructor({
    baseUrl = DEFAULT_BASE_URL,
    endpoint = "/api/occultations",
    pageSize = DEFAULT_PAGE_SIZE,
  } = {}) {
    super({ baseUrl, endpoint, pageSize });
  }

  /**
   * Helper to fetch data from sub-endpoints of the prediction API.
   * @param {string} subEndpoint
   * @param {string|number} [id]
   * @param {Object} [params]
   * @returns {Promise<any>}
   */
  async _fetchEndpoint(subEndpoint, id = null, params = {}) {
    const cleanEndpoint = this.endpoint.replace(/^\/+|\/+$/g, "");
    let path = cleanEndpoint;
    if (id !== null && id !== undefined) {
      path = `${path}/${encodeURIComponent(String(id))}`;
    }
    path = `${path}/${subEndpoint}/`;

    const url = new URL(path, `${this.baseUrl}/`);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
      }
    }

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    }).catch((err) => {
      throw new OccJSError(`Could not connect to LineA: ${err.message}`);
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw new OccJSError(
        `LineA API returned HTTP ${response.status}`,
        response.status,
        details,
      );
    }

    return response.json();
  }

  /**
   * Fetches the list of asteroids with occultation predictions in the database.
   * Corresponds to `asteroids_with_prediction()` in Python.
   * @returns {Promise<Array<string>|Object>}
   */
  async asteroidsWithPrediction() {
    const res = await this._fetchEndpoint("asteroids_with_prediction");
    return res?.results ?? res;
  }

  /**
   * Fetches base dynamical classes of asteroids with prediction.
   * Corresponds to `dynamical_classes_with_prediction()` in Python.
   * @returns {Promise<Array<string>|Object>}
   */
  async dynamicalClassesWithPrediction() {
    const res = await this._fetchEndpoint("base_dynclass_with_prediction");
    return res?.results ?? res;
  }

  /**
   * Fetches dynamical subclasses of asteroids with prediction.
   * Corresponds to `dynamical_subclasses_with_prediction()` in Python.
   * @returns {Promise<Array<string>|Object>}
   */
  async dynamicalSubclassesWithPrediction() {
    const res = await this._fetchEndpoint("dynclass_with_prediction");
    return res?.results ?? res;
  }

  /**
   * Retrieves full details for a single occultation prediction by ID.
   * @param {number|string} id - Occultation ID or hash ID.
   * @returns {Promise<Object>}
   */
  async getPrediction(id) {
    if (!id) {
      throw new TypeError("A valid prediction ID or hash_id is required.");
    }
    return this.getData({}, { id });
  }

  /**
   * Retrieves occultation paths for a prediction.
   * @param {number|string} id
   * @returns {Promise<Object>}
   */
  async getOccultationPaths(id) {
    if (!id) {
      throw new TypeError("A valid prediction ID or hash_id is required.");
    }
    return this._fetchEndpoint("get_occultation_paths", id);
  }

  /**
   * Retrieves or triggers generation of the occultation map.
   * @param {number|string} id
   * @returns {Promise<Object>}
   */
  async getOccultationMap(id) {
    if (!id) {
      throw new TypeError("A valid prediction ID or hash_id is required.");
    }
    return this._fetchEndpoint("get_or_create_map", id);
  }

  /**
   * Generates an IOTA formatted report for a prediction.
   * @param {number|string|Object} idOrPred - Prediction object or ID.
   * @param {Object} [options]
   * @returns {Promise<string>}
   */
  async generateIotaReport(idOrPred, options = {}) {
    const { formatIotaReport } = await import("./reports.js");
    const pred =
      typeof idOrPred === "object" && idOrPred !== null
        ? idOrPred
        : await this.getPrediction(idOrPred);
    return formatIotaReport(pred, options);
  }

  /**
   * Generates a CORA formatted report for a prediction.
   * @param {number|string|Object} idOrPred - Prediction object or ID.
   * @param {Object} [options]
   * @returns {Promise<string>}
   */
  async generateCoraReport(idOrPred, options = {}) {
    const { formatCoraReport } = await import("./reports.js");
    const pred =
      typeof idOrPred === "object" && idOrPred !== null
        ? idOrPred
        : await this.getPrediction(idOrPred);
    return formatCoraReport(pred, options);
  }
}
