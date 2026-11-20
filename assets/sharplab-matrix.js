(() => {
  const COLOR = [63, 203, 110];
  const HEAD = [226, 245, 231];
  const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜ0123456789<>$#+%C#';
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a, b) => a + Math.random() * (b - a);
  const glyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];

  function boot(canvas, opts = {}) {
    const density = opts.density || 0.16;
    const fadeMin = opts.fadeMin || 2;
    const fadeMax = opts.fadeMax || 4;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let cells = [], cols = 0, rows = 0, cell = 16, running = false, last = 0, raf = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = Math.max(12, Math.round(Math.min(w, h) / 28));
      cols = Math.max(1, Math.floor(w / cell));
      rows = Math.max(1, Math.floor(h / cell));
      cells = [];
      for (let i = 0; i < cols * rows; i++) cells.push({ ch: '', life: 0, fade: 3, head: 0 });
      seed(density);
      paint(0);
    }

    function seed(amount) {
      const n = Math.floor(cols * rows * amount);
      for (let i = 0; i < n; i++) {
        const c = cells[(Math.random() * cells.length) | 0];
        c.ch = glyph();
        c.fade = rand(fadeMin, fadeMax);
        c.life = Math.random() * c.fade;
        c.head = 0;
      }
    }

    function paint(dt) {
      const w = canvas.width / (Math.min(window.devicePixelRatio || 1, 2));
      const h = canvas.height / (Math.min(window.devicePixelRatio || 1, 2));
      ctx.clearRect(0, 0, canvas.getBoundingClientRect().width || w, canvas.getBoundingClientRect().height || h);
      const cw = canvas.getBoundingClientRect().width;
      const ch = canvas.getBoundingClientRect().height;
      ctx.clearRect(0, 0, cw, ch);
      ctx.font = `600 ${Math.max(11, cell * 0.78)}px ui-monospace, "JetBrains Mono", Consolas, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const ox = (cw - cols * cell) / 2 + cell / 2;
      const oy = (ch - rows * cell) / 2 + cell / 2;
      const spawn = dt * cols * rows * 0.012;
      let born = 0;
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        if (c.life > 0) {
          c.life -= dt;
          if (c.head > 0) c.head -= dt;
          if (c.life <= 0) { c.life = 0; c.ch = ''; c.head = 0; continue; }
          if (Math.random() < dt * 0.35) c.ch = glyph();
          const t = c.life / c.fade;
          const isHead = c.head > 0;
          const a = isHead ? 0.95 : Math.max(0, t) * 0.7;
          const r = isHead ? HEAD[0] : COLOR[0] * (0.45 + 0.55 * t);
          const g = isHead ? HEAD[1] : COLOR[1] * (0.45 + 0.55 * t);
          const b = isHead ? HEAD[2] : COLOR[2] * (0.45 + 0.55 * t);
          ctx.fillStyle = `rgba(${r|0},${g|0},${b|0},${a.toFixed(3)})`;
          const x = ox + (i % cols) * cell;
          const y = oy + ((i / cols) | 0) * cell;
          ctx.fillText(c.ch, x, y);
        } else if (born < spawn && Math.random() < 0.15) {
          c.ch = glyph();
          c.fade = rand(fadeMin, fadeMax);
          c.life = c.fade;
          c.head = 0.12;
          born++;
        }
      }
    }

    function frame(ts) {
      if (!running) return;
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
      last = ts;
      paint(dt);
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (reduced() || running) {
        if (reduced()) paint(0);
        return;
      }
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
    }

    resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
    start();
  }


  // The SharpLab detail page uses document-space coordinates: the rain continues
  // from the very top of the document to its footer, even while scrolling.
  // Only the visible viewport is painted, avoiding a giant page-height canvas.
  function bootPageRain(canvas) {
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 1;
    let height = 1;
    let pageHeight = 1;
    let cellSize = 19;
    let streams = [];
    let running = false;
    let frameId = 0;
    let lastTime = 0;
    let lastPaint = 0;

    function measure(resetColumns = false) {
      const nextWidth = Math.max(1, Math.round(window.innerWidth || canvas.clientWidth));
      const nextHeight = Math.max(1, Math.round(window.innerHeight || canvas.clientHeight));
      const nextPageHeight = Math.max(
        nextHeight,
        document.documentElement.scrollHeight,
        document.body ? document.body.scrollHeight : 0
      );
      const sizeChanged = resetColumns || nextWidth !== width || nextHeight !== height;
      width = nextWidth;
      height = nextHeight;
      pageHeight = nextPageHeight;

      if (sizeChanged) {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cellSize = width < 600 ? 17 : 20;
        streams = [];
        const columns = Math.ceil(width / cellSize);
        const streamsPerColumn = Math.max(2, Math.min(5, Math.ceil(pageHeight / 1000)));

        for (let column = 0; column < columns; column++) {
          if (Math.random() < 0.16) continue;
          for (let n = 0; n < streamsPerColumn; n++) {
            const length = Math.floor(rand(11, 25));
            streams.push({
              x: (column + 0.5) * cellSize + rand(-2, 2),
              y: ((n + Math.random()) / streamsPerColumn) * pageHeight,
              speed: rand(75, 165),
              length,
              chars: Array.from({ length }, glyph)
            });
          }
        }
      }
      paint();
    }

    function paint() {
      ctx.clearRect(0, 0, width, height);
      const scrollTop = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
      ctx.font = '600 ' + Math.round(cellSize * 0.78) + 'px ui-monospace, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (const stream of streams) {
        const head = stream.y - scrollTop;
        if (head < -cellSize || head - stream.length * cellSize > height + cellSize) continue;

        for (let step = 0; step < stream.length; step++) {
          const y = head - step * cellSize;
          if (y < -cellSize || y > height + cellSize) continue;
          const trail = Math.pow(1 - step / stream.length, 1.25);
          const opacity = Math.max(0.06, trail * 0.68).toFixed(3);
          ctx.fillStyle = step === 0
            ? 'rgba(220,255,231,0.92)'
            : 'rgba(' + COLOR[0] + ',' + COLOR[1] + ',' + COLOR[2] + ',' + opacity + ')';
          ctx.fillText(stream.chars[step], stream.x, y);
        }
      }
    }

    function frame(timestamp) {
      if (!running) return;
      if (!lastTime) lastTime = timestamp;
      const dt = Math.min(0.08, (timestamp - lastTime) / 1000);
      lastTime = timestamp;

      for (const stream of streams) {
        stream.y += stream.speed * dt;
        if (stream.y - stream.length * cellSize > pageHeight + cellSize) {
          // Restart above the document rather than at the viewport boundary.
          stream.y = -rand(0, height);
          stream.speed = rand(75, 165);
        }
        if (Math.random() < dt * 5) {
          stream.chars[(Math.random() * stream.length) | 0] = glyph();
        }
      }

      if (timestamp - lastPaint >= 32) {
        paint();
        lastPaint = timestamp;
      }
      frameId = requestAnimationFrame(frame);
    }

    function start() {
      if (running) return;
      if (motionPreference.matches) {
        paint();
        return;
      }
      running = true;
      lastTime = 0;
      lastPaint = 0;
      frameId = requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(frameId);
    }

    measure(true);
    window.addEventListener('resize', () => measure(true), { passive: true });
    window.addEventListener('load', () => measure(false), { once: true });
    window.addEventListener('scroll', () => {
      if (motionPreference.matches) paint();
    }, { passive: true });
    if (typeof ResizeObserver !== 'undefined' && document.body) {
      const observer = new ResizeObserver(() => measure(false));
      observer.observe(document.body);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else start();
    });
    if (motionPreference.addEventListener) {
      motionPreference.addEventListener('change', () => {
        stop();
        start();
      });
    }
    start();
  }

  function init() {
    document.querySelectorAll('canvas.sharplab-matrix').forEach((el) => {
      if (el.classList.contains('sl-page-matrix')) bootPageRain(el);
      else boot(el);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
