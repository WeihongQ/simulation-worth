import DomainScatterChart from "./DomainScatterChart.jsx";
import PlainSummary from "./PlainSummary.jsx";
import "./Section1Comparison.css";

export default function Section1Comparison({ domains }) {
  return (
    <section>
      <h2>How far off are the AI's answers?</h2>
      <PlainSummary>
        We asked 2,058 real people a bunch of survey questions. We also had an
        AI pretend to be each of those same people and guess how they'd
        answer. Below, each dot is one survey question: its left/right
        position is the real answer, its up/down position is the AI's guess.
        A dot sitting on the dashed line means the AI matched humans exactly;
        the farther a dot drifts from that line, the bigger the AI's miss.
      </PlainSummary>

      <div className="domain-grid">
        {domains.map((domain) => (
          <DomainScatterChart key={domain.id} domain={domain} />
        ))}
      </div>

      <p className="section-note">
        Most dots hug the line &mdash; but not equally closely everywhere,
        and a few stray far from it. That spread is the whole story; the
        &ldquo;What it's worth&rdquo; tab turns it into a number.
      </p>
    </section>
  );
}
