#!/usr/bin/env python3
"""Draft and check the `w:` lyric lines under a melody written into a ChordPro song.

A song section holds its melody as an ABC block and its words as ordinary
ChordPro lyric lines after it:

    {comment: Verse 1}
    {start_of_abc: melody}
    M:4/4
    L:1/4
    K:Db
    "Db"F2 G A | "Ab"B4 |]
    {end_of_abc}
    I used to [Db]rule the [Ab]world

`align` reads the notes, splits the words into syllables and writes a draft `w:`
line under every line of music. `lint` checks that the `w:` lines still say what
the ChordPro words say, and that no bar has more syllables than notes.

    lyrics_align.py align  [--write] [--slur-melisma] FILE...
    lyrics_align.py lint   FILE...
    lyrics_align.py syllables WORD...
    lyrics_align.py override WORD ho-ly

How it decides (all of it checked against abcjs, which draws these pages):

  * a rest takes no syllable; a tied note's second half takes a `*`; a `|` in the
    `w:` line starts the next bar, so a bar with too few syllables does not push
    the rest of the line out of place (too MANY still spills into the next bar,
    which `lint` reports).
  * syllable counts come from CMUdict, the split points from TeX hyphenation
    patterns, and anything you correct goes into syllable-overrides.json, so each
    word is only ever fixed once. Words where the two disagree are listed.
  * `% lyrics: draft` marks a w: set this tool wrote. `align` replaces drafts and
    never touches a w: set without the marker: delete the marker when you have
    corrected the lines and they are yours.

Needs pyphen and cmudict:  python3 -m venv .venv && .venv/bin/pip install -r tools/requirements.txt
"""
import difflib
import json
import os
import re
import sys
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
OVERRIDES = os.path.join(HERE, 'syllable-overrides.json')
DRAFT = '% lyrics: draft'

DIRECTIVE = re.compile(r'^\s*\{\s*([a-z_]+)\s*(?::\s*(.*?)\s*)?\}\s*$', re.I)
CHORD_TAG = re.compile(r'\[[^\]]*\]')
FIELD = re.compile(r'^[A-Za-z]:')
ABC_START = {'start_of_abc', 'soa'}
ABC_END = {'end_of_abc', 'eoa'}
GRID_START = {'start_of_grid', 'sog'}
GRID_END = {'end_of_grid', 'eog'}
SECTION_OPEN = {'start_of_verse', 'sov', 'start_of_chorus', 'soc',
                'start_of_bridge', 'sob', 'start_of_part', 'sop'}


# --------------------------------------------------------------------------
# Syllables
# --------------------------------------------------------------------------

_cmu = None
_dic = None


def _tools():
    global _cmu, _dic
    if _cmu is None:
        try:
            import cmudict
            import pyphen
        except ImportError:
            sys.exit('lyrics_align needs pyphen and cmudict:\n'
                     '  python3 -m venv .venv && .venv/bin/pip install -r tools/requirements.txt\n'
                     '  .venv/bin/python tools/lyrics_align.py ...')
        _cmu = cmudict.dict()
        _dic = pyphen.Pyphen(lang='en_US', left=1, right=1)
    return _cmu, _dic


def load_overrides():
    try:
        with open(OVERRIDES) as f:
            return {k.lower(): v for k, v in json.load(f).items() if not k.startswith('_')}
    except FileNotFoundError:
        return {}


# The vowels, with the accented ones of the European languages the carols are sung in (ä ö ü é è à å ø œ ...)
VOWELS = '[aeiouy\u00e0-\u00e6\u00e8-\u00ef\u00f2-\u00f6\u00f8-\u00fd\u00ff\u0153]'


def _vowel_cuts(word):
    """Fallback split points: between vowel groups, VCV -> V-CV, VCCV -> VC-CV."""
    cuts = []
    groups = [m for m in re.finditer(VOWELS + '+', word.lower())]
    for a, b in zip(groups, groups[1:]):
        gap = b.start() - a.end()
        cuts.append(a.end() if gap == 0 else (b.start() - 1 if gap == 1 else a.end() + 1))
    return cuts


def syllable_count(word):
    cmu, dic = _tools()
    w = word.lower().replace('’', "'")
    for cand in (w, re.sub(r"'s?$", '', w)):
        prons = cmu.get(cand)
        if prons:       # fire, hour, every: the shortest reading is the one songs use
            return min(sum(1 for ph in pr if ph[-1].isdigit()) for pr in prons), 'cmu'
    return max(1, len(dic.positions(w)) + 1), 'pyphen'


