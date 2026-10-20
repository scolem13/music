// A hung sample fetch times out, falls back to the next host, and a sample that fails everywhere is skipped. node t_timeout.js
const path = require("path"), assert = require("assert");
global.window = global;
require(path.join(__dirname, "../../..", "apps/shared/band/sounds.js"));
const S = global.BandSounds;
const buf = { length: 10, numberOfChannels: 1, sampleRate: 100, getChannelData: () => new Float32Array(10) };
const ctx = { decodeAudioData: (ab, ok) => { ok(buf); } };
const P = "https://cdn.jsdelivr.net/gh/paulrosen/midi-js-soundfonts/MusyngKite/";
const calls = [];
global.BAND_FETCH_TIMEOUT = 150;
global.fetch = (url, o) => { calls.push(url);
  if (url.startsWith("https://gleitz.github.io/")) return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)) });
  return new Promise((_, rej) => { o.signal.addEventListener("abort", () => rej(new Error("aborted"))); }); };   // never answers
(async () => {
  let t = Date.now();
  const r = await S.fetchBuffer(ctx, P + "a/x.mp3");
  assert(r.buffer === buf, "fallback host served it");
  assert(Date.now() - t < 1500 && calls.length === 2 && calls[1].startsWith("https://gleitz"), calls.join());
  // hung everywhere: rejects in about the timeout per host, not for ever
  global.BAND_SOUND_FALLBACKS = [];
  t = Date.now();
  await S.fetchBuffer(ctx, P + "b/y.mp3").then(() => assert.fail("should reject"), e => assert(/timed out/.test(e.message), e.message));
  assert(Date.now() - t < 1500);
  // a non-default URL gets no fallback
  calls.length = 0; global.BAND_SOUND_FALLBACKS = undefined;
  await S.fetchBuffer(ctx, "http://127.0.0.1/sf/z.mp3").then(() => assert.fail(), () => {});
  assert.strictEqual(calls.length, 1);
  console.log("t_timeout ok");
})().catch(e => { console.error(e); process.exit(1); });
