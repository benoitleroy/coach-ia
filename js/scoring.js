// =============================================================================
// SCORING.JS — Signal taxonomy & score computation engine
// Coach IA 2030
//
// Analogy (for Benoît): each "Signal" is a sensor in a house.
// Some sensors read temperature (HRV), others read smoke (stress).
// This file defines all sensors, how to read them, and how to combine
// them into one number: the forme.score (0–100).
// =============================================================================

// -----------------------------------------------------------------------------
// LAYER WEIGHTS — how much each of the 8 dimensions counts in the global score
// Must sum to 1.0
// -----------------------------------------------------------------------------
const LAYER_WEIGHTS = {
  sommeil:       0.20,  // sleep & recovery
  charge:        0.20,  // training load
  physiologique: 0.15,  // VO2max, thresholds, power
  psychologique: 0.15,  // resilience, motivation
  biologique:    0.10,  // age adaptations, hormones
  ressentis:     0.10,  // life stress, family, events
  nutrition:     0.05,  // fuel
  genetique:     0.05,  // fixed potential — rarely changes
};

// -----------------------------------------------------------------------------
// SIGNAL REGISTRY
// Each signal maps one measurable input to one or more layers.
// -----------------------------------------------------------------------------
window.SIGNALS = {

  // ── WEARABLE SIGNALS (Whoop) ─────────────────────────────────────────────

  hrv_morning: {
    id: "hrv_morning",
    label_fr: "HRV du matin",
    category: "physical",
    source: "device",
    input: { type: "numeric", unit: "ms", min: 0, max: 200 },
    normalization: {
      type: "baseline",
      // params.baseline & params.sigma are computed from the last 30 days
      // and updated by the sync script. Defaults used until then.
      params: { baseline: 60, sigma: 8 },
    },
    attribution: { sommeil: 0.5, charge: 0.5 },
    temporal: { scope: "point", recency_weight: "none" },
    confidence: 0.95,
  },

  sleep_hours: {
    id: "sleep_hours",
    label_fr: "Durée du sommeil",
    category: "physical",
    source: "device",
    input: { type: "numeric", unit: "h", min: 0, max: 12 },
    normalization: { type: "linear", params: { min: 4, max: 9 } },
    attribution: { sommeil: 1.0 },
    temporal: { scope: "daily", recency_weight: "none" },
    confidence: 0.95,
  },

  sleep_quality: {
    id: "sleep_quality",
    label_fr: "Qualité du sommeil (Whoop)",
    category: "physical",
    source: "device",
    input: { type: "numeric", unit: null, min: 0, max: 100 },
    normalization: { type: "linear", params: { min: 0, max: 100 } },
    attribution: { sommeil: 1.0 },
    temporal: { scope: "daily", recency_weight: "none" },
    confidence: 0.90,
  },

  recovery_score: {
    id: "recovery_score",
    label_fr: "Score de récupération Whoop",
    category: "physical",
    source: "device",
    input: { type: "numeric", unit: null, min: 0, max: 100 },
    normalization: { type: "linear", params: { min: 0, max: 100 } },
    // display_only: Whoop's recovery score is derived from HRV (among others).
    // Including it in scoring would double-count HRV. Kept as a visible
    // reference value (dashboard/explain) but excluded from layer aggregation.
    attribution: {},
    display_only: true,
    temporal: { scope: "daily", recency_weight: "none" },
    confidence: 0.90,
  },

  // ── WEARABLE SIGNALS — extension P0-BIS (§3.3) ──────────────────────────

  rhr_morning: {
    id: "rhr_morning",
    label_fr: "Fréquence cardiaque au repos",
    category: "physical",
    source: "device",
    input: { type: "numeric", unit: "bpm", min: 30, max: 90 },
    // Inverted baseline: low RHR = good → score 100 when raw < baseline − 1σ.
    // We invert by negating the z-score inside normalize (see "baseline_inverted").
    normalization: { type: "baseline_inverted", params: { baseline: 55, sigma: 4 } },
    attribution: { sommeil: 0.5, charge: 0.5 },
    temporal: { scope: "point", recency_weight: "none" },
    confidence: 0.90,
  },

  respiratory_rate: {
    id: "respiratory_rate",
    label_fr: "Fréquence respiratoire nocturne",
    category: "physical",
    source: "device",
    input: { type: "numeric", unit: "tr/min", min: 10, max: 25 },
    normalization: { type: "baseline", params: { baseline: 15, sigma: 0.5 } },
    attribution: {},
    display_only: true, // radar maladie — exploité par détecteurs, pas le score
    temporal: { scope: "point", recency_weight: "none" },
    confidence: 0.85,
  },

  skin_temp: {
    id: "skin_temp",
    label_fr: "Température cutanée",
    category: "physical",
    source: "device",
    input: { type: "numeric", unit: "°C", min: 30, max: 40 },
    normalization: { type: "baseline", params: { baseline: 34, sigma: 0.6 } },
    attribution: {},
    display_only: true,
    temporal: { scope: "point", recency_weight: "none" },
    confidence: 0.85,
  },

  spo2: {
    id: "spo2",
    label_fr: "Saturation O₂",
    category: "physical",
    source: "device",
    input: { type: "numeric", unit: "%", min: 85, max: 100 },
    normalization: { type: "linear", params: { min: 92, max: 99 } },
    attribution: {},
    display_only: true,
    temporal: { scope: "point", recency_weight: "none" },
    confidence: 0.70,
  },

  daily_strain: {
    id: "daily_strain",
    label_fr: "Strain journalier Whoop",
    category: "training",
    source: "device",
    input: { type: "numeric", unit: null, min: 0, max: 21 },
    normalization: { type: "linear", params: { min: 0, max: 21 } },
    attribution: {},
    display_only: true, // remplacera ACWR Strava quand validé
    temporal: { scope: "point", recency_weight: "none" },
    confidence: 0.85,
  },

  deep_sleep_min: {
    id: "deep_sleep_min",
    label_fr: "Sommeil profond",
    category: "physical",
    source: "device",
    input: { type: "numeric", unit: "min", min: 0, max: 180 },
    normalization: { type: "baseline", params: { baseline: 100, sigma: 20 } },
    attribution: { sommeil: 1.0 },
    temporal: { scope: "point", recency_weight: "none" },
    confidence: 0.80,
  },

  rem_sleep_min: {
    id: "rem_sleep_min",
    label_fr: "Sommeil paradoxal (REM)",
    category: "physical",
    source: "device",
    input: { type: "numeric", unit: "min", min: 0, max: 180 },
    normalization: { type: "baseline", params: { baseline: 90, sigma: 20 } },
    attribution: {},
    display_only: true,
    temporal: { scope: "point", recency_weight: "none" },
    confidence: 0.70,
  },

  sleep_efficiency: {
    id: "sleep_efficiency",
    label_fr: "Efficacité du sommeil",
    category: "physical",
    source: "device",
    input: { type: "numeric", unit: "%", min: 60, max: 100 },
    normalization: { type: "linear", params: { min: 75, max: 95 } },
    attribution: { sommeil: 1.0 },
    temporal: { scope: "point", recency_weight: "none" },
    confidence: 0.80,
  },

  sleep_regularity: {
    id: "sleep_regularity",
    label_fr: "Régularité du sommeil",
    category: "physical",
    source: "device",
    input: { type: "numeric", unit: "%", min: 40, max: 100 },
    normalization: { type: "linear", params: { min: 60, max: 90 } },
    attribution: { sommeil: 1.0 },
    temporal: { scope: "point", recency_weight: "none" },
    confidence: 0.80,
  },

  sleep_debt: {
    id: "sleep_debt",
    label_fr: "Dette de sommeil",
    category: "physical",
    source: "device",
    input: { type: "numeric", unit: "min", min: 0, max: 300 },
    normalization: { type: "linear", params: { min: 0, max: 120 } },
    attribution: {},
    display_only: true,
    temporal: { scope: "point", recency_weight: "none" },
    confidence: 0.80,
  },

  bedtime_minutes: {
    id: "bedtime_minutes",
    label_fr: "Heure de coucher",
    category: "physical",
    source: "device",
    input: { type: "numeric", unit: "minutes-since-midnight", min: 0, max: 1440 },
    normalization: { type: "linear", params: { min: 1260, max: 1440 } }, // 21h–minuit
    attribution: {},
    display_only: true,
    temporal: { scope: "point", recency_weight: "none" },
    confidence: 0.60,
  },

  wake_minutes: {
    id: "wake_minutes",
    label_fr: "Heure de réveil",
    category: "physical",
    source: "device",
    input: { type: "numeric", unit: "minutes-since-midnight", min: 0, max: 1440 },
    normalization: { type: "linear", params: { min: 300, max: 480 } }, // 5h–8h
    attribution: {},
    display_only: true,
    temporal: { scope: "point", recency_weight: "none" },
    confidence: 0.60,
  },

  session_strain: {
    id: "session_strain",
    label_fr: "Effort par séance (Whoop)",
    category: "training",
    source: "device",
    input: { type: "numeric", unit: null, min: 0, max: 21 },
    normalization: { type: "linear", params: { min: 0, max: 21 } },
    attribution: {},
    display_only: true,
    temporal: { scope: "point", recency_weight: "none" },
    confidence: 0.85,
  },

  // ── JOURNAL SIGNALS — confounders P0-BIS (§3.4) ─────────────────────────

  injury_flag: {
    id: "injury_flag",
    label_fr: "Blessure signalée (journal)",
    category: "physical",
    source: "self_report",
    input: { type: "boolean", unit: null, min: 0, max: 1 },
    normalization: { type: "scale_inverted", params: { min: 0, max: 1 } },
    // display_only: le flag du journal Whoop déclenche detectRecoveryPhase
    // (voir sync.js) plutôt que de tomber le score à 0 — évite faux positifs
    // sur les réponses "oui" laissées par défaut.
    attribution: {},
    display_only: true,
    temporal: { scope: "point", recency_weight: "linear_decay_7d" },
    confidence: 0.85,
  },

  alcohol_yesterday: {
    id: "alcohol_yesterday", label_fr: "Alcool veille (journal)",
    category: "physical", source: "self_report",
    input: { type: "boolean", unit: null, min: 0, max: 1 },
    normalization: { type: "scale_inverted", params: { min: 0, max: 1 } },
    attribution: {}, display_only: true,
    temporal: { scope: "point", recency_weight: "linear_decay_7d" }, confidence: 0.80,
  },

  caffeine_late: {
    id: "caffeine_late", label_fr: "Caféine tardive",
    category: "physical", source: "self_report",
    input: { type: "boolean", unit: null, min: 0, max: 1 },
    normalization: { type: "scale_inverted", params: { min: 0, max: 1 } },
    attribution: {}, display_only: true,
    temporal: { scope: "point", recency_weight: "linear_decay_7d" }, confidence: 0.75,
  },

  stress_reported: {
    id: "stress_reported", label_fr: "Stress signalé",
    category: "mental", source: "self_report",
    input: { type: "boolean", unit: null, min: 0, max: 1 },
    normalization: { type: "scale_inverted", params: { min: 0, max: 1 } },
    attribution: {}, display_only: true,
    temporal: { scope: "point", recency_weight: "linear_decay_7d" }, confidence: 0.75,
  },

  travel_yesterday: {
    id: "travel_yesterday", label_fr: "Voyage / décalage",
    category: "physical", source: "self_report",
    input: { type: "boolean", unit: null, min: 0, max: 1 },
    normalization: { type: "scale_inverted", params: { min: 0, max: 1 } },
    attribution: {}, display_only: true,
    temporal: { scope: "point", recency_weight: "linear_decay_7d" }, confidence: 0.80,
  },

  illness_reported: {
    id: "illness_reported", label_fr: "Maladie signalée",
    category: "physical", source: "self_report",
    input: { type: "boolean", unit: null, min: 0, max: 1 },
    normalization: { type: "scale_inverted", params: { min: 0, max: 1 } },
    attribution: {}, display_only: true, // déclenche recovery_phase dans sync.js
    temporal: { scope: "point", recency_weight: "linear_decay_7d" }, confidence: 0.85,
  },

  protein_intake: {
    id: "protein_intake", label_fr: "Protéines (journal)",
    category: "physical", source: "self_report",
    input: { type: "boolean", unit: null, min: 0, max: 1 },
    normalization: { type: "scale_direct", params: { min: 0, max: 1 } },
    attribution: {}, display_only: true,
    temporal: { scope: "point", recency_weight: "linear_decay_7d" }, confidence: 0.60,
  },

  // ── TRAINING SIGNALS (Strava / derived) ─────────────────────────────────

  acute_chronic_ratio: {
    id: "acute_chronic_ratio",
    label_fr: "Ratio charge aiguë / chronique",
    category: "training",
    source: "derived",
    input: { type: "numeric", unit: null, min: 0, max: 3 },
    normalization: {
      type: "threshold_band",
      // 0.8–1.3 = green zone (score 100), degrades outside
      params: { low: 0.8, high: 1.3, falloff: 0.4 },
    },
    attribution: { charge: 1.0 },
    temporal: { scope: "rolling_7", recency_weight: "none" },
    confidence: 0.90,
  },

  aerobic_decoupling: {
    id: "aerobic_decoupling",
    label_fr: "Dérive aérobie (Friel)",
    category: "training",
    source: "derived",
    // raw_value = fatigue drift in % (positive = speed/HR dropped in half 2).
    // Convention: values ≥ 0 only — a run where efficiency improved is clamped to 0
    // upstream (sync.js) because "negative decoupling" isn't a fitness signal.
    input: { type: "numeric", unit: "%", min: 0, max: 30 },
    normalization: {
      type: "threshold_band",
      // ≤ 5% = zone aérobie solide. Falloff 2.0 → 100 à 5%, 50 à 10%, 0 à 15%.
      params: { low: 0, high: 5, falloff: 2.0 },
    },
    attribution: { physiologique: 0.7, charge: 0.3 },
    temporal: { scope: "point", recency_weight: "linear_decay_28d" },
    confidence: 0.85,
  },

  heat_exposure: {
    id: "heat_exposure",
    label_fr: "Exposition chaleur (événement)",
    category: "training",
    source: "self_report",
    // Raw event log — each exposure = 1. Aggregated into heat_acclimation_count.
    input: { type: "numeric", unit: "event", min: 0, max: 1 },
    normalization: { type: "linear", params: { min: 0, max: 1 } },
    attribution: {},
    display_only: true,
    temporal: { scope: "point", recency_weight: "none" },
    confidence: 0.90,
  },

  heat_acclimation_count: {
    id: "heat_acclimation_count",
    label_fr: "Acclimatation chaleur — expos 14j",
    category: "training",
    source: "derived",
    // Count of heat_exposure events over last 14 days.
    // Périard protocol target : 10-14 expositions before race.
    input: { type: "numeric", unit: "count", min: 0, max: 20 },
    normalization: { type: "linear", params: { min: 0, max: 12 } },
    attribution: { physiologique: 0.7, biologique: 0.3 },
    temporal: { scope: "point", recency_weight: "linear_decay_7d" },
    confidence: 0.85,
  },

  body_stiffness_daily: {
    id: "body_stiffness_daily",
    label_fr: "Raideur corporelle",
    category: "physical",
    source: "self_report",
    input: { type: "scale_1_5", unit: null, min: 1, max: 5 },
    normalization: { type: "scale_inverted", params: { min: 1, max: 5 } },
    attribution: { ressentis: 0.6, physiologique: 0.4 },
    temporal: { scope: "daily", recency_weight: "linear_decay_7d" },
    confidence: 0.75,
  },

  recovery_perceived_daily: {
    id: "recovery_perceived_daily",
    label_fr: "Sentiment de récupération",
    category: "physical",
    source: "self_report",
    input: { type: "scale_1_5", unit: null, min: 1, max: 5 },
    normalization: { type: "scale_direct", params: { min: 1, max: 5 } },
    attribution: { ressentis: 0.5, physiologique: 0.5 },
    temporal: { scope: "daily", recency_weight: "linear_decay_7d" },
    confidence: 0.75,
  },

  mental_freshness_daily: {
    id: "mental_freshness_daily",
    label_fr: "Fraîcheur mentale",
    category: "mental",
    source: "self_report",
    input: { type: "scale_0_100", unit: null, min: 0, max: 100 },
    normalization: { type: "linear", params: { min: 0, max: 100 } },
    attribution: { psychologique: 0.7, ressentis: 0.3 },
    temporal: { scope: "daily", recency_weight: "linear_decay_7d" },
    confidence: 0.75,
  },

  nutrition_protein_daily: {
    id: "nutrition_protein_daily",
    label_fr: "Protéines — couverture quotidienne",
    category: "training",
    source: "self_report",
    input: { type: "scale_1_5", unit: null, min: 1, max: 5 },
    normalization: { type: "scale_direct", params: { min: 1, max: 5 } },
    attribution: { nutrition: 0.5 },
    temporal: { scope: "daily", recency_weight: "linear_decay_7d" },
    confidence: 0.70,
  },

  nutrition_hydration_daily: {
    id: "nutrition_hydration_daily",
    label_fr: "Hydratation — couverture quotidienne",
    category: "training",
    source: "self_report",
    input: { type: "scale_1_5", unit: null, min: 1, max: 5 },
    normalization: { type: "scale_direct", params: { min: 1, max: 5 } },
    attribution: { nutrition: 0.5 },
    temporal: { scope: "daily", recency_weight: "linear_decay_7d" },
    confidence: 0.70,
  },

  gut_carbs_per_hour: {
    id: "gut_carbs_per_hour",
    label_fr: "Gut training — glucides par heure",
    category: "training",
    source: "self_report",
    // Logged manually after long sessions (> 90 min).
    // Target progression : 40 → 80 g/h sur 10 semaines avant Ironman Switzerland Thun.
    input: { type: "numeric", unit: "g/h", min: 0, max: 120 },
    normalization: {
      type: "linear",
      // 0 g/h = 0 score, 80 g/h = 100 score (clamped above).
      params: { min: 0, max: 80 },
    },
    attribution: { nutrition: 1.0 },
    temporal: { scope: "point", recency_weight: "linear_decay_14d" },
    confidence: 0.80,
  },

  last_session_rpe: {
    id: "last_session_rpe",
    label_fr: "Effort perçu — dernière séance",
    category: "training",
    source: "self_report",
    input: { type: "scale_1_5", unit: null, min: 1, max: 5 },
    // RPE alone is not bad/good — high RPE after an easy session = overreach
    // We use it as a mild charge indicator (higher RPE = more load)
    normalization: { type: "scale_inverted", params: { min: 1, max: 5 } },
    attribution: { charge: 0.8, physiologique: 0.2 },
    temporal: { scope: "point", recency_weight: "linear_decay_7d" },
    confidence: 0.75,
  },

  // ── JOURNAL SIGNALS (form inputs) ───────────────────────────────────────

  energy_level: {
    id: "energy_level",
    label_fr: "Niveau d'énergie",
    category: "physical",
    source: "self_report",
    input: { type: "scale_1_10", unit: null, min: 1, max: 10 },
    normalization: { type: "scale_direct", params: { min: 1, max: 10 } },
    attribution: { physiologique: 0.4, ressentis: 0.6 },
    temporal: { scope: "daily", recency_weight: "linear_decay_7d" },
    confidence: 0.60,
  },

  pain_level: {
    id: "pain_level",
    label_fr: "Douleurs / courbatures",
    category: "physical",
    source: "form",
    // categorical: "aucune"=0, "légères"=2, "modérées"=5, "douleur"=9
    input: {
      type: "categorical",
      unit: null,
      options: ["aucune", "légères", "modérées", "douleur"],
    },
    normalization: {
      type: "scale_inverted",
      params: { min: 0, max: 9 },
      // raw values for each option
      category_values: { aucune: 0, légères: 2, modérées: 5, douleur: 9 },
    },
    attribution: { physiologique: 0.5, ressentis: 0.5 },
    temporal: { scope: "daily", recency_weight: "linear_decay_7d" },
    confidence: 0.70,
  },

  stress_pro: {
    id: "stress_pro",
    label_fr: "Stress professionnel",
    category: "lifestyle",
    source: "form",
    input: { type: "scale_1_10", unit: null, min: 1, max: 10 },
    // higher stress = lower score → inverted
    normalization: { type: "scale_inverted", params: { min: 1, max: 10 } },
    attribution: { ressentis: 0.6, psychologique: 0.4 },
    temporal: { scope: "daily", recency_weight: "linear_decay_7d" },
    confidence: 0.60,
  },

  stress_perso: {
    id: "stress_perso",
    label_fr: "Équilibre vie personnelle",
    category: "lifestyle",
    source: "form",
    input: { type: "scale_1_10", unit: null, min: 1, max: 10 },
    // this slider goes from "tendu" (1) to "serein" (10) → direct
    normalization: { type: "scale_direct", params: { min: 1, max: 10 } },
    attribution: { ressentis: 0.7, psychologique: 0.3 },
    temporal: { scope: "daily", recency_weight: "linear_decay_7d" },
    confidence: 0.60,
  },

  life_event: {
    id: "life_event",
    label_fr: "Événement de vie",
    category: "context",
    source: "form",
    input: {
      type: "categorical",
      unit: null,
      options: ["rien", "voyage", "maladie", "conflit", "joie", "surmenage"],
    },
    normalization: {
      type: "scale_direct",
      params: { min: 0, max: 100 },
      category_values: {
        rien: 70,      // neutral baseline
        voyage: 55,    // disruption
        maladie: 20,   // significant negative
        conflit: 35,   // negative
        joie: 90,      // positive boost
        surmenage: 15, // very negative
      },
    },
    attribution: { ressentis: 0.8, psychologique: 0.2 },
    temporal: { scope: "daily", recency_weight: "linear_decay_7d" },
    confidence: 0.65,
  },

  training_motivation: {
    id: "training_motivation",
    label_fr: "Envie de s'entraîner",
    category: "mental",
    source: "form",
    input: { type: "scale_1_10", unit: null, min: 1, max: 10 },
    normalization: { type: "scale_direct", params: { min: 1, max: 10 } },
    attribution: { psychologique: 0.6, ressentis: 0.4 },
    temporal: { scope: "daily", recency_weight: "linear_decay_7d" },
    confidence: 0.55,
  },

  mood: {
    id: "mood",
    label_fr: "Humeur générale",
    category: "mental",
    source: "form",
    input: { type: "scale_1_5", unit: null, min: 1, max: 5 },
    normalization: { type: "scale_direct", params: { min: 1, max: 5 } },
    attribution: { psychologique: 0.7, ressentis: 0.3 },
    temporal: { scope: "daily", recency_weight: "linear_decay_7d" },
    confidence: 0.55,
  },

  free_text_sentiment: {
    id: "free_text_sentiment",
    label_fr: "Ressenti libre (journal / chat)",
    category: "mental",
    source: "free_text",
    input: { type: "text_free", unit: null },
    normalization: {
      type: "sentiment",
      params: {
        positive_keywords: [
          "super", "bien", "forme", "énergie", "motivé", "top", "parfait",
          "excellent", "heureux", "serein", "force", "progression", "fier",
          "content", "envie", "prêt", "léger", "facile",
        ],
        negative_keywords: [
          "fatigué", "épuisé", "mal", "douleur", "stress", "difficile",
          "lourd", "démotivé", "nul", "horrible", "crevé", "déprimé",
          "blessé", "peur", "inquiet", "anxieux", "pas envie", "vide",
        ],
      },
    },
    attribution: { ressentis: 0.5, psychologique: 0.5 },
    temporal: { scope: "daily", recency_weight: "linear_decay_7d" },
    confidence: 0.35,
  },

  session_feedback: {
    id: "session_feedback",
    label_fr: "Ressenti séance (trop facile / ok / trop dur)",
    category: "training",
    source: "form",
    input: {
      type: "categorical",
      unit: null,
      options: ["facile", "ok", "difficile"],
    },
    normalization: {
      type: "scale_direct",
      params: { min: 0, max: 100 },
      // "ok" = perfect, extremes suggest miscalibration
      category_values: { facile: 65, ok: 100, difficile: 50 },
    },
    attribution: { charge: 0.5, psychologique: 0.5 },
    temporal: { scope: "point", recency_weight: "linear_decay_7d" },
    confidence: 0.70,
  },
};

