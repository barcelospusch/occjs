# JPL Horizons

Importe as funções de `@occjs/occjs`. As consultas precisam de acesso ao serviço do JPL. [Documentação da API](https://ssd-api.jpl.nasa.gov/doc/horizons.html)

## Resumo de um corpo menor

```js
import { getHorizonsObject } from "@occjs/occjs";

const apophis = await getHorizonsObject("Apophis");
const asteroid = await getHorizonsObject("1999 AN10", { by: "designation" });
console.log(apophis.result, asteroid.result);
```

`result` contém o texto original do Horizons. Em buscas ambíguas, esse texto pode listar os objetos encontrados. `signature` contém `source` e `version`. As consultas tabulares também aceitam `{ by: "designation" }` para identificar o alvo pela designação.

## Efeméride do observador

```js
import { getHorizonsEphemeris } from "@occjs/occjs";

const site = { latitude: -23.55, longitude: -46.63, elevationKm: 0.76 };
const { rows } = await getHorizonsEphemeris("Apophis", {
  times: ["2029-04-13T00:00:00Z", "2029-04-13T00:10:00Z"],
  site,
});
console.log(rows[0].raDeg, rows[0].decDeg, rows[0].altitudeDeg);
```

Para uma amostragem regular, substitua `times` por `start`, `stop` e `step`, por exemplo `step: "10 min"`. Os horários aceitam objetos `Date` ou strings ISO. A resposta usa UT e preserva a data de cada linha em `calendarDate` no formato do Horizons.

Sem `site`, a consulta usa o geocentro. Para observações locais, informe latitude e longitude em graus, com longitudes positivas a leste, e a elevação opcional em quilômetros. A elevação padrão é zero.

As linhas trazem RA e Dec astrométricas em graus, magnitude, distância em UA, velocidade radial em km/s e elongação solar em graus. Com `site`, incluem azimute, altitude e massa de ar. `pointingUncertainty3SigmaArcsec` representa a incerteza de apontamento de 3 sigma em segundos de arco. Campos numéricos indisponíveis são `null`.

## Observabilidade de uma predição

```js
import { getHorizonsObservability, LineASSP } from "@occjs/occjs";

const { prediction } = new LineASSP();
const [event] = await prediction.byName("Chariklo", { limit: 1 });
if (event) {
  const site = { latitude: -23.55, longitude: -46.63 };
  const local = await getHorizonsObservability(event, site);
  console.log(local.altitudeDeg, local.azimuthDeg, local.airmass, local.solarElongationDeg);
}
```

A função consulta uma linha de efeméride no horário `date_time` da predição. Para verificar se a trajetória da sombra cruza o local, use o [filtro de visibilidade geográfica](Visibilidade-geografica.md).

## Elementos orbitais e vetores de estado

```js
import { getHorizonsOrbit, getHorizonsVectors } from "@occjs/occjs";

const options = { times: ["2029-04-13T00:00:00"] };
const orbit = await getHorizonsOrbit("Apophis", options);
const vectors = await getHorizonsVectors("Apophis", {
  ...options,
  center: "500@10",
  referencePlane: "FRAME",
});
console.log(orbit.rows[0].semiMajorAxisAu, orbit.rows[0].eccentricity);
console.log(vectors.rows[0].positionKm, vectors.rows[0].velocityKmPerSec);
```

As duas funções aceitam instantes específicos ou um intervalo com passo. Informe datas ISO sem fuso, interpretadas em TDB. Cada linha inclui a data juliana e a data de calendário. O centro padrão é o Sol (`500@10`).

`getHorizonsOrbit` retorna elementos osculadores no plano eclíptico, com distâncias em UA, ângulos em graus e período em dias. `getHorizonsVectors` retorna vetores geométricos em km e km/s. O plano padrão é `ECLIPTIC`; `FRAME` seleciona o plano do referencial ICRF.

Para diagnosticar uma falha ou uma consulta tabular ambígua, veja [Configuração, API de baixo nível e erros](API-e-erros.md).
