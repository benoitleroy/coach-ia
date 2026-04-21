// JOURNAL.JS — logique du formulaire journal

document.addEventListener("DOMContentLoaded", () => {
  majDate();
  bindTexteLibre();
  // Prefill depuis wearable + HISTORY (si dispo), sinon valeurs par défaut
  const prefill = _buildPrefill();
  _applyPrefill(prefill);
  _customizeCoachPrompt();
  _renderContextualQuestions();
  _renderLogbook();
  _bindLogbookSearch();
  _updateMentalScore();
});

// ─── PREFILL DEPUIS DONNÉES RÉELLES ──────────────────────────────────
function _buildPrefill() {
  const defaults = { energie: 6, sommeil: 7, stresspro: 5, stressperslo: 5, motiv: 6 };
  if (!window.HISTORY || !window.HISTORY.daily) return defaults;
  const lastDay = window.HISTORY.daily[window.HISTORY.daily.length - 1];
  if (!lastDay) return defaults;

  // Sommeil : si donnée Whoop → valeur, sinon défaut
  if (lastDay.sleep && lastDay.sleep.hours != null) {
    defaults.sommeil = Math.round(lastDay.sleep.hours * 2) / 2; // arrondi 0.5h
  }
  // Énergie : inférée de recovery (Whoop) si dispo
  if (lastDay.recovery != null) {
    if (lastDay.recovery >= 75) defaults.energie = 8;
    else if (lastDay.recovery >= 60) defaults.energie = 7;
    else if (lastDay.recovery >= 40) defaults.energie = 5;
    else defaults.energie = 3;
  }
  return defaults;
}

function _applyPrefill(p) {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  set("energieSlider", p.energie);
  set("sommeilSlider", p.sommeil);
  set("stressProSlider", p.stresspro);
  set("stressPersoSlider", p.stressperslo);
  set("motivSlider", p.motiv);
  majSlider("energie", p.energie);
  majSlider("sommeil", p.sommeil);
  majSlider("stresspro", p.stresspro);
  majSlider("stressperslo", p.stressperslo);
  majSlider("motiv", p.motiv);
}

// ─── PROMPT COACH CONTEXTUEL ─────────────────────────────────────────
function _customizeCoachPrompt() {
  if (!window.HISTORY || !window.inferTrainingState) return;
  const state = window.inferTrainingState();
  const lastDay = window.HISTORY.daily[window.HISTORY.daily.length - 1];
  const body = document.getElementById("coachPromptBody");
  const icone = document.getElementById("coachPromptIcone");
  const title = document.getElementById("coachPromptTitle");
  if (!body) return;

  const hrvToday = lastDay?.hrv;
  const recoveryToday = lastDay?.recovery;

  let text = "";
  if (state.mode === "recovery" && state.signature === "Choc immunitaire") {
    icone.textContent = "🤒";
    title.textContent = "On est en sortie d'épisode immunitaire";
    text = `J+${state.illnessDaysSince ?? "?"} depuis la dernière trace de maladie. Ce journal a une valeur spéciale aujourd'hui : dis-moi honnêtement si tu as encore des symptômes résiduels (fatigue, toux, congestion). HRV ce matin : ${hrvToday ?? "—"}ms.`;
  } else if (state.mode === "recovery" && lastDay?.journal?.injury) {
    icone.textContent = "🩹";
    title.textContent = "Blessure signalée";
    text = `Précise la zone exacte et l'évolution par rapport à hier. Si ça va plutôt mieux → tu peux repartir doucement. Si ça stagne ou empire → on consulte.`;
  } else if (state.mode === "deload" && state.acwr > 1.3) {
    icone.textContent = "⚠️";
    title.textContent = "Charge élevée — j'ai besoin de ton ressenti";
    text = `ACWR ${state.acwr} (zone risque). Tes données disent : charge trop rapide. Ton corps et ta tête disent quoi ? Note précisément ton niveau de fatigue et ta motivation du jour.`;
  } else if (recoveryToday != null && recoveryToday < 40) {
    icone.textContent = "🔋";
    title.textContent = "Récupération basse ce matin";
    text = `Recovery à ${recoveryToday}%. Ce n'est pas un drame — mais aide-moi à comprendre : sommeil court, stress, nutrition, gueule de bois ? Ce que tu écris là me permet d'affiner tes prochaines recommandations.`;
  } else if (hrvToday != null) {
    icone.textContent = "🤖";
    title.textContent = "Ce que je veux savoir aujourd'hui";
    text = `HRV à ${hrvToday}ms ce matin. Les chiffres donnent une photo, ton ressenti donne le contexte. Prends 3 minutes — c'est toi qui connais ta vérité.`;
  } else {
    icone.textContent = "🤖";
    title.textContent = "Ce que je veux savoir aujourd'hui";
    text = `Prends 3 minutes pour remplir ce journal — les chiffres racontent une partie, toi tu racontes l'autre.`;
  }
  body.textContent = text;
}

