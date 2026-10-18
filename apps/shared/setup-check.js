// setup-check.js — the Setup Check page (tools/guitar-setup-check.qmd): a guitar or bass played at chosen strings and frets, the
// answers (by ear, by eye, by the microphone) turned into a list of what to adjust and who should do it: the student, the teacher
// (truss rod, electric saddles), or a repair tech (nut, frets, acoustic saddle, cracks).
// Checks, in the order they should be fixed: relief (truss rod) -> action (bridge height) -> nut -> intonation (saddle length).
// The microphone measures intonation as the gap in cents between the 12th-fret harmonic and the 12th-fret fretted note
// (both an octave up, so a bass's low strings are inside PitchDetect's 70 Hz floor).
(function (global) {
  var PD = global.PitchDetect;
  var INST = {
    electric: { label: "Electric guitar", strings: ["E", "A", "D", "G", "B", "E"], rod: true, relief: [0.15, 0.3], action: { bass: [1.6, 2.2], treble: [1.4, 1.9] }, saddle: "screw" },
    acoustic: { label: "Acoustic guitar (steel strings)", strings: ["E", "A", "D", "G", "B", "E"], rod: true, relief: [0.15, 0.3], action: { bass: [2.2, 2.8], treble: [1.6, 2.2] }, saddle: "bone" },
    classical: { label: "Classical guitar (nylon strings)", strings: ["E", "A", "D", "G", "B", "E"], rod: "maybe", relief: [0.15, 0.35], action: { bass: [3.5, 4.2], treble: [2.8, 3.3] }, saddle: "bone" },
    bass4: { label: "Bass, 4 strings", strings: ["E", "A", "D", "G"], rod: true, relief: [0.25, 0.45], action: { bass: [2.2, 3.0], treble: [1.8, 2.5] }, saddle: "screw" },
    bass5: { label: "Bass, 5 strings", strings: ["B", "E", "A", "D", "G"], rod: true, relief: [0.25, 0.45], action: { bass: [2.4, 3.2], treble: [1.8, 2.5] }, saddle: "screw" }
  };
  var ZONES = [["1–4", "frets 1 to 4"], ["5–9", "frets 5 to 9"], ["10–14", "frets 10 to 14"], ["15+", "frets 15 and up"]];
  var S = { inst: "electric", relief: "", reliefMm: "", aBass: "", aTreble: "", nut: "", buzz: {}, single: "", openBuzz: {}, into: {}, ear: {}, other: {} };
  try { var sv = JSON.parse(localStorage.getItem("setup-check-v1") || "null"); if (sv && INST[sv.inst]) S = Object.assign(S, sv); } catch (e) {}
  function save() { try { localStorage.setItem("setup-check-v1", JSON.stringify(S)); } catch (e) {} }
  function I() { return INST[S.inst]; }
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function sname(i) { var n = I().strings.length; return (n - i) + " (" + I().strings[i] + ")"; }   // i = 0 lowest

  // ---------- the microphone: a held note, median over ~1.2 s once it settles ----------
  var ctx = null, mic = null, cap = null;
  function ac() { if (!ctx) ctx = new (global.AudioContext || global.webkitAudioContext)(); if (ctx.state === "suspended") ctx.resume(); return ctx; }
  function ensureMic() {
    if (mic && mic.running) return Promise.resolve(mic);
    mic = PD.mic({ ctx: ac(), source: global.TEST_MIC_SOURCE,  // tests: a function (ctx) -> node in place of the microphone
      onFrame: function (f) {
      if (!cap) return;
      if (f.hz > 0) { if (!cap.t0) cap.t0 = performance.now(); if (performance.now() - cap.t0 > 250) cap.v.push(f.hz); }
      if (cap.t0 && performance.now() - cap.t0 > 1500) { var c = cap; cap = null; c.done(c.v); }
      else if (!cap.t0 && performance.now() - cap.start > 8000) { var c2 = cap; cap = null; c2.done([]); }
    } });
    return mic.start();
  }
  function measure(cb) {
    ensureMic().then(function () { cap = { v: [], start: performance.now(), done: function (v) {
      if (v.length < 8) return cb(null);
      v.sort(function (a, b) { return a - b; }); cb(v[Math.floor(v.length / 2)]);
    } }; }).catch(function (e) { cb(null, e); });
  }

  // ---------- the form ----------
  function build() {
    var isel = $("sc-inst"); isel.innerHTML = "";
    Object.keys(INST).forEach(function (k) { var o = el("option"); o.value = k; o.textContent = INST[k].label; isel.appendChild(o); });
    isel.value = S.inst;
    isel.onchange = function () { S.inst = isel.value; S.buzz = {}; S.openBuzz = {}; S.into = {}; S.ear = {}; save(); build(); };
    $("sc-rod-note").innerHTML = I().rod === "maybe" ? "Many classical guitars have <b>no truss rod</b> (look inside the soundhole, or at the headstock, for a nut on a rod). Without one, relief can only be changed by a tech." : "";
    var tg = I().relief;
    $("sc-relief-target").textContent = "Usual for this instrument: about " + tg[0] + " to " + tg[1] + " mm (" + (tg[0] / 0.0254).toFixed(0) + " to " + (tg[1] / 0.0254).toFixed(0) + " thousandths of an inch).";
    var at = I().action;
    $("sc-action-target").textContent = "Usual at the 12th fret: lowest string " + at.bass[0] + "–" + at.bass[1] + " mm, highest " + at.treble[0] + "–" + at.treble[1] + " mm. Lower is easier to play and buzzes sooner; it's a choice, within limits.";
    // buzz grid
    var g = $("sc-buzz"); g.innerHTML = "";
    var tb = el("table", "sc-grid"), hr = el("tr"); hr.appendChild(el("th", "", "String"));
    hr.appendChild(el("th", "", "open"));
    ZONES.forEach(function (z) { hr.appendChild(el("th", "", z[0])); }); tb.appendChild(hr);
    for (var i = I().strings.length - 1; i >= 0; i--) (function (i) {
      var tr = el("tr"); tr.appendChild(el("th", "", sname(i)));
      var o = el("td"), ob = el("input"); ob.type = "checkbox"; ob.checked = !!S.openBuzz[i]; ob.setAttribute("aria-label", "String " + sname(i) + " buzzes open");
      ob.onchange = function () { S.openBuzz[i] = ob.checked; save(); report(); }; o.appendChild(ob); tr.appendChild(o);
      ZONES.forEach(function (z, zi) {
        var td = el("td"), b = el("input"); b.type = "checkbox"; b.checked = !!S.buzz[i + ":" + zi]; b.setAttribute("aria-label", "String " + sname(i) + " buzzes at " + z[1]);
        b.onchange = function () { S.buzz[i + ":" + zi] = b.checked; save(); report(); }; td.appendChild(b); tr.appendChild(td);
      });
      tb.appendChild(tr);
    })(i);
    g.appendChild(tb);
    // intonation rows
    var it = $("sc-into"); it.innerHTML = "";
    for (i = I().strings.length - 1; i >= 0; i--) (function (i) {
      var row = el("div", "sc-irow");
      row.appendChild(el("span", "sc-iname", "String " + sname(i)));
      var ear = el("select"); [["", "By ear: not checked"], ["same", "the same"], ["sharp", "fretted is higher"], ["flat", "fretted is lower"]].forEach(function (p) { var o = el("option"); o.value = p[0]; o.textContent = p[1]; ear.appendChild(o); });
      ear.value = S.ear[i] || ""; ear.onchange = function () { S.ear[i] = ear.value; save(); report(); }; row.appendChild(ear);
      var r = S.into[i] || {}, out = el("span", "sc-iout");
      function show() { var r = S.into[i] || {}; out.textContent = r.h && r.f ? fmt(1200 * Math.log2(r.f / r.h)) : r.h ? "harmonic measured; now the fretted note" : ""; }
      ["h", "f"].forEach(function (k) {
        var b = el("button", "btn btn-sm btn-outline-secondary", k === "h" ? "🎤 harmonic" : "🎤 fretted");
        b.type = "button"; b.title = k === "h" ? "Touch the string over the 12th fret wire, pick, let it ring" : "Press the string at the 12th fret, pick, let it ring";
        b.onclick = function () { b.disabled = true; b.textContent = "listening…"; measure(function (hz, err) {
          b.disabled = false; b.textContent = k === "h" ? "🎤 harmonic" : "🎤 fretted";
          if (!hz) { out.textContent = err ? "Microphone: " + (err.message || err) : "No steady note heard. Pick a little harder and let it ring."; return; }
          S.into[i] = Object.assign({}, S.into[i], (function () { var o = {}; o[k] = hz; return o; })()); save(); show(); report(); }); };
        row.appendChild(b);
      });
      row.appendChild(out); show(); it.appendChild(row);
    })(i);
    // plain inputs
    [["sc-relief", "relief"], ["sc-relief-mm", "reliefMm"], ["sc-a-bass", "aBass"], ["sc-a-treble", "aTreble"], ["sc-nut", "nut"], ["sc-single", "single"]].forEach(function (p) {
      var e = $(p[0]); e.value = S[p[1]] || ""; e.oninput = e.onchange = function () { S[p[1]] = e.value; save(); report(); };
    });
    Array.prototype.forEach.call(document.querySelectorAll("#sc-other input[data-k]"), function (b) {
      var k = b.getAttribute("data-k"); b.checked = !!S.other[k]; b.onchange = function () { S.other[k] = b.checked; save(); report(); };
    });
    $("sc-reset").onclick = function () { if (!confirm("Clear every answer?")) return; var inst = S.inst; S = { inst: inst, relief: "", reliefMm: "", aBass: "", aTreble: "", nut: "", buzz: {}, single: "", openBuzz: {}, into: {}, ear: {}, other: {} }; save(); build(); };
    report();
  }
  function fmt(c) { return (c >= 0 ? "+" : "−") + Math.abs(c).toFixed(1) + " cents (fretted against harmonic)"; }

  // ---------- the diagnosis ----------
  // who: "you" (the student, after being shown once), "teacher", "tech"
  function report() {
    var F = [], inst = I(), n = inst.strings.length, rod = inst.rod === true;
    function add(who, area, text) { F.push({ who: who, area: area, text: text }); }
    var mm = parseFloat(S.reliefMm), rel = S.relief;
    if (!isNaN(mm)) rel = mm < 0.05 ? "none" : mm < inst.relief[0] ? "low" : mm <= inst.relief[1] ? "ok" : mm <= inst.relief[1] * 1.8 ? "high" : "vhigh";
    var zone = function (zi) { var c = 0; for (var i = 0; i < n; i++) if (S.buzz[i + ":" + zi]) c++; return c; };
    var bz = ZONES.map(function (z, zi) { return zone(zi); }), many = Math.max(2, Math.ceil(n / 2));
    var openCount = 0; for (var i = 0; i < n; i++) if (S.openBuzz[i]) openCount++;
    var anyBuzz = bz.some(function (c) { return c; }) || openCount;

    // 1. relief
    var rodWho = rod ? "teacher" : "tech", rodNot = rod ? "" : " (no truss rod, or not sure: a tech)";
    if (rel === "none" || (rel === "low" && bz[0] >= many))
      add(rodWho, "Neck relief (truss rod)", "The neck is too straight or bowed backwards" + (bz[0] ? ", which is why the low frets buzz" : "") + ". <b>Loosen</b> the truss rod (anticlockwise, seen from the end you put the key in) a quarter turn, retune, wait 15 minutes, measure again." + rodNot);
    else if (rel === "high" || rel === "vhigh")
      add(rel === "vhigh" ? (rod ? "teacher" : "tech") : rodWho, "Neck relief (truss rod)", "Too much bow: the strings are high in the middle of the neck, so it's harder to play there. <b>Tighten</b> the truss rod (clockwise) a quarter turn at most, with the strings slackened a little, retune, wait, measure again." + rodNot + (rel === "vhigh" ? " If a quarter turn or two changes nothing, stop: a rod at the end of its travel is a job for a tech." : ""));
    else if (rel === "low" && bz[0]) add(rodWho, "Neck relief (truss rod)", "Relief is on the low side and the low frets buzz a little: an eighth of a turn looser is worth trying." + rodNot);

    // 2. buzz pattern
    if (bz[3] >= many || bz[2] >= many) add("tech", "Frets up the neck", "Buzzing high up the neck on most strings, when relief is fine, usually means the frets over the body rise (\"ski jump\") or the neck angle is off. Raising the action hides it; a tech fixes it (fret levelling, or a shim).");
    if (S.single) add("tech", "One fret", "A buzz at one fret on several strings is a <b>high or loose fret</b>. Press on that fret wire: if it moves, or the string buzzes against the next fret up only there, it needs a tech (reseat, or level and crown).");
    if (openCount && !bz[0]) add("tech", "Nut", "Open strings buzz but fretted notes don't: the <b>nut slot</b> is worn too deep (or the string has jumped its slot). A tech fills or replaces the nut. Check first that the string sits in its slot.");
    if (bz.every(function (c) { return c >= many; })) add(inst.saddle === "screw" ? "teacher" : "tech", "Action", "It buzzes everywhere: the strings are too low overall. Raise the bridge" + (inst.saddle === "screw" ? " saddles (small screws)." : ": a shim under the saddle, or a new saddle, which a tech makes."));

    // 3. action
    var ab = parseFloat(S.aBass), at = parseFloat(S.aTreble), A = inst.action;
    function act(v, rng, side) {
      if (isNaN(v)) return;
      var relOk = rel === "ok" || rel === "low", first = relOk ? "" : " Set the relief first: it changes this number.";
      if (v > rng[1] + 0.25) add(inst.saddle === "screw" ? "teacher" : "tech", "Action, " + side + " side", "High (" + v + " mm, usual up to " + rng[1] + "). Hard to press and fretted notes go sharp. " + (inst.saddle === "screw" ? "Lower that side of the bridge (saddle height screws, or the posts on a tune-o-matic) a little at a time." : "On this guitar the saddle is sanded down from below: a tech's job (or a careful teacher's, with a spare saddle).") + first);
      else if (v < rng[0] - 0.2) add(inst.saddle === "screw" ? "teacher" : "tech", "Action, " + side + " side", "Low (" + v + " mm, usual from " + rng[0] + "). Fine if nothing buzzes; if it buzzes, raise it." + first);
    }
    act(ab, A.bass, "low-string"); act(at, A.treble, "high-string");

    // 4. nut height
    if (S.nut === "high") add("tech", "Nut", "The strings are high at the first fret: chords near the nut are hard to press and go sharp (an F or a first-fret note sounds out of tune when open strings don't). Cutting nut slots is a tech's job; a slot cut too deep can't be undone.");
    if (S.nut === "none" && !openCount) add("you", "Nut", "No gap at all at the first fret: watch for open-string buzz. If none, it's fine.");

    // 5. intonation
    var into = [], earSharp = 0, earFlat = 0;
    for (i = 0; i < n; i++) { var r = S.into[i]; if (r && r.h && r.f) into.push({ i: i, c: 1200 * Math.log2(r.f / r.h) }); if (S.ear[i] === "sharp") earSharp++; if (S.ear[i] === "flat") earFlat++; }
    var whoI = inst.saddle === "screw" ? "teacher" : "tech";
    var bad = into.filter(function (x) { return Math.abs(x.c) > 3; });
    if (bad.length) {
      var allSharp = into.length >= Math.min(3, n) && into.every(function (x) { return x.c > 6; });
      if (allSharp) add("you", "Strings", "Every string plays sharp at the 12th fret. Old strings, or pressing too hard, do this; so does high action. Put on new strings and fret lightly, then measure again before moving saddles.");
      add(whoI, "Intonation (saddles)", bad.map(function (x) { return "String " + sname(x.i) + ": " + (x.c > 0 ? "sharp " : "flat ") + Math.abs(x.c).toFixed(0) + " cents → move its saddle " + (x.c > 0 ? "<b>back</b>, away from the neck" : "<b>forward</b>, toward the neck"); }).join("; ") + "." +
        (inst.saddle === "screw" ? " Turn the saddle's length screw a little, retune, measure again. Always measure in tune." : " An acoustic's saddle is one piece: a tech recompensates or replaces it.") +
        (bad.some(function (x) { return Math.abs(x.c) > 25; }) ? " More than 25 cents is a lot: check the string is seated, and that the bridge hasn't moved." : ""));
    } else if (earSharp || earFlat) add(whoI, "Intonation (saddles)", "By ear, " + (earSharp ? earSharp + " string(s) play higher fretted at 12 than their harmonic" : "") + (earSharp && earFlat ? " and " : "") + (earFlat ? earFlat + " lower" : "") + ". Higher: saddle back; lower: saddle forward. The microphone buttons give the amount.");
    else if (into.length) add("ok", "Intonation", "Every measured string is within 3 cents: the intonation is fine.");

    // 6. other
    var O = S.other;
    if (O.crack) add("tech", "Cracks", "A crack in the neck, headstock or top: stop adjusting and take it to a tech. Loosen the strings if it's at the headstock.");
    if (O.bridge) add("tech", "Bridge lifting", "A bridge lifting at its back edge (acoustic) will come off. Loosen the strings and take it to a tech soon.");
    if (O.rodstuck) add("tech", "Truss rod", "A truss rod that won't turn, or is already very tight: don't force it. Tech.");
    if (O.frets) add("tech", "Fret ends", "Sharp fret ends stick out when a neck dries out (winter). A tech files them in minutes.");
    if (O.worn) add("tech", "Fret wear", "Grooves worn into the frets under the strings: notes buzz or choke there. A tech levels or replaces frets.");
    if (O.tuners) add("teacher", "Tuning stability", "It won't stay in tune: first check the strings are wound on properly (two or three turns, wound downward) and stretched in. Then the tuners' nut, then the nut slots binding (a 'ping' when tuning: graphite in the slot). Still slipping: tech.");
    if (O.electric) add("tech", "Electronics", "Crackle when you turn a knob or move the cable: contact cleaner in the pots and jack fixes most of it; a loose jack or a bad solder joint needs a tech.");

    var host = $("sc-report"); host.innerHTML = "";
    if (!F.length) { host.appendChild(el("p", "sc-none", anyBuzz || rel ? "Nothing here asks for an adjustment. Play it and listen; come back when something changes." : "Answer the checks above; the findings appear here.")); return; }
    var order = { tech: 0, teacher: 1, you: 2, ok: 3 }, WHO = { tech: "Repair tech", teacher: "Teacher", you: "You", ok: "Fine" };
    F.sort(function (a, b) { return order[a.who] - order[b.who]; });
    var tech = F.some(function (f) { return f.who === "tech"; });
    if (tech) host.appendChild(el("p", "sc-sum", "<b>Take it to a tech</b> for the items marked so. A setup by a tech usually covers relief, action, nut and intonation in one visit; there's no need to adjust the rest first."));
    F.forEach(function (f) { var d = el("div", "sc-f sc-" + f.who); d.innerHTML = "<span class='sc-who'>" + WHO[f.who] + "</span> <b>" + f.area + ".</b> " + f.text; host.appendChild(d); });
    host.appendChild(el("p", "sc-order", "Order of work: truss rod (relief) → bridge height (action) → nut → intonation, retuning between each. Changing one changes the ones after it."));
  }
  global.SetupCheck = { INST: INST, state: function () { return S; }, report: report };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
})(window);
