// hutchinson-figures.mjs — the notated figure beside each Hutchinson YouTube clip, as an image to transcribe.
//   node scripts/works/hutchinson-figures.mjs
// Hutchinson's book source (github.com/rhutchinson20/mt21c, GPL-3.0; the site's theory pages embed its clips) puts each
// listening clip in a <figure> with a <caption>, an engraved <image source> (PDF + SVG in images/) and the <video youtube start end>.
// Writes research_notes/hutchinson-figures.json (clip key "<video>-<start>" -> caption, chapter, image) and caches each figure as
// PNG in ~/.cache/mt21c/ (PDF -> PNG with macOS QuickLook, qlmanage). Nothing here is copied onto the site; the PNGs are for transcribing.
import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import { execFileSync } from "node:child_process";
const here = path.dirname(new URL(import.meta.url).pathname), root = path.join(here, "../..");
const RAW = "https://raw.githubusercontent.com/rhutchinson20/mt21c/HEAD/", CACHE = path.join(os.homedir(), ".cache/mt21c");
fs.mkdirSync(CACHE, { recursive: true });
const fetchRetry = async (u) => { for (let k = 0; ; k++) { try { return await fetch(u); } catch (e) { if (k >= 4) throw e; await new Promise(r => setTimeout(r, 1500 * (k + 1))); } } };
const get = async (u, f) => { if (fs.existsSync(f)) return fs.readFileSync(f); const r = await fetchRetry(u); if (!r.ok) throw new Error(u + " " + r.status);
  const b = Buffer.from(await r.arrayBuffer()); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, b); return b; };
const tree = JSON.parse(await get("https://api.github.com/repos/rhutchinson20/mt21c/git/trees/HEAD?recursive=1", path.join(CACHE, "tree.json")));
const files = new Set(tree.tree.map(t => t.path));
const out = {};
for (const src of [...files].filter(p => /^src\/[^/]+\.xml$/.test(p))) {
  const xml = (await get(RAW + src, path.join(CACHE, src))).toString();
  for (const fig of xml.match(/<figure[\s\S]*?<\/figure>/g) || []) {
    const vids = [...fig.matchAll(/<video youtube="([^"]+)"(?: start="(\d+)")?(?: end="(\d+)")?/g)];
    const imgs = [...fig.matchAll(/<image source="([^"]+)"/g)].map(m => m[1]);
    if (!vids.length || !imgs.length) continue;
    const caption = ((/<caption>([\s\S]*?)<\/caption>/.exec(fig) || [])[1] || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    for (const v of vids) {
      const key = v[1] + "-" + (v[2] || 0), pngs = [];
      for (const im of imgs) {
        const pdf = im + ".pdf"; if (!files.has(pdf)) continue;
        const local = path.join(CACHE, pdf), png = local + ".png";
        await get(RAW + pdf, local);
        // QuickLook draws the PDF (sips reports success on these but writes nothing)
        if (!fs.existsSync(png)) execFileSync("qlmanage", ["-t", "-s", "1800", "-o", path.dirname(local), local], { stdio: "ignore" });
        pngs.push(png);
      }
      out[key] = { video: v[1], start: +(v[2] || 0), end: v[3] ? +v[3] : null, caption, chapter: path.basename(src, ".xml"), images: imgs, png: pngs };
    }
  }
}
fs.writeFileSync(path.join(root, "research_notes/hutchinson-figures.json"), JSON.stringify(out, null, 1));
console.log(Object.keys(out).length, "clips with a figure;", Object.values(out).filter(o => !o.png.length).length, "without a PDF image");
