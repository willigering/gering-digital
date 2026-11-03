/* DAU TO PRO · Einstieg in ein Lernmodul.
 * Zurück zur Lernpfad-Ansicht und zum Seitenanfang, ohne Lernstände zu löschen.
 * Das Skript muss vor dem jeweiligen Modul-Startskript laufen.
 */
(function () {
  'use strict';

  // Keinen alten Scrollstand beim erneuten Öffnen / Browser-Zurück herstellen.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  // Ausschließlich die zuletzt gewählte Ansicht vergessen, niemals Fortschrittsdaten.
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && /^[a-z0-9][a-z0-9-]*-tab-v\d+$/i.test(key)) {
        localStorage.removeItem(key);
      }
    }
  } catch (_) { /* Privater Modus ohne Storage: normales Laden erlauben. */ }

  // Alte Lesezeichen mit #examTop, #trainTop, #ch... öffnen ebenfalls den Lernpfad.
  if (location.hash) {
    try { history.replaceState(history.state, '', location.pathname + location.search); }
    catch (_) { /* Browser ohne History-API */ }
  }

  function toTop() { window.scrollTo(0, 0); }
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
      // BFCache kann alte Tab-, Prüfungs- und Scrollzustände vollständig konservieren.
      // Neu laden, damit die reguläre Initialisierung erneut den Lernpfad öffnet.
      location.reload();
      return;
    }
    toTop();
    requestAnimationFrame(function () {
      toTop();
      requestAnimationFrame(toTop);
    });
  });
})();
