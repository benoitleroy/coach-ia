/* Bachata N.S.T — Aujourd'hui / Chrono / WODs */
(function () {
  "use strict";

  function el(id) { return document.getElementById(id); }
  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  /* ═══ Navigation entre pages ═══ */
  const pages = { jour: el("page-jour"), chrono: el("page-chrono"), wods: el("page-wods"), charges: el("page-charges") };
  document.querySelectorAll(".bottomnav button").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".bottomnav button").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      Object.entries(pages).forEach(([k, p]) => p.hidden = k !== b.dataset.page);
      window.scrollTo(0, 0);
    });
  });

  /* ═══ Charges maxi (1RM) ═══ */
  const LIFTS = [
    { id: "backsquat",  label: "Back Squat",   keys: /back squat|(?<!front |overhead )squat(?! clean| snatch)/i },
    { id: "frontsquat", label: "Front Squat",  keys: /front squat/i },
    { id: "deadlift",   label: "Deadlift",     keys: /deadlift/i },
    { id: "bench",      label: "Bench Press",  keys: /bench/i },
    { id: "strictpress",label: "Strict Press", keys: /strict press/i },
    { id: "pushpress",  label: "Push Press",   keys: /push press/i },
    { id: "powersnatch",label: "Power Snatch", keys: /power snatch/i },
    { id: "squatsnatch",label: "Squat Snatch", hint: "arraché complet", keys: /squat snatch|(?<!power |muscle )snatch(?! pull)/i },
    { id: "powerclean", label: "Power Clean",  keys: /power clean/i },
    { id: "squatclean", label: "Squat Clean",  hint: "épaulé complet", keys: /squat clean|(?<!power |muscle |hang power )clean(?! (&|and) jerk)/i },
    { id: "splitjerk",  label: "Split Jerk",   keys: /jerk/i },
    { id: "chinup",     label: "Chin-Up lesté", hint: "poids ajouté", keys: /chin.?up|pull.?up/i },
  ];
  function loadRM() { try { return JSON.parse(localStorage.getItem("bachata_1rm")) || {}; } catch (e) { return {}; } }
  function saveRM(rm) { try { localStorage.setItem("bachata_1rm", JSON.stringify(rm)); } catch (e) { /* privé */ } }
  let RM = loadRM();
  // RM de la séance : saisi dans le bloc de force, vit tant que l'app est ouverte, non sauvegardé.
  function loadRMS() { try { return JSON.parse(sessionStorage.getItem("bachata_1rm_session")) || {}; } catch (e) { return {}; } }
  let RM_S = loadRMS();
  function saveRMS() { try { sessionStorage.setItem("bachata_1rm_session", JSON.stringify(RM_S)); } catch (e) { /* privé */ } }
  function effRM(id) { return RM_S[id] != null ? RM_S[id] : RM[id]; }

  function renderCharges() {
    const box = el("charges-liste");
    box.innerHTML = "";
    LIFTS.forEach(l => {
      const row = document.createElement("div");
      row.className = "charge-row";
      row.innerHTML = "<span class='lift'>" + l.label + (l.hint ? "<small>" + l.hint + "</small>" : "") + "</span>" +
        "<input type='number' inputmode='decimal' step='0.5' id='rm-" + l.id + "' value='" + (RM[l.id] || "") + "' placeholder='—' aria-label='1RM " + l.label + "'>" +
        "<span class='unit'>kg</span>";
      row.querySelector("input").addEventListener("change", e => {
        const v = parseFloat(e.target.value);
        if (v > 0) RM[l.id] = v; else delete RM[l.id];
        saveRM(RM);
        renderJour();
      });
      box.appendChild(row);
    });
  }

  /* Trouve le lift correspondant à un texte (nom après "1RM", sinon titre de section) */
  function liftFor(name) {
    if (!name) return null;
    const n = name.normalize("NFKC");
    return LIFTS.find(l => l.keys.test(n)) || null;
  }
  function roundKg(v) { return Math.round(v * 2) / 2; }

  /* Ajoute "→ XXkg" après les pourcentages de 1RM si le maxi est connu.
     Une ligne est éligible si elle mentionne "1RM", ou si elle dit "à N%" / "reps à N%"
     dans une section dont le titre désigne un lift. Jamais sur "% effort" ni "% du FTP". */
  function computePercents(html, sectionTitle) {
    const ctxLift = liftFor(sectionTitle);
    return html.split("\n").map(line => {
      const plain = line.normalize("NFKC");
      if (!/%/.test(plain) || /effort|FTP/i.test(plain)) return line;
      const has1RM = /1\s*RM/i.test(plain);
      if (!has1RM && !(ctxLift && (/à\s*\d+\s*%/i.test(plain) || /\d+\s*%\s*\(/.test(plain)))) return line;
      return line.replace(/(\d+)(?:\s*[-–]\s*(\d+))?\s*%/g, (m, p1, p2) => {
        const after = plain.slice(plain.indexOf(m) + m.length);
        const lift = (has1RM && liftFor(after.slice(0, 60).replace(/^[^A-Za-z]*(du\s*)?1\s*RM/i, ""))) || ctxLift || liftFor(plain);
        if (!lift || !effRM(lift.id)) return m;
        const a = roundKg(effRM(lift.id) * p1 / 100);
        const b = p2 ? roundKg(effRM(lift.id) * p2 / 100) : null;
        return m + " <span class='kg-calc'>→ " + a + (b ? "–" + b : "") + " kg</span>";
      });
    }).join("\n");
  }

  /* ═══ Types de sections : icône + couleur ═══ */
  const SECTION_TYPES = [
    { re: /^WARM.?UP/i,                          ic: "i-flame", color: "#00D4AA", lbl: "Warm Up" },
    { re: /^(ABSOLUTE STRENGTH|.?RELATIVE.? STRENGTH(?! ENDURANCE))/i, ic: "i-bar", color: "#F97316", lbl: "Force" },
    { re: /^STRENGTH.?SPEED/i,                   ic: "i-bar",   color: "#F97316", lbl: "Haltéro" },
    { re: /^(STRENGTH ENDURANCE|RELATIVE STRENGTH ENDURANCE)/i, ic: "i-bar", color: "#FB923C", lbl: "Endurance de force" },
    { re: /CONDITIONING|^OPTION \d/i,            ic: "i-heart", color: "#EF4444", lbl: "Conditioning" },
    { re: /^.?OPTIONAL.?\)? ?STRENGTH ACCESSORY/i, ic: "i-plus", color: "#8B92A6", lbl: "Accessoire (optionnel)" },
    { re: /TEAM VERSION/i,                       ic: "i-users", color: "#8B92A6", lbl: "Version équipe" },
    { re: /^FULL REST|^REPOS/i,                  ic: "i-moon",  color: "#00D4AA", lbl: "Repos" },
    { re: /^OPTIONAL EXTRA/i,                    ic: "i-run",   color: "#EF4444", lbl: "Extra optionnel" },
  ];
  const TITLE_PREFIXES = /^(WARM.?UP|ABSOLUTE STRENGTH|STRENGTH ENDURANCE|STRENGTH.?SPEED|RELATIVE STRENGTH|CONDITIONING|OPTION \d|.?OPTIONAL.?\)? ?(STRENGTH ACCESSORY|CONDITIONING)|\(?TEAM VERSION|FULL REST DAY|OPTIONAL EXTRA|SEMAINE DE TRANSITION|BLOC S?\d)/i;

  function typeOf(title) {
    const t = title.normalize("NFKC");
    return SECTION_TYPES.find(s => s.re.test(t)) || { ic: "i-note", color: "#8B92A6", lbl: "" };
  }

  /* ═══ AUJOURD'HUI ═══ */
  const NST = window.NST_JOURS || {};
  const dates = Object.keys(NST).sort();
  const JOURS_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const MOIS_FR = ["janv.", "févr.", "mars", "avril", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

  function todayKey() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  let cur = NST[todayKey()] ? todayKey() : dates[dates.length - 1] || null;

  function renderJour() {
    const cont = el("jour-contenu");
    if (!cur || !NST[cur]) { cont.innerHTML = "<p class='muted' style='margin:1rem'>Aucune séance en base.</p>"; return; }
    const d = new Date(cur + "T12:00:00");
    el("jour-date").innerHTML = escapeHtml(JOURS_FR[d.getDay()] + " " + d.getDate() + " " + MOIS_FR[d.getMonth()]) +
      (cur === todayKey() ? "<span class='today-tag'>aujourd'hui</span>" : "");
    el("jour-titre").textContent = NST[cur].titre;
    cont.innerHTML = "";

    const { banner, sections } = splitSections(NST[cur].contenu);
    if (banner) {
      const b = document.createElement("div");
      b.className = "bloc-banner";
      b.innerHTML = escapeHtml(banner.title) + (banner.body ? "<span class='muted'>" + linkify(banner.body) + "</span>" : "");
      cont.appendChild(b);
    }
    sections.forEach((s, idx) => {
      const type = typeOf(s.title);
      const div = document.createElement("div");
      div.className = "section" + (idx === 0 ? " open" : "");
      div.style.setProperty("--sec-color", type.color);
      const timer = detectTimer(s.body);
      const lift = /%/.test(s.body.normalize("NFKC")) ? liftFor(s.title) : null;
      div.innerHTML =
        "<button class='section-head' aria-expanded='" + (idx === 0) + "'>" +
        "<svg class='ic'><use href='#" + type.ic + "'/></svg>" +
        "<span class='lbl'>" + escapeHtml(cleanTitle(s.title)) + (type.lbl ? "<span class='sub'>" + escapeHtml(type.lbl) + "</span>" : "") + "</span>" +
        "<svg class='ic chev'><use href='#i-chev'/></svg></button>" +
        "<div class='section-body'>" +
        (timer ? "<button class='go-inline'><svg class='ic' style='width:16px;height:16px'><use href='#i-play'/></svg>GO " + timer.label + "</button>" : "") +
        (lift ? "<div class='rm-inline'><span>1RM " + escapeHtml(lift.label) + "</span>" +
          "<input type='number' inputmode='decimal' step='0.5' value='" + (effRM(lift.id) || "") + "' placeholder='max' aria-label='1RM " + lift.label + " du jour'>" +
          "<span class='unit'>kg</span><small>saisie du jour — non mémorisée</small></div>" : "") +
        "<div class='sec-content'>" + computePercents(linkify(s.body), s.title) + "</div></div>";
      if (lift) {
        div.querySelector(".rm-inline input").addEventListener("input", e => {
          const v = parseFloat(e.target.value);
          if (v > 0) RM_S[lift.id] = v; else delete RM_S[lift.id];
          saveRMS();
          div.querySelector(".sec-content").innerHTML = computePercents(linkify(s.body), s.title);
        });
      }
      div.querySelector(".section-head").addEventListener("click", () => {
        div.classList.toggle("open");
        div.querySelector(".section-head").setAttribute("aria-expanded", div.classList.contains("open"));
      });
      const go = div.querySelector(".go-inline");
      if (go) go.addEventListener("click", e => { e.stopPropagation(); launchFromSpec(timer); });
      cont.appendChild(div);
    });
  }

  /* Découpe : bannière de bloc (1re ligne SEMAINE/BLOC) + sections par mots-clés */
  function splitSections(txt) {
    const lines = txt.split("\n");
    let banner = null;
    const out = []; let curSec = null;
    for (const raw of lines) {
      const l = raw.normalize("NFKC").trim();
      if (!banner && !out.length && /^(SEMAINE DE TRANSITION|BLOC)/i.test(l)) {
        banner = { title: l.replace(/^𝐒/, "S"), body: "" };
        continue;
      }
      if (TITLE_PREFIXES.test(l) && !/^(SEMAINE|BLOC)/i.test(l)) {
        curSec = { title: l, body: "" };
        out.push(curSec);
      } else if (curSec) curSec.body += raw + "\n";
      else if (banner) banner.body += raw + "\n";
      else { curSec = { title: "Note du coach", body: raw + "\n" }; out.push(curSec); }
    }
    out.forEach(s => s.body = s.body.trim());
    if (banner) banner.body = banner.body.trim();
    return { banner, sections: out.filter(s => s.body) };
  }

  function cleanTitle(t) {
    return t.normalize("NFKC").replace(/\s*—.*$/, "").replace(/^\((OPTIONAL|Optionnel)\)\s*/i, "").trim();
  }

  /* URLs → boutons vidéo ; niveaux Elite/RX → gras orange */
  function linkify(txt) {
    let h = escapeHtml(txt);
    h = h.replace(/(https?:\/\/[^\s<]+)/g, url => {
      const yt = /youtu/.test(url), insta = /instagram/.test(url);
      const lbl = yt ? "Vidéo YouTube" : insta ? "Tips Instagram" : "Lien";
      return "<a class='vid-link" + (insta ? " insta" : "") + "' href='" + url + "' target='_blank' rel='noopener'>" +
        "<svg class='ic'><use href='#i-video'/></svg>" + lbl + "</a>";
    });
    h = h.replace(/^(𝐄𝐥𝐢𝐭𝐞|𝐑𝐗|𝐑𝐱|𝐈𝐧𝐭𝐞𝐫𝐦𝐞𝐝𝐢𝐚𝐭𝐞|𝐒𝐜𝐚𝐥𝐞𝐝|Elite|RX|Rx|Intermediate|Scaled)( ?\(Opt \d\))?\s*:/gm,
      m => "<strong class='lvl'>" + m.normalize("NFKC") + "</strong>");
    return h;
  }

  el("btn-prev").addEventListener("click", () => move(-1));
  el("btn-next").addEventListener("click", () => move(1));
  function move(dir) {
    const i = dates.indexOf(cur), n = i + dir;
    if (n >= 0 && n < dates.length) { cur = dates[n]; renderJour(); window.scrollTo(0, 0); }
  }

  /* Détection du format de chrono */
  function detectTimer(t0) {
    const t = t0.normalize("NFKC");
    let m;
    if ((m = t.match(/(\d+)\s*min(?:ute)?\s*AMRAP|AMRAP\s*(\d+)/i))) {
      const min = parseInt(m[1] || m[2]);
      return { mode: "amrap", min, label: "AMRAP " + min + "'" };
    }
    if ((m = t.match(/(\d+)\s*min(?:ute)?\s*EMOM/i)) || (m = t.match(/EMOM[^.\n]*?(\d+)\s*(?:min|rounds)/i))) {
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
    el("chrono-params").innerHTML = PARAMS[selMode].map(([k, lab, dv]) =>
      "<div class='param'><label for='p-" + k + "'>" + lab + "</label><input type='number' inputmode='numeric' id='p-" + k + "' value='" + dv + "'></div>").join("");
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

  /* Sons */
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

  /* Wake lock */
  let wakeLock = null;
  async function keepAwake(on) {
    try {
      if (on && "wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen");
      else if (wakeLock) { wakeLock.release(); wakeLock = null; }
    } catch (e) { /* non supporté */ }
  }

  let tick = null, paused = false, state = null;

  function startTimer(mode, p) {
    el("chrono-setup").hidden = true;
    el("chrono-run").hidden = false;
    keepAwake(true);
    state = { mode, p, phase: "countdown", t: 10, elapsed: 0, round: 1, inWork: true };
    paused = false;
    setPauseLabel(false);
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
    } else {
      const len = state.inWork ? p.work : p.rest;
      if (state.elapsed >= len) {
        state.elapsed = 0;
        if (state.inWork && p.rest > 0) { state.inWork = false; beep(440, .4); }
        else { state.inWork = true; state.round++; beep(1320, .3); }
        if (state.round > p.rounds) return finish();
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
      phase = "EMOM · MINUTE " + state.round + " / " + p.min;
      time = fmt(60 - (state.elapsed % 60)); sub = "total " + fmt(state.elapsed);
      run.classList.add(state.round % 2 ? "work" : "rest");
    } else {
      phase = (state.inWork ? "TRAVAIL" : "REPOS") + " · TOUR " + Math.min(state.round, p.rounds) + " / " + p.rounds;
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
    el("run-phase").textContent = "TERMINÉ";
    el("run-sub").textContent = "beau travail, guerrier";
    state = null;
    keepAwake(false);
  }

  function setPauseLabel(p) { el("btn-pause").querySelector("span").textContent = p ? "Reprendre" : "Pause"; }
  el("btn-pause").addEventListener("click", () => { paused = !paused; setPauseLabel(paused); });
  el("btn-stop").addEventListener("click", () => {
    clearInterval(tick); state = null; keepAwake(false);
    el("chrono-run").hidden = true;
    el("chrono-setup").hidden = false;
  });

  /* ═══ WODS ═══ */
  const WODS = window.WODS || [];
  let srcFilter = null;
  const srcBox = el("wod-sources");
  [...new Set(WODS.map(w => w.source))].forEach(s => {
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
      return ((w.name || "") + " " + (w.fr || w.en || []).join(" ")).toLowerCase().includes(q);
    }).slice(0, 60);
    match.forEach(w => {
      const lines = (w.fr && w.fr.length ? w.fr : w.en || []).join("\n");
      const timer = detectTimer(lines);
      const card = document.createElement("div");
      card.className = "wod-card";
      card.innerHTML = "<h3>" + escapeHtml(w.name || w.date || w.id) + "</h3>" +
        "<div class='muted'>" + escapeHtml(w.source + (w.date ? " · " + w.date : "")) + "</div>" +
        "<div class='lines'>" + escapeHtml(lines) + "</div>" +
        (timer ? "<button class='go-inline'><svg class='ic' style='width:16px;height:16px'><use href='#i-play'/></svg>GO " + timer.label + "</button>" : "");
      const go = card.querySelector(".go-inline");
      if (go) go.addEventListener("click", () => launchFromSpec(timer));
      list.appendChild(card);
    });
    if (!match.length) list.innerHTML = "<p class='muted' style='margin:1rem'>Aucun WOD trouvé.</p>";
  }
  renderWods();

  renderCharges();
  renderJour();
})();
