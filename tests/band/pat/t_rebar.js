// BandRebar: a chord chart re-written for another meter.   node tests/band/pat/t_rebar.js   (prints "REBAR OK")
var path = require("path"), assert = require("assert"), R = path.join(__dirname, "../../..");
["apps/shared/voicings.js", "apps/shared/band/harmony.js", "apps/shared/tune-chart.js"].forEach(function (f){ require(path.join(R, f)); });
var RB = require(path.join(R, "apps/shared/band/rebar.js")), IDS = ["4/4", "3/4", "6/8", "12/8"];
// the chords of a chart as the band reads them: "bar:beat:symbol", through the real parser
function seen(abc){ var out = []; BandHarmony.buildForm(TuneChart.parse(abc), 0).forEach(function (b, i){ b.chords.forEach(function (c){ out.push(i + ":" + c.pos + ":" + (c.chord.sym || c.chord.name || c.chord.symbol || c.chord.root)); }); }); return out; }
function head(m, L){ return "X:1\nT:Test tune\nC:Somebody\nM:" + m + "\nL:" + L + "\nQ:1/4=120\nK:F\n"; }
var four = head("4/4", "1/4") + 'P:A\n"^stop""F7"z4 | "Bb7"z2 "C7"z2 | "Dm7"z "G7"z "C7"z "F"z |\n%%style swing\nP:B\n|: "F7"z4 | "Bb7"z2 !fermata!"C7"z2 :|\n[1 "F"z4 | [2 "Gm7"z2 "C7"z2 |]\n';
var T = {};

// every pair of the four meters: the header, and that nothing but the music's rests changed
IDS.forEach(function (from) { IDS.forEach(function (to) {
  var m = from.split("/"), L = m[1] === "8" ? "1/8" : "1/4", per = m[1] === "8" ? 3 : 1, nb = (+m[0]) / per;
  var n = +m[0], h = Math.ceil(nb / 2) * per, two = function (x, y){ return '"' + x + '"z' + h + ' "' + y + '"z' + (n - h); };
  var one = '"F7"z' + n + ' | ' + two("Bb7", "C7") + ' | ' + two("Gm7", "C7") + ' |]\n';
  var abc = head(from, L) + one, r = RB.rebar(abc, to), t = to.split("/");
  assert(r.ok, from + " -> " + to + ": " + r.reason);
  assert(new RegExp("\nM:" + to + "\n").test(r.abc) && new RegExp("\nL:1/" + t[1] + "\n").test(r.abc), "header " + from + ">" + to);
  assert(/T:Test tune\nC:Somebody\n/.test(r.abc) && /\nQ:1\/4=120\nK:F\n/.test(r.abc), "other header fields kept");
  var s = seen(r.abc); assert.strictEqual(s.length, 5, from + ">" + to + " keeps all the chords: " + s);
  assert(s[0].indexOf("0:0:") === 0 && s[1].indexOf("1:0:") === 0, "bar starts stay on beat 1");
  var chk = TuneChart.check(TuneChart.parse(r.abc)); assert.strictEqual(chk.length, 0, from + ">" + to + " every bar adds up: " + JSON.stringify(chk));
  if (from === to) assert.strictEqual(r.abc, abc, "same meter: unchanged");
}); });