// -----------------------------------------------------------------------------
// OBSERVATION STORE — reads/writes to localStorage
// Key: "coach-ia:obs"
// Shape: [ { signal_id, raw_value, timestamp, athlete_id }, ... ]
// -----------------------------------------------------------------------------
const OBS_KEY = "coach-ia:obs";

function _loadObs() {
  try {
    return JSON.parse(localStorage.getItem(OBS_KEY) || "[]");
  } catch { return []; }
}

function _saveObs(obs) {
  localStorage.setItem(OBS_KEY, JSON.stringify(obs));
}

// Public: save one observation
window.addObservation = function (signal_id, raw_value, athlete_id, timestamp) {
  if (!window.SIGNALS[signal_id]) {
    console.warn("[scoring] Unknown signal:", signal_id);
    return;
  }
  const obs = _loadObs();
  obs.push({
    signal_id,
    raw_value,
    athlete_id: athlete_id || "benoit",
    timestamp: timestamp || Date.now(),
  });
  _saveObs(obs);
};

// Public: wipe all observations (dev helper)
window.clearObservations = function () {
  localStorage.removeItem(OBS_KEY);
};

// -----------------------------------------------------------------------------
// ROLLING BASELINE — per-athlete, robust (median + MAD) over windowDays.
// Used for HRV, RHR, skin_temp, RR, deep_sleep…
// The MAD → σ conversion uses the consistent estimator 1.4826·MAD.
// Results are cached to localStorage under BASELINES_KEY so that tooltips and
// detectors can read them without recomputing.
// -----------------------------------------------------------------------------
const BASELINES_KEY = "coach-ia:baselines";

