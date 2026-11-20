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


  // Detail page: characters are DRAWN at fixed document positions, one after
  // another. Older characters fade out; streams end and disappear completely.
  // The canvas itself stays viewport-sized for smooth scrolling and performance.
  function bootPageRain(canvas) {
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0, height = 0, pageHeight = 0, cell = 28;
    let streams = [], running = false, frameId = 0, last = 0, lastPaint = 0;

    const documentHeight = () => Math.max(
      window.innerHeight, document.documentElement.scrollHeight,
      document.body ? document.body.scrollHeight : 0
    );

    // Each stream is an independent line, not a moving block of text.
    function newStream(column, segment = -1, segmentCount = 1) {
      const totalRows = Math.max(1, Math.ceil(pageHeight / cell));
      const row = segment < 0
        ? Math.floor(rand(-4, totalRows - 1))
        : Math.floor(((segment + rand(-0.12, 0.62)) / segmentCount) * totalRows);
      const startRow = Math.max(-7, Math.min(row, totalRows - 1));
      return {
        column, startRow, nextRow: startRow, glyphs: [],
        target: Math.floor(rand(15, 38)),
        delay: rand(0.075, 0.155),
        elapsed: 0, count: 0,
        phase: 'drawing', cooldown: rand(0.1, 1.1)
      };
    }

    function writeGlyph(stream, age = 0) {
      stream.glyphs.push({
        row: stream.nextRow++, ch: glyph(), age,
        lifetime: rand(1.6, 3.25)
      });
      stream.count++;
      if (stream.count >= stream.target || stream.nextRow * cell > pageHeight) {
        stream.phase = 'fading';
      }
    }

    function seedStreams() {
      streams = [];
      const columns = Math.ceil(width / cell);
      const segments = Math.max(2, Math.min(5, Math.ceil(pageHeight / 920)));
      for (let col = 0; col < columns; col++) {
        if (Math.random() < 0.22) continue;
        for (let segment = 0; segment < segments; segment++) {
          // Staggered rows leave quiet spaces between the coded columns.
          if (Math.random() < 0.18) continue;
          const stream = newStream(col, segment, segments);
          const initial = Math.floor(rand(0, Math.min(stream.target, 14)));
          for (let i = 0; i < initial && stream.phase === 'drawing'; i++) {
            writeGlyph(stream, (initial - i) * stream.delay);
          }
          streams.push(stream);
        }
      }
    }

    function resize() {
      const nextWidth = Math.max(1, window.innerWidth || canvas.clientWidth);
      const nextHeight = Math.max(1, window.innerHeight || canvas.clientHeight);
      const changed = nextWidth !== width || nextHeight !== height;
      const widthChanged = nextWidth !== width;
      width = nextWidth;
      height = nextHeight;
      pageHeight = documentHeight();
      cell = width < 700 ? 23 : 29;
      if (changed) {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      if (widthChanged || streams.length === 0) seedStreams();
      if (motion.matches) paint();
    }

    function advance(stream, dt) {
      if (stream.phase === 'cooldown') {
        stream.cooldown -= dt;
        if (stream.cooldown <= 0) Object.assign(stream, newStream(stream.column));
        return;
      }

      if (stream.phase === 'drawing') {
        stream.cooldown -= dt;
        if (stream.cooldown <= 0) {
          stream.elapsed += dt;
          while (stream.elapsed >= stream.delay && stream.phase === 'drawing') {
            stream.elapsed -= stream.delay;
            writeGlyph(stream);
          }
        }
      }

      // The tail darkens naturally, as each character ages in its own cell.
      for (const character of stream.glyphs) {
        character.age += dt;
        if (Math.random() < dt * 0.45) character.ch = glyph();
      }
      stream.glyphs = stream.glyphs.filter(c => c.age < c.lifetime);
      if (stream.phase === 'fading' && stream.glyphs.length === 0) {
        stream.phase = 'cooldown';
        stream.cooldown = rand(0.3, 1.8);
      }
    }

    function paint() {
      ctx.clearRect(0, 0, width, height);
      const scroll = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
      ctx.font = '700 ' + Math.round(cell * 0.91) + 'px ui-monospace, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 0;

      for (const stream of streams) {
        const x = (stream.column + 0.5) * cell;
        for (let i = 0; i < stream.glyphs.length; i++) {
          const character = stream.glyphs[i];
          const y = (character.row + 0.5) * cell - scroll;
          if (y < -cell || y > height + cell) continue;
          const life = Math.max(0, 1 - character.age / character.lifetime);
          const head = stream.phase === 'drawing' &&
            i === stream.glyphs.length - 1 && character.age < 0.22;
          const alpha = Math.min(1, Math.pow(life, 1.55) * (head ? 1 : 0.74));
          if (alpha < 0.012) continue;
          ctx.fillStyle = head
            ? 'rgba(225,255,231,' + alpha.toFixed(3) + ')'
            : 'rgba(63,203,110,' + alpha.toFixed(3) + ')';
          if (head) {
            ctx.shadowColor = 'rgba(90,255,145,0.85)';
            ctx.shadowBlur = 12;
          }
          ctx.fillText(character.ch, x, y);
          if (head) ctx.shadowBlur = 0;
        }
      }
    }

    function frame(time) {
      if (!running) return;
      const dt = last ? Math.min(0.065, (time - last) / 1000) : 0.016;
      last = time;
      for (const stream of streams) advance(stream, dt);
      if (time - lastPaint >= 33) {
        paint();
        lastPaint = time;
      }
      frameId = requestAnimationFrame(frame);
    }

    function start() {
      if (running || motion.matches || document.hidden) {
        if (motion.matches) paint();
        return;
      }
      running = true;
      last = lastPaint = 0;
      frameId = requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(frameId);
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('load', resize, { once: true });
    window.addEventListener('scroll', () => {
      if (motion.matches) paint();
    }, { passive: true });
    if (typeof ResizeObserver !== 'undefined' && document.body) {
      new ResizeObserver(() => {
        const next = documentHeight();
        if (next !== pageHeight) pageHeight = next;
      }).observe(document.body);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else start();
    });
    if (motion.addEventListener) motion.addEventListener('change', () => {
      stop();
      start();
    });
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
