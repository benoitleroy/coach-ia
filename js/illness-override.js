// ILLNESS-OVERRIDE.JS
// Permet à l'athlète de marquer manuellement la fin d'un épisode immunitaire.
// Stocke un timestamp dans localStorage. Tous les détecteurs vérifient ce timestamp
// avant de considérer une trace de maladie comme "active".

(function () {
  const KEY = "coachia.illness.endDate";

  window.IllnessOverride = {
    get() {
      const v = localStorage.getItem(KEY);
      return v ? Number(v) : null;
    },
    set(ts) {
      localStorage.setItem(KEY, String(ts || Date.now()));
      window.dispatchEvent(new CustomEvent("illness-override-changed"));
    },
    clear() {
      localStorage.removeItem(KEY);
      window.dispatchEvent(new CustomEvent("illness-override-changed"));
    },
    // True si la dernière trace de maladie est postérieure à un éventuel override
    isEpisodeOngoing() {
      const H = window.HISTORY;
      if (!H || !H.daily) return false;
      const override = this.get();
      let lastIllnessTs = null;
      for (let i = H.daily.length - 1; i >= 0; i--) {
        const d = H.daily[i];
        if (d && d.journal && d.journal.illness) {
          lastIllnessTs = d.timestamp;
          break;
        }
      }
      if (!lastIllnessTs) return false;
      if (override && override >= lastIllnessTs) return false;
      return true;
    },
    // Jours depuis la dernière trace de maladie, en respectant l'override
    daysSinceActiveIllness() {
      const H = window.HISTORY;
      if (!H || !H.daily) return null;
      const override = this.get();
      let lastIllnessTs = null;
      for (let i = H.daily.length - 1; i >= 0; i--) {
        const d = H.daily[i];
        if (d && d.journal && d.journal.illness) {
          if (override && d.timestamp <= override) continue;
          lastIllnessTs = d.timestamp;
          break;
        }
      }
      if (!lastIllnessTs) return null;
      return Math.floor((Date.now() - lastIllnessTs) / 86400000);
    },
  };
})();
