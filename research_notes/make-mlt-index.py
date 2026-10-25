#!/usr/bin/env python3
"""Writes research_notes/mlt-sources-INDEX.md: a map of the MLT book text cache (research_notes/mlt-sources/, gitignored).
For each book: file, size, how pages are marked, page images, and a heading map with line numbers (and print page where marked).
Re-run after adding a book:  python3 research_notes/make-mlt-index.py"""
import re, pathlib

HERE = pathlib.Path(__file__).parent
CACHE = HERE / "mlt-sources"
OUT = HERE / "mlt-sources-INDEX.md"

# file -> (short name, full title, how pages work, site citation key in scripts/sources/mlt.py or "")
BOOKS = {
    "gordon-lsm-2012.txt": ("Gordon LSM", "Gordon, *Learning Sequences in Music* (2012 ed., GIA). From the epub (`mlt-sources/epub/`).",
        "`[p.N]` print-page markers inline (the page *starts* at the marker). `=== nnn_Name ===` marks epub chapter files.", "cited"),
    "Learning sequences in music skill, content, and patterns a music learning theory study guide.txt": ("Gordon Study Guide",
        "Gordon, *Learning Sequences in Music: Skill, Content, and Patterns. A Music Learning Theory Study Guide* (1997, GIA).",
        "No page markers (text layer of the PDF). Find the print page in the PDF: `pdftotext -f N -l N`.", ""),
    "jri-lsa-handbook.txt": ("JRI LSA Handbook (OCR)", "Gordon, *Jump Right In: The Music Curriculum. Reference Handbook for LSAs* (2001 rev., GIA).",
        "OCR, `=== PDF PAGE nnn ===` (PDF page, not print page: read the printed number on the page). Images `pages/jri-lsa-handbook/`.", "cited"),
    "jri-lsa-handbook.clean.txt": ("JRI LSA Handbook (cleaned)", "Same book, OCR noise removed. Prefer this one for reading.",
        "Same PDF page markers as the raw OCR.", "cited"),
    "jri-musicplay.txt": ("Music Play", "Reynolds, Valerio, Bolton, Taggart, Gordon, *Music Play* (1998, GIA).",
        "OCR, `=== PDF PAGE nnn ===`. Images `pages/jri-musicplay/`.", "cited"),
    "jri-recorder.txt": ("JRI Recorder", "Grunow, Gordon, Azzara, *Jump Right In: The Instrumental Series. Teacher's Guide for Recorder* (rev. 1999, GIA).",
        "OCR, `=== PDF PAGE nnn ===`. Images `pages/jri-recorder/`.", "cited"),
    "dmti1.txt": ("DMTI 1", "Azzara and Grunow, *Developing Musicianship through Improvisation, Book 1* (2006, GIA).",
        "OCR, `=== PDF PAGE nnn ===`. Images `pages/dmti1/`.", "cited"),
    "dmti2.txt": ("DMTI 2", "Azzara and Grunow, *DMTI Book 2* (2010, GIA).", "OCR, `=== PDF PAGE nnn ===`. Images `pages/dmti2/`.", "cited"),
    "dmti3.txt": ("DMTI 3", "Azzara and Grunow, *DMTI Book 3* (2010, GIA).", "OCR, `=== PDF PAGE nnn ===`. Images `pages/dmti3/`.", "cited"),
    "The Literate Musician eBook.txt": ("Literate Musician", "Mullen, *The Literate Musician* (rev. 2nd ed., 2020).",
        "Form-feed (`\\f`) page breaks from pdftotext: PDF page = number of `\\f` before the line + 1. Images `pages/litmus/`.", "cited"),
    "MLTAnyMusicTeacherCanDuDe.txt": ("Mullen MLT Du..De", "Mullen, *MLT Any Music Teacher Can Du…De* (2021).",
        "No page markers. Use `pdftotext -f N -l N` on the PDF.", "cited"),
    "MLTAMTCDD Digital Appendix.txt": ("Du..De Appendix", "Mullen, *MLT Any Music Teacher Can Du…De*, Digital Appendix.",
        "No page markers.", ""),
    "How to Teach the Language of Music.txt": ("Mullen How to Teach", "Mullen, *How to Teach the Language of Music*.", "No page markers.", ""),
    "How-to-Learn-the-Language-of-Music.txt": ("Mullen How to Learn", "Mullen, *How to Learn the Language of Music*.", "No page markers.", ""),
    "50 Tunes for Teaching-eBook.txt": ("50 Tunes", "Mullen, *50 Tunes for Teaching*.", "No page markers.", ""),
    "Music Moves for Piano Book 1 creativity, keyboard skills, ensemble playing, movement, improvisation.txt": ("Music Moves 1",
        "Marilyn Lowe, *Music Moves for Piano, Book 1* (GIA).", "No page markers.", ""),
}

HEAD = re.compile(r"^\s{0,12}((?:[A-Z][A-Z0-9 ,:;'’&/().–-]{5,70})|(?:(?:Unit|UNIT|Lesson|LESSON|Section|Chapter|CHAPTER|Part|PART)\s+[0-9IVX]+\b.{0,70}))\s*$")
NOISE = re.compile(r"^(?:[A-Z]\s?){1,4}$|^[IVXL ]+$|COPYRIGHT|ISBN|G-\d{4}")

