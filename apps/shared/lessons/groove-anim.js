// groove-anim.js — what the player's hands and feet are doing, drawn from above and lit as the band plays (LessonGrooveAnim).
// House style: DIAGRAMS.md beside this file. Used by blues-kit.js on every drum and conga step; any page can use it:
//
//   var a = LessonGrooveAnim.create(host, "kit" | "congas")   draws the picture into host
//   a.at(rec, prev, pos)   rec = the bar sounding now as BandPlayer's onBarEvents gave it ({ parts: { drums | congas: [{ pos, piece, ... }] },
//                          beats, tempo, opts }), prev = the bar before it (or null), pos = beats into rec (BandPlayer.where().pos).
//                          Every hit within the last 0.4 beat is lit, fading; the limb (kit) or the hand and stroke (congas) is named.
//   a.clear()              nothing lit
//
// Kit, for a right-handed player: right hand on the hi-hat, ride, crash and floor tom; left hand on the snare and the high toms;
// right foot the bass drum, left foot the hi-hat pedal (who USUALLY plays each; a fill may cross over).
// Congas: the conga on the left, the tumba on the right (the usual set-up for a right-handed player). A stroke is drawn where it
// is played: bass in the middle of the head, open / slap / muffled at the edge nearest the player, heel and toe the palm rocking at the edge.
(function (global) {
  "use strict";
  var NS = "http://www.w3.org/2000/svg", FADE = 0.4;
  function sv(tag, a, parent) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); if (parent) parent.appendChild(e); return e; }
  function titled(g, t) { var e = sv("title", {}, g); e.textContent = t; return g; }
  var CSS = ".ga{max-width:300px;flex:0 0 auto}.ga svg{width:100%;height:auto;display:block;border:1px solid var(--site-border);border-radius:6px;background:var(--site-surface)}" +
    ".ga .ga-p{fill:var(--site-surface-2);stroke:var(--site-ink);stroke-width:1.6}.ga .ga-cym{fill:color-mix(in srgb,#d4a017 18%,var(--site-surface))}" +
    ".ga .ga-lit{fill:var(--site-accent)}.ga text{font-family:var(--font-mono),monospace;font-size:10px;fill:var(--site-ink-2)}" +
    ".ga .ga-limb{font-size:11px;fill:var(--site-ink-3)}.ga .ga-limb.on{fill:var(--site-accent);font-weight:700}" +
    ".ga .ga-hand{stroke:var(--site-ink);stroke-width:1.2}.ga .ga-R{fill:var(--site-accent)}.ga .ga-L{fill:#7b4fc9}.ga .ga-hand-t{font-size:11px;font-weight:700;fill:#fff}" +
    ".ga-cap{font-size:.75rem;color:var(--site-ink-2);margin-top:.2rem}";
  function style() { if (document.getElementById("ga-css")) return; var s = document.createElement("style"); s.id = "ga-css"; s.textContent = CSS; document.head.appendChild(s); }

  // when an event sounds, in the (swung) beats of the player's clock
  function when(e, rec) {
    var P = global.BandPlayer; if (e.straight || !P || !P.warp) return e.pos;
    if (rec.compound) return P.warp(e.pos, 2 / 3);
    var sa = P.swingAt ? P.swingAt(rec.opts, rec.tempo || 120) : { s: (rec.opts && rec.opts.feel === "straight") ? 0.5 : P.swingFor(rec.tempo || 120), div: 8 };
    return P.warp(e.pos, sa.s, sa.div);
  }
  function recent(rec, prev, pos, part) {
    var out = [];
    function scan(r, shift) { ((r && r.parts && r.parts[part]) || []).forEach(function (e) { var age = pos - (when(e, r) - shift); if (age >= 0 && age < FADE) out.push({ e: e, k: 1 - age / FADE }); }); }
    scan(rec, 0); if (prev) scan(prev, prev.beats || 4);
    return out;
  }

  // ---- the kit from above ----
  var KIT = [ // id, shape [x, y, r] (a rect when w/h), label, limb, title
    { id: "crash", c: [62, 50, 30], cym: 1, l: "crash", limb: "RH", t: "Crash cymbal" },
    { id: "ride", c: [244, 72, 34], cym: 1, l: "ride", limb: "RH", t: "Ride cymbal (the bell is its middle)" },
    { id: "hat", c: [52, 122, 25], cym: 1, l: "hi-hat", limb: "RH", t: "Hi-hat: two cymbals on a stand, closed by the left foot" },
    { id: "tomHi", c: [122, 66, 18], l: "tom 1", limb: "LH", t: "High tom" },
    { id: "tomMid", c: [174, 66, 19], l: "tom 2", limb: "LH", t: "Middle tom" },
    { id: "snare", c: [108, 132, 23], l: "snare", limb: "LH", t: "Snare drum (a cross-stick is played on its rim)" },
    { id: "tomLo", c: [222, 142, 26], l: "floor", limb: "RH", t: "Floor tom" },
    { id: "kick", r: [134, 100, 52, 40], l: "kick", limb: "RF", t: "Bass drum, seen from above, its pedal at the player's end" },
    { id: "hatFoot", r: [46, 170, 16, 26], l: "", limb: "LF", t: "Hi-hat pedal (left foot)" },
    { id: "kickPedal", r: [152, 170, 16, 26], l: "", limb: "RF", t: "Bass drum pedal (right foot)" }
  ];
  var PIECE = { kick: ["kick", "kickPedal"], snare: ["snare"], rim: ["snare"], sticks: [], hat: ["hat"], hatClosed: ["hat"], hatOpen: ["hat"], hatFoot: ["hat", "hatFoot"],
    ride: ["ride"], rideBell: ["ride"], crash: ["crash"], tomHi: ["tomHi"], tomMid: ["tomMid"], tomLo: ["tomLo"] };
  var LIMB = { kick: "RF", hatFoot: "LF", snare: "LH", rim: "LH", tomHi: "LH", tomMid: "LH" };          // the rest: right hand
  var WORD = { hatOpen: "open hi-hat", rim: "cross-stick", rideBell: "ride bell" };
  function kit(host) {
    var svg = sv("svg", { viewBox: "0 0 300 230", role: "img", "aria-label": "A drum kit from above; each piece lights as it is played, and the limb that plays it" }, host), shapes = {};
    titled(svg, "A drum kit from above, the drummer at the bottom");
    KIT.forEach(function (p) {
      var g = titled(sv("g", {}, svg), p.t), s;
      if (p.c) s = sv("circle", { cx: p.c[0], cy: p.c[1], r: p.c[2], "class": "ga-p" + (p.cym ? " ga-cym" : "") }, g);
      else s = sv("rect", { x: p.r[0], y: p.r[1], width: p.r[2], height: p.r[3], rx: 4, "class": "ga-p" }, g);
      if (p.id === "ride") sv("circle", { cx: p.c[0], cy: p.c[1], r: 8, fill: "none", stroke: "currentColor", "stroke-opacity": 0.4 }, g);
      if (p.l) { var t = sv("text", { x: p.c ? p.c[0] : p.r[0] + p.r[2] / 2, y: p.c ? p.c[1] + 4 : p.r[1] + p.r[3] / 2 + 4, "text-anchor": "middle" }, g); t.textContent = p.l; }
      shapes[p.id] = s;
    });
    var seat = sv("path", { d: "M128,212 a22,10 0 0 1 44,0", "class": "ga-p" }, svg); titled(seat, "The drummer's seat (throne)");
    var limbs = {}; [["LH", "L hand", 8], ["RH", "R hand", 228], ["LF", "L foot", 8], ["RF", "R foot", 228]].forEach(function (l, i) {
      var t = sv("text", { x: l[2], y: i < 2 ? 206 : 222, "class": "ga-limb", "text-anchor": i % 2 ? "start" : "start" }, svg); t.textContent = l[1]; limbs[l[0]] = t; });
    var now = sv("text", { x: 150, y: 228, "text-anchor": "middle" }, svg);
    function clear() { Object.keys(shapes).forEach(function (k) { shapes[k].classList.remove("ga-lit"); shapes[k].style.fillOpacity = ""; }); Object.keys(limbs).forEach(function (k) { limbs[k].classList.remove("on"); }); now.textContent = ""; }
    return {
      clear: clear,
      at: function (rec, prev, pos) {
        clear(); var hits = recent(rec, prev, pos, "drums"), words = [];
        hits.forEach(function (h) {
          (PIECE[h.e.piece] || []).forEach(function (id) { var s = shapes[id]; if (!s) return; s.classList.add("ga-lit"); s.style.fillOpacity = Math.max(+s.style.fillOpacity || 0, 0.25 + 0.75 * h.k); });
          if (PIECE[h.e.piece] && PIECE[h.e.piece].length) { limbs[LIMB[h.e.piece] || "RH"].classList.add("on"); if (h.k > 0.6) words.push(WORD[h.e.piece] || ""); }
        });
        now.textContent = words.filter(Boolean).join(", ");
      }
    };
  }

  // ---- the congas from above ----
  var DRUM = { conga: [84, 92, 52], tumba: [214, 96, 58] };
  var STROKE = { B: "bass", O: "open", S: "slap", M: "muffled", H: "heel", T: "toe" };
  // where on the head (from the drum's centre, the player below): bass in the middle; the rest at the near edge, the heel a little further in
  var SPOT = { B: [0, 0.05], O: [0, 0.72], S: [0, 0.62], M: [0, 0.68], H: [0, 0.5], T: [0, 0.78] };
  function congas(host) {
    var svg = sv("svg", { viewBox: "0 0 300 210", role: "img", "aria-label": "A conga and a tumba from above; each stroke is drawn where the hand plays it" }, host);
    titled(svg, "Congas from above, the player at the bottom");
    Object.keys(DRUM).forEach(function (k) {
      var d = DRUM[k], g = titled(sv("g", {}, svg), k === "conga" ? "Conga: the higher drum, on the left" : "Tumba: the lower drum, on the right");
      sv("circle", { cx: d[0], cy: d[1], r: d[2] + 4, "class": "ga-p" }, g); sv("circle", { cx: d[0], cy: d[1], r: d[2], "class": "ga-p", fill: "var(--site-surface)" }, g);
      sv("circle", { cx: d[0], cy: d[1], r: d[2] * 0.35, fill: "none", stroke: "var(--site-border)", "stroke-dasharray": "3 3" }, g);
      var t = sv("text", { x: d[0], y: d[1] - d[2] - 10, "text-anchor": "middle" }, g); t.textContent = k;
    });
    var key = sv("text", { x: 150, y: 204, "text-anchor": "middle" }, svg);
    [["R hand ", ""], ["●", "ga-R"], ["   L hand ", ""], ["●", "ga-L"]].forEach(function (k) { var t = sv("tspan", k[1] ? { "class": k[1] } : {}, key); t.textContent = k[0]; });
    var hands = sv("g", {}, svg), now = sv("text", { x: 150, y: 188, "text-anchor": "middle", "class": "ga-limb on" }, svg);
    function clear() { while (hands.firstChild) hands.removeChild(hands.firstChild); now.textContent = ""; }
    return {
      clear: clear,
      at: function (rec, prev, pos) {
        clear(); var words = [];
        recent(rec, prev, pos, "congas").forEach(function (h) {
          var e = h.e, d = DRUM[/^tumba/.test(e.piece) ? "tumba" : "conga"], st = e.stroke || (/Bass/.test(e.piece) ? "B" : /Slap/.test(e.piece) ? "S" : /Mute/.test(e.piece) ? "M" : "O");
          var hand = e.hand === "L" ? "L" : "R", sp = SPOT[st] || SPOT.O, x = d[0] + (hand === "L" ? -0.3 : 0.3) * d[2] + sp[0], y = d[1] + sp[1] * d[2];
          var g = sv("g", { opacity: (0.3 + 0.7 * h.k).toFixed(2) }, hands);
          sv("ellipse", { cx: x, cy: y, rx: st === "B" ? 16 : 13, ry: st === "B" ? 18 : 11, "class": "ga-hand ga-" + hand }, g);
          var t = sv("text", { x: x, y: y + 4, "text-anchor": "middle", "class": "ga-hand-t" }, g); t.textContent = st;
          if (h.k > 0.6) words.push(hand + " " + STROKE[st]);
        });
        now.textContent = words.join(", ");
      }
    };
  }

  function create(host, kind) {
    style(); var box = document.createElement("div"); box.className = "ga"; host.appendChild(box);
    var a = kind === "congas" ? congas(box) : kit(box), cap = document.createElement("div"); cap.className = "ga-cap";
    cap.textContent = kind === "congas" ? "From above. Each stroke lights where it is played (B bass, O open, S slap, M muffled, H heel, T toe)." : "From above. Each piece lights as it is hit, and the limb that usually plays it.";
    box.appendChild(cap); a.el = box; return a;
  }
  global.LessonGrooveAnim = { create: create };
})(window);
