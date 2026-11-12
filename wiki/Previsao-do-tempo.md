# Previsão do tempo

Na raiz do repositório, execute `node examples/previsao-do-tempo.js`. Os blocos abaixo seguem a ordem do arquivo.

A opção `includeWeather: true` consulta o Open-Meteo para a hora UTC de cada evento nas coordenadas do observador. O alcance é de até 16 dias a partir do início do dia UTC. O resultado informa a condição em português e a umidade relativa quando disponíveis.

```js
import { getPredictions, getPrediction, Prediction } from "@dimitri.pusch/occjs";

const weather = { includeWeather: true, latitude: -23.55, longitude: -46.63 };
const startDate = new Date();
const endDate = new Date(startDate);
endDate.setUTCHours(0, 0, 0, 0);
endDate.setUTCDate(endDate.getUTCDate() + 16);
const events = await getPredictions({
  ...weather, startDate, endDate: new Date(+endDate - 1), limit: 5,
});
for (const event of events) {
  console.log(event.name, event.weather.available ? event.weather.condition : event.weather.message);
}
if (events[0]) console.log((await getPrediction(events[0].id, weather)).weather);

const prediction = new Prediction();
console.log(await prediction.byName("Chariklo", { ...weather, limit: 1 }));
```

Quando o serviço ou os dados estão indisponíveis, a predição é preservada e `weather.available` recebe `false`. Consulte `weather.reason` e `weather.message` para identificar o motivo.
