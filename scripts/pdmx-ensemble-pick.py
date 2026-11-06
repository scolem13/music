"""Pick the PDMX orchestra and band scores most likely to be good, and copy them with readable names.

Reads ~/Downloads/PDMX-trim.csv (scripts/pdmx-trim.py) and ~/Downloads/PDMX-mxl/. Writes ~/Downloads/PDMX-ensembles/:
<Composer>-<Piece>.mxl for each pick, and index.csv (sortable; `pdmx` is the original file).
Run: python3 -I scripts/pdmx-ensemble-pick.py [ensembles|piano|quartet|choir|pop|jazz] [N]
(pop and jazz skip the classical-composer rule; jazz = jazz-tagged or -titled, 4+ parts, 2+ horn parts)   (default ensembles, 500)
Other groups go to ~/Downloads/PDMX-<group>/. Instruments are PDMX's `tracks`, General MIDI programs per part
(0 piano, 19-20 organ, 40-42 violin/viola/cello, 43 bass, 48-51 string ensemble, 52-54 voices).

"Likely good" is a guess from metadata only, never from opening the score:
- PDMX's own deduplicated copy; 12+ parts (orchestra) or 10+ parts labelled band / wind / brass, or by a band composer;
- tagged classical, or naming a composer in KNOWN (then also named that way); not tagged pop, rock, soundtrack, game music and so on; at least 24 bars; no "incomplete" / "draft" in the title;
- ranked by rating (pulled toward 4.5 when few people rated it), how many rated it, favorites and views;
  a missing composer costs a little. Two picks with the same file name are the same piece: the better one is kept.
"""
import csv, math, os, re, shutil, sys, unicodedata

HOME = os.path.expanduser("~")
args = sys.argv[1:]
GROUP = args.pop(0) if args and not args[0].isdigit() else "ensembles"
N = int(args[0]) if args else 500
CSVF, MXL, OUT = HOME + "/Downloads/PDMX-trim.csv", HOME + "/Downloads/PDMX-mxl/", HOME + "/Downloads/PDMX-" + GROUP + "/"

BAND = re.compile(r"concert band|wind ensemble|symphonic band|wind band|wind symphony|wind orchestra|military band|"
                  r"harmonie|blasorchester|brass band|banda\b|marching band", re.I)
BAND_COMPOSERS = re.compile(r"sousa|fu[cč][ií]k|alford|karl king|king, karl|lincolnshire posy|military band", re.I)   # band whatever the label
NOT_GENRES = re.compile(r"pop|rock|soundtrack|electronic|hiphop|rbfunksoul|country|folk|newage|experimental")
JUNK = re.compile(r"disney|mickey|clubhouse|wings of fire|dragonet|star wars|mandalorian|harry potter|marvel|original|mashup|medley|my own|needs some work|incomplete|unfinished|draft|\bwip\b|work in progress|test\b|pok[eé]mon|mario|zelda|undertale|megalovania|"
                  r"anime|minecraft|fortnite|naruto|jojo|sword art|final fantasy|zanarkand|genshin|meme|rickroll|never gonna", re.I)

# Standard spellings: a score counts as by one of these when its composer field or title names them.
KNOWN = {k.lower(): k for k in """Adams Albeniz Albinoni Alford Arban Arnold Bach Barber Bartok Beethoven Bellini Berlioz Bernstein
Bizet Boccherini Borodin Brahms Britten Bruch Bruckner Buxtehude Byrd Chabrier Charpentier Cherubini Chopin Copland Corelli
Couperin Debussy Delibes Delius Donizetti Dukas Dvorak Elgar Enescu Faure Franck Fucik Gabrieli Gershwin Glazunov Glinka Gluck
Gounod Grainger Grieg Handel Haydn Hindemith Holst Humperdinck Ibert Ives Janacek Joplin Khachaturian Kodaly Lalo Lehar Liszt
Lully Mahler Mascagni Massenet Mendelssohn Messiaen Meyerbeer Milhaud Monteverdi Mozart Mussorgsky Nielsen Offenbach Orff
Pachelbel Paganini Palestrina Parry Persichetti Ponchielli Poulenc Prokofiev Puccini Purcell Rachmaninoff Rameau Ravel
Respighi Rimsky-Korsakov Rodrigo Rossini Saint-Saens Sarasate Satie Scarlatti Schoenberg Schubert Schumann Scriabin Shostakovich
Sibelius Smetana Sousa Strauss Stravinsky Suppe Sullivan Tallis Tchaikovsky Telemann Verdi Arne Vaughan-Williams Vivaldi Wagner
Walton Weber Widor Zelenka Kalinnikov Vierne Giuliani Rodrigo Kempter Sor""".split()}
ALIASES = {"tschaikowsky": "Tchaikovsky", "tchaikowsky": "Tchaikovsky", "rachmaninov": "Rachmaninoff", "resphigi": "Respighi",
           "haendel": "Handel", "händel": "Handel", "dvořák": "Dvorak", "dvorák": "Dvorak", "vaughan williams": "Vaughan-Williams",
           "saint-saëns": "Saint-Saens", "saint-säens": "Saint-Saens", "fauré": "Faure", "bartók": "Bartok", "janáček": "Janacek",
           "fučík": "Fucik", "rimsky korsakov": "Rimsky-Korsakov", "mussorgski": "Mussorgsky", "moussorgsky": "Mussorgsky",
           "suppé": "Suppe", "dvoåák": "Dvorak", "dvoaak": "Dvorak", "janaäek": "Janacek", "kalinnikow": "Kalinnikov", "kodály": "Kodaly", "albéniz": "Albeniz", "shostakovitch": "Shostakovich"}

