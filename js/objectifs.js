// OBJECTIFS.JS
// Pour Benoît : données recomputées à partir de window.HISTORY + explainScore()
// Pour Sophie/Marc : fallback sur OBJECTIFS_DATA (mockup)

const OBJECTIFS_DATA = {
  benoit: {
    race: {
      nom: "Ironman Switzerland Thun",
      badge: "Objectif A",
      icone: "🏊🚴🏃",
      dateStr: "5 juillet 2026 · Thun, Suisse",
      dateISO: "2026-07-05",
      planStart: "2025-10-01",
    },
  },

  sophie: {
    race: {
      nom: "Triathlon M Annecy",
      badge: "Objectif A",
      icone: "🏊🚴🏃",
      dateStr: "23 août 2026 · Annecy",
      dateISO: "2026-08-23",
      planStart: "2026-01-15",
    },
    prepScore: 44,
    prepLabel: "Attention requise",
    prepMessage: "Ton score de préparation a chuté ces 2 dernières semaines. Non pas parce que tu t'entraînes mal — mais parce que ton corps est en dette. Une semaine de récupération maintenant vaut 3 semaines de gains.",
    benchmarks: [
      { label: "Natation 1,9km",  cible: "38min",   actuel: "44min",   unite: "objectif", pct: 60, couleur: "#6C63FF" },
      { label: "Vélo 90km",       cible: "2h45",    actuel: "3h05",    unite: "objectif", pct: 65, couleur: "#00D4AA" },
      { label: "Semi-marathon",   cible: "1h55",    actuel: "2h08",    unite: "objectif", pct: 58, couleur: "#FF6B6B" },
      { label: "FTP vélo",        cible: "220W",    actuel: "195W",    unite: "cible",    pct: 75, couleur: "#FFD166" },
      { label: "HRV baseline",    cible: "58ms",    actuel: "41ms",    unite: "cible",    pct: 42, couleur: "#FF6B6B" },
    ],
    noteCoach: "Sophie, avant de parler de l'objectif d'août, parlons de la prochaine semaine. Ton HRV à 41ms et ton ratio à 1.49 me disent qu'on est en zone rouge.",
    jalons: [
      { date: "1 mars",  label: "Test natation 1000m chrono",   statut: "done",    note: "23min45" },
      { date: "19 avr.", label: "Semaine de récupération",       statut: "current", note: "⚠️ Priorité absolue" },
      { date: "23 août", label: "🏁 TRIATHLON M ANNECY",        statut: "race",    note: "Départ 8h00." },
    ],
  },

  marc: {
    race: {
      nom: "Triathlon M Bordeaux",
      badge: "Premier M",
      icone: "🏊🚴🏃",
      dateStr: "20 septembre 2026 · Bordeaux",
      dateISO: "2026-09-20",
      planStart: "2026-02-01",
    },
    prepScore: 52,
    prepLabel: "Fondations solides",
    prepMessage: "Pour un premier M, tu es exactement là où tu devrais être. Ton corps récupère vite, tu dors bien, et ta progression est régulière.",
    benchmarks: [
      { label: "Natation 1,9km",  cible: "45min",   actuel: "55min",   unite: "objectif", pct: 45, couleur: "#6C63FF" },
      { label: "Vélo 90km",       cible: "3h00",    actuel: "3h40",    unite: "objectif", pct: 50, couleur: "#00D4AA" },
      { label: "Semi-marathon",   cible: "2h10",    actuel: "2h28",    unite: "objectif", pct: 55, couleur: "#FF6B6B" },
      { label: "VO2max estimé",   cible: "56 ml/kg",actuel: "51",      unite: "cible",    pct: 65, couleur: "#FFD166" },
      { label: "Volume semaine",  cible: "10h",     actuel: "5h30",    unite: "cible",    pct: 55, couleur: "#6C63FF" },
    ],
    noteCoach: "Marc, 155 jours. C'est énorme comme marge pour un premier M.",
    jalons: [
      { date: "15 mars", label: "Premier 400m nage chrono",     statut: "done",    note: "8min20" },
      { date: "26 avr.", label: "Passage à 3 séances natation/sem", statut: "current", note: "Cette semaine" },
      { date: "20 sept.", label: "🏁 TRIATHLON M BORDEAUX",     statut: "race",    note: "Ton premier M." },
    ],
  },
};

let athleteActif = "benoit";

document.addEventListener("DOMContentLoaded", () => {
  rendrePage(athleteActif);
  bindSélecteur();
});

function rendrePage(id) {
  const d = id === "benoit" ? buildBenoitData() : OBJECTIFS_DATA[id];
  const a = window.ATHLETES && window.ATHLETES[id];
  if (!d || !a) return;

  document.getElementById("headerSub").textContent = `${a.nom} · ${d.race.nom}`;
  rendreRaceCard(d);
  rendrePrep(d);
  rendreBenchmarks(d.benchmarks);
  rendreTimeline(d.jalons);
  if (id === "benoit") rendreMacroTimeline();
  if (id === "benoit") rendreEventTimeline(d.race);
  if (id === "benoit") rendreRaceNutrition(d.race);
  if (id === "benoit") { const c = document.getElementById("courseInfoCard"); if (c) c.style.display = "block"; }
  if (id === "benoit") rendreChecklist(d.race);
  if (id === "benoit") rendrePostRace(d.race);
  if (id === "benoit") rendreSmartObjectifs(d.race);
  if (id === "benoit") rendrePlanAttaque(d.race);
  if (id === "benoit") rendrePrediction(d.race);
  if (id === "benoit") rendreBenchmarksTests(d.race);
  if (id === "benoit") rendreEquipment();
  if (id === "benoit") rendreSimulation();
  document.getElementById("noteCoachGlobal").textContent = d.noteCoach;
}

// ─── LOT 26 : PRÉDICTION CHRONO IRONMAN ────────────────────────────────
function rendrePrediction(race) {
  const card = document.getElementById("predictionCard");
  if (!card) return;
  const prof = window.ATHLETE_PROFILE || {};
  const hasAny = Number.isFinite(prof.ftp) || Number.isFinite(prof.vma) || Number.isFinite(prof.swolf100);
  if (!hasAny) { card.style.display = "none"; return; }
  card.style.display = "block";

  // Distance (IM full)
  const isIronman = /ironman/i.test(race.nom || "");
  const isHalfIM = /70\.3|half/i.test(race.nom || "");
  // Default = full Ironman
  const distNage = isHalfIM ? 1.9 : 3.8;   // km
  const distVelo = isHalfIM ? 90 : 180;    // km
  const distRun = isHalfIM ? 21.1 : 42.2;  // km

  // === NAGE === pace au 100m en secondes
  let paceNagePer100 = 110; // baseline débutant ~1:50/100m
  if (Number.isFinite(prof.swolf100) && prof.swolf100 > 0) {
    // Swolf 100 (temps + coups) : estimation pace = (swolf - 40) seconds par 100m approx
    paceNagePer100 = Math.max(75, prof.swolf100 - 30);
  }
  const tNageSec = (distNage * 1000 / 100) * paceNagePer100;

  // === VÉLO === vitesse depuis FTP
  let vitesseVelo = 27; // baseline km/h
  if (Number.isFinite(prof.ftp) && prof.ftp > 0) {
    // Formule simplifiée : vitesse = 22 + 0.04 × FTP (sur Ironman parcours vallonné)
    vitesseVelo = Math.min(42, 22 + 0.04 * prof.ftp);
  }
  const tVeloSec = (distVelo / vitesseVelo) * 3600;

  // === COURSE === pace depuis VMA
  let paceRunPer1k = 330; // 5:30/km baseline
  if (Number.isFinite(prof.vma) && prof.vma > 0) {
    // Pace IM = 70-75% VMA
    const pctVma = isHalfIM ? 0.78 : 0.72; // full IM plus conservateur (fatigue)
    const paceKmH = prof.vma * pctVma;
    paceRunPer1k = 3600 / paceKmH;
  }
  const tRunSec = (distRun) * paceRunPer1k;

  // Transitions
  const t1Sec = isHalfIM ? 180 : 360; // 3min half / 6min full
  const t2Sec = isHalfIM ? 120 : 240;

  const tTotalSec = tNageSec + t1Sec + tVeloSec + t2Sec + tRunSec;
  const fmt = _fmtHMS;

  // Scenarios : optimiste/realistic/pessimiste (±5-8%)
  const optSec = tTotalSec * 0.93;
  const pessSec = tTotalSec * 1.08;

  // Fill header
  document.getElementById("predictionSub").textContent = `Estimation basée sur ton profil — ${isHalfIM ? "Half Ironman" : "Ironman full distance"}`;
  const badge = document.getElementById("predictionBadge");
  // Pace de base solide ?
  const qualCount = [Number.isFinite(prof.ftp), Number.isFinite(prof.vma), Number.isFinite(prof.swolf100)].filter(Boolean).length;
  let qLabel, qCol;
  if (qualCount === 3) { qLabel = "Profil complet"; qCol = "#00D4AA"; }
  else if (qualCount === 2) { qLabel = "Profil partiel"; qCol = "#FFD166"; }
  else { qLabel = "Profil minimal"; qCol = "#FF6B6B"; }
  badge.textContent = `● ${qLabel}`;
  badge.style.background = `${qCol}22`;
  badge.style.color = qCol;
  badge.style.border = `1px solid ${qCol}55`;

  // Total + range
  document.getElementById("predictionTotal").textContent = fmt(tTotalSec);
  document.getElementById("predictionRange").textContent = `Fourchette ${fmt(optSec)} → ${fmt(pessSec)}`;

  // Breakdown par discipline
  const splits = [
    { disc: "🏊 Natation", dist: `${distNage} km`, time: fmt(tNageSec), pace: `${_fmtPaceSec(paceNagePer100)}/100m`, color: "#00D4AA", pct: Math.round((tNageSec / tTotalSec) * 100) },
    { disc: "T1", dist: "Transition", time: fmt(t1Sec), pace: "", color: "#555870", pct: Math.round((t1Sec / tTotalSec) * 100) },
    { disc: "🚴 Vélo", dist: `${distVelo} km`, time: fmt(tVeloSec), pace: `${vitesseVelo.toFixed(1)} km/h moy`, color: "#6C63FF", pct: Math.round((tVeloSec / tTotalSec) * 100) },
    { disc: "T2", dist: "Transition", time: fmt(t2Sec), pace: "", color: "#555870", pct: Math.round((t2Sec / tTotalSec) * 100) },
    { disc: "🏃 Course", dist: `${distRun} km`, time: fmt(tRunSec), pace: `${_fmtPaceSec(paceRunPer1k)}/km`, color: "#FF6B6B", pct: Math.round((tRunSec / tTotalSec) * 100) },
  ];
  document.getElementById("predictionSplit").innerHTML = splits.map(s => `
    <div style="display:flex;align-items:center;gap:14px;padding:10px 12px;background:rgba(255,255,255,0.02);border-left:3px solid ${s.color};border-radius:8px;">
      <div style="flex:0 0 120px;">
        <div style="font-size:0.85rem;font-weight:700;color:#F0F0F5;">${s.disc}</div>
        <div style="font-size:0.7rem;color:#8B8FA8;">${s.dist}</div>
      </div>
      <div style="flex:1;">
        <div style="height:8px;background:rgba(255,255,255,0.05);border-radius:4px;overflow:hidden;">
          <div style="height:100%;width:${s.pct}%;background:${s.color};border-radius:4px;"></div>
        </div>
        <div style="font-size:0.7rem;color:#555870;margin-top:3px;">${s.pct}% du chrono</div>
      </div>
      <div style="flex:0 0 140px;text-align:right;">
        <div style="font-size:0.95rem;font-weight:800;color:#F0F0F5;">${s.time}</div>
        <div style="font-size:0.7rem;color:#8B8FA8;">${s.pace}</div>
      </div>
    </div>
  `).join("");

  document.getElementById("predictionOpt").textContent = fmt(optSec);
  document.getElementById("predictionReal").textContent = fmt(tTotalSec);
  document.getElementById("predictionPess").textContent = fmt(pessSec);

  // Note transparence
  const missing = [];
  if (!Number.isFinite(prof.swolf100)) missing.push("swolf100");
  if (!Number.isFinite(prof.ftp)) missing.push("FTP vélo");
  if (!Number.isFinite(prof.vma)) missing.push("VMA course");
  let note;
  if (missing.length === 0) {
    note = `Prédiction calculée à partir de tes FTP ${prof.ftp}W, VMA ${prof.vma}km/h et swolf100 ${prof.swolf100}. Inclut 4-6 min de transitions. Dépend du jour J : météo, alim, mental, parcours.`;
  } else {
    note = `Données manquantes : ${missing.join(", ")}. Valeurs baseline utilisées — renseigne ton profil dans Paramètres pour affiner la prédiction.`;
  }
  document.getElementById("predictionNote").textContent = note;
}

