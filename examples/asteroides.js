import { Asteroid } from "../src/index.js";

const asteroid = new Asteroid();
console.log(await asteroid.getData({}, { limit: 3 }));
console.log(await asteroid.byName("Chariklo"));
console.log(await asteroid.byNumber(10199));
console.log(await asteroid.byProvisionalDesignation("1997 CU26"));
console.log(await asteroid.count());
console.log(await asteroid.dynamicalClasses());
console.log(await asteroid.dynamicalSubclasses());
console.log(await asteroid.withPrediction("Chariklo"));

const options = { limit: 3 };
console.log(await asteroid.getPredictionsByName("Chariklo", options));
console.log(await asteroid.getPredictionsByNumber(10199, options));
console.log(await asteroid.getPredictionsByProvisionalDesignation("1997 CU26", options));
