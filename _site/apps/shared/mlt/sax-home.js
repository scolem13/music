// sax-home.js: a beginning saxophonist's home practice (practice/sax-home.qmd), following the class's sequence (JRI
// Instrumental on saxophone, books/jri-sax.js) so practising at home goes the way a lesson does: songs sung first, new notes
// one at a time, patterns by ear (hear it, play it with the machine = teaching mode, then alone = evaluation mode), rhythm,
// articulation, then the song on the instrument. Global SaxHome.
//
// The student picks the lesson the teacher is on ("Unit 3, Section B") and the saxophone. Notes known = every note met in the
// fingering steps up to that section (books/jri-sax.js), in the class's concert keys (JRISax.KEYMAP), written for the chosen
// saxophone (MLTWalk.saxNote). The microphone (PitchDetect) hears concert pitch and turns it back into written notes.
// Progress (lesson, saxophone, steps ticked) is kept in this browser: localStorage "sax-home".
// Pure helpers (Node: tests/mlt/sax-home.test.js):
//   SaxHome.known(sectionId, inst) -> { key (recorder key practised now), notes: [{ syl, rk, written, concert }], all: [...] }
//   SaxHome.patterns(known, seed, n) -> [[note, ...]]  echo patterns from the notes known in the current key, starting on the
//        resting tone, moving by step between known notes (as the book's melodic patterns do)
//   SaxHome.classKey(abc) -> semitones that put a tune in one of Book One's keys (B\u266d, E\u266d major; C minor)
(function (global) {
  "use strict";
  var STORE = "sax-home";
  function J() { return global.JRISax; }
  function sections() { return J().sections; }
  function idx(id) { var i = -1; sections().forEach(function (s, k) { if (s.id === id) i = k; }); return i; }
  function noteFor(rk, syl, inst) { return global.MLTWalk.saxNote(rk, syl, inst); }
  var ORDER = { "LA": -3, "SI": -1, "TI": -1, "DO": 0, "RE": 2, "MI": 4, "FA": 5, "SO": 7 };

  // ---------- what the student knows ----------
  function known(id, inst) {
    var upto = idx(id), byKey = {}, lastKey = null, all = [];
    sections().slice(0, upto + 1).forEach(function (s) {
      var f = s.parts[2].fing; if (!f) return;
      Object.keys(f.notes).forEach(function (rk) {
        if (!J().KEYMAP[rk]) return;
        byKey[rk] = byKey[rk] || [];
        f.notes[rk].forEach(function (syl) { if (byKey[rk].indexOf(syl) < 0) byKey[rk].push(syl); });
        // the key practised now: the last key whose notes are played (the second key's first fingerings are only practised)
        if (!(s.id === "3B" && rk === "B\u266d-DO")) lastKey = rk;
      });
    });
    Object.keys(byKey).forEach(function (rk) { byKey[rk].forEach(function (syl) { var n = noteFor(rk, syl, inst); if (n) all.push(Object.assign({ syl: syl, rk: rk }, n)); }); });
    var notes = all.filter(function (n) { return n.rk === lastKey; }).sort(function (a, b) { return a.written - b.written; });
    return { key: lastKey, notes: notes, all: all };
  }
  function rng(seed) { var s = (seed >>> 0) || 1; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // patterns: start on the resting tone, each next note a neighbour (one known note up or down), 2 or 3 notes (4 when 4+ known)
  function patterns(k, seed, n) {
    var ns = k.notes.filter(function (x) { return !/,$/.test(x.syl); }); if (ns.length < 2) return [];
    var r = rng(seed), out = [], seen = {}, rest = ns.filter(function (x) { return x.name === (x.la ? "LA" : "DO"); })[0] || ns[0];
    for (var tries = 0; out.length < n && tries < 200; tries++) {
      var len = 2 + Math.floor(r() * (ns.length >= 4 ? 3 : 2)), at = ns.indexOf(rest), p = [rest];
      while (p.length < len) { var step = r() < 0.5 ? -1 : 1, j = at + step; if (j < 0 || j >= ns.length) j = at - step; if (j < 0 || j >= ns.length) break; at = j; p.push(ns[at]); }
      var key = p.map(function (x) { return x.syl; }).join(" ");
      if (!seen[key] || tries > 100) { seen[key] = 1; out.push(p); }
    }
    return out;
  }
  // the class's keys: B\u266d and E\u266d major, C and G minor; anything else moves to B\u266d (major) or G minor
  var PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function classKey(abc) {
    var m = /^K:\s*([A-G])([#b]?)\s*([A-Za-z]*)/m.exec(abc || "") || [0, "C", "", ""], pc = (PC[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + 12) % 12;
    var minor = /^m(in)?$|^aeo/i.test(m[3]);
    // Book One's minor key is C minor (the recorder's G-LA); G minor comes with Book Two
    if (minor ? pc === 0 : (pc === 10 || pc === 3)) return 0;
    var d = ((minor ? 0 : 10) - pc + 12) % 12; return d > 6 ? d - 12 : d;
  }

  // ---------------------------------------------------------------- page ----------------------------------------------
  function el(t, c, h) { var e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function load() { try { return JSON.parse(localStorage.getItem(STORE) || "{}"); } catch (e) { return {}; } }
  function store(o) { try { localStorage.setItem(STORE, JSON.stringify(o)); } catch (e) {} }
  var ST = Object.assign({ sec: "1A", inst: "alto", done: {} }, load());
  var C = function () { return global.SaxChart; };

  // sound: the chart's reed tone at concert pitch; a list of notes one after another
  var playing = 0;
  function playNotes(concerts, o) {
    o = o || {}; var me = ++playing, beat = o.beat || 0.62, sep = o.separated;
    return SaxPage.sound().then(function (x) {
      var t = x.ac.currentTime + 0.08;
      concerts.forEach(function (m, i) { var d = (o.durs ? o.durs[i] : 1) * beat; if (me === playing) C().tone(x.ac, x.out, m, t, sep ? d * 0.45 : d * 0.97, o.vel); t += d; });
      return new Promise(function (res) { setTimeout(res, (t - x.ac.currentTime) * 1000 + 150); });
    });
  }
  // the microphone: one for the page; listeners get written notes (from the segmenter) and raw frames
  var mic = null, micOn = false, noteL = [], frameL = [];
  function seg() {
    var cand = null, n = 0, last = null, quiet = 0;
    return function (f) {
      frameL.forEach(function (fn) { fn(f); });
      if (!(f.hz > 0)) { if (++quiet >= 2) last = null; cand = null; n = 0; return; }
      quiet = 0; if (f.midi === cand) n++; else { cand = f.midi; n = 1; }
      if (n === 3 && cand !== last) { last = cand; var w = cand - C().INSTRUMENTS[ST.inst]; noteL.forEach(function (fn) { fn(w); }); }
    };
  }
  function startMic(btn) {
    if (micOn) return Promise.resolve();
    if (!global.PitchDetect) return Promise.reject(new Error("no PitchDetect"));
    var onFrame = seg();
    mic = PitchDetect.mic({ onFrame: onFrame });
    return mic.start().then(function () { micOn = true; document.body.classList.add("sh-mic-on"); if (btn) btn.textContent = "\ud83c\udfa4 Listening"; });
  }
  // wait for notes: resolves with the written notes heard (up to n, or after `ms` without a new note)
  function listen(n, ms) {
    return new Promise(function (res) {
      var got = [], timer = null;
      function done() { noteL = noteL.filter(function (f) { return f !== on; }); clearTimeout(timer); res(got); }
      function on(w) { got.push(w); clearTimeout(timer); if (got.length >= n) setTimeout(done, 200); else timer = setTimeout(done, ms); }
      noteL.push(on); timer = setTimeout(done, ms + 1500);
    });
  }
  function name(w) { return C().name(w, "sharp"); }
  function fingering(w, small) {
    var d = el("div", "sh-fing"), f = C().FINGERINGS[w];
    if (f) C().diagram(d, { small: small !== false, label: name(w) }).set(f[0]); else d.textContent = "(outside the chart)";
    return d;
  }
  function tick(id, label) {
    var l = el("label", "sh-done"), cb = el("input"); cb.type = "checkbox";
    var d = ST.done[ST.sec] || []; cb.checked = d.indexOf(id) >= 0;
    cb.onchange = function () { var a = ST.done[ST.sec] || []; if (cb.checked && a.indexOf(id) < 0) a.push(id); if (!cb.checked) a = a.filter(function (x) { return x !== id; }); ST.done[ST.sec] = a; store(ST); progress(); };
    l.appendChild(cb); l.appendChild(document.createTextNode(" " + (label || "Done"))); return l;
  }
  function card(id, title, how) {
    var c = el("div", "sh-card"); c.id = "sh-" + id;
    c.appendChild(el("h3", null, esc(title))); if (how) c.appendChild(el("p", "sh-how", how));
    c.appendChild(tick(id)); return c;
  }
  function btn(label, fn, cls) { var b = el("button", "btn " + (cls || "btn-outline-secondary"), label); b.type = "button"; b.onclick = fn; return b; }

  // ---------- the steps ----------
  function tuneText(id) { var o = (typeof tunesObject !== "undefined" ? tunesObject : global.tunesObject) || {}, out = null; Object.keys(o).forEach(function (k) { String(o[k]).split(/\n(?=X:)/).forEach(function (t) { if (new RegExp("^%%id\\s+" + id + "\\s*$", "m").test(t)) out = t; }); }); return out; }
  var off = null;
  function vis(abc) { if (!off) { off = el("div"); off.style.cssText = "position:absolute;left:-9999px;width:600px"; document.body.appendChild(off); } return ABCJS.renderAbc(off, abc)[0]; }
  // ---------- more tunes: every lesson gets major and minor, duple and triple ----------
  var POOL_SETS = ["jri-recorder", "Mullen", "elementary"];
  function contextOf(abc) {
    var K = (/^K:\s*(\S+)/m.exec(abc) || [])[1] || "", M = (/^M:\s*(\S+)/m.exec(abc) || [])[1] || "";
    return { minor: /m$|min|aeo/i.test(K), mode: /dor|mix|lyd|phr|loc/i.test(K), triple: /6\/8|3\/4|9\/8|3\/8|12\/8/.test(M), unusual: /5\/8|7\/8/.test(M) };
  }
  function ctxLabel(x) { return (x.minor ? "minor" : "major") + ", " + (x.triple ? "triple" : "duple"); }
  var pool = null;
  function tunePool() {
    if (pool) return pool; pool = [];
    var o = (typeof tunesObject !== "undefined" ? tunesObject : global.tunesObject) || {};
    POOL_SETS.forEach(function (k) { String(o[k] || "").split(/\n(?=X:)/).forEach(function (t) {
      var id = (/^%%id\s+(\S+)/m.exec(t) || [])[1], title = (/^T:\s*(.+)$/m.exec(t) || [])[1]; if (!id || !title) return;
      var x = contextOf(t), bars = (t.replace(/^[A-Za-z]:.*$|^%.*$/mg, "").match(/\|/g) || []).length;
      if (/acculturation|pattern|sequence|exercise/i.test(title) || x.mode || x.unusual || bars > 17 || !/"[A-G]/.test(t.replace(/^[A-Za-z]:.*$/mg, ""))) return;
      if (pool.some(function (p) { return p[1] === id; })) return;
      pool.push([title.trim(), id, x]);
    }); });
    return pool;
  }
  // the lesson's songs (new + reviews) plus one more for each of the four contexts the lesson lacks, the same picks all lesson long
  function lessonSongs() {
    var own = songsUpTo().slice(-3).reverse(), have = {}, out = own.map(function (sg, i) { var a = tuneText(sg[1]); var x = a ? contextOf(a) : {}; have[ctxLabel(x)] = 1; return { sg: sg, ctx: x, tag: i === 0 ? "New" : "Review" }; });
    var r = rng(idx(ST.sec) * 7919 + 13), used = {}; own.forEach(function (sg) { used[sg[1]] = 1; });
    ["major, duple", "major, triple", "minor, duple", "minor, triple"].forEach(function (want) {
      if (have[want]) return;
      var c = tunePool().filter(function (p) { return ctxLabel(p[2]) === want && !used[p[1]]; }); if (!c.length) return;
      var p = c[Math.floor(r() * c.length)]; used[p[1]] = 1; out.push({ sg: [p[0], p[1]], ctx: p[2], tag: "Also" });
    });
    return out;
  }
  // establishing context (Establish, establish.js): tonality, meter or both, picked by the teacher's weights
  var QPM = 100;
  function qpmOf(abc) { var m = /^Q:\s*(?:(\d+)\/(\d+)\s*=\s*)?(\d+)/m.exec(abc || ""); return m ? (m[1] ? +m[3] * (+m[1] / +m[2]) * 4 : +m[3]) : QPM; }
  function estLine(c) { var d = el("div", "sh-est"); c.appendChild(d); return d; }
  function establish(kind, ctx, line) {
    if (!global.Establish) return Promise.resolve();
    return Establish.run(kind, ctx, { onPick: function (m) { if (line) line.innerHTML = "\ud83d\udd0a <i>" + (kind === "meter" ? "Setting the meter" : kind === "tonality" ? "Setting the key" : "Setting the key and the meter") + ":</i> " + esc(m.name) + ". Listen, don't play yet."; } })
      .then(function (m) { if (line && m) line.innerHTML += " <b>Now you.</b>"; return m; });
  }
  function songCtx(abc, sh) {
    var x = contextOf(abc), ev = global.AbcEvents ? AbcEvents.fromAbc(abc).sounding : [], first = ev.length ? ev[0].pitches[0].midi + sh : null;
    var K = /^K:\s*([A-G])([#b]?)/m.exec(abc) || [0, "C", ""], pc = ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 })[K[1]] + (K[2] === "#" ? 1 : K[2] === "b" ? -1 : 0);
    var famous = lessonSongs().filter(function (s) { var a = tuneText(s.sg[1]); return a && a !== abc && ctxLabel(contextOf(a)) === ctxLabel(x); })[0], fa = famous ? tuneText(famous.sg[1]) : null;
    var fsh = 0; if (fa) { var fk = /^K:\s*([A-G])([#b]?)/m.exec(fa) || [0, "C", ""], fpc = ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 })[fk[1]] + (fk[2] === "#" ? 1 : fk[2] === "b" ? -1 : 0); fsh = ((pc + sh - fpc) % 12 + 12) % 12; if (fsh > 6) fsh -= 12; }
    var md = (/^K:\s*[A-G][#b]?\s*(dor|phr|lyd|mix|aeo|loc)/im.exec(abc) || [])[1], MD = { dor: "dorian", phr: "phrygian", lyd: "lydian", mix: "mixolydian", aeo: "aeolian", loc: "locrian" };
    return { tonic: ((pc + sh) % 12 + 12) % 12, minor: x.minor, mode: md ? MD[md.toLowerCase()] : null, chords: global.Establish ? Establish.tuneChords(abc, pc) : [], triple: x.triple, qpm: qpmOf(abc), first: first, song: fa, songTranspose: fsh };
  }
  function bandPlay(abc, sh, o, line) {
    AbcPlay.stop(); if (global.Establish) Establish.stop();
    var mine = ++bandGen;
    return establish("both", songCtx(abc, sh), line).then(function () { if (mine !== bandGen) return; AbcPlay.play(vis(abc), Object.assign({ abc: abc, transpose: sh, style: "folk", light: false, qpm: qpmOf(abc) }, o || {})); });
  }
  var bandGen = 0;
  function stopAll() { bandGen++; AbcPlay.stop(); if (global.Establish) Establish.stop(); if (global.RhythmChant) RhythmChant.stop(); }

  function songsUpTo() { var out = []; sections().slice(0, idx(ST.sec) + 1).forEach(function (s) { if (s.song) out.push(s.song); }); return out; }

  // ---------- the saxophone itself (from lessons/saxophone.qmd, same sources), shown where the step needs it ----------
  function det(title, html, open) { var d = el("details", "sh-tip"); if (open) d.open = true; d.appendChild(el("summary", null, title)); d.appendChild(el("div", null, html)); return d; }
  var TIP = {
    hold: "<ol><li>Sit near the front edge of the chair, feet flat. The sax sits on your <b>right side</b>.</li><li><b>Right thumb</b> under the lower thumb rest; <b>left thumb</b> on the upper rest at about 45\u00b0, so it can roll onto the octave key.</li><li>Neck strap, neck and mouthpiece set so your <b>head stays straight</b>: bring the sax to you.</li><li>Fingers curved, as if holding a tennis ball; <b>wrists straight</b>, elbows away from your body, chin level.</li><li>Left hand on top (B, A, G keys), right hand below (F, E, D keys).</li></ol>",
    emb: "<ol><li>Roll a <b>little</b> of your lower lip over your bottom teeth (say \u201cwhee\u201d, then \u201ctoo\u201d).</li><li><b>Top teeth rest on top of the mouthpiece.</b> Close your lips around it like a drawstring bag.</li><li><b>Chin flat and pointed.</b> Check in a mirror.</li><li>Breathe in low and full through your mouth, then a long, steady note. With the whole sax together the first note is G\u266f on alto, E on tenor and bari.</li></ol><p>Checklist: sitting straight \u00b7 sax on your right \u00b7 thumbs in place \u00b7 wrists straight \u00b7 head up \u00b7 top teeth on the mouthpiece \u00b7 chin flat \u00b7 even pressure all round \u00b7 low, full breath.</p>",
    tone: "<table class=\"sh-tbl\"><tr><th>It sounds</th><th>Probably</th><th>Try</th></tr><tr><td>Choked, pinched</td><td>Biting, or too little mouthpiece</td><td>Relax into an \u201cO\u201d; take in a bit more</td></tr><tr><td>Rough, squawky</td><td>Too much mouthpiece, or lips too loose</td><td>Take in a bit less; firm up to \u201coo\u201d</td></tr><tr><td>Thin, nasal</td><td>Slow air, or reed too soft</td><td>More support, faster air</td></tr><tr><td>Wobbly</td><td>Top lip on the mouthpiece</td><td>Top teeth on the mouthpiece</td></tr><tr><td>Hard to blow</td><td>Reed too hard or set too high; ligature too high</td><td>Line the reed up; move the ligature down; ask your teacher</td></tr></table>",
    tune: "<p>Good tone first: you can't tune a bad one. The sax goes <b>flat when loud</b> and <b>sharp when soft</b>: firm up as you get louder, relax as you get softer. To tune: mouthpiece about halfway onto the cork; play written F\u266f and check it (the \u201cHold it\u201d bar shows cents). Sharp: pull the mouthpiece out a little. Flat: push it on. Middle C\u266f (no keys) tends to be flat; D and A with the octave key tend to be sharp.</p>",
    vib: "<p>Vibrato is a small, even wobble made with the jaw, as if saying \u201cya\u201d. Metronome at 76 on middle-line B: one \u201cya\u201d per click, then two, three, four. It never replaces a solid tone.</p>",
    care: "<ol><li>Bari: press the spit valve and shake out the water.</li><li>Reed off and into a reed holder to dry (never left on the mouthpiece).</li><li>Wipe the mouthpiece inside; ligature and cap back on.</li><li>Neck off, shake it, dry it with the neck cleaner.</li><li>Alto and tenor: drop the swab in the bell, turn the sax over, pull it through.</li><li>Each part back in its place; latch the case.</li></ol>"
  };
  function stepWarm(k) {
    var c = card("warm", "1. Warm up", k.notes.length ? "Sit up tall, breathe in low and slow, then play each note you know as a long tone: start it gently and keep it steady until the bar fills." :
      "No notes on the saxophone yet. Breathe: in for 4 counts, out on a long \u201csss\u201d for 8. Then form your embouchure and blow air only (no sound), as steady as you can.");
    var early = idx(ST.sec) <= idx("3B");
    c.appendChild(det("How to hold it", TIP.hold, early && !k.notes.length)); c.appendChild(det("Embouchure (your mouth on the mouthpiece)", TIP.emb, early && !k.notes.length));
    if (k.notes.length) { c.appendChild(det("When the tone goes wrong", TIP.tone)); c.appendChild(det("Playing in tune, loud and soft", TIP.tune)); }
    if (idx(ST.sec) >= idx("9A")) c.appendChild(det("Vibrato (when your tone is steady)", TIP.vib));
    if (!k.notes.length) { var b = el("div", "sh-breath"), lab = el("div", "sh-big", "Ready"); b.appendChild(lab);
      var t = null; c.appendChild(b); c.appendChild(btn("\u25b6 Breathe with me (4 times)", function () { clearInterval(t); var n = 0;
        t = setInterval(function () { var ph = n % 12; lab.textContent = ph < 4 ? "In\u2026 " + (ph + 1) : "Out (sss)\u2026 " + (ph - 3); n++; if (n >= 48) { clearInterval(t); lab.textContent = "Well done"; } }, 700); }, "btn-primary")); return c; }
    var row = el("div", "sh-row"); c.appendChild(row);
    var meter = el("div", "sh-meter", '<div class="sh-meter-fill"></div><span>Hold the note: the bar fills while you play it</span>');
    k.notes.forEach(function (n) {
      var nc = el("div", "sh-note"); nc.appendChild(el("div", "sh-nl", "<b>" + n.name + "</b> " + name(n.written)));
      nc.appendChild(fingering(n.written));
      nc.appendChild(btn("\u25b6", function () { playNotes([n.concert], { durs: [3] }); }));
      nc.appendChild(btn("Hold it", function () { holdCheck(n, meter); }));
      row.appendChild(nc);
    });
    c.appendChild(meter); return c;
  }
  function holdCheck(n, meter) {
    var fill = meter.querySelector(".sh-meter-fill"), txt = meter.querySelector("span"), held = 0, t0 = Date.now();
    startMic().then(function () {
      txt.textContent = "Play " + n.name + " (" + name(n.written) + ") and hold it\u2026";
      function f(fr) {
        var w = fr.hz > 0 ? fr.midi - C().INSTRUMENTS[ST.inst] : null;
        if (w === n.written) held += 0.04; else if (w != null) txt.textContent = "That's " + name(w) + ": check the fingering.";
        fill.style.width = Math.min(100, held / 3 * 100) + "%";
        if (w === n.written) txt.textContent = (fr.cents > 15 ? "A little sharp" : fr.cents < -15 ? "A little flat" : "In tune") + " (" + (fr.cents > 0 ? "+" : "") + Math.round(fr.cents) + " cents)";
        if (held >= 3 || Date.now() - t0 > 12000) { frameL = frameL.filter(function (x) { return x !== f; }); txt.textContent = held >= 3 ? "\u2714 A good long " + n.name + "!" : "Try again: a steady breath, and check the fingering."; }
      }
      frameL.push(f);
    }, function () { txt.textContent = "Turn on the microphone (at the top) to have your long tones checked."; });
  }
  function stepSongs() {
    var list = lessonSongs(); if (!list.length) return null;
    var c = card("sing", "2. Sing the songs", "Sing each with the band, first on \u201cdoo\u201d, then with the words if you know them. Then sing the bass line. Singing first is how you learn to hear it in your head (audiate) before you play it. Each lesson has songs in major and minor, duple and triple, so you hear the difference.");
    var line = estLine(c);
    list.forEach(function (it) {
      var sg = it.sg, abc = tuneText(sg[1]); if (!abc) return;
      var sh = classKey(abc), r = el("div", "sh-song"); r.appendChild(el("b", null, it.tag + ": " + esc(sg[0]) + ' <span class="sh-dim">(' + ctxLabel(it.ctx) + ")</span>"));
      r.appendChild(btn("\u25b6 Sing with the band", function () { bandPlay(abc, sh, {}, line); }));
      r.appendChild(btn("\u25b6 Band only", function () { bandPlay(abc, sh, { melody: false }, line); }));
      if (global.DMTISkills) r.appendChild(btn("\u25b6 Bass line", function () { try { var t = DMTISkills.parse(abc), b = DMTISkills.make("bass", t, { rhythm: [], tonal: [] }, 1).parts[0].abc; bandPlay(b, sh, {}, line); } catch (e) {} }));
      r.appendChild(btn("\u25a0", stopAll));
      c.appendChild(r);
    });
    return c;
  }
  function stepNewNotes() {
    var s = sections()[idx(ST.sec)], f = s.parts[2].fing; if (!f) return null;
    var c = card("new", "3. New notes: " + esc(f.text), "For each note: look at the fingering, put your fingers down, then press \u201cPlay it\u201d and play the note. Listen first if you like. Fingers stay curved and close to the keys; left hand on top, right hand below.");
    c.appendChild(det("If it doesn't sound right", TIP.tone));
    Object.keys(f.notes).forEach(function (rk) {
      var row = el("div", "sh-row"); c.appendChild(row);
      f.notes[rk].forEach(function (syl) {
        var n = noteFor(rk, syl, ST.inst);
        if (!n) { row.appendChild(el("div", "sh-dim", "(" + rk + ": your teacher will tell you this key)")); return; }
        var nc = el("div", "sh-note"), res = el("div", "sh-res"); nc.appendChild(el("div", "sh-nl", "<b>" + n.name + "</b> " + name(n.written)));
        nc.appendChild(fingering(n.written));
        nc.appendChild(btn("\u25b6", function () { playNotes([n.concert], { durs: [2] }); }));
        nc.appendChild(btn("Play it", function () { res.textContent = "Listening\u2026"; startMic().then(function () { return listen(1, 4000); }).then(function (g) {
          res.textContent = !g.length ? "I didn't hear a note: play a little louder?" : g[0] === n.written ? "\u2714 " + n.name + "!" : "That was " + name(g[0]) + ". Check the fingering and try again.";
          res.className = "sh-res " + (g[0] === n.written ? "sh-ok" : "sh-no"); }, function () { res.textContent = "Turn on the microphone at the top."; }); }));
        nc.appendChild(res); row.appendChild(nc);
      });
    });
    return c;
  }
  function stepEcho(k) {
    var ns = k.notes.filter(function (x) { return !/,$/.test(x.syl); }); if (ns.length < 2) return null;
    var c = card("echo", "4. Echo patterns by ear", "I play a short pattern. Listen, then breathe, then play it back. With \u201cTogether first\u201d on, I play it once more with you (that's how your teacher starts in class: teaching mode), then you play it alone. Notes you know now: " + ns.map(function (n) { return n.name; }).join(", ") + ".");
    var opts = el("div", "sh-ctl"), tog = el("input"); tog.type = "checkbox"; tog.checked = true;
    var tl = el("label"); tl.appendChild(tog); tl.appendChild(document.createTextNode(" Together first")); opts.appendChild(tl);
    var hint = el("input"); hint.type = "checkbox"; var hl = el("label"); hl.appendChild(hint); hl.appendChild(document.createTextNode(" Show the fingerings")); opts.appendChild(hl);
    c.appendChild(opts);
    var stage = el("div", "sh-stage"), big = el("div", "sh-big", "Press Start"), info = el("div", "sh-info"), score = el("div", "sh-score"); stage.appendChild(big); stage.appendChild(info); stage.appendChild(score); c.appendChild(stage);
    var going = false, seed = Date.now() % 100000, eline = estLine(c);
    c.appendChild(btn("\u25b6 Start", function () {
      if (going) return; going = true;
      var ps = api.patterns(k, seed++, 6), right = 0, i = 0;   // through api: a test can give known patterns
      var rest = k.notes.filter(function (n) { return n.name === (n.la ? "LA" : "DO"); })[0], tc = rest ? { tonic: rest.concert % 12, minor: !!rest.la, qpm: 90 } : null;
      startMic().catch(function () {}).then(function () { if (!tc || api.noEstablish) return null; big.textContent = "Listen\u2026"; return establish("tonality", tc, eline); }).then(function next() {
        if (i >= ps.length) { big.textContent = right + " of " + ps.length + " right"; info.textContent = right >= 5 ? "Excellent! Ready for the next lesson's notes." : "Good practice. Try another set."; going = false; return; }
        var p = ps[i++], cs = p.map(function (n) { return n.concert; });
        big.textContent = "Listen\u2026"; info.innerHTML = hint.checked ? "" : "";
        if (hint.checked) { var r = el("div", "sh-row"); p.forEach(function (n) { var x = el("div", "sh-note sh-mini"); x.appendChild(el("div", "sh-nl", n.name)); x.appendChild(fingering(n.written)); r.appendChild(x); }); info.appendChild(r); }
        return playNotes(cs).then(function () {
          if (!tog.checked) return null;
          big.textContent = "Together\u2026"; return new Promise(function (res) { setTimeout(res, 700); }).then(function () { return playNotes(cs, { vel: 0.35 }); });
        }).then(function () {
          big.textContent = "Your turn (breathe first)";
          return micOn ? listen(p.length, 2500) : new Promise(function (res) { setTimeout(function () { res(null); }, 1000 + p.length * 900); });
        }).then(function (got) {
          if (got == null) { big.textContent = "(Turn on the microphone to have it checked)"; }
          else {
            var ok = got.length === p.length && got.every(function (w, j) { return w === p[j].written; });
            if (ok) right++;
            big.innerHTML = (ok ? "\u2714 " : "\u2716 ") + p.map(function (n, j) { var h = got[j]; return '<span class="' + (h === n.written ? "sh-ok" : "sh-no") + '">' + n.name + "</span>"; }).join(" ");
            info.textContent = ok ? "" : "I heard: " + (got.length ? got.map(name).join(" ") : "nothing") + ". The pattern was " + p.map(function (n) { return n.name; }).join(" ") + ".";
          }
          score.textContent = right + " right so far, " + i + " of " + ps.length;
          return new Promise(function (res) { setTimeout(res, 1800); });
        }).then(next);
      });
    }, "btn-primary"));
    return c;
  }
  // rhythm patterns: the site's conversational chant (RhythmChant, as on Rhythm Patterns), the class's sets (Audiation.RHYTHM),
  // after the meter is established; duple or triple (the new song's meter first)
  function stepRhythm() {
    var s = sections()[idx(ST.sec)], i = idx(ST.sec), div = i >= idx("5B"), syl = i >= idx("3B");
    var c = card("rhythm", "5. Echo rhythm patterns", "Listen to the meter being set, then echo each pattern on \u201cbah\u201d, keeping the big beats in your heels and the little beats in your hands. Breathe on the empty beat. Then play it on one note (" + (i >= idx("3B") ? "DO" : "with the airstream only") + ").");
    if (!global.Audiation || !global.RhythmChant) { c.appendChild(el("p", "sh-dim", "(The rhythm player needs the page's sound scripts.)")); return c; }
    var ctl = el("div", "sh-ctl"), sel = el("select"); ["duple", "triple"].forEach(function (m) { var o = el("option", null, m === "duple" ? "Duple (DU DE)" : "Triple (DU DA DI)"); o.value = m; sel.appendChild(o); });
    sel.value = /triple/.test(s.context) ? "triple" : "duple"; var lab = el("label", null, "Meter "); lab.appendChild(sel); ctl.appendChild(lab); c.appendChild(ctl);
    var line = estLine(c), stage = el("div", "sh-stage"), big = el("div", "sh-big", "Press Start"), paper = el("div", "sh-rpaper"); stage.appendChild(big); stage.appendChild(paper); c.appendChild(stage);
    var cur = null, set = null, n = 0, ready = false;
    function getSet() { var id = sel.value + (div ? "-d" : ""); try { set = Audiation.rhythmSet(id); } catch (e) { set = Audiation.rhythmSet(sel.value); } return set; }
    function qpm() { return sel.value === "triple" ? 120 : 84; }
    function playCur() { big.textContent = "Listen\u2026"; paper.innerHTML = ""; RhythmChant.play(cur.abc, { qpm: qpm(), onEnd: function () { big.textContent = "Breathe, and echo on BAH"; } }); }
    function next() { getSet(); cur = set.patterns[Math.floor(Math.random() * set.patterns.length)]; n++; playCur(); }
    var b = el("div", "sh-ctl"); c.appendChild(b);
    b.appendChild(btn("\u25b6 Start", function () { stopAll(); n = 0; establish("meter", { triple: sel.value === "triple", qpm: sel.value === "triple" ? 80 : 84 }, line).then(function (m) { if (m) { ready = true; next(); } }); }, "btn-primary"));
    b.appendChild(btn("Next pattern", function () { if (!ready) return; next(); }));
    b.appendChild(btn("Again", function () { if (cur) playCur(); }));
    if (syl) b.appendChild(btn("Show the syllables", function () { if (!cur) return; paper.innerHTML = ""; var d = el("div"); paper.appendChild(d); ABCJS.renderAbc(d, RhythmChant.withSyllables(cur.abc), { responsive: "resize" }); big.textContent = Audiation.rhythmSyllables(cur.abc); }));
    if (syl && global.VOICE_HIDDEN === false) b.appendChild(btn("Hear the syllables", function () { if (cur) RhythmChant.play(cur.abc, { qpm: qpm(), syllables: "rhythm" }); }));
    b.appendChild(btn("\u25a0", stopAll));
    sel.onchange = function () { ready = false; big.textContent = "Press Start (the new meter is set first)"; };
    return c;
  }
  function stepArtic(k) {
    var i = idx(ST.sec); if (i > idx("4B")) return null;
    var c = card("artic", "6. Connected or separated?", "Connected: the notes joined, \u201cdoo doo doo doo\u201d. Separated: a little space between them, \u201ctoo too too too\u201d. Listen, say which, then copy it" + (k.notes.length ? " on DO." : " with your voice and then with air only."));
    var stage = el("div", "sh-stage"), big = el("div", "sh-big", "Press \u201cPlay one\u201d"), cur = null; stage.appendChild(big); c.appendChild(stage);
    var base = k.notes.filter(function (n) { return n.name === (n.la ? "LA" : "DO"); })[0], m = base ? base.concert : 58;
    var row = el("div", "sh-ctl"); c.appendChild(row);
    row.appendChild(btn("\u25b6 Play one", function () { cur = Math.random() < 0.5 ? "connected" : "separated"; big.textContent = "Connected or separated?"; playNotes([m, m, m, m], { separated: cur === "separated", beat: 0.5 }); }, "btn-primary"));
    ["connected", "separated"].forEach(function (w) { row.appendChild(btn(w[0].toUpperCase() + w.slice(1), function () { if (!cur) return; big.textContent = w === cur ? "\u2714 Yes, " + cur + ". Now copy it." : "\u2716 Listen again: it was " + cur + "."; })); });
    return c;
  }
  function stepPlaySong(k) {
    var i = idx(ST.sec), have = {}; k.all.forEach(function (n) { have[n.written] = 1; });
    var c = card("play", "7. Play the song", "");
    if (i < idx("3B")) { c.querySelector(".sh-how") || c.appendChild(el("p", "sh-how", "Not yet: you'll play your first song (\u201cMajor Duple\u201d) in Unit 3, Section B. Keep singing them!")); return c; }
    var tr = C().INSTRUMENTS[ST.inst], ok = [];
    var line = null, seen = {};
    songsUpTo().concat(lessonSongs().map(function (x) { return x.sg; })).forEach(function (sg) {
      if (seen[sg[1]]) return; seen[sg[1]] = 1;
      var abc = tuneText(sg[1]); if (!abc || !global.AbcEvents) return;
      // the octave (of the class key) that needs the fewest notes not yet learned
      var base = classKey(abc), mids = AbcEvents.fromAbc(abc).sounding.map(function (e) { return e.pitches[0].midi; }), best = null;
      [base, base - 12, base + 12].forEach(function (sh) {
        var ws = mids.map(function (m) { return m + sh - tr; }), miss = ws.filter(function (w, j) { return !have[w] && ws.indexOf(w) === j; });
        if (!best || miss.length < best.miss.length) best = { sg: sg, abc: abc, sh: sh, miss: miss };
      });
      ok.push(best);
    });
    c.appendChild(el("p", "sh-how", "Songs you can play with the notes you know (the others say which notes are still missing). Play by ear first; show the music if you need it (written for your saxophone). The page sets the key and the meter before the band starts: listen, then come in."));
    line = estLine(c);
    ok.forEach(function (x) {
      var r = el("div", "sh-song"); r.appendChild(el("b", null, esc(x.sg[0])));
      if (x.miss.length) { r.appendChild(el("span", "sh-dim", " needs " + x.miss.map(name).join(", "))); c.appendChild(r); return; }
      var sc = el("div", "sh-score-abc");
      r.appendChild(btn("\u25b6 Play with the band", function () { bandPlay(x.abc, x.sh, {}, line); }));
      r.appendChild(btn("\u25b6 Band only (you play)", function () { bandPlay(x.abc, x.sh, { melody: false }, line); }));
      r.appendChild(btn("Show the music", function () { var v = ((x.sh - tr) % 12 + 12) % 12; if (v > 6) v -= 12; sc.innerHTML = ""; ABCJS.renderAbc(sc, x.abc.replace(/^w:.*$/mg, ""), { visualTranspose: v, responsive: "resize" }); }));
      r.appendChild(btn("\u25a0", stopAll));
      c.appendChild(r); c.appendChild(sc);
    });
    return c;
  }
  // class activities (activities.js) that work at home, by where the class is: ear first, then syllables, then making up your own
  var HOME = [
    { from: "1A", ids: ["flow-movement", "snail-steps", "the-pause", "first-pitch-of-song", "resting-tone-subskill", "singing-bass-lines", "pull-a-pattern", "unfinished-songs", "jump-breathe", "slow-motion", "acculturation-listening"] },
    { from: "3B", ids: ["prove-it", "macro-micro-labels", "translate-patterns", "tonal-on-instruments", "label-context-functions", "john-the-rabbit", "playlist-context", "audiate-the-lyric", "unfamiliar-in-body"] },
    { from: "5A", ids: ["same-different", "different-pattern", "i-know-a-song", "compose-tonic-dominant", "tonic-compositions", "antecedent-consequent", "cover-notation", "context-change-songs"] },
    { from: "8A", ids: ["find-patterns-in-score", "write-from-audiation", "dictation-steps", "read-new-cells"] }
  ];
  var HOME_NOTE = { "pull-a-pattern": "Ask someone at home to sing the song while you do your part.", "jump-breathe": "Use the rhythm patterns above: jump and breathe on the empty beat.", "unfinished-songs": "Sing a song from today and stop before the end: make up your own ending, then play it.",
    "playlist-context": "Put on your own music: is each song duple or triple? major or minor?", "prove-it": "Chant DU DE (or DU DA DI) while the band plays today's song.", "tonal-on-instruments": "Find DO on your sax, then play a pattern from today.", "antecedent-consequent": "Play \u201cBand only\u201d and play your own answer to each phrase." };
  function stepTry() {
    var A = global.MLTActivities; if (!A) return null;
    var ids = []; HOME.forEach(function (h) { if (idx(ST.sec) >= idx(h.from)) ids = ids.concat(h.ids); });
    var list = ids.map(function (id) { return A.filter(function (a) { return a.id === id && a.student; })[0]; }).filter(Boolean); if (!list.length) return null;
    var day = Math.floor(Date.now() / 864e5), r = rng(day * 31 + idx(ST.sec)), pick = [];
    while (pick.length < 2 && pick.length < list.length) { var a = list[Math.floor(r() * list.length)]; if (pick.indexOf(a) < 0) pick.push(a); }
    var c = card("try", "8. Something different today", "Two games from class you can play at home. They change each day.");
    pick.forEach(function (a) { var d = el("div", "sh-act"); d.appendChild(el("b", null, esc(a.name))); d.appendChild(el("p", null, esc(a.student) + (HOME_NOTE[a.id] ? " <i>" + esc(HOME_NOTE[a.id]) + "</i>" : "")));
      if (a.tool) d.appendChild(el("a", null, "Open it on the site \u2192")).href = a.tool; c.appendChild(d); });
    return c;
  }
  function stepCare() { var c = card("care", "9. Put it away", "Every time, so the pads and reed last."); c.appendChild(el("div", null, TIP.care)); return c; }
  function progress() {
    var p = document.getElementById("sh-progress"); if (!p) return;
    var d = (ST.done[ST.sec] || []).length, n = document.querySelectorAll(".sh-card").length;
    p.textContent = d + " of " + n + " done today" + (d >= n && n ? ". Great work! Ask your teacher about the next lesson." : "");
  }
  function chart(k) {
    var host = document.getElementById("sh-chart"); if (!host) return; host.innerHTML = "";
    if (!k.all.length) { host.textContent = "No notes yet: they start in Unit 1, Section B."; return; }
    var row = el("div", "sh-row"), seen = {};
    k.all.slice().sort(function (a, b) { return a.written - b.written; }).forEach(function (n) {
      if (seen[n.written]) return; seen[n.written] = 1;
      var nc = el("div", "sh-note"); nc.appendChild(el("div", "sh-nl", "<b>" + name(n.written) + "</b> " + k.all.filter(function (x) { return x.written === n.written; }).map(function (x) { return x.name + " in " + x.key; }).join(", ")));
      nc.appendChild(fingering(n.written)); nc.appendChild(btn("\u25b6", function () { playNotes([n.concert], { durs: [2] }); })); row.appendChild(nc);
    });
    host.appendChild(row);
  }
  function draw() {
    var host = document.getElementById("sh-steps"); if (!host) return; host.innerHTML = "";
    var k = known(ST.sec, ST.inst), s = sections()[idx(ST.sec)];
    document.getElementById("sh-where").innerHTML = "Unit " + s.unit + ", Section " + s.sec + (s.song ? ": \u201c" + esc(s.song[0]) + "\u201d" : "") +
      (k.key ? " \u00b7 practising in concert " + esc(J().KEYMAP[k.key]) : "");
    [stepWarm(k), stepSongs(), stepNewNotes(), stepEcho(k), stepRhythm(), stepArtic(k), stepPlaySong(k), stepTry(), stepCare()].forEach(function (c) { if (c) host.appendChild(c); });
    chart(k); progress();
  }
  function mount() {
    var sel = document.getElementById("sh-sec"), inst = document.getElementById("sh-inst"); if (!sel) return;
    sections().forEach(function (s) { var o = el("option", null, "Unit " + s.unit + ", Section " + s.sec + (s.song ? " (" + s.song[0] + ")" : "")); o.value = s.id; if (s.id === ST.sec) o.selected = true; sel.appendChild(o); });
    inst.value = ST.inst;
    sel.onchange = function () { ST.sec = sel.value; store(ST); draw(); };
    inst.onchange = function () { ST.inst = inst.value; store(ST); draw(); };
    document.getElementById("sh-next").onclick = function () { var i = idx(ST.sec); if (i < sections().length - 1) { ST.sec = sections()[i + 1].id; sel.value = ST.sec; store(ST); draw(); window.scrollTo(0, 0); } };
    var mb = document.getElementById("sh-mic"); mb.onclick = function () { startMic(mb).catch(function () { mb.textContent = "Microphone blocked: allow it in the browser"; }); };
    draw();
  }
  var api = { known: known, patterns: patterns, classKey: classKey, state: ST, draw: draw, _noteIn: function (w) { noteL.forEach(function (fn) { fn(w); }); }, _micOn: function (v) { micOn = v; } };
  global.SaxHome = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document !== "undefined") { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else setTimeout(mount, 0); }
})(typeof window !== "undefined" ? window : globalThis);
