// apps/lsa/self-lsa-notated-app.js — "LSA Practice (Notated)" page controller
// (practice/lsa-practice-notated.qmd). The notation variant: instead of the
// beat-dot/flash cues in self-lsa-app.js, this page shows the target pattern's
// notation live so the student can read what to chant. Results/grading stay
// hidden either way -- only the notation panel is pulled out of the off-screen
// shell into view.
//
// Same real mic-graded engine as apps/lsa/self-lsa-app.js -- see that file's
// header comment for the full design notes (RA_SEQUENCE, Continuous mode, the
// class-pattern interlude after every attempt, session-end-on-final-pass,
// woodblock voices, etc.), which all apply unchanged here.
//
// Requires abcjs-basic.js, rhythms/rhythm-pattern-object.js,
// rhythm-assessment/abc-rhythm.js, lsa/curriculum.js, lsa/notation.js, and
// lsa/self-lsa-sequence.js to already be loaded. Must run BEFORE
// apps/shared/session-log.js and apps/rhythm-assessment/app.js.

window.LSA_PRACTICE_MODE = true;   // suppress SessionLog's floating "Class log" panel

(function () {
  'use strict';

  window.RA_SEQUENCE = window.buildSelfLsaSequence();

  const statusEl = document.getElementById('lsa-practice-status');
  const startBtn = document.getElementById('lsa-practice-start');

  window.RA_ON_CYCLE_START = function () {
    if (statusEl) statusEl.textContent = '🔊 Listen, then perform it back — follow the notation below.';
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
