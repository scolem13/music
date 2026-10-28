// MLT book data: every step has a page, every activity id resolves and is unique, every tune id is in the tune
// collection, every player set exists. node tests/mlt/mlt-data.test.js  (NEG=1 breaks a link on purpose: must fail)
const fs = require("fs"), vm = require("vm"), path = require("path");
const R = path.join(__dirname, "../..");
const ctx = { console }; ctx.globalThis = ctx; vm.createContext(ctx);
const load = (f) => vm.runInContext(fs.readFileSync(path.join(R, f), "utf8"), ctx, { filename: f });
["apps/shared/abc-core.js", "apps/shared/abc-events.js", "apps/patterns/pattern-set.js", "apps/rhythms/rhythm-pattern-object.js",
 "apps/patterns/audiation.js", "apps/shared/mlt/activities.js", "apps/shared/mlt/books/mullen.js", "apps/shared/mlt/books/dmti.js", "apps/shared/mlt/books/jri-sax.js"].forEach(load);
vm.runInContext("globalThis.__tunes = (function(){" + fs.readFileSync(path.join(R, "apps/tunes/tunes-object.js"), "utf8") + ";return tunesObject})()", ctx);
const ids = new Set(); for (const k in ctx.__tunes) for (const m of String(ctx.__tunes[k]).matchAll(/^%%id\s+(\S+)/gm)) ids.add(m[1]);
const acts = ctx.MLTActivities, books = ctx.MLTBooks;
if (process.env.NEG) books.mullen.parts[2].units[0].steps[1].activities.push("no-such-activity");
let bad = 0; const fail = (m) => { bad++; console.log("FAIL", m); };
const aid = new Set();
for (const a of acts) {
  if (aid.has(a.id)) fail("duplicate activity " + a.id); aid.add(a.id);
  if (!a.name || !a.how || !a.kind || !(a.refs || []).length) fail("activity incomplete " + a.id);
  (a.refs || []).forEach((r) => { if (!books[r.book] && !["recorder"].includes(r.book)) fail(a.id + " unknown book " + r.book); if (!r.p) fail(a.id + " ref without page"); });
  (a.tunes || []).forEach((t) => { if (!ids.has(t)) fail(a.id + " tune not in collection: " + t); });
}
let steps = 0;
for (const b of Object.values(books)) for (const p of b.parts) for (const u of p.units) {
  if (!u.page) fail(u.id + " no page");
  for (const s of u.steps || []) {
    steps++;
    if (!s.page || !s.teacher || !s.title) fail(s.id + " incomplete");
    (s.activities || []).forEach((id) => { if (!aid.has(id)) fail(s.id + " unknown activity " + id); });
    const st = s.student || {};
    if (st.type === "tunes") st.tunes.forEach((t) => { if (t.id && !ids.has(t.id)) fail(s.id + " tune not in collection: " + t.id); });
    if (st.type === "tonal-echo") { const set = ctx.Audiation.tonalSet(st.set); if (set.patterns.length < 2) fail(s.id + " empty tonal set"); }
    if (st.type === "sax") Object.keys(st.notes).forEach((k) => { if (!(k in ctx.JRISax.KEYMAP)) fail(s.id + " unknown recorder key " + k); });
    if (st.type === "read") st.sets.forEach((k) => { if (!vm.runInContext("rhythmPatternObject", ctx)[k]) fail(s.id + " no rhythm set " + k); });
    if (st.type === "read-tonal") { const set = ctx.Audiation.tonalSet(st.set); if (!set.patterns.filter((x) => !st.fn || x.fn === st.fn).length) fail(s.id + " no tonal patterns"); }
    if (st.type === "rhythm-echo") { const set = ctx.Audiation.rhythmSet(st.set); if (set.patterns.length < 2) fail(s.id + " empty rhythm set"); }
  }
}
console.log(acts.length + " activities, " + steps + " steps; " + (bad ? bad + " failures" : "all OK"));
process.exit(bad ? 1 : 0);
