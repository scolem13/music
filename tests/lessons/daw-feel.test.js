// "Feel": the band's human touches written into DAW clips (MiniDaw.applyFeel), using the same numbers as the Backing Track's player. NEG=1 must fail.
// node tests/lessons/daw-feel.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '../..');
const win = { document: { addEventListener() {}, querySelectorAll() { return []; } }, localStorage: null };
win.window = win; vm.createContext(win);
for (const f of ['apps/shared/band/midi.js', 'apps/shared/daw/mini-daw.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), win, { filename: f });
const D = win.MiniDaw, NEG = process.env.NEG === '1';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } else console.log('ok   ' + m); };
const T = 100, BPS = T / 60, amtOf = a => NEG ? 0 : a;            // beats a second at 100 BPM; NEG: feel off, so every "it moved" check must fail
const mk = (part, n) => Array.from({ length: n }, (_, i) => ({ t: 1 + i, d: 0.5, m: part === 'drums' ? 'kick' : 40 + i, v: 0.7 }));
const dts = (before, after) => before.map((b, i) => after[i].t - b.t);
const rng = () => D.mulberry(7);

// 1. nothing at amount 0, and the same seed gives the same result
let a = mk('bass', 8), copy = JSON.stringify(a); D.applyFeel(a, 'bass', T, 0, rng(), 20); ok(JSON.stringify(a) === copy, 'amount 0 leaves every note alone');
let x = mk('bass', 8), y = mk('bass', 8); D.applyFeel(x, 'bass', T, amtOf(1), rng(), 20); D.applyFeel(y, 'bass', T, amtOf(1), rng(), 20); ok(JSON.stringify(x) === JSON.stringify(y), 'the same seed gives the same feel');
// 2. bass: ahead of the beat by 6 ms +- 3 ms (at 100 BPM: 0.005 to 0.015 beats early)
let b0 = mk('bass', 40), b1 = mk('bass', 40); D.applyFeel(b1, 'bass', T, amtOf(1), rng(), 100); let d = dts(b0, b1);
ok(d.every(v => v <= -0.003 * BPS + 1e-4 && v >= -0.009 * BPS - 1e-4) && new Set(d.map(v => v.toFixed(4))).size > 5, 'bass: every note 3-9 ms early, not all by the same amount (' + Math.min(...d).toFixed(4) + ' to ' + Math.max(...d).toFixed(4) + ' beats)');
// 3. comping sits behind (8 ms +- 4 ms); drums have no lay, only +-2 ms
let c1 = mk('comp', 40); c1.forEach((n, i) => { n.t = 1 + i * 2; }); let c0 = JSON.parse(JSON.stringify(c1)); D.applyFeel(c1, 'comp', T, amtOf(1), rng(), 100); d = dts(c0, c1);
ok(d.every(v => v >= 0.004 * BPS - 1e-4 && v <= 0.012 * BPS + 1e-4), 'comping: single notes 4-12 ms late');
let k0 = mk('drums', 40), k1 = mk('drums', 40); D.applyFeel(k1, 'drums', T, amtOf(1), rng(), 100); d = dts(k0, k1);
ok(d.every(v => Math.abs(v) <= 0.002 * BPS + 1e-4) && d.some(v => Math.abs(v) > 0.0003), 'drums: within +-2 ms, and they do move');
// 4. a chord is rolled low to high, a strummed chord over up to 28 ms; an up-stroke goes high to low
const chord = (s) => [60, 64, 67, 72].map(m => ({ t: 2, d: 1, m, v: 0.6, s }));
let ch = chord(undefined); D.applyFeel(ch, 'comp', T, amtOf(1), rng(), 20); ch.sort((p, q) => p.m - q.m);
ok(ch.every((n, i) => i === 0 || n.t >= ch[i - 1].t) && ch[3].t - ch[0].t <= 0.010 * BPS + 1e-4 && ch[3].t - ch[0].t > 0, 'a plain chord rolls low to high within 10 ms (' + (ch[3].t - ch[0].t).toFixed(4) + ' beats)');
let dn = chord('down'); D.applyFeel(dn, 'comp', T, amtOf(1), rng(), 20); dn.sort((p, q) => p.m - q.m);
let up = chord('up'); D.applyFeel(up, 'comp', T, amtOf(1), rng(), 20); up.sort((p, q) => p.m - q.m);
const spanDn = dn[3].t - dn[0].t, spanUp = up[0].t - up[3].t;
ok(Math.abs(spanDn - 0.028 * BPS) < 0.002 || Math.abs(spanDn - 0.12 * 0.6 * BPS) < 0.002, 'a down-strum spans min(28 ms, 12% of a beat) (' + spanDn.toFixed(4) + ' beats)');
ok(spanUp > 0 && Math.abs(spanUp - 0.6 * spanDn) < 0.003, 'an up-strum goes high to low over 0.6 of that (' + spanUp.toFixed(4) + ')');
ok(!('s' in dn[0]), 'the strum marker is not left on the notes');
// 5. velocity wanders within 6% and stays in range; amount 2 is twice as loose; no note before the clip starts or after it ends
let v1 = mk('bass', 60); D.applyFeel(v1, 'bass', T, amtOf(1), rng(), 100);
ok(v1.every(n => n.v >= 0.7 * 0.94 - 1e-9 && n.v <= 0.7 * 1.06 + 1e-9) && v1.some(n => Math.abs(n.v - 0.7) > 0.005), 'velocity within +-6% and it does wander');
let e1 = [{ t: 0, d: 1, m: 40, v: 0.8 }, { t: 3.99, d: 0.01, m: 41, v: 0.8 }]; D.applyFeel(e1, 'bass', T, amtOf(2), rng(), 4);
ok(e1[0].t >= 0 && e1[1].t < 4, 'a note at the very start stays at 0 or later; one at the end stays inside the clip');
let w1 = mk('bass', 40), w2 = mk('bass', 40); D.applyFeel(w1, 'bass', T, amtOf(1), rng(), 100); D.applyFeel(w2, 'bass', T, amtOf(2), rng(), 100);
ok(Math.abs(dts(mk('bass', 40), w2).reduce((s, v) => s + v, 0)) > 1.8 * Math.abs(dts(mk('bass', 40), w1).reduce((s, v) => s + v, 0)), 'amount 2 shifts about twice as far as amount 1');
console.log(fails ? fails + ' failed' : 'all passed'); process.exit(fails ? 1 : 0);
