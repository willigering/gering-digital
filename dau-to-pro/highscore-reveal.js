(() => {
  const row = document.querySelector('[data-highscore-reveal]');
  if (!row) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  row.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reducedMotion ? 'instant' : 'smooth' });
  row.classList.add('is-revealing');

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  try {
    const audio = new AudioContext();
    if (audio.state !== 'running') {
      audio.close().catch(() => {});
      return;
    }
    const tone = audio.createOscillator();
    const volume = audio.createGain();
    const now = audio.currentTime;
    tone.frequency.value = 880;
    volume.gain.setValueAtTime(0.001, now);
    volume.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    volume.gain.exponentialRampToValueAtTime(0.001, now + 0.23);
    tone.connect(volume);
    volume.connect(audio.destination);
    tone.onended = () => audio.close().catch(() => {});
    tone.start(now);
    tone.stop(now + 0.24);
  } catch {
    // Die visuelle Rückmeldung bleibt auch ohne Ton verfügbar.
  }
})();
