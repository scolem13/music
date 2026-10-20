# Big-band chart symbols (Caniato, Table B.10; Pejrolo & DeRosa; MEI, MusicXML 4.0, Dorico manual), spelt out as notes.
# The real thing slides; the "Played" staff shows the shape at L:1/16. bend = what ▶ plays, on the band's clean electric
# guitar, sliding: notes {t, d (beats), midi, bend: [[beat within the note, semitones], ...]}. Times are by ear, not from a source.
C5 = 72
shake = [[i / 6, 3 if i % 2 else 0] for i in range(13)]
TABLES = [dict(id="jazz-chart", cols=("Name", "In a chart", "Roughly played"), unit="1/16", tempo="1/4=96", sound="clguitar", rows=[
    dict(name="Crushed note", gloss="piano: the minor and major third struck together, the lower let go at once, standing in for a bend",
         sign="{/_E}E4", played="[_EE] E3", note="Komara; Hines, ed. Taylor."),
    dict(name="Fall", gloss="a line falling away after the note: at the release, never before the beat, into silence",
         sign='"^fall"c4 z4', lily=r'''c''4\bendAfter #-4 r4''', played="c3 B/A/ z4", bend=[dict(t=0, d=1, midi=C5, bend=[[0, 0], [0.6, 0], [1, -7]])], width=(90, 130)),
    dict(name="Doit", gloss="the opposite: \"a smear that ascends into infinity after the initial pitch is heard\"",
         sign='"^doit"c4 z4', lily=r'''c''4\bendAfter #+4 r4''', played="c3 d/e/ z4", bend=[dict(t=0, d=1, midi=C5, bend=[[0, 0], [0.6, 0], [1, 5]])], width=(90, 130), note="Pejrolo and DeRosa."),
    dict(name="Scoop", gloss="a curve up into the note: the attack is on the beat but below pitch, sliding up",
         sign='"^scoop"c4', lily=r'''\grace { \hideNotes a'16 \glissando \unHideNotes } c''4''', played="A/B/ c3", bend=[dict(t=0, d=1, midi=C5, bend=[[0, -2], [0.25, 0]])]),
    dict(name="Plop", gloss="a curve down into the note from above", sign='"^plop"c4', lily=r'''\grace { \hideNotes e''16 \glissando \unHideNotes } c''4''', played="e/d/ c3", bend=[dict(t=0, d=1, midi=C5, bend=[[0, 4], [0.25, 0]])]),
    dict(name="Rip", gloss="a fast run up from below, starting before the beat so the top note lands on it",
         sign='"^rip"c4', lily=r'''\grace { \hideNotes g'16 \glissando \unHideNotes } c''4->''', played="(3GAB c4", bend=[dict(t=0, d=1.4, midi=C5, bend=[[0, -7], [0.35, 0]])]),
    dict(name="Bend", gloss="guitar: push the string up a whole step (\"full\"; ½ = a half step), hold, let it back down",
         sign='"^full"c8', lily=r'''c''2^\markup { \concat { \draw-line #'(0 . 1.6) \raise #1.6 \arrow-head #Y #UP ##t } \small "full" }''', played="c2 d4 c2", width=(90, 150), bend=[dict(t=0, d=2, midi=C5, bend=[[0, 0], [0.3, 2], [1.5, 2], [1.9, 0]])]),
    dict(name="Shake", gloss="trumpet: a wide, fast lip trill, \"done solely with the embouchure\"",
         sign='"^shake"c8', lily=r'''\once \override TrillSpanner.bound-details.left.text = ##f c''2\startTrillSpan s16\stopTrillSpan''', played="(3cec (3ece (3cec (3ece", bend=[dict(t=0, d=2, midi=C5, bend=shake)], width=(90, 150), note="Pejrolo and DeRosa; Barnhart."),
    dict(name="Enclosure", gloss="bebop: the notes above and below circle the target, which lands on the beat",
         sign="", played="d2 B2 c4", note="Usually written out in full; a bebop staple (Owens)."),
])]
