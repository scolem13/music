// lesson-builder.js: the MLT lesson plan builder (mlt/lesson-builder.qmd). Global LessonBuilder.
// Like the Vocal Warm-up: a Set up form builds a plan from a book unit (books/*.js) and the classroom activities database
// (activities.js); the plan can be edited (minutes, order, swap an activity, add one); the Run panel goes through it with a
// timer, showing the teacher everything for the current item. "Open the class screen" opens a second window (for the class TV)
// that shows only the student side of the current item and a large timer; the two windows talk over BroadcastChannel, so both
// must be in the same browser (a laptop with the TV as a second display).
//
// A plan: { book, unit, lesson (1..n: which pass through the unit), minutes, items: [item] }
//   item: { kind: "first" | "lsa" | "second" | "bridge" | "close", title, minutes, step (book step id, optional),
//           act (activities.js id, optional), note (teacher text) }
// Pure helpers (Node: tests/mlt/lesson-builder.test.js): LessonBuilder.build(opts) -> plan, LessonBuilder.alternatives(plan, i).
// Saved plans: localStorage "mlt-lessons" (this browser only).
(function (global) {
  "use strict";
  var KIND = { first: "First whole", lsa: "Part: LSA", second: "Second whole", bridge: "Bridge", close: "Close" };
  var CH = "mlt-lesson";

  function books() { return global.MLTBooks || {}; }
  function units(bookId) {
    var b = books()[bookId], out = [];
    // teaching units only: ones with an LSA (Mullen's chapters on LSAs and classroom activities are reference, not lessons)
    if (b) b.parts.forEach(function (p) { p.units.forEach(function (u) { if (u.steps && u.steps.some(function (s) { return s.phase === "lsa"; })) out.push(u); }); });
    return out;
  }
  function unitOf(bookId, unitId) { return units(bookId).filter(function (u) { return u.id === unitId; })[0]; }
  function acts() { return global.MLTActivities || []; }
  function act(id) { return acts().filter(function (a) { return a.id === id; })[0]; }
  function pickN(a, k, n) { if (!a.length) return []; var out = []; for (var i = 0; i < n && i < a.length; i++) out.push(a[(k + i) % a.length]); return out; }

  // a plan from a unit: the k-th first whole, the k-th LSA, then second-whole activities to fill the time, a bridge, a close
  function build(o) {
    var u = unitOf(o.book, o.unit); if (!u) return null;
    var k = Math.max(0, (o.lesson || 1) - 1), total = o.minutes || 45, lsaMin = o.lsa || 5, items = [];
    var by = function (ph) { return u.steps.filter(function (s) { return s.phase === ph; }); };
    var first = by("first-whole"), lsa = by("lsa"), second = by("second-whole"), bridge = by("bridge");
    var f = first.length ? first[k % first.length] : null;
    items.push({ kind: "first", title: f ? f.title : "Songs: review and a new rote song", minutes: Math.round(total * 0.2), step: f ? f.id : null,
      note: "Establish tonality and meter; sing the songs (Rote Song Procedure for a new one)." });
    var l = lsa.length ? lsa[k % lsa.length] : null;
    if (l) items.push({ kind: "lsa", title: l.title, minutes: lsaMin, step: l.id, note: "Pre-LSA (review, directions), then Go Mode with a three-minute timer, then clean-up." });
    // second whole: the activities linked to this unit's second-whole steps (and the LSA's), rotated by lesson number
    var pool = [];
    second.concat(l ? [l] : []).forEach(function (s) { (s.activities || []).forEach(function (id) { var a = act(id); if (a && a.student && pool.indexOf(id) < 0) pool.push(id); }); });
    var used = items.reduce(function (t, x) { return t + x.minutes; }, 0), close = 3, br = bridge.length ? 5 : 0;
    var left = Math.max(0, total - used - close - br);
    // take activities in turn (rotated by lesson number) until their own lengths (activities.js mins) fill the time
    var chosen = [], acc = 0, start = pool.length ? (k * 2) % pool.length : 0;
    for (var j = 0; j < pool.length && acc < left; j++) { var id0 = pool[(start + j) % pool.length]; chosen.push(id0); acc += act(id0).mins || 6; }
    if (!chosen.length && second.length) items.push({ kind: "second", title: second[k % second.length].title, minutes: left, step: second[k % second.length].id });
    var mins = chosen.map(function (id) { return act(id).mins || 6; });
    if (chosen.length) {
      var over = mins.reduce(function (t, m) { return t + m; }, 0) - left;
      mins[mins.length - 1] -= over;                              // the last one is cut (or stretched) to fit
      if (mins[mins.length - 1] < 2 && mins.length > 1) { var lost = mins.pop(); chosen.pop(); mins[mins.length - 1] += lost; }
      mins[mins.length - 1] = Math.max(1, mins[mins.length - 1]);
    }
    chosen.forEach(function (id, i) {
      var a = act(id);
      items.push({ kind: "second", title: a.name, minutes: mins[i], est: a.minsFrom === "estimate", act: id, step: (second.filter(function (s) { return (s.activities || []).indexOf(id) >= 0; })[0] || l || {}).id || null });
    });
    if (br) { var b = bridge[k % bridge.length]; items.push({ kind: "bridge", title: b.title, minutes: br, step: b.id }); }
    var gap = total - close - items.reduce(function (t, x) { return t + x.minutes; }, 0);
    if (gap > 0) items[0].minutes += gap;                       // time nothing filled goes to the songs
    items.push({ kind: "close", title: "Close: review and home practice", minutes: close, note: "Sing the song once more; say what was learned; set home practice." });
    return { book: o.book, unit: o.unit, lesson: k + 1, minutes: total, items: items };
  }
  // other activities that could replace item i (same kind of part, from the unit and the database)
  function alternatives(plan, i) {
    var it = plan.items[i], u = unitOf(plan.book, plan.unit); if (!u) return [];
    var ids = [];
    u.steps.forEach(function (s) { (s.activities || []).forEach(function (id) { if (ids.indexOf(id) < 0 && id !== it.act) ids.push(id); }); });
    return ids.map(act).filter(function (a) { return a && a.student; });
  }
  function stepById(plan, id) { var u = unitOf(plan.book, plan.unit); return u && u.steps.filter(function (s) { return s.id === id; })[0]; }

  // ---------------------------------------------------------------- page ----------------------------------------------
  function el(t, c, h) { var e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function mmss(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ":" + ("0" + sec % 60).slice(-2); }
  var KEY = "mlt-lessons";
  function saved() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; } }
  function save(all) { try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) {} }

  // a tune's title from the collection (ABC text; each tune carries %%id <id>), or the id made readable
  function tuneTitle(id) {
    var TO = typeof tunesObject !== "undefined" ? tunesObject : global.tunesObject;
    if (TO) for (var k in TO) { var s = TO[k], i = typeof s === "string" ? s.indexOf("%%id " + id + "\n") : -1;
      if (i >= 0) { var x = s.lastIndexOf("\nX:", i), m = /\nT:([^\n]*)/.exec(s.slice(x < 0 ? 0 : x, i)); if (m) return m[1].trim(); } }
    return id.replace(/-\d+$/, "").replace(/-/g, " ");
  }
  // the student side of an item: what the class screen shows
  function studentView(plan, it) {
    var box = el("div", "lb-student");
    var st = it.step && stepById(plan, it.step);
    if (it.act) {
      var a = act(it.act), scr = a.screen || "prompt";
      if (scr !== "timer") box.appendChild(el("div", "lb-say", esc(a.student || a.name)));
      if (scr === "song" && a.tunes) box.appendChild(el("ul", "lb-songs", a.tunes.map(function (t) {
        var name = tuneTitle(t);
        return '<li><a href="/practice/tunes.html?tune=' + encodeURIComponent(t) + '" target="_blank">' + esc(name) + "</a></li>"; }).join("")));
      if (scr === "tool" && a.tool) { var f = el("iframe", "lb-tool"); f.src = a.tool; f.title = a.name; box.appendChild(f); }
    }
    else if (st && st.student) { var sp = MLTWalk.studentPart(st); if (sp) box.appendChild(sp); }
    else if (it.kind === "lsa") box.appendChild(el("div", "lb-say", "Patterns: echo when I point to you."));
    else if (it.note) box.appendChild(el("div", "lb-say", esc(it.kind === "close" ? "Sing it once more. What did we learn today?" : "")));
    return box;
  }
  function teacherView(plan, it) {
    var box = el("div", "lb-teacher"), st = it.step && stepById(plan, it.step);
    if (it.note) box.appendChild(el("p", null, esc(it.note)));
    if (st) {
      box.appendChild(el("p", "mlt-meta", '<span class="mlt-cite">' + (/[–-]/.test(st.page) ? "pp. " : "p. ") + esc(st.page) + "</span> " + esc(st.title)));
      box.appendChild(el("p", null, esc(st.teacher)));
    }
    if (it.act) box.appendChild(MLTWalk.activityCard(act(it.act)));
    return box;
  }

  function mount(root) {
    var $ = function (s) { return root.querySelector(s); };
    var plan = null, cur = 0, left = 0, running = false, timer = null, chan = null, shown = null;
    try { chan = new BroadcastChannel(CH); } catch (e) {}

    // ---- set up ----
    var bk = $("#lb-book"), un = $("#lb-unit");
    var NAMES = { mullen: "Mullen, MLT Any Music Teacher Can Du…De", dmti1: "DMTI Book 1", dmti2: "DMTI Book 2", dmti3: "DMTI Book 3", "jri-sax": "JRI Recorder, on saxophone" };
    Object.keys(NAMES).forEach(function (b) { if (units(b).length) { var o = el("option", null, NAMES[b]); o.value = b; bk.appendChild(o); } });
    function fillUnits() { un.innerHTML = ""; units(bk.value).forEach(function (u) { var o = el("option", null, esc(u.title)); o.value = u.id; un.appendChild(o); }); }
    bk.onchange = fillUnits; fillUnits();
    $("#lb-build").onclick = function () {
      plan = build({ book: bk.value, unit: un.value, lesson: +$("#lb-lesson").value, minutes: +$("#lb-min").value, lsa: +$("#lb-lsa").value });
      cur = 0; drawList(); show(0);
    };
    // saved plans
    var sv = $("#lb-saved");
    function fillSaved() { var all = saved(); sv.innerHTML = '<option value="">Saved plans…</option>'; Object.keys(all).sort().forEach(function (n) { var o = el("option", null, esc(n)); o.value = n; sv.appendChild(o); }); }
    fillSaved();
    sv.onchange = function () { var p = saved()[sv.value]; if (p) { plan = p; cur = 0; drawList(); show(0); } };
    $("#lb-save").onclick = function () {
      if (!plan) return; var u = unitOf(plan.book, plan.unit), name = prompt("Name this plan", (u ? u.title : plan.unit) + ", lesson " + plan.lesson);
      if (!name) return; var all = saved(); all[name] = plan; save(all); fillSaved(); sv.value = name;
    };
    $("#lb-del").onclick = function () { if (!sv.value) return; var all = saved(); delete all[sv.value]; save(all); fillSaved(); };

    // ---- the plan ----
    function total() { return plan.items.reduce(function (t, x) { return t + (+x.minutes || 0); }, 0); }
    function drawList() {
      var ol = $("#lb-list"); ol.innerHTML = "";
      if (!plan) { ol.appendChild(el("li", "lb-empty", "Build a plan first.")); return; }
      plan.items.forEach(function (it, i) {
        var li = el("li", "lb-item" + (i === cur ? " lb-cur" : ""));
        li.innerHTML = '<span class="lb-kind lb-k-' + it.kind + '">' + KIND[it.kind] + '</span> <a href="#" class="lb-go">' + esc(it.title) + '</a> ' +
          '<input type="number" class="lb-min" min="1" max="60" value="' + it.minutes + '"> min' + (it.est ? '<span class="lb-est" title="Length estimated, not from the book">~</span>' : '') + ' ' +
          '<button type="button" class="lb-up" title="Earlier">↑</button><button type="button" class="lb-down" title="Later">↓</button>' +
          '<button type="button" class="lb-x" title="Remove">×</button> <select class="lb-swap"><option value="">Swap for…</option></select>';
        var swap = li.querySelector(".lb-swap");
        if (it.kind === "second" || it.kind === "bridge") alternatives(plan, i).forEach(function (a) { var o = el("option", null, esc(a.name)); o.value = a.id; swap.appendChild(o); });
        else swap.remove();
        li.querySelector(".lb-go").onclick = function (e) { e.preventDefault(); show(i); };
        li.querySelector(".lb-min").onchange = function () { it.minutes = +this.value || 1; summary(); if (i === cur) resetTimer(); };
        li.querySelector(".lb-up").onclick = function () { if (i > 0) { plan.items.splice(i - 1, 0, plan.items.splice(i, 1)[0]); drawList(); } };
        li.querySelector(".lb-down").onclick = function () { if (i < plan.items.length - 1) { plan.items.splice(i + 1, 0, plan.items.splice(i, 1)[0]); drawList(); } };
        li.querySelector(".lb-x").onclick = function () { plan.items.splice(i, 1); if (cur >= plan.items.length) cur = plan.items.length - 1; drawList(); show(cur); };
        if (swap.parentNode) swap.onchange = function () { var a = act(swap.value); if (!a) return; it.act = a.id; it.title = a.name; it.kind = "second"; drawList(); if (i === cur) show(i); };
        ol.appendChild(li);
      });
      // add any activity from the database
      var add = el("li", "lb-add"), sel = el("select");
      sel.innerHTML = '<option value="">+ Add an activity…</option>' + acts().filter(function (a) { return a.student; }).map(function (a) { return '<option value="' + a.id + '">' + esc(a.name) + " (" + a.kind + ")</option>"; }).join("");
      sel.onchange = function () { var a = act(sel.value); if (!a) return; plan.items.splice(plan.items.length - 1, 0, { kind: "second", title: a.name, minutes: 5, act: a.id }); drawList(); };
      add.appendChild(sel); ol.appendChild(add);
      summary();
    }
    function summary() { if (plan) $("#lb-summary").textContent = plan.items.length + " items, " + total() + " of " + plan.minutes + " minutes"; }

    // ---- the LSA record sheet (record-sheet.js), under the Run panel while the LSA is on ----
    var klass = null, recBox = $("#lb-rec");
    function drawRec() {
      if (!recBox || !global.LSARecord) return;
      var it = plan && plan.items[cur];
      if (!it || it.kind !== "lsa") { recBox.innerHTML = ""; return; }
      LSARecord.sheet(recBox, klass, { key: plan.book + ":" + (it.step || it.title), title: it.title });
    }
    if (global.LSARecord && $("#lb-classes")) LSARecord.classes($("#lb-classes"), function (c) { klass = c; drawRec(); });

    // ---- run ----
    function resetTimer() { left = (+plan.items[cur].minutes || 1) * 60; tick(); }
    function tick() { $("#lb-time").textContent = mmss(left); send(); }
    function show(i) {
      if (!plan || !plan.items.length) return;
      cur = Math.max(0, Math.min(plan.items.length - 1, i)); var it = plan.items[cur];
      $("#lb-count").textContent = (cur + 1) + " of " + plan.items.length;
      $("#lb-kind").textContent = KIND[it.kind]; $("#lb-kind").className = "lb-kind lb-k-" + it.kind;
      $("#lb-title").textContent = it.title;
      var tv = $("#lb-teach"), sv2 = $("#lb-stu"); tv.innerHTML = ""; sv2.innerHTML = "";
      tv.appendChild(teacherView(plan, it)); sv2.appendChild(studentView(plan, it));
      drawRec();
      var nx = plan.items[cur + 1]; $("#lb-next").textContent = nx ? "Next: " + nx.title + " (" + nx.minutes + " min)" : "Last item.";
      $("#lb-back").disabled = cur === 0; $("#lb-skip").disabled = cur >= plan.items.length - 1; $("#lb-play").disabled = false;
      [].forEach.call(root.querySelectorAll(".lb-item"), function (li, k) { li.classList.toggle("lb-cur", k === cur); });
      running = false; $("#lb-play").textContent = "▶ Start"; resetTimer();
    }
    function send() { if (chan && plan) chan.postMessage({ plan: plan, cur: cur, left: left, running: running }); }
    $("#lb-play").onclick = function () {
      running = !running; this.textContent = running ? "⏸ Pause" : "▶ Start"; send();
      clearInterval(timer);
      if (running) timer = setInterval(function () { if (!running) return; left--; tick(); if (left <= 0) { running = false; $("#lb-play").textContent = "▶ Start"; clearInterval(timer); $("#lb-time").classList.add("lb-over"); setTimeout(function () { $("#lb-time").classList.remove("lb-over"); }, 3000); } }, 1000);
    };
    $("#lb-back").onclick = function () { show(cur - 1); };
    $("#lb-skip").onclick = function () { show(cur + 1); };
    $("#lb-class").onclick = function () { var w = window.open(location.pathname + "?screen=class", "mlt-class", "width=1100,height=750"); setTimeout(send, 800); if (!w) alert("Allow pop-ups for this page to open the class screen."); };
    if (chan) chan.onmessage = function (e) { if (e.data && e.data.hello) send(); };
    drawList();
  }

  // ---- the class screen: only the student side, big ----
  function classScreen(root) {
    document.body.classList.add("lb-class-screen");
    root.innerHTML = '<div class="lb-cs"><div class="lb-cs-kind" id="cs-kind"></div><h1 id="cs-title">Waiting for the teacher’s screen…</h1><div id="cs-time" class="lb-cs-time"></div><div id="cs-body"></div></div>';
    var chan = null, key = ""; try { chan = new BroadcastChannel(CH); } catch (e) {}
    if (!chan) { root.querySelector("#cs-title").textContent = "This browser cannot link two windows (BroadcastChannel)."; return; }
    if (global.MLTWalk) MLTWalk.setView("student");
    chan.onmessage = function (e) {
      var d = e.data; if (!d || !d.plan) return; var it = d.plan.items[d.cur]; if (!it) return;
      root.querySelector("#cs-time").textContent = mmss(d.left);
      var k = d.plan.unit + "|" + d.cur + "|" + it.title;
      if (k === key) return; key = k;
      root.querySelector("#cs-kind").textContent = KIND[it.kind];
      root.querySelector("#cs-title").textContent = it.title;
      var body = root.querySelector("#cs-body"); body.innerHTML = ""; body.appendChild(studentView(d.plan, it));
    };
    chan.postMessage({ hello: 1 });
  }

  function init() {
    var root = document.getElementById("lesson-builder"); if (!root) return;
    if (/[?&]screen=class/.test(location.search)) { var cs = document.getElementById("lb-class-root"); if (cs) { document.body.classList.add("lb-class-screen"); classScreen(cs); } return; }
    mount(root);
  }
  var api = { build: build, alternatives: alternatives, units: units, KIND: KIND, init: init };
  global.LessonBuilder = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document !== "undefined") { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else setTimeout(init, 0); }
})(typeof window !== "undefined" ? window : globalThis);
