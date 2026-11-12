import { writeFile } from "node:fs/promises";
import { generateGlobalMap, generateInteractiveMap, Prediction } from "../src/index.js";

const id = process.argv[2];
const prediction = id ? await new Prediction().getPrediction(id) : {
  date_time: "2026-11-12T03:00:00Z",
  occ_path_coeff: {
    t0: "2026-11-12T03:00:00Z",
    t1: "2026-11-12T03:06:00Z",
    coeff_latitude: [0.1, -23.55],
    coeff_longitude: [0.06, -46.63],
  },
};

await writeFile("global.html", await generateGlobalMap(prediction));
await writeFile("interactive.html", await generateInteractiveMap(prediction));
