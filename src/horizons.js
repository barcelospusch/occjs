import { requestJson } from "./api.js";
import { OccJSError } from "./errors.js";

const HORIZONS_URL = "https://ssd.jpl.nasa.gov/api/horizons.api";

/**
 * Retrieves a small-body summary by name or designation from JPL Horizons.
 * @param {string} object Name or designation of the small body.
 * @param {Object} [options]
 * @param {"name"|"designation"} [options.by="name"] Lookup mode.
 * @returns {Promise<{result: string, signature: {source: string, version: string}}>}
 */
export async function getHorizonsObject(object, { by = "name" } = {}) {
  return queryHorizons(object, by, { OBJ_DATA: "YES", MAKE_EPHEM: "NO" });
}

async function queryHorizons(object, by, settings) {
  if (typeof object !== "string" || !object.trim() || /[';=\r\n]/.test(object)) {
    throw new TypeError("A valid Horizons object name or designation is required.");
  }
  if (by !== "name" && by !== "designation") {
    throw new TypeError('Horizons lookup mode must be "name" or "designation".');
  }

  const target = object.trim();
  const command = by === "designation" ? `DES=${target};` : `${target};`;
  const params = new URLSearchParams({
    format: "json",
    COMMAND: `'${command}'`,
    ...settings,
  });
  const url = new URL(`${HORIZONS_URL}?${params.toString().replace(/\+/g, "%20")}`);
  const data = await requestJson(url, "JPL Horizons");

  if (data?.error) {
    throw new OccJSError(`JPL Horizons: ${data.error}`, undefined, data);
  }
  if (
    typeof data?.result !== "string" ||
    typeof data.signature?.source !== "string" ||
    typeof data.signature?.version !== "string"
  ) {
    throw new OccJSError("JPL Horizons returned an unexpected response.", undefined, data);
  }
  return data;
}

function calendarTime(value, timeScale) {
  if (typeof value !== "string" && !(value instanceof Date)) {
    throw new TypeError("Horizons times must be Dates or ISO date strings.");
  }
  const explicitZone = /(?:Z|[+-]\d{2}:\d{2})$/i;
  if (timeScale === "TDB" && (value instanceof Date || explicitZone.test(value))) {
    throw new TypeError("TDB times must be ISO calendar strings without a time zone.");
  }
  if (typeof value === "string" &&
      !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/i.test(value)) {
    throw new TypeError("Horizons times must be Dates or ISO date strings.");
  }
  const date = new Date(typeof value === "string" && /t/i.test(value) &&
    !explicitZone.test(value) ? `${value}Z` : value);
  if (!Number.isFinite(date.valueOf())) {
    throw new RangeError("Invalid Horizons date.");
  }
  return date.toISOString().replace("T", " ").slice(0, -1);
}

function timeSettings({ times, start, stop, step }, timeScale) {
  if (times !== undefined) {
    if (!Array.isArray(times) || !times.length ||
        start !== undefined || stop !== undefined || step !== undefined) {
      throw new TypeError("Provide a nonempty list of times or a start, stop and step.");
    }
    return { TLIST: times.map((time) => `'${calendarTime(time, timeScale)}'`).join(" "), TLIST_TYPE: "CAL" };
  }
  const first = calendarTime(start, timeScale);
  const last = calendarTime(stop, timeScale);
  if (first >= last || typeof step !== "string" ||
      !/^[1-9]\d*\s*(?:min|h|d|mo|y)?$/i.test(step.trim())) {
    throw new RangeError("Horizons requires start before stop and a positive step (e.g. '10 min').");
  }
  return { START_TIME: `'${first}'`, STOP_TIME: `'${last}'`, STEP_SIZE: `'${step.trim()}'` };
}

async function getTable(target, options, type, center, settings = {}) {
  const data = await queryHorizons(target, options.by ?? "name", {
    OBJ_DATA: "NO",
    MAKE_EPHEM: "YES",
    EPHEM_TYPE: type,
    CENTER: center,
    CSV_FORMAT: "YES",
    CAL_TYPE: "GREGORIAN",
    ...timeSettings(options, settings.TIME_TYPE),
    ...settings,
  });
  const table = /^\s*\$\$SOE[ \t]*\r?\n([\s\S]*?)^\s*\$\$EOE\b/m.exec(data.result);
  if (!table) {
    throw new OccJSError("Horizons returned no ephemeris table. Check the target and query parameters.", undefined, data);
  }
  const rows = table[1].split(/\r?\n/).filter((line) => line.trim()).map((line) => {
    const fields = line.trim().split(",").map((field) => field.trim());
    if (fields.at(-1) === "") fields.pop();
    return fields;
  });
  return { signature: data.signature, rows };
}

function quantity(value) {
  if (value === "" || value?.toLowerCase() === "n.a.") return null;
  const parsed = Number(value?.replace(/[dD]/g, "E"));
  if (!Number.isFinite(parsed)) {
    throw new OccJSError("Horizons returned an unexpected ephemeris column.", undefined, value);
  }
  return parsed;
}

function observerSettings(site) {
  if (site === undefined) return { center: "500@399", settings: {} };
  const { latitude, longitude, elevationKm = 0 } = site;
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
      !Number.isFinite(longitude) || Math.abs(longitude) > 180 ||
      !Number.isFinite(elevationKm)) {
    throw new RangeError("Horizons requires latitude (-90..90), longitude (-180..180), and finite elevation in km.");
  }
  return {
    center: "coord@399",
    settings: { COORD_TYPE: "GEODETIC", SITE_COORD: `'${longitude},${latitude},${elevationKm}'` },
  };
}

