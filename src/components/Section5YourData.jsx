import { useRef, useState } from "react";
import { parseCsv } from "../lib/csv.js";
import { buildCustomDataset } from "../lib/customDataset.js";
import PlainSummary from "./PlainSummary.jsx";
import "./Section5YourData.css";

// A synthetic 35-row example so a first-time user can see the tool work
// before pasting their own data. Clearly not real survey data.
const EXAMPLE_CSV = `human,simulated
4,3
5,4
3,3
4,4
5,3
2,3
4,4
5,4
3,2
4,3
2,2
5,5
4,3
3,4
5,4
2,3
4,4
5,3
3,3
4,3
1,2
2,3
5,4
4,3
3,2
4,4
2,2
5,5
3,3
4,4
1,3
2,2
5,4
4,3
3,3`;

export default function Section5YourData({ onApply, onReset, isActive }) {
  const [text, setText] = useState("");
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [applied, setApplied] = useState(null); // { rowCount, groupCount }
  const fileInputRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setWarnings([]);
    const parsed = parseCsv(text);
    if (parsed.error) {
      setError(parsed.error);
      setApplied(null);
      return;
    }
    const dataset = buildCustomDataset(parsed.rows, parsed.hasGroup);
    setWarnings(dataset.warnings);
    setApplied({ rowCount: parsed.rows.length, groupCount: dataset.domains.length });
    onApply(dataset);
  }

  function handleReset() {
    setText("");
    setError(null);
    setWarnings([]);
    setApplied(null);
    onReset();
  }

  return (
    <section>
      <h2>Try it with your own data</h2>
      <PlainSummary>
        Don't want to take our word for it? Paste in your own pairs of real
        vs. simulated answers &mdash; a CSV with a <code>human</code> column
        and a <code>simulated</code> column, one row per respondent &mdash;
        and the &ldquo;What it's worth,&rdquo; &ldquo;Where it fails,&rdquo;
        and &ldquo;Your budget&rdquo; tabs recalculate using your numbers
        instead of ours.
      </PlainSummary>

      {isActive && (
        <p className="data-banner">
          Those three tabs are currently showing <strong>your</strong> data.
          <button type="button" onClick={handleReset}>
            Switch back to the demo dataset
          </button>
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <label className="csv-label">
          <span>
            CSV text &mdash; header row <code>human,simulated</code>, optionally
            with a third <code>group</code> column; at least 30 rows.
          </span>
          <textarea
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"human,simulated\n4,3\n5,4\n..."}
          />
        </label>

        <div className="csv-controls">
          <button type="button" className="secondary" onClick={() => fileInputRef.current?.click()}>
            Upload a .csv file
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFile} hidden />
          <button type="button" className="secondary" onClick={() => setText(EXAMPLE_CSV)}>
            Load a synthetic example
          </button>
          <button type="submit">Recalculate with this data</button>
        </div>
      </form>

      {error && <p className="data-error">{error}</p>}

      {warnings.length > 0 && (
        <ul className="data-warnings">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      {applied && !error && (
        <p className="data-success">
          Loaded {applied.rowCount.toLocaleString()} rows
          {applied.groupCount > 1 ? ` across ${applied.groupCount} groups` : ""}. Check
          the other tabs &mdash; they're now using this data.
        </p>
      )}
    </section>
  );
}