// ─── QUESTIONS CONTEXTUELLES ADDITIONNELLES ──────────────────────────
function _renderContextualQuestions() {
  const container = document.getElementById("contextQuestions");
  if (!container || !window.HISTORY || !window.inferTrainingState) return;

  const state = window.inferTrainingState();
  const lastDay = window.HISTORY.daily[window.HISTORY.daily.length - 1];
  const questions = [];

  if (state.signature === "Choc immunitaire") {
    questions.push({ icone: "🤧", q: "Symptômes résiduels ? (toux, nez, fatigue inhabituelle)" });
    questions.push({ icone: "🫁", q: "Respiration à l'effort — normale ou essoufflé plus vite qu'avant ?" });
  }
  if (state.acwr && state.acwr > 1.3) {
    questions.push({ icone: "🦵", q: "Jambes lourdes, courbatures persistantes ?" });
    questions.push({ icone: "😴", q: "Sommeil perturbé ces 3 dernières nuits ?" });
  }
  if (lastDay?.composite_flag?.count >= 2) {
    questions.push({ icone: "🌡️", q: "Sensation de froid/chaleur inhabituelle ce matin ?" });
  }
  if (lastDay?.recovery != null && lastDay.recovery < 40) {
    questions.push({ icone: "🍷", q: "Alcool / repas lourd hier soir ?" });
    questions.push({ icone: "💻", q: "Stress pro inhabituel la veille ?" });
  }

  if (!questions.length) { container.style.display = "none"; return; }

  container.style.display = "block";
  container.innerHTML = `
    <div class="card" style="background:rgba(108,99,255,0.05);border:1px dashed rgba(108,99,255,0.3);">
      <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:10px;">
        <span style="font-size:1.2rem;">💡</span>
        <div>
          <div style="font-weight:700;font-size:0.85rem;color:#F0F0F5;margin-bottom:2px;">Ce que je regarderais particulièrement aujourd'hui</div>
          <p style="font-size:0.78rem;color:#8B8FA8;line-height:1.4;">Pense à en parler dans la zone texte libre en bas du journal.</p>
        </div>
      </div>
      <ul style="display:flex;flex-direction:column;gap:6px;margin-top:8px;">
        ${questions.map(q => `
          <li style="display:flex;gap:8px;align-items:center;font-size:0.83rem;color:#D0D0E0;">
            <span>${q.icone}</span><span>${q.q}</span>
          </li>`).join("")}
      </ul>
    </div>
  `;
}

