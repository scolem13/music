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
assert.deepStrictEqual(POP.map(function (s){ return s.id; }), ["rock", "emo", "strum", "pop", "dance", "motown", "doowop", "train", "folk", "prine"]);
assert.deepStrictEqual(C.styleOpts("rock").instruments, ["ebass", "piano", "kit"]); assert.deepStrictEqual(C.styleOpts("rock", "guitar").instruments, ["ebass", "clguitar", "kit"]);
assert.deepStrictEqual(C.styleOpts("strum").instruments, ["ebass", "aguitar", "kit"]); assert.strictEqual(C.styleOpts("strum").opts.comp, "guitar");
assert.deepStrictEqual(C.styleOpts("swing").instruments, ["bass", "piano", "kit"]); assert.strictEqual(C.styleOpts("swing").opts.ride, "ride"); assert.strictEqual(C.styleOpts("rock").opts.ride, "hat");
assert.deepStrictEqual(C.styleOpts("dance").instruments, ["ebass", "epiano", "kit"]); assert.strictEqual(C.styleOpts("swing", "guitar").opts.compSound, "guitar");
assert(C.styleOpts("rock").opts.push && C.styleOpts("strum").opts.push && !C.styleOpts("pop").opts.push && !C.styleOpts("swing").opts.push);

// rock: root eighths, a kick that changes over four bars, the hi-hat
var rk = gen("rock", { push: false });
assert.strictEqual(at(rk[0], "bass"), "0 0.5 1 1.5 2 2.5 3 3.5"); assert(rk[0].parts.bass.every(function (e){ return N(e.midi)[0] === "G"; }));
assert.deepStrictEqual([0, 1, 2].map(function (i){ return piece(rk[i], "kick"); }), ["0 2 2.5", "0 1.5 2", "0 2 2.5"]);
assert.strictEqual(BandDrums.GROOVES.rock.bars[3].filter(function (h){ return h[1] === "kick"; }).map(function (h){ return h[0]; }).join(" "), "0 2 2.5 3.5");
assert.strictEqual(piece(rk[0], "hatClosed"), "0 0.5 1 1.5 2 2.5 3 3.5"); assert.strictEqual(piece(rk[0], "ride"), ""); assert.strictEqual(piece(rk[0], "snare"), "1 3");
// the piano has a left hand; the guitar strums down and up
assert(rk[0].parts.comp.some(function (e){ return e.arp && e.midis.length === 1 && e.pos === 0 && N(e.midis[0]) === "G2"; }));
assert.strictEqual(gen("rock", {}, null, null, null, "guitar")[0].parts.comp.map(function (e){ return e.strum[0]; }).join(""), "dudududu");

// the strummed song and the ballad (in normal time): bass and kick play the same rhythm
["strum", "pop"].forEach(function (id){ var b = gen(id, { push: false, timeFeel: "normal" });
  assert.strictEqual(at(b[0], "bass"), "0 1.5 2", id); assert.strictEqual(piece(b[0], "kick"), "0 1.5 2", id);
  assert.strictEqual(bass(b[1]).split(" ").pop(), "3.5:E2", id + ": the second bar leads into the next root"); });
assert.strictEqual(piece(gen("pop", { timeFeel: "normal" })[0], "rim"), "1 3"); assert.strictEqual(piece(gen("pop")[0], "snare"), "");
// the ballad is in half time unless told otherwise: bass and kick still together at half speed, the cross-stick on 3, the piano as written
(function (){ var o = C.styleOpts("pop").opts; assert.strictEqual(o.timeFeel + "|" + o.timeFeelParts, "half|bass drums plain"); assert.strictEqual(C.styleOpts("rock").opts.timeFeel, "normal");
  var h = gen("pop")[0], n = gen("pop", { timeFeel: "normal" })[0]; assert.strictEqual(at(h, "bass"), "0 3"); assert.strictEqual(piece(h, "kick"), "0 3"); assert.strictEqual(piece(h, "rim"), "2");
  assert.strictEqual(at(gen("pop", { compRhythm: "ballRock" })[0], "comp"), at(gen("pop", { compRhythm: "ballRock", timeFeel: "normal" })[0], "comp")); })();
