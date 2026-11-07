// hutchinson-abc.mjs — notation for the Hutchinson YouTube excerpts on the theory/ pages (the clips listed in
// research_notes/hutchinson-clips.org; plan research_notes/hutchinson-notation-plan.md). Writes apps/shared/data/hutchinson/:
//   index.json      one entry per clip that has a source on the site (see KINDS)
//   <clip-id>.abc   the excerpt, when one could be made; clip id = "<video id>-<start seconds>"
//   node scripts/works/hutchinson-abc.mjs            (rerun after the pages, the score data or the tables below change)
//
// KINDS
//   "score-excerpt"  the clip's bars cut out of a score already on the site (When in Rome / Sapp bundles in apps/shared/data/scores,
//                    or a PDMX full score in apps/shared/data/full-scores): header K:/M:/L:/Q: and voices kept, each voice's key,
//                    clef and meter at the cut written at the start of its first bar, analysis labels kept.
//   "score-source"   the whole piece is on the site but the clip's bars are not known yet: abc is null, `source` says where it is.
//                    Fill in BARS (below) after listening, and the next run cuts it.
//   "chords"         chord progression and form from the McGill Billboard SALAMI file (apps/shared/data/billboard, CC0) for an
//                    in-copyright song. The Billboard times are the album recording's, not the video's: the ABC holds the sections
//                    at the clip's times IF the video plays the album track from 0 s (aligned: false = not checked by ear).
//   "riff"           a short riff or bass line written for the site with no source: unverified: true, always.
// Bars: the score's own count, bar 1 = first full bar, a pickup is bar 0 (cutting from bar 1 keeps it); repeats and endings are
// counted as written (once). Bars come ONLY from BARS below, whose `why` says where they came from (the page text, or a listening
// check). They are never guessed from the clip's timing.
// Every excerpt is bar-checked (scripts/works/hutchinson-abc-check.cjs) before it is written; one that fails is left out and listed.
import fs from "fs"; import path from "path"; import { createRequire } from "module";
const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const { checkBars, parseBars } = require("./hutchinson-abc-check.cjs");
const OUT = path.join(root, "apps/shared/data/hutchinson");

