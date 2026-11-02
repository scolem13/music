"""Helpers shared by work-years.py and build.py: folding text, catalogue keys, movement numbers."""
import re, unicodedata

def fold(s): return unicodedata.normalize("NFD", s or "").encode("ascii", "ignore").decode().lower()

PFX = [("bwv", r"bwv|bach-werke"), ("hwv", r"hwv|handel-werke"), ("k", r"\bkv?\b|kochel"), ("hob", r"hob|hoboken"),
       ("d", r"\bd\b|deutsch"), ("woo", r"woo|ohne opus"), ("sz", r"\bsz\b|szollosy"), ("bb", r"\bbb\b"), ("s", r"\bs\b|searle"),
       ("twv", r"twv|telemann"), ("rv", r"\brv\b|ryom"), ("h", r"\bh\b|helm|hopkinson"), ("z", r"\bz\b|zimmerman"), ("l", r"\bl\b|longo"),
       ("op", r"\bop\b|opus"), ("jw", r"\bjw\b"), ("trv", r"trv"), ("wq", r"\bwq\b")]

def keys_of(text, catl=""):
    """Normalised catalogue keys in a string: 'op27/2', 'bwv1007', 'hobxvi:37', 'woo1/3'."""
    t = fold(text).replace("no.", "no ").replace("nr.", "no ")
    ks = set()
    for m in re.finditer(r"\b(bwv|hwv|kv|k|hob\.?\s*[ivxl]+[a-z]?\s*:|d|woo|sz|bb|s|twv|rv|h|z|l|op|opus|jw|trv|wq)\.?\s*(\d+[a-z]?(?::\d+)?)(?:\s*,?\s*no\.?\s*(\d+))?", t):
        p = re.sub(r"[\s.]", "", m.group(1)).replace("opus", "op").replace("kv", "k")
        ks.add(p + m.group(2) + ("/" + m.group(3) if m.group(3) and p in ("op", "woo", "hob") else ""))
        if m.group(3) and p in ("op", "woo"): ks.add(p + m.group(2))      # the set as well: op27 holds op27/2
    if re.fullmatch(r"\s*\d+[a-z]?(?:\s*[,/]\s*(?:no\.?\s*)?\d+)?\s*", t) and catl:
        pf = next((p for p, rx in PFX if re.search(rx, fold(catl))), None)
        if pf:
            n = re.findall(r"\d+[a-z]?", t)
            ks.add(pf + n[0] + ("/" + n[1] if len(n) > 1 and pf in ("op", "woo") else ""))
    return ks

def specific(ks): return {k for k in ks if "/" in k} or ks          # op27/2 rather than op27 when there is one

def same_piece(a, b):
    """Two key sets name the same piece: equal most-specific keys (op27/2 = op27/2; op27/2 is not a bare op27)."""
    return bool(specific(a) & specific(b))

ORDN = {"first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5}
def movements(title):
    """Movement numbers a title names: 'mvt. 2', 'mvts 1, 2 and 3', '2nd Movement', 'II.'"""
    t = title
    m = re.search(r"mvts?\.?\s*(\d)((?:\s*,\s*\d)*)(?:,?\s*and\s*(\d))?", t)
    if m: return {int(x) for x in re.findall(r"\d", m.group(0))}
    m = re.findall(r"(\d)(?:st|nd|rd|th) [Mm]ovement", t)
    if m: return {int(x) for x in m}
    return set()
