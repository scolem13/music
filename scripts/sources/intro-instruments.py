# Sources for the "Meet the Instruments" lessons (lessons/intro-*.qmd, written by scripts/intro-instruments/build.py).
# Each page reuses the manuals cited by its compare page (scripts/sources/{synth,drum,sequencer}-compare.py; picked here by a piece of
# their URL, the page's `cites` list in build.py) plus the instrument's Wikipedia article, read 2026-11-25 for the year, maker, the
# quoted sentence and the records named (only records the article itself names are listed).
import pathlib, importlib.util
_root = pathlib.Path(__file__).resolve().parents[2] if "__file__" in globals() else pathlib.Path("scripts/sources").resolve().parents[1]
_spec = importlib.util.spec_from_file_location("intro_build", str(_root / "scripts/intro-instruments/build.py")); _b = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_b)
_ns = dict(wiki=wiki, web=web, book=book, live=live, logic=logic, bl=bl)
_pool = []
for _f in ("synth-compare", "drum-compare", "sequencer-compare"):
    _g = dict(_ns); exec((_root / "scripts/sources" / (_f + ".py")).read_text(), _g); _pool += _g["SOURCES"]
_W = lambda t, s, n: wiki(t, s, [], note=n, who="student")
_pool += [
    _W("Minimoog", "Minimoog", "1970, Moog Music; David Borden's \"took the synthesizer out of the studio\"; Sun Ra, Kraftwerk, Parliament."),
    _W("Sequential Prophet-5", "Sequential_Prophet-5", "1978, Dave Smith and John Bowen; \"market leader and industry standard\"; The Cars, Phil Collins, Thriller, Like a Virgin."),
    _W("ARP 2600", "ARP_2600", "1971-1981, semi-modular, marketed to schools; Tony Banks, Black Sabbath, Thriller, Nine Inch Nails."),
    _W("Oberheim OB-Xa", "Oberheim_OB-Xa", "Released December 1980; Curtis chips; Van Halen \"Jump\", Miles Davis, Prince, Queen."),
    _W("Yamaha DX7", "Yamaha_DX7", "1983; first commercially successful digital synthesizer; When Doves Cry, Take On Me (Bass 1), Take My Breath Away (Bass 2), Eno's Apollo."),
    _W("Roland MC-202", "Roland_MC-202", "1983; \"the first groovebox\"; names no records."),
    _W("Roland MC-4 Microcomposer", "Roland_MC-4_Microcomposer", "1981; Vince Clarke on Upstairs at Eric's and Chorus; \"better timing\"."),
    _W("Moog synthesizer", "Moog_synthesizer", "I Feel Love (1977) made almost entirely with a Moog; Tangerine Dream. Does not describe the 960."),
    _W("Elektron (company)", "Elektron_(company)", "Gothenburg; Digitakt II 2024; parameter locks from the 2002 Machinedrum; users named."),
]
_pages = {}
for _slug, _p in _b.P.items():
    for _c in _p.get("cites", []):
        _pages.setdefault(_c, []).append(f"lessons/intro-{_slug}.qmd")
SOURCES = []
for _s in _pool:
    _hit = [pg for c, pgs in _pages.items() if c.lower() in _s["mla"].lower() for pg in pgs]
    if _hit:
        _d = dict(_s); _d["pages"] = list(dict.fromkeys(_hit)); SOURCES.append(_d)
