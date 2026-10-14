// chord-lesson.js — the engine of the lessons on chord changes (ChordLesson): numbered steps, a builder and an ear test, each with a chord
// chart (TuneChart), a staff (LessonChordStaff) and the Backing Track band. The page supplies the prose, the strip at the bottom (#bl-bar)
// and a configuration:
//
//   ChordLesson.init({
//     tonic: 0, minor: false,               the key the charts are written in (a pitch class; "minor" = the signature of its minor key); the Key menu moves it
//     times: 4,                             how many times the band plays the form
//     feels: [{ id, label, tempo }], inst?  the Feel menu (BandCatalog style ids), the first is the start
//     steps: { id: { bars: "C|Am7 D7|...", vs: "other step id", minor?, staff?, tune?, note? } }
//          bars   one string; bars split with "|", chords in a bar with spaces, "C:2" = two beats (the rest share what is left)
//          vs     the step this one is compared with: its different bars are shaded and a button plays the other
//          staff  "chords" (default) | "third" | "seventh" | "guide": what the staff under the chart shows (LessonChordStaff mode)
//          tune   an id of BluesTunes (tunes.js), written in C: its melody is drawn above the chart and the band's piano plays it
//     builder: { slots: [{ opts: [[label, bars], ...] }] , presets?: [[label, [pick, ...]]] }       one menu per slot (a slot = one or more bars)
//            or { chords: ["C", "Dm", ...], bars: 4, presets?: [[label, "C|G|Am|F"]] }              one menu of chords for each bar
//     quizzes: [{ host: "id", question, items: [{ name, bars, minor?, answer? }], options?: [labels] }]
//          each question plays one item and asks for its `answer` (default its name) among `options` (default: its name and three others)
//   })
//
// Needs abcjs, LessonScore, LessonChordStaff, TuneChart, BandHarmony, BandCatalog, BandPlayer and the strip's elements
// (bl-key, bl-feel, bl-tempo, bl-tempo-n, bl-inst, bl-loop, bl-stop, bl-status).
(function (global) {
  var MAJOR = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"], MINORK = ["Cm", "C#m", "Dm", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "Bbm", "Bm"];
  var NAMES = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"], SHARPKEYS = { 2: 1, 4: 1, 7: 1, 9: 1, 11: 1 };

  function init(cfg) {
    var cat = global.BandCatalog, H = global.BandHarmony;
    if (!cat || !H || !global.BandPlayer || !global.TuneChart) return;
    var tonic = cfg.tonic || 0, times = cfg.times || 4, feels = cfg.feels, STEPS = cfg.steps || {};
    var state = { one: false, key: 0, feel: feels[0].id, tempo: feels[0].tempo, inst: "piano", loop: false };
    function $(id) { return document.getElementById(id); }
    function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
    function split(s) { return s.split("|"); }
    // the chart's abc: one bar = chords sharing four beats, "C:2" fixing two of them
    function barAbc(b) {
      var cs = b.split(" "), fixed = 0, free = 0;
      cs.forEach(function (c) { var m = /:(\d)$/.exec(c); if (m) fixed += +m[1]; else free++; });
      var each = free ? (4 - fixed) / free : 0;
      return cs.map(function (c) { var m = /^(.*):(\d)$/.exec(c); return '"' + (m ? m[1] : c) + '"z' + (m ? +m[2] : each); }).join(" ");
    }
    function plain(c) { return c.replace(/:\d$/, ""); }
    function abcOf(bars, minor) {
      var out = bars.map(barAbc), rows = []; for (var i = 0; i < out.length; i += 4) rows.push(out.slice(i, i + 4).join(" | "));
      return "X:1\nT:Changes\nM:4/4\nL:1/4\nK:" + (minor ? MINORK : MAJOR)[tonic] + "\n" + rows.join(" |\n") + " |]";
    }
    function numerals(bars) { return bars.map(function (b) { return b.split(" ").map(function (c) { return H.roman(plain(c), tonic); }).join(" "); }).join(" | "); }
    function semis() { var d = state.key; return d > 6 ? d - 12 : d; }
    function flats() { return !SHARPKEYS[(tonic + state.key + (cfg.minor ? 3 : 0)) % 12]; }
    function band() {
      var so = cat.styleOpts(state.feel, state.inst === "guitar" ? "guitar" : "piano"), opts = Object.assign({}, so.opts, { variation: 0.5 }), need = so.instruments.slice();
      if (state.inst === "organ") { opts.compSound = "hammond"; need[1] = "hammond"; }
      return { opts: opts, instruments: need };
    }

    // ---- a chart with its staff, following the key and shading some bars ----
    var charts = [];
    function makeChart(host, bars, marked, o) {
      o = o || {};
      var c = { bars: bars, marked: marked || [], minor: !!o.minor, diagram: o.diagram, live: 0 }, inner = el("div"), sh = el("div", "bl-staff"), dg = o.diagram ? el("div", "bl-boards" + (o.diagram === "piano" ? "" : " bl-each")) : null;
      if (dg && o.diagram !== "piano") {   // guitar and bass pages: a diagram per chord is long, so offer one chord (the sounding bar's) at a time
        var one = el("button", "btn btn-sm btn-outline-secondary bl-one", "Show one chord at a time"); one.type = "button"; one.setAttribute("aria-pressed", "false");
        one.addEventListener("click", function () { state.one = !state.one; charts.forEach(function (x) { x.fit(); }); });
        c.oneBtn = one; var tools = el("div", "bl-tools"); tools.appendChild(one); host.appendChild(tools);
      }
      if (dg) host.appendChild(dg); host.appendChild(inner); host.appendChild(sh);
      c.staff = global.LessonChordStaff ? global.LessonChordStaff.create(sh, { bars: bars, tonic: tonic, minor: c.minor, mode: o.staff, transpose: semis(), flats: flats() }) : null;
      c.chart = global.TuneChart.render(inner, abcOf(bars, c.minor), { header: false, barsPerRow: 4, roman: "both", romanFn: H.roman, transpose: semis(), preferFlats: flats() });
      c.fit = function () {   // "one chord at a time": show only the cards of the live bar's chords (the first bar when nothing plays)
        if (!dg || !c.oneBtn) return; c.oneBtn.classList.toggle("bl-on", !!state.one); c.oneBtn.setAttribute("aria-pressed", state.one ? "true" : "false");
        var want = (c.bars[c.live] || c.bars[0] || "").split(" ").map(plain);
        Array.prototype.forEach.call(dg.children, function (card) { card.hidden = !!state.one && want.indexOf(card.getAttribute("data-sym")) < 0; });
      };
      c.draw = function () { if (dg) { drawDiagrams(dg, c.bars, c.diagram); c.fit(); } };
      c.mark = function () { c.chart.barEls.forEach(function (b, i) { b.classList.toggle("bl-new", c.marked.indexOf(i) >= 0); }); };
      c.set = function (bars, marked, minor) { c.bars = bars; c.marked = marked || []; if (minor != null) c.minor = !!minor; c.chart.setTune(abcOf(bars, c.minor)); c.mark(); c.draw(); if (c.staff) { c.staff.o.minor = c.minor; c.staff.set(bars); } };
      c.setLive = function (i) { c.chart.setLive(i); if (i != null && i >= 0 && i !== c.live) { c.live = i; c.fit(); } if (c.staff) c.staff.light(i); };
      c.rekey = function () { c.chart.setTranspose(semis(), flats()); c.mark(); c.draw(); if (c.staff) c.staff.rekey(semis(), flats()); };
      c.mark(); c.draw(); charts.push(c); return c;
    }

    // ---- the chords drawn for an instrument: "guitar" (open shapes, or barre shapes in a key that has none), "piano" (right-hand chord over a left-hand root), "bass" (the bass note) ----
    var DEG = { 0: "R", 2: "9", 3: "♭3", 4: "3", 5: "4", 6: "♭5", 7: "5", 8: "♯5", 9: "6", 10: "♭7", 11: "7" };
    function distinct(bars) { var seen = {}, out = []; bars.forEach(function (b) { b.split(" ").forEach(function (c) { c = plain(c); if (!seen[c]) { seen[c] = 1; out.push(c); } }); }); return out; }
    function drawDiagrams(host, bars, kind) {
      var LD = global.LessonDiagrams, S = global.LessonChordStaff; host.textContent = ""; if (!LD || !S) return;
      var chords = distinct(bars).map(function (sym) { return { sym: sym, d: S.describe(sym, semis(), flats()), c: H.parseChord(sym, semis()) }; }).filter(function (x) { return x.d && x.c && !x.c.nc; });
      if (kind === "piano") {
        var lanes = chords.map(function (x) { return { label: x.d.name, notes: [{ midi: x.d.bassMidi, hand: "L", root: true, text: "R" }].concat(x.d.midis.map(function (m) { return { midi: m, hand: "R", text: DEG[((m - x.c.root) % 12 + 12) % 12] || "" }; })) }; });
        var lo = Math.min.apply(null, lanes.map(function (l) { return Math.min.apply(null, l.notes.map(function (n) { return n.midi; })); })), hi = Math.max.apply(null, lanes.map(function (l) { return Math.max.apply(null, l.notes.map(function (n) { return n.midi; })); }));
        var card = el("div", "bl-card"); card.appendChild(LD.keyboard(lanes, { range: [Math.floor(lo / 12) * 12, Math.ceil((hi + 1) / 12) * 12 - 1] })); host.appendChild(card); return;
      }
      chords.forEach(function (x) {
        var notes, strings;
        if (kind === "bass") {
          var m = x.d.bassMidi - 12, opens = [28, 33, 38, 43], best = null;
          opens.forEach(function (o, s) { var f = m - o; if (f >= 0 && f <= 9 && (!best || f < best.fret)) best = { string: s, fret: f }; });
          if (!best) return; strings = ["E", "A", "D", "G"]; notes = [{ string: best.string, fret: best.fret, root: true, text: x.d.name.replace(/^.*\//, "").replace(/^([A-G][#b]?).*$/, "$1") }];
          if (!/\//.test(x.d.name)) notes[0].text = x.d.name.replace(/^([A-G][#b]?).*$/, "$1");
        } else {
          var sh = H.openShape(x.c); if (!sh) return; strings = ["E", "A", "D", "G", "B", "E"];
          notes = sh.strings.map(function (s) { var iv = ((s.midi - x.c.root) % 12 + 12) % 12; return { string: s.string, fret: s.fret, text: DEG[iv] || "", root: iv === 0 }; });
        }
        var card = el("div", "bl-card"); card.setAttribute("data-sym", x.sym); card.appendChild(LD.fretboard([{ label: x.d.name, notes: notes }], { strings: strings })); host.appendChild(card);
      });
    }
    function lineTune(view) {
      var m = view && view.staff && view.staff.o.mode, T = global.BluesTunes;
      if (!m || m === "chords" || m === "bass" || !T || !global.AbcTune) return null;
      return { bars: T.melody(view.staff.abc(), 0), score: null, tune: { pickup: 0 } };
    }

    // ---- a tune's melody above a chart (BluesTunes, written in C), lit note by note and handed to the band ----
    var tunes = [], Score = global.LessonScore, Tunes = global.BluesTunes;
    function keyName() { return NAMES[(tonic + state.key) % 12].replace("♭", "b"); }
    function makeTune(host, id, before) {
      var t = Tunes && Tunes[id]; if (!t || !Score) return null;
      var head = el("p", "bl-legend", t.title + (t.composer ? ", by " + t.composer : "") + ":"), row = el("div", "bl-abc"), btn = el("button", "btn btn-sm btn-outline-secondary", "▶ Play"), staff = el("div"), tn = { tune: t, score: null, bars: [] };
      btn.type = "button"; btn.title = "The tune alone, on a piano"; row.appendChild(btn); row.appendChild(staff); host.insertBefore(head, before); host.insertBefore(row, before);
      btn.addEventListener("click", function () { Score.play(btn, tn.score, { onStart: stop }); });
      tn.draw = function () { var abc = Tunes.inKey(t, keyName(), { barsPerLine: global.innerWidth < 600 ? 2 : 4 }); tn.score = Score.engrave(staff, abc, { width: 680, fluid: true }); tn.bars = Tunes.melody(abc, t.pickup); };
      tn.draw(); tunes.push(tn); return tn;
    }
    function withTune(parsed, tune) { if (tune) parsed.bars.forEach(function (pb, i) { var m = tune.bars[i]; if (m && m.length) pb.melody = m.map(function (n) { return { pos: n.pos, dur: n.dur, midi: n.midi - semis() }; }); }); return parsed; }
    function follow() {
      if (!now || !player) return;
      var at = player.where && player.where();
      if (now.tune && now.tune.score && at && at.info && !at.info.countIn && !at.info.ending && at.info.index >= 0) now.tune.score.mark(now.tune.tune.pickup + 4 * at.info.index + at.pos);
      global.requestAnimationFrame(follow);
    }

    // ---- one band for the page ----
    var player = null, now = null;
    function status(t) { $("bl-status").textContent = t || ""; }
    function idle() {
      if (now) { now.btn.textContent = now.label; now.btn.classList.remove("bl-on"); if (now.view) now.view.setLive(-1); if (now.tune && now.tune.score) now.tune.score.clear(); now = null; }
      $("bl-stop").disabled = true; status("");
    }
    function stop() { if (player) { try { player.stop(); } catch (e) {} } idle(); }
    function play(btn, view, bars, minor, tune) {
      var same = now && now.btn === btn; stop(); if (Score) Score.stop(); if (same) return;
      var parsed = withTune(global.TuneChart.parse(abcOf(bars, minor)), tune), b = band(); b.opts.melody = !!tune; b.opts.melodyLevel = 0.95;
      if (!player) player = global.BandPlayer.create({ parsed: parsed, tempo: state.tempo, transpose: semis(), countIn: 1, opts: b.opts, instruments: b.instruments,
        onBar: function (info) { if (!now) return; status(info.countIn ? "Count-in" : info.ending ? "" : "Bar " + (info.index + 1) + (state.loop ? "" : ", time " + (info.chorus + 1) + " of " + times));
          if (now.view) now.view.setLive(info.countIn || info.ending ? -1 : info.index); },
        onState: function (s) { if (s === "loading") status("Loading the sounds…"); },
        onEnd: idle });
      else { player.setInstruments(b.instruments); player.setChart(parsed); player.setOpts(b.opts); player.setTempo(state.tempo); player.setTranspose(semis()); }
      player.setCycle(null, null); player.setStartBar(0); player.setChoruses(state.loop ? 0 : times);
      now = { btn: btn, label: btn.textContent, view: view, bars: bars, minor: minor, tune: tune || null };
      btn.textContent = "■ Stop"; btn.classList.add("bl-on"); $("bl-stop").disabled = false;
      player.play().then(function () { if (now && now.btn === btn) global.requestAnimationFrame(follow); }, function () { idle(); status("The sounds could not be loaded."); });
    }
    function playBtn(label, primary) { var b = el("button", "btn btn-sm " + (primary ? "btn-primary" : "btn-outline-secondary"), label); b.type = "button"; return b; }
    function oneLine(bars) { return numerals(bars).replace(/ \| /g, " "); }

    // ---- the numbered steps ----
    Array.prototype.forEach.call(document.querySelectorAll(".bl-step"), function (host) {
      var s = STEPS[host.getAttribute("data-step")]; if (!s) return;
      var bars = split(s.bars), other = s.vs ? STEPS[s.vs] : null, before = other ? split(other.bars) : null;
      var changed = before ? bars.map(function (b, i) { return b !== before[i] ? i : -1; }).filter(function (i) { return i >= 0; }) : [];
      host.classList.add("bl-widget");
      var tools = el("div", "bl-tools"), paper = el("div"); host.appendChild(tools); host.appendChild(paper);
      var tune = s.tune ? makeTune(host, s.tune, paper) : null;
      var view = makeChart(paper, bars, changed, { minor: s.minor, staff: s.staff, diagram: s.diagram });
      var b1 = playBtn(tune ? "▶ Play with the band" : "▶ Play", true); b1.addEventListener("click", function () { play(b1, view, bars, s.minor, tune || lineTune(view)); }); tools.appendChild(b1);
      if (before) { var b2 = playBtn(s.compare || "▶ Hear " + (s.vsLabel || oneLine(before)) + " for comparison"); b2.addEventListener("click", function () { play(b2, view, before, other.minor, tune); }); tools.appendChild(b2); }
      if (changed.length) { var lg = el("p", "bl-legend"); lg.appendChild(el("i")); lg.appendChild(document.createTextNode("Different from " + (s.vsLabel || oneLine(before)))); host.appendChild(lg); }
    });

    // ---- build your own ----
    (function () {
      var host = $("bl-builder"), B = cfg.builder; if (!host || !B) return;
      var slots = B.slots || [], presets = B.presets || [], sels = [], picks, grid = el("div", "bl-slots"), tools = el("div", "bl-tools"), paper = el("div");
      var asPreset = !!B.chords;
      if (B.chords) { var nb = B.bars || 4; for (var k = 0; k < nb; k++) slots.push({ label: "Bar " + (k + 1), opts: B.chords.map(function (c) { return [c, c]; }) }); }
      slots.forEach(function (sl) { sl.n = split(sl.opts[0][1]).length; });
      picks = B.start ? B.start.slice() : slots.map(function () { return 0; });
      host.appendChild(grid); host.appendChild(tools); host.appendChild(paper);
      function assemble() { var out = []; slots.forEach(function (sl, k) { out = out.concat(split(sl.opts[picks[k]][1])); }); return out; }
      var tune = B.tune ? makeTune(host, B.tune, paper) : null, view = makeChart(paper, assemble(), [], { staff: B.staff, diagram: B.diagram });
      function marked() { if (asPreset) return []; var m = [], at = 0; slots.forEach(function (sl, k) { if (picks[k]) for (var j = 0; j < sl.n; j++) m.push(at + j); at += sl.n; }); return m; }
      function refresh() { view.set(assemble(), marked()); if (now && now.view === view && player) player.setChart(withTune(global.TuneChart.parse(abcOf(view.bars, false)), tune || lineTune(view))); }
      function label(o) { return asPreset ? numerals([o[1]]) + "  (" + o[0] + ")" : o[0] + ":  " + numerals(split(o[1])); }
      var at = 0;
      slots.forEach(function (sl, k) {
        var wrap = el("div"), id = "bl-slot-" + k, lab = el("label", null, sl.label || (sl.n > 1 ? "Bars " + (at + 1) + " to " + (at + sl.n) : "Bar " + (at + 1))), sel = el("select", "form-select form-select-sm");
        at += sl.n; lab.htmlFor = id; sel.id = id;
        sl.opts.forEach(function (o, i) { var op = el("option", null, label(o)); op.value = i; sel.appendChild(op); });
        sel.value = picks[k]; sel.addEventListener("change", function () { picks[k] = +sel.value; refresh(); });
        wrap.appendChild(lab); wrap.appendChild(sel); grid.appendChild(wrap); sels.push(sel);
      });
      function setAll(fn) { picks = slots.map(fn); sels.forEach(function (s, k) { s.value = picks[k]; }); refresh(); }
      var go = playBtn("▶ Play", true); go.addEventListener("click", function () { play(go, view, view.bars, false, tune || lineTune(view)); }); tools.appendChild(go);
      var rnd = playBtn("Surprise me"); rnd.addEventListener("click", function () { setAll(function (sl) { return Math.floor(Math.random() * sl.opts.length); }); }); tools.appendChild(rnd);
      if (presets.length) {
        var pre = el("select", "form-select form-select-sm"); pre.style.width = "auto"; pre.setAttribute("aria-label", "Start from a ready-made one");
        var o0 = el("option", null, "Start from…"); o0.value = ""; pre.appendChild(o0);
        presets.forEach(function (p, i) { var o = el("option", null, p[0]); o.value = i; pre.appendChild(o); });
        pre.addEventListener("change", function () {
          if (pre.value === "") return; var p = presets[+pre.value][1];
          if (typeof p === "string") { var bs = split(p); setAll(function (sl, k) { return Math.max(0, sl.opts.map(function (o) { return o[1]; }).indexOf(bs[k])); }); } else setAll(function (sl, k) { return p[k]; });
          pre.value = "";
        });
        tools.appendChild(pre);
      }
      var copy = playBtn("Copy as ABC"); tools.appendChild(copy);
      copy.addEventListener("click", function () {
        var text = abcOf(view.bars, false).replace("T:Changes", "T:My changes (written in " + MAJOR[tonic] + ")");
        var done = function (ok) { copy.textContent = ok ? "Copied" : "Could not copy"; setTimeout(function () { copy.textContent = "Copy as ABC"; }, 1500); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); }); else done(false);
      });
      if (!asPreset) { var lg = el("p", "bl-legend"); lg.appendChild(el("i")); lg.appendChild(document.createTextNode("Changed from the plain version")); host.appendChild(lg); }
    })();

    // ---- test your ear ----
    (cfg.quizzes || []).forEach(function (Q) {
      var host = $(Q.host); if (!host) return;
      var tools = el("div", "bl-tools"), ask = el("p", null, "Press New question to begin."), count = el("div", "bl-count"), answers = el("div", "bl-answers"),
          verdict = el("p", "bl-verdict"), score = el("p", "bl-score"), paper = el("div");
      [tools, ask, count, answers, verdict, score, paper].forEach(function (e) { host.appendChild(e); });
      paper.hidden = true; verdict.setAttribute("aria-live", "polite");
      var nbars = split(Q.items[0].bars).length, boxes = []; for (var i = 0; i < nbars; i++) { var d = el("div", null, String(i + 1)); count.appendChild(d); boxes.push(d); }
      var counter = { setLive: function (i) { boxes.forEach(function (b, k) { b.classList.toggle("bl-live", k === i); }); } };
      var q = null, right = 0, asked = 0, last = -1;
      var next = playBtn("New question", true), again = playBtn("▶ Hear it again"); again.disabled = true; tools.appendChild(next); tools.appendChild(again);
      function listen() { if (q) play(again, counter, q.bars, q.minor); }
      again.addEventListener("click", listen);
      function shuffle(a) { return a.sort(function () { return Math.random() - 0.5; }); }
      next.addEventListener("click", function () {
        var k; do { k = Math.floor(Math.random() * Q.items.length); } while (k === last && Q.items.length > 1); last = k;
        var it = Q.items[k], right_ = it.answer || it.name, opts = Q.options ? Q.options.slice() : shuffle(Q.items.map(function (x) { return x.answer || x.name; }).filter(function (n, i, a) { return n !== right_ && a.indexOf(n) === i; })).slice(0, 3).concat(right_);
        if (!Q.options) shuffle(opts);
        q = { bars: split(it.bars), minor: it.minor, right: right_, done: false, item: it };
        ask.textContent = Q.question; boxes.forEach(function (b) { b.classList.remove("bl-ask"); });
        answers.textContent = ""; verdict.textContent = ""; paper.hidden = true; again.disabled = false;
        opts.forEach(function (name) {
          var b = el("button", "btn btn-sm btn-outline-secondary", name); b.type = "button"; b.setAttribute("data-answer", name);
          b.addEventListener("click", function () {
            if (q.done) return; q.done = true; asked++;
            var ok = name === q.right; if (ok) right++; else b.classList.add("bl-wrong");
            Array.prototype.forEach.call(answers.children, function (x) { if (x.getAttribute("data-answer") === q.right) x.classList.add("bl-right"); });
            verdict.textContent = (ok ? "Yes. " : "Not this time. The band played " + q.right + ". ") + (it.why || "");
            score.textContent = right + " right out of " + asked;
            paper.hidden = false; paper.textContent = ""; makeChart(paper, q.bars, [], { minor: q.minor });
          });
          answers.appendChild(b);
        });
        if (now && now.btn === again) stop();
        listen();
      });
    });

    // ---- the strip at the bottom ----
    for (var i = 0; i < 12; i++) { var o = el("option", null, NAMES[(tonic + i) % 12] + (cfg.minor ? "m" : "")); o.value = i; $("bl-key").appendChild(o); }
    feels.forEach(function (f) { var o = el("option", null, f.label); o.value = f.id; $("bl-feel").appendChild(o); });
    function showTempo() { $("bl-tempo").value = state.tempo; $("bl-tempo-n").value = state.tempo; }
    function setTempo(v) { v = Math.max(40, Math.min(220, Math.round(+v) || state.tempo)); state.tempo = v; showTempo(); if (player) player.setTempo(v); }
    function setBand() { if (!player) return; var b = band(); player.setInstruments(b.instruments); player.setOpts(b.opts); }
    $("bl-key").value = state.key; $("bl-feel").value = state.feel; showTempo();
    $("bl-key").addEventListener("change", function () { state.key = +this.value; charts.forEach(function (c) { c.rekey(); }); tunes.forEach(function (t) { t.draw(); });
      if (player) { player.setTranspose(semis()); if (now && now.tune) player.setChart(withTune(global.TuneChart.parse(abcOf(now.bars, now.minor)), now.tune)); } });
    $("bl-feel").addEventListener("change", function () { state.feel = this.value; var f = feels.filter(function (x) { return x.id === state.feel; })[0]; setBand(); setTempo(f.tempo); });
    $("bl-inst").addEventListener("change", function () { state.inst = this.value; setBand(); });
    $("bl-tempo").addEventListener("input", function () { setTempo(this.value); });
    $("bl-tempo-n").addEventListener("change", function () { setTempo(this.value); });
    $("bl-loop").addEventListener("change", function () { state.loop = this.checked; if (player && now) player.setChoruses(state.loop ? 0 : times); });
    $("bl-stop").addEventListener("click", stop);
  }

  global.ChordLesson = { init: init };
})(typeof window !== "undefined" ? window : globalThis);
