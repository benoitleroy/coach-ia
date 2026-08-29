// scripts/garde.js — garde alternée : Mathis (12 ans) et Louis (8 ans).
//
// Règle donnée par Benoît (28-29/08/2026) :
//   - la bascule se fait normalement le VENDREDI SOIR (donc le vendredi MATIN il a encore les garçons,
//     et le vendredi soir est libre la semaine où ils partent) ;
//   - MATIN : la course à pied n'est possible que les jours SANS enfants ; avec eux, le matin se fait
//     à la maison (home-trainer, Pilates, mobilité, gainage, corde) ;
//   - SOIR : aucune contrainte d'entraînement (box, force), mais les soirs AVEC enfants = dîner à trois ;
//   - WEEK-END sans enfants → sortie longue en course ; avec enfants → home-trainer ou Pilates à la maison.
//
// Les bascules réelles peuvent être décalées (échange, vacances) : les inscrire dans DECALAGES.

const DAY = 86400 * 1000;

// SOURCE DE VÉRITÉ : l'agenda Google « Family » de Benoît (leroy.torrentt@gmail.com),
// événements « Benoit enfants » / « Caro enfants », complété par les horaires réels de bascule.
// Par défaut la bascule se fait le VENDREDI SOIR (le vendredi matin il a encore les garçons).
// Quand une bascule est décalée, l'inscrire ici avec sa date ET son heure réelles.
// Relu le 29/08/2026 — pour resynchroniser : demander à Claude « mets à jour la garde ».
export const BASCULES = [
  { quand: "2026-08-28T20:00:00", moi: false },   // semaine Caro
  { quand: "2026-08-30T12:00:00", moi: true },    // ⚠️ décalé : Benoît récupère le dimanche midi
  { quand: "2026-09-04T08:00:00", moi: false },   // ⚠️ décalé : rendus le vendredi matin
  { quand: "2026-09-11T20:00:00", moi: true },
  { quand: "2026-09-18T20:00:00", moi: false },
  { quand: "2026-09-25T20:00:00", moi: true },
  { quand: "2026-10-02T20:00:00", moi: false },
  { quand: "2026-10-09T20:00:00", moi: true },
  { quand: "2026-10-16T20:00:00", moi: false },
];

/**
 * @param {Date} date  jour concerné
 * @param {"matin"|"soir"} moment  le matin est évalué à 7 h, le soir à 21 h
 * @returns {boolean|null} null au-delà des bascules connues (agenda à resynchroniser)
 */
export function avecEnfants(date = new Date(), moment = "matin") {
  const d = new Date(date);
  d.setHours(moment === "soir" ? 21 : 7, 0, 0, 0);
  const passees = BASCULES.filter(b => new Date(b.quand) <= d);
  if (!passees.length) return !BASCULES[0].moi;
  if (d > new Date(BASCULES[BASCULES.length - 1].quand)) return null;
  return passees[passees.length - 1].moi;
}

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function texteGarde(lundi) {
  const l = new Date(lundi);
  const lignes = JOURS.map((j, i) => {
    const d = new Date(l.getTime() + i * DAY);
    const m = avecEnfants(d, "matin"), s = avecEnfants(d, "soir");
    const etat = m === null || s === null ? "garde inconnue (agenda à resynchroniser)"
      : m === s ? (m ? "AVEC les enfants" : "sans les enfants")
                : (m ? "AVEC les enfants le matin, SANS le soir (bascule)" : "sans le matin, AVEC le soir (bascule)");
    return `  ${j} ${d.getDate()}/${d.getMonth() + 1} : ${etat}`;
  });
  return [`GARDE DES ENFANTS — Mathis (12 ans) et Louis (8 ans), bascule le vendredi soir :`, ...lignes,
    `Contraintes qui en découlent, à respecter strictement :`,
    `  - MATIN avec les enfants : pas de course à pied ni de sortie — uniquement du domicile (home-trainer/Zwift, Pilates, mobilité, gainage, corde à sauter).`,
    `  - MATIN sans les enfants : course à pied possible, c'est le créneau à privilégier pour l'endurance.`,
    `  - SOIR : aucune contrainte d'entraînement, mais les soirs AVEC enfants le dîner est familial (3 à table).`,
    `  - WEEK-END sans les enfants : sortie longue en course à pied (ou Pilates en récupération).`,
    `  - WEEK-END avec les enfants : home-trainer ou Pilates/mobilité à la maison, pas de sortie longue en course.`,
    `  - Si plusieurs matins sont bloqués, compense le volume aérobie sur le home-trainer et place la sortie longue sur le week-end libre.`].join("\n");
}
