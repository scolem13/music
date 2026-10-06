// Headless-Chrome driver for the band harness (no npm deps: CDP over Node's WebSocket).
//   node run.mjs live                 live transport test (callbacks, tempo change, stop/restart, ending)
//   node run.mjs render [--tag T] [--tempo 120] [--choruses 2] [--seed 11] [--no-stems] [--bass two]
//   node run.mjs all                  live + render + measure
// FORCE_STUBS=harmony,bass,comp,drums forces the stub parts even when the real files exist.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { startServer, HERE, OUT, which } from './server.mjs';
import { measureAll } from './measure.mjs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const args = process.argv.slice(2), mode = args[0] || 'all';
const opt = (name, dflt) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : dflt; };
const flag = name => args.includes('--' + name);

function launch(){
  const profile = path.join(HERE, 'chrome-profile');
  fs.mkdirSync(profile, { recursive: true });
  const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profile,
    '--autoplay-policy=no-user-gesture-required', '--mute-audio', '--no-first-run', '--no-default-browser-check', 'about:blank'],
    { stdio: ['ignore', 'ignore', 'pipe'] });
  return new Promise((resolve, reject) => {
    let buf = ''; const to = setTimeout(() => reject(new Error('chrome did not start: ' + buf)), 20000);
    proc.stderr.on('data', d => { buf += d; const m = /DevTools listening on (ws:\/\/\S+)/.exec(buf); if (m){ clearTimeout(to); resolve({ proc, ws: m[1] }); } });
    proc.on('exit', c => reject(new Error('chrome exited ' + c + ': ' + buf)));
  });
}
class CDP {
  constructor(ws){ this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = [];
    ws.addEventListener('message', e => { const m = JSON.parse(e.data);
      if (m.id && this.pending.has(m.id)){ const p = this.pending.get(m.id); this.pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
      else this.handlers.forEach(h => h(m)); }); }
  send(method, params = {}, sessionId){ const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    return new Promise((res, rej) => this.pending.set(id, { res, rej })); }
}
async function openPage(wsUrl, url){
  const ws = new WebSocket(wsUrl); await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j); });
  const cdp = new CDP(ws), problems = [];
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  cdp.handlers.push(m => {
    if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning'))
      problems.push(m.params.type + ': ' + m.params.args.map(a => a.value ?? a.description ?? '').join(' '));
    if (m.method === 'Runtime.exceptionThrown') problems.push('exception: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    if (m.method === 'Log.entryAdded' && (m.params.entry.level === 'error' || m.params.entry.level === 'warning')) problems.push('log ' + m.params.entry.level + ': ' + m.params.entry.text + ' ' + (m.params.entry.url || ''));
  });
  for (const d of ['Runtime', 'Log', 'Page']) await cdp.send(d + '.enable', {}, sessionId);
  const loaded = new Promise(r => cdp.handlers.push(m => { if (m.method === 'Page.loadEventFired') r(); }));
  await cdp.send('Page.navigate', { url }, sessionId); await loaded;
  const evaluate = async expr => {
    const r = await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, userGesture: true }, sessionId);
    if (r.exceptionDetails) throw new Error('page threw: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  };
  return { evaluate, problems, close: () => ws.close() };
}

const stats = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), mean = a.reduce((x, y) => x + y, 0) / a.length;
  return { n: a.length, min: +s[0].toFixed(4), mean: +mean.toFixed(4), max: +s[s.length - 1].toFixed(4) }; };

function checkLive(r){
  const fails = [], first = r.log.slice(0, r.mark), second = r.log.slice(r.mark);
  const expectStates = ['loading', 'playing', 'idle', 'playing', 'idle'];
  if (JSON.stringify(r.states) !== JSON.stringify(expectStates)) fails.push('states ' + JSON.stringify(r.states));
  if (r.playingAfterStop) fails.push('isPlaying() true after stop');
  // order: bars -1,0,1,2…; beats 0..beats-1 inside each
  for (const [name, log] of [['first run', first], ['restart', second]]){
    const bars = log.filter(e => e.k === 'bar'), beats = log.filter(e => e.k === 'beat');
    if (!bars.length || bars[0].bar !== -1 || !bars[0].countIn) fails.push(name + ': does not start with the count-in bar');
    bars.forEach((b, i) => { if (b.bar !== i - 1) fails.push(name + ': bar order ' + bars.map(x => x.bar).join(',')); });
    let expBar = -1, expBeat = 0;
    for (const b of beats){ if (b.bar !== expBar || b.beat !== expBeat){ fails.push(name + ': beat order broke at bar ' + b.bar + ' beat ' + b.beat + ' (expected ' + expBar + '/' + expBeat + ')'); break; }
      expBeat++; if (expBeat === 4){ expBeat = 0; expBar++; } }
    bars.filter(b => !b.countIn).forEach(b => { if (b.index !== b.bar % 12 || b.src !== b.index || b.beats !== 4) fails.push(name + ': bad bar info ' + JSON.stringify(b)); });
  }
  // timing of the first run: beat callbacks vs the scheduled grid (tempo 120 → 180 at tempoAt)
  const drums = r.events.slice(0, r.evMark).filter(e => e.part === 'drums' && Number.isInteger(e.pos) && e.time < r.tempoAt - 0.3);
  const T0 = drums.map(e => e.time - e.L * 0.5).sort((a, b) => a - b)[Math.floor(drums.length / 2)];
  const Lc = (r.tempoAt - T0) / 0.5, errs = [];
  first.filter(e => e.k === 'beat').forEach((e, k) => { const exp = k <= Lc ? T0 + k * 0.5 : r.tempoAt + (k - Lc) / 3;
    errs.push((e.t - r.outputLatency - exp) * 1000); });
  const st = stats(errs);
  if (!st || st.min < -8 || st.max > 45) fails.push('beat callback timing off: ' + JSON.stringify(st));
  // swing on the scheduled events: off-beat eighths at 0.667 (120) then 0.627 (180)
  const sw = { a: [], b: [] };
  r.events.slice(0, r.evMark).forEach(e => { if (e.part !== 'drums' || Math.abs((e.pos % 1) - 0.5) > 1e-6) return;
    (e.time < r.tempoAt ? sw.a : e.time > r.tempoAt + 0.4 ? sw.b : []).push(e.L - Math.floor(e.L)); });
  const sa = stats(sw.a), sb = stats(sw.b);
  if (sa && Math.abs(sa.mean - 0.6667) > 0.002) fails.push('swing at 120: ' + JSON.stringify(sa));
  if (sb && Math.abs(sb.mean - 0.6267) > 0.002) fails.push('swing at 180: ' + JSON.stringify(sb));
  // nothing may be reported after stop() until the restart
  const late = first.filter(e => e.t > r.stopAt + 0.05).length; if (late) fails.push(late + ' callbacks after stop()');
  return { fails, summary: { stubs: r.stubs, loadMs: r.loadMs, states: r.states, progress: [r.progressFirst, r.progressLast], sampleRate: r.sampleRate,
    outputLatency: r.outputLatency, barsFirstRun: first.filter(e => e.k === 'bar').length, beatsFirstRun: errs.length, beatCallbackErrMs: st,
    swing120: sa, swing180: sb, restartBars: second.filter(e => e.k === 'bar').length, events: r.events.length } };
}

