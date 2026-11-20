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

  function init() {
    document.querySelectorAll('canvas.sharplab-matrix').forEach((el) => boot(el));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
