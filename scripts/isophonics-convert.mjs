// Isophonics Beatles annotations (Queen Mary, Univ. of London; ~/Projects/corpora/isophonics, personal / educational use) -> a McGill
// SALAMI-style chords file, so Timestamp Notes (salami-chords.js), the Tune Directory and the sheet read them like a Billboard song.
// Used by billboard-import.mjs, which writes them beside the Billboard files (ids 100001 up, `src: "iso"` in index.json).
//
// Sources per song (all in the corpus's own folders): chordlab/*.lab ("start end chord", Harte syntax like SALAMI's), beat/*.txt
// ("time beat-number": a bar starts at beat 1), keylab/*.lab ("start end Key E" / "Key A:minor"), seglab/*.lab ("start end label").
// What is made:  "# title / artist / metre / tonic" lines, then one line per section: "<time>\t<label>, | c . . . | c . . . |"
//   - a bar = the beats from one "1" to the next; its cells are the chord sounding at each beat, "." where it holds. A change between
//     two beats is lost (the grid is a beat); the chord is read at the beat time + 0.08 s, since the annotators mark changes a little early.
//   - a beat count other than the song's usual (most common bar length) opens the bar with "(n/4)"; the metre is "<usual>/4",
//     or "<usual>/8" when the usual is 6 or 12 (felt in 6/8 / 12/8: unverified, no meter is annotated, only beat numbers).
//   - sections from seglab (label text kept, "versea" -> "verse a"); silence / N chords before the first bar are left out.
//   - no beat file or no beat 1 -> the song is left out (listed in the report).
// Not checked: the beat files' bar lines (an anacrusis may be counted as a short bar), and 3 files have "New" meter markers (skipped).
import fs from "fs";
import path from "path";

const readLines = (f) => fs.readFileSync(f, "utf8").split(/\r?\n/).filter((l) => l.trim());
const num = (x) => parseFloat(x);

export function convertSong(dirs, album, file, title) {
  const base = file.replace(/\.lab$/, "");
  const get = (d, ext) => { const f = path.join(dirs[d], album, base + ext); return fs.existsSync(f) ? f : null; };
  const cf = get("chordlab", ".lab"), bf = get("beat", ".txt"), kf = get("keylab", ".lab"), sf = get("seglab", ".lab");
  if (!cf || !bf) return { skip: "no " + (!cf ? "chord" : "beat") + " file" };
  const chords = readLines(cf).map((l) => l.split(/\s+/)).filter((p) => p.length >= 3 && isFinite(num(p[0])))
    .map((p) => ({ a: num(p[0]), b: num(p[1]), c: p.slice(2).join("") }));
  const beats = readLines(bf).map((l) => l.split(/\s+/)).filter((p) => isFinite(num(p[0])) && /^\d+$/.test(p[1] || ""))
    .map((p) => ({ t: num(p[0]), n: +p[1] }));
  if (!chords.length || !beats.some((b) => b.n === 1)) return { skip: "no beat 1" };

  // bars: from each beat 1 to the next (beats before the first 1 are a pickup bar)
  const bars = []; let cur = null;
  for (const b of beats) {
    if (b.n === 1 || !cur) { cur = { t: b.t, beats: [] }; bars.push(cur); }
    cur.beats.push(b.t);
  }
  const count = {}; bars.forEach((b) => { count[b.beats.length] = (count[b.beats.length] || 0) + 1; });
  const usual = +Object.entries(count).sort((a, b) => b[1] - a[1])[0][0];
  const chordAt = (t) => { for (const c of chords) if (t >= c.a - 1e-6 && t < c.b) return c.c; return chords[chords.length - 1].c; };
  const cellsOf = (bar) => {
    let prev = null, out = [];
    for (const t of bar.beats) { const c = chordAt(t + 0.08); out.push(c === prev ? "." : c); prev = c; }
    return out;
  };
  // the chord that carries into a bar is repeated at its start, as SALAMI's own bars do not need it: the converter holds it on
  const bar = (b) => "| " + (b.beats.length !== usual ? "(" + b.beats.length + "/4) " : "") + cellsOf(b).join(" ") + " ";

  // sections
  let segs = [];
  if (sf) segs = readLines(sf).map((l) => { const p = l.split("\t"); return { a: num(p[0]), b: num(p[1]), l: (p[p.length - 1] || "").trim() }; })
    .filter((s) => isFinite(s.a));
  // seglab runs the word and its letter / number together: "versea" -> "verse a", "chorus2" -> "chorus 2", "intro" stays
  const label = (l) => { const t = l.toLowerCase().replace(/[^a-z0-9 \-]/g, " ").trim();
    const m = /^(verse|chorus|bridge|intro|outro|solo|refrain|coda|interlude)([a-z]|\d+)$/.exec(t); return m ? m[1] + " " + m[2] : t.replace(/\s+/g, " "); };
  const lines = [];
  const firstBar = bars[0].t, end = chords[chords.length - 1].b;
  const key = kf ? (readLines(kf).map((l) => l.split("\t")).find((p) => /^Key$/i.test(p[2] || "") && p[3]) || [])[3] : "";
  const tonic = key ? key.replace(/:minor$/, ":minor").replace(/:major$/, "") : "";
  if (!segs.length) segs = [{ a: firstBar, b: end, l: "" }];
  let bi = 0;
  for (const s of segs) {
    if (/^(silence|end)/i.test(s.l)) continue;
    const mine = [];
    while (bi < bars.length && bars[bi].t < s.b - 1e-6) { if (bars[bi].t >= s.a - 0.3 || !mine.length) mine.push(bars[bi]); bi++; }
    if (!mine.length) continue;
    const lab = label(s.l);
    lines.push({ t: mine[0].t, text: (lab ? lab + ", " : "") + mine.map(bar).join("") + "|" });
  }
  if (!lines.length) return { skip: "no bars in sections" };
  // bars after the last section, if any, join it
  while (bi < bars.length) { lines[lines.length - 1].text = lines[lines.length - 1].text.replace(/\|$/, "") + bar(bars[bi]) + "|"; bi++; }
  const metre = usual === 6 ? "6/8" : usual === 12 ? "12/8" : usual + "/4";
  const out = ["# title: " + title, "# artist: The Beatles", "# metre: " + metre, "# tonic: " + (tonic.replace(/:minor$/, "") || "C") + (/:minor$/.test(tonic) ? "" : ""), ""];
  out.push("0.0\tsilence");
  for (const l of lines) out.push(l.t.toFixed(3) + "\t" + l.text);
  out.push(end.toFixed(3) + "\tend");
  return { text: out.join("\n") + "\n", metre, tonic, minor: /:minor$/.test(tonic), secs: Math.round(end), bars: bars.length,
    form: lines.map((l) => (/^([a-z ]+),/.exec(l.text) || [])[1]).filter(Boolean).join(" · ") };
}
