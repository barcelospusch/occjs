# Visibilidade geográfica

Na raiz do repositório, execute `node examples/visibilidade.js`. Os blocos abaixo seguem a ordem do arquivo.

### Filtro remoto

O LIneA pode restringir a consulta por localização, raio em quilômetros e lado noturno.

```js
import { getPredictions } from "@dimitri.pusch/occjs";

const candidates = await getPredictions({
  latitude: -23.55,
  longitude: -46.63,
  radius: 300,
  nighttime: true,
  limit: 10,
});
console.log(candidates);
```

### Filtro local e cálculo da trajetória

`geofilter` usa os coeficientes já presentes em cada predição. O exemplo usa um evento sintético para que os cálculos locais possam ser reproduzidos.

```js
import {
  geofilter, visibilityFromCoeff, buildPathFromCoeff, calculatePathVisibility,
  isNighttime, pathArc, polyval,
} from "@dimitri.pusch/occjs";

const latitude = -23.55;
const longitude = -46.63;
const radius = 300;
const dateTime = "2026-11-12T03:00:00Z";
const coeff = {
  t0: dateTime,
  t1: "2026-11-12T03:03:00Z",
  coeff_latitude: [0.01, latitude],
  coeff_longitude: [0.02, longitude],
};
const events = [{ date_time: dateTime, occ_path_coeff: coeff }];
console.log(geofilter(events, { latitude, longitude, radius, checkNighttime: false }));
console.log(geofilter(events, latitude, longitude, radius, { checkNighttime: false }));
console.log(visibilityFromCoeff({
  latitude, longitude, radius, dateTime, occPathCoeff: coeff, checkNighttime: false,
}));
const points = buildPathFromCoeff(coeff.coeff_longitude, coeff.coeff_latitude, coeff.t0, coeff.t1, 301);
console.log(calculatePathVisibility(latitude, longitude, points, radius));
console.log(isNighttime(latitude, longitude, dateTime));
console.log(pathArc(latitude, longitude, -22.90, -43.17)); // km
console.log(polyval(coeff.coeff_longitude, 60)); // longitude aos +60 s
```
