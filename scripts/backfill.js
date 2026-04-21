// scripts/backfill.js
// Backfill engine (P0-BIS + P7 §6) : produit js/history.js avec
//   - daily[] : 1 entrée par jour depuis le 1er cycle Whoop
//   - weeks[] : 1 entrée par semaine ISO, metrics + signature + events
//   - meta    : stats globales
//
// Règles : causal (pas de leak futur), idempotent, pas de LLM.
// Usage : node scripts/backfill.js

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildWhoopObservations } from "./whoop.js";

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const ACT_CACHE  = path.join(__dirname, ".activities.cache.json");
const OUTPUT     = path.join(__dirname, "../js/history.js");
const ATHLETE_ID = "benoit";

// ─── DATE HELPERS ─────────────────────────────────────────────────────────────

const DAY_MS = 86400 * 1000;

function dayKey(ts)       { return new Date(ts).toISOString().slice(0, 10); }
function dayStartTs(key)  { return new Date(key + "T00:00:00Z").getTime(); }

function isoWeekParts(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / DAY_MS + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}
function isoWeekKey(ts) {
  const { year, week } = isoWeekParts(new Date(ts));
  return `${year}-W${String(week).padStart(2, "0")}`;
}
function isoWeekMondayTs(ts) {
  const d = new Date(ts);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (day - 1));
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

// ─── STATS HELPERS ────────────────────────────────────────────────────────────

function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}
function mean(arr) { return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null; }
function round1(n) { return n == null ? null : Math.round(n * 10) / 10; }
function round(n)  { return n == null ? null : Math.round(n); }

function madBaseline(values) {
  if (values.length < 7) return null;
  const med = median(values);
  const absDev = values.map(v => Math.abs(v - med)).sort((a, b) => a - b);
  const mad = absDev[Math.floor(absDev.length / 2)];
  return { baseline: round1(med), sigma: round1(Math.max(1.4826 * mad, 0.1)) };
}

// ─── LOAD DATA ────────────────────────────────────────────────────────────────

function loadActivities() {
  if (!fs.existsSync(ACT_CACHE)) {
    throw new Error(`Cache Strava introuvable : ${ACT_CACHE}. Lance d'abord sync.js.`);
  }
  return JSON.parse(fs.readFileSync(ACT_CACHE, "utf8"));
}

const TYPE_MAP = {
  Ride: { label: "Vélo", icone: "🚴" },
  VirtualRide: { label: "Vélo (home)", icone: "🚴" },
  Run: { label: "Course", icone: "🏃" },
  TrailRun: { label: "Trail", icone: "🏔" },
  Swim: { label: "Natation", icone: "🏊" },
  Workout: { label: "Renforcement", icone: "💪" },
  WeightTraining: { label: "Musculation", icone: "💪" },
  Walk: { label: "Marche", icone: "🚶" },
  Hike: { label: "Randonnée", icone: "🏔" },
};

function normActivity(a) {
  const meta = TYPE_MAP[a.type] || { label: a.type, icone: "🏅" };
  const effort = a.suffer_score && a.suffer_score > 0
    ? a.suffer_score
    : Math.round(((a.moving_time || 0) / 3600) * (a.average_heartrate > 160 ? 80 : a.average_heartrate > 145 ? 60 : a.average_heartrate > 130 ? 45 : 30));
  return {
    id: a.id,
    source: "strava",
    type: a.type,
    label: meta.label,
    icone: meta.icone,
    name: a.name || "",
    timestamp: new Date(a.start_date).getTime(),
    local_date: (a.start_date_local || a.start_date).slice(0, 10),
    duration_min: Math.round((a.moving_time || 0) / 60),
    distance_km: a.distance ? Math.round(a.distance / 100) / 10 : null,
    avg_hr: a.average_heartrate || null,
    max_hr: a.max_heartrate || null,
    avg_watts: a.average_watts || null,
    suffer_score: a.suffer_score || null,
    effort, // utilisé comme "strain_strava" day-level
  };
}

// ─── BUILD DAILY ENTRIES ──────────────────────────────────────────────────────

