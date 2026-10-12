// Draws the band's drum staff for a few styles on a bare page and saves a picture (a looking aid, not a test).
// From tests/band/lead with the server on 8500:  SHOT=/path/out.png node ../lessons/drumshot.cdp.js swing rock doowop
const { launch } = require("../lead/cdp.js");
(async () => { const b = await launch({ width: 1100, height: 900 }); const styles = process.argv.slice(2);
  try {
    await b.eval(`0`).catch(() => {}); await b.goto("http://127.0.0.1:8500/lessons/blues-bass.html"); await b.sleep(1500);
    const abcs = await b.eval(`(function(){ document.body.innerHTML = '<div id="out" style="background:#fff;padding:10px"></div>'; var out = [];
      ${JSON.stringify(styles)}.forEach(function (st, k){
        var bars = 'F7|F7|F7|F7|Bb7|Bb7|F7|F7|C7|Bb7|F7|C7'.split('|'), abc = 'X:1\\nM:4/4\\nL:1/4\\nK:F\\n' + bars.map(function (x){ return '"' + x + '"z4'; }).join('|') + '|]';
        var seed = 99, rng = function(){ seed = (seed + 0x6D2B79F5) | 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
        var recs = BandMidi.generate(TuneChart.parse(abc), { bars: 12, tempo: 120, opts: Object.assign({}, BandCatalog.styleOpts(st).opts, { variation: 0.6 }), rng: rng });
        var a = BandNotation.toAbc(recs, { key: "F", title: st, show: { comp: false, bass: false, drums: true }, barsPerLine: 4 });
        var d = document.createElement("div"); d.id = "p" + k; document.getElementById("out").appendChild(d); ABCJS.renderAbc(d.id, a, { staffwidth: 980 }); out.push(a); });
      return out.join("\\n\\n"); })()`);
    console.log(abcs); console.log(b.errors.filter(e => !/supabase/i.test(e)));
    if (process.env.SHOT) await b.shot(process.env.SHOT);
  } finally { await b.close(); }
})();
