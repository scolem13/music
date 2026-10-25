// node tests/band/arranger-styles.test.js: every Style Arranger style (apps/shared/band/arranger-styles.js). Each section's
// parts fill whole bars; the Bass and Phrase channels use only CM7 scale tones and the Chord and Pad channels only its chord
// tones (Genos RM p. 23); every section has every channel set up; every part, as written and converted to several
// chords, draws as ABC that abcjs reads with every bar full.
const path = require("path"), ROOT = path.resolve(__dirname, "../..");
global.window = global; global.document = { createElement: () => ({ getContext: () => null, style: {} }) }; global.navigator = { userAgent: "node" };
const ABCJS_ = require(ROOT + "/apps/shared/abcjs-basic.js"), ABCJS = global.ABCJS || ABCJS_;
const P = require(ROOT + "/apps/shared/band/phrase.js"), S = require(ROOT + "/apps/shared/band/style-engine.js"), A = require(ROOT + "/apps/shared/band/arranger-styles.js");
let n = 0, bad = 0; const ok = (c, m) => { n++; if (!c) { bad++; console.log("FAIL", m); } };
function bars(abc) {
  const t = ABCJS.parseOnly(abc)[0]; if (t.warnings && t.warnings.length) throw new Error(t.warnings.join("; ") + "\n" + abc);
  const out = []; let cur = 0, mult = 1;
  t.lines.forEach(l => (l.staff || []).forEach(st => st.voices[0].forEach(el => {
    if (el.startTriplet) mult = el.tripletMultiplier; if (el.el_type === "note") cur += el.duration * mult;
    if (el.endTriplet) mult = 1; if (el.el_type === "bar") { out.push(cur); cur = 0; } })));
  return out;
}
// the grid shorthand itself
const g = A.grid("C4 - . E4>|G4~ . C4E4G4' -");
ok(g.notes.length === 6 && g.notes[0].dur === 1 && g.notes[1].vel === 0.92 && g.notes[2].vel === 0.32 && g.notes[3].vel === 0.5 && g.notes[3].dur === 1, "grid: " + JSON.stringify(g.notes));
const d = A.drums({ kick: "X..g|x..." }); ok(d.bars === 2 && d.notes.length === 3 && d.notes[1].vel === 0.3 && d.notes[2].t === 1, "drums");
const SCALE = [0, 2, 4, 7, 9, 11], TONES = [0, 4, 7, 11], CHORDS = [{ root: 0, type: "M7" }, { root: 9, type: "m7" }, { root: 7, type: "7" }, { root: 5, type: "M" }, { root: 11, type: "m7b5" }, { root: 2, type: "dim7" }];
A.list.forEach(st => {
  ok(A.CHANNELS.every(c => st.channels[c]), st.name + ": every channel set up");
  ok(A.SECTIONS.every(s => st.sections[s]), st.name + ": every section there");
  Object.keys(st.sections).forEach(sn => {
    const sec = st.sections[sn], want = sec.bars * P.barQ(st.meter);
    Object.keys(sec.parts).forEach(cn => {
      const ph = sec.parts[cn], name = st.name + " / " + sn + " / " + cn, chn = st.channels[cn];
      ok(A.CHANNELS.includes(cn), name + ": a channel name");
      ok(ph.bars === sec.bars, name + ": " + ph.bars + " bars, section has " + sec.bars);
      ok(ph.notes.every(x => x.t >= 0 && x.t + x.dur <= want + 1e-9), name + ": notes inside the section");
      if (ph.kind === "pitch") {
        const allowed = /^(Bass|Phrase)/.test(cn) ? SCALE : TONES;
        const badN = ph.notes.filter(x => !allowed.includes(((x.pitch - st.source.root) % 12 + 12) % 12));
        ok(!badN.length, name + ": notes outside the " + (/^(Bass|Phrase)/.test(cn) ? "CM7 scale" : "CM7 chord tones") + ": " + badN.map(x => x.pitch));
        ok(chn.ntr !== "fixed" || chn.ntt !== "bypass", name + ": a pitched channel is converted");
      } else ok(chn.ntr === "fixed" && chn.ntt === "bypass", name + ": a rhythm channel is not converted (Genos RM p. 29)");
      const tries = ph.kind === "drum" ? [null] : [null].concat(CHORDS);
      tries.forEach(c => {
        try {
          const ns = ph.kind === "drum" ? P.resolve(ph) : c ? S.convertPhrase(P.resolve(ph), chn, st.source, Object.assign({ bass: c.root }, c)) : P.resolve(ph);
          if (c) ok(ns.every(x => x.midi >= (chn.lo || 0) && x.midi <= (chn.hi || 127)), name + " over " + S.chordName(c) + ": inside the note limit");
          const r = P.toAbc(ns, { meter: st.meter, bars: sec.bars, kind: ph.kind === "drum" ? "drum" : "pitch", title: "" });
          const b = bars(r.abc); ok(b.length === sec.bars && b.every(x => Math.abs(x - 1) < 1e-9), name + (c ? " over " + S.chordName(c) : "") + ": bars " + b);
        } catch (e) { ok(false, name + ": " + e.message); }
      });
    });
  });
});
console.log(bad ? bad + " of " + n + " FAILED" : "all " + n + " passed"); process.exit(bad ? 1 : 0);