// shares of the bar: a chord on the second half of 4/4 lands on the second half of the others
var half = head("4/4", "1/4") + '"Bb7"z2 "C7"z2 |]\n';
assert(RB.rebar(half, "12/8").abc.indexOf('"Bb7"z6 "C7"z6 |]') > 0, RB.rebar(half, "12/8").abc);
assert(RB.rebar(half, "6/8").abc.indexOf('"Bb7"z3 "C7"z3 |]') > 0);
assert(RB.rebar(half, "3/4").abc.indexOf('"Bb7"z2 "C7"z |]') > 0, "beat 3 of 4 -> beat 3 of 3/4 (the waltz layout of the presets)");
assert.deepStrictEqual(seen(RB.rebar(half, "3/4").abc), ["0:0:Bb7", "0:2:C7"]);
// and back again
IDS.forEach(function (m) { var back = RB.rebar(RB.rebar(half, m).abc, "4/4"); assert(back.ok); assert.deepStrictEqual(seen(back.abc), seen(half), "round trip through " + m); });
// a chord on beat 2 of 4 goes to the second beat of 12/8 and keeps order; beat 4 of 4 to beat 4 of 12/8
var q = head("4/4", "1/4") + '"C"z "D"z "E"z "F"z |]\n';
assert.deepStrictEqual(seen(RB.rebar(q, "12/8").abc).map(function (x){ return x.split(":")[1]; }), ["0", "1", "2", "3"]);
// three chords in 3/4 (one each) to 12/8: shares 0, 1/3, 2/3 -> beats 0, 1, 3 (rounded); still distinct
var w3 = head("3/4", "1/4") + '"C"z "D"z "E"z |]\n';
assert.deepStrictEqual(seen(RB.rebar(w3, "12/8").abc).map(function (x){ return +x.split(":")[1]; }), [0, 1, 3]);
// three chords in 4/4 to 6/8: only two beats -> refused, with the numbers
var r3 = RB.rebar(head("4/4", "1/4") + '"C"z2 "D"z "E"z |]\n', "6/8"); assert(!r3.ok && r3.why === "crowd" && r3.reason === "Bar 1 has 3 chords, and 6/8 has only 2 beats to put them on.", r3.reason);
var r4 = RB.rebar(four, "6/8"); assert(!r4.ok && r4.why === "crowd" && /^Bar 3 has 4 chords/.test(r4.reason), r4.reason);
// two chords that are close together are moved by a beat, not dropped: beats 2 and 3 of 4 -> 6/8
var close = RB.rebar(head("4/4", "1/4") + '"C"z "D"z "E"z2 |]\n', "3/4"); assert(close.ok);
var c2 = RB.rebar(head("4/4", "1/4") + 'z "D"z "E"z2 |]\n', "6/8"); assert(c2.ok); assert.deepStrictEqual(seen(c2.abc).map(function (x){ return +x.split(":")[1]; }), [0, 1], c2.abc);

// everything else survives: P: lines, %%style, bar lines, repeats, endings, annotations, decorations
var f6 = RB.rebar(four, "6/8"); assert(!f6.ok, "the four-chord bar does not fit 6/8 but 12/8 has 4 beats");
var four12 = RB.rebar(four, "12/8"); assert(four12.ok, four12.reason);
var strip = function (s){ return s.replace(/z\d*/g, "z").replace(/^M:.*$/m, "M:").replace(/^L:.*$/m, "L:"); };
assert.strictEqual(strip(four12.abc), strip(four), "only M:, L: and the rests differ\n" + four12.abc);
assert(four12.abc.indexOf('"^stop""F7"z12 |') > 0 && four12.abc.indexOf("!fermata!") > 0 && /\n\[1 "F"z12 \| \[2 /.test(four12.abc) && /:\|\n/.test(four12.abc) && /\|: /.test(four12.abc));
assert(/\nP:A\n/.test(four12.abc) && /\n%%style swing\nP:B\n/.test(four12.abc));
assert.deepStrictEqual(TuneChart.parse(four12.abc).bars.map(function (b){ return b.ending + "/" + b.left + "/" + b.right + "/" + b.section + "/" + b.stop; }),
                       TuneChart.parse(four).bars.map(function (b){ return b.ending + "/" + b.left + "/" + b.right + "/" + b.section + "/" + b.stop; }), "repeats, endings, sections and stops read the same");
assert.deepStrictEqual(TuneChart.parse(four12.abc).bars.map(function (b){ return b.srcLine; }), TuneChart.parse(four).bars.map(function (b){ return b.srcLine; }), "line breaks");
// the page's own stops and fills (TuneChart.setMarks) survive, and still sit on the same bars
var marked = TuneChart.setMarks(head("4/4", "1/4") + '"F7"z4 | "Bb7"z2 "C7"z2 | "F7"z4 |]\n', { stops: [1], fills: { 2: "large" } });
IDS.forEach(function (to) { var rr = RB.rebar(marked, to); assert(rr.ok); var p = TuneChart.parse(rr.abc);
  assert.deepStrictEqual([p.bars[0].stop, p.bars[1].stop, p.bars[2].fill, p.bars[0].fill], [undefined, true, "large", undefined], to); });
// N.C., Z, a bar of one chord with no rests, slash chords, annotations with letters
var odd = head("4/4", "1/4") + '"N.C."z2 "G/B"z2 | Z | "C" | "Am7"z2 "^Solo""D7"z2 |]\n', ro = RB.rebar(odd, "3/4"); assert(ro.ok, ro.reason);
assert(ro.abc.indexOf('"N.C."z2 "G/B"z |') > 0 && ro.abc.indexOf("| Z |") > 0 && ro.abc.indexOf('| "C"z3 |') > 0 && ro.abc.indexOf('"Am7"z2 "^Solo""D7"z |]') > 0, ro.abc);
// a first chord that is not on beat 1 gets a rest before it
var late = RB.rebar(head("4/4", "1/4") + 'z2 "C7"z2 |]\n', "12/8"); assert(late.ok && late.abc.indexOf('z6 "C7"z6 |]') > 0, late.abc);
// comments, lyrics lines, CRLF-ish and trailing text
var cm = RB.rebar(head("4/4", "1/4") + '"C"z4 | % turnaround\n"G"z4 |]\nw: la la\n', "3/4"); assert(cm.ok && /\| % turnaround\n"G"z3 \|\]\nw: la la\n$/.test(cm.abc) && !/z4/.test(cm.abc), cm.abc);
// no L: line gets one (the ABC default for 4/4 is 1/8); no M: line is 4/4
var bare = RB.rebar('X:1\nT:t\nK:C\n"C"z8 | "G"z4 "F"z4 |]\n', "6/8"); assert(bare.ok && /M:6\/8\nL:1\/8\nK:C\n"C"z6 \| "G"z3 "F"z3 \|\]/.test(bare.abc), bare.abc);

