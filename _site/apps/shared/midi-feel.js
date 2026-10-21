// midi-feel.js — play a written line on a MIDI keyboard against a click and hear back how you phrased it:
// swing ratio, accents, ghosted notes, note lengths, where in the beat you sit, and small rhythm changes.
// One global, MidiFeel. Loads in Node for tests (analyse / expected / report need no browser).
// Needs abc-core.js and abc-events.js; in a page they are loaded on first use if missing.
//
//   MidiFeel.attach(el, { abc, bpm | getBpm(), title?, onReport(report)? })
//        adds a "Play it on a keyboard" button and a report box to el. Click: one bar of count-in clicks, then the
//        line is recorded (clicks continue) until its end plus a beat, then graded.
//   MidiFeel.expected(abc)               -> { notes, barQuarters, quarters }   notes: [{ t_on, t_off, midi, accent,
//                                           ghost, staccato, tenuto, tied, overBar }] in quarter notes.
//   MidiFeel.analyse(exp, played, { bpm }) -> report: { rows: [{ key, label, verdict: "ok"|"warn"|"bad"|"na", text }],
//                                           matched, missed, extra, swingPct, layBackMs, ... }
//        played: [{ on, off, midi, vel }] with on/off in ms from the downbeat of bar 1, vel 1..127.
//   MidiFeel.renderReport(report)        -> HTML
//   MidiFeel.connect()                   -> Promise; opens Web MIDI once for the page (every input).
//   MidiFeel.subscribe(fn)               fn({ type: "on"|"off", midi, vel, time }) for every key (time: performance.now ms)
//   MidiFeel.inject(type, midi, vel, t)  feeds a fake key (tests, or the computer keyboard).
//
// Grading follows lessons/reading-swing.qmd: swing is a range that narrows with tempo, the "and" carries the accent,
// a ghost is quieter but still there, a tie is held not re-struck, laid back is a few tens of ms, and moving a note by
// an eighth is interpretation while moving the whole line by a beat is not.

