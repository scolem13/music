"""Beam by beat and break the line every 4 bars. Display-side formatter for ABC (notes only; headers kept)."""
import re
from fractions import Fraction as F

TOK = re.compile(r'''
 (?P<chord>"[^"]*")
|(?P<deco>![^!]*!|\+[^+]*\+)
|(?P<field>\[[A-Za-z]:[^\]]*\])
|(?P<bar>:\|\||\|\]|\[\||::|:\||\|:|\|\||\||\[\d(?:,\d)*|(?<=\|)\d|(?<=:)\d)
|(?P<tup>\(\d(?::\d*(?::\d*)?)?)
|(?P<grp>\[[^\]\s|]*\])(?P<gl>\d*(?:/\d*)?)
|(?P<note>(?:[\^_=]*)[A-Ga-g][,']*)(?P<nl>\d*(?:/\d*)?)
|(?P<rest>[zxZ])(?P<rl>\d*(?:/\d*)?)
|(?P<tie>-)
|(?P<sl>[()])
|(?P<sp>\s+)
|(?P<other>.)''', re.X)

def ln(s):
    if not s: return F(1)
    if s == '/': return F(1,2)
    if '/' in s:
        a, b = s.split('/'); return F(int(a or 1), int(b or 2))
    return F(int(s))

