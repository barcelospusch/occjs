const EARTH_RADIUS_KM = 6378.1366;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Evaluates polynomial at x using Horner's method.
 * Coefficients are ordered from highest degree to constant (matching numpy.polyval).
 * @param {Array<number>} coeffs
 * @param {number} x
 * @returns {number}
 */
export function polyval(coeffs, x) {
  if (!Array.isArray(coeffs) || coeffs.length === 0) return 0;
  let val = 0;
  for (let i = 0; i < coeffs.length; i++) {
    val = val * x + coeffs[i];
  }
  return val;
}

/**
 * Calculates great-circle distance between two coordinates in kilometers.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @param {number} [earthRadius=EARTH_RADIUS_KM]
 * @returns {number}
 */
export function pathArc(lat1, lon1, lat2, lon2, earthRadius = EARTH_RADIUS_KM) {
  const phi1 = lat1 * DEG_TO_RAD;
  const phi2 = lat2 * DEG_TO_RAD;
  const dLam = Math.abs(lon1 - lon2) * DEG_TO_RAD;

  let cosTheta =
    Math.sin(phi1) * Math.sin(phi2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.cos(dLam);

  cosTheta = Math.max(-1, Math.min(1, cosTheta));
  return Math.acos(cosTheta) * earthRadius;
}

/**
 * Checks if the occultation event happens during nighttime for the observer location.
 * Uses high-accuracy solar ephemeris matching astropy get_sun calculations.
 * @param {number} latitude
 * @param {number} longitude
 * @param {string|Date} dateTime
 * @param {number} [radiusKm=0]
 * @returns {boolean}
 */
export function isNighttime(latitude, longitude, dateTime, radiusKm = 0) {
  try {
    const date = new Date(dateTime);
    if (Number.isNaN(date.getTime())) return true;

    // Julian Date & days since J2000.0
    const jd = date.getTime() / 86400000 + 2440587.5;
    const d = jd - 2451545.0;

    // Mean longitude and mean anomaly of the Sun
    const L = (280.46 + 0.9856474 * d) % 360;
    const g = ((357.528 + 0.9856003 * d) % 360) * DEG_TO_RAD;

    // Ecliptic longitude & obliquity
    const lambda =
      (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * DEG_TO_RAD;
    const eps = (23.439 - 0.0000004 * d) * DEG_TO_RAD;

    // Solar RA and Dec
    const sinDec = Math.sin(eps) * Math.sin(lambda);
    const dec = Math.asin(sinDec);
    const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)) * RAD_TO_DEG;

    // Greenwich Mean Sidereal Time (GMST)
    const T = d / 36525.0;
    let gmst =
      (280.46061837 +
        360.98564736629 * d +
        0.000387933 * T * T -
        (T * T * T) / 38710000) %
      360;
    if (gmst < 0) gmst += 360;

    // Subsolar longitude in [-180, 180]
    let sunLon = (ra - gmst) % 360;
    if (sunLon > 180) sunLon -= 360;
    if (sunLon < -180) sunLon += 360;

    // Solar zenith angle at observer
    const phi = latitude * DEG_TO_RAD;
    const dLon = Math.abs(longitude - sunLon) * DEG_TO_RAD;
    let cosZenith =
      Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(dLon);
    cosZenith = Math.max(-1, Math.min(1, cosZenith));
    const zenithDeg = Math.acos(cosZenith) * RAD_TO_DEG;

    // Angular expansion of search circle
    const angularRadiusDeg = (radiusKm / EARTH_RADIUS_KM) * RAD_TO_DEG;

    // Nighttime condition: Sun is below horizon (> 89.47 deg zenith angle)
    return zenithDeg + angularRadiusDeg > 89.47;
  } catch {
    return true;
  }
}

