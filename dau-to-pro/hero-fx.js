/* DAU TO PRO · Hero-Effekte. */
(() => {
  'use strict';
  const wrap = document.querySelector('.hero-art-wrap[data-fx]');
  const img = wrap && wrap.querySelector('.hero-logo');
  if (!wrap || !img) return;
  // Position des Pixelpilzes in der Hero-Grafik (Pixel der Originaldatei), vom Server übergeben.
  const [artW, artH] = (wrap.dataset.fxArt || '1448x1086').split('x').map(Number);
  const [boxX, boxY, boxW, boxH] = (wrap.dataset.fxBox || '1214,522,191,174').split(',').map(Number);
  const ART = { w: artW, h: artH }, BOX = { x: boxX, y: boxY, w: boxW, h: boxH };
  const CLICKS = 5, WINDOW_MS = 6000;
  const HUES = [0, 115, 205, 280, 40];          // rot → grün → blau → lila → gold
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const videoSrc = wrap.dataset.fxVideo || '';

  // Goldener Pixelblitz als Bitmap (10 × 14), jedes # wird ein Pixel.
  const BOLT = ['......####', '.....####.', '....####..', '...####...', '..####....', '.########.', '########..',
    '....###...', '...###....', '..###.....', '..##......', '.##.......', '.#........', '#.........']
    .map((row, y) => [...row].map((c, x) => c === '#' ? `M${x} ${y}h1v1h-1z` : '').join('')).join('');
  const el = (tag, cls, parent) => { const n = document.createElement(tag); if (cls) n.className = cls; if (parent) parent.appendChild(n); return n; };
  const layer = el('div', 'fx-layer', wrap);
  const body = el('div', 'fx-shroom', layer);
  const pic = el('img', 'fx-shroom-img', body);
  pic.src = wrap.dataset.fx; pic.alt = ''; pic.decoding = 'async'; pic.draggable = false;
  const hit = el('button', 'fx-shroom-hit', body);
  hit.type = 'button';
  hit.setAttribute('aria-label', 'Pixelpilz');
  const counter = el('span', 'fx-count', layer);
  counter.setAttribute('aria-hidden', 'true');
  const live = el('span', 'sr-only', layer);
  live.setAttribute('aria-live', 'polite');

  let count = 0, firstAt = 0, resetTimer = 0, busy = false, video = null, lastFocus = null;

  function place() {
    const r = img.getBoundingClientRect(), w = wrap.getBoundingClientRect();
    if (!r.width) return;
    const sx = r.width / ART.w, sy = r.height / ART.h;
    Object.assign(layer.style, {
      left: (r.left - w.left + BOX.x * sx) + 'px', top: (r.top - w.top + BOX.y * sy) + 'px',
      width: (BOX.w * sx) + 'px', height: (BOX.h * sy) + 'px'
    });
  }
  place();
  if ('ResizeObserver' in window) new ResizeObserver(place).observe(img); else addEventListener('resize', place);
  img.addEventListener('load', place);

  const scaleFor = n => 1 + n * 0.09;
  function setLook(n) {
    body.style.setProperty('--fx-scale', scaleFor(n));
    body.style.setProperty('--fx-hue', HUES[Math.min(n, HUES.length - 1)] + 'deg');
    body.style.setProperty('--fx-glow', String(n / CLICKS));
  }

  function pop(n) {
    const i = n / (CLICKS - 1);                   // 0.25 … 1: wird mit jedem Klick wilder
    if (!reduce.matches) {
      const s = scaleFor(n), squash = 0.1 + 0.22 * i, lift = 10 + 34 * i, tilt = 4 + 14 * i;
      body.animate([
        { transform: `translateY(0) scale(${scaleFor(n - 1)})` },
        { transform: `translateY(0) scale(${s * (1 + squash)}, ${s * (1 - squash)})`, offset: 0.16 },
        { transform: `translateY(-${lift}%) scale(${s * (1 - squash * 0.6)}, ${s * (1 + squash * 0.8)}) rotate(${tilt}deg)`, offset: 0.42 },
        { transform: `translateY(0) scale(${s * (1 + squash * 0.5)}, ${s * (1 - squash * 0.5)}) rotate(${-tilt * 0.5}deg)`, offset: 0.7 },
        { transform: `translateY(0) scale(${s})` }
      ], { duration: 520 + 160 * i, easing: 'cubic-bezier(.2,.8,.3,1)' });
      burst(6 + n * 5, 0.5 + i);
      if (n >= 3) wrap.animate([
        { transform: 'translate(0,0)' }, { transform: `translate(${-3 * i}px,${2 * i}px)` },
        { transform: `translate(${4 * i}px,${-2 * i}px)` }, { transform: `translate(${-2 * i}px,${1 * i}px)` }, { transform: 'translate(0,0)' }
      ], { duration: 260 + 80 * i });
    }
    counter.textContent = n + 'x';
    counter.style.setProperty('--fx-size', (1 + 0.28 * n).toFixed(2));
    counter.style.setProperty('--fx-lift', ((scaleFor(n) - 1) * 50).toFixed(1) + '%');
    counter.classList.remove('is-on'); void counter.offsetWidth; counter.classList.add('is-on');
  }

  function burst(amount, power) {
    const colors = ['#ffd84d', '#ff4d3d', '#ffffff', '#00dce8', '#ffb02e'];
    for (let k = 0; k < amount; k++) {
      const p = el('i', 'fx-pixel', layer);
      const angle = Math.random() * Math.PI * 2, dist = (40 + Math.random() * 70) * power;
      p.style.background = colors[k % colors.length];
      p.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist - 20 * power}px)) scale(.3)`, opacity: 0 }
      ], { duration: 520 + Math.random() * 420, easing: 'cubic-bezier(.15,.7,.35,1)' }).onfinish = () => p.remove();
    }
  }

  function reset(smooth) {
    clearTimeout(resetTimer);
    count = 0; firstAt = 0;
    counter.classList.remove('is-on');
    body.classList.toggle('is-calm', !!smooth);
    setLook(0);
    layer.classList.remove('is-active');
    hit.removeAttribute('aria-describedby');
  }

  function levelUp() {
    busy = true;
    clearTimeout(resetTimer);
    live.textContent = 'Easter Egg entdeckt!';
    const flash = el('div', 'fx-levelup', document.body);
    flash.setAttribute('aria-hidden', 'true');
    // Kompakte Belohnung statt eines langen, bildschirmfüllenden Blitzes.
    // Der Film und die echte XP-/Achievement-Meldung bleiben davon unabhängig.
    flash.innerHTML = '<div class="fx-levelup-card"><span class="fx-levelup-icon"><svg class="fx-bolt" viewBox="-1 -1 12 16" shape-rendering="crispEdges" aria-hidden="true"><path d="' + BOLT + '"/></svg></span><span class="fx-levelup-copy"><span class="fx-levelup-kicker">EASTER EGG ENTDECKT</span><b>LEVEL UP!</b></span></div>';
    const r = layer.getBoundingClientRect();
    flash.style.setProperty('--fx-x', (r.left + r.width / 2) + 'px');
    flash.style.setProperty('--fx-y', (r.top + r.height / 2) + 'px');
    if (!reduce.matches) burst(18, 1.2);
    setTimeout(() => {
      flash.classList.add('is-out');
      setTimeout(() => flash.remove(), reduce.matches ? 0 : 180);
      reset(true);
      busy = false;
      openVideo();
    }, reduce.matches ? 450 : 900);
  }

  hit.addEventListener('click', () => {
    if (busy) return;
    const now = Date.now();
    if (!count || now - firstAt > WINDOW_MS) { reset(false); firstAt = now; }
    count += 1;
    layer.classList.add('is-active');
    body.classList.remove('is-calm');
    setLook(count);
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => reset(true), Math.max(0, firstAt + WINDOW_MS - now));
    if (count === 3 && videoSrc) prepareVideo();
    if (count >= CLICKS) { counter.classList.remove('is-on'); levelUp(); return; }
    pop(count);
  });

  // ---------------------------------------------------------------- Video
  const overlay = el('div', 'fx-video', document.body);
  overlay.hidden = true;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Level up');
  const stage = el('div', 'fx-video-stage', overlay);
  const close = el('button', 'fx-video-close', overlay);
  close.type = 'button'; close.setAttribute('aria-label', 'Schließen'); close.textContent = '×';
  const sound = el('button', 'fx-video-sound', overlay);
  sound.type = 'button'; sound.textContent = '🔊 Ton an'; sound.hidden = true;
  // XP gibt es nur mit Lernkonto: dann meldet das Video das versteckte Achievement an den Server.
  // Nach dem Video erscheint das normale Achievement-Popup (achievement-toast.js) mit Ton, kein eigenes Fenster.
  const eggApi = wrap.dataset.fxEgg || '';
  let eggSent = false, eggResult = null, toastDue = false;
  function reportEgg() {
    if (!eggApi || eggSent || !window.fetch) return;
    eggSent = true;
    fetch(eggApi, { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'X-DTP-CSRF': wrap.dataset.fxCsrf || '' } })
      .then(r => r.json()).then(j => { eggResult = j || {}; if (toastDue) celebrate(); })
      .catch(() => { eggSent = false; eggResult = {}; if (toastDue) celebrate(); });
  }
  function celebrate() {
    toastDue = false;
    const toast = window.dtpAchievementToast;
    if (!toast) return;
    const r = eggResult || {};
    if (r.ok && r.new) toast.celebrate(r);
  }
  function queueToast() {
    if (eggApi && eggSent && !eggResult) { toastDue = true; return; }   // Antwort kommt gleich
    celebrate();
  }
  let phase = 'closed', endTimer = 0;

  function prepareVideo() {
    if (video || !videoSrc) return;
    video = el('video', 'fx-video-player', stage);
    video.preload = 'auto';
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.src = videoSrc;
    video.addEventListener('ended', finish);
    video.addEventListener('error', () => { video.remove(); video = null; if (phase === 'video') finish(); });
  }
  function openVideo() {
    reportEgg();
    lastFocus = document.activeElement;
    overlay.hidden = false;
    document.documentElement.classList.add('fx-locked');
    requestAnimationFrame(() => overlay.classList.add('is-open'));
    close.focus({ preventScroll: true });
    if (videoSrc) prepareVideo();
    if (!video) { phase = 'video'; finish(); return; }   // keine Videodatei: kein kaputter Player
    phase = 'video';
    video.currentTime = 0;
    video.muted = false;
    const started = video.play();
    if (started && started.catch) started.catch(() => {
      // Browser erlaubt keinen Ton: stumm starten und Ton per Knopf anbieten.
      video.muted = true; sound.hidden = false;
      video.play().catch(() => finish());
    });
  }
  sound.addEventListener('click', () => { if (video) { video.muted = false; video.play(); } sound.hidden = true; });
  // Video zu Ende (oder übersprungen): Overlay schließen, dann das Achievement-Popup zeigen.
  function finish() {
    if (phase === 'closed' || overlay.hidden) return;
    closeVideo();
    queueToast();
  }
  function closeVideo() {
    clearTimeout(endTimer);
    if (overlay.hidden) return;
    phase = 'closed';
    if (video) video.pause();
    overlay.classList.remove('is-open');
    document.documentElement.classList.remove('fx-locked');
    setTimeout(() => { overlay.hidden = true; }, reduce.matches ? 0 : 450);
    (lastFocus && lastFocus.focus ? lastFocus : hit).focus({ preventScroll: true });
  }
  close.addEventListener('click', () => (phase === 'video' ? finish() : closeVideo()));
  document.addEventListener('keydown', e => {
    if (overlay.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); phase === 'video' ? finish() : closeVideo(); }
    if (e.key === 'Tab') { // Fokus im Overlay halten
      const items = [close, sound].filter(b => !b.hidden);
      const i = items.indexOf(document.activeElement);
      e.preventDefault();
      items[(i + (e.shiftKey ? items.length - 1 : 1)) % items.length].focus();
    }
  });

  window.__dtpFx = { state: () => ({ count, busy, phase, video: !!video }) };
})();


