// DASHBOARD.JS — logique et rendu du dashboard
// Lit depuis window.ATHLETES (data.js) et injecte dans le DOM

let athleteActif = "benoit";

// ─── INITIALISATION ───
document.addEventListener("DOMContentLoaded", () => {
  rendreAthlète(athleteActif);
  bindSélecteurAthlète();
  chargerChatInitial();
  document.addEventListener("keydown", e => { if (e.key === "Escape") { fermerModal(); fermerModalScore(); } });
  document.getElementById("modalScore").addEventListener("click", e => { if (e.target === e.currentTarget) fermerModalScore(); });
});

// ─── RENDU PRINCIPAL ───
function rendreAthlète(id) {
  const a = window.ATHLETES[id];
  if (!a) return;

  // Use live computed score if scoring engine has data, else fallback to hardcoded
  const formeAvecScore = _injecterScoreCalculé(a.forme, id);

  rendreHeader(a);
  _renderMorningBriefing(id);
  rendreScore(formeAvecScore);
  _renderWeeklyReview(id);
  rendreAlerte(a.alerte);
  renderDernièreSéance(a.derniereSéance);
  rendreFormeVitaux(formeAvecScore);
  const planAdaptatif = _injecterPlanAdaptatif(a.plan7jours, id);
  rendrePlan7jours(planAdaptatif);
  _renderForecastFatigue(planAdaptatif, id);
  _renderPrescription(planAdaptatif, id);
  _renderAlertCenter(id);
  _renderStreaks(id);
  _renderWeeklyRecap(id);
  _renderInsights(id);
  _renderRecoveryTips(id);
  _renderIllnessBanner(id);
  chargerChatInitial(a);
}

