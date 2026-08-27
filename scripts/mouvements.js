// scripts/mouvements.js — Dictionnaire des mouvements CrossFit (anglais → français)
// + traducteur des WOD (les WOD sont très formulaïques : la traduction mécanique suffit).
//
//   import { traduireWod, MOUVEMENTS } from "./mouvements.js";
//   traduireWod(["21-15-9 reps for time of:", "Thrusters", "Pull-ups"])

export const MOUVEMENTS = [
  // ── Haltérophilie / barre ───────────────────────────────────────────────
  { en: "thruster", fr: "thruster (squat + poussée)", cat: "barre", desc: "Front squat suivi d'un développé au-dessus de la tête, en un seul mouvement fluide.", schema: "thruster" },
  { en: "clean and jerk", fr: "épaulé-jeté", cat: "barre", desc: "Barre du sol aux épaules (épaulé), puis au-dessus de la tête (jeté).", schema: "clean" },
  { en: "power clean", fr: "épaulé debout (power clean)", cat: "barre", desc: "Épaulé réceptionné au-dessus du parallèle, sans descendre en squat.", schema: "clean" },
  { en: "squat clean", fr: "épaulé en squat", cat: "barre", desc: "Épaulé réceptionné en squat complet.", schema: "clean" },
  { en: "hang squat clean", fr: "épaulé en squat depuis les cuisses", cat: "barre", desc: "Épaulé démarré barre aux cuisses (pas au sol), réception en squat complet.", schema: "clean" },
  { en: "hang power clean", fr: "épaulé debout depuis les cuisses", cat: "barre", desc: "Épaulé démarré aux cuisses, réception au-dessus du parallèle.", schema: "clean" },
  { en: "clean", fr: "épaulé", cat: "barre", desc: "Amener la barre du sol aux épaules en un mouvement.", schema: "clean" },
  { en: "power snatch", fr: "arraché debout", cat: "barre", desc: "Barre du sol au-dessus de la tête en un mouvement, réception au-dessus du parallèle.", schema: "snatch" },
  { en: "squat snatch", fr: "arraché en squat", cat: "barre", desc: "Arraché avec réception en squat complet, bras tendus.", schema: "snatch" },
  { en: "snatch", fr: "arraché", cat: "barre", desc: "Barre du sol au-dessus de la tête en un seul mouvement.", schema: "snatch" },
  { en: "deadlift", fr: "soulevé de terre", cat: "barre", desc: "Soulever la barre du sol jusqu'aux hanches, dos gainé, jambes qui poussent.", schema: "deadlift" },
  { en: "sumo deadlift high pull", fr: "soulevé de terre sumo + tirage menton", cat: "barre", desc: "Position sumo (pieds larges) : soulevé puis tirage de la barre sous le menton.", schema: "deadlift" },
  { en: "front squat", fr: "squat avant (barre devant)", cat: "barre", desc: "Squat barre posée sur les épaules devant, coudes hauts.", schema: "squat" },
  { en: "back squat", fr: "squat arrière (barre dans le dos)", cat: "barre", desc: "Squat barre sur le haut du dos.", schema: "squat" },
  { en: "overhead squat", fr: "squat barre au-dessus de la tête", cat: "barre", desc: "Squat en tenant la barre bras tendus au-dessus de la tête.", schema: "squat" },
  { en: "shoulder press", fr: "développé militaire (strict)", cat: "barre", desc: "Barre des épaules au-dessus de la tête, sans aide des jambes.", schema: "press" },
  { en: "push press", fr: "développé avec impulsion des jambes", cat: "barre", desc: "Petite flexion de jambes pour lancer la barre, puis poussée des bras.", schema: "press" },
  { en: "push jerk", fr: "jeté (réception jambes fléchies)", cat: "barre", desc: "Impulsion des jambes puis passage rapide dessous, réception bras tendus.", schema: "press" },
  { en: "split jerk", fr: "jeté en fente", cat: "barre", desc: "Jeté avec réception en fente avant-arrière.", schema: "press" },
  { en: "jerk", fr: "jeté", cat: "barre", desc: "Barre des épaules au-dessus de la tête avec impulsion des jambes.", schema: "press" },
  { en: "bench press", fr: "développé couché", cat: "barre", desc: "Allongé sur un banc, pousser la barre.", schema: "press" },
  { en: "cluster", fr: "cluster (épaulé + thruster)", cat: "barre", desc: "Épaulé en squat enchaîné directement avec un thruster.", schema: "thruster" },
  { en: "bear complex", fr: "bear complex", cat: "barre", desc: "Enchaînement épaulé + thruster + thruster dos, sans lâcher la barre." },

  // ── Haltères / kettlebell ───────────────────────────────────────────────
  { en: "dumbbell snatch", fr: "arraché à l'haltère", cat: "haltère", desc: "Haltère du sol au-dessus de la tête d'un bras.", schema: "snatch" },
  { en: "dumbbell thruster", fr: "thruster aux haltères", cat: "haltère", desc: "Squat + développé avec deux haltères.", schema: "thruster" },
  { en: "devil press", fr: "devil press", cat: "haltère", desc: "Burpee haltères en main, puis arraché des deux haltères au-dessus de la tête." },
  { en: "dumbbell", fr: "haltère", cat: "haltère", desc: "" },
  { en: "kettlebell swing", fr: "swing kettlebell", cat: "kettlebell", desc: "Balancer la kettlebell par poussée des hanches, jusqu'aux yeux ou au-dessus de la tête.", schema: "swing" },
  { en: "american kettlebell swing", fr: "swing kettlebell américain (au-dessus de la tête)", cat: "kettlebell", desc: "Swing terminé bras tendus au-dessus de la tête.", schema: "swing" },
  { en: "russian kettlebell swing", fr: "swing kettlebell russe (hauteur des yeux)", cat: "kettlebell", desc: "Swing arrêté à hauteur des épaules/yeux.", schema: "swing" },
  { en: "kettlebell", fr: "kettlebell", cat: "kettlebell", desc: "" },
  { en: "turkish get-up", fr: "relevé turc", cat: "kettlebell", desc: "Passer d'allongé à debout en gardant le poids au-dessus de la tête." },
  { en: "goblet squat", fr: "squat gobelet", cat: "kettlebell", desc: "Squat en tenant une kettlebell contre la poitrine.", schema: "squat" },
  { en: "farmers carry", fr: "portage fermier", cat: "kettlebell", desc: "Marcher en portant une charge lourde dans chaque main, gainage serré.", schema: "carry" },
  { en: "farmer carry", fr: "portage fermier", cat: "kettlebell", desc: "Marcher en portant une charge lourde dans chaque main.", schema: "carry" },

  // ── Gymnastique ─────────────────────────────────────────────────────────
  { en: "pull-up", fr: "traction", cat: "gym", desc: "Se hisser à la barre jusqu'à passer le menton au-dessus.", schema: "pullup" },
  { en: "eccentric pull-up", fr: "traction excentrique (descente lente)", cat: "gym", desc: "Monter aidé, descendre le plus lentement possible.", schema: "pullup" },
  { en: "excentric pull-up", fr: "traction excentrique (descente lente)", cat: "gym", desc: "Monter aidé, descendre lentement.", schema: "pullup" },
  { en: "strict pull-up", fr: "traction stricte", cat: "gym", desc: "Traction sans élan, corps immobile.", schema: "pullup" },
  { en: "chest-to-bar pull-up", fr: "traction poitrine à la barre", cat: "gym", desc: "Traction où la poitrine touche la barre.", schema: "pullup" },
  { en: "kipping pull-up", fr: "traction avec élan (kipping)", cat: "gym", desc: "Traction utilisant un balancier du corps.", schema: "pullup" },
  { en: "butterfly pull-up", fr: "traction papillon", cat: "gym", desc: "Traction en mouvement circulaire continu.", schema: "pullup" },
  { en: "push-up", fr: "pompe", cat: "gym", desc: "Corps gainé, descendre la poitrine au sol et pousser.", schema: "pushup" },
  { en: "hand-release push-up", fr: "pompe mains décollées", cat: "gym", desc: "Pompe où les mains se lèvent du sol en bas.", schema: "pushup" },
  { en: "handstand push-up", fr: "pompe en équilibre sur les mains", cat: "gym", desc: "En équilibre contre un mur, fléchir les bras jusqu'à toucher la tête au sol et pousser.", schema: "hspu" },
  { en: "handstand walk", fr: "marche en équilibre sur les mains", cat: "gym", desc: "Se déplacer en équilibre sur les mains.", schema: "hspu" },
  { en: "wall walk", fr: "montée au mur (wall walk)", cat: "gym", desc: "Depuis la planche face au sol, marcher des pieds sur le mur en avançant les mains jusqu'au mur.", schema: "wallwalk" },
  { en: "muscle-up", fr: "muscle-up (traction + dips)", cat: "gym", desc: "Passer de la suspension à l'appui bras tendus au-dessus de la barre ou des anneaux.", schema: "pullup" },
  { en: "ring muscle-up", fr: "muscle-up aux anneaux", cat: "gym", desc: "Muscle-up réalisé aux anneaux.", schema: "pullup" },
  { en: "bar muscle-up", fr: "muscle-up à la barre", cat: "gym", desc: "Muscle-up réalisé à la barre fixe.", schema: "pullup" },
  { en: "toes-to-bar", fr: "pointes de pieds à la barre", cat: "gym", desc: "Suspendu, amener les pieds toucher la barre.", schema: "ttb" },
  { en: "knees-to-elbow", fr: "genoux aux coudes", cat: "gym", desc: "Suspendu, amener les genoux toucher les coudes.", schema: "ttb" },
  { en: "ring dip", fr: "dips aux anneaux", cat: "gym", desc: "Aux anneaux, descendre en fléchissant les bras et pousser.", schema: "dip" },
  { en: "dip", fr: "dips", cat: "gym", desc: "En appui sur les barres, fléchir les bras et pousser.", schema: "dip" },
  { en: "ring row", fr: "tirage horizontal aux anneaux", cat: "gym", desc: "Corps incliné, tirer la poitrine vers les anneaux.", schema: "pullup" },
  { en: "rope climb", fr: "montée à la corde", cat: "gym", desc: "Grimper à la corde jusqu'à la marque, en verrouillant avec les pieds.", schema: "rope" },
  { en: "legless rope climb", fr: "montée à la corde sans les jambes", cat: "gym", desc: "Grimper à la corde bras seuls.", schema: "rope" },
  { en: "pistol", fr: "squat sur une jambe (pistol)", cat: "gym", desc: "Squat complet sur une seule jambe, l'autre tendue devant.", schema: "squat" },
  { en: "air squat", fr: "squat au poids du corps", cat: "gym", desc: "Squat sans charge, hanches sous les genoux, poitrine haute.", schema: "squat" },
  { en: "burpee", fr: "burpee", cat: "gym", desc: "Se coucher poitrine au sol, se relever, sauter avec les mains au-dessus de la tête.", schema: "burpee" },
  { en: "burpee over the bar", fr: "burpee par-dessus la barre", cat: "gym", desc: "Burpee terminé par un saut par-dessus la barre.", schema: "burpee" },
  { en: "bar-facing burpee", fr: "burpee face à la barre", cat: "gym", desc: "Burpee perpendiculaire à la barre, saut par-dessus." },
  { en: "burpee box jump-over", fr: "burpee + saut par-dessus la box", cat: "gym", desc: "Burpee suivi d'un passage par-dessus la box.", schema: "box" },
  { en: "sit-up", fr: "relevé de buste (abdos)", cat: "gym", desc: "Allongé, remonter le buste jusqu'à toucher les pieds.", schema: "situp" },
  { en: "abmat sit-up", fr: "relevé de buste sur AbMat", cat: "gym", desc: "Relevé de buste avec le coussin AbMat sous les lombaires.", schema: "situp" },
  { en: "v-up", fr: "V-up", cat: "gym", desc: "Allongé, monter simultanément jambes et buste en V." },
  { en: "hollow rock", fr: "balancement gainé (hollow)", cat: "gym", desc: "Sur le dos, corps en creux, se balancer en gardant le gainage." },
  { en: "plank", fr: "gainage (planche)", cat: "gym", desc: "Position de gainage sur les avant-bras, corps aligné." },
  { en: "lunge", fr: "fente", cat: "gym", desc: "Grand pas avant, genou arrière au sol, puis se relever.", schema: "lunge" },
  { en: "walking lunge", fr: "fentes marchées", cat: "gym", desc: "Fentes en avançant.", schema: "lunge" },
  { en: "front rack lunge", fr: "fente barre devant (front rack)", cat: "barre", desc: "Fente avec la barre posée sur les épaules devant.", schema: "lunge" },
  { en: "overhead lunge", fr: "fente barre au-dessus de la tête", cat: "barre", desc: "Fente en tenant la charge bras tendus au-dessus de la tête.", schema: "lunge" },
  { en: "box jump", fr: "saut sur box", cat: "gym", desc: "Sauter sur la box et se redresser complètement.", schema: "box" },
  { en: "box jump-over", fr: "saut par-dessus la box", cat: "gym", desc: "Passer par-dessus la box en sautant.", schema: "box" },
  { en: "box step-up", fr: "montée sur box", cat: "gym", desc: "Monter sur la box une jambe après l'autre.", schema: "box" },
  { en: "box step-over", fr: "passage sur box (en marchant)", cat: "gym", desc: "Monter puis descendre de l'autre côté de la box.", schema: "box" },
  { en: "wall-ball shot", fr: "wall ball (lancer au mur)", cat: "gym", desc: "Squat avec le ballon, puis lancer sur la cible en hauteur.", schema: "wallball" },
  { en: "wall ball", fr: "wall ball", cat: "gym", desc: "Squat + lancer du ballon lesté sur une cible murale.", schema: "wallball" },
  { en: "double-under", fr: "double tour de corde", cat: "gym", desc: "Corde à sauter qui passe deux fois sous les pieds par saut.", schema: "rope-jump" },
  { en: "single-under", fr: "simple tour de corde", cat: "gym", desc: "Corde à sauter classique.", schema: "rope-jump" },
  { en: "bar hang", fr: "suspension à la barre", cat: "gym", desc: "Rester suspendu à la barre." },
  { en: "l-sit", fr: "L-sit", cat: "gym", desc: "En appui, jambes tendues à l'horizontale." },
  { en: "sled push", fr: "poussée de traîneau", cat: "autre", desc: "Pousser un traîneau chargé.", schema: "carry" },
  { en: "sled pull", fr: "traction de traîneau", cat: "autre", desc: "Tirer un traîneau chargé.", schema: "carry" },
  { en: "sandbag", fr: "sac de sable", cat: "autre", desc: "" },
  { en: "d-ball", fr: "ballon lesté (D-ball)", cat: "autre", desc: "" },

  // ── Cardio / monostructurel ─────────────────────────────────────────────
  { en: "row", fr: "rameur", cat: "cardio", desc: "Rameur Concept2 : poussée des jambes, puis tirage.", schema: "row" },
  { en: "ski-erg", fr: "ski erg", cat: "cardio", desc: "Machine SkiErg.", schema: "ski" },
  { en: "skierg", fr: "ski erg", cat: "cardio", desc: "Machine SkiErg.", schema: "ski" },
  { en: "ski", fr: "ski erg", cat: "cardio", desc: "Machine SkiErg : tirage vertical des bras avec le tronc.", schema: "ski" },
  { en: "assault bike", fr: "vélo assault (Echo/Assault)", cat: "cardio", desc: "Vélo à air, bras et jambes.", schema: "bike" },
  { en: "echo bike", fr: "vélo Echo", cat: "cardio", desc: "Vélo à air Rogue Echo.", schema: "bike" },
  { en: "bike erg", fr: "vélo erg", cat: "cardio", desc: "Vélo d'entraînement Concept2 BikeErg.", schema: "bike" },
  { en: "run", fr: "course à pied", cat: "cardio", desc: "", schema: "run" },
  { en: "shuttle run", fr: "navette (aller-retour)", cat: "cardio", desc: "Courses courtes en aller-retour entre deux lignes.", schema: "run" },
  { en: "swim", fr: "natation", cat: "cardio", desc: "" },
  // ── Renfo classique employé par le coach (vocabulaire français) ────────────
  { en: "barbell row", fr: "rowing barre", cat: "barre", alias: ["rowing barre", "rowing"], schema: "row-barre",
    desc: "Buste penché à 45°, dos plat : tirer la barre vers le nombril en serrant les omoplates, puis redescendre lentement. Travaille le dos." },
  { en: "dumbbell row", fr: "rowing haltère", cat: "haltère", alias: ["rowing haltère", "rowing haltere", "tirage haltère"], schema: "row-barre",
    desc: "Un genou et une main sur un banc, dos plat : tirer l'haltère le long du corps jusqu'à la hanche, un bras à la fois." },
  { en: "military press", fr: "développé militaire", cat: "barre", alias: ["développé militaire", "developpe militaire", "développé épaules"], schema: "press",
    desc: "Debout, barre (ou haltères) au niveau des clavicules : pousser droit au-dessus de la tête sans aide des jambes, fessiers et abdos serrés. Travaille les épaules." },
  { en: "incline press", fr: "développé incliné", cat: "haltère", alias: ["développé incliné"], schema: "press", desc: "Développé sur un banc incliné à 30-45°." },
  { en: "core", fr: "gainage", cat: "gym", alias: ["gainage", "planche", "planche latérale", "plank"], schema: "plank",
    desc: "Corps aligné en appui sur les avant-bras (ou sur un côté pour la planche latérale) : ne pas creuser le bas du dos, respirer normalement." },
  { en: "bird dog", fr: "bird-dog", cat: "gym", alias: ["bird-dog", "bird dog"], desc: "À quatre pattes : tendre en même temps le bras droit et la jambe gauche, sans bouger le bassin, puis inverser." },
  { en: "hip thrust", fr: "hip thrust (pont fessier)", cat: "gym", alias: ["hip thrust", "pont fessier"], desc: "Dos appuyé sur un banc, charge sur les hanches : monter le bassin jusqu'à l'alignement, serrer les fessiers en haut." },
  { en: "calf raise", fr: "extensions mollets", cat: "gym", alias: ["mollets", "extension mollets", "extensions mollets"], desc: "Debout, monter sur la pointe des pieds puis redescendre lentement (3 s) — protège l'Achille en reprise de course." },
  { en: "step-up", fr: "montée sur marche", cat: "gym", alias: ["montée sur marche", "step-up"], schema: "box", desc: "Monter sur une marche ou une box une jambe après l'autre, en poussant sur la jambe du dessus." },
  { en: "strides", fr: "lignes droites (accélérations)", cat: "cardio", alias: ["lignes droites", "éducatifs", "accélérations", "relances"], schema: "run",
    desc: "Accélérations courtes de 15-20 s en restant relâché, sans jamais forcer — technique et vitesse de jambes, pas une séance dure." },
  { en: "mobility", fr: "mobilité", cat: "récup", alias: ["mobilité", "étirements"], desc: "Travail d'amplitude articulaire (hanches, chevilles, épaules, thoracique) sans douleur." },
];

