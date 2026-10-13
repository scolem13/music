// What stops what in the sound bank (sounds.js, kit and congas), driven with a fake AudioContext that records the gain and stop calls.   node t_choke.js
const assert = require("assert"), path = require("path"), R = path.join(__dirname, "../../..");
global.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
require(path.join(R, "apps/shared/band/sounds.js"));
function param(log){ return { value: 0, setValueAtTime(){}, linearRampToValueAtTime(){}, cancelScheduledValues(){}, setTargetAtTime(v, t){ log.push({ v, t }); } }; }
function fakeCtx(){
  const ctx = { currentTime: 0, destination: {}, sources: [],
    decodeAudioData(ab, ok){ const d = new Float32Array(400); d[10] = 1; d[11] = 0.5; const b = { length: 400, numberOfChannels: 1, sampleRate: 1000, getChannelData: () => d }; ok(b); return Promise.resolve(b); },
    createBuffer(n, len, sr){ const d = new Float32Array(len); return { length: len, numberOfChannels: n, sampleRate: sr, getChannelData: () => d }; },
    createGain(){ const log = []; return { gain: param(log), log, connect(){}, disconnect(){} }; },
    createBiquadFilter(){ return { frequency: { value: 0 }, Q: { value: 0 }, gain: { value: 0 }, connect(){} }; },
    createBufferSource(){ const s = { buffer: null, playbackRate: { value: 1 }, stopped: [], connect(){}, start(){}, stop(t){ s.stopped.push(t); } }; ctx.sources.push(s); return s; } };
  return ctx;
}
async function scenario(inst, first, second, at){
  const ctx = fakeCtx(), bank = BandSounds.create(ctx); await bank.load([inst]);
  const n0 = ctx.sources.length; bank.play(inst, { piece: first, vel: 0.7 }, 1, ctx.destination); const a = ctx.sources[n0];
  const g = a.gain || null; // the gain node is not on the source: find it by what stop() recorded
  if (second) bank.play(inst, { piece: second, vel: 0.7 }, 2, ctx.destination); else if (at) bank.choke(at, 2);
  return a.stopped.length > 0;                       // a damped note is told to stop (at 2 plus its fade); an undamped one rings to its end
}
(async function (){
  const yes = async (i, a, b, m) => assert.strictEqual(await scenario(i, a, b), true, m || (a + " is damped by " + b)), no = async (i, a, b, m) => assert.strictEqual(await scenario(i, a, b), false, m || (a + " is not damped by " + b));
  // congas: any stroke on the conga stops an open conga; the tumba is another drum
  for (const s of ["congaHeel", "congaToe", "congaSlap", "congaMute", "congaBass", "congaOpen"]) await yes("congas", "congaOpen", s);
  for (const s of ["tumbaOpen", "tumbaMute", "tumbaBass"]) await no("congas", "congaOpen", s);
  for (const s of ["tumbaOpen", "tumbaMute", "tumbaBass"]) await yes("congas", "tumbaOpen", s);
  for (const s of ["congaOpen", "congaHeel", "congaToe", "congaSlap", "congaMute", "congaBass"]) await no("congas", "tumbaOpen", s);
  // the snare: the next snare and a cross-stick stop it; nothing else does
  await yes("kit", "snare", "snare"); await yes("kit", "snare", "rim");
  for (const s of ["kick", "tomHi", "tomMid", "tomLo", "hatClosed", "hatFoot", "hatOpen", "ride", "crash", "sticks"]) await no("kit", "snare", s);
  // kick and each tom damp only themselves
  for (const d of ["kick", "tomHi", "tomMid", "tomLo"]) for (const s of ["kick", "snare", "rim", "tomHi", "tomMid", "tomLo", "hatClosed", "hatFoot", "ride", "crash"]) { if (s === d) await yes("kit", d, s); else await no("kit", d, s); }
  // cymbals: nothing but choke("cymbals")
  for (const c of ["ride", "crash", "rideBell"]) {
    for (const s of ["ride", "crash", "rideBell", "kick", "snare", "rim", "tomHi", "tomMid", "tomLo", "hatClosed", "hatFoot", "hatOpen", "sticks"]) await no("kit", c, s);
    assert.strictEqual(await scenario("kit", c, null, "cymbals"), true, c + " is damped by choke(cymbals)");
    assert.strictEqual(await scenario("kit", c, null, "hat"), false, c + " is not damped by choke(hat)");
  }
  // the open hi-hat is cut by the closed hat and the foot, not by a drum, and ringing on its own it is not cut by another open note's group alone
  await yes("kit", "hatOpen", "hatClosed"); await yes("kit", "hatOpen", "hatFoot");
  for (const s of ["kick", "snare", "rim", "tomHi", "ride", "crash"]) await no("kit", "hatOpen", s);
  console.log("CHOKE OK");
})().catch(e => { console.error(e); process.exit(1); });
