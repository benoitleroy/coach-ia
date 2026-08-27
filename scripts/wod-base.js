// scripts/wod-base.js — Base de séances CrossFit.com (usage personnel).
// Aspire les WOD publiés publiquement : Hero WODs, "Girls"/benchmarks, et les WOD du jour.
//
//   node scripts/wod-base.js daily 2023-08-27 2026-08-27   → WOD quotidiens (reprend là où il s'est arrêté)
//   node scripts/wod-base.js heroes                        → Hero WODs (une page)
//   node scripts/wod-base.js stats                         → état de la base
//
// Stockage : scripts/.wod-base.json  { daily: {YYYY-MM-DD: {...}}, heroes: [...] }

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, ".wod-base.json");
const UA = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36" };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function load() { try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { return { daily: {}, heroes: [] }; } }
function save(db) { fs.writeFileSync(FILE, JSON.stringify(db, null, 1)); }

function texte(html) {
  let t = html.replace(/<(script|style|nav|header|footer)[\s\S]*?<\/\1>/g, "");
  t = t.replace(/<br\s*\/?>/g, "\n").replace(/<\/(p|div|li|h[1-6]|tr)>/g, "\n");
  t = t.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#8217;|&rsquo;/g, "'")
       .replace(/&quot;/g, '"').replace(/&#\d+;/g, "");
  return t.replace(/[ \t]+/g, " ").split("\n").map(l => l.trim()).filter(Boolean);
}

// Un WOD quotidien : lignes après la date jusqu'à "Post…", puis stimulus + options
function parseDaily(lines, code) {
  const i = lines.findIndex(l => l === code || l.startsWith(code));
  if (i < 0) return null;
  const bloc = lines.slice(i + 1, i + 60);
  const out = { wod: [], stimulus: "", intermediate: [], beginner: [], repos: false };
  let cible = "wod";
  for (const l of bloc) {
    if (/^Post .* to comments/i.test(l)) { cible = "stop"; continue; }
    if (/^Stimulus and Strategy/i.test(l)) { cible = "stimulus"; continue; }
    if (/^Intermediate option/i.test(l)) { cible = "intermediate"; continue; }
    if (/^Beginner option/i.test(l)) { cible = "beginner"; continue; }
    if (/^(Scaling|Coaching cues|Watch|Compare to|Resources|Find a Gym|Related)/i.test(l)) break;
    if (cible === "wod") out.wod.push(l);
    else if (cible === "stimulus") out.stimulus += (out.stimulus ? " " : "") + l;
    else if (cible === "intermediate") out.intermediate.push(l);
    else if (cible === "beginner") out.beginner.push(l);
  }
  out.wod = out.wod.slice(0, 25);
  out.repos = out.wod.some(l => /^rest day$/i.test(l));
  return out.wod.length ? out : null;
}

async function fetchDaily(date) {                       // date = Date
  const yy = String(date.getFullYear()).slice(2), mm = String(date.getMonth() + 1).padStart(2, "0"), dd = String(date.getDate()).padStart(2, "0");
  const code = `${yy}${mm}${dd}`;
  const res = await fetch(`https://www.crossfit.com/${code}`, { headers: UA, redirect: "follow" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const lines = texte(await res.text());
  const p = parseDaily(lines, code);
  if (!p) return null;
  const jour = lines.find(l => /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/i.test(l)) || "";
  return { code, jour, ...p };
}

async function heroes() {
  const res = await fetch("https://www.crossfit.com/heroes", { headers: UA, redirect: "follow" });
  const lines = texte(await res.text());
  const out = []; let cur = null;
  for (const l of lines) {
    if (l === "Details") { if (cur && cur.wod.length) out.push(cur); cur = null; continue; }
    // un nom de hero = ligne courte sans chiffre suivie d'une description d'effort
    if (/^[A-Z][A-Za-z'’.\- ]{2,28}$/.test(l) && !/^(Details|Hero|Workouts|CrossFit|Find|Open|Games|Store|Learn|More|Home|Menu|Search|Login|Sign|Explore|Movements|Podcasts|Articles|Video|Series|Education|Gym|Owners|Affiliate|Field|Leaders|Courses|Level|Private|About|Getting|Started|What|Expect|Methodology)$/i.test(l)) {
      if (cur && cur.wod.length) out.push(cur);
      cur = { nom: l, wod: [] }; continue;
    }
    if (cur) cur.wod.push(l);
  }
  return out.filter(h => h.wod.length >= 2 && h.wod.length < 30);
}

const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , cmd, a1, a2] = process.argv;
  const db = load();
  if (cmd === "stats") {
    const d = Object.values(db.daily);
    console.log(`📚 Base : ${d.length} WOD quotidiens (${d.filter(x => x.repos).length} repos), ${db.heroes.length} hero WODs`);
    console.log("   plage :", Object.keys(db.daily).sort()[0], "→", Object.keys(db.daily).sort().pop());
    process.exit(0);
  }
  if (cmd === "heroes") {
    db.heroes = await heroes(); save(db);
    console.log(`💪 ${db.heroes.length} hero WODs enregistrés — ex. ${db.heroes.slice(0, 5).map(h => h.nom).join(", ")}`);
    process.exit(0);
  }
  if (cmd === "daily") {
    const debut = new Date(a1 || "2023-08-27"), fin = new Date(a2 || new Date());
    let n = 0, skip = 0, err = 0;
    for (let d = new Date(fin); d >= debut; d.setDate(d.getDate() - 1)) {
      const key = ymd(d);
      if (db.daily[key]) { skip++; continue; }
      try {
        const w = await fetchDaily(d);
        if (w) { db.daily[key] = w; n++; } else err++;
      } catch (e) { err++; }
      if ((n + err) % 25 === 0) { save(db); process.stdout.write(`\r   ${n} récupérés, ${skip} déjà en base, ${err} sans contenu…   `); }
      await sleep(350);
    }
    save(db);
    console.log(`\n📚 Terminé : ${n} nouveaux WOD, ${skip} déjà présents, ${err} vides. Total : ${Object.keys(db.daily).length}`);
    process.exit(0);
  }
  console.log("Usage : node scripts/wod-base.js daily [debut] [fin] | heroes | stats");
}