def format_abc(abc):
    lines = abc.split('\n')
    hdr = []; body = []; inbody = False
    M = F(4,4); L = F(1,8); num, den = 4, 4
    for l in lines:
        if not inbody:
            hdr.append(l)
            m = re.match(r'M:\s*(\d+)/(\d+)', l)
            if m: M = F(int(m.group(1)), int(m.group(2))); num, den = int(m.group(1)), int(m.group(2))
            if re.match(r'M:\s*C\|', l): M = F(2,2); num, den = 2, 2
            if re.match(r'M:\s*C\s*$', l): M = F(4,4); num, den = 4, 4
            m = re.match(r'L:\s*(\d+)/(\d+)', l)
            if m: L = F(int(m.group(1)), int(m.group(2)))
            if re.match(r'K:', l): inbody = True
        else: body.append(l)
    if re.search(r'^M:\s*C\|', abc, re.M): beat = F(1,2)
    elif den == 8 and num % 3 == 0 and num >= 6: beat = F(3,8)
    elif den == 8: beat = F(1,8) * (2 if num in (4,) else 1)
    else: beat = F(1, den)
    # join consecutive music lines (the source often has one bar per line); %unsure notes move to the end,
    # other comments and fields stay as section breaks
    merged = []; moved = []; buf = []
    def flush():
        if buf: merged.append(' '.join(buf)); buf.clear()
    for l in body:
        if l.startswith('%unsure'): moved.append(l); continue
        if not l.strip() or l.startswith('%') or re.match(r'^[A-Za-z]:', l):
            flush(); merged.append(l)
        else: buf.append(l.rstrip())
    flush(); body = [re.sub(r'(?<![\]\[|])\|\s+(\|[:1-9])', r'\1', b) if not b.startswith('%') else b for b in merged]
    out = []; stats = {'bad': 0, 'bars': 0}
    firstbar = True
    for l in body:
        if not l.strip() or l.startswith('%') or re.match(r'^[A-Za-z]:', l):
            out.append(l); continue
        toks = [m for m in TOK.finditer(l)]
        # pass 1: bars -> list of items; each item (kind, text, dur)
        items = []; tupleft = 0; tupf = F(1)
        for m in toks:
            n0 = len(items)
            k = m.lastgroup
            if k in ('gl','nl','rl'): k = {'gl':'grp','nl':'note','rl':'rest'}[k]
            k = m.lastgroup if m.lastgroup not in ('gl','nl','rl') else k
            g = m.groupdict()
            if g['grp'] is not None: items.append(['note', m.group(0), ln(g['gl']) * L * tupf]); 
            elif g['note'] is not None: items.append(['note', m.group(0), ln(g['nl']) * L * tupf])
            elif g['rest'] is not None: items.append(['rest', m.group(0), ln(g['rl']) * L * tupf])
            elif g['tup'] is not None:
                p = int(g['tup'][1]); parts = g['tup'][2:].split(':') if ':' in g['tup'] else []
                q = int(parts[1]) if len(parts) > 1 and parts[1] else (3 if p in (2,4,6,8) else 2)
                r = int(parts[2]) if len(parts) > 2 and parts[2] else p
                tupleft = r; tupf = F(q, p); items.append(['tup', m.group(0), F(0)])
            elif g['bar'] is not None:
                if m.group(0).isdigit() and items and items[-1][0] == 'bar': items[-1][1] += m.group(0)
                else: items.append(['bar', m.group(0), F(0)])
            elif g['chord'] is not None: items.append(['pre', m.group(0), F(0)])
            elif g['deco'] is not None: items.append(['pre', m.group(0), F(0)])
            elif g['field'] is not None: items.append(['field', m.group(0), F(0)])
            elif g['tie'] is not None: items.append(['post', '-', F(0)])
            elif g['sl'] is not None: items.append(['pre' if g['sl'] == '(' else 'post', m.group(0), F(0)])
            elif g['sp'] is not None: pass
            else: items.append(['pre', m.group(0), F(0)])
            if len(items) > n0 and items[-1][0] in ('note','rest') and tupleft:
                tupleft -= 1
                if tupleft == 0: tupf = F(1)
        # bar lengths
        bars = []; cur = F(0); idx = []
        for i, it in enumerate(items):
            if it[0] == 'bar':
                bars.append((cur, i)); cur = F(0)
            elif it[0] in ('note','rest'): cur += it[2]
        bars.append((cur, len(items)))
        # pass 2: beat spacing
        t = F(0); firstoff = F(0)
        if firstbar and bars and bars[0][0] < M and bars[0][0] > 0: firstoff = M - bars[0][0]
        res = []; pending = []; prevlong = False; prevnote = False; intup = 0; tupnotes = 0
        t = firstoff; nbar = 0; bars_on_line = 0; piece = []
        lines_here = []
        cur_line = []; 
        for i, it in enumerate(items):
            k = it[0]
            if k == 'bar':
                piece.extend(pending); pending = []
                cur_line.append(('B', it[1])); t = F(0); prevnote = False; prevlong = False
                firstbar = False; continue
            if k == 'tup':
                pending.append(it[1]); intup = int(it[1][1]); tupmark = True; continue
            if k in ('pre', 'field'):
                pending.append(it[1]); continue
            if k == 'post':
                cur_line.append(('A', it[1])); continue
            # note / rest
            d = it[2]
            long_ = d >= F(1,4)
            onbeat = (t % beat == 0)
            lead = ''.join(pending); pending = []
            sp = bool(cur_line) and not (cur_line[-1][0] == 'B') and (onbeat or long_ or prevlong) and not (intup and tupnotes)
            if cur_line and cur_line[-1][0] == 'B': sp = True
            if intup:
                tupnotes += 1
                if tupnotes >= intup: intup = 0; tupnotes = 0
            cur_line.append(('N', (' ' if sp else '') + lead + it[1]))
            t += d; prevlong = long_; prevnote = True
        cur_line.extend(('N', x) for x in pending)
        # wrap: 4 bars per line
        seg = []; nb = 0; lines2 = []
        has = False; brk = -1
        for kind, txt in cur_line:
            if kind == 'B':
                opener = bool(re.search(r'\d$|:$', txt)) and not txt.startswith(':')
                if opener and has and nb and nb % 4 == 0 and nb != brk:
                    lines2.append(''.join(seg).strip()); seg = []; brk = nb
                seg.append(' ' + txt + ' ')
                if has:
                    nb += 1; has = False
                    if nb % 4 == 0 and not opener: lines2.append(''.join(seg).strip()); seg = []; brk = nb
            else:
                seg.append(txt)
                if re.search(r'[A-Ga-gzxZ]', txt): has = True
        if ''.join(seg).strip(): lines2.append(''.join(seg).strip())
        # avoid a lone final bar line: merge into previous
        if len(lines2) >= 2 and lines2[-1].count('|') <= 1 and re.fullmatch(r'[^|]*\|?\]?:?\|?\]?', lines2[-1].replace(' ','')) and len(re.sub(r'[|:\]\[\s0-9]', '', lines2[-1])) < 12:
            lines2[-2] += ' ' + lines2[-1]; lines2.pop()
        out.extend(re.sub(r'\s+', ' ', x) for x in lines2)
        for n, (dsum, _) in enumerate(bars):
            if dsum and dsum != M: stats['bars'] += 1
        stats['bad'] += sum(1 for n, (dsum, _) in enumerate(bars[:-1]) if dsum != M and not (n == 0))
    return '\n'.join(hdr + out + moved), stats
