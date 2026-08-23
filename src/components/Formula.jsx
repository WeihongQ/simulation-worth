import katex from "katex";
import "katex/dist/katex.min.css";

// Renders one line of LaTeX as proper math typesetting (fractions,
// subscripts, Greek letters) via KaTeX, instead of a plain-text formula.
export default function Formula({ tex, display = true }) {
  const html = katex.renderToString(tex, {
    throwOnError: false,
    displayMode: display,
  });
  return <div className="formula" dangerouslySetInnerHTML={{ __html: html }} />;
}
