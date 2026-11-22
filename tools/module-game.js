/* DAU TO PRO Spielmodus: Serie, Rekord und Effekte. Speichert nur den eigenen Rekord, nie Lernstände. */
(function () {
  if (window.dtpGame) return;
  var KEY = 'dtp-game-best-' + (document.documentElement.dataset.gameId || location.pathname);
  var MILESTONES = {3: ['3 am Stück!', 'Das war also kein Zufall.'], 5: ['5ER-SERIE!', 'Wer sitzt da an deinem Platz?'], 10: ['10ER-SERIE!', 'Jetzt wird es unheimlich.'], 15: ['15ER-SERIE!', 'Die Prüfung hat gerade kurz geschluckt.'], 20: ['20ER-SERIE!', 'Ab hier ist es Angeberei. Weiter so.'], 30: ['30ER-SERIE!', 'Bitte einmal melden, wir brauchen dich im Support.']};
  var combo = 0, best = 0, hud, flash, banner;
  try { best = Number(localStorage.getItem(KEY)) || 0; } catch (e) {}
  function ready(fn) { if (document.body) fn(); else document.addEventListener('DOMContentLoaded', fn); }
  function draw() { if (!hud) return; hud.innerHTML = 'SERIE <b>' + combo + '</b> <small>Rekord ' + best + '</small>'; hud.classList.toggle('hot', combo >= 5); }
  function build() { hud = document.createElement('div'); hud.id = 'dtpHud'; hud.setAttribute('aria-hidden', 'true'); flash = document.createElement('div'); flash.id = 'dtpFlash'; document.body.append(hud, flash); draw(); }
  function pulse(cls) { flash.className = ''; void flash.offsetWidth; flash.className = cls; }
  function sparks(host, n) {
    if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
    var r = host.getBoundingClientRect(), x = Math.min(innerWidth - 20, Math.max(20, r.left + r.width / 2)), y = Math.min(innerHeight - 20, Math.max(20, r.top + 30));
    for (var i = 0; i < n; i++) { var s = document.createElement('i'), a = i / n * 6.283, d = 60 + (i % 4) * 28; s.className = 'dtp-spark'; s.style.left = x + 'px'; s.style.top = y + 'px'; s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d + 'px'); document.body.append(s); setTimeout(s.remove.bind(s), 800); }
  }
  function show(title, line) { if (banner) banner.remove(); banner = document.createElement('div'); banner.id = 'dtpBanner'; banner.setAttribute('role', 'status'); banner.textContent = title; var s = document.createElement('small'); s.textContent = line; banner.append(s); document.body.append(banner); setTimeout(function (b) { b.remove(); }.bind(null, banner), 1900); }
  window.dtpGame = Object.freeze({answer: function (ok, host) {
    if (!hud) return;
    if (ok) {
      combo++; pulse('ok'); sparks(host, Math.min(8 + combo * 2, 24));
      var record = combo > best && combo >= 3;
      if (combo > best) { best = combo; try { localStorage.setItem(KEY, String(best)); } catch (e) {} }
      if (MILESTONES[combo]) show(MILESTONES[combo][0], MILESTONES[combo][1]);
      else if (record) show('NEUER REKORD: ' + combo, 'Den alten brauchst du nicht mehr.');
    } else { if (combo >= 3) show('Serie weg: ' + combo, 'Rekord bleibt ' + best + '. Hol ihn dir zurück.'); combo = 0; pulse('no'); }
    draw();
  }});
  ready(build);
})();
