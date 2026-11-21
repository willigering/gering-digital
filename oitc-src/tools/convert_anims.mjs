// Konvertiert ActionForge-GLBs (Skelett + Clips) in ein kompaktes JSON fuer das Spiel.
// Aufruf: node convert_anims.mjs <Ordner mit *_fit.glb> <Ausgabe.json>
// Abhaengigkeit (ad hoc): npm i @gltf-transform/core @gltf-transform/extensions
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import fs from 'fs';
const [dir, out] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const FPS = 30;
// Spielname -> Datei
const MAP = {
  idle: 'idle_loop_fit', pistol_idle: 'pistol_idle_loop_fit', walk: 'walk_loop_fit', jog: 'jog_fwd_loop_fit', sprint: 'sprint_loop_fit',
  slide_start: 'slide_start_fit', slide_loop: 'slide_loop_fit', death: 'death01_fit', hit_chest: 'hit_chest_fit', hit_head: 'hit_head_fit',
  hit_knock: 'hit_knockback_fit', melee: 'melee_hook_rec_fit', punch: 'punch_cross_fit', shoot: 'pistol_shoot_fit', aim: 'pistol_aim_neutral_fit',
  jump: 'jump_land_fit', roll: 'roll_fit', reload: 'pistol_reload_fit', zwalk: 'zombie_walk_fwd_loop_fit', zidle: 'zombie_idle_loop_fit', zscratch: 'zombie_scratch_fit',
};
const LOWER = /^(root|pelvis|thigh_[lr]|calf_[lr]|foot_[lr]|ball_[lr])$/;
const SKIP = /^(ik_|socket_|Armature|.*_leaf_.*)/;
const b64 = (arr) => Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).toString('base64');
function sampleQ(times, vals, t, o) {
  let i = 0; while (i < times.length - 2 && times[i + 1] < t) i++;
  const t0 = times[i], t1 = times[Math.min(i + 1, times.length - 1)]; const k = t1 > t0 ? Math.min(1, Math.max(0, (t - t0) / (t1 - t0))) : 0;
  const a = vals.slice(i * 4, i * 4 + 4), b = vals.slice(Math.min(i + 1, times.length - 1) * 4, Math.min(i + 1, times.length - 1) * 4 + 4);
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], s = d < 0 ? -1 : 1; d = Math.abs(d);
  let wa, wb; if (d > 0.9995) { wa = 1 - k; wb = k * s; } else { const th = Math.acos(d), sn = Math.sin(th); wa = Math.sin((1 - k) * th) / sn; wb = Math.sin(k * th) / sn * s; }
  let q = [0, 1, 2, 3].map((j) => a[j] * wa + b[j] * wb); const l = Math.hypot(...q) || 1; for (let j = 0; j < 4; j++) o[j] = q[j] / l;
}
function sampleV(times, vals, t, o) {
  let i = 0; while (i < times.length - 2 && times[i + 1] < t) i++;
  const j = Math.min(i + 1, times.length - 1), t0 = times[i], t1 = times[j]; const k = t1 > t0 ? Math.min(1, Math.max(0, (t - t0) / (t1 - t0))) : 0;
  for (let c = 0; c < 3; c++) o[c] = vals[i * 3 + c] * (1 - k) + vals[j * 3 + c] * k;
}
const result = { fps: FPS, clips: {} };
for (const [name, file] of Object.entries(MAP)) {
  const doc = await io.read(`${dir}/${file}.glb`); const anim = doc.getRoot().listAnimations()[0];
  const rot = {}, tra = {}; let dur = 0;
  for (const ch of anim.listChannels()) {
    const n = ch.getTargetNode().getName(), s = ch.getSampler(), tm = s.getInput().getArray(); dur = Math.max(dur, tm[tm.length - 1]);
    if (SKIP.test(n)) continue;
    if (ch.getTargetPath() === 'rotation') rot[n] = [tm, s.getOutput().getArray()];
    if (ch.getTargetPath() === 'translation' && (n === 'pelvis' || n === 'root')) tra[n] = [tm, s.getOutput().getArray()];
  }
  const loop = /loop|jog|walk|sprint|idle/.test(file);
  let n = Math.round(dur * FPS) + 1;
  // Schleifen: letztes Bild entspricht dem ersten -> weglassen
  if (loop) n -= 1;
  const speed = tra.root ? (tra.root[1][tra.root[1].length - 1] - tra.root[1][2]) / dur : 0; // Root-Vorwaertsbewegung (z) pro Sekunde
  const L = { tracks: {} }, U = { tracks: {} };
  const q = [0, 0, 0, 1], v = [0, 0, 0];
  for (const [bone, [tm, vals]] of Object.entries(rot)) {
    const frames = new Int16Array(n * 4); let constant = true; let first = null;
    for (let f = 0; f < n; f++) { sampleQ(tm, vals, f / FPS, q); for (let j = 0; j < 4; j++) frames[f * 4 + j] = Math.round(q[j] * 32767);
      if (!first) first = Array.from(frames.slice(0, 4)); else for (let j = 0; j < 4; j++) if (Math.abs(frames[f * 4 + j] - first[j]) > 30) constant = false; }
    const tgt = LOWER.test(bone) ? L : U;
    tgt.tracks[bone] = { q: b64(constant ? frames.slice(0, 4) : frames) };
  }
  for (const [bone, [tm, vals]] of Object.entries(tra)) {
    if (bone === 'root') continue; // in place
    const fr = new Int16Array(n * 3);
    for (let f = 0; f < n; f++) { sampleV(tm, vals, f / FPS, v); for (let c = 0; c < 3; c++) fr[f * 3 + c] = Math.round(v[c] * 1000); }
    L.tracks[bone] = { ...(L.tracks[bone] || {}), p: b64(fr) };
  }
  result.clips[name] = { n, dur: n / FPS, loop, speed: +speed.toFixed(3), L: L.tracks, U: U.tracks };
  console.log(name.padEnd(12), 'frames', n, 'dur', (n / FPS).toFixed(2), 'speed', speed.toFixed(2), 'lower', Object.keys(L.tracks).length, 'upper', Object.keys(U.tracks).length);
}
fs.writeFileSync(out, JSON.stringify(result));
console.log('JSON bytes', fs.statSync(out).size);
