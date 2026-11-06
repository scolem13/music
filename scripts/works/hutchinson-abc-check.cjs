// hutchinson-abc-check.cjs — bar lengths of a short ABC excerpt, read by abcjs (apps/shared/abcjs-basic.js), voice by voice.
// Unlike scripts/when-in-rome/bar-check.cjs (whole pieces, 2% allowed off) every bar of an excerpt must be the meter's length,
// except: a pickup bar 0 (opts.pickup), and bars next to a repeat sign or double bar (a section's upbeat / the bar it completes).
// Inline [M:] changes are followed. Used by scripts/works/hutchinson-abc.mjs and tests/works/hutchinson-abc.test.js.
//   checkBars(abc, { pickup }) -> { bars, bad: [ "voice v bar i: len vs want" ], voices } or { error }
// Also: parseBars(abc) -> per voice the list of { start, end, len, want, type } bar spans in the source text (for cutting).
const fs = require("fs"), vm = require("vm"), path = require("path");
const ctx = { window: {}, console: { log() {}, warn() {}, error() {} }, navigator: { userAgent: "node" }, document: { createElement: () => ({}) } };
ctx.self = ctx.window; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.resolve(__dirname, "../../apps/shared/abcjs-basic.js"), "utf8"), ctx);

function parseBars(abc) {
  let t; try { t = ctx.ABCJS.parseOnly(abc)[0]; } catch (e) { return { error: String(e) }; }
  if (!t || !t.lines) return { error: "abcjs read no tune" };
  const mf = t.getMeterFraction(), first = mf.num / mf.den, V = {};
  t.lines.forEach(line => (line.staff || []).forEach((st, si) => (st.voices || []).forEach((v, vi) => {
    const s = V[si + "." + vi] = V[si + "." + vi] || { want: first, cur: 0, tup: 1, from: null, bars: [] };
    for (const e of v) {
      if (s.from === null && e.startChar >= 0 && e.el_type !== "bar") s.from = e.startChar;
      if (e.el_type === "note") {
        if (e.startTriplet && e.tripletMultiplier) s.tup = e.tripletMultiplier;
        s.cur += (e.duration || 0) * s.tup; if (e.endTriplet) s.tup = 1;
      } else if (e.el_type === "meter" && e.value && e.value[0]) s.want = e.value[0].num / e.value[0].den;
      else if (e.el_type === "bar") {
        s.bars.push({ start: s.from, end: e.endChar, len: s.cur, want: s.want, type: e.type, ending: e.startEnding });
        s.cur = 0; s.from = e.endChar;
      }
    }
  })));
  return { tune: t, voices: V };
}

function checkBars(abc, opts = {}) {
  const p = parseBars(abc);
  if (p.error) return p;
  const edge = x => /repeat|dbl|thin_thin|thick/.test(x || "");
  let bars = 0; const bad = [];
  for (const [k, { bars: L }] of Object.entries(p.voices)) L.forEach((b, i) => {
    if (b.len === 0 && i === L.length - 1) return;          // a bar line closing nothing
    if (i === 0 && opts.pickup) return;
    if (edge(b.type) || (i > 0 && edge(L[i - 1].type))) { if (b.len > b.want + 1e-6) bad.push(`voice ${k} bar ${i + 1}: ${b.len} over ${b.want}`); return; }
    bars++; if (Math.abs(b.len - b.want) > 1e-6) bad.push(`voice ${k} bar ${i + 1}: ${b.len} not ${b.want}`);
  });
  return { bars, bad, voices: Object.keys(p.voices).length };
}
module.exports = { checkBars, parseBars };
