#!/usr/bin/env python3
"""Build a song page for the site from a ChordPro file.

ChordPro writes each chord in brackets, in the words, where it is played:

    You can [C]count on me like [Em]one, two, three

which is the form you edit. The page needs the chord above its own words in a
proportional font, so each chord is pinned to the text that follows it and the
pair is rendered as one inline-block: the chord sits over its words whatever
the font or the wrapping.

What is understood:

    {title: Jingle Bell Rock}      the page title, without its programme number
    {start_of_verse: Verse 1}      a section, i.e. one `## heading` on the page
    {sov} {soc} {start_of_bridge}  short forms; a chorus is labelled "Chorus"
                                   and a verse is numbered if it has no label
    {comment: D.C. al Fine}        a section with no lines of its own
    {comment: Segno}               where a later {comment: D.S. al Coda} goes
                                   back to (the section under it), not the top
    {end_of_verse} and friends     accepted, and needed only to end a section
                                   early -- the next section closes this one
    # a line starting with a hash  a note to yourself; never reaches the page
    {chorus}                       the chorus again, exactly as written above
    {recall: Verse 1}              any earlier section again, by its heading

Pronunciation. A line sung in another language can carry two notes, written
on the lines directly beneath it (a section may have any number of such lines):

    Wie [Em]treu sind [A7]deine [A]Blät[D]ter
    {ipa: viː ˈtrɔʏ zɪnt ˈdaɪnə ˈblɛtɐ}
    {say: vee TROY zint DY-nuh BLET-uh}

The page hides them until the sidebar's IPA / Say it buttons (keys i, e) ask.
Neither reaches the band.

The band. A section can say what the backing band plays under it, bar by bar,
in a chord grid. It is not shown on the page (unless {show_grid} follows it in
the section: then its rows are printed, bar lines and all, where the words go;
for intros and solos with no words); the Band panel reads it.

    {tempo: 112}  {time: 4/4}  {style: carol}     for the whole song
    {style: bossa nova}            under a heading: for that section only (and
                                   for the later sections that borrow its bars)
    {comment: Verse 1}
    {start_of_grid}
    | D | Bm | A7 . D . | A . D . |
    {end_of_grid}

Each bar holds one chord, or several that share it evenly; a dot holds the
chord before it, so `A7 . . D` changes on beat 4. `%` plays the bar before
again, `|: ... :|` plays the bars between twice, and the words `fill` and
`stop` in a bar ask the drummer for a fill at the end of it, or for a stop
(`fill:small`, `fill:big` for the size). A time signature in a bar changes the
meter from that bar to the end of the grid: `| C | 2/4 G | 4/4 C |`. Eight
places in a bar of 4/4 are eighth notes, so `C . . . . G . .` changes on the
and of 3. The word `half` puts the band in half time from that bar to the end
of the grid, or to the word `normal`; it is felt two bars at a time, the pairs
counted from the top of the song (bars 1+2, 3+4), so a bar left without its
partner is played as written. The word `ballad` is half time too, with the
piano going over to slow ballad patterns for those bars whatever the style
(`half` leaves the piano to the style). The band ends a song on its own last
chord, in tempo; the word `rit` in a bar slows it down from that bar into the
ending, the last time through only. Each row of a grid is taken as a phrase:
in a style that asks for calm bars (Hymn, Folk carol) the chords are only
struck and held in a row's last bar, in the bar before it when that has two
chords or more, and in any bar with more chords than the song's usual bar.
The word `plain` in a bar asks for the same there. A section with no grid uses the
chords of its {start_of_abc} tune if it has one; failing that, the grid of
the last section with the same name -- so Verse 2 and Verse 3 play Verse 1's
bars without saying so. A section that ends up with no bars at all is listed
in the build output, and the band cannot play the song until it has some.

Other versions of the changes. The song as written above is the authoritative
one, and the only one a student sees. A teacher (see site/teacher.html) can
switch the band, and the chords over the words, to any other version written
in a block of its own:

    {start_of_version: Songbook}
    style: swing                   optional; also tempo: and source:
    Anything else is a note about the version, shown when it is chosen.
    Verse, Interlude:
    | Eb | % | Bb7 | % |
    Bridge:
    | G D7 | G | G D7 | G |
    {end_of_version}

A name with a colon says which sections the grid rows under it are for
(`Verse` covers Verse 1, 2, 3); a section the block does not mention keeps its
written bars. A version must have the same number of bars in a section as the
written one. A chord over the words is relabelled with the version's chord in
the same place: the same one in order where the bar has as many chords as
written, otherwise the chord sounding at that point of the bar.

Or the whole song's bars can be written once, as ABC, in a block labelled
`band`. Nothing of it is drawn; it is only what the band reads:

    {start_of_abc: band}
    M:4/4
    L:1/4
    K:A
    P:Chorus
    "A"z4 | "D"z4 | "A"z4 | "D"z4 |
    P:Bridge
    "A7"z4 | "D"z4 | ...
    {end_of_abc}

Each `P:` line names the section whose bars follow, and a section of the page
takes the bars of the part with its name (`Verse 2` takes `P:Verse 2` if there
is one, else `P:Verse`). The parts are a store of bars, not a running order:
the order, the repeats and a da capo are the page's. M:, K: and Q: there stand
in for {time:}, {key:} and {tempo:}, and a comment line `% Style: piano ballad`
for {style:}. A section's own grid or tune still comes first. A block with no
P: lines at all (or the bars above the first one) is a loop -- four bars that
go round under the whole song, say -- for every section with no part of its
own. How long such a section lasts comes from its lines:

    {bars_per_line: 2}             above the first section: for the whole song
    {comment: Outro}
    {bars_per_line: 4}             inside a section: for that section only

A line with words lasts that many bars of the loop. A line of chords alone is
played as written, a bar to each chord, as often as its (x2) says. With no
{bars_per_line} the loop is played once per section and the band starts out
holding each section until j or the pedal moves it on.

The band's settings. Everything chosen on the Backing Track page -- style,
bass line, rhythms, voicings, mixer -- can be kept beside the song: save a
setup there, press "Download all", and put the file in site/extra as
<song>.band.json. Or put the whole "Download all" file there as it comes,
backing-track-setups.json: a song takes the setup named like its title, or
the one {setup: name} asks for. Or keep one for many songs under a name of its own, say
swing-trio.band.json, and write {setup: swing-trio} in each song that wants it.
Only the band's settings are taken: the chart saved with a setup, its pinned
voicings and its bar numbers (stops, lifts, where to start) are left behind,
and so is its tempo when the song gives one. Its first setup (or the one named like the song's title)
is sent to the Backing Track window with the song, and the band on the page
itself takes what it understands of it: tempo, style, feel, bass line,
rhythm, groove and voicing. Settings made section by section on the
Backing Track page are saved in the setup under the sections' names (Verse 1,
Chorus) and are put back on the sections of this song with those names, in
both places; a renamed heading loses its settings. The chart inside the setup is ignored; the bars
always come from the song file.

A line of chords with no words -- `[A] [Faug] [Dmaj7] [Dm6]` -- is an
instrumental bar, laid out by the run rather than over words it does not have;
a repeat marker such as (x2) travels with it. A line wrapped in *asterisks* is
italicised, which is how the site marks a chorus that is sung, not read.

The programme number and the previous/next links come from the song's place in
site/_quarto.yml, so ordering the sidebar orders the pages. A song that is not
listed there is built as an unlisted page that links back to the programme.

Usage: chordpro.py site/extra/*.cho
"""
import argparse
import html
import itertools
import json
import os
import re
from pathlib import Path

