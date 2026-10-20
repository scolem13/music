// Import the classical themes into apps/themes/themes-data.js.  Usage: node scripts/import-themes.mjs
// Source: scripts/theme-sources/mtd/<id>.abc, the Musical Theme Dataset's engraved scores converted by
// scripts/convert-mtd.py (ids are the EDM numbers; -1 / -2 for themes MTD splits). A file in scripts/theme-fixes/
// with the same name wins. (The older midi2abc set in ../classical-music-themes is no longer used: unreliable.)
// Each theme: id, composer (last, first), title, recording link, ABC body, and values the page sorts on.
// --rough: the whole old set instead, as scripts/clean-rough-themes.mjs leaves it in scripts/theme-sources/rough/ (MTD's
// version where MTD has the theme, else the old midi2abc one with beams and accidentals tidied), into
// apps/themes/themes-rough-data.js, for the unlisted reference page tools/classical-themes-rough.qmd.
import fs from "node:fs";
import path from "node:path";

const ROUGH = process.argv.includes("--rough");
const src = path.resolve(ROUGH ? "scripts/theme-sources/rough" : "scripts/theme-sources/mtd");
const out = path.resolve(ROUGH ? "apps/themes/themes-rough-data.js" : "apps/themes/themes-data.js");
// catalogue numbers and dates (scripts/theme-works.py); keyed by the EDM number, so a split theme's parts share them
const WORKS = fs.existsSync("scripts/theme-sources/theme-works.json") ? JSON.parse(fs.readFileSync("scripts/theme-sources/theme-works.json", "utf8")) : {};
const ids = fs.readdirSync(src).filter((f) => f.endsWith(".abc")).map((f) => f.slice(0, -4)).sort();
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
function analyse(body, sig) {
  body = body.replace(/\{[^}]*\}/g, "")   // grace notes take no time
    .replace(/\[[A-Za-z]:[^\]]*\]/g, "");    // inline fields: [K:bass] clef changes, [M:2/4]
  const notes = [];
  let bars = 0, acc = {}, sinceBar = false;
  const re = /(\^\^|\^|__|_|=)?([A-Ga-gz])([,']*)(\d*)(\/*)(\d*)|(\|)|"[^"]*"|![^!]*!|\((\d)/g;
  let m, tup = 0, tupF = 1;
  while ((m = re.exec(body))) {
    if (m[8]) { tup = +m[8]; tupF = tup === 2 ? 1.5 : tup === 4 ? 0.75 : tup === 3 || tup === 6 ? 2 / 3 : (tup % 2 ? (tup - 1) : tup) / tup; continue; }   // (n: the next n notes in the time of 2 / 3
    if (m[7]) { if (sinceBar) bars++; sinceBar = false; acc = {}; continue; }
    sinceBar = true;
    if (!m[2]) continue;
    let len = m[4] ? +m[4] : 1;
    if (m[5]) len /= m[6] ? +m[6] : 2 ** m[5].length;
    if (tup > 0) { len *= tupF; tup--; }
    if (m[2] === "z") { notes.push({ rest: true, len }); continue; }
    const L = m[2].toUpperCase();
    let oct = m[2] === L ? 0 : 1;
    for (const c of m[3]) oct += c === "'" ? 1 : -1;
    const a = m[1] ? { "^": 1, "^^": 2, "_": -1, "__": -2, "=": 0 }[m[1]] : undefined;
    const key = L + oct;
    if (a !== undefined) acc[key] = a;
    const alt = acc[key] ?? sig[L] ?? 0;
    notes.push({ p: 60 + 12 * oct + STEP[L] + alt, len });
  }
  if (sinceBar) bars++;
  return { notes, bars };
}

const themes = [];
for (const id of ids) {
  // a hand-corrected file in scripts/theme-fixes/ wins over the source
  const fix = path.resolve("scripts/theme-fixes", id + ".abc"), fixed = !ROUGH && fs.existsSync(fix);
  const file = fixed ? fix : path.join(src, id + ".abc");
  const abc = fs.readFileSync(file, "utf8");
  const head = (k) => (abc.match(new RegExp("^" + k + ":\\s*(.*)$", "m")) || [])[1]?.trim() || "";
  const dir = (k) => (abc.match(new RegExp("^%%" + k + "\\s+(.*)$", "m")) || [])[1]?.trim() || "";
  const movement = head("N").replace(/\s*%.*$/, "");   // "Adagio sostenuto": the movement's tempo word or name
  let title = head("T"), [last, first = ""] = (dir("composer") || head("C")).split("|"), yt = dir("link");
  const twoVoice = /mtd-two-voice\/(\S+\.abc)/.exec(abc);
  // a key written with its mode ("Amin": 10 of MTD's scores) is minor for certain; read the signature from its major
  const kf = head("K").replace(/\s*%.*/, "").split(/\s+/)[0], km = /^([A-G][b#]?)(m|min|minor)$/i.exec(kf);
  const key = km && MINOR.includes(km[1] + "m") ? ORDER[MINOR.indexOf(km[1] + "m")] : kf;   // same index = same signature
  const meter = head("M"), unit = head("L");
  const body = abc.slice(abc.search(/^K:.*$/m)).replace(/^K:.*\n?/, "");
  const { fifths, sig } = keySig(key);
  const { notes, bars } = analyse(body, sig);
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
  if (km) { minor = true; from = "score"; }
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
    ...(ROUGH ? { from: dir("from") || "edm", ...(dir("repaired") ? { repaired: dir("repaired") } : {}) } : {}),   // rough page: "mtd" (the corrected version) or "edm" (midi2abc, tidied)
    ...(twoVoice ? { twoVoice: "scripts/theme-sources/mtd-two-voice/" + twoVoice[1] } : {}),
  });
}

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out,
  "// Generated by scripts/import-themes.mjs" + (ROUGH ? " --rough from scripts/theme-sources/rough (" : " from scripts/theme-sources/mtd (") + themes.length + " themes). Do not edit.\n" +
  "window.CLASSICAL_THEMES = " + JSON.stringify(themes) + ";\n");
console.log("wrote", out, themes.length, "themes,", (fs.statSync(out).size / 1e6).toFixed(1), "MB");
