// mode-library.js — the Mode & Raga Library (tools/mode-library.qmd, global ModeLibrary): ragas, melakartas, maqamat, pathet,
// Japanese and church modes and jazz chord-scales as cards, each split into what is FIXED, what is CHOSEN, where it LEANS
// and what is FREE, so a student can see which traditions work like a clave (break the pattern and it is no longer that thing)
// and which like bebop alterations (pick from a pool, any time).
//
// An entry:
//   id, name, aka: [], fam: section id (FAMS), sys: "hind" | "karn" | "cents" (how note tokens are read),
//   where: place / time / use, feats: [ feature ], src: key in SRC, check: "read" (notes as printed in the source) |
//   "derived" (worked out from the source's rule or prose) | "approx" (the source says the real intervals differ; ours are an
//   illustration), note: what the card should warn about.
// A feature: { k: "fixed" | "chosen" | "lean" | "free", t: text, seq?: notes to play, opts?: [{ name, seq }] (chosen: the pool) }
// Note tokens:
//   hind  S r R g G m M P d D n N (lower case = komal, M = tivra Ma), ' = upper register, , = lower; "|" a breath.
//         Unmarked = middle register, as Garland's notation says (dots in the scan are small: the card says so).
//   karn  S R1 R2 R3 G1 G2 G3 M1 M2 P D1 D2 D3 N1 N2 N3, same ' and , marks.
//   cents numbers from the tonic (350 = a neutral third); "|" a breath.
// Rule: notes come from a source in SRC, never from memory; anything else is marked approx / unverified on the card.
// Sources: scripts/sources/mode-library.py. Test: node tests/mode-library/mode-library.test.js (NEG=1 must fail).
(function (global) {
  var SRC = {
    garland6: "Ruckert & Widdess, “Hindustani Raga”, Garland Encyclopedia of World Music vol. 5 (2000), Fig. 6, pp. 80-81 (aroh and avaroh as printed), and pp. 67-69",
    garland4: "Ruckert & Widdess, Garland vol. 5, Fig. 4, p. 76, and p. 75 (“a straight descent … would be considered a violation”)",
    kassebaum: "Kassebaum, “Karnatak Raga”, Garland vol. 5, pp. 97-98 (Venkatamakhi’s three rules for a mela; janya ragas, Fig. 6)",
    maqamworld: "MaqamWorld (maqamworld.com), maqam and jins pages: the lower jins, the ghammaz and the upper ajnas named in the text",
    pathet: "Wikipedia, “Pathet”, “Slendro”, “Pelog”",
    japan: "Wikipedia, “In scale”, “Yo scale”, “Hirajōshi scale”",
    church: "Wikipedia, “Mode (music)”, church modes (finals and reciting tones)",
    bebop: "Wikipedia, “Bebop scale”",
    altered: "Wikipedia, “Altered chord” and “Altered scale”",
    chordscale: "Wikipedia, “Chord-scale system”, “Acoustic scale”, “Octatonic scale”, “Altered scale”"
  };
  var FAMS = [
    { id: "hind", name: "Hindustani rāg" }, { id: "karn", name: "Karnatak rāga" }, { id: "maqam", name: "Arabic maqām" },
    { id: "pathet", name: "Javanese pathet" }, { id: "japan", name: "Japanese scales" }, { id: "church", name: "Church modes" },
    { id: "jazz", name: "Jazz: bebop and chord-scales" }
  ];
  var KIND = {
    fixed: { name: "Fixed", tip: "Change it and it is no longer this mode (like playing the clave backwards)." },
    chosen: { name: "Chosen", tip: "The tradition gives a set; the player picks from it each time (like bebop alterations)." },
    lean: { name: "Leans on", tip: "Weight and habit: stressed notes, usual endings. Not a rule you can break, a centre you drift from." },
    free: { name: "Free", tip: "Left to the musician: the tunes, the ornaments, the order of ideas." }
  };

  // ---------- Hindustani: Garland Fig. 6 (pp. 80-81), read from the scan 2026-11-27 ----------
  var H = [
    ["bhairav", "Bhairav", "Dawn (sandhiprakāś)", "S r G m P d N S'", "S' N d P | P d P m | G m P G m r S"],
    ["ahirbhairav", "Ahīr Bhairav", "Dawn (sandhiprakāś)", "S r G m P D n S'", "S' n D | n D P | D G P m G m r S D, n, r S"],
    ["ramkali", "Rāmkalī", "Dawn (sandhiprakāś)", "N, S G m P M P d P | d N S'", "S' N d P M P G m r S"],
    ["bairagi", "Bairāgī", "Dawn (sandhiprakāś)", "S r m P n S'", "S' n P m r S"],
    ["puriyadhanashri", "Pūriyā Dhanāshrī", "Sunset (sandhiprakāś)", "N, r G M P | M d N S'", "S' N d P M d r' N d P | M G M r G r S"],
    ["purvi", "Pūrvī", "Sunset (sandhiprakāś)", "N, r G m G r G M P M d N S'", "S' N d P M P M G | M G r S"],
    ["narayani", "Nārāyaṇī", "Sunset (sandhiprakāś)", "N, S G M P N S'", "S' N P M G M G r S"],
    ["marva", "Mārvā", "Sunset (sandhiprakāś)", "N, r G M D N r'", "r' N D M G r N, D, r S"],
    ["alhaiyabilaval", "Alhaiyā Bilāval", "Morning, bilāval family (major-scale tones)", "N, S G R G P D N S'", "S' N D n D P D m G R G m P m G R S"],
    ["devgiribilaval", "Devgirī Bilāval", "Morning, bilāval family", "S N, D, S R G m G R G P | P D N S'", "S' N D P m G m G R S"],
    ["durga", "Durgā", "Evening, bilāval family", "S R m P D S'", "S' D P m R S"],
    ["hemant", "Hemant", "Evening, bilāval family", "S G m D N S'", "S' N D | P D N P | D m P G | G m R S"],
    ["asavari", "Āsāvarī", "Morning, āsāvarī family (natural-minor tones)", "S R m P d S'", "S' n d P m g R S"],
    ["jaunpuri", "Jaunpurī", "Morning, āsāvarī family", "S R m P d n S'", "S' R' g' R' S' n d P m g R S"],
    ["darbari", "Darbārī Kānaḍā", "Evening, āsāvarī family", "S R m g | m P n d | n S'", "S' R' n S' R' d | n P n m P n g | R S R S"],
    ["adana", "Aḍānā", "Evening, āsāvarī family", "S R m P d n S'", "S' n d P n P g m R S"],
    ["bhimpalasi", "Bhīmpalāsī", "Same outline, different forms of the notes", "n, S g m P n S'", "S' n D P m g R S"],
    ["patdip", "Paṭdīp", "Same outline, different forms of the notes", "N, S g m P N S'", "S' N D P m g R S"],
    ["multani", "Multānī", "Same outline, different forms of the notes", "N, S g M P N S'", "S' N d P M g r S"],
    ["madhuvanti", "Madhuvantī", "Same outline, different forms of the notes", "N, S g M P N S'", "S' N D P M g R S"],
    ["megh", "Megh", "Rainy season", "S R m P n S'", "S' n P m R S"],
    ["des", "Deś", "Rainy season", "S R m P N S'", "S' n D P m G R S"],
    ["miyanmalhar", "Miyāṅ kī Malhār", "Rainy season", "S R P m P | m P n D N S'", "S' n P m P D P g m R S"]
  ];
  var R = [];
  H.forEach(function (h) {
    var f = [
      { k: "fixed", t: "Āroh (the way up), as printed", seq: h[3] },
      { k: "fixed", t: "Avaroh (the way down), as printed", seq: h[4] },
      { k: "lean", t: "Some notes are stressed (vādī, saṁvādī), others passed lightly; Garland: “practice is thus considerably more flexible than the theory”." },
      { k: "free", t: "The tunes: “an infinite number of tunes can be based on the same raga”, and the ornaments and slides between the notes." }
    ];
    if (h[0] === "darbari") f.splice(2, 0, { k: "fixed", t: "The crooked (vakra) descent: “a straight descent … would be considered a violation or ‘breaking’ of the raga” (p. 75). Hear the forbidden one:", seq: "S' n d P m g R S" });
    if (h[0] === "jaunpuri") f.splice(2, 0, { k: "fixed", t: "Leaves out ga going up, but “permits this straight descent” (p. 75)." });
    if (h[0] === "darbari") f.push({ k: "fixed", t: "Ga and dha flatter than the piano’s, with a slow wavering (andolan) (pp. 81-82): the piano cannot play it." });
    R.push({ id: h[0], name: h[1], aka: [], fam: "hind", sys: "hind", where: h[2], feats: f, src: h[0] === "darbari" || h[0] === "jaunpuri" ? "garland4" : "garland6", check: "read",
      note: "Unmarked notes are middle register, as in Garland’s notation; a few register dots in the scan are small." });
  });

  // ---------- Karnatak: the 72 melakartas are a rule (derived), janya ragas bend it ----------
  var RG = [["R1", "G1"], ["R1", "G2"], ["R1", "G3"], ["R2", "G2"], ["R2", "G3"], ["R3", "G3"]];
  var DN = [["D1", "N1"], ["D1", "N2"], ["D1", "N3"], ["D2", "N2"], ["D2", "N3"], ["D3", "N3"]];
  function mela(n) { n = n - 1; var ma = n < 36 ? "M1" : "M2", rg = RG[Math.floor((n % 36) / 6)], dn = DN[n % 6];
    var up = ["S", rg[0], rg[1], ma, "P", dn[0], dn[1], "S'"]; return { asc: up.join(" "), desc: up.slice().reverse().join(" ") }; }
  var m29 = mela(29);
  R.push({ id: "sankarabharana", name: "Śaṅkarābharaṇa (mela 29)", aka: [], fam: "karn", sys: "karn", where: "A parent (mela) raga", src: "kassebaum", check: "read",
    feats: [{ k: "fixed", t: "All seven notes, stepwise, the same both ways: the three rules every mela must keep (p. 97)", seq: m29.asc + " | " + m29.desc },
      { k: "free", t: "Compositions and improvisation (kalpana sangīta) built on it; the gamaka (ornament) is “integral to the scale pitches” (Fig. 6)." }] });
  R.push({ id: "madhyamavati", name: "Madhyamāvatī", aka: [], fam: "karn", sys: "karn", where: "A derived (janya) raga: five notes", src: "kassebaum", check: "read",
    feats: [{ k: "fixed", t: "Five tones both ways (Fig. 6a)", seq: "S R2 M1 P N2 S' | S' N2 P M1 R2 S" },
      { k: "fixed", t: "A janya raga may skip notes, turn back (vakra), or take “extra tones not belonging to the raga structure” (p. 97): which ones is fixed for each raga." },
      { k: "free", t: "New janya ragas are still being made: “infinite possibilities” (p. 97)." }] });

  // ---------- Arabic maqam: MaqamWorld's structure; intervals in quarter tones (the illustration Wikipedia warns about) ----------
  var J = { rast: [0, 200, 350, 500, 700], upperRast: [0, 200, 350, 500], bayati: [0, 150, 300, 500], hijaz: [0, 100, 400, 500],
    kurd: [0, 100, 300, 500], nahawand: [0, 200, 300, 500, 700], ajam3: [0, 200, 400], nikriz: [0, 200, 300, 600, 700], saba: [0, 150, 300, 400] };
  function jins(name, at) { return J[name].map(function (c) { return c + at; }).join(" "); }
  function maq(id, name, low, gh, ghName, ups, extra, note) {
    var f = [{ k: "fixed", t: "Lower jins: " + low + " on the tonic (it names the maqam’s family)", seq: jins(low, 0) },
      { k: "fixed", t: "The ghammaz, the " + ghName + ": where the upper jins starts, the second note of emphasis", seq: "0 | " + gh + " | 0" }];
    if (extra) f.push(extra);
    if (ups.length > 1) f.push({ k: "chosen", t: "Upper jins on the " + ghName + ": one of", opts: ups.map(function (u) { return { name: u[1], seq: jins(low, 0) + " " + jins(u[0], gh).split(" ").slice(1).join(" ") }; }) });
    else f.push({ k: "fixed", t: "Upper jins: " + ups[0][1] + " on the " + ghName + " (the only one MaqamWorld names)", seq: jins(low, 0) + " " + jins(ups[0][0], gh).split(" ").slice(1).join(" ") });
    f.push({ k: "lean", t: "Intonation: the quarter-tone numbers are notation; “the actual precise intonation” differs by region and player (Wikipedia)." });
    f.push({ k: "free", t: "Modulation to other maqamat, usually coming home at the end; the melodic path (sayr) taught by ear." });
    R.push({ id: "maqam-" + id, name: "Maqām " + name, aka: [], fam: "maqam", sys: "cents", where: "Arabic", feats: f, src: "maqamworld", check: "approx", note: note || "" });
  }
  maq("rast", "Rast", "rast", 700, "5th degree", [["upperRast", "Upper Rast"], ["nahawand", "Nahawand"]]);
  maq("bayati", "Bayātī", "bayati", 500, "4th degree", [["nahawand", "Nahawand"], ["rast", "Rast"]]);
  maq("hijaz", "Ḥijāz", "hijaz", 500, "4th degree", [["nahawand", "Nahawand"], ["rast", "Rast"]], null,
    "MaqamWorld: Hijaz’s augmented second “is usually played smaller than notated”.");
  maq("nahawand", "Nahawand", "nahawand", 700, "5th degree", [["hijaz", "Hijaz"], ["kurd", "Kurd"]]);
  maq("kurd", "Kurd", "kurd", 500, "4th degree", [["nahawand", "Nahawand"]]);
  maq("saba", "Ṣabā", "saba", 800, "6th degree", [["ajam3", "ʿAjam (3 notes)"], ["nikriz", "Nikriz"]],
    { k: "fixed", t: "Hijaz overlapping from the 3rd degree", seq: jins("saba", 0) + " " + jins("hijaz", 300).split(" ").slice(2).join(" ") },
    "Saba does not close at the octave: the upper jins runs past it.");

  // ---------- Javanese pathet (Wikipedia's table; tunings are illustrations) ----------
  var SL = { 1: 0, 2: 240, 3: 480, 5: 720, 6: 960 }, PL = { 1: 0, 2: 133, 3: 267, 4: 533, 5: 667, 6: 800, 7: 1067 };
  function pa(tun, n) { var s = String(n), oct = s.indexOf("'") >= 0 ? 1200 : s.indexOf(",") >= 0 ? -1200 : 0; return tun[s.replace(/[',]/g, "")] + oct; }
  function seqOf(tun, str) { return str.split(" ").map(function (t) { return t === "|" ? "|" : pa(tun, t); }).join(" "); }
  [["slendro-nem", "Slendro nem", SL, "2", "5", "1", "1 2 3 5 6 1'", "6 5 3 2"],
   ["slendro-sanga", "Slendro sanga", SL, "5", "1", "3", "1 2 3 5 6 1'", "2 1 6, 5,"],
   ["slendro-manyura", "Slendro manyura", SL, "6", "2", "5", "1 2 3 5 6 1'", "3 2 1 6,"],
   ["pelog-lima", "Pélog lima", PL, "2", "5", "7 (rare)", "1 2 3 5 6", "5 3 2 1"],
   ["pelog-nem", "Pélog nem", PL, "5", "1", "7 (rare)", "1 2 3 5 6", "2 1 6, 5,"],
   ["pelog-barang", "Pélog barang", PL, "6", "2", "1 (rare)", "2 3 5 6 7", "3 2 7, 6,"]].forEach(function (p) {
    R.push({ id: p[0], name: p[1], aka: [], fam: "pathet", sys: "cents", where: "Central Java", src: "pathet", check: "approx",
      note: p[2] === SL ? "Slendro here is five equal steps; real gamelans are only “roughly equally spaced” and no two match." : "Pélog here is an illustration on 9-tone equal steps (Wikipedia: “one rough approximation”); which steps, unverified. No two gamelans match.",
      feats: [{ k: "fixed", t: "The gamelan’s own tuning: its notes cannot move. The tones of this pathet:", seq: seqOf(p[2], p[6]) },
        { k: "lean", t: "Stressed “tonic” " + p[3] + ", strong “dominant” " + p[4] + "; " + (p[2] === SL ? p[5] + " is avoided" : p[5].replace(" (rare)", "") + " is rare") + " (“rare as seleh”, the phrase-ending note).", seq: seqOf(p[2], p[3] + " | " + p[4] + " | " + p[3]) },
        { k: "lean", t: "Hood’s cadence (Wikipedia: such ideas “have been largely disproven”; voice and rebab show pathet more clearly)", seq: seqOf(p[2], p[7]) },
        { k: "free", t: "The elaborating instruments’ lines over the balungan; the order nem → sanga → manyura through a night’s wayang." }] });
  });

  // ---------- Japanese ----------
  R.push({ id: "in", name: "In scale", aka: ["Sakura pentatonic", "Miyako-bushi"], fam: "japan", sys: "cents", where: "Koto and shamisen", src: "japan", check: "read",
    feats: [{ k: "fixed", t: "Five notes: 1 ♭2 4 5 ♭6 (on D: D E♭ G A B♭)", seq: "0 100 500 700 800 1200 | 1200 800 700 500 100 0" },
      { k: "chosen", t: "Auxiliary notes, used or not", opts: [{ name: "none", seq: "0 100 500 700 800 1200" }, { name: "+ ♭3", seq: "0 100 300 500 700 800 1200" }, { name: "+ ♭7", seq: "0 100 500 700 800 1000 1200" }] },
      { k: "lean", t: "Nuclear tones a fourth apart (Koizumi, via Wikipedia)", seq: "0 | 500 | 700 | 1200" }] });
  R.push({ id: "yo", name: "Yo scale", aka: [], fam: "japan", sys: "cents", where: "Folk songs, gagaku, shōmyō", src: "japan", check: "read",
    feats: [{ k: "fixed", t: "Steps of 2, 3, 2, 2, 3 semitones (D E G A B)", seq: "0 200 500 700 900 1200 | 1200 900 700 500 200 0" },
      { k: "chosen", t: "Auxiliary notes (F) and (C), used or not", opts: [{ name: "none", seq: "0 200 500 700 900 1200" }, { name: "+ F", seq: "0 200 300 500 700 900 1200" }, { name: "+ C", seq: "0 200 500 700 900 1000 1200" }] }] });
  R.push({ id: "hirajoshi", name: "Hirajōshi", aka: [], fam: "japan", sys: "cents", where: "A koto tuning, as Western writers report it", src: "japan", check: "read",
    note: "The sources disagree on which mode it is: every version has the gaps 2-1-4-1-4.",
    feats: [{ k: "chosen", t: "Which version? The books differ (all on C):", opts: [{ name: "Burrows: C E F♯ G B", seq: "0 400 600 700 1100 1200" },
      { name: "Sachs, Slonimsky: C D♭ F G♭ B♭", seq: "0 100 500 600 1000 1200" }, { name: "Speed, Kostka & Payne: C D E♭ G A♭", seq: "0 200 300 700 800 1200" }] },
      { k: "fixed", t: "On the koto it is a tuning: once tuned, the open strings give exactly these notes." }] });

  // ---------- Church modes ----------
  [["dorian", "I Dorian", "D", 0, 700, [0, 200, 300, 500, 700, 900, 1000, 1200]], ["hypodorian", "II Hypodorian", "D", 0, 300, [-500, -300, -200, 0, 200, 300, 500, 700]],
   ["phrygian", "III Phrygian", "E", 0, 800, [0, 100, 300, 500, 700, 800, 1000, 1200]], ["hypophrygian", "IV Hypophrygian", "E", 0, 500, [-500, -400, -200, 0, 100, 300, 500, 700]],
   ["lydian", "V Lydian", "F", 0, 700, [0, 200, 400, 600, 700, 900, 1100, 1200]], ["hypolydian", "VI Hypolydian", "F", 0, 400, [-500, -300, -100, 0, 200, 400, 600, 700]],
   ["mixolydian", "VII Mixolydian", "G", 0, 700, [0, 200, 400, 500, 700, 900, 1000, 1200]], ["hypomixolydian", "VIII Hypomixolydian", "G", 0, 500, [-500, -300, -200, 0, 200, 400, 500, 700]]].forEach(function (c) {
    R.push({ id: c[0], name: c[1], aka: [], fam: "church", sys: "cents", where: "Plainchant; final " + c[2], src: "church", check: "derived",
      note: "Finals and reciting tones read from a summary of the article; III, IV, VIII later moved theirs up a step.",
      feats: [{ k: "fixed", t: "The final (" + c[2] + ") and the octave range (ambitus): " + (c[5][0] < 0 ? "plagal, a fourth below the final to a fifth above" : "authentic, final to final"), seq: c[5].join(" ") },
        { k: "lean", t: "The reciting tone, where psalm verses are chanted", seq: "0 | " + c[4] + " " + c[4] + " " + c[4] + " | 0" },
        { k: "free", t: "The chant melodies themselves." }] });
  });

  // ---------- Jazz ----------
  R.push({ id: "bebopdom", name: "Bebop dominant scale", aka: [], fam: "jazz", sys: "cents", where: "Over V7 and ii–V (David Baker’s name)", src: "bebop", check: "read", chord: [0, 400, 700, 1000],
    feats: [{ k: "fixed", t: "Mixolydian plus a passing note between ♭7 and the root: eight notes, so run from a chord tone on the beat, chord tones stay on the beats", seq: "1200 1100 1000 900 700 500 400 200 0" },
      { k: "fixed", t: "Where the extra note goes is the point: put it elsewhere and the chord tones land off the beat", seq: "1200 1000 900 800 700 500 400 200 0" },
      { k: "free", t: "Where the line starts, turns and stops; which chord tone it aims at." }] });
  R.push({ id: "bebopmaj", name: "Bebop major scale", aka: [], fam: "jazz", sys: "cents", where: "Over major sixth chords", src: "bebop", check: "read", chord: [0, 400, 700, 900],
    feats: [{ k: "fixed", t: "Major plus ♯5 between 5 and 6: 1, 3, 5, 6 on the beats", seq: "1200 1100 900 800 700 500 400 200 0" },
      { k: "free", t: "Where the line starts, turns and stops." }] });
  R.push({ id: "alt", name: "Altered dominant (7alt)", aka: ["G7alt"], fam: "jazz", sys: "cents", where: "A dominant that resolves", src: "altered", check: "read", chord: [0, 400, 1000],
    feats: [{ k: "fixed", t: "Root, major 3rd, ♭7 (the “essential tones”); the natural 5th, 9th, 11th and 13th are left out", seq: "0 400 1000" },
      { k: "chosen", t: "Alterations: “left to the artistic discretion of the comping musician”; one form of each is more common than both", pick: true, opts: [{ name: "♭9", seq: "1300" }, { name: "♯9", seq: "1500" }, { name: "♭5 / ♯11", seq: "600" }, { name: "♯5 / ♭13", seq: "800" }] },
      { k: "free", t: "Voicing, and which alterations the soloist picks against the comper’s: together they may sound “every tone from the altered scale at once”." }] });
  R.push({ id: "domscales", name: "Scales over a dominant seventh", aka: ["chord-scale"], fam: "jazz", sys: "cents", where: "Chord-scale teaching", src: "chordscale", check: "read", chord: [0, 400, 700, 1000],
    feats: [{ k: "fixed", t: "The chord: root, 3, 5, ♭7", seq: "0 400 700 1000" },
      { k: "chosen", t: "The scale over it, one of", opts: [{ name: "Mixolydian (“normally paired”)", seq: "0 200 400 500 700 900 1000 1200" },
        { name: "Lydian dominant (♯11)", seq: "0 200 400 600 700 900 1000 1200" }, { name: "Half-whole diminished", seq: "0 100 300 400 600 700 900 1000 1200" },
        { name: "Whole tone (for 7♯5)", seq: "0 200 400 600 800 1000 1200" }, { name: "Altered", seq: "0 100 300 400 600 800 1000 1200" }] },
      { k: "free", t: "Changing scale mid-chord, or ignoring the system: Wikipedia notes it pairs chords with lists of possible scales, not one each." }] });

  // ---------- pitches ----------
  var HC = { S: 0, r: 112, R: 204, g: 316, G: 386, m: 498, M: 590, P: 702, d: 814, D: 884, n: 1018, N: 1088 };
  var KC = { S: 0, R1: 112, R2: 204, R3: 316, G1: 204, G2: 316, G3: 386, M1: 498, M2: 590, P: 702, D1: 814, D2: 884, D3: 1018, N1: 884, N2: 1018, N3: 1088 };
  // a sequence string -> [{ c: cents } | { rest: true }]
  function parse(sys, s) {
    return String(s).trim().split(/\s+/).map(function (t) {
      if (t === "|") return { rest: true };
      if (sys === "cents") { var v = +t; if (!isFinite(v)) throw new Error("bad cents " + t); return { c: v, t: t }; }
      var m = /^([A-Za-z][123]?)('|,)?$/.exec(t), tab = sys === "karn" ? KC : HC;
      if (!m || tab[m[1]] == null) throw new Error("bad note " + t + " (" + sys + ")");
      return { c: tab[m[1]] + (m[2] === "'" ? 1200 : m[2] === "," ? -1200 : 0), t: t };
    });
  }
  function hasNote(r, name) { return r.feats.some(function (f) { return f.seq && parse(r.sys, f.seq).some(function (n) { return n.t && n.t.replace(/[',]/g, "") === name; }); }); }

  // ---------- sound (BandSounds; microtones as fractional MIDI) ----------
  var ctx, bank, master, loaded = {}, timers = [], TONIC = 61;   // C#4, a common Sa for the voice; changed by the page's Tonic menu
  function ensure() {
    if (!ctx) { var AC = global.AudioContext || global.webkitAudioContext; ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
      if (global.AudioTap) global.AudioTap.register(ctx, master, "Mode Library"); bank = global.BandSounds.create(ctx); }
    if (ctx.state === "suspended") ctx.resume(); return ctx;
  }
  function need(n) { ensure(); var miss = n.filter(function (x) { return !loaded[x]; }); if (!miss.length) return Promise.resolve();
    return bank.load(miss).then(function () { miss.forEach(function (x) { loaded[x] = 1; }); }); }
  function stop() { timers.forEach(clearTimeout); timers = []; if (bank) bank.stopAll(); document.querySelectorAll(".ml-on").forEach(function (e) { e.classList.remove("ml-on"); });
    if (global.PlayBar && PlayBar.sounding) PlayBar.sounding("mode-library", null); }
  function opt(id) { var e = document.getElementById(id); return e ? e.value : ""; }
  function play(r, seq, chips, extraChord) {
    stop(); var inst = opt("ml-inst") || "flute", bpm = +(opt("ml-tempo") || 100), dt = 60 / bpm, drone = opt("ml-drone") !== "off";
    var tonic = TONIC + (+(opt("ml-tonic") || 0)), notes = parse(r.sys, seq), dr = droneFor(r);
    need([inst, "cello", "piano"]).then(function () {
      var t0 = ctx.currentTime + 0.12, len = notes.length * dt + 0.6;
      if (drone && dr) dr.forEach(function (c) { bank.play("cello", { midi: tonic - 12 + c / 100, dur: len, vel: 0.35 }, t0, master); });
      if (r.chord || extraChord) { (r.chord || []).concat(extraChord || []).forEach(function (c) { bank.play("piano", { midi: tonic - 12 + c / 100, dur: len, vel: 0.45 }, t0, master); }); }
      notes.forEach(function (n, i) {
        if (n.rest) return;
        bank.play(inst, { midi: tonic + n.c / 100, dur: dt * 0.95, vel: 0.65 }, t0 + i * dt, master);
        if (chips && chips[i]) timers.push(setTimeout(function () { chips.forEach(function (c) { c && c.classList.remove("ml-on"); }); chips[i].classList.add("ml-on"); }, (t0 - ctx.currentTime + i * dt) * 1000));
      });
      timers.push(setTimeout(stop, len * 1000 + 200));
      if (global.PlayBar && PlayBar.sounding) PlayBar.sounding("mode-library", stop);
    });
  }
  // drone: Sa + Pa; Ma, else Ni, when the raga has no Pa (Garland p. 67). Maqam / church: the tonic. Pathet, Japanese: none.
  function droneFor(r) {
    if (r.sys === "hind" || r.sys === "karn") { if (hasNote(r, "P")) return [0, 702 - 1200]; if (r.sys === "hind" && hasNote(r, "m")) return [0, 498 - 1200]; return [0, (r.sys === "hind" ? 1088 : 1018) - 1200]; }
    if (r.fam === "maqam" || r.fam === "church") return [0];
    return null;
  }

  // ---------- cards ----------
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function noteName(r, n) { if (n.rest) return "·"; if (r.sys !== "cents") return n.t.replace(/'$/, "̇").replace(/,$/, "̣"); return n.c + "¢"; }
  function seqRow(r, seq, extraChord, label) {
    var row = el("div", "ml-seq"), b = el("button", "btn btn-sm btn-outline-secondary ml-play", "▶" + (label ? " " + label : "")), chips = [];
    row.appendChild(b); var line = el("span", "ml-notes");
    parse(r.sys, seq).forEach(function (n) { var c = el("span", n.rest ? "ml-gap" : "ml-n", noteName(r, n)); chips.push(n.rest ? null : c); line.appendChild(c); });
    row.appendChild(line); b.addEventListener("click", function () { play(r, seq, chips, extraChord); }); return row;
  }
  function card(r) {
    var c = el("div", "ml-card"); c.id = "ml-" + r.id; c.dataset.text = (r.name + " " + r.aka.join(" ") + " " + r.where).toLowerCase();
    var kinds = {}; r.feats.forEach(function (f) { kinds[f.k] = (kinds[f.k] || 0) + 1; }); c.dataset.kinds = Object.keys(kinds).join(" ");
    var h = el("h3", null, r.name); c.appendChild(h);
    var meter = el("div", "ml-meter"); ["fixed", "chosen", "lean", "free"].forEach(function (k) { if (kinds[k]) { var s = el("span", "ml-k ml-" + k, KIND[k].name + (kinds[k] > 1 ? " ×" + kinds[k] : "")); s.title = KIND[k].tip; meter.appendChild(s); } });
    c.appendChild(meter);
    if (r.aka.length) c.appendChild(el("p", "ml-aka", "Also: " + r.aka.join(", ")));
    c.appendChild(el("p", "ml-where", r.where));
    r.feats.forEach(function (f) {
      var box = el("div", "ml-feat ml-f-" + f.k); box.appendChild(el("span", "ml-k ml-" + f.k, KIND[f.k].name)); box.appendChild(el("span", "ml-t", " " + f.t));
      if (f.seq) box.appendChild(seqRow(r, f.seq));
      if (f.opts && f.pick) {               // a pool of alterations: tick any, or roll
        var picks = el("div", "ml-opts"), out = el("div", "ml-out");
        f.opts.forEach(function (o, i) { var l = el("label", "ml-opt"), cb = el("input"); cb.type = "checkbox"; cb.checked = i === 0; l.appendChild(cb); l.appendChild(document.createTextNode(" " + o.name)); picks.appendChild(l); });
        var go = el("button", "btn btn-sm btn-outline-secondary", "▶ Chord with these"), roll = el("button", "btn btn-sm btn-outline-secondary", "🎲 Choose for me");
        function chosen() { var a = []; picks.querySelectorAll("input").forEach(function (cb, i) { if (cb.checked) a.push(+f.opts[i].seq); }); return a; }
        go.addEventListener("click", function () { var a = chosen(); out.textContent = a.length ? "" : "Nothing ticked: the plain dominant."; play(r, "0 400 1000 " + a.join(" "), null, a); });
        roll.addEventListener("click", function () { picks.querySelectorAll("input").forEach(function (cb) { cb.checked = Math.random() < 0.5; }); go.click(); });
        box.appendChild(picks); var br = el("div", "ml-seq"); br.appendChild(go); br.appendChild(roll); box.appendChild(br); box.appendChild(out);
      } else if (f.opts) {
        var sel = el("div", "ml-opts"); f.opts.forEach(function (o) { var row = seqRow(r, o.seq, null, o.name); sel.appendChild(row); });
        var rb = el("button", "btn btn-sm btn-outline-secondary", "🎲 Choose for me"), said = el("span", "ml-out");
        rb.addEventListener("click", function () { var i = Math.floor(Math.random() * f.opts.length); said.textContent = " This time: " + f.opts[i].name; sel.querySelectorAll(".ml-play")[i].click(); });
        box.appendChild(sel); var rr = el("div", "ml-seq"); rr.appendChild(rb); rr.appendChild(said); box.appendChild(rr);
      }
      c.appendChild(box);
    });
    if (r.note) c.appendChild(el("p", "ml-note", r.note));
    c.appendChild(el("p", "ml-src", SRC[r.src] + (r.check === "read" ? " (notes as printed)" : r.check === "derived" ? " (worked out from the source’s rule)" : " (an illustration: the source says real intervals differ)")));
    return c;
  }
  // the 72 melakartas: a builder, since the rule fixes every one
  function melaBuilder() {
    var box = document.getElementById("ml-mela"); if (!box) return;
    var n = el("input", "form-control"); n.type = "number"; n.min = 1; n.max = 72; n.value = 29; n.style.width = "6rem";
    var lab = el("label", "ml-bar"); lab.appendChild(document.createTextNode("Mela number (1-72) ")); lab.appendChild(n); box.appendChild(lab);
    var out = el("div"); box.appendChild(out);
    function draw() { var k = Math.max(1, Math.min(72, Math.round(+n.value) || 1)), m = mela(k); out.innerHTML = "";
      var r = { id: "mela" + k, name: "Mela " + k + (k === 29 ? " (Śaṅkarābharaṇa)" : ""), aka: [], fam: "karn", sys: "karn", where: (k <= 36 ? "Ma1 (śuddha)" : "Ma2 (prati)") + ", Ri/Ga pair " + (Math.floor(((k - 1) % 36) / 6) + 1) + " of 6, Dha/Ni pair " + ((k - 1) % 6 + 1) + " of 6",
        feats: [{ k: "fixed", t: "Up and down, the same seven notes in order", seq: m.asc + " | " + m.desc }], src: "kassebaum", check: "derived" };
      out.appendChild(card(r)); }
    n.addEventListener("input", draw); draw();
  }
  function mount() {
    FAMS.forEach(function (f) { var box = document.getElementById("ml-" + f.id); if (!box) return; R.filter(function (r) { return r.fam === f.id; }).forEach(function (r) { box.appendChild(card(r)); }); });
    melaBuilder();
    var q = document.getElementById("ml-q"), k = document.getElementById("ml-kind");
    function filt() { var s = (q.value || "").toLowerCase().trim(), kk = k.value;
      document.querySelectorAll(".ml-list .ml-card").forEach(function (c) { c.hidden = !((!s || c.textContent.toLowerCase().indexOf(s) >= 0) && (!kk || c.dataset.kinds.split(" ").indexOf(kk) >= 0)); }); }
    if (q) { q.addEventListener("input", filt); k.addEventListener("change", filt); }
    var st = document.getElementById("ml-stop"); if (st) st.addEventListener("click", stop);
  }
  global.ModeLibrary = { MODES: R, FAMS: FAMS, SRC: SRC, KIND: KIND, parse: parse, mela: mela, droneFor: droneFor, HC: HC, KC: KC, J: J };
  if (typeof document !== "undefined") { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount(); }
  if (typeof module !== "undefined") module.exports = global.ModeLibrary;
})(typeof window !== "undefined" ? window : globalThis);
