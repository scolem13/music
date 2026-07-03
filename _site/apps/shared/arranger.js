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
    { id:"charleston", label:"Jazz Charleston (4/4)",   meter:"4/4", gchord:"czczzzzz", gchordDouble:"czczczcz", dur:[2,0,1,0,0,0,0,0], drum:"rzrrrzrr" },  // swing ride
    { id:"bossa",      label:"Bossa nova (4/4)",        meter:"4/4", gchord:"fczzzfcz", gchordDouble:"fczfczfc",                     drum:"xrrxrrxr" },      // ride + side-stick tresillo
    { id:"tango",      label:"Tango (4/4)",             meter:"4/4", gchord:"fzccfzcz", gchordDouble:"fzccfzcc", dur:[2,0,1,1,2,0,1,0], drum:"khhkhhkh" },   // habanera kick tresillo
    { id:"arpflow",    label:"Piano arpeggio ↑ (4/4)",  meter:"4/4", gchord:"fghihgfi", arp:true },
    { id:"viennese",   label:"Viennese waltz (3/4)",    meter:"3/4", gchord:"fczczc",   gchordDouble:"fcfcfc",   dur:[2,1,1,1,1,1] },
    { id:"jazzwaltz",  label:"Jazz waltz (3/4)",        meter:"3/4", gchord:"fzczzc",   gchordDouble:"fzcfzc",   dur:[2,0,1,0,0,1],   drum:"rzrrrz" },       // swung ride in 3
    { id:"montuno",    label:"Son montuno (4/4)",        meter:"4/4", gchord:"fcczcczc", drum:"khhskhkh" },                                                    // Cuban piano tumbao
    { id:"walk",       label:"Walking bass (jazz)",      walk:true,                      drum:"rzrrrzrr" }                            // walking LH + Charleston RH
  ];
  PATTERNS.forEach(function (p){ STYLES[p.id] = { label:p.label, cell:p.cell || null, cellComp:p.cellComp||null, gchord:p.gchord || null, gchordDouble:p.gchordDouble || null, meter:p.meter || null, dur:p.dur || null, arp:!!p.arp, drum:p.drum || null, walk:!!p.walk }; });

  // ---- Standalone drum pattern catalog (independent of chord/bass style) ----
  // groove = per-eighth cell (same tokens as the drum field above). null groove = silent.
  // meters: which meter categories this pattern works in ('duple'|'triple'|'compound').
  var DRUM_PATTERNS = {
    none:            { label:"No drums",               meters:["duple","triple","compound"] },
    // Jazz / swing
    swing_ride:      { label:"Swing — ride cymbal",   meters:["duple"],    genre:"jazz",  groove:"rzrrrzrr" },
    swing_hats:      { label:"Swing — closed hi-hat", meters:["duple"],    genre:"jazz",  groove:"hzhhzhzh" },
    swing_hats_open: { label:"Swing — open hi-hat",   meters:["duple"],    genre:"jazz",  groove:"hzhohoho" },
    swing_brushes:   { label:"Swing — brushes",       meters:["duple"],    genre:"jazz",  groove:"xzxhxhxh" },
    jazzwaltz_ride:  { label:"Jazz waltz — ride",     meters:["triple"],   genre:"jazz",  groove:"rzrrrz" },
    jazzwaltz_hats:  { label:"Jazz waltz — hats",     meters:["triple"],   genre:"jazz",  groove:"hzhhhz" },
    // Pop / rock
    backbeat:        { label:"Backbeat",               meters:["duple"],    genre:"pop",   groove:"khsh" },
    driving8:        { label:"Driving 8ths",           meters:["duple"],    genre:"pop",   groove:"khshkhsh" },
    ska:             { label:"Ska / reggae (one-drop)", meters:["duple"],    genre:"pop",   groove:"zhzhkhzh" },
    // Latin
    bossa:           { label:"Bossa nova",             meters:["duple"],    genre:"latin", groove:"xrrxrrxr" },
    tango:           { label:"Tango (habanera)",       meters:["duple"],    genre:"latin", groove:"khhkhhkh" },
    montuno:         { label:"Son montuno (clave)",    meters:["duple"],    genre:"latin", groove:"khhskhkh" },
    // Dance / folk
    waltz:           { label:"Waltz",                  meters:["triple"],   genre:"dance", groove:"kzhzhz" },
    compound6:       { label:"Compound (6/8)",         meters:["compound"], genre:"folk",  groove:"khhshh" },
  };

  // ---- Drum fill catalog (one-bar phrases that auto-replace the groove at phrase end) ----
  var DRUM_FILLS = {
    none:         { label:"No fill",           meters:["duple","triple","compound"] },
    simple_4:     { label:"Simple (4-beat)",   meters:["duple"],    groove:"kksskhsh" },
    snare_roll:   { label:"Snare roll",        meters:["duple"],    groove:"ssssssss" },
    crash_in:     { label:"Crash + snares",    meters:["duple"],    groove:"kksssssc" },
    triple_fill:  { label:"Triple fill (3/4)", meters:["triple"],   groove:"kksssk" },
    triple_roll:  { label:"Triple roll",       meters:["triple"],   groove:"ssssss" },
  };

  // ---- hand percussion: bongos/congas on MIDI channel 10 (separate from drum set) ----
  // H=Hi Bongo(60)  L=Lo Bongo(61)  m=Mute Hi Conga(62)  O=Open Hi Conga(63)  C=Lo Conga(64)
  // Merged into the single %%MIDI drum pattern: structural drums (k/s/c/x) beat hand drums;
  // hand drums beat texture drums (h/o/r/t) at shared positions.
  var HAND_PATTERNS = {
    none:               { label:"No hand drums",           meters:["duple","triple","compound"] },
    bongo_martillo:     { label:"Bongo — martillo",        meters:["duple"],    groove:"HLHLHLHz" },
    bongo_slow:         { label:"Bongo — quarter",         meters:["duple"],    groove:"HzHzHzHz" },
    conga_tumbao:       { label:"Conga — tumbao",          meters:["duple"],    groove:"CzCzmzOz" },
    conga_tumbao_dense: { label:"Conga — tumbao (8-note)", meters:["duple"],    groove:"euPueuOC" },
    conga_son:          { label:"Conga — son",             meters:["duple"],    groove:"CzmzOzmz" },
    conga_waltz:        { label:"Conga — waltz",           meters:["triple"],   groove:"CzOzOz"   },
    conga_6_8:          { label:"Conga — 6/8",             meters:["compound"], groove:"COz"       },
  };

  // Classify a meter (n/d) into 'duple' | 'triple' | 'compound'.
  function meterCategory(n, d){
    if (d >= 8 && n % 3 === 0 && n >= 6) return "compound";
    if (n % 3 === 0) return "triple";
    return "duple";
  }

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
             meterStr: parsed.meterStr || (beats + "/" + d), beatGrouping: parsed.beatGrouping || null };
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
  // sustain each chord segment for the bar (block) — also used for partial/pickup bars.
  // For asymmetric meters with a detected beat grouping, place the chord on each beat-group
  // downbeat (e.g. positions 0, 3, 5 for [3,2,2] in 7/8). This gives the layout engine the
  // same rhythmic anchor points as the drum staff, fixing multi-voice horizontal alignment.
  function blockSlots(bar, M, barLen){
    var ons = chordOnsetsE(bar, M), out = [];
    if (M.beatGrouping){
      var gpos = 0, firstPushed = false;
      M.beatGrouping.forEach(function(size, gi){
        var sizeE = Math.max(1, Math.round(size * M.e8));
        if (gpos < barLen){
          var actualDur = Math.min(sizeE, barLen - gpos);
          // Use null start (unlike chordSymAtE) so we only sound if a chord onset has
          // actually been reached — prevents the group-0 chord firing before its onset.
          var sym = null;
          for (var k = 0; k < ons.length; k++){
            if (ons[k].onsetE <= gpos + 1e-6) sym = ons[k].sym;
          }
          if (sym){
            out.push({ pos:gpos, dur:actualDur, bass:!firstPushed, chord:true, arp:null, oct:0, sym:sym });
            firstPushed = true;
          }
        }
        gpos += sizeE;
      });
      return out;
    }
    ons.forEach(function (c, j){ var start = c.onsetE, end = (j+1 < ons.length) ? ons[j+1].onsetE : barLen;
      if (end > start) out.push({ pos:start, dur:end-start, bass:true, chord:true, arp:null, oct:0, sym:c.sym }); });
    return out;
  }
  function isFullBar(bar, M){ return Math.abs((bar.lengthUnits || M.upb) * M.e8 - M.barE) < 0.5; }
  // tile a cell across the bar, one token per eighth for simple meters; for compound meters
  // (6/8, 9/8…) use cellComp — each element covers one eighth WITHIN a dotted-quarter beat,
  // so 3-element "fcc" gives bass·chord·chord per beat rather than the quarter-note tiling.
  function barHitsCell(bar, st, M, barLen, timeFeel){
    if (!isFullBar(bar, M)) return { barLen:barLen, slots: blockSlots(bar, M, barLen) };
    var ons = chordOnsetsE(bar, M), slots = [], pos, f, sym;
    var step = timeFeel === "half" ? 2 : 1;
    var isComp = M.d >= 8 && M.beats % 3 === 0 && M.beats >= 6;
    if (isComp){
      var cc = st.cellComp || st.cell, ccLen = cc.length;
      for (pos=0; pos<barLen; pos+=step){
        var j = Math.floor(pos / step) % ccLen; // step-relative index (half-time: advance cell per beat, not per eighth)
        f = TOK[cc[j]]; if (!f) continue;
        sym = chordSymAtE(ons, pos); if (!sym) continue;
        slots.push(mkSlot(f, pos, 1, sym));
      }
      return { barLen:barLen, slots:slots };
    }
    var cell = st.cell, n = cell.length;
    for (pos=0; pos<barLen; pos+=step){
      f = TOK[cell[Math.floor(pos / step) % n]]; if (!f) continue; // step-relative cell index
      sym = chordSymAtE(ons, pos); if (!sym) continue;
      slots.push(mkSlot(f, pos, 1, sym));
    }
    return { barLen:barLen, slots:slots };
  }
  // expand a full-bar gchord pattern (one token per slot)
  function barHitsPattern(bar, st, M, barLen, timeFeel){
    if (!isFullBar(bar, M)) return { barLen:barLen, slots: blockSlots(bar, M, barLen) };
    var useDouble = timeFeel === "double" && st.gchordDouble;
    var pat = useDouble ? st.gchordDouble : st.gchord;
    var n = pat.length, step = M.barE / n;
    var dur = useDouble ? null : (st.dur || null);
    if (timeFeel === "half") step *= 2;
    var ons = chordOnsetsE(bar, M), slots = [];
    for (var i=0;i<n;i++){ var f = TOK[pat[i]]; if (!f) continue;
      var pos = Math.round(i * step); if (pos >= barLen) break;
      var len = dur ? dur[i] : step; if (!len) continue;
      var sym = chordSymAtE(ons, pos); if (!sym) continue;
      slots.push(mkSlot(f, pos, len, sym));
    }
    return { barLen:barLen, slots:slots };
  }
  // rhythm hits for one bar given the style: [{pos,dur,bass,chord,arp,oct,sym}]
  function barHits(bar, styleId, M, timeFeel, isLast){
    var barLen = barLenOf(bar, M);
    if (!bar.chords.length) return { barLen:barLen, slots:[] };
    if (isLast) return { barLen:barLen, slots: blockSlots(bar, M, barLen) };
    var pf = patternFor(styleId, M);
    if (pf) return (pf.kind === "cell" ? barHitsCell : barHitsPattern)(bar, pf.st, M, barLen, timeFeel);
    var rules = BEAT_RULES[styleId] || BEAT_RULES.block;
    if (rules.block || !isFullBar(bar, M)) return { barLen:barLen, slots: blockSlots(bar, M, barLen) };
    var chordAtBeat = function (b){ var posU = b * M.upBeat, c = bar.chords[0];   // beat-based comping
      for (var k=0;k<bar.chords.length;k++){ if (bar.chords[k].onset <= posU + 1e-6) c = bar.chords[k]; } return c; };
    var slots = {}, bStep = timeFeel === "half" ? 2 : 1;
    for (var b=0;b<M.beats;b+=bStep){ var sym = chordAtBeat(b); if (!sym) continue;
      var bass = !!(rules.bass && rules.bass(b, M.beats)), chord = !!(rules.chord && rules.chord(b, M.beats));
      if (!bass && !chord) continue; var pos = Math.round(b * M.beatE);
      if (slots[pos]){ slots[pos].bass = slots[pos].bass || bass; slots[pos].chord = slots[pos].chord || chord; }
      else slots[pos] = { pos:pos, dur:Math.round(M.beatE * bStep), bass:bass, chord:chord, arp:null, oct:0, sym:sym.sym }; }
    return { barLen:barLen, slots: Object.keys(slots).map(function (k){ return slots[k]; }).sort(function (a,b){ return a.pos - b.pos; }) };
  }
  // emit one voice's ABC for a bar from the slots this voice is active in. A note rings for
  // its own length but never past the next hit in this voice (so per-slot durations give
  // staccato/legato, and patterns with gaps fill with rests). Works for tiling + pattern slots.
  function emitVoice(hits, activeFn, tokFn, M, artFrac){
    if (!hits.slots.length) return "z" + hits.barLen;
    var own = hits.slots.filter(activeFn).sort(function (a,b){ return a.pos - b.pos; });
    if (!own.length) return "z" + hits.barLen;
    var toks = [], cur = 0;
    own.forEach(function (sl, i){
      if (sl.pos > cur) toks.push({t:"z"+(sl.pos-cur), p:cur});
      var avail = ((i+1 < own.length) ? own[i+1].pos : hits.barLen) - sl.pos;
      var play = Math.max(1, Math.min(artFrac ? Math.round(sl.dur * artFrac) : sl.dur, avail));
      toks.push({t:tokFn(sl, play), p:sl.pos});
      if (play < avail) toks.push({t:"z"+(avail-play), p:sl.pos+play});
      cur = sl.pos + avail;
    });
    if (cur < hits.barLen) toks.push({t:"z"+(hits.barLen-cur), p:cur});
    // Beam tokens within the same beat group (no space); space at beat boundary so abcjs
    // auto-beams in groups of 3 (compound: 6/8) or 2 (simple: 4/4, 3/4).
    // For asymmetric meters with a detected grouping, use per-position group indices.
    var bg = M ? (M.d >= 8 && M.beats % 3 === 0 && M.beats >= 6 ? M.beatE * 3 : M.beatE) : 2;
    var grpMap = null;
    if (M && M.beatGrouping){
      grpMap = [];
      M.beatGrouping.forEach(function(size, gi){
        var sizeE = Math.max(1, Math.round(size * (M.e8 || 1)));
        for (var k = 0; k < sizeE; k++) grpMap.push(gi);
      });
    }
    function grpOf(p){ return grpMap ? (grpMap[p] != null ? grpMap[p] : grpMap.length) : Math.floor(p / bg); }
    return toks.map(function(tk, i){
      return (i > 0 && grpOf(tk.p) === grpOf(toks[i-1].p) ? "" : (i > 0 ? " " : "")) + tk.t;
    }).join("").trim();
  }

  // ---- drums: played on MIDI channel 10 via %%MIDI drum (adds NO staff) ----
  // groove = a per-eighth cell of drum tokens, tiled across the bar (meter-generic):
  //   k kick · s snare · h closed hi-hat · o open hi-hat · r ride · x side-stick · c crash
  //   · t tambourine · z rest.  Default = a kick/hat/snare/hat backbeat.
  // k-t = drum set;  H/L/m/O/C = hand drums (bongo/conga) — all on GM channel 10
  var DRUM = { k:36, s:38, h:42, o:46, r:51, x:37, c:49, t:54,
               H:60, L:61, m:62, O:63, C:64,
               e:64, u:62, P:62 };           // tumbao technique: heel, toe, slap
  var DVEL = { k:98, s:90, h:46, o:66, r:56, x:76, c:100, t:60,
               H:80, L:80, m:70, O:85, C:80,
               e:45, u:35, P:95 };           // heel=soft, toe=very soft, slap=accent

  // Staff positions for drum notation (treble-clef percussion staff).
  // x:true → !style=x! decoration (cymbal-family); x:false → default round notehead (drums).
  // Positions: D=space below staff · c=3rd space (snare) · f=5th line · g=above · a=ledger above.
  var DRUM_NOTE = {
    k: { abc:"D",  x:false },    // kick drum    — space below staff, round head
    s: { abc:"c",  x:false },    // snare        — 3rd space, round head
    h: { abc:"f",  x:true  },    // hi-hat (cls) — 5th line, x notehead
    o: { abc:"f",  x:true  },    // hi-hat (opn) — 5th line, x notehead
    r: { abc:"g",  x:true  },    // ride cymbal  — 1st space above staff, x notehead
    x: { abc:"c",  x:true  },    // side-stick   — snare position, x notehead
    c: { abc:"a",  x:true  },    // crash cymbal — 1st ledger line above, x notehead
    t: { abc:"A",  x:false },    // tambourine   — 2nd space, round head
  };
  // Staff positions for hand drum notation (separate percussion staff, treble clef positions).
  // lo=A (2nd space), hi=c (3rd space). Muted strokes: x head. Slap: accent + round head.
  var HAND_NOTE = {
    H: { abc:"c", x:false, dec:""    },  // Hi Bongo       — hi, open
    L: { abc:"A", x:false, dec:""    },  // Lo Bongo       — lo, open
    m: { abc:"c", x:true,  dec:""    },  // Mute Hi Conga  — hi, x head
    O: { abc:"c", x:false, dec:""    },  // Open Hi Conga  — hi, open
    C: { abc:"A", x:false, dec:""    },  // Lo Conga       — lo, open
    e: { abc:"A", x:true,  dec:""    },  // Heel           — lo, x head
    u: { abc:"c", x:true,  dec:""    },  // Toe            — hi, x head
    P: { abc:"c", x:false, dec:"!>!" },  // Slap           — hi, accented round head
  };

  // Structural drum tokens (kick/snare/crash) always beat hand drums in a merge.
  // Texture tokens (hats, ride, tambourine) yield to hand drums when both want the same 8th.
  var DRUM_PRIO = { k:2, s:2, c:2, x:2 };
  function mergeGrooves(dg, hg, barE){
    if (!dg) return hg;
    if (!hg) return dg;
    var out = "";
    for (var i = 0; i < barE; i++){
      var dt = dg[i % dg.length] || "z", ht = hg[i % hg.length] || "z";
      if      (dt === "z") out += ht;
      else if (ht === "z") out += dt;
      else out += (DRUM_PRIO[dt] || 1) >= 2 ? dt : ht;
    }
    return out;
  }

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
  // Build a groove string from a detected beat grouping (e.g. [3,2,2] for 7/8).
  // e8 converts L-units → eighths (so the resulting string length === M.barE).
  // Downbeats alternate kick (even groups) / snare (odd groups); hi-hat fills the rest.
  function grooveForGrouping(grouping, e8){
    var tokens = [];
    grouping.forEach(function(size, gi){
      var sizeE = Math.max(1, Math.round(size * (e8 || 1)));
      tokens.push(gi % 2 === 0 ? 'k' : 's');
      for (var k = 1; k < sizeE; k++) tokens.push('h');
    });
    return tokens.join('');
  }
  // Apply half/double time feel to a raw groove string.
  // Half: keep hits only at even positions (8ths → quarters).
  // Double: tile the groove at one-beat period so it plays twice as fast.
  function applyGrooveTimeFeel(groove, timeFeel, M){
    if (!groove || !timeFeel || timeFeel === "normal") return groove;
    var barE = M.barE;
    var exp = "";
    for (var i = 0; i < barE; i++) exp += groove[i % groove.length];
    function hitCount(pat, len){ var n = 0; for (var i = 0; i < len; i++) if (pat[i % pat.length] !== "z") n++; return n; }
    if (timeFeel === "half"){
      var r = "";
      for (var i = 0; i < barE; i++) r += (i % 2 === 0) ? exp[i] : "z";
      return r;
    }
    if (timeFeel === "double"){
      // Halve the repeating period so the pattern tiles twice as fast.
      // Only use the denser result; if tiling produces fewer hits, keep the original.
      var unit = Math.max(1, Math.min(M.beatE, Math.floor(barE / 2)));
      var dbl = exp.slice(0, unit);
      return hitCount(dbl, barE) >= hitCount(groove, barE) ? dbl : groove;
    }
    return groove;
  }
  function drumGroove(drumId, M){
    if (!drumId || drumId === "none") return null;
    if (Object.prototype.hasOwnProperty.call(DRUM_PATTERNS, drumId)) return DRUM_PATTERNS[drumId].groove || null;
    var st = STYLES[drumId]; if (st && st.drum) return st.drum;
    if (M.beatGrouping) return grooveForGrouping(M.beatGrouping, M.e8);
    var isComp = M.d >= 8 && M.beats % 3 === 0 && M.beats >= 6;
    if (isComp) return "khhshh";
    if (M.beats === 3) return "kzhzhz";
    return "khsh";
  }
  // handFrac: separate volume fraction for hand drum tokens (H/L/m/O/C); defaults to frac.
  function drumHeaderFromGroove(M, groove, frac, handFrac){
    if (!groove) return null;
    frac = frac == null ? 1 : frac;
    if (handFrac == null) handFrac = frac;
    var HAND = { H:true, L:true, m:true, O:true, C:true, e:true, u:true, P:true };
    var pat = "", notes = [], vels = [];
    for (var i=0;i<M.barE;i++){ var tk = groove[i % groove.length], n = DRUM[tk];
      if (n){ pat += "d"; notes.push(n);
        vels.push(Math.max(1, Math.round((DVEL[tk] || 80) * (HAND[tk] ? handFrac : frac)))); } else pat += "z"; }
    if (!notes.length) return null;
    return "%%MIDI drum " + pat + " " + notes.join(" ") + " " + vels.join(" ");
  }
  // handId/handFrac: optional hand drum pattern merged into the same %%MIDI drum channel.
  function drumHeader(M, drumId, frac, timeFeel, handId, handFrac){
    var dg = applyGrooveTimeFeel(drumGroove(drumId, M), timeFeel, M);
    var hg = (handId && handId !== "none" && HAND_PATTERNS[handId])
      ? applyGrooveTimeFeel(HAND_PATTERNS[handId].groove, timeFeel, M) : null;
    var g = mergeGrooves(dg, hg, M.barE); if (!g) return [];
    var body = drumHeaderFromGroove(M, g, frac, handFrac); if (!body) return [];
    return ["%%MIDI drumon", body];
  }
  // Single-voice percussion staff. Cymbal hits (h/o/r/c/x) get !style=x! per note so they
  // render as cross noteheads; drums (k/s/t) get default round noteheads. Consecutive rests
  // within a beat group are collapsed (e.g. z3 not z1z1z1). MIDI audio comes from %%MIDI drum
  // in the header; this voice plays alongside it but at non-percussion pitches — acceptable
  // since %%MIDI drum is the authoritative drum channel.
  function drumVoiceLines(M, drumId, bars, timeFeel, fillAt){
    var isComp = M.d >= 8 && M.beats % 3 === 0 && M.beats >= 6;
    var bg = isComp ? M.beatE * 3 : M.beatE;
    // For asymmetric meters with a detected grouping, build a position→group-index map
    // so that beam-group spaces in the drum notation exactly match the beat grouping.
    var grpOf = null;
    if (M.beatGrouping){
      grpOf = [];
      M.beatGrouping.forEach(function(size, gi){
        var sizeE = Math.max(1, Math.round(size * M.e8));
        for (var k = 0; k < sizeE; k++) grpOf.push(gi);
      });
    }
    function grooveFor(len){
      var raw = M.beatGrouping
        ? grooveForGrouping(M.beatGrouping, M.e8)
        : drumGroove(drumId, M);
      if (len === M.barE) return applyGrooveTimeFeel(raw, timeFeel, M);
      if (M.beatGrouping && raw) return raw.slice(0, len); // truncate partial bar — no timeFeel
      return drumGroove(drumId, { beats:Math.max(1, Math.round(len / M.beatE)), d:M.d, beatE:M.beatE, barE:len });
    }
    function barBody(bar, barIdx){
      var len = barLenOf(bar, M), i;
      if (bar.anacrusis) return "z" + len;  // pickup: rest aligns with silent piano anacrusis
      if (bar.isGap) {
        if (!bar.gapClick) return "z" + len;
        // Metronome click: ride cymbal on every beat (or beat group for compound meter).
        var gnd = DRUM_NOTE['r'], nb2 = Math.round(len / bg), gp2 = [];
        for (var b2 = 0; b2 < nb2; b2++) gp2.push((gnd.x ? "!style=x!" : "") + gnd.abc + bg);
        return gp2.join(" ");
      }
      // For asymmetric meters: one downbeat note per beat group, sized to the group duration.
      // This keeps the drum voice column-count identical to blockSlots' piano output so
      // abcjs has no extra columns to reconcile and alignment is trivial.
      if (M.beatGrouping){
        var gpos = 0, dParts = [];
        M.beatGrouping.forEach(function(size, gi){
          var sizeE = Math.max(1, Math.round(size * M.e8));
          if (gpos < len){
            var dur = Math.min(sizeE, len - gpos);
            var tk = gi % 2 === 0 ? 'k' : 's';
            var nd = DRUM_NOTE[tk];
            dParts.push((nd.x ? "!style=x!" : "") + nd.abc + dur);
          }
          gpos += sizeE;
        });
        return dParts.join(" ");
      }
      // Fill bars: use the fill groove directly (no timeFeel), matching audio behaviour.
      var fillGroove = fillAt ? fillAt(barIdx) : null;
      var g = fillGroove || grooveFor(len) || "z";
      // Build raw token list: {abc, grp} where abc=null means rest.
      var raw = [];
      for (i=0; i<len; i++){
        var tk = g[i % g.length], nd = DRUM_NOTE[tk];
        var grp = (grpOf && i < grpOf.length) ? grpOf[i] : Math.floor(i / bg);
        raw.push({ abc: (nd && tk !== "z") ? (nd.x ? "!style=x!" : "") + nd.abc : null, grp:grp });
      }
      // Consolidate consecutive rests within the same beat group.
      var parts = [], j = 0;
      while (j < raw.length){
        if (raw[j].abc !== null){
          parts.push({ s: raw[j].abc + "1", grp: raw[j].grp });
          j++;
        } else {
          var runGrp = raw[j].grp, run = 0;
          while (j < raw.length && raw[j].abc === null && raw[j].grp === runGrp){ run++; j++; }
          parts.push({ s: "z" + run, grp: runGrp });
        }
      }
      // Join parts; insert a space between beat groups for visual grouping.
      return parts.reduce(function(acc, p, k){
        return acc + (k > 0 && p.grp !== parts[k-1].grp ? " " : "") + p.s;
      }, "");
    }
    var body = bars.map(function(bar, i){ return barBody(bar, i); }).join(" | ") + " |]";
    return ['V:drums clef=perc name="Dr."', body];
  }
  // Notation-only percussion staff for hand drums (bongos / congas).
  // hi-pitch tokens → c (3rd space), lo-pitch tokens → A (2nd space).
  // Muted strokes (heel, toe, mute) get x noteheads; slap gets an accent mark.
  function handDrumVoiceLines(M, bars, timeFeel, handId){
    if (!handId || !HAND_PATTERNS[handId] || !HAND_PATTERNS[handId].groove) return [];
    var isComp = M.d >= 8 && M.beats % 3 === 0 && M.beats >= 6;
    var bg = isComp ? M.beatE * 3 : M.beatE;
    var grpOf = null;
    if (M.beatGrouping){
      grpOf = [];
      M.beatGrouping.forEach(function(size, gi){
        var sizeE = Math.max(1, Math.round(size * M.e8));
        for (var k = 0; k < sizeE; k++) grpOf.push(gi);
      });
    }
    var groove = applyGrooveTimeFeel(HAND_PATTERNS[handId].groove, timeFeel, M);
    function barBody(bar){
      var len = barLenOf(bar, M), i, j;
      if (bar.anacrusis || bar.isGap || !isFullBar(bar, M)) return "z" + len;
      var raw = [];
      for (i = 0; i < len; i++){
        var tk = groove[i % groove.length], nd = HAND_NOTE[tk];
        var grp = (grpOf && i < grpOf.length) ? grpOf[i] : Math.floor(i / bg);
        raw.push({ abc: nd ? (nd.dec || "") + (nd.x ? "!style=x!" : "") + nd.abc : null, grp:grp });
      }
      var parts = [];
      j = 0;
      while (j < raw.length){
        if (raw[j].abc !== null){ parts.push({ s:raw[j].abc + "1", grp:raw[j].grp }); j++; }
        else {
          var runGrp = raw[j].grp, run = 0;
          while (j < raw.length && raw[j].abc === null && raw[j].grp === runGrp){ run++; j++; }
          parts.push({ s:"z" + run, grp:runGrp });
        }
      }
      return parts.reduce(function(acc, p, k){
        return acc + (k > 0 && p.grp !== parts[k-1].grp ? " " : "") + p.s;
      }, "");
    }
    return ['V:hdrums clef=perc name="H.D."', bars.map(barBody).join(" | ") + " |]"];
  }
  // Build a voice body string; when bars have varying lengths (inline meter change) or fill
  // bars are active, insert updated %%MIDI drum lines so audio adapts per section / per bar.
  // fillAt(barIdx) → groove string for fill bars, null otherwise.
  function voiceBodyMixed(allBars, barFn, M, drumId, drF, fillAt, timeFeel, handId, handFrac){
    var minLen = M.beatE * 2;
    var hasChange = allBars.some(function(b){ var l = barLenOf(b, M); return l !== M.barE && l >= minLen; });
    var hasFill = fillAt && allBars.some(function(_, i){ return fillAt(i) !== null; });
    if (!hasChange && !hasFill) return allBars.map(barFn).join(" | ") + " |]";
    if ((!drF || drF <= 0) && (!handFrac || handFrac <= 0)) return allBars.map(barFn).join(" | ") + " |]";
    var lines = [], curLen = M.barE, curBars = [], drumChanged = false, wasFill = false;
    function flush(){ if (curBars.length){ lines.push({ type:"bars", body:curBars.join(" | ") }); curBars = []; } }
    allBars.forEach(function(bar, barIdx){
      var len = barLenOf(bar, M);
      var fillGroove = fillAt ? fillAt(barIdx) : null;
      var enterFill = fillGroove !== null && !wasFill;
      var leaveFill = fillGroove === null && wasFill;
      if (len !== curLen || enterFill || leaveFill){
        flush();
        if (enterFill){
          var fb = drumHeaderFromGroove(M, fillGroove, drF);
          if (fb) lines.push({ type:"drum", body:fb });
          wasFill = true;
        } else if (leaveFill){
          // Restore main drum (accounting for possible simultaneous meter change)
          var restoreM = (len !== M.barE && len >= minLen)
            ? { beats:Math.max(1,Math.round(len/M.beatE)), d:M.d, beatE:M.beatE, barE:len } : M;
          var rdh = drumHeader(restoreM, drumId, drF, timeFeel, handId, handFrac);
          if (rdh.length >= 2){ lines.push({ type:"drum", body:rdh[1] }); drumChanged = (len !== M.barE && len >= minLen); }
          wasFill = false;
        }
        if (!enterFill && !leaveFill && len !== curLen){
          if (len >= minLen){
            if (len !== M.barE){
              var beats = Math.max(1, Math.round(len / M.beatE));
              var dh = drumHeader({ beats:beats, d:M.d, beatE:M.beatE, barE:len }, drumId, drF, timeFeel, handId, handFrac);
              if (dh.length >= 2){ lines.push({ type:"drum", body:dh[1] }); drumChanged = true; }
            } else if (drumChanged){
              var dh2 = drumHeader(M, drumId, drF, timeFeel, handId, handFrac);
              if (dh2.length >= 2) lines.push({ type:"drum", body:dh2[1] });
              drumChanged = false;
            }
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

  // Expand bars into the sequence of written-bar indices (ABC generation).
  // Mirrors tune-chart.js computePlayOrder exactly — keep both in sync.
  function computePlayOrder(bars){
    var n = bars.length;
    var fineIdx = -1, segnoIdx = -1, jumpIdx = -1, jumpType = null;
    for (var k = 0; k < n; k++){
      var dd = bars[k].decors;
      if (!dd) continue;
      for (var m2 = 0; m2 < dd.length; m2++){
        if (dd[m2] === 'fine' && fineIdx < 0) fineIdx  = k;
        if (dd[m2] === 'segno')                segnoIdx = k;
        if (!jumpType && (dd[m2] === 'D.C.alfine' || dd[m2] === 'D.S.alfine' ||
                          dd[m2] === 'D.C.'       || dd[m2] === 'D.S.')){
          jumpIdx  = k;
          jumpType = dd[m2];
        }
      }
    }
    var passEnd = (jumpIdx >= 0) ? jumpIdx : n - 1;
    var order = [], startStack = [0];
    for (var i = 0; i <= passEnd; i++){
      var b = bars[i];
      if (b.left === "repeat-open") startStack.push(i);
      order.push(i);
      if ((b.right === "repeat-close" || b.right === "repeat-close-open") && b.ending !== 2){
        var start = startStack[startStack.length - 1];
        for (var j = start; j <= i; j++){ if (bars[j].ending === 1) continue; order.push(j); }
        if (startStack.length > 1) startStack.pop();
      }
    }
    for (var i2 = passEnd + 1; i2 < n && jumpIdx >= 0; i2++) order.push(i2);
    if (jumpIdx >= 0){
      var jumpStart = (jumpType === 'D.S.alfine' || jumpType === 'D.S.') ? Math.max(0, segnoIdx) : 0;
      var jumpStop  = (jumpType === 'D.C.alfine' || jumpType === 'D.S.alfine')
                        ? (fineIdx >= 0 ? fineIdx : n - 1) : n - 1;
      var startStack2 = [jumpStart];
      for (var i3 = jumpStart; i3 <= jumpStop; i3++){
        var b3 = bars[i3];
        if (b3.left === "repeat-open") startStack2.push(i3);
        order.push(i3);
        if ((b3.right === "repeat-close" || b3.right === "repeat-close-open") && b3.ending !== 2){
          var start3 = startStack2[startStack2.length - 1];
          for (var j3 = start3; j3 <= i3; j3++){ if (bars[j3].ending === 1) continue; order.push(j3); }
          if (startStack2.length > 1) startStack2.pop();
        }
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
    var tuneBars = order.map(function(k){ return cbars[k]; });
    var gapCount = opts.gapBars || 0;
    var gapBars = [];
    if (gapCount > 0){
      var gapBar = { chords: [], lengthUnits: M.upb, isGap: true, gapClick: !!opts.gapClick };
      for (var g = 0; g < gapCount; g++) gapBars.push(gapBar);
    }
    // Gap goes BETWEEN repeats; intro re-plays between cycles when both gap and intro are set.
    var result = introBars.slice();
    for (var i = 0; i < repeats; i++){
      if (i > 0){
        result = result.concat(gapBars);
        if (gapBars.length && introBars.length) result = result.concat(introBars);
      }
      result = result.concat(tuneBars);
    }
    return result;
  }
  // Return a copy of opts where opts.melody.body is extended with rest bars for the
  // intro and repeated once per cycle, so it stays in sync with allBars.
  function buildPlayOpts(opts, allBars, cbars, M){
    if (!opts.melody || !opts.melody.body) return opts;
    var repeats = Math.max(1, parseInt(opts.repeats, 10) || 1);
    var order = computePlayOrder(cbars);
    var gapLen = opts.gapBars || 0;
    var intro = opts.intro || "none";
    var introLen = intro === "count-in-1" ? 1 : intro === "count-in-2" ? 2
      : intro === "last-2" ? Math.min(2, cbars.length)
      : intro === "last-4" ? Math.min(4, cbars.length) : 0;
    if (introLen === 0 && repeats === 1 && order.length === cbars.length) return opts;
    var restStr = "z" + M.barE;
    var melBars = opts.melody.body.split("|").map(function(s){ return s.trim(); }).filter(Boolean);
    var full = [];
    for (var ii = 0; ii < introLen; ii++) full.push(restStr); // melody silent during intro
    for (var r = 0; r < repeats; r++){
      if (r > 0){
        for (var g = 0; g < gapLen; g++) full.push(restStr); // silent during gap
        if (gapLen > 0 && introLen > 0) for (var ii = 0; ii < introLen; ii++) full.push(restStr); // silent during re-intro
      }
      for (var k = 0; k < order.length; k++) full.push(melBars[order[k]] || restStr);
    }
    var newMel = { body: full.join(" | "), program: opts.melody.program, vol: opts.melody.vol };
    var newOpts = {};
    for (var p in opts) if (Object.prototype.hasOwnProperty.call(opts, p)) newOpts[p] = opts[p];
    newOpts.melody = newMel;
    return newOpts;
  }

  // ---- notation: PIANO grand staff (RH = triad, LH = bass), styled rhythm ----
  // Generate a walking bass ABC string for one bar.
  // Produces one quarter-note note per beat: root on beat 1, chord tones on inner beats,
  // chromatic approach note (half step below next chord root) on the last beat.
  function walkingBassBar(bar, nextBar, baF, M, ctx, transpose, dpre, timeFeel){
    if (!baF) return "z" + barLenOf(bar, M);
    var ms = {}, len = barLenOf(bar, M);
    var ons = chordOnsetsE(bar, M);
    var nextOns = nextBar ? chordOnsetsE(nextBar, M) : [];
    var nextSym = nextOns.length ? nextOns[0].sym : null;
    var beats = M.beats, beatE = M.beatE;

    function symAtE(e){ var s = null; for (var k = 0; k < ons.length; k++){ if (ons[k].onsetE <= e + 1e-6) s = ons[k].sym; } return s; }
    function chordTones(sym){
      if (!sym) return null;
      var r = rootPc(sym); if (r == null) return null;
      r = ((r + (transpose || 0)) % 12 + 12) % 12;
      var q = quality(sym), ivs = (TRIAD[q] || TRIAD.maj).slice();
      if (has7(sym)) ivs.push(10);              // dominant/minor 7th (11 for maj7 is rare in bass lines)
      return ivs.map(function(iv){ return 36 + ((r + iv) % 12); }); // place root in octave 2
    }

    var isHalf = timeFeel === "half";
    var lastActiveBeat = isHalf ? (beats % 2 === 0 ? beats - 2 : beats - 1) : beats - 1;
    var parts = [], prevMidi = null;
    for (var beat = 0; beat < beats; beat++){
      var posE = beat * beatE;
      if (posE >= len) break;
      if (isHalf && beat % 2 !== 0){ parts.push("z" + beatE); continue; }
      var sym = symAtE(posE);
      if (!sym){ parts.push("z" + beatE); continue; }
      var ct = chordTones(sym);
      if (!ct){ parts.push("z" + beatE); continue; }

      var isLast = (beat === lastActiveBeat);
      var midi;
      if (isLast && nextSym){
        var nct = chordTones(nextSym);
        if (nct){
          var nRoot = nct[0];
          if (prevMidi !== null){ while (nRoot - prevMidi > 7) nRoot -= 12; while (prevMidi - nRoot > 6) nRoot += 12; }
          midi = nRoot - 1;                     // half step below next root
          if (midi === ct[0]) midi = nRoot + 1; // if same as current root, go above instead
        } else { midi = ct[0]; }
      } else if (beat === 0){ midi = ct[0];                           // downbeat: root
      } else if (beat === 1){ midi = ct[2] || ct[1];                  // beat 2: 5th (or 3rd)
      } else if (beat === 2 && beats === 4){ midi = ct[3] || ct[1];  // beat 3 in 4/4: 7th or 3rd
      } else { midi = ct[beat % ct.length] || ct[0]; }               // other beats: cycle chord tones

      // Smooth voice leading: stay within a sixth of the previous note, clamp to bass register
      if (prevMidi !== null){ while (midi - prevMidi > 7) midi -= 12; while (prevMidi - midi > 6) midi += 12; }
      while (midi > 52) midi -= 12;
      while (midi < 33) midi += 12;

      var sl = { pos: posE, dur: beatE };
      var sm2 = (ctx && !transpose) ? chordSpellingMap(sym) : null;
      parts.push(dpre("bass", sl, baF) + noteTok(midi, sm2, ctx, ms) + beatE);
      prevMidi = midi;
    }
    return parts.length ? parts.join(" ") : "z" + len;
  }

  function toAbcPiano(parsed, opts){
    var M = metrics(parsed), transpose = opts.transpose || 0, tempo = opts.tempo || parsed.tempoQ || 100;
    var ctx = keyContext(parsed, transpose), prog = opts.program == null ? 0 : opts.program;
    var chF = volFrac(opts, "chords"), baF = volFrac(opts, "bass"), drF = volFrac(opts, "drums");
    // Separate drum pattern: opts.drumPattern overrides the style's bundled drum. "none" = silent.
    var drumId = (opts.drumPattern != null) ? opts.drumPattern : opts.style;
    var drumsOn = (drumId !== "none") && (opts.drums !== false) && drF > 0;
    // Auto-fill: insert fill groove on last bar of every fillEvery bars (default 4, 0 = off).
    var fillEvery = opts.fillEvery != null ? opts.fillEvery : 4;
    var fillGroove = (opts.drumFill && opts.drumFill !== "none" && DRUM_FILLS[opts.drumFill])
      ? DRUM_FILLS[opts.drumFill].groove : null;
    var fillAt = (fillGroove && drumsOn && fillEvery > 0)
      ? function(bi){ return (bi + 1) % fillEvery === 0 ? fillGroove : null; } : null;
    function chordSmap(sym){ return (ctx && !transpose) ? chordSpellingMap(sym) : null; }
    var art = opts.articulation == null ? null : opts.articulation;
    function dpre(role, sl, frac){ return opts.dynamics ? "!" + dynScaled(role, sl, M, frac) + "!" : ""; }
    var isWalk = !!(STYLES[opts.style] && STYLES[opts.style].walk);
    // Walk style: RH uses Charleston comping (chord on beat 1 + upbeat of 2), LH walks.
    var walkRhStyle = isWalk ? "charleston" : opts.style;
    function rh(bar, barIdx){ var isLast = barIdx === allBars.length - 1;
      var ms = {}; return emitVoice(barHits(bar, walkRhStyle, M, opts.timeFeel, isLast),
      function (sl){ return chF > 0 && (sl.chord || sl.arp != null); },
      function (sl, dur){ var m = chordMidis(sl.sym, transpose); if (!m) return "z" + dur; var sm = chordSmap(sl.sym);
        if (sl.arp != null){ var tone = m.voicing[sl.arp % m.voicing.length] + (sl.oct || 0); return dpre("arp", sl, chF) + noteTok(tone, sm, ctx, ms) + dur; }
        var notes = m.voicing.map(function (x){ return noteTok(x, sm, ctx, ms); });
        return dpre("chord", sl, chF) + (notes.length > 1 ? "[" + notes.join("") + "]" : notes[0]) + dur; }, M, art); }
    function lh(bar, barIdx){ var isLast = barIdx === allBars.length - 1;
      if (isWalk) return walkingBassBar(bar, isLast ? null : (allBars[barIdx + 1] || null), baF, M, ctx, transpose, dpre, opts.timeFeel);
      var ms = {}; return emitVoice(barHits(bar, opts.style, M, opts.timeFeel, isLast),
      function (sl){ return baF > 0 && sl.bass; },
      function (sl, dur){ var m = chordMidis(sl.sym, transpose); if (!m) return "z" + dur;
        return dpre("bass", sl, baF) + noteTok(m.bass, chordSmap(sl.sym), ctx, ms) + dur; }, M, art); }
    var cbars = barsWithCarryover(parsed.bars);
    var allBars = buildAllBars(cbars, M, opts);
    var pOpts = buildPlayOpts(opts, allBars, cbars, M);
    var isComp = M.d >= 8 && M.beats % 3 === 0 && M.beats >= 6;
    var drumDisp = opts.showDrums && !opts.dynamics && drumsOn
      && (M.beats <= 4 || isComp || !!M.beatGrouping); // grouping unlocks irregular meters
    var hdF = volFrac(opts, "handDrums");
    var handId = (opts.handPattern && opts.handPattern !== "none") ? opts.handPattern : null;
    var handOn = handId && hdF > 0;
    var handDisp = opts.showHandDrums && !opts.dynamics && handOn
      && (M.beats <= 4 || isComp || !!M.beatGrouping);
    var scoreStr = (drumDisp && handDisp) ? "%%score {1 2} drums hdrums"
                 : drumDisp  ? "%%score {1 2} drums"
                 : handDisp  ? "%%score {1 2} hdrums"
                 :             "%%score {1 2}";
    if (opts.percOnly && (drumDisp || handDisp)){
      var percHead = ["X:1","T:Percussion","M:" + M.meterStr,"L:1/8","Q:1/4=" + tempo, scoreStr];
      if (drumsOn || handOn) percHead = percHead.concat(drumHeader(M, drumsOn ? drumId : null, drF, opts.timeFeel, handOn ? handId : null, hdF));
      var percVoices = [];
      if (drumDisp) percVoices = percVoices.concat(drumVoiceLines(M, drumId, allBars, opts.timeFeel, fillAt));
      if (handDisp) percVoices = percVoices.concat(handDrumVoiceLines(M, allBars, opts.timeFeel, handId));
      return percHead.concat(["K:" + (ctx ? ctx.keyAbc : "C")]).concat(percVoices).join("\n");
    }
    var rhBody = voiceBodyMixed(allBars, rh, M, drumId, drumsOn ? drF : 0, fillAt, opts.timeFeel, handOn ? handId : null, handOn ? hdF : 0);
    var lhBody = voiceBodyMixed(allBars, lh, M, drumId, drumsOn ? drF : 0, fillAt, opts.timeFeel, handOn ? handId : null, handOn ? hdF : 0);
    var head = ["X:1","T:Piano","M:" + M.meterStr,"L:1/8","Q:1/4=" + tempo,
                scoreStr, "%%MIDI program " + prog];
    if (opts.dynamics) head.push("%%MIDI nobeataccents");
    if (drumsOn || handOn) head = head.concat(drumHeader(M, drumsOn ? drumId : null, drF, opts.timeFeel, handOn ? handId : null, hdF));
    var voices = melodyVoiceLines(pOpts).concat(['V:1 clef=treble name="R.H."', rhBody, 'V:2 clef=bass name="L.H."', lhBody]);
    if (drumDisp) voices = voices.concat(drumVoiceLines(M, drumId, allBars, opts.timeFeel, fillAt));
    if (handDisp) voices = voices.concat(handDrumVoiceLines(M, allBars, opts.timeFeel, handId));
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
    var chF = volFrac(opts, "chords"), baF = volFrac(opts, "bass"), drF = volFrac(opts, "drums"), hdF = volFrac(opts, "handDrums");
    function voiceBody(bi, bar, role, octShift, isBass){ var ms = {}, frac = isBass ? baF : chF;
      return emitVoice(barHits(bar, opts.style, M, opts.timeFeel, bi === allBars.length - 1),
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
    var drumId = (opts.drumPattern != null) ? opts.drumPattern : opts.style;
    var drumsOn = (drumId !== "none") && (opts.drums !== false) && drF > 0;
    var handId = (opts.handPattern && opts.handPattern !== "none") ? opts.handPattern : null;
    var handOn = handId && hdF > 0;
    if (drumsOn || handOn) lines = lines.concat(drumHeader(M, drumsOn ? drumId : null, drF, opts.timeFeel, handOn ? handId : null, hdF));
    lines.push("K:" + (ctx ? ctx.keyAbc : "C"));
    lines = lines.concat(melodyVoiceLines(pOpts));
    defs.forEach(function (vd, i){ lines.push('V:' + (i+1) + ' clef=' + vd.clef + ' name="' + vd.nm + '"');
      if (vd.mt) lines.push("%%MIDI transpose " + vd.mt);
      lines.push(voiceBodyMixed(allBars, function(bar, bi){ return voiceBody(bi, bar, vd.role, vd.oct, vd.role === "b"); }, M, drumId, drumsOn ? drF : 0, null, opts.timeFeel, handOn ? handId : null, handOn ? hdF : 0)); });
    var isCompSatb = M.d >= 8 && M.beats % 3 === 0 && M.beats >= 6;
    var showRange = M.beats <= 4 || isCompSatb || !!M.beatGrouping;
    var drumDisp  = opts.showDrums     && !opts.dynamics && drumsOn && showRange;
    var handDisp  = opts.showHandDrums && !opts.dynamics && handOn  && showRange;
    if (opts.percOnly && (drumDisp || handDisp)){
      var pScoreStr = (drumDisp && handDisp) ? "%%score drums hdrums"
                    : drumDisp ? "%%score drums" : "%%score hdrums";
      var pHead = ["X:1","T:Percussion","M:" + M.meterStr,"L:1/8","Q:1/4=" + tempo, pScoreStr];
      if (drumsOn || handOn) pHead = pHead.concat(drumHeader(M, drumsOn ? drumId : null, drF, opts.timeFeel, handOn ? handId : null, hdF));
      var pVoices = [];
      if (drumDisp) pVoices = pVoices.concat(drumVoiceLines(M, drumId, allBars, opts.timeFeel));
      if (handDisp) pVoices = pVoices.concat(handDrumVoiceLines(M, allBars, opts.timeFeel, handId));
      return pHead.concat(["K:" + (ctx ? ctx.keyAbc : "C")]).concat(pVoices).join("\n");
    }
    if (drumDisp) lines = lines.concat(drumVoiceLines(M, drumId, allBars, opts.timeFeel));
    if (handDisp) lines = lines.concat(handDrumVoiceLines(M, allBars, opts.timeFeel, handId));
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

  // Filter STYLES to those compatible with the given meter string (e.g. "4/4", "3/4").
  // Styles with no meter field work in any time signature.
  function stylesFor(meterStr){
    var keys = Object.keys(STYLES);
    if (meterStr){
      var m = /(\d+)\/(\d+)/.exec(meterStr);
      if (m){
        var cat = meterCategory(parseInt(m[1], 10), parseInt(m[2], 10));
        keys = keys.filter(function(id){
          var st = STYLES[id]; if (!st.meter) return true;
          var sm = /(\d+)\/(\d+)/.exec(st.meter); if (!sm) return true;
          return meterCategory(parseInt(sm[1],10), parseInt(sm[2],10)) === cat;
        });
      }
    }
    return keys.map(function(k){ return { id:k, label:STYLES[k].label }; });
  }
  // Filter drum patterns / fills to those compatible with the given meter string.
  function drumPatternsFor(meterStr){
    var cat = "duple";
    if (meterStr){ var m = /(\d+)\/(\d+)/.exec(meterStr); if (m) cat = meterCategory(parseInt(m[1],10), parseInt(m[2],10)); }
    return Object.keys(DRUM_PATTERNS).filter(function(id){ return DRUM_PATTERNS[id].meters.indexOf(cat) >= 0; })
      .map(function(id){ return { id:id, label:DRUM_PATTERNS[id].label, genre:DRUM_PATTERNS[id].genre||"" }; });
  }
  function drumFillsFor(meterStr){
    var cat = "duple";
    if (meterStr){ var m = /(\d+)\/(\d+)/.exec(meterStr); if (m) cat = meterCategory(parseInt(m[1],10), parseInt(m[2],10)); }
    return Object.keys(DRUM_FILLS).filter(function(id){ return DRUM_FILLS[id].meters.indexOf(cat) >= 0; })
      .map(function(id){ return { id:id, label:DRUM_FILLS[id].label }; });
  }
  function handPatternsFor(meterStr){
    var cat = "duple";
    if (meterStr){ var m = /(\d+)\/(\d+)/.exec(meterStr); if (m) cat = meterCategory(parseInt(m[1],10), parseInt(m[2],10)); }
    return Object.keys(HAND_PATTERNS).filter(function(id){ return HAND_PATTERNS[id].meters.indexOf(cat) >= 0; })
      .map(function(id){ return { id:id, label:HAND_PATTERNS[id].label }; });
  }

  global.Arranger = {
    styles: stylesFor,           // stylesFor(meterStr?) → [{id,label}] filtered by meter
    notations: function (){ return NOTATIONS.slice(); },
    drumPatterns: drumPatternsFor,  // drumPatternsFor(meterStr?) → [{id,label,genre}]
    drumFills: drumFillsFor,        // drumFillsFor(meterStr?) → [{id,label}]
    handPatterns: handPatternsFor,  // handPatternsFor(meterStr?) → [{id,label}]
    meterCategory: meterCategory,   // meterCategory(n, d) → 'duple'|'triple'|'compound'
    toAbc: toAbc,
    play: play, stop: stop
  };
})(typeof window !== "undefined" ? window : globalThis);
