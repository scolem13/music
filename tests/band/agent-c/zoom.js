const { launch } = require("./cdp.js"), path = require("path");
(async () => { const b = await launch();
  try { await b.goto("http://127.0.0.1:8310/__c/chord-sheet.html"); await b.eval("localStorage.clear()"); await b.goto("http://127.0.0.1:8310/__c/chord-sheet.html");
    await b.eval(`(()=>{const ta=document.getElementById('chords-textarea');ta.value='Dm7 G7 Cmaj7 Bb13';ta.dispatchEvent(new Event('blur'));
      const kb=document.querySelector('[data-inst-id="keyboard"]');kb.checked=false;kb.dispatchEvent(new Event('change',{bubbles:true}));
      const g=document.querySelector('[data-inst-id="guitar"]');g.checked=true;g.dispatchEvent(new Event('change',{bubbles:true}));
      const s=[...g.closest('.inst-row').querySelectorAll('select.tuning-sel')].pop();s.value='drop3';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await new Promise(r => setTimeout(r, 600));
    await b.send("Emulation.setDeviceMetricsOverride", { width: 1500, height: 1100, deviceScaleFactor: 2.5, mobile: false });
    await b.shot(path.join(__dirname, "shots", "zoom-drop3.png"), ".chord-grid");
    // the instrument row with the style menu open-ish: list its options as rendered text
    console.log(await b.eval(`[...document.querySelector('[data-inst-id="guitar"]').closest('.inst-row').querySelectorAll('select.tuning-sel')].pop().innerHTML.replace(/<option/g,'\\n<option')`));
    console.log("errors:", b.errors.filter(e => !/favicon/.test(e)));
  } finally { await b.close(); } })();