function rollingBaseline(signal_id, observations, windowDays = 28) {
  const now = Date.now();
  const windowMs = windowDays * 86400 * 1000;
  const values = observations
    .filter(o => o.signal_id === signal_id && (now - o.timestamp) < windowMs)
    .map(o => Number(o.raw_value))
    .filter(v => Number.isFinite(v))
    .sort((a, b) => a - b);

  if (values.length < 7) {
    return { baseline: null, sigma: null, n: values.length, enough_data: false };
  }

  const median = values[Math.floor(values.length / 2)];
  const absDev = values.map(v => Math.abs(v - median)).sort((a, b) => a - b);
  const mad = absDev[Math.floor(absDev.length / 2)];
  const sigma = Math.max(1.4826 * mad, 0.1); // floor avoids div/0 on flat data

  return {
    baseline: Math.round(median * 10) / 10,
    sigma:    Math.round(sigma * 10) / 10,
    n:        values.length,
    enough_data: true,
  };
}

function _loadBaselinesCache() {
  try { return JSON.parse(localStorage.getItem(BASELINES_KEY) || "{}"); }
  catch { return {}; }
}

function _saveBaselinesCache(map) {
  localStorage.setItem(BASELINES_KEY, JSON.stringify(map));
}

// Compute + cache baselines for every signal that has rolling_baseline temporal flag.
// Exposed to UI so tooltips can explain where a score comes from.
function recomputeBaselines(athlete_id) {
  const id = athlete_id || "benoit";
  const obs = [..._loadObs(), ...(window.WEARABLE_OBS || [])]
    .filter(o => o.athlete_id === id);

  const signals = [
    "hrv_morning", "rhr_morning", "skin_temp", "respiratory_rate",
    "spo2", "deep_sleep_min", "rem_sleep_min", "sleep_efficiency",
    "sleep_regularity", "sleep_hours", "daily_strain",
  ];
  const out = {};
  signals.forEach(sig => {
    const b = rollingBaseline(sig, obs, 28);
    if (b.enough_data) out[sig] = b;
  });

  const cache = _loadBaselinesCache();
  cache[id] = { ...out, _computed_at: Date.now() };
  _saveBaselinesCache(cache);
  return out;
}