def split_word(word, overrides):
    """(pieces, how) for one bare word. how: override | exact | guess."""
    low = word.lower().replace('’', "'")
    if low in overrides:
        spec = overrides[low]
        if spec.replace('-', '') == low:
            cuts, at = [], 0
            for part in spec.split('-')[:-1]:
                at += len(part)
                cuts.append(at)
            return _cut(word, cuts), 'override'
        print('   (syllable-overrides.json: "%s" does not spell "%s", ignored)' % (spec, word),
              file=sys.stderr)
    n, source = syllable_count(word)
    n = max(1, n)                               # ("hmm", "shh": no vowel sound in the dictionary)
    if n == 1:
        return [word], 'exact'
    _, dic = _tools()
    cuts = list(dic.positions(low))
    how = 'exact' if source == 'cmu' else 'guess'
    while len(cuts) + 1 > n:                    # hyphenation found too many: merge the smallest
        spans = [b - a for a, b in zip([0] + cuts, cuts + [len(word)])]
        i = min(range(1, len(spans)), key=lambda k: spans[k - 1] + spans[k])
        del cuts[i - 1]
        how = 'guess'
    if any(not re.search(VOWELS, x) for x in _cut(low, cuts)):
        cuts, how = [], 'guess'                 # a piece with no vowel ("lyric-s"): start over
    if len(cuts) + 1 < n:                       # too few: add vowel-group cuts
        for c in _vowel_cuts(word):
            if len(cuts) + 1 >= n:
                break
            if c not in cuts:
                cuts.append(c)
        cuts.sort()
        how = 'guess'
    return _cut(word, cuts), how


def _cut(word, cuts):
    out, at = [], 0
    for c in cuts + [len(word)]:
        out.append(word[at:c])
        at = c
    return [p for p in out if p]


# A letter of any alphabet ("Blätter" is one word), and what is not one.
LETTER = r"[^\W\d_]"
TOKEN = re.compile(r"^((?:[\W\d_])*)(" + LETTER + r"(?:" + LETTER + r"|['’\-])*)((?:[\W\d_])*)$")


def syllabify(text, overrides, guesses=None):
    """Words -> [(syllable, joined_to_next)] in order. Punctuation rides on the ends of a word."""
    out = []
    for tok in text.split():
        m = TOKEN.match(unicodedata.normalize('NFC', tok))
        if not m:
            continue                            # a dash, a number, stray marks
        lead, core, trail = m.groups()
        pieces = []
        for part in core.split('-'):
            part = part.strip("'’")
            if not part:
                continue
            got, how = split_word(part, overrides)
            if how == 'guess' and guesses is not None:
                guesses.setdefault(part.lower(), '-'.join(got))
            pieces.extend(got)
        if not pieces:
            continue
        pieces[0] = lead + pieces[0]
        pieces[-1] = pieces[-1] + trail
        for i, p in enumerate(pieces):
            out.append((p, i < len(pieces) - 1))
    return out


# --------------------------------------------------------------------------
# The melody: how many places in each bar want a syllable
# --------------------------------------------------------------------------

NOTE, TIE, MELISMA = 'note', 'tie', 'melisma'


