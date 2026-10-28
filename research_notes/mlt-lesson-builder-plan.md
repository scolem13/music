# MLT lesson plan builder

Built 2026-10-28 (`mlt/lesson-builder.qmd`): all four steps below.
- `mins` / `screen` on activities (`activities.js`, set in a pass at the end): Mullen's times where the book gives one
  (Go Mode, Pre-LSA), otherwise estimates by kind (game/movement 5, singing 6, instruments/bridge 8), marked `minsFrom:
  "estimate"` and shown with ~ in the plan. Techniques have no length (they run inside another part). The estimates are
  ours: replace them with the teacher's own times as they are learned.
- Record sheet: `apps/shared/mlt/record-sheet.js` (LSARecord), Mullen pp. 83–84. The seating chart is the roster in
  order, not a room layout. Tests `node tests/mlt/record-sheet.test.js`, `node tests/mlt/lesson-builder.cdp.js`.
Not yet: plans and records shared between devices; the next plan choosing its objective from the record sheet; a room
layout for the seating chart; aptitude scores entered from a test.

## The original plan

Asked for 2026-10-28. Works like the Vocal Warm-up (`tools/vocal-warmup.qmd`, `apps/shared/vocal-warmup.js`): a Set up form
builds a plan, and a Run panel walks through it step by step. Later: the teacher's laptop shows one thing and the class TV
another.

## What it builds from

- The book steps (`apps/shared/mlt/books/*.js`) and the classroom activities database (`apps/shared/mlt/activities.js`).
  Each step already has a phase (First Whole / Part (LSA) / Second Whole / bridge), a student activity and linked activities.
- Add to each activity: `mins` (a typical length) and, where it makes sense, `screen` (what the class TV shows: a song's
  notation, the pattern player, a prompt in large type, a timer).

## Set up form

- Book and unit (or "where we are": skill level + tonality/meter, matched to steps by their tags).
- Class length, how many minutes of LSA (Mullen: about five; Go Mode three minutes).
- The plan it proposes, following Mullen's Whole-Part-Whole: First Whole activity (song or acculturation), the LSA
  (Pre-LSA + Go Mode, alternating tonal and rhythm objectives from the last plan), Second Whole activities that
  reinforce the previous objective, an optional bridge. Each slot can be swapped for another activity of the same phase,
  skill and content.
- Saved plans: in the browser first; later a shared store (artifact `db` or the site's own) so plans move between devices.

## Run panel

- One step at a time with a timer; the teacher sees the book summary, page citations, the procedure, and notes.
- The pattern players (tonal/rhythm echo, readers) run inside the step.
- LSA record sheet: the class list with teaching-mode | / evaluation-mode + marks (Mullen p. 83), kept per class.

## Two screens (later)

- The Run panel opens a second window (`window.open`) for the TV; the two talk over `BroadcastChannel`, so no server is
  needed when both are on the same laptop (extended display).
- The TV window shows only the student view of the current step (`?view=student` already exists): the song, the
  notation being read, the prompt, a big timer. The laptop keeps the teacher view, next-step preview and the record sheet.
- Two devices (teacher phone, room computer) would need a relay; leave until asked.

## Order of work

1. `mins` and `screen` on activities; a `plan.js` that assembles a plan from a unit's steps.
2. Set up form + Run panel (one screen), with section folding and the right jump bar.
3. The record sheet.
4. Second-screen window over BroadcastChannel.
