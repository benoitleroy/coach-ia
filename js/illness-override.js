// ILLNESS-OVERRIDE.JS
// Permet à l'athlète de définir manuellement une fenêtre d'épisode immunitaire
// (date de début et/ou date de fin). Stocke un objet { startDate, endDate } dans
// localStorage. Tous les détecteurs vérifient cette fenêtre.

(function () {
  const KEY_OLD = "coachia.illness.endDate";   // ancien : juste un timestamp de fin
  const KEY = "coachia.illness.window";         // nouveau : { startDate, endDate }

  function _load() {
    // Migration depuis l'ancienne clé
    const cur = localStorage.getItem(KEY);
    if (cur) {
      try { return JSON.parse(cur); } catch { return null; }
    }
    const old = localStorage.getItem(KEY_OLD);
    if (old) {
      const win = { startDate: null, endDate: Number(old) };
      localStorage.setItem(KEY, JSON.stringify(win));
      localStorage.removeItem(KEY_OLD);
      return win;
    }
    return null;
  }

  function _save(win) {
    if (win && (win.startDate || win.endDate)) {
      localStorage.setItem(KEY, JSON.stringify(win));
    } else {
      localStorage.removeItem(KEY);
    }
    window.dispatchEvent(new CustomEvent("illness-override-changed"));
  }

  window.IllnessOverride = {
    get() { return _load(); },

    setWindow(startDate, endDate) {
      _save({ startDate: startDate || null, endDate: endDate || null });
    },

    // Backwards compat — set marque juste la date de fin
    set(ts) {
      const cur = _load() || {};
      _save({ startDate: cur.startDate || null, endDate: ts || Date.now() });
    },

    clear() { _save(null); },

    // True si une trace de maladie active existe (dans la fenêtre, pas après endDate)
    isEpisodeOngoing() {
      const H = window.HISTORY;
      if (!H || !H.daily) return false;
      const win = _load();
      const startTs = win?.startDate || null;
      const endTs = win?.endDate || null;
      // Si endDate est dans le passé strict (>1 jour), épisode terminé
      if (endTs && endTs < Date.now() - 86400000) return false;
      for (let i = H.daily.length - 1; i >= 0; i--) {
        const d = H.daily[i];
        if (d?.journal?.illness) {
          if (startTs && d.timestamp < startTs) continue;
          if (endTs && d.timestamp > endTs) continue;
          return true;
        }
      }
      return false;
    },

    // Jours depuis la dernière trace active (dans la fenêtre)
    daysSinceActiveIllness() {
      const H = window.HISTORY;
      if (!H || !H.daily) return null;
      const win = _load();
      const startTs = win?.startDate || null;
      const endTs = win?.endDate || null;
      // Si endDate set : jours depuis endDate
      if (endTs) {
        return Math.max(0, Math.floor((Date.now() - endTs) / 86400000));
      }
      for (let i = H.daily.length - 1; i >= 0; i--) {
        const d = H.daily[i];
        if (d?.journal?.illness) {
          if (startTs && d.timestamp < startTs) continue;
          return Math.floor((Date.now() - d.timestamp) / 86400000);
        }
      }
      return null;
    },

    // Utilitaire : timestamp de la dernière trace de maladie dans le journal (ignore override)
    getLastIllnessTimestampInJournal() {
      const H = window.HISTORY;
      if (!H || !H.daily) return null;
      for (let i = H.daily.length - 1; i >= 0; i--) {
        const d = H.daily[i];
        if (d?.journal?.illness) return d.timestamp;
      }
      return null;
    },

    // Utilitaire : timestamp du PREMIER jour de l'épisode courant
    getFirstIllnessTimestampInJournal() {
      const H = window.HISTORY;
      if (!H || !H.daily) return null;
      let firstTs = null;
      // On remonte tant que les jours sont consécutifs en illness
      let prevIllness = false;
      for (let i = H.daily.length - 1; i >= 0; i--) {
        const d = H.daily[i];
        if (d?.journal?.illness) {
          firstTs = d.timestamp;
          prevIllness = true;
        } else if (prevIllness) {
          break;
        }
      }
      return firstTs;
    },
  };
})();