// ─── PANNEAU ÉPISODE IMMUNITAIRE (fenêtre début/fin) ─────────────
function _renderIllnessBanner(athleteId) {
  const banner = document.getElementById("illnessBanner");
  const text = document.getElementById("illnessBannerText");
  const startInput = document.getElementById("illnessStartInput");
  const endInput = document.getElementById("illnessEndInput");
  const saveBtn = document.getElementById("illnessSaveBtn");
  const clearBtn = document.getElementById("illnessClearBtn");
  if (!banner || !text || !startInput || !endInput || !saveBtn || !clearBtn) return;

  const Override = window.IllnessOverride;
  if (athleteId !== "benoit" || !Override) {
    banner.style.display = "none";
    return;
  }

  const win = Override.get();
  const hasRecentIllness = !!(window.HISTORY?.daily?.slice(-30).some(d => d?.journal?.illness));

  // On affiche le panneau si trace récente OU si l'utilisateur a déjà défini une fenêtre
  if (!hasRecentIllness && !win) {
    banner.style.display = "none";
    return;
  }

  banner.style.display = "block";

  const fmt = ts => {
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  // Pré-remplir : début = 1er jour de maladie auto-détecté, fin = aujourd'hui
  const firstIllness = Override.getFirstIllnessTimestampInJournal?.();
  const lastIllness = Override.getLastIllnessTimestampInJournal?.();
  startInput.value = win?.startDate ? fmt(win.startDate) : (firstIllness ? fmt(firstIllness) : "");
  endInput.value = win?.endDate ? fmt(win.endDate) : "";

  // Texte d'état
  if (win?.endDate && win.endDate < Date.now() - 86400000) {
    const days = Math.floor((Date.now() - win.endDate) / 86400000);
    text.innerHTML = `Épisode marqué terminé il y a <strong>${days}j</strong>. Le plan est repassé en mode normal.`;
  } else if (win?.startDate && win?.endDate) {
    text.innerHTML = `Fenêtre définie du <strong>${fmt(win.startDate)}</strong> au <strong>${fmt(win.endDate)}</strong>.`;
  } else if (Override.isEpisodeOngoing()) {
    const d = Override.daysSinceActiveIllness();
    text.innerHTML = `Trace de maladie ${d != null ? `J+${d}` : "récente"}. Précise les dates pour ajuster le plan (le coach tiendra compte de la vraie fenêtre).`;
  } else {
    text.innerHTML = "Indique les dates de l'épisode pour ajuster le plan.";
  }

  saveBtn.onclick = () => {
    const s = startInput.value ? new Date(startInput.value + "T00:00:00").getTime() : null;
    const e = endInput.value ? new Date(endInput.value + "T23:59:59").getTime() : null;
    if (!s && !e) {
      alert("Renseigne au moins une date (début ou fin).");
      return;
    }
    if (s && e && e < s) {
      alert("La date de fin doit être après la date de début.");
      return;
    }
    Override.setWindow(s, e);
    location.reload();
  };

  clearBtn.onclick = () => {
    if (confirm("Réinitialiser les dates ? L'inférence automatique reprend.")) {
      Override.clear();
      location.reload();
    }
  };
}

// ─── LOT 42 : BRIEFING MATIN AUTO ─────────────────────
function _renderMorningBriefing(athleteId) {
  const card = document.getElementById("morningBriefCard");
  if (!card) return;
  if (athleteId !== "benoit" || !window.HISTORY?.daily?.length) { card.style.display = "none"; return; }
  card.style.display = "block";

  const now = new Date();
  const H = hour => now.getHours() >= hour;
  const partieJour = now.getHours() < 5 ? "nuit"
    : now.getHours() < 12 ? "matin"
    : now.getHours() < 18 ? "après-midi"
    : "soir";
  const salut = now.getHours() < 12 ? "Bonjour Benoît" : now.getHours() < 18 ? "Bon après-midi" : "Bonsoir";
  const icon = now.getHours() < 11 ? "☀️" : now.getHours() < 18 ? "🌤️" : "🌙";

  document.getElementById("morningBriefIcon").textContent = icon;
  document.getElementById("morningBriefSalut").textContent = salut;
  document.getElementById("morningBriefDate").textContent = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  const daily = window.HISTORY.daily;
  const lastDay = daily[daily.length - 1];
  const last7 = daily.slice(-7);
  const avg = (arr, f) => {
    const vs = arr.map(f).filter(v => typeof v === "number");
    return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null;
  };
  const hrv = lastDay?.hrv;
  const hrv7 = avg(last7, d => d.hrv);
  const baseline = lastDay?.baselines?.hrv?.median || hrv7;
  const hrvDelta = (hrv && baseline) ? hrv - baseline : null;
  const sleepH = lastDay?.sleep?.hours;
  const recov = lastDay?.recovery;

  // Titre contextuel
  let title;
  if (hrvDelta != null && hrvDelta < -5) title = "Corps qui encaisse — on écoute";
  else if (hrvDelta != null && hrvDelta > 5) title = "Signaux verts — on peut avancer";
  else if (sleepH != null && sleepH < 6.5) title = "Nuit courte — reset prioritaire";
  else if (sleepH != null && sleepH >= 8) title = "Sommeil solide — corps rechargé";
  else title = "Signaux dans la normale";

  document.getElementById("morningBriefTitle").textContent = title;

  // Corps du briefing
  const parts = [];
  if (sleepH != null) {
    parts.push(`Nuit de ${sleepH.toFixed(1)}h${sleepH >= 7.5 ? " — bon socle" : sleepH < 7 ? " — un peu courte" : ""}.`);
  }
  if (hrv != null) {
    const tendance = hrvDelta == null ? "" : hrvDelta >= 2 ? ` (+${hrvDelta.toFixed(0)} vs baseline, système parasympathique qui prend la main)`
      : hrvDelta <= -2 ? ` (${hrvDelta.toFixed(0)} vs baseline, à surveiller)` : " (dans la moyenne)";
    parts.push(`HRV à ${hrv.toFixed(0)}ms${tendance}.`);
  }
  if (recov != null) {
    parts.push(`Recovery Whoop ${recov}% — ${recov >= 70 ? "zone verte" : recov >= 40 ? "zone jaune" : "zone rouge"}.`);
  }
  // Post-grippe context
  const illnessEnd = _findLastIllnessEnd(daily);
  if (illnessEnd !== null) {
    const j = Math.floor((Date.now() - illnessEnd) / 86400000);
    if (j <= 14) parts.push(`J+${j} de la sortie d'épisode immunitaire.`);
  }

  document.getElementById("morningBriefBody").textContent = parts.join(" ");

  // KPIs
  const kpis = [];
  if (hrv != null) kpis.push({ label: "HRV", val: hrv.toFixed(0) + "ms", color: "#00D4AA" });
  if (sleepH != null) kpis.push({ label: "Sommeil", val: sleepH.toFixed(1) + "h", color: "#6C63FF" });
  if (recov != null) kpis.push({ label: "Recovery", val: recov + "%", color: "#A9A3FF" });
  document.getElementById("morningBriefKpis").innerHTML = kpis.map(k => `
    <div style="display:flex;flex-direction:column;gap:2px;">
      <span style="font-size:0.64rem;color:#8B8FA8;text-transform:uppercase;letter-spacing:0.06em;">${k.label}</span>
      <span style="font-size:0.95rem;font-weight:700;color:${k.color};">${k.val}</span>
    </div>
  `).join("");

  // Focus du jour
  let focus;
  if (partieJour === "matin") {
    if (hrvDelta != null && hrvDelta < -5) focus = "🎯 Focus aujourd'hui : charge allégée, pas de brique. Sommeil prioritaire ce soir.";
    else if (illnessEnd !== null && (Date.now() - illnessEnd) < 14 * 86400000) focus = "🎯 Focus aujourd'hui : reprise douce, durée plutôt qu'intensité. Journal du jour avant 10h.";
    else focus = "🎯 Focus aujourd'hui : exécuter le plan, remplir le journal, écouter les sensations.";
  } else if (partieJour === "après-midi") {
    focus = "🎯 Focus fin de journée : récupération post-séance, hydratation, début de soirée calme pour viser 8h de sommeil.";
  } else {
    focus = "🎯 Focus du soir : préparation sommeil (lumière basse, pas d'écran). Viser 22h30 au lit.";
  }
  document.getElementById("morningBriefFocus").textContent = focus;
}

function _findLastIllnessEnd(daily) {
  let lastEndTs = null;
  let inEpisode = false;
  for (const d of daily) {
    if (d.journal?.illness) inEpisode = true;
    else if (inEpisode) { lastEndTs = d.timestamp; inEpisode = false; }
  }
  // Override utilisateur (date de fin manuelle) prioritaire s'il est plus récent
  const win = window.IllnessOverride && window.IllnessOverride.get();
  const overrideEnd = win && win.endDate ? win.endDate : null;
  if (overrideEnd && (!lastEndTs || overrideEnd > lastEndTs)) return overrideEnd;
  return lastEndTs;
}

// ─── LOT 41 : INSIGHTS AUTOMATIQUES ─────────────────────
function _renderInsights(athleteId) {
  const card = document.getElementById("insightsCard");
  if (!card) return;
  if (athleteId !== "benoit" || !window.HISTORY?.daily?.length) { card.style.display = "none"; return; }
  card.style.display = "block";

  const insights = _detectInsights();

  const sub = document.getElementById("insightsSub");
  sub.textContent = insights.length
    ? `${insights.length} pattern${insights.length > 1 ? "s" : ""} détecté${insights.length > 1 ? "s" : ""} — ordre de priorité`
    : "Pas de pattern notable détecté";

  const badge = document.getElementById("insightsBadge");
  badge.textContent = `${insights.length} insight${insights.length > 1 ? "s" : ""}`;
  badge.className = insights.length ? "badge badge-violet" : "badge";

  const list = document.getElementById("insightsList");
  if (!insights.length) {
    list.innerHTML = `<div style="padding:16px;text-align:center;color:#00D4AA;font-size:0.84rem;">✓ Données stables — rien de notable à signaler ce matin.</div>`;
    return;
  }
  list.innerHTML = insights.map(i => `
    <div style="display:flex;gap:12px;padding:12px 14px;background:rgba(255,255,255,0.02);border-left:3px solid ${i.color};border-radius:8px;">
      <div style="font-size:1.1rem;flex-shrink:0;">${i.icon}</div>
      <div style="flex:1;">
        <div style="font-size:0.85rem;color:#F0F0F5;font-weight:700;margin-bottom:4px;">${i.title}</div>
        <div style="font-size:0.78rem;color:#D0D0E0;line-height:1.45;">${i.detail}</div>
        ${i.action ? `<div style="font-size:0.72rem;color:#8B8FA8;font-style:italic;margin-top:6px;">→ ${i.action}</div>` : ""}
      </div>
    </div>
  `).join("");
}

function _detectInsights() {
  const insights = [];
  const H = window.HISTORY;
  const daily = H.daily;
  const last7 = daily.slice(-7);
  const prev7 = daily.slice(-14, -7);
  const lastDay = daily[daily.length - 1];

  const avg = (arr, f) => {
    const vs = arr.map(f).filter(v => typeof v === "number");
    return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null;
  };

  // 1) Corrélation sommeil/HRV sur 14j
  const pairs = daily.slice(-14).filter(d => typeof d.sleep?.hours === "number" && typeof d.hrv === "number");
  if (pairs.length >= 8) {
    const xs = pairs.map(d => d.sleep.hours), ys = pairs.map(d => d.hrv);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
    let num = 0, dx = 0, dy = 0;
    for (let i = 0; i < xs.length; i++) { num += (xs[i]-mx)*(ys[i]-my); dx += (xs[i]-mx)**2; dy += (ys[i]-my)**2; }
    const r = num / Math.sqrt(dx * dy);
    if (!isNaN(r) && Math.abs(r) > 0.5) {
      insights.push({
        icon: r > 0 ? "🔗" : "⚠️",
        color: r > 0 ? "#00D4AA" : "#FF6B6B",
        title: r > 0 ? `Sommeil ↔ HRV : corrélation forte (r=${r.toFixed(2)})` : `Sommeil ↔ HRV : anti-corrélation (r=${r.toFixed(2)})`,
        detail: r > 0
          ? "Quand tu dors plus, ton HRV grimpe le lendemain. Le lien est net sur les 14 derniers jours."
          : "Pattern inattendu : plus tu dors, plus ton HRV baisse. Probable confusion avec un autre facteur (stress, charge).",
        action: r > 0 ? "Capitalise : cibler 7h30+ sur les nuits pré-séance intense." : null,
      });
    }
  }

  // 2) Évolution HRV 7j vs 7j précédents
  const hrv7 = avg(last7, d => d.hrv), hrvPrev = avg(prev7, d => d.hrv);
  if (hrv7 && hrvPrev) {
    const delta = hrv7 - hrvPrev;
    if (Math.abs(delta) >= 4) {
      insights.push({
        icon: delta > 0 ? "📈" : "📉",
        color: delta > 0 ? "#00D4AA" : "#FFD166",
        title: `HRV ${delta > 0 ? "en remontée" : "en baisse"} — ${Math.abs(delta).toFixed(0)}ms sur 7j`,
        detail: `Moyenne 7j : ${hrv7.toFixed(0)}ms, 7j précédents : ${hrvPrev.toFixed(0)}ms. ${delta > 0 ? "Système parasympathique qui reprend la main." : "Système qui encaisse quelque chose."}`,
        action: delta < 0 ? "Regarder charge et sommeil combinés sur la période." : null,
      });
    }
  }

  // 3) Nuits courtes consécutives
  let shortRun = 0;
  for (let i = daily.length - 1; i >= 0; i--) {
    if (daily[i].sleep?.hours != null && daily[i].sleep.hours < 7) shortRun++;
    else break;
  }
  if (shortRun >= 3) {
    insights.push({
      icon: "🌙",
      color: "#FF6B6B",
      title: `${shortRun} nuits consécutives sous 7h`,
      detail: `La dette commence à s'accumuler. Un déficit de 1h par nuit × ${shortRun} jours = ${shortRun}h à récupérer.`,
      action: "Viser 8h+ les 2 prochaines nuits pour absorber la dette.",
    });
  }

  // 4) Sortie d'épisode immunitaire
  // Override : si l'utilisateur a marqué une endDate, on calcule J+ depuis cette date
  const _ovWin = window.IllnessOverride && window.IllnessOverride.get();
  let illnessEndJ = null;
  if (_ovWin && _ovWin.endDate) {
    illnessEndJ = Math.floor((Date.now() - _ovWin.endDate) / 86400000);
  } else {
    const idx = daily.slice(0, -1).reverse().findIndex((d, i, arr) => !d.journal?.illness && arr[i - 1]?.journal?.illness);
    if (idx >= 0) illnessEndJ = idx;
  }
  if (illnessEndJ !== null && illnessEndJ >= 0 && illnessEndJ <= 14) {
    insights.push({
      icon: "🛡️",
      color: "#A9A3FF",
      title: `Sortie d'épisode immunitaire — J+${illnessEndJ}`,
      detail: "Corps encore en reconstitution. Les signaux mettent 10-14 jours à revenir à la normale après une grippe.",
      action: "Charge légère privilégiée, pas de brique avant J+14.",
    });
  }

  // 5) Charge aigue vs chronique
  if (lastDay?.baselines?.acwr) {
    const acwr = lastDay.baselines.acwr;
    if (acwr > 1.3) {
      insights.push({
        icon: "⛰️",
        color: "#FF6B6B",
        title: `ACWR à ${acwr.toFixed(2)} — zone risque`,
        detail: "Ratio charge aiguë / charge chronique élevé. Risque de blessure ou d'épuisement en hausse les 2 prochaines semaines.",
        action: "Décharge 40% sur 5-7 jours avant reprise.",
      });
    } else if (acwr < 0.6 && acwr > 0) {
      insights.push({
        icon: "💤",
        color: "#FFD166",
        title: `ACWR à ${acwr.toFixed(2)} — sous-charge`,
        detail: "Charge récente très en dessous de ta moyenne. Phase de repos, transition ou maladie.",
        action: "Reprise progressive, +10% de volume par semaine max.",
      });
    }
  }

  // 6) Streak positif (bonne nouvelle)
  let goodRun = 0;
  for (let i = daily.length - 1; i >= 0; i--) {
    if (daily[i].sleep?.hours >= 7.5) goodRun++;
    else break;
  }
  if (goodRun >= 4) {
    insights.push({
      icon: "✨",
      color: "#00D4AA",
      title: `${goodRun} nuits consécutives à 7h30+`,
      detail: "Régularité de sommeil exceptionnelle — c'est exactement le socle qu'il faut pour absorber la charge à venir.",
      action: "Conserver ce rythme jusqu'à la phase peak.",
    });
  }

  // Tri : rouge/orange avant vert, max 5 insights
  const prio = { "#FF6B6B": 0, "#FFD166": 1, "#A9A3FF": 2, "#00D4AA": 3 };
  insights.sort((a, b) => (prio[a.color] ?? 9) - (prio[b.color] ?? 9));
  return insights.slice(0, 5);
}

// ─── LOT 47 : TIPS RÉCUP SELON SIGNATURE ─────────────────────
const RECOVERY_TIPS = {
  "Choc immunitaire": {
    color: "#FF8FA3",
    angle: "Le système immunitaire reprend la main. Priorité : ne pas retomber.",
    tips: [
      { icon: "🛌", title: "Sommeil = médicament #1", detail: "Viser 8h30 minimum chaque nuit pendant 7-10j. Les lymphocytes se régénèrent pendant le sommeil profond." },
      { icon: "🍊", title: "Nutrition anti-inflammatoire", detail: "Vitamine C (agrumes, kiwi), zinc (œufs, fruits de mer), oméga 3. Éviter alcool et sucre rapide — ils suppriment l'immunité 3-5h." },
      { icon: "🚶", title: "Reprise progressive 20min max", detail: "Marche active puis Z1 vélo en home trainer. Remonter seulement quand RHR revient à la baseline (~52 bpm chez toi)." },
      { icon: "🧘", title: "Pas d'entraînement à jeun", detail: "Le corps doit reconstituer ses réserves immunitaires avant d'encaisser un stress métabolique supplémentaire." },
    ],
    footer: "Règle d'or : si tes VFC reste 10% sous baseline 3j de suite, repousse la reprise d'un jour.",
  },
  "Overreach confirmé": {
    color: "#FF4A4A",
    angle: "Tu as poussé au-delà de ta capacité d'encaissement. Plan : décharge franche 5-7j.",
    tips: [
      { icon: "📉", title: "Couper toute intensité", detail: "Aucune séance Z3+ pendant 5-7j. Uniquement Z1-Z2 court (45min max) pour maintenir la circulation." },
      { icon: "😴", title: "Sommeil + sieste 20min/jour", detail: "Le surentraînement perturbe le cortisol — la sieste abaisse la charge sympathique et accélère la compensation." },
      { icon: "🥩", title: "Protéines à chaque repas", detail: "1.8-2.0 g/kg/jour pendant la décharge. Le muscle continue de se reconstruire même sans entraînement." },
      { icon: "📊", title: "Suivre HRV + RHR quotidiens", detail: "Reprise seulement quand HRV remonte au-dessus de baseline 3 matins consécutifs." },
    ],
    footer: "Tentation fréquente : reprendre trop tôt. Attends le vrai signal physiologique, pas l'impatience.",
  },
  "Charge brute": {
    color: "#FF6B6B",
    angle: "Charge forte absorbée. La fenêtre de récup est la variable qui fait basculer en progression ou en overreach.",
    tips: [
      { icon: "💧", title: "Hydratation électrolytes", detail: "2.5-3L d'eau + 1-2g de sodium/jour pendant 48h post-semaine lourde. Tu as transpiré, tes cellules ont besoin." },
      { icon: "🦵", title: "Jambes en l'air 10min/soir", detail: "Favorise le retour veineux, réduit l'œdème musculaire, signal parasympathique." },
      { icon: "🥗", title: "Glucides complexes timing", detail: "150-200g de glucides post-séance longue dans les 2h. Fenêtre métabolique critique à cette charge." },
      { icon: "🔄", title: "1 vraie journée off dans les 7", detail: "Pas de vélo, pas de course. Marche + étirements seulement. Donne au corps la bouffée pour absorber." },
    ],
    footer: "À cette signature, la récup devient une séance à part entière. Traite-la comme telle.",
  },
  "Rythme de croisière": {
    color: "#00D4AA",
    angle: "Équilibre charge/récup tenu. Objectif : entretenir la machine sans perdre le fil.",
    tips: [
      { icon: "🧘", title: "Mobilité 15min × 3/semaine", detail: "Hanches, chevilles, épaules. À cette phase, c'est ce qui prévient les blessures de volume." },
      { icon: "🍽️", title: "Nutrition cohérente", detail: "Évite les gros écarts caloriques week-end. La régularité nourrit la régularité d'entraînement." },
      { icon: "☕", title: "Caféine avant séance clé seulement", detail: "Garde-la comme levier pour les séances qualité — si utilisée tous les jours, plus d'effet boost." },
      { icon: "📖", title: "Journal des sensations", detail: "2 min/jour. La régularité crée la granularité qui te permettra d'anticiper une dérive avant qu'elle ne devienne un problème." },
    ],
    footer: "En croisière, les petits gains viennent de la constance, pas des coups d'éclat.",
  },
  "Build Z2": {
    color: "#6C63FF",
    angle: "Construction aérobie en cours — l'objectif c'est la densité, pas l'intensité.",
    tips: [
      { icon: "⛽", title: "Fueling pendant séances >90min", detail: "60-90g de glucides/h. Entraîne ton intestin autant que ton métabolisme." },
      { icon: "🎯", title: "Cœur avant watts", detail: "Si ta FC grimpe hors Z2, ralentis même si la puissance reste tenable. La durée passée en Z2 prime sur la distance." },
      { icon: "🛌", title: "Sommeil long weekend", detail: "8h+ la nuit précédant la sortie longue. Le capital glycogène dépend aussi du sommeil." },
      { icon: "🚴", title: "Ride easy après les longues", detail: "Lendemain de 3h+ : 45min Z1 sur home trainer pour drainer, pas off total." },
    ],
    footer: "Le Z2 paie 6-8 semaines plus tard. Patience et régularité > séances héroïques.",
  },
  "Décharge planifiée": {
    color: "#A9A3FF",
    angle: "Phase d'absorption du travail. Ne compense pas par autre chose — c'est le piège classique.",
    tips: [
      { icon: "✂️", title: "Volume -30 à -40%, intensité maintenue courte", detail: "Pas de séance longue. 1-2 rappels courts (20-30min) en Z3-Z4 pour ne pas perdre la vivacité." },
      { icon: "🦶", title: "Massage ou auto-massage 2x", detail: "Utilise la semaine pour traiter les tensions accumulées. Rouleau, balle de tennis, jambes + fessiers." },
      { icon: "🧠", title: "Visualisation course", detail: "10min/j. À cette phase, le cerveau a la bande passante pour travailler la préparation mentale." },
      { icon: "📏", title: "Mesurer sans stresser", detail: "C'est la semaine idéale pour un test VMA court ou un point CTL/ATL. Données propres car frais." },
    ],
    footer: "Si tu termines la décharge fatigué, c'est que ce n'était pas une vraie décharge.",
  },
  "Décharge subie": {
    color: "#FFD166",
    angle: "Activité forcée vers le bas (maladie, vie, stress). L'enjeu : ne pas perdre trop avant de pouvoir reprendre.",
    tips: [
      { icon: "🚶", title: "Maintenir bouger 20-30min/j", detail: "Marche rapide, vélo facile. Garder la circulation active limite la perte cardiovasculaire." },
      { icon: "💪", title: "Travail de force à domicile", detail: "Squat, fentes, core 15min tous les 2j. Préserve la force spécifique pendant que l'endurance encaisse." },
      { icon: "🥗", title: "Ajuster les calories", detail: "Réduire un peu l'apport (-200 à -300 kcal) pour ne pas accumuler sur une période à faible dépense." },
      { icon: "📅", title: "Plan de reprise écrit", detail: "Dès que tu peux, note la progression des 7 premiers jours de reprise. Évite le syndrome 'je compense ce que j'ai perdu'." },
    ],
    footer: "Perdre 1 semaine = 2-3 semaines de reprise graduelle. Respecte ce ratio.",
  },
  "Compétition": {
    color: "#FFD700",
    angle: "Semaine de course. Tout ce qui est fait maintenant vise à maximiser la fraîcheur pour le jour J.",
    tips: [
      { icon: "🍝", title: "Carb-load J-3 à J-1", detail: "7-10 g/kg de glucides. Augmenter progressivement, pas d'un coup. Moins de fibres J-1 pour alléger le transit." },
      { icon: "😴", title: "J-2 > J-1 pour le sommeil", detail: "La nuit qui compte le plus est celle à 2 jours — J-1 est souvent courte à cause du stress. Ne pas paniquer." },
      { icon: "🏃", title: "Séances d'activation courtes", detail: "J-3 : 30min avec 3×30\" à allure course. J-1 : 15min tranquille + 2 accélérations. Réveiller sans fatiguer." },
      { icon: "🧘", title: "Routine mentale pré-course", detail: "Visualise les 3 moments-clés : départ, passage dur, ligne d'arrivée. 10min × 2j avant course." },
    ],
    footer: "La préparation physique est terminée. À cette phase, la confiance se joue sur les détails logistiques.",
  },
};

function _renderRecoveryTips(athleteId) {
  const card = document.getElementById("recoveryTipsCard");
  if (!card) return;
  if (athleteId !== "benoit" || !window.HISTORY?.weeks?.length) { card.style.display = "none"; return; }

  const W = window.HISTORY.weeks[window.HISTORY.weeks.length - 1];
  const sig = W?.signature;

  // Si signature = Choc immunitaire mais l'athlète a marqué la fin → masquer la carte
  if (sig === "Choc immunitaire" && window.IllnessOverride && !window.IllnessOverride.isEpisodeOngoing()) {
    card.style.display = "none";
    return;
  }

  const cfg = RECOVERY_TIPS[sig];
  if (!cfg) { card.style.display = "none"; return; }

  card.style.display = "block";

  const sub = document.getElementById("recoveryTipsSub");
  if (sub) sub.textContent = cfg.angle;

  const badge = document.getElementById("recoveryTipsBadge");
  if (badge) {
    badge.textContent = `● ${sig}`;
    badge.style.color = cfg.color;
    badge.style.borderColor = cfg.color;
  }

  const list = document.getElementById("recoveryTipsList");
  if (list) {
    list.innerHTML = cfg.tips.map(t => `
      <div style="display:flex;gap:12px;padding:12px 14px;background:rgba(255,255,255,0.02);border-left:3px solid ${cfg.color};border-radius:8px;">
        <div style="font-size:1.2rem;flex-shrink:0;">${t.icon}</div>
        <div style="flex:1;">
          <div style="font-size:0.85rem;color:#F0F0F5;font-weight:700;margin-bottom:4px;">${t.title}</div>
          <div style="font-size:0.78rem;color:#D0D0E0;line-height:1.45;">${t.detail}</div>
        </div>
      </div>
    `).join("");
  }

  const footer = document.getElementById("recoveryTipsFooter");
  if (footer) footer.textContent = cfg.footer;

  // Bouton "Je vais mieux" pour signature immunitaire uniquement
  let endBtn = card.querySelector(".illness-end-btn");
  if (sig === "Choc immunitaire") {
    if (!endBtn) {
      endBtn = document.createElement("button");
      endBtn.className = "illness-end-btn";
      endBtn.style.cssText = "margin-top:14px;padding:11px 14px;background:rgba(0,212,170,0.12);border:1px solid rgba(0,212,170,0.35);border-radius:10px;color:#00D4AA;font-weight:600;font-size:0.85rem;cursor:pointer;width:100%;-webkit-tap-highlight-color:rgba(0,212,170,0.2);";
      endBtn.textContent = "✅ Je vais mieux — marquer la fin de l'épisode";
      endBtn.onclick = () => {
        if (confirm("Marquer la fin de l'épisode immunitaire ? Les conseils repartiront en mode normal.")) {
          window.IllnessOverride.set(Date.now());
          location.reload();
        }
      };
      card.appendChild(endBtn);
    }
  } else if (endBtn) {
    endBtn.remove();
  }
}

// ─── LOT 34 : RÉSUMÉ HEBDO AUTO ─────────────────────────────────
function _renderWeeklyRecap(athleteId) {
  const card = document.getElementById("weeklyRecapCard");
  if (!card) return;
  if (athleteId !== "benoit" || !window.HISTORY?.daily?.length) { card.style.display = "none"; return; }
  card.style.display = "block";

  const daily = window.HISTORY.daily;
  const N = daily.length;
  const current = daily.slice(Math.max(0, N - 7));
  const previous = daily.slice(Math.max(0, N - 14), Math.max(0, N - 7));

  const sum = (arr, f) => arr.reduce((s, d) => s + (f(d) || 0), 0);
  const avg = (arr, f) => {
    const vals = arr.map(f).filter(v => typeof v === "number" && !isNaN(v));
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const countSess = arr => arr.reduce((n, d) => n + (d.activities?.length || 0), 0);
  const volMin    = arr => sum(arr, d => (d.activities || []).reduce((s, a) => s + (a.duration_min || 0), 0));

  const cur = {
    sess: countSess(current),
    vol: volMin(current),
    hrv: avg(current, d => d.hrv),
    sleep: avg(current, d => d.sleep?.hours),
  };
  const prev = {
    sess: countSess(previous),
    vol: volMin(previous),
    hrv: avg(previous, d => d.hrv),
    sleep: avg(previous, d => d.sleep?.hours),
  };

  const fmtHrs = m => m ? (m / 60).toFixed(1) + "h" : "—";
  const delta = (c, p, unit = "", digits = 0) => {
    if (p == null || c == null) return "";
    const d = c - p;
    const sign = d > 0 ? "+" : "";
    const color = Math.abs(d) < (digits === 0 ? 0.5 : 0.05) ? "#8B8FA8" : d > 0 ? "#00D4AA" : "#FF6B6B";
    return `<span style="color:${color};">${sign}${d.toFixed(digits)}${unit}</span>`;
  };

  const first = current[0]?.date, last = current[current.length - 1]?.date;
  const fmtDate = iso => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };
  document.getElementById("weeklyRecapSub").textContent = `${fmtDate(first)} → ${fmtDate(last)}`;

  document.getElementById("weeklyRecapSess").textContent = cur.sess;
  document.getElementById("weeklyRecapSessDelta").innerHTML = delta(cur.sess, prev.sess, "", 0);
  document.getElementById("weeklyRecapVol").textContent = fmtHrs(cur.vol);
  document.getElementById("weeklyRecapVolDelta").innerHTML = cur.vol && prev.vol
    ? delta(cur.vol / 60, prev.vol / 60, "h", 1) : "";
  document.getElementById("weeklyRecapHrv").textContent = cur.hrv ? cur.hrv.toFixed(0) + "ms" : "—";
  document.getElementById("weeklyRecapHrvDelta").innerHTML = delta(cur.hrv, prev.hrv, "ms", 0);
  document.getElementById("weeklyRecapSleep").textContent = cur.sleep ? cur.sleep.toFixed(1) + "h" : "—";
  document.getElementById("weeklyRecapSleepDelta").innerHTML = delta(cur.sleep, prev.sleep, "h", 1);

  // Signature
  const sig = (window.HISTORY.weeks?.[window.HISTORY.weeks.length - 1]?.signature) || "—";
  const badge = document.getElementById("weeklyRecapBadge");
  badge.textContent = sig;
  badge.className = "badge " + (/choc|immunitaire|régénération|regeneration/i.test(sig) ? "badge-coral"
    : /reprise|build/i.test(sig) ? "badge-teal" : "badge-violet");

  // Narrative
  const volDelta = (cur.vol - prev.vol) / 60;
  const hrvDelta = (cur.hrv || 0) - (prev.hrv || 0);
  let narrative;
  if (Math.abs(volDelta) < 1 && Math.abs(hrvDelta) < 3) {
    narrative = `Semaine stable vs. précédente. ${cur.sess} séances, ${fmtHrs(cur.vol)} de volume, HRV et sommeil dans la continuité. Le corps digère la charge.`;
  } else if (volDelta < -2) {
    narrative = `Volume en baisse (${volDelta.toFixed(1)}h) — récupération ou épisode immunitaire. HRV ${hrvDelta >= 0 ? "stable/remontée" : "encore basse"}. ${hrvDelta >= 0 ? "Signal de retour" : "On continue en vigilance"}.`;
  } else if (volDelta > 2 && hrvDelta < -3) {
    narrative = `Charge en hausse (+${volDelta.toFixed(1)}h) mais HRV en baisse (${hrvDelta.toFixed(0)}ms). Signal typique d'accumulation de fatigue — attention à ne pas pousser sur la semaine suivante.`;
  } else if (volDelta > 2) {
    narrative = `Belle reprise : +${volDelta.toFixed(1)}h de volume, ${cur.sess} séances. HRV ${hrvDelta >= 0 ? "tient la route" : "légèrement en retrait"}. Semaine bien encaissée.`;
  } else {
    narrative = `${cur.sess} séances, ${fmtHrs(cur.vol)} de volume. HRV moy. ${cur.hrv ? cur.hrv.toFixed(0) + "ms" : "—"}, sommeil ${cur.sleep ? cur.sleep.toFixed(1) + "h" : "—"}. Signature "${sig}".`;
  }
  document.getElementById("weeklyRecapNarrative").textContent = narrative;
}

// ─── LOT 33 : STREAK TRACKER ─────────────────────────────────
function _renderStreaks(athleteId) {
  const card = document.getElementById("streakCard");
  if (!card) return;
  if (athleteId !== "benoit" || !window.HISTORY?.daily?.length) { card.style.display = "none"; return; }
  card.style.display = "block";

  const DAY_MS = 86400000;
  const daily = window.HISTORY.daily.slice(-30);
  const N = daily.length;

  const hasSession = d => Array.isArray(d.activities) && d.activities.length > 0;
  const hasSleep7  = d => d.sleep && typeof d.sleep.hours === "number" && d.sleep.hours >= 7;

  // Journal: grouper les observations localStorage par jour (YYYY-MM-DD)
  let obs = [];
  try { obs = JSON.parse(localStorage.getItem("coach-ia:obs") || "[]"); } catch {}
  const journalDays = new Set(
    obs.filter(o => o.athlete_id === "benoit")
       .map(o => new Date(o.timestamp).toISOString().slice(0, 10))
  );
  const hasJournal = d => journalDays.has(d.date);

  // Streak courant : partir de la fin et compter consécutifs
  const currentStreak = pred => {
    let n = 0;
    for (let i = N - 1; i >= 0; i--) { if (pred(daily[i])) n++; else break; }
    return n;
  };

  const streakSess = currentStreak(hasSession);
  const streakSleep = currentStreak(hasSleep7);
  const streakJourn = currentStreak(hasJournal);

  const totalSess = daily.filter(hasSession).length;
  const totalSleep = daily.filter(hasSleep7).length;
  const totalJourn = daily.filter(hasJournal).length;

  document.getElementById("streakSessionsCount").textContent = streakSess + "j";
  document.getElementById("streakSleepCount").textContent    = streakSleep + "j";
  document.getElementById("streakJournalCount").textContent  = streakJourn + "j";

  document.getElementById("streakSessionsSub").textContent = `${totalSess}/30 j actifs`;
  document.getElementById("streakSleepSub").textContent    = `${totalSleep}/30 nuits ≥7h`;
  document.getElementById("streakJournalSub").textContent  = `${totalJourn}/30 j remplis`;

  const renderBar = (containerId, pred, color) => {
    const el = document.getElementById(containerId);
    el.innerHTML = daily.map(d => {
      const on = pred(d);
      return `<div title="${d.date}" style="flex:1;height:8px;border-radius:2px;background:${on ? color : "rgba(255,255,255,0.06)"};"></div>`;
    }).join("");
  };
  renderBar("streakSessionsBar", hasSession, "#6C63FF");
  renderBar("streakSleepBar",    hasSleep7,  "#00D4AA");
  renderBar("streakJournalBar",  hasJournal, "#FFD166");

  const best = Math.max(streakSess, streakSleep, streakJourn);
  const bestLabel = best === streakSess ? "séances" : best === streakSleep ? "sommeil" : "journal";
  let narrative;
  if (best >= 5) {
    narrative = `Belle régularité sur ${bestLabel} — ${best} jours d'affilée. La forme se construit dans la répétition, pas dans l'intensité.`;
  } else if (streakJourn === 0 && totalJourn < 5) {
    narrative = `Le journal est peu rempli (${totalJourn}/30 j). Sans ressentis, l'IA travaille à l'aveugle — 2 min par jour changent tout.`;
  } else if (totalSleep < 15) {
    narrative = `Seulement ${totalSleep}/30 nuits à 7h+. Le sommeil est le 1er levier de récupération — viser la régularité avant l'intensité.`;
  } else {
    narrative = `Régularité correcte. Le prochain palier : enchaîner 7 jours sur les trois axes simultanément.`;
  }
  document.getElementById("streakNarrative").textContent = narrative;
}

// ─── LOT 24 : CENTRE D'ALERTES UNIFIÉ ─────────────────────────────────
function _renderAlertCenter(athleteId) {
  const card = document.getElementById("alertCenterCard");
  if (!card) return;
  if (athleteId !== "benoit") { card.style.display = "none"; return; }
  card.style.display = "block";

  const alerts = _collectAlerts(athleteId);
  const sub = document.getElementById("alertCenterSub");
  const list = document.getElementById("alertCenterList");
  const allOk = document.getElementById("alertCenterAllOk");
  const counts = document.getElementById("alertCenterCounts");

  const byLvl = { critical: 0, warning: 0, info: 0 };
  alerts.forEach(a => byLvl[a.severity]++);

  // Counts badges
  const lvlDef = [
    { key: "critical", label: "Critiques", color: "#FF4A4A" },
    { key: "warning", label: "Vigilance", color: "#FFD166" },
    { key: "info", label: "Infos", color: "#A9A3FF" },
  ];
  counts.innerHTML = lvlDef.map(l => byLvl[l.key] > 0 ? `
    <span style="background:${l.color}22;color:${l.color};border:1px solid ${l.color}55;padding:3px 10px;border-radius:10px;font-size:0.7rem;font-weight:700;">
      ${byLvl[l.key]} ${l.label}
    </span>
  ` : "").join("");

  sub.textContent = alerts.length
    ? `${alerts.length} signal${alerts.length > 1 ? "aux" : ""} actif${alerts.length > 1 ? "s" : ""} sur l'ensemble des 8 couches`
    : "Toutes les couches dans le vert";

  if (!alerts.length) {
    allOk.style.display = "block";
    list.innerHTML = "";
    return;
  }
  allOk.style.display = "none";

  const sevColors = { critical: "#FF4A4A", warning: "#FFD166", info: "#A9A3FF" };
  const sevIcons = { critical: "🚨", warning: "⚠️", info: "ℹ️" };
  const sortOrder = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => sortOrder[a.severity] - sortOrder[b.severity]);

  list.innerHTML = alerts.map(a => `
    <div style="display:flex;gap:12px;padding:12px 14px;background:rgba(255,255,255,0.02);border-left:3px solid ${sevColors[a.severity]};border-radius:8px;">
      <div style="font-size:1.1rem;flex-shrink:0;">${sevIcons[a.severity]}</div>
      <div style="flex:1;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px;">
          <div style="font-size:0.88rem;font-weight:700;color:#F0F0F5;">${a.title}</div>
          <div style="font-size:0.68rem;color:${sevColors[a.severity]};text-transform:uppercase;letter-spacing:0.05em;font-weight:700;">${a.source}</div>
        </div>
        <div style="font-size:0.8rem;color:#D0D0E0;margin-bottom:5px;line-height:1.4;">${a.detail}</div>
        ${a.action ? `<div style="font-size:0.76rem;color:#8B8FA8;font-style:italic;">→ ${a.action}</div>` : ""}
      </div>
    </div>
  `).join("");
}