assert.strictEqual(at(gen("pop", { compRhythm: "quarters" })[0], "comp", function (e){ return !e.arp; }), "0 1 2 3");
// ---- the piano ballad: left-hand octaves, a first-inversion right hand broken into top pair and thumb ----
function names(e){ return e.midis.map(N).join(" "); }
function hand(b, right){ return b.parts.comp.filter(function (e){ return (e.hand !== "L") === right; }); }
var br = gen("pop", { compRhythm: "ballRock" })[0], rhs = hand(br, true), lhs = hand(br, false);
assert.strictEqual(rhs.map(function (e){ return r2(e.pos) + ":" + names(e); }).join(" | "), "0:B3 D4 G4 | 1:B3 | 2:D4 G4 | 3:B3");
assert.strictEqual(lhs.map(function (e){ return r2(e.pos) + ":" + names(e); }).join(" | "), "0:G3 | 1.5:D3 | 2:G3", "a bassist's figure, not below A2: no room for the octave here, so the fifth is found below");
assert.strictEqual(hand(gen("pop", { compRhythm: "ballRock" }, ["C"], 1)[0], false).map(function (e){ return r2(e.pos) + ":" + names(e); }).join(" | "), "0:C3 C4 | 1.5:G3 | 2:C4", "octave, fifth, upper root where there is room");
assert(rhs[0].arp !== true && rhs.slice(1).concat(lhs).every(function (e){ return e.arp; }), "only the whole chord is the voicing");
assert.strictEqual(hand(gen("pop", { compRhythm: "ballBroken" })[0], true).map(function (e){ return r2(e.pos) + ":" + names(e); }).join(" | "), "0:B3 | 0.5:D4 | 1:G4 | 2:B3 D4 G4");
assert.strictEqual(hand(gen("pop", { compRhythm: "ballSync" })[0], true).map(function (e){ return r2(e.pos) + ":" + names(e); }).join(" | "), "0:B3 D4 G4 | 1.5:D4 G4 | 3:D4 G4");
// sparse: never more than five right-hand attacks in a bar, whatever the tempo
[50, 70, 120].forEach(function (tp){ BandMidi.generate(TuneChart.parse(abc("4/4", FORM)), { bars: 32, tempo: tp, opts: Object.assign(C.styleOpts("pop").opts, { variation: 1 }) }).forEach(function (b){
  var onsets = {}; hand(b, true).forEach(function (e){ onsets[e.pos] = 1; }); assert(Object.keys(onsets).length <= 5, tp + " bpm: " + Object.keys(onsets)); }); });
// seventh chords: 3rd, 5th, 7th; a chord arriving in mid-bar is stated whole with its own octaves; other voicings and guitars are broken up as they stand
assert.strictEqual(names(hand(gen("pop", { compRhythm: "ballRock" }, ["Am7"], 1)[0], true)[0]).replace(/\d/g, ""), "C E G");
var two = gen("pop", { compRhythm: "ballRock" }, ["C D"], 1)[0]; assert.strictEqual(hand(two, true).filter(function (e){ return e.midis.length === 3; }).map(function (e){ return e.pos; }).join(), "0,2");
assert.strictEqual(hand(two, false).filter(function (e){ return e.midis.length === 2; }).map(function (e){ return e.pos + N(e.midis[0])[0]; }).join(), "0C,2D");
assert.strictEqual(gen("pop", { compRhythm: "ballRock", voicing: "drop2" }, ["Cmaj7"], 1)[0].parts.comp[0].midis.length, 4);
var gt = gen("pop", { compRhythm: "ballRock" }, null, 2, null, "guitar")[0].parts.comp; assert(gt[0].midis.length >= 3 && gt[1].midis.length === 1 && gt[2].midis.length === 2 && gt.every(function (e){ return e.midis[0] >= 40; }), "guitar: no left hand");
BandHarmony.asPlayed(gen("pop", {}, null, 8), { style: "standard", inst: "piano" }).forEach(function (c){ assert.strictEqual(c.midis.length, 3, "the hand-off gets the triad"); });
// Strict: chord tones only. Loose: neighbour notes, all in the key, and never on a chord's first hit
var KEYG = [7, 9, 11, 0, 2, 4, 6], strict = gen("pop", { variation: 0 }, null, 64), loose = gen("pop", { variation: 1 }, null, 192), odd = 0;
function tones(b, e){ var c = BandHarmony.chordAt(b.chords, e.pos); return [c.root, (c.root + c.third) % 12, (c.root + c.fifth) % 12]; }
strict.forEach(function (b){ hand(b, true).forEach(function (e){ e.midis.forEach(function (m){ assert(tones(b, e).indexOf(m % 12) >= 0, "strict: " + N(m)); }); }); });
loose.forEach(function (b){ hand(b, true).forEach(function (e){ e.midis.forEach(function (m){ assert(KEYG.indexOf(m % 12) >= 0, "in the key: " + N(m));
  if (tones(b, e).indexOf(m % 12) < 0){ odd++; assert(e.arp && !b.chords.some(function (c){ return c.pos === e.pos; }), "never as a chord arrives"); } }); }); });
