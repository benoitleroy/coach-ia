// scripts/carnet.js
// Moteur du CARNET : transforme la liste brute d'activités Strava en 5 facteurs
// lisibles (volume, charge, intensité, régularité, dernière séance).
//
//   import { buildCarnet } from "./carnet.js";
//   const carnet = buildCarnet(activities, new Date());
//
// Lancé directement (node scripts/carnet.js) → relit le cache Strava local et
// écrit js/carnet-data.js sans appeler l'API (pratique pour tester).

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ACT_CACHE = path.join(__dirname, ".activities.cache.json");
const OUTPUT    = path.join(__dirname, "../js/carnet-data.js");

const DAY = 86400 * 1000;

// ─── Disciplines ─────────────────────────────────────────────────────────────

export const DISCIPLINES = {
  natation: { label: "Natation", icone: "🏊", types: ["Swim"] },
  velo:     { label: "Vélo",     icone: "🚴", types: ["Ride", "VirtualRide", "GravelRide", "MountainBikeRide"] },
  course:   { label: "Course",   icone: "🏃", types: ["Run", "VirtualRun", "TrailRun"] },
  // Tout le reste (Pilates, renfo, HIIT, rando, VTT électrique…) : compte dans
  // le volume et la charge, mais pas dans les km "triathlon".
  autre:    { label: "Renfo & autre", icone: "💪", types: [] },
};

export const TYPE_LABELS = {
  Pilates: "Pilates", Workout: "Renfo", WeightTraining: "Muscu", HighIntensityIntervalTraining: "HIIT",
  Hike: "Rando", Walk: "Marche", EMountainBikeRide: "VTT élec.", EBikeRide: "Vélo élec.", Yoga: "Yoga",
  Rowing: "Rameur", Elliptical: "Elliptique", StairStepper: "Escaliers", Crossfit: "Crossfit",
};

export function disciplineOf(activity) {
  const t = activity.sport_type || activity.type;
  for (const [key, d] of Object.entries(DISCIPLINES)) {
    if (d.types.includes(t)) return key;
  }
  return "autre";
}

// ─── Effort par séance (même règle que sync.js) ───────────────────────────────

export function effortScore(a) {
  if (a.suffer_score && a.suffer_score > 0) return a.suffer_score;
  const hours = (a.moving_time || 0) / 3600;
  const hr = a.average_heartrate || 130;
  const f = hr > 160 ? 80 : hr > 145 ? 60 : hr > 130 ? 45 : 30;
  return Math.round(hours * f);
}

// ─── Semaines ISO ─────────────────────────────────────────────────────────────

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

// Strava fournit start_date_local suffixé "Z" alors que c'est l'heure locale :
// on retire le Z pour que JS l'interprète comme locale (sinon décalage de 2 h).
export function localDate(a) {
  const s = a.start_date_local || a.start_date;
  return new Date(a.start_date_local ? s.replace(/Z$/, "") : s);
}

export function isoWeekStart(d) {
  const x = startOfDay(d);
  const day = x.getDay() || 7;
  x.setDate(x.getDate() - (day - 1));
  return x;
}

export function isoWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / DAY + 1) / 7);
}

// ─── Charge : EWMA 7 j / 28 j + garde-fou « reprise » ────────────────────────
//
// Pourquoi pas les fenêtres glissantes classiques ? Parce qu'après une pause la
// chronique s'effondre et la première séance de reprise affiche « surcharge ».
// L'EWMA (Williams 2017) lisse ça, et on ajoute deux gardes-fous :
//   1. si la chronique est < 40 % d'une semaine « typique » (médiane des
//      semaines actives sur 1 an), on est en REPRISE : on affiche le ratio
//      mais on ne juge pas ;
//   2. si moins de 4 séances sur 28 j, idem — pas assez de base pour juger ;
//   3. ratio > 1.3 mais semaine encore sous la semaine typique → REMONTÉE.

