// Detects what each lesson page shows and writes it into that lesson's front matter as has: [...], for the "Has"
// filter of the Lessons listing (lessons/index.qmd lists the lessons under listing: contents:). It opens every rendered lesson in headless Chrome (so widgets drawn by script count):
//   band      the page loads the backing band (apps/shared/band/player.js)
//   notation  western notation drawn by abcjs
//   fingering a fretboard, keyboard, tab or bend diagram from LessonDiagrams (apps/shared/lessons/diagrams.js)
//   interactive controls other than play / stop / a band part on or off / the fixed play bar, and other than the band, notation and fingering
//   svg       other drawings (an svg not counted above, bigger than an icon)
//   images    <img> (or a CSS background image) in the lesson, bigger than an icon
// Run after rendering the lessons into _site:  node scripts/lesson-features.cjs   (--dry prints without writing)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, ".."), SITE = ROOT + "/_site", INDEX = ROOT + "/lessons/index.qmd";
const { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const DRY = process.argv.includes("--dry");
const types = { js: "text/javascript", css: "text/css", svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", json: "application/json", woff2: "font/woff2" };
const srv = http.createServer((q, s) => { let f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0])); if (f.endsWith("/")) f += "index.html";
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": types[f.split(".").pop()] || "text/html" }); s.end(d); }); }).listen(8523);

// Marks every svg LessonDiagrams returns, before any page script runs.
const HOOK = `(() => { let v; const mark = r => { if (r && r.setAttribute) r.setAttribute('data-lf-fing', ''); return r; };
  Object.defineProperty(window, 'LessonDiagrams', { configurable: true, get: () => v, set: o => {
    if (o) for (const k of Object.keys(o)) if (typeof o[k] === 'function') { const f = o[k]; o[k] = function () { return mark(f.apply(this, arguments)); }; }
    v = o; } }); })();`;

const SCAN = `(() => {
  const main = document.querySelector('main') || document.body, big = el => { const r = el.getBoundingClientRect(); return r.width > 40 || r.height > 40; };
  const fixed = el => { for (let e = el; e && e !== document.body; e = e.parentElement) if (getComputedStyle(e).position === 'fixed') return true; return false; };
  const has = new Set();
  if ([...document.scripts].some(s => /\\/apps\\/shared\\/band\\/player\\.js/.test(s.src))) has.add('band');
  const svgs = [...main.querySelectorAll('svg')].filter(s => !s.parentElement.closest('svg'));
  const kind = s => s.closest('[data-lf-fing]') ? 'fingering' : (s.closest('.abcjs-container, [class*="abcjs"]') || s.querySelector('[class*="abcjs-"]')) ? 'notation' : null;
  for (const s of svgs) { const k = kind(s); if (k) has.add(k); else if (big(s) && !fixed(s)) has.add('svg'); }
  if ([...main.querySelectorAll('img')].some(i => big(i) && !fixed(i))) has.add('images');
  // a CSS background picture counts, not the arrow Bootstrap draws in a <select> (a data: svg)
  if ([...main.querySelectorAll('*')].some(e => !e.matches('select, input') && /url\\("?(?!data:image\\/svg)/.test(getComputedStyle(e).backgroundImage) && big(e))) has.add('images');
  // the band's own buttons: play / stop, a part on or off, open the song in the Backing Track
  const play = /^\\s*(▶|■|⏹|⏸|►|play|stop|pause|loop|hear\\b|(bass|piano|drums|congas|guitar|organ|horns?|strings|melody)\\s*$|open in the backing track)/i;
  const ctl = [...main.querySelectorAll('button, input, select, textarea, canvas, [contenteditable="true"], [draggable="true"], [role="slider"], [role="button"]')]
    .filter(e => !fixed(e) && !e.closest('#TOC, nav, .quarto-title-block, footer, .callout-header, .code-copy-button, .sourceCode'))
    .filter(e => !(e.matches('button, [role="button"]') && play.test(e.textContent || e.getAttribute('aria-label') || '')))
    .filter(e => !e.closest('[data-lf-fing]') && !e.closest('.abcjs-container'));
  if (ctl.length) has.add('interactive');
  return ['band', 'notation', 'fingering', 'interactive', 'svg', 'images'].filter(k => has.has(k));
})()`;

(async () => {
  const src = fs.readFileSync(INDEX, "utf8");
  const listed = src.slice(src.indexOf("  contents:"), src.indexOf("\n---", 4));
  const pages = [...listed.matchAll(/^\s+- (\S+)\.qmd$/gm)].map(m => m[1] + ".html");
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  await b.send("Page.addScriptToEvaluateOnNewDocument", { source: HOOK });
  const found = {};
  for (const p of pages) {
    if (!fs.existsSync(path.join(SITE, "lessons", p))) { console.log("not rendered  " + p); continue; }
    await b.goto("http://127.0.0.1:8523/lessons/" + p); await b.sleep(2500);
    found[p] = await b.eval(SCAN).catch(e => { console.log("FAIL " + p + " " + e.message); return null; });
    console.log(p.padEnd(34) + (found[p] || []).join(" "));
  }
  await b.close(); srv.close();
  if (DRY) return;
  for (const p of pages) {
    if (!found[p]) continue;
    const f = path.join(ROOT, "lessons", p.replace(/\.html$/, ".qmd")), t = fs.readFileSync(f, "utf8"), end = t.indexOf("\n---", 4);
    const head = t.slice(0, end).replace(/\nhas:.*/, "") + "\nhas: [" + found[p].join(", ") + "]";
    fs.writeFileSync(f, head + t.slice(end)); console.log("wrote " + path.relative(ROOT, f));
  }
})().catch(e => { console.error(e); process.exit(1); });
