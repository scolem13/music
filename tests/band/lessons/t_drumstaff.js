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
function barLen(tok){ var t = tok.replace(/"[^"]*"/g, "").replace(/![^!]*!/g, ""), sum = 0, trip = 0, mm, re = /\(3|\[[^\]]*\](\d*)|[_=^]*[A-Ga-gxz][,']*(\d*)/g;
  while ((mm = re.exec(t))){ if (mm[0] === "(3"){ trip = 3; continue; } var n = parseInt(mm[1] || mm[2] || "1", 10); if (trip > 0){ sum += n * 2 / 3; trip--; } else sum += n; } return sum; }

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
