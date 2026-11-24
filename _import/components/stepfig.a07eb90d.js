import {html, svg} from "../../_npm/htl@1.0.0/11521f02.js";

// Interactive twin of Figure "fig-step": one step of the society, walked through stage by stage.
// Token log-probabilities are illustrative, not measured.

const STAGES = [
  {title: "Context", text: "A prompt x is drawn from the prompt set 𝒟. In the minimal model, every agent receives the same prompt."},
  {title: "Message", text: "Agent i writes its message y_i token by token, sampling each token from its own next-token distribution."},
  {title: "Reactions", text: "Each peer reads the message in a single forward pass. Its next-token distributions along the message give its reaction, here the summed log-probability of the tokens that agent i wrote."},
  {title: "Reward", text: "The reactions are weighted by agent i's relationships and summed. A weight of +1 attracts agent i towards what the peer expects, a weight of −1 repels it. Flip the weights to see how the reward changes."},
  {title: "Learning", text: "At the end of the step, agent i updates its parameters from all messages and rewards of the step. Messages that did better than their siblings become more likely. All agents do this at the same time."}
];

const TOKENS = ["Absolutely", " not", "!", " That", " would", " be", " a", " disaster", "."];
const LP_J = [-2.1, -0.4, -0.9, -3.2, -1.1, -0.3, -0.6, -2.4, -0.2];
const LP_K = [-6.5, -1.8, -2.2, -5.9, -2.7, -0.9, -1.5, -4.8, -0.6];
const sum = (a) => a.reduce((s, x) => s + x, 0);

// Diagram layout (same arrangement as the TikZ figure in the print).
const P = {x: [70, 130], i: [196, 130], y: [312, 130], j: [434, 69], k: [434, 191], rj: [560, 69], rk: [560, 191], R: [700, 130], U: [434, 285]};

// "r_j(y_i)" -> r, subscript j, (y, subscript i, ): real subscripts instead of Unicode ones,
// which most serif fonts lack.
function parts(s) {
  const out = [];
  let last = 0;
  for (const m of s.matchAll(/_([a-zA-Z]+)/g)) {
    out.push([s.slice(last, m.index), false], [m[1], true]);
    last = m.index + m[0].length;
  }
  out.push([s.slice(last), false]);
  return out;
}
const svgLabel = (s) => parts(s).map(([t, sub], n, all) => sub
  ? svg`<tspan dy="5" font-size="72%">${t}</tspan>`
  : (n > 0 && all[n - 1][1] ? svg`<tspan dy="-5">${t}</tspan>` : t));
const htmlLabel = (s) => parts(s).map(([t, sub]) => sub ? html`<sub>${t}</sub>` : t);

function box(id, [cx, cy], w, label, stages, cls = "") {
  return svg`<g class="sf-el ${cls}" data-stages=${stages.join(" ")}>
    <rect x=${cx - w / 2} y=${cy - 17} width=${w} height="34" rx="4"/>
    <text x=${cx} y=${cy + 5}>${svgLabel(label)}</text></g>`;
}
function circle(id, [cx, cy], label, stages, cls = "") {
  return svg`<g class="sf-el ${cls}" data-stages=${stages.join(" ")}>
    <circle cx=${cx} cy=${cy} r="27"/><text x=${cx} y=${cy + 5}>${svgLabel(label)}</text></g>`;
}
function arrow(d, stages, label, lx, ly) {
  return svg`<g class="sf-el sf-arrow" data-stages=${stages.join(" ")}>
    <path d=${d} marker-end="url(#sf-head)"/>
    ${label ? svg`<text class="sf-lab" x=${lx} y=${ly}>${label}</text>` : ""}</g>`;
}