# In the music site: sources in scripts/songs/src, pages written as .qmd to a
# scratch folder (SONGS_OUT) that build.py turns into apps/shared/data/songs.js.
ROOT = Path(__file__).resolve().parent
SRC = ROOT / 'src'
SONGS = Path(os.environ.get('SONGS_OUT') or (ROOT / '.build'))

DIRECTIVE = re.compile(r'^\s*\{\s*([a-z_]+)\s*(?::\s*(.*?)\s*)?\}\s*$', re.I)
CHORD_TAG = re.compile(r'\[([^\]]*)\]')
ITALIC = re.compile(r'^\s*\*(.+)\*\s*$')
# A bar count or repeat marker written beside a run of chords: (x2), [X4].
REPEAT = re.compile(r'^[(\[]?[xX]\d+[)\]]?$')

# A direction is read, not played: D.C. al Fine, D.S., Segno, Fine.
DIRECTION = re.compile(r'^(d\.?\s*[cs]\b|fine$|segno$)', re.I)

ABC_START = {'start_of_abc', 'soa'}
ABC_END = {'end_of_abc', 'eoa'}
GRID_START = {'start_of_grid', 'sog'}
GRID_END = {'end_of_grid', 'eog'}
VERSION_FIELDS = ('style', 'tempo', 'source')
STARTS = {'start_of_verse': 'verse', 'sov': 'verse',
          'start_of_chorus': 'chorus', 'soc': 'chorus',
          'start_of_bridge': 'bridge', 'sob': 'bridge',
          'start_of_part': 'part', 'sop': 'part',
          'start_of_tab': 'tab', 'sot': 'tab'}
