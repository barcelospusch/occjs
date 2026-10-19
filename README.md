# occjs

> Biblioteca JavaScript / TypeScript para consulta de predições de ocultações estelares e corpos menores do Sistema Solar através da API do **LIneA Solar System Portal**.
> Projetada com recursos e funções equivalentes ao módulo Python oficial do LineA ([`lineaSSP`](https://solarsystem.linea.org.br/docs/user-guide/python_module/)).

---

## 🚀 Instalação

```bash
npm install @dimitri.pusch/occjs
```

Compatível com **Node.js >= 18**, navegadores modernos, Bun e Deno. Suporte nativo a ESM e tipagens TypeScript (`index.d.ts`).

---

## ⚡ Equivalência com o LineA-SSP (Python vs JavaScript)

O `occjs` implementa as classes, métodos e funções utilitárias correspondentes ao módulo Python `lineaSSP`, utilizando o padrão idiomático **camelCase** do ecossistema JavaScript:

| Recurso Python (`lineaSSP`) | Equivalente JavaScript (`occjs`) |
| :--- | :--- |
| `prediction_api = Prediction()` | `const predictionApi = new Prediction();` |
| `asteroid_api = Asteroid()` | `const asteroidApi = new Asteroid();` |
| `prediction_api.by_name('Chariklo', limit='all')` | `await predictionApi.byName('Chariklo', { limit: 'all' })` |
| `prediction_api.by_number(10199)` | `await predictionApi.byNumber(10199)` |
| `prediction_api.by_provisional_designation('1997 CU26')` | `await predictionApi.byProvisionalDesignation('1997 CU26')` |
| `prediction_api.asteroids_with_prediction()` | `await predictionApi.asteroidsWithPrediction()` |
| `prediction_api.dynamical_classes_with_prediction()` | `await predictionApi.dynamicalClassesWithPrediction()` |
| `prediction_api.dynamical_subclasses_with_prediction()` | `await predictionApi.dynamicalSubclassesWithPrediction()` |
| `prediction_api.get_data(params=params)` | `await predictionApi.getData(params)` |
| `asteroid_api.by_name('Ceres')` | `await asteroidApi.byName('Ceres')` |
| `asteroid_api.count()` | `await asteroidApi.count()` |
| `asteroid_api.dynamical_classes()` | `await asteroidApi.dynamicalClasses()` |
| `asteroid_api.dynamical_subclasses()` | `await asteroidApi.dynamicalSubclasses()` |
| `asteroid_api.with_prediction('1950 DA')` | `await asteroidApi.withPrediction('1950 DA')` |
| `asteroid_api.get_predictions_by_name('Chariklo')` | `await asteroidApi.getPredictionsByName('Chariklo')` |
| `geofilter(data, latitude=lat, longitude=lon, radius=r)` | `geofilter(data, { latitude, longitude, radius })` ou `geofilter(data, lat, lon, r)` |
| `generate_map(data=occultations, path='./')` | `await generateMap(occultations, { path: './' })` |

---

## 📖 Guia de Uso

### 1. Inicializando as APIs

```javascript
import { Prediction, Asteroid } from "@dimitri.pusch/occjs";

const predictionApi = new Prediction();
const asteroidApi = new Asteroid();
```

Você também pode utilizar o cliente unificado `LineASSP`:

```javascript
import { LineASSP } from "@dimitri.pusch/occjs";

const linea = new LineASSP();
// linea.prediction e linea.asteroid
```

---

### 2. Buscando Asteroides por Nome

```javascript
import { Asteroid } from "@dimitri.pusch/occjs";

const asteroidApi = new Asteroid();
const ceres = await asteroidApi.byName("Ceres");

console.log(ceres);
// { id: 1, name: 'Ceres', number: 1, base_dynclass: 'Main Belt', ... }
```

Outros métodos da classe `Asteroid`:
```javascript
// Total de asteroides registrados
const total = await asteroidApi.count();

// Classes dinâmicas e subclasses Skybot
const dynClasses = await asteroidApi.dynamicalClasses();
const subClasses = await asteroidApi.dynamicalSubclasses();

// Detalhes de um asteroide com predição disponível
const da1950 = await asteroidApi.withPrediction("1950 DA");
```

---

### 3. Listando Asteroides com Predições Disponíveis

```javascript
import { Prediction } from "@dimitri.pusch/occjs";

const predictionApi = new Prediction();
const asteroids = await predictionApi.asteroidsWithPrediction();

console.log(asteroids.slice(0, 5));
// ['1950 DA', '1972 RB', '1973 NA', '1974 MA', '1977 QQ5']
```

---

### 4. Predições de Ocultação por Nome de Asteroide

```javascript
import { Prediction } from "@dimitri.pusch/occjs";

const predictionApi = new Prediction();

// Use limit: 'all' para recuperar todas as predições paginadas automaticamente
const predictions = await predictionApi.byName("Chariklo", { limit: "all" });

console.log(`Encontradas ${predictions.length} predições.`);
```

> **Nota sobre Paginação:** Por padrão, a API do LineA pagina os resultados a cada 1000 registros. Quando `limit: 'all'` (ou um número maior que 1000) é especificado, a biblioteca faz o fetch automático de todas as páginas necessárias. Você também pode passar um callback `onProgress`:
>
> ```javascript
> const results = await predictionApi.byName("Chariklo", {
>   limit: "all",
>   onProgress: ({ page, totalPages, fetched, total }) => {
>     console.log(`Carregando página ${page}/${totalPages} (${fetched}/${total})`);
>   }
> });
> ```

---

### 5. Predições por Intervalo de Datas e Parâmetros

```javascript
import { Prediction } from "@dimitri.pusch/occjs";

const predictionApi = new Prediction();

const params = {
  date_time_after: "2024-06-28T00:00:00Z",
  date_time_before: "2024-06-29T23:59:59Z",
  magnitude_max: 12,
  nightside: true,
  local_solar_time_after: "21:00",
  local_solar_time_before: "03:00",
};

const predictions = await predictionApi.getData(params, { limit: 100 });
```

---

### 6. Filtrando Predições por Localização Geográfica com `geofilter`

O `geofilter` calcula com precisão esférica se a faixa de sombra/caminho da ocultação (`occ_path_coeff`) passa a uma distância menor ou igual a `radius` (em km) do observador, considerando também a condição noturna (posição solar):

```javascript
import { Prediction, geofilter } from "@dimitri.pusch/occjs";

const predictionApi = new Prediction();

// 1. Consulta eventos em um período
const predictions = await predictionApi.getData({
  date_time_after: "2024-01-01T00:00:00Z",
  date_time_before: "2024-12-31T23:59:59Z",
}, { limit: 50 });

// 2. Filtra pela visibilidade geográfica em São Paulo (Brasil)
const filtered = geofilter(predictions, {
  latitude: -23.55,
  longitude: -46.63,
  radius: 200, // raio de busca em quilômetros
});

console.log(`${filtered.length} eventos visíveis na sua região!`);
```

Você também pode utilizar a assinatura posicional idêntica ao Python:
```javascript
const filtered = geofilter(predictions, -23.55, -46.63, 200);
```

---

### 7. Gerando ou Obtendo Mapas de Ocultação com `generateMap`

```javascript
import { generateMap } from "@dimitri.pusch/occjs";

// Obtém o mapa de um evento (ou array de eventos)
const mapInfo = await generateMap(filtered[0]);
console.log("URL da imagem do mapa:", mapInfo.url);

// No Node.js, você pode salvar a imagem diretamente em disco:
await generateMap(filtered, { path: "./maps" });
```

---

### 8. Gerando Relatórios nos Formatos IOTA e CORA

A biblioteca permite gerar relatórios técnicos padronizados para predições de ocultações e asteroides nos formatos da **IOTA** (*International Occultation Timing Association*) e da **CORA** (*Collaborative Occultation Resources & Archive*):

```javascript
import {
  Prediction,
  Asteroid,
  formatIotaReport,
  formatCoraReport,
  generateIotaReport,
  generateCoraReport,
} from "@dimitri.pusch/occjs";

const predictionApi = new Prediction();
const asteroidApi = new Asteroid();

// 1. Relatório IOTA para uma Predição (com dados opcionais do observador)
const pred = await predictionApi.byName("Chariklo", { limit: 1 });
const iotaReport = formatIotaReport(pred, {
  observerName: "Dimitri Pusch",
  siteName: "Observatório Local",
  latitude: -25.43,
  longitude: -49.27,
  elevation: 930,
  telescope: "Schmidt-Cassegrain 8''",
});
console.log(iotaReport);

// 2. Relatório CORA para uma Predição
const coraReport = formatCoraReport(pred);
console.log(coraReport);

// 3. Relatório IOTA / CORA para um Asteroide
const ceres = await asteroidApi.byName("Ceres");
console.log(formatIotaReport(ceres));
console.log(formatCoraReport(ceres));

// Ou gerando diretamente a partir do ID ou nome:
const autoReport = await generateIotaReport("Odysseus");
console.log(autoReport);
```

---

## 🧪 Testes

Para executar os testes unitários e de integração com a API ao vivo:

```bash
node --test
```

---

## 📄 Licença

MIT © Dimitri Barcelos Pusch & colaboradores.
