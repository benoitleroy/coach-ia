# Prompt complémentaire — L'Archive Hebdomadaire

À envoyer à Claude Code **après validation du P0 original** (pipeline ratio corrigé, baseline HRV recalibrée, alerte "sous-charge pendant maladie" bloquée).

Ce prompt recentre l'app sur sa mission profonde : **t'aider à te connaître toi-même via les 7 mois de data pairée Strava + Whoop déjà accumulés** (et les mois qui suivront). La prépa Ironman Nice 2026 est un contexte, pas la finalité. Le produit final, c'est une archive de semaines navigables où tu peux remonter dans ton histoire et voir ce qu'un physiologiste, un coach et un data scientist auraient vu en lisant tes chiffres.

---

## 1 — Recadrage

Mission : construire **"Mes Semaines"**, un module d'archive hebdomadaire qui donne à Benoît la capacité de remonter dans son historique Whoop + Strava et d'y voir des patterns, outliers et breakthroughs qu'un humain ne verrait jamais manuellement.

Principe directeur : chaque semaine doit se lire comme **une consultation** auprès de trois experts :
- **🫀 Lecture physiologique** (ce que ton corps dit)
- **🧭 Œil du coach** (ce que ton entraînement raconte)
- **📊 Signal statistique** (ce que les nombres révèlent)

Ces trois voix doivent être générées **automatiquement et de manière déterministe** — pas de LLM au runtime. Chacune pointe sur des chiffres spécifiques à la semaine. Jamais de conseil générique.

Langage UI : famille visuelle **Whoop × Strava**. Anneaux de recovery, bars de strain colorées, stages de sommeil stackés, cartes d'activités avec icône + stats + zones FC, timelines jour. Tu dois reconnaître à l'œil nu que c'est inspiré des deux. Pas un dashboard Garmin froid.

---

## 2 — Ce que trois experts ont vu dans tes 7 mois de données

Ces constats viennent de trois agents experts qui ont lu les CSV bruts et le code de scoring. Ils sont tous traduisibles en features déterministes. Le catalogue complet est en section 9. Ici, les constats critiques à garder en tête :

### Les bugs silencieux qui bloquent tout

1. **La baseline HRV est cassée.** Dans `js/scoring.js` ligne 44 : `{ baseline: 60, sigma: 8 }`. Ta HRV médiane réelle est **34 ms** (MAD 4). Ton z-score actuel est −3.25 sur 100 % des jours → ton score HRV est à 0 constant. **Le signal le plus prédictif que tu possèdes n'existe pas dans ton score.**
2. **L'ACWR affiché dans l'app dit 0.** Ta dernière séance est datée "il y a 7 jours" → hors fenêtre 7j → charge aiguë calculée à 0 → alerte "sous-charge" déclenchée pile quand tu sors d'un épisode de toux (12 avril). L'app te pousse à charger au pire moment.
3. **Tu importes 4 signaux Whoop sur 20+ disponibles.** `scripts/whoop.js` ne lit que `recovery_score`, `hrv_morning`, `sleep_hours`, `sleep_quality`. Les CSV contiennent en plus : RHR matinale, température cutanée, SpO2, fréquence respiratoire, efficacité sommeil, régularité sommeil, dette sommeil, durée sommeil profond, durée REM, strain journalier Whoop, zones FC par séance, et les colonnes du journal (alcool, caféine, stress, blessure). Sans ces signaux, **10 des 13 insights physiologiques et 12 des 15 insights statistiques identifiés sont impossibles à livrer.**

### Les patterns propres à toi (à implémenter comme détecteurs)

**Rythme biologique :**
- Ta HRV a une saisonnalité nette : pic oct (39 ms) → creux déc (30 ms), −23 %. Tu dois comparer ta HRV au **toi de la même saison**, pas à un niveau absolu.
- Sommeil profond en dérive : −7 % sur 7 mois (116 min → 108 min). REM suit. Le ratio reste stable, la quantité absolue baisse.
- Fréquence respiratoire nocturne ultra-stable (σ = 0.42 rpm). Chaque écart ≥ 0.8 rpm est un événement rare → biomarqueur silencieux très utile.

**Architecture de tes semaines :**
- Le weekend casse ta semaine, pas le lundi. Recovery : Sam 57 % / Dim 63 % / Lun 60 %. Ton coucher samedi varie de ±1h43 (vs ±0h43 les autres jours). Sommeil profond dimanche chute de 18 % les soirs après alcool.
- Ta longue bascule systématiquement au dimanche, entamée après ta pire nuit de la semaine. Ton lundi à 32.2 ms de HRV moyenne (vs 35.4 mardi/mercredi) est une **dette accumulée**, pas un blues du lundi.
- **Fenêtre optimale pour tes séances dures : mardi–mercredi.**

**Dose-réponse :**
- Tes longues Z1–Z2 vélo ≥ 2 h te coûtent **plus** que tes intensités courtes. ΔHRV lendemain : −6 ms sur longues, **0 ms sur intensités brèves**. Le strain Whoop et ton ressenti te trompent là-dessus.
- Entre 8 et 15 de strain hebdo tu vis dans une "zone plate" : volume ne pilote pas la HRV. Ce qui la pilote : **la distribution des pics (séances ≥ 18) et les ramps brutaux**.
- Le strain(T) prédit la recovery(T+1) à r = −0.46, pas le jour même (r = −0.20). **Le bon moment pour décider d'une séance dure, c'est demain matin, pas ce soir.**

