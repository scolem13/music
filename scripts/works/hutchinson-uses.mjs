#!/usr/bin/env node
// hutchinson-uses.mjs: writes apps/shared/works/uses/hutchinson.js from the YouTube excerpts on the theory/ pages that follow
// Robert Hutchinson's open textbook (<figure><figcaption>…</figcaption><iframe class="dr-yt" src=".../embed/ID?start=&end=" title>).
// One item per excerpt. concept = the nearest ## / ### heading above it that is not just "Listen…" (numbering stripped), else the page's topic;
// title / composer are read from the caption ("Composer, Title: remark (Performer)"); work = an existing works-data.js id when the title and the
// composer's last name match one, else a new "hutch-…" id; where = page title + section; url = the page's section anchor.
// Rerun after editing those pages:  node scripts/works/hutchinson-uses.mjs   (--print to see without writing)
import fs from "node:fs"; import path from "node:path"; import vm from "node:vm"; import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const out = path.join(root, "apps/shared/works/uses/hutchinson.js");
const win = {}; vm.runInNewContext(fs.readFileSync(path.join(root, "apps/shared/works/works-data.js"), "utf8"), { window: win });
const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const slug = (s) => norm(s).replace(/ /g, "-").slice(0, 60);
const works = Object.entries(win.WORKS || {}).map(([id, w]) => ({ id, t: norm(w.title), c: norm((w.composer || "").split(" ").pop()) }));
const decode = (s) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();
const GENERIC = /^(listen|hear|watch|more |more$|examples?\b|musictheory\.net|practice|quiz|for teachers|additional|historical|the book['’]?s|"|“)|\?$/i;
const items = [];
for (const f of fs.readdirSync(path.join(root, "theory")).filter((x) => x.endsWith(".qmd")).sort()) {
  const src = fs.readFileSync(path.join(root, "theory", f), "utf8");
  if (!/dr-yt/.test(src)) continue;
  const ptitle = decode((/^title:\s*"?(.*?)"?\s*$/m.exec(src) || [])[1] || f).replace(/:\s*Practice for.*$/, "");
  const page = f.replace(/\.qmd$/, ".html");
  const lines = src.split("\n"); let heads = [], fig = null;
  const clean = (h) => h.replace(/^[\d.–-]+\s+/, "").replace(/\s*\{#.*\}$/, "").replace(/^Listen:\s*/i, "").trim();
  lines.forEach((ln, i) => {
    const hm = /^(#{2,3})\s+(.*)$/.exec(ln); if (hm) heads.push({ raw: hm[2].replace(/\s*\{#.*\}$/, "").trim(), id: (/\{#([^}\s]+)/.exec(hm[2]) || [])[1], line: i });
    const fm = /<figcaption>(.*?)<\/figcaption>/.exec(ln); if (fm) fig = decode(fm[1]);
    const im = /src="https:\/\/www\.youtube-nocookie\.com\/embed\/([\w-]{11})\?([^"]*)".*?title="([^"]*)"/.exec(ln);
    if (!im) return;
    const q = new URLSearchParams(im[2].replace(/&amp;/g, "&")), st = q.get("start"), en = q.get("end");
    let h = null; for (let k = heads.length - 1; k >= 0; k--) { const hr = heads[k].raw.replace(/^[\d.–-]+\s+/, ""); if (!GENERIC.test(hr) && !/^[a-z]/.test(hr)) { h = heads[k]; break; } }
    const lastHead = heads[heads.length - 1];
    const concept = h ? clean(h.raw) : ptitle;
    let cap = fig || decode(im[3]); fig = null;
    let note = "", fig_ref = "";
    const par = /\s*\(([^()]*)\)\s*$/.exec(cap); if (par) { fig_ref = par[1]; cap = cap.slice(0, par.index); }
    const colon = cap.indexOf(": "); if (colon > 0 && !/^"[^"]*$/.test(cap.slice(0, colon))) { note = cap.slice(colon + 2).trim(); cap = cap.slice(0, colon); }
    let composer = "", title = cap;
    const qm = /^["“]([^"”]+)["”],\s*(.*)$/.exec(cap); if (qm) { title = qm[1]; composer = qm[2].split(",")[0]; }
    const cm = /^([^",][^,"]*?),\s+(.+)$/.exec(cap); if (!qm && cm && !/^["“]/.test(cap)) { composer = cm[1]; title = cm[2]; }
    title = title.replace(/^["“](.*)["”]$/, "$1");
    const nt = norm(title), lc = norm(composer.split(" ").pop());
    const hit = works.find((w) => w.t && (w.t === nt || (nt.length > 8 && (w.t.includes(nt) || nt.includes(w.t)))) && (!lc || !w.c || w.c === lc));
    const when = st != null ? ` (${st}${en ? "–" + en : ""} s)` : "";
    const sentence = `Played on the ${ptitle} page to hear ${concept.charAt(0).toLowerCase() + concept.slice(1)}; the excerpt runs ${st}${en ? "–" + en : ""} s` +
      (note ? `. Listen for: ${note}` : "") + (fig_ref ? ` (${fig_ref})` : "") + ".";
    const sec = lastHead && lastHead.id ? "#" + lastHead.id : "";
    items.push({ work: hit ? hit.id : "hutch-" + slug((composer ? composer.split(" ").pop() + " " : "") + title), title, composer, concept, note: sentence,
      url: `https://www.youtube.com/watch?v=${im[1]}${st ? "&t=" + st + "s" : ""}`,
      where: `${ptitle}, section "${lastHead ? clean(lastHead.raw) : ptitle}" (/theory/${page}${sec})`, mlt: undefined });
  });
}
items.forEach((x) => delete x.mlt);
const body = "// uses/hutchinson.js: where the site's theory pages hear a concept in a piece, from Robert Hutchinson's open textbook\n" +
  "// Music Theory for the 21st-Century Classroom (musictheory.pugetsound.edu/mt21c/), whose chapters the theory/ pages follow.\n" +
  "// GENERATED by scripts/works/hutchinson-uses.mjs from the video excerpts on those pages: do not edit by hand, rerun the script.\n" +
  "// Format: apps/shared/works/uses/ (see td-uses in works.js). note = the site's own wording; url = the YouTube video at the excerpt's start.\n" +
  "(window.WORK_USES = window.WORK_USES || []).push(" + JSON.stringify({ src: "hutchinson", label: "Hutchinson, Music Theory for the 21st-Century Classroom",
    url: "https://musictheory.pugetsound.edu/mt21c/MusicTheory.html", items }, null, 1).replace(/\n\s*/g, (m, o, s) => "\n") + ");\n";
if (process.argv.includes("--print")) console.log(JSON.stringify(items.slice(0, 400), null, 1)); else { fs.writeFileSync(out, body); console.error("wrote " + items.length + " items to " + path.relative(root, out)); }
