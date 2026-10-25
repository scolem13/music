// The course data: glossary builds without errors, every enrichment link is a page on the site, option ids are unique,
// every MLT tag is a glossary term, and the pathway JSON is complete.
//   node tests/course/course-data.test.js
const fs = require("fs"), path = require("path"), vm = require("vm"), { execFileSync } = require("child_process");
const ROOT = path.resolve(__dirname, "../..");
let fails = 0; const check = (n, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + n + (info !== undefined ? "  " + info : "")); if (!ok) fails++; };

let built = true;
try { execFileSync("node", [path.join(ROOT, "scripts/course-glossary.mjs")], { stdio: "pipe" }); } catch (e) { built = false; console.log(String(e.stderr)); }
check("glossary.org builds (links, sources, TOK concepts all valid)", built);
const G = JSON.parse(fs.readFileSync(path.join(ROOT, "apps/shared/course/glossary.json"), "utf8"));
const slugs = new Set(G.terms.map(t => t.slug));
check("glossary has every group", ["Music vocabulary", "Command terms", "MYP assessment", "DP Music", "Music Learning Theory", "TOK"].every(g => G.groups.includes(g)));
check("every TOK concept is a term", G.tokConcepts.every(c => slugs.has(c)), G.tokConcepts.filter(c => !slugs.has(c)).join(","));
check("TOK connections exist", G.terms.filter(t => t.tok).length >= 20, G.terms.filter(t => t.tok).length);

const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(ROOT, "apps/shared/course/enrichment-data.js"), "utf8"), ctx);
const E = ctx.window.COURSE_ENRICHMENT;
const opts = E.STRANDS.flatMap(s => s.options), ids = opts.map(o => o.id).concat(E.CORE.map(c => c.id));
check("enrichment ids unique", new Set(ids).size === ids.length);
const page = href => { const f = href.replace(/^\//, "").replace(/\.html(#.*)?$/, ".qmd"); return fs.existsSync(path.join(ROOT, f)); };
const badLinks = opts.concat(E.CORE).flatMap(o => o.links.filter(l => !page(l[1])).map(l => o.id + " " + l[1]));
check("every enrichment link is a page", !badLinks.length, badLinks.join(", "));
const lv = new Set(E.LEVELS.map(l => l.slug));
check("every MLT tag is a level", opts.every(o => o.mlt === null || lv.has(o.mlt)), opts.filter(o => o.mlt && !lv.has(o.mlt)).map(o => o.id).join(","));
check("every MLT level is a glossary term", E.LEVELS.every(l => slugs.has(l.slug)), E.LEVELS.filter(l => !slugs.has(l.slug)).map(l => l.slug).join(","));
const Y = ["myp1", "myp2", "myp3", "myp4", "myp5", "dp"];
check("year ranges valid", opts.every(o => o.years.split("-").every(y => Y.includes(y))));
check("every MLT level has an option", E.LEVELS.every(l => opts.some(o => o.mlt === l.slug)), E.LEVELS.filter(l => !opts.some(o => o.mlt === l.slug)).map(l => l.slug).join(","));

const P = JSON.parse(fs.readFileSync(path.join(ROOT, "apps/shared/course/pathway.json"), "utf8"));
check("pathway: seven units in order", P.units.map(u => u.id).join() === "myp1,myp2,myp3,myp4.1,myp4.2,myp4.3,myp5.1", P.units.map(u => u.id).join());
check("pathway: each unit's new skills match the table", P.units.every(u => u.fullRun || P.strands.every(s => !!u.short[s] === !!u.detail[s])),
  P.units.filter(u => !u.fullRun && P.strands.some(s => !!u.short[s] !== !!u.detail[s])).map(u => u.id).join());
check("pathway: checklist covers every strand", P.strands.every(s => P.checklist.some(c => c.strand === s)));
check("pathway: rubric for every strand and stage", P.strands.every(s => [1, 3, 5].every(n => P.rubric[s].top[n])));
console.log(fails ? fails + " failed" : "all ok"); process.exit(fails ? 1 : 0);
