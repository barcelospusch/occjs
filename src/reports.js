import { Prediction } from "./prediction.js";
import { Asteroid } from "./asteroid.js";

/**
 * Formats a coordinate angle to degrees, minutes, seconds string.
 * @param {number} deg
 * @param {boolean} isLat
 * @returns {string}
 */
function formatDms(deg, isLat = false) {
  if (deg === null || deg === undefined || Number.isNaN(deg)) return "N/D";
  const sign = deg < 0 ? "-" : "+";
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const minFloat = (abs - d) * 60;
  const m = Math.floor(minFloat);
  const s = (minFloat - m) * 60;
  return `${sign}${String(d).padStart(2, "0")}° ${String(m).padStart(2, "0")}' ${s.toFixed(2).padStart(5, "0")}"`;
}

/**
 * Formats Right Ascension to hours, minutes, seconds string.
 * @param {number} deg
 * @returns {string}
 */
function formatHms(deg) {
  if (deg === null || deg === undefined || Number.isNaN(deg)) return "N/D";
  let hours = (deg / 15) % 24;
  if (hours < 0) hours += 24;
  const h = Math.floor(hours);
  const minFloat = (hours - h) * 60;
  const m = Math.floor(minFloat);
  const s = (minFloat - m) * 60;
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${s.toFixed(3).padStart(6, "0")}s`;
}

/**
 * Formats an ISO datetime string into UTC format "YYYY-MM-DD HH:mm:ss UTC".
 * @param {string|Date} dt
 * @returns {string}
 */
function formatUtcDateTime(dt) {
  if (!dt) return "N/D";
  try {
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return String(dt);
    return d.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
  } catch {
    return String(dt);
  }
}

/**
 * Determines whether a data object represents an occultation prediction or an asteroid.
 * @param {Object} data
 * @returns {"prediction"|"asteroid"}
 */
function identifyDataType(data) {
  if (!data || typeof data !== "object") return "prediction";
  if (data.date_time || data.ra_star_candidate || data.g_star || data.magnitude_drop) {
    return "prediction";
  }
  return "asteroid";
}

/**
 * Generates an IOTA formatted report for an occultation prediction.
 * @param {Object} pred
 * @param {Object} options
 * @returns {string}
 */
function formatIotaPrediction(pred, options = {}) {
  const {
    observerName = null,
    siteName = null,
    latitude = null,
    longitude = null,
    elevation = null,
    telescope = null,
    detector = null,
    timingSource = null,
    remarks = null,
  } = options;

  const name = pred.name || "Unknown";
  const num = pred.number ? `(${pred.number})` : "";
  const prov = pred.provisional_designation || pred.principal_designation || "";
  const objNameStr = [num, name, prov ? `[${prov}]` : ""].filter(Boolean).join(" ");

  const dateUtc = formatUtcDateTime(pred.date_time);
  const dynClass = [pred.base_dynclass, pred.dynclass]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(" / ") || "N/D";

  const raStr = pred.ra_star_candidate || (pred.ra_star_deg !== undefined ? formatHms(pred.ra_star_deg) : "N/D");
  const decStr = pred.dec_star_candidate || (pred.dec_star_deg !== undefined ? formatDms(pred.dec_star_deg, true) : "N/D");

  const durationStr = pred.event_duration ? `${pred.event_duration.toFixed(2)} s` : "N/D";
  const magDropStr = pred.magnitude_drop ? `${pred.magnitude_drop.toFixed(2)} mag` : "N/D";
  const starG = pred.g_star !== undefined && pred.g_star !== null ? pred.g_star.toFixed(2) : "N/D";
  const objMag = pred.apparent_magnitude !== undefined && pred.apparent_magnitude !== null ? pred.apparent_magnitude.toFixed(2) : "N/D";
  const caStr = pred.closest_approach !== undefined && pred.closest_approach !== null ? `${pred.closest_approach.toFixed(3)}″` : "N/D";
  const paStr = pred.position_angle !== undefined && pred.position_angle !== null ? `${pred.position_angle.toFixed(1)}°` : "N/D";
  const velStr = pred.velocity !== undefined && pred.velocity !== null ? `${pred.velocity.toFixed(2)} km/s` : "N/D";
  const distStr = pred.delta !== undefined && pred.delta !== null ? `${pred.delta.toFixed(3)} AU` : "N/D";
  const diaStr = pred.diameter !== undefined && pred.diameter !== null ? `${pred.diameter.toFixed(1)} km` : "N/D";
  const uncKm = pred.closest_approach_uncertainty_km !== undefined && pred.closest_approach_uncertainty_km !== null
    ? `±${pred.closest_approach_uncertainty_km.toFixed(1)} km`
    : "N/D";

  const lines = [
    "================================================================================",
    "           INTERNATIONAL OCCULTATION TIMING ASSOCIATION (IOTA)                  ",
    "                     ASTEROIDAL OCCULTATION BULLETIN                            ",
    "================================================================================",
    "",
    "EVENT IDENTIFICATION",
    "--------------------------------------------------------------------------------",
    `Event ID             : ${pred.id || "N/D"}`,
    `Predicted Epoch (UTC): ${dateUtc}`,
    `Target Object        : ${objNameStr}`,
    `Dynamical Class      : ${dynClass}`,
    "",
    "TARGET STAR DATA",
    "--------------------------------------------------------------------------------",
    `Gaia Source ID       : ${pred.gaia_source_id || "N/D"}`,
    `RA (J2000 / ICRF)    : ${raStr}`,
    `Dec (J2000 / ICRF)   : ${decStr}`,
    `Star Magnitude (G)   : ${starG} (Gaia DR3)`,
    `Star Infrared Mags   : J = ${pred.j_star ?? "N/D"} | H = ${pred.h_star ?? "N/D"} | K = ${pred.k_star ?? "N/D"}`,
    "",
    "OCCULTING BODY PARAMETERS",
    "--------------------------------------------------------------------------------",
    `Object Name / Number : ${objNameStr}`,
    `Estimated Diameter   : ${diaStr}`,
    `Apparent Magnitude   : V ≈ ${objMag}`,
    `Geocentric Distance  : Δ = ${distStr}`,
    "",
    "OCCULTATION PREDICTION GEOMETRY",
    "--------------------------------------------------------------------------------",
    `Geocentric C.A.      : ${caStr}`,
    `Position Angle (P.A.): ${paStr}`,
    `Shadow Velocity      : ${velStr}`,
    `Maximum Duration     : ${durationStr}`,
    `Expected Mag Drop (Δ): ${magDropStr}`,
    `C.A. Uncertainty     : ${uncKm}`,
    "",
    "OBSERVATION CONDITIONS",
    "--------------------------------------------------------------------------------",
    `Sun Elongation       : ${pred.sun_elongation ? pred.sun_elongation.toFixed(1) + "°" : "N/D"}`,
    `Moon Separation      : ${pred.moon_separation ? pred.moon_separation.toFixed(1) + "°" : "N/D"}`,
    `Moon Illumination    : ${pred.moon_illuminated_fraction ? (pred.moon_illuminated_fraction * 100).toFixed(1) + "%" : "N/D"}`,
    `Nightside Event      : ${pred.nightside || pred.occ_path_is_nightside ? "Yes" : "Daylight / Twilight"}`,
  ];

  if (pred.occ_path_coeff && typeof pred.occ_path_coeff === "object") {
    lines.push(
      "",
      "SHADOW GROUND TRACK WINDOW",
      "--------------------------------------------------------------------------------",
      `Track Start (t0)     : ${formatUtcDateTime(pred.occ_path_coeff.t0)}`,
      `Track End (t1)       : ${formatUtcDateTime(pred.occ_path_coeff.t1)}`,
      `Latitude Span        : ${pred.occ_path_coeff.min_latitude?.toFixed(2)}° to ${pred.occ_path_coeff.max_latitude?.toFixed(2)}°`,
      `Longitude Span       : ${pred.occ_path_coeff.min_longitude?.toFixed(2)}° to ${pred.occ_path_coeff.max_longitude?.toFixed(2)}°`,
    );
  }

  // Observer reporting sheet template if observer info was passed
  if (observerName || siteName || latitude !== null || longitude !== null) {
    lines.push(
      "",
      "OBSERVER STATION REPORT DATA (IOTA FEEDER)",
      "--------------------------------------------------------------------------------",
      `Observer Name        : ${observerName || "________________________"}`,
      `Observing Station    : ${siteName || "________________________"}`,
      `Station Latitude     : ${latitude !== null && latitude !== undefined ? latitude : "________________"}`,
      `Station Longitude    : ${longitude !== null && longitude !== undefined ? longitude : "________________"}`,
      `Elevation (WGS84)    : ${elevation !== null && elevation !== undefined ? elevation + " m" : "__________"}`,
      `Optical Equipment    : ${telescope || "________________________"}`,
      `Detector / Camera    : ${detector || "________________________"}`,
      `Timing System / GPS  : ${timingSource || "GPS / VTI"}`,
      `Event Observed       : [ ] Positive (Occultation)  [ ] Negative (Miss)  [ ] Clouded out`,
      `Disappearance (D) UTC: ____:____:____.____ ± _____ s`,
      `Reappearance (R) UTC : ____:____:____.____ ± _____ s`,
      `Observer Remarks     : ${remarks || ""}`,
    );
  }

  lines.push(
    "================================================================================",
  );

  return lines.join("\n");
}

/**
 * Generates an IOTA formatted report for an asteroid body.
 * @param {Object} ast
 * @returns {string}
 */
function formatIotaAsteroid(ast) {
  const name = ast.name || "Unknown";
  const num = ast.number ? `(${ast.number})` : "";
  const prov = ast.provisional_designation || ast.principal_designation || "";
  const titleStr = [num, name, prov ? `[${prov}]` : ""].filter(Boolean).join(" ");

  const lines = [
    "================================================================================",
    "           INTERNATIONAL OCCULTATION TIMING ASSOCIATION (IOTA)                  ",
    "                     ASTEROID TARGET PROFILE BULLETIN                           ",
    "================================================================================",
    "",
    "IDENTIFICATION & CLASSIFICATION",
    "--------------------------------------------------------------------------------",
    `Target Designation   : ${titleStr}`,
    `Asteroid Number      : ${ast.number || "Unnumbered"}`,
    `Base Dynamical Class : ${ast.base_dynclass || "N/D"}`,
    `Dynamical Subclass   : ${ast.dynclass || "N/D"}`,
    `Astorb Classification: ${ast.astorb_dynbaseclass || "N/D"} (${ast.astorb_dynsubclass || "N/D"})`,
    `Hazard / MPC Status  : PHA = ${ast.pha_flag ? "YES" : "No"} | Critical = ${ast.mpc_critical_list ? "YES" : "No"}`,
    "",
    "PHYSICAL PROPERTIES",
    "--------------------------------------------------------------------------------",
    `Estimated Diameter   : ${ast.diameter ? ast.diameter.toFixed(2) + " km" : "N/D"}`,
    `Geometric Albedo     : ${ast.albedo ? ast.albedo.toFixed(4) : "N/D"}`,
    `Estimated Density    : ${ast.density ? ast.density.toFixed(1) + " kg/m³" : "N/D"}`,
    `Estimated Mass       : ${ast.mass ? ast.mass.toExponential(3) + " kg" : "N/D"}`,
    `Absolute Mag (H)     : ${ast.h ? ast.h.toFixed(2) : "N/D"}`,
    `Slope Parameter (G)  : ${ast.g !== undefined && ast.g !== null ? ast.g.toFixed(2) : "0.15"}`,
    "",
    "ORBITAL ELEMENTS",
    "--------------------------------------------------------------------------------",
    `Orbital Epoch (JD)   : ${ast.epoch ? ast.epoch.toFixed(1) : "N/D"}`,
    `Semimajor Axis (a)   : ${ast.semimajor_axis ? ast.semimajor_axis.toFixed(6) + " AU" : "N/D"}`,
    `Eccentricity (e)     : ${ast.eccentricity ? ast.eccentricity.toFixed(7) : "N/D"}`,
    `Inclination (i)      : ${ast.inclination ? ast.inclination.toFixed(5) + "°" : "N/D"}`,
    `Long. Asc. Node (Ω)  : ${ast.long_asc_node ? ast.long_asc_node.toFixed(5) + "°" : "N/D"}`,
    `Arg. of Perihelion (ω): ${ast.arg_perihelion ? ast.arg_perihelion.toFixed(5) + "°" : "N/D"}`,
    `Mean Anomaly (M)     : ${ast.mean_anomaly ? ast.mean_anomaly.toFixed(5) + "°" : "N/D"}`,
    `Perihelion (q)       : ${ast.perihelion ? ast.perihelion.toFixed(6) + " AU" : "N/D"}`,
    `Aphelion (Q)         : ${ast.aphelion ? ast.aphelion.toFixed(6) + " AU" : "N/D"}`,
    `Last Obs. Included   : ${ast.last_obs_included || "N/D"}`,
    `Astrometric RMS      : ${ast.rms ? ast.rms.toFixed(2) + "″" : "N/D"}`,
    "================================================================================",
  ];

  return lines.join("\n");
}

/**
 * Generates a CORA formatted report for an occultation prediction.
 * @param {Object} pred
 * @returns {string}
 */
function formatCoraPrediction(pred) {
  const name = pred.name || "Unknown";
  const num = pred.number ? `(${pred.number})` : "";
  const prov = pred.provisional_designation || pred.principal_designation || "";
  const objNameStr = [num, name, prov ? `[${prov}]` : ""].filter(Boolean).join(" ");

  const dateUtc = formatUtcDateTime(pred.date_time);
  const raStr = pred.ra_star_candidate || (pred.ra_star_deg !== undefined ? formatHms(pred.ra_star_deg) : "N/D");
  const decStr = pred.dec_star_candidate || (pred.dec_star_deg !== undefined ? formatDms(pred.dec_star_deg, true) : "N/D");

  const lines = [
    "================================================================================",
    "            CORA - COLLABORATIVE OCCULTATION RESOURCES & ARCHIVE                ",
    "                      ASTEROIDAL OCCULTATION REPORT                             ",
    "================================================================================",
    `Report Generated       : ${new Date().toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC")}`,
    `Record Reference       : CORA-LOPD-EVENT-${pred.id || "0000"}`,
    `Data Pipeline / Origin : LIneA Solar System Portal / SORA / Gaia DR3`,
    "",
    "[EVENT SUMMARY]",
    `  Event ID             : ${pred.id || "N/D"}`,
    `  Predicted Epoch (UTC): ${dateUtc}`,
    `  Occulting Body       : ${objNameStr}`,
    `  Dynamical Class      : ${pred.base_dynclass || "N/D"} (${pred.dynclass || "N/D"})`,
    "",
    "[ASTEROID CHARACTERISTICS]",
    `  Designation          : ${objNameStr}`,
    `  Estimated Diameter   : ${pred.diameter ? pred.diameter.toFixed(2) + " km" : "N/D"}`,
    `  Apparent Diameter    : ${pred.apparent_diameter ? pred.apparent_diameter.toFixed(2) + " mas" : "N/D"}`,
    `  Apparent Magnitude   : V ≈ ${pred.apparent_magnitude ? pred.apparent_magnitude.toFixed(2) : "N/D"}`,
    `  Geocentric Distance  : ${pred.delta ? pred.delta.toFixed(4) + " AU" : "N/D"}`,
    "",
    "[TARGET STAR ASTROMETRY & PHOTOMETRY]",
    `  Catalog Reference    : Gaia DR3 ${pred.gaia_source_id || "N/D"}`,
    `  Right Ascension (RA) : ${raStr}`,
    `  Declination (Dec)    : ${decStr}`,
    `  Gaia G Magnitude     : ${pred.g_star ? pred.g_star.toFixed(2) : "N/D"}`,
    `  Infrared Mags (J/H/K): J = ${pred.j_star ?? "N/D"} | H = ${pred.h_star ?? "N/D"} | K = ${pred.k_star ?? "N/D"}`,
    "",
    "[OCCULTATION GEOMETRY]",
    `  Closest Approach (CA): ${pred.closest_approach ? pred.closest_approach.toFixed(4) + " arcsec" : "N/D"}`,
    `  Position Angle (PA)  : ${pred.position_angle ? pred.position_angle.toFixed(2) + " deg" : "N/D"}`,
    `  Shadow Ground Speed  : ${pred.velocity ? pred.velocity.toFixed(3) + " km/s" : "N/D"}`,
    `  Max Central Duration : ${pred.event_duration ? pred.event_duration.toFixed(2) + " s" : "N/D"}`,
    `  Expected Mag Drop    : ${pred.magnitude_drop ? "Δm = " + pred.magnitude_drop.toFixed(2) : "N/D"}`,
    `  Cross-Track 1-Sigma  : ${pred.closest_approach_uncertainty_km ? "±" + pred.closest_approach_uncertainty_km.toFixed(1) + " km" : "N/D"}`,
    "",
    "[OBSERVATION ENVIRONMENT]",
    `  Sun Elongation       : ${pred.sun_elongation ? pred.sun_elongation.toFixed(1) + "°" : "N/D"}`,
    `  Moon Elongation      : ${pred.moon_separation ? pred.moon_separation.toFixed(1) + "°" : "N/D"}`,
    `  Moon Phase Fraction  : ${pred.moon_illuminated_fraction ? (pred.moon_illuminated_fraction * 100).toFixed(1) + "%" : "N/D"}`,
    `  Nightside Event      : ${pred.nightside || pred.occ_path_is_nightside ? "True (Nighttime)" : "False (Daylight)"}`,
  ];

  if (pred.occ_path_coeff && typeof pred.occ_path_coeff === "object") {
    lines.push(
      "",
      "[SHADOW PATH POLYNOMIAL MODEL]",
      `  Polynomial Window t0 : ${formatUtcDateTime(pred.occ_path_coeff.t0)}`,
      `  Polynomial Window t1 : ${formatUtcDateTime(pred.occ_path_coeff.t1)}`,
      `  Latitude Boundaries  : [${pred.occ_path_coeff.min_latitude?.toFixed(2)}°, ${pred.occ_path_coeff.max_latitude?.toFixed(2)}°]`,
      `  Longitude Boundaries : [${pred.occ_path_coeff.min_longitude?.toFixed(2)}°, ${pred.occ_path_coeff.max_longitude?.toFixed(2)}°]`,
      `  Polynomial Model     : Available via occ_path_coeff`,
    );
  }

  lines.push(
    "================================================================================",
  );

  return lines.join("\n");
}

