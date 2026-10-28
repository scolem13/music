// worker/index.js: the Worker in front of music.seancoleman.org (the rendered _site) and media.seancoleman.org (the
// R2 bucket of MLT recordings, scripts/mlt-recordings.mjs; also at music.seancoleman.org/media/). One shared password, set as the secret SITE_PASSWORD
// (`npx wrangler secret put SITE_PASSWORD`). A browser that has logged in keeps a cookie for all of *.seancoleman.org
// for a year, so the recordings play on the site without a second login. Changing the password logs everyone out.
const COOKIE = "music_auth";
const YEAR = 60 * 60 * 24 * 365;

async function token(env) {
  const data = new TextEncoder().encode("music.seancoleman.org:" + (env.SITE_PASSWORD || ""));
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", data))].map(b => b.toString(16).padStart(2, "0")).join("");
}
function cookie(req, name) {
  const m = (req.headers.get("Cookie") || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? m[1] : "";
}
function loginPage(next, wrong) {
  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Music</title><style>
body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f6f6f4;color:#222}
form{background:#fff;padding:2rem;border-radius:12px;box-shadow:0 2px 12px #0001;width:min(20rem,calc(100vw - 32px));box-sizing:border-box}
h1{font-size:1.3rem;margin:0 0 1rem}input,button{font:inherit;width:100%;box-sizing:border-box;padding:.6rem;border-radius:8px}
input{border:1px solid #bbb;margin-bottom:.8rem}button{border:0;background:#2a5db0;color:#fff;cursor:pointer}.err{color:#b00020;margin:0 0 .8rem}
@media (prefers-color-scheme:dark){body{background:#181818;color:#eee}form{background:#262626}input{background:#1d1d1d;color:#eee;border-color:#555}}
</style></head><body><form method="post" action="/__login">
<h1>Music</h1>${wrong ? '<p class="err">That password is not right.</p>' : ""}
<input type="password" name="password" placeholder="Password" autofocus autocomplete="current-password" aria-label="Password">
<input type="hidden" name="next" value="${esc(next)}"><button>Enter</button></form></body></html>`,
    { status: wrong ? 401 : 200, headers: { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "no-store" } });
}

async function media(req, env, path) {
  if (req.method !== "GET" && req.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
  const key = decodeURIComponent(path.slice(1));
  if (!key) return new Response("Not found", { status: 404 });
  const obj = await env.MEDIA.get(key, { range: req.headers, onlyIf: req.headers });
  if (!obj) return new Response("Not found", { status: 404 });
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set("ETag", obj.httpEtag);
  h.set("Accept-Ranges", "bytes");
  h.set("Cache-Control", "private, max-age=86400");
  if (!("body" in obj)) return new Response(null, { status: 304, headers: h });   // onlyIf failed: not modified
  if (obj.range && req.headers.has("Range")) {                                     // audio seeking asks for ranges
    const off = obj.range.offset ?? (obj.size - obj.range.suffix), len = obj.range.length ?? (obj.size - off);
    h.set("Content-Range", `bytes ${off}-${off + len - 1}/${obj.size}`);
    h.set("Content-Length", String(len));
    return new Response(req.method === "HEAD" ? null : obj.body, { status: 206, headers: h });
  }
  h.set("Content-Length", String(obj.size));
  return new Response(req.method === "HEAD" ? null : obj.body, { headers: h });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const isMedia = url.hostname.startsWith("media.");
    const good = await token(env);

    if (!isMedia && url.pathname === "/__login" && req.method === "POST") {
      const f = await req.formData();
      let next = String(f.get("next") || "/");
      if (!next.startsWith("/") || next.startsWith("//")) next = "/";
      if (!env.SITE_PASSWORD || f.get("password") !== env.SITE_PASSWORD) return loginPage(next, true);
      const dom = url.hostname.endsWith("seancoleman.org") ? "; Domain=.seancoleman.org" : "";
      return new Response(null, { status: 303, headers: {
        Location: next, "Cache-Control": "no-store",
        "Set-Cookie": `${COOKIE}=${good}; Max-Age=${YEAR}; Path=/; HttpOnly; Secure; SameSite=Lax${dom}` } });
    }
    if (cookie(req, COOKIE) !== good || !env.SITE_PASSWORD) {
      if (isMedia) return new Response("Log in at music.seancoleman.org first.", { status: 401 });
      return loginPage(url.pathname + url.search, false);
    }
    if (isMedia) return media(req, env, url.pathname);
    if (url.pathname.startsWith("/media/")) return media(req, env, url.pathname.slice(6));   // same files, same origin
    const res = await env.ASSETS.fetch(req);
    const out = new Response(res.body, res);
    out.headers.set("Cache-Control", "private, no-cache");   // pages behind the password must not sit in shared caches
    return out;
  },
};
