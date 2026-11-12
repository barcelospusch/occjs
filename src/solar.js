const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export function subsolarPoint(date) {
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
  return [sunLon, dec * RAD_TO_DEG];
}