def music_slots(line, slur_melisma=False, carry_tie=False):
    """One music line -> ([[slot kinds] per bar], tie still open at the line's end).

    A tied note's second half is a TIE slot; with slur_melisma the notes after the first
    in a slur are MELISMA slots. Rests, ornaments, chord symbols, grace notes and
    inline fields take nothing.
    """
    bars, cur = [], []
    tie, slur = carry_tie, 0
    first_in_slur = False
    i, n = 0, len(line)

    def note():
        nonlocal tie, first_in_slur
        if tie:
            cur.append(TIE)
            tie = False
        elif slur_melisma and slur and not first_in_slur:
            cur.append(MELISMA)
        else:
            cur.append(NOTE)
        first_in_slur = False

    def endbar():
        nonlocal cur
        if cur:
            bars.append(cur)
        cur = []

    while i < n:
        c = line[i]
        if c == '%':
            break
        if c == '"':
            j = line.find('"', i + 1)
            i = (j if j > 0 else n) + 1
            continue
        if c in '!+':
            j = line.find(c, i + 1)
            i = (j if j > 0 else i) + 1
            continue
        if c == '{':
            j = line.find('}', i + 1)
            i = (j if j > 0 else n) + 1
            continue
        if c == '[':
            if i + 1 < n and (line[i + 1].isdigit() or line[i + 1] in ':|'):
                i += 1                           # [1  [2  volta / [| bar
                continue
            if i + 2 < n and line[i + 1].isalpha() and line[i + 2] == ':':
                j = line.find(']', i)
                i = (j if j > 0 else n) + 1      # [K:G] inline field
                continue
            j = line.find(']', i)
            j = j if j > 0 else n - 1
            note()
            i = j + 1
            i = _after_note(line, i)
            if i < n and line[i - 1:i] == '-':
                tie = True
            continue
        if c in '|:':
            endbar()
            i += 1
            continue
        if c == '(':
            if i + 1 < n and line[i + 1].isdigit():
                i += 2
                while i < n and line[i] in '0123456789:':
                    i += 1
            else:
                slur += 1
                first_in_slur = True
                i += 1
            continue
        if c == ')':
            slur = max(0, slur - 1)
            i += 1
            continue
        if c in '^_=' or c in 'ABCDEFGabcdefg':
            while i < n and line[i] in '^_=':
                i += 1
            if i < n and line[i] in 'ABCDEFGabcdefg':
                note()
                i += 1
                i = _after_note(line, i)
                if line[i - 1:i] == '-':
                    tie = True
            continue
        i += 1                                   # rests, spaces, decorations, > < etc.
    endbar()
    return bars, tie


def _after_note(line, i):
    """Skip pitch marks and length after a note; consume one tie dash if it follows."""
    n = len(line)
    while i < n and line[i] in ",'/0123456789<>":
        i += 1
    if i < n and line[i] == '-':
        i += 1
    return i


def split_block(lines):
    """Index the lines of an ABC block: (music line indexes, w: line indexes, has draft marker)."""
    music, words, draft = [], [], False
    body = False
    for k, ln in enumerate(lines):
        s = ln.strip()
        if s == DRAFT:
            draft = True
            continue
        if not s or s.startswith('%'):
            continue
        if s[:2] in ('w:', 'W:'):
            if s[0] == 'w':
                words.append(k)
            continue
        if FIELD.match(s):
            if s[0] == 'K':
                body = True
            continue
        if body or not any(FIELD.match(x.strip()) for x in lines[:k]):
            music.append(k)
    return music, words, draft


# --------------------------------------------------------------------------
# Reading a ChordPro file
# --------------------------------------------------------------------------

def lyric_text(line):
    """A ChordPro lyric line as plain words; '' for lines with none (chord rows, [x2])."""
    s = line.strip()
    if re.match(r'^\*(.+)\*$', s):
        s = s[1:-1]
    s = CHORD_TAG.sub('', s).strip()
    return s if re.search(LETTER, s) else ''


def find_blocks(lines):
    """Every melody ABC block in a file: dicts with start, end (line indexes of the
    directives) and `words` (the lyric lines that follow, as plain text)."""
    blocks = []
    i = 0
    while i < len(lines):
        m = DIRECTIVE.match(lines[i])
        if m and m.group(1).lower() in ABC_START and (m.group(2) or '').lower() != 'band':
            j = i + 1
            while j < len(lines):
                e = DIRECTIVE.match(lines[j])
                if e and e.group(1).lower() in ABC_END:
                    break
                j += 1
            blocks.append({'start': i, 'end': j, 'label': m.group(2) or '',
                           'words': _following_words(lines, j + 1)})
            i = j
        i += 1
    return blocks


def _following_words(lines, i):
    out, grid = [], False
    while i < len(lines):
        raw = lines[i].strip()
        m = DIRECTIVE.match(raw)
        if grid:
            grid = not (m and m.group(1).lower() in GRID_END)
        elif m:
            name = m.group(1).lower()
            if name in GRID_START:
                grid = True
            elif name in SECTION_OPEN or name == 'bars_per_line':
                pass
            else:
                break
        elif raw and not raw.startswith('#'):
            t = lyric_text(raw)
            if t:
                out.append(t)
        i += 1
    return out


# --------------------------------------------------------------------------
# align
# --------------------------------------------------------------------------

def render_syllable(piece, joined):
    return piece + '-' if joined else piece


def join_tokens(toks):
    """Syllables of one word run together after their hyphen: "ho-ly", not "ho- ly"."""
    out = ''
    for t in toks:
        out += t if (not out or out.endswith('-')) else ' ' + t
    return out


