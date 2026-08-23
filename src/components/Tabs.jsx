import "./Tabs.css";

export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs">
      <div className="tabs-nav" role="tablist">
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={active === tab.id}
            className={"tabs-nav-item" + (active === tab.id ? " active" : "")}
            onClick={() => onChange(tab.id)}
          >
            <span className="tabs-nav-index">{i + 1}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="tabs-panel" role="tabpanel">
        {tabs.find((t) => t.id === active)?.content}
      </div>
    </div>
  );
}