// ── Vocabulaire de format / unités ─────────────────────────────────────────
const EXPR = [
  [/(\d+)\s*rounds? for time of:?/gi, "$1 tours le plus vite possible :"],
  [/(\d+)\s*rounds? for time:?/gi, "$1 tours le plus vite possible :"],
  [/(\d+)\s*rounds? of:?/gi, "$1 tours de :"],
  [/rounds? for time/gi, "tours le plus vite possible"],
  [/for time of:?/gi, "le plus vite possible :"],
  [/for time:?/gi, "le plus vite possible :"],
  [/complete as many rounds and reps as possible in (\d+) minutes? of:?/gi, "un maximum de tours et de répétitions en $1 minutes :"],
  [/as many rounds as possible in (\d+) minutes? of:?/gi, "un maximum de tours en $1 minutes :"],
  [/as many reps as possible in (\d+) minutes? of:?/gi, "un maximum de répétitions en $1 minutes :"],
  [/\bamrap\b/gi, "AMRAP (maximum de tours)"],
  [/every minute on the minute/gi, "toutes les minutes pile (EMOM)"],
  [/\bemom\b/gi, "EMOM (toutes les minutes)"],
  [/every (\d+) minutes? for (\d+) minutes?/gi, "toutes les $1 minutes pendant $2 minutes"],
  [/(\d+)-(\d+)-(\d+)(-(\d+))?\s*reps? for time of:?/gi, "$1-$2-$3$4 répétitions le plus vite possible :"],
  [/reps? for time of:?/gi, "répétitions le plus vite possible :"],
  [/in (\d+) minutes?,?/gi, "en $1 minutes,"],
  [/\brest (\d+)\s*'/gi, "récupération $1 min"],
  [/\brest (\d+)\s*"/gi, "récupération $1 s"],
  [/\brest (\d+) minutes?\b/gi, "récupération $1 minutes"],
  [/\brest\b(?! day)/gi, "récupération"],
  [/\bswitch\b/gi, "on change"],
  [/\bwarm[- ]?up\b/gi, "échauffement"],
  [/\bfinisher\b/gi, "finisher (fin de séance)"],
  [/\bskill\b/gi, "technique"],
  [/\breview\b/gi, "revoir"],
  [/\bcumuler\b/gi, "cumuler"],
  [/\bshoulder taps?\b/gi, "touches d'épaule"],
  [/\binchworm\b/gi, "chenille (inchworm)"],
  [/\bup (?:n|and|&) down\b/gi, "up & down (planche ↔ pompes sur les mains)"],
  [/\brest as needed\b/gi, "récupération libre"],
  [/\brest day\b/gi, "jour de repos"],
  [/\bthen,?\b/gi, "puis"],
  [/\bmax reps?\b/gi, "maximum de répétitions"],
  [/\bunbroken\b/gi, "sans lâcher"],
  [/\balternating\b/gi, "en alternance"],
  [/\beach arm\b/gi, "par bras"],
  [/\beach leg\b/gi, "par jambe"],
  [/\beach side\b/gi, "de chaque côté"],
  [/\bpost .*to comments\.?/gi, ""],
  [/\bstimulus and strategy\b/gi, "Objectif et stratégie"],
  [/\bintermediate option\b/gi, "Option intermédiaire"],
  [/\bbeginner option\b/gi, "Option débutant"],
  [/(\d+)[- ]meter(s)?/gi, "$1 m"],
  [/(\d+)[- ]mile(s)?/gi, "$1 mile"],
  [/(\d+)[- ]calorie(s)?/gi, "$1 calories"],
  [/(\d+)[- ]foot\b/gi, "$1 pieds"],
  [/(\d+)[- ]inch\b/gi, "$1 pouces"],
  [/(\d+)[- ]yard(s)?/gi, "$1 yards"],
  [/\breps?\b/gi, "répétitions"],
  [/\bsets?\b/gi, "séries"],
  [/\bround\b/gi, "tour"],
  [/\brounds\b/gi, "tours"],
  [/\bminutes?\b/gi, "minutes"],
  [/\bseconds?\b/gi, "secondes"],
  [/\bwith a (\d+)-minute time cap\b/gi, "avec un temps limite de $1 minutes"],
  [/\btime cap\b/gi, "temps limite"],
  [/\bbuy-in\b/gi, "entrée (à faire avant)"],
  [/\bcash-out\b/gi, "sortie (à faire après)"],
  [/\bpartner\b/gi, "en binôme"],
  [/\bfor load\b/gi, "pour la charge"],
  [/\bfind a heavy\b/gi, "chercher un lourd"],
  [/\bwarm-?up\b/gi, "échauffement"],
  [/\bcool-?down\b/gi, "retour au calme"],
];

// mouvements triés du plus long au plus court pour ne pas couper "power clean" en "clean"
const TRI = [...MOUVEMENTS].sort((a, b) => b.en.length - a.en.length);

// Accord au pluriel : "5 traction" → "5 tractions"
function accorde(t) {
  const FEM = /^(traction|pompe|fente|montée|série|planche|course|marche)$/i;
  t = t.replace(/\b(\d+)([-\d]*)\s+(traction|pompe|squat|burpee|fente|montée|relevé|saut|série|tour|planche)s?\s+(strict|stricte|lourd|marché|marchée|complet|excentrique|profond)e?s?\b/gi,
    (m, n, suite, nom, adj) => {
      const fem = FEM.test(nom);
      const base = adj.replace(/e$/, "").replace(/ée$/, "é");
      const acc = fem ? (/é$/.test(base) ? base + "es" : base + "es") : base + "s";
      return `${n}${suite} ${nom}s ${acc}`;
    });
  return t.replace(/(\b[2-9]\d*|\b1\d+)\s+(\p{L}+)/gu, (m, n, mot) =>
    /^\p{Lu}/u.test(mot) || /s$|x$/.test(mot) || /^(de|du|des|en|le|la|les|au|aux|par|pour|sur|m|km|min|kg|calories|minutes|secondes|tours|répétitions|séries|miles|pouces|pieds|yards|jour|maximum|wall|box|double|simple|ski|bike|erg|assault|echo)$/i.test(mot)
      ? m : `${n} ${mot}s`);
}

export function traduireLigne(ligne) {
  let t = " " + ligne + " ";
  const jetons = [];
  for (const m of TRI) {
    const base = m.en.replace(/[-\s]/g, "[-\\s]");
    const re = new RegExp(`\\b${base}(s|es)?\\b`, "gi");
    t = t.replace(re, () => { jetons.push(m.fr); return `\u0001${jetons.length - 1}\u0001`; });
  }
  for (const [re, rep] of EXPR) t = t.replace(re, rep);
  t = t.replace(/\u0001(\d+)\u0001/g, (_, i) => jetons[+i]);
  t = t.replace(/♀/g, "F :").replace(/♂/g, "H :");
  return accorde(t.replace(/\s+/g, " ").trim());
}

export function traduireWod(lignes) { return (lignes || []).map(traduireLigne).filter(Boolean); }

// Mouvements cités dans un texte FRANÇAIS (les séances écrites par le coach)
export function detecterFr(texte) {
  const t = " " + String(texte || "").toLowerCase() + " ";
  const out = [];
  const cand = [...MOUVEMENTS].sort((a, b) => (b.fr.length) - (a.fr.length));
  const cle = m => m.fr.replace(/\s*\(.*\)/, "").toLowerCase().trim();
  for (const m of cand) {
    const formes = [cle(m), ...(m.alias || [])];
    if (!formes.some(f => f.length > 3 && t.includes(" " + f.toLowerCase()))) continue;
    const k = cle(m);
    if (out.some(x => cle(x) === k || cle(x).includes(k) || k.includes(cle(x)))) continue;   // pas de doublon
    out.push(m);
  }
  return out.slice(0, 8);
}

// Mouvements présents dans un WOD (pour les schémas et l'index)
export function mouvementsDe(lignes) {
  const txt = (lignes || []).join(" ").toLowerCase();
  const trouves = [];
  for (const m of TRI) {
    const base = m.en.replace(/[-\s]/g, "[-\\s]");
    if (new RegExp(`\\b${base}(s|es)?\\b`, "i").test(txt) && !trouves.some(x => x.en.includes(m.en) || m.en.includes(x.en))) trouves.push(m);
  }
  return trouves;
}