**Signature d'overload :**
- Un épisode détecté : **9–11 nov 2025**, course 2h28 strain 18.1 + vélo 6h14 strain 18.6 en 48h → HRV effondrée 41 → 22 ms en 5 jours, retour normal > 3 semaines. C'est **ton marqueur d'or** : deux séances strain ≥ 18 en 48h = bombe 3 semaines.
- 12 jours avec "flag autonomique composite" (HRV + RHR + RR + skin temp ≥ +1σ ensemble, 3 sur 4) → recovery moyenne 35/100 (vs baseline 64.5). Ce détecteur est **100 % précis rétroactivement** sur tes 196 jours.

**Comportement coach :**
- **Zéro natation en 16 mois.** Tu prépares un Ironman en duathlète. Risque course n°1.
- Polarisation bike 84 % Z1+Z2 / run 63 % Z1+Z2 : tu cours trop fort, tu roules juste. Sur 27 runs 30–60 min, **33 % sont dominés par Z3+**. Ce sont les séances "moyennes" qui te brûlent.
- ACWR pic à **5.69 la semaine du 16/02** (strain passe de 24 à 137 en 1 sem). Puis crashs (W11 à 122 min, W13 à 148 min) — tu coupes quand tu craques, pas avant.
- Tu t'es entraîné sur recovery rouge 8 fois sur 12. Le signal "fatigue aiguë ressentie" te stoppe, le signal "fatigue physiologique objective" non.
- Point fort caché : jamais deux séances strain ≥ 15 d'affilée en 16 mois. Ton autorégulation post-séance dure est bonne.

**Ce que tu peux apprendre de tes écarts :**
- HRV ↔ Recovery Whoop r = 0.77. Les 23 % de variance inexpliquée, c'est de l'info. Quand les deux divergent, l'écart te dit ce qui pilote ton état ce jour-là.
- Régularité du sommeil < 70 % → HRV 33.5 ms. Régularité > 80 % → HRV 35.0 ms. **+1.5 ms gratuit** juste en te couchant à heure cohérente. Levier le plus accessible et pas dans ton scoring actuel.
- Sweet spot sommeil : **6h30–8h**. Au-dessus, ta HRV redescend (probablement sommeil fragmenté de rattrapage).
- Tes siestes sont efficaces : 6 sur 8 suivent un crash recovery, captent en moyenne > 50 % de sommeil profond. À formaliser comme stratégie.

---

## 3 — P0 BIS : prérequis bloquants (à faire avant P7)

### 3.1 — Réparer la baseline HRV (30 min)

Dans `js/scoring.js`, remplacer le bloc `hrv_morning: { baseline: 60, sigma: 8 }` par un calcul individualisé :

```js
function rollingBaseline(signal, observations, windowDays = 28) {
  const now = Date.now();
  const windowMs = windowDays * 86400 * 1000;
  const recent = observations
    .filter(o => o.signal_id === signal && (now - o.timestamp) < windowMs)
    .map(o => o.raw_value)
    .sort((a, b) => a - b);
  if (recent.length < 7) return null; // pas assez de data
  const median = recent[Math.floor(recent.length / 2)];
  const absDev = recent.map(v => Math.abs(v - median)).sort((a, b) => a - b);
  const mad = absDev[Math.floor(absDev.length / 2)];
  const sigma = 1.4826 * mad; // MAD → sigma estimate
  return { baseline: median, sigma: Math.max(sigma, 1) };
}
```

Persister dans `localStorage` sous `coach-ia:baselines` et recalculer à chaque ingest de data. Exposer dans un tooltip "Pourquoi ce score ?" la baseline utilisée pour chaque signal.

### 3.2 — Réparer l'ACWR silencieux (1h)

Dans `scripts/sync.js`, la fenêtre 7j de charge aiguë rate quand la dernière activité est > 7 jours. Deux corrections :
- Logger un warning clair quand `chargeAigue === 0` avec un gap d'inactivité : "Tu n'as pas d'activité Strava des 7 derniers jours. Statut indéterminé." (pas "sous-charge")
- Croiser avec Whoop : si la dernière activité est > 7j ET le journal/skin temp/RR indique maladie → bloquer toute alerte de charge et afficher "Phase de récupération post-événement : aucune recommandation d'intensité."

### 3.3 — Élargir l'ingestion Whoop (2-3 h)

Dans `scripts/whoop.js`, ajouter l'extraction des colonnes suivantes (ordre de priorité) :

