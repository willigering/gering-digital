/* DAU TO PRO: Lernmodule öffnen, ohne den AudioContext des NERD FM zu zerstören.
 * Die Startseite samt Player bleibt geladen, das Modul läuft isoliert im gleichnamigen
 * öffentlichen URL-Pfad in einem same-origin iframe. Kein Neuinitialisieren der Musik. */
(() => {
  'use strict';
  const shell = document.querySelector('[data-module-shell]');
  const grid = document.getElementById('module-grid');
  const radio = document.querySelector('[data-nerd-radio]');
  if (!shell || !grid || !radio) return;

  const frame = shell.querySelector('[data-module-frame]');
  const closeButton = shell.querySelector('[data-module-back]');
  const title = shell.querySelector('[data-module-radio-title]');
  const time = shell.querySelector('[data-module-radio-time]');
  const play = shell.querySelector('[data-module-radio-play]');
  const prev = shell.querySelector('[data-module-radio-prev]');
  const next = shell.querySelector('[data-module-radio-next]');
  const volume = shell.querySelector('[data-module-radio-volume]');
  const homeTitle = document.title;
  const allowed = new Map();
  let openedFromHome = false;
  let activeSlug = '';
  let opener = null;
  let clockTimer = 0;

  // Radio-Shell nur bei bereits laufender oder bewusst pausierter Musik.
  // Bei Stopp und vor dem ersten Play bleibt die originale Modulnavigation.
  function needsPersistentRadio() {
    const state = radio.nerdRadio?.state;
    return state === 'playing' || state === 'paused';
  }

  // Nur tatsächlich veröffentlichte, auf der Startseite verlinkte Lernmodule.
  grid.querySelectorAll('a.module-card, a.module-open').forEach(a => {
    const url = new URL(a.href);
    const m = /^\/([a-z0-9][a-z0-9-]{2,59})\/?$/.exec(url.pathname);
    if (url.origin === location.origin && m) {
      allowed.set(m[1], { path: url.pathname, label: a.getAttribute('aria-label') || a.textContent.trim() });
    }
  });

  function slugFromLink(a) {
    if (!a || !a.href) return '';
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return '';
    const m = /^\/([a-z0-9][a-z0-9-]{2,59})\/?$/.exec(url.pathname);
    return m && allowed.has(m[1]) ? m[1] : '';
  }

  function shellUrl(slug) {
    // URL bleibt unter /dau-to-pro/: relative APIs und MP3-URLs müssen gültig bleiben.
    const url = new URL(location.href);
    url.searchParams.set('modul', slug);
    url.hash = '';
    return url.pathname + url.search;
  }

  function overviewUrl() {
    const url = new URL(location.href);
    url.searchParams.delete('modul');
    url.hash = '#lernmodule';
    return url.pathname + url.search + url.hash;
  }

  function updateControls() {
    if (shell.hidden) return;
    const r = radio.nerdRadio;
    const playing = r && r.state === 'playing';
    const track = radio.querySelector('[data-radio-title]');
    title.textContent = track ? track.textContent : 'NERD FM';
    time.textContent = (radio.querySelector('[data-radio-elapsed]')?.textContent || '00:00')
      + ' / ' + (radio.querySelector('[data-radio-length]')?.textContent || '--:--');
    play.textContent = playing ? '❚❚' : '▶';
    play.setAttribute('aria-label', playing ? 'Musik pausieren' : 'Musik abspielen');
    play.setAttribute('title', playing ? 'Pause' : 'Abspielen');
    const actualVolume = radio.querySelector('[data-radio-volume]');
    if (actualVolume && document.activeElement !== volume) volume.value = actualVolume.value;
  }

  function open(slug) {
    const entry = allowed.get(slug);
    if (!entry) return false;
    shell.hidden = false;
    document.body.classList.add('dtp-module-active');
    closeButton.setAttribute('aria-label', 'Zurück zur Modulauswahl');
    shell.setAttribute('aria-label', 'Lernmodul: ' + entry.label);
    document.title = entry.label + ' – DAU TO PRO';
    if (activeSlug !== slug) {
      activeSlug = slug;
      frame.title = entry.label;
      // replace() statt assign(): Der iframe erzeugt keinen zweiten Browser-History-Eintrag.
      frame.contentWindow.location.replace(new URL(entry.path, location.origin).href);
    }
    updateControls();
    if (!clockTimer) clockTimer = setInterval(updateControls, 450);
    closeButton.focus({ preventScroll: true });
    return true;
  }

  function hide() {
    if (shell.hidden) return;
    shell.hidden = true;
    document.body.classList.remove('dtp-module-active');
    document.title = homeTitle;
    activeSlug = '';
    if (clockTimer) { clearInterval(clockTimer); clockTimer = 0; }
    // Das Modul darf beim Verlassen normal pagehide auslösen (Fortschritt speichern).
    frame.contentWindow.location.replace('about:blank');
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    opener = null;
  }

  function leaveModule() {
    // Nur für einen echten, aus der Startseite erzeugten History-Eintrag zurückgehen.
    if (openedFromHome && history.state?.dtpRadioShell) {
      history.back();
    } else {
      history.replaceState(null, '', overviewUrl());
      hide();
    }
  }

  grid.addEventListener('click', event => {
    const link = event.target.closest('a.module-card, a.module-open');
    if (!link || event.defaultPrevented || event.button !== 0 ||
        event.ctrlKey || event.shiftKey || event.altKey || event.metaKey ||
        link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const slug = slugFromLink(link);
    if (!slug || !needsPersistentRadio()) return;
    event.preventDefault();
    opener = link;
    openedFromHome = true;
    history.pushState({ dtpRadioShell: true, slug }, '', shellUrl(slug));
    open(slug);
  });

  closeButton.addEventListener('click', leaveModule);
  shell.querySelector('[data-module-radio-play]').addEventListener('click', () => {
    radio.querySelector('[data-radio-play]')?.click();
    updateControls();
  });
  prev.addEventListener('click', () => { radio.querySelector('[data-radio-prev]')?.click(); updateControls(); });
  next.addEventListener('click', () => { radio.querySelector('[data-radio-next]')?.click(); updateControls(); });
  volume.addEventListener('input', () => {
    const original = radio.querySelector('[data-radio-volume]');
    if (!original) return;
    original.value = volume.value;
    original.dispatchEvent(new Event('input', { bubbles: true }));
  });
  volume.addEventListener('change', () => {
    radio.querySelector('[data-radio-volume]')?.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // Das von sync.js im Modul erzeugte »Zurück zur Modulauswahl« liegt im
  // Shadow DOM von <dtp-back>. composedPath() erkennt auch dessen Link.
  frame.addEventListener('load', () => {
    try {
      const doc = frame.contentDocument;
      if (!doc || frame.contentWindow.location.origin !== location.origin) return;
      // The module injects its own sticky "Modulauswahl" header via sync.js.
      // Inside the persistent module shell, our outer bar already provides
      // this navigation plus NERD FM. Suppress only the redundant inner bar;
      // direct module URLs continue to show their normal navigation.
      if (!doc.getElementById('dtp-shell-single-navigation')) {
        const style = doc.createElement('style');
        style.id = 'dtp-shell-single-navigation';
        style.textContent = 'dtp-back{display:none!important}';
        (doc.head || doc.documentElement).appendChild(style);
      }
      doc.addEventListener('click', event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
            event.shiftKey || event.altKey) return;
        const link = event.composedPath().find(node => node?.tagName === 'A' && node.href);
        if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
        const url = new URL(link.href, frame.contentWindow.location.href);
        if (url.origin !== location.origin) return;
        if (url.pathname.replace(/\/+$/, '/') === '/dau-to-pro/') {
          event.preventDefault();
          leaveModule();
          return;
        }
        const destination = slugFromLink(link);
        if (destination && destination !== activeSlug) {
          event.preventDefault();
          // Innerhalb der Lernansicht direkt wechseln, ohne die Hauptseite zu entladen.
          history.replaceState({ dtpRadioShell: true, slug: destination }, '', shellUrl(destination));
          open(destination);
        }
      }, true);
    } catch (_) { /* Bei nicht einbettbaren URLs bleibt die native Navigation bestehen. */ }
  });

  addEventListener('popstate', () => {
    const slug = new URL(location.href).searchParams.get('modul');
    if (slug && allowed.has(slug)) {
      if (needsPersistentRadio()) open(slug);
      else location.replace(new URL(allowed.get(slug).path, location.origin).href);
    } else {
      hide();
      openedFromHome = false;
    }
  });

  // Direktes Öffnen eines Lesezeichens (?modul=…) funktioniert auch nach Reload.
  const initial = new URL(location.href).searchParams.get('modul');
  if (initial && allowed.has(initial)) {
    // A reloaded module bookmark has no active radio: avoid the extra toolbar.
    if (needsPersistentRadio()) open(initial);
    else location.replace(new URL(allowed.get(initial).path, location.origin).href);
  }
})();
