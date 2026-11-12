// Classical Themes page (tools/classical-themes.qmd): 2,067 themes of Barlow & Morgenstern's Dictionary of Musical Themes from the
// Musical Theme Dataset (MTD, CC BY 4.0), in apps/themes/themes-data.js (scripts/convert-mtd.py, then scripts/import-themes.mjs).
// Filters are the Tune Assessment's own finder (TuneLibrary.renderPicker over the themes: composer as the tag,
// tonality, meter, key, starts on, tonal pattern, rhythm patterns), so they read the ABC the same way.
// The page adds: a sort on up to three keys, how many themes to show at a time (or all), columns, and Play.
// Cards are drawn only when they scroll near the screen, so "All" stays usable.
// The same script runs Pop Themes (tools/pop-themes.qmd: three collections, BiMMuDa's 1,104 section melodies of the Billboard year-end
// top-5 singles 1950-2022, CoCoPops' 793 (Billboard Hot 100 songs 1958-1991) and the RS200's 514 (Rolling Stone's list), in
// apps/themes/pop-themes-data.js from scripts/convert-bimmuda.py, scripts/convert-cocopops.py + `node scripts/import-themes.mjs --set pop`)
// when that page sets window.POP_THEMES: artist for composer, collection / year / section / decade / genre filters, BiMMuDa's melody
// statistics as sorts (the other collections have none: they sort last), chords (CoCoPops and RS200: from the corpus itself; BiMMuDa: a
// Billboard analysis where one fits, scripts/bimmuda-salami.mjs) in place of Roman numerals. A song in several collections links to the
// others (?song=<grp>), and one with a McGill Billboard id to its Timestamp Notes view (?salami=<id>).
(function () {
  "use strict";
  const POP = !!window.POP_THEMES;
  const T = (POP ? window.POP_THEMES : window.CLASSICAL_THEMES) || [];
  const root = document.getElementById("ct-root");
  if (!root || !T.length) return;
  const $ = (s) => root.querySelector(s);
  const store = {
    get(k, d) { try { const v = localStorage.getItem((POP ? "pt-" : "ct-") + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem((POP ? "pt-" : "ct-") + k, JSON.stringify(v)); } catch (e) {} },
  };

  // ---- the themes as library records ----
  const byId = {};
  const IDP = POP ? "pop-" : "cmt-", ord = {};
  T.forEach((t, i) => { byId[IDP + t.id] = t; ord[t.id] = i; });
  const num = (id) => (POP ? ord[id] : parseFloat(String(id).replace("-", ".")));   // "0739-2" -> 739.2 (MTD splits a few themes); pop: the order of the data (year, position, section)
  const decade = (t) => Math.floor(t.year / 10) * 10 + "s";
  const popTags = (t) => [t.set, t.section, decade(t)].concat(t.genre || [], [t.last]).map((x) => String(x).replace(/,/g, "")).join(", ");
  const abcOf = (t, tempo) => POP ? "X:" + (ord[t.id] + 1) + "\nT:" + t.title + "\nC:" + t.last + "\nM:" + t.meter + "\nL:" + t.unit + (tempo ? "\nQ:1/4=" + tempo : "") +
    "\n%%id " + IDP + t.id + "\n%%tags " + popTags(t) + "\n%%key-fixed\nK:" + t.key + "\n" + t.body + "\n" : "X:" + parseInt(t.id, 10) + "\nT:" + t.title + "\nC:" + t.first + " " + t.last + (t.movement || t.cat ? "\nS:" + [t.movement, t.cat].filter(Boolean).join(" · ") : "") + "\nM:" + t.meter +
    "\nL:" + t.unit + (tempo ? "\nQ:1/4=" + tempo : "") + "\n%%id cmt-" + t.id + "\n%%tags " + t.last + (t.bar ? "\n%%bar " + t.bar + (t.barOne ? " one-score" : "") : "") + "\n%%key-fixed\nK:" + t.key + "\n" + t.body + "\n";
  // recordings live in apps/shared/works/works-data.js (Works); the old one-link "yt" field is the fallback
  const workOf = (t) => (window.Works ? Works.of("theme", t.id) : null);
  const hasRec = (r) => { const w = workOf(r.t); return w ? (w.recordings || []).length > 0 : !!r.t.yt; };
  const status = $("#ct-status");
  status.textContent = "Reading " + T.length.toLocaleString() + (POP ? " sections…" : " themes…");

  const NOTE = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
  const pname = (p) => NOTE[((p % 12) + 12) % 12] + (Math.floor(p / 12) - 1);
  const SOLF = ["Do", "Di", "Re", "Ri", "Mi", "Fa", "Fi", "So", "Si", "La", "Li", "Ti"];

  // Each sort: label, value (number or string), and the direction it reads naturally.
  const SORTS = {
    id: ["Dictionary number", (r) => num(r.t.id)],
    year: ["Year (composed, else first performed or published)", (r) => r.t.composed || r.t.premiere || r.t.published || 9999],
    cat: ["Catalogue number (BWV, K., Op.…)", (r) => { const c = r.t.cat || "~"; return c.replace(/\d+/g, (d) => d.padStart(5, "0")); }],
    composer: ["Composer", (r) => r.t.last + " " + r.t.first],
    title: ["Title", (r) => r.t.title],
    fifths: ["Key (circle of fifths, flats first)", (r) => r.t.fifths],
    keyName: ["Key (tonic, C to B)", (r) => (r.rec.keyPc % 12 + 12) % 12],
    tonality: ["Tonality (major, minor)", (r) => (r.t.minor ? 1 : 0)],
    meter: ["Meter", (r) => r.rec.meterN / r.rec.meterD * 100 + r.rec.meterN],
    beats: ["Beats in a bar", (r) => r.rec.meterN],
    start: ["Starts on (Do to Ti)", (r) => { const i = SOLF.indexOf(r.rec.startDegree); return i < 0 ? 99 : i; }],
    pickup: ["Pickup (none first)", (r) => (r.rec.hasPickup ? 1 : 0)],
    n: ["Number of notes", (r) => r.t.n],
    bars: ["Bars", (r) => r.rec.measures || r.t.bars],
    range: ["Range (semitones)", (r) => r.t.range],
    lo: ["Lowest note", (r) => r.t.lo],
    hi: ["Highest note", (r) => r.t.hi],
    maxLeap: ["Largest leap", (r) => r.t.maxLeap],
    leaps: ["Share of leaps (vs steps)", (r) => r.t.leaps],
    mean: ["Average note length", (r) => r.t.mean],
    sd: ["Spread of note lengths", (r) => r.t.sd],
    durs: ["Different note lengths", (r) => r.t.durs],
    rests: ["Rests", (r) => r.t.rests],
    chromatic: ["Notes outside the key", (r) => r.t.chromatic],
    density: ["Notes per bar", (r) => r.t.n / (r.rec.measures || r.t.bars || 1)],
    yt: ["Has a recording first", (r) => (hasRec(r) ? 0 : 1)],
    random: ["Random", (r) => r.rand],
  };

  if (POP) {   // the pop page's own sorts: the dataset's columns, artist for composer, no catalogue numbers
    const o = (k) => (r) => r.t[k];   // undefined (CoCoPops and RS200 have no such figure): sorted last, whichever way
    ["id", "cat", "composer"].forEach((k) => { delete SORTS[k]; });
    const SECTIONS = ["intro", "verse", "prechorus", "chorus", "postchorus", "hook", "bridge", "break", "interlude", "solo", "transition", "instrumental", "theme", "outro", "unlabelled"];
    Object.assign(SORTS, {
      id: ["Collection, then year, position, section", (r) => num(r.t.id)],
      year: ["Year", (r) => r.t.year],
      pos: ["Position in the year (1 to 5; BiMMuDa)", (r) => (parseInt(r.t.pos, 10) || 9)],
      set: ["Collection (BiMMuDa, CoCoPops, RS200)", (r) => ["BiMMuDa", "CoCoPops", "RS200"].indexOf(r.t.set)],
      artist: ["Artist", (r) => r.t.last],
      section: ["Section (verse, chorus…)", (r) => SECTIONS.indexOf(r.t.section)],
      bpm: ["Tempo (BPM)", (r) => r.t.qpm || r.t.bpm || 0],
      len: ["Length (seconds)", o("len")],
      tonal: ["Tonality (how clearly one key)", o("tonal")],
      mic: ["MIC (melodic information content)", o("mic")],
      pstd: ["Pitch STD (spread of pitches)", o("pstd")],
      mis: ["MIS (melodic interval size)", o("mis")],
      od: ["Onset density (notes a second)", o("od")],
      npvi: ["nPVI (rhythmic variability)", o("npvi")],
      ric: ["RIC (rhythmic information content)", o("ric")],
    });
    delete SORTS.title; SORTS.title = ["Title", (r) => r.t.title];
    const first = { id: 1, year: 1 }; Object.keys(first).forEach((k) => { const v = SORTS[k]; delete SORTS[k]; SORTS[k] = v; });
  }
  let records = [], results = [], seed = Math.random();
  function hash(s) { let h = 2166136261 ^ Math.floor(seed * 1e9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }

  // ---- controls ----
  const sortRows = $("#ct-sorts");
  const savedSorts = store.get("sorts", [["id", 1]]).filter((k) => SORTS[k[0]]);
  function sortRow(key, dir, i) {
    const row = document.createElement("div"); row.className = "ct-sortrow";
    const lab = document.createElement("span"); lab.textContent = i ? "then by" : "Sort by";
    const sel = document.createElement("select"); sel.className = "ct-sortkey"; sel.setAttribute("aria-label", lab.textContent);
    if (i) { const o = document.createElement("option"); o.value = ""; o.textContent = "(nothing)"; sel.appendChild(o); }
    Object.keys(SORTS).forEach((k) => { const o = document.createElement("option"); o.value = k; o.textContent = SORTS[k][0]; sel.appendChild(o); });
    sel.value = key || "";
    const d = document.createElement("button"); d.type = "button"; d.className = "ct-dir"; d.dataset.dir = dir || 1;
    const paint = () => { d.textContent = +d.dataset.dir > 0 ? "↑ low to high" : "↓ high to low"; d.title = "Change direction"; };
    paint();
    d.addEventListener("click", () => { d.dataset.dir = -d.dataset.dir; paint(); apply(); });
    sel.addEventListener("change", apply);
    row.append(lab, sel, d); return row;
  }
  for (let i = 0; i < 3; i++) sortRows.appendChild(sortRow((savedSorts[i] || [])[0], (savedSorts[i] || [])[1], i));
  $("#ct-reshuffle").addEventListener("click", () => { seed = Math.random(); records.forEach((r) => { r.rand = hash(r.t.id); }); apply(); });

  const perSel = $("#ct-per"), perNum = $("#ct-pernum"), colSel = $("#ct-cols"), tempo = $("#ct-tempo");
  perSel.value = store.get("per", "10"); perNum.value = store.get("perNum", 12); colSel.value = store.get("cols", "1");
  tempo.value = store.get("tempo2", "");   // empty: each theme at its recording's tempo
  const perPage = () => perSel.value === "all" ? Infinity : perSel.value === "n" ? Math.max(1, +perNum.value || 1) : +perSel.value;
  perNum.hidden = perSel.value !== "n";
  perSel.addEventListener("change", () => { perNum.hidden = perSel.value !== "n"; page = 0; store.set("per", perSel.value); draw(); });
  perNum.addEventListener("input", () => { page = 0; store.set("perNum", perNum.value); draw(); });
  colSel.addEventListener("change", () => { store.set("cols", colSel.value); list.dataset.cols = colSel.value; redrawShown(); });
  tempo.addEventListener("change", () => store.set("tempo2", tempo.value));
  ["#ct-prev", "#ct-prev2"].forEach((s) => $(s).addEventListener("click", () => { page--; draw(true); }));
  ["#ct-next", "#ct-next2"].forEach((s) => $(s).addEventListener("click", () => { page++; draw(true); }));
  const ytOnly = $("#ct-yt");
  ytOnly.addEventListener("change", apply);
  // Roman numerals (apps/themes/themes-rn.js, scripts/theme-romantext.mjs: When in Rome's RomanText under the notes of the themes
  // whose piece it analyses). Off until asked for; the choice is kept.
  const RN = window.THEME_RN || {}, hasRn = (t) => (POP ? !!t.chords : !!(RN[t.id] && RN[t.id].len === (t.body || "").length));
  // (on the pop page the same two checkboxes are "Show chords" / "Only sections that have them": t.chords from scripts/bimmuda-salami.mjs)
  const rnOn = $("#ct-rn") || { checked: false, addEventListener() {} }, rnOnly = $("#ct-rnonly") || { checked: false, addEventListener() {} };
  rnOn.checked = store.get("rn", false); rnOnly.checked = store.get("rnonly", false);
  if ($("#ct-rncount")) $("#ct-rncount").textContent = T.filter(hasRn).length;
  rnOn.addEventListener("change", () => { store.set("rn", rnOn.checked); redrawShown(); });
  rnOnly.addEventListener("change", () => { store.set("rnonly", rnOnly.checked); apply(); });
  // the theme's ABC with each chord's Roman numeral as an annotation under the note it starts on
  const withRn = (t, abc) => {
    if (!rnOn.checked || !hasRn(t)) return abc;
    let body = t.body;
    (POP ? t.chords : RN[t.id].at).slice().sort((a, b) => b[0] - a[0]).forEach(([i, lab]) => { body = body.slice(0, i) + (POP ? '"^' : '"_') + lab.replace(/"/g, "") + '"' + body.slice(i); });
    return abc.replace(t.body, () => body);
  };

  // pop page: section, decade, genre and position as selects (they combine; the finder's tag chips are any-of)
  const popSel = {};
  function popFilter() { const o = {}; Object.keys(popSel).forEach((k) => { o[k] = popSel[k].value; }); return o; }
  if (POP && $("#ct-popfilters")) {
    const box = $("#ct-popfilters"), count = (fn) => { const m = {}; T.forEach((t) => [].concat(fn(t)).forEach((v) => { m[v] = (m[v] || 0) + 1; })); return m; };
    const add = (key, label, m, order) => {
      const l = document.createElement("label"); l.textContent = label + " "; const sel = document.createElement("select"); sel.setAttribute("aria-label", label);
      sel.innerHTML = '<option value="">any</option>' + (order || Object.keys(m).sort()).filter((k) => m[k]).map((k) => '<option value="' + k + '">' + k + " (" + m[k] + ")</option>").join("");
      sel.addEventListener("change", () => { store.set("f-" + key, sel.value); apply(); });
      l.appendChild(sel); box.appendChild(l); popSel[key] = sel;
      const sv = store.get("f-" + key, ""); if ([...sel.options].some((o) => o.value === sv)) sel.value = sv;
    };
    add("set", "Collection", count((t) => t.set), ["BiMMuDa", "CoCoPops", "RS200"]);
    add("section", "Section", count((t) => t.section), ["verse", "chorus", "prechorus", "postchorus", "bridge", "hook", "intro", "break", "interlude", "solo", "transition", "instrumental", "theme", "outro", "unlabelled"]);
    add("decade", "Decade", count(decade));
    add("genre", "Genre", count((t) => t.genre || []), ["pop", "rock", "r&b/soul", "country", "hip-hop", "jazz/standards", "dance/disco", "folk"]);
    add("pos", "Chart position (BiMMuDa)", count((t) => (t.pos === undefined ? [] : String(t.pos))));
  }
  // ---- sort + page ----
  let picked = null, page = 0;
  function apply() {
    const keys = [...sortRows.querySelectorAll(".ct-sortrow")].map((r) => [r.querySelector("select").value, +r.querySelector(".ct-dir").dataset.dir]).filter((k) => k[0]);
    store.set("sorts", keys);
    let list = (picked || records).map((rec) => recOf[rec.id]).filter(Boolean);
    if (ytOnly.checked) list = list.filter(hasRec);
    if (rnOnly.checked) list = list.filter((r) => hasRn(r.t));
    if (POP) { const f = popFilter(); list = list.filter((r) => (!f.set || r.t.set === f.set) && (!f.section || r.t.section === f.section) && (!f.decade || decade(r.t) === f.decade) &&
      (!f.genre || (r.t.genre || []).includes(f.genre)) && (!f.pos || String(r.t.pos) === f.pos)); }
    const val = keys.map(([k, d]) => [SORTS[k][1], d]);
    list.sort((a, b) => {
      for (const [f, d] of val) {
        const x = f(a), y = f(b);
        if (x === undefined || y === undefined) { if (x === y) continue; return x === undefined ? 1 : -1; }   // no value: last
        const c = typeof x === "string" ? x.localeCompare(y, undefined, { sensitivity: "base", numeric: true }) : x - y;
        if (c) return c * d;
      }
      return num(a.t.id) - num(b.t.id);
    });
    results = list; page = 0; draw();
  }

  const list = $("#ct-list"); list.dataset.cols = colSel.value;
  let io = null;
  function draw(scroll) {
    stopPlaying();
    const per = perPage(), pages = Math.max(1, Math.ceil(results.length / per));
    page = Math.max(0, Math.min(page, pages - 1));
    const from = per === Infinity ? 0 : page * per, shown = results.slice(from, per === Infinity ? undefined : from + per);
    const n = results.length.toLocaleString();
    $("#ct-count").textContent = results.length ? (shown.length === results.length ? n + (POP ? " sections" : " themes") :
      (POP ? "Sections " : "Themes ") + (from + 1).toLocaleString() + "–" + (from + shown.length).toLocaleString() + " of " + n) : (POP ? "No sections match." : "No themes match.");
    root.querySelectorAll(".ct-pager").forEach((p) => { p.hidden = pages < 2; });
    root.querySelectorAll(".ct-pagelab").forEach((p) => { p.textContent = "Page " + (page + 1) + " of " + pages; });
    $("#ct-prev").disabled = $("#ct-prev2").disabled = page === 0;
    $("#ct-next").disabled = $("#ct-next2").disabled = page >= pages - 1;
    if (io) io.disconnect();
    list.innerHTML = "";
    io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); if (!e.target.__drawn) renderCard(e.target); } }), { rootMargin: "600px 0px" });
    const frag = document.createDocumentFragment();
    shown.forEach((r) => {
      const c = document.createElement("article"); c.className = "ct-card"; c.__r = r;
      c.innerHTML = '<div class="ct-head"><div><div class="ct-title"></div><div class="ct-comp"></div></div><div class="ct-btns"></div></div>' +
        '<div class="ct-score"></div><div class="ct-meta"></div><div class="ct-works" hidden></div>';
      if (window.Works) Works.mount(c.querySelector(".ct-works"), "theme", r.t.id);
      c.querySelector(".ct-title").textContent = r.t.title;
      if (r.t.movement) { const mv = document.createElement("div"); mv.className = "ct-move"; mv.textContent = r.t.movement; c.querySelector(".ct-title").after(mv); }
      const when = [r.t.composed && "composed " + r.t.composed, r.t.premiere && "first performed " + r.t.premiere,
        !r.t.composed && r.t.published && "published " + r.t.published].filter(Boolean).join(", ");
      if (POP) c.querySelector(".ct-comp").textContent = r.t.last + " · " + r.t.year + " · " +
        (r.t.set === "CoCoPops" ? "peak No. " + r.t.peak + " on the Hot 100" : r.t.set === "RS200" ? "No. " + r.t.rank + " on Rolling Stone's 500 (2004)" : "No. " + r.t.pos + " of the year") + " · " + r.t.section +
        (r.t.chords ? (r.t.set === "BiMMuDa" ? " · chords from a Billboard analysis" : " · chords from the transcription") : "");
      else c.querySelector(".ct-comp").textContent = r.t.first + " " + r.t.last + (r.t.cat ? " · " + r.t.cat : "") + (when ? " · " + when : "") + " · No. " + String(r.t.id).replace(/^0+/, "");
      const btns = c.querySelector(".ct-btns");
      const play = document.createElement("button"); play.type = "button"; play.className = "ct-play"; play.textContent = "▶ Play";
      play.addEventListener("click", () => togglePlay(c));
      btns.appendChild(play);
      // the whole movement in the full-score player, opened at the theme (a pickup: the bar before the one it leads into)
      const sc = workOf(r.t) && ((workOf(r.t).in || {}).score || [])[0];
      if (sc) { const a = document.createElement("a"); const at = r.t.bar ? Math.max(0, r.t.bar - (r.rec && r.rec.hasPickup ? 1 : 0)) : null;
        a.href = Works.href("score", Object.assign({}, sc, at != null ? { bar: at } : {})); a.className = "ct-fullscore";
        a.textContent = "Full score" + (at != null ? " from bar " + at : ""); a.title = "The whole movement, with this theme in context"; btns.appendChild(a); }
      if (!workOf(r.t) && r.t.yt) { const a = document.createElement("a"); a.href = r.t.yt; a.target = "_blank"; a.rel = "noopener"; a.textContent = POP ? (/spotify/.test(r.t.yt) ? "Spotify" : /youtu/.test(r.t.yt) ? "YouTube" : "Recording") : "Recording"; btns.appendChild(a); }
      if (POP && r.t.salami) { const a = document.createElement("a"); a.href = "/tools/timestamp-notes.html?salami=" + r.t.salami; a.className = "ct-salami"; a.textContent = "Billboard chords"; a.title = "This song's McGill Billboard chord analysis, sections and bars, in Timestamp Notes"; btns.appendChild(a); }
      if (POP && r.t.also) { const a = document.createElement("a"); a.href = "?song=" + encodeURIComponent(r.t.grp); a.className = "ct-also"; a.textContent = "Also in " + r.t.also.join(", "); a.title = "The same song's sections in the other collection(s)"; btns.appendChild(a); }
      const m = c.querySelector(".ct-meta"), rec = r.rec;
      const bits = [
        r.t.key.replace(/m$/, " minor").replace(/b/g, "♭").replace(/#/g, "♯") + (r.t.minor && r.t.modeFrom === "melody" ? " (guessed)" : r.t.minor ? "" : " major"),
        rec.meterStr, (rec.measures || r.t.bars) + " bars" + (rec.hasPickup ? " + pickup" : ""), r.t.n + " notes",
        "range " + pname(r.t.lo) + "–" + pname(r.t.hi) + " (" + r.t.range + ")", "largest leap " + r.t.maxLeap,
        rec.startDegree ? "starts on " + rec.startDegree : "", r.t.chromatic ? r.t.chromatic + " outside the key" : "", r.t.fixed ? "hand-corrected" : "", r.t.barOne ? "bar numbers from one score" : "", hasRn(r.t) ? "Roman numerals: When in Rome" + (r.t.bar ? "" : ", bar 1 assumed") : "", r.t.twoVoice ? "melody of a two-voice score" : "", r.t.from === "mtd" ? "corrected (MTD)" : "", /\boctave\b/.test(r.t.repaired || "") ? "octave lowered (guessed)" : "",
      ];
      if (POP) {   // the dataset's own figures; genre and decade as chips too
        const f = (v, d) => (v === undefined ? "" : (+v).toFixed(d));
        const kn = (x) => x.replace(/b/g, "♭").replace(/#/g, "♯");
        bits.splice(0, bits.length, r.t.set, (r.t.genre || []).join(" / "), decade(r.t),
          r.t.mode ? kn(r.t.mode) : kn(r.t.key).replace(/m$/, " minor") + (r.t.minor ? (r.t.modeFrom === "chords" ? " (from the chords)" : "") : " major"), rec.meterStr,
          (r.t.qpm || r.t.bpm) + " per quarter", r.t.set === "RS200" ? "note lengths approximate" : "", (rec.measures || r.t.bars) + " bars" + (rec.hasPickup ? " + pickup" : ""), r.t.n + " notes",
          "range " + pname(r.t.lo) + "–" + pname(r.t.hi) + " (" + r.t.range + ")", "largest leap " + r.t.maxLeap,
          r.t.mic !== undefined ? "MIC " + f(r.t.mic, 2) : "", r.t.pstd !== undefined ? "pitch STD " + f(r.t.pstd, 2) : "", r.t.mis !== undefined ? "MIS " + f(r.t.mis, 2) : "",
          r.t.od !== undefined ? "onsets/s " + f(r.t.od, 2) : "", r.t.npvi !== undefined ? "nPVI " + f(r.t.npvi, 1) : "", r.t.ric !== undefined ? "RIC " + f(r.t.ric, 2) : "",
          r.t.tonal !== undefined ? "tonality " + f(r.t.tonal, 2) : "", r.t.fixed ? "hand-corrected" : "");
      }
      bits.filter(Boolean).forEach((b) => { const s = document.createElement("span"); s.textContent = b; m.appendChild(s); });
      frag.appendChild(c); io.observe(c);
    });
    list.appendChild(frag);
    if (scroll) $("#ct-count").scrollIntoView({ block: "start", behavior: "smooth" });
  }
  function renderCard(c) {
    const el = c.querySelector(".ct-score");
    c.__audio = false;
    try { c.__v = ABCJS.renderAbc(el, withRn(c.__r.t, abcOf(c.__r.t)).replace(/^[TCS]:.*\n/gm, ""), { responsive: "resize", add_classes: true, paddingtop: 0, paddingbottom: 0, staffwidth: 640 })[0]; }
    catch (e) { el.textContent = "This theme's ABC could not be drawn."; }
    if (c.__v) numberBars(el, c.__r);
    c.__drawn = true;
  }
  // A theme whose place in the full score is sourced (t.bar, from scripts/theme-sources/pdmx-matches.json: the bar it
  // starts in, or leads into from a pickup) gets that movement's bar number at the top left of each bar. abcjs tags every
  // note and rest with its measure (abcjs-mmN, counted from 0 over the whole tune; a pickup is measure 0).
  function numberBars(el, r) {
    const bar = r.t.bar, svg = el.querySelector("svg");
    if (!bar || !svg) return;
    const pick = r.rec && r.rec.hasPickup ? 1 : 0, first = {}, lineOf = {};
    svg.querySelectorAll(".abcjs-note, .abcjs-rest").forEach((n) => {
      const mm = /abcjs-mm(\d+)/.exec(n.getAttribute("class")), ln = /abcjs-l(\d+)/.exec(n.getAttribute("class"));
      if (!mm) return;
      const k = +mm[1], x = n.getBBox().x;
      if (first[k] === undefined || x < first[k]) { first[k] = x; lineOf[k] = ln ? +ln[1] : 0; }
    });
    const staffTop = [...svg.querySelectorAll(".abcjs-staff")].map((s) => s.getBBox().y);
    const barsOn = {}; // barline x positions per line: a bar's number goes just after the barline that opens it
    svg.querySelectorAll(".abcjs-bar").forEach((b) => {
      const ln = /abcjs-l(\d+)/.exec(b.getAttribute("class")), l = ln ? +ln[1] : 0, bb = b.getBBox();
      (barsOn[l] = barsOn[l] || []).push(bb.x + bb.width);
    });
    // Each bar's number sits at its opening barline (nudged left of it when the bar's first note is close behind), and all
    // numbers of one line share one height: just above the staff, or above whatever stands over the staff where any of
    // that line's numbers go (high notes, ledger lines, beams, slurs, accidentals), so they never collide and stay level.
    const ns = "http://www.w3.org/2000/svg";
    const mk = (txt) => {
      const t = document.createElementNS(ns, "text");
      t.setAttribute("class", "ct-barno" + (r.t.barOne ? " ct-barno-one" : ""));
      // inline and !important: _includes/head.html sets all score text to Source Serif with !important
      t.style.setProperty("font-family", '"Bar Numbers Mono", ui-monospace, monospace', "important");
      t.style.setProperty("font-weight", "400", "important");
      t.textContent = txt; return t;
    };
    const probe = mk("0000000000"); svg.appendChild(probe);
    const pb = probe.getBBox(); probe.remove();
    const W = pb.width / 10 || 4.6, H = pb.height * 0.75 || 6;   // a digit's width and the numbers' cap height
    const marks = [], ys = {};
    Object.keys(first).forEach((k) => {
      const n = bar + (+k) - pick;
      if (n < 1) return;
      const l = lineOf[k], before = (barsOn[l] || []).filter((x) => x < first[k]);
      const w = String(n).length * W;
      let x = before.length ? Math.max(...before) + 1 : first[k] - 4;
      if (x + w + 4 > first[k] && before.length) x = Math.max(...before) - w / 2;   // crowded: centre it on the barline
      marks.push({ n, l, x, w });
    });
    const items = [...svg.querySelectorAll("[class*='abcjs-l']")].filter((e) => !/abcjs-staff\b|abcjs-staff-extra/.test(e.getAttribute("class") || ""));
    marks.forEach((m) => {
      let top = (staffTop[m.l] ?? 10) - 3;
      items.forEach((e) => {
        const ln = /abcjs-l(\d+)/.exec(e.getAttribute("class")); if (!ln || +ln[1] !== m.l) return;
        let b; try { b = e.getBBox(); } catch (err) { return; }
        if (b.x < m.x + m.w + 3 && b.x + b.width > m.x - 3 && b.y - 2 < top) top = b.y - 2;
      });
      ys[m.l] = Math.min(ys[m.l] ?? Infinity, top);
    });
    let minY = Infinity;
    marks.forEach((m) => {
      const t = mk(String(m.n));
      t.setAttribute("x", m.x.toFixed(1));
      t.setAttribute("y", ys[m.l].toFixed(1));
      svg.appendChild(t);
      minY = Math.min(minY, ys[m.l] - H);
    });
    // a number raised above the top of the drawing would be cut off: grow the drawing upward to hold it
    const vb = svg.viewBox && svg.viewBox.baseVal;
    if (vb && vb.height && minY < vb.y) {
      const grow = vb.y - minY + 1;
      svg.setAttribute("viewBox", [vb.x, vb.y - grow, vb.width, vb.height + grow].join(" "));
    }
  }
  // a redraw replaces the notes Play is lighting, so a playing card stops first
  function redrawShown() { stopPlaying(); list.querySelectorAll(".ct-card").forEach((c) => { if (c.__drawn) renderCard(c); }); }

  // ---- play ----
  // The band's piano (MusicAudio's "piano" voice: band/sounds.js samples, its synth until they load), scheduled on the
  // audio clock from abcjs's own timing of the DRAWN score, and the red note lit from that same schedule, so sound and
  // highlight can't drift apart. setTiming counts beats of the meter (a half note in 2/2, a dotted quarter in 6/8), so the
  // quarter-note tempo is converted with getBeatLength().
  let playing = null;
  function stopPlaying() {
    if (!playing) return;
    cancelAnimationFrame(playing.raf);
    try { window.MusicAudio.stopAll(); } catch (e) {}
    playing.card.querySelector(".ct-play").textContent = "▶ Play";
    playing.card.querySelectorAll(".ct-on").forEach((n) => n.classList.remove("ct-on"));
    playing = null;
  }
  function togglePlay(c) {
    const was = playing && playing.card === c; stopPlaying(); if (was) return;
    if (!c.__drawn) renderCard(c);
    const v = c.__v, A = window.MusicAudio;
    if (!v || !A) { status.textContent = "Can't play this theme."; return; }
    const qpm = Math.max(10, Math.min(600, +tempo.value || c.__r.t.qpm || 96));   // quarter notes a minute
    if (!c.__audio) { try { v.setUpAudio({}); } catch (e) {} c.__audio = true; }   // fills each event's midiPitches (no sound)
    const events = v.setTiming(qpm / (v.getBeatLength() * 4)).filter((e) => e.type === "event" && e.elements);
    if (!events.length) return;
    const ctx = A.ctx(); if (ctx.resume) ctx.resume();
    const t0 = ctx.currentTime + 0.12, secPerWhole = 240 / qpm;
    const t = c.__r.t, orn = window.OrnamentPlay ? window.OrnamentPlay.prepare(v, {
      composer: (t.first || "") + " " + (t.last || ""), year: t.composed || t.published || t.firstPerformed, secPer32: secPerWhole / 32 }) : null;
    let endMs = 0;
    events.forEach((e) => {
      // Grace notes (abcjs's midiGraceNotePitches, lengths in whole notes: each takes its written share of the main
      // note, at most half of it) are played ON the beat, taking their time from the main note, as Bach's and Haydn's
      // are read (C.P.E. Bach, Versuch, 1753; Türk, Klavierschule, 1789); a little softer, as abcjs does.
      let at = t0 + e.milliseconds / 1000, took = 0;
      (e.midiGraceNotePitches || []).forEach((g) => {
        const d = (g.durationInMeasures || 0) * secPerWhole;
        if (!(d > 0)) return;
        A.noteAt(g.pitch, at + took, d * 0.95, 0.17, "piano");
        took += d;
      });
      (e.midiPitches || []).forEach((m) => {
        // midiPitches durations are in whole notes; with graces abcjs has already shortened the main note by their time.
        // Ornament signs (trill, prall, mordent, turn) are played out by OrnamentPlay, the way the ornaments lesson reads them.
        const dur = m.duration * secPerWhole;
        (orn ? orn.notes(m, at + took, dur, e) : [{ at: at + took, dur, midi: m.pitch, vel: 1 }])
          .forEach((n) => A.noteAt(n.midi, n.at, n.dur * 0.95, 0.22 * n.vel, "piano"));
        endMs = Math.max(endMs, e.milliseconds + (took + dur) * 1000);
      });
    });
    endMs = Math.max(endMs, events[events.length - 1].milliseconds);
    const me = playing = { card: c, raf: 0 };
    c.querySelector(".ct-play").textContent = "■ Stop";
    let i = -1;
    const tick = () => {
      if (playing !== me) return;
      const now = (ctx.currentTime - t0) * 1000;
      if (i + 1 < events.length && events[i + 1].milliseconds <= now) {
        while (i + 1 < events.length && events[i + 1].milliseconds <= now) i++;
        c.querySelectorAll(".ct-on").forEach((n) => n.classList.remove("ct-on"));
        events[i].elements.forEach((g) => g.forEach((n) => n.classList.add("ct-on")));
      }
      if (now > endMs + 150) { stopPlaying(); return; }   // after the last note has sounded its full length
      me.raf = requestAnimationFrame(tick);
    };
    me.raf = requestAnimationFrame(tick);
  }

  // ---- build (after first paint, so the page shows its controls straight away) ----
  const recOf = {};
  setTimeout(() => {
    records = TuneLibrary.build({ [POP ? "Pop themes" : "Classical themes"]: T.map((t) => abcOf(t)).join("\n") });
    records.forEach((rec) => { const t = byId[rec.id]; if (t) recOf[rec.id] = { t, rec, rand: hash(t.id) }; });
    const pick = $("#ct-picker");
    TuneLibrary.renderPicker(pick, {
      facets: ["tags", "tonality", "meter", "key", "startDegree", "tonalPattern", "rhythmPattern"],
      onResults: (res) => { picked = res; apply(); },
    });
    // the tag of each theme is its composer; the movement rides in S: (the finder's search reads title, composer, source)
    pick.querySelectorAll(".tl-facet > summary").forEach((s) => { if (s.textContent === "Tags") s.textContent = POP ? "Collection, section, decade, genre, artist" : "Composer"; });
    const box = pick.querySelector(".tl-search"); if (box) box.placeholder = POP ? "Search title or artist (Beatles, Hey Jude…)" : "Search title, composer, movement or catalogue (Adagio, BWV 1046…)";
    status.textContent = "";
    // ?song=<grp> (the "Also in" link): every section of that song in every collection that has it
    const wantSong = POP && new URLSearchParams(location.search).get("song");
    if (wantSong) {
      Object.keys(popSel).forEach((k) => { popSel[k].value = ""; });   // (a saved filter must not hide the song's other sections)
      picked = records.filter((rec) => recOf[rec.id] && recOf[rec.id].t.grp === wantSong); apply();
      const one = T.find((t) => t.grp === wantSong);
      status.textContent = "Showing one song in " + (one ? [one.set].concat(one.also).join(", ") : "several collections") + ". ";
      const all = document.createElement("button"); all.type = "button"; all.textContent = "Show all sections";
      all.addEventListener("click", () => { status.textContent = ""; history.replaceState(null, "", location.pathname); picked = null; apply(); });
      status.appendChild(all);
    }
    // ?theme=<id> (from the Tune Directory and the Recordings panel): that theme alone, with a way back to all
    const want = new URLSearchParams(location.search).get("theme");
    if (want && recOf[IDP + want]) {
      picked = records.filter((rec) => rec.id === IDP + want); apply();
      status.textContent = "Showing one theme (No. " + want.replace(/^0+/, "") + "). ";
      const all = document.createElement("button"); all.type = "button"; all.textContent = "Show all themes";
      all.addEventListener("click", () => { status.textContent = ""; history.replaceState(null, "", location.pathname); picked = null; apply(); });
      status.appendChild(all);
    }
  }, 30);
})();