ENDS = {'end_of_verse', 'eov', 'end_of_chorus', 'eoc', 'end_of_bridge', 'eob',
        'end_of_part', 'eop', 'end_of_tab', 'eot'}
# {ipa: ...} and {say: ...} under a lyric line annotate that line: its
# pronunciation in IPA, and as an English speaker would read it.
PRONUNCIATION = {'ipa': 'ipa', 'say': 'say'}
DEFAULT_LABEL = {'chorus': 'Chorus', 'bridge': 'Bridge'}


def split_line(line):
    """[(chord, text)] for one lyric line; chord is '' before the first one.

    The words after a chord belong to it -- that is what the brackets mean --
    so they are collected onto the chord they follow, not the one they precede.
    """
    parts, at = [], 0
    for m in CHORD_TAG.finditer(line):
        text = line[at:m.start()]
        if parts:
            parts[-1] = (parts[-1][0], parts[-1][1] + text)
        elif text:
            parts.append(('', text))
        parts.append((m.group(1).strip(), ''))
        at = m.end()
    tail = line[at:]
    if parts:
        parts[-1] = (parts[-1][0], parts[-1][1] + tail)
    elif tail:
        parts = [('', tail)]
    return parts


def render_bar(chords):
    """A run of chords with no words under it: an intro, a turnaround, a vamp.

    Without lyrics to sit over there is nothing to align to, and at chord size
    the names crowd together, so they are laid out in order with room between
    them. A repeat marker travels with them.
    """
    return '<span class="ibar">%s</span>' % ''.join(
        '<span class="ch">%s</span>' % html.escape(c) for c in chords)


def render_line(segments):
    """One lyric line, each chord bound to the words that follow it."""
    if not any(chord for chord, _ in segments):
        return '<span class="cw">%s</span>' % html.escape(
            ''.join(text for _, text in segments))

    # An instrumental bar: chords, and at most a repeat marker for words.
    words = ''.join(text for _, text in segments).strip()
    if not words or REPEAT.match(words):
        chords = [c for c, _ in segments if c]
        return render_bar(chords + ([words] if words else []))

    # A chord can land mid-word ("bes[G]ide"), which is real chord placement
    # but leaves a point the line could wrap. Keep such segments on one line.
    # Split a continuing segment at its first space, so only the word that the
    # chord broke is held together, not the whole rest of the line.
    split = []
    for chord, text in segments:
        joined = split and not split[-1][1].endswith(' ') and split[-1][1]
        if joined and ' ' in text.strip():
            cut = text.index(' ', text.index(text.strip()[0])) + 1
            split.append((chord, text[:cut]))
            split.append(('', text[cut:]))
        else:
            split.append((chord, text))

    groups, group = [], []
    for chord, text in split:
        group.append((chord, text))
        if text.endswith(' ') or not text:
            groups.append(group)
            group = []
    if group:
        groups.append(group)

    if groups and groups[0]:
        first = groups[0][0]
        if not first[0] and not first[1].strip():
            groups = groups[1:]
        else:
            groups[0][0] = (first[0], first[1].lstrip())

    out = []
    for group in groups:
        # A chord with no words after it -- the change on a held note at the
        # end of a line -- is marked, so the page can keep the lyric row it
        # would otherwise lack and leave the chord up on its own line.
        segs = ''.join(
            '<span class="cw%s">%s%s</span>'
            % (' bare' if c and not t.strip() else '',
               ('<span class="ch">%s</span>' % html.escape(c)) if c else '',
               html.escape(t) if t.strip() else '')
            for c, t in group)
        out.append(segs if len(group) == 1 else '<span class="nb">%s</span>' % segs)
    return ''.join(out)


FILL_WORD = re.compile(r'^fill(?::(small|short|big|large|long))?$', re.I)


