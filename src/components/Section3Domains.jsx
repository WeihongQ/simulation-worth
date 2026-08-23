import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { effectiveSampleSize } from "../lib/ppi.js";
import { ILLUSTRATIVE_N } from "../lib/constants.js";
import PlainSummary from "./PlainSummary.jsx";
import CustomDataNotice from "./CustomDataNotice.jsx";
import "./Section3Domains.css";

function DomainTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <strong>{d.label}</strong>
      <span>{Math.round(d.nEff).toLocaleString()} effective real respondents</span>
      <span className="chart-tooltip-muted">
        correlation {d.corr.toFixed(2)} &middot; {d.n_items} item{d.n_items === 1 ? "" : "s"}
      </span>
    </div>
  );
}

export default function Section3Domains({ domains, usingCustomData }) {
  const rows = domains
    .map((d) => ({
      id: d.id,
      label: d.label,
      corr: d.corr,
      n_items: d.n_items,
      nEff: effectiveSampleSize({
        varHuman: d.var_human,
        varSim: d.var_sim,
        varDiff: d.var_diff,
        N: ILLUSTRATIVE_N,
        n: d.n_respondents,
      }),
    }))
    .sort((a, b) => b.nEff - a.nEff);

  const worst = rows[rows.length - 1];
  const best = rows[0];

  return (
    <section>
      <h2>Where can't we trust it?</h2>
      <PlainSummary>
        The AI isn't equally good at everything. It might nail &ldquo;would
        you buy this snack&rdquo; but do a much worse job guessing how
        someone reacts to a weird probability puzzle. This step breaks the
        one big number from the &ldquo;What it's worth&rdquo; tab into six
        smaller ones, so you can see which topics to trust and which ones to
        double-check with real people.
      </PlainSummary>
      <CustomDataNotice show={usingCustomData} />

      <ResponsiveContainer width="100%" height={rows.length * 56 + 20}>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 4, right: 56, left: 8, bottom: 4 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            width={190}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--text-muted)", fontSize: 12.5 }}
          />
          <Tooltip content={<DomainTooltip />} cursor={{ fill: "var(--accent-bg)" }} />
          <Bar dataKey="nEff" radius={[0, 4, 4, 0]} maxBarSize={26} isAnimationActive={false}>
            {rows.map((r) => (
              <Cell key={r.id} fill={r.id === worst.id ? "var(--accent)" : "var(--text-muted)"} fillOpacity={r.id === worst.id ? 1 : 0.55} />
            ))}
            <LabelList
              dataKey="nEff"
              position="right"
              formatter={(v) => Math.round(v).toLocaleString()}
              style={{ fill: "var(--text)", fontSize: 12.5, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="section-note">
        Every bar shows how many real people that many AI-simulated responses
        are worth, in that topic alone.{" "}
        {rows.length > 1 ? (
          <>
            <strong>{worst.label}</strong> is the one to watch: at a
            correlation of just {worst.corr.toFixed(2)} between real and
            simulated answers, {ILLUSTRATIVE_N.toLocaleString()} simulated
            respondents there are only worth about{" "}
            {Math.round(worst.nEff).toLocaleString()} real ones &mdash;
            roughly {Math.round(best.nEff / worst.nEff)}&times; less than{" "}
            {best.label.toLowerCase()}, the topic the AI handles best. A
            single overall &ldquo;accuracy&rdquo; number would have hidden
            that gap entirely.
          </>
        ) : (
          <>
            At a correlation of {worst.corr.toFixed(2)} between real and
            simulated answers, {ILLUSTRATIVE_N.toLocaleString()} simulated
            respondents here are worth about{" "}
            {Math.round(worst.nEff).toLocaleString()} real ones. Add a{" "}
            <code>group</code> column to your CSV to break this down by
            topic instead of one combined number.
          </>
        )}
      </p>
    </section>
  );
}
