// The Backing Track page: the lock icon, the genre filter while unlocked, voicing blend sliders, the walk slider and a section in a style of its own.
// Run from tests/band/styles after `quarto render tools/backing-track.qmd`.
const http = require("http"), fs = require("fs"), path = require("path");
const SITE = path.join(__dirname, "../../../_site");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
const server = http.createServer((req, res) => { const f = path.join(SITE, decodeURIComponent(req.url.split("?")[0]));
  fs.readFile(f, (e, d) => { if (e){ res.writeHead(404); res.end(); return; } res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }).listen(8604);
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1400, height: 1000 });
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const set = (id, v, type) => ev(`(function(){ var e = document.getElementById("${id}"); ${type === "check" ? `e.checked = ${v}` : `e.value = ${JSON.stringify(v)}`}; e.dispatchEvent(new Event("${type === "input" ? "input" : "change"}", { bubbles: true })); })()`);
  const opts = id => ev(`JSON.stringify(Array.prototype.map.call(document.getElementById("${id}").options, function(o){ return o.value; }))`).then(JSON.parse);
  try {
    await ev(`0`).catch(() => {}); await b.goto("http://127.0.0.1:8604/tools/backing-track.html");
    await ev(`(window.__errs = [], window.addEventListener("error", function(e){ __errs.push(e.message); }), 0)`);
    await b.sleep(800);
    await set("bt-style", "hymn");
    assert.strictEqual(await ev(`document.getElementById("bt-lock-icon").textContent`), "\u{1F512}");
    assert.strictEqual(await ev(`document.getElementById("bt-genre").hidden`), true);
    assert(!(await opts("bt-groove")).includes("bossa"));
    await set("bt-unlock", true, "check");
    assert.strictEqual(await ev(`document.getElementById("bt-lock-icon").textContent`), "\u{1F513}");
    assert.strictEqual(await ev(`document.getElementById("bt-genre").hidden`), false);
    assert.deepStrictEqual(await opts("bt-genre"), ["", "Jazz", "Latin", "Caribbean", "Folk, rock and pop", "Hymns and carols"]);
    const all = await opts("bt-groove"); assert(all.includes("bossa") && all.includes("rock"));
    await set("bt-genre", "Latin");
    const latin = await opts("bt-groove"); console.log("grooves under Latin:", latin.join(" "));
    assert(latin.includes("bossa") && latin.includes("clave") && latin.includes("none") && !latin.includes("rock") && !latin.includes("auto"));
    assert.strictEqual(await ev(`document.getElementById("bt-groove").value`), "none");            // (what was in use stays)
    await set("bt-groove", "clave");
    assert.strictEqual(await ev(`document.getElementById("bt-bass").value`), "held");
    assert((await opts("bt-rhythm")).includes("montuno") && !(await opts("bt-rhythm")).includes("strumCamp"));
    await set("bt-genre", "");
    assert.strictEqual(await ev(`document.getElementById("bt-groove").value`), "clave");
    // voicings: tick a second one, and each gets a slider
    await set("bt-style", "swing");
    const sliders = `Array.prototype.filter.call(document.querySelectorAll("#bt-voicing-extra .bt-mixw"), function(s){ return !s.hidden; }).length`;
    assert.strictEqual(await ev(sliders), 0);
    const main = await ev(`document.getElementById("bt-voicing").value`);
    await ev(`(function(){ var c = Array.prototype.filter.call(document.querySelectorAll("#bt-voicing-extra input[type=checkbox]"), function(x){ return !x.disabled; })[0]; c.checked = true; c.dispatchEvent(new Event("change", { bubbles: true })); window.__second = c.value; })()`);
    assert.strictEqual(await ev(sliders), 2);
    assert(/blend of 2/.test(await ev(`document.getElementById("bt-voicing-more-sum").textContent`)));
    await ev(`(function(){ var s = document.querySelector('#bt-voicing-extra .bt-mixw[data-id="' + window.__second + '"]'); s.value = 0; s.dispatchEvent(new Event("input", { bubbles: true })); })()`);
    // the walk slider: only for Walking and In two; it goes home when the line changes
    assert.strictEqual(await ev(`document.getElementById("bt-walk-field").hidden`), false);
    assert.strictEqual(await ev(`document.getElementById("bt-walk").value`), "100");
    await set("bt-bass", "two"); assert.strictEqual(await ev(`document.getElementById("bt-walk").value`), "0");
    await set("bt-walk", "40", "input");
    await set("bt-style", "rock"); assert.strictEqual(await ev(`document.getElementById("bt-walk-field").hidden`), true);
    // a section in a style of its own
    await ev(`(function(){ var t = document.getElementById("bt-abc"); t.value = 'X:1\\nM:4/4\\nL:1/8\\nK:C\\nP:Verse\\n"C"z8 | "F"z8 |\\nP:Bridge\\n%%style bossa nova\\n"Dm7"z8 | "G7"z8 |'; t.dispatchEvent(new Event("input", { bubbles: true })); })()`);
    await b.sleep(600);
    const note = await ev(`document.getElementById("bt-abc-note").textContent`); console.log(note);
    assert(/Bridge \(bossa nova\)/.test(note));
    assert.strictEqual(await ev(`document.getElementById("bt-style").value`), "rock");                 // (the section's style is not the tune's)
    await ev(`(function(){ var t = document.getElementById("bt-abc"); t.value = t.value.replace("bossa nova", "polka dots"); t.dispatchEvent(new Event("input", { bubbles: true })); })()`);
    await b.sleep(600); assert(/No style called "polka dots"/.test(await ev(`document.getElementById("bt-abc-note").textContent`)));
    assert.deepStrictEqual(JSON.parse(await ev(`JSON.stringify(__errs)`)), []);
    console.log("STYLES PAGE OK");
  } catch (e) { console.error("FAILED", e.message); process.exitCode = 1; }
  finally { await b.close(); server.close(); }
})();
