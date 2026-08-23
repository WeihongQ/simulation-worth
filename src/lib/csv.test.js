import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv.js";

function csvOf(rows, { withGroup = false } = {}) {
  const header = withGroup ? "human,simulated,group" : "human,simulated";
  const body = rows
    .map((r) => (withGroup ? `${r.human},${r.sim},${r.group}` : `${r.human},${r.sim}`))
    .join("\n");
  return `${header}\n${body}`;
}

const thirtyRows = Array.from({ length: 30 }, (_, i) => ({ human: i, sim: i + 0.5 }));

describe("parseCsv", () => {
  it("parses a valid two-column CSV", () => {
    const result = parseCsv(csvOf(thirtyRows));
    expect(result.error).toBeUndefined();
    expect(result.rows).toHaveLength(30);
    expect(result.hasGroup).toBe(false);
    expect(result.rows[0]).toEqual({ human: 0, sim: 0.5, group: null });
  });

  it("parses an optional group column", () => {
    const rows = thirtyRows.map((r, i) => ({ ...r, group: i % 2 === 0 ? "a" : "b" }));
    const result = parseCsv(csvOf(rows, { withGroup: true }));
    expect(result.error).toBeUndefined();
    expect(result.hasGroup).toBe(true);
    expect(result.rows[0].group).toBe("a");
  });

  it("rejects a missing header column", () => {
    const result = parseCsv("foo,bar\n1,2");
    expect(result.error).toMatch(/human.*simulated/i);
  });

  it("rejects a non-numeric value with the row number", () => {
    const bad = [...thirtyRows];
    bad[5] = { human: "oops", sim: 1 };
    const result = parseCsv(csvOf(bad));
    expect(result.error).toMatch(/Row 7/);
    expect(result.error).toMatch(/oops/);
  });

  it("rejects a row with the wrong number of columns", () => {
    const text = "human,simulated\n" + thirtyRows.map((r) => `${r.human},${r.sim}`).join("\n") + "\n1,2,3";
    const result = parseCsv(text);
    expect(result.error).toMatch(/column/i);
  });

  it("rejects fewer than 30 rows", () => {
    const result = parseCsv(csvOf(thirtyRows.slice(0, 10)));
    expect(result.error).toMatch(/30/);
  });
});
