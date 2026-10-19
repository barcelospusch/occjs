import { BaseAPI, DEFAULT_BASE_URL, DEFAULT_PAGE_SIZE } from "./base.js";
import { Prediction } from "./prediction.js";
import { OccJSError } from "./errors.js";

/**
 * Asteroid API class for querying solar system small bodies and their properties.
 * Direct equivalent of Asteroid class in Python's lineaSSP package.
 */
export class Asteroid extends BaseAPI {
  /**
   * @param {Object} [options]
   * @param {string} [options.baseUrl] - Base URL of the API.
   * @param {string} [options.endpoint] - API endpoint path. Defaults to '/api/asteroids'.
   * @param {number} [options.pageSize] - Default page size.
   */
  constructor({
    baseUrl = DEFAULT_BASE_URL,
    endpoint = "/api/asteroids",
    pageSize = DEFAULT_PAGE_SIZE,
  } = {}) {
    super({ baseUrl, endpoint, pageSize });
  }

  /**
   * Helper to fetch data from sub-endpoints of the asteroid API.
   * @param {string} subEndpoint
   * @param {string} [name]
   * @returns {Promise<any>}
   */
  async _fetchEndpoint(subEndpoint, name = null) {
    const cleanEndpoint = this.endpoint.replace(/^\/+|\/+$/g, "");
    let path = `${cleanEndpoint}/${subEndpoint}/`;

    const url = new URL(path, `${this.baseUrl}/`);
    if (name) {
      url.searchParams.set("name", name);
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
   * Retrieves the count of asteroids registered in the database.
   * @returns {Promise<number>}
   */
  async count() {
    const res = await this._fetchEndpoint("count");
    return res?.count ?? 0;
  }

  /**
   * Fetches the list of base dynamical classes registered in the database.
   * @returns {Promise<Array<string>>}
   */
  async dynamicalClasses() {
    const res = await this._fetchEndpoint("base_dynclasses");
    const results = res?.results ?? res;
    if (Array.isArray(results)) {
      return [...results].sort();
    }
    return results;
  }

  /**
   * Fetches the list of dynamical subclasses registered in the database.
   * @returns {Promise<Array<string>>}
   */
  async dynamicalSubclasses() {
    const res = await this._fetchEndpoint("dynclasses");
    const results = res?.results ?? res;
    if (Array.isArray(results)) {
      return [...results].sort();
    }
    return results;
  }

  /**
   * Fetches registered asteroid details with prediction by asteroid name.
   * @param {string} name
   * @returns {Promise<Object>}
   */
  async withPrediction(name) {
    if (!name || typeof name !== "string") {
      throw new TypeError("A valid asteroid name is required for with_prediction.");
    }
    const res = await this._fetchEndpoint("with_prediction", name);
    return res?.results ?? res;
  }

  /**
   * Queries occultation predictions for an asteroid by name.
   * Equivalent to `asteroid_api.get_predictions_by_name()` in Python.
   * @param {string} name
   * @param {Object|number|string} [options]
   * @returns {Promise<Object|Array<Object>>}
   */
  async getPredictionsByName(name, options = { limit: "all" }) {
    const predictionApi = new Prediction({ baseUrl: this.baseUrl });
    return predictionApi.byName(name, options);
  }

  /**
   * Queries occultation predictions for an asteroid by number.
   * @param {number} number
   * @param {Object|number|string} [options]
   * @returns {Promise<Object|Array<Object>>}
   */
  async getPredictionsByNumber(number, options = { limit: "all" }) {
    const predictionApi = new Prediction({ baseUrl: this.baseUrl });
    return predictionApi.byNumber(number, options);
  }

  /**
   * Queries occultation predictions for an asteroid by provisional designation.
   * @param {string} provisionalDesignation
   * @param {Object|number|string} [options]
   * @returns {Promise<Object|Array<Object>>}
   */
  async getPredictionsByProvisionalDesignation(
    provisionalDesignation,
    options = { limit: "all" },
  ) {
    const predictionApi = new Prediction({ baseUrl: this.baseUrl });
    return predictionApi.byProvisionalDesignation(
      provisionalDesignation,
      options,
    );
  }

  /**
   * Generates an IOTA formatted report for an asteroid.
   * @param {string|number|Object} nameOrAst - Asteroid name, number, or object.
   * @param {Object} [options]
   * @returns {Promise<string>}
   */
  async generateIotaReport(nameOrAst, options = {}) {
    const { formatIotaReport } = await import("./reports.js");
    const ast =
      typeof nameOrAst === "object" && nameOrAst !== null
        ? nameOrAst
        : typeof nameOrAst === "number"
          ? await this.byNumber(nameOrAst)
          : await this.byName(nameOrAst);
    return formatIotaReport(ast, options);
  }

  /**
   * Generates a CORA formatted report for an asteroid.
   * @param {string|number|Object} nameOrAst - Asteroid name, number, or object.
   * @param {Object} [options]
   * @returns {Promise<string>}
   */
  async generateCoraReport(nameOrAst, options = {}) {
    const { formatCoraReport } = await import("./reports.js");
    const ast =
      typeof nameOrAst === "object" && nameOrAst !== null
        ? nameOrAst
        : typeof nameOrAst === "number"
          ? await this.byNumber(nameOrAst)
          : await this.byName(nameOrAst);
    return formatCoraReport(ast, options);
  }
}
