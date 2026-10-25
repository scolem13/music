#!/usr/bin/env node
// clean-tunes.mjs — normalise apps/tunes/tunes-object.js and flag tunes that need hand repair.
//
//   node scripts/clean-tunes.mjs            # dry run: prints the report, writes nothing
//   node scripts/clean-tunes.mjs --write    # rewrites apps/tunes/tunes-object.js in place
//   node scripts/clean-tunes.mjs --report out.json   # also dump the per-tune report
//
// Safe to re-run (idempotent). Mechanical fixes: add `I:linebreak $` where `$` is used, drop
// `%%pagescale`, repair chord quotes broken across a line, lift melodies written an octave or two
// too low (median note below middle C), bake `%%id` (same slug rule as
// TuneLibrary, so ids already saved in localStorage keep working), drop exact duplicates.
// Tunes that still fail a parse/bar-length check get `needs-repair` added to `%%tags`; the
// Tune Library hides those unless the picker's Tags filter asks for them.
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AbcOctave = createRequire(import.meta.url)(path.join(root, "apps/shared/abc-octave.js"));
const DATA = path.join(root, "apps/tunes/tunes-object.js");
const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const reportPath = args.includes("--report") ? args[args.indexOf("--report") + 1] : null;
const BAD_BAR_FRACTION = 0.25;     // more than this share of inner bars off-length → needs-repair
const HARD_WARNING = /closing quote|Duration not representable|Missing parameter/;

const ctx = { window: {}, console, navigator: { userAgent: "node" }, document: { createElement: () => ({}) } };
ctx.self = ctx.window; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "apps/shared/abcjs-basic.js"), "utf8"), ctx);
vm.runInContext(fs.readFileSync(DATA, "utf8") + ";this.T=tunesObject", ctx);
const ABC = ctx.ABCJS, T = ctx.T;

// same rule as TuneLibrary.slugify
const slugify = s => (s || "").toLowerCase().replace(/[—–]/g, "-").replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "tune";

const splitTunes = txt => txt.split(/\n(?=\s*X:)/);
const isHeader = l => /^[A-Za-z]:/.test(l) || /^%/.test(l);

