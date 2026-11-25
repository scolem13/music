// The sequencer page's translator, canon and voice (apps/shared/lessons/sequencer-compare.js), headless.
// node tests/lessons/sequencer-compare.test.js   (NEG=1 must fail)
const SQ = require("../../apps/shared/lessons/sequencer-compare.js");
const NEG = process.env.NEG === "1"; let fails = 0;
const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
const ex = id => SQ.EXAMPLES.find(x => x.id === id);
const tr = (id, to) => { const e = ex(id); return SQ.translate(e.from, to || e.to, Object.assign(SQ.blank(e.from), e.d)); };
const lost = r => r.notes.filter(n => n.cls === "lost").map(n => n.what).join(" | ");
// the cases the page's text promises
check("acid → 960: slides lost", /Slides/.test(lost(tr("acid"))), lost(tr("acid")));
check("acid → 960: at most 8 stages", tr("acid").data.mode.filter(m => m !== "s").length <= 8);
check("acid → 960: notes past the eighth lost", /after the eighth/.test(lost(tr("acid"))));
check("acid → MC-202: slide becomes portamento on the next note", tr("acid", "mc202").data.ch[0].some(e => e.po));
check("berlin → 303: every stage on a step, nothing moved", !tr("berlin").notes.some(n => /moved/.test(n.what)));
const rc = tr("rowc"); check("row C → MC-4: rhythm exact at TB 120", rc.notes.some(n => n.cls === "exact" && /time base 120/.test(n.what)), rc.notes.map(n => n.cls + ":" + n.what).join(" / "));
check("MC-4 triplets → 303: moved onto a grid", tr("trip").notes.some(n => n.cls === "approx" && /moved/.test(n.what)));
check("MC-4 four channels → MC-202: two lost", /beyond two/.test(lost(tr("mc4-four"))));
check("p-locks → MC-202: conditions lost, filter lost", /conditions/.test(lost(tr("plocks"))) && /Filter/.test(lost(tr("plocks"))));
check("p-locks → MC-4: filter onto CV-2 (approx)", tr("plocks", "mc4").notes.some(n => n.cls === "approx" && /CV-2/.test(n.what)));
check("12 steps → 960: two notes lost", /2 note\(s\) after the eighth/.test(lost(tr("twelve"))));
// trig conditions follow the manual's examples (DT p. 48)
const c = (cond, loop) => SQ.condTrue(cond, loop, null, false);
check("1:2 plays loops 1,3,5", [1, 2, 3, 4, 5].map(l => c("1:2", l)).join() === "true,false,true,false,true");
check("4:7 plays loops 4 and 11", c("4:7", 4) && c("4:7", 11) && !c("4:7", 5));
check("!1ST skips loop 1 only", !c("!1ST", 1) && c("!1ST", 2));
check("NEI false with no neighbour", !c("NEI", 1) && c("!NEI", 1));
const pl = ex("plocks"), n1 = SQ.toCanon("elektron", Object.assign({}, pl.d, { loop: 1 })).lines[0].map(n => n.t).join(), n2 = SQ.toCanon("elektron", Object.assign({}, pl.d, { loop: 2 })).lines[0].map(n => n.t).join();
check("loop 1 and loop 2 differ (1:2, !1ST)", n1 !== n2, n1 + " vs " + n2);
// the 303's separate pitch and time memories
const d303 = SQ.blank("tb303"); d303.pitch[0].k = 0; d303.pitch[1].k = 7; d303.time = ["n", "r", "n", "t"].concat(Array(12).fill("r")); d303.last = 16;
const ev = SQ.toEvents("tb303", d303);
check("303: second pitch goes to the second NOTE, tie lengthens it", ev.length === 2 && ev[1].note === 55 && Math.abs(ev[1].len - 0.5) < 1e-9 && Math.abs(ev[1].t - 0.5) < 1e-9, JSON.stringify(ev));
// every note cited; every control named exists on its machine
let bad = [];
for (const e of SQ.EXAMPLES) for (const to of SQ.ORDER) { if (to === e.from) continue;
  const r = SQ.translate(e.from, to, Object.assign(SQ.blank(e.from), e.d));
  r.notes.forEach(n => { if (!n.cite.length || n.cite.some(x => !x.title)) bad.push(e.id + ">" + to + ": no cite " + n.what);
    if (!["exact", "approx", "lost"].includes(n.cls)) bad.push("cls " + n.cls);
    n.ctl.from.forEach(k => { if (!SQ.MACHINES[e.from].ctls.includes(k)) bad.push(e.id + ": no control " + e.from + "." + k); });
    n.ctl.to.forEach(k => { if (!SQ.MACHINES[to].ctls.includes(k)) bad.push(e.id + ": no control " + to + "." + k); }); });
  const evs = SQ.toEvents(to, r.data); if (evs.some(x => !isFinite(x.t) || !isFinite(x.note) || !(x.len > 0))) bad.push(e.id + ">" + to + " bad events"); }
