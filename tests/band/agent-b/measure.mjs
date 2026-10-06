// Loudness / peak (ffmpeg ebur128) and onset timing (drum stem vs scheduled events).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { OUT } from './server.mjs';

export function loudness(file){
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  const s = r.stderr.slice(r.stderr.lastIndexOf('Summary:'));
  const I = /I:\s+(-?[\d.]+) LUFS/.exec(s), P = /Peak:\s+(-?[\d.]+|-inf) dBFS/.exec(s), LRA = /LRA:\s+(-?[\d.]+) LU/.exec(s);
  return { I: I ? +I[1] : null, truePeak: P ? (P[1] === '-inf' ? -Infinity : +P[1]) : null, LRA: LRA ? +LRA[1] : null };
}
function readWav(file){                       // the float32 WAV written by harness.js
  const b = fs.readFileSync(file), ch = b.readUInt16LE(22), sr = b.readUInt32LE(24), n = (b.length - 44) / (4 * ch);
  const mono = new Float32Array(n);
  for (let i = 0; i < n; i++){ let s = 0; for (let c = 0; c < ch; c++) s += b.readFloatLE(44 + (i * ch + c) * 4); mono[i] = s / ch; }
  return { sr, mono };
}
// onset = first 1 ms window (of the differentiated signal, to favour attacks over ringing)
// clearly above what was sounding just before the scheduled time
function onsetError(w, t){
  const { sr, mono } = w, win = Math.round(sr / 1000), rms = (a) => { let s = 0; for (let i = a; i < a + win; i++){ const d = (mono[i + 1] || 0) - (mono[i] || 0); s += d * d; } return Math.sqrt(s / win); };
  const i0 = Math.round(t * sr); if (i0 - 14 * win < 0 || i0 + 40 * win >= mono.length) return null;
  let pre = 0; for (let k = 12; k >= 3; k--) pre = Math.max(pre, rms(i0 - k * win));
  let pk = 0; for (let k = 0; k < 30; k++) pk = Math.max(pk, rms(i0 + k * win));
  if (pk < pre * 2.5) return null;            // masked by something louder — not measurable
  const th = Math.max(pre * 2, pk * 0.2);
  for (let i = i0 - 6 * win; i < i0 + 30 * win; i += Math.max(1, Math.round(win / 8))) if (rms(i) > th) return (i - i0) / sr * 1000;
  return null;
}
const stats = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), mean = a.reduce((x, y) => x + y, 0) / a.length;
  return { n: a.length, min: +s[0].toFixed(2), mean: +mean.toFixed(2), max: +s[s.length - 1].toFixed(2), exact: mean }; };

export function measureAll(tag, stems, strict){
  const fails = [], lines = [], f = n => path.join(OUT, tag + '-' + n + '.wav');
  const L = { mix: loudness(f('mix')) };
  if (stems) for (const p of ['bass', 'comp', 'drums']) L[p] = loudness(f(p));
  for (const k of Object.keys(L)) lines.push(`  ${k.padEnd(5)} I ${String(L[k].I).padStart(6)} LUFS   true peak ${String(L[k].truePeak).padStart(6)} dBFS   LRA ${L[k].LRA}`);
  if (L.mix.truePeak > -1) fails.push('mix true peak ' + L.mix.truePeak + ' dBFS (want < -1)');
  if (Math.abs(L.mix.I + 16) > 1.5) fails.push('mix loudness ' + L.mix.I + ' LUFS (want about -16)');
  if (stems){
    lines.push(`  balance: drums-bass ${(L.drums.I - L.bass.I).toFixed(1)} LU   comp-bass ${(L.comp.I - L.bass.I).toFixed(1)} LU`);
    if (Math.abs(L.drums.I - L.bass.I) > 1.5) fails.push('bass/drums not balanced');
    if (Math.abs(L.comp.I - L.bass.I + 3) > 1.5) fails.push('piano not ~3 LU under the bass');
    const ev = JSON.parse(fs.readFileSync(path.join(OUT, tag + '-events.json'), 'utf8')), w = readWav(f('drums'));
    const d = ev.events.filter(e => e.part === 'drums');
    const groups = { sticks: d.filter(e => e.piece === 'sticks'), 'ride on the beat': d.filter(e => e.piece === 'ride' && Number.isInteger(e.pos)),
      'ride skip note (x.5)': d.filter(e => e.piece === 'ride' && Math.abs(e.pos % 1 - 0.5) < 1e-6), 'hat foot': d.filter(e => e.piece === 'hatFoot') };
    // The bus compressor delays everything by a constant ~6 ms, so judge each group against
    // the count-in sticks (nothing else sounding). With humanise on, simultaneous pieces are
    // jittered independently, so a hit can be detected up to ~6 ms early via its neighbour.
    let ref = null;
    for (const [name, list] of Object.entries(groups)){
      const errs = list.map(e => onsetError(w, e.time)).filter(x => x != null), st = stats(errs);
      lines.push(`  onset − scheduled, ${name}: ${st ? `n=${st.n}/${list.length} min ${st.min} mean ${st.mean} max ${st.max} ms` : 'not measurable (' + list.length + ' events)'}`);
      if (!st) continue;
      if (name === 'sticks'){ ref = st.mean; if (st.max - st.min > 1 || st.mean < 0 || st.mean > 12) fails.push('stick clicks not sample-tight: ' + JSON.stringify(st)); continue; }
      const lo = strict ? -1.5 : -7, hi = strict ? 1.5 : 7;    // loose: a quiet hit is detected via its (independently jittered) louder neighbour
      if (ref != null && (st.min - ref < lo || st.max - ref > hi)) fails.push('audio onsets off the scheduled grid for ' + name);
    }
    if (ref != null) lines.push(`  constant output delay (bus compressor look-ahead + attack): ${ref} ms`);
    // the scheduled grid itself: skip notes must sit at the swing fraction of the beat
    const fr = d.filter(e => Math.abs(e.pos % 1 - 0.5) < 1e-6).map(e => e.L - Math.floor(e.L)), sf = stats(fr);
    lines.push(`  scheduled swing fraction: ${sf ? sf.exact.toFixed(4) : 'n/a'} (expected ${ev.swing.toFixed(4)} at ${ev.tempo} bpm)`);
    if (sf && Math.abs(sf.exact - ev.swing) > 0.002) fails.push('swing fraction wrong');
    const beatErr = d.filter(e => Number.isInteger(e.pos)).map(e => (e.time - (0.12 + e.L * 60 / ev.tempo)) * 1000), sb = stats(beatErr);
    lines.push(`  scheduled time − ideal grid (humanise jitter), on-beat drum hits: min ${sb.min} mean ${sb.mean} max ${sb.max} ms`);
    if (sb.min < -3.5 || sb.max > 3.5) fails.push('drum jitter exceeds 3 ms');
    if (strict && (sb.min < -0.01 || sb.max > 0.01)) fails.push('humanize 0 should be exactly on the grid');
  }
  return { text: 'MEASURE ' + tag + '\n' + lines.join('\n'), fails, L };
}
