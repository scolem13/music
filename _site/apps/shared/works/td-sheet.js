// td-sheet.js: the Tune Directory's spreadsheet (#td-sheet on practice/tune-directory.qmd): one row per tune, classical theme,
// piece in works-data.js that is neither, and MLT / JRI recording not linked to a tune. Columns: title, type, set or composer,
// key, meter, notation, recordings, bars marked (recordings with a timing map), chords, and links. Each column filters (type in
// the box under its name: words match anywhere; in a number column ">0", "0", "2"); quick boxes for "has recordings", "bars
// marked", "notation", "chords"; a click on a column name sorts by it (again: the other way). Shows 200 rows at a time.
// Reads what the page already loads: tunesObject, CLASSICAL_THEMES, WORKS (Works), MLTRecordings.
(function () {
  "use strict";
  const host = document.getElementById("td-sheet-box"); if (!host) return;
  const fold = (s) => String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const W = window.WORKS || {}, R = window.MLTRecordings, Wk = window.Works;
  let teach = false; try { teach = localStorage.getItem("site-teacher") === "1"; } catch (e) {}
  const visible = (r) => !r.draft || teach;

  // ---- rows ----
  const rows = [];
  function worksRecs(kind, id) {
    const w = Wk && Wk.of(kind, id); if (!w) return [];
    return (w.recordings || []).filter(visible).map((r) => ({ timed: !!r.timing, tsn: Wk.tsnUrl ? Wk.tsnUrl(r, w) : null }));
  }
  const T = typeof tunesObject !== "undefined" ? tunesObject : {};   // eslint-disable-line no-undef
  Object.keys(T).forEach((set) => String(T[set]).split(/\n(?=X:)/).forEach((t) => {
    const id = (/^%%id\s+(\S+)/m.exec(t) || [])[1]; if (!id) return;
    const body = t.replace(/^[A-Za-z]:.*$/gm, "");
    const recs = worksRecs("tune", id).concat(R ? R.forTune(id).map((r) => ({ timed: !!r.timing, tsn: "/tools/timestamp-notes.html?rec=" + encodeURIComponent(r.id) + "&tune=" + encodeURIComponent(id) })) : []);
    rows.push({ title: ((/^T:\s*(.*)$/m.exec(t) || [])[1] || "(untitled)").trim(), type: "Tune", where: set, by: ((/^C:\s*(.*)$/m.exec(t) || [])[1] || "").trim(),
      key: ((/^K:\s*(\S+)/m.exec(t) || [])[1] || ""), meter: ((/^M:\s*(\S+)/m.exec(t) || [])[1] || ""), notation: 1,
      recs: recs.length, timed: recs.filter((r) => r.timed).length, chords: /"\^?[A-G][#b]?[^"]*"/.test(body) ? 1 : 0,
      href: "/practice/tunes.html?tune=" + encodeURIComponent(id), tsn: (recs.find((r) => r.timed) || recs[0] || {}).tsn || null, id });
  }));
  (window.CLASSICAL_THEMES || []).forEach((t) => {
    const recs = worksRecs("theme", t.id); if (t.yt) recs.push({ timed: false, tsn: "/tools/timestamp-notes.html?v=" + encodeURIComponent(t.yt) });
    rows.push({ title: t.title, type: "Theme", where: [t.last, t.first].filter(Boolean).join(", "), by: [t.movement, t.cat].filter(Boolean).join(" · "),
      key: (t.key || "") + (t.minor && !/m$/.test(t.key || "") ? "m" : ""), meter: t.meter || "", notation: 1, recs: recs.length, timed: recs.filter((r) => r.timed).length, chords: 0,
      bar: t.bar, href: "/tools/classical-themes.html?theme=" + encodeURIComponent(t.id), tsn: (recs[0] || {}).tsn || null, id: t.id });
  });
  Object.keys(W).forEach((wid) => {
    const w = W[wid], inn = w.in || {};
    if ((inn.tune || []).length || (inn.theme || []).length) return;     // listed under its tune or theme
    const recs = (w.recordings || []).filter(visible);
    rows.push({ title: w.title, type: "Piece", where: w.composer || "", by: w.from || "", key: "", meter: "", notation: (inn.analysed || []).length ? 1 : 0,
      recs: recs.length, timed: recs.filter((r) => r.timing).length, chords: 0, href: (Wk ? Wk.config.directory : "") + "#" + wid,
      tsn: recs.length && Wk.tsnUrl ? Wk.tsnUrl(recs[0], Object.assign({ id: wid }, w)) : null, id: wid });
  });
  if (R) R.list.forEach((r) => {
    if (r.tune && r.tune.length) return;                                  // counted with its tune
    const col = R.collections.find((c) => c.id === r.col) || {};
    rows.push({ title: r.title, type: "Recording", where: (col.title || r.col).replace(/^Jump Right In: /, "JRI "), by: r.kind ? R.KINDS[r.kind] : "",
      key: r.key || "", meter: [r.tonality, r.meter].filter(Boolean).join(" "), notation: 0, recs: 1, timed: r.timing ? 1 : 0, chords: 0,
      href: "/mlt/recordings.html?find=" + encodeURIComponent(r.id), tsn: "/tools/timestamp-notes.html?rec=" + encodeURIComponent(r.id), id: r.id });
  });

  // ---- table ----
  const COLS = [
    { k: "title", label: "Title" }, { k: "type", label: "Type", sel: ["Tune", "Theme", "Piece", "Recording"] }, { k: "where", label: "Set / composer" },
    { k: "by", label: "Composer / movement / kind" }, { k: "key", label: "Key", w: "4rem" }, { k: "meter", label: "Meter", w: "5rem" },
    { k: "notation", label: "Notation", yn: 1 }, { k: "recs", label: "Recordings", num: 1 }, { k: "timed", label: "Bars marked", num: 1 }, { k: "chords", label: "Chords", yn: 1 }
  ];
  const head = COLS.map((c) => `<th data-k="${c.k}" title="Sort">${c.label} <span class="tds-arrow"></span></th>`).join("") + "<th>Open</th>";
  const filt = COLS.map((c) => `<th>${c.sel ? `<select data-f="${c.k}"><option value="">all</option>${c.sel.map((o) => `<option>${o}</option>`).join("")}</select>` :
    c.yn ? `<select data-f="${c.k}"><option value="">all</option><option value="1">yes</option><option value="0">no</option></select>` :
    `<input data-f="${c.k}" placeholder="${c.num ? ">0" : "filter"}" ${c.w ? `style="width:${c.w}"` : ""}>`}</th>`).join("") + "<th></th>";
  host.innerHTML = `<div class="tds-quick"><label><input type="checkbox" data-q="recs"> has recordings</label> <label><input type="checkbox" data-q="timed"> bars marked</label>
    <label><input type="checkbox" data-q="notation"> has notation</label> <label><input type="checkbox" data-q="both"> notation and a recording</label>
    <label><input type="checkbox" data-q="chords"> has chords</label> <button type="button" class="tds-reset">Clear filters</button> <span class="tds-n"></span></div>
    <div class="tds-wrap"><table class="tds"><thead><tr>${head}</tr><tr class="tds-f">${filt}</tr></thead><tbody></tbody></table></div><button type="button" class="tds-more" hidden>Show more</button>`;
  const tbody = host.querySelector("tbody"), more = host.querySelector(".tds-more");
  let sortK = "title", sortDir = 1, shown = 200;

  function numOk(v, f) {
    const m = /^\s*(>=|<=|>|<|=)?\s*(\d+)\s*$/.exec(f); if (!m) return true;
    const n = +m[2]; return m[1] === ">" ? v > n : m[1] === "<" ? v < n : m[1] === ">=" ? v >= n : m[1] === "<=" ? v <= n : v === n;
  }
  function filtered() {
    const f = {}; host.querySelectorAll("[data-f]").forEach((x) => { if (x.value.trim()) f[x.dataset.f] = x.value.trim(); });
    const q = {}; host.querySelectorAll("[data-q]").forEach((x) => { q[x.dataset.q] = x.checked; });
    const list = rows.filter((r) => {
      if (q.recs && !r.recs) return false; if (q.timed && !r.timed) return false; if (q.notation && !r.notation) return false;
      if (q.both && !(r.notation && r.recs)) return false; if (q.chords && !r.chords) return false;
      return COLS.every((c) => {
        const v = f[c.k]; if (v == null) return true;
        if (c.num) return numOk(r[c.k], v);
        if (c.yn) return String(r[c.k] ? 1 : 0) === v;
        if (c.sel) return r[c.k] === v;
        return fold(v).split(/\s+/).every((w) => fold(r[c.k]).indexOf(w) >= 0);
      });
    });
    const col = COLS.find((c) => c.k === sortK);
    list.sort((a, b) => {
      const x = a[sortK], y = b[sortK];
      const d = col.num || col.yn ? (x || 0) - (y || 0) : fold(x).localeCompare(fold(y), undefined, { numeric: true });
      return d * sortDir || fold(a.title).localeCompare(fold(b.title));
    });
    return list;
  }
  function draw(keep) {
    if (!keep) shown = 200;
    const list = filtered();
    tbody.innerHTML = list.slice(0, shown).map((r) => `<tr>
      <td><a href="${esc(r.href)}">${esc(r.title)}</a></td><td>${r.type}</td><td>${esc(r.where)}</td><td class="tds-dim">${esc(r.by)}</td>
      <td>${esc(r.key)}</td><td>${esc(r.meter)}</td><td class="tds-c">${r.notation ? "✓" : ""}</td><td class="tds-c">${r.recs || ""}</td>
      <td class="tds-c">${r.timed ? "✓" + (r.timed > 1 ? " " + r.timed : "") : r.recs ? "–" : ""}</td><td class="tds-c">${r.chords ? "✓" : ""}</td>
      <td>${r.tsn ? `<a href="${esc(r.tsn)}" title="Open in Timestamp Notes">⏱</a>` : ""}</td></tr>`).join("");
    more.hidden = list.length <= shown;
    host.querySelector(".tds-n").textContent = list.length.toLocaleString() + " of " + rows.length.toLocaleString() + " rows";
    host.querySelectorAll("th[data-k] .tds-arrow").forEach((s) => { s.textContent = s.parentNode.dataset.k === sortK ? (sortDir > 0 ? "▲" : "▼") : ""; });
  }
  host.querySelectorAll("th[data-k]").forEach((th) => th.addEventListener("click", () => {
    if (sortK === th.dataset.k) sortDir = -sortDir; else { sortK = th.dataset.k; sortDir = COLS.find((c) => c.k === sortK).num ? -1 : 1; }
    draw();
  }));
  let tmr = 0;
  host.querySelectorAll("[data-f],[data-q]").forEach((x) => x.addEventListener(x.tagName === "INPUT" && x.type !== "checkbox" ? "input" : "change", () => { clearTimeout(tmr); tmr = setTimeout(draw, 150); }));
  host.querySelector(".tds-reset").addEventListener("click", () => { host.querySelectorAll("[data-f]").forEach((x) => { x.value = ""; }); host.querySelectorAll("[data-q]").forEach((x) => { x.checked = false; }); draw(); });
  more.addEventListener("click", () => { shown += 200; draw(true); });
  draw();
  window.TdSheet = { rows: () => rows, filtered };
})();
