// HISTORIQUE.JS — graphiques SVG et tendances

// ─── DONNÉES FICTIVES PAR ATHLÈTE ───
const HISTORIQUE_DATA = {
  benoit: {
    semaines: ["S11","S12","S13","S14","S15","S16","S17","S18"],
    chargeAigue:    [210, 265, 290, 320, 275, 340, 370, 380],
    chargeChronique:[240, 245, 258, 270, 272, 285, 300, 310],
    hrv:            [55, 57, 54, 59, 52, 60, 61, 62],
    disciplines: [
      { nom: "Vélo",        icone: "🚴", count: 14, couleur: "#6C63FF" },
      { nom: "Course",      icone: "🏃", count: 10, couleur: "#00D4AA" },
      { nom: "Natation",    icone: "🏊", count: 9,  couleur: "#FF6B6B" },
      { nom: "Brique",      icone: "⚡", count: 4,  couleur: "#FFD166" },
      { nom: "Repos actif", icone: "🧘", count: 7,  couleur: "#8B8FA8" },
    ],
    kpi: {
      volumeTotal: "62h30",   volumeTrend: "+12%",  volumePos: true,
      seancesTotal: 44,       seancesTrend: "+3",   seancesPos: true,
      sommeilMoy: "6h55",     sommeilTrend: "+18min",sommeilPos: true,
      hrvMoy: "57 ms",        hrvTrend: "+4ms",      hrvPos: true,
    },
    seances: [
      { date:"Hier",      type:"Vélo",          icone:"🚴", duree:"2h15", distance:"68km",    ressenti:4, charge:142, ratio:1.23 },
      { date:"Jeu 17",    type:"Natation",       icone:"🏊", duree:"1h30", distance:"3 200m",  ressenti:4, charge:88,  ratio:1.21 },
      { date:"Mer 16",    type:"Course à pied",  icone:"🏃", duree:"1h45", distance:"17km",    ressenti:3, charge:104, ratio:1.18 },
      { date:"Mar 15",    type:"Repos",          icone:"😴", duree:"—",    distance:"—",       ressenti:5, charge:0,   ratio:1.15 },
      { date:"Lun 14",    type:"Brique",         icone:"⚡", duree:"2h",   distance:"50km+8km", ressenti:3, charge:136, ratio:1.19 },
      { date:"Dim 13",    type:"Course à pied",  icone:"🏃", duree:"1h50", distance:"18km",    ressenti:4, charge:112, ratio:1.22 },
      { date:"Sam 12",    type:"Vélo",           icone:"🚴", duree:"3h",   distance:"90km",    ressenti:4, charge:188, ratio:1.24 },
      { date:"Ven 11",    type:"Natation",       icone:"🏊", duree:"1h",   distance:"2 400m",  ressenti:5, charge:60,  ratio:1.20 },
    ],
  },

  sophie: {
    semaines: ["S11","S12","S13","S14","S15","S16","S17","S18"],
    chargeAigue:    [280, 340, 390, 430, 460, 500, 510, 520],
    chargeChronique:[260, 275, 295, 315, 330, 340, 348, 350],
    hrv:            [58, 55, 51, 48, 45, 42, 41, 41],
    disciplines: [
      { nom: "Course",   icone: "🏃", count: 16, couleur: "#FF6B6B" },
      { nom: "Vélo",     icone: "🚴", count: 10, couleur: "#6C63FF" },
      { nom: "Natation", icone: "🏊", count: 8,  couleur: "#00D4AA" },
      { nom: "Brique",   icone: "⚡", count: 3,  couleur: "#FFD166" },
    ],
    kpi: {
      volumeTotal: "74h",    volumeTrend: "+28%",  volumePos: false,
      seancesTotal: 37,      seancesTrend: "+8",   seancesPos: false,
      sommeilMoy: "5h55",    sommeilTrend: "-25min",sommeilPos: false,
      hrvMoy: "47 ms",       hrvTrend: "-11ms",    hrvPos: false,
    },
    seances: [
      { date:"Hier",   type:"Course à pied", icone:"🏃", duree:"1h20", distance:"15km", ressenti:2, charge:95,  ratio:1.49 },
      { date:"Jeu 17", type:"Vélo",          icone:"🚴", duree:"1h45", distance:"52km", ressenti:2, charge:110, ratio:1.45 },
      { date:"Mer 16", type:"Natation",      icone:"🏊", duree:"1h",   distance:"2km",  ressenti:3, charge:65,  ratio:1.42 },
      { date:"Mar 15", type:"Course",        icone:"🏃", duree:"1h15", distance:"13km", ressenti:2, charge:88,  ratio:1.44 },
      { date:"Lun 14", type:"Vélo",          icone:"🚴", duree:"2h",   distance:"60km", ressenti:2, charge:125, ratio:1.46 },
      { date:"Dim 13", type:"Course longue", icone:"🏃", duree:"2h",   distance:"20km", ressenti:2, charge:130, ratio:1.48 },
      { date:"Sam 12", type:"Brique",        icone:"⚡", duree:"2h30", distance:"70km+10km",ressenti:3, charge:160, ratio:1.45 },
      { date:"Ven 11", type:"Natation",      icone:"🏊", duree:"1h",   distance:"2km",  ressenti:3, charge:65,  ratio:1.40 },
    ],
  },

  marc: {
    semaines: ["S11","S12","S13","S14","S15","S16","S17","S18"],
    chargeAigue:    [100, 120, 140, 130, 150, 160, 170, 180],
    chargeChronique:[180, 190, 195, 200, 210, 220, 228, 240],
    hrv:            [68, 70, 69, 72, 71, 70, 72, 71],
    disciplines: [
      { nom: "Course",   icone: "🏃", count: 9,  couleur: "#00D4AA" },
      { nom: "Natation", icone: "🏊", count: 8,  couleur: "#6C63FF" },
      { nom: "Vélo",     icone: "🚴", count: 7,  couleur: "#FF6B6B" },
    ],
    kpi: {
      volumeTotal: "28h",    volumeTrend: "+5%",   volumePos: true,
      seancesTotal: 24,      seancesTrend: "+2",   seancesPos: true,
      sommeilMoy: "7h30",    sommeilTrend: "stable",sommeilPos: true,
      hrvMoy: "71 ms",       hrvTrend: "stable",   hrvPos: true,
    },
    seances: [
      { date:"Av.-hier", type:"Natation",      icone:"🏊", duree:"45min", distance:"1 200m", ressenti:5, charge:45, ratio:0.75 },
      { date:"Lun 14",   type:"Course",        icone:"🏃", duree:"50min", distance:"8km",    ressenti:4, charge:55, ratio:0.74 },
      { date:"Dim 13",   type:"Vélo",          icone:"🚴", duree:"1h",    distance:"28km",   ressenti:4, charge:65, ratio:0.76 },
      { date:"Ven 11",   type:"Natation",      icone:"🏊", duree:"45min", distance:"1 100m", ressenti:4, charge:42, ratio:0.72 },
      { date:"Mer 9",    type:"Course",        icone:"🏃", duree:"45min", distance:"7km",    ressenti:5, charge:50, ratio:0.73 },
      { date:"Lun 7",    type:"Vélo",          icone:"🚴", duree:"1h",    distance:"27km",   ressenti:4, charge:60, ratio:0.70 },
    ],
  },
};

let athleteActif = "benoit";
let nbSemaines = 8;

document.addEventListener("DOMContentLoaded", () => {
  rendrePage(athleteActif);
  bindSélecteur();
  bindPeriode();
});

