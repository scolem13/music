// full-score.js — a full (orchestral / band) score: drawn by abcjs, played by the band's samples (AbcPlay opts.tracks: every
// voice on its own instrument), with views that show and play only some instruments. Global FullScore.
//
//   FullScore.mount(el, { abc, id, notes?: html }) -> { view(keys), play(), stop(), layout(obj), parts, abc(), systems() }
//     abc  the score as scripts/full-score/convert.mjs (+ arrange.mjs) writes it, checked against its MusicXML: header lines, one
//          V: line per voice (nm="..." starts an instrument; an unnamed voice belongs to the instrument before it), then each
//          voice's music on ONE line. arrange.mjs hints: "%fs-staves ( 18 19 )" voices drawn on one staff; "%fs-display V:19
//          of=18 …" a voice's line to draw when voice 18 is shown too (its full line is played)
//     id   storage key: saved views, the last view and the layout ("fullscore-<id>-…" in localStorage, this browser only)
//
// TWO FORMS of the chosen instruments are built from the file (which is left as it is):
//   played: each voice on its own staff as the file's %%score has it (abcjs ignores transpose= on a staff's second voice) and
//           its full line; drawn out of sight and handed to AbcPlay, which times and sounds it
//   drawn:  voices sharing staves (%fs-staves), display lines, short names after the first system, cut into the page's own
//           systems of a fixed bar width (so pages, pages side by side and one long line all space bars alike): pages
//           scrolling down ("pages"), pages side by side scrolling across, page-turn buttons and arrow keys ("paged"), or one
//           system ("line", names kept at the left edge). Cutaway: a system leaves out the staves that only rest in it.
//           abcjs draws each system with its own gaps at their smallest; respace() then places the staves (staffGap between
//           one staff's bottom line and the next one's top; with "apart", more where the two staves' outlines, compared in
//           6-unit strips as MuseScore's skylines are, would come closer than 3 units), stretches the family
//           brackets, and draws bar lines between staves (within a family, or through the whole score).
// Each drawn note is matched to the played form through its place in its voice's line (voice id + character offset, after the
// same tidying on both sides), so lighting, Follow and "play from here" work in every layout. A display line (the bass where
// it doubles the cello) is not matched: those notes light through the voice they double.
// Also: each voice's %%MIDI program from the instrument's name (INSTRUMENTS; converters often give all strings 48); tempo marks
// after the first are dropped (score-check.cjs flags them); rests on a two-voice staff are moved to the middle of the staff in
// bars where the other voice has nothing (abcjs puts them high or low whenever a staff has two voices); bar numbers (abcjs
// %%barnumbers, counted from the first full bar); "Even out the loudness" (shape(), compressor(): written dynamics pulled
// together, each note's level by how many instruments sound with it, a compressor on the output).
// Needs: ABCJS (abcjs-basic.js), AbcPlay (abc-play.js). Test: tests/full-score/full-score.cdp.js. Converter and checks: scripts/full-score/.
(function (global) {
  // name -> [family, GM program (0-based)]; first match wins, so the specific names come first
  var INSTRUMENTS = [
    [/picc/i, "ww", 72], [/flaut|flute|fl[uû]te|flöte/i, "ww", 73], [/corno ingl|english horn|cor angl/i, "ww", 69], [/obo|hautbois/i, "ww", 68],
    [/clar/i, "ww", 71], [/contrafag|contrabassoon/i, "ww", 70], [/fag|bassoon|basson/i, "ww", 70], [/sax/i, "ww", 65],
    [/corn[oi]\b|corni|horn|cor\b|trompe/i, "br", 60], [/tromb[ae]\b|trumpet|trompete|trompette|clarino/i, "br", 56], [/trombon|posaune/i, "br", 57], [/tuba/i, "br", 58],
    [/timp|pauk/i, "pc", 47], [/perc|tri[aá]ng|piatti|cymbal|tamb|cassa|drum|glock/i, "pc", 47], [/harp|arpa/i, "pc", 46], [/piano|cembalo|harpsi|organ/i, "pc", 0],
    [/viola\b|viole|bratsche|alto\b/i, "st", 41], [/violon?cell|cello/i, "st", 42], [/contrab|double bass|kontrab|basso\b|bass\b/i, "st", 43],
    [/viol|violin/i, "st", 40], [/sopran|alto|tenor|bass|voice|chor|coro/i, "vx", 52]
  ];
  var FAMILIES = [["ww", "Woodwinds"], ["br", "Brass"], ["pc", "Percussion & keyboards"], ["vx", "Voices"], ["st", "Strings"]];
  // short names for the systems after the first, the usual score abbreviations; anything else: its first word cut to 3 letters
  var SHORT = [[/^flaut|^flute/i, "Fl."], [/^picc/i, "Picc."], [/^obo/i, "Ob."], [/^clar/i, "Cl."], [/^fag|^bassoon/i, "Fg."], [/^corn|^horn/i, "Cor."],
    [/^tromb[ae]\b|^trumpet/i, "Tr."], [/^trombon/i, "Trb."], [/^timp/i, "Timp."], [/^violino|^violin/i, "Vl."], [/^viola/i, "Vla."],
    [/^violoncello e bass|^cello and bass/i, "Vc. e B."], [/^violon?cell|^cello/i, "Vc."], [/^contrab|^bass|^double/i, "Cb."], [/^piano/i, "Pno."]];
  function shortName(n) {
    var s = SHORT.filter(function (x) { return x[0].test(n); })[0], head = s ? s[1] : n.split(/\s+/)[0].slice(0, 3) + ".";
    var tail = (/\s((?:I{1,3}|IV|1|2|3)|in [A-G][b♭#]?)$/.exec(n) || [, ""])[1];
    return head + (tail ? " " + tail : "");
  }
  function kindOf(name) { var r = INSTRUMENTS.filter(function (x) { return x[0].test(name || ""); })[0]; return r ? { fam: r[1], prog: r[2] } : { fam: "pc", prog: 0 }; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  function clean(b) { return b.replace(/\[Q:[^\]]*\]/g, ""); }

  // ---------- the file
  function parse(abc) {
    var lines = abc.replace(/\r/g, "").split("\n"), head = [], decl = {}, body = {}, order = [], cur = null, inBody = false, display = {};
    lines.forEach(function (ln) {
      var bare = /^V:(\S+)\s*$/.exec(ln), d = /^V:(\S+)\s+(.*)$/.exec(ln), m = /^%fs-display V:(\S+) of=(\S+) (.*)$/.exec(ln);
      if (m) { display[m[1]] = { of: m[2], body: clean(m[3]) }; return; }
      if (bare) { inBody = true; cur = bare[1]; body[cur] = (body[cur] ? body[cur] + " " : ""); return; }
      if (inBody) { if (cur && ln.trim()) body[cur] += ln.trim(); return; }
      if (d) { cur = d[1]; decl[cur] = [ln]; order.push(cur); return; }
      if (cur && /^%%MIDI/.test(ln)) return;
      if (/^%%score|^%%staves|^%fs-/.test(ln)) return;
      head.push(ln);
    });
    Object.keys(body).forEach(function (v) { body[v] = clean(body[v]); });
    var sc = (/^%%(?:score|staves)(.*)$/m.exec(abc) || [, ""])[1], staffOf = {}, s = 0, depth = 0;
    (sc.match(/\(|\)|[^\s()[\]{}|]+/g) || []).forEach(function (t) {
      if (t === "(") { depth++; s++; return; } if (t === ")") { depth--; return; }
      if (!depth) s++; staffOf[t] = s;
    });
    var drawStaff = {}; Object.keys(staffOf).forEach(function (v) { drawStaff[v] = staffOf[v]; });
    ((/^%fs-staves(.*)$/m.exec(abc) || [, ""])[1].match(/\(([^)]*)\)/g) || []).forEach(function (g) {
      var vs = g.replace(/[()]/g, " ").trim().split(/\s+/); vs.forEach(function (v) { drawStaff[v] = "d" + vs[0]; });
    });
    var parts = [];
    order.forEach(function (id) {
      var nm = /nm="([^"]*)"/.exec(decl[id][0]);
      if (nm || !parts.length) { var name = nm ? nm[1].replace(/\\n/g, " ").replace(/\.\s*$/, "").trim() : id, k = kindOf(name);
        parts.push({ key: id, name: name, fam: k.fam, prog: k.prog, voices: [id] }); }
      else parts[parts.length - 1].voices.push(id);
    });
    var seen = {}, nth = {};                              // two parts with one name: (a), (b)
    parts.forEach(function (p) { seen[p.name] = (seen[p.name] || 0) + 1; });
    parts.forEach(function (p) { if (seen[p.name] > 1) { nth[p.name] = (nth[p.name] || 0) + 1; p.label = p.name + " (" + "abcdefgh"[nth[p.name] - 1] + ")"; } else p.label = p.name; p.short = shortName(p.label); });
    var bars = {}; Object.keys(body).forEach(function (v) { bars[v] = splitBars(body[v]); });
    Object.keys(display).forEach(function (v) { display[v].bars = splitBars(display[v].body); });
    var nBars = Math.max.apply(null, Object.keys(bars).map(function (v) { return bars[v].length; }).concat([0]));
    return { head: head, decl: decl, body: body, bars: bars, nBars: nBars, parts: parts, staffOf: staffOf, drawStaff: drawStaff, display: display };
  }

  // a voice's line cut into bars: [{ start, end, text, notes }] (text = the bar's music and the bar line that ends it; a bar line
  // before any music joins the first bar, as abcjs counts it). Bar lines are found outside chords, quotes, !decorations! and
  // inline fields. notes = the bar has a note (not only rests).
  function splitBars(src) {
    var out = [], i = 0, start = 0, depth = 0, q = false, bang = false, seenMusic = false;
    function bar(j) { var r = /^(?::*\|[\]|:]*\d*|::|\[\d)/.exec(src.slice(j)); return r && r[0]; }
    while (i < src.length) {
      var c = src[i];
      if (q) { if (c === '"') q = false; i++; continue; }
      if (bang) { if (c === "!") bang = false; i++; continue; }
      if (c === '"') { q = true; i++; continue; }
      if (c === "!") { bang = true; i++; continue; }
      if (c === "[" && /^\[[A-Za-z]:/.test(src.slice(i))) { i = src.indexOf("]", i) + 1; continue; }
      if (c === "[" && !/^\[\d/.test(src.slice(i))) { depth++; i++; continue; }
      if (c === "]" && depth) { depth--; i++; continue; }
      var b = !depth && bar(i);
      if (b) {
        if (/^\[\d/.test(b)) { i += b.length; continue; }           // a volta mark starts the next bar's music
        i += b.length;
        if (seenMusic) { out.push({ start: start, end: i }); start = i; seenMusic = false; }
        continue;
      }
      if (/[A-Ga-gzxZ]/.test(c)) seenMusic = true;
      i++;
    }
    if (seenMusic || start < src.length && src.slice(start).trim()) out.push({ start: start, end: src.length });
    out.forEach(function (b) {
      b.text = src.slice(b.start, b.end);
      b.notes = /[A-Ga-g]/.test(b.text.replace(/\[[A-Za-z]:[^\]]*\]|"[^"]*"|![^!]*!/g, ""));
    });
    return out;
  }

  // the voices of the chosen parts as staves (voices sharing a staff key share a staff), bracketed by family
  function staves(S, keys, map) {
    var keep = S.parts.filter(function (p) { return keys.indexOf(p.key) >= 0; }), fams = [];
    FAMILIES.forEach(function (f) {
      var vs = []; keep.filter(function (p) { return p.fam === f[0]; }).forEach(function (p) { vs = vs.concat(p.voices); });
      if (!vs.length) return;
      var st = [], at = {};
      vs.forEach(function (v) { var k = map[v] || v; if (at[k] == null) { at[k] = st.length; st.push([]); } st[at[k]].push(v); });
      fams.push(st);
    });
    return fams;
  }
  function partOfVoice(S, v) { return S.parts.filter(function (p) { return p.voices.indexOf(v) >= 0; })[0]; }

  // one ABC text: fams = [[ [v, v], [v] ], …], body(v) -> text; returns { abc, start: { v: index of its music in abc } }
  function assemble(S, fams, body, o) {
    o = o || {};
    var out = [], firstQ = true;
    var head = S.head.filter(function (h) {
      if (/^Q:/.test(h)) { if (!firstQ || o.noTempo) return false; firstQ = false; }
      if (o.noTitle && /^[TC]:/.test(h)) return false;
      return true;
    });
    var kI = head.findIndex(function (h) { return /^K:/.test(h); });
    head.forEach(function (h, i) {
      if (i === 1) (o.directives || []).forEach(function (d) { out.push(d); });
      if (i === kI) out.push("%%score " + fams.map(function (st) { return "[" + st.map(function (g) { return g.length > 1 ? "(" + g.join(" ") + ")" : g[0]; }).join(" ") + "]"; }).join(" "));
      out.push(h);
    });
    var flat = [], staffHead = {}; fams.forEach(function (st) { st.forEach(function (g) { staffHead[g[0]] = true; g.forEach(function (v) { flat.push(v); }); }); });
    flat.forEach(function (v) {
      var p = partOfVoice(S, v), first = p.voices[0] === v && staffHead[v];   // one name a staff (cello and bass share one)
      var line = S.decl[v][0].replace(/\s(?:nm|snm)="[^"]*"/g, "");
      if (o.clefs && o.clefs[v]) line = line.replace(/^(V:\S+)\s+\S+/, "$1 " + o.clefs[v]);
      if (first && !o.noNames) line += ' nm="' + (o.short ? p.short : p.label).replace(/"/g, "") + '" snm="' + p.short.replace(/"/g, "") + '"';
      out.push(line); out.push("%%MIDI program " + p.prog);
    });
    var text = out.join("\n") + "\n", start = {};
    flat.forEach(function (v) { text += "V:" + v + "\n"; start[v] = text.length; text += body(v) + "\n"; });
    return { abc: text, start: start, flat: flat };
  }

  // state at the start of bar k of voice v: the last key and clef ([K:]) and meter ([M:]) fields before it
  function stateBefore(S, v, k) {
    var b = S.bars[v][k]; if (!b) return "";
    var pre = S.body[v].slice(0, b.start), key = null, clef = null, meter = null;
    (pre.match(/\[[KM]:[^\]]*\]/g) || []).forEach(function (f) {
      if (f[1] === "M") { meter = f; return; }
      var t = f.slice(3, -1).trim().split(/\s+/);
      if (/^([A-G][b#]?(m|min|maj|dor|phr|lyd|mix|aeo|loc|ion)?|none|Hp|HP)$/i.test(t[0])) { key = t[0]; t.shift(); }
      if (t.length) clef = t.join(" ");
    });
    return (meter || "") + (key || clef ? "[K:" + [key, clef].filter(Boolean).join(" ") + "]" : "");
  }

  var CSS = ".fs{display:grid;gap:14px}.fs [hidden]{display:none!important}.fs-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px}" +
    ".fs-bar label,.fs-lay label{display:flex;align-items:center;gap:6px;font-size:13px}.fs-tempo,.fs-lay output{font-variant-numeric:tabular-nums;min-width:3ch;display:inline-block}" +
    ".fs-status{font-size:12px;opacity:.75}.fs-chips{display:flex;flex-wrap:wrap;gap:6px}" +
    ".fs-chip{border-radius:999px;padding:6px 12px;border:1px solid var(--fs-rule,#ccc);background:transparent;color:inherit;font:inherit;font-size:13px;cursor:pointer}" +
    ".fs-chip[aria-pressed=true]{background:var(--fs-accent,#7a2e2a);border-color:var(--fs-accent,#7a2e2a);color:#fff}.fs-chip.mine{font-style:italic}.fs-chip .x{margin-left:6px;opacity:.7}" +
    ".fs-pick{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px 20px;margin-top:10px}.fs-fam h4{margin:0 0 4px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;display:flex;gap:8px;align-items:center}" +
    ".fs-fam h4 button{font-size:11px;letter-spacing:0;text-transform:none;padding:1px 6px;border:1px solid var(--fs-rule,#ccc);background:transparent;color:inherit;border-radius:3px;cursor:pointer}" +
    ".fs-fam label{display:block;font-size:14px;padding:2px 0;cursor:pointer}.fs-save{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.fs-save input{flex:1 1 200px;min-width:0;font:inherit;padding:6px 8px}" +
    ".fs-lay{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px 24px;margin-top:10px}.fs-lay input[type=range]{flex:1;min-width:80px}.fs-lay select{font:inherit}" +
    ".fs-sheet{position:relative;overflow-x:auto;background:var(--fs-paper,#fffdf8);color:#1a1915;border-radius:3px;padding:10px 6px}.fs-paper{min-width:720px}.fs-paper svg{display:block}" +
    ".fs-sheet.fs-line .fs-paper{min-width:0;width:max-content}.fs-sys{padding-top:14px}.fs-sys+.fs-sys{margin-top:var(--fs-sysgap,8px)}" +
    ".fs-sheet.fs-paged{background:transparent;padding:4px 0 10px;scroll-snap-type:x proximity}.fs-sheet.fs-paged .fs-paper{display:flex;gap:20px;width:max-content;min-width:0;align-items:flex-start}" +
    ".fs-page{flex:none;box-sizing:border-box;background:var(--fs-paper,#fffdf8);padding:8px 14px 18px;border-radius:2px;box-shadow:0 1px 0 var(--fs-rule,#ccc),0 10px 26px -18px rgba(0,0,0,.5);scroll-snap-align:start}" +
    ".fs-go{display:inline-flex;gap:6px;align-items:center}.fs-goto{width:4.5em;font:inherit;padding:3px 4px}.fs-flash{fill:var(--fs-accent,#7a2e2a);opacity:.16;pointer-events:none}.fs-sheet.fs-line .fs-paper{display:flex;align-items:flex-start}.fs-sheet.fs-line .fs-sys+.fs-sys{margin-top:0}.fs-pageno{font:italic 12px Georgia,serif;opacity:.6;text-align:right}.fs-barjoin{fill:#1a1915;stroke:none}.fs-pageturn{display:inline-flex;gap:6px}" +
    ".fs-names{position:sticky;left:0;width:0;height:0;z-index:2}.fs-names span{position:absolute;left:0;transform:translateY(-50%);font:600 12px/1.1 Georgia,serif;white-space:nowrap;background:var(--fs-paper,#fffdf8);padding:2px 6px 2px 2px;box-shadow:4px 0 6px -4px rgba(0,0,0,.35)}" +
    ".fs-paper .abcjs-note,.fs-paper .abcjs-rest{cursor:pointer}.fs-paper .fs-from{fill:var(--fs-accent,#7a2e2a)}.fs-paper .abc-on{fill:#b3372f}.fs-src{max-height:360px;overflow:auto;font-size:11px;white-space:pre}";

  var LAYOUT0 = { mode: "pages", across: 2, cutaway: false, scale: 0.9, barWidth: 200, staffGap: 16, apart: true, sysGap: 40, pageH: 100, numbers: "system", barlines: "family", barWeight: "abcjs", headroom: 64, rests: true,
    even: 0, evenDyn: true, evenDense: true, evenComp: true };

  function mount(el, o) {
    if (typeof el === "string") el = document.querySelector(el);
    if (!document.getElementById("fs-css")) { var st = document.createElement("style"); st.id = "fs-css"; st.textContent = CSS; document.head.appendChild(st); }
    var S = parse(o.abc), id = o.id || "score", KV = "fullscore-" + id + "-views", KL = "fullscore-" + id + "-last", KY = "fullscore-" + id + "-layout";
    var q0 = +((/^Q:\s*1\/4\s*=\s*(\d+)/m.exec(o.abc) || [])[1]) || +((/^Q:\s*1\/2\s*=\s*(\d+)/m.exec(o.abc) || [])[1]) * 2 || 120;
    var all = S.parts.map(function (p) { return p.key; });
    var BUILT = [["Full score", all]].concat(FAMILIES.map(function (f) { return [f[1], S.parts.filter(function (p) { return p.fam === f[0]; }).map(function (p) { return p.key; })]; }).filter(function (b) { return b[1].length; }),
      [["Strings + woodwinds", S.parts.filter(function (p) { return p.fam === "st" || p.fam === "ww"; }).map(function (p) { return p.key; })]]);
    var chosen = (store.get(KL, null) || all).filter(function (k) { return all.indexOf(k) >= 0; }); if (!chosen.length) chosen = all.slice();
    var L = Object.assign({}, LAYOUT0, store.get(KY, {}));
    if (L.mode === "cutaway") { L.mode = "pages"; L.cutaway = true; }      // older saved layouts
    if (L.barWidth == null || L.spacing != null) { delete L.spacing; delete L.bars; L.barWidth = LAYOUT0.barWidth; }
    // pickup: a first bar shorter than the others is bar 0 (printed scores number from the first full bar)
    var firstV = S.parts[0].voices[0], pickup = S.bars[firstV].length > 1 && barLen(S.bars[firstV][0].text) < barLen(S.bars[firstV][1].text) - 1e-6;
    var visuals = [], drawnText = "", played = null, playVisual = null, playing = null, fromMs = 0, fromKey = null, elMap = {}, keyOf = new Map(), lit = [];

    el.classList.add("fs");
    el.innerHTML =
      '<div class="fs-bar"><button type="button" class="fs-play">▶ Play</button><button type="button" class="fs-stop">■ Stop</button>' +
      '<label for="fs-q-' + id + '">♩ = <input id="fs-q-' + id + '" type="range" class="fs-q" min="40" max="' + Math.max(320, q0) + '" step="4" value="' + q0 + '"><span class="fs-tempo">' + q0 + '</span></label>' +
      '<label><input type="checkbox" class="fs-follow" checked> Follow</label>' +
      '<span class="fs-pageturn" hidden><button type="button" class="fs-chip fs-prev" aria-label="Previous page">◀ Page</button> <button type="button" class="fs-chip fs-next" aria-label="Next page">Page ▶</button></span>' +
      '<form class="fs-go"><label>Bar <input type="number" class="fs-goto" min="0" max="' + S.nBars + '" inputmode="numeric" aria-label="Go to bar number"></label><button type="submit" class="fs-chip">Go</button></form>' +
      '<button type="button" class="fs-chip fs-fromclear" hidden>From the start</button><span class="fs-status" aria-live="polite"></span></div>' +
      '<div class="fs-chips"></div>' +
      '<details class="fs-choose"><summary>Choose instruments <span class="fs-count fs-status"></span></summary><div class="fs-pick"></div>' +
      '<form class="fs-save"><input type="text" maxlength="40" placeholder="Name this view, e.g. Horns + low strings" aria-label="View name"><button type="submit">Save view</button></form></details>' +
      '<details class="fs-layout"><summary>Layout <span class="fs-laysum fs-status"></span></summary><div class="fs-lay">' +
        '<label>Show <select data-k="mode"><option value="pages">Pages, scrolling down</option><option value="paged">Pages side by side, scrolling across</option><option value="line">One long line</option></select></label>' +
        '<label>Pages across <select data-k="across"><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label>' +
        '<label>Page height <input type="range" data-k="pageH" min="40" max="250" step="5"><output></output></label>' +
        '<label><input type="checkbox" data-k="cutaway"> Hide staves that rest through a system (cutaway)</label>' +
        '<label>Bar numbers <select data-k="numbers"><option value="off">Off</option><option value="system">Start of each system</option><option value="1">Every bar</option><option value="5">Every 5 bars</option><option value="10">Every 10 bars</option></select></label>' +
        '<label>Bar lines through <select data-k="barlines"><option value="staff">Each staff</option><option value="family">Each family</option><option value="score">The whole score</option></select></label>' +
        '<label>Bar line weight <select data-k="barWeight"><option value="abcjs">Thin (abcjs: lighter than a stem)</option><option value="musescore">MuseScore (heavier than a stem)</option></select></label>' +
        '<label>Size <input type="range" data-k="scale" min="0.5" max="1.5" step="0.05"><output></output></label>' +
        '<label>Bar width <input type="range" data-k="barWidth" min="70" max="500" step="10"><output></output></label>' +
        '<label>Space between staves <input type="range" data-k="staffGap" min="0" max="90" step="2"><output></output></label>' +
        '<label>Staff spacing <select data-k="apart"><option value="even">Even: the same on every page (MuseScore\'s default look)</option><option value="apart">Keep notes and markings of neighbouring staves apart</option></select></label>' +
        '<label>Space above the top staff <input type="range" data-k="headroom" min="20" max="140" step="4"><output></output></label>' +
        '<label>Space between systems <input type="range" data-k="sysGap" min="0" max="140" step="4"><output></output></label>' +
        '<label><input type="checkbox" data-k="rests"> Rests in the middle when the other voice rests</label>' +
        '<button type="button" class="fs-chip fs-layreset">Reset layout</button>' +
      '</div></details>' +
      '<details class="fs-sound"><summary>Even out the loudness <span class="fs-evensum fs-status"></span></summary><div class="fs-lay">' +
        '<label>Even out <input type="range" data-k="even" min="0" max="100" step="5"><output></output></label>' +
        '<label><input type="checkbox" data-k="evenDyn"> Written dynamics closer together (p louder, ff softer)</label>' +
        '<label><input type="checkbox" data-k="evenDense"> Fewer instruments playing: each louder; tutti: each softer</label>' +
        '<label><input type="checkbox" data-k="evenComp"> Compressor on the whole orchestra</label>' +
      '</div></details>' +
      '<div class="fs-sheet"><div class="fs-names"></div><div class="fs-paper"></div></div>' +
      (o.notes || "") +
      '<details><summary>The ABC of what is shown</summary><pre class="fs-src"></pre></details>';
    var $ = function (s) { return el.querySelector(s); }, paper = $(".fs-paper"), sheet = $(".fs-sheet"), status = $(".fs-status"), qIn = $(".fs-q");

    // ---------- instruments and views
    $(".fs-pick").innerHTML = FAMILIES.map(function (f) {
      var ps = S.parts.filter(function (p) { return p.fam === f[0]; }); if (!ps.length) return "";
      return '<div class="fs-fam"><h4>' + f[1] + ' <button type="button" data-fam="' + f[0] + '">only these</button></h4>' +
        ps.map(function (p) { return '<label><input type="checkbox" value="' + p.key + '"> ' + esc(p.label) + "</label>"; }).join("") + "</div>";
    }).join("");
    $(".fs-pick").addEventListener("change", function (e) {
      if (e.target.type !== "checkbox") return; var k = e.target.value;
      chosen = e.target.checked ? all.filter(function (x) { return x === k || chosen.indexOf(x) >= 0; }) : chosen.filter(function (x) { return x !== k; });
      apply();
    });
    $(".fs-pick").addEventListener("click", function (e) { var b = e.target.closest("[data-fam]"); if (!b) return;
      chosen = S.parts.filter(function (p) { return p.fam === b.dataset.fam; }).map(function (p) { return p.key; }); apply(); });
    function chips() {
      var mine = store.get(KV, []), same = function (ks) { return ks.length === chosen.length && ks.every(function (k) { return chosen.indexOf(k) >= 0; }); };
      $(".fs-chips").innerHTML = BUILT.map(function (b, i) { return '<button type="button" class="fs-chip" data-b="' + i + '" aria-pressed="' + same(b[1]) + '">' + b[0] + "</button>"; }).join("") +
        mine.map(function (v, i) { return '<button type="button" class="fs-chip mine" data-m="' + i + '" aria-pressed="' + same(v.keys) + '">' + esc(v.name) +
          '<span class="x" data-del="' + i + '" title="Delete this view">×</span></button>'; }).join("");
    }
    $(".fs-chips").addEventListener("click", function (e) {
      var d = e.target.closest("[data-del]"); if (d) { var m = store.get(KV, []); m.splice(+d.dataset.del, 1); store.set(KV, m); chips(); return; }
      var b = e.target.closest(".fs-chip"); if (!b) return;
      chosen = (b.dataset.b != null ? BUILT[+b.dataset.b][1] : store.get(KV, [])[+b.dataset.m].keys).filter(function (k) { return all.indexOf(k) >= 0; }); apply();
    });
    $(".fs-save").addEventListener("submit", function (e) {
      e.preventDefault(); var inp = $(".fs-save input"), name = inp.value.trim(); if (!name || !chosen.length) return;
      var m = store.get(KV, []).filter(function (v) { return v.name !== name; }); m.push({ name: name, keys: chosen.slice() }); store.set(KV, m);
      inp.value = ""; chips(); status.textContent = "Saved “" + name + "”.";
    });

    // ---------- layout controls
    var lay = $(".fs-lay");
    function showLayout() {
      el.querySelectorAll(".fs-lay [data-k]").forEach(function (c) {
        var k = c.dataset.k; if (c.type === "checkbox") c.checked = !!L[k]; else if (k === "apart") c.value = L.apart ? "apart" : "even"; else c.value = L[k];
        if (c.nextElementSibling && c.nextElementSibling.tagName === "OUTPUT") c.nextElementSibling.textContent = k === "scale" ? Math.round(L[k] * 100) + "%" : k === "even" || k === "pageH" ? L[k] + "%" : L[k];
      });
      $(".fs-evensum").textContent = L.even ? L.even + "%" : "off";
      lay.querySelector('[data-k=across]').disabled = lay.querySelector('[data-k=pageH]').disabled = L.mode !== "paged"; lay.querySelector('[data-k=cutaway]').disabled = L.mode === "line";
      $(".fs-laysum").textContent = { pages: "pages", paged: "side by side", line: "one line" }[L.mode] + (L.cutaway && L.mode !== "line" ? ", cutaway" : "") + ", " + Math.round(L.scale * 100) + "%";
    }
    var lt;
    lay.addEventListener("input", function (e) {
      var c = e.target, k = c.dataset && c.dataset.k; if (!k) return;
      L[k] = c.type === "checkbox" ? c.checked : k === "apart" ? c.value === "apart" : c.tagName === "SELECT" ? (k === "across" ? +c.value : c.value) : +c.value;
      if (k === "apart" && !L.apart && L.staffGap < 30) L.staffGap = 44;   // even spacing alone needs a wider gap than the "apart" minimum
      store.set(KY, L); showLayout();
      clearTimeout(lt); lt = setTimeout(function () { var keep = playing; stop(); draw(); if (keep) play(); }, c.type === "range" ? 250 : 0);
    });
    $(".fs-sound").addEventListener("input", function (e) {   // sound settings: no redraw, a running performance restarts with them
      var c = e.target, k = c.dataset && c.dataset.k; if (!k) return;
      L[k] = c.type === "checkbox" ? c.checked : +c.value; store.set(KY, L); showLayout();
      clearTimeout(lt); lt = setTimeout(function () { if (playing) play(); else compressor(); }, c.type === "range" ? 300 : 0);
    });
    $(".fs-layreset").addEventListener("click", function () { L = Object.assign({}, LAYOUT0); store.set(KY, L); showLayout(); stop(); draw(); });

    // ---------- drawing. Every layout is built from the page's own systems (the same bar width in all of them, so switching
    // layout keeps the spacing); abcjs draws each system with its own gaps at their smallest, then respace() places the staves
    // where the layout says, stretches the family brackets, and draws bar lines between staves.
    function drawnBody(v, shownV) { var d = S.display[v]; return d && shownV[d.of] ? d.body : S.body[v]; }
    function shownVoices() { var s = {}; S.parts.forEach(function (p) { if (chosen.indexOf(p.key) >= 0) p.voices.forEach(function (v) { s[v] = true; }); }); return s; }
    var NS = "http://www.w3.org/2000/svg", colCache = {};
    function render(target, text, w, base, matchable, startBar, sys) {   // base: { v: bar offset into the voice's line }
      // staffwidth is in screen pixels (abcjs divides by the scale itself); the names column comes on top when the music needs the
      // room: draw once, measure the column, draw again so the whole system is w wide
      var o2 = { scale: L.scale, staffwidth: Math.max(150, w - 4), add_classes: true, paddingleft: 0, paddingright: 4, paddingtop: 0, paddingbottom: 0, clickListener: clicked };
      function once() {
        var v1 = ABCJS.renderAbc(target, text.abc, o2)[0], sv = target.querySelector("svg"); if (!sv) return { v: v1, w: 0 };
        target.style.overflow = "visible"; target.style.height = "";   // abcjs clips its box; the staves are moved after it measured
        var k = /scale\(([\d.]+)/.exec(sv.style.transform || ""), f = k ? +k[1] : 1;
        if (!sv.getAttribute("viewBox")) {               // abcjs scales by a CSS transform, which leaves the box full size: a viewBox instead
          var W = parseFloat(sv.getAttribute("width")), H = parseFloat(sv.getAttribute("height"));
          sv.style.transform = ""; sv.style.transformOrigin = ""; sv.setAttribute("viewBox", "0 0 " + W + " " + H); sv.setAttribute("width", W * f); sv.setAttribute("height", H * f);
        }
        return { v: v1, w: parseFloat(sv.getAttribute("width")) };
      }
      var ck = (sys === 0 ? "first" : L.mode === "line" ? "piece" : "rest") + L.scale;   // the column's width, kept per kind of system
      if (colCache[ck] != null) o2.staffwidth = Math.max(150, w - 4 - colCache[ck]);
      var r1 = once(), v = r1.v;
      if (r1.w && Math.abs(r1.w - w) > 2) { var extra = r1.w - 4 - o2.staffwidth; colCache[ck] = extra; o2.staffwidth = Math.max(150, w - 4 - extra); v = once().v; }
      if (!v) return null;
      visuals.push(v);
      index(v, text, base || {}, matchable);
      if (L.rests) centerRests(v, target);
      var m = measure(target, text);
      if (sys > 0) target.querySelectorAll(".abcjs-time-signature").forEach(function (g) { g.style.display = "none"; });   // a new piece to abcjs, not a meter change
      return { v: v, m: m };
    }

    // ---------- the staves of one drawn system. measure() reads each staff's outline once; place() puts the staves where the
    // layout says (staffGap = from one staff's bottom line to the next one's top line; with "apart", more where the notes and
    // markings below one staff would meet those above the next) and can run again (the long line evens out its pieces).
    function measure(target, text) {
      var svg = target.querySelector("svg"); if (!svg) return null;
      var vStaff = [], famOf = [], n = 0;
      text.fams.forEach(function (fam, fi) { fam.forEach(function (g) { g.forEach(function () { vStaff.push(n); }); famOf.push(fi); n++; }); });
      var nameAt = 0, G = []; for (var s = 0; s < n; s++) G.push({ els: [], lines: null, br: [], bars: [], lead: [], keyR: -1e9, first: 1e9 });
      [].forEach.call(svg.querySelectorAll("[class*='abcjs-v']"), function (e) {
        if (e.parentElement && e.parentElement.closest("[class*='abcjs-v']")) return;   // moves with its parent
        var c = e.getAttribute("class") || "", mm = /abcjs-v(\d+)/.exec(c); if (!mm) return;
        var st = /abcjs-voice-name/.test(c) ? nameAt++ : vStaff[+mm[1]]; if (st == null || !G[st]) return;   // a name is numbered by staff, not voice
        e.__t0 = e.getAttribute("transform") || ""; e.__dx = 0;
        if (/abcjs-bracket|abcjs-brace/.test(c)) { G[st].br.push(e); return; }
        if (/(^| )abcjs-staff( |$)/.test(c) && !G[st].lines) G[st].lines = e;
        if (/(^| )abcjs-bar( |$)/.test(c)) G[st].bars.push(e);
        G[st].els.push(e);
      });
      // abcjs's own line down the system's left edge belongs to no staff and is not moved: ours (in place()) takes its part
      [].forEach.call(svg.querySelectorAll(".abcjs-staff-wrapper > path:not([class])"), function (e) { e.style.display = "none"; });
      // tempo and other text abcjs draws outside the voices: they go with the top staff
      [].forEach.call(svg.querySelectorAll(".abcjs-tempo,.abcjs-text,.abcjs-title,.abcjs-subtitle"), function (e) {
        if (!G[0] || (e.parentElement && e.parentElement.closest("[class*='abcjs-v'],.abcjs-tempo,.abcjs-text"))) return;
        e.__t0 = e.getAttribute("transform") || ""; e.__dx = 0; G[0].els.push(e);
      });
      // time signatures and an opening repeat line up across the staves, whatever each staff's key signature is
      G.forEach(function (g) {
        g.els.forEach(function (e) {
          var c = e.getAttribute("class"), b; try { b = e.getBBox(); } catch (x) { return; }
          if (/abcjs-clef|abcjs-key-signature/.test(c)) g.keyR = Math.max(g.keyR, b.x + b.width);
          else if (/abcjs-note|abcjs-rest/.test(c) && b.width) g.first = Math.min(g.first, b.x);
        });
        g.els.forEach(function (e) {
          var c = e.getAttribute("class"); if (!/abcjs-time-signature|(^| )abcjs-bar( |$)/.test(c)) return;
          var b; try { b = e.getBBox(); } catch (x) { return; } if (b.x < g.first) g.lead.push(e);
        });
      });
      // each leading piece (time signature, opening bar line) put where the staff with the widest key signature has it: abcjs
      // spaces them differently after each key signature
      function leads(g) { return g.lead.map(function (e) { var b; try { b = e.getBBox(); } catch (x) { b = { x: 0 }; } return { e: e, x: b.x, k: /time-signature/.test(e.getAttribute("class")) ? "t" : "b" }; }).sort(function (p, q) { return p.x - q.x; }); }
      var ref = null; G.forEach(function (g) { if (g.lead.length && (!ref || g.keyR > ref.keyR)) ref = g; });
      if (ref) {
        var R = leads(ref);
        G.forEach(function (g) {
          if (g === ref) return; var seen = { t: 0, b: 0 };
          leads(g).forEach(function (l) { var m = R.filter(function (r) { return r.k === l.k; })[seen[l.k]++]; if (m) l.e.__dx = m.x - l.x; });
        });
      }
      // each staff's outline (MuseScore's "skyline"): in strips STRIP wide, the highest and lowest ink, from every drawn piece
      var STRIP = 6;
      var I = G.map(function (g) {
        if (!g.lines) return null;
        var lb = g.lines.getBBox(), r = { x: lb.x, w: lb.width, top: lb.y, bot: lb.y + lb.height, ct: lb.y, cb: lb.y + lb.height, up: {}, dn: {} };
        g.els.forEach(function (e) {
          if (e === g.lines) return;
          var leaves = e.children && e.children.length ? e.querySelectorAll("path,text,rect,line,ellipse") : [e];
          [].forEach.call(leaves, function (l) {
            var b; try { b = l.getBBox(); } catch (x) { return; } if (!(b.height > 0 || b.width > 0)) return;
            var x0 = b.x + e.__dx, t = /translate\(0,([-\d.e]+)\)/.exec(e.__t0), y0 = b.y + (t ? +t[1] : 0);   // a centred rest
            r.ct = Math.min(r.ct, y0); r.cb = Math.max(r.cb, y0 + b.height);
            for (var k = Math.floor(x0 / STRIP), k2 = Math.floor((x0 + b.width) / STRIP); k <= k2; k++) {
              r.up[k] = Math.min(r.up[k] == null ? lb.y : r.up[k], y0); r.dn[k] = Math.max(r.dn[k] == null ? lb.y + lb.height : r.dn[k], y0 + b.height);
            }
          });
        });
        return r;
      });
      // bar lines: the tall strokes of each (a repeat's thin and thick lines, not its dots), joined between staves later
      G.forEach(function (g, i) {
        if (!I[i]) return;
        var h = I[i].bot - I[i].top;
        g.strokes = [];
        g.bars.forEach(function (e) {
          [].forEach.call(e.querySelectorAll("path"), function (p) {
            if (/dot/.test(p.getAttribute("data-name") || "")) return;
            var b; try { b = p.getBBox(); } catch (x) { return; }
            if (b.height >= h * 0.8) g.strokes.push({ x: b.x + e.__dx, w: b.width, y: b.y, h: b.height });
          });
        });
      });
      // the first notes of each bar on the top staff: bar numbers, go to bar
      var M = { svg: svg, G: G, I: I, n: n, famOf: famOf, vb: (svg.getAttribute("viewBox") || "").split(/[\s,]+/).map(Number), h: parseFloat(svg.getAttribute("height")) || 0 };
      M.need = []; M.top = I[0] ? I[0].top : 0;
      for (var s2 = 1; s2 < n; s2++) {
        var p = s2 - 1; while (p >= 0 && !I[p]) p--;
        M.need.push(I[s2] && p >= 0 ? (L.apart ? need(I[p], I[s2]) : 0) : 0);
      }
      target._m = M;
      return M;
    }
    // how far apart two staves' lines must be so their outlines keep 3 units clear, strip by strip
    function need(A, B) {
      var m = 0;
      Object.keys(A.dn).forEach(function (k) { var below = A.dn[k] - A.bot; [k - 1, +k, +k + 1].forEach(function (j) { var above = B.up[j] == null ? 0 : B.top - B.up[j]; m = Math.max(m, below + above + 3); }); });
      Object.keys(B.up).forEach(function (k) { m = Math.max(m, (B.top - B.up[k]) + 3); });
      return m;
    }
    // gaps[s-1] = from staff s-1's bottom line to staff s's top line; top = where the first staff's top line goes
    function gapsOf(M) { return M.need.map(function (x) { return Math.max(L.staffGap, x); }); }
    function place(target, gaps, top) {
      var M = target._m; if (!M) return;
      var G = M.G, I = M.I, n = M.n, svg = M.svg, pos = [];
      for (var s = 0; s < n; s++) {
        if (!I[s]) { pos.push(0); continue; }
        var p = s - 1; while (p >= 0 && !I[p]) p--;
        pos.push(p < 0 ? (top == null ? 0 : top - I[s].top) : I[p].bot + pos[p] + gaps[s - 1] - I[s].top);
      }
      M.pos = pos;
      function put(e, dx, dy) { var t = (dx || dy ? "translate(" + (dx || 0) + "," + dy + ")" : "") + (e.__t0 ? " " + e.__t0 : ""); if (t) e.setAttribute("transform", t.trim()); else e.removeAttribute("transform"); }
      G.forEach(function (g, i) { g.els.forEach(function (e) { put(e, e.__dx, pos[i]); }); });
      // brackets and braces: from the first staff of their family to its last, stretched
      G.forEach(function (g, i) {
        g.br.forEach(function (e) {
          var last = i; while (last + 1 < n && M.famOf[last + 1] === M.famOf[i] && (e.getAttribute("class").indexOf("brace") < 0 || last + 1 <= i + 1)) last++;
          if (!I[i] || !I[last]) return;
          var oT = I[i].top, oB = I[last].bot, nT = oT + pos[i], nB = oB + pos[last], k = (nB - nT) / Math.max(1, oB - oT);
          e.setAttribute("transform", "translate(0," + nT + ") scale(1," + k + ") translate(0," + (-oT) + ")");
        });
      });
      // bar lines between staves (each stroke as wide as the staff's own), within a family or through the whole score
      [].forEach.call(svg.querySelectorAll(".fs-barjoin"), function (r) { r.remove(); });
      // (no stroke: the svg's own stroke="currentColor" would widen every rect by a unit)
      function rect(x, y1, y2, w) { if (y2 <= y1) return; var r = document.createElementNS(NS, "rect"); r.setAttribute("class", "fs-barjoin"); r.setAttribute("stroke", "none"); r.setAttribute("x", x); r.setAttribute("y", y1); r.setAttribute("width", w); r.setAttribute("height", y2 - y1); svg.appendChild(r); }
      // weight: "abcjs" = its own thin lines (thinner than a stem); "musescore" = thin lines 0.18 of a staff space (heavier than a stem),
      // drawn over the staff's own bar lines too. Thick lines stay as abcjs draws them.
      var sp = I[0] ? (I[0].bot - I[0].top) / 4 : 7.9, heavy = L.barWeight === "musescore";
      function wide(k) { var w = heavy && k.w < 1.5 ? 0.18 * sp : k.w; return { x: k.x + k.w / 2 - w / 2, w: w }; }
      if (heavy) G.forEach(function (g, i) { (g.strokes || []).forEach(function (k) { var q = wide(k); if (q.w > k.w) rect(q.x, k.y + pos[i], k.y + k.h + pos[i], q.w); }); });
      if (L.barlines !== "staff") for (var a = 0; a + 1 < n; a++) {
        var b2 = a + 1; if (!I[a] || !I[b2] || (L.barlines === "family" && M.famOf[a] !== M.famOf[b2])) continue;
        var y1 = I[a].bot + pos[a], y2 = I[b2].top + pos[b2];
        (G[a].strokes || []).forEach(function (k) { var q = wide(k); rect(q.x, y1, y2, q.w); });
      }
      if (n > 1 && I[0] && I[n - 1] && !M.noOpen) { var q0 = wide({ x: I[0].x, w: 0.6 }); rect(q0.x, I[0].top + pos[0], I[n - 1].bot + pos[n - 1], q0.w); }   // the system's opening line
      var nums = svg.querySelector(".fs-nums"); if (nums && I[0]) nums.setAttribute("transform", "translate(0," + pos[0] + ")");
      // the drawing's height after the moves
      var bottom = 0; I.forEach(function (r, i) { if (r) bottom = Math.max(bottom, r.cb + pos[i]); });
      var vb = M.vb, h = M.h;
      if (vb.length === 4 && vb[3] > 0) {
        var ratio = h / vb[3] || 1, x0 = M.cropX != null ? M.cropX : vb[0], nh = bottom + 12, nw = vb[2] - (x0 - vb[0]);
        svg.setAttribute("viewBox", [x0, 0, nw, nh].join(" ")); svg.setAttribute("height", nh * ratio); svg.setAttribute("width", nw * ratio);
      } else if (h) svg.setAttribute("height", Math.max(h, bottom + 12));
      svg.style.overflow = "visible";
    }

    // bar numbers, counted from the first full bar (a pickup is 0): "system" = above the first bar of every system but the first,
    // "N" = above every bar whose number divides by N; set above the top staff's outline there. Every bar's start is kept for
    // "go to bar" (barAt[index] = { el, target }).
    function barNumbers(v, target, startBar) {
      var M = target._m, svg = M && M.svg; if (!svg) return;
      var every = L.numbers === "system" ? 0 : +L.numbers, done = startBar, open = false, I0 = M.I[0];
      var g = document.createElementNS(NS, "g"); g.setAttribute("class", "fs-nums"); svg.appendChild(g); if (M.pos) g.setAttribute("transform", "translate(0," + M.pos[0] + ")");
      // centred over the bar line the bar starts with (its first stroke: the thick line of a "|:"), or over the system's opening line
      function put(bar, n) {
        var x;
        if (bar) { var p = bar.querySelector("path:not([data-name*=dot])") || bar, bb = p.getBBox(); x = bb.x + bb.width / 2 + (bar.__dx || 0); }
        else x = I0 ? I0.x : 2;
        var y = I0 ? I0.top - 4 : 0, t = document.createElementNS(NS, "text");
        if (I0) for (var k = Math.floor(x / 6) - 2, k2 = Math.floor((x + 12) / 6); k <= k2; k++) if (I0.up[k] != null) y = Math.min(y, I0.up[k] - 3);
        t.setAttribute("class", "abcjs-bar-number fs-barnum"); t.setAttribute("text-anchor", "middle");
        t.setAttribute("x", Math.max(8, x)); t.setAttribute("y", y); t.setAttribute("font-size", every ? "11" : "13"); t.setAttribute("font-style", "italic");
        t.textContent = n; g.appendChild(t);
      }
      (v.lines || []).forEach(function (line) {
        if (!line.staff || !line.staff[0]) return;
        var lineStart = true, lastBar = null;
        line.staff[0].voices[0].forEach(function (e) {
          if (e.el_type === "bar") { if (open) { done++; open = false; } lastBar = e.abselem && e.abselem.elemset && e.abselem.elemset[0]; return; }
          if (e.el_type !== "note") return;
          if (!open) {                                  // the first note or rest of a bar (an invisible rest: the bar line before it)
            var n = done - (pickup ? 1 : 0) + 1, el2 = e.abselem && e.abselem.elemset && e.abselem.elemset[0] || lastBar;
            if (el2) {
              barAt[done] = { el: el2, target: target };
              if (L.numbers !== "off" && n > 0 && (every ? n % every === 0 : lineStart && done > 0 && L.mode !== "line")) put(lastBar, n);
              lineStart = false;
            }
          }
          open = true;
        });
      });
    }
    // drawn element -> "voice:offset" (offset in the voice's line); only for voices drawn from their full line
    function index(v, text, base, matchable) {
      (v.lines || []).forEach(function (line) {
        if (!line.staff) return;
        var k = 0;
        line.staff.forEach(function (st) { st.voices.forEach(function (els) {
          var vid = text.flat[k++]; if (!vid || !matchable[vid]) return;
          els.forEach(function (e) {
            if (e.el_type !== "note" || e.startChar == null || !e.abselem) return;
            var key = vid + ":" + (e.startChar - text.start[vid] + (base[vid] || 0));
            keyOf.set(e, key);
            (elMap[key] = elMap[key] || []).push(e.abselem.elemset || []);
          });
        }); });
      });
    }
    // rests on a staff with two voices: abcjs draws them high (first voice) or low (second). A rest goes to the middle (where one
    // voice would have it) when no other voice on the staff sounds while it lasts; where both rest together, only one is shown.
    function centerRests(v, target) {
      var staffPath = target.querySelector(".abcjs-staff"), gap = staffPath ? staffPath.getBBox().height / 4 : 6;
      (v.lines || []).forEach(function (line) {
        (line.staff || []).forEach(function (st) {
          if (st.voices.length < 2) return;
          var ev = st.voices.map(function (els) {         // [start, end, sounding?, rest element] in whole notes
            var t = 0, out = [];
            els.forEach(function (e) {
              if (e.el_type !== "note" || !e.duration) return;
              var d = e.duration, inv = e.rest && (e.rest.type === "invisible" || e.rest.type === "spacer");
              out.push({ a: t, b: t + d, sound: !e.rest, rest: e.rest && !inv ? e : null });
              t += d;
            });
            return out;
          });
          var shown = [];
          ev.forEach(function (list, vi) {
            list.forEach(function (r) {
              if (!r.rest || !r.rest.abselem) return;
              var alone = ev.every(function (o, oi) { return oi === vi || !o.some(function (x) { return x.sound && x.a < r.b - 1e-6 && x.b > r.a + 1e-6; }); });
              if (!alone) return;
              var set = r.rest.abselem.elemset || [];
              if (shown.some(function (s) { return Math.abs(s.a - r.a) < 1e-6 && Math.abs(s.b - r.b) < 1e-6; })) { set.forEach(function (g) { g.style.visibility = "hidden"; }); return; }
              var glyph = (r.rest.abselem.children || []).filter(function (c) { return c.c && /^rests\./.test(c.c); })[0], pitch = glyph ? glyph.pitch : (vi === 0 ? 11 : 3);
              var home = 7, dy = (pitch - home) * gap / 2;   // abcjs's own places on a one-voice staff
              if (dy) set.forEach(function (g) { g.setAttribute("transform", "translate(0," + dy + ")"); });
              shown.push(r);
            });
          });
        });
      });
    }
    function names(text) {                                 // the long line: instrument names that stay at the left edge
      var box = $(".fs-names"); box.innerHTML = "";
      if (L.mode !== "line" || !text) return;
      var first = paper.querySelector(".fs-sys"); if (!first) return;
      var top = paper.getBoundingClientRect().top - sheet.getBoundingClientRect().top;
      var staffs = [].slice.call(first.querySelectorAll(".abcjs-staff"));
      var labels = []; text.fams.forEach(function (fam) { fam.forEach(function (g) { labels.push(partOfVoice(S, g[0]).short); }); });
      staffs.forEach(function (s, i) {
        if (!labels[i]) return;
        var r = s.getBoundingClientRect(), y = r.top + r.height / 2 - paper.getBoundingClientRect().top + top;
        var sp = document.createElement("span"); sp.textContent = labels[i]; sp.style.top = y + "px"; box.appendChild(sp);
      });
    }
    // one system's text: bars s..e-1 of the shown staves (cutaway: only staves with something to play there)
    function systemText(fams, shownV, s, e, sys, cut, noNames) {
      var cf = !cut ? fams : fams.map(function (st) {
        return st.map(function (g) {
          var play = g.filter(function (v) { var bs = (S.display[v] && shownV[S.display[v].of] ? S.display[v].bars : S.bars[v]).slice(s, e); return bs.some(function (b) { return b.notes; }); });
          return play.length ? play : null;
        }).filter(Boolean);
      }).filter(function (st) { return st.length; });
      if (!cf.length) cf = [[[fams[0][0][0]]]];
      var base = {};
      var t = assemble(S, cf, function (v) {
        var d = S.display[v] && shownV[S.display[v].of], bs = d ? S.display[v].bars : S.bars[v], src = d ? S.display[v].body : S.body[v];
        var a = bs[s], b = bs[e - 1]; if (!a) return "";
        var pre = stateBefore(S, v, s);
        base[v] = a.start - pre.length;                   // the carried fields are not in the voice's line
        return pre + src.slice(a.start, b.end);
      }, { noTitle: true, noTempo: sys > 0, short: sys > 0, noNames: noNames, directives: ["%%sysstaffsep 0", "%%staffsep 0", "%%stretchlast 1"] });
      t.fams = cf; t.base = base;
      return t;
    }
    // Drawing a layout: the systems are worked out first, then drawn in order. The first screenful is drawn at once, the rest a
    // system at a time between other work (the page answers while it draws); "go to bar" draws up to its bar first. The long line
    // is drawn in pieces too, the later ones without clef and names, all with the same staff positions.
    var gen = 0, job = null, barAt = {};
    function draw(sync) {
      var t0 = performance.now(), my = ++gen;
      paper.innerHTML = ""; visuals = []; elMap = {}; keyOf = new Map(); lit = []; barAt = {}; clearFrom(true);
      var line = L.mode === "line", paged = L.mode === "paged";
      sheet.classList.toggle("fs-line", line); sheet.classList.toggle("fs-paged", paged);
      $(".fs-pageturn").hidden = !paged;
      sheet.style.setProperty("--fs-sysgap", Math.round(L.sysGap * L.scale) + "px");
      var shownV = shownVoices(), fams = staves(S, chosen, S.drawStaff), matchable = {};
      Object.keys(shownV).forEach(function (v) { matchable[v] = drawnBody(v, shownV) === S.body[v]; });
      var bar = document.documentElement.scrollHeight <= global.innerHeight ? 16 : 0;   // room for the scroll bar the drawing will bring
      var full = Math.max(300, sheet.clientWidth - 20 - bar), across = paged ? Math.max(1, L.across) : 1;
      var colW = paged ? Math.floor((full - (across - 1) * 20) / across) - 28 : full;
      var barPx = L.barWidth * L.scale, per = line ? Math.max(4, Math.round(Math.max(700, full) / barPx)) : Math.max(1, Math.round(colW / barPx));
      var cut = L.cutaway && !line, pageH = Math.max(240, Math.round((global.innerHeight - 150) * (L.pageH || 100) / 100));
      var systems = []; for (var s0 = 0; s0 < S.nBars; s0 += per) systems.push({ s: s0, e: Math.min(S.nBars, s0 + per) });
      var i = 0, page = null, used = 0, pageNo = 0, texts = [], lineGaps = null, lineSys = [], firstText = null, done = [];
      // the space above every top staff: the setting, or more when a system's tempo, words or high notes (and its bar numbers) need it;
      // when one does, the systems drawn before move down too, so the top staff stays at one height on every page
      var head = L.headroom;
      function newPage() { page = document.createElement("div"); page.className = "fs-page"; page.style.width = (colW + 28) + "px"; page.style.minHeight = (pageH + 40) + "px";
        var nb = document.createElement("div"); nb.className = "fs-pageno"; nb.textContent = ++pageNo; page.appendChild(nb); paper.appendChild(page); used = 0; }
      function step() {
        var r = systems[i], t = systemText(fams, shownV, r.s, r.e, i, cut, line && i > 0);
        if (!firstText) firstText = t;
        texts.push(t.abc);
        var w = line ? (r.e - r.s) * barPx + (i ? 40 : 160) : colW * (r.e - r.s < per ? Math.max(0.4, (r.e - r.s) / per) : 1);
        var dv = document.createElement("div"); dv.className = "fs-sys"; dv.dataset.sys = i;
        if (paged) { if (!page) newPage(); page.appendChild(dv); } else paper.appendChild(dv);
        var res = render(dv, t, w, t.base, matchable, r.s, i);
        if (res && res.m) {
          var M = res.m, I0 = M.I[0];
          if (I0) { var want = I0.top - I0.ct + (L.numbers !== "off" ? 18 : 4); if (want > head) { head = want; done.forEach(function (d) { place(d.dv, d.gaps, head); }); if (lineGaps) lineSys.forEach(function (d) { place(d, lineGaps, head); }); } }
          if (line) {
            if (i > 0) {                                  // a later piece of the line: start it at its first note, nothing before
              var fx = Math.min.apply(null, M.G.map(function (g) { return g.first; }));
              if (fx < 1e8) M.cropX = fx - 10;
              M.noOpen = true;
              dv.querySelectorAll(".abcjs-staff-extra,.abcjs-bracket,.abcjs-brace").forEach(function (g) { g.style.display = "none"; });
            }
            var g2 = gapsOf(M), changed = !lineGaps;
            if (!lineGaps) lineGaps = g2;
            else g2.forEach(function (x, k) { if (x > lineGaps[k]) { lineGaps[k] = x; changed = true; } });
            lineSys.push(dv);
            (changed ? lineSys : [dv]).forEach(function (d) { place(d, lineGaps, head); });
          } else { var gg = gapsOf(M); place(dv, gg, head); done.push({ dv: dv, gaps: gg }); }
          barNumbers(res.v, dv, r.s);
        }
        if (paged) {                                      // a system that does not fit starts the next page
          var h = dv.offsetHeight + (used ? Math.round(L.sysGap * L.scale) : 0);
          if (used && used + h > pageH) { newPage(); page.appendChild(dv); h = dv.offsetHeight; }
          used += h;
        }
        i++;
      }
      function enough() {
        if (paged) return pageNo > across;
        if (line) return paper.scrollWidth > sheet.clientWidth * 1.5;
        return paper.offsetHeight > global.innerHeight * 1.5;
      }
      function finish() {
        var pages = [].slice.call(paper.querySelectorAll(".fs-page")), mh = 0;   // every page as tall as the tallest
        pages.forEach(function (p) { mh = Math.max(mh, p.offsetHeight); }); pages.forEach(function (p) { p.style.minHeight = mh + "px"; });
        drawnText = texts.join("\n%% ---- next system ----\n");
        $(".fs-src").textContent = drawnText;
        names(line ? firstText : null);
        el.dataset.renderMs = Math.round(performance.now() - t0);
        el.dataset.systems = paper.querySelectorAll(".fs-sys").length;
        el.dataset.pages = pageNo;
        el.dataset.drawing = "";
        job.done = true;
      }
      job = { systems: systems, done: false, ensure: function (k) { if (my !== gen) return; while (i <= k && i < systems.length) step(); if (i >= systems.length && !job.done) finish(); } };
      el.dataset.drawing = "1";
      while (i < systems.length && (sync || !enough())) step();
      el.dataset.firstMs = Math.round(performance.now() - t0);
      if (line) names(firstText);
      if (i >= systems.length) { finish(); return; }
      (function more() {
        if (my !== gen) return;
        if (i < systems.length) { step(); if (line && i === systems.length) names(firstText); }
        if (i >= systems.length) { if (!job.done) finish(); return; }
        setTimeout(more, 0);
      })();
    }
    // go to bar n (as numbered: a pickup is 0): draw up to it, bring it into view, light it a moment, and start playing there
    function goBar(n) {
      var idx = Math.max(0, Math.min(S.nBars - 1, n - 1 + (pickup ? 1 : 0)));
      var k = job.systems.findIndex(function (r) { return idx >= r.s && idx < r.e; }); job.ensure(k);
      var at = barAt[idx]; if (!at) { status.textContent = "Bar " + n + " is not drawn."; return; }
      var pg = at.target.closest(".fs-page");
      if (pg) sheet.scrollLeft = pg.offsetLeft - 10;
      if (L.mode === "line") { var r0 = at.el.getBoundingClientRect(), sr = sheet.getBoundingClientRect(); sheet.scrollLeft += r0.left - sr.left - 140; }
      var r = at.target.getBoundingClientRect(); global.scrollBy({ top: r.top - 80 });
      var svg = at.target.querySelector("svg"), bb = at.el.getBBox(), nx = barAt[idx + 1] && barAt[idx + 1].target === at.target ? barAt[idx + 1].el.getBBox().x : bb.x + L.barWidth;
      var vb = (svg.getAttribute("viewBox") || "0 0 0 0").split(/[\s,]+/).map(Number), fl = document.createElementNS(NS, "rect");
      fl.setAttribute("class", "fs-flash"); fl.setAttribute("x", bb.x - 4); fl.setAttribute("width", Math.max(10, nx - bb.x)); fl.setAttribute("y", vb[1]); fl.setAttribute("height", vb[3]);
      svg.insertBefore(fl, svg.firstChild); setTimeout(function () { fl.remove(); }, 1800);
      // play from here: the first moment of the played form in that bar or later
      playForm();
      var hit = timing().filter(function (e) { return e.keys.some(function (key) { return barOfKey(key) >= idx; }); })[0];
      clearFrom(true); if (!hit) return;
      fromMs = hit.ms; $(".fs-fromclear").hidden = false; status.textContent = "Play starts at bar " + n + ".";
      if (playing) play();
    }
    function barOfKey(key) {
      var c = key.lastIndexOf(":"), v = key.slice(0, c), off = +key.slice(c + 1), bs = S.bars[v] || [];
      for (var j = 0; j < bs.length; j++) if (off < bs[j].end) return j;
      return bs.length;
    }
    function pageTurn(d) {
      var pages = [].slice.call(paper.querySelectorAll(".fs-page")); if (!pages.length) return;
      var x = sheet.scrollLeft, i = pages.findIndex(function (p) { return p.offsetLeft >= x - 4; }); if (i < 0) i = pages.length - 1;
      var to = pages[Math.max(0, Math.min(pages.length - 1, i + d))]; sheet.scrollTo({ left: to.offsetLeft - 10, behavior: "smooth" });
    }
    var rt, lastW = 0; global.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { var w = sheet.clientWidth; if (Math.abs(w - lastW) > 8) { lastW = w; var keep = playing; stop(); draw(); if (keep) play(); } }, 250); });

    // ---------- the played form and its timing
    function playForm() {
      if (played) return played;
      var shownV = shownVoices();
      played = assemble(S, staves(S, chosen, S.staffOf), function (v) { return S.body[v]; }, { directives: [] });
      var hid = document.getElementById("fs-play-" + id);
      if (!hid) { hid = document.createElement("div"); hid.id = "fs-play-" + id; hid.setAttribute("aria-hidden", "true");
        hid.style.cssText = "position:absolute;left:-100000px;top:0;width:1200px;visibility:hidden"; document.body.appendChild(hid); }
      playVisual = ABCJS.renderAbc(hid, played.abc, { staffwidth: 1100, wrap: { minSpacing: 1.5, maxSpacing: 2.7, preferredMeasuresPerLine: 4 } })[0];
      var ranges = played.flat.map(function (v) { return { v: v, a: played.start[v], b: played.start[v] + S.body[v].length }; });
      played.keyAt = function (ch) { for (var i = 0; i < ranges.length; i++) if (ch >= ranges[i].a && ch <= ranges[i].b) return ranges[i].v + ":" + (ch - ranges[i].a); return null; };
      return played;
    }
    function timing() {
      var q = +qIn.value, tm = playVisual.setTiming(q / (playVisual.getBeatLength() * 4));
      return tm.filter(function (e) { return e.type === "event"; }).map(function (e) {
        return { ms: e.milliseconds, keys: (e.startCharArray || [e.startChar]).map(played.keyAt).filter(Boolean) };
      });
    }

    // ---------- from here: a drawn note's place in the played form, its first time through
    function clicked(abcElem) {
      var key = keyOf.get(abcElem); if (!key) { status.textContent = "That note is drawn but not matched to playback; click another."; return; }
      playForm();
      var hit = timing().filter(function (e) { return e.keys.indexOf(key) >= 0; })[0]; if (!hit) return;
      clearFrom(); fromMs = hit.ms; fromKey = key;
      (elMap[key] || []).forEach(function (set) { set.forEach(function (g) { g.classList.add("fs-from"); }); });
      $(".fs-fromclear").hidden = false; status.textContent = "Play starts from the marked note.";
      if (playing) play();
    }
    function clearFrom(keepStatus) {
      if (fromKey) (elMap[fromKey] || []).forEach(function (set) { set.forEach(function (g) { g.classList.remove("fs-from"); }); });
      fromKey = null; fromMs = 0; $(".fs-fromclear").hidden = true; if (!keepStatus) status.textContent = "";
    }
    $(".fs-fromclear").addEventListener("click", function () { clearFrom(); });

    function apply() {
      stop(); played = null; playVisual = null;
      if (!chosen.length) chosen = [all[0]];
      el.querySelectorAll(".fs-pick input").forEach(function (c) { c.checked = chosen.indexOf(c.value) >= 0; });
      $(".fs-count").textContent = chosen.length + " of " + all.length + " shown";
      store.set(KL, chosen); chips(); draw();
    }

    // ---------- playing: AbcPlay sounds the played form; the lit notes and Follow are ours
    var raf = 0, curMs = 0;
    function unlight() { lit.forEach(function (g) { g.classList.remove("abc-on"); }); lit = []; }
    function cursor(ac, t0, events) {
      var i = -1;
      (function tick() {
        if (!playing) return;
        var now = (ac.currentTime - t0) * 1000 + fromMs; curMs = now;
        if (i + 1 < events.length && events[i + 1].ms <= now) {
          while (i + 1 < events.length && events[i + 1].ms <= now) i++;
          unlight();
          events[i].keys.forEach(function (k) { (elMap[k] || []).forEach(function (set) { set.forEach(function (g) { if (g.classList) { g.classList.add("abc-on"); lit.push(g); } }); }); });
          if ($(".fs-follow").checked && lit[0]) follow(lit[0]);
        }
        raf = requestAnimationFrame(tick);
      })();
    }
    var lastFollow = 0;
    function follow(g) {
      var now = performance.now(); if (now - lastFollow < 250) return; lastFollow = now;
      var r = g.getBoundingClientRect(), vh = global.innerHeight, sr = sheet.getBoundingClientRect(), pg = g.closest && g.closest(".fs-page");
      if (pg) {                                         // side by side: turn to the page when it is not all in view
        var pr = pg.getBoundingClientRect();
        if (pr.left < sr.left - 2 || pr.right > sr.right + 2) sheet.scrollTo({ left: pg.offsetLeft - 10, behavior: "smooth" });
        if (r.top < 70 || r.bottom > vh - 40) global.scrollBy({ top: r.top - vh * 0.35, behavior: "smooth" });
        return;
      }
      if (r.top < 70 || r.bottom > vh - 40) global.scrollBy({ top: r.top - vh * 0.35, behavior: "smooth" });
      if (r.left < sr.left + 90 || r.right > sr.right - 30) sheet.scrollBy({ left: r.left - sr.left - sr.width * 0.3, behavior: "smooth" });
    }
    // ---------- even out the loudness (L.even 0..100)
    // written dynamics: each velocity pulled toward the median by the amount (abcjs gives !p! … !ff! as velocities);
    // instruments at once: each note's level times (playing / usual)^(-amount/2): N instruments together sound about √N times one,
    // so at 100% a tutti and a solo come out level ("usual" = the median count, so the overall level stays put; held 0.35-2.5)
    function shape(notes) {
      var a = L.even / 100; if (!a) return notes;
      var vs = notes.map(function (n) { return n.vel; }).filter(function (v) { return v != null; }).sort(function (x, y) { return x - y; });
      var mid = vs.length ? vs[vs.length >> 1] : 0.7;
      if (L.evenDyn) notes.forEach(function (n) { if (n.vel != null) n.vel = mid + (n.vel - mid) * (1 - a); });
      if (L.evenDense) {
        var ends = {}, counts = notes.map(function (n) {
          ends[n.track] = Math.max(ends[n.track] || 0, n.at + (n.dur || 0.1));
          var c = 0; for (var t in ends) if (ends[t] > n.at + 1e-4) c++; return Math.max(1, c);
        });
        var cs = counts.slice().sort(function (x, y) { return x - y; }), usual = cs[cs.length >> 1] || 1;
        notes.forEach(function (n, i) { n.gain = Math.min(2.5, Math.max(0.35, Math.pow(counts[i] / usual, -a / 2))); });
      }
      return notes;
    }
    // the compressor sits between AbcPlay's output and the speakers; at 0% (or unticked) it is taken out again
    var comp = null;
    function compressor() {
      if (!global.AbcPlay) return Promise.resolve();
      return global.AbcPlay.ctx().then(function (s) {
        var a = L.evenComp ? L.even / 100 : 0;
        if (!comp) { comp = { c: s.ac.createDynamicsCompressor(), g: s.ac.createGain(), on: false }; comp.c.connect(comp.g); comp.g.connect(s.ac.destination); }
        comp.c.threshold.value = -8 - 32 * a; comp.c.ratio.value = 1 + 11 * a; comp.c.knee.value = 12; comp.c.attack.value = 0.01; comp.c.release.value = 0.3;
        comp.g.gain.value = 1 + 0.9 * a;
        if (a && !comp.on) { try { s.out.disconnect(s.ac.destination); } catch (e) {} s.out.connect(comp.c); comp.on = true; }
        if (!a && comp.on) { try { s.out.disconnect(comp.c); } catch (e) {} s.out.connect(s.ac.destination); comp.on = false; }
      });
    }

    function play() {
      stop();
      if (!global.AbcPlay) { status.textContent = "Playback is not loaded."; return; }
      status.textContent = "Loading the instruments…";
      playForm();
      var events = timing();
      compressor();
      var me = playing = global.AbcPlay.play(playVisual, { tracks: true, qpm: +qIn.value, fromMs: fromMs, light: false, shape: shape,
        onStart: function (s) { if (playing !== me) return; status.textContent = "Playing" + (fromMs ? " from the marked note" : "") + "…"; cursor(s.ac, s.t0, events); },
        onEnd: function () { if (playing === me) { playing = null; cancelAnimationFrame(raf); unlight(); status.textContent = ""; } } });
    }
    function stop() {
      if (playing) { var p = playing; playing = null; try { p.stop(); } catch (e) {} }
      cancelAnimationFrame(raf); unlight();
      if (/^(Playing|Loading)/.test(status.textContent)) status.textContent = "";
    }
    $(".fs-prev").addEventListener("click", function () { pageTurn(-1); });
    $(".fs-next").addEventListener("click", function () { pageTurn(1); });
    global.addEventListener("keydown", function (e) {      // ← → turn pages side by side (not while typing or on a slider)
      if (L.mode !== "paged" || e.altKey || e.metaKey || e.ctrlKey || /INPUT|SELECT|TEXTAREA/.test((document.activeElement || {}).tagName || "")) return;
      if (e.key === "ArrowRight") { pageTurn(1); e.preventDefault(); } else if (e.key === "ArrowLeft") { pageTurn(-1); e.preventDefault(); }
    });
    // Space plays and pauses (a pause keeps the place: the next play goes on from it), wherever the focus is but in a text field
    global.addEventListener("keydown", function (e) {
      if (e.key !== " " || e.altKey || e.metaKey || e.ctrlKey) return;
      var a = document.activeElement || {}, tag = a.tagName || "";
      if (a.isContentEditable || tag === "TEXTAREA" || (tag === "INPUT" && /^(text|search|email|url|password)$/.test(a.type))) return;
      e.preventDefault();
      if (playing) { var at = curMs; stop(); fromMs = at; fromKey = null; $(".fs-fromclear").hidden = false; status.textContent = "Paused. Space plays on."; }
      else play();
    }, true);
    $(".fs-go").addEventListener("submit", function (e) { e.preventDefault(); var n = parseInt($(".fs-goto").value, 10); if (!isNaN(n)) goBar(n); });
    $(".fs-play").addEventListener("click", play);
    $(".fs-stop").addEventListener("click", stop);
    qIn.addEventListener("input", function () { $(".fs-tempo").textContent = qIn.value; });
    qIn.addEventListener("change", function () { if (fromKey) { var k = fromKey; playForm(); var h = timing().filter(function (e) { return e.keys.indexOf(k) >= 0; })[0]; if (h) fromMs = h.ms; } if (playing) play(); });

    showLayout(); lastW = sheet.clientWidth; apply();
    return { view: function (keys) { chosen = keys.slice(); apply(); }, play: play, stop: stop, parts: S.parts,
      layout: function (x) { if (x) { Object.assign(L, x); store.set(KY, L); showLayout(); stop(); draw(true); } return Object.assign({}, L); },
      goBar: function (n) { goBar(n); }, flush: function () { job.ensure(1e9); },
      abc: function () { return drawnText; }, shape: shape, playedAbc: function () { return playForm().abc; }, matched: function () { return Object.keys(elMap).length; } };
  }
  function barLen(t) {                                    // a bar's length in L units, roughly (for spotting a pickup)
    var s = t.replace(/\[[A-Za-z]:[^\]]*\]|"[^"]*"|![^!]*!|[|:\]\d]*$/g, "").replace(/\[([^\]]*)\]/g, function (m, c) { return (c.match(/[A-Ga-gzx][,']*/) || ["C"])[0] + (/\](\d*\/*\d*)/.exec(m) || [""])[0]; });
    var n = 0; (s.match(/[A-Ga-gzx][,']*(\d*)(\/*)(\d*)/g) || []).forEach(function (x) {
      var m = /(\d*)(\/*)(\d*)$/.exec(x), a = m[1] ? +m[1] : 1, d = m[2] ? (m[3] ? +m[3] : Math.pow(2, m[2].length)) : 1; n += a / d; });
    return n;
  }

  global.FullScore = { mount: mount, parse: parse, splitBars: splitBars, shortName: shortName, INSTRUMENTS: INSTRUMENTS, FAMILIES: FAMILIES };
})(typeof window !== "undefined" ? window : this);
