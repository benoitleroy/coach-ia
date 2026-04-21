// scripts/sync.js
// Orchestrator: fetches Strava data, computes metrics, writes js/data-benoit.js
// Run with: node scripts/sync.js  (or double-click sync.command)

// dotenv is loaded by strava.js (imported below)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { fetchRecentActivities, fetchAthlete, fetchActivityDetail } from "./strava.js";
import { computeDecoupling } from "./decoupling.js";
import { buildWhoopObservations } from "./whoop.js";

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT      = path.join(__dirname, "../js/data-benoit.js");
const OBS_OUT     = path.join(__dirname, "../js/observations-strava.js");
const ACT_CACHE   = path.join(__dirname, ".activities.cache.json");

// ─── ACTIVITY TYPE MAPPING ───────────────────────────────────────────────────

const TYPE_MAP = {
  Ride:              { label: "Vélo",         icone: "🚴" },
  VirtualRide:       { label: "Vélo (home)",  icone: "🚴" },
  Run:               { label: "Course à pied",icone: "🏃" },
  VirtualRun:        { label: "Course",       icone: "🏃" },
  Swim:              { label: "Natation",     icone: "🏊" },
  Workout:           { label: "Renforcement", icone: "💪" },
  Walk:              { label: "Marche",       icone: "🚶" },
  Hike:              { label: "Randonnée",    icone: "🏔" },
  TrailRun:          { label: "Trail",        icone: "🏔" },
  Kayaking:          { label: "Kayak",        icone: "🛶" },
};

function getActivityMeta(type) {
  return TYPE_MAP[type] || { label: type, icone: "🏅" };
}

// ─── EFFORT SCORE per activity ────────────────────────────────────────────────
// Uses Strava's suffer_score (relative effort) when available.
// Fallback: moving_time (hours) × intensity factor (heart rate zones estimate)

function effortScore(activity) {
  // Prefer Strava's relative effort
  if (activity.suffer_score && activity.suffer_score > 0) {
    return activity.suffer_score;
  }

  // Fallback: duration in hours × HR factor
  const hours = (activity.moving_time || 0) / 3600;
  const avgHr = activity.average_heartrate || 130;
  // Simple factor: higher HR → more effort per hour
  const hrFactor = avgHr > 160 ? 80 : avgHr > 145 ? 60 : avgHr > 130 ? 45 : 30;
  return Math.round(hours * hrFactor);
}

// ─── COMPUTE TRAINING LOAD ────────────────────────────────────────────────────
// Diagnostic flag : passer à false une fois le fix validé
const DEBUG_LOAD = false;

// Diagnostic : liste les séances candidates au calcul de bike-run decoupling
// (P1-a.1 : sorties longues en endurance, FC stable disponible)
const DEBUG_DECOUPLING_CANDIDATES = true;

function computeLoad(activities) {
  const now = Date.now();
  const MS_PER_DAY = 86400 * 1000;

  const scores7  = [];
  const scores28 = [];
  const recent14 = []; // pour logs uniquement

  activities.forEach(act => {
    const ageMs  = now - new Date(act.start_date).getTime();
    const ageDays = ageMs / MS_PER_DAY;
    const effort = effortScore(act);

    if (ageDays <= 7)  scores7.push(effort);
    if (ageDays <= 28) scores28.push(effort);
    if (DEBUG_LOAD && ageDays <= 14) {
      recent14.push({ date: act.start_date, ageDays: ageDays.toFixed(2), type: act.type, effort });
    }
  });

  if (DEBUG_LOAD) {
    console.log("\n── [DEBUG] computeLoad ──");
    console.log(`   Total activités reçues : ${activities.length}`);
    console.log(`   Activités fenêtre 7j   : ${scores7.length}`);
    console.log(`   Activités fenêtre 28j  : ${scores28.length}`);
    console.log(`   Dernières 14j (max 10 affichées) :`);
    recent14.slice(0, 10).forEach(a => {
      console.log(`     ${a.ageDays}j · ${a.type.padEnd(14)} · effort=${a.effort}`);
    });
    if (recent14.length === 0) console.log("     (aucune)");
  }

  const chargeAigue   = scores7.reduce((s, v) => s + v, 0);
  const chronique28   = scores28.reduce((s, v) => s + v, 0);
  // Chronique = 28-day average expressed as weekly average
  const chronique     = Math.round(chronique28 / 4);

  // ─── Gestion des cas limites ───
  // Fenêtre aiguë vide = pas de séance récente = ratio non calculable.
  // Ne pas retourner ratio=0 (fausse alerte "sous-charge") ni ratio=1 (masque le signal).
  if (scores7.length === 0 && scores28.length === 0) {
    return { chargeAigue: 0, chronique: 0, ratio: null, statut: "no-data" };
  }
  if (scores7.length === 0) {
    return { chargeAigue: 0, chronique, ratio: null, statut: "no-recent-activity" };
  }

  const ratio = chronique > 0
    ? Math.round((chargeAigue / chronique) * 100) / 100
    : 1.0;

  const statut = ratio > 1.3 ? "surcharge" : ratio < 0.8 ? "sous-charge" : "ok";

  return { chargeAigue, chronique, ratio, statut };
}

