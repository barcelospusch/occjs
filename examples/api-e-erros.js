import {
  LineASSP, BaseAPI, DEFAULT_BASE_URL, DEFAULT_PAGE_SIZE,
  request, OccJSError, InvalidDatetimeFormatError,
} from "../src/index.js";

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
