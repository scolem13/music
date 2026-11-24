// groove-bridge.js — grooves between the Drumset (BandGroove, groove-editor.js) and the DAW scratch pad (MiniDaw). GrooveBridge.
// Pure conversions (tested by node tests/band/groove/t_bridge.js) and the two small hooks:
//
//   GrooveBridge.toDaw(g)            -> { name, ts:[n,d], tempo, bars, len (quarters), kit:[note], congas:[note], said:[text] }
//                                       notes are the DAW's: { t (quarter notes from the clip start), d, m (piece), v 0..1 }.
//                                       Swing is written into the positions (the groove's own), ornaments (flam, drag, buzz) are
//                                       one plain hit, pieces the DAW kit has no row for are mapped to the nearest row or dropped
//                                       (`said` names every one).
//   GrooveBridge.fromDaw(notes, o)   -> { groove, query, said }   o: { ts, tempo, len (quarters), title }. Notes within 5% of a
//                                       cell of 16 (else triplet 12, 24, 32, 48) keep their cell; at most 10 bars; velocity
//                                       >= 0.9 = accent, <= 0.4 = ghost (snare), and the band's own levels read back as they were.
//   GrooveBridge.openInDaw(g)        Drumset side: leaves the groove in localStorage "mdaw:groove" { at, name, ts, tempo, bars, len,
//                                       kit, congas, said } and opens /tools/daw.html.
//   DAW side (when MiniDaw is on the page): the first scratch-pad DAW (data-nav or data-panels) takes the hand-off within ten
//   minutes on MiniDaw.init(): new tracks "Drumset: <title>" (kit) and "... congas" at bar 1, or the next bar line after the last
//   clip; an empty project takes the groove's meter and tempo, a project with clips gets the meter from that bar on; ONE undo
//   step. The "Open in Drumset" button next to Split sends the selected drum clip to /tools/drumset-b.html?<groove address>.
// Nobody has listened to what comes back; velocities are the Drumset's guesses (groove.js CELLS) carried over unchanged.
(function (global) {
  var B = global.BandGroove, KEY = "mdaw:groove", WAIT = 10 * 60 * 1000;
  var KIT = { crash: "crash", ride: "ride", ride2: "ride", rideBell: "ride", hatOpen: "hatOpen", hatClosed: "hatClosed", hatFoot: "hatClosed", tomHi: "tomHi",
              tomMid: "tomMid", tom3: "tomMid", tomLo: "tomLo", rim: "rim", snare: "snare", kick: "kick" };
  var HAND = { congaSlap: "congaSlap", congaOpen: "congaOpen", congaMute: "congaMute", congaHeel: "congaHeel", congaToe: "congaToe", congaBass: "congaOpen",
               tumbaOpen: "tumbaOpen", tumbaMute: "tumbaOpen", tumbaBass: "tumbaBass" };
  var NAME = { rideBell: "ride bell", ride2: "ride", hatFoot: "hi-hat foot", tom3: "low tom", congaBass: "conga bass tone", tumbaMute: "tumba muffled tone" };
  function r6(x) { return Math.round(x * 1e6) / 1e6; }
  function listOf(a) { return a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]; }

  function toDaw(g) {
    var o = { swing: true, ornaments: false, tempo: g.tempo }, said = [], q = B.compound(g) ? 1.5 : 4 / g.d, barQ = g.n * 4 / g.d;
    var mapped = {}, dropped = {}, orn = 0, swung = 0;
    function conv(bars, map) {
      var out = [];
      bars.forEach(function (bar, b) { bar.forEach(function (e) {
        var m = map[e.piece];
        if (!m) { dropped[NAME[e.piece] || e.piece] = 1; return; }
        if (m !== e.piece) mapped[(NAME[e.piece] || e.piece) + " to " + m] = 1;
        if (e.art === "flam" || e.art === "drag" || e.art === "buzz") orn++;
        out.push({ t: r6(b * barQ + e.pos * q), d: 0.25, m: m, v: r6(e.vel) });
      }); });
      return out.sort(function (a, c) { return a.t - c.t; });
    }
    var kit = conv(B.toEvents(g, o), KIT), congas = conv(B.congaEvents(g, o), HAND);
    if (B.swings(g) && g.swing > 0) swung = 1;
    if (Object.keys(mapped).length) said.push("Moved to the nearest DAW row: " + listOf(Object.keys(mapped)) + ".");
    if (Object.keys(dropped).length) said.push("Left out (the DAW kit has no row): " + listOf(Object.keys(dropped)) + ".");
    if (orn) said.push(orn + (orn === 1 ? " flam, drag or buzz is" : " flams, drags and buzzes are") + " one plain hit.");
    if (swung) said.push("Swing is written into the note positions.");
    return { name: g.title || "Drumset groove", ts: [g.n, g.d], tempo: g.tempo, bars: g.bars, len: g.bars * barQ, kit: kit, congas: congas, said: said };
  }

  function fromDaw(notes, o) {
    o = o || {}; var ts = o.ts || [4, 4], n = ts[0], d = ts[1], said = [], proto = { n: n, d: d }, comp = B.compound({ n: n, d: d });
    var q = comp ? 1.5 : 4 / d, barQ = n * 4 / d, len = o.len || 0, bars = Math.max(1, Math.round(len / barQ - 1e-6) || 1);
    if (bars > B.MAX_BARS) { said.push("The clip is " + bars + " bars; the Drumset holds at most " + B.MAX_BARS + " bars, so the first " + B.MAX_BARS + " bars came."); bars = B.MAX_BARS; }
    var list = notes.filter(function (x) { return x.t >= -1e-6 && x.t < bars * barQ - 1e-6; });
    if (list.length < notes.length && notes.length - list.length) { var cut = notes.length - list.length; if (bars < B.MAX_BARS || len / barQ > B.MAX_BARS) said.push(cut + (cut === 1 ? " note was" : " notes were") + " past the Drumset's last bar and left out."); }
    var barsEv = []; for (var i = 0; i < bars; i++) barsEv.push([]);
    list.forEach(function (x) {
      var b = Math.min(bars - 1, Math.max(0, Math.floor(x.t / barQ + 1e-6))), e = { pos: r6((x.t - b * barQ) / q), piece: x.m, vel: x.v == null ? 0.6 : x.v };
      if (e.vel >= 0.9) e.art = "accent"; else if (e.vel <= 0.4) e.art = "ghost";
      barsEv[b].push(e);
    });
    // the coarsest grid every note is within 5% of a cell of; a note on none is moved to the nearest cell of 16
    var divs = B.divsFor(n, d), div = 0, cand = [16, 12, 24, 32, 48];
    function off(dv, p) { var s = p * (comp ? 3 * dv / 8 : dv / d); return Math.abs(s - Math.round(s)); }
    for (var k = 0; k < cand.length && !div; k++) if (divs.indexOf(cand[k]) >= 0 && barsEv.every(function (bar) { return bar.every(function (e) { return off(cand[k], e.pos) < 0.05; }); })) div = cand[k];
    if (!div) { div = divs.indexOf(16) >= 0 ? 16 : divs[divs.length - 1]; said.push("Some notes sat between the cells; they were moved to the nearest of " + div + " to a bar."); }
    else if (div !== 16) said.push("The grid is " + (div % 3 === 0 ? "triplets (" + div + " a bar of 4/4)" : div + "ths") + ".");
    var g = B.fromEvents(barsEv, { n: n, d: d, tempo: o.tempo, title: o.title, div: div });
    g.warnings.forEach(function (w) { said.push(w); });
    return { groove: g, query: B.stringify(g), said: said };
  }

  // ---- Drumset side
  function openInDaw(g) {
    var p = toDaw(g); p.at = Date.now();
    try { global.localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { return false; }
    global.open("/tools/daw.html", "_blank"); return true;
  }

  // ---- DAW side
  function put(d, h) {
    var M = global.MiniDaw.core.Meter, mk = global.MiniDaw.mkTrack, p = d.p, said = [];
    var end = 0; p.tracks.forEach(function (t) { t.clips.forEach(function (c) { end = Math.max(end, c.start + c.len); }); });
    var empty = end === 0, bar = empty ? 0 : M.barAt(p, end - 1e-6).bar + 1, at = M.barStart(p, bar), ts = h.ts;
    var here = M.tsOfBar(p, bar), made = [];
    d.change(function () {
      if (empty) { p.tsMap = []; M.set(p, 0, ts); p.tempo = Math.max(30, Math.min(300, h.tempo || p.tempo)); }
      else if (here.join("/") !== ts.join("/")) { M.set(p, bar, ts); said.push("From bar " + (bar + 1) + " the project is in " + ts.join("/") + ".");  }
      [["kit", h.kit, "", "kit"], ["congas", h.congas, " congas", "congas"]].forEach(function (x) {
        if (!x[1] || !x[1].length) return;
        var tr = mk(("Drumset: " + h.name).slice(0, 24) + x[2], x[3], [{ start: at, len: h.len, notes: x[1].map(function (n) { return { t: n.t, d: n.d, m: n.m, v: n.v }; }) }]);
        p.tracks.push(tr); made.push(p.tracks.length - 1);
      });
      p.bars = Math.max(p.bars, Math.min(64, bar + h.bars));
      if (made.length) d.sel = { track: made[0], clip: 0, slot: -1, notes: [] };
    });
    if (!made.length) return d.say("The groove had no notes to bring in.");
    if (d.setPos) d.setPos(at);
    var n = (h.kit || []).length, c = (h.congas || []).length;
    d.say("Brought in " + h.name + " from the Drumset: " + h.bars + " bars of " + ts.join("/") + " at " + h.tempo + ", " + n + " drum notes" + (c ? " and " + c + " conga notes on their own track" : "") +
      ", from bar " + (bar + 1) + ". " + (empty ? "The project took its meter and tempo. " : "") + said.concat(h.said || []).join(" ") + " (Undo takes it out.)");
  }
  function take() {
    var h; try { h = JSON.parse(global.localStorage.getItem(KEY) || "null"); } catch (e) { h = null; }
    if (!h || !h.kit) return;
    var d = null, all = global.MiniDaw.all; for (var i = 0; i < all.length; i++) if (all[i].node.hasAttribute("data-nav") || all[i].node.hasAttribute("data-panels")) { d = all[i]; break; }
    if (!d) return;
    try { global.localStorage.removeItem(KEY); } catch (e) {}
    if (Date.now() - (h.at || 0) > WAIT) return;
    put(d, h);
  }
  function sendClip(d) {
    var M = global.MiniDaw.core.Meter, p = d.p, tr = p.tracks[d.sel.track], c = tr && d.sel.clip >= 0 && tr.clips[d.sel.clip];
    if (!c) return d.say("Select a drum clip in the arrangement first.");
    if (!global.MiniDaw.core.isDrum(tr)) return d.say(tr.name + " is not a drum track; select a Drums or Congas clip.");
    var r = fromDaw(c.notes || [], { ts: M.tsOfBar(p, M.barAt(p, c.start + 1e-9).bar), tempo: p.tempo, len: c.len, title: tr.name });
    if (!(c.notes || []).length) return d.say("That clip has no notes.");
    d.say("Opening the Drumset: " + (r.said.join(" ") || "every note kept its cell."));
    global.open("/tools/drumset-b.html" + r.query, "_blank");
  }
  if (global.MiniDaw && global.MiniDaw.init) {
    var init = global.MiniDaw.init;
    global.MiniDaw.init = function () {
      var all = init.apply(this, arguments);
      all.forEach(function (d) {
        if (!d.node.hasAttribute("data-nav") && !d.node.hasAttribute("data-panels")) return;
        var bs = Array.prototype.filter.call(d.node.querySelectorAll("button"), function (b) { return b.textContent === "Split"; })[0];
        if (!bs || d.node.querySelector(".mdaw-togroove")) return;
        var b = global.MiniDaw.core.btn("Open in Drumset", "Send the selected drum clip to the Drumset tool as a written groove (at most 10 bars)"); b.className += " mdaw-togroove";
        b.onclick = function () { sendClip(d); }; bs.parentNode.insertBefore(b, bs.nextSibling);
      });
      try { take(); } catch (e) { if (global.console) console.error(e); }
      return all;
    };
  }
  global.GrooveBridge = { toDaw: toDaw, fromDaw: fromDaw, openInDaw: openInDaw, KEY: KEY, KIT: KIT, HAND: HAND };
})(typeof window !== "undefined" ? window : globalThis);
