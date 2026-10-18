// Records every chord shape the lessons draw, so the Chord Library can say where each one is taught.
// Opens each rendered lesson (_site/lessons/**/*.html) in headless Chrome, catches every LessonDiagrams.fretboard / keyboard call,
// keeps the ones that are chords (guitar in standard tuning or 4-string bass: at most one note per string and two notes or more;
// keyboard: one lane of notes), finds the heading each diagram sits under, and writes apps/shared/chord-taught-data.js:
//   window.ChordTaughtData = [{ inst: "guitar" | "bass" | "keyboard", key: "xx0003" | "55,59,62", label, lesson, title, section, anchor }]
// key: guitar/bass frets lowest string first (x = not played, "-" between frets when one is 10 or more, as the library writes them);
// keyboard: MIDI notes low to high. The library matches its voicings on this key alone.
// Run after rendering the lessons into _site:  node scripts/chord-taught.cjs   (--dry prints without writing)
// Only what a page draws at load is seen (the first key, the default menus).
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, ".."), SITE = ROOT + "/_site", OUT = ROOT + "/apps/shared/chord-taught-data.js";
const { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const DRY = process.argv.includes("--dry");
const types = { js: "text/javascript", css: "text/css", svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", json: "application/json", woff2: "font/woff2" };
const srv = http.createServer((q, s) => { let f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0])); if (f.endsWith("/")) f += "index.html";
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": types[f.split(".").pop()] || "text/html" }); s.end(d); }); }).listen(8524);

// Wraps LessonDiagrams before any page script runs: each call's chords are kept with the svg it returned.
const HOOK = `(() => { let v; window.__ctCalls = [];
  Object.defineProperty(window, 'LessonDiagrams', { configurable: true, get: () => v, set: o => {
    if (o) ['fretboard', 'keyboard'].forEach(k => { const f = o[k]; if (typeof f !== 'function') return;
      o[k] = function (chords, opt) { const svg = f.apply(this, arguments);
        try { window.__ctCalls.push({ kind: k, svg, strings: (opt && opt.strings) || null, chords: JSON.parse(JSON.stringify((chords || []).map(c => ({ label: c.label, notes: c.notes })))) }); } catch (e) {}
        return svg; }; });
    v = o; } }); })();`;

const SCAN = `(() => {
  const out = [], h1 = document.querySelector('h1.title, h1');
  const title = (h1 ? h1.textContent : document.title).trim();
  function heading(svg) {   // the nearest h2/h3 before the diagram in document order, and its section's id
    const hs = [...document.querySelectorAll('main h2, main h3')]; let best = null;
    for (const h of hs) if (h.compareDocumentPosition(svg) & Node.DOCUMENT_POSITION_FOLLOWING) best = h;
    if (!best) return { section: '', anchor: '' };
    const sec = best.closest('section[id]'); return { section: best.textContent.replace(/^\\s*[\\d.]+\\s*/, '').trim(), anchor: sec ? sec.id : (best.id || '') };
  }
  for (const c of window.__ctCalls || []) {
    if (!c.svg || !document.contains(c.svg)) continue;
    const where = heading(c.svg);
    c.chords.forEach(ch => {
      const notes = ch.notes || []; if (notes.length < 2) return;
      if (c.kind === 'keyboard') { out.push({ inst: 'keyboard', key: notes.map(n => n.midi).sort((a, b) => a - b).join(','), label: ch.label, ...where }); return; }
      const s = (c.strings || ['E','A','D','G','B','E']).join(''), inst = s === 'EADGBE' ? 'guitar' : s === 'EADG' ? 'bass' : null; if (!inst) return;
      const frets = Array(s.length).fill(null), seen = {};
      for (const n of notes) { if (seen[n.string] || n.fret == null) return; seen[n.string] = 1; frets[n.string] = n.fret; }
      out.push({ inst, key: frets.map(f => f == null ? 'x' : f).join(frets.some(f => f > 9) ? '-' : ''), label: ch.label, ...where });
    });
  }
  return { title, list: out };
})()`;

function pages(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => d.isDirectory() ? pages(path.join(dir, d.name)) : d.name.endsWith('.html') ? [path.join(dir, d.name)] : []); }

(async () => {
  const files = pages(SITE + "/lessons").map(f => path.relative(SITE, f)).filter(f => !/(^|\/)index\.html$/.test(f)).sort();
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  await b.send("Page.addScriptToEvaluateOnNewDocument", { source: HOOK });
  const all = [], seen = new Set();
  for (const f of files) {
    await b.goto("http://127.0.0.1:8524/" + f); await b.sleep(1800);
    const r = await b.eval(SCAN).catch(e => { console.log("FAIL " + f + " " + e.message); return null; });
    if (!r || !r.list.length) continue;
    let n = 0;
    r.list.forEach(x => { const id = [x.inst, x.key, f, x.anchor].join('|'); if (seen.has(id)) return; seen.add(id); n++;
      all.push({ inst: x.inst, key: x.key, label: x.label, lesson: f, title: r.title, section: x.section, anchor: x.anchor }); });
    console.log(f.padEnd(44) + n + " shapes");
  }
  await b.close(); srv.close();
  console.log(all.length + " shapes in all");
  if (DRY) return;
  fs.writeFileSync(OUT, "// Written by scripts/chord-taught.cjs: every chord shape a lesson draws, for the Chord Library's \"Taught in\". Do not edit by hand.\n" +
    "window.ChordTaughtData = [\n" + all.map(x => "  " + JSON.stringify(x)).join(",\n") + "\n];\n");
  console.log("wrote " + path.relative(ROOT, OUT));
})().catch(e => { console.error(e); process.exit(1); });
