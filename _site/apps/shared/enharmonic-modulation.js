// enharmonic-modulation.js — the widgets of theory/enharmonic-modulation.qmd (Hutchinson, Music Theory for the 21st-Century Classroom, ch. 23).
//   <div class="em-dim" data-set="0"></div>   one fully diminished seventh (data-set 0, 1 or 2: the three of them) in all four of its
//                                             spellings: resolved UP (as vii°7 of each of four minor keys) or DOWN (one note falls a
//                                             half step to the root of a dominant seventh), each drawn and played
//   <div class="em-ger"></div>                a German sixth and a dominant seventh: the same sound, two spellings, two keys a half step apart
//   <div class="em-engerman"></div>           the enharmonic German sixth (♯2 written for ♭3) going to I64
//   <div class="em-quiz"></div>               which keys can this chord lead to? (dim7: tick the four; Ger+65 / V7: pick the key)
// The chords are spelled by letter steps (up(): a letter step count and a semitone count, so every note has its one right spelling) from the
// rules in the chapter; they are voiced (bass + three upper voices moving as little as possible, a doubling picked by the same rule) and
// drawn with the accidentals written out in a plain C-major signature, one chord a bar. Not checked for every part-writing rule (the
// seventh does not always resolve down). The respellings are the chapter's: dim7 four keys (each note as the leading tone, or as the
// note that falls to a dominant seventh's root), V7 <-> Ger+65 (only the top note is respelled), Ger+65 <-> enharmonic German (♭3 ->
// ♯2, which the book says goes only to a major I). Exports window.EnharMod for the tests.
(function (global) {
  "use strict";
  var LET = "CDEFGAB", NAT = [0, 2, 4, 5, 7, 9, 11];
  var ACC = { "-2": "𝄫", "-1": "♭", "0": "", "1": "♯", "2": "𝄪" }, ACC_ABC = { "-2": "__", "-1": "_", "0": "=", "1": "^", "2": "^^" };
  function mod(n, m) { return ((n % m) + m) % m; }
  function midi(n) { return 12 * (n.o + 1) + NAT[n.l] + n.a; }
  function pc(n) { return mod(NAT[n.l] + n.a, 12); }
  function nm(n) { return LET[n.l] + ACC[n.a]; }
  function sameName(a, b) { return a.l === b.l && a.a === b.a; }
  // a note a number of letter steps and semitones above (or below, negative) another; the octave follows
  function up(n, steps, semis) {
    var d = n.o * 7 + n.l + steps, l = mod(d, 7), o = Math.floor(d / 7), m = midi(n) + semis;
    return { l: l, a: m - 12 * (o + 1) - NAT[l], o: o };
  }
  function note(letter, acc, o) { return { l: LET.indexOf(letter), a: acc, o: o == null ? 4 : o }; }

  // ---- keys: tonic spelled the usual way for a pitch class
  var MINOR_TONIC = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "G♯", "A", "B♭", "B"];
  var MAJOR_TONIC = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
  function tonicFor(p, minor) {
    var s = (minor ? MINOR_TONIC : MAJOR_TONIC)[mod(p, 12)], l = LET.indexOf(s.charAt(0));
    return { l: l, a: s.length > 1 ? (s.charAt(1) === "♯" ? 1 : -1) : 0, o: 4 };
  }
  function keyName(t, minor) { var s = nm(t); return minor ? s.charAt(0).toLowerCase() + s.slice(1) + " minor" : s + " major"; }

  // ---- chords (each a list of notes, bottom of the stack first, with its bass)
  function triad(t, minor) { return [t, up(t, 2, minor ? 3 : 4), up(t, 4, 7)]; }
  function dom7(r) { return [r, up(r, 2, 4), up(r, 4, 7), up(r, 6, 10)]; }
  // vii°7 of a minor key: the leading tone (a half step below the tonic) up in minor thirds
  function dim7Of(tonic) { var lt = up(tonic, -1, -1); return [lt, up(lt, 2, 3), up(lt, 4, 6), up(lt, 6, 9)]; }
  // Ger+65 in a key (b6 1 b3 #4, b6 the bass), as a stack of letter thirds is F# Ab C Eb: the bass is the second note
  function ger(tonic) { return [up(tonic, 5, 8), tonic, up(tonic, 2, 3), up(tonic, 3, 6)]; }          // bass first
  function engerman(tonic) { return [up(tonic, 5, 8), tonic, up(tonic, 1, 3), up(tonic, 3, 6)]; }    // b6 1 #2 #4
  function pcs(ch) { return ch.map(pc).sort(function (a, b) { return a - b; }); }

  // the three fully diminished sevenths: set 0 = {B D F A♭} (leading tones of c, e♭, f♯, a), set 1 = a half step higher, set 2 = a whole step higher
  function dim7Keys(set) {
    var out = [];
    [0, 3, 6, 9].forEach(function (k) {
      var tonic = tonicFor(set + k, true), ch = dim7Of(tonic);
      out.push({ tonic: tonic, minor: true, chord: ch, key: keyName(tonic, true), label: "vii°7 in " + keyName(tonic, true) });
    });
    return out;
  }
  // each note of a dim7 chord falling a half step is the root of a dominant seventh (the chord's other three notes are its 3rd, 5th, 7th)
  function dim7Falls(chord) {
    return chord.map(function (f) {
      var cost = function (x) { return dom7(x).concat([up(x, -4, -7)]).reduce(function (t, n) { return t + Math.abs(n.a); }, 0); };
      var a = up(f, 0, -1), b = up(f, -1, -1), r = cost(b) < cost(a) ? b : a;   // the spelling with the fewest accidentals in the chord and its tonic; a tie keeps the letter
      var tonic = up(r, -4, -7), ch = dom7(r);
      return { fall: f, root: r, chord: ch, tonic: tonic, key: keyName(tonic, false), label: "V7 of " + keyName(tonic, false) };
    });
  }
  // V7 on R and Ger+65 of the key a major third below R: the same sound; the keys are a half step apart (Ger's key is the lower)
  function gerPair(gerTonic) {
    var g = ger(gerTonic), r = g[0], v7 = dom7(r), vTonic = up(r, 3, 5);
    return { gerKey: gerTonic, ger: g, v7: v7, v7Root: r, v7Key: vTonic };
  }

  // ---- voicing: bass in the bass clef, three upper voices in the treble, each next chord as close as possible to the last
  function voiceChord(ch, bass, prevUp, prevBass) {
    var b = { l: bass.l, a: bass.a, o: 2 }, best = null, ob, oo;
    for (ob = 1; ob <= 3; ob++) { var c = { l: bass.l, a: bass.a, o: ob }, m = midi(c); if (m >= 36 && m <= 59 && (!best || Math.abs(m - (prevBass == null ? 48 : prevBass)) < Math.abs(midi(best) - (prevBass == null ? 48 : prevBass)))) best = c; }
    b = best || b;
    var rest = ch.filter(function (n) { return !sameName(n, bass); });
    var cands = ch.length === 3 ? ch.map(function (d) { return rest.concat([d]); }) : [rest];   // a triad doubles one of its notes
    var bestV = null;
    cands.forEach(function (list) {
      (function rec(i, cur) {
        if (i === list.length) {
          var ms = cur.map(midi).sort(function (x, y) { return x - y; });
          if (new Set(cur.map(function (n) { return n.l + "," + n.a + "," + n.o; })).size < cur.length) return;
          var span = ms[ms.length - 1] - ms[0]; if (span > 16) return;
          var cost = prevUp ? ms.reduce(function (s, m, k) { return s + Math.abs(m - prevUp[k]); }, 0) : Math.abs(ms[ms.length - 1] - 72) + span * 0.3;
          if (!bestV || cost < bestV.cost) bestV = { cost: cost, notes: cur.slice().sort(function (x, y) { return midi(x) - midi(y); }) };
          return;
        }
        for (var o = 3; o <= 6; o++) { var n = { l: list[i].l, a: list[i].a, o: o }, m = midi(n); if (m >= 60 && m <= 81) { cur.push(n); rec(i + 1, cur); cur.pop(); } }
      })(0, []);
    });
    return { bass: b, upper: bestV.notes };
  }

  // ---- ABC: one chord a bar (4 quarters), treble above bass, the accidentals written out (a natural wherever the same letter is altered in the bar)
  function noteAbc(n, altered) {
    var s = (n.a !== 0 ? ACC_ABC[n.a] : altered[n.l] ? "=" : "") + (n.o >= 5 ? LET[n.l].toLowerCase() : LET[n.l]), k;
    for (k = 5; k < n.o; k++) s += "'"; for (k = 4; k > n.o; k--) s += ",";
    return s;
  }
  // bars: [{ chord: [notes], bass: note, top: "text above", under: "text under" }] -> { abc, voiced: [{ bass, upper }] }
  function makeAbc(bars, opts) {
    var voiced = [], pu = null, pb = null;
    bars.forEach(function (b) { var v = voiceChord(b.chord, b.bass, pu, pb); voiced.push(v); pu = v.upper.map(midi); pb = midi(v.bass); });
    var tr = [], ba = [];
    bars.forEach(function (b, i) {
      var v = voiced[i], alt = {}; v.upper.concat([v.bass]).forEach(function (n) { if (n.a !== 0) alt[n.l] = 1; });
      tr.push((b.top ? '"^' + b.top + '"' : "") + "[" + v.upper.map(function (n) { return noteAbc(n, alt); }).join("") + "]4");
      ba.push((b.under ? '"_' + b.under + '"' : "") + noteAbc(v.bass, alt) + "4");
    });
    var abc = "X:1\nM:4/4\nL:1/4\nQ:1/4=" + ((opts && opts.qpm) || 52) + "\n%%score {1 2}\nV:1 clef=treble\nV:2 clef=bass\nK:C\n[V:1] " + tr.join(" | ") + " |]\n[V:2] " + ba.join(" | ") + " |]\n";
    return { abc: abc, voiced: voiced };
  }
  function lowest(ch) { return ch[0]; }

  // ---- the demonstrations: a list of bars for each way of reading a chord
  function bar(ch, bass, top, under) { return { chord: ch, bass: bass, top: top, under: under }; }
  function setNames(chord) { return chord.map(nm).join(" "); }
  // dim7 as vii°7 of one of its four keys: the chord written for that key, then the tonic triad (minor)
  function demoDimUp(entry) {
    var ch = entry.chord, t = entry.tonic;
    return [bar(ch, ch[0], setNames(ch), "vii°7 in " + keyName(t, true)), bar(triad(t, true), t, "", "i")];
  }
  // dim7 with one note falling a half step to the root of a dominant seventh, then the tonic (major)
  function demoDimDown(chord, fall) {
    var f = fall, order = chord.slice(), ix = 0;
    return [bar(chord, chord[0], setNames(chord), "dim7"), bar(f.chord, f.root, setNames(f.chord), "V7 of " + nm(f.tonic)), bar(triad(f.tonic, false), f.tonic, "", "I")];
  }
  // V7 / Ger+65: tonic of the Ger key, the pivot written as Ger in its own key, then as V7 in the other, then the other key's tonic
  function demoGerToV7(gerTonic) {
    var p = gerPair(gerTonic), gt = gerTonic;
    return { p: p, bars: [bar(triad(gt, true), gt, "", "i"), bar(p.ger, p.ger[0], "Ger+65: " + setNames(p.ger), keyName(gt, true)),
      bar(p.v7, p.v7[0], "V7: " + setNames(p.v7) + " (same sound)", "V7 of " + nm(p.v7Key)), bar(triad(p.v7Key, false), p.v7Key, "", "I")] };
  }
  function demoV7ToGer(gerTonic) {
    var p = gerPair(gerTonic), vk = p.v7Key;
    return { p: p, bars: [bar(triad(vk, false), vk, "", "I of " + nm(vk)), bar(p.v7, p.v7[0], "V7: " + setNames(p.v7), "V7"),
      bar(p.ger, p.ger[0], "Ger+65 (same sound): " + setNames(p.ger), "Ger+65 in " + keyName(gerTonic, true)),
      bar(triad(up(gerTonic, 4, 7), false), up(gerTonic, 4, 7), "", "V")] };
  }
  function demoEnGerman(gerTonic) {
    var g = ger(gerTonic), e = engerman(gerTonic), t = gerTonic, c64 = [t, up(t, 2, 4), up(t, 4, 7)];
    return [bar(g, g[0], "Ger+65: " + setNames(g), "Ger+65"), bar(e, e[0], "enharmonic German: " + setNames(e) + " (same sound)", "♭6 1 ♯2 ♯4"), bar(c64, c64[2], "", "I64")];
  }

  global.EnharMod = { up: up, midi: midi, pc: pc, nm: nm, note: note, tonicFor: tonicFor, keyName: keyName, triad: triad, dom7: dom7, dim7Of: dim7Of, ger: ger, engerman: engerman,
    dim7Keys: dim7Keys, dim7Falls: dim7Falls, gerPair: gerPair, voiceChord: voiceChord, makeAbc: makeAbc, bar: bar, demoDimUp: demoDimUp, demoDimDown: demoDimDown, demoGerToV7: demoGerToV7,
    demoV7ToGer: demoV7ToGer, demoEnGerman: demoEnGerman, lowest: lowest };

  // ---- the page widgets (browser only)
  if (typeof document === "undefined") return;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var playing = null;
  function stage(parent) {
    var wrap = el("div", "em-stage"), paper = el("div", "em-paper"), row = el("div", "em-row"), cap = el("div", "em-cap"), vo = null;
    var btn = el("button", "btn btn-sm btn-outline-secondary", "▶ Play"); btn.type = "button";
    btn.addEventListener("click", function () {
      if (playing === btn) { global.AbcPlay.stop(); return; }
      if (playing) global.AbcPlay.stop();
      if (!vo) return;
      playing = btn; btn.textContent = "■ Stop";
      global.AbcPlay.play(vo, { sound: "piano", onEnd: function () { if (playing === btn) playing = null; btn.textContent = "▶ Play"; } });
    });
    row.appendChild(btn); wrap.appendChild(paper); wrap.appendChild(row); wrap.appendChild(cap); parent.appendChild(wrap);
    return { show: function (bars, caption) {
      var r = makeAbc(bars); wrap.setAttribute("data-abc", r.abc); paper.innerHTML = "";
      vo = global.ABCJS.renderAbc(paper, r.abc, { responsive: "resize", add_classes: true, staffwidth: 520, paddingtop: 20, paddingbottom: 4, paddingleft: 0, paddingright: 0, scale: 1 })[0];
      cap.textContent = caption || ""; btn.textContent = "▶ Play"; },
      el: wrap };
  }
  function choice(parent, items, onPick) {
    var row = el("div", "em-choices"), btns = items.map(function (it, i) {
      var b = el("button", "btn btn-sm btn-outline-primary", it.text); b.type = "button";
      b.addEventListener("click", function () { btns.forEach(function (x) { x.classList.remove("active"); }); b.classList.add("active"); onPick(i); });
      row.appendChild(b); return b; });
    parent.appendChild(row); return btns;
  }
  function initDim(h) {
    var set = +h.getAttribute("data-set") || 0, keys = dim7Keys(set), st = stage(h), cap = el("p", "em-head");
    var base = keys[0].chord;
    h.insertBefore(cap, h.firstChild);
    cap.textContent = "The sound: " + [0, 3, 6, 9].map(function (k) { return nm(tonicFor(set + k - 1, false)); }).join(", ") + " (any spelling). Pick a way to resolve it.";
    h.insertBefore(el("p", "em-lab", "Up: this chord as vii°7 of"), st.el);
    choice(h, keys.map(function (k) { return { text: nm(k.tonic) + " minor" }; }), function (i) { var k = keys[i]; st.show(demoDimUp(k), k.label + ": " + setNames(k.chord) + " is the leading tone " + nm(k.chord[0]) + ", then up a half step to " + nm(k.tonic) + "."); });
    h.appendChild(el("p", "em-lab", "Down: one note falls a half step to the root of a dominant seventh"));
    var chord = keys[0].chord, falls = dim7Falls(chord);
    choice(h, falls.map(function (f) { return { text: nm(f.fall) + " falls to " + nm(f.root) }; }), function (i) { var f = falls[i]; st.show(demoDimDown(chord, f), setNames(chord) + ": " + nm(f.fall) + " falls to " + nm(f.root) + ", so the chord goes to " + f.label + "."); });
    st.show(demoDimUp(keys[0]), keys[0].label + ": " + setNames(keys[0].chord));
  }
  function initGer(h) {
    var tonics = [0, 2, 4, 5, 7, 9, 10].map(function (p) { return tonicFor(p, true); }), st = stage(h), ix = 0, dir = 0;
    function draw() {
      var t = tonics[ix], d = dir === 0 ? demoGerToV7(t) : demoV7ToGer(t), p = d.p;
      st.show(d.bars, dir === 0 ? "Ger+65 in " + keyName(t, true) + " (" + setNames(p.ger) + ") sounds as V7 of " + keyName(p.v7Key, false) + " (" + setNames(p.v7) + "): only the top note is respelled (" + nm(p.ger[3]) + " = " + nm(p.v7[3]) + ")."
        : "V7 of " + keyName(p.v7Key, false) + " (" + setNames(p.v7) + ") sounds as Ger+65 in " + keyName(t, true) + " (" + setNames(p.ger) + "): respell the top note " + nm(p.v7[3]) + " as " + nm(p.ger[3]) + ".");
    }
    h.insertBefore(el("p", "em-lab", "Direction"), st.el);
    choice(h, [{ text: "Ger+65 → V7 (the first key's pivot is a German sixth)" }, { text: "V7 → Ger+65" }], function (i) { dir = i; draw(); });
    h.appendChild(el("p", "em-lab", "The key of the German sixth"));
    choice(h, tonics.map(function (t) { return { text: keyName(t, true) }; }), function (i) { ix = i; draw(); });
    draw();
  }
  function initEnGerman(h) {
    var tonics = [0, 7, 2, 9].map(function (p) { return tonicFor(p, false); }), st = stage(h);
    function draw(i) { var d = demoEnGerman(tonics[i]); st.show(d, "In " + keyName(tonics[i], false) + ": the ♭3 (" + nm(ger(tonics[i])[2]) + ") is written as ♯2 (" + nm(engerman(tonics[i])[2]) + ") because it climbs to the 3rd of the major tonic chord (" + nm(up(tonics[i], 2, 4)) + ") in the I64."); }
    h.insertBefore(el("p", "em-lab", "Key"), st.el);
    choice(h, tonics.map(function (t) { return { text: keyName(t, false) }; }), draw); draw(0);
  }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function initQuiz(h) {
    var st = stage(h), msg = el("p", "em-msg"), q = null, picks = {};
    var prompt = el("p", "em-q"); h.insertBefore(prompt, st.el);
    var opts = el("div", "em-choices"), nextBtn = el("button", "btn btn-sm btn-primary", "Another chord"); nextBtn.type = "button";
    var chk = el("button", "btn btn-sm btn-outline-primary", "Check"); chk.type = "button"; chk.style.marginLeft = ".4rem";
    h.appendChild(opts); h.appendChild(chk); h.appendChild(nextBtn); h.appendChild(msg);
    function fresh() {
      msg.textContent = ""; picks = {}; opts.innerHTML = "";
      var kind = rnd(2);
      if (kind === 0) {   // a dim7 written as vii°7 of one minor key: tick the four minor keys it can be vii°7 of
        var set = rnd(3), ks = dim7Keys(set), k0 = ks[rnd(4)], right = ks.map(function (k) { return pc(k.tonic); });
        var all = []; for (var p = 0; p < 12; p++) all.push(p);
        q = { kind: "dim", right: right.slice().sort(function (a, b) { return a - b; }) };
        prompt.textContent = "This chord is written as vii°7 in " + keyName(k0.tonic, true) + ". Respelling its notes, it can also be vii°7 in other minor keys. Tick all four (this one counts).";
        st.show([bar(k0.chord, k0.chord[0], "", "")], setNames(k0.chord));
        all.forEach(function (p2) { var t = tonicFor(p2, true), b = el("button", "btn btn-sm btn-outline-secondary", keyName(t, true)); b.type = "button"; b.setAttribute("data-pc", p2);
          b.addEventListener("click", function () { if (picks[p2]) { delete picks[p2]; b.classList.remove("active"); } else { picks[p2] = 1; b.classList.add("active"); } }); opts.appendChild(b); });
      } else {   // a German sixth: which major key does it lead to as V7 (or the reverse)
        var gt = tonicFor([0, 2, 4, 5, 7, 9, 10][rnd(7)], true), p3 = gerPair(gt), toV = rnd(2) === 0;
        var correctTonic = toV ? p3.v7Key : gt, correctPc = pc(correctTonic);
        q = { kind: "ger", right: [correctPc], name: keyName(tonicFor(correctPc, !toV), !toV) };
        prompt.textContent = toV ? "This is Ger+65 in " + keyName(gt, true) + ". Respell the top note: which major key does the chord lead to as a V7?" : "This is V7 of " + keyName(p3.v7Key, false) + ". Respell the top note as a German sixth: in which minor key?";
        st.show([toV ? bar(p3.ger, p3.ger[0], "", "") : bar(p3.v7, p3.v7[0], "", "")], setNames(toV ? p3.ger : p3.v7));
        var cs = {}; cs[correctPc] = 1; [1, -1, 5, 7, 2, 3].forEach(function (d) { if (Object.keys(cs).length < 4) cs[mod(correctPc + d, 12)] = 1; });
        Object.keys(cs).map(Number).sort(function () { return Math.random() - .5; }).forEach(function (p4) { var t = tonicFor(p4, !toV), b = el("button", "btn btn-sm btn-outline-secondary", keyName(t, !toV)); b.type = "button"; b.setAttribute("data-pc", p4);
          b.addEventListener("click", function () { picks = {}; picks[p4] = 1; Array.prototype.forEach.call(opts.children, function (x) { x.classList.remove("active"); }); b.classList.add("active"); }); opts.appendChild(b); });
      }
    }
    function mark() { h.setAttribute("data-right", q.right.join()); }
    chk.addEventListener("click", function () {
      var got = Object.keys(picks).map(Number).sort(function (a, b) { return a - b; });
      var ok = got.join() === q.right.join();
      msg.textContent = ok ? "Right." : "Not quite" + (q.kind === "dim" ? ": the four minor keys are " + q.right.map(function (p) { return keyName(tonicFor(p, true), true); }).join(", ") + "." : ": the answer is " + q.name + ".");
      msg.className = "em-msg " + (ok ? "em-good" : "em-warn");
    });
    nextBtn.addEventListener("click", function () { fresh(); mark(); }); fresh(); mark();
  }
  function init() {
    if (!global.ABCJS || !global.AbcPlay) return;
    [["em-dim", initDim], ["em-ger", initGer], ["em-engerman", initEnGerman], ["em-quiz", initQuiz]].forEach(function (p) {
      Array.prototype.forEach.call(document.querySelectorAll("." + p[0]), function (h) { if (!h.getAttribute("data-done")) { h.setAttribute("data-done", "1"); p[1](h); } }); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : globalThis);