/**
 * Builds discrete longitude and latitude path points from polynomial coefficients.
 * @param {Array<number>} lonCoeff
 * @param {Array<number>} latCoeff
 * @param {string} t0
 * @param {string} t1
 * @param {number} nElements
 * @param {number} [minLat=-90]
 * @param {number} [maxLat=90]
 * @param {number} [minLon=-180]
 * @param {number} [maxLon=180]
 * @returns {Array<{ lon: number, lat: number }>}
 */
export function buildPathFromCoeff(
  lonCoeff,
  latCoeff,
  t0,
  t1,
  nElements = 1500,
  minLat = -90,
  maxLat = 90,
  minLon = -180,
  maxLon = 180,
) {
  if (
    !Array.isArray(lonCoeff) ||
    !Array.isArray(latCoeff) ||
    lonCoeff.length === 0 ||
    latCoeff.length === 0 ||
    !t0 ||
    !t1
  ) {
    return [];
  }

  const time0 = new Date(t0).getTime() / 1000;
  const time1 = new Date(t1).getTime() / 1000;
  if (Number.isNaN(time0) || Number.isNaN(time1)) return [];

  const deltaT = time1 - time0;
  const points = [];

  for (let i = 0; i < nElements; i++) {
    const t = -deltaT + (2 * deltaT * i) / (nElements - 1);
    const lat = polyval(latCoeff, t);
    const lon = polyval(lonCoeff, t);

    if (
      lat >= minLat &&
      lat <= maxLat &&
      lon >= minLon &&
      lon <= maxLon
    ) {
      points.push({ lon, lat });
    }
  }

  return points;
}

/**
 * Checks if path points fall within radius distance from the given coordinate.
 * @param {number} latitude
 * @param {number} longitude
 * @param {Array<{ lon: number, lat: number }>} pathPoints
 * @param {number} radiusKm
 * @returns {boolean}
 */
export function calculatePathVisibility(
  latitude,
  longitude,
  pathPoints,
  radiusKm,
) {
  if (!pathPoints || pathPoints.length === 0) return false;

  for (let i = 0; i < pathPoints.length; i++) {
    const pt = pathPoints[i];
    const dist = pathArc(latitude, longitude, pt.lat, pt.lon);
    if (dist <= radiusKm) {
      return true;
    }
  }

  return false;
}

/**
 * Evaluates visibility of an occultation prediction from a geographic location
 * using its polynomial path coefficients (occ_path_coeff).
 * Matches the logic in lineaSSP/api/occviz.py visibility_from_coeff.
 * @param {Object} options
 * @param {number} options.latitude
 * @param {number} options.longitude
 * @param {number} options.radius - Search radius in km.
 * @param {string|Date} [options.dateTime] - Event date time.
 * @param {Object|string} options.occPathCoeff - Prediction occ_path_coeff object.
 * @param {number} [options.nElements=1500] - Sample resolution.
 * @param {boolean} [options.checkNighttime=true] - Whether to require nighttime visibility.
 * @returns {boolean}
 */
