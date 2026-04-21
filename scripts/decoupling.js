// scripts/decoupling.js
// P1-a.3 — Bike-run aerobic decoupling (Joe Friel test)
//
// Measures aerobic drift across one steady-effort session:
//   decoupling% = [ (pace/HR)_half2 / (pace/HR)_half1 − 1 ] × 100
//
// Interpretation (long endurance sessions in Zone 2):
//   < 5%     ✅ solid aerobic base
//   5–10%    ⚠️ borderline, fatigue underlying
//   > 10%    ❌ insufficient aerobic base
//
// Inputs: Strava activity detail (needs splits_metric with HR + speed).
// Falls back to watts/HR when device_watts=true and speed is unreliable (Zwift).

function weightedMean(values, weights) {
  let num = 0, den = 0;
  for (let i = 0; i < values.length; i++) {
    if (!Number.isFinite(values[i]) || !Number.isFinite(weights[i]) || weights[i] <= 0) continue;
    num += values[i] * weights[i];
    den += weights[i];
  }
  return den > 0 ? num / den : null;
}

// Pick effective speed per split — prefer grade-adjusted speed (removes
// elevation bias on outdoor rides / trail runs / hilly Zwift routes)
function effectiveSpeed(split) {
  const gap = split.average_grade_adjusted_speed;
  if (Number.isFinite(gap) && gap > 0) return gap;
  return split.average_speed;
}

export function computeDecoupling(activity) {
  const splits = activity.splits_metric;
  if (!Array.isArray(splits) || splits.length < 10) {
    return { ok: false, reason: "not-enough-splits", n_splits: splits?.length ?? 0 };
  }

  const valid = splits.filter(s =>
    Number.isFinite(s.moving_time) && s.moving_time > 0 &&
    Number.isFinite(s.average_heartrate) && s.average_heartrate > 0 &&
    Number.isFinite(effectiveSpeed(s)) && effectiveSpeed(s) > 0
  );
  if (valid.length < 10) {
    return { ok: false, reason: "not-enough-valid-splits", n_splits: valid.length };
  }

  const gapUsed = valid.every(s => Number.isFinite(s.average_grade_adjusted_speed));

  // Split at cumulative moving_time midpoint
  const totalTime = valid.reduce((s, v) => s + v.moving_time, 0);
  const halfTime = totalTime / 2;

  const half1 = [];
  const half2 = [];
  let cum = 0;
  for (const s of valid) {
    if (cum + s.moving_time / 2 <= halfTime) half1.push(s);
    else half2.push(s);
    cum += s.moving_time;
  }

  if (half1.length < 3 || half2.length < 3) {
    return { ok: false, reason: "unbalanced-halves", n1: half1.length, n2: half2.length };
  }

  const speed1 = weightedMean(half1.map(effectiveSpeed), half1.map(s => s.moving_time));
  const speed2 = weightedMean(half2.map(effectiveSpeed), half2.map(s => s.moving_time));
  const hr1    = weightedMean(half1.map(s => s.average_heartrate), half1.map(s => s.moving_time));
  const hr2    = weightedMean(half2.map(s => s.average_heartrate), half2.map(s => s.moving_time));

  if (!speed1 || !speed2 || !hr1 || !hr2) {
    return { ok: false, reason: "weighted-mean-failed" };
  }

  // Efficiency factor = speed / HR. If it drops in half 2 → decoupling.
  const ef1 = speed1 / hr1;
  const ef2 = speed2 / hr2;
  const decouplingPct = ((ef2 / ef1) - 1) * 100;

  // Interpretation — Friel threshold on |decoupling|
  const level = Math.abs(decouplingPct) < 5 ? "solide"
              : Math.abs(decouplingPct) < 10 ? "limite"
              : "insuffisant";

  // Low-confidence flag — a clean Friel test needs:
  //   - steady HR between halves (ΔHR ≤ 20 bpm)
  //   - enough samples in both halves (min 5 each, min 10 total)
  const hrDelta = Math.abs(hr2 - hr1);
  const lowConfidence = hrDelta > 20 || half1.length < 5 || half2.length < 5 || valid.length < 10;

  return {
    ok: true,
    decouplingPct: Math.round(decouplingPct * 10) / 10,
    level,
    low_confidence: lowConfidence,
    gap_used: gapUsed,
    half1: {
      n_splits: half1.length,
      speed_ms: Math.round(speed1 * 100) / 100,
      hr:       Math.round(hr1 * 10) / 10,
      ef:       ef1,
    },
    half2: {
      n_splits: half2.length,
      speed_ms: Math.round(speed2 * 100) / 100,
      hr:       Math.round(hr2 * 10) / 10,
      ef:       ef2,
    },
  };
}
