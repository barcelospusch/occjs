import test from "node:test";
import assert from "node:assert/strict";

import {
  Prediction,
  Asteroid,
  BaseAPI,
  LineASSP,
  geofilter,
  generateMap,
  polyval,
  pathArc,
  isNighttime,
  visibilityFromCoeff,
  buildPathFromCoeff,
  calculatePathVisibility,
  formatIotaReport,
  formatCoraReport,
  generateIotaReport,
  generateCoraReport,
  getPredictions,
  getPrediction,
  OccJSError,
  InvalidDatetimeFormatError,
} from "../src/index.js";

test("BaseAPI parameter normalization and validation", () => {
  const base = new BaseAPI();

  // Test name formatting
  const p1 = base._parseValues({ name: "ceres" });
  assert.equal(p1.name, "Ceres");

  const p2 = base._parseValues({ name: "1950 da" });
  assert.equal(p2.name, "1950 DA");

  // Test date validation
  assert.doesNotThrow(() => {
    base._validateDatetime("2024-01-01T00:00:00Z");
    base._validateDatetime("2024-01-01");
    base._validateDatetime("2024-01-01T12:00");
    base._validateDatetime(new Date("2024-01-01T00:00:00Z"));
  });

  assert.throws(() => {
    base._validateDatetime("invalid-date");
  }, InvalidDatetimeFormatError);

  // Test aliases
  const parsedAliases = base._parseValues({
    startDate: "2024-01-01T00:00:00Z",
    endDate: "2024-01-02T00:00:00Z",
    maxMagnitude: 14,
    nighttime: true,
    radius: 500,
  });

  assert.equal(parsedAliases.date_time_after, "2024-01-01T00:00:00Z");
  assert.equal(parsedAliases.date_time_before, "2024-01-02T00:00:00Z");
  assert.equal(parsedAliases.magnitude_max, 14);
  assert.equal(parsedAliases.nightside, true);
  assert.equal(parsedAliases.location_radius, 500);

  // Key replacement: principal_designation -> provisional_designation
  const replaced = base._replaceKey(
    { principal_designation: "1950 DA", id: 1 },
    "principal_designation",
    "provisional_designation",
  );
  assert.equal(replaced.provisional_designation, "1950 DA");
  assert.equal(replaced.principal_designation, undefined);
});

test("Math functions: polyval and pathArc", () => {
  // polyval: 2*x^2 + 3*x + 4 at x=2 => 2*4 + 3*2 + 4 = 18
  const res = polyval([2, 3, 4], 2);
  assert.equal(res, 18);

  // Distance between same point is 0
  assert.equal(pathArc(0, 0, 0, 0), 0);

  // Distance between poles is approx PI * R = ~20037 km
  const poleDist = pathArc(90, 0, -90, 0);
  assert.ok(poleDist > 20000 && poleDist < 20100);
});

test("Solar ephemeris and nighttime check", () => {
  // Noon at Greenwich (lon=0) on equinox should be daytime
  const day = isNighttime(0, 0, "2024-03-20T12:00:00Z", 0);
  assert.equal(day, false);

  // Midnight at Greenwich (lon=0) should be nighttime
  const night = isNighttime(0, 0, "2024-03-20T00:00:00Z", 0);
  assert.equal(night, true);
});

test("geofilter filters events matching geographic path", () => {
  const mockPrediction = {
    id: 12345,
    name: "Chariklo",
    date_time: "2024-01-03T11:13:24Z",
    occ_path_coeff: {
      t0: "2024-01-03T14:10:10+00:00",
      t1: "2024-01-03T14:16:38+00:00",
      min_latitude: -25,
      max_latitude: 15,
      min_longitude: -50,
      max_longitude: 125,
      coeff_latitude: [0, 0, 0, 10], // constant latitude 10 deg
      coeff_longitude: [0, 0, 0, 100], // constant longitude 100 deg
      body_upper_coeff_latitude: [],
      body_upper_coeff_longitude: [],
      body_lower_coeff_latitude: [],
      body_lower_coeff_longitude: [],
    },
  };

  // Point close to the path (lat=10, lon=100) within 500km and in nighttime
  const visible = geofilter([mockPrediction], {
    latitude: 10,
    longitude: 100,
    radius: 500,
    checkNighttime: false, // test path check independently
  });
  assert.equal(visible.length, 1);

  // Point far away (lat=-50, lon=-100)
  const notVisible = geofilter([mockPrediction], {
    latitude: -50,
    longitude: -100,
    radius: 100,
    checkNighttime: false,
  });
  assert.equal(notVisible.length, 0);

  // Positional signature: geofilter(data, lat, lon, radius)
  const visiblePositional = geofilter(mockPrediction, 10, 100, 500, {
    checkNighttime: false,
  });
  assert.equal(visiblePositional.length, 1);
});

