// PresetBook: every instrument preset saved in this browser, on one page (tools/instrument-presets.qmd).
// Reads the Presets menus' storage (faithful-panel.js): localStorage `fp-presets:<layout id>` = [{ name, v: { key: value } }] and
// `fp-presets-meta:<layout id>` = { name, page, t } (written on each save). Grouped by family (FAMILIES below: id prefix -> page);
// each instrument row: how many presets, a link to open it, then each preset with its settings (folded), Download, Delete.
// Export all = one JSON file { kind: "instrument-presets", version: 1, presets: { <layout id>: [...] } }; Import merges one back
// (a preset with the same name on the same instrument is replaced). Markup: <div class="pbk-family" data-family="synth"></div>
// per family + <div class="pbk-top"></div>. API: PresetBook.all() -> { id: [...] }, .render(), .FAMILIES, .NAMES.
(function () {
  var PB = window.PresetBook = {};
  var FAM = PB.FAMILIES = [
    ["synth", "Synthesizers", "/lessons/synth-compare.html", /^(vital|surge|ppg|p6|taurus|voyager|sub37|grandmother|memorymoog|moog|prophet|tb303|juno|arp2600|obxa|ms20|dx7)$/],
    ["organ", "Organs", "/lessons/organ-compare.html", /^organ-/], ["ep", "Electric pianos", "/lessons/epiano-compare.html", /^ep-/],
    ["dm", "Drum machines", "/lessons/drum-compare.html", /^dm-/], ["sq", "Sequencers", "/lessons/sequencer-compare.html", /^sq-/],
    ["gt", "Guitars", "/lessons/guitar-compare.html", /^gt-/], ["bs", "Basses", "/lessons/bass-compare.html", /^bs-/],
    ["pd", "Pedals", "/lessons/pedal-compare.html", /^pd-/], ["amp", "Amps", "/lessons/amp-compare.html", /^amp-/],
    ["mic", "Microphones", "/lessons/mic-compare.html", /^mic-/], ["dk", "Snares and drum kits", "/lessons/drum-kit-compare.html", /^dk-/],
    ["cy", "Cymbals", "/lessons/cymbal-compare.html", /^cy-/], ["wi", "World and acoustic", "/lessons/world-instruments-compare.html", /^wi-/]];
  var NAMES = PB.NAMES = { vital: "Vital", surge: "Surge XT", ppg: "PPG Wave", p6: "Prophet-6", taurus: "Taurus", voyager: "Voyager", sub37: "Sub 37",
    grandmother: "Grandmother", memorymoog: "Memorymoog", moog: "Minimoog Model D", prophet: "Prophet-5", tb303: "TB-303", juno: "Juno-60", arp2600: "ARP 2600",
    obxa: "OB-Xa", ms20: "MS-20", dx7: "DX7", "organ-b3": "Hammond B-3 + Leslie", "organ-vox": "Vox Continental", "organ-farfisa": "Farfisa Combo Compact",
    "organ-pipe": "Pipe organ", "ep-rhodes": "Rhodes Mark I", "ep-suitcase": "Rhodes Suitcase", "ep-wurli": "Wurlitzer 200A", "ep-clav": "Clavinet D6",
    "ep-cp70": "Yamaha CP-70", "ep-pianet": "Pianet N", "dm-tr808": "TR-808", "dm-tr909": "TR-909", "dm-linn": "LinnDrum", "dm-mpc60": "MPC60",
    "sq-a960": "960-style sequencer", "sq-tb303": "TB-303 sequencer", "sq-mc202": "MC-202", "sq-mc4": "MC-4", "sq-elektron": "Elektron-style",
    "gt-strat": "Stratocaster", "gt-tele": "Telecaster", "gt-lespaul": "Les Paul", "gt-sg": "SG", "bs-pbass": "Precision Bass", "bs-jbass": "Jazz Bass (60s)",
    "bs-jbass70": "Jazz Bass (70s)", "bs-stingray": "StingRay (2-band)", "bs-stingray3": "StingRay (3-band)", "bs-ric4003": "Rickenbacker 4003",
    "pd-fuzzface": "Fuzz Face", "pd-bigmuff": "Big Muff", "pd-ts808": "Tube Screamer TS808", "pd-crybaby": "Cry Baby", "pd-phase90": "Phase 90",
    "pd-ce2": "Boss CE-2", "pd-dm2": "Boss DM-2", "pd-echoplex": "Echoplex", "amp-twin": "Twin Reverb", "amp-ac30": "AC30", "amp-plexi": "Plexi",
    "amp-bassman": "Bassman", "amp-rect": "Dual Rectifier", "amp-svt": "SVT", "mic-sm57": "SM57", "mic-sm58": "SM58", "mic-u87": "U 87 Ai",
    "mic-r121": "R-121", "mic-md421": "MD 421", "mic-beta52": "Beta 52A", "dk-supraphonic": "Supraphonic snare", "dk-blackbeauty": "Black Beauty snare",
    "dk-maple": "Maple snare", "dk-piccolo": "Piccolo snare", "dk-jazz": "Jazz kit", "dk-rock": "Rock kit", "dk-funk": "Funk kit", "cy-aride": "A ride",
    "cy-kride": "K ride", "cy-p2002": "2002 crash", "cy-acrash": "A crash", "cy-hats": "Hi-hats", "cy-china": "China", "cy-splash": "Splash",
    "wi-sitar": "Sitar", "wi-tanpura": "Tanpura", "wi-tenorpan": "Tenor steel pan", "wi-kalimba": "Kalimba", "wi-mbira": "Mbira dzavadzimu" };
  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function ids() { var out = {}; Object.keys(NAMES).forEach(function (i) { out[i] = 1; });
    for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i), m = /^fp-presets:(.+)$/.exec(k); if (m) out[m[1]] = 1; } return Object.keys(out); }
  PB.all = function () { var o = {}; ids().forEach(function (i) { var a = (get("fp-presets:" + i) || []).filter(Boolean); if (a.length) o[i] = a; }); return o; };
  function fam(id) { for (var i = 0; i < FAM.length; i++) if (FAM[i][3].test(id)) return FAM[i]; return null; }
  function name(id) { var m = get("fp-presets-meta:" + id); return (m && m.name) || NAMES[id] || id; }
  function save(id, a) { try { if (a.length) localStorage.setItem("fp-presets:" + id, JSON.stringify(a)); else localStorage.removeItem("fp-presets:" + id); } catch (e) {} }
  function download(obj, file) { var b = new Blob([JSON.stringify(obj, null, 1)], { type: "application/json" }), a = h("a"); a.href = URL.createObjectURL(b); a.download = file; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000); }
  function fmt(v) { return typeof v === "number" ? String(+v.toFixed(3)) : String(v); }
  function key(k) { return k.replace(/^inv:/, "").replace(/^pre:/, ""); }

  PB.render = function () {
    var all = PB.all(), total = 0, inst = 0; Object.keys(all).forEach(function (i) { total += all[i].length; inst++; });
    var top = document.querySelector(".pbk-top");
    if (top) { top.innerHTML = "";
      top.appendChild(h("p", "pbk-sum", total ? total + " preset" + (total === 1 ? "" : "s") + " on " + inst + " instrument" + (inst === 1 ? "" : "s") + " in this browser." : "No presets saved in this browser yet. Open any instrument, use its Presets menu, then come back."));
      var ex = h("button", "btn btn-sm btn-outline-primary", "⤓ Export all presets"); ex.type = "button"; ex.disabled = !total;
      ex.onclick = function () { download({ kind: "instrument-presets", version: 1, saved: new Date().toISOString(), presets: all }, "instrument-presets.json"); };
      var im = h("button", "btn btn-sm btn-outline-primary", "⤒ Import presets…"); im.type = "button";
      var fi = h("input"); fi.type = "file"; fi.accept = ".json,application/json"; fi.hidden = true;
      im.onclick = function () { fi.click(); };
      fi.onchange = function () { var f = fi.files[0]; if (!f) return; f.text().then(function (t) { var d; try { d = JSON.parse(t); } catch (e) { return alert("That file is not JSON."); }
        if (!d || d.kind !== "instrument-presets" || !d.presets) return alert("That is not an instrument-presets file (Export all makes one).");
        var n = 0; Object.keys(d.presets).forEach(function (id) { if (!/^[\w-]+$/.test(id)) return; var cur = (get("fp-presets:" + id) || []).filter(Boolean);
          (d.presets[id] || []).forEach(function (p) { if (!p || typeof p.name !== "string" || !p.v || typeof p.v !== "object") return; var j = cur.findIndex(function (q) { return q.name === p.name; });
            if (j >= 0) cur[j] = { name: p.name, v: p.v }; else cur.push({ name: p.name, v: p.v }); n++; });
          save(id, cur); });
        fi.value = ""; PB.render(); alert("Imported " + n + " preset" + (n === 1 ? "" : "s") + "."); }); };
      [ex, im, fi].forEach(function (e) { top.appendChild(e); top.appendChild(document.createTextNode(" ")); });
      top.appendChild(h("p", "pbk-note", "Presets live in this browser only (another computer or browser has its own). Export all keeps a copy you can import anywhere."));
    }
    FAM.forEach(function (F) {
      var box = document.querySelector('.pbk-family[data-family="' + F[0] + '"]'); if (!box) return; box.innerHTML = "";
      var list = ids().filter(function (i) { var f = fam(i); return f && f[0] === F[0]; }).sort(function (a, b) { return name(a).localeCompare(name(b)); });
      var t = h("table", "table table-sm pbk-table"), hd = h("tr"); ["Instrument", "Presets", ""].forEach(function (x) { hd.appendChild(h("th", null, x)); }); t.appendChild(hd);
      var n = 0;
      list.forEach(function (id) { var a = all[id] || [], meta = get("fp-presets-meta:" + id), tr = h("tr", a.length ? "pbk-has" : "pbk-none");
        var nm = h("td"); nm.appendChild(h("b", null, name(id))); tr.appendChild(nm); tr.appendChild(h("td", null, a.length ? String(a.length) : "–"));
        var op = h("td"), ln = h("a", null, "Open ↗"); ln.href = (meta && meta.page) || F[2]; op.appendChild(ln); tr.appendChild(op); t.appendChild(tr); n += a.length;
        a.forEach(function (p, j) { var r = h("tr", "pbk-p"), c = h("td"); c.colSpan = 3;
          var d = h("details"), s = h("summary"); s.appendChild(h("span", "pbk-pn", (j < 9 ? (j + 1) + ". " : "") + p.name)); s.appendChild(h("span", "pbk-dim", " · " + Object.keys(p.v).length + " settings"));
          var dl = h("button", "btn btn-sm btn-link", "⤓ Download"); dl.type = "button"; dl.onclick = function (e) { e.preventDefault(); var o = {}; o[id] = [p]; download({ kind: "instrument-presets", version: 1, presets: o }, (id + "-" + p.name).replace(/[^\w-]+/g, "_") + ".json"); };
          var rm = h("button", "btn btn-sm btn-link pbk-del", "✕ Delete"); rm.type = "button"; rm.onclick = function (e) { e.preventDefault(); if (!confirm("Delete “" + p.name + "” from " + name(id) + "?")) return; var cur = (get("fp-presets:" + id) || []); cur.splice(j, 1); save(id, cur); PB.render(); };
          s.appendChild(dl); s.appendChild(rm); d.appendChild(s);
          var g = h("div", "pbk-grid"); Object.keys(p.v).sort().forEach(function (k) { g.appendChild(h("span", "pbk-k", key(k))); g.appendChild(h("span", "pbk-v", fmt(/^inv:/.test(k) ? -p.v[k] || 0 : p.v[k]))); });
          d.appendChild(g); c.appendChild(d); r.appendChild(c); t.appendChild(r); }); });
      var cnt = h("p", "pbk-dim", n ? n + " preset" + (n === 1 ? "" : "s") + " in this family." : "None saved yet."); box.appendChild(cnt);
      var only = h("button", "btn btn-sm btn-link", "Show instruments with no presets"); only.type = "button";
      only.onclick = function () { box.classList.toggle("pbk-showall"); only.textContent = box.classList.contains("pbk-showall") ? "Hide instruments with no presets" : "Show instruments with no presets"; };
      box.classList.toggle("pbk-empty", !n); box.appendChild(t); box.appendChild(only); });
  };
  window.addEventListener("storage", function (e) { if (/^fp-presets/.test(e.key || "")) PB.render(); });   // a preset saved in another tab
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", PB.render); else PB.render();
})();
