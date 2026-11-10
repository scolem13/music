// Page widgets for the voice-leading and counterpoint pages (theory/voice-leading-*.qmd, theory/counterpoint.qmd). Needs
// abcjs-basic.js, voice-leading.js (the checker), and for sound soundfont.js + abc-play.js.
//
//  <div class="vl-ex" data-key="C" data-expect="ok|<rule id>" data-rows='[["I","G4 E4 C4 C3"], ...]'>caption</div>
//      one worked example drawn on a grand staff (S A on the treble staff, T B on the bass staff), played by AbcPlay, and checked by
//      VoiceLeading.check: it shows the checker's verdict. data-expect says what the page claims ("ok", or the rule it breaks);
//      data-match="1" on the element when the checker agrees (tests/voice-leading/vl-pages.test.js reads every example).
//      A row may be ["rn", "S A T B", t] (t = beats from the start, default 2 per row); rn "" = an embellishing slice.
//  <div class="vl-exercise" data-key="C" data-hint="..." data-rows='[{"rn":"I","B":"C3"}, ...]'>
//      an exercise: every voice a row gives is locked, the others are typed (C4, F#4, Bb3; Up / Down arrows move a step in the key,
//      Shift + arrows a half step). The staff redraws as notes go in; Check runs the checker. data-voices="SATB" (default).
//  <div class="vl-species" data-species="1|2|3|4|5" data-cfpos="lower|upper" data-cf="D3 F3 ..." data-mode="D dorian">
//      species counterpoint: the cantus firmus given, the counterpoint typed bar by bar (second and fourth species: two boxes a bar, empty
//      first box = half rest; third: four; fifth: one box a bar of "D4:2 E4:1 F4:1" = note:quarters, "r:2" a rest; last bar one box);
//      Check runs VoiceLeading.species.  <div class="vl-spex" data-species data-cfpos data-cf data-cp='[...]' data-expect> = a worked one.
(function (g) {
  "use strict";
  var VL = g.VoiceLeading, LET = "CDEFGAB", NAT = [0, 2, 4, 5, 7, 9, 11];
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }

  // ---- key signature letters: { F: 1, C: 1 } for D major
  function keyAcc(keyName) {
    var k = VL.parseKey(keyName), maj = k.minor ? (k.tonic + 3) % 12 : k.tonic, order = "FCGDAEB", flats = "BEADGCF";
    var sh = { 0: 0, 7: 1, 2: 2, 9: 3, 4: 4, 11: 5, 6: 6, 1: -5, 8: -4, 3: -3, 10: -2, 5: -1 }[maj], acc = {}, i;
    if (sh > 0) for (i = 0; i < sh; i++) acc[order[i]] = 1; else for (i = 0; i < -sh; i++) acc[flats[i]] = -1;
    return acc;
  }
  function keyAbc(keyName) {
    var k = VL.parseKey(keyName), nm = LET[k.l] + (k.a > 0 ? "#" : k.a < 0 ? "b" : "");
    return nm + (k.minor ? "m" : "");
  }
  // one voice's notes -> ABC. evs: [{ n: parsed note | null, d: quarter beats }]; barQ = quarters per bar
  function voiceAbc(evs, acc, barQ) {
    var out = "", pos = 0, state = {};
    evs.forEach(function (e) {
      if (pos > 0 && pos % barQ === 0) { out += "| "; state = {}; }
      var d = e.d, s;
      if (!e.n) s = "z"; else {
        var n = e.n, L = LET[n.l], key = L + n.oct, cur = key in state ? state[key] : (acc[L] || 0), a = "";
        if (n.a !== cur) a = n.a === 0 ? "=" : n.a > 0 ? "^".repeat(n.a) : "_".repeat(-n.a);
        state[key] = n.a;
        s = a + (n.oct >= 5 ? L.toLowerCase() + "'".repeat(n.oct - 5) : L + ",".repeat(4 - n.oct));
      }
      out += s + (d === 1 ? "" : d) + (e.tie ? "-" : "") + " "; pos += d;
    });
    return out + "|]";
  }
  function scoreAbc(keyName, slices, voices) {
    var acc = keyName ? keyAcc(keyName) : {}, bpb = 4, total = 0;
    var ev = {}; voices.forEach(function (v) { ev[v] = []; });
    slices.forEach(function (s, i) {
      var d = i + 1 < slices.length ? slices[i + 1].t - s.t : 2; total += d;
      voices.forEach(function (v) { ev[v].push({ n: s.n[v] || null, d: d }); });
    });
    var pad = (bpb - total % bpb) % bpb;
    if (pad) voices.forEach(function (v) { ev[v].push({ n: null, d: pad }); });
    var abc = "X:1\nM:4/4\nL:1/4\nQ:1/4=72\n%%score {(S A) (T B)}\n";
    var def = { S: "treble stem=up", A: "treble stem=down", T: "bass stem=up", B: "bass stem=down" };
    voices.forEach(function (v) { abc += "V:" + v + " clef=" + def[v] + "\n"; });
    abc += "K:" + keyAbc(keyName) + "\n";
    voices.forEach(function (v) { abc += "[V:" + v + "] " + voiceAbc(ev[v], acc, bpb) + "\n"; });
    return abc;
  }
  function slicesFrom(rows) {   // rows: [rn, "S A T B", t?] or { rn, S, A, T, B, t? }
    return rows.map(function (r, i) {
      if (Array.isArray(r)) { var p = r[1].split(" "); return { t: r[2] != null ? r[2] : i * 2, rn: r[0] || undefined, S: p[0], A: p[1], T: p[2], B: p[3] }; }
      return Object.assign({ t: i * 2 }, r, { rn: r.rn || undefined });
    });
  }
  function parsedSlices(sl, voices) { return sl.map(function (s) { var n = {}; voices.forEach(function (v) { try { n[v] = VL.parseNote(s[v]); } catch (e) { n[v] = null; } }); return { t: s.t, n: n }; }); }

  function draw(host, abc, scale) {
    host.innerHTML = "";
    var vo = g.ABCJS ? g.ABCJS.renderAbc(host, abc, { scale: scale || 1, add_classes: true, paddingleft: 0, paddingright: 0, staffwidth: 420, responsive: "resize" }) : null;
    return vo && vo[0];
  }
  function playBtn(getVo) {
    var b = el("button", "vl-btn", "▶ Play"), h = null;
    b.type = "button";
    b.onclick = function () {
      if (h) { h.stop(); h = null; b.textContent = "▶ Play"; return; }
      var vo = getVo(); if (!vo || !g.AbcPlay) return;
      b.textContent = "■ Stop";
      h = g.AbcPlay.play(vo, { sound: "piano", qpm: 72, onEnd: function () { h = null; b.textContent = "▶ Play"; } });
    };
    return b;
  }
  function verdict(box, res) {
    box.innerHTML = "";
    if (!res.errors.length) { var p = el("p", "vl-ok", "No errors found."); box.appendChild(p); return; }
    var ul = el("ul", "vl-errs");
    res.errors.forEach(function (e) { var li = el("li", e.sev === "warn" ? "vl-warn" : "vl-err"); li.textContent = (e.sev === "warn" ? "Warning, " : "") + e.where + (e.voices ? " (" + e.voices + ")" : "") + ": " + e.msg; li.title = "Chapter " + e.chapter; ul.appendChild(li); });
    box.appendChild(ul);
  }

  // ---- worked example
  function mountEx(div) {
    var key = div.getAttribute("data-key") || "C", expect = div.getAttribute("data-expect") || "ok", rows = JSON.parse(div.getAttribute("data-rows")),
      cap = div.innerHTML, voices = (div.getAttribute("data-voices") || "SATB").split("");
    div.innerHTML = "";
    var sl = slicesFrom(rows), head = el("div", "vl-cap"), paper = el("div", "vl-paper"), out = el("div", "vl-out"), vo = null, tag = el("span", "vl-tag");
    head.innerHTML = cap; head.insertBefore(tag, head.firstChild);
    var res = VL.check({ key: key, voices: voices, slices: sl });
    var rules = res.errors.filter(function (e) { return e.sev === "error"; }).map(function (e) { return e.rule; });
    var match = expect === "ok" ? rules.length === 0 : rules.indexOf(expect) >= 0;
    div.setAttribute("data-match", match ? "1" : "0"); div.setAttribute("data-rules", rules.join(" "));
    tag.textContent = expect === "ok" ? "Right " : "Wrong "; tag.className = "vl-tag " + (expect === "ok" ? "vl-good" : "vl-bad");
    div.appendChild(head); div.appendChild(paper);
    var bar = el("div", "vl-bar"); bar.appendChild(playBtn(function () { return vo; })); div.appendChild(bar); div.appendChild(out);
    vo = draw(paper, scoreAbc(key, parsedSlices(sl, voices), voices));
    if (expect === "ok") verdict(out, res); else { verdict(out, res); if (!match) out.appendChild(el("p", "vl-err", "(Page error: this example was meant to break " + expect + ".)")); }
    div.classList.add("vl-ex-on");
  }

  // ---- exercise
  function stepNote(cur, dir, key, half, dflt) {
    var acc = keyAcc(key);
    if (!cur) return dflt;
    var n = VL.parseNote(cur), m = n.midi + dir;
    if (half) { // semitone: respell by key scale first, else sharp going up / flat going down
      var l = n.l, a = n.a + dir, oct = n.oct; return LET[l] + (a > 0 ? "#".repeat(a) : a < 0 ? "b".repeat(-a) : "") + oct;
    }
    var dia = n.dia + dir, l2 = ((dia % 7) + 7) % 7, o2 = Math.floor(dia / 7);
    var a2 = acc[LET[l2]] || 0;
    if (key && VL.parseKey(key).minor && false) a2 = a2;
    return LET[l2] + (a2 > 0 ? "#" : a2 < 0 ? "b" : "") + o2;
  }
  function mountExercise(div) {
    var key = div.getAttribute("data-key") || "C", rows = JSON.parse(div.getAttribute("data-rows")), hint = div.getAttribute("data-hint") || "",
      voices = (div.getAttribute("data-voices") || "SATB").split(""), dflt = { S: "G4", A: "E4", T: "C4", B: "C3" };
    div.innerHTML = "";
    var sl = slicesFrom(rows), cells = [], paper = el("div", "vl-paper"), out = el("div", "vl-out"), vo = null;
    if (hint) div.appendChild(el("p", "vl-hint", hint));
    var tbl = el("table", "vl-grid"), thead = el("tr"); thead.appendChild(el("th", "", ""));
    sl.forEach(function (s) { var th = el("th", "", s.rn || "·"); thead.appendChild(th); }); tbl.appendChild(thead);
    voices.forEach(function (v) {
      var tr = el("tr"); tr.appendChild(el("th", "", { S: "Soprano", A: "Alto", T: "Tenor", B: "Bass" }[v]));
      sl.forEach(function (s, i) {
        var td = el("td"), given = s[v] != null && s[v] !== "", inp = el("input", "vl-in"); inp.type = "text"; inp.size = 4; inp.maxLength = 4; inp.setAttribute("aria-label", v + " chord " + (i + 1));
        if (given) { inp.value = s[v]; inp.readOnly = true; inp.classList.add("vl-locked"); }
        else {
          inp.placeholder = "?";
          inp.addEventListener("input", redraw);
          inp.addEventListener("keydown", function (e) {
            if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return; e.preventDefault();
            var from = inp.value.trim() || null;
            if (!from && i > 0) { var pv = cells[v][i - 1]; if (pv && pv.value.trim()) from = pv.value.trim(); }
            try { inp.value = from && inp.value.trim() ? stepNote(from, e.key === "ArrowUp" ? 1 : -1, key, e.shiftKey, dflt[v]) : (from || dflt[v]); } catch (x) { inp.value = dflt[v]; }
            redraw();
          });
        }
        (cells[v] = cells[v] || [])[i] = inp; td.appendChild(inp); tr.appendChild(td);
      }); tbl.appendChild(tr);
    });
    div.appendChild(tbl); div.appendChild(paper);
    var bar = el("div", "vl-bar"), chk = el("button", "vl-btn", "Check"); chk.type = "button";
    bar.appendChild(chk); bar.appendChild(playBtn(function () { return vo; })); div.appendChild(bar); div.appendChild(out);
    function entered() {
      var bad = null;
      var list = sl.map(function (s, i) {
        var o = { t: s.t, rn: s.rn };
        voices.forEach(function (v) {
          var raw = cells[v][i].value.trim().replace(/^([a-g])/, function (c) { return c.toUpperCase(); }).replace(/^([A-G])B(\d)/, "$1b$2");
          o[v] = raw; if (raw) { try { VL.parseNote(raw); } catch (e) { bad = raw; cells[v][i].classList.add("vl-badin"); return; } }
          cells[v][i].classList.remove("vl-badin");
        });
        return o;
      });
      return { list: list, bad: bad };
    }
    function redraw() {
      var e = entered(); var ok = e.list.map(function (s) { var c = Object.assign({}, s); voices.forEach(function (v) { try { VL.parseNote(c[v]); } catch (x) { c[v] = ""; } }); return c; });
      vo = draw(paper, scoreAbc(key, parsedSlices(ok, voices), voices)); out.innerHTML = "";
    }
    chk.onclick = function () {
      var e = entered(); out.innerHTML = "";
      if (e.bad) { out.appendChild(el("p", "vl-err", "“" + e.bad + "” is not a note: write a letter, ♯ as # or ♭ as b, and the octave (F#4, Bb3).")); return; }
      var empty = 0; e.list.forEach(function (s) { voices.forEach(function (v) { if (!s[v]) empty++; }); });
      if (empty) { out.appendChild(el("p", "vl-err", "Fill every box first (" + empty + " empty).")); return; }
      var res = VL.check({ key: key, voices: voices, slices: e.list });
      verdict(out, res); div.setAttribute("data-ok", res.ok ? "1" : "0");
      if (res.ok) out.insertBefore(el("p", "vl-ok", res.errors.length ? "No errors, only warnings." : "Clean."), out.firstChild);
    };
    redraw();
    div.classList.add("vl-exercise-on");
  }

  // ---- species exercise
  // raw counterpoint (as the page data or the typed boxes give it) -> bars of events [{ n: parsed | null, d, tie }]
  function barsOf(sp, raw) {
    var safe = function (x) { try { return x ? VL.parseNote(x) : null; } catch (e) { return null; } };
    if (sp >= 3) {
      return raw.map(function (b) {
        var arr = Array.isArray(b) ? b : (typeof b === "string" && /\s/.test(b.trim()) ? b.trim().split(/\s+/) : [b]);
        return arr.map(function (t) { var d = 4 / arr.length, nm = t; if (typeof t === "string" && t.indexOf(":") >= 0) { var q = t.split(":"); nm = q[0]; d = +q[1] || d; } return { n: nm === "r" ? null : safe(nm), d: d }; });
      }).map(function (bar, i, all) { var l = bar[bar.length - 1], nx = all[i + 1]; if (l.n && nx && nx[0].n && nx[0].n.midi === l.n.midi) l.tie = true; return bar; });
    }
    return raw.map(function (b) { var arr = Array.isArray(b) ? b : [b]; return arr.map(function (x) { return { n: safe(x), d: sp === 2 && arr.length === 2 ? 2 : 4 }; }); });
  }
  function spAbc(cf, bars, pos) {
    var cfE = cf.map(function (n) { return { n: n, d: 4 }; }), cpE = [];
    bars.forEach(function (b) { b.forEach(function (e) { cpE.push(e); }); });
    var upv = pos === "lower" ? cpE : cfE, lov = pos === "lower" ? cfE : cpE;
    return "X:1\nM:4/4\nL:1/4\nQ:1/4=60\n%%score {1 2}\nV:1 clef=treble\nV:2 clef=bass\nK:C\n[V:1] " + voiceAbc(upv, {}, 4) + "\n[V:2] " + voiceAbc(lov, {}, 4) + "\n";
  }
  function mountSpecies(div) {
    var sp = +(div.getAttribute("data-species") || 1), pos = div.getAttribute("data-cfpos") || "lower", cfS = div.getAttribute("data-cf").split(" "), mode = div.getAttribute("data-mode") || "",
      hint = div.getAttribute("data-hint") || "", N = cfS.length, cf = cfS.map(VL.parseNote), inputs = [], paper = el("div", "vl-paper"), out = el("div", "vl-out"), vo = null;
    div.innerHTML = "";
    if (hint) div.appendChild(el("p", "vl-hint", hint));
    var tbl = el("table", "vl-grid"), h = el("tr"), r1 = el("tr"), r2 = el("tr");
    h.appendChild(el("th", "", "Bar")); r1.appendChild(el("th", "", "Cantus firmus")); r2.appendChild(el("th", "", "Your counterpoint"));
    cfS.forEach(function (n, i) {
      h.appendChild(el("th", "", String(i + 1))); r1.appendChild(el("td", "", n));
      var td = el("td"), last = i === N - 1, count = sp === 3 ? (last ? 1 : 4) : sp === 4 ? (last ? 1 : 2) : sp === 2 ? (last ? 1 : 2) : 1; inputs[i] = [];
      for (var k = 0; k < count; k++) {
        var inp = el("input", "vl-in"); inp.type = "text"; inp.size = sp === 5 ? 16 : 4; inp.maxLength = sp === 5 ? 40 : 4; inp.placeholder = (sp === 2 || sp === 4) && count === 2 && k === 0 && i === 0 ? "rest" : sp === 5 ? "D4:2 E4:1 F4:1" : "?";
        if (sp === 5) inp.style.width = "9rem";
        inp.addEventListener("input", redraw); inputs[i].push(inp); td.appendChild(inp);
      }
      r2.appendChild(td);
    });
    tbl.appendChild(h); tbl.appendChild(r1); tbl.appendChild(r2); div.appendChild(tbl); div.appendChild(paper);
    var bar = el("div", "vl-bar"), chk = el("button", "vl-btn", "Check"); chk.type = "button"; bar.appendChild(chk); bar.appendChild(playBtn(function () { return vo; })); div.appendChild(bar); div.appendChild(out);
    var fix = function (raw) { return raw.trim().replace(/(^|\s)([a-g])/g, function (m, a, c) { return a + c.toUpperCase(); }).replace(/(^|\s)([A-G])B(\d)/g, "$1$2b$3"); };
    function read() {
      var bad = null, raw = inputs.map(function (bx) { return bx.map(function (inp) {
        var v = fix(inp.value); inp.classList.remove("vl-badin");
        v.split(/\s+/).forEach(function (tok) { var nm = tok.split(":")[0]; if (nm && nm !== "r") { try { VL.parseNote(nm); } catch (e) { bad = tok; inp.classList.add("vl-badin"); } } });
        return v; }); });
      return { raw: raw, bad: bad };
    }
    function cpData(raw) {
      return raw.map(function (bx, i) {
        if (sp === 1) return bx[0];
        if (sp === 2) return bx.length === 2 ? [bx[0] || null, bx[1]] : bx[0];
        if (sp === 5) return bx[0];
        return bx.map(function (v) { return v || null; });
      });
    }
    function redraw() { var r = read(); vo = draw(paper, spAbc(cf, barsOf(sp, sp >= 3 ? cpData(r.raw).map(function (b) { return Array.isArray(b) ? b.map(function (x) { return x || "r"; }) : b; }) : cpData(r.raw)), pos)); out.innerHTML = ""; }
    chk.onclick = function () {
      var r = read(); out.innerHTML = "";
      if (r.bad) { out.appendChild(el("p", "vl-err", "\u201c" + r.bad + "\u201d is not a note (F#4, Bb3" + (sp === 5 ? "; write a length after a colon: F4:2 for a half note, F4:1 for a quarter, r:2 for a half rest" : "") + ").")); return; }
      var missing = r.raw.some(function (bx, i) { return bx.some(function (v, k) { return !v && !((sp === 2 || sp === 4) && i === 0 && k === 0); }); });
      if (missing) { out.appendChild(el("p", "vl-err", "Fill every box first" + (sp === 2 || sp === 4 ? " (leave the first box of bar 1 empty for a half rest)" : "") + ".")); return; }
      var res = VL.species({ species: sp, cf: cfS, cp: cpData(r.raw), cfPos: pos, mode: mode });
      verdict(out, res); div.setAttribute("data-ok", res.ok ? "1" : "0");
      if (res.ok) out.insertBefore(el("p", "vl-ok", res.errors.length ? "No errors, only warnings." : "Clean."), out.firstChild);
    };
    redraw(); div.classList.add("vl-species-on");
  }
  // worked species example: <div class="vl-spex" data-species data-cfpos data-cf data-cp='[["D4"],...]' data-expect>
  function mountSpex(div) {
    var sp = +(div.getAttribute("data-species") || 1), pos = div.getAttribute("data-cfpos") || "lower", cf = div.getAttribute("data-cf").split(" "), cp = JSON.parse(div.getAttribute("data-cp")),
      expect = div.getAttribute("data-expect") || "ok", mode = div.getAttribute("data-mode") || "", cap = div.innerHTML;
    div.innerHTML = "";
    var res = VL.species({ species: sp, cf: cf, cp: cp, cfPos: pos, mode: mode }), errs = res.errors.filter(function (e) { return e.sev === "error"; });
    var match = expect === "ok" ? !errs.length : errs.some(function (e) { return e.msg.indexOf(expect) >= 0; });
    div.setAttribute("data-match", match ? "1" : "0");
    var head = el("div", "vl-cap"), tag = el("span", "vl-tag " + (expect === "ok" ? "vl-good" : "vl-bad"), expect === "ok" ? "Right " : "Wrong "); head.innerHTML = cap; head.insertBefore(tag, head.firstChild);
    var paper = el("div", "vl-paper"), out = el("div", "vl-out"), bar = el("div", "vl-bar"), vo;
    div.appendChild(head); div.appendChild(paper); div.appendChild(bar); div.appendChild(out);
    vo = draw(paper, spAbc(cf.map(VL.parseNote), barsOf(sp, cp), pos));
    bar.appendChild(playBtn(function () { return vo; })); verdict(out, res);
    if (!match) out.appendChild(el("p", "vl-err", "(Page error: this example was meant to show “" + expect + "”.)"));
  }

  var CSS = ".vl-ex,.vl-exercise,.vl-spex,.vl-species{border:1px solid rgba(128,128,128,.4);border-radius:8px;padding:.6rem .8rem;margin:1rem 0}" +
    ".vl-paper{background:#fff;color:#222;border-radius:6px;padding:.3rem;max-width:34rem}.vl-bar{margin:.4rem 0;display:flex;gap:.5rem}" +
    ".vl-btn{padding:.25rem .8rem;border-radius:6px;border:1px solid rgba(128,128,128,.6);background:transparent;color:inherit;cursor:pointer}" +
    ".vl-tag{font-weight:700;margin-right:.3rem}.vl-good{color:#1a7f37}.vl-bad{color:#c62828}.vl-ok{color:#1a7f37;font-weight:600;margin:.2rem 0}" +
    ".vl-errs{margin:.2rem 0;padding-left:1.2rem}.vl-err{color:#c62828}.vl-warn{color:#9a6700}.vl-grid{border-collapse:collapse;margin:.4rem 0;font-size:.9rem}" +
    ".vl-grid th,.vl-grid td{padding:.15rem .35rem;text-align:left;border:0}.vl-in{width:3.6rem;font:inherit;padding:.1rem .25rem}.vl-locked{opacity:.7;background:rgba(128,128,128,.15)}" +
    ".vl-badin{outline:2px solid #c62828}.vl-hint{font-size:.9rem;opacity:.85}.vl-cap{margin-bottom:.3rem}";
  function mountAll(root) {
    if (!document.getElementById("vl-css")) { var s = el("style"); s.id = "vl-css"; s.textContent = CSS; document.head.appendChild(s); }
    [].forEach.call((root || document).querySelectorAll(".vl-ex:not(.vl-ex-on)"), mountEx);
    [].forEach.call((root || document).querySelectorAll(".vl-exercise:not(.vl-exercise-on)"), mountExercise);
    [].forEach.call((root || document).querySelectorAll(".vl-species:not(.vl-species-on)"), mountSpecies);
    [].forEach.call((root || document).querySelectorAll(".vl-spex"), mountSpex);
  }
  g.VoiceLeadingUI = { barsOf: barsOf, mountAll: mountAll, scoreAbc: scoreAbc, spAbc: spAbc, slicesFrom: slicesFrom, parsedSlices: parsedSlices, keyAcc: keyAcc };
  if (typeof document !== "undefined") { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { mountAll(); }); else mountAll(); }
  if (typeof module !== "undefined" && module.exports) module.exports = g.VoiceLeadingUI;
})(typeof window !== "undefined" ? window : globalThis);