// Public: read baseline for a given signal (read-through, recomputes if stale)
window.getBaseline = function (signal_id, athlete_id) {
  const id = athlete_id || "benoit";
  const cache = _loadBaselinesCache();
  const athleteCache = cache[id];
  const MAX_AGE_MS = 6 * 3600 * 1000; // recompute every 6h
  if (!athleteCache || !athleteCache._computed_at || (Date.now() - athleteCache._computed_at) > MAX_AGE_MS) {
    const fresh = recomputeBaselines(id);
    return fresh[signal_id] || null;
  }
  return athleteCache[signal_id] || null;
};

// Legacy shim — used by UI tiles that called computeHRVBaseline.
// Maps MAD baseline → the old {baseline_ms, sigma_ms, enough_data} shape.
function computeHRVBaseline(athlete_id) {
  const b = window.getBaseline("hrv_morning", athlete_id);
  if (!b) return { baseline_ms: null, sigma_ms: null, n: 0, enough_data: false };
  return {
    baseline_ms: b.baseline,
    sigma_ms:    b.sigma,
    cv_pct:      Math.round((b.sigma / Math.max(b.baseline, 1)) * 1000) / 10,
    n:           b.n,
    enough_data: true,
  };
}

window.computeHRVBaseline = computeHRVBaseline;
window.rollingBaseline    = rollingBaseline;
window.recomputeBaselines = recomputeBaselines;

