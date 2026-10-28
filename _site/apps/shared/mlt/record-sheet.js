// record-sheet.js: the LSA record sheet (Mullen pp. 83–84), used by the lesson planner (lesson-builder.js). Global LSARecord.
// The book: two seating charts per class, one for tonal LSAs and one for rhythm LSAs; high-aptitude students marked (book:
// green / bold), low-aptitude (red / underlined); a box beside each name for each LSA. Marks:
//   Aural/Oral and Verbal Association: a vertical line | when the student performs in teaching mode, the line crossed (+) when
//   they perform in evaluation mode; "a" absent; a circle ○ if they "botch" it and need another chance; a small x if not
//   paying attention.
//   Partial Synthesis (and Generalization LSAs without teaching mode): ✓ correct, ✗ incorrect, a dot • for answering a
//   "Do you agree?" question.
// Here the seating chart is the roster in order (no room layout). Records stay in this browser (localStorage "mlt-records");
// "Copy as table" gives a tab-separated sheet for a spreadsheet.
//
// Store: { classes: { <name>: { roster: [{ name, apt: "high"|"avg"|"low" }],
//                               sheets: { tonal|rhythm: { <lsa key>: { title, mode: "line"|"check", dates: [..], marks: { <student>: "|+○" } } } } } } }
// Pure helpers (Node: tests/mlt/record-sheet.test.js): parseRoster, rosterText, modeOf, contentOf, mark, table.
(function (global) {
  "use strict";
  var KEY = "mlt-records";
  var TOOLS = {
    line: [{ t: "auto", label: "| then +", tip: "Tap once: teaching mode (|). Tap again: evaluation mode (the line crossed, +)." },
           { t: "○", tip: "Botched: needs another chance" }, { t: "a", tip: "Absent" }, { t: "x", tip: "Not paying attention" }, { t: "undo", label: "⌫", tip: "Remove the last mark" }],
    check: [{ t: "✓", tip: "Correct" }, { t: "✗", tip: "Incorrect" }, { t: "•", tip: "Answered a “Do you agree?” question" },
            { t: "a", tip: "Absent" }, { t: "undo", label: "⌫", tip: "Remove the last mark" }]
  };

  // one student per line; "+" in front = high aptitude, "-" = low (the book's green and red)
  function parseRoster(text) {
    return String(text || "").split(/\n/).map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
      var apt = l[0] === "+" ? "high" : l[0] === "-" ? "low" : "avg";
      return { name: apt === "avg" ? l : l.slice(1).trim(), apt: apt };
    });
  }
  function rosterText(r) { return r.map(function (s) { return (s.apt === "high" ? "+" : s.apt === "low" ? "-" : "") + s.name; }).join("\n"); }
  // the LSA's skill from the step title, e.g. "(A/O)", "(VA)", "(PS)", "(G-v)"
  function modeOf(title) { return /\((PS|G[^)]*|Partial|General)/i.test(title || "") ? "check" : "line"; }
  function contentOf(title) { return /rhythm|macrobeat|meter/i.test(title || "") ? "rhythm" : "tonal"; }
  // apply a tool to a box's marks
  function mark(s, tool, mode) {
    s = s || "";
    if (tool === "undo") return s.slice(0, -1);
    if (tool === "auto") return mode === "check" ? s + "✓" : s.slice(-1) === "|" ? s.slice(0, -1) + "+" : s + "|";
    return s + tool;
  }
  // a class's sheet (tonal or rhythm) as tab-separated text: students down, LSAs across
  function table(cls, content) {
    var sh = (cls.sheets && cls.sheets[content]) || {}, keys = Object.keys(sh);
    var rows = [["Student", "Aptitude"].concat(keys.map(function (k) { return sh[k].title; }))];
    cls.roster.forEach(function (s) { rows.push([s.name, s.apt].concat(keys.map(function (k) { return (sh[k].marks || {})[s.name] || ""; }))); });
    return rows.map(function (r) { return r.join("\t"); }).join("\n");
  }

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "") || { classes: {} }; } catch (e) { return { classes: {} }; } }
  function store(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }

  function el(t, c, h) { var e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function today() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }

  // the sheet for one LSA: tool bar + one box per student. lsa: { key, title }
  function sheet(host, className, lsa) {
    host.innerHTML = "";
    var d = load(), cls = d.classes[className];
    if (!cls) { host.appendChild(el("p", "mlt-dim", "Choose a class (under “Classes and records”) to keep the record sheet here.")); return; }
    if (!cls.roster.length) { host.appendChild(el("p", "mlt-dim", "This class has no students yet.")); return; }
    var content = contentOf(lsa.title), mode = modeOf(lsa.title);
    cls.sheets = cls.sheets || {}; cls.sheets[content] = cls.sheets[content] || {};
    var rec = cls.sheets[content][lsa.key] = cls.sheets[content][lsa.key] || { title: lsa.title, mode: mode, dates: [], marks: {} };
    if (rec.dates.indexOf(today()) < 0) { rec.dates.push(today()); store(d); }
    var tool = mode === "check" ? "✓" : "auto";
    host.appendChild(el("div", "rs-h", "<b>" + esc(className) + "</b>: " + (content === "tonal" ? "tonal" : "rhythm") + " chart, " +
      (mode === "line" ? "teaching / evaluation mode" : "right / wrong") + ' <span class="mlt-dim">(Mullen pp. 83–84)</span>'));
    var bar = el("div", "rs-tools");
    TOOLS[mode].forEach(function (x) {
      var b = el("button", "btn btn-sm " + (x.t === tool ? "btn-primary" : "btn-outline-secondary"), esc(x.label || x.t)); b.type = "button"; b.title = x.tip; b.dataset.t = x.t;
      b.onclick = function () { tool = x.t; [].forEach.call(bar.children, function (c) { c.className = "btn btn-sm " + (c.dataset.t === tool ? "btn-primary" : "btn-outline-secondary"); }); };
      bar.appendChild(b);
    });
    host.appendChild(bar);
    var grid = el("div", "rs-grid");
    cls.roster.forEach(function (s) {
      var box = el("button", "rs-box rs-" + s.apt); box.type = "button";
      var draw = function () { box.innerHTML = '<span class="rs-name">' + esc(s.name) + '</span><span class="rs-marks">' + esc(rec.marks[s.name] || "") + "</span>"; };
      draw();
      box.onclick = function () { var dd = load(); var r = dd.classes[className].sheets[content][lsa.key]; r.marks[s.name] = mark(r.marks[s.name], tool, mode); rec = r; store(dd); draw(); };
      grid.appendChild(box);
    });
    host.appendChild(grid);
    host.appendChild(el("p", "mlt-dim rs-key", mode === "line" ? "| teaching mode · + evaluation mode · ○ another chance · a absent · x not attending. Bold: high aptitude; underlined: low." :
      "✓ right · ✗ wrong · • answered “Do you agree?” · a absent. Bold: high aptitude; underlined: low."));
  }

  // the class manager: choose / add / delete a class, edit its roster, copy its sheets
  function classes(host, onChange) {
    var cur = null;
    try { cur = localStorage.getItem(KEY + "-cur"); } catch (e) {}
    host.innerHTML = '<div class="rs-row"><label>Class <select class="rs-cls"></select></label> ' +
      '<button type="button" class="btn btn-sm btn-outline-secondary rs-new">New class</button> ' +
      '<button type="button" class="btn btn-sm btn-outline-secondary rs-delc">Delete class</button></div>' +
      '<div class="rs-edit"><label>Students, one per line (<b>+</b> in front = high aptitude, <b>-</b> = low)<br><textarea class="rs-roster" rows="8"></textarea></label><br>' +
      '<button type="button" class="btn btn-sm btn-outline-secondary rs-saver">Save students</button> ' +
      '<button type="button" class="btn btn-sm btn-outline-secondary rs-copy" data-c="tonal">Copy tonal sheet as table</button> ' +
      '<button type="button" class="btn btn-sm btn-outline-secondary rs-copy" data-c="rhythm">Copy rhythm sheet as table</button> <span class="rs-msg mlt-dim"></span></div>';
    var q = function (s) { return host.querySelector(s); };
    function fill() {
      var d = load(), sel = q(".rs-cls"); sel.innerHTML = '<option value="">(none)</option>';
      Object.keys(d.classes).sort().forEach(function (n) { var o = el("option", null, esc(n)); o.value = n; sel.appendChild(o); });
      if (cur && d.classes[cur]) sel.value = cur; else cur = sel.value = "";
      q(".rs-edit").style.display = cur ? "" : "none";
      q(".rs-roster").value = cur ? rosterText(d.classes[cur].roster) : "";
      try { localStorage.setItem(KEY + "-cur", cur || ""); } catch (e) {}
      if (onChange) onChange(cur);
    }
    q(".rs-cls").onchange = function () { cur = this.value; fill(); };
    q(".rs-new").onclick = function () { var n = prompt("Class name (e.g. 3B Tuesday)"); if (!n) return; var d = load(); d.classes[n] = d.classes[n] || { roster: [], sheets: {} }; store(d); cur = n; fill(); q(".rs-roster").focus(); };
    q(".rs-delc").onclick = function () { if (!cur || !confirm("Delete " + cur + " and all its records?")) return; var d = load(); delete d.classes[cur]; store(d); cur = ""; fill(); };
    q(".rs-saver").onclick = function () { var d = load(); d.classes[cur].roster = parseRoster(q(".rs-roster").value); store(d); q(".rs-msg").textContent = "Saved."; fill(); };
    [].forEach.call(host.querySelectorAll(".rs-copy"), function (b) {
      b.onclick = function () { var t = table(load().classes[cur], b.dataset.c);
        (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { q(".rs-msg").textContent = "Copied: paste into a spreadsheet."; }, function () { q(".rs-msg").textContent = "Copy failed."; }); };
    });
    fill();
    return { current: function () { return cur; } };
  }

  var api = { parseRoster: parseRoster, rosterText: rosterText, modeOf: modeOf, contentOf: contentOf, mark: mark, table: table, sheet: sheet, classes: classes, KEY: KEY };
  global.LSARecord = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
