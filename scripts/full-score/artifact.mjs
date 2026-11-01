// artifact.mjs — one self-contained HTML page of a full score for a claude.ai Artifact (or anywhere offline): the site's own
// full-score.js, abc-play.js, ornament-play.js and band/sounds.js inlined unchanged, abcjs from jsDelivr (the site's version),
// and the MusyngKite samples the score's instruments use embedded as base64 (the Artifact frame blocks fetches to other hosts).
// A small fetch wrapper hands sounds.js the embedded samples by their "<instrument>-mp3/<note>.mp3" path; any other sample
// path gets a quick 404, which sounds.js skips.
//
//   node scripts/full-score/artifact.mjs score.abc out.html --title "…" --eyebrow "…" --subtitle "…" --id mozart40-iv [--notes notes.html]
//
// Samples are cached in ~/.cache/fullscore-sf/. Size: about 25 KB a sample, 11-16 samples an instrument.
import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import vm from "node:vm";

const here = path.dirname(new URL(import.meta.url).pathname), root = path.resolve(here, "../..");
const args = process.argv.slice(2), opt = k => { const i = args.indexOf("--" + k); return i >= 0 ? args[i + 1] : null; };
const [abcFile, outFile] = args.filter((a, i) => !a.startsWith("--") && !(i && args[i - 1].startsWith("--")));
const SF = "https://cdn.jsdelivr.net/gh/paulrosen/midi-js-soundfonts/MusyngKite/", CACHE = path.join(os.homedir(), ".cache/fullscore-sf");
const HOSTS = ["https://gleitz.github.io/midi-js-soundfonts/MusyngKite/", "https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/MusyngKite/"];
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const abc = fs.readFileSync(abcFile, "utf8");