function _fmtHMS(sec) {
  if (!Number.isFinite(sec) || sec < 0) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}`;
  if (m > 0) return `${m}min${s > 0 ? String(s).padStart(2, "0") : ""}`;
  return `${s}s`;
}

function _fmtPaceSec(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── LOT 27 : BENCHMARKS INTERMÉDIAIRES ─────────────────────────────────
function rendreBenchmarksTests(race) {
  const card = document.getElementById("benchmarksTestsCard");
  if (!card || !race || !race.dateISO) { if (card) card.style.display = "none"; return; }
  card.style.display = "block";

  const raceDate = new Date(race.dateISO + "T07:00:00");
  const today = new Date(); today.setHours(0,0,0,0);
  const daysTo = Math.ceil((raceDate - today) / (1000 * 60 * 60 * 24));

  const prof = (typeof window !== "undefined" && window.ATHLETE_PROFILE) || {};

  // Les 5 tests, ancrés en semaines avant la course
  const tests = [
    {
      icon: "🚴", sport: "Vélo", name: "Test FTP 20 min",
      weeksBefore: 9,
      protocol: "20 min all-out sur plat après 20 min d'échauffement progressif. FTP = moyenne × 0.95.",
      baselineLabel: "FTP actuelle",
      baselineValue: prof.ftp ? `${prof.ftp} W` : "—",
      targetLabel: "Cible",
      targetValue: prof.ftp ? `${Math.round(prof.ftp * 1.05)} W (+5%)` : "+5% baseline",
      why: "Recalibre tes zones vélo. Impact direct sur le plan nutrition et la prédiction chrono.",
      color: "#6C63FF",
    },
    {
      icon: "🏃", sport: "Course", name: "Test 10 km chrono",
      weeksBefore: 7,
      protocol: "10 km sur piste ou boucle plate, rythme soutenu continu. Extrapole VMA.",
      baselineLabel: "VMA actuelle",
      baselineValue: prof.vma ? `${prof.vma} km/h` : "—",
      targetLabel: "Cible 10 km",
      targetValue: prof.vma ? `${_fmtHMS(10 * 3600 / (prof.vma * 0.88))}` : "—",
      why: "Valide l'allure Ironman marathon (72% VMA). Détecte toute dérive cardio en sortie de grippe.",
      color: "#00D4AA",
    },
    {
      icon: "🏊", sport: "Natation", name: "1500 m continu",
      weeksBefore: 5,
      protocol: "1500 m en piscine, effort constant. Note le temps + SWOLF moyen.",
      baselineLabel: "SWOLF 100m",
      baselineValue: prof.swolf100 ? `${prof.swolf100}` : "—",
      targetLabel: "Cible 1500 m",
      targetValue: prof.swolf100 ? `${_fmtHMS(1500 * Math.max(75, prof.swolf100 - 30) / 100)}` : "—",
      why: "Calibre l'allure natation pour le départ Ironman. Check technique + endurance continue.",
      color: "#FFD166",
    },
    {
      icon: "🔀", sport: "Brick", name: "Long brick 4h + 1h",
      weeksBefore: 4,
      protocol: "4 h vélo en Z2 + 1 h course enchaînée allure IM. Test complet nutrition/hydratation.",
      baselineLabel: "Durée totale",
      baselineValue: "5 h",
      targetLabel: "Nutrition",
      targetValue: "80-90 g glucides/h",
      why: "La répétition générale nutritionnelle. Tout ce qui passe mal ici doit être corrigé avant Thun.",
      color: "#FF6B6B",
    },
    {
      icon: "🎯", sport: "Race pace", name: "Simulation J-Day",
      weeksBefore: 2,
      protocol: "90 min vélo allure course + 30 min course allure marathon. Tenue de course complète.",
      baselineLabel: "Contexte",
      baselineValue: "J-14",
      targetLabel: "Objectif",
      targetValue: "Valider allure + équipement",
      why: "Dernière répétition avant taper final. Confirme allures cibles et matériel de course.",
      color: "#8B7FFF",
    },
  ];

  // Enrichir avec date suggérée + statut
  const testsWithDates = tests.map(t => {
    const testDate = new Date(raceDate); testDate.setDate(testDate.getDate() - t.weeksBefore * 7);
    const daysUntilTest = Math.ceil((testDate - today) / (1000 * 60 * 60 * 24));
    let statut;
    if (daysUntilTest < -3) statut = "done"; // plus de 3 j après date théorique = dépassé
    else if (daysUntilTest <= 7 && daysUntilTest >= -3) statut = "now";
    else statut = "todo";
    return { ...t, testDate, daysUntilTest, statut };
  });

  // Sub + badge : combien à venir
  const nbAvenir = testsWithDates.filter(t => t.statut !== "done").length;
  const nbNow = testsWithDates.filter(t => t.statut === "now").length;
  document.getElementById("benchmarksTestsSub").textContent =
    `${nbAvenir}/${tests.length} tests à venir avant ${race.nom}`;

  const badge = document.getElementById("benchmarksTestsBadge");
  if (nbNow > 0) { badge.textContent = `${nbNow} cette semaine`; badge.style.background = "rgba(255,107,107,0.15)"; badge.style.color = "#FF6B6B"; }
  else if (daysTo < 0) { badge.textContent = "course passée"; badge.style.background = "rgba(139,143,168,0.15)"; badge.style.color = "#8B8FA8"; }
  else { badge.textContent = `J-${daysTo}`; badge.style.background = "rgba(108,99,255,0.15)"; badge.style.color = "#6C63FF"; }

  // Rendu liste
  const list = document.getElementById("benchmarksTestsList");
  list.innerHTML = testsWithDates.map(t => _renderBenchmarkTestRow(t)).join("");

  // Note pédagogique adaptée au profil
  const missing = [];
  if (!prof.ftp) missing.push("FTP");
  if (!prof.vma) missing.push("VMA");
  if (!prof.swolf100) missing.push("SWOLF 100m");
  const note = document.getElementById("benchmarksTestsNote");
  if (missing.length > 0) {
    note.textContent = `⚠️ Profil incomplet (manque : ${missing.join(", ")}). Les cibles s'afficheront dès que tu saisiras ces valeurs dans ton profil.`;
  } else {
    note.textContent = "Ces 5 tests calibrent tes zones et nourrissent la prédiction chrono. Chaque résultat à saisir dans ton profil après réalisation.";
  }
}

function _renderBenchmarkTestRow(t) {
  const dateStr = t.testDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short", weekday: "short" });
  const weekLabel = `S-${t.weeksBefore}`;

  let statusBadge, opacity, border;
  if (t.statut === "done") {
    statusBadge = `<span style="font-size:0.65rem;color:#8B8FA8;background:rgba(139,143,168,0.12);padding:3px 8px;border-radius:10px;font-weight:700;">✓ fenêtre passée</span>`;
    opacity = "0.55"; border = "1px solid rgba(255,255,255,0.04)";
  } else if (t.statut === "now") {
    const j = t.daysUntilTest >= 0 ? `dans ${t.daysUntilTest}j` : `il y a ${-t.daysUntilTest}j`;
    statusBadge = `<span style="font-size:0.65rem;color:#FF6B6B;background:rgba(255,107,107,0.12);padding:3px 8px;border-radius:10px;font-weight:700;">⚡ cette semaine · ${j}</span>`;
    opacity = "1"; border = `1px solid ${t.color}40`;
  } else {
    statusBadge = `<span style="font-size:0.65rem;color:${t.color};background:${t.color}14;padding:3px 8px;border-radius:10px;font-weight:700;">dans ${t.daysUntilTest}j</span>`;
    opacity = "1"; border = "1px solid rgba(255,255,255,0.06)";
  }

  return `
    <div style="padding:14px;background:rgba(255,255,255,0.02);${`border:${border}`};border-radius:12px;opacity:${opacity};">
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:10px;">
        <div style="font-size:1.6rem;line-height:1;padding-top:2px;">${t.icon}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;">
            <span style="font-weight:800;color:#F0F0F5;font-size:0.92rem;">${t.name}</span>
            <span style="font-size:0.7rem;color:#8B8FA8;font-weight:700;">${weekLabel} · ${dateStr}</span>
          </div>
          <div style="font-size:0.78rem;color:#8B8FA8;margin-top:4px;line-height:1.45;">${t.protocol}</div>
        </div>
        <div>${statusBadge}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        <div style="padding:8px 10px;background:rgba(255,255,255,0.02);border-radius:8px;">
          <div style="font-size:0.65rem;color:#555870;text-transform:uppercase;letter-spacing:0.05em;">${t.baselineLabel}</div>
          <div style="font-size:0.9rem;font-weight:800;color:#D0D0E0;margin-top:2px;">${t.baselineValue}</div>
        </div>
        <div style="padding:8px 10px;background:${t.color}0C;border-radius:8px;">
          <div style="font-size:0.65rem;color:#555870;text-transform:uppercase;letter-spacing:0.05em;">${t.targetLabel}</div>
          <div style="font-size:0.9rem;font-weight:800;color:${t.color};margin-top:2px;">${t.targetValue}</div>
        </div>
      </div>
      <div style="font-size:0.72rem;color:#8B8FA8;font-style:italic;line-height:1.4;">${t.why}</div>
    </div>
  `;
}

// ─── LOT 29 : SUIVI ÉQUIPEMENT ──────────────────────────────────────────
function rendreEquipment() {
  const card = document.getElementById("equipmentCard");
  if (!card) return;

  const hist = (typeof window !== "undefined" && window.HISTORY && Array.isArray(window.HISTORY.daily)) ? window.HISTORY.daily : null;
  if (!hist) { card.style.display = "none"; return; }
  card.style.display = "block";

  // Calculer km YTD (2026) par catégorie
  const year = new Date().getFullYear();
  const ytd = hist.filter(d => d.date && d.date.startsWith(String(year)));
  const kmBySport = { run: 0, bike: 0, swim: 0 };
  let kmLast28dRun = 0, kmLast28dBike = 0;
  const cutoff28 = Date.now() - 28 * 24 * 3600 * 1000;

  ytd.forEach(d => {
    (d.activities || []).forEach(a => {
      const km = a.distance_km || 0;
      if (!km) return;
      const t = a.type;
      if (t === "Run") { kmBySport.run += km; if ((d.timestamp || 0) >= cutoff28) kmLast28dRun += km; }
      else if (t === "Ride" || t === "VirtualRide" || t === "EBikeRide") { kmBySport.bike += km; if ((d.timestamp || 0) >= cutoff28) kmLast28dBike += km; }
      else if (t === "Swim") { kmBySport.swim += km; }
    });
  });

  // Afficher totaux
  document.getElementById("equipYtdRun").textContent = `${Math.round(kmBySport.run)} km`;
  document.getElementById("equipYtdBike").textContent = `${Math.round(kmBySport.bike)} km`;
  document.getElementById("equipYtdSwim").textContent = `${Math.round(kmBySport.swim)} km`;

  // Projeter usage hebdo moyen (dernier mois × 7/28)
  const weeklyRun = kmLast28dRun / 4;
  const weeklyBike = kmLast28dBike / 4;

  // 3 équipements fictifs (seuils indicatifs)
  const gear = [
    {
      icon: "👟", name: "Chaussures running",
      used: kmBySport.run, max: 600,
      weekly: weeklyRun,
      tip: "Au-delà de 600 km, amortissement dégradé → risque blessure.",
    },
    {
      icon: "🔗", name: "Chaîne vélo",
      used: kmBySport.bike, max: 3000,
      weekly: weeklyBike,
      tip: "Mesure l'usure tous les 1500 km (jauge d'usure) — remplace avant qu'elle ne mange les pignons.",
    },
    {
      icon: "🛞", name: "Pneus vélo",
      used: kmBySport.bike, max: 4000,
      weekly: weeklyBike,
      tip: "Inspecter régulièrement les coupures et l'usure de la bande — change avant une course clé.",
    },
  ];

  // Rendu liste
  const list = document.getElementById("equipmentList");
  list.innerHTML = gear.map(g => _renderEquipmentRow(g)).join("");

  // Badge : combien d'équipements en vigilance ou à remplacer
  const warning = gear.filter(g => g.used / g.max >= 0.75).length;
  const replace = gear.filter(g => g.used / g.max >= 0.95).length;
  const badge = document.getElementById("equipmentBadge");
  if (replace > 0) { badge.textContent = `${replace} à remplacer`; badge.style.background = "rgba(255,107,107,0.15)"; badge.style.color = "#FF6B6B"; }
  else if (warning > 0) { badge.textContent = `${warning} vigilance`; badge.style.background = "rgba(255,209,102,0.15)"; badge.style.color = "#FFD166"; }
  else { badge.textContent = "tout OK"; badge.style.background = "rgba(0,212,170,0.15)"; badge.style.color = "#00D4AA"; }

  // Sub : km totaux par sport
  const totalKm = kmBySport.run + kmBySport.bike;
  document.getElementById("equipmentSub").textContent = `${Math.round(totalKm)} km parcourus en ${year}`;
}

function _renderEquipmentRow(g) {
  const pct = Math.min(100, Math.round((g.used / g.max) * 100));
  let status, color;
  if (pct < 25) { status = "Neuf"; color = "#00D4AA"; }
  else if (pct < 75) { status = "OK"; color = "#6C63FF"; }
  else if (pct < 95) { status = "Vigilance"; color = "#FFD166"; }
  else { status = "À remplacer"; color = "#FF6B6B"; }

  const remaining = Math.max(0, g.max - g.used);
  let eta = "";
  if (g.weekly > 0 && remaining > 0) {
    const weeks = Math.round(remaining / g.weekly);
    if (weeks < 52) eta = `~${weeks} sem. au rythme actuel`;
    else eta = "marge large";
  } else if (remaining <= 0) {
    eta = "seuil dépassé";
  }

  return `
    <div style="padding:14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;">
      <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:10px;flex-wrap:wrap;">
        <span style="font-size:1.4rem;line-height:1;">${g.icon}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:800;color:#F0F0F5;font-size:0.92rem;">${g.name}</div>
          <div style="font-size:0.72rem;color:#8B8FA8;margin-top:2px;">${Math.round(g.used)} / ${g.max} km · ${eta}</div>
        </div>
        <span style="font-size:0.7rem;color:${color};background:${color}14;padding:4px 10px;border-radius:10px;font-weight:800;">${status}</span>
      </div>
      <div style="height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;margin-bottom:8px;">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:4px;transition:width 0.4s ease;"></div>
      </div>
      <div style="font-size:0.7rem;color:#8B8FA8;font-style:italic;line-height:1.4;">${g.tip}</div>
    </div>
  `;
}

