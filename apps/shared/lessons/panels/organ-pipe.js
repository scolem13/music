// A GENERIC two-manual + pedal pipe organ console (not any one instrument): drawknobs in two jambs, Great + Pedal on the left,
// Swell + couplers on the right, reeds lettered red (Wikipedia "Organ stop": reed stops are often labelled in red). Everything
// else (stop list, layout) is this page's own. Bound to OrganCompare's "pipe" profile.
(function () {
  var I = [], S = window.OrganCompare ? OrganCompare.PIPE_STOPS : [];
  function jamb(x, title, divs) { var y = 34; I.push({ t: "section", x: x, y: 10, w: 270, h: 380, label: title, title: "border", size: 9 });
    divs.forEach(function (d) { I.push({ t: "label", x: x + 135, y: y + 4, text: d[0], size: 8.5, bold: true }); y += 12;
      d[1].forEach(function (st, i) { var cx = x + 30 + (i % 3) * 82, cy = y + Math.floor(i / 3) * 62;
        I.push({ t: "key", k: st[0], x: cx, y: cy, w: 58, h: 48, label: st[1], cap: st[2] ? "#f7e9e6" : "#f4efe4", size: 7.2 }); });
      y += Math.ceil(d[1].length / 3) * 62 + 14; }); }
  var nm = function (div) { return S.filter(function (s) { return s[1] === div; }).map(function (s) { return [s[0], s[2].toUpperCase(), s[4] === "reed"]; }); };
  jamb(10, "GREAT · PEDAL", [["GREAT", nm("gt")], ["PEDAL", nm("pd")]]);
  jamb(560, "SWELL · COUPLERS", [["SWELL", nm("sw").concat([["trem", "TREMULANT"]])], ["COUPLERS", [["sw_gt", "SW TO GT"], ["gt_pd", "GT TO PED"], ["sw_pd", "SW TO PED"]]]]);
  I.push({ t: "section", x: 290, y: 10, w: 260, h: 380, label: "", head: 0 });
  I.push({ t: "keys", x: 302, y: 40, w: 236, h: 54, n: 21 }); I.push({ t: "label", x: 420, y: 34, text: "SWELL", size: 8, dim: true });
  I.push({ t: "keys", x: 302, y: 118, w: 236, h: 54, n: 21 }); I.push({ t: "label", x: 420, y: 112, text: "GREAT", size: 8, dim: true });
  I.push({ t: "vslider", k: "swbox", x: 330, y: 200, w: 40, h: 150, label: "SWELL BOX", a: "gold" });
  I.push({ t: "knob", k: "reverb", x: 470, y: 260, r: 22, label: "ROOM", cap: "#c9b37a" });
  FaithfulPanel.register({ id: "organ-pipe", name: "Pipe organ (generic)", w: 840, h: 400, knob: "cap", accent: "gold",
    accents: { gold: "#b8913a" }, colors: { light: { body: "#f3ecdf" }, dark: { body: "#211b12" } },
    src: ["Wikipedia, 'Organ stop' (families, footages, reeds lettered red)"], approx: "Not a real instrument: a made-up two-manual console (drawknobs as lit tablets, keyboards are pictures).",
    items: I });
})();
