import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { generateInteractiveMap } from "../src/predictionMaps.js";

const prediction = {
  date_time: "2026-11-12T03:00:00Z",
  occ_path_coeff: {
    t0: "2026-11-12T03:00:00Z",
    t1: "2026-11-12T03:03:00Z",
    coeff_latitude: [0.01, -23.55],
    coeff_longitude: [0.02, -46.63],
  },
};

async function inspectLayer(options) {
  const html = await generateInteractiveMap(prediction, options);
  assert.match(html, /<meta name="referrer" content="strict-origin-when-cross-origin">/);
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  const error = { textContent: "" };
  const handlers = {};
  let layer;
  const context = {
    document: { getElementById: () => error },
    L: {
      map: () => ({}),
      tileLayer: (url, settings) => {
        layer = { url, settings };
        return {
          on: (event, handler) => { handlers[event] = handler; },
          addTo: () => { throw new Error("Stop after tile layer initialization"); },
        };
      },
    },
  };
  await vm.runInNewContext(script, context);
  return { html, layer, handlers, error };
}

test("OSM tiles explicitly send a referrer and preserve attribution", async () => {
  const { layer, handlers, error } = await inspectLayer();
  assert.equal(layer.url, "https://tile.openstreetmap.org/{z}/{x}/{y}.png");
  assert.equal(layer.settings.referrerPolicy, "strict-origin-when-cross-origin");
  assert.equal(layer.settings.updateWhenIdle, true);
  assert.match(layer.settings.attribution, /OpenStreetMap.*contributors/);
  handlers.tileerror();
  assert.match(error.textContent, /Referer header/);
});

test("custom provider settings reach Leaflet and are safely embedded", async () => {
  const tileLayer = {
    url: "https://maps.example.org/{z}/{x}/{y}.png",
    attribution: 'Example </script><script>alert(1)</script>',
    maxZoom: 16,
  };
  const { html, layer } = await inspectLayer({ tileLayer });
  assert.equal(layer.url, tileLayer.url);
  assert.equal(layer.settings.attribution, tileLayer.attribution);
  assert.equal(layer.settings.maxZoom, 16);
  assert.ok(!html.includes(tileLayer.attribution));
});

test("custom providers require attribution and valid zoom", async () => {
  await assert.rejects(generateInteractiveMap(prediction, {
    tileLayer: { url: "https://maps.example.org/{z}/{x}/{y}.png" },
  }), /attribution/);
  await assert.rejects(generateInteractiveMap(prediction, {
    tileLayer: { url: "https://maps.example.org/{z}/{x}/{y}.png", attribution: "Example", maxZoom: NaN },
  }), /maxZoom/);
});
