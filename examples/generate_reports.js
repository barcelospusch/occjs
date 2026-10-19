/**
 * Exemplo de geração de relatórios astronômicos nos formatos IOTA e CORA
 * utilizando a biblioteca occjs.
 */

import {
  Prediction,
  Asteroid,
  formatIotaReport,
  formatCoraReport,
  generateIotaReport,
  generateCoraReport,
} from "../src/index.js";

async function main() {
  const predictionApi = new Prediction();
  const asteroidApi = new Asteroid();

  console.log("=== 1. Relatório IOTA para Predição de Ocultação ===");
  const preds = await predictionApi.byName("Chariklo", { limit: 1 });
  const event = Array.isArray(preds) ? preds[0] : preds;

  // Gerando relatório IOTA com dados opcionais do observador/estação
  const iotaPredictionReport = formatIotaReport(event, {
    observerName: "Dimitri Pusch",
    siteName: "Observatório Local",
    latitude: -25.43,
    longitude: -49.27,
    elevation: 930,
    telescope: "Schmidt-Cassegrain 8''",
    detector: "Câmera CMOS de alta velocidade",
    timingSource: "GPS VTI (precisão < 1ms)",
    remarks: "Condições meteorológicas estáveis, céu limpo.",
  });

  console.log(iotaPredictionReport);

  console.log("\n=== 2. Relatório CORA para Predição de Ocultação ===");
  const coraPredictionReport = formatCoraReport(event);
  console.log(coraPredictionReport);

  console.log("\n=== 3. Relatório IOTA para Asteroide (Ceres) ===");
  const ceres = await asteroidApi.byName("Ceres");
  const iotaAsteroidReport = formatIotaReport(ceres);
  console.log(iotaAsteroidReport);

  console.log("\n=== 4. Relatório CORA para Asteroide (Odysseus) ===");
  const coraAsteroidReport = await generateCoraReport("Odysseus");
  console.log(coraAsteroidReport);
}

main().catch(console.error);