export function visibilityFromCoeff({
  latitude,
  longitude,
  radius,
  dateTime,
  occPathCoeff,
  nElements = 1500,
  checkNighttime = true,
}) {
  if (!occPathCoeff) return false;

  const coeff =
    typeof occPathCoeff === "string" ? JSON.parse(occPathCoeff) : occPathCoeff;

  if (!coeff || typeof coeff !== "object") return false;

  // Check nighttime condition
  if (checkNighttime && dateTime) {
    const nighttime = isNighttime(latitude, longitude, dateTime, radius);
    if (!nighttime) return false;
  }

  const {
    t0,
    t1,
    min_latitude: minLat = -90,
    max_latitude: maxLat = 90,
    min_longitude: minLon = -180,
    max_longitude: maxLon = 180,
    coeff_latitude: coeffLat,
    coeff_longitude: coeffLon,
    body_upper_coeff_latitude: upperLat,
    body_upper_coeff_longitude: upperLon,
    body_lower_coeff_latitude: lowerLat,
    body_lower_coeff_longitude: lowerLon,
  } = coeff;

  // 1. Check body upper limit path
  if (Array.isArray(upperLat) && upperLat.length > 0 && Array.isArray(upperLon) && upperLon.length > 0) {
    const upperPoints = buildPathFromCoeff(
      upperLon,
      upperLat,
      t0,
      t1,
      nElements,
      minLat,
      maxLat,
      minLon,
      maxLon,
    );
    if (calculatePathVisibility(latitude, longitude, upperPoints, radius)) {
      return true;
    }
  }

  // 2. Check body lower limit path
  if (Array.isArray(lowerLat) && lowerLat.length > 0 && Array.isArray(lowerLon) && lowerLon.length > 0) {
    const lowerPoints = buildPathFromCoeff(
      lowerLon,
      lowerLat,
      t0,
      t1,
      nElements,
      minLat,
      maxLat,
      minLon,
      maxLon,
    );
    if (calculatePathVisibility(latitude, longitude, lowerPoints, radius)) {
      return true;
    }
  }

  // 3. Check central path
  if (Array.isArray(coeffLat) && coeffLat.length > 0 && Array.isArray(coeffLon) && coeffLon.length > 0) {
    const centerPoints = buildPathFromCoeff(
      coeffLon,
      coeffLat,
      t0,
      t1,
      nElements,
      minLat,
      maxLat,
      minLon,
      maxLon,
    );
    if (calculatePathVisibility(latitude, longitude, centerPoints, radius)) {
      return true;
    }
  }

  return false;
}

/**
 * Filters a list of occultation predictions by geographical visibility.
 * Direct equivalent of `geofilter()` from the Python package `lineaSSP`.
 *
 * Supported signatures:
 *   geofilter(data, { latitude, longitude, radius, nElements, checkNighttime })
 *   geofilter(data, latitude, longitude, radius, options)
 *
 * @param {Array<Object>|Object} data - Prediction list or single prediction.
 * @param {Object|number} optionsOrLat - Options object OR latitude number.
 * @param {number} [longitude] - Observer longitude.
 * @param {number} [radius] - Visibility search radius in kilometers.
 * @param {Object} [extraOptions] - Additional options (nElements, checkNighttime).
 * @returns {Array<Object>}
 */
export function geofilter(
  data,
  optionsOrLat,
  longitude = null,
  radius = null,
  extraOptions = {},
) {
  if (!data) return [];

  const items = Array.isArray(data) ? data : [data];
  if (items.length === 0) return [];

  let lat;
  let lon;
  let rad;
  let nElements = 1500;
  let checkNighttime = true;

  if (typeof optionsOrLat === "object" && optionsOrLat !== null) {
    lat = optionsOrLat.latitude ?? optionsOrLat.lat;
    lon = optionsOrLat.longitude ?? optionsOrLat.long ?? optionsOrLat.lon;
    rad = optionsOrLat.radius ?? optionsOrLat.location_radius;
    if (optionsOrLat.nElements !== undefined) nElements = optionsOrLat.nElements;
    if (optionsOrLat.checkNighttime !== undefined)
      checkNighttime = optionsOrLat.checkNighttime;
  } else {
    lat = optionsOrLat;
    lon = longitude;
    rad = radius;
    if (extraOptions.nElements !== undefined) nElements = extraOptions.nElements;
    if (extraOptions.checkNighttime !== undefined)
      checkNighttime = extraOptions.checkNighttime;
  }

  if (typeof lat !== "number" || typeof lon !== "number" || typeof rad !== "number") {
    throw new TypeError(
      "geofilter requires valid numeric latitude, longitude, and radius.",
    );
  }

  return items.filter((item) => {
    const coeff = item.occ_path_coeff;
    if (!coeff) return false;

    return visibilityFromCoeff({
      latitude: lat,
      longitude: lon,
      radius: rad,
      dateTime: item.date_time,
      occPathCoeff: coeff,
      nElements,
      checkNighttime,
    });
  });
}
