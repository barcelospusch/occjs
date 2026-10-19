import test from "node:test";
import assert from "node:assert/strict";

import {
  Prediction,
  Asteroid,
  geofilter,
  generateMap,
} from "../src/index.js";

test("Live API: Asteroid endpoints", async () => {
  const asteroidApi = new Asteroid();

  const count = await asteroidApi.count();
  assert.ok(typeof count === "number" && count > 0);

  const dynClasses = await asteroidApi.dynamicalClasses();
  assert.ok(Array.isArray(dynClasses) && dynClasses.length > 0);
  assert.ok(dynClasses.includes("Centaur") || dynClasses.includes("Main Belt"));

  const ceres = await asteroidApi.byName("Ceres");
  assert.ok(ceres && typeof ceres === "object");
  assert.equal(ceres.name, "Ceres");
  assert.equal(ceres.number, 1);
});

test("Live API: Prediction endpoints and geofilter", async () => {
  const predictionApi = new Prediction();

  const asteroidsWithPred = await predictionApi.asteroidsWithPrediction();
  assert.ok(Array.isArray(asteroidsWithPred) && asteroidsWithPred.length > 0);

  const predictions = await predictionApi.byName("Chariklo", { limit: 2 });
  assert.ok(Array.isArray(predictions) && predictions.length > 0);

  const firstEvent = predictions[0];
  assert.ok(firstEvent.id);
  assert.equal(firstEvent.name, "Chariklo");

  // Test map endpoint
  const mapData = await predictionApi.getOccultationMap(firstEvent.id);
  assert.ok(mapData && mapData.url);

  // Test geofilter with real prediction data
  const filtered = geofilter(predictions, {
    latitude: 10.0,
    longitude: 100.0,
    radius: 1000,
  });
  assert.ok(Array.isArray(filtered));

  // Test live report generation
  const iotaReport = await predictionApi.generateIotaReport(firstEvent);
  assert.ok(iotaReport.includes("INTERNATIONAL OCCULTATION TIMING ASSOCIATION"));
  assert.ok(iotaReport.includes("Chariklo"));

  const coraReport = await predictionApi.generateCoraReport(firstEvent.id);
  assert.ok(coraReport.includes("CORA - COLLABORATIVE OCCULTATION RESOURCES & ARCHIVE"));
});