const BASELINE_SIGNALS = [
  "hrv_morning", "rhr_morning", "skin_temp", "respiratory_rate",
  "deep_sleep_min", "rem_sleep_min", "sleep_efficiency", "sleep_regularity",
  "sleep_hours", "daily_strain", "spo2",
];

function buildDaily(whoopObs, activities) {
  // Group obs by day
  const byDay = {};
  whoopObs.forEach(o => {
    const key = dayKey(o.timestamp);
    if (!byDay[key]) byDay[key] = {};
    const slot = byDay[key];
    // Prefer first-of-day (bedtime reports) or keep numeric values
    if (slot[o.signal_id] === undefined) slot[o.signal_id] = o.raw_value;
  });

  const activitiesByDay = {};
  activities.forEach(a => {
    const key = a.local_date;
    (activitiesByDay[key] ||= []).push(a);
  });

  // Date range
  const allKeys = new Set([...Object.keys(byDay), ...Object.keys(activitiesByDay)]);
  if (!allKeys.size) return { daily: [], first_date: null, last_date: null };

  const sortedKeys = [...allKeys].sort();
  const firstKey = sortedKeys[0];
  const lastKey  = sortedKeys[sortedKeys.length - 1];

  // Enumerate every day from first to last (even empty ones, so weeks are contiguous)
  const dayList = [];
  for (let ts = dayStartTs(firstKey); ts <= dayStartTs(lastKey); ts += DAY_MS) {
    dayList.push(dayKey(ts));
  }

  // Causal baseline : pour chaque jour, calcul baseline sur les 28j précédents
  // (strictement antérieurs pour éviter leak du jour courant).
  const BASELINE_WINDOW = 28;

  const daily = dayList.map(key => {
    const signals = byDay[key] || {};
    const dayTs = dayStartTs(key);

    // Rolling baselines (median + MAD) sur les 28j strictement antérieurs
    const baselines = {};
    const zscores = {};
    for (const sig of BASELINE_SIGNALS) {
      const values = [];
      for (let d = 1; d <= BASELINE_WINDOW; d++) {
        const prevKey = dayKey(dayTs - d * DAY_MS);
        const v = byDay[prevKey]?.[sig];
        if (typeof v === "number" && Number.isFinite(v)) values.push(v);
      }
      const b = madBaseline(values);
      if (b) {
        baselines[sig] = b;
        const today = signals[sig];
        if (typeof today === "number") {
          zscores[sig] = round1((today - b.baseline) / b.sigma);
        }
      }
    }

    // Composite autonomic flag (§2 point critique I03/I33)
    // 4 signaux à surveiller : hrv z<-1, rhr z>+1, rr z>+1, skin_temp z>+1
    const flagDetails = {
      hrv_low:       zscores.hrv_morning      !== undefined && zscores.hrv_morning <= -1,
      rhr_high:      zscores.rhr_morning      !== undefined && zscores.rhr_morning >= 1,
      rr_high:       zscores.respiratory_rate !== undefined && zscores.respiratory_rate >= 1,
      skin_high:     zscores.skin_temp        !== undefined && zscores.skin_temp >= 1,
    };
    const flagCount = Object.values(flagDetails).filter(Boolean).length;

    // Activities du jour + strain Strava (somme des efforts)
    const acts = (activitiesByDay[key] || []).map(a => ({
      id: a.id, type: a.type, label: a.label, icone: a.icone,
      duration_min: a.duration_min, distance_km: a.distance_km,
      avg_hr: a.avg_hr, effort: a.effort, name: a.name,
    }));
    const strainStrava = acts.reduce((s, a) => s + (a.effort || 0), 0);

    // Sleep block
    const sleep = {
      hours:       signals.sleep_hours      ?? null,
      quality:     signals.sleep_quality    ?? null,
      deep_min:    signals.deep_sleep_min   ?? null,
      rem_min:     signals.rem_sleep_min    ?? null,
      efficiency:  signals.sleep_efficiency ?? null,
      regularity:  signals.sleep_regularity ?? null,
      debt:        signals.sleep_debt       ?? null,
      bedtime_min: signals.bedtime_minutes  ?? null,
      wake_min:    signals.wake_minutes     ?? null,
    };

    const journal = {
      alcohol:    signals.alcohol_yesterday === 1,
      caffeine:   signals.caffeine_late === 1,
      stress:     signals.stress_reported === 1,
      travel:     signals.travel_yesterday === 1,
      illness:    signals.illness_reported === 1,
      injury:     signals.injury_flag === 1,
      protein:    signals.protein_intake === 1,
    };

    return {
      date: key,
      timestamp: dayTs,
      hrv:        signals.hrv_morning      ?? null,
      rhr:        signals.rhr_morning      ?? null,
      rr:         signals.respiratory_rate ?? null,
      skin_temp:  signals.skin_temp        ?? null,
      spo2:       signals.spo2             ?? null,
      recovery:   signals.recovery_score   ?? null,
      strain_whoop:  signals.daily_strain  ?? null,
      strain_strava: strainStrava > 0 ? strainStrava : null,
      sleep,
      activities: acts,
      journal,
      composite_flag: { count: flagCount, details: flagDetails },
      zscores,
      baselines,
    };
  });

  return { daily, first_date: firstKey, last_date: lastKey };
}

