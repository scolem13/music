// The rock and pop styles: bass lines written on the kick, four-bar grooves, pushed chords, chorus bars,
// fills that fit the style, and the sounds each style brings.   node tests/band/pat/t_pop.js
var path = require("path"), assert = require("assert"), R = path.join(__dirname, "../../..");
["apps/shared/voicings.js", "apps/shared/band/harmony.js", "apps/shared/band/comp.js", "apps/shared/band/bass.js", "apps/shared/band/drums.js",
 "apps/shared/band/catalog.js", "apps/shared/band/midi.js", "apps/shared/tune-chart.js"].forEach(function (f){ require(path.join(R, f)); });
var N = BandHarmony.noteName, C = BandCatalog, r2 = function (x){ return Math.round(x * 100) / 100; };
function abc(meter, bars){ var n = +meter.split("/")[0]; return "X:1\nM:" + meter + "\nL:1/" + meter.split("/")[1] + "\nK:G\n" + bars.map(function (b){ var c = b.split(" ");
  return c.length > 1 ? '"' + c[0] + '"z' + n / 2 + ' "' + c[1] + '"z' + n / 2 : '"' + b + '"z' + n; }).join("|") + "|]"; }
var FORM = ["G", "D", "Em", "C", "G", "D", "C", "C D"];
function gen(style, extra, bars, n, meter, fam){ var so = C.styleOpts(style, fam); return BandMidi.generate(TuneChart.parse(abc(meter || "4/4", bars || FORM)), { bars: n || 8, tempo: 110, opts: Object.assign(so.opts, { variation: 0 }, extra) }); }
function at(b, part, f){ return b.parts[part].filter(f || function (){ return true; }).map(function (e){ return r2(e.pos); }).join(" "); }
function piece(b, p){ return at(b, "drums", function (e){ return e.piece === p; }); }
function bass(b){ return b.parts.bass.map(function (e){ return r2(e.pos) + ":" + N(e.midi); }).join(" "); }

// each style names real things and brings its sounds
var POP = C.styles.filter(function (s){ return s.group === "Folk, rock and pop"; });
assert.deepStrictEqual(POP.map(function (s){ return s.id; }), ["rock", "strum", "pop", "dance", "motown", "doowop", "train", "folk"]);
assert.deepStrictEqual(C.styleOpts("rock").instruments, ["ebass", "piano", "kit"]); assert.deepStrictEqual(C.styleOpts("rock", "guitar").instruments, ["ebass", "cguitar", "kit"]);
assert.deepStrictEqual(C.styleOpts("strum").instruments, ["ebass", "aguitar", "kit"]); assert.strictEqual(C.styleOpts("strum").opts.comp, "guitar");
assert.deepStrictEqual(C.styleOpts("swing").instruments, ["bass", "piano", "kit"]); assert.strictEqual(C.styleOpts("swing").opts.ride, "ride"); assert.strictEqual(C.styleOpts("rock").opts.ride, "hat");
assert.deepStrictEqual(C.styleOpts("dance").instruments, ["ebass", "epiano", "kit"]); assert.strictEqual(C.styleOpts("swing", "guitar").opts.compSound, "guitar");
assert(C.styleOpts("rock").opts.push && C.styleOpts("strum").opts.push && !C.styleOpts("pop").opts.push && !C.styleOpts("swing").opts.push);

// rock: root eighths, a kick that changes over four bars, the hi-hat
var rk = gen("rock", { push: false });
assert.strictEqual(at(rk[0], "bass"), "0 0.5 1 1.5 2 2.5 3 3.5"); assert(rk[0].parts.bass.every(function (e){ return N(e.midi)[0] === "G"; }));
assert.deepStrictEqual([0, 1, 2, 3].map(function (i){ return piece(rk[i], "kick"); }), ["0 2 2.5", "0 1.5 2", "0 2 2.5", "0 2 2.5 3.5"]);
assert.strictEqual(piece(rk[0], "hatClosed"), "0 0.5 1 1.5 2 2.5 3 3.5"); assert.strictEqual(piece(rk[0], "ride"), ""); assert.strictEqual(piece(rk[0], "snare"), "1 3");
// the piano has a left hand; the guitar strums down and up
assert(rk[0].parts.comp.some(function (e){ return e.arp && e.midis.length === 1 && e.pos === 0 && N(e.midis[0]) === "G2"; }));
assert.strictEqual(gen("rock", {}, null, null, null, "guitar")[0].parts.comp.map(function (e){ return e.strum[0]; }).join(""), "dudududu");