// -----------------------------------------------------------------------------
// DECOUPLING STATS — aggregate aerobic_decoupling observations over a window
// Returns per-session detail + summary for UI cards and charts.
// -----------------------------------------------------------------------------
window.computeDecouplingStats = function (athlete_id, windowDays = 56) {
  const id = athlete_id || "benoit";
  const all = [..._loadObs(), ...(window.WEARABLE_OBS || [])]
    .filter(o => o.athlete_id === id && o.signal_id === "aerobic_decoupling");

  const now = Date.now();
  const WINDOW_MS = windowDays * 86400 * 1000;
  const sessions = all
    .filter(o => now - o.timestamp <= WINDOW_MS)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(o => ({ timestamp: o.timestamp, value: Number(o.raw_value) }))
    .filter(s => Number.isFinite(s.value));

  if (sessions.length === 0) {
    return { sessions: [], n: 0, mean: null, latest: null, level: null };
  }

  const mean = sessions.reduce((s, v) => s + v.value, 0) / sessions.length;
  const latest = sessions[sessions.length - 1].value;
  const level = mean < 5 ? "solide" : mean < 10 ? "limite" : "insuffisant";

  return {
    sessions,
    n: sessions.length,
    mean: Math.round(mean * 10) / 10,
    latest: Math.round(latest * 10) / 10,
    level,
    windowDays,
  };
};

