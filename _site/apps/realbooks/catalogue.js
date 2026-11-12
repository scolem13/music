// Real Book Catalogue page logic: search and filter window.REALBOOKS (catalogue-data.js). Used by tools/real-books.qmd and catalogue.html.
(() => {
  const D = window.REALBOOKS, $ = id => document.getElementById(id), PER = 100;
  $("sub").textContent = D.tunes.length.toLocaleString() + " tunes from Hal Leonard's Real Book Songfinder (2014) and " + D.indexed.length + " of " + D.books.length +
    " indexed books. ✓ marks a Songfinder volume I have as a PDF. Built " + D.built + ". Page is the printed page; the PDF page is in the tooltip.";
  D.indexed.map(i => i.b).sort((a, b) => D.books[a].title.localeCompare(D.books[b].title)).forEach(b => $("book").add(new Option(D.books[b].title, b)));
  Object.entries(D.sfVols).forEach(([n, t]) => $("vol").add(new Option(n + ". " + t, n)));
  const norm = s => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  D.tunes.forEach(t => { t._s = norm([t.t, (t.aka || []).join(" "), t.c, (t.ar || []).join(" ")].join(" ")); t._n = new Set(t.at.map(a => a[0])).size; });
  const qs = new URLSearchParams(location.search); ["q", "book", "vol", "min", "pdf"].forEach(k => { if (qs.has(k)) $(k).value = qs.get(k); });
  let page = +qs.get("page") || 0;
  function rows() {
    const w = norm($("q").value).split(/\s+/).filter(Boolean), b = $("book").value, v = +$("vol").value, m = +$("min").value, pf = $("pdf").value;
    return D.tunes.filter(t => w.every(x => t._s.includes(x)) && (b === "" || t.at.some(a => a[0] === +b)) && (!v || (t.sf || []).includes(v)) && t._n >= m && (!pf || (pf === "y") === !!t.pdf));
  }
  function render() {
    const r = rows(), pages = Math.max(1, Math.ceil(r.length / PER)); page = Math.min(Math.max(0, page), pages - 1);
    $("count").textContent = r.length.toLocaleString() + " tunes · page " + (page + 1) + " of " + pages;
    const p = new URLSearchParams(); ["q", "book", "vol", "min", "pdf"].forEach(k => { const x = $(k).value; if (x && x !== "0") p.set(k, x); }); if (page) p.set("page", page);
    history.replaceState(null, "", "?" + p);
    const tb = $("rows"); tb.textContent = "";
    r.slice(page * PER, page * PER + PER).forEach(t => {
      const tr = tb.insertRow(), a = tr.insertCell(), wh = tr.insertCell(), s = tr.insertCell(), n = tr.insertCell();
      a.textContent = t.t;
      if (t.aka || t.c || t.ar) { const d = document.createElement("div"); d.className = "aka"; d.textContent = [t.ar && "recorded by " + t.ar.join(", "), t.c, t.aka && "also " + t.aka.join("; ")].filter(Boolean).join(" · "); a.appendChild(d); }
      wh.className = "where";
      t.at.forEach(([bi, pp, pg, conf]) => { const sp = document.createElement("span"), bk = D.books[bi]; if (bk.hand) sp.className = "hand";
        sp.textContent = bk.title.replace(/^The /, "") + ", " + (pg != null ? pg : "pdf " + pp); sp.title = bk.file + " · PDF page " + pp + (conf ? " · " + conf + " confidence" : ""); wh.appendChild(sp); });
      s.className = "hide-sm aka";
      (t.sf || []).forEach((v, i) => { const e = document.createElement(D.sfOwned[v] ? "b" : "span"); e.textContent = (i ? ", " : "") + String(v).padStart(2, "0") + (D.sfOwned[v] ? " ✓" : "");
        e.title = D.sfVols[v] + (D.sfOwned[v] ? " — I have this as a PDF: " + D.sfOwned[v].map(b => D.books[b].file).join(", ") : " — no PDF"); s.appendChild(e); });
      if (!t.pdf) { const e = document.createElement("div"); e.textContent = "no PDF"; wh.appendChild(e); }
      else if (t.pdf === 2) { const e = document.createElement("div"); e.textContent = "in an owned Songfinder volume, page not indexed yet"; wh.appendChild(e); }
      n.className = "n"; n.textContent = t._n || "";
    });
  }
  let tm; ["q", "book", "vol", "min", "pdf"].forEach(k => $(k).addEventListener("input", () => { page = 0; clearTimeout(tm); tm = setTimeout(render, 120); }));
  $("prev").onclick = () => { page--; render(); scrollTo(0, 0); }; $("next").onclick = () => { page++; render(); scrollTo(0, 0); };
  render();
})();
