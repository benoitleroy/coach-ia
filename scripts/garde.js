// scripts/garde.js — garde alternée des enfants (Mathis, 12 ans · Louis, 8 ans) : contraintes sur les séances du MATIN et du week-end.
//
// Règle donnée par Benoît (28/08/2026) :
//   - la bascule se fait le VENDREDI MATIN (une semaine sur deux) ;
//   - MATIN : la course à pied n'est possible que les jours SANS enfants ; avec les enfants,
//     le matin se fait à la maison (home-trainer, Pilates, mobilité, gainage) ;
//   - SOIR : aucune contrainte, c'est gérable dans les deux cas (box, force) ;
//   - WEEK-END : sans enfants → sortie longue course à pied ou Pilates ;
//                avec enfants → vélo home-trainer ou Pilates / mobilité.
//
// Référence : un vendredi connu + l'état ce jour-là. À corriger ici si l'alternance se décale.
export const REFERENCE = {
  vendredi: "2026-08-28",   // vendredi de bascule servant de repère
  avecEnfants: true,        // confirmé par Benoît le 28/08/2026 : il a les enfants du 28/08 au 04/09
};

const DAY = 86400 * 1000;

// Vendredi de bascule qui ouvre la période contenant `d` (la semaine de garde va d'un vendredi matin au suivant)
function vendrediDe(d) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const delta = (x.getDay() - 5 + 7) % 7;      // 5 = vendredi
  x.setDate(x.getDate() - delta);
  return x;
}

// true / false / null (si la référence n'est pas renseignée)
export function avecEnfants(date = new Date()) {
  if (REFERENCE.avecEnfants === null) return null;
  const ref = vendrediDe(new Date(REFERENCE.vendredi + "T12:00:00"));
  const cur = vendrediDe(date);
  const semaines = Math.round((cur - ref) / (7 * DAY));
  return ((semaines % 2) + 2) % 2 === 0 ? REFERENCE.avecEnfants : !REFERENCE.avecEnfants;
}

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// Texte injecté dans le prompt du coach pour la semaine planifiée (lundi → dimanche)
export function texteGarde(lundi) {
  if (REFERENCE.avecEnfants === null) {
    return `GARDE DES ENFANTS : alternance non encore renseignée. Applique la règle prudente : le matin, propose course à pied OU une option maison équivalente (home-trainer, Pilates) et précise « course si tu n'as pas les enfants, sinon home-trainer/Pilates ».`;
  }
  const l = new Date(lundi);
  const lignes = JOURS.map((j, i) => {
    const d = new Date(l.getTime() + i * DAY);
    return `${j} ${d.getDate()}/${d.getMonth() + 1} : ${avecEnfants(d) ? "AVEC les enfants" : "sans les enfants"}`;
  });
  return [`GARDE DES ENFANTS (bascule le vendredi matin, une semaine sur deux) :`, ...lignes.map(x => "  " + x),
    `Contraintes qui en découlent, à respecter strictement :`,
    `  - MATIN avec les enfants : pas de course à pied ni de sortie dehors — uniquement du domicile (home-trainer/Zwift, Pilates, mobilité, gainage, corde à sauter).`,
    `  - MATIN sans les enfants : course à pied possible (c'est le créneau à privilégier pour l'endurance).`,
    `  - SOIR : aucune contrainte dans les deux cas (box, force, séance de qualité).`,
    `  - WEEK-END sans les enfants : sortie longue en course à pied (ou Pilates en récupération).`,
    `  - WEEK-END avec les enfants : vélo home-trainer ou Pilates/mobilité à la maison — pas de sortie longue en course.`,
    `  - Sur une semaine où la course du matin est impossible plusieurs jours, compense le volume aérobie par du home-trainer, et place la sortie longue le week-end libre.`].join("\n");
}