def parse_grid(lines):
    """The bars of a chord grid: [{'c': [chord or '.', ...], 'fill', 'stop'}].

    Bars are what lies between the bar lines. `%` copies the bar before it
    (its chords, not its marks), `|: ... :|` is played twice, a time signature
    in a bar (`2/4`) holds from that bar to the end of the grid, and anything in
    parentheses -- (Segno), (D.S. al Fine) from an iReal chart -- is a remark.
    The last bar of each row is the end of a phrase ('end'), and the word
    `plain` in a bar asks for its chords to be only struck and held ('plain').
    """
    bars, open_at, meter, half, ballad = [], None, None, False, False
    ROW = '\x00'                                   # where a row of the grid ends
    text = ' '.join(line + ' ' + ROW for line in lines)
    for cell in re.split(r'(\|:|:\|\||:\||\|\||\||\x00)', text):
        cell = cell.strip()
        if cell == ROW:
            if bars:
                bars[-1]['end'] = True
            continue
        if cell == '|:':
            open_at = len(bars)
            continue
        if cell in (':||', ':|'):
            if open_at is not None:
                bars.extend(dict(b) for b in bars[open_at:])
            open_at = None
            continue
        if not cell or cell in ('|', '||'):
            continue
        bar = {'c': []}
        for token in re.sub(r'\([^)]*\)', ' ', cell).split():
            token = token.strip(':')
            fill = FILL_WORD.match(token)
            if fill:
                size = (fill.group(1) or '').lower()
                bar['fill'] = ('small' if size in ('small', 'short')
                               else 'large' if size else 'medium')
            elif token.lower() == 'stop':
                bar['stop'] = True
            elif re.match(r'^\d+/\d+$', token):
                meter = token
            elif token.lower() in ('half', 'half-time', 'halftime'):
                half, ballad = True, False
            elif token.lower() in ('ballad', 'half:ballad'):
                half, ballad = True, True
            elif token.lower() in ('normal', 'a-tempo'):
                half, ballad = False, False
            elif token.lower() in ('rit', 'rit.', 'ritard', 'ritardando'):
                bar['rit'] = True
            elif token.lower() == 'plain':
                bar['plain'] = True
            elif token == '%':
                if bars:
                    bar['c'] = list(bars[-1]['c'])
            elif token:
                bar['c'].append(token)
        if bar['c'] or bar.get('fill') or bar.get('stop'):
            if not bar['c'] and bars:
                bar['c'] = list(bars[-1]['c'])
            if meter:
                bar['m'] = meter
            if half:
                bar['feel'] = 'half'
            if ballad:
                bar['half'] = 'ballad'
            bars.append(bar)
    return bars


def parse_version(name, lines):
    """One {start_of_version} block: its fields, its note and its grids."""
    out = {'name': name, 'grids': {}}
    note, rows, targets = [], {}, None
    for line in lines:
        text = line.strip()
        if text.startswith('#'):
            continue
        field = re.match(r'^([a-z]+)\s*:\s*(.+)$', text, re.I)
        if text.startswith('|'):
            if targets is None:
                print('   version %s: bars with no section named above them' % name)
                continue
            rows.setdefault(targets, []).append(text)
        elif field and field.group(1).lower() in VERSION_FIELDS:
            out[field.group(1).lower()] = field.group(2).strip()
        elif re.match(r'^[^|]+:$', text):
            targets = text[:-1]
        else:
            note.append(text)
    for names, grid in rows.items():
        bars = parse_grid(grid)
        for one in names.split(','):
            if one.strip():
                out['grids'][one.strip().lower()] = bars
    # Blank lines in the note are paragraph breaks.
    out['note'] = re.sub(r'\n{2,}', '\n', '\n'.join(
        ' '.join(run) for run in
        (list(g) for k, g in itertools.groupby(note, bool) if k))).strip()
    return out


def base_name(title):
    """`Verse 2` and `Verse` are the same kind of section."""
    return re.sub(r'\s+\d+$', '', title.strip()).lower()


def band_parts(abc):
    """The `band` ABC block, cut at its P: lines: (header, {name: body}).

    The header is what every part needs to stand alone -- meter, unit, key.
    """
    head, parts, name, started = [], {}, None, False
    for line in abc.split('\n'):
        text = line.strip()
        style = re.match(r'^%+\s*style\s*:\s*(.+)$', text, re.I)
        if style:
            head.append('%%style ' + style.group(1).strip())
        if not text or text.startswith('%'):
            continue
        if re.match(r'^P:', text) and started:
            name = text[2:].strip()
            parts.setdefault(name.lower(), [])
        elif re.match(r'^[A-Za-z]:', text) and not re.match(r'^[A-Ga-gzZ]:\|', text):
            if re.match(r'^[MLKQ]:', text):
                head.append(text)
            if text.startswith('K:'):
                started = True
        elif name is not None:
            parts[name.lower()].append(text)
        else:
            parts.setdefault('', []).append(text)
    return head, {k: '\n'.join(v) for k, v in parts.items() if v}


