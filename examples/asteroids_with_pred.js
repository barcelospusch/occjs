import {Prediction} from '../src/prediction.js';

const prediction = new Prediction();
const asteroids = await prediction.asteroidsWithPrediction();

console.log(asteroids.slice(0, 5));