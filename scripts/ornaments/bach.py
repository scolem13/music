# J. S. Bach, Explication unterschiedlicher Zeichen (Clavier-Büchlein vor Wilhelm Friedemann Bach, 1720), on C.
# Note values read from the manuscript (Yale Music Deposit 31, leaf 3v, IIIF image 10991088), checked 18 Oct 2026.
TABLES = [dict(id="bach-explication", cols=("Bach's name", "Sign", "Played"), rows=[
    dict(name="Trillo", gloss="trill", sign="!uppermordent!c8", played="dcdcd c3/2", note="Bach's values: five 32nds and a dotted 32nd, short of the quarter; the trill fills the note."),
    dict(name="Mordant", gloss="mordent", sign="!mordent!c8", played="cB c3/2", note="Written as two 32nds and a dotted 32nd; the main note is then held."),
    dict(name="Trillo und Mordant", gloss="trill ending with a mordent", sign="!trill!c8", lily=r'''c''4\prallmordent''', played="dcdcdcBc"),
    dict(name="Cadence", gloss="turn", sign="!turn!c8", played="dcBc", note="Four 32nds, as Bach wrote them."),
    dict(name="Doppelt-Cadence", gloss="trill from the note below", sign="!trill!c8", lily=r'''c''4\upprall''', played="Bcdcdcdc"),
    dict(name="Idem", gloss="trill from a turn above", sign="!trill!c8", lily=r'''c''4\downprall''', played="dcBcdcdc"),
    dict(name="Doppelt-Cadence und Mordant", gloss="from below, ending with a mordent", sign="!trill!c8", lily=r'''c''4\upmordent''', played="BcdcdcBc"),
    dict(name="Idem", gloss="from a turn above, on a dotted note, ending with a mordent", sign="!trill!c12", lily=r'''c''4.\downmordent''', played="dcBcdcdcdcBc"),
    dict(name="Accent steigend", gloss="appoggiatura from below", sign="{B}c8", lily=r'''\leftMark #'(moveto 0.55 -0.05 curveto 0 -0.05 0 -0.95 0.55 -0.95) c''4''', played="B4c4"),
    dict(name="Accent fallend", gloss="appoggiatura from above", sign="{d}c8", lily=r'''\leftMark #'(moveto 0.55 0.95 curveto 0 0.95 0 0.05 0.55 0.05) c''4''', played="d4c4"),
    dict(name="Accent und Mordant", gloss="appoggiatura from below, then a mordent", sign="{B}!mordent!c8", lily=r'''\leftMark #'(moveto 0.55 -0.05 curveto 0 -0.05 0 -0.95 0.55 -0.95) c''4\mordent''', played="B4 cB c4", note="B and the last c share an eighth beam, so Bach's values add up to more than a quarter."),
    dict(name="Accent und Trillo", gloss="appoggiatura from above, then a trill", sign="{d}!uppermordent!c8", lily=r'''\leftMark #'(moveto 0.55 0.95 curveto 0 0.95 0 0.05 0.55 0.05) c''4\prall''', played="d4 cdcd c4", note="As in 11, the values add up to more than a quarter."),
    dict(name="Idem", gloss="the same, with a stroke dropping into the wave instead of the hook", sign="!uppermordent!c8", lily=r'''c''4\lineprall''', played="d4 cdcd c4"),
])]
