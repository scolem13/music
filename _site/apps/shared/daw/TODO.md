# DAW to-do (plan agreed 2026-11-10)

## Vim-style velocity editing (grammar: [count] operator motion; design text in lessons/daw-mixer.qmd "A keyboard flow for velocity")
- [x] **Step 1** (2026-11-10): note mode (Enter on a clip, Esc leaves), motions h j k l w b e ( ) { } 0 $, text objects iw ic ih ib ip iv, operators `>` `<` `gU` `gu` (doubling = this chord), `r1`-`r8` dynamics, counts (before the operator = how much, after = how far), `.` repeat, `u` / Ctrl-r.
- [ ] **Step 2**: registers: `"ayib` yanks a velocity pattern (matched by position within the bar), `3"ap` puts it; `gq` straightens a range into a ramp (first to last); Ctrl-a / Ctrl-x add / take 1 (count multiplies).
- [ ] **Step 3**: Visual mode (`v` notes, `V` chords, Ctrl-v time x pitch block on the drum grid; every operator works on the selection; `o` swaps ends; `g Ctrl-a` adds 1, 2, 3 ... down the selection = crescendo).
- [ ] **Step 4**: macros (`qa` ... `q`, `@a`, `8@a`; resolve the clash with `q` = Quantize), and the `:` command line with ranges (`:%vel mf`, `:'<,'>vel 40-100`, `:vel 64`).
- [ ] Decide: `Enter` opens note mode, so "back to the start" moves to Home (done in step 1); marks (`ma`, `'a`) and `/v<40` search are stretch ideas.

## Automation
- [ ] Pan (CC 10) and other controllers as `auto.<name>` lanes with a parameter list in the lane.
- [ ] Clip-level lanes (Live clip-envelope style), curves between points, copying points with clips.
- [ ] Test the exported CC 7 in real Ableton Live and Logic (what lane does it land on?) and write down what happens; the lesson says "unverified" until then.

## Velocity
- [ ] Velocity lane keyboard flow reaches the arrangement's drum grid (step 3 block selection).

## Microtonality (31-EDO) (assessed 2026-11-10, not started)
- [ ] `p.edo` (12 default; 19, 24, 31, 53); fractional MIDI numbers already repitch in `BandSounds.play` (sampler: playbackRate from `spec.midi - z.midi`; organ: frequency formula): listen to confirm.
- [ ] Piano roll rows by step, labels, black-key shading; computer-keyboard layout for 31 steps; transpose / quantize by step.
- [ ] Export: pitch bend per note on its own channel (MPE-like) and/or Scala .scl; read pitch bend back in `fromMidi`. Check what Live 12 and Logic do (unverified).
- [ ] The band's session players, chord names, the Session roots row stay 12-TET.

## Session view (see CLAUDE.md in this folder)
- [ ] Audio clips in the grid, dragging clips between slots, follow actions, ii / vi in the root-clicking, export scenes.
