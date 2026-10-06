// Static server for the band harness: project root at /, this dir at /__harness/.
// /__harness/band/<part>.js serves the REAL apps/shared/band/<part>.js when it exists
// (and is not listed in FORCE_STUBS=harmony,bass,...), else the stub in ./stubs.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';

export const ROOT = '/Users/sean.coleman/Projects/everything-music-site';
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const OUT = path.join(HERE, 'out');
const PARTS = ['harmony', 'bass', 'comp', 'drums'];
const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8',
  '.css':'text/css', '.json':'application/json', '.wav':'audio/wav', '.mp3':'audio/mpeg', '.svg':'image/svg+xml', '.ico':'image/x-icon' };

export function which(){
  const force = (process.env.FORCE_STUBS || '').split(',').map(s => s.trim()).filter(Boolean);
  const out = {};
  for (const p of PARTS) out[p] = !force.includes(p) && fs.existsSync(path.join(ROOT, 'apps/shared/band', p + '.js'));
  // the stub bass/comp only understand the stub harmony's chord objects (and vice versa)
  if (!(out.harmony && out.bass && out.comp)) out.harmony = out.bass = out.comp = false;
  return out;                                   // true = real file, false = stub
}
function send(res, code, body, type){ res.writeHead(code, { 'content-type': type || 'text/plain', 'cache-control': 'no-store' }); res.end(body); }
function file(res, f){
  fs.readFile(f, (err, data) => err ? send(res, 404, 'not found: ' + f) : send(res, 200, data, TYPES[path.extname(f)] || 'application/octet-stream'));
}
export function startServer(){
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'), p = decodeURIComponent(u.pathname);
    if (req.method === 'POST' && p === '/__harness/upload'){
      const name = path.basename(u.searchParams.get('name') || 'upload.bin'), chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, name), Buffer.concat(chunks)); send(res, 200, 'ok'); });
      return;
    }
    if (p === '/favicon.ico') return send(res, 204, '');
    // /__sf/<path> = a disk-cached mirror of the soundfont CDN, so runs are fast and do not
    // depend on headless Chrome reaching the CDN through this machine's TLS proxy
    if (p.startsWith('/__sf/')){
      const rel = p.slice('/__sf/'.length), f = path.join(HERE, 'sfcache', rel);
      if (!/^[\w\-./]+$/.test(rel) || rel.includes('..')) return send(res, 400, 'bad path');
      if (fs.existsSync(f)) return file(res, f);
      fs.mkdirSync(path.dirname(f), { recursive: true });
      return execFile('curl', ['-sf', '-m', '30', '-o', f + '.part', 'https://cdn.jsdelivr.net/gh/paulrosen/midi-js-soundfonts/' + rel], err => {
        if (err){ fs.rmSync(f + '.part', { force: true }); return send(res, 404, 'not on CDN: ' + rel); }
        fs.renameSync(f + '.part', f); file(res, f); });
    }
    if (p === '/__harness/which') return send(res, 200, JSON.stringify(which()), 'application/json');
    const m = /^\/__harness\/band\/(\w+)\.js$/.exec(p);
    if (m) return file(res, which()[m[1]] ? path.join(ROOT, 'apps/shared/band', m[1] + '.js') : path.join(HERE, 'stubs', m[1] + '.js'));
    if (p.startsWith('/__harness/')) return file(res, path.join(HERE, p.slice('/__harness/'.length)));
    const f = path.normalize(path.join(ROOT, p));
    if (!f.startsWith(ROOT)) return send(res, 403, 'no');
    file(res, f);
  });
  return new Promise((resolve, reject) => {
    let port = 8200;
    const tryListen = () => { server.once('error', e => { if (e.code === 'EADDRINUSE' && port < 8299){ port++; tryListen(); } else reject(e); });
      server.listen(port, '127.0.0.1', () => resolve({ server, port })); };
    tryListen();
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)){
  const { port } = await startServer();
  console.log('harness: http://127.0.0.1:' + port + '/__harness/harness.html   parts(real?):', JSON.stringify(which()));
}
