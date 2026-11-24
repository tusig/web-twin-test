import * as Plot from "../../_npm/@observablehq/plot@0.6.19/2e9f152c.js";
import {html} from "../../_npm/htl@1.0.0/11521f02.js";

// Interactive twin of Figure "fig-timeseries": per-step metrics of a run as four small multiples,
// with a run switch, optional smoothing, a zoomable step range (drag on a panel, or from/to fields;
// double-click or "Full run" resets) and a step cursor shared by all panels.

const AGENTS = ["A", "B", "C"];
const dark = true;   // the site is always dark (see style.css)
export const AGENT_COLORS = dark
  ? {A: "#5aa9e6", B: "#e8a25a", C: "#66bb6a"}
  : {A: "#0064a6", B: "#d9822b", C: "#2e7d32"};   // same as agentA/B/C in the print preamble

const PANELS = [
  {title: html`Reward <i>R</i><sub>i</sub>`, field: "reward"},
  {title: html`log π<sub>base</sub>(<i>y</i><sub>i</sub>)`, field: "logp_base"},
  {title: html`Length <i>T</i><sub>i</sub>`, field: "tokens"},
  {title: html`Entropy`, field: "entropy"},
];

// Long format per panel: {step, key (colour), value}.
function panelData(panel, rows) {
  if (panel.field) return rows.filter((d) => d[panel.field] != null).map((d) => ({step: d.step, key: d.agent, value: d[panel.field]}));
  return rows.filter(panel.rows).flatMap((d) => panel.series
    .filter((s) => d[s.y] != null)
    .map((s) => ({step: d.step, key: s.key, value: d[s.y]})));
}

const fmt = (v, digits = 2) => v == null ? "–" : Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(digits);

