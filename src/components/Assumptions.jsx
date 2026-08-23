export default function Assumptions() {
  return (
    <section className="assumptions">
      <h2>Assumptions and limits</h2>
      <ul>
        <li>
          This treats the human sample as a valid gold standard. If the humans
          were themselves biased or unrepresentative, PPI corrects toward
          them, not toward some deeper truth.
        </li>
        <li>
          It assumes the calibration sample (the humans you compare the
          simulation against) is drawn from the same population as the people
          you actually care about. If your target population differs, the
          correction can fail silently.
        </li>
        <li>
          The correlation figures shown here are plain Pearson correlation
          between human and simulated scores &mdash; not the "PPI correlation"
          defined in Broska, Howes &amp; van Loon (2025). That definition
          wasn't accessible while building this demo.
        </li>
        <li>
          Effective sample size and the budget calculator assume the bias and
          variance of the simulation measured here will hold for new,
          not-yet-collected respondents from the same population &mdash; not
          guaranteed for a different LLM, prompt, or population.
        </li>
      </ul>
    </section>
  );
}
