// td-sheet.js: the Tune Directory's spreadsheet (#td-sheet on practice/tune-directory.qmd): one row per tune, classical theme,
// piece in works-data.js that is neither, song in Words & Chords (SONG_INDEX, in works-data.js), and MLT / JRI recording not linked to a tune. Columns: title, type, set or composer,
// key, meter, year (composed, else published: Works / theme data), print (figures in a print anthology, e.g. "Cutler 12-3"), notation,
// recordings, bars marked (recordings with a timing map), chords, and links. Each column filters (type in
// the box under its name: words match anywhere; in a number column ">0", "0", "2"); quick boxes for "has recordings", "bars
// marked", "notation", "chords"; a click on a column name sorts by it (again: the other way). Shows 200 rows at a time.
// Reads what the page already loads: tunesObject, CLASSICAL_THEMES, WORKS (Works), MLTRecordings; the Billboard songs (apps/shared/data/billboard/index.json)
// are fetched and added as type "Billboard" rows (the Isophonics Beatles songs in the same index, src "iso", as type "Isophonics"); PDMX scores in their original scoring (apps/shared/data/pdmx/index.json) as type "Score". Type chips above the table switch types on and off (all on to start: nothing to expand).
// Concepts (works.js "Concept uses": apps/shared/works/uses/*.js, plus print-anthology figures that carry a concept / caption): a Concepts column
// (count, then the first names; filter by words in it), two lists above the table (concept, source) and a ▸ in the Title cell that opens the
// row's uses (source, concept, note, link). A uses `work` id that is not in works-data.js becomes its own row (type Piece, "uses only").
// The old per-type lists below the table start folded (the sheet has the same pieces); first visit only, then the reader's choice is kept.
(function () {
  "use strict";
  const host = document.getElementById("td-sheet-box"); if (!host) return;
  const fold = (s) => String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const W = window.WORKS || {}, R = window.MLTRecordings, Wk = window.Works;
  let teach = false; try { teach = localStorage.getItem("site-teacher") === "1"; } catch (e) {}
  const visible = (r) => !r.draft || teach;

  // the sections below the sheet start folded (section-fold.js reads this before it runs)
  try {
    if (!localStorage.getItem("td-folded-v1")) {
      const key = "section-fold:" + location.pathname; let st = {}; try { st = JSON.parse(localStorage.getItem(key) || "{}"); } catch (e) {}
      ["td-works", "td-print", "td-tunes", "td-themes", "td-mlt", "td-billboard", "td-isophonics", "td-analysed"].forEach((id) => { st[id] = 1; });
      localStorage.setItem(key, JSON.stringify(st)); localStorage.setItem("td-folded-v1", "1");
    }
  } catch (e) {}

  // ---- rows ----
  const rows = [];
  const PB = window.PRINT_BOOKS || {};
  const printOf = (w) => ((w && w.in && w.in.print) || []).map((x) => ((PB[x.book] || {}).short || x.book).split(",")[0] + " " + x.fig).join(", ");
  const yearOf = (o) => (o && (o.composed || o.published)) || "";
  function worksRecs(kind, id) {
    const w = Wk && Wk.of(kind, id); if (!w) return [];
    return (w.recordings || []).filter(visible).map((r) => ({ timed: !!r.timing, tsn: Wk.tsnUrl ? Wk.tsnUrl(r, w) : null }));
  }
  const T = typeof tunesObject !== "undefined" ? tunesObject : {};   // eslint-disable-line no-undef
  Object.keys(T).forEach((set) => String(T[set]).split(/\n(?=X:)/).forEach((t) => {
    const id = (/^%%id\s+(\S+)/m.exec(t) || [])[1]; if (!id) return;
    const body = t.replace(/^[A-Za-z]:.*$/gm, "");
    const recs = worksRecs("tune", id).concat(R ? R.forTune(id).map((r) => ({ timed: !!r.timing, tsn: "/tools/timestamp-notes.html?rec=" + encodeURIComponent(r.id) + "&tune=" + encodeURIComponent(id) })) : []);
    rows.push({ wid: (Wk && Wk.of("tune", id) || {}).id, title: ((/^T:\s*(.*)$/m.exec(t) || [])[1] || "(untitled)").trim(), type: "Tune", where: set, by: ((/^C:\s*(.*)$/m.exec(t) || [])[1] || "").trim(),
      key: ((/^K:\s*(\S+)/m.exec(t) || [])[1] || ""), meter: ((/^M:\s*(\S+)/m.exec(t) || [])[1] || ""), notation: 1,
      recs: recs.length, timed: recs.filter((r) => r.timed).length, chords: /"\^?[A-G][#b]?[^"]*"/.test(body) ? 1 : 0,
      href: "/practice/tunes.html?tune=" + encodeURIComponent(id), tsn: (recs.find((r) => r.timed) || recs[0] || {}).tsn || null, id });
  }));
  (window.CLASSICAL_THEMES || []).forEach((t) => {
    const recs = worksRecs("theme", t.id); if (t.yt) recs.push({ timed: false, tsn: "/tools/timestamp-notes.html?v=" + encodeURIComponent(t.yt) });
    rows.push({ wid: (Wk && Wk.of("theme", t.id) || {}).id, title: t.title, type: "Theme", where: [t.last, t.first].filter(Boolean).join(", "), by: [t.movement, t.cat].filter(Boolean).join(" · "),
      key: (t.key || "") + (t.minor && !/m$/.test(t.key || "") ? "m" : ""), meter: t.meter || "", notation: 1, recs: recs.length, timed: recs.filter((r) => r.timed).length, chords: 0,
      year: yearOf(t) || yearOf(Wk && Wk.of("theme", t.id)), print: printOf(Wk && Wk.of("theme", t.id)),
      bar: t.bar, href: "/tools/classical-themes.html?theme=" + encodeURIComponent(t.id), tsn: (recs[0] || {}).tsn || null, id: t.id });
  });
  Object.keys(W).forEach((wid) => {
    const w = W[wid], inn = w.in || {};
    if ((inn.tune || []).length || (inn.theme || []).length) return;     // listed under its tune or theme
    const recs = (w.recordings || []).filter(visible);
    rows.push({ wid: wid, title: w.title, type: "Piece", where: w.composer || "", by: w.from || "", key: (w.jri && w.jri.key) || "", meter: w.jri ? [w.jri.tonality, w.jri.meter].filter(Boolean).join(" ") : "", year: yearOf(w), print: printOf(w),
      notation: (inn.analysed || []).length || (inn.score || []).length ? 1 : 0,
      recs: recs.length, timed: recs.filter((r) => r.timing).length, chords: 0, href: (Wk ? Wk.config.directory : "") + "#" + wid,
      tsn: recs.length && Wk.tsnUrl ? Wk.tsnUrl(recs[0], Object.assign({ id: wid }, w)) : null, id: wid });
  });
  (window.SONG_INDEX || []).forEach((g) => {                           // Words & Chords (songs/index.qmd), list from scripts/songs/build.py
    rows.push({ title: g.title, type: "Song", where: "Words & Chords", by: g.artist || g.first || "", key: g.key || "", meter: g.time || "", notation: 0,
      recs: 0, timed: 0, chords: g.chords ? 1 : 0, href: "/songs/?id=" + encodeURIComponent(g.id), tsn: null, id: g.id });
  });
  if (R) R.list.forEach((r) => {
    if (r.tune && r.tune.length) return;                                  // counted with its tune
    const col = R.collections.find((c) => c.id === r.col) || {};
    rows.push({ title: r.title, type: "Recording", where: (col.title || r.col).replace(/^Jump Right In: /, "JRI "), by: r.kind ? R.KINDS[r.kind] : "",
      key: r.key || "", meter: [r.tonality, r.meter].filter(Boolean).join(" "), notation: 0, recs: 1, timed: r.timing ? 1 : 0, chords: 0,
      href: "/mlt/recordings.html?find=" + encodeURIComponent(r.id), tsn: "/tools/timestamp-notes.html?rec=" + encodeURIComponent(r.id), id: r.id });
  });

  // Billboard songs (McGill): added when the index arrives
  const bbReady = fetch("/apps/shared/data/billboard/index.json").then((r) => r.json()).then((all) => {
    all.forEach((g) => { const iso = g.src === "iso"; rows.push({ title: g.title, type: iso ? "Isophonics" : "Billboard", where: iso ? g.artist + " · " + g.album : g.artist || "", by: (iso ? "Isophonics" : "McGill Billboard") + (g.metre ? " · " + g.metre : ""), key: g.tonic || "", meter: g.metre || "",
      year: g.year || "", notation: 0, recs: 0, timed: 0, chords: 1, href: "/tools/timestamp-notes.html?salami=" + g.id, tsn: "/tools/timestamp-notes.html?salami=" + g.id, id: g.id,
      uses: [], nconc: 0, concepts: "", cset: new Set(), sset: new Set() }); });
  }).catch(() => {});
  // PDMX scores judged to be in the piece's original scoring (scripts/pdmx/build.mjs): type "Score"; converted ones open in the full-score player
  const pdReady = fetch("/apps/shared/data/pdmx/index.json").then((r) => r.json()).then((all) => {
    all.forEach((g) => { rows.push({ title: g.title.replace(/^[^:]+:\s*/, ""), type: "Score", where: g.composer || "",
      by: g.scoring + " · PDMX · " + (g.arranger ? "arr. " + g.arranger + " " : "original? ") + Math.round(g.conf * 100) + "%" + (g.converted ? "" : " · MusicXML only"), key: "", meter: "", year: "",
      notation: g.converted ? 1 : 0, recs: 0, timed: 0, chords: 0, href: g.converted ? "/theory/analysed-scores/full-scores.html?id=" + g.id : "#", tsn: null, id: g.id,
      uses: [], nconc: 0, concepts: "", cset: new Set(), sset: new Set() }); });
  }).catch(() => {});
  const ready = Promise.all([bbReady, pdReady]);

  // ---- concepts: uses/*.js and print figures with a concept ----
  const uses = Wk && Wk.usesAll ? Wk.usesAll() : [];
  Object.keys(W).forEach((wid) => { if (Wk && Wk.printUses) Array.prototype.push.apply(uses, Wk.printUses(Object.assign({ id: wid }, W[wid]))); });
  const byWork = {}; uses.forEach((u) => { (byWork[u.work] = byWork[u.work] || []).push(u); });
  Object.keys(byWork).filter((wid) => !W[wid]).forEach((wid) => {      // a work only the uses know: its own row
    const u = byWork[wid][0];
    rows.push({ wid: wid, title: u.title || wid, type: "Piece", where: u.composer || "", by: "uses only", key: "", meter: "", notation: 0, recs: 0, timed: 0, chords: 0,
      href: u.url || "#", tsn: null, id: wid });
  });
  const conceptKey = (c) => fold(c).trim();
  const conceptName = {}, srcName = {};
  rows.forEach((r) => {
    r.uses = r.wid ? byWork[r.wid] || [] : [];
    const names = []; r.uses.forEach((u) => { if (u.concept && names.indexOf(u.concept) < 0) names.push(u.concept); });
    r.nconc = names.length; r.concepts = names.join("; ");
    r.cset = new Set(r.uses.filter((u) => u.concept).map((u) => conceptKey(u.concept))); r.sset = new Set(r.uses.map((u) => u.src));
    r.uses.forEach((u) => { if (u.concept) conceptName[conceptKey(u.concept)] = (conceptName[conceptKey(u.concept)] || u.concept); srcName[u.src] = u.label || u.src; });
  });
  const conceptN = {}; uses.forEach((u) => { if (u.concept) conceptN[conceptKey(u.concept)] = (conceptN[conceptKey(u.concept)] || 0) + 1; });

  // ---- table ----
  const COLS = [
    { k: "title", label: "Title" }, { k: "type", label: "Type", chips: ["Tune", "Theme", "Piece", "Score", "Song", "Billboard", "Isophonics", "Recording"] }, { k: "where", label: "Set / composer" },
    { k: "by", label: "Composer / movement / kind" }, { k: "key", label: "Key", w: "4rem" }, { k: "meter", label: "Meter", w: "5rem" },
    { k: "year", label: "Year", num: 1, w: "4.5rem", ph: "<1800" }, { k: "print", label: "Print", w: "6rem" },
    { k: "notation", label: "Notation", yn: 1 }, { k: "recs", label: "Recordings", num: 1 }, { k: "timed", label: "Bars marked", num: 1 }, { k: "chords", label: "Chords", yn: 1 },
    { k: "concepts", label: "Concepts", sortk: "nconc", w: "8rem" }
  ];
  const head = COLS.map((c) => `<th data-k="${c.sortk || c.k}" title="Sort">${c.label} <span class="tds-arrow"></span></th>`).join("") + "<th>Open</th>";
  const filt = COLS.map((c) => `<th>${c.chips ? "" : c.sel ? `<select data-f="${c.k}"><option value="">all</option>${c.sel.map((o) => `<option>${o}</option>`).join("")}</select>` :
    c.yn ? `<select data-f="${c.k}"><option value="">all</option><option value="1">yes</option><option value="0">no</option></select>` :
    `<input data-f="${c.k}" placeholder="${c.ph || (c.num ? ">0" : "filter")}" ${c.w ? `style="width:${c.w}"` : ""}>`}</th>`).join("") + "<th></th>";
  const opt = (v, t) => `<option value="${esc(v)}">${esc(t)}</option>`;
  const conceptOpts = Object.keys(conceptName).sort().map((k) => opt(k, conceptName[k] + " (" + conceptN[k] + ")")).join("");
  const srcOpts = Object.keys(srcName).sort().map((k) => opt(k, srcName[k])).join("");
  host.innerHTML = `<div class="tds-chips" role="group" aria-label="Types"></div>
    ${conceptOpts ? `<div class="tds-quick"><label>Concept <select data-cf="concept"><option value="">any</option>${conceptOpts}</select></label>
    <label>Source <select data-cf="src"><option value="">any</option>${srcOpts}</select></label></div>` : ""}
    <div class="tds-quick"><label><input type="checkbox" data-q="recs"> has recordings</label> <label><input type="checkbox" data-q="timed"> bars marked</label>
    <label><input type="checkbox" data-q="notation"> has notation</label> <label><input type="checkbox" data-q="both"> notation and a recording</label>
    <label><input type="checkbox" data-q="chords"> has chords</label> <label><input type="checkbox" data-q="print"> in a print anthology</label> <button type="button" class="tds-reset">Clear filters</button> <span class="tds-n"></span></div>
    <div class="tds-wrap"><table class="tds"><thead><tr>${head}</tr><tr class="tds-f">${filt}</tr></thead><tbody></tbody></table></div><button type="button" class="tds-more" hidden>Show more</button>`;
  const tbody = host.querySelector("tbody"), more = host.querySelector(".tds-more");
  let sortK = "title", sortDir = 1, shown = 300;
  const typeOn = new Set(), chipBox = host.querySelector(".tds-chips");      // empty set = every type
  const typeN = {}; function chips() {
    Object.keys(typeN).forEach((k) => delete typeN[k]); rows.forEach((r) => { typeN[r.type] = (typeN[r.type] || 0) + 1; });
    chipBox.innerHTML = `<button type="button" class="tds-chip${typeOn.size ? "" : " on"}" data-t="">All <span>${rows.length.toLocaleString()}</span></button>` +
      COLS[1].chips.filter((t) => typeN[t]).map((t) => `<button type="button" class="tds-chip${typeOn.has(t) ? " on" : ""}" data-t="${t}" aria-pressed="${typeOn.has(t)}">${t} <span>${typeN[t].toLocaleString()}</span></button>`).join("");
  }
  chipBox.addEventListener("click", (e) => {
    const b = e.target.closest("[data-t]"); if (!b) return;
    if (!b.dataset.t) typeOn.clear(); else if (typeOn.has(b.dataset.t)) typeOn.delete(b.dataset.t); else typeOn.add(b.dataset.t);
    chips(); draw();
  });
  let curList = [];

  function numOk(v, f) {
    const m = /^\s*(>=|<=|>|<|=)?\s*(\d+)\s*$/.exec(f); if (!m) return true;
    const n = +m[2]; return m[1] === ">" ? v > n : m[1] === "<" ? v < n : m[1] === ">=" ? v >= n : m[1] === "<=" ? v <= n : v === n;
  }
  function filtered() {
    const f = {}; host.querySelectorAll("[data-f]").forEach((x) => { if (x.value.trim()) f[x.dataset.f] = x.value.trim(); });
    const cf = {}; host.querySelectorAll("[data-cf]").forEach((x) => { cf[x.dataset.cf] = x.value; });
    const q = {}; host.querySelectorAll("[data-q]").forEach((x) => { q[x.dataset.q] = x.checked; });
    const list = rows.filter((r) => {
      if (q.recs && !r.recs) return false; if (q.timed && !r.timed) return false; if (q.notation && !r.notation) return false;
      if (q.both && !(r.notation && r.recs)) return false; if (q.chords && !r.chords) return false; if (q.print && !r.print) return false;
      if (typeOn.size && !typeOn.has(r.type)) return false;
      if (cf.concept && !r.cset.has(cf.concept)) return false; if (cf.src && !r.sset.has(cf.src)) return false;
      return COLS.every((c) => {
        const v = f[c.k]; if (v == null) return true;
        if (c.num) return numOk(r[c.k], v);
        if (c.yn) return String(r[c.k] ? 1 : 0) === v;
        if (c.sel) return r[c.k] === v;
        return fold(v).split(/\s+/).every((w) => fold(r[c.k]).indexOf(w) >= 0);
      });
    });
    const col = COLS.find((c) => (c.sortk || c.k) === sortK);
    list.sort((a, b) => {
      const x = a[sortK], y = b[sortK];
      const d = col.num || col.yn || col.sortk ? (x || 0) - (y || 0) : fold(x).localeCompare(fold(y), undefined, { numeric: true });
      return d * sortDir || fold(a.title).localeCompare(fold(b.title));
    });
    return list;
  }
  function draw(keep) {
    if (!keep) shown = 300;
    const list = curList = filtered();
    tbody.innerHTML = list.slice(0, shown).map((r, i) => `<tr data-i="${i}">
      <td>${r.uses.length ? `<button type="button" class="tds-open" aria-expanded="false" title="Show how this piece is used">▸</button> ` : ""}<a href="${esc(r.href)}">${esc(r.title)}</a></td><td>${r.type}</td><td>${esc(r.where)}</td><td class="tds-dim">${esc(r.by)}</td>
      <td>${esc(r.key)}</td><td>${esc(r.meter)}</td><td class="tds-c">${esc(r.year || "")}</td><td class="tds-dim">${esc(r.print || "")}</td><td class="tds-c">${r.notation ? "✓" : ""}</td><td class="tds-c">${r.recs || ""}</td>
      <td class="tds-c">${r.timed ? "✓" + (r.timed > 1 ? " " + r.timed : "") : r.recs ? "–" : ""}</td><td class="tds-c">${r.chords ? "✓" : ""}</td>
      <td class="tds-con" title="${esc(r.concepts)}">${r.nconc ? `<b>${r.nconc}</b> ` + esc(r.concepts.split("; ").slice(0, 2).join("; ")) + (r.nconc > 2 ? "…" : "") : ""}</td>
      <td>${r.tsn ? `<a href="${esc(r.tsn)}" title="Open in Timestamp Notes">⏱</a>` : ""}</td></tr>`).join("");
    more.hidden = list.length <= shown;
    host.querySelector(".tds-n").textContent = list.length.toLocaleString() + " of " + rows.length.toLocaleString() + " rows";
    host.querySelectorAll("th[data-k] .tds-arrow").forEach((s) => { s.textContent = s.parentNode.dataset.k === sortK ? (sortDir > 0 ? "▲" : "▼") : ""; });
  }
  tbody.addEventListener("click", (e) => {
    const b = e.target.closest(".tds-open"); if (!b) return;
    const tr = b.closest("tr"), next = tr.nextElementSibling;
    if (next && next.classList.contains("tds-detail")) { next.remove(); b.textContent = "▸"; b.setAttribute("aria-expanded", "false"); return; }
    const r = curList[+tr.dataset.i], d = document.createElement("tr"), td = document.createElement("td");
    d.className = "tds-detail"; td.colSpan = COLS.length + 1; td.appendChild(Wk.usesList(r.uses)); d.appendChild(td); tr.after(d);
    b.textContent = "▾"; b.setAttribute("aria-expanded", "true");
  });
  host.querySelectorAll("th[data-k]").forEach((th) => th.addEventListener("click", () => {
    if (sortK === th.dataset.k) sortDir = -sortDir; else { sortK = th.dataset.k; const c = COLS.find((c) => (c.sortk || c.k) === sortK); sortDir = c.num || c.sortk ? -1 : 1; }
    draw();
  }));
  let tmr = 0;
  host.querySelectorAll("[data-f],[data-q],[data-cf]").forEach((x) => x.addEventListener(x.tagName === "INPUT" && x.type !== "checkbox" ? "input" : "change", () => { clearTimeout(tmr); tmr = setTimeout(draw, 150); }));
  host.querySelector(".tds-reset").addEventListener("click", () => { host.querySelectorAll("[data-f]").forEach((x) => { x.value = ""; }); host.querySelectorAll("[data-q]").forEach((x) => { x.checked = false; }); host.querySelectorAll("[data-cf]").forEach((x) => { x.value = ""; }); typeOn.clear(); chips(); draw(); });
  more.addEventListener("click", () => { shown += 300; draw(true); });
  chips(); draw();
  ready.then(() => { chips(); draw(true); });
  window.TdSheet = { rows: () => rows, filtered, ready };
})();
