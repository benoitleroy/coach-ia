// Génère bachata/js/leonie-data.js — banque de 38 séances duo (Benoît + Léonie)
// pour le Massilia Contest du 31/10/2026. Lancer : node scripts/leonie-gen.js
// Standards : C&J 50/35 · Snatch 40/25 · DU/HSPU/T2B/PU : 1 athlète sur 2.
// Charges notées « B: xx · L: xx ». Séance ≈ 2 h. L'ordre compte, pas la date.

import fs from "fs";
import path from "path";
const __dirname = path.dirname(new URL(import.meta.url).pathname);

// ─── Blocs réutilisables ────────────────────────────────────────────────────
const WU = [
`WARM UP (15')
3 tours tranquilles :
250 m rameur
10 pass-through PVC
10 squats poids du corps
5 inchworms
puis avec la barre à vide, 2 tours :
5 deadlift
5 muscle clean
5 front squat
5 push press
5 hang power snatch`,
`WARM UP (15')
2' corde à sauter simple (Léonie : single-unders, Benoît : DU tranquilles)
2 tours :
10 scap pull-ups
10 hollow rocks
10 fentes arrière
10 push-ups
puis complexe barre à vide × 3 :
3 deadlift · 3 hang clean · 3 front squat · 3 jerk`,
`WARM UP (15')
400 m course facile ensemble
2 tours :
10 good mornings PVC
10 sots press PVC
10 kip swings
10 air squats
puis snatch à vide × 2 tours :
5 snatch deadlift · 5 hang muscle snatch · 5 overhead squat PVC (Benoît : rester au PVC) · 5 hang power snatch`,
`WARM UP (15')
3' assault bike ou rameur facile
2 tours :
10 band pull-apart
10 ups & down
10 wall balls légers
:20 dead hang
puis barre à vide × 2 :
5 clean pull · 5 power clean · 5 push jerk · 5 split jerk`,
];

