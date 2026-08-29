// scripts/nst.js — Semaine NST (NoShortcuts Training, livré via la plateforme FITR Training) :
// la programmation PRIORITAIRE de Benoît.
// Le coach ne la modifie pas, il construit autour (endurance, VO2max, récupération, nutrition).
//
// Alimenter la semaine :
//   node scripts/nst.js set 2026-S36 fichier.txt      → texte structuré collé/exporté depuis NST
//   node scripts/nst.js photo <activityId|chemin.jpg> → lit une photo/capture d'écran via Claude
//   node scripts/nst.js show                          → affiche la semaine courante
//
// Format attendu du texte : une ligne "Lun", "Mar"… en début de bloc, puis le contenu de la séance.
// Stockage : scripts/nst-semaines.json  { "2026-S36": { source, jours: [{jour, titre, contenu}] } }

import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, "nst-semaines.json");
const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function loadNST() { try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { return {}; } }
export function semaineNST(label) { return loadNST()[label] || null; }

export function texteNST(label) {
  const s = semaineNST(label);
  if (!s) return null;
  return [`PROGRAMMATION NST DE LA SEMAINE (${label}) — PRIORITAIRE, NE PAS LA MODIFIER :`,
    ...(s.jours || []).map(j => `${j.jour}${j.titre ? " — " + j.titre : ""} :\n${(j.contenu || "").split("\n").map(l => "   " + l).join("\n")}`),
    `Consigne : ces séances sont la colonne vertébrale de la semaine. Tu les reprends telles quelles dans le plan (sans les réécrire ni les alléger, sauf signal physiologique clair : HRV LOW deux matins, douleur), et tu construis AUTOUR : endurance facile, séance VO2max si le bloc le prévoit et si NST n'en contient pas déjà, récupération, et la nutrition adaptée à chaque journée. Les séances de la box du club ne s'ajoutent que les jours où NST est léger ou absent.`,
  ].join("\n");
}

function parseTexte(txt) {
  const lignes = txt.split("\n");
  const jours = []; let cur = null;
  for (const l of lignes) {
    const m = l.trim().match(/^(lun|mar|mer|jeu|ven|sam|dim)[a-zéû]*\.?\s*(?:\d{1,2}[\/.]\d{1,2}(?:[\/.]\d{2,4})?)?\s*(?:[-—:·]\s*(.*))?$/i);
    if (m) { cur = { jour: JOURS[["lun", "mar", "mer", "jeu", "ven", "sam", "dim"].indexOf(m[1].toLowerCase())], titre: (m[2] || "").trim(), contenu: "" }; jours.push(cur); continue; }
    if (cur) cur.contenu += (cur.contenu ? "\n" : "") + l.replace(/\s+$/, "");
  }
  jours.forEach(j => j.contenu = j.contenu.trim());
  return jours.filter(j => j.contenu);
}

function findClaude() {
  for (const c of ["claude", path.join(os.homedir(), ".npm-global/bin/claude"), "/usr/local/bin/claude", "/opt/homebrew/bin/claude"]) {
    try { execFileSync(c, ["--version"], { stdio: "ignore" }); return c; } catch {}
  }
  return null;
}

function lirePhoto(fichiers) {
  const bin = findClaude(); if (!bin) throw new Error("Claude CLI introuvable");
  const prompt = `Lis ${fichiers.map(f => `"${f}"`).join(", ")} : ce sont des captures d'écran d'un programme d'entraînement NST (NoShortcuts Training) pour une semaine.
Transcris fidèlement, en texte brut, une section par jour, en commençant chaque section par le jour abrégé sur sa propre ligne (Lun, Mar, Mer, Jeu, Ven, Sam, Dim) suivi éventuellement de " — titre de la séance".
Garde les séries, reps, charges, temps, formats (EMOM, AMRAP, %1RM…) exactement. Pas de markdown, pas de commentaire.`;
  return execFileSync(bin, ["-p", "--model", "opus", "--allowedTools", "Read"], { input: prompt, encoding: "utf8", timeout: 300000, stdio: ["pipe", "pipe", "pipe"] }).trim();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , cmd, ...args] = process.argv;
  const all = loadNST();
  if (cmd === "show") { console.log(JSON.stringify(all, null, 1)); process.exit(0); }
  if (cmd === "set") {
    const [label, fichier] = args;
    const txt = fichier ? fs.readFileSync(fichier, "utf8") : fs.readFileSync(0, "utf8");
    const jours = parseTexte(txt);
    if (!jours.length) { console.error("Aucun jour reconnu (attendu des lignes Lun/Mar/…)"); process.exit(1); }
    all[label] = { source: "NST", importedAt: new Date().toISOString(), jours };
    fs.writeFileSync(FILE, JSON.stringify(all, null, 1));
    console.log(`📝 NST ${label} : ${jours.length} jours enregistrés (${jours.map(j => j.jour).join(", ")})`);
    process.exit(0);
  }
  if (cmd === "dossier") {
    // node scripts/nst.js dossier 2026-S36 ~/Desktop/nst   → lit toutes les images du dossier
    const [label, dossier] = args;
    const dir = path.resolve(dossier.replace(/^~/, os.homedir()));
    const imgs = fs.readdirSync(dir).filter(f => /\.(png|jpe?g|heic|webp)$/i.test(f)).sort()
      .map(f => path.join(dir, f));
    if (!imgs.length) { console.error("Aucune image dans " + dir); process.exit(1); }
    console.log(`📖 Lecture de ${imgs.length} capture(s) : ${imgs.map(f => path.basename(f)).join(", ")}`);
    const txt = lirePhoto(imgs);
    const jours = parseTexte(txt);
    all[label] = { source: "NST (captures)", importedAt: new Date().toISOString(), jours, brut: txt };
    fs.writeFileSync(FILE, JSON.stringify(all, null, 1));
    console.log(txt + `\n\n📝 NST ${label} : ${jours.length} jours enregistrés (${jours.map(j => j.jour).join(", ")})`);
    process.exit(0);
  }
  if (cmd === "photo") {
    const [label, ...fichiers] = args;
    const txt = lirePhoto(fichiers.map(f => path.resolve(f)));
    const jours = parseTexte(txt);
    all[label] = { source: "NST (photo)", importedAt: new Date().toISOString(), jours, brut: txt };
    fs.writeFileSync(FILE, JSON.stringify(all, null, 1));
    console.log(txt + `\n\n📝 NST ${label} : ${jours.length} jours enregistrés`);
    process.exit(0);
  }
  console.log("Usage : node scripts/nst.js set <2026-S36> [fichier.txt] | photo <2026-S36> <img…> | dossier <2026-S36> <dossier> | show");
}
