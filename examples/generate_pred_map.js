import { Prediction, generateMap } from "../src/index.js";

const prediction = new Prediction();

// Obtém predição para o asteroide Chariklo
const preds = await prediction.byName("Chariklo", { limit: 1 });
const event = Array.isArray(preds) ? preds[0] : preds;

console.log("Evento obtido:", event.name, event.date_time);

// Gera ou recupera o mapa de ocultação
const mapInfo = await generateMap(event);

console.log("URL do mapa:", mapInfo.url);
