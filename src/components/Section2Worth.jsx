import { ciHalfWidth, classicalVariance, effectiveSampleSize, ppiVariance } from "../lib/ppi.js";
import { ILLUSTRATIVE_N } from "../lib/constants.js";
import PlainSummary from "./PlainSummary.jsx";
import HeroStat from "./HeroStat.jsx";
import MathBlock from "./MathBlock.jsx";
import Formula from "./Formula.jsx";
import CustomDataNotice from "./CustomDataNotice.jsx";

export default function Section2Worth({ overall, usingCustomData }) {
  const n = overall.n_respondents;
  const N = ILLUSTRATIVE_N;
  const varPPI = ppiVariance({ varSim: overall.var_sim, varDiff: overall.var_diff, N, n });
  const varClassical = classicalVariance({ varHuman: overall.var_human, n });
  const nEff = effectiveSampleSize({ varHuman: overall.var_human, varSim: overall.var_sim, varDiff: overall.var_diff, N, n });
  const ciPPI = ciHalfWidth(varPPI);
  const ciClassical = ciHalfWidth(varClassical);

  const nEffRounded = Math.round(nEff).toLocaleString();

  return (
    <section>
      <h2>So what is the simulation worth?</h2>
      <PlainSummary>
        Since the AI isn't perfectly accurate, its guesses are worth less
        than a real person's answer &mdash; but they're not worthless either.
        This step turns "the AI is somewhat off" into a concrete number: how
        many real interviews would give you the same quality of answer.
      </PlainSummary>
      <CustomDataNotice show={usingCustomData} />

      <HeroStat
        caption={`Based on the ${n.toLocaleString()} real interviews and the AI's accuracy measured in this dataset.`}
      >
        Simulating {N.toLocaleString()} respondents &asymp; interviewing{" "}
        <strong>{nEffRounded} real people</strong>
      </HeroStat>

      <p>
        That number is the &ldquo;effective sample size&rdquo;: the number of
        real interviews that would give you a result exactly as precise as
        combining {n.toLocaleString()} real interviews with {N.toLocaleString()}{" "}
        AI-simulated ones. Simulating {N.toLocaleString()} people is cheap;
        interviewing {nEffRounded} of them for real would not be. That gap is
        the value of the method &mdash; not because the AI is right, but
        because a small real sample is enough to measure and correct for
        how it's wrong.
      </p>

      <p className="section-note">
        Combining real and simulated data this way gives a 95% interval of
        &plusmn;{ciPPI.toFixed(4)}, versus &plusmn;{ciClassical.toFixed(4)} from
        the {n.toLocaleString()} real interviews alone &mdash; tighter, from
        the same real-world data collection effort.
      </p>

      <MathBlock>
        <p>
          The PPI estimate combines the simulated mean with a correction term
          measured from the real, labeled sample:
        </p>
        <Formula tex="\hat\theta_{\text{PPI}} = \bar f_N \;+\; \overline{(Y-f)}_n" />
        <Formula tex="\operatorname{Var}(\hat\theta_{\text{PPI}}) = \dfrac{\sigma_f^2}{N} + \dfrac{\sigma_\Delta^2}{n}" />
        <p>
          With <code>n</code> = {n.toLocaleString()} real respondents and{" "}
          <code>N</code> = {N.toLocaleString()} simulated ones, and this
          dataset's measured variances:
        </p>
        <Formula
          tex={String.raw`\operatorname{Var}(\hat\theta_{\text{PPI}}) = \dfrac{${overall.var_sim.toFixed(6)}}{${N.toLocaleString()}} + \dfrac{${overall.var_diff.toFixed(6)}}{${n.toLocaleString()}} = ${varPPI.toFixed(8)}`}
        />
        <p>Effective sample size is the real-only sample size that would match that variance:</p>
        <Formula tex="n_{\text{eff}} = \dfrac{\sigma_Y^2}{\operatorname{Var}(\hat\theta_{\text{PPI}})}" />
        <Formula
          tex={String.raw`n_{\text{eff}} = \dfrac{${overall.var_human.toFixed(6)}}{${varPPI.toFixed(8)}} \approx ${Math.round(nEff).toLocaleString()}`}
        />
      </MathBlock>
    </section>
  );
}
