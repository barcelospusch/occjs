import {Asteroid} from "../src/asteroid.js";

const asteroid = new Asteroid();

const odysseus = await asteroid.byName("Odysseus");

console.log(odysseus);