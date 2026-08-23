import "./MathBlock.css";

// Collapsible "show the math" block so the formulas are available to check
// without being in the way of the plain-language narrative.
export default function MathBlock({ title = "Show the math", children }) {
  return (
    <details className="math-block">
      <summary>{title}</summary>
      <div className="math-block-body">{children}</div>
    </details>
  );
}
