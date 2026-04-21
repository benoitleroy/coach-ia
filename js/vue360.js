// VUE360.JS — radar chart SVG + cartes des 8 couches

let athleteActif360 = "benoit";
let couche360Active = null;

const COUCHES_META = [
  { id: "genetique",      label: "Génétique",       icone: "🧬", sousTitre: "Potentiel physiologique & prédispositions" },
  { id: "biologique",     label: "Biologique",      icone: "⏳", sousTitre: "Adaptations selon l'âge & profil hormonal" },
  { id: "physiologique",  label: "Physiologique",   icone: "❤️", sousTitre: "VO2max, seuils, puissance critique" },
  { id: "psychologique",  label: "Psychologique",   icone: "🧠", sousTitre: "Résilience, motivation, patterns sous pression" },
  { id: "sommeil",        label: "Sommeil",          icone: "🌙", sousTitre: "HRV, cycles, dette de récupération" },
  { id: "nutrition",      label: "Nutrition",        icone: "🥗", sousTitre: "Timing, composition, micronutrition" },
  { id: "charge",         label: "Charge",           icone: "⚡", sousTitre: "Volume, intensité, ratio aiguë/chronique" },
  { id: "ressentis",      label: "Ressentis de vie", icone: "🌊", sousTitre: "Stress, famille, événements de vie" },
];

document.addEventListener("DOMContentLoaded", () => {
  rendrePage(athleteActif360);
  bindSélecteur();
});

function rendrePage(id) {
  const a = window.ATHLETES[id];
  if (!a) return;
  if (id === "benoit") enhanceBenoitCouches(a);
  couche360Active = null;
  document.getElementById("detailCouche").style.display = "none";
  rendreRadar(a);
  rendreScoreGlobal(a);
  rendreMiniBars(a);
  rendreGrille(a);
  rendreHeatAcclimation360(id);
  rendreGutTraining(id);
  rendreSleepCalendar(id);
  rendreImmunite(id);
  rendreHrZones(id);
}

// ─── INJECTION DE DONNÉES RÉELLES POUR BENOÎT ──────────────────────────
// Remplace a.couches par un objet recalculé à partir de explainScore() + HISTORY
function enhanceBenoitCouches(a) {
  if (!window.explainScore || !window.HISTORY) return;
  let ex;
  try { ex = window.explainScore("benoit"); } catch (e) { return; }
  if (!ex || !ex.layers) return;

  const H = window.HISTORY;
  const lastDay = H.daily[H.daily.length - 1];
  const lastWeek = H.weeks[H.weeks.length - 1];
  const last28 = H.daily.slice(-28);
  const recent4weeks = H.weeks.slice(-6).filter(w => w.days_count >= 6).slice(-4);

  // Aggrégats utiles pour construire les points narratifs
  const hrvVals = last28.filter(d => d.hrv != null).map(d => d.hrv);
  const hrvAvg = avg(hrvVals);
  const rhrVals = last28.filter(d => d.rhr != null).map(d => d.rhr);
  const rhrAvg = avg(rhrVals);
  const sleepHours = last28.filter(d => d.sleep && d.sleep.hours != null).map(d => d.sleep.hours);
  const sleepAvg = avg(sleepHours);
  const sleepEffVals = last28.filter(d => d.sleep && d.sleep.efficiency != null).map(d => d.sleep.efficiency);
  const sleepEffAvg = avg(sleepEffVals);
  const recVals = last28.filter(d => d.recovery != null).map(d => d.recovery);
  const recAvg = avg(recVals);
  const avgVolMin = recent4weeks.length
    ? recent4weeks.reduce((s, w) => s + (w.metrics.volume_min || 0), 0) / recent4weeks.length
    : 0;
  const acwr = lastWeek ? lastWeek.metrics.acwr : null;

  // Indexe les layers retournés par explainScore
  const byLayer = {};
  ex.layers.forEach(l => { byLayer[l.id] = l; });

  // Helper pour formater un signal du top_signals
  const fmtSig = s => {
    const v = s.value != null ? `${s.value}${s.unit || ""}` : "";
    const z = s.z != null ? ` (z${s.z >= 0 ? "+" : ""}${s.z})` : "";
    return `${s.label} : ${v}${z}`;
  };

  const newCouches = {};

  // Sommeil ──
  const sommeil = byLayer.sommeil;
  const sommeilPoints = [];
  if (sleepAvg != null) sommeilPoints.push(`Durée moyenne 28j : ${sleepAvg.toFixed(1)}h (cible 8h)`);
  if (hrvAvg != null) {
    // On compare HRV moyen récent au HRV du jour pour une narrative juste
    const hrvToday = lastDay && lastDay.hrv != null ? lastDay.hrv : null;
    const delta = hrvToday != null ? hrvToday - hrvAvg : null;
    const tag = delta != null
      ? (delta > 1 ? " — ce matin au-dessus de ta baseline" : delta < -1 ? " — ce matin sous ta baseline" : " — stable")
      : "";
    sommeilPoints.push(`HRV baseline 28j : ${Math.round(hrvAvg)}ms${tag}`);
  }
  if (sleepEffAvg != null) sommeilPoints.push(`Efficacité moyenne : ${Math.round(sleepEffAvg)}%${sleepEffAvg >= 88 ? " (excellente)" : ""}`);
  if (sommeil && sommeil.top_signals && sommeil.top_signals.length) {
    sommeil.top_signals.slice(0, 2).forEach(s => sommeilPoints.push(`Signal ce matin · ${fmtSig(s)}`));
  }
  newCouches.sommeil = {
    score: sommeil && sommeil.score != null ? sommeil.score : 0,
    statut: sommeil && sommeil.score != null ? "calibré" : "en-calibration",
    points: sommeilPoints.length ? sommeilPoints : ["Pas encore de données de sommeil consolidées."],
  };

  // Charge ──
  const charge = byLayer.charge;
  const chargePoints = [];
  if (acwr != null) chargePoints.push(`ACWR semaine en cours : ${acwr}${acwr > 1.3 ? " — zone risque" : acwr < 0.8 ? " — sous-charge" : " — zone optimale"}`);
  if (lastWeek) chargePoints.push(`Signature semaine : ${lastWeek.signature} · ${lastWeek.metrics.session_count || 0} séances`);
  chargePoints.push(`Volume moyen 4 dernières semaines pleines : ${Math.round(avgVolMin / 60)}h`);
  if (charge && charge.top_signals && charge.top_signals.length) {
    charge.top_signals.slice(0, 2).forEach(s => chargePoints.push(`Signal · ${fmtSig(s)}`));
  }
  newCouches.charge = {
    score: charge && charge.score != null ? charge.score : 0,
    statut: charge && charge.score != null ? "calibré" : "en-calibration",
    points: chargePoints,
  };

  // Physiologique ──
  const physio = byLayer.physiologique;
  const physioPoints = [];
  if (rhrAvg != null) physioPoints.push(`RHR moyen 28j : ${Math.round(rhrAvg)}bpm`);
  if (recAvg != null) physioPoints.push(`Récupération moyenne : ${Math.round(recAvg)}%${recAvg >= 70 ? " — corps qui absorbe bien" : " — à surveiller"}`);
  if (lastDay && lastDay.composite_flag) {
    physioPoints.push(`Flags physio ce matin : ${lastDay.composite_flag.count}/4 (HRV/RHR/RR/skin temp)`);
  }
  if (physio && physio.top_signals && physio.top_signals.length) {
    physio.top_signals.slice(0, 2).forEach(s => physioPoints.push(`Signal · ${fmtSig(s)}`));
  }
  newCouches.physiologique = {
    score: physio && physio.score != null ? physio.score : 0,
    statut: physio && physio.score != null ? "calibré" : "en-calibration",
    points: physioPoints,
  };

  // Psychologique ──
  const psy = byLayer.psychologique;
  const psyPoints = [];
  if (psy && psy.top_signals && psy.top_signals.length) {
    psy.top_signals.slice(0, 4).forEach(s => psyPoints.push(fmtSig(s)));
  } else {
    psyPoints.push("Remplis ton journal du jour pour calibrer cette dimension.");
    psyPoints.push("Motivation, humeur, stress pro — 4 questions, 30 secondes.");
  }
  newCouches.psychologique = {
    score: psy && psy.score != null ? psy.score : 0,
    statut: psy && psy.score != null ? "calibré" : "en-calibration",
    points: psyPoints,
  };

  // Biologique ──
  const bio = byLayer.biologique;
  const bioPoints = [
    `Âge : 42 ans — maintien performance possible avec volume progressif`,
    `Adaptation chaleur : Marseille — terrain connu, utilisable pour Thun`,
  ];
  if (recAvg != null) bioPoints.push(`Récupération moyenne 28j : ${Math.round(recAvg)}%`);
  newCouches.biologique = {
    score: bio && bio.score != null ? bio.score : 0,
    statut: bio && bio.score != null ? "calibré" : "en-calibration",
    points: bioPoints,
  };

  // Ressentis ──
  const ress = byLayer.ressentis;
  const ressPoints = [];
  if (ress && ress.top_signals && ress.top_signals.length) {
    ress.top_signals.slice(0, 4).forEach(s => ressPoints.push(fmtSig(s)));
  } else {
    ressPoints.push("Remplis le journal du jour pour activer cette dimension.");
    ressPoints.push("Énergie, douleur, stress perso — ce que le wearable ne voit pas.");
  }
  newCouches.ressentis = {
    score: ress && ress.score != null ? ress.score : 0,
    statut: ress && ress.score != null ? "calibré" : "en-calibration",
    points: ressPoints,
  };

  // Nutrition ── (Lot 30 : signaux protéines + hydratation + gut training)
  const nutrLayer = byLayer && byLayer.nutrition;
  const layerScoreNutrition = nutrLayer ? nutrLayer.score : null;
  if (layerScoreNutrition !== null && layerScoreNutrition !== undefined) {
    newCouches.nutrition = {
      score: layerScoreNutrition,
      statut: "calibré",
      points: [
        "Protéines et hydratation tracées via journal quotidien.",
        "Gut training tracé sur séances longues (cible 80 g/h pour Thun).",
        "Plus tu logges, plus le score devient fiable.",
      ],
    };
  } else {
    newCouches.nutrition = {
      score: 0,
      statut: "en-calibration",
      points: [
        "Module activé — saisis protéines + hydratation dans ton journal quotidien pour commencer.",
        "Pour Thun : priorité au gut training (voir carte dédiée ci-dessous).",
      ],
    };
  }

  // Génétique ── (statique, données propriétaire déclarative)
  newCouches.genetique = a.couches.genetique || {
    score: 0, statut: "en-calibration", points: ["Données génétiques à importer."],
  };

  a.couches = newCouches;
}

