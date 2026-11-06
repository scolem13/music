// justin-gen.mjs: writes the JustinGuitar files from his public sitemaps. LINKS AND TITLES ONLY: nothing of any lesson is copied.
//   node scripts/guitar/justin-gen.mjs [--online]        (default reads the cached sitemaps; --online fetches them first)
// Inputs:  https://www.justinguitar.com/video-sitemap.xml (titles + addresses; cached as scripts/guitar/.cache/video-sitemap.xml, git-ignored)
//          scripts/guitar/justin-lessons.txt  (Beginner Course: "<code>|<summary in our words>|<site link keys>", one lesson a line)
//          scripts/guitar/justin-theory.txt   (Practical Music Theory lessons, same format)
//          the site's own lists, for matching: works-data.js (title + composer words), apps/tunes/tunes-object.js (T: title, %%id),
//          apps/shared/data/songs.js (Words & Chords), apps/shared/data/billboard/index.json (title + artist).
// Outputs: apps/shared/guitar/justin-course.js     the book for mlt-walk.js (page lessons/justinguitar.qmd); link keys are the L table below
//          apps/shared/works/uses/justin.js        every song lesson (all of them), one row each, for the Tune Directory
//          apps/shared/works/justin-link.js        only the region between "justin-index:begin/end": site song id -> lesson links, read by JustinLink
// The summaries in the two .txt files are written by hand from lesson titles (his pages are blocked to scripts: Cloudflare 403). Add a lesson to
// them and rerun. Matching is normalised title (brackets and parentheses dropped, "&" = "and") plus, where the site's list has an artist
// (works-data composer, Billboard artist), one artist word of 4+ letters; tune-collection and Words & Chords songs have no artist, so those matches are TITLE ONLY.
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..") + "/";
const D = R + "scripts/guitar/";
const CACHE = D + ".cache/video-sitemap.xml";
if (process.argv.includes("--online") || !fs.existsSync(CACHE)) {
  const r = await fetch("https://www.justinguitar.com/video-sitemap.xml", { headers: { "user-agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error("sitemap " + r.status);
  fs.mkdirSync(D + ".cache", { recursive: true }); fs.writeFileSync(CACHE, await r.text());
}
const vs = [];
for (const m of fs.readFileSync(CACHE, "utf8").matchAll(/<url>([\s\S]*?)<\/url>/g)) { const loc = (m[1].match(/<loc>([^<]*)/) || [])[1], t = (m[1].match(/<video:title>([^<]*)/) || [])[1]; if (loc) vs.push({ loc, t: t || "" }); }
const dec = (s) => s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/\s+$/, "");
const byCode = {};
for (const o of vs) { const m = o.loc.match(/\/guitar-lessons\/(.*-((?:b1|b2|mt))-(\d+))$/); if (m) byCode[m[2] + "-" + m[3]] = { slug: m[1], title: dec(o.t) }; }
const L = {
  tune: ["/tools/guitar-tuning.html", "Guitar Tuning tool"], tune2: ["/lessons/guitar-tuning-methods.html", "Tuning methods"],
  setup: ["/tools/guitar-setup-check.html", "Guitar setup check"], gear: ["/lessons/gear-guitar.html", "Parts of the guitar"],
  chords: ["/lessons/chord-shapes-guitar.html", "Chord shapes on guitar"], chordlib: ["/tools/chord-library.html", "Chord library"],
  pick: ["/lessons/guitar-picking.html", "Guitar picking"], session: ["/practice/session.html", "Practice session"],
  chunk: ["/tools/chunk-practice.html", "Chunk Practice"], rock: ["/lessons/first-rock-song.html", "First Rock Song"],
  pop: ["/lessons/pop-changes-guitar.html", "Pop changes on guitar"], loops: ["/lessons/four-chord-loops.html", "Four-chord loops"],
  rhythm: ["/theory/rhythm-basics.html", "Rhythm basics"], tap: ["/tools/tap-along.html", "Tap Along"],
  backing: ["/tools/backing-track.html", "Backing Track"], capo: ["/lessons/tuning-systems.html", "Tuning systems"],
  tab: ["/lessons/guitar-picking.html", "Guitar picking (tab examples)"], notation: ["/tools/notation.html", "Notation"],
  notes: ["/theory/pitch-basics.html", "Pitch basics"], dynamics: ["/lessons/elements-dynamics.html", "Elements: dynamics"],
  ear: ["/practice/patterns-by-ear.html", "Patterns by Ear"], theory: ["/theory/index.html", "Theory"],
  songs: ["/practice/tune-directory.html", "Tune Directory"], scales: ["/tools/scales.html", "Scales"],
  scalesx: ["/tools/scale-patterns.html", "Scale Patterns"], pitch: ["/theory/pitch-basics.html", "Pitch basics"],
  fifths: ["/tools/circle-of-fifths.html", "Circle of fifths"], fretboard: ["/lessons/chord-shapes-guitar.html", "Chord shapes on guitar"],
  major: ["/theory/major-scales.html", "Major scales"], minor: ["/theory/minor-scales.html", "Minor scales"],
  intervals: ["/theory/intervals.html", "Intervals"], power: ["/lessons/first-rock-song.html", "First Rock Song"],
  triads: ["/theory/triads.html", "Triads"], inversions: ["/lessons/inversions.html", "Inversions"],
  analysis: ["/theory/chord-analysis.html", "Chord Analysis"], roman: ["/theory/roman-numerals.html", "Roman numerals"],
  prog: ["/theory/progressions.html", "Progressions"], borrowed: ["/lessons/borrowed-chords.html", "Borrowed chords"],
  form: ["/theory/pop-forms.html", "Pop forms"], sevenths: ["/theory/seventh-chords.html", "Seventh chords"],
  jazz: ["/theory/jazz-theory.html", "Jazz theory"], penta: ["/lessons/blues-improv.html", "Blues improvisation"],
  blues: ["/lessons/blues-guitar.html", "Blues guitar"], modes: ["/theory/modes-three-ways.html", "Modes three ways"],
  chordshapes: ["/lessons/chord-shapes-guitar.html", "Chord shapes on guitar"]
};
const EXTRA = { "b1-101": ["tune2"], "b1-208": ["rock", "pop"], "b1-701": ["chordlib"], "b1-404": ["tap", "backing"], "b1-403": ["tap", "backing"], "b1-110": ["chunk"], "b1-605": ["notes", "tune"], "b1-405": ["pick"], "b1-503": ["backing"],
  "b2-808": ["pick"], "b2-910": ["roman", "prog"], "b2-905": ["scales", "major"], "b2-803": ["penta"], "b1-708": ["ear"], "b1-709": ["theory"], "b1-710": ["session"] };
const parse = (f) => fs.readFileSync(D + f, "utf8").trim().split("\n").map((l) => { const [code, sum, ks] = l.split("|"); return { code, sum, keys: (ks || "").split(",").filter(Boolean) }; });
const links = (keys) => { const seen = new Set(), out = []; for (const k of keys) { const v = L[k]; if (!v) throw new Error("link key " + k); if (!seen.has(v[0])) { seen.add(v[0]); out.push({ href: v[0], label: v[1] }); } } return out; };
const BASE = "https://www.justinguitar.com/guitar-lessons/";
const q = (s) => JSON.stringify(s);
function step(it) {
  const d = byCode[it.code]; if (!d) throw new Error("no lesson " + it.code);
  const keys = it.keys.concat(EXTRA[it.code] || []);
  const lk = links(keys);
  return "          { id: " + q(it.code) + ", title: " + q(d.title) + ", page: " + q("lesson " + it.code.split("-")[1]) + ", phase: \"lesson\", href: S + " + q(d.slug) + ", hrefLabel: \"Open on JustinGuitar\", site: \"JustinGuitar\",\n" +
    "            teacher: " + q(it.sum) + (lk.length ? ",\n            siteLinks: " + JSON.stringify(lk) : "") + " }";
}
const units = [];
const b = parse("justin-lessons.txt");
for (let m = 1; m <= 9; m++) {
  const items = b.filter((x) => Math.floor(parseInt(x.code.split("-")[1], 10) / 100) === m).sort((a, c) => a.code.localeCompare(c.code));
  units.push({ id: "m" + m, title: "Module " + m + (m <= 7 ? " (Grade 1)" : ""), page: "module " + m, items });
}
const th = parse("justin-theory.txt");
const TU = [[0, "notes", "Notes, octaves and the twelve pitches"], [2, "guitar-basics", "Reading tab and chord boxes, first chord vocabulary"], [3, "scales-keys", "Major scales, key signatures and power chords"], [4, "triads-keys", "Triads, chords in a key, the fretboard and the circle of fifths"], [5, "intervals-sevenths", "Intervals, seventh chords, sus chords, pentatonic and minor scales, harmonic analysis"], [6, "shapes-1", "Chord shapes (E and A), extensions"], [7, "shapes-2", "Chord shapes (D, C, G), sixth chords and modes"]];
const tunits = TU.map(([h, id, title]) => ({ id: "t-" + id, title, page: "lessons mt-" + (h === 0 ? "000x" : h + "xx"), items: th.filter((x) => { const n = parseInt(x.code.split("-")[1], 10); return h === 0 ? n < 100 || n === 13 : Math.floor(n / 100) === h && n !== 13; }) }));
const out = (u) => "        { id: " + q(u.id) + ", title: " + q(u.title) + ", page: " + q(u.page) + ", steps: [\n" + u.items.map(step).join(",\n") + " ] }";
const total = [...units, ...tunits].reduce((a, u) => a + u.items.length, 0);
const js = `// guitar/justin-course.js: JustinGuitar (justinguitar.com) as a book for mlt-walk.js: the Beginner Course (modules 1-9, Grade 1 = modules 1-7) and the Practical Music Theory
// lessons, lesson by lesson, with links to the matching pages and tools on this site. Format in mlt-walk.js's header; extra step fields used here: href / hrefLabel (the lesson on
// JustinGuitar) and siteLinks: [{ href, label }] ("On this site"). LINKS ONLY: no lesson text, chord charts, tabs, transcriptions or lyrics are copied; every summary
// is in our words, written from the lesson's TITLE, because justinguitar.com answers scripts with a Cloudflare challenge (HTTP 403) and the lesson pages could not be read.
// What was read: the site's sitemap.xml and video-sitemap.xml (titles and addresses only), Nov 2026. So the summaries say what a title promises, not what the lesson contains: unverified.
// Lesson codes are the suffix of the address (b1-1xx = beginner module 1 ... b1-7xx = module 7; b2-8xx, b2-9xx = modules 8 and 9; mt-NNN = Practical Music Theory).
// "Grade 1 = modules 1-7" is from the title "How to PASS Grade 1" (b1-710); where Grades 2 and 3 begin was not confirmed. Whether a lesson's video needs a free account or a membership
// was not checked; the links go to the public pages.
(function (global) {
  "use strict";
  var B = global.MLTBooks = global.MLTBooks || {};
  var S = ${q(BASE)};
  B.justin = {
    id: "justin", title: "JustinGuitar: Beginner Course and Practical Music Theory", author: "Justin Sandercoe (JustinGuitar)", year: 2026,
    note: "The lessons of JustinGuitar's Beginner Course (modules 1-9) and Practical Music Theory course, lesson by lesson: a link to each, a one-line summary in the site's own words, and the pages and tools on this site that cover the same ground. The lessons are not reproduced; open each at justinguitar.com.",
    parts: [
      { id: "p1", title: "Beginner Course, modules 1-9", page: "lessons b1-, b2-", units: [
${units.map(out).join(",\n")}
      ] },
      { id: "p2", title: "Practical Music Theory", page: "lessons mt-", units: [
${tunits.map(out).join(",\n")}
      ] }
    ]
  };
  // ${total} lesson steps
})(window);
`;
fs.writeFileSync(R + "apps/shared/guitar/justin-course.js", js);
console.log(total, "steps");
// ===== song lessons: every /songs/ page in the sitemap =====
const W = {}; new Function("window", fs.readFileSync(R + "apps/shared/works/works-data.js", "utf8").replace(/window\.SONG_INDEX[^\n]*/, ""))(W);
const norm = (s) => (s || "").toLowerCase().replace(/&amp;/g, "and").replace(/&/g, "and").replace(/\[.*?\]|\(.*?\)/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const artistWords = (a) => norm(a).split(" ").filter((x) => x.length > 3 && x !== "band" && x !== "with");
const addTo = (m, k, v) => { (m[k] = m[k] || []).push(v); };
const lists = { works: {}, tunes: {}, songs: {}, billboard: {} };
for (const [k, v] of Object.entries(W.WORKS)) if (!/^Jump Right In/.test(v.composer || "")) addTo(lists.works, norm(v.title), { id: k, composer: norm(v.composer) });
const tobj = new Function(fs.readFileSync(R + "apps/tunes/tunes-object.js", "utf8") + ";return tunesObject")();
for (const abc of Object.values(tobj).flatMap((c) => String(c).split(/^(?=X:)/m))) { const id = (/^%%id\s+(\S+)/m.exec(abc) || [])[1], t = (/^T:\s*(.+)$/m.exec(abc) || [])[1]; if (id && t) addTo(lists.tunes, norm(t), { id }); }
const SW = {}; new Function("window", fs.readFileSync(R + "apps/shared/data/songs.js", "utf8"))(SW);
for (const [id, s] of Object.entries(SW.SONGS.songs)) addTo(lists.songs, norm(s.title), { id });
for (const g of JSON.parse(fs.readFileSync(R + "apps/shared/data/billboard/index.json", "utf8"))) addTo(lists.billboard, norm(g.title), { id: g.id, artist: norm(g.artist) });
const slug = (s) => norm(s).replace(/ /g, "-");
const songs = vs.filter((o) => o.loc.includes("/songs/")).map((o) => {
  const t = dec(o.t).replace(/[’‘]/g, "'"), m = t.match(/^(.*) by (.*)$/), c = o.loc.match(/-([a-z]+)-(\d+)$/);
  return m && c ? { title: m[1], artist: m[2], fam: c[1], num: c[2], url: o.loc } : null;
}).filter(Boolean);
const famName = { bs: "Beginner Song Course", sg: "song lesson (sg series)", st: "song lesson (st series)", sb: "song lesson (sb series)", rf: "song lesson (rf series)", cs: "song lesson (cs series)", js: "song lesson (js series)", us: "song lesson (us series)", bc: "song lesson (bc series)" };
const items = [], index = {}, count = { lessons: songs.length, works: 0, tunes: 0, songs: 0, billboard: 0 }, seen = { works: new Set(), tunes: new Set(), songs: new Set(), billboard: new Set() };
const link = (key, it) => { (index[key] = index[key] || []).push([it.label, it.url]); };
for (const s of songs) {
  const base = s.title.replace(/\s*\[.*?\]/g, "").trim(), nt = norm(base), aw = artistWords(s.artist);
  const hasArtist = (txt) => aw.some((x) => txt.includes(x));
  const mw = (lists.works[nt] || []).filter((x) => hasArtist(x.composer));
  const mb = (lists.billboard[nt] || []).filter((x) => hasArtist(x.artist) || norm(s.artist) === x.artist);
  const mt = lists.tunes[nt] || [], ms = lists.songs[nt] || [];
  const stage = s.fam === "bs" ? Math.floor(parseInt(s.num, 10) / 100) : null;
  const it = { work: mw.length ? mw[0].id : "justin-" + slug(base + " " + s.artist), title: base, composer: s.artist,
    concept: s.fam === "bs" ? "beginner song, stage " + stage + " of the Beginner Song Course (stage read off the lesson code; unverified)" : "guitar " + famName[s.fam],
    note: "JustinGuitar has a video lesson for this song" + (/\[(.*?)\]/.test(s.title) ? " (" + s.title.match(/\[(.*?)\]/)[1] + " version)" : "") + ", linked here. The page could not be read by script, so its chords, strumming and tab are not recorded here; open it for them.",
    url: s.url, where: s.title + " (" + famName[s.fam] + " " + s.fam + "-" + s.num + ")" };
  if (mb.length) it.billboard = mb[0].id;
  items.push(it); it.label = s.title + " by " + s.artist;
  mw.forEach((x) => { count.works++; seen.works.add(x.id); link("work:" + x.id, it); });
  mt.forEach((x) => { count.tunes++; seen.tunes.add(x.id); link("tune:" + x.id, it); });
  ms.forEach((x) => { count.songs++; seen.songs.add(x.id); link("song:" + x.id, it); });
  mb.forEach((x) => { count.billboard++; seen.billboard.add(x.id); link("billboard:" + x.id, it); });
}
// the six beginner-course riff lessons
const RIFF = [["b1-207", "Peter Gunn Theme", "Henry Mancini (unverified; the lesson title gives only the theme)", "single-note riff in beginner module 2"], ["b1-309", "Seven Nation Army", "The White Stripes", "riff in beginner module 3"], ["b1-406", "Sunshine Of Your Love", "Cream", "riff used to practise tab reading, module 4"], ["b1-506", "Come As You Are", "Nirvana", "riff in beginner module 5"], ["b2-808", "Wish You Were Here", "Pink Floyd", "intro riff, beginner module 8"], ["b2-908", "Californication", "Red Hot Chili Peppers", "riff in beginner module 9"]];
for (const [c, t, a, w] of RIFF) {
  const d = byCode[c], it = { work: "justin-" + slug(t + " " + a), title: t, composer: a, concept: "beginner riff: " + w, note: "A riff lesson in JustinGuitar's Beginner Course, used there to practise a particular skill; linked, with no tab or notes copied.", url: BASE + d.slug, where: d.title + " (" + c + ")" };
  const sm = songs.find((x) => norm(x.title.replace(/\[.*?\]/g, "")) === norm(t));
  if (sm) it.work = "justin-" + slug(sm.title.replace(/\s*\[.*?\]/g, "") + " " + sm.artist);
  items.push(it);
}
const uses = `// Concept "uses": every song JustinGuitar (justinguitar.com) has a lesson for. LINKS ONLY: song, artist, link and code series; nothing of the lessons (chords, tab, lyrics) is copied.
// Written by scripts/guitar/justin-gen.mjs from his video sitemap (titles and addresses), Nov 2026; rerun it, never edit by hand. His lesson pages answer scripts with HTTP 403 (Cloudflare), so the grade /
// chords / skill tags he puts on each song could not be read: the concept is the code series only. "Beginner Song Course" stage = the hundreds digit of the bs- code (bs-304 = stage 3), inferred and unverified.
// ${songs.length} song lessons (bs ${songs.filter((x) => x.fam === "bs").length}) + 6 beginner-course riff lessons. A song already in works-data.js (title + an artist word) uses that work id; the others get a "justin-" id of their own.
// item.billboard = the McGill Billboard id when title + artist match. Matches with the tune collection and Words & Chords (title only) are in works/justin-link.js.
(function (global) {
  "use strict";
  (global.WORK_USES = global.WORK_USES || []).push({ src: "justin", label: "JustinGuitar", url: "https://www.justinguitar.com", items: [
${items.map((i) => "    " + JSON.stringify(Object.assign({}, i, { label: undefined }))).join(",\n")}
  ] });
})(window);
`;
fs.writeFileSync(R + "apps/shared/works/uses/justin.js", uses);
// the index region of justin-link.js: only entries for songs the site has
const LJ = R + "apps/shared/works/justin-link.js";
const keys = Object.keys(index).sort();
const region = "/* justin-index:begin (written by scripts/guitar/justin-gen.mjs) */\nvar INDEX = {\n" + keys.map((k) => "  " + JSON.stringify(k) + ": " + JSON.stringify(index[k])).join(",\n") + "\n};\n/* justin-index:end */";
if (fs.existsSync(LJ)) {
  const cur = fs.readFileSync(LJ, "utf8");
  fs.writeFileSync(LJ, cur.replace(/\/\* justin-index:begin[\s\S]*?justin-index:end \*\//, () => region));
}
console.log(`${songs.length} song lessons; matches (lessons / distinct site entries): works ${count.works}/${seen.works.size}, tunes (title only) ${count.tunes}/${seen.tunes.size}, Words & Chords (title only) ${count.songs}/${seen.songs.size}, Billboard ${count.billboard}/${seen.billboard.size}`);
console.log("index keys:", keys.length);
