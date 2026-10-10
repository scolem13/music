// Sections and the Band menus on the Backing Track page: the menus follow the sounding section, a change made in a
// section stays with it and is what the band plays, "Apply to every ..." copies it to the sections of the same name,
// and "Back to the chart's settings" forgets it. Needs the test server: cd ../lead && PORT=8500 node serve.js
const assert = require("assert"), { launch } = require("../lead/cdp.js");
(async () => {
  const b = await launch({ width: 1280, height: 1300 });
  const ev = x => b.eval(x);
  const v = id => ev(`document.getElementById("${id}").value`), txt = id => ev(`document.getElementById("${id}").textContent`), hidden = id => ev(`document.getElementById("${id}").hidden`);
  const set = (id, val, kind) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = ${JSON.stringify(val)}; e.dispatchEvent(new Event("${kind || "change"}", { bubbles: true })); })()`);
  const opts = async () => JSON.parse(await ev(`JSON.stringify(window.__btSections().opts)`));
  // wait until the section called `name` starts for the nth time since the last call
  let seen = [];
  const until = async (name, tries = 400) => { for (let i = 0; i < tries; i++){ const now = await txt("bt-secname"); if (now && now !== seen[seen.length - 1]) seen.push(now); if (now === name) return; await b.sleep(50); } throw new Error("never reached " + name + "; saw " + seen.join(", ")); };
  const snap = async () => [await v("bt-style"), await v("bt-groove"), await v("bt-bass-sound")];
  try {
    await b.goto("http://127.0.0.1:8500/tools/backing-track.html"); await b.sleep(1200);
    const bars = c => [c, c, c, c].map(x => `"${x}"z4`).join("|") + "|";
    await set("bt-abc", "X:1\nT:t\nM:4/4\nL:1/4\nQ:1/4=230\nK:C\nP:Verse\n" + bars("C") + "\nP:Chorus\n%%style bossa nova\n" + bars("Dm7") + "\nP:Verse 2\n" + bars("C") + "\nP:Chorus 2\n%%style bossa nova\n" + bars("G7") + "]", "input");
    await b.sleep(300);
    assert.deepStrictEqual(await snap(), ["swing", "auto", "upright"]); assert(await hidden("bt-sec-tools"), "nothing to say before the band plays");
    await ev(`document.getElementById("bt-play").click()`);
    await until("Verse"); assert.deepStrictEqual(await snap(), ["swing", "auto", "upright"]); assert(/tune's own settings/.test(await txt("bt-sec-note")));
    await until("Chorus"); assert.deepStrictEqual(await snap(), ["bossa", "bossa", "upright"], "the menus show the chorus's style"); assert(/as the chart sets it/.test(await txt("bt-sec-note")));
    let o = await opts(); assert.deepStrictEqual(o.sectionOverrides, {}, "showing a section's style changes nothing by itself"); assert.strictEqual(o.groove, "auto", "the tune's own settings are kept underneath");
    // a change made now belongs to this chorus
    await set("bt-bass-sound", "electric");
    o = await opts(); assert.deepStrictEqual(Object.keys(o.sectionOverrides), ["1"]); assert.deepStrictEqual([o.sectionOverrides[1].bassSound, o.sectionOverrides[1].groove, o.bassSound], ["electric", "bossa", "upright"]);
    assert(/as you changed it/.test(await txt("bt-sec-note"))); assert.strictEqual(await txt("bt-sec-apply"), 'Apply to every "Chorus" (2)'); assert(!(await hidden("bt-sec-reset")));
    await ev(`document.getElementById("bt-sec-apply").click()`);
    o = await opts(); assert.deepStrictEqual(Object.keys(o.sectionOverrides), ["1", "3"]);
    await until("Verse 2"); assert.deepStrictEqual(await snap(), ["swing", "auto", "upright"], "back to the tune's own");
    await until("Chorus 2"); assert.deepStrictEqual(await snap(), ["bossa", "bossa", "electric"], "the other chorus has the change");
    await ev(`document.getElementById("bt-sec-reset").click()`);
    assert.deepStrictEqual(await snap(), ["bossa", "bossa", "upright"]); o = await opts(); assert.deepStrictEqual(Object.keys(o.sectionOverrides), ["1"]);
    // a change in a section with no style of its own is a change to the tune
    await until("Verse"); await set("bt-vmove", "hold"); o = await opts(); assert.strictEqual(o.voiceMove, "hold"); assert.deepStrictEqual(Object.keys(o.sectionOverrides), ["1"]);
    await until("Chorus"); assert.deepStrictEqual(await snap(), ["bossa", "bossa", "electric"], "the first chorus kept its change");
    // Hold: going round one section leaves the menus alone
    await ev(`document.getElementById("bt-play").click()`); await b.sleep(300); await set("bt-hold", "hold");
    await ev(`document.getElementById("bt-play").click()`); await until("Verse");
    await ev(`document.getElementById("bt-next").click()`); await until("Chorus");
    await ev(`document.getElementById("bt-sec-reset").click()`); assert.deepStrictEqual(await snap(), ["bossa", "bossa", "upright"]);
    await ev(`(function(){ var e = document.getElementById("bt-unlock"); e.checked = true; e.dispatchEvent(new Event("change", { bubbles: true })); })()`); await set("bt-groove", "rock");
    await b.sleep(2600);                                                    // more than twice round the four bars
    assert.strictEqual(await txt("bt-secname"), "Chorus"); assert.deepStrictEqual(await snap(), ["bossa", "rock", "upright"], "still what was set");
    await ev(`document.getElementById("bt-play").click()`);
    // a different chart: the settings kept for the old sections are dropped
    await set("bt-abc", 'X:1\nT:u\nM:4/4\nL:1/4\nK:C\n"C"z4|"F"z4|"G"z4|"C"z4|]', "input"); await b.sleep(300);
    o = await opts(); assert.deepStrictEqual(o.sectionOverrides, {}); assert.strictEqual(await v("bt-style"), "swing"); assert(await hidden("bt-sec-tools"));
    assert.deepStrictEqual(b.errors.filter(e => !/supabase/i.test(e)), []);
    console.log("SECTION MENUS OK");
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