function avg(arr) {
  if (!arr || !arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// ─── RADAR CHART SVG ───
function rendreRadar(a) {
  const svg = document.getElementById("radarSvg");
  svg.innerHTML = "";

  const cx = 150, cy = 150, r = 110;
  const n = 8;
  const scores = COUCHES_META.map(c => {
    const s = a.couches[c.id]?.score || 0;
    return s === 0 ? 30 : s; // les modules non calibrés affichent un minimum
  });

  // Grilles de fond (5 niveaux)
  for (let level = 1; level <= 5; level++) {
    const fr = (r * level) / 5;
    const pts = Array.from({ length: n }, (_, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      return `${cx + fr * Math.cos(angle)},${cy + fr * Math.sin(angle)}`;
    }).join(" ");
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    poly.setAttribute("points", pts);
    poly.setAttribute("fill", "none");
    poly.setAttribute("stroke", level === 5 ? "#3A3D5E" : "#2A2D3E");
    poly.setAttribute("stroke-width", level === 5 ? "1.5" : "1");
    svg.appendChild(poly);
  }

  // Axes
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", cx); line.setAttribute("y1", cy);
    line.setAttribute("x2", cx + r * Math.cos(angle));
    line.setAttribute("y2", cy + r * Math.sin(angle));
    line.setAttribute("stroke", "#2A2D3E"); line.setAttribute("stroke-width", "1");
    svg.appendChild(line);
  }

  // Labels axes
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    const lr = r + 22;
    const x = cx + lr * Math.cos(angle);
    const y = cy + lr * Math.sin(angle);
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x); text.setAttribute("y", y + 4);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("font-size", "9");
    text.setAttribute("fill", "#8B8FA8");
    text.setAttribute("font-family", "Inter, sans-serif");
    text.textContent = COUCHES_META[i].icone + " " + COUCHES_META[i].label;
    svg.appendChild(text);
  }

  // Zone de données (remplie)
  const dataPts = scores.map((s, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    const dr = (s / 100) * r;
    return `${cx + dr * Math.cos(angle)},${cy + dr * Math.sin(angle)}`;
  }).join(" ");

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.innerHTML = `
    <linearGradient id="radarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6C63FF;stop-opacity:0.4"/>
      <stop offset="100%" style="stop-color:#00D4AA;stop-opacity:0.2"/>
    </linearGradient>`;
  svg.appendChild(defs);

  const fill = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  fill.setAttribute("points", dataPts);
  fill.setAttribute("fill", "url(#radarGrad)");
  fill.setAttribute("stroke", "#6C63FF");
  fill.setAttribute("stroke-width", "2");
  svg.appendChild(fill);

  // Points sur les axes
  scores.forEach((s, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    const dr = (s / 100) * r;
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", cx + dr * Math.cos(angle));
    circle.setAttribute("cy", cy + dr * Math.sin(angle));
    circle.setAttribute("r", "4");
    const isCalibré = a.couches[COUCHES_META[i].id]?.statut === "calibré";
    circle.setAttribute("fill", isCalibré ? "#6C63FF" : "#555870");
    circle.setAttribute("stroke", "#1A1D27");
    circle.setAttribute("stroke-width", "2");
    svg.appendChild(circle);
  });

  // Légende
  const legende = document.getElementById("radarLegende");
  legende.innerHTML = `
    <div style="display:flex;align-items:center;gap:5px;font-size:0.72rem;color:#8B8FA8;">
      <div style="width:10px;height:10px;background:#6C63FF;border-radius:50%;"></div> Calibré
    </div>
    <div style="display:flex;align-items:center;gap:5px;font-size:0.72rem;color:#8B8FA8;">
      <div style="width:10px;height:10px;background:#555870;border-radius:50%;"></div> En calibration
    </div>`;
}