| Colonne CSV | Nouveau signal_id | Pourquoi critique |
|---|---|---|
| `Fréquence cardiaque au repos (bpm)` | `rhr_morning` | Miroir HRV (r=-0.81), garde-fou qualité |
| `Fréquence respiratoire (tr/min)` | `respiratory_rate` | Biomarqueur silencieux, radar maladie |
| `Température cutanée (Celsius)` | `skin_temp` | Radar maladie + saisonnier |
| `Effort du jour` | `daily_strain` | Remplace l'ACWR Strava (meilleur signal) |
| `Durée du sommeil profond (min)` | `deep_sleep_min` | Prédit HRV (r=+0.29), durée totale ne prédit rien |
| `Durée du sommeil paradoxal (REM) (min)` | `rem_sleep_min` | Tendance long-terme |
| `Régularité du sommeil %` | `sleep_regularity` | Levier le plus accessible (+1.5 ms HRV) |
| `Efficacité du sommeil %` | `sleep_efficiency` | Garde-fou qualité |
| `Dette de sommeil (min)` | `sleep_debt` | Pour pattern weekend |
| `Niveau d'oxygène %` | `spo2` | Radar altitude / respiratoire |
| `Heure de début du sommeil` | `bedtime` | Pour régularité coucher samedi |
| `Heure de fin du sommeil` | `wake_time` | Pour coût séances matinales |

Ajouter aussi dans `parseEntraînements` (nouveau) les zones FC par séance Whoop (`% Zone 0/1/2/3/4/5`) pour pouvoir classifier les clusters d'intensité sans dépendre des streams Strava.

### 3.4 — Élargir l'ingestion journal (1 h)

Dans `journal_entries.csv`, aujourd'hui seules "blessure" et "protéines" sont lues. Ajouter au minimum :
- `alcohol_yes` (avec dose si dispo)
- `caffeine_after_X` (pour impact sur sommeil profond)
- `stress_yes` ou niveau de stress
- `travel_yes` (change la référence circadienne)
- Notes libres texte → stockées mais pas analysées pour l'instant

Ces champs alimentent les **confounders** des détecteurs (ex : un crash HRV après soirée alcool n'est pas un signal d'overload).

### 3.5 — Ajouter l'endpoint Strava streams (2 h, optionnel mais puissant)

Dans `scripts/strava.js`, ajouter `fetchActivityStreams(id, keys)` pour `/activities/{id}/streams?keys=heartrate,watts,velocity_smooth,time`. Ne pas l'appeler sur toutes les 333 activités d'un coup : seulement les sorties ≥ 60 min à partir de maintenant, et un backfill progressif en tâche de fond. Sans les streams tu peux déjà livrer 80 % de P7.

**Valider avec Clément/Benoît après 3.1–3.4 avant de passer à P7.**

---

## 4 — P7 : L'Archive Hebdomadaire

Nouvelle page ou section dans `index.html` (ou `archive.html` en nouvelle page si tu préfères isoler). Accessible depuis un onglet "Mes Semaines" dans la navigation principale.

### 4.1 — Layout général

```
┌─────────────────────────────────────────────────────────────┐
│ [← Sem 14]   Semaine du 7 au 13 avril 2026 (S15)  [Sem 16 →]│  ← Header nav
│                                                               │
│  🧭 Mini-timeline (toutes les semaines, cliquables)           │
│  ▁▂▃▅▇▅▃▂▃▅▇▆▅▄▆▇▅▃▂▁▂▃▅█▆▄▃▂▃▅▆▇▇▅...                     │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  [ GESTALT — 1 bandeau ]                                      │
│                                                               │
│   🏷 Signature dominante : "Build Z2 + Choc immunitaire"      │
│                                                               │
│   ◯ Recovery moy 58%   ▇▇▇▆ Strain total 92   💤 Sommeil 7.1h │
│                                                               │
│   Δ vs S14 : -6pts recovery • +12 strain • = sommeil          │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  [ 7-DAY STRIP — 7 cartes jour ]                              │
│                                                               │
│  Lun  Mar  Mer  Jeu  Ven  Sam  Dim                            │
│  ◯    ◯    ◯    ◯    ◯    ◯    ◯     ← Recovery ring          │
│  72   68   75   61   58   34   45                             │
│                                                               │
│  ─    🏃   🚴   ─    ─    🚴    🏃    ← Strava activity chip   │
│       45m  2h35       90m  1h45                               │
│       Z2  Z2/Z3       Z3   Z3/Z4                              │
│                                                               │
│  ▇▇▇ ▇▇▇▇ ▇▇▇▇ ▇▇▇ ▇▇▇ ▇▇  ▇▇▇      ← Sleep stages bar        │
│  7.5 7.8  7.2  7.1 6.8 5.9 7.4                                │
│                                                               │
│       🏆              ⚠     ⚠                                  │
│  (markers : breakthrough, outlier, recurrence, illness flag)  │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  [ 3 VOIX ]                                                   │
│                                                               │
│  🫀 Lecture physiologique                                      │
│     • Ta HRV a plongé samedi-dimanche (28 ms, -1.3σ).         │
│       Skin temp +1.4σ + RR +1.1σ → 3/4 signaux autonomiques   │
│       au-dessus du seuil. Pattern "pré-infection" déclenché   │
│       (12 épisodes historiques, recovery moyenne 35/100).     │
│     • Deep sleep samedi à 62 min (base 103). Probable dette.  │
│                                                               │
│  🧭 Œil du coach                                               │
│     • Tu as fait ta longue vélo le dimanche (1h45, 52% Z3).   │
│       Sur tes 45 longues, 19 sortent de Z2 dominante.         │
│       Si tu visais un stimulus aérobie, raté.                 │
│     • Zéro natation cette semaine (26e semaine consécutive).  │
│       IM Nice dans 10 semaines.                               │
│                                                               │
│  📊 Signal statistique                                         │
│     • ACWR semaine 1.42 (zone risque). Pic strain sam = 18.2. │
│       Cf 9-11 nov 2025 : 2 strain≥18 en 48h → 3 sem de HRV-.  │
│     • Cette semaine ressemble à S-2025-45 (mêmes signatures   │
│       charge + autonome). La fois d'avant : pause forcée 6j.  │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  [ ALARMES DÉCLENCHÉES CETTE SEMAINE ]                        │
│                                                               │
│  ⚠ Sam 12/04 — Flag autonomique composite (3/4 signaux)       │
│    Contexte sauvegardé. Résolution : suivie 48h après.        │
│    [Voir historique des alertes]                              │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  [ SEMAINES QUI TE RESSEMBLENT ]                              │
│                                                               │
│  📆 S-2025-45 (3-9 nov) — signature proche                    │
│  📆 S-2026-06 (2-8 fév) — signature proche                    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### 4.2 — Détails de chaque bloc

#### Header nav

- Flèches `← →` pour navigation linéaire
- Clic sur le label de date → sélecteur rapide (8 dernières semaines + recherche par n° sem)
- URL deeplink : `#archive?week=2026-W15` (permalien, bookmarkable)
- La **mini-timeline** en haut affiche TOUTES les semaines depuis le début du Whoop (sept 2025). Chaque semaine = barre verticale, hauteur = strain cumulé, couleur = recovery moyenne (vert > 67 / jaune 34-67 / rouge < 34). Cliquer = jump. Hover = tooltip rapide (signature + 3 chiffres clés).

