// compose-tools.js — two panels for the scratch-pad DAW (mini-daw.js), each opt-in by an attribute on the .mdaw div, so the lesson DAWs are unchanged. Loaded after
// mini-daw.js, track-sound.js and abc-clip.js (and, for the fill sources, band/phrase.js, motif-arp.js, band/style-engine.js, band/arranger-styles.js, band/harmony.js).
//
//   data-abc-edit   "Edit as notation": the selected NOTE clip (not drums, not audio) as a staff (abcjs) and ABC text (AbcClip.clipToAbc: quantised to 1/16 or 1/8, chords
//                   as [CEG], ties over bars, key from the menu, meter = the project's at the clip's start). Apply turns the text back into notes (AbcClip.abcToNotes) as ONE
//                   undo step; a note keeps its velocity when pitch and quantised start match (others get the clip's mean); a warning first when notes are off the grid or a
//                   bar is the wrong length. Clicking a note on the staff selects it in the roll. A meter change inside the clip is not written (the clip's first meter is).
//   data-fill       "Fill from chords": bars (From / To, or the loop, or the selected clip) + chords ("Dm7 G7 | Cmaj7", cycled over the bars; or read from the selected clip: the
//                   ABC chord symbols in the notation panel, else the chords its notes spell, StyleEngine.recognize) + a source:
//                     band      the Session players' style (bandParts with the band row's comping menus when it has them), one part: chords / bass / drums / congas
//                     arp       a workstation arp type (MotifArp.TYPES, partNotes: pure, no Sequencers page needed) played on each chord's notes, restarted at each chord
//                     arranger  a Style Arranger section's channel (ArrangerStyles, StyleEngine.convertPhrase to each chord; the section repeats over the bars)
//                   into an existing track or a new one, as ONE clip and ONE undo step (clips of that track inside the range are replaced, as the band row does).
//   Compose.fillNotes(src, plan, opts) and Compose.chordsFromNotes(notes, barBeats) are pure (tested without a page).
// Nothing here was listened to: the fills are the band's / the phrases' / the arranger's own patterns put on a clip; the arranger's source chords (CM7) conversion is the
// site's reading (see style-engine.js).
(function (global) {
  "use strict";
  var M = global.MiniDaw; if (!M || !M.core) return;
  var X = M.core, Meter = X.Meter, el = X.el, btn = X.btn, clamp = X.clamp, D = X.Daw.prototype;
  var C = M.Compose = {};
  var ROOTS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  var PCK = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];     // the project's key (p.key, a pitch class, major) as a key name
  var SUFFIX = { M: "", M7: "maj7", "6": "6", add9: "add9", "7": "7", m: "m", m7: "m7", m6: "m6", mM7: "m(maj7)", m7b5: "m7b5", dim: "dim", dim7: "dim7", aug: "aug", sus4: "sus4", "7sus4": "7sus4", sus2: "sus2" };

  // ---------------- chords ----------------
  // "Dm7 G7 | Cmaj7" -> [["Dm7","G7"],["Cmaj7"]]
  C.parseChart = function (text) { return String(text || "").split("|").map(function (b) { return b.trim().split(/\s+/).filter(Boolean); }).filter(function (b) { return b.length; }); };
  // a chord symbol as StyleEngine's { root, type, bass } (null for N.C. or unreadable)
  C.chordOf = function (sym) {
    var H = global.BandHarmony; if (!H) return null; var c = H.parseChord(sym, 0); if (!c || c.nc || c.unknown) return null;
    var t;
    if (c.quality === "min") t = c.seventh === 11 ? "mM7" : c.seventh != null ? "m7" : c.sixth ? "m6" : "m";
    else if (c.quality === "hdim") t = "m7b5"; else if (c.quality === "dim") t = c.seventh != null ? "dim7" : "dim"; else if (c.quality === "aug") t = "aug";
    else if (c.quality === "sus") t = c.seventh != null ? "7sus4" : c.sus === 2 ? "sus2" : "sus4";
    else if (c.quality === "dom") t = "7";
    else t = c.seventh === 11 ? "M7" : c.sixth ? "6" : c.add9 ? "add9" : "M";
    return { root: c.root, type: t, bass: c.slash ? c.bass : c.root };
  };
  // chords spelled by notes, one per bar: [{ t, d, m }] (beats from the start), bar length in beats -> ["Dm7", …] (a bar with nothing recognisable repeats the one before; the first such is "C")
  C.chordsFromNotes = function (notes, barBeats, bars) {
    var S = global.StyleEngine, out = [], prev = null; if (!S) return null;
    for (var b = 0; b < bars; b++) {
      var lo = b * barBeats, hi = lo + barBeats, ms = [];
      notes.forEach(function (n) { if (n.t < hi - 1e-6 && n.t + n.d > lo + 1e-6 && ms.indexOf(n.m) < 0) ms.push(n.m); });
      var ch = ms.length >= 3 ? S.recognize(ms, "fingered") : null;
      if (ch) { var nm = ROOTS[ch.root] + SUFFIX[ch.type]; if (ch.bass != null && ch.bass !== ch.root) nm += "/" + ROOTS[ch.bass]; prev = nm; }
      out.push(prev || "C");
    }
    return out;
  };

  // ---------------- the plan: where the fill goes ----------------
  // p: project; b0, b1: 0-based bars [b0, b1); chart: parseChart result. -> { at (beat), len, n (bars), barLens [], spans: [{ bar, t0, t1 (beats from `at`), sym }], chartText }
  C.plan = function (p, b0, b1, chart) {
    if (!chart.length) throw new Error("Type some chords first, bars split by |.");
    if (!(b1 > b0)) throw new Error("The last bar must come after the first.");
    var at = Meter.barStart(p, b0), n = b1 - b0, lens = [], spans = [], t = 0;
    for (var i = 0; i < n; i++) { var bl = Meter.barLen(p, b0 + i), cs = chart[i % chart.length]; lens.push(bl);
      cs.forEach(function (sym, j) { spans.push({ bar: i, t0: t + bl * j / cs.length, t1: t + bl * (j + 1) / cs.length, sym: sym }); }); t += bl; }
    return { at: at, len: t, n: n, barLens: lens, spans: spans, ts: Meter.tsOfBar(p, b0), chartText: Array.apply(null, Array(n)).map(function (x, i) { return chart[i % chart.length].join(" "); }).join(" | ") };
  };
  function sameBars(plan) { return plan.barLens.every(function (l) { return Math.abs(l - plan.barLens[0]) < 1e-9; }); }

  // ---------------- the sources ----------------
  function heldFor(sym) {
    var H = global.BandHarmony, ch = H && H.parseChord(sym, 0); if (!ch || ch.nc || ch.unknown) return null;
    var v = null; try { v = H.voicing(ch, "standard", null, "piano"); } catch (e) {}
    if (!v || !v.length) v = (ch.tones || [0, 4, 7]).map(function (s) { return 48 + ((ch.root + s) % 12) + (ch.root + s >= 12 ? 12 : 0); });
    return v.slice().sort(function (a, b) { return a - b; });
  }
  // src: { kind: "arp", type, unit (50..200), oct } | { kind: "arranger", style (id), section, channel }
  C.fillNotes = function (src, plan) {
    var out = [];
    if (src.kind === "arp") {
      var A = global.MotifArp, ty = A && A.TYPES[src.type]; if (!ty) throw new Error("Pick an arp type.");
      var part = Object.assign(A.defaults(0), { on: true, type: src.type, unit: src.unit || 100, oct: src.oct || 0, lo: 0, hi: 127, vlo: 1, vhi: 127 });
      plan.spans.forEach(function (sp) {
        var held = heldFor(sp.sym); if (!held) return; var ns = A.partNotes(part, { held: held, order: held, vel: 100 }), pass = ty.bars * 4 * (src.unit || 100) / 100, span = sp.t1 - sp.t0;
        for (var k = 0; k * pass < span - 1e-6; k++) ns.forEach(function (n) { var t = k * pass + n.t; if (t >= span - 1e-6) return;
          var o = { t: Math.round((sp.t0 + t) * 10000) / 10000, d: Math.max(0.05, Math.min(n.dur, span - t)), m: ty.kind === "drum" ? n.piece : n.midi, v: n.vel }; if (o.m != null) out.push(o); });
      });
      return { notes: out, kind: ty.kind === "drum" ? "drum" : "notes", inst: { Drums: "kit", Bass: "ebass", Guitar: "aguitar", Piano: "piano", Synth: "syn-sub" }[ty.cat] || "piano", label: ty.cat + ": " + ty.name };
    }
    if (src.kind === "arranger") {
      var AS = global.ArrangerStyles, S = global.StyleEngine, P = global.BandPhrase; if (!AS || !S || !P) throw new Error("The Style Arranger files are not loaded on this page.");
      var st = AS.list.filter(function (x) { return x.id === src.style; })[0], sec = st && st.sections[src.section], ph = sec && sec.parts[src.channel], cfg = st && st.channels[src.channel];
      if (!ph) throw new Error("That section has no " + src.channel + " part.");
      if (!sameBars(plan)) throw new Error("The meter changes inside these bars; the arranger parts are written for one bar length.");
      var barQ = P.barQ(ph.meter || st.meter); if (Math.abs(barQ - plan.barLens[0]) > 1e-9) throw new Error("This style is in " + (ph.meter || st.meter) + " and the project's bars are " + plan.barLens[0] + " beats long here.");
      var ns = P.resolve(ph, {}), drum = ph.kind === "drum";
      for (var b = 0; b < plan.n; b++) {
        var sb = b % sec.bars, base = b * barQ;
        plan.spans.filter(function (sp) { return sp.bar === b; }).forEach(function (sp) {
          var chord = C.chordOf(sp.sym); if (!chord && !drum) return;
          var inSpan = ns.filter(function (n) { var t = n.t - sb * barQ; return t >= (sp.t0 - base) - 1e-6 && t < (sp.t1 - base) - 1e-6; });
          var conv = drum ? inSpan : S.convertPhrase(inSpan, cfg, st.source, chord);
          conv.forEach(function (n) { var t = base + (n.t - sb * barQ); out.push({ t: Math.round(t * 10000) / 10000, d: Math.max(0.05, Math.min(n.dur, sp.t1 - t)), m: drum ? n.piece : n.midi, v: n.vel }); });
        });
      }
      var snd = cfg && cfg.sound || "piano";
      return { notes: out, kind: drum ? "drum" : "notes", inst: drum ? "kit" : /bass/i.test(src.channel) ? (X.instOf(snd).id === snd ? snd : "ebass") : M.compInst(snd), label: st.name + " " + src.section + " / " + src.channel };
    }
    throw new Error("Unknown source.");
  };

  // ---------------- the panels ----------------
  C.build = function (d, wantAbc, wantFill) {
    d.cmp = el("div", "mdaw-compose"); d.node.insertBefore(d.cmp, d.mx);
    if (wantAbc) abcPanel(d); if (wantFill) fillPanel(d);
  };
  function field(row, label, ctl) { var l = el("label", "mdaw-lbl", label + " "); l.appendChild(ctl); row.appendChild(l); return ctl; }
  function select(opts, aria) { var s = el("select"); s.setAttribute("aria-label", aria); opts.forEach(function (o) { var e = el("option", null, o[1]); e.value = o[0]; s.appendChild(e); }); return s; }
  function noteClip(d) { var tr = d.track(), c = d.clip(); return tr && c && !X.isDrum(tr) && !X.isAudio(tr) ? c : null; }

  // --- Edit as notation ---
  function abcPanel(d) {
    var det = d.abcBox = el("details", "mdaw-tp mdaw-abc"); det.appendChild(el("summary", null, "Edit as notation (the selected note clip as a staff and ABC text)")); d.cmp.appendChild(det);
    var body = el("div"); det.appendChild(body);
    var row = el("div", "mdaw-tools"); body.appendChild(row);
    d.abcKey = field(row, "Key", select([["C", "C (project)"], ["auto", "Best fit"]].concat(global.AbcClip.KEYS.filter(function (k) { return k !== "C"; }).map(function (k) { return [k, k + " major"]; })), "Key signature"));
    d.abcGrid = field(row, "Grid", select([["0.25", "1/16"], ["0.5", "1/8"]], "Quantise to"));
    var bApply = btn("Apply", "Turn the text back into notes (one undo step)", "btn-primary"), bRev = btn("Revert", "Write the text again from the clip");
    d.abcInfo = el("span", "mdaw-status"); [bApply, bRev, d.abcInfo].forEach(function (x) { row.appendChild(x); });
    d.abcText = el("textarea"); d.abcText.rows = 8; d.abcText.spellcheck = false; d.abcText.style.cssText = "width:100%;font-family:var(--font-mono);font-size:.8rem"; d.abcText.setAttribute("aria-label", "ABC text of the clip"); body.appendChild(d.abcText);
    d.abcStaff = el("div", "mdaw-abc-staff"); d.abcStaff.style.cssText = "overflow-x:auto;background:#fff;border-radius:4px;margin-top:.3rem"; body.appendChild(d.abcStaff);
    var tm = null; d.abcText.addEventListener("input", function () { clearTimeout(tm); tm = setTimeout(function () { abcDraw(d); }, 250); });
    d.abcKey.onchange = d.abcGrid.onchange = function () { abcFromClip(d); };
    bRev.onclick = function () { abcFromClip(d); };
    bApply.onclick = function () { abcApply(d); };
    det.addEventListener("toggle", function () { if (det.open) abcFromClip(d); });
    d.abcSig = null;
  }
  function abcOpts(d, c) {
    var p = d.p, ts = Meter.tsOfBar(p, Meter.barAt(p, d.sel.slot >= 0 ? 0 : c.start).bar);
    return { ts: ts, key: d.abcKey.value === "C" && typeof p.key === "number" ? PCK[((p.key % 12) + 12) % 12] : d.abcKey.value, grid: +d.abcGrid.value, title: (d.track() && d.track().name) || "Clip" };
  }
  function abcFromClip(d) {
    var c = noteClip(d); if (!c) { d.abcText.value = ""; d.abcStaff.innerHTML = ""; d.abcInfo.textContent = "Select a note clip (not drums or audio)."; return; }
    var r = global.AbcClip.clipToAbc(c, abcOpts(d, c)); d.abcText.value = r.abc; d.abcGen = r;
    d.abcInfo.textContent = r.bars + " bar" + (r.bars > 1 ? "s" : "") + " of " + r.ts.join("/") + ", " + r.voices + " voice" + (r.voices > 1 ? "s" : "") + (r.offGrid ? "; " + r.offGrid + " notes are off the grid (Apply will snap them)" : "");
    abcDraw(d);
  }
  function abcDraw(d) {
    var A = global.AbcClip, text = d.abcText.value, msgs = [];
    try { var ck = A.checkBars(text); ck.bad.forEach(function (b) { msgs.push("bar " + b.bar + (b.voice !== "V1" ? " (voice " + b.voice + ")" : "") + " has " + b.got + " beats, not " + b.want); }); } catch (e) { msgs.push("cannot read: " + e.message); }
    d.abcBad = msgs; d.abcStaff.innerHTML = "";
    if (global.ABCJS && ABCJS.renderAbc) { try { d.abcTune = ABCJS.renderAbc(d.abcStaff, text, { responsive: "resize", siteTitles: false, add_classes: true, paddingleft: 0, paddingright: 0, clickListener: function (el0) { abcClick(d, el0); } })[0]; } catch (e) { msgs.push("cannot draw: " + e.message); } }
    var base = d.abcGen ? d.abcGen.bars + " bar" + (d.abcGen.bars > 1 ? "s" : "") + " of " + d.abcGen.ts.join("/") + ", " + d.abcGen.voices + " voice" + (d.abcGen.voices > 1 ? "s" : "") : "";
    d.abcInfo.textContent = msgs.length ? "Check: " + msgs.join("; ") : base + (d.abcGen && d.abcGen.offGrid ? "; " + d.abcGen.offGrid + " notes are off the grid (Apply will snap them)" : "");
  }
  function abcClick(d, e) {
    var c = noteClip(d); if (!c || e == null || e.startChar == null) return;
    var spans; try { spans = global.AbcClip.noteSpans(d.abcText.value); } catch (x) { return; }
    var g = +d.abcGrid.value, hit = null; spans.forEach(function (s) { if (s.start === e.startChar || (e.startChar >= s.start && e.startChar < s.end)) hit = hit || s; });
    if (!hit) return; var idx = [];
    c.notes.forEach(function (n, i) { if (hit.notes.indexOf(n.m) >= 0 && Math.round(n.t / g) === Math.round(hit.t / g)) idx.push(i); });
    if (!idx.length) { d.say("That note is not in the clip yet: Apply first."); return; }
    d.sel.notes = idx; d.renderEditor0(); d.say("Selected " + idx.length + " note" + (idx.length > 1 ? "s" : "") + " in the roll (beat " + (Math.round(hit.t * 100) / 100 + 1) + " of the clip).");
  }
  // ---- Tab: the arrangement -> the piano roll -> the ABC text (cursor on the selected note) -> the note on the staff -> the roll (Shift+Tab goes back)
  function openPanel(x) { for (var p = x; p; p = p.parentElement) if (p.tagName === "DETAILS") p.open = true; }
  function spanAt(d, pos) { var sp; try { sp = global.AbcClip.noteSpans(d.abcText.value); } catch (e) { return null; } var hit = null;
    sp.forEach(function (s) { if (!hit && s.end > pos) hit = s; }); return hit || sp[sp.length - 1] || null; }
  function goRoll(d) {
    if (!d.clip() || d.sel.clip < 0 && d.sel.slot < 0) { var ci = d.clipAtPos(d.sel.track, d.pos); if (ci < 0) { var tr0 = d.track(); ci = tr0 && tr0.clips.length ? 0 : -1; } if (ci < 0) { d.say("This track has no clip to open: + Clip makes one."); return true; } d.pick(d.sel.track, ci); }
    openPanel(d.ed); d.ed.tabIndex = -1; d.ed.focus({ preventScroll: true }); d.ed.scrollIntoView({ block: "nearest" }); d.zoneEd = true;
    d.say("Piano roll: " + ((d.track() && d.track().name) || "") + ". Tab goes to the ABC text."); return true;
  }
  function goAbc(d) {
    if (!noteClip(d)) { d.say("Only note clips have notation (not drums or audio)."); return true; }
    openPanel(d.abcBox); if (!d.abcText.value) abcFromClip(d);
    var c = d.clip(), g = +d.abcGrid.value, n = d.sel.notes.length ? c.notes[d.sel.notes[0]] : null, sp = []; try { sp = global.AbcClip.noteSpans(d.abcText.value); } catch (e) {}
    var hit = n && sp.filter(function (s) { return Math.round(s.t / g) === Math.round(n.t / g) && s.notes.indexOf(n.m) >= 0; })[0];
    d.abcText.focus({ preventScroll: true }); d.abcText.scrollIntoView({ block: "nearest" }); if (hit) d.abcText.setSelectionRange(hit.start, hit.end);
    d.say("ABC text" + (hit ? ", on the selected note" : "") + ". Tab goes to the note on the staff."); return true;
  }
  function goStaff(d) {
    var s = spanAt(d, d.abcText.selectionStart || 0); if (!s) { d.say("No notes on the staff."); return true; }
    Array.prototype.forEach.call(d.abcStaff.querySelectorAll(".mdaw-abc-cur"), function (x) { x.classList.remove("mdaw-abc-cur"); });
    var e = d.abcTune && d.abcTune.getElementFromChar && d.abcTune.getElementFromChar(s.start);
    if (e && e.abselem && e.abselem.elemset) e.abselem.elemset.forEach(function (x) { if (x && x.classList) x.classList.add("mdaw-abc-cur"); });
    d.abcStaff.tabIndex = -1; d.abcStaff.focus({ preventScroll: true }); d.abcCur = s.start; abcClick(d, { startChar: s.start }); return true;
  }
  C.tab = function (d, e) {
    var t = e.target, zone = d.abcText && t === d.abcText ? "abc" : d.abcStaff && d.abcStaff.contains(t) ? "staff" : d.ed.contains(t) ? "roll" :
      t === d.node || t === document.body || t === document.documentElement || (d.gridEl && d.gridEl.contains(t)) ? "arr" : null;
    if (!zone) return false; var back = e.shiftKey, abc = !!d.abcBox;
    if (zone === "arr") return goRoll(d);
    if (zone === "roll") return !abc ? false : back ? (goAbc(d), goStaff(d)) : goAbc(d);
    if (zone === "abc") return back ? goRoll(d) : goStaff(d);
    return back ? goAbc(d) : goRoll(d);
  };

  function abcApply(d) {
    var A = global.AbcClip, c = noteClip(d); if (!c) return d.say("Select a note clip first.");
    var r; try { r = A.abcToNotes(d.abcText.value); } catch (e) { return d.say("Could not read the ABC: " + e.message); }
    var o = abcOpts(d, c), q = A.quantise(c, o), ck = A.checkBars(d.abcText.value), warn = [];
    if (q.offGrid) warn.push(q.offGrid + " of the clip's notes are off the grid; applying snaps them to it");
    if (ck.bad.length) warn.push("these bars are the wrong length: " + ck.bad.map(function (b) { return b.bar; }).join(", "));
    if (warn.length && !global.confirm(warn.join(". ") + ". Apply anyway?")) return d.say("Not applied.");
    var notes = A.merge(c.notes, r.notes, o.grid).filter(function (n) { return n.m >= 21 && n.m <= 108; });
    var bb = Meter.beats(o.ts);
    d.change(function () { c.notes = notes; delete c.felt; var need = Math.ceil(r.bars * bb - 1e-6); if (need > c.len + 1e-6 && r.barBeats === bb) c.len = need; d.sel.notes = []; });
    d.say("Applied: " + notes.length + " notes (Undo brings the old ones back)."); abcFromClip(d);
  }

  // --- Open a tune from the collection (apps/tunes/tunes-object.js, loaded on first use): its melody as a clip on a new track at the playhead's bar,
  // its chord symbols and bars put into the Fill row below (Fill then writes the band). Repeats are not unrolled; a pickup bar counts as bar 1.
  var TUNES = null;
  function loadTunes() {
    if (TUNES) return Promise.resolve(TUNES);
    return new Promise(function (ok, no) { var sc = document.createElement("script"); sc.src = "/apps/tunes/tunes-object.js"; sc.onload = function () { ok(); }; sc.onerror = function () { no(new Error("could not load the tune collection")); }; document.head.appendChild(sc); })
      .then(function () { var src = typeof tunesObject !== "undefined" ? tunesObject : global.tunesObject, out = [];      // eslint-disable-line no-undef
        Object.keys(src || {}).forEach(function (set) { String(src[set]).split(/\n(?=X:)/).forEach(function (abc) { var t = /^T:\s*(.+)$/m.exec(abc); if (t && /^K:/m.test(abc)) out.push({ title: t[1].trim(), set: set, abc: abc.trim() }); }); });
        TUNES = out; return out; });
  }
  C.tuneInfo = function (abc) {
    var m = /^M:\s*(\S+)/m.exec(abc), ts = [4, 4]; if (m) { if (m[1] === "C|") ts = [2, 2]; else { var f = /^(\d+)\/(\d+)$/.exec(m[1]); if (f) ts = [+f[1], +f[2]]; } }
    var q = /^Q:\s*(?:(\d+)\/(\d+)\s*=\s*)?(\d+)/m.exec(abc), qpm = q ? Math.round(+q[3] * (q[1] ? 4 * q[1] / q[2] : 1)) : 0;
    return { ts: ts, qpm: qpm };
  };
  C.chartOf = function (chords, bars) {      // chord symbols -> "C | C G7 | ..." one entry a bar (an empty bar repeats the last chord)
    var per = []; for (var i = 0; i < bars; i++) per.push([]);
    chords.forEach(function (c) { if (c.bar >= 0 && c.bar < bars && /^[A-G]/.test(c.name)) per[c.bar].push(c.name); });
    var last = null; return per.map(function (x) { if (x.length) last = x[x.length - 1]; return x.length ? x.join(" ") : last || "C"; }).join(" | ");
  };
  C.openTune = function (d, tune) {
    var A = global.AbcClip, r; try { r = A.abcToNotes(tune.abc); } catch (e) { return d.say("Could not read that tune: " + e.message); }
    if (!r.notes.length) return d.say("That tune has no notes to open.");
    var p = d.p, info = C.tuneInfo(tune.abc), bar = Meter.barAt(p, d.pos + 1e-9).bar, at = Meter.barStart(p, bar), empty = !p.tracks.some(function (t) { return t.clips.length; }), F = d.fillUi;
    var here = Meter.tsOfBar(p, bar); if (here.join("/") !== info.ts.join("/") && !empty) return d.say(tune.title + " is in " + info.ts.join("/") + " but bar " + (bar + 1) + " is " + here.join("/") + ": set the Time from that bar first.");
    var bars = Math.max(1, r.bars), len = bars * Meter.beats(info.ts);
    d.change(function () {
      if (here.join("/") !== info.ts.join("/")) Meter.set(p, bar, info.ts); if (empty && info.qpm >= 30 && info.qpm <= 300) p.tempo = info.qpm;
      var tr = M.mkTrack(tune.title.slice(0, 24), "piano"); tr.clips.push({ start: at, len: len, notes: r.notes.map(function (n) { return { t: n.t, d: n.d, m: n.m, v: 0.75 }; }) });
      p.tracks.push(tr); p.bars = Math.max(p.bars, Math.min(64, bar + bars)); d.sel = { track: p.tracks.length - 1, clip: 0, slot: -1, notes: [] };
    });
    if (F) { F.from.value = bar + 1; F.to.value = bar + bars; F.edited = true; if (r.chords.length) F.chart.value = C.chartOf(r.chords, bars); }
    d.say("Opened " + tune.title + ": " + bars + " bars of melody" + (r.chords.length ? "; its chords are in Fill from chords below: choose a source and press Fill." : " (it has no chord symbols).") + (/:\||\|:/.test(tune.abc) ? " Repeats are written once." : ""));
  };
  function tunePicker(d, body) {
    var row = el("div", "mdaw-tools"), lb = el("label", "mdaw-lbl mdaw-wide", "Tune "), inp = el("input"), dl = el("datalist"), bOpen = btn("Open the tune", "Its melody on a new track at the playhead's bar, its chords into the Chords box", "btn-primary");
    inp.type = "text"; inp.placeholder = "Search the tune collection…"; inp.setAttribute("aria-label", "Tune title"); dl.id = d.id + "-tunes"; inp.setAttribute("list", dl.id);
    lb.appendChild(inp); row.appendChild(lb); row.appendChild(dl); row.appendChild(bOpen); body.appendChild(row);
    inp.addEventListener("focus", function () { loadTunes().then(function (ts) { if (dl.children.length) return; ts.forEach(function (t) { var o = el("option"); o.value = t.title; o.label = t.set; dl.appendChild(o); }); }).catch(function (e) { d.say(e.message); }); });
    function go() { loadTunes().then(function (ts) { var q = inp.value.trim().toLowerCase(); if (!q) return d.say("Type a tune's title first.");
      var t = ts.filter(function (x) { return x.title.toLowerCase() === q; })[0] || ts.filter(function (x) { return x.title.toLowerCase().indexOf(q) >= 0; })[0]; if (!t) return d.say("No tune called " + inp.value + ".");
      C.openTune(d, t); }).catch(function (e) { d.say(e.message); }); }
    bOpen.onclick = go; inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); go(); } });
  }

  // --- Fill from chords ---
  function fillPanel(d) {
    var det = d.fillBox = el("details", "mdaw-tp mdaw-fill"); det.appendChild(el("summary", null, "Fill from chords (a band style, an arp type or an arranger section onto a clip)")); d.cmp.appendChild(det);
    var body = el("div"), F = d.fillUi = {}; det.appendChild(body);
    var r1 = el("div", "mdaw-tools"); body.appendChild(r1);
    F.from = field(r1, "From bar", el("input")); F.to = field(r1, "To bar", el("input")); F.from.type = F.to.type = "number"; F.from.min = F.to.min = 1; F.from.value = 1; F.to.value = 4;
    var bLoop = btn("Loop", "Use the loop bars"), bClip = btn("Clip", "Use the selected clip's bars");
    F.from.oninput = F.to.oninput = function () { F.edited = true; };
    bLoop.onclick = function () { F.edited = true; F.from.value = d.p.loop.from + 1; F.to.value = d.p.loop.to; }; bClip.onclick = function () { var c = d.clip(); if (!c) return d.say("Select a clip first."); F.edited = true;
      var s = d.sel.slot >= 0 ? 0 : c.start; F.from.value = Meter.barAt(d.p, s).bar + 1; F.to.value = Meter.barAt(d.p, s + c.len - 1e-6).bar + 1; };
    [bLoop, bClip].forEach(function (x) { r1.appendChild(x); });
    tunePicker(d, body);
    var r2 = el("div", "mdaw-tools"); body.appendChild(r2);
    var cl = el("label", "mdaw-lbl mdaw-wide", "Chords "); F.chart = el("input"); F.chart.type = "text"; F.chart.value = "Dm7 G7 | Cmaj7 | Am7 D7 | Gmaj7"; F.chart.setAttribute("aria-label", "Chords, bars split by |"); cl.appendChild(F.chart); r2.appendChild(cl);
    var bRead = btn("Chords from the selected clip", "Read the chord symbols in the notation panel, else the chords the clip's notes spell, one a bar"); r2.appendChild(bRead);
    var r3 = el("div", "mdaw-tools"); body.appendChild(r3);
    F.src = field(r3, "From", select([["band", "Band style (Session players)"], ["arp", "Arp type (workstation)"], ["arranger", "Style Arranger section"]], "Source"));
    var rb = F.rowBand = el("span", "mdaw-tools"), ra = F.rowArp = el("span", "mdaw-tools"), rr = F.rowArr = el("span", "mdaw-tools"); [rb, ra, rr].forEach(function (x) { x.style.margin = "0"; r3.appendChild(x); });
    var styles = ((global.BandCatalog && global.BandCatalog.styles) || []).map(function (s) { return [s.id, s.label]; });
    F.bStyle = field(rb, "Style", select(styles.length ? styles : [["rock", "rock"]], "Band style")); F.bStyle.value = d.styleSel ? d.styleSel.value : "rock";
    F.bPart = field(rb, "Part", select([["comp", "Chords"], ["bass", "Bass"], ["drums", "Drums"], ["congas", "Congas"]], "Part"));
    var types = (global.MotifArp ? global.MotifArp.TYPES : []).map(function (t, i) { return [i, t.cat + ": " + t.name]; });
    F.aType = field(ra, "Arp", select(types.length ? types : [[0, "(not loaded)"]], "Arp type")); F.aUnit = field(ra, "Length", select([[50, "50%"], [100, "100%"], [200, "200%"]], "Unit multiply")); F.aUnit.value = 100;
    F.aOct = field(ra, "Octave", select([[-1, "−1"], [0, "0"], [1, "+1"]], "Octave")); F.aOct.value = 0;
    var AS = global.ArrangerStyles; F.rStyle = field(rr, "Style", select(AS ? AS.list.map(function (s) { return [s.id, s.name]; }) : [["", "(not loaded)"]], "Arranger style"));
    F.rSec = field(rr, "Section", select([["", ""]], "Section")); F.rCh = field(rr, "Channel", select([["", ""]], "Channel"));
    function fillSecs() { var st = AS && AS.list.filter(function (s) { return s.id === F.rStyle.value; })[0]; if (!st) return; var keep = F.rSec.value; F.rSec.innerHTML = "";
      Object.keys(st.sections).forEach(function (k) { var o = el("option", null, k); o.value = k; F.rSec.appendChild(o); }); if (st.sections[keep]) F.rSec.value = keep; fillChs(); }
    function fillChs() { var st = AS && AS.list.filter(function (s) { return s.id === F.rStyle.value; })[0], sec = st && st.sections[F.rSec.value]; if (!sec) return; var keep = F.rCh.value; F.rCh.innerHTML = "";
      Object.keys(sec.parts).forEach(function (k) { var o = el("option", null, k + (sec.parts[k].kind === "drum" ? " (drums)" : "")); o.value = k; F.rCh.appendChild(o); }); if (sec.parts[keep]) F.rCh.value = keep; }
    F.rStyle.onchange = fillSecs; F.rSec.onchange = fillChs; fillSecs();
    function showSrc() { rb.hidden = F.src.value !== "band"; ra.hidden = F.src.value !== "arp"; rr.hidden = F.src.value !== "arranger"; } F.src.onchange = showSrc; showSrc();
    var r4 = el("div", "mdaw-tools"); body.appendChild(r4);
    F.target = field(r4, "Onto", select([["new", "A new track"]], "Target track")); var bFill = btn("Fill", "Write one clip (one undo step)", "btn-primary"); r4.appendChild(bFill);
    d.fillTargets = function () { var sg = d.p.tracks.map(function (t) { return t.name + "|" + t.inst; }).join(","); if (sg === F.tsig) return; F.tsig = sg; var keep = F.target.value; F.target.innerHTML = ""; var o = el("option", null, "A new track"); o.value = "new"; F.target.appendChild(o);
      d.p.tracks.forEach(function (t, i) { if (X.isAudio(t)) return; var e = el("option", null, t.name); e.value = i; F.target.appendChild(e); }); F.target.value = keep; if (F.target.value !== keep) F.target.value = "new"; };
    d.fillTargets();
    bRead.onclick = function () { readChords(d); }; bFill.onclick = function () { doFill(d); };
    det.addEventListener("toggle", function () { if (det.open) { fillDefaults(d); d.fillTargets(); } });
  }
  function fillDefaults(d) {
    var F = d.fillUi; if (F.edited) return; var p = d.p, c = d.clip();
    if (p.loop.on) { F.from.value = p.loop.from + 1; F.to.value = p.loop.to; }
    else if (c) { var s = d.sel.slot >= 0 ? 0 : c.start; F.from.value = Meter.barAt(p, s).bar + 1; F.to.value = Meter.barAt(p, s + c.len - 1e-6).bar + 1; }
    else { var b = Meter.barAt(p, d.pos).bar; F.from.value = b + 1; F.to.value = Math.min(p.bars, b + Math.max(1, C.parseChart(F.chart.value).length)); }
  }
  function readChords(d) {
    var F = d.fillUi, c = noteClip(d); if (!c) return d.say("Select a note clip to read chords from.");
    var text = d.abcText && d.abcText.value && d.abcBox && d.abcBox.open ? d.abcText.value : null, found = null;
    if (text && /"[A-G][^"]*"/.test(text)) { try { var r = global.AbcClip.abcToNotes(text), bars = {}; r.chords.forEach(function (x) { (bars[x.bar] = bars[x.bar] || []).push(x.name); });
      var ks = Object.keys(bars).map(Number).sort(function (a, b) { return a - b; }); if (ks.length) found = ks.map(function (k) { return bars[k].join(" "); }).join(" | "); } catch (e) {} }
    if (!found) { var ts = Meter.tsOfBar(d.p, Meter.barAt(d.p, d.sel.slot >= 0 ? 0 : c.start).bar), bb = Meter.beats(ts), n = Math.max(1, Math.ceil(c.len / bb - 1e-6)), cs = C.chordsFromNotes(c.notes, bb, n);
      if (!cs) return d.say("The chord recogniser is not loaded."); found = cs.join(" | "); }
    F.chart.value = found; d.say("Chords: " + found);
  }
  function doFill(d) {
    var F = d.fillUi, p = d.p, plan, res;
    try {
      var b0 = clamp(Math.round(+F.from.value || 1), 1, 64) - 1, b1 = clamp(Math.round(+F.to.value || 1), 1, 64);
      plan = C.plan(p, b0, b1, C.parseChart(F.chart.value));
      if (F.src.value === "band") {
        var part = F.bPart.value, r = M.bandParts(plan.chartText, F.bStyle.value, p.tempo, 1, plan.ts, { amt: d.feelSel ? +d.feelSel.value || 0 : 0 }, d.bandOver ? d.bandOver() : null);
        res = { notes: r[part], kind: part === "drums" || part === "congas" ? "drum" : "notes", inst: part === "bass" ? r.bassInst : part === "comp" ? r.compInst : part === "drums" ? "kit" : "congas", label: F.bStyle.options[F.bStyle.selectedIndex].text + " " + part };
        if (Math.abs(r.len - plan.len) > 1e-6) throw new Error("The band's bars here are " + r.len + " beats long, the project's " + plan.len + " (a 5/8 or 7/8 meter?).");
      } else if (F.src.value === "arp") res = C.fillNotes({ kind: "arp", type: +F.aType.value, unit: +F.aUnit.value, oct: +F.aOct.value }, plan);
      else res = C.fillNotes({ kind: "arranger", style: F.rStyle.value, section: F.rSec.value, channel: F.rCh.value }, plan);
    } catch (e) { return d.say(e.message); }
    if (!res.notes.length) return d.say("That source wrote no notes for these chords.");
    var tv = F.target.value, existing = tv === "new" ? null : p.tracks[+tv];
    if (existing && (X.isDrum(existing) !== (res.kind === "drum"))) return d.say("This is " + (res.kind === "drum" ? "a drum part but " + existing.name + " plays notes." : "a note part but " + existing.name + " is a drum track."));
    var at = plan.at, len = plan.len, idx;
    d.change(function () {
      var tr = existing; if (!tr) { tr = M.mkTrack(res.label.length > 24 ? res.label.slice(0, 24) : res.label, res.inst); p.tracks.push(tr); }
      tr.clips = tr.clips.filter(function (c) { return c.start + c.len <= at + 1e-9 || c.start >= at + len - 1e-9; }); tr.clips.push({ start: at, len: len, notes: res.notes.map(function (n) { return { t: n.t, d: n.d, m: n.m, v: Math.max(0.05, Math.min(1, n.v == null ? 0.7 : n.v)) }; }) });
      p.bars = Math.max(p.bars, Math.min(64, Meter.barAt(p, at + len - 1e-9).bar + 1));
      d.sel = { track: p.tracks.indexOf(tr), clip: tr.clips.length - 1, notes: [] };
    });
    d.say("Filled bars " + (Meter.barAt(p, at).bar + 1) + "-" + (Meter.barAt(p, at + len - 1e-9).bar + 1) + " with " + res.label + ": " + res.notes.length + " notes in one clip" + (existing ? " on " + existing.name + " (clips there in that range replaced)" : " on a new track") + ". Undo takes it back.");
    if (d.fillTargets) d.fillTargets();
  }

  // ---------------- keep the panels in step with the selection ----------------
  var prev = D.renderPanel;
  D.renderPanel = function (force) {
    if (prev) prev.apply(this, arguments);
    if (this.abcBox && this.abcBox.open) { var c = noteClip(this), sig = c ? JSON.stringify([this.sel.track, this.sel.clip, this.sel.slot, c.start, c.len, c.notes, this.abcKey.value, this.abcGrid.value, this.p.ts, this.p.tsMap]) : "-";
      if (sig !== this.abcSig) { this.abcSig = sig; abcFromClip(this); } }
    if (this.fillBox && this.fillBox.open && this.fillTargets) this.fillTargets();
  };
})(typeof window !== "undefined" ? window : globalThis);
