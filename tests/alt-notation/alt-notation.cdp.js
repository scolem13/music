// The Sargam, Swara and Jianpu page (tools/alt-notation.qmd): Mò Lì Huā drawn in each notation, a library tune loads by ?tune=.
// Run after rendering the page: node tests/alt-notation/alt-notation.cdp.js   (NEG=1 must fail)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8547);
(async () => {
  const b = await launch({}); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  await b.goto("http://127.0.0.1:8547/tools/alt-notation.html"); await b.sleep(1200);
  const cells = await b.eval(`[...document.querySelectorAll('#an-out .an-sg .b')].map(c => c.textContent).join(' ')`);
  check("Hindustani: Kaharva grid of Mo Li Hua", cells === (NEG ? "x" : "G GP DS SD P PD P –"), cells);
  check("sam and khali marks", await b.eval(`[...document.querySelectorAll('#an-out .an-sg .t')].map(c => c.textContent).join('')`) === "X0");
  check("upper Sa has a dot", await b.eval(`document.querySelectorAll('#an-out .an-n.up').length`) === 2);
  const set = v => b.eval(`(s => { s.value = '${v}'; s.onchange(); })(document.getElementById('an-sys')); 0`);
  await set("carnatic"); await b.sleep(100);
  const cn = await b.eval(`document.querySelector('#an-out .an-cn').textContent.replace(/\\s+/g, '')`);
  check("Carnatic: Adi tala line", cn === "g,gpdssd|p,pd|p,,,||", cn);
  const lg = await b.eval(`document.querySelector('#an-out .an-legend').textContent`);
  check("svaras listed", /svaras used: s g3 p d2/.test(lg), lg.slice(0, 40));
  await set("jianpu"); await b.sleep(100);
  const jp = await b.eval(`document.querySelector('#an-out .an-jp').textContent.replace(/\\s+/g, '')`);
  check("jianpu", jp === "1=F2/433561165565–", jp);
  check("staff drawn", await b.eval(`!!document.querySelector('#an-staff svg')`));
  await b.goto("http://127.0.0.1:8547/tools/alt-notation.html?tune=yankee-doodle"); await b.sleep(2500);
  check("?tune= loads a library tune", /Yankee/.test(await b.eval(`document.getElementById('an-abc').value`)) && await b.eval(`document.querySelectorAll('#an-out .an-sg').length`) > 3);
  check("tune list filled", await b.eval(`document.querySelectorAll('#an-list option').length`) > 500);
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