// ─── DECOUPLING CANDIDATE REPORT (P1-a.1) ────────────────────────────────────
// Liste les séances éligibles au calcul de bike-run decoupling :
//   - type Run, TrailRun, Ride, VirtualRide
//   - moving_time ≥ 60 min
//   - HR moyenne présente (sinon pas de decoupling possible)
//   - pace ou puissance présente (sinon pas de rapport pace/HR possible)
// Les séances hors Zone 2 sont incluses mais taguées [hors Z2] pour décider
// plus tard si on filtre dessus (zone 2 ≈ FC < ~140–145 pour un athlète 42ans).

function reportDecouplingCandidates(activities) {
  const ELIGIBLE_TYPES = new Set(["Run", "TrailRun", "Ride", "VirtualRide"]);
  const MIN_DURATION_S = 60 * 60;

  const candidates = activities
    .filter(a => ELIGIBLE_TYPES.has(a.type))
    .filter(a => (a.moving_time || 0) >= MIN_DURATION_S)
    .filter(a => a.average_heartrate);

  const eightWeeksMs = 8 * 7 * 86400 * 1000;
  const now = Date.now();
  const recent8w = candidates.filter(a => now - new Date(a.start_date).getTime() <= eightWeeksMs);

  const byType = {};
  recent8w.forEach(a => { byType[a.type] = (byType[a.type] || 0) + 1; });

  console.log("\n── [P1-a.1] Candidates bike-run decoupling ──");
  console.log(`   Total éligibles (tout l'historique fetché) : ${candidates.length}`);
  console.log(`   Total éligibles (8 dernières semaines)     : ${recent8w.length}`);
  console.log(`   Répartition 8 semaines : ${JSON.stringify(byType)}`);
  console.log(`\n   Détail 8 semaines (triées du plus récent au plus ancien) :`);
  console.log(`   ${"Date".padEnd(12)} ${"Type".padEnd(12)} ${"Durée".padStart(7)}  ${"FC moy".padStart(7)}  ${"Intensité".padEnd(11)}  Nom`);

  recent8w
    .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
    .forEach(a => {
      const d = new Date(a.start_date).toISOString().slice(0, 10);
      const min = Math.round((a.moving_time || 0) / 60);
      const hr = Math.round(a.average_heartrate);
      // Heuristique Zone 2 : FC < 140 pour un 42 ans = probable Z2 ; 140-150 = tempo ; >150 = seuil/au-dessus
      const intensite = hr < 140 ? "Z2"
                      : hr < 150 ? "Z2/tempo"
                      : hr < 160 ? "tempo/seuil"
                      : "seuil+";
      const name = (a.name || "").slice(0, 40);
      console.log(`   ${d.padEnd(12)} ${a.type.padEnd(12)} ${(min+"min").padStart(7)}  ${(hr+"bpm").padStart(7)}  ${intensite.padEnd(11)}  ${name}`);
    });

  // Estimation du nombre "qualité Z2 strict" (<140bpm) pour calibrer l'algo
  const strictZ2 = recent8w.filter(a => a.average_heartrate < 140).length;
  console.log(`\n   Dont séances FC<140 (Z2 probable) : ${strictZ2}`);
  console.log("   (Ce rapport est informatif — aucune écriture de fichier.)\n");

  return recent8w;
}

