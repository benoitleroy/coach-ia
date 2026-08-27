// scripts/programme.js — MACRO-CYCLE : le cadre de 12 semaines dans lequel le coach
// écrit chaque semaine. Sans ça, chaque semaine repartait de zéro.
//
// Cycle "Hybride Automne 2026" : 31/08 → 22/11/2026 (S36 → S47), 3 blocs de 4 semaines,
// chaque bloc = 3 semaines de charge + 1 semaine de décharge.
//
//   import { blocCourant, PROGRAMME } from "./programme.js";
//   const b = blocCourant(new Date());   // { bloc, semaineDansBloc, semaineDansCycle, ... }

import fs from "fs";

const DAY = 86400 * 1000;

export const PROGRAMME = {
  nom: "Hybride Automne 2026",
  debut: "2026-08-31",           // lundi S36
  fin:   "2026-11-22",           // dimanche S47
  objectif: "Devenir hybride : tenir une heure de course en aisance ET des charges propres en CrossFit, sans blessure.",
  cible: {
    date: "2026-11-21",
    libelle: "Test hybride maison (samedi 21/11) : 10 km en aisance sous 55 min (FC moyenne < 155) le matin, puis l'après-midi 5 tractions strictes enchaînées + back squat 5 reps à 1× poids de corps + 500 m rameur.",
  },
  // Repères de départ (26/08/2026) pour mesurer la progression
  depart: {
    course: "12,2 km en 1h19 à 130 bpm (26/08) ; allure normalisée à 140 bpm : 5:52/km",
    force: "WOD à 30 kg (hang squat clean / thrusters) ; strict pull-ups en finisher",
    volume: "≈ 4 h/semaine sur 3 mois creux, remontée à 5-6 h fin août",
    physio: "HRV base 38 ms, FC repos 49-50, sommeil 7 h 30-8 h",
  },
  blocs: [
    {
      id: 1, nom: "Fondation", semaines: 4, debut: "2026-08-31",
      but: "Reposer la régularité et la tolérance tendineuse. Aucune intensité en course.",
      doubles: [3, 3, 4, 2],
      priorites: [
        "Bi-quotidien progressif : 3 doublés en semaine 1 et 2, 4 en semaine 3, 2 en semaine de décharge (matin aérobie facile, soir qualité)",
        "6 jours actifs par semaine, volume 5 h → 7 h, progression max +15 %/semaine",
        "Toute la course en aisance stricte (FC < 140), sortie longue jusqu'à 1 h 15",
        "2 séances de force par semaine (dont la box NST), charges modérées, technique avant charge",
        "Réintroduire vélo (1×/sem) et natation (1×/sem) comme volume sans impact",
        "Aucune séance de fractionné course — le corps encaisse encore la reprise",
      ],
      test: "Semaine 4 (décharge) : demi-Cooper (3 min à fond après échauffement) pour mesurer vVO2max, si HRV en base.",
    },
    {
      id: 2, nom: "Développement", semaines: 4, debut: "2026-09-28",
      but: "Installer le stimulus VO2max façon Billat et monter la force.",
      doubles: [4, 5, 5, 3],
      priorites: [
        "Bi-quotidien : 4 doublés puis 5 (matin aérobie ou skill, soir qualité) — plafond 5 tant que le HRV n'est pas stable dans sa base",
        "1 séance VO2max/semaine en 30/30 calés sur la vVO2max mesurée (2×(8→12)×30/30, récup 3')",
        "Volume 6 h → 7 h, sortie longue 1 h 15 → 1 h 30 à sensation (variations libres autorisées)",
        "Force : passer en 5×5 progressif (+2,5 kg quand les 5 reps sortent propres), viser back squat 5 reps à 0,9× poids de corps",
        "Polarisation stricte : viser 80 % du temps sous 140 bpm, 20 % très dur, rien entre les deux",
        "Jamais deux séances dures consécutives ; le dur se mérite par une nuit correcte (HRV en base)",
      ],
      test: "Semaine 8 (décharge) : refaire le demi-Cooper et comparer ; test tractions strictes max.",
    },
    {
      id: 3, nom: "Expression", semaines: 4, debut: "2026-10-26",
      but: "Rendre la forme utilisable : combiner endurance et force dans la même journée.",
      doubles: [5, 5, 4, 2],
      priorites: [
        "Bi-quotidien stabilisé à 5 doublés, réduit à 2 la semaine du test",
        "Maintenir 1 séance VO2max/semaine (30/30 ou 3×3 min à vVO2max)",
        "1 séance combinée par semaine (course en aisance puis force dans la journée) pour préparer le test",
        "Force : chercher le back squat 5 reps à 1× poids de corps et 5 tractions strictes enchaînées",
        "Volume stable 6 h 30-7 h, dernière semaine allégée de 40 % avant le test",
        "Semaine 12 : test hybride le samedi 21/11",
      ],
      test: "Semaine 12 : test hybride (10 km en aisance + force l'après-midi).",
    },
  ],
  reglesPermanentes: [
    "La semaine de décharge (4e de chaque bloc) : -40 % de volume, on garde la fréquence et un rappel d'intensité court.",
    "Hiérarchie des séances : 1) programme NST (prioritaire, non modifiable), 2) WOD de la box du club, 3) séances ajoutées par le coach (endurance, VO2max, récup).",
    "Les séances CrossFit viennent de la programmation du club (WOD au tableau, lu sur photo) : le coach construit AUTOUR, il ne rajoute jamais une séance de force le lendemain d'un jour lourd à la box. Le module NST arrivera en complément (parrainage) — à intégrer quand Benoît l'aura.",
    "Si HRV en statut LOW deux matins de suite, ou FC repos > base +5 bpm : la séance dure de la semaine saute, remplacée par de l'aisance.",
    "Toute douleur tendineuse (Achille, genou) = arrêt de la course, vélo/natation à la place, jusqu'à disparition complète.",
    "Le petit-déjeuner est fixe ; midi = boîte chantier ; les repas suivent la séance du jour.",
  ],
};