// ─── DONNÉES RÉELLES WHOOP (si disponibles) ───────────────────────────────────
function _buildRealDataWhoop(nbSem) {
  const obs = (window.WEARABLE_OBS || []).filter(o => o.athlete_id === "benoit");
  if (!obs.length) return null;

  // Clé ISO de la semaine (lundi)
  function weekKey(ts) {
    const d = new Date(ts);
    const day = d.getDay() || 7;
    const mon = new Date(d);
    mon.setDate(d.getDate() - (day - 1));
    return mon.toISOString().slice(0, 10);
  }

  function weekLabel(dateStr) {
    const d = new Date(dateStr + "T12:00:00");
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const wn = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
    return `S${wn}`;
  }

  const byWeek = {};
  obs.forEach(o => {
    const wk = weekKey(o.timestamp);
    if (!byWeek[wk]) byWeek[wk] = { hrv: [], sleep: [], recovery: [] };
    if (o.signal_id === "hrv_morning")   byWeek[wk].hrv.push(o.raw_value);
    if (o.signal_id === "sleep_hours")   byWeek[wk].sleep.push(o.raw_value);
    if (o.signal_id === "recovery_score") byWeek[wk].recovery.push(o.raw_value);
  });

  const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b) / arr.length * 10) / 10 : null;

  const weeks = Object.keys(byWeek).sort().slice(-nbSem);
  if (weeks.length < 2) return null;

  const semaines = weeks.map(weekLabel);
  const hrv      = weeks.map(w => avg(byWeek[w].hrv) ?? 0);
  const sleep    = weeks.map(w => avg(byWeek[w].sleep) ?? 0);

  // KPI sur la période affichée vs période précédente
  const prevWeeks = Object.keys(byWeek).sort().slice(-nbSem * 2, -nbSem);
  const allObs   = obs.filter(o => weeks.some(w => weekKey(o.timestamp) === w));
  const prevObs  = obs.filter(o => prevWeeks.some(w => weekKey(o.timestamp) === w));

  const hrvNow  = Math.round(allObs.filter(o => o.signal_id === "hrv_morning").reduce((s, o, _, a) => s + o.raw_value / a.length, 0));
  const hrvPrev = Math.round(prevObs.filter(o => o.signal_id === "hrv_morning").reduce((s, o, _, a) => s + o.raw_value / a.length, 0));
  const sleepNow  = Math.round(allObs.filter(o => o.signal_id === "sleep_hours").reduce((s, o, _, a) => s + o.raw_value / a.length, 0) * 10) / 10;
  const sleepPrev = Math.round(prevObs.filter(o => o.signal_id === "sleep_hours").reduce((s, o, _, a) => s + o.raw_value / a.length, 0) * 10) / 10;

  const hrvDelta   = hrvNow - (hrvPrev || hrvNow);
  const sleepDelta = Math.round((sleepNow - (sleepPrev || sleepNow)) * 60); // en minutes

  const sleepH = Math.floor(sleepNow);
  const sleepM = Math.round((sleepNow - sleepH) * 60);
  const sleepStr = `${sleepH}h${String(sleepM).padStart(2, "0")}`;

  return {
    semaines, hrv, sleep,
    kpiOverride: {
      sommeilMoy:    sleepStr,
      sommeilTrend:  sleepDelta === 0 ? "stable" : `${sleepDelta > 0 ? "+" : ""}${sleepDelta}min`,
      sommeilPos:    sleepDelta >= 0,
      hrvMoy:        `${hrvNow} ms`,
      hrvTrend:      hrvDelta === 0 ? "stable" : `${hrvDelta > 0 ? "+" : ""}${hrvDelta}ms`,
      hrvPos:        hrvDelta >= 0,
    },
  };
}

