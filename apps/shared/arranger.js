// arranger.js — minimal in-browser auto-accompaniment engine (PROTOTYPE).
// Phase 1 of the "build on existing styles" plan: a small, meter-generic style engine
// that turns a chord chart (TuneChart.parse output) + a STYLE into scheduled notes on
// the shared MusicAudio synth. A later phase can add an importer for existing libraries
// (MMA grooves / Yamaha SFF) that emit into this same engine.
//
// Style format (data-driven, hand-authorable — the thing we'd map MMA/SFF onto):
//   events: [ { b: <beat index, 0-based>, t: "bass"|"chord", d: <beats> | "bar" } ]
//   Beats are the meter's beats (numerator); events with b >= beatsPerBar are skipped,
//   so one pattern adapts to 2/4, 3/4, 4/4, 6/8, … (compound = beat is the 1/denominator).
//
//   Arranger.styles() -> [{id,label}]
//   Arranger.play(parsedChart, { style, tempo, transpose, voice, gain, onBar, onEnd })
//   Arranger.stop()

(function (global) {
  var ROOTPC = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
  var TRIAD  = { maj:[0,4,7], min:[0,3,7], dim:[0,3,6], aug:[0,4,8] };

  function rootPc(sym){ var m = /^([A-G])([#b]*)/.exec(sym || ""); if (!m) return null;
    var pc = ROOTPC[m[1]]; for (var i=0;i<m[2].length;i++) pc += (m[2][i]==="#"?1:-1); return ((pc%12)+12)%12; }
  function quality(sym){ var s = (sym||"").replace(/^[A-G][#b]*/,"");
    if (/^(m7b5|ø|dim|°|o(?![a-z]))/i.test(s)) return "dim";
    if (/^(aug|\+)/.test(s)) return "aug";
    if (/^m(?!aj)/.test(s)) return "min";
    return "maj"; }
  function has7(sym){ var s = (sym||"").replace(/^[A-G][#b]*/,""); return /7/.test(s) && !/6/.test(s); }
  // chord symbol -> { bass: low root midi, voicing: close triad (+7th) midis in octave 4 }
  function chordMidis(sym, transpose){
    var r = rootPc(sym); if (r == null) return null; r = ((r + (transpose||0)) % 12 + 12) % 12;
    var ivs = (TRIAD[quality(sym)] || TRIAD.maj).slice();
    if (has7(sym)) ivs.push(quality(sym) === "maj" ? 10 : 10);   // add a dominant/min 7th
    var voicing = ivs.map(function (i){ return 60 + ((r + i) % 12); });   // close voicing, octave 4
    return { bass: 36 + r, voicing: voicing };
  }

  // built-in starter styles (meter-generic). "bar" duration = sustain the whole measure.
  var STYLES = {
    block: { label: "Block chords", events: [ {b:0,t:"bass",d:"bar"}, {b:0,t:"chord",d:"bar"} ] },
    waltz: { label: "Waltz",        events: [ {b:0,t:"bass",d:0.9}, {b:1,t:"chord",d:0.85}, {b:2,t:"chord",d:0.85} ] },
    pop:   { label: "Pop / ballad", events: [ {b:0,t:"bass",d:1}, {b:2,t:"bass",d:1},
              {b:0,t:"chord",d:0.45}, {b:1,t:"chord",d:0.45}, {b:2,t:"chord",d:0.45}, {b:3,t:"chord",d:0.45} ] }
  };
  // NOTATION is a separate axis from style: how the styled accompaniment is written out.
  var NOTATIONS = [ { id:"piano", label:"Piano (grand staff)" }, { id:"satb", label:"SATB (4 staves)" } ];
  // per-beat layer rules used by the ABC renderer (which beats get bass / chord)
  var BEAT_RULES = {
    block: { block: true },
    waltz: { bass: function (b){ return b === 0; }, chord: function (b){ return b >= 1; } },
    pop:   { bass: function (b,n){ return b === 0 || b === Math.floor(n/2); }, chord: function (){ return true; } }
  };

  // gchord-pattern styles, using the abc2midi / Michael Eskin %%MIDI gchord vocabulary so
  // existing style libraries map straight in. One token per slot across a bar:
  //   z rest · f bass (root) · c chord · b bass+chord · g h i j k chord tones ascending
  //   (arpeggio) · G H I J the same an octave lower. Optional `dur` = per-token note length
  //   in eighths (default one slot; shorter = staccato). `meter` must match the tune.
  var TOK = { z:null, f:{bass:1}, c:{chord:1}, b:{bass:1,chord:1},
    g:{arp:0}, h:{arp:1}, i:{arp:2}, j:{arp:3}, k:{arp:4},
    G:{arp:0,oct:-12}, H:{arp:1,oct:-12}, I:{arp:2,oct:-12}, J:{arp:3,oct:-12} };
  // Two flavours: `cell` = a per-beat cell tiled across the bar (meter-generic — works in
  // 2/4, 3/4, 4/4, 2/2); `gchord` = a full-bar pattern for a specific `meter`. Bar-specific
  // grooves carry their meter in the label so the mismatch (→ block) isn't a surprise.
  // `drum` (optional) = a per-eighth drum cell overriding the default backbeat. We can't layer
  // (one %%MIDI drum line), so genre feels INTERLEAVE — ride/hat fill the gaps between accents.
  var PATTERNS = [
    { id:"block",      label:"Block chords (sustained)" },                              // no cell/gchord → falls through to blockSlots: held whole-bar chords
    { id:"folk",       label:"Folk — alternating bass", cell:"fc",  cellComp:"fcc" },   // 6/8: bass·chord·chord per dotted-quarter
    { id:"oompah",     label:"Boom-chick (oom-pah)",    cell:"bc",  cellComp:"bcc" },
    { id:"driving8",   label:"Driving 8ths",            cell:"cc",  cellComp:"ccc", drum:"khshkhsh" },
    { id:"offbeat",    label:"Offbeat chords (ska)",    cell:"zc",  cellComp:"zcc", drum:"zhzhkhzh" },  // reggae one-drop: kick on 3
    { id:"bassroot",   label:"Bass line (roots)",       cell:"fz",  cellComp:"fzz" },   // 6/8: bass·rest·rest per beat
    { id:"arpcell",    label:"Arpeggio (root–5th)",     cell:"gi",  cellComp:"ghi", arp:true },  // 6/8: root·3rd·5th
    { id:"charleston", label:"Jazz Charleston (4/4)",   meter:"4/4", gchord:"czczzzzz", dur:[2,0,1,0,0,0,0,0], drum:"rzrrrzrr" },  // swing ride
    { id:"bossa",      label:"Bossa nova (4/4)",        meter:"4/4", gchord:"fczzzfcz", drum:"xrrxrrxr" },                          // ride + side-stick tresillo
    { id:"tango",      label:"Tango (4/4)",             meter:"4/4", gchord:"fzccfzcz", dur:[2,0,1,1,2,0,1,0], drum:"khhkhhkh" },   // habanera kick tresillo
    { id:"arpflow",    label:"Piano arpeggio ↑ (4/4)",  meter:"4/4", gchord:"fghihgfi", arp:true },
    { id:"viennese",   label:"Viennese waltz (3/4)",    meter:"3/4", gchord:"fczczc",   dur:[2,1,1,1,1,1] },
    { id:"jazzwaltz",  label:"Jazz waltz (3/4)",        meter:"3/4", gchord:"fzczzc",   dur:[2,0,1,0,0,1],     drum:"rzrrrz" }      // swung ride in 3
  ];
  PATTERNS.forEach(function (p){ STYLES[p.id] = { label:p.label, cell:p.cell || null, cellComp:p.cellComp||null, gchord:p.gchord || null, meter:p.meter || null, dur:p.dur || null, arp:!!p.arp, drum:p.drum || null }; });

  // ---- soundfont path: render the styled accompaniment to ABC (one comping voice:
  // bass note(s) + close triad as chord-stacks), so it plays through abcjs's soundfont
  // and inherits the transport + bar-highlight cursor. Bars match the chart 1:1 so the
  // abcjs-mm measure numbers line up with the chart. ----
  var FLATNAME = ["C","_D","D","_E","E","F","_G","G","_A","A","_B","B"];
  function midiToAbc(m){            // fallback: flat spelling, no key sig
    var pc = ((m % 12) + 12) % 12, oct = Math.floor(m / 12) - 1, nm = FLATNAME[pc];
    var acc = nm.length > 1 ? nm[0] : "", L = nm[nm.length - 1], s;
    if (oct >= 5){ s = L.toLowerCase(); for (var i=5;i<oct;i++) s += "'"; }
    else { s = L; for (var j=oct;j<4;j++) s += ","; }
    return acc + s;
  }

  // ---- key-aware spelling (uses the shared PitchSpelling line-of-fifths rules) ----
  var NATPC = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
  var MAJOR_FIFTHS = { C:0,G:1,D:2,A:3,E:4,B:5,"F#":6,"C#":7,F:-1,Bb:-2,Eb:-3,Ab:-4,Db:-5,Gb:-6,Cb:-7 };
  var MODE_FIFTHS = { "":0,maj:0,major:0,ion:0,ionian:0, m:-3,min:-3,minor:-3,aeo:-3,aeolian:-3,
    dor:-2,dorian:-2, phr:-4,phrygian:-4, lyd:1,lydian:1, mix:-1,mixolydian:-1, loc:-5,locrian:-5 };
  function accCountOf(s){ return !s ? 0 : (s[0] === "b" ? -s.length : s[0] === "#" ? s.length : 0); }
  // returns {centerLof, sigAcc{letter→±n}, keyAbc} for the tune's key transposed by `transpose`
  function keyContext(parsed, transpose){
    if (!global.PitchSpelling) return null;
    var PS = global.PitchSpelling;
    var m = /^([A-G][#b]?)\s*([A-Za-z]*)/.exec(parsed.keyField || "C");
    var f = (m ? (MAJOR_FIFTHS[m[1]] || 0) : 0) + (m ? (MODE_FIFTHS[(m[2]||"").toLowerCase()] || 0) : 0);
    var center;
    if (!transpose) center = f;                                   // keep the tune's own spelling intent
    else { var doPc = (((f * 7) % 12) + 12) % 12; center = PS.keyTonicLOF((doPc + transpose) % 12); }
    var sigAcc = {};
    for (var lof = center - 1; lof <= center + 5; lof++){ var sp = PS.lofToSpelling(lof); sigAcc[sp.letter] = accCountOf(sp.accidental); }
    "ABCDEFG".split("").forEach(function (L){ if (sigAcc[L] === undefined) sigAcc[L] = 0; });
    return { centerLof: center, sigAcc: sigAcc, keyAbc: PS.lofToSpelling(center).name };   // K: = relative major (correct signature)
  }
  // CHORD-AWARE spelling: each chord tone is spelled by its function relative to the
  // chord root's letter (root, 3rd, 5th, 7th, slash bass) → correct enharmonics even for
  // chromatic chords (e.g. the C♯ of A7 in D minor, not D♭). Returns pc → {letter, acc}.
  var LETTERS = ["C","D","E","F","G","A","B"];
  function spellByLetter(letterIdx, pc){ var L = LETTERS[((letterIdx % 7) + 7) % 7];
    var acc = ((pc - NATPC[L]) % 12 + 12) % 12; if (acc > 6) acc -= 12; return { letter:L, acc:acc, pc:((pc%12)+12)%12 }; }
  function chordSpellingMap(sym){
    if (!sym) return null;
    var m = /^([A-G])([#b]*)/.exec(sym); if (!m) return null;
    var rl = LETTERS.indexOf(m[1]), racc = accCountOf(m[2]), root = ((NATPC[m[1]] + racc) % 12 + 12) % 12;
    var q = quality(sym), third = (q === "min" || q === "dim") ? 3 : 4, fifth = q === "dim" ? 6 : q === "aug" ? 8 : 7;
    var map = {}; function put(step, pc){ var sp = spellByLetter(rl + step, pc); map[sp.pc] = sp; }
    put(0, root); put(2, (root + third) % 12); put(4, (root + fifth) % 12);
    if (has7(sym)) put(6, (root + (q === "maj" && /maj7|M7|Δ/.test(sym) ? 11 : 10)) % 12);
    var sl = /\/([A-G])([#b]*)/.exec(sym);                        // slash bass
    if (sl){ var spc = ((NATPC[sl[1]] + accCountOf(sl[2])) % 12 + 12) % 12; map[spc] = spellByLetter(LETTERS.indexOf(sl[1]), spc); }
    return map;
  }
  // one note → ABC token (no duration). Spelling comes from the chord map (fallback: key
  // line-of-fifths), accidentals minimised against the key sig + in-measure state `ms`.
  function spellNote(midi, smap, ctx, ms){
    var pc = ((midi % 12) + 12) % 12;
    var sp = (smap && smap[pc]) || { letter: global.PitchSpelling.spellPitchClass(pc, ctx.centerLof).letter,
              acc: accCountOf(global.PitchSpelling.spellPitchClass(pc, ctx.centerLof).accidental) };
    var L = sp.letter, acc = sp.acc, oct = Math.round((midi - acc - NATPC[L]) / 12) - 1;
    var key = L + oct, eff = (ms[key] !== undefined) ? ms[key] : ctx.sigAcc[L], glyph = "";
    if (acc !== eff){ glyph = acc === 0 ? "=" : acc > 0 ? new Array(acc + 1).join("^") : new Array(-acc + 1).join("_"); ms[key] = acc; }
    var s; if (oct >= 5){ s = L.toLowerCase(); for (var i=5;i<oct;i++) s += "'"; } else { s = L; for (var j=oct;j<4;j++) s += ","; }
    return glyph + s;
  }
  function noteTok(midi, smap, ctx, ms){ return ctx ? spellNote(midi, smap, ctx, ms) : midiToAbc(midi); }
  // split the chart into chord segments (sym + duration in eighths), with bar-end flags
  function segments(parsed){
    var beats = parsed.beatsPerBar || 4, d = parsed.meterD || 4, barE = beats * (8 / d);
    var upb = parsed.unitsPerBar || 1, e8 = barE / upb, segs = [];
    parsed.bars.forEach(function (bar){
      var barLen = Math.max(1, Math.round((bar.lengthUnits || upb) * e8)), startN = segs.length;
      if (!bar.chords.length){ segs.push({ sym:null, durE:barLen, barEnd:true }); return; }
      bar.chords.forEach(function (c, j){
        var start = Math.round(c.onset * e8);
        var end = (j + 1 < bar.chords.length) ? Math.round(bar.chords[j+1].onset * e8) : barLen;
        if (end > start) segs.push({ sym:c.sym, durE:end - start, barEnd:false });
      });
      if (segs.length > startN) segs[segs.length-1].barEnd = true; else segs.push({ sym:null, durE:barLen, barEnd:true });
    });
    return segs;
  }

  // ---- shared rhythm engine (the STYLE axis) ----
  function metrics(parsed){
    var beats = parsed.beatsPerBar || 4, d = parsed.meterD || 4, beatE = 8 / d, barE = beats * beatE;
    var upb = parsed.unitsPerBar || 1, e8 = barE / upb;
    return { beats:beats, d:d, beatE:beatE, barE:barE, upb:upb, upBeat:parsed.unitsPerBeat || 1, e8:e8,
             meterStr: parsed.meterStr || (beats + "/" + d) };
  }
  function barLenOf(bar, M){ return Math.max(1, Math.round((bar.lengthUnits || M.upb) * M.e8)); }
  function chordOnsetsE(bar, M){ return (bar.chords || []).map(function (c){ return { onsetE: Math.round(c.onset * M.e8), sym: c.sym }; }); }
  // which pattern (if any) applies: a meter-generic cell (simple meters only) or a full-bar
  // gchord whose meter matches the tune. Otherwise null → block.
  function patternFor(styleId, M){ var st = STYLES[styleId]; if (!st) return null;
    if (st.cell) return { st:st, kind:"cell" };                  // cells tile per-eighth → any meter
    if (st.gchord && st.meter === (M.beats + "/" + M.d)) return { st:st, kind:"gchord" };
    return null; }
  function chordSymAtE(ons, p){ var s = ons.length ? ons[0].sym : null;
    for (var k=0;k<ons.length;k++){ if (ons[k].onsetE <= p + 1e-6) s = ons[k].sym; } return s; }
  function mkSlot(f, pos, len, sym){ return { pos:pos, dur:Math.max(1, Math.round(len)),
    bass:!!f.bass, chord:!!f.chord, arp:(f.arp == null ? null : f.arp), oct:f.oct || 0, sym:sym }; }
  // sustain each chord segment for the bar (block) — also used for partial/pickup bars
  function blockSlots(bar, M, barLen){
    var ons = chordOnsetsE(bar, M), out = [];
    ons.forEach(function (c, j){ var start = c.onsetE, end = (j+1 < ons.length) ? ons[j+1].onsetE : barLen;
      if (end > start) out.push({ pos:start, dur:end-start, bass:true, chord:true, arp:null, oct:0, sym:c.sym }); });
    return out;
  }
  function isFullBar(bar, M){ return Math.abs((bar.lengthUnits || M.upb) * M.e8 - M.barE) < 0.5; }
  // tile a cell across the bar, one token per eighth for simple meters; for compound meters
  // (6/8, 9/8…) use cellComp — each element covers one eighth WITHIN a dotted-quarter beat,
  // so 3-element "fcc" gives bass·chord·chord per beat rather than the quarter-note tiling.
  function barHitsCell(bar, st, M, barLen){
    if (!isFullBar(bar, M)) return { barLen:barLen, slots: blockSlots(bar, M, barLen) };
    var ons = chordOnsetsE(bar, M), slots = [], pos, f, sym;
    var isComp = M.d >= 8 && M.beats % 3 === 0 && M.beats >= 6;
    if (isComp){
      var cc = st.cellComp || st.cell, ccLen = cc.length;
      for (pos=0; pos<barLen; pos++){
        var j = pos % 3;          // offset within the dotted-quarter beat (0, 1 or 2)
        if (j >= ccLen) continue; // cell shorter than 3 → implicit rest on remaining eighths
        f = TOK[cc[j]]; if (!f) continue;
        sym = chordSymAtE(ons, pos); if (!sym) continue;
        slots.push(mkSlot(f, pos, 1, sym));
      }
      return { barLen:barLen, slots:slots };
    }
    var cell = st.cell, n = cell.length;
    for (pos=0; pos<barLen; pos++){
      f = TOK[cell[pos % n]]; if (!f) continue;
      sym = chordSymAtE(ons, pos); if (!sym) continue;
      slots.push(mkSlot(f, pos, 1, sym));
    }
    return { barLen:barLen, slots:slots };
  }
  // expand a full-bar gchord pattern (one token per slot)
  function barHitsPattern(bar, st, M, barLen){
    if (!isFullBar(bar, M)) return { barLen:barLen, slots: blockSlots(bar, M, barLen) };
    var pat = st.gchord, n = pat.length, step = M.barE / n, dur = st.dur || null, ons = chordOnsetsE(bar, M), slots = [];
    for (var i=0;i<n;i++){ var f = TOK[pat[i]]; if (!f) continue;
      var pos = Math.round(i * step); if (pos >= barLen) break;
      var len = dur ? dur[i] : step; if (!len) continue;
      var sym = chordSymAtE(ons, pos); if (!sym) continue;
      slots.push(mkSlot(f, pos, len, sym));
    }
    return { barLen:barLen, slots:slots };
  }
  // rhythm hits for one bar given the style: [{pos,dur,bass,chord,arp,oct,sym}]
  function barHits(bar, styleId, M){
    var barLen = barLenOf(bar, M);
    if (!bar.chords.length) return { barLen:barLen, slots:[] };
    var pf = patternFor(styleId, M);
    if (pf) return (pf.kind === "cell" ? barHitsCell : barHitsPattern)(bar, pf.st, M, barLen);
    var rules = BEAT_RULES[styleId] || BEAT_RULES.block;
    if (rules.block || !isFullBar(bar, M)) return { barLen:barLen, slots: blockSlots(bar, M, barLen) };
    var chordAtBeat = function (b){ var posU = b * M.upBeat, c = bar.chords[0];   // beat-based comping
      for (var k=0;k<bar.chords.length;k++){ if (bar.chords[k].onset <= posU + 1e-6) c = bar.chords[k]; } return c; };
    var slots = {};
    for (var b=0;b<M.beats;b++){ var sym = chordAtBeat(b); if (!sym) continue;
      var bass = !!(rules.bass && rules.bass(b, M.beats)), chord = !!(rules.chord && rules.chord(b, M.beats));
      if (!bass && !chord) continue; var pos = Math.round(b * M.beatE);
      if (slots[pos]){ slots[pos].bass = slots[pos].bass || bass; slots[pos].chord = slots[pos].chord || chord; }
      else slots[pos] = { pos:pos, dur:Math.round(M.beatE), bass:bass, chord:chord, arp:null, oct:0, sym:sym.sym }; }
    return { barLen:barLen, slots: Object.keys(slots).map(function (k){ return slots[k]; }).sort(function (a,b){ return a.pos - b.pos; }) };
  }
  // emit one voice's ABC for a bar from the slots this voice is active in. A note rings for
  // its own length but never past the next hit in this voice (so per-slot durations give
  // staccato/legato, and patterns with gaps fill with rests). Works for tiling + pattern slots.
  function emitVoice(hits, activeFn, tokFn, M){
    if (!hits.slots.length) return "z" + hits.barLen;
    var own = hits.slots.filter(activeFn).sort(function (a,b){ return a.pos - b.pos; });
    if (!own.length) return "z" + hits.barLen;
    var toks = [], cur = 0;
    own.forEach(function (sl, i){
      if (sl.pos > cur) toks.push({t:"z"+(sl.pos-cur), p:cur});
      var avail = ((i+1 < own.length) ? own[i+1].pos : hits.barLen) - sl.pos;
      var play = Math.max(1, Math.min(sl.dur, avail));
      toks.push({t:tokFn(sl, play), p:sl.pos});
      if (play < avail) toks.push({t:"z"+(avail-play), p:sl.pos+play});
      cur = sl.pos + avail;
    });
    if (cur < hits.barLen) toks.push({t:"z"+(hits.barLen-cur), p:cur});
    // Beam tokens within the same beat group (no space); space at beat boundary so abcjs
    // auto-beams in groups of 3 (compound: 6/8) or 2 (simple: 4/4, 3/4).
    var bg = M ? (M.d >= 8 && M.beats % 3 === 0 && M.beats >= 6 ? M.beatE * 3 : M.beatE) : 2;
    return toks.map(function(tk, i){
      return (i > 0 && Math.floor(tk.p/bg) === Math.floor(toks[i-1].p/bg) ? "" : (i > 0 ? " " : "")) + tk.t;
    }).join("").trim();
  }

  // ---- drums: played on MIDI channel 10 via %%MIDI drum (adds NO staff) ----
  // groove = a per-eighth cell of drum tokens, tiled across the bar (meter-generic):
  //   k kick · s snare · h closed hi-hat · o open hi-hat · r ride · x side-stick · c crash
  //   · t tambourine · z rest.  Default = a kick/hat/snare/hat backbeat.
  var DRUM = { k:36, s:38, h:42, o:46, r:51, x:37, c:49, t:54 };          // GM percussion notes
  var DVEL = { k:98, s:90, h:46, o:66, r:56, x:76, c:100, t:60 };         // accent kick/snare over hats; sit under the harmony

  // metric dynamics for the melodic voices (playback only — kept OUT of the printed notation).
  // Maps to abcjs dynamic decorations so downbeats lift and offbeats ease.
  var DYNV = { ppp:30, pp:35, p:50, mp:65, mf:90, f:95, ff:110, fff:125 }, DYNLBL = Object.keys(DYNV);
  function nearestDyn(v){ var best = DYNLBL[0], bd = 1e9; for (var i=0;i<DYNLBL.length;i++){ var d = Math.abs(DYNV[DYNLBL[i]] - v); if (d < bd){ bd = d; best = DYNLBL[i]; } } return best; }
  function dynFor(role, sl, M){
    var isDown = sl.pos === 0, isBeat = (sl.pos % M.beatE) === 0;
    if (role === "arp")  return isBeat ? "mp" : "p";
    if (role === "bass") return isDown ? "f" : "mp";                      // bass: accent the downbeat, steady otherwise
    return isDown ? "f" : (isBeat ? "mp" : "p");                          // chord / SATB upper voices
  }
  // the metric dynamic scaled by a 0..1 volume → the nearest decoration (so the mixer fader
  // attenuates the whole curve while keeping the accent shape)
  function dynScaled(role, sl, M, frac){ return nearestDyn(DYNV[dynFor(role, sl, M)] * frac); }
  function volFrac(opts, part){ var v = opts.vol && opts.vol[part]; return (v == null ? 100 : v) / 100; }
  function drumGroove(styleId, M){ var st = STYLES[styleId];
    if (st && st.drum) return st.drum;                                    // per-style override
    var isComp = M.d >= 8 && M.beats % 3 === 0 && M.beats >= 6;
    if (isComp) return "khhshh";                                          // compound duple: kick·hat·hat·snare·hat·hat
    if (M.beats === 3) return "kzhzhz";                                   // waltz: kick on 1, hats on 2 & 3
    return "khsh"; }                                                      // default kick/hat/snare/hat backbeat
  function drumHeader(M, styleId, frac){
    frac = frac == null ? 1 : frac;
    var g = drumGroove(styleId, M), pat = "", notes = [], vels = [];
    for (var i=0;i<M.barE;i++){ var tk = g[i % g.length], n = DRUM[tk];
      if (n){ pat += "d"; notes.push(n); vels.push(Math.max(1, Math.round((DVEL[tk] || 80) * frac))); } else pat += "z"; }
    if (!notes.length) return [];
    return ["%%MIDI drumon", "%%MIDI drum " + pat + " " + notes.join(" ") + " " + vels.join(" ")];
  }
  // Percussion notation staff for the drum groove (display only; sound comes from %%MIDI drum).
  // Cymbal-family hits (h/o/r/c) → 'e' (above middle line); kick/snare → 'B' (middle line).
  // Beams respect the meter: groups of 2 for simple, groups of 3 for compound.
  // Groove is computed per bar so inline meter changes (e.g. 3/4→2/2) render correctly.
  function drumVoiceLines(M, styleId, bars){
    var CYM = { h:1, o:1, r:1, c:1 };
    var isComp = M.d >= 8 && M.beats % 3 === 0 && M.beats >= 6;
    var bg = isComp ? M.beatE * 3 : M.beatE;
    function grooveFor(len){
      if (len === M.barE) return drumGroove(styleId, M);
      var beats = Math.max(1, Math.round(len / M.beatE));
      return drumGroove(styleId, { beats:beats, d:M.d, beatE:M.beatE, barE:len });
    }
    function barBody(bar){
      var len = barLenOf(bar, M), toks = [], i;
      var g = grooveFor(len);
      for (i=0; i<len; i++) toks.push({ t: g[i % g.length] === "z" ? "z1" : (CYM[g[i % g.length]] ? "e1" : "B1"), p:i });
      return toks.map(function(tk, i){
        return (i > 0 && Math.floor(tk.p/bg) !== Math.floor(toks[i-1].p/bg) ? " " : "") + tk.t;
      }).join("").trim();
    }
    return ['V:drums clef=perc name="Dr."', bars.map(barBody).join(" | ") + " |]"];
  }
  // Build a voice body string; when bars have varying lengths (inline meter change), insert
  // an updated %%MIDI drum line before each new-length group so audio adapts per section.
  function voiceBodyMixed(allBars, barFn, M, styleId, drF){
    // Only treat a different bar length as a genuine meter change when it is at least 2 beats
    // long. Single-beat pickup bars and Z-rest artifacts are shorter and must be ignored.
    var minLen = M.beatE * 2;
    var hasChange = allBars.some(function(b){ var l = barLenOf(b, M); return l !== M.barE && l >= minLen; });
    if (!hasChange || !drF || drF <= 0) return allBars.map(barFn).join(" | ") + " |]";
    var lines = [], curLen = M.barE, curBars = [], drumChanged = false;
    function flush(){ if (curBars.length){ lines.push({ type:"bars", body:curBars.join(" | ") }); curBars = []; } }
    allBars.forEach(function(bar, barIdx){
      var len = barLenOf(bar, M);
      if (len !== curLen){
        flush();
        if (len >= minLen) {  // skip short bars (pickups, Z artifacts)
          if (len !== M.barE) {
            var beats = Math.max(1, Math.round(len / M.beatE));
            var dh = drumHeader({ beats:beats, d:M.d, beatE:M.beatE, barE:len }, styleId, drF);
            if (dh.length >= 2) { lines.push({ type:"drum", body:dh[1] }); drumChanged = true; }
          } else if (drumChanged) {
            // Returned to initial meter; restore original drum pattern
            var dh2 = drumHeader(M, styleId, drF);
            if (dh2.length >= 2) lines.push({ type:"drum", body:dh2[1] });
            drumChanged = false;
          }
        }
        curLen = len;
      }
      curBars.push(barFn(bar, barIdx));
    });
    flush();
    var barGroupIdxs = lines.map(function(l,i){ return l.type === "bars" ? i : -1; }).filter(function(i){ return i >= 0; });
    barGroupIdxs.forEach(function(idx, k){
      var trail = k === barGroupIdxs.length - 1 ? " |]" : " |";
      lines[idx] = { type:"bars", body:lines[idx].body + trail };
    });
    return lines.map(function(l){ return l.body; }).join("\n");
  }
  // optional melody voice (playback only): the tune line on its own channel, set by %%MIDI vol.
  // opts.melody = { body:"<L:1/8 tokens + barlines>", program:<gm>, vol:<0-100> }
  function melodyVoiceLines(opts){
    var m = opts.melody; if (!m || !m.body || volFrac(opts, "melody") <= 0) return [];
    return ['V:Mel clef=treble', '%%MIDI program ' + (m.program || 0),
            '%%MIDI vol ' + Math.max(1, Math.round((m.vol == null ? 100 : m.vol))), m.body];
  }

  // Expand bars into the sequence of written-bar indices that playback visits.
  // Mirrors tune-chart.js computePlayOrder: handles |: … :| (incl. implicit start-of-tune),
  // :: , and skips first-ending bars on the repeat pass.
  function computePlayOrder(bars){
    var order = [], n = bars.length, startStack = [0];
    for (var i = 0; i < n; i++){
      var b = bars[i];
      if (b.left === "repeat-open") startStack.push(i);
      order.push(i);
      if (b.right === "repeat-close" || b.right === "repeat-close-open"){
        var start = startStack[startStack.length - 1];
        for (var j = start; j <= i; j++){ if (bars[j].ending === 1) continue; order.push(j); }
        if (startStack.length > 1) startStack.pop();
      }
    }
    return order;
  }

  // Propagate the most recent chord into bars that carry no chord annotation.
  // An explicit N.C. chord (c.nc===true) silences carry-over and resets the running chain.
  function barsWithCarryover(bars){
    var last = [], result = [];
    bars.forEach(function(bar){
      var hasNc = bar.chords.some(function(c){ return c.nc; });
      if (hasNc)  { last = []; result.push(bar); return; }
      if (bar.chords.length){ last = bar.chords; result.push(bar); return; }
      if (!last.length){ result.push(bar); return; }
      var nb = {}; for (var k in bar) if (Object.prototype.hasOwnProperty.call(bar,k)) nb[k]=bar[k];
      nb.chords = last; result.push(nb);
    });
    return result;
  }

  // ---- intro + repeat helpers ----
  // Build the full bar sequence: optional intro section + cbars repeated N times.
  //   opts.repeats (int ≥ 1)  — how many times to loop the whole chart
  //   opts.intro   (string)   — "none"|"count-in-1"|"count-in-2"|"last-2"|"last-4"
  function buildAllBars(cbars, M, opts){
    var repeats = Math.max(1, parseInt(opts.repeats, 10) || 1);
    var intro = opts.intro || "none";
    var restBar = { chords: [], lengthUnits: M.upb };   // all-rest bar (no chords)
    var introBars = [];
    if      (intro === "count-in-1") introBars = [restBar];
    else if (intro === "count-in-2") introBars = [restBar, restBar];
    else if (intro === "last-2")     introBars = cbars.slice(Math.max(0, cbars.length - 2));
    else if (intro === "last-4")     introBars = cbars.slice(Math.max(0, cbars.length - 4));
    var order = computePlayOrder(cbars);
    var repeated = [];
    for (var i = 0; i < repeats; i++) for (var k = 0; k < order.length; k++) repeated.push(cbars[order[k]]);
    return introBars.concat(repeated);
  }
  // Return a copy of opts where opts.melody.body is extended with rest bars for the
  // intro and repeated once per cycle, so it stays in sync with allBars.
  function buildPlayOpts(opts, allBars, cbars, M){
    if (!opts.melody || !opts.melody.body) return opts;
    var repeats = Math.max(1, parseInt(opts.repeats, 10) || 1);
    var order = computePlayOrder(cbars);
    var introLen = allBars.length - order.length * repeats;
    if (introLen === 0 && repeats === 1 && order.length === cbars.length) return opts;
    var restStr = "z" + M.barE;
    var melBars = opts.melody.body.split("|").map(function(s){ return s.trim(); }).filter(Boolean);
    var full = [];
    for (var i = 0; i < introLen; i++) full.push(restStr);
    for (var r = 0; r < repeats; r++) for (var k = 0; k < order.length; k++) full.push(melBars[order[k]] || restStr);
    var newMel = { body: full.join(" | "), program: opts.melody.program, vol: opts.melody.vol };
    var newOpts = {};
    for (var p in opts) if (Object.prototype.hasOwnProperty.call(opts, p)) newOpts[p] = opts[p];
    newOpts.melody = newMel;
    return newOpts;
  }

  // ---- notation: PIANO grand staff (RH = triad, LH = bass), styled rhythm ----
  function toAbcPiano(parsed, opts){
    var M = metrics(parsed), transpose = opts.transpose || 0, tempo = opts.tempo || parsed.tempoQ || 100;
    var ctx = keyContext(parsed, transpose), prog = opts.program == null ? 0 : opts.program;
    var chF = volFrac(opts, "chords"), baF = volFrac(opts, "bass"), drF = volFrac(opts, "drums");
    function chordSmap(sym){ return (ctx && !transpose) ? chordSpellingMap(sym) : null; }
    function dpre(role, sl, frac){ return opts.dynamics ? "!" + dynScaled(role, sl, M, frac) + "!" : ""; }   // playback only
    function rh(bar){ var ms = {}; return emitVoice(barHits(bar, opts.style, M),
      function (sl){ return chF > 0 && (sl.chord || sl.arp != null); },
      function (sl, dur){ var m = chordMidis(sl.sym, transpose); if (!m) return "z" + dur; var sm = chordSmap(sl.sym);
        if (sl.arp != null){ var tone = m.voicing[sl.arp % m.voicing.length] + (sl.oct || 0); return dpre("arp", sl, chF) + noteTok(tone, sm, ctx, ms) + dur; }
        var notes = m.voicing.map(function (x){ return noteTok(x, sm, ctx, ms); });
        return dpre("chord", sl, chF) + (notes.length > 1 ? "[" + notes.join("") + "]" : notes[0]) + dur; }, M); }
    function lh(bar){ var ms = {}; return emitVoice(barHits(bar, opts.style, M),
      function (sl){ return baF > 0 && sl.bass; },
      function (sl, dur){ var m = chordMidis(sl.sym, transpose); if (!m) return "z" + dur;
        return dpre("bass", sl, baF) + noteTok(m.bass, chordSmap(sl.sym), ctx, ms) + dur; }, M); }
    var cbars = barsWithCarryover(parsed.bars);
    var allBars = buildAllBars(cbars, M, opts);
    var pOpts = buildPlayOpts(opts, allBars, cbars, M);
    var drumDisp = opts.showDrums && !opts.dynamics && opts.drums;
    var rhBody = voiceBodyMixed(allBars, rh, M, opts.style, drF);
    var lhBody = voiceBodyMixed(allBars, lh, M, opts.style, drF);
    var head = ["X:1","T:Piano","M:" + M.meterStr,"L:1/8","Q:1/4=" + tempo,
                drumDisp ? "%%score {1 2} drums" : "%%score {1 2}", "%%MIDI program " + prog];
    if (opts.dynamics) head.push("%%MIDI nobeataccents");        // let our dynamics fully control velocity
    if (opts.drums && drF > 0) head = head.concat(drumHeader(M, opts.style, drF));
    var voices = melodyVoiceLines(pOpts).concat(['V:1 clef=treble name="R.H."', rhBody, 'V:2 clef=bass name="L.H."', lhBody]);
    if (drumDisp) voices = voices.concat(drumVoiceLines(M, opts.style, allBars));
    return head.concat(["K:" + (ctx ? ctx.keyAbc : "C")]).concat(voices).join("\n");
  }

  // ---- notation: SATB (4 staves), voice-led by satb.js, styled rhythm ----
  function toAbcSATB(parsed, opts){
    var M = metrics(parsed), transpose = opts.transpose || 0, tempo = opts.tempo || parsed.tempoQ || 100;
    var ctx = keyContext(parsed, transpose);
    var cbars = barsWithCarryover(parsed.bars);
    var allBars = buildAllBars(cbars, M, opts);
    var pOpts = buildPlayOpts(opts, allBars, cbars, M);
    var flat = [], barOns = [];                                   // voice-leading runs over chord CHANGES
    allBars.forEach(function (bar){ var arr = []; chordOnsetsE(bar, M).forEach(function (c){ arr.push({ onsetE:c.onsetE, idx:flat.length, sym:c.sym }); flat.push(c.sym); }); barOns.push(arr); });
    var voicings = global.SATB ? SATB.voice(flat, parsed.keyPc) : flat.map(function (){ return null; });
    function voicingAt(bi, pos){ var arr = barOns[bi]; if (!arr.length) return null; var e = arr[0];
      for (var k=0;k<arr.length;k++){ if (arr[k].onsetE <= pos) e = arr[k]; } return { v: voicings[e.idx], sym: e.sym }; }
    var chF = volFrac(opts, "chords"), baF = volFrac(opts, "bass"), drF = volFrac(opts, "drums");
    function voiceBody(bi, bar, role, octShift, isBass){ var ms = {}, frac = isBass ? baF : chF;
      return emitVoice(barHits(bar, opts.style, M),
        function (sl){ return frac > 0 && (isBass ? sl.bass : (sl.chord || sl.arp != null)); },   // SATB: arpeggio → chord onset
        function (sl, dur){ var vv = voicingAt(bi, sl.pos); if (!vv || !vv.v) return "z" + dur;
          var sm = (ctx && !transpose) ? chordSpellingMap(vv.sym) : null;
          var pre = opts.dynamics ? "!" + dynScaled(isBass ? "bass" : "chord", sl, M, frac) + "!" : "";
          return pre + noteTok(vv.v[role] + transpose + (octShift || 0), sm, ctx, ms) + dur; }, M); }
    var bassTenor = opts.tenorClef === "bass";   // treble-8 (vocal tenor, sounds at pitch) or bass clef
    var defs = [ { nm:"S", role:"s", clef:"treble", oct:0, mt:0 }, { nm:"A", role:"a", clef:"treble", oct:0, mt:0 },
      bassTenor ? { nm:"T", role:"t", clef:"bass", oct:0, mt:0 } : { nm:"T", role:"t", clef:"treble-8", oct:12, mt:-12 },
      { nm:"B", role:"b", clef:"bass", oct:0, mt:0 } ];
    var lines = ["X:1","T:SATB","M:" + M.meterStr,"L:1/8","Q:1/4=" + tempo,"%%MIDI program 0"];
    if (opts.dynamics) lines.push("%%MIDI nobeataccents");
    if (opts.drums && drF > 0) lines = lines.concat(drumHeader(M, opts.style, drF));
    lines.push("K:" + (ctx ? ctx.keyAbc : "C"));
    lines = lines.concat(melodyVoiceLines(pOpts));
    defs.forEach(function (vd, i){ lines.push('V:' + (i+1) + ' clef=' + vd.clef + ' name="' + vd.nm + '"');
      if (vd.mt) lines.push("%%MIDI transpose " + vd.mt);
      lines.push(voiceBodyMixed(allBars, function(bar, bi){ return voiceBody(bi, bar, vd.role, vd.oct, vd.role === "b"); }, M, opts.style, drF)); });
    if (opts.showDrums && !opts.dynamics && opts.drums) lines = lines.concat(drumVoiceLines(M, opts.style, allBars));
    return lines.join("\n");
  }

  // dispatch on NOTATION (independent of style); default piano
  function toAbc(parsed, opts){
    opts = opts || {}; if (!parsed || !parsed.bars) return "";
    return (opts.notation === "satb") ? toAbcSATB(parsed, opts) : toAbcPiano(parsed, opts);
  }

  var raf = null;
  function stop(){ if (global.MusicAudio) MusicAudio.stopAll(); if (raf) cancelAnimationFrame(raf); raf = null; }

  function play(parsed, opts){
    opts = opts || {}; var A = global.MusicAudio; if (!A || !parsed) return null;
    var ctx = A.ctx();
    var qpm = opts.tempo || parsed.tempoQ || 100, transpose = opts.transpose || 0;
    var beats = parsed.beatsPerBar || 4, meterD = parsed.meterD || 4, upBeat = parsed.unitsPerBeat || 1;
    var spq = 60 / qpm, secPerBeat = spq * (4 / meterD), secPerBar = secPerBeat * beats;
    var style = STYLES[opts.style] || STYLES.block, gain = opts.gain == null ? 0.6 : opts.gain;
    var order = parsed.playOrder && parsed.playOrder.length ? parsed.playOrder : parsed.bars.map(function (_,i){ return i; });

    var t0 = ctx.currentTime + 0.12, t = t0, barTimes = [];
    order.forEach(function (bi){
      var bar = parsed.bars[bi]; if (!bar) return;
      barTimes.push({ t: t, bar: bi });
      function chordAtBeat(b){ if (!bar.chords.length) return null; var posU = b * upBeat, c = bar.chords[0];
        for (var k=0;k<bar.chords.length;k++){ if (bar.chords[k].onset <= posU + 1e-6) c = bar.chords[k]; } return c; }
      style.events.forEach(function (ev){
        if (ev.b >= beats) return;
        var c = chordAtBeat(ev.b); if (!c) return;
        var m = chordMidis(c.sym, transpose); if (!m) return;
        var et = t + ev.b * secPerBeat, dur = ev.d === "bar" ? secPerBar * 0.98 : ev.d * secPerBeat;
        if (ev.t === "bass") A.noteAt(m.bass, et, dur, 0.32 * gain, "bass");
        else m.voicing.forEach(function (mi){ A.noteAt(mi, et, dur, 0.14 * gain, opts.voice || "epiano"); });
      });
      t += secPerBar;
    });
    var endT = t;

    var lastBar = -1;                                  // drive the chart highlight off the audio clock
    (function tick(){
      var now = ctx.currentTime, cur = -1;
      for (var i=0;i<barTimes.length;i++){ if (barTimes[i].t <= now) cur = barTimes[i].bar; else break; }
      if (cur !== lastBar){ lastBar = cur; if (opts.onBar) opts.onBar(cur); }
      if (now < endT + 0.25) raf = requestAnimationFrame(tick);
      else { raf = null; if (opts.onEnd) opts.onEnd(); }
    })();
    return { endT: endT };
  }

  global.Arranger = {
    styles: function (){ return Object.keys(STYLES).map(function (k){ return { id:k, label:STYLES[k].label }; }); },
    notations: function (){ return NOTATIONS.slice(); },
    toAbc: toAbc,    // soundfont path: styled accompaniment as ABC (played via abcjs)
    play: play, stop: stop   // direct MusicAudio path (kept for non-abcjs hosts)
  };
})(typeof window !== "undefined" ? window : globalThis);
