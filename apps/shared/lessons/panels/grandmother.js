// The Moog Grandmother's front panel as a FaithfulPanel layout (format: faithful-panel.js header), bound to
// SynthCompare.PROFILES.grandmother. Positions measured from the blank preset sheet in the Grandmother manual (©2018, PDF
// p. 52 = printed p. 52, the panel drawn twice, rotated): the page rendered and turned upright, the lower drawing read in
// pixels of a 2000 px-wide view (panel frame x 90-1910, y 60-715), then scaled by S. Section boxes, every knob, jack and
// switch centre are from that drawing; knob sizes are measured (large knobs ~30 px, cutoff ~45 px radius at that view).
(function () {
  var S = 0.68, X0 = 90, Y0 = 60, I = [], A = "or";
  function x(v) { return (v - X0) * S; } function y(v) { return (v - Y0) * S; }
  function sec(x0, y0, x1, y1, label) { I.push({ t: "section", x: x(x0), y: y(y0), w: (x1 - x0) * S, h: (y1 - y0) * S, label: label, title: "top", size: 12 }); }
  function k(key, cx, cy, label, r) { I.push({ t: "knob", k: key, x: x(cx), y: y(cy), r: (r || 30) * S, label: label, size: 9.5 }); }
  function j(cx, cy, label) { I.push({ t: "jack", x: x(cx), y: y(cy), r: 9 * S, label: label, size: 6.5 }); }
  function sel(key, cx, cy, w, label, names) { I.push({ t: "select", k: key, x: x(cx) - w / 2, y: y(cy) - 9, w: w, h: 18, label: label, size: 9, names: names }); }
  // whole panel and the section boxes (p. 52)
  I.push({ t: "section", x: 0, y: 0, w: 1820 * S, h: 655 * S, head: 0 });
  sec(108, 75, 248, 600, "ARP/SEQ"); sec(263, 75, 542, 600, "MODULATION"); sec(557, 75, 836, 600, "OSCILLATORS"); sec(852, 75, 991, 600, "MIXER");
  sec(1007, 75, 1146, 600, "UTILITIES"); sec(1162, 75, 1441, 600, "FILTER"); sec(1456, 75, 1735, 600, "ENVELOPE"); sec(1751, 75, 1890, 443, "OUTPUT");
  I.push({ t: "section", x: x(1751), y: y(460), w: 139 * S, h: 140 * S, label: "SPRING REVERB", title: "top", size: 10 });
  I.push({ t: "section", x: x(697), y: y(110), w: 0.6, h: 250 * S, head: 0 }, { t: "section", x: x(697), y: y(440), w: 0.6, h: 150 * S, head: 0 }, { t: "section", x: x(660), y: y(400), w: 80 * S, h: 0.6, head: 0 });
  // ARP / SEQ (not modelled)
  j(178, 125, "GATE OUT"); j(140, 180, "KB OUT"); j(215, 180, "KB VEL OUT"); k(null, 178, 270, "RATE");
  sel(null, 178, 385, 80, "MODE"); I.push({ t: "label", x: x(178), y: y(420), text: "ARP · SEQ · REC", size: 7, dim: true });
  sel(null, 178, 462, 80, "DIRECTION"); I.push({ t: "label", x: x(178), y: y(497), text: "ORDR · FWD/BKWD · RNDM", size: 6.5, dim: true });
  sel(null, 178, 545, 80, "OCT / SEQ");
  // MODULATION
  j(296, 125, "RATE IN"); j(509, 125, "WAVE OUT"); j(368, 180, "SYNC IN"); j(437, 180, "S/H OUT");
  k("rate", 403, 270, "RATE"); k("pAmt", 333, 400, "PITCH AMT"); k("cAmt", 472, 400, "CUTOFF AMT"); k("pwAmt", 333, 530, "PULSE WIDTH AMT");
  I.push({ t: "seg", k: "lfoWave", x: x(472) - 46, y: y(530) - 9, w: 92, h: 18, opts: [["sine", "∿"], ["saw", "◺"], ["ramp", "◿"], ["square", "⊓"]], size: 10 });
  I.push({ t: "label", x: x(472), y: y(575), text: "WAVEFORM", size: 9.5 });
  // OSCILLATORS: 1 left, 2 right, divided at x 697
  I.push({ t: "label", x: x(570), y: y(118), text: "1", size: 11, bold: true }, { t: "label", x: x(824), y: y(118), text: "2", size: 11, bold: true });
  j(627, 125, "WAVE OUT"); j(767, 125, "WAVE OUT"); j(590, 180, "PITCH IN"); j(665, 180, "PWM IN"); j(729, 180, "PITCH IN"); j(805, 180, "LIN FM IN");
  I.push({ t: "seg", k: "o1Oct", x: x(627) - 46, y: y(270) - 9, w: 92, h: 18, opts: [["32'", "32'"], ["16'", "16'"], ["8'", "8'"], ["4'", "4'"]], size: 8.5 });
  I.push({ t: "seg", k: "o2Oct", x: x(767) - 46, y: y(270) - 9, w: 92, h: 18, opts: [["16'", "16'"], ["8'", "8'"], ["4'", "4'"], ["2'", "2'"]], size: 8.5 });
  I.push({ t: "label", x: x(627), y: y(320), text: "OCTAVE", size: 9.5 }, { t: "label", x: x(767), y: y(320), text: "OCTAVE", size: 9.5 });
  I.push({ t: "switch", k: "sync", x: x(627) - 26, y: y(400) - 14, w: 52, h: 28, label: "", a: A });
  I.push({ t: "label", x: x(627), y: y(450), text: "SYNC", size: 9.5 });
  k("o2Freq", 767, 400, "FREQUENCY");
  [["o1Wave", 627], ["o2Wave", 767]].forEach(function (w) {
    I.push({ t: "seg", k: w[0], x: x(w[1]) - 46, y: y(530) - 9, w: 92, h: 18, opts: [["tri", "∧"], ["saw", "◿"], ["square", "⊓"], ["narrow", "⊓·"]], size: 9 });
    I.push({ t: "label", x: x(w[1]), y: y(577), text: "WAVEFORM", size: 9.5 }); });
  // MIXER
  j(884, 125, "OSC 1 IN"); j(959, 125, "OSC 2 IN"); j(884, 180, "NOISE IN"); j(959, 180, "OUTPUT");
  k("m1", 922, 270, "OSCILLATOR 1"); k("m2", 922, 400, "OSCILLATOR 2"); k("mN", 922, 530, "NOISE");
  // UTILITIES: mult, high pass, attenuator; the profile's one cord (mixer -> high pass -> filter) as a switch by the HP jacks
  j(1040, 127); j(1112, 127); j(1040, 180); j(1112, 180); I.push({ t: "label", x: x(1076), y: y(210), text: "MULT", size: 8.5 });
  k("hpCut", 1078, 270, "HIGH PASS"); j(1040, 358, "INPUT"); j(1114, 358, "OUTPUT");
  I.push({ t: "switch", k: "hpOn", x: x(1022), y: y(392), w: 112 * S, h: 13, label: "cord → filter", size: 7, a: A });
  k(null, 1078, 465, "ATTENUATOR"); j(1040, 550, "INPUT"); j(1114, 550, "OUTPUT");
  // FILTER
  j(1193, 125, "INPUT"); j(1408, 125, "OUTPUT"); j(1265, 180, "ENV AMT IN"); j(1340, 180, "CUTOFF IN");
  k("cutoff", 1300, 275, "CUTOFF", 45);
  sel("kbd", 1300, 412, 64, "", { off: "OFF", half: "1:2", "1:1": "1:1" }); I.push({ t: "label", x: x(1300), y: y(448), text: "KBD TRACK", size: 9.5 });
  k("envAmt", 1232, 530, "ENVELOPE AMT"); k("res", 1370, 530, "RESONANCE");
  // ENVELOPE
  j(1597, 125, "TRIGGER IN"); j(1527, 180, "+ ENV OUT"); j(1665, 180, "− ENV OUT");
  k("a", 1527, 270, "ATTACK"); k("d", 1527, 400, "DECAY"); k("r", 1527, 530, "RELEASE");
  I.push({ t: "vslider", k: "s", x: x(1640), y: y(295), w: 54 * S, h: 260 * S, label: "SUSTAIN", a: A });
  // OUTPUT and SPRING REVERB
  j(1820, 125, "VCA AMT IN"); j(1783, 180, "VCA IN"); j(1857, 180, "REVERB IN");
  k("vol", 1820, 270, "VOLUME");
  sel("vca", 1820, 385, 80, "", { env: "ENV", kbrls: "KB RLS", drone: "DRONE" }); I.push({ t: "label", x: x(1820), y: y(418), text: "VCA MODE", size: 9.5 });
  k("rev", 1820, 530, "MIX");
  // below the panel: glide (on the real instrument it sits by the wheels, left of the keys)
  k("glide", 178, 655, "GLIDE", 22);
  I.push({ t: "keys", x: x(300), y: y(620), w: 1500 * S, h: 90 * S, n: 32 });

  FaithfulPanel.register({ id: "grandmother", name: "Grandmother", w: 1820 * S, h: 720 * S, accent: A, knob: "cap", round: 3,
    accents: { or: "#f08a24", knob: "#111" },
    colors: { dark: { body: "#0d0d0d", head: "#1a1a1a", line: "#9a9a9a", ink: "#f2f2f2" }, light: { body: "#ffffff", head: "#ffffff", line: "#111111", ink: "#111111" } },
    src: ["Moog Grandmother manual (©2018), PDF p. 52: blank preset sheet (the front panel drawn to scale)", "pp. 9-25: what each control does"],
    approx: "Positions measured from the manual's blank preset sheet (p. 52): sections, knobs, jacks and switches where the drawing has them. Measured, not printed: there are no dimensions in the manual. Guessed: the Glide knob's place (it is by the wheels on the real instrument, not on this sheet), the keyboard drawing, colours (the real panel's coloured section blocks are not in the black-and-white drawing). The four-way octave and wave switches are drawn as rows of cells; the high-pass cord is a switch. Jacks and the arpeggiator are decoration (not modelled).",
    items: I.map(function (it) { if (it.t === "knob") it.cap = "#161616"; return it; }) });
})();