export function timeSeries(steps, runs, state, {width}) {
  const cols = width >= 500 ? 2 : 1;
  const gap = 18, pw = Math.floor((width - gap * (cols - 1)) / cols);
  const root = html`<div class="ts"></div>`;

  function render() {
    const run = runs.find((r) => r.id === state.run) ?? runs[0];
    const rows = steps.filter((d) => String(d.run) === run.id);
    const maxStep = Math.max(...rows.map((d) => d.step));
    const clampStep = (v) => Math.max(0, Math.min(maxStep, Math.round(v)));
    const [lo, hi] = state.range ? state.range.map(clampStep) : [0, maxStep];
    const setRange = (a, b) => {
      const r = [clampStep(Math.min(a, b)), clampStep(Math.max(a, b))];
      state.range = r[1] - r[0] >= 5 && !(r[0] === 0 && r[1] === maxStep) ? r : null;
      render();
    };
    const visible = rows.filter((d) => d.step >= lo && d.step <= hi);
    const byStep = new Map();
    for (const d of rows) byStep.set(`${d.step}:${d.agent}`, d);

    const runButtons = html`<div class="ts-runs">${runs.map((r) => {
      const b = html`<button class=${r.id === run.id ? "on" : ""}>${r.label}${r.printed ? " · printed" : ""}</button>`;
      b.onclick = () => { state.run = r.id; state.step = null; state.range = null; render(); };
      return b;
    })}</div>`;
    const smooth = html`<label class="ts-smooth">Smoothing <select>${[1, 10, 25, 50].map((k) =>
      html`<option value=${k} selected=${k === state.smooth}>${k === 1 ? "none" : `${k} steps`}</option>`)}</select></label>`;
    smooth.querySelector("select").onchange = (e) => { state.smooth = +e.target.value; render(); };
    const from = html`<input type="number" min="0" max=${maxStep} step="1" value=${lo}>`;
    const to = html`<input type="number" min="0" max=${maxStep} step="1" value=${hi}>`;
    from.onchange = to.onchange = () => setRange(+from.value, +to.value);
    const full = html`<button disabled=${!state.range}>Full run</button>`;
    full.onclick = () => { state.range = null; render(); };
    const range = html`<div class="ts-range">Steps ${from} to ${to} ${full}</div>`;

    const cursors = [];
    const plots = PANELS.map((panel) => {
      const data = panelData(panel, visible);
      if (!data.length) return html`<div class="ts-panel" style=${`width:${pw}px`}><div class="ts-title">${panel.title}</div><div class="ts-empty">not logged in this run</div></div>`;
      const line = state.smooth > 1
        ? Plot.lineY(data, Plot.windowY({k: state.smooth, anchor: "middle"}, {x: "step", y: "value", stroke: "key", strokeWidth: 1.1}))
        : Plot.lineY(data, {x: "step", y: "value", stroke: "key", strokeWidth: 0.9});
      const plot = Plot.plot({
        width: pw, height: 200, marginLeft: 46, marginRight: 8, marginTop: 8, marginBottom: 24,
        style: {fontFamily: "var(--serif)", fontSize: "11px", background: "transparent"},
        x: {domain: [lo, hi], label: null, ticks: 5},
        y: {grid: true, label: null, nice: true},
        color: {domain: AGENTS, range: AGENTS.map((a) => AGENT_COLORS[a])},
        marks: [Plot.ruleY([0], {stroke: "currentColor", strokeOpacity: 0.25}), line],
      });
      const cursor = html`<div class="ts-cursor"></div>`;
      const sel = html`<div class="ts-sel"></div>`;
      cursors.push({cursor, plot});
      const area = html`<div class="ts-plotwrap">${plot}${cursor}${sel}</div>`;
      const wrap = html`<div class="ts-panel" style=${`width:${pw}px`}><div class="ts-title">${panel.title}</div>${area}</div>`;
      const stepAt = (e) => clampStep(plot.scale("x").invert(e.clientX - plot.getBoundingClientRect().left));
      let dragFrom = null;
      // Pointer anywhere on a panel sets the shared step; dragging selects a step range to zoom into.
      area.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        dragFrom = stepAt(e);
        area.setPointerCapture(e.pointerId);
      });
      area.addEventListener("pointermove", (e) => {
        const step = Math.max(lo, Math.min(hi, stepAt(e)));
        setStep(step);
        if (dragFrom == null) return;
        const x = plot.scale("x"), a = x.apply(Math.max(lo, Math.min(hi, dragFrom))), b = x.apply(step);
        Object.assign(sel.style, {display: "block", left: `${Math.min(a, b)}px`, width: `${Math.abs(b - a)}px`});
      });
      area.addEventListener("pointerup", (e) => {
        if (dragFrom == null) return;
        const a = dragFrom, b = stepAt(e);
        dragFrom = null;
        sel.style.display = "none";
        if (Math.abs(b - a) >= 5) setRange(a, b);
      });
      area.addEventListener("pointercancel", () => { dragFrom = null; sel.style.display = "none"; });
      area.addEventListener("dblclick", () => { state.range = null; render(); });
      return wrap;
    });

    const readout = html`<div class="ts-readout"></div>`;
    function setStep(step) {
      state.step = step;
      for (const {cursor, plot} of cursors) {
        const px = plot.scale("x").apply(step);
        cursor.style.left = `${px}px`;
        cursor.style.display = "block";
      }
      const read = html`<a href="#tab-timeline" class="ts-read">Read the completions near step ${step} →</a>`;
      read.onclick = () => dispatchEvent(new CustomEvent("show-completions", {detail: {run: run.id, step}}));
      readout.replaceChildren(html`<div class="ts-step">Step ${step} ${read}</div>`, html`<table>
        <thead><tr><th></th><th>Reward</th><th>log π<sub>base</sub></th><th>Length</th><th>Entropy</th></tr></thead>
        <tbody>${AGENTS.map((a) => {
          const d = byStep.get(`${step}:${a}`) ?? {};
          return html`<tr><td style=${`color:${AGENT_COLORS[a]};font-weight:600`}>${a}</td>
            <td>${fmt(d.reward, 1)}</td><td>${fmt(d.logp_base)}</td><td>${fmt(d.tokens, 0)}</td><td>${fmt(d.entropy)}</td></tr>`;
        })}</tbody></table>`);
    }

    const legend = html`<div class="ts-legend">${AGENTS.map((a) => html`<span><i style=${`background:${AGENT_COLORS[a]}`}></i>${a}</span>`)}
      <span class="ts-legend-note">Drag across a panel to zoom, double-click to reset.</span></div>`;

    root.replaceChildren(
      html`<div class="ts-controls">${runButtons}${smooth}${range}</div>`,
      legend,
      html`<div class="ts-grid" style=${`gap:${gap}px`}>${plots}</div>`,
      readout,
    );
    setStep(state.step != null && state.step >= lo && state.step <= hi ? state.step : Math.round((lo + hi) / 2));
  }
  render();
  return root;
}
