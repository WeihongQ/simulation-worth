import { statsFromPairs } from "./ppi.js";
import { CSV_MIN_ROWS } from "./csv.js";

function toDomainShape(id, label, stats) {
  return {
    id,
    label,
    n_items: 1,
    n_respondents: stats.n,
    human_mean: stats.humanMean,
    sim_mean: stats.simMean,
    var_human: stats.varHuman,
    var_sim: stats.varSim,
    var_diff: stats.varDiff,
    corr: stats.corr,
  };
}

// Builds the same {overall, domains} shape as src/data/twin2k.json from
// parsed CSV rows, so tabs 2-4 can consume either without knowing which.
// Groups with fewer than CSV_MIN_ROWS rows are dropped (not silently -- the
// caller surfaces `warnings` to the user) since a variance estimate from a
// handful of rows isn't reliable enough to act on.
export function buildCustomDataset(rows, hasGroup) {
  const overallStats = statsFromPairs(
    rows.map((r) => r.human),
    rows.map((r) => r.sim)
  );
  const overall = toDomainShape("overall", "All your data", overallStats);

  let domains = [];
  const warnings = [];

  if (hasGroup) {
    const groupNames = [...new Set(rows.map((r) => r.group))];
    for (const g of groupNames) {
      const groupRows = rows.filter((r) => r.group === g);
      if (groupRows.length < CSV_MIN_ROWS) {
        warnings.push(`Group "${g}" has only ${groupRows.length} row(s) (need ${CSV_MIN_ROWS}+) -- excluded.`);
        continue;
      }
      const stats = statsFromPairs(
        groupRows.map((r) => r.human),
        groupRows.map((r) => r.sim)
      );
      domains.push(toDomainShape(g, g, stats));
    }
  }

  if (domains.length === 0) {
    domains = [{ ...overall, id: "overall", label: "All your data" }];
  }

  return { overall, domains, warnings };
}
