import test from "node:test";
import assert from "node:assert/strict";
import { WeatherApiResponse } from "@openmeteo/sdk/weather-api-response.js";
import { Prediction, BaseAPI, getPredictions, getPrediction, OccJSError } from "../src/index.js";
import { forecastWindow, enrichWeather } from "../src/weather.js";

const today = () => new Date().toISOString().slice(0, 10);
const event = () => ({ id: 1, date_time: `${today()}T12:34:00Z` });
const json = (value) => new Response(JSON.stringify(value));

test("weather is opt-in, validates coordinates before fetching, and keeps query options local", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (url) => {
    calls++;
    assert.equal(new URL(url).searchParams.has("includeWeather"), false);
    return json({ results: [event()], count: 1 });
  });
  const [result] = await getPredictions({ includeWeather: false });
  assert.equal(result.weather, undefined);
  await assert.rejects(getPredictions({ includeWeather: true }), /latitude/);
  await assert.rejects(getPredictions({ includeWeather: "yes" }), /boolean/);
  assert.equal(calls, 1);
});

test("event-hour weather and humidity are returned with one shared forecast", async (t) => {
  let weatherCalls = 0;
  t.mock.method(WeatherApiResponse, "getSizePrefixedRootAsWeatherApiResponse", () => ({
    hourly: () => ({
      time: () => BigInt(Date.parse(`${today()}T00:00:00Z`) / 1000),
      interval: () => 3600,
      variables: (index) => ({ valuesArray: () => new Float32Array(24).fill(index === 0 ? 95 : 82) }),
    }),
  }));
  t.mock.method(globalThis, "fetch", async (url) => {
    const parsed = new URL(url);
    if (parsed.hostname === "api.open-meteo.com") {
      weatherCalls++;
      assert.equal(parsed.searchParams.get("hourly"), "weather_code,relative_humidity_2m");
      assert.equal(parsed.searchParams.get("timezone"), "UTC");
      return new Response(new Uint8Array([4, 0, 0, 0, 0, 0, 0, 0]));
    }
    assert.equal(parsed.searchParams.has("includeWeather"), false);
    return json({ count: 2, results: [event(), { ...event(), id: 2 }] });
  });
  const results = await getPredictions({ includeWeather: true, latitude: 0, longitude: 0 });
  assert.equal(results.length, 2);
  assert.equal(weatherCalls, 1);
  assert.equal(results[0].weather.condition, "tempestade");
  assert.equal(results[0].weather.relativeHumidity, 82);
  assert.equal(results[0].weather.time, `${today()}T12:00:00.000Z`);
});

test("weather errors preserve individual events and distant dates avoid weather requests", async (t) => {
  let date = event().date_time;
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (url) => {
    if (new URL(url).hostname === "api.open-meteo.com") {
      calls++;
      throw new Error("offline");
    }
    return json({ id: 1, date_time: date });
  });
  const options = { includeWeather: true, latitude: -23.55, longitude: -46.63 };
  const result = await getPrediction("hash", options);
  assert.equal(result.id, 1);
  assert.equal(result.weather.reason, "weather_api_error");
  assert.equal(result.weather.details, "offline");
  assert.match(result.weather.message, /serviço meteorológico/);
  date = "2099-01-01T00:00:00Z";
  const distant = await new Prediction().getPrediction(1, options);
  assert.equal(distant.weather.reason, "outside_forecast_range");
  assert.match(distant.weather.message, /16 dias/);
  assert.ok(Date.parse(distant.weather.forecastEnd) < Date.parse(date));
  assert.equal(calls, 1);
});

test("forecast window uses UTC midnight and excludes its final instant", async (t) => {
  const window = forecastWindow(new Date("2026-10-20T23:59:59-03:00"));
  assert.equal(new Date(window.start).toISOString(), "2026-10-21T00:00:00.000Z");
  assert.equal(new Date(window.end).toISOString(), "2026-11-06T00:00:00.000Z");
  t.mock.method(globalThis, "fetch", () => { throw new Error("Unexpected weather request"); });
  const { start, end } = forecastWindow();
  const results = await enrichWeather([
    { date_time: new Date(start - 1).toISOString() },
    { date_time: new Date(end).toISOString() },
  ], { latitude: 0, longitude: 0 });
  assert.ok(results.every((item) => item.weather.reason === "outside_forecast_range"));
});

test("pagination respects server page caps and rejects invalid limits", async (t) => {
  const pages = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    const page = Number(new URL(url).searchParams.get("page"));
    pages.push(page);
    return json({ count: 3, results: [{ id: page }] });
  });
  const api = new BaseAPI({ baseUrl: "https://example.com", pageSize: 1000 });
  assert.deepEqual((await api.getData({}, { limit: "all" })).map((v) => v.id), [1, 2, 3]);
  assert.deepEqual(pages, [1, 2, 3]);
  await assert.rejects(api.getData({}, { limit: -1 }), /limit/);
  assert.throws(() => new BaseAPI({ pageSize: 0 }), /pageSize/);
});

test("prediction subendpoints wrap invalid JSON and HTTP failures", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("<html>invalid</html>"));
  await assert.rejects(new Prediction().asteroidsWithPrediction(), (error) => error instanceof OccJSError && /invalid JSON/.test(error.message));
  globalThis.fetch = async () => new Response("unavailable", { status: 503 });
  await assert.rejects(new Prediction().asteroidsWithPrediction(), (error) => error.status === 503 && error.details === "unavailable");
});
