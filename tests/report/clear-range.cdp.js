// My Report panel: date ranges (Last 7 days, Choose dates) and clearing (everything, or before a date; both ask first, a "no" keeps the
// record). Run after rendering my-report.qmd:  node tests/report/clear-range.cdp.js     SITE=<dir> tests a render made elsewhere
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => /\.js$/.test(f) ? "text/javascript" : /\.css$/.test(f) ? "text/css" : "text/html";
const PORT = 8564, wait = ms => new Promise(r => setTimeout(r, ms));
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ width: 1200, height: 1000 }); let fails = 0;
  const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info !== undefined ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e);
  await b.goto(`http://127.0.0.1:${PORT}/my-report.html`); await wait(1500);
  await ev(`(() => { const D = 86400000, now = Date.now(), items = [[10, "Old ten"], [3, "Mid three"], [0, "New today"]].map(([d, t], i) => ({ id: "t" + i, tool: "drill", pg: "/theory/theory-drills.html", t: now - d * D, at: [["P5", 1, 2]], h: 0, rv: 0, ex: "Intervals", q: { text: t }, want: "P5" }));
    localStorage.setItem("site-record-v1", JSON.stringify({ items })); })()`);
  await b.goto(`http://127.0.0.1:${PORT}/my-report.html`); await wait(1500);
  const panel = () => `document.querySelector('#sr-mine')`;
  const show = async v => { await ev(`(() => { const s = ${panel()}.querySelector('select'); s.value = ${JSON.stringify(v)}; s.dispatchEvent(new Event('change')); })()`); await wait(300); };
  const rows = () => ev(`${panel()}.querySelectorAll('.sr-t tr').length - ${panel()}.querySelectorAll('.sr-item').length`);
  await ev(`${panel()}.querySelector('select').dispatchEvent(new Event('change'))`); await wait(300);
  await show("all"); check("Everything shows all three", await rows() === 3, await rows());
  await show("today"); check("Today shows one", await rows() === 1, await rows());
  await show("week"); check("Last 7 days shows two", await rows() === 2, await rows());
  await show("span");
  check("date boxes appear for Choose dates", await ev(`!${panel()}.querySelector('.sr-dates').hidden`));
  const ymd = d => ev(`(() => { const t = new Date(Date.now() - ${d} * 86400000), z = n => (n < 10 ? "0" : "") + n; return t.getFullYear() + "-" + z(t.getMonth() + 1) + "-" + z(t.getDate()); })()`);
  const setDate = async (i, v) => { await ev(`(() => { const x = ${panel()}.querySelectorAll('.sr-dates input')[${i}]; x.value = ${JSON.stringify(v)}; x.dispatchEvent(new Event('change')); })()`); await wait(300); };
  await setDate(0, await ymd(4)); await setDate(1, await ymd(2));
  check("4 to 2 days ago shows only the middle one", await rows() === 1 && /Mid three/.test(await ev(`${panel()}.textContent`)), await rows());
  check("the range is named in the report", /to /.test(await ev(`${panel()}.querySelector('.sr-rep p:nth-of-type(1)').textContent`)));
  const code = await ev(`SiteRecord.readCode(${panel()}._sr.text()).data.range`);
  check("the copied text carries a span code", code === "span", code);
  // clearing: confirm says no, then yes
  await ev(`window.confirm = m => { window.__asked = m; return window.__yes; }`);
  const btnOf = t => `[...${panel()}.querySelectorAll('button')].find(x => x.textContent === ${JSON.stringify(t)})`;
  await ev(`window.__yes = false; ${btnOf("Clear everything")}.click()`); await wait(200);
  check("No keeps the record", await ev(`SiteRecord.all().length`) === 3 && /Delete all 3/.test(await ev(`window.__asked`)));
  await ev(`(() => { const i = ${panel()}.querySelector('input[aria-label="Clear before date"]'); i.value = ${JSON.stringify(await ymd(5))}; })()`);
  await ev(`window.__yes = true; ${btnOf("Clear before this date")}.click()`); await wait(300);
  check("Clear before deletes only the older item", await ev(`SiteRecord.all().map(x => x.q.text).join()`) === "Mid three,New today", await ev(`SiteRecord.all().map(x => x.q.text).join()`));
  check("it survives a reload", (await (async () => { await b.goto(`http://127.0.0.1:${PORT}/my-report.html`); await wait(1200); return ev(`SiteRecord.all().length`); })()) === 2);
  await ev(`window.confirm = m => true; [...document.querySelector('#sr-mine').querySelectorAll('button')].find(x => x.textContent === "Clear everything").click()`); await wait(300);
  check("Clear everything empties it", await ev(`SiteRecord.all().length`) === 0 && /Nothing recorded/.test(await ev(`document.querySelector('#sr-mine').textContent`)));
  check("no page errors", b.errors.filter(x => !/supabase|createClient/i.test(x)).length === 0, JSON.stringify(b.errors.slice(0, 2)));
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all ok"); process.exit(fails ? 1 : 0);
})();