// -----------------------------------------------------------------------------
// HEAT ACCLIMATION STATS — count heat_exposure events over a rolling window.
// Returns per-exposure detail + summary for UI cards.
// -----------------------------------------------------------------------------
window.computeHeatAcclimationStats = function (athlete_id, windowDays = 14) {
  const id = athlete_id || "benoit";
  const all = [..._loadObs(), ...(window.WEARABLE_OBS || [])]
    .filter(o => o.athlete_id === id && o.signal_id === "heat_exposure");

  const now = Date.now();
  const WINDOW_MS = windowDays * 86400 * 1000;
  const exposures = all
    .filter(o => now - o.timestamp <= WINDOW_MS)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(o => ({ timestamp: o.timestamp, value: Number(o.raw_value) || 1 }));

  const count = exposures.length;
  const target = 12;
  const level = count >= 10 ? "ready"
              : count >= 5 ? "progressing"
              : count >= 1 ? "starting" : "none";

  const latest = exposures.length ? exposures[exposures.length - 1].timestamp : null;

  return {
    exposures,
    count,
    target,
    level,
    latest,
    windowDays,
  };
};

// -----------------------------------------------------------------------------
// GUT TRAINING STATS — aggregate gut_carbs_per_hour observations.
// Returns per-session detail + summary for UI cards and charts.
// -----------------------------------------------------------------------------
window.computeGutTrainingStats = function (athlete_id, windowDays = 70) {
  const id = athlete_id || "benoit";
  const all = [..._loadObs(), ...(window.WEARABLE_OBS || [])]
    .filter(o => o.athlete_id === id && o.signal_id === "gut_carbs_per_hour");

  const now = Date.now();
  const WINDOW_MS = windowDays * 86400 * 1000;
  const sessions = all
    .filter(o => now - o.timestamp <= WINDOW_MS)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(o => ({ timestamp: o.timestamp, value: Number(o.raw_value) }))
    .filter(s => Number.isFinite(s.value));

  if (sessions.length === 0) {
    return { sessions: [], n: 0, mean: null, latest: null, level: null };
  }

  const latest = sessions[sessions.length - 1].value;
  const mean = sessions.reduce((s, v) => s + v.value, 0) / sessions.length;
  // Level based on latest (most representative of current adaptation)
  const level = latest < 40 ? "beginner"
              : latest < 70 ? "progressing"
              : latest <= 90 ? "target" : "elite";

  return {
    sessions,
    n: sessions.length,
    mean: Math.round(mean),
    latest: Math.round(latest),
    level,
    windowDays,
  };
};

