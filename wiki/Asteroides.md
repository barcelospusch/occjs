# Catálogo de asteroides

Na raiz do repositório, execute `node examples/asteroides.js`. Os blocos abaixo seguem a ordem do arquivo.

### Busca e classificação

```js
import { Asteroid } from "@dimitri.pusch/occjs";

const asteroid = new Asteroid();
console.log(await asteroid.getData({}, { limit: 3 }));
console.log(await asteroid.byName("Chariklo"));
console.log(await asteroid.byNumber(10199));
console.log(await asteroid.byProvisionalDesignation("1997 CU26"));
console.log(await asteroid.count());
console.log(await asteroid.dynamicalClasses());
console.log(await asteroid.dynamicalSubclasses());
console.log(await asteroid.withPrediction("Chariklo"));
```

### Predições associadas

Estes métodos consultam as ocultações do asteroide. Passe um limite explícito para restringir a busca.

```js
const options = { limit: 3 };
console.log(await asteroid.getPredictionsByName("Chariklo", options));
console.log(await asteroid.getPredictionsByNumber(10199, options));
console.log(await asteroid.getPredictionsByProvisionalDesignation("1997 CU26", options));
```
