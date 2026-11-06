/* DAU TO PRO // NERD RADIO: originale Browser-Chiptunes, keine Drittanbieter-Streams. */
(() => {
  'use strict';
  const root = document.querySelector('[data-nerd-radio]');
  if (!root) return;

  const tracks = [
    {
      title: 'STACK OVERFLOW FM', genre: 'CHIPTUNE // 118 BPM', bpm: 118,
      wave: 'square', bassWave: 'triangle',
      lead: ['E5',null,'G5','B5',null,'A5','G5',null,'E5',null,'D5','E5','G5',null,'B5',null,
        'A5',null,'G5','E5',null,'D5','E5','G5','B5',null,'D6','B5','A5','G5','E5',null],
      bass: ['E3','E3','C3','D3','E3','G3','D3','B2'],
      chords: [['E4','G4','B4'],['C4','E4','G4'],['G3','B3','D4'],['D4','F#4','A4']]
    },
    {
      title: 'CTRL + ALT + BEAT', genre: 'ARCADE // 136 BPM', bpm: 136,
      wave: 'square', bassWave: 'sawtooth',
      lead: ['C5','E5','G5','C6','B5','G5','E5',null,'D5','F5','A5','D6','C6','A5','F5',null,
        'E5','G5','B5','E6','D6','B5','G5','E5','F5','A5','C6','A5','G5','F5','E5',null],
      bass: ['C3','C3','D3','D3','E3','E3','F3','G3'],
      chords: [['C4','E4','G4'],['D4','F4','A4'],['E4','G4','B4'],['F4','A4','C5']]
    },
    {
      title: '404: SLEEP NOT FOUND', genre: 'LO-FI BITS // 88 BPM', bpm: 88,
      wave: 'triangle', bassWave: 'sine',
      lead: ['A4',null,null,'C5',null,'E5',null,null,'G4',null,'A4',null,'C5',null,null,null,
        'F4',null,'A4',null,'C5',null,'E5',null,'D5',null,null,'C5','A4',null,null,null],
      bass: ['A2','A2','F2','F2','C3','C3','G2','G2'],
      chords: [['A3','C4','E4'],['F3','A3','C4'],['C4','E4','G4'],['G3','B3','D4']]
    }
  ];

  const toggle = root.querySelector('[data-radio-toggle]');
  const panel = root.querySelector('[data-radio-panel]');
  const close = root.querySelector('[data-radio-close]');
  const play = root.querySelector('[data-radio-play]');
  const miniPlay = root.querySelector('[data-radio-mini-play]');
  const prev = root.querySelector('[data-radio-prev]');
  const next = root.querySelector('[data-radio-next]');
  const volumeInput = root.querySelector('[data-radio-volume]');
  const status = root.querySelector('[data-radio-status]');
  const title = root.querySelector('[data-radio-title]');
  const genre = root.querySelector('[data-radio-genre]');
  const canvas = root.querySelector('[data-radio-waveform]');
  const options = [...root.querySelectorAll('[data-radio-track]')];
  const drawing = canvas.getContext('2d');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let context, master, analyser, noiseBuffer, timer = 0, frame = 0;
  let selected = 0, step = 0, nextStepAt = 0, playing = false, lastFrameAt = 0;
  let volume = 0.35;

  try {
    const savedTrack = Number(localStorage.getItem('dtp-nerd-radio-track'));
    const savedVolume = Number(localStorage.getItem('dtp-nerd-radio-volume'));
    if (Number.isInteger(savedTrack) && savedTrack >= 0 && savedTrack < tracks.length) selected = savedTrack;
    if (Number.isFinite(savedVolume) && savedVolume >= 0 && savedVolume <= 1) volume = savedVolume;
  } catch (_) { /* Storage darf verweigert sein. */ }
  volumeInput.value = String(Math.round(volume * 100));

  const save = () => {
    try {
      localStorage.setItem('dtp-nerd-radio-track', String(selected));
      localStorage.setItem('dtp-nerd-radio-volume', String(volume));
    } catch (_) { /* Privater Modus: Player funktioniert trotzdem. */ }
  };

  const freq = note => {
    const match = /^([A-G])(#?)(\d)$/.exec(note || '');
    if (!match) return 0;
    const semis = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
    const midi = (Number(match[3]) + 1) * 12 + semis[match[1]] + (match[2] ? 1 : 0);
    return 440 * Math.pow(2, (midi - 69) / 12);
  };

  const note = (pitch, when, duration, wave = 'square', level = 0.13) => {
    const hz = freq(pitch);
    if (!hz || !master) return;
    const osc = context.createOscillator();
    const amp = context.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(hz, when);
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.001, level), when + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(0.05, duration));
    osc.connect(amp).connect(master);
    osc.start(when);
    osc.stop(when + Math.max(0.05, duration) + 0.02);
    osc.onended = () => { osc.disconnect(); amp.disconnect(); };
  };

  const kick = when => {
    const osc = context.createOscillator(), amp = context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(155, when);
    osc.frequency.exponentialRampToValueAtTime(48, when + 0.16);
    amp.gain.setValueAtTime(0.33, when);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + 0.19);
    osc.connect(amp).connect(master);
    osc.start(when); osc.stop(when + 0.20);
    osc.onended = () => { osc.disconnect(); amp.disconnect(); };
  };

  const noise = (when, duration, level, highpass) => {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const amp = context.createGain();
    source.buffer = noiseBuffer;
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(highpass, when);
    amp.gain.setValueAtTime(level, when);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    source.connect(filter).connect(amp).connect(master);
    source.start(when); source.stop(when + duration);
    source.onended = () => { source.disconnect(); filter.disconnect(); amp.disconnect(); };
  };

  function makeAudio() {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) throw new Error('Web Audio API nicht verfügbar.');
    context = new Ctor();
    master = context.createGain();
    master.gain.value = 0;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 6300;
    analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.77;
    master.connect(filter).connect(analyser).connect(context.destination);
    noiseBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.30), context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  function scheduleStep(when) {
    const track = tracks[selected];
    const i = step % track.lead.length;
    const sec = 60 / track.bpm;
    if (i % 16 === 0 || i % 16 === 8) kick(when);
    if (i % 16 === 4 || i % 16 === 12) noise(when, 0.13, selected === 2 ? 0.065 : 0.13, 1200);
    if (i % 2 === 0) noise(when, 0.035, selected === 2 ? 0.02 : 0.038, 5100);
    if (track.lead[i]) note(track.lead[i], when, sec * (selected === 2 ? 0.39 : 0.19), track.wave, selected === 2 ? 0.13 : 0.085);
    if (i % 4 === 0) note(track.bass[(i / 4) % track.bass.length], when, sec * 0.39, track.bassWave, 0.17);
    if (i % 8 === 0) {
      const chord = track.chords[(Math.floor(step / 8)) % track.chords.length];
      chord.forEach(pitch => note(pitch, when, sec * 1.25, 'triangle', 0.018));
    }
    step++;
    nextStepAt += sec / 4;
  }

  function schedule() {
    if (!playing || !context) return;
    let count = 0;
    while (nextStepAt < context.currentTime + 0.16 && count++ < 8) scheduleStep(nextStepAt);
  }

  function stopAudio() {
    playing = false;
    if (timer) clearInterval(timer);
    timer = 0;
    if (master && context) master.gain.setTargetAtTime(0, context.currentTime, 0.015);
    updateUI();
  }

  async function startAudio() {
    try {
      if (!context) makeAudio();
      await context.resume();  // ausschließlich als Folge eines Nutzerklicks
      if (playing) return;
      playing = true;
      step = 0;
      nextStepAt = context.currentTime + 0.07;
      master.gain.setTargetAtTime(volume, context.currentTime, 0.025);
      schedule();
      timer = setInterval(schedule, 70);
      updateUI();
    } catch (error) {
      stopAudio();
      status.textContent = 'AUDIO BLOCKIERT // Browser prüfen';
      console.warn('NERD RADIO:', error);
    }
  }

  const switchPlay = () => playing ? stopAudio() : startAudio();

  function changeTrack(index) {
    const wasPlaying = playing;
    if (wasPlaying) stopAudio();
    selected = (index + tracks.length) % tracks.length;
    save();
    updateUI();
    if (wasPlaying) startAudio();
  }

  function setOpen(open) {
    root.classList.toggle('is-open', open);
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Nerd Radio einklappen' : 'Nerd Radio aufklappen');
    if (open) drawWaveform();
    else if (frame) { cancelAnimationFrame(frame); frame = 0; }
  }

  function updateUI() {
    root.classList.toggle('is-playing', playing);
    root.dataset.state = playing ? 'playing' : 'paused';
    play.textContent = playing ? 'Ⅱ' : '▶';
    miniPlay.textContent = playing ? 'Ⅱ' : '▶';
    play.setAttribute('aria-label', playing ? 'Musik pausieren' : 'Musik starten');
    miniPlay.setAttribute('aria-label', playing ? 'Musik pausieren' : 'Musik starten');
    title.textContent = tracks[selected].title;
    genre.textContent = tracks[selected].genre;
    status.textContent = playing ? 'LIVE // AUDIO ON' : 'STANDBY // AUDIO OFF';
    options.forEach((button, index) => {
      button.setAttribute('aria-pressed', String(index === selected));
      button.classList.toggle('is-selected', index === selected);
    });
    if (!panel.hidden) drawWaveform();
  }

  function drawWaveform(time = 0) {
    if (panel.hidden || !drawing) return;
    if (time && time - lastFrameAt < (reducedMotion.matches ? 250 : 32)) {
      frame = requestAnimationFrame(drawWaveform);
      return;
    }
    lastFrameAt = time;
    const w = canvas.width, h = canvas.height, center = h / 2;
    drawing.clearRect(0, 0, w, h);
    drawing.fillStyle = '#09151b';
    drawing.fillRect(0, 0, w, h);
    drawing.strokeStyle = '#2a465244';
    drawing.lineWidth = 1;
    for (let x = 0; x <= w; x += 40) { drawing.beginPath(); drawing.moveTo(x, 0); drawing.lineTo(x, h); drawing.stroke(); }
    for (let y = 18; y < h; y += 24) { drawing.beginPath(); drawing.moveTo(0, y); drawing.lineTo(w, y); drawing.stroke(); }
    const samples = new Uint8Array(analyser ? analyser.fftSize : 1024);
    if (playing && analyser) analyser.getByteTimeDomainData(samples);
    else samples.fill(128);
    const grad = drawing.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#76d8df'); grad.addColorStop(0.68, '#76d8df'); grad.addColorStop(1, '#edc477');
    drawing.beginPath();
    samples.forEach((value, i) => {
      const x = i / (samples.length - 1) * w;
      const y = center + (value - 128) / 128 * center * 0.84;
      if (i === 0) drawing.moveTo(x, y); else drawing.lineTo(x, y);
    });
    drawing.strokeStyle = grad;
    drawing.lineWidth = 2.5;
    drawing.shadowColor = '#76d8df';
    drawing.shadowBlur = playing ? 12 : 0;
    drawing.stroke();
    drawing.shadowBlur = 0;
    if (playing && !document.hidden) frame = requestAnimationFrame(drawWaveform);
    else frame = 0;
  }

  toggle.addEventListener('click', () => setOpen(panel.hidden));
  close.addEventListener('click', () => { setOpen(false); toggle.focus(); });
  play.addEventListener('click', switchPlay);
  miniPlay.addEventListener('click', switchPlay);
  prev.addEventListener('click', () => changeTrack(selected - 1));
  next.addEventListener('click', () => changeTrack(selected + 1));
  options.forEach((button, index) => button.addEventListener('click', () => changeTrack(index)));
  volumeInput.addEventListener('input', () => {
    volume = Number(volumeInput.value) / 100;
    if (master && context) master.gain.setTargetAtTime(playing ? volume : 0, context.currentTime, 0.02);
    save();
  });
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) { setOpen(false); toggle.focus(); }
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !panel.hidden) drawWaveform();
  });
  addEventListener('pagehide', () => {
    if (frame) cancelAnimationFrame(frame);
    stopAudio();
    if (context) context.close().catch(() => {});
  });
  updateUI();
})();
