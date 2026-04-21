// scripts/inspect-decoupling.js
// P1-a.3 — Compute bike-run decoupling for every candidate session (8 weeks).
// Prints a table, no file writes yet.
// Run: node scripts/inspect-decoupling.js

import { fetchRecentActivities, fetchActivityDetail } from "./strava.js";
import { computeDecoupling } from "./decoupling.js";

const ELIGIBLE_TYPES = new Set(["Run", "TrailRun", "Ride", "VirtualRide"]);

// Icon per decoupling level
function marker(r) {
  if (!r.ok) return "·";
  if (r.low_confidence) return "?";
  if (r.level === "solide") return "✅";
  if (r.level === "limite") return "⚠️";
  return "❌";
}

async function main() {
  console.log("\n🔎 P1-a.3 — Bike-run decoupling sur 8 semaines");
  console.log("═══════════════════════════════════════════\n");

  const debut2025 = Math.floor(new Date("2025-01-01T00:00:00").getTime() / 1000);
  const activities = await fetchRecentActivities(30, debut2025);

  const eightWeeksMs = 8 * 7 * 86400 * 1000;
  const now = Date.now();
  const candidates = activities
    .filter(a => ELIGIBLE_TYPES.has(a.type))
    .filter(a => (a.moving_time || 0) >= 60 * 60)
    .filter(a => a.average_heartrate)
    .filter(a => now - new Date(a.start_date).getTime() <= eightWeeksMs)
    .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

  console.log(`📋 ${candidates.length} séances à analyser (1 appel Strava chacune)\n`);

  const results = [];
  for (const act of candidates) {
    process.stdout.write(`   → Fetch ${act.start_date.slice(0, 10)} ${act.type.padEnd(12)} ... `);
    try {
      const detail = await fetchActivityDetail(act.id);
      const r = computeDecoupling(detail);
      results.push({ act, r });
      console.log(r.ok ? `${r.decouplingPct > 0 ? "+" : ""}${r.decouplingPct}% ${marker(r)}` : `skip (${r.reason})`);
    } catch (e) {
      console.log(`erreur : ${e.message}`);
      results.push({ act, r: { ok: false, reason: "fetch-error" } });
    }
  }

  // ── Table ──
  console.log("\n┌─────────────────────────────────────────────────────────────────────────────────┐");
  console.log("│  Date       Type         Durée   Decoupling   1re moit.       2e moit.     Signal │");
  console.log("├─────────────────────────────────────────────────────────────────────────────────┤");
  results.forEach(({ act, r }) => {
    const d = act.start_date.slice(0, 10);
    const dur = Math.round(act.moving_time / 60);
    if (!r.ok) {
      console.log(`│  ${d}  ${act.type.padEnd(12)} ${(dur+"min").padStart(6)}  ${"skip".padEnd(11)}  ${r.reason.padEnd(40)}  ·     │`);
      return;
    }
    const pct = (r.decouplingPct > 0 ? "+" : "") + r.decouplingPct.toFixed(1) + "%";
    const h1 = `${r.half1.hr}bpm / ${(r.half1.speed_ms*3.6).toFixed(1)}kmh`;
    const h2 = `${r.half2.hr}bpm / ${(r.half2.speed_ms*3.6).toFixed(1)}kmh`;
    const gap = r.gap_used ? "GAP" : "raw";
    const mk = marker(r);
    console.log(`│  ${d}  ${act.type.padEnd(12)} ${(dur+"min").padStart(6)}  ${pct.padEnd(11)}  ${h1.padEnd(15)}  ${h2.padEnd(14)} ${gap} ${mk}│`);
  });
  console.log("└─────────────────────────────────────────────────────────────────────────────────┘");

  // ── Résumé ──
  const ok = results.filter(x => x.r.ok);
  const byRun = ok.filter(x => x.act.type === "Run" || x.act.type === "TrailRun");
  const byBike = ok.filter(x => x.act.type === "Ride" || x.act.type === "VirtualRide");

  const avg = arr => arr.length ? (arr.reduce((s, x) => s + x.r.decouplingPct, 0) / arr.length).toFixed(1) : "—";

  console.log("\n── Résumé 8 semaines ──");
  console.log(`   Course à pied : ${byRun.length} séances · decoupling moyen : ${avg(byRun)}%`);
  console.log(`   Vélo          : ${byBike.length} séances · decoupling moyen : ${avg(byBike)}%`);
  console.log(`   ✅ solide (<5%) : ${ok.filter(x => x.r.level === "solide" && !x.r.low_confidence).length}`);
  console.log(`   ⚠️  limite (5–10%) : ${ok.filter(x => x.r.level === "limite").length}`);
  console.log(`   ❌ >10% : ${ok.filter(x => x.r.level === "insuffisant").length}`);
  console.log(`   ? faible confiance : ${ok.filter(x => x.r.low_confidence).length}`);

  console.log("\n✅ Inspection terminée (aucune écriture).\n");
}

main().catch(err => {
  console.error("\n❌ Erreur :", err.message);
  process.exit(1);
});
