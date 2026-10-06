// apps/lsa/self-lsa-app.js — "LSA Practice" page controller (practice/lsa-practice.qmd).
// The no-notation variant: relies on a visible pulsing beat-dot and a "GO!" flash,
// timed to the exact instant it's the student's turn to perform, instead of
// showing notation. See practice/lsa-practice-notated for the alternative that
// shows notation instead of these cues.
//
// Reuses the REAL mic-based rhythm evaluation tool (apps/rhythm-assessment/app.js)
// so accuracy is genuinely graded -- it's just not shown. That tool's normal DOM
// (notation, results table, timeline, recording controls, etc.) is loaded
// off-screen on this page and driven entirely by this script; only a minimal
// status line, beat-dot, and Start button are visible to the student.
//
// Sequence (built by lsa/self-lsa-sequence.js): RA_SEQUENCE holds just the 6
// individual (graded) patterns, played with no count-in, straight away, exactly
// like the reference Continuous mode on the standalone rhythm assessment page --
// just with woodblock voices (see app.js) instead of the plain metronome click.
// After every attempt (pass or fail), 1-3 class patterns play (fresh random on a
// pass; a single repeat of the last one on a fail) before the next individual
// pattern (pass) or a retry of the same one (fail). The session ends
// automatically right after the very last individual pattern passes.
//
// Requires abcjs-basic.js, rhythms/rhythm-pattern-object.js,
// rhythm-assessment/abc-rhythm.js, lsa/curriculum.js, lsa/notation.js, and
// lsa/self-lsa-sequence.js to already be loaded. Must run BEFORE
// apps/shared/session-log.js and apps/rhythm-assessment/app.js (it sets
// window.LSA_PRACTICE_MODE and window.RA_SEQUENCE, which those scripts read at
// load time), but only actually CALLS into app.js's functions later, from the
// Start button's click handler -- by then app.js has already run and defined them.

window.LSA_PRACTICE_MODE = true;   // suppress SessionLog's floating "Class log" panel

(function () {
  'use strict';

  window.RA_SEQUENCE = window.buildSelfLsaSequence();

  const statusEl = document.getElementById('lsa-practice-status');
  const startBtn = document.getElementById('lsa-practice-start');
  const goEl = document.getElementById('lsa-practice-go');

  window.RA_ON_CYCLE_START = function () {
    if (statusEl) statusEl.textContent = '🔊 Listen to the pattern…';
  };

  // Fires at the exact instant it's the student's turn (the record downbeat).
  window.RA_ON_YOUR_TURN = function () {
    if (statusEl) statusEl.textContent = '🎤 Your turn — perform it back now!';
    if (goEl) {
      goEl.classList.remove('flash');
      void goEl.offsetWidth;   // restart the CSS animation
      goEl.classList.add('flash');
    }
  };

  window.RA_ON_GRADED = function (passed) {
    window.runLsaOutcome(window.RA_SEQUENCE, passed, function () {
      if (statusEl) statusEl.textContent = '🏫 Class pattern — chant along!';
    });
  };

  window.RA_ON_END = function (reason) {
    if (startBtn) startBtn.style.display = 'none';
    if (!statusEl) return;
    statusEl.textContent = reason === 'complete'
      ? '🎉 All done — great work!'
      : 'Session ended.';
  };

  if (startBtn) {
    startBtn.addEventListener('click', function () {
      startBtn.disabled = true;
      startBtn.textContent = 'Starting…';
      if (statusEl) statusEl.textContent = 'Requesting microphone access…';
      // enableMic/running/continuousMode/etc. are top-level bindings defined later
      // by apps/rhythm-assessment/app.js -- safe to reference here because this
      // callback only runs once the user clicks, by which time that script has
      // already executed.
      enableMic().then(function () {
        if (typeof running !== 'undefined' && running) {
          continuousMode = true;
          setContinuousUI();
          startSession();
          runContinuousCycle();
        } else {
          startBtn.disabled = false;
          startBtn.textContent = '▶ Start Practice';
          if (statusEl) statusEl.textContent = 'Could not access the microphone. Please allow mic access and try again.';
        }
      });
    });
  }
})();
