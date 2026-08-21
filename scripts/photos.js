// scripts/photos.js
// Photos Strava → lecture du tableau de séance (WOD, renfo…) par Claude.
//
//   import { enrichWithPhotos } from "./photos.js";
//   const extras = await enrichWithPhotos(activities);   // { [activityId]: { photo, contenu } }
//
// Pour chaque activité récente avec photo(s) :
//   1. GET /activities/{id}/photos (URL 2048 px) → téléchargée dans scripts/.photos/<id>-<n>.jpg
//   2. `claude -p` lit la photo et transcrit le contenu de la séance (texte brut)
//   3. résultat mis en cache dans scripts/.photos/<id>.json → une seule lecture par activité
//
// Tout est best-effort : si Claude CLI est absent ou échoue, la sync continue sans contenu.
//
// Lancé directement : node scripts/photos.js [activityId]   → force la (re)lecture d'une activité.

import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { getAccessToken } from "./strava.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PHOTO_DIR = path.join(__dirname, ".photos");
const ACT_CACHE = path.join(__dirname, ".activities.cache.json");

const MAX_AGE_DAYS = 60;          // ne regarde les photos que des activités récentes
const MAX_PHOTOS_PER_ACTIVITY = 3;

const CLAUDE_CANDIDATES = [
  "claude",
  path.join(os.homedir(), ".npm-global/bin/claude"),
  path.join(os.homedir(), ".claude/local/claude"),
  "/usr/local/bin/claude",
  "/opt/homebrew/bin/claude",
];

function findClaude() {
  for (const c of CLAUDE_CANDIDATES) {
    try {
      execFileSync(c, ["--version"], { stdio: "ignore" });
      return c;
    } catch { /* suivant */ }
  }
  return null;
}

const PROMPT = (files) => `Tu lis ${files.length > 1 ? "des photos" : "une photo"} prise(s) pendant une séance de sport (CrossFit, renfo, natation, vélo…).
Lis le(s) fichier(s) image suivant(s) : ${files.map(f => `"${f}"`).join(", ")}.

Si c'est un tableau / carnet / écran décrivant la séance (warm-up, WOD, séries, charges, temps…), transcris fidèlement le contenu de la séance en texte brut, structuré par blocs (ex. "Warm up", "WOD", "Post workout"), une ligne par exercice, en gardant les nombres et unités exacts. Pas de markdown, pas de commentaire, pas d'introduction : uniquement la transcription.
Si l'image ne contient pas de contenu de séance lisible (paysage, selfie, matériel…), réponds exactement : AUCUN_CONTENU`;

// Prompt passé par stdin (--allowedTools est variadique : un prompt en argument serait avalé).
// Retourne le texte transcrit, ou null si l'image ne contient pas de séance. Lève si l'appel échoue.
function readWithClaude(claudeBin, files) {
  const out = execFileSync(
    claudeBin,
    ["-p", "--model", "opus", "--allowedTools", "Read"],
    { input: PROMPT(files), encoding: "utf8", timeout: 180_000, stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1" } }
  ).trim();
  if (!out) throw new Error("réponse vide");
  if (/AUCUN_CONTENU/.test(out)) return null;
  return out;
}

async function stravaPhotos(id) {
  const token = await getAccessToken();
  const res = await fetch(`https://www.strava.com/api/v3/activities/${id}/photos?size=2048&photo_sources=true`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`photos ${id}: ${res.status}`);
  return res.json();
}

async function download(url, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

function cachePath(id) { return path.join(PHOTO_DIR, `${id}.json`); }

export function loadPhotoCache(id) {
  try { return JSON.parse(fs.readFileSync(cachePath(id), "utf8")); } catch { return null; }
}

/**
 * @param {Array} activities  activités Strava (summary)
 * @param {{force?: boolean, log?: boolean}} opts
 * @returns {Promise<Record<string, {photo: string|null, contenu: string|null, n: number}>>}
 */
export async function enrichWithPhotos(activities, opts = {}) {
  const { force = false, log = true } = opts;
  fs.mkdirSync(PHOTO_DIR, { recursive: true });
  const since = Date.now() - MAX_AGE_DAYS * 86400 * 1000;
  const withPhotos = activities.filter(a =>
    (a.total_photo_count || 0) > 0 && new Date(a.start_date).getTime() >= since);

  const result = {};
  if (!withPhotos.length) return result;

  let claudeBin = null;
  for (const a of withPhotos) {
    const cached = force ? null : loadPhotoCache(a.id);
    if (cached) { result[a.id] = cached; continue; }

    try {
      const photos = (await stravaPhotos(a.id)).slice(0, MAX_PHOTOS_PER_ACTIVITY);
      const files = [];
      const urls = [];
      for (let i = 0; i < photos.length; i++) {
        const p = photos[i];
        const url = p.urls?.["2048"] || Object.values(p.urls || {}).pop();
        if (!url) continue;
        const dest = path.join(PHOTO_DIR, `${a.id}-${i}.jpg`);
        await download(url, dest);
        files.push(dest);
        urls.push(url);
      }
      if (!files.length) continue;

      if (claudeBin === null) claudeBin = findClaude() || false;
      let contenu = null, lu = false;
      if (claudeBin) {
        try { contenu = readWithClaude(claudeBin, files); lu = true; }
        catch (e) { if (log) console.warn(`   ⚠️  lecture photo ${a.id} échouée : ${(e.stderr || e.message).toString().trim().split("\n").pop()}`); }
      } else if (log) {
        console.warn("   ⚠️  Claude CLI introuvable — photos téléchargées mais non lues.");
      }

      const entry = { photo: urls[0] || null, n: files.length, contenu, readAt: new Date().toISOString() };
      // Cache uniquement si la lecture a abouti → sinon on réessaie à la prochaine sync
      if (lu) fs.writeFileSync(cachePath(a.id), JSON.stringify(entry, null, 2));
      result[a.id] = entry;
      if (log) console.log(`   📷 ${a.name || a.id} : ${files.length} photo(s)${contenu ? " → contenu lu" : " (pas de contenu de séance)"}`);
    } catch (e) {
      if (log) console.warn(`   ⚠️  photos ${a.id} : ${e.message}`);
    }
  }
  return result;
}

// ─── CLI : node scripts/photos.js [activityId] ──────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const acts = JSON.parse(fs.readFileSync(ACT_CACHE, "utf8"));
  const onlyId = process.argv[2];
  const target = onlyId ? acts.filter(a => String(a.id) === String(onlyId)) : acts;
  const extras = await enrichWithPhotos(target, { force: !!onlyId });
  for (const [id, e] of Object.entries(extras)) {
    console.log(`\n── ${id} ──\n${e.contenu || "(aucun contenu)"}`);
  }
}
