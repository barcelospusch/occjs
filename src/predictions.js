import { request } from "./api.js";

const PARAMETER_NAMES = {
  startDate: "date_time_after",
  endDate: "date_time_before",
  asteroid: "name",
  asteroidNumber: "number",
  maxMagnitude: "magnitude_max",
  minMagnitude: "magnitude_min",
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
};

function normalizeParams(options) {
  const params = {};

  for (const [key, value] of Object.entries(options)) {
    params[PARAMETER_NAMES[key] ?? key] = value;
  }

  return params;
}

function extractResults(response) {
  if (Array.isArray(response)) return response;

  const data = response?.results ?? response?.data;

  if (Array.isArray(data)) return data;

  throw new TypeError("Unexpected occultation list response from LineA.");
}

function validateId(hashId) {
  if (typeof hashId !== "string" || !hashId.trim()) {
    throw new TypeError("A valid occultation hash_id is required.");
  }

  return encodeURIComponent(hashId);
}

export async function getPredictions(options = {}) {
  const { limit = 100, ...filters } = options;

  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new RangeError("limit must be a positive integer.");
  }

  const params = normalizeParams(filters);
  params.pageSize = limit;

  const response = await request("occultations/", params);

  return extractResults(response).slice(0, limit);
}

export async function getPrediction(hashId) {
  const id = validateId(hashId);

  return request(`occultations/${id}/`);
}

export async function getOccultationPaths(hashId) {
  const id = validateId(hashId);

  return request(`occultations/${id}/get_occultation_paths/`);
}

export async function getOccultationMap(hashId) {
  const id = validateId(hashId);

  return request(`occultations/${id}/get_or_create_map/`);
}
