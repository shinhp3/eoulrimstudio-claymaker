(function () {
  var STORAGE_KEY = 'clayStudioTutorialShown';

  var dialog;
  var track;
  var dotsEl;
  var btnPrev;
  var btnNext;
  var btnDismiss;
  var progressEl;
  var slideCount = 0;
  var current = 0;
  var touchStartX = 0;
  var touchDeltaX = 0;

  function getSlides() {
    if (!track) return [];
    return Array.prototype.slice.call(track.querySelectorAll('.studio-tutorial__slide'));
  }

  function updateUI() {
    var slides = getSlides();
    slideCount = slides.length;
    if (!track || !slideCount) return;

    track.style.transform = 'translate3d(' + (-current * 100) + '%, 0, 0)';
    slides.forEach(function (slide, i) {
      slide.setAttribute('aria-hidden', i === current ? 'false' : 'true');
    });

    if (dotsEl) {
      dotsEl.innerHTML = '';
      for (var i = 0; i < slideCount; i++) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'studio-tutorial__dot' + (i === current ? ' studio-tutorial__dot--active' : '');
        dot.setAttribute('aria-label', (i + 1) + '번째 안내');
        dot.dataset.index = String(i);
        dotsEl.appendChild(dot);
      }
    }

    if (btnPrev) btnPrev.disabled = current === 0;
    if (btnNext) btnNext.disabled = false;
    if (progressEl && slideCount) {
      progressEl.textContent = (current + 1) + ' / ' + slideCount;
    }
  }

  function goTo(index) {
    var slides = getSlides();
    if (!slides.length) return;
    current = Math.max(0, Math.min(index, slides.length - 1));
    updateUI();
  }

  function openTutorial() {
    if (!dialog) return;
    current = 0;
    updateUI();
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    }
  }

  function hasSeenTutorial() {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return true;
      if (sessionStorage.getItem(STORAGE_KEY) === '1') return true;
    } catch (e) { /* ignore */ }
    return false;
  }

  function markTutorialSeen() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch (e) { /* ignore */ }
  }

  function closeTutorial() {
    if (!dialog) return;
    if (typeof dialog.close === 'function') {
      dialog.close();
    }
    markTutorialSeen();
  }

  function maybeAutoOpen() {
    if (hasSeenTutorial()) return;
    openTutorial();
  }

  function bindSwipe(viewport) {
    if (!viewport) return;

    viewport.addEventListener('touchstart', function (e) {
      if (!e.touches || !e.touches.length) return;
      touchStartX = e.touches[0].clientX;
      touchDeltaX = 0;
    }, { passive: true });

    viewport.addEventListener('touchmove', function (e) {
      if (!e.touches || !e.touches.length) return;
      touchDeltaX = e.touches[0].clientX - touchStartX;
    }, { passive: true });

    viewport.addEventListener('touchend', function () {
      if (Math.abs(touchDeltaX) < 48) return;
      if (touchDeltaX < 0 && current < slideCount - 1) goTo(current + 1);
      if (touchDeltaX > 0 && current > 0) goTo(current - 1);
      touchDeltaX = 0;
    }, { passive: true });
  }

  function bindHelpButtons() {
    ['btnStudioHelp', 'btnStudioHelpDesk'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          openTutorial();
        });
      }
    });
  }

  function init() {
    dialog = document.getElementById('studioTutorialDialog');
    track = document.getElementById('studioTutorialTrack');
    dotsEl = document.getElementById('studioTutorialDots');
    btnPrev = document.getElementById('studioTutorialPrev');
    btnNext = document.getElementById('studioTutorialNext');
    btnDismiss = document.getElementById('studioTutorialDismiss');
    progressEl = document.getElementById('studioTutorialProgress');

    if (!dialog || !track) return;

    bindHelpButtons();
    bindSwipe(document.getElementById('studioTutorialViewport'));

    if (btnPrev) {
      btnPrev.addEventListener('click', function () { goTo(current - 1); });
    }
    if (btnNext) {
      btnNext.addEventListener('click', function () {
        if (current >= slideCount - 1) closeTutorial();
        else goTo(current + 1);
      });
    }
    if (btnDismiss) {
      btnDismiss.addEventListener('click', closeTutorial);
    }
    if (dotsEl) {
      dotsEl.addEventListener('click', function (e) {
        var btn = e.target.closest('.studio-tutorial__dot');
        if (!btn || btn.dataset.index == null) return;
        goTo(parseInt(btn.dataset.index, 10));
      });
    }

    updateUI();
    maybeAutoOpen();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
