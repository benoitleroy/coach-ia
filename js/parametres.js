// PARAMETRES.JS — formulaire de profil athlète + preview des zones

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("profileForm");
  if (!form) return;

  const profile = window.getAthleteProfile();
  populateForm(form, profile);
  renderPreview(profile);

  form.addEventListener("input", () => renderPreview(readForm(form)));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const p = readForm(form);
    const ok = window.saveAthleteProfile(p);
    const confirm = document.getElementById("saveConfirm");
    if (ok && confirm) {
      confirm.style.display = "block";
      setTimeout(() => { confirm.style.display = "none"; }, 2500);
    }
    renderPreview(p);
  });

  document.getElementById("btnReset").addEventListener("click", () => {
    if (!confirm("Effacer tous les paramètres ?")) return;
    window.resetAthleteProfile();
    const p = window.getAthleteProfile();
    populateForm(form, p);
    renderPreview(p);
  });
});

function readForm(form) {
  const fd = new FormData(form);
  const p = { bestTimes: {} };
  for (const [key, raw] of fd.entries()) {
    const value = typeof raw === "string" ? raw.trim() : raw;
    if (key.startsWith("bestTimes.")) {
      p.bestTimes[key.slice("bestTimes.".length)] = value;
    } else if (["poids", "taille", "fcMax", "fcRepos", "ftp", "vma", "swolf100", "experienceAnnees"].includes(key)) {
      p[key] = value === "" ? null : parseFloat(value);
    } else {
      p[key] = value;
    }
  }
  return p;
}

function populateForm(form, p) {
  const set = (name, val) => {
    const el = form.querySelector(`[name="${name}"]`);
    if (el) el.value = val == null ? "" : val;
  };
  set("nom", p.nom);
  set("dateNaissance", p.dateNaissance);
  set("poids", p.poids);
  set("taille", p.taille);
  set("fcMax", p.fcMax);
  set("fcRepos", p.fcRepos);
  set("ftp", p.ftp);
  set("vma", p.vma);
  set("swolf100", p.swolf100);
  set("experienceAnnees", p.experienceAnnees);
  Object.entries(p.bestTimes || {}).forEach(([k, v]) => set(`bestTimes.${k}`, v));
}

function renderPreview(p) {
  // FC max hint
  const hint = document.getElementById("fcMaxHint");
  if (hint) {
    const derived = window.derivedFcMax(p);
    if (!p.fcMax && derived) {
      hint.textContent = `Estimée à ${derived} bpm (208 − 0.7 × âge)`;
      hint.style.color = "#A9A3FF";
    } else {
      hint.textContent = "Si laissé vide : 208 − 0.7 × âge";
      hint.style.color = "#555870";
    }
  }

  const hrZones = window.computeHrZones(p);
  const hr = document.getElementById("previewHr");
  hr.innerHTML = hrZones
    ? hrZones.map(z => zoneRow(z.name, `${z.min} → ${z.max} bpm`, z.desc || "", z.color)).join("")
    : '<span style="font-size:0.8rem;color:#555870;">Renseigne FC max ou date de naissance.</span>';

  const powerZones = window.computePowerZones(p);
  const pw = document.getElementById("previewPower");
  pw.innerHTML = powerZones
    ? powerZones.map(z => zoneRow(z.name, `${z.min} → ${z.max == null ? "∞" : z.max} W`, "", z.color)).join("")
    : '<span style="font-size:0.8rem;color:#555870;">Renseigne ta FTP.</span>';

  const paceZones = window.computePaceZones(p);
  const pc = document.getElementById("previewPace");
  pc.innerHTML = paceZones
    ? paceZones.map(z => zoneRow(z.name, z.pace, z.pct, z.color)).join("")
    : '<span style="font-size:0.8rem;color:#555870;">Renseigne ta VMA.</span>';
}

function zoneRow(name, main, sub, color) {
  return `
    <div class="zone-row" style="border-left:3px solid ${color};">
      <div style="flex:1;">
        <div style="color:${color};font-weight:700;font-size:0.82rem;">${name}</div>
        ${sub ? `<div style="font-size:0.68rem;color:#555870;margin-top:2px;">${sub}</div>` : ""}
      </div>
      <div style="font-size:0.82rem;color:#F0F0F5;font-weight:600;white-space:nowrap;">${main}</div>
    </div>
  `;
}
