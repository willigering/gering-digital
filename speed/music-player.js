(() => {
'use strict';
// Hintergrundmusik (Playlist). Standardmäßig an: Browser erlauben Ton erst nach der ersten
// Eingabe, darum startet sie mit dem ersten Klick, Tipp oder Tastendruck auf der Seite.
const files = ['HJ_1.mp3','HJ_2.mp3','HJ_1 (3).mp3','HJ_1 (2).mp3','HJ_1 (1).mp3'];
const audio = new Audio();
audio.preload = 'auto';
const box = document.getElementById('hj-music');
const toggle = document.getElementById('hj-music-toggle');
const volume = document.getElementById('hj-music-volume');
const label = document.getElementById('hj-music-label');
if (!box || !toggle || !volume || !label) return;
let index = 0;
let enabled = true;
let initial = 0.35;
try { if (localStorage.getItem('hj-music-on') === '0') enabled = false; } catch {}
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
function save() { try { localStorage.setItem('hj-music-on', enabled ? '1' : '0'); } catch {} }
function play() {
  const p = audio.play();
  if (p && typeof p.catch === 'function') p.catch(() => {}); // blockiert: nächste Eingabe versucht es erneut
}
function set(on) {
  enabled = on; save(); update();
  if (enabled) play(); else audio.pause();
}
// An, aber vom Browser noch blockiert: Ein Klick auf den Schalter startet sie, statt sie auszuschalten.
function flip() { if (enabled && audio.paused) play(); else set(!enabled); }
toggle.addEventListener('click', flip);
volume.addEventListener('input', () => {
  audio.volume = Number(volume.value);
  try { localStorage.setItem('hj-music-volume', volume.value); } catch {}
});
audio.addEventListener('ended', () => { index = (index + 1) % files.length; load(); if (enabled) play(); });
audio.addEventListener('error', () => { label.textContent = 'Audio nicht verfügbar'; });
function kick(e) {
  if (e && e.target && box.contains(e.target)) return; // Schalter regelt das selbst
  if (enabled && audio.paused) play();
  if (!audio.paused) for (const t of ['pointerdown', 'keydown', 'touchend']) removeEventListener(t, kick, true);
}
for (const t of ['pointerdown', 'keydown', 'touchend']) addEventListener(t, kick, true);
window.hjMusic = { toggle: flip, get playing() { return !audio.paused; } };
load(); update();
if (enabled) play(); // klappt, wenn der Browser die Seite schon kennt und Ton erlaubt
})();