/**
 * Generates a CORA formatted report for an asteroid body.
 * @param {Object} ast
 * @returns {string}
 */
function formatCoraAsteroid(ast) {
  const name = ast.name || "Unknown";
  const num = ast.number ? `(${ast.number})` : "";
  const prov = ast.provisional_designation || ast.principal_designation || "";
  const titleStr = [num, name, prov ? `[${prov}]` : ""].filter(Boolean).join(" ");

  const lines = [
    "================================================================================",
    "            CORA - COLLABORATIVE OCCULTATION RESOURCES & ARCHIVE                ",
    "                      SMALL BODY DATABASE RECORD                                ",
    "================================================================================",
    `Record Reference       : CORA-SBDB-${ast.id || ast.number || "0000"}`,
    `Generated              : ${new Date().toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC")}`,
    "",
    "[OBJECT IDENTIFICATION]",
    `  Name / Designation   : ${titleStr}`,
    `  Asteroid Number      : ${ast.number || "Unnumbered"}`,
    `  Base Class           : ${ast.base_dynclass || "N/D"}`,
    `  Subclass             : ${ast.dynclass || "N/D"}`,
    `  Astorb Designation   : ${ast.astorb_dynbaseclass || "N/D"} (${ast.astorb_dynsubclass || "N/D"})`,
    "",
    "[PHYSICAL MODEL & DIMENSIONS]",
    `  Diameter             : ${ast.diameter ? ast.diameter.toFixed(2) + " km" : "N/D"}`,
    `  Geometric Albedo     : ${ast.albedo ? ast.albedo.toFixed(4) : "N/D"}`,
    `  Bulk Density         : ${ast.density ? ast.density.toFixed(1) + " kg/m³" : "N/D"}`,
    `  Mass                 : ${ast.mass ? ast.mass.toExponential(3) + " kg" : "N/D"}`,
    `  Absolute Magnitude H : ${ast.h ? ast.h.toFixed(2) : "N/D"}`,
    `  Slope Parameter G    : ${ast.g !== undefined && ast.g !== null ? ast.g.toFixed(2) : "0.15"}`,
    "",
    "[HELIOCENTRIC ORBITAL ELEMENTS]",
    `  Epoch (JD)           : ${ast.epoch ? ast.epoch.toFixed(1) : "N/D"}`,
    `  Semimajor Axis (a)   : ${ast.semimajor_axis ? ast.semimajor_axis.toFixed(6) + " AU" : "N/D"}`,
    `  Eccentricity (e)     : ${ast.eccentricity ? ast.eccentricity.toFixed(7) : "N/D"}`,
    `  Inclination (i)      : ${ast.inclination ? ast.inclination.toFixed(5) + " deg" : "N/D"}`,
    `  Node (Omega)         : ${ast.long_asc_node ? ast.long_asc_node.toFixed(5) + " deg" : "N/D"}`,
    `  Arg. Perihelion (w)  : ${ast.arg_perihelion ? ast.arg_perihelion.toFixed(5) + " deg" : "N/D"}`,
    `  Mean Anomaly (M)     : ${ast.mean_anomaly ? ast.mean_anomaly.toFixed(5) + " deg" : "N/D"}`,
    `  Perihelion Dist (q)  : ${ast.perihelion ? ast.perihelion.toFixed(6) + " AU" : "N/D"}`,
    `  Aphelion Dist (Q)    : ${ast.aphelion ? ast.aphelion.toFixed(6) + " AU" : "N/D"}`,
    `  Orbital RMS          : ${ast.rms ? ast.rms.toFixed(2) + " arcsec" : "N/D"}`,
    `  Last Observation     : ${ast.last_obs_included || "N/D"}`,
    "================================================================================",
  ];

  return lines.join("\n");
}