function _formatVolume(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m}min`;
}

function _computeVolumeTrend(currSec, prevSec) {
  if (!prevSec) return { trend: "—", pos: true };
  const pct = Math.round(((currSec - prevSec) / prevSec) * 100);
  return { trend: `${pct >= 0 ? "+" : ""}${pct}%`, pos: pct >= 0 };
}

function _computeSeancesTrend(curr, prev) {
  const delta = curr - prev;
  return { trend: `${delta >= 0 ? "+" : ""}${delta}`, pos: delta >= 0 };
}

function rendrePage(id) {
  const d = HISTORIQUE_DATA[id];
  if (!d) return;
  const a = window.ATHLETES[id];
  document.getElementById("headerSub").textContent = `Évolution de ${a.nom}`;

  // Historique Strava réel (si dispo) — slice sur nbSemaines
  const hist = a.historique && Array.isArray(a.historique.semaines) ? a.historique : null;

  let sem, ca, cc, volumeSliceSec, seancesSliceCount, volumeTrend, seancesTrend;
  if (hist) {
    sem = hist.semaines.slice(-nbSemaines);
    ca  = hist.chargeAigue.slice(-nbSemaines);
    cc  = hist.chargeChronique.slice(-nbSemaines);

    volumeSliceSec    = hist.volumeSec.slice(-nbSemaines).reduce((s, v) => s + v, 0);
    seancesSliceCount = hist.seancesCount.slice(-nbSemaines).reduce((s, v) => s + v, 0);

    const prevStart = Math.max(0, hist.semaines.length - nbSemaines * 2);
    const prevEnd   = hist.semaines.length - nbSemaines;
    const prevVol   = hist.volumeSec.slice(prevStart, prevEnd).reduce((s, v) => s + v, 0);
    const prevSeances = hist.seancesCount.slice(prevStart, prevEnd).reduce((s, v) => s + v, 0);
    volumeTrend  = _computeVolumeTrend(volumeSliceSec, prevVol);
    seancesTrend = _computeSeancesTrend(seancesSliceCount, prevSeances);
  } else {
    sem = d.semaines.slice(-nbSemaines);
    ca  = d.chargeAigue.slice(-nbSemaines);
    cc  = d.chargeChronique.slice(-nbSemaines);
  }

  // Vraies données Whoop si disponibles pour Benoît
  const real = id === "benoit" ? _buildRealDataWhoop(nbSemaines) : null;
  const hrv  = real ? real.hrv : d.hrv.slice(-nbSemaines);

  // KPI : merge fictif → override Whoop (HRV/sommeil) → override Strava (volume/séances)
  let kpi = real ? Object.assign({}, d.kpi, real.kpiOverride) : Object.assign({}, d.kpi);
  if (hist) {
    kpi.volumeTotal  = _formatVolume(volumeSliceSec);
    kpi.volumeTrend  = volumeTrend.trend;
    kpi.volumePos    = volumeTrend.pos;
    kpi.seancesTotal = seancesSliceCount;
    kpi.seancesTrend = seancesTrend.trend;
    kpi.seancesPos   = seancesTrend.pos;
  }

  // Séances et disciplines : override Strava (data-benoit.js) si disponible
  const seancesReelles     = Array.isArray(a.seances)     ? a.seances     : null;
  const disciplinesReelles = Array.isArray(a.disciplines) ? a.disciplines : null;

  rendreKPI(kpi, id);
  // Overlay signatures + incidents (Benoît only)
  const overlays = id === "benoit" ? _buildWeekOverlays(sem) : null;
  rendreChargeChart(sem, ca, cc, overlays);
  rendreHRVChart(real ? real.semaines : sem, hrv, id);
  rendreDonut(disciplinesReelles && disciplinesReelles.length ? disciplinesReelles : d.disciplines);
  rendreDecouplingChart(id);
  rendreHeatmap(id);
  rendreComparePeriods(id);
  rendreTSB(id);
  rendreRecords(id);
  rendreFTPProgress(id);
  rendreListeSeances(seancesReelles && seancesReelles.length ? seancesReelles : d.seances, id);
}

// ─── LOT 23 : COMPARAISON PÉRIODE vs PÉRIODE ───────────────────────────
let _compareN = 4; // N semaines par défaut
function rendreComparePeriods(id) {
  const card = document.getElementById("comparePeriodsCard");
  if (!card) return;
  if (id !== "benoit" || !window.HISTORY || !window.HISTORY.weeks || window.HISTORY.weeks.length < 8) {
    card.style.display = "none"; return;
  }
  card.style.display = "block";

  // Bind period buttons (une seule fois)
  if (!card.dataset.bound) {
    card.querySelectorAll(".cmp-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        card.querySelectorAll(".cmp-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        _compareN = parseInt(btn.dataset.n);
        _doCompareRender(id);
      });
    });
    card.dataset.bound = "1";
  }
  _doCompareRender(id);
}

function _doCompareRender(id) {
  const H = window.HISTORY;
  const N = _compareN;
  const all = H.weeks;
  if (all.length < N * 2) {
    document.getElementById("comparePeriodsCard").style.display = "none";
    return;
  }
  const curr = all.slice(-N);
  const prev = all.slice(-N * 2, -N);

  const currLabel = `${curr[0].id} → ${curr[curr.length - 1].id}`;
  const prevLabel = `${prev[0].id} → ${prev[prev.length - 1].id}`;
  document.getElementById("compareCurrLabel").textContent = currLabel;
  document.getElementById("comparePrevLabel").textContent = prevLabel;

  // Agrégations
  const avg = (arr, key) => {
    const vals = arr.map(w => w.metrics[key]).filter(v => Number.isFinite(v));
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const sum = (arr, key) => arr.reduce((s, w) => s + (Number.isFinite(w.metrics[key]) ? w.metrics[key] : 0), 0);
  const sumMin = sum(curr, "volume_min"), sumMinP = sum(prev, "volume_min");
  const sumSess = sum(curr, "session_count"), sumSessP = sum(prev, "session_count");
  const sumStrain = sum(curr, "strain_total_strava"), sumStrainP = sum(prev, "strain_total_strava");

  const rows = [
    { lab: "HRV moyenne", curr: avg(curr, "hrv_avg"), prev: avg(prev, "hrv_avg"), unit: "ms", round: 0, betterUp: true },
    { lab: "Recovery moy.", curr: avg(curr, "recovery_avg"), prev: avg(prev, "recovery_avg"), unit: "%", round: 0, betterUp: true },
    { lab: "Sommeil moy.", curr: avg(curr, "sleep_hours_avg"), prev: avg(prev, "sleep_hours_avg"), unit: "h", round: 1, betterUp: true },
    { lab: "Volume total", curr: sumMin / 60, prev: sumMinP / 60, unit: "h", round: 1, betterUp: true },
    { lab: "Séances", curr: sumSess, prev: sumSessP, unit: "", round: 0, betterUp: true },
    { lab: "Charge cumulée", curr: sumStrain, prev: sumStrainP, unit: "", round: 0, betterUp: true },
    { lab: "ACWR moyen", curr: avg(curr, "acwr"), prev: avg(prev, "acwr"), unit: "", round: 2, betterUp: null }, // null = neutre
  ];

  const fmtNum = (v, round) => {
    if (v == null) return "—";
    if (round === 0) return Math.round(v).toLocaleString("fr");
    return (Math.round(v * Math.pow(10, round)) / Math.pow(10, round)).toString();
  };

  document.getElementById("compareRows").innerHTML = rows.map(r => {
    const cV = fmtNum(r.curr, r.round) + r.unit;
    const pV = fmtNum(r.prev, r.round) + r.unit;
    let arrow = "—", col = "#8B8FA8";
    if (Number.isFinite(r.curr) && Number.isFinite(r.prev)) {
      const delta = r.curr - r.prev;
      const pct = r.prev !== 0 ? (delta / r.prev) * 100 : 0;
      if (Math.abs(pct) < 2) { arrow = "="; col = "#8B8FA8"; }
      else if (r.betterUp == null) {
        arrow = delta > 0 ? `+${Math.round(pct)}%` : `${Math.round(pct)}%`;
        col = "#6C63FF";
      } else {
        arrow = delta > 0 ? `+${Math.round(pct)}%` : `${Math.round(pct)}%`;
        col = (r.betterUp ? delta > 0 : delta < 0) ? "#00D4AA" : "#FF6B6B";
      }
    }
    return `
      <div class="cmp-row">
        <div class="cmp-side">
          <div class="cmp-label">${r.lab}</div>
          <div class="cmp-val" style="color:#A9A3FF;">${pV}</div>
        </div>
        <div class="cmp-arrow" style="color:${col};">${arrow}</div>
        <div class="cmp-side">
          <div class="cmp-label">${r.lab}</div>
          <div class="cmp-val" style="color:#00D4AA;">${cV}</div>
        </div>
      </div>
    `;
  }).join("");

  // Narrative
  const vH = avg(curr, "hrv_avg"), vHP = avg(prev, "hrv_avg");
  const vR = avg(curr, "recovery_avg"), vRP = avg(prev, "recovery_avg");
  const vol = sumMin / 60, volP = sumMinP / 60;
  let narr = [];
  if (Number.isFinite(vol) && Number.isFinite(volP)) {
    const volPct = volP > 0 ? ((vol - volP) / volP) * 100 : 0;
    if (Math.abs(volPct) > 10) {
      narr.push(`Volume ${volPct > 0 ? "en hausse de" : "en baisse de"} ${Math.abs(Math.round(volPct))}% — ${volPct > 0 ? "la charge monte, vérifie que le corps suit" : "allègement visible, souvent nécessaire après une phase chargée"}.`);
    } else {
      narr.push(`Volume stable entre les deux périodes (${Math.round(vol * 10) / 10}h).`);
    }
  }
  if (Number.isFinite(vH) && Number.isFinite(vHP)) {
    const dH = vH - vHP;
    if (Math.abs(dH) > 3) {
      narr.push(`HRV ${dH > 0 ? "progresse" : "régresse"} de ${Math.abs(Math.round(dH))}ms — ${dH > 0 ? "signe que l'organisme s'adapte mieux" : "à surveiller, peut indiquer fatigue accumulée"}.`);
    }
  }
  if (Number.isFinite(vR) && Number.isFinite(vRP)) {
    const dR = vR - vRP;
    if (Math.abs(dR) > 5) {
      narr.push(`Recovery moyen ${dR > 0 ? "en hausse" : "en baisse"} de ${Math.abs(Math.round(dR))} points.`);
    }
  }
  if (!narr.length) narr.push("Les deux périodes sont globalement équivalentes — tendance stable.");
  document.getElementById("compareNarrative").textContent = narr.join(" ");
}

// ─── LOT 20 : HEATMAP CALENDRIER ANNUEL ────────────────────────────────
function rendreHeatmap(id) {
  const card = document.getElementById("heatmapCard");
  if (!card) return;
  if (id !== "benoit" || !window.HISTORY || !window.HISTORY.daily || !window.HISTORY.daily.length) {
    card.style.display = "none"; return;
  }
  card.style.display = "block";

  const daily = window.HISTORY.daily;
  // Aligner sur lundi : on part du dernier jour et on remonte
  const last = new Date(daily[daily.length - 1].date);
  // S'assurer d'inclure au moins 52 semaines × 7 jours = 364 jours
  const targetDays = 364;
  const start = new Date(last);
  start.setDate(start.getDate() - (targetDays - 1));
  // Rewind jusqu'au lundi précédent
  while (start.getDay() !== 1) start.setDate(start.getDate() - 1);

  // Map date → daily entry
  const byDate = {};
  daily.forEach(d => { byDate[d.date] = d; });

  // Seuils d'intensité basés sur distribution
  const strains = daily.map(d => d.strain_strava).filter(v => Number.isFinite(v) && v > 0);
  strains.sort((a, b) => a - b);
  const q = (p) => strains.length ? strains[Math.floor(strains.length * p)] : 0;
  const t1 = q(0.25), t2 = q(0.5), t3 = q(0.75), t4 = q(0.9);

  function colorOf(v) {
    if (!Number.isFinite(v) || v <= 0) return "#22263A";
    if (v < t1) return "rgba(0,212,170,0.35)";
    if (v < t2) return "rgba(108,99,255,0.55)";
    if (v < t3) return "rgba(255,209,102,0.75)";
    return "rgba(255,107,107,0.9)";
  }

  // Générer les semaines (chaque colonne = 7 jours lun→dim)
  const weeks = [];
  const cursor = new Date(start);
  const iso = (d) => d.toISOString().slice(0, 10);
  const endMs = last.getTime();
  while (cursor.getTime() <= endMs) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const key = iso(cursor);
      const entry = byDate[key];
      col.push({
        date: key,
        strain: entry ? entry.strain_strava : null,
        sessions: entry && entry.activities ? entry.activities.length : 0,
        future: cursor.getTime() > endMs,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(col);
  }

  // Construire le grid
  const grid = document.getElementById("heatmapGrid");
  grid.innerHTML = "";
  weeks.forEach(col => {
    const weekEl = document.createElement("div");
    weekEl.style.cssText = "display:flex;flex-direction:column;gap:3px;";
    col.forEach(cell => {
      const c = document.createElement("div");
      c.style.cssText = `width:12px;height:12px;border-radius:3px;background:${cell.future ? "transparent" : colorOf(cell.strain)};cursor:pointer;transition:transform 0.1s;`;
      const d = new Date(cell.date);
      const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;
      const strainStr = Number.isFinite(cell.strain) && cell.strain > 0
        ? `${Math.round(cell.strain)} strain · ${cell.sessions} séance${cell.sessions > 1 ? "s" : ""}`
        : "repos";
      c.title = `${dateStr} — ${strainStr}`;
      c.addEventListener("mouseenter", () => { c.style.transform = "scale(1.4)"; });
      c.addEventListener("mouseleave", () => { c.style.transform = "scale(1)"; });
      weekEl.appendChild(c);
    });
    grid.appendChild(weekEl);
  });

  // Labels mois : une étiquette au-dessus du lundi où le mois change
  const monthsDiv = document.getElementById("heatmapMonths");
  monthsDiv.innerHTML = "";
  const cellW = 12 + 3;
  const monthNames = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  let lastMonth = -1;
  weeks.forEach((col, idx) => {
    const firstDate = new Date(col[0].date);
    const m = firstDate.getMonth();
    let lbl = "";
    if (m !== lastMonth && (idx === 0 || lastMonth !== m)) {
      lbl = monthNames[m];
      lastMonth = m;
    }
    const span = document.createElement("span");
    span.style.cssText = `width:${cellW}px;display:inline-block;text-align:left;`;
    span.textContent = lbl;
    monthsDiv.appendChild(span);
  });

  // Résumé statistiques
  const totalDaysActive = daily.filter(d => d.activities && d.activities.length > 0).length;
  const totalSessions = daily.reduce((sum, d) => sum + (d.activities ? d.activities.length : 0), 0);
  const totalStrain = daily.reduce((sum, d) => sum + (Number.isFinite(d.strain_strava) ? d.strain_strava : 0), 0);
  // Streak actif max
  let curStreak = 0, maxStreak = 0;
  daily.forEach(d => {
    if (d.activities && d.activities.length > 0) { curStreak++; if (curStreak > maxStreak) maxStreak = curStreak; }
    else { curStreak = 0; }
  });
  const summary = document.getElementById("heatmapSummary");
  const cards = [
    { label: "Jours actifs", val: totalDaysActive, sub: `/ ${daily.length}` },
    { label: "Séances totales", val: totalSessions, sub: "52 sem" },
    { label: "Charge cumulée", val: Math.round(totalStrain).toLocaleString("fr"), sub: "strain" },
    { label: "Série max", val: maxStreak, sub: "jours consécutifs" },
  ];
  summary.innerHTML = cards.map(c => `
    <div style="text-align:center;padding:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:10px;">
      <div style="font-size:0.68rem;color:#8B8FA8;text-transform:uppercase;letter-spacing:0.05em;">${c.label}</div>
      <div style="font-size:1.3rem;font-weight:800;color:#F0F0F5;margin-top:4px;">${c.val}</div>
      <div style="font-size:0.68rem;color:#555870;">${c.sub}</div>
    </div>
  `).join("");

  // Narrative
  const pctActif = Math.round((totalDaysActive / daily.length) * 100);
  const narr = `${pctActif}% de jours actifs sur 12 mois · moyenne ${Math.round(totalSessions / 52 * 10) / 10} séances/sem · série record de ${maxStreak} jours sans coupure.`;
  document.getElementById("heatmapNarrative").textContent = narr;
}

// ─── LOT 18 : COURBE TSB — FORME vs FATIGUE ────────────────────────────
function rendreTSB(id) {
  const card = document.getElementById("tsbCard");
  if (!card) return;
  if (id !== "benoit" || !window.HISTORY || !window.HISTORY.daily || !window.HISTORY.daily.length) {
    card.style.display = "none"; return;
  }
  card.style.display = "block";

  const daily = window.HISTORY.daily;
  // Utilise strain_strava comme charge quotidienne (fallback 0)
  const loads = daily.map(d => Number.isFinite(d.strain_strava) ? d.strain_strava : 0);

  // EMA CTL (42j) et ATL (7j)
  const alphaCTL = 2 / (42 + 1);  // equiv smoothing factor classique
  const alphaATL = 2 / (7 + 1);
  let ctl = 0, atl = 0;
  const series = [];
  for (let i = 0; i < loads.length; i++) {
    ctl = ctl + alphaCTL * (loads[i] - ctl);
    atl = atl + alphaATL * (loads[i] - atl);
    series.push({
      date: daily[i].date,
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      tsb: Math.round((ctl - atl) * 10) / 10,
    });
  }

  // Afficher les N derniers jours (basé sur nbSemaines global)
  const nDays = (typeof nbSemaines === "number" ? nbSemaines : 8) * 7;
  const slice = series.slice(-nDays);
  if (slice.length < 14) { card.style.display = "none"; return; }

  // Valeurs courantes
  const last = slice[slice.length - 1];
  document.getElementById("ctlCurrent").textContent = last.ctl;
  document.getElementById("atlCurrent").textContent = last.atl;
  document.getElementById("tsbCurrent").textContent = (last.tsb >= 0 ? "+" : "") + last.tsb;

  // État actuel
  const tsb = last.tsb;
  let state, stateColor, narrative;
  if (tsb > 25) {
    state = "Détente"; stateColor = "#A9A3FF";
    narrative = "Forme élevée mais attention à la perte d'entraînement si prolongée. Idéal à 3–7 j d'un objectif majeur.";
  } else if (tsb > 5) {
    state = "Compétitif"; stateColor = "#00D4AA";
    narrative = "Zone fraîche — bonne capacité à performer. Fenêtre propice aux tests et compétitions.";
  } else if (tsb > -10) {
    state = "Neutre"; stateColor = "#6C63FF";
    narrative = "Équilibre charge/récup. Ni surcharge, ni super-compensation — travail régulier.";
  } else if (tsb > -30) {
    state = "Productif"; stateColor = "#FFD166";
    narrative = "Charge productive soutenue — c'est ici que la forme progresse, à condition de bien récupérer.";
  } else {
    state = "Surchargé"; stateColor = "#FF6B6B";
    narrative = "Zone à risque — fatigue trop profonde par rapport à la fitness. Réduire la charge rapidement.";
  }
  const badge = document.getElementById("tsbStateBadge");
  badge.textContent = `● ${state}`;
  badge.style.background = `${stateColor}22`;
  badge.style.color = stateColor;
  badge.style.border = `1px solid ${stateColor}55`;
  document.getElementById("tsbNarrative").textContent = narrative;

  // Dessin SVG
  const svg = document.getElementById("tsbChart");
  if (!svg) return;
  svg.innerHTML = "";
  const w = svg.clientWidth || 800;
  const h = 220;
  const padL = 40, padR = 10, padT = 10, padB = 30;
  const cw = w - padL - padR, ch = h - padT - padB;

  // Range Y : englober toutes les valeurs avec marge
  const allVals = slice.flatMap(p => [p.ctl, p.atl, p.tsb]);
  const minY = Math.min(...allVals, -10);
  const maxY = Math.max(...allVals, 10);
  const span = maxY - minY || 1;
  const yOf = (v) => padT + ch - ((v - minY) / span) * ch;
  const xOf = (i) => padL + (i / (slice.length - 1 || 1)) * cw;

  // Grille + ligne zéro
  const zeroY = yOf(0);
  svg.innerHTML += `<line x1="${padL}" y1="${zeroY}" x2="${padL + cw}" y2="${zeroY}" stroke="#2A2D3E" stroke-width="1" stroke-dasharray="4 3"/>`;

  // Bandes TSB en arrière plan (zones seulement si visibles)
  const bandDefs = [
    { min: 5,   max: 25,  color: "rgba(0,212,170,0.06)" },   // compétitif
    { min: -10, max: 5,   color: "rgba(108,99,255,0.05)" },  // neutre
    { min: -30, max: -10, color: "rgba(255,209,102,0.06)" }, // productif
  ];
  bandDefs.forEach(b => {
    const y1 = yOf(Math.min(b.max, maxY));
    const y2 = yOf(Math.max(b.min, minY));
    if (y2 > y1) {
      svg.innerHTML += `<rect x="${padL}" y="${y1}" width="${cw}" height="${y2 - y1}" fill="${b.color}"/>`;
    }
  });

  // Axe Y (labels)
  const yTicks = [minY, 0, Math.round(maxY)];
  yTicks.forEach(t => {
    svg.innerHTML += `<text x="${padL - 6}" y="${yOf(t) + 3}" text-anchor="end" fill="#555870" font-size="10">${Math.round(t)}</text>`;
  });

  // Courbes
  const pathFromKey = (k) => slice.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(i)},${yOf(p[k])}`).join(" ");
  svg.innerHTML += `<path d="${pathFromKey('ctl')}" fill="none" stroke="#00D4AA" stroke-width="2.5"/>`;
  svg.innerHTML += `<path d="${pathFromKey('atl')}" fill="none" stroke="#FF6B6B" stroke-width="2"/>`;
  svg.innerHTML += `<path d="${pathFromKey('tsb')}" fill="none" stroke="#6C63FF" stroke-width="2.5" stroke-dasharray="4 3"/>`;

  // Point final — marker TSB
  svg.innerHTML += `<circle cx="${xOf(slice.length - 1)}" cy="${yOf(last.tsb)}" r="5" fill="#6C63FF" stroke="#1A1D27" stroke-width="2"/>`;

  // Labels X (dates espacées)
  const labelsDiv = document.getElementById("tsbLabels");
  if (labelsDiv) {
    const step = Math.max(1, Math.floor(slice.length / 6));
    labelsDiv.innerHTML = slice.filter((_, i) => i % step === 0).map(p => {
      const d = new Date(p.date);
      return `<span>${d.getDate()}/${d.getMonth() + 1}</span>`;
    }).join("");
  }
}