// ─── WEEKLY METRICS + SIGNATURES ─────────────────────────────────────────────

const SIGNATURES = {
  ILLNESS:          "Choc immunitaire",
  RACE:             "Compétition",
  DECROCHAGE:       "Décrochage autonome",
  OVERREACH:        "Overreach confirmé",
  CHARGE_BRUTE:     "Charge brute",
  DECHARGE_PLANNED: "Décharge planifiée",
  DECHARGE_SUBIE:   "Décharge subie",
  POLARISE:         "Polarisé",
  SEUIL:            "Seuil-dominant",
  BUILD_Z2:         "Build Z2",
  REBOND:           "Rebond",
  CROISIERE:        "Rythme de croisière",
  CALIBRATION:      "Calibration", // pas assez de data
};

function computeWeekSignature(w, medianStrainAllWeeks) {
  if (w.incidents.illness) return SIGNATURES.ILLNESS;
  if (w.incidents.race)    return SIGNATURES.RACE;
  if (w.flag_count >= 3)   return SIGNATURES.DECROCHAGE;

  if (!w.metrics.acwr && w.metrics.strain_total == null) return SIGNATURES.CALIBRATION;

  const { acwr, recovery_avg, strain_total, polarization_ratio, hrv_trend, threshold_ratio } = w.metrics;

  if (acwr != null && acwr > 1.5 && recovery_avg != null && recovery_avg < 45) return SIGNATURES.OVERREACH;
  if (acwr != null && acwr > 1.5) return SIGNATURES.CHARGE_BRUTE;
  if (acwr != null && acwr < 0.7) {
    return (recovery_avg != null && recovery_avg > 60) ? SIGNATURES.DECHARGE_PLANNED : SIGNATURES.DECHARGE_SUBIE;
  }
  if (threshold_ratio != null && threshold_ratio > 0.35) return SIGNATURES.SEUIL;
  if (polarization_ratio != null && polarization_ratio > 0.85 && strain_total > medianStrainAllWeeks) return SIGNATURES.BUILD_Z2;
  if (hrv_trend != null && hrv_trend > 0 && recovery_avg != null && recovery_avg > 65) return SIGNATURES.REBOND;
  return SIGNATURES.CROISIERE;
}

