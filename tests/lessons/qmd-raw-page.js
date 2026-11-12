// The page a themes .qmd would render to, without Quarto: its {=html} block in a bare HTML document (no site chrome or theme).
// For machines where `quarto render` cannot run (Quarto 1.10 needs macOS 14: dart-sass refuses to start on 13). The page's own
// markup, styles and scripts are what the tests exercise, and those all live in the block.
const fs = require("fs");
module.exports = (qmd) => {
  const t = fs.readFileSync(qmd, "utf8"), m = t.match(/```\{=html\}\n([\s\S]*?)\n```/);
  if (!m) throw new Error("no {=html} block in " + qmd);
  const title = (t.match(/^title:\s*"(.*)"/m) || [])[1] || "page";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body>${m[1]}</body></html>`;
};