// ─── SCORE GLOBAL ───
function rendreScoreGlobal(a) {
  const couches = Object.values(a.couches);
  const calibrées = couches.filter(c => c.score > 0);
  const moy = calibrées.length
    ? Math.round(calibrées.reduce((s, c) => s + c.score, 0) / calibrées.length)
    : 0;

  const circumference = 2 * Math.PI * 50; // r=50 → ~314
  const offset = circumference - (moy / 100) * circumference;
  document.getElementById("globalRingFill").style.strokeDashoffset = offset;
  document.getElementById("globalScore").textContent = moy;

  const nbCalibré = calibrées.length;
  document.getElementById("globalResume").textContent =
    `${nbCalibré}/8 dimensions calibrées. ${8 - nbCalibré} en attente de données.`;
}

// ─── MINI BARRES ───
function rendreMiniBars(a) {
  const container = document.getElementById("miniBars");
  container.innerHTML = COUCHES_META.map(c => {
    const couche = a.couches[c.id];
    const score = couche?.score || 0;
    const calibré = couche?.statut === "calibré";
    const couleur = score >= 75 ? "#00D4AA" : score >= 55 ? "#6C63FF" : "#FF6B6B";
    return `
      <div>
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
          <span style="font-size:0.75rem;color:#8B8FA8;">${c.icone} ${c.label}</span>
          <span style="font-size:0.75rem;font-weight:600;color:${calibré ? couleur : "#555870"};">
            ${calibré ? score : "—"}
          </span>
        </div>
        <div class="progress-bar" style="height:4px;">
          <div class="progress-fill" style="width:${calibré ? score : 0}%;background:${calibré ? couleur : "#555870"};transition:width 0.8s ease;"></div>
        </div>
      </div>`;
  }).join("");
}

// ─── GRILLE 8 COUCHES ───
function rendreGrille(a) {
  const grille = document.getElementById("grilleCouches");
  grille.innerHTML = COUCHES_META.map(c => {
    const couche = a.couches[c.id];
    const calibré = couche?.statut === "calibré";
    const score = couche?.score || 0;
    const couleur = score >= 75 ? "#00D4AA" : score >= 55 ? "#6C63FF" : "#FF6B6B";

    const scoreAffiche = calibré
      ? `<div style="font-size:1.6rem;font-weight:800;color:${couleur};">${score}</div><div style="font-size:0.68rem;color:#8B8FA8;">/100</div>`
      : `<div style="font-size:0.7rem;" class="badge badge-calibration">En calibration</div>`;

    return `
      <div class="couche-card" onclick="ouvrirCouche('${c.id}')" id="card-${c.id}">
        <div style="font-size:1.5rem;margin-bottom:8px;">${c.icone}</div>
        <div style="font-size:0.82rem;font-weight:700;margin-bottom:6px;">${c.label}</div>
        <div style="text-align:center;">${scoreAffiche}</div>
        ${calibré ? `
          <div class="progress-bar" style="height:3px;margin-top:10px;">
            <div class="progress-fill" style="width:${score}%;background:${couleur};"></div>
          </div>` : ""}
      </div>`;
  }).join("");
}

