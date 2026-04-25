// PLAN-GENERATOR.JS
// Génère un plan 7 jours adaptatif à partir de window.HISTORY (backfill.js)
// + état courant (recovery_phase depuis sync.js, score forme, journal du jour).
// Branché par dashboard.js : si disponible, remplace le plan fictif de data.js.

(function () {
  const RACE_DATE_MS = new Date("2026-07-05T00:00:00Z").getTime();
  const DAY_MS = 86400000;

  const JOURS_COURTS = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."];
  const MOIS_COURTS = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];

  // ── HELPERS ─────────────────────────────────────────────────────────────────
  // Compte les jours depuis la dernière entrée illness dans HISTORY.daily
  // Respecte l'override utilisateur ("Je vais mieux") s'il est défini
  // Récupère la fenêtre d'override : { startDate, endDate } ou null
  function _getIllnessWindow() {
    const win = window.IllnessOverride && window.IllnessOverride.get();
    if (!win) return null;
    return {
      startDate: win.startDate || null,
      endDate: win.endDate || null,
    };
  }

  // Un jour de maladie compte si :
  //  - pas de fenêtre définie → toujours
  //  - sinon il doit être DANS la fenêtre [startDate, endDate]
  function _illnessDayCounts(dayTs) {
    const win = _getIllnessWindow();
    if (!win) return true;
    if (win.startDate && dayTs < win.startDate) return false;
    if (win.endDate && dayTs > win.endDate) return false;
    return true;
  }

  function daysSinceLastIllness() {
    const H = window.HISTORY;
    if (!H || !H.daily) return null;
    const today = Date.now();
    const win = _getIllnessWindow();
    // Si l'utilisateur a défini une date de fin → on compte depuis cette date
    if (win && win.endDate) {
      return Math.max(0, Math.floor((today - win.endDate) / DAY_MS));
    }
    let lastIllnessTs = null;
    for (let i = H.daily.length - 1; i >= 0; i--) {
      const d = H.daily[i];
      if (d.journal && d.journal.illness && _illnessDayCounts(d.timestamp)) {
        lastIllnessTs = d.timestamp;
        break;
      }
    }
    if (!lastIllnessTs) return null;
    return Math.max(0, Math.floor((today - lastIllnessTs) / DAY_MS));
  }

  function countRecentIllnessDays(windowDays = 14) {
    const H = window.HISTORY;
    if (!H || !H.daily) return 0;
    const cutoff = Date.now() - windowDays * DAY_MS;
    return H.daily.filter(d =>
      d.timestamp > cutoff
      && d.journal && d.journal.illness
      && _illnessDayCounts(d.timestamp)
    ).length;
  }

  // ── ÉTAT COURANT ────────────────────────────────────────────────────────────
  // Résout l'état d'entraînement à partir de HISTORY + journal + wearable_obs
  function inferTrainingState() {
    const H = window.HISTORY;
    if (!H || !H.weeks || !H.daily) {
      return { mode: "build", reason: "pas d'historique — mode par défaut", factors: [] };
    }

    const lastWeek = H.weeks[H.weeks.length - 1];
    const lastDay = H.daily[H.daily.length - 1];
    const prevWeek = H.weeks[H.weeks.length - 2];

    const sig = lastWeek.signature;
    const acwr = lastWeek.metrics.acwr;
    const hrvTrend = lastWeek.metrics.hrv_trend;
    const journal = lastDay.journal || {};
    const flagCount = lastDay.composite_flag ? lastDay.composite_flag.count : 0;

    const illnessDaysSince = daysSinceLastIllness();
    const illnessDaysCount = countRecentIllnessDays(14);

    // Fraîcheur de la dernière donnée journal : pertinente uniquement si < 2 jours
    const lastDayAgeDays = lastDay && lastDay.timestamp
      ? Math.floor((Date.now() - lastDay.timestamp) / DAY_MS)
      : null;
    const journalIsFresh = lastDayAgeDays !== null && lastDayAgeDays <= 1;

    // Base payload
    const base = { signature: sig, acwr, hrvTrend, flagCount, illnessDaysSince, illnessDaysCount };

    // 1. Illness active (self-report ET frais ET pas marqué fini par l'athlète) → recovery
    const _illnessWin = _getIllnessWindow();
    const _illnessOverridden = _illnessWin && _illnessWin.endDate && lastDay && lastDay.timestamp <= _illnessWin.endDate;
    if (journal.illness && journalIsFresh && !_illnessOverridden) {
      return {
        ...base,
        mode: "recovery",
        reason: `sortie de maladie — ${illnessDaysCount} jours off sur 14j`,
        factors: [
          { label: "Journal", value: "maladie signalée ce matin", weight: "décisif" },
          { label: "Jours off", value: `${illnessDaysCount} sur les 14 derniers jours`, weight: "fort" },
          { label: "Signature semaine", value: sig, weight: "contexte" },
        ],
      };
    }

    // 1bis. Injury (frais) → recovery
    if (journal.injury && journalIsFresh) {
      return {
        ...base,
        mode: "recovery",
        reason: "blessure signalée au journal",
        factors: [{ label: "Journal", value: "blessure signalée", weight: "décisif" }],
      };
    }

    // 2. Choc immunitaire récent (semaine en cours ou la précédente)
    if (sig === "Choc immunitaire" || (prevWeek && prevWeek.signature === "Choc immunitaire")) {
      const d = illnessDaysSince !== null ? ` (dernière trace il y a ${illnessDaysSince}j)` : "";
      return {
        ...base,
        mode: "recovery",
        reason: `sortie d'épisode immunitaire${d}`,
        factors: [
          { label: "Signature semaine", value: sig, weight: "décisif" },
          ...(illnessDaysSince !== null ? [{ label: "Dernière illness", value: `J+${illnessDaysSince}`, weight: "fort" }] : []),
          { label: "Flags physio ce matin", value: `${flagCount}/4`, weight: "contexte" },
        ],
      };
    }

    // 3. Flags composites élevés aujourd'hui → recovery soft
    if (flagCount >= 3) {
      return {
        ...base,
        mode: "recovery",
        reason: `${flagCount}/4 flags physio activés`,
        factors: [{ label: "Flags physio", value: `${flagCount}/4 (HRV/RHR/RR/skin temp)`, weight: "décisif" }],
      };
    }

    // 4. ACWR élevée ou Charge brute/Overreach → deload
    if (acwr && acwr > 1.3) {
      return {
        ...base,
        mode: "deload",
        reason: `ACWR ${acwr} — zone de risque`,
        factors: [{ label: "ACWR", value: `${acwr} (>1.3)`, weight: "décisif" }, { label: "Signature semaine", value: sig, weight: "contexte" }],
      };
    }
    if (sig === "Charge brute" || sig === "Overreach confirmé") {
      return {
        ...base,
        mode: "deload",
        reason: `signature "${sig}" — décharger`,
        factors: [{ label: "Signature semaine", value: sig, weight: "décisif" }, { label: "ACWR", value: acwr || "—", weight: "contexte" }],
      };
    }

    // 5. Rebond confirmé → reprendre le build
    if (sig === "Rebond") {
      return {
        ...base,
        mode: "build",
        reason: "rebond confirmé — relance progressive",
        factors: [{ label: "Signature semaine", value: "Rebond", weight: "décisif" }, { label: "HRV trend", value: `${hrvTrend}σ`, weight: "fort" }],
      };
    }

    // 6. Défaut → build / croisière selon ACWR
    if (acwr && acwr < 0.7) {
      return {
        ...base,
        mode: "build",
        reason: `ACWR ${acwr} — sous-charge, monter le volume`,
        factors: [{ label: "ACWR", value: `${acwr} (<0.7)`, weight: "décisif" }, { label: "Signature semaine", value: sig, weight: "contexte" }],
      };
    }

    return {
      ...base,
      mode: "build",
      reason: `rythme normal — ${sig}`,
      factors: [{ label: "Signature semaine", value: sig, weight: "décisif" }, { label: "ACWR", value: acwr || "—", weight: "contexte" }],
    };
  }

  // ── PHASE PAR RAPPORT À LA COURSE ────────────────────────────────────────────
  function raceDaysInfo() {
    const now = Date.now();
    const days = Math.ceil((RACE_DATE_MS - now) / DAY_MS);
    let phase;
    if (days > 90) phase = "base";
    else if (days > 42) phase = "build";
    else if (days > 14) phase = "peak";
    else phase = "taper";
    return { days, phase };
  }

  // ── TEMPLATES DE SEMAINE ────────────────────────────────────────────────────
  // 7 slots. Slot 0 = aujourd'hui. Chaque slot = {type, icone, intensite, duree, detail}
  function templateRecovery() {
    return [
      { type: "Repos actif", icone: "🧘", intensite: "légère", duree: "30-40min", detail: "Marche ou yoga doux", loadHint: "très léger" },
      { type: "Repos", icone: "😴", intensite: "repos", duree: "—", detail: "Sommeil + récup totale", loadHint: "aucun" },
      { type: "Vélo", icone: "🚴", intensite: "légère", duree: "45min", detail: "Test vélo Z1-Z2 très doux", loadHint: "découverte" },
      { type: "Repos", icone: "😴", intensite: "repos", duree: "—", detail: "Débrief du test d'hier", loadHint: "aucun" },
      { type: "Natation", icone: "🏊", intensite: "légère", duree: "45min", detail: "Technique pure, pas de séries", loadHint: "technique" },
      { type: "Vélo", icone: "🚴", intensite: "modérée", duree: "1h", detail: "Z2 continu, terrain plat", loadHint: "reprise volume" },
      { type: "Repos actif", icone: "🧘", intensite: "légère", duree: "30min", detail: "Mobilité + étirements", loadHint: "intégration" },
    ];
  }

  function templateDeload() {
    return [
      { type: "Vélo", icone: "🚴", intensite: "modérée", duree: "1h", detail: "Z2 court, -30% vs sem. passée", loadHint: "volume réduit" },
      { type: "Repos", icone: "😴", intensite: "repos", duree: "—", detail: "Sommeil prioritaire", loadHint: "aucun" },
      { type: "Natation", icone: "🏊", intensite: "modérée", duree: "45min", detail: "Technique + 4 × 100m", loadHint: "technique" },
      { type: "Course", icone: "🏃", intensite: "légère", duree: "40min", detail: "Run Z2 facile", loadHint: "léger" },
      { type: "Repos", icone: "😴", intensite: "repos", duree: "—", detail: "Récupération totale", loadHint: "aucun" },
      { type: "Vélo", icone: "🚴", intensite: "modérée", duree: "1h30", detail: "Z2 stable, terrain plat", loadHint: "modéré" },
      { type: "Course", icone: "🏃", intensite: "modérée", duree: "50min", detail: "Run Z2 avec 4 strides", loadHint: "modéré" },
    ];
  }

  function templateBuild(racePhase) {
    // Ajuste les durées selon la phase : base < build < peak
    const longVelo = racePhase === "peak" ? "3h" : racePhase === "build" ? "2h15" : "1h45";
    const longRun = racePhase === "peak" ? "1h30" : racePhase === "build" ? "1h15" : "1h";
    return [
      { type: "Vélo", icone: "🚴", intensite: "modérée", duree: "1h15", detail: "Z2 endurance, base aérobie", loadHint: "build" },
      { type: "Natation", icone: "🏊", intensite: "intense", duree: "1h", detail: "5 × 200m au seuil", loadHint: "qualité" },
      { type: "Repos", icone: "😴", intensite: "repos", duree: "—", detail: "Récup après qualité nat", loadHint: "aucun" },
      { type: "Course", icone: "🏃", intensite: "intense", duree: "1h", detail: "Intervalles 5 × 4' Z4", loadHint: "qualité" },
      { type: "Natation", icone: "🏊", intensite: "modérée", duree: "45min", detail: "Technique + drill", loadHint: "technique" },
      { type: "Vélo", icone: "🚴", intensite: "longue", duree: longVelo, detail: "Sortie longue Z2 — pilier IM", loadHint: "volume" },
      { type: "Course", icone: "🏃", intensite: "longue", duree: longRun, detail: "Sortie longue Z2", loadHint: "volume" },
    ];
  }

  function templatePeak() {
    return [
      { type: "Vélo", icone: "🚴", intensite: "intense", duree: "1h30", detail: "Intervalles FTP 4 × 8'", loadHint: "qualité" },
      { type: "Natation", icone: "🏊", intensite: "modérée", duree: "1h", detail: "Simulation open water + technique", loadHint: "spécifique" },
      { type: "Repos", icone: "😴", intensite: "repos", duree: "—", detail: "Récup post-intervalles", loadHint: "aucun" },
      { type: "Course", icone: "🏃", intensite: "intense", duree: "1h", detail: "Tempo 3 × 10' allure IM", loadHint: "qualité" },
      { type: "Natation", icone: "🏊", intensite: "modérée", duree: "45min", detail: "Technique + étirements", loadHint: "technique" },
      { type: "Vélo", icone: "🚴", intensite: "longue", duree: "3h", detail: "Sortie longue + 30min brick", loadHint: "spécifique IM" },
      { type: "Course", icone: "🏃", intensite: "longue", duree: "1h45", detail: "Long Z2 + 20min allure IM", loadHint: "spécifique IM" },
    ];
  }

  function templateTaper() {
    return [
      { type: "Vélo", icone: "🚴", intensite: "légère", duree: "45min", detail: "Z2 très doux", loadHint: "taper" },
      { type: "Repos", icone: "😴", intensite: "repos", duree: "—", detail: "Sommeil +1h", loadHint: "aucun" },
      { type: "Natation", icone: "🏊", intensite: "modérée", duree: "30min", detail: "Pré-activation 4 × 50m", loadHint: "activation" },
      { type: "Course", icone: "🏃", intensite: "modérée", duree: "30min", detail: "Run + 4 strides", loadHint: "activation" },
      { type: "Repos", icone: "😴", intensite: "repos", duree: "—", detail: "Visualisation course", loadHint: "aucun" },
      { type: "Vélo", icone: "🚴", intensite: "légère", duree: "1h", detail: "Reconnaissance parcours", loadHint: "spécifique" },
      { type: "Course", icone: "🏃", intensite: "légère", duree: "20min", detail: "Run d'activation pré-course", loadHint: "activation" },
    ];
  }

  function pickTemplate(state, phaseInfo) {
    if (state.mode === "recovery") return templateRecovery();
    if (state.mode === "deload") return templateDeload();
    if (phaseInfo.phase === "taper") return templateTaper();
    if (phaseInfo.phase === "peak") return templatePeak();
    return templateBuild(phaseInfo.phase);
  }

  // ── NOTES COACH (contextualisées selon l'état) ─────────────────────────────
  function buildNoteCoach(slot, slotIndex, state, phaseInfo, lastDay) {
    const hrvZ = lastDay && lastDay.zscores ? lastDay.zscores.hrv_morning : null;
    const recovery = lastDay ? lastDay.recovery : null;

    // Slot 0 : message contextualisé état
    if (slotIndex === 0) {
      if (state.mode === "recovery") {
        const jSince = state.illnessDaysSince;
        const jPhrase = jSince !== null && jSince !== undefined
          ? (jSince === 0 ? "maladie aujourd'hui encore" : `J+${jSince} depuis la dernière trace maladie`)
          : state.reason;
        return `${jPhrase}. Reprise douce, pas d'objectif perf. ${slot.detail}. Si ça accroche, tu coupes.`;
      }
      if (state.mode === "deload") {
        return `Charge haute (ACWR ${state.acwr || "?"}). On décharge de 25-30 % cette semaine. ${slot.detail}. Le gain se fait pendant la récup.`;
      }
      const days = phaseInfo.days;
      const zMsg = hrvZ !== null && hrvZ > 0.5 ? `HRV +${hrvZ}σ ce matin — bon signal. ` : "";
      return `${zMsg}J-${days} avant Thun, phase ${phaseInfo.phase}. ${slot.detail}. Tu peux y aller.`;
    }

    // Notes génériques par type
    if (slot.intensite === "repos") {
      return "Récupération = progression différée. Sommeil, hydratation, protéines. Si tu bouges, que ce soit uniquement par plaisir.";
    }
    if (slot.intensite === "longue") {
      return `${slot.detail}. Allure facile, pas de chrono. Objectif : tenir la durée sans exploser. Ravito toutes les 30-40 min.`;
    }
    if (slot.intensite === "intense") {
      return `${slot.detail}. Échauffe 15 min, exécute proprement, retour calme 10 min. Si la qualité chute, arrête la série.`;
    }
    return slot.detail;
  }

  // ── FORMATAGE DATES ─────────────────────────────────────────────────────────
  function formatDate(date) {
    return `${date.getDate()} ${MOIS_COURTS[date.getMonth()]}`;
  }

  function jourLabel(date, isToday) {
    if (isToday) return "Auj.";
    return JOURS_COURTS[date.getDay()];
  }

  // ── GÉNÉRATION FINALE ───────────────────────────────────────────────────────
  function generatePlan7(athleteId = "benoit") {
    const state = inferTrainingState();
    const phaseInfo = raceDaysInfo();
    const template = pickTemplate(state, phaseInfo);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const plan = template.map((slot, i) => {
      const date = new Date(today.getTime() + i * DAY_MS);
      const lastDay = window.HISTORY ? window.HISTORY.daily[window.HISTORY.daily.length - 1] : null;
      return {
        jour: jourLabel(date, i === 0),
        date: formatDate(date),
        type: slot.type,
        icone: slot.icone,
        intensite: slot.intensite,
        duree: slot.duree,
        detail: slot.detail,
        noteCoach: buildNoteCoach(slot, i, state, phaseInfo, lastDay),
        zones: null,
        exercices: [{ nom: slot.detail, duree: slot.duree, note: slot.loadHint }],
        ajustement: "ok",
      };
    });

    return { plan, state, phaseInfo };
  }

  // ── API PUBLIQUE ────────────────────────────────────────────────────────────
  window.generatePlan7 = generatePlan7;
  window.inferTrainingState = inferTrainingState;
})();
