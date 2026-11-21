// Animierter Soldat (Skelett aus ActionForge/Quaternius-Rig). Modell + Animationen sind in das Bundle eingebettet.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import glb from '../assets/human/soldier.glb';
import animData from '../assets/human/anims.json';

const b64 = (s) => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Int16Array(u.buffer); };

// Gemessene Fuss-Bodengeschwindigkeit der Clips bei timeScale 1 (m/s), damit die Fuesse nicht gleiten
const STRIDE = { walk: 0.71, jog: 5.1, sprint: 5.4, zwalk: 0.7 };
function buildClips() {
  const out = {}, fps = animData.fps;
  for (const [name, c] of Object.entries(animData.clips)) {
    const times = Float32Array.from({ length: c.n }, (_, i) => i / fps);
    const mk = (group, suffix) => {
      const tracks = [];
      for (const [bone, t] of Object.entries(group)) {
        if (t.q) { const q = b64(t.q), v = new Float32Array(q.length); for (let i = 0; i < v.length; i++) v[i] = q[i] / 32767; tracks.push(new THREE.QuaternionKeyframeTrack(bone + '.quaternion', q.length === 4 ? new Float32Array([0]) : times, v)); }
        if (t.p) { const p = b64(t.p), v = new Float32Array(c.n * 3); for (let i = 0; i < v.length; i++) v[i] = p[i] / 1000; tracks.push(new THREE.VectorKeyframeTrack(bone + '.position', times, v)); }
      }
      return tracks.length ? new THREE.AnimationClip(name + suffix, c.n / fps, tracks) : null;
    };
    out[name] = { L: mk(c.L, '_L'), U: mk(c.U, '_U'), dur: c.dur, loop: c.loop, speed: STRIDE[name] !== undefined ? STRIDE[name] : Math.abs(c.speed || 0) };
  }
  return out;
}

let tpl = null, clips = null, camoTex = null;
export function setCamo(t) { camoTex = t; }
// Tarnmuster ohne UVs: dreiachsig auf Objekt-Koordinaten projiziert
function camoize(m, mul) {
  m = m.clone();
  m.onBeforeCompile = (sh) => {
    sh.uniforms.camoMap = { value: camoTex }; sh.uniforms.camoMul = { value: mul };
    sh.vertexShader = 'varying vec3 vOP; varying vec3 vON;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vOP = position; vON = normal;');
    sh.fragmentShader = 'uniform sampler2D camoMap; uniform vec3 camoMul; varying vec3 vOP; varying vec3 vON;\n' + sh.fragmentShader.replace('#include <map_fragment>',
      `vec3 bw = pow(abs(normalize(vON)), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
       vec3 cm = texture2D(camoMap, vOP.yz * 2.2).rgb * bw.x + texture2D(camoMap, vOP.xz * 2.2).rgb * bw.y + texture2D(camoMap, vOP.xy * 2.2).rgb * bw.z;
       diffuseColor.rgb *= cm * camoMul;`);
  };
  m.customProgramCacheKey = () => 'camo' + mul.x.toFixed(2);
  return m;
}
export function loadHuman(done, fail) {
  try {
    const ab = glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength);
    new GLTFLoader().parse(ab, '', (g) => { tpl = g.scene; clips = buildClips(); done(); }, (e) => fail && fail(e));
  } catch (e) { fail && fail(e); }
}

