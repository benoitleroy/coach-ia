// ARCHIVE.JS — UI "Mes Semaines" (P7)
// Consomme window.HISTORY + window.DETECTORS + window.SIMILARITY

(function () {
  const SIG_COLORS = {
    "Rythme de croisière":   "#00D4AA",
    "Build Z2":              "#6C63FF",
    "Charge brute":          "#FF6B6B",
    "Overreach confirmé":    "#FF4A4A",
    "Décharge planifiée":    "#A9A3FF",
    "Décharge subie":        "#FFD166",
    "Polarisée":             "#4A9CFF",
    "Séance seuil dominant": "#FFA07A",
    "Rebond":                "#2EE59D",
    "Choc immunitaire":      "#FF8FA3",
    "Compétition":           "#FFD700",
    "Calibration":           "#888EA8",
  };
  const SEV_COLORS = { alert:"#FF6B6B", warn:"#FFD166", info:"#A9A3FF", win:"#00D4AA" };
  const VOICE_META = {
    physio: { label: "Physio", icon: "🧬", color: "#00D4AA", desc: "Ce que ton corps raconte" },
    coach:  { label: "Coach",  icon: "🎯", color: "#6C63FF", desc: "Ce qu'un coach verrait" },
    data:   { label: "Data",   icon: "📊", color: "#A9A3FF", desc: "Ce que les patterns révèlent" },
  };

  let currentN = 12;
  let voicesCache = null;

  function init() {
    if (!window.HISTORY) {
      document.getElementById("weeksGrid").innerHTML = '<p style="color:#8B8FA8;">history.js non généré. Lance scripts/backfill.js.</p>';
      return;
    }
    voicesCache = window.DETECTORS.computeAllWeekVoices();
    const total = window.HISTORY.weeks.length;
    document.getElementById("archSubtitle").textContent = `${total} semaines de données · du ${window.HISTORY.meta.first_date} au ${window.HISTORY.meta.last_date}`;

    renderLegend();
    renderGrid();
    bindPeriodButtons();
  }

  function renderLegend() {
    const el = document.getElementById("legendSignatures");
    el.innerHTML = Object.entries(SIG_COLORS).map(([sig, color]) => `
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="width:10px;height:10px;border-radius:3px;background:${color};"></span>${sig}
      </div>
    `).join("");
  }

  function bindPeriodButtons() {
    document.getElementById("periodeBtns").addEventListener("click", e => {
      if (!e.target.matches(".periode-btn")) return;
      document.querySelectorAll(".periode-btn").forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
      currentN = parseInt(e.target.dataset.n, 10);
      renderGrid();
    });
  }

  function renderGrid() {
    const weeks = window.HISTORY.weeks.slice(-currentN).reverse();
    const grid = document.getElementById("weeksGrid");
    grid.innerHTML = weeks.map(w => {
      const color = SIG_COLORS[w.signature] || "#888";
      const metrics = w.metrics;
      const flagCount = metrics.flag_count || 0;
      const eventCount = (w.events || []).length;
      const recColor = metrics.recovery_avg >= 70 ? "#00D4AA" : metrics.recovery_avg >= 50 ? "#FFD166" : "#FF6B6B";
      return `
        <div class="week-card" data-id="${w.id}">
          <div class="sig-band" style="background:${color};"></div>
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div style="font-size:0.7rem;color:#8B8FA8;font-weight:600;">${w.id}</div>
              <div style="font-size:0.68rem;color:#555870;margin-top:2px;">${w.start_date} → ${w.end_date}</div>
            </div>
            ${w.incidents && w.incidents.race ? '<span style="font-size:1.1rem;">🏁</span>' : ''}
            ${w.incidents && w.incidents.illness ? '<span style="font-size:1.1rem;">🤒</span>' : ''}
          </div>
          <div style="font-size:0.82rem;color:${color};font-weight:700;">${w.signature}</div>
          <div style="display:flex;gap:12px;margin-top:4px;">
            <div style="flex:1;">
              <div style="font-size:0.62rem;color:#8B8FA8;">Recov</div>
              <div style="font-size:1rem;font-weight:700;color:${recColor};">${metrics.recovery_avg || "—"}${metrics.recovery_avg ? "%" : ""}</div>
            </div>
            <div style="flex:1;">
              <div style="font-size:0.62rem;color:#8B8FA8;">Strain</div>
              <div style="font-size:1rem;font-weight:700;color:#F0F0F5;">${metrics.strain_total ? Math.round(metrics.strain_total) : "—"}</div>
            </div>
            <div style="flex:1;">
              <div style="font-size:0.62rem;color:#8B8FA8;">ACWR</div>
              <div style="font-size:1rem;font-weight:700;color:#F0F0F5;">${metrics.acwr || "—"}</div>
            </div>
          </div>
          <div style="display:flex;gap:6px;margin-top:4px;">
            ${flagCount ? `<span class="badge" style="background:rgba(255,107,107,0.12);color:#FF6B6B;border:1px solid rgba(255,107,107,0.25);font-size:0.62rem;">${flagCount} flags</span>` : ""}
            ${eventCount ? `<span class="badge" style="background:rgba(169,163,255,0.12);color:#A9A3FF;border:1px solid rgba(169,163,255,0.25);font-size:0.62rem;">${eventCount} events</span>` : ""}
          </div>
        </div>
      `;
    }).join("");

    grid.querySelectorAll(".week-card").forEach(el => {
      el.addEventListener("click", () => openDrill(el.dataset.id));
    });
  }

  function openDrill(weekId) {
    const H = window.HISTORY;
    const w = H.weeks.find(x => x.id === weekId);
    if (!w) return;

    const days = H.daily.filter(d => d.date >= w.start_date && d.date <= w.end_date);
    const voices = voicesCache[w.id] || { physio: [], coach: [], data: [] };
    const color = SIG_COLORS[w.signature] || "#888";

    // Header
    document.getElementById("drillDates").textContent = `${w.start_date} → ${w.end_date} · ${w.days_count} jours`;
    document.getElementById("drillTitle").textContent = `Semaine ${w.id}`;
    const sigEl = document.getElementById("drillSignature");
    sigEl.innerHTML = `<span style="color:${color};font-weight:700;">● ${w.signature}</span>`;

    // Metrics
    const m = w.metrics;
    document.getElementById("drillMetrics").innerHTML = [
      { label: "Recovery moy.", value: m.recovery_avg ? `${m.recovery_avg}%` : "—" },
      { label: "HRV moy.", value: m.hrv_avg ? `${m.hrv_avg}ms` : "—" },
      { label: "HRV trend", value: m.hrv_trend !== null ? `${m.hrv_trend}σ` : "—", color: m.hrv_trend > 0 ? "#00D4AA" : m.hrv_trend < 0 ? "#FF6B6B" : "#F0F0F5" },
      { label: "Strain total", value: m.strain_total ? Math.round(m.strain_total) : "—" },
      { label: "Volume", value: m.volume_min ? `${Math.round(m.volume_min/60 * 10)/10}h` : "—" },
      { label: "ACWR", value: m.acwr || "—" },
      { label: "Séances", value: m.session_count || 0 },
      { label: "Flags physio", value: m.flag_count || 0, color: m.flag_count >= 3 ? "#FF6B6B" : "#F0F0F5" },
    ].map(k => `
      <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:10px;padding:10px;">
        <div style="font-size:0.68rem;color:#8B8FA8;">${k.label}</div>
        <div style="font-size:1.1rem;font-weight:700;color:${k.color || "#F0F0F5"};margin-top:2px;">${k.value}</div>
      </div>
    `).join("");

    // Comparaison S vs S-1
    renderWeekCompare(w);

    // 7-day strip
    renderDayStrip(days);

    // Voices
    renderVoices(voices);

    // Events
    const events = w.events || [];
    document.getElementById("eventsList").innerHTML = events.length
      ? events.map(e => `
          <div style="padding:8px 10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:8px;margin-bottom:6px;">
            <div style="font-weight:600;color:#F0F0F5;">${e.type}</div>
            <div style="font-size:0.72rem;color:#8B8FA8;">${e.date || ""}</div>
          </div>`).join("")
      : '<div style="color:#8B8FA8;">Aucun événement particulier.</div>';

    // Similar weeks
    const similar = window.SIMILARITY.similarWeeks(w.id, 3);
    document.getElementById("similarList").innerHTML = similar.length
      ? similar.map(s => `
          <div class="sim-card" data-id="${s.week.id}">
            <div style="display:flex;justify-content:space-between;">
              <strong style="color:#F0F0F5;">${s.week.id}</strong>
              <span style="color:#8B8FA8;font-size:0.72rem;">d=${s.distance.toFixed(2)}</span>
            </div>
            <div style="color:${SIG_COLORS[s.week.signature]||"#888"};margin-top:4px;">● ${s.week.signature}</div>
            <div style="color:#8B8FA8;font-size:0.72rem;margin-top:2px;">${s.week.start_date} → ${s.week.end_date}</div>
          </div>
        `).join("")
      : '<div style="color:#8B8FA8;">Pas assez de données.</div>';

    document.querySelectorAll("#similarList .sim-card").forEach(el => {
      el.addEventListener("click", () => openDrill(el.dataset.id));
    });

    const panel = document.getElementById("drillPanel");
    panel.style.display = "block";
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderWeekCompare(w) {
    const weeks = window.HISTORY.weeks;
    const idx = weeks.findIndex(x => x.id === w.id);
    const prev = idx > 0 ? weeks[idx - 1] : null;
    const box = document.getElementById("drillCompare");
    const grid = document.getElementById("drillCompareGrid");
    const narrative = document.getElementById("drillCompareNarrative");
    if (!box || !grid) return;
    if (!prev) { box.style.display = "none"; return; }
    box.style.display = "block";

    const fmt = (cur, prv, label, unit, betterUp = true) => {
      if (cur == null || prv == null) {
        return { label, txt: "—", dTxt: "", color: "#8B8FA8", raw: null };
      }
      const delta = cur - prv;
      const pct = prv !== 0 ? Math.round((delta / Math.abs(prv)) * 100) : 0;
      const isBetter = betterUp ? delta > 0 : delta < 0;
      const color = Math.abs(delta) < 0.01 ? "#8B8FA8" : isBetter ? "#00D4AA" : "#FF6B6B";
      const arrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "=";
      return { label, txt: `${cur}${unit}`, dTxt: `${arrow} ${Math.abs(delta).toFixed(Number.isInteger(delta) ? 0 : 1)}${unit} (${pct > 0 ? "+" : ""}${pct}%)`, color, raw: delta };
    };

    const mC = w.metrics, mP = prev.metrics;
    const cards = [
      fmt(mC.recovery_avg, mP.recovery_avg, "Recovery", "%", true),
      fmt(mC.hrv_avg, mP.hrv_avg, "HRV moy.", "ms", true),
      fmt(mC.strain_total ? Math.round(mC.strain_total) : null, mP.strain_total ? Math.round(mP.strain_total) : null, "Strain", "", false),
      fmt(mC.volume_min ? Math.round(mC.volume_min / 60 * 10) / 10 : null, mP.volume_min ? Math.round(mP.volume_min / 60 * 10) / 10 : null, "Volume", "h", true),
      fmt(mC.acwr, mP.acwr, "ACWR", "", false),
      fmt(mC.session_count, mP.session_count, "Séances", "", true),
      fmt(mC.flag_count, mP.flag_count, "Flags physio", "", false),
    ];

    grid.innerHTML = cards.map(c => `
      <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:10px;padding:10px;">
        <div style="font-size:0.68rem;color:#8B8FA8;">${c.label}</div>
        <div style="font-size:1rem;font-weight:700;color:#F0F0F5;margin-top:2px;">${c.txt}</div>
        <div style="font-size:0.72rem;color:${c.color};margin-top:2px;">${c.dTxt}</div>
      </div>
    `).join("");

    // Narrative : met en mots les deltas les plus marqués
    const sigCur = w.signature, sigPrev = prev.signature;
    const parts = [`Semaine ${prev.id} → ${w.id}.`];
    if (sigCur !== sigPrev) parts.push(`Bascule de signature : ${sigPrev} → ${sigCur}.`);
    const recDelta = cards[0].raw;
    if (recDelta != null && Math.abs(recDelta) >= 8) parts.push(recDelta > 0 ? `Recovery remonte (+${recDelta}%).` : `Recovery chute (${recDelta}%).`);
    const hrvDelta = cards[1].raw;
    if (hrvDelta != null && Math.abs(hrvDelta) >= 3) parts.push(hrvDelta > 0 ? `HRV rebondit (+${hrvDelta}ms).` : `HRV en baisse (${hrvDelta}ms).`);
    const volDelta = cards[3].raw;
    if (volDelta != null && Math.abs(volDelta) >= 2) parts.push(volDelta > 0 ? `Volume en hausse (+${volDelta}h).` : `Volume en baisse (${volDelta}h).`);
    const flagDelta = cards[6].raw;
    if (flagDelta != null && flagDelta >= 2) parts.push(`Flags physio en hausse (+${flagDelta}).`);
    narrative.textContent = parts.length > 1 ? parts.join(" ") : `Semaine ${prev.id} → ${w.id}. Évolution mesurée, rien de majeur à signaler.`;
  }

  function renderDayStrip(days) {
    const strip = document.getElementById("dayStrip");
    strip.innerHTML = days.map(d => {
      const rec = d.recovery;
      const color = rec >= 70 ? "#00D4AA" : rec >= 50 ? "#FFD166" : rec ? "#FF6B6B" : "#555870";
      const flags = d.composite_flag ? d.composite_flag.count : 0;
      const hasActivity = d.activities && d.activities.length > 0;
      const journalIcon = d.journal && d.journal.illness ? "🤒"
                       : d.journal && d.journal.injury ? "🩹"
                       : d.journal && d.journal.travel ? "✈️"
                       : d.journal && d.journal.alcohol ? "🍷" : "";
      const date = new Date(d.timestamp);
      const num = date.getDate();
      return `
        <div class="day-pill" data-date="${d.date}" style="border-color:${color}33;cursor:pointer;">
          <div style="font-size:0.6rem;color:#8B8FA8;">${["D","L","M","M","J","V","S"][date.getDay()]}${num}</div>
          <div style="font-size:1rem;font-weight:700;color:${color};">${rec || "—"}</div>
          <div style="font-size:0.58rem;color:#8B8FA8;">${hasActivity ? "🏃" : ""}${flags>=3?"⚠️":""}${journalIcon}</div>
        </div>
      `;
    }).join("");

    strip.querySelectorAll(".day-pill").forEach(el => {
      el.addEventListener("click", () => openDayModal(el.dataset.date));
    });
  }

  function renderVoices(voices) {
    const el = document.getElementById("voicesBlock");
    el.innerHTML = Object.entries(VOICE_META).map(([key, meta]) => {
      const items = voices[key] || [];
      const inner = items.length
        ? items.map(d => `
            <div class="det-item">
              <span class="voice-dot" style="background:${SEV_COLORS[d.severity]};margin-top:5px;"></span>
              <div>
                <div class="sev-${d.severity}" style="font-weight:600;">${d.label}</div>
                <div style="color:#8B8FA8;font-size:0.72rem;margin-top:2px;">${d.message}</div>
              </div>
            </div>
          `).join("")
        : '<div style="color:#555870;font-size:0.75rem;padding:8px 0;">Rien à signaler.</div>';

      return `
        <div class="voice-block">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
            <span style="font-size:1.1rem;">${meta.icon}</span>
            <div>
              <div style="font-weight:700;color:${meta.color};font-size:0.85rem;">${meta.label}</div>
              <div style="font-size:0.68rem;color:#8B8FA8;">${meta.desc}</div>
            </div>
          </div>
          ${inner}
        </div>
      `;
    }).join("");
  }

  function openDayModal(dateStr) {
    const d = window.HISTORY.daily.find(x => x.date === dateStr);
    if (!d) return;

    const m = document.getElementById("modalDay");
    const title = document.getElementById("modalDayTitle");
    const body = document.getElementById("modalDayBody");

    title.textContent = d.date;

    const z = d.zscores || {};
    const b = d.baselines || {};
    const fmtSignal = (label, raw, unit, zkey) => {
      if (raw === null || raw === undefined) return "";
      const zscore = z[zkey];
      const baseline = b[zkey];
      const zTxt = typeof zscore === "number" ? `(z ${zscore > 0 ? "+" : ""}${zscore})` : "";
      const baseTxt = baseline ? ` · baseline ${baseline.baseline}` : "";
      return `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:0.8rem;">
        <span style="color:#8B8FA8;">${label}</span>
        <span style="color:#F0F0F5;">${raw}${unit} <span style="color:#8B8FA8;font-size:0.72rem;">${zTxt}${baseTxt}</span></span>
      </div>`;
    };

    const actvsHTML = (d.activities || []).map(a => `
      <div style="display:flex;gap:10px;align-items:center;padding:8px 10px;background:rgba(108,99,255,0.06);border-radius:8px;margin-bottom:6px;">
        <span style="font-size:1.1rem;">${a.icone || "🏅"}</span>
        <div style="flex:1;">
          <div style="color:#F0F0F5;font-size:0.82rem;font-weight:600;">${a.label || a.type}</div>
          <div style="color:#8B8FA8;font-size:0.72rem;">${a.duration_min}min · ${a.distance_km || 0}km · ${a.avg_hr || "—"}bpm</div>
        </div>
      </div>
    `).join("") || '<div style="color:#8B8FA8;font-size:0.8rem;">Aucune séance</div>';

    const journalActive = Object.entries(d.journal || {}).filter(([,v]) => v).map(([k]) => k);

    body.innerHTML = `
      <div style="margin-bottom:16px;">
        <div style="font-size:0.7rem;font-weight:700;color:#8B8FA8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Physio matin</div>
        ${fmtSignal("HRV", d.hrv, "ms", "hrv_morning")}
        ${fmtSignal("RHR", d.rhr, "bpm", "rhr_morning")}
        ${fmtSignal("Skin temp", d.skin_temp, "°C", "skin_temp")}
        ${fmtSignal("Respi", d.rr, "rpm", "respiratory_rate")}
        ${fmtSignal("SpO2", d.spo2, "%", "spo2")}
        ${d.recovery ? `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:0.8rem;"><span style="color:#8B8FA8;">Recovery</span><span style="color:#F0F0F5;">${d.recovery}%</span></div>` : ""}
      </div>
      <div style="margin-bottom:16px;">
        <div style="font-size:0.7rem;font-weight:700;color:#8B8FA8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Sommeil</div>
        ${fmtSignal("Heures", d.sleep ? d.sleep.hours : null, "h", "sleep_hours")}
        ${fmtSignal("Deep", d.sleep ? d.sleep.deep_min : null, "min", "deep_sleep_min")}
        ${fmtSignal("REM", d.sleep ? d.sleep.rem_min : null, "min", "rem_sleep_min")}
        ${fmtSignal("Efficacité", d.sleep ? d.sleep.efficiency : null, "%", "sleep_efficiency")}
      </div>
      <div style="margin-bottom:16px;">
        <div style="font-size:0.7rem;font-weight:700;color:#8B8FA8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Activités</div>
        ${actvsHTML}
      </div>
      ${journalActive.length ? `
        <div>
          <div style="font-size:0.7rem;font-weight:700;color:#8B8FA8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Journal</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${journalActive.map(k => `<span class="badge" style="background:rgba(108,99,255,0.12);color:#A9A3FF;border:1px solid rgba(108,99,255,0.25);">${k}</span>`).join("")}
          </div>
        </div>` : ""}
    `;

    m.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  window.fermerDrill = () => {
    document.getElementById("drillPanel").style.display = "none";
  };
  window.fermerDay = () => {
    document.getElementById("modalDay").style.display = "none";
    document.body.style.overflow = "";
  };

  document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { window.fermerDay(); window.fermerDrill(); }
  });
})();