TOPICS = [r"resting tone", r"keyality", r"Dorian", r"Mixolydian", r"harmonic minor", r"usual duple", r"usual triple", r"usual combined",
    r"unusual paired", r"unusual unpaired", r"intact", r"macrobeat", r"microbeat", r"enrhythmic", r"partial synthesis", r"symbolic association",
    r"generalization", r"composite synthesis", r"theoretical understanding", r"FPIFO", r"tonal pattern", r"rhythm pattern", r"learning sequence activit",
    r"classroom activit", r"acculturation", r"preparatory audiation", r"du de", r"du da di", r"la.based minor", r"subdominant", r"multitonal", r"aptitude"]

def page_of(line, kind, state):
    m = re.findall(r"\[p\.([0-9ivxlc]+)\]", line)
    if m: state["p"] = m[-1]
    m = re.match(r"=== PDF PAGE (\d+) ===", line)
    if m: state["p"] = "pdf " + str(int(m.group(1)))
    return state.get("p", "")

def scan(path):
    text = path.read_text(errors="replace")
    lines = text.split("\n")
    out, state, ff, last = [], {}, 0, None
    for i, raw in enumerate(lines, 1):
        ff += raw.count("\f")
        line = raw.replace("\f", "")
        pg = page_of(line, None, state)
        if ff: pg = f"pdf {ff + 1}"
        m = HEAD.match(line)
        if not m: continue
        h = re.sub(r"\s+", " ", m.group(1)).strip()
        letters = sum(c.isalpha() for c in h)
        if NOISE.search(h) or len(h) < 6 or h == last or letters < 0.7 * len(h.replace(" ", "")) \
           or not re.search(r"[AEIOUaeiou]", h) or len(h.split()) < 2 and len(h) < 10: continue
        # a heading doubled by the PDF text layer ("TITLETITLE") is kept once
        half = len(h) // 2
        if len(h) % 2 == 0 and h[:half] == h[half:]: h = h[:half]
        last = h
        out.append((i, pg, h))
    return len(lines), out

def main():
    md = ["# MLT source books: index of the text cache", "",
          "Generated by `research_notes/make-mlt-index.py` (re-run it after adding a book). The cache itself, `research_notes/mlt-sources/`,",
          "is gitignored; this index is not, so it survives if the cache is cleared. To rebuild the cache: PDFs are in",
          "`~/Documents/books-for-Claude/MLT/` (Mullen's books in `MLT/Mullen/`); `mlt-sources/ocr.sh` re-OCRs the GIA scans (PNG per page + text); the other texts are pdftotext.",
          "", "Permission: GIA and the authors allow full reproduction on the site with page citations (user, 2026-10-24).",
          "Cite **print** pages: Gordon's `[p.N]`; for OCR'd books read the number printed on the page image, not the PDF page.",
          "Every citation goes in `scripts/sources/mlt.py` (or another `scripts/sources/*.py`); duplicate entries of one book merge and keep the first note.",
          "", "Notes on what has been read for particular pages: `research_notes/modes-meter-pages.md` (Modes / Time Signatures theory pages).", "",
          "## Books", "", "| Book | File (`mlt-sources/text/`) | Lines | Pages | Cited on site |", "|---|---|---|---|---|"]
    found = {p.name: p for p in sorted((CACHE / "text").glob("*.txt"))}
    scans = {}
    for name, p in found.items():
        short, title, pages, cited = BOOKS.get(name, (name, "(not described yet)", "?", ""))
        n, heads = scan(p); scans[name] = heads
        md.append(f"| {title} | `{name}` | {n} | {pages} | {'yes' if cited else ''} |")
    imgs = sorted(d.name for d in (CACHE / "pages").iterdir() if d.is_dir()) if (CACHE / "pages").exists() else []
    md += ["", "Page images (150 dpi PNG, for notation): " + ", ".join(f"`pages/{d}/` ({len(list((CACHE/'pages'/d).glob('*.png')))})" for d in imgs), ""]
    md += ["## Topic finder", "", "First lines (and page) where each term appears in each book. Case-insensitive.", ""]
    for term in TOPICS:
        rx = re.compile(term, re.I); row = []
        for name, p in found.items():
            hits, state, ff = [], {}, 0
            for i, raw in enumerate(p.read_text(errors="replace").split("\n"), 1):
                ff += raw.count("\f"); pg = page_of(raw, None, state)
                if ff: pg = f"pdf {ff + 1}"
                if rx.search(raw):
                    hits.append(f"{i}" + (f" ({pg})" if pg else ""))
                    if len(hits) == 3: break
            if hits: row.append(f"{BOOKS.get(name, (name,))[0]}: " + ", ".join(hits))
        md.append(f"- **{term.replace(chr(92), '')}**: " + ("; ".join(row) or "not found"))
    md += ["", "## Heading maps", "", "Line number in the text file, then page (print `p.N`, or `pdf N`), then the heading. Grep the heading to jump there.", ""]
    for name, heads in scans.items():
        short = BOOKS.get(name, (name,))[0]
        md += [f"### {short}", "", f"`{name}`", "", "```"]
        md += [f"{i:>6}  {pg:<9} {h}" for i, pg, h in heads] or ["(no headings found)"]
        md += ["```", ""]
    OUT.write_text("\n".join(md))
    print(f"wrote {OUT} ({sum(len(h) for h in scans.values())} headings, {len(scans)} books)")

main()
