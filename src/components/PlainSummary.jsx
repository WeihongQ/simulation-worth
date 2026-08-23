import "./PlainSummary.css";

// A one-or-two-sentence, jargon-free summary of what this tab is doing and
// why -- meant to stand alone even for a reader skimming just this box.
export default function PlainSummary({ children }) {
  return (
    <div className="plain-summary">
      <span className="plain-summary-label">This step</span>
      <p>{children}</p>
    </div>
  );
}
