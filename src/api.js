import { OccJSError } from "./errors.js";

const BASE_URL = "https://solarsystem.linea.org.br/api/";

export async function request(endpoint, params = {}) {
  const url = new URL(endpoint.replace(/^\/+/, ""), BASE_URL);

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    url.searchParams.set(
      key,
      Array.isArray(value) ? value.join(",") : String(value),
    );
  }

  return requestJson(url, "LineA");
}

export async function requestJson(url, service) {
  let response;

  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    throw new OccJSError(
      `Could not connect to the ${service} API: ${error.message}`,
    );
  }

  if (!response.ok) {
    const details = await response.text();

    throw new OccJSError(
      `${service} API returned HTTP ${response.status}`,
      response.status,
      details,
    );
  }

  try {
    return await response.json();
  } catch {
    throw new OccJSError(
      `${service} API returned an invalid JSON response.`,
      response.status,
    );
  }
}
