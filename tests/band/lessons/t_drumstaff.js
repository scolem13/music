// The drum staff (notation.js) and the three teaching grooves (quarters, ridetime, shuffle).   node tests/band/lessons/t_drumstaff.js
var path = require("path"), assert = require("assert"), R = path.join(__dirname, "../../..");
["apps/shared/voicings.js", "apps/shared/band/harmony.js", "apps/shared/band/comp.js", "apps/shared/band/bass.js", "apps/shared/band/drums.js",
 "apps/shared/band/catalog.js", "apps/shared/band/midi.js", "apps/shared/band/notation.js", "apps/shared/tune-chart.js"].forEach(function (f){ require(path.join(R, f)); });
function mb(a){ return function (){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function chart(meter){ var n = +meter.split("/")[0], d = meter.split("/")[1]; return TuneChart.parse("X:1\nM:" + meter + "\nL:1/" + d + "\nK:F\n" + "F7|F7|F7|F7|Bb7|Bb7|F7|F7|C7|Bb7|F7|C7".split("|").map(function (c){ return '"' + c + '"z' + n; }).join("|") + "|]"); }
function gen(opts, meter, seed){ return BandMidi.generate(chart(meter || "4/4"), { bars: 24, tempo: 120, opts: opts, rng: mb(seed || 5) }); }
function at(r, piece){ return r.parts.drums.filter(function (e){ return e.piece === piece; }).map(function (e){ return Math.round(e.pos * 100) / 100; }).join(" "); }
function drumAbc(recs){ return BandNotation.toAbc(recs, { key: "F", show: { comp: false, bass: false, drums: true } }); }
function voice(abc, id){ return abc.split("\n").filter(function (l, i, a){ return l.indexOf("[V:" + id + "]") === 0 || (a[i - 2] === "V:" + id && /\|/.test(l)); }).join(" ").replace(/\[V:\w\]/g, ""); }
function barLen(tok){ var t = tok.replace(/"[^"]*"/g, "").replace(/![^!]*!/g, ""), sum = 0, trip = 0, mm, re = /\(3|\[[^\]]*\](\d*(?:\/\d*)?)|[_=^]*[A-Ga-gxz][,']*(\d*(?:\/\d*)?)/g;
  while ((mm = re.exec(t))){ if (mm[0] === "(3"){ trip = 3; continue; } var ln = mm[1] || mm[2] || "1", n = /\//.test(ln) ? parseInt(ln.split("/")[0] || "1", 10) / parseInt(ln.split("/")[1] || "2", 10) : parseInt(ln, 10); if (trip > 0){ sum += n * 2 / 3; trip--; } else sum += n; } return sum; }

// the grooves: what is played
var C = BandCatalog, S = function (id){ return C.styleOpts(id).opts; };
["quarters", "ridetime", "shuffle"].forEach(function (id){ var e = C.byId(C.drums, id); assert(e && e.desc && e.fits.indexOf("swing") >= 0 && BandDrums.GROOVES[id], id + " in the catalog"); });
gen(Object.assign(S("swing"), { groove: "quarters", fills: "none" })).forEach(function (r){ assert.strictEqual(at(r, "ride"), "0 1 2 3"); assert.strictEqual(at(r, "hatFoot"), "1 3"); assert.strictEqual(r.parts.drums.length, 6, "nothing else, bar " + r.index); });
gen(Object.assign(S("swing"), { groove: "ridetime", fills: "none" })).forEach(function (r){ assert.strictEqual(at(r, "ride"), "0 1 1.5 2 3 3.5"); assert.strictEqual(at(r, "hatFoot"), "1 3"); assert.strictEqual(r.parts.drums.length, 8); });
gen(Object.assign(S("swing"), { groove: "shuffle", fills: "none" })).forEach(function (r){ assert.strictEqual(at(r, "ride"), "0 0.5 1 1.5 2 2.5 3 3.5"); assert.strictEqual(at(r, "snare"), "1 3"); assert.strictEqual(at(r, "kick"), "0 2"); });
gen(Object.assign(S("swing"), { groove: "quarters", ride: "hat", fills: "none" })).forEach(function (r){ assert.strictEqual(at(r, "hatClosed"), "0 1 2 3"); assert.strictEqual(at(r, "hatFoot"), ""); });
assert.strictEqual(at(gen(Object.assign(S("swing"), { groove: "ridetime", fills: "none" }), "3/4")[1], "ride"), "0 1 1.5 2");
var asked = gen(Object.assign(S("swing"), { groove: "shuffle", fills: "none", fillBars: { 11: "medium" } }));
assert(/tom|snare/.test(asked[11].parts.drums.filter(function (e){ return e.pos >= 2; }).map(function (e){ return e.piece; }).join(" ")) && at(asked[10], "snare") === "1 3", "a fill only where asked");
console.log("TEACHING GROOVES OK");

// the chord-tone bass line: root, 3rd, 5th, 7th on the four beats, rising, in every key; each chord of a two-chord bar opens on its root
(function (){
  var e = C.byId(C.bass, "arp"); assert(e && e.fits.indexOf("swing") >= 0 && BandBass.LINES.arp, "arp in the catalog");
  var p = TuneChart.parse('X:1\nM:4/4\nL:1/4\nK:F\n"F7"z4|"Bb7"z4|"Gm7"z4|"C7"z4|"Fmaj7"z4|"F7"z2 "D7"z2|]'), m12 = function (n){ return ((n % 12) + 12) % 12; };
  for (var t = -5; t <= 6; t++){
    var recs = BandMidi.generate(p, { bars: 6, tempo: 120, transpose: t, opts: Object.assign(S("swing"), { bassFeel: "arp" }), rng: mb(3) });
    recs.slice(0, 5).forEach(function (r, i){ var b = r.parts.bass, root = b[0].midi;
      assert.deepStrictEqual(b.map(function (x){ return x.pos; }), [0, 1, 2, 3], "one note a beat");
      assert.deepStrictEqual(b.map(function (x){ return x.midi - root; }), [[0, 4, 7, 10], [0, 4, 7, 10], [0, 3, 7, 10], [0, 4, 7, 10], [0, 4, 7, 11]][i], "transpose " + t + " bar " + i);
      assert.strictEqual(m12(root), m12([5, 10, 7, 0, 5][i] + t)); assert(root >= 28 && root + 11 <= 60, "in the bass's range: " + root); });
    var two = recs[5].parts.bass; assert.deepStrictEqual(two.map(function (x){ return m12(x.midi - t); }), [5, 9, 2, 0], "F7 D7: root and 3rd, then root and 7th");
  }
  console.log("CHORD-TONE BASS LINE OK");
})();

// the staff: where each piece is written
var q = drumAbc(gen(Object.assign(S("swing"), { groove: "quarters", fills: "none" })).slice(0, 4));
assert.strictEqual(voice(q, "U").split("|")[0].trim().replace(/"[^"]*"/g, ""), "!style=x!f2 !style=x!f2 !style=x!f2 !style=x!f2", "ride on the top line, quarter notes");
assert.strictEqual(voice(q, "D").split("|")[0].trim(), "x2 !style=x!D2 x2 !style=x!D2", "hi-hat foot under the staff, rests not drawn");
var hat = drumAbc(gen(Object.assign(S("rock"), { fills: "none" })).slice(0, 4));
assert(/!style=x!g/.test(voice(hat, "U")) && !/!style=x!f/.test(voice(hat, "U")), "hi-hat above the staff");
assert(/(^|[ \[])F/.test(voice(hat, "D")) && !/[DE]/.test(voice(hat, "D").replace(/!style=x!D/g, "")), "kick in the bottom space");
assert(!/F[3-8]/.test(voice(hat, "D")), "a kick is never longer than a quarter note: " + voice(hat, "D"));
// swing time: the feathered kick is not written, the comping kick is
var sw = gen(S("swing"), "4/4", 9), swAbc = drumAbc(sw);
assert(sw.some(function (r){ return r.parts.drums.some(function (e){ return e.piece === "kick" && e.vel < 0.3; }); }), "the drummer does feather");
sw.slice(0, 12).forEach(function (r, i){ var loud = r.parts.drums.filter(function (e){ return e.piece === "kick" && e.vel >= 0.3; }).length, bar = voice(swAbc, "D").split("|")[i] || "";
  assert.strictEqual((bar.match(/F/g) || []).length > 0, loud > 0, "bar " + i + " kicks written: " + bar); });
assert(/!open!!style=x!g/.test(drumAbc(gen(Object.assign(S("dance"), { fills: "none" })).slice(0, 2))), "an open hi-hat has its circle");
assert(/!style=harmonic!f/.test(drumAbc(gen(Object.assign(S("swing"), { ride: "bell", fills: "none" })).slice(0, 2))), "the ride bell is a diamond");
// every written bar is the right length, in every style and three meters
var nb = 0;
[["4/4", 8], ["3/4", 6], ["12/8", 12]].forEach(function (m){ C.styles.forEach(function (st, k){
  drumAbc(gen(Object.assign(S(st.id), { variation: 0.7 }), m[0], 3 + k)).split("\n").filter(function (l){ return /\|/.test(l); }).forEach(function (l){
    l.replace(/^\[V:\w\]/, "").replace(/\[M:[^\]]*\]/g, "").replace(/\|\]/, "|").split("|").map(function (x){ return x.trim(); }).filter(Boolean).forEach(function (b){ nb++;
      assert(Math.abs(barLen(b) - m[1]) < 1e-6, st.id + " " + m[0] + " bar length " + barLen(b) + " in: " + b); }); }); }); });
console.log("DRUM STAFF OK " + nb + " bars");

// the names of the pieces: one table with the placement (hover text on the lesson's drum staves)
(function (){
  var N = BandNotation, seen = {};
  N.drumOrder.forEach(function (p){ var w = N.drumWritten(p); assert(w && N.drumNames[p], p + " has a place and a name");
    assert.strictEqual(N.drumPiece(w.letter, w.style, w.open), p, p + ": the place it is written finds it again"); assert.strictEqual(N.drumName(w.letter, w.style, w.open), N.drumNames[p]);
    var k = w.letter + w.style + w.open; assert(!seen[k], p + " shares a place with " + seen[k]); seen[k] = p; });
  assert.strictEqual(N.drumName("c", "x", false), N.drumNames.sticks); assert.strictEqual(N.drumName("g", "x", true), "Hi-hat, open"); assert.strictEqual(N.drumName("z", "", false), null);
  // every piece the notation can write answers to a name, rim and clap included (they sit on the cross-stick's place)
  ["ride", "rideBell", "crash", "hatClosed", "hatOpen", "sticks", "rim", "snare", "tomHi", "tomMid", "tomLo", "kick", "hatFoot"].forEach(function (p){ var w = N.drumWritten(p); assert(N.drumName(w.letter, w.style, w.open), p + " is named"); });
  console.log("DRUM NAMES OK");
})();

// ---- the hi-hat lesson grooves (lessons/hihat-grooves.qmd): what is played, how it is written, sixteenths and accents
(function (){
  var HH = ["hhquarters", "hheighths", "hhaccents", "hhoffbeats", "hhopen", "hhdance", "hhsix", "hhsix2", "hhfoot4", "hhswing"];
  function chart2(meter){ var b = +meter.split("/")[0]; return TuneChart.parse("X:1\nM:" + meter + "\nL:1/" + meter.split("/")[1] + "\nK:F\n" + ('"F7"z' + b + "|").repeat(4) + "]"); }
  function run(g, meter, style, ride){ return BandMidi.generate(chart2(meter || "4/4"), { bars: 4, tempo: 100, opts: Object.assign(S(style || "rock"), { groove: g, fills: "none" }, ride ? { ride: ride } : {}), rng: mb(2) }); }
  function pos(r, piece){ return r.parts.drums.filter(function (e){ return e.piece === piece; }).map(function (e){ return e.pos; }); }
  var show = { comp: false, bass: false, drums: true };
  // catalog and fit lists: a set, each described, in the menus of its styles
  HH.forEach(function (id){ var e = C.byId(C.drums, id); assert(e && e.desc && /^Hi-hat: /.test(e.label) && BandDrums.GROOVES[id], id + " in the catalog");
    assert(e.fits.length, id + " fits a style (a part missing from FITS cannot be chosen with the lock on)"); assert.strictEqual(e.fits.indexOf("swing") >= 0, id === "hhswing", id + " swing only for the swing hi-hat"); });
  ["rock", "strum", "pop", "dance", "boogaloo"].forEach(function (st){ assert(C.byId(C.drums, "hheighths").fits.indexOf(st) >= 0, "eighths fit " + st); });
  // nothing existing changed: no event of another groove carries the sixteenth mark, and the dance still has its clap
  Object.keys(BandDrums.GROOVES).filter(function (id){ return HH.indexOf(id) < 0; }).forEach(function (id){
    gen(Object.assign(S("rock"), { groove: id, fills: "none" })).forEach(function (r){ r.parts.drums.forEach(function (e){ assert(!("six" in e), id + " has no six mark"); }); }); });
  assert(pos(run("dance")[0], "clap").length === 2 && !pos(run("hhdance")[0], "clap").length, "the lesson's four on the floor has no clap");
  // beat grids
  var g = { q: run("hhquarters")[0], e: run("hheighths")[0], o: run("hhoffbeats")[0], op: run("hhopen")[0], d: run("hhdance")[0], s1: run("hhsix")[0], s2: run("hhsix2")[0], f: run("hhfoot4")[0], w: run("hhswing", "4/4", "swing")[0] };
  assert.deepStrictEqual(pos(g.q, "hatClosed"), [0, 1, 2, 3]); assert.deepStrictEqual(pos(g.q, "kick"), [0, 2]); assert.deepStrictEqual(pos(g.q, "snare"), [1, 3]);
  assert.strictEqual(pos(g.e, "hatClosed").length, 8); assert.deepStrictEqual(pos(g.e, "snare"), [1, 3]); assert.deepStrictEqual(pos(g.e, "kick"), [0, 2]);
  assert.deepStrictEqual(pos(g.o, "hatClosed"), [0.5, 1.5, 2.5, 3.5]); assert.deepStrictEqual(pos(g.o, "kick"), [0, 1, 2, 3]); assert.deepStrictEqual(pos(g.o, "snare"), [1, 3]);
  assert.deepStrictEqual(pos(g.op, "hatOpen"), [3.5]); assert.strictEqual(pos(g.op, "hatClosed").length, 7); assert.deepStrictEqual(pos(g.op, "hatFoot"), [0], "the foot closes it on 1");
  assert.deepStrictEqual(pos(g.d, "hatOpen"), [0.5, 1.5, 2.5, 3.5]); assert.deepStrictEqual(pos(g.d, "hatClosed"), [0, 1, 2, 3]); assert.deepStrictEqual(pos(g.d, "kick"), [0, 1, 2, 3]);
  assert.strictEqual(pos(g.s1, "hatClosed").length, 16); assert.deepStrictEqual(pos(g.s1, "hatClosed").slice(0, 5), [0, 0.25, 0.5, 0.75, 1]);
  assert.strictEqual(pos(g.s2, "hatClosed").length, 14); assert(pos(g.s2, "hatClosed").indexOf(1) < 0 && pos(g.s2, "hatClosed").indexOf(3) < 0 && pos(g.s2, "snare").join() === "1,3", "no hat on the snare's notes");
  assert.deepStrictEqual(pos(g.f, "hatFoot"), [0, 1, 2, 3]); assert.strictEqual(pos(g.f, "ride").length, 8); assert.strictEqual(pos(g.f, "hatClosed").length, 0);
  assert.deepStrictEqual(pos(g.w, "hatOpen"), [0, 2]); assert.deepStrictEqual(pos(g.w, "hatClosed"), [1, 1.5, 3, 3.5]); assert.deepStrictEqual(pos(g.w, "hatFoot"), [1, 3]);
  // sixteenths are straight and marked, the rest is not
  g.s1.parts.drums.forEach(function (e){ var odd = Math.abs(e.pos * 2 - Math.round(e.pos * 2)) > 1e-6; assert.strictEqual(!!e.six, odd, "six on the sixteenths only: " + e.pos); assert.strictEqual(!!e.straight, odd); });
  // whatever the Cymbal menu says, these are hi-hat grooves (the foot is kept, the ride is not turned into the hat)
  ["ride", "hat", "bell"].forEach(function (c){ assert.deepStrictEqual(pos(run("hhfoot4", "4/4", "rock", c)[0], "hatFoot"), [0, 1, 2, 3], c); assert.strictEqual(pos(run("hheighths", "4/4", "rock", c)[0], "hatClosed").length, 8, c);
    assert.deepStrictEqual(pos(run("hhswing", "4/4", "swing", c)[0], "hatFoot"), [1, 3], c); assert.strictEqual(pos(run("hhswing", "4/4", "swing", c)[0], "ride").length, 0, c); });
  // 3/4: a bar of three, the same pieces
  HH.forEach(function (id){ var r3 = run(id, "3/4", id === "hhswing" ? "swing" : "rock")[0].parts.drums; assert(r3.length && r3.every(function (e){ return e.pos < 3; }), id + " has a bar of three"); });
  assert.strictEqual(pos(run("hhsix", "3/4")[0], "hatClosed").length, 12); assert.strictEqual(pos(run("hhsix2", "3/4")[0], "hatClosed").length, 11);
  // the staff: bar lengths in 4/4 and 3/4 (with and without accents), sixteenths written as sixteenths, accents opt-in
  var nb2 = 0;
  [["4/4", 8], ["3/4", 6]].forEach(function (m){ HH.forEach(function (id){ [false, true].forEach(function (acc){
    var abc = BandNotation.toAbc(run(id, m[0], id === "hhswing" ? "swing" : "rock"), { key: "F", show: show, accents: acc });
    ["U", "D"].forEach(function (vid){ voice(abc, vid).replace(/\]\s*$/, "").split("|").map(function (x){ return x.trim(); }).filter(Boolean).forEach(function (b){ nb2++; assert(Math.abs(barLen(b) - m[1]) < 1e-6, id + " " + m[0] + " " + vid + " bar length " + barLen(b) + " in: " + b); }); }); }); }); });
  var six = voice(drumAbc(run("hhsix")), "U").split("|")[0], six2 = voice(drumAbc(run("hhsix2")), "U").split("|")[0];
  assert.strictEqual((six.match(/style=x!g/g) || []).length, 16, "sixteen hat heads in a bar of sixteenths: " + six); assert.strictEqual((six.match(/\/2/g) || []).length, 16);
  assert.strictEqual((six2.match(/style=x!g/g) || []).length, 14, "fourteen with two hands: " + six2); assert(/(^| )c\/2/.test(six2) && !/\[[^\]]*gc/.test(six2.replace(/!style=x!/g, "")), "the snare stands alone where the hat is silent");
  assert(!/!>!/.test(drumAbc(run("hhaccents"))), "no accents unless asked");
  var acc = BandNotation.toAbc(run("hhaccents"), { key: "F", accents: true, show: show }), accU = voice(acc, "U").split("|")[0];
  assert.strictEqual((accU.match(/!>!/g) || []).length, 4, "an accent on each of the four beats and none on the ands: " + accU);
  assert.strictEqual(voice(BandNotation.toAbc(run("hhaccents"), { key: "F", show: { accents: true, comp: false, bass: false, drums: true } }), "U"), voice(acc, "U"), "show.accents does the same");
  assert(!/!>!/.test(BandNotation.toAbc(run("hheighths"), { key: "F", accents: true, show: show })), "equal eighths: nothing stands out, no accents");
  console.log("HI-HAT GROOVES OK " + nb2 + " bars");
})();
