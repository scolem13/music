// Import the classical themes into apps/themes/themes-data.js.  Usage: node scripts/import-themes.mjs
// Source: scripts/theme-sources/mtd/<id>.abc, the Musical Theme Dataset's engraved scores converted by
// scripts/convert-mtd.py (ids are the EDM numbers; -1 / -2 for themes MTD splits). A file in scripts/theme-fixes/
// with the same name wins. (The older midi2abc set in ../classical-music-themes is no longer used: unreliable.)
// Each theme: id, composer (last, first), title, recording link, ABC body, and values the page sorts on.
// --rough: the whole old set instead, as scripts/clean-rough-themes.mjs leaves it in scripts/theme-sources/rough/ (MTD's
// version where MTD has the theme, else the old midi2abc one with beams and accidentals tidied), into
// apps/themes/themes-rough-data.js, for the unlisted reference page tools/classical-themes-rough.qmd.
// --set bimmuda: the Pop Themes instead (BiMMuDa's section melodies, scripts/convert-bimmuda.py -> scripts/theme-sources/bimmuda/<ID>.abc)
// into apps/themes/pop-themes-data.js (window.POP_THEMES): each section's row of the dataset's bimmuda_per_melody_full.csv as sort values
// (BPM, tonality, MIC, pitch STD, MIS, onset density, nPVI, RIC), the song's Spotify link, genres from
// scripts/bimmuda-genres.py (scripts/theme-sources/bimmuda-genres.json; bimmuda-genre-fixes.json wins), and chords from
// scripts/bimmuda-salami.mjs (scripts/theme-sources/bimmuda-chords.json) where a SALAMI / Billboard analysis fits.
// --set pop (alias: --set bimmuda): the same page with three collections in one file: BiMMuDa (above), CoCoPops (scripts/convert-cocopops.py
// -> scripts/theme-sources/cocopops/<id>.abc: Billboard songs 1958-1991 with a melodic transcription, chords from the source) and RS200
// (scripts/theme-sources/rs200/<id>.abc: the Rolling Stone 200). Each theme has `set` ("BiMMuDa" / "CoCoPops" / "RS200"); the chord symbols
// inside a CoCoPops / RS200 file's body are taken out into the same `chords` side list BiMMuDa's analysed sections use (offsets into the
// chord-free body). A song found in more than one collection (same title, an artist word in common, years within 2) gets `also` (the
// other collections) and `grp` (one key for the group, the page's ?song=); `salami` is the song's McGill Billboard id (Timestamp Notes
// ?salami=<id>): its own for CoCoPops, the analysis BiMMuDa's chords came from, else a CoCoPops twin's. Genres: scripts/theme-sources/
// bimmuda-genres.json for all three (keys year_position, cc_<McGill id>, rs_<rank>), bimmuda-genre-fixes.json wins.
// A tied note counts once, and (3:2:2 style tuplets are read, in this set only (the classical output is unchanged).
import fs from "node:fs";
import path from "node:path";

