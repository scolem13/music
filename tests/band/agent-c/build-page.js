// Extract the raw HTML block of the Chord Sheet tool into a standalone page for browser checks.
const fs = require("fs");
const src = fs.readFileSync("/Users/sean.coleman/Projects/everything-music-site/tools/_chord-sheet.qmd", "utf8");
const body = src.replace(/^```\{=html\}\n/, "").replace(/\n```\s*$/, "\n");
fs.writeFileSync(__dirname + "/chord-sheet.html", '<!doctype html><html><head><meta charset="utf-8"><title>chord sheet test</title>' +
  '<style>body{margin:12px;font-family:system-ui,sans-serif;background:#f7f4ef}</style></head><body>\n' + body + "</body></html>\n");
console.log("built", body.length);
