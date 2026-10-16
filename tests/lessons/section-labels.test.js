// node tests/lessons/section-labels.test.js -- Timestamp Notes' section labels (apps/shared/timestamp-player/section-labels.js)
const L = require('../../apps/shared/timestamp-player/section-labels.js');
let bad = 0;
const check = (name, ok, got) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok ? '' : '  ' + JSON.stringify(got))); if (!ok) bad++; };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
check('letters: A to start', eq(L.letters([]), ['A']), L.letters([]));
check("letters: after A, A' and B", eq(L.letters(['A']), ['A', "A'", 'B']), L.letters(['A']));
check("letters: after A A' B", eq(L.letters(['A', "A'", 'B']), ['A', "A'", "A''", 'B', "B'", 'C']), L.letters(['A', "A'", 'B']));
const n = L.names([{ b: 'Intro' }, { b: 'Head' }, { b: 'Sax solo' }, { b: 'Head' }, { b: 'A' }, { b: 'A' }, { b: 'My bit', o: true }, { b: 'My bit', o: true }]);
check('names: a repeated word numbered, once left bare, letters and typed labels as they are', eq(n, ['Intro', 'Head 1', 'Sax solo', 'Head 2', 'A', 'A', 'My bit', 'My bit']), n);
check('player: Sax solo -> Sax, Solo -> Solo, Flute Solo -> Flute', L.player('Sax solo') === 'Sax' && L.player('Solo') === 'Solo' && L.player('flute Solo') === 'Flute' && L.player('Head') === null);
const secs = [{ b: 'Head', bars: 32 }, { b: 'Sax solo', bars: 32 }, { b: 'Sax solo', bars: 32 }, { b: 'Sax solo', bars: 32 }, { b: 'Piano solo', bars: 64 }, { b: 'Head', bars: 32 }];
check('formBars: the first Head', L.formBars(secs) === 32, L.formBars(secs));
const r = L.runs(secs, 32).map(x => [x.label, x.choruses]);
check('runs: sax stamped every chorus is one run of 3, piano stamped once 2', eq(r, [['Head', 1], ['Sax solo', 3], ['Piano solo', 2], ['Head', 1]]), r);
check('formBars: AABA from letters', L.formBars("AABAAABA".split("").map(b => ({ b, bars: 8 }))) === 32);
check('choruses round to a half', L.runs([{ b: 'Bass solo', bars: 47 }], 32)[0].choruses === 1.5);
process.exit(bad ? 1 : 0);
