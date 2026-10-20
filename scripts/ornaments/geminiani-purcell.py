# Geminiani, The Art of Playing on the Violin (London, 1751), Example XVIII (text pp. [6]-[8], plate "Essemp. XVIII" p. 26),
# read from IMSLP #05501; Purcell, A Choice Collection of Lessons (London, 1696), "Rules for Graces", read from the
# Early English Books copy on Internet Archive. Moved onto C; note counts approximate where the row note says so.
TABLES = [
dict(id="geminiani-1751", cols=("Geminiani's name", "Sign", "Played"), rows=[
    dict(name="A plain Shake", gloss="<em>Trillo semplice</em>: for quick movements", sign="!trill!c8", played="dcdcdcdc",
         note="Eight slurred 32nds; the start on the note above is read from the group ending on the main note."),
    dict(name="A turn'd Shake", gloss="<em>Trillo composto</em>: quick and long for gaiety, short and soft for tender passions",
         sign='"^+"c8', lily=r'''c''4\stopped''', played="dcdcdcdc B c", note="About ten notes on the plate: the trill, the note below, the main note."),
    dict(name="A superior Apogiatura", gloss="from above, on the beat, \"more than half the Length\" of the note, swelling",
         sign="{d}c8", played="d4-d c3", note="Geminiani gives it more than half the note; the plate also shows a short one."),
    dict(name="An inferior Apogiatura", gloss="from the note below, only when the melody rises a second or third, then a beat",
         sign="{^B}c8", played="^B4 c^B c2"),
    dict(name="Holding the Note", gloss="<em>Trattenimento</em>: the note held plain, then shaken, so the pure note is heard",
         sign='"^-"c16', lily=r'''c''2^\markup { \concat { \raise #0.6 \draw-line #'(1.4 . 0) \hspace #0.5 \musicglyph "scripts.stopped" } }''', played="c8 dcdcdc^Bc", note="Shape from the plate; note count approximate.", width=(110, 170)),
    dict(name="A Beat", gloss="the note and the semitone below, slurred: strong and long for fury, soft and swelling for grief",
         sign='"^//"c8', lily=r'''c''4^\markup { \musicglyph "scripts.caesura.straight" }''', played="c^Bc^Bc^Bc2", note="A trill on the lower note, starting on the main note."),
]),
dict(id="purcell-1696", cols=("Purcell's name", "Sign", "Played"), rows=[
    dict(name="Shake", gloss="from the note above (\"you allway's shake from the note above\")", sign="!trill!c8", lily=r'''c''4\purcellShake''', played="dcdcdcdc",
         note="The sign is a double oblique stroke through the stem."),
    dict(name="Beat", gloss="from the note or half note below, \"according to the key you play in\"", sign="!mordent!c8", lily=r'''c''4\prall''', played="BcBc c4",
         note="A stroke with a cross stroke. The rule is clear; the number of notes on the poor scan is not."),
    dict(name="Plain note and Shake", gloss="half the note held on the note above, then shaken (a dotted note: only the dot)",
         sign="!trill!c16", lily=r'''c''2\purcellPlainShake''', played="d8 dcdcdcdc", width=(110, 170)),
    dict(name="Forefall", gloss="an oblique stroke rising to the note: the note below first", sign="{B}c16", lily=r'''\leftMark #'(moveto 0 -0.4 lineto 1.1 0.7) c''2''', played="B4 c12", width=(90, 150)),
    dict(name="Backfall", gloss="a stroke falling to the note: the note above first", sign="{d}c16", lily=r'''\leftMark #'(moveto 0 1.4 lineto 1.1 0.3) c''2''', played="d4 c12", width=(90, 150)),
]),
]