const ROUGH = process.argv.includes("--rough");
const SET = (process.argv.indexOf("--set") > 0 ? process.argv[process.argv.indexOf("--set") + 1] : "") || "";
const POP = SET === "bimmuda" || SET === "pop";
if (SET && !POP) { console.error("unknown --set " + SET + " (pop, or bimmuda: the same)"); process.exit(1); }
const POPSETS = [["BiMMuDa", "scripts/theme-sources/bimmuda"], ["CoCoPops", "scripts/theme-sources/cocopops"], ["RS200", "scripts/theme-sources/rs200"]];
const BIM = process.env.BIMMUDA_DIR || path.join(process.env.HOME || "", "Downloads/BiMMuDa/BiMMuDa");
function csv(file) {   // a small CSV reader: quoted fields, "" for a quote
  const rows = []; let row = [], f = "", q = false; const t = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  for (let i = 0; i < t.length; i++) { const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n") { row.push(f); rows.push(row); row = []; f = ""; } else if (c !== "\r") f += c; }
  if (f || row.length) { row.push(f); rows.push(row); }
  const h = rows.shift(); return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(h.map((k, i) => [k, r[i]])));
}
const src = path.resolve(POP ? "scripts/theme-sources/bimmuda" : ROUGH ? "scripts/theme-sources/rough" : "scripts/theme-sources/mtd");
const out = path.resolve(POP ? "apps/themes/pop-themes-data.js" : ROUGH ? "apps/themes/themes-rough-data.js" : "apps/themes/themes-data.js");
const jsonOr = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {});
const MEL = {}, SONG = {}, GENRES = POP ? jsonOr("scripts/theme-sources/bimmuda-genres.json") : {}, GFIX = POP ? jsonOr("scripts/theme-sources/bimmuda-genre-fixes.json") : {};
const CHORDS = POP ? jsonOr("scripts/theme-sources/bimmuda-chords.json") : {};
if (POP) {
  for (const r of csv(path.join(BIM, "bimmuda_metadata/bimmuda_per_melody_full.csv"))) MEL[r.ID] = r;
  for (const r of csv(path.join(BIM, "bimmuda_metadata/bimmuda_per_song_full.csv"))) SONG[r.Year + "_" + (/^\d+$/.test(r.Position) ? r.Position.padStart(2, "0") : r.Position.padStart(3, "0"))] = r;
}
// catalogue numbers and dates (scripts/theme-works.py); keyed by the EDM number, so a split theme's parts share them
const WORKS = fs.existsSync("scripts/theme-sources/theme-works.json") ? JSON.parse(fs.readFileSync("scripts/theme-sources/theme-works.json", "utf8")) : {};
// a second source of years for the themes theme-works.py found none for: composer + catalogue number on Wikidata
// (python3 -I scripts/print-books/work-years.py --themes); theme-works.json wins where both have one
const YEARS2 = fs.existsSync("scripts/theme-sources/theme-years-wikidata.json") ? JSON.parse(fs.readFileSync("scripts/theme-sources/theme-years-wikidata.json", "utf8")) : {};
const ids = POP ? [] : fs.readdirSync(src).filter((f) => f.endsWith(".abc")).map((f) => f.slice(0, -4)).sort();
const SETOF = {}, DIROF = {};   // pop: id -> collection, id -> its directory
if (POP) for (const [nm, dir] of POPSETS) for (const f of fs.readdirSync(path.resolve(dir)).filter((x) => x.endsWith(".abc")).map((x) => x.slice(0, -4)).sort()) { ids.push(f); SETOF[f] = nm; DIROF[f] = path.resolve(dir); }
const SONGJSON = { CoCoPops: jsonOr("scripts/theme-sources/cocopops-songs.json"), RS200: jsonOr("scripts/theme-sources/rs200-songs.json") };
const normT = (x) => x.toLowerCase().replace(/\(.*?\)|\[.*?\]/g, " ").replace(/&/g, " and ").replace(/[’']/g, "").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean).join(" ");
const artW = (x) => new Set(normT(x).split(" ").filter((w) => !["the", "and", "feat", "featuring", "with", "his", "her", "orchestra", "band", "comets", "1", "a"].includes(w)));
const SHARPS = "FCGDAEB", ORDER = ["Cb","Gb","Db","Ab","Eb","Bb","F","C","G","D","A","E","B","F#","C#"];
const MINOR = ["Abm","Ebm","Bbm","Fm","Cm","Gm","Dm","Am","Em","Bm","F#m","C#m","G#m","D#m","A#m"];
// The source never writes a minor key (K:C for A minor; MTD's scores say "major" for nearly all). When the title gives no key (see below), guess from the
// melody against the signature's DO: a logistic model over how often each degree sounds and the first and last notes,
// fitted on the 3,231 themes whose title names the key (about 80% right on ones held out; "always major" is 63%).
const W = [-0.58, -1.06, -2.13, 0.9, 0.13, -5.81, 3.32, 2.39, 1.58, 0.05, -0.4, 0.29, -0.01, 1.99, -0.03, 0.73, -0.23];
function guessMinor(ps, doPc) {
  if (!ps.length) return false;
  const d = ps.map((p) => ((p - doPc) % 12 + 12) % 12), n = d.length, share = (k) => d.filter((v) => v === k).length / n;
  const l = d[n - 1], f = d[0];
  const x = [1, share(0), share(2), share(4), share(5), share(7), share(8), share(9), share(11),
    +(l === 9), +(l === 0), +(l === 4), +(l === 7), +(f === 9), +(f === 0), +(f === 4), +(f === 7)];
  return x.reduce((s, v, i) => s + v * W[i], 0) > 0;
}
const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function keySig(k) {
  const f = ORDER.indexOf(k) - 7; // fifths, -7..7
  const sig = {};
  if (f > 0) for (const l of SHARPS.slice(0, f)) sig[l] = 1;
  if (f < 0) for (const l of [...SHARPS].reverse().slice(0, -f)) sig[l] = -1;
  return { fifths: f, sig };
}

// Notes of the tune body: pitch in semitones (accidentals last to the barline) and length in units of L.
function analyse(body, sig, pop) {
  body = body.replace(/\{[^}]*\}/g, "")   // grace notes take no time
    .replace(/\[[A-Za-z]:[^\]]*\]/g, "");    // inline fields: [K:bass] clef changes, [M:2/4]
  const notes = [];
  let bars = 0, acc = {}, sinceBar = false;
  const re = /(\^\^|\^|__|_|=)?([A-Ga-gz])([,']*)(\d*)(\/*)(\d*)(-?)|(\|)|"[^"]*"|![^!]*!|\((\d)(?::(\d))?(?::(\d))?/g;
  let m, tup = 0, tupF = 1, tiedFrom = null;
  while ((m = re.exec(body))) {
    if (m[9]) { tup = +m[9]; tupF = tup === 2 ? 1.5 : tup === 4 ? 0.75 : tup === 3 || tup === 6 ? 2 / 3 : (tup % 2 ? (tup - 1) : tup) / tup;
      if (pop && m[10]) { tupF = +m[10] / tup; tup = +(m[11] || tup); } continue; }   // (n: the next n notes in the time of 2 / 3
    if (m[8]) { if (sinceBar) bars++; sinceBar = false; acc = {}; continue; }
    sinceBar = true;
    if (!m[2]) continue;
    let len = m[4] ? +m[4] : 1;
    if (m[5]) len /= m[6] ? +m[6] : 2 ** m[5].length;
    if (tup > 0) { len *= tupF; tup--; }
    if (m[2] === "z") { notes.push({ rest: true, len }); tiedFrom = null; continue; }
    const L = m[2].toUpperCase();
    let oct = m[2] === L ? 0 : 1;
    for (const c of m[3]) oct += c === "'" ? 1 : -1;
    const a = m[1] ? { "^": 1, "^^": 2, "_": -1, "__": -2, "=": 0 }[m[1]] : undefined;
    const key = L + oct;
    if (a !== undefined) acc[key] = a;
    const alt = acc[key] ?? sig[L] ?? 0;
    const p = 60 + 12 * oct + STEP[L] + alt;
    if (pop && tiedFrom && tiedFrom.p === p) { tiedFrom.len += len; tiedFrom = m[7] ? tiedFrom : null; continue; }   // a tied note is one note
    const nt = { p, len }; notes.push(nt); tiedFrom = pop && m[7] ? nt : null;
  }
  if (sinceBar) bars++;
  return { notes, bars };
}

const themes = [];
for (const id of ids) {
  // a hand-corrected file in scripts/theme-fixes/ wins over the source
  const fix = path.resolve("scripts/theme-fixes", id + ".abc"), fixed = !ROUGH && fs.existsSync(fix);
  const file = fixed ? fix : path.join(POP ? DIROF[id] : src, id + ".abc");
  const abc = fs.readFileSync(file, "utf8");
  const head = (k) => (abc.match(new RegExp("^" + k + ":\\s*(.*)$", "m")) || [])[1]?.trim() || "";
  const dir = (k) => (abc.match(new RegExp("^%%" + k + "\\s+(.*)$", "m")) || [])[1]?.trim() || "";
  const movement = head("N").replace(/\s*%.*$/, "");   // "Adagio sostenuto": the movement's tempo word or name
  let title = head("T"), [last, first = ""] = (dir("composer") || head("C")).split("|"), yt = dir("link");
  let pop = null;
  if (POP && SETOF[id] !== "BiMMuDa") {   // CoCoPops / RS200: the header of the converted file and the song's entry
    const set = SETOF[id], sk = id.split("_").slice(0, 2).join("_"), sg = SONGJSON[set][sk];
    if (!sg) { console.warn("no song entry for", id); continue; }
    title = sg.title; last = sg.artist; first = ""; yt = set === "RS200" ? (sg.link || "") : "";
    const g = GFIX[sk] || (GENRES[sk] || {}).genres || [];
    pop = { year: sg.year, song: sk, section: dir("section") || "unlabelled", set, genre: g, label: (dir("label") || "").replace(/ \(letter .*\)$/, ""), repeats: +dir("repeats") || 1,
      ...(set === "CoCoPops" ? { mcgill: +sg.mcgill, peak: +sg.peak } : { rank: sg.rank }), ...(dir("mode") ? { mode: dir("mode") } : {}), ...(dir("keyfrom") ? { keyFrom: dir("keyfrom") } : {}) };
  } else if (POP) {   // the section's CSV row, the song's row, genres
    const mel = MEL[id], sk = id.split("_").slice(0, 2).join("_"), song = SONG[sk];
    if (!mel || !song) { console.warn("no CSV row for", id); continue; }
    title = song.Title; last = song.Artist; first = ""; yt = (song["Link to Audio (Spotify)"] || song["Link to Audio"] || "").replace(/\?.*$/, "");
    const g = GFIX[sk] || (GENRES[sk] || {}).genres || [], nm = (k) => (mel[k] === "" || mel[k] === undefined ? undefined : +mel[k]);
    pop = { set: "BiMMuDa", year: +mel.Year, pos: /^\d/.test(song.Position) ? parseInt(song.Position, 10) : song.Position, song: sk, section: mel.Label || "unlabelled", genre: g,
      bpm: nm("BPM"), len: nm("Length"), events: nm("Number of Note Events"), tonal: nm("Tonality"), mic: nm("MIC"), pstd: nm("Pitch STD"),
      mis: nm("MIS"), od: nm("Onset Density"), npvi: nm("nPVI"), ric: nm("RIC"), csvKey: mel.Tonic + " " + mel.Mode.toLowerCase() };
  }
  const twoVoice = /mtd-two-voice\/(\S+\.abc)/.exec(abc);
  // a key written with its mode ("Amin": 10 of MTD's scores) is minor for certain; read the signature from its major
  const kf = head("K").replace(/\s*%.*/, "").split(/\s+/)[0], km = /^([A-G][b#]?)(m|min|minor)$/i.exec(kf);
  const key = km && MINOR.includes(km[1] + "m") ? ORDER[MINOR.indexOf(km[1] + "m")] : kf;   // same index = same signature
  const meter = head("M"), unit = head("L");
  let body = abc.slice(abc.search(/^K:.*$/m)).replace(/^K:.*\n?/, ""), bodyChords = null;
  if (POP && SETOF[id] !== "BiMMuDa") {   // chord symbols written in the body ("Am"): out into the side list, offsets into the chord-free body
    const t = body.trim(); let out = "", last = 0; bodyChords = [];
    for (const m of t.matchAll(/"([^"]*)"/g)) { out += t.slice(last, m.index); bodyChords.push([out.length, m[1]]); last = m.index + m[0].length; }
    body = out + t.slice(last);
  }
  const { fifths, sig } = keySig(key);
  const { notes, bars } = analyse(body, sig, POP);
  const pitched = notes.filter((n) => !n.rest);
  const ps = pitched.map((n) => n.p), lens = pitched.map((n) => n.len);
  const mean = lens.reduce((a, b) => a + b, 0) / (lens.length || 1);
  const sd = Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / (lens.length || 1));
  let leaps = 0, steps = 0;
  for (let i = 1; i < ps.length; i++) { const d = Math.abs(ps[i] - ps[i - 1]); if (d > 2) leaps++; else if (d > 0) steps++; }
  const [un, ud] = unit.split("/").map(Number);
  const doPc = ((fifths * 7) % 12 + 12) % 12;
  // the work's key in the title ("Trio in D minor") wins when it fits the signature: as minor, or as major
  const tk = /\bin ([A-G])(?:[- ]?(flat|sharp|♭|♯))?(?: (major|minor))?(?=[,.;:)\s]|$)/.exec(title);
  let minor = guessMinor(ps, doPc), from = "melody";
  if (POP) { minor = !!km; from = pop && pop.keyFrom === "chords" ? "chords" : "score"; }   // the dataset's own tonic and mode (CoCoPops / RS200: a tonic only for the RS200, minor when its tonic chord is: scripts/convert-cocopops.py)
  else if (km) { minor = true; from = "score"; }
  else if (tk) {
    const pc = (STEP[tk[1].toUpperCase()] + (/flat|♭/i.test(tk[2] || "") ? -1 : /sharp|♯/i.test(tk[2] || "") ? 1 : 0) + 12) % 12;
    if (/minor/i.test(tk[3] || "") && pc === (doPc + 9) % 12) { minor = true; from = "title"; }
    else if (!/minor/i.test(tk[3] || "") && pc === doPc) { minor = false; from = "title"; }
  }
  const scale = new Set((minor ? [0, 2, 4, 5, 7, 8, 9, 11] : [0, 2, 4, 5, 7, 9, 11]).map((d) => (d + doPc) % 12));
  let maxLeap = 0;
  for (let i = 1; i < ps.length; i++) maxLeap = Math.max(maxLeap, Math.abs(ps[i] - ps[i - 1]));
  themes.push({
    id, last, first, title, yt: yt || "", ...(movement ? { movement } : {}),
    ...(+dir("bar").split(/\s/)[0] ? { bar: +dir("bar").split(/\s/)[0] } : {}),
    ...(/^\d+\s+one-score/.test(dir("bar")) ? { barOne: true } : {}),   // %%bar N one-score: from a single score, no second to agree   // %%bar N: the bar of the complete movement (scripts/pdmx-match.py); not drawn
    ...(() => { const w = WORKS[id.split("-")[0]] || {}, o = {};
      if (w.catalogue) o.cat = w.catalogue;
      for (const k of ["composed", "published", "premiere"]) if (w[k]) o[k] = w[k];
      const y2 = YEARS2[id] || YEARS2[id.split("-")[0]];
      if (y2 && !o.composed && !o.published && !o.premiere) o[y2.kind] = y2.year;
      return o; })(),
    qpm: +((/^Q:\s*1\/4\s*=\s*(\d+)/m.exec(abc) || [])[1] || 0) || undefined,   // the recording's tempo, for Play only
    key: minor ? MINOR[fifths + 7] : key, sigKey: key, minor, modeFrom: from, fifths, meter, unit,
    body: body.trim(),
    n: pitched.length, bars: Math.max(1, bars),
    lo: Math.min(...ps), hi: Math.max(...ps), range: Math.max(...ps) - Math.min(...ps),
    // mean note length in quarter notes
    mean: +(mean * (un / ud) * 4).toFixed(3), sd: +(sd * (un / ud) * 4).toFixed(3),
    leaps: +(leaps / Math.max(1, ps.length - 1)).toFixed(3),
    rests: notes.length - pitched.length,
    maxLeap, chromatic: ps.filter((p) => !scale.has(((p % 12) + 12) % 12)).length,
    durs: new Set(lens).size,
    ...(fixed ? { fixed: true } : {}),
    ...(pop ? { ...pop, composed: pop.year, ...(CHORDS[id] && CHORDS[id].len === body.trim().length ? { chords: CHORDS[id].at } : {}), ...(bodyChords && bodyChords.length ? { chords: bodyChords } : {}) } : {}),
    ...(ROUGH ? { from: dir("from") || "edm", ...(dir("repaired") ? { repaired: dir("repaired") } : {}) } : {}),   // rough page: "mtd" (the corrected version) or "edm" (midi2abc, tidied)
    ...(twoVoice ? { twoVoice: "scripts/theme-sources/mtd-two-voice/" + twoVoice[1] } : {}),
  });
}

if (POP) {   // songs in more than one collection: grouped, linked; the McGill id of each; genres shared inside a group
  const songs = {}, ORD = { BiMMuDa: 0, CoCoPops: 1, RS200: 2 };
  for (const t of themes) if (!songs[t.song]) songs[t.song] = { key: t.song, set: t.set, title: t.title, artist: t.last, year: t.year, mcgill: t.mcgill, genre: t.genre, bim: t.set === "BiMMuDa" ? t.id : null };
  const L = Object.values(songs).sort((a, b) => ORD[a.set] - ORD[b.set] || a.key.localeCompare(b.key)), parent = {};
  L.forEach((x) => { parent[x.key] = x.key; });
  const find = (k) => (parent[k] === k ? k : (parent[k] = find(parent[k])));
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i], b = L[j];
    if (a.set === b.set || normT(a.title) !== normT(b.title) || Math.abs(a.year - b.year) > 2) continue;
    const wa = artW(a.artist), wb = artW(b.artist);
    if ([...wa].some((w) => wb.has(w))) { const ra = find(a.key), rb = find(b.key); if (ra !== rb) parent[rb < ra ? ra : rb] = rb < ra ? rb : ra; }
  }
  const groups = {};
  for (const x of L) (groups[find(x.key)] = groups[find(x.key)] || []).push(x);
  let nGroups = 0; const pairs = {};
  for (const g of Object.values(groups)) {
    const sets = [...new Set(g.map((x) => x.set))];
    if (sets.length < 2) continue;
    nGroups++; const k = sets.slice().sort().join("+"); pairs[k] = (pairs[k] || 0) + 1;
    const mc = (g.find((x) => x.mcgill) || {}).mcgill, gen = (g.find((x) => (x.genre || []).length) || {}).genre || [];
    for (const x of g) { x.grp = g[0].key; x.also = sets.filter((z) => z !== x.set); x.salami = x.mcgill || mc; if (!(x.genre || []).length) x.genre = gen; }
  }
  for (const t of themes) {
    const x = songs[t.song];
    if (x.grp) { t.grp = x.grp; t.also = x.also; }
    const bs = t.set === "BiMMuDa" && CHORDS[t.id] && /^billboard (\d+)$/.exec(CHORDS[t.id].src || "");
    const sal = t.mcgill || x.salami || (bs ? +bs[1] : 0);
    if (sal) t.salami = +sal;
    if (!(t.genre || []).length && (x.genre || []).length) t.genre = x.genre;
  }
  themes.sort((a, b) => ORD[a.set] - ORD[b.set] || (a.set === "BiMMuDa" ? 0 : a.year - b.year || a.id.localeCompare(b.id)));   // the data's order is the page's "Chart order": BiMMuDa as before, then CoCoPops and RS200 by year
  console.log("songs in more than one collection:", nGroups, JSON.stringify(pairs), "; themes with a Timestamp Notes link:", themes.filter((t) => t.salami).length);
  const per = {}; for (const t of themes) per[t.set] = (per[t.set] || 0) + 1; console.log("themes per collection:", JSON.stringify(per));
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out,
  "// Generated by scripts/import-themes.mjs" + (POP ? " --set pop from scripts/theme-sources/bimmuda, cocopops, rs200 (" : ROUGH ? " --rough from scripts/theme-sources/rough (" : " from scripts/theme-sources/mtd (") + themes.length + " themes). Do not edit.\n" +
  "window." + (POP ? "POP_THEMES" : "CLASSICAL_THEMES") + " = " + JSON.stringify(themes) + ";\n");
console.log("wrote", out, themes.length, "themes,", (fs.statSync(out).size / 1e6).toFixed(1), "MB");
