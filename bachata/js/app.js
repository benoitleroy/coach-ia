/* NST Timer — Aujourd'hui / Chrono / WODs */
(function () {
  "use strict";

  /* ═══ Navigation entre pages ═══ */
  const pages = { jour: el("page-jour"), chrono: el("page-chrono"), wods: el("page-wods") };
  document.querySelectorAll(".bottomnav button").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".bottomnav button").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      Object.entries(pages).forEach(([k, p]) => p.hidden = k !== b.dataset.page);
      window.scrollTo(0, 0);
    });
  });
  function el(id) { return document.getElementById(id); }

  /* ═══ AUJOURD'HUI — séance NST du jour + navigation ═══ */
  const NST = window.NST_JOURS || {};
  const dates = Object.keys(NST).sort();
  const JOURS_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const MOIS_FR = ["janv.", "févr.", "mars", "avril", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

  let cur = todayKey();
  if (!NST[cur]) cur = dates[dates.length - 1] || null;

  function todayKey() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function renderJour() {
    const cont = el("jour-contenu");
    if (!cur || !NST[cur]) { cont.innerHTML = "<p class='muted' style='margin:1rem'>Aucune séance en base.</p>"; return; }
    const d = new Date(cur + "T12:00:00");
    el("jour-date").textContent = JOURS_FR[d.getDay()] + " " + d.getDate() + " " + MOIS_FR[d.getMonth()] +
      (cur === todayKey() ? " · aujourd'hui" : "");
    el("jour-titre").textContent = NST[cur].titre;
    cont.innerHTML = "";
    // Découpe le contenu en sections (lignes-titres en MAJUSCULES connues)
    const sections = splitSections(NST[cur].contenu);
    sections.forEach((s, idx) => {
      const div = document.createElement("div");
      div.className = "section" + (idx === 0 ? " open" : "");
      const timer = detectTimer(s.body);
      div.innerHTML =
        "<button class='section-head'>" + escapeHtml(s.title) + "<span class='chev'>›</span></button>" +
        "<div class='section-body'>" +
        (timer ? "<button class='go-inline' data-timer='" + encodeURIComponent(JSON.stringify(timer)) + "'>▶ GO " + timer.label + "</button>" : "") +
        escapeHtml(s.body) + "</div>";
      div.querySelector(".section-head").addEventListener("click", () => div.classList.toggle("open"));
      const go = div.querySelector(".go-inline");
      if (go) go.addEventListener("click", e => { e.stopPropagation(); launchFromSpec(JSON.parse(decodeURIComponent(go.dataset.timer))); });
      cont.appendChild(div);
    });
  }

  function splitSections(txt) {
    const lines = txt.split("\n");
    const out = []; let curSec = null;
    const isTitle = raw => {
      const l = raw.normalize("NFKC").trim();
      return l.length > 3 && l.length < 90 && !/^\d/.test(l) &&
        l === l.toUpperCase() && (l.match(/[A-Z]/g) || []).length >= 4;
    };
    for (const l of lines) {
      if (isTitle(l)) { curSec = { title: l.trim(), body: "" }; out.push(curSec); }
      else if (curSec) curSec.body += l + "\n";
      else { curSec = { title: "Note du coach", body: l + "\n" }; out.push(curSec); }
    }
    out.forEach(s => s.body = s.body.trim());
    return out.filter(s => s.body);
  }

  el("btn-prev").addEventListener("click", () => move(-1));
  el("btn-next").addEventListener("click", () => move(1));
  function move(dir) {
    const i = dates.indexOf(cur);
    const n = i + dir;
    if (n >= 0 && n < dates.length) { cur = dates[n]; renderJour(); }
  }

  /* Détection du format de chrono dans un texte de bloc */
  function detectTimer(t) {
    let m;
    if ((m = t.match(/(\d+)\s*min(?:ute)?\s*AMRAP|AMRAP\s*(\d+)/i))) {
      const min = parseInt(m[1] || m[2]);
      return { mode: "amrap", min, label: "AMRAP " + min + "'" };
    }
    if ((m = t.match(/EMOM.*?(\d+)\s*(?:min|rounds)/i)) || (m = t.match(/(\d+)\s*min(?:ute)?\s*EMOM/i))) {
      const min = parseInt(m[1]);
      return { mode: "emom", min, label: "EMOM " + min + "'" };
    }
    if (/EMOM/i.test(t)) return { mode: "emom", min: 20, label: "EMOM 20'" };
    if (/for time/i.test(t)) return { mode: "fortime", label: "For Time" };
    if (/tabata/i.test(t)) return { mode: "tabata", label: "Tabata" };
    return null;
  }

  /* ═══ CHRONO ═══ */
  const PARAMS = {
    fortime: [["cap", "Time cap (min)", 20]],
    amrap: [["min", "Durée (min)", 20]],
    emom: [["min", "Minutes", 12]],
    tabata: [["work", "Travail (s)", 20], ["rest", "Repos (s)", 10], ["rounds", "Tours", 8]],
    custom: [["work", "Travail (s)", 40], ["rest", "Repos (s)", 20], ["rounds", "Tours", 10]],
  };
  let selMode = null;

  document.querySelectorAll(".mode-btn").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll(".mode-btn").forEach(x => x.classList.remove("sel"));
    b.classList.add("sel");
    selMode = b.dataset.mode;
    const box = el("chrono-params");
    box.innerHTML = PARAMS[selMode].map(([k, lab, dv]) =>
      "<div class='param'><label>" + lab + "</label><input type='number' inputmode='numeric' id='p-" + k + "' value='" + dv + "'></div>").join("");
    el("btn-start").hidden = false;
  }));

  el("btn-start").addEventListener("click", () => {
    const p = {};
    PARAMS[selMode].forEach(([k]) => p[k] = parseInt(el("p-" + k).value) || 0);
    startTimer(selMode, p);
  });

  function launchFromSpec(spec) {
    document.querySelector(".bottomnav button[data-page=chrono]").click();
    const p = spec.mode === "amrap" || spec.mode === "emom" ? { min: spec.min } :
      spec.mode === "tabata" ? { work: 20, rest: 10, rounds: 8 } : { cap: 30 };
    startTimer(spec.mode, p);
  }

  /* Sons via WebAudio */
  let AC = null;
  function beep(freq, dur, when) {
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      const o = AC.createOscillator(), g = AC.createGain();
      o.frequency.value = freq; o.connect(g); g.connect(AC.destination);
      const t = AC.currentTime + (when || 0);
      g.gain.setValueAtTime(.4, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
      o.start(t); o.stop(t + dur);
    } catch (e) { /* silencieux */ }
  }

  /* Wake lock — l'écran ne s'éteint pas pendant le WOD */
  let wakeLock = null;
  async function keepAwake(on) {
    try {
      if (on && "wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen");
      else if (wakeLock) { wakeLock.release(); wakeLock = null; }
    } catch (e) { /* pas supporté */ }
  }

  let tick = null, paused = false, state = null;

  function startTimer(mode, p) {
    el("chrono-setup").hidden = true;
    el("chrono-run").hidden = false;
    keepAwake(true);
    // Compte à rebours 10s (armement) puis 3-2-1 bips
    state = { mode, p, phase: "countdown", t: 10, elapsed: 0, round: 1, inWork: true };
    paused = false;
    el("btn-pause").textContent = "⏸ Pause";
    render();
    clearInterval(tick);
    tick = setInterval(step, 1000);
  }

  function step() {
    if (paused || !state) return;
    if (state.phase === "countdown") {
      state.t--;
      if (state.t <= 3 && state.t > 0) beep(880, .15);
      if (state.t <= 0) { beep(1320, .5); state.phase = "run"; state.elapsed = 0; }
      render(); return;
    }
    state.elapsed++;
    const { mode, p } = state;
    if (mode === "fortime") {
      if (p.cap && state.elapsed >= p.cap * 60) return finish();
    } else if (mode === "amrap") {
      const remain = p.min * 60 - state.elapsed;
      if (remain === 60) beep(660, .3);
      if (remain <= 0) return finish();
    } else if (mode === "emom") {
      if (state.elapsed % 60 === 0) {
        state.round++;
        if (state.round > p.min) return finish();
        beep(1100, .3);
      } else if (state.elapsed % 60 >= 57) beep(880, .12);
    } else { // tabata / custom
      const len = state.inWork ? p.work : p.rest;
      if (state.elapsed >= len) {
        state.elapsed = 0;
        if (state.inWork) { state.inWork = false; if (p.rest > 0) beep(440, .4); }
        else { state.inWork = true; state.round++; beep(1320, .3); }
        if (state.round > p.rounds) return finish();
        if (state.inWork === false && p.rest === 0) { state.inWork = true; state.round++; }
      } else if ((len - state.elapsed) <= 3) beep(880, .12);
    }
    render();
  }

  function fmt(s) { return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }

  function render() {
    const run = el("chrono-run");
    const { mode, p } = state;
    let phase = "", time = "", sub = "";
    run.classList.remove("work", "rest");
    if (state.phase === "countdown") {
      phase = "PRÊT ?"; time = state.t; sub = "ça part dans…";
    } else if (mode === "fortime") {
      phase = "FOR TIME"; time = fmt(state.elapsed); sub = p.cap ? "cap " + p.cap + " min" : "";
      run.classList.add("work");
    } else if (mode === "amrap") {
      phase = "AMRAP " + p.min + "'"; time = fmt(Math.max(0, p.min * 60 - state.elapsed)); sub = "écoulé " + fmt(state.elapsed);
      run.classList.add("work");
    } else if (mode === "emom") {
      phase = "EMOM — MINUTE " + state.round + " / " + p.min;
      time = fmt(60 - (state.elapsed % 60)); sub = "total " + fmt(state.elapsed);
      run.classList.add(state.round % 2 ? "work" : "rest");
    } else {
      phase = (state.inWork ? "TRAVAIL" : "REPOS") + " — TOUR " + Math.min(state.round, p.rounds) + " / " + p.rounds;
      time = fmt(Math.max(0, (state.inWork ? p.work : p.rest) - state.elapsed));
      run.classList.add(state.inWork ? "work" : "rest");
    }
    el("run-phase").textContent = phase;
    el("run-time").textContent = time;
    el("run-sub").textContent = sub;
  }

  function finish() {
    clearInterval(tick);
    beep(1320, .3); beep(1320, .3, .4); beep(1760, .8, .8);
    el("run-phase").textContent = "TERMINÉ 💪";
    el("run-sub").textContent = "";
    state = null;
    keepAwake(false);
  }

  el("btn-pause").addEventListener("click", () => {
    paused = !paused;
    el("btn-pause").textContent = paused ? "▶ Reprendre" : "⏸ Pause";
  });
  el("btn-stop").addEventListener("click", () => {
    clearInterval(tick); state = null; keepAwake(false);
    el("chrono-run").hidden = true;
    el("chrono-setup").hidden = false;
  });

  /* ═══ WODS ═══ */
  const WODS = window.WODS || [];
  let srcFilter = null;
  const sources = [...new Set(WODS.map(w => w.source))];
  const srcBox = el("wod-sources");
  sources.forEach(s => {
    const b = document.createElement("button");
    b.textContent = s;
    b.addEventListener("click", () => {
      srcFilter = srcFilter === s ? null : s;
      srcBox.querySelectorAll("button").forEach(x => x.classList.toggle("sel", x.textContent === srcFilter));
      renderWods();
    });
    srcBox.appendChild(b);
  });
  el("wod-search").addEventListener("input", renderWods);

  function renderWods() {
    const q = el("wod-search").value.toLowerCase();
    const list = el("wod-liste");
    list.innerHTML = "";
    const match = WODS.filter(w => {
      if (srcFilter && w.source !== srcFilter) return false;
      if (!q) return true;
      const blob = ((w.name || "") + " " + (w.fr || w.en || []).join(" ")).toLowerCase();
      return blob.includes(q);
    }).slice(0, 60);
    match.forEach(w => {
      const lines = (w.fr && w.fr.length ? w.fr : w.en || []).join("\n");
      const timer = detectTimer(lines);
      const card = document.createElement("div");
      card.className = "wod-card";
      card.innerHTML = "<h3>" + escapeHtml(w.name || w.date || w.id) + "</h3>" +
        "<div class='muted'>" + escapeHtml(w.source + (w.date ? " · " + w.date : "")) + "</div>" +
        "<div class='lines'>" + escapeHtml(lines) + "</div>" +
        (timer ? "<button class='go-inline'>▶ GO " + timer.label + "</button>" : "");
      const go = card.querySelector(".go-inline");
      if (go) go.addEventListener("click", () => launchFromSpec(timer));
      list.appendChild(card);
    });
    if (!match.length) list.innerHTML = "<p class='muted' style='margin:1rem'>Aucun WOD trouvé.</p>";
  }
  renderWods();

  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  renderJour();
})();
