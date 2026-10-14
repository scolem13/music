// session-nav.js — injected into every page via head.html.
// Sets window.TOOL_CONFIG from URL params and, when a multi-step session
// is active, injects a sticky navigation banner after the site navbar.
//
// URL modes:
//   ?tc=<b64json>                single-tool config, no banner
//   ?steps=<b64json>&step=<n>   full session navigation (URL-encoded, no server needed)
(function () {
  'use strict';
  const QS = new URLSearchParams(window.location.search);

  // ── single-tool config (?tc=) ────────────────────────────────────────────
  const tc = QS.get('tc');
  if (tc && !window.TOOL_CONFIG) {
    try { window.TOOL_CONFIG = JSON.parse(atob(tc)); } catch (e) {}
  }

  // ── session navigation (?steps=) ────────────────────────────────────────
  const stepsEnc = QS.get('steps');
  const stepIdx  = parseInt(QS.get('step') || '0', 10);
  if (!stepsEnc) return;

  let steps = null;
  try { steps = JSON.parse(atob(stepsEnc)); } catch (e) {}
  if (!Array.isArray(steps) || !steps.length) return;

  const currentStep = steps[stepIdx] || null;
  if (currentStep && currentStep.config && !window.TOOL_CONFIG)
    window.TOOL_CONFIG = currentStep.config;

  function stepUrl(i) {
    const s = steps[i];
    if (!s) return null;
    return '/practice/' + s.tool + '.html?' +
      new URLSearchParams({ steps: stepsEnc, step: String(i) });
  }

  document.addEventListener('DOMContentLoaded', function () {
    const isLast = stepIdx === steps.length - 1;

    const bar = document.createElement('div');
    bar.id = 'session-nav-bar';

    function snbEl(tag, cls, text) {
      const e = document.createElement(tag);
      if (cls)  e.className = cls;
      if (text) e.textContent = text;
      return e;
    }
    function snbBtn(text, href) {
      const a = document.createElement('a');
      a.className = 'snb-btn';
      a.textContent = text;
      a.href = href;
      return a;
    }

    bar.appendChild(snbEl('span', 'snb-counter',
      'Step ' + (stepIdx + 1) + ' / ' + steps.length));
    bar.appendChild(snbEl('b', 'snb-label',
      currentStep ? (currentStep.label || currentStep.tool) : ''));
    if (stepIdx > 0)
      bar.appendChild(snbBtn('← Prev', stepUrl(stepIdx - 1)));
    if (!isLast)
      bar.appendChild(snbBtn('Next →', stepUrl(stepIdx + 1)));
    else
      bar.appendChild(snbBtn('Finish ✓',
        '/practice/session.html?' + new URLSearchParams({ steps: stepsEnc, done: '1' })));

    // Insert immediately after the navbar, falling back to top of body
    const anchor = document.getElementById('quarto-header')
      || document.querySelector('.navbar')
      || document.getElementById('auth-bar');
    if (anchor) anchor.insertAdjacentElement('afterend', bar);
    else        document.body.prepend(bar);
  });
})();
