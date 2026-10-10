// The band on the carols song pages (~/Projects/carols/site/_site, built with tools/build.sh). Run from tests/band/lead.
// Serves that site itself on 8601, with the mirrored samples of lead/site/sf under /sf when they are there.
const http = require("http"), fs = require("fs"), path = require("path");
const SITE = path.join(process.env.HOME, "Projects/carols/site/_site"), SF = path.join(__dirname, "../lead/site/sf");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".mp3": "audio/mpeg" };
const server = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]);
  const f = u.startsWith("/sf/") ? path.join(SF, u.slice(4)) : path.join(SITE, u);
  fs.readFile(f, (e, d) => { if (e){ res.writeHead(404); res.end(); return; } res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }).listen(8601);
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1400, height: 1000 }); const B = "http://127.0.0.1:8601";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const key = k => ev(`document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "${k}", bubbles: true })); 0`);
  const until = async (what, ms, f) => { const t = Date.now(); let v; while (Date.now() - t < ms){ v = await ev(what); if (f(v)) return v; await b.sleep(120); } return v; };
  const current = `(function(){ var h = document.querySelector("main.content h2.current"), all = Array.prototype.slice.call(document.querySelectorAll("main.content section.level2 > h2")); return h ? all.indexOf(h) + ":" + h.textContent : ""; })()`;
  const setBox = (i, v) => ev(`(function(){ var e = document.querySelectorAll(".band-panel .band-field select, .band-panel .band-field input")[${i}]; e.value = "${v}"; e.dispatchEvent(new Event("change", { bubbles: true })); })()`);
  const status = `document.querySelector(".band-panel .midi-status").textContent`;
  try {
    await ev(`0`).catch(() => {}); await b.goto(B + "/songs/deck-the-halls.html");
    await ev(`(window.__errs = [], window.addEventListener("error", function(e){ __errs.push(e.message); }), 0)`);
    if (fs.existsSync(path.join(SF, "percussion-mp3"))) await ev(`Object.defineProperty(window, "getSoundfontUrl", { configurable: true, get: function(){ return function(){ return Promise.resolve("/sf/"); }; }, set: function(){} }); 0`);
    assert.strictEqual(await until(`!!window.carolBandAbc`, 8000, v => v), true, "band ready: " + await ev(status));
    const abc = await ev(`window.carolBandAbc`);
    assert.deepStrictEqual(abc.split("\n").filter(l => /^P:/.test(l)), ["P:Intro", "P:Verse 1", "P:Interlude", "P:Verse 2", "P:Interlude", "P:Verse 3"]);
    const form = JSON.parse(await ev(`JSON.stringify(BandHarmony.buildForm(TuneChart.parse(window.carolBandAbc), 0).map(function(b){ return (b.section != null ? "[" + b.section + "]" : "") + b.chords.map(function(c){ return c.pos + c.chord.sym; }).join(" "); }))`));
    assert.strictEqual(form.length, 4 + 16 + 4 + 16 + 4 + 20);
    assert.deepStrictEqual(form.slice(0, 8), ["[Intro]0D", "0G 2D", "0Em 2D", "0A7 2D", "[Verse 1]0D", "0Bm", "0A7 2D", "0A 2D"]);
    assert.strictEqual(form[15], "0A 1E7 2A");
    // the tune of the intro and the interludes is on its bars, for the band to play; the verses have none
    const mel = JSON.parse(await ev(`JSON.stringify(BandHarmony.buildForm(window.carolBandChart, 0).map(function(b){ return (b.melody || []).map(function(n){ return n.pos + ":" + n.midi + ":" + n.dur; }).join(" "); }))`));
    assert.strictEqual(mel[0], "0:69:1.5 1.5:67:0.5 2:66:1 3:64:1"); assert.strictEqual(mel[3], "0:62:1 1:61:1 2:62:2");
    assert.strictEqual(mel.filter(m => m).length, 12); assert.strictEqual(mel[4], ""); assert.strictEqual(mel[20], mel[0]);
    assert.strictEqual(await ev(`document.querySelectorAll(".band-panel button")[3].hidden`), false);
    // play through, fast: the words follow the band
    await setBox(0, 260); await setBox(3, 0);
    await key("p");
    assert.strictEqual(await until(current, 25000, v => /^0:/.test(v)), "0:Intro", "playing: " + await ev(status));
    assert.strictEqual(await until(current, 6000, v => /^1:/.test(v)), "1:Verse");
    assert.strictEqual(await ev(status), "Verse 1");
    // the chord being played is lit over the words, in blue, and takes no more room than before
    await ev(`document.body.classList.add("chords"); 0`);
    const lit = JSON.parse(await until(`JSON.stringify((function(){ var e = document.querySelector(".ch.now"); if (!e) return null; var w = e.getBoundingClientRect().width; e.classList.remove("now"); var w0 = e.getBoundingClientRect().width; e.classList.add("now"); return [e.closest("section").id, getComputedStyle(e).color, w === w0, getComputedStyle(document.querySelector(".ch:not(.now)")).color]; })())`, 4000, v => v !== "null"));
    assert.deepStrictEqual(lit, ["verse-1", "rgb(13, 110, 253)", true, "rgb(180, 83, 31)"]);
    await ev(`document.body.classList.remove("chords"); 0`);
    // words alone: the words under the chord flash and fade instead
    assert.strictEqual(await until(`(function(){ var e = document.querySelector(".cw.flash"); return e ? getComputedStyle(e).animationName + "|" + getComputedStyle(e).animationDuration + "|" + !!e.querySelector(".ch.now, .ch") : ""; })()`, 4000, v => v), "carol-flash|1s|true");
    assert.strictEqual(await until(current, 18000, v => /^2:/.test(v)), "2:Interlude");
    // a click in the section list sends the band there
    await ev(`document.querySelectorAll(".song-sections button")[5].click(); 0`);
    assert.strictEqual(await until(current, 4000, v => /^5:/.test(v)), "5:Verse");
    await key("p"); await b.sleep(300); assert.strictEqual(await ev(status), "");
    // hold: the intro goes round until j
    await key("h"); assert.strictEqual(await ev(`document.querySelectorAll(".band-panel button")[1].getAttribute("aria-pressed")`), "true");
    await key("g"); await key("p"); await until(status, 8000, v => /Intro/.test(v)); await b.sleep(6000);          // more than one pass of four bars
    assert.strictEqual(await ev(current), "0:Intro"); assert(/going round/.test(await ev(status)));
    await key("d"); await key("j"); assert(/moving on/.test(await ev(status)));
    assert.strictEqual(await until(current, 5000, v => /^1:/.test(v)), "1:Verse");
    await key("p"); await key("h");
    // not playing: j is the page's own again
    await key("j"); assert.strictEqual(await ev(current), "2:Interlude");
    assert.strictEqual(await ev(`document.querySelectorAll(".ch.now").length`), 0);
    // Section Navigation and Display style are folded until asked for
    assert.deepStrictEqual(JSON.parse(await ev(`JSON.stringify(Array.prototype.map.call(document.querySelectorAll("#quarto-margin-sidebar .section-buttons-title"), function(t){ return t.textContent + (t.parentNode.classList.contains("folded") ? " -" : " +"); }))`)), ["Sections +", "Section Navigation -", "Band +", "Tap in the bars -", "Display style -", "Pedal +"]);
    await ev(`document.querySelector(".type-panel .section-buttons-title").click(); 0`); assert.strictEqual(await ev(`document.querySelector(".type-panel").classList.contains("folded") + "|" + document.getElementById("type-chordColour").value`), "false|rust");
    // Play starts at the section the page is on; a click on a chord starts at that chord's bar
    await ev(`document.querySelectorAll(".song-sections button")[3].click(); 0`); assert.strictEqual(await ev(current), "3:Verse");
    await key("p"); assert.strictEqual(await until(status, 8000, v => /Verse/.test(v)), "Verse 2"); assert.strictEqual(await ev(current), "3:Verse");
    await ev(`document.body.classList.add("chords"); window.__ch = document.querySelectorAll("#verse-3 .ch")[9]; __ch.click(); 0`);      // the tenth chord of verse 3: bar 5
    assert.strictEqual(await until(`document.querySelector(".ch.now") === window.__ch`, 8000, v => v), true, "the clicked chord is the first one lit");
    assert.strictEqual(await ev(status), "Verse 3"); await key("p");
    // the Backing Track page in its own window (the test server's copy, on 8500) plays instead, and this page follows it
    if (process.env.REMOTE !== "0"){
      await ev(`localStorage.setItem("carols-music-url", "http://127.0.0.1:8500"); 0`); await ev(`document.querySelectorAll(".song-sections button")[0].click(); 0`);
      await key("w"); assert(/window is playing/.test(await until(status, 15000, v => /window is playing|could not/.test(v))), "the other window took the song: " + await ev(status));
      await key("p"); assert.strictEqual(await until(current, 40000, v => /^1:/.test(v)), "1:Verse", "following the other window: " + await ev(status));
      assert.strictEqual(await ev(`document.querySelectorAll(".band-panel button")[0].textContent`), "Stop p");
      await key("w"); await b.sleep(400); assert.strictEqual(await ev(`document.querySelectorAll(".band-panel button")[0].textContent`), "Play p");
      await ev(`localStorage.removeItem("carols-music-url"); 0`);
    }
    assert.deepStrictEqual(JSON.parse(await ev(`JSON.stringify(window.__errs)`)), []);

    await b.goto(B + "/songs/feliz-navidad.html"); await until(`!!window.carolBandAbc`, 8000, v => v);
    const fz = await ev(`window.carolBandAbc`);
    assert.strictEqual(fz.split("\n").filter(l => /^P:/.test(l)).join(" "), "P:Verse P:Verse P:Chorus P:Interlude P:Verse P:Verse P:Chorus");
    assert.strictEqual(await ev(`BandHarmony.buildForm(TuneChart.parse(window.carolBandAbc), 0).length`), 56);
    assert.strictEqual(await ev(`document.querySelectorAll(".band-panel .band-field select")[0].value`), "strum");
    // a song with no bars has no panel
    await b.goto(B + "/songs/silent-night.html"); await b.sleep(600); assert.strictEqual(await ev(`document.querySelectorAll(".band-panel:not(.tap-panel)").length`), 0);
    console.log("CAROLS BAND OK");
  } catch (e) { console.log("FAILED:", e.message); process.exitCode = 1; } finally { await b.close(); server.close(); }
})();
