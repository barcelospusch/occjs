# Predições de ocultação

Na raiz do repositório, execute `node examples/predicoes.js`. Os blocos abaixo seguem a ordem do arquivo.

As consultas por nome, número ou designação podem devolver um objeto quando encontram um único resultado. `getData` retorna uma lista nas consultas sem ID. As datas aceitam objetos `Date` ou strings ISO 8601.

### Busca por objeto

```js
import { Prediction } from "@dimitri.pusch/occjs";

const prediction = new Prediction();
console.log(await prediction.byName("Chariklo", { limit: 3 }));
console.log(await prediction.byNumber(10199, { limit: 3 }));
console.log(await prediction.byProvisionalDesignation("1997 CU26", { limit: 3 }));
```

### Filtros, paginação e cancelamento

Use `limit: "all"` para buscar todas as páginas. `onProgress` recebe a página atual, o total de páginas, a quantidade obtida e o total de registros. O sinal permite cancelar a consulta.

```js
const controller = new AbortController();
const events = await prediction.getData({
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * 86400000),
  maxMagnitude: 14,
  minDuration: 0.5,
  minMagnitudeDrop: 0.1,
}, {
  limit: 5,
  signal: controller.signal,
  onProgress: ({ page, totalPages }) => console.log(page, totalPages),
});
console.log(events);
// Chame controller.abort() para cancelar uma consulta em andamento.
```

### Catálogos e detalhes de eventos

```js
console.log(await prediction.asteroidsWithPrediction());
console.log(await prediction.dynamicalClassesWithPrediction());
console.log(await prediction.dynamicalSubclassesWithPrediction());

const [first] = await prediction.getData({}, { limit: 1 });
if (first) {
  console.log(await prediction.getPrediction(first.id));
  console.log(await prediction.getOccultationPaths(first.id));
  console.log(await prediction.getOccultationMap(first.id));
}
```

### Funções de conveniência

```js
import { getPredictions, getPrediction, getOccultationPaths, getOccultationMap } from "@dimitri.pusch/occjs";

const [event] = await getPredictions({ asteroid: "Chariklo", limit: 1 });
if (event) {
  console.log(await getPrediction(event.id));
  console.log(await getOccultationPaths(event.id));
  console.log(await getOccultationMap(event.id));
}
```