// Force / haltéro par phase (index 0..4)
const STRENGTH = [
// Phase 1 — technique, sous les standards
[
`ABSOLUTE STRENGTH · Clean & Jerk technique (30')
a. EMOM 8' : 2 power clean + 2 push jerk
B: 35 kg · L: 25 kg
b. Puis 5 × 3 clean & jerk complets, repos 90 s
B: 40 kg · L: 28 kg
Consigne : coudes vite, jerk avec les jambes, 0 rep ratée.`,
`ABSOLUTE STRENGTH · Snatch technique (30')
a. EMOM 8' : 3 hang power snatch
B: 30 kg · L: 18 kg
b. 5 × 3 power snatch depuis le sol, repos 90 s
B: 35 kg · L: 20 kg
Consigne : bras longs, barre proche, verrouiller au-dessus de la tête.`,
`ABSOLUTE STRENGTH · Back squat (30')
5 × 5 back squat, repos 2'
B: 70 kg (comme le cycle en cours) · L: 70 % de son max ou charge qu'elle tient 5 reps propres
puis 3 × 8 front squat léger
B: 40 kg · L: 25 kg`,
`ABSOLUTE STRENGTH · Complexe clean (30')
Toutes les 90 s × 8 : 1 clean + 1 front squat + 1 jerk
B: 40 kg · L: 28 kg
puis 3 × 5 push press
B: 45 kg · L: 28 kg`,
],
// Phase 2 — construire, on approche les standards
[
`ABSOLUTE STRENGTH · C&J cyclage (30')
a. EMOM 10' : 3 clean & jerk touch-and-go
B: 42 kg · L: 30 kg
b. 3 × 5 clean & jerk singles rapides (lâcher la barre entre chaque), repos 2'
B: 50 kg · L: 35 kg (la charge de compét, en singles)`,
`ABSOLUTE STRENGTH · Snatch cyclage (30')
a. EMOM 10' : 3 power snatch touch-and-go
B: 35 kg · L: 22 kg
b. 4 × 5 power snatch singles, repos 2'
B: 40 kg · L: 25 kg (charge de compét)`,
`ABSOLUTE STRENGTH · Front squat + jerk (30')
a. 5 × 3 front squat, repos 2'
B: 60 kg · L: 75-80 % de son max
b. 5 × 3 split jerk depuis le rack
B: 50 kg · L: 35 kg`,
`ABSOLUTE STRENGTH · Deadlift + clean pull (30')
a. 5 × 5 deadlift, repos 2'
B: 100 kg · L: 1,2 × son C&J de compét ≈ 45-50 kg
b. 4 × 3 clean pull lourd
B: 60 kg · L: 40 kg`,
],
// Phase 3 — charge de compét, volume
[
`ABSOLUTE STRENGTH · C&J à la charge de compét (30')
6 séries de 5 clean & jerk, repos 90 s, chrono par série
B: 50 kg · L: 35 kg
Noter le temps de chaque série : il doit rester stable. Si une série explose, +30 s de repos.`,
`ABSOLUTE STRENGTH · Snatch à la charge de compét (30')
6 séries de 5 power snatch, repos 90 s, chrono par série
B: 40 kg · L: 25 kg
Enchaîner touch-and-go si possible, sinon singles rapides.`,
`ABSOLUTE STRENGTH · Barre en relais (30')
Toutes les 2' × 10 : B fait 5 C&J (50 kg) pendant que L repose, puis L fait 5 C&J (35 kg)
Objectif : chacun finit ses 5 reps en moins de 30 s.`,
`ABSOLUTE STRENGTH · Mix compét (30')
EMOM 12' alterné :
min impaire : 4 snatch (B 40 · L 25)
min paire : 4 clean & jerk (B 50 · L 35)
Chacun sur sa barre, en même temps.`,
],
// Phase 4 — simulation
[
`ABSOLUTE STRENGTH · Ouverture rapide (20')
3 × 3 clean & jerk (B 50 · L 35) puis 3 × 3 snatch (B 40 · L 25)
Repos 90 s. Pas plus lourd, on garde du jus pour les WODs.`,
`ABSOLUTE STRENGTH · Barre en fatigue (25')
3 tours, repos 2' :
30 s rameur fort
8 clean & jerk (B 50 · L 35)
30 s rameur fort
8 power snatch (B 40 · L 25)`,
`ABSOLUTE STRENGTH · Squat de maintien (25')
4 × 5 back squat, repos 2'
B: 75 kg · L: 70 % max
puis 3 × 5 push jerk (B 50 · L 35)`,
`ABSOLUTE STRENGTH · Singles de confiance (20')
10 singles clean & jerk toutes les 40 s (B 50 · L 35)
puis 10 singles snatch toutes les 40 s (B 40 · L 25)`,
],
// Phase 5 — affûtage
[
`ABSOLUTE STRENGTH · Affûtage (20')
5 × 2 clean & jerk (B 45 · L 30) puis 5 × 2 snatch (B 35 · L 22)
Repos 90 s. Léger, propre, on rentre frais.`,
`ABSOLUTE STRENGTH · Activation (15')
3 × 3 clean & jerk (B 50 · L 35), 3 × 3 snatch (B 40 · L 25)
Une fois à la charge de compét pour la tête, puis on arrête.`,
],
];

