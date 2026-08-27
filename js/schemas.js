// js/schemas.js — petits schémas (bonhomme bâton) pour les mouvements clés.
// Deux poses par mouvement : départ → arrivée. Rendu SVG inline, sans dépendance.
(function () {
  const P = {   // squelette : [tête, épaule, hanche, genou, cheville, coude, main]
    debout:      { t: [50, 18], e: [50, 30], h: [50, 58], g: [50, 82], c: [50, 106], co: [50, 44], m: [50, 58] },
    squatBas:    { t: [50, 34], e: [50, 46], h: [46, 70], g: [66, 76], c: [58, 104], co: [56, 58], m: [58, 70] },
    barreHaute:  { t: [50, 20], e: [50, 32], h: [50, 58], g: [50, 82], c: [50, 106], co: [50, 22], m: [50, 8] },
    penche:      { t: [66, 34], e: [58, 42], h: [42, 58], g: [44, 82], c: [46, 106], co: [60, 58], m: [60, 76] },
    suspendu:    { t: [50, 30], e: [50, 42], h: [50, 68], g: [50, 90], c: [50, 110], co: [50, 26], m: [50, 12] },
    tractionHaut:{ t: [50, 22], e: [50, 34], h: [50, 62], g: [52, 86], c: [52, 108], co: [42, 22], m: [50, 12] },
    plancheHaute:{ t: [22, 60], e: [32, 62], h: [58, 66], g: [78, 70], c: [94, 74], co: [30, 76], m: [28, 90] },
    plancheBasse:{ t: [22, 74], e: [32, 76], h: [58, 74], g: [78, 74], c: [94, 76], co: [40, 84], m: [28, 90] },
    saut:        { t: [50, 12], e: [50, 24], h: [50, 50], g: [48, 70], c: [46, 88], co: [50, 14], m: [50, 4] },
    fente:       { t: [50, 22], e: [50, 34], h: [50, 60], g: [72, 78], c: [72, 100], co: [50, 48], m: [50, 62] },
    assis:       { t: [30, 52], e: [38, 60], h: [58, 78], g: [78, 66], c: [90, 84], co: [44, 70], m: [52, 74] },
    allonge:     { t: [18, 78], e: [30, 80], h: [58, 82], g: [78, 72], c: [90, 88], co: [26, 88], m: [34, 84] },
  };
  const OBJ = {
    barre: (x, y) => `<line x1="${x - 22}" y1="${y}" x2="${x + 22}" y2="${y}" class="ob"/><circle cx="${x - 22}" cy="${y}" r="5" class="ob"/><circle cx="${x + 22}" cy="${y}" r="5" class="ob"/>`,
    kb: (x, y) => `<path d="M${x - 5} ${y - 6} a5 5 0 0 1 10 0" class="ob"/><circle cx="${x}" cy="${y + 3} " r="7" class="ob"/>`,
    ball: (x, y) => `<circle cx="${x}" cy="${y}" r="8" class="ob"/>`,
    box: () => `<rect x="70" y="80" width="28" height="28" class="ob"/>`,
    mur: () => `<line x1="96" y1="4" x2="96" y2="116" class="ob"/>`,
    corde: () => `<line x1="70" y1="4" x2="70" y2="112" class="ob"/>`,
    barreFixe: () => `<line x1="26" y1="10" x2="74" y2="10" class="ob"/>`,
  };
  const bonhomme = (p, objets = "") => `
    <circle cx="${p.t[0]}" cy="${p.t[1]}" r="7" class="bh"/>
    <line x1="${p.e[0]}" y1="${p.e[1]}" x2="${p.h[0]}" y2="${p.h[1]}" class="bh"/>
    <line x1="${p.h[0]}" y1="${p.h[1]}" x2="${p.g[0]}" y2="${p.g[1]}" class="bh"/>
    <line x1="${p.g[0]}" y1="${p.g[1]}" x2="${p.c[0]}" y2="${p.c[1]}" class="bh"/>
    <line x1="${p.e[0]}" y1="${p.e[1]}" x2="${p.co[0]}" y2="${p.co[1]}" class="bh"/>
    <line x1="${p.co[0]}" y1="${p.co[1]}" x2="${p.m[0]}" y2="${p.m[1]}" class="bh"/>
    ${objets}`;
  const pose = (nom, obj) => `<svg viewBox="0 0 100 120" class="schema">${bonhomme(P[nom], obj)}</svg>`;

  const SCHEMAS = {
    squat:     [pose("debout", OBJ.barre(50, 30)), pose("squatBas", OBJ.barre(50, 46))],
    thruster:  [pose("squatBas", OBJ.barre(50, 46)), pose("barreHaute", OBJ.barre(50, 8))],
    deadlift:  [pose("penche", OBJ.barre(60, 92)), pose("debout", OBJ.barre(50, 58))],
    clean:     [pose("penche", OBJ.barre(60, 92)), pose("squatBas", OBJ.barre(50, 46))],
    snatch:    [pose("penche", OBJ.barre(60, 92)), pose("barreHaute", OBJ.barre(50, 8))],
    press:     [pose("debout", OBJ.barre(50, 30)), pose("barreHaute", OBJ.barre(50, 8))],
    pullup:    [pose("suspendu", OBJ.barreFixe()), pose("tractionHaut", OBJ.barreFixe())],
    ttb:       [pose("suspendu", OBJ.barreFixe()), `<svg viewBox="0 0 100 120" class="schema">${bonhomme({ t: [50, 30], e: [50, 42], h: [50, 66], g: [64, 50], c: [62, 26], co: [50, 26], m: [50, 12] }, OBJ.barreFixe())}</svg>`],
    pushup:    [pose("plancheHaute"), pose("plancheBasse")],
    burpee:    [pose("plancheBasse"), pose("saut")],
    box:       [pose("debout"), `<svg viewBox="0 0 100 120" class="schema">${bonhomme({ t: [84, 46], e: [84, 58], h: [84, 74], g: [84, 90], c: [84, 100], co: [84, 66], m: [84, 74] }, OBJ.box())}</svg>`],
    swing:     [pose("penche", OBJ.kb(62, 84)), pose("debout", OBJ.kb(50, 34))],
    wallball:  [pose("squatBas", OBJ.ball(58, 52)), pose("debout", OBJ.ball(50, 10))],
    situp:     [pose("allonge"), pose("assis")],
    lunge:     [pose("debout"), pose("fente")],
    hspu:      [`<svg viewBox="0 0 100 120" class="schema">${bonhomme({ t: [50, 100], e: [50, 88], h: [50, 60], g: [50, 36], c: [50, 14], co: [50, 100], m: [50, 112] }, OBJ.mur())}</svg>`,
                `<svg viewBox="0 0 100 120" class="schema">${bonhomme({ t: [50, 108], e: [50, 96], h: [50, 66], g: [50, 40], c: [50, 16], co: [38, 104], m: [50, 112] }, OBJ.mur())}</svg>`],
    wallwalk:  [pose("plancheHaute", OBJ.mur()), `<svg viewBox="0 0 100 120" class="schema">${bonhomme({ t: [66, 96], e: [70, 84], h: [80, 56], g: [88, 34], c: [94, 16], co: [66, 100], m: [62, 112] }, OBJ.mur())}</svg>`],
    rope:      [pose("debout", OBJ.corde()), `<svg viewBox="0 0 100 120" class="schema">${bonhomme({ t: [62, 38], e: [62, 50], h: [62, 72], g: [72, 84], c: [72, 100], co: [66, 30], m: [70, 18] }, OBJ.corde())}</svg>`],
    "rope-jump": [pose("debout", `<ellipse cx="50" cy="70" rx="34" ry="44" class="ob"/>`), pose("saut", `<ellipse cx="50" cy="52" rx="34" ry="30" class="ob"/>`)],
    row:       [`<svg viewBox="0 0 100 120" class="schema">${bonhomme({ t: [34, 54], e: [40, 64], h: [30, 84], g: [58, 78], c: [78, 92], co: [54, 66], m: [66, 70] })}<line x1="66" y1="70" x2="90" y2="70" class="ob"/></svg>`,
                `<svg viewBox="0 0 100 120" class="schema">${bonhomme({ t: [26, 60], e: [34, 70], h: [22, 86], g: [50, 92], c: [76, 94], co: [30, 78], m: [40, 80] })}<line x1="40" y1="80" x2="90" y2="72" class="ob"/></svg>`],
    ski:       [pose("debout", `<line x1="50" y1="8" x2="50" y2="26" class="ob"/>`), pose("penche", `<line x1="60" y1="70" x2="60" y2="90" class="ob"/>`)],
    bike:      [`<svg viewBox="0 0 100 120" class="schema"><circle cx="34" cy="90" r="18" class="ob"/><circle cx="78" cy="90" r="12" class="ob"/>${bonhomme({ t: [56, 40], e: [56, 52], h: [50, 74], g: [36, 86], c: [34, 96], co: [64, 52], m: [72, 56] })}</svg>`, ""],
    run:       [`<svg viewBox="0 0 100 120" class="schema">${bonhomme({ t: [50, 24], e: [50, 36], h: [50, 62], g: [34, 78], c: [26, 96], co: [62, 46], m: [68, 36] })}</svg>`,
                `<svg viewBox="0 0 100 120" class="schema">${bonhomme({ t: [50, 22], e: [50, 34], h: [50, 60], g: [68, 76], c: [78, 96], co: [38, 46], m: [32, 38] })}</svg>`],
    dip:       [`<svg viewBox="0 0 100 120" class="schema">${bonhomme({ t: [50, 26], e: [50, 38], h: [50, 66], g: [56, 88], c: [56, 108], co: [50, 40], m: [50, 52] })}<line x1="30" y1="52" x2="70" y2="52" class="ob"/></svg>`,
                `<svg viewBox="0 0 100 120" class="schema">${bonhomme({ t: [50, 40], e: [50, 52], h: [50, 78], g: [58, 98], c: [58, 114], co: [40, 46], m: [50, 52] })}<line x1="30" y1="52" x2="70" y2="52" class="ob"/></svg>`],
    carry:     [pose("debout", OBJ.kb(30, 60) + OBJ.kb(70, 60)), ""],
    "row-barre": [`<svg viewBox="0 0 100 120" class="schema">${bonhomme({ t: [70, 40], e: [62, 46], h: [40, 56], g: [38, 82], c: [40, 106], co: [62, 62], m: [62, 82] }, OBJ.barre(62, 84))}</svg>`,
                  `<svg viewBox="0 0 100 120" class="schema">${bonhomme({ t: [70, 40], e: [62, 46], h: [40, 56], g: [38, 82], c: [40, 106], co: [70, 58], m: [58, 58] }, OBJ.barre(58, 60))}</svg>`],
    plank:     [`<svg viewBox="0 0 100 120" class="schema">${bonhomme({ t: [20, 62], e: [30, 66], h: [58, 70], g: [78, 74], c: [94, 78], co: [26, 78], m: [34, 80] })}</svg>`, ""],
  };
  window.SCHEMA = nom => (SCHEMAS[nom] || []).filter(Boolean).join('<span class="schema-fleche">→</span>');
})();
