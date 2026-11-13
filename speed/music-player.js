(() => {
'use strict';
const files = ['HJ_1.mp3','HJ_2.mp3','HJ_1 (3).mp3','HJ_1 (2).mp3','HJ_1 (1).mp3'];
const audio = new Audio();
audio.preload = 'none';
const toggle = document.getElementById('hj-music-toggle');
const volume = document.getElementById('hj-music-volume');
const label = document.getElementById('hj-music-label');
if (!toggle || !volume || !label) return;
let index = 0;
let enabled = false;
let initial = 0.35;
try { const v = localStorage.getItem('hj-music-volume'); if (v !== null) initial = Math.max(0,Math.min(1,Number(v)||0)); } catch {}
audio.volume = initial;
volume.value = String(initial);
function load() {
  audio.src = 'music/' + encodeURIComponent(files[index]);
  label.textContent = (index + 1) + '/' + files.length;
}
function update() {
  toggle.textContent = enabled ? '♫ Musik an' : '♫ Musik aus';
  toggle.setAttribute('aria-pressed', String(enabled));
}
function play() {
  const p = audio.play();
  if (p && typeof p.catch === 'function') p.catch(() => { enabled = false; update(); });
}
toggle.addEventListener('click', () => {
  enabled = !enabled;
  if (enabled) play(); else audio.pause();
  update();
});
volume.addEventListener('input', () => {
  audio.volume = Number(volume.value);
  try { localStorage.setItem('hj-music-volume', volume.value); } catch {}
});
audio.addEventListener('ended', () => { index = (index + 1) % files.length; load(); if (enabled) play(); });
audio.addEventListener('error', () => { enabled = false; update(); label.textContent = 'Audio nicht verfügbar'; });
load(); update();
})();