(function (global) {
  "use strict";
  var isNode = typeof module === "object" && module.exports;
  function Ev() { return global.AbcEvents || (isNode ? (global.AbcCore = global.AbcCore || require("./abc-core.js"), require("./abc-events.js")) : null); }

  // ---------- the written line ----------
  function musicText(abc) {
    return abc.split("\n").map(function (l) { return l.trim(); })
      .filter(function (l) { return l && !/^%/.test(l) && !/^[A-Za-z]:/.test(l); }).join(" ");
  }
  function expected(abc) {
    var r = Ev().fromAbc(abc), text = musicText(abc), byId = {};
    r.written.forEach(function (w) { byId[w.id] = w; });
    var ghostAt = {};
    (r.marks || []).forEach(function (m) { if (/ghost/i.test(m.text)) ghostAt[m.t] = 1; });
    var notes = r.sounding.map(function (s) {
      var first = (s.from && byId[s.from[0]]) || s, d = first.decos || [];
      var i = first.i, pre = i > 0 ? text.charAt(i - 1) : "";
      return {
        t_on: s.t_on, t_off: s.t_off, midi: s.pitches[0].midi,
        accent: d.indexOf(">") >= 0 || d.indexOf("accent") >= 0,
        ghost: !!ghostAt[s.t_on] || d.indexOf("pp") >= 0 || d.indexOf("ppp") >= 0,
        staccato: pre === "." || d.indexOf("staccato") >= 0,
        tenuto: d.indexOf("tenuto") >= 0,
        tied: !!(s.from && s.from.length > 1),
        overBar: Math.floor(s.t_on / r.barQuarters + 1e-9) !== Math.floor((s.t_off - 1e-6) / r.barQuarters)
      };
    });
    return { notes: notes, barQuarters: r.barQuarters, quarters: r.quarters };
  }

  // ---------- grading ----------
  function median(a) { if (!a.length) return NaN; var s = a.slice().sort(function (x, y) { return x - y; }); var m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
  function mean(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : NaN; }
  function frac(t) { return t - Math.floor(t + 1e-9); }
  function near(a, b) { return Math.abs(a - b) < 1e-6; }

  // the swing range the lesson's table gives for a tempo, in percent of the beat taken by the first eighth
  function swingRange(bpm) {
    if (bpm < 90) return [60, 72];
    if (bpm <= 170) return [56, 70];
    if (bpm <= 220) return [53, 66];
    return [50, 60];
  }

  function analyse(exp, played, opts) {
    var bpm = (opts && opts.bpm) || 120, beatMs = 60000 / bpm, notes = exp.notes;
    var P = played.map(function (p, k) { return { k: k, b: p.on / beatMs, len: (p.off == null ? p.on + beatMs / 2 : p.off) / beatMs - p.on / beatMs, midi: p.midi, vel: p.vel, used: false }; });

    // global shift first: the whole line late or early by about a beat is "moved", not interpretation
    function match(shift) {
      P.forEach(function (p) { p.used = false; });
      return notes.map(function (n) {
        var best = null, bd = 1e9;
        P.forEach(function (p) {
          if (p.used || p.midi !== n.midi) return;
          var d = Math.abs(p.b - n.t_on - shift);
          if (d <= 0.8 && d < bd) { bd = d; best = p; }
        });
        if (best) best.used = true;
        return best;
      });
    }
    var shift = 0, m = match(0), hits = m.filter(Boolean).length;
    [-2, -1, 1, 2].forEach(function (s) { var mm = match(s), h = mm.filter(Boolean).length; if (h > hits * 1.3 && h >= 2) { hits = h; shift = s; } });
    m = match(shift);
    var rows = [], extra = P.filter(function (p) { return !p.used; });
    var pairs = notes.map(function (n, i) { return { n: n, p: m[i], d: m[i] ? m[i].b - n.t_on : null }; });
    var got = pairs.filter(function (x) { return x.p; });
    var missed = pairs.filter(function (x) { return !x.p; });
    var vels = got.map(function (x) { return x.p.vel; }), medVel = median(vels);

    var res = { bpm: bpm, shift: shift, matched: got.length, total: notes.length, missed: missed.length, extra: extra.length, rows: rows };
    if (!played.length) { rows.push({ key: "none", label: "Nothing heard", verdict: "na", text: "No keys came in. Is the keyboard connected and picked up (the dot by the button)?" }); return res; }

    // notes in the line: wrong notes and missing notes first
    rows.push({ key: "notes", label: "Notes", verdict: missed.length === 0 && extra.length <= 1 ? "ok" : missed.length > notes.length / 3 ? "bad" : "warn",
      text: got.length + " of " + notes.length + " written notes played" + (missed.length ? ", " + missed.length + " missing" : "") +
        (extra.length ? ", " + extra.length + " extra or wrong" : "") + "." });

    // swing: off-beat eighths after a note on the beat, measured against the click
    var offs = got.filter(function (x) { return near(frac(x.n.t_on), 0.5) && x.n.t_off - x.n.t_on <= 0.5 + 1e-6 && Math.abs(x.d - shift) < 0.3; });
    // against the player's own beat (a laid-back player's off-beats are late by the same amount, not more swung)
    var onDev = median(got.filter(function (x) { return near(frac(x.n.t_on), 0) && Math.abs(x.d - shift) < 0.25; }).map(function (x) { return x.d - shift; }));
    if (isNaN(onDev)) onDev = 0;
    var pct = offs.map(function (x) { return (x.p.b - shift - onDev - Math.floor(x.n.t_on)) * 100; });
    var range = swingRange(bpm);
    res.swingPct = pct.length ? Math.round(median(pct)) : null;
    if (pct.length >= 2) {
      var sp = res.swingPct, v = sp >= 73 ? "bad" : sp >= range[0] - 3 && sp <= range[1] + 2 ? "ok" : "warn";
      rows.push({ key: "swing", label: "Swing", verdict: v, text: "Your off-beats came " + sp + "% of the way through the beat (" +
        (sp <= 52 ? "even" : sp >= 73 ? "dotted, like a march" : (sp / (100 - sp)).toFixed(1) + ":1") + "). At " + bpm +
        " a minute players swing about " + range[0] + "–" + range[1] + "%." +
        (v === "warn" ? (sp < range[0] ? " A little straight for this tempo." : " A little heavy for this tempo.") : "") });
    } else rows.push({ key: "swing", label: "Swing", verdict: "na", text: "Too few off-beat eighths to measure." });

    // accents: written ones louder; in eighth lines the "and" louder than the beat
    var acc = got.filter(function (x) { return x.n.accent; }), plain = got.filter(function (x) { return !x.n.accent && !x.n.ghost; });
    if (acc.length) {
      var dv = mean(acc.map(function (x) { return x.p.vel; })) - mean(plain.map(function (x) { return x.p.vel; }));
      var wrong = got.filter(function (x) { return !x.n.accent && near(frac(x.n.t_on), 0) && x.p.vel > medVel + 15; }).length;
      rows.push({ key: "accents", label: "Accents", verdict: dv >= 8 && !wrong ? "ok" : dv >= 3 ? "warn" : "bad",
        text: "Marked notes " + (dv >= 0 ? Math.round(dv) + " louder" : Math.round(-dv) + " softer") + " than the rest (velocity, 0–127)." +
          (dv < 8 ? " Lean on the marked notes more." : "") + (wrong ? " " + wrong + " unmarked beat notes stood out." : "") });
    } else {
      var on = [], off = [];
      got.forEach(function (x) {
        if (x.n.t_off - x.n.t_on > 0.5 + 1e-6 || x.n.ghost) return;
        if (near(frac(x.n.t_on), 0)) on.push(x.p.vel); else if (near(frac(x.n.t_on), 0.5)) off.push(x.p.vel);
      });
      if (on.length >= 2 && off.length >= 2) {
        var diff = mean(off) - mean(on);
        rows.push({ key: "accents", label: "Accents", verdict: diff >= 4 ? "ok" : diff >= -4 ? "warn" : "bad",
          text: diff >= 4 ? "The \"and\"s were " + Math.round(diff) + " louder than the beats: doo-BAH." :
            diff >= -4 ? "Beats and \"and\"s about as loud as each other. Try leaning on the \"and\"." :
            "The beats were " + Math.round(-diff) + " louder than the \"and\"s: DOO-bah, like a march." });
      } else rows.push({ key: "accents", label: "Accents", verdict: "na", text: "No run of eighths to compare." });
    }

    // ghosts: marked ones quieter but present; the note a line lands on must not vanish
    var isTarget = function (x, i) { var nx = notes[i + 1]; return x.n.t_off - x.n.t_on >= 1 && (!nx || nx.t_on > x.n.t_off + 1e-6 || i === notes.length - 1); };
    var gh = pairs.filter(function (x) { return x.n.ghost; });
    var soft = got.filter(function (x) { return x.p.vel < medVel * 0.6; });
    var lostTarget = pairs.filter(function (x, i) { return isTarget(x, i) && (!x.p || x.p.vel < medVel * 0.6); });
    if (gh.length || soft.length || lostTarget.length) {
      var ghOk = gh.filter(function (x) { return x.p && x.p.vel < medVel * 0.8; }).length, ghGone = gh.filter(function (x) { return !x.p; }).length;
      var t = [];
      if (gh.length) t.push(ghOk + " of " + gh.length + " marked ghosts played softly" + (ghGone ? ", " + ghGone + " left out (a ghost is still felt)" : "") + ".");
      else if (soft.length) t.push(soft.length + " note" + (soft.length > 1 ? "s" : "") + " ghosted on your own.");
      if (lostTarget.length) t.push("The note the line lands on went missing or nearly so: keep it.");
      rows.push({ key: "ghosts", label: "Ghosted notes", verdict: lostTarget.length ? "bad" : gh.length && ghOk < gh.length ? "warn" : "ok", text: t.join(" ") });
    }

    // lengths: staccato short, tenuto held, ties held over the bar line (not struck again)
    var st = got.filter(function (x) { return x.n.staccato; }), te = got.filter(function (x) { return x.n.tenuto; });
    var ties = pairs.filter(function (x) { return x.n.overBar || x.n.tied; });
    var restruck = ties.filter(function (x) {
      return extra.some(function (p) { return p.midi === x.n.midi && p.b - shift > x.n.t_on + 0.2 && p.b - shift < x.n.t_off; });
    });
    var lt = [], lv = "ok";
    function ratio(x) { return x.p.len / (x.n.t_off - x.n.t_on); }
    if (st.length) { var sr = median(st.map(ratio)); lt.push("Staccato notes held " + Math.round(sr * 100) + "% of their value" + (sr > 0.7 ? ": play them shorter (dit)." : ".")); if (sr > 0.7) lv = "warn"; }
    if (te.length) { var tr = median(te.map(ratio)); lt.push("Tenuto notes held " + Math.round(tr * 100) + "%" + (tr < 0.75 ? ": hold them longer (doo)." : ".")); if (tr < 0.75) lv = "warn"; }
    if (!st.length && !te.length) {
      var q = got.filter(function (x) { return near(x.n.t_off - x.n.t_on, 1); });
      if (q.length) { var qr = median(q.map(ratio)); lt.push("Quarter notes held " + Math.round(qr * 100) + "% (" + (qr < 0.6 ? "short, dit" : "long, doo") + "): either is fine."); }
    }
    if (restruck.length) { lt.push(restruck.length + " tied note" + (restruck.length > 1 ? "s were" : " was") + " struck again instead of held over the bar line."); lv = "bad"; }
    else if (ties.length) {
      var short = ties.filter(function (x) { return x.p && ratio(x) < 0.7; }).length;
      lt.push(short ? short + " tie" + (short > 1 ? "s" : "") + " let go early (under 70% of the tied length)." : "Ties held through.");
      if (short) lv = "warn";
    }
    if (lt.length) rows.push({ key: "length", label: "Length", verdict: lv, text: lt.join(" ") + " (Key release; the pedal doesn't count.)" });

    // where in the beat: notes on the beat against the click
    var onb = got.filter(function (x) { return near(frac(x.n.t_on), 0) && Math.abs(x.d - shift) < 0.25; });
    if (shift) {
      rows.push({ key: "beat", label: "Where in the beat", verdict: "bad", text: "The whole line came " + Math.abs(shift) + " beat" + (Math.abs(shift) > 1 ? "s " : " ") + (shift > 0 ? "late" : "early") + ": it moved, rather than sitting back. Count in and come in on the written beat." });
    } else if (onb.length >= 2) {
      var ms = Math.round(median(onb.map(function (x) { return x.d * beatMs; })));
      res.layBackMs = ms;
      var drift = got.filter(function (x) { return near(frac(x.n.t_on), 0) && x.d > 0.3 && x.d < 0.7; }).length;
      rows.push({ key: "beat", label: "Where in the beat", verdict: drift > got.length / 3 ? "bad" : Math.abs(ms) > Math.min(90, beatMs * 0.2) ? "warn" : "ok",
        text: (Math.abs(ms) <= 20 ? "Right on the click" : ms > 0 ? "Laid back, " + ms + " ms behind the click" : "Pushing, " + (-ms) + " ms ahead of the click") +
          " (median of notes on the beat)." + (drift > got.length / 3 ? " Many beat notes landed on the \"and\": too far behind to still be the beat." : "") });
    }

    // small changes: a note moved by about an eighth is interpretation
    var moved = got.filter(function (x) { var dd = x.d - shift; return Math.abs(dd) >= 0.35 && Math.abs(dd) <= 0.65 && !(near(frac(x.n.t_on), 0.5) && dd > 0); });
    if (moved.length && !shift) rows.push({ key: "changes", label: "Small changes", verdict: "ok",
      text: moved.length + " note" + (moved.length > 1 ? "s" : "") + " moved by about an eighth (" +
        moved.filter(function (x) { return x.d < 0; }).length + " anticipated, " + moved.filter(function (x) { return x.d > 0; }).length + " delayed): interpretation, fine on a lead sheet." });

    res.missedNotes = missed.map(function (x) { return x.n; });
    return res;
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var MARK = { ok: "✓", warn: "~", bad: "✗", na: "–" };
  function renderReport(r) {
    return '<table class="mf-table">' + r.rows.map(function (row) {
      return '<tr class="mf-' + row.verdict + '"><td class="mf-mark">' + MARK[row.verdict] + '</td><th>' + esc(row.label) + '</th><td>' + esc(row.text) + '</td></tr>';
    }).join("") + "</table>";
  }

  // ---------- MIDI in ----------
  var subs = [], access = null, connecting = null, held = {};
  function emit(e) { subs.slice().forEach(function (f) { try { f(e); } catch (err) { console.error(err); } }); }
  function onMsg(ev) {
    var d = ev.data, st = d[0] & 0xf0, now = performance.now(), t = ev.timeStamp;
    if (!(t > 0) || Math.abs(t - now) > 1000) t = now;   // a stamp from another clock (some systems): use now
    if (st === 0x90 && d[2] > 0) emit({ type: "on", midi: d[1], vel: d[2], time: t });
    else if (st === 0x80 || (st === 0x90 && d[2] === 0)) emit({ type: "off", midi: d[1], vel: 0, time: t });
  }
  function hook() { access.inputs.forEach(function (inp) { inp.onmidimessage = null; inp.addEventListener("midimessage", onMsg); }); }
  function connect() {
    if (access) return Promise.resolve(access);
    if (connecting) return connecting;
    if (!global.navigator || !navigator.requestMIDIAccess) return Promise.reject(new Error("This browser has no Web MIDI (use Chrome or Edge)."));
    connecting = navigator.requestMIDIAccess().then(function (a) {
      access = a; hook();
      a.onstatechange = function () { hook(); emit({ type: "state" }); };
      return a;
    });
    connecting.catch(function () { connecting = null; });
    return connecting;
  }
  function inputCount() { var n = 0; if (access) access.inputs.forEach(function () { n++; }); return n; }
  function subscribe(f) { subs.push(f); return function () { subs = subs.filter(function (g) { return g !== f; }); }; }
  function inject(type, midi, vel, t) { emit({ type: type, midi: midi, vel: vel || 0, time: t == null ? performance.now() : t }); }

  // ---------- the page part ----------
  function loadScript(src) { return new Promise(function (ok, no) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
  function deps() {
    var p = Promise.resolve();
    if (!global.AbcCore) p = p.then(function () { return loadScript("/apps/shared/abc-core.js"); });
    return p.then(function () { if (!global.AbcEvents) return loadScript("/apps/shared/abc-events.js"); });
  }
  var ac = null;
  function audio() { ac = ac || new (global.AudioContext || global.webkitAudioContext)(); ac.resume(); return ac; }
  function click(at, accent) {
    var o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = accent ? 1500 : 1000; o.connect(g); g.connect(ac.destination);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(accent ? 0.35 : 0.2, at + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
    o.start(at); o.stop(at + 0.06);
  }
  function beep(midi, vel) { // a quiet echo for controllers with no sound of their own
    var o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.type = "triangle"; o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12); o.connect(g); g.connect(ac.destination);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.02 + 0.18 * vel / 127, t + 0.005);
    return function () { var n = ac.currentTime; g.gain.cancelScheduledValues(n); g.gain.setValueAtTime(g.gain.value, n); g.gain.exponentialRampToValueAtTime(0.0001, n + 0.08); o.stop(n + 0.1); };
  }

  var css = ".mf-bar{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin:.35rem 0}.mf-dot{width:.6rem;height:.6rem;border-radius:50%;background:var(--bs-secondary-color,#888);display:inline-block}" +
    ".mf-dot.on{background:#2e9d5b}.mf-status{font-size:.85rem;color:var(--bs-secondary-color,#777)}.mf-table{width:100%;font-size:.9rem;margin:.4rem 0;border-collapse:collapse}" +
    ".mf-table th{white-space:nowrap;padding:.2rem .5rem;vertical-align:top;font-weight:600}.mf-table td{padding:.2rem .3rem;vertical-align:top}.mf-mark{font-weight:700;width:1.2rem;text-align:center}" +
    ".mf-ok .mf-mark{color:#2e9d5b}.mf-warn .mf-mark{color:#c08a00}.mf-bad .mf-mark{color:#c0392b}.mf-na{opacity:.7}";
  function addCss() { if (document.getElementById("mf-css")) return; var s = document.createElement("style"); s.id = "mf-css"; s.textContent = css; document.head.appendChild(s); }

  var busy = null;
  function attach(el, o) {
    addCss();
    var bar = document.createElement("div"); bar.className = "mf-bar";
    bar.innerHTML = '<button type="button" class="btn btn-sm btn-outline-primary mf-go">🎹 Play it on a keyboard</button>' +
      '<span class="mf-dot" title="MIDI keyboard"></span><label class="mf-status"><input type="checkbox" class="mf-echo"> Hear my notes</label><span class="mf-status mf-msg"></span>';
    var box = document.createElement("div"); box.className = "mf-report";
    el.appendChild(bar); el.appendChild(box);
    var go = bar.querySelector(".mf-go"), dot = bar.querySelector(".mf-dot"), msg = bar.querySelector(".mf-msg"), echo = bar.querySelector(".mf-echo");
    subscribe(function (e) { if (e.type === "state" || e.type === "on") dot.classList.toggle("on", inputCount() > 0 || e.type === "on"); });

    function stop(st) { if (st.timer) clearTimeout(st.timer); st.unsub(); busy = null; go.textContent = "🎹 Play it on a keyboard"; }
    go.addEventListener("click", function () {
      if (busy && busy.el === el) { stop(busy); msg.textContent = "Stopped."; return; }
      if (busy) stop(busy);
      msg.textContent = "Connecting…";
      Promise.all([connect().catch(function (e) { return e; }), deps()]).then(function (r) {
        if (r[0] instanceof Error) { msg.textContent = r[0].message; return; }
        dot.classList.toggle("on", inputCount() > 0);
        if (!inputCount()) msg.textContent = "No MIDI keyboard found yet; plug one in (it is picked up as soon as it appears).";
        var exp = expected(o.abc), bpm = (o.getBpm ? o.getBpm() : o.bpm) || 120, beatMs = 60000 / bpm;
        var bq = exp.barQuarters, total = exp.quarters;
        audio();
        var lat = (ac.outputLatency || ac.baseLatency || 0);
        var startAc = ac.currentTime + 0.15, t0Ac = startAc + bq * beatMs / 1000;
        var t0 = performance.now() + (t0Ac - ac.currentTime + lat) * 1000; // the downbeat of bar 1, heard
        for (var b = 0; b < bq + Math.ceil(total); b++) click(startAc + b * beatMs / 1000, b % bq === 0);
        var played = [], open = {}, offs = {};
        var st = { el: el, unsub: subscribe(function (e) {
          if (e.type === "on") { var n = { on: e.time - t0, off: null, midi: e.midi, vel: e.vel }; played.push(n); open[e.midi] = n; if (echo.checked) offs[e.midi] = beep(e.midi, e.vel); }
          else if (e.type === "off") { if (open[e.midi]) { open[e.midi].off = e.time - t0; delete open[e.midi]; } if (offs[e.midi]) { offs[e.midi](); delete offs[e.midi]; } }
        }) };
        busy = st; go.textContent = "■ Stop"; box.innerHTML = ""; msg.textContent = "Count in… " + bq + " clicks, then play.";
        var endMs = t0 - performance.now() + (total + 1) * beatMs;
        setTimeout(function () { if (busy === st) msg.textContent = "Recording…"; }, Math.max(0, t0 - performance.now()));
        st.timer = setTimeout(function () {
          stop(st);
          var rel = played.filter(function (p) { return p.on > -beatMs * 1.5; });
          rel.forEach(function (p) { if (p.off == null) p.off = (total + 1) * beatMs; });
          var rep = analyse(exp, rel, { bpm: bpm });
          box.innerHTML = renderReport(rep); msg.textContent = "";
          if (o.onReport) o.onReport(rep);
        }, endMs);
      });
    });
    return { el: bar, report: box };
  }

  var api = { attach: attach, expected: expected, analyse: analyse, renderReport: renderReport, swingRange: swingRange,
    connect: connect, subscribe: subscribe, inject: inject };
  if (isNode) module.exports = api; else global.MidiFeel = api;
})(typeof window !== "undefined" ? window : globalThis);
