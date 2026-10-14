#!/usr/bin/env node
// Generator for the nine engine-driven chord lessons (cadences, guide-tones, minor-changes,
// borrowed-chords, turnarounds, reharmonize, pop-changes-bass/-guitar/-piano).
//
// Each lesson is  scripts/chord-lessons/<name>.json = { title, body, init, [scripts] }
//   title   front-matter title      body  the prose and <div> hosts between the style block and the bottom strip
//   init    the object passed to ChordLesson.init(...) (see apps/shared/lessons/chord-lesson.js)
//   scripts optional: replaces the default list of <script src> lines (strings, without the tag)
// The shared page furniture (front matter, style block, bottom strip, script tags) lives below.
//
//   node scripts/chord-lessons.mjs --check            report whether generated output equals lessons/<name>.qmd
//   node scripts/chord-lessons.mjs --write [name...]  write lessons/<name>.qmd
//   node scripts/chord-lessons.mjs --extract          (re)build the JSON configs FROM the current .qmd files
//                                                     (only needed once, or to adopt hand edits of a .qmd)
// To bump a script version for all nine, edit SCRIPTS here and run --write.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfgDir = path.join(root, 'scripts/chord-lessons'), outDir = path.join(root, 'lessons');
const NAMES = ['cadences','guide-tones','minor-changes','borrowed-chords','turnarounds','reharmonize',
  'pop-changes-bass','pop-changes-guitar','pop-changes-piano'];

const STYLE = `<style>
.bl-widget{margin:1rem 0 1.6rem}
.bl-tools{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin-bottom:.5rem}
.bl-tools .btn{font-family:var(--font-mono);font-size:.8rem}
.bl-tools .btn.bl-on{background:var(--site-accent-dk);border-color:var(--site-accent-dk);color:#fff}
.bl-legend{font-size:.8rem;color:var(--site-ink-2);margin:.35rem 0 0}
.bl-legend i{display:inline-block;width:.9em;height:.9em;vertical-align:-.1em;background:rgba(217,130,43,.3);border:1px solid #d9822b;border-radius:2px;margin-right:.3em}
.tune-chart .tc-bar.bl-new{background:rgba(217,130,43,.16)}
.tune-chart .tc-bar.bl-new.tc-live{background:var(--tc-live-soft)}
.bl-slots{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:.6rem .8rem;margin-bottom:.8rem}
.bl-slots label{display:block;font-family:var(--font-mono);font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:var(--site-ink-2)}
.bl-slots select{width:100%}
.bl-count{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;max-width:26rem;margin:.6rem 0}
.bl-count div{border:1px solid var(--site-border);border-radius:4px;padding:.45rem 0;text-align:center;font-family:var(--font-mono);font-size:.85rem;color:var(--site-ink-3);background:var(--site-surface)}
.bl-count div.bl-ask{border:2px solid #d9822b;color:var(--site-ink)}
.bl-count div.bl-live{background:var(--site-accent-bg);color:var(--site-accent-text)}
.bl-answers{display:flex;flex-direction:column;gap:.4rem;max-width:34rem;margin:.6rem 0}
.bl-answers .btn{text-align:left}
.bl-answers .btn.bl-right{background:#e3f1e8;border-color:var(--site-pass);color:var(--site-pass)}
.bl-answers .btn.bl-wrong{background:#f8e4e2;border-color:var(--site-fail);color:var(--site-fail)}
.bl-verdict{font-weight:600;min-height:1.5em}
.bl-score{font-family:var(--font-mono);font-size:.8rem;color:var(--site-ink-2)}
.bl-abc{display:flex;flex-wrap:wrap;align-items:flex-start;gap:.5rem;margin:.3rem 0;overflow-x:auto}
.bl-abc .btn{font-family:var(--font-mono);font-size:.8rem;margin-top:.6rem}
.bl-abc .btn.bl-on{background:var(--site-accent-dk);border-color:var(--site-accent-dk);color:#fff}
.ls-on,.ls-on *{fill:#d6336c;stroke:#d6336c}
.bl-staff{margin:.4rem 0 0}
.bl-boards{display:flex;flex-wrap:wrap;gap:.6rem;align-items:flex-start;margin:.4rem 0}
.bl-boards svg{border:1px solid var(--site-border);border-radius:6px}
.bl-card{max-width:100%}
.bl-each .bl-card svg{width:215px}
body{padding-bottom:5.5rem}
#bl-bar{position:fixed;left:0;right:0;bottom:0;z-index:1020;background:var(--parch);border-top:1px solid var(--parch-edge);box-shadow:0 -6px 18px -12px rgba(0,0,0,.35);
  display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:.4rem 1rem;padding:.5rem .8rem;font-size:.85rem}
#bl-bar label{font-family:var(--font-mono);font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;color:var(--parch-dim);margin-right:.3rem}
#bl-bar select,#bl-bar input[type=number]{font-size:.85rem;padding:.15rem .3rem;border:1px solid var(--parch-edge);border-radius:4px;background:#fff}
#bl-bar input[type=number]{width:4.2rem}
#bl-bar input[type=range]{width:7rem;vertical-align:middle}
#bl-status{font-family:var(--font-mono);font-size:.75rem;color:var(--parch-dim);min-width:9rem}
</style>`;
const STRIP = `<div id="bl-bar">
  <span><label for="bl-key">Key</label><select id="bl-key"></select></span>
  <span><label for="bl-feel">Feel</label><select id="bl-feel"></select></span>
  <span><label for="bl-tempo">Tempo</label><input type="range" id="bl-tempo" min="40" max="220" step="2"> <input type="number" id="bl-tempo-n" min="40" max="220" step="2" aria-label="Tempo in beats per minute"></span>
  <span><label for="bl-inst">Chords</label><select id="bl-inst"><option value="piano">Piano</option><option value="guitar">Guitar</option><option value="organ">Organ</option></select></span>
  <span><input type="checkbox" id="bl-loop"> <label for="bl-loop">Loop</label></span>
  <button type="button" class="btn btn-sm btn-outline-secondary" id="bl-stop" disabled>■ Stop</button>
  <span id="bl-status" aria-live="polite"></span>
</div>`;
const SCRIPTS = ['/apps/shared/tonality.js?v=10','/apps/shared/lessons/key-tonality.js?v=1','/apps/shared/soundfont.js','/apps/shared/abcjs-basic.js','/apps/shared/abc-core.js?v=1',
  '/apps/tune-assessment/abc-tune.js?v=3','/apps/shared/abc-transpose.js?v=4','/apps/shared/lessons/score.js?v=4',
  '/apps/shared/lessons/tunes.js?v=5','/apps/shared/lessons/diagrams.js?v=1','/apps/shared/lessons/chord-staff.js?v=3',
  '/apps/shared/lessons/chord-lesson.js?v=2','/apps/shared/tune-chart.js?v=31','/apps/shared/voicings.js?v=5',
  '/apps/shared/band/harmony.js?v=28','/apps/shared/band/bass.js?v=13','/apps/shared/band/comp.js?v=28',
  '/apps/shared/band/catalog.js?v=33','/apps/shared/band/drums.js?v=15','/apps/shared/band/sounds.js?v=14',
  '/apps/shared/band/player.js?v=116'];

