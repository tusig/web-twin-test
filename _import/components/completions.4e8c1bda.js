import {html} from "../../_npm/htl@1.0.0/11521f02.js";
import MarkdownIt from "../../_npm/markdown-it@15.0.3/6a9622f8.js";
import {AGENT_COLORS} from "./timeseries.0bdbf71f.js";

// Interactive twins of Tables "tab-timeline" (completion browser) and "tab-recurring" (one question over time).
// Both show the full completions behind the printed excerpts, from data/results/completions.json.

const AGENTS = ["A", "B", "C"];
// Completions are model output: render their Markdown, but never as HTML. With html: false,
// markdown-it escapes any tags, so a completion cannot inject anything into the page.
// breaks: true keeps single line breaks, which matter for answers like "!\n!\n!".
const md = new MarkdownIt({html: false, linkify: false, breaks: true});
const defaultLinkOpen = md.renderer.rules.link_open ?? ((tokens, i, options, env, self) => self.renderToken(tokens, i, options));
md.renderer.rules.link_open = (tokens, i, options, env, self) => {
  tokens[i].attrSet("rel", "nofollow noopener noreferrer");
  tokens[i].attrSet("target", "_blank");
  return defaultLinkOpen(tokens, i, options, env, self);
};
function renderText(text, raw) {
  if (raw) return html`<div class="cb-raw">${text}</div>`;
  const el = html`<div class="cb-md"></div>`;
  el.innerHTML = md.render(text);
  return el;
}

const fmt = (v, digits = 1) => v == null ? "–" : Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(digits);

function runSwitch(runs, state, onChange) {
  return html`<div class="ts-runs">${runs.map((r) => {
    const b = html`<button class=${r.id === state.run ? "on" : ""}>${r.label}${r.printed ? " · printed" : ""}</button>`;
    b.onclick = () => { state.run = r.id; onChange(); };
    return b;
  })}</div>`;
}

// One agent's completions at one step: tabs 1-4, full text, scores.
function agentCard(agent, completions, {expanded = true} = {}) {
  let k = 0, raw = false;
  const body = html`<div class="cb-body"></div>`;
  const rawToggle = html`<button class="cb-raw-toggle" title="Show the completion exactly as generated">Raw text</button>`;
  rawToggle.onclick = () => { raw = !raw; show(); };
  const tabs = html`<div class="cb-tabs">${completions.map((_, n) => {
    const t = html`<button title=${`Completion ${n + 1} of ${completions.length}`}>${n + 1}</button>`;
    t.onclick = () => { k = n; show(); };
    return t;
  })}</div>`;
  function show() {
    [...tabs.children].forEach((t, n) => t.classList.toggle("on", n === k));
    const c = completions[k];
    const peers = Object.entries(c.d ?? {});
    rawToggle.classList.toggle("on", raw);
    rawToggle.textContent = raw ? "Rendered" : "Raw text";
    const text = html`<div class=${`cb-text ${expanded ? "" : "clamped"}`}>${renderText(c.text, raw)}</div>`;
    const more = expanded ? "" : html`<button class="cb-more">Show all</button>`;
    if (more) more.onclick = () => { text.classList.toggle("clamped"); more.textContent = text.classList.contains("clamped") ? "Show all" : "Show less"; };
    body.replaceChildren(text, more, html`<div class="cb-meta">
      <span>${c.tokens} tokens</span><span>reward ${fmt(c.reward)}</span><span>advantage ${fmt(c.advantage)}</span>
      ${peers.length ? html`<span>shift under ${peers.map(([j, v]) => html`<b style=${`color:${AGENT_COLORS[j]}`}>${j}</b> ${fmt(v, 2)} `)}</span>` : ""}
    </div>`);
  }
  show();
  return html`<div class="cb-card">
    <div class="cb-card-head"><span class="cb-agent" style=${`color:${AGENT_COLORS[agent]}`}>${agent}</span>${tabs}${rawToggle}</div>
    ${body}</div>`;
}

export function completionBrowser(data, runs, state) {
  const root = html`<div class="cb"></div>`;
  function render() {
    const run = runs.find((r) => r.id === state.run) ?? runs[0];
    const steps = data[run.id].steps;
    let idx = steps.findIndex((s) => s.step >= (state.step ?? 0));
    if (idx < 0) idx = steps.length - 1;
    const s = steps[idx];
    state.step = s.step;
    const slider = html`<input type="range" min="0" max=${steps.length - 1} step="1" value=${idx}>`;
    slider.oninput = () => { state.step = steps[+slider.value].step; render(); };
    const prev = html`<button disabled=${idx === 0}>←</button>`;
    const next = html`<button disabled=${idx === steps.length - 1}>→</button>`;
    prev.onclick = () => { state.step = steps[idx - 1].step; render(); };
    next.onclick = () => { state.step = steps[idx + 1].step; render(); };
    root.replaceChildren(
      html`<div class="ts-controls">${runSwitch(runs, state, () => { state.step = 0; render(); })}</div>`,
      html`<div class="cb-stepper">${prev}<span class="cb-step">Step ${s.step}</span>${next}${slider}
        <span class="cb-note">${steps.length} logged steps</span></div>`,
      html`<p class="cb-prompt">${s.prompt}</p>`,
      html`<div class="cb-grid">${AGENTS.map((a) => agentCard(a, s.completions[a]))}</div>`,
    );
  }
  // Figure 5.1 can ask for a step ("Read the completions" in its readout).
  addEventListener("show-completions", (e) => {
    state.run = e.detail.run;
    const steps = data[state.run].steps;
    state.step = steps.reduce((best, s) => Math.abs(s.step - e.detail.step) < Math.abs(best - e.detail.step) ? s.step : best, steps[0].step);
    render();
  });
  render();
  return root;
}

export function recurringBrowser(data, runs, state, printedQuestion) {
  const root = html`<div class="cb"></div>`;
  function render() {
    const run = runs.find((r) => r.id === state.run) ?? runs[0];
    const tracks = data[run.id].tracks;
    if (!tracks.length) { root.replaceChildren(html`<p class="ts-empty">No recurring questions logged in this run.</p>`); return; }
    let t = tracks.findIndex((tr) => tr.prompt === state.question);
    if (t < 0) t = Math.max(0, tracks.findIndex((tr) => tr.prompt === printedQuestion));
    state.question = tracks[t].prompt;
    const pick = html`<select>${tracks.map((tr, n) => html`<option value=${n} selected=${n === t}>${tr.prompt} (${tr.items.length}×)</option>`)}</select>`;
    pick.onchange = () => { state.question = tracks[+pick.value].prompt; render(); };
    root.replaceChildren(
      html`<div class="ts-controls">${runSwitch(runs, state, () => { state.question = null; render(); })}</div>`,
      html`<label class="cb-question">Question ${pick}</label>`,
      ...tracks[t].items.map((it) => html`<div class="cb-row">
        <div class="cb-step">Step ${it.step}</div>
        <div class="cb-grid">${AGENTS.map((a) => agentCard(a, it.completions[a], {expanded: false}))}</div>
      </div>`),
    );
  }
  render();
  return root;
}
