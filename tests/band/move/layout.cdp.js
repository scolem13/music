// Real pages: Play panel on top, collapsible sections, cymbal options in the drum mixer with ride and
// crash at 35%, the guitar hand-off after switching instrument, and the Chord Sheet notation toggle.
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1100 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(6000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const set = (id, val) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = "${val}"; e.dispatchEvent(new Event("change", { bubbles:true })); })()`);
  const waitFor = async (expr, ms, what) => { const t = Date.now(); for (;;) { try { if (await ev(expr)) return; } catch (e) {} if (Date.now() - t > ms) throw new Error("timeout " + what); await b.sleep(100); } };
  try {
    await b.goto(B + "/tools/backing-track.html"); await b.sleep(1000);
    const lay = JSON.parse(await ev(`JSON.stringify({ first: document.querySelector("#bt-root > *").querySelector("#bt-play") ? "play" : "other",
      playCollapsible: !!document.getElementById("bt-play").closest("details"),
      sections: Array.from(document.querySelectorAll("#bt-root > details")).map(function(d){ return d.querySelector("summary").textContent.trim() + (d.open ? "+" : "-"); }),
      infosOpen: Array.from(document.querySelectorAll("#bt-root details.bt-info")).filter(function(d){ return d.open; }).length, infos: document.querySelectorAll("#bt-root details.bt-info").length,
      cymInKit: !!document.getElementById("bt-ride").closest("#bt-kit") && !!document.getElementById("bt-ride-sound").closest("#bt-kit"),
      kit: Array.from(document.querySelectorAll("#bt-kit-faders input")).map(function(i){ return i.id.slice(7) + "=" + i.value; }).join(" "),
      playAboveChart: document.getElementById("bt-play").getBoundingClientRect().top < document.getElementById("bt-chart").getBoundingClientRect().top })`));
    console.log(JSON.stringify(lay));
    assert.strictEqual(lay.first, "play"); assert(!lay.playCollapsible && lay.playAboveChart && lay.cymInKit);
    assert.deepStrictEqual(lay.sections, ["About this page-", "Chart+", "Band+", "Mixer+", "Practice+", "Save and load-", "Notation-", "Export MIDI-", "Edit the changes (ABC)-"]);
    assert(lay.infos >= 5 && lay.infosOpen === 0, "info sections start collapsed");
    assert.strictEqual(lay.kit, "kick=100 snare=100 hat=100 ride=53 crash=53 toms=100");
    // gains: ride and crash at (53/100)^2, others 1
    await ev(`(function(){ var mk = BandSounds.create; window.__plays = []; BandSounds.create = function(ctx){ var bank = mk(ctx), play = bank.play;
      bank.play = function(inst, spec){ window.__plays.push({ inst: inst, piece: spec.piece, gain: spec.gain }); return play.apply(bank, arguments); }; return bank; }; })()`);
    await set("bt-changes", "watermelon"); await set("bt-countin", "0"); await set("bt-tempo-n", "280");
    await ev(`document.getElementById("bt-play").click()`);
    await waitFor(`/Chorus 2 · bar 2/.test(document.getElementById("bt-status").textContent)`, 40000, "a chorus on piano");
    await ev(`document.getElementById("bt-play").click()`); await b.sleep(300);
    const g = JSON.parse(await ev(`JSON.stringify(window.__plays.filter(function(p){ return p.piece; }).reduce(function(m, p){ m[p.piece] = p.gain; return m; }, {}))`)); console.log("kit gains:", JSON.stringify(g));
    assert(Math.abs(g.ride - 0.2809) < 1e-6 && Math.abs(g.crash - 0.2809) < 1e-6 && g.kick === 1 && g.rim === 1);
    // more voicings ticked: the band's style becomes a combination, and Auto switches the ticks off
    await set("bt-comp", "guitar"); await set("bt-voicing", "guide2");
    await ev(`(function(){ var c = document.querySelector('#bt-voicing-extra input[value="top3"]'); c.checked = true; c.dispatchEvent(new Event("change", { bubbles:true })); })()`);
    assert.strictEqual(await ev(`document.getElementById("bt-voicing-more-sum").textContent`), "Voicings: also using 1 more");
    await ev(`window.__plays.length = 0; document.getElementById("bt-play").click()`);
    await waitFor(`/Chorus 2 · bar 2/.test(document.getElementById("bt-status").textContent)`, 40000, "a chorus with two voicing styles");
    await ev(`document.getElementById("bt-play").click()`); await b.sleep(300);
    await ev(`window.open = function(){ return window; }; document.getElementById("bt-send").click()`);
    const sent = JSON.parse(await ev(`JSON.stringify({ voicing: window.__btLastHandoff.voicing, sizes: window.__btLastHandoff.chords.map(function(c){ return c.midis.length; }) })`)); console.log("combined:", JSON.stringify(sent));
    assert.strictEqual(sent.voicing, "guide2+top3"); assert(sent.sizes.every(n => n === 2 || n === 3));
    await set("bt-voicing", "auto"); assert.strictEqual(await ev(`document.querySelector('#bt-voicing-extra input[value="top3"]').disabled`), true);
    await set("bt-comp", "piano");
    // collapse a section; it stays collapsed after a reload
    await ev(`document.getElementById("bt-sec-band").open = false`); await b.sleep(200);
    // piano was played; switch to guitar and send: the Chord Sheet must show guitar
    await set("bt-comp", "guitar");
    await ev(`window.open = function(u){ setTimeout(function(){ location.href = u; }, 50); return window; }; document.getElementById("bt-send").click()`);
    console.log("note:", await ev(`document.getElementById("bt-send-note").textContent`).catch(() => ""));
    await waitFor(`location.pathname.indexOf("chord-sheet") >= 0 && document.readyState === "complete"`, 15000, "arrive at chord sheet");
    await waitFor(`document.querySelectorAll(".diagram-card .notation-wrap svg").length > 0`, 15000, "notation drawn");
    await b.sleep(600);
    const cs = JSON.parse(await ev(`JSON.stringify({ guitar: document.querySelector('[data-inst-id="guitar"]').checked, keyboard: document.querySelector('[data-inst-id="keyboard"]').checked,
      heading: Array.from(document.querySelectorAll(".inst-heading")).map(function(h){ return h.textContent; }).join(" / "), caps: document.querySelectorAll(".notation-cap").length,
      staffW: Math.round(document.querySelector(".diagram-card .notation-wrap svg").getBoundingClientRect().width), btn: document.getElementById("btn-notation").textContent,
      title: +document.querySelector(".diagram-card svg text.diagram-title").getAttribute("font-size"), strings: Array.from(document.querySelectorAll(".diagram-card")).map(function(c){ return c.querySelectorAll("circle.note-marker").length; }).join(",") })`));
    console.log("chord sheet:", JSON.stringify(cs));
    assert(cs.guitar && !cs.keyboard, "guitar shown, not piano"); assert(/Guitar/.test(cs.heading) && /octave above/.test(cs.heading)); assert.strictEqual(cs.caps, 1, "the octave note appears once");
    assert(cs.staffW <= 146, "staff is 80% of 180px: " + cs.staffW); assert.strictEqual(cs.btn, "Hide notation"); assert.strictEqual(cs.title, 27);
    await b.shot("sheet-guitar.png");
    await ev(`document.getElementById("btn-notation").click()`); await b.sleep(500);
    assert.strictEqual(await ev(`document.querySelectorAll(".diagram-card .notation-wrap").length`), 0, "notation hidden"); assert.strictEqual(await ev(`document.querySelectorAll(".notation-cap").length`), 0);
    assert.strictEqual(await ev(`document.getElementById("btn-notation").textContent`), "Show notation");
    await b.goto(B + "/tools/backing-track.html"); await b.sleep(900);
    assert.strictEqual(await ev(`document.getElementById("bt-sec-band").open`), false, "the section stayed collapsed"); 
    await ev(`localStorage.removeItem("btSections")`); await b.goto(B + "/tools/backing-track.html"); await b.sleep(900); await b.shot("layout.png"); await b.resize(390, 800); await b.sleep(300); await b.shot("layout-phone.png");
    assert.strictEqual(await ev(`document.documentElement.scrollWidth <= 392`), true, "no sideways scroll on a phone");
    const errs = b.errors.filter(e => !/supabaseUrl|createClient/.test(e)); assert.strictEqual(errs.length, 0, JSON.stringify(errs)); console.log("LAYOUT OK");
  } finally { await b.close(); } })().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
