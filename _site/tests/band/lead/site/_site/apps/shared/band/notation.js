// notation.js — write out what the band played as ABC (BandNotation), for abcjs to draw.
// Input is the per-bar records from the player's onBarEvents (the notes as generated).
//
//   BandNotation.toAbc(bars, { key:"F", drums:false, barsPerLine:4, title:"" }) -> ABC string
//        staves: comping (treble) · bass (bass clef) · optional drums (percussion clef, two voices)
//
// Conventions:
//   • Swung eighths are written as plain eighths under a "Swing" marking; triplets as triplets.
//   • Bass is written an octave above where it sounds (as bass parts are); guitar likewise.
//   • Note lengths are rounded to eighths; a chord held over the barline is tied.
//   • Pitches are spelled from the chord they belong to (the C# of A7, not Db); notes outside
//     the chord follow the same degree logic, so an odd passing-tone spelling is possible.
//   • Compound meters (bar.compound: 6/8, 9/8, 12/8) are written in eighths, three to the beat,
//     with no swing marking; a change of meter is written where it happens.
//   • Drums: ride g(x) · crash a(x) · hi-hat f(x) · snare c · cross-stick c(x) · toms e d A ·
//     kick D · hi-hat foot E(x). Cymbals/snare/toms stem up, kick and hat foot stem down.

