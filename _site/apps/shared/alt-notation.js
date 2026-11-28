// alt-notation.js — draw any single-line ABC tune in another notation: Hindustani (Bhatkhande-style sargam in a tāl grid),
// Carnatic (swara letters against a tāḷa) or jianpu (Chinese numbered notation). One global, AltNotation; loads in Node.
// Needs AbcCore (abc-core.js) loaded first.
//
//   AltNotation.read(abc)                     -> { notes:[{ midi|null, start, dur }] (in beats), beat, barBeats, pickup,
//                                                  tonic (pitch class of the key's home note), doPc (jianpu "1"), minor }
//   AltNotation.render(host, abc, opts)       draws into host; opts { system: "hindustani"|"carnatic"|"jianpu",
//                                                  tala: id from AltNotation.TALAS[system], sa: pitch class 0-11 (default tonic) }
//   AltNotation.grid(read, k)                 beats split into k slots: [[{ midi, hold }]] (internal, exported for tests)
//   AltNotation.swara(semis, system)          "S" "r" "Ṁ"… for semitones from Sa (internal, exported for tests)
//   AltNotation.TALAS                         { hindustani: [...], carnatic: [...], jianpu: [] }
//
// A SIMPLE VERSION, on purpose (2026-11-27):
//   - The beat (mātrā / akṣara / jianpu beat) is the M: denominator: 4/4 = four, 6/8 = six. No compound-time beat.
//   - One melody line. Chords [CEG] keep the first note; grace notes, decorations, chord symbols and lyrics are dropped;
//     triplets (3 are read. Repeats are not unrolled.
//   - Ornaments (gamaka, mīnd, meend) cannot come from ABC, so none are drawn: say so to students.
//   - Sa = the tune's home note (minor tunes: Sa is the minor tonic, so Ga is komal). Jianpu 1 = do of the key signature
//     (minor tunes sit on 6), the usual way for Chinese minor-sounding tunes. The octave of Sa / 1 is chosen so most notes
//     are in the middle octave.
//   - Marks: Bhatkhande komal = line under, tivra Ma = M with a line over, tār saptak = dot above,
//     mandra = dot below; "–" holds a note, "·" is a rest. Notes sharing a mātrā sit over one curve.
//     Carnatic: s r g m p d n, dots for octaves, "," holds one slot, the svara variants (r1 r2 …) listed once under the line
//     since the rāga normally implies them; | ends each aṅga, || the cycle.
//     Jianpu: dots above / below for octave, one line under per halving of the beat, "–" an extra beat, ♯ ♭ before a number,
//     0 a rest, a repeated number under a tie when a note runs across a beat.
//   - Tāl / tāḷa shapes are the Rhythm Library's (Kippen, Clayton, Courtney; Nelson, Panyam: scripts/sources/rhythm-library.py).
//     Fitting a Western tune to a tāl is this page's illustration, not a practice of either tradition.
(function (global) {
  var Core = global.AbcCore || (typeof require !== "undefined" ? require("./abc-core.js") : null);

  var TALAS = {
    hindustani: [
      { id: "kaherva", name: "Kaharvā (8)", vib: [4, 4], marks: ["X", "0"] },
      { id: "tintal", name: "Tīntāl (16)", vib: [4, 4, 4, 4], marks: ["X", "2", "0", "3"] },
      { id: "dadra", name: "Dādrā (6)", vib: [3, 3], marks: ["X", "0"] },
      { id: "rupak", name: "Rūpak (7)", vib: [3, 2, 2], marks: ["0", "1", "2"] },
      { id: "jhaptal", name: "Jhaptāl (10)", vib: [2, 3, 2, 3], marks: ["X", "2", "0", "3"] }
    ],
    carnatic: [
      { id: "adi", name: "Ādi (4+2+2)", vib: [4, 2, 2] },
      { id: "rupaka", name: "Rūpaka, counted in 3", vib: [3] },
      { id: "misrachapu", name: "Miśra chāpu (3+2+2)", vib: [3, 2, 2] },
      { id: "khandachapu", name: "Khaṇḍa chāpu (2+3)", vib: [2, 3] }
    ],
    jianpu: []
  };

  var LETTER = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var MODE_SHIFT = { "": 0, maj: 0, major: 0, ion: 0, m: 9, min: 9, minor: 9, aeo: 9, dor: 2, phr: 4, lyd: 5, mix: 7, loc: 11 };

  function keyInfo(abc) {
    var k = Core.keyField(abc).trim(), m = /^([A-G])([#b]?)\s*([A-Za-z]*)/.exec(k);
    if (!m) return { tonic: 0, doPc: 0, minor: false };
    var tonic = (LETTER[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + 12) % 12;
    var mode = m[3].toLowerCase().slice(0, 3); if (m[3].toLowerCase() === "m") mode = "m";
    var sh = MODE_SHIFT[mode] != null ? MODE_SHIFT[mode] : 0;
    return { tonic: tonic, doPc: (tonic - sh + 12) % 12, minor: sh === 9 || sh === 2 || sh === 4 };
  }

  function read(abc) {
    var body = abc.split("\n").map(function (l) { return l.replace(/^\s*U:\s*\S+\s*=\s*\S+/, ""); })   // some tunes put music after a U: line
      .filter(function (l) { return !/^\s*([A-Za-z]:|%)/.test(l); }).join(" ");
    body = body.replace(/\{[^}]*\}/g, "")                       // grace notes
               .replace(/\[([^\]|:]*?)\]/g, function (all, inner) { var t = /[_^=]*[A-Ga-g][,']*[\d\/]*/.exec(inner); return t ? t[0] : ""; })
               .replace(/![^!]*!/g, "").replace(/\+[^+]*\+/g, "");
    var lq = Core.lUnitQuarters(abc, 0.5), me = Core.meter(abc), beatQ = 4 / me.d, toks = Core.tokens(body, {});
    var trip = [];                                               // token indices of "(3" starts
    body.replace(/\((\d)/g, function (a, n, at) { trip.push({ at: at, n: +n }); return a; });
    var ksig = Core.keyAccidentals(Core.keyField(abc)), macc = {}, notes = [], t = 0, tieNext = false, tripLeft = 0, tripMul = 1, ti = 0, bars = [];
    toks.forEach(function (tok, idx) {
      while (ti < trip.length && trip[ti].at < tok.i) { tripLeft = trip[ti].n; tripMul = trip[ti].n === 3 ? 2 / 3 : trip[ti].n === 2 ? 3 / 2 : (trip[ti].n - 1) / trip[ti].n; ti++; }
      if (tok.t === "bar") { if (tok.ch === "|") { macc = {}; if (!bars.length || bars[bars.length - 1] !== t) bars.push(t); } return; }
      if (tok.t === "tie") { tieNext = true; return; }
      if (tok.t === "broken") { var p = notes[notes.length - 1], nx = toks[idx + 1]; if (p && nx) { var f = tok.ch === ">" ? 1.5 : 0.5; var d = p.dur; p.dur = d * f; t += p.dur - d; nx._mul = 2 - f; } return; }
      if (tok.t !== "note" && tok.t !== "rest") return;
      var dur = tok.mult * lq / beatQ * (tok._mul || 1);
      if (tripLeft > 0) { dur *= tripMul; tripLeft--; }
      if (tok.t === "rest") { notes.push({ midi: null, start: t, dur: dur }); t += dur; tieNext = false; return; }
      var midi = Core.noteMidi(tok, ksig, macc), prev = notes[notes.length - 1];
      if (tieNext && prev && prev.midi === midi) prev.dur += dur; else notes.push({ midi: midi, start: t, dur: dur });
      t += dur; tieNext = false;
    });
    var barBeats = me.n, pickup = bars.length && bars[0] > 0 && bars[0] < barBeats - 1e-6 ? bars[0] : 0;
    var ki = keyInfo(abc);
    return { notes: notes, beat: beatQ, barBeats: barBeats, pickup: pickup, total: t, tonic: ki.tonic, doPc: ki.doPc, minor: ki.minor };
  }

  // The tune as beats of k slots each; offset = empty beats before the first note (so a pickup ends just before beat 1).
  function grid(r, k, offset) {
    offset = offset || 0;
    var nb = Math.ceil(offset + r.total - 1e-6), G = [];
    for (var b = 0; b < nb; b++) { var row = []; for (var s = 0; s < k; s++) row.push(b < offset ? { empty: true } : { hold: true, midi: null }); G.push(row); }
    var lastMidi = null;
    r.notes.forEach(function (n) {
      var a = Math.round((n.start + offset) * k), e = Math.round((n.start + n.dur + offset) * k);
      for (var x = a; x < e && x < nb * k; x++) G[Math.floor(x / k)][x % k] = x === a ? { midi: n.midi, rest: n.midi == null } : { hold: true, midi: n.midi, rest: n.midi == null };
    });
    return G;
  }
  // smallest slots-per-beat that places every note start (1, 2, 3, 4, 6, 8)
  function resolution(r) {
    var C = [1, 2, 3, 4, 6, 8];
    for (var i = 0; i < C.length; i++) {
      var k = C[i]; if (r.notes.every(function (n) { var x = n.start * k; return Math.abs(x - Math.round(x)) < 1e-4; })) return k;
    }
    return 8;
  }
  // one beat's slots reduced to the fewest that keep its rhythm: [x, hold, y, hold] -> [x, y]
  function reduce(cells) {
    var k = cells.length;
    for (var d = 1; d <= k; d++) {
      if (k % d) continue;
      var step = k / d, ok = true;
      for (var s = 0; s < k; s++) if (s % step && !cells[s].hold) { ok = false; break; }
      if (ok) return cells.filter(function (c, s) { return s % step === 0; });
    }
    return cells;
  }

  // ---- note names
  var HIN = ["S", "r", "R", "g", "G", "m", "M", "P", "d", "D", "n", "N"];          // lower case = komal; M = tivra Ma
  var CAR = ["s", "r", "r", "g", "g", "m", "m", "p", "d", "d", "n", "n"];
  var CARV = ["s", "r1", "r2", "g2", "g3", "m1", "m2", "p", "d1", "d2", "n2", "n3"];
  var JP = ["1", "♯1", "2", "♭3", "3", "4", "♯4", "5", "♭6", "6", "♭7", "7"];
  function swara(semis, system) {
    var pc = ((semis % 12) + 12) % 12, oct = Math.floor(semis / 12);
    var name = system === "carnatic" ? CAR[pc] : system === "jianpu" ? JP[pc] : HIN[pc];
    return { name: name, oct: oct, komal: system === "hindustani" && /[rgdn]/.test(name), tivra: system === "hindustani" && pc === 6, variant: CARV[pc] };
  }
  function homeMidi(r, pc) {   // the Sa / 1 whose octave holds the most notes
    var best = 60 + pc - 12, bestN = -1;
    for (var base = 36 + pc; base < 96; base += 12) {
      var n = r.notes.filter(function (x) { return x.midi != null && x.midi >= base && x.midi < base + 12; }).length;
      if (n > bestN) { bestN = n; best = base; }
    }
    return best;
  }

  // ---- drawing
  function el(t, c, x) { var e = (global.document).createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function noteEl(midi, sa, system) {
    var w = swara(midi - sa, system), s = el("span", "an-n" + (w.oct > 0 ? " up" : w.oct < 0 ? " dn" : "") + (Math.abs(w.oct) > 1 ? " two" : "") +
      (w.komal ? " komal" : "") + (w.tivra ? " tivra" : ""), w.tivra ? "M" : w.name);
    s.title = w.variant + (w.oct > 0 ? " (upper octave)" : w.oct < 0 ? " (lower octave)" : "");
    return s;
  }
  function legend(host, items) { var l = el("div", "an-legend"); items.forEach(function (t) { l.appendChild(el("span", null, t)); }); host.appendChild(l); }
  var PC = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];

  function cycles(G, len) { var out = []; for (var i = 0; i < G.length; i += len) out.push(G.slice(i, i + len)); return out; }
  function talaById(system, id) { var L = TALAS[system]; for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i]; return L[0]; }
  function defaultTala(system, barBeats) {
    if (system === "hindustani") return barBeats % 3 === 0 ? "dadra" : barBeats === 7 ? "rupak" : barBeats === 5 ? "jhaptal" : "kaherva";
    return barBeats % 3 === 0 ? "rupaka" : barBeats === 7 ? "misrachapu" : barBeats === 5 ? "khandachapu" : "adi";
  }
  function offsetFor(r, len) {   // empty beats so the first full bar starts on beat 1 of the cycle
    if (!r.pickup) return 0;
    return ((len - r.pickup) % len + len) % len;
  }

  function hindustani(host, r, sa, tala) {
    var len = tala.vib.reduce(function (a, b) { return a + b; }, 0), k = resolution(r), off = offsetFor(r, len), G = grid(r, k, off);
    var ends = [], acc = 0; tala.vib.forEach(function (v) { acc += v; ends.push(acc - 1); });
    var starts = [0]; tala.vib.slice(0, -1).forEach(function (v, i) { starts.push(starts[i] + v); });
    var widest = G.reduce(function (m, c) { return Math.max(m, reduce(c).length); }, 1);
    cycles(G, len).forEach(function (cyc) {
      var g = el("div", "an-sg"); g.style.gridTemplateColumns = "repeat(" + len + ", minmax(" + Math.max(2.4, widest * .95 + .4) + "rem, 1fr))";
      for (var b = 0; b < len; b++) {
        var c = el("div", "b" + (ends.indexOf(b) >= 0 ? " v" : "")), cells = cyc[b] ? reduce(cyc[b]) : [{ empty: true }];
        var box = cells.length > 1 ? el("span", "grp") : c;
        cells.forEach(function (x) {
          if (x.empty) return;
          if (x.hold) box.appendChild(el("span", "an-h", x.rest ? "·" : "–"));
          else if (x.rest) box.appendChild(el("span", "an-h", "·"));
          else box.appendChild(noteEl(x.midi, sa, "hindustani"));
        });
        if (box !== c) c.appendChild(box);
        g.appendChild(c);
      }
      for (b = 0; b < len; b++) { var si = starts.indexOf(b); g.appendChild(el("div", "t" + (ends.indexOf(b) >= 0 ? " v" : ""), si >= 0 ? tala.marks[si] : "")); }
      host.appendChild(g);
    });
    legend(host, ["S R G m P D N = Sa Re Ga Ma Pa Dha Ni", "line under (r g d n): komal", "line over M: tīvra Ma", "dot above / below: upper / lower octave",
      "curve under: notes sharing one mātrā", "– : hold   · : rest", "X sam, 0 khālī, numbers tālī", "Sa = " + PC[sa % 12]]);
  }

  function carnatic(host, r, sa, tala) {
    var len = tala.vib.reduce(function (a, b) { return a + b; }, 0), k = Math.max(2, resolution(r)), off = offsetFor(r, len), G = grid(r, k, off);
    var ends = [], acc = 0; tala.vib.forEach(function (v) { acc += v; ends.push(acc - 1); });
    var used = {};
    cycles(G, len).forEach(function (cyc) {
      var row = el("div", "an-cn");
      cyc.forEach(function (cells, b) {
        var beat = el("span", "an-cb");
        cells.forEach(function (x) {
          if (x.empty) beat.appendChild(el("span", "an-h", " "));
          else if (x.hold || x.rest) beat.appendChild(el("span", "an-h", x.rest && !x.hold ? "–" : ","));
          else { beat.appendChild(noteEl(x.midi, sa, "carnatic")); used[((x.midi - sa) % 12 + 12) % 12] = 1; }
        });
        row.appendChild(beat);
        if (ends.indexOf(b) >= 0) beat.appendChild(el("span", "an-bar", b === len - 1 ? "||" : "|"));   // kept with its beat when the line wraps
      });
      host.appendChild(row);
    });
    var vs = Object.keys(used).map(Number).sort(function (a, b) { return a - b; }).map(function (p) { return CARV[p]; });
    legend(host, ["svaras used: " + vs.join(" "), "s r g m p d n = sa ri ga ma pa dha ni", "dot above / below: upper / lower octave",
      ", : hold one slot (" + k + " slots a beat)   – : rest", "| ends each part of the tāḷa, || the cycle", "Sa = " + PC[sa % 12]]);
  }

  function jianpu(host, r, one) {
    var k = resolution(r), off = r.pickup ? ((r.barBeats - r.pickup) % r.barBeats) : 0, G = grid(r, k, off);
    var line = el("div", "an-jp"), prevMidi = null;
    line.appendChild(el("span", "an-jp-key", "1 = " + PC[one % 12] + "  " + r.barBeats + "/" + Math.round(4 / r.beat)));
    G.forEach(function (cells, b) {
      if (b && b % r.barBeats === 0) line.appendChild(el("span", "an-jp-bar"));
      cells = reduce(cells);
      if (cells.length === 1 && cells[0].empty) return;
      if (cells.length === 1 && cells[0].hold && !cells[0].rest) { line.appendChild(el("span", "an-n", "–")); return; }
      // runs inside the beat: [{ x, slots }]
      var runs = [];
      cells.forEach(function (x) { if (x.hold && runs.length) runs[runs.length - 1].n++; else runs.push({ x: x, n: 1 }); });
      var beat = el("span", "an-jp-beat"), n = cells.length;
      runs.forEach(function (ru) {
        var frac = ru.n / n, lines = frac >= 1 ? 0 : frac >= .5 ? 1 : frac >= .25 ? 2 : 3, dotted = Math.abs(frac - .75) < 1e-6 || Math.abs(frac - .375) < 1e-6;
        var x = ru.x, s;
        if (x.empty) s = el("span", "an-n", " ");
        else if (x.rest) s = el("span", "an-n", "0");
        else if (x.hold) { s = noteEl(x.midi, one, "jianpu"); s.classList.add("tie"); }
        else s = noteEl(x.midi, one, "jianpu");
        var wrap = el("span", "an-jp-u l" + lines); wrap.appendChild(s); if (dotted) wrap.appendChild(el("span", "an-n", "·"));
        beat.appendChild(wrap);
      });
      if (n === 3 || n === 6) beat.classList.add("trip");
      line.appendChild(beat);
    });
    line.appendChild(el("span", "an-jp-bar end"));
    host.appendChild(line);
    legend(host, ["1 2 3 4 5 6 7 = do re mi fa sol la ti", "dot above / below: upper / lower octave", "line under: half a beat (two: a quarter)",
      "– : one more beat   0 : rest   · after: dotted", "arc over: tied from the beat before", "♯ ♭ before a number: raised / lowered", "1 = " + PC[one % 12] + (r.minor ? " (minor: the home note is 6)" : "")]);
  }

  var CSS = ".an-out{overflow-x:auto}.an-n{position:relative;display:inline-block;min-width:1.1em;text-align:center;padding:.35em 0 .3em}" +
    ".an-n.up::before,.an-n.dn::after{content:'';position:absolute;left:50%;width:.22em;height:.22em;margin-left:-.11em;border-radius:50%;background:currentColor}" +
    ".an-n.up::before{top:.05em}.an-n.dn::after{bottom:0}.an-n.up.two::before{box-shadow:0 -.3em 0 currentColor}.an-n.dn.two::after{box-shadow:0 .3em 0 currentColor}" +
    ".an-n.komal{text-decoration:underline;text-underline-offset:.15em}.an-n.tivra{text-decoration:overline}.an-n.tie{border-top:1.5px solid currentColor;border-radius:50% 50% 0 0/.5em .5em 0 0}" +
    ".an-h{display:inline-block;min-width:1.1em;text-align:center;color:var(--site-ink-2,#777)}" +
    ".an-sg{display:grid;font-size:1.2rem;text-align:center;margin:.3rem 0 .9rem;max-width:100%}.an-sg .b{border-right:1px solid var(--site-border,#ccc);padding:.3rem 0;white-space:nowrap}" +
    ".an-sg .b.v{border-right:3px solid var(--site-ink,#222)}.an-sg .t{font-size:.8rem;color:var(--site-ink-2,#777);border-right:1px solid transparent}.an-sg .t.v{border-right:3px solid transparent}" +
    ".an-sg .grp .an-n,.an-sg .grp .an-h{min-width:.75em}.an-sg .grp{display:inline-block;border-bottom:2px solid currentColor;border-radius:0 0 .7em .7em;padding:0 .15em}" +
    ".an-cn{font-family:var(--font-mono,monospace);font-size:1.2rem;display:flex;flex-wrap:wrap;row-gap:.2rem;padding:.25rem 0}.an-cb{margin-right:.55em;white-space:nowrap}.an-cn .an-n,.an-cn .an-h{min-width:.75em}.an-bar{color:var(--site-accent-dk,#1f8f84);font-weight:700;margin-left:.55em}" +
    ".an-jp{display:flex;flex-wrap:wrap;align-items:flex-end;font-family:var(--font-mono,monospace);font-size:1.4rem;row-gap:.8rem;padding:.6rem 0}" +
    ".an-jp-key{font-size:.95rem;margin-right:1rem;align-self:center}.an-jp-beat{display:inline-flex;margin:0 .2em;position:relative}" +
    ".an-jp-beat.trip::before{content:'3';position:absolute;top:-.7em;left:50%;font-size:.6em;margin-left:-.3em}" +
    ".an-jp-u{display:inline-flex;padding-bottom:5px}.an-jp-u.l1{border-bottom:2px solid currentColor}.an-jp-u.l2{border-bottom:6px double currentColor}" +
    ".an-jp-u.l3{border-bottom:6px double currentColor;box-shadow:0 4px 0 -2px currentColor}" +
    ".an-jp-bar{display:inline-block;width:2px;height:1.5em;background:currentColor;margin:0 .45em}.an-jp-bar.end{box-shadow:5px 0 0 currentColor}" +
    ".an-legend{font-size:.85rem;color:var(--site-ink-2,#777);display:flex;flex-wrap:wrap;gap:.25rem 1.1rem;margin-top:.4rem}";
  function style() {
    if (global.document.getElementById("an-css")) return;
    var s = el("style"); s.id = "an-css"; s.textContent = CSS; global.document.head.appendChild(s);
  }

  function render(host, abc, opts) {
    opts = opts || {}; style();
    var r = read(abc), system = opts.system || "hindustani";
    host.innerHTML = ""; var out = el("div", "an-out"); host.appendChild(out);
    if (!r.notes.some(function (n) { return n.midi != null; })) { out.textContent = "No notes found."; return r; }
    if (system === "jianpu") { jianpu(out, r, homeMidi(r, opts.sa != null ? opts.sa : r.doPc)); return r; }
    var sa = homeMidi(r, opts.sa != null ? opts.sa : r.tonic), tala = talaById(system, opts.tala || defaultTala(system, r.barBeats));
    if (system === "carnatic") carnatic(out, r, sa, tala); else hindustani(out, r, sa, tala);
    r.tala = tala.id; return r;
  }

  var api = { read: read, grid: grid, reduce: reduce, resolution: resolution, swara: swara, render: render, TALAS: TALAS, defaultTala: defaultTala, keyInfo: keyInfo };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.AltNotation = api;
})(typeof window !== "undefined" ? window : globalThis);