export function computeCharge(activities, now) {
  const today = startOfDay(now);
  const N = 120; // jours d'historique utilisés pour amorcer les EWMA
  const daily = new Array(N).fill(0);
  activities.forEach(a => {
    const d = Math.floor((today - startOfDay(localDate(a))) / DAY);
    if (d >= 0 && d < N) daily[N - 1 - d] += effortScore(a);
  });

  const lamA = 2 / (7 + 1), lamC = 2 / (28 + 1);
  let ewmaA = 0, ewmaC = 0;
  daily.forEach(v => {
    ewmaA = v * lamA + (1 - lamA) * ewmaA;
    ewmaC = v * lamC + (1 - lamC) * ewmaC;
  });
  // Exprimés en « charge hebdo équivalente » pour rester lisibles
  const aigue = Math.round(ewmaA * 7);
  const chronique = Math.round(ewmaC * 7);

  // Fenêtres brutes (pour affichage / comparaison)
  const sum7  = daily.slice(-7).reduce((s, v) => s + v, 0);
  const sum28 = daily.slice(-28).reduce((s, v) => s + v, 0);
  const nb28  = activities.filter(a => (today - startOfDay(localDate(a))) / DAY < 28).length;

  // Semaine « typique » : médiane des semaines actives sur 1 an
  const weekly = {};
  activities.forEach(a => {
    const d = Math.floor((today - startOfDay(localDate(a))) / DAY);
    if (d >= 0 && d < 364) { const w = Math.floor(d / 7); weekly[w] = (weekly[w] || 0) + effortScore(a); }
  });
  const actives = Object.values(weekly).filter(v => v > 0).sort((a, b) => a - b);
  const typique = actives.length ? actives[Math.floor(actives.length / 2)] : 0;

  let ratio = null, statut;
  if (sum28 === 0)                      statut = "no-data";
  else if (sum7 === 0)                  statut = "repos";
  else {
    ratio = chronique > 0 ? Math.round((aigue / chronique) * 100) / 100 : null;
    if (nb28 < 4 || (typique > 0 && chronique < 0.4 * typique)) statut = "reprise";
    else if (ratio === null)            statut = "no-data";
    // Ratio élevé mais semaine encore sous ta semaine normale : c'est une
    // remontée, pas une surcharge.
    else if (ratio > 1.3 && aigue <= typique) statut = "remontee";
    else if (ratio > 1.3)               statut = "haute";
    else if (ratio < 0.8)               statut = "basse";
    else                                statut = "ok";
  }

  return { ratio, statut, aigue, chronique, sum7, sum28, nb28, typique };
}

// ─── Construction du carnet ──────────────────────────────────────────────────

function emptyWeek() {
  const w = { sec: 0, km: 0, count: 0, effort: 0, longest: null, disc: {}, autres: {} };
  for (const k of Object.keys(DISCIPLINES)) w.disc[k] = { sec: 0, km: 0, count: 0 };
  return w;
}

