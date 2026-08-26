// scripts/bilan.js
// BILAN auto du carnet : 12 mois d'activités Strava → tableau mensuel, marqueurs
// d'efficacité (allure/FC en course, W/FC à vélo), puis bilan coach rédigé par
// Claude (efficacité, ce qui manque pour devenir hybride, semaine suivante).
//
//   import { computeBilan, coachBilan, writeBilan } from "./bilan.js";
//   const bilan = computeBilan(activities, new Date());
//   bilan.coach = await coachBilan(bilan, carnet);   // mis en cache, best-effort
//   writeBilan(bilan);                                // → js/bilan-data.js
//
// Lancé directement : node scripts/bilan.js [--force]  → relit le cache Strava local.

import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { loadPhotoCache } from "./photos.js";
import { loadNotes } from "./note.js";

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const ACT_CACHE  = path.join(__dirname, ".activities.cache.json");
const COACH_CACHE= path.join(__dirname, ".bilan.cache.json");
const OUTPUT     = path.join(__dirname, "../js/bilan-data.js");
const GARMIN_CACHE = path.join(__dirname, ".garmin.cache.json");

const DAY = 86400 * 1000;
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

// ─── Profil athlète (à ajuster ici tant qu'il n'y a pas de page profil) ──────
const NAISSANCE = new Date("1987-05-30");
const ageAt = d => { let a = d.getFullYear() - NAISSANCE.getFullYear(); const m = d.getMonth() - NAISSANCE.getMonth(); if (m < 0 || (m === 0 && d.getDate() < NAISSANCE.getDate())) a--; return a; };
export const PROFIL = {
  prenom: "Benoît", get age() { return ageAt(new Date()); }, naissance: "1987-05-30", fcMax: 190,
  poidsKg: 77.5,   // estimation Benoît 22/08/2026 : « 75/80 kg » — à affiner avec une pesée
  tailleCm: null,
  nutrition: "PETIT-DÉJEUNER FIXE, ne pas le modifier : 3 œufs à la coque + 500 ml d'eau + vitamine D + K1 + complexe vitamine B (Pillar). Le coach peut seulement proposer un AJOUT (ex. banane, flocons, pain) avant une séance longue ou intense du matin, et le dire explicitement. MIDI : toujours sur chantier → boîte transportable, qui se mange froide ou tiède (pas de micro-ondes garanti), préparée la veille ou issue du batch. SOIR : repas maison ≤ 20 min, c'est là que se joue l'ajustement glucides/protéines selon la séance. Veut des repas concrets calés sur les séances, achetés le week-end et préparés à l'avance (batch cooking du dimanche). Pas de comptage de calories. Aucune contrainte alimentaire connue.",

  objectif: "devenir un athlète hybride : endurance (course, vélo, natation) + force (CrossFit, charges lourdes)",
  contexte: "pratique CrossFit en box, Pilates régulier, historique triathlon/Ironman. Préparait l'Ironman Switzerland (Thun, 5 juillet 2026) — ANNULÉ volontairement pour accompagner son fils à une compétition d'échecs : le creux mai→août 2026 est un choix familial assumé, pas un abandon ni une blessure. Reprise fin août 2026 avec un nouvel objectif hybride.",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const disciplineOf = a => {
  const t = a.sport_type || a.type;
  if (t === "Swim") return "nat";
  if (["Ride", "VirtualRide", "GravelRide", "MountainBikeRide"].includes(t)) return "velo";
  if (["Run", "VirtualRun", "TrailRun"].includes(t)) return "run";
  return "autre";
};

// Doublons Garmin + Strava (même jour, même type, durée ±10 %, départ < 1 h d'écart)
export function dedupe(activities) {
  const sorted = [...activities].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  const kept = [];
  for (const a of sorted) {
    const dup = kept.find(k => (k.sport_type || k.type) === (a.sport_type || a.type)
      && Math.abs(new Date(k.start_date) - new Date(a.start_date)) < 3600e3
      && Math.abs((k.moving_time || 0) - (a.moving_time || 0)) <= 0.1 * Math.max(k.moving_time || 1, a.moving_time || 1));
    if (dup) { // garde la version la plus riche (FC / watts)
      const score = x => (x.average_heartrate ? 1 : 0) + (x.average_watts ? 1 : 0) + (x.suffer_score ? 1 : 0);
      if (score(a) > score(dup)) kept[kept.indexOf(dup)] = a;
      continue;
    }
    kept.push(a);
  }
  return kept;
}

const pace = a => a.distance > 0 ? a.moving_time / (a.distance / 1000) : null; // s/km
const fmtPace = s => s == null ? null : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

// ─── Calcul ──────────────────────────────────────────────────────────────────

export function computeBilan(activities, now = new Date(), nMonths = 12) {
  const acts = dedupe(activities);
  const months = [];
  for (let i = nMonths - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ key, label: `${MOIS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, sec: 0, n: 0, jours: new Set(), re: 0,
      disc: { nat: { sec: 0, km: 0, n: 0 }, velo: { sec: 0, km: 0, n: 0 }, run: { sec: 0, km: 0, n: 0 }, autre: { sec: 0, km: 0, n: 0 } }, types: {} });
  }
  const byKey = Object.fromEntries(months.map(m => [m.key, m]));

  acts.forEach(a => {
    const key = (a.start_date_local || a.start_date).slice(0, 7);
    const m = byKey[key]; if (!m) return;
    const d = disciplineOf(a), sec = a.moving_time || 0, km = (a.distance || 0) / 1000;
    m.sec += sec; m.n += 1; m.re += a.suffer_score || 0; m.jours.add((a.start_date_local || a.start_date).slice(0, 10));
    m.disc[d].sec += sec; m.disc[d].km += km; m.disc[d].n += 1;
    const t = a.sport_type || a.type; m.types[t] = (m.types[t] || 0) + 1;
  });

  const mois = months.map(m => ({
    key: m.key, label: m.label, h: Math.round(m.sec / 360) / 10, n: m.n, jours: m.jours.size, re: m.re,
    disc: Object.fromEntries(Object.entries(m.disc).map(([k, v]) => [k, { h: Math.round(v.sec / 360) / 10, km: Math.round(v.km), n: v.n }])),
    types: m.types,
  }));

  // Marqueurs d'efficacité
  const since = now.getTime() - 365 * DAY;
  const recent = acts.filter(a => new Date(a.start_date).getTime() >= since);
  const course = recent.filter(a => disciplineOf(a) === "run" && a.distance >= 8000 && a.average_heartrate)
    .map(a => ({ date: (a.start_date_local || a.start_date).slice(0, 10), km: Math.round(a.distance / 100) / 10, pace: fmtPace(pace(a)), paceSec: Math.round(pace(a)), hr: Math.round(a.average_heartrate), dplus: Math.round(a.total_elevation_gain || 0) }));
  const velo = recent.filter(a => disciplineOf(a) === "velo" && a.moving_time >= 3600 && a.average_watts && a.average_heartrate)
    .map(a => ({ date: (a.start_date_local || a.start_date).slice(0, 10), min: Math.round(a.moving_time / 60), w: Math.round(a.weighted_average_watts || a.average_watts), hr: Math.round(a.average_heartrate), km: Math.round(a.distance / 1000) }));

  // Indice d'efficacité course = allure à FC normalisée (s/km × 140/FC), moyenne par trimestre
  const quarter = d => { const dt = new Date(d); return `${dt.getFullYear()}-T${Math.floor(dt.getMonth() / 3) + 1}`; };
  const effQ = {};
  course.forEach(c => { const q = quarter(c.date); (effQ[q] ??= []).push(c.paceSec * 140 / c.hr); });
  const efficaciteCourse = Object.entries(effQ).map(([q, arr]) => ({ trimestre: q, paceA140: fmtPace(arr.reduce((s, v) => s + v, 0) / arr.length), n: arr.length }));
  const effV = {};
  velo.forEach(v => { const q = quarter(v.date); (effV[q] ??= []).push(v.w * 140 / v.hr); });
  const efficaciteVelo = Object.entries(effV).map(([q, arr]) => ({ trimestre: q, wA140: Math.round(arr.reduce((s, v) => s + v, 0) / arr.length), n: arr.length }));

  const total = mois.reduce((s, m) => s + m.h, 0);
  return {
    generatedAt: now.toISOString(),
    mois, total: { h: Math.round(total * 10) / 10, n: mois.reduce((s, m) => s + m.n, 0), jours: mois.reduce((s, m) => s + m.jours, 0) },
    efficacite: { course, velo, courseTrim: efficaciteCourse, veloTrim: efficaciteVelo },
    lastActivityId: acts.length ? acts[acts.length - 1].id : null,
  };
}

// ─── Bilan coach (Claude CLI) ────────────────────────────────────────────────

const CLAUDE_CANDIDATES = ["claude", path.join(os.homedir(), ".npm-global/bin/claude"), path.join(os.homedir(), ".claude/local/claude"), "/usr/local/bin/claude", "/opt/homebrew/bin/claude"];
function findClaude() {
  for (const c of CLAUDE_CANDIDATES) { try { execFileSync(c, ["--version"], { stdio: "ignore" }); return c; } catch {} }
  return null;
}

function isoWeekLabel(d) {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = dt.getUTCDay() || 7; dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const ys = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return `${dt.getUTCFullYear()}-S${Math.ceil(((dt - ys) / DAY + 1) / 7)}`;
}

function digest(bilan, carnet, activities) {
  const lines = [];
  lines.push("TABLEAU MENSUEL (12 mois) — h totales · séances · jours actifs · nat h(km) · vélo h(km) · course h(km) · renfo/autre h · effort relatif Strava · types");
  bilan.mois.forEach(m => lines.push(`${m.label}: ${m.h}h · ${m.n} · ${m.jours}j · nat ${m.disc.nat.h}h(${m.disc.nat.km}) · vélo ${m.disc.velo.h}h(${m.disc.velo.km}) · course ${m.disc.run.h}h(${m.disc.run.km}) · autre ${m.disc.autre.h}h · RE ${m.re} · ${JSON.stringify(m.types)}`));
  lines.push("\nEFFICACITÉ COURSE (sorties ≥ 8 km) : date · km · allure · FC moy · D+");
  bilan.efficacite.course.forEach(c => lines.push(`${c.date} ${c.km}km ${c.pace}/km ${c.hr}bpm D+${c.dplus}`));
  lines.push("Allure normalisée à 140 bpm par trimestre : " + bilan.efficacite.courseTrim.map(q => `${q.trimestre} ${q.paceA140}/km (n=${q.n})`).join(" · "));
  lines.push("\nEFFICACITÉ VÉLO (≥ 1 h avec W et FC) : date · min · W · FC");
  bilan.efficacite.velo.forEach(v => lines.push(`${v.date} ${v.min}min ${v.w}W ${v.hr}bpm`));
  lines.push("W normalisés à 140 bpm par trimestre : " + bilan.efficacite.veloTrim.map(q => `${q.trimestre} ${q.wA140}W (n=${q.n})`).join(" · "));

  // 6 dernières semaines en détail
  const since = Date.now() - 42 * DAY;
  lines.push("\nDÉTAIL 6 DERNIÈRES SEMAINES : date · type · durée · km · FC moy · FC max · W · effort relatif · nom");
  const notes = loadNotes();
  dedupe(activities).filter(a => new Date(a.start_date).getTime() >= since).forEach(a => {
    const photo = loadPhotoCache(a.id);
    lines.push(`${(a.start_date_local || a.start_date).slice(0, 10)} ${a.sport_type || a.type} ${Math.round((a.moving_time || 0) / 60)}min ${a.distance ? (a.distance / 1000).toFixed(1) + "km" : ""} ${a.average_heartrate ? Math.round(a.average_heartrate) + "bpm" : ""} ${a.max_heartrate ? "max" + Math.round(a.max_heartrate) : ""} ${a.average_watts ? Math.round(a.average_watts) + "W" : ""} ${a.suffer_score ? "RE" + a.suffer_score : ""} | ${a.name || ""}`);
    if (photo?.contenu) lines.push("   CONTENU DE SÉANCE (photo) :\n" + photo.contenu.split("\n").map(l => "   " + l).join("\n"));
    if (notes[a.id]) lines.push(`   NOTE DE BENOÎT : ${notes[a.id].note}`);
  });

  // Sommeil / récupération Garmin (28 derniers jours) si disponible
  try {
    const g = JSON.parse(fs.readFileSync(GARMIN_CACHE, "utf8"));
    const since28 = Date.now() - 28 * DAY;
    const jours = (g.jours || []).filter(j => new Date(j.date + "T12:00:00").getTime() >= since28 && j.sommeil);
    if (jours.length) {
      lines.push("\nSOMMEIL / RÉCUPÉRATION GARMIN (28 derniers jours) : date · durée · score · profond · HRV nuit (statut) · FC repos · Body Battery réveil/max · stress moy · readiness");
      jours.forEach(j => {
        const s = j.sommeil, bb = j.body_battery || {};
        lines.push(`${j.date} ${Math.floor(s.total_min / 60)}h${String(s.total_min % 60).padStart(2, "0")} score ${s.score ?? "—"} profond ${s.profond_min}min · HRV ${j.hrv_nuit ?? "—"}${j.hrv_statut ? " (" + j.hrv_statut + ")" : ""} · FC repos ${j.fc_repos ?? "—"} · BB ${bb.reveil ?? "—"}/${bb.max ?? "—"} · stress ${j.stress_moy ?? "—"} · readiness ${j.readiness?.score ?? "—"}`);
      });
      const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
      const d7 = jours.slice(-7);
      lines.push(`Moyennes 7 nuits : sommeil ${avg(d7.map(j => j.sommeil.total_min))} min · HRV ${avg(d7.map(j => j.hrv_nuit).filter(Boolean)) ?? "—"} · FC repos ${avg(d7.map(j => j.fc_repos).filter(Boolean)) ?? "—"} — 28 nuits : sommeil ${avg(jours.map(j => j.sommeil.total_min))} min · HRV ${avg(jours.map(j => j.hrv_nuit).filter(Boolean)) ?? "—"} · FC repos ${avg(jours.map(j => j.fc_repos).filter(Boolean)) ?? "—"}`);
    }
  } catch {}

  if (carnet) {
    lines.push(`\nCARNET SEMAINE ${carnet.semaine.label} : ${(carnet.semaine.sec / 3600).toFixed(1)} h · ${carnet.semaine.count} séances · charge 7j ${carnet.charge.aigue} vs 28j ${carnet.charge.chronique} (ratio ${carnet.charge.ratio}, ${carnet.charge.statut}) · intensité easy/hard ${carnet.intensite.easy}/${carnet.intensite.hard} % · ${carnet.regularite.seancesParSemaine} séances/sem · ${carnet.regularite.joursOff28} jours off/28`);
  }
  return lines.join("\n");
}

// Référentiel méthodologique demandé par Benoît (26/08/2026) : Véronique Billat
const METHODE_BILLAT = `MÉTHODE DE RÉFÉRENCE — Véronique Billat (physiologie de l'exercice, VO2max) — applique ces principes dans la programmation :
- La VO2max se travaille et se CONSERVE en vieillissant par l'intensité, pas par le volume : garder 1 stimulus VO2max/semaine dès que la base est posée (HRV en base, pas de douleur), même court.
- Format signature : le 30/30 Billat — 30 s à vVO2max / 30 s trot, en blocs (ex. 2×(8-12×30/30), récup 3'), précédé d'un échauffement progressif. C'est LE format efficace et peu traumatisant pour un athlète de 35-45 ans qui reprend — préférable aux longues séances de seuil au début.
- vVO2max = la plus petite vitesse qui sollicite VO2max (tenable ~4-8 min). L'estimer par un demi-Cooper (test 3 min à fond après échauffement, distance/3min → vitesse) ou par la meilleure allure ~6 min des données Strava. Programmer un demi-Cooper quand les signaux sont verts, puis caler les 30/30 dessus.
- Courir « à la sensation » plutôt qu'à l'allure imposée : Billat montre que l'allure librement variable à sensation constante est plus efficace et moins coûteuse que l'allure fixe — donner des cibles en sensation/FC, autoriser la variation d'allure (relances dans les sorties, négative split spontané).
- Alterner marche/course ou allures variées est légitime, y compris pour progresser (ce n'est pas « de la triche ») ; les sorties longues peuvent inclure des variations libres plutôt qu'un rythme monocorde.
- Le temps passé À VO2max (ou proche) est le stimulus clé : mieux vaut cumuler 6-10 min à VO2max via des fractions courtes que rater une séance seuil longue.
- Éviter le « ni facile ni dur » chronique : polarisation — l'essentiel très facile (conversation), un peu très dur (30/30), presque rien entre les deux.
- Chez le sportif qui reprend ou vieillit : d'abord la régularité et la force, puis réintroduire le stimulus VO2max ; jamais deux séances dures de suite ; le dur se mérite par une nuit correcte (HRV en base).`;

const COACH_PROMPT = (bilan, carnet, activities, now) => `Tu es un coach sportif avec une solide formation en physiologie de l'exercice (endurance, force, athlète hybride, périodisation, prévention des blessures chez le sportif de 35-45 ans). Tu écris en français, tu tutoies, ton ton est direct, concret, bienveillant, sans jargon inutile ni enthousiasme artificiel. Tu t'appuies UNIQUEMENT sur les données ci-dessous (Strava, et Garmin Connect pour le sommeil/HRV/FC repos quand la section existe) — ne suppose pas de données que tu n'as pas ; si quelque chose manque (sommeil, nutrition, blessure), dis-le en une ligne. Quand le sommeil/HRV est présent, intègre-le dans le verdict et adapte la semaine (ex. HRV sous la base ou sommeil < 6 h 30 → moins d'intensité).

ATHLÈTE : ${PROFIL.prenom}, ${PROFIL.age} ans, FC max ~${PROFIL.fcMax} bpm${PROFIL.poidsKg ? `, ${PROFIL.poidsKg} kg` : " (poids non renseigné : suppose ~80 kg et précise-le)"}${PROFIL.tailleCm ? `, ${PROFIL.tailleCm} cm` : ""}. Objectif : ${PROFIL.objectif}. Contexte : ${PROFIL.contexte}.
NUTRITION : ${PROFIL.nutrition}
DATE DU JOUR : ${now.toISOString().slice(0, 10)} (semaine ${isoWeekLabel(now)}). La semaine à planifier est la PROCHAINE semaine (lundi → dimanche).

${METHODE_BILLAT}

DONNÉES :
${digest(bilan, carnet, activities)}

Réponds UNIQUEMENT avec un objet JSON valide (pas de markdown, pas de texte autour) de la forme :
{
 "verdict": "3 à 5 phrases : l'entraînement est-il efficace, avec 1-2 preuves chiffrées tirées des données (allure/FC, W/FC, régularité) et la tendance récente",
 "forts": ["2 à 4 points forts, chacun une phrase courte avec un chiffre"],
 "manques": ["2 à 4 choses qui manquent pour l'objectif hybride, chacune une phrase courte et actionnable"],
 "vigilance": "1 phrase sur le risque principal du moment (blessure, surcharge, décrochage) ou \\"\\" si rien",
 "semaine": {
   "titre": "objectif de la semaine prochaine en quelques mots",
   "volumeCible": "ex. ~4 h 30",
   "jours": [
     {"jour": "Lun", "ico": "🏃", "seance": "titre court", "detail": "contenu précis (durées, FC cibles, séries × reps, charges relatives)", "gardefou": "1 règle d'arrêt ou d'ajustement"}
   ]
 },
 "regle": "1 phrase : quelle séance sauter en priorité si la semaine déborde, laquelle ne jamais sauter",
 "nutrition": {
   "principe": "2-3 phrases : la logique de la semaine (protéines réparties, glucides autour des séances dures, jours légers), avec les repères chiffrés (g de protéines/jour, portions) adaptés au poids",
   "batch": ["4 à 7 préparations à faire le week-end (dimanche), chacune : quoi + quantité pour la semaine + conservation, ex. \"Cuire 1 kg de poulet mariné au four → 5 portions, 4 j frigo\""],
   "recettes": [
     {"nom": "nom court", "usage": "batch dimanche / dîner mardi / boîte chantier…", "portions": "ex. 6 portions", "temps": "ex. 10 min prépa + 25 min four", "ingredients": ["quantité + ingrédient, un par entrée"], "etapes": ["étape numérotée, une action par étape, précise (température, durée, texture attendue)"], "conservation": "ex. 4 j au frigo, se congèle"}
   ],
   "courses": [{"rayon": "Protéines", "items": ["liste courte avec quantités"]}, {"rayon": "Féculents & légumineuses", "items": []}, {"rayon": "Légumes & fruits", "items": []}, {"rayon": "Produits laitiers & œufs", "items": []}, {"rayon": "Épicerie", "items": []}],
   "jours": [
     {"jour": "Lun", "type": "ex. jour force / endurance facile / repos", "petitDej": "\"Habituel\" ou \"Habituel + …\" (ajout justifié seulement)", "dejeuner": "boîte chantier froide/tiède, précise", "collation": "ce qu'on mange AUTOUR de la séance (avant/après) ou \"—\"", "diner": "…"}
   ]
 }
}
Contraintes pour les recettes : TOUTES les préparations du batch ET tous les dîners/boîtes qui demandent une cuisson doivent avoir leur recette complète (8 à 12 recettes), écrites pour quelqu'un qui cuisine peu : quantités exactes en g/ml/pièces, étapes numérotées courtes, températures et durées, ce qu'on doit voir/sentir pour savoir que c'est cuit, et la conservation. Les recettes réutilisent le batch (pas de recette qui refait cuire du riz ou du poulet déjà préparés). Les ingrédients des recettes et la liste de courses doivent correspondre exactement (mêmes produits, quantités totales cohérentes, arrondies au conditionnement du supermarché : boîte, paquet, barquette).
Contraintes pour la nutrition : 7 entrées (Lun→Dim) alignées sur la séance du jour (jour force = plus de protéines et glucides au dîner, jour endurance longue = glucides la veille au soir et au petit-déj, repos = assiette plus légère, légumes dominants) ; repas RÉALISTES de semaine : 3 à 5 recettes de base déclinées, réutilisant les préparations du batch, cuisson ≤ 20 min le soir ; quantités en unités simples (1 poing, 1 paume, 150 g, 2 œufs) ; petit-déjeuners répétitifs acceptés ; la liste de courses doit couvrir exactement les repas proposés, groupée par rayon, avec quantités pour 1 personne / 7 jours.
Contraintes pour la semaine : 7 entrées (Lun→Dim, un jour de repos a ico "😴" et detail court), progressive par rapport à ce qui a réellement été fait les 4 dernières semaines (pas plus de +20 à +30 % de volume), 2 séances de force si objectif hybride, au moins 1 séance d'endurance vraiment facile (FC < 140) et au plus 1 séance intense en course, tenir compte des séances CrossFit lues sur photo quand il y en a.`;

export async function coachBilan(bilan, carnet, activities, opts = {}) {
  const { force = false, log = true, now = new Date() } = opts;
  // Clé de cache = semaine ISO uniquement : le plan d'entraînement, les repas et les recettes
  // restent stables toute la semaine (courses faites le week-end). Régénération : nouvelle
  // semaine, ou `node scripts/bilan.js --force`.
  const key = isoWeekLabel(now);
  if (!force) {
    try {
      const c = JSON.parse(fs.readFileSync(COACH_CACHE, "utf8"));
      if (c.key === key) { if (log) console.log("🧠 Bilan coach : inchangé (cache)"); return c.coach; }
    } catch {}
  }
  const bin = findClaude();
  if (!bin) { if (log) console.warn("⚠️  Claude CLI introuvable — bilan coach non généré."); return null; }

  if (log) console.log("🧠 Bilan coach : génération (Claude)…");
  let out;
  try {
    out = execFileSync(bin, ["-p", "--model", "opus"], {
      input: COACH_PROMPT(bilan, carnet, activities, now), encoding: "utf8", timeout: 300_000,
      stdio: ["pipe", "pipe", "pipe"], env: { ...process.env, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1" },
    }).trim();
  } catch (e) {
    if (log) console.warn("⚠️  Bilan coach échoué :", (e.stderr || e.message).toString().trim().split("\n").pop());
    return null;
  }
  let coach;
  try {
    const json = out.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    coach = JSON.parse(json.slice(json.indexOf("{"), json.lastIndexOf("}") + 1));
  } catch {
    if (log) console.warn("⚠️  Bilan coach : réponse non JSON, conservée en texte brut.");
    coach = { verdict: out, forts: [], manques: [], vigilance: "", semaine: null, regle: "" };
  }
  coach.generatedAt = now.toISOString();
  coach.semaineLabel = isoWeekLabel(new Date(now.getTime() + 7 * DAY));
  fs.writeFileSync(COACH_CACHE, JSON.stringify({ key, coach }, null, 2));
  return coach;
}

export function writeBilan(bilan, outPath = OUTPUT) {
  fs.writeFileSync(outPath, `// AUTO-GENERATED by scripts/bilan.js — ${bilan.generatedAt}
// Ne pas éditer : relancer sync.command.
window.BILAN = ${JSON.stringify(bilan, null, 1)};
`);
}

// ─── CLI ─────────────────────────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const acts = JSON.parse(fs.readFileSync(ACT_CACHE, "utf8"));
  const force = process.argv.includes("--force");
  const bilan = computeBilan(acts, new Date());
  let carnet = null;
  try { const s = fs.readFileSync(path.join(__dirname, "../js/carnet-data.js"), "utf8"); carnet = JSON.parse(s.slice(s.indexOf("{"), s.lastIndexOf("}") + 1)); } catch {}
  bilan.coach = await coachBilan(bilan, carnet, acts, { force });
  writeBilan(bilan);
  console.log(`📊 Bilan 12 mois : ${bilan.total.h} h · ${bilan.total.n} séances · ${bilan.total.jours} jours actifs`);
  bilan.mois.forEach(m => console.log(`   ${m.label.padEnd(9)} ${String(m.h).padStart(5)} h · ${String(m.n).padStart(3)} · ${String(m.jours).padStart(2)} j`));
  if (bilan.coach) console.log("\n🧠 " + bilan.coach.verdict + "\n" + (bilan.coach.semaine ? JSON.stringify(bilan.coach.semaine, null, 1) : ""));
  console.log("📝 js/bilan-data.js écrit");
}
