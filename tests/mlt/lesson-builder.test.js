// MLT lesson planner (apps/shared/mlt/lesson-builder.js): plans fill the class time in Whole-Part-Whole order from any unit
// of every book, lesson numbers rotate the LSA and the activities, alternatives exist.  node tests/mlt/lesson-builder.test.js
const path = require("path"), assert = require("assert"), R = path.join(__dirname, "../..");
global.window = global;
["apps/shared/mlt/activities.js", "apps/shared/mlt/books/mullen.js", "apps/shared/mlt/books/dmti.js", "apps/shared/mlt/books/jri-sax.js"].forEach(f => require(path.join(R, f)));
const L = require(path.join(R, "apps/shared/mlt/lesson-builder.js"));
let n = 0;
for (const book of ["mullen", "dmti1", "dmti2", "dmti3", "jri-sax"]) for (const u of L.units(book)) for (const lesson of [1, 2]) for (const minutes of [30, 45, 60]) {
  const p = L.build({ book, unit: u.id, lesson, minutes, lsa: 5 });
  const tot = p.items.reduce((t, x) => t + x.minutes, 0), kinds = p.items.map(x => x.kind);
  assert.strictEqual(tot, minutes, `${book} ${u.id} lesson ${lesson}: ${tot} of ${minutes} minutes`);
  assert.strictEqual(kinds[0], "first", u.id); assert.strictEqual(kinds[kinds.length - 1], "close", u.id);
  assert.ok(p.items.every(x => x.minutes > 0 && x.title), u.id + " every item has a title and time");
  const order = { first: 0, lsa: 1, second: 2, bridge: 3, close: 4 };
  assert.ok(kinds.every((k, i) => i === 0 || order[k] >= order[kinds[i - 1]]), u.id + " Whole-Part-Whole order: " + kinds.join(","));
  n++;
}
// lesson 2 of Mullen Unit 1 takes the next LSA (the tonal one after the rhythm one) and other activities
const a = L.build({ book: "mullen", unit: "u1", lesson: 1, minutes: 45 }), b = L.build({ book: "mullen", unit: "u1", lesson: 2, minutes: 45 });
assert.notStrictEqual(a.items.find(x => x.kind === "lsa").step, b.items.find(x => x.kind === "lsa").step, "lesson 2 has the next LSA");
assert.ok(L.alternatives(a, a.items.findIndex(x => x.kind === "second")).length > 3, "activities can be swapped");
console.log("LESSON BUILDER OK (" + n + " plans)");