function normalise(abc) {
  const lines = abc.split("\n");
  // 1. %%pagescale is not an abcjs directive
  //    and an empty `Q:` line makes abcjs warn and fall back to the default tempo
  let out = lines.filter(l => !/^%%\s*pagescale\b/.test(l) && !/^Q:\s*$/.test(l));
  // 2. a chord quote opened on one line and closed on the next ("^Intro\n") → join the lines
  const fixed = [];
  for (let i = 0; i < out.length; i++) {
    let l = out[i];
    // only for a dangling annotation ("^Intro): a chord can't start with ^ _ < > @, so the next quote is a closer
    while (!isHeader(l) && (l.match(/"/g) || []).length % 2 === 1 && /"[\^_<>@][^"]*$/.test(l) && i + 1 < out.length && /^\s*"/.test(out[i + 1])) {
      l = l.replace(/\s*$/, "") + out[i + 1].replace(/^\s*/, "");   // the next line's leading quote closes ours
      i++;
    }
    fixed.push(l);
  }
  out = fixed;
  // 3. `$` line breaks need I:linebreak $
  const body = out.filter(l => !isHeader(l)).join("\n");
  if (/\$/.test(body) && !out.some(l => /^I:\s*linebreak/.test(l))) {
    const k = out.findIndex(l => /^K:/.test(l));
    if (k >= 0) out.splice(k + 1, 0, "I:linebreak $");
  }
  return out.join("\n");
}


// ---- register: melodies whose median note is below middle C are lifted by whole octaves ----
// abcjs pitch 0 = middle C, 7 = the C above. Lead-sheet melodies centre around G4; the openbook
// import sits a full octave under every other source. We rewrite the note letters themselves
// (not `octave=`), so grading, the band and the chart all see the same pitches.
const pitchesOf = abc => {
  try {
    const r = ABC.parseOnly(abc)[0], ps = [];
    for (const line of r.lines || []) for (const st of line.staff || []) for (const v of st.voices)
      for (const e of v) if (e.el_type === "note" && e.pitches && !e.rest) e.pitches.forEach(p => ps.push(p.pitch));
    return ps;
  } catch (e) { return []; }
};
const quantile = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(q * (s.length - 1))]; };
const shiftOctaves = (abc, k) => AbcOctave.shift(abc, k);   // shared with the Tune Assessment octave control
// returns { abc, octaves } — octaves is 0 when left alone
function fixRegister(abc) {
  if (/^K:.*clef=(bass|alto|tenor)/m.test(abc)) return { abc, octaves: 0 };
  const ps = pitchesOf(abc);
  if (ps.length < 8) return { abc, octaves: 0 };
  const med = quantile(ps, 0.5);
  if (med >= 0) return { abc, octaves: 0 };
  const k = Math.ceil(-med / 7);
  if (quantile(ps, 0.95) + 7 * k > 15) return { abc, octaves: 0, skipped: "would rise above C6" };
  const out = shiftOctaves(abc, k), after = pitchesOf(out);
  if (after.length !== ps.length || after.some((p, i) => p !== ps[i] + 7 * k)) return { abc, octaves: 0, skipped: "pitch check failed" };
  return { abc: out, octaves: k };
}

function check(abc) {
  let r;
  try { r = ABC.parseOnly(abc)[0]; } catch (e) { return { fatal: true, bars: 0, bad: 0, warns: [String(e)] }; }
  const warns = (r.warnings || []).map(w => w.replace(/<[^>]*>/g, ""));
  const mt = r.getMeterFraction ? r.getMeterFraction() : { num: 4, den: 4 };
  const barLen = mt.num / mt.den, lens = [];
  let cur = 0, tup = 1;   // tup: abcjs leaves tuplet notes unscaled; startTriplet carries the multiplier, endTriplet closes it
  for (const line of r.lines || []) for (const st of line.staff || []) for (const v of st.voices || [])
    for (const e of v) {
      if (e.el_type === "note") {
        if (e.startTriplet && e.tripletMultiplier) tup = e.tripletMultiplier;
        cur += (e.duration || 0) * tup;
        if (e.endTriplet) tup = 1;
      }
      else if (e.el_type === "bar") { if (cur > 0) lens.push(cur); cur = 0; }
    }
  if (cur > 0) lens.push(cur);
  const inner = lens.slice(1, -1);          // first/last bars are pickup / final bar
  const bad = inner.filter(l => Math.abs(l - barLen) > 1e-6).length;
  // a tie must join two notes of the same pitch; a mismatch means one of them has the wrong octave
  let badTies = 0, prev = null;
  for (const line of r.lines || []) for (const st of line.staff || []) for (const v of st.voices) for (const e of v) {
    if (e.el_type !== "note" || e.rest || !e.pitches) continue;
    if (prev && prev.tie && e.pitches[0].pitch !== prev.p) badTies++;
    prev = { p: e.pitches[0].pitch, tie: !!e.pitches[0].startTie };
  }
  return { fatal: false, bars: inner.length, bad, badTies, warns };
}

function setDirective(abc, name, value) {
  const re = new RegExp("^%%\\s*" + name + "\\b.*$", "m");
  if (re.test(abc)) return abc.replace(re, `%%${name} ${value}`);
  const lines = abc.split("\n");
  const k = lines.findIndex(l => /^K:/.test(l));
  lines.splice(k >= 0 ? k : lines.length, 0, `%%${name} ${value}`);
  return lines.join("\n");
}
const getDirective = (abc, name) => (new RegExp("^%%\\s*" + name + "\\s+(.+)$", "m").exec(abc) || [])[1]?.trim() || "";
const musicOf = abc => abc.split("\n").filter(l => !isHeader(l)).join("\n").replace(/\s+/g, "");

const stats = { raised: 0, tunes: 0, dupesDropped: 0, normalised: 0, flagged: 0, idsAdded: 0, byColl: {} };
const report = [];
const usedIds = {}, seenMusic = {};
const result = {};

for (const [coll, txt] of Object.entries(T)) {
  const kept = [];
  const cs = stats.byColl[coll] = { n: 0, flagged: 0, dropped: 0 };
  for (const raw of splitTunes(txt)) {
    if (!raw.trim()) continue;                                   // whitespace left by the split
    if (!/^\s*X:/.test(raw)) { kept.push(raw.trim()); continue; }       // stray text between tunes
    stats.tunes++;
    let abc = normalise(raw.trim());
    if (abc !== raw.trim()) stats.normalised++;
    const title = (/^T:\s*(.*)$/m.exec(abc) || [])[1]?.trim() || "Untitled";

    // exact duplicate (same title, same notes and chords) → drop the later copy
    const sig = slugify(title) + "|" + musicOf(abc);
    if (musicOf(abc) && seenMusic[sig]) { stats.dupesDropped++; cs.dropped++; report.push({ coll, title, action: "dropped-duplicate" }); continue; }
    seenMusic[sig] = 1;

    // stable id: keep an existing one, else the TuneLibrary slug rule
    let id = getDirective(abc, "id");
    if (!id) { id = slugify(title); let n = 2; while (usedIds[id]) id = slugify(title) + "-" + (n++); stats.idsAdded++; }
    else if (usedIds[id]) { let n = 2; while (usedIds[id + "-" + n]) n++; id = id + "-" + n; }
    usedIds[id] = 1;
    abc = setDirective(abc, "id", id);

    // register
    const reg = fixRegister(abc);
    if (reg.octaves) { abc = reg.abc; stats.raised++; report.push({ coll, id, title, action: `raised ${reg.octaves} octave${reg.octaves > 1 ? "s" : ""}` }); }
    else if (reg.skipped) report.push({ coll, id, title, action: "register left low: " + reg.skipped });

    // quality gate
    const c = check(abc);
    const hard = c.warns.filter(w => HARD_WARNING.test(w));
    const reasons = [];
    if (c.fatal) reasons.push("parse error");
    if (c.bars > 3 && c.bad / c.bars > BAD_BAR_FRACTION) reasons.push(`${c.bad}/${c.bars} bars off-length`);
    if (c.badTies) reasons.push(`${c.badTies} tie${c.badTies > 1 ? "s" : ""} between different pitches (octave error)`);
    if (hard.length) reasons.push(hard[0].replace(/Music Line:\d+:\d+: /, "").slice(0, 80));
    const tags = getDirective(abc, "tags").split(",").map(s => s.trim()).filter(s => s && s !== "needs-repair");
    if (reasons.length) { tags.push("needs-repair"); stats.flagged++; cs.flagged++; }
    abc = tags.length ? setDirective(abc, "tags", tags.join(", ")) : abc.replace(/^%%\s*tags\b.*\n?/m, "");
    cs.n++;
    report.push({ coll, id, title, reasons, warnings: c.warns.length, bars: c.bars, bad: c.bad });
    kept.push(abc);
  }
  result[coll] = kept.join("\n\n") + "\n";
}

const esc = s => s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
const file = "const tunesObject = {\n" + Object.entries(result).map(([k, v]) => `${JSON.stringify(k)}:\n\`${esc(v)}\``).join(",\n\n") + "\n};\n";

// round-trip guard: the file we would write must evaluate to the same tunes
const ctx2 = {}; vm.createContext(ctx2); vm.runInContext(file + ";this.T2=tunesObject", ctx2);
const n2 = Object.values(ctx2.T2).reduce((a, v) => a + splitTunes(v).filter(s => /^\s*X:/.test(s)).length, 0);
if (n2 !== stats.tunes - stats.dupesDropped) { console.error("round-trip count mismatch", n2, stats); process.exit(1); }

console.log(JSON.stringify({ ...stats, byColl: undefined }, null, 1));
console.table(stats.byColl);
if (reportPath) fs.writeFileSync(reportPath, JSON.stringify(report, null, 1));
if (WRITE) { fs.writeFileSync(DATA, file); console.log("wrote", DATA); } else console.log("dry run (use --write)");
