import { useEffect, useMemo, useState } from "react";
import {
  allocateByBudget,
  allocateByTargetVariance,
  ciHalfWidth,
  costOfClassicalEquivalent,
  costSaved,
  ppiVariance,
  totalCost,
  zScore,
} from "../lib/ppi.js";
import PlainSummary from "./PlainSummary.jsx";
import SliderField from "./SliderField.jsx";
import StatTile from "./StatTile.jsx";
import MathBlock from "./MathBlock.jsx";
import Formula from "./Formula.jsx";
import CustomDataNotice from "./CustomDataNotice.jsx";
import "./StatTile.css";
import "./Section4Budget.css";

const fmt0 = (v) => Math.round(v).toLocaleString();
const fmtMoney = (v) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
// Per-unit costs can be well under $1 (e.g. $0.05 per simulated respondent);
// fmtMoney's whole-dollar rounding would silently show those as "$0".
const fmtUnitCost = (v) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Section4Budget({ domains, overall, usingCustomData }) {
  // Ungrouped custom data already comes back as a single domain with
  // id "overall" (see buildCustomDataset) -- don't prepend a duplicate.
  const hasOwnOverall = domains.some((d) => d.id === "overall");
  const options = useMemo(
    () => [
      ...(hasOwnOverall ? [] : [{ id: "overall", label: "All topics combined", stats: overall }]),
      ...domains.map((d) => ({ id: d.id, label: d.label, stats: d })),
    ],
    [domains, overall, hasOwnOverall]
  );

  const [domainId, setDomainId] = useState("overall");
  const [mode, setMode] = useState("budget");
  const [costHuman, setCostHuman] = useState(15);
  const [costSim, setCostSim] = useState(0.05);
  const [budget, setBudget] = useState(5000);
  const [targetCi, setTargetCi] = useState(0.02);

  // Switching between the demo dataset and uploaded data changes which
  // domain ids exist; fall back to "overall" rather than crash on a
  // now-missing selection.
  useEffect(() => {
    if (!options.some((o) => o.id === domainId)) setDomainId("overall");
  }, [options, domainId]);

  const selected = options.find((o) => o.id === domainId) ?? options[0];
  const stats = selected.stats;
  const { var_human: varHuman, var_sim: varSim, var_diff: varDiff } = stats;

  const safeCostHuman = Math.max(costHuman, 0.01);
  const safeCostSim = Math.max(costSim, 0.001);

  let n, N;
  if (mode === "budget") {
    ({ n, N } = allocateByBudget({ varDiff, varSim, costHuman: safeCostHuman, costSim: safeCostSim, budget: Math.max(budget, 1) }));
  } else {
    const targetVariance = (Math.max(targetCi, 0.0001) / zScore(0.95)) ** 2;
    ({ n, N } = allocateByTargetVariance({ varDiff, varSim, costHuman: safeCostHuman, costSim: safeCostSim, targetVariance }));
  }

  const achievedVariance = ppiVariance({ varSim, varDiff, N, n });
  const achievedCi = ciHalfWidth(achievedVariance);
  const actualCost = totalCost({ n, N, costHuman: safeCostHuman, costSim: safeCostSim });
  const classicalEquivCost = costOfClassicalEquivalent({ costHuman: safeCostHuman, varHuman, variance: achievedVariance });
  const savedVsClassical = costSaved({ costHuman: safeCostHuman, varHuman, variance: achievedVariance, actualCost });

  return (
    <section>
      <h2>Given my budget, how many real people should I recruit?</h2>
      <PlainSummary>
        Say you have a fixed amount of money to spend, and you can split it
        between paying real people and running more AI simulations. This
        calculator tells you the mix that gets you the most accurate answer
        for your money &mdash; and how much cheaper that is than using real
        people alone.
      </PlainSummary>
      <CustomDataNotice show={usingCustomData} />

      <label className="select-field">
        <span>Base this on</span>
        <select value={domainId} onChange={(e) => setDomainId(e.target.value)}>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <div className="mode-toggle" role="tablist">
        <button type="button" className={mode === "budget" ? "active" : ""} onClick={() => setMode("budget")}>
          I have a budget
        </button>
        <button type="button" className={mode === "precision" ? "active" : ""} onClick={() => setMode("precision")}>
          I have a target precision
        </button>
      </div>

      <SliderField
        label="Cost per real respondent"
        value={costHuman}
        min={1}
        max={100}
        step={1}
        prefix="$"
        onChange={setCostHuman}
      />
      <SliderField
        label="Cost per AI-simulated respondent"
        value={costSim}
        min={0.01}
        max={5}
        step={0.01}
        prefix="$"
        onChange={setCostSim}
      />

      {mode === "budget" ? (
        <SliderField label="Total budget" value={budget} min={100} max={100000} step={100} prefix="$" onChange={setBudget} />
      ) : (
        <SliderField
          label="Target precision (95% interval half-width)"
          value={targetCi}
          min={0.002}
          max={0.1}
          step={0.001}
          prefix="&plusmn;"
          onChange={setTargetCi}
        />
      )}

      <div className="stat-row">
        <StatTile label="Real people to recruit" value={fmt0(n)} sub="n" />
        <StatTile label="AI-simulated respondents" value={fmt0(N)} sub="N" />
        <StatTile label="Resulting 95% interval" value={`±${achievedCi.toFixed(4)}`} />
        <StatTile
          label="Cost saved vs. humans-only"
          value={savedVsClassical >= 0 ? fmtMoney(savedVsClassical) : `-${fmtMoney(Math.abs(savedVsClassical))}`}
          sub={`vs. ${fmtMoney(classicalEquivCost)} for the same precision`}
        />
      </div>

      {savedVsClassical < 0 && (
        <p className="budget-warning">
          For this topic, the simulation isn't good enough to help: reaching
          &plusmn;{achievedCi.toFixed(4)} this way costs{" "}
          {fmtMoney(Math.abs(savedVsClassical))} more than just surveying{" "}
          {fmt0(classicalEquivCost / safeCostHuman)} real people directly.
          When a topic's real-vs-simulated gap is this noisy, more AI
          simulation doesn't substitute for real respondents &mdash; see the
          &ldquo;Where it fails&rdquo; tab.
        </p>
      )}

      <p className="section-note">
        Spending {fmtMoney(actualCost)} split this way &mdash; {fmt0(n)} real
        interviews at {fmtUnitCost(safeCostHuman)} each, plus {fmt0(N)} AI
        simulations at {fmtUnitCost(safeCostSim)} each &mdash; gets you a 95%
        interval of &plusmn;{achievedCi.toFixed(4)}. Reaching that same
        precision with real interviews alone would cost about{" "}
        {fmtMoney(classicalEquivCost)}.
      </p>

      <MathBlock>
        <p>The cost-minimizing split between real and simulated respondents:</p>
        <Formula tex="\dfrac{n}{N} = \sqrt{\dfrac{\sigma_\Delta^2 \, c_{\text{sim}}}{\sigma_f^2 \, c_{\text{human}}}}" />
        <p>
          which for this topic and these costs gives <code>n</code> ={" "}
          {fmt0(n)} and <code>N</code> = {fmt0(N)}, so:
        </p>
        <Formula
          tex={String.raw`\operatorname{Var}(\hat\theta_{\text{PPI}}) = \dfrac{\sigma_f^2}{N} + \dfrac{\sigma_\Delta^2}{n} = ${achievedVariance.toFixed(8)}`}
        />
        <Formula tex={String.raw`\text{95\% interval} = 1.96\sqrt{\operatorname{Var}} = \pm${achievedCi.toFixed(4)}`} />
        <p>
          Cost of this design: {fmtMoney(actualCost)}. Cost of an equivalent
          humans-only design reaching the same variance:{" "}
          {fmtMoney(classicalEquivCost)}.
        </p>
      </MathBlock>
    </section>
  );
}