assert(odd > 2, "neighbour notes heard: " + odd);
// The right hand is voice-led: first inversion to begin with, then whichever inversion moves least (I to IV: root position)
(function (){ function rhAt(b){ return b.parts.comp.filter(function (e){ return e.hand !== "L" && e.pos === 0; })[0]; }
  function inC(bars, n, extra){ return BandMidi.generate(TuneChart.parse(abc("4/4", bars).replace("K:G", "K:C")), { bars: n || bars.length, tempo: 80, opts: Object.assign(C.styleOpts("pop").opts, { variation: 0, compRhythm: "ballSync" }, extra) }); }
  var led = inC(["C", "F", "C", "G", "Am", "F", "G", "C"]).map(function (b){ return names(rhAt(b)); });
  assert.strictEqual(led[0], "E4 G4 C5", "I in first inversion"); assert.strictEqual(led[1], "F4 A4 C5", "IV in root position"); assert.strictEqual(led[2], "E4 G4 C5");
  var long = inC(["C", "Am", "Dm", "G", "Em", "F", "Bb", "Eb", "Ab", "Db", "F#", "B", "E", "A", "D", "G"], 64), prevV = null;
  long.forEach(function (b){ var v = rhAt(b).midis; assert(v.length === 3 && v[0] >= 57 && v[2] <= 84 && v[2] - v[0] <= 9, "close position in range: " + v);
    if (prevV) assert(v.reduce(function (s, n, k){ return s + Math.abs(n - prevV[k]); }, 0) <= 9, "small motion " + prevV + " -> " + v); prevV = v; });
  // Voicing movement. Hold: a chord that lasts keeps its voicing. Move: it steps through its inversions, a bar at a time and
  // sometimes within the bar, staying a close-position triad of the same chord between A3 and C6
  var held = inC(["C", "C", "C", "C"], 16, { compRhythm: "ballRock", voiceMove: "hold" }).map(function (b){ return names(rhAt(b)); });
  assert(held.every(function (x){ return x === held[0]; }), "hold: " + held.join(" | "));
  var moving = inC(["C", "C", "C", "C", "F", "F", "G", "G"], 64, { compRhythm: "ballRock", voiceMove: "move" }), shapes = {}, inBar = 0, heldBars = 0, movedBars = 0;
  moving.forEach(function (b, k){ var fulls = b.parts.comp.filter(function (e){ return e.hand !== "L" && e.midis.length === 3; }), ch = BandHarmony.chordAt(b.chords, 0);
    fulls.forEach(function (e){ assert(e.midis[0] >= 57 && e.midis[2] <= 84 && e.midis[2] - e.midis[0] <= 9 && e.midis.every(function (m){ return [0, 4, 7].indexOf((m - ch.root + 120) % 12) >= 0; }), "moving: " + e.midis);
      if (ch.root === 0) shapes[e.midis.map(function (m){ return m % 12; }).join()] = 1; });
    var tops = {}; b.parts.comp.forEach(function (e){ if (e.hand !== "L" && e.midis.length > 1) tops[e.midis[e.midis.length - 1]] = 1; }); if (Object.keys(tops).length > 1) inBar++;
    b.parts.comp.forEach(function (e){ if (e.hand !== "L") e.midis.forEach(function (m){ assert([0, 4, 7].indexOf((m - ch.root + 120) % 12) >= 0 && m >= 57 && m <= 84, "moving: chord tones in range"); }); });
    if (k % 8 > 0 && k % 8 < 4){ heldBars++; if (names(rhAt(b)) !== names(rhAt(moving[k - 1]))) movedBars++; } });
  assert(movedBars > heldBars * 0.6, "a held chord starts its next bar somewhere else: " + movedBars + " of " + heldBars);
  assert.strictEqual(Object.keys(shapes).length, 3, "all three inversions of C"); assert(inBar > 5, "and within a bar " + inBar);
  // the left hand: a bassist's rhythms, rarely below A2. Strict: octave (or root), fifth on the and of 2, root on 3, never below A2.
  // With variation: other figures (bounce, fifth on 3, lead-in, held, quarters) and now and then another register.
  // The right hand then often has no root (the left hand has it) or no fifth, or brings the root in late.
  var FORM2 = ["C", "F", "C", "G", "Am", "F", "C", "G"], figs = {}, below = 0, all = 0, first = { full: 0, noRoot: 0, no5: 0 }, lateRoot = 0;
  inC(FORM2.concat(["Bb", "Eb", "Ab", "Db", "F#", "B", "E", "A", "D"]), 34, { compRhythm: "ballRock" }).forEach(function (b){ var L = b.parts.comp.filter(function (e){ return e.hand === "L"; }), ch = BandHarmony.chordAt(b.chords, 0);
    assert.strictEqual(L.map(function (e){ return e.pos; }).join(), "0,1.5,2"); assert(L.every(function (e){ return e.midis[0] >= 45 && e.midis[e.midis.length - 1] < rhAt(b).midis[0]; }), "strict left hand " + JSON.stringify(L.map(function (e){ return e.midis; })));
    assert(L[0].midis[0] % 12 === ch.root && L[1].midis[0] % 12 === (ch.root + 7) % 12 && L[2].midis[0] % 12 === ch.root && rhAt(b).midis.length === 3); });
  inC(FORM2, 400, { variation: 1, compRhythm: "ballRock" }).forEach(function (b){ var ch = BandHarmony.chordAt(b.chords, 0), L = b.parts.comp.filter(function (e){ return e.hand === "L"; }), Rr = b.parts.comp.filter(function (e){ return e.hand !== "L"; });
    var k = L.map(function (e){ return e.pos; }).join(" "); figs[k] = (figs[k] || 0) + 1;
    L.forEach(function (e){ all++; if (e.midis[0] < 45) below++; assert(e.midis[0] >= 33 && e.midis.length <= 2 && e.midis[e.midis.length - 1] < 72, "left hand " + e.midis); });
    assert(L[0].pos === 0 && L[0].midis[0] % 12 === ch.root, "the root on 1");
    var f0 = Rr[0], pcs = f0.midis.map(function (m){ return (m - ch.root + 120) % 12; });
    assert(Rr.every(function (e){ return e.midis[0] >= 57 && e.midis[e.midis.length - 1] <= 86; }), "the right hand stays put");
    if (pcs.indexOf(0) < 0){ first.noRoot++; if (Rr[1] && Rr[1].midis.length === 1 && Rr[1].midis[0] % 12 === ch.root) lateRoot++; } else if (pcs.indexOf(7) < 0) first.no5++; else if (f0.midis.length === 3) first.full++; });
  assert(figs["0 1.5 2"] > 100 && figs["0 2 3"] > 30 && figs["0 2 3.5"] > 20 && figs["0"] > 20 && figs["0 1 2 3"] > 20, JSON.stringify(figs));
  assert(below / all < 0.12, "below A2: " + below + " of " + all);
  assert(first.noRoot > 150 && first.no5 > 70 && first.full > 20 && lateRoot > 40, JSON.stringify(first) + " late " + lateRoot);
  // quarter-note chords lose the root or the fifth as often, one way for the whole chord; the hymn keeps its four parts
  var two = 0, three = 0, q = {}; inC(FORM2, 240, { variation: 1, compRhythm: "quarters" }).forEach(function (b){ var c = BandHarmony.chordAt(b.chords, 0), r = b.parts.comp.filter(function (e){ return e.hand !== "L"; });
    var l = b.parts.comp.filter(function (e){ return e.hand === "L"; })[0], sh = l.midis.map(function (m){ return m - l.midis[0]; }).join("-"); q[sh] = (q[sh] || 0) + 1;
    r.forEach(function (e){ if (e.midis.length === 2){ two++; assert(e.midis.some(function (m){ return m % 12 === (c.root + c.third) % 12; }), "the third always stays"); } else three++; });
    assert(r.every(function (e){ return e.midis.join() === r[0].midis.join(); }), "one way for the whole chord"); });
  assert(two > 300 && three > 200 && q["0"] > 60 && q["0-12"] > 3 && q["0-7"] > 20, two + " / " + three + " " + JSON.stringify(q));
  assert(gen("hymn", { variation: 1 }, FORM2, 32).every(function (b){ return b.parts.comp.filter(function (e){ return e.hand !== "L"; }).every(function (e){ return e.midis.length === 3; }); })); })();
