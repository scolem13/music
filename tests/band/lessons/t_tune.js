// Blues in the Closet as the lessons hold it (apps/shared/lessons/tunes.js) and in the tune collection.   node tests/band/lessons/t_tune.js
var fs = require("fs"), path = require("path"), assert = require("assert"), R = path.join(__dirname, "../../..");
global.window = global;
["apps/tune-assessment/abc-tune.js", "apps/shared/abc-transpose.js", "apps/shared/lessons/tunes.js"].forEach(function (f){ require(path.join(R, f)); });
var T = BluesTunes.closet, m12 = function (n){ return ((n % 12) + 12) % 12; };
// the melody, bar by bar: the riff three times, the lowered note only in bars 5 and 6
var bars = BluesTunes.melody(T.abc, T.pickup); while (bars.length < 12) bars.push([]);
assert.strictEqual(bars.length, 12); assert.strictEqual(T.chart.split("|").length, 12);
var pcs = bars.map(function (b){ return b.map(function (n){ return m12(n.midi - 65); }).join(" "); });
assert.strictEqual(pcs[0], "0 4 0 5 4 0", "bar 1: R 3 R 4 3 R"); assert.strictEqual(pcs[4], "4 0 5 4 0".replace(/4/g, "3"), "bar 5: the 3rd lowered (the tied F belongs to bar 4)");
assert.deepStrictEqual(bars.map(function (b, i){ return b.some(function (n){ return m12(n.midi - 65) === 3; }) ? i + 1 : 0; }).filter(Boolean), [5, 6], "A flat only in bars 5 and 6");
assert.deepStrictEqual(bars[0][0], { pos: 0, dur: 1, midi: 65 }, "the pickup tied into bar 1 is played from beat 1");
bars.forEach(function (b, i){ b.forEach(function (n){ assert(n.pos >= 0 && n.pos < 4 && n.dur > 0, "bar " + i + " " + JSON.stringify(n)); }); });
assert.deepStrictEqual(bars[3].map(function (n){ return n.pos + ":" + n.dur; }), ["0.5:2.5", "3.5:1.5"], "bar 4: the long note, then the note that arrives early for bar 5");
// every key: the same intervals, a playable range, the words still one to a note
"C Db D Eb E F Gb G Ab A Bb B".split(" ").forEach(function (k){
  var abc = BluesTunes.inKey(T, k, { words: true }), b2 = BluesTunes.melody(abc, T.pickup), flat = [].concat.apply([], b2), ref = [].concat.apply([], bars);
  assert.strictEqual(flat.length, ref.length, k); var d = flat[0].midi - ref[0].midi;
  flat.forEach(function (n, i){ assert.strictEqual(n.midi - ref[i].midi, d, k + " note " + i); assert(n.midi >= 58 && n.midi <= 84, k + " range " + n.midi); });
  assert(new RegExp("\\nK:" + k + "\\n").test(abc), k + " key line");
  var lines = abc.split("\n"), music = lines.filter(function (l){ return /\|/.test(l) && !/^w:/.test(l); }), words = lines.filter(function (l){ return /^w:/.test(l); });
  assert.strictEqual(words.length, 3, k); music.forEach(function (l, i){
    var notes = (l.replace(/"[^"]*"/g, "").match(/[_=^]*[A-Ga-g][,']*/g) || []).length, syl = words[i].replace(/^w:/, "").split(/[\s|]+/).filter(Boolean).length;
    assert.strictEqual(syl, notes, k + " line " + (i + 1) + ": a word (or *) for every note"); });
});
// the collection the Tune Assessment reads
var book = new Function(fs.readFileSync(path.join(R, "apps/tunes/tunes-object.js"), "utf8") + "; return tunesObject;")(), st = book.Standards;
assert.strictEqual((st.match(/^T:Blues in the Closet$/gm) || []).length, 1, "once in Standards");
var one = st.slice(st.lastIndexOf("X:", st.indexOf("T:Blues in the Closet"))).split(/\n\s*\n/)[0], mel = AbcTune.melodyNotes(one);
assert.strictEqual(mel.tempoQ, 132); assert.deepStrictEqual(mel.notes.map(function (n){ return n.midi; }), AbcTune.melodyNotes(T.abc).notes.map(function (n){ return n.midi; }), "the same notes as the lessons'");
var xs = st.match(/^X:\d+/gm); assert.strictEqual(new Set(xs).size, xs.length, "no X: number used twice in Standards");
console.log("BLUES IN THE CLOSET OK");
