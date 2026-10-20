// gear-diagrams.js — connectors, cables and panels for the Gear lessons (LessonGear). House style: DIAGRAMS.md beside this file.
//
//   <div class="gear-fig" data-fig="connectors"></div>     the connector gallery: one card per plug, end-on or side view, with what it carries
//        data-only="ts trs xlr-m"  (optional) just those cards, in that order. Card names: ts trs mini trrs xlr-m xlr-f rca speakon
//        din5 usb-a usb-b usb-c usb-micro iec
//   <div class="gear-fig" data-fig="jack-wiring"></div>    TS and TRS cut open: which contact carries what (hot, cold, ground; left, right)
//   <div class="gear-fig" data-fig="xlr-pins"></div>       XLR male and female faces, pins 1 2 3 coloured ground, hot, cold
//   <div class="gear-fig" data-fig="balanced"></div>       why a balanced cable cancels hum: the signal twice, one flipped, noise on both
//   <div class="gear-fig" data-fig="signal-flow"></div>    instrument to speakers, each cable marked with its level
//   <div class="gear-fig" data-fig="keyboard-panel"></div> a stage keyboard's back panel, every socket labelled
//   <div class="gear-fig" data-fig="midi-chain"></div>     MIDI OUT to MIDI IN (the arrow), and USB to a computer
//   <div class="gear-row"> ... </div>                      lays several figures side by side (wraps on a phone)
//   data-caption="..." on a figure replaces its caption.
//
// Colours are roles, not decoration (DIAGRAMS.md): --gd-hot signal / hot / tip, --gd-cold cold / ring, --gd-gnd ground / shield / sleeve,
// --gd-power mains, --gd-data MIDI and USB. Every named part has an SVG <title> (hover, screen readers).
// Sources: XLR pins 1 shield, 2 hot, 3 cold (AES14 / IEC 60268-12); TRRS CTIA order tip L, ring R, ring ground, sleeve mic;
// MIDI 1.0 Electrical Spec: pins 4 and 5 the current loop, 2 the shield (grounded at the OUT end only), 1 and 3 unused.
//   Hand drums (side views, every part named on hover): congas (quinto, conga, tumba) | bongos | djembe (and its head from above) | tabla
//   Microphones: polar-patterns (four, in dB) | mic-response (vocal dynamic vs condenser) | proximity (a cardioid at 2-50 cm) |
//        off-axis (a cardioid at 0, 90, 135°, by frequency) | cupping (held vs cupped, with a wedge behind) |
//        speaker-zones (cap, cap edge, cone, edge) | amp-miking (close, angled, room) | vocal-setup (pop filter, the air jet, the mic above). Curves are models; see beside them.
// Self-contained: no other script is needed.
(function (global) {
  "use strict";

  // ---- little helpers ----
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function part(title, inner) { return '<g class="gd-part"><title>' + esc(title) + '</title>' + inner + '</g>'; }
  function txt(x, y, s, cls, anchor) { return '<text x="' + x + '" y="' + y + '"' + (cls ? ' class="' + cls + '"' : '') + ' text-anchor="' + (anchor || "middle") + '">' + esc(s) + '</text>'; }
  function rect(x, y, w, h, cls, rx) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"' + (rx ? ' rx="' + rx + '"' : '') + ' class="' + cls + '"/>'; }
  function circ(x, y, r, cls) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" class="' + cls + '"/>'; }
  function path(d, cls) { return '<path d="' + d + '" class="' + cls + '"/>'; }
  function svg(w, h, label, body) {
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(label) + '"><title>' + esc(label) + '</title>' + body + '</svg>';
  }
  function arrowHead(x, y, dir, cls) {              // a filled triangle pointing right (dir 1) or left (-1) or down (2)
    if (dir === 2) return path("M" + (x - 5) + "," + (y - 8) + " L" + (x + 5) + "," + (y - 8) + " L" + x + "," + y + " Z", cls);
    return path("M" + (x - 8 * dir) + "," + (y - 5) + " L" + x + "," + y + " L" + (x - 8 * dir) + "," + (y + 5) + " Z", cls);
  }

  // ---- plugs, side view ----
  // A jack plug lying left to right, tip at x0 on centre line y. kind ts | trs | trrs; s = scale (1 = 1/4", 0.62 = 3.5 mm);
  // roles = colour the contacts by what they carry (the wiring figure) instead of plain metal.
  var JACKS = {
    ts:   [["tip", 22, "Tip: the signal", "hot"], ["ins", 6], ["sleeve", 90, "Sleeve: ground, and the cable's shield", "gnd"]],
    trs:  [["tip", 18, "Tip: hot (+) in a balanced cable; left in a stereo one", "hot"], ["ins", 5],
           ["ring", 15, "Ring: cold (−) in a balanced cable; right in a stereo one", "cold"], ["ins", 5],
           ["sleeve", 75, "Sleeve: ground and shield", "gnd"]],
    trrs: [["tip", 16, "Tip: left", "hot"], ["ins", 4], ["ring", 12, "Ring 1: right", "cold"], ["ins", 4],
           ["ring", 12, "Ring 2: ground (CTIA, the usual order)", "gnd"], ["ins", 4], ["sleeve", 66, "Sleeve: microphone", "hot"]]
  };
  function jackSide(kind, x0, y, s, roles) {
    var r = 9 * s, x = x0, o = "", segs = JACKS[kind], mids = [];
    segs.forEach(function (g, i) {
      var len = g[1] * s, cls = g[0] === "ins" ? "gd-ins" : roles ? "gd-f-" + g[3] : "gd-metal";
      var shape = i === 0
        ? path("M" + (x + len) + "," + (y - r) + " L" + (x + r * 0.9) + "," + (y - r) + " Q" + x + "," + (y - r) + " " + x + "," + y +
               " Q" + x + "," + (y + r) + " " + (x + r * 0.9) + "," + (y + r) + " L" + (x + len) + "," + (y + r) + " Z", cls)
        : rect(x, y - r, len, 2 * r, cls);
      o += g[2] ? part(g[2], shape) : shape;
      if (g[2]) mids.push({ x: x + len / 2, role: g[3], title: g[2] });
      x += len;
    });
    var hl = 70 * s, hh = 15 * s;
    o += part("Body (the handle)", rect(x, y - hh, hl, 2 * hh, "gd-body", 4 * s));
    o += path("M" + (x + hl) + "," + (y - 6 * s) + " L" + (x + hl + 16 * s) + "," + (y - 4 * s) + " L" + (x + hl + 34 * s) + "," + (y - 4 * s) +
              " L" + (x + hl + 34 * s) + "," + (y + 4 * s) + " L" + (x + hl + 16 * s) + "," + (y + 4 * s) + " L" + (x + hl) + "," + (y + 6 * s) + " Z", "gd-body");
    return { svg: o, mids: mids, end: x + hl + 34 * s };
  }
  function rcaSide(x0, y) {
    var o = "";
    o += part("Pin: the signal", rect(x0, y - 3, 26, 6, "gd-metal", 2));
    o += part("Shell: ground (split so it grips)", rect(x0 + 12, y - 11, 34, 22, "gd-metal") +
              path("M" + (x0 + 12) + "," + (y - 4) + " h14 M" + (x0 + 12) + "," + (y + 4) + " h14", "gd-ln gd-thin"));
    o += part("Body", rect(x0 + 46, y - 14, 70, 28, "gd-body", 4));
    o += rect(x0 + 116, y - 4, 34, 8, "gd-body");
    return o;
  }

  // ---- faces, end-on ----
  // XLR, looking at the contacts. Pins 1 and 2 sit high, 3 low; a female face is the mirror of a male one.
  var XLR_PINS = { 1: ["Pin 1: ground and shield", "gnd"], 2: ["Pin 2: hot (+)", "hot"], 3: ["Pin 3: cold (−)", "cold"] };
  function xlrFace(cx, cy, R, male) {
    var k = R / 44, o = "";
    o += part(male ? "Shell" : "Shell, with the latch that locks it in", circ(cx, cy, R, "gd-body"));
    o += circ(cx, cy, 36 * k, "gd-face");
    o += male ? part("Key slot: it only goes in one way up", rect(cx - 5 * k, cy - 37 * k, 10 * k, 9 * k, "gd-slot"))
              : part("Latch: press to release", rect(cx - 6 * k, cy - R - 7 * k, 12 * k, 10 * k, "gd-metal", 2));
    var side = male ? 1 : -1;
    [[1, -15 * side, -6], [2, 15 * side, -6], [3, 0, 17]].forEach(function (p) {
      var x = cx + p[1] * k, y = cy + p[2] * k, info = XLR_PINS[p[0]];
      var dot = male ? circ(x, y, 6.5 * k, "gd-metal gd-s-" + info[1] + " gd-thick")
                     : circ(x, y, 7.5 * k, "gd-face gd-s-" + info[1] + " gd-thick") + circ(x, y, 3.5 * k, "gd-hole");
      o += part(info[0], dot);
      o += p[0] === 3 ? txt(x + 11 * k, y + 4, 3, "gd-b gd-num", "start") : txt(x, y - 12 * k, p[0], "gd-b gd-num");
    });
    return o;
  }
  // 5-pin DIN socket (as on a panel), front: key notch at the top, pins on an arc, 3 5 2 4 1 from left to right.
  var DIN_PINS = { 1: ["Pin 1: not used", "off"], 2: ["Pin 2: shield (grounded at the OUT end only)", "gnd"], 3: ["Pin 3: not used", "off"],
                   4: ["Pin 4: data (one side of the current loop)", "data"], 5: ["Pin 5: data (the other side)", "data"] };
  function dinFace(cx, cy, R, numbers) {
    var k = R / 44, o = "";
    o += part("Socket shell", circ(cx, cy, R, "gd-body"));
    o += circ(cx, cy, 36 * k, "gd-face");
    o += part("Key notch: the plug goes in one way up", rect(cx - 5 * k, cy - 37 * k, 10 * k, 10 * k, "gd-slot"));
    [3, 5, 2, 4, 1].forEach(function (n, i) {
      var a = Math.PI * (1 - i / 4), x = cx + Math.cos(a) * 20 * k, y = cy - 2 * k + Math.sin(a) * 20 * k;
      var info = DIN_PINS[n];
      o += part(info[0], circ(x, y, 5 * k, "gd-face gd-thick gd-s-" + info[1]) + circ(x, y, 2.3 * k, info[1] === "off" ? "gd-hole-soft" : "gd-hole"));
      if (numbers) o += txt(cx + Math.cos(a) * 30 * k, cy - 2 * k + Math.sin(a) * 30 * k + 4, n, "gd-num");
    });
    return o;
  }
  function speakonFace(cx, cy) {
    var o = part("speakON: locks with a quarter turn; carries speaker level only", circ(cx, cy, 44, "gd-body"));
    o += circ(cx, cy, 33, "gd-face");
    [0, 120, 240].forEach(function (d) {
      var a = (d - 90) * Math.PI / 180;
      o += rect(cx + Math.cos(a) * 38 - 4, cy + Math.sin(a) * 38 - 4, 8, 8, "gd-slot");
    });
    o += part("1+: from the amp's + terminal", rect(cx - 22, cy - 6, 14, 12, "gd-f-hot", 2)) + txt(cx - 15, cy + 22, "1+", "gd-num");
    o += part("1−: from the amp's − terminal", rect(cx + 8, cy - 6, 14, 12, "gd-f-cold", 2)) + txt(cx + 15, cy + 22, "1−", "gd-num");
    return o;
  }
  function usbFace(kind, cx, cy) {
    if (kind === "usb-a") return part("USB-A: the computer or charger end", rect(cx - 42, cy - 16, 84, 32, "gd-body", 2)) +
      part("Tongue with the contacts", rect(cx - 33, cy - 10, 66, 11, "gd-f-data"));
    if (kind === "usb-b") return part("USB-B: the instrument or interface end", path("M" + (cx - 22) + "," + (cy + 20) + " V" + (cy - 10) + " L" + (cx - 12) + "," + (cy - 20) +
      " H" + (cx + 12) + " L" + (cx + 22) + "," + (cy - 10) + " V" + (cy + 20) + " Z", "gd-body")) +
      part("Tongue with the contacts", rect(cx - 10, cy - 8, 20, 16, "gd-f-data"));
    if (kind === "usb-c") return part("USB-C: either way up", rect(cx - 38, cy - 14, 76, 28, "gd-body", 14)) +
      part("Tongue, contacts on both sides", rect(cx - 25, cy - 4, 50, 8, "gd-f-data", 3));
    return part("Micro-USB: one way up, wider side up", path("M" + (cx - 34) + "," + (cy - 10) + " H" + (cx + 34) + " L" + (cx + 26) + "," + (cy + 10) +
      " H" + (cx - 26) + " Z", "gd-body")) + part("Contacts", rect(cx - 20, cy - 5, 40, 5, "gd-f-data"));
  }
  // IEC C14: the inlet on the gear (the kettle lead's C13 end plugs onto it). Earth in the middle, live and neutral either side.
  function iecFace(cx, cy) {
    var o = part("IEC C14 inlet: mains in. The kettle lead (C13) only fits one way", path("M" + (cx - 26) + "," + (cy - 26) + " H" + (cx + 26) +
      " L" + (cx + 40) + "," + (cy - 12) + " V" + (cy + 26) + " H" + (cx - 40) + " V" + (cy - 12) + " Z", "gd-body"));
    o += part("Earth: the safety ground. Never cut it off or tape it over", rect(cx - 3, cy - 18, 6, 18, "gd-f-gnd"));
    o += part("Live", rect(cx - 25, cy + 2, 6, 16, "gd-f-power")) + part("Neutral", rect(cx + 19, cy + 2, 6, 16, "gd-f-power"));
    return o;
  }

  // ---- the gallery ----
  var CARDS = {
    "ts":        ["1/4\" TS", "audio", "Guitar and instrument cables. Unbalanced.", function () { return jackSide("ts", 12, 55, 1, false).svg; }],
    "trs":       ["1/4\" TRS", "audio", "Balanced mono (keyboard to mixer, monitors) or stereo (headphones).", function () { return jackSide("trs", 12, 55, 1, false).svg; }],
    "mini":      ["3.5 mm TRS", "audio", "Phones, laptops, small headphones. Stereo.", function () { return jackSide("trs", 40, 55, 0.62, false).svg; }],
    "trrs":      ["3.5 mm TRRS", "audio", "Headsets: stereo plus a microphone.", function () { return jackSide("trrs", 40, 55, 0.62, false).svg; }],
    "xlr-m":     ["XLR male", "audio", "Pins out: the mic, and the cable end that goes into the mixer.", function () { return xlrFace(110, 58, 42, true); }],
    "xlr-f":     ["XLR female", "audio", "Holes, with a latch: the cable end the mic plugs into.", function () { return xlrFace(110, 60, 42, false); }],
    "rca":       ["RCA (phono)", "audio", "Home audio, DJ gear, older keyboards. Unbalanced.", function () { return rcaSide(30, 55); }],
    "speakon":   ["speakON", "speaker", "Amp to passive speaker or cab. Locks; can't go in a signal socket.", function () { return speakonFace(110, 56); }],
    "din5":      ["MIDI (5-pin DIN)", "data", "Notes and controls between instruments. No sound.", function () { return dinFace(110, 56, 44, true); }],
    "usb-a":     ["USB-A", "data", "Computer, charger, hub end.", function () { return usbFace("usb-a", 110, 55); }],
    "usb-b":     ["USB-B", "data", "Keyboards, interfaces, controllers: the instrument end.", function () { return usbFace("usb-b", 110, 55); }],
    "usb-c":     ["USB-C", "data", "Newer gear and laptops. Goes in either way up.", function () { return usbFace("usb-c", 110, 55); }],
    "usb-micro": ["Micro-USB", "data", "Small controllers and older phones.", function () { return usbFace("usb-micro", 110, 55); }],
    "iec":       ["IEC (kettle lead)", "power", "Mains power into amps, mixers, keyboards.", function () { return iecFace(110, 55); }]
  };
  var TAG = { audio: "audio", speaker: "speaker level", data: "data, not sound", power: "mains power" };
  function gallery(box) {
    var only = (box.getAttribute("data-only") || "").split(/\s+/).filter(Boolean);
    var keys = only.length ? only : Object.keys(CARDS);
    box.classList.add("gd-gallery");
    box.innerHTML = keys.filter(function (k) { return CARDS[k]; }).map(function (k) {
      var c = CARDS[k];
      return '<figure class="gd-card"><div class="gd-name">' + esc(c[0]) + ' <span class="gd-tag gd-tag-' + c[1] + '">' + TAG[c[1]] + '</span></div>' +
        svg(220, 110, c[0], c[3]()) + '<figcaption>' + esc(c[2]) + '</figcaption></figure>';
    }).join("");
  }

  // ---- figures ----
  function jackWiring() {
    var o = "";
    [["ts", 52, "TS (unbalanced)"], ["trs", 158, "TRS (balanced or stereo)"]].forEach(function (row) {
      var j = jackSide(row[0], 262, row[1], 1.15, true);
      o += j.svg + txt(262, row[1] - 28, row[2], "gd-b", "start");
      j.mids.forEach(function (m, i) {
        var ly = row[1] - 14 + i * 22 - (j.mids.length - 2) * 8, lab = m.title.split(":")[0];
        var short = { ts: ["signal", "ground / shield"], trs: ["hot (+) · left", "cold (−) · right", "ground / shield"] }[row[0]][i];
        o += path("M" + (m.x) + "," + (row[1] + (ly < row[1] ? -11 : 11)) + " V" + ly + " H200", "gd-ln gd-thin gd-s-" + m.role);
        o += circ(m.x, row[1] + (ly < row[1] ? -11 : 11), 2.5, "gd-f-" + m.role);
        o += part(m.title, txt(196, ly + 4, lab + ": " + short, "gd-lab", "end"));
      });
    });
    return svg(530, 210, "TS and TRS jack plugs: what each contact carries", o);
  }
  function xlrPins() {
    var o = xlrFace(120, 92, 56, true) + xlrFace(360, 98, 56, false);
    o += txt(120, 172, "Male (pins)", "gd-b") + txt(360, 172, "Female (holes)", "gd-b");
    o += txt(240, 196, "1 ground · 2 hot (+) · 3 cold (−)", "gd-lab");
    return svg(480, 206, "XLR faces, male and female, pins numbered", o);
  }
  function wave(x0, y0, w, amp, sign, bump) {          // a sine over w, optionally with a noise bump (same sign on both wires)
    var d = "", n = 40;
    for (var i = 0; i <= n; i++) {
      var t = i / n, y = y0 - sign * amp * Math.sin(t * Math.PI * 4) - (bump ? 13 * Math.exp(-Math.pow((t - 0.5) / 0.07, 2)) : 0);
      d += (i ? " L" : "M") + (x0 + t * w).toFixed(1) + "," + y.toFixed(1);
    }
    return d;
  }
  function balanced() {
    var o = "";
    o += part("The source: sends the signal twice, once flipped", rect(8, 50, 70, 110, "gd-body", 6)) + txt(43, 110, "source", "gd-lab");
    o += part("Hot wire: the signal", path("M78,78 H372", "gd-ln gd-wire gd-s-hot")) + txt(84, 70, "hot (+)", "gd-lab", "start");
    o += part("Cold wire: the same signal upside down", path("M78,134 H372", "gd-ln gd-wire gd-s-cold")) + txt(84, 156, "cold (−)", "gd-lab", "start");
    o += path(wave(100, 46, 70, 10, 1, false), "gd-ln gd-s-hot") + path(wave(100, 110, 70, 10, -1, false), "gd-ln gd-s-cold");
    o += part("Hum from a mains lead nearby: it lands the same on both wires",
      path("M215,8 L205,30 L216,30 L204,56", "gd-ln gd-s-power gd-thick") + path("M215,72 L205,94 L216,94 L204,120", "gd-ln gd-s-power gd-thick")) +
      txt(226, 22, "hum", "gd-lab", "start");
    o += path(wave(262, 46, 80, 10, 1, true), "gd-ln gd-s-hot") + path(wave(262, 110, 80, 10, -1, true), "gd-ln gd-s-cold");
    o += txt(302, 172, "same noise on both", "gd-sm");
    o += part("The input flips the cold wire back and adds the two: the signal doubles, the noise cancels", rect(372, 50, 100, 110, "gd-body", 6));
    o += txt(422, 98, "input:", "gd-lab") + txt(422, 114, "flip cold,", "gd-lab") + txt(422, 130, "add", "gd-lab");
    o += path(wave(382, 194, 80, 14, 1, false), "gd-ln gd-s-hot gd-thick") + txt(474, 228, "signal ×2, hum gone", "gd-sm", "end");
    return svg(480, 236, "Balanced cable: the signal twice, one copy flipped; noise lands on both and cancels at the input", o);
  }
  function signalFlow() {
    var B = [["instrument", "Guitar, bass or keyboard"], ["pedals", "Effects pedals (optional)", true], ["DI or amp", "A DI box makes a balanced mic-level signal for a long run; an amp plays it on stage"],
             ["mixer", "Mixer: sets each channel's level and sends a line-level mix out"], ["power amp", "Power amplifier (inside a powered speaker)"], ["speakers", "Speakers"]];
    var C = [["instrument", "hot"], ["instrument", "hot"], ["mic (balanced)", "hot"], ["line", "hot"], ["speaker", "hot"]];
    var X = [8, 188, 368], o = "", W = 104;
    B.forEach(function (b, i) {
      var x = X[i % 3], y = i < 3 ? 22 : 152;
      o += part(b[1], rect(x, y, W, 46, "gd-body" + (b[2] ? " gd-dash" : ""), 6)) + txt(x + W / 2, y + 28, b[0], "gd-lab gd-b");
    });
    [0, 1, 3, 4].forEach(function (i) {
      var x1 = X[i % 3] + W, x2 = X[(i + 1) % 3] - 2, y = i < 3 ? 45 : 175;
      o += path("M" + x1 + "," + y + " H" + (x2 - 6), "gd-ln gd-wire gd-s-" + C[i][1]) + arrowHead(x2, y, 1, "gd-f-" + C[i][1]);
      o += txt((x1 + x2) / 2, y - 8, C[i][0], "gd-sm");
    });
    o += path("M420,68 V108 H60 V144", "gd-ln gd-wire gd-s-hot") + arrowHead(60, 150, 2, "gd-f-hot");
    o += txt(240, 101, C[2][0], "gd-sm");
    return svg(480, 214, "Signal flow from instrument to speakers, with the level on each cable", o);
  }
  function jackHole(cx, cy, role, title) { return part(title, circ(cx, cy, 11, "gd-body gd-thick gd-s-" + role) + circ(cx, cy, 5, "gd-hole")); }
  function keyboardPanel() {
    var S = [
      ["PHONES", "jack", "hot", "Headphones (1/4\" TRS, stereo). Often mutes the speakers"],
      ["L/MONO", "jack", "hot", "Output left, or the whole sound mixed to mono when R is empty"],
      ["R", "jack", "hot", "Output right (stereo only)"],
      ["SUSTAIN", "jack", "ink", "Sustain pedal. Plug it in before switching on"],
      ["EXP", "jack", "ink", "Expression pedal (TRS): volume or another control"],
      ["IN", "midi", "data", "MIDI IN: notes from another instrument's OUT"],
      ["OUT", "midi", "data", "MIDI OUT: this keyboard's notes, to another's IN"],
      ["USB", "usb", "data", "USB to host (USB-B): MIDI, sometimes audio, to a computer"],
      ["DC IN", "dc", "power", "Power: only the keyboard's own adaptor (voltage and polarity matter)"]
    ];
    var o = rect(6, 26, 468, 112, "gd-face", 8), sp = 51.5;
    S.forEach(function (s, i) {
      var cx = 32 + i * sp, cy = 74;
      if (s[1] === "jack") o += jackHole(cx, cy, s[2], s[3]);
      else if (s[1] === "midi") o += part(s[3], dinFace(cx, cy, 17, false).replace(/<title>[^<]*<\/title>/g, ""));
      else if (s[1] === "usb") o += part(s[3], path("M" + (cx - 10) + "," + (cy + 10) + " V" + (cy - 5) + " L" + (cx - 5) + "," + (cy - 10) + " H" + (cx + 5) +
        " L" + (cx + 10) + "," + (cy - 5) + " V" + (cy + 10) + " Z", "gd-body gd-thick gd-s-data") + rect(cx - 5, cy - 4, 10, 8, "gd-f-data"));
      else o += part(s[3], circ(cx, cy, 11, "gd-body gd-thick gd-s-power") + circ(cx, cy, 6, "gd-hole") + circ(cx, cy, 2, "gd-metal"));
      o += txt(cx, 116, s[0], "gd-sm");
    });
    [["OUTPUT", 1, 2], ["PEDAL", 3, 4], ["MIDI", 5, 6]].forEach(function (g) {
      var a = 32 + g[1] * sp - 14, b = 32 + g[2] * sp + 14;
      o += path("M" + a + ",48 V42 H" + b + " V48", "gd-ln gd-thin") + txt((a + b) / 2, 36, g[0], "gd-sm");
    });
    return svg(480, 148, "The back panel of a stage keyboard, every socket labelled", o);
  }
  function midiChain() {
    var o = "";
    o += part("A keyboard: plays the notes", rect(8, 14, 150, 58, "gd-body", 6)) + txt(83, 38, "keyboard", "gd-lab gd-b");
    o += part("Sound module (or a second keyboard): makes the sound", rect(322, 14, 150, 58, "gd-body", 6)) + txt(397, 38, "sound module", "gd-lab gd-b");
    o += txt(132, 64, "OUT", "gd-sm") + txt(348, 64, "IN", "gd-sm");
    o += part("MIDI cable: notes travel from OUT to IN", path("M150,44 C210,44 220,44 316,44", "gd-ln gd-wire gd-s-data") + arrowHead(322, 44, 1, "gd-f-data"));
    o += txt(240, 34, "OUT → IN", "gd-lab");
    o += part("The keyboard on a computer", rect(8, 98, 150, 58, "gd-body", 6)) + txt(83, 122, "keyboard", "gd-lab gd-b");
    o += part("Computer: DAW, or the site's Notation page in Chrome", rect(322, 98, 150, 58, "gd-body", 6)) + txt(397, 122, "computer", "gd-lab gd-b");
    o += txt(132, 148, "USB-B", "gd-sm") + txt(348, 148, "USB-A/C", "gd-sm");
    o += part("USB cable: MIDI both ways, and often power", path("M158,128 H322", "gd-ln gd-wire gd-s-data"));
    o += txt(240, 118, "one cable, both ways", "gd-lab");
    return svg(480, 166, "MIDI: OUT to IN with a 5-pin cable, or one USB cable to a computer", o);
  }

  // ---- hand drums (side views; the floor is the bottom line) ----
  // Sizes are the usual ones (head diameters): quinto 11", conga 11.75", tumba 12.5" (LP and Meinl catalogues);
  // bongos macho 7" + hembra 8.5"; djembe 12-14" head; tabla dayan about 5.5", bayan about 9".
  function line(x1, y1, x2, y2, cls) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" class="' + (cls || "gd-ln gd-thin") + '"/>'; }
  function callout(x, y, tx, s, anchor) { return line(anchor === "end" ? tx + 4 : tx - 4, y, x, y) + txt(tx, y + 4, s, "gd-sm", anchor || "start"); }   // a label at tx with a leader to (x, y)
  function barrel(cx, y0, h, w, belly, foot) {          // a staved conga shell: head width w, widest a third down, narrower at the foot
    var wb = w * belly / 2, wf = w * foot / 2, wt = w / 2, yb = y0 + 0.36 * h, yf = y0 + h;
    return "M" + (cx - wt) + "," + y0 + " C" + (cx - wb) + "," + (y0 + 0.15 * h) + " " + (cx - wb) + "," + yb + " " + (cx - wb * 0.98) + "," + (yb + 0.05 * h) +
      " S" + (cx - wf) + "," + (yf - 0.2 * h) + " " + (cx - wf) + "," + yf + " L" + (cx + wf) + "," + yf +
      " C" + (cx + wf) + "," + (yf - 0.2 * h) + " " + (cx + wb * 0.98) + "," + (yb + 0.25 * h) + " " + (cx + wb * 0.98) + "," + (yb + 0.05 * h) +
      " C" + (cx + wb) + "," + yb + " " + (cx + wb) + "," + (y0 + 0.15 * h) + " " + (cx + wt) + "," + y0 + " Z";
  }
  function headHoop(cx, y, w, what) {                   // the head (a thin line of skin) under a metal hoop, seen from the side
    return part("Head: " + what, rect(cx - w / 2, y - 3, w, 3, "gd-face")) + part("Hoop (rim): holds the head down; tightening the lugs pulls it lower", rect(cx - w / 2 - 4, y - 1, w + 8, 8, "gd-metal", 2));
  }
  function congaDrum(cx, w, name, size) {
    var y0 = 48, h = 172, o = "";
    o += part(name + " shell: wooden or fibreglass staves, open at the bottom", path(barrel(cx, y0, h, w, 1.16, 0.8), "gd-body"));
    [-w / 6, 0, w / 6].forEach(function (dx) { o += line(cx + dx, y0 + 10, cx + dx * 0.85, y0 + h - 6, "gd-ln gd-thin gd-s-off"); });
    o += part("Foot ring: protects the bottom edge", rect(cx - w * 0.4 - 2, y0 + h - 8, w * 0.8 + 4, 8, "gd-metal", 1));
    [-1, 1].forEach(function (s) { o += part("Lug and tuning bolt: turn to tighten the head (raises the pitch)", rect(cx + s * (w / 2 + 3) - 3, y0 + 4, 6, 34, "gd-metal", 2)); });
    o += headHoop(cx, y0, w, "rawhide or plastic; the hands play on it");
    return o + txt(cx, 244, name, "gd-b") + txt(cx, 258, size, "gd-sm");
  }
  function congas() {
    var o = congaDrum(150, 56, "quinto", "11\" head, highest") + congaDrum(270, 60, "conga", "11¾\" head") + congaDrum(395, 66, "tumba", "12½\" head, lowest");
    o += callout(122, 40, 80, "head", "end") + callout(120, 64, 80, "lug", "end") + callout(122, 130, 80, "shell", "end") + callout(128, 214, 80, "foot ring", "end");
    o += line(40, 220, 470, 220, "gd-ln gd-thin gd-s-off");
    return svg(480, 264, "Congas from the side: quinto, conga and tumba, with head, hoop, lugs, shell and foot ring", o);
  }
  function bongoDrum(cx, w, h, name, size, title) {
    var y0 = 56, wf = w * 0.84, o = "";
    o += part(title, path("M" + (cx - w / 2) + "," + y0 + " L" + (cx - wf / 2) + "," + (y0 + h) + " L" + (cx + wf / 2) + "," + (y0 + h) + " L" + (cx + w / 2) + "," + y0 + " Z", "gd-body"));
    o += part("Bottom ring: the shell is open underneath", rect(cx - wf / 2 - 1, y0 + h - 6, wf + 2, 6, "gd-metal", 1));
    [-1, 1].forEach(function (s) { o += part("Tuning rod: runs from the hoop to a bracket; a bongo key turns its nut", line(cx + s * (w / 2 + 3), y0 + 4, cx + s * (wf / 2 + 3), y0 + h - 14, "gd-ln gd-thick") + rect(cx + s * (wf / 2 + 3) - 4, y0 + h - 18, 8, 6, "gd-metal", 1)); });
    o += headHoop(cx, y0, w, "thin; played with the fingers near the edge");
    return o + txt(cx, y0 + h + 22, name, "gd-b") + txt(cx, y0 + h + 36, size, "gd-sm");
  }
  function bongos() {
    var o = part("Centre block: the bridge that joins the two drums; it sits between the knees", rect(160, 74, 90, 20, "gd-body", 3));
    o += bongoDrum(118, 74, 76, "macho", "7\", higher", "Macho: the small drum, on the left knee for a right-handed player") +
         bongoDrum(300, 94, 76, "hembra", "8½\", lower", "Hembra: the large drum, on the right knee");
    o += txt(205, 112, "block", "gd-sm") + txt(118, 36, "left knee", "gd-sm") + txt(300, 36, "right knee", "gd-sm");
    return svg(420, 186, "Bongos from the player's side: the small macho on the left, the larger hembra on the right, joined by a centre block", o);
  }
  function djembe() {
    var cx = 110, o = "";
    var shell = "M" + (cx - 62) + ",44 C" + (cx - 64) + ",96 " + (cx - 26) + ",120 " + (cx - 22) + ",150 C" + (cx - 20) + ",180 " + (cx - 48) + ",208 " + (cx - 48) + ",232" +
      " L" + (cx + 48) + ",232 C" + (cx + 48) + ",208 " + (cx + 20) + ",180 " + (cx + 22) + ",150 C" + (cx + 26) + ",120 " + (cx + 64) + ",96 " + (cx + 62) + ",44 Z";
    o += part("Shell: carved from one piece of hardwood. Bowl on top, a narrow throat, an open foot", path(shell, "gd-body"));
    var zig = []; for (var i = 0; i <= 12; i++) zig.push((cx - 58 + i * 116 / 12) + "," + (i % 2 ? 94 : 52));
    o += part("Ropes (the verticals): woven between the rings; twisting them tighter (the 'Mali weave') pulls the top ring down and raises the pitch", '<polyline points="' + zig.join(" ") + '" class="gd-ln gd-thin"/>');
    o += part("Top ring: an iron ring that holds the skin over the bowl", rect(cx - 66, 44, 132, 7, "gd-metal", 2));
    o += part("Bottom ring: the ropes are tied to it, round the bowl below its widest point", rect(cx - 56, 92, 112, 6, "gd-metal", 2));
    o += part("Head: goatskin, shaved; the edge of the skin hangs over the top ring", rect(cx - 62, 38, 124, 5, "gd-face") + path("M" + (cx - 66) + ",44 l-5,8 M" + (cx + 66) + ",44 l5,8", "gd-ln gd-thin"));
    o += callout(cx + 62, 30, 192, "goatskin head") + callout(cx + 68, 50, 192, "top ring") + callout(cx + 50, 72, 192, "ropes") + callout(cx + 56, 95, 192, "bottom ring") +
         callout(cx + 22, 150, 192, "throat") + callout(cx + 44, 222, 192, "foot (open)");
    var hx = 395, hy = 120;
    o += part("Bass tone: the flat palm in the middle of the head; the whole drum booms", circ(hx, hy, 66, "gd-face") + circ(hx, hy, 30, "gd-f-hot"));
    o += part("Tone and slap: at the edge. Tone: fingers flat and together, the palm's root on the rim. Slap: the same spot, the fingers loose, snapping", '<circle cx="' + hx + '" cy="' + hy + '" r="56" class="gd-ln gd-dash gd-s-cold" style="stroke-width:16;stroke-opacity:.45"/>');
    o += txt(hx, hy + 4, "bass", "gd-b") + txt(hx, hy - 46, "tone, slap", "gd-sm") + txt(hx, 208, "the head from above", "gd-sm");
    return svg(480, 250, "A djembe from the side, with its rope tuning, and its head from above: bass in the middle, tone and slap at the edge", o);
  }
  function tabla() {
    var o = "", bx = 130, dx = 360;
    // bayan: a metal kettle, the left hand
    o += part("Bayan: the bass drum, a metal (copper or brass) kettle, played by the left hand", path("M" + (bx - 62) + ",82 C" + (bx - 92) + ",110 " + (bx - 92) + ",170 " + (bx - 48) + ",204 L" + (bx + 48) + ",204 C" + (bx + 92) + ",170 " + (bx + 92) + ",110 " + (bx + 62) + ",82 Z", "gd-body"));
    var bz = []; for (var i = 0; i <= 10; i++) bz.push((bx - 56 + i * 11.2) + "," + (i % 2 ? 196 : 86));
    o += part("Straps (baddhi): leather laced from the head's rim to a ring underneath; they hold the head on", '<polyline points="' + bz.join(" ") + '" class="gd-ln gd-thin gd-s-off"/>');
    o += part("Gajra: the braided leather rim of the head", rect(bx - 66, 76, 132, 8, "gd-metal", 3));
    // dayan: a wooden drum, the right hand
    o += part("Dayan: the treble drum, carved from one block of wood, played by the right hand; tuned to the key of the music", path("M" + (dx - 40) + ",52 C" + (dx - 48) + ",100 " + (dx - 48) + ",160 " + (dx - 42) + ",204 L" + (dx + 42) + ",204 C" + (dx + 48) + ",160 " + (dx + 48) + ",100 " + (dx + 40) + ",52 Z", "gd-body"));
    var dz = []; for (i = 0; i <= 8; i++) dz.push((dx - 38 + i * 9.5) + "," + (i % 2 ? 196 : 56));
    o += part("Straps (baddhi): leather laced from the rim to the bottom ring", '<polyline points="' + dz.join(" ") + '" class="gd-ln gd-thin gd-s-off"/>');
    [-27, -9, 9, 27].forEach(function (k) { o += part("Gatta: a wooden cylinder under the straps; tapped up or down with a hammer to tune the dayan", rect(dx + k - 7, 150, 14, 26, "gd-face", 3)); });
    o += part("Gajra: the braided rim; tapping it with the hammer fine-tunes the pitch", rect(dx - 44, 46, 88, 8, "gd-metal", 3));
    [[bx, 82], [dx, 56]].forEach(function (c) { o += part("Cushion ring: the drums sit on cloth rings, tilted toward the player", path("M" + (c[0] - 46) + ",214 Q" + c[0] + ",204 " + (c[0] + 46) + ",214 L" + (c[0] + 40) + ",222 L" + (c[0] - 40) + ",222 Z", "gd-face")); });
    o += callout(dx - 46, 50, 296, "gajra", "end") + callout(dx - 44, 100, 296, "baddhi", "end") + callout(dx - 34, 163, 296, "gatta", "end");
    o += txt(bx, 240, "bayan · left hand, bass", "gd-b") + txt(dx, 240, "dayan · right hand", "gd-b");
    // the heads from above: the black syahi in the middle of the dayan, off-centre on the bayan
    o += part("Bayan head from above: the syahi sits off-centre, toward the player; the heel of the hand presses near it to bend the pitch", circ(bx, 300, 40, "gd-face") + circ(bx - 4, 312, 15, "gd-ins"));
    o += part("Dayan head from above: the syahi (black spot, a paste of iron filings and flour) in the middle gives the drum its clear pitch", circ(dx, 300, 28, "gd-face") + circ(dx, 300, 22, "gd-ln gd-thin") + circ(dx, 300, 12, "gd-ins"));
    o += txt(bx, 356, "from above: syahi off-centre", "gd-sm") + txt(dx, 356, "syahi in the middle", "gd-sm");
    return svg(480, 366, "Tabla: the metal bayan (left hand) and the wooden dayan (right hand) from the side, and their heads from above with the black syahi", o);
  }

  // ---- microphones: patterns and frequency graphs ----
  // Polar patterns: first-order, r(θ) = A + (1 − A) cos θ (omni A = 1, cardioid 0.5, supercardioid 0.37, figure-8 0), drawn in dB.
  // Proximity: an ideal first-order gradient mic near a point source, |1 + 1/(jkr)| for the gradient part (Eargle, The Microphone Book).
  var MPAT = [["Omni", 1], ["Cardioid", 0.5], ["Supercardioid", 0.37], ["Figure-8", 0]];
  function lobe(cx, cy, R, A, rot, floor) {
    var pts = [];
    for (var a = 0; a <= 360; a += 3) {
      var v = Math.abs(A + (1 - A) * Math.cos(a * Math.PI / 180)), d = 20 * Math.log10(Math.max(v, 1e-4)), r = R * Math.max(0, (d + floor) / floor), t = (a + (rot || 0)) * Math.PI / 180;
      pts.push((cx + r * Math.sin(t)).toFixed(1) + "," + (cy - r * Math.cos(t)).toFixed(1));
    }
    return '<path d="M' + pts.join("L") + 'Z" class="gd-lobe"/>';
  }
  function polarGrid(cx, cy, R) { return circ(cx, cy, R, "gd-grid") + circ(cx, cy, R * 2 / 3, "gd-grid") + circ(cx, cy, R / 3, "gd-grid") + line(cx - R, cy, cx + R, cy, "gd-grid") + line(cx, cy - R, cx, cy + R, "gd-grid"); }
  function polarPatterns() {
    var o = "";
    MPAT.forEach(function (p, i) {
      var cx = 60 + 120 * i, cy = 78, R = 48;
      o += part(p[0] + ": " + ["the same from every direction", "full in front, nothing from straight behind", "narrower in front, a small lobe behind; quietest about 125° off", "front and back (opposite polarity), nothing from the sides"][i], polarGrid(cx, cy, R) + lobe(cx, cy, R, p[1], 0, 30));
      o += path("M" + cx + "," + (cy - R - 12) + " l-4,7 l8,0 Z", "gd-ins");
      if (p[1] === 0) o += txt(cx + 12, cy - 22, "+", "gd-b") + txt(cx + 12, cy + 30, "−", "gd-b");
      o += txt(cx, 150, p[0], "gd-b");
    });
    o += txt(8, 14, "front ▲", "gd-sm", "start") + txt(472, 14, "rings: 0, −10, −20 dB", "gd-sm", "end");
    return svg(480, 160, "Four polar patterns seen from above, the front of the mic at the top: omni, cardioid, supercardioid, figure-8", o);
  }
  // a frequency graph: 20 Hz to 20 kHz across, dB up; curves [{ f: fn(hz) -> dB, cls, label, at }]
  function freqGraph(w, h, lo, hi, curves, label, extra) {
    var L = 34, Rr = w - 10, T = 12, B = h - 26, l0 = Math.log(20), l1 = Math.log(20000);
    function X(f) { return L + (Math.log(f) - l0) / (l1 - l0) * (Rr - L); }
    function Y(d) { return T + (hi - d) / (hi - lo) * (B - T); }
    var o = "";
    [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].forEach(function (f) { o += line(X(f), T, X(f), B, "gd-grid") + txt(X(f), B + 14, f >= 1000 ? f / 1000 + "k" : f, "gd-sm"); });
    for (var d = lo; d <= hi; d += 5) o += line(L, Y(d), Rr, Y(d), d === 0 ? "gd-ln gd-thin gd-s-off" : "gd-grid") + (d % 10 === 0 ? txt(L - 4, Y(d) + 4, (d > 0 ? "+" : "") + d, "gd-sm", "end") : "");
    curves.forEach(function (c) {
      var pts = []; for (var i = 0; i <= 120; i++) { var f = Math.exp(l0 + (l1 - l0) * i / 120), v = Math.max(lo, Math.min(hi, c.f(f))); pts.push(X(f).toFixed(1) + "," + Y(v).toFixed(1)); }
      o += part(c.title || c.label, '<polyline points="' + pts.join(" ") + '" class="' + c.cls + '"/>');
      if (c.label) { var fa = c.at || 1000, va = Math.max(lo, Math.min(hi, c.f(fa))); o += txt(X(fa), Y(va) + (c.dy || -6), c.label, "gd-sm gd-b", c.anchor || "middle"); }
    });
    o += txt(Rr, h - 2, "Hz", "gd-sm", "end") + (extra ? extra(X, Y) : "");
    return svg(w, h, label, o);
  }
  function shelf(f, fc, n) { return 10 * Math.log10(1 / (1 + Math.pow(fc / f, 2 * n))); }          // a high-pass of order n, in dB
  function lowp(f, fc, n) { return 10 * Math.log10(1 / (1 + Math.pow(f / fc, 2 * n))); }
  function bump(f, f0, g, q) { var x = Math.log2(f / f0) * q; return g * Math.exp(-x * x); }
  function micResponse() {
    return freqGraph(480, 220, -20, 10, [
      { f: function (f) { return shelf(f, 90, 1) + bump(f, 5000, 5, 1.1) + lowp(f, 12000, 2); }, cls: "gd-curve gd-s-accent", label: "vocal dynamic", at: 5000, title: "A typical handheld vocal dynamic: bass trimmed (it is meant to be used close, where proximity effect adds it back), a presence peak around 4-6 kHz for words, falling off above 10 kHz" },
      { f: function (f) { return shelf(f, 25, 1) + bump(f, 12000, 3, 1) + lowp(f, 22000, 2); }, cls: "gd-curve gd-dash", label: "condenser", at: 300, dy: -6, title: "A typical studio condenser: flat from 30 Hz, a gentle lift at the top ('air')" }
    ], "Frequency response of a typical vocal dynamic mic and a typical condenser, on axis");
  }
  function proxGraph() {
    var D = [[0.02, "2 cm"], [0.05, "5 cm"], [0.15, "15 cm"], [0.5, "50 cm"]];
    return freqGraph(480, 220, -5, 30, D.map(function (d, i) {
      return { f: function (f) { var kr = 2 * Math.PI * f / 343 * d[0]; return 20 * Math.log10(0.5 + 0.5 * Math.sqrt(1 + 1 / (kr * kr))); },
               cls: "gd-curve" + (i === 0 ? " gd-s-accent" : i === 3 ? " gd-dash" : ""), label: d[1], at: [500, 260, 140, 60][i], anchor: "start", dy: i === 3 ? -6 : -6,
               title: "Cardioid " + d[1] + " from a voice: the bass boost compared with the same mic far away" };
    }), "Proximity effect of a cardioid: bass boost at 2, 5, 15 and 50 cm compared with far away");
  }
  function offAxisGraph() {
    // a cardioid, large diaphragm: the pattern holds at low frequencies and narrows above about c / (π · 25 mm) ≈ 4 kHz
    var A = [[0, "on axis (0°)", "gd-curve gd-s-accent"], [90, "90°", "gd-curve"], [135, "135°", "gd-curve gd-dash"]];
    return freqGraph(480, 220, -30, 5, A.map(function (a) {
      return { f: function (f) { var th = a[0] * Math.PI / 180, p = 0.5 + 0.5 * Math.cos(th), k = Math.pow(f / 4000, 2) * (1 - Math.cos(th)); return 20 * Math.log10(Math.max(p, 0.02)) - 10 * Math.log10(1 + k); },
               cls: a[2], label: a[1], at: a[0] ? 400 : 3000, title: "A large-diaphragm cardioid, " + a[1] + " off axis: quieter, and quieter still in the treble" };
    }), "A cardioid's response on axis, 90° and 135° off axis: off axis it is quieter and duller");
  }
  // the hand round the grille: the rear ports are what make a mic directional; covered, it hears all round, and the hand makes a little cavity
  function handMic(cx, cy, cupped) {
    var o = "";
    o += part("Handle", rect(cx - 9, cy + 14, 18, 62, "gd-body", 4));
    o += part("Grille (the ball): the capsule is inside", circ(cx, cy, 17, "gd-face"));
    if (!cupped) o += part("Rear ports: slots behind the capsule. Sound reaching them from behind cancels sound at the front: that is what makes a cardioid", rect(cx - 13, cy + 9, 6, 4, "gd-ins", 1) + rect(cx + 7, cy + 9, 6, 4, "gd-ins", 1));
    else o += part("The hand closes round the grille: the rear ports are covered, so the mic turns almost omni, and the hollow of the hand adds a boxy, honky resonance", path("M" + (cx - 24) + "," + (cy + 22) + " C" + (cx - 30) + "," + (cy - 2) + " " + (cx - 22) + "," + (cy - 20) + " " + (cx - 8) + "," + (cy - 18) + " L" + (cx - 8) + "," + (cy - 6) + " M" + (cx + 24) + "," + (cy + 22) + " C" + (cx + 30) + "," + (cy - 2) + " " + (cx + 22) + "," + (cy - 20) + " " + (cx + 8) + "," + (cy - 18) + " L" + (cx + 8) + "," + (cy - 6), "gd-hand"));
    return o;
  }
  function cupping() {
    var o = "";
    [[120, false, "held by the handle"], [360, true, "cupped"]].forEach(function (p) {
      var cx = p[0], cy = 90, A = p[1] ? 0.85 : 0.5;
      o += part(p[1] ? "Cupped: nearly omni, so the wedge behind is heard" : "Cardioid: the wedge sits in the dead spot behind the mic", lobe(cx, cy, 62, A, 0, 30));
      o += handMic(cx, cy, p[1]);
      o += part("Wedge monitor on the floor, pointing back at the singer (and the mic)", path("M" + (cx - 34) + ",186 L" + (cx + 34) + ",186 L" + (cx + 24) + ",168 L" + (cx - 24) + ",168 Z", "gd-body"));
      o += txt(cx, 22, "singer ▼", "gd-sm") + txt(cx, 206, "wedge", "gd-sm") + txt(cx, 238, p[2], "gd-b");
      o += txt(cx, 254, p[1] ? "almost omni: the wedge feeds back" : "the wedge is in the dead spot", p[1] ? "gd-sm gd-warn" : "gd-sm");
    });
    return svg(480, 262, "A handheld cardioid held by its handle and cupped: cupping covers the rear ports and the pattern becomes almost omni", o);
  }

  // ---- miking a guitar amp and a voice ----
  // Speaker zones and their sound: the common engineering description (cap bright, cone darker), as on rec-kit-mic's ampmic.
  function smallMic(x, y, rot, label, cls) {           // a side-view mic, the grille at (x, y), pointing along rot (degrees, 0 = left)
    return part(label, '<g transform="translate(' + x + ',' + y + ') rotate(' + rot + ')">' + rect(0, -9, 20, 18, cls || "gd-face", 8) + rect(20, -5, 46, 10, "gd-body", 3) + '</g>');
  }
  function speakerZones() {
    var cx = 120, cy = 120, R = 100, o = "";
    o += rect(10, 10, 220, 220, "gd-body", 8);
    o += part("Cone edge and surround: the darkest, woolliest spot", circ(cx, cy, R, "gd-face"));
    o += part("The cone: warmer and rounder than the middle", circ(cx, cy, 70, "gd-face"));
    o += part("Cap edge (where the dust cap meets the cone): bright but full. Where most people start", '<circle cx="' + cx + '" cy="' + cy + '" r="30" class="gd-ln gd-s-hot" style="stroke-width:10;stroke-opacity:.35"/>');
    o += part("Dust cap: the brightest, most bite (and fizz)", circ(cx, cy, 24, "gd-face"));
    o += callout(149, 40, 240, "edge: darkest") + callout(152, 75, 240, "cone: warmer") + callout(142, 100, 240, "cap edge: bright, full") + callout(128, 125, 240, "cap: brightest");
    o += txt(240, 170, "the further out,", "gd-sm", "start") + txt(240, 186, "the darker", "gd-sm", "start");
    return svg(400, 240, "A guitar speaker from the front: dust cap, cap edge, cone and edge; brighter in the middle, darker toward the edge", o);
  }
  function ampMiking() {
    var o = "";
    o += part("The amp's cabinet, from the side; the speaker faces right", rect(20, 40, 90, 150, "gd-body", 4) + rect(106, 60, 6, 110, "gd-face"));
    o += part("The speaker cone", path("M112,70 L136,95 L136,135 L112,160 Z", "gd-face"));
    o += smallMic(140, 115, 0, "Close mic: 1-5 cm from the grille cloth, pointing at the speaker. Mostly speaker, little room", "gd-f-hot");
    o += smallMic(140, 160, 35, "The same mic angled (off axis): a little darker, less fizz", "gd-face");
    o += smallMic(330, 115, 0, "Room mic: 1-2 m back. The amp in the room; blend it under the close mic");
    o += line(140, 92, 140, 82, "gd-ln gd-thin") + txt(140, 76, "close: 1-5 cm", "gd-sm", "start");
    o += txt(206, 178, "angled", "gd-sm", "start") + txt(330, 92, "room: 1-2 m", "gd-sm", "start");
    o += path("M200,210 L320,210", "gd-ln gd-thin gd-dash") + txt(260, 226, "more room the further back", "gd-sm");
    o += txt(65, 30, "amp", "gd-b");
    return svg(480, 236, "Miking an amp from the side: a close mic on the speaker, the same mic angled, and a room mic a metre or two back", o);
  }
  function vocalSetup() {
    var o = "";
    o += part("The singer, side view", path("M30,30 C64,26 72,64 68,88 L78,104 L70,108 L74,116 L68,120 L72,128 C68,146 52,146 30,156 L30,226", "gd-body"));
    o += part("The air jet of a p or b: forward and a little down, narrow", '<path d="M70,112 L330,170 L330,132 Z" class="gd-f-hot" style="fill-opacity:.3;stroke-dasharray:4 3"/>');
    o += part("Pop filter: mesh 5-10 cm from the mouth; stops the jet, lets the sound through", '<ellipse cx="110" cy="102" rx="5" ry="30" class="gd-ln gd-dash"/>');
    o += smallMic(150, 92, -22, "The mic: 15-25 cm away (a condenser), a little above the mouth and pointing down at it: out of the air jet", "gd-f-cold");
    o += txt(110, 62, "pop filter", "gd-sm") + txt(178, 30, "mic: 15-25 cm, above,", "gd-sm", "start") + txt(178, 44, "pointing at the mouth", "gd-sm", "start");
    o += txt(250, 190, "air jet (p, b)", "gd-sm") ;
    o += path("M70,212 L160,212", "gd-ln gd-thin") + txt(115, 228, "15-25 cm", "gd-sm");
    return svg(400, 236, "A singer and a condenser mic from the side: a pop filter between, the mic a little above the mouth, out of the jet of air from p and b", o);
  }

  var FIGS = {
    "jack-wiring":    [jackWiring, "TS has two contacts, TRS three. The same TRS cable is balanced mono or stereo, depending on the sockets."],
    "xlr-pins":       [xlrPins, "XLR, seen from the contacts. Pin 1 is always ground; 2 hot, 3 cold."],
    "balanced":       [balanced, "Balanced: noise picked up on the way lands the same on both wires; flipping one and adding cancels it."],
    "signal-flow":    [signalFlow, "Follow the signal. No sound? Check each box and cable in this order."],
    "keyboard-panel": [keyboardPanel, "A typical stage keyboard. Hover a socket for what it does."],
    "midi-chain":     [midiChain, "MIDI OUT goes to MIDI IN: the arrow is the way the notes travel. USB carries them both ways."],
    "congas":         [congas, "Three sizes of one drum: the smaller, the higher. Most players start with a conga and a tumba."],
    "bongos":         [bongos, "Bongos sit between the knees, the small macho on the left (for a right-handed player)."],
    "djembe":         [djembe, "A djembe is tuned by its ropes. The middle of the head gives the bass; the edge gives tone and slap."],
    "tabla":          [tabla, "The tabla is a pair: the dayan is tuned to the music's key; the bayan's pitch bends under the heel of the hand."],
    "polar-patterns": [polarPatterns, "Seen from above, the front of the mic at the top. Further out = louder from that direction."],
    "mic-response":   [micResponse, "Not flat on purpose: a vocal dynamic trims the bass and lifts the words; a condenser is near flat."],
    "proximity":      [proxGraph, "The same cardioid, closer and closer to a voice: the bass grows. (The physics of an ideal one; real mics trim their bass, so the boost is smaller.) Omni mics don't do this."],
    "off-axis":       [offAxisGraph, "Off axis a mic is quieter, and duller: the treble drops first. A mic pointed past a source hears it darker."],
    "speaker-zones":  [speakerZones, "Where on the speaker: the further from the middle, the darker. Most engineers start at the cap edge."],
    "amp-miking":     [ampMiking, "Close for the speaker's own sound, angled for less fizz, back for the room."],
    "vocal-setup":    [vocalSetup, "Out of the air jet, behind a pop filter, pointing at the mouth."],
    "cupping":        [cupping, "Cupping the grille covers the rear ports: the mic hears all round, sounds boxy, and feeds back."]
  };

  var CSS =
    ":root{--gd-hot:#d6336c;--gd-cold:#4c5fd5;--gd-gnd:#2b9c90;--gd-power:#d98a00;--gd-data:#7b4fc9;--gd-metal:#c9cdd3}" +
    ".gear-row{display:flex;flex-wrap:wrap;gap:.8rem;align-items:flex-start;margin:.8rem 0 1.2rem}" +
    ".gear-fig{margin:.8rem 0 1.2rem;max-width:34rem}" +
    ".gear-fig svg{width:100%;height:auto;display:block}" +
    ".gear-fig .gd-cap{font-size:.82rem;line-height:1.35;color:var(--site-ink-2);margin-top:.35rem}" +
    ".gd-gallery{max-width:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:.7rem}" +
    ".gd-card{margin:0;padding:.45rem .5rem;border:1px solid var(--site-border);border-radius:6px;background:var(--site-surface)}" +
    ".gd-card figcaption{font-size:.78rem;line-height:1.3;color:var(--site-ink-2)}" +
    ".gd-name{font-weight:700;font-size:.9rem;display:flex;flex-wrap:wrap;gap:.35rem;align-items:center}" +
    ".gd-tag{font-family:var(--font-mono),monospace;font-weight:400;font-size:.68rem;padding:0 .35rem;border-radius:3px;border:1px solid currentColor}" +
    ".gd-tag-audio{color:var(--gd-hot)}.gd-tag-speaker{color:var(--gd-hot);background:color-mix(in srgb,var(--gd-hot) 12%,transparent)}" +
    ".gd-tag-data{color:var(--gd-data)}.gd-tag-power{color:var(--gd-power)}" +
    ".gear-fig text{font-family:var(--font-mono),monospace;fill:var(--site-ink);font-size:12px}" +
    ".gear-fig text.gd-sm{font-size:11px;fill:var(--site-ink-2)}.gear-fig text.gd-b{font-weight:700}.gear-fig text.gd-num{font-size:11px;font-weight:700}" +
    ".gear-fig .gd-ln{fill:none;stroke:var(--site-ink);stroke-width:2;stroke-linejoin:round;stroke-linecap:round}" +
    ".gear-fig .gd-thin{stroke-width:1.2}.gear-fig .gd-thick{stroke-width:2.6}.gear-fig .gd-wire{stroke-width:3}" +
    ".gear-fig .gd-body{fill:var(--site-surface-2);stroke:var(--site-ink);stroke-width:2;stroke-linejoin:round}" +
    ".gear-fig .gd-face{fill:var(--site-surface);stroke:var(--site-ink);stroke-width:1.5}" +
    ".gear-fig .gd-metal{fill:var(--gd-metal);stroke:var(--site-ink);stroke-width:1.5}" +
    ".gear-fig .gd-ins,.gear-fig .gd-hole{fill:var(--site-ink)}.gear-fig .gd-hole-soft{fill:var(--site-ink-3)}" +
    ".gear-fig .gd-slot{fill:var(--site-surface-2);stroke:var(--site-ink);stroke-width:1.5}" +
    ".gear-fig .gd-dash{stroke-dasharray:6 4}" +
    ["hot", "cold", "gnd", "power", "data"].map(function (r) {
      return ".gear-fig .gd-f-" + r + "{fill:var(--gd-" + r + ");stroke:var(--site-ink);stroke-width:1.5}.gear-fig .gd-s-" + r + "{stroke:var(--gd-" + r + ")}";
    }).join("") +
    ".gear-fig .gd-s-off{stroke:var(--site-ink-3)}.gear-fig .gd-s-ink{stroke:var(--site-ink)}" +
    ".gear-fig .gd-part:hover>*{filter:brightness(1.08)}" +
    ".gear-fig .gd-grid{fill:none;stroke:var(--site-border);stroke-width:1}" +
    ".gear-fig .gd-lobe{fill:var(--site-accent);fill-opacity:.2;stroke:var(--site-accent);stroke-width:2;stroke-linejoin:round}" +
    ".gear-fig .gd-curve{fill:none;stroke:var(--site-ink);stroke-width:2;stroke-linejoin:round}.gear-fig .gd-s-accent{stroke:var(--site-accent);stroke-width:2.6}" +
    ".gear-fig .gd-hand{fill:var(--site-surface-2);stroke:var(--site-accent);stroke-width:5;stroke-linecap:round}" +
    ".gear-fig text.gd-warn{fill:var(--gd-hot);font-weight:700}";

  function init() {
    if (!document.getElementById("gd-css")) {
      var css = document.createElement("style"); css.id = "gd-css"; css.textContent = CSS; document.head.appendChild(css);
    }
    document.querySelectorAll(".gear-fig[data-fig]").forEach(function (box) {
      var name = box.getAttribute("data-fig");
      if (name === "connectors") return gallery(box);
      var f = FIGS[name]; if (!f) return;
      box.innerHTML = f[0]() + '<div class="gd-cap">' + esc(box.getAttribute("data-caption") || f[1]) + '</div>';
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  global.LessonGear = { init: init, cards: Object.keys(CARDS), figs: Object.keys(FIGS) };
})(window);
