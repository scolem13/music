// harmony.js — chord symbols, chord scales and comping voicings for the jazz band engine.
// Pure data + functions (no audio, no DOM): the bass and comping parts are built on it,
// and it loads in plain Node for testing.
//
//   BandHarmony.parseChord(sym, transpose)  -> Chord (never throws)
//       { sym, label, nc, unknown, root, bass, slash, quality, third, fifth, seventh, sixth,
//         sus, ext, add9, six9, b9, s9, s11, b5, s5, b13, alt, tones[], scale[], key }
//       root/bass are pitch classes AFTER transposition; intervals are semitones above the
//       root (null = absent). quality: maj | min | dom | hdim | dim | aug | sus | power.
//       `unknown` = the suffix had text we could not read (a word, not a chord).
//   BandHarmony.chordScale(chord)           -> [semitones above the root] for passing tones
//   BandHarmony.voicing(chord, style, prev, inst) -> ascending MIDI notes, voice-led from `prev`
//       piano styles: "rootless" (four-note A/B left-hand shapes) | "guide" (3rd + 7th) | "shell" (root, 3rd, 7th)
//         | "standard" (close position) | "drop2" | "drop3"   (shell, standard, drop2, drop3 from voicings.js
//         when it has them; shell and standard fall back to the tables below)
//       guitar styles (inst "guitar"): "shell3" | "drop2" | "drop3" | "triad3" (from voicings.js),
//       and "triadvl" | "uppervl": triads voice-led string by string on strings 4-3-2
//   BandHarmony.styleList(inst)            -> [{ id, label }] the voicing styles to offer for "piano" | "guitar"
//       (ChordVoicings.styles minus the sheet-only ones, plus whichever band styles it lacks)
//   BandHarmony.defaultStyle(inst)         -> "rootless" | "shell3"
//   BandHarmony.hasStyle(inst, id)         -> true when `id` is one of styleList(inst)
//   BandHarmony.meterInfo(n, d)            -> { n, d, compound, beats, per }: 6/8, 9/8 and 12/8 are
//       compound (beats = dotted quarters, per = 3 eighths each); other meters count their lower note
//   BandHarmony.buildForm(parsed, transpose)-> [{ src, beats, chords:[{pos, chord}], meter:{n, d}, compound }]
//       TuneChart.parse output -> the bars the band plays, in play order (repeats expanded).
//   BandHarmony.pinMap(form, pins)         -> { "<form bar index>:<beat>": midis } for comp.js's opts.pins, from
//       [{ bar: written bar index, pos, midis }] (a written bar that plays twice is pinned both times)
//   BandHarmony.asPlayed(bars, o)          -> [{ sym, midis, played }] one entry per chord of the form, in order,
//       from bar records (the player's onBarEvents): the notes of the first comp event that sounded the chord
//       (played: true), else a fresh voicing in style o.style / o.inst (played: false)
//   BandHarmony.chordAt(chords, pos)        -> the chord sounding at beat `pos` (or null)
//   BandHarmony.sameChord(a, b), .noteName(midi), .pcName(pc), .STYLES (voicing tables)
//
// Transposition is applied to pitch classes BEFORE voicing, so every key is voiced in the
// same register instead of sliding already-voiced notes up and down.