export function buildCarnet(activities, now = new Date(), nWeeks = 12) {
  const acts = [...activities].sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
  const today = startOfDay(now);
  const curStart = isoWeekStart(today);

  // 12 dernières semaines + la courante → index 0 = la plus ancienne
  const weeks = [];
  for (let i = nWeeks; i >= 0; i--) {
    const start = new Date(curStart); start.setDate(start.getDate() - i * 7);
    const end = new Date(start); end.setDate(end.getDate() + 7);
    weeks.push({ start, end, label: `S${isoWeekNumber(start)}`, ...emptyWeek() });
  }

  acts.forEach(a => {
    const t = localDate(a).getTime();
    const w = weeks.find(wk => t >= wk.start.getTime() && t < wk.end.getTime());
    if (!w) return;
    const sec = a.moving_time || 0, km = (a.distance || 0) / 1000, d = disciplineOf(a);
    w.sec += sec; w.km += km; w.count += 1; w.effort += effortScore(a);
    w.disc[d].sec += sec; w.disc[d].km += km; w.disc[d].count += 1;
    if (d === "autre") {
      const lbl = TYPE_LABELS[a.sport_type || a.type] || a.sport_type || a.type;
      w.autres[lbl] = (w.autres[lbl] || 0) + 1;
    }
    if (!w.longest || sec > w.longest.sec) {
      w.longest = { sec, disc: d, name: a.name || "", date: localDate(a).toISOString() };
    }
  });

  const current = weeks[weeks.length - 1];
  const prev4 = weeks.slice(-5, -1);
  const avg4sec = prev4.reduce((s, w) => s + w.sec, 0) / prev4.length;
  const avg4count = prev4.reduce((s, w) => s + w.count, 0) / prev4.length;

  // Charge
  const charge = computeCharge(acts, now);

  // Intensité : % du temps sous 140 bpm sur 4 semaines, séances avec FC
  const since28 = today.getTime() - 28 * DAY;
  const withHr = acts.filter(a => new Date(a.start_date).getTime() >= since28 && a.average_heartrate && a.moving_time);
  let secEasy = 0, secHard = 0;
  withHr.forEach(a => { if (a.average_heartrate < 140) secEasy += a.moving_time; else secHard += a.moving_time; });
  const intensite = (secEasy + secHard) > 0
    ? { easy: Math.round(100 * secEasy / (secEasy + secHard)), hard: Math.round(100 * secHard / (secEasy + secHard)), n: withHr.length, seuil: 140 }
    : { easy: null, hard: null, n: 0, seuil: 140 };

  // Régularité sur 28 jours
  const daysWith = new Set();
  acts.forEach(a => {
    const d = Math.floor((today - startOfDay(localDate(a))) / DAY);
    if (d >= 0 && d < 28) daysWith.add(d);
  });
  let longest28 = null;
  prev4.concat([current]).forEach(w => { if (w.longest && (!longest28 || w.longest.sec > longest28.sec)) longest28 = w.longest; });
  const regularite = {
    seancesParSemaine: Math.round(avg4count * 10) / 10,
    joursOff28: 28 - daysWith.size,
    plusLongue28: longest28,
    plusLongueSemaine: current.longest,
  };

  // Dernière séance + 10 précédentes
  const fmt = a => ({
    id: a.id,
    date: localDate(a).toISOString(),
    disc: disciplineOf(a),
    type: a.sport_type || a.type,
    typeLabel: TYPE_LABELS[a.sport_type || a.type] || null,
    name: a.name || "",
    sec: a.moving_time || 0,
    km: Math.round((a.distance || 0) / 100) / 10,
    hr: a.average_heartrate ? Math.round(a.average_heartrate) : null,
    watts: a.average_watts ? Math.round(a.average_watts) : null,
    effort: effortScore(a),
  });
  const recentes = acts.slice(0, 10).map(fmt);
  const derniere = acts[0] ? fmt(acts[0]) : null;
  const joursDepuis = acts[0] ? Math.floor((today - startOfDay(localDate(acts[0]))) / DAY) : null;

  return {
    generatedAt: now.toISOString(),
    semaine: {
      label: current.label,
      start: current.start.toISOString(),
      sec: current.sec, km: Math.round(current.km * 10) / 10, count: current.count,
      disc: current.disc, autres: current.autres,
      vs4: avg4sec > 0 ? Math.round(100 * (current.sec - avg4sec) / avg4sec) : null,
      avg4sec: Math.round(avg4sec),
    },
    charge,
    intensite,
    regularite,
    derniere, joursDepuis, recentes,
    semaines: weeks.map(w => ({
      label: w.label, start: w.start.toISOString(), sec: w.sec, km: Math.round(w.km * 10) / 10,
      count: w.count, effort: w.effort, disc: w.disc, autres: w.autres,
    })),
  };
}

export function writeCarnet(carnet, outPath = OUTPUT) {
  const out = `// AUTO-GENERATED by scripts/carnet.js — ${carnet.generatedAt}
// Ne pas éditer : relancer sync.command.
window.CARNET = ${JSON.stringify(carnet, null, 1)};
`;
  fs.writeFileSync(outPath, out);
}

// ─── CLI : node scripts/carnet.js ────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const acts = JSON.parse(fs.readFileSync(ACT_CACHE, "utf8"));
  const carnet = buildCarnet(acts, new Date());
  writeCarnet(carnet);
  const c = carnet.charge;
  console.log(`📒 Carnet — ${carnet.semaine.label} : ${(carnet.semaine.sec / 3600).toFixed(1)} h · ${carnet.semaine.count} séances (${carnet.semaine.vs4 ?? "—"} % vs 4 sem.)`);
  console.log(`   Charge : ratio ${c.ratio ?? "—"} (${c.statut}) · aiguë ${c.aigue} · chronique ${c.chronique} · typique ${c.typique} · ${c.nb28} séances/28 j`);
  console.log(`   Intensité 4 sem. : ${carnet.intensite.easy ?? "—"} / ${carnet.intensite.hard ?? "—"} (${carnet.intensite.n} séances avec FC)`);
  console.log(`   Régularité : ${carnet.regularite.seancesParSemaine} séances/sem · ${carnet.regularite.joursOff28} jours off / 28`);
  console.log(`📝 js/carnet-data.js écrit`);
}