// ─── LOT 25 : PLAN D'ATTAQUE 11 SEMAINES RESTANTES ──────────────────────
let _planAttaqueFilter = "tous";
function rendrePlanAttaque(race) {
  const card = document.getElementById("planAttaqueCard");
  if (!card || !race || !race.dateISO) { if (card) card.style.display = "none"; return; }
  card.style.display = "block";

  // Bind filtres une seule fois
  if (!card.dataset.bound) {
    card.querySelectorAll(".pa-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        card.querySelectorAll(".pa-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        _planAttaqueFilter = btn.dataset.f;
        _renderPlanAttaqueTable(race);
      });
    });
    card.dataset.bound = "1";
  }
  _renderPlanAttaqueTable(race);
}

function _renderPlanAttaqueTable(race) {
  const raceMs = new Date(race.dateISO).getTime();
  const now = Date.now();
  const daysToRace = Math.floor((raceMs - now) / 86400000);
  const weeksToRace = Math.max(0, Math.ceil(daysToRace / 7));
  document.getElementById("planAttaqueSub").textContent =
    `J-${daysToRace} · ${weeksToRace} semaines jusqu'à ${race.nom.split(" ").slice(-1)[0] || "la course"}`;

  // Construire N semaines. Affiche les 11-12 restantes + 1-2 passées si filter tous
  const showWeeks = _planAttaqueFilter === "venir" ? weeksToRace : Math.min(13, weeksToRace + 2);

  // Lundi de la semaine en cours
  const monday = new Date(now);
  const dow = monday.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  monday.setDate(monday.getDate() + diff);
  monday.setHours(0, 0, 0, 0);

  const start = new Date(monday);
  start.setDate(start.getDate() - (_planAttaqueFilter === "venir" ? 0 : 14));

  const rows = [];
  for (let i = 0; i < showWeeks; i++) {
    const weekStart = new Date(start);
    weekStart.setDate(weekStart.getDate() + i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const daysTo = Math.floor((raceMs - weekStart.getTime()) / 86400000);
    if (daysTo < -7) continue; // déjà course passée
    const phase = _phaseForDays(daysTo);
    const vol = _volumeForWeek(daysTo);
    const rep = _repartitionForPhase(phase, vol);
    const sig = _signatureSeance(phase, daysTo);
    const focus = _focusForPhase(phase, daysTo);
    const isCurrent = weekStart.getTime() <= now && now < weekEnd.getTime() + 86400000;
    const isPast = weekEnd.getTime() < now && !isCurrent;
    rows.push({ weekStart, weekEnd, daysTo, phase, vol, rep, sig, focus, isCurrent, isPast, daysToRace: daysTo });
  }

  // Apply filter
  const rowsToShow = _planAttaqueFilter === "venir"
    ? rows.filter(r => !r.isPast)
    : rows;

  const PHASE_COLORS = {
    "Reprise": "#A9A3FF",
    "Base": "#00D4AA",
    "Build": "#6C63FF",
    "Peak": "#FFD166",
    "Taper": "#FF8FA3",
    "Race": "#FFD700",
  };

  const body = document.getElementById("planAttaqueBody");
  body.innerHTML = rowsToShow.map(r => {
    const fmt = (d) => `${d.getDate()}/${d.getMonth() + 1}`;
    const phaseColor = PHASE_COLORS[r.phase] || "#8B8FA8";
    const rowCls = r.isCurrent ? "current-week" : (r.isPast ? "past-week" : "");
    const weekNum = r.daysToRace > 0 ? `S-${Math.ceil(r.daysToRace / 7)}` : (r.daysToRace === 0 ? "S0" : `S+${Math.abs(Math.floor(r.daysToRace / 7))}`);
    return `
      <tr class="${rowCls}">
        <td style="padding:10px 8px;">
          <div style="font-weight:700;color:#F0F0F5;">${weekNum}</div>
          <div style="font-size:0.7rem;color:#8B8FA8;">${fmt(r.weekStart)} → ${fmt(r.weekEnd)}</div>
        </td>
        <td style="padding:10px 8px;">
          <span style="background:${phaseColor}22;color:${phaseColor};border:1px solid ${phaseColor}55;padding:3px 10px;border-radius:10px;font-size:0.7rem;font-weight:700;">${r.phase}</span>
        </td>
        <td style="padding:10px 8px;text-align:right;">
          <div style="font-weight:800;color:#F0F0F5;">${r.vol}h</div>
        </td>
        <td style="padding:10px 8px;">
          <div style="display:flex;gap:3px;height:8px;border-radius:4px;overflow:hidden;">
            <div style="flex:${r.rep.nage};background:#00D4AA;" title="Nage ${r.rep.nage}h"></div>
            <div style="flex:${r.rep.velo};background:#6C63FF;" title="Vélo ${r.rep.velo}h"></div>
            <div style="flex:${r.rep.run};background:#FF6B6B;" title="Course ${r.rep.run}h"></div>
          </div>
          <div style="font-size:0.68rem;color:#8B8FA8;margin-top:3px;text-align:center;">${r.rep.nage}N · ${r.rep.velo}V · ${r.rep.run}R</div>
        </td>
        <td style="padding:10px 8px;color:#D0D0E0;">${r.sig}</td>
        <td style="padding:10px 8px;color:#8B8FA8;font-style:italic;font-size:0.76rem;">${r.focus}</td>
      </tr>
    `;
  }).join("");

  // Totaux cumulés des semaines à venir
  const toCome = rows.filter(r => !r.isPast);
  const totalVol = toCome.reduce((s, r) => s + r.vol, 0);
  const totalSessions = toCome.length * 7; // estim 7 séances/sem moyenne
  const totalNage = toCome.reduce((s, r) => s + r.rep.nage, 0);
  const totalVelo = toCome.reduce((s, r) => s + r.rep.velo, 0);
  const totalRun = toCome.reduce((s, r) => s + r.rep.run, 0);
  const totals = document.getElementById("planAttaqueTotals");
  totals.innerHTML = `
    <div style="text-align:center;">
      <div style="font-size:0.68rem;color:#8B8FA8;text-transform:uppercase;letter-spacing:0.05em;">Volume total à venir</div>
      <div style="font-size:1.3rem;font-weight:800;color:#6C63FF;margin-top:2px;">${totalVol}h</div>
    </div>
    <div style="text-align:center;">
      <div style="font-size:0.68rem;color:#8B8FA8;text-transform:uppercase;letter-spacing:0.05em;">Nage</div>
      <div style="font-size:1.1rem;font-weight:700;color:#00D4AA;margin-top:2px;">${totalNage}h</div>
    </div>
    <div style="text-align:center;">
      <div style="font-size:0.68rem;color:#8B8FA8;text-transform:uppercase;letter-spacing:0.05em;">Vélo</div>
      <div style="font-size:1.1rem;font-weight:700;color:#6C63FF;margin-top:2px;">${totalVelo}h</div>
    </div>
    <div style="text-align:center;">
      <div style="font-size:0.68rem;color:#8B8FA8;text-transform:uppercase;letter-spacing:0.05em;">Course</div>
      <div style="font-size:1.1rem;font-weight:700;color:#FF6B6B;margin-top:2px;">${totalRun}h</div>
    </div>
  `;

  // Narrative
  const peakRow = rows.find(r => r.phase === "Peak" && !r.isPast);
  const taperRow = rows.find(r => r.phase === "Taper" && !r.isPast);
  let narr = `Plan d'attaque sur ${toCome.length} semaines — total ${totalVol}h d'entraînement réparties en reprise, base, build, peak puis taper.`;
  if (peakRow) {
    const peakDate = `${peakRow.weekStart.getDate()}/${peakRow.weekStart.getMonth() + 1}`;
    narr += ` Peak prévu semaine du ${peakDate} (S-${Math.ceil(peakRow.daysToRace / 7)}).`;
  }
  if (taperRow) {
    narr += ` Taper démarre ${Math.ceil(taperRow.daysToRace / 7)} semaines avant la course — volume réduit, intensité maintenue.`;
  }
  document.getElementById("planAttaqueNarrative").textContent = narr;
}

function _phaseForDays(daysTo) {
  if (daysTo < 0) return "Post";
  if (daysTo === 0) return "Race";
  if (daysTo <= 6) return "Taper";
  if (daysTo <= 20) return "Taper";
  if (daysTo <= 42) return "Peak";
  if (daysTo <= 70) return "Build";
  if (daysTo <= 112) return "Base";
  return "Reprise";
}

function _volumeForWeek(daysTo) {
  // Progression volume basée sur daysTo
  if (daysTo < 0) return 0;
  if (daysTo === 0) return 0;         // jour de course
  if (daysTo <= 6) return 5;          // taper 3 : activation
  if (daysTo <= 13) return 9;         // taper 2
  if (daysTo <= 20) return 12;        // taper 1
  if (daysTo <= 27) return 15;        // peak
  if (daysTo <= 34) return 16;        // peak haut
  if (daysTo <= 41) return 15;        // peak
  if (daysTo <= 48) return 14;        // build 2
  if (daysTo <= 55) return 13;        // build 2
  if (daysTo <= 62) return 12;        // build 1
  if (daysTo <= 69) return 11;        // build 1
  if (daysTo <= 76) return 10;        // base haut (semaine actuelle)
  if (daysTo <= 83) return 8;         // reprise
  return 6;                           // reprise douce
}

function _repartitionForPhase(phase, vol) {
  // Nage/Vélo/Run en heures — total ≈ vol
  let n, v, r;
  if (phase === "Reprise" || phase === "Base") { n = Math.round(vol * 0.2); v = Math.round(vol * 0.45); r = Math.round(vol * 0.3); }
  else if (phase === "Build") { n = Math.round(vol * 0.15); v = Math.round(vol * 0.55); r = Math.round(vol * 0.3); }
  else if (phase === "Peak") { n = Math.round(vol * 0.1); v = Math.round(vol * 0.60); r = Math.round(vol * 0.3); }
  else if (phase === "Taper") { n = Math.round(vol * 0.15); v = Math.round(vol * 0.55); r = Math.round(vol * 0.3); }
  else { n = 0; v = 0; r = 0; }
  // Réajuster au besoin
  while (n + v + r > vol && r > 0) r--;
  while (n + v + r < vol) v++;
  return { nage: n, velo: v, run: r };
}

function _signatureSeance(phase, daysTo) {
  const sem = Math.ceil(daysTo / 7);
  if (phase === "Race") return "🏁 Course — Ironman 3.8/180/42.2";
  if (phase === "Taper" && sem <= 1) return "Activation légère + open water court";
  if (phase === "Taper" && sem <= 2) return "Brick court 1h vélo + 20min run race pace";
  if (phase === "Taper" && sem <= 3) return "Dernière simulation race pace sur 1h30";
  if (phase === "Peak" && sem === 4) return "Brick long 4h vélo + 1h course Z2";
  if (phase === "Peak" && sem === 5) return "Sortie vélo 5h + nage 3km open water";
  if (phase === "Peak" && sem === 6) return "Long brick 3h30 vélo + 45min + nage continue 3km";
  if (phase === "Build" && sem === 7) return "Test 10km chrono (allure IM run)";
  if (phase === "Build" && sem === 8) return "Sortie longue vélo 3h30 + 30min run";
  if (phase === "Build" && sem === 9) return "Test FTP vélo 20min + long run 1h30";
  if (phase === "Build" && sem === 10) return "Brick 2h30 vélo + 30min run";
  if (phase === "Base" && sem === 11) return "Reprise volume : 2h vélo facile + nage 2km";
  if (phase === "Reprise") return "Reprise douce post-grippe, volume minimal";
  return "Endurance régulière — base aérobie";
}

function _focusForPhase(phase, daysTo) {
  if (phase === "Race") return "Exécution race day";
  if (phase === "Taper") return "Fraîcheur + confiance";
  if (phase === "Peak") return "Specificité Ironman";
  if (phase === "Build") return "Progression aérobie";
  if (phase === "Base") return "Volume + régularité";
  if (phase === "Reprise") return "Retour en douceur";
  return "Maintien";
}

// ─── LOT 19 : SIMULATION « ET SI » ──────────────────────────────────────
function rendreSimulation() {
  const card = document.getElementById("simulationCard");
  if (!card || !window.HISTORY || !window.HISTORY.daily || window.HISTORY.daily.length < 35) {
    if (card) card.style.display = "none";
    return;
  }
  card.style.display = "block";

  const daily = window.HISTORY.daily;
  const loads = daily.map(d => Number.isFinite(d.strain_strava) ? d.strain_strava : 0);

  // État actuel : acute (7d), chronic (28d), CTL/ATL/TSB
  const last7 = loads.slice(-7);
  const last28 = loads.slice(-28);
  const acute7 = last7.reduce((a, b) => a + b, 0);
  const avg7 = acute7 / 7;
  const avgChronic = last28.reduce((a, b) => a + b, 0) / 28;
  const acwrNow = avgChronic > 0 ? acute7 / 7 / avgChronic : 0;

  // CTL/ATL actuels (42d/7d EMA)
  const alphaCTL = 2 / 43, alphaATL = 2 / 8;
  let ctl = 0, atl = 0;
  for (const l of loads) {
    ctl = ctl + alphaCTL * (l - ctl);
    atl = atl + alphaATL * (l - atl);
  }
  const tsbNow = ctl - atl;

  const slider = document.getElementById("simVolSlider");
  const valLabel = document.getElementById("simVolValue");

  function update() {
    const mod = parseInt(slider.value) / 100;
    valLabel.textContent = (mod >= 0 ? "+" : "") + Math.round(mod * 100) + "%";

    // Projection : 7 prochains jours à avg7 × (1 + mod)
    const projDaily = avg7 * (1 + mod);
    // ACWR projeté J+7 = sum(projDaily × 7) / 7 / avgChronic28Updated
    // chronic update = (last21 + proj7) / 28
    const chronicMix = (loads.slice(-21).reduce((a, b) => a + b, 0) + projDaily * 7) / 28;
    const acwrProj = chronicMix > 0 ? projDaily / chronicMix : 0;

    // CTL/ATL projetés J+7 (appliquer projDaily 7 fois)
    let ctlP = ctl, atlP = atl;
    for (let i = 0; i < 7; i++) {
      ctlP = ctlP + alphaCTL * (projDaily - ctlP);
      atlP = atlP + alphaATL * (projDaily - atlP);
    }
    const tsbProj = ctlP - atlP;

    // Signature probable
    let sig, sigColor, risk;
    if (acwrProj >= 1.5) {
      sig = "Overreach confirmé"; sigColor = "#FF4A4A"; risk = "Risque de surmenage ↑↑";
    } else if (acwrProj >= 1.3) {
      sig = "Charge brute"; sigColor = "#FF6B6B"; risk = "Zone limite";
    } else if (acwrProj >= 1.0) {
      sig = "Build Z2"; sigColor = "#6C63FF"; risk = "Progression productive";
    } else if (acwrProj >= 0.8) {
      sig = "Rythme de croisière"; sigColor = "#00D4AA"; risk = "Maintien équilibré";
    } else if (acwrProj >= 0.6) {
      sig = "Décharge planifiée"; sigColor = "#A9A3FF"; risk = "Récupération active";
    } else {
      sig = "Décharge subie"; sigColor = "#FFD166"; risk = "Sous-charge — risque de perte";
    }

    // Update DOM
    document.getElementById("simAcwrProj").textContent = acwrProj.toFixed(2);
    document.getElementById("simAcwrDelta").textContent = `actuel ${acwrNow.toFixed(2)}`;
    document.getElementById("simTsbProj").textContent = (tsbProj >= 0 ? "+" : "") + tsbProj.toFixed(1);
    const tsbDelta = tsbProj - tsbNow;
    document.getElementById("simTsbDelta").textContent = `actuel ${(tsbNow >= 0 ? "+" : "") + tsbNow.toFixed(1)} (${tsbDelta >= 0 ? "+" : ""}${tsbDelta.toFixed(1)})`;
    document.getElementById("simSigLabel").textContent = sig;
    document.getElementById("simSigLabel").style.color = sigColor;
    document.getElementById("simSigRisk").textContent = risk;

    // Badge état global
    const badge = document.getElementById("simBadge");
    let stateTxt, stateCol;
    if (acwrProj >= 1.5 || acwrProj < 0.6) { stateTxt = "Zone à risque"; stateCol = "#FF4A4A"; }
    else if (acwrProj >= 1.3 || acwrProj < 0.8) { stateTxt = "Vigilance"; stateCol = "#FFD166"; }
    else { stateTxt = "Zone verte"; stateCol = "#00D4AA"; }
    badge.textContent = `● ${stateTxt}`;
    badge.style.background = `${stateCol}22`;
    badge.style.color = stateCol;
    badge.style.border = `1px solid ${stateCol}55`;

    // Narrative
    const signBadgeText = mod === 0 ? "maintien du volume actuel" : (mod > 0 ? `+${Math.round(mod * 100)}% de charge` : `${Math.round(mod * 100)}% de charge`);
    let narr;
    if (mod === 0) {
      narr = `Sans changement, la trajectoire reste ${sig.toLowerCase()} (ACWR ${acwrProj.toFixed(2)}). TSB projeté à ${(tsbProj >= 0 ? "+" : "") + tsbProj.toFixed(1)} dans 7 jours.`;
    } else if (acwrProj >= 1.5) {
      narr = `Avec ${signBadgeText}, tu bascules en ${sig.toLowerCase()} — ACWR ${acwrProj.toFixed(2)}. C'est le seuil où le corps commence à casser : autorise-toi 2 séances en plus, pas 5.`;
    } else if (acwrProj >= 1.3) {
      narr = `${signBadgeText} te place dans une zone de charge brute. La progression est là, mais pas sur la durée — une seule semaine à ce régime puis on redescend.`;
    } else if (acwrProj >= 0.8 && acwrProj < 1.3) {
      narr = `Scénario productif : ${signBadgeText} maintient un ACWR de ${acwrProj.toFixed(2)}, zone où la forme progresse sans casser. TSB à ${(tsbProj >= 0 ? "+" : "") + tsbProj.toFixed(1)} dans 7j.`;
    } else if (acwrProj >= 0.6) {
      narr = `${signBadgeText} te met en décharge planifiée (ACWR ${acwrProj.toFixed(2)}). Utile après une charge lourde ou avant un objectif — pas à tenir plus d'une semaine.`;
    } else {
      narr = `Attention : ${signBadgeText} te fait glisser sous l'ACWR 0.6 — c'est la zone où la fitness commence à s'éroder. Ok 5–7 jours max, au-delà c'est du détraining.`;
    }
    document.getElementById("simNarrative").textContent = narr;
  }

  slider.addEventListener("input", update);
  update();
}

// ─── LOT 13 : TIMELINE MACRO 11 SEMAINES ────────────────────────────────
function rendreMacroTimeline() {
  const card = document.getElementById("macroCard");
  if (!card) return;
  const H = window.HISTORY;
  if (!H || !H.weeks || !H.weeks.length) { card.style.display = "none"; return; }
  card.style.display = "block";

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
  const PHASE_META = {
    base:  { color: "#A9A3FF", label: "Base — volume aérobie" },
    build: { color: "#6C63FF", label: "Build — qualité + longs" },
    peak:  { color: "#00D4AA", label: "Peak — spécifique IM" },
    taper: { color: "#FFD700", label: "Taper — affûtage" },
  };

  const past = H.weeks.slice(-5);
  const RACE_MS = new Date("2026-07-05T00:00:00Z").getTime();
  const DAY = 86400000;
  const now = Date.now();

  // Projeter 6 semaines futures depuis la fin de l'historique
  const lastWeek = H.weeks[H.weeks.length - 1];
  const lastEndMs = new Date(lastWeek.end_date).getTime();
  const phaseFor = (weekStartMs) => {
    const d = Math.ceil((RACE_MS - weekStartMs) / DAY);
    if (d > 90) return "base";
    if (d > 42) return "build";
    if (d > 14) return "peak";
    return "taper";
  };
  const future = [];
  for (let i = 1; i <= 6; i++) {
    const start = new Date(lastEndMs + (i - 1) * 7 * DAY + DAY);
    const end = new Date(start.getTime() + 6 * DAY);
    const isoWeek = Math.ceil(((start - new Date(start.getFullYear(), 0, 1)) / DAY + 1) / 7);
    future.push({
      id: `${start.getFullYear()}-W${String(isoWeek).padStart(2, "0")}`,
      start, end, phase: phaseFor(start.getTime()), isFuture: true
    });
  }

  // Build cells (5 past + 6 future = 11)
  const wrap = document.getElementById("macroTimeline");
  const fmtDate = (dStr) => {
    const d = new Date(dStr);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };
  const cellHtml = (cell) => {
    if (cell.isFuture) {
      const meta = PHASE_META[cell.phase];
      return `
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:4px;padding:0 2px;">
          <div style="width:100%;height:36px;border-radius:6px;background:${meta.color}22;border:1px dashed ${meta.color}66;display:flex;align-items:center;justify-content:center;color:${meta.color};font-size:0.7rem;font-weight:700;">
            ${cell.phase.toUpperCase()}
          </div>
          <div style="font-size:0.62rem;color:#8B8FA8;">${fmtDate(cell.start)}</div>
          <div style="font-size:0.58rem;color:#555870;">${cell.id.match(/W(\d+)/)[0]}</div>
        </div>`;
    } else {
      const color = SIG_COLORS[cell.signature] || "#555";
      const short = (cell.signature || "").split(" ")[0].slice(0, 8);
      const isCurrent = now >= new Date(cell.start_date).getTime() && now <= new Date(cell.end_date).getTime();
      const ring = isCurrent ? `box-shadow:0 0 0 2px #F0F0F5;` : "";
      return `
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:4px;padding:0 2px;" title="${cell.id} · ${cell.signature}">
          <div style="width:100%;height:36px;border-radius:6px;background:${color}33;border:1px solid ${color};${ring}display:flex;align-items:center;justify-content:center;color:${color};font-size:0.68rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 4px;">
            ${short}
          </div>
          <div style="font-size:0.62rem;color:#8B8FA8;">${fmtDate(cell.start_date)}</div>
          <div style="font-size:0.58rem;color:#555870;">${cell.id.match(/W(\d+)/)[0]}</div>
        </div>`;
    }
  };
  wrap.innerHTML = `
    <div style="display:flex;gap:2px;align-items:stretch;">
      ${past.map(cellHtml).join("")}
      <div style="width:2px;background:linear-gradient(180deg,transparent,#F0F0F5,transparent);align-self:stretch;margin:0 4px;"></div>
      ${future.map(cellHtml).join("")}
    </div>
    <div style="text-align:center;margin-top:8px;font-size:0.68rem;color:#8B8FA8;">
      ← semaines passées · présent · semaines projetées →
    </div>
  `;

  // Legend
  const legend = document.getElementById("macroLegend");
  const phasesUsed = [...new Set(future.map(f => f.phase))];
  legend.innerHTML = phasesUsed.map(p => `
    <div style="display:flex;align-items:center;gap:4px;">
      <span style="width:10px;height:10px;border-radius:2px;background:${PHASE_META[p].color};"></span>${PHASE_META[p].label}
    </div>
  `).join("");

  // Narrative
  const narrative = document.getElementById("macroNarrative");
  const currentPhase = future[0].phase;
  const nextPhaseWeek = future.find(f => f.phase !== currentPhase);
  const phaseChangeMsg = nextPhaseWeek
    ? `Bascule vers ${PHASE_META[nextPhaseWeek.phase].label.toLowerCase()} prévue semaine ${nextPhaseWeek.id.match(/W(\d+)/)[1]} (${fmtDate(nextPhaseWeek.start)}).`
    : `La phase ${currentPhase} dure encore 6 semaines.`;
  const recentSigs = [];
  past.slice(-3).forEach(w => { if (recentSigs[recentSigs.length - 1] !== w.signature) recentSigs.push(w.signature); });
  const illnessRecent = past.some(w => w.incidents && w.incidents.illness);
  const illnessMsg = illnessRecent ? ` L'épisode immunitaire récent reste un facteur : attention à ne pas sur-charger la reprise. ` : "";
  narrative.textContent = `Les 5 dernières semaines : ${recentSigs.join(" · ")}. ${illnessMsg}Tu es maintenant dans la phase ${currentPhase}. ${phaseChangeMsg}`;
}

// ─── CONSTRUCTION DONNÉES BENOÎT DEPUIS HISTORY ─────────────────────────
function buildBenoitData() {
  const base = OBJECTIFS_DATA.benoit;
  const H = window.HISTORY;

  if (!H || !H.weeks || !H.daily) {
    // Fallback minimal si pas de backfill
    return {
      ...base,
      prepScore: 60,
      prepLabel: "Données en cours",
      prepMessage: "Lance le sync Strava + import Whoop pour activer le scoring réel.",
      benchmarks: [],
      jalons: [{ date: "5 juil.", label: "🏁 IRONMAN SWITZERLAND THUN", statut: "race", note: "" }],
      noteCoach: "Active d'abord la collecte de données.",
    };
  }

  return {
    race: base.race,
    ...computePrep(H),
    benchmarks: computeBenchmarks(H),
    jalons: buildJalons(H, base.race),
    noteCoach: buildNoteCoach(H, base.race),
  };
}

// ─── SCORE DE PRÉPARATION ────────────────────────────────────────────────
// Mix : forme actuelle (40%) + régularité 12 dernières semaines (30%)
// + volume 4 dernières semaines vs cible Ironman (30%)
function computePrep(H) {
  const lastWeeks = H.weeks.slice(-12);
  const recent4 = H.weeks.slice(-4);

  // 1. Forme actuelle (explainScore)
  let forme = 60;
  if (window.explainScore) {
    try {
      const ex = window.explainScore("benoit");
      if (ex && typeof ex.score === "number") forme = ex.score;
    } catch (e) { /* ignore */ }
  }

  // 2. Régularité : % de semaines avec ≥5 sessions sur les 12 dernières
  const strong = lastWeeks.filter(w => (w.metrics.session_count || 0) >= 5).length;
  const regularite = Math.round((strong / Math.max(1, lastWeeks.length)) * 100);

  // 3. Volume moyen récent (4 dernières semaines, hors W16 tronquée)
  const full = recent4.filter(w => w.days_count >= 6);
  const avgVol = full.length
    ? full.reduce((s, w) => s + (w.metrics.volume_min || 0), 0) / full.length
    : 0;
  // Cible Ironman build = ~15h/semaine = 900min. Ratio plafonné à 100.
  const volumeScore = Math.min(100, Math.round((avgVol / 900) * 100));

  const prepScore = Math.round(forme * 0.4 + regularite * 0.3 + volumeScore * 0.3);

  // Pénalité si épisode immunitaire sur semaine en cours ou précédente
  const lastW = H.weeks[H.weeks.length - 1];
  const prevW = H.weeks[H.weeks.length - 2];
  const recentSick = (lastW && lastW.signature === "Choc immunitaire")
                  || (prevW && prevW.signature === "Choc immunitaire");
  const adjusted = recentSick ? Math.max(0, prepScore - 8) : prepScore;

  let label, message;
  if (adjusted >= 75) {
    label = "Forme de course";
    message = `Forme ${forme}, régularité ${regularite}%, volume ${Math.round(avgVol / 60)}h/sem. Tu es sur la bonne trajectoire pour Thun.`;
  } else if (adjusted >= 60) {
    label = "En bonne voie";
    message = recentSick
      ? `Épisode immunitaire récent pris en compte. Forme ${forme}, volume moyen ${Math.round(avgVol / 60)}h. Reprise progressive, on ne court pas après le retard.`
      : `Forme ${forme}, régularité ${regularite}% des semaines à 5+ sessions, volume moyen ${Math.round(avgVol / 60)}h/sem. La marge est là, faut construire.`;
  } else if (adjusted >= 45) {
    label = "Consolidation nécessaire";
    message = `Volume (${Math.round(avgVol / 60)}h/sem) en dessous de la cible Ironman (~15h). Régularité à travailler (${regularite}%).`;
  } else {
    label = "Base à construire";
    message = `Forme ${forme}, régularité ${regularite}%. Il reste du chemin — priorité à la constance et à la santé.`;
  }

  return { prepScore: adjusted, prepLabel: label, prepMessage: message };
}

// ─── BENCHMARKS RÉELS ────────────────────────────────────────────────────
function computeBenchmarks(H) {
  const last28 = H.daily.slice(-28);

  // HRV baseline (moyenne 28j sur données non-null)
  const hrvVals = last28.filter(d => d.hrv != null).map(d => d.hrv);
  const hrvAvg = hrvVals.length ? Math.round(hrvVals.reduce((a, b) => a + b, 0) / hrvVals.length) : null;

  // Volume hebdo moyen (4 dernières semaines pleines)
  const fullWeeks = H.weeks.slice(-6).filter(w => w.days_count >= 6);
  const recent4 = fullWeeks.slice(-4);
  const avgVolMin = recent4.length
    ? recent4.reduce((s, w) => s + (w.metrics.volume_min || 0), 0) / recent4.length
    : 0;
  const avgVolH = avgVolMin / 60;

  // Plus longue session vélo / course des 12 dernières semaines
  let longestBikeMin = 0, longestRunMin = 0;
  const lastWeeksDaily = H.daily.slice(-84);
  lastWeeksDaily.forEach(d => {
    (d.activities || []).forEach(a => {
      const t = a.type || "";
      const dur = a.duration_min || 0;
      if (t.includes("Ride") && dur > longestBikeMin) longestBikeMin = dur;
      if (t.includes("Run") && dur > longestRunMin) longestRunMin = dur;
    });
  });

  // Sommeil moyen 28j
  const sleepVals = last28.filter(d => d.sleep && d.sleep.hours != null).map(d => d.sleep.hours);
  const sleepAvg = sleepVals.length ? sleepVals.reduce((a, b) => a + b, 0) / sleepVals.length : null;

  // Récupération moyenne 28j
  const recVals = last28.filter(d => d.recovery != null).map(d => d.recovery);
  const recAvg = recVals.length ? Math.round(recVals.reduce((a, b) => a + b, 0) / recVals.length) : null;

  const bench = [];

  // Volume hebdo (cible 15h Ironman build)
  bench.push(mkBench(
    "Volume hebdo",
    `${avgVolH.toFixed(1)}h`,
    "15h",
    "4 dernières semaines",
    clampPct((avgVolH / 15) * 100),
    colorFromPct(avgVolH / 15)
  ));

  // Longue sortie vélo (cible 5h30 = 330min pour Ironman)
  bench.push(mkBench(
    "Longue sortie vélo",
    fmtHMin(longestBikeMin),
    "5h30",
    "record 12 sem.",
    clampPct((longestBikeMin / 330) * 100),
    colorFromPct(longestBikeMin / 330)
  ));

  // Longue sortie course (cible 2h30 = 150min)
  bench.push(mkBench(
    "Longue sortie course",
    fmtHMin(longestRunMin),
    "2h30",
    "record 12 sem.",
    clampPct((longestRunMin / 150) * 100),
    colorFromPct(longestRunMin / 150)
  ));

  // HRV baseline
  if (hrvAvg != null) {
    bench.push(mkBench(
      "HRV baseline",
      `${hrvAvg}ms`,
      "≥35ms",
      "moyenne 28j",
      clampPct((hrvAvg / 40) * 100),
      colorFromPct(hrvAvg / 35)
    ));
  }

  // Sommeil
  if (sleepAvg != null) {
    bench.push(mkBench(
      "Sommeil moyen",
      `${sleepAvg.toFixed(1)}h`,
      "8h",
      "moyenne 28j",
      clampPct((sleepAvg / 8) * 100),
      colorFromPct(sleepAvg / 7.5)
    ));
  }

  // Récupération moyenne
  if (recAvg != null) {
    bench.push(mkBench(
      "Récupération moy.",
      `${recAvg}%`,
      "≥70%",
      "moyenne 28j",
      recAvg,
      colorFromPct(recAvg / 70)
    ));
  }

  return bench;
}

function mkBench(label, actuel, cible, unite, pct, couleur) {
  return { label, cible, actuel, unite, pct: Math.round(pct), couleur };
}

function clampPct(p) {
  return Math.max(0, Math.min(100, p));
}

function colorFromPct(ratio) {
  if (ratio >= 0.85) return "#00D4AA";
  if (ratio >= 0.65) return "#FFD166";
  return "#FF6B6B";
}

function fmtHMin(min) {
  if (!min) return "—";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m}min`;
}

// ─── TIMELINE : événements passés + jalons futurs ───────────────────────
function buildJalons(H, race) {
  const past = [];
  const now = new Date("2026-04-19T12:00:00Z"); // Date courante mockup
  const raceDate = new Date(race.dateISO);

  // Événements passés : on regroupe les semaines consécutives de "Choc immunitaire"
  // en un seul épisode, on garde les races, on limite au 3 plus récents événements
  const incidents = [];
  let illnessRun = null;
  H.weeks.forEach(w => {
    const isSick = w.incidents.illness && w.signature === "Choc immunitaire";
    if (isSick) {
      if (illnessRun) {
        illnessRun.endDate = w.end_date;
        illnessRun.weeks += 1;
      } else {
        illnessRun = { type: "illness", date: w.start_date, endDate: w.end_date, weeks: 1, week: w };
      }
    } else {
      if (illnessRun) { incidents.push(illnessRun); illnessRun = null; }
    }
    if (w.incidents.race) {
      incidents.push({ type: "race", date: w.start_date, week: w });
    }
  });
  if (illnessRun) incidents.push(illnessRun);

  const recentIncidents = incidents.slice(-3);
  recentIncidents.forEach(inc => {
    const d = new Date(inc.date);
    if (inc.type === "illness") {
      const duree = inc.weeks > 1 ? `sur ${inc.weeks} semaines` : "1 semaine";
      past.push({
        _sort: d.getTime(),
        date: fmtShortDate(d),
        label: "Épisode immunitaire",
        statut: "done",
        note: `Grippe — arrêt ${duree}. Reprise gérée progressivement, pas de rattrapage forcé.`,
      });
    } else if (inc.type === "race") {
      const ev = (inc.week.events || []).find(e => e.type === "race");
      past.push({
        _sort: d.getTime(),
        date: fmtShortDate(d),
        label: ev ? ev.context.label : "Course test",
        statut: "done",
        note: ev ? `Durée ${ev.context.duration}min · effort ${ev.context.effort}` : "",
      });
    }
  });

  // Dernière semaine charge record
  const strongWeeks = H.weeks.slice(-20).filter(w => w.metrics.session_count >= 8 && w.days_count >= 6);
  if (strongWeeks.length) {
    const peak = strongWeeks.reduce((a, b) => (a.metrics.volume_min > b.metrics.volume_min ? a : b));
    past.push({
      _sort: new Date(peak.start_date).getTime(),
      date: fmtShortDate(new Date(peak.start_date)),
      label: `Pic charge · ${peak.signature}`,
      statut: "done",
      note: `${peak.metrics.session_count} séances · ${Math.round(peak.metrics.volume_min / 60)}h · ACWR ${peak.metrics.acwr || "—"}`,
    });
  }

  // Tri chronologique des événements passés, on garde les 4 plus récents
  past.sort((a, b) => a._sort - b._sort);
  const keptPast = past.slice(-4).map(j => { delete j._sort; return j; });

  // Jalon courant : reprise post-maladie (inferTrainingState)
  let currentJalon = null;
  if (window.inferTrainingState) {
    try {
      const state = window.inferTrainingState();
      if (state.mode === "recovery") {
        currentJalon = {
          date: fmtShortDate(now),
          label: "Reprise douce",
          statut: "current",
          note: state.reason + " — volume plafonné, pas d'intensité.",
        };
      } else if (state.mode === "deload") {
        currentJalon = {
          date: fmtShortDate(now),
          label: "Semaine de décharge",
          statut: "current",
          note: state.reason,
        };
      } else {
        currentJalon = {
          date: fmtShortDate(now),
          label: `Phase ${state.mode}`,
          statut: "current",
          note: state.reason,
        };
      }
    } catch (e) { /* ignore */ }
  }
  if (!currentJalon) {
    currentJalon = { date: fmtShortDate(now), label: "Phase en cours", statut: "current", note: "" };
  }

  const futureJalons = buildFutureIronmanJalons(now, raceDate);
  return [...keptPast, currentJalon, ...futureJalons];
}

function buildFutureIronmanJalons(now, raceDate) {
  const jalons = [];
  const daysToRace = Math.floor((raceDate - now) / (86400000));

  // Liste canonique des jalons IM (distance à la course en jours)
  const blueprint = [
    { dBefore: 70, label: "Retour volume complet",  note: "Fin de la phase reprise — consolidation Z2" },
    { dBefore: 56, label: "Premier 4h vélo",         note: "Test sortie longue — allure endurance fondamentale" },
    { dBefore: 49, label: "Brique 3h vélo + 45min CAP", note: "Simulation enchaînement" },
    { dBefore: 35, label: "Sortie longue 5h vélo",   note: "Dénivelé parcours Thun simulé" },
    { dBefore: 28, label: "30km course allure IM",   note: "Dernier test allure marathon — ne pas exploser" },
    { dBefore: 21, label: "Semi-marathon test",      note: "Dernière course forte — seuil validé" },
    { dBefore: 14, label: "Semaine de réduction",    note: "Volume -40%, intensité maintenue" },
    { dBefore: 7,  label: "Départ pour Thun",        note: "Arrivée J-7. Repérage parcours, acclimatation." },
    { dBefore: 0,  label: "🏁 IRONMAN SWITZERLAND THUN", note: "Départ 6h30. Temps cible : 11h30-12h00.", race: true },
  ];

  blueprint.forEach(b => {
    if (b.dBefore > daysToRace) return; // déjà dépassé
    const d = new Date(raceDate.getTime() - b.dBefore * 86400000);
    jalons.push({
      date: fmtShortDate(d),
      label: b.label,
      statut: b.race ? "race" : "upcoming",
      note: b.note,
    });
  });

  return jalons;
}

function fmtShortDate(d) {
  const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  return `${d.getDate()} ${MOIS[d.getMonth()]}`;
}

// ─── NOTE COACH ──────────────────────────────────────────────────────────
function buildNoteCoach(H, race) {
  const now = new Date("2026-04-19T12:00:00Z");
  const raceDate = new Date(race.dateISO);
  const daysToRace = Math.floor((raceDate - now) / 86400000);
  const lastWeek = H.weeks[H.weeks.length - 1];
  const prevWeek = H.weeks[H.weeks.length - 2];

  let state = null;
  if (window.inferTrainingState) {
    try { state = window.inferTrainingState(); } catch (e) {}
  }

  const recentSick = (lastWeek && lastWeek.signature === "Choc immunitaire")
                  || (prevWeek && prevWeek.signature === "Choc immunitaire");

  if (recentSick) {
    const jSince = state && state.illnessDaysSince != null ? state.illnessDaysSince : null;
    const since = jSince != null ? `J+${jSince} depuis la dernière trace de maladie.` : "";
    return `Benoît, ${daysToRace} jours avant Thun. ${since} On ne rattrape pas la semaine perdue — on reprend proprement. Les 6 prochaines semaines de build suffisent largement si tu respectes la progression : +10% de volume max par semaine, et la priorité absolue reste le sommeil. L'Ironman se gagne en santé, pas en forçant.`;
  }

  const avgVolMin = H.weeks.slice(-4).filter(w => w.days_count >= 6)
    .reduce((s, w) => s + (w.metrics.volume_min || 0), 0) / 4;
  const avgH = Math.round(avgVolMin / 60);

  if (daysToRace < 14) {
    return `Benoît, ${daysToRace} jours. Taper engagé : baisse le volume, garde les sensations. Chaque séance est courte, qualitative. Dors 8h minimum.`;
  }
  if (daysToRace < 56) {
    return `Benoît, ${daysToRace} jours avant Thun. Tu es en phase peak : volume moyen ${avgH}h/sem sur les 4 dernières. On maintient le cap, on évite les sessions héroïques qui cassent. Sortie longue vélo toutes les semaines, allure IM validée deux fois avant taper.`;
  }
  return `Benoît, ${daysToRace} jours. Phase build solide : volume moyen ${avgH}h/sem, signature actuelle "${lastWeek.signature}". Focus : consolidation aérobie, longue sortie vélo de +10% toutes les 2 semaines, et 2 séances spécifiques par discipline par semaine.`;
}

