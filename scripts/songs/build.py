#!/usr/bin/env python3
"""Build every song (words and chords) into the site's two song files.

    python3 scripts/songs/build.py

Sources, all in scripts/songs/src (edit these, never the output):
  <slug>.cho            ChordPro: words, chords, band grids, versions (format: top of chordpro.py)
  <slug>.page.md        a song written by hand as a page (Frosty, words only)
  twelve-days-of-christmas-seed.cho + .template.md   built by twelve-days.py
  *-seed.cho            scratch, not built
  <slug>.band.json, backing-track-setups.json         band setups (chordpro.py band_setup)
  programmes.json       concerts: ordered song ids, title, date, note
  *.chordsheet          Ultimate-Guitar style sheets the .cho files were made from (chordsheet.py); not read here

Writes, and only these (few files for Cloudflare hosting, as with the score bundles):
  apps/shared/data/songs.js            window.SONGS = { songs: {slug: {...}}, programmes: [...] }, read by songs/index.qmd
  apps/shared/works/works-data.js      the block between "songs:begin" and "songs:end": window.SONG_INDEX, a short list
                                       (title, key, chords, first line) for the Tune Directory, so it need not load songs.js
After a build, bump songs.js (and works-data.js if the list changed):
  node scripts/check-pages.mjs --bump apps/shared/data/songs.js

Each song's page is made the way the carols site made it (chordpro.py writes a .qmd), then turned into HTML by
pandoc with Quarto's section layout (section.level2 > h2), which the page code (apps/shared/songs/song-page.js) expects.
The build lists every section with its band bars; NO BARS means the band cannot play that section.
"""
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
SITE = HERE.parent.parent
SRC = HERE / 'src'
OUT = SITE / 'apps' / 'shared' / 'data' / 'songs.js'
WORKS = SITE / 'apps' / 'shared' / 'works' / 'works-data.js'


def run(args, env):
    r = subprocess.run(args, env=env, text=True, capture_output=True)
    sys.stdout.write(r.stdout)
    if r.returncode:
        sys.stderr.write(r.stderr)
        raise SystemExit('failed: %s' % ' '.join(map(str, args)))


def front(text):
    m = re.match(r'---\n(.*?)\n---\n', text, re.S)
    meta = {}
    if m:
        for line in m.group(1).split('\n'):
            k, _, v = line.partition(':')
            meta[k.strip()] = v.strip().strip('"')
        text = text[m.end():]
    return meta, text


def directives(cho):
    d = {}
    for k, v in re.findall(r'^\{\s*([a-z_]+)\s*:\s*(.*?)\s*\}\s*$', cho, re.M | re.I):
        d.setdefault(k.lower(), v)
    return d


def plain(html):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', html)).strip()


def first_words(html):
    """The first sung words: chords, pronunciation lines and chord-only lines left out."""
    h = re.sub(r'<span class="ch">.*?</span>', '', html, flags=re.S)
    h = re.sub(r'<div class="abc.*?</div>\s*</div>', '', h, flags=re.S)
    for block in re.findall(r'<div class="(?:cline|day-verse)[^"]*">(.*?)</div>', h, flags=re.S) + re.findall(r'<p>(.*?)</p>', h, flags=re.S):
        block = re.sub(r'<span class="pr[^"]*">.*?</span>', '', block, flags=re.S)
        words = plain(block)
        if len(re.findall(r'[A-Za-zÀ-ÿ]{2,}', words)) >= 3:
            return words[:80].rsplit(' ', 1)[0] + '…' if len(words) > 80 else words
    return ''