# What a saved setup says about one tune's bars rather than about the band.
TUNE_FIELDS = ('bt-stops', 'bt-lift', 'bt-half', 'bt-fillbars', 'bt-start',
               'bt-cyc-from', 'bt-cyc-to', 'bt-step-a', 'bt-step-b',
               'bt-choruses', 'bt-intro', 'bt-intro-bars', 'bt-intro-range',
               'bt-gap', 'bt-gap-bars', 'bt-gap-range')


def band_setup(source, title, shared=None, own_tempo=False):
    """The Backing Track setup for a song, without anything of a tune.

    Looked for in this order: the file {setup: name} points at
    (site/extra/<name>.band.json); the setup of that name in the file of all
    of them (site/extra/backing-track-setups.json, as "Download all" saves
    it); the song's own <song>.band.json; the setup named like the song's
    title in the file of all of them.
    """
    def read(path):
        if not path.exists():
            return []
        try:
            saved = json.loads(path.read_text(encoding='utf-8'))
        except ValueError:
            print('   %s is not JSON; ignored' % path.name)
            return []
        if isinstance(saved, dict):
            saved = [saved]
        return [s for s in saved if isinstance(s, dict)]

    def named(saved, name):
        name = re.sub(r'^\d+\.\s*', '', name).strip().lower()
        return [s for s in saved if re.sub(
            r'^\d+\.\s*', '', str(s.get('name', ''))).strip().lower() == name]

    everything = read(source.with_name('backing-track-setups.json'))
    found = None
    if shared:
        name = re.sub(r'(\.band)?\.json$', '', shared.strip())
        own = read(source.with_name(name + '.band.json'))
        found = (named(own, name) or own or named(everything, name) or [None])[0]
        if not found:
            print('   {setup: %s}: no %s.band.json, and no setup of that name '
                  'in backing-track-setups.json' % (shared, name))
            return None
    else:
        own = read(source.with_suffix('.band.json'))
        found = (named(own, title) or own or named(everything, title) or [None])[0]
    if not found:
        return None
    setup = dict(found)
    setup.pop('abc', None)
    setup.pop('pins', None)        # voicings pinned to another chart's bars
    setup.pop('pinsAuto', None)
    if isinstance(setup.get('fields'), dict):
        setup['fields'] = {k: v for k, v in setup['fields'].items()
                           if k not in TUNE_FIELDS}
    if isinstance(setup.get('checks'), dict):
        setup['checks'] = {k: v for k, v in setup['checks'].items()
                           if k not in ('bt-cyc-on', 'bt-step-on')}
    if own_tempo:
        setup.pop('tempo', None)   # the song has said how fast it goes
    return setup