/**
 * Formats a prediction or asteroid data object in IOTA report format.
 * @param {Object} data - Prediction event or asteroid object.
 * @param {Object} [options] - Optional observer / formatting options.
 * @returns {string}
 */
export function formatIotaReport(data, options = {}) {
  if (!data || typeof data !== "object") {
    throw new TypeError("formatIotaReport expects a valid prediction or asteroid data object.");
  }
  const type = identifyDataType(data);
  return type === "prediction"
    ? formatIotaPrediction(data, options)
    : formatIotaAsteroid(data);
}

/**
 * Formats a prediction or asteroid data object in CORA report format.
 * @param {Object} data - Prediction event or asteroid object.
 * @param {Object} [options] - Optional formatting options.
 * @returns {string}
 */
export function formatCoraReport(data, options = {}) {
  if (!data || typeof data !== "object") {
    throw new TypeError("formatCoraReport expects a valid prediction or asteroid data object.");
  }
  const type = identifyDataType(data);
  return type === "prediction"
    ? formatCoraPrediction(data)
    : formatCoraAsteroid(data);
}

/**
 * Asynchronously generates an IOTA report.
 * Accepts an already-fetched object OR an ID/name to fetch automatically.
 * @param {Object|string|number} target - Prediction/Asteroid object, prediction ID, or asteroid name.
 * @param {Object} [options]
 * @returns {Promise<string>}
 */
