// Parsing and validation for the "try your own data" panel (Layer 2 of the
// demo). Deliberately dependency-free: mean/variance/correlation are all
// closed-form (see ppi.js), so no CSV or stats library is needed.

const MIN_ROWS = 30;

// Parses a two- (or three-) column CSV: human,simulated[,group]. Returns
// either { rows, hasGroup } or { error } -- never both, so callers can just
// check `.error`.
export function parseCsv(text) {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return { error: "Paste a header row (human,simulated) plus at least one data row." };
  }

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const humanIdx = header.indexOf("human");
  const simIdx = header.indexOf("simulated");
  const groupIdx = header.indexOf("group");

  if (humanIdx === -1 || simIdx === -1) {
    return { error: 'The header row must include "human" and "simulated" columns (optionally "group").' };
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const lineNo = i + 1;
    if (cols.length !== header.length) {
      return { error: `Row ${lineNo} has ${cols.length} column(s), expected ${header.length}.` };
    }
    const humanRaw = cols[humanIdx];
    const simRaw = cols[simIdx];
    const human = Number(humanRaw);
    const sim = Number(simRaw);
    if (humanRaw === "" || Number.isNaN(human)) {
      return { error: `Row ${lineNo}: "${humanRaw}" in the human column isn't a number.` };
    }
    if (simRaw === "" || Number.isNaN(sim)) {
      return { error: `Row ${lineNo}: "${simRaw}" in the simulated column isn't a number.` };
    }
    rows.push({ human, sim, group: groupIdx !== -1 ? cols[groupIdx] : null });
  }

  if (rows.length < MIN_ROWS) {
    return { error: `Only ${rows.length} data row(s) found; at least ${MIN_ROWS} are needed for a reliable estimate.` };
  }

  return { rows, hasGroup: groupIdx !== -1 };
}

export const CSV_MIN_ROWS = MIN_ROWS;