// ---- which piece each clip is: works id (from apps/shared/works/uses/hutchinson.js) -> source. Checked by hand (title, movement).
// scores:<id> = apps/shared/data/scores bundle piece; full:<id> = apps/shared/data/full-scores; tune:<%%id or title>; billboard:<n>;
// theme:<id> = Classical Themes (an opening only; may not cover the clip).
const SRC = {
  "hutch-beethoven-moonlight-sonata-op-27-no-2-i": ["scores:beethoven-sonata-14-1", "full:pdmx-159"],
  "hutch-mozart-piano-sonata-k-545-i": ["scores:mozart-sonata-16-1"],
  "hutch-mozart-piano-sonata-in-c-k-545-i": ["scores:mozart-sonata-16-1"],
  "hutch-mozart-piano-sonata-in-c-major-k-545-i": ["scores:mozart-sonata-16-1"],
  "hutch-mozart-piano-sonata-in-c-k-545-ii-answereight-bars": ["scores:mozart-sonata-16-2"],
  "hutch-mozart-piano-sonata-in-c-k-545-ii": ["scores:mozart-sonata-16-2"],
  "hutch-mozart-k-545-ii": ["scores:mozart-sonata-16-2"],
  "hutch-mozart-piano-sonata-k-310-i": ["scores:mozart-sonata-8-1"],
  "hutch-mozart-piano-sonata-k-279-iii": ["scores:mozart-sonata-1-3"],
  "hutch-mozart-piano-sonata-k-283-i": ["scores:mozart-sonata-5-1"],
  "hutch-mozart-piano-sonata-k-333-i-the-book-s-question": ["scores:mozart-sonata-13-1"],
  "hutch-schubert-winterreise-gute-nacht": ["scores:lied-schubert-franz-winterreise-d-911-01-gute-nacht"],
  "hutch-schubert-winterreise-die-nebensonnen": ["scores:lied-schubert-franz-winterreise-d-911-23-die-nebensonnen"],
  "hutch-schubert-winterreise-der-wegweiser": ["scores:lied-schubert-franz-winterreise-d-911-20-der-wegweiser"],
  "hutch-schumann-dichterliebe-ich-grolle-nicht": ["scores:lied-schumann-robert-dichterliebe-op-48-07-ich-grolle-nicht"],
  "hutch-schumann-dichterliebe-op-48-1-im-wunderschonen-monat-mai": ["scores:lied-schumann-robert-dichterliebe-op-48-01-im-wunderschonen-monat-mai"],
  "hutch-schumann-dichterliebe-am-leuchtenden-sommermorgen": ["scores:lied-schumann-robert-dichterliebe-op-48-12-am-leuchtenden-sommermorgen"],
  "hutch-schumann-sie-liebten-sich-beide-op-13-no-2": ["scores:lied-schumann-clara-6-lieder-op-13-2-sie-liebten-sich-beide"],
  "hutch-bach-chorale-175-jesus-meine-zuversicht": ["scores:bach-chorale-175"],
  "hutch-bach-liebster-jesu-wir-sind-hier-bwv-373": ["scores:bach-chorale-131", "scores:bach-chorale-328"],
  "hutch-bach-well-tempered-clavier-i-prelude-in-c-bwv-846": ["scores:bach-wtc1-prelude-1", "full:pdmx-80"],
  "hutch-bach-well-tempered-clavier-i-prelude-in-c-major": ["scores:bach-wtc1-prelude-1", "full:pdmx-80"],
  "bach-prelude-in-c-major-bwv-924": ["scores:bach-wtc1-prelude-1", "full:pdmx-80"],   // works id is wrong (BWV 924); the video is BWV 846
  "hutch-kuhlau-sonatina-in-c-op-55-no-1-i": ["full:pdmx-73"],
  "hutch-verdi-rigoletto-la-donna-e-mobile": ["full:pdmx-672"],
  "hutch-bizet-carmen-habanera": ["full:pdmx-896"],
  "beethoven-symphony-no-5-1074": ["full:pdmx-711", "theme:1074"],
  "chopin-nocturne-in-e-major-op-9-no-2": ["theme:9248"],
  // in copyright, Billboard chords
  "hutch-benatar-heartbreaker": ["billboard:1053"], "hutch-ub40-red-red-wine": ["billboard:83"], "hutch-james-super-freak": ["billboard:812"],
  "hutch-earth-wind-fire-september": ["billboard:804"], "hutch-lauper-true-colors": ["billboard:803"], "hutch-joel-just-the-way-you-are": ["billboard:240"],
  "hutch-queen-we-are-the-champions": ["billboard:588"], "hutch-cheap-trick-i-want-you-to-want-me": ["billboard:188"],
  "hutch-redding-sittin-on-the-dock-of-the-bay": ["billboard:645"],
};
// Billboard songs by title too (the works ids above are written from the uses file; a title match catches renamed ids)
const BB_TITLE = { "heartbreaker": 1053, "red red wine": 83, "super freak": 812, "september": 804, "true colors": 803, "just the way you are": 240,
  "we are the champions": 588, "i want you to want me": 188, "dock of the bay": 645 };

// ---- bars per clip id. why = where the bars come from. Add rows here after listening (and say so in why).
const BARS = {
  "PmO3Wlono6w-282": { bars: [1, 1], why: "page text: \"beat 4 of the first bar\" (the book's Figure 10.6.3). The clip is 282 s into the video, so it may be a later return of the same music (not checked by ear)." },
};

// ---- riffs and bass lines with no source (in copyright): written for the site, unverified, the clip's span only.
const RIFFS = {
  "_zO6lWfvM0g-0": { part: "guitar riff (top line; played in fourths)", abc: "M:4/4\nL:1/8\nQ:1/4=112\nK:Gm\nG2 B2 c4 | G2 B2 _d c3 | G2 B2 c4 | B2 G6 |]",
    why: "pitches G B♭ C / G B♭ D♭ C / G B♭ C / B♭ G as commonly taught; rhythm approximate. Not checked against a transcription." },
  "a01QQZyl-_I-5": { part: "bass line", abc: "M:4/4\nL:1/8\nQ:1/4=114\nK:D\nD,D,D,D, D,D, A,,D, | D,D,D,D, D,D, A,,D, |]",
    why: "the repeated D with the low A pickup, from memory; rhythm approximate. Not checked against a transcription." },
};

