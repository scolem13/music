// Prophet-5 guide patches (apps/shared/lessons/prophet-sheets.js): every setting is a real control of SynthCompare.PROFILES.prophet
// in range, every quote is in the guide's text, every unprinted reading is marked approx, and the sheets reach SynthCompare.EXAMPLES.
// node tests/lessons/prophet-sheets.test.js     (NEG=1 must fail: a quote changed and a printed number changed)
const fs = require('fs'), path = require('path'), os = require('os');
const root = path.join(__dirname, '../..'), NEG = process.env.NEG === '1';
const SC = require(root + '/apps/shared/lessons/synth-compare.js'), PS = require(root + '/apps/shared/lessons/prophet-sheets.js');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } else console.log('ok   ' + m); };
const P = SC.PROFILES.prophet, ctl = {};
P.groups.forEach(g => g[2].forEach(c => { ctl[c[0]] = c; }));
const sheets = JSON.parse(JSON.stringify(PS.SHEETS));
if (NEG) { sheets[4].quote[0] = 'Set filter cutoff to 4.'; sheets[4].s.cutoff = 4; }
const txtF = path.join(os.homedir(), 'Documents/Manuals/synths/Prophet-5-Rev4-Users-Guide.txt');
const txt = fs.existsSync(txtF) ? fs.readFileSync(txtF, 'utf8') : null;
if (!txt) console.log('note the guide text is not on this machine: quotes not checked');
ok(sheets.length >= 10 && new Set(sheets.map(s => s.id)).size === sheets.length, sheets.length + ' sheets, ids unique');
for (const sh of sheets) {
  ok(/^pp?\. \d/.test(sh.pages) && sh.quote.length, sh.id + ': has pages (' + sh.pages + ') and quotes');
  for (const k in sh.s) {
    const c = ctl[k], v = sh.s[k];
    const good = c && (c[2] === 'k' ? typeof v === 'number' && v >= c[3] && v <= c[4] : c[2] === 's' ? typeof v === 'boolean' : c[3].includes(v));
    if (!good) ok(false, sh.id + ': ' + k + ' = ' + v + ' is a control of the panel, in range');
  }
  for (const k in sh.read) ok(k in sh.s, sh.id + ': reading ' + k + ' is a setting');
  if (txt) for (const q of sh.quote) if (!txt.includes(q)) ok(false, sh.id + ': quote in the guide: "' + q + '"');
  // a printed number in a quote must be the value set, unless the setting is marked approx
  if (sh.id === 'bass') ok(sh.s.cutoff === 3 && sh.s.res === 3 && sh.s.fD === 6 && sh.s.fS === 2 && sh.s.envAmt === 10, 'bass: the five numbers of p. 46');
  const rep = PS.fit(sh);
  ok(rep.every(r => ['exact', 'approx', 'lost'].includes(r.how)) && rep.filter(r => r.how === 'approx').length === Object.keys(sh.read).length, sh.id + ': fit ' + PS.summary(rep));
}
ok(sheets.find(s => s.id === 'sync').read.aFreq, 'sync: the "4" on Osc A frequency is marked approx (no conversion printed)');
ok(sheets.find(s => s.id === 'brass').read.pmFenv && sheets.find(s => s.id === 'brass').s.pmFenv > 0 && sheets.find(s => s.id === 'brass').s.pmFenv < 1, 'brass: Poly Mod "between 0 and 1"');
// reaches the picker, and every example builds an engine patch
PS.addTo(SC);
const ex = SC.EXAMPLES.filter(x => x.sheet);
ok(ex.length === PS.SHEETS.length && ex.every(x => x.from === 'prophet' && /Fit on this panel/.test(x.say)), 'all sheets are Prophet-5 examples with a fit note');
PS.addTo(SC); ok(SC.EXAMPLES.filter(x => x.sheet).length === PS.SHEETS.length, 'added once only');
let eng = true; try { for (const x of ex) { const tr = SC.translate(x.s, 'prophet', 'moog'); if (!tr) eng = false; } } catch (e) { eng = false; console.log(e); }
ok(eng, 'each sheet translates to the Model D');
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
