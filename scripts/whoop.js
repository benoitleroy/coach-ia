// scripts/whoop.js
// Lit les CSV exportés depuis Whoop et génère js/observations-whoop.js
// Run: node scripts/whoop.js  (ou intégré dans sync.command)

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const WHOOP_DIR  = path.join(__dirname, "../my_whoop_data_2026_04_16");
const OUTPUT     = path.join(__dirname, "../js/observations-whoop.js");
const ATHLETE_ID = "benoit";

// ─── CSV PARSER ───────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = splitCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = splitCSVLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h.trim()] = (values[i] || "").trim(); });
    return row;
  }).filter(row => Object.values(row).some(v => v !== ""));
}

function splitCSVLine(line) {
  const result = [];
  let cur = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === "," && !inQuotes) { result.push(cur); cur = ""; }
    else { cur += ch; }
  }
  result.push(cur);
  return result;
}

function toTs(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr.replace(" ", "T")).getTime();
}

// Minutes after midnight from "2026-04-15 23:47:06"
function toMinutesOfDay(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr.replace(" ", "T"));
  if (isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
}

function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function pushObs(obs, signal_id, raw_value, ts) {
  if (raw_value == null || ts == null) return;
  obs.push({ signal_id, raw_value, athlete_id: ATHLETE_ID, timestamp: ts });
}

// ─── PARSE PHYSIOLOGICAL CYCLES ──────────────────────────────────────────────
// Ajoute : recovery_score, hrv_morning, rhr_morning, skin_temp, spo2, daily_strain
function parsePhysio() {
  const file = path.join(WHOOP_DIR, "physiological_cycles.csv");
  if (!fs.existsSync(file)) { console.warn("⚠️  physiological_cycles.csv introuvable"); return []; }
  const rows = parseCSV(fs.readFileSync(file, "utf8"));
  const obs = [];

  rows.forEach(row => {
    const ts = toTs(row["Heure de début du cycle"]);
    if (!ts) return;

    pushObs(obs, "recovery_score",   num(row["Score de récupération %"]), ts);
    pushObs(obs, "hrv_morning",      num(row["Variabilité de la fréquence cardiaque (ms)"]), ts);
    pushObs(obs, "rhr_morning",      num(row["Fréquence cardiaque au repos (bpm)"]), ts);
    pushObs(obs, "skin_temp",        num(row["Température cutanée (Celsius)"]), ts);
    pushObs(obs, "spo2",             num(row["Niveau d'oxygène %"]), ts);
    pushObs(obs, "daily_strain",     num(row["Effort du jour"]), ts);
  });

  return obs;
}

// ─── PARSE SOMMEIL ────────────────────────────────────────────────────────────
// Ajoute : sleep_hours, sleep_quality, deep_sleep_min, rem_sleep_min,
// sleep_regularity, sleep_efficiency, sleep_debt, respiratory_rate,
// bedtime_minutes, wake_minutes
function parseSommeil() {
  const file = path.join(WHOOP_DIR, "sommeil.csv");
  if (!fs.existsSync(file)) { console.warn("⚠️  sommeil.csv introuvable"); return []; }
  const rows = parseCSV(fs.readFileSync(file, "utf8"));
  const obs = [];

  rows.forEach(row => {
    const ts = toTs(row["Heure de début du cycle"]);
    if (!ts) return;

    // Skip naps (sieste) — but still ingest nap_deep_min separately for I13 later
    if (row["Sieste"] === "true") return;

    const dureeMin = num(row["Durée du sommeil (min)"]);
    if (dureeMin !== null) {
      pushObs(obs, "sleep_hours", Math.round((dureeMin / 60) * 10) / 10, ts);
    }

    pushObs(obs, "sleep_quality",     num(row["Performance Sommeil %"]), ts);
    pushObs(obs, "respiratory_rate",  num(row["Fréquence respiratoire (tr/min)"]), ts);
    pushObs(obs, "deep_sleep_min",    num(row["Durée du sommeil profond (min)"]), ts);
    pushObs(obs, "rem_sleep_min",     num(row["Durée du sommeil paradoxal (min)"]), ts);
    pushObs(obs, "sleep_efficiency",  num(row["Efficacité du sommeil %"]), ts);
    pushObs(obs, "sleep_regularity",  num(row["Régularité du sommeil %"]), ts);
    pushObs(obs, "sleep_debt",        num(row["Dette de sommeil (min)"]), ts);
    pushObs(obs, "bedtime_minutes",   toMinutesOfDay(row["Premiers signes de sommeil"]), ts);
    pushObs(obs, "wake_minutes",      toMinutesOfDay(row["Premiers signes de réveil"]), ts);
  });

  return obs;
}