// the site code, run here only to read what it needs: FullScore's parts and programs, AbcPlay's program -> sound, the sounds' zones
const ctx = { window: {}, console, navigator: { userAgent: "node" }, document: { createElement: () => ({}) } }; ctx.self = ctx.window; vm.createContext(ctx);
vm.runInContext(read("apps/shared/full-score.js").replace(/typeof window !== "undefined" \? window : this/, "window"), ctx);
vm.runInContext(read("apps/shared/band/sounds.js").replace(/\}\)\((typeof window[^)]*|window|this)\);?\s*$/, "})(window);"), ctx);
const S = ctx.window.FullScore.parse(abc), BS = ctx.window.BandSounds;
const gm = Function("return " + /var GM_SOUND = (\{[^}]*\})/.exec(read("apps/shared/abc-play.js"))[1])();
const gmSound = p => gm[p] || (p >= 32 && p < 40 ? "bass" : "piano");
const sounds = [...new Set(S.parts.map(p => gmSound(p.prog)))];
const src = read("apps/shared/band/sounds.js"), zones = [];
for (const s of sounds) {
  const m = new RegExp(`\\b${s}:\\s*\\{[^\\n]*soundfontZones\\(sf, "(\\w+)", (\\d+), (\\d+), (\\d+)\\)`).exec(src);
  if (!m) { console.error(`no soundfont zones for "${s}": it is left silent`); continue; }
  BS.soundfontZones(SF, m[1], +m[2], +m[3], +m[4]).forEach(z => zones.push(z.url.slice(SF.length)));
}
fs.mkdirSync(CACHE, { recursive: true });
const samples = {};
for (const z of zones) {
  const f = path.join(CACHE, z.replace(/\//g, "__"));
  if (!fs.existsSync(f)) {                          // jsDelivr rate-limits (403): the hosts sounds.js falls back to, in turn
    let ok = false;
    for (const base of [SF, ...HOSTS]) { try { const r = await fetch(base + z); if (r.ok) { fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); ok = true; break; } } catch (e) {} }
    if (!ok) { console.error("missing sample " + z); continue; }
  }
  samples[z] = fs.readFileSync(f).toString("base64");
}
console.error(`${S.parts.length} instruments, sounds ${sounds.join(" ")}, ${Object.keys(samples).length} samples`);

const ver = (/abcjs-basic v([\d.]+)/.exec(read("apps/shared/abcjs-basic.js")) || [, "6.6.3"])[1];
const inline = p => read(p).replace(/<\/script/gi, "<\\/script");
const esc = s => String(s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const title = opt("title") || (/^T:(.*)$/m.exec(abc) || [, "Full score"])[1].trim();
const notes = opt("notes") ? fs.readFileSync(opt("notes"), "utf8") : "";

const html = `<title>${esc(opt("tab") || title)}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Source+Sans+3:wght@400;600&family=IBM+Plex+Mono:wght@400&display=swap">
<style>
/* Layout: an engraver's proof. A header strip with the transport, the instrument views, then the score on its own paper sheet. */
:root {
  --ground: #e8e5de; --ink: #23211d; --muted: #66615a; --rule: #cbc5b8;
  --paper: #fffdf8; --accent: #7a2e2a; --on-accent: #fffdf8;
  --display: "Cormorant Garamond", "Iowan Old Style", Georgia, serif;
  --body: "Source Sans 3", "Segoe UI", system-ui, sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, Menlo, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --ground: #1b1a18; --ink: #ece7dc; --muted: #a39d90; --rule: #3d3a35; --paper: #f4f0e6; --accent: #d9897f; --on-accent: #1b1a18; color-scheme: dark } }
:root[data-theme="dark"] { --ground: #1b1a18; --ink: #ece7dc; --muted: #a39d90; --rule: #3d3a35; --paper: #f4f0e6; --accent: #d9897f; --on-accent: #1b1a18; color-scheme: dark }
body { background: var(--ground); color: var(--ink); font: 400 15px/1.55 var(--body);
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 26px 48px; }
.wrap { margin: 0 auto; display: grid; gap: 18px; }   /* the score uses the whole window; the text keeps its own measure */
header, .fs-bar, .fs-chips, .fs details, .notes { max-width: 1280px; }
header { border-bottom: 1px solid var(--rule); padding-bottom: 14px; }
.eyebrow { font: 600 11px/1.3 var(--body); letter-spacing: .14em; text-transform: uppercase; color: var(--accent); margin: 0 0 8px; }
h1 { font: 600 clamp(28px, 5vw, 44px)/1.05 var(--display); margin: 0; text-wrap: balance; }
h1 em { font-weight: 500; color: var(--muted); }
.meta { margin: 8px 0 0; color: var(--muted); max-width: 68ch; }
.fs { --fs-accent: var(--accent); --fs-rule: var(--rule); --fs-paper: var(--paper); }
.fs-bar { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5; background: var(--ground); padding-block: 8px; border-bottom: 1px solid var(--rule); }
body::before { content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 10; background: var(--ground); }
.fs-bar > button:not(.fs-chip), .fs-save button { font: 600 14px/1 var(--body); color: var(--on-accent); background: var(--accent); border: 0; border-radius: 3px; padding: 10px 16px; cursor: pointer; }
.fs-bar > button.fs-stop, .fs-save button { background: transparent; color: var(--ink); box-shadow: inset 0 0 0 1px var(--rule); }
.fs-bar label { color: var(--muted); } .fs-tempo { font: 400 13px var(--mono); color: var(--ink); }
.fs-status { font-family: var(--mono); color: var(--muted); }
.fs-q { width: 130px; accent-color: var(--accent); } .fs-follow, .fs-pick input { accent-color: var(--accent); }
.fs-chip[aria-pressed=true] { color: var(--on-accent); }
.fs details, .notes details { border-top: 1px solid var(--rule); padding-top: 10px; }
summary { cursor: pointer; font: 600 13px var(--body); }
.fs-fam h4 { color: var(--accent); font-family: var(--body); }
.fs-sheet { box-shadow: 0 1px 0 var(--rule), 0 12px 30px -20px rgba(0,0,0,.5); }
.fs-sheet.fs-paged { box-shadow: none; }
.fs-page { color: #1a1915; }
.fs-paper .abc-on { fill: #b3372f; }
.fs-src { background: var(--paper); color: #1a1915; padding: 12px; font-family: var(--mono); }
.fs-save input { border: 1px solid var(--rule); border-radius: 3px; background: var(--paper); color: #1a1915; }
button:focus-visible, input:focus-visible, summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.notes { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px 28px; font-size: 14px; }
.notes h2 { font: 600 20px/1.2 var(--display); margin: 0 0 6px; }
.notes p, .notes ul { margin: 0; color: var(--muted); } .notes ul { padding-left: 18px; } .notes li + li { margin-top: 4px; }
.fs-loading { color: var(--muted); font-family: var(--mono); font-size: 13px; padding: 30px 8px; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; scroll-behavior: auto !important; } }
</style>
<div class="wrap">
  <header>
    ${opt("eyebrow") ? `<p class="eyebrow">${esc(opt("eyebrow"))}</p>` : ""}
    <h1>${esc(title)}${opt("movement") ? ` <em>· ${esc(opt("movement"))}</em>` : ""}</h1>
    ${opt("subtitle") ? `<p class="meta">${esc(opt("subtitle"))}</p>` : ""}
  </header>
  <div id="score"><p class="fs-loading">Drawing the score…</p></div>
</div>
<script src="https://cdn.jsdelivr.net/npm/abcjs@${ver}/dist/abcjs-basic-min.js"></script>
<script id="fs-samples" type="application/json">${JSON.stringify(samples)}</script>
<script>
// embedded samples for sounds.js: served by path, no network
(function () {
  var S = JSON.parse(document.getElementById("fs-samples").textContent), real = window.fetch && window.fetch.bind(window);
  function bytes(b64) { var s = atob(b64), a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
  window.fetch = function (u, o) {
    var url = typeof u === "string" ? u : (u && u.url) || "", m = /([a-z0-9_]+-mp3\\/[A-G]b?-?\\d+\\.mp3)/.exec(url);
    if (m) return Promise.resolve(S[m[1]] ? new Response(bytes(S[m[1]]), { status: 200, headers: { "Content-Type": "audio/mpeg" } }) : new Response("", { status: 404 }));
    return real ? real(u, o) : Promise.reject(new Error("no fetch"));
  };
  window.BAND_SOUND_FALLBACKS = [];
})();
</script>
<script>${inline("apps/shared/band/sounds.js")}</script>
<script>${inline("apps/shared/ornament-play.js")}</script>
<script>${inline("apps/shared/abc-play.js")}</script>
<script>${inline("apps/shared/full-score.js")}</script>
<script type="text/plain" id="fs-abc">${abc.replace(/<\//g, "<\\/")}</script>
<script>
(function () {
  var abc = document.getElementById("fs-abc").textContent;
  var notes = ${JSON.stringify(notes)};
  function start() { document.getElementById("score").innerHTML = ""; window.score = FullScore.mount("#score", { abc: abc, id: ${JSON.stringify(opt("id") || "score")}, notes: notes }); }
  if (window.ABCJS) start(); else window.addEventListener("load", start);
})();
</script>
`;
fs.writeFileSync(outFile, html);
console.error(`wrote ${outFile}: ${(html.length / 1e6).toFixed(2)} MB`);