function majDate() {
  const jours  = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
  const mois   = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  const d = new Date();
  const el = document.getElementById("journalDate");
  if (el) el.textContent = `${jours[d.getDay()]} ${d.getDate()} ${mois[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── SLIDERS ───
const SLIDER_CONFIG = {
  energie: {
    el: "energieLabel",
    format: v => {
      const n = parseInt(v);
      if (n <= 2) return "😩 Vidé";
      if (n <= 4) return "😞 Fatigué";
      if (n <= 6) return "😐 Correct";
      if (n <= 8) return "💪 En forme";
      return "⚡ Au max";
    },
    couleur: v => parseInt(v) <= 4 ? "#FF6B6B" : parseInt(v) <= 6 ? "#6C63FF" : "#00D4AA",
  },
  sommeil: {
    el: "sommeilLabel",
    format: v => `${parseFloat(v)}h`,
    couleur: v => parseFloat(v) < 6 ? "#FF6B6B" : parseFloat(v) < 7 ? "#FFD166" : "#00D4AA",
  },
  stresspro: {
    el: "stressProLabel",
    format: v => {
      const n = parseInt(v);
      if (n <= 3) return `${n} — Tranquille`;
      if (n <= 6) return `${n} — Modéré`;
      if (n <= 8) return `${n} — Élevé`;
      return `${n} — Surchargé`;
    },
    couleur: v => parseInt(v) >= 8 ? "#FF6B6B" : parseInt(v) >= 6 ? "#FFD166" : "#00D4AA",
  },
  stressperslo: {
    el: "stressPersoLabel",
    format: v => {
      const n = parseInt(v);
      if (n <= 3) return `${n} — Tendu`;
      if (n <= 6) return `${n} — Équilibré`;
      if (n <= 8) return `${n} — Bien`;
      return `${n} — Épanoui`;
    },
    couleur: v => parseInt(v) <= 3 ? "#FF6B6B" : parseInt(v) <= 5 ? "#FFD166" : "#00D4AA",
  },
  motiv: {
    el: "motivLabel",
    format: v => {
      const n = parseInt(v);
      if (n <= 2) return "😩 Zéro";
      if (n <= 4) return "😕 Peu envie";
      if (n <= 6) return "😐 Bof";
      if (n <= 8) return "😊 Motivé";
      return "🔥 En feu";
    },
    couleur: v => parseInt(v) <= 4 ? "#FF6B6B" : parseInt(v) <= 6 ? "#6C63FF" : "#00D4AA",
  },
};

function majSlider(type, valeur) {
  const cfg = SLIDER_CONFIG[type];
  if (!cfg) return;
  const el = document.getElementById(cfg.el);
  if (!el) return;
  el.textContent = cfg.format(valeur);
  el.style.color = cfg.couleur(valeur);
}

// ─── DOULEURS ───
function selectDouleur(btn) {
  document.querySelectorAll(".douleur-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  const zoneEl = document.getElementById("zoneDouloureuse");
  zoneEl.style.display = btn.dataset.val !== "aucune" ? "block" : "none";
}

function toggleZone(btn) {
  btn.classList.toggle("active");
}

// ─── QUALITÉ SOMMEIL ───
function selectQualite(btn) {
  document.querySelectorAll(".qualite-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

// ─── HUMEUR ───
function selectHumeur(btn) {
  document.querySelectorAll(".humeur-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

// ─── ÉVÉNEMENT ───
function selectEvent(btn) {
  document.querySelectorAll(".event-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

// ─── GUT TRAINING ───
function selectGut(btn) {
  document.querySelectorAll(".gut-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  const details = document.getElementById("gutDetails");
  details.style.display = btn.dataset.val === "oui" ? "block" : "none";
  if (btn.dataset.val === "oui") majGutRate();
}

function majGutRate() {
  const carbs = parseFloat(document.getElementById("gutCarbs")?.value);
  const dur = parseFloat(document.getElementById("gutDuration")?.value);
  const label = document.getElementById("gutRateLabel");
  const hint = document.getElementById("gutRateHint");
  if (!label || !hint) return;

  if (!Number.isFinite(carbs) || !Number.isFinite(dur) || dur <= 0) {
    label.textContent = "— g/h";
    label.style.color = "#6C63FF";
    hint.textContent = "";
    return;
  }

  const rate = Math.round((carbs / dur) * 60);
  label.textContent = `${rate} g/h`;

  if (rate < 40) {
    label.style.color = "#FF6B6B";
    hint.textContent = "Zone basse — ton intestin n'est pas encore sollicité. On va monter progressivement.";
  } else if (rate < 70) {
    // fallthrough to progressing zone
    label.style.color = "#FFD166";
    hint.textContent = "En progression — continue à monter de 5-10 g/h toutes les 2-3 sorties longues.";
  } else if (rate <= 90) {
    label.style.color = "#00D4AA";
    hint.textContent = "Zone cible Ironman ! Tiens ce niveau sur tes dernières sorties longues avant Thun.";
  } else {
    label.style.color = "#FFD166";
    hint.textContent = "Au-delà de 90 g/h — surveille les signaux digestifs, ce n'est utile que si c'est toléré.";
  }
  return;
}

// ─── HEAT ACCLIMATION ───
function selectHeat(btn) {
  document.querySelectorAll(".heat-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  const details = document.getElementById("heatDetails");
  details.style.display = btn.dataset.val === "oui" ? "block" : "none";
}

function selectHeatType(btn) {
  document.querySelectorAll(".heat-type-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

// ─── COMPTEUR TEXTE LIBRE ───
function bindTexteLibre() {
  const ta = document.getElementById("texteLibre");
  const cpt = document.getElementById("charCount");
  if (!ta || !cpt) return;
  ta.addEventListener("input", () => {
    const n = Math.min(ta.value.length, 500);
    if (ta.value.length > 500) ta.value = ta.value.slice(0, 500);
    cpt.textContent = `${n} / 500`;
    cpt.style.color = n > 450 ? "#FFD166" : "#555870";
  });
}

// ─── LECTURE IA ───
function genererLectureIA() {
  const energie = parseInt(document.getElementById("energieSlider").value);
  const sommeil = parseFloat(document.getElementById("sommeilSlider").value);
  const stresspro = parseInt(document.getElementById("stressProSlider").value);
  const motiv = parseInt(document.getElementById("motivSlider").value);
  const texte = document.getElementById("texteLibre").value.trim();
  const douleur = document.querySelector(".douleur-btn.active")?.dataset.val || "aucune";
  const humeur = parseInt(document.querySelector(".humeur-btn.active")?.dataset.val || "3");

  // Signaux combinés
  const signalFatigue = (energie <= 4) || (sommeil < 6) || (humeur <= 2);
  const signalSurcharge = stresspro >= 8;
  const signalPositif = energie >= 8 && motiv >= 8 && humeur >= 4;
  const signalDouleur = douleur !== "aucune";

  let lecture = "";

  if (signalPositif) {
    lecture = `Ce journal est un beau signal. Énergie haute, motivation présente, humeur positive — ton corps et ta tête sont alignés. C'est exactement le type de journée où une séance peut être un vrai plaisir plutôt qu'une obligation. Profites-en pleinement.`;
  } else if (signalFatigue && signalSurcharge) {
    lecture = `Fatigue physique et charge de vie élevée en même temps — c'est une combinaison à prendre au sérieux. Dans ces moments-là, l'entraînement peut faire plus de mal que de bien si tu forces. On va adapter le programme de la journée. Ta priorité numéro un aujourd'hui, c'est toi.`;
  } else if (signalFatigue) {
    lecture = `Tu rapportes une fatigue réelle. Avant de te demander "est-ce que je dois quand même m'entraîner ?", pose-toi une autre question : est-ce que cette fatigue est normale (adaptation) ou est-ce un signal d'alarme ? Ton journal me donne des indices — on va regarder ça ensemble dans ton dashboard.`;
  } else if (signalSurcharge) {
    lecture = `Le stress professionnel est élevé en ce moment. Rappelle-toi : le stress de la vie compte dans ta charge totale exactement comme une séance difficile. Ton plan d'entraînement va tenir compte de ça — pas d'intensité aujourd'hui.`;
  } else if (signalDouleur) {
    lecture = `Tu mentionnes une douleur. C'est la donnée la plus importante de ce journal — plus que tous les chiffres. Une douleur ignorée aujourd'hui, c'est souvent 3 semaines d'arrêt dans un mois. On en parle dans le chat ?`;
  } else if (texte.length > 50) {
    lecture = `Merci d'avoir pris le temps d'écrire. Ce que tu partages compte. Les chiffres disent une chose, les mots disent l'essentiel. Je vais intégrer ça dans ta vue d'ensemble — la cohérence entre tes ressentis et tes données biologiques est souvent là où se cachent les vraies réponses.`;
  } else {
    lecture = `Journal enregistré. Rien d'inhabituel dans tes indicateurs aujourd'hui — tu es dans ta zone normale. Continue comme ça. La régularité dans le journal, c'est ce qui rend les alertes futures vraiment utiles.`;
  }

  return lecture;
}

