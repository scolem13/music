// Settings made section by section are saved in a setup under the sections' names and come back on the sections with
// those names, in the same chart or one whose sections are in another order. Saving while a section's settings show
// still saves the tune's own as the setup's. Needs the test server: cd ../lead && PORT=8500 node serve.js
const assert = require("assert"), { launch } = require("../lead/cdp.js");
(async () => {
  const b = await launch({ width: 1280, height: 1300 });
  const ev = x => b.eval(x);
  const v = id => ev(`document.getElementById("${id}").value`), txt = id => ev(`document.getElementById("${id}").textContent`), click = id => ev(`document.getElementById("${id}").click()`);
  const set = (id, val, kind) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = ${JSON.stringify(val)}; e.dispatchEvent(new Event("${kind || "change"}", { bubbles: true })); })()`);
  const over = async () => JSON.parse(await ev(`JSON.stringify(window.__btSections().opts.sectionOverrides)`));
  const until = async name => { for (let i = 0; i < 400; i++){ if (await txt("bt-secname") === name) return; await b.sleep(50); } throw new Error("never reached " + name); };
  const bars = c => [c, c, c, c].map(x => `"${x}"z4`).join("|") + "|";
  const sec = (name, c, style) => "P:" + name + "\n" + (style ? "%%style " + style + "\n" : "") + bars(c) + "\n";
  const head = "X:1\nT:keep\nM:4/4\nL:1/4\nQ:1/4=230\nK:C\n";
  const pickSetup = name => ev(`(function(){ var l = document.getElementById("bt-setup-list"), o = [].filter.call(l.options, function (x){ return x.textContent.indexOf(${JSON.stringify(name)}) >= 0; })[0]; if (!o) return false; l.value = o.value; document.getElementById("bt-setup-load").click(); return true; })()`);
  try {
    await b.goto("http://127.0.0.1:8500/tools/backing-track.html"); await b.sleep(1200);
    await ev(`localStorage.removeItem("btSetups")`);
    await set("bt-abc", head + sec("Verse", "C") + sec("Chorus", "Dm7", "bossa nova") + sec("Verse 2", "C") + sec("Chorus", "G7", "bossa nova") + "]", "input"); await b.sleep(300);
    await click("bt-play"); await until("Chorus");
    await set("bt-bass-sound", "electric"); await click("bt-sec-apply");
    assert.deepStrictEqual(Object.keys(await over()), ["1", "3"]);
    assert.strictEqual(await v("bt-style"), "bossa");                       // the chorus is showing while it is saved
    await set("bt-setup-name", "keep-test", "input"); await click("bt-setup-save"); await click("bt-play");
    const saved = JSON.parse(await ev(`localStorage.getItem("btSetups")`)).filter(x => x.name === "keep-test")[0];
    assert.deepStrictEqual([saved.style, saved.groove, saved.fields["bt-bass-sound"]], ["swing", "auto", "upright"], "the setup is the tune's own settings");
    assert.deepStrictEqual(saved.sections.map(x => [x.name, x.nth, x.opts.bassSound, x.opts.groove, x.state.style]), [["Chorus", 0, "electric", "bossa", "bossa"], ["Chorus", 1, "electric", "bossa", "bossa"]]);
    // another chart, then the setup again
    await set("bt-abc", head + bars("F") + "]", "input"); await b.sleep(300); assert.deepStrictEqual(await over(), {});
    assert(await pickSetup("keep-test")); await b.sleep(300);
    assert.deepStrictEqual(Object.keys(await over()), ["1", "3"]); assert.deepStrictEqual([await v("bt-style"), await v("bt-bass-sound")], ["swing", "upright"]);
    await click("bt-play"); await until("Chorus"); assert.deepStrictEqual([await v("bt-style"), await v("bt-bass-sound")], ["bossa", "electric"], "the chorus comes back as it was set"); await click("bt-play");
    // the same setup on a chart whose sections are in another order, with a third chorus (as a song file would send it)
    const moved = Object.assign({}, saved, { name: "keep-moved", abc: head + sec("Chorus", "Dm7", "bossa nova") + sec("Verse", "C") + sec("Bridge", "F") + sec("Chorus", "G7", "bossa nova") + sec("Chorus", "G7", "bossa nova") + "]" });
    await ev(`(function(){ var l = JSON.parse(localStorage.getItem("btSetups")); l.push(${JSON.stringify(moved)}); localStorage.setItem("btSetups", JSON.stringify(l)); })()`);
    await b.goto("http://127.0.0.1:8500/tools/backing-track.html"); await b.sleep(1200);
    assert(await pickSetup("keep-moved")); await b.sleep(300);
    assert.deepStrictEqual(Object.keys(await over()), ["0", "3", "4"], "by name: both choruses, and the new third one, which takes what every chorus has");
    assert.deepStrictEqual(b.errors.filter(e => !/supabase/i.test(e)), []);
    await ev(`localStorage.removeItem("btSetups")`);
    console.log("SECTION SETTINGS KEPT OK");
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
