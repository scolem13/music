// Song riffs from notation: reads scripts/riffs/riffs-src.json (each riff's LilyPond exactly as the Wikipedia page prints it,
// with the page named) and writes the generated block between "riffs:begin" and "riffs:end" in apps/shared/band/harmony.js.
//   node scripts/riffs/lily2fig.mjs [--print]
// Handles what those snippets use: \relative (or absolute pitches), notes with is / es, ' and , octave marks, durations and
// dots (a missing duration repeats the last), rests, ties, chords <...>, \times 2/3 { } and \tuplet 3/2 { }, \partial,
// \time; grace notes and everything else (keys, clefs, tempo, articulations, slurs, beams) are skipped. Key signatures do not
// change LilyPond pitches, so they are not needed. Grace notes are not played but move \\relative's octave, as in LilyPond. A pickup (\partial) is moved to the end of the loop, so the riff repeats.
// Octaves: guitar and bass music is written an octave above where it sounds, so their notes are put an octave down;
// a riff may add `octave` (more octaves). The snippets have no octave clef: that reading is the site's.
import fs from "fs";
import path from "path";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const SRC = path.join(ROOT, "scripts/riffs/riffs-src.json"), OUT = path.join(ROOT, "apps/shared/band/harmony.js");
const STEP = { c: 0, d: 1, e: 2, f: 3, g: 4, a: 5, b: 6 }, SEMI = [0, 2, 4, 5, 7, 9, 11];