def band_chart(meta, sections, grids):
    """What the band needs, section by section, in page order.

    Each section gets `bars` (from its grid), or `abc` (its tune, whose chord
    symbols the page reads), or the bars of an earlier section of the same
    name. `bars: None` means nobody has said what to play there.
    """
    chart, known = [], {}
    head, parts = band_parts(meta['band_abc']) if meta.get('band_abc') else ([], {})
    for line in head:
        if line.startswith('M:'):
            meta.setdefault('time', line[2:].strip())
        if line.startswith('K:'):
            meta.setdefault('key', line[2:].strip())
        if line.startswith('Q:'):
            beat = re.search(r'(\d+)\s*$', line)
            if beat:
                meta.setdefault('tempo', beat.group(1))
        if line.startswith('%%style '):
            meta.setdefault('style', line[8:])
    head = [line for line in head if line[:2] in ('M:', 'L:', 'K:')]
    loop = parts.get('')
    loop_bars = [b.strip() for b in re.split(r'\|\]?', loop or '') if b.strip()]
    # One bar of rest, in the block's own unit, for a chord written on a line.
    time = re.match(r'(\d+)\s*/\s*(\d+)', meta.get('time') or '4/4')
    unit = next((re.match(r'L:\s*(\d+)\s*/\s*(\d+)', l) for l in head
                 if l.startswith('L:')), None)
    whole = (int(time.group(1)) / int(time.group(2))) if time else 1
    rest = 'z%d' % round(whole * (int(unit.group(2)) / int(unit.group(1))
                                  if unit else 8))
    held = False
    for n, (name, items) in enumerate(sections):
        entry = {'name': name}
        if meta.get('_styles', {}).get(n):
            entry['style'] = meta['_styles'][n]
        part = parts.get(name.strip().lower()) or parts.get(base_name(name))
        if not part and loop_bars and not DIRECTION.match(name):
            count = meta.get('_per_line', {}).get(n) or meta.get('bars_per_line')
            lines = meta.get('_shapes', {}).get(n) or []
            if count and lines:
                bars, at = [], 0
                for chords, sung, times in lines:
                    if sung or not chords:
                        for _ in range(int(count) * times):
                            bars.append(loop_bars[at % len(loop_bars)])
                            at += 1
                    else:
                        bars += ['"%s"%s' % (c, rest) for c in chords] * times
                part = ' | '.join(bars) + ' |'
            else:
                part, held = loop, True
        if part and not grids.get(n) and not DIRECTION.match(name) and not any(
                isinstance(i, tuple) and i[0] == 'abc' for i in items):
            entry['abc'] = '\n'.join(head + [part])
            chart.append(entry)
            continue
        tunes = [i[1] for i in items if isinstance(i, tuple) and i[0] == 'abc']
        if grids.get(n):
            entry['bars'] = grids[n]
            if tunes:
                # The melody written out for the grid's bars (no chords of its own
                # needed): the band plays it, and the page knows the section has one.
                entry['melody_abc'] = tunes[0]
            known[base_name(name)] = entry
        elif tunes and re.search(r'"[A-G]', tunes[0]):
            entry['abc'] = tunes[0]
            known[base_name(name)] = entry
        elif base_name(name) in known:
            src = known[base_name(name)]
            entry.update({k: v for k, v in src.items()
                          if k != 'name' and not (k == 'style' and 'style' in entry)})
            entry['from'] = src['name']
        else:
            entry['bars'] = None
        chart.append(entry)
    out = {'sections': chart}
    versions = []
    for v in meta.get('versions') or []:
        mine, used = {}, set()
        for n, entry in enumerate(chart):
            key = next((k for k in (entry['name'].strip().lower(),
                                    base_name(entry['name']))
                        if k in v['grids']), None)
            if key is None or DIRECTION.match(entry['name']):
                continue
            used.add(key)
            have = entry.get('bars')
            if have and len(have) != len(v['grids'][key]):
                print('   version %s: %s has %d bars, the song has %d there'
                      % (v['name'], entry['name'], len(v['grids'][key]), len(have)))
            mine[str(n)] = v['grids'][key]
        for key in v['grids']:
            if key not in used:
                print('   version %s: no section called %s' % (v['name'], key))
        one = {k: v[k] for k in ('name', 'note') + VERSION_FIELDS if v.get(k)}
        one['sections'] = mine
        versions.append(one)
    if versions:
        out['versions'] = versions
    if held:
        out['loop'] = True
    for key in ('tempo', 'time', 'key', 'style'):
        value = meta.get(key) or meta.get('x_' + key)
        if value:
            out[key] = value
    return out