export async function getHorizonsEphemeris(target, options) {
  const { site } = options;
  const { center, settings } = observerSettings(site);
  const { signature, rows } = await getTable(target, options, "OBSERVER", center, {
    ...settings,
    QUANTITIES: site ? "'1,4,8,9,20,23,38'" : "'1,9,20,23,38'",
    ANG_FORMAT: "DEG",
    EXTRA_PREC: "YES",
    RANGE_UNITS: "AU",
    TIME_TYPE: "UT",
    TIME_DIGITS: "FRACSEC",
  });
  return { signature, timeScale: "UT", rows: rows.map((fields) => {
    // Observer CSV includes solar and lunar status columns before the quantities.
    if (fields.length !== (site ? 16 : 12)) {
      throw new OccJSError("Horizons returned an unexpected observer table.", undefined, fields);
    }
    const [calendarDate, , , ra, dec, ...values] = fields;
    const local = site ? values.splice(0, 4) : [];
    const [magnitude, , distance, rangeRate, elongation, , uncertainty] = values;
    return {
      calendarDate,
      raDeg: quantity(ra),
      decDeg: quantity(dec),
      magnitude: quantity(magnitude),
      distanceAu: quantity(distance),
      rangeRateKmPerSec: quantity(rangeRate),
      solarElongationDeg: quantity(elongation),
      pointingUncertainty3SigmaArcsec: quantity(uncertainty),
      ...(site && {
        azimuthDeg: quantity(local[0]),
        altitudeDeg: quantity(local[1]),
        airmass: quantity(local[2]),
      }),
    };
  }) };
}

export async function getHorizonsObservability(prediction, site) {
  if (!site) throw new TypeError("Horizons observability requires an observing site.");
  const designation = prediction.principal_designation || prediction.provisional_designation;
  const target = prediction.number > 0 ? String(prediction.number) : designation || prediction.name;
  const by = prediction.number > 0 || !designation ? "name" : "designation";
  const { signature, timeScale, rows } = await getHorizonsEphemeris(target, {
    by, site, times: [prediction.date_time],
  });
  if (!rows.length) throw new OccJSError("Horizons returned no observation at the requested time.");
  return { signature, timeScale, ...rows[0] };
}

function orbitalCenter(center = "500@10") {
  if (typeof center !== "string" || !/^(?:\d*@)?-?\d+$/.test(center)) {
    throw new TypeError("Horizons requires a numeric center code (e.g. '500@10').");
  }
  return center;
}

export async function getHorizonsOrbit(target, options) {
  const center = orbitalCenter(options.center);
  const { signature, rows } = await getTable(target, options, "ELEMENTS", center, {
    OUT_UNITS: "AU-D", REF_PLANE: "ECLIPTIC", REF_SYSTEM: "ICRF", TIME_TYPE: "TDB",
  });
  return { signature, timeScale: "TDB", center, rows: rows.map(([jd, calendarDate, ...fields]) => {
    const [eccentricity, perihelionAu, inclinationDeg, ascendingNodeDeg, argumentOfPerihelionDeg,
      perihelionJulianDate, meanMotionDegPerDay, meanAnomalyDeg, trueAnomalyDeg,
      semiMajorAxisAu, aphelionAu, periodDays] = fields.map(quantity);
    if (fields.length !== 12) throw new OccJSError("Horizons returned an unexpected orbital elements table.");
    return { julianDate: quantity(jd), calendarDate, eccentricity, perihelionAu, inclinationDeg,
      ascendingNodeDeg, argumentOfPerihelionDeg, perihelionJulianDate, meanMotionDegPerDay,
      meanAnomalyDeg, trueAnomalyDeg, semiMajorAxisAu, aphelionAu, periodDays };
  }) };
}

export async function getHorizonsVectors(target, options) {
  const referencePlane = options.referencePlane ?? "ECLIPTIC";
  if (referencePlane !== "ECLIPTIC" && referencePlane !== "FRAME") {
    throw new TypeError('Horizons vector reference plane must be "ECLIPTIC" or "FRAME".');
  }
  const center = orbitalCenter(options.center);
  const { signature, rows } = await getTable(target, options, "VECTORS", center, {
    OUT_UNITS: "KM-S", REF_PLANE: referencePlane, REF_SYSTEM: "ICRF",
    TIME_TYPE: "TDB", VEC_TABLE: "2", VEC_CORR: "NONE",
  });
  return { signature, timeScale: "TDB", center, referencePlane, rows: rows.map(([jd, calendarDate, ...fields]) => {
    if (fields.length !== 6) throw new OccJSError("Horizons returned an unexpected state vector table.");
    const [x, y, z, vx, vy, vz] = fields.map(quantity);
    return { julianDate: quantity(jd), calendarDate, positionKm: { x, y, z },
      velocityKmPerSec: { x: vx, y: vy, z: vz } };
  }) };
}
