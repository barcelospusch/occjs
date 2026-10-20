import { Prediction } from "./prediction.js";

const defaultPrediction = new Prediction();

/**
 * Queries occultation predictions with filtering and pagination.
 *
 * @param {Object} [options]
 * @param {number|string} [options.limit=100] - Max results or 'all'.
 * @param {string|Date} [options.startDate] - Start date/time.
 * @param {string|Date} [options.endDate] - End date/time.
 * @param {string} [options.asteroid] - Asteroid name.
 * @param {number} [options.asteroidNumber] - Asteroid number.
 * @param {number} [options.latitude] - Observer latitude for server-side filter.
 * @param {number} [options.longitude] - Observer longitude for server-side filter.
 * @param {number} [options.radius] - Observer radius (km).
 * @param {boolean} [options.nighttime] - Nightside only.
 * @param {boolean} [options.includeWeather=false] - Include local event-hour weather; requires latitude/longitude.
 * @param {AbortSignal} [options.signal] - Cancel the search.
 * @param {Function} [options.onProgress] - Callback for pagination progress.
 * @returns {Promise<Array<Object>>}
 */
export async function getPredictions(options = {}) {
  const { limit = 100, onProgress = null, includeWeather = false, signal, ...filters } = options;

  if (limit !== "all" && (!Number.isSafeInteger(limit) || limit < 1)) {
    throw new RangeError("limit must be a positive integer or 'all'.");
  }

  return defaultPrediction.getData(filters, { limit, onProgress, includeWeather, signal });
}

/**
 * Retrieves details for a single occultation prediction.
 * @param {string|number} hashId
 * @param {Object} [options] - Optional includeWeather, latitude, longitude and signal.
 * @returns {Promise<Object>}
 */
export async function getPrediction(hashId, options = {}) {
  return defaultPrediction.getPrediction(hashId, options);
}

/**
 * Retrieves path coordinates for a prediction.
 * @param {string|number} hashId
 * @returns {Promise<Object>}
 */
export async function getOccultationPaths(hashId) {
  return defaultPrediction.getOccultationPaths(hashId);
}

/**
 * Retrieves or creates an occultation map.
 * @param {string|number} hashId
 * @returns {Promise<Object>}
 */
export async function getOccultationMap(hashId) {
  return defaultPrediction.getOccultationMap(hashId);
}
