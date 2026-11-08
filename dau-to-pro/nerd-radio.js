/* DAU TO PRO // NERD RADIO – interaktiver Ghettoblaster.
   Musik entsteht im Browser (Web Audio API): keine Streams, keine Drittanbieter, kein Tracking.
   Signalweg:  Stimmen → synthIn → Tiefpass ─┐
               <audio> (eigene Dateien) ─────┴→ bus (Play/Pause-Blende) → analyser → out (Lautstärke) → Lautsprecher
   Die Anzeige liest ausschließlich echte Daten aus dem AnalyserNode. */
(() => {
  'use strict';
  const root = document.querySelector('[data-nerd-radio]');
  if (!root) return;

  /* Playlist: zuerst eigene Dateien aus dau-to-pro/audio/nerd-radio/ (vom Server als data-tracks
     geliefert, Titel aus dem Dateinamen), danach die im Browser generierten Endlos-Loops. */
  const loops = [
    {
      kind: 'synth', title: 'Stack Overflow FM', genre: 'Chiptune · 118 BPM', bpm: 118,
      wave: 'square', bassWave: 'triangle',
      lead: ['E5',null,'G5','B5',null,'A5','G5',null,'E5',null,'D5','E5','G5',null,'B5',null,
        'A5',null,'G5','E5',null,'D5','E5','G5','B5',null,'D6','B5','A5','G5','E5',null],
      bass: ['E3','E3','C3','D3','E3','G3','D3','B2'],
      chords: [['E4','G4','B4'],['C4','E4','G4'],['G3','B3','D4'],['D4','F#4','A4']]
    },
    {
      kind: 'synth', title: 'Ctrl + Alt + Beat', genre: 'Arcade · 136 BPM', bpm: 136,
      wave: 'square', bassWave: 'sawtooth',
      lead: ['C5','E5','G5','C6','B5','G5','E5',null,'D5','F5','A5','D6','C6','A5','F5',null,
        'E5','G5','B5','E6','D6','B5','G5','E5','F5','A5','C6','A5','G5','F5','E5',null],
      bass: ['C3','C3','D3','D3','E3','E3','F3','G3'],
      chords: [['C4','E4','G4'],['D4','F4','A4'],['E4','G4','B4'],['F4','A4','C5']]
    },
    {
      kind: 'synth', title: '404: Sleep Not Found', genre: 'Lo-Fi · 88 BPM', bpm: 88, soft: true,
      wave: 'triangle', bassWave: 'sine',
      lead: ['A4',null,null,'C5',null,'E5',null,null,'G4',null,'A4',null,'C5',null,null,null,
        'F4',null,'A4',null,'C5',null,'E5',null,'D5',null,null,'C5','A4',null,null,null],
      bass: ['A2','A2','F2','F2','C3','C3','G2','G2'],
      chords: [['A3','C4','E4'],['F3','A3','C4'],['C4','E4','G4'],['G3','B3','D4']]
    }
  ];
  let files = [];
  try { files = JSON.parse(root.dataset.tracks || '[]'); } catch (_) { files = []; }
  const tracks = [
    ...(Array.isArray(files) ? files : []).filter(f => f && typeof f.src === 'string')
      .map(f => ({ kind: 'file', id: String(f.id || f.src), src: f.src, title: String(f.title || 'Titel'), genre: String(f.genre || ''), on: f.on !== false })),
    ...[]
  ];
  // Die generierten Loops sind nur noch Ersatz, falls der Musikordner leer ist.
  if (!tracks.length) tracks.push(...loops);
  tracks.forEach((t, i) => { if (!t.id) t.id = 'loop-' + i; if (t.on === undefined) t.on = true; });
  // Playlist-Editor: angemeldet speichert das Lernkonto die abgewählten Titel (api), Gäste merken sie sich im Browser.
  const prefApi = root.dataset.radioApi || '', prefCsrf = root.dataset.radioCsrf || '';
  if (!prefApi) {
    try {
      const off = JSON.parse(localStorage.getItem('dtp-nerd-radio-off') || '[]');
      if (Array.isArray(off)) tracks.forEach(t => { t.on = !off.includes(t.id); });
    } catch (_) { /* privater Modus */ }
  }
  if (tracks.length && !tracks.some(t => t.on)) tracks[0].on = true;   // eine leere Playlist gibt es nicht

  const $ = selector => root.querySelector(selector);
  const ui = {
    play: $('[data-radio-play]'), pause: $('[data-radio-pause]'), stop: $('[data-radio-stop]'), prev: $('[data-radio-prev]'), next: $('[data-radio-next]'),
    shuffle: $('[data-radio-shuffle]'), mode: $('[data-radio-mode]'), list: $('[data-radio-list]'), volume: $('[data-radio-volume]'),
    title: $('[data-radio-title]'), elapsed: $('[data-radio-elapsed]'), length: $('[data-radio-length]'), position: $('[data-radio-position]'),
    status: $('[data-radio-status]'), playlist: $('[data-radio-playlist]'), trackList: $('[data-radio-tracks]'),
    shuffleInd: $('[data-radio-shuffle-ind]'), loopInd: $('[data-radio-loop-ind]'), canvas: $('[data-radio-viz]'),
    faces: [...root.querySelectorAll('[data-radio-face]')],
    lights: ['gold', 'gold-halo', 'gold-edge', 'cyan', 'cyan-halo', 'cyan-edge'].map(n => [...root.querySelectorAll(`[data-radio-light="${n}"]`)]),
    cones: [...root.querySelectorAll('[data-radio-cone]')]
  };
  const pen = ui.canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const BARS = 18, SEGMENTS = 12, LEVEL_GOLD = 0.72;

  let selected = 0, volume = 0.35, state = 'stopped', mode = 'spectrum', op = 0;
  let ctx = null, synthIn, bus, analyser, out, noiseBuffer, media = null;
  let timer = 0, step = 0, nextStepAt = 0, pending = [];
  let playedBefore = 0, playStartedAt = 0, suspendTimer = 0, suspending = null, shuffleFlash = 0;
  let frame = 0, lastDraw = 0, bass = 0, treble = 0, faceScale = 1, faceAspect = 0, lastLight = '', waveAmp = 0, waveGain = 1, wavePeak = 0.08, lastClock = '', lastPos = '';
  const voices = new Set();
  const bars = new Float32Array(BARS), peaks = new Float32Array(BARS);
  let freqData = null, waveData = null, punch = null, punchData = null, punchAvg = 0, hit = 0, lastHit = 0;

  /* ---------- Einstellungen merken (Storage darf verweigert sein) ---------- */
  try {
    const t = Number(localStorage.getItem('dtp-nerd-radio-track'));
    const v = localStorage.getItem('dtp-nerd-radio-volume');
    if (Number.isInteger(t) && t >= 0 && t < tracks.length) selected = t;
    if (v !== null && Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 1) volume = Number(v);
    if (localStorage.getItem('dtp-nerd-radio-mode') === 'wave') mode = 'wave';
  } catch (_) { /* privater Modus */ }
  // Nächster aktiver Titel in Richtung dir (+1/-1), zyklisch; ohne weiteren aktiven Titel bleibt es beim aktuellen.
  const neighbor = (from, dir) => {
    for (let k = 1; k <= tracks.length; k++) {
      const i = ((from + dir * k) % tracks.length + tracks.length) % tracks.length;
      if (tracks[i].on) return i;
    }
    return from;
  };
  const activeCount = () => tracks.filter(t => t.on).length;
  if (!tracks[selected].on) selected = neighbor(selected, 1);
  const save = () => {
    try {
      localStorage.setItem('dtp-nerd-radio-track', String(selected));
      localStorage.setItem('dtp-nerd-radio-volume', String(volume));
      localStorage.setItem('dtp-nerd-radio-mode', mode);
    } catch (_) { /* Player funktioniert trotzdem */ }
  };

  /* ---------- Klangerzeugung (aus der ersten NERD-RADIO-Version übernommen) ---------- */
  const freq = note => {
    const m = /^([A-G])(#?)(\d)$/.exec(note || '');
    if (!m) return 0;
    const semis = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
    return 440 * Math.pow(2, ((Number(m[3]) + 1) * 12 + semis[m[1]] + (m[2] ? 1 : 0) - 69) / 12);
  };
  // Jede geplante Stimme wird registriert, damit Pause/Stopp auch bereits vorgeplante Noten verwirft.
  const track = (source, ...nodes) => {
    voices.add(source);
    source.onended = () => { voices.delete(source); source.disconnect(); nodes.forEach(n => n.disconnect()); };
  };
  const note = (pitch, when, duration, wave, level) => {
    const hz = freq(pitch);
    if (!hz) return;
    const osc = ctx.createOscillator(), amp = ctx.createGain(), len = Math.max(0.05, duration);
    osc.type = wave;
    osc.frequency.setValueAtTime(hz, when);
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.001, level), when + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + len);
    osc.connect(amp).connect(synthIn);
    osc.start(when); osc.stop(when + len + 0.02);
    track(osc, amp);
  };
  const kick = when => {
    const osc = ctx.createOscillator(), amp = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(155, when);
    osc.frequency.exponentialRampToValueAtTime(48, when + 0.16);
    amp.gain.setValueAtTime(0.33, when);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + 0.19);
    osc.connect(amp).connect(synthIn);
    osc.start(when); osc.stop(when + 0.2);
    track(osc, amp);
  };
  const noise = (when, duration, level, highpass) => {
    const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), amp = ctx.createGain();
    src.buffer = noiseBuffer;
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(highpass, when);
    amp.gain.setValueAtTime(level, when);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    src.connect(filter).connect(amp).connect(synthIn);
    src.start(when); src.stop(when + duration);
    track(src, filter, amp);
  };

  function makeAudio() {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) throw new Error('Web Audio API nicht verfügbar');
    ctx = new Ctor();
    synthIn = ctx.createGain();
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 6300;
    bus = ctx.createGain();
    bus.gain.value = 0;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.72;
    analyser.minDecibels = -88;
    analyser.maxDecibels = -32;
    out = ctx.createGain();
    out.gain.value = volume;
    synthIn.connect(tone).connect(bus);
    bus.connect(analyser).connect(out).connect(ctx.destination);
    freqData = new Uint8Array(analyser.frequencyBinCount);
    // Eigene Bassanalyse für die Membranen: kaum geglättet und mit viel Aussteuerungsreserve,
    // damit auch bei dauerhaft lautem Bass jeder Anschlag (Kick) erkennbar bleibt.
    punch = ctx.createAnalyser();
    punch.fftSize = 1024; punch.smoothingTimeConstant = 0.2; punch.minDecibels = -75; punch.maxDecibels = -5;
    bus.connect(punch);
    punchData = new Uint8Array(punch.frequencyBinCount);
    waveData = new Uint8Array(analyser.fftSize);
    noiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.3), ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  // Eigene MP3/WAV-Dateien: ein einziges <audio>-Element, einmalig in den Signalweg gehängt.
  function mediaFor(item) {
    if (!media) {
      media = new Audio();
      media.preload = 'none';
      ctx.createMediaElementSource(media).connect(bus);
      media.addEventListener('ended', () => choose(neighbor(selected, 1), true));
      media.addEventListener('loadedmetadata', render);
      media.addEventListener('error', () => {
        if (!media.getAttribute('src')) return;
        halt('stopped');
        root.classList.add('has-error');
        ui.title.textContent = 'Datei nicht abspielbar';
        ui.status.textContent = 'Die Audiodatei konnte nicht geladen werden.';
      });
    }
    const src = new URL(item.src, document.baseURI).href;
    if (media.src !== src) media.src = src;
    return media;
  }

  function scheduleStep(when) {
    const t = tracks[selected], i = step % t.lead.length, sec = 60 / t.bpm, soft = !!t.soft;
    if (i % 16 === 0 || i % 16 === 8) kick(when);
    if (i % 16 === 4 || i % 16 === 12) noise(when, 0.13, soft ? 0.065 : 0.13, 1200);
    if (i % 2 === 0) noise(when, 0.035, soft ? 0.02 : 0.038, 5100);
    if (t.lead[i]) note(t.lead[i], when, sec * (soft ? 0.39 : 0.19), t.wave, soft ? 0.13 : 0.085);
    if (i % 4 === 0) note(t.bass[(i / 4) % t.bass.length], when, sec * 0.39, t.bassWave, 0.17);
    if (i % 8 === 0) t.chords[Math.floor(step / 8) % t.chords.length].forEach(p => note(p, when, sec * 1.25, 'triangle', 0.018));
    pending.push({ i: step, at: when });
    step++;
    nextStepAt += sec / 4;
  }
  function schedule() {
    if (state !== 'playing' || !ctx) return;
    const now = ctx.currentTime;
    while (pending.length && pending[0].at <= now) pending.shift();
    // Im Hintergrund-Tab drosselt der Browser Timer auf ~1 s: dann weiter vorausplanen.
    const ahead = document.hidden ? 1.4 : 0.16;
    let guard = 0;
    while (nextStepAt < now + ahead && guard++ < 64) scheduleStep(nextStepAt);
  }

  /* ---------- Transport ---------- */
  const current = () => tracks[selected];
  const isFile = () => current().kind === 'file';

  async function play() {
    if (state === 'playing') return;
    const token = ++op;
    clearTimeout(suspendTimer);
    root.classList.remove('has-error');
    try {
      if (!ctx) makeAudio();
      // Ein gerade laufendes Schlafenlegen abwarten: sonst meldet der Kontext noch „running“,
      // schläft danach aber ein und die Wiedergabe bleibt stumm.
      if (suspending) await suspending;
      if (ctx.state !== 'running') await ctx.resume(); // nur nach bewusster Nutzeraktion
      if (token !== op) return;
      if (state === 'stopped') { step = 0; playedBefore = 0; }
      if (isFile()) {
        const el = mediaFor(current());
        if (state === 'stopped') el.currentTime = 0;
        await el.play();
        if (token !== op) { el.pause(); return; }
      } else {
        pending = [];
        nextStepAt = ctx.currentTime + 0.06;
        schedule();
        timer = setInterval(schedule, 40);
      }
      const now = ctx.currentTime;
      playStartedAt = now;
      bus.gain.cancelScheduledValues(now);
      bus.gain.setTargetAtTime(1, now, 0.02);
      setState('playing');
    } catch (error) {
      if (token !== op) return;
      halt('stopped');
      root.classList.add('has-error');
      ui.title.textContent = 'Audio blockiert – Browser prüfen';
      ui.status.textContent = 'Audio konnte nicht gestartet werden.';
      console.warn('NERD RADIO:', error);
    }
  }

  function halt(next) {
    op++;
    if (timer) { clearInterval(timer); timer = 0; }
    if (ctx) {
      const now = ctx.currentTime;
      if (state === 'playing') playedBefore += now - playStartedAt;
      bus.gain.cancelScheduledValues(now);
      bus.gain.setTargetAtTime(0, now, 0.012);
      // Pause setzt an der ersten noch nicht erklungenen Note fort – nichts doppelt, nichts verschluckt.
      if (pending.length) step = pending[0].i;
      pending = [];
      const cut = now + 0.06;
      voices.forEach(v => { try { v.stop(cut); } catch (_) { /* bereits beendet */ } });
      // Ruhender Kontext spart Rechenzeit; Fortsetzen weckt ihn wieder auf.
      clearTimeout(suspendTimer);
      const quiet = op;   // jede Transportaktion (Play, Titelwechsel) erhöht op und bricht das Schlafenlegen ab
      suspendTimer = setTimeout(() => {
        if (op !== quiet || state === 'playing' || !ctx || ctx.state !== 'running') return;
        suspending = ctx.suspend().catch(() => {}).finally(() => { suspending = null; });
      }, 400);
    }
    if (media) media.pause();
    if (next === 'stopped') {
      step = 0; playedBefore = 0;
      if (media && media.readyState > 0) media.currentTime = 0;
    }
    setState(next);
  }

  const toggle = () => (state === 'playing' ? halt('paused') : play());

  function choose(index, autoplay) {
    const resume = autoplay || state === 'playing';
    halt('stopped');
    selected = (index + tracks.length) % tracks.length;
    save();
    render();
    if (resume) play();
  }

  /* ---------- Anzeige ---------- */
  const two = n => String(Math.floor(n)).padStart(2, '0');
  const clock = s => `${two(s / 60)}:${two(s % 60)}`;
  function elapsed() {
    if (isFile()) return media && media.src ? media.currentTime || 0 : 0;
    return playedBefore + (state === 'playing' && ctx ? ctx.currentTime - playStartedAt : 0);
  }
  function updateClock() {
    const secs = Math.max(0, elapsed());
    const text = clock(secs);
    if (text !== lastClock) { ui.elapsed.textContent = text; lastClock = text; }
    let pos = 0;
    if (isFile()) pos = media && media.duration > 0 && Number.isFinite(media.duration) ? secs / media.duration : 0;
    else { const t = current(); const loop = t.lead.length * 60 / t.bpm / 4; pos = (secs % loop) / loop; }
    const p = (pos * 100).toFixed(1) + '%';
    if (p !== lastPos) { ui.position.style.setProperty('--nr-pos', p); lastPos = p; }
  }

  function render() {
    const t = current(), number = two(selected + 1);
    ui.title.textContent = `${number} – ${t.title}`;
    fitTitle();
    if (isFile()) {
      const d = media && Number.isFinite(media.duration) ? media.duration : 0;
      ui.length.textContent = d ? clock(d) : '--:--';
    } else ui.length.textContent = '∞ LOOP'; // Endlos-Loop: keine erfundene Titeldauer
    ui.loopInd.classList.toggle('is-lit', !isFile());
    [...ui.trackList.children].forEach((li, i) => li.firstElementChild.setAttribute('aria-current', String(i === selected)));
    lastClock = ''; lastPos = '';
    updateClock();
  }

  // Zu lange Titel laufen während der Wiedergabe als Laufschrift durch (wie bei einem LCD).
  function fitTitle() {
    const box = ui.title.parentElement, shift = box.clientWidth - ui.title.scrollWidth;
    const long = shift < -1;
    box.classList.toggle('is-long', long);
    if (long) {
      box.style.setProperty('--nr-shift', shift + 'px');
      box.style.setProperty('--nr-dur', Math.max(4, -shift / 14).toFixed(1) + 's');
    }
  }

  function setState(next) {
    state = next;
    root.dataset.state = next;
    const playing = next === 'playing';
    ui.play.setAttribute('aria-label', playing ? 'Pause' : 'Abspielen');
    const t = current();
    ui.status.textContent = playing ? `Spielt: ${two(selected + 1)} – ${t.title}` : next === 'paused' ? 'Pausiert' : 'Gestoppt';
    if (next === 'stopped') { bars.fill(0); peaks.fill(0); waveAmp = 0; bass = 0; treble = 0; }
    applyBass();
    render();
    wake();
  }

  // Echte Beleuchtung: die gerenderten Lichtebenen werden mit der Musik heller und dunkler.
  // Gold (Lautsprecherringe, Schultern, Sockel) folgt dem Bass, Cyan (Neonrahmen, Pilze) den Höhen.
  // Ohne Musik sind die Leuchten aus (nur ein schwacher Bereitschaftsschimmer).
  // Der scharfe Kern (Ring, Pixelpilz) bleibt beim Spielen fast voll hell, nur der weiche Schein pulsiert stark;
  // so wirkt der Pilz nie verwaschen, auch wenn die Musik leise ist.
  // Kantenlicht: Ringe werfen Gold auf die Gehäusekanten, der Pilz Cyan aufs Gitter.
  // Membranen pumpen mit dem Bass. RGB-LED-Ring und Licht durchs Gitter wie bei Party-Boomboxen:
  // Farbe wandert fließend (bei Bass schneller), Helligkeit folgt dem Bass.
  const STANDBY = 0.06;
  let lastPump = '', phase = 0, lastHueAt = 0, lastRgb = '';
  // Membran als gedämpfte Feder (~7 Hz, wenig Dämpfung): jeder Bassanschlag gibt einen Stoß,
  // danach schwingt sie sichtbar nach – auch kurz nach innen – wie ein echter Tieftöner.
  let coneX = 0, coneV = 0;
  const K = (2 * Math.PI * 7) ** 2, C = 2 * 0.22 * 2 * Math.PI * 7;
  function applyBass() {
    const calm = reduced.matches, on = state === 'playing';
    const lo = Math.min(1, bass * 1.5), hi = Math.min(1, treble * 2);
    const now = performance.now(), dt = lastHueAt ? Math.min(0.1, (now - lastHueAt) / 1000) : 0;
    lastHueAt = now;
    const drive = on && !calm ? Math.min(1, bass * 1.6) : 0;
    if (drive && hit) coneV += hit * 26;                                       // Anschlag: Stoß nach vorn
    hit = 0;
    for (let t = 0; t < dt; t += 0.004) {                                      // stabile kleine Schritte
      const h = Math.min(0.004, dt - t);
      coneV += (-K * (coneX - drive * 0.2) - C * coneV) * h;
      coneX = Math.max(-0.7, Math.min(1.4, coneX + coneV * h));
    }
    if (!drive && Math.abs(coneX) < 0.002 && Math.abs(coneV) < 0.01) { coneX = 0; coneV = 0; }
    const push = Math.max(0, Math.min(1, coneX));
    const pump = coneX.toFixed(3);
    if (pump !== lastPump) {
      lastPump = pump;
      ui.cones.forEach(c => { c.style.transform = coneX ? `scale(${(1 + coneX * 0.075).toFixed(4)})` : ''; c.style.setProperty('--nr-push', push.toFixed(3)); });
    }
    if (on && !calm) phase = (phase + dt * (0.12 + 0.9 * lo)) % (Math.PI * 2);
    const hue = 185 + 140 * (0.5 - 0.5 * Math.cos(phase));   // pendelt Türkis (185) ↔ Pink (325)
    const led = !on ? 0 : calm ? 0.75 : 0.22 + 0.78 * lo, mesh = !on ? 0 : calm ? 0.4 : 0.12 + 0.85 * push;
    const rgb = `${Math.round(hue)}|${led.toFixed(2)}|${mesh.toFixed(2)}`;
    if (rgb !== lastRgb) {
      lastRgb = rgb;
      root.style.setProperty('--nr-hue', String(Math.round(hue)));
      root.style.setProperty('--nr-led', led.toFixed(2));
      root.style.setProperty('--nr-mesh', mesh.toFixed(2));
    }
    const v = !on ? [STANDBY, STANDBY, STANDBY, STANDBY, STANDBY, STANDBY] : calm ? [0.95, 0.7, 0.5, 0.95, 0.7, 0.5]
      : [0.82 + 0.18 * lo, 0.12 + 0.88 * lo, 0.08 + 0.92 * lo, 0.85 + 0.15 * hi, 0.12 + 0.88 * hi, 0.1 + 0.9 * hi];
    const key = v.map(n => n.toFixed(2)).join();
    if (key !== lastLight) {
      lastLight = key;
      ui.lights.forEach((els, i) => els.forEach(el => { el.style.opacity = v[i].toFixed(2); }));
    }
    return coneX !== 0;   // Membran schwingt noch: Zeichenschleife weiterlaufen lassen
  }

  /* Display und Regler auf die schräge Front legen: Homographie aus den vier von Blender
     exportierten Eckpunkten der Frontebene (--nr-face, relativ zum Gehäusebild). */
  function homography(src, dst) {
    const A = [], b = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = src[i], [u, v] = dst[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    }
    for (let i = 0; i < 8; i++) {          // Gauß-Elimination mit Pivotsuche
      let p = i;
      for (let r = i + 1; r < 8; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
      [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
      for (let r = i + 1; r < 8; r++) {
        const f = A[r][i] / A[i][i];
        for (let k = i; k < 8; k++) A[r][k] -= f * A[i][k];
        b[r] -= f * b[i];
      }
    }
    const h = new Array(8);
    for (let i = 7; i >= 0; i--) { let s = b[i]; for (let k = i + 1; k < 8; k++) s -= A[i][k] * h[k]; h[i] = s / A[i][i]; }
    return h;
  }
  function placeFaces() {
    const q = getComputedStyle(root).getPropertyValue('--nr-face').replace(/["']/g, '').trim().split(/\s+/).map(Number);
    const W = root.clientWidth, H = root.clientHeight;
    if (q.length !== 8 || q.some(n => !Number.isFinite(n)) || !W) return;
    const dst = [0, 1, 2, 3].map(i => [q[i * 2] * W, q[i * 2 + 1] * H]);
    /* Die Frontebene bekommt ungefähr ihre sichtbare Bildschirmgröße (Seitenverhältnis aus layout.css, Paket-Koordinaten).
       Wäre sie in voller Paketgröße (2910 px) und per matrix3d auf ein Fünftel verkleinert, rechnen Browser die 3D-Ebene
       groß und verkleinern sie grob auf der Grafikkarte – Pilze, Tasten und Schrift verschwimmen. Alle Positionen und
       Schriftgrößen darin sind relativ (% bzw. cqw), daher skaliert der Inhalt mit. */
    if (!faceAspect) faceAspect = (ui.faces[0].offsetHeight || 450) / (ui.faces[0].offsetWidth || 1000);
    const len = (p, q2) => Math.hypot(q2[0] - p[0], q2[1] - p[1]);
    const fw = Math.max(1, Math.ceil(Math.max(len(dst[0], dst[1]), len(dst[3], dst[2]), Math.max(len(dst[0], dst[3]), len(dst[1], dst[2])) / faceAspect)));
    const fh = fw * faceAspect;
    const [a, b, c2, d, e, f, g, h] = homography([[0, 0], [fw, 0], [fw, fh], [0, fh]], dst);
    const m = `matrix3d(${[a, d, 0, g, b, e, 0, h, 0, 0, 1, 0, c2, f, 0, 1].map(n => +n.toFixed(8)).join(',')})`;
    ui.faces.forEach(el => { el.style.width = `${fw}px`; el.style.height = `${fh}px`; el.style.transform = m; el.classList.add('is-placed'); });
    faceScale = len(dst[0], dst[1]) / fw;
  }

  // Canvas scharf halten (Gerätepixel), ohne bei jedem Frame die Größe zu prüfen.
  function fitCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1) * faceScale;
    const w = Math.max(1, Math.round(ui.canvas.offsetWidth * dpr)), h = Math.max(1, Math.round(ui.canvas.offsetHeight * dpr));
    if (ui.canvas.width !== w || ui.canvas.height !== h) { ui.canvas.width = w; ui.canvas.height = h; }
    fitTitle();
    paint();
  }

  // Logarithmisch verteilte Frequenzbänder (45 Hz … 9 kHz) – tiefe Töne links, hohe rechts.
  let bands = null;
  function makeBands() {
    const hzPerBin = ctx.sampleRate / analyser.fftSize, lo = 45, hi = 9000;
    bands = Array.from({ length: BARS }, (_, b) => {
      const from = lo * Math.pow(hi / lo, b / BARS), to = lo * Math.pow(hi / lo, (b + 1) / BARS);
      const a = Math.max(1, Math.floor(from / hzPerBin)), z = Math.max(a + 1, Math.ceil(to / hzPerBin));
      return [a, z];
    });
  }

  function paint() {
    const w = ui.canvas.width, h = ui.canvas.height;
    pen.clearRect(0, 0, w, h);
    if (mode === 'wave') return paintWave(w, h);
    const slot = w / BARS, barW = Math.max(1, slot * 0.66), segH = h / SEGMENTS, gap = Math.max(1, segH * 0.28);
    for (let b = 0; b < BARS; b++) {
      const x = b * slot + (slot - barW) / 2, lit = Math.round(bars[b] * SEGMENTS);
      for (let s = 0; s < SEGMENTS; s++) {
        const y = h - (s + 1) * segH + gap / 2, on = s < lit, strong = s / SEGMENTS >= LEVEL_GOLD;
        pen.fillStyle = on ? (strong ? '#ffc23a' : s / SEGMENTS > 0.45 ? '#7ff6ff' : '#22dcf5') : '#0f4450aa';
        pen.fillRect(x, y, barW, segH - gap);
      }
      const peak = Math.round(peaks[b] * SEGMENTS);
      if (peak > lit && peak > 0) {
        pen.fillStyle = '#ffd36b';
        pen.fillRect(x, h - peak * segH + gap / 2, barW, Math.max(1, (segH - gap) * 0.45));
      }
    }
  }
  function paintWave(w, h) {
    const mid = h / 2;
    pen.strokeStyle = '#0d3a46aa';
    pen.lineWidth = 1;
    pen.beginPath(); pen.moveTo(0, mid); pen.lineTo(w, mid); pen.stroke();
    if (!waveData || waveAmp < 0.005) return;
    const n = waveData.length, stepPx = w / (n - 1);
    pen.lineWidth = Math.max(1.5, h / 40);
    pen.lineJoin = 'round';
    let prevX = 0, prevY = mid, prevStrong = false;
    pen.beginPath(); pen.strokeStyle = '#22dcf5'; pen.moveTo(0, mid);
    for (let i = 0; i < n; i += 2) {
      const v = Math.max(-1, Math.min(1, (waveData[i] - 128) / 128 * waveGain)), y = mid - v * mid * 0.92 * waveAmp, x = i * stepPx, strong = Math.abs(v) > 0.72;
      if (strong !== prevStrong) { // goldene Spitzen bei kräftigen Pegeln
        pen.lineTo(x, y); pen.stroke();
        pen.beginPath(); pen.strokeStyle = strong ? '#ffc23a' : '#22dcf5'; pen.moveTo(x, y);
        prevStrong = strong;
      } else pen.lineTo(x, y);
      prevX = x; prevY = y;
    }
    pen.lineTo(prevX, prevY); pen.stroke();
  }

  function wake() { if (!frame) frame = requestAnimationFrame(draw); }
  function draw(time) {
    frame = 0;
    const live = state === 'playing' && analyser && !document.hidden;
    const interval = reduced.matches ? 120 : 33;
    if (time - lastDraw < interval - 2) { frame = requestAnimationFrame(draw); return; }
    lastDraw = time;
    let moving = false;
    if (live) {
      if (!bands) makeBands();
      analyser.getByteFrequencyData(freqData);
      if (mode === 'wave') {
        analyser.getByteTimeDomainData(waveData);
        let peak = 0;
        for (let i = 0; i < waveData.length; i++) { const a = Math.abs(waveData[i] - 128); if (a > peak) peak = a; }
        // Verstärkung nach nachlaufendem Spitzenpegel: der Titel füllt das Display,
        // Pausen zwischen den Noten bleiben dabei sichtbar ruhig (kein hochgezogenes Rauschen).
        wavePeak = Math.max(peak / 128, wavePeak * 0.985, 0.08);
        waveGain = 0.92 / wavePeak;
      }
      let low = 0;
      for (let k = 1; k <= 6; k++) low += freqData[k];
      bass += ((low / 6 / 255) - bass) * 0.5;
      // Kick-Erkennung: Bassenergie springt über ihren gleitenden Mittelwert
      punch.getByteFrequencyData(punchData);
      let e = 0;
      for (let k = 1; k <= 4; k++) e += punchData[k];
      e /= 4 * 255;
      const rise = e - punchAvg;
      if (rise > 0.035 && time - lastHit > 110) { hit = Math.min(1, rise * 6); lastHit = time; }
      punchAvg += (e - punchAvg) * (rise > 0 ? 0.12 : 0.05);
      waveAmp = 1;
      for (let b = 0; b < BARS; b++) {
        const [a, z] = bands[b];
        let max = 0;
        for (let k = a; k < z; k++) if (freqData[k] > max) max = freqData[k];
        const level = Math.pow(max / 255, 1.15);
        bars[b] = level > bars[b] ? level : bars[b] * 0.8 + level * 0.2;
        peaks[b] = bars[b] >= peaks[b] ? bars[b] : Math.max(0, peaks[b] - 0.025);
      }
      let hi = 0;
      for (let b = BARS >> 1; b < BARS; b++) hi += bars[b];
      treble += (hi / (BARS - (BARS >> 1)) - treble) * 0.45;
      moving = true;
    } else {
      // Pause: Anzeige klingt sichtbar aus und kommt zur Ruhe. Stopp hat bereits alles zurückgesetzt.
      for (let b = 0; b < BARS; b++) {
        bars[b] *= 0.78; peaks[b] = Math.max(0, peaks[b] - 0.04);
        if (bars[b] < 0.01) bars[b] = 0;
        if (bars[b] || peaks[b]) moving = true;
      }
      waveAmp *= 0.8; if (waveAmp < 0.005) waveAmp = 0; else moving = true;
      bass *= 0.75; if (bass < 0.01) bass = 0; else moving = true;
      treble *= 0.75; if (treble < 0.01) treble = 0; else moving = true;
    }
    if (applyBass()) moving = true;
    paint();
    updateClock();
    const flash = shuffleFlash > time;
    ui.shuffleInd.classList.toggle('is-lit', flash);
    if (live || moving || flash || (isFile() && state === 'playing')) frame = requestAnimationFrame(draw);
  }

  function setMode(next) {
    mode = next;
    root.dataset.mode = next;
    ui.mode.setAttribute('aria-pressed', String(next === 'wave'));
    ui.mode.setAttribute('aria-label', next === 'wave' ? 'Anzeige auf Spektrum umschalten' : 'Anzeige auf Wellenform umschalten');
    paint();
    wake();
  }

  function setVolume(v) {
    volume = Math.min(1, Math.max(0, v));
    const pct = Math.round(volume * 100);
    ui.volume.value = String(pct);
    // CSS-Variable gehört auf .nr-volume (Eltern), sonst bewegen sich Füllung und Knopf nicht.
    (ui.volume.closest('.nr-volume') || ui.volume).style.setProperty('--nr-vol', `${pct}%`);
    if (out && ctx) {
      const now = ctx.currentTime;
      out.gain.cancelScheduledValues(now);
      // Bei 0 hart stummschalten: setTargetAtTime nähert sich nur asymptotisch an.
      if (volume <= 0) out.gain.setValueAtTime(0, now);
      else out.gain.setTargetAtTime(volume, now, 0.02);
    }
  }

  function openList(open) {
    ui.playlist.hidden = !open;
    ui.list.setAttribute('aria-expanded', String(open));
    ui.list.setAttribute('aria-label', open ? 'Playlist schließen' : 'Playlist öffnen');
    if (open) ui.trackList.children[selected].firstElementChild.focus();
  }

  /* ---------- Playlist aufbauen (Editor: Klick auf den Titel schaltet ihn an/aus, die Nummer spielt ihn ab) ---------- */
  const rows = [];
  // has-wheel: nur mit mindestens zwei aktiven Titeln hat das Mausrad über dem Titel eine Wirkung (und der Mauszeiger das Symbol).
  const labelPlaylist = () => {
    ui.playlist.setAttribute('aria-label', `Playlist, ${activeCount()} von ${tracks.length} Titeln aktiv`);
    root.classList.toggle('has-wheel', activeCount() > 1);
  };
  const paintRow = i => {
    const t = tracks[i], row = rows[i];
    row.li.dataset.on = String(t.on);
    row.toggle.setAttribute('aria-checked', String(t.on));
    row.toggle.setAttribute('aria-label', `${t.title}: ${t.on ? 'aktiv' : 'aus'}. Klicken zum ${t.on ? 'Deaktivieren' : 'Aktivieren'}`);
    row.toggle.title = t.on ? 'Klicken: Titel aus der Playlist nehmen' : 'Klicken: Titel wieder aktivieren';
  };
  labelPlaylist();
  tracks.forEach((t, i) => {
    const li = document.createElement('li');
    li.className = 'nr-playlist__row';
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'nr-playlist__play';
    play.textContent = two(i + 1);
    play.setAttribute('aria-label', `Titel ${two(i + 1)} abspielen`);
    play.title = 'Abspielen';
    play.addEventListener('click', () => {
      if (!t.on) setOn(i, true);
      openList(false); ui.list.focus(); choose(i, true);
    });
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nr-playlist__item';
    toggle.setAttribute('role', 'switch');
    toggle.innerHTML = '<span></span><small></small><i class="nr-playlist__check" aria-hidden="true"></i>';
    toggle.children[0].textContent = t.title;
    toggle.children[1].textContent = t.bpm ? `${t.bpm} BPM` : (t.genre || '');
    toggle.addEventListener('click', () => setOn(i, !t.on));
    li.append(play, toggle);
    ui.trackList.append(li);
    rows.push({ li, play, toggle });
    paintRow(i);
  });

  let saving = Promise.resolve();
  function persist() {
    const off = tracks.filter(t => !t.on).map(t => t.id);
    if (!prefApi) {
      try { localStorage.setItem('dtp-nerd-radio-off', JSON.stringify(off)); } catch (_) { /* nur diese Sitzung */ }
      return Promise.resolve(true);
    }
    // Speichern nacheinander, damit der zuletzt gewählte Stand im Konto landet.
    saving = saving.then(() => fetch(prefApi, {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-DTP-CSRF': prefCsrf }, body: JSON.stringify({ off })
    }).then(async r => {
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || 'Die Playlist konnte nicht gespeichert werden.');
      return true;
    })).catch(error => { ui.status.textContent = error.message; return false; });
    return saving;
  }
  async function setOn(i, on) {
    const t = tracks[i];
    if (t.on === on) return;
    if (!on && activeCount() < 2) {
      ui.status.textContent = 'Mindestens ein Titel muss aktiv bleiben.';
      rows[i].li.classList.remove('is-denied'); void rows[i].li.offsetWidth; rows[i].li.classList.add('is-denied');
      return;
    }
    t.on = on; paintRow(i); labelPlaylist();
    ui.status.textContent = on ? `${t.title} ist wieder in der Playlist.` : `${t.title} ist aus der Playlist genommen.`;
    // Der gerade gewählte Titel wird im Stopp gleich durch den nächsten aktiven ersetzt; laufende Titel spielen zu Ende.
    if (!on && i === selected && state !== 'playing') choose(neighbor(selected, 1), false);
    if (!await persist()) {   // Konto hat abgelehnt: Anzeige zurücksetzen
      t.on = !on; paintRow(i); labelPlaylist();
    }
  }

  /* ---------- Bedienung ---------- */
  ui.play.addEventListener('click', toggle);
  ui.pause.addEventListener('click', () => { if (state === 'playing') toggle(); });
  ui.stop.addEventListener('click', () => halt('stopped'));
  ui.prev.addEventListener('click', () => choose(neighbor(selected, -1)));
  ui.next.addEventListener('click', () => choose(neighbor(selected, 1)));
  ui.shuffle.addEventListener('click', () => {
    shuffleFlash = performance.now() + 900;
    const others = tracks.map((t, i) => i).filter(i => tracks[i].on && i !== selected);
    choose(others.length ? others[Math.floor(Math.random() * others.length)] : selected, true);
  });
  ui.mode.addEventListener('click', () => { setMode(mode === 'wave' ? 'spectrum' : 'wave'); save(); });
  // Mausrad schaltet den Titel nur um, wenn der Mauszeiger direkt auf der Titelzeile steht (dort zeigt er ein Mausrad-Symbol);
  // überall sonst scrollt die Seite normal. Gewechselt wird nur zwischen aktiven Titeln.
  const titleRow = ui.title.closest('.nr-display__track') || ui.title.parentElement;
  titleRow.title = 'Mausrad: Titel wechseln';
  let wheelAt = 0;
  titleRow.addEventListener('wheel', e => {
    if (activeCount() < 2 || Math.abs(e.deltaY) < 4 || e.ctrlKey) return;
    e.preventDefault();
    const now = performance.now();
    if (now - wheelAt < 350) return;
    wheelAt = now;
    choose(neighbor(selected, e.deltaY > 0 ? 1 : -1), state === 'playing');
  }, { passive: false });
  ui.list.addEventListener('click', () => openList(ui.playlist.hidden));
  const onVolume = () => { setVolume(Number(ui.volume.value) / 100); save(); };
  ui.volume.addEventListener('input', onVolume);
  ui.volume.addEventListener('change', onVolume);
  root.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !ui.playlist.hidden) { e.stopPropagation(); openList(false); ui.list.focus(); }
  });
  // Tastendruck per Tastatur sichtbar machen (Leertaste/Enter drücken die Taste ein).
  root.querySelectorAll('.nr-key').forEach(key => {
    key.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') key.classList.add('is-down'); });
    ['keyup', 'blur'].forEach(type => key.addEventListener(type, () => key.classList.remove('is-down')));
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  reduced.addEventListener?.('change', () => { applyBass(); wake(); });
  const relayout = () => { placeFaces(); fitCanvas(); };
  if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(root);
  else addEventListener('resize', relayout);
  addEventListener('pagehide', () => {
    halt('stopped');
    if (ctx) { ctx.close().catch(() => {}); ctx = null; media = null; bands = null; }
  });

  setVolume(volume);
  setMode(mode);
  setState('stopped');
  relayout();
  applyBass();

  // Für automatisierte Prüfungen: Zustand lesen, ohne Interna zu verändern.
  root.nerdRadio = Object.freeze({
    get state() { return state; },
    get track() { return selected; },
    get volume() { return out ? out.gain.value : volume; },
    get voices() { return voices.size; },
    get contexts() { return ctx ? 1 : 0; },
    level() {
      if (!analyser) return 0;
      analyser.getByteFrequencyData(freqData);
      return freqData.reduce((s, v) => s + v, 0) / freqData.length;
    }
  });
})();