export function blocCourant(now = new Date()) {
  const debut = new Date(PROGRAMME.debut + "T00:00:00");
  const jours = Math.floor((now - debut) / DAY);
  const semaineDansCycle = Math.floor(jours / 7) + 1; // 1-based ; <1 = pas encore commencé
  let acc = 0, bloc = null, semaineDansBloc = null;
  for (const b of PROGRAMME.blocs) {
    if (semaineDansCycle > acc && semaineDansCycle <= acc + b.semaines) {
      bloc = b; semaineDansBloc = semaineDansCycle - acc; break;
    }
    acc += b.semaines;
  }
  const total = PROGRAMME.blocs.reduce((s, b) => s + b.semaines, 0);
  const avantDebut = semaineDansCycle < 1;
  if (avantDebut) { bloc = PROGRAMME.blocs[0]; semaineDansBloc = 0; }   // cycle pas encore démarré
  return {
    programme: PROGRAMME.nom, objectif: PROGRAMME.objectif, cible: PROGRAMME.cible,
    semaineDansCycle, totalSemaines: total, bloc, semaineDansBloc,
    decharge: bloc && semaineDansBloc ? semaineDansBloc === bloc.semaines : false,
    avantDebut, debut: PROGRAMME.debut, termine: semaineDansCycle > total,
  };
}

// Bloc de la semaine à planifier : celle en cours, sauf le dimanche (on prépare lundi)
export function blocAPlanifier(now = new Date()) {
  const d = new Date(now); if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return blocCourant(d);
}

// Écrit js/programme-data.js pour l'application (window.PROGRAMME)
export function writeProgramme(outPath, now = new Date()) {
  const data = { ...PROGRAMME, courant: blocAPlanifier(now), generatedAt: now.toISOString() };
  fs.writeFileSync(outPath, `// AUTO-GENERATED by scripts/programme.js — ne pas éditer.\nwindow.PROGRAMME = ${JSON.stringify(data, null, 1)};\n`);
}

export function texteProgramme(now = new Date()) {
  const c = blocAPlanifier(now);
  if (c.avantDebut) return `PROGRAMME : « ${PROGRAMME.nom} » démarre le ${PROGRAMME.debut}.`;
  if (c.termine || !c.bloc) return `PROGRAMME : cycle « ${PROGRAMME.nom} » terminé — proposer la suite.`;
  return [
    `PROGRAMME DE FOND — « ${PROGRAMME.nom} » (${PROGRAMME.debut} → ${PROGRAMME.fin})`,
    `Objectif du cycle : ${PROGRAMME.objectif}`,
    `Cible datée : ${PROGRAMME.cible.libelle}`,
    `Point de départ (26/08) : ${Object.values(PROGRAMME.depart).join(" · ")}`,
    `La semaine à écrire est la SEMAINE ${c.semaineDansCycle}/${c.totalSemaines} du cycle — bloc ${c.bloc.id} « ${c.bloc.nom} », semaine ${c.semaineDansBloc}/${c.bloc.semaines}${c.decharge ? " → SEMAINE DE DÉCHARGE (-40 % de volume, fréquence maintenue)" : ""}.`,
    `But du bloc : ${c.bloc.but}`,
    `Journées à DEUX séances cette semaine : ${c.bloc.doubles ? c.bloc.doubles[Math.max(0, (c.semaineDansBloc || 1) - 1)] : 3} (les autres jours : une seule séance, et au moins un jour complet sans rien).`,
    `Priorités du bloc :`, ...c.bloc.priorites.map(p => `  - ${p}`),
    `Test prévu dans ce bloc : ${c.bloc.test}`,
    `Règles permanentes :`, ...PROGRAMME.reglesPermanentes.map(r => `  - ${r}`),
    `Écris la semaine EN COHÉRENCE avec ce bloc : ne réinvente pas le cadre, fais progresser ce qui doit l'être et respecte les interdits.`,
  ].join("\n");
}