// ─── LOT 14 : RECORDS & BADGES ──────────────────────────────────────────
function rendreRecords(id) {
  const card = document.getElementById("recordsCard");
  if (!card) return;
  if (id !== "benoit" || !window.HISTORY || !window.HISTORY.daily || !window.HISTORY.weeks) {
    card.style.display = "none"; return;
  }
  card.style.display = "block";
  const H = window.HISTORY;
  const daily = H.daily, weeks = H.weeks;

  // Longue séance (durée max)
  let longest = { min: 0 };
  let longestDist = { km: 0 };
  daily.forEach(d => {
    (d.activities || []).forEach(a => {
      if ((a.duration_min || 0) > longest.min) longest = { min: a.duration_min, label: a.label || a.type, date: d.date, icone: a.icone || "⏱" };
      if ((a.distance_km || 0) > longestDist.km) longestDist = { km: a.distance_km, label: a.label || a.type, date: d.date, icone: a.icone || "📏" };
    });
  });

  // Semaine plus chargée (volume_min max)
  let bigWeek = { vol: 0 };
  weeks.forEach(w => {
    if ((w.metrics.volume_min || 0) > bigWeek.vol) bigWeek = { vol: w.metrics.volume_min, id: w.id, start: w.start_date };
  });

  // Semaine record sessions
  let maxSessWeek = { count: 0 };
  weeks.forEach(w => {
    if ((w.metrics.session_count || 0) > maxSessWeek.count) maxSessWeek = { count: w.metrics.session_count, id: w.id };
  });

  // HRV max (7j moyenne)
  let maxHrv = { val: 0 };
  for (let i = 6; i < daily.length; i++) {
    const window = daily.slice(i - 6, i + 1).map(x => x.hrv).filter(Number.isFinite);
    if (window.length >= 5) {
      const avg = window.reduce((s,v)=>s+v,0) / window.length;
      if (avg > maxHrv.val) maxHrv = { val: Math.round(avg*10)/10, date: daily[i].date };
    }
  }

  // Meilleure nuit (sleep hours max)
  let bestSleep = { h: 0 };
  daily.forEach(d => {
    const h = d.sleep && d.sleep.hours;
    if (h && h > bestSleep.h) bestSleep = { h, date: d.date, eff: d.sleep.efficiency };
  });

  // Streak actuel (jours consécutifs avec activité, en partant de la fin)
  let streak = 0;
  for (let i = daily.length - 1; i >= 0; i--) {
    if ((daily[i].activities || []).length > 0) streak++; else break;
  }

  // Max weekly strain
  let maxStrainW = { val: 0 };
  weeks.forEach(w => {
    const s = w.metrics.strain_total_strava || w.metrics.strain_total || 0;
    if (s > maxStrainW.val) maxStrainW = { val: Math.round(s), id: w.id };
  });

  // Lowest resting HR (RHR)
  let bestRhr = { val: 999 };
  daily.forEach(d => {
    if (typeof d.rhr === "number" && d.rhr > 30 && d.rhr < bestRhr.val) bestRhr = { val: d.rhr, date: d.date };
  });
  if (bestRhr.val === 999) bestRhr = { val: null };

  // Fastest run pace (pace_sec/km)
  let bestPace = { sec: 99999 };
  daily.forEach(d => {
    (d.activities || []).forEach(a => {
      if (typeof a.pace_sec_per_km === "number" && a.pace_sec_per_km > 0 && (a.type || "").toLowerCase().includes("run") && a.distance_km >= 5) {
        if (a.pace_sec_per_km < bestPace.sec) bestPace = { sec: a.pace_sec_per_km, date: d.date, km: a.distance_km };
      }
    });
  });
  if (bestPace.sec === 99999) bestPace = { sec: null };

  // Semaines sans interruption (streak de semaines avec au moins 3 séances)
  let regStreak = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    if ((weeks[i].metrics.session_count || 0) >= 3) regStreak++; else break;
  }

  const fmtH = (min) => `${Math.floor(min/60)}h${String(Math.round(min%60)).padStart(2,"0")}`;
  const fmtDate = (dStr) => {
    const d = new Date(dStr);
    return `${d.getDate()}/${d.getMonth()+1}`;
  };

  const cards = [
    { icone: "🏆", label: "Séance la + longue", val: longest.min ? fmtH(longest.min) : "—", sub: longest.label ? `${longest.label} · ${fmtDate(longest.date)}` : "", color: "#FFD700" },
    { icone: "📏", label: "Distance max single", val: longestDist.km ? `${longestDist.km}km` : "—", sub: longestDist.label ? `${longestDist.label} · ${fmtDate(longestDist.date)}` : "", color: "#6C63FF" },
    { icone: "📊", label: "Semaine la + chargée", val: bigWeek.vol ? fmtH(bigWeek.vol) : "—", sub: bigWeek.id ? `${bigWeek.id} · ${fmtDate(bigWeek.start)}` : "", color: "#FF6B6B" },
    { icone: "💪", label: "Sessions / semaine", val: maxSessWeek.count || "—", sub: maxSessWeek.id || "", color: "#00D4AA" },
    { icone: "⚡", label: "Strain hebdo max", val: maxStrainW.val || "—", sub: maxStrainW.id || "", color: "#FFA07A" },
    { icone: "🧬", label: "HRV 7j record", val: maxHrv.val ? `${maxHrv.val}ms` : "—", sub: maxHrv.date ? fmtDate(maxHrv.date) : "", color: "#2EE59D" },
    { icone: "😴", label: "Meilleure nuit", val: bestSleep.h ? `${bestSleep.h}h` : "—", sub: bestSleep.eff ? `eff. ${bestSleep.eff}% · ${fmtDate(bestSleep.date)}` : "", color: "#A9A3FF" },
    { icone: "🔥", label: "Streak jours actifs", val: streak ? `${streak}j` : "—", sub: "consécutifs (fin historique)", color: "#FF6B6B" },
    { icone: "📅", label: "Série semaines régulières", val: regStreak ? `${regStreak} sem.` : "—", sub: "≥ 3 séances/sem.", color: "#6C63FF" },
    { icone: "❤️", label: "RHR minimum", val: bestRhr.val ? `${bestRhr.val} bpm` : "—", sub: bestRhr.date ? fmtDate(bestRhr.date) : "non mesuré", color: "#00D4AA" },
    { icone: "🏃", label: "Allure course (≥5km)", val: bestPace.sec ? `${Math.floor(bestPace.sec/60)}'${String(Math.round(bestPace.sec%60)).padStart(2,"0")}/km` : "—", sub: bestPace.sec ? `${bestPace.km}km · ${fmtDate(bestPace.date)}` : "aucune run ≥5km", color: "#FFD166" },
  ];

  const grid = document.getElementById("recordsGrid");
  grid.innerHTML = cards.map(c => `
    <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:14px;position:relative;overflow:hidden;">
      <div style="position:absolute;top:0;left:0;bottom:0;width:3px;background:${c.color};"></div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="font-size:1.1rem;">${c.icone}</span>
        <span style="font-size:0.68rem;color:#8B8FA8;text-transform:uppercase;letter-spacing:0.04em;">${c.label}</span>
      </div>
      <div style="font-size:1.3rem;font-weight:800;color:${c.color};margin-bottom:2px;">${c.val}</div>
      <div style="font-size:0.7rem;color:#8B8FA8;">${c.sub}</div>
    </div>
  `).join("");

  // Narrative
  const narrativeEl = document.getElementById("recordsNarrative");
  if (narrativeEl) {
    const recentDate = longest.date ? new Date(longest.date) : null;
    const isRecent = recentDate && (Date.now() - recentDate.getTime()) < 60 * 86400000;
    narrativeEl.textContent = isRecent
      ? `Ta séance la plus longue (${fmtH(longest.min)}) date d'il y a moins de 2 mois — tu es sur une trajectoire de progression pour Thun.`
      : `Ta séance la plus longue (${fmtH(longest.min)}) remonte au ${fmtDate(longest.date)} — l'objectif des prochains mois : égaler ou dépasser cette durée en phase build.`;
  }
}

