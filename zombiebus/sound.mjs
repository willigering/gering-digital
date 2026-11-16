export function makeSound(musicSlider, effectsSlider) {
  for (const slider of [musicSlider, effectsSlider]) {
    try { slider.value = localStorage.getItem('zombiebus-' + slider.id) ?? slider.value; } catch {}
    slider.addEventListener('input', () => {
      try { localStorage.setItem('zombiebus-' + slider.id, slider.value); } catch {}
    });
  }
  let audio;
  let music;
  let effect;
  function levels() {
    music.gain.setTargetAtTime(Number(musicSlider.value) * .00025, audio.currentTime, .12);
    effect.gain.setTargetAtTime(Number(effectsSlider.value) * .002, audio.currentTime, .03);
  }
  for (const slider of [musicSlider, effectsSlider]) {
    slider.addEventListener('input', () => { if (audio) levels(); });
  }
  function tone(bus, type, pitch, end, duration) {
    const time = audio.currentTime;
    const osc = audio.createOscillator();
    const envelope = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(pitch, time);
    osc.frequency.exponentialRampToValueAtTime(end, time + duration);
    envelope.gain.setValueAtTime(.0001, time);
    envelope.gain.exponentialRampToValueAtTime(.3, time + .013);
    envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
    osc.connect(envelope).connect(bus);
    osc.start(time);
    osc.stop(time + duration);
    osc.onended = () => { osc.disconnect(); envelope.disconnect(); };
  }
  function click() {
    if (!window.AudioContext) return;
    if (!audio) {
      audio = new AudioContext();
      music = audio.createGain();
      effect = audio.createGain();
      music.gain.value = effect.gain.value = 0;
      music.connect(audio.destination);
      effect.connect(audio.destination);
      let chord = 0;
      const chords = [[55, 82.4, 130.8], [43.7, 65.4, 110], [49, 73.4, 123.5]];
      setInterval(() => {
        if (document.hidden || audio.state !== 'running') return;
        for (const pitch of chords[chord % chords.length]) tone(music, 'sine', pitch, pitch, 4.9);
        chord++;
      }, 4200);
    }
    audio.resume().catch(() => {});
    levels();
    tone(effect, 'triangle', 440, 115, .075);
  }
  return { click, shot: () => { if (audio) tone(effect, 'sawtooth', 132, 36, .078); } };
}
