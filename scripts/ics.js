// scripts/ics.js — exporte le planning de la semaine (et de la suivante) en fichier .ics
// que Benoît peut ouvrir sur iPhone pour l'ajouter à son agenda.
//
// Horaires par défaut (modifiables ici) : séance du matin avant le chantier, séance du soir.
export const HORAIRES = { matin: { h: 5, min: 30, duree: 60 }, soir: { h: 18, min: 30, duree: 75 } };

const pad = n => String(n).padStart(2, "0");
const stamp = d => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
const esc = t => String(t || "").replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const vide = s => !s || !s.titre || /^(rien|repos|—|-)$/i.test(String(s.titre).trim());

function evenements(coach) {
  if (!coach || !coach.semaine || !coach.semaineDebut) return [];
  const lundi = new Date(coach.semaineDebut + "T00:00:00");
  const out = [];
  coach.semaine.jours.forEach((j, i) => {
    [["matin", j.matin], ["soir", j.soir]].forEach(([moment, s]) => {
      if (vide(s)) return;
      const H = HORAIRES[moment];
      const debut = new Date(lundi); debut.setDate(debut.getDate() + i); debut.setHours(H.h, H.min, 0, 0);
      const fin = new Date(debut.getTime() + H.duree * 60000);
      const desc = [s.detail, ...(s.etapes || []).map(e => "• " + e), s.gardefou ? "⚑ " + s.gardefou : ""].filter(Boolean).join("\n");
      out.push({
        uid: `${coach.semaineLabel}-${i}-${moment}@coach-ia`,
        debut, fin,
        titre: `${s.ico || ""} ${s.titre}`.trim(),
        desc: desc + `\n\nCoach IA — ${coach.semaineLabel}`,
      });
    });
  });
  return out;
}

export function genererIcs(coachs, now = new Date()) {
  // On n'exporte que les séances à venir : l'agenda sert à anticiper, pas à archiver.
  const ev = coachs.filter(Boolean).flatMap(evenements).filter(e => e.fin > now);
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Coach IA//Carnet//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "X-WR-CALNAME:Coach IA — entraînement",
    ...ev.flatMap(e => ["BEGIN:VEVENT", `UID:${e.uid}`, `DTSTAMP:${stamp(now)}`,
      `DTSTART:${stamp(e.debut)}`, `DTEND:${stamp(e.fin)}`,
      `SUMMARY:${esc(e.titre)}`, `DESCRIPTION:${esc(e.desc)}`,
      "BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY", `DESCRIPTION:${esc(e.titre)}`, "END:VALARM",
      "END:VEVENT"]),
    "END:VCALENDAR"].join("\r\n") + "\r\n";
}
