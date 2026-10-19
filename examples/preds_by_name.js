import {Prediction} from '../src/prediction.js';

const prediction = new Prediction();

const preds = await prediction.byName('Odysseus', {limit: "all"});

console.log(preds.length);