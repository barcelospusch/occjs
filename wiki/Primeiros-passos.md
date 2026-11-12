# Primeiros passos

Instale o pacote em um projeto ESM com Node.js 18 ou posterior. Para rodar os exemplos a partir de um clone do repositório, execute `npm ci` na raiz. Os exemplos de consulta precisam de acesso ao LIneA.

```bash
npm install @dimitri.pusch/occjs
```

```js
import { LineASSP } from "@dimitri.pusch/occjs";

const { prediction, asteroid } = new LineASSP();
console.log(await asteroid.byName("Chariklo"));
console.log(await prediction.byName("Chariklo", { limit: 5 }));
```

Use `prediction.getPrediction(id)` para obter um evento específico. Consulte [Mapas de predição](Mapas-de-predicao.md) para visualizar a trajetória da sombra.

O [README do repositório](https://github.com/barcelospusch/occjs#readme) inclui exemplos de filtros geográficos, relatórios e previsão do tempo.