function _collectAlerts(athleteId) {
  const alerts = [];

  // 1) Couches du score (via explainScore)
  if (typeof window.explainScore === "function") {
    try {
      const exp = window.explainScore(athleteId);
      const layerLabels = {
        sommeil: "Sommeil", charge: "Charge d'entraînement", physiologique: "Physiologique",
        psychologique: "Psychologique", biologique: "Biologique", ressentis: "Ressentis",
        nutrition: "Nutrition", genetique: "Génétique",
      };
      if (exp && exp.layers) {
        Object.entries(exp.layers).forEach(([k, v]) => {
          if (v == null || !Number.isFinite(v.score)) return;
          const s = v.score;
          if (s < 40) {
            alerts.push({
              source: layerLabels[k] || k, severity: "critical",
              title: `${layerLabels[k] || k} en zone rouge (${s}/100)`,
              detail: `Le score de cette couche est critique — l'alerte la plus sensible qui pèse sur la forme globale.`,
              action: "Ouvrir Vue 360° pour identifier le signal qui décroche.",
            });
          } else if (s < 55) {
            alerts.push({
              source: layerLabels[k] || k, severity: "warning",
              title: `${layerLabels[k] || k} sous le seuil (${s}/100)`,
              detail: `Dégradation notable — à suivre de près sur les 3 prochains jours.`,
              action: "Journal quotidien recommandé pour identifier le facteur déclencheur.",
            });
          }
        });
      }
    } catch (e) { /* silent */ }
  }

  // 2) ACWR (via HISTORY)
  if (window.HISTORY && window.HISTORY.weeks && window.HISTORY.weeks.length) {
    const lastW = window.HISTORY.weeks[window.HISTORY.weeks.length - 1];
    const acwr = lastW.metrics && lastW.metrics.acwr;
    if (Number.isFinite(acwr)) {
      if (acwr >= 1.5) {
        alerts.push({
          source: "Charge", severity: "critical",
          title: `ACWR à ${acwr.toFixed(2)} — zone de surmenage`,
          detail: "Le ratio charge aiguë / charge chronique dépasse le seuil de rupture. Risque de blessure ou de surentraînement élevé.",
          action: "Décharge active cette semaine (−30% de volume).",
        });
      } else if (acwr >= 1.3) {
        alerts.push({
          source: "Charge", severity: "warning",
          title: `ACWR à ${acwr.toFixed(2)} — zone limite`,
          detail: "Charge soutenue, proche du seuil critique. Bénéfique si tenue 1 semaine, dangereuse si prolongée.",
          action: "Prévoir une semaine d'allègement d'ici 7 jours.",
        });
      } else if (acwr < 0.7 && acwr > 0) {
        alerts.push({
          source: "Charge", severity: "warning",
          title: `ACWR à ${acwr.toFixed(2)} — sous-charge`,
          detail: "La charge récente est très en dessous de la chronique — risque d'érosion de la fitness si prolongé.",
          action: "Reprise progressive, 1-2 séances supplémentaires la semaine à venir.",
        });
      }
    }
  }

  // 3) Tendance HRV (7j vs 28j)
  if (window.HISTORY && window.HISTORY.daily) {
    const daily = window.HISTORY.daily;
    const last7 = daily.slice(-7).map(d => d.hrv).filter(Number.isFinite);
    const last28 = daily.slice(-28).map(d => d.hrv).filter(Number.isFinite);
    if (last7.length >= 4 && last28.length >= 14) {
      const m7 = last7.reduce((a, b) => a + b, 0) / last7.length;
      const m28 = last28.reduce((a, b) => a + b, 0) / last28.length;
      const pct = m28 > 0 ? ((m7 - m28) / m28) * 100 : 0;
      if (pct < -12) {
        alerts.push({
          source: "HRV", severity: "warning",
          title: `HRV en baisse marquée (${Math.round(pct)}%)`,
          detail: `Moyenne 7j à ${Math.round(m7)}ms vs baseline 28j à ${Math.round(m28)}ms — le système nerveux accuse la fatigue.`,
          action: "Prioriser sommeil et récupération — éviter les séances intenses 2-3 jours.",
        });
      } else if (pct > 10) {
        alerts.push({
          source: "HRV", severity: "info",
          title: `HRV au-dessus de la baseline (+${Math.round(pct)}%)`,
          detail: `Moyenne 7j à ${Math.round(m7)}ms — forme soutenue, bonne capacité d'adaptation.`,
          action: "Fenêtre favorable pour une séance qualité.",
        });
      }
    }

    // 4) Recovery 3 derniers jours
    const last3rec = daily.slice(-3).map(d => d.recovery).filter(Number.isFinite);
    if (last3rec.length >= 2) {
      const avg = last3rec.reduce((a, b) => a + b, 0) / last3rec.length;
      if (avg < 35) {
        alerts.push({
          source: "Récupération", severity: "critical",
          title: `Recovery sous 35% sur ${last3rec.length} jours`,
          detail: `Moyenne ${Math.round(avg)}% — le corps ne récupère plus entre les séances, dette profonde.`,
          action: "Arrêt total des séances intenses, 48h de régénération minimum.",
        });
      } else if (avg < 50) {
        alerts.push({
          source: "Récupération", severity: "warning",
          title: `Recovery modéré (${Math.round(avg)}%) sur 3 jours`,
          detail: "Capacité de récupération limitée — programmer une journée de repos rapidement.",
          action: "Repos ou séance très légère demain.",
        });
      }
    }

    // 5) Streak actif > 14j
    let streak = 0;
    for (let i = daily.length - 1; i >= 0; i--) {
      if (daily[i].activities && daily[i].activities.length > 0) streak++;
      else break;
    }
    if (streak >= 14) {
      alerts.push({
        source: "Récupération", severity: "warning",
        title: `${streak} jours sans repos complet`,
        detail: "Aucun jour off depuis 2+ semaines — même en restant en Z2, le corps a besoin de fenêtres de régénération totale.",
        action: "Journée OFF cette semaine, non négociable.",
      });
    }

    // 6) Données Whoop manquantes
    const lastWhoop = daily.slice(-5).filter(d => Number.isFinite(d.hrv));
    if (lastWhoop.length === 0) {
      alerts.push({
        source: "Données", severity: "info",
        title: "Pas de données Whoop depuis 5+ jours",
        detail: "Les indicateurs HRV, recovery et sommeil manquent — le score de forme se base uniquement sur Strava + ressentis.",
        action: "Relancer la synchro Whoop (import CSV).",
      });
    }
  }

  // 7) Compte à rebours course + forme insuffisante
  if (window.HISTORY && typeof window.explainScore === "function") {
    try {
      const exp = window.explainScore(athleteId);
      const score = exp && exp.score;
      // On devine la date race depuis window.OBJECTIFS ou fallback — sinon skip
      const raceDate = new Date("2026-07-05");
      const daysToRace = Math.floor((raceDate - Date.now()) / 86400000);
      if (daysToRace > 0 && daysToRace <= 21 && Number.isFinite(score) && score < 60) {
        alerts.push({
          source: "Objectif", severity: "warning",
          title: `Score de forme ${score}/100 à ${daysToRace}j de Thun`,
          detail: "La fenêtre de préparation finale se rétrécit. La forme doit stabiliser au-dessus de 70 dans les 2 prochaines semaines.",
          action: "Priorité absolue au trio sommeil + nutrition + charge bien dosée.",
        });
      }
    } catch (e) { /* silent */ }
  }

  return alerts;
}

