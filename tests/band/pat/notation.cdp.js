// The Notation panel: the second chord instrument has a staff of its own, any set of staves can be shown, and "Only the
// section being played" shows one section and follows the band. Also the two built-in tunes added with it (minor blues,
// rhythm changes). Needs the test server (see ../README.md): cd ../lead && PORT=8500 node serve.js
const assert = require("assert"), { launch } = require("../lead/cdp.js");
(async () => {
  const b = await launch({ width: 1280, height: 1400 });
  const ev = x => b.eval(x);
  const set = (id, val, kind) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = ${JSON.stringify(val)}; e.dispatchEvent(new Event("${kind || "change"}", { bubbles: true })); })()`);
  const tick = (id, on) => ev(`(function(){ var e = document.getElementById("${id}"); e.checked = ${on}; e.dispatchEvent(new Event("change", { bubbles: true })); })()`);
  const txt = id => ev(`document.getElementById("${id}").textContent`), hidden = id => ev(`document.getElementById("${id}").hidden`), v = id => ev(`document.getElementById("${id}").value`);
  // staff names as drawn, and how many staves the first system has
  const drawn = async () => { await b.sleep(900); return JSON.parse(await ev(`JSON.stringify({ staves: document.querySelectorAll("#bt-score svg .abcjs-staff.abcjs-l0").length || document.querySelectorAll("#bt-score svg .abcjs-staff").length,
    names: [].map.call(document.querySelectorAll("#bt-score svg .abcjs-voice-name"), function (x){ return x.textContent.trim(); }).filter(function (x, i, a){ return a.indexOf(x) === i; }), n: window.__btNotation })`)); };
  const until = async name => { for (let i = 0; i < 500; i++){ if (await txt("bt-secname") === name) return; await b.sleep(40); } throw new Error("never reached " + name); };
  try {
    await b.goto("http://127.0.0.1:8500/tools/backing-track.html"); await b.sleep(1200);
    // the two tunes
    await set("bt-changes", "minor"); let abc = await v("bt-abc");
    assert(/K:Cm/.test(abc) && /"Cm7"z4 \| "Fm7"z4/.test(abc) && /"Ab7"z4 \| "G7"z4/.test(abc) && /"Dm7b5"z2 "G7"z2/.test(abc), abc); assert.strictEqual(await v("bt-key"), "C");
    await set("bt-changes", "rhythm"); abc = await v("bt-abc");
    assert(/K:Bb\n/.test(abc) && (abc.match(/^P:/gm) || []).length === 4 && /P:B\n"D7"z4 \| "D7"z4 \| "G7"z4 \| "G7"z4/.test(abc) && /"Bb6"z2 "G7"z2 \| "Cm7"z2 "F7"z2/.test(abc), abc);
    assert.strictEqual(JSON.parse(await ev(`JSON.stringify(TuneChart.parse(document.getElementById("bt-abc").value).bars.length)`)), 32); assert.strictEqual(await v("bt-tempo-n"), "184"); assert(!(await hidden("bt-sections-field")));
    // the staves
    await ev(`document.getElementById("bt-notation").open = true`); let d = await drawn();
    assert.deepStrictEqual(d.names, ["Pno.", "Bass"]); assert(await hidden("bt-nt-comp2-l"), "no second instrument, no box for it"); assert(!(await hidden("bt-nt-section-l")));
    await set("bt-second", "guitar"); d = await drawn(); assert.deepStrictEqual(d.names, ["Pno.", "Gtr. 2", "Bass"], "the second instrument is written");
    assert.strictEqual(await txt("bt-nt-comp2-name"), "Jazz guitar (second)");
    await tick("bt-nt-comp", false); await tick("bt-nt-bass", false); d = await drawn(); assert.deepStrictEqual(d.names, ["Gtr. 2"]);
    await tick("bt-nt-comp2", false); await tick("bt-nt-bass", true); d = await drawn(); assert.deepStrictEqual(d.names, ["Bass"], "only the bass");
    await tick("bt-nt-comp", true); await tick("bt-nt-bass", false); await tick("bt-nt-drums", true); d = await drawn(); assert.deepStrictEqual(d.names, ["Pno.", "Dr."], "piano and drums, no bass");
    await tick("bt-nt-comp", false); await tick("bt-nt-drums", false); d = await drawn(); assert.deepStrictEqual(d.names, ["Pno."], "nothing ticked: the comping");
    await tick("bt-nt-comp", true); await tick("bt-nt-comp2", true); await tick("bt-nt-bass", true);
    await set("bt-comp", "hammond"); d = await drawn(); assert.strictEqual(d.names[0], "Org.");
    await set("bt-comp", "piano"); await set("bt-second", "");
    // only the section being played
    d = await drawn(); assert.strictEqual(d.n.bars.length, 32);
    await tick("bt-nt-section", true); d = await drawn(); assert.deepStrictEqual(d.n.bars, [0, 1, 2, 3, 4, 5, 6, 7], "stopped: the first section"); assert(/^A/.test(await txt("bt-nt-which")));
    await set("bt-tempo-n", 300); await ev(`document.getElementById("bt-play").click()`);
    await until("B"); await b.sleep(700); d = await drawn(); assert.deepStrictEqual(d.n.bars, [16, 17, 18, 19, 20, 21, 22, 23], "the bridge while it plays"); assert(/^B, playing now/.test(await txt("bt-nt-which")), await txt("bt-nt-which"));
    for (let i = 0; i < 200; i++){ if (/bar 24\b/.test(await txt("bt-status"))) break; await b.sleep(30); }                 // its last bar: the page turns to the last A
    d = await drawn(); assert.deepStrictEqual(d.n.bars, [24, 25, 26, 27, 28, 29, 30, 31], "turned to the next section");
    await ev(`document.getElementById("bt-play").click()`); await tick("bt-nt-section", false); d = await drawn(); assert(d.n.bars.length >= 16);
    assert.deepStrictEqual(b.errors.filter(e => !/supabase/i.test(e)), []);
    console.log("NOTATION OK");
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
