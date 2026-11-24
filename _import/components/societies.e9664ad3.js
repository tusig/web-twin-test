import {html, svg} from "../../_npm/htl@1.0.0/11521f02.js";

// Interactive twin of Figure "fig-societies": the two relationship graphs.
// Pick a society and an agent to see its relationships and the reward they define.

const SOCIETIES = {
  "All repelling": {A: {B: -1, C: -1}, B: {A: -1, C: -1}, C: {A: -1, B: -1}},
  "Circular":      {A: {C: +1, B: -1}, C: {B: +1, A: -1}, B: {A: +1, C: -1}},
};
const R = 92, NODE = 21, CX = 150, CY = 128;
const POS = {
  A: [CX, CY - R],
  B: [CX + R * Math.cos(Math.PI * 7 / 6), CY - R * Math.sin(Math.PI * 7 / 6)],
  C: [CX + R * Math.cos(-Math.PI / 6), CY - R * Math.sin(-Math.PI / 6)],
};

// Curved edge from i to j, bending to the left of the direction of travel (as TikZ's bend left).
function edge(i, j, w, on) {
  const [x1, y1] = POS[i], [x2, y2] = POS[j];
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
  const nx = dy / len, ny = -dx / len, bend = 0.2 * len;
  const qx = (x1 + x2) / 2 + nx * bend, qy = (y1 + y2) / 2 + ny * bend;
  const trim = (x, y, tx, ty) => { const l = Math.hypot(tx - x, ty - y); return [x + (tx - x) * NODE / l, y + (ty - y) * (NODE + 0) / l]; };
  const [sx, sy] = trim(x1, y1, qx, qy), [ex, ey] = trim(x2, y2, qx, qy);
  const lx = 0.25 * x1 + 0.5 * qx + 0.25 * x2, ly = 0.25 * y1 + 0.5 * qy + 0.25 * y2;
  const cls = `soc-edge ${w > 0 ? "plus" : "minus"} ${on ? "on" : ""}`;
  return svg`<g class=${cls}>
    <path d=${`M${sx},${sy} Q${qx},${qy} ${ex},${ey}`} marker-end=${`url(#soc-${w > 0 ? "plus" : "minus"})`} />
    <circle cx=${lx} cy=${ly} r="8" class="soc-lab-bg"/>
    <text x=${lx} y=${ly + 4}>${w > 0 ? "+" : "−"}</text></g>`;
}

const sub = (s) => html`<sub>${s}</sub>`;
const lp = (j, i) => html`log π${sub(j)}(y${sub(i)} | x)`;

function explain(name, i) {
  const rel = SOCIETIES[name][i];
  const att = Object.keys(rel).filter((j) => rel[j] > 0), rep = Object.keys(rel).filter((j) => rel[j] < 0);
  const words = [
    att.length ? `attracted to ${att.join(" and ")}` : null,
    rep.length ? `repelled by ${rep.join(" and ")}` : null,
  ].filter(Boolean).join(" and ");
  const terms = Object.keys(rel).sort((a, b) => rel[b] - rel[a]);
  const formula = html`R${sub(i)}(y${sub(i)}) = ½ [ ${terms.map((j, n) =>
    html`${n === 0 ? (rel[j] > 0 ? "" : "− ") : (rel[j] > 0 ? " + " : " − ")}${lp(j, i)}`)} ]`;
  const note = att.length === 1 && rep.length === 1
    ? `One attraction and one repulsion. The reward is a log-likelihood ratio between ${att[0]} and ${rep[0]}, and ${i}'s own entropy cancels in its expectation. ${i} is rewarded for messages that ${att[0]} finds more likely than ${rep[0]} does.`
    : `Two repulsions. In expectation, both reward ${i}'s own entropy and its divergence from each peer, so nothing in the reward holds ${i} back from text that no model expects.`;
  return html`<p class="soc-words"><strong>Agent ${i}</strong> is ${words}.</p>
    <p class="soc-formula">${formula}</p><p class="soc-note">${note}</p>`;
}

export function societiesFigure() {
  let society = "Circular", agent = "A";
  const diagram = html`<div class="soc-svg-wrap"></div>`;
  const info = html`<div class="soc-info"></div>`;
  const tabs = html`<div class="soc-tabs">${Object.keys(SOCIETIES).map((name) => {
    const b = html`<button>${name}</button>`;
    b.onclick = () => { society = name; render(); };
    return b;
  })}</div>`;

  function render() {
    for (const b of tabs.children) b.classList.toggle("on", b.textContent === society);
    const rel = SOCIETIES[society];
    const edges = Object.entries(rel).flatMap(([i, peers]) => Object.entries(peers).map(([j, w]) => edge(i, j, w, i === agent)));
    const nodes = Object.entries(POS).map(([i, [x, y]]) => {
      const g = svg`<g class=${`soc-node ${i === agent ? "on" : ""}`} tabindex="0" role="button" aria-label=${`Agent ${i}`}>
        <circle cx=${x} cy=${y} r=${NODE} /><text x=${x} y=${y + 6}>${i}</text></g>`;
      g.onclick = () => { agent = i; render(); };
      g.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { agent = i; render(); } };
      return g;
    });
    diagram.replaceChildren(svg`<svg viewBox="0 0 300 250" class="soc-svg" role="img" aria-label=${`${society} society`}>
      <defs>
        <marker id="soc-plus" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="plus-head"/></marker>
        <marker id="soc-minus" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="minus-head"/></marker>
      </defs>${edges}${nodes}</svg>`);
    info.replaceChildren(explain(society, agent));
  }
  render();
  return html`<div class="soc">${tabs}<div class="soc-body">${diagram}${info}</div>
    <p class="soc-hint">Click an agent to show its relationships. Solid green arrows attract, dashed red arrows repel.</p></div>`;
}
