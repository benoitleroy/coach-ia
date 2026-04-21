// RAPPORT.JS — export hebdomadaire imprimable (Lot 22)
// Partage-friendly : print → PDF → envoi coach externe.

document.addEventListener("DOMContentLoaded", () => {
  if (!window.HISTORY || !window.HISTORY.weeks || !window.HISTORY.weeks.length) {
    document.getElementById("reportTitle").textContent = "Historique indisponible";
    document.getElementById("reportPeriod").textContent = "Aucune donnée à synthétiser.";
    return;
  }

  const H = window.HISTORY;
  const now = new Date();

  // Par défaut : semaine la plus récente close (ou en cours si > 2j entamée)
  const params = new URLSearchParams(location.search);
  const wid = params.get("w"); // ex: ?w=2026-W15
  let week = wid ? H.weeks.find(w => w.id === wid) : H.weeks[H.weeks.length - 1];
  if (!week) week = H.weeks[H.weeks.length - 1];

  // Jours inclus dans cette semaine
  const weekStart = new Date(week.start_date).getTime();
  const weekEnd = new Date(week.end_date).getTime() + 86400000; // inclusif
  const days = H.daily.filter(d => {
    const t = new Date(d.date).getTime();
    return t >= weekStart && t < weekEnd;
  });

  // Previous week pour compare
  const weekPrev = H.weeks[H.weeks.indexOf(week) - 1];

  renderHeader(week);
  renderScore(days);
  renderStats(week, weekPrev);
  renderDays(days);
  renderEvents(week);
  renderCoachNote(week, weekPrev);
  document.getElementById("reportDate").textContent = now.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
});

function renderHeader(week) {
  const athlete = (window.ATHLETE_PROFILE && window.ATHLETE_PROFILE.nom) || "Benoît L.";
  document.getElementById("reportTitle").textContent = `Semaine ${week.id}`;
  const d1 = new Date(week.start_date), d2 = new Date(week.end_date);
  const fmt = (d) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  document.getElementById("reportPeriod").textContent = `${athlete} · ${fmt(d1)} → ${fmt(d2)}`;

  // Signature
  const SIG_COLORS = {
    "Rythme de croisière":"#00D4AA","Build Z2":"#6C63FF","Charge brute":"#FF6B6B",
    "Overreach confirmé":"#FF4A4A","Décharge planifiée":"#A9A3FF","Décharge subie":"#FFD166",
    "Polarisée":"#4A9CFF","Séance seuil dominant":"#FFA07A","Rebond":"#2EE59D",
    "Choc immunitaire":"#FF8FA3","Compétition":"#FFD700","Calibration":"#888EA8",
  };
  const c = SIG_COLORS[week.signature] || "#8B8FA8";
  document.getElementById("reportSignature").innerHTML = `
    <span style="display:inline-block;padding:6px 14px;border-radius:20px;background:${c}22;color:${c};border:1px solid ${c}55;font-size:0.82rem;font-weight:600;">
      ● ${week.signature}
    </span>
  `;
}

function renderScore(days) {
  // Utilise recovery comme proxy de score de forme (approx)
  const recs = days.map(d => d.recovery).filter(v => Number.isFinite(v));
  if (!recs.length) {
    document.getElementById("reportScoreCircle").textContent = "—";
    document.getElementById("reportScoreLabel").textContent = "Données insuffisantes";
    document.getElementById("reportScoreNarr").textContent = "Pas de données recovery Whoop sur cette semaine.";
    return;
  }
  const avg = Math.round(recs.reduce((a, b) => a + b, 0) / recs.length);
  const circle = document.getElementById("reportScoreCircle");
  circle.textContent = avg;
  let col, label, narr;
  if (avg >= 70) { col = "#00D4AA"; label = "Zone verte — corps disponible"; narr = "Récupération régulière, forme soutenue — tu pouvais pousser sans casser."; }
  else if (avg >= 50) { col = "#6C63FF"; label = "Zone jaune — équilibre fragile"; narr = "Charge correctement absorbée mais marge limitée — vigilance sur la qualité du sommeil."; }
  else if (avg >= 30) { col = "#FFD166"; label = "Zone orange — dette accumulée"; narr = "Le corps demande plus de récupération que tu n'en donnes. Une semaine d'allègement ferait du bien."; }
  else { col = "#FF6B6B"; label = "Zone rouge — surmenage"; narr = "Signaux de surcharge très marqués. Stop, récupère, repars sur base saine."; }
  circle.style.background = col;
  document.getElementById("reportScoreLabel").textContent = label;
  document.getElementById("reportScoreNarr").textContent = narr;
}