const FENCE = '```{=html}\n';
function render(c) {
  const scripts = (c.scripts || SCRIPTS).map(s => `<script src="${s}"></script>\n`).join('');
  return `---\ntitle: ${JSON.stringify(c.title)}\ntoc: true\ntoc-depth: 2\n---\n\n` +
    FENCE + STYLE + '\n```\n\n' + c.body +
    FENCE + STRIP + '\n\n' + scripts + '<script>\nChordLesson.init(' + JSON.stringify(c.init, null, 1) + ');\n</script>\n```\n';
}
function extract(text) {
  const m = text.match(/^---\ntitle: (".*")\ntoc: true\ntoc-depth: 2\n---\n\n/);
  if (!m) throw new Error('front matter differs');
  const rest = text.slice(m[0].length);
  const head = FENCE + STYLE + '\n```\n\n';
  if (!rest.startsWith(head)) throw new Error('style block differs from the shared one');
  const after = rest.slice(head.length);
  const k = after.lastIndexOf(FENCE + '<div id="bl-bar">');
  const body = after.slice(0, k), tail = after.slice(k);
  const pre = FENCE + STRIP + '\n\n';
  if (!tail.startsWith(pre)) throw new Error('bottom strip differs');
  const t = tail.slice(pre.length);
  const si = t.indexOf('<script>\nChordLesson.init(');
  const srcs = [...t.slice(0, si).matchAll(/<script src="([^"]+)"><\/script>\n/g)].map(x => x[1]);
  const js = t.slice(si + '<script>\nChordLesson.init('.length, t.lastIndexOf(');\n</script>\n```\n'));
  const c = { title: JSON.parse(m[1]), body, init: JSON.parse(js) };
  if (JSON.stringify(srcs) !== JSON.stringify(SCRIPTS)) c.scripts = srcs;
  return c;
}
// Compare two files by content with object keys sorted.
function extractNorm(t) { const c = extract(t); const srt = v => Array.isArray(v) ? v.map(srt) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, srt(v[k])])) : v; return srt(c); }
const [mode, ...names0] = process.argv.slice(2);
const names = names0.length ? names0 : NAMES;
if (mode === '--extract') {
  for (const n of NAMES) {
    const c = extract(fs.readFileSync(path.join(outDir, n + '.qmd'), 'utf8'));
    fs.writeFileSync(path.join(cfgDir, n + '.json'), JSON.stringify(c, null, 1) + '\n');
  }
  console.log('extracted', NAMES.length, 'configs');
} else if (mode === '--check' || mode === '--write') {
  let bad = 0;
  for (const n of names) {
    const out = render(JSON.parse(fs.readFileSync(path.join(cfgDir, n + '.json'), 'utf8')));
    const f = path.join(outDir, n + '.qmd'), cur = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
    const same = cur === out;
    // Same content, different text: JS puts integer-like keys (guide-tones' "251") first in an object.
    let equiv = false;
    try { equiv = !same && cur !== null && JSON.stringify(extractNorm(cur)) === JSON.stringify(extractNorm(out)); } catch (e) {}
    if (!same && !equiv) bad++;
    if (mode === '--write' && !same) fs.writeFileSync(f, out);
    console.log((same ? 'identical ' : equiv ? (mode === '--write' ? 'WRITTEN (key order only) ' : 'EQUIVALENT (differs only in key order) ') : mode === '--write' ? 'WRITTEN   ' : 'DIFFERS   ') + n);
  }
  if (mode === '--check' && bad) process.exit(1);
} else { console.log('usage: --check | --write [name...] | --extract'); process.exit(2); }
