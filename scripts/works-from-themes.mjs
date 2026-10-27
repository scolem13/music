// One-off: print a works-data.js entry for each Classical Theme that has a recording link (themes-data.js "yt"),
// so those links live in apps/shared/works/works-data.js with the rest. Run: node scripts/works-from-themes.mjs
import fs from "fs";
const src = fs.readFileSync(new URL("../apps/themes/themes-data.js", import.meta.url), "utf8");
const T = JSON.parse(src.slice(src.indexOf("["), src.lastIndexOf("]") + 1));
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60).replace(/-$/, "");
const out = {};
for (const t of T.filter((t) => t.yt)) {
  let id = slug(t.last + " " + t.title.split(",")[0] + " " + t.id);
  const m = /(?:youtu\.be\/|v=)([\w-]{11})(?:.*[?&]t=(\d+))?/.exec(t.yt);
  const rec = m ? { yt: m[1] } : { url: t.yt };
  if (m && m[2]) rec.start = +m[2];
  out[id] = { title: t.title, composer: t.first + " " + t.last, in: { theme: [t.id] }, recordings: [rec] };
}
console.log(JSON.stringify(out, null, 2));