// ─── DÉTAIL COUCHE ───
function ouvrirCouche(id) {
  const a = window.ATHLETES[athleteActif360];
  const meta = COUCHES_META.find(c => c.id === id);
  const couche = a.couches[id];
  if (!meta || !couche) return;

  // Highlight carte active
  document.querySelectorAll(".couche-card").forEach(c => c.classList.remove("active"));
  document.getElementById(`card-${id}`)?.classList.add("active");

  couche360Active = id;

  document.getElementById("detailIcone").textContent = meta.icone;
  document.getElementById("detailTitre").textContent = meta.label;
  document.getElementById("detailSousTitre").textContent = meta.sousTitre;

  const calibré = couche.statut === "calibré";
  const score = couche.score;
  const couleur = score >= 75 ? "#00D4AA" : score >= 55 ? "#6C63FF" : "#FF6B6B";

  document.getElementById("detailScore").textContent = calibré ? score : "—";
  document.getElementById("detailScore").style.color = calibré ? couleur : "#555870";
  document.getElementById("detailBarFill").style.width = calibré ? score + "%" : "0%";

  // Points clés
  const pointsEl = document.getElementById("detailPoints");
  pointsEl.innerHTML = couche.points.map(p => `
    <div style="display:flex;gap:10px;align-items:flex-start;">
      <div style="width:6px;height:6px;border-radius:50%;background:${calibré ? couleur : "#555870"};margin-top:6px;flex-shrink:0;"></div>
      <p style="font-size:0.87rem;color:${calibré ? "#D0D0E0" : "#8B8FA8"};line-height:1.55;">${p}</p>
    </div>`).join("");

  // CTA selon statut
  const ctaEl = document.getElementById("detailCTA");
  if (!calibré) {
    ctaEl.innerHTML = `
      <div style="background:rgba(108,99,255,0.08);border:1px dashed rgba(108,99,255,0.3);border-radius:12px;padding:1rem;text-align:center;">
        <div style="font-size:1.2rem;margin-bottom:6px;">🔒</div>
        <p style="font-size:0.85rem;font-weight:600;color:#6C63FF;margin-bottom:4px;">Dimension en cours de calibration</p>
        <p style="font-size:0.8rem;color:#8B8FA8;">Remplis ton journal quotidien pendant 7 jours pour activer cette dimension.</p>
      </div>`;
  } else {
    const ctaMessages = {
      genetique:     "Ces données génétiques sont des tendances, pas des destins. Utilise-les pour orienter, pas pour te limiter.",
      biologique:    "Ton âge biologique est une donnée parmi d'autres. La manière dont tu entraînes ton corps redéfinit ces prédispositions.",
      physiologique: "Tes seuils sont ta carte du territoire. Chaque séance bien calibrée repousse ces frontières.",
      psychologique: "La performance mentale se travaille comme la forme physique. Ce que tu connais de toi est déjà un avantage.",
      sommeil:       "Le sommeil est ta séance la plus importante. Tout le reste en dépend.",
      nutrition:     "La nutrition, c'est le carburant. Ni plus, ni moins. L'obsession nuit autant que la négligence.",
      charge:        "La progression optimale est un équilibre, pas une accumulation. Ton ratio te dit où tu en es.",
      ressentis:     "Ce que tu vis en dehors du sport compte autant que ce que tu fais dedans. C'est l'une des vérités les moins enseignées.",
    };
    ctaEl.innerHTML = `
      <div style="background:rgba(0,212,170,0.08);border:1px solid rgba(0,212,170,0.2);border-radius:12px;padding:1rem;">
        <div style="display:flex;gap:8px;align-items:flex-start;">
          <span>🤖</span>
          <p style="font-size:0.85rem;color:#A0C0B0;line-height:1.55;font-style:italic;">"${ctaMessages[id] || ""}"</p>
        </div>
      </div>`;
  }

  // Lot 28 — drill-down signaux + sparkline
  _rendreDrillDown(id, athleteActif360, couleur);

  const detail = document.getElementById("detailCouche");
  detail.style.display = "block";
  detail.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ─── LOT 28 : DRILL-DOWN PAR COUCHE ─────────────────────────────────────
function _rendreDrillDown(layerId, athleteId, couleur) {
  const signalsWrap = document.getElementById("detailSignals");
  const sparkWrap = document.getElementById("detailSparkline");

  // 1. Liste des signaux actifs (via explainScore)
  let signals = [];
  if (typeof window.explainScore === "function") {
    const exp = window.explainScore(athleteId);
    if (exp && exp.layers) {
      const layerExp = exp.layers.find(l => l.id === layerId);
      signals = (layerExp && layerExp.top_signals) || [];
    }
  }

  if (signals.length === 0) {
    signalsWrap.style.display = "none";
  } else {
    signalsWrap.style.display = "block";
    document.getElementById("detailSignalsCount").textContent =
      `${signals.length} ${signals.length > 1 ? "signaux alimentent" : "signal alimente"} ce score`;
    document.getElementById("detailSignalsList").innerHTML =
      signals.map(s => _renderSignalCard(s, couleur)).join("");
  }

  // 2. Sparkline 30j selon la couche
  const mapping = {
    sommeil:       { key: "sleep.hours",    label: "Sommeil 30j",     unit: "h",  target: 7.5 },
    physiologique: { key: "recovery",       label: "Récupération 30j", unit: "%", target: 65 },
    biologique:    { key: "recovery",       label: "Récupération 30j", unit: "%", target: 65 },
    charge:        { key: "strain_whoop",   label: "Charge 30j",       unit: "",  target: 12, fallback: "strain_strava" },
  };
  const cfg = mapping[layerId];
  if (!cfg || !window.HISTORY || !Array.isArray(window.HISTORY.daily)) {
    sparkWrap.style.display = "none";
    return;
  }

  const last30 = window.HISTORY.daily.slice(-30);
  const series = last30.map(d => _extractDaily(d, cfg.key, cfg.fallback));
  const valid = series.filter(v => v !== null && v !== undefined);
  if (valid.length < 5) {
    sparkWrap.style.display = "none";
    return;
  }

  sparkWrap.style.display = "block";
  document.getElementById("detailSparklineTitle").textContent = cfg.label;
  const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
  const last = valid[valid.length - 1];
  document.getElementById("detailSparklineStats").textContent =
    `moy ${_fmtNum(mean)}${cfg.unit} · dernière ${_fmtNum(last)}${cfg.unit}`;

  _drawSparkline("detailSparklineSvg", series, couleur, cfg.target);
}

function _extractDaily(day, key, fallback) {
  if (!day) return null;
  const parts = key.split(".");
  let v = day;
  for (const p of parts) {
    v = v && v[p] !== undefined ? v[p] : null;
    if (v === null) break;
  }
  if (v === null && fallback) {
    v = day[fallback] !== undefined ? day[fallback] : null;
  }
  return v;
}

function _fmtNum(v) {
  if (v === null || v === undefined) return "—";
  return Math.round(v * 10) / 10;
}

function _drawSparkline(svgId, series, color, target) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  svg.innerHTML = "";

  const W = svg.clientWidth || 600;
  const H = 60;
  const padX = 4, padY = 6;

  const valid = series.filter(v => v !== null && v !== undefined);
  if (valid.length === 0) return;

  const min = Math.min(...valid, target || Infinity);
  const max = Math.max(...valid, target || -Infinity);
  const range = max - min || 1;

  const xStep = (W - padX * 2) / (series.length - 1);
  const yFor = v => padY + (H - padY * 2) * (1 - (v - min) / range);

  // Ligne cible pointillée
  if (target !== undefined && target !== null) {
    const y = yFor(target);
    const line = _svgEl("line", {
      x1: padX, y1: y, x2: W - padX, y2: y,
      stroke: "#555870", "stroke-width": 1, "stroke-dasharray": "3,3",
    });
    svg.appendChild(line);
  }

  // Ligne principale
  const pts = series.map((v, i) => {
    if (v === null || v === undefined) return null;
    return `${padX + i * xStep},${yFor(v)}`;
  });

  // Segments connectés (skip nulls)
  let curSeg = [];
  const segments = [];
  pts.forEach(p => {
    if (p === null) { if (curSeg.length) { segments.push(curSeg); curSeg = []; } }
    else curSeg.push(p);
  });
  if (curSeg.length) segments.push(curSeg);

  segments.forEach(seg => {
    if (seg.length < 2) return;
    const path = _svgEl("polyline", {
      points: seg.join(" "),
      fill: "none", stroke: color, "stroke-width": 2, "stroke-linejoin": "round",
    });
    svg.appendChild(path);
  });

  // Dernier point
  const lastIdx = series.map((v, i) => v !== null ? i : -1).filter(i => i >= 0).pop();
  if (lastIdx !== undefined) {
    const v = series[lastIdx];
    const cx = padX + lastIdx * xStep;
    const cy = yFor(v);
    svg.appendChild(_svgEl("circle", {
      cx, cy, r: 3.5, fill: color, stroke: "#1A1D27", "stroke-width": 1.5,
    }));
  }
}

