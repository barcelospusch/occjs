import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { getPredictions } from "../src/index.js";
import { forecastWindow } from "../src/weather.js";

const terminal = createInterface({ input: stdin, output: stdout });
try {
  const asteroid = (await terminal.question("Nome do asteroide: ")).trim();
  if (!asteroid) throw new Error("Informe o nome do asteroide.");
  const answer = (await terminal.question("Deseja um resumo da previsão do tempo? (s/n): ")).trim().toLowerCase();
  if (!["s", "sim", "n", "não", "nao"].includes(answer)) {
    throw new Error("Responda s (sim) ou n (não).");
  }
  const includeWeather = ["s", "sim"].includes(answer);
  const options = { asteroid, startDate: new Date(), limit: 10, includeWeather };
  if (includeWeather) {
    const { end } = forecastWindow();
    options.endDate = new Date(end - 1);
    console.log(`Buscando eventos com previsão até ${options.endDate.toISOString()} (UTC).`);
    const latitude = (await terminal.question("Latitude do observador (-90 a 90): ")).trim();
    const longitude = (await terminal.question("Longitude do observador (-180 a 180): ")).trim();
    if (!latitude || !longitude) throw new Error("Informe as duas coordenadas.");
    options.latitude = Number(latitude.replace(",", "."));
    options.longitude = Number(longitude.replace(",", "."));
  }
  const events = await getPredictions(options);
  if (events.length === 0) {
    console.log(includeWeather
      ? "Nenhum evento encontrado neste local dentro do prazo da previsão. Faça uma busca sem clima para consultar eventos mais distantes."
      : "Nenhum evento encontrado para esta busca.");
  } else {
    console.log(JSON.stringify(events, null, 2));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  terminal.close();
}
