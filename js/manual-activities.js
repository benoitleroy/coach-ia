// MANUAL-ACTIVITIES.JS
// Saisie manuelle de séances non capturées par Strava/Whoop (crossfit, PP,
// vélo home, marche, yoga…). Stockées en localStorage et injectées dans
// window.HISTORY au chargement pour alimenter le scoring de charge.

(function () {
  const KEY = "coachia.manualActivities";

  const TYPES = {
    home_trainer: { label: "Vélo appartement / home trainer", icon: "🚴", cat: "cardio" },
    walk:         { label: "Marche",                          icon: "🚶", cat: "cardio" },
    rucking:      { label: "Marche avec sac",                 icon: "🥾", cat: "cardio" },
    hike:         { label: "Randonnée / marche montée",       icon: "⛰️", cat: "cardio" },
    rower:        { label: "Rameur / elliptique",             icon: "🚣", cat: "cardio" },

    crossfit:     { label: "Crossfit / WOD",                  icon: "💪", cat: "force" },
    muscu:        { label: "Muscu / renfo",                   icon: "🏋️", cat: "force" },
    pp:           { label: "PP (prépa physique)",             icon: "🦵", cat: "force" },
    core:         { label: "Gainage / core",                  icon: "🧗", cat: "force" },

    water_walk:   { label: "Marche dans l'eau / aqua-jog",    icon: "🌊", cat: "recovery" },
    yoga:         { label: "Yoga / mobilité / étirements",    icon: "🧘", cat: "recovery" },
    easy_walk:    { label: "Marche tranquille récup",         icon: "🚶", cat: "recovery" },
  };

  const CAT_LABEL = {
    cardio:   "Cardio complémentaire",
    force:    "Force / explosivité",
    recovery: "Récupération active",
  };

  function _load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  function _save(arr) {
    localStorage.setItem(KEY, JSON.stringify(arr));
    window.dispatchEvent(new CustomEvent("manual-activities-changed"));
  }
  function _toDateStr(ts) {
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function _ensureDay(dateStr) {
    if (!window.HISTORY) return null;
    if (!Array.isArray(window.HISTORY.daily)) window.HISTORY.daily = [];
    let day = window.HISTORY.daily.find(d => d.date === dateStr);
    if (!day) {
      const ts = new Date(dateStr + "T00:00:00").getTime();
      day = {
        date: dateStr,
        timestamp: ts,
        hrv: null, rhr: null, rr: null, skin_temp: null, spo2: null,
        recovery: null, strain_whoop: null, strain_strava: null,
        sleep: { hours: null, quality: null, deep_min: null, rem_min: null, efficiency: null, regularity: null, debt: null, bedtime_min: null, wake_min: null },
        activities: [],
        journal: { alcohol: false, caffeine: false, stress: false, travel: false, illness: false, injury: false, protein: false },
        composite_flag: { count: 0, details: { hrv_low: false, rhr_high: false, rr_high: false, skin_high: false } },
        zscores: {},
        baselines: {},
      };
      window.HISTORY.daily.push(day);
      window.HISTORY.daily.sort((a, b) => a.timestamp - b.timestamp);
    }
    if (!Array.isArray(day.activities)) day.activities = [];
    return day;
  }

  function _injectIntoHistory() {
    if (!window.HISTORY) return;
    const all = _load();
    if (!all.length) return;
    all.forEach(act => {
      const dateStr = _toDateStr(act.date);
      const day = _ensureDay(dateStr);
      if (!day) return;
      // Évite double injection
      if (day.activities.some(a => a.manual_id === act.id)) return;
      const cfg = TYPES[act.type] || { label: act.type, icon: "📝" };
      // sRPE-style effort proxy : durée × RPE × facteur (≈ TRIMP/load unit)
      const effort = Math.round((act.duration_min || 0) * (act.rpe || 5) * 0.6);
      day.activities.push({
        manual_id: act.id,
        type: "Manual_" + act.type,
        label: cfg.label,
        icone: cfg.icon,
        duration_min: act.duration_min,
        distance_km: null,
        avg_hr: null,
        effort,
        rpe: act.rpe,
        comment: act.comment || "",
        manual: true,
        name: act.comment || cfg.label,
      });
    });
  }

  window.ManualActivities = {
    TYPES,
    CAT_LABEL,
    getAll() { return _load(); },
    getForDate(ts) {
      const dateStr = _toDateStr(ts);
      return _load().filter(a => _toDateStr(a.date) === dateStr);
    },
    add(activity) {
      const all = _load();
      const id = `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const item = {
        id,
        type: activity.type,
        duration_min: Number(activity.duration_min) || 0,
        rpe: Number(activity.rpe) || 5,
        date: activity.date || Date.now(),
        comment: activity.comment || "",
      };
      all.push(item);
      _save(all);
      _injectIntoHistory();
      return id;
    },
    remove(id) {
      const all = _load().filter(a => a.id !== id);
      _save(all);
      if (window.HISTORY?.daily) {
        window.HISTORY.daily.forEach(d => {
          if (Array.isArray(d.activities)) {
            d.activities = d.activities.filter(a => a.manual_id !== id);
          }
        });
      }
    },
    inject() { _injectIntoHistory(); },
    clear() {
      localStorage.removeItem(KEY);
      window.dispatchEvent(new CustomEvent("manual-activities-changed"));
    },
  };

  // Injection au chargement (HISTORY peut ne pas être chargé sur certaines pages)
  _injectIntoHistory();
})();
