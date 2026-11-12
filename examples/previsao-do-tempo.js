import { getPredictions, getPrediction, Prediction } from "../src/index.js";

const weather = { includeWeather: true, latitude: -23.55, longitude: -46.63 };
const startDate = new Date();
const endDate = new Date(startDate);
endDate.setUTCHours(0, 0, 0, 0);
endDate.setUTCDate(endDate.getUTCDate() + 16);
const events = await getPredictions({
  ...weather, startDate, endDate: new Date(+endDate - 1), limit: 5,
});
for (const event of events) {
  console.log(event.name, event.weather.available ? event.weather.condition : event.weather.message);
}
if (events[0]) console.log((await getPrediction(events[0].id, weather)).weather);

const prediction = new Prediction();
console.log(await prediction.byName("Chariklo", { ...weather, limit: 1 }));
