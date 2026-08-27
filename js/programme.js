// js/programme.js — page Programme : séance du jour, semaine, cycle, historique des séances.
(function () {
  const P = window.PROGRAMME, C = (window.BILAN && window.BILAN.coach) || null, S = window.SEANCES || [];
  const $ = id => document.getElementById(id);
  const esc = t => String(t ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
  const JJ = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const fmtDate = iso => { const d = new Date(iso.length <= 10 ? iso + "T12:00:00" : iso); return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`; };
  const fmtH = sec => { const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60); return h ? (m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`) : `${m} min`; };
  const today = new Date(); const todayKey = today.toISOString().slice(0, 10);

  // ── Onglets ──
  document.querySelectorAll("#tabs button").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll("#tabs button").forEach(x => x.classList.toggle("on", x === b));
    document.querySelectorAll(".tabpane").forEach(p => p.classList.toggle("on", p.id === "tab-" + b.dataset.tab));
    window.scrollTo(0, 0);
  }));

  // ── En-tête ──
  if (P) {
    const c = P.courant;
    $("pg-cycle").textContent = P.nom;
    if (c && c.bloc) {
      $("pg-titre").textContent = `Bloc ${c.bloc.id} · ${c.bloc.nom}`;
      $("pg-cycle").textContent = c.avantDebut
        ? `${P.nom} · démarre ${fmtDate(P.debut)}`
        : `${P.nom} · semaine ${c.semaineDansCycle}/${c.totalSemaines}`;
    }
  }

  // ── Semaine (plan du coach) ──
  const sem = C && C.semaine;
  const jourIndexAuj = (today.getDay() + 6) % 7;   // 0 = lundi
  if (sem && Array.isArray(sem.jours)) {
    $("sem-label").textContent = C.semaineDebut ? `${fmtDate(C.semaineDebut)} → ${fmtDate(C.semaineFin)}` : "Semaine";
    $("sem-vol").textContent = sem.volumeCible || "";
    $("sem-obj").textContent = sem.titre || "";
    const lundi = C.semaineDebut ? new Date(C.semaineDebut + "T12:00:00") : null;
    $("sem-plan").innerHTML = sem.jours.map((j, i) => {
      const d = lundi ? new Date(lundi.getTime() + i * 86400000) : null;
      const key = d ? d.toISOString().slice(0, 10) : null;
      const fait = key ? S.some(s => s.date.slice(0, 10) === key) : false;
      const cur = i === jourIndexAuj;
      return `<li class="${/😴/.test(j.ico || "") ? "repos " : ""}${cur ? "cur" : ""}"><span class="p-jour">${esc(j.jour)}${d ? `<small>${d.getDate()}</small>` : ""}</span><span class="p-ico">${fait ? "✅" : esc(j.ico || "")}</span><span><div class="p-titre">${esc(j.seance)}</div><div class="p-detail">${esc(j.detail || "")}</div>${j.gardefou ? `<div class="p-garde">${esc(j.gardefou)}</div>` : ""}</span></li>`;
    }).join("");
    $("sem-regle2").textContent = C.regle || "";

    // ── Aujourd'hui ──
    const j = sem.jours[jourIndexAuj];
    $("jour-date").textContent = fmtDate(todayKey);
    const faitAuj = S.filter(s => s.date.slice(0, 10) === todayKey);
    $("jour-etat").textContent = faitAuj.length ? `✅ ${faitAuj.length} séance${faitAuj.length > 1 ? "s" : ""} enregistrée${faitAuj.length > 1 ? "s" : ""}` : "à faire";
    if (j) {
      $("jour-seance").innerHTML = `<span class="d-ico">${esc(j.ico || "")}</span> <span class="d-main">${esc(j.seance)}</span>`;
      $("jour-detail").textContent = j.detail || "";
      $("jour-garde").textContent = j.gardefou && j.gardefou !== "—" ? "⚑ " + j.gardefou : "";
    }
    const rep = C.nutrition && (C.nutrition.jours || []).find(x => (x.jour || "").toLowerCase().startsWith(JJ[today.getDay()].toLowerCase()));
    if (rep) {
      $("jour-repas-bloc").hidden = false;
      $("jour-repas-type").textContent = rep.type || "";
      $("jour-repas").innerHTML = [["Matin", rep.petitDej], ["Midi", rep.dejeuner], ["Séance", rep.collation], ["Soir", rep.diner]]
        .filter(([, v]) => v && v !== "—").map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("");
    }
  }

  // ── Dernière séance box (référence de charges) ──
  const estBox = s => /Workout|WeightTraining|Crossfit|HighIntensityIntervalTraining/i.test(s.type) || /crossfit|wod|renfo|force/i.test(s.name);
  const derniereBox = S.filter(estBox).find(s => s.contenu || s.note);
  if (derniereBox) {
    $("jour-ref-bloc").hidden = false;
    $("jour-ref-quand").textContent = fmtDate(derniereBox.date);
    $("jour-ref").innerHTML =
      `<div class="ref-ligne">${esc(derniereBox.name || derniereBox.type)} · ${fmtH(derniereBox.sec)}${derniereBox.hr ? " · " + derniereBox.hr + " bpm" : ""}</div>`
      + (derniereBox.note ? `<div class="c-note">✍️ ${esc(derniereBox.note)}</div>` : "")
      + (derniereBox.contenu ? `<details class="ref-wod"><summary>Voir le tableau du WOD</summary><pre class="c-txt">${esc(derniereBox.contenu)}</pre></details>` : "")
      + `<a class="ref-lien" href="#" data-goto="histo">Tout l'historique →</a>`;
    const lien = $("jour-ref").querySelector("[data-goto]");
    if (lien) lien.addEventListener("click", e => { e.preventDefault(); document.querySelector('#tabs button[data-tab="histo"]').click(); });
  }

  // ── Cycle ──
  if (P) {
    $("cy-nom").textContent = P.nom;
    $("cy-dates").textContent = `${fmtDate(P.debut)} → ${fmtDate(P.fin)}`;
    $("cy-objectif").textContent = P.objectif || "";
    $("cy-cible").textContent = P.cible ? "🎯 " + P.cible.libelle : "";
    const cur = P.courant && !P.courant.avantDebut ? P.courant.semaineDansCycle : 0;
    const total = (P.blocs || []).reduce((s, b) => s + b.semaines, 0);
    $("cy-bar").innerHTML = Array.from({ length: total }, (_, i) => {
      const n = i + 1; let acc = 0, id = 1;
      for (const b of P.blocs) { if (n > acc && n <= acc + b.semaines) { id = b.id; break; } acc += b.semaines; }
      return `<i class="b${id}${n < cur ? " done" : ""}${n === cur ? " cur" : ""}" title="semaine ${n}"></i>`;
    }).join("");
    $("cy-blocs").innerHTML = (P.blocs || []).map(b => {
      const actif = P.courant && P.courant.bloc && P.courant.bloc.id === b.id;
      return `<section class="bloc"><div class="bloc-head"><h2>Bloc ${b.id} · ${esc(b.nom)}${actif ? " ← en cours" : ""}</h2><span class="hint">${b.semaines} sem. dès le ${fmtDate(b.debut)}</span></div><p class="pg-but">${esc(b.but)}</p><ul class="coach-list">${b.priorites.map(p => `<li>${esc(p)}</li>`).join("")}</ul><p class="pg-cible">🧪 ${esc(b.test)}</p></section>`;
    }).join("");
    $("cy-regles").innerHTML = (P.reglesPermanentes || []).map(r => `<li>${esc(r)}</li>`).join("");
  }

  // ── Historique ──
  const groupe = s => estBox(s) ? "box" : /Run|TrailRun|VirtualRun/i.test(s.type) ? "course" : "autre";
  let filtre = "box";
  const rendreHisto = () => {
    const list = S.filter(s => filtre === "tout" || groupe(s) === filtre);
    $("hi-count").textContent = `${list.length} sur 6 mois`;
    $("hi-list").innerHTML = list.map(s => {
      const meta = [fmtH(s.sec), s.km ? s.km + " km" : null, s.hr ? s.hr + " bpm" : null, s.hrMax ? "max " + s.hrMax : null].filter(Boolean).join(" · ");
      const corps = `${s.note ? `<div class="c-note">✍️ ${esc(s.note)}</div>` : ""}${s.contenu ? `<pre class="c-txt">${esc(s.contenu)}</pre>` : ""}${s.photo ? `<a class="c-photo" href="${s.photo}" target="_blank" rel="noopener"><img src="${s.photo}" alt="" loading="lazy"></a>` : ""}`;
      return corps
        ? `<li><details><summary><b>${fmtDate(s.date)}</b> · ${esc(s.name || s.type)}<br><small>${meta}</small></summary><div class="hi-body">${corps}</div></details></li>`
        : `<li class="plain"><b>${fmtDate(s.date)}</b> · ${esc(s.name || s.type)}<br><small>${meta}</small></li>`;
    }).join("") || "<li class='plain'>Aucune séance.</li>";
  };
  document.querySelectorAll("#hi-filtres button").forEach(b => b.addEventListener("click", () => {
    filtre = b.dataset.f;
    document.querySelectorAll("#hi-filtres button").forEach(x => x.classList.toggle("on", x === b));
    rendreHisto();
  }));
  rendreHisto();
})();