#### Gestalt (bandeau en haut)

- **Signature dominante** : texte court généré automatiquement depuis un moteur de règles (cf. 5.1). Examples de signatures possibles : "Build Z2", "Charge brute", "Décharge", "Overreach confirmé", "Tapering", "Choc immunitaire", "Sous-charge subie", "Rebond", "Rythme de croisière".
- **Anneau recovery** (style Whoop) : moyenne hebdo, gradient de couleur.
- **Bar strain** : somme des strains quotidiens Whoop (pas Strava suffer_score), couleur graduée 0-21.
- **Chiffre sommeil** : durée moyenne + icône architecture (mini-bar avec stades).
- **Delta vs N-1** : 3 valeurs clés (recovery, strain, sommeil), avec flèche ↑↓= et % ou valeur absolue.
- **Ne jamais** afficher plus de 6 chiffres dans le gestalt. Priorité à la lisibilité scanable en 3 secondes.

#### 7-day strip

- 7 cartes verticales de largeur égale.
- Chaque carte empile : ring recovery → chip activité → bar sommeil stagé.
- **Chip activité** : icône type (🏃🚴🏊💪), durée, distance si pertinent, badge de zone dominante (Z2, Z3/Z4, HIT). Si plusieurs activités dans la journée → mini-liste verticale.
- **Bar sommeil** : 3 stacks de couleurs (deep / REM / light), hauteur = durée totale, largeur proportionnelle aux stages. Au-dessus, la durée en texte.
- **Markers overlay** au-dessus du bloc jour (petites icônes avec tooltip au hover) :
  - 🏆 Breakthrough (HRV > baseline + 1.5σ, ou PR Strava, ou zone nouvelle atteinte)
  - ⚠ Outlier (strain ≥ 18, recovery ≤ 34, HR drift > 10 %, durée sommeil < 6h)
  - 🔁 Récurrence (pattern identique détecté dans l'historique)
  - 🌡 Précurseur infection (flag autonomique composite ≥ 3/4)
  - 🧠 Point de décision (séance dure planifiée sur recovery rouge, conflit observé)
  - 🎉 Événement (course, fait saillant du journal)
- Clic sur une carte jour → ouvre le **drill-down jour** en side panel.

#### 3 voix

Trois blocs distincts, visuellement différenciés (accent teal / coral / violet), chacun avec son icône. Chaque bloc :
- **2-3 bullets max** (jamais plus — sinon ça devient du bruit).
- **Chiffres précis** de CETTE semaine, jamais d'affirmations génériques.
- **Règles déterministes** : chaque bullet est générée par un détecteur avec des conditions claires (cf. 5.2). Aucun appel LLM.
- **Ton** : constat + contextualisation historique, pas d'injonction. L'IA miroir.

#### Alarmes

- Pour chaque alarme déclenchée dans la semaine (flag composite, ACWR, drift HR, breakthrough, etc.), afficher :
  - Date + heure
  - Type + sévérité
  - Valeurs qui ont trigger + contexte 7j avant
  - Résolution (si calculée a posteriori — 48-72h après)
  - Lien vers l'historique complet des alarmes de même type

#### Semaines qui te ressemblent

- Pour chaque semaine affichée, calculer les 2-3 semaines historiques les plus similaires par signature (cf. 5.3) et les afficher en cartes cliquables.
- Clic → jump vers cette semaine. C'est ce qui permet à Benoît de remonter le fil naturellement : "ah, cette semaine je l'ai déjà vécue en novembre, voyons ce que j'en avais tiré."

### 4.3 — Drill-down jour (side panel ou modal)

Quand on clique sur une carte jour dans le strip, ouvrir un panneau avec :

```
┌──────────────────────────────────────────┐
│ Samedi 12 avril 2026                [×]  │
├──────────────────────────────────────────┤
│                                           │
│ [ WHOOP 24H ]                             │
│  • Strain curve (ligne courbe heure/heure)│
│  • HR continu (24h)                       │
│  • Stages sommeil détaillés (hypnogramme) │
│  • Snapshot recovery du matin             │
│                                           │
├──────────────────────────────────────────┤
│                                           │
│ [ MÉTRIQUES DU JOUR ]                     │
│  HRV       28 ms  (z=-1.3 vs base 34.1)   │
│  RHR       62     (z=+1.1)                │
│  RR        16.9   (z=+1.5)                │
│  Skin      35.0°C (z=+1.4)                │
│  Sommeil   6h12   (dont deep 62min)       │
│  Strain    18.2                           │
│                                           │
│  🌡 Flag autonomique : 3/4 signaux > +1σ   │
│                                           │
├──────────────────────────────────────────┤
│                                           │
│ [ STRAVA — Sortie vélo 10h15 ]            │
│  🚴 1h45 • 42.3 km • 850m D+              │
│  • Carte + parcours                       │
│  • Splits par km                          │
│  • HR + puissance (si dispo)              │
│  • Zones FC : Z2 22% / Z3 48% / Z4 27%    │
│  • Drift HR : +6% (pacing ok)             │
│                                           │
├──────────────────────────────────────────┤
│                                           │
│ [ JOURNAL ]                               │
│  "Un peu crevé, allure normale"           │
│  ☑ alcool (2 verres veille)               │
│  ☑ stress (projet pro)                    │
│                                           │
├──────────────────────────────────────────┤
│                                           │
│ [ JOURS SIMILAIRES DANS TON HISTOIRE ]    │
│  🔁 9 nov 2025 (overload signature)       │
│  🔁 17 jan 2026 (flag composite)          │
│                                           │
└──────────────────────────────────────────┘
```

---

## 5 — Moteurs déterministes (le cerveau de P7)

### 5.1 — Moteur de signature hebdomadaire

Pour chaque semaine, calculer des **métriques clés** puis matcher avec un **arbre de règles** pour attribuer une signature dominante :

```js
function computeWeekSignature(weekData) {
  const { strainTotal, recoveryAvg, sleepAvg, loadByZone, hrvTrend, acwr, flagCount, incidents } = weekData;

  // Cas d'exception prioritaires
  if (incidents.includes("illness")) return "Choc immunitaire";
  if (incidents.includes("race"))    return "Compétition";
  if (flagCount >= 3)                return "Décrochage autonome";

  // Arbre principal
  if (acwr > 1.5 && recoveryAvg < 45) return "Overreach confirmé";
  if (acwr > 1.5)                     return "Charge brute";
  if (acwr < 0.7)                     return "Décharge" + (recoveryAvg > 60 ? " planifiée" : " subie");
  if (loadByZone.polarized && strainTotal > median)  return "Polarisé";
  if (loadByZone.threshold > 0.35)                   return "Seuil-dominant";
  if (loadByZone.z1z2 > 0.85 && strainTotal > median) return "Build Z2";
  if (hrvTrend > 0 && recoveryAvg > 65)              return "Rebond";
  return "Rythme de croisière";
}
```

Toutes les signatures ont une définition formelle. Jamais de signature inventée à la volée. La liste complète est extensible (une 15aine pour commencer, documentées dans `js/signatures.js`).

### 5.2 — Moteur 3-voix

Chaque voix a son **catalogue de détecteurs** (chaque détecteur = règle de déclenchement + template de phrase avec variables). Structure :

```js
const DETECTORS_PHYSIO = [
  {
    id: "autonomic_composite_flag",
    condition: (week) => week.flagCount >= 3,
    template: (w) => `Flag autonomique ${w.flagCount}/4 signaux ≥ +1σ (${w.flagDetails}). Pattern pré-infection déclenché (${w.historicalCount} épisodes historiques, recovery moyenne ${w.historicalRecovery}/100).`,
    severity: "alert"
  },
  {
    id: "deep_sleep_deficit",
    condition: (week) => week.deepSleepAvg < (week.deepSleepBaseline - week.deepSleepMAD),
    template: (w) => `Sommeil profond moyen ${w.deepSleepAvg} min (base ${w.deepSleepBaseline}). −${w.deepSleepDelta}% sous ta médiane.`,
    severity: "info"
  },
  // ... 10-15 détecteurs par voix
];
```

Chaque voix publie **au max 3 bullets par semaine** (les 3 détecteurs de plus forte sévérité). Si zéro détecteur trigger, afficher "Rien de saillant cette semaine — tes signaux sont dans ta zone de croisière."

Règle d'or : **un bullet doit toujours contenir au moins un chiffre de la semaine ET une référence à une baseline personnelle**. Jamais de "tu dois", "tu devrais", "fais attention à". Constat, pas prescription.

### 5.3 — Moteur "semaines qui se ressemblent"

Calculer pour chaque semaine un **vecteur de signature** (standardisé) :
- strain_total (z)
- recovery_avg (z)
- sleep_avg (z)
- polarization_ratio (z1z2 vs z3+)
- hrv_trend (slope)
- acwr
- flag_count

Distance L2 entre vecteurs → afficher les 3 semaines les plus proches (hors la semaine elle-même et ses voisines immédiates). Storage : une matrice de similarité pré-calculée à chaque run de backfill.

### 5.4 — Moteur d'alarmes avec mémoire

Chaque alarme déclenchée (cf. catalogue en 9) est persistée avec :

```js
{
  triggered_at: "2026-04-12T07:30:00Z",
  week_id: "2026-W15",
  type: "autonomic_composite",
  severity: "alert",
  trigger_values: { hrv_z: -1.3, rhr_z: 1.1, rr_z: 1.5, skin_z: 1.4 },
  context_snapshot: {
    last_7d_strain: 92,
    last_7d_sleep_avg: 7.1,
    recent_sessions: [...],
    journal_flags: ["alcohol", "stress"]
  },
  resolution: null,      // rempli 48-72h après
  user_action: null      // si Benoît interagit
}
```

Stockage dans `window.HISTORY.alarms` (cf. 6). La résolution est calculée automatiquement par le job de backfill incrémental :
- "Flag retombé à 0/4 en 48h — signal transitoire"
- "Flag resté ≥ 2/4 pendant 4 jours — épisode prolongé, confirmé par recovery moyenne 31/100 sur la période"
- "Flag suivi d'un crash de 5 jours avec pause forcée"

### 5.5 — Moteur de pattern recognition

Quand une nouvelle alarme se déclenche, chercher dans l'historique les précédentes de même type et surfacer :

> "Cette alerte s'est déjà déclenchée 3 fois : 13 oct, 17 jan, 6 mars. À chaque fois, la résolution a pris entre 2 et 6 jours et a coïncidé avec une réduction de charge de 40-60 %. [Voir l'historique]"

Idem pour les signatures de semaine : "Cette semaine matche S-2025-45 (signature 'Overreach confirmé'). La fois d'avant : pause forcée 6 jours, retour progressif sur 10 jours."

---

## 6 — Moteur de backfill historique (prérequis à tout)

Créer `scripts/backfill.js` qui génère `js/history.js` avec :

```js
window.HISTORY = {
  meta: {
    generated_at: "...",
    first_date: "2025-09-23",
    last_date: "2026-04-15",
    total_days: 196,
    total_sessions: 333,
    total_weeks: 29
  },
  daily: [
    { date: "...", hrv: ..., rhr: ..., rr: ..., skin: ..., recovery: ...,
      sleep: { total_h, deep_min, rem_min, light_min, efficiency, regularity, debt, bedtime, wake_time },
      strain_whoop: ..., strain_strava: ...,
      activities: [{ source: "strava"|"whoop", type, duration_min, zones, rpe, ... }],
      journal: { alcohol, caffeine, stress, injury, notes },
      composite_flag: { count: 3, details: {...} },
      baselines: { hrv: {median, sigma}, rhr: {...}, ... }  // baselines rolling 28j calculées pour ce jour
    },
    // 196 entrées
  ],
  weeks: [
    { id: "2026-W15", start_date: "...", end_date: "...",
      signature: "Build Z2",
      metrics: { recovery_avg, strain_total, sleep_avg, hrv_avg, hrv_trend, acwr, flag_count, polarization_ratio },
      voices: {
        physio: [ { id: "...", text: "...", severity: "..." }, ... ],
        coach:  [ ... ],
        data:   [ ... ]
      },
      events: [ { type: "breakthrough"|"outlier"|"recurrence"|"illness"|"race", date, context } ],
      similar_weeks: [ "2025-W45", "2026-W06" ]  // pré-calculé
    }
  ],
  alarms: [
    { triggered_at, week_id, type, severity, trigger_values, context_snapshot, resolution, user_action }
  ],
  session_responses: [
    { strava_id, date, stimulus: { type, duration, zones, strain }, response_48h: { hrv_delta, recovery_delta, ... }, cluster: "endurance"|"tempo"|"hit" }
  ],
  similarity_matrix: {
    // Map<week_id, { week_id, distance }[]>  — top 5 voisins par semaine
  }
};
```

### Règles du backfill

- **Causal** : quand tu calcules pour un jour J, n'utilise QUE la data ≤ J. Pas de leak du futur.
- **Idempotent** : même input → même output. Si tu relances, pas de duplication.
- **Incrémental** : en mode normal, ne recalcule que les jours manquants. Mode `--full-rebuild` pour tout refaire.
- **Performant** : doit se charger en < 2s même pour 2 ans de data. Si trop lourd, chunker par trimestre (`history-2025-Q4.js`, etc.) et charger à la demande selon la semaine affichée.
- **Validé** : après génération, faire tourner un sanity check qui vérifie que la semaine courante calculée correspond à ce que l'app affiche actuellement dans le dashboard. Tolérance < 2 %.

### Narratif des voix pendant le backfill

Les bullets des 3 voix sont générés **pendant le backfill** (pas au moment de l'affichage) via les détecteurs de 5.2. C'est donc du pur JS déterministe qui tourne sur la donnée. Un fichier `js/detectors.js` contient tous les détecteurs (≥ 30 au total, 10+ par voix). Documentation inline obligatoire.

---

## 7 — Catalogue des insights → surfaces UI

Table de correspondance entre les insights identifiés et leur lieu d'affichage :

| # | Insight | Signaux | Surface principale | Alarme ? |
|---|---------|---------|---------------------|----------|
| I01 | HRV saisonnière, baseline mensuelle | hrv_morning | Physio voice + tooltip dashboard | — |
| I02 | Longues Z1-Z2 coûtent + que intensités courtes | strain + hrv J+1 | Physio voice + fiche session drill-down | — |
| I03 | Radar maladie précoce J-6 à J-8 | skin_temp + RR + recovery | Alarme composite + marker 🌡 | ✓ |
| I04 | Weekend casse la semaine | recovery par DOW | Coach voice + P5 "ton point faible hebdo" | — |
| I05 | Sweet spot sommeil 6h30-8h | sleep_hours + hrv | Data voice (tooltip P6) | — |
| I06 | RR ultra-stable = biomarqueur | respiratory_rate | Alarme z > 1.5 + data voice | ✓ |
| I07 | Surmenage parasympathique = 5-7j récup | hrv streaks | Phase "J+N fragile" après déclenchement | ✓ |
| I08 | Régularité coucher samedi | bedtime | Coach voice + sparkline P5 | — |
| I09 | Séances matinales <7h30 coûtent | wake_time + ΔRecovery | Info fiche session, pas alarme | — |
| I10 | Skin temp sous-utilisé | skin_temp | Alarme z > 1.5 + tile dashboard | ✓ |
| I11 | Écart HRV/Recovery = info | hrv + recovery | Tooltip dashboard quand |Δz| > 0.8 | — |
| I12 | SWS -7% sur 7 mois | deep_sleep_min | P6 Chronique courbe longue | — |
| I13 | Siestes stratégiques | naps + recovery précédente | Suggestion dashboard post-crash | — |
| I14 | Zéro natation (urgence course) | activity.type | Bannière permanente tant que count 60j = 0 | ✓ |
| I15 | Polarisation bike vs run | zones par séance | Coach voice + P5 carte "ton profil" | — |
| I16 | Longues non-aérobie | zones par séance ≥ 60min | Flag fiche session post-séance | — |
| I17 | ACWR dent-de-scie et pic 5.69 | strain_whoop 7j rolling | Alarme ACWR > 1.5 + P6 Chronique | ✓ |
| I18 | Gaps ≥ 4j : crash vs décharge | activity dates + contexte | Marker 📉 P6 Chronique | — |
| I19 | Entraîne sur rouge (override) | recovery + session same-day | Coach voice + compteur sparkline | — |
| I20 | HRV dérive -9ms 7 mois | hrv_morning régression | Alarme tendance longue + dashboard | ✓ |
| I21 | Longues bike perdent Z2 | zones ride > 90min | Alerte "tes longues ont perdu leur stimulus" | — |
| I22 | Basculement implicite run→bike | volume par sport | P5 "ta balance disciplines" | — |
| I23 | Pas 2 séances dures d'affilée (✓) | strain successifs | **Badge positif** dashboard "ton point fort" | — |
| I24 | Aucun brick IM structuré | activités enchaînées | Coach voice si près de course | — |
| I25 | Bug alerte sous-charge pendant maladie | charge=0 + illness | **FIX bloquant (3.2)** | ✓ |
| I26 | Scoring HRV baseline cassée | scoring.js | **FIX bloquant (3.1)** | — |
| I27 | HRV↔RHR miroir (r=-0.81) | hrv + rhr | Garde-fou qualité data (alerte divergence) | — |
| I28 | Strain(T) prédit recovery(T+1) | strain + recovery | Dashboard "ta fenêtre de décision demain" | — |
| I29 | Overload signature 2×strain≥18 en 48h | strain par séance | Alarme immédiate post-séance | ✓ |
| I30 | Deep sleep prédit HRV (r=+0.29) | deep_sleep | Physio voice + P6 | — |
| I31 | Régularité sommeil +1.5ms HRV | sleep_regularity | Coach voice + P5 | — |
| I32 | ACWR < strain brut 7j | daily_strain | Data voice — remplacer signal principal | — |
| I33 | Composite autonomic flag 12/12 true positive | 4 signaux z | Alarme I03 (déjà listée) | ✓ |
| I34 | Clusters séances (course variée / vélo plat) | zones par sport | P6 Chronique + coach voice | — |
| I35 | Ramp +100% en 1 semaine | strain hebdo | Alarme si strain(S) > 1.8 × strain(S-2) | ✓ |

---

## 8 — Règles non-négociables

1. **Aucun appel LLM au runtime.** Tout est déterministe, calculé côté browser depuis `window.HISTORY`.
2. **Les 3 voix ne donnent JAMAIS de conseil.** Constat + contexte historique + chiffres. Pas "tu devrais", pas "attention à", pas "il faudrait".
3. **Pas de nouvelle page/onglet pour les insights historiques** sauf "Mes Semaines". Tout le reste s'intègre dans les features existantes (dashboard, P5, P6, fiches session).
4. **Tout nouveau détecteur doit être testable** : prendre un jour ou une semaine historique connue, vérifier que la détection produit le résultat attendu. Fichier `tests/detectors.test.js` (simple asserts, pas de framework).
5. **Toute métrique doit être calculable pour n'importe quel jour passé.** Causal, pas de leak du futur. Si un signal manque pour un jour, `null` + fallback visuel explicite ("— donnée manquante"), jamais de valeur fantôme.
6. **Aucun push git sans validation de Clément/Benoît.**
7. **Aucune dépendance npm ajoutée.** On reste sur le stack vanilla (HTML + Tailwind CDN + JS). Si tu as besoin d'une courbe, utilise `<canvas>` ou `<svg>` à la main, pas de Chart.js.
8. **Le fichier `js/history.js` peut peser jusqu'à ~5 Mo.** Au-delà, chunker par trimestre et lazy-loader selon la semaine affichée.
9. **Toutes les couleurs viennent de la palette existante** (voir CLAUDE.md). Pas de nouvelle couleur inventée. Accents : teal (voix physio), coral (voix coach), violet (voix data).
10. **Lisibilité > densité.** Un bon bloc de 3 voix doit se lire en 20 secondes. Si un bullet fait plus de 2 lignes à l'écran, il est trop long.

---

## 9 — Ordre d'implémentation

**Phase A — Fixes et ingest (prérequis) — 1 à 2 jours**
1. Fix scoring HRV baseline (§3.1)
2. Fix ACWR silencieux + alerte maladie (§3.2)
3. Élargir `scripts/whoop.js` — 12 nouvelles colonnes (§3.3)
4. Élargir journal ingest (§3.4)
5. (optionnel) Streams Strava endpoint (§3.5)

**→ Validation avec Clément/Benoît. Vérifier que `observations-whoop.js` et `observations-strava.js` contiennent maintenant >= 15 signaux. Vérifier que `window.ATHLETES.benoit.forme.hrv` a un score non-zéro.**

**Phase B — Backfill engine — 2 à 3 jours**
6. `scripts/backfill.js` qui produit `js/history.js` avec `daily[]` + baselines rolling 28j
7. Extension du backfill pour calculer `weeks[]` + signatures (§5.1)
8. Détecteurs des 3 voix (§5.2) — viser 10 détecteurs par voix
9. Alarmes + mémoire (§5.4) + résolution automatique des alarmes passées

**→ Validation : ouvrir une console browser, `window.HISTORY.weeks.length` doit être ~29. Vérifier 3-4 semaines au hasard à la main.**

**Phase C — UI Archive — 3 à 4 jours**
10. Route/page "Mes Semaines" + header + mini-timeline
11. Gestalt bandeau
12. 7-day strip avec rings/chips/sleep bars + markers
13. Bloc 3 voix
14. Bloc alarmes
15. Side panel drill-down jour
16. Moteur "semaines similaires" (§5.3) + bloc correspondant

**→ Validation UI avec Clément : navigation fluide, 3 semaines aléatoires inspectées, gestalt lisible en 3s.**

**Phase D — Integration cross-features — 1 à 2 jours**
17. P6 Chronique étendu (couches event + annotations auto I18, I20, I22, I34)
18. Patterns retro sur alarmes (§5.5)
19. Badges positifs dashboard (I23, et autres renforçateurs)
20. Changelog dans `CLAUDE.md`

---

## 10 — Livrables

- `scripts/backfill.js` + `scripts/whoop.js` (étendu) + `scripts/strava.js` (étendu optionnel)
- `js/history.js` (généré, gitignore si > 1 Mo)
- `js/detectors.js` (catalogue des détecteurs 3-voix)
- `js/signatures.js` (catalogue des signatures hebdo)
- `js/alarm-memory.js` (gestion persistence + résolution)
- `js/archive.js` (logique UI Mes Semaines)
- `archive.html` ou section dans `index.html`
- `css/archive.css` (styles spécifiques)
- `tests/detectors.test.js` (asserts minimaux)
- `CLAUDE.md` mis à jour avec section "Historique des features"

---

## 11 — Ce que Benoît pourra faire avec P7 qu'il ne peut pas aujourd'hui

- Remonter n'importe quelle semaine depuis septembre 2025 et voir sa signature dominante en 3 secondes.
- Comparer deux semaines visuellement (N vs N-4 vs même semaine de l'an passé quand il aura 1 an de recul).
- Identifier dans son historique **les 3 semaines qui ressemblent le plus** à celle qu'il vit actuellement — et voir ce qui s'y est passé ensuite.
- Consulter l'historique de chaque alarme avec ses résolutions ("ce flag a trigger 3 fois, à chaque fois ça s'est résolu en X jours avec Y").
- Voir évoluer les 3 voix dans le temps : "ma voix physio a changé de discours entre janvier et avril, je suis rentré en phase X".
- Drill-down sur n'importe quelle journée, avec le contexte complet Whoop × Strava × journal d'un coup.
- Repérer les **breakthrough** dans son historique (pas seulement les problèmes).
- Apprendre sa propre physiologie : baselines saisonnières, dose-réponse perso, signature d'overload, fenêtres de décision optimale.

**Test de succès** : si dans 3 mois Benoît peut pointer sur son app et dire "voilà, ça c'est moi quand je suis en forme, et ça c'est moi quand je pars en vrille", on a réussi. Si l'app reste un tableau de bord qui lui dit "aujourd'hui tu es jaune", on a raté.