// ---- copyright, by composer (died before 1956 = public domain in the US for works published before 1930; the site is password-protected).
const PD = /bach|mozart|beethoven|schubert|schumann|handel|haydn|chopin|kuhlau|verdi|wagner|bizet|tchaikovsky|brahms|rossini|purcell|puccini|holst|strauss|borodin|key and smith|smith|traditional|columbia/i;

// ---------------------------------------------------------------------------------------------------------------------------
global.window = {};
(0, eval)(fs.readFileSync(path.join(root, "apps/shared/works/uses/hutchinson.js"), "utf8"));
const uses = new Map();
for (const it of window.WORK_USES[0].items) {
  const v = (it.url.match(/v=([\w-]{11})/) || [])[1], t = (it.url.match(/t=(\d+)/) || [])[1] || "0";
  if (!uses.has(v + "-" + t)) uses.set(v + "-" + t, it);
}
const norm = s => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, " ").trim();
// every clip on the theory pages (same reading as hutchinson-clips.mjs)
const clips = new Map();
for (const f of fs.readdirSync(path.join(root, "theory")).filter(f => f.endsWith(".qmd")).sort()) {
  const src = fs.readFileSync(path.join(root, "theory", f), "utf8");
  for (const m of src.matchAll(/<iframe class="dr-yt" src="[^"]*\/embed\/([\w-]{11})\?([^"]*)" title="([^"]*)"/g)) {
    const q = new URLSearchParams(m[2]); const start = +(q.get("start") || 0), end = q.get("end") ? +q.get("end") : null;
    const id = m[1] + "-" + start;
    if (clips.has(id)) { clips.get(id).pages.push(f); continue; }
    const u = uses.get(id) || {};
    clips.set(id, { id, video: m[1], start, end, title: m[3], work: u.work || null, workTitle: u.title || m[3], composer: (u.composer || "").replace(/^.*?\. /, ""), pages: [f] });
  }
}

const bundles = {}, scoreIndex = JSON.parse(fs.readFileSync(path.join(root, "apps/shared/data/scores/index.json"), "utf8"));
const fullIndex = JSON.parse(fs.readFileSync(path.join(root, "apps/shared/data/full-scores/index.json"), "utf8"));
function loadSource(s) {
  const [kind, id] = s.split(/:(.*)/);
  if (kind === "scores") {
    const p = scoreIndex.find(x => x.id === id); if (!p) return null;
    const B = bundles[p.file] = bundles[p.file] || JSON.parse(fs.readFileSync(path.join(root, "apps/shared/data/scores", p.file + ".json"), "utf8"));
    return { abc: B[id].abc, pickup: !!B[id].pickup, title: p.title + (p.sub ? ", " + p.sub : ""), path: `apps/shared/data/scores/${p.file}.json#${id}`, who: p.who };
  }
  if (kind === "full") {
    const p = fullIndex.find(x => x.id === id); if (!p) return null;
    return { abc: fs.readFileSync(path.join(root, "apps/shared/data/full-scores", p.abc), "utf8"), title: `${p.composer}, ${p.title}`, path: `apps/shared/data/full-scores/${p.abc}`, who: p.source };
  }
  return { abc: null, title: id, path: s };
}