// ─── RACE CARD ───
function rendreRaceCard(d) {
  document.getElementById("raceNom").textContent = d.race.nom;
  document.getElementById("raceDate").textContent = d.race.dateStr;
  document.getElementById("raceBadge").textContent = d.race.badge;
  document.getElementById("raceIcone").textContent = d.race.icone;

  // Countdown — utilise la date mockup courante (2026-04-19) pour cohérence
  const now = new Date("2026-04-19T12:00:00Z");
  const race = new Date(d.race.dateISO);
  const diff = race - now;
  const jours = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  const semaines = Math.floor(jours / 7);
  const joursRest = jours % 7;

  document.getElementById("countdown").innerHTML = [
    { val: semaines, label: "semaines" },
    { val: joursRest, label: "jours" },
  ].map(c => `
    <div style="background:rgba(255,255,255,0.05);border:1px solid #2A2D3E;border-radius:12px;padding:12px 16px;text-align:center;min-width:70px;">
      <div style="font-size:2rem;font-weight:900;color:#F0F0F5;line-height:1;">${c.val}</div>
      <div style="font-size:0.7rem;color:#8B8FA8;margin-top:2px;">${c.label}</div>
    </div>`).join("");

  const planStart = new Date(d.race.planStart);
  const totalDuration = race - planStart;
  const elapsed = now - planStart;
  const pct = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));

  setTimeout(() => {
    document.getElementById("raceProgressBar").style.width = pct + "%";
  }, 100);
  document.getElementById("progressPct").textContent = pct + "%";

  const optionsDate = { day: "numeric", month: "long", year: "numeric" };
  document.getElementById("startLabel").textContent = planStart.toLocaleDateString("fr-FR", optionsDate);
  document.getElementById("endLabel").textContent = race.toLocaleDateString("fr-FR", optionsDate);
}

