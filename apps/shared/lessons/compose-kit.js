// compose-kit.js — the widgets of the Composing and Process lessons (lessons/compose-*.qmd, lessons/process-*.qmd), loaded by
// lessons/_compose-kit.qmd after abcjs. Each finds its own elements; none needs the others.
//
//   <div class="cp-motif"></div>       Motif lab: a motif (presets or typed, white notes, C major) and buttons that add a
//                                      changed copy of the last group (repeat, sequence, inversion, retrograde, augmentation,
//                                      diminution, fragment, land on C) to a phrase in 4/4, drawn and played, its ABC to copy.
//   <div class="cp-transpose"></div>   Transposer: concert-pitch ABC, an instrument, the part as the player reads it
//                                      (abcjs visualTranspose), and a range check on the sounding notes (setUpAudio).
//   <div class="cp-journal"></div>     A process-journal entry form -> text to copy; entries kept in this browser
//                                      (localStorage cp-journal-v1), downloadable as Markdown.
//   <div class="cp-intent"></div>      Artistic intention builder (MYP Criterion B ii): intention + choices with reasons and
//                                      evidence -> a paragraph, and which command term the choices reach (state ... justify).
//   <div class="cp-sort"></div>        Match four sentences to state / describe / explain / justify.
//
// Sound: AbcPlay (apps/shared/abc-play.js, loaded on first use), the band's piano. CpKit.motifOps is exposed for tests.
(function (global) {
  "use strict";
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function btn(text, fn) { var b = el("button", "btn btn-outline-secondary btn-sm", text); b.type = "button"; b.addEventListener("click", fn); return b; }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function copy(text, msg) {
    var done = function () { if (msg) { msg.textContent = "Copied."; setTimeout(function () { msg.textContent = ""; }, 1500); } };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {}); else done();
  }

  // ---- sound
  var playJs = null, playing = null;
  function abcPlay() {
    if (global.AbcPlay) return Promise.resolve(global.AbcPlay);
    return playJs || (playJs = new Promise(function (res, rej) {
      var sc = document.createElement("script"); sc.src = "/apps/shared/abc-play.js?v=13"; sc.onload = function () { res(global.AbcPlay); };
      sc.onerror = function () { playJs = null; rej(); }; document.head.appendChild(sc);
    }));
  }
  function stop() { if (playing) { var p = playing; playing = null; try { p.h.stop(); } catch (e) {} p.b.textContent = p.label; } }
  function play(vo, b, label, opts) {
    var was = playing && playing.b === b; stop(); if (was || !vo) return;
    var me = { b: b, label: label, h: { stop: function () {} } }; playing = me; b.textContent = "■ Stop";
    abcPlay().then(function (AP) {
      if (playing !== me) return;
      me.h = AP.play(vo, Object.assign({ sound: "piano", onEnd: function () { if (playing === me) stop(); } }, opts || {}));
    }).catch(function () { if (playing === me) stop(); });
  }
  function draw(target, abc, extra) {
    if (!global.ABCJS) { target.textContent = abc; return null; }
    return global.ABCJS.renderAbc(target, abc, Object.assign({ responsive: "resize", add_classes: true, paddingtop: 0, paddingbottom: 0 }, extra || {}))[0];
  }

  // ---- Motif lab: notes are { p: diatonic step, C4 = 0, D4 = 1 ...; d: sixteenths }
  var LETTERS = "CDEFGAB", OK_LEN = [16, 12, 8, 6, 4, 3, 2, 1];
  function pName(p) {
    var i = ((p % 7) + 7) % 7, o = Math.floor(p / 7), s = LETTERS[i];
    if (o >= 1) { s = s.toLowerCase(); for (var k = 1; k < o; k++) s += "'"; } else for (var j = 0; j > o; j--) s += ",";
    return s;
  }
  function parseMotif(text) {
    var out = [], re = /([A-Ga-g])([,']*)(\d*)(\/2)?/g, m, rest = text.replace(/\s+/g, "");
    if (!rest || /[^A-Ga-g,'\d\/]/.test(rest)) return null;
    while ((m = re.exec(text))) {
      var p = LETTERS.indexOf(m[1].toUpperCase()) + (m[1] === m[1].toLowerCase() ? 7 : 0);
      for (var c = 0; c < m[2].length; c++) p += m[2][c] === "'" ? 7 : -7;
      var d = m[4] ? 1 : (m[3] ? +m[3] : 1) * 2;
      if (!d || d > 16) return null;
      out.push({ p: p, d: d });
    }
    return out.length ? out : null;
  }
  function clone(g) { return g.map(function (n) { return { p: n.p, d: n.d }; }); }
  var OPS = {
    motif: { label: "Motif", tip: "the motif as it is", f: function (g, m) { return clone(m); } },
    repeat: { label: "Repeat", tip: "the same again", f: function (g) { return clone(g); } },
    seqUp: { label: "Sequence up", tip: "the same shape a step higher", f: function (g) { return g.map(function (n) { return { p: n.p + 1, d: n.d }; }); } },
    seqDown: { label: "Sequence down", tip: "the same shape a step lower", f: function (g) { return g.map(function (n) { return { p: n.p - 1, d: n.d }; }); } },
    invert: { label: "Inversion", tip: "upside down: each step up becomes a step down", f: function (g) { var a = g[0].p; return g.map(function (n) { return { p: 2 * a - n.p, d: n.d }; }); } },
    retro: { label: "Retrograde", tip: "backwards", f: function (g) { return clone(g).reverse(); } },
    augment: { label: "Augmentation", tip: "every note twice as long", f: function (g) { return g.map(function (n) { return { p: n.p, d: n.d * 2 }; }); } },
    diminish: { label: "Diminution", tip: "every note half as long", f: function (g) { if (g.some(function (n) { return n.d % 2; })) return null; return g.map(function (n) { return { p: n.p, d: n.d / 2 }; }); } },
    fragment: { label: "Fragment", tip: "only the first half", f: function (g) { return clone(g.slice(0, Math.max(1, Math.ceil(g.length / 2)))); } },
    home: { label: "Land on C", tip: "the nearest C, held to the end of the bar", f: function (g, m, used) {
      var last = g[g.length - 1].p, c = Math.round(last / 7) * 7, left = 16 - (used % 16);
      return [{ p: c, d: left === 16 && used ? 16 : left }]; } }
  };
  function splitLen(d) { var out = []; while (d > 0) { for (var i = 0; i < OK_LEN.length; i++) if (OK_LEN[i] <= d) { out.push(OK_LEN[i]); d -= OK_LEN[i]; break; } } return out; }
  // notes -> ABC body in 4/4, L:1/16, notes split at barlines (tied), the last bar filled with rests
  function toAbcBody(notes) {
    var s = "", t = 0;
    notes.forEach(function (n) {
      var d = n.d;
      while (d > 0) {
        var room = 16 - (t % 16), take = Math.min(d, room), parts = splitLen(take);
        parts.forEach(function (len, i) { s += pName(n.p) + (len === 1 ? "" : len) + ((i < parts.length - 1 || d > take) ? "-" : "") + " "; });
        d -= take; t += take;
        if (t % 16 === 0) s += "| ";
      }
    });
    if (t % 16) { splitLen(16 - (t % 16)).forEach(function (len) { s += "z" + (len === 1 ? "" : len) + " "; }); s += "| "; t += 16 - (t % 16); }
    return s.replace(/\| $/, "|]").trim() || "z16 |]";
  }
  function tuneAbc(body, title) { return "X:1\n" + (title ? "T:" + title + "\n" : "") + "M:4/4\nL:1/16\nQ:1/4=96\nK:C\n" + body + "\n"; }
  var PRESETS = [["C2 E2 G4", "Three-note rise"], ["G G G E5", "Short-short-short-long"], ["E2 D2 C2 A2", "Step down, leap up"], ["C E G E D2 C2", "Turn around G"]];

  function motifLab(root) {
    var motif = parseMotif(PRESETS[0][0]), groups = [], vMotif = null, vPhrase = null;
    root.innerHTML = "";
    var pick = el("div", "cp-tools"); pick.appendChild(el("strong", "", "Motif: "));
    var input = el("input"); input.type = "text"; input.value = PRESETS[0][0]; input.size = 22; input.setAttribute("aria-label", "Motif in ABC letters");
    var sel = el("select"); sel.setAttribute("aria-label", "Motif presets");
    PRESETS.forEach(function (p) { var o = el("option", "", p[1]); o.value = p[0]; sel.appendChild(o); });
    var mPaper = el("div", "cp-paper"), mPlay = btn("▶ Motif", function () { play(vMotif, mPlay, "▶ Motif"); });
    pick.appendChild(sel); pick.appendChild(input); pick.appendChild(mPlay);
    var help = el("div", "cp-note", "Letters are white notes in C major; a number after one is its length in eighths (C2 = a quarter, C4 = a half, C/2 = a sixteenth); c is an octave above C. Up to two bars.");
    var ops = el("div", "cp-tools"), msg = el("div", "cp-note");
    Object.keys(OPS).forEach(function (k) {
      var b = btn(OPS[k].label, function () { add(k); }); b.title = OPS[k].tip; b.setAttribute("data-op", k); ops.appendChild(b);
    });
    var pPaper = el("div", "cp-paper"), tools = el("div", "cp-tools"), out = el("pre", "cp-out"), cmsg = el("span", "cp-note");
    var pPlay = btn("▶ Phrase", function () { play(vPhrase, pPlay, "▶ Phrase"); });
    tools.appendChild(pPlay);
    tools.appendChild(btn("Undo", function () { groups.pop(); redraw(); }));
    tools.appendChild(btn("Clear", function () { groups = []; redraw(); }));
    tools.appendChild(btn("Copy ABC", function () { copy(out.textContent, cmsg); }));
    tools.appendChild(cmsg);
    [pick, help, mPaper, el("p", "cp-note", "Each button adds a changed copy of the last group to the phrase (the motif itself when the phrase is empty):"), ops, msg, pPaper, tools, out].forEach(function (x) { root.appendChild(x); });

    function setMotif(text) {
      var m = parseMotif(text), len = m ? m.reduce(function (s, n) { return s + n.d; }, 0) : 0;
      if (!m || len > 32) { msg.innerHTML = '<span class="cp-bad">Not a motif I can read (white-note letters, lengths in eighths, up to two bars).</span>'; return; }
      motif = m; msg.textContent = ""; groups = []; redraw();
    }
    sel.addEventListener("change", function () { input.value = sel.value; setMotif(sel.value); });
    input.addEventListener("change", function () { setMotif(input.value); });
    function used() { return groups.reduce(function (s, g) { return s + g.reduce(function (a, n) { return a + n.d; }, 0); }, 0); }
    function add(k) {
      var last = groups.length ? groups[groups.length - 1] : motif, g = OPS[k].f(last, motif, used());
      if (!g) { msg.textContent = "Diminution needs every note to be an eighth or longer."; return; }
      if (used() + g.reduce(function (s, n) { return s + n.d; }, 0) > 16 * 16) { msg.textContent = "That's sixteen bars: enough for one phrase."; return; }
      msg.textContent = OPS[k].label + ": " + OPS[k].tip + ".";
      g.op = k; groups.push(g); redraw();
    }
    function redraw() {
      vMotif = draw(mPaper, tuneAbc(toAbcBody(motif)));
      var all = []; groups.forEach(function (g) { all = all.concat(g); });
      var abc = tuneAbc(toAbcBody(all), "My phrase");
      out.textContent = abc; vPhrase = all.length ? draw(pPaper, abc) : (pPaper.innerHTML = '<div class="cp-note" style="padding:.5rem">The phrase is empty. Start with Motif.</div>', null);
      root.setAttribute("data-ops", groups.map(function (g) { return g.op; }).join(","));
    }
    redraw();
  }

  // ---- Transposer. Sounding ranges from HyperPhysics (orchestra) and Wikipedia (saxophones, guitar lowest string);
  // shift = semitones the part is written above the sound.
  var INSTR = [
    ["violin", "Violin", 0, 55, 100, "treble"], ["viola", "Viola", 0, 48, 84, "alto"], ["cello", "Cello", 0, 36, 76, "bass"],
    ["dbass", "Double bass", 12, 28, 59, "bass"], ["flute", "Flute", 0, 60, 96, "treble"], ["oboe", "Oboe", 0, 58, 89, "treble"],
    ["ehorn", "English horn (in F)", 7, 51, 82, "treble"], ["clar", "Clarinet in B♭", 2, 50, 94, "treble"],
    ["bassoon", "Bassoon", 0, 34, 82, "bass"], ["horn", "Horn in F", 7, 35, 77, "treble"], ["tpt", "Trumpet in B♭", 2, 52, 82, "treble"],
    ["tbn", "Trombone (tenor)", 0, 40, 70, "bass"], ["asax", "Alto sax (in E♭)", 9, 49, 80, "treble"], ["tsax", "Tenor sax (in B♭)", 14, 44, 76, "treble"],
    ["guitar", "Guitar", 12, 40, null, "treble"], ["piano", "Piano (concert pitch)", 0, 21, 108, "treble"]
  ];
  var NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
  function midiName(m) { return NAMES[m % 12] + (Math.floor(m / 12) - 1); }
  function soundingMidi(vo) {
    var out = [];
    try { var a = vo.setUpAudio(); (a.tracks || []).forEach(function (t) { t.forEach(function (e) { if (e.cmd === "note") out.push(e.pitch); }); }); } catch (e) {}
    return out;
  }
  function withClef(abc, clef) { return abc.replace(/^K:\s*([^\n%]*?)\s*(clef=\S+)?\s*$/m, function (m, k) { return "K:" + (k || "C") + " clef=" + clef; }); }
  function transposer(root) {
    var def = root.getAttribute("data-abc") || "X:1\nT:Concert pitch\nM:4/4\nL:1/8\nK:F\nc2 A2 F2 G2 | A2 B2 c4 | d2 c2 B2 A2 | G6 z2 |]";
    root.innerHTML = "";
    var row = el("div", "cp-tools"), sel = el("select"); sel.setAttribute("aria-label", "Instrument");
    INSTR.forEach(function (x) { var o = el("option", "", x[1]); o.value = x[0]; sel.appendChild(o); });
    sel.value = root.getAttribute("data-instrument") || "clar";
    row.appendChild(el("strong", "", "Instrument: ")); row.appendChild(sel);
    var ta = el("textarea"); ta.value = def; ta.rows = 6; ta.style.width = "100%"; ta.style.fontFamily = "var(--font-mono)"; ta.setAttribute("aria-label", "Concert pitch ABC");
    var c1 = el("div", "cp-paper"), c2 = el("div", "cp-paper"), info = el("div", "cp-note"), range = el("div", "cp-note");
    var b1 = btn("▶ Hear it", function () { play(vo1, b1, "▶ Hear it"); });
    [row, el("div", "cp-note", "The music as it should sound (concert pitch), in ABC. Edit it:"), ta, el("h4", "", "Concert pitch: what the audience hears"), c1,
      el("div", "cp-tools"), el("h4", "", "The part: what the player reads"), info, c2, range].forEach(function (x) { root.appendChild(x); });
    root.children[4].appendChild(b1);
    var vo1 = null;
    function upd() {
      var I = INSTR.filter(function (x) { return x[0] === sel.value; })[0], abc = ta.value;
      vo1 = draw(c1, abc);
      draw(c2, withClef(abc, I[5]).replace(/^T:.*$/m, "T:" + I[1] + " part"), { visualTranspose: I[2] });
      var iv = { 0: "no transposition: the part is written as it sounds", 2: "written a major 2nd higher than it sounds",
        7: "written a perfect 5th higher than it sounds", 9: "written a major 6th higher than it sounds",
        12: "written an octave higher than it sounds", 14: "written a major 9th (an octave and a major 2nd) higher than it sounds" }[I[2]];
      info.textContent = I[1] + ": " + iv + (I[5] !== "treble" ? "; read in the " + I[5] + " clef." : ".");
      var ms = vo1 ? soundingMidi(vo1) : [];
      if (!ms.length) { range.textContent = ""; return; }
      var lo = Math.min.apply(null, ms), hi = Math.max.apply(null, ms), bad = [];
      if (lo < I[3]) bad.push("the lowest note, " + midiName(lo) + ", is below the instrument's lowest, " + midiName(I[3]));
      if (I[4] != null && hi > I[4]) bad.push("the highest, " + midiName(hi) + ", is above its usual top, about " + midiName(I[4]));
      range.innerHTML = "Sounding range of the music: " + midiName(lo) + " to " + midiName(hi) + ". " +
        (bad.length ? '<span class="cp-bad">Out of range: ' + bad.join("; ") + ".</span>" : '<span class="cp-good">Playable on the ' + I[1].replace(/ \(.*/, "").toLowerCase() + ".</span>") +
        (bad.length ? "" : " Near the edges of the range is harder and changes the tone.");
      root.setAttribute("data-range", bad.length ? "out" : "in");
    }
    sel.addEventListener("change", upd); ta.addEventListener("input", function () { clearTimeout(ta._t); ta._t = setTimeout(upd, 300); });
    upd();
  }

  // ---- Process journal entry
  var JKEY = "cp-journal-v1";
  var JFIELDS = [["date", "Date", "input"], ["goal", "Today I worked on", "input"], ["tried", "What I tried (each version, with what changed)", "textarea"],
    ["heard", "What I heard, or what someone told me", "textarea"], ["decided", "What I decided, and why", "textarea"],
    ["evidence", "Evidence (recording names with timestamps, screenshots, score pages)", "textarea"], ["next", "Next time I will", "input"]];
  function journal(root) {
    root.innerHTML = "";
    var f = {}, draft = store(JKEY + "-draft") || {};
    JFIELDS.forEach(function (x) {
      var lab = el("label", "cp-field"), inp = el(x[2]); lab.appendChild(el("span", "", x[1])); lab.appendChild(inp);
      if (x[0] === "date") { inp.type = "date"; inp.value = draft.date || new Date().toISOString().slice(0, 10); } else inp.value = draft[x[0]] || "";
      inp.addEventListener("input", function () { store(JKEY + "-draft", read()); }); f[x[0]] = inp; root.appendChild(lab);
    });
    var tools = el("div", "cp-tools"), msg = el("span", "cp-note"), out = el("pre", "cp-out"), list = el("div", "cp-note");
    function read() { var o = {}; Object.keys(f).forEach(function (k) { o[k] = f[k].value.trim(); }); return o; }
    function text(o) {
      return "## " + (o.date || "") + (o.goal ? ": " + o.goal : "") + "\n\n" + JFIELDS.slice(2).map(function (x) {
        return o[x[0]] ? "**" + x[1] + ":** " + o[x[0]] : null; }).filter(Boolean).join("\n\n") + "\n";
    }
    function check(o) {
      var miss = [];
      if (!o.tried || o.tried.split(/\n|;|\. /).filter(Boolean).length < 2) miss.push("more than one version tried");
      if (!/because|so that|since|which made|to make/i.test(o.decided || "")) miss.push("a reason for the decision (because ..., so that ...)");
      if (!o.evidence) miss.push("evidence someone else could check");
      if (!o.next) miss.push("a next step");
      return miss;
    }
    function entries() { return store(JKEY) || []; }
    function showList() { var n = entries().length; list.textContent = n ? n + " entr" + (n === 1 ? "y" : "ies") + " kept in this browser." : "No entries kept yet."; }
    tools.appendChild(btn("Preview", function () {
      var o = read(), miss = check(o); out.textContent = text(o);
      msg.innerHTML = miss.length ? '<span class="cp-bad">Still missing: ' + miss.join("; ") + ".</span>" : '<span class="cp-good">This entry shows exploration, a decision with its reason, and evidence.</span>';
    }));
    tools.appendChild(btn("Copy", function () { out.textContent = text(read()); copy(out.textContent, msg); }));
    tools.appendChild(btn("Keep this entry", function () {
      var all = entries(); all.push(read()); store(JKEY, all); store(JKEY + "-draft", { date: f.date.value });
      JFIELDS.forEach(function (x) { if (x[0] !== "date") f[x[0]].value = ""; }); msg.textContent = "Kept."; showList();
    }));
    tools.appendChild(btn("Download all (.md)", function () {
      var md = "# Process journal\n\n" + entries().map(text).join("\n"), a = el("a");
      a.href = URL.createObjectURL(new Blob([md], { type: "text/markdown" })); a.download = "process-journal.md"; a.click();
    }));
    tools.appendChild(msg);
    root.appendChild(tools); root.appendChild(out); root.appendChild(list);
    root.appendChild(el("div", "cp-note", "Entries stay in this browser only. Download them, or paste each one into your own journal."));
    showList();
  }

  // ---- Artistic intention builder
  var IKEY = "cp-intent-v1";
  function intent(root) {
    root.innerHTML = "";
    var saved = store(IKEY) || {}, f = {};
    function field(k, label, kind, ph) {
      var lab = el("label", "cp-field"), inp = el(kind); lab.appendChild(el("span", "", label)); lab.appendChild(inp);
      inp.value = saved[k] || ""; if (ph) inp.placeholder = ph; inp.addEventListener("input", upd); f[k] = inp; return lab;
    }
    root.appendChild(field("soi", "Statement of inquiry (from your teacher)", "input", "e.g. Composers use repetition and contrast to shape how a listener feels over time."));
    root.appendChild(field("what", "I intend to make / perform", "input", "e.g. a 16-bar piano piece in ABA form"));
    root.appendChild(field("who", "For whom, or where", "input", "e.g. for the Year 8 lunchtime concert"));
    root.appendChild(field("effect", "So that the listener", "input", "e.g. feels calm, is unsettled in the middle, and calm again at the end"));
    for (var i = 1; i <= 3; i++) {
      var box = el("div", "cp-try"); box.appendChild(el("h4", "", "Choice " + i));
      box.appendChild(field("c" + i, "I will", "input", i === 1 ? "e.g. use a slow, stepwise melody in the A sections" : ""));
      box.appendChild(field("r" + i, "because", "input", i === 1 ? "e.g. steps and long notes sound settled" : ""));
      box.appendChild(field("e" + i, "which I know from (a piece, a test I recorded, feedback)", "input", i === 1 ? "e.g. Satie's Gymnopédie No. 1; my take 2 vs take 3 on 12 Oct" : ""));
      root.appendChild(box);
    }
    var out = el("div", "cp-out"), lvl = el("div", "cp-note"), tools = el("div", "cp-tools"), msg = el("span", "cp-note");
    tools.appendChild(btn("Copy", function () { copy(out.textContent, msg); })); tools.appendChild(msg);
    root.appendChild(el("h4", "", "Your artistic intention")); root.appendChild(out); root.appendChild(lvl); root.appendChild(tools);
    function v(k) { return f[k].value.trim(); }
    function upd() {
      var o = {}; Object.keys(f).forEach(function (k) { o[k] = f[k].value; }); store(IKEY, o);
      var s = "";
      if (v("what")) s += "I intend to " + (/^(a|an|the)\b/i.test(v("what")) ? "make " : "") + v("what") + (v("who") ? ", " + v("who") : "") + (v("effect") ? ", so that the listener " + v("effect") : "") + ". ";
      if (v("soi")) s += "This connects to our statement of inquiry, \u201c" + v("soi").replace(/\.$/, "") + "\u201d. ";
      var reached = 0, made = 0;
      for (var i = 1; i <= 3; i++) {
        if (!v("c" + i)) continue; made++;
        s += "I will " + v("c" + i).replace(/\.$/, "");
        var r = v("r" + i), e = v("e" + i);
        if (r) s += " because " + r.replace(/\.$/, "");
        if (e) s += " (" + e.replace(/\.$/, "") + ")";
        s += ". ";
        reached = Math.max(reached, e && r ? 4 : r && r.split(/\s+/).length >= 8 ? 3 : r ? 2 : 1);
      }
      out.textContent = s.trim() || "Fill in the boxes above.";
      var words = ["", "states your choices", "describes your choices", "explains your choices (reasons)", "starts to justify your choices (reasons and evidence)"];
      lvl.textContent = made ? "At best, this " + words[reached] + ". The descriptors go state \u2192 describe \u2192 explain \u2192 justify. A word count can't grade your work: your teacher reads what the reasons say." : "";
      root.setAttribute("data-reach", reached);
    }
    upd();
  }

  // ---- Command terms: match the sentence to the verb
  var SORT = [
    ["justify", "I chose a minor key because I want the listener to feel uneasy. In my test recordings, three of four classmates said the minor version sounded \u2018worried\u2019 and the major one \u2018cheerful\u2019, and the film cue I analysed in Unit 2 moves to minor at its tense moment too."],
    ["state", "I will use a minor key."],
    ["explain", "I will use a minor key because I want the listener to feel uneasy, and minor chords sound darker than major ones."],
    ["describe", "I will use A minor, with the melody mostly in the low register and slow, falling steps in the last phrase."]
  ];
  function sorter(root) {
    root.innerHTML = "";
    var order = [3, 0, 2, 1], sels = [];
    order.forEach(function (i, n) {
      var row = el("div", "cp-field"), s = el("select");
      ["Choose...", "state", "describe", "explain", "justify"].forEach(function (t, j) { var o = el("option", "", t); o.value = j ? t : ""; s.appendChild(o); });
      s.setAttribute("aria-label", "Command term for sentence " + (n + 1)); s._want = SORT[i][0];
      row.appendChild(el("span", "", "Sentence " + (n + 1))); row.appendChild(el("div", "", "\u201c" + SORT[i][1] + "\u201d")); row.appendChild(s);
      sels.push(s); root.appendChild(row);
    });
    var res = el("div", "cp-note");
    var b = btn("Check", function () {
      var right = 0; sels.forEach(function (s) { var ok = s.value === s._want; right += ok; s.style.outline = "2px solid " + (ok ? "var(--site-pass)" : "var(--site-fail)"); });
      res.textContent = right + " of 4. " + (right === 4 ? "Each one adds something to the one before: detail, then reasons, then evidence." : "Look for: detail (describe), a reason (explain), evidence for the reason (justify).");
      root.setAttribute("data-right", right);
    });
    var t = el("div", "cp-tools"); t.appendChild(b); t.appendChild(res); root.appendChild(t);
  }

  function init() {
    [].forEach.call(document.querySelectorAll(".cp-motif"), motifLab);
    [].forEach.call(document.querySelectorAll(".cp-transpose"), transposer);
    [].forEach.call(document.querySelectorAll(".cp-journal"), journal);
    [].forEach.call(document.querySelectorAll(".cp-intent"), intent);
    [].forEach.call(document.querySelectorAll(".cp-sort"), sorter);
  }
  global.CpKit = { motifOps: OPS, parseMotif: parseMotif, toAbcBody: toAbcBody, instruments: INSTR };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(window);
