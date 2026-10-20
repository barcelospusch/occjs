import { fetchWeatherApi } from "openmeteo";

export function forecastWindow(now = new Date()) {
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return { start, end: start + 16 * 86400000 };
}

export function validateWeatherOptions(latitude, longitude) {
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
      !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
    throw new RangeError("Weather requires latitude (-90..90) and longitude (-180..180).");
  }
}

function condition(code) {
  if (code === 0) return "tempo aberto";
  if (code === 1) return "predominantemente aberto";
  if (code === 2) return "parcialmente nublado";
  if (code === 3) return "nublado";
  if ([45, 48].includes(code)) return "neblina";
  if ([51, 53, 55, 56, 57].includes(code)) return "garoa";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "chuva";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "neve";
  if ([95, 96, 99].includes(code)) return "tempestade";
  return null;
}

// A single forecast is shared by every event in this search.
export async function enrichWeather(data, { latitude, longitude, signal }) {
  const events = Array.isArray(data) ? data : [data];
  const { start, end } = forecastWindow();
  const messages = {
    invalid_event_date: "O evento não possui uma data válida para consultar o clima.",
    outside_forecast_range: "A data do evento está fora do alcance da previsão (até 16 dias). Consulte novamente mais perto do evento.",
    weather_api_error: "Não foi possível consultar o serviço meteorológico. Veja details e tente novamente.",
    missing_weather_data: "O serviço não forneceu condições e umidade para a hora do evento.",
  };
  const unavailable = (reason) => ({ available: false, source: "Open-Meteo", reason,
    message: messages[reason], forecastStart: new Date(start).toISOString(),
    forecastEnd: new Date(end).toISOString(),
    ...(reason === "weather_api_error" ? { details: failureDetails } : {}),
  });
  const eventTime = (event) => {
    const value = typeof event.date_time === "string" ? event.date_time.trim() : event.date_time;
    return typeof value === "string"
      ? Date.parse(/[zZ]$|[+-]\d\d:\d\d$/.test(value) ? value : `${value.replace(" ", "T")}Z`)
      : NaN;
  };
  let hourly;
  let codes;
  let humidities;
  let failure;
  let failureDetails;
  if (events.some((event) => eventTime(event) >= start && eventTime(event) < end)) {
    try {
      const responses = await fetchWeatherApi("https://api.open-meteo.com/v1/forecast", {
        latitude, longitude, hourly: ["weather_code", "relative_humidity_2m"],
        timezone: "UTC", forecast_days: 16,
      }, 2, 0.2, 2, { signal: signal ?? AbortSignal.timeout(15000) });
      hourly = responses[0]?.hourly();
      if (!hourly || hourly.interval() <= 0) throw new Error("Invalid hourly response");
      codes = hourly.variables(0)?.valuesArray();
      humidities = hourly.variables(1)?.valuesArray();
    } catch (error) {
      if (signal?.aborted) throw error;
      failure = "weather_api_error";
      failureDetails = error.message;
    }
  }
  const enriched = events.map((event) => {
    const time = eventTime(event);
    let weather;
    if (!Number.isFinite(time)) weather = unavailable("invalid_event_date");
    else if (time < start || time >= end) weather = unavailable("outside_forecast_range");
    else if (failure) weather = unavailable(failure);
    else {
      const index = Math.floor((time / 1000 - Number(hourly.time())) / hourly.interval());
      const code = codes?.[index];
      const humidity = humidities?.[index];
      const description = condition(code);
      weather = description && Number.isFinite(humidity) && humidity >= 0 && humidity <= 100
        ? { available: true, source: "Open-Meteo", latitude, longitude,
          time: new Date((Number(hourly.time()) + index * hourly.interval()) * 1000).toISOString(),
          condition: description, weatherCode: code, relativeHumidity: humidity }
        : unavailable("missing_weather_data");
    }
    return { ...event, weather };
  });
  return Array.isArray(data) ? enriched : enriched[0];
}
