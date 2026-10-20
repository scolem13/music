# Page UI helpers

- Long instruction paragraphs (class `*hint*` / `*-note`, 160+ characters, not `*warn*` / `aria-live`) start folded behind an
  lower-case i in a circle button: `apps/shared/help-eye.js`, in `_includes/head.html`. `data-help-eye="off"` keeps one open.
- Any slider's shown number can be clicked and typed into (`apps/shared/num-edit.js`, in `_includes/head.html`; a slider whose
  number is not its raw value sets `range.numEdit = {get, set}`, as synth-kit does; `data-num-edit="off"` opts out).