function renderStats(week, prev) {
  const m = week.metrics;
  const mP = prev ? prev.metrics : {};
  const fmtDelta = (c, p, unit = "", betterUp = true) => {
    if (c == null || p == null) return "";
    const d = c - p;
    if (Math.abs(d) < 0.01) return `<span style="color:#8B8FA8;">= stable</span>`;
    const col = (betterUp ? d > 0 : d < 0) ? "#00D4AA" : "#FF6B6B";
    return `<span style="color:${col};">${d > 0 ? "↑" : "↓"}${Math.abs(Number.isInteger(d) ? d : Math.round(d*10)/10)}${unit} vs S-1</span>`;
  };
  const cards = [
    { lab: "Recovery", val: m.recovery_avg ? `${m.recovery_avg}%` : "—", sub: fmtDelta(m.recovery_avg, mP.recovery_avg, "%", true) },
    { lab: "HRV moy", val: m.hrv_avg ? `${m.hrv_avg}ms` : "—", sub: fmtDelta(m.hrv_avg, mP.hrv_avg, "ms", true) },
    { lab: "Volume", val: m.volume_min ? `${Math.round(m.volume_min/60*10)/10}h` : "—", sub: fmtDelta(Math.round(m.volume_min/60*10)/10, Math.round((mP.volume_min||0)/60*10)/10, "h", true) },
    { lab: "Séances", val: m.session_count || 0, sub: fmtDelta(m.session_count, mP.session_count, "", true) },
    { lab: "ACWR", val: m.acwr || "—", sub: fmtDelta(m.acwr, mP.acwr, "", false) },
    { lab: "Charge totale", val: m.strain_total_strava ? Math.round(m.strain_total_strava) : "—", sub: "strain" },
    { lab: "Sommeil moy", val: m.sleep_hours_avg ? `${m.sleep_hours_avg}h` : "—", sub: fmtDelta(m.sleep_hours_avg, mP.sleep_hours_avg, "h", true) },
    { lab: "Jours actifs", val: `${m.active_days || 0}/7`, sub: "" },
  ];
  document.getElementById("reportStats").innerHTML = cards.map(c => `
    <div class="stat">
      <div class="stat-label">${c.lab}</div>
      <div class="stat-val" style="margin-top:4px;">${c.val}</div>
      <div class="stat-sub">${c.sub}</div>
    </div>
  `).join("");
}

function renderDays(days) {
  const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const html = days.map(d => {
    const dt = new Date(d.date);
    const strain = Number.isFinite(d.strain_strava) ? Math.round(d.strain_strava) : 0;
    const rec = Number.isFinite(d.recovery) ? d.recovery : null;
    const hrv = Number.isFinite(d.hrv) ? Math.round(d.hrv) : null;
    const sess = d.activities && d.activities.length > 0;
    const actLabel = sess
      ? d.activities.map(a => `${a.icone || "·"} ${a.label || a.type} (${a.duration_min || 0}min)`).join(" · ")
      : "Repos";
    let dotBg = "#2A2D3E";
    if (strain > 150) dotBg = "#FF6B6B";
    else if (strain > 60) dotBg = "#FFD166";
    else if (strain > 0) dotBg = "#00D4AA";

    return `
      <div class="day-row">
        <div class="dot-day" style="background:${dotBg};">${dayNames[dt.getDay()]}</div>
        <div style="flex:0 0 60px;font-size:0.8rem;color:#8B8FA8;">${dt.getDate()}/${dt.getMonth()+1}</div>
        <div style="flex:1;font-size:0.85rem;color:#F0F0F5;">${actLabel}</div>
        <div style="font-size:0.75rem;color:#8B8FA8;text-align:right;flex:0 0 160px;">
          ${rec != null ? `Rec ${rec}%` : "—"}
          ${hrv != null ? ` · HRV ${hrv}ms` : ""}
          ${strain > 0 ? ` · ${strain}s` : ""}
        </div>
      </div>
    `;
  }).join("");
  document.getElementById("reportDays").innerHTML = html || `<div style="padding:12px;color:#8B8FA8;">Pas de jours dans cette semaine.</div>`;
}

