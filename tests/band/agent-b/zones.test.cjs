// Pure zone-choice tests (node zones.test.cjs): the logic a recorded-sample set will rely on.
require('/Users/sean.coleman/Projects/everything-music-site/apps/shared/band/sounds.js');
require('/Users/sean.coleman/Projects/everything-music-site/apps/shared/band/player.js');
const assert = require('node:assert');
const { pickZones, soundfontZones, soundfontKit, noteName } = BandSounds;
let n = 0; const t = (name, fn) => { fn(); n++; };

t('note names match abcjs', () => { assert.deepStrictEqual([21, 22, 28, 36, 37, 49, 51, 60, 61].map(noteName), ['A0', 'Bb0', 'E1', 'C2', 'Db2', 'Db3', 'Eb3', 'C4', 'Db4']); });
t('soundfont zones cover the range with shift <= 1', () => {
  const z = soundfontZones('B/', 'acoustic_bass', 28, 57, 3);
  for (let m = 28; m <= 57; m++){ const g = pickZones(z, { midi: m, vel: 0.7 }); assert.strictEqual(g.length, 1); assert.ok(Math.abs(g[0].midi - m) <= 1, 'midi ' + m); }
  assert.strictEqual(z[0].url, 'B/acoustic_bass-mp3/F1.mp3');
});
t('out-of-range notes use the nearest zone', () => {
  const z = soundfontZones('B/', 'x', 40, 45, 3);
  assert.strictEqual(pickZones(z, { midi: 20 })[0].midi, 41); assert.strictEqual(pickZones(z, { midi: 90 })[0].midi, 44);
});
t('sparse recorded set: nearest root, no ranges needed', () => {
  const z = [{ url: 'E1', midi: 28 }, { url: 'A1', midi: 33 }, { url: 'D2', midi: 38 }];
  assert.strictEqual(pickZones(z, { midi: 30 })[0].url, 'E1'); assert.strictEqual(pickZones(z, { midi: 31 })[0].url, 'A1'); assert.strictEqual(pickZones(z, { midi: 36 })[0].url, 'D2');
});
t('velocity layers', () => {
  const z = [{ url: 'soft', midi: 40, velHi: 0.6 }, { url: 'hard', midi: 40, velLo: 0.6 }];
  assert.strictEqual(pickZones(z, { midi: 40, vel: 0.3 })[0].url, 'soft'); assert.strictEqual(pickZones(z, { midi: 40, vel: 0.6 })[0].url, 'hard');
  assert.strictEqual(pickZones(z, { midi: 40, vel: 1 })[0].url, 'hard');
  assert.strictEqual(pickZones([{ url: 'only', midi: 40, velLo: 0.8 }], { midi: 40, vel: 0.2 })[0].url, 'only');   // no layer for this velocity → any
});
t('round-robin group = every zone tied for best', () => {
  const kit = [{ url: 'r1', piece: 'ride' }, { url: 'r2', piece: 'ride' }, { url: 'k', piece: 'kick' }];
  assert.deepStrictEqual(pickZones(kit, { piece: 'ride', vel: 0.5 }).map(z => z.url), ['r1', 'r2']);
  assert.deepStrictEqual(pickZones(kit, { piece: 'kick' }).map(z => z.url), ['k']); assert.strictEqual(pickZones(kit, { piece: 'cowbell' }).length, 0);
  const p = [{ url: 'a', midi: 40 }, { url: 'b', midi: 40 }, { url: 'c', midi: 43 }];
  assert.deepStrictEqual(pickZones(p, { midi: 41 }).map(z => z.url), ['a', 'b']);
});
t('kit helper maps piece names to percussion files', () => {
  const k = soundfontKit('B/', { kick: 36, ride: 51 }); assert.deepStrictEqual(k, [{ url: 'B/percussion-mp3/C2.mp3', piece: 'kick' }, { url: 'B/percussion-mp3/Eb3.mp3', piece: 'ride' }]);
});
t('swing curve and warp', () => {
  const s = BandPlayer.swingFor; assert.ok(Math.abs(s(120) - 2 / 3) < 1e-9); assert.ok(Math.abs(s(200) - 0.6133333) < 1e-6); assert.ok(Math.abs(s(300) - 0.55) < 1e-9); assert.ok(Math.abs(s(60) - 0.68) < 1e-9);
  const w = BandPlayer.warp; assert.strictEqual(w(2, 0.6), 2); assert.ok(Math.abs(w(2.5, 0.6) - 2.6) < 1e-9); assert.ok(Math.abs(w(2.25, 0.6) - 2.3) < 1e-9); assert.ok(Math.abs(w(2.75, 0.6) - 2.8) < 1e-9);
  for (let p = 0; p < 4; p += 0.01) assert.ok(w(p + 0.01, 0.66) > w(p, 0.66));   // monotonic
});
console.log(n + ' zone/swing tests passed');