const { server, port } = await startServer();
const chrome = await launch();
let failed = false;
try {
  const page = await openPage(chrome.ws, 'http://127.0.0.1:' + port + '/__harness/harness.html' + (flag('cdn') ? '?cdn=1' : ''));   // --cdn: load samples straight from the CDN
  console.log('parts (true = REAL file, false = stub):', JSON.stringify(which()));
  if (mode === 'live' || mode === 'all'){
    const r = await page.evaluate('H.testLive()'); const c = checkLive(r);
    console.log('LIVE', JSON.stringify(c.summary)); c.fails.forEach(f => console.log('  FAIL', f)); if (c.fails.length) failed = true;
    const d = await page.evaluate('H.testDefine()');
    const okDef = d.voices.join() === 'true,true,true,true,false' && Math.abs(d.rates[0] - Math.pow(2, 4 / 12)) < 1e-3 && d.rmsBeforeFirst < 1e-5 && d.rmsNote1 > 0.005
      && d.rmsNote2 > d.rmsNote1 * 1.5 && d.rmsGap < d.rmsNote1 * 0.1 && d.rmsRide > 0.002 && /unknown instrument/.test(d.unknownInstrument || '');
    console.log('DEFINE', JSON.stringify(d)); if (!okDef){ console.log('  FAIL custom zone-list instrument'); failed = true; }
    const e = await page.evaluate('H.testEnding()');
    const okEnd = e.ended && !e.playing && e.bars.join(',') === '0,1,2,3,4,5,6,7,8,9,10,11,end' && e.states.join(',') === (mode === 'live' || mode === 'all' ? 'playing,idle' : 'loading,playing,idle');
    console.log('ENDING', JSON.stringify(e)); if (!okEnd){ console.log('  FAIL ending run'); failed = true; }
  }
  if (mode === 'render' || mode === 'all'){
    const tag = opt('tag', 'render'), o = { tag, tempo: +opt('tempo', 120), choruses: +opt('choruses', 2), seed: +opt('seed', 11),
      stems: !flag('no-stems'), opts: { bassFeel: opt('bass', 'walk') } };
    if (opt('humanize') != null) o.humanize = +opt('humanize');
    if (opt('vol') != null) o.volumes = { bass: +opt('vol'), comp: +opt('vol'), drums: +opt('vol') };   // all faders, e.g. --vol 1.5
    const r = await page.evaluate('H.render(' + JSON.stringify(o) + ')');
    console.log('RENDER', JSON.stringify(r));
    const m = measureAll(tag, o.stems, o.humanize === 0); console.log(m.text); if (m.fails.length){ m.fails.forEach(f => console.log('  FAIL', f)); failed = true; }
    const mp3 = path.join(OUT, tag + '-mix.mp3');
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', path.join(OUT, tag + '-mix.wav'), '-codec:a', 'libmp3lame', '-b:a', '128k', mp3]);
    console.log('mp3:', mp3);
  }
  // apps/shared/soundfont.js probes a file that does not exist on jsDelivr (pre-existing, not ours): known noise
  const known = page.problems.filter(p => /acousticgrandpiano-mp3\.js|DOES_NOT_EXIST/.test(p)), real = page.problems.filter(p => !known.includes(p));
  console.log('console problems:', real.length ? '\n  ' + real.join('\n  ') : 'none', known.length ? '(+' + known.length + ' expected: deliberate missing-sample test / soundfont.js probe)' : ''); if (real.length) failed = true;
  page.close();
} finally { chrome.proc.kill(); server.close(); }
console.log(failed ? 'RESULT: FAIL' : 'RESULT: PASS');
process.exit(failed ? 1 : 0);
