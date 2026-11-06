// MLT book data: every step has a page, every activity id resolves and is unique, every tune id is in the tune
// collection, every player set exists. node tests/mlt/mlt-data.test.js  (NEG=1 breaks a link on purpose: must fail)
const fs = require("fs"), vm = require("vm"), path = require("path");
const R = path.join(__dirname, "../..");
const ctx = { console }; ctx.globalThis = ctx; vm.createContext(ctx);
const load = (f) => vm.runInContext(fs.readFileSync(path.join(R, f), "utf8"), ctx, { filename: f });
["apps/shared/abc-core.js", "apps/shared/abc-events.js", "apps/patterns/pattern-set.js", "apps/rhythms/rhythm-pattern-object.js",
 "apps/patterns/audiation.js", "apps/shared/mlt/activities.js", "apps/shared/mlt/books/mullen.js", "apps/shared/mlt/books/dmti.js", "apps/shared/mlt/books/jri-sax.js", "apps/shared/mlt/books/jri-lsa.js", "apps/shared/mlt/books/bluestine.js", "apps/shared/mlt/books/shouldice.js", "apps/shared/mlt/books/rasmussen.js"].forEach(load);
vm.runInContext("globalThis.__tunes = (function(){" + fs.readFileSync(path.join(R, "apps/tunes/tunes-object.js"), "utf8") + ";return tunesObject})()", ctx);
const ids = new Set(); for (const k in ctx.__tunes) for (const m of String(ctx.__tunes[k]).matchAll(/^%%id\s+(\S+)/gm)) ids.add(m[1]);
const acts = ctx.MLTActivities, books = ctx.MLTBooks;
if (process.env.NEG === "2") delete books.rasmussen.parts[0].units[0].steps[3].transcript;
if (process.env.NEG) books.mullen.parts[2].units[0].steps[1].activities.push("no-such-activity");
let bad = 0; const fail = (m) => { bad++; console.log("FAIL", m); };
const aid = new Set();
for (const a of acts) {
  if (aid.has(a.id)) fail("duplicate activity " + a.id); aid.add(a.id);
  if (!a.name || !a.how || !a.kind || !(a.refs || []).length) fail("activity incomplete " + a.id);
  (a.refs || []).forEach((r) => { if (!books[r.book] && !["recorder", "lange-harmony", "lange-harmony-again"].includes(r.book)) fail(a.id + " unknown book " + r.book); if (!r.p) fail(a.id + " ref without page"); });
  (a.tunes || []).forEach((t) => { if (!ids.has(t)) fail(a.id + " tune not in collection: " + t); });
}
let steps = 0;
for (const b of Object.values(books)) for (const p of b.parts) for (const u of p.units) {
  if (!u.page) fail(u.id + " no page");
  for (const s of u.steps || []) {
    steps++;
    if (!s.page || !s.teacher || !s.title) fail(s.id + " incomplete");
    if (b.id === "bluestine" && u.id !== "guests" && !/^https:\/\/ericmbluestine\.substack\.com\/p\//.test(s.href || "")) fail(s.id + " no post link");
    if (b.id === "bluestine" && u.id === "guests" && !/^https:\/\/(audiation-in-the-wild\.simplecast\.com|keystomusiclearning\.buzzsprout\.com)\//.test(s.href || "")) fail(s.id + " no episode link");
    if (b.id === "rasmussen" && !/^https:\/\/(audiation-in-the-wild\.simplecast\.com|teachmusictokids\.com|www\.youtube\.com)\//.test(s.href || "")) fail(s.id + " no episode link");
    if (b.id === "rasmussen" && u.id !== "courses" && s.transcript !== false && !/^https:\/\//.test(s.transcript || "")) fail(s.id + " transcript must be a url or false");
    if (b.id === "bluestine" && u.id === "guests" && s.transcript !== false && !/^https:\/\//.test(s.transcript || "")) fail(s.id + " transcript must be a url or false");
    if (b.id === "shouldice" && !/^https:\/\/everydaymusicality\.com\//.test(s.href || "")) fail(s.id + " no post link");
    (s.xref || []).forEach((r) => { const bk = books[r.book]; const hit = bk && bk.parts.some((pp) => pp.units.some((uu) => (r.step ? (uu.steps || []).some((x) => x.id === r.step) : uu.id === r.unit))); if (!hit) fail(s.id + " xref not found: " + r.book + " " + (r.step || r.unit)); });
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
{ const eps = books.rasmussen.parts[0].units.reduce((a, u) => a.concat(u.steps), []);
  if (eps.length !== 108) fail("rasmussen: " + eps.length + " episodes, want 108");
  if (new Set(eps.map((e) => e.id)).size !== eps.length) fail("rasmussen: duplicate episode ids");
  if (!eps.every((e) => "transcript" in e)) fail("rasmussen: an episode without a transcript field");
  if (eps.some((e, i) => i && e.page < eps[i - 1].page)) fail("rasmussen: episodes not oldest first");
  const g = books.bluestine.parts.reduce((a, p) => a.concat(p.units), []).filter((u) => u.id === "guests")[0];
  if (!g || g.steps.length !== 3) fail("bluestine: guests unit missing"); }
console.log(acts.length + " activities, " + steps + " steps; " + (bad ? bad + " failures" : "all OK"));
process.exit(bad ? 1 : 0);