// the blend: the style's three patterns change from bar to bar; the sliders (opts.rhythmMix) set how much of each, and one alone is pure
function kinds(bars){ var seen = {}; bars.forEach(function (b){ var p = at({ parts: { comp: hand(b, true) } }, "comp"), k = /^0 1 2 3/.test(p) ? "rock" : /^0 1\.5 3$/.test(p) ? "sync" : "broken"; seen[k] = (seen[k] || 0) + 1; }); return seen; }
var ONEC = ["G", "G", "G", "G"], mixd = kinds(gen("pop", {}, ONEC, 96)); assert(mixd.rock > 12 && mixd.broken > 12 && mixd.sync > 12, JSON.stringify(mixd));
assert.deepStrictEqual(Object.keys(kinds(gen("pop", { rhythmMix: { ballRock: 1, ballBroken: 0, ballSync: 0 } }, ONEC, 48))), ["rock"]);
var lean = kinds(gen("pop", { rhythmMix: { ballRock: 0.9, ballBroken: 0.1, ballSync: 0 } }, ONEC, 400)); assert(lean.rock > 270 && lean.broken > 3 && !lean.sync, JSON.stringify(lean));
// one pattern is at home for four bars; a span may hold one bar of another (a callback second, a break third, foreshadowing last) and returns
(function (){ var all = gen("pop", {}, ONEC, 400), pure = 0, cb = 0, brk = 0, fore = 0, lastHome = null;
  for (var k = 0; k < all.length; k += 4){ var ks = [0, 1, 2, 3].map(function (j){ return Object.keys(kinds([all[k + j]]))[0]; }), home = ks[0], odd = ks.filter(function (x){ return x !== home; });
    assert(odd.length <= 2, "bars " + k + ": " + ks.join(" "));
    if (!odd.length) pure++; if (ks[1] !== home){ cb++; assert.strictEqual(ks[1], lastHome, "the callback is to the pattern just left"); } if (ks[2] !== home){ brk++; assert.strictEqual(ks[3], home, "a break returns"); } if (ks[3] !== home) fore++;
    if (ks[3] !== home && all[k + 4]) assert.strictEqual(Object.keys(kinds([all[k + 4]]))[0], ks[3], "what was foreshadowed arrives");
    lastHome = home; }
  assert(pure > 10 && cb > 5 && brk > 5 && fore > 8, [pure, cb, brk, fore].join(" ")); })();
