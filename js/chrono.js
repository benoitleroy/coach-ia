// js/chrono.js — onglets Chrono (For Time / AMRAP / EMOM / Tabata / Intervalles) et Charges (1RM),
// repris de l'ancienne appli Bachata. Expose window.CHRONO pour la banque de séances.
(function () {
  const $ = id => document.getElementById(id);

  // ── Charges maxi (1RM) — même clé de stockage que Bachata : les valeurs déjà saisies sont conservées ──
  const LIFTS = [
    { id: "backsquat",   label: "Back Squat",   fr: "squat barre derrière la nuque", keys: /back squat|(?<!front |overhead )squat(?! clean| snatch)/i },
    { id: "frontsquat",  label: "Front Squat",  fr: "squat barre devant", keys: /front squat/i },
    { id: "deadlift",    label: "Deadlift",     fr: "soulevé de terre", keys: /deadlift/i },
    { id: "bench",       label: "Bench Press",  fr: "développé couché", keys: /bench/i },
    { id: "strictpress", label: "Strict Press", fr: "développé militaire", keys: /strict press|shoulder press/i },
    { id: "pushpress",   label: "Push Press",   fr: "développé poussé", keys: /push press/i },
    { id: "powersnatch", label: "Power Snatch", fr: "arraché sans squat", keys: /power snatch/i },
    { id: "squatsnatch", label: "Squat Snatch", fr: "arraché complet", keys: /squat snatch|(?<!power |muscle )snatch(?! pull)/i },
    { id: "powerclean",  label: "Power Clean",  fr: "épaulé sans squat", keys: /power clean/i },
    { id: "squatclean",  label: "Squat Clean",  fr: "épaulé complet", keys: /squat clean|(?<!power |muscle |hang power )clean(?! (&|and) jerk)/i },
    { id: "splitjerk",   label: "Split Jerk",   fr: "jeté fendu", keys: /jerk/i },
    { id: "chinup",      label: "Chin-Up lesté", fr: "poids ajouté", keys: /chin.?up|pull.?up/i },
  ];
  const loadRM = () => { try { return JSON.parse(localStorage.getItem("bachata_1rm")) || {}; } catch (e) { return {}; } };
  const saveRM = rm => { try { localStorage.setItem("bachata_1rm", JSON.stringify(rm)); } catch (e) { /* navigation privée */ } };
  let RM = loadRM();
  const majCharges = [];   // rappels quand un 1RM change (la banque recalcule ses « → XX kg »)

  const rendreCharges = () => {
    const box = $("ch-liste"); if (!box) return;
    box.innerHTML = LIFTS.map(l => `<label class="ch-row"><span class="ch-lift">${l.label}<small>${l.fr}</small></span>
      <input type="number" inputmode="decimal" step="0.5" data-id="${l.id}" value="${RM[l.id] || ""}" placeholder="—" aria-label="1RM ${l.label}"><span class="ch-unit">kg</span></label>`).join("");
    box.querySelectorAll("input").forEach(i => i.addEventListener("change", e => {
      const v = parseFloat(e.target.value);
      if (v > 0) RM[i.dataset.id] = v; else delete RM[i.dataset.id];
      saveRM(RM);
      majCharges.forEach(f => f());
    }));
  };

  // « 75 % » → « 75 % → 60 kg » quand la ligne parle d'un lift dont le 1RM est connu (jamais sur % effort/FTP)
  const liftDe = t => LIFTS.find(l => l.keys.test(String(t || "").normalize("NFKC"))) || null;
  const roundKg = v => Math.round(v * 2) / 2;
  const kgLigne = (html, contexte) => {
    if (!/%/.test(html) || /effort|FTP/i.test(html)) return html;
    const lift = liftDe(html) || liftDe(contexte);
    if (!lift || !RM[lift.id]) return html;
    return html.replace(/(\d+)(?:\s*[-–]\s*(\d+))?\s*%/g, (m, a, b) =>
      `${m} <span class="kg-calc">→ ${roundKg(RM[lift.id] * a / 100)}${b ? "–" + roundKg(RM[lift.id] * b / 100) : ""} kg</span>`);
  };

  // ── Détection du format de chrono dans un texte de séance ──
  const detecte = t0 => {
    const t = String(t0 || "").normalize("NFKC");
    let m;
    if ((m = t.match(/(\d+)\s*min(?:ute)?s?\s*AMRAP|AMRAP\s*(?:de\s*)?(\d+)|as many (?:rounds|reps)[^\n]*? in (\d+) minutes|maximum de (?:tours|répétitions)[^\n]*? en (\d+) minutes/i))) {
      const min = +(m[1] || m[2] || m[3] || m[4]);
      return { mode: "amrap", min, label: "AMRAP " + min + "'" };
    }
    if ((m = t.match(/(\d+)\s*min(?:ute)?s?\s*EMOM/i)) || (m = t.match(/EMOM[^.\n]*?(\d+)\s*(?:min|rounds|tours)/i))
      || (m = t.match(/every minute on the minute for (\d+) minutes|chaque minute pendant (\d+) minutes/i)))
      return { mode: "emom", min: +(m[1] || m[2]), label: "EMOM " + (m[1] || m[2]) + "'" };
    if (/EMOM|chaque minute/i.test(t)) return { mode: "emom", min: 20, label: "EMOM 20'" };
    if (/tabata/i.test(t)) return { mode: "tabata", label: "Tabata" };
    if (/for time|le plus vite possible/i.test(t)) return { mode: "fortime", label: "For Time" };
    return null;
  };

  // ── Chrono ──
  const PARAMS = {
    fortime: [["cap", "Temps limite (min)", 20]],
    amrap: [["min", "Durée (min)", 20]],
    emom: [["min", "Minutes", 12]],
    tabata: [["work", "Travail (s)", 20], ["rest", "Repos (s)", 10], ["rounds", "Tours", 8]],
    custom: [["work", "Travail (s)", 40], ["rest", "Repos (s)", 20], ["rounds", "Tours", 10]],
  };
  let selMode = null, tick = null, paused = false, state = null, AC = null, wakeLock = null;

  const beep = (freq, dur, when) => {
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      const o = AC.createOscillator(), g = AC.createGain();
      o.frequency.value = freq; o.connect(g); g.connect(AC.destination);
      const t = AC.currentTime + (when || 0);
      g.gain.setValueAtTime(.4, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
      o.start(t); o.stop(t + dur);
    } catch (e) { /* pas de son */ }
  };
  const keepAwake = async on => {
    try {
      if (on && "wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen");
      else if (wakeLock) { wakeLock.release(); wakeLock = null; }
    } catch (e) { /* non supporté */ }
  };
  const fmt = s => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");

  const render = () => {
    const run = $("ch-run"), { mode, p } = state;
    let phase, time, sub = "", travail = true;
    if (state.phase === "countdown") { phase = "PRÊT ?"; time = state.t; sub = "ça part dans…"; }
    else if (mode === "fortime") { phase = "FOR TIME"; time = fmt(state.elapsed); sub = p.cap ? "limite " + p.cap + " min" : ""; }
    else if (mode === "amrap") { phase = "AMRAP " + p.min + "'"; time = fmt(Math.max(0, p.min * 60 - state.elapsed)); sub = "écoulé " + fmt(state.elapsed); }
    else if (mode === "emom") { phase = "EMOM · MINUTE " + state.round + " / " + p.min; time = fmt(60 - (state.elapsed % 60)); sub = "total " + fmt(state.elapsed); travail = state.round % 2 === 1; }
    else { phase = (state.inWork ? "TRAVAIL" : "REPOS") + " · TOUR " + Math.min(state.round, p.rounds) + " / " + p.rounds; time = fmt(Math.max(0, (state.inWork ? p.work : p.rest) - state.elapsed)); travail = state.inWork; }
    run.classList.toggle("work", state.phase !== "countdown" && travail);
    run.classList.toggle("rest", state.phase !== "countdown" && !travail);
    $("ch-phase").textContent = phase; $("ch-time").textContent = time; $("ch-sub").textContent = sub;
  };
  const finish = () => {
    clearInterval(tick);
    beep(1320, .3); beep(1320, .3, .4); beep(1760, .8, .8);
    $("ch-phase").textContent = "TERMINÉ"; $("ch-sub").textContent = "beau travail";
    state = null; keepAwake(false);
  };
  const step = () => {
    if (paused || !state) return;
    if (state.phase === "countdown") {
      state.t--;
      if (state.t <= 3 && state.t > 0) beep(880, .15);
      if (state.t <= 0) { beep(1320, .5); state.phase = "run"; state.elapsed = 0; }
      return render();
    }
    state.elapsed++;
    const { mode, p } = state;
    if (mode === "fortime") { if (p.cap && state.elapsed >= p.cap * 60) return finish(); }
    else if (mode === "amrap") { const r = p.min * 60 - state.elapsed; if (r === 60) beep(660, .3); if (r <= 0) return finish(); }
    else if (mode === "emom") {
      if (state.elapsed % 60 === 0) { state.round++; if (state.round > p.min) return finish(); beep(1100, .3); }
      else if (state.elapsed % 60 >= 57) beep(880, .12);
    } else {
      const len = state.inWork ? p.work : p.rest;
      if (state.elapsed >= len) {
        state.elapsed = 0;
        if (state.inWork && p.rest > 0) { state.inWork = false; beep(440, .4); }
        else { state.inWork = true; state.round++; beep(1320, .3); }
        if (state.round > p.rounds) return finish();
      } else if (len - state.elapsed <= 3) beep(880, .12);
    }
    render();
  };
  const setPause = p => { paused = p; $("ch-pause").textContent = p ? "Reprendre" : "Pause"; };
  const start = (mode, p) => {
    $("ch-setup").hidden = true; $("ch-run").hidden = false;
    keepAwake(true);
    state = { mode, p, phase: "countdown", t: 10, elapsed: 0, round: 1, inWork: true };
    setPause(false); render();
    clearInterval(tick); tick = setInterval(step, 1000);
  };
  const choisir = mode => {
    selMode = mode;
    document.querySelectorAll("#ch-modes button").forEach(x => x.classList.toggle("on", x.dataset.mode === mode));
    $("ch-params").innerHTML = PARAMS[mode].map(([k, lab, dv]) =>
      `<label class="ch-param"><span>${lab}</span><input type="number" inputmode="numeric" id="chp-${k}" value="${dv}"></label>`).join("");
    $("ch-start").hidden = false;
  };

  // Depuis une séance : ouvre l'onglet Chrono pré-réglé (on ajuste puis GO)
  const lance = spec => {
    const onglet = document.querySelector('#tabs button[data-tab="chrono"]');
    if (onglet) onglet.click();
    if (state) return;   // un chrono tourne déjà : on ne l'écrase pas
    choisir(spec.mode);
    const v = spec.mode === "amrap" || spec.mode === "emom" ? { min: spec.min } : spec.mode === "fortime" ? { cap: spec.cap || 30 } : {};
    Object.entries(v).forEach(([k, x]) => { const i = $("chp-" + k); if (i && x) i.value = x; });
    window.scrollTo(0, 0);
  };

  if ($("ch-modes")) {
    document.querySelectorAll("#ch-modes button").forEach(b => b.addEventListener("click", () => choisir(b.dataset.mode)));
    $("ch-start").addEventListener("click", () => {
      const p = {}; PARAMS[selMode].forEach(([k]) => p[k] = parseInt($("chp-" + k).value) || 0);
      start(selMode, p);
    });
    $("ch-pause").addEventListener("click", () => setPause(!paused));
    $("ch-stop").addEventListener("click", () => {
      clearInterval(tick); state = null; keepAwake(false);
      $("ch-run").hidden = true; $("ch-setup").hidden = false;
    });
  }
  rendreCharges();

  window.CHRONO = { detecte, lance, kgLigne, surChangementCharges: f => majCharges.push(f) };
})();
