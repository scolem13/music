// Panel keys (apps/shared/lessons/panel-keys.js) on the B3 panel of lessons/organ-compare.html, with real key events (CDP Input):
// Piano mode leaves the keys to the page's QWERTY piano; ` = left hand, \ = right hand; leader u + position + digit sets a drawbar;
// nudge, choices, Backspace undo, Space held = Leslie fast and back, snapshots save / load; the letters show on the panel; the
// read-only (translation) panel gets none; while a Panel mode is on the piano stays quiet.
// Run after rendering (or copying the three files into _site): node tests/lessons/panel-keys.cdp.js   (NEG=1 must fail; SITE=<dir>)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const PORT = 8579;
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
const CODE = { "`": "Backquote", "\\": "Backslash", " ": "Space", ",": "Comma", ".": "Period", ";": "Semicolon", Escape: "Escape", Backspace: "Backspace" };
const codeOf = k => CODE[k] || (/^\d$/.test(k) ? "Digit" + k : "Key" + k.toUpperCase());
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] }); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  const down = (k, mod = 0) => b.send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code: codeOf(k), modifiers: mod, text: k.length === 1 && k !== " " ? k : undefined });
  const up = (k, mod = 0) => b.send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code: codeOf(k), modifiers: mod });
  const press = async (keys, mod = 0) => { for (const k of keys) { await down(k, mod); await up(k, mod); } await b.sleep(40); };
  const st = k => b.eval(`OrganCompare.widgets[0].st.b3[${JSON.stringify(k)}]`);
  await b.resize(1400, 950);
  if (!fs.existsSync(SITE + "/lessons/organ-compare.html")) check("rendered", false, "no organ-compare.html in " + SITE);
  else {
    await b.goto(`http://127.0.0.1:${PORT}/lessons/organ-compare.html`); await b.sleep(1200);
    await b.eval(`localStorage.removeItem('panel-keys-hand'); localStorage.removeItem('panel-keys-snap:organ-b3'); FaithfulPanel.setMview('panel'); OrganCompare.widgets[0].pick('b3','pipe')`); await b.sleep(1200);
    await b.eval(`window.PanelKeys && PanelKeys.setHand(null)`);
    const m0 = await b.eval(`({ pk: !!window.PanelKeys, n: PanelKeys.state().n, strip: document.querySelectorAll('.ocmp-panel:not(.ocmp-b) .pk-strip').length, ro: document.querySelectorAll('.ocmp-b .pk-strip').length, mode: PanelKeys.mode() })`);
    check("loaded on the B3 panel, strip shown, none on the read-only side, Piano mode by default", m0.pk && m0.n >= 1 && m0.strip === 1 && m0.ro === 0 && m0.mode === "piano", JSON.stringify(m0));
    // Piano mode: a letter plays the page's piano, not the panel
    await b.eval(`(() => { const v = OrganCompare.widgets[0]; window.__on = 0; const vo = v.v && v.v.b3; })()`);
    const db0 = await st("uB.0");
    await press(["u", "a", "3"]);
    check("Piano mode: u a 3 leaves the drawbars alone", (await st("uB.0")) === db0, db0);
    await press(["`"]);
    check("` = left hand", (await b.eval(`PanelKeys.mode()`)) === "L");
    await b.eval(`OrganCompare.widgets[0].set('b3','upre','B')`);
    await press(["u", "a", "3"]);
    check("left: u a 3 sets upper B drawbar 16′ to 3", (await st("uB.0")) === 3, await st("uB.0"));
    await press(["s", "8"]);
    check("left: s (position 2) 8 sets 5⅓′ to 8", (await st("uB.1")) === 8, await st("uB.1"));
    await press(["d"]); const a1 = await st("uB.1"); await press(["f"]); await press(["f"]);
    check("left d / f (mirrored k / j) nudge down / up (clamped at 8)", a1 === 8 && (await st("uB.1")) === 6, a1 + " -> " + (await st("uB.1")));
    await press(["Backspace"]);
    check("Backspace undoes the nudges", (await st("uB.1")) === 8, await st("uB.1"));
    const lay = await b.eval(`(() => { const L = document.querySelector('.ocmp-panel:not(.ocmp-b) .pk-layer'); return L ? { lead: L.querySelectorAll('.pk-lead').length, pos: L.querySelectorAll('.pk-pos').length, ring: L.querySelectorAll('.pk-ring').length, strip: document.querySelector('.pk-strip').textContent } : null; })()`);
    check("letters on the panel: 6 leaders, positions, one ring; the strip names the control", lay && lay.lead === 6 && lay.pos >= 30 && lay.ring === 1 && /Upper drawbars/.test(lay.strip), JSON.stringify(lay));
    await press(["Escape", "Escape", "p", "s", "d"]);
    check("Esc Esc then p s d: percussion volume steps on", (await st("percVol")) !== undefined && (await b.eval(`PanelKeys.state().grab`)) === "percVol", await st("percVol"));
    await press(["Escape", "Escape", "s", "a"]); await b.eval(`OrganCompare.widgets[0].set('b3','leslie','slow')`);
    await down(" "); await b.sleep(60); const held = await st("leslie"); await up(" "); await b.sleep(60);
    check("Space held = Leslie fast, let go = back", held === "fast" && (await st("leslie")) === "slow", held + " / " + (await st("leslie")));
    await press(["Escape", "Escape"]); await press(["5"], 8);   // Shift+5 saves
    await b.eval(`OrganCompare.widgets[0].set('b3','uB.0',0)`); await press(["5"]);
    check("Shift + 5 saves, 5 loads the snapshot", (await st("uB.0")) === 3, await st("uB.0"));
    await press(["`"]); await press(["\\"]);
    check("\\ = right hand", (await b.eval(`PanelKeys.mode()`)) === "R");
    await press(["u", "l", "7", "k", "j"]);
    check("right: u l 7 (k up, j down) sets 5⅓′ to 7", (await st("uB.1")) === 7, await st("uB.1"));
    await press(["Escape", "Escape", "\\"]);
    check("\\ again = back to Piano", (await b.eval(`PanelKeys.mode()`)) === "piano");
    if (process.env.SHOT) { await press(["`", "u", "d"]); await b.shot(process.env.SHOT); await press(["Escape", "Escape", "`"]); }
    const errs = b.errors.filter(e => !/supabase/i.test(e)); check("no page errors (the site-wide supabase one aside)", errs.length === 0, errs.slice(0, 3).join(" | "));
  }
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all ok"); process.exit(fails ? 1 : 0);
})();
