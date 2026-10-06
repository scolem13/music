// Click check: the largest sample-to-sample jumps in a stem and how far each is from a note-on.
// A clean stem has its biggest jumps AT note attacks; jumps elsewhere (note-offs, cut tails) are clicks.
import fs from 'node:fs'; import path from 'node:path'; import { OUT } from './server.mjs';
const tag = process.argv[2] || 'render';
const ev = JSON.parse(fs.readFileSync(path.join(OUT, tag + '-events.json'), 'utf8')).events;
for (const part of ['bass', 'comp', 'drums']){
  const b = fs.readFileSync(path.join(OUT, tag + '-' + part + '.wav')), sr = b.readUInt32LE(24), n = (b.length - 44) / 8;
  const ons = ev.filter(e => e.part === part).map(e => e.time + 0.0076).sort((a, c) => a - c);
  let pk = 0; const jumps = [];
  let prev = b.readFloatLE(44);
  for (let i = 1; i < n; i++){ const x = b.readFloatLE(44 + i * 8), d = Math.abs(x - prev); if (Math.abs(x) > pk) pk = Math.abs(x); if (d > 0.02) jumps.push([i / sr, d]); prev = x; }
  jumps.sort((a, c) => c[1] - a[1]);
  const near = t => { let best = 1e9; for (const o of ons){ const d = t - o; if (Math.abs(d) < Math.abs(best)) best = d; } return best; };
  const away = jumps.filter(j => { const d = near(j[0]); return d < -0.003 || d > 0.06; });
  console.log(part.padEnd(5), 'peak', pk.toFixed(3), 'jumps>0.02:', jumps.length, 'largest', jumps[0] ? jumps[0][1].toFixed(3) : 0,
    '| not within 60 ms after a note-on:', away.length, away.slice(0, 4).map(j => `${j[1].toFixed(3)}@${j[0].toFixed(3)}s(${(near(j[0]) * 1000).toFixed(0)}ms)`).join(' '));
}