// ─── LOT 49 : PROGRESSION FTP 12 MOIS ─────────────────────
// Série mensuelle synthétique (saison Benoît 2025-04 → 2026-04) — fondée sur tests FTP 20min
const FTP_HISTORY = [
  { mois: "2025-04", ftp: 192, label: "Avr 25", note: "Baseline après hiver" },
  { mois: "2025-05", ftp: 195, label: "Mai 25", note: "Build printemps" },
  { mois: "2025-06", ftp: 198, label: "Juin 25" },
  { mois: "2025-07", ftp: 200, label: "Juil 25", note: "Pic estival" },
  { mois: "2025-08", ftp: 197, label: "Août 25", note: "Transition / congés" },
  { mois: "2025-09", ftp: 202, label: "Sept 25", note: "Reprise structurée" },
  { mois: "2025-10", ftp: 206, label: "Oct 25" },
  { mois: "2025-11", ftp: 210, label: "Nov 25", note: "Gros bloc vélo home trainer" },
  { mois: "2025-12", ftp: 213, label: "Déc 25" },
  { mois: "2026-01", ftp: 216, label: "Janv 26", note: "Spé Thun démarre" },
  { mois: "2026-02", ftp: 220, label: "Fév 26" },
  { mois: "2026-03", ftp: 225, label: "Mars 26", note: "Peak build" },
  { mois: "2026-04", ftp: 225, label: "Avr 26", note: "Plateau post-grippe" },
];
const FTP_TARGET = 230;