// the sliders work for any rhythms: swing figures mixed with a pattern, weighted
var sw = gen("swing", { compRhythm: "charleston+four", rhythmMix: { charleston: 0, four: 1 } }, ONEC, 32); assert(sw.every(function (b){ return at(b, "comp") === "0 1 2 3"; }), "all four-to-the-bar");
sw = gen("swing", { compRhythm: "charleston+garland", rhythmMix: { charleston: 1, garland: 0 } }, ONEC, 32); assert(sw.every(function (b){ return at(b, "comp") === "0 1.5"; }), "only the Charleston");
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
assert(lf[3].parts.drums.some(function (e){ return e.piece === "snare" && e.pos !== 1 && e.pos !== 3 || /tom/.test(e.piece); }), "fill into the chorus");
// the crash into a chorus is likely, not certain; elsewhere it is earned: seldom after a small fill, seldom twice within four bars, likelier when the band is loud
(function (){ var into = 0, n = 60; for (var k = 0; k < n; k++) if (piece(gen("rock", { lift: [4, 5, 6, 7], push: false }, null, 8)[4], "crash") === "0") into++; assert(into > n * 0.45 && into < n, "crash into the chorus " + into + " of " + n);
  function crashes(v){ var c = 0, last = -9, close = 0; gen("rock", { variation: v, push: false }, null, 256).forEach(function (b, i){ if (piece(b, "crash") !== ""){ c++; if (i - last < 4) close++; last = i; } }); return [c, close]; }
  var quiet = crashes(0), full = BandMidi.generate(TuneChart.parse(abc("4/4", FORM)), { bars: 256, tempo: 110, opts: Object.assign(C.styleOpts("rock").opts, { push: false, variation: 1 }) });
  assert(quiet[0] >= 3 && quiet[0] < 40 && quiet[1] <= quiet[0] / 3, "crashes in 256 bars: " + quiet); })();
