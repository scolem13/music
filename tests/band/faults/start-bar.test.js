// Known fault (b): "Start at bar" kept its old number while a cycle was on (the field is disabled then, and the band starts at the
// cycle's first bar). Runs the practice block of tools/_backing-track.qmd against stub elements and a stub player.
// `node tests/band/faults/start-bar.test.js`   NEG=1 must fail.
const fs = require("fs"), path = require("path");
const qmd = fs.readFileSync(path.join(__dirname, "../../../tools/_backing-track.qmd"), "utf8");
const i = qmd.indexOf("  var formSrc = [];"), j = qmd.indexOf("  practiceSync();\n", qmd.indexOf("MutationObserver", i));
if (i < 0 || j < 0) throw new Error("page layout changed");
const block = qmd.slice(i, j);

const els = {}; const el = id => els[id] || (els[id] = { id, value: "", checked: false, disabled: false, hidden: false, max: 0, textContent: "", handlers: {},
  addEventListener(t, f){ (this.handlers[t] = this.handlers[t] || []).push(f); }, querySelectorAll(){ return []; }, classList: { toggle(){} } });
const $ = id => el(id);
["bt-start", "bt-cyc-from", "bt-cyc-to", "bt-step-a", "bt-step-b"].forEach(id => el(id).value = "");
el("bt-start").value = "1"; el("bt-cyc-from").value = "1"; el("bt-cyc-to").value = "8";
let sentStart = null;
const player = { setStartBar(i){ sentStart = i; }, setCycle(){}, setTempoSteps(){} };
const run = new Function("$", "player", "parsedC", "BandHarmony", "stopBars", "melTyping", "remote", "window", "document", "RecordingFollow",
  block + "\nreturn { practiceSync, practice, toggleLoop };");
const api = run($, player, {}, { buildForm: () => [0, 1, 2, 3, 4, 5, 6, 7].map(src => ({ src })) }, () => [], () => false, null, {}, { addEventListener(){} }, null);

let fail = 0; const ok = (c, m) => { if (!c){ fail++; console.log("FAIL", m); } };
el("bt-start").value = "3"; api.practiceSync();
ok(el("bt-start").value === 3 && sentStart === 2, "no cycle: Start stays 3, got " + el("bt-start").value);
el("bt-cyc-from").value = "5"; el("bt-cyc-to").value = "6"; el("bt-cyc-on").checked = true; api.practiceSync();
ok(sentStart === 4, "the band starts at the cycle's first bar (index 4), got " + sentStart);
ok(+el("bt-start").value === 5, "Start shows the cycle's first bar (5) while the cycle is on, got " + el("bt-start").value);
ok(el("bt-start").disabled, "Start is disabled while the cycle is on");
el("bt-cyc-from").value = "2"; api.practiceSync();
ok(+el("bt-start").value === 2, "moving the cycle's first bar moves Start with it, got " + el("bt-start").value);
el("bt-cyc-on").checked = false; api.practiceSync();
ok(+el("bt-start").value === 2 && !el("bt-start").disabled, "cycle off: Start is free again at the bar the loop began, got " + el("bt-start").value);
if (process.env.NEG) ok(false, "NEG: deliberate");
console.log(fail ? "FAULTS START-BAR FAILED" : "FAULTS START-BAR OK"); process.exit(fail ? 1 : 0);
