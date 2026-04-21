// scripts/probe-sessions.js
// Diagnostic : list last 20 Strava activities (type, date, duration, distance)
import { fetchRecentActivities } from "./strava.js";

const activities = await fetchRecentActivities(30);
activities.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

const last20 = activities.slice(0, 20);

console.log(`\n=== 20 dernières activités Strava ===\n`);
for (const a of last20) {
  const date = new Date(a.start_date_local);
  const dateStr = date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  const dur = a.moving_time || 0;
  const h = Math.floor(dur / 3600);
  const m = Math.floor((dur % 3600) / 60);
  const durStr = h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m}min`;
  const dist = a.distance ? (a.distance / 1000).toFixed(2) + "km" : "—";
  console.log(`${dateStr}  ${a.type.padEnd(12)} ${durStr.padStart(6)}  ${dist.padStart(10)}  "${a.name}"`);
}

// Zoom sur les Swim
const swims = activities.filter(a => a.type === "Swim");
console.log(`\n=== ${swims.length} activités Swim détectées sur toute la période ===\n`);
for (const a of swims.slice(0, 15)) {
  const date = new Date(a.start_date_local);
  const dateStr = date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  const dur = a.moving_time || 0;
  const m = Math.round(dur / 60);
  const dist = a.distance ? Math.round(a.distance) + "m" : "—";
  console.log(`${dateStr}  ${String(m).padStart(3)}min  ${dist.padStart(6)}  "${a.name}"`);
}