test("Prediction and Asteroid classes have camelCase methods only", () => {
  const pred = new Prediction();
  assert.equal(typeof pred.getData, "function");
  assert.equal(typeof pred.byName, "function");
  assert.equal(typeof pred.byNumber, "function");
  assert.equal(typeof pred.byProvisionalDesignation, "function");
  assert.equal(typeof pred.asteroidsWithPrediction, "function");
  assert.equal(typeof pred.dynamicalClassesWithPrediction, "function");
  assert.equal(typeof pred.dynamicalSubclassesWithPrediction, "function");
  assert.equal(typeof pred.getPrediction, "function");
  assert.equal(typeof pred.getOccultationPaths, "function");
  assert.equal(typeof pred.getOccultationMap, "function");

  // Verify snake_case methods are NOT defined
  assert.equal(pred.get_data, undefined);
  assert.equal(pred.by_name, undefined);
  assert.equal(pred.by_number, undefined);
  assert.equal(pred.by_provisional_designation, undefined);
  assert.equal(pred.asteroids_with_prediction, undefined);
  assert.equal(pred.dynamical_classes_with_prediction, undefined);
  assert.equal(pred.dynamical_subclasses_with_prediction, undefined);
  assert.equal(pred.get_prediction, undefined);
  assert.equal(pred.get_occultation_paths, undefined);
  assert.equal(pred.get_occultation_map, undefined);
  assert.equal(pred.get_or_create_map, undefined);

  const ast = new Asteroid();
  assert.equal(typeof ast.count, "function");
  assert.equal(typeof ast.dynamicalClasses, "function");
  assert.equal(typeof ast.dynamicalSubclasses, "function");
  assert.equal(typeof ast.withPrediction, "function");
  assert.equal(typeof ast.getPredictionsByName, "function");
  assert.equal(typeof ast.getPredictionsByNumber, "function");
  assert.equal(typeof ast.getPredictionsByProvisionalDesignation, "function");

  // Verify snake_case methods are NOT defined
  assert.equal(ast.dynamical_classes, undefined);
  assert.equal(ast.dynamical_subclasses, undefined);
  assert.equal(ast.with_prediction, undefined);
  assert.equal(ast.get_predictions_by_name, undefined);
  assert.equal(ast.get_predictions_by_number, undefined);
  assert.equal(ast.get_predictions_by_provisional_designation, undefined);

  const linea = new LineASSP();
  assert.ok(linea.prediction instanceof Prediction);
  assert.ok(linea.asteroid instanceof Asteroid);
});

test("formatIotaReport and formatCoraReport for prediction", () => {
  const mockPrediction = {
    id: 99999,
    name: "Chariklo",
    number: 10199,
    provisional_designation: "1997 CU26",
    base_dynclass: "Centaur",
    date_time: "2024-01-03T11:13:24Z",
    gaia_source_id: "582847291823",
    ra_star_candidate: "10 24 15.3421",
    dec_star_candidate: "-12 45 10.231",
    g_star: 14.2,
    apparent_magnitude: 18.2,
    diameter: 252.0,
    event_duration: 10.36,
    magnitude_drop: 4.0,
    velocity: 24.32,
    closest_approach: 0.142,
    position_angle: 114.5,
    delta: 15.421,
    sun_elongation: 142.5,
    moon_separation: 85.2,
    moon_illuminated_fraction: 0.23,
    nightside: true,
  };

  const iotaRep = formatIotaReport(mockPrediction, {
    observerName: "Dimitri Pusch",
    siteName: "Curitiba Observatory",
    latitude: -25.43,
    longitude: -49.27,
  });

  assert.ok(iotaRep.includes("INTERNATIONAL OCCULTATION TIMING ASSOCIATION"));
  assert.ok(iotaRep.includes("Chariklo"));
  assert.ok(iotaRep.includes("(10199)"));
  assert.ok(iotaRep.includes("10.36 s"));
  assert.ok(iotaRep.includes("Dimitri Pusch"));
  assert.ok(iotaRep.includes("Curitiba Observatory"));

  const coraRep = formatCoraReport(mockPrediction);
  assert.ok(coraRep.includes("CORA - COLLABORATIVE OCCULTATION RESOURCES & ARCHIVE"));
  assert.ok(coraRep.includes("Chariklo"));
  assert.ok(coraRep.includes("24.320 km/s"));
  assert.ok(coraRep.includes("14.20"));
});

test("formatIotaReport and formatCoraReport for asteroid", () => {
  const mockAsteroid = {
    id: 1,
    name: "Ceres",
    number: 1,
    base_dynclass: "Main Belt",
    dynclass: "MBA>Middle",
    diameter: 939.4,
    albedo: 0.09,
    density: 2162,
    h: 3.34,
    g: 0.12,
    epoch: 2460800.5,
    semimajor_axis: 2.767,
    eccentricity: 0.078,
    inclination: 10.59,
  };

  const iotaAst = formatIotaReport(mockAsteroid);
  assert.ok(iotaAst.includes("ASTEROID TARGET PROFILE BULLETIN"));
  assert.ok(iotaAst.includes("Ceres"));
  assert.ok(iotaAst.includes("939.40 km"));

  const coraAst = formatCoraReport(mockAsteroid);
  assert.ok(coraAst.includes("SMALL BODY DATABASE RECORD"));
  assert.ok(coraAst.includes("Ceres"));
  assert.ok(coraAst.includes("2.767000 AU"));
});