// ─── SCORE PRÉPARATION ───
function rendrePrep(d) {
  const score = d.prepScore;
  const circ = 2 * Math.PI * 54;
  const offset = circ - (score / 100) * circ;
  setTimeout(() => {
    document.getElementById("prepRing").style.strokeDashoffset = offset;
  }, 150);
  document.getElementById("prepScore").textContent = score;
  document.getElementById("prepLabel").textContent = d.prepLabel;
  document.getElementById("prepMessage").textContent = d.prepMessage;

  const couleur = score >= 70 ? "#00D4AA" : score >= 50 ? "#FFD166" : "#FF6B6B";
  document.getElementById("prepScore").style.color = couleur;
  document.getElementById("prepLabel").style.color = couleur;
}

// ─── BENCHMARKS ───
function rendreBenchmarks(benchmarks) {
  if (!benchmarks || !benchmarks.length) {
    document.getElementById("benchmarks").innerHTML =
      `<p style="color:#8B8FA8;font-size:0.85rem;">Lance un sync Strava pour activer les benchmarks.</p>`;
    return;
  }
  document.getElementById("benchmarks").innerHTML = benchmarks.map(b => `
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
        <div>
          <span style="font-size:0.85rem;font-weight:600;color:#F0F0F5;">${b.label}</span>
          <span style="font-size:0.72rem;color:#555870;margin-left:6px;">${b.unite}</span>
        </div>
        <div style="text-align:right;">
          <span style="font-size:0.82rem;font-weight:700;color:${b.couleur};">${b.actuel}</span>
          <span style="font-size:0.75rem;color:#555870;"> → ${b.cible}</span>
        </div>
      </div>
      <div class="progress-bar" style="height:5px;">
        <div class="progress-fill ring-animated" style="width:${b.pct}%;background:${b.couleur};"></div>
      </div>
    </div>`).join("");
}