export function makeHuman(color, gunModel, knifeModel, opts = {}) {
  const root = new THREE.Group();
  const body = SkeletonUtils.clone(tpl);
  body.rotation.y = Math.PI;               // Modell blickt +Z, Spiel-Vorwärts ist -Z
  body.traverse((o) => {
    if (o.isMesh || o.isSkinnedMesh) {
      o.castShadow = true; o.frustumCulled = false;
      const fix = (m) => { if (opts.zombie) { m = m.clone(); if (m.name === 'Skin') m.color.set(0x7f9c6c); else if (m.name === 'TeamColor') m.color.set(0x4a1c16); else if (m.name === 'Cloth') m.color.set(0x5a5148); else if (m.name === 'Pants') m.color.set(0x3a3a38); return m; }
      if (m.name === 'TeamColor') { m = m.clone(); m.color.set(color); } else if (camoTex && m.name === 'Cloth') m = camoize(m, new THREE.Vector3(5.5, 5.5, 5.5)); else if (camoTex && m.name === 'Pants') m = camoize(m, new THREE.Vector3(3.6, 3.6, 3.6)); return m; };
      o.material = Array.isArray(o.material) ? o.material.map(fix) : fix(o.material);
    }
  });
  root.add(body);
  const mixer = new THREE.AnimationMixer(body);
  const act = {};
  for (const [n, c] of Object.entries(clips)) {
    act[n] = {};
    for (const k of ['L', 'U']) if (c[k]) act[n][k] = mixer.clipAction(c[k]);
  }
  let hand = null; body.traverse((o) => { if (o.name === 'hand_r') hand = o; });
  let pistol = null;
  if (gunModel && hand) {
    pistol = gunModel.clone(true);
    const kill = []; pistol.traverse((o) => { if (o.isSprite || o.isLight || (o.isMesh && o.material && o.material.color && (o.material.color.getHex() === 0x3b4636 || o.material.color.getHex() === 0x1f2329))) kill.push(o); });; kill.forEach((o) => o.parent.remove(o));
    pistol.position.set(0, 0.02, 0.0); pistol.quaternion.set(0.6381, -0.0249, 0.0066, 0.7695); pistol.scale.setScalar(1);
    hand.add(pistol);
  }
  let knife = null;
  if (knifeModel && hand) { knife = knifeModel; knife.position.set(0, 0.02, 0); knife.quaternion.set(0.6381, -0.0249, 0.0066, 0.7695); knife.visible = false; hand.add(knife); }
  return { root, body, mixer, act, cur: { L: null, U: null }, mode: '', ov: 0, pistol, knife, hand, zombie: !!opts.zombie };
}

function layer(h, k, name, fade, once, ts) {
  const a = h.act[name] && h.act[name][k]; if (!a) return;
  const cur = h.cur[k];
  a.reset(); a.enabled = true; a.timeScale = ts; a.setEffectiveWeight(1);
  a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = once;
  if (cur && cur !== a) a.crossFadeFrom(cur, fade, false); else if (!cur) a.fadeIn(fade);
  a.play(); h.cur[k] = a;
}
function setBoth(h, name, fade, once, ts) { layer(h, 'L', name, fade, once, ts); layer(h, 'U', name, fade, once, ts); }