// -----------------------------------------------------------------------------
// NORMALIZATION ENGINE
// Converts a raw value to a contribution in [0, 100]
// -----------------------------------------------------------------------------
function normalize(signal, raw_value) {
  const norm = signal.normalization;
  const p = norm.params;

  switch (norm.type) {

    case "linear": {
      const clamped = Math.max(p.min, Math.min(p.max, raw_value));
      return ((clamped - p.min) / (p.max - p.min)) * 100;
    }

    case "baseline": {
      // Gaussian: 50 at baseline, 100 at +1σ, 0 at −1σ
      const z = (raw_value - p.baseline) / (p.sigma || 8);
      return Math.max(0, Math.min(100, 50 + z * 50));
    }

    case "baseline_inverted": {
      // Same as baseline but lower raw = higher score (RHR, temp, RR, stress).
      const z = (raw_value - p.baseline) / (p.sigma || 8);
      return Math.max(0, Math.min(100, 50 - z * 50));
    }

    case "scale_direct": {
      const clamped = Math.max(p.min, Math.min(p.max, raw_value));
      return ((clamped - p.min) / (p.max - p.min)) * 100;
    }

    case "scale_inverted": {
      const clamped = Math.max(p.min, Math.min(p.max, raw_value));
      return ((p.max - clamped) / (p.max - p.min)) * 100;
    }

    case "threshold_band": {
      const { low, high, falloff } = p;
      if (raw_value >= low && raw_value <= high) return 100;
      const dist = raw_value < low
        ? (low - raw_value) / low
        : (raw_value - high) / high;
      return Math.max(0, 100 - dist / falloff * 100);
    }

    case "sentiment": {
      if (typeof raw_value !== "string") return 50;
      const text = raw_value.toLowerCase();
      const pos = norm.params.positive_keywords.filter(k => text.includes(k)).length;
      const neg = norm.params.negative_keywords.filter(k => text.includes(k)).length;
      if (pos === 0 && neg === 0) return 50;
      const ratio = pos / (pos + neg);
      return Math.round(ratio * 100);
    }

    default:
      return 50;
  }
}

// Handle categorical signals
function normalizeRaw(signal, raw_value) {
  // For categoricals, convert to numeric first
  if (signal.normalization.category_values !== undefined) {
    const mapped = signal.normalization.category_values[raw_value];
    if (mapped !== undefined) {
      // If already a 0-100 value, return directly
      if (signal.normalization.type === "scale_direct") return mapped;
      // Otherwise, normalize the numeric value
      return normalize(signal, mapped);
    }
    return 50;
  }
  return normalize(signal, raw_value);
}

// -----------------------------------------------------------------------------
// RECENCY WEIGHT
// More recent observations count more
// -----------------------------------------------------------------------------
function recencyWeight(temporal, timestamp) {
  if (temporal.recency_weight === "none") return 1.0;

  const days = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);

  if (temporal.recency_weight === "linear_decay_7d") {
    return Math.max(0, 1 - days / 7);
  }
  if (temporal.recency_weight === "linear_decay_28d") {
    return Math.max(0, 1 - days / 28);
  }
  return 1.0;
}

// -----------------------------------------------------------------------------
// LAYER SCORE COMPUTATION
// -----------------------------------------------------------------------------
// Inject dynamic per-athlete baselines (MAD 28j) into signals whose
// normalization is "baseline" or "baseline_inverted". Falls back to hardcoded
// defaults when there isn't enough data yet.
function resolveSignal(signal) {
  const nt = signal.normalization.type;
  if (nt !== "baseline" && nt !== "baseline_inverted") return signal;
  const b = window.getBaseline(signal.id);
  if (!b) return signal;
  return {
    ...signal,
    normalization: {
      ...signal.normalization,
      params: { ...signal.normalization.params, baseline: b.baseline, sigma: b.sigma },
    },
  };
}

window.computeLayerScores = function (athlete_id) {
  const id = athlete_id || "benoit";
  const allObs = _loadObs().filter(o => o.athlete_id === id);

  // Merge wearable observations from sync script (window.WEARABLE_OBS)
  const wearableObs = (window.WEARABLE_OBS || []).filter(o => o.athlete_id === id);
  const obs = [...allObs, ...wearableObs];

  // Recompute rolling baselines (MAD 28j) for this athlete.
  // getBaseline(id) reads through cache; we call it once to force a refresh
  // when the cache is stale so all resolveSignal() calls below are consistent.
  recomputeBaselines(id);
  const hrvStats = computeHRVBaseline(id);
  if (window.ATHLETES && window.ATHLETES[id]) {
    window.ATHLETES[id].hrv_stats = hrvStats;
  }

  const layers = Object.keys(LAYER_WEIGHTS);
  const result = {};

  layers.forEach(layer => {
    let weightedSum = 0;
    let weightedDenominator = 0;

    Object.values(window.SIGNALS).forEach(signal => {
      const attrWeight = signal.attribution[layer] || 0;
      if (attrWeight === 0) return;

      // Get most recent observation for this signal
      const signalObs = obs
        .filter(o => o.signal_id === signal.id)
        .sort((a, b) => b.timestamp - a.timestamp);

      if (signalObs.length === 0) return;

      const latest = signalObs[0];
      const rw = recencyWeight(signal.temporal, latest.timestamp);
      if (rw <= 0) return;

      const effective = resolveSignal(signal);
      const normalizedValue = normalizeRaw(effective, latest.raw_value);
      const w = attrWeight * signal.confidence * rw;

      weightedSum += normalizedValue * w;
      weightedDenominator += w;
    });

    result[layer] = weightedDenominator > 0
      ? Math.round(weightedSum / weightedDenominator)
      : null; // null = "en calibration", not enough data
  });

  return result;
};

