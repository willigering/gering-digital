(() => {
  // Reinitialize the rail after server-rendered highscore updates.
  function initRail(root) {
    if (!root || root.dataset.arcadeReady === '1') return;
    const rail = root.querySelector('.arcade-rail');
    const prev = root.querySelector('.arcade-prev');
    const next = root.querySelector('.arcade-next');
    const bar = root.querySelector('.arcade-progress > span');
    if (!rail || !prev || !next || !bar) return;
    root.dataset.arcadeReady = '1';
    const maxScroll = () => Math.max(0, rail.scrollWidth - rail.clientWidth);
    function refresh() {
      const max = maxScroll(), width = rail.clientWidth / Math.max(1, rail.scrollWidth);
      const position = max ? rail.scrollLeft / max : 0;
      bar.style.width = (width * 100) + '%';
      bar.style.left = (position * (1 - width) * 100) + '%';
      prev.disabled = rail.scrollLeft <= 1;
      next.disabled = rail.scrollLeft >= max - 1;
      root.classList.toggle('has-overflow', max > 1);
    }
    function page(direction) {
      rail.scrollBy({
        left: direction * rail.clientWidth * .8,
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
      });
    }
    prev.addEventListener('click', () => page(-1));
    next.addEventListener('click', () => page(1));
    rail.addEventListener('wheel', (event) => {
      if (event.ctrlKey || event.metaKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      const max = maxScroll();
      if (max <= 1 || (event.deltaY < 0 ? rail.scrollLeft <= 1 : rail.scrollLeft >= max - 1)) return;
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rail.clientWidth : 1;
      event.preventDefault();
      rail.scrollLeft += event.deltaY * scale;
    }, { passive: false });
    rail.addEventListener('scroll', refresh, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(refresh).observe(rail);
    refresh();
  }

  document.querySelectorAll('[data-arcade-scroll]').forEach(initRail);

  // The home page stays mounted while learners move between modules.
  // Update the leaderboard from the server when it becomes visible again;
  // do not reload the page (and stop Nerd Radio playback).
  const featured = document.getElementById('highscore');
  if (!featured) return;
  let lastSync = Date.now(), inFlight = false;
  async function refreshHighscore() {
    if (document.hidden || inFlight || Date.now() - lastSync < 12000) return;
    lastSync = Date.now();
    inFlight = true;
    try {
      const response = await fetch(location.pathname + location.search, {
        cache: 'no-store', credentials: 'same-origin',
        headers: { 'X-Requested-With': 'DTP-Highscore-Refresh' }
      });
      if (!response.ok) return;
      const page = new DOMParser().parseFromString(await response.text(), 'text/html');
      const updated = page.getElementById('highscore');
      if (!updated) return;
      const current = document.getElementById('highscore');
      if (!current) return;
      // Only modify the leaderboard, never the radio/player or learning modules.
      if (current.innerHTML !== updated.innerHTML) {
        current.innerHTML = updated.innerHTML;
        current.querySelectorAll('[data-arcade-scroll]').forEach(initRail);
      }
    } catch (_) {
      // Offline: keep existing content, retry at next focus/interval.
    } finally {
      inFlight = false;
    }
  }
  window.addEventListener('pageshow', event => { if (event.persisted) refreshHighscore(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshHighscore(); });
  window.addEventListener('focus', refreshHighscore);
  setInterval(refreshHighscore, 45000);
})();