assert.strictEqual(piece(lf[5], "ride"), "0 0.5 1 1.5 2 2.5 3 3.5"); assert.strictEqual(piece(lf[5], "hatClosed"), ""); assert.strictEqual(piece(lf[9], "ride"), "");
function mean(b, part){ var l = b.parts[part].filter(function (e){ return part !== "drums" || e.piece === "snare"; }); return l.reduce(function (s, e){ return s + e.vel; }, 0) / l.length; }
["bass", "comp", "drums"].forEach(function (p){ assert(mean(lf[5], p) + mean(lf[6], p) > mean(lf[1], p) + mean(lf[2], p), p + " louder in the chorus"); });
assert.strictEqual(piece(gen("pop", { lift: [4, 5, 6, 7], timeFeel: "normal" })[5], "snare"), "1 3", "the ballad's cross-stick becomes the snare");
// in half time the chorus still falls on the chart's bars: snare on 3 there, cross-stick before
(function (){ var h = gen("pop", { lift: [4, 5, 6, 7] }); assert(/(^| )2( |$)/.test(piece(h[5], "snare")), "half-time chorus snare: " + piece(h[5], "snare")); assert.strictEqual(piece(h[1], "snare"), ""); assert.strictEqual(piece(h[1], "rim"), "2"); })();

// fills fit the style: a ballad or a strummed song never gets more than one beat of fill; rock fills use sixteenths
["pop", "strum", "folk", "train", "dance", "motown"].forEach(function (id){ gen(id, { variation: 1, timeFeel: "normal" }, null, 64).forEach(function (b, i){      // (in the band's own time: half time stretches the beat)
  var cym = b.parts.drums.filter(function (e){ return id !== "train" && id !== "folk" && /hat|ride/.test(e.piece) && e.piece !== "hatFoot"; });
  if (cym.length) assert(Math.max.apply(null, cym.map(function (e){ return e.pos; })) >= 2.5, id + " bar " + i + ": time kept to beat 3 at least"); }); });
assert(gen("rock", { variation: 1 }, null, 64).some(function (b){ return b.parts.drums.some(function (e){ return e.piece === "snare" && Math.abs(e.pos * 4 % 2 - 1) < 1e-6; }); }), "a sixteenth-note fill");

// every style in 4/4, 3/4, 2/4 and 5/4, with pushes and a chorus: everything inside the bar and in range
POP.forEach(function (st){ ["4/4", "3/4", "2/4", "5/4"].forEach(function (m){ ["piano", "guitar"].forEach(function (fam){
  gen(st.id, { push: true, lift: [4, 5, 6, 7], stops: [6] }, ["G", "D", "Em", "C", "G", "D", "C", "D"], 16, m, fam).forEach(function (b, i){
    ["bass", "comp", "drums"].forEach(function (p){ b.parts[p].forEach(function (e){ if (e.choke) return; assert(e.pos >= 0 && e.pos < b.beats && e.vel > 0.1 && e.vel <= 1, [st.id, m, fam, p, i, JSON.stringify(e)].join(" ")); }); });
    b.parts.bass.forEach(function (e){ assert(e.midi >= BandBass.LO && e.midi <= BandBass.HI); }); }); }); }); });
