/* DTP-HANDY: Einfach-erklärt-Tipps (?) per Fingertipp öffnen und wieder schließen.
   Desktop-Hover bleibt unverändert. Keine Bewertung, kein Speichern. */
(function () {
  'use strict';
  if (window.__dtpMobile) return;
  window.__dtpMobile = true;
  var wasOpen = null;
  document.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse') { wasOpen = null; return; }
    var help = e.target.closest && e.target.closest('.qhelp');
    wasOpen = help && document.activeElement === help ? help : null;
  }, true);
  // Tipp schließen, sobald der Fokus woanders hingeht (z. B. Antippen des Antwortfelds).
  document.addEventListener('focusout', function (e) {
    var help = e.target.closest && e.target.closest('.qhelp');
    if (help && !help.contains(e.relatedTarget)) help.classList.remove('tip-open');
  });
  document.addEventListener('click', function (e) {
    var help = e.target.closest && e.target.closest('.qhelp');
    if (!help) return;
    // Zweiter Tipp auf dasselbe ? schließt den Tipp wieder.
    // Nach den Modul-eigenen Klick-Handlern, die den Tipp teils selbst umschalten.
    if (wasOpen === help) { wasOpen = null; setTimeout(function () { help.classList.remove('tip-open'); help.blur(); }, 0); return; }
    if (document.activeElement !== help && help.tabIndex >= 0) help.focus({preventScroll: true});
    // Tipp ganz zeigen, wenn er unten aus dem Bildschirm ragt.
    var tip = help.querySelector('.qtip');
    if (!tip) return;
    requestAnimationFrame(function () {
      var r = tip.getBoundingClientRect(), over = r.bottom - (window.innerHeight - 12);
      if (r.height && over > 0) {
        var box = help.closest('.dtp-practice-dialog, [role="dialog"]');
        var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
        (box && box.scrollHeight > box.clientHeight ? box : window).scrollBy({top: over, behavior: reduce ? 'auto' : 'smooth'});
      }
    });
  });
})();