// ─── AEROBIC DECOUPLING OBSERVATIONS (P1-a.4) ────────────────────────────────
// Compute Friel decoupling for running sessions in the last 8 weeks.
// Rides are excluded — their result is too noisy on outdoor terrain (see P1-a.3).
// Each run produces one `aerobic_decoupling` observation timestamped at the
// activity date, so the scoring recency decay weights them naturally.
//
// Value stored = max(0, -decouplingPct):
//   computeDecoupling returns efficiency change (positive = got more efficient).
//   For scoring we care about fatigue drift (positive = efficiency DROPPED) so
//   we flip the sign and clamp at 0 — negative values (efficiency improved) are
//   not a fitness signal, they usually indicate warmup in H1 or measurement noise.

async function computeRunDecouplingObs(activities) {
  const RUN_TYPES = new Set(["Run", "TrailRun"]);
  const MIN_DURATION_S = 60 * 60;
  const eightWeeksMs = 8 * 7 * 86400 * 1000;
  const now = Date.now();

  const candidates = activities
    .filter(a => RUN_TYPES.has(a.type))
    .filter(a => (a.moving_time || 0) >= MIN_DURATION_S)
    .filter(a => a.average_heartrate)
    .filter(a => now - new Date(a.start_date).getTime() <= eightWeeksMs);

  if (!candidates.length) {
    console.log("\n🏃 Decoupling : aucune course éligible dans les 8 dernières semaines.");
    return [];
  }

  console.log(`\n🏃 Decoupling : ${candidates.length} course(s) à analyser…`);
  const obs = [];
  for (const act of candidates) {
    try {
      const detail = await fetchActivityDetail(act.id);
      const r = computeDecoupling(detail);
      if (!r.ok) {
        console.log(`   · ${act.start_date.slice(0,10)} skip (${r.reason})`);
        continue;
      }
      if (r.low_confidence) {
        console.log(`   · ${act.start_date.slice(0,10)} ignoré (faible confiance, ΔFC ou n splits)`);
        continue;
      }
      const fatigueIndex = Math.max(0, -r.decouplingPct);
      obs.push({
        signal_id: "aerobic_decoupling",
        raw_value: Math.round(fatigueIndex * 10) / 10,
        athlete_id: "benoit",
        timestamp: new Date(act.start_date).getTime(),
      });
      const marker = fatigueIndex < 5 ? "✅" : fatigueIndex < 10 ? "⚠️" : "❌";
      console.log(`   ${marker} ${act.start_date.slice(0,10)} → decoupling ${r.decouplingPct > 0 ? "+" : ""}${r.decouplingPct}% · fatigue ${fatigueIndex}%`);
    } catch (e) {
      console.log(`   · ${act.start_date.slice(0,10)} erreur : ${e.message}`);
    }
  }
  return obs;
}

// ─── FORMAT LISTE SÉANCES (historique.html) ────────────────────────────────────
// Produit des entrées compatibles avec le schéma attendu par js/historique.js :
//   { date, type, icone, duree, distance, ressenti, charge, ratio }

const JOURS_COURTS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function formatDateCourte(date) {
  const now = new Date();
  const jours = Math.floor((now.setHours(0,0,0,0) - new Date(date).setHours(0,0,0,0)) / 86400000);
  if (jours === 0) return "Aujourd'hui";
  if (jours === 1) return "Hier";
  if (jours === 2) return "Av.-hier";
  const d = new Date(date);
  return `${JOURS_COURTS[d.getDay()]} ${d.getDate()}`;
}

