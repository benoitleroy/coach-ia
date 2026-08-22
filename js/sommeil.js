// js/sommeil.js — bloc Sommeil / récupération (Garmin Connect) à partir de window.SOMMEIL
// (généré par scripts/garmin.py à chaque sync). Zéro dépendance.
(function () {
  const S = window.SOMMEIL;
  const $ = id => document.getElementById(id);
  if (!S || !S.jours || !S.jours.length) return;
  const jours = S.jours.filter(j => j.sommeil).sort((a, b) => a.date.localeCompare(b.date));
  if (!jours.length) return;
  const JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
  const MOIS  = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const fmtDur = m => `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
  const fmtDate = iso => { const d = new Date(iso + "T12:00:00"); return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`; };
  const avg = arr => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;

  $("bloc-sommeil").hidden = false;
  const last = jours[jours.length - 1];
  const s = last.sommeil;
  const ageJ = Math.round((Date.now() - new Date(last.date + "T12:00:00")) / 86400e3);
  $("som-quand").textContent = ageJ === 0 ? "cette nuit" : ageJ === 1 ? "nuit dernière" : `nuit du ${fmtDate(last.date)}`;
  $("som-duree").textContent = fmtDur(s.total_min);
  $("som-score").textContent = s.score != null ? `score ${s.score}` : "";
  const phases = [["profond", s.profond_min], ["leger", s.leger_min], ["paradoxal", s.paradoxal_min], ["eveil", s.eveil_min]];
  const tot = Math.max(1, phases.reduce((a, [, v]) => a + (v || 0), 0));
  $("som-phases").innerHTML = phases.map(([k, v]) => `<i class="${k}" style="width:${(100 * (v || 0) / tot).toFixed(1)}%" title="${k} ${fmtDur(v || 0)}"></i>`).join("");
  $("som-phases-txt").textContent = `profond ${fmtDur(s.profond_min)} · paradoxal ${fmtDur(s.paradoxal_min)} · éveil ${s.eveil_min} min`;

  const d7 = jours.slice(-7), d28 = jours.slice(-28);
  const tile = (id, val, sub) => { $(id).querySelector("b").textContent = val ?? "—"; $(id).querySelector(".tile-sub").textContent = sub || ""; };
  const hrv7 = avg(d7.map(j => j.hrv_nuit).filter(Boolean)), hrv28 = avg(d28.map(j => j.hrv_nuit).filter(Boolean));
  tile("som-hrv", last.hrv_nuit != null ? `${last.hrv_nuit} ms` : null, hrv28 ? `moy. 28 j ${Math.round(hrv28)} ms${last.hrv_statut ? " · " + String(last.hrv_statut).toLowerCase() : ""}` : "");
  const rhr28 = avg(d28.map(j => j.fc_repos).filter(Boolean));
  tile("som-fc", last.fc_repos != null ? `${last.fc_repos} bpm` : null, rhr28 ? `moy. 28 j ${Math.round(rhr28)}` : "");
  const bb = last.body_battery;
  tile("som-bb", bb && bb.reveil != null ? `${bb.reveil}` : (bb ? `${bb.max}` : null), bb ? (bb.reveil != null ? `au réveil · max ${bb.max}` : "max du jour") : "");
  const dur7 = avg(d7.map(j => j.sommeil.total_min)), dur28 = avg(d28.map(j => j.sommeil.total_min));
  tile("som-moy", dur7 ? fmtDur(Math.round(dur7)) : null, dur28 ? `moy. 7 nuits · 28 j : ${fmtDur(Math.round(dur28))}` : "");

  // 14 dernières nuits : barres de durée, couleur selon score
  const d14 = jours.slice(-14), maxMin = Math.max(480, ...d14.map(j => j.sommeil.total_min));
  $("som-nuits").innerHTML = d14.map(j => {
    const sc = j.sommeil.score, cls = sc == null ? "" : sc >= 80 ? "good" : sc >= 60 ? "fair" : "poor";
    const d = new Date(j.date + "T12:00:00");
    return `<li title="${fmtDate(j.date)} · ${fmtDur(j.sommeil.total_min)}${sc != null ? " · score " + sc : ""}"><i class="${cls}" style="height:${(100 * j.sommeil.total_min / maxMin).toFixed(0)}%"></i><span>${JOURS[d.getDay()][0]}</span></li>`;
  }).join("");
  const msg = [];
  if (dur7 && dur7 < 390) msg.push("Moins de 6 h 30 en moyenne sur 7 nuits : c'est le premier frein à la récupération et aux gains de force.");
  else if (dur7 && dur7 >= 420) msg.push("Bon volume de sommeil sur 7 nuits.");
  if (hrv7 && hrv28 && hrv7 < 0.9 * hrv28) msg.push("HRV 7 j sous ta base 28 j (−" + Math.round(100 * (1 - hrv7 / hrv28)) + " %) : fatigue ou début d'infection, lève le pied sur l'intensité.");
  if (rhr28 && last.fc_repos && last.fc_repos >= rhr28 + 5) msg.push("FC repos +" + Math.round(last.fc_repos - rhr28) + " bpm vs ta moyenne : signal de récupération incomplète.");
  $("som-explain").textContent = msg.join(" ") || "Données Garmin Connect (montre au poignet la nuit).";
})();