// -----------------------------------------------------------------------------
// GLOBAL FORME SCORE
// -----------------------------------------------------------------------------
window.computeFormeScore = function (athlete_id) {
  const layerScores = window.computeLayerScores(athlete_id);

  let weightedSum = 0;
  let usedWeight = 0;
  const breakdown = [];

  Object.entries(LAYER_WEIGHTS).forEach(([layer, weight]) => {
    const score = layerScores[layer];
    if (score === null) return; // skip uncalibrated layers

    weightedSum += score * weight;
    usedWeight += weight;

    breakdown.push({ layer, score, weight, contribution: score * weight });
  });

  if (usedWeight === 0) {
    return {
      score: null, breakdown: [], layerScores,
      ci_low: null, ci_high: null, half_width: null,
      n_layers_calibrated: 0, n_layers_total: Object.keys(LAYER_WEIGHTS).length,
    };
  }

  // Renormalize so used weights sum to 1
  const globalScore = Math.round(weightedSum / usedWeight);

  // ── Confidence interval ──────────────────────────────────────────────────
  // Two sources of uncertainty:
  //   (a) signal noise inside calibrated layers — modeled as a fixed per-layer
  //       sigma on the 0–100 scale (day-to-day fluctuation baseline)
  //   (b) missing-layer penalty — uncalibrated weight fraction widens the IC
  //       because we're extrapolating over dimensions we can't see yet
  const SIGMA_PER_LAYER = 8;      // ~8 pts plausible day-to-day layer noise
  const MISSING_PENALTY_MAX = 15; // ±15 pts if 100% of layers are uncalibrated

  let signalVariance = 0;
  breakdown.forEach(b => {
    const w = b.weight / usedWeight; // renormalized
    signalVariance += (w * SIGMA_PER_LAYER) ** 2;
  });
  const missingFraction = 1 - usedWeight;
  const missingPenalty = missingFraction * MISSING_PENALTY_MAX;
  const halfWidth = Math.round(Math.sqrt(signalVariance) + missingPenalty);

  const score = Math.max(0, Math.min(100, globalScore));

  return {
    score,
    breakdown: breakdown.sort((a, b) => b.contribution - a.contribution),
    layerScores,
    ci_low: Math.max(0, score - halfWidth),
    ci_high: Math.min(100, score + halfWidth),
    half_width: halfWidth,
    n_layers_calibrated: breakdown.length,
    n_layers_total: Object.keys(LAYER_WEIGHTS).length,
  };
};

// -----------------------------------------------------------------------------
// EXPLAIN SCORE — French breakdown for "Pourquoi ce score ?" panel
// -----------------------------------------------------------------------------
window.explainScore = function (athlete_id) {
  const result = window.computeFormeScore(athlete_id);
  if (!result.score) {
    return {
      summary: "Pas encore assez de données pour calculer ton score. Remplis ton journal pour commencer.",
      signals: [],
    };
  }

  const id = athlete_id || "benoit";
  const allObs = [..._loadObs(), ...(window.WEARABLE_OBS || [])]
    .filter(o => o.athlete_id === id);

  const hrvStats = computeHRVBaseline(id);

  const LAYER_LABELS = {
    sommeil: "Sommeil",
    charge: "Charge",
    physiologique: "Physiologie",
    psychologique: "Psychologie",
    biologique: "Biologie",
    ressentis: "Ressentis",
    nutrition: "Nutrition",
    genetique: "Génétique",
  };

  // Top contributing signals + per-layer breakdown
  const signalContribs = [];
  const perLayerSignals = {}; // layer_id → [{label, value, unit, z, baseline, score, weight, signal_id}]

  Object.values(window.SIGNALS).forEach(signal => {
    const obs = allObs
      .filter(o => o.signal_id === signal.id)
      .sort((a, b) => b.timestamp - a.timestamp);
    if (obs.length === 0) return;

    const latest = obs[0];
    const effective = resolveSignal(signal);
    const normalized = normalizeRaw(effective, latest.raw_value);
    const rw = recencyWeight(signal.temporal, latest.timestamp);
    const totalAttr = Object.values(signal.attribution || {}).reduce((a, b) => a + b, 0);
    const impact = normalized * signal.confidence * rw * totalAttr;

    // Baseline + z-score (for baseline or baseline_inverted normalizations)
    let baseline = null;
    let sigma = null;
    let z = null;
    if (signal.normalization && (signal.normalization.type === "baseline" || signal.normalization.type === "baseline_inverted")) {
      const base = typeof window.getBaseline === "function" ? window.getBaseline(signal.id, id) : null;
      if (base && base.baseline !== null && base.sigma) {
        baseline = base.baseline;
        sigma = base.sigma;
        z = Math.round(((Number(latest.raw_value) - base.baseline) / base.sigma) * 10) / 10;
      }
    }

    const entry = {
      signal_id: signal.id,
      label: signal.label_fr,
      value: latest.raw_value,
      unit: signal.input && signal.input.unit ? signal.input.unit : "",
      baseline,
      sigma,
      z,
      score: Math.round(normalized),
      confidence: signal.confidence,
      recency: Math.round(rw * 100) / 100,
      impact: Math.round(impact),
      display_only: signal.display_only === true,
      timestamp: latest.timestamp,
    };

    signalContribs.push(entry);

    // Distribute to per-layer map
    Object.entries(signal.attribution || {}).forEach(([layer, weight]) => {
      if (!perLayerSignals[layer]) perLayerSignals[layer] = [];
      perLayerSignals[layer].push({
        ...entry,
        layer_weight: weight,
        layer_contribution: Math.round(normalized * signal.confidence * rw * weight),
      });
    });
  });

  // Sort per-layer by contribution desc
  Object.keys(perLayerSignals).forEach(layer => {
    perLayerSignals[layer].sort((a, b) => b.layer_contribution - a.layer_contribution);
  });

  signalContribs.sort((a, b) => b.impact - a.impact);

  return {
    score: result.score,
    ci_low: result.ci_low,
    ci_high: result.ci_high,
    half_width: result.half_width,
    summary: `Ton score de forme aujourd'hui est de **${result.score}/100**.`,
    layers: result.breakdown.map(b => ({
      id: b.layer,
      label: LAYER_LABELS[b.layer] || b.layer,
      score: b.score,
      contribution: Math.round((b.weight / (result.breakdown.reduce((s, x) => s + x.weight, 0))) * 100),
      top_signals: (perLayerSignals[b.layer] || []).slice(0, 4),
    })),
    top_signals: signalContribs.slice(0, 5),
    calibrated: result.breakdown.length,
    total_layers: Object.keys(LAYER_WEIGHTS).length,
  };
};