export function stepFigure() {
  let stage = 0, wj = 1, wk = -1, timer = null, typing = null, shown = 0;

  const diagram = svg`<svg class="sf-svg" viewBox="0 0 780 320" role="img" aria-label="One step of the society">
    <defs><marker id="sf-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
    ${arrow("M108,130 L166,130", [0, 1])}
    ${arrow("M224,130 L292,130", [1], "writes", 258, 120)}
    ${arrow("M330,122 L407,79", [2])}
    ${arrow("M330,138 L407,181", [2])}
    ${arrow("M462,69 L515,69", [2], "reads", 488, 59)}
    ${arrow("M462,191 L515,191", [2], "reads", 488, 211)}
    ${arrow("M606,78 L655,118", [3], "", 0, 0)}
    ${arrow("M606,182 L655,142", [3], "", 0, 0)}
    ${arrow("M700,148 L700,285 L520,285", [4])}
    ${arrow("M348,285 L196,285 L196,160", [4])}
    ${box("x", P.x, 76, "x ∼ 𝒟", [0])}
    ${circle("i", P.i, "π_i", [1, 4], "sf-agent")}
    ${box("y", P.y, 38, "y_i", [1, 2])}
    ${circle("j", P.j, "π_j", [2], "sf-peer-j")}
    ${circle("k", P.k, "π_k", [2], "sf-peer-k")}
    ${box("rj", P.rj, 86, "r_j(y_i)", [2, 3], "sf-peer-j")}
    ${box("rk", P.rk, 86, "r_k(y_i)", [2, 3], "sf-peer-k")}
    ${box("R", P.R, 88, "R_i(y_i)", [3, 4], "sf-agent")}
    ${box("U", P.U, 172, "θ_i ← U(θ_i, ℰ_i)", [4])}
    <g class="sf-el" data-stages="3"><text class="sf-lab sf-w" x="648" y="88">${svgLabel("w_ij")}</text><text class="sf-lab sf-w" x="648" y="182">${svgLabel("w_ik")}</text></g>
  </svg>`;

  const title = html`<div class="sf-title"></div>`;
  const text = html`<p class="sf-text"></p>`;
  const tokens = html`<div class="sf-tokens"></div>`;
  const sums = html`<div class="sf-sums"></div>`;
  const prev = html`<button>← Back</button>`;
  const next = html`<button>Next →</button>`;
  const play = html`<button class="sf-play">Play</button>`;
  const dots = html`<div class="sf-dots">${STAGES.map((s, n) =>
    html`<button class="sf-dot" title=${s.title} onclick=${() => go(n)}>${n + 1}</button>`)}</div>`;
  const flipJ = html`<button class="sf-flip"></button>`;
  const flipK = html`<button class="sf-flip"></button>`;
  flipJ.onclick = () => { wj = -wj; render(); };
  flipK.onclick = () => { wk = -wk; render(); };
  prev.onclick = () => go(Math.max(0, stage - 1));
  next.onclick = () => go(Math.min(STAGES.length - 1, stage + 1));
  play.onclick = () => {
    if (timer) return stop();
    play.textContent = "Pause";
    timer = setInterval(() => go((stage + 1) % STAGES.length, true), 3200);
  };
  function stop() { clearInterval(timer); timer = null; play.textContent = "Play"; }

  function go(n, auto = false) {
    if (!auto) stop();
    const from = stage;
    stage = n;
    if (stage === 1 && from !== 1) {          // type the message out token by token
      shown = 0;
      clearInterval(typing);
      typing = setInterval(() => { shown++; renderTokens(); if (shown >= TOKENS.length) clearInterval(typing); }, 160);
    } else if (stage !== 1) {
      clearInterval(typing);
      shown = stage === 0 ? 0 : TOKENS.length;
    }
    render();
  }

  function renderTokens() {
    const bars = stage >= 2;
    tokens.replaceChildren(...TOKENS.map((t, n) => html`<div class="sf-tok ${n < shown ? "on" : ""}">
      <span class="sf-word">${t.trim() || "·"}</span>
      ${bars ? html`<div class="sf-bars"><span class="sf-bar sf-peer-j" style=${`height:${-LP_J[n] * 9}px`} title=${`log p_j = ${LP_J[n]}`}></span>
                   <span class="sf-bar sf-peer-k" style=${`height:${-LP_K[n] * 9}px`} title=${`log p_k = ${LP_K[n]}`}></span></div>` : ""}
    </div>`));
  }

  function render() {
    for (const el of diagram.querySelectorAll(".sf-el")) {
      el.classList.toggle("on", el.dataset.stages.split(" ").map(Number).includes(stage));
    }
    for (const [n, d] of [...dots.children].entries()) d.classList.toggle("on", n === stage);
    title.textContent = `${stage + 1} · ${STAGES[stage].title}`;
    text.replaceChildren(...htmlLabel(STAGES[stage].text));
    renderTokens();
    const rj = sum(LP_J), rk = sum(LP_K), R = wj * rj + wk * rk;
    flipJ.replaceChildren(...htmlLabel(`w_ij = ${wj > 0 ? "+1" : "−1"}`));
    flipK.replaceChildren(...htmlLabel(`w_ik = ${wk > 0 ? "+1" : "−1"}`));
    sums.replaceChildren(...(stage >= 2 ? [
      html`<span class="sf-peer-j">${htmlLabel("r_j(y_i)")} = ${rj.toFixed(1)}</span>`,
      html`<span class="sf-peer-k">${htmlLabel("r_k(y_i)")} = ${rk.toFixed(1)}</span>`,
      ...(stage >= 3 ? [flipJ, flipK, html`<strong>${htmlLabel(`R_i(y_i) = ${wj > 0 ? "" : "−"}r_j ${wk > 0 ? "+" : "−"} r_k`)} = ${R.toFixed(1)}</strong>`] : [])
    ] : []));
  }

  render();
  return html`<div class="sf">
    ${diagram}
    <div class="sf-panel">
      <div class="sf-nav">${prev}${dots}${next}${play}</div>
      ${title}${text}${tokens}${sums}
      <p class="sf-note">Token log-probabilities are illustrative, not measured. Bars show −log p for peer j (blue) and peer k (orange).</p>
    </div>
  </div>`;
}
