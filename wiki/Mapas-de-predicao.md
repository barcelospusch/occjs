# Mapas de predição

| Função | Resultado |
| --- | --- |
| `generateGlobalMap` | HTML com globo ortográfico, fronteiras, grade e região noturna. |
| `generateInteractiveMap` | HTML com mapa Leaflet, zoom, deslocamento, botão para restaurar a vista e horários nos marcadores. |
| `generateMap` | Metadados e URL da imagem gerada pelo LIneA, com download opcional no Node.js. |

As duas visualizações HTML exibem a linha central da sombra, o instante de máxima aproximação (CA), marcadores em intervalos de 60 segundos e o sentido do movimento. Ambas aceitam um ID, um hash ou um objeto com `date_time` e `occ_path_coeff`.

## Globo ortográfico e mapa Leaflet

Execute `node examples/mapas-html.js` para gerar os dois mapas com uma trajetória sintética. Passe o ID ou hash como argumento para usar uma predição do LIneA.

```js
import { writeFile } from "node:fs/promises";
import { generateGlobalMap, generateInteractiveMap, Prediction } from "@dimitri.pusch/occjs";

const id = process.argv[2];
const prediction = id ? await new Prediction().getPrediction(id) : {
  date_time: "2026-11-12T03:00:00Z",
  occ_path_coeff: {
    t0: "2026-11-12T03:00:00Z",
    t1: "2026-11-12T03:06:00Z",
    coeff_latitude: [0.1, -23.55],
    coeff_longitude: [0.06, -46.63],
  },
};

await writeFile("global.html", await generateGlobalMap(prediction));
await writeFile("interactive.html", await generateInteractiveMap(prediction));
```

Abra os arquivos no navegador com conexão à internet. O globo usa D3, TopoJSON e as fronteiras do World Atlas. O mapa interativo carrega Leaflet via CDN e usa o mapa-base do OpenStreetMap.

## Dados e coordenadas

O campo `occ_path_coeff` aceita um objeto ou uma string JSON. A visualização usa `coeff_latitude`, `coeff_longitude`, `t0` e `t1`. Os horários nos marcadores estão em UTC. O instante de CA corresponde ao deslocamento zero em relação a `date_time`.

Ao passar um ID ou hash, use `{ baseUrl }` como segundo argumento para consultar outra instância da API. Passe a mesma predição às duas funções para reaproveitar a consulta.

## Imagem gerada pelo LIneA

Execute `node examples/generate_pred_map.js` para buscar uma predição do Chariklo e obter os metadados da imagem. O trecho abaixo mostra também o download para uma pasta no Node.js.

```js
import { generateMap } from "@dimitri.pusch/occjs";

const image = await generateMap("ID_DO_EVENTO", {
  path: "./maps",
  onProgress: (index, total) => console.log(index, total),
});
console.log(image.url, image.localPath);
```