// Gymnastique par phase : Léonie apprend le DU, Benoît prend DU/HSPU/T2B/PU
const GYM = [
// Phase 1 — Léonie : DU initiation, kip swing, ring rows. Benoît : volume.
[
`RELATIVE STRENGTH ENDURANCE · Gymnastique (25')
Léonie :
a. DU — 3 × 30 single-unders rythmés en sautant plus haut, puis 10 × (5 singles + 1 tentative de DU). Corde : poignées aux aisselles, poignets seuls.
b. T2B progression — 3 × 10 kip swings (hollow ↔ arch, corps gainé, épaules actives)
c. Pull-up progression — 3 × 8 ring rows tempo 3 s en descente
Benoît :
a. EMOM 6' : 8 toes-to-bar
b. EMOM 6' : 5 HSPU (strict ou sur box si besoin)
c. 3 × 8 kipping pull-ups`,
`RELATIVE STRENGTH ENDURANCE · Gymnastique (25')
Léonie :
a. DU — 5 × :30 singles « hauts et souples », repos :30, puis 15 essais « single-single-DOUBLE »
b. T2B — 3 × 10 hanging knee raises lents (genoux à la poitrine, sans balancer)
c. Pull-up — 3 × 5 tractions avec élastique (strict), + 3 × :20 dead hang
Benoît :
a. 4 × 30 DU sans casser, repos 1'
b. 4 × 8 T2B, repos 1'
c. 3 × 10 push-ups sur anneaux`,
`RELATIVE STRENGTH ENDURANCE · Gymnastique (25')
Léonie :
a. DU — 20 essais single-single-double, puis 5 essais de 2 DU d'affilée
b. T2B — 3 × 8 kip swings + 3 × 8 knee raises en kip (utiliser le balancement)
c. Pull-up — 3 × 10 kip swings sur barre (hollow/arch amples), 3 × 6 ring rows pieds surélevés
Benoît :
a. 5 × 5 HSPU strict (ou pike push-ups pieds sur box)
b. 3 × 10 kipping pull-ups
c. 3 × :30 hollow hold + :30 arch hold`,
`RELATIVE STRENGTH ENDURANCE · Gymnastique (25')
Léonie :
a. DU — 4 × :45 « single-single-double » en continu, repos 1'
b. T2B — 3 × 6 knees-to-elbow en kip
c. Pull-up — 3 × 5 jumping pull-ups descente lente 3 s, + 3 × 5 tractions élastique
Benoît :
a. Tabata DU (20 s / 10 s × 8) : compter le total
b. 3 × 6 HSPU kipping
c. 3 × 8 T2B`,
],
// Phase 2 — Léonie : 3-5 DU, knees-to-elbow, premiers kipping pull-ups
[
`RELATIVE STRENGTH ENDURANCE · Gymnastique (25')
Léonie :
a. DU — 10 essais de 3 DU d'affilée, puis 3 × :40 singles/doubles mélangés
b. T2B — 3 × 8 knees-to-elbow en kip, puis 5 essais de vraies T2B (pointes à la barre)
c. Pull-up — 3 × 5 kipping pull-ups avec élastique fin
Benoît :
a. 5 × 40 DU, repos 1'
b. 5 × 6 HSPU, repos 1'
c. 3 × 10 T2B`,
`RELATIVE STRENGTH ENDURANCE · Gymnastique (25')
Léonie :
a. DU — objectif du jour : 5 DU d'affilée, 10 essais max
b. T2B — EMOM 5' : 5 knees-to-elbow ou 3 T2B
c. Pull-up — 5 × 3 kipping pull-ups (élastique si besoin), repos 1'
Benoît :
a. EMOM 8' : 6 T2B + 3 HSPU
b. 3 × 12 push-ups sur anneaux
c. 3 × 10 kipping pull-ups`,
`RELATIVE STRENGTH ENDURANCE · Gymnastique (25')
Léonie :
a. DU — 5 × max DU d'affilée, repos 1', noter le meilleur
b. T2B — 4 × 5 T2B (ou knees-to-elbow si pas encore), repos 1'
c. Pull-up — 4 × 4 kipping pull-ups, repos 1'
Benoît :
a. 4 × 50 DU, repos 1'
b. 4 × 8 T2B enchaînés, repos 1'
c. 4 × 6 HSPU`,
`RELATIVE STRENGTH ENDURANCE · Gymnastique (25')
Léonie :
a. DU — EMOM 6' : 5 DU (ou 20 singles si ça casse)
b. T2B — 3 × 6 T2B en kip (knee raises si besoin)
c. Pull-up — 3 × 5 kipping pull-ups
Benoît :
a. EMOM 6' : 20 DU + 4 HSPU
b. 3 × 10 kipping pull-ups
c. 3 × 10 T2B`,
],
// Phase 3 — Léonie : 10 DU, T2B et kipping en petites séries. Décision.
[
`RELATIVE STRENGTH ENDURANCE · Gymnastique (25')
Léonie :
a. DU — 5 × 10 DU (ou max), repos 1'
b. T2B — 4 × 5 T2B, repos 1'
c. Pull-up — 4 × 5 kipping pull-ups, repos 1'
Benoît :
a. 3 × 60 DU, repos 1'
b. 3 × 10 HSPU, repos 1'
c. 3 × 12 T2B
Décision du jour : pour chaque skill (DU, T2B, PU), qui le prend le jour J ? Si Léonie ne tient pas 10 DU / 5 T2B / 5 PU, Benoît prend ce skill et on arrête d'en faire un sujet.`,
`RELATIVE STRENGTH ENDURANCE · Gymnastique (25')
En fatigue, ensemble, 4 tours, repos 1' :
20 DU (Léonie : 20 DU ou 40 singles)
8 T2B (Léonie : 5 T2B ou 8 knees-to-elbow)
6 HSPU (Léonie : 10 push-ups)
6 pull-ups (Léonie : 4 kipping ou 8 ring rows)`,
`RELATIVE STRENGTH ENDURANCE · Gymnastique (25')
Léonie : 3 × 15 DU, repos 1' · 3 × 6 T2B · 3 × 5 kipping pull-ups
Benoît : EMOM 10' alterné : 40 DU / 8 HSPU / 10 T2B / 8 PU / repos`,
`RELATIVE STRENGTH ENDURANCE · Gymnastique (25')
Léonie : EMOM 6' : 10 DU + 4 T2B, puis 3 × 5 kipping pull-ups
Benoît : EMOM 6' : 30 DU + 5 HSPU, puis 3 × max unbroken pull-ups`,
],
// Phase 4 — entretien
[
`RELATIVE STRENGTH ENDURANCE · Gymnastique (15')
Léonie : 3 × 20 DU · 3 × 6 T2B · 3 × 5 kipping pull-ups
Benoît : 3 × 50 DU · 3 × 10 T2B · 3 × 8 HSPU
Rien de nouveau, on entretient.`,
`RELATIVE STRENGTH ENDURANCE · Gymnastique (15')
Ensemble, 3 tours synchro :
15 DU (Léonie : 15 DU ou 30 singles)
10 T2B (Léonie : 5 T2B ou knees-to-elbow)
5 HSPU (Léonie : push-ups)`,
`RELATIVE STRENGTH ENDURANCE · Gymnastique (15')
Léonie : 5 × 15 DU, repos :45, puis 3 × 5 T2B
Benoît : 5 × 40 DU + 5 HSPU, repos :45`,
`RELATIVE STRENGTH ENDURANCE · Gymnastique (15')
EMOM 8' alterné : Léonie 10 DU / Benoît 10 T2B / Léonie 5 T2B ou 5 kipping PU / Benoît 6 HSPU`,
],
// Phase 5 — affûtage
[
`RELATIVE STRENGTH ENDURANCE · Gymnastique (10')
Léonie : 3 × 15 DU · 2 × 5 T2B · 2 × 4 kipping pull-ups
Benoît : 3 × 30 DU · 3 × 6 T2B · 3 × 4 HSPU
Court, propre, aucun échec.`,
`RELATIVE STRENGTH ENDURANCE · Gymnastique (10')
2 × 20 DU chacun · 2 × 5 T2B (Léonie : ou knees-to-elbow) · 2 × 3 HSPU (Benoît) / 2 × 5 push-ups (Léonie)`,
],
];

