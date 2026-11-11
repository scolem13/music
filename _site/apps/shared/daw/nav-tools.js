// nav-tools.js — keyboard moves with a step size, loop keys and a redesigned loop ruler for the scratch-pad DAW (mini-daw.js). Opt-in: data-nav on the .mdaw div
// (tools/daw.qmd); the lesson DAWs keep their bar-only ruler and Shift+arrow moves. Loaded after mini-daw.js. Test: tests/lessons/daw-scratch.test.js (Nav.* pure parts), daw-scratch.cdp.js.
//
// STEP (menu "Step" in the transport: 1/16 · beat · bar; default beat; kept in localStorage "mdaw:<id>:step"): how far the keys move and what the mouse snaps to.
// KEYS (Arrangement and roll; a number before a key repeats it, "3l"):
//   ← →                  the playhead one step (Shift: a bar)
//   Alt+← →  or  h l     the selected NOTES in the open clip, else the selected CLIP, one step; nothing selected: the playhead (Alt+Shift, H L: a bar)
//   Alt+↑ ↓              transpose the selected notes a semitone (Shift: an octave)
//   ,  .                 loop start / end at the playhead (the loop turns on; the other end is kept, or a step / bar away when it would end up before it)
//   \                    loop on / off (O still does)       Shift+O  loop the selected clip       Esc  select nothing (so h / l move the playhead)
// (↑ ↓ pick the track, [ ] the clip, N, P, - = work as before; j k are still track up / down.) These replace Shift+arrow clip moves on a DAW with data-nav.
// LOOP in exact beats: p.loop.fb / p.loop.tb (beats; loop.from / loop.to stay as the bars around them, so older code still reads a loop); Daw.loopSpan() gives [a, b].
// RULER (replaces the old drag in bar units): drag across it to draw the loop (snapped to the step), drag the left / right handle to resize, drag the bar between to move it,
// double-click a bar to loop that bar, a click puts the playhead there. Handles are 14 px wide and full height, drawn with grips; works at any zoom (positions are beats x beatW()).
(function (global) {
  "use strict";
  var M = global.MiniDaw; if (!M || !M.core) return;
  var X = M.core, Meter = X.Meter, el = X.el, clamp = X.clamp, D = X.Daw.prototype, Nav = M.Nav = {};
  var STEPS = [["sixteenth", "1/16"], ["beat", "Beat"], ["bar", "Bar"]];

  // ---------------- pure ----------------
  // the step in beats starting at beat `at` ("bar" = the bar there); bar: true forces a bar
  Nav.stepBeats = function (p, mode, at, bar) { if (bar || mode === "bar") return Meter.barAt(p, at + 1e-9).len; return mode === "sixteenth" ? 0.25 : 1; };
  // the next stop from `pos` in direction dir, `n` times: stops are multiples of the step (bar lines for a bar step)
  Nav.move = function (p, mode, pos, dir, n, bar) {
    var x = pos;
    for (var i = 0; i < Math.max(1, n || 1); i++) {
      if (bar || mode === "bar") { var a = Meter.barAt(p, x + 1e-9); x = dir > 0 ? a.start + a.len : (x - a.start > 1e-6 ? a.start : Meter.barStart(p, Math.max(0, a.bar - 1))); }
      else { var s = mode === "sixteenth" ? 0.25 : 1; x = dir > 0 ? (Math.floor(x / s + 1e-9) + 1) * s : (Math.ceil(x / s - 1e-9) - 1) * s; }
    }
    return Math.max(0, Math.round(x * 1e6) / 1e6);
  };
  // snap a beat to the step (bar: the nearest bar line)
  Nav.snap = function (p, mode, b) { if (mode === "bar") return Meter.nearest(p, b); var s = mode === "sixteenth" ? 0.25 : 1; return Math.round(b / s) * s; };
  // move notes of a clip by delta beats, kept inside [0, len); returns the delta used
  Nav.moveNotes = function (clip, idx, delta) {
    var ns = idx.map(function (i) { return clip.notes[i]; }).filter(Boolean); if (!ns.length) return 0;
    var lo = Math.min.apply(null, ns.map(function (n) { return n.t; })), hi = Math.max.apply(null, ns.map(function (n) { return n.t; })), eps = 0.01;
    var dd = clamp(delta, -lo, Math.max(-lo, clip.len - eps - hi)); ns.forEach(function (n) { n.t = Math.round((n.t + dd) * 1e6) / 1e6; }); return dd;
  };
  // a loop [a, b) in beats as the project's loop (bars around it kept in from / to)
  Nav.loopOf = function (p, a, b, on) { return { on: on !== false, from: Meter.barAt(p, a + 1e-9).bar, to: Meter.barAt(p, b - 1e-6).bar + 1, fb: a, tb: b }; };

  // ---------------- the Step menu ----------------
  Nav.build = function (d, tb) {
    var saved = null; try { saved = JSON.parse(localStorage.getItem("mdaw:" + d.id + ":step") || "null"); } catch (e) {}
    d.stepMode = STEPS.some(function (s) { return s[0] === saved; }) ? saved : "beat";
    var l = el("label", "mdaw-lbl", "Step "), s = el("select"); s.setAttribute("aria-label", "Step size for keyboard moves and loop snapping"); s.title = "How far arrows, h / l move things, and what the loop snaps to";
    STEPS.forEach(function (o) { var e = el("option", null, o[1]); e.value = o[0]; s.appendChild(e); }); s.value = d.stepMode; l.appendChild(s);
    s.onchange = function () { d.stepMode = s.value; try { localStorage.setItem("mdaw:" + d.id + ":step", JSON.stringify(s.value)); } catch (e) {} d.say("Step: " + s.options[s.selectedIndex].text + "."); };
    d.stepSel = s;
    var bc = el("button"); bc.type = "button"; bc.className = "btn btn-sm btn-outline-secondary"; bc.textContent = "⟲ Loop clip"; bc.title = "Loop the selected clip (Shift+O)"; bc.onclick = function () { Nav.loopClip(d); };
    tb.appendChild(l); tb.appendChild(bc);
  };
  Nav.loopClip = function (d) {
    var c = d.clip(), p = d.p; if (!c || d.sel.slot >= 0) return d.say("Select a clip in the arrangement first.");
    d.change(function () { p.loop = Nav.loopOf(p, c.start, c.start + c.len, true); });
    d.say("Loop on: bar " + (Meter.where(p, c.start).bar) + " to the end of the clip.");
  };

  // ---------------- keys ----------------
  Nav.key = function (d, e, N) {
    if (e.ctrlKey || e.metaKey) return false;
    var p = d.p, mode = d.stepMode || "beat", t = e.target; N = N || 1;
    if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return false;
    var code = e.code || "", k = e.key, left = k === "ArrowLeft", right = k === "ArrowRight", vimL = code === "KeyH" || (!code && (k === "h" || k === "H")), vimR = code === "KeyL" || (!code && (k === "l" || k === "L")),
      dir = left || vimL ? -1 : 1, vim = vimL || vimR, big = e.shiftKey, c = d.clip(), inArr = d.sel.slot >= 0 ? null : c, tr = d.track(), notes = c && d.sel.notes.length ? d.sel.notes.slice() : null;
    if (left || right || vim) {
      var moveSel = (e.altKey && (left || right)) || (vim && !e.altKey) || (vim && e.altKey);
      if (moveSel && notes) {
        var delta = Nav.stepBeats(p, mode, c.start + d.sel.notes.reduce(function (m0, i) { return Math.min(m0, c.notes[i] ? c.notes[i].t : m0); }, 1e9), big) * N * dir, used;
        d.change(function () { used = Nav.moveNotes(c, notes, delta); }); d.sel.notes = notes; d.renderEditor0();
        d.say(used === 0 ? "The notes are at the " + (dir < 0 ? "start" : "end") + " of the clip." : "Moved " + notes.length + " note" + (notes.length > 1 ? "s" : "") + " " + (Math.round(Math.abs(used) * 100) / 100) + " beat" + (Math.abs(used) === 1 ? "" : "s") + (dir < 0 ? " earlier." : " later.")); return true;
      }
      if (moveSel && inArr) {
        var to = Nav.move(p, mode, inArr.start, dir, N, big);
        d.change(function () { inArr.start = clamp(to, 0, Math.max(0, Meter.total(p) - 1)); });
        d.say((tr ? tr.name : "") + " clip moved to bar " + Meter.where(p, inArr.start).bar + ", beat " + Meter.where(p, inArr.start).beat + "."); return true;
      }
      d.locate(clamp(Nav.move(p, mode, d.pos, dir, N, big), 0, Meter.total(p))); if (d.revealHead) d.revealHead(); var w = Meter.where(p, d.pos); d.say("Playhead: bar " + w.bar + ", beat " + w.beat + "."); return true;
    }
    if (e.altKey && (k === "ArrowUp" || k === "ArrowDown") && notes && tr && !X.isDrum(tr)) {
      var semi = (k === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 12 : 1) * N;
      d.change(function () { notes.forEach(function (i) { if (c.notes[i]) c.notes[i].m = clamp(c.notes[i].m + semi, 21, 108); }); }); d.sel.notes = notes; d.renderEditor0();
      d.say("Transposed " + notes.length + " note" + (notes.length > 1 ? "s" : "") + " " + (semi > 0 ? "up " : "down ") + Math.abs(semi) + " semitone" + (Math.abs(semi) > 1 ? "s" : "") + "."); return true;
    }
    if (k === "," || k === ".") {
      var sp = d.loopSpan(), l = p.loop, hasLoop = sp[1] > sp[0], a = sp[0], b = sp[1], tot = Meter.total(p), pos = d.pos, minLen = Nav.stepBeats(p, mode, pos, false);
      if (k === ",") { a = pos; if (!hasLoop || b <= a) b = Math.min(tot, a + Math.max(minLen, Meter.barAt(p, a + 1e-9).len)); }
      else { b = pos; if (!hasLoop || a >= b) a = Math.max(0, b - Math.max(minLen, Meter.barAt(p, b - 1e-9).len)); }
      if (!(b > a)) { d.say("The loop needs room: move the playhead first."); return true; }
      d.change(function () { p.loop = Nav.loopOf(p, a, b, true); });
      d.say("Loop " + (k === "," ? "starts" : "ends") + " here: beats " + (Math.round(a * 100) / 100 + 1) + " to " + (Math.round(b * 100) / 100 + 1) + " (on)."); return true;
    }
    if (k === "\\") { d.bLoop.click(); d.say("Loop " + (d.p.loop.on ? "on" : "off") + "."); return true; }
    if (k === "O" && e.shiftKey) { Nav.loopClip(d); return true; }
    if (k === "Escape" && (d.sel.notes.length || d.sel.clip >= 0)) { d.sel = { track: d.sel.track, clip: -1, slot: -1, notes: [] }; d.renderTracks(); d.renderEditor(); d.say("Nothing selected: h / l move the playhead."); return true; }
    return false;
  };

  // ---------------- the ruler ----------------
  // lp is the loop element the DAW made; here it becomes a full-height region with two handles.
  Nav.ruler = function (d, ruler, lp, W, total) {
    var p = d.p, sp = d.loopSpan(), mode = function () { return d.stepMode || "beat"; };
    lp.className = "mdaw-loop mdaw-loopr" + (p.loop.on ? " mdaw-loopon" : "") + (sp[1] > sp[0] ? "" : " mdaw-loopnone");
    lp.innerHTML = ""; var hl = el("span", "mdaw-loop-h mdaw-loop-l"), hr = el("span", "mdaw-loop-h mdaw-loop-r"); hl.dataset.part = "l"; hr.dataset.part = "r"; lp.dataset.part = "m";
    hl.title = "Drag to move the loop start"; hr.title = "Drag to move the loop end"; lp.title = "Drag to move the loop; double-click a bar to loop it";
    lp.appendChild(hl); lp.appendChild(hr);
    function place(a, b) { lp.style.left = (a * W) + "px"; lp.style.width = Math.max(0, (b - a) * W) + "px"; lp.style.display = b > a ? "" : "none"; }
    place(sp[0], sp[1]);
    ruler.style.touchAction = "none";
    ruler.addEventListener("pointerdown", function (e) {
      if (e.button) return;
      var r = ruler.getBoundingClientRect(), part = e.target && e.target.dataset && e.target.dataset.part && sp[1] > sp[0] ? e.target.dataset.part : "new", x0 = e.clientX - r.left, b0 = clamp(Nav.snap(p, mode(), x0 / W), 0, total),
        a = sp[0], z = sp[1], moved = false, minLen = Nav.stepBeats(p, mode(), b0, false), live = [a, z];
      if (part !== "new") e.stopPropagation();
      function at(ev) { return clamp(Nav.snap(p, mode(), (ev.clientX - r.left) / W), 0, total); }
      function mv(ev) {
        if (!moved && Math.abs(ev.clientX - r.left - x0) < 3) return; moved = true; var b1 = at(ev);
        if (part === "new") { live = [Math.min(b0, b1), Math.max(b0, b1)]; if (live[1] - live[0] < minLen) live[1] = Math.min(total, live[0] + minLen); if (live[1] - live[0] < minLen) live[0] = live[1] - minLen; }
        else if (part === "l") live = [Math.min(b1, z - minLen), z];
        else if (part === "r") live = [a, Math.max(b1, a + minLen)];
        else { var dl = b1 - b0; dl = clamp(dl, -a, total - z); live = [a + dl, z + dl]; }
        lp.classList.add("mdaw-loopon"); place(live[0], live[1]);
      }
      function up() {
        document.removeEventListener("pointermove", mv); document.removeEventListener("pointerup", up);
        if (moved) { d.change(function () { p.loop = Nav.loopOf(p, live[0], live[1], true); }); d.say("Loop: beat " + (Math.round(live[0] * 100) / 100 + 1) + " to " + (Math.round(live[1] * 100) / 100 + 1) + " (bar " + Meter.where(p, live[0]).bar + " to bar " + Meter.where(p, live[1] - 1e-6).bar + "), on."); }
        else if (part === "new") d.locate(clamp(b0, 0, total));
      }
      document.addEventListener("pointermove", mv); document.addEventListener("pointerup", up);
    });
    ruler.addEventListener("dblclick", function (e) {
      var r = ruler.getBoundingClientRect(), b = Meter.barAt(p, (e.clientX - r.left) / W); if (b.bar >= p.bars) return;
      d.change(function () { p.loop = Nav.loopOf(p, b.start, b.start + b.len, true); }); d.say("Loop on: bar " + (b.bar + 1) + ".");
    });
  };
})(typeof window !== "undefined" ? window : globalThis);
