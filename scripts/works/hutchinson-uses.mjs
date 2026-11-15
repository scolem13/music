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
// Where each excerpt is in Hutchinson's own book: the PreTeXt source (github rhutchinson20/mt21c, fetched to ~/.cache/mt21c by
// hutchinson-figures.mjs) is read for every <video youtube=ID>; the page is the enclosing <section> (its xml:id + ".html"; a chapter with
// no sections is its own page) and the anchor the nearest subsection / figure with an xml:id. Matched by video id, else (the site swapped
// some dead videos) by the caption's quoted title. Without the cache, book = the book's home page.
const BOOK = "https://musictheory.pugetsound.edu/mt21c/", mt = path.join(process.env.HOME || "", ".cache/mt21c/src");
const byVideo = {}, byTitle = {};
if (fs.existsSync(mt)) for (const f of fs.readdirSync(mt).filter((x) => x.endsWith(".xml"))) {
  const stack = []; let cap = "";
  for (const ln of fs.readFileSync(path.join(mt, f), "utf8").split("\n")) {
    for (const m of ln.matchAll(/<(\/?)(chapter|section|subsection|subsubsection|figure|exploration|example)\b([^>]*?)(\/?)>/g)) {
      if (m[4]) continue;
      if (m[1]) { const k = stack.map((x) => x.tag).lastIndexOf(m[2]); if (k >= 0) stack.length = k; if (m[2] === "figure") cap = ""; }
      else stack.push({ tag: m[2], id: (/xml:id="([^"]+)"/.exec(m[3]) || [])[1] });
    }
    const cm = /<caption>(.*?)<\/caption>/.exec(ln); if (cm) cap = cm[1];
    const vm2 = /<video youtube="([\w-]{11})"/.exec(ln); if (!vm2) continue;
    const sec = [...stack].reverse().find((x) => (x.tag === "section" || x.tag === "chapter") && x.id);
    const anc = [...stack].reverse().find((x) => x.id && x !== sec && x.tag !== "chapter");
    if (!sec) continue;
    const href = BOOK + sec.id + ".html" + (anc ? "#" + anc.id : "");
    byVideo[vm2[1]] = byVideo[vm2[1]] || href;
    const q = /<q>(.*?)<\/q>/.exec(cap) || /<pubtitle>(.*?)<\/pubtitle>/.exec(cap) || /<em>(.*?)<\/em>/.exec(cap);
    if (q) { const k = norm(q[1].replace(/<[^>]+>/g, "")); if (k) byTitle[k] = byTitle[k] || href; }
  }
} else console.error("no " + mt + ": run scripts/works/hutchinson-figures.mjs first; book links go to the home page");
function bookByTitle(t) {      // the caption's title, with or without its "(Performer)"; else a book title it contains or that contains it
  const a = norm(t), b = norm(t.replace(/\s*\([^)]*\)\s*$/, "").replace(/^["“](.*)["”]$/, "$1"));
  if (byTitle[a] || byTitle[b]) return byTitle[a] || byTitle[b];
  const k = Object.keys(byTitle).find((k) => k.length > 6 && b.length > 6 && (k.includes(b) || b.includes(k)));
  return k ? byTitle[k] : null;
}
const items = [];
for (const f of fs.readdirSync(path.join(root, "theory")).filter((x) => x.endsWith(".qmd")).sort()) {
  const src = fs.readFileSync(path.join(root, "theory", f), "utf8");
  if (!/dr-yt/.test(src)) continue;
  const ptitle = decode((/^title:\s*"?(.*?)"?\s*$/m.exec(src) || [])[1] || f).replace(/:\s*Practice for.*$/, "");
  const page = f.replace(/\.qmd$/, ".html");
  const lines = src.split("\n"); let heads = [], fig = null, prev = ""; const used = {};
  const pandocId = (h) => h.replace(/[*_`]/g, "").toLowerCase().normalize("NFC").replace(/[^\p{L}\p{N}\s_.-]/gu, "").trim().replace(/\s+/g, "-").replace(/^[^\p{L}]+/u, "");
  const autoId = (h) => { const b = pandocId(h), n = used[b] = (used[b] == null ? 0 : used[b] + 1); return n ? b + "-" + n : b; };   // Quarto's id, -1 -2 on repeats
  const clean = (h) => h.replace(/^[\d.–-]+\s+/, "").replace(/\s*\{#.*\}$/, "").replace(/^Listen:\s*/i, "").trim();
  lines.forEach((ln, i) => {
    const hm = /^(#{2,3})\s+(.*)$/.exec(ln); if (hm) { const raw = hm[2].replace(/\s*\{.*\}$/, "").trim(), up = heads.filter((x) => !x.callout).pop();
      const callout = /^:::+\s*\{\.callout/.test(prev);                     // a callout's title: no anchor on the page, so link the heading above
      heads.push({ raw, callout, id: callout ? (up ? up.id : "") : (/\{#([^}\s]+)/.exec(hm[2]) || [])[1] || autoId(raw), line: i }); }
    if (ln.trim()) prev = ln.trim();
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
    const sec = lastHead && lastHead.id ? "#" + lastHead.id : "";                                // its {#id}, else Quarto's own
    items.push({ work: hit ? hit.id : "hutch-" + slug((composer ? composer.split(" ").pop() + " " : "") + title), title, composer, concept, note: sentence,
      url: `https://www.youtube.com/watch?v=${im[1]}${st ? "&t=" + st + "s" : ""}`,
      where: `${ptitle}, section "${lastHead ? clean(lastHead.raw) : ptitle}" (/theory/${page}${sec})`, mlt: undefined,
      more: [{ t: "In Hutchinson's book", href: byVideo[im[1]] || bookByTitle(title) || BOOK + "MusicTheory.html" },
             { t: "On this site: " + ptitle, href: `/theory/${page}${sec}` }] });
  });
}
items.forEach((x) => delete x.mlt);
const body = "// uses/hutchinson.js: where the site's theory pages hear a concept in a piece, from Robert Hutchinson's open textbook\n" +
  "// Music Theory for the 21st-Century Classroom (musictheory.pugetsound.edu/mt21c/), whose chapters the theory/ pages follow.\n" +
  "// GENERATED by scripts/works/hutchinson-uses.mjs from the video excerpts on those pages: do not edit by hand, rerun the script.\n" +
  "// Format: apps/shared/works/uses/ (see td-uses in works.js). note = the site's own wording; url = the YouTube video at the excerpt's start;\n" +
  "// more = [{t, href}]: the excerpt in Hutchinson's book (section page + anchor) and on this site's theory page.\n" +
  "(window.WORK_USES = window.WORK_USES || []).push(" + JSON.stringify({ src: "hutchinson", label: "Hutchinson, Music Theory for the 21st-Century Classroom",
    url: "https://musictheory.pugetsound.edu/mt21c/MusicTheory.html", items }, null, 1).replace(/\n\s*/g, (m, o, s) => "\n") + ");\n";
if (process.argv.includes("--print")) console.log(JSON.stringify(items.slice(0, 400), null, 1)); else { fs.writeFileSync(out, body); console.error("wrote " + items.length + " items to " + path.relative(root, out)); }
