// ARP 2600 manual patches (apps/shared/lessons/arp-sheets.js): every setting is a real control of SynthCompare.PROFILES.arp2600
// in range, every cord is one the panel has, every quote is in the 1971 manual's text, every unprinted reading is marked approx,
// and the sheets reach SynthCompare.EXAMPLES and build an engine patch.
// node tests/lessons/arp-sheets.test.js     (NEG=1 must fail: a quote changed and a printed amount changed)
const fs = require('fs'), path = require('path'), os = require('os');
const root = path.join(__dirname, '../..'), NEG = process.env.NEG === '1';
const SC = require(root + '/apps/shared/lessons/synth-compare.js'), AS = require(root + '/apps/shared/lessons/arp-sheets.js');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } else console.log('ok   ' + m); };
const P = SC.PROFILES.arp2600, ctl = {};
P.groups.forEach(g => g[2].forEach(c => { ctl[c[0]] = c; }));
const sheets = JSON.parse(JSON.stringify(AS.SHEETS));
const snap = sheets.find(s => s.id === 'noise-snap');
if (NEG) { snap.quote[0] = 'frequency slider all the way to the right.'; snap.s.fAdsr = 6; }
const txtF = path.join(os.homedir(), 'Documents/Manuals/synths/new/arp2600-original.txt');
const txt = fs.existsSync(txtF) ? fs.readFileSync(txtF, 'utf8') : null;
if (!txt) console.log('note the manual text is not on this machine: quotes not checked');
ok(sheets.length >= 10 && new Set(sheets.map(s => s.id)).size === sheets.length, sheets.length + ' sheets, ids unique');
const CS = ['adsr', 'ar', 'sh', 'noise', 'vco1saw', 'vco1sq', 'vco2sine', 'vco3saw', 'kbd'], CD = ['vco1', 'vco2', 'vco3', 'vcf', 'vca', 'pw2', 'pw3'];
for (const sh of sheets) {
  ok(/^5\.\d/.test(sh.sec) && sh.pdf.length && sh.quote.length, sh.id + ': has section ' + sh.sec + ', PDF pages and quotes');
  const st = AS.state(sh);
  for (const k in st) {
    const c = ctl[k], v = st[k];
    const good = k === 'cords' ? Array.isArray(v) && v.every(x => CS.includes(x.src) && CD.includes(x.dst) && x.amt >= -1 && x.amt <= 1)
      : c && (c[2] === 'k' ? typeof v === 'number' && v >= c[3] && v <= c[4] : c[2] === 's' ? typeof v === 'boolean' : c[3].includes(v));
    if (!good) ok(false, sh.id + ': ' + k + ' = ' + JSON.stringify(v) + ' is a control of the panel, in range');
  }
  for (const k in sh.read) ok(k in sh.s, sh.id + ': reading ' + k + ' is a setting');
  if (txt) for (const q of sh.quote) if (!txt.includes(q)) ok(false, sh.id + ': quote in the manual: "' + q + '"');
  const rep = AS.fit(sh);
  ok(rep.every(r => ['exact', 'approx', 'lost'].includes(r.how)) && rep.filter(r => r.how === 'approx').length === Object.keys(sh.read).length + 1, sh.id + ': fit ' + AS.summary(rep));
}
// printed amounts: "all the way" / "to maximum" / "nine-tenths" must be the values set
ok(snap.s.cut === 0 && snap.s.inN === 10 && snap.s.fAdsr === 10 && snap.s.aS === 0, 'noise-snap: filter closed, noise and ADSR-Filter all the way (PDF p. 80)');
ok(sheets.find(s => s.id === 'pizz').s.fAdsr === 9, 'pizz: nine-tenths');
ok(sheets.find(s => s.id === 'wah-vibrato').lost.length && sheets.find(s => s.id === 'sh-random').lost.length, 'inverter and clock gating reported lost');
AS.addTo(SC);
const ex = SC.EXAMPLES.filter(x => x.arpSheet);
ok(ex.length === AS.SHEETS.length && ex.every(x => x.from === 'arp2600' && /Fit on this panel/.test(x.say)), 'all sheets are ARP 2600 examples with a fit note');
AS.addTo(SC); ok(SC.EXAMPLES.filter(x => x.arpSheet).length === AS.SHEETS.length, 'added once only');
let eng = true; try { for (const x of ex) { const E = SC.engine('arp2600', x.s); if (!E || !E.osc) eng = false; if (!SC.translate(x.s, 'arp2600', 'moog')) eng = false; } } catch (e) { eng = false; console.log(e); }
ok(eng, 'each sheet builds an engine patch and translates to the Model D');
const tr = SC.engine('arp2600', ex.find(x => x.id === 'a26-tremolo').s);
ok(tr.routes.some(r => r.cord && r.dst[0] === 'amp'), 'tremolo: the VCO-2 sine cord reaches the VCA');
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
