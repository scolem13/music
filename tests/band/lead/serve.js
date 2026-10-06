// Static server for page tests: /apps, /config.js, /track.js come LIVE from the project
// root; everything else from the scratch Quarto render in ./site.
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = "/Users/sean.coleman/Projects/everything-music-site", SITE = path.join(__dirname, "site");
const TYPES = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".json":"application/json", ".svg":"image/svg+xml", ".woff":"font/woff", ".woff2":"font/woff2", ".png":"image/png", ".ico":"image/x-icon", ".mp3":"audio/mpeg" };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  const base = (/^\/(apps\/|config\.js|track\.js)/.test(p)) ? ROOT : SITE, file = path.join(base, p);
  if (!file.startsWith(base)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" }); res.end(data);
  });
}).listen(process.env.PORT || 8500, "127.0.0.1", () => console.log("serving on", process.env.PORT || 8500));
