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
console.log(`ok: ${Rec.list.length} recordings, ${n} named in the books, all found`);
