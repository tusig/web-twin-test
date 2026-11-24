import {html} from "../../_npm/htl@1.0.0/11521f02.js";

// Inline maths from LaTeX captions ($w_ij$, $i \neq j$): italic, real subscripts, a few symbols.
const SYMBOLS = {neq: "≠", to: "→", leftrightarrow: "↔", times: "×", sigma: "σ", alpha: "α", pi: "π", theta: "θ", ldots: "…", dots: "…"};
function mathLite(tex) {
  const s = tex.replace(/\\([a-zA-Z]+)\s*/g, (m, name) => SYMBOLS[name] ?? name);
  const parts = [];
  let last = 0;
  for (const m of s.matchAll(/_(\w+)/g)) {
    parts.push(s.slice(last, m.index), html`<sub>${m[1]}</sub>`);
    last = m.index + m[0].length;
  }
  parts.push(s.slice(last));
  return html`<i class="math">${parts}</i>`;
}
export function richCaption(text) {
  return text.split(/\$([^$]+)\$/).map((part, n) => (n % 2 ? mathLite(part) : part));
}

// Header shared by every twin: same number and caption as the print, plus page and data link.
export function twinHead(meta, {csv, label: dataLabel} = {}) {
  if (!meta) return html`<p class="twin-missing">Not in the current PDF build.</p>`;
  const kind = meta.type === "figure" ? "Figure" : "Table";
  const label = dataLabel ?? (csv && /\.tsv/.test(csv) ? "TSV" : "CSV");
  return html`<header class="twin-head">
    <span class="twin-num">${kind} ${meta.number}</span>
    <p class="twin-caption">${richCaption(meta.caption)}.</p>
    <span class="twin-meta">Printed on page ${meta.page}${csv ? html` · <a href=${csv} download>Download data (${label})</a>` : ""}</span>
  </header>`;
}
