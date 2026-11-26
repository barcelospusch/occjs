import assert from "node:assert/strict";
import test from "node:test";
import {
  getHorizonsEphemeris,
  getHorizonsObject,
  getHorizonsObservability,
  getHorizonsOrbit,
  getHorizonsVectors,
} from "../src/index.js";

const signature = { source: "NASA/JPL Horizons API", version: "1.3" };
const site = { latitude: -23.55, longitude: -46.63, elevationKm: 0.76 };
const date = "2029-Apr-13 00:00:00.000";
const julianDate = 2462239.5;
const frameDate = `A.D. ${date}`;

function mockResponse(t, result) {
  const urls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    urls.push(new URL(url));
    return Response.json({ signature, result });
  });
  return urls;
}

function table(row) {
  return `header\r\n$$SOE\r\n ${row}\r\n$$EOE\r\nfooter`;
}

test("object summaries preserve the original response and designation lookup", async (t) => {
  const urls = mockResponse(t, "Object summary");
  const data = await getHorizonsObject("1999 AN10", { by: "designation" });
  assert.deepEqual(data, { signature, result: "Object summary" });
  assert.equal(urls[0].searchParams.get("COMMAND"), "'DES=1999 AN10;'");
  assert.equal(urls[0].searchParams.get("MAKE_EPHEM"), "NO");
});

test("observer ephemerides handle status markers, unavailable data and ranges", async (t) => {
  const urls = mockResponse(t, table(`${date}, , *, 140.2, -10.2, n.a., n.a., 0.2, -3.1, 11, /L, n.a.,`));
  const result = await getHorizonsEphemeris("Apophis", {
    start: "2029-04-12T21:00:00-03:00",
    stop: "2029-04-13T01:00:00Z",
    step: "10 min",
  });
  const params = urls[0].searchParams;
  assert.equal(params.get("CENTER"), "500@399");
  assert.equal(params.get("START_TIME"), "'2029-04-13 00:00:00.000'");
  assert.equal(params.get("STEP_SIZE"), "'10 min'");
  assert.deepEqual(result.rows, [{
    calendarDate: date, raDeg: 140.2, decDeg: -10.2, magnitude: null,
    distanceAu: 0.2, rangeRateKmPerSec: -3.1, solarElongationDeg: 11,
    pointingUncertainty3SigmaArcsec: null,
  }]);
});

test("observability binds the prediction date and site to the topocentric query", async (t) => {
  const urls = mockResponse(t, table(`${date}, *, m, 140, -10, 80, 40, 1.55, 0.2, 11, n.a., 0.2, -3, 11, /L, 0.02,`));
  const local = await getHorizonsObservability({
    name: "Apophis", number: 99942, date_time: "2029-04-13T00:00:00Z",
  }, site);
  const params = urls[0].searchParams;
  assert.equal(params.get("COMMAND"), "'99942;'");
  assert.equal(params.get("CENTER"), "coord@399");
  assert.equal(params.get("SITE_COORD"), "'-46.63,-23.55,0.76'");
  assert.equal(params.get("TLIST"), "'2029-04-13 00:00:00.000'");
  assert.equal(local.altitudeDeg, 40);
  assert.equal(local.azimuthDeg, 80);
  assert.equal(local.airmass, 1.55);
  assert.equal(local.pointingUncertainty3SigmaArcsec, 0.02);
});

test("orbital elements retain TDB epochs and AU/day units", async (t) => {
  const urls = mockResponse(t, table(`${julianDate}, ${frameDate}, 0.1, 0.9, 2, 3, 4, 2462000, 1, 30, 40, 1, 1.1, 360,`));
  const result = await getHorizonsOrbit("Apophis", { times: ["2029-04-13"] });
  assert.equal(urls[0].searchParams.get("OUT_UNITS"), "AU-D");
  assert.equal(result.timeScale, "TDB");
  assert.equal(result.center, "500@10");
  assert.equal(result.rows[0].julianDate, julianDate);
  assert.equal(result.rows[0].semiMajorAxisAu, 1);
  assert.equal(result.rows[0].periodDays, 360);
});

test("state vectors use the requested center and plane and reject malformed rows", async (t) => {
  const urls = mockResponse(t, table(`${julianDate}, ${frameDate}, 1E+05, -2, 3, 4, 5, 6,`));
  const options = { times: ["2029-04-13"], center: "500@399", referencePlane: "FRAME" };
  const result = await getHorizonsVectors("Apophis", options);
  assert.equal(urls[0].searchParams.get("CENTER"), "500@399");
  assert.equal(urls[0].searchParams.get("VEC_TABLE"), "2");
  assert.equal(result.referencePlane, "FRAME");
  assert.deepEqual(result.rows[0].positionKm, { x: 100000, y: -2, z: 3 });
  assert.deepEqual(result.rows[0].velocityKmPerSec, { x: 4, y: 5, z: 6 });
  await assert.rejects(getHorizonsVectors("Apophis", { times: ["2029-04-13T00:00Z"] }), TypeError);
  await assert.rejects(getHorizonsOrbit("Apophis", options), { name: "OccJSError" });
});

test("table queries surface a Horizons match list as error details", async (t) => {
  mockResponse(t, "Matching small-bodies: 141P, 141P-A");
  await assert.rejects(
    getHorizonsEphemeris("141P", { by: "designation", times: ["2029-04-13"] }),
    { name: "OccJSError", details: { signature, result: "Matching small-bodies: 141P, 141P-A" } },
  );
});
