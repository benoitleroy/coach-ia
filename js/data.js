// SOURCE UNIQUE DE VÉRITÉ — toutes les données fictives du mockup
// Analogie : c'est le réservoir. Les autres fichiers JS sont les tuyaux.

window.ATHLETES = {
  benoit: {
    id: "benoit",
    nom: "Benoît L.",
    age: 42,
    ville: "Marseille",
    avatar: "BL",
    discipline: "Ironman / Triathlon longue distance",
    objectif: "Ironman Switzerland Thun — 5 juillet 2026",

    // --- ÉTAT DE FORME AUJOURD'HUI ---
    forme: {
      score: 78, // /100
      hrv: 62,   // ms
      sommeilHeures: 6.8,
      sommeilQualite: 72, // /100
      chargeAigue: 380,   // UA (unités arbitraires)
      chronique: 310,     // moyenne 28 jours
      ratio: 1.23,        // aigue/chronique — >1.3 = surcharge, <0.8 = sous-charge
      statut: "ok",       // "ok" | "surcharge" | "sous-charge"
    },

    // --- DERNIÈRE SÉANCE ---
    derniereSéance: {
      date: "Hier, 17h30",
      type: "Vélo",
      icone: "🚴",
      durée: "2h15",
      distance: "68 km",
      puissanceMoyenne: "187W",
      ressenti: 4,        // /5
      ressentLabel: "Bonne séance",
      note: "Bonne énergie sur les relances, légère fatigue en fin de parcours.",
    },

    // --- PLAN 7 JOURS ---
    plan7jours: [
      {
        jour: "Auj.", date: "20 avr", type: "Repos actif", icone: "🧘",
        intensite: "légère", duree: "30-40min", detail: "Marche ou yoga doux",
        noteCoach: "J+5 depuis la dernière trace de grippe. Reprise douce, pas d'objectif perf. Marche tranquille ou yoga, respiration nasale. Si ça accroche (fatigue anormale, gorge), tu coupes et tu reviens demain.",
        zones: null,
        exercices: [
          { nom: "Marche active", duree: "25-30 min", note: "Allure confortable, sur terrain plat, respiration nasale" },
          { nom: "Mobilité hanches / épaules", duree: "10 min", note: "Après 5 jours quasi-off, le corps a besoin de se remettre en mouvement" },
        ],
        ajustement: "ok",
      },
      {
        jour: "Mar.", date: "21 avr", type: "Repos", icone: "😴",
        intensite: "repos", duree: "—", detail: "Sommeil + récup totale",
        noteCoach: "Récupération = progression différée. Sommeil 8h+, hydratation, protéines. Pas de sport aujourd'hui. Si tu bouges, que ce soit uniquement par plaisir.",
        zones: null,
        exercices: [
          { nom: "Sommeil prolongé", duree: "8h+ visé", note: "Couche-toi avant 22h, température chambre <19°C" },
          { nom: "Hydratation", duree: "Toute la journée", note: "2L d'eau minimum, électrolytes si transpiration nocturne" },
          { nom: "Nutrition récupération", duree: "Toute la journée", note: "1.8g protéines/kg, glucides complexes à chaque repas" },
        ],
        ajustement: "ok",
      },
      {
        jour: "Mer.", date: "22 avr", type: "Vélo", icone: "🚴",
        intensite: "légère", duree: "45min", detail: "Test vélo Z1-Z2 très doux",
        noteCoach: "Premier test cardio post-grippe. Pédalage tranquille, FC sous 140 bpm. Objectif : écouter comment ton corps réagit à un effort modéré après l'épisode. Si la fréquence cardiaque est anormalement haute pour l'effort, tu coupes.",
        zones: [
          { label: "Échauffement", duree: "10 min", zone: "Z1", couleur: "#00D4AA", detail: "Cadence 80-85 rpm, puissance très basse" },
          { label: "Cœur de séance", duree: "25 min", zone: "Z1-Z2", couleur: "#00D4AA", detail: "FC sous 140 bpm, pédalage fluide, rien de contraint" },
          { label: "Retour calme", duree: "10 min", zone: "Z1", couleur: "#00D4AA", detail: "Cadence libre, décompression" },
        ],
        exercices: [
          { nom: "Pédalage Z1-Z2", duree: "45 min", note: "Tu dois pouvoir parler en phrases complètes. Si FC monte >140 sans effort : tu coupes" },
        ],
        ajustement: "ok",
      },
      {
        jour: "Jeu.", date: "23 avr", type: "Repos", icone: "😴",
        intensite: "repos", duree: "—", detail: "Débrief du test d'hier",
        noteCoach: "Récupération = progression différée. Sommeil, hydratation, protéines. Pour info : si ton HRV s'est bien comporté après le vélo d'hier, on pourra envisager un peu plus demain.",
        zones: null,
        exercices: [
          { nom: "Sommeil + hydratation", duree: "24h", note: "Check ton HRV ce matin : stable ou +/- 5% = OK, chute > 10% = attention" },
          { nom: "Marche légère", duree: "20 min optionnel", note: "Uniquement si tu en as envie, pas d'obligation" },
        ],
        ajustement: "ok",
      },
      {
        jour: "Ven.", date: "24 avr", type: "Natation", icone: "🏊",
        intensite: "légère", duree: "45min", detail: "Technique pure, pas de séries",
        noteCoach: "Retour progressif à la nage — discipline la moins traumatisante après grippe. Pas de séries chronométrées, uniquement technique et sensations. Évite le chlore intense si tu as encore une gêne respiratoire.",
        zones: [
          { label: "Échauffement", duree: "15 min", zone: "Z1", couleur: "#00D4AA", detail: "400m nage libre relaxée + 4 × 25m en brasse/dos" },
          { label: "Drills technique", duree: "20 min", zone: "Z1-Z2", couleur: "#00D4AA", detail: "Catch-up, finger-drag, 6-3-6 kick — 4 × 50m de chaque" },
          { label: "Retour calme", duree: "10 min", zone: "Z1", couleur: "#00D4AA", detail: "200m continu facile, étirements au bord" },
        ],
        exercices: [
          { nom: "Drills technique", duree: "800m total", note: "Pas de chrono. Focus sur l'entrée de main et le relâchement épaules" },
          { nom: "Respiration bilatérale", duree: "Tout au long", note: "Respire tous les 3 coups — utile pour Thun (eau ouverte)" },
        ],
        ajustement: "ok",
      },
      {
        jour: "Sam.", date: "25 avr", type: "Vélo", icone: "🚴",
        intensite: "modérée", duree: "1h", detail: "Z2 continu, terrain plat",
        noteCoach: "Première sortie un peu plus consistante — reprise du volume aérobie. Objectif : 1h à FC Z2, sur terrain plat, pas de forçage. Si à 30 min tout se passe bien, tu peux prolonger jusqu'à 1h15. Sinon tu coupes à 45 min.",
        zones: [
          { label: "Échauffement", duree: "15 min", zone: "Z1", couleur: "#00D4AA", detail: "Montée progressive en FC" },
          { label: "Cœur de séance", duree: "35 min", zone: "Z2", couleur: "#6C63FF", detail: "FC 135-148 bpm, cadence 85-90 rpm" },
          { label: "Retour calme", duree: "10 min", zone: "Z1", couleur: "#00D4AA", detail: "Décompression, étirements sortie vélo" },
        ],
        exercices: [
          { nom: "Vélo Z2 continu", duree: "1h", note: "Terrain plat de préférence. Évite les bosses qui poussent en Z3/Z4 sur reprise" },
          { nom: "Ravito", duree: "Toutes les 30 min", note: "Hydratation + petit apport glucides — teste ce qui passe bien" },
        ],
        ajustement: "ok",
      },
      {
        jour: "Dim.", date: "26 avr", type: "Repos actif", icone: "🧘",
        intensite: "légère", duree: "30min", detail: "Mobilité + étirements",
        noteCoach: "Fin de première semaine de reprise. Mobilité douce pour intégrer la semaine, pas de cardio. La semaine prochaine on réintroduit la course à pied progressivement si tous les signaux sont au vert.",
        zones: null,
        exercices: [
          { nom: "Mobilité articulaire", duree: "15 min", note: "Hanches, chevilles, épaules — mouvements amples sans forcer" },
          { nom: "Étirements chaîne postérieure", duree: "10 min", note: "Mollets, ischio-jambiers, dos — après 2 sorties vélo cette semaine" },
          { nom: "Respiration / cohérence cardiaque", duree: "5 min", note: "Prépare la semaine prochaine mentalement" },
        ],
        ajustement: "ok",
      },
    ],

    // --- 8 COUCHES 360° ---
    couches: {
      genetique: {
        score: 71,
        statut: "calibré",
        points: [
          "VO2max génétique estimé : potentiel élevé (>65 ml/kg/min)",
          "Profil mixte : résistance dominante (68%) / puissance (32%)",
          "Risque tendineux modéré — surveiller Achille et genou",
          "Récupération musculaire : dans la moyenne haute",
        ],
      },
      biologique: {
        score: 65,
        statut: "calibré",
        points: [
          "42 ans : pic de testostérone derrière, maintien possible avec entraînement",
          "Récupération inter-séances : 48-72h recommandées sur sessions intenses",
          "Adaptation à la chaleur : bonne (Marseille, terrain familier)",
          "Fenêtre anabolique post-effort à maximiser",
        ],
      },
      physiologique: {
        score: 74,
        statut: "calibré",
        points: [
          "VO2max mesuré : 58 ml/kg/min (test récent)",
          "Seuil ventilatoire 1 : ~145 bpm",
          "Seuil ventilatoire 2 : ~168 bpm",
          "Puissance critique vélo : 230W (FTP estimée)",
          "Allure seuil CAP : 4:45/km",
        ],
      },
      psychologique: {
        score: 82,
        statut: "calibré",
        points: [
          "Résilience élevée — supporte bien la pression compétitive",
          "Motivation intrinsèque dominante (transformation personnelle > résultats)",
          "Pattern sous pression : légère tendance au sur-contrôle",
          "Force mentale : endurance de l'effort long validée (Ironman)",
        ],
      },
      sommeil: {
        score: 68,
        statut: "calibré",
        points: [
          "Durée moyenne : 6h45 — légèrement en dessous de l'optimal (7h30)",
          "HRV baseline : 58-65ms (bonne zone pour 42 ans)",
          "Dette de sommeil accumulée cette semaine : ~1h20",
          "Qualité de récupération : correcte malgré durée courte",
        ],
      },
      nutrition: {
        score: 0,
        statut: "en-calibration",
        points: [
          "Module en cours de calibration",
          "Connectez votre journal alimentaire pour démarrer",
        ],
      },
      charge: {
        score: 73,
        statut: "calibré",
        points: [
          "Charge aiguë (7j) : 380 UA",
          "Charge chronique (28j) : 310 UA",
          "Ratio A/C : 1.23 — zone de progression optimale",
          "Monotonie : 2.1 — diversité des séances à améliorer",
          "Charge hebdo tendance : +8% vs semaine précédente",
        ],
      },
      ressentis: {
        score: 0,
        statut: "en-calibration",
        points: [
          "Module en cours de calibration",
          "Commencez à remplir votre journal quotidien pour activer ce module",
        ],
      },
    },

    // --- ALERTE INTELLIGENTE ---
    alerte: {
      type: "ok", // "ok" | "surcharge" | "sous-charge" | "info"
      titre: "Forme en zone de progression",
      message: "Ton ratio charge/récupération est à 1.23 — c'est la zone idéale pour progresser sans te blesser. La séance d'hier t'a chargé correctement. Aujourd'hui, privilégie la récupération active.",
      action: "Voir le détail de ma charge",
    },

    // --- HISTORIQUE CHAT IA (réponses pré-écrites) ---
    chatHistorique: [
      {
        role: "ia",
        message: "Bonjour Benoît. Ton HRV de ce matin est à 62ms — dans ta zone haute. Ton corps est prêt. Qu'est-ce qui t'amène aujourd'hui ?",
      },
    ],
  },

  sophie: {
    id: "sophie",
    nom: "Sophie M.",
    age: 35,
    ville: "Lyon",
    avatar: "SM",
    discipline: "Triathlon M",
    objectif: "Triathlon M Annecy — Août 2026",

    forme: {
      score: 52,
      hrv: 41,
      sommeilHeures: 5.9,
      sommeilQualite: 55,
      chargeAigue: 520,
      chronique: 350,
      ratio: 1.49,
      statut: "surcharge",
    },

    alerte: {
      type: "surcharge",
      titre: "Attention : signaux de surcharge détectés",
      message: "Ton ratio charge/récupération est à 1.49 — au-dessus du seuil critique de 1.3. Couplé à un HRV bas (41ms) et un sommeil dégradé, ton corps envoie un signal clair. Une réduction de charge s'impose cette semaine.",
      action: "Voir mes options de récupération",
    },

    derniereSéance: {
      date: "Hier, 6h00",
      type: "Course à pied",
      icone: "🏃",
      durée: "1h20",
      distance: "15 km",
      ressenti: 2,
      ressentLabel: "Séance difficile",
      note: "Jambes lourdes dès le départ. Envie d'arrêter à mi-parcours.",
    },

    plan7jours: [
      {
        jour: "Auj.", date: "18 avr", type: "Repos complet", icone: "😴",
        intensite: "repos", duree: "—", detail: "Récupération prioritaire",
        noteCoach: "Sophie, je t'arrête. Ton HRV à 41ms et ton ratio à 1.49 me disent que ton corps est en dette sérieuse. Aujourd'hui : zéro entraînement. Mange, dors, récupère. Ce n'est pas de la faiblesse — c'est de l'intelligence.",
        zones: null,
        exercices: [
          { nom: "Sommeil compensatoire", duree: "8h minimum", note: "Couche-toi avant 21h si possible ce soir" },
          { nom: "Bain ou douche chaude", duree: "20 min", note: "Aide la récupération musculaire et le système nerveux" },
          { nom: "Repas anti-inflammatoire", duree: "Journée", note: "Oméga-3, légumes colorés, pas d'alcool" },
        ],
        ajustement: "ok",
      },
      {
        jour: "Sam.", date: "19 avr", type: "Natation", icone: "🏊",
        intensite: "légère", duree: "45min", detail: "Technique seule — pas d'effort",
        noteCoach: "Si tu rentres dans l'eau ce matin et que tu te sens encore lourde, retourne chez toi. Ce n'est pas une capitulation — c'est écouter ton corps. Si tu y vas : Z1 absolu, technique pure, aucune intensité.",
        zones: [
          { label: "Nage libre relaxée", duree: "45 min", zone: "Z1", couleur: "#00D4AA", detail: "FC max 130 bpm. Si tu dépasses, tu t'arrêtes." },
        ],
        exercices: [
          { nom: "Nage libre très facile", duree: "20 min", note: "Pas de chrono, pas d'objectif de distance" },
          { nom: "Drills technique", duree: "15 min", note: "Catch-up, position corps dans l'eau" },
          { nom: "Étirements dans l'eau", duree: "10 min", note: "Épaules, dos, hanches" },
        ],
        ajustement: "ok",
      },
      {
        jour: "Dim.", date: "20 avr", type: "Marche", icone: "🚶",
        intensite: "légère", duree: "1h", detail: "Promenade active",
        noteCoach: "Marche dans la nature si possible. Pas d'écouteurs dans les oreilles — juste toi et le mouvement. C'est une séance de récupération active ET de reconnexion. Observe comment tu te sens vraiment.",
        zones: null,
        exercices: [
          { nom: "Marche en nature", duree: "60 min", note: "Terrain plat, FC < 120 bpm, pas de côtes" },
        ],
        ajustement: "ok",
      },
      {
        jour: "Lun.", date: "21 avr", type: "Repos", icone: "😴",
        intensite: "repos", duree: "—", detail: "Récupération",
        noteCoach: "Deuxième jour de repos dans la semaine — volontaire. On reconstruit les fondations. Profite de cette journée pour noter dans ton journal comment tu te sens. Ces données sont précieuses.",
        zones: null,
        exercices: [{ nom: "Repos complet", duree: "—", note: "Journal de bord recommandé" }],
        ajustement: "ok",
      },
      {
        jour: "Mar.", date: "22 avr", type: "Vélo doux", icone: "🚴",
        intensite: "légère", duree: "1h", detail: "Z1 uniquement",
        noteCoach: "Premier retour à l'entraînement. Z1 absolu — si ton compteur dépasse 130 bpm, tu réduis la cadence. L'objectif est de faire tourner les jambes, pas de performer. Écoute comment ton corps répond.",
        zones: [
          { label: "Vélo Z1 continu", duree: "60 min", zone: "Z1", couleur: "#00D4AA", detail: "FC 110-130 bpm, cadence 85-90 rpm, terrain plat impératif" },
        ],
        exercices: [
          { nom: "Pédalage facile continu", duree: "60 min", note: "Cadence régulière, aucune accélération, paysage plutôt que performance" },
        ],
        ajustement: "ok",
      },
      {
        jour: "Mer.", date: "23 avr", type: "Natation", icone: "🏊",
        intensite: "légère", duree: "45min", detail: "Retour progressif",
        noteCoach: "Si hier s'est bien passé, tu peux monter légèrement en Z2 aujourd'hui. Mais seulement si. Ton HRV te donnera la réponse ce matin — regarde-le avant de décider.",
        zones: [
          { label: "Nage légère à modérée", duree: "45 min", zone: "Z1-Z2", couleur: "#6C63FF", detail: "FC 120-145 bpm selon ressenti" },
        ],
        exercices: [
          { nom: "Échauffement nage", duree: "15 min", note: "Z1, technique" },
          { nom: "Série courte Z2", duree: "20 min", note: "5 × 100m avec 30s récup — seulement si tu te sens bien" },
          { nom: "Retour calme", duree: "10 min", note: "Nage libre légère" },
        ],
        ajustement: "ok",
      },
      {
        jour: "Jeu.", date: "24 avr", type: "Course légère", icone: "🏃",
        intensite: "légère", duree: "45min", detail: "Z2 facile",
        noteCoach: "Fin de semaine de récupération. Si tu arrives là et que tu te sens bien — vraiment bien — c'est que la stratégie a fonctionné. Cours en Z2 et souris. Tu as fait confiance au processus.",
        zones: [
          { label: "Course Z2", duree: "45 min", zone: "Z2", couleur: "#6C63FF", detail: "FC 135-148 bpm, allure libre" },
        ],
        exercices: [
          { nom: "Run Z2 facile", duree: "45 min", note: "Terrain plat ou légèrement vallonné, cadence 175+, aucune pression" },
        ],
        ajustement: "ok",
      },
    ],

    couches: {
      genetique: { score: 68, statut: "calibré", points: ["Profil endurance marqué", "Bonne capacité d'adaptation aérobie"] },
      biologique: { score: 70, statut: "calibré", points: ["35 ans : pleine zone de performance", "Cycle menstruel à intégrer dans la planification"] },
      physiologique: { score: 66, statut: "calibré", points: ["VO2max estimé : 54 ml/kg/min", "Seuil lactique : ~162 bpm"] },
      psychologique: { score: 75, statut: "calibré", points: ["Forte motivation", "Tendance au perfectionnisme — risque de sur-entraînement"] },
      sommeil: { score: 44, statut: "calibré", points: ["5h55 de moyenne — déficit chronique", "HRV en chute : signal de fatigue systémique"] },
      nutrition: { score: 0, statut: "en-calibration", points: ["Module en cours de calibration"] },
      charge: { score: 38, statut: "calibré", points: ["Ratio A/C : 1.49 — zone rouge", "Réduction immédiate recommandée"] },
      ressentis: { score: 0, statut: "en-calibration", points: ["Module en cours de calibration"] },
    },

    chatHistorique: [
      { role: "ia", message: "Bonjour Sophie. Ton HRV ce matin est à 41ms — en dessous de ta baseline. Ton corps te parle. Comment tu te sens ?" },
    ],
  },

  marc: {
    id: "marc",
    nom: "Marc T.",
    age: 28,
    ville: "Paris",
    avatar: "MT",
    discipline: "Triathlon S / M débutant",
    objectif: "Premier Triathlon M — Septembre 2026",

    forme: {
      score: 61,
      hrv: 71,
      sommeilHeures: 7.5,
      sommeilQualite: 80,
      chargeAigue: 180,
      chronique: 240,
      ratio: 0.75,
      statut: "sous-charge",
    },

    alerte: {
      type: "sous-charge",
      titre: "Tu peux progresser davantage",
      message: "Ton ratio est à 0.75 — en dessous de 0.8, tu es en sous-charge. Ton corps est bien récupéré et prêt à absorber plus de travail. C'est le bon moment pour augmenter progressivement le volume.",
      action: "Voir comment augmenter ma charge",
    },

    derniereSéance: {
      date: "Avant-hier",
      type: "Natation",
      icone: "🏊",
      durée: "45min",
      distance: "1200m",
      ressenti: 5,
      ressentLabel: "Excellente séance",
      note: "Technique en nette amélioration. Moins d'essoufflement sur les 100m.",
    },

    plan7jours: [
      { jour: "Auj.", date: "18 avr", type: "Vélo",     icone: "🚴", intensite: "modérée", duree: "1h15",  detail: "Sortie endurance Z2",        noteCoach: "Ton corps est frais et prêt. Z2 pendant 1h15 — c'est ta fondation aérobie. Ne cherche pas à aller vite.", zones: null, exercices: [{ nom: "Vélo Z2 continu", duree: "1h15", note: "FC 130-145 bpm, terrain plat" }], ajustement: "ok" },
      { jour: "Sam.", date: "19 avr", type: "Course",   icone: "🏃", intensite: "modérée", duree: "1h",    detail: "Sortie longue tranquille",    noteCoach: "Ta première vraie sortie longue. Pas de chrono, juste courir. Si tu peux parler sans t'essouffler, tu es au bon rythme.", zones: null, exercices: [{ nom: "Run Z2", duree: "60 min", note: "Allure conversation, ~6:30/km" }], ajustement: "ok" },
      { jour: "Dim.", date: "20 avr", type: "Natation", icone: "🏊", intensite: "modérée", duree: "1h",    detail: "Séries 200m",                 noteCoach: "En piscine, focus sur la technique. Tu progresseras 10× plus vite avec une bonne gestuelle qu'en nageant vite et mal.", zones: null, exercices: [{ nom: "6 × 200m", duree: "45 min", note: "30s récup entre chaque, technique prioritaire" }], ajustement: "ok" },
      { jour: "Lun.", date: "21 avr", type: "Repos",    icone: "😴", intensite: "repos",   duree: "—",     detail: "Repos actif",                 noteCoach: "3 jours de suite, c'est du bon travail. Maintenant laisse ton corps intégrer. C'est ce jour qui fait progresser les autres.", zones: null, exercices: [{ nom: "Marche ou repos", duree: "20-30 min optionnel", note: "Aucune obligation" }], ajustement: "ok" },
      { jour: "Mar.", date: "22 avr", type: "Vélo",     icone: "🚴", intensite: "modérée", duree: "1h30",  detail: "Augmentation volume +15min",  noteCoach: "On augmente progressivement. +15 minutes par rapport à lundi. C'est la règle des 10% — ton corps s'adapte sans se blesser.", zones: null, exercices: [{ nom: "Vélo Z2 étendu", duree: "1h30", note: "Même effort que mardi mais plus long" }], ajustement: "ok" },
      { jour: "Mer.", date: "23 avr", type: "Course",   icone: "🏃", intensite: "modérée", duree: "50min", detail: "Fartlek léger",               noteCoach: "Fartlek = jeu de vitesse en suédois. Alterne 3min facile / 1min un peu plus soutenu. Tu découvres tes sensations à différentes allures.", zones: null, exercices: [{ nom: "Fartlek 3/1", duree: "50 min", note: "8 cycles : 3min Z2 + 1min Z3" }], ajustement: "ok" },
      { jour: "Jeu.", date: "24 avr", type: "Natation", icone: "🏊", intensite: "modérée", duree: "1h",    detail: "Amélioration technique",      noteCoach: "Fin de semaine, finish fort en piscine. Compare tes sensations avec dimanche — tu dois déjà sentir une différence dans l'eau.", zones: null, exercices: [{ nom: "Technique + 400m chrono", duree: "60 min", note: "Note ton temps sur 400m — référence de départ" }], ajustement: "ok" },
    ],

    couches: {
      genetique: { score: 65, statut: "calibré", points: ["Profil mixte endurance/vitesse", "Bonne capacité de progression"] },
      biologique: { score: 88, statut: "calibré", points: ["28 ans : pic de récupération", "Adaptation rapide aux nouvelles charges"] },
      physiologique: { score: 55, statut: "calibré", points: ["VO2max estimé : 51 ml/kg/min — marge de progression importante", "Seuils à calibrer avec plus de données"] },
      psychologique: { score: 70, statut: "calibré", points: ["Motivation forte", "Manque d'expérience compétitive — travail mental à développer"] },
      sommeil: { score: 83, statut: "calibré", points: ["7h30 de moyenne — optimal", "HRV élevé : excellente récupération"] },
      nutrition: { score: 0, statut: "en-calibration", points: ["Module en cours de calibration"] },
      charge: { score: 52, statut: "calibré", points: ["Ratio A/C : 0.75 — sous-charge", "Potentiel de progression non exploité"] },
      ressentis: { score: 0, statut: "en-calibration", points: ["Module en cours de calibration"] },
    },

    chatHistorique: [
      { role: "ia", message: "Bonjour Marc. Tu as bien dormi — 7h30 et HRV à 71ms. Ton corps est en forme. Qu'est-ce qu'on travaille aujourd'hui ?" },
    ],
  },
};

