// Style and Unlock are kept between visits; a 5th greyed only by default in Chord Sheet still goes to the band,
// one you click off does not. Needs the test server: cd ../lead && PORT=8500 node serve.js
const assert = require("assert"), { launch } = require("../lead/cdp.js");
(async () => {
  const b = await launch({ width: 1280, height: 1000 }), ev = x => b.eval(x), U = "http://127.0.0.1:8500/tools/";
  try {
    await b.goto(U + "backing-track.html"); await b.sleep(1200);
    await ev(`localStorage.removeItem("btStyle")`);
    await ev(`(function(){ var e = document.getElementById("bt-style"); e.value = "bossa"; e.dispatchEvent(new Event("change", { bubbles: true })); })()`);
    await ev(`(function(){ var e = document.getElementById("bt-unlock"); e.checked = true; e.dispatchEvent(new Event("change", { bubbles: true })); })()`);
    await b.goto(U + "backing-track.html"); await b.sleep(1200);
    assert.strictEqual(await ev(`document.getElementById("bt-style").value`), process.env.NEG ? "swing" : "bossa", "style kept");
    assert.strictEqual(await ev(`document.getElementById("bt-unlock").checked`), true, "unlock kept");
    await b.goto(U + "backing-track.html?style=swing"); await b.sleep(1200);
    assert.strictEqual(await ev(`document.getElementById("bt-style").value`), "swing", "?style= wins");
    await ev(`localStorage.removeItem("btStyle")`);

    // the pins the Chord Sheet hands to the band: copied aside as it writes them, read on the Backing Track page it opens
    const pins = async () => {
      await ev(`(function(){ var set = Storage.prototype.setItem; localStorage.setItem = function(k, v){ set.call(localStorage, k, v); if (k === "bandHandoff") set.call(localStorage, "bhCopy", v); }; setTimeout(function(){ document.getElementById("btn-band").click(); }, 50); })()`);
      for (let i = 0; i < 100 && !(await ev(`location.pathname.indexOf("backing-track") >= 0`).catch(() => false)); i++) await b.sleep(100);
      await b.sleep(500);
      const h = JSON.parse(await ev(`localStorage.getItem("bhCopy")`)); await ev(`localStorage.removeItem("bhCopy")`);
      return h.pins.map(p => p.midis.map(m => m % 12).sort((x, y) => x - y));
    };
    const sheet = async () => { await b.goto(U + "chord-sheet.html"); await b.sleep(1500);
      await ev(`(function(){ var t = document.getElementById("chords-textarea"); t.value = "Dm7"; t.dispatchEvent(new Event("blur")); })()`); await b.sleep(800); };
    await sheet();
    assert.deepStrictEqual((await pins())[0], [0, 2, 5, 9], "default-greyed A goes to the band");
    await sheet();
    await ev(`document.querySelector('.diagram-card .note-marker[data-pc="9"]').dispatchEvent(new MouseEvent("click", { bubbles: true }))`);   // A back in
    await ev(`document.querySelector('.diagram-card .note-marker[data-pc="9"]').dispatchEvent(new MouseEvent("click", { bubbles: true }))`);   // and off by hand
    await b.sleep(400);
    assert.deepStrictEqual((await pins())[0], [0, 2, 5], "clicked off by hand stays out");
    console.log("REMEMBER + GREYED OK");
  } finally { await b.close(); }
})().catch(e => { console.error(e.message); process.exit(1); });