export async function generateIotaReport(target, options = {}) {
  if (target && typeof target === "object") {
    return formatIotaReport(target, options);
  }

  const { baseUrl } = options;

  // If number, try prediction ID first
  if (typeof target === "number") {
    try {
      const predApi = new Prediction({ baseUrl });
      const pred = await predApi.getPrediction(target);
      if (pred && (pred.date_time || pred.id)) {
        return formatIotaReport(pred, options);
      }
    } catch {
      // Fallback to asteroid number
    }

    const astApi = new Asteroid({ baseUrl });
    const ast = await astApi.byNumber(target);
    return formatIotaReport(ast, options);
  }

  if (typeof target === "string") {
    const astApi = new Asteroid({ baseUrl });
    const ast = await astApi.byName(target);
    return formatIotaReport(ast, options);
  }

  throw new TypeError("generateIotaReport requires an object, prediction ID, or asteroid identifier.");
}

/**
 * Asynchronously generates a CORA report.
 * Accepts an already-fetched object OR an ID/name to fetch automatically.
 * @param {Object|string|number} target - Prediction/Asteroid object, prediction ID, or asteroid name.
 * @param {Object} [options]
 * @returns {Promise<string>}
 */
export async function generateCoraReport(target, options = {}) {
  if (target && typeof target === "object") {
    return formatCoraReport(target, options);
  }

  const { baseUrl } = options;

  if (typeof target === "number") {
    try {
      const predApi = new Prediction({ baseUrl });
      const pred = await predApi.getPrediction(target);
      if (pred && (pred.date_time || pred.id)) {
        return formatCoraReport(pred, options);
      }
    } catch {
      // Fallback to asteroid number
    }

    const astApi = new Asteroid({ baseUrl });
    const ast = await astApi.byNumber(target);
    return formatCoraReport(ast, options);
  }

  if (typeof target === "string") {
    const astApi = new Asteroid({ baseUrl });
    const ast = await astApi.byName(target);
    return formatCoraReport(ast, options);
  }

  throw new TypeError("generateCoraReport requires an object, prediction ID, or asteroid identifier.");
}
