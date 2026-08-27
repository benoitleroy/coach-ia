// js/programme.js — page Programme : séance du jour, semaine, cycle, historique des séances.
(function () {
  const P = window.PROGRAMME, C = (window.BILAN && window.BILAN.coach) || null, S = window.SEANCES || [];
  const MVT = window.MOUVEMENTS || [];
  const cleMvt = m => m.fr.replace(/\s*\(.*\)/, "").toLowerCase().trim();
  const detecte = texte => {
    const t = " " + String(texte || "").toLowerCase() + " ";
    const out = [];
    [...MVT].sort((a, b) => b.fr.length - a.fr.length).forEach(m => {
      const formes = [cleMvt(m), ...(m.alias || [])];
      if (!formes.some(f => f.length > 3 && t.includes(" " + f.toLowerCase()))) return;
      const k = cleMvt(m);
      if (out.some(x => cleMvt(x) === k || cleMvt(x).includes(k) || k.includes(cleMvt(x)))) return;
      out.push(m);
    });
    return out.slice(0, 8);
  };
  const blocMvts = texte => {
    const l = detecte(texte);
    if (!l.length) return "";
    return `<details class="mvt-aide"><summary>❔ Les exercices expliqués (${l.length})</summary>${l.map(m =>
      `<div class="mv-row"><div class="mv-sch">${m.schema && window.SCHEMA ? window.SCHEMA(m.schema) : "<span class='mv-none'>—</span>"}</div>
       <div><div class="mv-en">${esc(m.fr)}</div><div class="mv-desc">${esc(m.desc || "")}</div><div class="mv-n">en anglais : ${esc(m.en)}</div></div></div>`).join("")}</details>`;
  };
  // Checklist : étapes fournies par le coach, sinon découpage du détail
  const etapesDe = s => (s.etapes && s.etapes.length) ? s.etapes
    : String(s.detail || "").split(/(?<=[.;])\s+(?=[A-ZÉÈÀ0-9])/).map(x => x.trim()).filter(x => x.length > 3);
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
    const vide = s => !s || !s.titre || /^(rien|repos|—|-)$/i.test(s.titre.trim());
    const seancesDe = j => j.matin || j.soir
      ? [["Matin", j.matin], ["Soir", j.soir]].filter(([, s]) => !vide(s))
      : (j.seance ? [["", { ico: j.ico, titre: j.seance, detail: j.detail, gardefou: j.gardefou }]] : []);
    const ligneSeance = ([moment, s]) => {
      const et = etapesDe(s);
      return `<div class="s-item">${moment ? `<span class="s-moment">${moment}</span>` : ""}<span class="p-ico">${esc(s.ico || "")}</span><span><div class="p-titre">${esc(s.titre)}${s.intention ? ` <em class="s-int">${esc(s.intention)}</em>` : ""}</div><div class="p-detail">${esc(s.detail || "")}</div>${et.length ? `<ul class="etapes">${et.map(e => `<li>${esc(e)}</li>`).join("")}</ul>` : ""}${s.gardefou ? `<div class="p-garde">${esc(s.gardefou)}</div>` : ""}${blocMvts((s.detail || "") + " " + et.join(" "))}</span></div>`;
    };
    $("sem-plan").innerHTML = sem.jours.map((j, i) => {
      const d = lundi ? new Date(lundi.getTime() + i * 86400000) : null;
      const key = d ? d.toISOString().slice(0, 10) : null;
      const fait = key ? S.filter(s => s.date.slice(0, 10) === key).length : 0;
      const cur = i === jourIndexAuj;
      const items = seancesDe(j);
      return `<li class="jour${items.length ? "" : " repos"}${cur ? " cur" : ""}"><div class="j-head"><span class="p-jour">${esc(j.jour)}${d ? `<small>${d.getDate()}</small>` : ""}</span>${fait ? `<span class="j-fait">✅ ${fait}</span>` : ""}</div>${items.length ? items.map(ligneSeance).join("") : `<div class="s-item"><span class="p-ico">😴</span><span class="p-titre">Repos</span></div>`}</li>`;
    }).join("");
    $("sem-regle2").textContent = C.regle || "";

    // ── Aujourd'hui ──
    const j = sem.jours[jourIndexAuj];
    $("jour-date").textContent = fmtDate(todayKey);
    const faitAuj = S.filter(s => s.date.slice(0, 10) === todayKey);
    $("jour-etat").textContent = faitAuj.length ? `✅ ${faitAuj.length} séance${faitAuj.length > 1 ? "s" : ""} enregistrée${faitAuj.length > 1 ? "s" : ""}` : "à faire";
    if (j) {
      const items = seancesDe(j);
      if (!items.length) {
        $("jour-seance").innerHTML = `<span class="d-ico">😴</span> <span class="d-main">Repos</span>`;
        $("jour-detail").textContent = "Journée sans entraînement.";
        $("jour-garde").textContent = "";
      } else {
        const KEY = "carnet.check." + todayKey;
        const coches = (() => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } })();
        $("jour-seance").innerHTML = items.map(([moment, s], mi) => {
          const et = etapesDe(s);
          const texte = (s.detail || "") + " " + et.join(" ");
          return `<div class="j-seance"><div class="j-titre"><span class="d-ico">${esc(s.ico || "")}</span> <span class="d-main">${esc(s.titre)}</span>${moment ? `<span class="s-moment">${moment}</span>` : ""}</div>
           ${s.detail ? `<div class="p-detail">${esc(s.detail)}</div>` : ""}
           <ul class="check">${et.map((e, i) => {
             const id = mi + "-" + i;
             return `<li><label><input type="checkbox" data-k="${id}"${coches[id] ? " checked" : ""}> <span>${esc(e)}</span></label></li>`;
           }).join("")}</ul>
           ${s.gardefou ? `<div class="p-garde">${esc(s.gardefou)}</div>` : ""}
           ${blocMvts(texte)}</div>`;
        }).join("");
        $("jour-seance").querySelectorAll("input[type=checkbox]").forEach(cb => cb.addEventListener("change", () => {
          coches[cb.dataset.k] = cb.checked;
          try { localStorage.setItem(KEY, JSON.stringify(coches)); } catch {}
          cb.closest("li").classList.toggle("ok", cb.checked);
        }));
        $("jour-seance").querySelectorAll("input:checked").forEach(cb => cb.closest("li").classList.add("ok"));
        $("jour-detail").textContent = ""; $("jour-garde").textContent = "";
      }
    }
    const rep = C.nutrition && (C.nutrition.jours || []).find(x => (x.jour || "").toLowerCase().startsWith(JJ[today.getDay()].toLowerCase()));
    if (rep) {
      $("jour-repas-bloc").hidden = false;
      $("jour-repas-type").textContent = rep.type || "";
      $("jour-repas").innerHTML = [["Matin", rep.petitDej], ["Midi", rep.dejeuner], ["Séance", rep.collation], ["Soir", rep.diner]]
        .filter(([, v]) => v && v !== "—").map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("");
    }
  }

  // ── NST de la semaine (prioritaire) ──
  const nstAll = window.NST || {};
  const nst = C && C.semaineLabel ? nstAll[C.semaineLabel] : null;
  if (nst && (nst.jours || []).length) {
    $("nst-bloc").hidden = false;
    $("nst-src").textContent = nst.source || "NST";
    $("nst-jours").innerHTML = nst.jours.map(j => `<li${(JJ[today.getDay()] === j.jour) ? ' class="cur"' : ""}><span class="p-jour">${esc(j.jour)}</span><span class="p-ico">🅽</span><span><div class="p-titre">${esc(j.titre || "Séance NST")}</div><pre class="c-txt">${esc(j.contenu || "")}</pre></span></li>`).join("");
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
      + (derniereBox.contenuFr || derniereBox.contenu
          ? `<details class="ref-wod"><summary>Voir le tableau du WOD</summary><pre class="c-txt">${esc(derniereBox.contenuFr || derniereBox.contenu)}</pre>${derniereBox.contenuFr ? `<details class="sub-en"><summary>version anglaise</summary><pre class="c-txt">${esc(derniereBox.contenu)}</pre></details>` : ""}</details>` : "")
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

  // ── Banque de séances ──
  const W = window.WODS || [];
  let bqSrc = "tout", bqDuree = "tout", bqN = 20, bqQ = "";
  const bqFiltre = () => W.filter(w => {
    if (bqSrc === "hero" && w.source !== "Hero WOD") return false;
    if (bqSrc === "bench" && w.source !== "Benchmark") return false;
    if (bqSrc === "cf" && w.source !== "CrossFit.com") return false;
    if (bqDuree !== "tout" && w.duree > +bqDuree) return false;
    if (bqQ) {
      const t = ((w.nom || "") + " " + w.en.join(" ") + " " + w.fr.join(" ") + " " + w.mouvements.map(m => m.fr + " " + m.en).join(" ")).toLowerCase();
      if (!t.includes(bqQ)) return false;
    }
    return true;
  });
  const carteWod = w => {
    const titre = w.nom || (w.date ? fmtDate(w.date) : "Séance");
    const meta = [w.format, w.duree + " min env.", ...(w.materiel || [])].filter(Boolean).join(" · ");
    const sch = (w.mouvements || []).filter(m => m.schema).map(m => `<figure class="mv"><div class="mv-sch">${window.SCHEMA ? window.SCHEMA(m.schema) : ""}</div><figcaption>${esc(m.fr)}<br><small>${esc(m.en)}</small></figcaption></figure>`).join("");
    return `<li><details><summary><b>${esc(titre)}</b> <small>${esc(meta)}</small></summary><div class="hi-body">
      <div class="wod-fr">${w.fr.map(l => `<div>${esc(l)}</div>`).join("")}</div>
      <details class="sub-en"><summary>version anglaise (celle du tableau)</summary><pre class="c-txt">${esc(w.en.join("\n"))}</pre></details>
      ${w.stimulusFr ? `<p class="wod-stim">🎯 ${esc(w.stimulusFr)}</p>` : ""}
      ${(w.scaling && w.scaling.int.length) ? `<details class="sub-en"><summary>option intermédiaire</summary><pre class="c-txt">${esc(w.scaling.int.join("\n"))}</pre></details>` : ""}
      ${(w.scaling && w.scaling.deb.length) ? `<details class="sub-en"><summary>option débutant</summary><pre class="c-txt">${esc(w.scaling.deb.join("\n"))}</pre></details>` : ""}
      ${sch ? `<div class="mvts">${sch}</div>` : ""}
    </div></details></li>`;
  };
  const rendreBanque = () => {
    const list = bqFiltre();
    $("bq-count").textContent = `${list.length} séances`;
    $("bq-list").innerHTML = list.slice(0, bqN).map(carteWod).join("") || "<li class='plain'>Rien trouvé.</li>";
    $("bq-plus").hidden = list.length <= bqN;
  };
  if (W.length) {
    document.querySelectorAll("#bq-src button").forEach(b => b.addEventListener("click", () => { bqSrc = b.dataset.f; bqN = 20; document.querySelectorAll("#bq-src button").forEach(x => x.classList.toggle("on", x === b)); rendreBanque(); }));
    document.querySelectorAll("#bq-duree button").forEach(b => b.addEventListener("click", () => { bqDuree = b.dataset.d; bqN = 20; document.querySelectorAll("#bq-duree button").forEach(x => x.classList.toggle("on", x === b)); rendreBanque(); }));
    $("bq-q").addEventListener("input", e => { bqQ = e.target.value.trim().toLowerCase(); bqN = 20; rendreBanque(); });
    $("bq-plus").addEventListener("click", () => { bqN += 20; rendreBanque(); });
    rendreBanque();

    // ── Glossaire des mouvements ──
    const vus = new Map();
    W.forEach(w => (w.mouvements || []).forEach(m => { if (!vus.has(m.en)) vus.set(m.en, { ...m, n: 0 }); vus.get(m.en).n++; }));
    const mvts = [...vus.values()].sort((a, b) => b.n - a.n);
    const rendreMvts = (q = "") => {
      $("mv-list").innerHTML = mvts.filter(m => !q || (m.fr + " " + m.en).toLowerCase().includes(q)).map(m =>
        `<div class="mv-row"><div class="mv-sch">${m.schema && window.SCHEMA ? window.SCHEMA(m.schema) : "<span class='mv-none'>—</span>"}</div>
         <div><div class="mv-en">${esc(m.en)}</div><div class="mv-fr">${esc(m.fr)}</div><div class="mv-n">${m.n} séance${m.n > 1 ? "s" : ""}</div></div></div>`).join("");
    };
    $("mv-q").addEventListener("input", e => rendreMvts(e.target.value.trim().toLowerCase()));
    rendreMvts();
  }

  // ── Historique ──
  const groupe = s => estBox(s) ? "box" : /Run|TrailRun|VirtualRun/i.test(s.type) ? "course" : "autre";
  let filtre = "box";
  const rendreHisto = () => {
    const list = S.filter(s => filtre === "tout" || groupe(s) === filtre);
    $("hi-count").textContent = `${list.length} sur 6 mois`;
    $("hi-list").innerHTML = list.map(s => {
      const meta = [fmtH(s.sec), s.km ? s.km + " km" : null, s.hr ? s.hr + " bpm" : null, s.hrMax ? "max " + s.hrMax : null].filter(Boolean).join(" · ");
      const corps = `${s.note ? `<div class="c-note">✍️ ${esc(s.note)}</div>` : ""}${(s.contenuFr || s.contenu) ? `<pre class="c-txt">${esc(s.contenuFr || s.contenu)}</pre>` : ""}${s.contenuFr ? `<details class="sub-en"><summary>version anglaise</summary><pre class="c-txt">${esc(s.contenu)}</pre></details>` : ""}${s.photo ? `<a class="c-photo" href="${s.photo}" target="_blank" rel="noopener"><img src="${s.photo}" alt="" loading="lazy"></a>` : ""}`;
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
