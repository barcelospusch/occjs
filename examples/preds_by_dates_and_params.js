import {Prediction} from '../src/prediction.js';

const prediction = new Prediction();

const params={
    date_time_after: "2026-05-07T00:00:00Z",
    date_time_before: "2026-05-07T23:59:59Z",
    nightside: true,
    asteroidNumber: 1143
}

const preds = await prediction.getData(params, {limit: "all"});

console.log(preds);