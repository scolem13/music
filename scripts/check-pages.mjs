#!/usr/bin/env node
// Site consistency check for pages and shared scripts. Run before committing a new page.
//
//   node scripts/check-pages.mjs            report problems (exit 1 if any version problems)
//   node scripts/check-pages.mjs --fix      every apps/ script loaded at its highest ?v= everywhere; ?v=1 added to
//                                           <script src> tags that have none
//   node scripts/check-pages.mjs --bump apps/shared/band/comp.js
//                                           raise that script's ?v= by one in every page and script that loads it
//                                           (CLAUDE.md rule 2, done in one step); a script whose own text changed
//                                           because of that (a lazy loader) is bumped in turn
//
// Checks:
//   versions   one script loaded at different ?v= numbers (browsers keep whichever copy came first)   [error]
//   unversioned  <script src="/apps/...js"> with no ?v= (never refreshes)                              [error]
//   synth      ABCJS.synth outside abc-play.js / cursor-synth.js (rule 3)                               [warning]
//   audiotap   new AudioContext in a file with no AudioTap.register (rule 3)                            [warning]
//   sections   lesson/theory/practice/tool page with no "## " heading (empty jump bar)                  [warning]
// Known older pages are listed as warnings so they can be switched one at a time; new pages should have none.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const FIX = args.includes("--fix");
const bumpAt = args.indexOf("--bump");
const BUMP = bumpAt >= 0 ? args[bumpAt + 1].replace(/^\//, "") : null;

const files = execSync("git ls-files '*.qmd' '*.js' '*.html'", { encoding: "utf8" })
  .split("\n").filter((f) => f && !/^(archive|_site|tests|node_modules)\//.test(f) && !/abcjs-basic\.js$/.test(f));

const REF = /\/?(apps\/[\w\/.-]+?\.(?:js|css))\?v=([\w.-]+)/g;
const text = Object.fromEntries(files.map((f) => [f, readFileSync(f, "utf8")]));

// versions in use
const uses = {}; // path -> {ver -> Set(files)}
for (const f of files) for (const m of text[f].matchAll(REF)) {
  ((uses[m[1]] ||= {})[m[2]] ||= new Set()).add(f);
}
const num = (v) => (/^\d+$/.test(v) ? +v : NaN);
const highest = (p) => Object.keys(uses[p] || {}).filter((v) => !isNaN(num(v))).reduce((a, v) => Math.max(a, num(v)), 0);

const changed = new Set();
function rewrite(f, fn) { const t = fn(text[f]); if (t !== text[f]) { text[f] = t; changed.add(f); } }

// a bump changes the files that load it; a loader that is itself an apps/ script is bumped in turn (its contents changed)
function bump(path, done) {
  if (done.has(path)) return; done.add(path);
  const next = highest(path) + 1, hit = [];
  for (const f of files) {
    const before = text[f];
    rewrite(f, (t) => t.replace(REF, (all, p) => (p === path ? all.replace(/\?v=[\w.-]+/, "?v=" + next) : all)));
    if (text[f] !== before) hit.push(f);
  }
  for (const f of files) for (const m of text[f].matchAll(REF)) if (m[1] === path) ((uses[path] ||= {})[String(next)] ||= new Set()).add(f);
  console.log(`${path} -> ?v=${next} in ${hit.length} files`);
  for (const f of hit) if (/^apps\/.*\.js$/.test(f) && uses[f]) bump(f, done);
}
if (BUMP) bump(BUMP, new Set());

const errors = [], warnings = [];
for (const [p, vers] of Object.entries(uses)) {
  if (Object.keys(vers).length < 2) continue;
  const top = String(highest(p));
  if (FIX && !BUMP) {
    for (const f of files) rewrite(f, (t) => t.replace(REF, (all, q) => (q === p ? all.replace(/\?v=[\w.-]+/, "?v=" + top) : all)));
  } else if (!BUMP) {
    errors.push(`versions  ${p}: ` + Object.entries(vers).map(([v, s]) => `v${v} (${[...s].join(", ")})`).join("; "));
  }
}

const UNV = /(<script[^>]*\ssrc=")(\/?apps\/[\w\/.-]+\.js)(")/g;
for (const f of files.filter((f) => /\.(qmd|html)$/.test(f))) {
  if (FIX) rewrite(f, (t) => t.replace(UNV, (a, pre, p, post) => pre + p + "?v=" + (highest(p.replace(/^\//, "")) || 1) + post));
  else for (const m of text[f].matchAll(UNV)) errors.push(`unversioned  ${f}: ${m[2]}`);
}

for (const f of files) {
  const t = text[f];
  if (/ABCJS\.synth/.test(t) && !/(abc-play|cursor-synth)\.js$/.test(f)) warnings.push(`synth  ${f}: uses ABCJS.synth, not AbcPlay.play`);
  if (/new\s*\(?\s*(window\.)?(webkit)?AudioContext|new \(window\.AudioContext/.test(t) && !/AudioTap\.register/.test(t))
    warnings.push(`audiotap  ${f}: AudioContext not registered with AudioTap`);
  if (/^(lessons|theory|practice|tools)\/[^_][^/]*\.qmd$/.test(f) && !/^## /m.test(t) && !/\{\{< include/.test(t))
    warnings.push(`sections  ${f}: no "## " headings`);
}

for (const f of changed) writeFileSync(f, text[f]);
if (FIX) console.log(`fixed ${changed.size} files; run again to check`);
for (const w of warnings) console.log("warning  " + w);
for (const e of errors) console.log("ERROR    " + e);
console.log(`${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length && !FIX && !BUMP ? 1 : 0);
