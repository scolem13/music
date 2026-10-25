// pathway.js: "where you are" in the course (course/pathway.qmd).
// Data: apps/shared/course/pathway.json (scripts/course-pathway.mjs, from the Task Sheets org file) and glossary.json
// (command terms, DP components and achievement levels). The unit shown is ?at=myp4.2 (or the last one picked, kept in
// localStorage); ticks ("I can do this") are kept in localStorage and travel in a share link ?p=<packed {at,ticks,name}>.
(function () {
  "use strict";
  var K = window.CourseKit, esc = K.esc, md = K.md;
  var P, G, gl = {}, st, shared = null;
  var DP_CHANGE = 2028;   // the new DP Music course starts in fall 2028
  var STRAND_NAME = { Ai: "Investigate the genre", Aii: "Respond to one piece", Bi: "Explore ideas in practice", Bii: "Artistic intention and choices",
    C: "Create or perform", Di: "Appraise the finished work", Dii: "Reflect on your development" };
  var TASK = { Ai: 1, Aii: 1, Bi: 2, Bii: 2, C: 3, Di: 4, Dii: 4 };

  function schoolYear() { var d = new Date(); return d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1; }   // from August
  function stops() {
    return P.units.map(function (u) { return { id: u.id, label: u.year < 4 ? "MYP" + u.year : "MYP" + u.year + " U" + (u.id.split(".")[1] || 1), year: u.year, unit: u }; })
      .concat([{ id: "dp1", label: "DP1", year: 6 }, { id: "dp2", label: "DP2", year: 7 }]);
  }
  function idx(id) { return stops().map(function (s) { return s.id; }).indexOf(id); }
  function glink(slug, text) { var t = gl[slug]; return t ? '<a href="glossary.html#' + esc(slug) + '" title="' + esc(t.short) + '">' + esc(text || t.title) + "</a>" : esc(text || slug); }
  // put glossary links on the command terms inside a rubric phrase ("critiques, all three")
  var VERBS = { describes: "describe", describe: "describe", analyses: "analyse", analyse: "analyse", evaluates: "evaluate", evaluate: "evaluate",
    critiques: "critique", critique: "critique", discusses: "discuss", discuss: "discuss", explains: "explain", explain: "explain", justifies: "justify", justify: "justify" };
  function verbs(s) { return esc(s).replace(/\b(describes?|analy[sz]es?|evaluates?|critiques?|discuss(?:es)?|explains?|justif(?:y|ies))\b/gi, function (w) { var k = VERBS[w.toLowerCase()]; return k ? glink(k, w) : w; }); }

  function ticks() { return shared ? shared.ticks || {} : K.load("pathway-ticks", {}); }
  function setTick(id, on) { var t = K.load("pathway-ticks", {}); if (on) t[id] = 1; else delete t[id]; K.save("pathway-ticks", t); }

  // ── picker ──────────────────────────────────────────────────────────────
  function picker() {
    var el = document.getElementById("pw-picker"), last = 0;
    el.innerHTML = stops().map(function (s) {
      var sep = s.year !== last && last ? '<span class="pw-sep"></span>' : ""; last = s.year;
      return sep + '<button type="button" data-at="' + s.id + '" aria-pressed="' + (s.id === st.at) + '">' + esc(s.label) + "</button>";
    }).join("");
    el.onclick = function (e) { var b = e.target.closest("button[data-at]"); if (!b) return; go(b.dataset.at); };
  }
  function go(at) {
    st.at = at; if (!shared) K.save("pathway-at", at);
    var u = new URL(location.href); u.searchParams.set("at", at); if (!shared) u.searchParams.delete("p"); history.replaceState(null, "", u);
    renderAll();
  }

  // ── where you are ───────────────────────────────────────────────────────
  function item(c, i, here) {
    var on = !!ticks()[c.id], u = P.units.filter(function (x) { return x.id === c.unit; })[0];
    return '<li class="' + (idx(c.unit) > i ? "later" : "") + '"><input type="checkbox" data-tick="' + esc(c.id) + '"' + (on ? " checked" : "") + (shared ? " disabled" : "") +
      ' aria-label="I can do this: ' + esc(c.text) + '"><span>' + md(c.text) + ' <span class="pw-tag">' + esc(u ? u.label.replace(/^(MYP[\d.]+).*/, "$1") : c.unit) + (here ? " · new" : "") + "</span></span></li>";
  }
  function unitView(i) {
    var s = stops()[i], u = s.unit, stage = u.rubric, nextStage = stage === 1 ? 3 : stage === 3 ? 5 : null;
    var h = '<div class="pw-unit"><h3>' + esc(u.title || u.label.replace(/^MYP[\d.]+\s*/, "")) + " <small>(" + esc("MYP" + u.year + (u.id.indexOf(".") > 0 ? ", unit " + u.id.split(".")[1] : "")) +
      ", Year " + stage + " rubric)</small></h3>";
    if (u.fullRun) h += '<div class="pw-now">' + u.fullRun.map(function (x) { return "<p style=\"margin:.2rem 0\">" + md(x) + "</p>"; }).join("") + "</div>";
    u.notes.forEach(function (n) { if (!/^Top band/.test(n.label)) h += '<p class="crs-note"><strong>' + esc(n.label) + ":</strong> " + md(n.text) + "</p>"; });
    h += '<div class="pw-grid">';
    P.strands.forEach(function (S) {
      var d = u.detail[S], items = P.checklist.filter(function (c) { return c.strand === S; });
      var past = items.filter(function (c) { return idx(c.unit) < i; }), now = items.filter(function (c) { return c.unit === u.id; });
      var later = P.units.slice(i + 1).filter(function (x) { return x.detail[S]; })[0];
      var off = !d && !u.fullRun;
      h += '<div class="pw-card' + (off ? " off" : "") + '"><h4>' + esc(S) + " <small>Task " + TASK[S] + " · " + esc(STRAND_NAME[S]) + "</small></h4>";
      if (d) h += '<div class="pw-lab now">New this unit</div><div class="pw-now">' + md(d.text) + "</div>";
      else if (u.fullRun) h += '<div class="pw-lab now">This unit</div><div class="pw-now">Everything below, in ePortfolio format, with no step-by-step sheet.</div>';
      else h += '<div class="pw-lab now">This unit</div><p class="pw-band" style="margin:0">Not assessed in this unit. The skills you already have still count when it comes back.</p>';
      if (now.length && !u.fullRun) h += '<ul class="pw-list">' + now.map(function (c) { return item(c, i, true); }).join("") + "</ul>";
      if (past.length) h += '<div class="pw-lab past">Keep doing (from earlier units)</div><ul class="pw-list">' + past.map(function (c) { return item(c, i); }).join("") + "</ul>";
      h += '<div class="pw-lab band">Top band (7–8) now</div><div class="pw-band">' + verbs(P.rubric[S].top[stage]) + "</div>";
      if (later) h += '<div class="pw-lab next">Coming next: ' + esc(later.label.replace(/^(MYP[\d.]+).*/, "$1")) + "</div><div class=\"pw-band\">" + md(later.short[S] || "") + "</div>";
      if (nextStage && P.rubric[S].newAt[nextStage] && !/^No change/i.test(P.rubric[S].newAt[nextStage]))
        h += '<div class="pw-lab next">At Year ' + nextStage + " (MYP" + (nextStage === 3 ? 2 : 4) + ")</div><div class=\"pw-band\">" + verbs(P.rubric[S].newAt[nextStage]) + "</div>";
      h += "</div>";
    });
    return h + "</div></div>";
  }
  function dpView(s) {
    var comps = ["exploring-music-in-context", "experimenting-with-music", "presenting-music", "contemporary-music-maker"];
    var map = [["Criterion A (Ai, Aii)", "Exploring music in context", "Research into diverse music, written in your own words with sources; now across personal, local and global contexts."],
      ["Criterion B (Bi, Bii)", "Experimenting with music", "Practical evidence of trying ideas, with a rationale: the three-stage evidence and the intention become the experimentation report."],
      ["Criterion C", "Presenting music", "Finished work as creator and performer, with programme notes as researcher."],
      ["Criterion D (Di, Dii)", "Experimenting, and the contemporary music-maker (HL)", "Evaluating the work and your own process continues in the report's commentary and the HL project's evaluation."]];
    var dpLevels = ["uninformed-imitation", "precise-imitation", "informed-proficiency", "mastery-and-resourcefulness"];
    var startYear = schoolYear() - (s.id === "dp2" ? 1 : 0);
    var h = '<div class="pw-unit"><h3>' + esc(s.label) + " Music</h3>";
    if (startYear >= DP_CHANGE) h += '<p class="crs-note">You are on the new DP Music course (from fall 2028). The terms below are from the course it replaces.</p>';
    h += '<div class="pw-grid">' + comps.map(function (c) { var t = gl[c]; return t ? '<div class="pw-card"><h4>' + glink(c) + "</h4><p class=\"pw-band\" style=\"margin:0\">" + md(t.short) + "</p>" + (t.long || "") + "</div>" : ""; }).join("") + "</div>";
    h += '<h4 style="margin-top:1rem">The DP rubric ladder</h4><div class="pw-scroll"><table class="pw-table"><tr><th>Level</th><th>What it looks like</th></tr>' + dpLevels.map(function (d, i) {
      var t = gl[d]; return t ? "<tr><td>" + (i + 1) + ": " + glink(d) + "</td><td>" + md(t.short) + "</td></tr>" : ""; }).join("") + "</table></div>";
    h += '<h4 style="margin-top:1rem">What carries over from the MYP</h4><p class="crs-count">How the MYP criteria lead into the DP components. This is the course\'s reading, not IB wording.</p>' +
      '<div class="pw-scroll"><table class="pw-table"><tr><th>MYP</th><th>DP</th><th>What carries over</th></tr>' + map.map(function (r) { return "<tr><td>" + r.join("</td><td>") + "</td></tr>"; }).join("") + "</table></div>";
    return h + "</div>";
  }
  function where() {
    var i = idx(st.at), s = stops()[i], el = document.getElementById("pw-where");
    el.innerHTML = (shared ? '<div class="crs-note en-viewing">You are looking at ' + (shared.name ? "<strong>" + esc(shared.name) + "</strong>'s" : "a shared") +
      ' pathway. Ticks are read-only. <button type="button" class="crs-btn" id="pw-mine">Make these ticks mine</button> <a href="pathway.html">Back to my own</a></div>' : "") +
      (s.unit ? unitView(i) : dpView(s));
    var mine = document.getElementById("pw-mine");
    if (mine) mine.onclick = function () { K.save("pathway-ticks", shared.ticks || {}); K.save("pathway-at", shared.at); shared = null; go(st.at); };
    el.onchange = function (e) { var b = e.target.closest("input[data-tick]"); if (b) { setTick(b.dataset.tick, b.checked); progress(); } };
    progress();
  }
  function progress() {
    var el = document.getElementById("pw-progress"); if (!el) return;
    var i = idx(st.at), due = P.checklist.filter(function (c) { return idx(c.unit) <= i; }), t = ticks();
    var n = due.filter(function (c) { return t[c.id]; }).length;
    el.textContent = due.length ? "You have ticked " + n + " of the " + due.length + " skills taught up to here." : "";
  }

  // ── decisions ───────────────────────────────────────────────────────────
  function decisions() {
    var s = stops()[idx(st.at)], y = s.year, sy = schoolYear();
    var dpStart = y <= 5 ? sy + (6 - y) : sy - (y - 6);
    var newCourse = dpStart >= DP_CHANGE;
    var steps = [
      { y: 3, t: "End of MYP3: continue music in MYP4?", d: "Music becomes a choice from MYP4. MYP4 brings the Year 5 rubric, so every strand steps up in the first unit." },
      { y: 4, t: "End of MYP4: do the ePortfolio in MYP5?", d: "You are in music in MYP5 either way. The ePortfolio is one unit's work in all four criteria, sent to the IB. The first MYP5 unit is a full practice run, so you can see where you stand before you choose." },
      { y: 5, t: "End of MYP5: take DP Music? SL or HL?", d: newCourse
          ? "Your DP course will be the new DP Music course that starts in fall 2028. Its details are not out yet; you will hear about it in early 2028. What you build in the MYP (research, intention, evaluation, your own playing and creating) carries over to any DP music course."
          : "SL and HL are the same course, except HL adds the " + glink("contemporary-music-maker") + " project (30% of the HL grade), a real-life music project made with other students. Components and weightings are in the DP section below." },
      { y: 6, t: "DP1 and DP2", d: newCourse ? "The new DP Music course (from fall 2028)." : "The DP Music course first assessed in 2022: " + glink("exploring-music-in-context") + ", " + glink("experimenting-with-music") + ", " + glink("presenting-music") + (", and for HL, the contemporary music-maker.") },
    ];
    document.getElementById("pw-decisions").innerHTML = '<ul class="pw-time">' + steps.map(function (x) {
      var cls = y > x.y ? "done" : (y === x.y || (x.y === 6 && y >= 6)) ? "here" : "";
      return '<li class="' + cls + '"><b>' + esc(x.t) + (cls === "here" ? " ← you are here" : "") + "</b>" + x.d + "</li>";
    }).join("") + "</ul>" + (y <= 5 ? '<p class="crs-count">If you are in ' + esc(s.label.replace(/ U\d/, "")) + " in " + sy + "–" + (sy + 1) + ", DP1 would start in fall " + dpStart + ".</p>" : "");
  }

  // ── the rubric and the whole sequence ───────────────────────────────────
  function rubric() {
    var s = stops()[idx(st.at)], stage = s.unit ? s.unit.rubric : null;
    var col = function (n) { return stage === n ? ' class="here"' : ""; };
    document.getElementById("pw-rubric").innerHTML = "<p>" + md(P.pattern) + "</p>" +
      '<div class="pw-scroll"><table class="pw-table"><tr><th>Strand</th><th' + col(1) + ">Year 1 (MYP1)</th><th" + col(3) + ">Year 3 (MYP2–3)</th><th" + col(5) + ">Year 5 (MYP4–5)</th></tr>" +
      P.strands.map(function (S) { var r = P.rubric[S].top; return "<tr><td>" + S + "</td><td" + col(1) + ">" + verbs(r[1]) + "</td><td" + col(3) + ">" + verbs(r[3]) + "</td><td" + col(5) + ">" + verbs(r[5]) + "</td></tr>"; }).join("") +
      "</table></div>" +
      "<h4 style=\"margin-top:1rem\">What is new at each step up</h4>" +
      '<div class="pw-scroll"><table class="pw-table"><tr><th>Strand</th><th' + col(3) + ">Year 1 → Year 3</th><th" + col(5) + ">Year 3 → Year 5</th></tr>" +
      P.strands.map(function (S) { var r = P.rubric[S].newAt; return "<tr><td>" + S + "</td><td" + col(3) + ">" + verbs(r[3]) + "</td><td" + col(5) + ">" + verbs(r[5]) + "</td></tr>"; }).join("") + "</table></div>";
  }
  function sequence() {
    document.getElementById("pw-sequence").innerHTML = '<div class="pw-scroll"><table class="pw-table"><tr><th>Unit</th>' + P.strands.map(function (S) { return "<th>" + S + "</th>"; }).join("") + "</tr>" +
      P.units.map(function (u) {
        return '<tr class="' + (u.id === st.at ? "here" : "") + '"><td><a href="?at=' + esc(u.id) + '" data-at="' + esc(u.id) + '">' + esc(u.label) + "</a></td>" +
          P.strands.map(function (S) { return "<td>" + (u.short[S] ? md(u.short[S]) : '<span style="opacity:.4">—</span>') + "</td>"; }).join("") + "</tr>";
      }).join("") + "</table></div>";
    document.getElementById("pw-sequence").onclick = function (e) { var a = e.target.closest("a[data-at]"); if (a) { e.preventDefault(); go(a.dataset.at); window.scrollTo({ top: 0 }); } };
  }

  // ── share ───────────────────────────────────────────────────────────────
  function share() {
    var el = document.getElementById("pw-share");
    if (shared) { el.innerHTML = "<p>This is someone else's pathway. <a href=\"pathway.html\">Go to your own</a> to share yours.</p>"; return; }
    el.innerHTML = '<p>Your ticks are saved in this browser only. To show your teacher, or to move to another device, copy this link.</p>' +
      '<div class="en-share"><label>Name <input type="text" id="pw-name" value="' + esc(K.load("student-name", "")) + '" style="width:12rem"></label>' +
      '<input type="text" id="pw-link" readonly aria-label="Share link"><button type="button" class="crs-btn primary" id="pw-copy">Copy link</button></div>';
    var name = document.getElementById("pw-name"), linkEl = document.getElementById("pw-link");
    var upd = function () { linkEl.value = K.shareLink("p", { at: st.at, ticks: K.load("pathway-ticks", {}), name: name.value.trim() }); };
    name.oninput = function () { K.save("student-name", name.value.trim()); upd(); };
    document.getElementById("pw-copy").onclick = function (e) { upd(); K.copy(linkEl.value, e.target); };
    document.getElementById("pw-where").addEventListener("change", upd);
    upd();
  }

  function renderAll() { picker(); where(); decisions(); rubric(); sequence(); share(); }
  function init() {
    if (!document.getElementById("pw-where")) return;
    Promise.all([K.json("/apps/shared/course/pathway.json?v=1"), K.json("/apps/shared/course/glossary.json?v=1")]).then(function (r) {
      P = r[0]; G = r[1];
      if (!P) { document.getElementById("pw-where").textContent = "The pathway could not be loaded."; return; }
      (G ? G.terms : []).forEach(function (t) { gl[t.slug] = t; });
      var q = new URLSearchParams(location.search);
      if (q.get("p")) { shared = K.unpack(q.get("p")); if (shared && !shared.ticks) shared.ticks = {}; }
      var at = (shared && shared.at) || q.get("at") || K.load("pathway-at", "myp1");
      st = { at: idx(at) >= 0 ? at : "myp1" };
      renderAll();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