// the strummed song and the ballad: bass and kick play the same rhythm
["strum", "pop"].forEach(function (id){ var b = gen(id, { push: false });
  assert.strictEqual(at(b[0], "bass"), "0 1.5 2", id); assert.strictEqual(piece(b[0], "kick"), "0 1.5 2", id);
  assert.strictEqual(bass(b[1]).split(" ").pop(), "3.5:E2", id + ": the second bar leads into the next root"); });
assert.strictEqual(piece(gen("pop")[0], "rim"), "1 3"); assert.strictEqual(piece(gen("pop")[0], "snare"), "");
assert.strictEqual(at(gen("pop")[0], "comp", function (e){ return !e.arp; }), "0 1 2 3");
// dance, Motown, train, doo-wop
var dn = gen("dance"); assert.strictEqual(piece(dn[0], "kick"), "0 1 2 3"); assert.strictEqual(piece(dn[0], "hatOpen"), "0.5 1.5 2.5 3.5"); assert.strictEqual(piece(dn[0], "clap"), "1 3");
assert.strictEqual(bass(dn[0]), "0:G1 0.5:G2 1:G1 1.5:G2 2:G1 2.5:G2 3:G1 3.5:G2"); assert.strictEqual(bass(dn[2]).slice(0, 13), "0:E1 0.5:E2 1", "no room above: the pair moves down");
var mt = gen("motown"); assert.strictEqual(piece(mt[0], "snare"), "0 1 2 3"); assert.strictEqual(piece(mt[0], "tamb"), "1 3"); assert.strictEqual(bass(mt[0]), "0:G1 1.5:G1 2:D2 3:G2 3.5:D2");
var tr = gen("train"); assert.strictEqual(piece(tr[0], "snare"), "0 0.5 1 1.5 2 2.5 3 3.5"); assert.strictEqual(bass(tr[0]), "0:G1 2:D2");
[["4/4", FORM], ["12/8", FORM]].forEach(function (m){ var dw = gen("doowop", {}, m[1], 8, m[0]);
  assert.strictEqual(at(dw[0], "comp", function (e){ return !e.arp; }), [0, 1, 2, 3].map(function (b){ return [b, r2(b + 1 / 3), r2(b + 2 / 3)].join(" "); }).join(" "), m[0]);
  assert.strictEqual(piece(dw[0], "ride").split(" ").length, 12, m[0]); assert.strictEqual(piece(dw[0], "snare"), "1 3"); assert.strictEqual(at(dw[0], "bass"), "0 1.67 2 3.67");
  dw.forEach(function (b){ ["bass", "comp", "drums"].forEach(function (p){ b.parts[p].forEach(function (e){ if (Math.abs(e.pos * 2 - Math.round(e.pos * 2)) > 1e-6) assert(e.straight, m[0] + " " + p + " triplet placed exactly"); }); }); }); });

// a chord that arrives in mid-bar gets its root, not the pattern's fifth (boom-chick used to play A under a new D)
["folk", "train"].forEach(function (id){ assert.strictEqual(bass(gen(id)[7]), "0:C2 2:D2", id); });
assert.strictEqual(bass(gen("folk")[0]), "0:G1 2:D2", "one chord: root and fifth as before");
assert.strictEqual(bass(gen("bossa", {}, ["C G", "F"], 2)[0]).replace(/\d(?= |$)/g, ""), "0:C 1.5:G 2:G 3.5:F");   // (the pickup is the fifth of C; beat 3 is the root of G)

