// scripts/wods-explications.js — rédige, pour chaque WOD de la banque, une explication détaillée
// « Comment faire » (format, déroulé concret, charges pour Benoît, objectif, pièges) via Claude.
//
//   node scripts/wods-explications.js            → complète ce qui manque (reprend là où il s'est arrêté)
//   node scripts/wods-explications.js --max 30   → n'en traite que 30 (test)
//
// Cache : scripts/wods-explications.json  { <id wod>: { format, deroule[], charges, objectif, pieges[] } }
// Sortie : js/wods-explications-data.js  (window.WODS_EXPLI), réécrite après chaque lot.
// Ordre : Benchmarks, Hero WODs, puis CrossFit.com du plus récent au plus ancien.

import fs from "fs";
import os from "os";
import path from "path";
import vm from "vm";
import { execFile, execFileSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WODS_JS = path.join(__dirname, "../js/wods-data.js");
const CACHE = path.join(__dirname, "wods-explications.json");
const OUTPUT = path.join(__dirname, "../js/wods-explications-data.js");
const LOT = 12, PARALLELE = 3;

const max = (() => { const i = process.argv.indexOf("--max"); return i > 0 ? +process.argv[i + 1] : Infinity; })();

function findClaude() {
  for (const c of ["claude", path.join(os.homedir(), ".npm-global/bin/claude"), path.join(os.homedir(), ".claude/local/claude"), "/usr/local/bin/claude", "/opt/homebrew/bin/claude"]) {
    try { execFileSync(c, ["--version"], { stdio: "ignore" }); return c; } catch {}
  }
  return null;
}

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(WODS_JS, "utf8"), ctx);
const WODS = ctx.window.WODS || [];
const RANG = { Benchmark: 0, "Hero WOD": 1 };
// Pages CrossFit.com mal aspirées : seul un lien « Read More → » a été récupéré, pas la séance.
const estVide = w => (w.en || []).join(" ").replace(/(Read More|Learn the Movement)\s*→/g, "").trim().length < 15;
const ordre = WODS.filter(w => !estVide(w)).sort((a, b) => (RANG[a.source] ?? 2) - (RANG[b.source] ?? 2) || String(b.date || "").localeCompare(String(a.date || "")));

const cache = (() => { try { return JSON.parse(fs.readFileSync(CACHE, "utf8")); } catch { return {}; } })();
const ecrire = () => {
  fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1));
  fs.writeFileSync(OUTPUT, `// AUTO-GÉNÉRÉ par scripts/wods-explications.js — ne pas éditer à la main.\nwindow.WODS_EXPLI = ${JSON.stringify(cache)};\n`);
};

const PROMPT = lot => `Tu es coach de CrossFit. Pour chaque WOD ci-dessous, écris une explication en français pour un athlète qui ne connaît pas bien le jargon CrossFit et veut comprendre EXACTEMENT ce qu'il doit faire.
L'athlète : Benoît, homme, 39 ans, profil hybride (triathlon + CrossFit), niveau intermédiaire. Quand deux valeurs sont données (ex. « 61/43 kg », « 600/750 m », « ♀ 24-inch ♂ 30-inch »), la sienne est TOUJOURS la valeur homme (la plus lourde / la plus longue / la plus haute) : donne-la directement. Convertis les pouces en cm et les livres en kg (arrondi).

Réponds UNIQUEMENT par un objet JSON (pas de markdown) dont les clés sont les id des WODs, et chaque valeur :
{
  "format": "1 à 2 phrases : ce que signifie le format de CE WOD (For time, AMRAP, EMOM, tours, chipper, 21-15-9, intervalles, travail de force…) et ce qui constitue le score",
  "deroule": ["étapes concrètes dans l'ordre, une action par ligne, avec les nombres réels pour Benoît (ex. « Tour 1 : 21 thrusters à 43 kg puis 21 tractions »). Si c'est répétitif, explique le schéma une fois clairement plutôt que de tout recopier. 3 à 8 lignes"],
  "charges": "les charges/hauteurs/distances pour Benoît en une ligne, ou chaîne vide s'il n'y en a pas",
  "objectif": "1 à 2 phrases : le but de la séance (stimulus), le temps visé et comment gérer l'effort",
  "pieges": ["2 à 3 erreurs fréquentes ou conseils de gestion, courts"]
}
Ton tutoiement, phrases courtes, aucun anglicisme non expliqué. Ne mets pas de nom de mouvement en anglais sans sa traduction.

WODS :
${lot.map(w => JSON.stringify({ id: w.id, nom: w.nom || null, source: w.source, format_detecte: w.format, duree_estimee_min: w.duree, texte_original: w.en, texte_fr: w.fr, stimulus: w.stimulusFr || null })).join("\n")}`;

const bin = findClaude();
if (!bin) { console.error("❌ Claude CLI introuvable."); process.exit(1); }

const restants = ordre.filter(w => !cache[w.id]).slice(0, max);
console.log(`📖 Explications WOD : ${Object.keys(cache).length}/${ordre.length} déjà faites, ${restants.length} à rédiger.`);
const lots = [];
for (let i = 0; i < restants.length; i += LOT) lots.push(restants.slice(i, i + LOT));

const appel = lot => new Promise(resolve => {
  const p = execFile(bin, ["-p", "--model", "sonnet"], {
    encoding: "utf8", timeout: 600_000, maxBuffer: 20 * 1024 * 1024,
    env: { ...process.env, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1" },
  }, (err, out) => {
    if (err) { console.warn(`⚠️  lot échoué (${lot[0].id}…) : ${String(err.message).split("\n")[0]}`); return resolve(0); }
    try {
      const json = out.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      const res = JSON.parse(json.slice(json.indexOf("{"), json.lastIndexOf("}") + 1));
      let n = 0;
      for (const w of lot) if (res[w.id] && Array.isArray(res[w.id].deroule)) { cache[w.id] = res[w.id]; n++; }
      ecrire();
      resolve(n);
    } catch { console.warn(`⚠️  lot illisible (${lot[0].id}…)`); resolve(0); }
  });
  p.stdin.end(PROMPT(lot));
});

let fait = 0;
const ouvriers = Array.from({ length: PARALLELE }, async () => {
  while (lots.length) {
    const lot = lots.shift();
    fait += await appel(lot);
    console.log(`   ✅ ${Object.keys(cache).length}/${ordre.length} (${new Date().toLocaleTimeString("fr-FR")})`);
  }
});
await Promise.all(ouvriers);
ecrire();
console.log(`📝 ${fait} explications ajoutées → js/wods-explications-data.js`);
