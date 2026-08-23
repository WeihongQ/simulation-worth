import { describe, expect, it } from "vitest";
import { buildCustomDataset } from "./customDataset.js";

const rows30 = Array.from({ length: 30 }, (_, i) => ({ human: i % 5, sim: (i % 5) + 0.2, group: null }));

describe("buildCustomDataset", () => {
  it("builds a single 'overall' domain when there's no group column", () => {
    const { overall, domains, warnings } = buildCustomDataset(rows30, false);
    expect(domains).toHaveLength(1);
    expect(domains[0].n_respondents).toBe(30);
    expect(overall.n_respondents).toBe(30);
    expect(warnings).toHaveLength(0);
  });

  it("splits into one domain per group when large enough", () => {
    const rows = [
      ...rows30.map((r) => ({ ...r, group: "a" })),
      ...rows30.map((r) => ({ ...r, group: "b" })),
    ];
    const { domains, warnings } = buildCustomDataset(rows, true);
    expect(domains.map((d) => d.id).sort()).toEqual(["a", "b"]);
    expect(warnings).toHaveLength(0);
  });

  it("drops undersized groups with a warning instead of crashing", () => {
    const rows = [
      ...rows30.map((r) => ({ ...r, group: "big" })),
      { human: 1, sim: 1, group: "tiny" },
    ];
    const { domains, warnings } = buildCustomDataset(rows, true);
    expect(domains.map((d) => d.id)).toEqual(["big"]);
    expect(warnings[0]).toMatch(/tiny/);
  });
});