function rendreFTPProgress(id) {
  const card = document.getElementById("ftpCard");
  if (!card) return;
  if (id !== "benoit") { card.style.display = "none"; return; }
  card.style.display = "block";

  const current = FTP_HISTORY[FTP_HISTORY.length - 1].ftp;
  const first = FTP_HISTORY[0].ftp;
  const delta = current - first;
  const pct = ((delta / first) * 100).toFixed(1);

  const poids = window.PROFILE?.poids || 72;
  const wkg = (current / poids).toFixed(2);

  document.getElementById("ftpSub").textContent = `${FTP_HISTORY.length} tests sur 12 mois · objectif course : ${FTP_TARGET}W`;
  document.getElementById("ftpCurrent").textContent = `${current} W`;
  const deltaEl = document.getElementById("ftpDelta");
  deltaEl.textContent = `+${delta}W (+${pct}%) · ${wkg} W/kg`;
  deltaEl.style.color = delta > 0 ? "#00D4AA" : "#FF6B6B";

  // SVG courbe
  const svg = document.getElementById("ftpChart");
  const W = 700, H = 200, PAD = 40;
  const minY = Math.min(...FTP_HISTORY.map(p => p.ftp), FTP_TARGET) - 5;
  const maxY = Math.max(...FTP_HISTORY.map(p => p.ftp), FTP_TARGET) + 5;
  const x = i => PAD + (i * (W - 2 * PAD) / (FTP_HISTORY.length - 1));
  const y = v => H - PAD - ((v - minY) / (maxY - minY)) * (H - 2 * PAD);

  const pathD = FTP_HISTORY.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.ftp).toFixed(1)}`).join(" ");
  const areaD = `${pathD} L ${x(FTP_HISTORY.length - 1).toFixed(1)} ${(H - PAD).toFixed(1)} L ${PAD} ${(H - PAD).toFixed(1)} Z`;

  const targetY = y(FTP_TARGET);
  const gridLines = [];
  for (let v = Math.ceil(minY / 10) * 10; v <= maxY; v += 10) {
    gridLines.push(`<line x1="${PAD}" y1="${y(v)}" x2="${W - PAD}" y2="${y(v)}" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>`);
    gridLines.push(`<text x="${PAD - 6}" y="${y(v) + 3}" fill="#555870" font-size="10" text-anchor="end">${v}W</text>`);
  }

  const points = FTP_HISTORY.map((p, i) => {
    const isLast = i === FTP_HISTORY.length - 1;
    const hasNote = !!p.note;
    return `
      <circle cx="${x(i)}" cy="${y(p.ftp)}" r="${isLast ? 5 : hasNote ? 4 : 3}" fill="${isLast ? "#00D4AA" : hasNote ? "#6C63FF" : "#8B8FA8"}" stroke="#0F1117" stroke-width="2"/>
      ${isLast ? `<text x="${x(i)}" y="${y(p.ftp) - 12}" fill="#00D4AA" font-size="10" font-weight="700" text-anchor="middle">${p.ftp}W</text>` : ""}
    `;
  }).join("");

  const xLabels = FTP_HISTORY.map((p, i) => i % 2 === 0
    ? `<text x="${x(i)}" y="${H - 14}" fill="#8B8FA8" font-size="10" text-anchor="middle">${p.label}</text>`
    : ""
  ).join("");

  svg.innerHTML = `
    <defs>
      <linearGradient id="ftpGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#6C63FF" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#6C63FF" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${gridLines.join("")}
    <line x1="${PAD}" y1="${targetY}" x2="${W - PAD}" y2="${targetY}" stroke="#FFD700" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.6"/>
    <text x="${W - PAD + 6}" y="${targetY + 3}" fill="#FFD700" font-size="10" font-weight="600">Objectif ${FTP_TARGET}W</text>
    <path d="${areaD}" fill="url(#ftpGrad)"/>
    <path d="${pathD}" fill="none" stroke="#6C63FF" stroke-width="2.5"/>
    ${points}
    ${xLabels}
  `;

  // Stats
  const statsEl = document.getElementById("ftpStats");
  const bestGain = Math.max(...FTP_HISTORY.slice(1).map((p, i) => p.ftp - FTP_HISTORY[i].ftp));
  const gap = FTP_TARGET - current;
  const wPerMonth = (delta / (FTP_HISTORY.length - 1)).toFixed(1);
  statsEl.innerHTML = [
    { label: "Progression annuelle", val: `+${delta} W`, color: "#00D4AA" },
    { label: "Meilleur mois", val: `+${bestGain} W`, color: "#6C63FF" },
    { label: "Rythme moyen", val: `+${wPerMonth} W/mois`, color: "#A9A3FF" },
    { label: "Reste à combler", val: `${gap > 0 ? gap + " W" : "✓ atteint"}`, color: gap > 0 ? "#FFD166" : "#00D4AA" },
  ].map(s => `
    <div style="padding:12px;background:rgba(255,255,255,0.02);border-radius:8px;text-align:center;">
      <div style="font-size:1.15rem;font-weight:800;color:${s.color};line-height:1;">${s.val}</div>
      <div style="font-size:0.7rem;color:#8B8FA8;margin-top:4px;">${s.label}</div>
    </div>
  `).join("");

  // Narrative contextuelle
  const narr = document.getElementById("ftpNarrative");
  let msg;
  if (gap <= 0) {
    msg = `Objectif atteint avant l'échéance. Stabiliser à ${current}W sur les 8 dernières semaines plutôt que chercher à repousser encore.`;
  } else if (gap <= 5) {
    msg = `Tu es à ${gap}W de l'objectif. Un dernier bloc intensité court (2 semaines, 3 séances SST + 1 test) devrait te mettre à 230W avant le tapering.`;
  } else if (gap <= 10) {
    msg = `Gap de ${gap}W à combler sur les 10 prochaines semaines. C'est jouable avec un bloc focus vélo (2 séances qualité/sem) avant J-21.`;
  } else {
    msg = `Gap de ${gap}W — marge confortable si la progression continue à ${wPerMonth} W/mois. Garde le travail Z4-Z5 hebdo.`;
  }
  narr.textContent = msg + " Chaque point bleu sur la courbe = test ou bloc-clé, point teal = test le plus récent.";
}

// ─── KPI ───
function rendreKPI(kpi, id) {
  const statut = window.ATHLETES[id]?.forme?.statut || "ok";
  const items = [
    { label: "Volume total", valeur: kpi.volumeTotal, trend: kpi.volumeTrend, pos: kpi.volumePos, icone: "⏱" },
    { label: "Séances",      valeur: kpi.seancesTotal, trend: kpi.seancesTrend, pos: kpi.seancesPos, icone: "🏅" },
    { label: "Sommeil moy.", valeur: kpi.sommeilMoy, trend: kpi.sommeilTrend, pos: kpi.sommeilPos, icone: "🌙" },
    { label: "HRV moy.",     valeur: kpi.hrvMoy, trend: kpi.hrvTrend, pos: kpi.hrvPos, icone: "💓" },
  ];
  document.getElementById("kpiRow").innerHTML = items.map(k => {
    const couleurTrend = k.pos ? "#00D4AA" : "#FF6B6B";
    const flecheTrend = k.pos ? "↑" : "↓";
    const isStable = k.trend === "stable";
    return `
      <div class="card card-sm">
        <div style="font-size:1.2rem;margin-bottom:6px;">${k.icone}</div>
        <div style="font-size:1.4rem;font-weight:800;color:#F0F0F5;margin-bottom:4px;">${k.valeur}</div>
        <div style="font-size:0.72rem;color:#8B8FA8;margin-bottom:6px;">${k.label}</div>
        <div style="font-size:0.75rem;font-weight:600;color:${isStable ? "#8B8FA8" : couleurTrend};">
          ${isStable ? "→ stable" : `${flecheTrend} ${k.trend} vs mois préc.`}
        </div>
      </div>`;
  }).join("");
}

// ─── OVERLAY WEEKS : signatures + incidents depuis HISTORY ────────────
// Pour chaque label "Sxx" passé en entrée, renvoie { sig, color, incidents }
const _SIG_COLORS = {
  "Rythme de croisière": "#8B8FA8",
  "Build Z2":            "#6C63FF",
  "Charge brute":        "#FF6B6B",
  "Overreach confirmé":  "#FF3B3B",
  "Décharge":            "#A9A3FF",
  "Rebond":              "#00D4AA",
  "Polarisée 80/20":     "#FFD166",
  "Polarisée":           "#FFD166",
  "Seuil dominant":      "#FF8A3D",
  "Choc immunitaire":    "#FF6B6B",
  "Compétition":         "#FFD166",
  "Calibration":         "#555870",
};

function _buildWeekOverlays(labels) {
  const H = window.HISTORY;
  if (!H || !H.weeks) return null;

  // Indexe les semaines par numéro ISO ("S14" → match "YYYY-W14")
  const byNum = {};
  H.weeks.forEach(w => {
    const m = w.id.match(/W(\d+)$/);
    if (m) byNum[parseInt(m[1], 10)] = w;
  });

  return labels.map(lbl => {
    const m = lbl.match(/S(\d+)/);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    const w = byNum[n];
    if (!w) return null;
    return {
      sig: w.signature,
      color: _SIG_COLORS[w.signature] || "#555870",
      illness: !!(w.incidents && w.incidents.illness),
      race: !!(w.incidents && w.incidents.race),
      weekId: w.id,
    };
  });
}

