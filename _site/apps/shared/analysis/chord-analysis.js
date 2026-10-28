// chord-analysis.js — analyse the chords of a short passage (ChordAnalysis). One source for two places: the step-by-step guide
// (theory/chord-analysis.qmd, every level and stage) and the "Analysis practice" section of the Hutchinson chapter pages
// (triads.qmd ch. 6, roman-numerals.qmd ch. 7, seventh-chords.qmd ch. 8: levels up to that chapter).
//
//   <div class="chord-analysis" data-settings="level=ch7a&texture=satb" data-upto="ch7b"></div>
//       data-settings  starting settings (names as in SETTINGS; a student's changes are kept per page in localStorage)
//       data-upto      the highest level offered
//       data-from-url  settings from the page address too (?level=ch7b&seed=123 opens that passage)
//       data-lock      no settings panel (a test; the link's settings stand)
//       data-example   a worked example, nothing to type: settings give key= and prog= (key=a minor&prog=i iv6 V i&texture=guitar)
//   Needs abcjs (ABCJS) and abc-play.js (AbcPlay) on the page.
//
// Each chord is done in two parts. STACK IT: rearrange its notes into a close root-position stack (root, 3rd, 5th, 7th, each the
// next letter-third up), leaving out non-chord tones and doublings. Four ways to enter the stack, one answer (a list of spelled
// notes, bottom up), so one checker: tap the passage's letters, click noteheads on a staff, rotate the written stack, or type.
// NAME IT: a lead-sheet symbol or a Roman numeral (with inversion). A name is right when it builds the same spelled notes over the
// same bass, so I6 = I/3rd and V65 = V7/3rd. Levels without inversions (ch6a, ch7a) don't ask for the bass.
//
// Stages (texture): rh   triads and sevenths in close position, treble staff only (a piano right hand); the lowest note is the bass
//                   guitar common guitar voicings (open and low-position shapes found by search: contiguous strings, at most four
//                         fingers, every chord tone, the bass lowest), written an octave up in the treble clef as guitar music is,
//                         with doublings and ledger lines, and the same frets as TAB under it (heard an octave down)
//                   satb  four voices on two staves; tenor in the bass clef (S A / T B) or the treble (S A T / B, keyboard style)
//                   broken broken chords in the right hand over a held bass
//                   melody a melody with non-chord tones (passing and neighbor, on the off-beat eighth; listed in q.ncts) over an
//                         Alberti bass or held chords
// After seventh chords (ch. 9 function, 10 named non-chord tones, 16 figures, 17-21 chromatic chords): the plan is in
// theory/chord-analysis.qmd, "What comes next". parseRN already reads V7/V and N6 for them.
// Test: node tests/analysis/chord-analysis.test.js
(function (global) {
  "use strict";
  var LET = "CDEFGAB", NAT = [0, 2, 4, 5, 7, 9, 11];
  var ACC_TXT = { "-2": "𝄫", "-1": "♭", "0": "", "1": "♯", "2": "𝄪" }, ACC_ABC = { "-2": "__", "-1": "_", "0": "=", "1": "^", "2": "^^" };
  var rng = Math.random;
  function rnd(n) { return Math.floor(rng() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function seeded(seed) { var t = seed >>> 0; return function () { t += 0x6D2B79F5; var r = Math.imul(t ^ t >>> 15, 1 | t); r ^= r + Math.imul(r ^ r >>> 7, 61 | r); return ((r ^ r >>> 14) >>> 0) / 4294967296; }; }

  // ---- notes: { l: letter 0-6, a: accidental, o: octave (C4 = middle C) }
  function pcOf(n) { return ((NAT[n.l] + n.a) % 12 + 12) % 12; }
  function nm(n) { return LET[n.l] + ACC_TXT[n.a]; }
  function sameName(a, b) { return a.l === b.l && a.a === b.a; }
  function dia(n) { return n.o * 7 + n.l; }
  function midi(n) { return 12 * (n.o + 1) + NAT[n.l] + n.a; }
  function up(n, steps, semis) {
    var l = ((n.l + steps) % 7 + 7) % 7, a = ((pcOf(n) + semis - NAT[l]) % 12 + 12) % 12; if (a > 6) a -= 12;
    return { l: l, a: a };
  }
  function parseName(t) {
    var m = /^([A-Ga-g])(##|bb|x|𝄪|𝄫|#|b|♯|♭)?$/.exec(t); if (!m) return null;
    return { l: LET.indexOf(m[1].toUpperCase()), a: { "": 0, "#": 1, "♯": 1, "b": -1, "♭": -1, "##": 2, "x": 2, "𝄪": 2, "bb": -2, "𝄫": -2 }[m[2] || ""] };
  }
  function parseNotes(t) {   // "C E G", "Eb,G,Bb" -> notes or null
    var ws = String(t || "").trim().split(/[\s,–-]+/).filter(Boolean); if (!ws.length) return null;
    var ns = ws.map(function (w) { return parseName(w.charAt(0).toUpperCase() + w.slice(1)); });
    return ns.some(function (n) { return !n; }) ? null : ns;
  }
  function spelledAt(n, m) { return { l: n.l, a: n.a, o: Math.round((m - NAT[n.l] - n.a) / 12) - 1 }; }

  // ---- keys
  var MAJ = { "-5": "D♭", "-4": "A♭", "-3": "E♭", "-2": "B♭", "-1": "F", "0": "C", "1": "G", "2": "D", "3": "A", "4": "E", "5": "B" };
  var MIN = { "-5": "B♭", "-4": "F", "-3": "C", "-2": "G", "-1": "D", "0": "A", "1": "E", "2": "B", "3": "F♯", "4": "C♯", "5": "G♯" };
  var SCALE = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
  function keyOn(tonic, mode) {   // sig[letter] = the accidental the scale gives that letter (natural minor for minor)
    var sig = [0, 0, 0, 0, 0, 0, 0];
    for (var d = 0; d < 7; d++) { var n = up(tonic, d, SCALE[mode][d]); sig[n.l] = n.a; }
    var tn = nm(tonic);
    return { tonic: { l: tonic.l, a: tonic.a }, mode: mode, sig: sig, name: tn, abc: tn.replace("♭", "b").replace("♯", "#") + (mode === "minor" ? "m" : ""),
      label: (mode === "minor" ? tn.charAt(0).toLowerCase() + tn.slice(1) : tn) + " " + mode };
  }
  function keyNamed(t) {   // "D", "D major", "b", "b minor", "Bm", "F# minor" -> key or null
    var m = /^\s*([A-Ga-g])(#|b|♯|♭)?\s*(major|minor|maj|min|M|m)?\s*$/.exec(String(t || "")); if (!m) return null;
    var mode = m[3] ? (/^(minor|min|m)$/.test(m[3]) ? "minor" : "major") : (m[1] === m[1].toLowerCase() ? "minor" : "major");
    return keyOn(parseName(m[1].toUpperCase() + (m[2] || "")), mode);
  }
  function randomKey(mode, most) {
    var map = mode === "major" ? MAJ : MIN, ks = Object.keys(map).filter(function (k) { return Math.abs(+k) <= most; });
    return keyOn(parseName(map[pick(ks)].replace("♭", "b").replace("♯", "#")), mode);
  }

  // ---- chords
  var QUAL = { maj: [[2, 4], [4, 7]], min: [[2, 3], [4, 7]], dim: [[2, 3], [4, 6]], aug: [[2, 4], [4, 8]],
    dom7: [[2, 4], [4, 7], [6, 10]], maj7: [[2, 4], [4, 7], [6, 11]], min7: [[2, 3], [4, 7], [6, 10]], hdim7: [[2, 3], [4, 6], [6, 10]], dim7: [[2, 3], [4, 6], [6, 9]] };
  var QNAME = { maj: "major triad", min: "minor triad", dim: "diminished triad", aug: "augmented triad", dom7: "dominant seventh (a major triad and a minor 7th)",
    maj7: "major seventh", min7: "minor seventh", hdim7: "half-diminished seventh (a diminished triad and a minor 7th)", dim7: "fully diminished seventh" };
  var QSYM = { maj: "", min: "m", dim: "°", aug: "+", dom7: "7", maj7: "maj7", min7: "m7", hdim7: "ø7", dim7: "°7" };
  function stack(root, q) { return [{ l: root.l, a: root.a }].concat(QUAL[q].map(function (iv) { return up(root, iv[0], iv[1]); })); }
  function degree(key, d) { var l = (key.tonic.l + d - 1) % 7; return { l: l, a: key.sig[l] }; }
  var NUMS = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7 };

  // a typed (or template) Roman numeral -> spec or null. Figures 6 64 7 65 43 42 (or 2), or /3rd /5th /7th; o for °, h or Ø for ø,
  // # and b for ♯ and ♭; "V7 of V" and V7/V (applied chords, for the levels after ch. 8); N6
  function parseRN(t) {
    t = String(t || "").trim().replace(/\s+of\s+/gi, "/").replace(/\s+/g, "").replace(/♮/g, "")
      .replace(/6\/5/g, "65").replace(/4\/3/g, "43").replace(/4\/2/g, "42").replace(/6\/4/g, "64")
      .replace(/\/3rd/g, "§1").replace(/\/5th/g, "§2").replace(/\/7th/g, "§3").replace(/Ø/g, "ø").replace(/#/g, "♯");
    var nn = /^N(6|64)?$/.exec(t);
    if (nn) return { deg: 2, acc: -1, upper: true, q: "maj", inv: nn[1] === "6" ? 1 : nn[1] === "64" ? 2 : 0, target: null, isN: true };
    var parts = t.split("/"); if (parts.length > 2) return null;
    var m = /^(♭|♯|b)?(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(°|o|ø|h|\+)?(M7|maj7|Δ7|Δ|M|7)?(64|65|43|42|6|2|7|§1|§2|§3)?$/.exec(parts[0]);
    if (!m) return null;
    var num = m[2], upper = num === num.toUpperCase(), qm = m[3] || "", sevm = m[4] || "", fig = m[5] || "";
    if (fig === "7") { if (sevm) return null; sevm = "7"; fig = ""; }
    var figSev = fig === "65" || fig === "43" || fig === "42" || fig === "2" || fig === "§3";
    var sev = !!sevm || figSev || qm === "ø" || qm === "h", q;
    if (qm === "°" || qm === "o") q = sev ? "dim7" : "dim";
    else if (qm === "ø" || qm === "h") { if (/M|Δ/.test(sevm)) return null; q = "hdim7"; }
    else if (qm === "+") { if (sev) return null; q = "aug"; }
    else if (upper) q = sev ? (/M|Δ/.test(sevm) ? "maj7" : "dom7") : "maj";
    else { if (/M|Δ/.test(sevm)) return null; q = sev ? "min7" : "min"; }
    if (sevm === "M" && !fig) return null;
    var inv = sev ? { "": 0, "65": 1, "§1": 1, "43": 2, "§2": 2, "42": 3, "2": 3, "§3": 3 }[fig] : { "": 0, "6": 1, "§1": 1, "64": 2, "§2": 2 }[fig];
    if (inv == null) return null;
    var target = null;
    if (parts.length === 2) { target = parseRN(parts[1]); if (!target || target.target || target.inv || target.isN || /7/.test(target.q)) return null; }
    var acc = m[1] ? (m[1] === "♯" ? 1 : -1) : null;
    return { deg: NUMS[num.toLowerCase()], acc: acc, upper: upper, q: q, inv: inv, target: target, isN: !target && acc === -1 && NUMS[num.toLowerCase()] === 2 && q === "maj" };
  }
  // a spec in a key -> { notes (root first), bass, q, inv, cat } ; cat "" (diatonic or borrowed), "applied", "N"
  function build(key, sp) {
    if (!sp) return null;
    var k = key;
    if (sp.target) {
      var tg = build(key, sp.target); if (!tg || (tg.q !== "maj" && tg.q !== "min")) return null;
      k = keyOn(tg.notes[0], tg.q === "maj" ? "major" : "minor");
    }
    var root = degree(k, sp.deg);
    if (sp.acc != null) root.a += sp.acc;
    else if (k.mode === "minor" && sp.deg === 7 && !sp.upper) root.a += 1;   // vii°, viiø7, vii°7 in minor: on the leading tone
    if (Math.abs(root.a) > 2) return null;
    var notes = stack(root, sp.q); if (sp.inv >= notes.length) return null;
    return { notes: notes, bass: notes[sp.inv], q: sp.q, inv: sp.inv, cat: sp.target ? "applied" : sp.isN ? "N" : "" };
  }
  // a typed lead-sheet symbol -> { notes, bass, q, inv } or null. A small root letter is minor (a, am; a7 = Am7), as in the drills
  var SUF = { "": "maj", M: "maj", maj: "maj", m: "min", min: "min", mi: "min", "-": "min", "°": "dim", o: "dim", dim: "dim", "+": "aug", aug: "aug",
    "7": "dom7", dom7: "dom7", maj7: "maj7", M7: "maj7", "Δ7": "maj7", "Δ": "maj7", ma7: "maj7", m7: "min7", "-7": "min7", min7: "min7", mi7: "min7",
    "ø": "hdim7", "ø7": "hdim7", m7b5: "hdim7", "-7b5": "hdim7", min7b5: "hdim7", mi7b5: "hdim7", "°7": "dim7", o7: "dim7", dim7: "dim7" };
  function parseSym(t) {
    t = String(t || "").replace(/\s+/g, "").replace(/[()]/g, "").replace(/♭5/g, "b5").replace(/Ø/g, "ø");
    var m = /^([A-Ga-g])(##|bb|x|#|b|♯|♭|𝄪|𝄫)?(.*?)(?:\/([A-Ga-g](?:##|bb|x|#|b|♯|♭|𝄪|𝄫)?))?$/.exec(t); if (!m) return null;
    var lower = m[1] !== m[1].toUpperCase(), suf = m[3], q = Object.prototype.hasOwnProperty.call(SUF, suf) ? SUF[suf] : null;
    if (lower) { if (suf === "") q = "min"; else if (suf === "7") q = "min7"; else if (["min", "dim", "hdim7", "dim7", "min7"].indexOf(q) < 0) return null; }
    var root = parseName(m[1].toUpperCase() + (m[2] || "")); if (!root || !q) return null;
    var notes = stack(root, q), inv = 0;
    if (m[4]) { var b = parseName(m[4]); if (!b) return null; inv = -1; notes.forEach(function (n, i) { if (sameName(n, b)) inv = i; }); if (inv < 0) return null; }
    return { notes: notes, bass: notes[inv], q: q, inv: inv, cat: "" };
  }
  function setKey(c) { return c.notes.map(nm).sort().join(","); }
  function sameChord(a, b, ignoreBass) { return !!a && !!b && a.notes.length === b.notes.length && (ignoreBass || sameName(a.bass, b.bass)) && setKey(a) === setKey(b); }

  // ---- how the answer is written
  function figOf(c, style) {
    var sev = c.notes.length === 4;
    if (style === "slash") return (sev ? "7" : "") + ["", "/3rd", "/5th", "/7th"][c.inv];
    return sev ? ["7", "65", "43", "42"][c.inv] : ["", "6", "64"][c.inv];
  }
  function rnText(tok, c, style) {
    if (c.cat === "N") return "N" + (c.inv === 1 ? "6" : c.inv === 2 ? "64" : "");
    var m = /^(♭|♯)?(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(°|ø|\+)?/.exec(tok), head = (m[1] || "") + m[2] + (m[3] || "");
    var f = figOf(c, style); if (c.q === "maj7") f = "M" + f;
    return head + f + (tok.indexOf("/") >= 0 ? tok.slice(tok.indexOf("/")) : "");
  }
  function symText(c, withBass) { return nm(c.notes[0]) + QSYM[c.q] + (withBass && c.inv ? "/" + nm(c.bass) : ""); }

  // ---- levels (Hutchinson ch. 6-8). Templates: [mode, numerals with the book's figures]
  function T(mode, list) { return list.map(function (p) { return [mode, p]; }); }
  var POP = T("major", ["I V vi IV", "I vi IV V", "vi IV I V", "I IV V I", "I IV vi V", "I ♭VII IV I", "I V IV I", "I iii IV V", "I I+ IV iv I", "I IV vii° iii vi ii V I"])
    .concat(T("minor", ["i VI III VII", "i VII VI VII", "i iv VII III", "i VI VII i", "i iv v i", "VI VII i"]));
  var SLASH = T("major", ["I V6 vi iii6 IV I6 IV V", "I I6 IV V", "I V6 vi V IV I6 ii V", "IV I6 V vi", "I vi6 IV V6 I"])
    .concat(T("minor", ["i v6 iv6 V", "i iv6 V i", "i V6 i iv6 V i", "i VI iv6 V"]));
  var RN_ROOT = T("major", ["I IV V I", "I vi ii V I", "I ii V I", "I IV ii V I", "I vi IV V I", "I iii vi IV V I", "I IV I V I", "I V vi iii IV I IV V"])
    .concat(T("minor", ["i iv V i", "i VI iv V i", "i iv i V i", "i III iv V i", "i VII III VI iv V i", "i VI ii° V i"]));
  var RN_INV = T("major", ["I V6 I IV V I", "I I6 IV V I", "I ii6 V I", "I vi IV ii6 V I", "I V64 I6 IV V I", "I vii°6 I6 IV V I", "I IV I6 V I"])
    .concat(T("minor", ["i V6 i iv6 V i", "i ii°6 V i", "i iv6 V i", "i VI iv ii°6 V i", "i vii°6 i6 iv V i"]));
  var SEVENTH = T("major", ["I vi ii7 V7 I", "I IV ii65 V7 I", "I V65 I V43 I6 ii65 V7 I", "IM7 vi7 ii7 V7 IM7", "I IVM7 viiø7 iii7 vi7 ii7 V7 I", "I ii7 V42 I6 V7 I", "I V7 vi IV ii7 V7 I"])
    .concat(T("minor", ["i iv7 V7 i", "i iiø65 V7 i", "i VI iiø7 V7 i", "i vii°7 i V65 i", "i iv V42 i6 iiø65 V7 i", "i VIM7 iv7 V7 i"]));
  var LEVELS = [
    { id: "ch6a", ch: 6, name: "6. Chord symbols, root position", answer: "sym", inv: false, rhythm: "bar", tpl: POP, most: 2 },
    { id: "ch6b", ch: 6, name: "6. Chord symbols with slash chords", answer: "sym", inv: true, rhythm: "half", tpl: SLASH },
    { id: "ch7a", ch: 7, name: "7. Roman numerals, root position", answer: "rn", inv: false, rhythm: "bar", tpl: RN_ROOT },
    { id: "ch7b", ch: 7, name: "7. Roman numerals with inversions", answer: "rn", inv: true, rhythm: "half", tpl: RN_INV },
    { id: "ch8a", ch: 8, name: "8. Seventh chords as symbols", answer: "sym", inv: true, rhythm: "half", tpl: SEVENTH },
    { id: "ch8b", ch: 8, name: "8. Seventh chords as Roman numerals", answer: "rn", inv: true, rhythm: "half", tpl: SEVENTH }
  ];
  var LV = {}, LEVEL_NAMES = {}; LEVELS.forEach(function (L) { LV[L.id] = L; LEVEL_NAMES[L.id] = L.name; });
  var STAGES = ["rh", "guitar", "satb", "broken", "melody"];
  var STAGE_NAMES = { mixed: "Any of the five", rh: "1. Piano right hand (treble only)", guitar: "2. Guitar voicings with TAB", satb: "3. SATB chorale", broken: "4. Broken chords", melody: "5. Melody with non-chord tones" };
  var ENTRY_NAMES = { tap: "Tap the letters", staff: "Click notes on a staff", rotate: "Rotate the stack", type: "Type the letters" };

  var SETTINGS = [
    { id: "level", label: "Level (Hutchinson chapter)", options: LEVELS.map(function (L) { return L.id; }), names: LEVEL_NAMES, def: "ch6a" },
    { id: "texture", label: "Stage (texture)", options: ["mixed"].concat(STAGES), names: STAGE_NAMES, def: "rh" },
    { id: "task", label: "For each chord", options: ["both", "stack", "name"], names: { both: "Stack it, then name it", stack: "Stack it only", name: "Name it only" }, def: "both" },
    { id: "entry", label: "Enter the stack by", options: ["tap", "staff", "rotate", "type"], names: ENTRY_NAMES, def: "tap" },
    { id: "answer", label: "Name with", options: ["auto", "sym", "rn"], names: { auto: "The level's choice", sym: "Chord symbols (C/E, G7)", rn: "Roman numerals (I6, V7)" }, def: "auto" },
    { id: "tenor", label: "SATB: the tenor", options: ["bass", "treble"], names: { bass: "In the bass clef (S A / T B)", treble: "In the treble clef (S A T / B)" }, def: "bass" },
    { id: "mode", label: "Keys", options: ["both", "major", "minor"], names: { both: "Major and minor", major: "Major", minor: "Minor" }, def: "both" },
    { id: "most", label: "Most sharps / flats", options: ["0", "1", "2", "3", "4", "5"], def: "3" },
    { id: "key", label: "The key", options: ["show", "find"], names: { show: "Given", find: "Find it yourself" }, def: "show" },
    { id: "rhythm", label: "Chord changes", options: ["auto", "bar", "half"], names: { auto: "The level's choice", bar: "One chord a bar", half: "Two chords a bar" }, def: "auto" }
  ];
  function parseSettings(str) {
    var q = {}, s = {};
    String(str || "").replace(/^\?/, "").split("&").forEach(function (kv) { var i = kv.indexOf("="); if (i > 0) q[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1).replace(/\+/g, " ")); });
    SETTINGS.forEach(function (d) { s[d.id] = q[d.id] != null && d.options.indexOf(q[d.id]) >= 0 ? q[d.id] : d.def; });
    if (q.level && LV[q.level] && q.most == null && LV[q.level].most != null) s.most = String(LV[q.level].most);
    if (q.seed) s.seed = q.seed >>> 0;
    if (q.prog) s.prog = q.prog;
    if (q.key && !/^(show|find)$/.test(q.key)) { s.keyName = q.key; s.key = "show"; }
    return s;
  }
  function settingsString(s) { return SETTINGS.map(function (d) { return d.id + "=" + encodeURIComponent(s[d.id]); }).join("&"); }

  // ---- voicings
  function placeNear(n, target, lo, hi) {
    var best = null;
    for (var o = 1; o <= 6; o++) { var d = o * 7 + n.l; if (d < lo || d > hi) continue; if (!best || Math.abs(d - target) < Math.abs(dia(best) - target)) best = { l: n.l, a: n.a, o: o }; }
    return best;
  }
  function closeFrom(list, startD) {   // the notes of list, in this order, each the next one up from the diatonic step startD
    var out = [], d = startD;
    while (((d % 7) + 7) % 7 !== list[0].l) d++;
    list.forEach(function (n, i) { if (i) { d = dia(out[i - 1]) + 1; while (((d % 7) + 7) % 7 !== n.l) d++; } out.push({ l: n.l, a: n.a, o: Math.floor(d / 7) }); });
    return out;
  }
  // upper: close position, near the chord before; rh=true: every chord tone, inversion picked at random (the right hand alone)
  function voice(chords, rh, bassRange) {
    var prevB = bassRange ? bassRange[2] : 21, prevU = null;
    return chords.map(function (c) {
      var b = placeNear(c.bass, prevB, bassRange ? bassRange[0] : 16, bassRange ? bassRange[1] : 24); prevB = dia(b);
      var ul = !rh && c.notes.length > 3 ? c.notes.filter(function (n) { return !sameName(n, c.bass); }) : c.notes.slice(), cands = [];
      for (var r = 0; r < ul.length; r++) {
        var rot = ul.slice(r).concat(ul.slice(0, r));
        for (var d = 28; d <= 35; d++) {
          if (d % 7 !== rot[0].l) continue;
          var v = closeFrom(rot, d), ms = v.map(midi), top = ms[ms.length - 1];
          if (top > (rh ? 84 : 81) || ms[0] < 60) continue;
          cands.push({ v: v, sc: (prevU ? Math.abs(top - prevU[prevU.length - 1]) + Math.abs(ms[0] - prevU[0]) : Math.abs(top - 74)) + rng() * (rh ? 12 : 1.5) });
        }
      }
      cands.sort(function (x, y) { return x.sc - y.sc; });
      var best = cands[0].v; prevU = best.map(midi);
      var lh = [b], have = [pcOf(b)];
      for (var k = dia(b) + 1; k < dia(b) + 14 && lh.length < 3; k++) c.notes.forEach(function (n) { if (lh.length < 3 && n.l === ((k % 7) + 7) % 7 && have.indexOf(pcOf(n)) < 0) { lh.push({ l: n.l, a: n.a, o: Math.floor(k / 7) }); have.push(pcOf(n)); } });
      return { bass: b, upper: best, lh: lh };
    });
  }
  // guitar: standard tuning; every playable shape in open position (frets 0-3) or a four-fret window up to the 7th fret,
  // scored: more strings, open strings, low position; contiguous strings, the bass on the lowest string played
  var STRINGS = [40, 45, 50, 55, 59, 64];
  function guitarShape(c) {
    var pcs = c.notes.map(pcOf), bpc = pcOf(c.bass), best = null;
    for (var p = 0; p <= 7; p++) {
      var opts = STRINGS.map(function (s) {
        var o = [null];
        for (var f = p; f <= p + 3; f++) { if (pcs.indexOf((s + f) % 12) >= 0) o.push(f); }
        return o;
      });
      (function rec(i, fr) {
        if (i < 6) { opts[i].forEach(function (f) { rec(i + 1, fr.concat([f])); }); return; }
        var on = []; fr.forEach(function (f, k) { if (f != null) on.push(k); });
        if (on.length < 4 || on[on.length - 1] - on[0] !== on.length - 1) return;
        var ms = on.map(function (k) { return STRINGS[k] + fr[k]; }); if (Math.min.apply(null, ms) % 12 !== bpc || ms[0] !== Math.min.apply(null, ms)) return;
        var got = {}; on.forEach(function (k) { got[(STRINGS[k] + fr[k]) % 12] = 1; });
        if (pcs.some(function (x) { return !got[x]; })) return;
        var fretted = on.filter(function (k) { return fr[k] > 0; }).map(function (k) { return fr[k]; });
        var lo = fretted.length ? Math.min.apply(null, fretted) : 0, hi = fretted.length ? Math.max.apply(null, fretted) : 0;
        var atLo = fretted.filter(function (f) { return f === lo; }).length, fingers = fretted.length - (atLo > 1 && p ? atLo - 1 : 0);
        if (fingers > 4 || hi - lo > 3) return;
        var opens = on.filter(function (k) { return fr[k] === 0; }).length;
        var sc = on.length * 3 + opens * 1.2 - lo * 0.8 + rng() * 2;
        if (!best || sc > best.sc) best = { sc: sc, frets: fr.slice() };
      })(0, []);
      if (best && p === 0 && best.sc > 14) break;
    }
    if (!best) return null;
    var notes = [];
    best.frets.forEach(function (f, k) {
      if (f == null) return; var m = STRINGS[k] + f, n = c.notes.filter(function (x) { return pcOf(x) === m % 12; })[0];
      notes.push(spelledAt(n, m + 12));   // guitar music is written an octave above the sound
    });
    return { frets: best.frets, notes: notes };
  }
  function satbVoice(chords, tenorTreble) {
    var vs = voice(chords, false, [14, 22, 18]);
    return vs.map(function (v) {
      var u = v.upper.slice(), S = u[u.length - 1], A, Tn;
      if (tenorTreble) { A = u[1]; Tn = u[0]; }
      else {
        A = u[0]; Tn = { l: u[1].l, a: u[1].a, o: u[1].o - 1 };
        if (midi(Tn) <= midi(v.bass)) { A = u[1]; Tn = u[0]; }
      }
      var B = v.bass; if (midi(B) >= midi(Tn)) B = { l: B.l, a: B.a, o: B.o - 1 };
      return { S: S, A: A, T: Tn, B: B };
    });
  }
  function spansFor(n, rhythm) {
    var lens = [], i;
    if (rhythm === "bar") for (i = 0; i < n; i++) lens.push(8);
    else { for (i = 0; i < n; i++) lens.push(4); if (n % 2 === 0) lens[0] = 8; lens[n - 1] = 8; }
    var at = 0; return lens.map(function (L) { var s = { start: at, len: L }; at += L; return s; });
  }
  function stepOk(a, b) { var d = Math.abs(midi(a) - midi(b)); return d === 1 || d === 2; }
  // the melody: quarters on chord tones (a chord tone the left hand leaves out comes first), the last chord held; some quarters
  // split into a chord tone and a passing or neighbor tone (eighths) that is not a chord tone and is spelled from the key
  function melody(chords, vs, spans, key) {
    var ev = [], prev = 35;
    chords.forEach(function (c, i) {
      var miss = c.notes.filter(function (n) { return !vs[i].lh.some(function (x) { return pcOf(x) === pcOf(n); }); });
      var last = i === chords.length - 1, beats = last ? 1 : spans[i].len / 2;
      for (var b = 0; b < beats; b++) {
        var pool = b === 0 && miss.length ? miss : c.notes, cand = [];
        pool.forEach(function (n) { for (var o = 4; o <= 5; o++) { var d = o * 7 + n.l; if (d >= 30 && d <= 39) cand.push({ l: n.l, a: n.a, o: o }); } });
        cand.sort(function (x, y) { return Math.abs(dia(x) - prev) - Math.abs(dia(y) - prev) || rng() - 0.5; });
        var ch = cand.filter(function (x) { return dia(x) !== prev; })[0] || cand[0];
        ev.push({ n: ch, dur: last ? spans[i].len : 2, ci: i }); prev = dia(ch);
      }
    });
    var out = [];
    ev.forEach(function (e, k) {
      var nx = ev[k + 1];
      if (nx && e.dur === 2 && rng() < 0.6) {
        var gap = dia(nx.n) - dia(e.n), c = chords[e.ci], d = null, kind = null;
        if (Math.abs(gap) === 2) { d = dia(e.n) + gap / 2; kind = "passing"; }
        else if (gap === 0) { d = dia(e.n) + (rng() < 0.5 ? 1 : -1); kind = "neighbor"; }
        if (d != null) {
          var l = ((d % 7) + 7) % 7, nextHas = chords[nx.ci].notes.filter(function (x) { return x.l === l; })[0];
          var tries = [key.sig[l]].concat(nextHas ? [nextHas.a] : []), x = null;
          if (!c.notes.some(function (y) { return y.l === l; })) for (var t = 0; t < tries.length && !x; t++) { var cnd = { l: l, a: tries[t], o: Math.floor(d / 7) }; if (stepOk(e.n, cnd) && stepOk(cnd, nx.n)) x = cnd; }
          if (x) { out.push({ notes: [e.n], dur: 1, ci: e.ci }); out.push({ notes: [x], dur: 1, ci: e.ci, nct: kind }); return; }
        }
      }
      out.push({ notes: [e.n], dur: e.dur, ci: e.ci });
    });
    return out;
  }
  function noteTok(n, sig, st) {
    var k = n.l + "/" + n.o, cur = Object.prototype.hasOwnProperty.call(st, k) ? st[k] : sig[n.l]; st[k] = n.a;
    var s = (n.a !== cur ? ACC_ABC[n.a] : "") + (n.o >= 5 ? LET[n.l].toLowerCase() : LET[n.l]);
    for (var a = 5; a < n.o; a++) s += "'"; for (var b = 4; b > n.o; b--) s += ",";
    return s;
  }
  function voiceAbc(evs, key, numbered) {
    var out = [], pos = 0, st = {}, seen = {};
    evs.forEach(function (e) {
      if (pos && pos % 8 === 0) { out.push("|"); st = {}; }
      var ns = e.notes.map(function (n) { return noteTok(n, key.sig, st); }), s = "";
      if (numbered && !seen[e.ci]) { s += '"^' + (e.ci + 1) + '"'; seen[e.ci] = 1; }
      s += (ns.length > 1 ? "[" + ns.join("") + "]" : ns[0]) + (e.dur === 1 ? "" : e.dur);
      out.push(s); pos += e.dur;
    });
    return out.join(" ") + " |]";
  }
  // the passage in one stage -> { voices: [{ id, clef, evs }], score, shapes, transpose }
  function arrange(tex, chords, spans, key, tenorTreble) {
    var V = function (id, clef, evs) { return { id: id, clef: clef, evs: evs }; };
    if (tex === "rh") {
      var vr = voice(chords, true);
      return { voices: [V("1", "treble", chords.map(function (c, i) { return { notes: vr[i].upper, dur: spans[i].len, ci: i }; }))], score: "" };
    }
    if (tex === "guitar") {
      var shapes = chords.map(guitarShape); if (shapes.some(function (x) { return !x; })) return null;
      return { voices: [V("1", "treble", chords.map(function (c, i) { return { notes: shapes[i].notes, dur: spans[i].len, ci: i }; }))], score: "", shapes: shapes, transpose: -12 };
    }
    if (tex === "satb") {
      var sv = satbVoice(chords, tenorTreble), ev = function (p) { return chords.map(function (c, i) { return { notes: [sv[i][p]], dur: spans[i].len, ci: i }; }); };
      if (tenorTreble) return { voices: [V("1", "treble", chords.map(function (c, i) { return { notes: [sv[i].T, sv[i].A, sv[i].S], dur: spans[i].len, ci: i }; })), V("2", "bass", ev("B"))], score: "{1 2}" };
      return { voices: [V("1", "treble", ev("S")), V("2", "treble", ev("A")), V("3", "bass", ev("T")), V("4", "bass", ev("B"))], score: "{(1 2) (3 4)}", satb: true };
    }
    var vs = voice(chords, false), rh = [], lh = [], alb = tex === "melody" && rng() < 0.5;
    chords.forEach(function (c, i) {
      var v = vs[i], len = spans[i].len, last = i === chords.length - 1, u = v.upper;
      if (tex === "broken") {
        if (last) rh.push({ notes: u, dur: len, ci: i });
        else { var pat = u.length >= 3 ? [u[0], u[1], u[2], u[1]] : [u[0], u[1], u[0], u[1]]; for (var k = 0; k < len; k++) rh.push({ notes: [pat[k % 4]], dur: 1, ci: i }); }
        lh.push({ notes: [v.bass], dur: len, ci: i });
      } else if (alb && !last) {
        var L = v.lh, ap = L.length >= 3 ? [L[0], L[2], L[1], L[2]] : [L[0], L[1], L[0], L[1]];
        for (var j = 0; j < len; j++) lh.push({ notes: [ap[j % 4]], dur: 1, ci: i });
      } else lh.push({ notes: v.lh, dur: len, ci: i });
    });
    if (tex === "melody") rh = melody(chords, vs, spans, key);
    return { voices: [V("1", "treble", rh), V("2", "bass", lh)], score: "{1 2}" };
  }

  // ---- one passage
  function entry(key, tok) { var c = build(key, parseRN(tok)); if (c) c.tok = tok; return c; }
  function make(s) {
    var seed = s.seed != null ? s.seed >>> 0 : Math.floor(Math.random() * 4294967296);
    rng = seeded(seed);
    try {
      var L = LV[s.level] || LEVELS[0], answer = s.answer === "auto" ? L.answer : s.answer, rhythm = s.rhythm === "auto" ? L.rhythm : s.rhythm;
      for (var tries = 0; tries < 200; tries++) {
        var tpl, key;
        if (s.prog) { key = keyNamed(s.keyName || "C"); tpl = [key.mode, s.prog]; }
        else {
          var mode = s.mode === "both" ? pick(["major", "minor"]) : s.mode, pool = L.tpl.filter(function (t) { return t[0] === mode; });
          tpl = pick(pool.length ? pool : L.tpl); key = randomKey(tpl[0], +s.most);
        }
        var chords = tpl[1].split(" ").map(function (t) { return entry(key, t); });
        if (chords.some(function (c) { return !c; })) { if (s.prog) return null; continue; }
        if (!s.prog && chords.some(function (c) { return c.notes.some(function (n) { return Math.abs(n.a) > 1; }); })) continue;
        var tex = s.texture === "mixed" || STAGES.indexOf(s.texture) < 0 ? pick(STAGES) : s.texture;
        var spans = spansFor(chords.length, rhythm), arr = arrange(tex, chords, spans, key, s.tenor === "treble");
        if (!arr) { if (s.prog) return null; continue; }
        if (tex === "rh") chords = chords.map(function (c, i) {   // the right hand alone: its lowest note is the bass
          var lo = arr.voices[0].evs[i].notes[0], k = c.notes.map(nm).indexOf(nm(lo));
          return Object.assign({}, c, { bass: c.notes[k], inv: k });
        });
        var abc = "X:1\nM:4/4\nL:1/8\n" + (arr.score ? "%%score " + arr.score + "\n" : "") +
          arr.voices.map(function (v) { return "V:" + v.id + " clef=" + v.clef + (arr.satb ? " stem=" + (+v.id % 2 ? "up" : "down") : ""); }).join("\n") + "\nK:" + key.abc + "\n" +
          arr.voices.map(function (v, k) { return "[V:" + v.id + "] " + voiceAbc(v.evs, key, k === 0); }).join("\n") + "\n";
        var ncts = [];
        arr.voices.forEach(function (v) { var at = 0; v.evs.forEach(function (e) { if (e.nct) ncts.push({ ci: e.ci, t: at, note: e.notes[0], kind: e.nct }); at += e.dur; }); });
        var items = chords.map(function (c, i) {
          var tok = c.tok;
          if (tex === "rh" && c.inv !== build(key, parseRN(tok)).inv) tok = tok.replace(/(64|65|43|42|6|7)$/, "") + (c.notes.length === 4 ? "7" : "");
          return { chord: c, rn: rnText(tok, c, "fig"), rnSlash: rnText(tok, c, "slash"), sym: symText(c, true), symRoot: symText(c, false), span: spans[i] };
        });
        return { seed: seed, key: key, level: L.id, inv: L.inv, answer: answer, findKey: s.key === "find", texture: tex, abc: abc, items: items, ncts: ncts,
          qpm: tex === "melody" || tex === "broken" ? 84 : 66, voices: arr.voices, shapes: arr.shapes || null, transpose: arr.transpose || 0, bars: (spans[spans.length - 1].start + spans[spans.length - 1].len) / 8, prog: tpl[1] };
      }
      return null;
    } finally { rng = Math.random; }
  }

  // ---- what chord i sounds: every written note in its span (low to high), and its different notes, with the non-chord tones
  function sounding(q, i, withNct) {
    var out = [];
    q.voices.forEach(function (v) { v.evs.forEach(function (e) { if (e.ci === i && (withNct || !e.nct)) e.notes.forEach(function (n) { out.push(n); }); }); });
    return out.sort(function (a, b) { return midi(a) - midi(b); });
  }
  function letters(q, i) {   // the different note names in chord i's span, lowest first, non-chord tones included
    var seen = {}, out = [];
    sounding(q, i, true).forEach(function (n) { if (!seen[nm(n)]) { seen[nm(n)] = 1; out.push({ l: n.l, a: n.a }); } });
    return out;
  }

  // ---- checking
  function expected(q, i) { var it = q.items[i]; return q.answer === "sym" ? (q.inv ? it.sym : it.symRoot) : (q.inv ? it.rn : it.rn.replace(/(64|6)$/, "").replace(/(65|43|42)$/, "7")); }
  function check(q, i, typed) {
    var c = q.items[i].chord, t = String(typed || "").trim(); if (!t) return false;
    if (q.answer === "sym") { var sy = parseSym(t); return sameChord(sy, c, !q.inv); }
    var mine = build(q.key, parseRN(t)); return !!mine && mine.cat === c.cat && sameChord(mine, c, !q.inv);
  }
  function checkKey(q, typed) { var k = keyNamed(typed); return !!k && k.mode === q.key.mode && sameName(k.tonic, q.key.tonic); }
  // a stack (spelled notes, bottom up) -> { ok, msg }
  function checkStack(q, i, list) {
    var c = q.items[i].chord, want = c.notes;
    if (!list || !list.length) return { ok: false, msg: "Nothing stacked yet." };
    var names = list.map(nm), wn = want.map(nm), heard = letters(q, i).map(nm);
    var extra = names.filter(function (x) { return wn.indexOf(x) < 0; }), dup = names.filter(function (x, k) { return names.indexOf(x) !== k; });
    if (extra.length) {
      var nct = q.ncts.filter(function (x) { return x.ci === i && extra.indexOf(nm(x.note)) >= 0; });
      if (nct.length) return { ok: false, msg: extra.join(", ") + " is a " + nct[0].kind + " tone, not part of the chord: leave it out." };
      return { ok: false, msg: extra.join(", ") + (heard.indexOf(extra[0]) < 0 ? " isn't in chord " + (i + 1) + ". Check the spelling against the score." : " doesn't belong in the stack.") };
    }
    if (dup.length) return { ok: false, msg: "Each note goes in once: " + dup[0] + " is there twice. Doublings drop out of the stack." };
    var missing = wn.filter(function (x) { return names.indexOf(x) < 0; });
    if (missing.length) return { ok: false, msg: "A note is missing: look at every staff in the chord's beats." };
    if (names[0] !== wn[0]) return { ok: false, msg: "The right notes, but they aren't all a third apart from the bottom. Move the bottom note to the top and look again." };
    if (names.join() !== wn.join()) return { ok: false, msg: "Root at the bottom, then each note a third above the last." };
    return { ok: true, msg: "Root position: " + wn.join("–") + "." };
  }

  // ---- the guide's steps for one chord
  var IV3 = { 3: "minor 3rd", 4: "major 3rd" }, IV5 = { 6: "diminished 5th", 7: "perfect 5th", 8: "augmented 5th" }, IV7 = { 9: "diminished 7th", 10: "minor 7th", 11: "major 7th" };
  var ORD = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th"], MEMBER = ["root", "3rd", "5th", "7th"], INV_NAME = ["root position", "first inversion", "second inversion", "third inversion"];
  var READ = { rh: "Read the chord from the bottom up.", guitar: "Guitar chords double notes, and guitar music is written an octave above the sound: read the notes as written, top to bottom; the TAB shows the same notes as frets.",
    satb: "Read all four voices: soprano and alto on the top staff, tenor and bass below (or the tenor with them, in keyboard style).", broken: "The notes of a broken chord come one after another: everything from the chord's number to the next one belongs together.",
    melody: "Take the left hand's notes, then the melody's." };
  function semis(a, b) { return ((pcOf(b) - pcOf(a)) % 12 + 12) % 12; }
  function where(it) { var b = Math.floor(it.span.start / 8) + 1; return "bar " + b + (it.span.len === 8 ? "" : it.span.start % 8 ? ", second half" : ", first half"); }
  function steps(q, i) {
    var it = q.items[i], c = it.chord, key = q.key, out = [], ns = sounding(q, i, true), lets = letters(q, i);
    var nc = q.ncts.filter(function (x) { return x.ci === i; });
    out.push({ h: "Collect the notes", t: "Chord " + (i + 1) + " (" + where(it) + "): " + ns.map(nm).join(" ") + ". " + READ[q.texture] });
    if (nc.length) out.push({ h: "Leave out the non-chord tones", t: nc.map(function (x) { return nm(x.note) + " is a " + x.kind + " tone: a short off-beat note that " + (x.kind === "passing" ? "steps between two chord tones" : "steps away and comes back"); }).join("; ") + "." });
    var chordLets = lets.filter(function (n) { return !nc.some(function (x) { return sameName(x.note, n); }); });
    out.push({ h: "One of each", t: "Cross out repeats" + (ns.length > chordLets.length + nc.length ? " (doublings)" : "") + ": " + chordLets.map(nm).join(", ") + "." });
    out.push({ h: "Rearrange into close root position", t: "Find the order where every note is a third above the one below: " + c.notes.map(nm).join("–") + ". The bottom note of that stack is the root, " + nm(c.notes[0]) + ". (Letters a third apart skip one letter: C–E–G–B.)" });
    var r = c.notes[0];
    out.push({ h: "Quality", t: "Above " + nm(r) + ": a " + IV3[semis(r, c.notes[1])] + " and a " + IV5[semis(r, c.notes[2])] + (c.notes[3] ? ", and a " + IV7[semis(r, c.notes[3])] : "") + ". That is a " + QNAME[c.q] + "." });
    if (q.inv) out.push({ h: "Bass", t: "The lowest note is " + nm(c.bass) + ", the " + MEMBER[c.inv] + ": " + INV_NAME[c.inv] + "." });
    if (q.answer === "sym") { out.push({ h: "Answer", t: (q.inv ? it.sym : it.symRoot) + (q.inv && c.inv ? " (the slash and the bass note show the inversion)" : "") }); return out; }
    var dg = ((r.l - key.tonic.l) % 7 + 7) % 7 + 1, num = ["i", "ii", "iii", "iv", "v", "vi", "vii"][dg - 1], big = /^(maj|aug|dom7|maj7)$/.test(c.q);
    var raised = key.mode === "minor" && c.notes.filter(function (n) { return n.l === (key.tonic.l + 6) % 7 && n.a === key.sig[n.l] + 1; })[0];
    var low = r.a !== key.sig[r.l] && !(raised && sameName(raised, r));
    out.push({ h: "Scale degree", t: nm(r) + " is the " + ORD[dg - 1] + " degree of " + key.label + (low ? ", lowered: ♭" + dg : "") + ". " + (big ? "A major quality takes a capital numeral, " : "A minor or diminished quality takes a small one, ") + (low ? "♭" : "") + (big ? num.toUpperCase() : num) + "." +
      (raised ? " " + nm(raised) + " is the raised 7th (the leading tone), as usual in minor." : "") });
    if (q.inv) out.push({ h: "Inversion", t: c.notes.length === 4 ? "Seventh chords: 7 (root position), 65, 43, 42 (or /3rd, /5th, /7th)." : "Triads: nothing for root position, 6 for first inversion, 64 for second (or /3rd, /5th)." });
    out.push({ h: "Answer", t: expected(q, i) + (q.inv && it.rnSlash !== it.rn ? " (or " + it.rnSlash + ")" : "") });
    return out;
  }

  // ---- drawing
  function stackAbc(list) {   // a close stack from about middle C, explicit accidentals (no key signature)
    var v = closeFrom(list, 28), st = {};
    return "X:1\nL:1/4\nK:C\n[" + v.map(function (n) { var s = noteTok(n, [0, 0, 0, 0, 0, 0, 0], st); return n.a === 0 ? s.replace(/^=/, "") : s; }).join("") + "]4 |]\n";
  }
  function tabSvg(q, xs, W) {   // the frets of each chord under its notes (xs: each chord's x on the score), high E string on top
    var sp = 11, top = 8, ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg"); svg.setAttribute("viewBox", "0 0 " + W + " " + (top + 5 * sp + 8)); svg.setAttribute("class", "ca-tab"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "TAB");
    function t(x, y, s, cls) { var e = document.createElementNS(ns, "text"); e.setAttribute("x", x); e.setAttribute("y", y); e.setAttribute("class", cls || ""); e.textContent = s; svg.appendChild(e); }
    for (var k = 0; k < 6; k++) { var ln = document.createElementNS(ns, "line"); ln.setAttribute("x1", 2); ln.setAttribute("x2", W - 2); ln.setAttribute("y1", top + k * sp); ln.setAttribute("y2", top + k * sp); svg.appendChild(ln); }
    t(4, top + 2.5 * sp + 4, "TAB", "ca-tab-l");
    q.shapes.forEach(function (sh, i) {
      var x = xs[i] != null ? xs[i] : 60 + i * (W - 80) / Math.max(1, q.shapes.length - 1);
      sh.frets.forEach(function (f, s) { var y = top + (5 - s) * sp; var bg = document.createElementNS(ns, "rect"); bg.setAttribute("x", x - 5); bg.setAttribute("y", y - 5); bg.setAttribute("width", 10); bg.setAttribute("height", 10); bg.setAttribute("class", "ca-tab-bg"); svg.appendChild(bg); t(x, y + 4, f == null ? "x" : String(f), "ca-tab-f"); });
    });
    return svg;
  }
  function placeTab(paper, holder, q) {   // after abcjs has drawn: one TAB column under each chord of voice 1
    var old = paper.querySelector(".ca-tab"); if (old) old.remove();
    var W = holder.clientWidth || 600, base = holder.getBoundingClientRect().left, xs = [];
    [].forEach.call(holder.querySelectorAll(".abcjs-note.abcjs-v0"), function (e) { var r = e.getBoundingClientRect(); xs.push(r.left - base + r.width / 2); });
    paper.appendChild(tabSvg(q, xs.length === q.shapes.length ? xs : [], W));
  }

  // ---- the four ways to enter a stack. Each calls set(list) with the notes bottom up; view() redraws.
  function entryWidget(kind, q, i, set) {
    var box = el("div", "ca-entry"), cur = [], lets = letters(q, i);
    function changed() { set(cur.slice()); }
    if (kind === "tap") {
      box.appendChild(el("div", "ca-help", "Tap the notes from the bottom of the stack up. Leave out any that aren't in the chord."));
      var row = el("div", "ca-row");
      lets.forEach(function (n) { var b = btn(nm(n)); b.addEventListener("click", function () { cur.push(n); changed(); }); row.appendChild(b); });
      var undo = btn("⌫"); undo.addEventListener("click", function () { cur.pop(); changed(); }); row.appendChild(undo);
      var clr = btn("Clear"); clr.addEventListener("click", function () { cur = []; changed(); }); row.appendChild(clr);
      box.appendChild(row);
    } else if (kind === "type") {
      box.appendChild(el("div", "ca-help", "Type the notes from the bottom up, with spaces: C E G, or Eb G Bb D."));
      var inp = el("input", "form-control form-control-sm"); inp.autocomplete = "off"; inp.spellcheck = false; inp.setAttribute("aria-label", "Notes, bottom up");
      inp.addEventListener("input", function () { cur = parseNotes(inp.value) || []; changed(); });
      box.appendChild(inp);
    } else if (kind === "rotate") {
      cur = lets.slice();
      box.appendChild(el("div", "ca-help", "These are the chord's notes as written, lowest first, one of each. ✕ takes out a note that isn't in the chord. ⤒ moves the bottom note to the top: keep going until every note is a third above the one below."));
      var list = el("div", "ca-row"), rowR = el("div", "ca-row"), rot = btn("⤒ Bottom note to the top"), reset = btn("Start again");
      function draw() {
        list.innerHTML = "";
        cur.forEach(function (n, k) { var chip = el("span", "ca-chip", nm(n) + " "), x = btn("✕"); x.className = "ca-x"; x.setAttribute("aria-label", "Leave out " + nm(n)); x.addEventListener("click", function () { cur.splice(k, 1); draw(); changed(); }); chip.appendChild(x); list.appendChild(chip); });
      }
      rot.addEventListener("click", function () { if (cur.length) cur.push(cur.shift()); draw(); changed(); });
      reset.addEventListener("click", function () { cur = lets.slice(); draw(); changed(); });
      rowR.appendChild(rot); rowR.appendChild(reset); box.appendChild(list); box.appendChild(rowR); draw();
      setTimeout(changed, 0);
    } else {   // staff: click a line or space; the note takes the spelling the passage gives that letter; ♯ ♭ ♮ change the last one
      box.appendChild(el("div", "ca-help", "Click a line or space to add a note there (click it again to take it off). ♯ ♭ ♮ change the last note you added. Build it from the bottom up."));
      var ns = "http://www.w3.org/2000/svg", W = 220, gap = 7, bottomD = 26, topD = 42, Y = function (d) { return 16 + (topD - d) * gap / 2 * 1; };
      var svg = document.createElementNS(ns, "svg"); svg.setAttribute("viewBox", "0 0 " + W + " " + (Y(bottomD) + 14)); svg.setAttribute("class", "ca-staff");
      var placed = [], lastD = null;
      function spell(d) { var l = d % 7, n = lets.filter(function (x) { return x.l === l; })[0]; return { l: l, a: n ? n.a : q.key.sig[l], o: Math.floor(d / 7) }; }
      function redraw() {
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        for (var d = 30; d <= 38; d += 2) { var ln = document.createElementNS(ns, "line"); ln.setAttribute("x1", 4); ln.setAttribute("x2", W - 4); ln.setAttribute("y1", Y(d)); ln.setAttribute("y2", Y(d)); svg.appendChild(ln); }
        var gc = document.createElementNS(ns, "text"); gc.setAttribute("x", 6); gc.setAttribute("y", Y(31) + 8); gc.setAttribute("class", "ca-clef"); gc.textContent = "𝄞"; svg.appendChild(gc);
        placed.sort(function (a, b) { return dia(a) - dia(b); });
        placed.forEach(function (n) {
          var d = dia(n), x = 120, y = Y(d);
          for (var l = (d <= 28 ? 28 : 40); d <= 28 ? l >= d : l <= d; l += d <= 28 ? -2 : 2) { var lg = document.createElementNS(ns, "line"); lg.setAttribute("x1", x - 13); lg.setAttribute("x2", x + 13); lg.setAttribute("y1", Y(l)); lg.setAttribute("y2", Y(l)); svg.appendChild(lg); }
          var e = document.createElementNS(ns, "ellipse"); e.setAttribute("cx", x); e.setAttribute("cy", y); e.setAttribute("rx", 6.5); e.setAttribute("ry", 4.6); e.setAttribute("class", "ca-head"); svg.appendChild(e);
          if (n.a) { var tx = document.createElementNS(ns, "text"); tx.setAttribute("x", x - 22); tx.setAttribute("y", y + 4); tx.setAttribute("class", "ca-acc"); tx.textContent = ACC_TXT[n.a]; svg.appendChild(tx); }
          var lb = document.createElementNS(ns, "text"); lb.setAttribute("x", x + 16); lb.setAttribute("y", y + 4); lb.setAttribute("class", "ca-lab"); lb.textContent = nm(n); svg.appendChild(lb);
        });
        var hit = document.createElementNS(ns, "rect"); hit.setAttribute("x", 0); hit.setAttribute("y", 0); hit.setAttribute("width", W); hit.setAttribute("height", Y(bottomD) + 14); hit.setAttribute("fill", "transparent"); svg.appendChild(hit);
        cur = placed.map(function (n) { return { l: n.l, a: n.a }; }); changed();
      }
      svg.addEventListener("click", function (e) {
        var r = svg.getBoundingClientRect(), y = (e.clientY - r.top) * (Y(bottomD) + 14) / r.height, d = Math.round(topD - (y - 16) * 2 / gap);
        if (d < bottomD || d > topD) return;
        var k = placed.map(dia).indexOf(d);
        if (k >= 0) { placed.splice(k, 1); lastD = null; } else { placed.push(spell(d)); lastD = d; }
        redraw();
      });
      var accRow = el("div", "ca-row");
      [["♯", 1], ["♭", -1], ["♮", 0]].forEach(function (p) {
        var b = btn(p[0]); b.addEventListener("click", function () { var n = placed.filter(function (x) { return dia(x) === lastD; })[0]; if (n) { n.a = p[1]; redraw(); } }); accRow.appendChild(b);
      });
      var clr2 = btn("Clear"); clr2.addEventListener("click", function () { placed = []; lastD = null; redraw(); }); accRow.appendChild(clr2);
      box.appendChild(svg); box.appendChild(accRow); redraw();
      box._place = function (d) { placed.push(spell(d)); lastD = d; redraw(); };   // for tests
    }
    return box;
  }

  // ---- the widget
  var CSS = ".ca{border:1px solid var(--bs-border-color,#ccc);border-radius:8px;padding:.8rem 1rem;margin:1rem 0}" +
    ".ca-top{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:baseline}.ca-title{font-size:1.05rem;font-weight:600;margin:0}" +
    ".ca-prompt{margin:.4rem 0}.ca-paper{overflow-x:auto}.ca-row{display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;margin:.35rem 0}" +
    ".ca-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(8.5rem,1fr));gap:.5rem;margin:.6rem 0}" +
    ".ca-card{border:1px solid var(--bs-border-color,#ddd);border-radius:6px;padding:.35rem .45rem}.ca-card>b{font-size:.9rem}" +
    ".ca-card input{width:100%;margin:.15rem 0}.ca-card.ok{border-color:#198754;background:rgba(25,135,84,.08)}.ca-card.no{border-color:#b02a37;background:rgba(176,42,55,.07)}" +
    ".ca-card.on{outline:2px solid #6c8ebf}.ca-want{font-size:.85rem;color:#b02a37}.ca-mark{font-size:.8rem}" +
    ".ca-panel{margin:.6rem 0;padding:.6rem .8rem;border-left:3px solid #6c8ebf;background:rgba(108,142,191,.08)}" +
    ".ca-panel ol{margin:.2rem 0;padding-left:1.3rem}.ca-panel li{margin:.15rem 0}.ca-fb{font-weight:600}.ca-fb.ok,.ca-ok{color:#198754}.ca-no{color:#b02a37}" +
    ".ca-stackview{display:flex;gap:1rem;align-items:center;flex-wrap:wrap}.ca-stackview .ca-mini{width:110px}" +
    ".ca-settings{margin-top:.6rem}.ca-form{display:grid;grid-template-columns:repeat(auto-fill,minmax(15rem,1fr));gap:.4rem .8rem;margin:.4rem 0}" +
    ".ca-form label{font-size:.85rem;display:block}.ca-help{font-size:.85rem;opacity:.85}" +
    ".ca-chip{display:inline-flex;align-items:center;border:1px solid var(--bs-border-color,#bbb);border-radius:4px;padding:.1rem .1rem .1rem .45rem;font-weight:600}" +
    ".ca-x{border:0;background:none;color:inherit;opacity:.6;padding:0 .3rem}.ca-staff{width:240px;max-width:100%;cursor:pointer}" +
    ".ca-staff line,.ca-tab line{stroke:currentColor;stroke-width:1}.ca-head{fill:currentColor}.ca-acc,.ca-lab,.ca-clef{fill:currentColor;font-size:13px}.ca-clef{font-size:34px}" +
    ".ca-tab{width:100%;max-width:720px;color:var(--bs-body-color,#222)}.ca-tab text{fill:currentColor;font:12px monospace;text-anchor:middle}.ca-tab .ca-tab-l{text-anchor:start;font-weight:700}.ca-tab-bg{fill:var(--bs-body-bg,#fff)}" +
    ".ca-ex summary{font-weight:600}.ca-rep h3{font-size:1.15rem}.ca-rep h4{font-size:1rem;margin-top:1rem}.ca-rep-t td,.ca-rep-t th{font-size:.85rem;vertical-align:top}.ca-rep-p{break-inside:avoid}" +
    "body.ca-printing>*:not(.ca-print){display:none!important}.ca-print{display:none}body.ca-printing .ca-print{display:block;padding:1rem}" +
    "@media print{body.ca-printing>*:not(.ca-print){display:none!important}body.ca-printing .ca-print{display:block}}";
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function btn(text) { var b = el("button", "btn btn-outline-secondary btn-sm", text); b.type = "button"; return b; }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function css() { if (!document.getElementById("ca-css")) { var st = el("style"); st.id = "ca-css"; st.textContent = CSS; document.head.appendChild(st); } }
  function draw(paper, q) {
    paper.innerHTML = "";
    var holder = el("div"); paper.appendChild(holder);
    var v = null;
    if (global.ABCJS) v = global.ABCJS.renderAbc(holder, q.abc, { responsive: "resize", add_classes: true, staffwidth: Math.max(420, 150 * q.bars), paddingleft: 0, paddingright: 0 })[0];
    else holder.textContent = q.abc;
    if (q.shapes) { placeTab(paper, holder, q); if (!paper._tabHook) { paper._tabHook = 1; global.addEventListener("resize", function () { if (paper._q && paper._q.shapes) placeTab(paper, paper.firstChild, paper._q); }); } }
    paper._q = q;
    return v;
  }
  function miniStack(target, list) { target.innerHTML = ""; if (list && list.length && global.ABCJS) global.ABCJS.renderAbc(target, stackAbc(list), { scale: 0.9, staffwidth: 90, paddingleft: 0, paddingright: 0 }); }
  function playBtn(getV, getQ) {
    var b = btn("▶ Play"), h = null;
    b.addEventListener("click", function () {
      if (h) { h.stop(); return; }
      var v = getV(); if (!v || !global.AbcPlay) return;
      b.textContent = "■ Stop"; h = global.AbcPlay.play(v, { sound: getQ().texture === "guitar" ? "aguitar" : "piano", transpose: getQ().transpose, qpm: getQ().qpm, onEnd: function () { h = null; b.textContent = "▶ Play"; } });
    });
    return b;
  }
  function stepsList(q, i, all, onStep) {
    var ol = el("ol"), list = steps(q, i), shown = 0, more = btn("Next step"), wrap = el("div");
    function one() { if (onStep) onStep(); var s1 = list[shown++], li = el("li"); li.appendChild(el("strong", "", s1.h + ". ")); li.appendChild(document.createTextNode(s1.t)); ol.appendChild(li); if (shown >= list.length) more.hidden = true; }
    more.addEventListener("click", one);
    if (all) while (shown < list.length) one(); else one();
    wrap.appendChild(ol); if (!all) wrap.appendChild(more);
    return wrap;
  }

  // ---- the record (SiteRecord, apps/shared/report/record.js, loaded on first use). One item a passage, tool "chord-analysis",
  // it.d = { s: its settings and seed (make() rebuilds it exactly), k: key attempts, c: per chord { st: stack attempts, nm: name
  // attempts (each [what, 1 right / 0 wrong, seconds in]), h: steps looked at, rv: 1 when "Show the answers" was pressed } }.
  var SR_SRC = "/apps/shared/report/record.js?v=1", srWait = [];
  function withRecord(f) {
    if (global.SiteRecord) { registerRecord(); return f(global.SiteRecord); }
    srWait.push(f); if (srWait.length > 1 || typeof document === "undefined") return;
    var sc = document.createElement("script"); sc.src = SR_SRC; sc.onload = function () { registerRecord(); var w = srWait; srWait = []; w.forEach(function (g) { g(global.SiteRecord); }); }; document.head.appendChild(sc);
  }
  function attempts(list) { return list && list.length ? list.map(function (a) { return (a[1] ? "✓ " : "✗ ") + a[0]; }).join("  ·  ") : "—"; }
  function secs(t) { return t < 60 ? t + " s" : Math.floor(t / 60) + " min " + (t % 60) + " s"; }
  function touched(c) { return c.st.length || c.nm.length || c.h || c.rv; }
  function summaryOf(passages) {
    var o = { chords: 0, stackFirst: 0, stackRight: 0, nameFirst: 0, nameRight: 0, named: 0, stacked: 0, steps: 0, shown: 0 };
    passages.forEach(function (p) { p.c.forEach(function (c) {
      if (!touched(c)) return; o.chords++;
      if (c.st.length) { o.stacked++; if (c.st[0][1]) o.stackFirst++; if (c.st.some(function (a) { return a[1]; })) o.stackRight++; }
      if (c.nm.length) { o.named++; if (c.nm[0][1]) o.nameFirst++; if (c.nm.some(function (a) { return a[1]; })) o.nameRight++; }
      o.steps += c.h; o.shown += c.rv ? 1 : 0;
    }); });
    return o;
  }
  function summaryText(passages) {
    var o = summaryOf(passages);
    return passages.length + " passage" + (passages.length === 1 ? "" : "s") + ", " + o.chords + " chords. Stacks: " + o.stackFirst + " of " + o.stacked + " right first time, " + o.stackRight + " in the end. Names: " +
      o.nameFirst + " of " + o.named + " right first time, " + o.nameRight + " in the end. Steps looked at: " + o.steps + ". Answers shown: " + o.shown + " chord" + (o.shown === 1 ? "" : "s") + ".";
  }
  // one passage: its settings, the score, a row a chord (teacher: every answer; a student: an answer once found or shown)
  function passageSection(p, t, teacher) {
    var qq = make(parseSettings(p.s)), sec = el("div", "ca-rep-p sr-item"), last = 0;
    p.c.forEach(function (c) { c.st.concat(c.nm).forEach(function (a) { last = Math.max(last, a[2]); }); });
    if (!qq) { sec.appendChild(el("p", "", "(This passage could not be rebuilt.)")); return sec; }
    var ps = parseSettings(p.s);
    sec.appendChild(el("p", "ca-help", LV[qq.level].name + " · " + STAGE_NAMES[qq.texture] + " · " + qq.key.label + (qq.findKey ? " (key to find)" : "") + " · entered by " + ENTRY_NAMES[ps.entry] +
      " · started " + new Date(t).toLocaleTimeString() + (last ? ", last answer after " + secs(last) : "")));
    var paper = el("div", "ca-paper"); sec.appendChild(paper);
    if (global.ABCJS) global.ABCJS.renderAbc(paper, qq.abc, { scale: 0.75, staffwidth: Math.max(380, 130 * qq.bars), paddingleft: 0, paddingright: 0 });
    if (p.k && p.k.length) sec.appendChild(el("p", "", "Key: " + attempts(p.k) + (teacher || p.k.some(function (a) { return a[1]; }) ? "  (answer: " + qq.key.label + ")" : "")));
    var tb = el("table", "table table-sm ca-rep-t"), th = el("tr");
    ["Chord", "Stack", "Name", "Help", "Answer"].forEach(function (h) { th.appendChild(el("th", "", h)); }); tb.appendChild(th);
    qq.items.forEach(function (it, i) {
      var c = p.c[i] || { st: [], nm: [], h: 0, rv: 0 }, tr = el("tr"), found = c.rv || c.nm.some(function (a) { return a[1]; }) || c.st.some(function (a) { return a[1]; });
      [String(i + 1), attempts(c.st), attempts(c.nm), [c.h ? "Steps ×" + c.h : "", c.rv ? "answers shown" : ""].filter(Boolean).join(", ") || "—",
        teacher || found ? expected(qq, i) + " (" + it.chord.notes.map(nm).join("–") + ")" : "—"].forEach(function (x) { tr.appendChild(el("td", "", x)); });
      tb.appendChild(tr);
    });
    sec.appendChild(tb);
    return sec;
  }
  function passageText(p) {
    var qq = make(parseSettings(p.s)), L = []; if (!qq) return L;
    L.push("  Passage: " + LV[qq.level].name + ", " + STAGE_NAMES[qq.texture] + ", " + qq.key.label);
    if (p.k && p.k.length) L.push("    Key: " + attempts(p.k));
    qq.items.forEach(function (it, i) { var c = p.c[i]; if (!c || !touched(c)) return;
      L.push("    Chord " + (i + 1) + ": stack " + attempts(c.st) + " | name " + attempts(c.nm) + (c.h ? " | steps ×" + c.h : "") + (c.rv ? " | answers shown" : "")); });
    return L;
  }
  var registered = false;
  function registerRecord() {
    if (registered || !global.SiteRecord) return; registered = true;
    global.SiteRecord.register("chord-analysis", { name: "Chord analysis",
      render: function (it, teacher) { return passageSection(it.d, it.t, teacher); },
      text: function (it) { return passageText(it.d); },
      summary: function (items) { return summaryText(items.map(function (x) { return x.d; })); } });
  }
  // report codes from the first version (CA1., one exercise): still read, so a code already handed in opens on the report page
  function hashStr(t) { var h = 0x811c9dc5; for (var i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); }
  function readCode(code) {
    var m = /CA1\.([A-Za-z0-9+/=]+)\.([0-9a-f]+)/.exec(String(code || "").replace(/\s+/g, "")); if (!m) return null;
    try { var j = decodeURIComponent(escape(atob(m[1]))); return { data: JSON.parse(j), ok: hashStr("ca1|" + j) === m[2] }; } catch (e) { return null; }
  }

  function example(host, s) {
    var q = make(s); host.innerHTML = "";
    if (!q) { host.textContent = "This example could not be built."; return; }
    host.appendChild(el("div", "ca-prompt", "Key: " + q.key.label + "."));
    var paper = el("div", "ca-paper"); host.appendChild(paper); var v = draw(paper, q);
    var row = el("div", "ca-row"); row.appendChild(playBtn(function () { return v; }, function () { return q; })); host.appendChild(row);
    q.items.forEach(function (it, i) {
      var d = el("details", "ca-panel ca-ex"); d.appendChild(el("summary", "", "Chord " + (i + 1) + ": " + expected(q, i)));
      var sv = el("div", "ca-stackview"), mini = el("div", "ca-mini"); sv.appendChild(stepsList(q, i, true)); sv.appendChild(mini); d.appendChild(sv);
      d.addEventListener("toggle", function () { if (d.open && !mini.firstChild) miniStack(mini, it.chord.notes); });
      host.appendChild(d);
    });
    host._ca = { question: function () { return q; } };
  }

  function mount(host) {
    if (host._ca) return;
    css(); host.classList.add("ca");
    var linkStr = (host.getAttribute("data-settings") || "") + (host.hasAttribute("data-from-url") ? "&" + location.search.slice(1) : "");
    var linkS = parseSettings(linkStr);
    if (host.hasAttribute("data-example")) return example(host, linkS);
    var upto = host.getAttribute("data-upto"), maxIdx = upto && LV[upto] ? LEVELS.indexOf(LV[upto]) : LEVELS.length - 1;
    var KEY = "chord-analysis-v1:" + location.pathname + ":" + (host.getAttribute("data-settings") || "");
    var saved = linkS.seed == null && !host.hasAttribute("data-lock") ? store(KEY) : null, s = Object.assign({}, linkS, saved || {});
    if (!LV[s.level] || LEVELS.indexOf(LV[s.level]) > maxIdx) s.level = LEVELS[maxIdx].id;
    var firstSeed = linkS.seed; delete s.seed;
    var q = null, v = null, total = 0, right = 0, cards = [], stackOk = [], active = -1;
    host.innerHTML = "";
    var top = el("div", "ca-top"), score = el("div", "ca-help"); top.appendChild(el("p", "ca-title", "Analyse the chords")); top.appendChild(score); host.appendChild(top);
    var prompt = el("div", "ca-prompt"), paper = el("div", "ca-paper"), row = el("div", "ca-row"), cardBox = el("div", "ca-cards"), panel = el("div"), fb = el("div", "ca-fb"), help = el("div", "ca-help");
    var curP = null;
    function rec(f) {   // this passage's record item, made when the student first does something with it; f(it.d) changes it
      var qNow = q;
      withRecord(function (SR) {
        if (!curP || curP.q !== qNow) curP = { q: qNow, it: SR.add("chord-analysis", { ex: "Chord analysis", d: { s: settingsString(s) + "&seed=" + qNow.seed, k: [], c: qNow.items.map(function () { return { st: [], nm: [], h: 0, rv: 0 }; }) } }) };
        f(curP.it.d, Math.round((Date.now() - curP.it.t) / 1000)); SR.save();
      });
    }
    var repB = el("span");
    withRecord(function (SR) { var b = SR.button(row); repB.replaceWith(b); repB = b; });
    var checkB = btn("Check the names"), showB = btn("Show the answers"), newB = btn("New passage"), linkB = btn("Copy a link to this passage"), msg = el("span", "ca-help");
    row.appendChild(playBtn(function () { return v; }, function () { return q; })); [checkB, showB, newB, repB, linkB, msg].forEach(function (x) { row.appendChild(x); });
    [prompt, paper, row, cardBox, panel, fb, help].forEach(function (x) { host.appendChild(x); });
    var det = el("details", "ca-settings"); det.appendChild(el("summary", "", "Settings")); var form = el("div", "ca-form"); det.appendChild(form); host.appendChild(det);
    if (host.hasAttribute("data-lock")) det.hidden = true;

    function buildForm() {
      form.innerHTML = "";
      SETTINGS.forEach(function (d) {
        if (d.id === "tenor" && s.texture !== "satb" && s.texture !== "mixed") return;
        if (d.id === "entry" && s.task === "name") return;
        var lab = el("label", "", d.label), sel = el("select", "form-select form-select-sm");
        d.options.forEach(function (o) { if (d.id === "level" && LEVELS.indexOf(LV[o]) > maxIdx) return; var op = el("option", "", d.names && d.names[o] || o); op.value = o; sel.appendChild(op); });
        sel.value = s[d.id];
        sel.addEventListener("change", function () {
          s[d.id] = sel.value; if (d.id === "level" && LV[sel.value].most != null) s.most = String(LV[sel.value].most);
          store(KEY, s); buildForm(); if (d.id === "entry") { if (active >= 0) openStack(active); } else fresh();
        });
        lab.appendChild(sel); form.appendChild(lab);
      });
    }
    var doStack = function () { return s.task !== "name"; }, doName = function () { return s.task !== "stack"; };
    function fresh(seed) {
      var ss = Object.assign({}, s); if (seed != null) ss.seed = seed;
      q = make(ss); cardBox.innerHTML = ""; panel.innerHTML = ""; fb.textContent = ""; fb.className = "ca-fb"; cards = []; stackOk = []; active = -1; msg.textContent = "";
      if (!q) { prompt.textContent = "No passage fits these settings. Choose more keys."; paper.innerHTML = ""; return; }
      var what = q.answer === "sym" ? "a chord symbol (" + (q.inv ? "C, Am, G7, C/E" : "C, Am, G7") + ")" : "a Roman numeral" + (q.inv ? " with its inversion (I6 or I/3rd, V65 or V7/3rd)" : " (I, ii, V7)");
      var job = doStack() && doName() ? "For each numbered chord, stack its notes in root position, then name it with " + what + "."
        : doStack() ? "Stack the notes of each numbered chord in close root position." : "Name each numbered chord with " + what + ".";
      prompt.textContent = (q.findKey ? "Find the key first. " : "Key: " + q.key.label + ". ") + job;
      v = draw(paper, q);
      if (q.findKey) {
        var kc = el("div", "ca-card"); kc.appendChild(el("b", "", "Key")); var ki = el("input", "form-control form-control-sm"); ki.placeholder = "D major, b minor"; ki.autocomplete = "off";
        kc.appendChild(ki); cardBox.appendChild(kc); cards.push({ box: kc, inp: ki, key: true });
      }
      q.items.forEach(function (it, i) {
        var c = el("div", "ca-card"), mark = el("div", "ca-mark"), want = el("div", "ca-want"), inp = null;
        c.appendChild(el("b", "", "Chord " + (i + 1)));
        if (doStack()) { var sb = btn("Stack it"); sb.addEventListener("click", function () { openStack(i); }); c.appendChild(document.createElement("br")); c.appendChild(sb); c.appendChild(mark); }
        if (doName()) {
          inp = el("input", "form-control form-control-sm"); inp.autocomplete = "off"; inp.spellcheck = false; inp.placeholder = q.answer === "sym" ? "symbol" : "numeral"; inp.setAttribute("aria-label", "Name of chord " + (i + 1));
          inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); grade(false); } });
          c.appendChild(inp);
        }
        var hb = btn("Steps"); hb.addEventListener("click", function () { openSteps(i); }); c.appendChild(hb); c.appendChild(want);
        cardBox.appendChild(c); cards.push({ box: c, inp: inp, mark: mark, want: want, i: i }); stackOk.push(false);
      });
      help.textContent = !doName() ? "" : q.answer === "sym" ? "Capital letter = major (A), small letter or m = minor (a, Am), ° or o diminished, + augmented; 7, maj7, m7, ø7 (m7b5), °7" + (q.inv ? "; a slash and the bass for an inversion (C/E)" : "") + ". # and b for ♯ and ♭."
        : "Capitals for major (V), small for minor (ii), ° or o diminished, ø or h half-diminished, + augmented; 7 or M7 for sevenths" + (q.inv ? "; 6 64 65 43 42, or /3rd /5th /7th, for inversions" : "") + ". b before a numeral for ♭ (bVII).";
      host.setAttribute("data-seed", q.seed);
      if (doStack()) openStack(0);
    }
    function focusCard(i) { active = i; cards.forEach(function (c) { if (!c.key) c.box.classList.toggle("on", c.i === i); }); }
    function cardFor(i) { return cards.filter(function (c) { return c.i === i; })[0]; }
    function openStack(i) {
      focusCard(i); panel.innerHTML = "";
      var p = el("div", "ca-panel"), res = el("div"), mini = el("div", "ca-mini"), sv = el("div", "ca-stackview"), ok = btn("Check the stack"), cur = [];
      p.appendChild(el("strong", "", "Chord " + (i + 1) + ": stack it in close root position"));
      var w = entryWidget(s.entry, q, i, function (list) { cur = list; miniStack(mini, list); res.textContent = ""; });
      sv.appendChild(w); sv.appendChild(mini); p.appendChild(sv);
      ok.addEventListener("click", function () {
        var r = checkStack(q, i, cur), cd = cardFor(i);
        var got = cur.map(nm).join(" ");
        if (cur.length) rec(function (d, t0) { d.c[i].st.push([got, r.ok ? 1 : 0, t0]); });
        res.className = r.ok ? "ca-ok" : "ca-no"; res.textContent = (r.ok ? "✓ " : "✗ ") + r.msg;
        if (r.ok) { stackOk[i] = true; cd.mark.className = "ca-mark ca-ok"; cd.mark.textContent = "✓ " + cur.map(nm).join("–"); }
      });
      var nx = btn("Next chord →"); nx.addEventListener("click", function () { openStack((i + 1) % q.items.length); });
      var row2 = el("div", "ca-row"); row2.appendChild(ok); row2.appendChild(nx); p.appendChild(row2); p.appendChild(res);
      panel.appendChild(p); p._entry = w; host._panel = p;
    }
    function openSteps(i) {
      focusCard(i); panel.innerHTML = ""; var p = el("div", "ca-panel"); p.appendChild(el("strong", "", "Chord " + (i + 1) + ", step by step"));
      p.appendChild(stepsList(q, i, false, function () { rec(function (d) { d.c[i].h++; }); })); panel.appendChild(p);
    }
    function grade(reveal) {
      if (!q) return; var n = 0, ok = 0;
      var typed = cards.filter(function (x) { return x.inp && x.inp.value.trim(); }).map(function (x) { var v0 = x.inp.value.trim(); return { key: x.key, i: x.i, v: v0, ok: x.key ? checkKey(q, v0) : check(q, x.i, v0) }; });
      if (reveal) rec(function (d) { d.c.forEach(function (c) { c.rv = 1; }); });
      else if (typed.length) rec(function (d, t0) {   // each name (and key) typed since the last check
        typed.forEach(function (x) { var list = x.key ? d.k : d.c[x.i].nm, last = list[list.length - 1]; if (!last || last[0] !== x.v) list.push([x.v, x.ok ? 1 : 0, t0]); });
      });
      cards.forEach(function (x) {
        var good = x.key ? checkKey(q, x.inp.value) : x.inp ? check(q, x.i, x.inp.value) : stackOk[x.i];
        if (x.key || x.inp) { n++; if (good) ok++; }
        x.box.classList.remove("ok", "no"); x.box.classList.add(good ? "ok" : "no");
        if (x.want) x.want.textContent = good || !reveal ? "" : (x.inp ? expected(q, x.i) + (doStack() ? " · " : "") : "") + (doStack() ? q.items[x.i].chord.notes.map(nm).join("–") : "");
        if (x.key && !good && reveal) x.inp.value = q.key.label;
      });
      if (!reveal) { total += n; right += ok; score.textContent = right + " / " + total + " names right so far"; }
      fb.className = "ca-fb" + (ok === n && n ? " ok" : "");
      fb.textContent = reveal ? "The answers are under the boxes. Steps shows how to find each one." : ok === n ? "All right." : ok + " of " + n + " right. Fix the red ones, or press Steps on one.";
      host.setAttribute("data-right", ok); host.setAttribute("data-total", n);
    }
    checkB.addEventListener("click", function () { grade(false); });
    showB.addEventListener("click", function () { grade(true); });
    newB.addEventListener("click", function () { fresh(); });
    linkB.addEventListener("click", function () {
      if (!q) return;
      var url = location.origin + "/theory/chord-analysis.html?" + settingsString(s) + "&seed=" + q.seed;
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { msg.textContent = "Copied. Add &lock=1 to hide the settings."; }, function () { msg.textContent = url; }); else msg.textContent = url;
    });
    if (/[?&]lock=1\b/.test(linkStr)) det.hidden = true;
    buildForm(); fresh(firstSeed);
    host._ca = { question: function () { return q; }, settings: function () { return s; }, grade: grade, fresh: fresh, openStack: openStack, cards: function () { return cards; }, report: function () { repB.click(); } };
  }
  function init() { [].forEach.call(document.querySelectorAll(".chord-analysis"), mount); }

  global.ChordAnalysis = { LEVELS: LEVELS, STAGES: STAGES, SETTINGS: SETTINGS, make: make, check: check, checkKey: checkKey, checkStack: checkStack, expected: expected, steps: steps,
    build: build, parseRN: parseRN, parseSym: parseSym, parseNotes: parseNotes, keyOn: keyOn, keyNamed: keyNamed, sameChord: sameChord, parseSettings: parseSettings,
    sounding: sounding, letters: letters, readCode: readCode, summaryOf: summaryOf, passageText: passageText, withRecord: withRecord, guitarShape: guitarShape, stackAbc: stackAbc, nm: nm, midi: midi, mount: mount, init: init };
  registerRecord();   // when the record script is already on the page (a report showing chord-analysis items loads this file)
  if (typeof document !== "undefined" && document.querySelectorAll) { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init(); }
})(typeof window !== "undefined" ? window : globalThis);