// ─── TIMELINE ───
function rendreTimeline(jalons) {
  const restants = jalons.filter(j => j.statut === "upcoming" || j.statut === "race").length;
  document.getElementById("jalonsRestants").textContent = `${restants} jalons restants`;

  const statuts = {
    done:     { couleur: "#00D4AA", bg: "rgba(0,212,170,0.1)",    border: "rgba(0,212,170,0.3)",   icone: "✓",  label: "Accompli" },
    current:  { couleur: "#6C63FF", bg: "rgba(108,99,255,0.15)", border: "rgba(108,99,255,0.4)",  icone: "◉",  label: "En cours" },
    upcoming: { couleur: "#8B8FA8", bg: "rgba(139,143,168,0.08)", border: "#2A2D3E",               icone: "○",  label: "" },
    race:     { couleur: "#FFD166", bg: "rgba(255,209,102,0.12)", border: "rgba(255,209,102,0.4)", icone: "🏁", label: "Jour J" },
  };

  const tl = document.getElementById("timeline");
  tl.innerHTML = `<div style="position:absolute;left:10px;top:0;bottom:0;width:2px;background:linear-gradient(to bottom,#6C63FF,#2A2D3E);border-radius:1px;"></div>`;

  jalons.forEach((j) => {
    const s = statuts[j.statut];
    const isRace = j.statut === "race";

    const item = document.createElement("div");
    item.style.cssText = "position:relative;display:flex;gap:16px;margin-bottom:16px;align-items:flex-start;";

    item.innerHTML = `
      <div style="flex-shrink:0;width:22px;height:22px;border-radius:50%;background:${s.bg};border:2px solid ${s.border};display:flex;align-items:center;justify-content:center;font-size:${isRace ? "0.75rem" : "0.7rem"};color:${s.couleur};font-weight:700;z-index:1;margin-top:2px;">${s.icone}</div>

      <div style="flex:1;background:${s.bg};border:1px solid ${s.border};border-radius:12px;padding:12px 14px;${j.statut === "current" ? "box-shadow:0 0 0 3px rgba(108,99,255,0.1);" : ""}">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${j.note ? "4px" : "0"};">
          <span style="font-size:${isRace ? "0.95rem" : "0.87rem"};font-weight:${isRace ? "800" : "600"};color:${s.couleur};">${j.label}</span>
          <div style="display:flex;align-items:center;gap:8px;">
            ${s.label ? `<span style="font-size:0.68rem;font-weight:600;color:${s.couleur};text-transform:uppercase;letter-spacing:0.05em;">${s.label}</span>` : ""}
            <span style="font-size:0.75rem;color:#555870;">${j.date}</span>
          </div>
        </div>
        ${j.note ? `<p style="font-size:0.8rem;color:#8B8FA8;line-height:1.45;">${j.note}</p>` : ""}
      </div>`;

    tl.appendChild(item);
  });
}

// ─── LOT 45 : CHECKLIST J-1 ─────────────────────
const CHECKLIST_KEY = "coach-ia:checklist-thun";
const CHECKLIST_GROUPS = [
  {
    icon: "🚴",
    title: "Matériel vélo",
    items: [
      "Vélo révisé (chaîne, freins, pneus)",
      "Roues course + 1 chambre à air de secours",
      "Porte-bidon x 2 + bidons remplis",
      "Boîtier gels + ruban adhésif",
      "Compteur chargé + écran lisible soleil",
      "Casque et chaussures vélo",
    ],
  },
  {
    icon: "🏊",
    title: "Matériel natation",
    items: [
      "Combinaison testée (sous 22°C autorisée)",
      "Lunettes claires + miroir de rechange",
      "Bonnet officiel fourni",
      "Trisuit enfilé sous combi",
    ],
  },
  {
    icon: "🏃",
    title: "Matériel course",
    items: [
      "Chaussures de course rodées (pas neuves)",
      "Chaussettes anti-ampoules",
      "Casquette + lunettes de soleil",
      "Crème solaire (bâton pour retouches)",
      "Ceinture porte-dossard",
    ],
  },
  {
    icon: "🍌",
    title: "Nutrition / hydratation",
    items: [
      "Gels course (nombre × 1,5 en réserve)",
      "Barres solides vélo",
      "Pastilles de sel (électrolytes)",
      "Boisson isotonique préparée en poudre",
      "Petit-déjeuner J-0 préparé/emballé",
    ],
  },
  {
    icon: "📋",
    title: "Logistique / admin",
    items: [
      "Licence + pièce d'identité",
      "Puce de chronométrage récupérée",
      "Dossard natation/vélo/course affichés",
      "Sacs T1/T2 remplis et étiquetés",
      "Vélo déposé sur le parc",
      "Itinéraire maison → départ vérifié",
    ],
  },
  {
    icon: "🧠",
    title: "Mental / corps",
    items: [
      "Dernière séance très légère faite",
      "Carb-loading engagé depuis J-3",
      "Visualisation du parcours faite 2×",
      "Alarme réglée + 1 alarme de secours",
      "Couché avant 22h30",
    ],
  },
];

function _checklistLoad() {
  try { return JSON.parse(localStorage.getItem(CHECKLIST_KEY) || "{}"); } catch { return {}; }
}
function _checklistSave(state) {
  localStorage.setItem(CHECKLIST_KEY, JSON.stringify(state));
}

function rendreChecklist(race) {
  const card = document.getElementById("checklistCard");
  if (!card || !race?.dateISO) { if (card) card.style.display = "none"; return; }

  const daysToRace = Math.floor((new Date(race.dateISO) - new Date()) / 86400000);
  // Affiche dès J-90 pour préparation anticipée
  if (daysToRace > 90 || daysToRace < -1) { card.style.display = "none"; return; }
  card.style.display = "block";

  document.getElementById("checklistSub").textContent =
    daysToRace > 14 ? `J-${daysToRace} · anticipation` :
    daysToRace > 7 ? `J-${daysToRace} · préparation matérielle` :
    daysToRace > 1 ? `J-${daysToRace} · finalisation` :
    daysToRace === 1 ? "J-1 · dernière vérification" : "Jour J";

  const state = _checklistLoad();
  const total = CHECKLIST_GROUPS.reduce((n, g) => n + g.items.length, 0);
  let done = 0;
  CHECKLIST_GROUPS.forEach(g => g.items.forEach(i => { if (state[g.title + "::" + i]) done++; }));

  const badge = document.getElementById("checklistBadge");
  badge.textContent = `${done}/${total}`;
  badge.className = "badge " + (done === total ? "badge-teal" : done >= total / 2 ? "badge-violet" : "badge-coral");

  document.getElementById("checklistBar").style.width = total > 0 ? `${(done / total) * 100}%` : "0%";
  document.getElementById("checklistProgress").textContent = `${done} / ${total} items`;

  const groupsEl = document.getElementById("checklistGroups");
  groupsEl.innerHTML = CHECKLIST_GROUPS.map((g, gi) => {
    const groupDone = g.items.filter(i => state[g.title + "::" + i]).length;
    return `
      <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;">
          <div style="font-size:0.88rem;font-weight:700;color:#F0F0F5;">${g.icon} ${g.title}</div>
          <div style="font-size:0.72rem;color:${groupDone === g.items.length ? "#00D4AA" : "#8B8FA8"};font-weight:600;">${groupDone}/${g.items.length}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${g.items.map((item, ii) => {
            const key = g.title + "::" + item;
            const checked = !!state[key];
            return `
              <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:6px 8px;border-radius:6px;transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
                <input type="checkbox" ${checked ? "checked" : ""} data-key="${key.replace(/"/g, "&quot;")}" style="width:16px;height:16px;accent-color:#6C63FF;cursor:pointer;flex-shrink:0;"/>
                <span style="font-size:0.82rem;color:${checked ? "#8B8FA8" : "#D0D0E0"};${checked ? "text-decoration:line-through;" : ""}line-height:1.4;">${item}</span>
              </label>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }).join("");

  // Bind checkboxes
  groupsEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener("change", () => {
      const state = _checklistLoad();
      state[cb.dataset.key] = cb.checked;
      _checklistSave(state);
      rendreChecklist(race);
    });
  });

  // Reset button
  const resetBtn = document.getElementById("checklistReset");
  if (resetBtn && !resetBtn.dataset.bound) {
    resetBtn.dataset.bound = "1";
    resetBtn.addEventListener("click", () => {
      if (confirm("Réinitialiser la checklist ?")) {
        localStorage.removeItem(CHECKLIST_KEY);
        rendreChecklist(race);
      }
    });
  }
}

