// Extract the raw HTML block of a Chord Sheet .qmd into a standalone page: node build-page.js [src.qmd] [out.html]
const fs = require("fs");
const src = fs.readFileSync(process.argv[2] || "/Users/sean.coleman/Projects/everything-music-site/tools/_chord-sheet.qmd", "utf8");
const body = src.replace(/^```\{=html\}\n/, "").replace(/\n```\s*$/, "\n");
fs.writeFileSync(__dirname + "/" + (process.argv[3] || "chord-sheet.html"), '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>chord sheet test</title>' +
  '<style>body{margin:12px;font-family:system-ui,sans-serif;background:#f7f4ef}</style></head><body>\n' + body + "</body></html>\n");
console.log("built", body.length);
