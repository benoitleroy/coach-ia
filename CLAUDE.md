# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet

Coach IA 2030 — plateforme de coaching sportif triathlon/endurance avec données réelles.
Propriétaire : Benoît Leroy (débutant complet en code — toujours expliquer les actions, analogies concrètes, plan avant code).

## Stack

- HTML5 + Tailwind CSS (CDN) + JavaScript vanilla (browser)
- Node.js (scripts de sync uniquement — pas de serveur)
- Ouvrir dans un navigateur : `open index.html`
- Lancer un sync : double-clic sur `sync.command`

## Structure

```
index.html            → Dashboard athlète (page principale)
journal.html          → Journal du jour (ressentis, stress, sommeil)
vue360.html           → Vue 360° des 8 couches de données
historique.html       → Graphiques charge / HRV / disciplines
objectifs.html        → Objectifs de course et timeline
accueil.html          → Landing page

css/style.css         → Design system complet (palette, composants, animations)
js/data.js            → Données fictives des 3 athlètes (benoit, sophie, marc)
js/scoring.js         → Moteur de score : signaux → normalisation → score 0-100
js/dashboard.js       → Logique et rendu du dashboard
js/journal.js         → Logique du formulaire journal
js/chat.js            → Chat IA (réponses pré-écrites par mots-clés)
js/mobile-nav.js      → Navigation mobile (injecté dans toutes les pages app)

js/data-benoit.js          → AUTO-GÉNÉRÉ par sync.js (données Strava réelles)
js/observations-strava.js  → AUTO-GÉNÉRÉ par sync.js (signaux Strava pour scoring)
js/observations-whoop.js   → AUTO-GÉNÉRÉ par whoop.js (signaux Whoop pour scoring)

scripts/sync.js       → Orchestrateur : fetch Strava → écrit data-benoit.js + observations-strava.js
scripts/strava.js     → OAuth Strava + API client (getAccessToken, fetchRecentActivities)
scripts/whoop.js      → Import CSV Whoop → écrit observations-whoop.js
scripts/.env.local    → Clés API (gitignored) : STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET
scripts/.tokens.local → Tokens OAuth Strava (gitignored, auto-géré)

my_whoop_data_2026_04_16/  → Export CSV Whoop (physiological_cycles.csv, sommeil.csv, etc.)
sync.command          → Double-clic Finder → lance sync Strava + import Whoop
```

## Données réelles : flux complet

```
Strava API ──→ scripts/sync.js ──→ js/data-benoit.js       (charge, dernière séance)
                               └──→ js/observations-strava.js (acute_chronic_ratio, last_session_rpe)

Whoop CSV  ──→ scripts/whoop.js ──→ js/observations-whoop.js  (hrv, recovery, sleep)

index.html charge dans l'ordre :
  1. js/data.js             (données fictives — fallback)
  2. js/scoring.js          (moteur de score)
  3. js/data-benoit.js      (override Strava — absent = silencieux)
  4. js/observations-strava.js
  5. js/observations-whoop.js
  6. js/dashboard.js        (lit window.ATHLETES + window.WEARABLE_OBS)
```

## Moteur de score (scoring.js)

### Architecture

```
Signal (source brute)
  → normalize() → valeur 0–100
  → × recencyWeight (données récentes comptent plus)
  → × confidence (fiabilité de la source)
  → × attribution[layer] (quelle couche ce signal influence)
  → aggrégé en LayerScore (0–100 ou null si pas de données)
  → × LAYER_WEIGHTS → GlobalScore (0–100)
```

### 8 couches et leurs poids

| Couche | Poids | Signaux principaux |
|--------|-------|--------------------|
| sommeil | 20% | sleep_hours, sleep_quality, hrv_morning |
| charge | 20% | acute_chronic_ratio, last_session_rpe, hrv_morning |
| physiologique | 15% | recovery_score, hrv_morning |
| psychologique | 15% | training_motivation, mood, stress_pro, free_text_sentiment |
| biologique | 10% | recovery_score |
| ressentis | 10% | energy_level, pain_level, stress_perso, life_event |
| nutrition | 5% | (pas encore de signaux branchés) |
| génétique | 5% | (fixe — rarement modifié) |

### Ajouter un nouveau signal

1. **Définir le signal dans `js/scoring.js`** dans `window.SIGNALS` :

```js
mon_signal: {
  id: "mon_signal",
  label_fr: "Mon signal en français",
  category: "physical",          // physical | mental | training
  source: "device",              // device | form | free_text
  input: { type: "numeric", unit: "ms", min: 0, max: 200 },
  normalization: {
    type: "linear",              // voir types ci-dessous
    params: { min: 0, max: 100 },
  },
  attribution: { sommeil: 0.5, charge: 0.5 },  // doit sommer à 1.0
  temporal: { scope: "daily", recency_weight: "linear_decay_7d" },
  confidence: 0.85,              // 0–1, fiabilité de la source
},
```

2. **Types de normalisation disponibles** :

| Type | Usage | Params |
|------|-------|--------|
| `linear` | valeur dans un range → 0-100 | `{ min, max }` |
| `baseline` | écart à la moyenne perso (HRV) | `{ baseline, sigma }` |
| `scale_direct` | échelle 1-5 ou 1-10 | `{ min, max }` |
| `scale_inverted` | plus c'est haut, pire c'est (stress) | `{ min, max }` |
| `threshold_band` | zone optimale (ratio charge) | `{ low, high, falloff }` |
| `sentiment` | texte libre → positif/négatif | `{ positive_keywords, negative_keywords }` |

3. **Alimenter le signal** selon la source :

- **Formulaire journal** (`js/journal.js`) :
  ```js
  window.addObservation("mon_signal", valeur, "benoit", Date.now());
  ```

- **Script Node.js** (sync/whoop) → écrire dans `js/observations-xxx.js` :
  ```js
  window.WEARABLE_OBS = (window.WEARABLE_OBS || []).concat([
    { signal_id: "mon_signal", raw_value: 72, athlete_id: "benoit", timestamp: Date.now() }
  ]);
  ```

- **Charger le fichier** dans `index.html` après `scoring.js` :
  ```html
  <script src="js/observations-xxx.js" onerror="console.info('not yet generated')"></script>
  ```

### API publique scoring.js

```js
window.addObservation(signal_id, raw_value, athlete_id, timestamp)
window.computeLayerScores(athlete_id)   // → { sommeil: 68, charge: 73, ... }
window.computeFormeScore(athlete_id)    // → { score: 78, breakdown, layerScores }
window.explainScore(athlete_id)         // → { score, layers, top_signals, ... }
window.clearObservations()              // dev helper — vide le localStorage
```

## Palette

| Variable | Valeur | Rôle |
|----------|--------|------|
| bg-primary | #0F1117 | Fond principal |
| bg-card | #1A1D27 | Surface cartes |
| accent-violet | #6C63FF | Accent primaire |
| accent-teal | #00D4AA | Vitalité/récupération |
| accent-coral | #FF6B6B | Alertes/énergie |

## Philosophie UI

3 ruptures à faire transparaître visuellement :
- L'IA est un **miroir**, pas un prescripteur → langage de révélation, pas d'injonction
- L'athlète est **acteur** → comprend → décide → progresse
- Le coach est **augmenté**, jamais remplacé → l'humain reste au centre

Design : entre "cockpit de performance" et "espace de réflexion" — pas un dashboard Garmin froid.