function renderEvents(week) {
  const card = document.getElementById("reportEventsCard");
  const events = week.events || [];
  if (!events.length) { card.style.display = "none"; return; }
  card.style.display = "block";
  const SEV = { alert:"#FF6B6B", warn:"#FFD166", info:"#A9A3FF", win:"#00D4AA" };
  document.getElementById("reportEvents").innerHTML = events.map(e => `
    <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
      <div style="width:6px;background:${SEV[e.severity] || "#8B8FA8"};border-radius:3px;flex-shrink:0;"></div>
      <div style="color:${SEV[e.severity] || "#D0D0E0"};font-weight:600;flex-shrink:0;width:110px;">${e.type || "—"}</div>
      <div style="flex:1;color:#D0D0E0;">${e.label || ""}</div>
    </div>
  `).join("");
}

function renderCoachNote(week, prev) {
  // Synthèse générée à partir de la signature + delta
  const sig = week.signature;
  const m = week.metrics;
  const mP = prev ? prev.metrics : {};
  let note = "";

  if (sig === "Choc immunitaire") {
    note = `Semaine marquée par un épisode immunitaire. Le corps a priorisé la défense plutôt que l'entraînement — c'est une décision physiologique, pas un échec. La reprise se fait en douceur, sans rattrapage.`;
  } else if (sig === "Build Z2") {
    note = `Semaine de construction aérobie propre. Tu accumules du volume en zone 2, c'est exactement la base qui paiera dans 8-12 semaines. Reste régulier, c'est la répétition qui fait la différence.`;
  } else if (sig === "Overreach confirmé") {
    note = `Cette semaine a poussé fort — peut-être trop. Les signaux de surcharge sont là, et le prochain cycle doit comporter une décharge active (−30% volume) pour absorber la charge.`;
  } else if (sig === "Décharge planifiée") {
    note = `Décharge assumée : volume réduit pour consolider les acquis précédents. C'est là que l'adaptation se fait — ne bouscule pas le cycle.`;
  } else if (sig === "Décharge subie") {
    note = `La charge a baissé sans plan — imprévu de la vie, fatigue, ou météo. Pas grave, mais à capitaliser : la semaine suivante doit reprendre doucement, pas compenser.`;
  } else if (sig === "Rythme de croisière") {
    note = `Semaine de croisière — charge alignée avec la chronique, corps absorbe bien. C'est la zone idéale pour progresser sur la durée.`;
  } else if (sig === "Rebond") {
    note = `Rebond après une période plus calme — énergie revenue, signaux verts. Profite-en pour caler une séance qualité sans pour autant surcharger.`;
  } else if (sig === "Polarisée") {
    note = `Distribution polarisée réussie : beaucoup de Z2 + poches d'intensité, peu de Z3. Modèle optimal pour progresser en aérobie sans s'épuiser.`;
  } else if (sig === "Séance seuil dominant") {
    note = `Plusieurs séances seuil cette semaine — bénéfique sur 1-2 semaines max. Surveille la fatigue accumulée, et alterne avec du volume pur.`;
  } else if (sig === "Charge brute") {
    note = `Charge élevée sans pause — tu as poussé fort. Vérifie que le corps suit : sommeil, HRV, énergie. Une semaine comme ça, ok ; deux de suite, danger.`;
  } else if (sig === "Compétition") {
    note = `Semaine de course/objectif. Bravo pour l'engagement — maintenant la priorité est la récupération complète, puis reprise progressive.`;
  } else {
    note = `Semaine à signature neutre — pas de pattern dominant. Continue à observer, la tendance se révèle sur 3-4 semaines.`;
  }

  // Ajout d'une couche sur l'évolution HRV / recovery
  if (Number.isFinite(m.hrv_avg) && Number.isFinite(mP.hrv_avg)) {
    const dhrv = m.hrv_avg - mP.hrv_avg;
    if (Math.abs(dhrv) >= 3) {
      note += ` HRV ${dhrv > 0 ? "en hausse de " : "en baisse de "}${Math.abs(dhrv)}ms vs semaine précédente, ${dhrv > 0 ? "signal positif sur la capacité d'adaptation." : "à surveiller sur la semaine à venir."}`;
    }
  }

  document.getElementById("reportCoachNote").textContent = note;
}
