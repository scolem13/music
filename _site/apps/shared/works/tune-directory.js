// tune-directory.js: the Tune Directory page (practice/tune-directory.qmd). Every piece in works-data.js with its panel, then
// every tune of the Tune Library (apps/tunes/tunes-object.js, by set), every Classical Theme (by composer) and every Billboard song
// (apps/shared/data/billboard/index.json, by decade), each linked to its page, with a 🎧 count where its work has recordings.
// Two filters, both applied: the search box (any words, over titles, composers, artists, sets), and "Filter by music": the Tune
// Assessment's own finder (TuneLibrary.renderPicker over the tunes and themes: tonality, meter, key, starts on, tonal pattern,
// Functions, Progression, rhythm cells). Billboard songs answer Functions and Progression from their chords (romans in the index);
// a filter they have nothing to answer with (a tonal pattern, a meter…) leaves them out, as it does the analysed scores.
// Sections are the page's ## headings (#td-works, #td-tunes, #td-themes, #td-mlt, #td-billboard, #td-analysed), so section-fold.js and the TOC work.
(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const fold = (s) => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const W = window.WORKS || {};
  const rows = [];   // { el, text, group, music(crit, ids) -> bool }
  let musicCrit = null, musicIds = null;   // set while a music filter is on

  function badge(kind, id) {
    const w = Works.of(kind, id); if (!w) return null;
    const n = (w.recordings || []).length + (w.links || []).length;
    const a = el("a", "td-badge", (w.recordings || []).length ? "🎧 " + w.recordings.length : "resources"); a.href = "#" + w.id;
    a.title = n + " recording" + (n === 1 ? "" : "s") + " and resource" + (n === 1 ? "" : "s") + ": " + w.title;
    return a;
  }
  function row(kind, id, title, sub, group, music) {
    const li = el("li", "td-row"), a = el("a", null, title); a.href = Works.href(kind, id);
    li.appendChild(a);
    if (sub) li.appendChild(el("span", "td-sub", sub));
    const b = badge(kind, id); if (b) li.appendChild(b);
    rows.push({ el: li, text: fold(title + " " + (sub || "") + " " + (id.piece || id)), group, music });
    return li;
  }
  function group(host, label, count) {
    const d = el("details", "td-group"), s = el("summary");
    s.appendChild(el("span", "td-gname", label)); s.appendChild(el("span", "td-count", String(count)));
    d.appendChild(s); const ul = el("ul", "td-list"); d.appendChild(ul); host.appendChild(d);
    d.__count = s.querySelector(".td-count"); d.__total = count;
    return { d, ul };
  }
  const NONE = () => false;   // no data for any music filter

  // ---- pieces with resources ----
  const wbox = $("#td-works-list"), ids = Object.keys(W).sort((a, b) => fold(W[a].title).localeCompare(fold(W[b].title)));
  ids.forEach((id) => {
    const w = Works.get(id), card = el("div", "td-work"); card.id = id;
    card.appendChild(Works.panel(w, null));
    wbox.appendChild(card);
    const inn = w.in || {};
    rows.push({ el: card, text: fold(w.title + " " + (w.composer || "") + " " + id), group: null,
      music: (c, set) => (inn.tune || []).some((t) => set.has(t)) || (inn.theme || []).some((t) => set.has("cmt-" + t)) });
  });
  $("#td-works-n").textContent = ids.length + " pieces";

  // ---- Tune Library, by set ----
  const tbox = $("#td-tunes-list"); let nTunes = 0;
  const T = typeof tunesObject !== "undefined" ? tunesObject : {};
  Object.keys(T).forEach((set) => {
    const tunes = String(T[set]).split(/\n(?=X:)/).filter((t) => /^\s*X:/.test(t)).map((t) => ({
      id: (/^%%id\s+(\S+)/m.exec(t) || [])[1], title: ((/^T:\s*(.*)$/m.exec(t) || [])[1] || "(untitled)").trim(),
      by: ((/^C:\s*(.*)$/m.exec(t) || [])[1] || "").trim(), repair: /^%%tags.*\bneeds-repair\b/m.test(t) })).filter((t) => t.id);
    nTunes += tunes.length;
    const g = group(tbox, set, tunes.length);
    tunes.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }))
      .forEach((t) => g.ul.appendChild(row("tune", t.id, t.title, [t.by, t.repair ? "needs repair" : ""].filter(Boolean).join(" · "), g.d, (c, s) => s.has(t.id))));
  });
  $("#td-tunes-n").textContent = nTunes.toLocaleString() + " tunes in " + Object.keys(T).length + " sets";

  // ---- Classical Themes, by composer ----
  const hbox = $("#td-themes-list"), C = window.CLASSICAL_THEMES || [], by = {};
  C.forEach((t) => { const k = t.last + (t.first ? ", " + t.first : ""); (by[k] = by[k] || []).push(t); });
  Object.keys(by).sort((a, b) => fold(a).localeCompare(fold(b))).forEach((k) => {
    const g = group(hbox, k, by[k].length);
    by[k].forEach((t) => g.ul.appendChild(row("theme", t.id, t.title, [t.movement, t.cat, "No. " + String(t.id).replace(/^0+/, "")].filter(Boolean).join(" · "), g.d, (c, s) => s.has("cmt-" + t.id))));
  });
  $("#td-themes-n").textContent = C.length.toLocaleString() + " themes by " + Object.keys(by).length + " composers";

  // ---- analysed scores that belong to a piece ----
  const abox = $("#td-analysed-list"), aul = el("ul", "td-list");
  ids.forEach((id) => (W[id].in && W[id].in.analysed || []).forEach((x) => aul.appendChild(row("analysed", x, W[id].title, x.piece, null, NONE))));
  if (aul.children.length) abox.appendChild(aul);

  // ---- MLT / JRI recordings (apps/shared/mlt/recordings.js), by CD; a name plays the track in place ----
  const mbox = $("#td-mlt-list"), R = window.MLTRecordings;
  if (mbox && R) {
    const mmss = (s) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
    R.collections.forEach((c) => {
      const list = R.list.filter((r) => r.col === c.id); if (!list.length) return;
      const g = group(mbox, c.title, list.length);
      list.forEach((r) => {
        const li = el("li", "td-row"), a = el("a", "td-play", "▶ " + r.title); a.href = R.url(r) || "#"; a.id = "rec-" + r.id;
        a.addEventListener("click", (e) => {
          e.preventDefault();
          const old = li.querySelector("audio"); if (old) { old.remove(); return; }
          const url = R.url(r); if (!url) { a.title = "The recordings are not online yet"; return; }
          document.querySelectorAll("#td-mlt-list audio").forEach((x) => x.remove());   // one at a time
          const au = document.createElement("audio"); au.controls = true; au.autoplay = true; au.src = url; li.appendChild(au);
        });
        li.appendChild(a);
        const sub = [c.title.replace(/^Jump Right In: /, "JRI "), (r.disc > 1 ? "disc " + r.disc + ", " : "") + "track " + r.track, r.page && "p. " + r.page, r.dur && mmss(r.dur)].filter(Boolean).join(" · ");
        li.appendChild(el("span", "td-sub", sub));
        if (c.note) li.title = c.note;
        rows.push({ el: li, text: fold(r.title + " " + sub + " " + c.title + " mlt " + (r.kind || "") + " " + (r.tonality || "") + " " + (r.meter || "") + " " + (r.key || "") + " " + (r.tune || []).join(" ")), group: g.d, music: NONE });
        g.ul.appendChild(li);
      });
    });
    $("#td-mlt-n").textContent = R.list.length.toLocaleString() + " recordings in " + R.collections.length + " collections";
  }

  // ---- Billboard songs, by decade; they open in Timestamp Notes ----
  // the filters a Billboard song can answer: Functions and Progression (and Tags / "has chords", trivially); anything else leaves it out
  const BB_OK = { functions: 1, chordProgression: 1, text: 1, hasChords: 1 };
  function bbMusic(s) {
    return (c) => Object.keys(c).every((k) => BB_OK[k] || c[k] == null || c[k] === "" || (Array.isArray(c[k]) && !c[k].length)) &&
      TuneLibrary.romanMatch(c, s.romans, s.romanSeq);
  }
  const bbox = $("#td-billboard-list");
  if (bbox) fetch("/apps/shared/data/billboard/index.json").then((r) => r.json()).then((all) => {
    const dec = {};
    all.forEach((s) => { const d = s.year ? Math.floor(s.year / 10) * 10 + "s" : "Undated"; (dec[d] = dec[d] || []).push(s); });
    Object.keys(dec).sort().forEach((d) => {
      const g = group(bbox, d, dec[d].length);
      dec[d].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" })).forEach((s) => {
        const li = el("li", "td-row"), a = el("a", null, s.title); a.href = "/tools/timestamp-notes.html?salami=" + s.id;
        li.appendChild(a);
        const sub = [s.artist, s.year, s.tonic && "in " + s.tonic, s.metre].filter(Boolean).join(" · ");
        li.appendChild(el("span", "td-sub", sub));
        if (s.romans && s.romans.length) { li.title = s.romans.join("  "); }
        rows.push({ el: li, text: fold(s.title + " " + sub + " billboard"), group: g.d, music: bbMusic(s) });
        g.ul.appendChild(li);
      });
    });
    $("#td-bb-n").textContent = all.length + " songs";
    filter();
  }).catch(() => { bbox.textContent = "The Billboard list could not be loaded."; });

  // ---- both filters ----
  const q = $("#td-q"), stat = $("#td-stat");
  let timer = 0;
  function filter() {
    const words = fold(q.value).split(/\s+/).filter(Boolean), on = words.length > 0 || !!musicCrit, groups = new Map();
    let shown = 0;
    rows.forEach((r) => {
      const ok = words.every((w) => r.text.includes(w)) && (!musicCrit || r.music(musicCrit, musicIds));
      r.el.hidden = !ok; if (ok) shown++;
      if (r.group) groups.set(r.group, (groups.get(r.group) || 0) + (ok ? 1 : 0));
    });
    groups.forEach((n, d) => {
      d.hidden = n === 0;
      d.__count.textContent = on ? n + " of " + d.__total : String(d.__total);
      if (on) d.open = n > 0 && n <= 40;
    });
    stat.textContent = on ? shown.toLocaleString() + " match" + (shown === 1 ? "" : "es") : "";
  }
  q.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(filter, 120); });
  q.addEventListener("keydown", (e) => { if (e.key === "Escape") { q.value = ""; filter(); } });

  // ---- Filter by music: the Tune Assessment's finder over the tunes and themes, built after first paint ----
  const FACETS = ["tags", "tonality", "meter", "key", "startDegree", "tonalPattern", "functions", "chordProgression", "rhythmPattern", "chords", "lyrics"];
  const active = (c) => Object.keys(c).some((k) => k !== "text" && c[k] != null && c[k] !== "" && !(Array.isArray(c[k]) && !c[k].length));
  const themeAbc = (t) => "X:1\nT:" + t.title + "\nC:" + t.first + " " + t.last + "\nM:" + t.meter + "\nL:" + t.unit +
    "\n%%id cmt-" + t.id + "\n%%key-fixed\nK:" + t.key + "\n" + t.body + "\n";
  const pick = $("#td-picker"), mstat = $("#td-music-status");
  let built = false;
  function buildPicker() {
    if (built || !pick || !window.TuneLibrary) return; built = true;
    mstat.textContent = "Reading " + (nTunes + C.length).toLocaleString() + " tunes and themes…";
    setTimeout(() => {
      const src = Object.assign({}, T); src["Classical themes"] = C.map(themeAbc).join("\n");
      TuneLibrary.build(src);
      TuneLibrary.renderPicker(pick, {
        facets: FACETS,
        onResults: (list, crit) => {
          musicCrit = active(crit) ? Object.assign({}, crit) : null;
          musicIds = musicCrit ? new Set(list.map((r) => r.id)) : null;
          filter();
        },
      });
      mstat.textContent = "";
    }, 30);
  }
  const det = $("#td-music");
  if (det) {
    det.addEventListener("toggle", () => { if (det.open) buildPicker(); });
    if (det.open) buildPicker();
  }

  // a #work-id link (from a 🎧 badge or another page's "Tune Directory →") opens and scrolls to that piece
  function go() {
    const id = decodeURIComponent(location.hash.slice(1)), card = id && document.getElementById(id);
    if (!card || !card.classList.contains("td-work")) return;
    if (q.value) { q.value = ""; filter(); }
    const sec = card.closest("section"); if (sec && sec.classList.contains("sf-shut")) { const h = sec.querySelector(":scope>h2"); if (h) h.click(); }
    card.scrollIntoView({ block: "start" }); card.classList.add("td-flash"); setTimeout(() => card.classList.remove("td-flash"), 1600);
  }
  window.addEventListener("hashchange", go);
  setTimeout(go, 200);
  $("#td-status").textContent = "";
})();
