import { getPredictions } from "occjs";

const events = await getPredictions({
  latitude: -25.43,
  longitude: -49.27,
  radius: 100,
  nighttime: true,
  startDate: "2026-10-15T00:00:00Z",
  endDate: "2026-10-16T00:00:00Z",
  limit: 100
});

console.log(events)