export function humanReset(h) { h.mixer.stopAllAction(); h.cur.L = h.cur.U = null; h.mode = ''; h.ov = 0; }
export function humanDie(h) { if (h.knife) { h.knife.visible = false; if (h.pistol) h.pistol.visible = true; } h.mode = 'dead'; h.ov = 0; setBoth(h, 'death', 0.08, true, 1.15); }
export function humanOverlay(h, name, ts = 1.3) { // Schuss/Nahkampf nur auf dem Oberkörper
  if (h.mode === 'dead' || h.mode.startsWith('slide')) return;
  if (h.zombie) { setBoth(h, name, 0.12, true, ts); h.ov = clips[name].dur / ts; h.mode = 'zatk'; return; }
  layer(h, 'U', name, 0.05, true, ts); h.ov = clips[name].dur / ts; h.ovName = name;
  if (name === 'punch' && h.knife) { h.knife.visible = true; if (h.pistol) h.pistol.visible = false; }
}
// speed: m/s, slideT: <0 = nicht am Rutschen, sprintArms: Sprint-Armhaltung
export function humanUpdate(h, dt, speed, slideT, sprintArms, ang = 0, air = false) {
  let rev = false, off = 0;
  if (h.mode !== 'dead' && slideT < 0 && speed > 0.8) {
    const aa = Math.abs(ang);
    if (aa > 1.9) { rev = true; off = (ang - Math.sign(ang) * Math.PI) * 0.5; } else off = THREE.MathUtils.clamp(ang, -1.1, 1.1) * 0.6;
  }
  h.off = (h.off || 0) + (off - (h.off || 0)) * Math.min(1, dt * 10);
  h.body.rotation.y = Math.PI + h.off;
  if (h.zombie && h.mode !== 'dead') {
    if (h.mode === 'zatk') { h.ov -= dt; if (h.ov <= 0) { h.mode = ''; h.ov = 0; } }
    else {
      const m = speed < 0.3 ? 'zidle' : 'zwalk';
      if (m !== h.mode) { h.mode = m; setBoth(h, m, 0.25, false, 1); }
      if (m === 'zwalk') { const t = THREE.MathUtils.clamp(speed / clips.zwalk.speed, 0.6, 3.4); h.cur.L.timeScale = t; h.cur.U.timeScale = t; }
    }
    h.body.rotation.y = Math.PI; h.mixer.update(dt); return;
  }
  if (h.mode !== 'dead') {
    let m;
    if (slideT >= 0) m = slideT < 0.8 ? 'slide_start' : 'slide_loop';
    else if (air && speed < 6.5) m = 'air';
    else m = speed < 0.4 ? 'idle' : speed < (h.zombie ? 3.0 : 2.2) ? 'walk' : speed > 6.3 ? 'sprint' : 'jog';
    const wasSlide = h.mode.startsWith('slide');
    if (m !== h.mode) {
      h.mode = m;
      if (m === 'air') setBoth(h, 'jump', 0.1, true, 1.5);
      else if (m === 'slide_start') setBoth(h, m, 0.1, true, 1.1);
      else if (m === 'slide_loop') setBoth(h, m, 0.15, false, 1);
      else if (m === 'air') { /* Sprungclip läuft schon */ }
      else { layer(h, 'L', m, wasSlide || h.wasAir ? 0.2 : 0.18, false, 1); h.ov = 0; h.upper = ''; }
      h.wasAir = m === 'air';
    }
    if (!m.startsWith('slide') && m !== 'air') {
      const ref = clips[m].speed;
      if (ref > 0 && h.cur.L) h.cur.L.timeScale = THREE.MathUtils.clamp(speed / ref, 0.5, m === 'walk' ? 3.2 : 1.6) * (rev ? -1 : 1);
      if (h.ov > 0) h.ov -= dt;
      else {
        if (h.knife && h.knife.visible) { h.knife.visible = false; if (h.pistol) h.pistol.visible = true; }
        const u = h.zombie ? 'idle' : (m === 'sprint' && sprintArms ? 'sprint' : 'pistol_idle');
        if (h.upper !== u) { h.upper = u; layer(h, 'U', u, 0.15, false, u === 'sprint' ? THREE.MathUtils.clamp(speed / clips.sprint.speed, 0.6, 1.4) : 1); }
      }
    }
  }
  h.mixer.update(dt);
}
// Zombie-Haltung: Arme nach vorn, Oberkörper gebeugt, Kopf schief, Schwanken (nach dem Mixer, als Zusatzrotation)
const ZP = { arm: [1.4, 0, 0], fore: [0.3, 0, 0], lean: [0.3, 0, 0], head: [0.25, 0, 0.3] };
const _q = new THREE.Quaternion(), _e = new THREE.Euler();
function addRot(b, v, w) { if (!b) return; _e.set(v[0], v[1], v[2]); _q.setFromEuler(_e); _q.slerp(new THREE.Quaternion(), 1 - w); b.quaternion.multiply(_q); }
function zombiePose(h, dt) {
  if (!h.zb) { h.zb = {}; h.body.traverse((o) => { if (o.isBone) h.zb[o.name] = o; }); h.zt = Math.random() * 6; h.zw = 0; }
  h.zt += dt;
  const target = h.mode === 'dead' || h.ov > 0 ? 0 : 1;
  h.zw += (target - h.zw) * Math.min(1, dt * 9);
  const w = h.zw; if (w < 0.01) return;
  const sw = Math.sin(h.zt * 2.1) * 0.12, sw2 = Math.sin(h.zt * 1.3 + 1) * 0.1;
  const b = h.zb, P = ZP;
  addRot(b.spine_02, [P.lean[0] + sw2, P.lean[1] + sw * 0.6, P.lean[2] + sw], w);
  addRot(b.upperarm_l, [P.arm[0] + sw2, P.arm[1] + sw, P.arm[2]], w); addRot(b.upperarm_r, [P.arm[0] - sw2, -P.arm[1] - sw, -P.arm[2]], w);
  addRot(b.lowerarm_l, P.fore, w); addRot(b.lowerarm_r, P.fore, w);
  addRot(b.neck_01, [P.head[0], sw * 0.8, P.head[2]], w);
}