function _svgEl(tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

function _renderSignalCard(s, couleur) {
  const score = s.score !== null && s.score !== undefined ? s.score : null;
  const bar = score !== null ? `
    <div style="flex:1;height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;">
      <div style="height:100%;width:${Math.max(0, Math.min(100, score))}%;background:${couleur};border-radius:3px;"></div>
    </div>
    <span style="font-size:0.72rem;font-weight:700;color:#D0D0E0;min-width:32px;text-align:right;">${score}</span>
  ` : `<span style="font-size:0.7rem;color:#8B8FA8;">—</span>`;

  // Fraîcheur
  let freshnessLabel = "";
  if (s.timestamp) {
    const days = Math.floor((Date.now() - s.timestamp) / (1000 * 60 * 60 * 24));
    if (days === 0) freshnessLabel = "aujourd'hui";
    else if (days === 1) freshnessLabel = "hier";
    else freshnessLabel = `il y a ${days}j`;
  }

  // Valeur + z-score si baseline
  let valueStr = "";
  if (s.value !== null && s.value !== undefined) {
    valueStr = `${s.value}${s.unit ? " " + s.unit : ""}`;
    if (s.z !== null && s.z !== undefined) {
      const zStr = s.z >= 0 ? `+${s.z}` : `${s.z}`;
      const zColor = Math.abs(s.z) < 0.5 ? "#8B8FA8" : Math.abs(s.z) < 1 ? "#FFD166" : "#FF6B6B";
      valueStr += ` <span style="color:${zColor};font-weight:700;font-size:0.72rem;">(z=${zStr})</span>`;
    }
  }

  return `
    <div style="padding:10px 12px;background:rgba(255,255,255,0.02);border-radius:10px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;flex-wrap:wrap;gap:8px;">
        <div style="font-size:0.85rem;color:#D0D0E0;font-weight:700;">${s.label}</div>
        <div style="font-size:0.78rem;color:#8B8FA8;">${valueStr || "—"}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        ${bar}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:0.68rem;color:#555870;">
        <span>${freshnessLabel}</span>
        <span>contribution couche : ${s.layer_contribution || 0}</span>
      </div>
    </div>
  `;
}

function fermerDetail() {
  document.getElementById("detailCouche").style.display = "none";
  document.querySelectorAll(".couche-card").forEach(c => c.classList.remove("active"));
  couche360Active = null;
}

// ─── HEAT ACCLIMATION CARD ───
function rendreHeatAcclimation360(id) {
  const card = document.getElementById("heatCard");
  if (!card) return;

  if (id !== "benoit" || typeof window.computeHeatAcclimationStats !== "function") {
    card.style.display = "none";
    return;
  }

  const RACE_DATE = new Date("2026-07-05T00:00:00").getTime();
  const now = Date.now();
  const daysToRace = Math.max(0, Math.round((RACE_DATE - now) / 86400000));

  const stats = window.computeHeatAcclimationStats(id, 14);

  // Show if any expo logged OR within 4 weeks of race
  if (stats.count === 0 && daysToRace > 28) {
    card.style.display = "none";
    return;
  }

  card.style.display = "block";

  // KPIs
  document.getElementById("heatCount").textContent = stats.count;
  document.getElementById("heatDaysRace").textContent = `${daysToRace}j`;

  // Progress bar
  const pct = Math.min(100, Math.round((stats.count / 14) * 100));
  document.getElementById("heatCardProgress").style.width = `${pct}%`;

  // Badge
  const badge = document.getElementById("heatBadge");
  const badgeMap = {
    none:        { text: "À démarrer",     cls: "badge badge-surcharge" },
    starting:    { text: "Phase de démarrage", cls: "badge badge-calibration" },
    progressing: { text: "En progression", cls: "badge badge-calibration" },
    ready:       { text: "Prêt",           cls: "badge badge-ok" },
  };
  const lv = badgeMap[stats.level] || badgeMap.none;
  badge.textContent = lv.text;
  badge.className = lv.cls;

  // Timeline SVG : 14 dernières jours, barres par jour avec expo(s)
  const svg = document.getElementById("heatTimeline");
  svg.innerHTML = "";

  const W = svg.parentElement.offsetWidth || 700;
  const H = 80;
  const padL = 20, padR = 20, padT = 10, padB = 20;
  const w = W - padL - padR;

  const DAY_MS = 86400000;
  const days = 14;
  const startTs = now - days * DAY_MS;

  // Group exposures by day
  const byDay = {};
  stats.exposures.forEach(e => {
    const dayIdx = Math.floor((e.timestamp - startTs) / DAY_MS);
    if (dayIdx >= 0 && dayIdx < days) {
      byDay[dayIdx] = (byDay[dayIdx] || 0) + 1;
    }
  });

  const colW = w / days;
  for (let i = 0; i < days; i++) {
    const x = padL + i * colW + colW * 0.15;
    const bw = colW * 0.7;
    const count = byDay[i] || 0;

    // Background cell (empty day)
    svgGut(svg, "rect", {
      x, y: padT, width: bw, height: H - padT - padB,
      fill: "rgba(255,255,255,0.02)", rx: "3", ry: "3",
    });

    if (count > 0) {
      const color = "#FF6B6B";
      const bh = Math.min(count, 3) / 3 * (H - padT - padB);
      svgGut(svg, "rect", {
        x, y: H - padB - bh, width: bw, height: bh,
        fill: color, rx: "3", ry: "3",
      });
      if (count > 1) {
        const txt = svgGut(svg, "text", {
          x: x + bw / 2, y: H - padB - bh - 4,
          "text-anchor": "middle",
          "font-size": "10", fill: "#F0F0F5", "font-weight": "700",
          "font-family": "Inter,sans-serif",
        });
        txt.textContent = `×${count}`;
      }
    }
  }

  // Labels J-14 / aujourd'hui
  const l1 = svgGut(svg, "text", {
    x: padL, y: H - 4, "text-anchor": "start",
    "font-size": "9", fill: "#555870", "font-family": "Inter,sans-serif",
  });
  l1.textContent = "J-14";
  const l2 = svgGut(svg, "text", {
    x: W - padR, y: H - 4, "text-anchor": "end",
    "font-size": "9", fill: "#6C63FF", "font-weight": "600", "font-family": "Inter,sans-serif",
  });
  l2.textContent = "aujourd'hui";

  // Summary
  const summary = document.getElementById("heatSummary");
  const remaining = Math.max(0, 10 - stats.count);
  if (stats.level === "ready") {
    summary.textContent = `Acclimatation solide — ${stats.count} expos sur 14j. Maintiens 2-3 expos par semaine jusqu'à la course.`;
  } else if (stats.level === "progressing") {
    summary.textContent = `${stats.count} expos logged — il t'en reste ${remaining} pour atteindre la cible (10). Continue à 2-3 par semaine.`;
  } else if (stats.level === "starting") {
    summary.textContent = `Phase de démarrage (${stats.count} expos). À ${daysToRace} jours de Thun — enchaîne 2-3 expos par semaine pour tenir la trajectoire.`;
  } else {
    summary.textContent = `Aucune expo loggée sur 14 jours. À ${daysToRace} jours de Thun, c'est le moment idéal pour lancer le protocole Périard (sortie chaleur, sauna ou bain chaud).`;
  }
}

// ─── GUT TRAINING CHART ───
function rendreGutTraining(id) {
  const card = document.getElementById("gutCard");
  const empty = document.getElementById("gutEmpty");
  if (!card || !empty) return;

  if (id !== "benoit" || typeof window.computeGutTrainingStats !== "function") {
    card.style.display = "none";
    empty.style.display = "none";
    return;
  }

  const stats = window.computeGutTrainingStats(id, 70);

  if (!stats || stats.n === 0) {
    card.style.display = "none";
    empty.style.display = "block";
    return;
  }

  card.style.display = "block";
  empty.style.display = "none";

  // KPIs
  document.getElementById("gutLatest").textContent = `${stats.latest} g/h`;
  document.getElementById("gutMean").textContent = `${stats.mean} g/h`;

  const badge = document.getElementById("gutBadge");
  const badgeMap = {
    beginner:    { text: "Démarrage",   cls: "badge badge-calibration" },
    progressing: { text: "En progression", cls: "badge badge-calibration" },
    target:      { text: "Zone cible",  cls: "badge badge-ok" },
    elite:       { text: "Au-dessus",   cls: "badge badge-ok" },
  };
  const lv = badgeMap[stats.level] || badgeMap.beginner;
  badge.textContent = lv.text;
  badge.className = lv.cls;

  // SVG chart
  const svg = document.getElementById("gutChart");
  const labelsEl = document.getElementById("gutLabels");
  svg.innerHTML = "";

  const W = svg.parentElement.offsetWidth || 700;
  const H = 200;
  const padL = 40, padR = 20, padT = 15, padB = 20;
  const w = W - padL - padR;
  const h = H - padT - padB;

  // Timeline : today → race (Ironman Switzerland Thun)
  const RACE_DATE = new Date("2026-07-05T00:00:00").getTime();
  const CURVE_START = RACE_DATE - 70 * 86400 * 1000; // 10 weeks before
  const firstSession = stats.sessions[0].timestamp;
  const xMin = Math.min(firstSession, CURVE_START);
  const xMax = RACE_DATE;
  const yMin = 0, yMax = 100;

  const xPos = t => padL + ((t - xMin) / (xMax - xMin)) * w;
  const yPos = v => padT + (1 - (v - yMin) / (yMax - yMin)) * h;

  // Grille horizontale + labels Y
  [20, 40, 60, 80].forEach(val => {
    const y = yPos(val);
    svgGut(svg, "line", { x1: padL, y1: y, x2: W - padR, y2: y, stroke: "#2A2D3E", "stroke-width": "1" });
    const t = svgGut(svg, "text", {
      x: padL - 5, y: y + 4, "text-anchor": "end",
      "font-size": "9", fill: "#555870", "font-family": "Inter,sans-serif",
    });
    t.textContent = `${val}`;
  });

  // Target zone (70-90 g/h) — bande verte
  const zoneY1 = yPos(90);
  const zoneY2 = yPos(70);
  svgGut(svg, "rect", {
    x: padL, y: zoneY1, width: w, height: zoneY2 - zoneY1,
    fill: "rgba(0,212,170,0.07)", stroke: "none",
  });

  // Target curve : 40 g/h (CURVE_START) → 80 g/h (RACE_DATE)
  const curvePts = [
    `${xPos(xMin)},${yPos(Math.max(40, 40 + 40 * (xMin - CURVE_START) / (RACE_DATE - CURVE_START)))}`,
    `${xPos(CURVE_START)},${yPos(40)}`,
    `${xPos(RACE_DATE)},${yPos(80)}`,
  ];
  svgGut(svg, "polyline", {
    points: curvePts.join(" "),
    fill: "none", stroke: "rgba(0,212,170,0.6)", "stroke-width": "2",
    "stroke-dasharray": "5,4", "stroke-linecap": "round",
  });

  // Label "Cible 80 g/h" à droite
  const tgtLabel = svgGut(svg, "text", {
    x: xPos(RACE_DATE) - 4, y: yPos(80) - 6,
    "text-anchor": "end", "font-size": "10",
    fill: "#00D4AA", "font-weight": "600", "font-family": "Inter,sans-serif",
  });
  tgtLabel.textContent = "Cible 80 g/h";

  // Ligne verticale "aujourd'hui"
  const now = Date.now();
  if (now >= xMin && now <= xMax) {
    const xNow = xPos(now);
    svgGut(svg, "line", {
      x1: xNow, y1: padT, x2: xNow, y2: H - padB,
      stroke: "rgba(108,99,255,0.5)", "stroke-width": "1", "stroke-dasharray": "3,3",
    });
    const nowLabel = svgGut(svg, "text", {
      x: xNow, y: padT - 4, "text-anchor": "middle",
      "font-size": "9", fill: "#6C63FF", "font-family": "Inter,sans-serif",
    });
    nowLabel.textContent = "aujourd'hui";
  }

  // Points (sessions)
  stats.sessions.forEach(s => {
    const cx = xPos(s.timestamp);
    const cy = yPos(s.value);
    const color = s.value < 40 ? "#FF6B6B" : s.value < 70 ? "#FFD166" : "#00D4AA";
    svgGut(svg, "circle", {
      cx, cy, r: "5", fill: color, stroke: "#1A1D27", "stroke-width": "2",
    });
  });

  // Labels X : début curve + today + race
  const fmtDate = ts => {
    const d = new Date(ts);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };
  labelsEl.innerHTML = `
    <span style="font-size:0.72rem;color:#555870;">${fmtDate(xMin)}</span>
    <span style="font-size:0.72rem;color:#6C63FF;font-weight:600;">aujourd'hui</span>
    <span style="font-size:0.72rem;color:#00D4AA;font-weight:600;">Thun ${fmtDate(RACE_DATE)}</span>
  `;

  // Summary
  const weeksToRace = Math.max(0, Math.round((RACE_DATE - now) / (7 * 86400 * 1000)));
  const summary = document.getElementById("gutSummary");
  const gap = 80 - stats.latest;
  if (stats.level === "target" || stats.level === "elite") {
    summary.textContent = `Tu es dans la zone cible Ironman à ${weeksToRace} semaines de Thun. Maintiens ce niveau sur tes prochaines sorties longues.`;
  } else if (stats.level === "progressing") {
    summary.textContent = `À ${weeksToRace} semaines de Thun — reste ${gap} g/h à gagner. Monte de 5-10 g/h toutes les 2-3 sorties longues pour tenir la trajectoire.`;
  } else {
    summary.textContent = `À ${weeksToRace} semaines de Thun — progression à lancer. Cible ta prochaine sortie longue à 50 g/h, puis augmente progressivement.`;
  }
}

function svgGut(parent, tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "style") el.style.cssText = v;
    else el.setAttribute(k, v);
  });
  parent.appendChild(el);
  return el;
}