// ─── LOT 48 : PLANIF POST-THUN ─────────────────────
const POST_RACE_PHASES = [
  {
    id: "recup-totale",
    jours: "J+0 → J+3",
    titre: "Récup totale",
    icon: "🛌",
    color: "#FF6B6B",
    angle: "Zéro entraînement. Le corps a encaissé un trauma musculaire et immunitaire majeur.",
    points: [
      "Sommeil prioritaire : 9-10h + sieste",
      "Nutrition anti-inflammatoire : protéines, oméga 3, fruits/légumes colorés",
      "Hydratation 3L+/jour pendant 72h",
      "Aucune activité structurée — marche 15-20min max",
    ],
  },
  {
    id: "reconstruction",
    jours: "J+4 → J+14",
    titre: "Reconstruction tissulaire",
    icon: "🚶",
    color: "#FFD166",
    angle: "Activité douce uniquement. Tes fibres se reconstruisent, tes articulations désinflamment.",
    points: [
      "Marche active 30-45min tous les 2 jours",
      "Vélo Z1 sur home trainer 20-30min si envie (pas obligation)",
      "Mobilité + étirements doux 10min/jour",
      "Reprise natation douce possible à partir de J+7 (drainage excellent)",
      "Si douleur persistante : imagerie systématique, pas d'attente",
    ],
  },
  {
    id: "relance-progressive",
    jours: "J+15 → J+28",
    titre: "Relance progressive",
    icon: "🔄",
    color: "#6C63FF",
    angle: "Retour à 40-60% du volume pré-course. Zéro intensité. Priorité : reconstruire le socle.",
    points: [
      "Semaine 3 : 50% du volume habituel, uniquement Z1-Z2",
      "Semaine 4 : 70% du volume, réintroduire allure course sur efforts courts",
      "Pas de séance longue avant J+21 minimum",
      "Aucun bloc qualité/intensité avant J+28",
      "Test HRV baseline à J+21 — confirmer la bonne récup avant toute relance",
    ],
  },
  {
    id: "transition",
    jours: "Août → début septembre",
    titre: "Transition / saison B",
    icon: "🎯",
    color: "#00D4AA",
    angle: "Volume retrouvé, intensité réintroduite progressivement. Option B-race ou vraie pause active.",
    points: [
      "Retour complet à l'entraînement structuré",
      "Possible course B (semi ou trail 30-50km) fin août — 6-8 semaines post-Thun",
      "Phase idéale pour travailler les points faibles (force spécifique natation ou course)",
      "Si pas de B-race : 3-4 semaines de maintien + 1 semaine OFF totale pour recharger",
    ],
  },
  {
    id: "planif-2027",
    jours: "Octobre → novembre",
    titre: "Planification saison 2027",
    icon: "📅",
    color: "#A9A3FF",
    angle: "Recul, bilan, choix de la prochaine course cible. Moment stratégique.",
    points: [
      "Bilan complet saison 2026 : forces, points faibles, données physio clés",
      "Choix course A 2027 : même type (IM) ou format différent (70.3, trail long, ultra) ?",
      "Si IM : ouvrir les inscriptions top-4 mois à l'avance selon destination",
      "Reprise structurée = novembre avec phase foncière longue (12-16 semaines)",
    ],
  },
];

const POST_RACE_NEXT_GOALS = [
  {
    icon: "🏔️",
    titre: "Ironman Lanzarote 2027",
    detail: "Course plus exigeante (vent, dénivelé) — saison prochaine si Thun se passe bien. Volume à +10%, spécifique vélo long en côte.",
    tag: "Ambition",
    color: "#FF6B6B",
  },
  {
    icon: "🥇",
    titre: "Objectif Kona qualification",
    detail: "Classement AG top 5% sur Thun 2026 ouvrirait le slot. Stratégie : viser sub-10h30 à Thun → garder marge sur IM 2027 pour qualif.",
    tag: "Long terme",
    color: "#FFD700",
  },
  {
    icon: "🌲",
    titre: "Transition trail / ultra",
    detail: "Explorer format très long-nature (TDS, Diagonale) en 2027 ou 2028. Capitaliser sur l'endurance construite, diversifier le stimulus.",
    tag: "Diversification",
    color: "#00D4AA",
  },
  {
    icon: "👥",
    titre: "Premiers coachings IA-assistés",
    detail: "Post-Thun = moment idéal pour démarrer l'accompagnement de 2-3 athlètes amateurs avec l'outil. Transfert de ton expérience réelle.",
    tag: "Projet pro",
    color: "#6C63FF",
  },
];

function rendrePostRace(race) {
  const card = document.getElementById("postRaceCard");
  if (!card || !race?.dateISO) { if (card) card.style.display = "none"; return; }

  const now = new Date();
  const raceDate = new Date(race.dateISO);
  const daysToRace = Math.floor((raceDate - now) / 86400000);

  // N'afficher qu'à partir de J-30 (pertinence projection)
  if (daysToRace > 30) { card.style.display = "none"; return; }
  card.style.display = "block";

  const sub = document.getElementById("postRaceSub");
  if (sub) sub.textContent = daysToRace > 0
    ? `J-${daysToRace} avant Thun — projection au-delà de la ligne d'arrivée`
    : daysToRace === 0
    ? "Jour J — voici ce qui t'attend après la course"
    : `J+${Math.abs(daysToRace)} post-Thun — phase en cours mise en évidence`;

  const badge = document.getElementById("postRaceBadge");
  if (badge) {
    badge.textContent = "5 phases";
    badge.className = "badge badge-violet";
  }

  // Détermine la phase courante si post-course
  let currentPhaseId = null;
  if (daysToRace <= 0) {
    const postDays = Math.abs(daysToRace);
    if (postDays <= 3) currentPhaseId = "recup-totale";
    else if (postDays <= 14) currentPhaseId = "reconstruction";
    else if (postDays <= 28) currentPhaseId = "relance-progressive";
    else if (postDays <= 75) currentPhaseId = "transition";
    else currentPhaseId = "planif-2027";
  }

  const timeline = document.getElementById("postRaceTimeline");
  if (timeline) {
    timeline.innerHTML = POST_RACE_PHASES.map(p => {
      const isCurrent = p.id === currentPhaseId;
      const highlight = isCurrent ? `box-shadow:0 0 0 2px ${p.color};` : "";
      return `
        <div style="display:flex;gap:14px;padding:14px 16px;background:rgba(255,255,255,0.02);border-left:3px solid ${p.color};border-radius:8px;${highlight}">
          <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:4px;">
            <div style="font-size:1.4rem;">${p.icon}</div>
            ${isCurrent ? `<div style="font-size:0.65rem;color:${p.color};font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">En cours</div>` : ""}
          </div>
          <div style="flex:1;">
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px;">
              <div style="font-size:0.9rem;color:#F0F0F5;font-weight:700;">${p.titre}</div>
              <div style="font-size:0.7rem;color:${p.color};font-weight:600;">${p.jours}</div>
            </div>
            <div style="font-size:0.78rem;color:#D0D0E0;line-height:1.45;margin-bottom:8px;">${p.angle}</div>
            <ul style="margin:0;padding-left:16px;display:flex;flex-direction:column;gap:3px;">
              ${p.points.map(pt => `<li style="font-size:0.76rem;color:#8B8FA8;line-height:1.5;">${pt}</li>`).join("")}
            </ul>
          </div>
        </div>
      `;
    }).join("");
  }

  const nextList = document.getElementById("postRaceNextList");
  if (nextList) {
    nextList.innerHTML = POST_RACE_NEXT_GOALS.map(g => `
      <div style="display:flex;gap:12px;padding:10px 12px;background:rgba(255,255,255,0.03);border-radius:7px;">
        <div style="font-size:1.1rem;flex-shrink:0;">${g.icon}</div>
        <div style="flex:1;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px;gap:8px;">
            <div style="font-size:0.82rem;color:#F0F0F5;font-weight:700;">${g.titre}</div>
            <span style="font-size:0.65rem;color:${g.color};border:1px solid ${g.color};border-radius:4px;padding:2px 6px;white-space:nowrap;">${g.tag}</span>
          </div>
          <div style="font-size:0.74rem;color:#8B8FA8;line-height:1.45;">${g.detail}</div>
        </div>
      </div>
    `).join("");
  }

  const narrative = document.getElementById("postRaceNarrative");
  if (narrative) {
    narrative.textContent = daysToRace > 0
      ? "Penser à l'après avant de passer la ligne évite le syndrome post-IM : vide, blues, perte de cap. Le projet 2027 se prépare pendant que 2026 se termine."
      : "Tu es dans la phase de récupération. Chaque étape se respecte à la lettre — la récup est une séance d'entraînement à part entière.";
  }
}

// ─── LOT 39 : PLAN NUTRITION PRE-RACE ─────────────────────
function rendreRaceNutrition(race) {
  const card = document.getElementById("raceNutritionCard");
  if (!card || !race?.dateISO) { if (card) card.style.display = "none"; return; }
  card.style.display = "block";

  const now = new Date();
  const raceDate = new Date(race.dateISO);
  const daysToRace = Math.floor((raceDate - now) / 86400000);

  document.getElementById("raceNutritionSub").textContent =
    `Pour ${race.nom || "Ironman Thun"} · J-${Math.max(0, daysToRace)}`;

  // Estimation poids Benoit (profile.js défaut 75kg sinon)
  const weight = window.PROFILE?.weight_kg || 75;

  // Gut training actuel via observations
  let gutCurrent = null;
  try {
    const obs = JSON.parse(localStorage.getItem("coach-ia:obs") || "[]")
      .filter(o => o.signal_id === "gut_carbs_per_hour" && o.athlete_id === "benoit")
      .slice(-5);
    if (obs.length) gutCurrent = Math.round(obs.reduce((s, o) => s + o.raw_value, 0) / obs.length);
  } catch {}

  // Cibles
  const carbLoadDailyG = Math.round(weight * 9); // 8-10g/kg/j
  const breakfastCarbsG = Math.round(weight * 2); // ~2g/kg 3h avant
  const duringCarbsTarget = 80; // g/h cible Ironman
  const duringCarbsNow = gutCurrent || 65;
  const sodiumMgH = 800; // standard chaude
  const fluidMlH = 600;

  document.getElementById("raceNutritionCarbload").textContent =
    `~${carbLoadDailyG}g glucides/j (${weight}kg × 9). Pâtes, riz, patate. Fibres ↓.`;
  document.getElementById("raceNutritionBreakfast").textContent =
    `${breakfastCarbsG}g glucides (pain blanc + miel + banane). Café OK.`;
  document.getElementById("raceNutritionDuring").textContent =
    `Cible ${duringCarbsTarget}g/h (actuel ${duringCarbsNow}g/h). Gels + barres + boisson.`;
  document.getElementById("raceNutritionHydra").textContent =
    `${fluidMlH}ml/h + ${sodiumMgH}mg sel/h. Plus si chaleur.`;

  // Timeline J-3 → J+0
  const steps = [
    { when: "J-3", icon: "🍝", title: "Début carb-loading", detail: `Augmenter progressivement à ${carbLoadDailyG}g de glucides/jour. Réduire fibres et graisses. Dormir 8h+.` },
    { when: "J-2", icon: "💧", title: "Hydratation renforcée", detail: `3L d'eau + électrolytes. Dernière sortie légère 30-40min Z1. Préparer les poches aux affaires.` },
    { when: "J-1", icon: "🛏️", title: "Veille — calme logistique", detail: `Check-in, vélo dépôt, préparer sacs T1/T2. Dîner glucides 19h. Pas de test de nouveauté alimentaire.` },
    { when: "J-0 -3h", icon: "☕", title: "Petit-déjeuner", detail: `${breakfastCarbsG}g glucides 3h avant départ. Café 1h avant. Gel 15min avant le départ natation.` },
    { when: "J-0 course", icon: "🏁", title: "Pendant course", detail: `${duringCarbsTarget}g glucides/h dès le vélo. 1 gel toutes les 25-30min. Eau + sel à chaque ravito run.` },
  ];

  document.getElementById("raceNutritionTimeline").innerHTML = steps.map(s => `
    <div style="display:flex;gap:12px;padding:10px 12px;background:rgba(255,255,255,0.02);border-radius:8px;">
      <div style="font-size:1.1rem;flex-shrink:0;">${s.icon}</div>
      <div style="flex:1;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px;">
          <div style="font-size:0.82rem;color:#F0F0F5;font-weight:700;">${s.title}</div>
          <div style="font-size:0.68rem;color:#A9A3FF;font-weight:700;letter-spacing:0.03em;">${s.when}</div>
        </div>
        <div style="font-size:0.76rem;color:#8B8FA8;line-height:1.4;">${s.detail}</div>
      </div>
    </div>
  `).join("");

  const rules = [
    "Jamais de nouveauté le jour J — tester toutes les marques à l'entraînement",
    "Boire avant la soif, manger avant la faim — le retard se paye cher",
    `Gut training actuel ${duringCarbsNow}g/h : ${duringCarbsNow >= 80 ? "cible atteinte" : `encore ${80 - duringCarbsNow}g/h à gagner d'ici juillet`}`,
    "Si nausée en course : ralentir + eau pure + gel solide → éviter les sodas sucrés",
  ];
  document.getElementById("raceNutritionRules").innerHTML = rules.map(r => `<li>${r}</li>`).join("");

  // Badge
  const badge = document.getElementById("raceNutritionBadge");
  if (daysToRace <= 3) {
    badge.textContent = "Carb-loading actif";
    badge.className = "badge badge-coral";
  } else if (duringCarbsNow >= 80) {
    badge.textContent = "Prêt";
    badge.className = "badge badge-teal";
  } else {
    badge.textContent = `+${80 - duringCarbsNow}g/h à gagner`;
    badge.className = "badge badge-violet";
  }

  // Narrative
  let narrative;
  if (daysToRace <= 7) {
    narrative = `À J-${daysToRace}, priorité = exécution, pas de nouveauté. Chaque gel, chaque ravito a déjà été testé sur tes longues sorties.`;
  } else if (duringCarbsNow < 80) {
    narrative = `Tu es à ${duringCarbsNow}g/h d'absorption — cible Ironman à 80g/h. ${80 - duringCarbsNow}g à gagner progressivement sur tes sorties vélo longues d'ici juillet. L'estomac s'entraîne comme un muscle.`;
  } else {
    narrative = `Absorption à ${duringCarbsNow}g/h : cible atteinte. Continuer à la maintenir sur les longues sorties, c'est ton avantage compétitif sur Thun.`;
  }
  document.getElementById("raceNutritionNarrative").textContent = narrative;
}

