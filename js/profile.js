// PROFILE.JS — lecture/écriture des paramètres athlète (localStorage)
// Exposé globalement pour toutes les pages.

(function () {
  const KEY = "coach-ia:athlete-profile:benoit";

  const DEFAULTS = {
    nom: "Benoît Leroy",
    dateNaissance: "",          // "YYYY-MM-DD"
    poids: null,                // kg
    taille: null,               // cm
    fcMax: null,                // bpm — si null, calculé via 208 - 0.7 × âge
    fcRepos: null,              // bpm
    ftp: null,                  // watts
    vma: null,                  // km/h
    swolf100: null,             // score swolf pour 100m (nage)
    disciplines: ["triathlon", "course", "vélo", "natation"],
    experienceAnnees: null,     // années de triathlon
    bestTimes: {
      marathon: "",             // "3h24"
      semi: "",
      "10k": "",
      ironman: "",
      halfIronman: "",
    },
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...DEFAULTS };
      const parsed = JSON.parse(raw);
      return { ...DEFAULTS, ...parsed, bestTimes: { ...DEFAULTS.bestTimes, ...(parsed.bestTimes || {}) } };
    } catch (e) {
      console.warn("[profile] parse fail — fallback defaults", e);
      return { ...DEFAULTS };
    }
  }

  function save(p) {
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
      return true;
    } catch (e) {
      console.warn("[profile] save fail", e);
      return false;
    }
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  // FC max théorique si pas renseignée
  function derivedFcMax(profile) {
    if (profile && Number.isFinite(profile.fcMax) && profile.fcMax > 0) return profile.fcMax;
    if (profile && profile.dateNaissance) {
      const age = (Date.now() - new Date(profile.dateNaissance).getTime()) / (365.25 * 86400000);
      if (Number.isFinite(age) && age > 5 && age < 100) {
        return Math.round(208 - 0.7 * age);
      }
    }
    return null;
  }

  // Zones FC classiques (5 zones)
  function computeHrZones(profile) {
    const max = derivedFcMax(profile);
    if (!max) return null;
    return [
      { name: "Z1 — Récup",       min: Math.round(max * 0.50), max: Math.round(max * 0.60), color: "#A9A3FF", desc: "Très facile, conversation" },
      { name: "Z2 — Endurance",   min: Math.round(max * 0.60), max: Math.round(max * 0.70), color: "#00D4AA", desc: "Aérobie, phrase complète" },
      { name: "Z3 — Tempo",       min: Math.round(max * 0.70), max: Math.round(max * 0.80), color: "#6C63FF", desc: "Confortable mais soutenu" },
      { name: "Z4 — Seuil",       min: Math.round(max * 0.80), max: Math.round(max * 0.90), color: "#FFD166", desc: "Effort dur, mots comptés" },
      { name: "Z5 — VO2max",      min: Math.round(max * 0.90), max: max,                     color: "#FF6B6B", desc: "Maximal, impossible de parler" },
    ];
  }

  // Zones puissance vélo Coggan (7 zones, basées FTP)
  function computePowerZones(profile) {
    const ftp = profile && profile.ftp;
    if (!Number.isFinite(ftp) || ftp <= 0) return null;
    return [
      { name: "Z1 — Récupération", min: 0,                    max: Math.round(ftp * 0.55), color: "#A9A3FF" },
      { name: "Z2 — Endurance",    min: Math.round(ftp*0.56), max: Math.round(ftp * 0.75), color: "#00D4AA" },
      { name: "Z3 — Tempo",        min: Math.round(ftp*0.76), max: Math.round(ftp * 0.90), color: "#6C63FF" },
      { name: "Z4 — Seuil",        min: Math.round(ftp*0.91), max: Math.round(ftp * 1.05), color: "#FFD166" },
      { name: "Z5 — VO2max",       min: Math.round(ftp*1.06), max: Math.round(ftp * 1.20), color: "#FF6B6B" },
      { name: "Z6 — Anaérobie",    min: Math.round(ftp*1.21), max: Math.round(ftp * 1.50), color: "#FF4A4A" },
      { name: "Z7 — Sprint",       min: Math.round(ftp*1.51), max: null,                   color: "#FF8FA3" },
    ];
  }

  // Zones allure course (basées VMA, km/h)
  function computePaceZones(profile) {
    const vma = profile && profile.vma;
    if (!Number.isFinite(vma) || vma <= 0) return null;
    // Retourne allures en min/km
    const pace = (pctVma) => {
      const v = vma * pctVma;
      if (!v) return "—";
      const sec = 3600 / v;
      const m = Math.floor(sec / 60);
      const s = Math.round(sec % 60);
      return `${m}:${String(s).padStart(2, "0")}/km`;
    };
    return [
      { name: "Z1 — Récup",     pace: `${pace(0.65)} → ${pace(0.55)}`, pct: "55–65%", color: "#A9A3FF" },
      { name: "Z2 — Endurance", pace: `${pace(0.75)} → ${pace(0.65)}`, pct: "65–75%", color: "#00D4AA" },
      { name: "Z3 — Tempo",     pace: `${pace(0.85)} → ${pace(0.75)}`, pct: "75–85%", color: "#6C63FF" },
      { name: "Z4 — Seuil",     pace: `${pace(0.92)} → ${pace(0.85)}`, pct: "85–92%", color: "#FFD166" },
      { name: "Z5 — VO2max",    pace: `${pace(1.00)} → ${pace(0.92)}`, pct: "92–100%", color: "#FF6B6B" },
    ];
  }

  window.ATHLETE_PROFILE = load();
  window.getAthleteProfile = load;
  window.saveAthleteProfile = (p) => { const ok = save(p); if (ok) window.ATHLETE_PROFILE = p; return ok; };
  window.resetAthleteProfile = () => { reset(); window.ATHLETE_PROFILE = { ...DEFAULTS }; };
  window.computeHrZones = computeHrZones;
  window.computePowerZones = computePowerZones;
  window.computePaceZones = computePaceZones;
  window.derivedFcMax = derivedFcMax;
  window.ATHLETE_PROFILE_DEFAULTS = DEFAULTS;
})();