// cut bars [a, b] (score numbering) out of a whole ABC score
function cut(abc, a, b, pickupFlag) {
  const P = parseBars(abc); if (P.error) return { error: P.error };
  const keys = Object.keys(P.voices); if (!keys.length) return { error: "no voices" };
  const v0 = P.voices[keys[0]].bars;
  const pickup = pickupFlag || (v0.length > 1 && v0[0].len > 0 && v0[0].len < v0[0].want - 1e-6);
  const idx = n => n - (pickup ? 0 : 1);                   // bar number -> span index
  let i0 = idx(a), i1 = idx(b);
  if (pickup && a === 1) i0 = 0;                           // keep the upbeat
  const firstBody = Math.min(...keys.map(k => P.voices[k].bars[0].start));
  const lineStart = abc.lastIndexOf("\n", firstBody) + 1;
  let header = abc.slice(0, lineStart).replace(/^X:.*\n/m, "").replace(/(^|\n)V:\S+\s*\n$/, "$1");
  const body = [];
  for (const k of keys) {
    const L = P.voices[k].bars; if (i1 >= L.length) return { error: `voice ${k} has ${L.length} bars, wanted index ${i1}` };
    const before = abc.slice(0, L[0].start).match(/(?:\[V:|^V:)\s*([^\]\s]+)/gm) || [];
    const vid = (before.pop() || "").replace(/^\[?V:\s*/, "");
    let text = L.slice(i0, i1 + 1).map(s => abc.slice(s.start, s.end)).join("").trim()
      .replace(/^\|+:?/, "").replace(/\[V:[^\]]*\]/g, "").trim();
    const lead = (text.match(/^(\s*\[[KMLQ]:[^\]]*\])+/) || [""])[0];
    text = text.slice(lead.length);
    const prior = L.slice(0, i0).map(s => abc.slice(s.start, s.end)).join(" ") + " " + lead;
    const last = re => { const m = [...prior.matchAll(re)]; return m.length ? m[m.length - 1][0] : ""; };
    const kf = [...prior.matchAll(/\[K:([^\]]*)\]/g)].map(m => m[1].trim());
    const isClef = s => /^(clef=)?(treble|bass|alto|tenor|perc|none)([+-]8)?$/.test(s);
    const key = [...kf].reverse().find(s => !isClef(s) && !/^clef=/.test(s));
    const clef = [...kf].reverse().find(s => isClef(s) || /clef=/.test(s));
    // the state at the cut goes into the header (abcjs trips over an inline [K:clef=] opening a one-bar voice):
    // the voice's V: line gets its clef, and the first voice's last key / meter / tempo replace K: / M: / Q:
    if (clef) {
      const cl = /clef=/.test(clef) ? clef.match(/clef=(\S+)/)[1] : clef;
      header = header.replace(new RegExp("^(V:" + vid.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")(\\b[^\\n]*)$", "m"), (m0, v, rest) =>
        v + (/clef=\S+|\b(treble|bass|alto|tenor|perc)([+-]8)?\b/.test(rest) ? rest.replace(/clef=\S+|\b(treble|bass|alto|tenor|perc)([+-]8)?\b/, "clef=" + cl) : rest + " clef=" + cl));
    }
    if (k === keys[0]) {
      const M = last(/\[M:[^\]]*\]/g), Q = last(/\[Q:[^\]]*\]/g);
      if (key) header = header.replace(/^K:.*$/m, "K:" + key.replace(/\s*clef=\S+/, ""));
      if (M) header = header.replace(/^M:.*$/m, M.slice(1, -1));
      if (Q) header = /^Q:/m.test(header) ? header.replace(/^Q:.*$/m, Q.slice(1, -1)) : Q.slice(1, -1) + "\n" + header;
    }
    const state = last(/\[L:[^\]]*\]/g);
    body.push(`[V:${vid}] ${state} ${text}`.replace(/\s+/g, " "));
  }
  return { abc: header + body.join("\n") + "\n", pickup: pickup && i0 === 0 };
}

// ---- Billboard chords
const HARTE = { maj: "", min: "m", 7: "7", maj7: "maj7", min7: "m7", 5: "5", 1: "(no3)", sus4: "sus4", sus2: "sus2", dim: "dim", aug: "aug", hdim7: "m7b5",
  dim7: "dim7", maj6: "6", min6: "m6", 9: "9", maj9: "maj9", min9: "m9", 11: "11", min11: "m11", 13: "13", "7(#9)": "7#9", minmaj7: "m(maj7)", "sus4(b7)": "7sus4", "sus4(b7,9)": "9sus4" };