(function (global) {
  var NAT = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
  var FLAT = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];

  function mod12(n){ return ((n % 12) + 12) % 12; }
  function pcName(pc){ return FLAT[mod12(pc)]; }
  function noteName(midi){ return FLAT[mod12(midi)] + (Math.floor(midi / 12) - 1); }
  function accOf(s){ var a = 0; for (var i = 0; i < s.length; i++) a += (s[i] === "#" || s[i] === "♯") ? 1 : -1; return a; }

  // ---- chord symbol parser ----
  function ncChord(sym, unknown){
    return { sym: sym, label: "N.C.", nc: true, unknown: !!unknown, root: 0, bass: 0, slash: false,
      quality: "nc", third: null, fifth: null, seventh: null, sixth: null, sus: 0, ext: 0,
      add9: false, six9: false, b9: false, s9: false, s11: false, b5: false, s5: false, b13: false,
      alt: false, tones: [], scale: [], key: "nc" };
  }

  // Read the suffix as a run of tokens in any order (quality words, stacked extension
  // numbers like "91113", alterations like "b9#5"). Anything left over means it was a
  // word ("Fine", "Fast") rather than a chord.
  function scanSuffix(s){
    var f = { maj:false, maj7:false, min:false, dim:false, hdim:false, aug:false, sus:0, alt:false,
              power:false, other:false, nums:{}, alts:{}, adds:{}, left:"" };
    var i = 0, m;
    while (i < s.length){
      var r = s.slice(i);
      if ((m = /^[\s(),]+/.exec(r))){ i += m[0].length; continue; }
      if ((m = /^other/.exec(r))){ f.other = true; i += m[0].length; continue; }
      if ((m = /^power/.exec(r))){ f.power = true; i += m[0].length; continue; }
      if ((m = /^(maj|Maj|MAJ|ma(?=\d)|M(?![a-z]))/.exec(r))){ f.maj = true; i += m[0].length; continue; }
      if ((m = /^[Δ∆^]/.exec(r))){ f.maj = true; f.maj7 = true; i += 1; continue; }   // triangle = maj7
      if ((m = /^(min|Min|MIN|mi(?=\d|$)|m)/.exec(r))){ f.min = true; i += m[0].length; continue; }
      if ((m = /^(dim|°|o(?![a-z]))/.exec(r))){ f.dim = true; i += m[0].length; continue; }
      if ((m = /^(ø|Ø|h(?=7|$))/.exec(r))){ f.hdim = true; i += m[0].length; continue; }
      if ((m = /^sus\s*([24])?/.exec(r))){ f.sus = m[1] ? parseInt(m[1], 10) : 4; i += m[0].length; continue; }
      if ((m = /^add\s*(13|11|9|6|4|2)/.exec(r))){ f.adds[m[1]] = true; i += m[0].length; continue; }
      if ((m = /^alt/.exec(r))){ f.alt = true; i += m[0].length; continue; }
      if ((m = /^aug/.exec(r))){ f.aug = true; i += m[0].length; continue; }
      if ((m = /^([b#♭♯])(13|11|10|9|7|6|5|4|3|2|1)/.exec(r))){
        f.alts[((m[1] === "#" || m[1] === "♯") ? "#" : "b") + m[2]] = true; i += m[0].length; continue; }
      if ((m = /^\+(?=5|9|11)/.exec(r))){ s = s.slice(0, i) + "#" + s.slice(i + 1); continue; }     // "7+9" = #9
      if (r[0] === "+"){ f.aug = true; i += 1; continue; }
      if ((m = /^-(?=5|9|13)/.exec(r)) && i > 0){ s = s.slice(0, i) + "b" + s.slice(i + 1); continue; } // "7-5" = b5
      if (r[0] === "-"){ f.min = true; i += 1; continue; }
      if ((m = /^(13|11|9|7|6|5|4|3|2|1)/.exec(r))){ f.nums[m[1]] = true; i += m[0].length; continue; }
      f.left += r[0]; i += 1;
    }
    return f;
  }

  function parseChord(sym, transpose){
    var raw = String(sym == null ? "" : sym).trim();
    var t = mod12(Math.round(transpose || 0));
    if (raw === "" || /^n\.?\s*c\.?$/i.test(raw)) return ncChord(raw, false);
    var m = /^([A-G])([#b♯♭]*)([\s\S]*)$/.exec(raw);
    if (!m) return ncChord(raw, true);
    var root = mod12(NAT[m[1]] + accOf(m[2]) + t), rest = m[3], bass = root, slash = false;
    if (/^\s*n\.?\s*c\.?\s*$/i.test(rest)) return ncChord(raw, false);  // "GN.C." (MusicXML import) = no chord
    rest = rest.replace(/6\s*\/\s*9/g, "69");                       // "6/9" is a chord, not a slash bass
    var sm = /\/\s*([A-G])([#b♯♭]*)\s*$/.exec(rest);
    if (sm){ bass = mod12(NAT[sm[1]] + accOf(sm[2]) + t); slash = bass !== root; rest = rest.slice(0, sm.index); }
    rest = rest.replace(/\/\s*$/, "");
    var f = scanSuffix(rest), N = f.nums, A = f.alts;

    var ext = N[13] ? 13 : N[11] ? 11 : N[9] ? 9 : N[7] ? 7 : 0;
    var six9 = !!(N[6] && N[9] && !N[7] && !N[11] && !N[13]);
    var has7 = (ext >= 7 && !six9) || f.maj7;
    var hdim = f.hdim || (f.min && has7 && A.b5 && !f.maj) || (f.dim && f.min && !!N[7]);
    var dim = (f.dim || f.other) && !hdim;             // MusicXML kind "other" is a passing dim7 in this library
    var min = f.min && !hdim && !dim;
    var b9 = !!(A.b9 || A.b2 || f.alt), s9 = !!(A["#9"] || A["#2"] || f.alt);
    var s11 = !!(A["#11"] || A["#4"] || A["#1"]);
    var power = f.power || (!!N[5] && !ext && !N[6] && !f.maj && !f.min && !f.dim && !f.hdim && !f.aug
                            && !f.sus && !f.alt && !Object.keys(A).length);
    var sus = f.sus || (N[4] ? 4 : 0);
    if (!sus && N[11] && !min && !hdim && !dim && !f.maj && !s11) sus = 4;   // C11 is played as C9sus4

    var third = (min || dim || hdim || A.b3) ? 3 : 4;
    if (sus || power) third = null;
    var fifth = (dim || hdim || A.b5 || f.alt) ? 6 : (f.aug || A["#5"]) ? 8 : 7;
    var seventh = null;
    if (dim) seventh = (has7 || f.other) ? 9 : null;
    else if (hdim) seventh = 10;
    else if (f.maj && has7) seventh = 11;
    else if (has7 || A.b7) seventh = 10;
    else if ((b9 || s9) && !min && !power) seventh = 10;             // an altered 9th implies a dominant
    var sixth = N[6] ? 9 : null;

    var quality = power ? "power" : sus ? "sus" : dim ? "dim" : hdim ? "hdim" : min ? "min"
      : seventh === 10 ? "dom" : (fifth === 8 && seventh == null && !f.maj) ? "aug" : "maj";
    var isDom = quality === "dom" || (quality === "sus" && seventh === 10);
    var c = {
      sym: raw, label: "", nc: false, unknown: /[^b#\s]/.test(f.left),
      root: root, bass: bass, slash: slash, quality: quality,
      third: third, fifth: fifth, seventh: seventh, sixth: sixth, sus: sus, ext: ext,
      add9: !!(f.adds[9] || f.adds[2] || N[2]), six9: six9,
      b9: b9 && (isDom || min), s9: s9 && isDom, s11: s11,
      b5: !!A.b5 && !dim && !hdim, s5: !!(f.aug || A["#5"]),
      b13: !!(A.b13 || f.alt || (A.b6 && isDom)), alt: f.alt
    };
    // bass-line chord tones: root, 3rd (or the sus note), 5th, 7th (or 6th)
    var tones = [0];
    if (third != null) tones.push(third); else if (sus) tones.push(sus === 2 ? 2 : 5);
    tones.push(fifth);
    if (seventh != null) tones.push(seventh); else if (sixth != null) tones.push(sixth);
    c.tones = tones;
    c.scale = chordScale(c);
    c.key = [root, bass, quality, third, fifth, seventh, sixth, sus, +c.b9, +c.s9, +c.s11, +c.b5, +c.s5, +c.b13, +c.six9].join(":");
    c.label = pcName(root) + rest.trim() + (sm ? "/" + pcName(bass) : "");
    return c;
  }

  function sameChord(a, b){ return !!a && !!b && a.key === b.key; }

  // ---- chord scales (for bass passing tones) ----
  function chordScale(c){
    var s;
    switch (c.quality){
      case "dom":
        if (c.alt || (c.s9 && (c.s5 || c.b13)) || (c.b5 && c.s5)) s = [0,1,3,4,6,8,10];       // altered
        else if (c.b9 && (c.s9 || (c.ext === 13 && !c.b13))) s = [0,1,3,4,6,7,9,10];            // half-whole
        else if (c.b9) s = [0,1,4,5,7,8,10];                                                    // mixolydian b9 b13
        else if (c.s9) s = [0,3,4,5,7,9,10];                                                    // mixolydian with #9
        else if (c.s5 && !c.b5) s = [0,2,4,6,8,10];                                             // whole tone
        else if (c.b13) s = [0,2,4,5,7,8,10];
        else if (c.s11 || c.b5) s = [0,2,4,6,7,9,10];                                           // lydian dominant
        else s = [0,2,4,5,7,9,10];                                                              // mixolydian
        break;
      case "sus": s = c.seventh != null ? (c.b9 ? [0,1,5,7,8,10] : [0,2,5,7,9,10]) : [0,2,5,7,9]; break;
      case "maj": s = c.s11 ? [0,2,4,6,7,9,11] : c.fifth === 8 ? [0,2,4,6,8,9,11] : [0,2,4,5,7,9,11]; break;
      case "min":
        if (c.seventh === 11) s = [0,2,3,5,7,9,11];                                             // melodic minor
        else if (c.b9) s = [0,1,3,5,7,8,10];                                                    // phrygian
        else if (c.seventh === 10 || c.sixth != null) s = [0,2,3,5,7,9,10];                     // dorian
        else s = [0,2,3,5,7,8,10];                                                              // bare triad: aeolian
        if (c.fifth === 8) s = [0,2,3,5,8,10];
        break;
      case "hdim": s = [0,1,3,5,6,8,10]; break;                                                 // locrian
      case "dim":  s = [0,2,3,5,6,8,9,11]; break;                                               // whole-half
      case "aug":  s = [0,2,4,6,8,10]; break;
      default:     s = [0,2,5,7,9];                                                             // power: no 3rd, no 7th
    }
    var seen = {}, out = [];
    s.concat(c.tones || []).forEach(function (iv){ iv = mod12(iv); if (!seen[iv]){ seen[iv] = 1; out.push(iv); } });
    return out.sort(function (a, b){ return a - b; });
  }

  // ---- voicings ----
  // A form is the list of chord degrees from the bottom note up. Degrees are resolved
  // against the chord, so one "dom" row covers 7, 9, 13, 7b9, 7#9, 7#5, 7#11 and alt.
  // To add an instrument, add a style: its own forms, register and (optionally) an
  // accept(notes) test for playability (e.g. guitar strings/frets).
  var STYLES = {
    rootless: { lo: 48, hi: 74, centre: 60, forms: {
      dom:   [["3","13","7","9"], ["7","9","3","13"]],
      sus7:  [["4","13","7","9"], ["7","9","4","13"]],
      maj7:  [["3","5","7","9"],  ["7","9","3","5"]],
      maj6:  [["3","5","6","9"],  ["6","9","3","5"]],      // also bare major triads
      min7:  [["3","5","7","9"],  ["7","9","3","5"]],      // also bare minor triads
      min6:  [["3","5","6","9"],  ["6","9","3","5"]],
      hdim:  [["3","5","7","R"],  ["7","R","3","5"]],
      dim:   [["R","3","5","bb7"], ["3","5","bb7","R"], ["5","bb7","R","3"], ["bb7","R","3","5"]],
      aug:   [["3","5","R"], ["5","R","3"], ["R","3","5"]],
      sus:   [["4","5","R","9"],  ["R","9","4","5"]],
      sus2:  [["R","2","5"], ["5","R","2"]],
      power: [["R","9","5"], ["5","R","9"]]
    } },
    // guide tones: the 3rd and 7th only
    guide: { lo: 48, hi: 72, centre: 58, forms: {
      dom:   [["3","7"], ["7","3"]],
      sus7:  [["4","7"], ["7","4"]],
      maj7:  [["3","7"], ["7","3"]],
      maj6:  [["3","6"], ["6","3"]],
      min7:  [["3","7"], ["7","3"]],
      min6:  [["3","6"], ["6","3"]],
      hdim:  [["3","7"], ["7","3"]],
      dim:   [["3","bb7"], ["bb7","3"]],
      aug:   [["3","5"], ["5","3"]],
      sus:   [["4","5"], ["5","4"]],
      sus2:  [["2","5"], ["5","2"]],
      power: [["R","5"], ["5","R"]]
    } },
    // shell: root, 3rd, 7th (the 6th for a 6 chord); fallback for the library's "shell"
    shell: { lo: 43, hi: 67, centre: 55, forms: {
      dom:   [["R","7","3"], ["R","3","7"]],
      sus7:  [["R","7","4"], ["R","4","7"]],
      maj7:  [["R","7","3"], ["R","3","7"]],
      maj6:  [["R","6","3"], ["R","3","6"]],
      min7:  [["R","7","3"], ["R","3","7"]],
      min6:  [["R","6","3"], ["R","3","6"]],
      hdim:  [["R","7","3"], ["R","3","7"]],
      dim:   [["R","bb7","3"], ["R","3","bb7"]],
      aug:   [["R","3","5"], ["R","5","3"]],
      sus:   [["R","4","5"], ["R","5","4"]],
      sus2:  [["R","2","5"], ["R","5","2"]],
      power: [["R","5"], ["R","5","R"]]
    } },
    // standard: the chord in close position (root position and its inversions); fallback for the library's "standard"
    standard: { lo: 48, hi: 74, centre: 61, forms: {
      dom:   [["R","3","5","7"], ["3","5","7","R"], ["5","7","R","3"], ["7","R","3","5"]],
      sus7:  [["R","4","5","7"], ["4","5","7","R"], ["5","7","R","4"], ["7","R","4","5"]],
      maj7:  [["R","3","5","7"], ["3","5","7","R"], ["5","7","R","3"], ["7","R","3","5"]],
      maj6:  [["R","3","5"], ["3","5","R"], ["5","R","3"]],
      min7:  [["R","3","5","7"], ["3","5","7","R"], ["5","7","R","3"], ["7","R","3","5"]],
      min6:  [["R","3","5","6"], ["3","5","6","R"], ["5","6","R","3"], ["6","R","3","5"]],
      hdim:  [["R","3","5","7"], ["3","5","7","R"], ["5","7","R","3"], ["7","R","3","5"]],
      dim:   [["R","3","5","bb7"], ["3","5","bb7","R"], ["5","bb7","R","3"], ["bb7","R","3","5"]],
      aug:   [["R","3","5"], ["3","5","R"], ["5","R","3"]],
      sus:   [["R","4","5"], ["4","5","R"], ["5","R","4"]],
      sus2:  [["R","2","5"], ["2","5","R"], ["5","R","2"]],
      power: [["R","5"], ["5","R"]]
    } }
  };
  // own-table styles by instrument: rootless and guide are always the band's own shapes; shell
  // and standard come from the library when it has them. Guitar is the library's alone.
  var OWN = { piano: ["rootless", "guide", "shell", "standard"], guitar: [] };
  var OWN_LABEL = { rootless: "Rootless (A/B forms)", guide: "Guide tones (3rd & 7th)", shell: "Shells (root, 3rd, 7th)", standard: "Standard (close position)" };
  var GUITAR_FALLBACK = [{ id:"shell3", label:"Shells, no 5th (three strings)" }, { id:"drop2", label:"Drop 2" },
                         { id:"drop3", label:"Drop 3" }, { id:"triad3", label:"Triads (three strings)" }];
  var DEFAULT_STYLE = { piano: "rootless", guitar: "shell3" };
  function libStyles(inst){
    var V = global.ChordVoicings, l = [];
    try { l = (V && V.styles) ? V.styles(inst) : []; } catch (e){ l = []; }
    return (l || []).filter(function (s){ return s && s.id && !s.sheetOnly; });
  }
  function libHas(inst, style){ return libStyles(inst).some(function (s){ return s.id === style; }); }
  function styleList(inst){
    inst = inst === "guitar" ? "guitar" : "piano";
    var lib = libStyles(inst).map(function (s){ return { id: s.id, label: s.label || OWN_LABEL[s.id] || s.id }; });
    if (inst === "guitar") return lib.length ? lib : GUITAR_FALLBACK.slice();
    var have = {}; lib.forEach(function (s){ have[s.id] = 1; });
    var missing = OWN.piano.filter(function (id){ return !have[id]; }).map(function (id){ return { id: id, label: OWN_LABEL[id] }; });
    return missing.concat(lib);
  }
  function hasStyle(inst, id){ return styleList(inst).some(function (s){ return s.id === id; }); }
  function defaultStyle(inst){ return DEFAULT_STYLE[inst === "guitar" ? "guitar" : "piano"]; }

  function voicingClass(c){
    switch (c.quality){
      case "dom":   return "dom";
      case "sus":   return c.seventh != null ? "sus7" : c.sus === 2 ? "sus2" : "sus";
      case "maj":   return c.seventh === 11 ? "maj7" : "maj6";
      case "min":   return (c.sixth != null && c.seventh == null) ? "min6" : "min7";
      case "hdim":  return "hdim";
      case "dim":   return "dim";
      case "aug":   return "aug";
      default:      return "power";
    }
  }
  // degree token -> semitones above the root, for this chord. `fi` = form index: when a
  // dominant carries both b9 and #9 (alt), form A takes the #9 and form B the b9.
  function degree(c, tok, fi){
    switch (tok){
      case "R":   return 0;
      case "2":   return 2;
      case "4":   return 5;
      case "3":   return c.third != null ? c.third : (c.sus === 2 ? 2 : 5);
      case "5":   if (c.quality === "maj" && c.s11) return 6;                 // maj7#11: #11 replaces the 5th
                  if (c.quality === "maj" && c.ext === 13 && c.fifth === 7) return 9;
                  return c.fifth != null ? c.fifth : 7;
      case "6":   return 9;
      case "bb7": return 9;
      case "7":   return c.seventh != null ? c.seventh : (c.quality === "maj" ? 11 : 10);
      case "9":   if (c.b9 && c.s9) return fi === 0 ? 3 : 1;
                  return c.b9 ? 1 : c.s9 ? 3 : 2;
      case "13":  return (c.b13 || c.s5) ? 8 : (c.s11 || c.b5) ? 6 : 9;
    }
    return 0;
  }
  // stack the form's pitch classes upward from the lowest allowed bottom note
  function stack(c, ivs, lo){
    var out = [], prev = null;
    ivs.forEach(function (iv){
      var pc = mod12(c.root + iv), n;
      if (prev == null){ n = lo; while (mod12(n) !== pc) n++; }
      else { n = prev + 1; while (mod12(n) !== pc) n++; }
      out.push(n); prev = n;
    });
    // a #9 sits above the major 3rd, never a semitone under it
    if (c.s9 && c.third === 4){
      var i9 = -1, i3 = -1;
      out.forEach(function (n, k){ var iv = mod12(n - c.root); if (iv === 3) i9 = k; if (iv === 4) i3 = k; });
      if (i9 >= 0 && i3 >= 0 && out[i9] < out[i3]){
        var top = Math.max.apply(null, out), n9 = out[i9]; while (n9 < top) n9 += 12;
        out[i9] = n9; out.sort(function (a, b){ return a - b; });
      }
    }
    return out;
  }
  function centreOf(v){ var s = 0; for (var i = 0; i < v.length; i++) s += v[i]; return s / v.length; }
  // total voice movement between two voicings (voice-by-voice when the sizes match)
  function motion(a, b){
    var s = 0, i;
    if (a.length === b.length){ for (i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s; }
    function near(x, arr){ var d = 99; for (var k = 0; k < arr.length; k++) d = Math.min(d, Math.abs(x - arr[k])); return d; }
    for (i = 0; i < b.length; i++) s += near(b[i], a);
    for (i = 0; i < a.length; i++) s += near(a[i], b);
    return s * 0.5 * (4 / Math.max(a.length, b.length));
  }

  // Drop-2 / drop-3 and the guitar three-string shapes come from the shared ChordVoicings
  // library (voicings.js), so the band plays the same shapes the Chord Sheet tool draws.
  // Guitar string sets are limited to comping registers (string index 0 = lowest).
  var GUITAR_SETS = { drop2: [[1,2,3,4],[2,3,4,5]], drop3: [[0,2,3,4],[1,3,4,5]],
                      shell3: [[0,2,3],[1,2,3],[2,3,4]], triad3: [[1,2,3],[2,3,4],[3,4,5]],
                      triadvl: [[2,3,4]], uppervl: [[2,3,4]] };
  function isLed(style){ return style === "triadvl" || style === "uppervl"; }
  function sharedVoicing(chord, style, prev, inst){
    var V = global.ChordVoicings; if (!V || !chord.tones || !chord.tones.length) return null;
    var spec = { root: chord.root, intervals: chord.tones }, cands, p = (prev && prev.length) ? prev : null;
    if (inst === "guitar"){
      cands = V.guitar(spec, style, { maxSpan: 4, stringSets: GUITAR_SETS[style], allPositions: isLed(style), maxFret: isLed(style) ? 12 : 15 });
      if (!cands.length) cands = V.guitar(spec, style, { maxSpan: 4 });
      var ok = cands.filter(function (c){ return c.midis[0] >= 40 && c.midis[c.midis.length - 1] <= 76 && (c.span == null || c.span <= 4); });
      if (ok.length) cands = ok;
    } else {
      cands = V.piano(spec, style, { lo: 48, hi: 77, allOctaves: true });
      var fit = cands.filter(function (c){ return c.midis[0] >= 48 && c.midis[c.midis.length - 1] <= 77; });
      if (fit.length) cands = fit;
    }
    if (!cands || !cands.length) return null;
    var best = (inst === "guitar" && isLed(style) && V.lead) ? V.lead(cands, p, 62) : V.nearest(cands, p, inst === "guitar" ? 55 : 62);
    return best ? best.midis.slice() : null;
  }

  function voicing(chord, style, prev, inst){
    if (!chord || chord.nc) return [];
    inst = inst || "piano";
    var own = OWN[inst === "guitar" ? "guitar" : "piano"];
    if ((own.indexOf(style) < 0 || style === "shell" || style === "standard") && libHas(inst, style)){
      var sv = sharedVoicing(chord, style, prev, inst); if (sv && sv.length) return sv; }
    var st = STYLES[style] || STYLES.rootless;
    var forms = st.forms[voicingClass(chord)] || st.forms.power;
    var cands = [], loose = [];
    forms.forEach(function (form, fi){
      var seen = {}, ivs = [];
      form.forEach(function (tok){ var iv = mod12(degree(chord, tok, fi)); if (!seen[iv]){ seen[iv] = 1; ivs.push(iv); } });
      var base = stack(chord, ivs, st.lo);
      for (var oct = 0; oct <= 24; oct += 12){
        var v = base.map(function (n){ return n + oct; });
        if (v[v.length - 1] > st.hi + 5) break;
        if (st.accept && !st.accept(v, chord)) continue;
        var muddy = v.length > 1 && v[1] - v[0] === 1 && v[0] < 52;           // no semitone cluster at the bottom
        var item = { v: v, fi: fi };
        if (v[v.length - 1] <= st.hi && !muddy) cands.push(item); else loose.push(item);
      }
    });
    if (!cands.length) cands = loose;
    if (!cands.length) return [];
    var best = null, bestCost = Infinity;
    cands.forEach(function (it){
      var drift = Math.abs(centreOf(it.v) - st.centre);
      var cost = (prev && prev.length) ? motion(prev, it.v) + 0.3 * drift : drift;
      cost += it.fi * 0.01;                                                    // stable tie-break
      if (cost < bestCost){ bestCost = cost; best = it; }
    });
    return best.v.slice();
  }

  // ---- chart -> form ----
  function chordAt(chords, pos){
    var c = null;
    for (var i = 0; i < (chords || []).length; i++){ if (chords[i].pos <= pos + 1e-6) c = chords[i].chord; else break; }
    return (c && !c.nc) ? c : null;
  }

  // What a beat is in a meter. 6/8, 9/8 and 12/8 are COMPOUND: the band counts dotted quarters
  // (2, 3 or 4 beats to the bar) and each beat divides in three. Everything else counts the
  // meter's own lower note.
  function meterInfo(n, d){
    n = n || 4; d = d || 4;
    var compound = d === 8 && n >= 6 && n % 3 === 0;
    return { n: n, d: d, compound: compound, beats: compound ? n / 3 : n, per: compound ? 3 : 1 };
  }

  function buildForm(parsed, transpose){
    var out = [];
    if (!parsed || !parsed.bars || !parsed.bars.length) return out;
    var order = (parsed.playOrder && parsed.playOrder.length) ? parsed.playOrder
      : parsed.bars.map(function (_, i){ return i; });
    var mN = parsed.meterN || parsed.beatsPerBar || 4, mD = parsed.meterD || 4;
    var unitL = (mN / mD) / (parsed.unitsPerBar || 1);              // the L: unit, in whole notes
    var cache = {}, carry = null;
    function chordOf(sym){ return cache[sym] || (cache[sym] = parseChord(sym, transpose)); }

    order.forEach(function (bi){
      var bar = parsed.bars[bi];
      if (!bar || bar.anacrusis) return;                            // the band comes in on bar 1
      var mt = bar.meter || { n: mN, d: mD }, mi = meterInfo(mt.n, mt.d);
      var upBeat = mi.per * (1 / mt.d) / unitL;                     // L-units per beat in this bar
      var len = bar.lengthUnits > 0 ? bar.lengthUnits / upBeat : mi.beats;
      var beats = Math.max(1, Math.round(Math.min(mi.beats, len)));
      var barUnits = beats * upBeat;

      var raw = [];
      (bar.chords || []).forEach(function (c){
        if (c.nc){ raw.push({ onset: c.onset, nc: true }); return; }
        var ch = chordOf(c.sym);
        if (ch.nc){ if (!ch.unknown) raw.push({ onset: c.onset, nc: true }); return; }
        if (ch.unknown) return;                                     // a word in quotes, not a chord
        raw.push({ onset: c.onset, chord: ch });
      });
      // several symbols stacked on one onset (MusicXML imports): share the time up to the next one
      var spread = [];
      for (var i = 0; i < raw.length; ){
        var j = i; while (j < raw.length && Math.abs(raw[j].onset - raw[i].onset) < 1e-6) j++;
        var end = j < raw.length ? raw[j].onset : Math.max(barUnits, raw[i].onset);
        for (var k = i; k < j; k++){ var e = raw[k]; spread.push({ onset: raw[i].onset + (k - i) * (end - raw[i].onset) / (j - i), nc: e.nc, chord: e.chord }); }
        i = j;
      }
      // snap to the beat; a later chord on the same beat wins
      var byBeat = {};
      spread.forEach(function (e){ var p = Math.round(e.onset / upBeat); if (p >= beats) p = beats - 1; if (p < 0) p = 0; byBeat[p] = e; });
      var chords = [];
      if (!byBeat[0] && carry) chords.push({ pos: 0, chord: carry });
      Object.keys(byBeat).map(Number).sort(function (a, b){ return a - b; }).forEach(function (p){
        var e = byBeat[p], last = chords.length ? chords[chords.length - 1].chord : null;
        if (e.nc){ carry = null; if (last && !last.nc) chords.push({ pos: p, chord: ncChord("N.C.", false) }); return; }
        carry = e.chord;
        if (last && sameChord(last, e.chord)) return;
        chords.push({ pos: p, chord: e.chord });
      });
      if (!chords.some(function (x){ return !x.chord.nc; })) chords = [];
      out.push({ src: bi, beats: beats, chords: chords, meter: { n: mt.n, d: mt.d }, compound: mi.compound });
    });
    return out;
  }

  // ---- pinned voicings + the as-played view ----
  function pinMap(form, pins){
    var map = {};
    (pins || []).forEach(function (p){
      if (!p || !p.midis || !p.midis.length) return;
      (form || []).forEach(function (fb, i){
        if (fb.src === p.bar && fb.chords.some(function (c){ return Math.abs(c.pos - p.pos) < 1e-6; })) map[i + ":" + p.pos] = p.midis.slice();
      });
    });
    return map;
  }
  function asPlayed(bars, o){
    o = o || {}; var first = {}, out = [], prev = null;
    (bars || []).forEach(function (r){ ((r.parts && r.parts.comp) || []).forEach(function (e){
      if (e && e.of != null && e.midis && e.midis.length && !first[e.of]) first[e.of] = e.midis.slice(); }); });
    (bars || []).forEach(function (r){ (r.chords || []).forEach(function (c){
      if (!c.chord || c.chord.nc) return;
      var m = first[r.index + ":" + c.pos], played = !!m;
      if (!m) m = voicing(c.chord, o.style || "rootless", prev, o.inst || "piano");
      if (m.length) prev = m;
      out.push({ sym: c.chord.sym, midis: m.slice(), played: played });
    }); });
    return out;
  }

  // Plain chart numerals: the degree of the chord's root in the key, lower-case for minor and
  // diminished chords, keeping the chord's own figures (I7, IV7, ii7, #iv dim7, VI7b9). No
  // applied-chord analysis: a blues reads I7 IV7 V7.
  var DEGREE = ["I","\u266dII","II","\u266dIII","III","IV","\u266fIV","V","\u266dVI","VI","\u266dVII","VII"];
  function roman(sym, keyPc){
    var c = parseChord(sym, 0); if (!c || c.nc || c.unknown) return null;
    var m = /^[A-G][#b\u266f\u266d]*(.*)$/.exec(sym || ""), suf = (m ? m[1] : "").replace(/\/[A-G][#b]*$/, "");
    var small = c.quality === "min" || c.quality === "hdim" || c.quality === "dim";
    var num = DEGREE[mod12(c.root - (keyPc || 0))]; if (small) num = num.toLowerCase();
    if (c.quality === "hdim") suf = "\u00f87";
    else if (c.quality === "dim") suf = suf.replace(/^(dim|\u00b0|o)/, "\u00b0");
    else if (c.quality === "min") suf = suf.replace(/^(min|mi|m(?!aj)|-)/, "");
    return num + suf.replace(/b/g, "\u266d").replace(/#/g, "\u266f");
  }

  global.BandHarmony = {
    parseChord: parseChord, chordScale: chordScale, voicing: voicing, buildForm: buildForm,
    chordAt: chordAt, sameChord: sameChord, noteName: noteName, pcName: pcName,
    voicingClass: voicingClass, motion: motion, STYLES: STYLES,
    styleList: styleList, defaultStyle: defaultStyle, hasStyle: hasStyle, pinMap: pinMap, asPlayed: asPlayed, roman: roman, meterInfo: meterInfo
  };
})(typeof window !== "undefined" ? window : globalThis);
