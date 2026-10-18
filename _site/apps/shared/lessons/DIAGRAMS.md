# Lesson diagrams: the house style

Read from the drawings already on the site (`diagrams.js`, `hands.js`, `drumkit.js`, `rec-kit-mic.js`) and kept
by every new one (`gear-diagrams.js` follows it).

1. **Schematic, not photographic.** Flat shapes, one ink stroke (`--site-ink`, 2 px, round joins), fills from
   `--site-surface` / `--site-surface-2`. No gradients, shadows or perspective; an end-on face or a side view, never 3/4.
2. **Site tokens, not hex.** Ink, surfaces, borders and accent come from `custom.css` (`--site-*`). A colour that
   means something gets a named token of its own (below), defined once.
3. **Colour means one thing everywhere.** Chord colours (`LessonDiagrams.COLORS`) mean "which chord". For gear:
   | token        | means                                   |
   |--------------|-----------------------------------------|
   | `--gd-hot`   | signal, hot (+), tip, left               |
   | `--gd-cold`  | cold (−, the flipped copy), ring, right  |
   | `--gd-gnd`   | ground, shield, sleeve, earth            |
   | `--gd-power` | mains / DC power                        |
   | `--gd-data`  | control data (MIDI, USB)                 |
   | `--site-accent` | "look here": the one thing the caption is about |
   Anything without a role stays ink and surface.
4. **Labels on the drawing,** mono font (`--font-mono`), next to the part: pin numbers, T / R / S, piece names.
   No separate legend to look things up in.
5. **Every part that has a name has a `<title>`** (hover tooltip, read by screen readers), and the svg has
   `role="img"` and an `aria-label` saying what the whole picture shows.
6. **Placed by a tag, drawn by a script.** A page writes `<div class="gear-fig" data-fig="...">` (or calls a
   `LessonDiagrams.*` function); no SVG is pasted into a `.qmd`. A fix in the script fixes every page.
7. **One fact per drawing,** with a one-line caption under it (`data-caption` overrides). Several facts → several
   figures in a row (`.gear-row`, `.hand-row`) that wrap on a phone.
8. **Readable at phone width.** Design in a viewBox about as wide as it will be shown (cards ~150-200, wide figures
   ≤ 480); text no smaller than 11 units. A wide chain wraps into rows rather than shrinking.
9. **Doing something is a bonus.** Click to play (drum kit), drag (bend), hover to name. A still picture that is
   right beats a moving one that is vague.
10. **Facts checked.** Pin numbers, wiring and orders come from a standard or a manual; say which in a comment
    beside the data.