def draft_lines(abc, words, overrides, slur_melisma=False, guesses=None):
    """The block's lines with fresh w: lines (and the draft marker); plus a list of notes."""
    _, wlines, _ = split_block(abc)
    base = [ln for k, ln in enumerate(abc) if k not in wlines and ln.strip() != DRAFT]
    music, _, _ = split_block(base)
    notes = []

    # slots per music line
    per_line, tie = [], False
    for k in music:
        bars, tie = music_slots(base[k], slur_melisma, tie)
        per_line.append(bars)
    sung = [sum(1 for b in bars for s in b if s != TIE) for bars in per_line]

    syl = [syllabify(t, overrides, guesses) for t in words]
    flat = [s for line in syl for s in line]
    # When the words are set out in as many lines as the music, line up line by line, so a
    # miscount stays in its own line; otherwise let the syllables flow through all the notes.
    by_line = len(words) == sum(1 for c in sung if c) and len(words) > 1
    queues = []
    if by_line:
        for cnt, line in zip((c for c in sung if c), syl):
            queues.append(list(line))
            if len(line) != cnt:
                notes.append('line "%s": %d syllables for %d notes' % (words[len(queues) - 1][:40], len(line), cnt))
        it = iter(queues)
        queues = [next(it) if c else [] for c in sung]
    else:
        pool = list(flat)
        for cnt in sung:
            queues.append(pool[:cnt])
            pool = pool[cnt:]
        if pool:
            notes.append('%d syllable(s) left over after the last note ("%s...")' % (len(pool), pool[0][0]))
        if sum(sung) > len(flat):
            notes.append('%d note(s) have no syllable' % (sum(sung) - len(flat)))

    out = []
    placed_marker = False
    wl = {}
    for idx, k in enumerate(music):
        q = list(queues[idx])
        bars_out = []
        for bar in per_line[idx]:
            toks = []
            for slot in bar:
                if slot == TIE:
                    toks.append('*')
                elif slot == MELISMA:
                    toks.append('_')
                elif q:
                    p, j = q.pop(0)
                    toks.append(render_syllable(p, j))
                else:
                    toks.append('*')
            bars_out.append(toks)
        while bars_out and all(t == '*' for t in bars_out[-1]) and not any(
                s == TIE for s in per_line[idx][len(bars_out) - 1]):
            bars_out.pop()                       # trailing bars with nothing to sing
        if bars_out:
            wl[k] = 'w: ' + ' | '.join(join_tokens(t) for t in bars_out)
    for k, ln in enumerate(base):
        if k in wl and not placed_marker:
            out.append(DRAFT)
            placed_marker = True
        out.append(ln)
        if k in wl:
            out.append(wl[k])
    return out, notes


def align_file(path, write, overrides, slur_melisma):
    with open(path) as f:
        lines = f.read().split('\n')
    blocks = find_blocks(lines)
    changed, per_block = False, []
    guesses = {}
    for b in reversed(blocks):
        report = []
        per_block.append(report)
        abc = lines[b['start'] + 1:b['end']]
        music, wlines, draft = split_block(abc)
        label = '%s (line %d)' % (b['label'] or 'melody', b['start'] + 1)
        if not music:
            continue
        if wlines and not draft:
            report.append('%s: has its own w: lines, left alone' % label)
            continue
        if not b['words']:
            report.append('%s: no lyric lines follow, nothing to align' % label)
            continue
        new, notes = draft_lines(abc, b['words'], overrides, slur_melisma, guesses)
        for n in notes:
            report.append('%s: %s' % (label, n))
        if new != abc:
            lines[b['start'] + 1:b['end']] = new
            changed = True
            report.append('%s: drafted %d w: line(s)' % (label, sum(1 for x in new if x.startswith('w:'))))
    report = [r for rep in reversed(per_block) for r in rep]
    for w, split in sorted(guesses.items()):
        report.append('guessed "%s" as %s: correct with `override %s %s`' % (w, split, w, split))
    if changed and write:
        with open(path, 'w') as f:
            f.write('\n'.join(lines))
    return report, changed


# --------------------------------------------------------------------------
# lint
# --------------------------------------------------------------------------

def sung_text(wline):
    """A w: line as the words it spells (syllable joins and alignment marks removed)."""
    out, joined = [], False
    for tok in wline[2:].replace('|', ' ').split():
        if tok in ('*', '_', '-'):
            continue
        tok = tok.replace('~', ' ').replace('\\-', '-')
        t = tok.rstrip('_*')
        if joined and out:
            out[-1] += t.lstrip('-')
        else:
            out.append(t)
        joined = t.endswith('-')
        if joined:
            out[-1] = out[-1].rstrip('-')
    return ' '.join(out)


