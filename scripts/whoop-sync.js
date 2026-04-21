// scripts/whoop-sync.js
// Fetch Whoop API → écrit js/observations-whoop.js au même format que
// scripts/whoop.js (version CSV) pour que le moteur de scoring reste identique.
// Run: node scripts/whoop-sync.js  (ou intégré dans sync.command)

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  fetchProfile,
  fetchBodyMeasurement,
  fetchCycles,
  fetchRecoveries,
  fetchSleeps,
  fetchWorkouts,
} from "./whoop-api.js";

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT     = path.join(__dirname, "../js/observations-whoop.js");
const ATHLETE_ID = "benoit";
const DAYS       = 60;

function pushObs(obs, signal_id, raw_value, ts) {
  if (raw_value == null || ts == null || isNaN(ts)) return;
  obs.push({ signal_id, raw_value, athlete_id: ATHLETE_ID, timestamp: ts });
}

function toTs(iso) {
  if (!iso) return null;
  const n = new Date(iso).getTime();
  return isNaN(n) ? null : n;
}

// Minutes after midnight from an ISO timestamp
function toMinutesOfDay(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
}

// ─── MAPPERS ─────────────────────────────────────────────────────────────────

// Cycle = journée Whoop (strain, start/end). Recovery est lié à un cycle_id.
function mapCycles(cycles) {
  const obs = [];
  cycles.forEach(c => {
    const ts = toTs(c.start);
    const strain = c.score?.strain;
    if (ts != null && typeof strain === "number") {
      pushObs(obs, "daily_strain", strain, ts);
    }
  });
  return obs;
}

// Recovery : score %, HRV ms, RHR bpm, skin_temp °C, SpO2 %
function mapRecoveries(recoveries, cycleById) {
  const obs = [];
  recoveries.forEach(r => {
    const cycle = cycleById.get(r.cycle_id);
    const ts = toTs(cycle?.start) || toTs(r.created_at);
    if (ts == null) return;
    const s = r.score || {};
    pushObs(obs, "recovery_score", s.recovery_score, ts);
    pushObs(obs, "hrv_morning",    s.hrv_rmssd_milli, ts);
    pushObs(obs, "rhr_morning",    s.resting_heart_rate, ts);
    pushObs(obs, "skin_temp",      s.skin_temp_celsius, ts);
    pushObs(obs, "spo2",           s.spo2_percentage, ts);
  });
  return obs;
}

// Sommeil : durée (h), performance %, efficacité, régularité, stages, respi
function mapSleeps(sleeps) {
  const obs = [];
  sleeps.forEach(sl => {
    if (sl.nap) return; // ignorer les siestes
    const ts = toTs(sl.start);
    if (ts == null) return;
    const s = sl.score || {};
    const stage = s.stage_summary || {};

    const totalMin =
      (stage.total_light_sleep_time_milli || 0) / 60000 +
      (stage.total_slow_wave_sleep_time_milli || 0) / 60000 +
      (stage.total_rem_sleep_time_milli || 0) / 60000;
    if (totalMin > 0) {
      pushObs(obs, "sleep_hours", Math.round((totalMin / 60) * 10) / 10, ts);
    }

    pushObs(obs, "sleep_quality",    s.sleep_performance_percentage, ts);
    pushObs(obs, "sleep_efficiency", s.sleep_efficiency_percentage, ts);
    pushObs(obs, "sleep_regularity", s.sleep_consistency_percentage, ts);
    pushObs(obs, "respiratory_rate", s.respiratory_rate, ts);

    if (stage.total_slow_wave_sleep_time_milli != null) {
      pushObs(obs, "deep_sleep_min", Math.round(stage.total_slow_wave_sleep_time_milli / 60000), ts);
    }
    if (stage.total_rem_sleep_time_milli != null) {
      pushObs(obs, "rem_sleep_min", Math.round(stage.total_rem_sleep_time_milli / 60000), ts);
    }
    if (s.sleep_needed?.need_from_sleep_debt_milli != null) {
      pushObs(obs, "sleep_debt", Math.round(s.sleep_needed.need_from_sleep_debt_milli / 60000), ts);
    }

    pushObs(obs, "bedtime_minutes", toMinutesOfDay(sl.start), ts);
    pushObs(obs, "wake_minutes",    toMinutesOfDay(sl.end), ts);
  });
  return obs;
}

// Workouts : strain par séance + zones FC (% du temps dans chaque zone)
function mapWorkouts(workouts) {
  const obs = [];
  workouts.forEach(w => {
    const ts = toTs(w.start);
    if (ts == null) return;
    const s = w.score || {};
    if (typeof s.strain === "number") {
      pushObs(obs, "session_strain", s.strain, ts);
    }

    const zd = s.zone_duration || {};
    const durMs =
      (zd.zone_zero_milli || 0) + (zd.zone_one_milli || 0) +
      (zd.zone_two_milli || 0) + (zd.zone_three_milli || 0) +
      (zd.zone_four_milli || 0) + (zd.zone_five_milli || 0);

    if (durMs > 0) {
      const pct = ms => Math.round((ms / durMs) * 1000) / 10;
      obs.push({
        signal_id: "session_hr_zones",
        raw_value: {
          z1: pct(zd.zone_one_milli || 0),
          z2: pct(zd.zone_two_milli || 0),
          z3: pct(zd.zone_three_milli || 0),
          z4: pct(zd.zone_four_milli || 0),
          z5: pct(zd.zone_five_milli || 0),
          duration_min: Math.round(durMs / 60000),
          name: w.sport_name || "",
        },
        athlete_id: ATHLETE_ID,
        timestamp: ts,
      });
    }
  });
  return obs;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n💜 Coach IA 2030 — Sync Whoop API");
  console.log("════════════════════════════════════\n");

  const profile = await fetchProfile();
  console.log(`👤 Connecté : ${profile.first_name} ${profile.last_name}`);

  console.log(`\n📥 Fetch ${DAYS} derniers jours...`);
  const [cycles, recoveries, sleeps, workouts] = await Promise.all([
    fetchCycles(DAYS),
    fetchRecoveries(DAYS),
    fetchSleeps(DAYS),
    fetchWorkouts(DAYS),
  ]);
  console.log(`   ${cycles.length} cycles · ${recoveries.length} recoveries · ${sleeps.length} sleeps · ${workouts.length} workouts`);

  const cycleById = new Map(cycles.map(c => [c.id, c]));

  const obs = [
    ...mapCycles(cycles),
    ...mapRecoveries(recoveries, cycleById),
    ...mapSleeps(sleeps),
    ...mapWorkouts(workouts),
  ].sort((a, b) => a.timestamp - b.timestamp);

  const bySignal = {};
  obs.forEach(o => { bySignal[o.signal_id] = (bySignal[o.signal_id] || 0) + 1; });

  console.log("");
  Object.entries(bySignal).sort().forEach(([sig, n]) => {
    console.log(`✅ ${sig.padEnd(22)} : ${n} obs`);
  });

  const output = `// AUTO-GENERATED by scripts/whoop-sync.js — ${new Date().toISOString()}
// Whoop API observations for scoring.js (merged via window.WEARABLE_OBS)
window.WEARABLE_OBS = (window.WEARABLE_OBS || []).concat(${JSON.stringify(obs, null, 2)});
`;

  fs.writeFileSync(OUTPUT, output);
  console.log(`\n📝 ${obs.length} observations écrites dans js/observations-whoop.js`);
  console.log("✅ Sync Whoop API terminée !\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error("\n❌", e.message); process.exit(1); });
}
