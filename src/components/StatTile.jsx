import "./StatTile.css";

export default function StatTile({ label, value, sub }) {
  return (
    <div className="stat-tile">
      <span className="stat-tile-label">{label}</span>
      <span className="stat-tile-value">{value}</span>
      {sub && <span className="stat-tile-sub">{sub}</span>}
    </div>
  );
}
