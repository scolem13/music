// record.js — one record of a student's work across the site's exercises, kept in this browser, and the report made from it
// (SiteRecord). Nothing is sent anywhere: the student prints the report or copies it, and the copy ends with a report code that a
// teacher pastes into a .sr-check box (my-report.qmd) to see the same report with every answer and to check it wasn't edited.
//
// A tool records items (one question, or one passage):
//   var it = SiteRecord.add("drill", { ex: "Intervals", set: "ex=interval&...", q: { text: "Name this interval.", abc: "X:1..." }, want: "P5" })
//   it.at.push([given, 1 right / 0 wrong, seconds since it was asked]); it.h++ (hints); it.rv = 1 (answer shown); SiteRecord.save()
//   (it.d holds anything a tool's own renderer needs.) Items get id, tool, pg (the page), t (when). The newest 3000 are kept.
// A tool may register how its items look: SiteRecord.register(tool, { name, render(it, teacher) -> element, text(it) -> lines,
//   summary(items) -> sentence }). Without one, an item shows its question (text and score), the attempts and the answer.
//   SiteRecord.panel(box)   the report in box: Today / Everything, the student's name, Print or save as PDF, Copy
//   SiteRecord.button()     a "My report" button that opens the panel below it (put it in a tool's row of buttons); shown only
//                           when the right sidebar isn't (phones, narrow windows)
//   The right sidebar (Quarto's #quarto-margin-sidebar) gets a "My report" box at its bottom on any page that loads this:
//   today's count, Open report (the panel in a dialog) and Copy today's report.
//   SiteRecord.mountCheck(box) the teacher's box; also every .sr-check on the page when this loads. Its "In class" view asks the
//                           student's own questions again as working exercises (classView): drills rebuilt from ex + settings +
//                           seed (Drills.replay; items recorded before seeds were kept can't be), chord analysis from its seed,
//                           the student's answers behind a button; nothing the teacher answers there is recorded.
//   SiteRecord.code(data) / readCode(text) -> { data, ok }   ("SR1." + base64 JSON + "." + checksum: stops casual edits, not a signature)
// Planned, not built: clearing the record, and reports over a chosen range of dates (now: today, or everything).
(function (global) {
  "use strict";
  if (global.SiteRecord) return;
  var KEY = "site-record-v1", MAX = 3000, mem = null, renderers = {};
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "null") || { items: [] }; } catch (e) { return { items: [] }; } }
  function all() { if (!mem) mem = load(); return mem.items; }
  function save() {   // merged with what other tabs saved since, by item id
    if (!mem) return;
    var disk = load(), byId = {}; disk.items.forEach(function (x) { byId[x.id] = x; });
    mem.items.forEach(function (x) { byId[x.id] = x; });
    var items = Object.keys(byId).map(function (k) { return byId[k]; }).sort(function (a, b) { return a.t - b.t; });
    if (items.length > MAX) items = items.slice(items.length - MAX);
    mem.items = items;
    try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) {}
    side();
  }
  function add(tool, o) {
    var it = Object.assign({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), tool: tool, pg: location.pathname, t: Date.now(), at: [], h: 0, rv: 0 }, o || {});
    all().push(it); save(); return it;
  }
  function register(tool, r) { renderers[tool] = r; }
  // tools whose items need their own script to be shown (loaded when a report has their items and the page hasn't got it)
  var TOOL_SRC = { "chord-analysis": "/apps/shared/analysis/chord-analysis.js?v=6" }, loading = {};
  // the drills and their extra exercises, for the In class view (drills.js first: the others add to it)
  var DRILL_SRC = ["/apps/shared/drills/drills.js?v=18", "/apps/shared/drills/figured.js?v=1", "/apps/shared/drills/mixture.js?v=1", "/apps/shared/drills/neapolitan.js?v=1", "/apps/shared/drills/motives.js?v=1", "/apps/shared/drills/jazz.js?v=1"];
  function scriptOnce(src) { return new Promise(function (res) { if (document.querySelector('script[src="' + src + '"]')) return res(); var sc = document.createElement("script"); sc.src = src; sc.onload = sc.onerror = function () { res(); }; document.head.appendChild(sc); }); }
  function drillsReady() {
    if (!document.querySelector('link[href^="/apps/shared/drills/drills.css"]')) { var l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/apps/shared/drills/drills.css?v=4"; document.head.appendChild(l); }
    if (global.Drills && global.Drills.replay) return Promise.all(DRILL_SRC.slice(1).map(scriptOnce));
    return scriptOnce(DRILL_SRC[0]).then(function () { return Promise.all(DRILL_SRC.slice(1).map(scriptOnce)); });
  }
  function firstWrong(it) { return !(it.at.length && it.at[0][1]) || it.h || it.rv; }
  // the In class view: each exercise again, working, with the student's own questions
  function classView(box, data, onlyMissed) {
    box.innerHTML = ""; css();
    var r = el("div", "sr-rep"); box.appendChild(r);
    r.appendChild(el("h3", "", "In class: " + (data.n || "the student") + "'s questions"));
    r.appendChild(el("p", "sr-help", "Each exercise asks the student's questions again. Answer them together; the student's own answers are behind \"Show the student's answers\". Nothing answered here is recorded."));
    var pg = null, needDrills = data.items.some(function (x) { return x.tool === "drill"; });
    (needDrills ? drillsReady() : Promise.resolve()).then(function () { ready(data.items, function () {
      groups(data.items).forEach(function (g) {
        var items = onlyMissed ? g.items.filter(function (it) { return it.tool === "chord-analysis" ? true : firstWrong(it); }) : g.items;
        if (!items.length) return;
        if (g.pg !== pg) { pg = g.pg; r.appendChild(el("h4", "", pageName(pg))); }
        var sec = el("div", "sr-class"); sec.appendChild(el("h5", "", g.ex)); r.appendChild(sec);
        if (g.tool === "drill" && global.Drills && global.Drills.replay) {
          var can = items.filter(function (it) { return it.seed != null && it.set; }), old = items.length - can.length;
          if (can.length) { var h = el("div"); sec.appendChild(h); global.Drills.replay(h, can.map(function (it) { return { set: it.set, seed: it.seed, at: it.at, h: it.h, rv: it.rv }; })); }
          if (old) { sec.appendChild(el("p", "sr-help", old + " question" + (old === 1 ? " was" : "s were") + " answered before the site kept what it needs to ask them again; " + (old === 1 ? "it is" : "they are") + " in the report view.")); }
        } else if (g.tool === "chord-analysis" && global.ChordAnalysis && global.ChordAnalysis.mount) {
          items.forEach(function (it) {
            var h = el("div"); h.setAttribute("data-settings", it.d.s); h.setAttribute("data-lock", ""); h.setAttribute("data-norecord", ""); sec.appendChild(h); global.ChordAnalysis.mount(h);
            var det = el("details", "sr-help"); det.appendChild(el("summary", "", "Show the student's answers")); det.appendChild(R(it.tool).render(it, true)); sec.appendChild(det);
          });
        } else { var tmp = el("div"); render(tmp, { n: data.n, range: data.range, d: data.d, items: items }, { teacher: true }); sec.appendChild(tmp); }
      });
    }); });
  }
  function ready(items, f) {
    var need = []; items.forEach(function (x) { if (!renderers[x.tool] && TOOL_SRC[x.tool] && need.indexOf(x.tool) < 0) need.push(x.tool); });
    if (!need.length || typeof document === "undefined") return f();
    var left = need.length, one = function () { if (--left === 0) f(); };
    need.forEach(function (t) {
      if (!loading[t]) loading[t] = new Promise(function (res) { var sc = document.createElement("script"); sc.src = TOOL_SRC[t]; sc.onload = sc.onerror = function () { res(); }; document.head.appendChild(sc); });
      loading[t].then(function () { setTimeout(one, 0); });
    });
  }
  function startOfToday() { var d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function pick(range) { var from = range === "today" ? startOfToday() : 0; return all().filter(function (x) { return x.t >= from; }); }

  function hashStr(t) { var h = 0x811c9dc5; for (var i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); }
  function b64e(t) { return btoa(unescape(encodeURIComponent(t))); }
  function b64d(t) { return decodeURIComponent(escape(atob(t))); }
  function code(data) { var j = JSON.stringify(data); return "SR1." + b64e(j) + "." + hashStr("sr1|" + j); }
  function readCode(text) {
    var m = /SR1\.([A-Za-z0-9+/=]+)\.([0-9a-f]+)/.exec(String(text || "").replace(/\s+/g, "")); if (!m) return null;
    try { var j = b64d(m[1]); return { data: JSON.parse(j), ok: hashStr("sr1|" + j) === m[2] }; } catch (e) { return null; }
  }

  // ---- drawing
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function btn(text) { var b = el("button", "btn btn-outline-secondary btn-sm", text); b.type = "button"; return b; }
  var CSS = ".sr-panel{margin:.6rem 0;padding:.6rem .8rem;border-left:3px solid #6c8ebf;background:rgba(108,142,191,.08)}.sr-row{display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;margin:.35rem 0}" +
    ".sr-rep h3{font-size:1.15rem}.sr-rep h4{font-size:1.02rem;margin-top:1.1rem;border-bottom:1px solid var(--bs-border-color,#ccc)}.sr-rep h5{font-size:.95rem;margin:.8rem 0 .2rem}" +
    ".sr-t td,.sr-t th{font-size:.85rem;vertical-align:top;padding:.15rem .5rem}.sr-q svg{max-width:260px}.sr-item{break-inside:avoid}.sr-ok{color:#198754}.sr-no{color:#b02a37}.sr-help{font-size:.85rem;opacity:.85}" +
    ".sr-side{margin-top:1.2rem;padding-top:.6rem;border-top:1px solid var(--bs-border-color,#ddd);font-size:.85rem}.sr-side .sr-row{margin:.3rem 0}.sr-side b{display:block}" +
    ".sr-dialog{width:min(980px,96vw);max-height:92vh;border:1px solid var(--bs-border-color,#ccc);border-radius:8px;padding:1rem;background:var(--bs-body-bg,#fff);color:var(--bs-body-color,#222)}" +
    ".sr-dialog::backdrop{background:rgba(0,0,0,.35)}body.sr-side-on .sr-mybtn{display:none}" +
    ".sr-class{margin:.6rem 0 1.4rem}.sr-class .dr-student{font-size:.9rem;margin:.2rem 0 .4rem;color:#6c4a00}.sr-print{display:none}body.sr-printing>*:not(.sr-print){display:none!important}body.sr-printing .sr-print{display:block;padding:1rem}.sr-code{white-space:pre-wrap;word-break:break-all;font-size:.75rem;border:1px solid #ccc;padding:.4rem;user-select:all}";
  function css() { if (document.getElementById("sr-css")) return; var s = el("style"); s.id = "sr-css"; s.textContent = CSS; document.head.appendChild(s); }
  function attempts(list) { return list && list.length ? list.map(function (a) { return (a[1] ? "✓ " : "✗ ") + a[0]; }).join("  ·  ") : "—"; }
  function found(it) { return it.rv || it.at.some(function (a) { return a[1]; }); }
  function mini(abc) { var d = el("div", "sr-q"); if (abc && global.ABCJS) global.ABCJS.renderAbc(d, abc, { scale: 0.7, staffwidth: 200, paddingleft: 0, paddingright: 0 }); return d; }
  var generic = {
    name: "Exercises",
    rows: true,
    row: function (it, teacher) {   // [question, attempts, help, answer]
      var q = el("div"); q.appendChild(el("div", "", it.q && it.q.text || "")); if (it.q && it.q.abc) q.appendChild(mini(it.q.abc)); else if (it.q && it.q.show) q.appendChild(el("div", "", it.q.show));
      return [q, attempts(it.at), [it.h ? "hints ×" + it.h : "", it.rv ? "answer shown" : ""].filter(Boolean).join(", ") || "—", teacher || found(it) ? String(it.want) : "—"];
    },
    text: function (it) { return ["  " + (it.q && (it.q.text + (it.q.show ? " " + it.q.show : "")) || "") + " → " + attempts(it.at) + (it.h ? " | hints ×" + it.h : "") + (it.rv ? " | answer shown" : "") + " | answer: " + it.want]; },
    summary: function (items) {
      var a = items.filter(function (x) { return x.at.length; }), first = a.filter(function (x) { return x.at[0][1]; }).length, end = a.filter(function (x) { return x.at.some(function (y) { return y[1]; }); }).length;
      return a.length + " question" + (a.length === 1 ? "" : "s") + " answered: " + first + " right first time, " + end + " right in the end.";
    }
  };
  function R(tool) { return renderers[tool] || generic; }
  function groups(items) {   // page, then exercise, in the order first done
    var out = [], idx = {};
    items.forEach(function (it) { var k = it.pg + "\u0001" + it.tool + "\u0001" + (it.ex || ""); if (!(k in idx)) { idx[k] = out.length; out.push({ pg: it.pg, tool: it.tool, ex: it.ex || R(it.tool).name, items: [] }); } out[idx[k]].items.push(it); });
    return out;
  }
  function pageName(pg) { return pg.replace(/^\//, "").replace(/\.html$/, ""); }
  function render(box, data, opts) {
    opts = opts || {}; box.innerHTML = ""; css();
    var r = el("div", "sr-rep");
    r.appendChild(el("h3", "", "Report of my work"));
    if (opts.verified != null) r.appendChild(el("p", opts.verified ? "sr-ok" : "sr-no", opts.verified ? "✓ The code checks out: this is the record as the page made it." : "✗ The code doesn't match its contents: the report was changed after it was made."));
    r.appendChild(el("p", "", "Name: " + (data.n || "(not given)") + " · " + (data.range === "today" ? "Today, " + new Date(data.d).toLocaleDateString() : "Everything recorded in this browser") + " · Made " + new Date(data.d).toLocaleString()));
    var gs = groups(data.items);
    if (!gs.length) r.appendChild(el("p", "", "Nothing recorded " + (data.range === "today" ? "today" : "yet") + ". Answer some questions first."));
    var pg = null;
    gs.forEach(function (g) {
      if (g.pg !== pg) { pg = g.pg; r.appendChild(el("h4", "", pageName(pg))); }
      var rr = R(g.tool), sec = el("div", "sr-item");
      sec.appendChild(el("h5", "", g.ex)); sec.appendChild(el("p", "sr-help", rr.summary(g.items) + " " + new Date(g.items[0].t).toLocaleTimeString() + "–" + new Date(g.items[g.items.length - 1].t).toLocaleTimeString() + "."));
      if (rr.rows) {
        var tb = el("table", "table table-sm sr-t"), th = el("tr");
        ["Question", "Answers given", "Help", "Answer"].forEach(function (h) { th.appendChild(el("th", "", h)); }); tb.appendChild(th);
        g.items.forEach(function (it) { var tr = el("tr"); rr.row(it, opts.teacher).forEach(function (c) { var td = el("td"); if (typeof c === "string") td.textContent = c; else td.appendChild(c); tr.appendChild(td); }); tb.appendChild(tr); });
        sec.appendChild(tb);
      } else g.items.forEach(function (it) { sec.appendChild(rr.render(it, opts.teacher)); });
      r.appendChild(sec);
    });
    box.appendChild(r); return r;
  }
  function text(data) {
    var L = ["Report of my work", "Name: " + (data.n || "(not given)"), (data.range === "today" ? "Today, " + new Date(data.d).toLocaleDateString() : "Everything recorded"), "Made: " + new Date(data.d).toLocaleString(), ""];
    var pg = null;
    groups(data.items).forEach(function (g) {
      if (g.pg !== pg) { pg = g.pg; L.push("== " + pageName(pg)); }
      var rr = R(g.tool); L.push(g.ex + ": " + rr.summary(g.items));
      g.items.forEach(function (it) { (rr.text || generic.text)(it).forEach(function (l) { L.push(l); }); });
      L.push("");
    });
    L.push("Report code (your teacher pastes it on the My Report page to check it):", code(data));
    return L.join("\n");
  }
  function printNode(node, codeText) {
    var wrap = el("div", "sr-print"); wrap.appendChild(node.cloneNode(true));
    if (codeText) { wrap.appendChild(el("h4", "", "Report code")); wrap.appendChild(el("p", "sr-help", "Your teacher pastes this on the My Report page to check the report.")); wrap.appendChild(el("pre", "sr-code", codeText)); } document.body.appendChild(wrap); document.body.classList.add("sr-printing");
    var done = function () { document.body.classList.remove("sr-printing"); wrap.remove(); global.removeEventListener("afterprint", done); };
    global.addEventListener("afterprint", done); global.print(); setTimeout(function () { if (document.body.contains(wrap) && !global.matchMedia("print").matches) done(); }, 1500);
  }
  function nameGet() { try { return localStorage.getItem("site-record-name") || localStorage.getItem("chord-analysis-name") && JSON.parse(localStorage.getItem("chord-analysis-name")) || ""; } catch (e) { return ""; } }
  function nameSet(v) { try { localStorage.setItem("site-record-name", v); } catch (e) {} }
  function panel(box) {
    css(); box.innerHTML = ""; box.classList.add("sr-panel");
    var top = el("div", "sr-row"), nameL = el("label", "", "Your name "), nameI = el("input", "form-control form-control-sm"), rangeS = el("select", "form-select form-select-sm");
    nameI.style.maxWidth = "16rem"; nameI.style.display = "inline-block"; nameI.value = nameGet(); nameL.appendChild(nameI);
    [["today", "Today"], ["all", "Everything"]].forEach(function (o) { var op = el("option", "", o[1]); op.value = o[0]; rangeS.appendChild(op); }); rangeS.style.width = "auto";
    var rl = el("label", "", "Show "); rl.appendChild(rangeS);
    top.appendChild(nameL); top.appendChild(rl); box.appendChild(top);
    var row = el("div", "sr-row"), pr = btn("Print or save as PDF"), cp = btn("Copy the report"), msg = el("span", "sr-help"), out = el("div");
    [pr, cp, msg].forEach(function (x) { row.appendChild(x); }); box.appendChild(row); box.appendChild(out);
    box.appendChild(el("p", "sr-help", "This covers every exercise on the site that keeps a record, done in this browser. Nothing is sent anywhere: print it or copy it to hand it in."));
    function data() { mem = null; return { v: 1, n: nameI.value.trim(), range: rangeS.value, d: Date.now(), items: pick(rangeS.value) }; }
    function redraw() { var d = data(); ready(d.items, function () { render(out, d, {}); }); }
    nameI.addEventListener("input", function () { nameSet(nameI.value); redraw(); });
    rangeS.addEventListener("change", redraw);
    pr.addEventListener("click", function () { if (out.firstChild) printNode(out.firstChild, code(data())); });
    cp.addEventListener("click", function () { var t = text(data()); if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { msg.textContent = "Copied, with the report code at the end."; }, function () { msg.textContent = "Couldn't copy."; }); });
    redraw();
    box._sr = { data: data, redraw: redraw, text: function () { return text(data()); } };
    return box;
  }
  function button(after) {   // "My report": opens (or closes) the panel right after the element given (or the button's row)
    var b = btn("My report"), box = null; b.classList.add("sr-mybtn");
    b.addEventListener("click", function () {
      if (box && box.isConnected) { box.remove(); box = null; return; }
      box = el("div"); var anchor = after || b.parentNode; anchor.parentNode.insertBefore(box, anchor.nextSibling); panel(box); box.scrollIntoView({ block: "nearest" });
    });
    return b;
  }
  // the right sidebar's box
  function todayCount() { return pick("today").filter(function (x) { return x.at.length || (x.d && x.d.c && x.d.c.some(function (c) { return c.st.length || c.nm.length; })); }).length; }
  var sideEl = null, dlg = null;
  function openDialog() {
    if (!dlg) {
      dlg = el("dialog", "sr-dialog"); var top = el("div", "sr-row"), x = btn("Close"); top.appendChild(el("b", "", "My report")); top.appendChild(x); top.style.justifyContent = "space-between";
      x.addEventListener("click", function () { dlg.close(); }); dlg.appendChild(top); dlg.appendChild(el("div")); document.body.appendChild(dlg);
      dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    }
    panel(dlg.lastChild); if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
  }
  function side() {
    if (typeof document === "undefined" || document.getElementById("sr-mine")) return;
    var host = document.getElementById("quarto-margin-sidebar"); if (!host) return;
    css();
    if (!sideEl) {
      sideEl = el("div", "sr-side"); sideEl.appendChild(el("b", "", "My report"));
      var info = el("div", "sr-help sr-count"), row = el("div", "sr-row"), op = btn("Open report"), cp = btn("Copy today's report"), msg = el("div", "sr-help");
      op.addEventListener("click", openDialog);
      cp.addEventListener("click", function () {
        var d = { v: 1, n: nameGet(), range: "today", d: Date.now(), items: pick("today") };
        ready(d.items, function () { var t = text(d); if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { msg.textContent = "Copied" + (nameGet() ? "" : ". Add your name under Open report") + "."; }, function () { msg.textContent = "Couldn't copy."; }); });
      });
      row.appendChild(op); row.appendChild(cp);
      sideEl.appendChild(info); sideEl.appendChild(row); sideEl.appendChild(msg);
      sideEl.appendChild(el("div", "sr-help", "Your answers on this site, kept in this browser. Print or copy it to hand it in."));
      host.appendChild(sideEl);
      var vis = function () { document.body.classList.toggle("sr-side-on", sideEl.offsetParent !== null && getComputedStyle(host).display !== "none"); };
      global.addEventListener("resize", vis); setTimeout(vis, 0); vis();
    }
    var n = todayCount(); sideEl.querySelector(".sr-count").textContent = "Today: " + n + " answered" + (n === 1 ? "" : "") + ".";
  }
  function mountCheck(host) {
    if (host._sr) return; host._sr = 1; css();
    host.appendChild(el("p", "", "Paste the report code, or the whole copied report. The page rebuilds the report from the code, checks that nothing was changed, and shows every answer."));
    var ta = el("textarea", "form-control"); ta.rows = 3; ta.setAttribute("aria-label", "Report code"); host.appendChild(ta);
    var row = el("div", "sr-row"), go = btn("Open the report"), cls = btn("In class: the exercises again"), pr = btn("Print"), out = el("div");
    var missL = el("label", "sr-help"), miss = el("input"); miss.type = "checkbox"; missL.appendChild(miss); missL.appendChild(document.createTextNode(" only questions not right first time"));
    [go, cls, missL, pr].forEach(function (x) { row.appendChild(x); }); host.appendChild(row); host.appendChild(out);
    var view = "report";
    function open() {
      var r = readCode(ta.value);
      if (!r && global.ChordAnalysis && /CA1\./.test(ta.value)) { var c = global.ChordAnalysis.readCode(ta.value); if (c) r = { ok: c.ok, data: { n: c.data.n, range: "all", d: c.data.d, items: c.data.p.map(function (p) { return { tool: "chord-analysis", pg: c.data.pg, t: p.t, at: [], h: 0, rv: 0, d: p }; }) } }; }
      out.innerHTML = "";
      if (!r) { out.appendChild(el("p", "sr-no", "That isn't a report code. It starts with SR1.")); return; }
      if (view === "class") { if (!r.ok) out.appendChild(el("p", "sr-no", "✗ The code doesn't match its contents: the report was changed after it was made.")); var cv = el("div"); out.appendChild(cv); classView(cv, r.data, miss.checked); return; }
      ready(r.data.items, function () { render(out, r.data, { teacher: true, verified: r.ok }); });
    }
    go.addEventListener("click", function () { view = "report"; open(); });
    cls.addEventListener("click", function () { view = "class"; open(); });
    miss.addEventListener("change", function () { if (view === "class" && out.firstChild) open(); });
    pr.addEventListener("click", function () { if (out.firstChild) printNode(out.firstChild); });
  }

  global.SiteRecord = { add: add, save: save, all: all, pick: pick, register: register, code: code, readCode: readCode, render: render, text: text, panel: panel, button: button, mountCheck: mountCheck, openDialog: openDialog, classView: classView, startOfToday: startOfToday };
  function init() { [].forEach.call(document.querySelectorAll(".sr-check"), mountCheck); side(); }
  if (typeof document !== "undefined" && document.querySelectorAll) { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init(); }
})(typeof window !== "undefined" ? window : globalThis);
