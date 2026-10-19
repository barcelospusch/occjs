import { Prediction } from "./prediction.js";
import { Asteroid } from "./asteroid.js";

/**
 * Unified client providing access to both Prediction and Asteroid APIs.
 */
export class LineASSP {
  constructor(options = {}) {
    this.prediction = new Prediction(options);
    this.asteroid = new Asteroid(options);
  }
}
