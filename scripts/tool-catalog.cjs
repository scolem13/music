#!/usr/bin/env node
// Catalogue of the interactive tools each lesson uses.
// Reads lessons/*.qmd, finds the widgets placed on each (synth-kit / recording-kit data-w kinds, kit classes,
// the Mini DAW, the framed Notation page, gear figures), and writes apps/shared/lessons/tool-catalog-data.js
// (window.TOOL_CATALOG). lessons/tools.qmd draws the catalogue from it, and tool-links.js adds a
// "Same tools in" strip to the foot of each lesson. Rerun after adding a lesson or a widget: node scripts/tool-catalog.cjs
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, ".."), dir = path.join(root, "lessons");

// family -> label for data-w kinds (synth-kit .sk and the recording kit .rk)
const FAM = {
  Synthesis: "series additive wave noise filter lfo subtractive fm wavetable envelope granular chip tracker vocoder",
  Effects: "distortion compressor delay glitch chorus phaser reverb eq sidechain gate transient tremolo rotary octaver harmonizer autotune stereo chain shimmer",
  "Tuning and pitch": "interval tuner bendboard drone calc in ladder pluck bands cents demod disc st temper wheel",
  "Amps and live sound": "amp pa",
  Recording: "gainstage phantom polar proximity offaxis headmix latency multitrack loudness phase",
};
const famOf = {};
for (const [f, ks] of Object.entries(FAM)) ks.split(" ").forEach(k => (famOf[k] = f));

// kit classes -> [tool name, family]
const CLS = {
  "bl-step": ["Band step player", "Band"], "ar-demo": ["Arranging band demo", "Band"], "ar-organ": ["Organ (tonebars)", "Band"],
  "bl-drumkit": ["Drum kit", "Drums"], "bl-drumkey": ["Drum key", "Drums"], "bl-hatkey": ["Hi-hat key", "Drums"],
  "bl-congakey": ["Conga key", "Drums"], "bl-scale": ["Scale player", "Notation and ear"], "bl-notes": ["Note player", "Notation and ear"],
  "sh-shapes": ["Chord shape cards", "Chords"], "sc-shapes": ["Library-checked shapes", "Chords"], "sh-toggles": ["Voicing toggles", "Chords"],
  "abc-tab": ["Tab + notation", "Notation and ear"], "abc-ex": ["Vocal exercise player", "Voice"], "nc-fig": ["Notation figures", "Notation and ear"],
  "sw-tools": ["Swing reader", "Notation and ear"], "fm-lab": ["Formant lab", "Voice"], "gb-lab": ["Bend lab", "Tuning and pitch"],
  "mdaw": ["Mini DAW", "DAW"], "gear-fig": ["Gear figures", "Gear"], "pw-embed": ["Practice widget", "Tuning and pitch"],
  "dj-tt": ["Turntables", "DJ and sampling"], "turntables": ["Turntables", "DJ and sampling"], "sp-pads": ["Sampler pads", "DJ and sampling"],
};
const UP = { eq: "EQ", lfo: "LFO", fm: "FM synthesis", pa: "PA channel", st: "Strobe", in: "Inharmonicity" };
const nice = k => UP[k] || k.charAt(0).toUpperCase() + k.slice(1);

const lessons = [], tools = {};
for (const f of fs.readdirSync(dir).filter(f => /^[a-z].*\.qmd$/.test(f) && f !== "index.qmd" && f !== "tools.qmd")) {
  const src = fs.readFileSync(path.join(dir, f), "utf8");
  const title = ((src.match(/^title:\s*"?(.*?)"?\s*$/m) || [])[1] || f).replace(/^Lesson:\s*/, "");
  const found = new Set();
  for (const m of src.matchAll(/data-w="([a-z ]+)"/g)) m[1].split(" ").forEach(k => found.add(nice(k) + "|" + (famOf[k] || "Other widgets")));
  for (const m of src.matchAll(/class="([a-z][a-z- ]*)"/g)) for (const c of m[1].split(" ")) if (CLS[c]) found.add(CLS[c].join("|"));
  if (/iframe[^>]*notation\.html/.test(src) || /tools\/notation\.html/.test(src)) found.add("Notation page (framed)|Notation and ear");
  if (!found.size) continue;
  const href = f.replace(/\.qmd$/, ".html");
  const ts = [...found].map(s => s.split("|")[0]);
  lessons.push({ href, title, tools: ts });
  for (const s of found) { const [n, fam] = s.split("|"); (tools[n] ||= { name: n, family: fam, lessons: [] }).lessons.push(href); }
}
lessons.sort((a, b) => a.title.localeCompare(b.title));
const out = "// Written by scripts/tool-catalog.cjs: do not edit by hand.\nwindow.TOOL_CATALOG = " +
  JSON.stringify({ lessons, tools: Object.values(tools).sort((a, b) => a.family.localeCompare(b.family) || a.name.localeCompare(b.name)) }) + ";\n";
fs.writeFileSync(path.join(root, "apps/shared/lessons/tool-catalog-data.js"), out);
console.log(lessons.length + " lessons, " + Object.keys(tools).length + " tools");