// an odd source meter: 5/4 (Take Five) and others
var tf = head("5/4", "1/4") + '"Ebm"z3 "Bbm7"z2 | "Ebm"z3 "Bbm7"z2 |]\n';
[["4/4", [0, 2]], ["3/4", [0, 2]], ["6/8", [0, 1]], ["12/8", [0, 2]]].forEach(function (x){ var rr = RB.rebar(tf, x[0]); assert(rr.ok, rr.reason);
  assert.deepStrictEqual(seen(rr.abc).slice(0, 2).map(function (s){ return +s.split(":")[1]; }), x[1], "5/4 -> " + x[0] + ": " + rr.abc); assert.strictEqual(rr.fromBeats, 5); });
assert.strictEqual(RB.rebar(head("7/8", "1/8") + '"C"z4 "G"z3 |]\n', "4/4").ok, true);
assert.strictEqual(RB.rebar(head("2/2", "1/2") + '"C"z "G"z |]\n', "3/4").abc.indexOf('"C"z2 "G"z |]') > 0, true, "cut time: two beats, the second half");
var cc = RB.rebar("X:1\nM:C\nL:1/4\nK:C\n\"C\"z4 |]\n", "3/4"); assert(cc.ok && /M:3\/4/.test(cc.abc) && cc.from === "4/4");
// 9/8 is three dotted-quarter beats
var nine = RB.rebar(head("9/8", "1/8") + '"C"z3 "G"z3 "F"z3 |]\n', "3/4"); assert(nine.ok && nine.fromBeats === 3 && nine.abc.indexOf('"C"z "G"z "F"z |]') > 0, nine.abc);

// pick-up and short bars are scaled to whole beats (at least one); bars longer than a bar are refused
var pick = RB.rebar(head("4/4", "1/4") + '"G7"z |\n"C"z4 | "F"z4 |]\n', "12/8"); assert(pick.ok && pick.abc.indexOf('"G7"z3 |') > 0, pick.abc);
var pick2 = RB.rebar(head("4/4", "1/4") + '"G7"z2 |\n"C"z4 |]\n', "3/4"); assert(pick2.ok && pick2.abc.indexOf('"G7"z2 |') > 0, "half a bar of 4/4 is two beats of 3/4: " + pick2.abc);
var rest = RB.rebar(head("4/4", "1/4") + 'z |\n"C"z4 |]\n', "6/8"); assert(rest.ok && rest.abc.indexOf("\nz3 |") > 0, rest.abc);
var longer = RB.rebar(head("4/4", "1/4") + '"C"z4 | "F"z2 "G"z4 |]\n', "3/4"); assert(!longer.ok && longer.reason === "Bar 2 is longer than a bar of 4/4, so its chords cannot be placed in 3/4.", longer.reason);

