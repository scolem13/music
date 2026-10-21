// builder.js — the Exercise Builder (theory/exercise-builder.qmd): a set of exercises from the chapters chosen, answered on the page
// or printed with an answer key. The set comes from a seed in the address, so a teacher's link gives every student the same set:
//   ?ch=7,16,17&types=rn,cad,period,fill,melodic,drills&n=10&seed=4821&input=inline
// Items: Roman numerals under a generated chorale (chorale.js), the cadence of a phrase, the period type of two phrases (ch. 13),
// a missing voice to write (graded by vl-check.js; the answer through answer-input.js), and questions from the theory drills of the
// chosen chapters (melodic analysis: ch. 10 non-chord tones, ch. 11 motives; the rest under "drills").
(function (global) {
  var D = global.Drills, CH = global.Chorale, AI = global.AnswerInput;
  var CHAPTERS = [[5, "Intervals"], [6, "Triads"], [7, "Roman numerals and cadences"], [8, "Seventh chords"], [9, "Harmonic progression"], [10, "Non-chord tones"],
    [11, "Melodic analysis"], [13, "Phrases in combination"], [16, "Figured bass (inversions, 6/4 chords)"], [17, "Secondary dominants"], [18, "Secondary diminished chords"],
    [19, "Mode mixture"], [20, "The Neapolitan"], [21, "Augmented sixth chords"], [31, "Jazz theory"]];
  var TYPES = { rn: "Roman numerals (chorale)", cad: "Cadences (chorale)", period: "Periods (two phrases, ch. 13)", fill: "Write a missing voice (notation)",
    melodic: "Melodic analysis (ch. 10–11)", drills: "Drill questions from the chapters" };
  var DRILLS = { 5: ["interval"], 6: ["triad", "spell"], 7: ["rn", "rnwrite", "cadence"], 8: ["seventh", "spell7", "rn7", "rn7write"], 9: ["func", "prog"], 16: ["fbrn", "fbwrite", "fbreal"],
    17: ["secdom", "secwrite", "secsym"], 18: ["secdim", "secdimwrite", "secdimsym"], 19: ["mix", "mixwrite", "mixsym"], 20: ["neap", "neapwrite", "neapsym"],
    21: ["aug6", "aug6write", "aug6sym"], 31: ["jzwrite", "jzname", "jzscale", "jzchordscale", "jzguide", "jz251"] };
  var MELODIC = { 10: ["nct", "nctrule"], 11: ["motive"] };
  var CADS = { PAC: "Perfect authentic (PAC)", IAC: "Imperfect authentic (IAC)", HC: "Half (HC)", DC: "Deceptive (DC)", PC: "Plagal (PC)" };
  var PERIODS = { parallel: "Parallel period", contrasting: "Contrasting period", none: "Not a period (the first cadence is as strong as the second)" };
  var VOICE = ["soprano", "alto", "tenor", "bass"];

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function seeded(seed, fn) { var R = Math.random; Math.random = rng(seed); try { return fn(); } finally { Math.random = R; } }
  function draw(host, abc, opts) { host.innerHTML = ""; return global.ABCJS.renderAbc(host, abc, Object.assign({ responsive: "resize", add_classes: true, staffwidth: 640 }, opts || {}))[0]; }
  function playBtn(getVis) {
    var b = el("button", "btn btn-sm btn-outline-secondary ex-play", "▶ Play"); b.type = "button";
    b.addEventListener("click", function () { var v = getVis(); if (v && global.AbcPlay) global.AbcPlay.play(v, { sound: "piano", qpm: 72 }); });
    return b;
  }

  // ---- settings from the address
  function readSettings() {
    var q = new URLSearchParams(location.search), list = function (k, d) { var v = q.get(k); return v ? v.split(",").filter(Boolean) : d; };
    return { ch: list("ch", ["7", "16", "17"]).map(Number), types: list("types", ["rn", "cad", "period", "fill", "melodic", "drills"]),
      n: Math.max(1, Math.min(40, +q.get("n") || 8)), seed: +q.get("seed") || (1 + Math.floor(Math.random() * 99999)), input: q.get("input") || "inline" };
  }
  function writeSettings(s) {
    var q = new URLSearchParams({ ch: s.ch.join(","), types: s.types.join(","), n: s.n, seed: s.seed, input: s.input });
    history.replaceState(null, "", location.pathname + "?" + q.toString());
  }
  // which item kinds the chapters allow
  function kinds(s) {
    var k = [], top = Math.max.apply(null, s.ch.concat([0])), chorale = top >= 7 && s.ch.some(function (c) { return c >= 7 && c <= 26; });
    if (s.types.indexOf("rn") >= 0 && chorale) k.push("rn");
    if (s.types.indexOf("cad") >= 0 && chorale) k.push("cad");
    if (s.types.indexOf("period") >= 0 && s.ch.indexOf(13) >= 0) k.push("period");
    if (s.types.indexOf("fill") >= 0 && chorale) k.push("fill");
    var mel = [], dr = [];
    s.ch.forEach(function (c) { (MELODIC[c] || []).forEach(function (e) { if (D.engines[e]) mel.push(e); }); (DRILLS[c] || []).forEach(function (e) { if (D.engines[e]) dr.push(e); }); });
    if (s.types.indexOf("melodic") >= 0) mel.forEach(function (e) { k.push("drill:" + e); });
    if (s.types.indexOf("drills") >= 0) dr.forEach(function (e) { k.push("drill:" + e); });
    return k;
  }

  // ---- items. Each: { title, render(host, mode), key(host), grade() -> { got, of, notes } }
  function chorale(s, o) { return CH.make(Object.assign({ chapters: s.ch.filter(function (c) { return c >= 7 && c <= 26; }), mode: "both" }, o)); }
  var MAKE = {
    rn: function (s) {
      var c = chorale(s, { phrases: 1 }); if (!c) return null; var boxes = [];
      return { title: "Write the Roman numeral of each chord (key: " + c.key.label + "). Use the book's figures: 6, 64, 7, 65, 43, 42.",
        render: function (h) {
          var sc = el("div", "ex-score"); h.appendChild(sc); var vis = draw(sc, c.abc({ numbers: true })); h.appendChild(playBtn(function () { return vis; }));
          var row = el("div", "ex-blanks"); c.chords.forEach(function (ch, i) { var w = el("label", "ex-blank"), b = el("input", "form-control"); w.appendChild(el("span", null, (i + 1) + ".")); w.appendChild(b); row.appendChild(w); boxes.push(b); });
          h.appendChild(row);
        },
        key: function (h) { draw(h, c.abc({ labels: true })); },
        answer: c.chords.map(function (x) { return x.rn; }).join("  "),
        grade: function () {
          var got = 0, notes = [];
          c.chords.forEach(function (ch, i) { var ok = CH.rnMatches(boxes[i].value, ch, c.chords[i + 1]); boxes[i].classList.toggle("is-valid", ok); boxes[i].classList.toggle("is-invalid", !ok); if (ok) got++; else notes.push((i + 1) + ": " + ch.rn); });
          return { got: got, of: c.chords.length, notes: notes.length ? "Answers: " + notes.join(", ") : "" };
        } };
    },
    cad: function (s) {
      var c = chorale(s, { phrases: 1 }); if (!c) return null; var sel;
      return { title: "Which cadence ends this phrase? (key: " + c.key.label + ")",
        render: function (h) { var sc = el("div", "ex-score"); h.appendChild(sc); var vis = draw(sc, c.abc({})); h.appendChild(playBtn(function () { return vis; })); sel = choices(h, CADS); },
        key: function (h) { draw(h, c.abc({ labels: true })); },
        answer: CADS[c.phrases[0].cadence],
        grade: function () { var ok = sel.value() === c.phrases[0].cadence; sel.mark(c.phrases[0].cadence); return { got: ok ? 1 : 0, of: 1, notes: ok ? "" : "It's " + CADS[c.phrases[0].cadence] + "." }; } };
    },
    period: function (s) {
      var c = chorale(s, { phrases: 2 }); if (!c) return null; var c1, c2, p;
      return { title: "Two phrases (key: " + c.key.label + "). Name each cadence, then the form.",
        render: function (h) {
          var sc = el("div", "ex-score"); h.appendChild(sc); var vis = draw(sc, c.abc({})); h.appendChild(playBtn(function () { return vis; }));
          h.appendChild(el("div", "ex-q", "First phrase's cadence:")); c1 = choices(h, CADS); h.appendChild(el("div", "ex-q", "Second phrase's cadence:")); c2 = choices(h, CADS);
          h.appendChild(el("div", "ex-q", "The two phrases make:")); p = choices(h, PERIODS);
        },
        key: function (h) { draw(h, c.abc({ labels: true })); },
        answer: CADS[c.phrases[0].cadence] + "; " + CADS[c.phrases[1].cadence] + "; " + PERIODS[c.period],
        grade: function () {
          var r = [c1.value() === c.phrases[0].cadence, c2.value() === c.phrases[1].cadence, p.value() === c.period];
          c1.mark(c.phrases[0].cadence); c2.mark(c.phrases[1].cadence); p.mark(c.period);
          return { got: r.filter(Boolean).length, of: 3, notes: r[2] ? "" : "A period: the first cadence is weaker (HC or IAC) than the second (PAC). Parallel when both phrases begin alike." };
        } };
    },
    fill: function (s) {
      var c = chorale(s, { phrases: 1 }); if (!c) return null;
      var bars = c.phrases[0].bars, from = bars[0], to = bars[0] + bars[1] + bars[2] - 1, voice = Math.random() < 0.7 ? 1 + Math.floor(Math.random() * 2) : Math.random() < 0.5 ? 0 : 3;
      var n = to - from + 1, input, sc, vis;
      function redraw(fill) { vis = draw(sc, c.abc({ blank: { voice: voice, from: from, to: to }, fill: fill, labels: true })); }
      function result() {
        var f = input.value();
        var chords = c.chords.map(function (ch, i) { var v = ch.v.slice(); if (i >= from && i <= to) v[voice] = f[i - from]; return { v: v, pcs: ch.pcs, lt: ch.lt, seventh: ch.seventh }; });
        return { f: f, issues: global.VLCheck.check(chords).filter(function (e) { return e.i >= from - 1 && e.i <= to; }) };
      }
      return { title: "Write the " + VOICE[voice] + " for bars 2–3 (" + n + " notes), key: " + c.key.label + ". Follow the Roman numerals and good voice leading.",
        render: function (h) {
          sc = el("div", "ex-score"); h.appendChild(sc); redraw(null); h.appendChild(playBtn(function () { return vis; }));
          var host = el("div", "ex-input"); h.appendChild(host);
          input = AI.create(s.input, host, { count: n, voice: voice, hint: "The " + VOICE[voice] + "'s " + n + " notes, with octaves (middle C = C4): ", onChange: function (f) { redraw(f); } });
        },
        key: function (h) { draw(h, c.abc({ labels: true })); h.appendChild(el("div", "ex-note", "One good " + VOICE[voice] + ": " + c.chords.slice(from, to + 1).map(function (ch) { var x = CH.spell(ch, ch.v[voice]); return "CDEFGAB"[x.l] + ["bb", "b", "", "#", "##"][x.a + 2] + x.o; }).join(" ") + ". Others can be right too.")); },
        answer: "",
        grade: function () {
          var r = result(), missing = r.f.filter(function (m) { return m == null; }).length, errs = r.issues.filter(function (e) { return e.level === "error"; }), warns = r.issues.filter(function (e) { return e.level === "warn"; });
          var ok = !missing && !errs.length;
          var notes = missing ? "Write all " + n + " notes." : errs.concat(warns).map(function (e) { return "Chord " + (e.i + 1) + ": " + e.msg; }).join(" ");
          return { got: ok ? 1 : 0, of: 1, notes: ok ? (warns.length ? "Right, but: " + notes : "") : notes };
        } };
    }
  };
  function choices(h, names) {
    var wrap = el("div", "ex-choices"), cur = null, btns = {};
    Object.keys(names).forEach(function (k) {
      var b = el("button", "btn btn-sm btn-outline-secondary", names[k]); b.type = "button"; btns[k] = b;
      b.addEventListener("click", function () { cur = k; Object.keys(btns).forEach(function (x) { btns[x].classList.toggle("active", x === k); }); });
      wrap.appendChild(b);
    });
    h.appendChild(wrap);
    return { value: function () { return cur; }, mark: function (right) { Object.keys(btns).forEach(function (x) { btns[x].classList.toggle("btn-success", x === right); btns[x].classList.toggle("btn-danger", x === cur && x !== right); }); } };
  }
  function drillItem(ex) {
    var E = D.engines[ex], s = D.parseSettings(ex, ""), q = null;
    for (var t = 0; t < 10 && !q; t++) { q = E.make(s); if (q && q.ear) q = null; }
    if (!q) return null; var input, sel;
    return { title: q.label || E.title,
      render: function (h) {
        if (q.abc) { var sc = el("div", "ex-score ex-small"); h.appendChild(sc); draw(sc, q.abc, { staffwidth: q.width || 260, responsive: undefined }); }
        if (q.show) h.appendChild(el("div", "ex-show", q.show));
        if (E.answers) { var names = {}; E.answers(s).forEach(function (a) { names[a] = E.buttonText ? E.buttonText(a) : E.answerName ? E.answerName(a) : a; }); sel = choices(h, names); }
        else { input = el("input", "form-control ex-text"); input.placeholder = "Your answer"; h.appendChild(input); if (E.keyHelp) h.appendChild(el("div", "ex-help", E.keyHelp(q))); }
      },
      key: function () {},
      answer: E.answerName ? E.answerName(q.answer) : String(q.answer),
      grade: function () {
        var a = sel ? sel.value() : input.value, ok = a != null && a !== "" && (E.check ? E.check(q, a) : a === q.answer);
        if (sel) sel.mark(q.answer); else { input.classList.toggle("is-valid", ok); input.classList.toggle("is-invalid", !ok); }
        return { got: ok ? 1 : 0, of: 1, notes: ok ? "" : "Answer: " + (E.answerName ? E.answerName(q.answer) : q.answer) + "." };
      } };
  }

  // ---- the page
  function init() {
    var root = document.getElementById("ex-builder"); if (!root || !D || !CH) return;
    var s = readSettings(); writeSettings(s);
    var form = el("div", "ex-settings d-print-none");
    var chBox = el("fieldset", "ex-chapters"); chBox.appendChild(el("legend", null, "Chapters"));
    CHAPTERS.forEach(function (c) { var l = el("label"), b = el("input"); b.type = "checkbox"; b.value = c[0]; b.checked = s.ch.indexOf(c[0]) >= 0; l.appendChild(b); l.appendChild(document.createTextNode(" " + c[0] + ". " + c[1])); chBox.appendChild(l); });
    var tyBox = el("fieldset", "ex-types"); tyBox.appendChild(el("legend", null, "Kinds of question"));
    Object.keys(TYPES).forEach(function (k) { var l = el("label"), b = el("input"); b.type = "checkbox"; b.value = k; b.checked = s.types.indexOf(k) >= 0; l.appendChild(b); l.appendChild(document.createTextNode(" " + TYPES[k])); tyBox.appendChild(l); });
    var row = el("div", "ex-row");
    var nL = el("label", null, "Questions "), nI = el("input", "form-control"); nI.type = "number"; nI.min = 1; nI.max = 40; nI.value = s.n; nL.appendChild(nI);
    var iL = el("label", null, "Notation answers: "), iS = el("select", "form-select");
    AI.kinds().forEach(function (k) { var o = el("option", null, AI.label(k)); o.value = k; o.selected = k === s.input; iS.appendChild(o); });
    iL.appendChild(iS);
    var make = el("button", "btn btn-primary", "New set"), same = el("button", "btn btn-outline-secondary", "Rebuild this set");
    var print = el("button", "btn btn-outline-secondary", "Print worksheet"), keyL = el("label"), keyB = el("input"); keyB.type = "checkbox"; keyL.appendChild(keyB); keyL.appendChild(document.createTextNode(" with the answer key"));
    [make, same, print].forEach(function (b) { b.type = "button"; });
    [nL, iL, make, same, print, keyL].forEach(function (x) { row.appendChild(x); });
    form.appendChild(chBox); form.appendChild(tyBox); form.appendChild(row);
    var link = el("div", "ex-link d-print-none"), list = el("ol", "ex-list"), check = el("button", "btn btn-success d-print-none ex-check", "Check my answers"), score = el("div", "ex-score-line"), keyBox = el("section", "ex-key");
    check.type = "button";
    root.appendChild(form); root.appendChild(link); root.appendChild(list); root.appendChild(check); root.appendChild(score); root.appendChild(keyBox);
    var items = [];
    function collect() {
      s.ch = [].map.call(chBox.querySelectorAll("input:checked"), function (b) { return +b.value; });
      s.types = [].map.call(tyBox.querySelectorAll("input:checked"), function (b) { return b.value; });
      s.n = Math.max(1, Math.min(40, +nI.value || 8)); s.input = iS.value;
    }
    function build() {
      writeSettings(s); list.innerHTML = ""; keyBox.innerHTML = ""; score.textContent = ""; items = [];
      link.innerHTML = ""; var a = el("a", null, "Link to this set"); a.href = location.href; link.appendChild(a); link.appendChild(document.createTextNode(" — the same questions for everyone who opens it."));
      var ks = kinds(s);
      if (!ks.length) { list.appendChild(el("p", null, "No questions fit these chapters and kinds. Chorale questions need chapter 7 or later; periods need chapter 13.")); return; }
      var order = seeded(s.seed, function () { var o = []; for (var i = 0; i < s.n; i++) o.push(ks[(i + Math.floor(Math.random() * ks.length)) % ks.length]); return o; });
      keyBox.appendChild(el("h2", null, "Answer key"));
      var keyList = el("ol"); keyBox.appendChild(keyList);
      order.forEach(function (k, i) {
        var it = seeded(s.seed * 1000 + i, function () { return k.indexOf("drill:") === 0 ? drillItem(k.slice(6)) : MAKE[k](s); });
        var li = el("li", "ex-item"), kli = el("li");
        if (!it) { li.textContent = "(This question couldn't be made; try a new set.)"; list.appendChild(li); keyList.appendChild(kli); return; }
        li.appendChild(el("div", "ex-title", it.title)); var body = el("div", "ex-body"); li.appendChild(body); it.render(body, "student");
        var fb = el("div", "ex-fb"); li.appendChild(fb); it.fb = fb; list.appendChild(li); items.push(it);
        if (it.answer) kli.appendChild(el("div", null, it.answer)); var kh = el("div", "ex-score"); kli.appendChild(kh); it.key(kh); keyList.appendChild(kli);
      });
    }
    make.addEventListener("click", function () { collect(); s.seed = 1 + Math.floor(Math.random() * 99999); build(); });
    same.addEventListener("click", function () { collect(); build(); });
    print.addEventListener("click", function () { document.body.classList.toggle("ex-with-key", keyB.checked); global.print(); });
    check.addEventListener("click", function () {
      var got = 0, of = 0;
      items.forEach(function (it) { var r = it.grade(); got += r.got; of += r.of; it.fb.textContent = (r.got === r.of ? "✓ " : "✗ ") + r.got + "/" + r.of + (r.notes ? ". " + r.notes : ""); it.fb.className = "ex-fb " + (r.got === r.of ? "ok" : "no"); });
      score.textContent = "Score: " + got + " / " + of;
    });
    build();
    root._ex = { items: function () { return items; }, settings: function () { return s; }, kinds: function () { return kinds(s); } };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else setTimeout(init, 0);
  global.ExerciseBuilder = { kinds: kinds, CHAPTERS: CHAPTERS };
})(window);
