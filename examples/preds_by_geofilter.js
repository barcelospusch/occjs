import { Prediction, geofilter } from "../src/index.js";

import {generateMap} from "../src/index.js"

const prediction = new Prediction();

const preds = await prediction.getData(
  {
    date_time_after: "2026-05-07T00:00:00Z",
    date_time_before: "2026-05-07T23:59:59Z",
    nightside: true,
  },
  {
    limit: 1000,
  },
);

const filtered = geofilter(
    preds,-15.656951864769011, -47.86790108980299,
    50
);

console.log(filtered[0]);

// const mapInfo = await generateMap(filtered[0]);
// console.log(mapInfo.url);