// ─── LOT 21 : PRESCRIPTION SÉANCE J+1 / JOUR ───────────────────────────
function _renderPrescription(plan, athleteId) {
  const card = document.getElementById("prescriptionCard");
  if (!card) return;
  if (athleteId !== "benoit" || !Array.isArray(plan) || !plan.length) {
    card.style.display = "none"; return;
  }

  // Trouver la prochaine séance non-repos dans le plan (idx 0 = aujourd'hui)
  let target = null, targetIdx = -1;
  for (let i = 0; i < plan.length; i++) {
    if (plan[i].intensite !== "repos") { target = plan[i]; targetIdx = i; break; }
  }
  if (!target) {
    card.style.display = "block";
    document.getElementById("prescriptionTitle").textContent = "7 jours de repos complet";
    document.getElementById("prescriptionWhen").textContent = "Ton corps te demande du plein-repos";
    document.getElementById("prescriptionLoad").textContent = "0";
    document.getElementById("prescriptionBlocks").innerHTML = "";
    document.getElementById("prescriptionZonesWrap").style.display = "none";
    document.getElementById("prescriptionFueling").style.display = "none";
    document.getElementById("prescriptionTip").textContent = "Marche 20 min dehors · respire, mange lentement, dors tôt.";
    return;
  }
  card.style.display = "block";

  // Header
  document.getElementById("prescriptionTitle").textContent = `${target.icone || ""} ${target.type}`;
  const whenLabel = targetIdx === 0 ? "Aujourd'hui" : (targetIdx === 1 ? "Demain" : `Dans ${targetIdx} jours`);
  document.getElementById("prescriptionWhen").textContent = `${whenLabel} · ${target.date || ""} · ${target.duree || ""}`;

  // Structure de la séance (warmup / main / cooldown) selon intensité et durée
  const durMin = _parseDurationMin(target.duree);
  const blocks = _buildWorkoutBlocks(target, durMin);
  document.getElementById("prescriptionBlocks").innerHTML = blocks.map(b => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:rgba(255,255,255,0.025);border-left:3px solid ${b.color};border-radius:8px;">
      <div style="flex:0 0 60px;font-size:0.9rem;font-weight:700;color:${b.color};">${b.dur}</div>
      <div style="flex:1;">
        <div style="font-size:0.85rem;font-weight:600;color:#F0F0F5;">${b.title}</div>
        <div style="font-size:0.75rem;color:#8B8FA8;margin-top:1px;">${b.note}</div>
      </div>
    </div>
  `).join("");

  // Zones personnalisées (FC / puissance / allure)
  const zones = _zonesFromProfile(target);
  const zonesWrap = document.getElementById("prescriptionZonesWrap");
  const zonesDiv = document.getElementById("prescriptionZones");
  if (zones && zones.length) {
    zonesWrap.style.display = "block";
    zonesDiv.innerHTML = zones.map(z => `
      <div style="display:flex;align-items:center;gap:10px;font-size:0.8rem;">
        <div style="width:4px;height:24px;background:${z.couleur};border-radius:2px;"></div>
        <div style="flex:0 0 110px;color:${z.couleur};font-weight:600;">${z.zone}</div>
        <div style="color:#F0F0F5;font-weight:600;">${z.label}</div>
      </div>
    `).join("");
  } else {
    zonesWrap.style.display = "none";
  }

  // Fueling
  const fuel = _fuelingFor(target, durMin);
  const fuelCard = document.getElementById("prescriptionFueling");
  if (fuel) {
    fuelCard.style.display = "block";
    document.getElementById("prescriptionFuelingBody").textContent = fuel;
  } else {
    fuelCard.style.display = "none";
  }

  // Charge estimée (strain) — approx basé sur intensité × durée
  const loadFactor = { "légère": 0.6, "modérée": 1.0, "intense": 1.8, "longue": 1.1 };
  const load = Math.round((durMin / 60) * (loadFactor[target.intensite] || 1) * 60);
  document.getElementById("prescriptionLoad").textContent = load;

  // Tip coach
  const tip = target.noteCoach || _defaultTip(target);
  document.getElementById("prescriptionTip").textContent = tip;
}

function _parseDurationMin(str) {
  if (!str) return 60;
  const s = String(str).toLowerCase();
  const h = s.match(/(\d+)\s*h/);
  const m = s.match(/(\d+)\s*min/);
  let total = 0;
  if (h) total += parseInt(h[1]) * 60;
  if (m) total += parseInt(m[1]);
  // Format "1h30"
  const hm = s.match(/(\d+)h(\d+)/);
  if (hm) total = parseInt(hm[1]) * 60 + parseInt(hm[2]);
  return total || 60;
}

function _buildWorkoutBlocks(seance, durMin) {
  const intens = seance.intensite;
  const type = (seance.type || "").toLowerCase();
  const isRun = /course|run|running/i.test(type) || seance.icone === "🏃";
  const isBike = /vélo|bike/i.test(type) || seance.icone === "🚴";
  const isSwim = /natation|nage|swim/i.test(type) || seance.icone === "🏊";

  if (intens === "intense") {
    // Fractionné type
    const wu = Math.max(15, Math.round(durMin * 0.25));
    const cd = Math.max(10, Math.round(durMin * 0.15));
    const main = durMin - wu - cd;
    let mainTitle = "Corps de séance — seuil/VO2", mainNote = "Intervalles ou soutenu — zone 4/5";
    if (isBike) {
      mainNote = "6 × 4min @ seuil (Z4), récup 2min Z2 · ou 5 × 3min VO2 (Z5), récup 3min";
      mainTitle = "Intervalles vélo seuil/VO2";
    } else if (isRun) {
      mainNote = "6 × 1000m à allure 10km (Z4), récup 2min Z1 · ou 8 × 400m VMA (Z5)";
      mainTitle = "Fractionné course";
    } else if (isSwim) {
      mainNote = "6 × 200m fort (Z4), récup 30s · série alternée crawl/pull";
      mainTitle = "Fractionné nage";
    }
    return [
      { dur: `${wu}min`, title: "Échauffement progressif", note: "Z1 → Z2 doux, quelques accélérations en fin", color: "#00D4AA" },
      { dur: `${main}min`, title: mainTitle, note: mainNote, color: "#FF6B6B" },
      { dur: `${cd}min`, title: "Retour au calme", note: "Z1 très facile, étirements légers", color: "#A9A3FF" },
    ];
  }
  if (intens === "longue") {
    const wu = 15;
    const cd = 10;
    const main = durMin - wu - cd;
    let mainNote = "Z2 régulier, conversation possible tout du long";
    if (isBike) mainNote = "Z2 endurance, cadence 85-95 rpm, fractionner si plus de 3h";
    else if (isRun) mainNote = "Z2 allure endurance, garder une FC stable · hydratation toutes les 20min";
    return [
      { dur: `${wu}min`, title: "Mise en route", note: "Montée en tension très progressive", color: "#00D4AA" },
      { dur: `${main}min`, title: "Endurance fondamentale", note: mainNote, color: "#6C63FF" },
      { dur: `${cd}min`, title: "Retour au calme", note: "Ralentissement progressif · mobilité douce", color: "#A9A3FF" },
    ];
  }
  if (intens === "modérée") {
    const wu = 10;
    const cd = 10;
    const main = durMin - wu - cd;
    return [
      { dur: `${wu}min`, title: "Échauffement", note: "Z1 → Z2 doux", color: "#00D4AA" },
      { dur: `${main}min`, title: "Bloc principal", note: "Z2 endurance avec quelques passages Z3 tempo sur la deuxième partie", color: "#6C63FF" },
      { dur: `${cd}min`, title: "Retour au calme", note: "Z1, décompression", color: "#A9A3FF" },
    ];
  }
  // légère
  return [
    { dur: `${durMin}min`, title: "Récupération active", note: "Z1 strict — FC plafonnée à 70% FC max. Objectif : circulation sanguine.", color: "#A9A3FF" },
  ];
}

function _fuelingFor(seance, durMin) {
  if (seance.intensite === "repos") return null;
  const type = (seance.type || "").toLowerCase();
  const isBike = /vélo|bike/i.test(type) || seance.icone === "🚴";
  const isRun = /course|run/i.test(type) || seance.icone === "🏃";
  if (durMin < 60) return `Eau + électrolytes · pas besoin de glucides solides. Collation si matinée à jeun compliquée.`;
  if (durMin < 120) {
    if (isBike) return "60-80g glucides/h (boisson + gel). 500ml/h eau. Barre après 1h si fringale.";
    if (isRun) return "30-45g glucides/h (gels tous les 30-40min). 500ml/h eau avec électrolytes.";
    return "60g glucides/h. Hydrate avant soif. Collation pré-séance 30min avant.";
  }
  // Longue (>2h)
  if (isBike) return "80-100g glucides/h (boisson 40g + solide 40g). 600-750ml/h. Sel sur séances >3h.";
  if (isRun) return "60g glucides/h (gels + boisson glucidique). 500-600ml/h + sel. Eat the frog : teste ta stratégie course.";
  return "70-90g glucides/h. 600ml/h. Électrolytes obligatoires au-delà de 90min.";
}

function _defaultTip(seance) {
  const intens = seance.intensite;
  if (intens === "intense") return "Qualité > quantité. Si les intervalles ne tiennent pas, coupe la série plutôt que forcer — tu gagnes plus à finir frais qu'à finir cassé.";
  if (intens === "longue") return "La sortie longue se joue dans la régularité, pas dans la vitesse. Surveille ta FC, pas ton allure — si elle dérive de +10bpm, ralentis.";
  if (intens === "modérée") return "Zone Z2 : tu dois pouvoir tenir une conversation complète. Si tu es essoufflé, c'est que tu es trop haut.";
  return "Séance de régénération — volume bas, intensité basse, objectif zéro stress physiologique.";
}

// ─── LOT 17 : CALIBRATION ZONES FC PERSONNALISÉES ──────────────────────
function _zonesFromProfile(seance) {
  const p = window.ATHLETE_PROFILE;
  if (!p || typeof window.computeHrZones !== "function") return null;
  const hrZones = window.computeHrZones(p);
  const powerZones = window.computePowerZones(p);
  const paceZones = window.computePaceZones(p);

  if (!hrZones) return null;
  const intens = seance.intensite;
  if (intens === "repos") return null;

  // Mapping intensité → zone
  const intensMap = {
    "légère":  { idx: [0, 1], label: "Zone très facile" },
    "modérée": { idx: [1, 2], label: "Zone endurance/tempo" },
    "intense": { idx: [3, 4], label: "Zone seuil/VO2" },
    "longue":  { idx: [1, 1], label: "Zone endurance longue" },
  };
  const map = intensMap[intens];
  if (!map) return null;

  const zHrLow = hrZones[map.idx[0]], zHrHigh = hrZones[map.idx[1]];
  const hrRange = `${zHrLow.min} → ${zHrHigh.max} bpm`;
  const result = [{
    zone: map.label,
    label: `FC cible ${hrRange}`,
    detail: `${zHrLow.name.split(" — ")[0]}–${zHrHigh.name.split(" — ")[0]} · ${zHrHigh.desc || ""}`,
    couleur: zHrHigh.color || zHrLow.color,
    duree: seance.duree || "",
  }];

  // Ajouter puissance vélo si séance vélo et FTP dispo
  const isVelo = /vélo|bike|cyclisme|cycl/i.test(seance.type || "") || seance.icone === "🚴";
  if (isVelo && powerZones) {
    const pwLow = powerZones[map.idx[0]], pwHigh = powerZones[map.idx[1]];
    result.push({
      zone: "Puissance",
      label: `${pwLow.min}W → ${pwHigh.max == null ? "∞" : pwHigh.max}W`,
      detail: `Zones Coggan basées sur FTP ${p.ftp}W`,
      couleur: pwHigh.color || pwLow.color,
      duree: "",
    });
  }
  // Ajouter allure course (format zones : "faster → slower", donc slowest = [1], fastest = [0])
  const isRun = /course|run|running|marathon/i.test(seance.type || "") || seance.icone === "🏃";
  if (isRun && paceZones) {
    const pcLow = paceZones[map.idx[0]], pcHigh = paceZones[map.idx[1]];
    const slowBound = pcLow.pace.split(" → ")[1] || pcLow.pace;
    const fastBound = pcHigh.pace.split(" → ")[0] || pcHigh.pace;
    result.push({
      zone: "Allure",
      label: `${slowBound} → ${fastBound}`,
      detail: `Zones allure basées sur VMA ${p.vma} km/h`,
      couleur: pcHigh.color || pcLow.color,
      duree: "",
    });
  }
  return result;
}

// ─── LOT 15 : RAPPORT HEBDO AUTO ───────────────────────────────────────
function _renderWeeklyReview(athleteId) {
  const card = document.getElementById("weeklyReviewCard");
  if (!card || athleteId !== "benoit" || !window.HISTORY) return;
  const H = window.HISTORY;
  if (!H.weeks || H.weeks.length < 2) return;

  // Semaine à revoir = la dernière complète (si on est en milieu/fin de semaine en cours, on montre la précédente).
  const now = new Date();
  const lastWeek = H.weeks[H.weeks.length - 1];
  const prevWeek = H.weeks[H.weeks.length - 2];
  const prev2Week = H.weeks[H.weeks.length - 3];

  const endMs = new Date(lastWeek.end_date).getTime();
  const daysSinceEnd = Math.floor((now.getTime() - endMs) / 86400000);
  // Si la dernière est encore en cours (<= 2 j passés), debrief porte sur l'avant-dernière
  const W = daysSinceEnd <= 2 ? prevWeek : lastWeek;
  const Wprev = daysSinceEnd <= 2 ? prev2Week : prevWeek;
  if (!W || !Wprev) return;

  card.style.display = "block";

  const SIG_COLORS = {
    "Rythme de croisière":"#00D4AA","Build Z2":"#6C63FF","Charge brute":"#FF6B6B",
    "Overreach confirmé":"#FF4A4A","Décharge planifiée":"#A9A3FF","Décharge subie":"#FFD166",
    "Polarisée":"#4A9CFF","Séance seuil dominant":"#FFA07A","Rebond":"#2EE59D",
    "Choc immunitaire":"#FF8FA3","Compétition":"#FFD700","Calibration":"#888EA8",
  };
  const sigColor = SIG_COLORS[W.signature] || "#888";

  document.getElementById("weeklyReviewLabel").textContent = daysSinceEnd <= 2 ? "Debrief semaine en cours" : "Debrief semaine close";
  document.getElementById("weeklyReviewTitle").textContent = `Semaine ${W.id}`;
  const d1 = new Date(W.start_date), d2 = new Date(W.end_date);
  const fmt = (d) => `${d.getDate()}/${d.getMonth()+1}`;
  document.getElementById("weeklyReviewSubtitle").textContent = `${fmt(d1)} → ${fmt(d2)} · ${W.days_count || 7} jours`;

  const badge = document.getElementById("weeklyReviewSigBadge");
  badge.style.background = `${sigColor}22`;
  badge.style.color = sigColor;
  badge.style.border = `1px solid ${sigColor}55`;
  badge.textContent = `● ${W.signature}`;

  const m = W.metrics, mP = Wprev.metrics;
  const fmtDelta = (c, p, unit = "", betterUp = true) => {
    if (c == null || p == null) return "";
    const d = c - p;
    if (Math.abs(d) < 0.01) return `<span style="color:#8B8FA8;font-size:0.72rem;">=</span>`;
    const col = (betterUp ? d > 0 : d < 0) ? "#00D4AA" : "#FF6B6B";
    return `<span style="color:${col};font-size:0.72rem;">${d > 0 ? "↑" : "↓"}${Math.abs(Number.isInteger(d) ? d : Math.round(d*10)/10)}${unit}</span>`;
  };
  const stats = [
    { label: "Recovery", val: m.recovery_avg ? `${m.recovery_avg}%` : "—", d: fmtDelta(m.recovery_avg, mP.recovery_avg, "%", true) },
    { label: "HRV", val: m.hrv_avg ? `${m.hrv_avg}ms` : "—", d: fmtDelta(m.hrv_avg, mP.hrv_avg, "ms", true) },
    { label: "Volume", val: m.volume_min ? `${Math.round(m.volume_min/60*10)/10}h` : "—", d: fmtDelta(Math.round(m.volume_min/60*10)/10, Math.round((mP.volume_min||0)/60*10)/10, "h", true) },
    { label: "Séances", val: m.session_count || 0, d: fmtDelta(m.session_count, mP.session_count, "", true) },
    { label: "ACWR", val: m.acwr || "—", d: fmtDelta(m.acwr, mP.acwr, "", false) },
    { label: "Flags", val: m.flag_count || 0, d: fmtDelta(m.flag_count, mP.flag_count, "", false) },
  ];
  document.getElementById("weeklyReviewStats").innerHTML = stats.map(s => `
    <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:8px;padding:8px 10px;">
      <div style="font-size:0.62rem;color:#8B8FA8;">${s.label}</div>
      <div style="display:flex;align-items:baseline;gap:6px;margin-top:2px;">
        <span style="font-size:0.95rem;font-weight:700;color:#F0F0F5;">${s.val}</span>
        ${s.d}
      </div>
    </div>
  `).join("");

  // 3 points clés narratifs
  const points = [];
  // Point 1 : signature + contexte
  const sigChanged = W.signature !== Wprev.signature;
  if (sigChanged) {
    points.push({ icone: "🔄", title: `Bascule : ${Wprev.signature} → ${W.signature}`, body: `La semaine a changé de registre. ${W.signature === "Choc immunitaire" ? "Un épisode immunitaire est venu couper la progression." : W.signature === "Charge brute" ? "Volume + intensité ont monté fort." : W.signature === "Rebond" ? "Tu reprends le build — bon signe." : "Note le pattern pour ta prochaine semaine."}` });
  } else {
    points.push({ icone: "➖", title: `Signature stable : ${W.signature}`, body: `Deux semaines consécutives sur le même pattern. ${W.signature === "Choc immunitaire" ? "Prolongation de l'épisode — patience." : "Consolidation — c'est un bon socle."}` });
  }

  // Point 2 : meilleur signal
  const deltas = [
    { k: "recovery", d: (m.recovery_avg || 0) - (mP.recovery_avg || 0), lbl: "Recovery", unit: "%" },
    { k: "hrv",      d: (m.hrv_avg || 0) - (mP.hrv_avg || 0),             lbl: "HRV",      unit: "ms" },
    { k: "volume",   d: ((m.volume_min||0) - (mP.volume_min||0))/60,       lbl: "Volume",   unit: "h" },
  ];
  const biggest = deltas.reduce((a, b) => Math.abs(a.d) > Math.abs(b.d) ? a : b);
  if (Math.abs(biggest.d) >= (biggest.k === "hrv" ? 2 : biggest.k === "volume" ? 1 : 5)) {
    const up = biggest.d > 0;
    const icon = up ? "📈" : "📉";
    points.push({ icone: icon, title: `${biggest.lbl} ${up ? "en hausse" : "en baisse"} (${up ? "+" : ""}${Math.round(biggest.d*10)/10}${biggest.unit})`, body: up ? "Évolution positive vs semaine précédente." : "À surveiller dans le contexte de la signature ci-dessus." });
  }

  // Point 3 : flags / incidents
  const incidents = W.incidents || {};
  if (incidents.illness) {
    points.push({ icone: "🤒", title: "Épisode immunitaire détecté", body: "Au moins un jour d'illness signalé ou détecté par les flags physio." });
  } else if ((m.flag_count || 0) >= 3) {
    points.push({ icone: "⚠️", title: `${m.flag_count} flags physio activés`, body: "HRV/RHR/RR/skin temp : plusieurs signaux divergents dans la semaine." });
  } else if (incidents.race) {
    points.push({ icone: "🏁", title: "Semaine de compétition", body: "Cours enregistré — la structure de la semaine reflète le déroulé course." });
  } else {
    points.push({ icone: "✓", title: "Aucun flag physio majeur", body: "La semaine s'est déroulée sans signal d'alarme physiologique." });
  }

  document.getElementById("weeklyReviewPoints").innerHTML = points.slice(0, 3).map(p => `
    <div style="display:flex;gap:10px;align-items:flex-start;">
      <span style="font-size:1.2rem;flex-shrink:0;">${p.icone}</span>
      <div>
        <div style="font-weight:600;font-size:0.85rem;color:#F0F0F5;">${p.title}</div>
        <div style="font-size:0.78rem;color:#8B8FA8;margin-top:2px;line-height:1.4;">${p.body}</div>
      </div>
    </div>
  `).join("");

  // Ce qu'on emporte pour la semaine qui commence
  let nextAction = "";
  if (W.signature === "Choc immunitaire") {
    nextAction = "<strong style='color:#F0F0F5;'>Pour la semaine qui commence :</strong> reprise prudente, pas d'intensité tant que le ressenti n'est pas net. Écoute > chrono.";
  } else if (W.signature === "Charge brute" || W.signature === "Overreach confirmé") {
    nextAction = "<strong style='color:#F0F0F5;'>Pour la semaine qui commence :</strong> décharge 25-30%, surtout sur l'intensité. Le gain se fait maintenant pendant la récup.";
  } else if (W.signature === "Rebond") {
    nextAction = "<strong style='color:#F0F0F5;'>Pour la semaine qui commence :</strong> tu peux relancer le build — HRV et ressenti sont au rendez-vous. Reste progressif.";
  } else if (W.signature === "Décharge subie") {
    nextAction = "<strong style='color:#F0F0F5;'>Pour la semaine qui commence :</strong> le volume a chuté sans que tu le choisisses — si le corps va bien, relance le plan normal.";
  } else {
    nextAction = `<strong style='color:#F0F0F5;'>Pour la semaine qui commence :</strong> continue dans la même logique — ${W.signature.toLowerCase()} est un bon socle. Regarde le plan 7j ci-dessous.`;
  }
  document.getElementById("weeklyReviewNext").innerHTML = nextAction;
}

// ─── LOT 12 : PRÉVISION FATIGUE 7J ─────────────────────────────────────
function _renderForecastFatigue(plan, athleteId) {
  const card = document.getElementById("forecastCard");
  if (!card || !window.HISTORY || !Array.isArray(plan)) return;
  const H = window.HISTORY;
  const daily = H.daily || [];
  if (daily.length < 28) return;

  // 1. Strain quotidien historique (Strava fallback Whoop)
  const strainOf = (d) => {
    const s = d.strain_strava != null ? d.strain_strava : (d.strain_whoop != null ? d.strain_whoop : 0);
    return Number.isFinite(s) ? s : 0;
  };
  const last28 = daily.slice(-28).map(strainOf);
  const last7  = daily.slice(-7).map(strainOf);

  // 2. Projection strain pour les 7 prochains jours depuis le plan
  const INTENS_FACTOR = { repos: 0, légère: 0.35, modérée: 0.6, intense: 0.95, longue: 0.55 };
  const durMin = (s) => {
    if (!s || s === "—") return 0;
    const r = String(s).match(/(\d+)\s*-\s*(\d+)\s*min/);
    if (r) return (parseInt(r[1]) + parseInt(r[2])) / 2;
    const h = String(s).match(/(\d+)h(\d*)/);
    if (h) return parseInt(h[1]) * 60 + (h[2] ? parseInt(h[2]) : 0);
    const m = String(s).match(/(\d+)\s*min/);
    if (m) return parseInt(m[1]);
    return 0;
  };
  const projectStrain = (slot) => {
    const f = INTENS_FACTOR[slot.intensite] || 0.4;
    const dur = durMin(slot.duree);
    // ≈ 1h modérée → 10, 3h longue → 18
    return Math.max(0, Math.round(f * (dur / 60) * 17 * 10) / 10);
  };
  const projected = plan.slice(0, 7).map(projectStrain);

  // 3. Projection ACWR jour par jour : fenêtre glissante acute 7j, chronique 28j
  const chronicWindow = [...last28];
  const acuteWindow = [...last7];
  const acwrSeries = [];
  const acuteSeries = [];
  const chronicSeries = [];

  // ACWR courant (point 0)
  const acwr0 = (acuteWindow.reduce((s,v)=>s+v,0)/7) / Math.max(0.1, chronicWindow.reduce((s,v)=>s+v,0)/28);
  acwrSeries.push(acwr0);
  acuteSeries.push(acuteWindow.reduce((s,v)=>s+v,0)/7);
  chronicSeries.push(chronicWindow.reduce((s,v)=>s+v,0)/28);

  projected.forEach(v => {
    acuteWindow.shift(); acuteWindow.push(v);
    chronicWindow.shift(); chronicWindow.push(v);
    const a = acuteWindow.reduce((s,x)=>s+x,0) / 7;
    const c = chronicWindow.reduce((s,x)=>s+x,0) / 28;
    acwrSeries.push(a / Math.max(0.1, c));
    acuteSeries.push(a);
    chronicSeries.push(c);
  });

  // 4. Détermination risque + signature probable
  const acwrMax = Math.max(...acwrSeries);
  const acwrEnd = acwrSeries[acwrSeries.length - 1];
  let risque, couleurRisque, sigPrev;
  if (acwrMax > 1.5 || acwrEnd > 1.4) {
    risque = "Risque élevé"; couleurRisque = "#FF6B6B"; sigPrev = "Charge brute / Overreach probable";
  } else if (acwrMax > 1.3) {
    risque = "Charge tendue"; couleurRisque = "#FFD166"; sigPrev = "Build Z2 soutenu";
  } else if (acwrEnd < 0.7) {
    risque = "Sous-charge"; couleurRisque = "#A9A3FF"; sigPrev = "Décharge subie / reprise lente";
  } else if (acwrEnd >= 0.8 && acwrEnd <= 1.3) {
    risque = "Zone optimale"; couleurRisque = "#00D4AA"; sigPrev = "Rythme de croisière / Build Z2";
  } else {
    risque = "Reprise progressive"; couleurRisque = "#6C63FF"; sigPrev = "Calibration / remise en route";
  }

  // 5. Rendu SVG
  card.style.display = "block";
  const badge = document.getElementById("forecastBadge");
  badge.style.background = `${couleurRisque}22`;
  badge.style.color = couleurRisque;
  badge.style.border = `1px solid ${couleurRisque}55`;
  badge.textContent = risque;

  const sub = document.getElementById("forecastSub");
  sub.textContent = `ACWR J0 = ${acwrSeries[0].toFixed(2)} → J+7 projeté = ${acwrEnd.toFixed(2)}`;

  const svg = document.getElementById("forecastChart");
  if (svg) {
    const W = svg.clientWidth || 700, H_ = 160, PAD = 28;
    const maxAcwr = Math.max(1.6, acwrMax + 0.2);
    const minAcwr = Math.min(0.5, Math.min(...acwrSeries) - 0.1);
    const xOf = (i) => PAD + (i / (acwrSeries.length - 1)) * (W - 2 * PAD);
    const yOf = (v) => H_ - PAD - ((v - minAcwr) / (maxAcwr - minAcwr)) * (H_ - 2 * PAD);

    // Zone optimale 0.8 - 1.3
    const yTop = yOf(1.3), yBot = yOf(0.8);
    let svgContent = "";
    svgContent += `<rect x="${PAD}" y="${yTop}" width="${W - 2*PAD}" height="${yBot - yTop}" fill="rgba(0,212,170,0.08)" stroke="rgba(0,212,170,0.3)" stroke-dasharray="3,3" />`;
    svgContent += `<text x="${W-PAD-4}" y="${yTop-4}" text-anchor="end" fill="rgba(0,212,170,0.6)" font-size="10">Zone optimale 0.8–1.3</text>`;

    // Seuil risque 1.5
    const yRisk = yOf(1.5);
    if (yRisk > PAD) {
      svgContent += `<line x1="${PAD}" y1="${yRisk}" x2="${W-PAD}" y2="${yRisk}" stroke="rgba(255,107,107,0.5)" stroke-dasharray="4,3" />`;
      svgContent += `<text x="${PAD+4}" y="${yRisk-4}" fill="rgba(255,107,107,0.7)" font-size="10">Seuil rouge 1.5</text>`;
    }

    // Barres strain projetées (fond)
    projected.forEach((s, i) => {
      const x = xOf(i + 1) - 12;
      const maxS = Math.max(...projected, 5);
      const h = maxS > 0 ? (s / maxS) * 40 : 0;
      svgContent += `<rect x="${x}" y="${H_-PAD-h}" width="24" height="${h}" fill="rgba(108,99,255,0.2)" rx="3" />`;
    });

    // Courbe ACWR
    const path = acwrSeries.map((v, i) => `${i === 0 ? "M" : "L"}${xOf(i)},${yOf(v)}`).join(" ");
    svgContent += `<path d="${path}" fill="none" stroke="#6C63FF" stroke-width="2.5" />`;
    acwrSeries.forEach((v, i) => {
      const col = v > 1.5 ? "#FF6B6B" : v < 0.7 ? "#A9A3FF" : v > 1.3 ? "#FFD166" : "#00D4AA";
      svgContent += `<circle cx="${xOf(i)}" cy="${yOf(v)}" r="4" fill="${col}" stroke="#1A1D27" stroke-width="2" />`;
    });

    svg.innerHTML = svgContent;
  }

  // Labels J0..J+7
  const labels = document.getElementById("forecastLabels");
  if (labels) {
    const dayLabels = ["Auj."];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(Date.now() + i * 86400000);
      dayLabels.push(["Dim.","Lun.","Mar.","Mer.","Jeu.","Ven.","Sam."][d.getDay()]);
    }
    labels.innerHTML = dayLabels.map(l => `<span>${l}</span>`).join("");
  }

  // 6. Narrative
  const summary = document.getElementById("forecastSummary");
  const acuteEnd = acuteSeries[acuteSeries.length - 1];
  const totalProjected = projected.reduce((s,v)=>s+v,0);
  let narrative = `Charge cumulée projetée sur 7j : ${totalProjected.toFixed(0)} (strain quotidien moyen ${(totalProjected/7).toFixed(1)}). `;
  if (risque === "Risque élevé") {
    narrative += `L'ACWR monte à ${acwrMax.toFixed(2)} — ton corps risque d'être en dette. Décharge 1-2 séances intenses si le ressenti se tend.`;
  } else if (risque === "Charge tendue") {
    narrative += `Tu frôles la zone de risque (ACWR max ${acwrMax.toFixed(2)}). Surveille ressenti + HRV dès mi-semaine.`;
  } else if (risque === "Sous-charge") {
    narrative += `Volume insuffisant pour progresser — tu peux ajouter 1h-1h30 de Z2 si ressenti ok.`;
  } else if (risque === "Zone optimale") {
    narrative += `Progression saine, la fenêtre d'adaptation est ouverte. Tiens le cap.`;
  } else {
    narrative += `Relance en douceur — l'objectif est d'aller chercher du volume sans brûler la sortie d'état antérieur.`;
  }
  narrative += ` Signature probable : ${sigPrev}.`;
  summary.textContent = narrative;
}

