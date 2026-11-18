#!/usr/bin/env python3
"""Replace library tunes that came from the Open Book import (N:Source: openbook) with the exact conversion
from the LilyPond sources. Writes an abc-edits JSON for scripts/apply-abc-edits.mjs (which bar-checks each tune).
  python3 -I scripts/realbooks/openbook-to-library.py [slug ...|--all] --out edits.json
Keeps each tune's X: number and %%id; drops the needs-repair tag (the notes are now read from source, not from OMR).
The old importer's aligned lyrics (w: lines) are NOT carried over."""
import re, sys, os, json, importlib.util
here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('c', os.path.join(here, 'openbook-ly2abc.py')); c = importlib.util.module_from_spec(spec); spec.loader.exec_module(c)
sys.path.insert(0, here)
from abcfmt import format_abc
repo = os.path.join(here, '..', '..')
lib = open(os.path.join(repo, 'apps/tunes/tunes-object.js')).read()
blocks = {}
for m in re.finditer(r'X:(\d+)\nT:([^\n]*)\n(?:[^\n]*\n)*?%%id ([^\n]+)\n', lib):
    a = m.start(); b = lib.find('\n\nX:', a); blk = lib[a:b if b > 0 else len(lib)]
    if 'N:Source: openbook' in blk: blocks[m.group(3).strip()] = (m.group(1), blk)
args = sys.argv[1:]; out = 'edits.json'
if '--out' in args: j = args.index('--out'); out = args[j+1]; del args[j:j+2]
slugs = [a for a in args if not a.startswith('--')]
def slug_of(i): return i.replace('-', '_')
edits = {}; skipped = []
for tid, (x, blk) in sorted(blocks.items()):
    base = re.sub(r'-\d+$', '', tid) if tid not in [] else tid
    slug = None
    for cand in (tid.replace('-', '_'), re.sub(r'-\d+$', '', tid).replace('-', '_')):
        if os.path.exists('%s/%s.ly.mako' % (c.SRC, cand)): slug = cand; break
    if not slug: skipped.append((tid, 'no Open Book source file')); continue
    if slugs and '--all' not in sys.argv and slug not in slugs and tid not in slugs: continue
    try:
        meta, voice, chords, vers = c.load('%s/%s.ly.mako' % (c.SRC, slug))
        abc, info = c.to_abc(slug, meta, voice, chords)
        if info['off'] or info['unplaced']: raise c.Bad('bars off / chords unplaced')
    except c.Bad as e: skipped.append((tid, str(e))); continue
    fm, st = format_abc(abc)
    lines = fm.split('\n'); outl = []
    for l in lines:
        if l.startswith('X:'): outl.append('X:' + x)
        elif l.startswith('%source'): outl.append('N:Source: openbook (read from its LilyPond source; version ' + meta['version'] + ')')
        elif l.startswith('%style'): outl.append('N:' + l[7:])
        elif l.startswith('K:'): outl.append('%%id ' + tid); outl.append(l)
        else: outl.append(l)
    edits[tid] = '\n'.join(outl).rstrip() + '\n'
json.dump({'app': 'abc-edits', 'edits': edits}, open(out, 'w'), indent=1)
print(len(edits), 'tunes ->', out); [print('  skipped', t, r) for t, r in skipped[:40]]
