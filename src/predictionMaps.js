import { polyval } from "./geofilter.js";
import { subsolarPoint } from "./solar.js";

const color = "#084c8d";
const markerStep = 60;

function wrapLongitude(lon) {
  return ((lon + 180) % 360 + 360) % 360 - 180;
}

async function loadMapData(input, { baseUrl } = {}) {
  let prediction = input;
  if (typeof input === "number" || typeof input === "string") {
    const { Prediction } = await import("./prediction.js");
    prediction = await new Prediction({ baseUrl }).getPrediction(input);
  }
  const raw = prediction?.occ_path_coeff;
  const coeff = typeof raw === "string" ? JSON.parse(raw) : raw;
  const date = new Date(prediction?.date_time ?? NaN);
  const span = (Date.parse(coeff?.t1) - Date.parse(coeff?.t0)) / 1000;
  const lat = coeff?.coeff_latitude;
  const lon = coeff?.coeff_longitude;
  if (!Number.isFinite(date.getTime()) || !(span > 0) ||
      ![lat, lon].every((values) => Array.isArray(values) && values.length && values.every(Number.isFinite))) {
    throw new TypeError("A prediction with date_time and valid occ_path_coeff is required.");
  }

  const {
    min_latitude = -90, max_latitude = 90,
    min_longitude = -180, max_longitude = 180,
  } = coeff;
  function point(seconds) {
    const latitude = polyval(lat, seconds);
    const longitude = wrapLongitude(polyval(lon, seconds));
    const withinLongitude = min_longitude <= max_longitude
      ? longitude >= min_longitude && longitude <= max_longitude
      : longitude >= min_longitude || longitude <= max_longitude;
    if (latitude >= Math.max(-90, min_latitude) &&
        latitude <= Math.min(90, max_latitude) && withinLongitude) {
      return [longitude, latitude];
    }
    return null;
  }

  const segments = [];
  let segment = [];
  for (let i = 0; i <= 1500; i++) {
    const position = point((2 * i / 1500 - 1) * span);
    if (position) {
      segment.push(position);
    } else if (segment.length) {
      segments.push(segment);
      segment = [];
    }
  }
  if (segment.length) segments.push(segment);
  if (!segments.some((line) => line.length > 1)) {
    throw new RangeError("The prediction has no drawable shadow path.");
  }

  const markers = [];
  for (let seconds = markerStep; seconds <= Math.min(span, markerStep * 1500); seconds += markerStep) {
    for (const offset of [-seconds, seconds]) {
      const position = point(offset);
      if (position) markers.push({ position, time: new Date(+date + offset * 1000).toISOString() });
    }
  }
  const closest = point(0);
  const sun = subsolarPoint(date);
  return {
    segments, closest, markers, time: date.toISOString(),
    center: closest ?? segments[0][Math.floor(segments[0].length / 2)],
    antisolar: [wrapLongitude(sun[0] + 180), -sun[1]],
  };
}

function mapDocument(data, title, assets, script) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
${assets}
<style>
body { margin: 0; font: 14px system-ui, sans-serif; }
main { position: relative; }
#map { height: 100vh; height: 100dvh; }
#map svg.globe { width: 100%; height: 100%; display: block; }
#legend { position: absolute; bottom: 16px; left: 16px; z-index: 500; padding: 8px 12px; border-radius: 6px; background: #fff; color: ${color}; }
#error { position: absolute; inset: 16px auto auto 50%; transform: translateX(-50%); z-index: 600; background: white; }
</style>
</head>
<body>
<main>
<div id="map" aria-label="${title}"></div>
<div id="legend">━ Shadow path · ● CA instant · • 60 s steps · ➤ Motion</div>
<div id="error" role="alert"></div>
</main>
<script>
const data = ${json};
const color = "${color}";
(async () => {
${script}
})().catch((error) => {
  document.getElementById("error").textContent = "Could not render map: " + error.message;
});
</script>
</body>
</html>`;
}

const globalAssets = `
<script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js"></script>`;

