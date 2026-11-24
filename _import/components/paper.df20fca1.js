import {html} from "../../_npm/htl@1.0.0/11521f02.js";

// Title block: title, subtitle, people and buttons, all read from main.tex via thesis.json.
export function paperHead(t, {pdf} = {}) {
  return html`<header class="paper-head">
    <p class="paper-type">${t.type}</p>
    <h1 class="paper-title">${t.title}</h1>
    ${t.subtitle ? html`<p class="paper-subtitle">${t.subtitle}</p>` : ""}
    <div class="paper-people">
      ${person(t.author, "Author")}
      ${t.supervisors.map((s) => person(s, "Supervisor"))}
    </div>
    <p class="paper-affil">${t.institute}, ${t.university}</p>
    <nav class="paper-buttons">
      ${pdf ? html`<a class="paper-button" href=${pdf} download="thesis.pdf">PDF</a>` : ""}
      <a class="paper-button" href="#references">References</a>
      <a class="paper-button" href="#appendix">Appendix</a>
    </nav>
  </header>`;
}

const person = (name, role) => html`<span class="paper-person">
  <span class="paper-name">${name}</span><span class="paper-role">${role}</span></span>`;

// Chapter heading as in the print, e.g. "2 Results", taken from the first twin of that chapter.
export function chapterHead(t, meta) {
  if (!meta) return "";
  return html`<h2 class="chapter-head" id=${`chapter-${meta.chapter}`}>
    <span class="chapter-num">${meta.chapter}</span> ${t.chapters[meta.chapter] ?? ""}</h2>`;
}

// Bibliography with the same numbers and order as the print; each entry is linkable as #ref-<key>.
export function refList(refs) {
  return html`<ol class="refs">${refs.map((r) => html`<li id=${`ref-${r.key}`}>
    <span class="ref-n">[${r.n}]</span>
    <span class="ref-body">${r.authors ? `${r.authors.replace(/\.$/, "")}. ` : ""}${r.book
      ? html`<i>${r.title}</i>`
      : html`“${r.title}”`}. ${r.details.map((d) => `${d}. `)}${r.year}.
      ${r.links.map((l) => html` <a class="ref-link" href=${l.href}>${l.label}</a>`)}</span>
  </li>`)}</ol>`;
}