def parse(text):
    """(metadata, [(section title, [rendered lines])], grids) for one file.

    `grids` maps a section's position to the bars of its chord grid.
    """
    meta, sections, current, verses = {}, [], None, 0
    grids = {}
    raw_grids = {}                                 # the grid rows as written, for {show_grid}
    # For each section, its lines as the band counts them: (chords, sung, times).
    shapes, per_line = {}, {}
    meta['_shapes'], meta['_per_line'] = shapes, per_line

    def begin(title):
        nonlocal current
        current = (title, [])
        sections.append(current)

    abc = None
    abc_band = False
    grid = None
    version = None
    for raw in text.split('\n'):
        line = raw.rstrip()
        if version is not None:
            m = DIRECTIVE.match(line)
            if m and m.group(1).lower() == 'end_of_version':
                meta.setdefault('versions', []).append(
                    parse_version(*version))
                version = None
            else:
                version[1].append(line)
            continue
        if grid is not None:
            m = DIRECTIVE.match(line)
            if m and m.group(1).lower() in GRID_END:
                if current is None:
                    begin(grid[0] or 'Lyrics')
                at = len(sections) - 1
                grids[at] = grids.get(at, []) + parse_grid(grid[1])
                raw_grids[at] = raw_grids.get(at, []) + [r for r in grid[1] if r.strip()]
                grid = None
            elif not m and not line.lstrip().startswith('#'):
                grid[1].append(line)
            continue
        if abc is not None:
            m = DIRECTIVE.match(line)
            if m and m.group(1).lower() in ABC_END:
                if abc_band:
                    meta['band_abc'] = '\n'.join(abc)
                else:
                    if current is None:
                        begin('Tune')
                    current[1].append(('abc', '\n'.join(abc)))
                abc = None
            else:
                abc.append(line)
            continue
        if not line.strip() or line.lstrip().startswith('#'):
            continue
        m = DIRECTIVE.match(line)
        if m:
            name, value = m.group(1).lower(), (m.group(2) or '').strip()
            if name in PRONUNCIATION:
                # Belongs to the lyric line just above it; shown on request.
                mine = current[1] if current else []
                if not mine or not isinstance(mine[-1], str):
                    print('   {%s: ...} has no lyric line above it' % name)
                    continue
                mine[-1] += '<span class="pr %s">%s</span>' % (
                    PRONUNCIATION[name], html.escape(value))
                continue
            if name in ABC_START:
                abc = []
                abc_band = value.lower() == 'band'
                continue
            if name == 'start_of_version':
                version = (value or 'Version %d'
                           % (len(meta.get('versions', [])) + 1), [])
                continue
            if name == 'show_grid':
                rows = raw_grids.get(len(sections) - 1) if current is not None else None
                if not rows:
                    print('   {show_grid} with no grid above it in the section')
                    continue
                for row in rows:
                    current[1].append(grid_html(row))
                continue
            if name in GRID_START:
                # A grid with a label and no section open names its own.
                grid = (value, [])
                continue
            if name in ('chorus', 'recall'):
                # A section written once and played again: the same words,
                # the same bars, under the same heading.
                want = (value or 'Chorus').lower()
                found = next((k for k, sec in enumerate(sections)
                              if sec[0].lower() == want), None)
                if found is None:
                    print('   {%s: %s} has nothing to repeat' % (name, value))
                    continue
                at = len(sections)
                sections.append((sections[found][0], list(sections[found][1])))
                for store in (grids, shapes, per_line,
                              meta.setdefault('_styles', {})):
                    if found in store:
                        store[at] = store[found]
                current = None
                continue
            if name in ENDS:
                current = None
            elif name in STARTS:
                kind = STARTS[name]
                if kind == 'verse' and not value:
                    verses += 1
                    value = 'Verse %d' % verses
                elif kind == 'verse':
                    found = re.search(r'\d+', value)
                    if found:
                        verses = int(found.group())
                begin(value or DEFAULT_LABEL.get(kind, kind.title()))
            elif name in ('comment', 'c', 'comment_italic', 'ci'):
                begin(value)
            elif name == 'bars_per_line' and current is not None:
                per_line[len(sections) - 1] = value
            elif name == 'bars_per_line' and current is None:
                meta[name] = value
            elif name == 'style' and current is not None:
                # Under a heading: that section's own style.
                meta.setdefault('_styles', {})[len(sections) - 1] = value
            elif name != 'bars_per_line':
                meta[name] = value
            continue
        if current is None:
            begin('Lyrics')
        italic = ITALIC.match(line)
        if italic:
            line = italic.group(1)
        segs = split_line(line)
        words = ''.join(t for _, t in segs).strip()
        marks = [c for c, _ in segs if REPEAT.match(c)] + (
            [words] if REPEAT.match(words) else [])
        times = int(re.search(r'\d+', marks[0]).group()) if marks else 1
        shapes.setdefault(len(sections) - 1, []).append((
            [c for c, _ in segs if c and not REPEAT.match(c)],
            bool(words) and not REPEAT.match(words), times))
        out = render_line(segs)
        current[1].append('<em>%s</em>' % out if italic else out)
    return meta, sections, grids


def grid_html(row):
    """One grid row for the page: | E7 | % | E7 . D A | as bars, each a box with its bar line on the left (the
    row's last bar closes it). % is written out as the chord it repeats; a . (a beat held) is a gap: | E7   D A |.
    The chords are .gch, not .ch, so the band's lighting (which counts a section's .ch) is not thrown off."""
    last, out = '', []
    for b in [b.strip() for b in row.strip().strip('|').split('|')]:
        parts, toks = [], [x for x in b.split() if not re.fullmatch(r'\d+/\d+', x)]
        for k, tok in enumerate(toks):                # data-at: where in the bar it falls (k of len(toks)), for lighting
            if tok == '%':
                tok = last
            if tok == '.':
                parts.append('<span class="ghold"></span>')
            elif tok:
                last = tok
                parts.append('<span class="gch" data-at="%d">%s</span>' % (k, html.escape(tok)))
        out.append('<span class="gbar" data-n="%d">%s</span>' % (max(1, len(toks)), ''.join(parts)))
    return '<span class="grid-row">%s</span>' % ''.join(out)


def programme():
    """Prev/next and numbering are the page's job now (song-page.js)."""
    return []


