// js/carnet.js — rendu de la page Carnet à partir de window.CARNET
// (généré par scripts/carnet.js à chaque sync). Zéro dépendance.

(function () {
  const C = window.CARNET;
  const $ = id => document.getElementById(id);
  if (!C) return;

  const DISC = {
    natation: { label: "Natation", ico: "🏊" },
    velo:     { label: "Vélo",     ico: "🚴" },
    course:   { label: "Course",   ico: "🏃" },
    autre:    { label: "Renfo & autre", ico: "💪" },
  };
  const JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
  const MOIS  = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

  const fmtH = sec => {
    const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
    if (h === 0) return `${m} min`;
    return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
  };
  const fmtHshort = sec => (sec / 3600).toFixed(1).replace(".", ",") + " h";
  const fmtKm = km => km >= 10 ? Math.round(km) + " km" : km.toFixed(1).replace(".", ",") + " km";
  const fmtDate = iso => { const d = new Date(iso); return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`; };
  const fmtRatio = r => r == null ? "—" : r.toFixed(2).replace(".", ",");
  const pct = n => (n > 0 ? "+" : "") + n + " %";
  const plural = (n, s) => n + " " + s + (n > 1 ? "s" : "");

  // ── En-tête ──
  const gen = new Date(C.generatedAt);
  $("titre").textContent = `Semaine ${C.semaine.label.replace("S", "")}`;
  $("sync").textContent = `Sync ${JOURS[gen.getDay()]} ${gen.getDate()} ${MOIS[gen.getMonth()]} · ${gen.getHours()}h${String(gen.getMinutes()).padStart(2, "0")}`;

  // ── 1 · Volume ──
  const s = C.semaine;
  $("vol-total").textContent = fmtH(s.sec);
  $("vol-seances").textContent = s.count ? plural(s.count, "séance") + (s.km ? ` · ${fmtKm(s.km)}` : "") : "aucune séance pour l'instant";
  if (s.vs4 != null) {
    $("vs4").textContent = `${pct(s.vs4)} vs moy. 4 sem. (${fmtHshort(s.avg4sec)})`;
  } else {
    $("vs4").textContent = "pas de base de comparaison";
  }
  $("tiles").innerHTML = Object.keys(DISC).map(k => {
    const d = s.disc[k];
    const zero = !d || d.sec === 0;
    let sub = "";
    if (k === "autre") {
      const entries = Object.entries(s.autres || {});
      sub = entries.length ? entries.map(([l, n]) => `${l}${n > 1 ? " ×" + n : ""}`).join(", ") : "";
    } else if (!zero && d.km) sub = fmtKm(d.km);
    return `<div class="tile ${k}${zero ? " zero" : ""}"><small>${DISC[k].ico} ${DISC[k].label}</small><b>${zero ? "—" : fmtH(d.sec)}</b><span class="tile-sub">${sub}</span></div>`;
  }).join("");

  // ── 2 · Charge ──
  const ch = C.charge;
  const STATUT = {
    ok:       { pill: "zone verte",       txt: `Charge 7 j (${ch.aigue}) cohérente avec tes 28 derniers jours (${ch.chronique}). Tu peux continuer sur ce rythme.` },
    haute:    { pill: "charge haute",     txt: `La semaine pèse ${ch.aigue} contre ${ch.chronique} en moyenne sur 28 j, et c'est au-dessus de ta semaine habituelle (${ch.typique}). Garde une séance facile avant d'en rajouter.` },
    basse:    { pill: "charge basse",     txt: `Semaine allégée (${ch.aigue} contre ${ch.chronique} sur 28 j). Récup assumée ou occasion de remettre une séance.` },
    remontee: { pill: "remontée",         txt: `Le ratio grimpe (${fmtRatio(ch.ratio)}) mais la semaine (${ch.aigue}) reste sous ta semaine habituelle (${ch.typique}) : c'est une remontée normale, pas une surcharge.` },
    reprise:  { pill: "reprise",          txt: `Peu de base sur 28 j (${plural(ch.nb28, "séance")}, chronique ${ch.chronique} vs ${ch.typique} habituel) : le ratio n'est pas significatif. Remonte progressivement, le juge reviendra tout seul.` },
    repos:    { pill: "repos",            txt: `Aucune séance sur 7 jours. Rien à juger — la chronique (${ch.chronique}) baisse doucement.` },
    "no-data":{ pill: "pas de données",   txt: `Aucune séance sur 28 jours.` },
  };
  const st = STATUT[ch.statut] || STATUT["no-data"];
  $("ratio").textContent = fmtRatio(ch.ratio);
  const pill = $("charge-pill"); pill.textContent = st.pill; pill.className = "pill " + ch.statut;
  $("charge-explain").textContent = st.txt + " Charges en unités d'effort Strava, lissées (7 j / 28 j).";
  const dot = $("gauge-dot");
  if (ch.ratio == null) dot.classList.add("hidden");
  else {
    // échelle 0 → 2.5 sur la largeur ; zone verte 0.8–1.3 = 32 % → 52 %
    const x = Math.max(0, Math.min(1, ch.ratio / 2.5)) * 100;
    dot.style.left = x + "%";
    dot.className = "gauge-dot " + (["ok", "haute", "basse"].includes(ch.statut) ? ch.statut : "");
  }

  // ── 3 · Intensité ──
  const it = C.intensite;
  if (it.easy == null) {
    $("int-easy").textContent = "—"; $("int-hard").textContent = "—";
    $("int-n").textContent = "pas de FC sur 4 sem.";
    $("split-easy").style.width = "0"; $("split-hard").style.width = "0";
    $("int-explain").textContent = "Aucune séance avec fréquence cardiaque sur les 4 dernières semaines.";
  } else {
    $("int-easy").textContent = it.easy + " %"; $("int-hard").textContent = it.hard + " %";
    $("int-n").textContent = `${plural(it.n, "séance")} avec FC`;
    $("split-easy").style.width = it.easy + "%"; $("split-hard").style.width = it.hard + "%";
    let msg;
    if (it.n < 4) msg = "Trop peu de séances pour conclure — repère : viser ~80 / 20.";
    else if (it.easy >= 75) msg = "Bonne polarisation : l'essentiel en endurance, le dur reste l'exception.";
    else if (it.easy >= 60) msg = "Un peu trop de séances dans le « ni facile ni dur ». Repère : ~80 / 20.";
    else msg = "Beaucoup de séances au-dessus de 140 bpm : ralentis les sorties faciles, elles doivent être vraiment faciles.";
    $("int-explain").textContent = msg + " Calcul approximatif : FC moyenne par séance, seuil 140 bpm.";
  }

  // ── 4 · Régularité ──
  const r = C.regularite;
  $("reg-seances").textContent = String(r.seancesParSemaine).replace(".", ",");
  if (r.plusLongue28) {
    $("reg-longue").textContent = fmtH(r.plusLongue28.sec);
    $("reg-longue-sub").textContent = `${DISC[r.plusLongue28.disc].ico} ${fmtDate(r.plusLongue28.date)}`;
  } else { $("reg-longue").textContent = "—"; }
  $("reg-off").textContent = r.joursOff28;

  // ── 5 · Dernière séance + ressenti ──
  const FEEL_KEY = "carnet.ressenti";
  const feels = (() => { try { return JSON.parse(localStorage.getItem(FEEL_KEY) || "{}"); } catch { return {}; } })();
  const saveFeel = (id, v) => { feels[id] = v; localStorage.setItem(FEEL_KEY, JSON.stringify(feels)); };
  const FEEL_ICO = { 1: "😫", 2: "😐", 3: "💪" };
  const esc = t => String(t).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  // Contenu de séance lu sur la photo Strava (tableau WOD…) — ouvert pour la dernière séance, replié ailleurs
  const contenuHtml = (a, open) => {
    if (!a.contenu && !a.photo) return "";
    const img = a.photo ? `<a class="c-photo" href="${a.photo}" target="_blank" rel="noopener"><img src="${a.photo}" alt="photo de la séance" loading="lazy"></a>` : "";
    const txt = a.contenu ? `<pre class="c-txt">${esc(a.contenu)}</pre>` : `<span class="c-none">photo sans contenu lisible</span>`;
    return `<details class="contenu"${open ? " open" : ""}><summary>📋 Contenu de la séance</summary><div class="c-body">${txt}${img}</div></details>`;
  };

  const d = C.derniere;
  if (d) {
    const j = C.joursDepuis;
    $("der-quand").textContent = j === 0 ? "aujourd'hui" : j === 1 ? "hier" : `il y a ${j} jours`;
    const meta = [fmtH(d.sec), d.km ? fmtKm(d.km) : null, d.hr ? d.hr + " bpm" : null, d.watts ? d.watts + " W" : null].filter(Boolean).join(" · ");
    const label = d.disc === "autre" ? (d.typeLabel || d.type) : DISC[d.disc].label;
    $("derniere").innerHTML = `<span class="d-ico">${DISC[d.disc].ico}</span><span class="d-main">${label}</span><span class="d-meta">${meta}</span><span class="d-meta">${fmtDate(d.date)}${d.name ? " · " + d.name : ""}</span>`
      + contenuHtml(d, true);
    const btns = $("ressenti").querySelectorAll("button");
    const paint = () => btns.forEach(b => b.classList.toggle("on", feels[d.id] === Number(b.dataset.val)));
    btns.forEach(b => b.addEventListener("click", () => { saveFeel(d.id, Number(b.dataset.val)); paint(); renderRecentes(); }));
    paint();
  } else {
    $("derniere").textContent = "Aucune séance Strava.";
    $("ressenti").style.display = "none";
  }

  // ── 12 semaines ──
  const maxSec = Math.max(1, ...C.semaines.map(w => w.sec));
  $("weeks").innerHTML = C.semaines.map((w, i) => {
    const cur = i === C.semaines.length - 1;
    const bars = ["natation", "velo", "course", "autre"].map(k => {
      const sec = w.disc[k]?.sec || 0;
      return sec ? `<i class="${k}" style="width:${(100 * sec / maxSec).toFixed(1)}%"></i>` : "";
    }).join("");
    return `<li class="week${cur ? " current" : ""}"><span class="w-label">${w.label}</span><span class="w-bar">${bars}</span><span class="w-h">${w.sec ? fmtHshort(w.sec) : "—"}</span><span class="w-n">${w.count || ""}</span></li>`;
  }).join("");

  // ── Récentes ──
  function renderRecentes() {
    $("recentes").innerHTML = C.recentes.map(a => {
      const label = a.disc === "autre" ? (a.typeLabel || a.type) : DISC[a.disc].label;
      const meta = [fmtH(a.sec), a.km && a.disc !== "autre" ? fmtKm(a.km) : null, a.hr ? a.hr + " bpm" : null].filter(Boolean).join(" · ");
      const feel = feels[a.id] ? `<span class="r-feel">${FEEL_ICO[feels[a.id]]}</span>` : "";
      return `<li><span>${DISC[a.disc].ico}</span><span>${label}${feel}<br><span class="r-date">${fmtDate(a.date)}${a.name ? " · " + a.name : ""}</span>${contenuHtml(a, false)}</span><span class="r-meta">${meta}</span></li>`;
    }).join("");
  }
  renderRecentes();
})();