// pushes: into the third bar of each phrase the bass, the chords and the kick play the new chord on the and of 4 together
var ps = gen("rock"), b1 = ps[1], b2 = ps[2];
assert.strictEqual(bass(b1).split(" ").pop(), "3.5:E2"); assert(b1.parts.bass.filter(function (e){ return e.pos === 3.5; })[0].dur > 1);
var pc = b1.parts.comp.filter(function (e){ return e.pos === 3.5; }); assert.strictEqual(pc.length, 1); assert.strictEqual(pc[0].of, "2:0"); assert(pc[0].dur > 1 && pc[0].midis.map(N).join(" ") === "B3 E4 G4");
assert(piece(b1, "kick").split(" ").indexOf("3.5") >= 0);
assert.strictEqual(at(b2, "bass").split(" ")[0], "0.5"); assert.strictEqual(at(b2, "comp").split(" ")[0], "0.5"); assert.strictEqual(piece(b2, "kick"), "2 2.5", "the downbeat is left alone");
assert.strictEqual(at(ps[0], "bass").split(" ").pop() + at(ps[3], "bass").split(" ")[0], "3.50", "nowhere else");
assert.strictEqual(bass(gen("rock", {}, ["G", "G", "G", "G"], 4)[1]).split(" ").pop(), "3.5:G1", "no push without a chord change");
assert.strictEqual(at(gen("rock", { stops: [2] })[1], "comp", function (e){ return e.pos === 3.5 && e.of === "2:0"; }), "", "nor into a stop");
assert.strictEqual(at(gen("rock", { timeFeel: "half" })[1], "comp", function (e){ return e.of === "2:0"; }), "", "nor in half time");
// a pinned voicing is pushed as pinned
assert.strictEqual(gen("rock", { pins: { "2:0": [59, 64, 67, 71] } })[1].parts.comp.filter(function (e){ return e.pos === 3.5; })[0].midis.join(), "59,64,67,71");

// chorus bars: a fill and a crash going in, the ride while it lasts, everyone louder; the hi-hat again after
var lf = gen("rock", { lift: [4, 5, 6, 7], push: false }, null, 16);
assert(lf[3].parts.drums.some(function (e){ return e.piece === "snare" && e.pos > 3 || /tom/.test(e.piece); }), "fill into the chorus");
assert.strictEqual(piece(lf[4], "crash"), "0"); assert.strictEqual(piece(lf[5], "ride"), "0 0.5 1 1.5 2 2.5 3 3.5"); assert.strictEqual(piece(lf[5], "hatClosed"), ""); assert.strictEqual(piece(lf[9], "ride"), "");
function mean(b, part){ var l = b.parts[part].filter(function (e){ return part !== "drums" || e.piece === "snare"; }); return l.reduce(function (s, e){ return s + e.vel; }, 0) / l.length; }
["bass", "comp", "drums"].forEach(function (p){ assert(mean(lf[5], p) > mean(lf[1], p) + 0.02, p + " louder in the chorus"); });
assert.strictEqual(piece(gen("pop", { lift: [4, 5, 6, 7] })[5], "snare"), "1 3", "the ballad's cross-stick becomes the snare");

// fills fit the style: a ballad or a strummed song never gets more than one beat of fill; rock fills use sixteenths
["pop", "strum", "folk", "train", "dance", "motown"].forEach(function (id){ gen(id, { variation: 1 }, null, 64).forEach(function (b, i){
  var cym = b.parts.drums.filter(function (e){ return id !== "train" && id !== "folk" && /hat|ride/.test(e.piece) && e.piece !== "hatFoot"; });
  if (cym.length) assert(Math.max.apply(null, cym.map(function (e){ return e.pos; })) >= 2.5, id + " bar " + i + ": time kept to beat 3 at least"); }); });
assert(gen("rock", { variation: 1 }, null, 64).some(function (b){ return b.parts.drums.some(function (e){ return e.piece === "snare" && Math.abs(e.pos * 4 % 2 - 1) < 1e-6; }); }), "a sixteenth-note fill");

// every style in 4/4, 3/4, 2/4 and 5/4, with pushes and a chorus: everything inside the bar and in range
POP.forEach(function (st){ ["4/4", "3/4", "2/4", "5/4"].forEach(function (m){ ["piano", "guitar"].forEach(function (fam){
  gen(st.id, { push: true, lift: [4, 5, 6, 7], stops: [6] }, ["G", "D", "Em", "C", "G", "D", "C", "D"], 16, m, fam).forEach(function (b, i){
    ["bass", "comp", "drums"].forEach(function (p){ b.parts[p].forEach(function (e){ if (e.choke) return; assert(e.pos >= 0 && e.pos < b.beats && e.vel > 0.1 && e.vel <= 1, [st.id, m, fam, p, i, JSON.stringify(e)].join(" ")); }); });
    b.parts.bass.forEach(function (e){ assert(e.midi >= BandBass.LO && e.midi <= BandBass.HI); }); }); }); }); });
console.log("POP OK");
