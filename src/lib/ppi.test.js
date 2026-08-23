import { describe, expect, it } from "vitest";
import {
  allocateByBudget,
  allocateByTargetVariance,
  ciHalfWidth,
  classicalVariance,
  costOfClassicalEquivalent,
  costSaved,
  effectiveSampleSize,
  mean,
  optimalAllocationRatio,
  pearsonCorrelation,
  ppiPointEstimate,
  ppiVariance,
  sampleVariance,
  statsFromPairs,
  totalCost,
  zScore,
} from "./ppi.js";

describe("mean", () => {
  it("computes the arithmetic mean", () => {
    expect(mean([1, 2, 3])).toBeCloseTo(2);
  });
  it("throws on empty input", () => {
    expect(() => mean([])).toThrow();
  });
});

describe("sampleVariance", () => {
  it("matches a hand-computed value (ddof=1)", () => {
    // mean = 2.5, squared deviations = 2.25, 0.25, 0.25, 2.25 -> sum 5 / 3
    expect(sampleVariance([1, 2, 3, 4])).toBeCloseTo(5 / 3);
  });
  it("throws with fewer than 2 values", () => {
    expect(() => sampleVariance([1])).toThrow();
  });
});

describe("pearsonCorrelation", () => {
  it("is 1 for a perfect positive linear relationship", () => {
    expect(pearsonCorrelation([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1);
  });
  it("is -1 for a perfect negative linear relationship", () => {
    expect(pearsonCorrelation([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1);
  });
  it("returns null when one variable is constant", () => {
    expect(pearsonCorrelation([1, 2, 3], [5, 5, 5])).toBeNull();
  });
});

describe("statsFromPairs", () => {
  it("matches manual computation of every field", () => {
    const human = [1, 2, 3, 4];
    const sim = [2, 2, 3, 5];
    const s = statsFromPairs(human, sim);
    expect(s.n).toBe(4);
    expect(s.humanMean).toBeCloseTo(mean(human));
    expect(s.simMean).toBeCloseTo(mean(sim));
    expect(s.varHuman).toBeCloseTo(sampleVariance(human));
    expect(s.varSim).toBeCloseTo(sampleVariance(sim));
    expect(s.varDiff).toBeCloseTo(sampleVariance([-1, 0, 0, -1]));
    expect(s.corr).toBeCloseTo(pearsonCorrelation(human, sim));
  });
  it("throws on mismatched lengths", () => {
    expect(() => statsFromPairs([1, 2], [1])).toThrow();
  });
});

describe("ppiPointEstimate", () => {
  it("equals the human mean when the unlabeled and labeled sim means match", () => {
    // simMeanUnlabeled + (humanMeanLabeled - simMeanLabeled), with
    // simMeanUnlabeled == simMeanLabeled, collapses to humanMeanLabeled.
    const est = ppiPointEstimate({ simMeanUnlabeled: 3.2, humanMeanLabeled: 4.0, simMeanLabeled: 3.2 });
    expect(est).toBeCloseTo(4.0);
  });
  it("shifts by the unlabeled/labeled sim mean gap otherwise", () => {
    const est = ppiPointEstimate({ simMeanUnlabeled: 3.5, humanMeanLabeled: 4.0, simMeanLabeled: 3.2 });
    expect(est).toBeCloseTo(4.3);
  });
});

describe("ppiVariance", () => {
  it("matches the closed form varSim/N + varDiff/n", () => {
    expect(ppiVariance({ varSim: 1, varDiff: 2, N: 100, n: 10 })).toBeCloseTo(0.01 + 0.2);
  });
  it("throws for non-positive N or n", () => {
    expect(() => ppiVariance({ varSim: 1, varDiff: 1, N: 0, n: 10 })).toThrow();
  });
});

describe("classicalVariance", () => {
  it("matches varHuman/n", () => {
    expect(classicalVariance({ varHuman: 4, n: 16 })).toBeCloseTo(0.25);
  });
});

describe("effectiveSampleSize", () => {
  it("reduces to varHuman*N/varSim when the simulation has zero bias variance", () => {
    // varDiff = 0 means Var(PPI) = varSim/N exactly.
    const nEff = effectiveSampleSize({ varHuman: 4, varSim: 2, varDiff: 0, N: 1000, n: 50 });
    expect(nEff).toBeCloseTo((4 * 1000) / 2);
  });
  it("approaches varHuman*n/varDiff as N grows very large", () => {
    const nEff = effectiveSampleSize({ varHuman: 4, varSim: 2, varDiff: 1, N: 1e9, n: 50 });
    expect(nEff).toBeCloseTo((4 * 50) / 1, 2);
  });
  it("is smaller for a noisier simulation (higher varDiff), all else equal", () => {
    const good = effectiveSampleSize({ varHuman: 4, varSim: 1, varDiff: 0.1, N: 2000, n: 300 });
    const bad = effectiveSampleSize({ varHuman: 4, varSim: 1, varDiff: 2, N: 2000, n: 300 });
    expect(bad).toBeLessThan(good);
  });
});

describe("optimalAllocationRatio and allocateByBudget", () => {
  it("matches the closed-form sqrt(varDiff*costSim / (varSim*costHuman))", () => {
    const ratio = optimalAllocationRatio({ varDiff: 8, varSim: 2, costHuman: 10, costSim: 1 });
    expect(ratio).toBeCloseTo(Math.sqrt((8 * 1) / (2 * 10)));
  });

  it("allocateByBudget exactly exhausts the budget and preserves the ratio", () => {
    const params = { varDiff: 8, varSim: 2, costHuman: 10, costSim: 1 };
    const budget = 5000;
    const { n, N } = allocateByBudget({ ...params, budget });
    expect(totalCost({ n, N, costHuman: params.costHuman, costSim: params.costSim })).toBeCloseTo(budget);
    expect(n / N).toBeCloseTo(optimalAllocationRatio(params));
  });

  it("a cheaper human cost shifts allocation toward more humans", () => {
    const base = { varDiff: 8, varSim: 2, costSim: 1, budget: 5000 };
    const expensive = allocateByBudget({ ...base, costHuman: 50 });
    const cheap = allocateByBudget({ ...base, costHuman: 5 });
    expect(cheap.n).toBeGreaterThan(expensive.n);
  });
});

describe("allocateByTargetVariance", () => {
  it("produces an (n, N) whose variance matches the target", () => {
    const params = { varDiff: 8, varSim: 2, costHuman: 10, costSim: 1 };
    const targetVariance = 0.05;
    const { n, N } = allocateByTargetVariance({ ...params, targetVariance });
    const achieved = ppiVariance({ varSim: params.varSim, varDiff: params.varDiff, N, n });
    expect(achieved).toBeCloseTo(targetVariance);
  });

  it("costs more to reach a tighter (smaller) target variance", () => {
    const params = { varDiff: 8, varSim: 2, costHuman: 10, costSim: 1 };
    const loose = allocateByTargetVariance({ ...params, targetVariance: 0.1 });
    const tight = allocateByTargetVariance({ ...params, targetVariance: 0.01 });
    const loosecost = totalCost({ ...loose, costHuman: params.costHuman, costSim: params.costSim });
    const tightcost = totalCost({ ...tight, costHuman: params.costHuman, costSim: params.costSim });
    expect(tightcost).toBeGreaterThan(loosecost);
  });
});

describe("costOfClassicalEquivalent and costSaved", () => {
  it("costOfClassicalEquivalent equals costHuman * nEff", () => {
    const cost = costOfClassicalEquivalent({ costHuman: 20, varHuman: 4, variance: 0.02 });
    expect(cost).toBeCloseTo(20 * (4 / 0.02));
  });

  it("costSaved is positive when PPI is cheaper than an equivalent humans-only design", () => {
    const saved = costSaved({ costHuman: 20, varHuman: 4, variance: 0.02, actualCost: 500 });
    expect(saved).toBeCloseTo(20 * (4 / 0.02) - 500);
    expect(saved).toBeGreaterThan(0);
  });
});

describe("zScore / ciHalfWidth", () => {
  it("zScore(0.95) is approximately 1.96", () => {
    expect(zScore(0.95)).toBeCloseTo(1.959964, 5);
  });
  it("zScore(0.90) is approximately 1.645", () => {
    expect(zScore(0.9)).toBeCloseTo(1.644854, 5);
  });
  it("ciHalfWidth scales with sqrt(variance) at a fixed confidence", () => {
    expect(ciHalfWidth(0.25, 0.95)).toBeCloseTo(1.959964 * 0.5, 5);
  });
});
