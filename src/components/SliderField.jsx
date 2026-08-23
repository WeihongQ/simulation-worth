import "./SliderField.css";

export default function SliderField({ label, value, min, max, step, onChange, prefix = "", suffix = "" }) {
  return (
    <label className="slider-field">
      <span className="slider-field-label">{label}</span>
      <div className="slider-field-row">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="slider-field-number">
          {prefix}
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          {suffix}
        </span>
      </div>
    </label>
  );
}