// 38 conditionings duo, tous différents, ordonnés
const COND = [
// Phase 1 (1-8)
`CONDITIONING · Duo (30')
AMRAP 20' en relais, un travaille l'autre repose :
10 wall balls (B 9 kg · L 6 kg)
10 box jumps (B 60 cm · L 50 cm)
10 cal rameur
On alterne à chaque tour complet.`,
`CONDITIONING · Duo (30')
For time, reps partagées librement (cap 20') :
100 cal rameur
80 kettlebell swings (B 24 · L 16)
60 burpees
40 hang power clean (B 40 · L 28)`,
`CONDITIONING · Duo (30')
5 tours synchro (en même temps, même rythme) :
12 thrusters (B 30 · L 20)
12 sit-ups
200 m course ensemble
Repos 1' entre les tours.`,
`CONDITIONING · Duo (30')
« You go, I go » 3 × 6' AMRAP, repos 2' entre :
6 power snatch (B 35 · L 22)
8 burpees over bar
10 air squats
Un fait le tour complet, l'autre attend derrière la barre.`,
`CONDITIONING · Duo (30')
For time, cap 25' :
50 cal assault bike ou rameur (partagés)
puis 5 tours : chacun 8 clean & jerk (B 40 · L 28) + 12 box step-ups
puis 50 cal partagés`,
`CONDITIONING · Duo (30')
EMOM 24' alterné à 2 (chacun fait sa minute pendant que l'autre repose) :
min 1 : 12 cal rameur
min 2 : 10 kettlebell swings + 10 goblet squats
min 3 : 30 DU (Léonie : 60 singles)
min 4 : 8 hang power clean (B 40 · L 28)`,
`CONDITIONING · Duo (30')
« Partner 21-15-9 » reps partagées, cap 15' :
thrusters (B 35 · L 22)
burpees over bar
puis 400 m course ensemble
Repos 5', puis 3 × 200 m rameur sprint chacun, repos égal au temps de travail.`,
`CONDITIONING · Duo (30')
AMRAP 18' en relais, un tour chacun :
5 deadlift (B 70 · L 45)
7 hang power snatch (B 30 · L 20)
9 box jumps
11 sit-ups`,
// Phase 2 (9-16)
`CONDITIONING · Duo (30')
For time, cap 20' :
60 clean & jerk partagés (B 45 · L 30)
60 cal rameur partagés
60 T2B partagés (Benoît prend 40, Léonie 20 knee raises)
Répartition libre, communiquer avant.`,
`CONDITIONING · Duo (30')
4 tours synchro, repos 1'30 :
10 power snatch (B 35 · L 22)
15 wall balls
20 DU (Léonie : 20 DU ou 40 singles)`,
`CONDITIONING · Duo (30')
« Chipper » partagé, cap 25' :
100 cal assault bike
80 kettlebell swings (B 24 · L 16)
60 box jumps
40 clean & jerk (B 45 · L 30)
20 burpees synchro`,
`CONDITIONING · Duo (30')
3 × AMRAP 6' en relais, repos 2' :
8 thrusters (B 35 · L 22)
8 pull-ups (Léonie : ring rows)
8 burpees
Changer de personne à chaque tour.`,
`CONDITIONING · Duo (30')
EMOM 20' alterné :
min impaire — Benoît : 6 clean & jerk (50 kg) + 20 DU
min paire — Léonie : 6 clean & jerk (35 kg) + 10 DU ou 20 singles
On tient jusqu'au bout sans rater.`,
`CONDITIONING · Duo (30')
For time, cap 20' :
5 tours :
chacun 8 power snatch (B 40 · L 25)
puis 20 cal rameur partagés
puis 10 burpees synchro`,
`CONDITIONING · Duo (30')
« Tabata en relais » 8 blocs de 4' :
Tabata rameur (un fait 20 s pendant que l'autre repose, on alterne)
puis Tabata thrusters (B 30 · L 20) même principe
puis Tabata burpees
puis Tabata DU (Léonie : singles)`,
`CONDITIONING · Duo (30')
AMRAP 16' partagé librement :
30 cal rameur
20 hang squat clean (B 40 · L 28)
10 HSPU (Benoît) ou 15 push-ups (Léonie)`,
// Phase 3 (17-24)
`CONDITIONING · Duo, type contest (30')
WOD 1 · For time, cap 12' :
60 clean & jerk partagés (B 50 · L 35)
60 cal rameur partagés
Repos 8'
WOD 2 · AMRAP 8' synchro :
6 power snatch (B 40 · L 25)
8 burpees over bar`,
`CONDITIONING · Duo (30')
For time, cap 18' :
3 tours :
20 DU chacun (Léonie : 20 DU ou 40 singles)
10 T2B (Benoît) / 10 knee raises (Léonie) synchro
15 clean & jerk partagés (B 50 · L 35)
200 m course ensemble`,
`CONDITIONING · Duo (30')
EMOM 24' alterné :
min 1 : Benoît 5 snatch (40) — Léonie repose
min 2 : Léonie 5 snatch (25) — Benoît repose
min 3 : 15 cal rameur partagés (7/8)
min 4 : 10 burpees synchro`,
`CONDITIONING · Duo (30')
« Chipper compét » cap 20', reps partagées :
50 cal assault bike
40 power snatch (B 40 · L 25)
30 box jumps over
20 clean & jerk (B 50 · L 35)
10 muscle-ups ou 20 pull-ups (Benoît) / 20 ring rows (Léonie)`,
`CONDITIONING · Duo (30')
3 × AMRAP 5' en relais, repos 2'30 :
5 clean & jerk (B 50 · L 35)
10 wall balls
15 DU (Léonie : 15 DU ou 30 singles)
Un tour chacun, changement rapide.`,
`CONDITIONING · Duo (30')
For time, cap 15' :
21-15-9 partagés :
power snatch (B 40 · L 25)
cal rameur
burpees over bar
puis 30 T2B partagés (Benoît max, Léonie knee raises)`,
`CONDITIONING · Duo, 2 WODs (35')
WOD 1 · 3 tours synchro, repos 1' : 10 thrusters (B 40 · L 28) + 10 burpees
Repos 6'
WOD 2 · For time cap 8' : 40 clean & jerk partagés (B 50 · L 35) + 40 DU chacun (Léonie : 40 DU ou 80 singles)`,
`CONDITIONING · Duo (30')
AMRAP 20' en relais tour par tour :
8 deadlift (B 80 · L 50)
8 hang power clean (B 50 · L 35)
8 push jerk (B 50 · L 35)
8 box jumps
Une barre chacun, chargée d'avance.`,
// Phase 4 (25-32)
`CONDITIONING · Simulation contest (40')
WOD 1 · For time cap 10' : 50 cal rameur partagés + 50 clean & jerk partagés (B 50 · L 35)
Repos 12'
WOD 2 · AMRAP 10' synchro : 8 power snatch (B 40 · L 25) + 8 box jumps + 16 DU (Léonie : 16 DU ou 32 singles)
Débrief : qui a craqué où, ordre des relais.`,
`CONDITIONING · Duo (30')
For time, cap 20' :
100 wall balls partagés
80 cal rameur partagés
60 clean & jerk partagés (B 50 · L 35)
40 burpees over bar partagés
20 HSPU (Benoît) / 20 push-ups (Léonie)`,
`CONDITIONING · Duo (30')
EMOM 20' :
min 1 : 12 cal rameur chacun
min 2 : Benoît 5 snatch (40) — Léonie 5 snatch (25) en même temps
min 3 : 10 burpees synchro
min 4 : repos
× 5 tours`,
`CONDITIONING · Simulation contest (40')
WOD 1 · 21-15-9 partagés cap 10' : thrusters (B 40 · L 28) + pull-ups (Léonie : ring rows)
Repos 10'
WOD 2 · For time cap 12' : 4 tours : 10 clean & jerk partagés (B 50 · L 35) + 10 T2B (Benoît) + 20 DU (Léonie ou Benoît selon décision)`,
`CONDITIONING · Duo (30')
« Death by » en relais :
min 1 : 1 clean & jerk chacun (B 50 · L 35), min 2 : 2, min 3 : 3… jusqu'à ne plus tenir la minute
puis repos 5'
puis AMRAP 8' partagé : 10 cal rameur + 10 power snatch (B 40 · L 25)`,
`CONDITIONING · Duo (30')
4 tours synchro, repos 1'30 :
12 cal assault bike
8 clean & jerk (B 50 · L 35)
8 burpees over bar
Objectif : tours réguliers, moins de 15 s d'écart entre le premier et le dernier.`,
`CONDITIONING · Simulation contest (40')
WOD 1 · AMRAP 12' en relais : 5 power snatch (B 40 · L 25) + 10 wall balls + 20 DU (au choix)
Repos 10'
WOD 2 · For time cap 8' : 30 clean & jerk partagés (B 50 · L 35) + 30 cal rameur partagés + 30 burpees synchro (15 chacun)`,
`CONDITIONING · Duo (30')
For time, cap 20', reps partagées :
5 tours :
10 hang power clean (B 50 · L 35)
10 box jumps
10 T2B (Benoît) ou 10 knee raises (Léonie)
puis 400 m course ensemble pour finir`,
// Phase 5 (33-38) — plus court, on garde la fraîcheur
`CONDITIONING · Court (20')
AMRAP 10' en relais : 5 clean & jerk (B 50 · L 35) + 10 cal rameur + 15 DU (au choix)
Puis 10' de mobilité.`,
`CONDITIONING · Court (20')
3 tours synchro, repos 2' : 8 power snatch (B 40 · L 25) + 8 burpees + 200 m course`,
`CONDITIONING · Court (15')
EMOM 12' alterné : 4 clean & jerk (B 50 · L 35) / 4 snatch (B 40 · L 25) / 10 cal rameur / repos`,
`CONDITIONING · Court (15')
2 × AMRAP 5' en relais, repos 3' : 5 thrusters (B 35 · L 22) + 5 burpees + 10 DU`,
`CONDITIONING · Activation veille de compét (10')
1 tour tranquille : 5 clean & jerk (B 50 · L 35), 5 snatch (B 40 · L 25), 20 DU, 5 T2B, 5 burpees
Puis étirements, hydratation, dodo tôt.`,
`CONDITIONING · Jour J (contest)
Échauffement 15' à deux : 2' rameur, mobilité, barre à vide, 3 singles à la charge de compét.
Entre les WODs : marcher, boire, manger léger.
Se parler AVANT chaque WOD : qui commence, qui prend les DU, où on change.`,
];

