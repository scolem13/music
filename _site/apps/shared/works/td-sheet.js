// td-sheet.js: the Tune Directory's spreadsheet (#td-sheet on practice/tune-directory.qmd): one row per tune, classical theme,
// piece in works-data.js that is neither, song in Words & Chords (SONG_INDEX, in works-data.js), and MLT / JRI recording not linked to a tune.
// COLUMNS (each hideable from "Columns", the choice kept in localStorage `td-sheet-cols`; Title can't be hidden): title, type,
// composer / artist, movement / part (a theme's movement), set / source (tune set, Classical Themes, Words & Chords, the CD, McGill /
// Isophonics, PDMX, Works), kind (a short list: recording kind, PDMX scoring), key, meter, year (composed, else published), print
// (e.g. "Cutler 12-3"), notation, recordings, bars marked (recordings with a timing map), chords, concepts. Each column filters (words
// match anywhere; in a number column ">0", "0", "2"; Kind is a list); quick boxes for "has recordings", "bars marked", "has notation",
// "has chords", "in a print anthology"; a click on a column name sorts by it (again: the other way). Shows 300 rows at a time.
// LINK RULE, one for the whole sheet: the title opens the piece's home on this site in the same tab (tune → Tune Library, theme →
// Classical Themes, song → Words & Chords, score → full-score player, Billboard / Isophonics → Timestamp Notes, recording → Recordings
// Catalogue). A row with no home of its own (type Piece, Work) opens its details under the row instead. ⏱ opens the row's first
// recording in Timestamp Notes, same tab. ▸ opens the details: the piece's Recordings & resources panel (every recording, playable),
// its concept uses, where it came from. Anything off the site opens in a new tab and is marked ↗ (`link()` below).
// GROUPS: the rows of one big piece (same composer surname + the catalogue number read from the title, else the theme's `cat`: K 550,
// BWV 1046, Op. 27 No. 2, Hob., D, RV, HWV, WoO, Sz, BB) become one parent row (type "Work": its numbers the sum of its rows, its title
// the words its rows' titles share), its rows folded under it (▸ / the title). "Group movements" turns it off (localStorage
// `td-sheet-group`, on by default). A filter keeps a parent when any of its rows matches and lists only those. `TdSheet.groups()` lists them.
// Reads what the page already loads: tunesObject, CLASSICAL_THEMES, WORKS (Works), MLTRecordings; the Billboard songs (apps/shared/data/billboard/index.json)
// are fetched and added as type "Billboard" rows (the Isophonics Beatles songs in the same index, src "iso", as type "Isophonics"); PDMX scores
// in their original scoring (apps/shared/data/pdmx/index.json) as type "Score"; converted ones open in the full-score player.
// CONCEPTS (works.js "Concept uses": apps/shared/works/uses/*.js, plus print-anthology figures that carry a concept / caption): a Concepts
// column (count, then the first names; filter by words in it) and two lists above the table: concept (grouped by source, those used only
// once in a last group; a label joined with ";" in the data counts as its separate concepts; names cut at 48 characters, the full name on
// hover) and source. A uses `work` id that is not in works-data.js becomes its own row (type Piece, "uses only").
// HOOKTHEORY and REAL BOOK songs (apps/shared/data/dir-songs/hooktheory.json, realbook.json, from scripts/dir-songs/build.py; year, genre and
// composer from MusicBrainz by scripts/dir-songs/enrich.py): types "Hooktheory" (13k songs of the Hooktheory / Sheet Sage set, tiers 1-2, no game or
// library music; composer / artist column = the artist) and "Real Book" (every title in the Real Book Catalogue: composer where an index names
// one, the books and pages in the Print column and the details). They have no home on the site, so the title opens the details; the Open column
// has ▶ YouTube (cued to the section), ♫ a Spotify search (no Spotify ids in the data), ♯ the TheoryTab page. The Genre column is MusicBrainz tags
// mapped onto the Pop Themes' genres (+ latin / christmas from the book); the Year of a Real Book song is the earliest recording MusicBrainz knows,
// not a publication date (hover). A row with no MusicBrainz match has no year / genre.
// SUSPECT TUNES: a tune in window.TUNE_QUALITY (apps/tunes/tune-quality.js, from scripts/tune-quality.mjs) or tagged needs-repair is left out
// until "show suspect tunes" is ticked; shown with ⚠ and the reasons on hover.
// The old per-type lists below the table start folded (the sheet has the same pieces); first visit only, then the reader's choice is kept.
(function () {
  "use strict";
  const host = document.getElementById("td-sheet-box"); if (!host) return;
  const fold = (s) => String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const W = window.WORKS || {}, R = window.MLTRecordings, Wk = window.Works;
  let teach = false; try { teach = localStorage.getItem("site-teacher") === "1"; } catch (e) {}
  const visible = (r) => !r.draft || teach;
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

  // the link rule: off-site = new tab + ↗; on-site = same tab
  const external = (u) => /^https?:/i.test(u || "") && !(u.indexOf(location.origin + "/") === 0);
  function link(url, text, attrs) {
    if (!url || url === "#") return esc(text);
    return external(url) ? `<a href="${esc(url)}" target="_blank" rel="noopener"${attrs || ""}>${esc(text)} ↗</a>` : `<a href="${esc(url)}"${attrs || ""}>${esc(text)}</a>`;
  }

  // the sections below the sheet start folded (section-fold.js reads this before it runs)
  try {
    if (!localStorage.getItem("td-folded-v1")) {
      const key = "section-fold:" + location.pathname; let st = {}; try { st = JSON.parse(localStorage.getItem(key) || "{}"); } catch (e) {}
      ["td-works", "td-print", "td-tunes", "td-themes", "td-mlt", "td-billboard", "td-isophonics", "td-analysed"].forEach((id) => { st[id] = 1; });
      localStorage.setItem(key, JSON.stringify(st)); localStorage.setItem("td-folded-v1", "1");
    }
  } catch (e) {}

  // ---- grouping keys ----
  const lastName = (s) => { s = String(s || "").trim(); return fold(s.indexOf(",") > 0 ? s.split(",")[0] : s.split(/\s+/).pop()).replace(/[^a-z]/g, ""); };
  // the number after Op. may come a few words later ("Op. 46, Orchestra, No. 1"), never across a full stop
  const CAT = /\b(KV|K|BWV|Op|Hob\.?\s*[IVXL]+:?|D|RV|HWV|WoO|Sz|BB)\.?\s*(\d+[a-z]?)(?:[^.;]{0,30}?,?\s*No\.?\s*(\d+))?/i;
  // a theme with no catalogue number: its title before the movement / theme ("Water Music, 3rd Movement" → "Water Music")
  const GENERIC = /^(concerto|sonata|sonatina|sonatine|symphony|octet|sextet|quintet|quartet|trio|suite|serenade|overture|dances?|prelude|fugue|invention|etude|nocturne|waltz|mazurka|march)$/i;
  const stemOf = (t) => String(t || "").replace(/,\s*(?:Orchestra|Opera|Piano|Ballet(?: Suite)?)(?=,)/gi, "").split(/,\s*(?:\d+(?:st|nd|rd|th) (?:Movement|Theme)|Theme [A-Z]\b|Overture|Intro|(?:Dance )?No\.\s*\d|(?:I|II|III|IV|V|VI|VII)\b)|:\s/i)[0].trim();
  // no catalogue number: composer + that stem, when it is not just a genre ("Water Music", "Mass in B minor"; the same song entered twice)
  const stemKey = (t) => { const st = stemOf(t); return st && !GENERIC.test(st) ? "t:" + fold(st).replace(/[^a-z0-9]+/g, " ").trim() : ""; };
  function catKey() {
    for (let i = 0; i < arguments.length; i++) {
      const m = CAT.exec(String(arguments[i] || "")); if (!m) continue;
      return m[1].toLowerCase().replace(/[.\s:]/g, "").replace(/^kv$/, "k") + m[2].toLowerCase() + (m[3] ? "-" + m[3] : "");
    }
    return "";
  }

  // ---- rows ----
  const rows = [];
  const PB = window.PRINT_BOOKS || {};
  const printOf = (w) => ((w && w.in && w.in.print) || []).map((x) => ((PB[x.book] || {}).short || x.book).split(",")[0] + ((PB[x.book] || {}).ref === "page" ? " p. " : " ") + x.fig).join(", ");
  const yearOf = (o) => (o && (o.composed || o.published)) || "";
  const blank = () => ({ suspect: "", genre: "", links: null, composer: "", part: "", set: "", kind: "", key: "", meter: "", year: "", print: "", notation: 0, recs: 0, timed: 0, chords: 0, tsn: null, cat: "" });
  const add = (r) => { rows.push(Object.assign(blank(), r)); };
  function worksRecs(kind, id) {
    const w = Wk && Wk.of(kind, id); if (!w) return [];
    return (w.recordings || []).filter(visible).map((r) => ({ timed: !!r.timing, tsn: Wk.tsnUrl ? Wk.tsnUrl(r, w) : null }));
  }
  const T = typeof tunesObject !== "undefined" ? tunesObject : {};   // eslint-disable-line no-undef
  Object.keys(T).forEach((set) => String(T[set]).split(/\n(?=X:)/).forEach((t) => {
    const id = (/^%%id\s+(\S+)/m.exec(t) || [])[1]; if (!id) return;
    const body = t.replace(/^[A-Za-z]:.*$/gm, "");
    const recs = worksRecs("tune", id).concat(R ? R.forTune(id).map((r) => ({ timed: !!r.timing, tsn: "/tools/timestamp-notes.html?rec=" + encodeURIComponent(r.id) + "&tune=" + encodeURIComponent(id) })) : []);
    const title = ((/^T:\s*(.*)$/m.exec(t) || [])[1] || "(untitled)").trim(), composer = ((/^C:\s*(.*)$/m.exec(t) || [])[1] || "").trim();
    add({ wid: (Wk && Wk.of("tune", id) || {}).id, title, type: "Tune", set, composer,
      key: ((/^K:\s*(\S+)/m.exec(t) || [])[1] || ""), meter: ((/^M:\s*(\S+)/m.exec(t) || [])[1] || ""), notation: 1,
      recs: recs.length, timed: recs.filter((r) => r.timed).length, chords: /"\^?[A-G][#b]?[^"]*"/.test(body) ? 1 : 0,
      suspect: (window.TUNE_QUALITY || {})[id] ? (window.TUNE_QUALITY[id].r || []).join("; ") : /^%%tags.*\bneeds-repair\b/m.test(t) ? "needs repair" : "",
      href: "/practice/tunes.html?tune=" + encodeURIComponent(id), tsn: (recs.find((r) => r.timed) || recs[0] || {}).tsn || null, id, cat: catKey(title) });
  }));
  (window.CLASSICAL_THEMES || []).forEach((t) => {
    const recs = worksRecs("theme", t.id); if (t.yt) recs.push({ timed: false, tsn: "/tools/timestamp-notes.html?v=" + encodeURIComponent(t.yt) });
    add({ wid: (Wk && Wk.of("theme", t.id) || {}).id, title: t.title, type: "Theme", composer: [t.last, t.first].filter(Boolean).join(", "), part: t.movement || "",
      set: "Classical Themes" + (t.cat ? " · " + t.cat : ""),
      key: (t.key || "") + (t.minor && !/m$/.test(t.key || "") ? "m" : ""), meter: t.meter || "", notation: 1, recs: recs.length, timed: recs.filter((r) => r.timed).length,
      year: yearOf(t) || yearOf(Wk && Wk.of("theme", t.id)), print: printOf(Wk && Wk.of("theme", t.id)),
      bar: t.bar, href: "/tools/classical-themes.html?theme=" + encodeURIComponent(t.id), tsn: (recs[0] || {}).tsn || null, id: t.id, cat: catKey(t.title, t.cat) || stemKey(t.title), stem: stemOf(t.title), catLabel: t.cat || "" });
  });
  Object.keys(W).forEach((wid) => {
    const w = W[wid], inn = w.in || {};
    if ((inn.tune || []).length || (inn.theme || []).length) return;     // listed under its tune or theme
    const recs = (w.recordings || []).filter(visible);
    add({ wid: wid, title: w.title, type: "Piece", composer: w.composer || "", set: w.jri ? "JRI" : "Works", from: w.from || "",
      key: (w.jri && w.jri.key) || "", meter: w.jri ? [w.jri.tonality, w.jri.meter].filter(Boolean).join(" ") : "", year: yearOf(w), print: printOf(w),
      notation: (inn.analysed || []).length || (inn.score || []).length ? 1 : 0,
      recs: recs.length, timed: recs.filter((r) => r.timing).length, href: null,
      tsn: recs.length && Wk.tsnUrl ? Wk.tsnUrl(recs[0], Object.assign({ id: wid }, w)) : null, id: wid, cat: catKey(w.title) || stemKey(w.title), stem: stemOf(w.title) });
  });
  (window.SONG_INDEX || []).forEach((g) => {                           // Words & Chords (songs/index.qmd), list from scripts/songs/build.py
    add({ title: g.title, type: "Song", set: "Words & Chords", composer: g.artist || g.first || "", key: g.key || "", meter: g.time || "",
      chords: g.chords ? 1 : 0, href: "/songs/?id=" + encodeURIComponent(g.id), id: g.id });
  });
  if (R) R.list.forEach((r) => {
    if (r.tune && r.tune.length) return;                                  // counted with its tune
    const col = R.collections.find((c) => c.id === r.col) || {};
    add({ title: r.title, type: "Recording", set: (col.title || r.col).replace(/^Jump Right In: /, "JRI "), kind: r.kind ? R.KINDS[r.kind] || r.kind : "",
      key: r.key || "", meter: [r.tonality, r.meter].filter(Boolean).join(" "), recs: 1, timed: r.timing ? 1 : 0,
      href: "/mlt/recordings.html?find=" + encodeURIComponent(r.id), tsn: "/tools/timestamp-notes.html?rec=" + encodeURIComponent(r.id), id: r.id,
      qt: ((/^["\u201c]([^"\u201d]{2,60})["\u201d]/.exec(r.title) || [])[1] || "").trim(), col: r.col });
  });
  const noUses = () => ({ uses: [], nconc: 0, concepts: "", cset: new Set(), sset: new Set() });

  // Billboard songs (McGill): added when the index arrives
  const bbReady = fetch("/apps/shared/data/billboard/index.json").then((r) => r.json()).then((all) => {
    all.forEach((g) => { const iso = g.src === "iso"; add(Object.assign({ title: g.title, type: iso ? "Isophonics" : "Billboard", composer: g.artist || "",
      set: iso ? "Isophonics · " + (g.album || "") : "McGill Billboard", key: g.tonic || "", meter: g.metre || "",
      year: g.year || "", chords: 1, href: "/tools/timestamp-notes.html?salami=" + g.id, tsn: "/tools/timestamp-notes.html?salami=" + g.id, id: g.id }, noUses())); });
  }).catch(() => {});
  // PDMX scores judged to be in the piece's original scoring (scripts/pdmx/build.mjs): type "Score"; converted ones open in the full-score player
  const pdReady = fetch("/apps/shared/data/pdmx/index.json").then((r) => r.json()).then((all) => {
    all.forEach((g) => { const title = g.title.replace(/^[^:]+:\s*/, ""); add(Object.assign({ title, type: "Score", composer: g.composer || "", set: "PDMX", kind: g.scoring || "",
      tip: "PDMX · " + (g.arranger ? "arr. " + g.arranger : "original scoring?") + " " + Math.round(g.conf * 100) + "%" + (g.converted ? "" : " · MusicXML only, not on the site"),
      notation: g.converted ? 1 : 0, href: g.converted ? "/theory/analysed-scores/full-scores.html?id=" + g.id : null, id: g.id, cat: catKey(g.title) || stemKey(title), stem: stemOf(title) }, noUses())); });
  }).catch(() => {});
  // Hooktheory songs and Real Book titles (scripts/dir-songs/build.py)
  const sp = (q) => "https://open.spotify.com/search/" + encodeURIComponent(q);
  const genreText = (g) => (g || []).join(" · ");
  const htReady = fetch("/apps/shared/data/dir-songs/hooktheory.json").then((r) => r.json()).then((all) => {
    all.forEach((g) => {
      const links = []; if (g.y) links.push({ t: "▶", u: "https://www.youtube.com/watch?v=" + g.y + (g.s ? "&t=" + g.s + "s" : ""), tip: "YouTube, cued to the section" });
      links.push({ t: "♫", u: sp(g.a + " " + g.t), tip: "Search Spotify" }, { t: "♯", u: "https://www.hooktheory.com/theorytab/view/" + g.h, tip: "Hooktheory TheoryTab" });
      add(Object.assign({ title: g.t, type: "Hooktheory", composer: g.a, set: "Hooktheory", genre: genreText(g.g), key: g.k || "", meter: g.m || "",
        year: g.yr || "", chords: 1, notation: 0, links, htRow: g, id: g.h }, noUses()));
    });
  }).catch(() => {});
  const rbReady = fetch("/apps/shared/data/dir-songs/realbook.json").then((r) => r.json()).then((d) => {
    d.songs.forEach((g) => {
      const books = g.bk || [], vols = (g.sf || []).map((v) => (d.vols[v] || "Real Book " + v).replace(/^The /, ""));
      add(Object.assign({ title: g.t, type: "Real Book", composer: g.c || (g.a || []).join(", "), genre: genreText(g.g),
        set: books.length ? books[0][0] + (books.length > 1 ? " +" + (books.length - 1) : "") : vols.length ? "Songfinder" : "Real Book",
        year: g.yr || "", print: books.map((b) => b[0] + " p. " + b[1]).join(", "), chords: 1,
        links: [{ t: "♫", u: sp(g.t + (g.c ? " " + g.c.split(";")[0] : "")), tip: "Search Spotify" }, { t: "▶", u: "https://www.youtube.com/results?search_query=" + encodeURIComponent(g.t + " " + (g.c || "").split(";")[0]), tip: "Search YouTube" }],
        rbRow: g, rbVols: vols, id: g.t, tip: g.cm ? "Composer from MusicBrainz, not the book" : "" }, noUses()));
    });
  }).catch(() => {});
  const ready = Promise.all([bbReady, pdReady, htReady, rbReady]);

  // ---- concepts: uses/*.js and print figures with a concept ----
  const uses = Wk && Wk.usesAll ? Wk.usesAll() : [];
  Object.keys(W).forEach((wid) => { if (Wk && Wk.printUses) Array.prototype.push.apply(uses, Wk.printUses(Object.assign({ id: wid }, W[wid]))); });
  const byWork = {}; uses.forEach((u) => { (byWork[u.work] = byWork[u.work] || []).push(u); });
  Object.keys(byWork).filter((wid) => !W[wid]).forEach((wid) => {      // a work only the uses know: its own row
    const u = byWork[wid][0];
    add({ wid: wid, title: u.title || wid, type: "Piece", composer: u.composer || "", set: u.label || u.src || "", from: "uses only", href: u.url || null, id: wid, cat: catKey(u.title) || stemKey(u.title), stem: stemOf(u.title) });
  });
  const conceptKey = (c) => fold(c).trim();
  const split = (c) => String(c || "").split(/\s*;\s*/).map((s) => s.trim()).filter(Boolean);
  const conceptName = {}, srcName = {}, conceptN = {}, conceptSrc = {};
  uses.forEach((u) => split(u.concept).forEach((c) => {
    const k = conceptKey(c); conceptN[k] = (conceptN[k] || 0) + 1; conceptName[k] = conceptName[k] || c;
    (conceptSrc[k] = conceptSrc[k] || {})[u.src] = 1;
  }));
  rows.forEach((r) => {
    r.uses = r.wid ? byWork[r.wid] || [] : [];
    const names = []; r.uses.forEach((u) => split(u.concept).forEach((c) => { if (names.indexOf(c) < 0) names.push(c); }));
    r.nconc = names.length; r.concepts = names.join("; ");
    r.cset = new Set(names.map(conceptKey)); r.sset = new Set(r.uses.map((u) => u.src));
    r.uses.forEach((u) => { srcName[u.src] = u.label || u.src; });
  });

  // ---- groups (rebuilt when the fetched rows arrive) ----
  let groups = [];
  function regroup() {
    const by = {};
    rows.forEach((r) => { delete r.g; if (!r.cat || !r.composer) return; const k = lastName(r.composer) + "|" + r.cat; (by[k] = by[k] || []).push(r); });
    // a row with no catalogue number ("Symphony No. 1: I", a score) joins the one catalogued piece of that composer whose rows start
    // the same way ("Symphony No. 1, in C, Op. 21, …"); only when the start has a number in it and points at one piece
    const short = (t) => { const x = fold(t).split(/,|:| - |\(| in [a-g]\b/)[0].trim(); return /\d/.test(x) && x.length >= 8 ? x : ""; };
    const home = {};
    Object.keys(by).forEach((k) => { if (k.indexOf("|t:") > 0) return; by[k].forEach((r) => { const sh = short(r.title); if (!sh) return; const h = k.split("|")[0] + "|" + sh; (home[h] = home[h] || new Set()).add(k); }); });
    Object.keys(by).filter((k) => k.indexOf("|t:") > 0).forEach((k) => {
      const keep = [];
      by[k].forEach((r) => { const h = home[k.split("|")[0] + "|" + short(r.title)]; if (h && h.size === 1) by[[...h][0]].push(r); else keep.push(r); });
      if (keep.length) by[k] = keep; else delete by[k];
    });
    // MLT recordings named for a tune ('"Riverside" Improvisation Skill 5 - Example'): one parent per quoted title and CD, joined by the
    // tune or piece of that title when the sheet has one
    const inBy = new Set(); Object.keys(by).forEach((k) => by[k].forEach((r) => inBy.add(r)));
    const byTitle = {}; rows.forEach((r) => { if ((r.type === "Tune" || r.type === "Piece") && !inBy.has(r)) (byTitle[fold(r.title).replace(/[^a-z0-9]+/g, " ").trim()] = byTitle[fold(r.title).replace(/[^a-z0-9]+/g, " ").trim()] || []).push(r); });
    const rq = {}; rows.forEach((r) => { if (r.type !== "Recording" || !r.qt) return; const t = fold(r.qt).replace(/[^a-z0-9]+/g, " ").trim(); (rq[t + "|" + r.col] = rq[t + "|" + r.col] || []).push(r); r.stem = r.qt; });
    Object.keys(rq).forEach((k) => { const t = k.split("|")[0]; by["rq|" + k] = rq[k].concat(byTitle[t] || []); (byTitle[t] || []).forEach((r) => { r.stem = r.stem || r.title; }); delete byTitle[t]; });
    groups = Object.keys(by).filter((k) => by[k].length > 1).map((k) => {
      const kids = by[k];
      // its title: the rows' titles cut after the catalogue number, the commonest (then shortest) one; a theme stem as it is
      const cand = {}; kids.forEach((r) => { const m = CAT.exec(r.title); const t = m ? r.title.slice(0, m.index + m[0].length).replace(/[\s,;:(]+$/, "") : r.stem ? r.stem + (r.catLabel && k.indexOf("|t:") < 0 ? ", " + r.catLabel : "") : ""; if (t) cand[t] = (cand[t] || 0) + 1; });
      const title = Object.keys(cand).sort((a, b) => cand[b] - cand[a] || a.length - b.length)[0] || (kids[0].title + " …");
      const sum = (f) => kids.reduce((a, r) => a + (r[f] || 0), 0);
      const tn = {}; kids.forEach((r) => { tn[r.type] = (tn[r.type] || 0) + 1; });
      const names = []; kids.forEach((r) => split(r.concepts).forEach((c) => { if (names.indexOf(c) < 0) names.push(c); }));
      const yrs = kids.map((r) => parseInt(r.year, 10)).filter((y) => y > 0);
      const g = { gkey: k, isGroup: 1, kids, title, type: "Work", composer: kids[0].composer, part: kids.length + " rows",
        set: Object.keys(tn).map((t) => tn[t] + " " + t.toLowerCase() + (tn[t] > 1 ? "s" : "")).join(" · "), kind: "", key: kids[0].key, meter: "",
        year: yrs.length ? Math.min.apply(null, yrs) : "", print: [...new Set(kids.map((r) => r.print).filter(Boolean))].join(", "),
        notation: kids.some((r) => r.notation) ? 1 : 0, recs: sum("recs"), timed: sum("timed"), chords: kids.some((r) => r.chords) ? 1 : 0,
        nconc: names.length, concepts: names.join("; "), cset: new Set(names.map(conceptKey)), sset: new Set(kids.flatMap((r) => [...r.sset])),
        uses: [], href: null, tsn: (kids.find((r) => r.timed && r.tsn) || kids.find((r) => r.tsn) || {}).tsn || null };
      kids.forEach((r) => { r.g = g; });
      return g;
    });
  }
  regroup();

  // ---- table ----
  const TYPES = ["Tune", "Theme", "Piece", "Score", "Song", "Billboard", "Isophonics", "Hooktheory", "Real Book", "Recording"];
  const COLS = [
    { k: "title", label: "Title", fixed: 1 }, { k: "type", label: "Type", chips: TYPES }, { k: "composer", label: "Composer / artist" }, { k: "genre", label: "Genre", w: "6rem" },
    { k: "part", label: "Movement / part" }, { k: "set", label: "Set / source" }, { k: "kind", label: "Kind", sel: [] },
    { k: "key", label: "Key", w: "4rem" }, { k: "meter", label: "Meter", w: "5rem" },
    { k: "year", label: "Year", num: 1, w: "4.5rem", ph: "<1800" }, { k: "print", label: "Print", w: "6rem" },
    { k: "notation", label: "Notation", yn: 1 }, { k: "recs", label: "Recordings", num: 1 }, { k: "timed", label: "Bars marked", num: 1 }, { k: "chords", label: "Chords", yn: 1 },
    { k: "concepts", label: "Concepts", sortk: "nconc", w: "8rem" }
  ];
  const HIDE_DEFAULT = ["print", "meter", "chords", "kind"];
  let hidden; try { hidden = new Set(JSON.parse(store.get("td-sheet-cols") || "null") || HIDE_DEFAULT); } catch (e) { hidden = new Set(HIDE_DEFAULT); }
  let grouped = store.get("td-sheet-group") !== "0";
  const head = COLS.map((c) => `<th data-k="${c.sortk || c.k}" title="Sort">${c.label} <span class="tds-arrow"></span></th>`).join("") + "<th>Open</th>";
  const filt = COLS.map((c) => `<th>${c.chips ? "" : c.sel ? `<select data-f="${c.k}"><option value="">all</option></select>` :
    c.yn ? `<select data-f="${c.k}"><option value="">all</option><option value="1">yes</option><option value="0">no</option></select>` :
    `<input data-f="${c.k}" placeholder="${c.ph || (c.num ? ">0" : "filter")}" ${c.w ? `style="width:${c.w}"` : ""}>`}</th>`).join("") + "<th></th>";
  const opt = (v, t, n) => { const s = t.length > 48 ? t.slice(0, 47) + "…" : t; return `<option value="${esc(v)}"${s !== t ? ` title="${esc(t)}"` : ""}>${esc(s)}${n ? " (" + n + ")" : ""}</option>`; };
  const byName = (a, b) => fold(conceptName[a]).localeCompare(fold(conceptName[b]));
  const ck = Object.keys(conceptName), rare = ck.filter((k) => conceptN[k] < 2).sort(byName);
  const conceptOpts = Object.keys(srcName).sort((a, b) => fold(srcName[a]).localeCompare(fold(srcName[b]))).map((s) => {
    const list = ck.filter((k) => conceptN[k] >= 2 && conceptSrc[k][s]).sort(byName);
    return list.length ? `<optgroup label="${esc(srcName[s])}">${list.map((k) => opt(k, conceptName[k], conceptN[k])).join("")}</optgroup>` : "";
  }).join("") + (rare.length ? `<optgroup label="Used once">${rare.map((k) => opt(k, conceptName[k])).join("")}</optgroup>` : "");
  const srcOpts = Object.keys(srcName).sort().map((k) => opt(k, srcName[k])).join("");
  const colBoxes = COLS.filter((c) => !c.fixed).map((c) => `<label><input type="checkbox" data-col="${c.k}"${hidden.has(c.k) ? "" : " checked"}> ${c.label}</label>`).join(" ");
  host.innerHTML = `<div class="tds-chips" role="group" aria-label="Types"></div>
    ${ck.length ? `<div class="tds-quick"><label>Concept <select data-cf="concept"><option value="">any</option>${conceptOpts}</select></label>
    <label>Source <select data-cf="src"><option value="">any</option>${srcOpts}</select></label></div>` : ""}
    <div class="tds-quick"><label><input type="checkbox" data-q="recs"> has recordings</label> <label><input type="checkbox" data-q="timed"> bars marked</label>
    <label><input type="checkbox" data-q="notation"> has notation</label>
    <label><input type="checkbox" data-q="chords"> has chords</label> <label><input type="checkbox" data-q="print"> in a print anthology</label>
    <label title="Rows of one piece (movements, themes, scores) under one row"><input type="checkbox" class="tds-group"${grouped ? " checked" : ""}> group movements</label>
    <label title="Tunes whose ABC is predicted to be bad (wrong key, bars that do not add up, import junk, chords that do not fit the melody): scripts/tune-quality.mjs"><input type="checkbox" class="tds-sus"> show suspect tunes <span class="tds-susn"></span></label>
    <details class="tds-cols"><summary>Columns</summary><div>${colBoxes}</div></details>
    <button type="button" class="tds-reset">Clear filters</button> <span class="tds-n"></span></div>
    <style class="tds-colhide"></style>
    <div class="tds-wrap"><table class="tds"><thead><tr>${head}</tr><tr class="tds-f">${filt}</tr></thead><tbody></tbody></table></div><button type="button" class="tds-more" hidden>Show more</button>`;
  const tbody = host.querySelector("tbody"), more = host.querySelector(".tds-more"), colStyle = host.querySelector(".tds-colhide");
  function applyCols() {
    colStyle.textContent = COLS.map((c, i) => (hidden.has(c.k) ? `#td-sheet-box .tds tr:not(.tds-detail) > :nth-child(${i + 1}) { display: none; }` : "")).join("\n");
  }
  applyCols();
  host.querySelectorAll("[data-col]").forEach((x) => x.addEventListener("change", () => {
    if (x.checked) hidden.delete(x.dataset.col); else hidden.add(x.dataset.col);
    store.set("td-sheet-cols", JSON.stringify([...hidden])); applyCols();
  }));
  function kindOpts() {
    const s = host.querySelector('select[data-f="kind"]'), v = s.value, ks = [...new Set(rows.map((r) => r.kind).filter(Boolean))].sort();
    s.innerHTML = `<option value="">all</option>` + ks.map((k) => `<option>${esc(k)}</option>`).join(""); s.value = v;
  }
  let sortK = "title", sortDir = 1, shown = 300;
  const typeOn = new Set(), chipBox = host.querySelector(".tds-chips");      // empty set = every type
  const typeN = {}; function chips() {
    Object.keys(typeN).forEach((k) => delete typeN[k]); rows.forEach((r) => { typeN[r.type] = (typeN[r.type] || 0) + 1; });
    chipBox.innerHTML = `<button type="button" class="tds-chip${typeOn.size ? "" : " on"}" data-t="">All <span>${rows.length.toLocaleString()}</span></button>` +
      TYPES.filter((t) => typeN[t]).map((t) => `<button type="button" class="tds-chip${typeOn.has(t) ? " on" : ""}" data-t="${t}" aria-pressed="${typeOn.has(t)}">${t} <span>${typeN[t].toLocaleString()}</span></button>`).join("");
  }
  chipBox.addEventListener("click", (e) => {
    const b = e.target.closest("[data-t]"); if (!b) return;
    if (!b.dataset.t) typeOn.clear(); else if (typeOn.has(b.dataset.t)) typeOn.delete(b.dataset.t); else typeOn.add(b.dataset.t);
    chips(); draw();
  });
  let curList = [];        // what is drawn: {r, child}
  const openKids = new Set();

  function numOk(v, f) {
    const m = /^\s*(>=|<=|>|<|=)?\s*(\d+)\s*$/.exec(f); if (!m) return true;
    const n = +m[2]; v = +v || 0; return m[1] === ">" ? v > n : m[1] === "<" ? v < n : m[1] === ">=" ? v >= n : m[1] === "<=" ? v <= n : v === n;
  }
  // the matching rows (leaves), sorted
  function filtered() {
    const f = {}; host.querySelectorAll("[data-f]").forEach((x) => { if (x.value.trim()) f[x.dataset.f] = x.value.trim(); });
    const cf = {}; host.querySelectorAll("[data-cf]").forEach((x) => { cf[x.dataset.cf] = x.value; });
    const q = {}; host.querySelectorAll("[data-q]").forEach((x) => { q[x.dataset.q] = x.checked; });
    const showSus = host.querySelector(".tds-sus").checked;
    const sq = fold((document.getElementById("td-q") || {}).value || "").split(/\s+/).filter(Boolean);
    const list = rows.filter((r) => {
      if (r.suspect && !showSus) return false;
      if (sq.length) { const hay = fold([r.title, r.composer, r.genre, r.part, r.set, r.kind, r.concepts, r.print].join(" ")); if (!sq.every((w) => hay.indexOf(w) >= 0)) return false; }
      if (q.recs && !r.recs) return false; if (q.timed && !r.timed) return false; if (q.notation && !r.notation) return false;
      if (q.chords && !r.chords) return false; if (q.print && !r.print) return false;
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
    return sortRows(list);
  }
  function sortRows(list) {
    const col = COLS.find((c) => (c.sortk || c.k) === sortK);
    return list.sort((a, b) => {
      const x = a[sortK], y = b[sortK];
      const d = col.num || col.yn || col.sortk ? (+x || 0) - (+y || 0) : fold(x).localeCompare(fold(y), undefined, { numeric: true });
      return d * sortDir || fold(a.title).localeCompare(fold(b.title), undefined, { numeric: true });
    });
  }
  // leaves → what is drawn: a group's matching rows go under its parent row, which is sorted with the rest
  function display(list) {
    if (!grouped) return list.map((r) => ({ r }));
    const seen = new Map(), top = [];
    list.forEach((r) => {
      if (!r.g) { top.push(r); return; }
      if (!seen.has(r.g)) { seen.set(r.g, []); top.push(r.g); }
      seen.get(r.g).push(r);
    });
    const out = [];
    sortRows(top).forEach((r) => {
      out.push({ r, n: r.isGroup ? seen.get(r).length : 0 });
      if (r.isGroup) seen.get(r).sort((a, b) => fold(a.title).localeCompare(fold(b.title), undefined, { numeric: true })).forEach((k) => out.push({ r: k, child: r }));
    });
    return out;
  }
  const hasDetail = (r) => !r.isGroup && (r.uses.length || r.from || (r.wid && W[r.wid]) || r.htRow || r.rbRow);
  function titleCell(r, n) {
    if (r.isGroup) return `<button type="button" class="tds-kids" aria-expanded="${openKids.has(r.gkey)}" title="Show its rows">${openKids.has(r.gkey) ? "▾" : "▸"}</button> <a href="#" class="tds-kids-t"><b>${esc(r.title)}</b></a> <span class="tds-dim">(${n}${n < r.kids.length ? " of " + r.kids.length : ""})</span>`;
    const btn = hasDetail(r) ? `<button type="button" class="tds-open" aria-expanded="false" title="Details: recordings, uses, source">▸</button> ` : "";
    const t = r.href ? link(r.href, r.title) : hasDetail(r) ? `<a href="#" class="tds-det">${esc(r.title)}</a>` : esc(r.title);
    return btn + t;
  }
  const sq0 = () => ((document.getElementById("td-q") || {}).value || "").trim();
  function draw(keep) {
    if (!keep) shown = 300;
    const leaves = filtered(), all = display(leaves);
    let top = 0; const vis = [];
    for (const e of all) { if (!e.child) { if (top >= shown) break; top++; } if (!e.child || openKids.has(e.child.gkey)) vis.push(e); }
    curList = vis;
    tbody.innerHTML = vis.map((e, i) => { const r = e.r; return `<tr data-i="${i}"${e.child ? ` class="tds-child" data-g="${esc(e.child.gkey)}"` : r.isGroup ? ` class="tds-parent" data-g="${esc(r.gkey)}"` : ""}>
      <td>${titleCell(r, e.n)}${r.suspect ? ` <span class="tds-sus-tag" title="${esc("Predicted bad ABC: " + r.suspect)}">⚠</span>` : ""}</td><td>${r.type}</td><td>${esc(r.composer)}</td><td class="tds-dim">${esc(r.genre)}</td><td class="tds-dim">${esc(r.part)}</td><td class="tds-dim">${esc(r.set)}</td>
      <td class="tds-dim"${r.tip ? ` title="${esc(r.tip)}"` : ""}>${esc(r.kind)}</td>
      <td>${esc(r.key)}</td><td>${esc(r.meter)}</td><td class="tds-c"${r.year && r.type === "Real Book" ? ' title="The earliest recording MusicBrainz knows, not a publication date"' : ""}>${esc(r.year || "")}</td><td class="tds-dim">${esc(r.print || "")}</td><td class="tds-c">${r.notation ? "✓" : ""}</td><td class="tds-c">${r.recs || ""}</td>
      <td class="tds-c">${r.timed ? "✓" + (r.timed > 1 ? " " + r.timed : "") : r.recs ? "–" : ""}</td><td class="tds-c">${r.chords ? "✓" : ""}</td>
      <td class="tds-con" title="${esc(r.concepts)}">${r.nconc ? `<b>${r.nconc}</b> ` + esc(r.concepts.split("; ").slice(0, 2).join("; ")) + (r.nconc > 2 ? "…" : "") : ""}</td>
      <td>${(r.links || []).map((l) => `<a href="${esc(l.u)}" target="_blank" rel="noopener" title="${esc(l.tip)} ↗">${l.t}</a>`).join(" ")}${r.tsn ? `<a href="${esc(r.tsn)}" title="Open ${r.recs > 1 ? "the first of " + r.recs + " recordings" : "it"} in Timestamp Notes${r.recs > 1 ? " (▸ lists them all)" : ""}">⏱</a>` : ""}</td></tr>`; }).join("");
    more.hidden = top >= all.filter((e) => !e.child).length;
    const st = document.getElementById("td-stat"); if (st && sq0()) st.textContent = leaves.length.toLocaleString() + " match" + (leaves.length === 1 ? "" : "es");
    host.querySelector(".tds-n").textContent = leaves.length.toLocaleString() + " of " + rows.length.toLocaleString() + " rows";
    host.querySelectorAll("th[data-k] .tds-arrow").forEach((s) => { s.textContent = s.parentNode.dataset.k === sortK ? (sortDir > 0 ? "▲" : "▼") : ""; });
  }
  function detail(r) {
    const box = document.createElement("div");
    if (r.from) { const p = document.createElement("p"); p.className = "td-note"; p.textContent = r.from === "uses only" ? "Known only from the teaching sources below." : "From: " + r.from; box.appendChild(p); }
    const line = (t) => { const p = document.createElement("p"); p.className = "td-note"; p.textContent = t; box.appendChild(p); };
    if (r.htRow) {
      const g = r.htRow;
      line("Hooktheory TheoryTab: " + g.n + " section" + (g.n > 1 ? "s" : "") + (g.x && g.x.length ? " (" + g.x.join(", ") + ")" : "") + (g.b ? ", about " + g.b + " bpm" : "") + ". Key and meter are the best section's.");
      line("Data: Hooktheory / Sheet Sage (CC BY-NC-SA 3.0). Year = earliest matching release on MusicBrainz; genre from its tags.");
    }
    if (r.rbRow) {
      const g = r.rbRow;
      if (g.bk && g.bk.length) line("In: " + g.bk.map((b) => b[0] + " p. " + b[1]).join("; "));
      if (r.rbVols.length) line("Hal Leonard Songfinder: " + r.rbVols.join("; "));
      if (g.f) line("Film: " + g.f);
      line("Year = the earliest recording MusicBrainz knows (not the date written); genre from its tags and the book. A common title can match the wrong song.");
    }
    const w = r.wid && W[r.wid];
    if (w && Wk && Wk.panel) box.appendChild(Wk.panel(Object.assign({ id: r.wid }, w), null));
    else if (r.uses.length && Wk) box.appendChild(Wk.usesList(r.uses));
    return box;
  }
  function toggleDetail(tr) {
    const b = tr.querySelector(".tds-open"), next = tr.nextElementSibling;
    if (next && next.classList.contains("tds-detail")) { next.remove(); if (b) { b.textContent = "▸"; b.setAttribute("aria-expanded", "false"); } return; }
    const r = curList[+tr.dataset.i].r, d = document.createElement("tr"), td = document.createElement("td");
    d.className = "tds-detail"; td.colSpan = COLS.length + 1; td.appendChild(detail(r)); d.appendChild(td); tr.after(d);
    if (b) { b.textContent = "▾"; b.setAttribute("aria-expanded", "true"); }
  }
  tbody.addEventListener("click", (e) => {
    const tr = e.target.closest("tr"); if (!tr || tr.classList.contains("tds-detail")) return;
    if (e.target.closest(".tds-kids, .tds-kids-t")) { e.preventDefault(); const g = tr.dataset.g; if (openKids.has(g)) openKids.delete(g); else openKids.add(g); draw(true); return; }
    if (e.target.closest(".tds-open, .tds-det")) { e.preventDefault(); toggleDetail(tr); }
  });
  const nSus = rows.filter((r) => r.suspect).length; host.querySelector(".tds-susn").textContent = nSus ? "(" + nSus.toLocaleString() + " hidden)" : "";
  host.querySelector(".tds-sus").addEventListener("change", () => draw());
  host.querySelector(".tds-group").addEventListener("change", (e) => { grouped = e.target.checked; store.set("td-sheet-group", grouped ? "1" : "0"); draw(); });
  host.querySelectorAll("th[data-k]").forEach((th) => th.addEventListener("click", () => {
    if (sortK === th.dataset.k) sortDir = -sortDir; else { sortK = th.dataset.k; const c = COLS.find((c) => (c.sortk || c.k) === sortK); sortDir = c.num || c.sortk ? -1 : 1; }
    draw();
  }));
  let tmr = 0;
  host.querySelectorAll("[data-f],[data-q],[data-cf]").forEach((x) => x.addEventListener(x.tagName === "INPUT" && x.type !== "checkbox" ? "input" : "change", () => { clearTimeout(tmr); tmr = setTimeout(draw, 150); }));
  const topq = document.getElementById("td-q"); if (topq) { topq.addEventListener("input", () => { clearTimeout(tmr); tmr = setTimeout(draw, 150); }); topq.addEventListener("keydown", (e) => { if (e.key === "Escape") setTimeout(draw, 0); }); }
  host.querySelector(".tds-reset").addEventListener("click", () => { host.querySelectorAll("[data-f]").forEach((x) => { x.value = ""; }); if (topq) topq.value = ""; host.querySelectorAll("[data-q]").forEach((x) => { x.checked = false; }); host.querySelectorAll("[data-cf]").forEach((x) => { x.value = ""; }); typeOn.clear(); chips(); draw(); });
  more.addEventListener("click", () => { shown += 300; draw(true); });
  kindOpts(); chips(); draw();
  ready.then(() => { regroup(); kindOpts(); chips(); draw(true); });
  window.TdSheet = { rows: () => rows, filtered, ready, groups: () => groups, link, catKey };
})();