function _injecterPlanAdaptatif(planFallback, id) {
  if (typeof window.generatePlan7 !== "function") return planFallback;
  if (!window.HISTORY) return planFallback;
  try {
    const result = window.generatePlan7(id);
    const { plan, state, phaseInfo } = result;
    console.info(`[plan-generator] mode=${state.mode} (${state.reason}) · phase=${phaseInfo.phase} · J-${phaseInfo.days}`);
    _renderPlanMeta(state, phaseInfo);
    window._planGenMeta = { state, phaseInfo };
    return plan;
  } catch (e) {
    console.warn("[plan-generator] fallback →", e);
    return planFallback;
  }
}

const _MODE_META = {
  recovery: { label: "Récup", icon: "🧘", color: "#FF6B6B", bg: "rgba(255,107,107,0.15)", border: "rgba(255,107,107,0.35)" },
  deload:   { label: "Décharge", icon: "⬇️", color: "#FFD166", bg: "rgba(255,209,102,0.15)", border: "rgba(255,209,102,0.35)" },
  build:    { label: "Build", icon: "📈", color: "#6C63FF", bg: "rgba(108,99,255,0.15)", border: "rgba(108,99,255,0.35)" },
  peak:     { label: "Peak", icon: "⚡", color: "#00D4AA", bg: "rgba(0,212,170,0.15)", border: "rgba(0,212,170,0.35)" },
  taper:    { label: "Affûtage", icon: "🎯", color: "#A9A3FF", bg: "rgba(169,163,255,0.15)", border: "rgba(169,163,255,0.35)" },
};