const LET = "CDEFGAB", NAT = [0, 2, 4, 5, 7, 9, 11];
const pc = n => (NAT[LET.indexOf(n[0])] + (n.match(/#/g) || []).length - (n.match(/b/g) || []).length + 12) % 12;
function bassNote(root, deg) {   // Harte /degree spelled from the root letter
  const m = deg.match(/^([b#]*)(\d+)$/); if (!m) return null;
  const d = +m[2], li = (LET.indexOf(root[0]) + d - 1) % 7, want = (pc(root) + NAT[(d - 1) % 7] + (m[1].match(/#/g) || []).length - (m[1].match(/b/g) || []).length + 12) % 12;
  let acc = (want - NAT[li] + 12) % 12; if (acc > 6) acc -= 12;
  return LET[li] + (acc > 0 ? "#".repeat(acc) : "b".repeat(-acc));
}
function chordSym(tok) {
  if (tok === "N" || tok === "X") return "N.C.";
  const m = tok.match(/^([A-G][b#]?):([^/]*)(?:\/(.*))?$/); if (!m) return tok;
  const q = HARTE[m[2]] ?? m[2];
  const bass = m[3] ? bassNote(m[1], m[3]) : null;
  return m[1] + q + (bass ? "/" + bass : "");
}
const ROM = ["I", "bII", "II", "bIII", "III", "IV", "#IV", "V", "bVI", "VI", "bVII", "VII"];
function roman(tok, tonic) {
  const m = tok.match(/^([A-G][b#]?):([^/]*)/); if (!m) return tok === "N" ? "N.C." : tok;
  const r = ROM[(pc(m[1]) - pc(tonic) + 12) % 12], minor = /^(min|dim|hdim)/.test(m[2]);
  return (minor ? r.toLowerCase().replace("b", "b").replace(/^B/, "b") : r) + (/7/.test(m[2]) ? "7" : "") + (/dim/.test(m[2]) && !/hdim/.test(m[2]) ? "°" : "") + (/hdim/.test(m[2]) ? "ø" : "");
}
function readBillboard(n) {
  const txt = fs.readFileSync(path.join(root, "apps/shared/data/billboard", n + ".txt"), "utf8");
  const hd = k => (txt.match(new RegExp("^# " + k + ": (.*)$", "m")) || [])[1];
  const meter = hd("metre") || "4/4", tonic = hd("tonic") || "C";
  const lines = [], form = []; let sec = null;
  for (const l of txt.split("\n")) {
    const m = l.match(/^([\d.]+)\t(.*)$/); if (!m) continue;
    const t = +m[1], body = m[2];
    const lab = body.match(/^([A-Z]'*), ([^,|]+),/);
    if (lab) { sec = { t, letter: lab[1], name: lab[2].trim() }; form.push(sec); }
    else if (/^(silence|end)\b/.test(body)) { lines.push({ t, bars: [] }); continue; }
    else { const nm = body.match(/^([a-z-]+),/); if (nm && !body.trim().startsWith("|")) { sec = { t, letter: "", name: nm[1] }; form.push(sec); } }
    const a = body.indexOf("|"), z = body.lastIndexOf("|");
    let bars = a >= 0 ? body.slice(a + 1, z).split("|").map(s => s.trim()).filter(s => s !== "") : [];
    const rep = body.slice(z).match(/x(\d+)/); if (rep) bars = Array(+rep[1]).fill(bars).flat();
    lines.push({ t, bars, sec });
  }
  for (let i = 0; i < lines.length; i++) lines[i].t2 = i + 1 < lines.length ? lines[i + 1].t : lines[i].t;
  return { meter, tonic, lines, form, title: hd("title"), artist: hd("artist") };
}
function barAbc(bar, beats) {
  let m = bar.match(/^\((\d+)\/(\d+)\)\s*/), meter = "";
  if (m) { beats = +m[1]; meter = `[M:${m[1]}/${m[2]}] `; bar = bar.slice(m[0].length); }
  const toks = bar.split(/\s+/).filter(Boolean); let prev = null;
  const sym = t => { if (t === ".") return ""; prev = t; return `"${chordSym(t)}"`; };
  if (beats % toks.length === 0) return { abc: meter + toks.map(t => sym(t) + "x" + (beats / toks.length === 1 ? "" : beats / toks.length)).join(" "), beats, toks };
  if (toks.length === 3 && beats === 4) return { abc: meter + "(3" + toks.map(t => sym(t) + "x2").join(""), beats, toks };
  return { abc: meter + sym(toks[0]) + "x" + beats, beats, toks, rough: true };
}
function chordsEntry(clip, n) {
  const B = readBillboard(n), [num, den] = B.meter.split("/").map(Number);
  const span = B.lines.filter(l => l.bars.length && l.t < (clip.end ?? clip.start + 10) && l.t2 > clip.start);
  const abcBars = [], romans = []; let rough = false;
  let lastSec = null;
  for (const l of span) {
    for (const bar of l.bars) {
      const r = barAbc(bar, num); rough = rough || !!r.rough;
      let label = "";
      if (l.sec && l.sec !== lastSec) { label = `"^${(l.sec.letter ? l.sec.letter + " " : "") + l.sec.name}"`; lastSec = l.sec; }
      abcBars.push(label + r.abc);
      romans.push(r.toks.filter(t => t !== ".").map(t => roman(t, B.tonic)).join(" "));
    }
  }
  const key = B.tonic.replace("b", "b");
  const abc = `T:${B.title} (${B.artist}): chords at ${clip.start}–${clip.end ?? "?"} s of the Billboard recording\nM:${B.meter}\nL:1/${den}\nK:${key}\n` +
    abcBars.map((b, i) => b + (i % 4 === 3 ? " |\n" : " | ")).join("").replace(/\| ?\n?$/, "|]") + "\n";
  return { abc, romans, form: B.form.map(s => `${s.letter ? s.letter + " " : ""}${s.name} @${Math.round(s.t)}s`), tonic: B.tonic, meter: B.meter, rough, bars: abcBars.length };
}

// ---------------------------------------------------------------------------------------------------------------------------
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith(".abc")) fs.unlinkSync(path.join(OUT, f));
const index = [], failed = [];
for (const c of clips.values()) {
  const t = norm(c.workTitle);
  let srcs = SRC[c.work] || null;
  if (!srcs) { const k = Object.keys(BB_TITLE).find(k => t === k || t.endsWith(" " + k) || t.startsWith(k)); if (k && !PD.test(c.composer)) srcs = ["billboard:" + BB_TITLE[k]]; }
  const riff = RIFFS[c.id];
  if (!srcs && !riff) continue;
  const pd = PD.test(c.composer) || (srcs || []).some(s => /^(scores|full|theme):/.test(s));
  const e = { id: c.id, video: c.video, start: c.start, end: c.end, title: c.workTitle, composer: c.composer || null, work: c.work, pages: c.pages,
    copyright: pd ? "public domain (composer's dates; the edition used is PD or CC)" : "in copyright", kind: null, bars: null, barsWhy: null, source: null, abc: null };
  const s0 = (srcs || [])[0] || "";
  if (/^(scores|full):/.test(s0)) {
    const S = loadSource(s0);
    e.source = { id: s0, title: S && S.title, path: S && S.path, also: srcs.slice(1) };
    const B = BARS[c.id];
    if (B && S && S.abc) {
      const r = cut(S.abc, B.bars[0], B.bars[1], S.pickup);
      const head = `X:1\nT:${c.workTitle}, bars ${B.bars[0]}${B.bars[1] !== B.bars[0] ? "–" + B.bars[1] : ""}\n%%hutchinson ${c.id} video ${c.video} ${c.start}-${c.end ?? ""} s; cut from ${S.path} by scripts/works/hutchinson-abc.mjs\n`;
      const chk = r.error ? { error: r.error } : checkBars(head + r.abc, { pickup: r.pickup });
      if (chk.error || chk.bad.length) { failed.push(`${c.id}: ${chk.error || chk.bad.join("; ")}`); e.kind = "score-source"; }
      else {
        fs.writeFileSync(path.join(OUT, c.id + ".abc"), head + r.abc);
        Object.assign(e, { kind: "score-excerpt", bars: B.bars, barsWhy: B.why, abc: c.id + ".abc", pickup: r.pickup, checked: `${chk.bars} bars in ${chk.voices} voices` });
      }
    } else e.kind = "score-source";
  } else if (/^billboard:/.test(s0)) {
    const n = +s0.split(":")[1], r = chordsEntry(c, n), head = `X:1\n%%hutchinson ${c.id} video ${c.video}; chords from apps/shared/data/billboard/${n}.txt (McGill Billboard, CC0)\n`;
    const chk = checkBars(head + r.abc);
    e.source = { id: s0, path: `apps/shared/data/billboard/${n}.txt` };
    if (!r.bars) { failed.push(`${c.id}: no Billboard bars at ${c.start}–${c.end} s`); e.kind = "chords"; e.form = r.form; }
    else if (chk.error || chk.bad.length) { failed.push(`${c.id}: ${chk.error || chk.bad.join("; ")}`); }
    else {
      fs.writeFileSync(path.join(OUT, c.id + ".abc"), head + r.abc);
      Object.assign(e, { kind: "chords", abc: c.id + ".abc", aligned: false, alignNote: "Billboard (album) times used as video times; check by ear",
        tonic: r.tonic, meter: r.meter, romans: r.romans, form: r.form, roughBars: r.rough || undefined });
    }
  } else if (/^(tune|theme):/.test(s0)) { e.kind = "score-source"; e.source = { id: s0 }; }
  if (riff) {
    const abc = `X:1\nT:${c.workTitle}: ${riff.part} (unverified)\n%%hutchinson ${c.id} video ${c.video}; written for the site, no source\n${riff.abc}\n`;
    const chk = checkBars(abc);
    if (chk.error || chk.bad.length) failed.push(`${c.id} riff: ${chk.error || chk.bad.join("; ")}`);
    else { const r = { ...e, id: c.id + "-riff", kind: "riff", unverified: true, part: riff.part, why: riff.why, abc: c.id + "-riff.abc", source: null, copyright: "in copyright" };
      fs.writeFileSync(path.join(OUT, r.abc), abc); index.push(r); }
  }
  if (e.kind) index.push(e);
}
// tune collection clips (melodies already on the site; bars not known)
const tunesSrc = fs.readFileSync(path.join(root, "apps/tunes/tunes-object.js"), "utf8");
const tuneIds = new Map();
for (const m of tunesSrc.matchAll(/T:\s*([^\n`]+)\n(?:[^`]*?\n)?%%id ([^\n]+)/g)) if (!tuneIds.has(norm(m[1]))) tuneIds.set(norm(m[1]), m[2].trim());
for (const c of clips.values()) {
  if (index.some(e => e.id === c.id)) continue;
  const tid = tuneIds.get(norm(c.workTitle)) || tuneIds.get(norm(c.title));
  if (!tid) continue;
  index.push({ id: c.id, video: c.video, start: c.start, end: c.end, title: c.workTitle, composer: c.composer || null, work: c.work, pages: c.pages,
    copyright: PD.test(c.composer) ? "public domain" : "in copyright (melody and chords already in the tune collection)", kind: "score-source",
    bars: null, barsWhy: null, source: { id: "tune:" + tid, path: "apps/tunes/tunes-object.js" }, abc: null });
}
// Figures: the book's own notated example for a clip (mt21c, GPL-3.0), read off its image by a model. Pitches unchecked
// (`%unsure` lines say where); `barsOk: false` when a bar does not add up. Images and captions: hutchinson-figures.mjs.
{ const FIG = path.join(OUT, "fig");
  const figs = JSON.parse(fs.readFileSync(path.join(root, "research_notes/hutchinson-figures.json"), "utf8"));
  for (const f of fs.existsSync(FIG) ? fs.readdirSync(FIG).filter(f => f.endsWith(".abc")).sort() : []) {
    const key = f.slice(0, -4), g = figs[key]; if (!g) { failed.push(key + ": figure not in hutchinson-figures.json"); continue; }
    const abc = fs.readFileSync(path.join(FIG, f), "utf8"), c = clips.get(key) || {};
    const pv = parseBars(abc), pickup = !pv.error && Object.values(pv.voices).every(v => v.bars[0] && v.bars[0].len < v.bars[0].want - 1e-6);
    const r = checkBars(abc, { pickup });
    const unsure = [...abc.matchAll(/^%unsure (.*)$/gm)].map(m => m[1]);
    index.push({ id: key + "-fig", video: g.video, start: g.start, end: g.end ?? null, title: c.workTitle || g.caption, composer: c.composer || null,
      work: c.work || null, pages: c.pages || null, caption: g.caption, chapter: g.chapter, copyright: "figure from Hutchinson, Music Theory for the 21st-Century Classroom (GPL-3.0)",
      kind: "figure", unverified: true, unsure, pickup, barsOk: !r.error && !r.bad.length, bars: null, barsWhy: null,
      source: { id: "mt21c:" + g.images[0], url: "https://github.com/rhutchinson20/mt21c" }, abc: "fig/" + f });
  } }
index.sort((a, b) => a.id.localeCompare(b.id));
fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(index, null, 1) + "\n");
const by = {}; for (const e of index) by[e.kind] = (by[e.kind] || 0) + 1;
console.log(`${clips.size} clips; ${index.length} index entries:`, by);
if (failed.length) console.log("left out (bar check or cut failed):\n  " + failed.join("\n  "));