check("every pair: notes cited, controls real, events finite", bad.length === 0, bad.slice(0, 4).join("; "));
// round trip keeps a plain 16th line
const plain = SQ.toEvents("tb303", ex("acid").d), back = SQ.translate("mc4", "tb303", SQ.translate("tb303", "mc4", ex("acid").d).data).data;
const pb = SQ.toEvents("tb303", back);
check("303 → MC-4 → 303 keeps notes and times", pb.length === plain.length && pb.every((x, i) => x.note === plain[i].note && Math.abs(x.t - plain[i].t) < 1e-9 && x.accent === plain[i].accent), pb.length + " vs " + plain.length);
// export / import
const j = SQ.exportJSON("mc202", ex("duet").d, { song: "S", artist: "A", source: { url: "u", channel: "c", title: "t", at: "0:10" } });
const back2 = SQ.importJSON(JSON.parse(JSON.stringify(j)));
check("export → import keeps the line", j.kind === "sequence" && j.version === 1 && JSON.stringify(SQ.toEvents("mc202", back2.data)) === JSON.stringify(SQ.toEvents("mc202", ex("duet").d)) && back2.source.at === "0:10");
let threw = false; try { SQ.importJSON({ kind: "synth-patch", version: 1 }); } catch (e) { threw = true; } check("import refuses other files", threw);
// assignments file
const A = require("../../apps/shared/data/sequences/assignments.json");
check("3-5 videos for every machine", SQ.ORDER.every(id => (A.machines[id] || []).length >= 3 && A.machines[id].length <= 5 && A.machines[id].every(v => /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/.test(v.url) && v.song && v.channel && v.title)));
// drawings
const cA = SQ.toCanon("tb303", ex("acid").d), cB = SQ.toCanon("a960", tr("acid").data);
check("piano roll draws both machines", (SQ.rollSVG(cA, cB, "tb303", "a960").match(/<rect class="sqc-[ab]/g) || []).length === cA.lines[0].length + cB.lines[0].length);
check("timing grid: MC-4 has 121 ticks a beat", (SQ.gridSVG({}).match(/class="sqc-tick"/g) || []).length === 5 + 25 + 121 + 5);
// the voice: sound, no NaN, slide holds the note
let P; function AWP() { this.port = {}; }
new Function("AudioWorkletProcessor", "registerProcessor", "sampleRate", "currentTime", SQ.workletSource)(AWP, (n, c) => P = c, 48000, 0);
check("worklet is a real class extending AudioWorkletProcessor", /class \w+ extends AudioWorkletProcessor/.test(SQ.workletSource) && typeof P === "function");
const p = new P(); global.currentTime = 0;
p.port.onmessage({ data: { type: "on", at: 0, note: 48, vel: 0.8, accent: true } });
const out = [[new Float32Array(128)]]; let s = 0, nan = false;
for (let b = 0; b < 200; b++) { p.process([], out); for (const x of out[0][0]) { if (!isFinite(x)) nan = true; s += x * x; } }
check("voice sounds, no NaN", !nan && Math.sqrt(s / 25600) > 0.005, Math.sqrt(s / 25600).toFixed(4));
console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
