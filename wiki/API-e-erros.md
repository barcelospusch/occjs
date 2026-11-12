# Configuração, API de baixo nível e erros

Na raiz do repositório, execute `node examples/api-e-erros.js`. Os blocos abaixo seguem a ordem do arquivo.

`LineASSP` cria clientes de predição e de asteroides com a mesma configuração. `BaseAPI` permite apontar diretamente para um endpoint. `request` consulta o endpoint informado na API pública do LIneA e devolve o JSON da resposta.

```js
import {
  LineASSP, BaseAPI, DEFAULT_BASE_URL, DEFAULT_PAGE_SIZE,
  request, OccJSError, InvalidDatetimeFormatError,
} from "@dimitri.pusch/occjs";

const client = new LineASSP({ baseUrl: DEFAULT_BASE_URL, pageSize: DEFAULT_PAGE_SIZE });
const catalog = new BaseAPI({ baseUrl: DEFAULT_BASE_URL, endpoint: "/api/asteroids" });

try {
  console.log(await client.prediction.getData({}, { limit: 1 }));
  console.log(await client.asteroid.count());
  console.log(await catalog.getData({}, { limit: 1 }));
  console.log(await request("asteroids/count/"));
  await client.prediction.getData({ startDate: "data inválida" });
} catch (error) {
  if (error instanceof InvalidDatetimeFormatError) {
    console.error(error.message);
  } else if (error instanceof OccJSError) {
    console.error(error.status, error.message, error.details);
  } else {
    throw error;
  }
}
```

As declarações TypeScript ficam em `index.d.ts`. Em JavaScript, os exemplos desta página usam os exports do pacote.