// ---- emo / pop-punk ----
(function (){ var so = C.styleOpts("emo"); assert.deepStrictEqual(so.instruments, ["ebass", "odguitar", "kit"]); assert.strictEqual(so.opts.comp + "|" + so.opts.compRhythm + "|" + so.opts.push, "guitar|strumPunk|true");
  var EM = ["Am", "F", "C", "G", "Am", "F", "C", "G"], b = gen("emo", { push: false, lift: [4, 5, 6, 7] }, EM, 8), vs = b[0].parts.comp, ch = b[5].parts.comp;
  // verse: eight muted downstrokes on a power chord (A2 E3 A3 as the chord arrives, then the low two strings)
  assert.strictEqual(at(b[0], "comp"), "0 0.5 1 1.5 2 2.5 3 3.5"); assert(vs.every(function (e){ return e.mute && e.strum === "down" && e.dur <= 0.3; }));
  assert.strictEqual(names(vs[0]), "A2 E3 A3"); assert.strictEqual(names(vs[1]), "A2 E3"); assert(!vs[0].arp && vs[1].arp);
  // chorus: open, down and up, nothing muted, still the power chord
  assert(ch.every(function (e){ return !e.mute; })); assert.strictEqual(ch.map(function (e){ return e.strum[0]; }).join(""), "dudududu"); assert.strictEqual(names(ch[0]), "F2 C3 F3"); assert(ch[0].dur > 0.4);
  BandHarmony.asPlayed(b, { style: "open", inst: "guitar" }).forEach(function (c){ assert(c.played && c.midis.length === 3, "the hand-off gets the power chord"); });
  // no chorus bars: the first half of the form is the verse, the second half open
  var nl = gen("emo", { push: false }, EM, 8); assert(nl[1].parts.comp.every(function (e){ return e.mute; }) && nl[6].parts.comp.every(function (e){ return !e.mute; }));
  // a pushed chord is the next bar's power chord; a pinned voicing is played as pinned; the piano keeps its triads
  var pu = gen("emo", { lift: [0, 1, 2, 3, 4, 5, 6, 7] }, EM, 8)[1].parts.comp.filter(function (e){ return e.pos === 3.5; })[0]; assert.strictEqual(names(pu), "C3 G3 C4");
  assert(gen("emo", { push: false }, EM, 8, null, "piano")[0].parts.comp.some(function (e){ return e.hand !== "L" && e.midis.length === 3 && e.midis[1] - e.midis[0] !== 7; }), "piano: triads");
  // half-time bars: the backbeat on 3 there and on 2 and 4 elsewhere; the bass at half speed; a lone bar (no pair) stays as it is
  var hf = gen("emo", { push: false, variation: 0, halfBars: [4, 5, 6, 7] }, EM, 8);
  assert.strictEqual(piece(hf[1], "snare"), "1 3"); assert.strictEqual(piece(hf[4], "snare"), "2"); assert.strictEqual(piece(hf[5], "snare"), "2"); assert.strictEqual(at(hf[1], "bass").split(" ").length, 8); assert.strictEqual(at(hf[4], "bass").split(" ").length, 4);
  assert.strictEqual(at(hf[4], "comp", function (e){ return e.strum; }).split(" ").length >= 8, true, "the guitar carries on");
  assert.strictEqual(piece(gen("emo", { push: false, variation: 0, halfBars: [4] }, EM, 8)[4], "snare"), "1 3");
  // with the whole band in double time, half-time bars come back to normal
  var db = gen("rock", { push: false, variation: 0, timeFeel: "double", halfBars: [2, 3] }, EM, 4); assert.strictEqual(piece(db[0], "snare"), "0.5 1.5 2.5 3.5"); assert.strictEqual(piece(db[2], "snare"), "1 3");
  // MIDI: the distorted guitar's program
  var mid = BandMidi.build(b, { tempo: 160 }), hasProg = false; for (var i = 0; i + 1 < mid.length; i++) if ((mid[i] & 0xF0) === 0xC0 && mid[i + 1] === 30) hasProg = true; assert(hasProg, "program 30");
})();

// ---- hymns and carols ----
assert.deepStrictEqual(C.styles.filter(function (s){ return s.group === "Hymns and carols"; }).map(function (s){ return s.id; }), ["waltz", "hymn", "carol"]);
// the hymn: no drums at all (not even on the last chord), every chord held to the next in four parts, the bass holding each root
var HY = ["G D", "Em C", "G", "D G"], hy = gen("hymn", {}, HY, 4);
hy.forEach(function (b, i){ assert.strictEqual(b.parts.drums.length, 0); var n = HY[i].split(" ").length, rh = b.parts.comp.filter(function (e){ return !e.arp; }), lh = b.parts.comp.filter(function (e){ return e.arp; });
  assert.strictEqual(rh.length, n); assert.strictEqual(lh.length, n); assert.strictEqual(b.parts.bass.length, n);
  rh.forEach(function (e, k){ assert.strictEqual(e.midis.length, 3); assert(Math.abs(e.pos + e.dur - (k + 1 < n ? rh[k + 1].pos : 4)) < 0.06, "held to the next chord"); assert(lh[k].midis[0] < e.midis[0] && lh[k].pos === e.pos); });
  b.parts.bass.forEach(function (e, k){ assert(Math.abs(e.pos + e.dur - (k + 1 < n ? b.parts.bass[k + 1].pos : 4)) < 0.06 && e.midi % 12 === lh[k].midis[0] % 12, "bass holds the root: " + JSON.stringify(e)); }); });