export function parse(src){
  let s = src.replace(/%[^\n]*/g, " ");
  // blocks and commands whose arguments are not music
  s = s.replace(/\\(header|layout|midi|with|addlyrics|markup)\s*\{[^{}]*(\{[^{}]*\}[^{}]*)*\}/g, " ");
  s = s.replace(/\\(set|override)\s+[\w.]+(\s+[\w.-]+)?\s*=\s*(#'\([^)]*\)|#"[^"]*"|##?[^\s}]+|[^\s}]+)/g, " ");
  s = s.replace(/\\(key)\s+\w+\s+\\\w+/g, " ").replace(/\\(clef|transposition|bar|remove|version|new)\s+("[^"]*"|\S+)/g, " ");
  s = s.replace(/\\tempo\s+("[^"]*"\s*)?(\d+\s*=\s*[\d-]+)?/g, " ").replace(/\\repeat\s+\w+\s+\d+/g, " ");
  s = s.replace(/[_^-]\s*\\markup\s*\{[^}]*\}/g, " ");
  let grace = [], i = 0, ref = null, rel = false, dur = 1, t = 0, meter = [4, 4], partial = null, notes = [], scale = [1], pend = [], tieNext = false, last = null;
  const peek = () => s[i];
  function pitch(name, marks, refStep){
    const m = /^([a-g])((?:is|es|s)*)$/.exec(name); if (!m) return null;
    let acc = 0; m[2].replace(/is|es|s/g, (x) => { acc += x === "is" ? 1 : -1; return x; });
    const L = STEP[m[1]]; let oct;
    if (refStep == null) oct = 3;                                   // absolute: c = C3
    else { oct = Math.floor(refStep / 7); let st = L + 7 * oct; while (st - refStep > 3) st -= 7; while (refStep - st > 3) st += 7; oct = Math.floor(st / 7); }
    for (const c of marks) oct += c === "'" ? 1 : -1;
    return { step: L + 7 * oct, midi: 12 * (oct + 1) + SEMI[L] + acc };
  }
  function durOf(str){ if (!str) return dur; const m = /^(\d+)(\.*)$/.exec(str); let d = 4 / +m[1], add = d; for (let k = 0; k < m[2].length; k++){ add /= 2; d += add; } dur = d; return d; }
  const fac = () => scale.reduce((a, b) => a * b, 1);
  while (i < s.length){
    const rest = s.slice(i);
    let m;
    if ((m = /^\\relative\s*(?:([a-g](?:is|es|s)*)([',]*))?/.exec(rest))){ rel = true; ref = m[1] ? pitch(m[1], m[2], null).step : 3 * 7; i += m[0].length; continue; }
    if ((m = /^\\time\s+(\d+)\/(\d+)/.exec(rest))){ meter = [+m[1], +m[2]]; i += m[0].length; continue; }
    if ((m = /^\\partial\s+(\d+\.*)/.exec(rest))){ const d0 = dur; partial = durOf(m[1]); dur = d0; i += m[0].length; continue; }
    if ((m = /^\\(grace|acciaccatura|appoggiatura)\s*\{/.exec(rest))){ grace.push(scale.length); pend.push(scale.length); scale.push(1); i += m[0].length; continue; }   // grace notes: not played, but they move \relative's octave
    if ((m = /^\\times\s+(\d+)\/(\d+)\s*\{/.exec(rest))){ pend.push(scale.length); scale.push(+m[1] / +m[2]); i += m[0].length; continue; }
    if ((m = /^\\tuplet\s+(\d+)\/(\d+)\s*\{/.exec(rest))){ pend.push(scale.length); scale.push(+m[2] / +m[1]); i += m[0].length; continue; }
    if ((m = /^\\[a-zA-Z]+/.exec(rest))){ i += m[0].length; continue; }           // \startTrillSpan, \deadNote, \stemUp, ...
    if (peek() === "}"){ if (pend.length && scale.length - 1 === pend[pend.length - 1]){ if (grace.length && grace[grace.length - 1] === scale.length - 1) grace.pop(); scale.pop(); pend.pop(); } i++; continue; }
    if ((m = /^<([^>]*)>(\d+\.*)?/.exec(rest))){                                    // a chord
      const parts = m[1].trim().split(/\s+/); let r = rel ? ref : null, first = null; const ms = [];
      for (const p of parts){ const q = /^([a-g](?:is|es|s)*)([',]*)!?/.exec(p); if (!q) continue; const P = pitch(q[1], q[2], rel ? r : null); if (rel) r = P.step; if (!first) first = P; ms.push(P.midi); }
      if (rel && first) ref = first.step;
      const d = durOf(m[2]) * fac(); addNote(ms, d); i += m[0].length; continue;
    }
    if ((m = /^([a-g](?:is|es|s)*)([',]*)!?\??(\d+\.*)?/.exec(rest)) && !/^[a-z]/.test(rest.slice(m[0].length))){
      const P = pitch(m[1], m[2], rel ? ref : null); if (rel) ref = P.step;
      addNote([P.midi], durOf(m[3]) * fac()); i += m[0].length; continue;
    }
    if ((m = /^[rRs](\d+\.*)?/.exec(rest)) && !/^[a-z]/.test(rest.slice(m[0].length))){ t += durOf(m[1]) * fac(); tieNext = false; i += m[0].length; continue; }
    if ((m = /^\d+\.*/.exec(rest))){ t += durOf(m[0]) * fac(); i += m[0].length; continue; }     // a bare duration: a repeated note (drum notation) - skipped as a rest
    if (peek() === "~"){ tieNext = true; i++; continue; }
    i++;
  }
  function addNote(ms, d){
    if (grace.length) return;
    if (tieNext && last && last.midis.join() === ms.join()){ last.dur += d; t += d; tieNext = false; return; }
    tieNext = false; last = { pos: t, dur: d, midis: ms }; notes.push(last); t += d;
  }
  const bar = meter[0] * 4 / meter[1];
  if (partial){                                                                   // the pickup goes to the end of the loop
    const body = Math.ceil((t - partial) / bar - 1e-9) * bar;
    notes.forEach((n) => { n.pos = n.pos < partial - 1e-9 ? body - partial + n.pos : n.pos - partial; });
    t = body;
  }
  const len = Math.max(1, Math.ceil(t / bar - 1e-9));
  return { notes: notes.sort((a, b) => a.pos - b.pos), bars: len, bar, meter: meter.join("/") };
}

const r3 = (x) => Math.round(x * 1000) / 1000;
function entry(R){
  const P = parse(R.lily), down = (R.part === "bass" || R.inst === "guitar" ? -12 : 0) + 12 * (R.octave || 0);
  const notes = P.notes.map((n) => [r3(n.pos), n.midis.length === 1 ? n.midis[0] + down : n.midis.map((x) => x + down), "m", r3(Math.max(0.1, n.dur * 0.95))]);
  const o = { part: R.part, kind: "song", bars: P.bars, song: R.song, artist: R.artist, source: "Wikipedia (" + R.page + "), LilyPond notation", meter: P.meter, chart: R.chart };
  if (R.inst) o.inst = R.inst;
  return "    " + R.id + ": " + JSON.stringify(Object.assign(o, { notes })) + ",";
}
if (process.argv[1] && process.argv[1].endsWith("lily2fig.mjs")){
  const list = JSON.parse(fs.readFileSync(SRC, "utf8"));
  if (process.argv.includes("--print")){
    const N = "C C# D Eb E F F# G Ab A Bb B".split(" "), nm = (m) => N[m % 12] + (Math.floor(m / 12) - 1);
    list.forEach((R) => { const P = parse(R.lily); console.log(R.id, P.meter, P.bars + " bars:", P.notes.map((n) => n.pos + ":" + n.midis.map(nm).join("/") + "(" + n.dur + ")").join(" ")); });
  } else {
    const block = "    // riffs:begin (written by scripts/riffs/lily2fig.mjs from scripts/riffs/riffs-src.json; do not edit by hand)\n" + list.map(entry).join("\n") + "\n    // riffs:end\n";
    let js = fs.readFileSync(OUT, "utf8");
    if (/\/\/ riffs:begin[\s\S]*?\/\/ riffs:end\n/.test(js)) js = js.replace(/ *\/\/ riffs:begin[\s\S]*?\/\/ riffs:end\n/, block);
    else js = js.replace("    guitarRiff:   {", block + "    guitarRiff:   {");
    fs.writeFileSync(OUT, js); console.log("wrote " + list.length + " riffs into harmony.js");
  }
}