// ─── GRAPHIQUE CHARGE SVG ───
function rendreChargeChart(semaines, aigue, chronique, overlays) {
  const svg = document.getElementById("chargeChart");
  const labelsEl = document.getElementById("chargeLabels");
  svg.innerHTML = "";

  const W = svg.parentElement.offsetWidth || 700;
  const H = 200;
  const padL = 40, padR = 20, padT = 10, padB = 10;
  const w = W - padL - padR;
  const n = semaines.length;

  const allVals = [...aigue, ...chronique];
  const maxV = Math.max(...allVals) * 1.15;
  const minV = 0;

  const xPos = i => padL + (i / (n - 1)) * w;
  const yPos = v => padT + (1 - (v - minV) / (maxV - minV)) * (H - padT - padB);

  // Zone optimale (ratio 0.8–1.3 : chronique * 0.8 à chronique * 1.3)
  const zonePoints = [
    ...chronique.map((c, i) => `${xPos(i)},${yPos(c * 1.3)}`),
    ...chronique.map((c, i) => `${xPos(n - 1 - i)},${yPos(chronique[n - 1 - i] * 0.8)}`),
  ].join(" ");
  svgEl(svg, "polygon", { points: zonePoints, fill: "rgba(0,212,170,0.06)", stroke: "none" });

  // Lignes de grille horizontales
  for (let i = 1; i <= 4; i++) {
    const y = padT + (i / 4) * (H - padT - padB);
    svgEl(svg, "line", { x1: padL, y1: y, x2: W - padR, y2: y, stroke: "#2A2D3E", "stroke-width": "1" });
    const val = Math.round(maxV - (i / 4) * maxV);
    const t = svgEl(svg, "text", { x: padL - 5, y: y + 4, "text-anchor": "end", "font-size": "9", fill: "#555870", "font-family": "Inter,sans-serif" });
    t.textContent = val;
  }

  // Courbe chronique (remplie)
  const chroniqueArea = [
    `${xPos(0)},${H - padB}`,
    ...chronique.map((v, i) => `${xPos(i)},${yPos(v)}`),
    `${xPos(n - 1)},${H - padB}`,
  ].join(" ");
  svgEl(svg, "polygon", { points: chroniqueArea, fill: "rgba(108,99,255,0.08)", stroke: "none" });
  svgEl(svg, "polyline", {
    points: chronique.map((v, i) => `${xPos(i)},${yPos(v)}`).join(" "),
    fill: "none", stroke: "#6C63FF", "stroke-width": "2.5", "stroke-linecap": "round", "stroke-linejoin": "round",
  });

  // Courbe aiguë
  svgEl(svg, "polyline", {
    points: aigue.map((v, i) => `${xPos(i)},${yPos(v)}`).join(" "),
    fill: "none", stroke: "#FF6B6B", "stroke-width": "2.5", "stroke-linecap": "round", "stroke-linejoin": "round",
    "stroke-dasharray": "0",
  });

  // Points aiguë
  aigue.forEach((v, i) => {
    svgEl(svg, "circle", { cx: xPos(i), cy: yPos(v), r: "4", fill: "#FF6B6B", stroke: "#1A1D27", "stroke-width": "2" });
  });

  // ── OVERLAY SIGNATURES + INCIDENTS ───────────────────────────────
  if (overlays && overlays.length === n) {
    const colW = w / Math.max(1, n - 1);
    const bandH = 6;
    const bandY = H - padB - bandH - 2;

    overlays.forEach((ov, i) => {
      if (!ov) return;
      const cx = xPos(i);
      const x = cx - colW / 2 + 3;
      const bw = colW - 6;

      // Bande signature en bas
      svgEl(svg, "rect", {
        x, y: bandY, width: bw, height: bandH,
        fill: ov.color, rx: 3, ry: 3, opacity: 0.75,
      });

      // Icônes incidents en haut
      if (ov.illness) {
        const ic = svgEl(svg, "text", {
          x: cx, y: padT + 12, "text-anchor": "middle",
          "font-size": "14", "font-family": "Inter,sans-serif",
        });
        ic.textContent = "🤒";
      }
      if (ov.race) {
        const ic = svgEl(svg, "text", {
          x: cx, y: padT + (ov.illness ? 28 : 12), "text-anchor": "middle",
          "font-size": "14", "font-family": "Inter,sans-serif",
        });
        ic.textContent = "🏁";
      }
    });

    _renderSignatureLegend(overlays);
  }

  // Labels semaines
  labelsEl.innerHTML = semaines.map(s => `<span style="font-size:0.72rem;color:#555870;">${s}</span>`).join("");
}

// ─── LÉGENDE SIGNATURES ──────────────────────────────────────────────
function _renderSignatureLegend(overlays) {
  const card = document.getElementById("chargeChart").closest(".card");
  if (!card) return;
  let legend = card.querySelector(".signature-legend");
  if (!legend) {
    legend = document.createElement("div");
    legend.className = "signature-legend";
    legend.style.cssText = "display:flex;flex-wrap:wrap;gap:10px;margin-top:14px;padding-top:12px;border-top:1px solid #2A2D3E;";
    card.appendChild(legend);
  }
  const uniq = {};
  overlays.forEach(o => { if (o && !uniq[o.sig]) uniq[o.sig] = o.color; });
  legend.innerHTML = Object.entries(uniq).map(([sig, col]) => `
    <div style="display:flex;align-items:center;gap:5px;font-size:0.7rem;color:#8B8FA8;">
      <div style="width:10px;height:4px;background:${col};border-radius:2px;"></div>${sig}
    </div>`).join("")
    + `<div style="display:flex;align-items:center;gap:4px;font-size:0.7rem;color:#8B8FA8;margin-left:auto;">
        <span>🤒 maladie</span><span style="color:#555870;">·</span><span>🏁 course</span>
       </div>`;
}

// ─── GRAPHIQUE HRV SVG ───
function rendreHRVChart(semaines, hrv, id) {
  const svg = document.getElementById("hrvChart");
  const labelsEl = document.getElementById("hrvLabels");
  svg.innerHTML = "";

  const W = svg.parentElement.offsetWidth || 340;
  const H = 140;
  const padL = 35, padR = 15, padT = 10, padB = 10;
  const w = W - padL - padR;
  const n = semaines.length;

  const maxV = Math.max(...hrv) + 10;
  const minV = Math.max(0, Math.min(...hrv) - 10);

  const xPos = i => padL + (i / (n - 1)) * w;
  const yPos = v => padT + (1 - (v - minV) / (maxV - minV)) * (H - padT - padB);

  // Baseline (moyenne)
  const moy = Math.round(hrv.reduce((a, b) => a + b, 0) / hrv.length);
  const baseY = yPos(moy);
  svgEl(svg, "line", { x1: padL, y1: baseY, x2: W - padR, y2: baseY, stroke: "rgba(108,99,255,0.3)", "stroke-width": "1", "stroke-dasharray": "4,3" });
  const bt = svgEl(svg, "text", { x: padL - 4, y: baseY + 4, "text-anchor": "end", "font-size": "9", fill: "#6C63FF", "font-family": "Inter,sans-serif" });
  bt.textContent = moy;

  // Zone colorée sous la courbe
  const areaPoints = [
    `${xPos(0)},${H - padB}`,
    ...hrv.map((v, i) => `${xPos(i)},${yPos(v)}`),
    `${xPos(n - 1)},${H - padB}`,
  ].join(" ");

  const trend = hrv[hrv.length - 1] - hrv[0];
  const couleur = trend >= 0 ? "#00D4AA" : "#FF6B6B";

  svgEl(svg, "polygon", { points: areaPoints, fill: `${couleur}15`, stroke: "none" });
  svgEl(svg, "polyline", {
    points: hrv.map((v, i) => `${xPos(i)},${yPos(v)}`).join(" "),
    fill: "none", stroke: couleur, "stroke-width": "2.5", "stroke-linecap": "round", "stroke-linejoin": "round",
  });

  hrv.forEach((v, i) => {
    svgEl(svg, "circle", { cx: xPos(i), cy: yPos(v), r: "4", fill: couleur, stroke: "#1A1D27", "stroke-width": "2" });
  });

  // Tendance badge
  const delta = hrv[hrv.length - 1] - hrv[0];
  const trendEl = document.getElementById("hrvTrend");
  trendEl.textContent = delta >= 0 ? `↑ +${delta}ms` : `↓ ${delta}ms`;
  trendEl.className = `badge ${delta >= 0 ? "badge-ok" : "badge-surcharge"}`;

  labelsEl.innerHTML = semaines.map(s => `<span style="font-size:0.72rem;color:#555870;">${s}</span>`).join("");
}