// ─── LOT 32 : CALENDRIER MENSUEL SOMMEIL ─────────────────────────────────
function rendreSleepCalendar(id) {
  const card = document.getElementById("sleepCalendarCard");
  if (!card) return;
  if (id !== "benoit" || !window.HISTORY || !Array.isArray(window.HISTORY.daily)) {
    card.style.display = "none"; return;
  }
  card.style.display = "block";

  const last30 = window.HISTORY.daily.slice(-30);
  const grid = document.getElementById("sleepCalGrid");
  grid.innerHTML = "";

  const vals = [];
  let goodNights = 0, debt = 0;

  last30.forEach(d => {
    const h = d.sleep && d.sleep.hours !== null && d.sleep.hours !== undefined ? d.sleep.hours : null;
    if (h !== null) {
      vals.push(h);
      if (h >= 7) goodNights++;
      debt += Math.max(0, 7.5 - h);
    }
    const color = _sleepColor(h);
    const dateStr = d.date ? d.date.slice(5) : "—";
    const label = h !== null ? `${Math.round(h * 10) / 10}h` : "—";
    const cell = document.createElement("div");
    cell.style.cssText = `aspect-ratio:1;background:${color};border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px;cursor:default;transition:transform 0.15s;`;
    cell.title = `${d.date} : ${label}`;
    cell.innerHTML = `
      <div style="font-size:0.6rem;color:${h !== null ? "rgba(15,17,23,0.6)" : "#555870"};font-weight:700;">${dateStr}</div>
      <div style="font-size:0.78rem;color:${h !== null ? "#0F1117" : "#555870"};font-weight:800;margin-top:2px;">${label}</div>
    `;
    cell.addEventListener("mouseenter", () => cell.style.transform = "scale(1.05)");
    cell.addEventListener("mouseleave", () => cell.style.transform = "scale(1)");
    grid.appendChild(cell);
  });

  const avgH = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  document.getElementById("sleepCalAvg").textContent = avgH !== null ? `${Math.round(avgH * 10) / 10}h` : "—";
  document.getElementById("sleepCalDebt").textContent = vals.length ? `-${Math.round(debt)}h` : "—";
  document.getElementById("sleepCalGood").textContent = vals.length ? `${goodNights}/${vals.length}` : "—";
  document.getElementById("sleepCalSub").textContent = `${vals.length} nuits enregistrées sur 30 jours`;

  // Badge
  const badge = document.getElementById("sleepCalBadge");
  if (avgH === null) { badge.textContent = "sans data"; badge.style.color = "#8B8FA8"; badge.style.background = "rgba(139,143,168,0.15)"; }
  else if (avgH >= 7.5) { badge.textContent = "✓ régulier"; badge.style.color = "#00D4AA"; badge.style.background = "rgba(0,212,170,0.15)"; }
  else if (avgH >= 6.8) { badge.textContent = "à surveiller"; badge.style.color = "#FFD166"; badge.style.background = "rgba(255,209,102,0.15)"; }
  else { badge.textContent = "dette élevée"; badge.style.color = "#FF6B6B"; badge.style.background = "rgba(255,107,107,0.15)"; }

  // Narrative
  const nar = document.getElementById("sleepCalNarrative");
  if (avgH === null) {
    nar.textContent = "Pas encore de données de sommeil sur les 30 derniers jours. Sync Whoop ou saisis via ton journal quotidien.";
  } else if (avgH >= 7.5 && goodNights >= 24) {
    nar.textContent = `Moyenne ${Math.round(avgH*10)/10}h avec ${goodNights}/${vals.length} nuits à 7h+ — profil régulier. C'est ta base de récupération, protège-la.`;
  } else if (avgH < 6.8) {
    nar.textContent = `Moyenne ${Math.round(avgH*10)/10}h sur 30 jours — tu accumules une dette de ~${Math.round(debt)}h. Priorité absolue à 90 min avant Thun : coucher plus tôt, pas de screens après 21h.`;
  } else {
    nar.textContent = `Moyenne ${Math.round(avgH*10)/10}h, ${goodNights}/${vals.length} nuits à 7h+. Tu es dans la zone "correcte" — pousser à 7h30-8h régulier améliorerait nettement ton HRV.`;
  }
}

