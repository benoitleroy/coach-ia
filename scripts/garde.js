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
// événements « Benoit enfants » / « Caro enfants ». Relu le 29/08/2026, à resynchroniser
// quand de nouvelles périodes sont ajoutées (demander à Claude : « mets à jour la garde »).
// Chaque période va du vendredi au vendredi ; la bascule se fait le VENDREDI SOIR.
export const PERIODES = [
  { du: "2026-08-28", au: "2026-09-04", moi: true },
  { du: "2026-09-04", au: "2026-09-11", moi: false },
  { du: "2026-09-11", au: "2026-09-18", moi: true },
  { du: "2026-09-18", au: "2026-09-25", moi: false },
  { du: "2026-09-25", au: "2026-10-02", moi: true },
  { du: "2026-10-02", au: "2026-10-09", moi: false },
  { du: "2026-10-09", au: "2026-10-16", moi: true },
];

// Bascules décalées ponctuellement : { "date prévue (AAAA-MM-JJ)": "date réelle" }
export const DECALAGES = {
};

const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Début réel d'une période (en tenant compte d'un décalage ponctuel), bascule à 20 h
const debutReel = p => new Date((DECALAGES[p.du] || p.du) + "T20:00:00");

/**
 * @param {Date} date  jour concerné
 * @param {"matin"|"soir"} moment  la bascule a lieu le soir : le matin appartient encore à la période précédente
 * @returns {boolean|null} null si la date sort des périodes connues (agenda à resynchroniser)
 */
export function avecEnfants(date = new Date(), moment = "matin") {
  const d = new Date(date);
  d.setHours(moment === "soir" ? 21 : 7, 0, 0, 0);
  if (d < debutReel(PERIODES[0])) return !PERIODES[0].moi;      // avant la première période connue
  let etat = null;
  for (const p of PERIODES) {
    if (debutReel(p) <= d) etat = p.moi;
  }
  const derniere = PERIODES[PERIODES.length - 1];
  if (d > new Date((DECALAGES[derniere.au] || derniere.au) + "T20:00:00")) return null;   // au-delà de l'agenda connu
  return etat;
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