const ACC = [
`(OPTIONAL) STRENGTH ACCESSORY (15')
3 tours : 12 dumbbell rows par bras · 15 GHD ou sit-ups · :30 planche · 10 face pulls`,
`(OPTIONAL) STRENGTH ACCESSORY (15')
Mobilité ciblée Benoît : 5' overhead squat au PVC tenu en bas · dislocations élastique · genou-mur chevilles
Léonie : 3 × 10 hip thrust + 3 × 15 band walks`,
`(OPTIONAL) STRENGTH ACCESSORY (15')
3 tours : 10 pistols ou fentes bulgares par jambe · 15 hollow rocks · 50 m portage fermier lourd`,
`(OPTIONAL) STRENGTH ACCESSORY (15')
3 tours : 8 strict press (B 35 · L 20) · 12 ring rows · :30 dead hang · 20 sit-ups`,
`(OPTIONAL) STRENGTH ACCESSORY (15')
Cardio facile 10' (rameur ou vélo) puis 5' d'étirements : hanches, épaules, mollets`,
];

const PHASE_OF = n => n <= 8 ? 0 : n <= 16 ? 1 : n <= 24 ? 2 : n <= 32 ? 3 : 4;
const PHASE_NAMES = ["Technique", "Construire", "Charge de compét", "Simulation", "Affûtage"];

