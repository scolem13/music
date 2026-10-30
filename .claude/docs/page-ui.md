# Page UI helpers

- Long instruction paragraphs (class `*hint*` / `*-note`, 160+ characters, not `*warn*` / `aria-live`) start folded behind an
  lower-case i in a circle button: `apps/shared/help-eye.js`, in `_includes/head.html`. `data-help-eye="off"` keeps one open. Only plain text folds: an element holding an svg, button, input or staff never does (the blues kit's `.bl-notes` scales used to vanish).
- Works Cited (`.works-cited`, from `scripts/works-cited.py`) starts folded and is moved to the end of the page and of the TOC: `apps/shared/works-cited-fold.js`, in `_includes/head.html`; `sections.js` skips it.
- Any slider's shown number can be clicked and typed into (`apps/shared/num-edit.js`, in `_includes/head.html`; a slider whose
  number is not its raw value sets `range.numEdit = {get, set}`, as synth-kit does; `data-num-edit="off"` opts out).
- Sidebars (`_includes/sidebar-toggle.html`, grids in `custom.css` "Sidebars"): the left (site menu) and right ("On this page" and page
  tools) each fold from their own navbar button, remembered (`site-nav`, `site-margin`); a side with nothing in it is not shown and gets
  no button (`body.no-left-sidebar` / `no-right-sidebar`; the right is watched, so a tool that adds to it later brings it back).
- Figures in page text (`apps/shared/fig-stack.js`, in `_includes/head.html`): I⁶₄-style superscript + subscript pairs are drawn stacked
  in HTML (SVG scores stack their own in analysed-scores.js); `FigStack.figs(text)` turns written figures (IM65, Cad64, V6/5) into those
  characters first (used by the drills' text prompts and explanations and the score library's readings). `data-fig-stack="off"` opts out.
