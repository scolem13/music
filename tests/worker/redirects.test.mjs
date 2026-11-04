// node tests/worker/redirects.test.mjs — the Worker's redirects for merged pages (worker/index.js movedTo), through its real fetch():
// a logged-in request for an old address gets a 301 to the section that holds it now; other paths reach the assets. NEG=1 must fail.
import assert from "assert";
import { createHash } from "crypto";
const W = (await import("../../worker/index.js")).default;
const env = { SITE_PASSWORD: "t", ASSETS: { fetch: async () => new Response("asset", { status: 200 }) } };
const tok = createHash("sha256").update("music.seancoleman.org:t").digest("hex");
const get = (p) => W.fetch(new Request("https://music.seancoleman.org" + p, { headers: { Cookie: "music_auth=" + tok } }), env);
const cases = [
  ["/lessons/patterns/chords-alberti.html", "/lessons/patterns/chords.html#chords-alberti"],
  ["/lessons/patterns/bass-walk.html", "/lessons/patterns/bass.html#bass-walk"],
  ["/lessons/patterns/drums-hhsix2.html", "/lessons/patterns/drums.html#drums-hhsix2"],
  ["/styles/bossa.html", "/styles/index.html#bossa"],
  ["/gear/modx-band.html", "/gear/modx.html#play-the-band-on-the-modx"],
  ["/gear/modx-perc.html", "/gear/modx.html#percussion-auditions"],
  ["/gear/modx-ab.html", "/gear/modx.html#band-ab"]];
if (process.env.NEG) cases[0][1] = "/lessons/patterns/chords-alberti.html";
for (const [from, to] of cases) { const r = await get(from); assert.equal(r.status, 301, from); assert.equal(r.headers.get("Location"), to, from); }
for (const p of ["/lessons/patterns/chords.html", "/lessons/patterns/index.html", "/styles/index.html", "/gear/modx.html", "/apps/shared/band/player.js"]) {
  const r = await get(p); assert.equal(r.status, 200, p + " reaches the assets"); }
const anon = await W.fetch(new Request("https://music.seancoleman.org/styles/bossa.html"), env);
assert.equal(anon.status, 200); assert.match(await anon.text(), /Password/, "not logged in: the login page, not a redirect");
console.log("WORKER REDIRECTS OK", cases.length);