const seances = [];
for (let n = 1; n <= 38; n++) {
  const p = PHASE_OF(n);
  const str = STRENGTH[p][(n - 1) % STRENGTH[p].length];
  const gym = GYM[p][(n - 1) % GYM[p].length];
  const cond = COND[n - 1];
  const parts = [WU[(n - 1) % WU.length]];
  if (n < 38) parts.push(str, gym);
  parts.push(cond);
  if (n < 33) parts.push(ACC[(n - 1) % ACC.length]);
  const strShort = str.split("\n")[0].replace(/^ABSOLUTE STRENGTH · /, "").replace(/\s*\(\d+'\)$/, "");
  const condLine = (cond.split("\n")[1] || "").replace(/[,:]?\s*(cap \d+'|reps partagées.*|en relais.*|partagé.*|synchro.*)?\s*:?$/i, "").trim();
  const titreCond = strShort + " + " + (condLine.length > 38 ? condLine.slice(0, 36) + "…" : condLine);
  seances.push({
    n,
    phase: PHASE_NAMES[p],
    titre: n === 38 ? "Jour J — Massilia Contest" : "Séance " + n + " · " + titreCond,
    contenu: (n === 1 ? "IMPORTANT\nBanque de 38 séances duo pour le Massilia Contest (31/10). Ordre à respecter, planning libre. Charges : B = Benoît, L = Léonie. Standards compét : C&J 50/35 · Snatch 40/25. DU/HSPU/T2B/PU : 1 athlète sur 2 → Léonie n'a ni DU, ni T2B, ni kipping pull-up : elle les apprend dans chaque bloc gym, Benoît les prend le jour J sauf si elle les tient d'ici la phase 3.\n" : "") + parts.join("\n"),
  });
}

const out = "// AUTO-GÉNÉRÉ par scripts/leonie-gen.js — ne pas éditer.\nwindow.LEONIE = " + JSON.stringify(seances) + ";\n";
fs.writeFileSync(path.join(__dirname, "..", "bachata", "js", "leonie-data.js"), out);
console.log("leonie-data.js :", seances.length, "séances");
