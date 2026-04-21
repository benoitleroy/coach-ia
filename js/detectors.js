// DETECTORS.JS — Catalogue des détecteurs par voix (physio / coach / data)
// Chaque détecteur analyse une semaine (+ contexte) et retourne :
//   { triggered: bool, label: string, message: string, severity: "info"|"warn"|"alert"|"win" }
//
// Consommé par l'UI "Mes Semaines" (Lot 3) et les alertes dashboard (Lot 9).
// Règles issues de prompt-historique.md §5 + physiologie endurance (Friel, Seiler, Laursen).

(function () {
  const ok = (label, message, severity = "info") => ({ triggered: true, label, message, severity });
  const skip = { triggered: false };

  // ─── VOIX PHYSIO : signaux biologiques (HRV, RHR, skin temp, sleep, RR) ──────
  const PHYSIO_DETECTORS = [
    // 1. Composite autonomic 3/4 flags
    (w, days, ctx) => {
      const flagDays = days.filter(d => d.composite_flag && d.composite_flag.count >= 3);
      if (!flagDays.length) return skip;
      return ok(
        "Stress autonomique composite",
        `${flagDays.length}j avec ≥3/4 marqueurs déviants (HRV bas / RHR haut / RR haut / skin temp haute). Signal précoce de maladie ou overreach.`,
        flagDays.length >= 2 ? "alert" : "warn"
      );
    },
    // 2. HRV crash (trend < -1.5σ)
    (w) => {
      if (w.metrics.hrv_trend !== null && w.metrics.hrv_trend < -1.5) {
        return ok("HRV effondrée", `Tendance HRV à ${w.metrics.hrv_trend}σ sous baseline — système nerveux sous tension.`, "alert");
      }
      return skip;
    },
    // 3. HRV rebond (trend > +1.5σ)
    (w) => {
      if (w.metrics.hrv_trend !== null && w.metrics.hrv_trend > 1.5) {
        return ok("HRV en rebond", `HRV +${w.metrics.hrv_trend}σ au-dessus de baseline — ton corps a intégré la charge.`, "win");
      }
      return skip;
    },
    // 4. Skin temp élevée persistante
    (w, days) => {
      const withSkin = days.filter(d => d.zscores && typeof d.zscores.skin_temp === "number");
      const highDays = withSkin.filter(d => d.zscores.skin_temp > 1);
      if (highDays.length >= 3) {
        return ok("Skin temp élevée", `${highDays.length}j consécutifs avec skin temp > +1σ — immunité sollicitée, vigilance.`, "warn");
      }
      return skip;
    },
    // 5. RHR élevée
    (w, days) => {
      const highDays = days.filter(d => d.zscores && d.zscores.rhr_morning > 1);
      if (highDays.length >= 2) {
        return ok("Fréquence cardiaque repos élevée", `${highDays.length}j avec RHR > +1σ — récupération incomplète.`, "warn");
      }
      return skip;
    },
    // 6. Respi rapide au repos
    (w, days) => {
      const highDays = days.filter(d => d.zscores && d.zscores.respiratory_rate > 1);
      if (highDays.length >= 2) {
        return ok("Respi rapide au repos", `${highDays.length}j avec RR > +1σ — stress métabolique ou inflammation.`, "warn");
      }
      return skip;
    },
    // 7. Sleep debt cumulé
    (w, days) => {
      const debts = days.map(d => d.sleep && d.sleep.debt).filter(Number.isFinite);
      const totalDebt = debts.reduce((a, b) => a + b, 0);
      if (totalDebt > 180) {
        return ok("Dette de sommeil", `${Math.round(totalDebt)}min de dette cumulée cette semaine — impact sur la récup profonde.`, "warn");
      }
      return skip;
    },
    // 8. Sommeil profond sous-optimal
    (w) => {
      const avgDeep = w.metrics.deep_sleep_avg;
      if (avgDeep && avgDeep < 70) {
        return ok("Sommeil profond réduit", `Moyenne ${avgDeep}min de deep sleep — besoin de fenêtre de sommeil plus régulière.`, "info");
      }
      return skip;
    },
    // 9. Sommeil excellent
    (w, days) => {
      const solidNights = days.filter(d => d.sleep && d.sleep.hours >= 8 && d.sleep.efficiency >= 90).length;
      if (solidNights >= 4) {
        return ok("Sommeil solide", `${solidNights}/7 nuits ≥8h avec efficacité ≥90 % — excellent carburant récup.`, "win");
      }
      return skip;
    },
    // 10. Recovery moyenne élevée
    (w) => {
      if (w.metrics.recovery_avg && w.metrics.recovery_avg >= 80) {
        return ok("Récupération supérieure", `Recovery moyenne ${w.metrics.recovery_avg} % — corps en état optimal.`, "win");
      }
      if (w.metrics.recovery_avg && w.metrics.recovery_avg < 50) {
        return ok("Récupération basse", `Recovery moyenne ${w.metrics.recovery_avg} % — charge mal absorbée.`, "alert");
      }
      return skip;
    },
    // 11. SpO2 anormalement bas
    (w, days) => {
      const lowDays = days.filter(d => d.zscores && d.zscores.spo2 < -1.5);
      if (lowDays.length >= 2) {
        return ok("SpO2 bas", `${lowDays.length}j avec SpO2 sous baseline — sous-oxygénation possible (altitude, fatigue, maladie).`, "warn");
      }
      return skip;
    },
  ];

  // ─── VOIX COACH : exécution, charge, structure ──────────────────────────────
  const COACH_DETECTORS = [
    // 1. ACWR zone verte
    (w) => {
      const r = w.metrics.acwr;
      if (r && r >= 0.8 && r <= 1.3) {
        return ok("ACWR en zone verte", `Ratio aigu/chronique ${r} — charge bien dosée.`, "info");
      }
      return skip;
    },
    // 2. ACWR zone rouge (>1.5)
    (w) => {
      if (w.metrics.acwr > 1.5) {
        return ok("Surcharge aiguë", `ACWR ${w.metrics.acwr} — risque de blessure ou maladie élevé. Décharger impérativement.`, "alert");
      }
      return skip;
    },
    // 3. Sous-charge (ACWR < 0.7)
    (w) => {
      if (w.metrics.acwr && w.metrics.acwr < 0.7 && !w.incidents.illness) {
        return ok("Sous-charge", `ACWR ${w.metrics.acwr} — fenêtre pour monter le volume progressivement.`, "info");
      }
      return skip;
    },
    // 4. Polarisation correcte (80/20)
    (w) => {
      const ratio = w.metrics.polarization_ratio;
      if (ratio && ratio >= 0.75 && ratio <= 0.85) {
        return ok("Polarisation 80/20", `${Math.round(ratio * 100)} % de la charge en Z1-Z2 — distribution conforme Seiler.`, "win");
      }
      return skip;
    },
    // 5. Trop d'intensité (seuil + Z4/Z5 > 30%)
    (w) => {
      const t = w.metrics.threshold_ratio;
      if (t && t > 0.3) {
        return ok("Trop d'intensité", `${Math.round(t * 100)} % en zone seuil/haute — tu grilles tes mitochondries, reviens en Z2.`, "warn");
      }
      return skip;
    },
    // 6. Volume total au-dessus de la moyenne 12 sem
    (w, days, ctx) => {
      const strain = w.metrics.strain_total;
      if (ctx && strain > ctx.median_strain_12w * 1.25) {
        return ok("Semaine à gros volume", `Strain ${strain} (> 125 % médiane 12 sem). Ressens-tu la fatigue ?`, "info");
      }
      return skip;
    },
    // 7. Décharge volontaire
    (w, days, ctx) => {
      if (w.signature === "Décharge planifiée" || w.signature === "Décharge subie") {
        return ok("Semaine de décharge", `Signature "${w.signature}". Laisse ton corps intégrer le travail des 3 dernières semaines.`, "info");
      }
      return skip;
    },
    // 8. Long bike IM (>= 2h30)
    (w, days) => {
      const longBikes = [];
      days.forEach(d => (d.activities || []).forEach(a => {
        if ((a.type === "Ride" || a.type === "Cycling") && a.duration_min >= 150) longBikes.push(a);
      }));
      if (longBikes.length) {
        const maxH = Math.max(...longBikes.map(a => a.duration_min)) / 60;
        return ok("Sortie longue vélo", `Pilier IM coché : ${longBikes.length} sortie(s) vélo ≥ 2h30 (max ${maxH.toFixed(1)}h).`, "win");
      }
      return skip;
    },
    // 9. Long run endurance
    (w, days) => {
      const longRuns = [];
      days.forEach(d => (d.activities || []).forEach(a => {
        if ((a.type === "Run" || a.type === "Running") && a.duration_min >= 75) longRuns.push(a);
      }));
      if (longRuns.length) {
        const maxH = Math.max(...longRuns.map(a => a.duration_min)) / 60;
        return ok("Sortie longue course", `${longRuns.length} sortie(s) course ≥ 1h15 (max ${maxH.toFixed(1)}h). Adaptation aérobie en cours.`, "win");
      }
      return skip;
    },
    // 10. Natation absente
    (w, days) => {
      const swims = days.flatMap(d => (d.activities || []).filter(a => a.type === "Swim" || a.type === "Swimming"));
      if (swims.length === 0 && w.metrics.session_count > 0) {
        return ok("Natation absente", `0 séance nat cette semaine — à 77j de Thun, la nat reste le point de levier.`, "warn");
      }
      return skip;
    },
    // 11. Cohérence triple
    (w, days) => {
      const types = new Set();
      days.forEach(d => (d.activities || []).forEach(a => {
        if (["Run", "Running"].includes(a.type)) types.add("run");
        else if (["Ride", "Cycling"].includes(a.type)) types.add("bike");
        else if (["Swim", "Swimming"].includes(a.type)) types.add("swim");
      }));
      if (types.size === 3) {
        return ok("Triple discipline couverte", `Run + vélo + nat dans la même semaine — semaine IM équilibrée.`, "win");
      }
      return skip;
    },
    // 12. Gap entraînement > 4j
    (w, days) => {
      let maxGap = 0;
      let currentGap = 0;
      days.forEach(d => {
        if (!d.activities || d.activities.length === 0) currentGap++;
        else { maxGap = Math.max(maxGap, currentGap); currentGap = 0; }
      });
      maxGap = Math.max(maxGap, currentGap);
      if (maxGap >= 4) {
        return ok("Interruption longue", `${maxGap} jours consécutifs sans activité. Reprise progressive recommandée.`, "info");
      }
      return skip;
    },
  ];

  // ─── VOIX DATA : patterns, comparaisons, tendances ──────────────────────────
  const DATA_DETECTORS = [
    // 1. Signature récurrente
    (w, days, ctx) => {
      if (!ctx || !ctx.signature_frequency) return skip;
      const count = ctx.signature_frequency[w.signature] || 0;
      if (count >= 3 && ["Charge brute", "Choc immunitaire", "Overreach confirmé"].includes(w.signature)) {
        return ok("Pattern récurrent détecté", `"${w.signature}" × ${count} cette saison — ce scénario se répète, examine les causes structurelles.`, "warn");
      }
      return skip;
    },
    // 2. Événement anormal dans la semaine
    (w) => {
      const events = w.events || [];
      const anomalies = events.filter(e => ["strain_peak", "recovery_crash"].includes(e.type));
      if (anomalies.length >= 2) {
        return ok("Anomalies multiples", `${anomalies.length} anomalies détectées (${anomalies.map(e => e.type).join(", ")}).`, "warn");
      }
      return skip;
    },
    // 3. Breakthrough confirmé
    (w) => {
      const breakthroughs = (w.events || []).filter(e => e.type === "breakthrough");
      if (breakthroughs.length) {
        return ok("Breakthrough confirmé", `${breakthroughs.length} séance(s) au-dessus de ta signature habituelle — progression réelle.`, "win");
      }
      return skip;
    },
    // 4. Tendance récup en baisse sur 3 semaines
    (w, days, ctx) => {
      if (!ctx || !ctx.recovery_trend_3w) return skip;
      const slope = ctx.recovery_trend_3w;
      if (slope < -5) {
        return ok("Récupération en chute", `Recovery moy. descendante sur 3 semaines (-${Math.abs(slope).toFixed(1)}/sem). Fatigue accumulée.`, "warn");
      }
      if (slope > 5) {
        return ok("Récupération en hausse", `Recovery moy. en progression (+${slope.toFixed(1)}/sem). Adaptation réussie.`, "win");
      }
      return skip;
    },
    // 5. Tendance HRV sur 3 semaines
    (w, days, ctx) => {
      if (!ctx || !ctx.hrv_trend_3w) return skip;
      const slope = ctx.hrv_trend_3w;
      if (slope < -2) {
        return ok("HRV en dérive négative", `HRV moy. descendante sur 3 semaines (-${Math.abs(slope).toFixed(1)}ms/sem). Système nerveux saturé.`, "alert");
      }
      return skip;
    },
    // 6. Volume progressif sur 3 semaines
    (w, days, ctx) => {
      if (!ctx || !ctx.volume_trend_3w) return skip;
      const slope = ctx.volume_trend_3w;
      if (slope > 10 && w.metrics.acwr && w.metrics.acwr <= 1.3) {
        return ok("Progression volume maîtrisée", `Volume hebdo ${slope > 0 ? "+" : ""}${slope.toFixed(0)}min/sem, ACWR maîtrisé — build réussi.`, "win");
      }
      return skip;
    },
    // 7. Semaine similaire à un épisode à risque passé
    (w, days, ctx) => {
      if (!ctx || !ctx.similar_risk_week) return skip;
      const ref = ctx.similar_risk_week;
      return ok(
        "Semaine similaire à une précédente à risque",
        `Pattern proche de la semaine ${ref.id} (${ref.signature}) — surveille RHR/skin temp.`,
        "warn"
      );
    },
    // 8. Cohérence plan prévu / réalisé (si dispo)
    (w, days, ctx) => {
      // Placeholder — nécessite comparaison plan → réalité (pas encore persistée)
      return skip;
    },
    // 9. Premier jour du meilleur HRV de l'année
    (w, days, ctx) => {
      if (!ctx || !ctx.hrv_max_day) return skip;
      const match = days.find(d => d.date === ctx.hrv_max_day);
      if (match) {
        return ok("Record HRV de la saison", `Le ${ctx.hrv_max_day}, HRV à ${match.hrv}ms — ton meilleur niveau de l'année.`, "win");
      }
      return skip;
    },
    // 10. Variance de récup élevée
    (w, days) => {
      const recs = days.map(d => d.recovery).filter(Number.isFinite);
      if (recs.length < 3) return skip;
      const mean = recs.reduce((a,b)=>a+b,0) / recs.length;
      const variance = recs.reduce((a,b)=>a+(b-mean)**2,0) / recs.length;
      const stdev = Math.sqrt(variance);
      if (stdev > 20) {
        return ok("Récup instable", `Écart-type ${Math.round(stdev)} pts — semaine aux extrêmes (jours très haut / très bas).`, "info");
      }
      return skip;
    },
    // 11. Comparaison vs médiane saison
    (w, days, ctx) => {
      if (!ctx || !ctx.median_volume_season) return skip;
      const med = ctx.median_volume_season;
      if (w.metrics.volume_min > med * 1.5) {
        return ok("Volume record", `${w.metrics.volume_min}min cette semaine (+${Math.round((w.metrics.volume_min/med - 1)*100)}% vs médiane saison).`, "win");
      }
      return skip;
    },
  ];

  // ─── CONTEXTE SAISON (calculé une fois) ─────────────────────────────────────
  function buildSeasonContext(history) {
    const weeks = history.weeks || [];
    const daily = history.daily || [];

    const sigFreq = {};
    weeks.forEach(w => { sigFreq[w.signature] = (sigFreq[w.signature] || 0) + 1; });

    const strainValues = weeks.map(w => w.metrics.strain_total).filter(Number.isFinite).sort((a,b)=>a-b);
    const medStrain = strainValues.length ? strainValues[Math.floor(strainValues.length/2)] : 0;

    const volValues = weeks.map(w => w.metrics.volume_min).filter(Number.isFinite).sort((a,b)=>a-b);
    const medVol = volValues.length ? volValues[Math.floor(volValues.length/2)] : 0;

    // HRV max day
    let hrvMaxDay = null; let hrvMax = -Infinity;
    daily.forEach(d => { if (d.hrv && d.hrv > hrvMax) { hrvMax = d.hrv; hrvMaxDay = d.date; } });

    return {
      signature_frequency: sigFreq,
      median_strain_12w: medStrain,
      median_volume_season: medVol,
      hrv_max_day: hrvMaxDay,
      hrv_max_value: hrvMax,
    };
  }

  // Trend simple sur 3 semaines glissantes (slope approx)
  function addLocalContext(w, weekIndex, weeks) {
    const window = weeks.slice(Math.max(0, weekIndex - 2), weekIndex + 1);
    if (window.length < 3) return {};
    const recs = window.map(x => x.metrics.recovery_avg).filter(Number.isFinite);
    const hrvs = window.map(x => x.metrics.hrv_avg).filter(Number.isFinite);
    const vols = window.map(x => x.metrics.volume_min).filter(Number.isFinite);
    const slope = arr => arr.length >= 2 ? (arr[arr.length - 1] - arr[0]) / (arr.length - 1) : 0;
    return {
      recovery_trend_3w: recs.length >= 2 ? slope(recs) : null,
      hrv_trend_3w: hrvs.length >= 2 ? slope(hrvs) : null,
      volume_trend_3w: vols.length >= 2 ? slope(vols) : null,
    };
  }

  // ─── API : runDetectors(week) ──────────────────────────────────────────────
  function runDetectors(week, allDays, seasonCtx, localCtx = {}) {
    const weekDays = (allDays || []).filter(d =>
      d.date >= week.start_date && d.date <= week.end_date
    );
    const ctx = { ...seasonCtx, ...localCtx };
    const run = (list) => list.map(fn => {
      try { return fn(week, weekDays, ctx); } catch (e) { return skip; }
    }).filter(r => r.triggered);

    return {
      physio: run(PHYSIO_DETECTORS),
      coach: run(COACH_DETECTORS),
      data: run(DATA_DETECTORS),
    };
  }

  // ─── API : computeAllWeekVoices() pour la page archive ─────────────────────
  function computeAllWeekVoices() {
    const H = window.HISTORY;
    if (!H) return {};
    const seasonCtx = buildSeasonContext(H);
    const out = {};
    H.weeks.forEach((w, i) => {
      const local = addLocalContext(w, i, H.weeks);
      out[w.id] = runDetectors(w, H.daily, seasonCtx, local);
    });
    return out;
  }

  // ─── SIMILARITÉ SEMAINES (L2 sur vecteur signature) ────────────────────────
  function weekVector(w) {
    const m = w.metrics;
    return [
      m.recovery_avg || 0,
      m.strain_total || 0,
      m.hrv_avg || 0,
      m.hrv_trend || 0,
      m.acwr || 0,
      m.flag_count || 0,
      m.volume_min || 0,
      m.polarization_ratio || 0,
      m.threshold_ratio || 0,
      m.session_count || 0,
    ];
  }

  function l2(v1, v2) {
    let s = 0;
    for (let i = 0; i < v1.length; i++) s += (v1[i] - v2[i]) ** 2;
    return Math.sqrt(s);
  }

  function normalizeMatrix(weeks) {
    const vecs = weeks.map(weekVector);
    const n = vecs[0].length;
    const means = new Array(n).fill(0);
    const stds = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      const col = vecs.map(v => v[i]);
      const mean = col.reduce((a, b) => a + b, 0) / col.length;
      means[i] = mean;
      const variance = col.reduce((a, b) => a + (b - mean) ** 2, 0) / col.length;
      stds[i] = Math.sqrt(variance) || 1;
    }
    return vecs.map(v => v.map((x, i) => (x - means[i]) / stds[i]));
  }

  function similarWeeks(targetId, topK = 3) {
    const H = window.HISTORY;
    if (!H) return [];
    const normalized = normalizeMatrix(H.weeks);
    const targetIdx = H.weeks.findIndex(w => w.id === targetId);
    if (targetIdx < 0) return [];
    const target = normalized[targetIdx];
    const scores = normalized.map((v, i) => ({
      week: H.weeks[i],
      distance: i === targetIdx ? Infinity : l2(target, v),
    }));
    return scores.sort((a, b) => a.distance - b.distance).slice(0, topK);
  }

  // ─── ALARMES À MÉMOIRE (localStorage) ───────────────────────────────────────
  const ALARMS_KEY = "coach-ia:alarms";

  function loadAlarms() {
    try { return JSON.parse(localStorage.getItem(ALARMS_KEY) || "{}"); } catch { return {}; }
  }

  function saveAlarms(alarms) {
    try { localStorage.setItem(ALARMS_KEY, JSON.stringify(alarms)); } catch {}
  }

  // Crée / met à jour une alarme. Si déjà active, on garde le first_seen.
  function raiseAlarm(id, payload) {
    const alarms = loadAlarms();
    const existing = alarms[id];
    const now = Date.now();
    alarms[id] = {
      id,
      ...payload,
      first_seen: existing ? existing.first_seen : now,
      last_seen: now,
      status: "active",
    };
    saveAlarms(alarms);
    return alarms[id];
  }

  // Résout auto : si la condition disparaît pendant N cycles, on passe en "resolved"
  function resolveAlarm(id, reason = "auto") {
    const alarms = loadAlarms();
    if (alarms[id]) {
      alarms[id].status = "resolved";
      alarms[id].resolved_at = Date.now();
      alarms[id].resolved_reason = reason;
      saveAlarms(alarms);
    }
  }

  function listActiveAlarms() {
    const alarms = loadAlarms();
    return Object.values(alarms).filter(a => a.status === "active");
  }

  function clearAllAlarms() {
    try { localStorage.removeItem(ALARMS_KEY); } catch {}
  }

  // Pass auto : génère les alarmes courantes depuis la semaine actuelle
  function computeCurrentAlarms() {
    const H = window.HISTORY;
    if (!H) return [];
    const lastWeek = H.weeks[H.weeks.length - 1];
    const lastDay = H.daily[H.daily.length - 1];
    if (!lastWeek || !lastDay) return [];

    const currentIds = new Set();
    const raised = [];

    // Alarme 1 : illness active
    if (lastDay.journal && lastDay.journal.illness) {
      currentIds.add("illness_active");
      raised.push(raiseAlarm("illness_active", {
        label: "Maladie en cours",
        message: "Journal signale maladie ce matin. Plan en mode récupération forcée.",
        severity: "alert",
        source: "physio",
      }));
    }

    // Alarme 2 : composite flag ≥3
    if (lastDay.composite_flag && lastDay.composite_flag.count >= 3) {
      currentIds.add("autonomic_shift");
      raised.push(raiseAlarm("autonomic_shift", {
        label: "Stress autonomique",
        message: `${lastDay.composite_flag.count}/4 marqueurs déviants ce matin.`,
        severity: "warn",
        source: "physio",
      }));
    }

    // Alarme 3 : ACWR > 1.5
    if (lastWeek.metrics.acwr > 1.5) {
      currentIds.add("acwr_red");
      raised.push(raiseAlarm("acwr_red", {
        label: "Surcharge aiguë",
        message: `ACWR à ${lastWeek.metrics.acwr} — zone rouge.`,
        severity: "alert",
        source: "coach",
      }));
    }

    // Alarme 4 : signature Charge brute 2 semaines de suite
    const prev = H.weeks[H.weeks.length - 2];
    if (prev && lastWeek.signature === "Charge brute" && prev.signature === "Charge brute") {
      currentIds.add("back_to_back_overload");
      raised.push(raiseAlarm("back_to_back_overload", {
        label: "Surcharge consécutive",
        message: "2 semaines 'Charge brute' d'affilée — décharger obligatoire.",
        severity: "alert",
        source: "coach",
      }));
    }

    // Auto-résolution : tout ID actif non présent → resolved
    const alarms = loadAlarms();
    Object.keys(alarms).forEach(id => {
      if (alarms[id].status === "active" && !currentIds.has(id)) {
        resolveAlarm(id, "condition plus active");
      }
    });

    return raised;
  }

  // ─── API PUBLIQUE ───────────────────────────────────────────────────────────
  window.DETECTORS = {
    PHYSIO: PHYSIO_DETECTORS,
    COACH: COACH_DETECTORS,
    DATA: DATA_DETECTORS,
    runDetectors,
    computeAllWeekVoices,
    buildSeasonContext,
  };
  window.SIMILARITY = { similarWeeks, weekVector };
  window.ALARMS = {
    raise: raiseAlarm,
    resolve: resolveAlarm,
    listActive: listActiveAlarms,
    loadAll: loadAlarms,
    clearAll: clearAllAlarms,
    computeCurrent: computeCurrentAlarms,
  };
})();