function formatDuree(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m}min`;
}

function formatDistance(activity) {
  if (!activity.distance) return "—";
  // Natation : mètres ; autres : kilomètres
  if (activity.type === "Swim") {
    const m = Math.round(activity.distance);
    return m >= 1000 ? `${(m / 1000).toFixed(2).replace(".", ",")} km` : `${m} m`;
  }
  return `${(activity.distance / 1000).toFixed(1)} km`;
}

function formatSeances(activities, ratio) {
  const r = ratio == null ? 1.0 : ratio;
  return activities.slice(0, 15).map(a => {
    const meta = getActivityMeta(a.type);
    const duree = formatDuree(a.moving_time || 0);
    const distance = formatDistance(a);
    const charge = effortScore(a);
    const ss = a.suffer_score || 0;
    let ressenti = 3;
    if (ss > 200) ressenti = 2;
    else if (ss > 100) ressenti = 3;
    else if (ss > 50) ressenti = 4;
    else if (ss > 0) ressenti = 5;
    else ressenti = (a.moving_time || 0) > 3600 ? 3 : 4;
    return {
      date: formatDateCourte(a.start_date_local),
      type: meta.label,
      icone: meta.icone,
      duree,
      distance,
      ressenti,
      charge,
      ratio: r,
    };
  });
}

// ─── WEEKLY STATS (charge hebdo + volume + séances count) ───────────────────
// Produit 12 semaines glissantes compatibles avec js/historique.js :
//   { semaines: ["S11", ...], chargeAigue: [...], chargeChronique: [...],
//     volumeSec: [...], seancesCount: [...] }
//
// - chargeAigue[i] = somme effortScore des activités de la semaine i
// - chargeChronique[i] = moyenne des 4 dernières semaines (incluant i) — ~charge chronique 28j
// - Semaine ISO (lundi = début)

function isoWeekStart(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - (day - 1));
  return d;
}

function isoWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function computeWeeklyStats(activities, nWeeks = 12) {
  const now = new Date();
  const currentWeekStart = isoWeekStart(now);

  const weeks = [];
  for (let i = nWeeks - 1; i >= 0; i--) {
    const start = new Date(currentWeekStart);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    weeks.push({ start, end, label: `S${isoWeekNumber(start)}`, effort: 0, sec: 0, count: 0 });
  }

  activities.forEach(a => {
    const t = new Date(a.start_date).getTime();
    const w = weeks.find(wk => t >= wk.start.getTime() && t < wk.end.getTime());
    if (!w) return;
    w.effort += effortScore(a);
    w.sec   += (a.moving_time || 0);
    w.count += 1;
  });

  // Chronique = moyenne glissante des 4 dernières semaines (fenêtre 28j)
  const chronique = weeks.map((_, i) => {
    const windowStart = Math.max(0, i - 3);
    const slice = weeks.slice(windowStart, i + 1);
    const sum = slice.reduce((s, w) => s + w.effort, 0);
    return Math.round(sum / slice.length);
  });

  return {
    semaines:        weeks.map(w => w.label),
    chargeAigue:     weeks.map(w => w.effort),
    chargeChronique: chronique,
    volumeSec:       weeks.map(w => w.sec),
    seancesCount:    weeks.map(w => w.count),
  };
}

// ─── DISCIPLINES COUNT (donut historique) ───────────────────────────────────
// Regroupe les activités par grande famille sur les 8 dernières semaines.

function computeDisciplines(activities) {
  const eightWeeksMs = 8 * 7 * 86400 * 1000;
  const now = Date.now();
  const recent = activities.filter(a => now - new Date(a.start_date).getTime() <= eightWeeksMs);

  const FAMILLES = {
    "Vélo":     { icone: "🚴", couleur: "#6C63FF", types: new Set(["Ride", "VirtualRide"]) },
    "Course":   { icone: "🏃", couleur: "#00D4AA", types: new Set(["Run", "VirtualRun", "TrailRun"]) },
    "Natation": { icone: "🏊", couleur: "#FF6B6B", types: new Set(["Swim"]) },
    "Renfo":    { icone: "💪", couleur: "#FFD166", types: new Set(["Workout", "WeightTraining"]) },
    "Autre":    { icone: "🏅", couleur: "#8B8FA8", types: new Set() },
  };

  const counts = Object.fromEntries(Object.keys(FAMILLES).map(k => [k, 0]));
  recent.forEach(a => {
    const fam = Object.keys(FAMILLES).find(k => FAMILLES[k].types.has(a.type)) || "Autre";
    counts[fam]++;
  });

  return Object.keys(FAMILLES)
    .filter(k => counts[k] > 0)
    .map(nom => ({ nom, icone: FAMILLES[nom].icone, count: counts[nom], couleur: FAMILLES[nom].couleur }));
}

// ─── ILLNESS DETECTOR (P0-BIS §3.2) ─────────────────────────────────────────
// Croise les observations Whoop des N derniers jours avec les baselines 28j
// (median + MAD). Si skin_temp OU respiratory_rate dévie > +1σ récemment OU
// si le journal mentionne maladie/blessure, on force le statut en
// "recovery_phase" — l'alerte "sous-charge" ne doit pas pousser à charger.

function _mad(values) {
  if (values.length < 7) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const absDev = sorted.map(v => Math.abs(v - median)).sort((a, b) => a - b);
  const mad = absDev[Math.floor(absDev.length / 2)];
  return { baseline: median, sigma: Math.max(1.4826 * mad, 0.1) };
}

function detectRecoveryPhase(whoopObs) {
  const now = Date.now();
  const DAY = 86400 * 1000;
  const baselineObs = whoopObs.filter(o => (now - o.timestamp) < 35 * DAY && (now - o.timestamp) > 5 * DAY);
  const recentObs   = whoopObs.filter(o => (now - o.timestamp) <= 5 * DAY);

  const signals = ["skin_temp", "respiratory_rate"];
  const flags = [];
  for (const sig of signals) {
    const base = _mad(baselineObs.filter(o => o.signal_id === sig).map(o => o.raw_value));
    if (!base) continue;
    const recent = recentObs.filter(o => o.signal_id === sig).map(o => o.raw_value);
    if (!recent.length) continue;
    const peak = Math.max(...recent);
    if (peak > base.baseline + base.sigma) {
      flags.push({ signal: sig, peak: Math.round(peak * 10) / 10, baseline: base.baseline, sigma: Math.round(base.sigma * 10) / 10 });
    }
  }

  // Illness/injury reported in last 5 days
  const illness = recentObs.find(o => (o.signal_id === "illness_reported" || o.signal_id === "injury_flag") && o.raw_value === 1);

  return {
    in_recovery: flags.length >= 1 || !!illness,
    autonomic_flags: flags,
    journal_illness: !!illness,
  };
}

// ─── FORMAT DERNIÈRE SÉANCE ────────────────────────────────────────────────────

function formatDerniereSéance(activity) {
  if (!activity) return null;

  const meta     = getActivityMeta(activity.type);
  const date     = new Date(activity.start_date_local);
  const now      = new Date();
  const diffDays = Math.floor((now - date) / 86400000);

  let dateLabel;
  if (diffDays === 0)      dateLabel = `Aujourd'hui, ${date.getHours()}h${String(date.getMinutes()).padStart(2,"0")}`;
  else if (diffDays === 1) dateLabel = `Hier, ${date.getHours()}h${String(date.getMinutes()).padStart(2,"0")}`;
  else                     dateLabel = `Il y a ${diffDays} jours`;

  const duréeSec  = activity.moving_time || 0;
  const heures    = Math.floor(duréeSec / 3600);
  const minutes   = Math.floor((duréeSec % 3600) / 60);
  const duréeStr  = heures > 0 ? `${heures}h${String(minutes).padStart(2,"0")}` : `${minutes}min`;

  const distanceKm = activity.distance
    ? (activity.distance / 1000).toFixed(1) + " km"
    : null;

  const puissance = activity.average_watts
    ? activity.average_watts + "W"
    : null;

  // Estimate ressenti from suffer_score
  let ressenti = 3;
  const ss = activity.suffer_score || 0;
  if (ss > 200) ressenti = 2;
  else if (ss > 100) ressenti = 3;
  else if (ss > 50)  ressenti = 4;
  else               ressenti = 5;

  const ressentLabels = { 1:"Très difficile", 2:"Difficile", 3:"Correcte", 4:"Bonne séance", 5:"Excellente séance" };

  return {
    date: dateLabel,
    type: meta.label,
    icone: meta.icone,
    durée: duréeStr,
    distance: distanceKm,
    puissanceMoyenne: puissance,
    ressenti,
    ressentLabel: ressentLabels[ressenti],
    note: activity.name || "",
    stravaId: activity.id,
  };
}