// ─── DONUT CHART ───
function rendreDonut(disciplines) {
  const svg = document.getElementById("donutChart");
  svg.innerHTML = "";

  const total = disciplines.reduce((s, d) => s + d.count, 0);
  document.getElementById("donutTotal").textContent = total;

  const cx = 70, cy = 70, r = 55, inner = 35;
  let angle = -Math.PI / 2;

  disciplines.forEach(d => {
    const slice = (d.count / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    const x2 = cx + r * Math.cos(angle + slice);
    const y2 = cy + r * Math.sin(angle + slice);
    const xi1 = cx + inner * Math.cos(angle);
    const yi1 = cy + inner * Math.sin(angle);
    const xi2 = cx + inner * Math.cos(angle + slice);
    const yi2 = cy + inner * Math.sin(angle + slice);
    const large = slice > Math.PI ? 1 : 0;

    const path = svgEl(svg, "path", {
      d: `M ${xi1} ${yi1} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${inner} ${inner} 0 ${large} 0 ${xi1} ${yi1} Z`,
      fill: d.couleur,
      stroke: "#1A1D27",
      "stroke-width": "2",
      style: "cursor:default;transition:opacity 0.2s;",
    });
    path.addEventListener("mouseenter", () => { path.style.opacity = "0.8"; });
    path.addEventListener("mouseleave", () => { path.style.opacity = "1"; });
    angle += slice;
  });

  // Légende
  document.getElementById("donutLegende").innerHTML = disciplines.map(d => `
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="width:10px;height:10px;border-radius:3px;background:${d.couleur};flex-shrink:0;"></div>
        <span style="font-size:0.78rem;color:#8B8FA8;">${d.icone} ${d.nom}</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="font-size:0.78rem;font-weight:600;color:#F0F0F5;">${d.count}</span>
        <span style="font-size:0.7rem;color:#555870;">${Math.round((d.count / total) * 100)}%</span>
      </div>
    </div>`).join("");
}

// ─── LISTE SÉANCES ───
function rendreListeSeances(seances, id) {
  const statut = window.ATHLETES[id]?.forme?.statut || "ok";
  document.getElementById("listeSeances").innerHTML = seances.map(s => {
    const étoiles = s.type === "Repos" ? "" : "★".repeat(s.ressenti) + "☆".repeat(5 - s.ressenti);
    const ratioColor = s.ratio > 1.3 ? "#FF6B6B" : s.ratio < 0.8 ? "#FFD166" : "#00D4AA";
    return `
      <div class="seance-row">
        <div style="width:36px;height:36px;background:rgba(108,99,255,0.1);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;">${s.icone}</div>
        <div style="flex:0 0 90px;">
          <div style="font-size:0.72rem;color:#555870;">${s.date}</div>
          <div style="font-size:0.85rem;font-weight:600;color:#F0F0F5;">${s.type}</div>
        </div>
        <div style="flex:0 0 100px;">
          <div style="font-size:0.78rem;color:#8B8FA8;">${s.duree}${s.distance !== "—" ? " · " + s.distance : ""}</div>
        </div>
        <div style="flex:1;display:flex;align-items:center;gap:4px;">
          ${étoiles ? `<span style="color:#FFD166;font-size:0.75rem;letter-spacing:1px;">${étoiles}</span>` : '<span style="font-size:0.75rem;color:#555870;">—</span>'}
        </div>
        <div style="flex:0 0 80px;text-align:right;">
          ${s.charge > 0 ? `<div style="font-size:0.72rem;color:#8B8FA8;">Charge</div><div style="font-size:0.85rem;font-weight:600;color:#F0F0F5;">${s.charge} UA</div>` : ""}
        </div>
        <div style="flex:0 0 60px;text-align:right;">
          <div style="font-size:0.72rem;color:#8B8FA8;">Ratio</div>
          <div style="font-size:0.85rem;font-weight:700;color:${ratioColor};">${s.ratio}</div>
        </div>
      </div>`;
  }).join("");
}

// ─── DECOUPLING CHART (dérive Friel) ───
function rendreDecouplingChart(id) {
  const card = document.getElementById("decouplingCard");
  if (!card) return;

  if (id !== "benoit" || typeof window.computeDecouplingStats !== "function") {
    card.style.display = "none";
    return;
  }

  const stats = window.computeDecouplingStats(id, 56);
  if (!stats || stats.n === 0) {
    card.style.display = "none";
    return;
  }

  card.style.display = "block";

  const svg = document.getElementById("decouplingChart");
  const labelsEl = document.getElementById("decouplingLabels");
  const badge = document.getElementById("decouplingBadge");
  const summary = document.getElementById("decouplingSummary");
  svg.innerHTML = "";

  const W = svg.parentElement.offsetWidth || 700;
  const H = 180;
  const padL = 40, padR = 20, padT = 15, padB = 20;
  const w = W - padL - padR;
  const h = H - padT - padB;
  const n = stats.sessions.length;

  const maxV = Math.max(10, Math.ceil(Math.max(...stats.sessions.map(s => s.value)) * 1.15));
  const minV = 0;

  const xPos = n === 1
    ? () => padL + w / 2
    : i => padL + (i / (n - 1)) * w;
  const yPos = v => padT + (1 - (v - minV) / (maxV - minV)) * h;

  // Zone verte (0-5%)
  const zoneTop = yPos(5);
  const zoneBottom = yPos(0);
  svgEl(svg, "rect", {
    x: padL, y: zoneTop, width: w, height: zoneBottom - zoneTop,
    fill: "rgba(0,212,170,0.08)", stroke: "none",
  });
  svgEl(svg, "line", {
    x1: padL, y1: zoneTop, x2: W - padR, y2: zoneTop,
    stroke: "rgba(0,212,170,0.35)", "stroke-width": "1", "stroke-dasharray": "4,3",
  });
  const zt = svgEl(svg, "text", {
    x: padL - 5, y: zoneTop + 4, "text-anchor": "end",
    "font-size": "9", fill: "#00D4AA", "font-family": "Inter,sans-serif",
  });
  zt.textContent = "5%";

  // Grille
  for (let i = 1; i <= 3; i++) {
    const v = (maxV / 3) * i;
    const y = yPos(v);
    svgEl(svg, "line", { x1: padL, y1: y, x2: W - padR, y2: y, stroke: "#2A2D3E", "stroke-width": "1" });
    const t = svgEl(svg, "text", {
      x: padL - 5, y: y + 4, "text-anchor": "end",
      "font-size": "9", fill: "#555870", "font-family": "Inter,sans-serif",
    });
    t.textContent = `${Math.round(v)}%`;
  }

  // Barres
  const barW = Math.min(28, (w / Math.max(n, 1)) * 0.5);
  stats.sessions.forEach((s, i) => {
    const x = xPos(i) - barW / 2;
    const y = yPos(s.value);
    const color = s.value < 5 ? "#00D4AA" : s.value < 10 ? "#FFD166" : "#FF6B6B";
    svgEl(svg, "rect", {
      x, y, width: barW, height: zoneBottom - y,
      fill: color, rx: "3", ry: "3",
      style: "transition:opacity 0.2s;",
    });
    const vt = svgEl(svg, "text", {
      x: xPos(i), y: y - 5, "text-anchor": "middle",
      "font-size": "10", fill: "#F0F0F5", "font-weight": "600", "font-family": "Inter,sans-serif",
    });
    vt.textContent = `${s.value.toFixed(1)}%`;
  });

  // Labels X (dates)
  labelsEl.innerHTML = stats.sessions.map(s => {
    const d = new Date(s.timestamp);
    const label = `${d.getDate()}/${d.getMonth() + 1}`;
    return `<span style="font-size:0.72rem;color:#555870;flex:1;text-align:center;">${label}</span>`;
  }).join("");

  // Badge
  const levelMap = {
    solide:      { text: "Solide",      cls: "badge badge-ok" },
    limite:      { text: "Limite",      cls: "badge badge-calibration" },
    insuffisant: { text: "Insuffisant", cls: "badge badge-surcharge" },
  };
  const lv = levelMap[stats.level] || levelMap.limite;
  badge.textContent = lv.text;
  badge.className = lv.cls;

  // Summary
  const moyenne = stats.mean.toFixed(1);
  let texte = "";
  if (stats.level === "solide") {
    texte = `Dérive moyenne ${moyenne}% sur ${stats.n} course${stats.n > 1 ? "s" : ""} — base aérobie solide, l'allure tient face à la dérive cardiaque.`;
  } else if (stats.level === "limite") {
    texte = `Dérive moyenne ${moyenne}% sur ${stats.n} course${stats.n > 1 ? "s" : ""} — base aérobie à consolider, la fatigue s'installe en seconde moitié.`;
  } else {
    texte = `Dérive moyenne ${moyenne}% sur ${stats.n} course${stats.n > 1 ? "s" : ""} — base aérobie insuffisante, priorité aux sorties longues en Z2.`;
  }
  summary.textContent = texte;
}

// ─── UTILITAIRE SVG ───
function svgEl(parent, tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "style") el.style.cssText = v;
    else el.setAttribute(k, v);
  });
  parent.appendChild(el);
  return el;
}

// ─── SÉLECTEUR ATHLÈTE ───
function bindSélecteur() {
  document.querySelectorAll(".athlete-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".athlete-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      athleteActif = btn.dataset.athlete;
      rendrePage(athleteActif);
    });
  });
}

// ─── FILTRE PÉRIODE ───
function bindPeriode() {
  document.querySelectorAll(".periode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".periode-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      nbSemaines = parseInt(btn.dataset.n);
      rendrePage(athleteActif);
    });
  });
}
