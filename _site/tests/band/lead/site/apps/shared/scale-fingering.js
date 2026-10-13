// scale-fingering.js — keyboard scale fingering for the Scales tool.
//
// Source data: Robert T. Kelley, "Scale Fingering Chart"
//   https://www.robertkelleyphd.com/home/keyboard-scale-fingering-chart/
//   (c) 2001 Robert T. Kelley. Copying permitted for classroom and private
//   educational purposes; the web address, author's name and copyright notice must appear.
//
// Three ways a fingering is produced (hand.source):
//   'kelley'     the four charted types (Major, Natural/Harmonic/Melodic Minor), verbatim.
//   'rotated'    same pitch-class collection as a charted scale: rotate its fingering.
//                (All-white collections are the one explained exception, see ALL_WHITE.)
//   'generated'  any other seven-note scale: best rotation of 123 1234 under Kelley's rules.
// Anything that is not a seven-note scale returns null.

(function (global) {
  "use strict";

  const SOURCE = {
    title: "Scale Fingering Chart",
    author: "Robert T. Kelley",
    url: "https://www.robertkelleyphd.com/home/keyboard-scale-fingering-chart/",
    copyright: "© 2001 Robert T. Kelley. Copying permitted for classroom and private educational purposes."
  };

  const RULES = [
    { id: "a", text: "The fingering always alternates 123 1234 (or 321 4321) so that the same fingering pattern repeats every octave." },
    { id: "b", text: "The thumb always stays on the white keys, never on black keys." },
    { id: "c", text: "The fourth finger always plays a black key (when there is a black key to be played in the scale)." },
    { id: "d", text: "The fifth finger is only used at a starting place, a stopping place, or a turning-around place." },
    { id: "e", text: "The augmented second in harmonic minor scales must fit conveniently under the hand (preferably between 1 and 2 or 2 and 3), except for E♭/D♯ minor LH." },
    { id: "f", text: "When working out scale passages in the literature, consider alternatives that put the fingering patterns in alignment between the hands (thumbs happening together somewhere in the scale)." }
  ];

  const TYPES = ["Major", "Natural Minor", "Harmonic Minor", "Melodic Minor"];
  const TYPE_OFFSETS = {
    "Major": [0, 2, 4, 5, 7, 9, 11],
    "Natural Minor": [0, 2, 3, 5, 7, 8, 10],
    "Harmonic Minor": [0, 2, 3, 5, 7, 8, 11],
    "Melodic Minor": [0, 2, 3, 5, 7, 9, 11]
  };
  const BLACK = [1, 3, 6, 8, 10];
  const isBlack = pc => BLACK.indexOf(((pc % 12) + 12) % 12) >= 0;
  const RH_CYCLE = [1, 2, 3, 1, 2, 3, 4];   // ascending, RH
  const LH_CYCLE = [1, 4, 3, 2, 1, 3, 2];   // ascending, LH (321 4321 read upwards)
  const TRAD = { rh: "12312341", lh: "14321321" };

  // Each pair: major root, minor root, key labels, fifths, then per type [rh, lh, rhAlt, lhAlt].
  const N = null;
  const ROWS = [
    { maj: 0, min: 9, majL: "C", minL: "A", fifths: 0, c: {
      "Major": ["12312341", "14321321", N, N], "Natural Minor": ["12312341", "14321321", N, N],
      "Harmonic Minor": ["12312341", "32132143", N, N], "Melodic Minor": ["12312341", "21321432", N, "14321321"] } },
    { maj: 7, min: 4, majL: "G", minL: "E", fifths: 1, c: {
      "Major": ["12312341", "32132143", N, N], "Natural Minor": ["34123123", "14321321", N, N],
      "Harmonic Minor": ["12312341", "14321321", N, N], "Melodic Minor": ["12312341", "14321321", N, N] } },
    { maj: 2, min: 11, majL: "D", minL: "B", fifths: 2, c: {
      "Major": ["12312341", "21432132", N, N], "Natural Minor": ["34123123", "13214321", N, N],
      "Harmonic Minor": ["12312341", "13214321", N, N], "Melodic Minor": ["12312341", "13214321", N, N] } },
    { maj: 9, min: 6, majL: "A", minL: "F♯", fifths: 3, c: {
      "Major": ["12312341", "21321432", N, N], "Natural Minor": ["34123123", "43213214", N, N],
      "Harmonic Minor": ["34123123", "43213214", N, N], "Melodic Minor": ["23123412", "43213214", N, N] } },
    { maj: 4, min: 1, majL: "E", minL: "C♯", fifths: 4, c: {
      "Major": ["12312341", "14321321", N, N], "Natural Minor": ["34123123", "32143213", N, N],
      "Harmonic Minor": ["34123123", "32143213", N, N], "Melodic Minor": ["23123412", "32143213", N, N] } },
    { maj: 11, min: 8, majL: "B/C♭", minL: "G♯/A♭", fifths: 5, c: {
      "Major": ["12312341", "13214321", N, N], "Natural Minor": ["34123123", "32132143", N, N],
      "Harmonic Minor": ["34123123", "32143213", N, N], "Melodic Minor": ["34123123", "32143213", N, N] } },
    { maj: 6, min: 3, majL: "F♯/G♭", minL: "D♯/E♭", fifths: 6, c: {
      "Major": ["23412312", "43213214", N, N], "Natural Minor": ["31234123", "21432132", N, N],
      "Harmonic Minor": ["31234123", "21432132", N, N], "Melodic Minor": ["31234123", "21432132", N, N] } },
    { maj: 1, min: 10, majL: "C♯/D♭", minL: "A♯/B♭", fifths: -5, c: {
      "Major": ["23123412", "32143213", N, N], "Natural Minor": ["41231234", "21321432", N, N],
      "Harmonic Minor": ["41231234", "21321432", N, N], "Melodic Minor": ["41231234", "21432132", N, "21321432"] } },
    { maj: 8, min: 5, majL: "A♭", minL: "F", fifths: -4, c: {
      "Major": ["34123123", "32143213", N, N], "Natural Minor": ["12341231", "21321432", N, N],
      "Harmonic Minor": ["12341231", "21321432", N, N], "Melodic Minor": ["12341231", "21432132", N, N] } },
    { maj: 3, min: 0, majL: "E♭", minL: "C", fifths: -3, c: {
      "Major": ["31234123", "32143213", N, N], "Natural Minor": ["12312341", "21321432", N, "14321321"],
      "Harmonic Minor": ["12312341", "21321432", "23412312", "14321321"],
      "Melodic Minor": ["12312341", "21432132", "23412312", "14321321"] } },
    { maj: 10, min: 7, majL: "B♭", minL: "G", fifths: -2, c: {
      "Major": ["41231234", "32143213", N, N], "Natural Minor": ["23412312", "21321432", "12312341", "14321321"],
      "Harmonic Minor": ["12312341", "21321432", N, "14321321"],
      "Melodic Minor": ["12312341", "21432132", N, "14321321"] } },
    { maj: 5, min: 2, majL: "F", minL: "D", fifths: -1, c: {
      "Major": ["12341231", "32143213", N, N], "Natural Minor": ["23123412", "21321432", "12312341", "14321321"],
      "Harmonic Minor": ["12312341", "21321432", N, "14321321"],
      "Melodic Minor": ["12312341", "32132143", N, "14321321"] } }
  ];

  const toArr = s => s.split("").map(Number);
  const mod = (n, m) => ((n % m) + m) % m;
  const ordinal = n => ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th"][n];
  const pcsOf = (root, offs) => offs.slice(0, 7).map(o => mod(root + o, 12));

  // Raw transcription, one entry per cell.
  const KELLEY = ROWS.map(r => ({
    majorRootPc: r.maj, minorRootPc: r.min, majorLabel: r.majL, minorLabel: r.minL, fifths: r.fifths,
    types: TYPES.reduce((o, t) => {
      const c = r.c[t];
      o[t] = { rootPc: (t === "Major" ? r.maj : r.min), rh: c[0], lh: c[1], rhAlt: c[2], lhAlt: c[3] };
      return o;
    }, {})
  }));

  function charted(rootPc, type) {
    for (const r of KELLEY) {
      const cell = r.types[type];
      if (cell.rootPc === rootPc) return { row: r, cell };
    }
    return null;
  }
  const labelOf = (rootPc, type) => {
    const f = charted(rootPc, type);
    return type === "Major" ? f.row.majorLabel : f.row.minorLabel;
  };
  const sevenOf = s => toArr(s).slice(0, 7);
  // Rotate a 7-cycle to start at degree d, returning the 8-note string array.
  function rotate8(f8, d) {
    const c = f8.slice(0, 7), out = [];
    for (let i = 0; i < 8; i++) out.push(c[(d + i) % 7]);
    return out;
  }
  const eq = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

  // ---- checks -----------------------------------------------------------
  function augClass(fingers, offs, hand) {
    // classes ranked: null < 1-2 = 2-3 < 3-4 < cross
    let worst = null, rank = { "1-2": 1, "2-3": 1, "3-4": 2, "cross": 3 };
    for (let k = 0; k < 7; k++) {
      const next = k === 6 ? 12 : offs[k + 1];
      if (next - offs[k] !== 3) continue;
      const a = fingers[k], b = fingers[k + 1], lo = Math.min(a, b), hi = Math.max(a, b);
      const crossing = hand === "rh" ? b === 1 : a === 1;
      let cls;
      if (crossing) cls = "cross";
      else if (lo === 1 && hi === 2) cls = "1-2";
      else if (lo === 2 && hi === 3) cls = "2-3";
      else if (lo === 3 && hi === 4) cls = "3-4";
      else cls = "cross";
      if (!worst || rank[cls] > rank[worst]) worst = cls;
    }
    return worst;
  }
  function checksFor(fingers, rootPc, offs, hand) {
    const pcs = pcsOf(rootPc, offs);
    const hasBlack = pcs.some(isBlack);
    let thumbOnBlack = false, fourthWhite = false;
    for (let i = 0; i < 7; i++) {
      if (fingers[i] === 1 && isBlack(pcs[i])) thumbOnBlack = true;
      if (fingers[i] === 4 && !isBlack(pcs[i])) fourthWhite = true;
    }
    return { thumbOnBlack, fourthOnBlack: hasBlack ? !fourthWhite : null, aug2: augClass(fingers, offs, hand) };
  }
  function performedOf(fingers, hand) {
    const p = fingers.slice();
    if (hand === "rh" && p[7] === 1) p[7] = 5;      // top: no thumb-crossing at the turn-around
    if (hand === "lh" && p[0] === 1) p[0] = 5;      // bottom: start on 5 instead of a thumb that must be crossed
    return p;
  }
  const thumbsTogether = (rh, lh) => {
    const o = [];
    for (let i = 0; i < 7; i++) if (rh[i] === 1 && lh[i] === 1) o.push(i);
    return o;
  };

  // ---- generator --------------------------------------------------------
  // Hard-rule score for one candidate (7 fingers, ascending from the tonic).
  function ruleScore(f, rootPc, offs, hand) {
    const pcs = pcsOf(rootPc, offs), hasBlack = pcs.some(isBlack);
    let s = 0;
    for (let i = 0; i < 7; i++) {
      if (f[i] === 1 && isBlack(pcs[i])) s -= 1000;             // rule b
      if (hasBlack && f[i] === 4 && !isBlack(pcs[i])) s -= 200; // rule c
    }
    const f8 = f.concat([f[0]]);
    const a = augClass(f8, offs, hand);                         // rule e
    if (a === "3-4") s -= 40; else if (a === "cross") s -= 80;
    return s;
  }
  // Tie-breaks (soft), chosen by calibration against Kelley's own charts, no per-key special cases:
  //   +1 starts on the thumb (RH start / LH start = LH end).
  const softScore = f => (f[0] === 1 ? 1 : 0);

  function candidates(rootPc, offs, hand) {
    const cyc = hand === "rh" ? RH_CYCLE : LH_CYCLE, out = [];
    for (let d = 0; d < 7; d++) {
      const f = []; for (let i = 0; i < 7; i++) f.push(cyc[(d + i) % 7]);
      out.push({ f, rule: ruleScore(f, rootPc, offs, hand), soft: softScore(f), d });
    }
    return out;
  }
  const TOGETHER_BONUS = 0.5; // below the "starts on thumb" tie-break; see calibration in the test
  // Choose RH and LH jointly: rule score first, then thumbs-together and soft tie-breaks.
  function generate(rootPc, offs) {
    const R = candidates(rootPc, offs, "rh"), L = candidates(rootPc, offs, "lh");
    let best = null, all = [];
    for (const r of R) for (const l of L) {
      const tog = thumbsTogether(r.f.concat([r.f[0]]), l.f.concat([l.f[0]])).length;
      const total = r.rule + l.rule;
      const tie = r.soft + l.soft + TOGETHER_BONUS * (tog > 0 ? 1 : 0);
      all.push({ r, l, total, tie });
    }
    const topTotal = Math.max.apply(null, all.map(x => x.total));
    const pool = all.filter(x => x.total === topTotal);
    const topTie = Math.max.apply(null, pool.map(x => x.tie));
    const winners = pool.filter(x => x.tie === topTie);
    best = winners[0];
    return { best, winners, R, L };
  }

  // ---- public get -------------------------------------------------------
  function normalise(offsets) {
    if (!Array.isArray(offsets)) return null;
    let o = offsets.slice();
    if (o.length && o[o.length - 1] === 12) o.pop();
    if (o.length !== 7) return null;
    for (let i = 0; i < 7; i++) {
      if (!Number.isInteger(o[i]) || o[i] < 0 || o[i] > 11) return null;
      if (i && o[i] <= o[i - 1]) return null;
    }
    return o[0] === 0 ? o : null;
  }
  const mask = pcs => pcs.reduce((m, p) => m | (1 << p), 0);

  function findCharted(rootPc, offs) {
    for (const t of TYPES) if (eq(TYPE_OFFSETS[t], offs)) return { type: t, ...charted(rootPc, t) };
    return null;
  }
  // Parent preference: Major, then Harmonic Minor, then Melodic Minor (Natural Minor shares Major's keys).
  function findParent(rootPc, offs) {
    const m = mask(pcsOf(rootPc, offs));
    for (const t of ["Major", "Harmonic Minor", "Melodic Minor"]) {
      for (const r of KELLEY) {
        const cell = r.types[t];
        const pcs = pcsOf(cell.rootPc, TYPE_OFFSETS[t]);
        if (mask(pcs) === m) return { type: t, row: r, cell, degree: pcs.indexOf(rootPc) };
      }
    }
    return null;
  }
  const tradLabel = (s, hand) => (s === TRAD[hand] ? "traditional" : "Kelley alternate");

  function buildHand(hand, f8, rootPc, offs, extra) {
    return Object.assign({
      fingers: f8,
      performed: performedOf(f8, hand),
      alternates: [],
      source: "generated",
      parent: null,
      note: "",
      checks: checksFor(f8, rootPc, offs, hand)
    }, extra);
  }
  const hasNoBlack = pcs => !pcs.some(isBlack);

  function get(rootPc, offsets, scaleName) {
    if (!Number.isInteger(rootPc)) return null;
    rootPc = mod(rootPc, 12);
    const offs = normalise(offsets);
    if (!offs) return null;
    const hands = {};

    const direct = findCharted(rootPc, offs);
    if (direct) {
      const { type, cell, row } = direct;
      for (const h of ["rh", "lh"]) {
        const prim = toArr(cell[h]), altS = cell[h + "Alt"];
        hands[h] = buildHand(h, prim, rootPc, offs, {
          source: "kelley",
          alternates: altS ? [{ fingers: toArr(altS), label: tradLabel(altS, h) }] : [],
          note: "Kelley's chart: " + (type === "Major" ? row.majorLabel : row.minorLabel) + " " + type.toLowerCase() + "."
        });
      }
    } else {
      const par = findParent(rootPc, offs);
      if (par) {
        const pLabel = labelOf(par.cell.rootPc, par.type) + " " + par.type.toLowerCase();
        const parentInfo = { rootPc: par.cell.rootPc, type: par.type, degree: par.degree };
        const allWhite = hasNoBlack(pcsOf(rootPc, offs));
        for (const h of ["rh", "lh"]) {
          const pf = toArr(par.cell[h]);
          const rot = rotate8(pf, par.degree);
          if (allWhite) {
            // Kelley's A minor is the C major fingering unrotated (start on the thumb), because with no
            // black key nothing forces a choice. Do the same for every all-white mode.
            const f8 = toArr(TRAD[h]);
            hands[h] = buildHand(h, f8, rootPc, offs, {
              source: "rotated", parent: parentInfo,
              alternates: eq(rot, f8) ? [] : [{ fingers: rot, label: "rotated from " + pLabel + " (starts on its " + ordinal(par.degree) + " note)" }],
              note: "Same keys as " + pLabel + ", all white, so nothing forces a choice; like Kelley's A minor, start on the thumb."
            });
          } else {
            const alts = [];
            const altS = par.cell[h + "Alt"];
            if (altS) alts.push({ fingers: rotate8(toArr(altS), par.degree), label: "Kelley alternate, rotated" });
            hands[h] = buildHand(h, rot, rootPc, offs, {
              source: "rotated", parent: parentInfo, alternates: alts,
              note: "Same keys as " + pLabel + ", so the same fingering starting on its " + ordinal(par.degree) + " note."
            });
          }
        }
      } else {
        const g = generate(rootPc, offs);
        const b = g.best;
        for (const h of ["rh", "lh"]) {
          const c = h === "rh" ? b.r : b.l, pool = h === "rh" ? g.R : g.L;
          const f8 = c.f.concat([c.f[0]]);
          const alts = [];
          pool.filter(x => x.rule === c.rule && x.d !== c.d).slice(0, 2).forEach(x =>
            alts.push({ fingers: x.f.concat([x.f[0]]), label: "equally valid by the rules" }));
          hands[h] = buildHand(h, f8, rootPc, offs, {
            source: "generated", alternates: alts,
            note: "Not in Kelley's chart or a rotation of it; chosen from the seven rotations of 123 1234 by his rules (thumb on white, 4 on black, augmented second under 1-2 or 2-3), then thumbs together."
          });
        }
      }
    }
    return { rh: hands.rh, lh: hands.lh, thumbsTogether: thumbsTogether(hands.rh.fingers, hands.lh.fingers) };
  }

  // ---- chart ------------------------------------------------------------
  function chart() {
    const rows = [];
    for (const t of TYPES) for (const r of KELLEY) {
      const cell = r.types[t], rootPc = cell.rootPc, offs = TYPE_OFFSETS[t].concat([12]);
      const pcs = pcsOf(rootPc, offs), rh = toArr(cell.rh), lh = toArr(cell.lh);
      rows.push({
        rootPc, keyLabel: t === "Major" ? r.majorLabel : r.minorLabel, type: t, offsets: offs,
        fifths: r.fifths, blackKeys: pcs.filter(isBlack).length,
        rh: cell.rh, lh: cell.lh, rhAlt: cell.rhAlt, lhAlt: cell.lhAlt,
        rhFourthOn: pcs[rh.indexOf(4)], lhFourthOn: pcs[lh.indexOf(4)],
        thumbsTogether: thumbsTogether(rh, lh),
        rhStartsOnThumb: rh[0] === 1, lhStartsOnThumb: lh[0] === 1, lhEndsOnThumb: lh[7] === 1
      });
    }
    return rows;
  }

  // ---- relative major / natural minor analysis --------------------------
  function relativeAnalysis() {
    const out = [];
    for (const r of KELLEY) for (const h of ["rh", "lh"]) {
      const maj = r.types["Major"], min = r.types["Natural Minor"];
      const major = maj[h], minor = min[h], minAlt = min[h + "Alt"];
      const rotatedMajor = rotate8(toArr(major), 5).join("");
      const matches = minor === rotatedMajor;
      const altMatches = !!minAlt && minAlt === rotatedMajor;
      const pcs = pcsOf(r.majorRootPc, TYPE_OFFSETS["Major"]);
      const allWhite = hasNoBlack(pcs);
      const okRules = s => ruleAB(s, h, min.rootPc, TYPE_OFFSETS["Natural Minor"]);
      let reason;
      if (matches) reason = "Natural minor = relative major's fingering starting on its 6th note.";
      else if (allWhite) reason = "All white keys: nothing forces a choice, so Kelley uses the traditional start-on-thumb fingering for A minor instead of the rotation.";
      else if (altMatches) reason = "Kelley prints the rotation as his alternate; the primary is the traditional fingering.";
      else if (minAlt && minAlt === TRAD[h]) reason = "Primary is not the rotation, and the alternate is the traditional start-on-thumb fingering.";
      else reason = "Different from the rotation; both obey rules (a) and (b), so this is a choice among valid fingerings (typically " +
        (h === "lh" ? "a different alignment against the right hand" : "thumb or 5 placement at the start") + ").";
      out.push({
        majorRootPc: r.majorRootPc, minorRootPc: r.minorRootPc, hand: h,
        major, minor, rotatedMajor, matches, altMatches,
        minorAlt: minAlt, allWhite,
        minorObeysAB: okRules(minor), rotatedObeysAB: okRules(rotatedMajor),
        altObeysAB: minAlt ? okRules(minAlt) : null,
        reason
      });
    }
    return out;
  }
  function ruleAB(s, hand, rootPc, offs) {
    const f = toArr(s), cyc = hand === "rh" ? RH_CYCLE : LH_CYCLE;
    if (f.length !== 8 || f[7] !== f[0]) return false;
    let ok = false;
    for (let d = 0; d < 7; d++) if (cyc.every((_, i) => cyc[(d + i) % 7] === f[i])) ok = true;
    if (!ok) return false;
    return !checksFor(f, rootPc, offs, hand).thumbOnBlack;
  }

  const api = {
    SOURCE, RULES, KELLEY, TYPES, TYPE_OFFSETS,
    get, chart, relativeAnalysis,
    // exposed for tests / calibration
    _internals: { generate, candidates, rotate8, checksFor, findParent, normalise, ruleAB, RH_CYCLE, LH_CYCLE, TRAD, isBlack, pcsOf, toArr }
  };
  global.ScaleFingering = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