function detectWeekEvents(w, days) {
  const events = [];

  // Illness : au moins 1 jour avec flag_count ≥ 3 OU journal.illness
  const illnessDay = days.find(d => d.composite_flag.count >= 3 || d.journal.illness);
  if (illnessDay) {
    events.push({ type: "illness", date: illnessDay.date,
      context: { flag_count: illnessDay.composite_flag.count, journal_illness: illnessDay.journal.illness } });
  }

  // Breakthrough : jour avec hrv z > +1.5
  const breakthroughDay = days.find(d => typeof d.zscores?.hrv_morning === "number" && d.zscores.hrv_morning >= 1.5);
  if (breakthroughDay) {
    events.push({ type: "breakthrough", date: breakthroughDay.date,
      context: { hrv: breakthroughDay.hrv, z: breakthroughDay.zscores.hrv_morning } });
  }

  // Outlier : strain whoop ≥ 18 OU recovery ≤ 34
  days.forEach(d => {
    if (d.strain_whoop != null && d.strain_whoop >= 18) {
      events.push({ type: "strain_peak", date: d.date, context: { strain: d.strain_whoop } });
    }
    if (d.recovery != null && d.recovery <= 34) {
      events.push({ type: "recovery_crash", date: d.date, context: { recovery: d.recovery } });
    }
  });

  // Gap : chaîne ≥ 4 jours consécutifs sans activité ni strain notable
  let gapStart = null, gapLen = 0, maxGap = 0, maxGapDate = null;
  days.forEach(d => {
    const inactive = !d.activities.length && (d.strain_whoop == null || d.strain_whoop < 5);
    if (inactive) {
      if (!gapStart) gapStart = d.date;
      gapLen++;
      if (gapLen > maxGap) { maxGap = gapLen; maxGapDate = gapStart; }
    } else { gapStart = null; gapLen = 0; }
  });
  if (maxGap >= 4) events.push({ type: "inactivity_gap", date: maxGapDate, context: { days: maxGap } });

  // Race : au moins 1 activité avec suffer_score ≥ 300 OU durée ≥ 4h
  const raceAct = days.flatMap(d => d.activities).find(a => (a.effort && a.effort >= 300) || (a.duration_min || 0) >= 240);
  if (raceAct) events.push({ type: "race", date: null, context: { label: raceAct.label, duration: raceAct.duration_min, effort: raceAct.effort } });

  return events;
}

