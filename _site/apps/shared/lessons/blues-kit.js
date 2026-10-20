// blues-kit.js — the instrument lessons on the 12-bar blues (BluesLesson). One page per instrument; each
// numbered step on the page is a <div class="bl-step"> that this file fills with fingering charts
// (LessonDiagrams), a chord chart (TuneChart) and a play button for the Backing Track band (BandPlayer).
//
//   BluesLesson.init({ instrument: "bass" | "guitar" | "piano" | "drums" | "congas" | "melody", key: <pitch class, default 5 = F> })
//
// Drums (data-part = a name from DRUMSTEPS): no diagrams. A step shows two bars of its beat and the whole chorus on a drum
// staff (BandNotation), and the band's drummer plays that groove in that step's style.
// Every drum and conga step also draws the kit or the congas from above, lit as the band plays (LessonGrooveAnim, groove-anim.js).
// Congas (data-part = a name from CONGASTEPS): the drum step's path with the conga player instead of the drummer. A step is declared
//   CONGASTEPS.name = { style, pattern, tempo, drums?, stops?, at? }: the band style it is played in (chacha | boogaloo | montuno, the Feel menu),
//   the conga pattern (a PATTERNS id of congas.js), its tempo, "none" in `drums` takes the drummer out (so the congas are heard bare),
//   `stops` = bar numbers (1 counts the first) that are stop time, `at` = the first of the two bars written large. data-chart takes
//   "vamp" (four bars of F7) or "watermelon" (the 16-bar form) as well as the 12-bar charts. The staff is the "Cga." staff of BandNotation.
// A drum step may also say (the hi-hat lesson, BluesLesson.init({ instrument: "drums", feels: "hihat" })):
//   DRUMSTEPS.name = { style, groove, tempo?, chart?, at?, accents?, six?, fillBars?, chokeBars?, endChoke? }: `style` is a Feel-menu id (rock | strum | swing there), `groove` a
//   GROOVES id of drums.js, `tempo` where the step starts (the first time), `chart` "vamp" (four bars of F7) or a 12-bar chart (data-chart wins), `at` the
//   first of the two bars written large (default 2), `accents: true` draws a > over the louder hi-hat notes (BandNotation accents), `six: true` is a
//   step of sixteenths (wider staves, two bars to a line). These go through the same path as the conga steps: nothing changes for a step that leaves them out.
//   <button data-drum-hit="hatOpen">  plays a piece of the kit ("hatOpen,hatFoot" plays them one after the other);  <div class="bl-hatkey"></div> the three hi-hat sounds engraved.
//   <div class="bl-congakey"></div>   the five strokes engraved, each head a button;  <button data-conga-hit="congaSlap">  plays one stroke.
// Melody instruments (data-part = a name from LINES; violin, saxophones, anything that plays one note at a time): a step is a
// twelve-bar line, written out with the name of each note's place in its chord underneath, which the band plays on the
// piano (bar.melody). The Instrument menu transposes: everything on the page is then in the player's WRITTEN key (chart,
// notation, the flat-7 panel) while the Key menu stays the concert key the band plays in.
//
//   <div class="bl-step" data-part="roots" data-chart="basic"></div>
//     data-part    which notes the step is about: a name from PARTS for the page's instrument (below)
//     data-chart   "basic" | "quick" | "jazz" (CHARTS)
//     data-show    the chords to draw, as written in F ("F7 Bb7 C7"); default = the chart's, the first four
//     data-view    "super" starts on the superimposed diagram (fretted instruments; the keyboard always
//                  shows one lane per chord)
//     data-bass    bass line id for the band (bass lessons), data-rhythm  comping rhythm id (guitar, piano)
//     data-tune    "closet": the step is on that tune (BluesTunes). Its melody is written above the chart, in the key of the page,
//                  and the band plays it on the piano along with the step's own part. (A melody step with data-tune IS the tune.)
//   <div class="bl-notes" data-scale="minorblues" data-on="I"></div>   a scale written out, up and down, on a chord of the key:
//                  data-scale minorblues | majorblues | mixolydian | dorian; data-on I | IV | V | ii
//   Notation is LessonScore's (score.js): the note that is sounding is lit, when abcjs plays it and while the band plays.
//   <div class="bl-scale"></div>   the major scale, the V7 chord found in it and where "flat 7" comes from, in notation
//                                  that plays (abcjs), for the home chord of the key chosen
//
// Under its diagrams a step writes the same notes on a staff (abcjs). A bass lesson also writes out the line the band's
// bass player plays (BandNotation): an example while nothing is playing, then each chorus as it starts (the player
// writes a chorus ahead and hands the bars over through onBarEvents).
// Guitar guide tones: the pair for the home chord is found near the key note, or six frets higher when that would leave
// no room below it for the IV chord. "Up a tritone" on those steps moves every shape six frets (a dominant chord's
// 3rd and 7th are a tritone apart, so the same two notes come back with their jobs swapped).
//
// A part is a function (chord, ctx) -> { notes, pin, roll }: `notes` are drawn, `pin` is what the band's
// player of that instrument plays for the chord (opts.pins: guitar and piano), `roll` is how long a click
// on the chord's name takes to climb through the notes (0 = together). Charts are written in F and
// everything follows the Key menu: notes are worked out from the chord's real root, never stored.
// Guitar and piano guide tones, shells and rootless shapes come from ChordVoicings, as on the Chord Sheet.

