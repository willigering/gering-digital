/* NERD FM Mini-Player: setzt die auf der Startseite gestartete Musik in Modulen und Spickzetteln fort.
   Übergabe über localStorage 'dtp-nerd-radio-resume' = {id, t, playing, handoff, at}.
   Das Radio schreibt den Stand beim Verlassen der Seite (handoff), der Mini-Player übernimmt ihn genau einmal. */
(() => {
  'use strict';
  const KEY = 'dtp-nerd-radio-resume';
  const MAX_AGE = 30 * 60 * 1000;   // ältere Stände gelten als vergessen
  const script = document.currentScript;
  const api = (window.__DTP_MINI__ && window.__DTP_MINI__.api) || (script && script.dataset.api) || '';
  if (!api || window.top !== window || window.__dtpMini) return;
  window.__dtpMini = true;

  const read = () => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!s || typeof s.id !== 'string' || !Number.isFinite(s.t) || Date.now() - s.at > MAX_AGE) return null;
      return s;
    } catch (_) { return null; }
  };
  const write = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) { /* Player läuft trotzdem */ } };
  const clear = () => { try { localStorage.removeItem(KEY); } catch (_) { /* ignorieren */ } };

  const start = read();
  if (!start || !start.handoff) return;   // ohne Übergabe spielt woanders (anderer Tab) oder nichts

  let list = [], index = -1, audio = null, ui = null, wantPlay = start.playing, lastSave = 0, leaving = false, shownAt = 0, loaded = Promise.resolve();

  const volume = () => {
    try { const v = Number(localStorage.getItem('dtp-nerd-radio-volume')); if (Number.isFinite(v) && v >= 0 && v <= 1) return v; } catch (_) { /* Standard */ }
    return 0.35;
  };
  const urlOf = src => new URL(src, new URL('../', new URL(api, document.baseURI))).href;
  const clock = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  function snapshot(handoff) {
    if (!audio || index < 0 || (leaving && !handoff)) return;   // nach pagehide darf nichts die Übergabe überschreiben
    write({ id: list[index].id, t: audio.currentTime || 0, playing: !audio.paused, handoff: !!handoff, at: Date.now() });
  }

  function build() {
    const box = document.createElement('div');
    box.className = 'dtp-mini';
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'NERD FM Mini-Player');
    box.innerHTML =
      '<span class="dtp-mini__note" aria-hidden="true">♪</span>' +
      '<span class="dtp-mini__info"><span class="dtp-mini__label">NERD FM</span><span class="dtp-mini__title" data-mini-title></span></span>' +
      '<span class="dtp-mini__time" data-mini-time>00:00</span>' +
      '<button type="button" class="dtp-mini__btn dtp-mini__btn--main" data-mini-toggle aria-label="Abspielen">▶</button>' +
      '<button type="button" class="dtp-mini__btn" data-mini-next aria-label="Nächster Titel">⏭</button>' +
      '<button type="button" class="dtp-mini__btn" data-mini-stop aria-label="Musik beenden">✕</button>';
    document.body.appendChild(box);
    ui = {
      box, title: box.querySelector('[data-mini-title]'), time: box.querySelector('[data-mini-time]'),
      toggle: box.querySelector('[data-mini-toggle]'), next: box.querySelector('[data-mini-next]'), stop: box.querySelector('[data-mini-stop]')
    };
    ui.toggle.addEventListener('click', () => { if (audio.paused) go(); else audio.pause(); });
    ui.next.addEventListener('click', () => choose(1, !audio.paused || wantPlay));
    ui.stop.addEventListener('click', () => { index = -1; audio.pause(); audio.removeAttribute('src'); clear(); ui.box.remove(); window.__dtpMini = false; });
  }

  function paint() {
    if (!ui) return;
    ui.title.textContent = list[index] ? list[index].title : '';
    ui.time.textContent = clock(audio.currentTime || shownAt);
    const playing = !audio.paused;
    ui.toggle.textContent = playing ? '❚❚' : '▶';
    ui.toggle.setAttribute('aria-label', playing ? 'Pause' : 'Abspielen');
    ui.box.classList.toggle('is-playing', playing);
    ui.box.classList.toggle('is-waiting', !playing && wantPlay);   // Browser hat Autoplay gesperrt: Play bitte einmal klicken
  }

  function go() {
    wantPlay = true;
    return loaded.then(() => audio.play()).catch(() => { /* Autoplay gesperrt oder Titel nicht ladbar: Knopf bleibt sichtbar */ }).finally(paint);
  }

  function load(i, at) {
    index = i;
    shownAt = at;   // bis die Metadaten da sind, zeigt die Uhr schon die übernommene Position
    audio.src = urlOf(list[i].src);
    // Erst nach den Metadaten spulen und erst danach abspielen, sonst beginnt der Titel kurz bei 0:00.
    loaded = new Promise(resolve => {
      audio.addEventListener('loadedmetadata', () => {
        try { if (at > 0) audio.currentTime = at; } catch (_) { /* nicht spulbar */ }
        resolve();
      }, { once: true });
      audio.addEventListener('error', resolve, { once: true });
    });
    if (at > 0) {   // Notfalls noch einmal, falls der Bereich erst jetzt spulbar ist
      audio.addEventListener('canplay', () => { try { if (Math.abs(audio.currentTime - at) > 1 && audio.currentTime < 1) audio.currentTime = at; } catch (_) { /* nicht spulbar */ } }, { once: true });
    }
    paint();
  }

  // Nächster Titel der aktiven Playlist, zyklisch.
  function choose(dir, play) {
    load(((index + dir) % list.length + list.length) % list.length, 0);
    wantPlay = play;
    if (play) go();
  }

  function init(tracks) {
    list = tracks;
    if (!list.length) return;
    let i = list.findIndex(t => t.id === start.id);
    const known = i >= 0;
    if (!known) i = 0;   // Titel inzwischen abgewählt: mit dem ersten aktiven weitermachen
    audio = new Audio();
    audio.preload = 'auto';
    audio.volume = volume();
    build();
    audio.addEventListener('timeupdate', () => {
      if (ui) ui.time.textContent = clock(audio.currentTime || shownAt);
      if (Date.now() - lastSave > 1000) { lastSave = Date.now(); snapshot(false); }
    });
    audio.addEventListener('play', () => { paint(); snapshot(false); });
    audio.addEventListener('pause', () => { wantPlay = false; paint(); snapshot(false); });
    audio.addEventListener('ended', () => choose(1, true));
    audio.addEventListener('error', () => { if (audio.getAttribute('src')) { wantPlay = false; ui.title.textContent = 'Datei nicht abspielbar'; paint(); } });
    load(i, known ? start.t : 0);
    // Übergabe ist erledigt: Stand ohne handoff ablegen (sonst übernähme ihn ein zweiter Tab noch einmal).
    write({ id: list[i].id, t: known ? start.t : 0, playing: start.playing, handoff: false, at: Date.now() });
    if (start.playing) go();
    addEventListener('pagehide', () => { snapshot(true); leaving = true; });
    addEventListener('pageshow', e => { if (e.persisted) { leaving = false; snapshot(false); if (wantPlay) go(); } });
  }

  fetch(api, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
    .then(r => (r.ok ? r.json() : null))
    .then(d => { if (d && d.ok && Array.isArray(d.tracks)) init(d.tracks.filter(t => t && typeof t.src === 'string' && typeof t.id === 'string')); })
    .catch(() => { /* ohne Liste bleibt es still */ });
})();
