(() => {
  const root = document.querySelector('[data-arcade-scroll]');
  if (!root) return;

  const rail = root.querySelector('.arcade-rail');
  const prev = root.querySelector('.arcade-prev');
  const next = root.querySelector('.arcade-next');
  const bar = root.querySelector('.arcade-progress > span');
  const maxScroll = () => Math.max(0, rail.scrollWidth - rail.clientWidth);

  function refresh() {
    const max = maxScroll();
    const width = rail.clientWidth / Math.max(1, rail.scrollWidth);
    const position = max ? rail.scrollLeft / max : 0;
    bar.style.width = `${width * 100}%`;
    bar.style.left = `${position * (1 - width) * 100}%`;
    prev.disabled = rail.scrollLeft <= 1;
    next.disabled = rail.scrollLeft >= max - 1;
    root.classList.toggle('has-overflow', max > 1);
  }

  function page(direction) {
    rail.scrollBy({
      left: direction * rail.clientWidth * .8,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
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
  new ResizeObserver(refresh).observe(rail);
  refresh();
})();