def _letters(s):
    return re.sub(r"[^a-z']", '', s.lower().replace('’', "'"))


def lint_block(abc, words, slur_melisma=False):
    problems = []
    music, wlines, _ = split_block(abc)
    if not wlines:
        return problems
    # structure: syllables per bar against places per bar
    tie = False
    for n_line, k in enumerate(music):
        bars, tie = music_slots(abc[k], slur_melisma, tie)
        end = music[n_line + 1] if n_line + 1 < len(music) else len(abc)
        nxt = [w for w in wlines if k < w < end]
        if not nxt:
            continue
        w = abc[nxt[0]].strip()
        got = [len(seg.split()) for seg in w[2:].split('|')]
        for n, (have, want) in enumerate(zip(got, [len(b) for b in bars]), 1):
            if have > want:
                problems.append('bar %d of "%s": %d syllables for %d notes (the extra spill into the next bar)'
                                % (n, abc[k].strip()[:30], have, want))
        if len(got) > len(bars):
            problems.append('"%s": w: has %d bars, the music %d' % (abc[k].strip()[:30], len(got), len(bars)))
    # words: the w: lines against the ChordPro lyric lines
    if words:
        spelled = ' '.join(sung_text(abc[k].strip()) for k in wlines if _first_verse(abc, k, music, wlines))
        a, b = _letters(spelled), _letters(' '.join(words))
        if a != b:
            sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
            for tag, i1, i2, j1, j2 in sm.get_opcodes():
                if tag != 'equal':
                    problems.append('w: says "%s…%s…", the words say "%s…%s…" (%s)' % (
                        a[max(0, i1 - 12):i1], a[i1:i2], b[max(0, j1 - 12):j1], b[j1:j2], tag))
                    break
    return problems


def _first_verse(abc, k, music, wlines):
    """Only the first w: line under each music line is compared with the lyric text."""
    prev = [m for m in music if m < k]
    if not prev:
        return True
    return not [w for w in wlines if prev[-1] < w < k]


def lint_file(path, slur_melisma):
    with open(path) as f:
        lines = f.read().split('\n')
    out = []
    for b in find_blocks(lines):
        abc = lines[b['start'] + 1:b['end']]
        for p in lint_block(abc, b['words'], slur_melisma):
            out.append('%s:%d (%s): %s' % (os.path.basename(path), b['start'] + 1, b['label'] or 'melody', p))
    return out


# --------------------------------------------------------------------------

def main(argv):
    if len(argv) < 2 or argv[1] in ('-h', '--help'):
        print(__doc__)
        return 0
    cmd, rest = argv[1], argv[2:]
    flags = [a for a in rest if a.startswith('--')]
    args = [a for a in rest if not a.startswith('--')]
    melisma = '--slur-melisma' in flags
    if cmd == 'syllables':
        ov = load_overrides()
        for w in args:
            pieces, how = split_word(w, ov)
            print('%-16s %s  (%s)' % (w, '-'.join(pieces), how))
        return 0
    if cmd == 'override':
        if len(args) != 2 or args[0].lower() != args[1].replace('-', '').lower():
            sys.exit('usage: override WORD split-ted  (the hyphenated form must spell the word)')
        try:
            with open(OVERRIDES) as f:
                data = json.load(f)
        except FileNotFoundError:
            data = {}
        data[args[0].lower()] = args[1].lower()
        with open(OVERRIDES, 'w') as f:
            json.dump(dict(sorted(data.items())), f, indent=2)
            f.write('\n')
        print('%s -> %s' % (args[0].lower(), args[1].lower()))
        return 0
    if cmd == 'align':
        ov = load_overrides()
        for path in args:
            report, changed = align_file(path, '--write' in flags, ov, melisma)
            print('%s%s' % (path, '' if '--write' in flags or not changed else '  (dry run: --write to save)'))
            for r in report:
                print('   ' + r)
        return 0
    if cmd == 'lint':
        bad = 0
        for path in args:
            for p in lint_file(path, melisma):
                print(p)
                bad += 1
        print('%d problem(s)' % bad)
        return 1 if bad else 0
    sys.exit('unknown command %r (align, lint, syllables, override)' % cmd)


if __name__ == '__main__':
    sys.exit(main(sys.argv))
