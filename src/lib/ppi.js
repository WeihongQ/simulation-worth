// Prediction-powered inference (PPI) for combining a small human sample with
// a large LLM-simulated sample, following Broska, Howes & van Loon (2025),
// "The Mixed Subjects Design", Sociological Methods & Research 54(3):1074-1109.
//
// Notation (matches the paper and docs/ppi-demo-prompt.md):
//   n = human ("labeled") sample size, N = simulated ("unlabeled") sample size
//   Y = human response, f = simulated response, Delta = Y - f
//
// All functions are pure and framework-independent so they can be unit
// tested directly and reused for both the precomputed Twin-2K-500 domains
// and any human/simulated CSV a user uploads.

export function mean(values) {
  if (values.length === 0) throw new Error("mean: values must be non-empty");
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// Sample variance (ddof = 1, i.e. divides by n-1).
export function sampleVariance(values) {
  if (values.length < 2) throw new Error("sampleVariance: need at least 2 values");
  const m = mean(values);
  const sumSq = values.reduce((sum, v) => sum + (v - m) ** 2, 0);
  return sumSq / (values.length - 1);
}

// Plain Pearson correlation. NOTE: this is not necessarily the "PPI
// correlation" defined in Broska et al. -- see docs/ppi-demo-prompt.md and
// src/data/twin2k.json's meta.correlation_caveat.
export function pearsonCorrelation(x, y) {
  if (x.length !== y.length) throw new Error("pearsonCorrelation: arrays must be the same length");
  if (x.length < 2) throw new Error("pearsonCorrelation: need at least 2 pairs");
  const mx = mean(x);
  const my = mean(y);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < x.length; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

// Given paired human/simulated arrays, compute every statistic the rest of
// this module needs. Mirrors data/prepare.py's per-domain computation, so
// the same pipeline works for a user's uploaded CSV (layer 2).
export function statsFromPairs(humanValues, simValues) {
  if (humanValues.length !== simValues.length) {
    throw new Error("statsFromPairs: human and simulated arrays must be the same length");
  }
  const n = humanValues.length;
  const diff = humanValues.map((y, i) => y - simValues[i]);
  return {
    n,
    humanMean: mean(humanValues),
    simMean: mean(simValues),
    varHuman: sampleVariance(humanValues),
    varSim: sampleVariance(simValues),
    varDiff: sampleVariance(diff),
    corr: pearsonCorrelation(humanValues, simValues),
  };
}

// theta_hat_PPI = mean(f over N unlabeled) + mean(Y - f over n labeled)
//
// In practice the "N unlabeled" simulated mean is estimated from the same
// simulation model as the labeled sample (simulating more respondents
// doesn't change the underlying distribution), so simMeanUnlabeled is
// usually just simMeanLabeled -- the two are kept separate here so the
// formula matches the paper exactly and so a genuinely distinct unlabeled
// batch could be plugged in.
export function ppiPointEstimate({ simMeanUnlabeled, humanMeanLabeled, simMeanLabeled }) {
  return simMeanUnlabeled + (humanMeanLabeled - simMeanLabeled);
}

// Var(theta_hat_PPI) = var_f / N + var_Delta / n
export function ppiVariance({ varSim, varDiff, N, n }) {
  if (N <= 0 || n <= 0) throw new Error("ppiVariance: N and n must be positive");
  return varSim / N + varDiff / n;
}

// theta_hat_classical = mean(Y over n)  (i.e. humanMeanLabeled itself)
export function classicalVariance({ varHuman, n }) {
  if (n <= 0) throw new Error("classicalVariance: n must be positive");
  return varHuman / n;
}

// n_eff = var_Y / Var(theta_hat_PPI): the number of human respondents that
// would give the classical estimator the same variance as the PPI estimate.
export function effectiveSampleSize({ varHuman, varSim, varDiff, N, n }) {
  const variance = ppiVariance({ varSim, varDiff, N, n });
  if (variance <= 0) return Infinity;
  return varHuman / variance;
}

// Optimal n/N ratio minimizing Var(theta_hat_PPI) subject to a linear budget
// c_h*n + c_m*N = B: n/N = sqrt((var_Delta * c_m) / (var_sim * c_h))
export function optimalAllocationRatio({ varDiff, varSim, costHuman, costSim }) {
  if (varSim <= 0 || costHuman <= 0) throw new Error("optimalAllocationRatio: varSim and costHuman must be positive");
  return Math.sqrt((varDiff * costSim) / (varSim * costHuman));
}

// Scales the optimal ratio to exactly exhaust a total budget B, given
// costHuman per human respondent and costSim per simulated respondent.
export function allocateByBudget({ varDiff, varSim, costHuman, costSim, budget }) {
  const ratio = optimalAllocationRatio({ varDiff, varSim, costHuman, costSim }); // n/N
  const N = budget / (costHuman * ratio + costSim);
  const n = ratio * N;
  return { n, N };
}

// Minimal-cost (n, N) -- at the same optimal ratio -- that hits a target
// Var(theta_hat_PPI).
export function allocateByTargetVariance({ varDiff, varSim, costHuman, costSim, targetVariance }) {
  if (targetVariance <= 0) throw new Error("allocateByTargetVariance: targetVariance must be positive");
  const ratio = optimalAllocationRatio({ varDiff, varSim, costHuman, costSim }); // n/N
  // Var = varSim/N + varDiff/n = varSim/N + varDiff/(ratio*N) = (varSim + varDiff/ratio) / N
  const N = (varSim + varDiff / ratio) / targetVariance;
  const n = ratio * N;
  return { n, N };
}

export function totalCost({ n, N, costHuman, costSim }) {
  return n * costHuman + N * costSim;
}

// Cost of a humans-only (classical) design reaching the same precision as a
// given PPI variance, i.e. costHuman * n_eff.
export function costOfClassicalEquivalent({ costHuman, varHuman, variance }) {
  const nEff = variance > 0 ? varHuman / variance : Infinity;
  return costHuman * nEff;
}

export function costSaved({ costHuman, varHuman, variance, actualCost }) {
  return costOfClassicalEquivalent({ costHuman, varHuman, variance }) - actualCost;
}

// Two-tailed z-score for a confidence level, via Acklam's rational
// approximation of the inverse standard normal CDF (no stats library
// needed). Accurate to ~1.15e-9 relative error, more than sufficient for
// display purposes.
export function zScore(confidence) {
  if (confidence <= 0 || confidence >= 1) throw new Error("zScore: confidence must be in (0, 1)");
  const p = 1 - (1 - confidence) / 2; // upper tail probability for two-sided interval

  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
    1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
    6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
    -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
    3.754408661907416e+00];

  const pLow = 0.02425;
  let q, r, x;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= 1 - pLow) {
    q = p - 0.5;
    r = q * q;
    x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  return x;
}

export function ciHalfWidth(variance, confidence = 0.95) {
  if (variance < 0) throw new Error("ciHalfWidth: variance must be non-negative");
  return zScore(confidence) * Math.sqrt(variance);
}