(function (global) {
  var G = 12;                                               // grid steps per beat: eighths (6) and triplets (4)
  var NAT = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 }, LET = ["C","D","E","F","G","A","B"];
  var FIFTHS = { C:0, G:1, D:2, A:3, E:4, B:5, "F#":6, "C#":7, F:-1, Bb:-2, Eb:-3, Ab:-4, Db:-5, Gb:-6, Cb:-7 };
  var SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"], FLAT = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
  // semitones above a chord root -> letter steps above the root's letter
  var STEP = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];
  var DRUM = { ride:["g",1], rideBell:["g",1], crash:["a",1], hatClosed:["f",1], hatOpen:["f",1], sticks:["c",1], rim:["c",1],
               snare:["c",0], tomHi:["e",0], tomMid:["d",0], tomLo:["A",0], kick:["D",0], hatFoot:["E",1] };
  var DOWN = { kick:1, hatFoot:1 };

  function mod12(n){ return ((n % 12) + 12) % 12; }
  function keyInfo(key){
    var m = /^([A-G][#b]?)\s*(m(?!aj)|min)?/.exec(key || "C") || [0, "C"];
    var f = (FIFTHS[m[1]] || 0) + (m[2] ? -3 : 0), sig = {};
    LET.forEach(function (L){ sig[L] = 0; });
    "FCGDAEB".split("").slice(0, Math.max(0, f)).forEach(function (L){ sig[L] = 1; });
    "BEADGCF".split("").slice(0, Math.max(0, -f)).forEach(function (L){ sig[L] = -1; });
    return { sig: sig, flats: f <= 0, abc: (m[1] || "C") + (m[2] ? "m" : "") };
  }
  function plain(pc, K){ var n = (K.flats ? FLAT : SHARP)[mod12(pc)]; return { letter: n[0], acc: n.length > 1 ? (n[1] === "#" ? 1 : -1) : 0 }; }
  // spell a pitch class as a degree of `chord` (root letter from its symbol)
  function spell(pc, chord, K){
    if (!chord || chord.nc) return plain(pc, K);
    var m = /^([A-G])([#b]*)/.exec(chord.sym || ""), rl, ra = 0;
    if (m){ for (var i = 0; i < m[2].length; i++) ra += m[2][i] === "#" ? 1 : -1; }
    if (m && mod12(NAT[m[1]] + ra) === mod12(chord.root)) rl = m[1];
    else rl = plain(chord.root, K).letter;
    var iv = mod12(pc - chord.root), step = STEP[iv];
    if (iv === 6 && !(chord.b5 || chord.quality === "dim" || chord.quality === "hdim")) step = 3;      // #4 unless the chord has a b5
    if (iv === 8 && (chord.s5 || chord.quality === "aug")) step = 4;                                   // #5
    if (iv === 3 && chord.third === 4) step = 1;                                                        // #9 over a major 3rd
    var L = LET[(LET.indexOf(rl) + step) % 7], acc = mod12(pc - NAT[L]); if (acc > 6) acc -= 12;
    if (Math.abs(acc) > 1) return plain(pc, K);                                                        // no double accidentals
    return { letter: L, acc: acc };
  }
  // one pitch -> ABC (no length); `ms` = accidentals already in force in this bar
  function pitchTok(midi, chord, K, ms){
    var sp = spell(mod12(midi), chord, K), oct = Math.round((midi - sp.acc - NAT[sp.letter]) / 12) - 1;
    var id = sp.letter + oct, eff = ms[id] !== undefined ? ms[id] : K.sig[sp.letter], g = "";
    if (sp.acc !== eff){ g = sp.acc === 0 ? "=" : sp.acc > 0 ? "^" : "_"; ms[id] = sp.acc; }
    var s, i;
    if (oct >= 5){ s = sp.letter.toLowerCase(); for (i = 5; i < oct; i++) s += "'"; }
    else { s = sp.letter; for (i = oct; i < 4; i++) s += ","; }
    return g + s;
  }
  function chordAt(chords, pos){ var c = null; (chords || []).forEach(function (x){ if (x.pos <= pos + 1e-6) c = x.chord; }); return c; }
  function snap(pos, cmp){                                  // beat position -> grid, on the eighth or triplet grid
    var b = Math.floor(pos + 1e-6), f = pos - b;
    if (cmp) return b * 3 + (Math.abs(f - 0.5) < 0.02 ? 2 : Math.min(2, Math.round(f * 3)));   // compound: x.5 is the third eighth
    var  opts = [0, 4, 6, 8, 12], best = 0, bd = 9;
    opts.forEach(function (o){ var d = Math.abs(f * G - o); if (d < bd - 1e-9){ bd = d; best = o; } });
    return b * G + best;
  }
  function len(n){ return n === 1 ? "" : String(n); }

  // items: { grid: { tok(ms) -> string, want (eighths), fill } }. Returns ABC for one bar.
  // carryIn: { tok, left } a note still sounding from the previous bar (tied in).
  // cmp: a compound bar, whose grid is three eighths to the beat (no triplets to bracket).
  function emitBar(items, beats, marks, carryIn, nextFree, sustain, cmp){
    var G = cmp ? 3 : 12, U = cmp ? 1 : 6;                   // grid steps per beat, and per written eighth
    var total = beats * G, ms = {}, out = "", carry = carryIn || null, markKeys = Object.keys(marks || {}).map(Number).sort(function (a, b){ return a - b; });
    var onsets = Object.keys(items).map(Number).filter(function (g){ return g < total; }).sort(function (a, b){ return a - b; });
    if (!onsets.length && !carry && !markKeys.length) return { abc: "z" + beats * G / U, carry: null };
    function trip(b){ return !cmp && onsets.some(function (g){ return Math.floor(g / G) === b && (g % G === 4 || g % G === 8); }); }
    function put(g, s){
      var pre = ""; while (markKeys.length && markKeys[0] <= g) pre += '"' + marks[markKeys.shift()] + '"';
      out += (g % G === 0 && out ? " " : "") + pre + s;
    }
    function free(g){ return g >= total ? !!nextFree : (!trip(Math.floor(g / G)) && items[g] === undefined); }
    var b = 0;
    while (b < beats){
      if (trip(b)){
        carry = null;
        [0, 4, 8].forEach(function (o, k){ var g = b * G + o, it = items[g] || (o === 8 ? items[b * G + 6] : null);
          put(g, (k === 0 ? "(3" : "") + (it ? it.tok(ms) : "z")); });
        b++; continue;
      }
      var b1 = b + 1; if (b % 2 === 0 && b1 < beats && !trip(b1)) b1++;        // a run of one or two plain beats
      // compound: one beat at a time, unless nothing starts inside the pair (a dotted half, or a rest)
      if (cmp && b1 === b + 2 && onsets.some(function (x){ return x > b * G && x < b1 * G; })) b1 = b + 1;
      var g0 = b * G, g1 = b1 * G, g = g0;
      while (g < g1){
        var it = items[g], nxt = g + U; while (nxt < g1 && items[nxt] === undefined) nxt += U;
        var avail = (nxt - g) / U, n, tie;
        if (it){
          n = it.fill ? avail : Math.max(1, Math.min(it.want, avail));
          tie = sustain && !it.fill && it.want > avail && nxt === g1 && free(g1);
          put(g, it.tok(ms) + len(n) + (tie ? "-" : ""));
          carry = tie ? { tok: it.tok, left: it.want - avail } : null;
          if (n < avail) put(g + n * U, "z" + len(avail - n));
        } else if (carry && g === g0){
          n = Math.max(1, Math.min(carry.left, avail));
          tie = carry.left > avail && nxt === g1 && free(g1);
          put(g, carry.tok(ms) + len(n) + (tie ? "-" : ""));
          carry = tie ? { tok: carry.tok, left: carry.left - avail } : null;
          if (n < avail) put(g + n * U, "z" + len(avail - n));
        } else { carry = null; put(g, "z" + len(avail)); }
        g = nxt;
      }
      b = b1;
    }
    return { abc: out, carry: carry };
  }

  function chordName(c){
    if (!c || c.nc) return "N.C.";
    var m = /^([A-G][#b]*)(.*)$/.exec(c.sym || "");
    if (m){ var a = 0, i; for (i = 1; i < m[1].length; i++) a += m[1][i] === "#" ? 1 : -1;
      if (mod12(NAT[m[1][0]] + a) === mod12(c.root)) return c.sym; return FLAT[mod12(c.root)] + m[2]; }
    return c.sym || "";
  }

  function sigOf(bar){ var b = bar.beats || 4; return bar.compound ? (b * 3) + "/8" : b + "/4"; }

  function toAbc(bars, o){
    o = o || {}; bars = bars || [];
    var K = keyInfo(o.key), perLine = o.barsPerLine || 4, first = bars[0] || {}, beats0 = first.beats || 4;
    var guitar = bars.some(function (b){ return ((b.parts || {}).comp || []).some(function (e){ return e.inst === "guitar"; }); });
    var M = global.BandMidi, straight = M ? bars.every(function (b){ return M.swingOf(b) <= 0.5; }) : !!o.straight;
    var voices = [ { id:"K", def:'V:K clef=treble name="' + (guitar ? "Gtr." : "Pno.") + '"' }, { id:"B", def:'V:B clef=bass name="Bass"' } ];
    if (o.drums){ voices.push({ id:"U", def:'V:U clef=perc stem=up name="Dr."' }); voices.push({ id:"D", def:"V:D clef=perc stem=down" }); }

    // per voice, per bar: the grid of items
    function grids(v){
      return bars.map(function (bar){
        var items = {}, P = bar.parts || {};
        var cmp = !!bar.compound, per = cmp ? 3 : 2;                          // written eighths per beat
        if (v === "B") (P.bass || []).forEach(function (e){ var g = snap(e.pos, cmp), ch = chordAt(bar.chords, e.pos);
          items[g] = { want: Math.max(1, Math.round((e.dur || 1) * per + 0.45)), tok: function (ms){ return pitchTok(e.midi + 12, ch, K, ms); } }; });
        else if (v === "K") (P.comp || []).forEach(function (e){ var g = snap(e.pos, cmp);
          // an off-beat hit just before a change is spelled as the chord it anticipates
          var ch = chordAt(bar.chords, e.pos + 0.5) || chordAt(bar.chords, e.pos), ms0 = (e.midis || []).slice().sort(function (a, b){ return a - b; });
          if (e.pos + 0.5 >= bar.beats - 1e-6 && bar.nextChord) ch = bar.nextChord;
          items[g] = { want: Math.max(1, Math.round((e.dur || 0.5) * per)), tok: function (ms){
            var t = ms0.map(function (m){ return pitchTok(m + (e.inst === "guitar" ? 12 : 0), ch, K, ms); }); return t.length > 1 ? "[" + t.join("") + "]" : t[0] || "z"; } }; });
        else (P.drums || []).forEach(function (e){ var d = DRUM[e.piece]; if (!d || (v === "D") !== !!DOWN[e.piece]) return;
          var g = snap(e.pos, cmp), it = items[g] || (items[g] = { fill: true, want: 1, hits: [], tok: function (){
            var seen = {}, t = []; this.hits.forEach(function (h){ if (seen[h[0] + h[1]]) return; seen[h[0] + h[1]] = 1; t.push((h[1] ? "!style=x!" : "") + h[0]); });
            return t.length > 1 ? "[" + t.join("") + "]" : t[0]; } });
          it.hits.push(d); });
        return items;
      });
    }
    bars.forEach(function (bar, i){ var nb = bars[i + 1]; bar.nextChord = nb ? chordAt(nb.chords, 0) : null; });

    var body = {}; voices.forEach(function (v){
      var gs = grids(v.id), carry = null;
      body[v.id] = bars.map(function (bar, i){
        var marks = {}, cmp = !!bar.compound, nb = bars[i + 1], sig = sigOf(bar);
        if (v.id === "K") (bar.chords || []).forEach(function (c){ marks[Math.round(c.pos * (cmp ? 3 : G))] = chordName(c.chord); });
        var ng = gs[i + 1], nextFree = !!ng && ng[0] === undefined && (!!(nb && nb.compound) || !Object.keys(ng).some(function (g){ return g < G && (g % G === 4 || g % G === 8); }));
        var r = emitBar(gs[i], bar.beats || 4, marks, carry, nextFree, v.id === "K" || v.id === "B", cmp);
        carry = r.carry;
        return (i > 0 && sig !== sigOf(bars[i - 1]) ? "[M:" + sig + "]" : "") + r.abc;
      });
    });
    bars.forEach(function (bar){ delete bar.nextChord; });

    var head = ["X:1"]; if (o.title) head.push("T:" + o.title);
    if (first.compound) head.push("M:" + sigOf(first), "L:1/8", "Q:3/8=" + Math.round(first.tempo || 120));
    else head.push("M:" + beats0 + "/4", "L:1/8", 'Q:"' + (straight ? "Straight" : "Swing") + '" 1/4=' + Math.round(first.tempo || 120));
    head.push("%%score " + voices.slice(0, 2).map(function (v){ return v.id; }).join(" ") + (o.drums ? " (U D)" : ""));
    voices.forEach(function (v){ head.push(v.def); });
    head.push("K:" + K.abc);
    var lines = [];
    for (var s = 0; s < bars.length; s += perLine) voices.forEach(function (v){
      var seg = body[v.id].slice(s, s + perLine), end = s + perLine >= bars.length ? " |]" : " |";
      if (s === 0 && (v.id === "U" || v.id === "D")){ lines.push("V:" + v.id, "K:C clef=perc", seg.join(" | ") + end); return; }   // no key signature on the drum staff
      lines.push("[V:" + v.id + "] " + seg.join(" | ") + end);
    });
    return head.concat(lines).join("\n");
  }

  global.BandNotation = { toAbc: toAbc, spell: spell, keyInfo: keyInfo };
})(typeof window !== "undefined" ? window : globalThis);
