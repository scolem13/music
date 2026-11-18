#!/usr/bin/env python3
"""Open Book (Mark Veltzer's LilyPond sources, ~/Downloads/realBooks/openbook/*.ly.mako) -> ABC, exactly.

The notation is read from the source text, not from the PDF, so there is nothing to misread. Relative pitch
(the template wraps the voice in \\relative c'), repeats, \\alternative, \\partial, \\tuplet, ties, \\key, \\time, \\tempo
and \\chordmode chords are handled. Chords are placed by time; a note a chord falls inside is split and tied.
Anything not understood is reported, never guessed (see UNKNOWN in the output).
Every bar is length-checked from the parsed times (bar() below), and the tune is refused if a bar is wrong.

  python3 -I scripts/realbooks/openbook-ly2abc.py <slug|file> [more...] [--out DIR] [--version Real]
  python3 -I scripts/realbooks/openbook-ly2abc.py --all --out DIR     (report only: which tunes convert)
"""
import re, sys, os, glob
from fractions import Fraction as F

SRC = os.path.expanduser('~/Downloads/realBooks/openbook')
STEP = {'c':0,'d':1,'e':2,'f':3,'g':4,'a':5,'b':6}
SEMI = {'c':0,'d':2,'e':4,'f':5,'g':7,'a':9,'b':11}
ACC = {'':0,'is':1,'es':-1,'isis':2,'eses':-2,'s':-1}
class Bad(Exception): pass

def section(text, part):
    m = re.search(r"%%\s*if part=='%s':\s*\n(.*?)\n%%\s*endif" % re.escape(part), text, re.S)
    return m.group(1) if m else None

def attrs(text):
    return dict(re.findall(r"attributes\['(\w+)'\]\s*=\s*'((?:[^'\\]|\\.)*)'", text))

TOK = re.compile(r'''"[^"]*"|\\[A-Za-z]+|[{}()|~<>\[\]]|[A-Za-z]+[',!?]*\d*\.*(?:\*\d+(?:/\d+)?)?(?::[\w.+\-^/]*)?|\d+/\d+|\d+|[^\s]''')
def toks(s):
    s = re.sub(r'%.*', '', s)
    return TOK.findall(s)

def dur(s, last):
    m = re.fullmatch(r'(\d+)?(\.*)(?:\*(\d+)(?:/(\d+))?)?', s)
    if not m: raise Bad('duration '+s)
    d = int(m.group(1)) if m.group(1) else last[0]
    dots = len(m.group(2)) if (m.group(1) or m.group(2)) else last[1]
    base = F(1, d)
    t = base; add = base
    for _ in range(dots): add /= 2; t += add
    mult = F(int(m.group(3) or 1), int(m.group(4) or 1))
    last[0] = d; last[1] = dots if m.group(1) else last[1]
    return t * mult

def unfold(T):
    while True:
        try: j = next(k for k in range(len(T) - 4) if T[k] == '\\repeat' and T[k+1] == 'unfold')
        except StopIteration: return T
        n = int(T[j+2]); assert T[j+3] == '{'
        depth = 0; k = j + 3
        while True:
            if T[k] == '{': depth += 1
            elif T[k] == '}':
                depth -= 1
                if depth == 0: break
            k += 1
        body = T[j+4:k]
        T = T[:j] + body * n + T[k+1:]

def partial_dur(T, i):
    m = re.fullmatch(r'(\d+)(\.*)', T[i]); i += 1
    base = F(1, int(m.group(1))); tt = base; a = base
    for _ in m.group(2): a /= 2; tt += a
    while i < len(T) and T[i] == '.': a /= 2; tt += a; i += 1
    if i + 1 < len(T) and T[i] == '*' and re.fullmatch(r'\d+(?:/\d+)?', T[i+1]):
        mm = re.fullmatch(r'(\d+)(?:/(\d+))?', T[i+1]); tt *= F(int(mm.group(1)), int(mm.group(2) or 1)); i += 2
    return tt, i

