// Every recording a book step names is in the catalogue (apps/shared/mlt/recordings.js), and the catalogue is sane.
// node tests/mlt/recordings.test.js   (NEG=1 adds a bad id and must fail)
const path = require("path"), assert = require("assert");
const R = path.join(__dirname, "../..");
global.window = global;
["apps/shared/mlt/recordings.js", "apps/shared/mlt/activities.js", "apps/shared/mlt/books/mullen.js", "apps/shared/mlt/books/jri-sax.js", "apps/shared/mlt/books/dmti.js"].forEach(f => require(path.join(R, f)));
const Rec = global.MLTRecordings;
let n = 0, bad = [];
assert(Rec.list.length > 1000, "catalogue looks empty");
assert(!Rec.list.some(r => /gordon test/i.test(r.r2)), "the Gordon test must not be catalogued");
assert.strictEqual(new Set(Rec.list.map(r => r.id)).size, Rec.list.length, "duplicate ids");
Object.values(global.MLTBooks).forEach(b => b.parts.forEach(p => p.units.forEach(u => (u.steps || []).forEach(s => {
  const ids = (s.recordings || []).concat(process.env.NEG && s.id === "u1-first-whole" ? ["no-such-track"] : []);
  ids.forEach(x => { n++; if (!Rec.byId(x.id || x)) bad.push(b.id + "/" + s.id + ": " + (x.id || x)); });
}))));
assert(n > 20, "too few recordings named in the books: " + n);
assert.deepStrictEqual(bad, [], "unknown recording ids:\n" + bad.join("\n"));
global.MLT_REC_BASE = "https://x.example/";
assert.strictEqual(Rec.url(Rec.byId("jri1-1-01")), "https://x.example/mlt/jri1/01%20Singing%20Major%20Duple%20a-Melody%20b-Ba.mp3");
// tune links, kinds and fields
const fs = require("fs");
const tunesSrc = fs.readFileSync(path.join(R, "apps/tunes/tunes-object.js"), "utf8");
const tuneIds = new Set([...tunesSrc.matchAll(/^%%id\s+(\S+)/gm)].map(m => m[1]));
const badTune = Rec.list.flatMap(r => (r.tune || []).filter(t => !tuneIds.has(t)).map(t => r.id + " -> " + t));
if (process.env.NEG) badTune.push("neg -> no-such-tune");
assert.deepStrictEqual(badTune, [], "recordings linked to tunes not in the collection:\n" + badTune.join("\n"));
const chew = Rec.forTune("chew-chew-chew").map(r => r.id).sort();
assert.deepStrictEqual(chew, ["mullen-chew-chew-chew-c-no-vocals", "mullen-chew-chew-chew-c-with-vocals", "mullen-chew-chew-chew-d-no-vocals", "mullen-chew-chew-chew-d-with-vocals"]);
assert.strictEqual(Rec.byId("mullen-chew-chew-chew-d-no-vocals").key, "D");
Rec.list.forEach(r => { if (r.kind) assert(Rec.KINDS[r.kind], "unknown kind " + r.kind + " on " + r.id); });
// every timing file belongs to a recording, is a song file or bar map, and the recording says it has one
const tdir = path.join(R, "apps/shared/mlt/timings");
(fs.existsSync(tdir) ? fs.readdirSync(tdir) : []).filter(f => f.endsWith(".json")).forEach(f => {
  const r = Rec.byId(f.replace(/\.json$/, "")); assert(r, "timing file for no recording: " + f);
  assert(r.timing, "rerun node scripts/mlt-recordings.mjs: " + f + " is not in recordings.js");
  const d = JSON.parse(fs.readFileSync(path.join(tdir, f), "utf8")); assert((d.barMap && d.barMap.bars) || d.bars || d.stamps, f + " is not a song file");
});
const meta = JSON.parse(fs.readFileSync(path.join(R, "apps/shared/mlt/recordings-meta.json"), "utf8"));
Object.keys(meta).forEach(id => assert(Rec.byId(id), "recordings-meta.json names no recording " + id));
console.log(`ok: ${Rec.list.filter(r => r.tune).length} linked to tunes`);
console.log(`ok: ${Rec.list.length} recordings, ${n} named in the books, all found`);