// refusals: melody, a change of meter inside, and nothing changes
var mel = head("4/4", "1/4") + '"C"z4 | "F" c2 d2 |]\n';
var cm1 = RB.check(mel), rm = RB.rebar(mel, "3/4");
assert(!cm1.ok && cm1.why === "melody" && cm1.reason === "Bar 2 has melody notes, and re-barring only works on chord symbols over rests.", cm1.reason); assert.deepStrictEqual(rm, cm1);
assert(!RB.check(head("4/4", "1/4") + '"C"z2 [CEG]2 |]\n').ok, "a chord of notes is melody");
var inl = head("4/4", "1/4") + '"C"z4 | [M:3/4] "F"z3 |]\n', ri = RB.check(inl);
assert(!ri.ok && ri.why === "change" && ri.reason === "This tune changes meter inside ([M:3/4] in bar 2), so it has no single meter to change.", ri.reason);
var two = RB.check(head("4/4", "1/4") + '"C"z4 |\nM:3/4\n"F"z3 |]\n');
assert(!two.ok && two.why === "change" && two.reason === "This tune changes meter inside (a second M: line after bar 1), so it has no single meter to change.", two.reason);
assert(!RB.check(head("4/4", "1/4") + 'L:1/8\n"C"z8 |]\n').ok);
assert(RB.check("X:1\nM:none\nK:C\n\"C\"z4|]\n").why === "meter" && RB.check("X:1\nM:4/4\n\"C\"z4|]\n").why === "key");
assert.strictEqual(RB.rebar(four, "7/4").ok, false);
assert(RB.check(four).ok && RB.check(four).beats === 4 && RB.check(tf).beats === 5);
// ---- pace: the chords twice as fast / half as fast in the same meter ----
(function(){
  const H = "X:1\nT:t\nM:4/4\nL:1/4\nK:F\n", TC = global.TuneChart || null;
  const blues = H + '"F7"z4 | "Bb7"z4 | "F7"z4 | "F7"z4 |\n"Bb7"z4 | "Bb7"z4 | "F7"z4 | "^stop""Am7"z2 "D7"z2 |\n"Gm7"z4 | "C7"z4 | "F7"z2 "D7"z2 | "Gm7"z2 "C7"z2 |]';
  const body = r => r.abc.split("\n").slice(5).join("\n");
  const fast = RB.pace(blues, 2), slow = RB.pace(blues, 0.5);
  assert(fast.ok && slow.ok && fast.bars === 6 && slow.bars === 24);
  assert.strictEqual(body(fast), '"F7"z2 "Bb7"z2 | "F7"z4 | "Bb7"z4 | "F7"z2 "^stop""Am7"z "D7"z |\n"Gm7"z2 "C7"z2 | "F7"z "D7"z "Gm7"z "C7"z |]');
  assert.strictEqual(RB.pace(slow.abc, 2).abc, blues, "slower then faster comes back");
  assert(/M:4\/4\nL:1\/4/.test(fast.abc) && /M:4\/4\nL:1\/4/.test(slow.abc), "the meter stays");
  assert.strictEqual(body(RB.pace(H + '"F7"z2 "C7"z2 | "Bb7"z4 |', 0.5)), '"F7"z4 | "C7"z4 | "Bb7"z4 | "Bb7"z4 |');
  assert.strictEqual(body(RB.pace(H.replace("4/4", "3/4") + '"F7"z3 | "Bb7"z3 |', 2)), '"F7"z2 "Bb7"z |', "3/4: the second chord on beat 3");
  assert.strictEqual(RB.pace("X:1\nT:t\nM:6/8\nL:1/8\nK:F\n" + '"F7"z6 | "Bb7"z6 |', 2).abc.split("\n")[5], '"F7"z3 "Bb7"z3 |');
  assert.strictEqual(body(RB.pace(H + '|: "F7"z4 | "C7"z4 :|', 2)), '|: "F7"z2 "C7"z2 :|', "repeats stay");
  assert.strictEqual(RB.pace(H + '"F7"z4 | "Bb7"z4 | "C7"z4 |', 2).why, "odd");
  assert.strictEqual(RB.pace(H + '"F7"z4 :|1 "C7"z4 |', 2).why, "odd");
  assert.strictEqual(RB.pace(H + '"F7"z "G7"z "A7"z "B7"z | "C7"z4 |', 2).why, "crowd");
  assert.strictEqual(RB.pace(H + '"F7"A2 z2 | "C7"z4 |', 2).why, "melody");
})();
console.log("REBAR OK");