function buildWeeks(daily) {
  // Group days by ISO week
  const byWeek = {};
  daily.forEach(d => {
    const key = isoWeekKey(d.timestamp);
    (byWeek[key] ||= []).push(d);
  });

  const weekKeys = Object.keys(byWeek).sort();

  // First pass : compute raw metrics per week
  const rawWeeks = weekKeys.map(id => {
    const days = byWeek[id];
    const first = days[0];
    const last  = days[days.length - 1];

    const strainsWhoop = days.map(d => d.strain_whoop).filter(v => v != null);
    const strainsStrava = days.map(d => d.strain_strava).filter(v => v != null);
    const recoveries = days.map(d => d.recovery).filter(v => v != null);
    const sleeps     = days.map(d => d.sleep.hours).filter(v => v != null);
    const hrvs       = days.map(d => d.hrv).filter(v => v != null);

    // HRV trend : régression linéaire (slope en ms/jour)
    let hrvTrend = null;
    if (hrvs.length >= 3) {
      const xs = hrvs.map((_, i) => i);
      const meanX = mean(xs), meanY = mean(hrvs);
      const num = xs.reduce((s, x, i) => s + (x - meanX) * (hrvs[i] - meanY), 0);
      const den = xs.reduce((s, x) => s + (x - meanX) ** 2, 0);
      hrvTrend = den > 0 ? round1(num / den) : 0;
    }

    // Polarization : ratio (Z1+Z2 low-intensity) / total → approx depuis avg_hr
    // On classe chaque activité selon avg_hr seuil 140
    let lowIntensityMin = 0, totalMin = 0, thresholdMin = 0;
    days.flatMap(d => d.activities).forEach(a => {
      const dur = a.duration_min || 0;
      totalMin += dur;
      if (a.avg_hr && a.avg_hr < 140) lowIntensityMin += dur;
      if (a.avg_hr && a.avg_hr >= 145 && a.avg_hr < 160) thresholdMin += dur;
    });
    const polarization = totalMin > 0 ? round1(lowIntensityMin / totalMin * 100) / 100 : null;
    const thresholdRatio = totalMin > 0 ? round1(thresholdMin / totalMin * 100) / 100 : null;

    const flagCount = days.reduce((s, d) => s + (d.composite_flag.count >= 3 ? 1 : 0), 0);
    const incidents = {
      illness: days.some(d => d.composite_flag.count >= 3 || d.journal.illness),
      race:    days.flatMap(d => d.activities).some(a => (a.effort && a.effort >= 300) || (a.duration_min || 0) >= 240),
    };

    return {
      id,
      start_date: first.date,
      end_date:   last.date,
      days_count: days.length,
      metrics: {
        recovery_avg:       round(mean(recoveries)),
        strain_total:       round1(strainsWhoop.reduce((s, v) => s + v, 0)),
        strain_total_strava: round(strainsStrava.reduce((s, v) => s + v, 0)),
        sleep_avg_h:        round1(mean(sleeps)),
        hrv_avg:            round1(mean(hrvs)),
        hrv_trend:          hrvTrend,
        session_count:      days.reduce((s, d) => s + d.activities.length, 0),
        volume_min:         totalMin,
        polarization_ratio: polarization,
        threshold_ratio:    thresholdRatio,
        flag_count:         flagCount,
        acwr: null, // filled next pass
      },
      incidents,
      flag_count: flagCount,
    };
  });

  // Second pass : ACWR = strain_total(semaine) / moyenne des 4 semaines précédentes
  rawWeeks.forEach((w, i) => {
    const prev = rawWeeks.slice(Math.max(0, i - 4), i);
    if (!prev.length) return;
    const chronique = mean(prev.map(p => p.metrics.strain_total || 0));
    if (chronique > 0 && w.metrics.strain_total != null) {
      w.metrics.acwr = round1(w.metrics.strain_total / chronique);
    }
  });

  // Third pass : signature + events
  const medianStrain = median(rawWeeks.map(w => w.metrics.strain_total || 0));
  rawWeeks.forEach(w => {
    w.signature = computeWeekSignature(w, medianStrain);
    w.events    = detectWeekEvents(w, byWeek[w.id]);
  });

  return rawWeeks;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

function main() {
  console.log("\n🗓  Coach IA 2030 — Backfill history.js");
  console.log("═══════════════════════════════════════\n");

  const whoopObs   = buildWhoopObservations();
  const rawActs    = loadActivities();
  const activities = rawActs.map(normActivity);

  console.log(`📦 ${whoopObs.length} obs Whoop · ${activities.length} activités Strava`);

  const { daily, first_date, last_date } = buildDaily(whoopObs.filter(o => typeof o.raw_value === "number" || typeof o.raw_value === "boolean"), activities);
  console.log(`📆 ${daily.length} jours générés (${first_date} → ${last_date})`);

  const weeks = buildWeeks(daily);
  console.log(`📅 ${weeks.length} semaines générées`);

  const sigCounts = {};
  weeks.forEach(w => { sigCounts[w.signature] = (sigCounts[w.signature] || 0) + 1; });
  console.log("\n   Signatures détectées :");
  Object.entries(sigCounts).sort((a, b) => b[1] - a[1]).forEach(([s, n]) => {
    console.log(`     ${s.padEnd(22)} ${n} sem`);
  });

  const eventCounts = {};
  weeks.flatMap(w => w.events).forEach(e => { eventCounts[e.type] = (eventCounts[e.type] || 0) + 1; });
  console.log("\n   Events détectés :");
  Object.entries(eventCounts).sort((a, b) => b[1] - a[1]).forEach(([t, n]) => {
    console.log(`     ${t.padEnd(22)} ${n}`);
  });

  const meta = {
    generated_at:    new Date().toISOString(),
    athlete_id:      ATHLETE_ID,
    first_date,
    last_date,
    total_days:      daily.length,
    total_sessions:  activities.length,
    total_weeks:     weeks.length,
    baseline_window: 28,
  };

  const output = `// AUTO-GENERATED by scripts/backfill.js — ${meta.generated_at}
// Do not edit manually. Run: node scripts/backfill.js
// Consumed by js/archive.js (P7 "Mes Semaines").

window.HISTORY = ${JSON.stringify({ meta, daily, weeks }, null, 2)};
`;

  fs.writeFileSync(OUTPUT, output);
  const sizeKb = Math.round(fs.statSync(OUTPUT).size / 1024);
  console.log(`\n📝 js/history.js (${sizeKb} Ko) généré.\n`);
}

main();