def parse_voice(text):
    """-> dict(ev=[...], meter, key, partial, tempo, unknown=set()). Events:
    ('n', midi, acc, letter, oct, dur_real, dur_nom, tie, tup)  ('r', dur_real, dur_nom, tup)
    ('bar',) ('rep',) ('end',) ('alt', i) ('altend', last?)"""
    T = unfold(toks(text)); i = 0
    ev = []; unk = set(); meter = F(1); key = ('c','major'); partial = None; tempo = None
    last = [4, 0]; ref = (0, 4)   # relative reference: (step index letter, octave) c' -> diatonic number
    refd = 0*7 + 4*7              # diatonic number of c' = octave 4 * 7 + 0
    tup = []                      # stack of (num, den, gid)
    gid = 0
    stack = []                    # block kinds
    alt_count = 0; in_alt = False
    meterf = None; grace_next = False
    def real(nom):
        r = nom
        for n, d, _ in tup: r = r * F(d, n)
        return r
    while i < len(T):
        t = T[i]; i += 1
        if t == '\\tempo':
            if i < len(T) and T[i].startswith('"'): i += 1
            if i + 2 < len(T) and re.fullmatch(r'\d+', T[i]) and T[i+1] == '=' and re.fullmatch(r'\d+', T[i+2]):
                tempo = (T[i], T[i+2]); i += 3
        elif t == '=':
            continue
        elif t == '\\time':
            m = re.fullmatch(r'(\d+)/(\d+)', T[i]); i += 1
            meterf = (int(m.group(1)), int(m.group(2))); meter = F(meterf[0], meterf[1])
        elif t == '\\numericTimeSignature': pass
        elif t == '\\key':
            k = T[i]; mode = T[i+1]; i += 2
            if mode not in ('\\major', '\\minor'): unk.add('mode '+mode)
            key = (k, mode[1:])
        elif t == '\\partial':
            tt, i = partial_dur(T, i)
            partial = tt; ev.append(('partial', tt))
        elif t == '\\repeat':
            kind = T[i]; n = int(T[i+1]); i += 2
            if kind != 'volta': unk.add('repeat '+kind)
            assert T[i] == '{'; i += 1
            ev.append(('rep',)); stack.append(('rep', n))
        elif t == '\\alternative':
            assert T[i] == '{'; i += 1
            stack.append(('altblock',)); alt_count = 0
        elif t == '\\tuplet':
            m = re.fullmatch(r'(\d+)/(\d+)', T[i]); i += 1
            assert T[i] == '{'; i += 1
            gid += 1; tup.append((int(m.group(1)), int(m.group(2)), gid)); stack.append(('tup', gid))
            ev.append(('tupstart', int(m.group(1)), int(m.group(2)), gid))
        elif t == '{':
            if stack and stack[-1][0] == 'altblock':
                alt_count += 1; ev.append(('alt', alt_count)); stack.append(('alt', alt_count))
            else:
                stack.append(('grp',))
        elif t == '}' and grace_next == 'inblock':
            grace_next = False
        elif t == '}':
            if not stack: continue
            k = stack.pop()
            if k[0] == 'rep':
                # a repeat with alternatives continues; closing happens at the alternative block
                if i < len(T) and T[i] == '\\alternative': ev.append(('bodyend',))
                else: ev.append(('end',))
            elif k[0] == 'altblock': ev.append(('altsdone',))
            elif k[0] == 'alt': ev.append(('altend', k[1]))
            elif k[0] == 'tup': tup.pop(); ev.append(('tupend', k[1]))
        elif t == '|': ev.append(('bar',))
        elif t == '~': 
            for j in range(len(ev)-1, -1, -1):
                if ev[j][0] == 'n':
                    e = list(ev[j]); e[6] = True; ev[j] = tuple(e); break
        elif t in ('(', ')', '\\(', '\\)', '\\fermata', '\\mark', '\\bar', '\\break', '\\pageBreak', '\\myEndLine', '\\startPart'): 
            if t == '\\mark' and i < len(T) and T[i] != '\\markup': i += 1
            if t == '\\bar' and i < len(T): i += 1
        elif t.startswith('"'): pass
        elif t in ('[', ']') or t.startswith('\\myEndLine') or t in ('\\OPC', '\\LPC', '\\RPC', '\\stemUp', '\\stemDown', '\\stemNeutral', '\\noBreak', '\\startSong', '\\endSong'): pass
        elif t == '\\transposition': i += 1
        elif t in ('-', '^', '_'):
            if i < len(T) and (re.fullmatch(r'\d', T[i]) or T[i] in ('>', '.', '-', '!', '+')): i += 1
        elif t == '\\grace':
            grace_next = True
            if T[i] == '{': grace_next = 'block'; i += 1
        elif t == '\\markup':
            depth = 0; words = []
            while i < len(T):
                x = T[i]; i += 1
                if x == '{': depth += 1
                elif x == '}':
                    depth -= 1
                    if depth <= 0: break
                elif depth == 0: i -= 1; break
                elif x == '\\musicglyph':
                    g = T[i+1].strip('"') if i + 1 < len(T) and T[i] == '#' else ''
                    i += 2
                    if g in ('scripts.segno', 'scripts.coda'): ev.append(('deco', g.split('.')[1]))
                    else: unk.add('musicglyph ' + g)
                elif not x.startswith('\\'): words.append(x.strip('"'))
            if words: ev.append(('text', ' '.join(words)))
        elif t.startswith('\\'):
            unk.add(t)
        elif t == '<':
            notes = []; cref = refd; first = None
            while i < len(T) and T[i] != '>':
                x = T[i]; i += 1
                if x == '\\parenthesize': unk.add('\\parenthesize'); continue
                m = re.fullmatch(r"([a-g])(isis|eses|is|es|s)?([',]*)([!?]*)", x)
                if not m: unk.add('in-chord ' + x); continue
                let, acc, octm, _fl = m.groups()
                if acc == 's' and let not in 'ae': unk.add(x)
                cand = [cref - cref % 7 + 7 * o + STEP[let] for o in range(-2, 3)]
                dd = min(cand, key=lambda c: (abs(c - cref), -c))
                for ch in octm: dd += 7 if ch == "'" else -7
                cref = dd
                if first is None: first = dd
                notes.append((let, ACC[acc or ''], dd // 7))
            i += 1
            rest = ''
            while i < len(T) and re.fullmatch(r'\d+|\.|\*\d+(?:/\d+)?', T[i]) and not (rest and re.fullmatch(r'\d+', T[i]) and not rest.endswith('.') ):
                rest += T[i]; i += 1
            d_nom = dur(rest, last)
            refd = first if first is not None else refd
            ev.append(('n', notes, None, None, real(d_nom), d_nom, False, tuple(g for _, _, g in tup), False))
        else:
            m = re.fullmatch(r"([a-g])(isis|eses|is|es|s)?([',]*)([!?]*)(.*)", t)
            if m and not re.fullmatch(r'(r|s|R)', t[:1]):
                let, acc, octm, _fl, rest = m.groups()
                if acc == 's' and let not in 'ae': unk.add(t); continue
                if rest == '' and i < len(T) and re.fullmatch(r'\d+\.*', T[i]): rest = T[i]; i += 1
                d_nom = dur(rest, last)
                dn = STEP[let] + 7 * 0
                # relative: nearest diatonic number to ref
                cand = [refd - refd % 7 + 7 * o + dn for o in range(-2, 3)]
                best = min(cand, key=lambda c: (abs(c - refd), -c))   # tie never happens (7 steps odd: 3 vs 4)
                dd = best
                for ch in octm: dd += 7 if ch == "'" else -7
                refd = dd
                octv = dd // 7
                isg = bool(grace_next)
                ev.append(('n', let, ACC[acc or ''], octv, F(0) if isg else real(d_nom), d_nom, False, tuple(g for _, _, g in tup), isg))
                if grace_next is True: grace_next = False
                elif grace_next == 'block': grace_next = 'inblock'
            else:
                m = re.fullmatch(r'([rsR])(.*)', t)
                if m:
                    d_nom = dur(m.group(2), last)
                    ev.append(('r', real(d_nom), d_nom, tuple(g for _, _, g in tup), m.group(1) == 's'))
                else:
                    unk.add(t)
    return dict(ev=ev, meter=meter, meterf=meterf, key=key, partial=partial, tempo=tempo, unk=unk)

CHORD_ROOT = re.compile(r"([a-g])(isis|eses|is|es|s)?")
def chord_name(root, acc):
    return root.upper() + {'':'','is':'#','es':'b','s':'b','isis':'##','eses':'bb'}[acc]
def qual(q):
    """LilyPond chordmode modifier ('m7.5-', '7.9-', '5+7' ...) -> chord symbol suffix."""
    if q is None or q == '': return ''
    base, *ext = q.split('.')
    B = {'maj7':'maj7','m':'m','m7':'m7','7':'7','6':'6','dim':'dim','dim7':'dim7','m6':'m6','maj':'','aug':'aug','m9':'m9','9':'9',
         'maj9':'maj9','sus4':'sus4','sus2':'sus2','sus7':'7sus4','5+':'aug','5+7':'7#5','5+9':'9#5','m5':'m','m5+':'m#5','m7+':'m(maj7)',
         'dim5m7':'m7b5','11':'11','13':'13','m11':'m11','m13':'m13','5':'5','9-':'7b9','7sus4':'7sus4'}
    if base not in B: raise Bad('chord quality ' + q)
    s = B[base]; alt = []
    for e in ext:
        m = re.fullmatch(r'(\d+)([+-]?)', e)
        if not m: raise Bad('chord ext ' + q)
        n, a = int(m.group(1)), m.group(2)
        if n == 3 and a == '-': alt.append('alt'); continue
        if n == 5:
            if a: alt.append('#5' if a == '+' else 'b5')
            continue
        if n == 9:
            if a: alt.append('#9' if a == '+' else 'b9'); 
            elif s in ('7', '9'): s = '9'
            elif s == 'm7': s = 'm9'
            elif s == 'maj7': s = 'maj9'
            elif s == '6': s = '6/9'
            elif s == 'm6': s = 'm6/9'
            elif s in ('sus4',): s = '9sus4'
            elif s == '9#5': pass
            else: alt.append('add9')
            continue
        if n == 11:
            if a: alt.append('#11' if a == '+' else 'b11')
            elif s in ('7', '9'): s = '11'
            elif s == 'm7': s = 'm11'
            else: alt.append('add11')
            continue
        if n == 13:
            if a: alt.append('b13' if a == '-' else '#13')
            elif s in ('7', '9', '11'): s = '13'
            else: alt.append('add13')
            continue
        if n == 7 and not a and s == 'sus4': s = '7sus4'; continue
        if n == 4: s = '7sus4' if s in ('7', '') else s + 'sus4'; continue
        if n == 7 and a == '+': s = 'm(maj7)' if s.startswith('m') else 'maj7'; continue
        raise Bad('chord ext ' + q)
    if 'alt' in alt: return '7alt'
    return s + ''.join(alt)

def parse_chords(text):
    T = unfold(toks(text)); i = 0; out = []; t = F(0); last = [1, 0]; unk = set()
    partial = None
    stack = []
    while i < len(T):
        w = T[i]; i += 1
        if w == '\\partial':
            tt, i = partial_dur(T, i)
            partial = tt
        elif w in ('\\repeat',): i += 2
        elif w in ('\\myMark', '\\bar', '\\transposition'): i += 1
        elif w == '\\mark':
            if T[i] == '\\markup':
                i += 1; depth = 0
                while i < len(T):
                    x = T[i]; i += 1
                    if x == '{': depth += 1
                    elif x == '}':
                        depth -= 1
                        if depth <= 0: break
                    elif depth == 0: i -= 1; break
            else: i += 1
        elif w == '/':
            bm = CHORD_ROOT.match(T[i]); i += 1
            if out and out[-1][1] and bm: out[-1] = (out[-1][0], out[-1][1] + '/' + chord_name(bm.group(1), bm.group(2) or ''))
            else: unk.add('/')
        elif w in ('{','}','|','\\alternative','\\startChords','\\startSong','\\endSong','\\endChords','\\startPart','\\endPart','\\myEndLine','\\myEndLineVoltaNotLast','\\myEndLineVoltaLast','\\myEndLineVolta','\\OPC','\\stemUp','\\stemDown','\\LPC','\\RPC','\\chordmode','(',')','~'): pass
        elif w.startswith('"'): pass
        elif w.startswith('\\'): unk.add(w)
        else:
            m = re.fullmatch(r"([a-gsrR])(isis|eses|is|es|s)?([',]*)(\d+)?(\.*)(?:\*(\d+)(?:/(\d+))?)?(?::([\w.+\-]*))?(?:/\+?(\w+))?", w)
            if not m: unk.add(w); continue
            r, acc, _, d, dots, mn, md, q, bass = m.groups()
            if d: last[0] = int(d); last[1] = len(dots)
            elif dots: last[1] = len(dots)
            base = F(1, last[0]); tt = base; a = base
            for _ in range(last[1]): a /= 2; tt += a
            tt *= F(int(mn or 1), int(md or 1))
            if r in 'srR': 
                out.append((t, None)); t += tt; continue
            bm = CHORD_ROOT.fullmatch(bass) if bass else None
            name = chord_name(r, acc or '') + qual(q)
            if bm: name += '/' + chord_name(bm.group(1), bm.group(2) or '')
            out.append((t, name)); t += tt
    return dict(ch=out, partial=partial, unk=unk, end=t)

def key_abc(k):
    letter, mode = k
    n = chord_name(letter[0], CHORD_ROOT.fullmatch(letter).group(2) or '')
    return n + ('m' if mode == 'minor' else '')

SHARPS = ['f','c','g','d','a','e','b']
def keysig(k):
    """-> dict letter -> accidental in the key signature"""
    letter, mode = k
    m = CHORD_ROOT.fullmatch(letter); tonic = SEMI[m.group(1)] + ACC[m.group(2) or '']
    maj = {0:0,7:1,2:2,9:3,4:4,11:5,6:6,1:7,5:-1,10:-2,3:-3,8:-4,1+12:0}
    # fifths by tonic pitch class for major; minor = relative major (+3)
    t = (tonic + (3 if mode == 'minor' else 0)) % 12
    # prefer the spelling from the name: use sharp/flat count by name
    fifths = {0:0,7:1,2:2,9:3,4:4,11:5,5:-1,10:-2,3:-3,8:-4,1:-5,6:-6}[t]
    name = m.group(2) or ''
    if t == 6 and name == 'is' : fifths = 6
    if t == 1 and name == 'is' : fifths = 7
    if t == 11 and name == 'es': fifths = -7
    d = {}
    if fifths > 0:
        for l in SHARPS[:fifths]: d[l] = 1
    elif fifths < 0:
        for l in SHARPS[::-1][:-fifths]: d[l] = -1
    return d

def to_abc(name, meta, voice, chords):
    pv = parse_voice(voice); pc = parse_chords(chords) if chords else dict(ch=[], partial=None, unk=set(), end=0)
    unk = pv['unk'] | pc['unk']
    if unk: raise Bad('UNKNOWN ' + ', '.join(sorted(unk)))
    meter = pv['meter']; ev = pv['ev']
    t = F(0); tl = []
    for e in ev:
        if e[0] == 'n': tl.append((t, e)); t += e[4]
        elif e[0] == 'r': tl.append((t, e)); t += e[1]
        else: tl.append((None, e))
    cho = sorted(set(c[0] for c in pc['ch']))
    chi = {c[0]: c[1] for c in pc['ch'] if c[1]}
    out = []
    for t0, e in tl:
        if e[0] in ('n', 'r'):
            dr = e[4] if e[0] == 'n' else e[1]
            grp = e[7] if e[0] == 'n' else e[3]
            cuts = [c for c in cho if t0 < c < t0 + dr]
            if cuts and not grp:
                pts = [t0] + cuts + [t0 + dr]
                for a, b in zip(pts, pts[1:]):
                    if e[0] == 'n':
                        ee = list(e); ee[4] = b - a; ee[5] = b - a; ee[6] = e[6] if b == pts[-1] else True
                        out.append((a, tuple(ee)))
                    else: out.append((a, ('r', b - a, b - a, (), e[4])))
            else: out.append((t0, e))
        else: out.append((None, e))
    starts = sorted(set(t0 for t0, e in out if e[0] in ('n', 'r')))
    snapped = 0
    for c in sorted(chi):
        if c not in starts:
            nxt = next((x for x in starts if x > c), None)
            if nxt is not None and nxt not in chi: chi[nxt] = chi[c]; snapped += 1
    gsize = {}
    for _, e in out:
        if e[0] == 'n':
            for g in e[7]: gsize[g] = gsize.get(g, 0) + 1
        elif e[0] == 'r':
            for g in e[3]: gsize[g] = gsize.get(g, 0) + 1
    durs = [e[5] for _, e in out if e[0] == 'n' and e[4] > 0] + [e[2] for _, e in out if e[0] == 'r']
    L = F(1, 8) if durs and all((d / F(1, 8)).denominator == 1 for d in durs) else F(1, 16)
    ks = keysig(pv['key'])
    def alen(d):
        r = d / L
        if r.denominator > 4: raise Bad('odd length %s' % d)
        if r == 1: return ''
        if r.denominator == 1: return str(r.numerator)
        if r.numerator == 1: return '/' + str(r.denominator)
        return '%d/%d' % (r.numerator, r.denominator)
    seq = []; barstate = {}; bar_time = F(0); bars = []; placed = set(); prev_tie = False
    def lastbar():
        return bool(seq) and seq[-1] in ('|', ':|')
    def setlast(x):
        if seq and seq[-1] == '|': seq[-1] = x
        else: seq.append(x)
    def endbar():
        nonlocal bar_time
        bars.append(bar_time); bar_time = F(0); barstate.clear()
    for idx, (t0, e) in enumerate(out):
        k = e[0]
        if k in ('n', 'r'):
            if t0 in chi and t0 not in placed:
                if seq and seq[-1].startswith('(') and seq[-1][1:2].isdigit(): seq.insert(len(seq) - 1, '"%s"' % chi[t0])
                else: seq.append('"%s"' % chi[t0])
                placed.add(t0)
            if k == 'n':
                _, let, acc, octv, dr, dn, tie, tup, grace = e
                def one(let, acc, octv, force_tied=False):
                    cur = barstate.get((let, octv), ks.get(let, 0))
                    pre = ''
                    if acc != cur or (force_tied and acc != ks.get(let, 0)): pre = {0:'=',1:'^',-1:'_',2:'^^',-2:'__'}[acc]
                    barstate[(let, octv)] = acc
                    return pre + (let.upper() + ',' * (4 - octv) if octv < 5 else let + "'" * (octv - 5))
                if isinstance(let, list): body = '[' + ''.join(one(a, b, c, prev_tie) for a, b, c in let) + ']'
                else: body = one(let, acc, octv, prev_tie)
                if grace: seq.append('{' + body + '}')
                else: seq.append(body + alen(dn) + ('-' if tie else '')); prev_tie = tie; bar_time += dr
            else:
                seq.append(('x' if e[4] else 'z') + alen(e[2])); prev_tie = False; bar_time += e[1]
            if bar_time == meter and not any(x[1][0] == 'tupend' for x in out[idx+1:idx+2]):
                nxt = next((x[1][0] for x in out[idx+1:] if x[1][0] not in ('tupend',)), None)
                if nxt in ('n', 'r', 'text', 'tupstart'): endbar(); seq.append('|')
        elif k == 'text': seq.append('"^%s"' % e[1])
        elif k == 'deco': seq.append('!%s!' % e[1])
        elif k == 'tupstart': seq.append('(%d:%d:%d' % (e[1], e[2], gsize.get(e[3], e[1])))
        elif k == 'bar':
            if seq and seq[-1] == '|:' and bar_time == 0: continue
            if bar_time == 0 and seq and seq[-1] in ('|', ':|') : continue
            endbar(); seq.append('|')
        elif k == 'rep':
            if bar_time: endbar(); seq.append('|')
            setlast('|:')
        elif k == 'end': endbar(); setlast(':|')
        elif k == 'alt':
            if bar_time: endbar(); seq.append('|')
            if e[1] == 1: setlast('|1')
            else:
                if seq and seq[-1] == ':|': seq[-1] = ':|%d' % e[1]
                else: seq.append('|%d' % e[1])
        elif k == 'altend':
            endbar()
            nalt = max((x[1] for x in ev if x[0] == 'alt'), default=1)
            if e[1] < nalt: setlast(':|')
            else: setlast('||')   # closes the last ending's bracket (abcjs ends it at a double bar, not a plain one)
    endbar()
    if seq and seq[-1] in ('|', '||'): seq[-1] = '|]'
    elif seq and seq[-1] not in ('|]', ':|'): seq.append('|]')
    import os
    if os.environ.get('OBDEBUG'): print([str(b) for b in bars])
    unplaced = [c for c in chi if c not in placed and c in starts]
    # bar lengths: every bar must be the meter, except the pickup (first bar)
    off = []
    part = pv['partial']
    for n, bt in enumerate(bars):
        if bt == 0: continue
        if n == 0 and (bt < meter): continue   # pickup (with or without \\partial)
        if bt != meter: off.append((n + 1, str(bt)))
    mf = pv['meterf']
    hdr = ['X:1', 'T:' + meta.get('title', name)]
    if meta.get('composer'): hdr.append('C:' + meta['composer'])
    hdr.append('%source Open Book (LilyPond sources, version used: ' + meta.get('version', '?') + ')')
    if meta.get('piece'): hdr.append('%style ' + meta['piece'])
    hdr.append('M:%d/%d' % mf); hdr.append('L:1/%d' % (1 / L))
    if pv['tempo']: hdr.append('Q:1/%s=%s' % pv['tempo'])
    hdr.append('K:' + key_abc(pv['key']))
    body = ' '.join(seq)
    return '\n'.join(hdr) + '\n' + body + '\n', dict(off=off, unplaced=unplaced, bars=len(bars), snapped=snapped)

def load(path, version=None):
    text = open(path).read()
    at = attrs(text)
    vers = [v for v in ('Real', 'Fake', 'Newreal', 'My', 'Aebersold', 'Ccb', 'TBK', 'Galit', 'Wikifonia', 'Unknown') if re.search(r"[a-g][',]*\d", section(text, 'Voice' + v) or '')]
    v = version if version in vers else (vers[0] if vers else None)
    if not v: raise Bad('no voice')
    chords = section(text, 'Chords' + v)
    return dict(title=at.get('title'), composer=at.get('composer'), piece=at.get('piece'), version=v), section(text, 'Voice' + v), chords, vers

if __name__ == '__main__':
    args = sys.argv[1:]; outdir = None; version = None; allf = False; names = []
    while args:
        a = args.pop(0)
        if a == '--out': outdir = args.pop(0)
        elif a == '--version': version = args.pop(0)
        elif a == '--all': allf = True
        else: names.append(a)
    files = sorted(glob.glob(SRC + '/*.ly.mako')) if allf else [n if os.path.exists(n) else '%s/%s.ly.mako' % (SRC, n) for n in names]
    ok = 0; bad = []
    for f in files:
        slug = os.path.basename(f).replace('.ly.mako', '')
        try:
            meta, voice, chords, vers = load(f, version)
            abc, info = to_abc(slug, meta, voice, chords)
            if info['off'] or info['unplaced']: raise Bad('bars off %s unplaced chords %d' % (info['off'][:4], len(info['unplaced'])))
            ok += 1
            if outdir:
                os.makedirs(outdir, exist_ok=True); open('%s/%s.abc' % (outdir, slug), 'w').write(abc)
        except Bad as e: bad.append((slug, str(e)))
        except Exception as e: bad.append((slug, 'ERROR %r' % e))
    print('%d converted, %d refused' % (ok, len(bad)))
    for s_, m in bad[:60 if allf else 99]: print('  ', s_, '-', m)
