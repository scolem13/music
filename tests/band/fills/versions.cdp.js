// Other versions of a song's changes on a carols song page (~/Projects/carols/site/band.html, teacher.html). Run from tests/band/fills.
const http = require("http"), fs = require("fs"), path = require("path");
const SITE = path.join(process.env.HOME, "Projects/carols/site/_site");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
const MUSIC = path.join(__dirname, "../../../_site");      // (the Backing Track page, from the same origin so the test can look inside its window)
const server = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); let f = path.join(SITE, u);
  if (!fs.existsSync(f)) f = path.join(MUSIC, u);
  fs.readFile(f, (e, d) => { if (e){ res.writeHead(404); res.end(); return; } res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }).listen(8603);
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1400, height: 1000 }); const B = "http://127.0.0.1:8603/songs/winter-wonderland.html";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const key = k => ev(`document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "${k}", bubbles: true })); 0`);
  const until = async (what, ms, f) => { const t = Date.now(); let v; while (Date.now() - t < ms){ v = await ev(what); if (f(v)) return v; await b.sleep(60); } return v; };
  const ready = () => until(`!!window.carolBandAbc`, 15000, v => v);
  const chords = n => ev(`JSON.stringify(Array.prototype.map.call(window.carolSong.section(${n}).querySelectorAll(".ch"), function(e){ return e.textContent + (e.classList.contains("held") ? "~" : "") + (e.classList.contains("alt") ? "*" : ""); }))`).then(JSON.parse);
  const shown = `getComputedStyle(document.querySelector(".band-version")).display !== "none"`;
  try {
    await ev(`0`).catch(() => {}); await b.goto(B);
    await ev(`(window.__errs = [], window.addEventListener("error", function(e){ __errs.push(e.message); }), 0)`);
    assert.strictEqual(await ready(), true);
    const written = await chords(0), abc0 = await ev(`window.carolBandAbc`);
    assert.deepStrictEqual(written, ["Eb", "Gm", "Cm", "Fm", "Bb", "Gm", "D9", "Gm7", "C9#5", "F9", "Bb7", "Eb"]);
    assert.strictEqual(await ev(shown), true);                       // (127.0.0.1 is the teacher's own machine)
    assert.strictEqual(await ev(`document.querySelector(".band-version select").value`), "");
    await key("v");
    assert.strictEqual(await ev(`document.querySelector(".band-version select").value`), "Songbook");
    console.log((await chords(0)).join(" "));
    assert.deepStrictEqual(await chords(0), ["Eb", "Eb~*", "Eb~*", "Bb7*", "Bb7~*", "Bb7~*", "Fm*", "Bb7*", "Fm*", "F7*", "Bb7", "Eb"]);
    assert.deepStrictEqual((await chords(2)).slice(0, 3), ["G*", "D7*", "G*"]);
    assert(/Tonic for two bars/.test(await ev(`document.querySelector(".band-version-note").textContent`)));
    assert(/"Bb7"z4"Fm"z4/.test(await ev(`window.carolBandAbc`)));
    await key("v");
    console.log((await chords(0)).join(" ")); console.log((await chords(2)).join(" "));
    assert.deepStrictEqual((await chords(2)).slice(0, 3), ["Gmaj7*", "Am7*", "Gmaj7*"]);
    assert.strictEqual(await ev(`document.querySelector(".band-more select").value`), "swing");
    await key("v");
    assert.deepStrictEqual(await chords(0), written);
    assert.strictEqual(await ev(`window.carolBandAbc`), abc0);
    assert.notStrictEqual(await ev(`document.querySelector(".band-more select").value`), null);
    // the Backing Track page in its own window: its menu, and its ABC edited by hand, relabel the words here
    const status = `document.querySelector(".band-panel .midi-status").textContent`;
    const far = x => ev(`(function(){ var w = window.open("", "carols-backing-track"), $ = function(id){ return w.document.getElementById(id); }; return ${x}; })()`);
    await ev(`localStorage.setItem("carols-music-url", "http://127.0.0.1:8603"); 0`);
    await key("w"); assert(/window is playing/.test(await until(status, 20000, v => /window is playing|could not/.test(v))), "the other window took the song: " + await ev(status));
    assert.strictEqual(await far(`$("bt-remote-versions").hidden`), false);
    assert.strictEqual(await far(`Array.prototype.map.call($("bt-remote-version").options, function(o){ return o.value; }).join()`), ",Songbook,Jazz ii-V,*");
    await far(`($("bt-remote-version").value = "Songbook", $("bt-remote-version").dispatchEvent(new w.Event("change")), 0)`);
    await until(`document.querySelector(".band-version select").value`, 4000, v => v === "Songbook");
    assert.deepStrictEqual((await chords(0)).slice(0, 4), ["Eb", "Eb~*", "Eb~*", "Bb7*"]);
    await key("v");                                                   // chosen here: that window takes it
    assert.strictEqual(await until(`0`, 1, () => true) || await (async () => { await b.sleep(500); return far(`$("bt-remote-version").value`); })(), "Jazz ii-V");
    assert(/"Ebmaj7"z4"C7b9"z4/.test(await far(`$("bt-abc").value`)));
    await far(`($("bt-abc").value = $("bt-abc").value.replace('"C7b9"', '"Gb7"'), $("bt-abc").dispatchEvent(new w.Event("input")), 0)`);
    await until(`document.querySelector(".band-version select").value`, 4000, v => v === "*");
    console.log((await chords(0)).join(" "));
    assert.deepStrictEqual((await chords(0)).slice(0, 4), ["Ebmaj7*", "Ebmaj7~*", "Gb7*", "Fm7*"]);
    assert.strictEqual(await far(`$("bt-remote-version").value`), "*");
    await far(`($("bt-remote-version").value = "", $("bt-remote-version").dispatchEvent(new w.Event("change")), 0)`);
    await until(`document.querySelector(".band-version select").value`, 4000, v => v === "");
    assert.deepStrictEqual(await chords(0), written);
    await key("w"); await b.sleep(300);
    // a student: nothing of it shows, v does nothing, and the page opens as written
    await b.goto(B + "?teacher=0"); await ready();
    assert.strictEqual(await ev(shown), false);
    assert.strictEqual(await ev(`!!document.querySelector(".tap-panel")`), false);
    await key("v"); assert.deepStrictEqual(await chords(0), written);
    await b.goto(B + "?teacher=1"); await ready();
    assert.strictEqual(await ev(shown), true);
    assert.strictEqual(await ev(`!!document.querySelector(".tap-panel")`), true);
    assert.deepStrictEqual(await chords(0), written);                 // (a version is never kept)
    assert.deepStrictEqual(JSON.parse(await ev(`JSON.stringify(__errs || [])`).catch(() => "[]")), []);
    console.log("VERSIONS OK");
  } catch (e) { console.error("FAILED", e.message); process.exitCode = 1; }
  finally { await b.close(); server.close(); }
})();