// Réponses pré-écrites du chat IA (par mots-clés)
window.CHAT_REPONSES = [
  {
    mots: ["fatigue", "fatigué", "épuisé", "crevé"],
    reponse: "Je vois ça dans tes données aussi. Ton HRV est en baisse et ton ratio charge/récupération le confirme. La fatigue n'est pas un échec — c'est de l'information. Ton corps te dit qu'il a besoin de temps pour intégrer le travail que tu lui as donné. Que dirais-tu de regarder ensemble ce qui s'est passé ces 7 derniers jours ?",
  },
  {
    mots: ["douleur", "mal", "blessure", "douleurs"],
    reponse: "Parle-moi de cette douleur : où exactement ? Depuis combien de temps ? Elle apparaît pendant l'effort, après, ou au repos ? Plus tu es précis, plus je peux t'aider à comprendre d'où elle vient. Et rappelle-toi : une douleur ignorée aujourd'hui, c'est souvent 3 semaines d'arrêt dans 2 mois.",
  },
  {
    mots: ["motivation", "envie", "démotivé", "plus envie"],
    reponse: "La démotivation est souvent un signal physiologique déguisé en signal psychologique. Avant de chercher une raison mentale, regarde tes données : comment est ton HRV cette semaine par rapport à ta baseline ? Souvent, quand le corps est en dette, la tête suit. Qu'est-ce qui s'est passé dans ta vie les 10 derniers jours ?",
  },
  {
    mots: ["objectif", "ironman", "triathlon", "course", "compétition"],
    reponse: "Ton objectif est clair et je l'ai bien en tête. La question que je me pose toujours : est-ce que l'objectif sert ta transformation, ou est-ce que tu sacrifies ta transformation pour l'objectif ? Les deux peuvent coexister — mais ça mérite d'être conscient. Qu'est-ce que cet Ironman représente pour toi au fond ?",
  },
  {
    mots: ["sommeil", "dormir", "nuit", "insomnie"],
    reponse: "Le sommeil, c'est là où ton corps fait 80% du travail d'adaptation. Tout ce que tu fais à l'entraînement n'est qu'un stimulus — c'est la nuit que tu progresses vraiment. Dis-moi : tu as du mal à t'endormir, à rester endormi, ou tu te réveilles tôt ? Chaque profil a ses causes et ses solutions.",
  },
  {
    mots: ["charge", "volume", "trop", "beaucoup", "intensité"],
    reponse: "Regardons ça ensemble. Ton ratio charge/récupération me donne une image objective. Mais les chiffres seuls ne racontent pas tout — ton ressenti compte autant. Est-ce que tu as l'impression de courir après le programme, ou de le maîtriser ? C'est une différence importante.",
  },
  {
    mots: ["nutrition", "manger", "alimentation", "énergie", "poids"],
    reponse: "La nutrition en endurance, c'est d'abord une question de timing et de cohérence, pas de perfection. Trois questions simples pour commencer : tu manges quelque chose dans les 30 minutes après l'effort ? Tu t'hydrates en dehors des séances ? Et tu as des baisses d'énergie régulières dans la journée ?",
  },
  {
    mots: ["bonjour", "salut", "hello", "coucou"],
    reponse: "Bonjour ! Je suis là. Les données de ce matin donnent une bonne image de ton état. On peut aller où tu veux : analyser ta dernière semaine, préparer la suivante, ou juste parler de ce que tu ressens. C'est toi qui navigues.",
  },
  {
    mots: ["merci", "super", "parfait", "excellent"],
    reponse: "Je suis là pour ça. N'oublie pas que ces insights n'ont de valeur que si tu en fais quelque chose. La prise de conscience, c'est le début — la décision, c'est toi. Quoi d'autre ?",
  },
];

// Réponse par défaut
window.CHAT_DEFAUT = "C'est une bonne question, et je veux y répondre honnêtement : je n'ai pas assez de données sur ce sujet pour te donner une réponse utile aujourd'hui. Ce que je peux faire, c'est regarder avec toi ce que tes données actuelles disent sur ta situation globale. Tu veux qu'on parte de là ?";
