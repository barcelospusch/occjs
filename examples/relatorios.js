import {
  Prediction, Asteroid, formatIotaReport, formatCoraReport,
  generateIotaReport, generateCoraReport,
} from "../src/index.js";

const event = { id: 1, name: "Chariklo", date_time: "2026-11-12T03:00:00Z" };
const observer = { observerName: "Ana Silva", latitude: -23.55, longitude: -46.63 };
console.log(formatIotaReport(event, observer));
console.log(formatCoraReport(event));
console.log(await generateIotaReport(event, observer));
console.log(await generateCoraReport(event));

const prediction = new Prediction();
console.log(await prediction.generateIotaReport(event, observer));
console.log(await prediction.generateCoraReport(event));

const asteroid = new Asteroid();
const body = { name: "Chariklo", number: 10199 };
console.log(await asteroid.generateIotaReport(body, observer));
console.log(await asteroid.generateCoraReport(body));