// ─── BUILD PLAN 7 JOURS from upcoming (placeholder — keeps existing plan) ────
// We preserve the curated plan7jours from data.js; sync only updates metrics.

// ─── MAIN SYNC ───────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🔄 Coach IA 2030 — Sync Strava");
  console.log("══════════════════════════════\n");

  let activities;
  try {
    const debut2025 = Math.floor(new Date("2025-01-01T00:00:00").getTime() / 1000);
    activities = await fetchRecentActivities(30, debut2025);
  } catch (err) {
    console.error("❌ Erreur Strava :", err.message);
    process.exit(1);
  }

  if (!activities.length) {
    console.log("⚠️  Aucune activité trouvée dans les 30 derniers jours.");
    process.exit(0);
  }

  // Sort by date desc
  activities.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

  // Persist raw activities for the backfill engine (idempotent cache).
  fs.writeFileSync(ACT_CACHE, JSON.stringify(activities, null, 2));

  const load         = computeLoad(activities);
  const dernière     = formatDerniereSéance(activities[0]);

  if (DEBUG_DECOUPLING_CANDIDATES) {
    reportDecouplingCandidates(activities);
  }

  // P0-BIS §3.2 — Si aucune activité récente + signaux autonomiques élevés,
  // override le statut pour ne pas déclencher "sous-charge" pile quand Benoît
  // est en phase de récup post-maladie.
  let whoopObs = [];
  try { whoopObs = buildWhoopObservations(); }
  catch (e) { console.warn("⚠️  Whoop illness detector indisponible :", e.message); }

  const recovery = detectRecoveryPhase(whoopObs);
  if (recovery.in_recovery && (load.statut === "no-recent-activity" || load.statut === "sous-charge")) {
    console.log(`⚠️  Phase récup détectée — signaux autonomiques : ${recovery.autonomic_flags.map(f => f.signal).join(", ") || "journal"}`);
    load.statut  = "recovery_phase";
    load.recovery = recovery;
  }

  console.log(`✅ Charge aiguë  : ${load.chargeAigue} UA`);
  console.log(`✅ Chronique     : ${load.chronique} UA`);
  console.log(`✅ Ratio         : ${load.ratio === null ? "non calculable" : load.ratio} (${load.statut})`);
  console.log(`✅ Dernière séance : ${dernière.type} — ${dernière.durée}`);

  // ── Write js/data-benoit.js ──
  // This file is loaded AFTER data.js and overrides window.ATHLETES.benoit
  // with real fields, keeping everything else intact.

  // Jours depuis la dernière activité (pour messages contextuels)
  const joursDepuisDerniere = activities[0]
    ? Math.floor((Date.now() - new Date(activities[0].start_date).getTime()) / 86400000)
    : null;

  const alertes = {
    ok: {
      type: "ok",
      titre: "Forme en zone de progression",
      message: `Ratio charge/récupération à ${load.ratio} — zone optimale. Continue comme ça.`,
      action: "Voir le détail de ma charge",
    },
    surcharge: {
      type: "surcharge",
      titre: "Attention : signaux de surcharge détectés",
      message: `Ratio à ${load.ratio} — au-dessus du seuil critique (1.3). Réduis l'intensité cette semaine.`,
      action: "Voir mes options de récupération",
    },
    "sous-charge": {
      type: "sous-charge",
      titre: "Tu peux progresser davantage",
      message: `Ratio à ${load.ratio} — ton corps est bien récupéré. C'est le bon moment pour augmenter le volume.`,
      action: "Voir comment augmenter ma charge",
    },
    "no-recent-activity": {
      type: "info",
      titre: "Aucune séance dans les 7 derniers jours",
      message: `Ta dernière activité remonte à ${joursDepuisDerniere ?? "?"} jours. Le ratio charge/récupération n'est pas calculable sur une fenêtre vide. Reprends une séance douce ou vérifie que Garmin→Strava a bien synchronisé.`,
      action: "Voir l'historique",
    },
    "no-data": {
      type: "info",
      titre: "Pas de données d'entraînement sur les 28 derniers jours",
      message: `Aucune activité Strava trouvée dans le dernier mois. Impossible de calculer ta charge d'entraînement.`,
      action: "Vérifier la synchronisation",
    },
    "recovery_phase": {
      type: "info",
      titre: "Phase de récupération post-événement",
      message: load.recovery?.journal_illness
        ? `Maladie/blessure signalée récemment. Aucune recommandation d'intensité tant que les signaux ne sont pas revenus à ta base.`
        : `Signaux autonomiques élevés sur les 5 derniers jours (${(load.recovery?.autonomic_flags || []).map(f => `${f.signal} ${f.peak} vs base ${f.baseline}`).join(" · ") || "—"}). Phase de récup : aucune recommandation d'intensité.`,
      action: "Voir mes signaux",
    },
  };

  const seances     = formatSeances(activities, load.ratio);
  const disciplines = computeDisciplines(activities);
  const historique  = computeWeeklyStats(activities, 12);

  const output = `// AUTO-GENERATED by scripts/sync.js — ${new Date().toISOString()}
// Do not edit manually — run sync.command to refresh.

(function() {
  // Deep-merge real Strava data into window.ATHLETES.benoit
  const real = ${JSON.stringify({
    forme: {
      chargeAigue:  load.chargeAigue,
      chronique:    load.chronique,
      ratio:        load.ratio,
      statut:       load.statut,
    },
    derniereSéance: dernière,
    alerte:         alertes[load.statut],
    seances,
    disciplines,
    historique,
    _lastSync:      new Date().toISOString(),
    _activitiesCount: activities.length,
  }, null, 2)};

  if (window.ATHLETES && window.ATHLETES.benoit) {
    // Merge forme fields (preserve hrv, sleep etc. that come from Whoop)
    Object.assign(window.ATHLETES.benoit.forme, real.forme);
    window.ATHLETES.benoit.derniereSéance = real.derniereSéance;
    window.ATHLETES.benoit.alerte         = real.alerte;
    window.ATHLETES.benoit.seances        = real.seances;
    window.ATHLETES.benoit.disciplines    = real.disciplines;
    window.ATHLETES.benoit.historique     = real.historique;
    window.ATHLETES.benoit._lastSync      = real._lastSync;
  }
})();
`;

  fs.writeFileSync(OUTPUT, output);
  console.log(`\n📝 Fichier généré : js/data-benoit.js`);

  // ── Write observations for scoring engine ──
  // The browser can't access localStorage from Node, so we write a JS file
  // that scoring.js merges at load time (window.WEARABLE_OBS).

  const now = Date.now();
  const stravaObs = [];

  // Ne pousser le ratio que s'il est réellement calculable — sinon absence propre
  if (load.ratio !== null) {
    stravaObs.push({
      signal_id:  "acute_chronic_ratio",
      raw_value:  load.ratio,
      athlete_id: "benoit",
      timestamp:  now,
    });
  }

  if (activities[0]) {
    stravaObs.push({
      signal_id:  "last_session_rpe",
      raw_value:  Math.min(5, Math.max(1, Math.round((activities[0].suffer_score || 50) / 50))),
      athlete_id: "benoit",
      timestamp:  new Date(activities[0].start_date).getTime(),
    });
  }

  // Aerobic decoupling on running sessions (P1-a.4)
  const decouplingObs = await computeRunDecouplingObs(activities);
  stravaObs.push(...decouplingObs);

  const obsOutput = `// AUTO-GENERATED by scripts/sync.js — ${new Date().toISOString()}
// Strava observations for scoring.js (merged via window.WEARABLE_OBS)
window.WEARABLE_OBS = (window.WEARABLE_OBS || []).concat(${JSON.stringify(stravaObs, null, 2)});
`;

  fs.writeFileSync(OBS_OUT, obsOutput);
  console.log(`📝 Observations  : js/observations-strava.js`);
  console.log("\n✅ Sync terminée ! Ouvre index.html pour voir tes vraies données.\n");
}

main().catch(err => {
  console.error("\n❌ Erreur inattendue :", err.message);
  process.exit(1);
});