// ─── LOT 36 : TIMELINE ÉVÉNEMENTS 12 MOIS ─────────────────────
function rendreEventTimeline(race) {
  const card = document.getElementById("eventTimelineCard");
  if (!card || !window.HISTORY?.daily?.length) { if (card) card.style.display = "none"; return; }
  card.style.display = "block";

  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - 9);
  const end = new Date(race.dateISO || "2026-07-05");
  if (end - now < 30 * 86400000) end.setTime(now.getTime() + 90 * 86400000);

  document.getElementById("eventTimelineSub").textContent =
    `${start.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })} → ${end.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}`;

  // Détection d'épisodes "maladie" : séquences de ≥3 jours consécutifs avec journal.illness=true dans HISTORY
  const daily = window.HISTORY.daily;
  const illnessEpisodes = [];
  let run = null;
  for (const d of daily) {
    if (d.journal?.illness) {
      if (!run) run = { from: d.date, to: d.date, count: 1 };
      else { run.to = d.date; run.count++; }
    } else if (run) {
      if (run.count >= 2) illnessEpisodes.push(run);
      run = null;
    }
  }
  if (run && run.count >= 2) illnessEpisodes.push(run);

  // Détection pic de volume (semaine la plus chargée)
  let peakWeek = null;
  (window.HISTORY.weeks || []).forEach(w => {
    const vol = w.metrics?.volume_min || 0;
    if (!peakWeek || vol > (peakWeek.metrics?.volume_min || 0)) peakWeek = w;
  });

  // Événements
  const events = [];
  illnessEpisodes.forEach(e =>
    events.push({ date: e.to, label: `Épisode immunitaire (${e.count}j)`, type: "illness", color: "#FF6B6B", icon: "🤒" }));
  if (peakWeek) {
    events.push({
      date: peakWeek.start_date,
      label: `Semaine pic : ${Math.round((peakWeek.metrics.volume_min || 0) / 60)}h`,
      type: "peak",
      color: "#FFD166",
      icon: "⛰️",
    });
  }
  events.push({ date: race.dateISO, label: "🏁 Ironman Thun", type: "race", color: "#6C63FF", icon: "🏁", major: true });

  // Phases approx : base (>90j), build (42-90), peak (14-42), taper (<14)
  const phasesMarks = [
    { daysBefore: 90, label: "Base", color: "#A9A3FF" },
    { daysBefore: 42, label: "Build", color: "#00D4AA" },
    { daysBefore: 14, label: "Peak", color: "#FFD166" },
    { daysBefore: 0,  label: "Taper", color: "#FF6B6B" },
  ];
  const raceTs = new Date(race.dateISO).getTime();
  phasesMarks.forEach(p => {
    const t = raceTs - p.daysBefore * 86400000;
    if (t >= start.getTime() && t <= end.getTime()) {
      events.push({ date: new Date(t).toISOString().slice(0, 10), label: p.label, type: "phase", color: p.color, icon: "" });
    }
  });

  // Render
  const track = document.getElementById("eventTimelineTrack");
  const total = end - start;
  const posPct = iso => Math.max(0, Math.min(100, ((new Date(iso) - start) / total) * 100));

  const todayPct = posPct(now.toISOString().slice(0, 10));

  let html = `
    <div style="position:absolute;top:40px;left:0;right:0;height:2px;background:#2A2D3E;"></div>
    <div style="position:absolute;top:37px;left:${todayPct}%;width:8px;height:8px;border-radius:50%;background:#F0F0F5;transform:translateX(-50%);box-shadow:0 0 0 3px rgba(240,240,245,0.15);z-index:3;" title="Aujourd'hui"></div>
    <div style="position:absolute;top:52px;left:${todayPct}%;transform:translateX(-50%);font-size:0.62rem;color:#8B8FA8;z-index:3;">Auj.</div>
  `;

  events.sort((a, b) => new Date(a.date) - new Date(b.date));
  events.forEach((e, i) => {
    const p = posPct(e.date);
    const top = e.type === "phase" ? 4 : (i % 2 === 0 ? 12 : 68);
    const size = e.major ? 14 : 10;
    html += `
      <div title="${e.label} — ${e.date}" style="position:absolute;top:${top + 30 - size / 2}px;left:${p}%;transform:translateX(-50%);z-index:2;">
        <div style="width:${size}px;height:${size}px;border-radius:50%;background:${e.color};border:2px solid #1A1D27;"></div>
      </div>
      ${e.type !== "phase" ? `
        <div style="position:absolute;top:${top}px;left:${p}%;transform:translateX(-50%);font-size:0.65rem;color:${e.color};white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis;text-align:center;font-weight:600;">
          ${e.icon} ${e.label}
        </div>
      ` : `
        <div style="position:absolute;top:16px;left:${p}%;transform:translateX(-50%);font-size:0.6rem;color:${e.color};font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">
          ${e.label}
        </div>
      `}
    `;
  });
  track.innerHTML = html;

  const legend = document.getElementById("eventTimelineLegend");
  legend.innerHTML = [
    ["#FF6B6B", "Immunitaire"],
    ["#FFD166", "Pic charge"],
    ["#6C63FF", "Course"],
    ["#A9A3FF", "Base"],
    ["#00D4AA", "Build"],
  ].map(([c, l]) => `<span style="display:flex;align-items:center;gap:5px;"><span style="width:8px;height:8px;border-radius:50%;background:${c};"></span>${l}</span>`).join("");

  const narrative = illnessEpisodes.length
    ? `${illnessEpisodes.length} épisode${illnessEpisodes.length > 1 ? "s" : ""} immunitaire${illnessEpisodes.length > 1 ? "s" : ""} sur la période. Pic d'activité la semaine du ${peakWeek?.start_date || "—"}. Trajectoire globale : corps sollicité puis repos forcé avant de reconstruire vers Thun.`
    : `Parcours régulier sans épisode immunitaire majeur. Pic d'activité la semaine du ${peakWeek?.start_date || "—"}. Trajectoire saine vers Thun.`;
  document.getElementById("eventTimelineNarrative").textContent = narrative;
}

// ─── LOT 35 : OBJECTIFS SMART MENSUELS ─────────────────────
function rendreSmartObjectifs(race) {
  const card = document.getElementById("smartCard");
  if (!card || !window.HISTORY?.daily?.length) { if (card) card.style.display = "none"; return; }
  card.style.display = "block";

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const totalDaysInMonth = monthEnd.getDate();
  const daysElapsed = Math.min(totalDaysInMonth, now.getDate());
  const monthPct = daysElapsed / totalDaysInMonth;

  const monthName = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  document.getElementById("smartSub").textContent = `${monthName} · jour ${daysElapsed} sur ${totalDaysInMonth}`;

  const raceDate = new Date(race.dateISO);
  const daysToRace = Math.floor((raceDate - now) / 86400000);
  const phase = daysToRace > 90 ? "base" : daysToRace > 42 ? "build" : daysToRace > 14 ? "peak" : "taper";

  // Cibles SMART selon la phase
  const cibles = {
    base:  { vol: 30,  sleep: 22, journal: 24 },
    build: { vol: 40,  sleep: 20, journal: 25 },
    peak:  { vol: 45,  sleep: 25, journal: 28 },
    taper: { vol: 20,  sleep: 26, journal: 28 },
  };
  const target = cibles[phase];

  // Agrégats du mois
  const dailyMonth = (window.HISTORY.daily || []).filter(d => {
    const dt = new Date(d.timestamp);
    return dt >= monthStart && dt <= now;
  });
  const volHours = dailyMonth.reduce((s, d) =>
    s + ((d.activities || []).reduce((t, a) => t + (a.duration_min || 0), 0) / 60), 0);
  const sleep7Plus = dailyMonth.filter(d => d.sleep && d.sleep.hours >= 7).length;

  // Journal via localStorage
  let obs = [];
  try { obs = JSON.parse(localStorage.getItem("coach-ia:obs") || "[]"); } catch {}
  const journalDaysSet = new Set(obs
    .filter(o => o.athlete_id === "benoit" && new Date(o.timestamp) >= monthStart && new Date(o.timestamp) <= now)
    .map(o => new Date(o.timestamp).toISOString().slice(0, 10)));
  const journalCount = journalDaysSet.size;

  const goals = [
    {
      icon: "📊",
      label: "Volume d'entraînement",
      actuel: volHours.toFixed(1),
      cible: target.vol,
      unite: "h",
      pct: Math.min(100, Math.round(volHours / target.vol * 100)),
      expectedPct: Math.round(monthPct * 100),
      color: "#6C63FF",
      note: `objectif ${target.vol}h en ${phase}`,
    },
    {
      icon: "🌙",
      label: "Nuits ≥ 7h",
      actuel: sleep7Plus,
      cible: target.sleep,
      unite: "",
      pct: Math.min(100, Math.round(sleep7Plus / target.sleep * 100)),
      expectedPct: Math.round(monthPct * 100),
      color: "#00D4AA",
      note: `récupération prioritaire`,
    },
    {
      icon: "📝",
      label: "Journaux remplis",
      actuel: journalCount,
      cible: target.journal,
      unite: "",
      pct: Math.min(100, Math.round(journalCount / target.journal * 100)),
      expectedPct: Math.round(monthPct * 100),
      color: "#FFD166",
      note: `précision IA & auto-connaissance`,
    },
  ];

  const list = document.getElementById("smartList");
  list.innerHTML = goals.map(g => {
    const onTrack = g.pct >= g.expectedPct - 10;
    const statusColor = onTrack ? g.color : "#FF6B6B";
    return `
      <div style="padding:14px;background:rgba(255,255,255,0.02);border-left:3px solid ${statusColor};border-radius:8px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:1.1rem;">${g.icon}</span>
            <span style="font-size:0.9rem;font-weight:700;color:#F0F0F5;">${g.label}</span>
            <span style="font-size:0.7rem;color:#8B8FA8;">${g.note}</span>
          </div>
          <div style="font-size:0.9rem;font-weight:700;color:${statusColor};">
            ${g.actuel}${g.unite} / ${g.cible}${g.unite}
          </div>
        </div>
        <div class="progress-bar" style="height:6px;border-radius:3px;position:relative;">
          <div style="position:absolute;top:-2px;bottom:-2px;left:${g.expectedPct}%;width:2px;background:#555870;border-radius:1px;" title="Rythme attendu"></div>
          <div class="progress-fill" style="width:${g.pct}%;background:${g.color};border-radius:3px;transition:width 0.6s;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:4px;">
          <span style="font-size:0.68rem;color:#555870;">${g.pct}% atteint</span>
          <span style="font-size:0.68rem;color:#555870;">rythme attendu ${g.expectedPct}%</span>
        </div>
      </div>`;
  }).join("");

  const onTrackCount = goals.filter(g => g.pct >= g.expectedPct - 10).length;
  const badge = document.getElementById("smartBadge");
  badge.textContent = `${onTrackCount}/3 sur la voie`;
  badge.className = "badge " + (onTrackCount === 3 ? "badge-teal" : onTrackCount >= 2 ? "badge-violet" : "badge-coral");

  let narrative;
  if (onTrackCount === 3) {
    narrative = `Mois engagé sur les 3 axes. Le rythme tient — continue de cocher les petites cases, c'est cumulatif.`;
  } else if (onTrackCount === 0) {
    narrative = `Mois en retrait sur les 3 objectifs. Sortie d'épisode immunitaire oblige — les cibles redeviendront atteignables dès que le volume remontera.`;
  } else {
    const lagging = goals.filter(g => g.pct < g.expectedPct - 10).map(g => g.label.toLowerCase());
    narrative = `${onTrackCount}/3 objectifs tenus. À rattraper : ${lagging.join(", ")}. Pas de panique — les cibles sont mensuelles, la marge de rattrapage existe.`;
  }
  document.getElementById("smartNarrative").textContent = narrative;
}

// ─── SÉLECTEUR ───
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
