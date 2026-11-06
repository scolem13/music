// SiteRecord (apps/shared/report/record.js) in Node: ranges (today, a span of dates), clearing (all, before a date) that stays
// cleared when another tab saves, SR1 codes for a span report, the report text. node tests/report/record.test.js   (NEG=1 must fail)
const fs = require("fs"), path = require("path"), vm = require("vm");
const R = path.resolve(__dirname, "../..") + "/";
const mem = {}, store = { getItem: k => k in mem ? mem[k] : null, setItem: (k, v) => { mem[k] = String(v); } };
function tab() {   // one tab: its own SiteRecord over the shared localStorage
  const win = { btoa, atob, unescape, escape, location: { pathname: "/practice/harmony-ear.html" }, localStorage: store }; win.window = win; vm.createContext(win);
  vm.runInContext(fs.readFileSync(R + "apps/shared/report/record.js", "utf8"), win); return win.SiteRecord;
}
let fails = 0, total = 0;
const ok = (c, ...a) => { total++; if (!c) { fails++; console.log("FAIL", ...a); } };
const DAY = 86400000, now = Date.now(), A = tab();
const mk = (SR, t, ex) => { const it = SR.add("drill", { ex: ex || "Intervals", q: { text: "q" }, want: "P5" }); it.t = t; it.at.push(["P5", 1, 3]); SR.save(); return it; };
mk(A, now - 10 * DAY); mk(A, now - 3 * DAY); mk(A, now - DAY); mk(A, now);
ok(A.all().length === 4, "four items", A.all().length);
ok(A.pick("all").length === 4, "all");
ok(A.pick("today").length === 1, "today", A.pick("today").length);
ok(A.pick("span", now - 4 * DAY, now - DAY + 1000).length === 2, "span two items");
ok(A.pick("span", now - 4 * DAY).length === 3, "span open end");
// span report: code round trip, text names the dates, SR1 keeps from / to
const data = { v: 1, n: "Ann", range: "span", from: now - 4 * DAY, to: now - DAY + 1000, d: now, items: A.pick("span", now - 4 * DAY, now - DAY + 1000) };
const c = A.readCode(A.code(data));
ok(c && c.ok && c.data.range === "span" && c.data.from === data.from && c.data.items.length === 2, "span code round trip");
ok(A.readCode(A.code(data).replace(/\.[0-9a-f]+$/, ".0")).ok === false, "edited code fails");
ok(/ to /.test(A.rangeText(data)), "range text", A.rangeText(data));
ok(/^Report of my work\nName: Ann\n.* to /.test(A.text(data)) && /SR1\./.test(A.text(data)), "report text");
ok(A.readCode(A.code({ v: 1, n: "", range: "today", d: now, items: [] })).data.range === "today", "old-style range still reads");
// clearing before a date, then another tab (opened earlier, holding old items) saves: nothing comes back
const B = tab(); B.all();
ok(A.clear(now - 2 * DAY) === 2, "two items older than the date");
ok(A.all().length === 2 && A.all().every(x => x.t >= now - 2 * DAY), "kept the newer two");
mk(B, now + 5);   // B still held all four in memory; its save must not resurrect the two cleared
const C = tab(); ok(C.all().length === 3 && C.all().every(x => x.t >= now - 2 * DAY), "other tab's save did not bring them back", C.all().length);
// clear everything
ok(A.clear() === 3, "clear all returns count");
ok(tab().all().length === 0, "empty after clear");
mk(A, Date.now() + 1000); ok(tab().all().length === 1, "new items after a clear are kept");
if (process.env.NEG) ok(false, "NEG: forced failure");
console.log(fails ? fails + " failures of " + total : "ok — " + total + " checks"); process.exit(fails ? 1 : 0);