function _sleepColor(h) {
  if (h === null || h === undefined) return "rgba(255,255,255,0.03)";
  if (h < 6) return "#FF6B6B";
  if (h < 7) return "#FFD166";
  if (h < 7.5) return "#A9A3FF";
  if (h < 8.5) return "#6C63FF";
  return "#00D4AA";
}

// ─── LOT 37 : TRACKING MALADIE DÉDIÉ ─────────────────────────
function rendreImmunite(id) {
  const card = document.getElementById("immunityCard");
  if (!card) return;
  if (id !== "benoit" || !window.HISTORY?.daily?.length) { card.style.display = "none"; return; }
  card.style.display = "block";

  const daily = window.HISTORY.daily;
  const DAY_MS = 86400000;
  const now = Date.now();

  // Détection d'épisodes (≥2 jours consécutifs avec journal.illness)
  const episodes = [];
  let run = null;
  for (const d of daily) {
    if (d.journal?.illness) {
      if (!run) run = { start: d.date, end: d.date, days: 1, startTs: d.timestamp, endTs: d.timestamp };
      else { run.end = d.date; run.endTs = d.timestamp; run.days++; }
    } else if (run) {
      if (run.days >= 2) episodes.push(run);
      run = null;
    }
  }
  if (run && run.days >= 2) episodes.push(run);

  const last = episodes[episodes.length - 1] || null;
  const daysSince = last ? Math.floor((now - last.endTs) / DAY_MS) : null;
  const avgDur = episodes.length
    ? (episodes.reduce((s, e) => s + e.days, 0) / episodes.length).toFixed(1)
    : "—";

  // Vulnérabilité : HRV récente vs baseline + sommeil 7j + volume
  const last7 = daily.slice(-7);
  const hrvs7 = last7.map(d => d.hrv).filter(v => typeof v === "number");
  const hrv7 = hrvs7.length ? hrvs7.reduce((a, b) => a + b, 0) / hrvs7.length : null;
  const sleeps7 = last7.map(d => d.sleep?.hours).filter(v => typeof v === "number");
  const sleep7 = sleeps7.length ? sleeps7.reduce((a, b) => a + b, 0) / sleeps7.length : null;
  const lastDay = daily[daily.length - 1];
  const baseline28 = lastDay?.baselines?.hrv?.median || null;
  const hrvDropPct = (hrv7 && baseline28) ? ((hrv7 - baseline28) / baseline28) * 100 : null;

  // Signaux faibles
  const signals = [];
  if (hrvDropPct !== null && hrvDropPct < -5) {
    signals.push(`HRV 7j à ${hrv7.toFixed(0)}ms (baseline ${baseline28.toFixed(0)}ms, ${hrvDropPct.toFixed(0)}%)`);
  }
  if (sleep7 !== null && sleep7 < 7) {
    signals.push(`Sommeil moyen 7j à ${sleep7.toFixed(1)}h — sous le seuil immunitaire (7h)`);
  }
  const recentStrain = last7.reduce((s, d) => s + (d.strain_strava || 0), 0);
  if (recentStrain > 1400 && (hrvDropPct || 0) < -3) {
    signals.push(`Charge récente élevée (${recentStrain}) combinée à HRV en retrait — fenêtre typique de baisse immunitaire`);
  }

  // Score de vulnérabilité (0-100, plus c'est haut plus c'est risqué)
  let vuln = 0;
  if (hrvDropPct !== null && hrvDropPct < 0) vuln += Math.min(40, Math.abs(hrvDropPct) * 2);
  if (sleep7 !== null && sleep7 < 7.5) vuln += (7.5 - sleep7) * 15;
  if (daysSince !== null && daysSince < 10) vuln += (10 - daysSince) * 3;
  vuln = Math.min(100, Math.round(vuln));

  const vulnLabel = vuln >= 60 ? "Élevée" : vuln >= 35 ? "Modérée" : "Faible";
  const vulnColor = vuln >= 60 ? "#FF6B6B" : vuln >= 35 ? "#FFD166" : "#00D4AA";

  document.getElementById("immunityDaysSince").textContent = daysSince !== null ? daysSince : "—";
  document.getElementById("immunityDaysSinceSub").textContent = last ? `depuis ${last.end}` : "Aucun épisode";
  document.getElementById("immunityEpisodes").textContent = episodes.length;
  document.getElementById("immunityEpisodesSub").textContent = episodes.length ? "sur 12 mois" : "12 mois clean";
  document.getElementById("immunityAvgDur").textContent = avgDur;
  const vulnEl = document.getElementById("immunityVuln");
  vulnEl.textContent = vulnLabel;
  vulnEl.style.color = vulnColor;
  document.getElementById("immunityVulnSub").textContent = `${vuln}/100`;

  const badge = document.getElementById("immunityBadge");
  if (daysSince !== null && daysSince <= 14) {
    badge.textContent = `Reprise J+${daysSince}`;
    badge.className = "badge badge-coral";
  } else if (vuln >= 60) {
    badge.textContent = "Vigilance";
    badge.className = "badge badge-coral";
  } else if (vuln >= 35) {
    badge.textContent = "À surveiller";
    badge.className = "badge badge-violet";
  } else {
    badge.textContent = "Système OK";
    badge.className = "badge badge-teal";
  }

  // Liste des 3 derniers épisodes
  const listEl = document.getElementById("immunityEpisodesList");
  const top3 = episodes.slice(-3).reverse();
  if (!top3.length) {
    listEl.innerHTML = `<div style="padding:12px;text-align:center;color:#00D4AA;font-size:0.82rem;">✓ Aucun épisode immunitaire enregistré</div>`;
  } else {
    listEl.innerHTML = top3.map(e => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:rgba(255,107,107,0.06);border-left:3px solid #FF6B6B;border-radius:8px;">
        <div>
          <div style="font-size:0.82rem;color:#F0F0F5;font-weight:600;">🤒 ${e.start} → ${e.end}</div>
          <div style="font-size:0.7rem;color:#8B8FA8;margin-top:2px;">${e.days} jour${e.days > 1 ? "s" : ""} déclarés</div>
        </div>
        <div style="font-size:0.72rem;color:#8B8FA8;">
          ${Math.floor((now - new Date(e.end).getTime()) / DAY_MS)}j
        </div>
      </div>
    `).join("");
  }

  // Signaux faibles
  const sigCard = document.getElementById("immunitySignals");
  const sigList = document.getElementById("immunitySignalsList");
  if (signals.length) {
    sigCard.style.display = "block";
    sigList.innerHTML = signals.map(s => `<li>${s}</li>`).join("");
  } else {
    sigCard.style.display = "none";
  }

  // Narrative
  let narrative;
  if (daysSince !== null && daysSince < 10) {
    narrative = `Sortie d'épisode il y a ${daysSince} jour${daysSince > 1 ? "s" : ""}. Les 10-14 premiers jours post-maladie sont une fenêtre où l'organisme reste fragile — charge légère, sommeil prioritaire, pas de séance brique.`;
  } else if (vuln >= 60) {
    narrative = `Vulnérabilité élevée (${vuln}/100) : signaux combinés suggèrent une baisse immunitaire. C'est le moment de prioriser le sommeil et d'éviter les foules, pas un signal d'arrêter — un signal de réguler.`;
  } else if (episodes.length >= 3) {
    narrative = `${episodes.length} épisodes en 12 mois : au-dessus de la moyenne attendue chez un athlète d'endurance. Piste à creuser — sommeil chronique, charges enchaînées, micronutriments.`;
  } else if (daysSince === null) {
    narrative = `Aucun épisode enregistré sur la période observée. Les signaux faibles (HRV, sommeil) restent les meilleurs prédicteurs d'une baisse à venir.`;
  } else {
    narrative = `${daysSince} jours sans épisode — bonne résilience immunitaire. Pic de vulnérabilité typique : 72h après les séances très longues ou en période de déficit de sommeil.`;
  }
  document.getElementById("immunityNarrative").textContent = narrative;
}

// ─── LOT 38 : ZONES FC ─────────────────────────
function rendreHrZones(id) {
  const card = document.getElementById("hrZonesCard");
  if (!card) return;
  if (id !== "benoit" || !window.HISTORY?.daily?.length) { card.style.display = "none"; return; }
  card.style.display = "block";

  // Profil athlète (âge 42 → HRmax ~178, FC repos typique ~52)
  const hrMax = 178;
  const hrRest = 52;
  const hrReserve = hrMax - hrRest;

  // Zones Karvonen (en % de HRR)
  const zones = [
    { id: "Z1", label: "Récup / aérobie léger", low: 0.50, high: 0.60, color: "#A9A3FF" },
    { id: "Z2", label: "Endurance fondamentale", low: 0.60, high: 0.70, color: "#6C63FF" },
    { id: "Z3", label: "Tempo / seuil bas",     low: 0.70, high: 0.80, color: "#00D4AA" },
    { id: "Z4", label: "Seuil / VMA",           low: 0.80, high: 0.90, color: "#FFD166" },
    { id: "Z5", label: "VO₂max / anaérobie",    low: 0.90, high: 1.00, color: "#FF6B6B" },
  ];
  zones.forEach(z => {
    z.bpmLow = Math.round(hrRest + hrReserve * z.low);
    z.bpmHigh = Math.round(hrRest + hrReserve * z.high);
    z.minutes = 0;
  });

  // Distribution temps par zone sur 30 derniers jours
  const daily = window.HISTORY.daily.slice(-30);
  let totalMin = 0;
  let hasHrData = false;
  daily.forEach(d => {
    (d.activities || []).forEach(a => {
      if (!a.duration_min) return;
      totalMin += a.duration_min;
      if (typeof a.avg_hr === "number") {
        hasHrData = true;
        const z = zones.find(z => a.avg_hr >= z.bpmLow && a.avg_hr < z.bpmHigh)
              || (a.avg_hr >= zones[4].bpmLow ? zones[4] : zones[0]);
        z.minutes += a.duration_min;
      }
    });
  });

  // Si pas de données HR réelles → distribution polarisée typique athlète endurance (80/10/10)
  if (!hasHrData && totalMin > 0) {
    zones[0].minutes = Math.round(totalMin * 0.15);
    zones[1].minutes = Math.round(totalMin * 0.65);
    zones[2].minutes = Math.round(totalMin * 0.10);
    zones[3].minutes = Math.round(totalMin * 0.08);
    zones[4].minutes = Math.round(totalMin * 0.02);
  }

  const fmtH = m => m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;

  document.getElementById("hrMax").textContent = hrMax + " bpm";
  document.getElementById("hrRest").textContent = hrRest + " bpm";
  document.getElementById("hrTotalTime").textContent = fmtH(totalMin);

  const listEl = document.getElementById("hrZonesList");
  listEl.innerHTML = zones.map(z => {
    const pct = totalMin > 0 ? Math.round((z.minutes / totalMin) * 100) : 0;
    return `
      <div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px;">
          <div style="font-size:0.8rem;color:#F0F0F5;">
            <span style="color:${z.color};font-weight:700;">${z.id}</span>
            <span style="color:#8B8FA8;margin-left:6px;">${z.label}</span>
            <span style="color:#555870;margin-left:6px;font-size:0.72rem;">${z.bpmLow}-${z.bpmHigh} bpm</span>
          </div>
          <div style="font-size:0.78rem;color:#F0F0F5;font-weight:600;">
            ${fmtH(z.minutes)} <span style="color:#8B8FA8;font-weight:400;">(${pct}%)</span>
          </div>
        </div>
        <div class="progress-bar" style="height:6px;border-radius:3px;">
          <div class="progress-fill" style="width:${pct}%;background:${z.color};border-radius:3px;transition:width 0.6s;"></div>
        </div>
      </div>
    `;
  }).join("");

  // Ratio polarisé : Z1+Z2 vs Z4+Z5
  const lowMin = zones[0].minutes + zones[1].minutes;
  const highMin = zones[3].minutes + zones[4].minutes;
  const lowPct = totalMin > 0 ? Math.round((lowMin / totalMin) * 100) : 0;
  const highPct = totalMin > 0 ? Math.round((highMin / totalMin) * 100) : 0;

  const badge = document.getElementById("hrZonesBadge");
  let narrative;
  if (lowPct >= 75 && highPct >= 5 && highPct <= 20) {
    badge.textContent = "Polarisé";
    badge.className = "badge badge-teal";
    narrative = `Distribution polarisée équilibrée (${lowPct}% en bas, ${highPct}% en haut). Profil typique athlète d'endurance — la majorité du volume en aérobie, des piqûres d'intensité ciblées.`;
  } else if (lowPct < 65) {
    badge.textContent = "Trop intense";
    badge.className = "badge badge-coral";
    narrative = `Seulement ${lowPct}% du volume en Z1-Z2. Le seuil immunitaire et la progression long-terme se construisent dans le facile — recalibrer vers 75-80% en bas de zone.`;
  } else if (highPct < 3 && totalMin > 300) {
    badge.textContent = "Manque d'intensité";
    badge.className = "badge badge-violet";
    narrative = `Volume dominé par Z1-Z2 (${lowPct}%) mais seulement ${highPct}% au-dessus du seuil. Pour développer la puissance aérobie, ajouter 1 séance Z4 par semaine.`;
  } else {
    badge.textContent = hasHrData ? "Normal" : "Estimé";
    badge.className = "badge";
    narrative = hasHrData
      ? `${lowPct}% en endurance fondamentale, ${highPct}% en intensité. Distribution à surveiller à l'approche de la phase peak.`
      : `Pas de données FC réelles sur la période — distribution estimée à partir d'un profil polarisé typique. Synchroniser Whoop/Strava pour une lecture précise.`;
  }
  document.getElementById("hrZonesNarrative").textContent = narrative;
}

// ─── SÉLECTEUR ATHLÈTE ───
function bindSélecteur() {
  document.querySelectorAll(".athlete-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".athlete-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      athleteActif360 = btn.dataset.athlete;
      rendrePage(athleteActif360);
    });
  });
}