def main():
    import os
    tmp = Path(tempfile.mkdtemp(prefix='songs-'))
    env = dict(os.environ, SONGS_OUT=str(tmp))
    chos = sorted(p for p in SRC.glob('*.cho') if not p.stem.endswith('-seed'))
    run([sys.executable, str(HERE / 'chordpro.py')] + [str(p) for p in chos], env)
    run([sys.executable, str(HERE / 'twelve-days.py')], env)
    for p in SRC.glob('*.page.md'):
        shutil.copy(p, tmp / (p.name[:-len('.page.md')] + '.qmd'))

    programmes = json.loads((SRC / 'programmes.json').read_text(encoding='utf-8'))
    songs, index = {}, []
    for page in sorted(tmp.glob('*.qmd')):
        slug = page.stem
        meta, body = front(page.read_text(encoding='utf-8'))
        # prev / next are drawn by the page from the programme it was opened from
        body = re.sub(r'^::: \{\.songnav\}\n.*?^:::\n', '', body, flags=re.S | re.M)
        html = subprocess.run(['quarto', 'pandoc', '-f', 'markdown', '-t', 'html', '--section-divs', '--wrap=none'],
                              input=body, text=True, capture_output=True, check=True).stdout
        html = re.sub(r'<h2([^>]*)>', lambda m: '<h2%s>' % (m.group(1) if 'class=' in m.group(1)
                      else m.group(1) + ' class="anchored"'), html)
        title = re.sub(r'^\d+\.\s*', '', meta.get('title') or slug)
        src = SRC / (slug + '.cho')
        if not src.exists():
            src = SRC / (slug + '-seed.cho')
        d = directives(src.read_text(encoding='utf-8')) if src.exists() else {}
        first = first_words(html)
        unverified = bool(re.search(r'UNVERIFIED', src.read_text(encoding='utf-8'))) if src.exists() else False
        song = {'title': title, 'classes': meta.get('body-classes') or 'lyrics', 'html': html,
                'key': d.get('key', '') or meta.get('key', ''), 'time': d.get('time', ''), 'tempo': d.get('tempo', ''),
                'artist': d.get('artist') or d.get('composer') or '', 'first': first}
        if unverified:
            song['unverified'] = True
        songs[slug] = song
        index.append({'id': slug, 'title': title, 'key': song['key'], 'time': song['time'],
                      'artist': song['artist'], 'first': first, 'chords': 'class="ch"' in html,
                      'progs': [p['id'] for p in programmes if slug in [e.split('@')[0] for e in p['songs']]]})
    for p in programmes:
        missing = [s for s in (e.split('@')[0] for e in p['songs']) if s not in songs]
        if missing:
            print('programme %s: no song %s' % (p['id'], ', '.join(missing)))
    shutil.rmtree(tmp)

    data = {'songs': songs, 'programmes': programmes}
    OUT.write_text('// Built by scripts/songs/build.py from scripts/songs/src. Do not edit.\nwindow.SONGS = '
                   + json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + ';\n',
                   encoding='utf-8')
    block = ('// songs:begin (written by scripts/songs/build.py: the Words & Chords songs, for the Tune Directory)\n'
             'window.SONG_INDEX = ' + json.dumps(index, ensure_ascii=False) + ';\n// songs:end\n')
    w = WORKS.read_text(encoding='utf-8')
    if '// songs:begin' in w:
        w = re.sub(r'// songs:begin.*?// songs:end\n', lambda _: block, w, flags=re.S)
    else:
        w = w.rstrip('\n') + '\n\n' + block
    WORKS.write_text(w, encoding='utf-8')
    # the list, as text in the page itself, so site search finds every title and first line
    md = []
    for p in programmes:
        md += ['## %s {#%s}' % (p['title'], p['id']), '']
        if p.get('note'):
            md += [p['note'], '']
        md += ['::: {.programme}']
        for n, e in enumerate(p['songs']):
            slug = e.split('@')[0]
            if slug in songs:
                md.append('%d. [%s](?id=%s&prog=%s)' % (n + 1, songs[slug]['title'], slug, p['id']))
        md += [':::', '']
    md += ['## All songs {#all-songs}', '', '::: {.songs-list}',
           '| Song | Key | Begins | In |', '|---|---|---|---|']
    titles = {p['id']: p['title'] for p in programmes}
    for row in sorted(index, key=lambda r: r['title'].lower()):
        mark = ' *(chords unverified)*' if songs[row['id']].get('unverified') else ''
        md.append('| [%s](?id=%s)%s | %s | [%s]{.sl-first} | %s |' % (
            row['title'], row['id'], mark, row['key'], row['first'].replace('|', '/'),
            ', '.join(titles[x] for x in row['progs'])))
    md += [':::', '']
    page = SITE / 'songs' / 'index.qmd'
    t = page.read_text(encoding='utf-8')
    t = re.sub(r'(<!-- songs:begin[^\n]*-->\n).*?(<!-- songs:end -->)',
               lambda m: m.group(1) + '\n'.join(md) + '\n' + m.group(2), t, flags=re.S)
    page.write_text(t, encoding='utf-8')

    print('%d songs, %d programmes -> %s (%d KB)' % (len(songs), len(programmes),
          OUT.relative_to(SITE), OUT.stat().st_size // 1024))


if __name__ == '__main__':
    main()
