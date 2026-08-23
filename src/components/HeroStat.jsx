import "./HeroStat.css";

// The one big number a view leads with. Sans-serif per the mark spec (a
// serif face here would read as decoration, not data).
export default function HeroStat({ children, caption }) {
  return (
    <div className="hero-stat">
      <div className="hero-stat-value">{children}</div>
      {caption && <p className="hero-stat-caption">{caption}</p>}
    </div>
  );
}