function genererMessageConfirm() {
  const energie = parseInt(document.getElementById("energieSlider").value);
  const motiv = parseInt(document.getElementById("motivSlider").value);

  if (energie >= 7 && motiv >= 7) return "Bel état intérieur aujourd'hui. Ces données vont affiner ton profil.";
  if (energie <= 4) return "Fatigue détectée. Le coach IA a ajusté ta recommandation du jour.";
  return "Tes ressentis ont bien été enregistrés et intégrés à ton profil.";
}

// ─── ENREGISTREMENT ───
function enregistrerJournal() {
  const form = document.getElementById("formJournal");
  const confirm = document.getElementById("confirmationJournal");

  // Feed every input into the scoring engine
  _pushObservations();

  document.getElementById("confirmMsg").textContent = genererMessageConfirm();
  document.getElementById("iaLecture").textContent = genererLectureIA();

  form.style.display = "none";
  confirm.style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ─── PUSH TO SCORING ENGINE ───
function _pushObservations() {
  if (typeof window.addObservation !== "function") return;

  const athlete = "benoit";
  const now = Date.now();

  // Energy level
  const energie = parseInt(document.getElementById("energieSlider").value);
  window.addObservation("energy_level", energie, athlete, now);

  // Sleep hours
  const sommeil = parseFloat(document.getElementById("sommeilSlider").value);
  window.addObservation("sleep_hours", sommeil, athlete, now);

  // Pro stress
  const stresspro = parseInt(document.getElementById("stressProSlider").value);
  window.addObservation("stress_pro", stresspro, athlete, now);

  // Personal balance
  const stressperso = parseInt(document.getElementById("stressPersoSlider").value);
  window.addObservation("stress_perso", stressperso, athlete, now);

  // Training motivation
  const motiv = parseInt(document.getElementById("motivSlider").value);
  window.addObservation("training_motivation", motiv, athlete, now);

  // Pain level
  const douleur = document.querySelector(".douleur-btn.active")?.dataset.val || "aucune";
  window.addObservation("pain_level", douleur, athlete, now);

  // Mood
  const humeur = parseInt(document.querySelector(".humeur-btn.active")?.dataset.val || "3");
  window.addObservation("mood", humeur, athlete, now);

  // Life event
  const event = document.querySelector(".event-btn.active")?.dataset.val || "rien";
  window.addObservation("life_event", event, athlete, now);

  // Nutrition daily (Lot 30)
  const protein = parseInt(document.getElementById("proteinSlider")?.value);
  if (Number.isFinite(protein)) window.addObservation("nutrition_protein_daily", protein, athlete, now);
  const hydration = parseInt(document.getElementById("hydrationSlider")?.value);
  if (Number.isFinite(hydration)) window.addObservation("nutrition_hydration_daily", hydration, athlete, now);

  // Body/ressentis (Lot 31)
  const stiffness = parseInt(document.getElementById("stiffnessSlider")?.value);
  if (Number.isFinite(stiffness)) window.addObservation("body_stiffness_daily", stiffness, athlete, now);
  const recoveryP = parseInt(document.getElementById("recoverySlider")?.value);
  if (Number.isFinite(recoveryP)) window.addObservation("recovery_perceived_daily", recoveryP, athlete, now);

  // Mental freshness composite (Lot 46)
  const mentalScore = _computeMentalScore();
  if (Number.isFinite(mentalScore)) window.addObservation("mental_freshness_daily", mentalScore, athlete, now);

  // Free text sentiment
  const texte = document.getElementById("texteLibre").value.trim();
  if (texte.length > 10) {
    window.addObservation("free_text_sentiment", texte, athlete, now);
    _logbookAppend(texte, now);
  }

  // Gut training — only if user logged a long session
  const gutActive = document.querySelector(".gut-btn.active")?.dataset.val;
  if (gutActive === "oui") {
    const carbs = parseFloat(document.getElementById("gutCarbs")?.value);
    const dur = parseFloat(document.getElementById("gutDuration")?.value);
    if (Number.isFinite(carbs) && Number.isFinite(dur) && dur >= 90) {
      const rate = (carbs / dur) * 60;
      window.addObservation("gut_carbs_per_hour", rate, athlete, now);
    }
  }

  // Heat acclimation — event-based
  const heatActive = document.querySelector(".heat-btn.active")?.dataset.val;
  if (heatActive === "oui") {
    window.addObservation("heat_exposure", 1, athlete, now);
  }
  // Always refresh the derived count so the scoring engine sees current state
  if (typeof window.computeHeatAcclimationStats === "function") {
    const stats = window.computeHeatAcclimationStats(athlete, 14);
    if (stats) {
      window.addObservation("heat_acclimation_count", stats.count, athlete, now);
    }
  }
}

function nouveauJournal() {
  document.getElementById("formJournal").style.display = "block";
  document.getElementById("confirmationJournal").style.display = "none";
}

// ─── LOT 46 : FRAÎCHEUR MENTALE ─────────────────────
function _computeMentalScore() {
  const hate = parseInt(document.getElementById("hateSlider")?.value);
  const clarity = parseInt(document.getElementById("claritySlider")?.value);
  const pleasure = parseInt(document.getElementById("pleasureSlider")?.value);
  const focus = parseInt(document.getElementById("focusSlider")?.value);
  if (![hate, clarity, pleasure, focus].every(Number.isFinite)) return null;
  // 4 sliders 1-5 → moyenne → 0-100 (normalisation linéaire)
  const avg = (hate + clarity + pleasure + focus) / 4;
  return Math.round(((avg - 1) / 4) * 100);
}

function _updateMentalScore() {
  const score = _computeMentalScore();
  const scoreEl = document.getElementById("mentalScore");
  const fbEl = document.getElementById("mentalFeedback");
  if (scoreEl) scoreEl.textContent = Number.isFinite(score) ? `${score}/100` : "—/100";
  if (fbEl) {
    if (!Number.isFinite(score)) { fbEl.textContent = ""; return; }
    let msg, color;
    if (score >= 75) { msg = "Très bonne fraîcheur — cerveau prêt à encaisser du volume."; color = "var(--accent-teal)"; }
    else if (score >= 55) { msg = "Fraîcheur correcte — capable de suivre une séance technique."; color = "var(--text-secondary)"; }
    else if (score >= 35) { msg = "Fraîcheur limitée — privilégie une séance facile ou du récup actif."; color = "var(--accent-amber, #F5B945)"; }
    else { msg = "Fraîcheur mentale basse — repos cognitif conseillé avant de relancer."; color = "var(--accent-coral)"; }
    fbEl.textContent = msg;
    fbEl.style.color = color;
  }
}

window._computeMentalScore = _computeMentalScore;
window._updateMentalScore = _updateMentalScore;

// ─── LOT 40 : LOGBOOK TEXTE LIBRE ─────────────────────
const LOGBOOK_KEY = "coach-ia:logbook";

function _logbookLoad() {
  try { return JSON.parse(localStorage.getItem(LOGBOOK_KEY) || "[]"); } catch { return []; }
}
function _logbookSave(arr) {
  localStorage.setItem(LOGBOOK_KEY, JSON.stringify(arr));
}
function _logbookTags(text) {
  const t = text.toLowerCase();
  const tags = [];
  if (/fatigue|épuis|vidé|creu|lourd/.test(t))         tags.push("fatigue");
  if (/motiv|envie|hâte|hate|impatient/.test(t))       tags.push("motivation");
  if (/stress|anxi|presse|boul/.test(t))               tags.push("stress");
  if (/douleur|mal\b|blessur|gêne|gene/.test(t))       tags.push("douleur");
  if (/sommeil|dormi|nuit|insomn/.test(t))             tags.push("sommeil");
  if (/progrès|progres|avanc|mieux|fier/.test(t))      tags.push("progrès");
  if (/doute|sais pas|incertain|peur/.test(t))         tags.push("doute");
  if (/malade|grippe|virus|fièvre|fievre/.test(t))     tags.push("maladie");
  return tags;
}

function _logbookAppend(texte, ts) {
  const arr = _logbookLoad();
  arr.push({ text: texte, ts: ts || Date.now(), tags: _logbookTags(texte) });
  _logbookSave(arr.slice(-200)); // garde-fou : 200 dernières entrées
}

function _renderLogbook(searchQuery = "", tagFilter = null) {
  const card = document.getElementById("logbookCard");
  if (!card) return;
  card.style.display = "block";

  const entries = _logbookLoad().slice().reverse(); // plus récent en premier
  const sub = document.getElementById("logbookSub");
  sub.textContent = entries.length
    ? `${entries.length} entrée${entries.length > 1 ? "s" : ""} enregistrée${entries.length > 1 ? "s" : ""}`
    : "Aucune entrée pour l'instant";

  // Construire les tags distincts pour le filtre
  const allTags = {};
  entries.forEach(e => (e.tags || []).forEach(t => { allTags[t] = (allTags[t] || 0) + 1; }));
  const tagFilterEl = document.getElementById("logbookTagFilter");
  const tagNames = Object.keys(allTags).sort((a, b) => allTags[b] - allTags[a]);
  tagFilterEl.innerHTML = tagNames.length
    ? tagNames.map(t => {
        const active = tagFilter === t;
        return `<button type="button" onclick="window._logbookFilterTag('${t}')" style="padding:4px 10px;border-radius:12px;border:1px solid ${active ? "#6C63FF" : "#2A2D3E"};background:${active ? "rgba(108,99,255,0.2)" : "transparent"};color:${active ? "#F0F0F5" : "#8B8FA8"};font-size:0.7rem;font-weight:600;cursor:pointer;">#${t} <span style="color:#555870;">·${allTags[t]}</span></button>`;
      }).join("") + (tagFilter ? `<button type="button" onclick="window._logbookFilterTag(null)" style="padding:4px 10px;border-radius:12px;border:1px solid #2A2D3E;background:transparent;color:#8B8FA8;font-size:0.7rem;cursor:pointer;">✕ tout voir</button>` : "")
    : "";

  const q = searchQuery.toLowerCase().trim();
  const filtered = entries.filter(e => {
    if (tagFilter && !(e.tags || []).includes(tagFilter)) return false;
    if (q && !e.text.toLowerCase().includes(q)) return false;
    return true;
  });

  const listEl = document.getElementById("logbookList");
  const emptyEl = document.getElementById("logbookEmpty");
  if (!filtered.length) {
    listEl.innerHTML = "";
    emptyEl.style.display = "block";
    emptyEl.textContent = entries.length
      ? "Aucun résultat pour ce filtre."
      : "Aucune entrée enregistrée. Écris ton premier ressenti ci-dessus.";
    return;
  }
  emptyEl.style.display = "none";

  const fmt = ts => new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  const highlight = txt => {
    if (!q) return txt;
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    return txt.replace(re, m => `<mark style="background:rgba(255,209,102,0.25);color:#FFD166;padding:0 2px;border-radius:2px;">${m}</mark>`);
  };

  listEl.innerHTML = filtered.map(e => `
    <div style="padding:12px 14px;background:rgba(255,255,255,0.02);border-left:3px solid #A9A3FF;border-radius:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <div style="font-size:0.7rem;color:#8B8FA8;font-weight:600;">${fmt(e.ts)}</div>
        <div style="display:flex;gap:4px;">
          ${(e.tags || []).map(t => `<span style="font-size:0.62rem;background:rgba(108,99,255,0.15);color:#A9A3FF;padding:2px 7px;border-radius:10px;">#${t}</span>`).join("")}
        </div>
      </div>
      <div style="font-size:0.85rem;color:#D0D0E0;line-height:1.5;">${highlight(e.text)}</div>
    </div>
  `).join("");
}

let _logbookCurrentTag = null;
let _logbookCurrentQuery = "";
window._logbookFilterTag = function (tag) {
  _logbookCurrentTag = tag;
  _renderLogbook(_logbookCurrentQuery, _logbookCurrentTag);
};

function _bindLogbookSearch() {
  const input = document.getElementById("logbookSearch");
  if (!input) return;
  input.addEventListener("input", () => {
    _logbookCurrentQuery = input.value;
    _renderLogbook(_logbookCurrentQuery, _logbookCurrentTag);
  });
}
