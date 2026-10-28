// establish.js: ways to establish tonality, meter, or both before patterns or a song, as the MLT books describe them, picked at
// random by weight. Global Establish. Used by My Saxophone Practice (sax-home.js); any page can use it.
//
//   Establish.METHODS   [{ id, ctx: "tonality" | "meter" | "both", name, how (what is heard), src (book, page), own (true = this site's,
//                         not from the books) }]
//   Establish.WEIGHTS   { id: 0..9 } how often each is heard (the teacher's choice; 0 = never). Methods missing here weigh DEFAULT.
//   Establish.pick(ctx, rnd) -> method      weighted choice among the methods for ctx (rnd: a 0..1 function, default Math.random)
//   Establish.abc(method, c) -> [{ kind: "sing" | "piano" | "chant" | "band" | "song", abc, opts }]   what to play (pure, Node test)
//   Establish.run(ctx, c, { method, onPick }) -> Promise   plays it; resolves when it is over (c below; onPick(method) before sound)
//   Establish.stop()
//   c: { tonic (pitch class of the resting tone, concert: 10 = B♭), minor, mode ("dorian" ... : the chords follow it; the sung ways
//        still sing major or minor), chords (Establish.tuneChords(abc, tonic): the tune's other characteristic chords join, 70%), triple, qpm, first (concert MIDI of the song's first
//        note, for "both"), song (a familiar tune's ABC in the same tonality and meter, for "familiar-song"), songTranspose }
//
// Sound: sung lines through SolfegeSing (on BUM or in solfège), chords through AbcPlay (the band's piano), rhythm through RhythmChant
// (on BAH, in syllables, or on a woodblock). All written in C major / A minor and moved to the key by transposing.
(function (global) {
  "use strict";
  var DEFAULT = 5;
  // Book ids as in scripts/works-cited.py: Mullen DuDe = MLT Any Music Teacher Can Du…De; LM = The Literate Musician; LSA = JRI Reference
  // Handbook for LSAs; LSM = Gordon, Learning Sequences in Music (2012); MP = Music Play; MMP = Music Moves for Piano Book 1; 50T = 50 Tunes.
  var METHODS = [
    { id: "seq-bum", ctx: "tonality", name: "Tonal sequence on BUM",
      how: "Scale degrees 5 6 5 4 3 2 7 1 of the tonality (SO LA SO FA MI RE TI DO in major, MI FA MI RE DO TI SI LA in minor, LA TI LA SO FA MI DO RE in Dorian \u2026), sung on BUM, ending on the resting tone.",
      src: "Mullen, Any Music Teacher Can Du…De p. 79; Gordon, Reference Handbook for LSAs, \u201cA Quick Guide to Teaching Tonal Patterns\u201d" },
    { id: "seq-solfege", ctx: "tonality", name: "Tonal sequence in solf\u00e8ge",
      how: "The same sequence sung on its syllables (once students are at verbal association).",
      src: "Mullen, Any Music Teacher Can Du…De p. 79 and \u201cLabel the Context of Songs\u201d (Chapter 13, page not checked)" },
    { id: "seq-twice", ctx: "tonality", name: "Tonal sequence two or three times",
      how: "The tonal sequence on BUM, sung two or three times before the patterns.",
      src: "Gordon, Reference Handbook for LSAs, \u201cTeaching Patterns in Learning Sequence Activities\u201d" },
    { id: "arp-down", ctx: "tonality", name: "Tonic moving down to the resting tone",
      how: "Scale degrees 5 3 1 of the tonality, sung on BUM: SO MI DO in major, MI DO LA in minor, LA FA RE in Dorian, and so on.",
      src: "Gordon, Learning Sequences in Music (2012) p. 271" },
    { id: "drm-patterns", ctx: "tonality", name: "Three stepwise patterns ending on the resting tone",
      how: "Degrees 1 2 3, 3 2 1, 1 7 1 of the tonality: DO RE MI, MI RE DO, DO TI DO in major (the other tonalities are this site's extension).",
      src: "Mullen, The Literate Musician, Lesson 3.4 p. 133" },
    { id: "chords-i-v-i", ctx: "tonality", name: "Characteristic chords on the piano (I\u2013V7\u2013I and others)",
      how: "Block chords on the piano: I\u2013V7\u2013I in major, i\u2013V7\u2013i in minor, i\u2013IV\u2013i in Dorian, I\u2013VII\u2013I in Mixolydian, and so on; another characteristic chord the tune uses joins it most times (I\u2013IV\u2013V7\u2013I, i\u2013IV\u2013VII\u2013i).",
      src: "Mullen, Any Music Teacher Can Du…De pp. 79, 90; Mullen, 50 Tunes for Teaching (General Procedures); Gordon, Learning Sequences p. 271 (\u201ctwo or more characteristic chords\u201d)" },
    { id: "arp-cadence", ctx: "tonality", name: "Arpeggio and cadence on the piano",
      how: "The tonic chord up and down, then a cadence in the tonality: I\u2013IV\u2013V7\u2013I in major, i\u2013iv\u2013V7\u2013i in minor, i\u2013IV\u2013VII\u2013i in Dorian \u2026",
      src: "Music Moves for Piano Book 1 (establish tonality: arpeggio, cadence)" },
    { id: "rhythm-seq-bah", ctx: "meter", name: "Rhythm sequence on BAH",
      how: "A short chant of macrobeats and microbeats only, chanted on BAH.",
      src: "Mullen, Any Music Teacher Can Du…De p. 79; Gordon, Reference Handbook for LSAs, \u201cA Quick Guide to Teaching Rhythm Patterns\u201d" },
    { id: "rhythm-seq-syl", ctx: "meter", name: "Rhythm sequence in syllables",
      how: "The same chant in rhythm syllables: DU DE (duple), DU DA DI (triple).",
      src: "Mullen, Any Music Teacher Can Du…De p. 79 (verbal association); Gordon, Reference Handbook for LSAs (\u201cChant rhythm sequence ... using rhythm syllables\u201d)" },
    { id: "rhythm-seq-pause", ctx: "meter", name: "Rhythm sequence, twice, with a pause",
      how: "The chant on BAH, then two macrobeats of silence, then the chant again.",
      src: "Gordon, Reference Handbook for LSAs, \u201cA Quick Guide to Teaching Rhythm Patterns\u201d step 1" },
    { id: "clicks", ctx: "meter", name: "Four clicks on the macrobeat",
      how: "Four woodblock clicks on the macrobeats (sets the tempo more than the meter).",
      src: "Music Moves for Piano Book 1 (rhythm patterns: \u201cfour clicks to establish the macrobeat\u201d)" },
    { id: "audiate", ctx: "both", name: "Tonality, then \u201caud-i-ate\u201d on the first pitch",
      how: "SO MI DO (or MI DO LA) on BUM, then the song's first pitch in its meter and tempo: duple short-short-long, triple long-short-long (sung on BUM here: the voice cannot say \u201caudiate\u201d).",
      src: "Gordon, Learning Sequences in Music (2012) pp. 271\u2013272" },
    { id: "move-like-me", ctx: "both", name: "\u201cBum bum bum, ready, sing\u201d on the first pitch",
      how: "The song's first pitch sung on the macrobeats in tempo, the cue that starts each repetition of a rote song.",
      src: "Mullen, Any Music Teacher Can Du…De p. 90 (Rote Song Procedure); Mullen, 50 Tunes for Teaching" },
    { id: "familiar-song", ctx: "both", name: "The end of a familiar song in the same tonality and meter",
      how: "The last phrase of a song already learned, in the same key, tonality and meter, with the band.",
      src: "Music Play, \u201cTonal Pattern Guidance\u201d and rhythm pattern guidance (the song or chant just before sets the context)" },
    { id: "tonality-then-meter", ctx: "both", name: "A tonality way, then a meter way",
      how: "One of the tonality ways above, then one of the meter ways, picked by their own weights.",
      src: "Gordon, Learning Sequences in Music (2012) p. 271 (tonality and keyality first, then meter and tempo)" },
    { id: "band-intro", ctx: "both", name: "A two-bar band intro", own: true,
      how: "The band plays the tonality's characteristic chords for two bars in the song's tempo (I then V7 in major; I, IV, V7 when the tune uses IV, most times); over the last two beats a voice sings the \u201cready, sing\u201d cue on the song's first pitch (on BUM), then the song comes in.",
      src: "The intro is not from the books (the way a band brings in a singer); the cue is Mullen, Any Music Teacher Can Du\u2026De p. 90 (Rote Song Procedure)." }
  ];
  // the teacher's weights (2026-10-28, from the weights page https://claude.ai/artifact/VRnxGL7PMFtRAoeMTPbxPB); others weigh DEFAULT
  var WEIGHTS = { "arp-cadence": 8, "band-intro": 9, "chords-i-v-i": 9, "clicks": 3, "familiar-song": 3, "seq-solfege": 5, "seq-twice": 1, "tonality-then-meter": 0 };
  function weight(id) { var w = WEIGHTS[id]; return w == null ? DEFAULT : Math.max(0, Math.min(9, +w || 0)); }
  function pick(ctx, rnd) {
    rnd = rnd || Math.random;
    var list = METHODS.filter(function (m) { return m.ctx === ctx && weight(m.id) > 0; });
    if (!list.length) list = METHODS.filter(function (m) { return m.ctx === ctx; }).slice(0, 1);
    var sum = list.reduce(function (s, m) { return s + weight(m.id); }, 0), r = rnd() * sum;
    for (var i = 0; i < list.length; i++) { r -= weight(list[i].id); if (r < 0) return list[i]; }
    return list[list.length - 1];
  }
  function byId(id) { return METHODS.filter(function (m) { return m.id === id; })[0] || null; }

  // ---------- characteristic chords by tonality ----------
  // The functions are Gordon's (Learning Sequences in Music, 2012, Table 10 p. 158, and pp. 160\u2013162): major and harmonic minor tonic,
  // dominant (seventh), subdominant; Dorian tonic, subdominant (IV, with the raised sixth), subtonic; Phrygian tonic, supertonic (\u266dII),
  // subtonic; Lydian tonic, supertonic (II, with the raised fourth), dominant (no seventh); Mixolydian tonic, subtonic (\u266dVII),
  // subdominant, dominant (v); Aeolian tonic, subtonic, subdominant, dominant (v); Locrian tonic, mediant, subtonic.
  // Which chord comes always (the one with the tonality's characteristic tone), the order, and the 70% chance of an extra chord the
  // tune uses are this site's choices. TPL: the progression's order; "base" chords always, the rest only when the tune has them.
  var Q = { M: [0, 4, 7], m: [0, 3, 7], "7": [0, 4, 7, 10], d: [0, 3, 6] };
  function ch(n, iv, q, base) { return { n: n, iv: iv, q: q, base: !!base }; }
  var TPL = {
    major: [ch("I", 0, "M", 1), ch("IV", 5, "M"), ch("V7", 7, "7", 1), ch("I", 0, "M", 1)],
    minor: [ch("i", 0, "m", 1), ch("iv", 5, "m"), ch("V7", 7, "7", 1), ch("i", 0, "m", 1)],
    dorian: [ch("i", 0, "m", 1), ch("IV", 5, "M", 1), ch("VII", 10, "M"), ch("i", 0, "m", 1)],
    phrygian: [ch("i", 0, "m", 1), ch("vii", 10, "m"), ch("II", 1, "M", 1), ch("i", 0, "m", 1)],
    lydian: [ch("I", 0, "M", 1), ch("II", 2, "M", 1), ch("V", 7, "M"), ch("I", 0, "M", 1)],
    mixolydian: [ch("I", 0, "M", 1), ch("IV", 5, "M"), ch("v", 7, "m"), ch("VII", 10, "M", 1), ch("I", 0, "M", 1)],
    aeolian: [ch("i", 0, "m", 1), ch("iv", 5, "m"), ch("v", 7, "m"), ch("VII", 10, "M", 1), ch("i", 0, "m", 1)],
    locrian: [ch("i\u00b0", 0, "d", 1), ch("iii", 3, "m"), ch("vii", 10, "m", 1), ch("i\u00b0", 0, "d", 1)]
  };
  function modeOf(c) { return TPL[c.mode] ? c.mode : c.minor ? "minor" : "major"; }
  // the chords of a tune as { iv (semitones above the resting tone), minor } (chord symbols, %%id tunes' "Bb" "F7" "Gm")
  var PCN = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function tuneChords(abc, tonic) {
    var out = [], m, re = /"([A-G])([#b]?)([^"\/]*)/g, body = String(abc || "").replace(/^[A-Za-z]:.*$/mg, "");
    while ((m = re.exec(body))) { var pc = PCN[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0), q = m[3];
      out.push({ iv: ((pc - tonic) % 12 + 12) % 12, minor: /^m(?!aj)|^min|dim|\u00b0|o/.test(q) }); }
    return out;
  }
  // c: { tonic, mode | minor, chords: tuneChords(...) }; o: { intro (no final tonic), always (an extra even if the tune lacks it), chance }
  function progression(c, o) {
    o = o || {}; var rnd = c.rnd || Math.random, used = c.chords || [], t = TPL[modeOf(c)];
    var has = function (x) { return used.some(function (u) { return u.iv === x.iv && u.minor === (x.q === "m" || x.q === "d"); }); };
    var firstExtra = true, out = t.filter(function (x, i) {
      if (x.base) return !(o.intro && i === t.length - 1);
      var keep = (has(x) && rnd() < (o.chance == null ? 0.7 : o.chance)) || (o.always && firstExtra); firstExtra = false; return keep;
    });
    return out;
  }
  var FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  function symbol(c, x) { return FLAT[((c.tonic || 0) + x.iv) % 12] + ({ M: "", m: "m", "7": "7", d: "dim" })[x.q]; }
  // a block chord at concert pitch: the root in the bass (C3..B3 area), the chord tones packed between G3 and F#4
  function voicing(c, x) {
    var root = ((c.tonic || 0) + x.iv) % 12, bass = 43 + ((root - 7 + 12) % 12), up = Q[x.q].map(function (d) { var pc = (root + d) % 12; return 55 + ((pc - 7 + 12) % 12); }).sort(function (a, b) { return a - b; });
    return "[" + [bass].concat(up).map(abcNote).join("") + "]";
  }

  // ---------- what to play (pure) ----------
  var NAMES = ["C", "^C", "D", "_E", "E", "F", "^F", "G", "_A", "A", "_B", "B"];
  function abcNote(m) { var o = Math.floor(m / 12) - 5, n = NAMES[((m % 12) + 12) % 12]; return o >= 0 ? n.slice(0, -1) + (o ? n.slice(-1).toLowerCase() + Array(o).join("'") : n.slice(-1)) : n + Array(-o + 1).join(","); }
  // sung lines are written in the white-key key of their tonality (C major, A harmonic minor, D Dorian ...) by scale degree, then moved
  // to the key: in every tonality the tonal sequence is 5 6 5 4 3 2 7 1, the arpeggio 5 3 1, the stepwise patterns 1 2 3, 3 2 1, 1 7 1
  var MODEKEY = { major: ["C", 0], minor: ["Am", 9], dorian: ["Ddor", 2], phrygian: ["Ephr", 4], lydian: ["Flyd", 5], mixolydian: ["Gmix", 7], aeolian: ["Am", 9], locrian: ["Bloc", 11] };
  var WHITE = [0, 2, 4, 5, 7, 9, 11];
  function degree(c, d) {                                       // d: 1..8, or -1 for the 7 below the resting tone
    var mk = MODEKEY[modeOf(c)], root = mk[1], i = WHITE.indexOf(root), steps = [];
    for (var k = 0; k < 7; k++) { var pc = WHITE[(i + k) % 7]; steps.push(pc + (k + i >= 7 ? 12 : 0) - root); }
    if (modeOf(c) === "minor") steps[6] += 1;                   // harmonic minor: SI
    var below = d < 0, n = below ? 7 : d, o = n > 7 ? 12 : 0; return 60 + root + steps[(n - 1) % 7] + o - (below ? 12 : 0);
  }
  function line(c, ds) { return ds.map(function (d, j) { if (d === "z") return "z"; var m = degree(c, d), n = abcNote(m);
    if (/^_/.test(n) && (d === 7 || d === -1)) n = abcNote(m - 1).replace(/^([A-Ga-g])/, "^$1");   // the raised seventh (SI) spelled sharp
    return n + (j === ds.length - 1 ? "2" : ""); }).join(" "); }
  // semitones from the white-key key up or down to the key (nearest way)
  function shift(c) { var d = (((c.tonic || 0) - MODEKEY[modeOf(c)][1]) % 12 + 12) % 12; return d > 6 ? d - 12 : d; }
  function hdr(m, l, k, q) { return "X:1\nM:" + m + "\nL:" + l + "\nQ:1/4=" + Math.round(q) + "\nK:" + k + "\n"; }
  function abc(method, c) {
    c = c || {}; var q = c.qpm || 100, tr = shift(c), K = MODEKEY[modeOf(c)][0];
    var sing = function (body, o) { return { kind: "sing", abc: hdr("none", "1/4", K, q) + body + " |]", opts: Object.assign({ transpose: tr, qpm: q }, o || {}) }; };
    var piano = function (body) { return { kind: "piano", abc: hdr("none", "1/4", K, q) + body + " |]", opts: { transpose: tr, qpm: q } }; };
    var seq = line(c, [5, 6, 5, 4, 3, 2, -1, 1]);
    var duple = !c.triple, meter = duple ? "2/4" : "6/8", macro = duple ? "C2" : "C3", micro = duple ? "CC" : "CCC";
    var rseq = macro + " " + macro + " | " + micro + " " + micro + " | " + micro + " " + macro + " | " + macro + " " + macro;
    var chant = function (body, o) { return { kind: "chant", abc: "X:1\nM:" + meter + "\nL:1/8\nK:C clef=perc\n" + body + " |]", opts: Object.assign({ qpm: duple ? q : q * 1.5 }, o || {}) }; };
    var first = c.first != null ? c.first : (c.tonic || 0) + 60;
    switch (method.id) {
      case "seq-bum": return [sing(seq, { neutral: "bum" })];
      case "seq-solfege": return [sing(seq)];
      case "seq-twice": return [sing(seq + " z2 | " + seq, { neutral: "bum" })];
      case "arp-down": return [sing(line(c, [5, 3, 1]), { neutral: "bum" })];
      case "drm-patterns": return [sing(line(c, [1, 2, 3, "z", 3, 2, 1, "z", 1, -1, 1]), { neutral: "bum" })];
      case "chords-i-v-i": { var pr = progression(c);
        return [{ kind: "piano", abc: hdr("none", "1/4", "C", q) + pr.map(function (x, i) { return voicing(c, x) + (i === pr.length - 1 ? "4" : "2"); }).join(" ") + " |]", opts: { qpm: q }, chords: pr.map(function (x) { return x.n; }) }]; }
      case "arp-cadence": { var pc2 = progression(c, { always: true }), t0 = Q[TPL[modeOf(c)][0].q], r0 = 55 + (((c.tonic || 0) - 7 + 12) % 12);
        var up = t0.slice(0, 3).map(function (d) { return r0 + d; }).concat([r0 + 12]), arp = up.concat(up.slice(0, 3).reverse()).map(function (m, i, a) { return abcNote(m) + (i === a.length - 1 ? "" : "/"); }).join("");
        return [{ kind: "piano", abc: hdr("none", "1/4", "C", q) + arp + " z " + pc2.map(function (x, i) { return voicing(c, x) + (i === pc2.length - 1 ? "2" : ""); }).join(" ") + " |]", opts: { qpm: q }, chords: pc2.map(function (x) { return x.n; }) }]; }
      case "rhythm-seq-bah": return [chant(rseq)];
      case "rhythm-seq-syl": return [chant(rseq, { syllables: "rhythm" })];
      case "rhythm-seq-pause": return [chant(rseq + " | z" + (duple ? 4 : 6) + " | " + rseq)];
      case "clicks": return [chant(macro + " " + macro + " | " + macro + " " + macro, { sound: "woodblock" })];
      case "audiate": {
        var f = abcNote(first);                                   // 5 3 1 in the tonality, then the tune's first note at its own pitch
        return [sing(line(c, [5, 3, 1]), { neutral: "bum" }),
                { kind: "sing", abc: "X:1\nM:" + meter + "\nL:1/8\nQ:1/4=" + Math.round(q) + "\nK:C\n" + (duple ? f + " " + f + " " + f + "2" : f + "2 " + f + " " + f + "3") + " |]", opts: { qpm: q, neutral: "bum", voice: "auto" } }];
      }
      case "move-like-me": { var g = abcNote(first), mb = duple ? g + "2" : g + "3";
        return [{ kind: "sing", abc: "X:1\nM:" + meter + "\nL:1/8\nQ:1/4=" + Math.round(q) + "\nK:C\n" + mb + " " + mb + " | " + mb + " " + (duple ? g + g : g + "2" + g) + " |]", opts: { qpm: q, neutral: "bum", voice: "auto" } }];
      }
      case "familiar-song": return c.song ? [{ kind: "song", abc: c.song, opts: { transpose: c.songTranspose || 0, qpm: q, last: 4 } }] : [];
      case "band-intro": {   // two bars of the tonality's characteristic chords (tonic, then the others, ending away from the tonic); over the last two
        // macrobeats the voice sings the cue on the first pitch: the "ready, sing" of \u201cBum bum bum, ready, sing\u201d (Mullen p. 90),
        // short-short-long in duple, long-short-long in triple, on BUM
        var pi = progression(c, { intro: true }), half = duple ? 2 : 3, g2 = abcNote(first), sym = function (x) { return "\"" + symbol(c, x) + "\""; };
        var b1 = sym(pi[0]) + " z" + (half * 2), rest = pi.slice(1), b2 = rest.length === 1 ? sym(rest[0]) + " z" + (half * 2) : rest.slice(0, 2).map(function (x) { return sym(x) + " z" + half; }).join(" ");
        if (rest.length > 2) { b1 = sym(pi[0]) + " z" + half + " " + sym(rest[0]) + " z" + half; b2 = rest.slice(1, 3).map(function (x) { return sym(x) + " z" + half; }).join(" "); }
        var cue = duple ? g2 + " " + g2 + " " + g2 + "2" : g2 + "2 " + g2 + " " + g2 + "3";
        return [{ kind: "band", abc: "X:1\nM:" + meter + "\nL:1/8\nQ:1/4=" + Math.round(q) + "\nK:C\n" + b1 + " | " + b2 + " |]", opts: { qpm: q }, chords: pi.map(function (x) { return x.n; }),
                  cue: { abc: "X:1\nM:" + meter + "\nL:1/8\nQ:1/4=" + Math.round(q) + "\nK:C\n" + cue + " |]", delay: (duple ? 2 : 3) * 60 / q, qpm: q } }];
      }
      default: return [];
    }
  }

  // ---------- playing it ----------
  var cur = null, gen = 0;
  function stop() { gen++; var h = cur; cur = null; if (h && h.stop) try { h.stop(); } catch (e) {} }
  var off = null;
  function vis(a) { if (!off) { off = document.createElement("div"); off.style.cssText = "position:absolute;left:-9999px;width:600px"; document.body.appendChild(off); } return ABCJS.renderAbc(off, a)[0]; }
  // the last n bars of a tune (for "familiar-song"): header + the bars, chords kept
  function lastBars(t, n) {
    var lines = String(t).split("\n"), head = lines.filter(function (x) { return /^[A-Za-z]:|^%/.test(x); }), body = lines.filter(function (x) { return x.trim() && !/^[A-Za-z]:|^%/.test(x); }).join(" ");
    var bars = body.replace(/:?\|\]|\|\||:\||\|:/g, "|").split("|").map(function (b) { return b.trim(); }).filter(Boolean);
    return head.filter(function (x) { return !/^w:/.test(x); }).join("\n") + "\n" + bars.slice(-n).join(" | ") + " |]";
  }
  function playOne(p) {
    return new Promise(function (res) {
      var o = p.opts || {};
      if (p.kind === "sing" && global.SolfegeSing) { cur = SolfegeSing.play(p.abc, Object.assign({ voice: "low", onEnd: res }, o)); return; }
      if (p.kind === "chant" && global.RhythmChant) { cur = RhythmChant.play(p.abc, Object.assign({ onEnd: res }, o)); return; }
      if (global.AbcPlay && global.ABCJS) {
        var a = p.kind === "song" ? lastBars(p.abc, o.last || 4) : p.abc;
        var cueH = null, cueT = null;
        var h = AbcPlay.play(vis(a), { abc: (p.kind === "band" || p.kind === "song") ? a : null, sound: "piano", transpose: o.transpose || 0, qpm: o.qpm, style: "folk", light: false, melody: p.kind !== "band",
          onEnd: function () { clearTimeout(cueT); res(); },
          onStart: p.cue && global.SolfegeSing ? function () { cueT = setTimeout(function () { cueH = SolfegeSing.play(p.cue.abc, { qpm: p.cue.qpm, neutral: "bum", voice: "auto" }); /* the tune's first note, at its pitch */ }, p.cue.delay * 1000 - 60); } : null });
        cur = { stop: function () { clearTimeout(cueT); if (cueH) cueH.stop(); if (h && h.stop) h.stop(); else AbcPlay.stop(); } }; return;
      }
      res();
    });
  }
  function both(c) { var t = pick("tonality"), r = pick("meter"); return { parts: abc(t, c).concat([{ kind: "gap" }], abc(r, c)), name: t.name + ", then " + r.name.charAt(0).toLowerCase() + r.name.slice(1) }; }
  function run(ctx, c, o) {
    o = o || {}; stop();
    var my = gen, m = o.method || pick(ctx), parts = abc(m, c);
    if (m.id === "tonality-then-meter" || (!parts.length && ctx === "both")) { var x = both(c); parts = x.parts; m = Object.assign({}, m, { name: x.name }); }
    if (o.onPick) o.onPick(m);
    return parts.reduce(function (pr, p) {
      return pr.then(function () {
        if (my !== gen) return null;                                  // stopped
        if (p.kind === "gap") return new Promise(function (res) { setTimeout(res, 350); });
        return playOne(p);
      });
    }, Promise.resolve()).then(function () { cur = null; return my === gen ? m : null; });
  }
  var api = { progression: progression, tuneChords: tuneChords, TPL: TPL, METHODS: METHODS, WEIGHTS: WEIGHTS, DEFAULT: DEFAULT, weight: weight, pick: pick, byId: byId, abc: abc, run: run, stop: stop, lastBars: lastBars, _abcNote: abcNote };
  global.Establish = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