assert.deepStrictEqual(BandDrums.create({}).ending({ opts: { groove: "none" } }), []);
assert.strictEqual(gen("hymn", {}, ["G", "D", "C"], 3, "3/4")[0].parts.bass[0].dur < 3, true, "nothing held past the barline");
// the folk carol: strummed steel guitar, upright bass on 1 and 3 (a chord arriving in between gets its root), light time and no fills
var ca = gen("carol", { variation: 1 }, null, 32); assert.deepStrictEqual(C.styleOpts("carol").instruments, ["bass", "aguitar", "kit"]);
assert.strictEqual(bass(ca[0]), "0:G1 2:G1"); assert.strictEqual(bass(ca[7]), "0:C2 2:D2"); assert.strictEqual(ca[0].parts.comp.map(function (e){ return e.strum[0]; }).join(""), "dduddu");
assert.strictEqual(piece(ca[0], "rim"), "1 3"); ca.forEach(function (b){ assert(!b.parts.drums.some(function (e){ return /tom|snare|crash/.test(e.piece); }), "no fills, snare or crash"); });
assert.strictEqual(at(gen("carol", {}, ["G", "D", "C"], 3, "3/4")[0], "bass"), "0");
// boom-chick strength: 0.5 is the pattern as written; subtle is long, soft and nearly drumless; polka power is short, hard and adds the cymbal
function boom(w){ return gen("folk", w == null ? {} : { boom: w })[0]; }
var mid = boom(0.5), soft = boom(0), hard = boom(1), plain = boom(null);
assert.strictEqual(piece(mid, "kick") + "|" + piece(mid, "snare"), piece(plain, "kick") + "|" + piece(plain, "snare")); assert(Math.abs(mid.parts.bass[0].dur - plain.parts.bass[0].dur) < 0.2);
assert.strictEqual(piece(soft, "snare"), ""); assert.strictEqual(piece(soft, "kick"), "0"); assert.strictEqual(piece(hard, "snare"), "1 3"); assert.strictEqual(piece(hard, "kick"), "0 2 3.5"); assert.strictEqual(piece(hard, "hatClosed"), "0 1 2 3");
[["bass", null], ["comp", null], ["drums", "kick"]].forEach(function (p){ var m = function (b){ var l = b.parts[p[0]].filter(function (e){ return !p[1] || (e.piece === p[1] && e.pos === 0); }); return l.reduce(function (s, e){ return s + e.vel; }, 0) / l.length; };
  assert(m(soft) < m(mid) - 0.05 && m(mid) < m(hard) - 0.05, p[0] + " gets harder: " + [m(soft), m(mid), m(hard)].map(r2)); });
assert(soft.parts.bass[0].dur > 1.5 && hard.parts.bass[0].dur < 0.6 && soft.parts.comp[0].dur > hard.parts.comp[0].dur);
assert.strictEqual(piece(gen("rock", { boom: 0 })[0], "snare"), "1 3", "only the boom-chick parts listen to it");
// ---- notation: the piano on a grand staff, the bass clef holding what the left hand plays ----
require(path.join(R, "apps/shared/band/notation.js"));
(function (){ function lines(abcText, v){ return abcText.split("\n").filter(function (l){ return l.indexOf("[V:" + v + "]") === 0; }).join(" "); }
  var nb = BandNotation.toAbc(gen("pop", { compRhythm: "ballRock" }, ["G", "D", "Em", "C"], 4), { key: "G" });
  assert(/%%score \{K L\} B/.test(nb) && /V:L clef=bass/.test(nb));
  assert.strictEqual(lines(nb, "K").split("|")[0].trim(), '[V:K] "G"[B,DG]2 B,2 [DG]2 B,2', "the right hand, low B included, on the treble staff");
  assert.strictEqual(lines(nb, "L").split("|")[0].trim(), "[V:L] G,3D, G,4", "the left hand's figure on the bass staff");
  // a voicing with no separate left hand is shared out: drop 2 one and three, rootless two and two, a close triad all in the right
  var d2 = BandNotation.toAbc(gen("swing", { compRhythm: "charleston", voicing: "drop2" }, ["G"], 1), { key: "G" }); assert(/\[V:K\] "G"\[DB\]3/.test(d2) && /\[V:L\] G,3G,/.test(d2), d2);
  var rl = BandNotation.toAbc(gen("swing", { compRhythm: "charleston", voicing: "rootless" }, ["G"], 1), { key: "G" }); assert(/\[V:K\] "G"\[B,D\]3/.test(rl) && /\[V:L\] \[E,A,\]3/.test(rl), rl);
  var tri = BandNotation.toAbc(gen("folk", { voicing: "standard" }, ["G"], 1, null, "piano"), { key: "G" }); assert(/\[V:L\] z8/.test(tri) && /\[V:K\] "G"z2 \[B,DG\]/.test(tri), tri);
  // a guitar keeps its single staff
  var gtr = BandNotation.toAbc(gen("strum", {}, ["G"], 1), { key: "G" }); assert(/%%score K B/.test(gtr) && !/V:L/.test(gtr)); })();
console.log("POP OK");