def known(*texts):
    t = unicodedata.normalize("NFKD", " ".join(texts).lower()).encode("ascii", "ignore").decode()
    raw = " ".join(texts).lower()
    for a, k in ALIASES.items():
        if a in raw or unicodedata.normalize("NFKD", a).encode("ascii", "ignore").decode() in t: return k
    hits = [(t.find(k), v) for k, v in KNOWN.items() if re.search(r"\b" + re.escape(k) + r"\b", t)]
    return min(hits)[1] if hits else ""

MOJI = re.compile("[\u00c2-\u00f4][\u0080-\u00bf\u0152-\u0192\u02c6-\u02dc\u2013-\u203a\u20ac\u2122]{1,3}")
def unmoji(m):
    for enc in ("cp1252", "latin1"):
        try: return m.group(0).encode(enc).decode("utf8")
        except (UnicodeEncodeError, UnicodeDecodeError): pass
    return m.group(0)

def fix(s):
    """Undo UTF-8 read as Latin-1 ("DvoÅ\x99Ã¡k", "Ð\x9cÐ°Ñ\x80Ñ\x88"), run by run, since a field can mix both."""
    return MOJI.sub(unmoji, s or "").strip()

CYR = dict(zip("абвгдеёжзийклмнопрстуфхцчшщъыьэюя", "a b v g d e e zh z i y k l m n o p r s t u f kh ts ch sh shch  y  e yu ya".split(" ")))
def translit(s):
    return "".join((CYR.get(c.lower(), c).capitalize() if c.isupper() else CYR.get(c, c)) for c in s)

def composer(r):
    s = fix(r["composer_name"] or "")
    s = re.sub(r"^(?:original(?:ly)?\s*(?:artist|by|performed by)?|performed by|as performed by|words and music by|written by)\s*:?\s*", "", s, flags=re.I)
    if not re.search(r"[^\W\d_]{3}", s) and GROUP in ("pop", "jazz"): s = fix(r["artist_name"] or "")
    s = re.split(r"\s*(?:arr\.|arranged|arrangement|transcribed|trans\.|edited|ed\. by|orch\.|/|\n|;)", s, flags=re.I)[0]
    s = re.sub(r"\(.*?\)|\[.*?\]|\b1[5-9]\d\d\b.*", "", s)
    s = re.sub(r"^(?:music\s+)?(?:composed\s+)?by:?\s+|^music:?\s+|^composer:?\s*$", "", s.strip(), flags=re.I)
    s = s.strip(" .,-:")
    if not re.search(r"[^\W\d_]{3}", s) or re.search(r"[ÐÑ]", s): s = ""        # "314", unreadable Cyrillic
    if not s or s.lower() in ("composer", "traditional", "unknown", "anonymous", "anon"):
        m = re.match(r"\s*([A-Z][\w.' -]{2,30}?)\s*[-–:]\s+\S", fix(r["title"]))   # "Holst - Mars"
        s = m.group(1).strip() if m else ""
    return s

def ascii_camel(s, n):
    s = unicodedata.normalize("NFKD", translit(s)).encode("ascii", "ignore").decode()
    s = re.sub(r"[^A-Za-z0-9]+", " ", s).strip()
    return "".join(w[:1].upper() + w[1:] for w in s.split())[:n]

def surname(c):
    w = re.sub(r"\b(von|van|de|da|di|du|le|la)\b", lambda m: m.group(1).capitalize(), c).split()
    return w[-1] if w else "Unknown"

def piece(r, comp):
    t = fix(r["title"])
    full = fix(r["composer_name"])
    for name in sorted({comp, surname(comp), full} - {""}, key=len, reverse=True):
        t = re.sub(re.escape(name), "", t, flags=re.I)
    for w in re.findall(r"[^\W\d_]{3,}", full):                    # stray first names: "Antonin", "Pyotr"
        if w.lower() not in ("the", "and", "von", "van", "arr", "music", "composed"): t = re.sub(r"\b" + re.escape(w) + r"\b", "", t, flags=re.I)
    t = re.sub(r"\{.*?\}|\(\s*\)|^[\s\-–:,.]+|[\s\-–:,.]+$", "", t)
    return t or fix(r["song_name"]) or "Untitled"

def f(v):
    try: return float(v)
    except (TypeError, ValueError): return 0.0

