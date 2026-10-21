// modulation.js — the widgets of theory/modulation.qmd (Hutchinson, Music Theory for the 21st-Century Classroom, ch. 22).
//   <div class="mod-related"></div>   closely related keys: pick a key, see (and hear) the five whose signatures differ by one
//   <div class="mod-pivot"></div>     common chords of two keys (22.4): the diatonic triads side by side, shared ones marked with
//                                     their function in each key; click one to hear a modulation through it
//   <div class="mod-ex" data-kind="diatonic"></div>   one of the book's kinds of modulation, written out in a key (EXAMPLES)
//   <div class="mod-quiz"></div>      which kind? an example in a random key, numerals hidden until answered
// Progressions are written as numerals in keys ("C: I", "IV", "vi|G: ii", "G: V7", ...): a "|" marks a pivot (one chord, two
// readings), a key prefix changes the key. Chords are spelled from the numeral, voiced (bass + three upper voices moving as
// little as possible), drawn by abcjs with the numerals under the bass, and played by AbcPlay.
// Exported as window.Modulation for the tests: spell, parseKey, chordOf, progression, triads, common.
(function (global) {
  "use strict";
  var LET = "CDEFGAB", NAT = [0, 2, 4, 5, 7, 9, 11], MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10];
  var ACC = { "-2": "𝄫", "-1": "♭", "0": "", "1": "♯", "2": "𝄪" }, ACC_ABC = { "-2": "__", "-1": "_", "0": "=", "1": "^", "2": "^^" };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function mod(n, m) { return ((n % m) + m) % m; }

  // ---- keys: "C", "f#", "Bb", "c♯" -> { l, a, minor }
  function parseKey(s) {
    var m = /^([A-Ga-g])(#|♯|b|♭)?$/.exec(String(s).trim()); if (!m) return null;
    return { l: LET.indexOf(m[1].toUpperCase()), a: m[2] ? (/[#♯]/.test(m[2]) ? 1 : -1) : 0, minor: m[1] === m[1].toLowerCase() };
  }
  function keyPc(k) { return mod(NAT[k.l] + k.a, 12); }
  function keyLabel(k) { var n = LET[k.l] + ACC[k.a]; return k.minor ? n.toLowerCase() : n; }
  function keyLong(k) { return LET[k.l] + ACC[k.a] + (k.minor ? " minor" : " major"); }
  // sharps (+) or flats (−) in the key signature
  function sig(k) { var f = [0, 2, 4, -1, 1, 3, 5][k.l] + 7 * k.a; return k.minor ? f - 3 : f; }
  function keyAbc(k) { return LET[k.l] + (k.a > 0 ? "#" : k.a < 0 ? "b" : "") + (k.minor ? "m" : ""); }
  function sigMap(k) { var s = sig(k), m = [0, 0, 0, 0, 0, 0, 0], sh = [3, 0, 4, 1, 5, 2, 6], fl = [6, 2, 5, 1, 4, 0, 3]; for (var i = 0; i < Math.abs(s); i++) m[(s > 0 ? sh : fl)[i]] = s > 0 ? 1 : -1; return m; }
  function sigText(k) { var s = sig(k); return s === 0 ? "no ♯ or ♭" : Math.abs(s) + (s > 0 ? "♯" : "♭"); }
  function keyFromSig(s, minor) {   // the key with s sharps (+) / flats (−)
    var f = minor ? s + 3 : s, l = mod(f * 4, 7), base = [0, 2, 4, -1, 1, 3, 5][l], a = (f - base) / 7;
    return { l: l, a: a, minor: !!minor };
  }

  // ---- a note a scale step and a number of semitones above a key's tonic: { l, a, pc }
  function above(k, steps, semis) { var l = mod(k.l + steps, 7), pc = mod(keyPc(k) + semis, 12), a = mod(pc - NAT[l] + 6, 12) - 6; return { l: l, a: a, pc: pc }; }
  function noteName(n) { return LET[n.l] + ACC[n.a]; }

  // ---- numerals. "V65/ii", "vii°7", "N6", "iv" (in major: borrowed), "IVM7" ... -> { rootStep, rootSemis, q, inv, sec }
  var ROMAN = { i: 0, ii: 1, iii: 2, iv: 3, v: 4, vi: 5, vii: 6 };
  var Q = { maj: [4, 7], min: [3, 7], dim: [3, 6], aug: [4, 8], dom7: [4, 7, 10], maj7: [4, 7, 11], min7: [3, 7, 10], hd7: [3, 6, 10], dim7: [3, 6, 9] };
  var FIG = { "": 0, "6": 1, "64": 2, "7": 0, "65": 1, "43": 2, "42": 3, "2": 3 };
  function parseRn(s) {
    s = String(s).replace(/\s+/g, "").replace(/o(?=\d|\/|$)/, "°").replace(/⁶/g, "6").replace(/⁴/g, "4").replace(/⁵/g, "5").replace(/³/g, "3").replace(/²/g, "2").replace(/⁷/g, "7");
    var sec = null, sl = s.indexOf("/"); if (sl > 0) { sec = s.slice(sl + 1); s = s.slice(0, sl); }
    if (/^N/.test(s)) return { n: true, fig: s.slice(1), sec: sec };
    var m = /^(♭|b|♯|#)?(vii|vi|v|iv|iii|ii|i|VII|VI|V|IV|III|II|I)(°|ø|\+|M)?(\d*)$/.exec(s); if (!m) return null;
    return { alt: m[1] ? (/[♭b]/.test(m[1]) ? -1 : 1) : 0, deg: ROMAN[m[2].toLowerCase()], upper: m[2] === m[2].toUpperCase(), mark: m[3] || "", fig: m[4], sec: sec };
  }
  // the chord a numeral names in a key: notes root first, and the index of the bass
  function chordOf(k, rn) {
    var p = typeof rn === "string" ? parseRn(rn) : rn; if (!p) return null;
    if (p.sec) {   // V/x: the numeral in the key of x (major if x is upper case)
      var t = parseRn(p.sec), tc = t && chordOf(k, t.sec ? t : { alt: t.alt, deg: t.deg, upper: t.upper, mark: t.mark, fig: "" });
      if (!tc) return null;
      var tk = { l: tc.notes[0].l, a: tc.notes[0].a, minor: !t.upper };
      return chordOf(tk, { alt: p.alt, deg: p.deg, upper: p.upper, mark: p.mark, fig: p.fig, n: p.n });
    }
    var fig = p.fig || "", seventh = /7|65|43|42|^2$/.test(fig), inv = FIG[fig] != null ? FIG[fig] : 0, root, q;
    if (p.n) { root = above(k, 1, 1); q = seventh ? "dom7" : "maj"; }
    else {
      var scale = k.minor ? MIN : MAJ, semis = scale[p.deg];
      // minor: V and vii° take the raised leading tone; major: lower-case iv / i / vi / iii borrowed from the minor use its notes
      if (k.minor && p.deg === 6 && !p.upper) semis = 11;
      if (!k.minor && p.mark !== "°" && !p.upper && p.deg === 3) semis = 5;
      if (!k.minor && p.upper && (p.deg === 5 || p.deg === 2 || p.deg === 6) && p.alt === -1) semis = MIN[p.deg];   // ♭VI ♭III ♭VII
      else semis += p.alt;
      root = above(k, p.deg, semis);
      if (p.mark === "°") q = seventh ? "dim7" : "dim";
      else if (p.mark === "ø") q = "hd7";
      else if (p.mark === "+") q = "aug";
      else if (p.upper) q = seventh ? (p.mark === "M" ? "maj7" : (p.deg === 4 || p.sec ? "dom7" : (k.minor ? (p.deg === 4 ? "dom7" : "maj7") : (p.deg === 0 || p.deg === 3 ? "maj7" : "dom7")))) : "maj";
      else q = seventh ? "min7" : "min";
    }
    var notes = [root].concat(Q[q].map(function (iv, i) { return above({ l: root.l, a: root.a, minor: false }, 2 * (i + 1), iv); }));
    return { notes: notes, inv: inv, q: q };
  }
  function chordName(c) { return noteName(c.notes[0]) + { maj: "", min: "m", dim: "°", aug: "+", dom7: "7", maj7: "M7", min7: "m7", hd7: "ø7", dim7: "°7" }[c.q]; }

  // the diatonic triads of a key, as the book lists them (minor: i ii° III iv V VI VII vii°, the raised 7th in V and vii°)
  function triads(k) {
    var rns = k.minor ? ["i", "ii°", "III", "iv", "v", "V", "VI", "VII", "vii°"] : ["I", "ii", "iii", "IV", "V", "vi", "vii°"];
    return rns.map(function (rn) { var c = chordOf(k, rn); return { rn: rn, chord: c, name: chordName(c) }; });
  }
  // chords diatonic in both keys: the same root (spelled the same) and quality
  function common(k1, k2) {
    var b = triads(k2), out = [];
    triads(k1).forEach(function (x) { b.forEach(function (y) { if (x.name === y.name) out.push({ name: x.name, a: x.rn, b: y.rn, chord: x.chord }); }); });
    return out;
  }
  // harmonic function (ch. 9): T tonic, TP tonic prolongation, PD pre-dominant, D dominant
  function func(rn) {
    var r = rn.replace(/[°ø+]|\d/g, "");
    return { I: "T", i: "T", vi: "TP", VI: "TP", iii: "TP", III: "TP", IV: "PD", iv: "PD", ii: "PD", V: "D", v: "D", vii: "D", VII: "D" }[r] || "";
  }
  var FUNC_NAME = { T: "tonic", TP: "tonic prolongation", PD: "pre-dominant", D: "dominant" };

  // ---- a progression: ["C: I", "IV", "vi|G: ii", "G: V7", "I"] -> chords with labels and the key in force
  function progression(steps, home) {
    var k = home, out = [];
    steps.forEach(function (st) {
      var end = /\|\|\s*$/.test(st), parts = st.replace(/\|\|\s*$/, "").split("|"), labels = [], first = null, k0 = null;
      parts.forEach(function (p, i) {
        var m = /^([A-Ga-g](?:#|♯|b|♭)?):\s*(.*)$/.exec(p.trim());
        if (m) { k = parseKey(m[1]); p = m[2]; }
        if (i === 0) { k0 = k; first = chordOf(k, p.trim()); if (!first) throw new Error("numeral " + p); }
        labels.push({ key: m ? k : null, rn: p.trim() });
      });
      out.push({ chord: first, labels: labels, chordKey: k0, key: k, pivot: parts.length > 1, bar: end });
    });
    return out;
  }
  function sameKey(a, b) { return a && b && a.l === b.l && a.a === b.a && a.minor === b.minor; }

  // ---- voicing: bass (around C3) + three upper voices (around C5), each chord's upper voices as close to the last ones as can be
  function midiOf(n, o) { return 12 * (o + 1) + NAT[n.l] + n.a; }
  function voice(prog) {
    var prevUp = null, prevBass = null;
    return prog.map(function (st) {
      var c = st.chord, ns = c.notes, b = ns[c.inv], up = ns.slice();
      if (ns.length === 4) up = ns.filter(function (n, i) { return c.inv ? i !== c.inv : i !== 2; });   // a seventh chord: the bass note (or, in root position, the 5th) left out above
      // bass: the octave nearest the last bass, within E2–D♯3 at first
      var bo = [1, 2, 3].map(function (o) { return { n: b, o: o, m: midiOf(b, o) }; }).filter(function (x) { return x.m >= 38 && x.m <= 55; });
      var bass = bo.reduce(function (best, x) { var d = Math.abs(x.m - (prevBass ? prevBass.m : 47)); return !best || d < best.d ? { n: x.n, o: x.o, m: x.m, d: d } : best; }, null);
      // upper: every ordering of the three tones stacked upward within an octave, the lowest from G3 to G4
      var best = null;
      perms(up).forEach(function (ord) {
        for (var o = 3; o <= 5; o++) {
          var v = [], m0 = midiOf(ord[0], o), ok = true, last = m0;
          v.push({ n: ord[0], o: o, m: m0 });
          for (var i = 1; i < 3; i++) { var n = ord[i], oo = o, mm = midiOf(n, oo); while (mm <= last) { oo++; mm = midiOf(n, oo); } v.push({ n: n, o: oo, m: mm }); last = mm; }
          if (m0 < 55 || last > 79 || last - m0 > 12) ok = false;
          if (!ok || m0 <= bass.m) continue;
          var cost = prevUp ? v.reduce(function (s, x, i) { return s + Math.abs(x.m - prevUp[i].m); }, 0) : Math.abs(v[2].m - 72);
          if (!best || cost < best.cost) best = { v: v, cost: cost };
        }
      });
      prevUp = best.v; prevBass = bass;
      return { bass: bass, up: best.v };
    });
  }
  function perms(a) { if (a.length <= 1) return [a]; var out = []; a.forEach(function (x, i) { perms(a.slice(0, i).concat(a.slice(i + 1))).forEach(function (p) { out.push([x].concat(p)); }); }); return out; }

  // ---- ABC: two staves, a whole bar per chord (half notes with opts.half), the numerals under the bass (a pivot: both readings,
  // the first key's above the new one), [K:] at each change of key
  function abcNote(x, st, sm) {
    var n = x.n, cur = n.l + ":" + x.o in st ? st[n.l + ":" + x.o] : sm[n.l], s = (n.a !== cur ? ACC_ABC[n.a] : "") + (x.o >= 5 ? LET[n.l].toLowerCase() : LET[n.l]);
    st[n.l + ":" + x.o] = n.a;
    for (var i = 5; i < x.o; i++) s += "'"; for (var j = 4; j > x.o; j--) s += ",";
    return s;
  }
  function pretty(rn) { return rn.replace(/65/, "⁶₅").replace(/43/, "⁴₃").replace(/42/, "⁴₂").replace(/64/, "⁶₄").replace(/6/, "⁶").replace(/7/, "⁷"); }
  function labelText(l, showKey) { return (showKey && l.key ? keyLabel(l.key) + ": " : "") + pretty(l.rn); }
  function toAbc(prog, home, opts) {
    opts = opts || {};
    var vs = voice(prog), up = [], lo = [], cur = home, len = opts.len || 4, perBar = opts.perBar || 1, stU = {}, stL = {}, inBar = 0;
    function setKey(k) { if (sameKey(k, cur)) return; cur = k; up.push("[K:" + keyAbc(k) + " clef=treble]"); lo.push("[K:" + keyAbc(k) + " clef=bass]"); /* an inline K: without a clef resets it to treble */ stU = {}; stL = {}; }
    prog.forEach(function (st, i) {
      setKey(st.chordKey);
      var sm = sigMap(cur), shown = i === 0 || st.pivot || !sameKey(st.chordKey, prog[i - 1].key);
      var ann = opts.hide ? "" : st.labels.map(function (l, j) { var kk = j === 0 ? st.chordKey : l.key; return '"_' + (shown && kk ? keyLabel(kk) + ": " : "") + pretty(l.rn) + '"'; }).join("");
      var v = vs[i];
      up.push("[" + v.up.map(function (x) { return abcNote(x, stU, sm); }).join("") + "]" + len);
      lo.push(ann + abcNote(v.bass, stL, sm) + len);
      inBar++;
      var end = i === prog.length - 1;
      if (inBar >= perBar || st.bar || end) { var bl = end ? "|]" : st.bar ? "||" : "|"; up.push(bl); lo.push(bl); stU = {}; stL = {}; inBar = 0; }
      if (!end) setKey(st.key);
    });
    return "X:1\nM:" + (perBar * len) + "/4\nL:1/4\nQ:1/4=" + (opts.qpm || 96) + "\n%%score {RH LH}\nV:RH clef=treble\nV:LH clef=bass\nK:" + keyAbc(home) + "\n" + lines(up, lo);
  }
  // abcjs carries an inline [K:] in one voice's line into the next voice's line, so the voices are written in chunks that each
  // start at a change of key, the key change at the head of both
  function lines(up, lo) {
    var out = "", a = 0;
    for (var i = 0; i <= up.length; i++) if (i === up.length || (i > a && /^\[K:/.test(up[i]))) { out += "[V:RH] " + up.slice(a, i).join(" ") + "\n[V:LH] " + lo.slice(a, i).join(" ") + "\n"; a = i; }
    return out;
  }

  // ---- drawing and playing
  var scriptsReady = null;
  function draw(box, abc, w) {
    box.innerHTML = "";
    var paper = el("div", "mod-paper"); box.appendChild(paper);
    var width = Math.max(260, Math.min(w || box.clientWidth || 600, 900) - 30);
    var v = global.ABCJS.renderAbc(paper, abc, { staffwidth: width, add_classes: true, paddingleft: 0, paddingright: 0, wrap: { minSpacing: 1.6, maxSpacing: 2.6, preferredMeasuresPerLine: 6 } })[0];
    stack(paper);
    return v;
  }
  // figures written as ⁶₅ stacked (as on Analysed Scores)
  function stack(paper) {
    var SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹", SUB = "₀₁₂₃₄₅₆₇₈₉", NS = "http://www.w3.org/2000/svg";
    paper.querySelectorAll("text.abcjs-annotation").forEach(function (t) {
      var s = t.textContent, m = /^(.*?)([⁰-⁹¹²³]+)([₀-₉]+)(.*)$/.exec(s); if (!m) return;
      var ts = t.querySelector("tspan"), x = ts ? ts.getAttribute("x") : t.getAttribute("x");
      while (t.firstChild) t.removeChild(t.firstChild);
      var dg = function (str, set) { return str.split("").map(function (c) { var i = set.indexOf(c); return i >= 0 ? String(i) : c; }).join(""); };
      var a = document.createElementNS(NS, "tspan"); a.setAttribute("x", x); a.textContent = m[1]; t.appendChild(a);
      var u = document.createElementNS(NS, "tspan"); u.setAttribute("font-size", "70%"); u.setAttribute("dy", "-0.42em"); u.textContent = dg(m[2], SUP); t.appendChild(u);
      var d = document.createElementNS(NS, "tspan"); d.setAttribute("font-size", "70%"); d.setAttribute("dy", "0.9em"); d.textContent = dg(m[3], SUB); t.appendChild(d);
      d.setAttribute("dx", (-u.getComputedTextLength()).toFixed(2));
      if (m[4]) { var r = document.createElementNS(NS, "tspan"); r.setAttribute("dy", "-0.336em"); r.textContent = m[4]; t.appendChild(r); }
    });
  }
  var playingBtn = null;
  function playBtn(getV, label) {
    var b = el("button", "btn btn-sm btn-outline-secondary mod-play", label || "▶ Play"); b.type = "button";
    b.addEventListener("click", function () {
      if (playingBtn === b) { global.AbcPlay.stop(); return; }
      if (playingBtn) global.AbcPlay.stop();
      var v = getV(); if (!v) return;
      playingBtn = b; b.textContent = "■ Stop";
      global.AbcPlay.play(v, { sound: "piano", onEnd: function () { if (playingBtn === b) playingBtn = null; b.textContent = label || "▶ Play"; } });
    });
    return b;
  }

  // ---- the kinds of modulation (22.4–22.7), each written from a home key. Steps as for progression(); "||" after a step ends a phrase.
  var EXAMPLES = {
    tonicize: { home: "C", name: "Tonicization", steps: ["C: I", "ii6", "V65/V", "V", "vi", "IV", "V7", "I"],
      note: "V⁶₅/V points at G for a moment, but the next phrase stays in C: G is tonicized, not reached. No cadence confirms it." },
    diatonic: { home: "C", name: "Diatonic pivot chord", steps: ["C: I", "IV", "vi|G: ii", "G: V7", "I"],
      note: "The A minor chord is vi in C and ii in G: tonic prolongation in the old key, pre-dominant in the new one. G is confirmed by V⁷–I." },
    secondary: { home: "C", name: "Chromatic pivot: secondary common chord", steps: ["C: I", "V7/ii|F: V7/vi", "F: vi", "ii6", "V7", "I"],
      note: "A⁷ is V⁷/ii in C and V⁷/vi in F: a secondary chord in both keys." },
    borrowed: { home: "C", name: "Chromatic pivot: borrowed common chord", steps: ["C: I", "IV", "iv|Ab: vi", "Ab: ii6", "V7", "I"],
      note: "F minor is iv borrowed from C minor, and vi in A♭ major: borrowed in one key, diatonic in the other. A♭ is far from C (four flats away)." },
    neapolitan: { home: "C", name: "Chromatic pivot: Neapolitan common chord", steps: ["C: I", "vi", "N6|f: VI6", "f: iv", "V7", "i"],
      note: "D♭ major is the Neapolitan in C and VI in F minor, so it bridges two keys four flats apart." },
    direct: { home: "C", name: "Direct (phrase) modulation", steps: ["C: I", "IV", "V", "I||", "Eb: I", "IV", "V7", "I"],
      note: "No pivot: one phrase ends in C, and the next simply starts in E♭." },
    commontone: { home: "C", name: "Common-tone modulation", steps: ["C: I", "IV", "V7", "I", "E: I", "IV", "V7", "I"],
      note: "C major and E major share one note, E. It is held in the same voice while everything else moves, and it carries the music into the new key. The keys are chromatic mediants: roots a third apart, same quality, one common tone." },
    sequential: { home: "C", name: "Sequential modulation", steps: ["C: I", "IV", "V", "I", "d: i", "iv", "V", "i", "e: i", "iv", "V", "i"],
      note: "The same progression is repeated a step higher each time: C, then D minor, then E minor." }
  };
  var ORDER = ["diatonic", "secondary", "borrowed", "neapolitan", "direct", "commontone", "sequential"];
  // an example moved to another home key (every key moved by the same interval, spelled by letter steps)
  function transposeSteps(steps, from, to) {
    var dl = mod(to.l - from.l, 7), ds = mod(keyPc(to) - keyPc(from), 12);
    return steps.map(function (st) {
      return st.replace(/([A-Ga-g](?:#|♯|b|♭)?):/g, function (_, ks) { var k = parseKey(ks), n = above({ l: k.l, a: k.a, minor: false }, dl, ds); return keyLabel({ l: n.l, a: n.a, minor: k.minor }).replace("♯", "#").replace("♭", "b") + ":"; });
    });
  }
  function exampleFits(steps, home) {   // no key beyond 6 sharps / flats, no double sharps or flats
    try {
      var p = progression(steps, home);
      return p.every(function (st) { return st.labels.every(function (l) { return !l.key || Math.abs(sig(l.key)) <= 6; }) && st.chord.notes.every(function (n) { return Math.abs(n.a) < 2; }); });
    } catch (e) { return false; }
  }

  // ================= widgets
  var KEYS_MAJ = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"], KEYS_MIN = ["a", "e", "b", "f#", "c#", "g#", "eb", "bb", "f", "c", "g", "d"];
  function keySelect(val) {
    var s = el("select", "form-select form-select-sm mod-key");
    [["Major", KEYS_MAJ], ["Minor", KEYS_MIN]].forEach(function (g) {
      var og = document.createElement("optgroup"); og.label = g[0];
      g[1].forEach(function (k) { var o = el("option", null, keyLong(parseKey(k))); o.value = k; og.appendChild(o); });
      s.appendChild(og);
    });
    s.value = val; return s;
  }

  // closely related keys: the home key, its relative, and the keys one sharp or flat either side with their relatives
  function related(home) {
    var s = sig(home), out = [];
    [[s, home.minor, "home key"], [s, !home.minor, home.minor ? "relative major" : "relative minor"],
     [s + 1, home.minor, home.minor ? "minor v" : "dominant (V)"], [s + 1, !home.minor, home.minor ? "VII" : "iii"],
     [s - 1, home.minor, home.minor ? "subdominant (iv)" : "subdominant (IV)"], [s - 1, !home.minor, home.minor ? "VI" : "ii"]].forEach(function (x) {
      out.push({ key: keyFromSig(x[0], x[1]), role: x[2], sig: x[0] });
    });
    return out;
  }
  function relatedWidget(host) {
    var row = el("div", "mod-row"), sel = keySelect(host.getAttribute("data-key") || "C"), grid = el("div", "mod-rel"), stage = el("div", "mod-stage"), cap = el("p", "mod-cap");
    row.appendChild(el("label", null, "Home key ")); row.appendChild(sel);
    host.appendChild(row); host.appendChild(grid); host.appendChild(cap); host.appendChild(stage);
    var v = null;
    function show(target) {
      var home = parseKey(sel.value), steps;
      if (sameKey(target, home)) steps = [keyLabel(home) + ": " + (home.minor ? "i" : "I"), home.minor ? "iv" : "IV", "V7", home.minor ? "i" : "I"];
      else steps = pivotSteps(home, target);
      var p = progression(steps, home);
      v = draw(stage, toAbc(p, home), host.clientWidth);
      stage.insertBefore(playBtn(function () { return v; }), stage.firstChild);
      cap.textContent = sameKey(target, home) ? "The home key." : "From " + keyLong(home) + " to " + keyLong(target) + (pivotOf(home, target) ? ", through a common chord (bracketed numerals: one chord, two readings)." : ", directly (no common chord).");
    }
    function build() {
      grid.innerHTML = ""; var home = parseKey(sel.value);
      related(home).forEach(function (r) {
        var b = el("button", "mod-relkey" + (r.role === "home key" ? " mod-home" : ""));
        b.type = "button";
        b.appendChild(el("b", null, keyLong(r.key))); b.appendChild(el("span", null, r.role)); b.appendChild(el("small", null, sigText(r.key)));
        b.addEventListener("click", function () { grid.querySelectorAll(".mod-on").forEach(function (x) { x.classList.remove("mod-on"); }); b.classList.add("mod-on"); show(r.key); });
        grid.appendChild(b);
      });
      stage.innerHTML = ""; cap.textContent = "Click a key to see and hear a modulation to it from the home key.";
    }
    sel.addEventListener("change", build); build();
  }
  // the best pivot from home to target: pre-dominant in the new key, not dominant there; tonic-family in the old key if possible
  function pivotOf(home, target) {
    var cs = common(home, target).filter(function (c) { return func(c.b) !== "D" && !/^(I|i)$/.test(c.a); });
    var score = function (c) { return (func(c.b) === "PD" ? 4 : func(c.b) === "TP" ? 2 : 0) + (/^(T|TP)$/.test(func(c.a)) ? 2 : func(c.a) === "PD" ? 1 : 0) + (/^(I|i)$/.test(c.b) ? -3 : 0); };
    cs.sort(function (x, y) { return score(y) - score(x); });
    return cs[0] || null;
  }
  function pivotSteps(home, target, pv) {
    var hk = keyLabel(home), tk = keyLabel(target), I = home.minor ? "i" : "I", tI = target.minor ? "i" : "I";
    pv = pv || pivotOf(home, target);
    var cad = [tk + ": " + (target.minor ? "i64" : "I64"), "V7", tI];
    if (!pv) return [hk + ": " + I, home.minor ? "iv" : "IV", "V7", I + "||", tk + ": " + tI, target.minor ? "iv" : "IV"].concat(["V7", tI]);
    var pre = func(pv.b) === "PD" ? [] : [tk + ": " + (target.minor ? "iv" : "IV")];
    var steps = [hk + ": " + I, pv.a + "|" + tk + ": " + pv.b];
    if (pre.length) { steps.push(pre[0]); cad[0] = target.minor ? "i64" : "I64"; }
    return steps.concat(cad);
  }

  function pivotWidget(host) {
    var row = el("div", "mod-row"), a = keySelect(host.getAttribute("data-from") || "C"), b = keySelect(host.getAttribute("data-to") || "G");
    row.appendChild(el("label", null, "From ")); row.appendChild(a); row.appendChild(el("label", null, " to ")); row.appendChild(b);
    var tbl = el("div", "mod-table-wrap"), cap = el("p", "mod-cap"), stage = el("div", "mod-stage");
    host.appendChild(row); host.appendChild(tbl); host.appendChild(cap); host.appendChild(stage);
    var v = null;
    function hear(home, target, c) {
      var p = progression(pivotSteps(home, target, c), home);
      v = draw(stage, toAbc(p, home), host.clientWidth);
      stage.insertBefore(playBtn(function () { return v; }), stage.firstChild);
      var fa = func(c.a), fb = func(c.b);
      cap.innerHTML = "";
      cap.appendChild(document.createTextNode(c.name + " is " + c.a + " in " + keyLong(home) + (fa ? " (" + FUNC_NAME[fa] + ")" : "") + " and " + c.b + " in " + keyLong(target) + (fb ? " (" + FUNC_NAME[fb] + ")" : "") + ". "));
      var w = el("span", fb === "D" ? "mod-warn" : fb === "PD" ? "mod-good" : "");
      w.textContent = fb === "D" ? "It is dominant in the new key, which the book says composers usually avoid as a pivot: the change sounds abrupt." :
        fb === "PD" ? "Pre-dominant in the new key: the smoothest kind of pivot." : (/^(I|i)$/.test(c.b) ? "It is already the new tonic, so the new key is stated before it is prepared." : "");
      cap.appendChild(w);
    }
    function build() {
      var home = parseKey(a.value), target = parseKey(b.value), ta = triads(home), tb = triads(target), cs = common(home, target);
      tbl.innerHTML = ""; stage.innerHTML = "";
      var t = el("table", "table table-sm mod-table"), th = el("thead"), hr = el("tr");
      ["Chord", "In " + keyLong(home), "In " + keyLong(target), ""].forEach(function (h) { hr.appendChild(el("th", null, h)); });
      th.appendChild(hr); t.appendChild(th);
      var tb2 = el("tbody"), names = {};
      ta.forEach(function (x) { names[x.name] = names[x.name] || { name: x.name, a: x.rn, chord: x.chord }; });
      tb.forEach(function (y) { if (names[y.name]) names[y.name].b = y.rn; else names[y.name] = { name: y.name, b: y.rn, chord: y.chord }; });
      // in order of the root's letter from the home tonic
      var list = Object.keys(names).map(function (n) { return names[n]; }).sort(function (x, y) { return mod(x.chord.notes[0].l - home.l, 7) - mod(y.chord.notes[0].l - home.l, 7) || x.name.localeCompare(y.name); });
      list.forEach(function (c) {
        var tr = el("tr", c.a && c.b ? "mod-common" : ""), both = c.a && c.b;
        tr.appendChild(el("td", null, c.name));
        tr.appendChild(el("td", null, c.a ? c.a + (func(c.a) ? "  · " + func(c.a) : "") : "—"));
        tr.appendChild(el("td", null, c.b ? c.b + (func(c.b) ? "  · " + func(c.b) : "") : "—"));
        var td = el("td"); if (both) { var bt = el("button", "btn btn-sm btn-outline-primary", "Pivot ▶"); bt.type = "button";
          bt.addEventListener("click", function () { t.querySelectorAll("tr.mod-on").forEach(function (r) { r.classList.remove("mod-on"); }); tr.classList.add("mod-on"); hear(home, target, c); }); td.appendChild(bt); }
        tr.appendChild(td); tb2.appendChild(tr);
      });
      t.appendChild(tb2); tbl.appendChild(t);
      var nk = Math.abs(sig(home) - sig(target)) + (home.minor !== target.minor ? 0 : 0);
      cap.textContent = sameKey(home, target) ? "Pick two different keys." : cs.length ? cs.length + " common chord" + (cs.length > 1 ? "s" : "") + " (highlighted). Click Pivot ▶ to hear a modulation through one. T tonic, TP tonic prolongation, PD pre-dominant, D dominant." :
        "No common chords: these keys are too far apart (" + sigText(home) + " against " + sigText(target) + ") for a diatonic pivot. Try a chromatic pivot or a modulation without one.";
    }
    a.addEventListener("change", build); b.addEventListener("change", build); build();
  }

  function exampleWidget(host) {
    var ex = EXAMPLES[host.getAttribute("data-kind")]; if (!ex) return;
    var home = parseKey(host.getAttribute("data-key") || ex.home), steps = home && !sameKey(home, parseKey(ex.home)) ? transposeSteps(ex.steps, parseKey(ex.home), home) : ex.steps;
    var stage = el("div", "mod-stage"), cap = el("p", "mod-cap", ex.note), v = null;
    host.appendChild(stage); host.appendChild(cap);
    var drawIt = function () { v = draw(stage, toAbc(progression(steps, home || parseKey(ex.home)), home || parseKey(ex.home), { perBar: 2, len: 2, qpm: 84 }), host.clientWidth); stage.insertBefore(playBtn(function () { return v; }), stage.firstChild); };
    drawIt();
    var lastW = host.clientWidth; window.addEventListener("resize", function () { if (Math.abs(host.clientWidth - lastW) > 40 && host.offsetParent) { lastW = host.clientWidth; drawIt(); } });
  }

  // which kind? an example in a random key, numerals hidden; the answer shows them
  function quizWidget(host) {
    var head = el("div", "mod-row"), next = el("button", "btn btn-sm btn-primary", "New example"), score = el("span", "mod-score");
    next.type = "button"; head.appendChild(next); head.appendChild(score);
    var stage = el("div", "mod-stage"), choices = el("div", "mod-choices"), fb = el("p", "mod-cap");
    host.appendChild(head); host.appendChild(stage); host.appendChild(choices); host.appendChild(fb);
    var right = 0, tries = 0, cur = null, v = null;
    var NAMES = { diatonic: "Diatonic pivot", secondary: "Secondary common chord", borrowed: "Borrowed common chord", neapolitan: "Neapolitan common chord", direct: "Direct", commontone: "Common-tone", sequential: "Sequential" };
    function render(hide) {
      v = draw(stage, toAbc(progression(cur.steps, cur.home), cur.home, { perBar: 2, len: 2, qpm: 84, hide: hide }), host.clientWidth);
      stage.insertBefore(playBtn(function () { return v; }), stage.firstChild);
    }
    function ask() {
      var kind, home, steps;
      for (var t = 0; t < 50; t++) {
        kind = ORDER[Math.floor(Math.random() * ORDER.length)];
        var ex = EXAMPLES[kind], pool = (parseKey(ex.home).minor ? KEYS_MIN : KEYS_MAJ);
        home = parseKey(pool[Math.floor(Math.random() * pool.length)]);
        steps = transposeSteps(ex.steps, parseKey(ex.home), home);
        if (exampleFits(steps, home)) break;
      }
      cur = { kind: kind, home: home, steps: steps, done: false };
      render(true); fb.textContent = "Listen and look (the key signature changes are a clue). Which kind of modulation is it?"; fb.className = "mod-cap";
      choices.innerHTML = "";
      ORDER.forEach(function (k) {
        var b = el("button", "btn btn-sm btn-outline-secondary", NAMES[k]); b.type = "button";
        b.addEventListener("click", function () {
          if (cur.done) return; cur.done = true; tries++;
          var ok = k === cur.kind; if (ok) right++;
          b.classList.add(ok ? "btn-success" : "btn-danger");
          if (!ok) [].forEach.call(choices.children, function (x) { if (x.textContent === NAMES[cur.kind]) x.classList.add("btn-success"); });
          render(false);
          fb.textContent = (ok ? "Yes. " : "It was: " + NAMES[cur.kind] + ". ") + EXAMPLES[cur.kind].name + " (the notes under the staff now show the keys). On the page's own example, in C: " + EXAMPLES[cur.kind].note;
          fb.className = "mod-cap " + (ok ? "mod-good" : "mod-warn");
          score.textContent = right + " / " + tries;
        });
        choices.appendChild(b);
      });
    }
    next.addEventListener("click", ask); ask();
  }

  function init() {
    if (!global.ABCJS) return;
    [].forEach.call(document.querySelectorAll(".mod-related"), relatedWidget);
    [].forEach.call(document.querySelectorAll(".mod-pivot"), pivotWidget);
    [].forEach.call(document.querySelectorAll(".mod-ex"), exampleWidget);
    [].forEach.call(document.querySelectorAll(".mod-quiz"), quizWidget);
  }
  if (typeof document !== "undefined") { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init(); }
  global.Modulation = { parseKey: parseKey, chordOf: chordOf, chordName: chordName, triads: triads, common: common, progression: progression, toAbc: toAbc,
    voice: voice, related: related, pivotOf: pivotOf, pivotSteps: pivotSteps, EXAMPLES: EXAMPLES, transposeSteps: transposeSteps, exampleFits: exampleFits, keyLong: keyLong, sig: sig };
})(typeof window !== "undefined" ? window : globalThis);
