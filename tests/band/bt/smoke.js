const { launch } = require("../lead/cdp.js");
(async () => {
  const b = await launch({ width: 1280, height: 900 });
  const $v = id => `document.getElementById(${JSON.stringify(id)})`;
  const set = (id, v) => b.eval(`(function(){ var e = ${$v(id)}; e.value = ${JSON.stringify(String(v))}; e.dispatchEvent(new Event("change", { bubbles:true })); })()`);
  const chords = () => b.eval(`Array.from(document.querySelectorAll('#bt-chart .tc-bar[data-bar]')).map(function(c){ return Array.from(c.querySelectorAll('.tc-chord')).map(function(x){ return x.textContent; }).join(' '); }).join(' | ')`);
  try {
    await b.goto("http://127.0.0.1:8500/tools/backing-track.html"); await b.sleep(1000);
    console.log("piano menu", await b.eval(`Array.from(${$v("bt-voicing")}.options).map(o=>o.value+'='+o.textContent).join(', ')`), "sel", await b.eval(`${$v("bt-voicing")}.value`));
    console.log(await chords());
    await set("bt-changes","jazz");
    for (const m of ["only","both","off"]) { await set("bt-roman", m); console.log(m, await chords()); }
    await set("bt-roman","both");
    for (const f of ["bb","eb"]) { await set("bt-chartfor", f); console.log(f, await chords(), "|", await b.eval(`document.querySelector('#bt-chart .tc-meta').textContent`)); }
    console.log(b.errors.filter(e=>!/supabaseUrl|favicon/.test(e)));
  } finally { await b.close(); }
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
