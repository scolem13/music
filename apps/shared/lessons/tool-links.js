// tool-links.js — on a lesson page, a "Same tools in" strip at the foot: for each interactive tool the lesson uses
// (from window.TOOL_CATALOG, scripts/tool-catalog.cjs), links to the other lessons using it, and a link to the catalogue.
// On lessons/tools.html it draws the whole catalogue into #tool-catalog (filter box, grouped by family).
(function () {
  const C = window.TOOL_CATALOG; if (!C) return;
  const base = location.pathname.replace(/[^/]*$/, ""), here = location.pathname.split("/").pop() || "index.html";
  const title = h => (C.lessons.find(l => l.href === h) || { title: h }).title;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const link = h => `<a href="${base}${h}">${esc(title(h))}</a>`;

  function catalogue(el) {
    const fams = [...new Set(C.tools.map(t => t.family))];
    el.innerHTML = `<input type="search" class="tc-filter form-control" placeholder="Filter tools or lessons" aria-label="Filter">` +
      fams.map(f => `<section class="tc-fam"><h2>${esc(f)}</h2>` + C.tools.filter(t => t.family === f).map(t =>
        `<div class="tc-tool"><h3>${esc(t.name)} <span class="tc-n">${t.lessons.length}</span></h3><p>${t.lessons.map(link).join(" · ")}</p></div>`).join("") + `</section>`).join("");
    el.querySelector(".tc-filter").addEventListener("input", e => {
      const q = e.target.value.toLowerCase();
      el.querySelectorAll(".tc-tool").forEach(d => (d.hidden = q && !d.textContent.toLowerCase().includes(q)));
      el.querySelectorAll(".tc-fam").forEach(s => (s.hidden = !s.querySelector(".tc-tool:not([hidden])")));
    });
  }

  function strip() {
    const me = C.lessons.find(l => l.href === here); if (!me) return;
    const rows = me.tools.map(n => C.tools.find(t => t.name === n)).filter(t => t && t.lessons.length > 1)
      .map(t => `<li><b>${esc(t.name)}</b>: ${t.lessons.filter(h => h !== here).map(link).join(" · ")}</li>`);
    if (!rows.length) return;
    const box = document.createElement("aside");
    box.className = "tool-links"; box.setAttribute("aria-label", "Lessons with the same tools");
    box.innerHTML = `<h2>Same tools in</h2><ul>${rows.join("")}</ul><p><a href="${base}tools.html">All interactive tools →</a></p>`;
    (document.querySelector("main") || document.body).appendChild(box);
  }

  const go = () => { const el = document.getElementById("tool-catalog"); el ? catalogue(el) : strip(); };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", go) : go();
})();
