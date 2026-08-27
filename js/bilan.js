// js/bilan.js — rendu des blocs Bilan coach / Semaine prochaine / 12 mois
// à partir de window.BILAN (généré par scripts/bilan.js à chaque sync).
(function () {
  const B = window.BILAN;
  const $ = id => document.getElementById(id);
  if (!B) return;
  const esc = t => String(t ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
  const MOIS  = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const fmtD = iso => { const d = new Date(iso); return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`; };
  const fmtH = h => String(h).replace(".", ",") + " h";

  // ── Programme (macro-cycle) ──
  const pg = c && c.programme;
  if (pg && pg.bloc) {
    $("bloc-programme").hidden = false;
    $("pg-nom").textContent = pg.programme;
    $("pg-semaine").textContent = pg.avantDebut ? `démarre le ${pg.debut}` : `semaine ${pg.semaineDansCycle}/${pg.totalSemaines}`;
    $("pg-bloc").textContent = `Bloc ${pg.bloc.id} · ${pg.bloc.nom}${pg.decharge ? " · décharge" : ""}`;
    $("pg-but").textContent = pg.bloc.but;
    $("pg-cible").textContent = pg.cible ? "🎯 " + pg.cible.libelle : "";
    $("pg-prios").innerHTML = (pg.bloc.priorites || []).map(x => `<li>${esc(x)}</li>`).join("");
    $("pg-bar").innerHTML = Array.from({ length: pg.totalSemaines }, (_, i) => {
      const n = i + 1, done = n < pg.semaineDansCycle, cur = n === pg.semaineDansCycle;
      const blocId = n <= 4 ? 1 : n <= 8 ? 2 : 3;
      return `<i class="b${blocId}${done ? " done" : ""}${cur ? " cur" : ""}" title="semaine ${n}"></i>`;
    }).join("");
  }

  // ── Bilan coach ──
  const c = B.coach;
  if (c && c.verdict) {
    $("bloc-coach").hidden = false;
    $("coach-date").textContent = c.generatedAt ? "généré " + fmtD(c.generatedAt) : "";
    $("coach-verdict").textContent = c.verdict;
    $("coach-forts").innerHTML = (c.forts || []).map(f => `<li>${esc(f)}</li>`).join("") || "<li>—</li>";
    $("coach-manques").innerHTML = (c.manques || []).map(f => `<li>${esc(f)}</li>`).join("") || "<li>—</li>";
    if (c.vigilance) { $("coach-vigilance").hidden = false; $("coach-vigilance").textContent = "⚠ " + c.vigilance; }

    const s = c.semaine;
    if (s && Array.isArray(s.jours) && s.jours.length) {
      $("bloc-semaine").hidden = false;
      $("sem-titre").textContent = "Semaine prochaine" + (c.semaineLabel ? " · " + c.semaineLabel.split("-")[1] : "");
      $("sem-volume").textContent = s.volumeCible || "";
      $("sem-objectif").textContent = s.titre || "";
      const vide = x => !x || !x.titre || /^(rien|repos|—|-)$/i.test(String(x.titre).trim());
      $("plan").innerHTML = s.jours.map(j => {
        const items = (j.matin || j.soir)
          ? [["Matin", j.matin], ["Soir", j.soir]].filter(([, x]) => !vide(x))
          : (j.seance ? [["", { ico: j.ico, titre: j.seance, detail: j.detail, gardefou: j.gardefou }]] : []);
        if (!items.length) return `<li class="repos"><span class="p-jour">${esc(j.jour)}</span><span class="p-ico">😴</span><span class="p-titre">Repos</span></li>`;
        return items.map(([moment, x], k) => `<li><span class="p-jour">${k === 0 ? esc(j.jour) : ""}</span><span class="p-ico">${esc(x.ico || "")}</span><span><div class="p-titre">${moment ? `<em class="s-moment">${moment}</em> ` : ""}${esc(x.titre)}</div>${x.detail ? `<div class="p-detail">${esc(x.detail)}</div>` : ""}${x.gardefou ? `<div class="p-garde">${esc(x.gardefou)}</div>` : ""}</span></li>`).join("");
      }).join("");
      $("sem-regle").textContent = c.regle || "";
      $("sem-regle").hidden = !c.regle;
    }
  }

  // ── Repas de la semaine + courses ──
  const n = c && c.nutrition;
  if (n && Array.isArray(n.jours) && n.jours.length) {
    $("bloc-repas").hidden = false;
    $("repas-principe").textContent = n.principe || "";
    $("repas").innerHTML = n.jours.map(j => `<li><div class="rp-head"><span class="p-jour">${esc(j.jour)}</span><span class="rp-type">${esc(j.type || "")}</span></div><dl class="rp-meals">${[["Matin", j.petitDej], ["Midi", j.dejeuner], ["Séance", j.collation], ["Soir", j.diner]].filter(([, v]) => v && v !== "—").map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl></li>`).join("");
    const batch = (n.batch || []).map(b => `<li>${esc(b)}</li>`).join("");
    $("batch").innerHTML = batch; $("batch-wrap").hidden = !batch;
    const recettes = (n.recettes || []).map(r => `<details class="recette"><summary>${esc(r.nom)} <small>${esc([r.usage, r.portions, r.temps].filter(Boolean).join(" · "))}</small></summary><div class="rc-body"><div class="coach-sub">Ingrédients</div><ul class="coach-list">${(r.ingredients || []).map(i => `<li>${esc(i)}</li>`).join("")}</ul><div class="coach-sub">Étapes</div><ol class="rc-steps">${(r.etapes || []).map(e => `<li>${esc(e)}</li>`).join("")}</ol>${r.conservation ? `<div class="rc-keep">🧊 ${esc(r.conservation)}</div>` : ""}</div></details>`).join("");
    $("recettes").innerHTML = recettes; $("recettes-wrap").hidden = !recettes;
    const courses = (n.courses || []).filter(r => r.items && r.items.length).map(r => `<div class="course-rayon"><div class="coach-sub">${esc(r.rayon)}</div><ul class="course-list">${r.items.map(i => `<li><label><input type="checkbox"> ${esc(i)}</label></li>`).join("")}</ul></div>`).join("");
    $("courses").innerHTML = courses; $("courses-wrap").hidden = !courses;
  }

  // ── 12 mois ──
  if (B.mois && B.mois.length) {
    $("bloc-annee").hidden = false;
    $("annee-total").textContent = `${fmtH(B.total.h)} · ${B.total.n} séances · ${B.total.jours} jours actifs`;
    const maxH = Math.max(1, ...B.mois.map(m => m.h));
    const cell = (v, unit = "") => v ? `<td>${String(v).replace(".", ",")}${unit}</td>` : `<td class="zero">—</td>`;
    $("mois").innerHTML = `<thead><tr><th>Mois</th><th>Heures</th><th>Séances</th><th>Jours</th><th>🏊 km</th><th>🚴 km</th><th>🏃 km</th><th>💪 h</th></tr></thead><tbody>` +
      B.mois.map((m, i) => `<tr class="${i === B.mois.length - 1 ? "cur" : ""}"><td>${esc(m.label)}</td><td><span class="bar" style="width:${Math.round(40 * m.h / maxH)}px"></span>${String(m.h).replace(".", ",")}</td>${cell(m.n)}${cell(m.jours)}${cell(m.disc.nat.km)}${cell(m.disc.velo.km)}${cell(m.disc.run.km)}${cell(m.disc.autre.h)}</td></tr>`).join("") + "</tbody>";

    const e = B.efficacite || {};
    const box = (title, rows, note) => rows.length ? `<div class="eff-box"><div class="eff-title">${title}</div>${rows.join("")}<div class="eff-note">${note}</div></div>` : "";
    $("eff").innerHTML =
      box("🏃 Allure à 140 bpm", (e.courseTrim || []).map(q => `<div class="eff-row"><span>${esc(q.trimestre)} <small>(${q.n})</small></span><span>${esc(q.paceA140)}/km</span></div>`), "sorties ≥ 8 km, allure ramenée à 140 bpm — plus c'est bas, plus tu es efficace") +
      box("🚴 Watts à 140 bpm", (e.veloTrim || []).map(q => `<div class="eff-row"><span>${esc(q.trimestre)} <small>(${q.n})</small></span><span>${q.wA140} W</span></div>`), "sorties ≥ 1 h avec capteur — plus c'est haut, mieux c'est");
  }
})();
