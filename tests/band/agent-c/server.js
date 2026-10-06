// Static server: project root at /, this scratch dir at /__c/.
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = "/Users/sean.coleman/Projects/everything-music-site", HERE = __dirname, PORT = +process.argv[2] || 8310;
const TYPES = { ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css", ".png":"image/png", ".json":"application/json" };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  const file = p.startsWith("/__c/") ? path.join(HERE, p.slice(5)) : path.join(ROOT, p);
  if (!file.startsWith(HERE) && !file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(data);
  });
}).listen(PORT, "127.0.0.1", () => console.log("serving on " + PORT));