function _renderPlanMeta(state, phaseInfo) {
  const badge = document.getElementById("planModeBadge");
  const btn = document.getElementById("planWhyBtn");
  const subtitle = document.getElementById("planSubtitle");
  if (!badge || !btn || !subtitle) return;

  const displayMode = state.mode === "build" && ["peak", "taper"].includes(phaseInfo.phase) ? phaseInfo.phase : state.mode;
  const meta = _MODE_META[displayMode] || _MODE_META.build;

  badge.style.display = "inline-flex";
  badge.style.background = meta.bg;
  badge.style.color = meta.color;
  badge.style.border = `1px solid ${meta.border}`;
  badge.innerHTML = `${meta.icon} ${meta.label}`;

  subtitle.style.display = "block";
  subtitle.textContent = `${state.reason} · J-${phaseInfo.days} avant Thun`;

  btn.style.display = "inline-flex";
  btn.onclick = () => ouvrirPlanWhy(state, phaseInfo);
}

function ouvrirPlanWhy(state, phaseInfo) {
  const modal = document.getElementById("modalPlanWhy");
  const body = document.getElementById("modalPlanWhyBody");
  if (!modal || !body) return;
  const displayMode = state.mode === "build" && ["peak", "taper"].includes(phaseInfo.phase) ? phaseInfo.phase : state.mode;
  const meta = _MODE_META[displayMode] || _MODE_META.build;

  const weightColor = { "décisif": "#FF6B6B", "fort": "#FFD166", "contexte": "#8B8FA8" };
  const factorsHTML = (state.factors || []).map(f => `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);gap:12px;">
      <div>
        <div style="font-size:0.78rem;color:#F0F0F5;font-weight:600;">${f.label}</div>
        <div style="font-size:0.78rem;color:#A0A0B0;margin-top:2px;">${f.value}</div>
      </div>
      <span style="font-size:0.65rem;padding:2px 8px;border-radius:8px;background:${(weightColor[f.weight]||"#555")}22;color:${weightColor[f.weight]||"#8B8FA8"};white-space:nowrap;height:fit-content;">${f.weight}</span>
    </div>
  `).join("");

  body.innerHTML = `
    <div style="padding:12px;background:${meta.bg};border:1px solid ${meta.border};border-radius:10px;margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
        <span style="font-size:1.2rem;">${meta.icon}</span>
        <span style="font-weight:700;color:${meta.color};font-size:0.9rem;">Mode ${meta.label}</span>
      </div>
      <div style="color:#D0D0E0;font-size:0.82rem;">${state.reason}</div>
    </div>

    <div style="margin-bottom:16px;">
      <div style="font-size:0.72rem;font-weight:700;color:#8B8FA8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Facteurs pris en compte</div>
      ${factorsHTML || '<div style="color:#8B8FA8;font-size:0.8rem;">Rythme normal — pas de facteur spécifique</div>'}
    </div>

    <div style="margin-bottom:8px;">
      <div style="font-size:0.72rem;font-weight:700;color:#8B8FA8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Course cible</div>
      <div style="color:#D0D0E0;font-size:0.82rem;">Ironman Switzerland Thun · 5 juillet 2026 · <strong style="color:${meta.color};">J-${phaseInfo.days}</strong> · phase <strong>${phaseInfo.phase}</strong></div>
    </div>

    <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.08);">
      <div style="font-size:0.72rem;color:#8B8FA8;line-height:1.5;">
        Le plan est recalculé à chaque ouverture depuis <code style="background:rgba(108,99,255,0.1);padding:2px 6px;border-radius:4px;color:#A9A3FF;font-size:0.72rem;">window.HISTORY</code> (360 jours Whoop + 333 séances Strava).
        Priorité aux auto-reports (journal illness/injury), puis signature de la semaine, puis ACWR, puis phase course.
      </div>
    </div>
  `;
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function fermerPlanWhy() {
  const modal = document.getElementById("modalPlanWhy");
  if (modal) modal.style.display = "none";
  document.body.style.overflow = "";
}
window.fermerPlanWhy = fermerPlanWhy;

function _injecterScoreCalculé(forme, id) {
  if (typeof window.computeFormeScore !== "function") return forme;
  const result = window.computeFormeScore(id);
  if (!result.score) return forme; // no data yet → keep hardcoded fallback

  // Merge real score + CI into forme object without mutating original
  const updated = Object.assign({}, forme, {
    score: result.score,
    ci_low: result.ci_low,
    ci_high: result.ci_high,
    half_width: result.half_width,
    n_layers_calibrated: result.n_layers_calibrated,
    n_layers_total: result.n_layers_total,
  });

  // Update layer scores in couches if available
  if (result.layerScores && window.ATHLETES[id]) {
    const couches = window.ATHLETES[id].couches;
    Object.entries(result.layerScores).forEach(([layer, score]) => {
      if (score !== null && couches[layer]) {
        couches[layer].score = score;
        couches[layer].statut = "calibré";
      }
    });
  }

  // Update statut based on ratio — preserve "no-recent-activity" / "no-data" when ratio is null
  if (forme.ratio === null || forme.ratio === undefined) {
    // keep whatever statut came from data-benoit.js (no-recent-activity / no-data)
  } else if (forme.ratio > 1.3) updated.statut = "surcharge";
  else if (forme.ratio < 0.8) updated.statut = "sous-charge";
  else updated.statut = "ok";

  return updated;
}

// ─── HEADER ───
function rendreHeader(a) {
  const jours = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
  const mois  = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  const d = new Date();
  document.getElementById("headerDate").textContent =
    `${jours[d.getDay()]} ${d.getDate()} ${mois[d.getMonth()]} ${d.getFullYear()}`;
  document.getElementById("headerTitle").textContent = `Bonjour, ${a.nom.split(" ")[0]} 👋`;
  document.getElementById("headerObjectif").textContent = `Objectif : ${a.objectif}`;
}

// ─── SCORE RING ───
function rendreScore(forme) {
  const score = forme.score;
  const circonférence = 2 * Math.PI * 32; // rayon=32 → ~201
  const offset = circonférence - (score / 100) * circonférence;

  const ring = document.getElementById("scoreRingFill");
  ring.style.strokeDashoffset = offset;

  // Couleur selon score
  const couleur = score >= 75 ? "#00D4AA" : score >= 55 ? "#6C63FF" : "#FF6B6B";
  ring.style.stroke = couleur;

  document.getElementById("scoreValue").textContent = score;

  const badges = {
    ok: '<span class="badge badge-ok">Forme</span>',
    surcharge: '<span class="badge badge-surcharge">Surcharge</span>',
    "sous-charge": '<span class="badge badge-souscharge">Sous-charge</span>',
  };
  document.getElementById("scoreBadge").innerHTML = badges[forme.statut] || '';

  // Confidence interval display — signals uncertainty honestly
  const ciEl = document.getElementById("scoreCI");
  if (ciEl && Number.isFinite(forme.half_width)) {
    const hw = forme.half_width;
    const nCal = forme.n_layers_calibrated;
    const nTot = forme.n_layers_total;
    // Styling escalates with uncertainty: subtle if ≤5, amber if ≤12, warn if more
    const colour = hw <= 5 ? "#555870" : hw <= 12 ? "#8B8FA8" : "#FFD166";
    ciEl.style.color = colour;
    ciEl.textContent = hw <= 3
      ? `${nCal}/${nTot} dimensions calibrées`
      : `± ${hw} pts · ${nCal}/${nTot} dimensions`;
    ciEl.title = `Intervalle de confiance : ${forme.ci_low}–${forme.ci_high}. Plus les 8 couches sont calibrées, plus le score est précis.`;
  } else if (ciEl) {
    ciEl.textContent = "";
  }
}

// ─── ALERTE ───
function rendreAlerte(alerteFallback) {
  const dyn = _computeDynamicAlert();
  const alerte = dyn || alerteFallback;

  const banner = document.getElementById("alerteBanner");
  const icones = { ok: "✅", surcharge: "⚠️", "sous-charge": "📉", info: "💡", win: "🎉" };
  const classes = {
    ok: "alerte-ok",
    surcharge: "alerte-surcharge",
    "sous-charge": "alerte-sous-charge",
    info: "alerte-info",
    win: "alerte-ok",
  };

  banner.className = `alerte-banner mb-6 fade-in ${classes[alerte.type] || "alerte-info"}`;
  document.getElementById("alerteIcone").textContent = alerte.icone || icones[alerte.type] || "💡";
  document.getElementById("alerteTitre").textContent = alerte.titre;
  document.getElementById("alerteMessage").textContent = alerte.message;
  const actionEl = document.getElementById("alerteAction");
  actionEl.textContent = (alerte.action || "En savoir plus") + " →";
  actionEl.style.cursor = alerte.href ? "pointer" : "default";
  actionEl.onclick = alerte.href ? () => { window.location.href = alerte.href; } : null;
}

// Calcule une alerte dynamique depuis HISTORY + ALARMS + état d'entraînement.
// Priorité : illness active > recovery_crash > ACWR zone rouge > flags physio > breakthrough > RAS
function _computeDynamicAlert() {
  if (!window.HISTORY) return null;
  const H = window.HISTORY;
  const lastWeek = H.weeks[H.weeks.length - 1];
  const lastDay = H.daily[H.daily.length - 1];
  if (!lastWeek || !lastDay) return null;

  // Calculer / mettre à jour les alarmes
  const activeAlarms = typeof window.ALARMS !== "undefined" ? window.ALARMS.computeCurrent() : [];

  // 1. Illness active (top priority) — respecte la fenêtre d'override si définie
  const _illWin = window.IllnessOverride && window.IllnessOverride.get();
  const _illEnded = _illWin && _illWin.endDate && _illWin.endDate < Date.now();
  if (lastDay.journal && lastDay.journal.illness && !_illEnded) {
    const daysOff = H.daily.slice(-14).filter(d =>
      d.journal && d.journal.illness
      && (!_illWin?.startDate || d.timestamp >= _illWin.startDate)
      && (!_illWin?.endDate || d.timestamp <= _illWin.endDate)
    ).length;
    return {
      type: "surcharge",
      icone: "🤒",
      titre: "Sortie de maladie — reprise prioritaire",
      message: `Maladie signalée ce matin. ${daysOff} jours signalés sur les 14 derniers. Respecte les paliers de reprise.`,
      action: "Voir le plan de reprise",
      href: "#planGrid",
    };
  }

  // 2. Injury
  if (lastDay.journal && lastDay.journal.injury) {
    return {
      type: "surcharge",
      icone: "🩹",
      titre: "Blessure signalée",
      message: "Reprise douce — écoute ton corps. Si la douleur persiste > 3 jours, consulte.",
      action: "Voir le plan",
      href: "#planGrid",
    };
  }

  // 3. Composite autonomic flag ≥3/4
  if (lastDay.composite_flag && lastDay.composite_flag.count >= 3) {
    return {
      type: "surcharge",
      icone: "⚠️",
      titre: "Stress autonomique détecté",
      message: `${lastDay.composite_flag.count}/4 marqueurs physio déviants ce matin (HRV / RHR / RR / skin temp). Signal précoce — vigilance.`,
      action: "Voir le détail",
      href: "archive.html",
    };
  }

  // 4. ACWR zone rouge
  if (lastWeek.metrics.acwr > 1.5) {
    return {
      type: "surcharge",
      icone: "⚠️",
      titre: "Surcharge aiguë — zone rouge",
      message: `ACWR à ${lastWeek.metrics.acwr} (> 1.5). Risque de blessure et de maladie élevé. Décharge cette semaine.`,
      action: "Voir les semaines",
      href: "archive.html",
    };
  }

  // 5. Recovery crash dans la semaine en cours
  const recentCrashes = (lastWeek.events || []).filter(e => e.type === "recovery_crash");
  if (recentCrashes.length >= 2) {
    return {
      type: "surcharge",
      icone: "📉",
      titre: "Récupération en crise",
      message: `${recentCrashes.length} jours avec recovery < 33% cette semaine. Ton corps n'absorbe pas la charge.`,
      action: "Voir l'historique",
      href: "archive.html",
    };
  }

  // 6. HRV trend < -1.5σ
  if (lastWeek.metrics.hrv_trend !== null && lastWeek.metrics.hrv_trend < -1.5) {
    return {
      type: "surcharge",
      icone: "🫀",
      titre: "HRV en chute",
      message: `HRV moyenne ${lastWeek.metrics.hrv_trend}σ sous baseline. Système nerveux sous tension — priorité récupération.`,
      action: "Voir l'historique",
      href: "archive.html",
    };
  }

  // 7. Sous-charge chronique
  if (lastWeek.metrics.acwr && lastWeek.metrics.acwr < 0.5 && !lastDay.journal.illness) {
    return {
      type: "sous-charge",
      icone: "📉",
      titre: "Sous-charge marquée",
      message: `ACWR à ${lastWeek.metrics.acwr}. Si tu es en forme, c'est le moment de monter le volume progressivement.`,
      action: "Voir les objectifs",
      href: "objectifs.html",
    };
  }

  // 8. Breakthrough confirmé récent
  const breakthroughs = (lastWeek.events || []).filter(e => e.type === "breakthrough");
  if (breakthroughs.length >= 1) {
    return {
      type: "win",
      icone: "🎉",
      titre: "Breakthrough confirmé",
      message: `${breakthroughs.length} séance${breakthroughs.length > 1 ? "s" : ""} au-dessus de ta signature habituelle cette semaine. Progression réelle — continue.`,
      action: "Voir la semaine",
      href: "archive.html",
    };
  }

  // 9. HRV rebond positif
  if (lastWeek.metrics.hrv_trend > 1.5) {
    return {
      type: "win",
      icone: "✨",
      titre: "HRV en rebond",
      message: `HRV moyenne +${lastWeek.metrics.hrv_trend}σ au-dessus de baseline. Ton corps a intégré la charge — fenêtre de progression.`,
      action: "Voir les objectifs",
      href: "objectifs.html",
    };
  }

  // 10. ACWR zone verte
  if (lastWeek.metrics.acwr >= 0.8 && lastWeek.metrics.acwr <= 1.3) {
    return {
      type: "ok",
      icone: "✅",
      titre: "Charge dans la zone verte",
      message: `ACWR ${lastWeek.metrics.acwr} — charge bien dosée. Continue la progression.`,
      action: "Voir les semaines",
      href: "archive.html",
    };
  }

  // Fallback
  return {
    type: "info",
    icone: "💡",
    titre: `Semaine ${lastWeek.id} — ${lastWeek.signature}`,
    message: `ACWR ${lastWeek.metrics.acwr || "—"} · ${lastWeek.metrics.session_count || 0} séance${(lastWeek.metrics.session_count || 0) > 1 ? "s" : ""} · recovery moy. ${lastWeek.metrics.recovery_avg || "—"}%`,
    action: "Voir le détail",
    href: "archive.html",
  };
}

// ─── DERNIÈRE SÉANCE ───
function renderDernièreSéance(s) {
  document.getElementById("seanceDate").textContent = s.date;
  document.getElementById("seanceIcone").textContent = s.icone;
  document.getElementById("seanceType").textContent = s.type;

  const stats = [s.durée, s.distance, s.puissanceMoyenne].filter(Boolean).join(" · ");
  document.getElementById("seanceStats").textContent = stats;

  const étoiles = "★".repeat(s.ressenti) + "☆".repeat(5 - s.ressenti);
  document.getElementById("seanceEtoiles").textContent = étoiles;
  document.getElementById("seanceRessentLabel").textContent = s.ressentLabel;
  document.getElementById("seanceNote").textContent = s.note;
}

// ─── VITAUX FORME ───
function rendreFormeVitaux(forme) {
  document.getElementById("formeHRV").textContent = forme.hrv + " ms";
  document.getElementById("formeSommeil").textContent = forme.sommeilHeures + "h";
  document.getElementById("formeSommeilQualite").textContent = `Qualité : ${forme.sommeilQualite}%`;

  const maxRef = 600;
  document.getElementById("barAigue").style.width = Math.min((forme.chargeAigue / maxRef) * 100, 100) + "%";
  document.getElementById("barChronique").style.width = Math.min((forme.chronique / maxRef) * 100, 100) + "%";
  document.getElementById("valAigue").textContent = forme.chargeAigue + " UA";
  document.getElementById("valChronique").textContent = forme.chronique + " UA";

  const ratio = forme.ratio;
  const ratioEl = document.getElementById("formeRatio");
  if (ratio === null || ratio === undefined) {
    ratioEl.textContent = "Ratio : —";
    ratioEl.style.color = "#8B8FA8";
  } else {
    ratioEl.textContent = `Ratio : ${ratio}`;
    ratioEl.style.color = ratio > 1.3 ? "#FF6B6B" : ratio < 0.8 ? "#FFD166" : "#00D4AA";
  }

  const interp = {
    ok: "Zone optimale de progression (0.8 – 1.3)",
    surcharge: "⚠️ Zone de surcharge — risque de blessure élevé",
    "sous-charge": "📉 Sous-charge — potentiel de progression sous-exploité",
    "no-recent-activity": "Aucune séance dans les 7 derniers jours — ratio non calculable",
    "no-data": "Pas encore assez de données pour calculer le ratio",
    "recovery_phase": "Phase de récupération post-événement — aucune reco d'intensité",
  };
  document.getElementById("ratioInterpretation").textContent = interp[forme.statut] || "";

  // Base aérobie (decoupling Friel)
  rendreDecoupling();

  // Acclimatation chaleur
  rendreHeatAcclimation();
}

function rendreDecoupling() {
  const block = document.getElementById("decouplingBlock");
  if (!block) return;
  if (typeof window.computeDecouplingStats !== "function") { block.style.display = "none"; return; }

  const stats = window.computeDecouplingStats(athleteActif, 56);
  if (!stats.n) { block.style.display = "none"; return; }

  block.style.display = "block";
  const couleur = stats.mean < 5 ? "#00D4AA" : stats.mean < 10 ? "#FFD166" : "#FF6B6B";
  const valEl = document.getElementById("decouplingValue");
  valEl.textContent = `${stats.mean.toFixed(1)} % de dérive · ${stats.n} course${stats.n > 1 ? "s" : ""}`;
  valEl.style.color = couleur;

  const interp = {
    solide: "Base aérobie solide (< 5 %) — prêt pour l'entraînement spécifique.",
    limite: "Base aérobie limite (5–10 %) — renforce le foncier avant la spécifique.",
    insuffisant: "Base aérobie à renforcer (> 10 %) — repasse en volume Z2.",
  };
  document.getElementById("decouplingInterpretation").textContent = interp[stats.level] || "";
}

function rendreHeatAcclimation() {
  const block = document.getElementById("heatBlock");
  if (!block) return;
  if (typeof window.computeHeatAcclimationStats !== "function") { block.style.display = "none"; return; }

  // Count race proximity — only show block within 4 weeks of race (or if any exposure logged)
  const RACE_DATE = new Date("2026-07-05T00:00:00").getTime();
  const daysToRace = Math.round((RACE_DATE - Date.now()) / 86400000);

  const stats = window.computeHeatAcclimationStats(athleteActif, 14);

  // Hide if no data AND more than 4 weeks from race
  if (stats.count === 0 && daysToRace > 28) { block.style.display = "none"; return; }

  block.style.display = "block";

  const pct = Math.min(100, Math.round((stats.count / stats.target) * 100));
  document.getElementById("heatProgress").style.width = `${pct}%`;

  const valEl = document.getElementById("heatValue");
  valEl.textContent = `${stats.count} / ${stats.target} expos`;
  valEl.style.color = stats.count >= 10 ? "#00D4AA" : stats.count >= 5 ? "#FFD166" : "#FF6B6B";

  const interp = {
    none:        `Aucune expo loggée. À ${daysToRace} jours de Thun, c'est le moment de démarrer (Périard : 10-14 expos).`,
    starting:    `Phase de démarrage. Enchaîne 2-3 expos par semaine pendant les 14 prochains jours.`,
    progressing: `En progression. Tiens la cadence — il te reste ${stats.target - stats.count} expos pour atteindre la cible.`,
    ready:       `Acclimatation solide. Maintiens 2-3 expos par semaine jusqu'à la course.`,
  };
  document.getElementById("heatInterpretation").textContent = interp[stats.level] || "";
}

// ─── PLAN 7 JOURS ───
let seanceSelectionnée = null;

function rendrePlan7jours(plan) {
  const grid = document.getElementById("planGrid");
  grid.innerHTML = "";

  plan.forEach((j, i) => {
    const card = document.createElement("div");
    card.className = `plan-day${i === 0 ? " today" : ""}${j.intensite === "repos" ? " repos" : ""}`;
    card.style.cursor = "pointer";

    const ajustIcone = j.ajustement === "facile" ? "😅" : j.ajustement === "difficile" ? "🔥" : "";

    card.innerHTML = `
      <div style="font-size:0.7rem;font-weight:700;color:#8B8FA8;margin-bottom:2px;">${j.jour}</div>
      <div style="font-size:1.3rem;margin-bottom:4px;">${j.icone}</div>
      <div style="font-size:0.72rem;font-weight:600;line-height:1.3;">${j.type}</div>
      <div style="font-size:0.68rem;margin-top:3px;" class="intensite-${j.intensite}">${j.duree}</div>
      ${ajustIcone ? `<div style="font-size:0.65rem;margin-top:4px;">${ajustIcone}</div>` : ""}
    `;

    card.addEventListener("click", () => ouvrirModalSeance(j, i));
    grid.appendChild(card);
  });

  // Cacher l'ancien tooltip hover (plus nécessaire)
  document.getElementById("planDetail").style.display = "none";
}

// ─── MODAL SÉANCE ───
function ouvrirModalSeance(seance, index) {
  seanceSelectionnée = { seance, index };

  const modal = document.getElementById("modalSeance");
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";

  // Header
  document.getElementById("modalIcone").textContent = seance.icone;
  document.getElementById("modalTitre").textContent = seance.type;
  document.getElementById("modalMeta").textContent = `${seance.jour} ${seance.date} · ${seance.duree}`;

  const badgeClasses = {
    légère: "badge badge-ok", modérée: "badge badge-violet",
    intense: "badge badge-surcharge", longue: "badge badge-violet",
    repos: "badge badge-calibration",
  };
  const badgeLabels = {
    légère: "Léger", modérée: "Modéré", intense: "Intense",
    longue: "Longue distance", repos: "Repos",
  };
  const badgeEl = document.getElementById("modalBadgeIntens");
  badgeEl.className = badgeClasses[seance.intensite] || "badge badge-calibration";
  badgeEl.textContent = badgeLabels[seance.intensite] || seance.intensite;

  // Note coach
  document.getElementById("modalNoteCoach").textContent = seance.noteCoach || "Séance standard — exécute selon ton ressenti.";

  // Zones
  const zonesSection = document.getElementById("modalZonesSection");
  const zonesContainer = document.getElementById("modalZones");
  const effectiveZones = (seance.zones && seance.zones.length) ? seance.zones : _zonesFromProfile(seance);
  if (effectiveZones && effectiveZones.length) {
    zonesSection.style.display = "block";
    zonesContainer.innerHTML = effectiveZones.map(z => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:rgba(255,255,255,0.03);border-radius:10px;border-left:3px solid ${z.couleur};">
        <div style="flex:0 0 90px;">
          <div style="font-size:0.78rem;font-weight:600;color:${z.couleur};">${z.zone}</div>
          <div style="font-size:0.72rem;color:#8B8FA8;">${z.duree || ""}</div>
        </div>
        <div>
          <div style="font-size:0.82rem;font-weight:600;color:#F0F0F5;">${z.label}</div>
          <div style="font-size:0.78rem;color:#8B8FA8;">${z.detail}</div>
        </div>
      </div>
    `).join("");
  } else {
    zonesSection.style.display = "none";
  }

  // Exercices
  document.getElementById("modalExercices").innerHTML = (seance.exercices || []).map((ex, i) => `
    <div style="display:flex;gap:12px;padding:10px 12px;background:rgba(255,255,255,0.03);border-radius:10px;">
      <div style="width:22px;height:22px;background:rgba(108,99,255,0.2);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;color:#6C63FF;flex-shrink:0;">${i + 1}</div>
      <div>
        <div style="font-size:0.85rem;font-weight:600;color:#F0F0F5;">${ex.nom} <span style="color:#8B8FA8;font-weight:400;">— ${ex.duree}</span></div>
        <div style="font-size:0.78rem;color:#8B8FA8;margin-top:2px;">${ex.note}</div>
      </div>
    </div>
  `).join("");

  // Ajustement — remettre l'état sauvegardé
  majBoutonsAjust(seance.ajustement || "ok");
  document.getElementById("modalAjustFeedback").textContent = "";
}

function fermerModal() {
  document.getElementById("modalSeance").style.display = "none";
  document.body.style.overflow = "";
  seanceSelectionnée = null;
}

// ─── MODAL SCORE ───
function ouvrirModalScore() {
  const modal = document.getElementById("modalScore");
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";

  const result = typeof window.explainScore === "function"
    ? window.explainScore(athleteActif)
    : null;

  if (!result || !result.score) {
    document.getElementById("scoreExplainValue").textContent = "—";
    document.getElementById("scoreExplainSub").textContent = "Pas encore assez de données";
    document.getElementById("scoreExplainCalib").textContent = "Remplis ton journal pour commencer à calibrer le score.";
    document.getElementById("scoreExplainLayers").innerHTML = `
      <div style="font-size:0.82rem;color:#8B8FA8;text-align:center;padding:20px;">
        Aucune donnée disponible pour le moment.<br>Lance une sync Strava ou remplis ton journal.
      </div>`;
    document.getElementById("scoreExplainMissingSection").style.display = "none";
    return;
  }

  document.getElementById("scoreExplainValue").textContent = result.score;
  const hw = result.half_width;
  const ciText = Number.isFinite(hw) && hw > 0
    ? `Intervalle de confiance : ${result.ci_low}–${result.ci_high} (± ${hw} pts). `
    : "";
  document.getElementById("scoreExplainSub").textContent =
    `Calculé à partir de ${result.calibrated} dimension${result.calibrated > 1 ? "s" : ""} sur ${result.total_layers}`;
  document.getElementById("scoreExplainCalib").textContent =
    result.calibrated < result.total_layers
      ? `${ciText}${result.total_layers - result.calibrated} dimension(s) encore en calibration — le score s'affinera avec plus de données.`
      : `${ciText}Toutes les dimensions sont calibrées.`;

  const LAYER_ICONS = {
    Sommeil: "😴", Charge: "⚡", Physiologie: "🫀", Psychologie: "🧠",
    Biologie: "🧬", Ressentis: "💬", Nutrition: "🥗", Génétique: "🔬",
  };

  const layersHtml = result.layers.map((l, idx) => {
    const couleur = l.score >= 70 ? "#00D4AA" : l.score >= 50 ? "#6C63FF" : "#FF6B6B";
    const barWidth = l.score;
    const topSignalsHTML = (l.top_signals || []).slice(0, 4).map(s => {
      const zTxt = s.z !== null && s.z !== undefined
        ? `<span style="color:${s.z > 0 ? "#00D4AA" : s.z < -0.5 ? "#FF6B6B" : "#8B8FA8"};">z ${s.z > 0 ? "+" : ""}${s.z}</span>`
        : "";
      const baseTxt = s.baseline !== null && s.baseline !== undefined
        ? ` <span style="color:#555870;">(baseline ${s.baseline}${s.unit ? s.unit : ""})</span>`
        : "";
      const displayOnly = s.display_only ? `<span style="color:#555870;font-size:0.6rem;margin-left:6px;">display-only</span>` : "";
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;font-size:0.72rem;padding:4px 0;gap:8px;">
          <span style="color:#D0D0E0;">${s.label}${displayOnly}</span>
          <span style="color:#8B8FA8;white-space:nowrap;">${s.value}${s.unit || ""} ${zTxt}${baseTxt}</span>
        </div>
      `;
    }).join("");

    return `
      <div style="background:rgba(255,255,255,0.03);border-radius:10px;padding:10px 12px;">
        <div class="layer-row" data-expand="${idx}" style="cursor:pointer;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            <div style="font-size:0.82rem;font-weight:600;color:#F0F0F5;display:flex;align-items:center;gap:6px;">
              ${LAYER_ICONS[l.label] || "📊"} ${l.label}
              ${(l.top_signals && l.top_signals.length) ? '<span style="font-size:0.6rem;color:#555870;">▼</span>' : ''}
            </div>
            <div style="font-size:0.82rem;font-weight:700;color:${couleur};">${l.score}/100</div>
          </div>
          <div style="height:4px;background:#2A2D3E;border-radius:2px;overflow:hidden;">
            <div style="height:100%;width:${barWidth}%;background:${couleur};border-radius:2px;transition:width 0.6s ease;"></div>
          </div>
          <div style="font-size:0.68rem;color:#555870;margin-top:4px;">Poids : ${l.contribution}% du score global</div>
        </div>
        ${topSignalsHTML ? `
          <div id="layer-signals-${idx}" style="display:none;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.06);">
            <div style="font-size:0.62rem;font-weight:700;color:#8B8FA8;text-transform:uppercase;margin-bottom:4px;">Signaux contribuant</div>
            ${topSignalsHTML}
          </div>
        ` : ""}
      </div>`;
  }).join("");

  document.getElementById("scoreExplainLayers").innerHTML = layersHtml || `
    <div style="font-size:0.82rem;color:#8B8FA8;text-align:center;padding:20px;">
      Aucune couche calibrée pour l'instant.
    </div>`;

  // Bind expand/collapse on layer rows
  document.querySelectorAll("#scoreExplainLayers .layer-row").forEach(row => {
    row.addEventListener("click", () => {
      const idx = row.dataset.expand;
      const panel = document.getElementById(`layer-signals-${idx}`);
      if (!panel) return;
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    });
  });

  // Signaux manquants
  const allSignalIds = Object.keys(window.SIGNALS || {});
  const obs = JSON.parse(localStorage.getItem("coach-ia:obs") || "[]")
    .filter(o => o.athlete_id === athleteActif)
    .map(o => o.signal_id);
  const wearableIds = (window.WEARABLE_OBS || []).map(o => o.signal_id);
  const seen = new Set([...obs, ...wearableIds]);
  const missing = allSignalIds
    .filter(id => !seen.has(id))
    .map(id => window.SIGNALS[id]?.label_fr)
    .filter(Boolean);

  const missingSection = document.getElementById("scoreExplainMissingSection");
  if (missing.length) {
    missingSection.style.display = "block";
    document.getElementById("scoreExplainMissing").textContent = missing.join(" · ");
  } else {
    missingSection.style.display = "none";
  }
}

function fermerModalScore() {
  document.getElementById("modalScore").style.display = "none";
  document.body.style.overflow = "";
}

function majBoutonsAjust(valeur) {
  const colors = { facile: "#FFD166", ok: "#00D4AA", difficile: "#FF6B6B" };
  document.querySelectorAll(".btn-ajust").forEach(btn => {
    const isActive = btn.dataset.val === valeur;
    btn.style.borderColor = isActive ? colors[valeur] : "#2A2D3E";
    btn.style.color = isActive ? colors[valeur] : "#8B8FA8";
    btn.style.background = isActive ? `rgba(${valeur === "facile" ? "255,209,102" : valeur === "ok" ? "0,212,170" : "255,107,107"},0.1)` : "transparent";
  });
}

function ajusterSeance(valeur) {
  if (!seanceSelectionnée) return;

  const { seance } = seanceSelectionnée;
  seance.ajustement = valeur;
  majBoutonsAjust(valeur);

  const feedbacks = {
    facile:    "Noté. Je prends en compte ton niveau d'énergie — je vais augmenter légèrement l'intensité pour la prochaine séance similaire.",
    ok:        "Parfait. Cette séance est calibrée pour toi. Lance-toi.",
    difficile: "Compris. Je vais alléger cette séance. Ton ressenti compte plus que le programme sur papier.",
  };
  document.getElementById("modalAjustFeedback").textContent = feedbacks[valeur] || "";

  // Rafraîchir la carte dans le plan pour afficher l'icône d'ajustement
  const athlete = window.ATHLETES[athleteActif];
  rendrePlan7jours(athlete.plan7jours);
}

// ─── SÉLECTEUR ATHLÈTE ───
function bindSélecteurAthlète() {
  document.querySelectorAll(".athlete-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".athlete-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      athleteActif = btn.dataset.athlete;
      rendreAthlète(athleteActif);
    });
  });
}

// ─── CHAT ───
function chargerChatInitial(a) {
  const athlete = a || window.ATHLETES[athleteActif];
  const container = document.getElementById("chatMessages");
  container.innerHTML = "";
  athlete.chatHistorique.forEach(m => ajouterMessage(m.role, m.message, false));
}

function toggleChat() {
  const panel = document.getElementById("chatPanel");
  const overlay = document.getElementById("overlay");
  const fab = document.getElementById("fabChat");
  panel.classList.toggle("open");
  overlay.classList.toggle("active");
  fab.classList.toggle("hidden");
  if (panel.classList.contains("open")) {
    setTimeout(() => document.getElementById("chatInput").focus(), 350);
  }
}

function ajouterMessage(role, texte, animer = true) {
  const container = document.getElementById("chatMessages");
  const div = document.createElement("div");
  div.className = `msg-${role}${animer ? " fade-in" : ""}`;
  div.textContent = texte;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function afficherTyping() {
  const container = document.getElementById("chatMessages");
  const div = document.createElement("div");
  div.className = "msg-ia msg-typing";
  div.id = "typingIndicator";
  div.innerHTML = `<span></span><span></span><span></span>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function supprimerTyping() {
  const t = document.getElementById("typingIndicator");
  if (t) t.remove();
}

function trouverRéponse(message) {
  const m = message.toLowerCase();
  // Réponse contextuelle basée sur les données réelles (Benoît) si disponibles
  const ctx = _chatContexte();
  if (ctx) {
    const dyn = _chatReponseDynamique(m, ctx);
    if (dyn) return dyn;
  }
  for (const r of window.CHAT_REPONSES) {
    if (r.mots.some(mot => m.includes(mot))) return r.reponse;
  }
  return window.CHAT_DEFAUT;
}

// ─── CONTEXTE CHAT IA (données réelles) ──────────────────────────────
function _chatContexte() {
  if (athleteActif !== "benoit") return null;
  if (!window.HISTORY || !window.HISTORY.weeks) return null;
  const H = window.HISTORY;
  const lastDay = H.daily[H.daily.length - 1];
  const lastWeek = H.weeks[H.weeks.length - 1];
  const last7 = H.daily.slice(-7);

  let state = null;
  if (window.inferTrainingState) { try { state = window.inferTrainingState(); } catch (e) {} }
  let ex = null;
  if (window.explainScore) { try { ex = window.explainScore("benoit"); } catch (e) {} }

  const hrvVals7 = last7.filter(d => d.hrv != null).map(d => d.hrv);
  const hrvVals28 = H.daily.slice(-28).filter(d => d.hrv != null).map(d => d.hrv);
  const avg = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
  const hrv7 = avg(hrvVals7);
  const hrv28 = avg(hrvVals28);

  const sleepAvg7 = avg(last7.filter(d => d.sleep && d.sleep.hours != null).map(d => d.sleep.hours));
  const recAvg7 = avg(last7.filter(d => d.recovery != null).map(d => d.recovery));

  return {
    lastDay, lastWeek, last7,
    state, ex,
    hrv7: hrv7 != null ? Math.round(hrv7) : null,
    hrv28: hrv28 != null ? Math.round(hrv28) : null,
    hrvDelta: (hrv7 != null && hrv28 != null) ? Math.round(hrv7 - hrv28) : null,
    sleepAvg7: sleepAvg7 != null ? sleepAvg7.toFixed(1) : null,
    recAvg7: recAvg7 != null ? Math.round(recAvg7) : null,
    forme: ex ? ex.score : null,
    acwr: lastWeek.metrics.acwr,
    sig: lastWeek.signature,
  };
}

function _chatReponseDynamique(m, c) {
  const jSince = c.state ? c.state.illnessDaysSince : null;
  const sortieMaladie = c.sig === "Choc immunitaire" && jSince != null && jSince <= 7;

  // Fatigue / épuisement
  if (/fatigu|épuisé|epuise|crevé|creve/.test(m)) {
    if (sortieMaladie) {
      return `C'est normal à J+${jSince} d'un épisode immunitaire. Ton HRV moyen sur 7j est à ${c.hrv7 ?? "—"}ms (baseline ${c.hrv28 ?? "—"}ms), recovery moyen ${c.recAvg7 ?? "—"}%. La fatigue là, ce n'est pas de la paresse — c'est ton corps qui finit de nettoyer. Ne force pas cette semaine, on reconstruit.`;
    }
    if (c.acwr && c.acwr > 1.3) {
      return `Tes chiffres racontent la même chose : ACWR à ${c.acwr} (zone risque), HRV 7j à ${c.hrv7 ?? "—"}ms (${c.hrvDelta != null ? (c.hrvDelta >= 0 ? "+" + c.hrvDelta : c.hrvDelta) : "—"} vs baseline). Semaine en cours : "${c.sig}". C'est le moment de décharger, pas de forcer.`;
    }
    return `Ton HRV sur 7j est à ${c.hrv7 ?? "—"}ms (baseline ${c.hrv28 ?? "—"}ms), recovery ${c.recAvg7 ?? "—"}%, ACWR ${c.acwr ?? "—"}. Semaine en cours : "${c.sig}". La fatigue n'est pas un échec — c'est de l'information. On regarde ce qui s'est passé ces 7 jours ?`;
  }

  // Sommeil (avant "douleur" parce que "mal dormi" contient "mal")
  if (/sommeil|dormir|dormi|nuit|insomnie|réveil|reveil/.test(m)) {
    return `Ton sommeil moyen sur 7j est à ${c.sleepAvg7 ?? "—"}h. HRV ce matin à ${c.lastDay?.hrv ?? "—"}ms (baseline 28j ${c.hrv28 ?? "—"}ms). Tu te sens comment au réveil — frais, groggy, ou entre les deux ? Plus tu précises, plus je peux t'aider à cibler.`;
  }

  // Motivation
  if (/motivation|envie|démotivé|demotive|plus envie/.test(m)) {
    if (sortieMaladie) {
      return `À J+${jSince} d'un épisode immunitaire, la démotivation est quasi systématique — c'est physiologique, pas mental. Ton corps n'a pas encore fini de se remettre. Donne-toi 3-4 jours de volume léger. L'envie revient avec la forme.`;
    }
    return `La démotivation est souvent un signal physio déguisé. Regarde : HRV 7j ${c.hrv7 ?? "—"}ms (${c.hrvDelta != null && c.hrvDelta < 0 ? "sous" : "au-dessus de"} ta baseline), recovery ${c.recAvg7 ?? "—"}%. Forme globale ${c.forme ?? "—"}/100. Qu'est-ce qui s'est passé dans ta vie les 10 derniers jours ?`;
  }

  // Charge / volume / trop / beaucoup
  if (/charge|volume|trop\b|beaucoup|intensit/.test(m)) {
    return `Ton ACWR semaine en cours est à ${c.acwr ?? "—"} (zone ${c.acwr > 1.3 ? "risque" : c.acwr < 0.8 ? "sous-charge" : "optimale"}). Signature "${c.sig}". Forme ${c.forme ?? "—"}/100. Tu as l'impression de courir après le programme, ou de le maîtriser ?`;
  }

  // Objectif / ironman / thun
  if (/objectif|ironman|thun|course|compétition|competition/.test(m)) {
    const jToRace = Math.max(0, Math.floor((new Date("2026-07-05") - new Date("2026-04-19")) / 86400000));
    return `${jToRace} jours avant Thun. État actuel : ${c.state?.mode || "build"} ("${c.sig}"). Volume moyen récent : ${Math.round((c.lastWeek.metrics.volume_min || 0) / 60)}h cette semaine. Qu'est-ce que cet Ironman représente pour toi au fond — un objectif, ou une transformation ?`;
  }

  // Score / forme
  if (/score|forme|comment.*moi|où.*j.en|aujourd.hui/.test(m)) {
    return `Forme ${c.forme ?? "—"}/100 ce matin. HRV ${c.lastDay?.hrv ?? "—"}ms (baseline ${c.hrv28 ?? "—"}ms), recovery ${c.lastDay?.recovery ?? "—"}%, sommeil ${c.lastDay?.sleep?.hours?.toFixed(1) ?? "—"}h. Signature semaine : "${c.sig}". ${c.state?.reason ? "Contexte : " + c.state.reason + "." : ""}`;
  }

  return null;
}

function envoyerMessage() {
  const input = document.getElementById("chatInput");
  const texte = input.value.trim();
  if (!texte) return;

  ajouterMessage("user", texte);
  input.value = "";

  afficherTyping();
  setTimeout(() => {
    supprimerTyping();
    ajouterMessage("ia", trouverRéponse(texte));
  }, 1400 + Math.random() * 600);
}
