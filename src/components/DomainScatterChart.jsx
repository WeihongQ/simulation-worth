import { ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { formatDomainValue, isRatioDomain } from "../lib/format.js";

function percentile(sortedValues, p) {
  const idx = (sortedValues.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedValues[lo];
  return sortedValues[lo] + (sortedValues[hi] - sortedValues[lo]) * (idx - lo);
}

function ScatterTooltip({ active, payload, domainId }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (d.isDiagonal) return null;
  return (
    <div className="chart-tooltip">
      <strong>One respondent</strong>
      <span>Real: {formatDomainValue(domainId, d.human)}</span>
      <span>AI: {formatDomainValue(domainId, d.sim)}</span>
    </div>
  );
}

export default function DomainScatterChart({ domain }) {
  const ratio = isRatioDomain(domain.id);
  const humanVals = domain.respondent_human;
  const simVals = domain.respondent_sim;
  // A robust (percentile-based) axis range instead of raw min/max: a
  // handful of wild outliers (e.g. someone typing "999" African countries)
  // would otherwise stretch the axis so far that every normal point
  // collapses into one corner. The few points outside [p2, p98] still
  // exist in the data -- they just render off the visible axis, same as
  // any zoomed chart.
  const sortedValues = [...humanVals, ...simVals].sort((a, b) => a - b);
  const p2 = percentile(sortedValues, 0.02);
  const p98 = percentile(sortedValues, 0.98);
  const pad = (p98 - p2) * 0.08 || Math.max(Math.abs(p98) * 0.1, 0.05);
  const lo = p2 - pad;
  const hi = p98 + pad;

  const points = humanVals.map((h, i) => ({ human: h, sim: simVals[i] }));
  const diagonal = [
    { human: lo, sim: lo, isDiagonal: true },
    { human: hi, sim: hi, isDiagonal: true },
  ];
  const clippedCount = points.filter((p) => p.human < lo || p.human > hi || p.sim < lo || p.sim > hi).length;

  return (
    <div className="domain-panel">
      <div className="domain-panel-text">
        <h3>{domain.label}</h3>
        <p className="domain-panel-description">{domain.description}</p>
        <p className="domain-panel-caption">
          {domain.n_respondents.toLocaleString()} respondents &middot; correlation{" "}
          {domain.corr.toFixed(2)}
          {ratio && <> &middot; axes are ratio to human average, not a share</>}
          {clippedCount > 0 && (
            <>
              {" "}
              &middot; {clippedCount} extreme outlier{clippedCount === 1 ? "" : "s"} zoomed
              out of view
            </>
          )}
        </p>
      </div>
      <div className="domain-panel-chart">
        <ResponsiveContainer width={216} height={216}>
          <ComposedChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <XAxis
              type="number"
              dataKey="human"
              domain={[lo, hi]}
              allowDataOverflow
              tick={{ fill: "var(--text-muted)", fontSize: 10 }}
              tickFormatter={(v) => formatDomainValue(domain.id, v)}
              label={{ value: "Real people", position: "bottom", fill: "var(--text-muted)", fontSize: 11, dy: 4 }}
            />
            <YAxis
              type="number"
              dataKey="sim"
              domain={[lo, hi]}
              allowDataOverflow
              tick={{ fill: "var(--text-muted)", fontSize: 10 }}
              tickFormatter={(v) => formatDomainValue(domain.id, v)}
              width={38}
              label={{ value: "AI", angle: -90, position: "left", fill: "var(--text-muted)", fontSize: 11, dx: 6 }}
            />
            <Tooltip content={<ScatterTooltip domainId={domain.id} />} cursor={{ strokeDasharray: "3 3" }} />
            <Line
              data={diagonal}
              dataKey="sim"
              stroke="var(--text-muted)"
              strokeDasharray="4 3"
              strokeWidth={1.25}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              legendType="none"
            />
            <ZAxis type="number" range={[10, 10]} />
            <Scatter
              data={points}
              dataKey="sim"
              fill="var(--sim)"
              fillOpacity={0.18}
              isAnimationActive={false}
              shape="circle"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