// ─── PARSE ENTRAÎNEMENTS (zones FC Whoop par séance) ─────────────────────────
// Chaque séance Whoop → 1 observation structurée avec ses zones FC, exploitable
// par les détecteurs de polarisation (I15, I16, I21).
function parseEntrainements() {
  const file = path.join(WHOOP_DIR, "entraînements.csv");
  if (!fs.existsSync(file)) return [];
  const rows = parseCSV(fs.readFileSync(file, "utf8"));
  const obs = [];

  rows.forEach(row => {
    const ts = toTs(row["Heure de début de l'entraînement"]) || toTs(row["Heure de début du cycle"]);
    if (!ts) return;

    const strain = num(row["Effort activité"]);
    if (strain !== null) {
      pushObs(obs, "session_strain", strain, ts);
    }

    // Zones FC (1-5) : stocker en un seul signal structuré
    const z = {
      z1: num(row["Zone FC 1 %"]),
      z2: num(row["Zone FC 2 %"]),
      z3: num(row["Zone FC 3 %"]),
      z4: num(row["Zone FC 4 %"]),
      z5: num(row["Zone FC 5 %"]),
    };
    const hasAny = Object.values(z).some(v => v !== null && v > 0);
    if (hasAny) {
      obs.push({
        signal_id: "session_hr_zones",
        raw_value: { ...z, duration_min: num(row["Durée (min)"]), name: row["Nom de l'activité"] || "" },
        athlete_id: ATHLETE_ID,
        timestamp: ts,
      });
    }
  });

  return obs;
}

// ─── PARSE JOURNAL ────────────────────────────────────────────────────────────
// Le journal Whoop est stocké en (cycle, question, réponse). On mappe les
// questions connues vers des signaux "confounder" exploitables par P7.
const JOURNAL_MAP = [
  { keywords: ["blessure"],          signal: "injury_flag" },
  { keywords: ["protéines"],         signal: "protein_intake" },
  { keywords: ["alcool"],            signal: "alcohol_yesterday" },
  { keywords: ["caféine"],           signal: "caffeine_late" },
  { keywords: ["stress"],            signal: "stress_reported" },
  { keywords: ["voyage"],            signal: "travel_yesterday" },
  { keywords: ["malade", "maladie"], signal: "illness_reported" },
  { keywords: ["dernier verre"],     signal: "alcohol_yesterday" },
];

// Whoop ne propose pas de question "malade ?" — seulement "blessure ?".
// Stratégie : 1) détecter les "ancres maladie" (blessure=oui + notes type "malade/toux/grippe"),
// 2) reclasser toute blessure=oui dans ±10j d'une ancre comme illness_reported.
const ILLNESS_NOTE_KEYWORDS = ["malad", "grippe", "rhume", "toux", "fièvre", "fievre", "angine", "sick", "covid", "gastro"];
const ILLNESS_WINDOW_MS = 10 * 86400 * 1000;

function parseJournal() {
  const file = path.join(WHOOP_DIR, "journal_entries.csv");
  if (!fs.existsSync(file)) return [];
  const rows = parseCSV(fs.readFileSync(file, "utf8"));

  // Pass 1 : ancres maladie (timestamps)
  const illnessAnchors = [];
  rows.forEach(row => {
    const ts = toTs(row["Heure de début du cycle"]);
    if (!ts) return;
    const question = (row["Texte de la question"] || "").toLowerCase();
    const notes = (row["Notes"] || "").toLowerCase();
    const yes = row["A répondu oui"] === "true";
    if (yes && question.includes("blessure") && ILLNESS_NOTE_KEYWORDS.some(k => notes.includes(k))) {
      illnessAnchors.push(ts);
    }
  });

  const isNearIllnessAnchor = ts => illnessAnchors.some(a => Math.abs(ts - a) <= ILLNESS_WINDOW_MS);

  // Pass 2 : émission des obs avec reclassement
  const obs = [];
  rows.forEach(row => {
    const ts = toTs(row["Heure de début du cycle"]);
    if (!ts) return;
    const question = (row["Texte de la question"] || "").toLowerCase();
    const yes = row["A répondu oui"] === "true";

    const match = JOURNAL_MAP.find(m => m.keywords.some(k => question.includes(k)));
    if (!match) return;

    let signal = match.signal;
    if (signal === "injury_flag" && yes && isNearIllnessAnchor(ts)) {
      signal = "illness_reported";
    }

    pushObs(obs, signal, yes ? 1 : 0, ts);
  });

  return obs;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export function buildWhoopObservations() {
  const all = [
    ...parsePhysio(),
    ...parseSommeil(),
    ...parseEntrainements(),
    ...parseJournal(),
  ].sort((a, b) => a.timestamp - b.timestamp);
  return all;
}

// Run standalone
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log("\n💜 Coach IA 2030 — Import Whoop");
  console.log("════════════════════════════════\n");

  const obs = buildWhoopObservations();

  const bySignal = {};
  obs.forEach(o => { bySignal[o.signal_id] = (bySignal[o.signal_id] || 0) + 1; });

  Object.entries(bySignal).sort().forEach(([sig, n]) => {
    console.log(`✅ ${sig.padEnd(22)} : ${n} obs`);
  });

  const output = `// AUTO-GENERATED by scripts/whoop.js — ${new Date().toISOString()}
// Whoop CSV observations for scoring.js (merged via window.WEARABLE_OBS)
window.WEARABLE_OBS = (window.WEARABLE_OBS || []).concat(${JSON.stringify(obs, null, 2)});
`;

  fs.writeFileSync(OUTPUT, output);
  console.log(`\n📝 ${obs.length} observations écrites dans js/observations-whoop.js`);
  console.log("✅ Import Whoop terminé !\n");
}