(function (global) {
  var CHARTS = {
    basic: 'F7|F7|F7|F7|Bb7|Bb7|F7|F7|C7|Bb7|F7|F7',
    quick: 'F7|Bb7|F7|F7|Bb7|Bb7|F7|F7|C7|Bb7|F7|C7',
    jazz:  'F7|Bb7|F7|F7|Bb7|Bb7|F7|D7|Gm7|C7|F7 D7|Gm7 C7',
    closet: 'F7|F7|F7|F7|Bb7|Bb7|F7|F7|Gm7|C7|F7|C7',          // Blues in the Closet (BluesTunes.closet.chart)
    watermelon: 'F7|F7|F7|F7|Bb7|Bb7|F7|F7|C7|Bb7|C7|Bb7|C7|Bb7|F7|F7',     // Watermelon Man: a 16-bar blues (BluesTunes.watermelon.chart)
    vamp: 'F7|F7|F7|F7'                                         // four bars on one chord, for learning a figure (congas)
  };
  var FEELS = [{ id: 'swing', label: 'Medium swing', tempo: 108 }, { id: 'doowop', label: 'Slow blues in 12/8', tempo: 60 }, { id: 'boogaloo', label: 'Straight-eighth boogaloo', tempo: 108 }];
  var FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'], SHARPN = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'], SHARP = { 2: 1, 4: 1, 7: 1, 9: 1, 11: 1 };
  var EXT = { 1: '♭9', 2: '9', 3: '♯9', 5: '11', 6: '♯11', 8: '♭13', 9: '13' };
  // the Feel menu of the conga lessons: the styles that play congas by default
  var CFEELS = [{ id: 'chacha', label: 'Cha-cha', tempo: 104 }, { id: 'boogaloo', label: 'Boogaloo (straight eighths)', tempo: 126 }, { id: 'montuno', label: 'Son montuno', tempo: 108 }];
  // the Feel menu of the hi-hat lesson: the two straight styles its steps are played in, and swing
  var HFEELS = [{ id: 'rock', label: 'Straight-eighth rock', tempo: 96 }, { id: 'strum', label: 'Acoustic strum', tempo: 96 }, { id: 'swing', label: 'Medium swing', tempo: 108 }];
  var INST = {
    bass:   { name: 'bass', sound: 'bass', tuning: [28, 33, 38, 43], strings: ['E', 'A', 'D', 'G'] },
    guitar: { name: 'guitar', sound: 'guitar', tuning: [40, 45, 50, 55, 59, 64], strings: ['E', 'A', 'D', 'G', 'B', 'E'] },
    piano:  { name: 'piano', sound: 'piano' },
    drums:  { name: 'drums' },
    congas: { name: 'congas' },
    melody: { name: 'melody', sound: 'piano' }
  };
  // The Instrument menu of the melody and improvising pages. written pitch = sounding pitch + t semitones; clef "bass" = read in
  // bass clef, moved down by whole octaves to sit on the staff; chart = the kind of scale chart the improvising lesson draws.
  var HORNS = [{ id: 'c', label: 'Violin, flute (concert pitch)', t: 0 },
               { id: 'violin', label: 'Violin', t: 0, chart: 'violin' },
               { id: 'guitar', label: 'Guitar', t: 12, chart: 'guitar', says: 'an octave lower' },
               { id: 'bass', label: 'Bass', t: 12, chart: 'bass', clef: 'bass', note: 'Written in bass clef, an octave above where a bass sounds. The piano plays it higher than that here, so it can be heard. ' },
               { id: 'piano', label: 'Piano', t: 0, chart: 'piano' },
               { id: 'concert', label: 'Flute and other concert-pitch instruments', t: 0 },
               { id: 'alto', label: 'Alto sax (E♭)', t: 9, says: 'a major sixth lower' }, { id: 'tenor', label: 'Tenor sax (B♭)', t: 14, says: 'a major ninth lower' },
               { id: 'bb', label: 'Soprano sax, trumpet, clarinet (B♭)', t: 2, says: 'a whole step lower' }, { id: 'bari', label: 'Baritone sax (E♭)', t: 21, says: 'an octave and a major sixth lower' }];
  // drum steps: the style the band plays the step in, its groove, and the bars that end with a fill
  var DRUMSTEPS = {
    quarters: { style: 'swing', groove: 'quarters' },
    ride:     { style: 'swing', groove: 'ridetime' },
    time:     { style: 'swing', groove: 'auto' },
    fills:    { style: 'swing', groove: 'auto', fillBars: { 3: 'small', 7: 'small', 11: 'large' } },
    shuffle:  { style: 'swing', groove: 'shuffle', fillBars: { 11: 'medium' } },
    slow:     { style: 'doowop', groove: 'twelve8', fillBars: { 11: 'medium' } },
    straight: { style: 'boogaloo', groove: 'auto', fillBars: { 11: 'medium' } },
    grab:     { style: 'boogaloo', groove: 'auto', fillBars: { 3: 'small', 7: 'small', 11: 'medium' }, chokeBars: [4, 8], endChoke: true },
    // the hi-hat lesson (lessons/hihat-grooves.qmd): the straight steps on four bars of F7 in the rock or strum style, the swing ones on the 12-bar blues
    hhquarters: { style: 'rock',  groove: 'hhquarters', tempo: 80,  chart: 'vamp', at: 0 },
    hheighths:  { style: 'rock',  groove: 'hheighths',  tempo: 90,  chart: 'vamp', at: 0 },
    hhaccents:  { style: 'strum', groove: 'hhaccents',  tempo: 90,  chart: 'vamp', at: 0, accents: true },
    hhoffbeats: { style: 'strum', groove: 'hhoffbeats', tempo: 96,  chart: 'vamp', at: 0 },
    hhopen:     { style: 'rock',  groove: 'hhopen',     tempo: 90,  chart: 'vamp', at: 0 },
    hhdance:    { style: 'rock',  groove: 'hhdance',    tempo: 112, chart: 'vamp', at: 0 },
    hhsix:      { style: 'rock',  groove: 'hhsix',      tempo: 66,  chart: 'vamp', at: 0, six: true },
    hhsix2:     { style: 'rock',  groove: 'hhsix2',     tempo: 66,  chart: 'vamp', at: 0, six: true },
    hhfoot2:    { style: 'swing', groove: 'ridetime',   tempo: 100, chart: 'basic', at: 0 },
    hhfoot4:    { style: 'rock',  groove: 'hhfoot4',    tempo: 90,  chart: 'vamp', at: 0 },
    hhswing:    { style: 'swing', groove: 'hhswing',    tempo: 100, chart: 'basic', at: 0 }
  };
  // conga steps: see the header. (The tumbao is built up: the two open tones, the right hand, the left hand, both, then with a band.)
  var CONGASTEPS = {
    opens:    { style: 'chacha',   pattern: 'opens',    tempo: 80,  drums: 'none', chart: 'vamp' },
    righthand: { style: 'chacha',  pattern: 'slapopen', tempo: 80,  drums: 'none', chart: 'vamp' },
    lefthand: { style: 'chacha',   pattern: 'heeltoe',  tempo: 80,  drums: 'none', chart: 'vamp' },
    tumbao:   { style: 'chacha',   pattern: 'tumbao',   tempo: 80,  drums: 'none', chart: 'vamp' },
    chacha:   { style: 'chacha',   pattern: 'tumbao',   tempo: 104, chart: 'vamp' },
    twodrums: { style: 'montuno',  pattern: 'tumbao2',  tempo: 100, chart: 'vamp' },
    // Watermelon Man (the 16-bar form)
    wopens:   { style: 'chacha',   pattern: 'opens',    tempo: 100, drums: 'none', chart: 'watermelon' },
    wright:   { style: 'chacha',   pattern: 'slapopen', tempo: 100, drums: 'none', chart: 'watermelon' },
    wtumbao:  { style: 'chacha',   pattern: 'tumbao',   tempo: 100, drums: 'none', chart: 'watermelon' },
    wbreak:   { style: 'chacha',   pattern: 'tumbao',   tempo: 100, chart: 'watermelon', stops: [14], at: 12 },
    wtune:    { style: 'chacha',   pattern: 'tumbao',   tempo: 104, chart: 'watermelon' },
    wmongo:   { style: 'chacha',   pattern: 'tumbao',   tempo: 108, chart: 'watermelon', stops: [14], at: 12 },
    wherbie:  { style: 'boogaloo', pattern: 'tumbao',   tempo: 126, chart: 'watermelon', stops: [14], at: 12 },
    wtwo:     { style: 'montuno',  pattern: 'tumbao2',  tempo: 104, chart: 'watermelon', at: 0 }
  };
  function mod12(n) { return ((n % 12) + 12) % 12; }
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function split(s) { return s.split('|'); }
  function narrow() { return (global.innerWidth || 1000) < 600; }
  function perLine() { return narrow() ? 2 : 4; }                 // bars of notation to a line: four shrink too far on a phone

  function init(cfg) {
    var cat = global.BandCatalog, H = global.BandHarmony, V = global.ChordVoicings, D = global.LessonDiagrams;
    if (!cat || !H || !V || !D || !global.BandPlayer || !global.TuneChart) return;
    var me = INST[cfg.instrument] || INST.piano, fretted = !!me.tuning;
    var isDrums = cfg.instrument === 'drums', isMelody = cfg.instrument === 'melody', isCongas = cfg.instrument === 'congas', isPerc = isDrums || isCongas;
    var hihat = isDrums && cfg.feels === 'hihat';
    var feels = isCongas ? CFEELS : hihat ? HFEELS : FEELS;
    var state = { swing: null, key: cfg.key == null ? 5 : cfg.key, feel: isCongas ? 'chacha' : hihat ? 'rock' : 'swing', tempo: isCongas ? 104 : hihat ? 96 : 108, dots: 'tone', loop: false };
    // cfg.horns = the ids the page's Instrument menu offers, in order (the first is where it starts)
    var horns = (cfg.horns || ['c', 'alto', 'tenor', 'bb', 'bari']).map(function (id) { return HORNS.filter(function (h) { return h.id === id; })[0]; }).filter(Boolean), horn = horns[0] || HORNS[0];
    if (isMelody) { try { var saved = global.localStorage.getItem('blHorn'); horns.forEach(function (h) { if (h.id === saved) horn = h; }); } catch (e) {} }
    function written() { return horn.note || (horn.t ? 'Written for ' + horn.label.toLowerCase().replace(/e♭/, 'E♭').replace(/b♭/, 'B♭') + ': it sounds ' + horn.says + ', in concert ' + FLAT[state.key] + '. ' : ''); }
    // a bass reads bass clef: how many semitones (whole octaves) a line is moved down to sit on that staff, by its lowest note
    function regShift(midis, h) { if ((h || horn).clef !== 'bass' || !midis.length) return 0; return Math.min.apply(null, midis) - 24 >= 40 ? -24 : -12; }
    function clefAbc(h) { h = h || horn; return h.clef ? ' clef=' + h.clef : ''; }
    // what the scale panels are written for: the Instrument menu on melody pages, the page's own instrument on bass, guitar and piano
    function viewHorn() { return isMelody ? horn : (HORNS.filter(function (h) { return h.id === cfg.instrument; })[0] || horn); }

    // The band plays in the concert key (state.key). What the page SHOWS is in the key the player reads: the same, except for a
    // transposing instrument.
    function semis() { var d = state.key - 5; return d > 6 ? d - 12 : d; }
    function dkey() { return mod12(state.key + horn.t); }
    function dsemis() { var d = dkey() - 5; return d > 6 ? d - 12 : d; }
    function pcName(pc) { return (SHARP[dkey()] ? SHARPN : FLAT)[mod12(pc)]; }
    function abcOf(bars) {
      var out = bars.map(function (b) { var c = b.split(' '); return c.length > 1 ? '"' + c[0] + '"z2 "' + c[1] + '"z2' : '"' + b + '"z4'; }), rows = [];
      for (var i = 0; i < out.length; i += 4) rows.push(out.slice(i, i + 4).join(' | '));
      return 'X:1\nT:Blues\nM:4/4\nL:1/4\nK:F\n' + rows.join(' |\n') + ' |]';
    }
    // a chord as written in F, in the key of the page
    function chordOf(sym) {
      var c = H.parseChord(sym, dsemis()), lib = H.libChord(c), m = /^[A-G][#b]*(.*)$/.exec(sym);
      return { sym: sym, root: lib.root, lib: lib, an: V.analyze(lib), label: pcName(lib.root) + (m ? m[1] : '').replace(/b/g, '♭').replace(/#/g, '♯') };
    }
    function home() { return { sym: 'F7', root: dkey(), lib: { root: dkey(), intervals: [0, 4, 7, 10] } }; }
    function toneName(ch, midi) {
      var off = mod12(midi - ch.root), t = ch.an.tones.filter(function (x) { return x.off === off; })[0];
      return t ? t.name.replace(/b/g, '♭').replace(/#/g, '♯') : (EXT[off] || '');
    }
    function offs(ch) { var a = ch.an; return { third: a.third ? a.third.off : 4, fifth: a.fifth ? a.fifth.off : 7, seventh: a.seventh ? a.seventh.off : 10 }; }

    // ---- fretted instruments: where the hand sits, and shapes counted from a root ----
    // The hand's home fret: the key note on the lowest string, or on the next string when that is past the 7th fret.
    function anchor() { var t = me.tuning, f = mod12(state.key - t[0]); return f > 7 ? mod12(state.key - t[1]) : f; }
    function rootSpot(pc) {
      var a = anchor(), best = null;
      [0, 1].forEach(function (s) { for (var f = 0; f <= 14; f++) if (mod12(me.tuning[s] + f) === mod12(pc)) { var d = Math.abs(f - a) - (s === 1 ? 0.1 : 0); if (!best || d < best.d) best = { string: s, fret: f, d: d }; } });
      return best;
    }
    // semitones above the root -> [strings up, frets along] on strings tuned in fourths (the lowest four of a guitar, all of a bass)
    var SHAPE = { 0: [0, 0], 3: [0, 3], 4: [1, -1], 6: [1, 1], 7: [1, 2], 8: [1, 3], 9: [2, -1], 10: [2, 0], 11: [2, 1], 12: [2, 2] };
    function spot(r, off, extra) {
      var sh = SHAPE[off] || [0, off], s = r.string + sh[0], f = r.fret + sh[1];
      if (f < 0) { s -= 1; f += 5; }
      return Object.assign({ string: s, fret: f, midi: me.tuning[s] + f, root: off === 0 || off === 12 }, extra);
    }
    function shapeOf(ch, list, softs) { var r = rootSpot(ch.root); return list.map(function (off) { return spot(r, off, softs && softs.indexOf(off) >= 0 ? { soft: true } : null); }); }
    function midisOf(notes) { return notes.map(function (n) { return n.midi; }); }
    function climb(notes) { return 0.3 * (notes.length - 1); }

    // guitar: the 3rd and 7th on one pair of strings (ChordVoicings "guide2"), the pair nearest the home chord's
    function avgFret(c) { return c.strings.reduce(function (s, x) { return s + x.fret; }, 0) / c.strings.length; }
    function pairNear(lib, set, target) {
      var cands = V.guitar(lib, 'guide2', { stringSets: [set], allPositions: true }), best = null;
      cands.forEach(function (c) { var d = Math.abs(avgFret(c) - target); if (!best || d < best.d) best = { c: c, d: d }; });
      return best && best.c;
    }
    function lowFret(c) { return Math.min.apply(null, c.strings.map(function (x) { return x.fret; })); }
    // the home chord's pair: near the key note, with room for the IV chord's pair a fret below it; `up` = six frets from there
    function homePair(set, up) {
      var lib = home().lib, c = pairNear(lib, set, Math.max(2, anchor()));
      if (c && lowFret(c) < 2) c = pairNear(lib, set, avgFret(c) + 6);
      if (c && up) { var hi = pairNear(lib, set, avgFret(c) + 6); c = hi !== c ? hi : pairNear(lib, set, avgFret(c) - 6); }
      return c;
    }
    function guidePair(ch, set, withRoot, up) {
      var ref = homePair(set, up), c = ref && pairNear(ch.lib, set, avgFret(ref));
      if (!c) return { notes: [], pin: [], roll: 0 };
      var notes = c.strings.map(function (x) { return { string: x.string, fret: x.fret, midi: x.midi }; }), pin = midisOf(notes), low = Math.min.apply(null, c.strings.map(function (x) { return x.string; })), r = null;
      for (var s = low - 1; s >= 0 && !r; s--) for (var f = 0; f <= 15; f++)                 // a root within reach, on a lower string
        if (mod12(me.tuning[s] + f) === ch.root && c.strings.every(function (x) { return Math.abs(x.fret - f) <= 2; })) { r = { string: s, fret: f, midi: me.tuning[s] + f, root: true, soft: !withRoot }; break; }
      if (r) { notes.unshift(r); if (withRoot) pin.unshift(r.midi); }
      return { notes: notes, pin: pin, roll: 0 };
    }

    // piano: registers
    function lhRoot(ch) { return 36 + ch.root; }                                             // C2 to B2
    function pianoPick(ch, style, centre) {
      var ref = V.nearest(V.piano(home().lib, style, { allOctaves: true }), null, centre);
      var pick = V.nearest(V.piano(ch.lib, style, { allOctaves: true }), ref ? ref.midis : null, centre);
      return pick ? pick.midis : [];
    }
    function hand(midis, h, extra) { return midis.map(function (m) { return Object.assign({ midi: m, hand: h }, extra); }); }

    var PARTS = {
      bass: {
        roots:  function (ch) { var n = shapeOf(ch, [0]); return { notes: n, roll: 0 }; },
        fifth:  function (ch) { var n = shapeOf(ch, [0, offs(ch).fifth, 12]); return { notes: n, roll: climb(n) }; },
        tones:  function (ch) { var o = offs(ch), n = shapeOf(ch, [0, o.third, o.fifth, o.seventh]); return { notes: n, roll: climb(n) }; },
        walk:   function (ch) { var o = offs(ch), n = shapeOf(ch, [0, o.third, o.fifth, o.seventh, 12]); return { notes: n, roll: climb(n) }; }
      },
      guitar: {
        roots:  function (ch) { var n = shapeOf(ch, [0]); return { notes: n, pin: midisOf(n), roll: 0 }; },
        tones:  function (ch) { var o = offs(ch), n = shapeOf(ch, [0, o.third, o.fifth, o.seventh], [0, o.fifth]);
                  return { notes: n, pin: midisOf(n.filter(function (x) { return !x.soft; })), roll: climb(n) }; },
        g54:    function (ch, w) { return guidePair(ch, [1, 2], false, w && w.up); },
        g43:    function (ch, w) { return guidePair(ch, [2, 3], false, w && w.up); },
        shell:  function (ch, w) { return guidePair(ch, [2, 3], true, w && w.up); }
      },
      piano: {
        roots:  function (ch) { var n = hand([lhRoot(ch)], 'L', { root: true }); return { notes: n, pin: midisOf(n), roll: 0 }; },
        tones:  function (ch) { var o = offs(ch), r = 60 + ch.root, n = [{ midi: r, hand: 'R', root: true }, { midi: r + o.third, hand: 'R' }, { midi: r + o.fifth, hand: 'R', soft: true }, { midi: r + o.seventh, hand: 'R' }];
                  return { notes: n, pin: midisOf(n), roll: 0.9 }; },
        guide:  function (ch) { var n = hand([lhRoot(ch)], 'L', { root: true }).concat(hand(pianoPick(ch, 'guide', 62), 'R')); return { notes: n, pin: midisOf(n), roll: 0 }; },
        shell:  function (ch) { var n = hand(pianoPick(ch, 'shell', 53), 'L'); n.forEach(function (x) { x.root = mod12(x.midi) === ch.root; }); return { notes: n, pin: midisOf(n), roll: 0 }; },
        rootless: function (ch) { var v = hand(pianoPick(ch, 'rootless', 58), 'L'); return { notes: [{ midi: lhRoot(ch), root: true, soft: true }].concat(v), pin: midisOf(v), roll: 0 }; }
      }
    };

    // ---- staff notation (abcjs) ----
    var LETTERS = 'CDEFGAB', NAT = [0, 2, 4, 5, 7, 9, 11], STEP = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6], MAJOR = [0, 2, 4, 5, 7, 9, 11];
    function ascii(name) { return name.replace(/♭/g, 'b').replace(/♯/g, '#'); }
    function letterOf(pc) { return LETTERS.indexOf(pcName(pc)[0]); }
    // a pitch as the letter `steps` above the root's letter, with whatever accidental that takes
    function spellFrom(letter, steps, midi) { var l = (letter + steps) % 7, a = mod12(midi - NAT[l]); return { l: l, acc: a > 6 ? a - 12 : a }; }
    function spell(rootPc, steps, midi) { return spellFrom(letterOf(rootPc), steps, midi); }
    function spellTone(ch, midi) {
      var off = mod12(midi - ch.root), a = ch.an, st = STEP[off];
      if (a.fifth && a.fifth.off === off && (off === 6 || off === 8)) st = 4; else if (a.seventh && a.seventh.off === 9 && off === 9) st = 6;
      return spell(ch.root, st, midi);
    }
    function octOf(sp, midi) { return Math.round((midi - sp.acc - NAT[sp.l]) / 12) - 1; }
    function accTok(sp, natural) { return sp.acc > 0 ? '^^'.slice(0, sp.acc) : sp.acc < 0 ? '__'.slice(0, -sp.acc) : natural ? '=' : ''; }
    function pitchTok(sp, midi) { var oct = octOf(sp, midi), L = LETTERS[sp.l]; return oct <= 4 ? L + new Array(5 - oct).join(',') : L.toLowerCase() + new Array(oct - 4).join("'"); }
    function tok(sp, midi, natural) { return accTok(sp, natural) + pitchTok(sp, midi); }
    function stack(toks, len) { return toks.length ? (toks.length > 1 ? '[' + toks.join('') + ']' : toks[0]) + len : 'x' + len; }
    // the notes of a step's chords, one bar a chord: a stack when they are played together, quarter notes when they climb
    function chordsAbc(chords, results) {
      var up = fretted ? 12 : 0, R = [], L = [];
      chords.forEach(function (ch, k) {
        var res = results[k], ns = res.notes.filter(function (n) { return res.roll ? true : res.pin ? res.pin.indexOf(n.midi) >= 0 : !n.soft; }).sort(function (x, y) { return x.midi - y.midi; });
        var t = function (n) { return tok(spellTone(ch, n.midi), n.midi + up); }, lab = '"' + ascii(ch.label) + '"';
        if (fretted) R.push(lab + (res.roll ? ns.map(t).join(' ') : stack(ns.map(t), 4)));
        else if (res.roll) { R.push(lab + ns.map(t).join(' ')); L.push('x' + ns.length); }
        else { R.push(lab + stack(ns.filter(function (n) { return n.hand !== 'L'; }).map(t), 4)); L.push(stack(ns.filter(function (n) { return n.hand === 'L'; }).map(t), 4)); }
      });
      var head = 'X:1\nM:none\nL:1/4\n';
      if (fretted) return head + 'K:C clef=' + (cfg.instrument === 'bass' ? 'bass' : 'treble') + '\n' + R.join(' | ') + ' |]';
      return head + '%%score {R L}\nV:R clef=treble\nV:L clef=bass\nK:C\n[V:R] ' + R.join(' | ') + ' |]\n[V:L] ' + L.join(' | ') + ' |]';
    }
    // fluid: a full line of music, drawn to the width of its box and never wider (a narrow screen shrinks it)
    // (LessonScore draws; a score lights its notes as they sound)
    function engrave(host, abc, width, fluid) { return global.LessonScore ? global.LessonScore.engrave(host, abc, { width: width, fluid: fluid }) : null; }
    function abcStop() { if (global.LessonScore) global.LessonScore.stop(); }
    // the band's swing for the Feel and tempo now, as abcjs counts it (0 = even eighths); the Swing slot overrides it (LessonScore.setSwing)
    function autoSwing() {
      var P = global.BandPlayer, C = global.BandCatalog;
      if (!P || !P.swingAt) return state.feel === 'boogaloo' ? 0 : 66;
      var o = C && C.styleOpts ? C.styleOpts(state.feel).opts : { feel: state.feel === 'boogaloo' ? 'straight' : 'swing' }, sa = P.swingAt(o, state.tempo);
      return sa.s <= 0.5 || sa.div === 16 ? 0 : Math.round(sa.s * 100);
    }
    // abcjs plays a score by itself. Written notation sounds at the instrument's pitch: horn.t lower.
    // (and a line moved down onto the bass staff is played where it was; swung unless the feel is straight eighths)
    function abcPlay(btn, score) { if (global.LessonScore) global.LessonScore.play(btn, score, { transpose: -((score && score.t != null) ? score.t : horn.t) - ((score && score.shift) || 0), swing: autoSwing(), onStart: stop }); }

    // ---- where flat 7 comes from: the home chord's own major scale, and the scale it is the V chord of ----
    function scaleBlock(host) {
      var b = { host: host }; host.__bl = b;
      b.draw = function () {
        abcStop(); host.textContent = '';
        var r = dkey(), base = 60 + r, R = pcName(r), PL = (letterOf(r) + 3) % 7;                             // the parent key is a fourth up: three letters on
        function own(d, oct) { var m = base + MAJOR[d] + (oct || 0); return { midi: m, sp: spell(r, d, m) }; }                 // a note of the root's own scale
        function name(sp) { return LETTERS[sp.l] + (sp.acc === 0 ? '' : sp.acc > 0 ? '♯♯'.slice(0, sp.acc) : '♭♭'.slice(0, -sp.acc)); }
        var seven = own(6), flat = { midi: base + 10, sp: spell(r, 6, base + 10) }, third = own(2), fifth = own(4), top = own(0, 12);
        var natural = flat.sp.acc === 0;                                                                                // (the lowered 7th is a natural: write the sign, to set it against the scale's)
        var pBase = base - 7, parent = name(spellFrom(PL, 0, pBase)), pScale = MAJOR.map(function (iv, d) { var m = pBase + iv; return tok(spellFrom(PL, d, m), m); }).concat([tok(spellFrom(PL, 0, pBase + 12), pBase + 12)]);
        var scale = [0, 1, 2, 3, 4, 5, 6].map(function (d) { var n = own(d); return tok(n.sp, n.midi); }).concat([tok(top.sp, top.midi)]);
        var T = function (n, nat) { return tok(n.sp, n.midi, nat); }, maj7 = [own(0), third, fifth, seven], dom = [own(0), third, fifth, flat];
        var head = 'X:1\nM:none\nL:1/4\nQ:1/4=96\nK:C\n';
        function add(html, abc, width) {
          var p = el('p'); p.innerHTML = html; host.appendChild(p);
          var row = el('div', 'bl-abc'), btn = el('button', 'btn btn-sm btn-outline-secondary', '▶ Play'), paper = el('div'); btn.type = 'button';
          row.appendChild(btn); row.appendChild(paper); host.appendChild(row);
          var visual = engrave(paper, abc, width); btn.addEventListener('click', function () { abcPlay(btn, visual); });
        }
        var hh = viewHorn(); b.charts = [];
        function chart(key, lead) {                                                         // the scale on the player's instrument, where it has a chart
          if (!hh.chart) return; var box = el('div', 'bl-boards'); host.appendChild(el('p', null, lead)); host.appendChild(box);
          b.charts.push(chartFor(box, hh, SCALES[key], r, R + ' ' + SCALES[key].name, base));
        }
        add('Chord tones are numbered from the <strong>major scale that starts on the chord\u2019s own root</strong>. Here is the ' + R + ' major scale with its notes numbered 1 to 8. Take notes 1, 3, 5 and 7 and you have a seventh chord, ' + R + 'maj7. Its 7th is ' + name(seven.sp) + '.',
          head + '"^' + R + ' major scale"' + scale.join(' ') + ' | "^1, 3, 5, 7"' + maj7.map(function (n) { return T(n); }).join(' ') + ' | "^' + R + 'maj7"[' + maj7.map(function (n) { return T(n); }).join('') + ']4 |]\nw: 1 2 3 4 5 6 7 8 1 3 5 7', 560);
        chart('major', 'The ' + R + ' major scale on your instrument:');
        add('But ' + R + '7 is not built from the ' + R + ' major scale. It comes from the <strong>' + parent + ' major scale</strong>, where ' + R + ' is note 5. Start on ' + R + ' and take every other note of the ' + parent + ' scale: ' + [own(0), third, fifth, flat].map(function (n) { return name(n.sp); }).join(', ')
          + '. This is the chord a major key builds on its fifth note. It is called the <strong>dominant seventh</strong>, written V7, and it is the chord that pulls home to ' + parent + '.',
          head + '"^' + parent + ' major scale"' + pScale.join(' ') + ' | "^from note 5"' + dom.map(function (n) { return T(n); }).join(' ') + ' | "^' + R + '7"[' + dom.map(function (n) { return T(n); }).join('') + ']4 |]\nw: 1 2 3 4 5 6 7 8 5 7 2 4', 560);
        add('Now compare the two chords. Three notes are the same. The top note of ' + R + '7 is ' + name(flat.sp) + ', a half step lower than the ' + name(seven.sp) + ' of the ' + R + ' major scale. Measured against the scale of its own root, the chord has a lowered 7th, and that is all <strong>\u266d7</strong> means: a half step below the major scale\u2019s 7th.'
          + (natural ? ' The \u266d does not mean the note is a flat: here the \u266d7 is ' + name(flat.sp) + ' natural.' : ''),
          head + '"^' + R + 'maj7""_1 3 5 7"[' + maj7.map(function (n) { return T(n); }).join('') + ']4 | "^' + R + '7""_1 3 5 \u266d7"[' + dom.map(function (n) { return T(n, n === flat); }).join('') + ']4 |]', 260);
        chart('mixolydian', 'Play the ' + R + ' major scale with its 7th lowered a half step and you have the scale that goes with ' + R + '7 (called Mixolydian):');
        var last = el('p'); last.innerHTML = 'In a major key only the chord on note 5 comes out this way. The blues takes that sound and puts it on every chord: I7, IV7 and V7 are all dominant sevenths, each with a major 3rd and a \u266d7 counted from its own root.'; host.appendChild(last);
      };
      b.draw(); return b;
    }
    var scales = [];                                                   // (the panels are made once the charts' tables below exist)

    // the band's bass line as notation (bass lessons): `recs` = twelve bar records, from the player or written silently
    function keyAbc() { return ascii(pcName(dkey())); }
    function showOf() { return isCongas ? { comp: false, bass: false, drums: false, congas: true } : { comp: false, bass: !isDrums, drums: isDrums }; }
    function lineAbc(recs, d) { return global.BandNotation.toAbc(recs, { key: keyAbc(), show: showOf(), barsPerLine: d && d.six ? 2 : perLine(), accents: !!(d && d.accents) }); }
    function exampleLine(w) {
      var seed = 1234, rng = function () { seed = (seed + 0x6D2B79F5) | 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      return global.BandMidi.generate(w.parsed ? w.parsed() : global.TuneChart.parse(abcOf(w.bars)), { bars: w.bars.length, tempo: state.tempo, transpose: semis(), opts: band(w).opts, rng: rng });
    }

    // ---- one band for the page ----
    var player = null, now = null, widgets = [];
    function status(t) { $('bl-status').textContent = t || ''; }
    function idle() {
      if (now) { now.btn.textContent = now.label; now.btn.classList.remove('bl-on'); now.w.live(-1, 0); markAll(now.w, -1, 0); if (now.w.anim) now.w.anim.clear(); now = null; }
      $('bl-stop').disabled = true; status('');
    }
    function stop() { if (player) { try { player.stop(); } catch (e) {} } idle(); }
    // Notation in time with the band: w.timed = [{ s: a score, pickup: quarter notes written before bar 1 }]
    function markAll(w, index, pos) { (w.timed || []).forEach(function (t) { if (!t.s) return; if (index < 0) t.s.clear(); else t.s.mark(t.pickup + 4 * index + pos); }); }
    // the kit / congas from above (LessonGrooveAnim), lit from the bars the player wrote (now.log) at the beat sounding now
    function animate(a, at) {
      var i = at.info, c = i.chorus != null ? i.chorus : now.chorus, lg = now.log[c] || [];
      if (i.countIn || i.ending || i.index < 0 || !lg[i.index]) return a.clear();
      var prev = i.index > 0 ? lg[i.index - 1] : (now.log[c - 1] || []).slice(-1)[0];
      a.at(lg[i.index], prev || null, at.pos);
    }
    function follow() {
      if (!now || !player) return;
      var at = player.where && player.where(); if (at && at.info && !at.info.countIn && !at.info.ending && at.info.index >= 0) markAll(now.w, at.info.index, at.pos);
      if (now.w.anim && at && at.info) animate(now.w.anim, at);
      global.requestAnimationFrame(follow);
    }
    // A step on a tune: the tune written above `before`, and its melody handed to the band (chartOf)
    function addTune(host, w, tools, before) {
      var t = global.BluesTunes && global.BluesTunes[host.getAttribute('data-tune')]; if (!t) return;
      var hold = { s: null, pickup: t.pickup }, head = el('p', 'bl-legend', t.title + ', by ' + t.composer + ':'), row = el('div', 'bl-abc'), btn = el('button', 'btn btn-sm btn-outline-secondary', '▶ Play'), staff = el('div');
      btn.type = 'button'; btn.title = 'The tune alone, on a piano'; row.appendChild(btn); row.appendChild(staff); host.insertBefore(head, before); host.insertBefore(row, before);
      btn.addEventListener('click', function () { abcPlay(btn, hold.s); });
      w.tune = t; (w.timed = w.timed || []).push(hold);
      var bt = el('button', 'btn btn-sm btn-outline-secondary', 'Open in the Backing Track ↗'); bt.type = 'button'; bt.title = 'Opens the Backing Track page in a new tab with this tune loaded, where every part of the band can be changed';
      bt.addEventListener('click', function () { global.BluesTunes.backingTrack(t, { tempo: state.tempo, style: state.feel }); });
      if (!isMelody) { var nt = check('Leave out the tune'); w.noTune = nt.box; tools.appendChild(nt.lab); nt.box.addEventListener('change', function () { if (player && now && now.w === w) player.setOpts(band(w).opts); }); }
      w.tuneDraw = function () {
        var abc = global.BluesTunes.inKey(t, keyAbc(), { words: isMelody, barsPerLine: perLine() }), bars = global.BluesTunes.melody(abc, t.pickup), sh = regShift([].concat.apply([], bars).map(function (n) { return n.midi; }));
        if (sh || horn.clef) abc = global.BluesTunes.inKey(t, keyAbc(), { words: isMelody, octaves: sh / 12, clef: horn.clef, barsPerLine: perLine() });
        hold.s = engrave(staff, abc, 680, true); if (hold.s) hold.s.shift = sh; w.tuneBars = bars;          // (the band is given the notes as they were before the move)
      };
      w.tuneDraw(); tools.appendChild(bt);
    }
    // (a step with a style of its own is in that style until it is playing and the Feel menu is changed)
    function feelOf(w) { return now && now.w === w ? state.feel : (w.style || state.feel); }
    function band(w) {
      var feel = feelOf(w), fam = cfg.instrument === 'guitar' ? 'guitar' : 'piano', so = cat.styleOpts(feel, fam);
      var opts = Object.assign({}, so.opts, { variation: 0.4, pins: null, melody: false, fills: undefined, fillBars: null });
      if (cfg.instrument === 'bass') opts.bassFeel = w.bass || opts.bassFeel;
      else if (isDrums) { if (feel === w.d.style) opts.groove = w.d.groove; opts.fills = 'none'; opts.fillBars = w.d.fillBars || null; opts.chokeBars = w.d.chokeBars || null; opts.endChoke = !!w.d.endChoke; }
      else if (isCongas) {                                   // the step's pattern while the band is in the step's style; another style plays its own congas
        opts.fills = 'none'; opts.fillBars = null;
        if (feel === w.d.style) { opts.congas = w.d.pattern; if (w.d.drums) opts.groove = w.d.drums; }
        if (opts.congas && opts.congas !== 'none' && so.instruments.indexOf('congas') < 0) so = { opts: so.opts, instruments: so.instruments.concat('congas') };
      }
      else if (isMelody) { opts.melody = !w.out.checked; opts.melodyLevel = 0.95; }
      else { opts.pins = w.pins(); opts.voiceMove = 'hold'; opts.extend = null; opts.compRhythm = w.rhythm || (state.feel === 'swing' ? 'charleston' : opts.compRhythm); }
      if (w.tune) { opts.melody = isMelody ? !w.out.checked : !(w.noTune && w.noTune.checked); opts.melodyLevel = 0.95; }
      return { opts: opts, instruments: so.instruments };
    }
    function mine() { return cfg.instrument === 'bass' ? 'bass' : isDrums ? 'drums' : isCongas ? 'congas' : isMelody ? null : 'comp'; }
    function mix(w) { if (player) ['bass', 'comp', 'drums'].concat(isCongas ? ['congas'] : []).forEach(function (p) { player.setVolume(p, w.vol ? w.vol(p) : (p === mine() && w.out.checked ? 0 : 1)); }); }
    // the chart the band reads: concert chords in F, and any melody at sounding pitch less the key (the player transposes both)
    function chartOf(w) {
      var p = w.parsed ? w.parsed() : global.TuneChart.parse(abcOf(w.bars)), sh = horn.t + semis();
      if (w.tune && w.tuneBars) p.bars.forEach(function (b, i) { var m = w.tuneBars[i]; if (m && m.length) b.melody = m.map(function (n) { return { pos: n.pos, dur: n.dur, midi: n.midi - sh }; }); });
      return p;
    }
    function showFeel() { $('bl-feel').value = state.feel; $('bl-tempo').value = state.tempo; $('bl-tempo-n').value = state.tempo; }
    var lastStep = null;
    function play(btn, w) {
      var same = now && now.btn === btn; stop(); abcStop(); if (same) return;
      if (w.style && w.style !== state.feel) { state.feel = w.style; state.tempo = feels.filter(function (f) { return f.id === w.style; })[0].tempo; showFeel(); }
      if ((isCongas || hihat) && w.d.tempo && lastStep !== w) { state.tempo = w.d.tempo; showFeel(); }      // a step starts at its own tempo the first time; after that the strip is the player's
      lastStep = w;
      var parsed = chartOf(w), b = band(w);
      if (!player) player = global.BandPlayer.create({ parsed: parsed, tempo: state.tempo, transpose: semis(), countIn: 1, opts: b.opts, instruments: b.instruments,
        onBar: function (info) { if (!now) return; now.index = info.countIn || info.ending ? -1 : info.index; if (!info.countIn && !info.ending) { now.chorus = info.chorus; now.w.line(); }
          status(info.countIn ? 'Count-in' : info.ending ? '' : 'Bar ' + (info.index + 1) + (state.loop ? '' : ', chorus ' + (info.chorus + 1) + ' of 2')); now.w.live(now.index, 0); },
        onBeat: function (info) { if (now && !info.countIn) now.w.live(now.index, info.beat); },
        onState: function (s) { if (s === 'loading') status('Loading the sounds…'); },
        ahead: true,
        onBarEvents: function (rec) { if (!now || rec.ending) return; (now.log[rec.chorus] = now.log[rec.chorus] || [])[rec.index] = rec; now.w.line(); },
        onRewind: function (bar) { if (!now) return; Object.keys(now.log).forEach(function (c) { now.log[c].forEach(function (r, i) { if (r && r.bar >= bar) delete now.log[c][i]; }); }); now.drawn = -1; },
        onEnd: idle });
      else { player.setInstruments(b.instruments); player.setChart(parsed); player.setOpts(b.opts); player.setTempo(state.tempo); player.setTranspose(semis()); }
      if (state.swing != null && player.swing() !== state.swing) player.setSwing(state.swing);
      player.setChoruses(state.loop ? 0 : 2);
      mix(w);
      now = { btn: btn, label: btn.textContent, w: w, index: -1, chorus: 0, log: {}, drawn: -1 };
      btn.textContent = '■ Stop'; btn.classList.add('bl-on'); $('bl-stop').disabled = false;
      player.play().then(function () { if (now && now.w === w) global.requestAnimationFrame(follow); }, function () { idle(); status('The sounds could not be loaded.'); });
    }
    function hear(res) {
      // climbing: every note shown, low to high; together: what the band's player would play
      var ms = res.roll ? midisOf(res.notes) : (res.pin || midisOf(res.notes.filter(function (n) { return !n.soft; })));
      abcStop();
      global.BandPlayer.chord(ms, { inst: me.sound, roll: res.roll || undefined, dur: res.roll ? 0.9 : 1.8 }).catch(function () {});
    }

    // the twelve bars of the chorus now sounding, once the player has written all of them (and only once a chorus)
    function chorusNow() { var c = now.chorus, got = now.log[c] || [], n = (now.w.bars || []).length || 12; if (now.drawn === c) return null; for (var i = 0; i < n; i++) if (!got[i]) return null; now.drawn = c; return got; }
    function check(text) { var lab = el('label', 'bl-check'), box = el('input'); box.type = 'checkbox'; lab.appendChild(box); lab.appendChild(document.createTextNode(' ' + text)); return { lab: lab, box: box }; }
    function playButton(w) { var go = el('button', 'btn btn-sm btn-primary', '▶ Play with the band'); go.type = 'button'; go.addEventListener('click', function () { play(go, w); }); return go; }
    function chartIn(paper, bars) { return global.TuneChart.render(paper, abcOf(bars), { header: false, barsPerLine: 4, barsPerRow: 4, roman: 'both', romanFn: H.roman, transpose: dsemis(), preferFlats: !SHARP[dkey()] }); }

    // ---- a drum step: two bars of the beat, the chorus on a drum staff, the band ----
    // (the conga steps take the same path: the player of the part is the congas, and the staff is the Cga. staff)
    function makeDrumStep(host) {
      var d = (isCongas ? CONGASTEPS : DRUMSTEPS)[host.getAttribute('data-part')]; if (!d) return;
      var w = { bars: split(CHARTS[host.getAttribute('data-chart')] || CHARTS[d.chart] || CHARTS.basic), d: d, style: d.style }, at = d.at == null ? 2 : d.at, who = isCongas ? 'congas' : 'drums';
      if (d.stops && d.stops.length) w.parsed = function () { var p = global.TuneChart.parse(abcOf(w.bars)); d.stops.forEach(function (n) { if (p.bars[n - 1]) p.bars[n - 1].stop = true; }); return p; };
      host.classList.add('bl-widget');
      var tools = el('div', 'bl-tools'), twoHead = el('p', 'bl-legend', 'Bars ' + (at + 1) + ' and ' + (at + 2) + ':'), two = el('div', 'bl-abc'), paper = el('div'), lineHead = el('p', 'bl-legend'), line = el('div', 'bl-abc');
      [twoHead, two, tools, paper, lineHead, line].forEach(function (e) { host.appendChild(e); });
      if (global.LessonGrooveAnim) { var animBox = el('div', 'bl-anim'); host.insertBefore(animBox, tools); w.anim = global.LessonGrooveAnim.create(animBox, isCongas ? 'congas' : 'kit'); }
      var out = check('Leave out the ' + who + ' (I will play them)'), solo = check(isCongas ? 'Congas alone' : 'Drums alone');
      w.out = out.box; tools.appendChild(playButton(w)); tools.appendChild(out.lab); tools.appendChild(solo.lab);
      w.vol = function (p) { return p === who ? (out.box.checked ? 0 : 1) : (solo.box.checked ? 0 : 1); };
      [out.box, solo.box].forEach(function (b) { b.addEventListener('change', function () { if (now && now.w === w) mix(w); }); });
      var chart = chartIn(paper, w.bars), lineHold = { s: null, pickup: 0 }; w.timed = [lineHold]; addTune(host, w, tools, tools);
      w.line = function () {
        if (!global.BandNotation || !global.BandMidi) return;
        var mineNow = now && now.w === w, recs = mineNow ? chorusNow() : exampleLine(w); if (!recs) return;
        var varies = !isCongas && d.groove === 'auto' && d.style === 'swing';
        lineHead.textContent = mineNow ? 'The ' + (isCongas ? 'conga' : 'drum') + ' part of this chorus, as the band is playing it:' : varies ? 'A chorus of it. The snare and bass drum are improvised, so they change every chorus; while the band plays, the chorus you are hearing is written here.' : 'The whole chorus:';
        try { drumHeads(engrave(two, global.BandNotation.toAbc([recs[at], recs[at + 1]], { key: keyAbc(), show: showOf(), barsPerLine: 2, accents: !!d.accents }), isCongas || d.six ? 560 : 400, true)); lineHold.s = drumHeads(engrave(line, lineAbc(recs, d), 680, true)); } catch (e) { line.textContent = ''; }
      };
      w.draw = w.line;
      w.rekey = function () { chart.setTranspose(dsemis(), !SHARP[dkey()]); if (!(now && now.w === w)) w.line(); };
      w.live = function (index) { chart.setLive(index); };
      w.line(); widgets.push(w); host.__bl = w;
    }
    // every head of a drum staff is named on hover (LessonDrumKit); one drawn again is tagged again
    function drumHeads(sc, onHit) { if (!isCongas && sc && global.LessonDrumKit) global.LessonDrumKit.label(sc, { onHit: onHit }); return sc; }
    // what is where on a drum staff, and a picture of the kit: click a piece, or a head on the staff, to hear it
    Array.prototype.forEach.call(document.querySelectorAll('.bl-drumkit'), function (host) { if (global.LessonDrumKit) global.LessonDrumKit.draw(host); });
    Array.prototype.forEach.call(document.querySelectorAll('.bl-drumkey'), function (host) {
      drumHeads(engrave(host, 'X:1\nM:none\nL:1/4\n%%vocalfont Helvetica 10\n%%stretchlast 1\nK:C clef=perc\n' + (narrow() ? '!style=x!g !open!!style=x!g !style=x!f !style=harmonic!f |\nw: hi\\-hat open~hi\\-hat ride ride~bell\n!style=x!a c !style=x!c e |\nw: crash snare cross\\-stick high~tom\nd A F !style=x!D |]\nw: mid~tom floor~tom bass~drum hi\\-hat~foot'      // three lines on a phone
        : '!style=x!g !open!!style=x!g !style=x!f !style=harmonic!f !style=x!a c !style=x!c e d A F !style=x!D |]\nw: hi\\-hat open~hi\\-hat ride ride~bell crash snare cross\\-stick high~tom mid~tom floor~tom bass~drum hi\\-hat~foot'), narrow() ? 340 : 840, true), function (piece) { global.LessonDrumKit.hit(piece); });
    });

    // ---- the five conga strokes: a stroke is heard by BandPlayer.hit (the congas' own bank), written as the Cga. staff writes it ----
    var STROKES = [{ name: 'Bass tone', piece: 'congaBass', letter: 'B' }, { name: 'Open tone', piece: 'congaOpen', letter: 'O' }, { name: 'Muted tone', piece: 'congaMute', letter: 'M' },
                   { name: 'Slap tone', piece: 'congaSlap', letter: 'S' }, { name: 'Heel-toe', piece: 'congaHeel', then: 'congaToe', letter: 'H T' }];
    function hearStroke(piece, then) {
      if (!global.BandPlayer || !global.BandPlayer.hit) return Promise.resolve();
      var p = global.BandPlayer.hit(piece, { vel: 0.8 });
      return then ? p.then(function () { return new Promise(function (r) { setTimeout(r, 160); }); }).then(function () { return global.BandPlayer.hit(then, { vel: 0.7 }); }) : p;
    }
    // the hi-hat's three sounds: a button plays a piece of the kit ("hatOpen,hatFoot": one after the other), and the key engraves how each is written
    Array.prototype.forEach.call(document.querySelectorAll('[data-drum-hit]'), function (b) {
      b.addEventListener('click', function () {
        var ps = b.getAttribute('data-drum-hit').split(','), k = 0;
        (function next() { if (k >= ps.length || !global.LessonDrumKit) return; global.LessonDrumKit.hit(ps[k++]); if (k < ps.length) setTimeout(next, 450); })();
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.bl-hatkey'), function (host) {
      drumHeads(engrave(host, 'X:1\nM:none\nL:1/4\n%%vocalfont Helvetica 10\n%%stretchlast 1\nK:C clef=perc\n!style=x!g !open!!style=x!g !style=x!D |]\nw: closed~(stick) open~(stick) closed~(foot)', narrow() ? 300 : 420, true), function (piece) { global.LessonDrumKit.hit(piece); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-conga-hit]'), function (b) {
      b.addEventListener('click', function () { var s = STROKES.filter(function (x) { return x.piece === b.getAttribute('data-conga-hit'); })[0]; hearStroke(b.getAttribute('data-conga-hit'), s && s.then).catch(function () {}); });
    });
    // the key: the strokes engraved, a note head for each as the Cga. staff writes it, its name and its letter under it; a click on a head plays it
    Array.prototype.forEach.call(document.querySelectorAll('.bl-congakey'), function (host) {
      var N = global.BandNotation; if (!N || !N.congaWritten) return;
      var heads = [], names = [], letters = [], items = [];
      STROKES.forEach(function (s) { [s.piece, s.then].filter(Boolean).forEach(function (pc, k) {
        var wr = N.congaWritten(pc), nm = s.then ? (k ? 'Toe' : 'Heel') : s.name;
        heads.push((wr.style ? '!style=' + wr.style + '!' : '') + wr.letter); names.push(nm.replace(/ /g, '~').replace(/-/g, '\\-')); letters.push(s.then ? (k ? 'T' : 'H') : s.letter); items.push({ piece: pc, then: null, name: nm });
      }); });
      var abc = 'X:1\nM:none\nL:1/4\n%%vocalfont Helvetica 10\n%%stretchlast 1\nK:C clef=perc\n' + heads.join(' ') + ' |]\nw: ' + names.join(' ') + '\nw: ' + letters.join(' ');
      var sc = engrave(host, abc, narrow() ? 340 : 560, true); if (!sc) return;
      var notes = host.querySelectorAll('.abcjs-note');
      Array.prototype.forEach.call(notes, function (g, i) { var it = items[i]; if (!it) return; g.style.cursor = 'pointer'; g.setAttribute('data-piece', it.piece);
        var t = document.createElementNS('http://www.w3.org/2000/svg', 'title'); t.textContent = it.name + ' (click to hear it)'; g.appendChild(t);
        g.addEventListener('click', function () { hearStroke(it.piece).catch(function () {}); }); });
    });

    // ---- a melody step: a twelve-bar line in the player's written key ----
    function nearTo(pc, ref) { var m = ref - mod12(ref - pc); return ref - m > 6 ? m + 12 : m; }                 // the pitch of that class nearest ref
    function guideLine(chs, startOn) {                          // one note a chord: its 3rd or 7th, whichever is nearer the note before
      var prev = null;
      return chs.map(function (ch) { var o = offs(ch), a = ch.root + o.third, b = ch.root + o.seventh, m;
        if (prev == null) m = nearTo(startOn === 7 ? b : a, 67); else { var x = nearTo(a, prev), y = nearTo(b, prev); m = Math.abs(x - prev) <= Math.abs(y - prev) ? x : y; }
        prev = m; return m; });
    }
    // a line: (the chords of every bar) -> for each bar, its notes [{ pos, dur, midi (written), ch }]
    var LINES = {
      roots: function (bars) { return bars.map(function (chs) { var span = 4 / chs.length; return chs.map(function (ch, j) { return { pos: j * span, dur: span, midi: 60 + ch.root, ch: ch }; }); }); },
      tones: function (bars) { return bars.map(function (chs) { var out = [];
        chs.forEach(function (ch, j) { var o = offs(ch), r = 60 + ch.root; (chs.length > 1 ? [0, o.third] : [0, o.third, o.fifth, o.seventh]).forEach(function (off, k) { out.push({ pos: j * 2 + k, dur: 1, midi: r + off, ch: ch }); }); });
        return out; }); },
      // from the flat 7th down through the 6th and 5th to the 3rd: the notes that set one chord's scale apart from the next one's
      scale7: function (bars) { return bars.map(function (chs) { var out = [];
        chs.forEach(function (ch, j) { var o = offs(ch), r = 60 + ch.root; if (r > 66) r -= 12; (chs.length > 1 ? [o.seventh, o.third] : [o.seventh, 9, o.fifth, o.third]).forEach(function (off, k) { out.push({ pos: j * 2 + k, dur: 1, midi: r + off, ch: ch }); }); });
        return out; }); },
      solo: function (bars) { return bars.map(function () { return []; }); },               // nothing written: the band alone
      guide3: function (bars) { return held(bars, 3); },
      guide7: function (bars) { return held(bars, 7); },
      // the same guide tones in the Charleston rhythm: on beat 1 and on the and of 2 (where a second chord in the bar is played early)
      rhythm: function (bars) { var flat = [].concat.apply([], bars), g = guideLine(flat, 3), k = 0;
        return bars.map(function (chs) { var a = k, b = k + chs.length - 1; k += chs.length; return [{ pos: 0, dur: 1.5, midi: g[a], ch: flat[a] }, { pos: 1.5, dur: 0.5, midi: g[b], ch: flat[b] }]; }); },
      // a riff: 3rd, 5th, 6th, 5th of the home chord; over IV only its first note changes (down a half step, to that chord's 7th); over V it moves up
      riff: function (bars) { var I = home().root, A = nearTo(I + 4, 64);
        return bars.map(function (chs) { var ch = chs[0], ms = ch.root === mod12(I + 5) ? [A - 1, A + 3, A + 5, A + 3] : (function (B) { return [B, B + 3, B + 5, B + 3]; })(ch.root === I ? A : nearTo(ch.root + offs(ch).third, A + 2));
          return ms.map(function (m, j) { return { pos: j, dur: 1, midi: m, ch: ch }; }); }); }
    };
    function held(bars, startOn) { var flat = [].concat.apply([], bars), g = guideLine(flat, startOn), k = 0;
      return bars.map(function (chs) { var span = 4 / chs.length; return chs.map(function (ch, j) { return { pos: j * span, dur: span, midi: g[k++], ch: ch }; }); }); }
    function lineName(n) { var off = mod12(n.midi - n.ch.root); return off === 9 && !(n.ch.an.seventh && n.ch.an.seventh.off === 9) ? '6' : (toneName(n.ch, n.midi) || '?'); }
    // the line as ABC in the written key: its key signature, accidentals only where a note leaves it, the tone names as words under the notes
    // the written key's signature, and a note in a bar that remembers its accidentals (st)
    function keySig() { var k = dkey(), sig = {}; MAJOR.forEach(function (iv, d) { var sp = spellFrom(letterOf(k), d, k + iv); sig[sp.l] = sp.acc; }); return sig; }
    function tokIn(sp, midi, st, sig) { var key = sp.l + ':' + octOf(sp, midi), cur = st[key] == null ? sig[sp.l] : st[key], show = cur !== sp.acc; st[key] = sp.acc; return (show ? accTok(sp, true) : '') + pitchTok(sp, midi); }
    function melodyAbc(notes, sh) {
      var sig = keySig(), music = [], words = []; sh = sh || 0;
      notes.forEach(function (bar) {
        var st = {}, at = 0, toks = [], ws = [], last = null;
        bar.forEach(function (n) {
          if (n.pos > at + 1e-6) toks.push('z' + Math.round((n.pos - at) * 2));
          toks.push((n.ch !== last ? '"' + ascii(n.ch.label) + '"' : '') + tokIn(spellTone(n.ch, n.midi), n.midi + sh, st, sig) + Math.round(n.dur * 2));
          ws.push(lineName(n)); last = n.ch; at = n.pos + n.dur;
        });
        if (at < 4 - 1e-6) toks.push('z' + Math.round((4 - at) * 2));
        music.push(toks.join(' ')); words.push(ws.join(' '));
      });
      var out = 'X:1\nM:4/4\nL:1/8\nQ:1/4=' + state.tempo + '\nK:' + keyAbc() + clefAbc() + '\n';
      for (var i = 0, n = perLine(); i < music.length; i += n) out += music.slice(i, i + n).join(' | ') + (i + n >= music.length ? ' |]' : ' |') + '\nw: ' + words.slice(i, i + n).join(' | ') + '\n';
      return out;
    }
    function makeMelodyStep(host) {
      var isTune = host.hasAttribute('data-tune'), make = isTune ? null : LINES[host.getAttribute('data-part')]; if (!isTune && !make) return;
      var w = { bars: split(CHARTS[host.getAttribute('data-chart')] || CHARTS.basic) }, notes = [], hold = { s: null, pickup: 0 };
      host.classList.add('bl-widget');
      var tools = el('div', 'bl-tools'), row = el('div', 'bl-abc'), alone = el('button', 'btn btn-sm btn-outline-secondary', '▶ Play'), staff = el('div'), says = el('p', 'bl-legend'), paper = el('div');
      alone.type = 'button'; alone.title = 'The line alone, on a piano'; row.appendChild(alone); row.appendChild(staff);
      [row, says, tools, paper].forEach(function (e) { host.appendChild(e); });
      var out = check('Leave out the melody (I will play it)'); w.out = out.box; tools.appendChild(playButton(w)); tools.appendChild(out.lab);
      out.box.addEventListener('change', function () { if (player && now && now.w === w) player.setOpts(band(w).opts); });
      alone.addEventListener('click', function () { abcPlay(alone, hold.s); });
      var chart = chartIn(paper, w.bars);
      w.vol = function () { return 1; }; w.timed = [hold];
      if (isTune) { row.hidden = true; addTune(host, w, tools, says); }
      else w.parsed = function () { var p = global.TuneChart.parse(abcOf(w.bars)), sh = horn.t + semis();
        p.bars.forEach(function (b, i) { if (notes[i] && notes[i].length) b.melody = notes[i].map(function (n) { return { pos: n.pos, dur: n.dur, midi: n.midi - sh }; }); }); return p; };
      w.draw = function () {
        abcStop();
        var wr = written();
        if (isTune) { says.textContent = wr + 'Under each note is its place in the chord of the moment (R = root). A note tied over the barline is named by the chord it lands on.'; return; }
        notes = make(w.bars.map(function (b) { return b.split(' ').map(chordOf); }));
        var any = notes.some(function (b) { return b.length; }); row.hidden = !any; out.lab.hidden = !any;
        var sh = regShift([].concat.apply([], notes).map(function (n) { return n.midi; }));
        hold.s = any ? engrave(staff, melodyAbc(notes, sh), 680, true) : null; if (hold.s) hold.s.shift = sh;
        says.textContent = any ? wr + 'Under each note is its place in the chord of the moment (R = root).' : 'Nothing is written here: the band plays and the chorus is yours.';
      };
      w.rekey = function () { chart.setTranspose(dsemis(), !SHARP[dkey()]); w.draw(); };
      w.line = function () {};
      w.live = function (index) { chart.setLive(index); };
      w.notes = function () { return isTune ? (w.tuneBars || []) : notes; };
      w.draw(); widgets.push(w); host.__bl = w;
    }
    // a scale written out, up and back down, with the number of each note under it
    var SCALES = {
      major:      { name: 'major scale', offs: [0, 2, 4, 5, 7, 9, 11], steps: [0, 1, 2, 3, 4, 5, 6], words: ['R', '2', '3', '4', '5', '6', '7'], major: 0 },
      minorblues: { name: 'minor blues scale', offs: [0, 3, 5, 6, 7, 10], steps: [0, 2, 3, 3, 4, 6], words: ['R', '♭3', '4', '♯4', '5', '♭7'] },
      majorblues: { name: 'major blues scale', offs: [0, 2, 3, 4, 7, 9], steps: [0, 1, 2, 2, 4, 5], words: ['R', '2', '♭3', '3', '5', '6'] },
      minorpent:  { name: 'minor pentatonic scale', offs: [0, 3, 5, 7, 10], steps: [0, 2, 3, 4, 6], words: ['R', '♭3', '4', '5', '♭7'] },
      majorpent:  { name: 'major pentatonic scale', offs: [0, 2, 4, 7, 9], steps: [0, 1, 2, 4, 5], words: ['R', '2', '3', '5', '6'] },
      mixolydian: { name: 'Mixolydian', offs: [0, 2, 4, 5, 7, 9, 10], steps: [0, 1, 2, 3, 4, 5, 6], words: ['R', '2', '3', '4', '5', '6', '♭7'], major: 5 },
      dorian:     { name: 'Dorian', offs: [0, 2, 3, 5, 7, 9, 10], steps: [0, 1, 2, 3, 4, 5, 6], words: ['R', '2', '♭3', '4', '5', '6', '♭7'], major: 10 }
    };                                                                // major = semitones up to the major scale with the same notes
    var DEGREES = { I: [0, 0], ii: [2, 1], IV: [5, 3], V: [7, 4], vi: [9, 5] };       // [semitones, letters] above the key note

    // ---- a scale on the instrument chosen in the Instrument menu (the improvising lesson) ----
    // Fretted: every note of the scale in one hand position (the root on the lowest string, or on the next when that is past the
    // 8th fret; one fret below it to three above), and the written run as tablature inside that position.
    function fretChart(box, kind, sc, pc, title) {
      var I = INST[kind], tun = I.tuning, f0 = mod12(pc - tun[0]), onLow = f0 <= 8, a = onLow ? f0 : mod12(pc - tun[1]), lo = Math.max(0, a - 1), hi = lo + 4, spots = [];             // five frets (or the open strings and four): every half step between two strings
      tun.forEach(function (open, s) { for (var f = lo; f <= hi; f++) { var k = sc.offs.indexOf(mod12(open + f - pc)); if (k >= 0) spots.push({ string: s, fret: f, midi: open + f, text: sc.words[k], root: k === 0 }); } });
      var start = tun[onLow ? 0 : 1] + a, run = sc.offs.concat([12]).map(function (off) {
        var best = null; spots.forEach(function (p) { if (p.midi === start + off && (!best || Math.abs(p.fret - a - 1) < Math.abs(best.fret - a - 1))) best = p; }); return best; }).filter(Boolean);
      run = run.concat(run.slice(0, -1).reverse());
      box.appendChild(D.fretboard([{ label: title, notes: spots }], { strings: I.strings, frets: [Math.max(1, lo), hi] }));
      var side = el('div'); side.appendChild(D.tab(run, { strings: I.strings }));
      side.appendChild(el('p', 'bl-legend', 'One position: every note of the scale under the hand, the roots ringed. The tablature is the run written above, played inside it.'));
      box.appendChild(side); return { spots: spots, run: run, lo: lo, hi: hi };
    }
    // Violin: first position. A place on a string is a finger, low or high, not a fret (the strings are tuned like a mandolin's).
    var FINGERS = { 1: 'low 1', 2: '1', 3: 'low 2', 4: 'high 2', 5: '3', 6: 'high 3', 7: '4' };
    function violinChart(box, sc, pc, title) {
      var tun = [55, 62, 69, 76], spots = [];
      tun.forEach(function (open, s) { for (var f = 0; f <= 7; f++) { var k = sc.offs.indexOf(mod12(open + f - pc)); if (k >= 0) spots.push({ string: s, fret: f, midi: open + f, text: sc.words[k], root: k === 0 }); } });
      box.appendChild(D.fretboard([{ label: title, notes: spots }], { strings: ['G', 'D', 'A', 'E'], frets: [1, 7], rows: FINGERS, rowHead: 'finger', fretless: true }));
      box.appendChild(el('p', 'bl-legend', 'First position: each row is a half step up the string, named by the finger that plays it. A dot above the top line is an open string. The 4th finger gives the same note as the next open string.'));
      return { spots: spots };
    }
    // Piano: the run on a keyboard. A seven-note scale takes the fingering of the major scale that has the same notes
    // (the thumbs fall on the same two keys); the right hand above, the left below.
    var THUMBS = { R: { 0: [0, 5], 7: [7, 0], 2: [2, 7], 9: [9, 2], 4: [4, 9], 11: [11, 4], 6: [11, 5], 1: [5, 0], 8: [0, 5], 3: [5, 0], 10: [0, 5], 5: [5, 0] },
                   L: { 0: [7, 0], 7: [2, 7], 2: [9, 2], 9: [4, 9], 4: [11, 4], 11: [4, 11], 5: [0, 5], 10: [2, 9], 3: [7, 2], 8: [0, 7], 1: [5, 0], 6: [11, 5] } };
    function pianoFingers(sc, pc) {
      if (sc.major == null) return null;
      var major = mod12(pc + sc.major), n = sc.offs.length, out = { R: [], L: [] };
      function isThumb(hand, i) { return THUMBS[hand][major].indexOf(mod12(pc + sc.offs[((i % n) + n) % n])) >= 0; }
      for (var i = 0; i <= n; i++) {
        var back = 0; while (!isThumb('R', i - back) && back < n) back++; out.R.push(1 + back);              // right hand: count up from the thumb below
        var on = 0; while (!(isThumb('L', i + on) && !(sc.major === 0 && i + on === 0)) && on < n) on++; out.L.push(1 + on);                         // left hand: count down to the thumb above
      }
      if (out.R[n] === 1) out.R[n] = out.R[n - 1] + 1;                                                      // the top note ends the run: the next finger, not a thumb
      return out;
    }
    function pianoChart(box, sc, pc, title, base) {
      var midis = sc.offs.concat([12]).map(function (off) { return base + off; }), fg = pianoFingers(sc, pc), lanes;
      if (fg) lanes = [{ label: 'R.H.', notes: midis.map(function (m, i) { return { midi: m, text: String(fg.R[i]), root: i === 0 || i === midis.length - 1 }; }) },
                       { label: 'L.H.', notes: midis.map(function (m, i) { return { midi: m, text: String(fg.L[i]), root: i === 0 || i === midis.length - 1 }; }) }];
      else lanes = [{ label: title.split(' ')[0], notes: midis.map(function (m, i) { return { midi: m, text: i === midis.length - 1 ? 'R' : sc.words[i], root: i === 0 || i === midis.length - 1 }; }) }];
      box.appendChild(D.keyboard(lanes, { colors: fg ? [0, 3] : [0] }));
      box.appendChild(el('p', 'bl-legend', fg ? 'Finger numbers going up (1 = thumb), right hand above and left hand below. They are the fingering of the major scale with the same notes, so the thumbs stay on the same two keys.'
        : 'The notes of the scale; filled = the root. Five- and six-note scales have no single standard fingering: keep the thumb off the black keys where you can.'));
      return { fingers: fg, midis: midis };
    }
    // the chart for a scale on an instrument (hh = an entry of HORNS), or nothing for the saxophones and concert pitch
    function chartFor(box, hh, sc, pc, title, base) {
      box.textContent = ''; box.hidden = !hh.chart; if (!hh.chart) return null;
      if (hh.chart === 'guitar' || hh.chart === 'bass') return fretChart(box, hh.chart, sc, pc, title);
      if (hh.chart === 'violin') return violinChart(box, sc, pc, title);
      return pianoChart(box, sc, pc, title, base);
    }
    // a scale written out, up and back down, with the number of each note under it, and on the instrument chosen
    function scaleNotes(host) {
      var sc = SCALES[host.getAttribute('data-scale')], on = DEGREES[host.getAttribute('data-on') || 'I']; if (!sc || !on) return null;
      var row = el('div', 'bl-abc'), btn = el('button', 'btn btn-sm btn-outline-secondary', '▶ Play'), staff = el('div'), box = el('div', 'bl-boards'), score = null; btn.type = 'button';
      row.appendChild(btn); row.appendChild(staff); host.appendChild(row); host.appendChild(box); btn.addEventListener('click', function () { abcPlay(btn, score); });
      var b = { draw: function () {
        var pc = mod12(dkey() + on[0]), letter = (letterOf(dkey()) + on[1]) % 7, base = 60 + pc, sig = keySig(), st = {};
        var up = sc.offs.map(function (off, i) { return { midi: base + off, sp: spellFrom(letter, sc.steps[i], base + off), word: sc.words[i] }; });
        up.push({ midi: base + 12, sp: spellFrom(letter, 0, base + 12), word: 'R' });
        var all = up.concat(up.slice(0, -1).reverse()), root = LETTERS[up[0].sp.l] + (up[0].sp.acc > 0 ? '♯' : up[0].sp.acc < 0 ? '♭' : '');
        b.midis = all.map(function (n) { return n.midi; }); b.title = root + ' ' + sc.name; var hh = viewHorn(), sh = regShift(b.midis, hh);
        score = engrave(staff, 'X:1\nM:none\nL:1/4\nQ:1/4=132\nK:' + keyAbc() + clefAbc(hh) + '\n"^' + b.title + '"' + all.map(function (n) { return tokIn(n.sp, n.midi + sh, st, sig); }).join(' ') + ' |]\nw: ' + all.map(function (n) { return n.word; }).join(' '), 600, true);
        if (score) { score.shift = sh; score.t = hh.t; }
        b.chart = chartFor(box, hh, sc, pc, b.title, base);
      } };
      b.draw(); host.__bl = b; return b;
    }

    // ---- a step ----    // ---- a step ----
    function makeStep(host) {
      if (isPerc) return makeDrumStep(host); if (isMelody) return makeMelodyStep(host);
      var part = PARTS[cfg.instrument][host.getAttribute('data-part')]; if (!part) return;
      var bars = split(CHARTS[host.getAttribute('data-chart')] || CHARTS.basic), shown = host.getAttribute('data-show');
      var syms = shown ? shown.split(/\s+/) : bars.join(' ').split(' ').filter(function (s, i, a) { return a.indexOf(s) === i; }).slice(0, 4);
      var w = { bars: bars, bass: host.getAttribute('data-bass'), rhythm: host.getAttribute('data-rhythm'), view: host.getAttribute('data-view') === 'super' ? 'super' : 'each' };
      host.classList.add('bl-widget');
      var tools = el('div', 'bl-tools'), playRow = el('div', 'bl-tools bl-playrow'), boards = el('div', 'bl-boards'), hint = el('p', 'bl-legend'), staff = el('div', 'bl-abc'), staffNote = el('p', 'bl-legend'),
          lineHead = el('p', 'bl-legend'), line = el('div', 'bl-abc'), paper = el('div'), isBass = cfg.instrument === 'bass', pairs = /^(g54|g43|shell)$/.test(host.getAttribute('data-part'));
      [tools, boards, hint, staff, staffNote, playRow, paper].forEach(function (e) { host.appendChild(e); });
      if (isBass) { host.appendChild(lineHead); host.appendChild(line); }
      staffNote.textContent = 'The same notes on a staff' + (fretted ? ', written an octave higher than they sound, as ' + me.name + ' music is.' : '.');
      var go = el('button', 'btn btn-sm btn-primary', '▶ Play with the band'); go.type = 'button'; go.addEventListener('click', function () { play(go, w); }); playRow.appendChild(go);
      var outLab = el('label', 'bl-check'); w.out = el('input'); w.out.type = 'checkbox'; outLab.appendChild(w.out); outLab.appendChild(document.createTextNode(' Leave out the ' + me.name + ' (I will play it)')); playRow.appendChild(outLab);
      w.out.addEventListener('change', function () { if (now && now.w === w) mix(w); });
      var views = {};
      if (fretted) [['each', 'One chord at a time'], ['super', 'Superimposed']].forEach(function (v) {
        var b = el('button', 'btn btn-sm btn-outline-secondary', v[1]); b.type = 'button'; b.addEventListener('click', function () { w.view = v[0]; w.draw(); }); tools.appendChild(b); views[v[0]] = b; });
      if (pairs) { var tri = el('button', 'btn btn-sm btn-outline-secondary', 'Up a tritone (6 frets)'); tri.type = 'button'; tools.appendChild(tri);
        tri.title = 'The same shapes six frets away: the same two notes of each dominant chord, with the 3rd and 7th changing places';
        tri.addEventListener('click', function () { w.up = !w.up; tri.classList.toggle('bl-on', !!w.up); w.draw(); if (player && now && now.w === w) player.setOpts(band(w).opts); }); }
      hint.textContent = 'Click a chord name to hear it. ' + (fretted ? 'Dark ring = root. Hollow = optional, or shown only so you can see where it is. Strings are drawn low to high, left to right.'
        : 'Filled square = root. Dashed = optional, or played by someone else. Red band = left hand, grey band = right hand.');
      var chart = global.TuneChart.render(paper, abcOf(bars), { header: false, barsPerRow: 4, roman: 'both', romanFn: H.roman, transpose: semis(), preferFlats: !SHARP[state.key] });
      var chords = [], results = [], staffScore = null, lineHold = { s: null, pickup: 0 }; w.timed = [lineHold]; addTune(host, w, playRow, playRow);
      function labelled(ch, res) { return { label: ch.label, notes: res.notes.map(function (n) { return Object.assign({}, n, { text: state.dots === 'name' ? pcName(n.midi) : toneName(ch, n.midi) }); }) }; }
      w.draw = function () {
        chords = syms.map(chordOf); results = chords.map(function (ch) { return part(ch, w); });
        var items = chords.map(function (ch, k) { return labelled(ch, results[k]); }), onPlay = function (k) { return function () { hear(results[k]); }; };
        boards.textContent = ''; boards.className = 'bl-boards bl-' + (fretted ? w.view : 'lanes');
        Object.keys(views).forEach(function (v) { views[v].classList.toggle('bl-on', v === w.view); });
        if (!fretted) boards.appendChild(D.keyboard(items, { onPlay: function (c, k) { hear(results[k]); } }));
        else {
          var fr = []; results.forEach(function (r) { r.notes.forEach(function (n) { if (n.fret > 0) fr.push(n.fret); }); });
          var o = { strings: me.strings, frets: fr.length ? [Math.min.apply(null, fr), Math.max.apply(null, fr)] : [1, 4] };
          if (w.view === 'super') boards.appendChild(D.fretboard(items, Object.assign({ onPlay: function (c, k) { hear(results[k]); } }, o)));
          else items.forEach(function (it, k) { var card = el('div', 'bl-card'); card.setAttribute('data-k', k); card.appendChild(D.fretboard([it], Object.assign({ colors: [k], onPlay: onPlay(k) }, o))); boards.appendChild(card); });
        }
        staffScore = engrave(staff, chordsAbc(chords, results), Math.min(640, chords.reduce(function (s, c, k) { return s + (results[k].roll ? 150 : 95); }, 40)));
        if (!(now && now.w === w)) w.line();
        w.live(now && now.w === w ? now.index : -1, 0);
      };
      // the bass line: the chorus now sounding once the player has written all of it, an example otherwise
      w.line = function () {
        if (!isBass || !global.BandNotation || !global.BandMidi) return;
        var mineNow = now && now.w === w, recs = mineNow ? chorusNow() : exampleLine(w); if (!recs) return;
        var random = (w.bass || 'walk') === 'walk';
        lineHead.textContent = mineNow ? 'The bass line of this chorus, as the band is playing it:' : random ? 'A bass line for this step. The band\u2019s bass player makes up a new one every chorus; while the band plays, the chorus you are hearing is written here.' : 'The bass line the band plays in this step:';
        try { lineHold.s = engrave(line, lineAbc(recs), 640, true); } catch (e) { line.textContent = ''; }
      };
      w.rekey = function () { chart.setTranspose(dsemis(), !SHARP[dkey()]); w.draw(); };
      w.pins = function () { var map = {}; bars.forEach(function (b, i) { b.split(' ').forEach(function (s, j) { var p = part(chordOf(s), w).pin; if (p && p.length) map[i + ':' + (j * 2)] = p; }); }); return map; };
      // the sounding bar on the chart, and its chord among the diagrams
      w.live = function (index, beat) {
        chart.setLive(index);
        var cs = index >= 0 ? bars[index].split(' ') : [], k = index >= 0 ? syms.indexOf(cs[cs.length > 1 && beat >= 2 ? 1 : 0]) : -1;
        Array.prototype.forEach.call(boards.querySelectorAll('.bl-card'), function (c) { c.classList.toggle('bl-live', +c.getAttribute('data-k') === k); });
        if (!fretted || w.view === 'super') Array.prototype.forEach.call(boards.querySelectorAll('.ld-label'), function (t) { t.classList.toggle('bl-live', +t.getAttribute('data-chord') === k); });
        if (staffScore) staffScore.markMeasure(k);               // the chord's bar of the staff under the diagrams
      };
      w.results = function () { return results; };
      w.draw(); widgets.push(w); host.__bl = w;
    }
    Array.prototype.forEach.call(document.querySelectorAll('.bl-step'), makeStep);
    Array.prototype.forEach.call(document.querySelectorAll('.bl-scale'), function (h) { h.classList.add('bl-widget'); scales.push(scaleBlock(h)); });
    Array.prototype.forEach.call(document.querySelectorAll('.bl-notes'), function (h) { var b = scaleNotes(h); if (b) scales.push(b); });
    function rekeyAll() { widgets.forEach(function (w) { w.rekey(); if (w.tuneDraw) w.tuneDraw(); }); scales.forEach(function (b) { b.draw(); }); }
    var wasNarrow = narrow();                                   // turning a phone, or a window dragged past the width: write the lines out again
    global.addEventListener('resize', function () { if (narrow() === wasNarrow) return; wasNarrow = narrow(); rekeyAll(); widgets.forEach(function (w) { if (w.line && !(now && now.w === w)) w.line(); }); });

    // ---- the strip at the bottom ----
    FLAT.forEach(function (k, i) { var o = el('option', null, k); o.value = i; $('bl-key').appendChild(o); });
    if (isPerc || isMelody) $('bl-dots').parentNode.hidden = true;
    if (isMelody) {
      var hs = el('span'), hl = el('label', null, 'Instrument'), hsel = el('select'); hsel.id = 'bl-horn'; hl.htmlFor = 'bl-horn'; hs.setAttribute('data-pri', 5); hs.setAttribute('data-pri-live', 7);
      horns.forEach(function (h) { var o = el('option', null, h.label); o.value = h.id; hsel.appendChild(o); }); hsel.value = horn.id;
      hs.appendChild(hl); hs.appendChild(hsel); $('bl-bar').insertBefore(hs, $('bl-bar').firstChild);
      document.querySelector('label[for="bl-key"]').textContent = 'Concert key';
      hsel.addEventListener('change', function () { horn = horns.filter(function (h) { return h.id === hsel.value; })[0]; try { global.localStorage.setItem('blHorn', horn.id); } catch (e) {}
        rekeyAll(); setBand(); });
    }
    feels.forEach(function (f) { var o = el('option', null, f.label); o.value = f.id; $('bl-feel').appendChild(o); });
    function showTempo() { $('bl-tempo').value = state.tempo; $('bl-tempo-n').value = state.tempo; }
    function setTempo(v) { v = Math.max(40, Math.min(220, Math.round(+v) || state.tempo)); state.tempo = v; showTempo(); if (player) player.setTempo(v); }
    function setBand() { if (!player || !now) return; var b = band(now.w); player.setInstruments(b.instruments); if (now.w.parsed || now.w.tune) player.setChart(chartOf(now.w)); player.setOpts(b.opts); }
    $('bl-key').value = state.key; $('bl-feel').value = state.feel; showTempo();
    $('bl-key').addEventListener('change', function () { state.key = +this.value; rekeyAll(); if (player) { player.setTranspose(semis()); setBand(); } });
    $('bl-feel').addEventListener('change', function () { state.feel = this.value; var f = feels.filter(function (x) { return x.id === state.feel; })[0]; setBand(); setTempo(f.tempo);
      widgets.forEach(function (w) { if (!(now && now.w === w)) w.line(); }); });
    $('bl-dots').addEventListener('change', function () { state.dots = this.value; widgets.forEach(function (w) { w.draw(); }); });
    $('bl-tempo').addEventListener('input', function () { setTempo(this.value); });
    $('bl-tempo-n').addEventListener('change', function () { setTempo(this.value); });
    $('bl-loop').addEventListener('change', function () { state.loop = this.checked; if (player && now) player.setChoruses(state.loop ? 0 : 2); });
    $('bl-stop').addEventListener('click', stop);
    // one row at the foot of the window: Stop always, the rest by how much each matters before and while the band plays (data-pri in the page)
    if (global.PlayBar && global.PlayBar.swingSlot) {          // Auto (the Feel's own, by tempo) or 50-75 %: the band and the notation both follow
      $('bl-bar').insertBefore(global.PlayBar.swingSlot({ id: 'bl-swing', pri: 4, priLive: 6, onChange: function (r) { state.swing = r; if (player) player.setSwing(r); if (global.LessonScore) global.LessonScore.setSwing(r); } }), $('bl-stop'));
    }
    if (global.PlayBar) global.PlayBar.attach($('bl-bar'), { live: function () { return !$('bl-stop').disabled; } });
  }

  global.BluesLesson = { init: init, CHARTS: CHARTS };
})(typeof window !== "undefined" ? window : globalThis);
