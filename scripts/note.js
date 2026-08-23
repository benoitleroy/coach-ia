// scripts/note.js — notes de séance (charges, ressenti, douleurs…) attachées à une activité Strava.
//   node scripts/note.js last "Travaillé à 30 kg"        → sur la dernière activité
//   node scripts/note.js 19860912158 "…"                 → sur un id précis
//   node scripts/note.js list                            → affiche les notes
// Stockage : scripts/notes.json (commité) ; repris par carnet.js (affichage) et bilan.js (coach).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const NOTES_FILE = path.join(__dirname, "notes.json");
const ACT_CACHE = path.join(__dirname, ".activities.cache.json");

export function loadNotes() { try { return JSON.parse(fs.readFileSync(NOTES_FILE, "utf8")); } catch { return {}; } }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , target, ...rest] = process.argv;
  const notes = loadNotes();
  if (!target || target === "list") {
    Object.entries(notes).sort((a, b) => (b[1].date || "").localeCompare(a[1].date || "")).forEach(([id, n]) => console.log(`${n.date?.slice(0, 10) || "?"} ${id} ${n.name || ""} → ${n.note}`));
    process.exit(0);
  }
  const acts = JSON.parse(fs.readFileSync(ACT_CACHE, "utf8")).sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
  const act = target === "last" ? acts[0] : acts.find(a => String(a.id) === String(target));
  if (!act) { console.error("Activité introuvable :", target); process.exit(1); }
  const note = rest.join(" ").trim();
  if (!note) { console.error("Note vide"); process.exit(1); }
  const prev = notes[act.id]?.note;
  notes[act.id] = { date: act.start_date_local || act.start_date, name: act.name, type: act.sport_type || act.type, note: prev ? `${prev} · ${note}` : note, updatedAt: new Date().toISOString() };
  fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 1));
  console.log(`📝 Note sur ${act.name} (${(act.start_date_local || "").slice(0, 10)}) : ${notes[act.id].note}`);
}