def page_title(slug):
    """A neighbour's title, as its own page gives it, without the number."""
    path = SONGS / ('%s.qmd' % slug)
    if path.exists():
        m = re.search(r'^title:\s*"(.*)"\s*$', path.read_text(encoding='utf-8'),
                      re.M)
        if m:
            return re.sub(r'^\d+\.\s*', '', m.group(1))
    # A neighbour built later in the same run has no page yet; its source
    # knows its own name, and titlecasing the slug is the last resort.
    source = SRC / ('%s.cho' % slug)
    if source.exists():
        m = re.search(r'^\{\s*title\s*:\s*(.+?)\s*\}\s*$',
                      source.read_text(encoding='utf-8'), re.M)
        if m:
            return m.group(1)
    return slug.replace('-', ' ').title()


def build(source, concerts):
    meta, sections, grids = parse(source.read_text(encoding='utf-8'))
    band = band_chart(meta, sections, grids)
    setup = band_setup(source, meta.get('title') or '', meta.get('setup'),
                       bool(band.get('tempo')))
    if setup:
        band['setup'] = setup
    slug = source.stem
    title = meta.get('title') or page_title(slug)
    order = []
    for _, slugs in concerts:
        if slug in slugs:
            order = slugs
            break
    if order:
        n = order.index(slug)
        title = '%d. %s' % (n + 1, title)
        prev = ('&larr; %s' % page_title(order[n - 1]),
                '%s.qmd' % order[n - 1]) if n else ('&larr; Programme',
                                                    '../index.qmd')
        nxt = ('%s &rarr;' % page_title(order[n + 1]),
               '%s.qmd' % order[n + 1]) if n + 1 < len(order) else (
                   'Programme &rarr;', '../index.qmd')
    else:
        prev, nxt = ('&larr; Programme', '../index.qmd'), None

    out = ['---', 'title: "%s"' % title,
           'body-classes: %s' % (meta.get('body_classes') or 'lyrics has-chords'),
           '---', '']
    for name, items in sections:
        out.append('## %s' % name)
        out.append('')
        run = []

        def flush():
            out.append('::: {.cline}')
            out.append('\n'.join('<span class="ln">%s</span>' % line
                                 for line in run))
            out.append(':::')
            out.append('')
            del run[:]

        for item in items:
            if isinstance(item, tuple) and item[0] == 'abc':
                if run:
                    flush()
                out.append('<div class="abc-wrap"><div class="abc" '
                           'data-abc="%s"></div></div>'
                           % html.escape(item[1], quote=True).replace('\n', '&#10;'))
                out.append('')
            else:
                run.append(item)
        if run or not items:
            flush()
    # The band's bars ride along as data. Only when somebody has written some:
    # a song with no grid and no tune has no Band panel at all.
    if any(s.get('bars') or s.get('abc') for s in band['sections']):
        out.append('```{=html}')
        out.append('<script type="application/json" id="band-chart">%s</script>'
                   % json.dumps(band, ensure_ascii=False).replace('</', '<\\/'))
        out.append('```')
        out.append('')
    # The song file itself rides along where there are chords over the words,
    # for tapping in the bars (site/tap.html), which writes it out again.
    text = source.read_text(encoding='utf-8')
    if re.search(r'\[[A-G][^\]]*\]', text):
        mine = {'slug': slug, 'title': meta.get('title') or '', 'cho': text}
        for key in ('tempo', 'time', 'key', 'style'):
            if band.get(key):
                mine[key] = band[key]
        out.append('```{=html}')
        out.append('<script type="application/json" id="band-source">%s</script>'
                   % json.dumps(mine, ensure_ascii=False).replace('</', '<\\/'))
        out.append('```')
        out.append('')
    out.append('::: {.songnav}')
    out.append('[%s](%s){.nav-prev}' % prev)
    if nxt:
        out.append('[%s](%s){.nav-next}' % nxt)
    out += [':::', '']

    dest = SONGS / ('%s.qmd' % slug)
    dest.write_text('\n'.join(out), encoding='utf-8')
    return dest, sections, band


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('sources', nargs='+', type=Path)
    args = ap.parse_args()
    concerts = programme()
    for source in args.sources:
        dest, sections, band = build(source, concerts)
        print('%-34s -> %s' % (source.name, dest.name))
        playable = any(s.get('bars') or s.get('abc') for s in band['sections'])
        for (name, lines), part in zip(sections, band['sections']):
            if part.get('abc'):
                bars = 'band: its tune'
            elif part.get('bars'):
                bars = 'band: %d bars' % len(part['bars'])
            elif DIRECTION.match(name):
                bars = ''
            else:
                bars = 'band: NO BARS' if playable else ''
            if part.get('from'):
                bars += ' (as %s)' % part['from']
            print('   %-14s %d lines   %s' % (name, len(lines), bars))


if __name__ == '__main__':
    main()