const globalScript = `
const svg = d3.select("#map").append("svg").attr("class", "globe")
  .attr("viewBox", "0 0 640 640").attr("role", "img").attr("aria-label", "Orthographic shadow path");
const projection = d3.geoOrthographic().translate([320, 304]).scale(284)
  .rotate([-data.center[0], -data.center[1]]);
const path = d3.geoPath(projection);
function draw(shape, fill, stroke, width = 1) {
  return svg.append("path").attr("d", path(shape)).attr("fill", fill)
    .attr("stroke", stroke).attr("stroke-width", width);
}
const sphere = { type: "Sphere" };
draw(sphere, "#e8e8e8", "#777");
try {
  const atlas = await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json");
  draw(topojson.feature(atlas, atlas.objects.countries), "#fafafa", "#999", 0.55);
} catch {
  document.getElementById("error").textContent = "Country boundaries unavailable.";
}
draw(d3.geoGraticule().step([30, 30])(), "none", "#b4b4b4", 0.5);
draw(d3.geoCircle().center(data.antisolar).radius(90)(), "#333", "none").attr("opacity", 0.3);
draw({ type: "MultiLineString", coordinates: data.segments.filter(line => line.length > 1) }, "none", color, 2.5);
function mark(position, time, radius) {
  draw({ type: "Point", coordinates: position }, color, "none")
    .attr("d", path.pointRadius(radius)({ type: "Point", coordinates: position }))
    .append("title").text(time);
}
for (const { position, time } of data.markers) mark(position, time, 3);
if (data.closest) mark(data.closest, data.time, 7);
for (const line of data.segments) {
  const middle = Math.floor(line.length / 2);
  const from = line[middle - 1];
  const to = line[middle];
  if (!from || [from, to].some(point => d3.geoDistance(point, data.center) >= Math.PI / 2)) continue;
  const [x, y] = projection(to);
  const [px, py] = projection(from);
  if (x === px && y === py) continue;
  const angle = Math.atan2(y - py, x - px) * 180 / Math.PI;
  svg.append("path").attr("d", "M 0,0 L -12,-5 L -12,5 Z").attr("fill", color)
    .attr("transform", "translate(" + x + "," + y + ") rotate(" + angle + ") translate(20,0)");
}
draw(sphere, "none", "#777");
`;

const leafletAssets = `
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css">
<script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>`;

const leafletScript = `
const map = L.map("map", { minZoom: 1 });
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);
const near = (lon, reference) => reference + ((lon - reference + 180) % 360 + 360) % 360 - 180;
const bounds = L.latLngBounds([]);
const lines = data.segments.map(line => {
  let reference = data.center[0];
  return line.map(([lon, lat]) => {
    reference = near(lon, reference);
    const point = [lat, reference];
    bounds.extend(point);
    return point;
  });
});
const reset = () => map.fitBounds(bounds, { padding: [30, 30], maxZoom: 6 });
reset();
const resetControl = L.control({ position: "topleft" });
resetControl.onAdd = () => {
  const box = L.DomUtil.create("div", "leaflet-bar");
  const button = L.DomUtil.create("button", "", box);
  button.type = "button";
  button.textContent = "↺";
  button.title = "Reset view";
  button.setAttribute("aria-label", "Reset view");
  L.DomEvent.disableClickPropagation(box);
  L.DomEvent.on(button, "click", reset);
  return box;
};
resetControl.addTo(map);

const [nightLon, nightLat] = data.antisolar;
const rad = Math.PI / 180;
const declination = (Math.abs(nightLat) < 0.001 ? 0.001 : nightLat) * rad;
const pole = Math.sign(declination) * 85.051129;
for (const shift of [-360, 0, 360]) {
  const west = data.center[0] + shift - 180;
  const edge = Array.from({ length: 721 }, (_, i) => {
    const lon = west + i / 2;
    const lat = Math.atan(-Math.cos((lon - nightLon) * rad) / Math.tan(declination)) / rad;
    return [Math.max(-85.051129, Math.min(85.051129, lat)), lon];
  });
  L.polygon([...edge, [pole, west + 360], [pole, west]], {
    stroke: false, fillColor: "#263950", fillOpacity: 0.2, interactive: false,
  }).addTo(map);
}
for (const line of lines) L.polyline(line, { color, weight: 2.5 }).addTo(map);
function mark([lon, lat], time, radius) {
  L.circleMarker([lat, near(lon, bounds.getCenter().lng)], {
    radius, color, fillColor: color, fillOpacity: 1,
  }).bindTooltip(time).addTo(map);
}
for (const { position, time } of data.markers) mark(position, time, 4);
if (data.closest) mark(data.closest, data.time, 8);

const arrows = L.layerGroup().addTo(map);
function drawMotion() {
  arrows.clearLayers();
  for (const line of lines) {
    const middle = Math.floor(line.length / 2);
    if (!middle) continue;
    const tip = map.latLngToLayerPoint(line[middle]);
    let start = tip;
    for (let i = middle - 1; i >= 0 && start.distanceTo(tip) < 12; i--) {
      start = map.latLngToLayerPoint(line[i]);
    }
    const length = tip.distanceTo(start);
    if (length < 12) continue;
    const dx = (tip.x - start.x) / length;
    const dy = (tip.y - start.y) / length;
    const head = tip.add([18 * dx, 18 * dy]);
    const wing = sign => head.add([-10 * dx - sign * 5 * dy, -10 * dy + sign * 5 * dx]);
    L.polygon([head, wing(-1), wing(1)].map(p => map.layerPointToLatLng(p)), {
      color, fillOpacity: 1, interactive: false, weight: 1,
    }).addTo(arrows);
  }
}
map.on("zoomend", drawMotion);
drawMotion();
`;

/** Generates an HTML document with an orthographic view of one prediction. */
export async function generateGlobalMap(input, options) {
  return mapDocument(await loadMapData(input, options), "Global occultation view", globalAssets, globalScript);
}

/** Generates an HTML document with an interactive Leaflet map of one prediction. */
export async function generateInteractiveMap(input, options) {
  return mapDocument(await loadMapData(input, options), "Interactive occultation map", leafletAssets, leafletScript);
}