def score(r, comp):
    n, rating = f(r["n_ratings"]), f(r["rating"])
    bayes = (rating * n + 4.5 * 5) / (n + 5)
    return (3 * (bayes - 4.5) + 0.8 * math.log1p(n) + 0.5 * math.log1p(f(r["n_favorites"]))
            + 0.3 * math.log10(1 + f(r["n_views"])) - (0.5 if not comp else 0))

def programs(r):
    return [int(v) for v in r["tracks"].split("-") if v.strip().isdigit()]

VOICE, KEYS, STR = {52, 53, 54}, {0, 19, 20}, {40, 41, 42, 43, 44, 45, 48, 49, 50, 51}
def classify(r, text, parts):
    p = programs(r)
    if GROUP == "ensembles":
        if (BAND.search(text) or BAND_COMPOSERS.search(r["composer_name"] + " " + r["title"])) and parts >= 10: return "band"
        return "orchestra" if parts >= 12 else ""
    if GROUP == "piano":
        if p != [0] or re.search(r"\b(duet|4 hands|four hands|vocal score|piano reduction|reduction|accompaniment)\b", text, re.I): return ""
        return "piano"
    if GROUP == "quartet":
        if len(p) != 4 or not set(p) <= STR: return ""
        if sorted(p) == [40, 40, 41, 42]: return "string quartet"
        return "string quartet" if 42 in p or re.search(r"quart", text, re.I) else ""
    if GROUP == "choir":
        voices = sum(v in VOICE for v in p)
        if not set(p) <= VOICE | KEYS: return ""
        if voices < 3 and not (len(p) >= 3 and re.search(r"\bSATB\b|choir|chorus|chor\b|coro\b|motet|anthem", text, re.I)): return ""
        return "choir a cappella" if set(p) <= VOICE else "choir and keyboard"
    if GROUP == "pop":
        if not re.search(r"pop|rock", r["genres"]) or "jazz" in r["genres"]: return ""
        return "band" if parts >= 4 else "small (2-3 parts)" if parts >= 2 else "solo / lead sheet"
    if GROUP == "jazz":
        jazzy = "jazz" in r["genres"] or JAZZ.search(text + " " + r["composer_name"])
        horns = sum(56 <= v <= 71 for v in p)          # GM brass 56-63, reeds 64-71
        if not jazzy or parts < 4 or horns < 2: return ""
        return "big band" if parts >= 12 and horns >= 7 else "jazz ensemble"
    sys.exit("unknown group " + GROUP)

JAZZ = re.compile(r"\bjazz|big ?band|swing\b|bebop|be-bop|\bcombo\b|dixieland|\bragtime|ellington|basie|count basie|glenn miller|"
                  r"benny goodman|monk\b|thelonious|coltrane|miles davis|mingus|gillespie|charlie parker|nestico|thad jones|"
                  r"gil evans|stan kenton|woody herman|maynard|buddy rich|hot five|hot seven|jelly roll|bix|fats waller|"
                  r"real book|jazz standard|bossa", re.I)

picks = []
for r in csv.DictReader(open(CSVF)):
    if r["dedup"] != "1" or f(r["song_length.bars"]) < 24: continue
    text = " ".join(r[k] for k in ("title", "subtitle", "song_name", "tags"))
    if JUNK.search(text): continue
    if GROUP in ("pop", "jazz"):
        k = ""
    else:
        if NOT_GENRES.search(r["genres"]): continue
        k = known(fix(r["composer_name"])) or known(fix(r["title"]), fix(r["subtitle"]))
        if not k and "classical" not in r["genres"]: continue
    comp, parts = k or composer(r), f(r["n_tracks"])
    kind = classify(r, text, parts)
    if not kind: continue
    if not os.path.exists(MXL + r["mxl"].replace("./mxl/", "")): continue
    picks.append((score(r, comp), kind, comp, r))

picks.sort(key=lambda p: -p[0])
os.makedirs(OUT, exist_ok=True)
seen, rows = set(), []
for s, kind, comp, r in picks:
    who = comp if comp in KNOWN.values() or GROUP in ("pop", "jazz") else surname(comp)
    name = ascii_camel(who or "Unknown", 30) + "-" + ascii_camel(piece(r, comp), 70)
    if name.lower() in seen: continue
    seen.add(name.lower())
    shutil.copy2(MXL + r["mxl"].replace("./mxl/", ""), OUT + name + ".mxl")
    rows.append([name + ".mxl", kind, comp, fix(r["title"]), r["n_tracks"], r["song_length.bars"], r["n_notes"],
                 r["rating"], r["n_ratings"], r["n_favorites"], r["n_views"], r["genres"], round(s, 2),
                 r["mxl"].replace("./mxl/", "")])
    if len(rows) == N: break

with open(OUT + "index.csv", "w", newline="") as g:
    w = csv.writer(g)
    w.writerow(["file", "kind", "composer", "title", "parts", "bars", "notes", "rating", "n_ratings", "favorites",
                "views", "genres", "pick_score", "pdmx"])
    w.writerows(rows)
import collections
print(len(rows), "scores ->", OUT, "|", dict(collections.Counter(r[1] for r in rows)))
