import { Prediction } from "../src/index.js";

const prediction = new Prediction();
console.log(await prediction.byName("Chariklo", { limit: 3 }));
console.log(await prediction.byNumber(10199, { limit: 3 }));
console.log(await prediction.byProvisionalDesignation("1997 CU26", { limit: 3 }));

const controller = new AbortController();
const events = await prediction.getData({
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * 86400000),
  maxMagnitude: 14,
  minDuration: 0.5,
  minMagnitudeDrop: 0.1,
}, {
  limit: 5,
  signal: controller.signal,
  onProgress: ({ page, totalPages }) => console.log(page, totalPages),
});
console.log(events);
// Chame controller.abort() para cancelar uma consulta em andamento.

console.log(await prediction.asteroidsWithPrediction());
console.log(await prediction.dynamicalClassesWithPrediction());
console.log(await prediction.dynamicalSubclassesWithPrediction());

const [first] = await prediction.getData({}, { limit: 1 });
if (first) {
  console.log(await prediction.getPrediction(first.id));
  console.log(await prediction.getOccultationPaths(first.id));
  console.log(await prediction.getOccultationMap(first.id));
}

import { getPredictions, getPrediction, getOccultationPaths, getOccultationMap } from "../src/index.js";

const [event] = await getPredictions({ asteroid: "Chariklo", limit: 1 });
if (event) {
  console.log(await getPrediction(event.id));
  console.log(await getOccultationPaths(event.id));
  console.log(await getOccultationMap(event.id));
}
