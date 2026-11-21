import * as THREE from 'three';
import phFloor from '../assets/tex/floor.jpg';
import phWall from '../assets/tex/wall.jpg';
import phCrate from '../assets/tex/crate.jpg';
import phMetal from '../assets/tex/metal.jpg';
import { Net } from './net.js';
import { setCamo, loadHuman, makeHuman, humanUpdate, humanDie, humanOverlay, humanReset } from './human.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

let last = performance.now();
// ---------- Einstellungen ----------
const HALF = 22;
const LIVES = 3;
const BOT_COUNT = 3;
const WALK = 5.0, SPRINT = 7.2;
const BOT_SPEED = 3.7;
const RADIUS = 0.4;
const EYE = 1.7;
const MELEE_RANGE = 1.9;
const GRAV = 24, JUMP = 7.4, SKIP = 0.12;

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const rnd = (a, b) => a + Math.random() * (b - a);
const V3 = THREE.Vector3;

// ---------- Audio ----------
let actx = null;
function beep(freq, dur, type = 'square', vol = 0.08, slide = 0) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), actx.currentTime + dur);
    g.gain.value = vol; g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
    o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + dur);
  } catch (e) { /* Audio optional */ }
}
function noise(dur, vol = 0.1, lp = 3000) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const n = Math.floor(actx.sampleRate * dur), buf = actx.createBuffer(1, n, actx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
    s.buffer = buf; f.type = 'lowpass'; f.frequency.value = lp; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(actx.destination); s.start();
  } catch (e) { /* Audio optional */ }
}
// ---------- Sounds aus "Are You Dead Yet?" (zur Laufzeit aus ../zombies/ geladen, sonst synthetisch) ----------
const SFXBASE = new URL('../zombies/sfx/', location.href).href, MUSBASE = new URL('../zombies/music/', location.href).href;
const SMAP = {
  shot: ['pistol_shot_1', 'pistol_shot_2', 'pistol_shot_3'], botshot: ['pistol_shot_1', 'pistol_shot_2', 'pistol_shot_3'],
  click: ['gun_empty_1', 'gun_empty_2'], reload: ['reload_pistol_1', 'reload_pistol_2', 'reload_pistol_3'],
  melee: ['knife_swing', 'swing_whoosh_1'], stab: ['knife_hit_1', 'knife_hit_2'], kill: ['headshot_1', 'headshot_2'], pickup: ['ammo_refill'],
  hurt: ['player_hurt_1', 'player_hurt_2', 'player_hurt_3', 'player_hurt_4'], step: ['step_asphalt_1', 'step_asphalt_2', 'step_asphalt_3', 'step_asphalt_4'],
  land: ['land'], jump: ['swing_whoosh_2'], groan: ['zombie_groan_1', 'zombie_groan_2', 'zombie_groan_3', 'zombie_groan_4'],
  zatk: ['zombie_attack_1', 'zombie_attack_2', 'zombie_attack_3', 'zombie_attack_4'], zdie: ['zombie_die_1', 'zombie_die_2', 'zombie_die_3', 'zombie_die_4'],
  zhit: ['zombie_hit_1', 'zombie_hit_2', 'zombie_hit_3'], headshot: ['headshot_bone_1', 'headshot_bone_2'], wave: ['wave_bell'], over: ['game_over'], go: ['round_start'], ui: ['ui_select'],
  wind: ['wind_loop'],
};
const SBUF = {}; let sampStarted = false;
function loadSamples() {
  if (sampStarted) return; sampStarted = true;
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  for (const n of new Set(Object.values(SMAP).flat())) {
    fetch(SFXBASE + n + '.mp3').then((r) => (r.ok ? r.arrayBuffer() : null)).then((b) => (b ? actx.decodeAudioData(b) : null)).then((buf) => { if (buf) SBUF[n] = buf; }).catch(() => {});
  }
}
const sampLast = {};
function samp(key, vol = 1, rate = 1, pan = 0, minGap = 0.03) {
  const list = SMAP[key]; if (!list || !actx) return false;
  const t = performance.now() / 1000; if (t - (sampLast[key] || -9) < minGap) return true;
  const ok = list.filter((n) => SBUF[n]); if (!ok.length) return false;
  sampLast[key] = t;
  try {
    const src = actx.createBufferSource(), g = actx.createGain(); src.buffer = SBUF[ok[(Math.random() * ok.length) | 0]];
    src.playbackRate.value = rate * (0.96 + Math.random() * 0.08); g.gain.value = vol * (cfg.sfxVol ?? 1);
    src.connect(g);
    if (actx.createStereoPanner) { const pn = actx.createStereoPanner(); pn.pan.value = clamp(pan, -1, 1); g.connect(pn); pn.connect(actx.destination); } else g.connect(actx.destination);
    src.start();
  } catch (e) { return false; }
  return true;
}
// Musik: Menü-Stück und ruhige Spiel-Stücke als Stream
const music = { el: null, cur: '' };
function musicPlay(file, vol) {
  if (music.cur === file && music.el) { music.el.volume = vol * (cfg.musVol ?? 0.5); return; }
  try {
    if (music.el) { music.el.pause(); }
    const a = new Audio(MUSBASE + file); a.loop = file === 'menu.mp3'; a.volume = vol * (cfg.musVol ?? 0.5);
    if (file !== 'menu.mp3') a.addEventListener('ended', () => musicPlay('slow' + (1 + ((Math.random() * 10) | 0)) + '.mp3', 0.5));
    a.play().catch(() => {}); music.el = a; music.cur = file;
  } catch (e) { /* Audio optional */ }
}
function musicStop() { if (music.el) { music.el.pause(); music.el = null; music.cur = ''; } }
const pn = (x, z) => { const dx = x - camera.position.x, dz = z - camera.position.z, a = Math.atan2(dx, -dz) - camera.rotation.y; return Math.sin(a) * 0.8; };
const sfx = {
  shot: () => { if (!samp('shot', 0.8)) { noise(0.25, 0.22, 4500); beep(140, 0.2, 'sawtooth', 0.12, -90); } },
  botshot: (vol, x, z) => { if (!samp('botshot', 0.55 * vol, 0.95, x === undefined ? 0 : pn(x, z))) noise(0.2, 0.08 * vol, 2500); },
  click: () => { if (!samp('click', 0.6)) beep(1400, 0.03, 'square', 0.05); },
  reload: () => { if (!samp('reload', 0.7)) beep(900, 0.04, 'square', 0.05); },
  melee: () => { if (!samp('melee', 0.7)) { noise(0.12, 0.12, 1500); beep(240, 0.1, 'triangle', 0.08, -140); } },
  stab: () => samp('stab', 0.8),
  kill: () => { if (!samp('kill', 0.7)) { beep(520, 0.1, 'square', 0.07); setTimeout(() => beep(780, 0.12, 'square', 0.07), 90); } },
  pickup: () => { if (!samp('pickup', 0.8)) sfx.kill(); },
  hurt: () => { if (!samp('hurt', 0.9)) beep(120, 0.35, 'sawtooth', 0.12, -70); },
  step: () => { if (!samp('step', 0.35, 1, 0, 0.12)) noise(0.05, 0.05, 700); },
  land: () => { if (!samp('land', 0.5)) noise(0.09, 0.09, 600); },
  jump: () => { if (!samp('jump', 0.25, 1.2)) noise(0.06, 0.04, 900); },
  groan: (v, x, z) => { if (!samp('groan', 0.9 * v, 1, x === undefined ? 0 : pn(x, z), 0.4)) { beep(rnd(70, 110), 0.7, 'sawtooth', 0.05 * v, -25); noise(0.5, 0.025 * v, 500); } },
  zatk: () => samp('zatk', 0.9, 1, 0, 0.2), zdie: (x, z) => samp('zdie', 0.8, 1, pn(x, z), 0.1), zhit: (x, z) => samp('zhit', 0.7, 1, pn(x, z), 0.05),
  head: () => samp('headshot', 0.7), wave: () => samp('wave', 0.9), over: () => samp('over', 0.9), go: () => samp('go', 0.7), ui: () => samp('ui', 0.6),
};

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: devicePixelRatio < 1.5, powerPreference: 'high-performance' });
let pr = Math.min(devicePixelRatio, 1.25);
renderer.setPixelRatio(pr);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);
const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

const scene = new THREE.Scene();
const FOG = 0x8d93a3;
scene.fog = new THREE.Fog(FOG, 22, 95);
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.05, 200);
camera.rotation.order = 'YXZ';
scene.add(camera);

// Umgebungslicht (PBR-Reflexionen)
{
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;
}

// Himmel
{
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { time: { value: 0 }, top: { value: new THREE.Color(0x21407f) }, mid: { value: new THREE.Color(0x6f95c6) }, hor: { value: new THREE.Color(0xf0c8a4) } },
    vertexShader: 'varying vec3 vP; varying vec3 vW; void main(){ vP = position; vW = (modelMatrix*vec4(position,1.0)).xyz; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `varying vec3 vP; varying vec3 vW; uniform float time; uniform vec3 top; uniform vec3 mid; uniform vec3 hor;
      float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
      float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; } return s; }
      void main(){
        vec3 d = normalize(vW - cameraPosition); float h = max(d.y, 0.0);
        vec3 sd = normalize(vec3(-0.55, 0.22, 0.45)); float sg = max(dot(d, sd), 0.0);
        // Verlauf: warmer Dunst am Horizont, tiefes Blau im Zenit
        vec3 c = mix(hor, mid, smoothstep(0.0, 0.32, h)); c = mix(c, top, smoothstep(0.18, 0.95, h));
        c += vec3(1.0, 0.62, 0.30) * pow(sg, 6.0) * 0.28 + vec3(1.0, 0.78, 0.50) * pow(sg, 40.0) * 0.45 + vec3(1.0, 0.92, 0.75) * pow(sg, 900.0) * 1.8;
        // Wolken: zwei ebene Schichten, weich, mit Licht von der Sonnenseite; Bewegung des Spielers verschiebt sie unterschiedlich stark (Parallax)
        vec2 sxz = normalize(sd.xz);
        vec2 pA = d.xz / (h + 0.38) * 0.85 + vec2(time * 0.0016, 0.0) + cameraPosition.xz * 0.0030;
        float nA = fbm(pA * 1.35), nA2 = fbm(pA * 1.35 + sxz * 0.09);
        float dA = smoothstep(0.46, 0.76, nA);
        float litA = clamp(0.55 + (nA - nA2) * 5.5, 0.0, 1.0);
        vec3 cA = mix(vec3(0.46, 0.50, 0.64), vec3(1.0, 0.86, 0.72), litA);
        cA = mix(cA, vec3(1.0, 0.70, 0.50), pow(sg, 3.0) * 0.45);
        c = mix(c, cA, dA * smoothstep(0.03, 0.32, h) * 0.92);
        vec2 pB = (mat2(0.8, -0.6, 0.6, 0.8) * d.xz) / (h + 0.38) * 1.7 + vec2(time * -0.0030, 3.7) + cameraPosition.xz * 0.0075;
        float nB = fbm(pB * 1.2), dB = smoothstep(0.58, 0.86, nB);
        c = mix(c, mix(vec3(0.62, 0.66, 0.80), vec3(1.0, 0.90, 0.80), 0.35 + 0.4 * sg), dB * smoothstep(0.06, 0.4, h) * 0.45);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), mat);
  scene.add(sky); window.__skyMat = mat;
  scene.background = new THREE.Color(FOG);
}

// Licht
scene.add(new THREE.HemisphereLight(0xaec4ee, 0x4a3f38, 0.55));
const sun = new THREE.DirectionalLight(0xffd7a8, 2.6);
sun.position.set(-26, 18, 22);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 80 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
scene.add(sun);

// ---------- Prozedurale Texturen ----------
const PH = {};   // geladene KI-Fotos (asynchron); Canvas-Texturen werden danach neu gezeichnet
const TEXLIST = [], PBRLIST = [];
function mkCanvas(size, fn) { const c = document.createElement('canvas'); c.width = c.height = size; fn(c.getContext('2d'), size); TEXLIST.push({ c, fn, size }); return c; }
function photo(g, s, name, o = {}) {
  const im = PH[name]; if (!im) return false;
  g.save(); if (o.blend) g.globalCompositeOperation = o.blend; g.globalAlpha = o.alpha ?? 1;
  if (o.crop) { const [x, y, w, h] = o.crop; g.drawImage(im, x * im.width, y * im.height, w * im.width, h * im.height, 0, 0, s, s); } else g.drawImage(im, 0, 0, s, s);
  g.restore(); return true;
}
function speckle(g, s, n, lo, hi, a) {
  for (let i = 0; i < n; i++) { const v = rnd(lo, hi) | 0; g.fillStyle = `rgba(${v},${v},${v},${a})`; const z = rnd(1, 3); g.fillRect(rnd(0, s), rnd(0, s), z, z); }
}
function stains(g, s, n, a) {
  for (let i = 0; i < n; i++) {
    const x = rnd(0, s), y = rnd(0, s), r = rnd(20, 70), gr = g.createRadialGradient(x, y, 2, x, y, r);
    gr.addColorStop(0, `rgba(30,30,30,${a})`); gr.addColorStop(1, 'rgba(30,30,30,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
}
function tex(canvas, srgb = true) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = maxAniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// Nahtlos kachelnde Rauschtexturen (Value-Noise mit ganzzahligen Gittern) für Materialdetails
function vnoise(s, fx, fy) {
  const L = new Float32Array(fx * fy); for (let i = 0; i < L.length; i++) L[i] = Math.random();
  const out = new Float32Array(s * s), sx = fx / s, sy = fy / s;
  for (let y = 0; y < s; y++) {
    const gy = y * sy, y0 = gy | 0, ty = gy - y0, wy = ty * ty * (3 - 2 * ty), ra = (y0 % fy) * fx, rb = ((y0 + 1) % fy) * fx;
    for (let x = 0; x < s; x++) {
      const gx = x * sx, x0 = gx | 0, tx = gx - x0, wx = tx * tx * (3 - 2 * tx), xa = x0 % fx, xb = (x0 + 1) % fx;
      const a = L[ra + xa] + (L[ra + xb] - L[ra + xa]) * wx, b = L[rb + xa] + (L[rb + xb] - L[rb + xa]) * wx;
      out[y * s + x] = a + (b - a) * wy;
    }
  }
  return out;
}
function fbmTile(s, f, oct, fyMul = 1) {
  const acc = new Float32Array(s * s); let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++) { const n = vnoise(s, f << o, Math.max(1, Math.round((f * fyMul)) << o)); for (let i = 0; i < acc.length; i++) acc[i] += n[i] * amp; tot += amp; amp *= 0.5; }
  for (let i = 0; i < acc.length; i++) acc[i] /= tot; return acc;
}
function noiseLayer(s, kind) {
  const c = document.createElement('canvas'); c.width = c.height = s; const g = c.getContext('2d'), img = g.createImageData(s, s), o = img.data;
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  let v;
  if (kind === 'concrete') {
    const a = fbmTile(s, 3, 6), grain = vnoise(s, s >> 1, s >> 1), fine = vnoise(s, s >> 2, s >> 2), pit = fbmTile(s, 48, 2), blot = fbmTile(s, 6, 3);
    v = (i) => clamp01(0.5 + (a[i] - 0.5) * 0.8 + (blot[i] - 0.5) * 0.3 + (grain[i] - 0.5) * 0.22 + (fine[i] - 0.5) * 0.22 - Math.max(0, pit[i] - 0.68) * 1.0);
  } else if (kind === 'wood') {
    const g1 = vnoise(s, 110, 5), g2 = vnoise(s, 38, 3), w = fbmTile(s, 4, 4), kn = fbmTile(s, 5, 3, 1.2);
    v = (i) => clamp01(0.5 + (g1[i] - 0.5) * 0.7 + (g2[i] - 0.5) * 0.6 + (w[i] - 0.5) * 0.5 - Math.max(0, kn[i] - 0.66) * 1.4);
  } else { // metal: gebürstet, Lackabplatzer
    const br = vnoise(s, s >> 1, 6), br2 = vnoise(s, 90, 3), a = fbmTile(s, 4, 5), chip = fbmTile(s, 14, 4);
    v = (i) => clamp01(0.5 + (br[i] - 0.5) * 0.35 + (br2[i] - 0.5) * 0.3 + (a[i] - 0.5) * 0.7 - Math.max(0, chip[i] - 0.66) * 0.9);
  }
  for (let i = 0; i < s * s; i++) { const k = v(i) * 255; o[i * 4] = o[i * 4 + 1] = o[i * 4 + 2] = k; o[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0); return c;
}
function noiseOver(g, s, kind, a = 1) {
  g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = a; g.drawImage(noiseLayer(s, kind), 0, 0); g.restore();
}
// Aus dem Farbbild werden Normal- und Rauheits-Map abgeleitet (Sobel auf der Helligkeit, nahtlos kachelnd)
function heightOf(canvas, blur) {
  const s = canvas.width, d = canvas.getContext('2d').getImageData(0, 0, s, s).data, h = new Float32Array(s * s);
  for (let i = 0; i < s * s; i++) h[i] = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) / 255;
  let a = h, b = new Float32Array(s * s);
  for (let it = 0; it < blur; it++) {
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) { const i = y * s + x; b[i] = (a[i] * 2 + a[y * s + ((x + 1) % s)] + a[y * s + ((x + s - 1) % s)] + a[((y + 1) % s) * s + x] + a[((y + s - 1) % s) * s + x]) / 6; }
    const t = a; a = b; b = t;
  }
  return a;
}
function normalFrom(canvas, strength = 2.2, blur = 1) {
  const s = canvas.width, h = heightOf(canvas, blur), c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d'), img = g.createImageData(s, s), o = img.data;
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const xl = (x + s - 1) % s, xr = (x + 1) % s, yu = (y + s - 1) % s, yd = (y + 1) % s;
    const dx = (h[y * s + xr] - h[y * s + xl]) * strength, dy = (h[yd * s + x] - h[yu * s + x]) * strength;
    const l = Math.hypot(dx, dy, 1), i = (y * s + x) * 4;
    o[i] = (-dx / l * 0.5 + 0.5) * 255; o[i + 1] = (dy / l * 0.5 + 0.5) * 255; o[i + 2] = (1 / l * 0.5 + 0.5) * 255; o[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); return c;
}
function roughFrom(canvas, lo = 0.62, hi = 1.0) {
  const s = canvas.width, h = heightOf(canvas, 1), c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d'), img = g.createImageData(s, s), o = img.data;
  for (let i = 0; i < s * s; i++) { const v = (lo + (hi - lo) * (1 - Math.min(1, Math.max(0, (h[i] - 0.15) * 1.5)))) * 255; o[i * 4] = o[i * 4 + 1] = o[i * 4 + 2] = v; o[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0); return c;
}
// Komplettes Material aus einem Farbbild: Farbe + Normal + Rauheit
function pbr(canvas, o = {}) {
  const map = tex(canvas), normalMap = tex(normalFrom(canvas, o.bump ?? 2.2, o.blur ?? 1), false), roughnessMap = tex(roughFrom(canvas, o.rlo ?? 0.62, o.rhi ?? 1.0), false);
  const m = new THREE.MeshStandardMaterial({ map, normalMap, roughnessMap, roughness: 1, metalness: o.metal ?? 0 });
  m.normalScale.set(o.ns ?? 1, o.ns ?? 1);
  m.userData.texs = [map, normalMap, roughnessMap];
  PBRLIST.push({ canvas, m, o });
  return m;
}
function macro(g, s, alpha, dark = 40, light = 220) {
  const n = 12, c = document.createElement('canvas'); c.width = c.height = n; const cg = c.getContext('2d');
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const v = rnd(dark, light) | 0; cg.fillStyle = `rgb(${v},${v},${v})`; cg.fillRect(x, y, 1, 1); }
  g.save(); g.globalAlpha = alpha; g.imageSmoothingEnabled = true; g.drawImage(c, 0, 0, s, s); g.restore();
}
function cracks(g, s, n, a = 0.5) {
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    let x = rnd(0, s), y = rnd(0, s), ang = rnd(0, 6.28);
    g.strokeStyle = `rgba(15,15,18,${a})`; g.lineWidth = rnd(0.8, 1.8); g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < rnd(8, 22); k++) { ang += rnd(-0.7, 0.7); x += Math.cos(ang) * rnd(4, 10); y += Math.sin(ang) * rnd(4, 10); g.lineTo(x, y); }
    g.stroke();
  }
}
function pores(g, s, n) {
  for (let i = 0; i < n; i++) { g.fillStyle = `rgba(20,20,24,${rnd(0.15, 0.5)})`; g.beginPath(); g.arc(rnd(0, s), rnd(0, s), rnd(0.6, 2.2), 0, 7); g.fill(); }
}
function dirtBottom(g, s, h = 0.35, a = 0.4) {
  const gr = g.createLinearGradient(0, s, 0, s * (1 - h)); gr.addColorStop(0, `rgba(25,20,15,${a})`); gr.addColorStop(1, 'rgba(25,20,15,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s);
}
function rust(g, s, n, a = 0.35) {
  for (let i = 0; i < n; i++) {
    const x = rnd(0, s), y = rnd(0, s), r = rnd(8, 34), gr = g.createRadialGradient(x, y, 1, x, y, r);
    gr.addColorStop(0, `rgba(140,70,25,${a})`); gr.addColorStop(1, 'rgba(140,70,25,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
}
function hazard(g, x, y, w, h) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.fillStyle = '#d9b22a'; g.fillRect(x, y, w, h); g.fillStyle = '#1b1b1d';
  for (let i = -h; i < w + h; i += 36) { g.beginPath(); g.moveTo(x + i, y + h); g.lineTo(x + i + 18, y + h); g.lineTo(x + i + 18 + h, y); g.lineTo(x + i + h, y); g.closePath(); g.fill(); }
  g.restore();
}
const concreteC = mkCanvas(512, (g, s) => {
  g.fillStyle = '#9b9ea4'; g.fillRect(0, 0, s, s);
  if (photo(g, s, 'floor', { crop: [0.1, 0.1, 0.5, 0.5] })) { g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, 0, s, s); } else { noiseOver(g, s, 'concrete', 0.8); macro(g, s, 0.12); speckle(g, s, 14000, 70, 215, 0.2); pores(g, s, 260); stains(g, s, 8, 0.14); cracks(g, s, 3, 0.35); }
  g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 3; g.strokeRect(5, 5, s - 10, s - 10);
  g.strokeStyle = 'rgba(15,15,20,.65)'; g.lineWidth = 5; g.strokeRect(1, 1, s - 2, s - 2);
  g.fillStyle = 'rgba(20,20,24,.55)'; for (const [x, y] of [[s * 0.25, s * 0.25], [s * 0.75, s * 0.25], [s * 0.25, s * 0.75], [s * 0.75, s * 0.75]]) { g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 2; g.stroke(); }
  dirtBottom(g, s, 0.25, 0.3);
});
const floorC = mkCanvas(1024, (g, s) => {
  g.fillStyle = '#6f737b'; g.fillRect(0, 0, s, s);
  const hasPh = photo(g, s, 'floor');
  if (!hasPh) { noiseOver(g, s, 'concrete', 0.8); macro(g, s, 0.14, 30, 200); speckle(g, s, 120000, 50, 190, 0.2); pores(g, s, 1400);
  stains(g, s, 40, 0.22); cracks(g, s, 16, 0.4); }
  for (let i = 0; i < (hasPh ? 0 : 3); i++) { const x = rnd(40, s - 40), y = rnd(40, s - 40), r = rnd(20, 50), gr = g.createRadialGradient(x, y, 2, x, y, r); gr.addColorStop(0, 'rgba(10,10,14,.55)'); gr.addColorStop(0.7, 'rgba(10,10,14,.25)'); gr.addColorStop(1, 'rgba(10,10,14,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  for (const [ox, oy] of [[0, 0], [s / 2, 0], [0, s / 2], [s / 2, s / 2]]) {   // vier Platten je Kachel
    g.strokeStyle = 'rgba(15,15,20,.8)'; g.lineWidth = 6; g.strokeRect(ox, oy, s / 2, s / 2);
    g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 2; g.strokeRect(ox + 5, oy + 5, s / 2 - 10, s / 2 - 10);
    g.strokeStyle = 'rgba(15,15,20,.3)'; g.lineWidth = 2; g.beginPath(); g.moveTo(ox + s / 4, oy); g.lineTo(ox + s / 4, oy + s / 2); g.moveTo(ox, oy + s / 4); g.lineTo(ox + s / 2, oy + s / 4); g.stroke();
  }
});
const wallC = mkCanvas(512, (g, s) => {
  g.fillStyle = '#867a6f'; g.fillRect(0, 0, s, s);
  if (!photo(g, s, 'wall')) { noiseOver(g, s, 'concrete', 0.8); macro(g, s, 0.12); speckle(g, s, 12000, 60, 205, 0.2); pores(g, s, 200); stains(g, s, 10, 0.2); }
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, s, 50); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, 50, s, 3);
  hazard(g, 0, s - 54, s, 30);
  for (const x of [34, s - 34]) { for (const y of [24, s - 90]) { const gr = g.createLinearGradient(0, y, 0, y + 150); gr.addColorStop(0, 'rgba(120,60,25,.45)'); gr.addColorStop(1, 'rgba(120,60,25,0)'); g.fillStyle = gr; g.fillRect(x - 5, y, 10, 150); g.fillStyle = '#2a2724'; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(x - 2, y - 2, 2.5, 0, 7); g.fill(); } }
  dirtBottom(g, s, 0.3, 0.45);
  g.strokeStyle = 'rgba(18,16,14,.7)'; g.lineWidth = 5; g.strokeRect(0, 0, s, s);
});
const crateC = mkCanvas(512, (g, s) => {
  const pw = s / 5, hasPh = photo(g, s, 'crate');
  for (let i = 0; i < (hasPh ? 0 : 5); i++) {
    const v = rnd(-14, 14); g.fillStyle = `rgb(${168 + v},${118 + v},${66 + v})`; g.fillRect(i * pw, 0, pw, s);
    for (let k = 0; k < 70; k++) { g.strokeStyle = `rgba(70,38,12,${rnd(0.06, 0.22)})`; g.lineWidth = rnd(0.6, 1.6); const x = i * pw + rnd(3, pw - 3); g.beginPath(); g.moveTo(x, rnd(0, s)); g.bezierCurveTo(x + rnd(-4, 4), rnd(0, s), x + rnd(-4, 4), rnd(0, s), x + rnd(-3, 3), rnd(0, s)); g.stroke(); }
    if (Math.random() < 0.7) { const kx = i * pw + rnd(14, pw - 14), ky = rnd(60, s - 60); g.fillStyle = 'rgba(60,32,10,.55)'; g.beginPath(); g.ellipse(kx, ky, 7, 11, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(60,32,10,.3)'; g.lineWidth = 2; g.beginPath(); g.ellipse(kx, ky, 12, 18, 0, 0, 7); g.stroke(); }
    g.fillStyle = 'rgba(30,15,5,.6)'; g.fillRect(i * pw, 0, 3, s);
  }
  if (!hasPh) { noiseOver(g, s, 'wood', 0.7);
  g.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < 5; i++) g.fillRect(i * pw + 4, 0, 3, s); }
  g.strokeStyle = '#5c3b1a'; g.lineWidth = 34; g.strokeRect(17, 17, s - 34, s - 34);
  g.strokeStyle = 'rgba(255,220,170,.22)'; g.lineWidth = 3; g.strokeRect(2, 2, s - 4, s - 4); g.strokeRect(34, 34, s - 68, s - 68);
  g.strokeStyle = '#583717'; g.lineWidth = 26; g.beginPath(); g.moveTo(24, 24); g.lineTo(s - 24, s - 24); g.moveTo(s - 24, 24); g.lineTo(24, s - 24); g.stroke();
  g.strokeStyle = 'rgba(255,220,170,.16)'; g.lineWidth = 3; g.beginPath(); g.moveTo(24, 12); g.lineTo(s - 12, s - 24); g.stroke();
  g.fillStyle = '#25180a'; for (const [x, y] of [[22, 22], [s - 22, 22], [22, s - 22], [s - 22, s - 22], [s / 2, s / 2]]) { g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.arc(x - 1.5, y - 1.5, 2, 0, 7); g.fill(); g.fillStyle = '#25180a'; }
  g.save(); g.translate(s * 0.5, s * 0.5); g.rotate(-0.05); g.fillStyle = 'rgba(235,225,200,.55)'; g.font = 'bold 54px Arial Black, Impact, sans-serif'; g.textAlign = 'center'; g.fillText('FRAGILE', 0, 70); g.restore();
  speckle(g, s, 3000, 0, 120, 0.12); dirtBottom(g, s, 0.25, 0.3);
});
function containerC(color) {
  return mkCanvas(512, (g, s) => {
    g.fillStyle = color; g.fillRect(0, 0, s, s);
    const hasPh = photo(g, s, 'metal', { blend: 'luminosity' });
    if (hasPh) { g.globalAlpha = 0.35; photo(g, s, 'metal', { blend: 'soft-light' }); g.globalAlpha = 1; }
    for (let x = 0; x < s; x += 26) { g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x, 0, 9, s); g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(x + 9, 0, 4, s); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x + 13, 0, 3, s); }
    if (!hasPh) { noiseOver(g, s, 'metal', 0.7); macro(g, s, 0.1); speckle(g, s, 9000, 0, 130, 0.2); stains(g, s, 6, 0.28); }
    g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(0, 0, s, 22); g.fillRect(0, s - 22, s, 22);
    g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(0, 22, s, 3); g.fillRect(0, s - 25, s, 3);
    g.fillStyle = 'rgba(15,15,18,.85)'; for (const [x, y] of [[0, 0], [s - 36, 0], [0, s - 36], [s - 36, s - 36]]) g.fillRect(x, y, 36, 36);
    g.fillStyle = 'rgba(245,245,235,.82)'; g.font = 'bold 44px Arial Black, Impact, sans-serif'; g.textAlign = 'left'; g.fillText('GDR 4021 7', 60, 110); g.font = 'bold 22px Arial, sans-serif'; g.fillText('22G1  MAX 30480 KG', 62, 142);
    g.fillStyle = 'rgba(245,245,235,.55)'; g.fillRect(60, 160, 140, 6);
    if (!hasPh) rust(g, s, 10, 0.4); g.fillStyle = 'rgba(190,190,195,.22)'; for (let i = 0; i < 40; i++) { g.save(); g.translate(rnd(0, s), rnd(0, s)); g.rotate(rnd(0, 3)); g.fillRect(0, 0, rnd(10, 60), 1.5); g.restore(); }
    dirtBottom(g, s, 0.3, 0.45);
  });
}
const barrelC = (color) => mkCanvas(256, (g, s) => {
  g.fillStyle = color; g.fillRect(0, 0, s, s);
  if (photo(g, s, 'metal', { blend: 'overlay', alpha: 0.8, crop: [0.1, 0.1, 0.5, 0.5] })) { /* Foto */ } else { noiseOver(g, s, 'metal', 0.7); macro(g, s, 0.1); speckle(g, s, 2600, 0, 140, 0.25); rust(g, s, 6, 0.4); }
  for (const y of [14, 70, 186, 236]) { g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, y, s, 10); g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(0, y + 10, s, 3); }
  g.fillStyle = 'rgba(240,235,220,.85)'; g.fillRect(0, 100, s, 62); g.fillStyle = '#1a1a1c'; g.font = 'bold 40px Arial Black, Impact, sans-serif'; g.textAlign = 'center'; g.fillText('FUEL', s / 4, 146); g.fillText('FUEL', s * 0.75, 146);
  g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(40, 0, 10, s); dirtBottom(g, s, 0.3, 0.4);
  for (let i = 0; i < 24; i++) { g.strokeStyle = 'rgba(210,210,215,.3)'; g.lineWidth = 1; g.beginPath(); const x = rnd(0, s), y = rnd(0, s); g.moveTo(x, y); g.lineTo(x + rnd(-20, 20), y + rnd(-8, 8)); g.stroke(); }
});

const mats = {
  floor: pbr(floorC, { bump: 3.2, blur: 1, ns: 1.1, rlo: 0.7 }),
  concrete: pbr(concreteC, { bump: 2.6, ns: 1.0, rlo: 0.7 }),
  wall: pbr(wallC, { bump: 3.0, ns: 1.1, rlo: 0.72 }),
  crate: pbr(crateC, { bump: 4.2, blur: 0, ns: 1.2, rlo: 0.55, rhi: 0.9 }),
};
mats.floor.color.setScalar(0.8); mats.concrete.color.setScalar(0.88);
mats.floor.userData.texs.forEach((t) => t.repeat.set(HALF / 4, HALF / 4));

// KI-Fotos laden und danach alle Texturen neu zeichnen
{
  const load = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  Promise.all([['floor', phFloor], ['wall', phWall], ['crate', phCrate], ['metal', phMetal]].map(([k, src]) => load(src).then((im) => { PH[k] = im; }))).then(() => {
    for (const t of TEXLIST) { const g = t.c.getContext('2d'); g.clearRect(0, 0, t.size, t.size); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; t.fn(g, t.size); }
    for (const { canvas, m, o } of PBRLIST) {
      const [map, nm, rm] = m.userData.texs; map.needsUpdate = true;
      nm.image = normalFrom(canvas, o.bump ?? 2.2, o.blur ?? 1); nm.needsUpdate = true;
      rm.image = roughFrom(canvas, o.rlo ?? 0.62, o.rhi ?? 1.0); rm.needsUpdate = true;
    }
    // Skyline: prozedurale Silhouetten in drei Entfernungen, oben transparent (Dunst nach unten)
    {
      const city = (seed, hMin, hMax, col, glow, win) => {
        let sd = seed; const R = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
        const c = document.createElement('canvas'); c.width = 2048; c.height = 256; const g = c.getContext('2d');
        let x = 0;
        while (x < c.width) {
          const w = 36 + R() * 90 | 0, hh = hMin + R() * (hMax - hMin), y = c.height - hh;
          const gr = g.createLinearGradient(0, y, 0, c.height); gr.addColorStop(0, col[0]); gr.addColorStop(1, col[1]);
          g.fillStyle = gr; g.fillRect(x, y, Math.min(w, c.width - x), hh);
          if (R() < 0.35) { const w2 = w * (0.4 + R() * 0.3); g.fillRect(x + (w - w2) / 2, y - 14 - R() * 26, w2, 40); }
          if (R() < 0.18) g.fillRect(x + w / 2 - 1, y - 38 - R() * 24, 2, 40);
          if (win) { g.fillStyle = glow; for (let wy = y + 8; wy < c.height - 6; wy += 9) for (let wx = x + 5; wx < x + w - 5; wx += 8) if (R() < 0.28) g.fillRect(wx, wy, 3, 4); }
          x += w + (R() < 0.3 ? 6 + R() * 18 : 0);
        }
        g.globalCompositeOperation = 'destination-out'; const fade = g.createLinearGradient(0, c.height * 0.8, 0, c.height); fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
        g.fillStyle = fade; g.fillRect(0, c.height * 0.8, c.width, c.height * 0.2); g.globalCompositeOperation = 'source-over';
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = maxAniso; return t;
      };
      const mkRing = (r, hgt, tex, y, ro) => {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, hgt, 64, 1, true), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, transparent: true, depthWrite: false, fog: false, toneMapped: false }));
        m.position.y = y; m.renderOrder = ro; scene.add(m); return m;
      };
      scene.remove(skylineBoxes);
      window.__rings = [
        [mkRing(175, 64, city(11, 70, 165, ['#a9a3b4', '#d6b9a4'], '', false), 26, -3), 0.97],
        [mkRing(112, 52, city(23, 60, 175, ['#7b7f9a', '#b3a2a2'], '#ffd9a0', true), 20, -2), 0.8],
        [mkRing(60, 36, city(37, 55, 150, ['#444b64', '#7d7284'], '#ffcf8a', true), 12, -1), 0.4],
      ];
    }

  });
}
const containerMats = {};
function containerMat(color) {
  if (!containerMats[color]) { containerMats[color] = pbr(containerC(color), { bump: 4.5, blur: 0, ns: 1.3, rlo: 0.4, rhi: 0.8, metal: 0.5 }); }
  return containerMats[color];
}
const TILE = { concrete: 2, wall: 4.2, crate: 1.5, container: 2.4 };

function boxGeo(w, h, d, tile) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, (uv.getX(k) * dims[f][0]) / tile, (uv.getY(k) * dims[f][1]) / tile); }
  return g;
}

// Boden
const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2), mats.floor);
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
scene.add(floor);
// Markierungen
{
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xe0b73a, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const addLine = (x, z, w, d) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lineMat); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.012, z); m.receiveShadow = true; scene.add(m); };
  for (let z = -20; z <= 20; z += 2) if (Math.abs(z) > 3) addLine(0, z, 0.18, 1.0);
  for (let x = -20; x <= 20; x += 2) if (Math.abs(x) > 3) addLine(x, 0, 1.0, 0.18);
  const ring = new THREE.Mesh(new THREE.RingGeometry(4.9, 5.1, 64), lineMat);
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.012; scene.add(ring);
}

// ---------- Hindernisse ----------
const boxes = []; // Kollision
function addCollider(x, z, w, d, h) {
  boxes.push({ x, z, hw: w / 2, hd: d / 2, top: h, box: new THREE.Box3(new V3(x - w / 2, 0, z - d / 2), new V3(x + w / 2, h, z + d / 2)) });
}
function addBox(x, z, w, d, h, type, color) {
  const mat = type === 'container' ? containerMat(color) : mats[type];
  const m = new THREE.Mesh(boxGeo(w, h, d, TILE[type]), mat);
  m.position.set(x, h / 2, z); m.castShadow = true; m.receiveShadow = true;
  scene.add(m); addCollider(x, z, w, d, h);
  return m;
}
function addBarrel(x, z, color) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.1, 20), pbr(barrelC(color), { bump: 3.5, blur: 0, rlo: 0.35, rhi: 0.7, metal: 0.6 }));
  m.position.set(x, 0.55, z); m.castShadow = true; m.receiveShadow = true; scene.add(m);
  addCollider(x, z, 0.8, 0.8, 1.1);
}
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,235,190,1)'); gr.addColorStop(0.25, 'rgba(255,205,130,.55)'); gr.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const coneTex = (() => { const c = document.createElement('canvas'); c.width = 8; c.height = 128; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, 'rgba(255,225,170,.5)'); gr.addColorStop(1, 'rgba(255,225,170,0)'); g.fillStyle = gr; g.fillRect(0, 0, 8, 128); return new THREE.CanvasTexture(c); })();
const addMat = (o) => new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, ...o });
function addLamp(x, z) {
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
  glow.scale.set(3.6, 3.6, 1); glow.position.set(x, 5.15, z); scene.add(glow);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(2.6, 5.0, 24, 1, true), addMat({ map: coneTex, side: THREE.DoubleSide, opacity: 0.3 }));
  cone.position.set(x, 2.65, z); scene.add(cone);   // Spitze oben (Lampe), Öffnung am Boden
  const pool = new THREE.Mesh(new THREE.CircleGeometry(3.4, 32), addMat({ map: glowTex, opacity: 0.35 }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(x, 0.03, z); scene.add(pool);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 5.2, 8), new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.5, metalness: 0.7 }));
  pole.position.set(x, 2.6, z); pole.castShadow = true; scene.add(pole);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 0.34), new THREE.MeshStandardMaterial({ color: 0xfff2cf, emissive: 0xffd9a0, emissiveIntensity: 3 }));
  head.position.set(x, 5.2, z); scene.add(head);
}

// Außenwände
const WT = 1.2, WH = 4.2;
addBox(0, -HALF - WT / 2, HALF * 2 + 2.4, WT, WH, 'wall');
addBox(0, HALF + WT / 2, HALF * 2 + 2.4, WT, WH, 'wall');
addBox(-HALF - WT / 2, 0, WT, HALF * 2, WH, 'wall');
addBox(HALF + WT / 2, 0, WT, HALF * 2, WH, 'wall');
// Zinnen-Leiste oben
{
  const trim = new THREE.MeshStandardMaterial({ color: 0x3a3631, roughness: 0.8 });
  for (const [x, z, w, d] of [[0, -HALF - WT / 2, HALF * 2 + 3, 0.5], [0, HALF + WT / 2, HALF * 2 + 3, 0.5], [-HALF - WT / 2, 0, 0.5, HALF * 2 + 3], [HALF + WT / 2, 0, 0.5, HALF * 2 + 3]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), trim); m.position.set(x, WH + 0.15, z); m.castShadow = true; scene.add(m);
  }
}
// Zentrum: Bunker mit Treppe aus Kisten
addBox(0, 0, 4.4, 4.4, 2.4, 'concrete');
addBox(3.2, 1.8, 1.8, 1.8, 0.9, 'crate');
addBox(3.2, 0, 1.8, 1.8, 1.8, 'crate');
addBox(-3.2, -1.8, 1.8, 1.8, 0.9, 'crate');
addBox(-3.2, 0, 1.8, 1.8, 1.8, 'crate');
// Container
addBox(-11, -8, 6, 2.4, 2.6, 'container', '#a3412f');
addBox(11, 8, 6, 2.4, 2.6, 'container', '#2f5f9e');
addBox(11, -9, 2.4, 6, 2.6, 'container', '#3f7d4b');
addBox(-11, 9, 2.4, 6, 2.6, 'container', '#c58a2b');
// Niedrige Betonbarrieren
addBox(-16, 0, 1.2, 4, 1.0, 'concrete');
addBox(16, 0, 1.2, 4, 1.0, 'concrete');
addBox(0, -15, 4, 1.2, 1.0, 'concrete');
addBox(0, 15, 4, 1.2, 1.0, 'concrete');
// Kistengruppen
addBox(-5.5, 6, 1.5, 1.5, 1.5, 'crate');
addBox(-7, 6, 1.5, 1.5, 0.75, 'crate');
addBox(5.5, -6, 1.5, 1.5, 1.5, 'crate');
addBox(7, -6, 1.5, 1.5, 0.75, 'crate');
addBox(-18.5, 7, 1.5, 1.5, 1.5, 'crate');
addBox(18.5, -7, 1.5, 1.5, 1.5, 'crate');
// Pfeiler
for (const [x, z] of [[-15.5, -12.5], [15.5, 12.5], [15.5, -12.5], [-15.5, 12.5]]) addBox(x, z, 2.2, 2.2, 3.4, 'concrete');
// Fässer
[[-7, -14, '#a83a2c'], [-7.9, -13.3, '#b9921f'], [7, 14, '#2e6aa8'], [7.9, 13.3, '#a83a2c'], [14, -3, '#b9921f'], [-14, 3, '#2e6aa8'], [5, -9.5, '#a83a2c'], [-5, 9.5, '#b9921f']].forEach(([x, z, c]) => addBarrel(x, z, c));
// Lampen
for (const [x, z] of [[-12, -21], [12, -21], [-12, 21], [12, 21], [-21, 0], [21, 0]]) addLamp(x, z);

// Skyline hinter den Mauern (Platzhalter-Klötze; werden durch das Foto ersetzt)
const skylineBoxes = new THREE.Group(); scene.add(skylineBoxes);
{
  const m = new THREE.MeshStandardMaterial({ color: 0x232a3a, roughness: 1 });
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2 + rnd(-0.05, 0.05), r = rnd(48, 70), h = rnd(8, 30), w = rnd(4, 9);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), m);
    b.position.set(Math.cos(a) * r, h / 2 - 1, Math.sin(a) * r); skylineBoxes.add(b);
  }
}

// Staubflimmern im Licht
const dust = (() => {
  const n = 260, pos = new Float32Array(n * 3), seed = [];
  for (let i = 0; i < n; i++) { pos[i * 3] = rnd(-26, 26); pos[i * 3 + 1] = rnd(0.3, 7); pos[i * 3 + 2] = rnd(-26, 26); seed.push(rnd(0, 6.28)); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: glowTex, size: 0.16, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffe0b0, sizeAttenuation: true }));
  pts.frustumCulled = false; scene.add(pts); return { pts, pos, seed };
})();
const muzzleLight = new THREE.PointLight(0xffb060, 0, 9, 2); scene.add(muzzleLight);
const spawns = [[-19, -19], [19, 19], [19, -19], [-19, 19], [0, -19], [0, 19], [-19, 0], [19, 0]].map(([x, z]) => new V3(x, 0, z));

// ---------- Kollision & Strahlen ----------
function resolve(pos, y) {
  for (const b of boxes) {
    if (b.top <= y + SKIP) continue;
    const cx = clamp(pos.x, b.x - b.hw, b.x + b.hw), cz = clamp(pos.z, b.z - b.hd, b.z + b.hd);
    const ex = pos.x - cx, ez = pos.z - cz, dist = Math.hypot(ex, ez);
    if (dist > 0.00001) {
      if (dist < RADIUS) { pos.x = cx + (ex / dist) * RADIUS; pos.z = cz + (ez / dist) * RADIUS; }
    } else {
      const dx = pos.x - b.x, dz = pos.z - b.z, px = b.hw + RADIUS - Math.abs(dx), pz = b.hd + RADIUS - Math.abs(dz);
      if (px < pz) pos.x += Math.sign(dx || 1) * px; else pos.z += Math.sign(dz || 1) * pz;
    }
  }
  pos.x = clamp(pos.x, -HALF + RADIUS, HALF - RADIUS);
  pos.z = clamp(pos.z, -HALF + RADIUS, HALF - RADIUS);
}
function groundAt(pos, y) {
  let g = 0;
  for (const b of boxes) {
    if (b.top > y + SKIP) continue;
    const cx = clamp(pos.x, b.x - b.hw, b.x + b.hw), cz = clamp(pos.z, b.z - b.hd, b.z + b.hd);
    if (Math.hypot(pos.x - cx, pos.z - cz) < RADIUS * 0.9) g = Math.max(g, b.top);
  }
  return g;
}
const _ray = new THREE.Ray(), _pt = new V3(), _sph = new THREE.Sphere();
const lastN = new V3();
function wallDist(origin, dir, maxD) {
  _ray.set(origin, dir);
  let best = maxD, hb = null, hp = null;
  for (const b of boxes) {
    const p = _ray.intersectBox(b.box, _pt);
    if (p) { const d = origin.distanceTo(p); if (d < best) { best = d; hb = b; hp = p.clone(); } }
  }
  lastN.set(0, 1, 0);
  if (hb) {
    const bb = hb.box, e = 0.02;
    if (Math.abs(hp.x - bb.min.x) < e) lastN.set(-1, 0, 0);
    else if (Math.abs(hp.x - bb.max.x) < e) lastN.set(1, 0, 0);
    else if (Math.abs(hp.z - bb.min.z) < e) lastN.set(0, 0, -1);
    else if (Math.abs(hp.z - bb.max.z) < e) lastN.set(0, 0, 1);
  } else if (dir.y < 0) lastN.set(0, 1, 0);
  return best;
}
function rayHitsEntity(origin, dir, e) {
  _ray.set(origin, dir);
  let best = Infinity;
  const sl = e.slideAmt > 0.5;
  _sph.set(new V3(e.pos.x, e.pos.y + (sl ? 0.5 : 1.0), e.pos.z), sl ? 0.5 : 0.55);
  let p = _ray.intersectSphere(_sph, _pt); if (p) best = Math.min(best, origin.distanceTo(p));
  _sph.set(new V3(e.pos.x, e.pos.y + (sl ? 0.85 : 1.62), e.pos.z), 0.27);
  p = _ray.intersectSphere(_sph, _pt); if (p) best = Math.min(best, origin.distanceTo(p));
  return best;
}

// ---------- Bot-Modell ----------
function makeBotMesh(color) {
  const root = new THREE.Group();
  const col = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b2d33, roughness: 0.7 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x3d4350, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xe0b89a, roughness: 0.7 });
  const visor = new THREE.MeshStandardMaterial({ color: 0x0c0f14, roughness: 0.15, metalness: 0.8 });
  const part = (geo, mat, x, y, z, parent = root) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  const torso = part(new THREE.CapsuleGeometry(0.19, 0.36, 4, 10), cloth, 0, 1.15, 0); torso.scale.set(1.15, 1, 0.75);
  part(new THREE.BoxGeometry(0.5, 0.42, 0.3), col, 0, 1.2, 0);
  part(new THREE.BoxGeometry(0.34, 0.4, 0.14), dark, 0, 1.16, 0.2);
  part(new THREE.BoxGeometry(0.34, 0.2, 0.22), dark, 0, 0.95, 0);
  part(new THREE.SphereGeometry(0.135, 14, 12), skin, 0, 1.66, 0);
  part(new THREE.SphereGeometry(0.175, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), col, 0, 1.68, 0);
  part(new THREE.BoxGeometry(0.24, 0.07, 0.06), visor, 0, 1.67, -0.13);
  const thighs = [], shins = [];
  [-1, 1].forEach((s) => {
    const hip = new THREE.Group(); hip.position.set(s * 0.12, 0.92, 0); root.add(hip);
    part(new THREE.CapsuleGeometry(0.08, 0.27, 4, 8), dark, 0, -0.215, 0, hip);
    const knee = new THREE.Group(); knee.position.set(0, -0.43, 0); hip.add(knee);
    part(new THREE.CapsuleGeometry(0.065, 0.31, 4, 8), dark, 0, -0.22, 0, knee);
    part(new THREE.BoxGeometry(0.15, 0.09, 0.27), dark, 0, -0.46, -0.05, knee);
    thighs.push(hip); shins.push(knee);
  });
  const arms = [], fores = [];
  [-1, 1].forEach((s) => {
    const sh = new THREE.Group(); sh.position.set(s * 0.3, 1.38, 0); root.add(sh);
    part(new THREE.CapsuleGeometry(0.052, 0.2, 4, 8), col, 0, -0.15, 0, sh);
    const el = new THREE.Group(); el.position.set(0, -0.3, 0); sh.add(el);
    part(new THREE.CapsuleGeometry(0.044, 0.18, 4, 8), cloth, 0, -0.135, 0, el);
    part(new THREE.SphereGeometry(0.05, 8, 8), skin, 0, -0.29, 0, el);
    arms.push(sh); fores.push(el);
  });
  // Pistole in der rechten Hand (zeigt entlang des Unterarms)
  part(new THREE.BoxGeometry(0.04, 0.2, 0.07), dark, 0, -0.39, 0, fores[1]);
  part(new THREE.BoxGeometry(0.036, 0.18, 0.05), new THREE.MeshStandardMaterial({ color: 0x8c929c, metalness: 0.8, roughness: 0.35 }), 0, -0.4, -0.012, fores[1]);
  root.rotation.order = 'YXZ';
  root.userData = { thighs, shins, torso, arms, fores };
  return root;
}

// ---------- Ragdoll (Verlet-Physik) ----------
// Gelenkpunkte in lokaler Ruhepose (x rechts, y hoch, -z vorn)
const REST = [
  [0, 0.95, 0], [0, 1.40, 0], [0, 1.66, 0],             // 0 Becken, 1 Hals, 2 Kopf
  [-0.3, 1.38, 0], [0.3, 1.38, 0],                      // 3/4 Schultern
  [-0.3, 1.14, -0.18], [0.3, 1.14, -0.18],             // 5/6 Ellbogen
  [-0.246, 1.14, -0.445], [0.246, 1.14, -0.445],       // 7/8 Hände
  [-0.12, 0.92, 0], [0.12, 0.92, 0],                    // 9/10 Hüften
  [-0.12, 0.49, -0.04], [0.12, 0.49, -0.04],           // 11/12 Knie
  [-0.12, 0.06, -0.06], [0.12, 0.06, -0.06],           // 13/14 Füße
].map((a) => new V3(...a));
const PR = [0.1, 0.08, 0.12, 0.07, 0.07, 0.055, 0.055, 0.05, 0.05, 0.09, 0.09, 0.07, 0.07, 0.07, 0.07];
const RLINKS = [
  [0, 1], [1, 2], [1, 3], [1, 4], [3, 4], [0, 9], [0, 10], [9, 10], [3, 0], [4, 0], [3, 10], [4, 9], [1, 9], [1, 10], [2, 3], [2, 4],
  [3, 5], [5, 7], [4, 6], [6, 8], [9, 11], [11, 13], [10, 12], [12, 14],
  [3, 7, 1], [4, 8, 1], [9, 13, 1], [10, 14, 1],       // Mindestabstand: Arme/Beine knicken nicht ein
].map(([a, b, min]) => ({ a, b, min: !!min, len: REST[a].distanceTo(REST[b]) * (min ? 0.5 : 1) }));
const RH = 1 / 60, RG = -16;

function makeRagdoll(color) {
  const root = new THREE.Group(); root.visible = false;
  const col = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b2d33, roughness: 0.7 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x3d4350, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xe0b89a, roughness: 0.7 });
  const visor = new THREE.MeshStandardMaterial({ color: 0x0c0f14, roughness: 0.15, metalness: 0.8 });
  const mesh = (geo, mat, par = root) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; par.add(m); return m; };
  const segs = [];
  const seg = (a, b, r, mat) => { const len = REST[a].distanceTo(REST[b]); const m = mesh(new THREE.CapsuleGeometry(r, Math.max(0.01, len - 2 * r), 4, 8), mat); segs.push({ a, b, m }); return { m, len }; };
  seg(3, 5, 0.052, col); seg(4, 6, 0.052, col);
  seg(5, 7, 0.044, cloth); const foreR = seg(6, 8, 0.044, cloth);
  seg(9, 11, 0.08, dark); seg(10, 12, 0.08, dark); seg(11, 13, 0.065, dark); seg(12, 14, 0.065, dark);
  // Pistole am rechten Unterarm
  const g1 = mesh(new THREE.BoxGeometry(0.04, 0.2, 0.07), dark, foreR.m); g1.position.y = foreR.len / 2 + 0.07;
  const torsoG = new THREE.Group(); root.add(torsoG);
  const t1 = mesh(new THREE.CapsuleGeometry(0.19, 0.36, 4, 10), cloth, torsoG); t1.position.y = 0.2; t1.scale.set(1.15, 1, 0.75);
  mesh(new THREE.BoxGeometry(0.5, 0.42, 0.3), col, torsoG).position.y = 0.25;
  mesh(new THREE.BoxGeometry(0.34, 0.4, 0.14), dark, torsoG).position.set(0, 0.21, 0.2);
  mesh(new THREE.BoxGeometry(0.34, 0.2, 0.22), dark, torsoG);
  const headG = new THREE.Group(); root.add(headG);
  mesh(new THREE.SphereGeometry(0.135, 14, 12), skin, headG);
  mesh(new THREE.SphereGeometry(0.175, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), col, headG).position.y = 0.02;
  mesh(new THREE.BoxGeometry(0.24, 0.07, 0.06), visor, headG).position.set(0, 0.01, -0.13);
  const hands = [0, 1].map(() => mesh(new THREE.SphereGeometry(0.05, 8, 8), skin));
  const feet = [0, 1].map(() => mesh(new THREE.BoxGeometry(0.15, 0.09, 0.27), dark));
  scene.add(root);
  return { root, segs, torsoG, headG, hands, feet, p: REST.map((v, i) => ({ x: new V3(), o: new V3(), r: PR[i] })), active: false, asleep: false, still: 0 };
}

const _ru = new V3(), _rr = new V3(), _rz = new V3(), _rd = new V3(), _rm = new THREE.Matrix4(), _rq = new THREE.Quaternion(), UPV = new V3(0, 1, 0);
function ragPose(rd) {
  const P = rd.p;
  for (const s of rd.segs) {
    const A = P[s.a].x, B = P[s.b].x;
    _rd.subVectors(B, A); const l = _rd.length() || 1e-4; _rd.divideScalar(l);
    s.m.position.addVectors(A, B).multiplyScalar(0.5); s.m.quaternion.setFromUnitVectors(UPV, _rd);
  }
  _ru.subVectors(P[1].x, P[0].x).normalize();
  _rr.subVectors(P[4].x, P[3].x); _rr.addScaledVector(_ru, -_rr.dot(_ru)).normalize();
  _rz.crossVectors(_rr, _ru);
  _rm.makeBasis(_rr, _ru, _rz); _rq.setFromRotationMatrix(_rm);
  rd.torsoG.position.copy(P[0].x); rd.torsoG.quaternion.copy(_rq);
  rd.headG.position.copy(P[2].x); rd.headG.quaternion.copy(_rq);
  rd.hands[0].position.copy(P[7].x); rd.hands[1].position.copy(P[8].x);
  rd.feet[0].position.copy(P[13].x); rd.feet[0].quaternion.copy(_rq);
  rd.feet[1].position.copy(P[14].x); rd.feet[1].quaternion.copy(_rq);
}
function ragCollide(P) {
  for (const q of P) {
    const p = q.x, r = q.r;
    for (const b of boxes) {
      if (p.y > b.top + r) continue;
      const dx = p.x - b.x, dz = p.z - b.z;
      const px = b.hw + r - Math.abs(dx), pz = b.hd + r - Math.abs(dz);
      if (px <= 0 || pz <= 0) continue;
      const py = b.top + r - p.y;
      if (py <= 0) continue;
      if (py < px && py < pz) { p.y += py; q.o.y = p.y; q.o.x += (p.x - q.o.x) * 0.35; q.o.z += (p.z - q.o.z) * 0.35; }
      else if (px < pz) p.x += Math.sign(dx || 1) * px;
      else p.z += Math.sign(dz || 1) * pz;
    }
    if (p.y < r) { p.y = r; q.o.y = r; q.o.x += (p.x - q.o.x) * 0.4; q.o.z += (p.z - q.o.z) * 0.4; }
    p.x = clamp(p.x, -HALF + r, HALF - r); p.z = clamp(p.z, -HALF + r, HALF - r);
  }
}
function ragStep(rd) {
  const P = rd.p; let ke = 0;
  for (const q of P) {
    const vx = (q.x.x - q.o.x) * 0.993, vy = (q.x.y - q.o.y) * 0.993, vz = (q.x.z - q.o.z) * 0.993;
    q.o.copy(q.x); q.x.x += vx; q.x.y += vy + RG * RH * RH; q.x.z += vz; ke += vx * vx + vy * vy + vz * vz;
  }
  for (let it = 0; it < 7; it++) {
    for (const L of RLINKS) {
      const A = P[L.a].x, B = P[L.b].x;
      const dx = B.x - A.x, dy = B.y - A.y, dz = B.z - A.z, d = Math.hypot(dx, dy, dz);
      if (d < 1e-6 || (L.min && d >= L.len)) continue;
      const k = ((d - L.len) / d) * 0.5;
      A.x += dx * k; A.y += dy * k; A.z += dz * k; B.x -= dx * k; B.y -= dy * k; B.z -= dz * k;
    }
    if (it % 3 === 0) ragCollide(P);
  }
  return ke;
}
function startRagdoll(e, dir, hit, strength) {
  const rd = e.rag; if (!rd) return;
  const c = Math.cos(e.yaw), s = Math.sin(e.yaw);
  const vx = e.vel.x * 0.9, vz = e.vel.z * 0.9;
  for (let i = 0; i < REST.length; i++) {
    const l = REST[i], q = rd.p[i];
    const wx = e.pos.x + l.x * c + l.z * s + rnd(-0.01, 0.01), wy = e.pos.y + l.y, wz = e.pos.z - l.x * s + l.z * c + rnd(-0.01, 0.01);
    q.x.set(wx, wy, wz);
    let w = 0.3;
    if (hit) { const d2 = (wx - hit.x) ** 2 + (wy - hit.y) ** 2 + (wz - hit.z) ** 2; w = 0.25 + 0.75 * Math.exp(-d2 / 0.2); }
    const ivx = vx + dir.x * strength * w, ivz = vz + dir.z * strength * w, ivy = dir.y * strength * w + 1.2 + 2.2 * w;
    q.o.set(wx - ivx * RH, wy - ivy * RH, wz - ivz * RH);
  }
  rd.active = true; rd.asleep = false; rd.still = 0; rd.root.visible = true; e.mesh.visible = false;
  ragPose(rd);
}

// ---------- Entitäten ----------
const ents = [];
const BOT_COLORS = [0xd9534f, 0x4cb5e0, 0xf0a93a, 0x9b59b6];
const BOT_NAMES = ['Rotkehlchen', 'Eisvogel', 'Bernstein', 'Veilchen'];

function makeEntity(name, isPlayer, color, bare = false) {
  const e = {
    name, isPlayer, color, pos: new V3(), vel: new V3(), vy: 0, onGround: true, yaw: 0, lives: LIVES, ammo: 1, alive: true,
    kills: 0, respawn: 0, mesh: null, meleeCd: 0, aim: 0, aimTime: rnd(0.7, 1.5), meleeWind: 0,
    stuckT: 0, lastPos: new V3(), avoid: 0, avoidDir: 1, id: ents.length, walk: 0, speed: 0, deadT: 0, hum: null, slideT: -1, slideAmt: 0, slideDir: new V3(), slideSp: 0, slideSp0: 0, slideCd: 0,
  };
  if (!isPlayer && !bare) { e.mesh = makeBotMesh(color); scene.add(e.mesh); e.rag = makeRagdoll(color); }
  ents.push(e);
  return e;
}
const player = makeEntity('Du', true, 0xffffff);
for (let i = 0; i < BOT_COUNT; i++) makeEntity(BOT_NAMES[i], false, BOT_COLORS[i]);
{ // Tarnmuster (Oliv/Braun/Dunkel) aus Rauschen
  const sz = 256, a = fbmTile(sz, 4, 3), b = fbmTile(sz, 7, 3), c = document.createElement('canvas'); c.width = c.height = sz;
  const g = c.getContext('2d'), img = g.createImageData(sz, sz), o = img.data, cols = [[92, 100, 66], [64, 70, 48], [112, 96, 66], [38, 42, 32]];
  for (let i = 0; i < sz * sz; i++) { const k = a[i] > 0.55 ? (b[i] > 0.52 ? 1 : 0) : (b[i] > 0.58 ? 2 : (a[i] < 0.38 ? 3 : 0)); const f = 0.88 + Math.random() * 0.24; o[i * 4] = cols[k][0] * f; o[i * 4 + 1] = cols[k][1] * f; o[i * 4 + 2] = cols[k][2] * f; o[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0); const t = tex(c); setCamo(t);
}
let tpv = false, tpvClose = false;   // 3rd-Person-Ansicht (Tab)
function initHumans() {
  for (const e of ents) {
    const h = makeHuman(e.isPlayer ? 0x6f8f5a : e.color, gun, makeKnife());
    h.root.visible = false; scene.add(h.root); e.hum = h;
    if (e.mesh) e.mesh.visible = false;
    if (e.rag) { e.rag.active = false; e.rag.root.visible = false; }
  }
}
loadHuman(initHumans, (err) => console.warn('Soldat nicht geladen, nutze Platzhalter', err));

function spawnPoint(e) {
  let best = spawns[0], bd = -1;
  for (const s of spawns) {
    let md = 1e9;
    for (const o of ents) if (o !== e && o.alive) md = Math.min(md, Math.hypot(s.x - o.pos.x, s.z - o.pos.z));
    md += Math.random() * 6;
    if (md > bd) { bd = md; best = s; }
  }
  return best;
}
function placeEntity(e, s) {
  e.pos.set(s.x, 0, s.z); e.vel.set(0, 0, 0); e.vy = 0; e.onGround = true;
  e.yaw = Math.atan2(s.x, s.z); e.ammo = 1; e.alive = true; e.meleeCd = 0.6; e.aim = 0; e.meleeWind = 0; e.deadT = 0;
  e.lastPos.copy(e.pos); e.avoid = 0;
  e.slideT = -1; e.slideAmt = 0; e.slideCd = 0;
  if (e.hum) { humanReset(e.hum); e.hum.root.visible = true; }
  else if (e.mesh) { e.mesh.rotation.x = 0; e.mesh.visible = true; }
  if (e.rag) { e.rag.active = false; e.rag.root.visible = false; }
  if (e.isPlayer) { pitch = 0; kick = 0; drawT = 0; inspectT = -1; }
}

// ---------- Effekte ----------
const fxList = [];
const fxMats = {};
const fxGeo = new THREE.BoxGeometry(1, 1, 1);
function fxMat(color) { return fxMats[color] || (fxMats[color] = new THREE.MeshBasicMaterial({ color })); }
function particle(pos, vel, color, size, life, grav = 14) {
  const m = new THREE.Mesh(fxGeo, fxMat(color)); m.scale.setScalar(size); m.position.copy(pos); scene.add(m);
  fxList.push({ m, vel, life, max: life, grav, size });
}
const decals = [];
const decalGeo = new THREE.PlaneGeometry(0.16, 0.16);
const decalMat = new THREE.MeshBasicMaterial({ color: 0x0c0c0e, transparent: true, opacity: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
function impact(point, n) {
  for (let i = 0; i < 7; i++) particle(point, new V3(n.x + rnd(-0.8, 0.8), n.y + rnd(-0.2, 1), n.z + rnd(-0.8, 0.8)).multiplyScalar(rnd(2, 6)), 0xffd27a, 0.035, rnd(0.2, 0.45));
  for (let i = 0; i < 4; i++) particle(point, new V3(n.x + rnd(-0.5, 0.5), n.y + rnd(0, 0.6), n.z + rnd(-0.5, 0.5)).multiplyScalar(rnd(0.6, 1.6)), 0x9a9690, 0.09, rnd(0.4, 0.8), 1);
  const d = new THREE.Mesh(decalGeo, decalMat); d.position.copy(point).addScaledVector(n, 0.012); d.lookAt(point.clone().add(n));
  d.rotation.z += rnd(0, 6); scene.add(d); decals.push(d);
  if (decals.length > 40) { const o = decals.shift(); scene.remove(o); }
}
function burst(point, color) {
  for (let i = 0; i < 16; i++) particle(point, new V3(rnd(-1, 1), rnd(0.2, 1.4), rnd(-1, 1)).multiplyScalar(rnd(2, 5)), i % 3 ? color : 0xffffff, rnd(0.05, 0.1), rnd(0.35, 0.7));
}
const tracers = [];
const tracerGeo = new THREE.BoxGeometry(1, 1, 1);
function tracer(from, to, color) {
  const len = from.distanceTo(to);
  const m = new THREE.Mesh(tracerGeo, new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.scale.set(0.025, 0.025, len); m.position.copy(from).add(to).multiplyScalar(0.5); m.lookAt(to);
  scene.add(m); tracers.push({ m, life: 0.1 });
}
const shells = [];
function ejectShell() {
  const g = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.026, 8), new THREE.MeshStandardMaterial({ color: 0xd9a93a, metalness: 0.9, roughness: 0.3 }));
  gun.updateWorldMatrix(true, false);
  g.position.copy(gun.localToWorld(new V3(0.018, 0.014, -0.02))); scene.add(g);
  const right = new V3(1, 0, 0).applyQuaternion(camera.quaternion), up = new V3(0, 1, 0), back = new V3(0, 0, 1).applyQuaternion(camera.quaternion);
  shells.push({ m: g, v: right.multiplyScalar(rnd(1.6, 2.6)).add(up.multiplyScalar(rnd(1.4, 2.4))).add(back.multiplyScalar(rnd(0.2, 0.8))), life: 3 });
}

// ---------- Waffe (Ansicht) ----------
// Kampfmesser (Ego-Ansicht und Hand des Soldaten)
function makeKnife() {
  const k = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0xcfd3d8, metalness: 0.95, roughness: 0.22 }), dark = new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.7, metalness: 0.2 });
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.016, 0.0); sh.lineTo(0.016, 0.17); sh.lineTo(0.0, 0.25); sh.lineTo(-0.016, 0.17); sh.lineTo(-0.016, 0.0); sh.lineTo(0, 0);
  const bl = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1 }), steel);
  bl.rotation.x = -Math.PI / 2; bl.position.set(0, 0, 0); bl.position.z = -0.0; k.add(bl);
  const gd = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.014), dark); gd.position.set(0, 0.003, 0.0); k.add(gd);
  const hd = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.115, 10), dark); hd.rotation.x = Math.PI / 2; hd.position.set(0, 0, 0.06); k.add(hd);
  const pm = new THREE.Mesh(new THREE.SphereGeometry(0.019, 10, 8), steel); pm.position.set(0, 0, 0.122); k.add(pm);
  k.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  return k;
}
const knife = makeKnife(); knife.visible = false; knife.position.set(0.3, -0.55, -0.35);
let stabT = -1;   // Messerstich-Animation 0..1, -1 = aus
const gun = new THREE.Group();
let slide, hammer, trigger, chamberBrass;
{
  const gtex = (canvas, rep) => { const t = tex(canvas); t.repeat.set(rep, rep); return t; };
  const polyC = mkCanvas(128, (g, s) => { g.fillStyle = '#1d1f23'; g.fillRect(0, 0, s, s); speckle(g, s, 1800, 0, 110, 0.35); });
  const steelC = mkCanvas(128, (g, s) => { g.fillStyle = '#6f757e'; g.fillRect(0, 0, s, s); for (let y = 0; y < s; y++) { g.fillStyle = `rgba(255,255,255,${rnd(0, 0.07)})`; g.fillRect(0, y, s, 1); } speckle(g, s, 500, 0, 90, 0.2); });
  const woodC = mkCanvas(128, (g, s) => {
    g.fillStyle = '#5b3b24'; g.fillRect(0, 0, s, s); speckle(g, s, 1200, 0, 120, 0.25);
    g.strokeStyle = 'rgba(15,8,4,.75)'; g.lineWidth = 2;
    for (let i = -s; i < s * 2; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + s, s); g.moveTo(i, s); g.lineTo(i + s, 0); g.stroke(); }
  });
  const polymer = new THREE.MeshStandardMaterial({ map: gtex(polyC, 30), roughness: 0.6, metalness: 0.1 });
  const steel = new THREE.MeshStandardMaterial({ map: gtex(steelC, 20), roughness: 0.3, metalness: 0.85 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x17191c, roughness: 0.4, metalness: 0.8 });
  const wood = new THREE.MeshStandardMaterial({ map: gtex(woodC, 45), roughness: 0.55 });
  const glove = new THREE.MeshStandardMaterial({ color: 0x1f2329, roughness: 0.9 });
  const sleeve = new THREE.MeshStandardMaterial({ color: 0x3b4636, roughness: 0.9 });
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xf5f5e8 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd9a93a, metalness: 0.9, roughness: 0.25 });
  // Hilfen: Form (x vorwärts, y hoch) extrudieren, Breite zentrieren, Vorderseite nach -z drehen
  const ex = (shape, depth, bev = 0.0015) => {
    const dd = depth - bev * 2;
    const g = new THREE.ExtrudeGeometry(shape, { depth: dd, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 10 });
    g.translate(0, 0, -dd / 2); g.rotateY(Math.PI / 2); return g;
  };
  const L = (sx, sy, sw = 0) => new V3(sw, sy, -sx);
  const add = (geo, mat, pos, par = gun) => { const m = new THREE.Mesh(geo, mat); m.position.copy(pos); par.add(m); return m; };

  // Rahmen mit Abzugsbügel (Loch) und Griff
  const fr = new THREE.Shape();
  fr.moveTo(-0.075, -0.022); fr.lineTo(0.2, -0.022); fr.lineTo(0.235, -0.035); fr.lineTo(0.235, -0.052); fr.lineTo(0.112, -0.052);
  fr.quadraticCurveTo(0.108, -0.09, 0.07, -0.09); fr.lineTo(0.038, -0.09); fr.quadraticCurveTo(0.018, -0.09, 0.014, -0.07);
  fr.lineTo(-0.005, -0.176); fr.lineTo(-0.092, -0.178); fr.lineTo(-0.105, -0.04); fr.quadraticCurveTo(-0.108, -0.022, -0.075, -0.022);
  const hole = new THREE.Path();
  hole.moveTo(0.04, -0.056); hole.lineTo(0.098, -0.056); hole.quadraticCurveTo(0.098, -0.078, 0.07, -0.08); hole.lineTo(0.046, -0.08); hole.quadraticCurveTo(0.036, -0.078, 0.036, -0.066); hole.closePath();
  fr.holes.push(hole);
  add(ex(fr, 0.03), polymer, new V3());
  // Griffschalen mit Rautenmuster
  const gp = new THREE.Shape();
  gp.moveTo(-0.098, -0.045); gp.lineTo(-0.012, -0.075); gp.lineTo(-0.013, -0.168); gp.lineTo(-0.09, -0.17); gp.closePath();
  for (const sw of [-0.0165, 0.0165]) add(ex(gp, 0.004, 0.0008), wood, L(0, 0, sw));
  add(new THREE.BoxGeometry(0.03, 0.012, 0.07), darkSteel, L(-0.049, -0.184));      // Magazinboden
  trigger = add(new THREE.BoxGeometry(0.006, 0.022, 0.008), darkSteel, L(0.058, -0.066)); trigger.rotation.x = -0.35;

  // Schlitten (Metall) mit Visier, Rillen, Auswurffenster
  slide = new THREE.Group(); gun.add(slide);
  const sl = new THREE.Shape();
  sl.moveTo(-0.08, -0.026); sl.lineTo(-0.08, 0.02); sl.quadraticCurveTo(-0.08, 0.034, -0.066, 0.034); sl.lineTo(0.23, 0.034);
  sl.lineTo(0.262, 0.026); sl.lineTo(0.262, -0.014); sl.lineTo(0.245, -0.026); sl.closePath();
  add(ex(sl, 0.034), steel, new V3(), slide);
  add(new THREE.CylinderGeometry(0.0075, 0.0075, 0.03, 12), darkSteel, L(0.268, 0.004), slide).rotation.x = Math.PI / 2;  // Laufmündung
  for (let i = 0; i < 6; i++) for (const sw of [-0.0172, 0.0172]) add(new THREE.BoxGeometry(0.0016, 0.032, 0.003), darkSteel, L(-0.062 + i * 0.0065, 0.006, sw), slide);
  add(new THREE.BoxGeometry(0.002, 0.016, 0.052), new THREE.MeshStandardMaterial({ color: 0x0b0c0e, roughness: 0.6 }), L(0.07, 0.012, 0.0171), slide); // Auswurffenster rechts
  chamberBrass = add(new THREE.CylinderGeometry(0.0045, 0.0045, 0.022, 10), brassMat, L(0.062, 0.012, 0.0176), slide); chamberBrass.rotation.x = Math.PI / 2;
  add(new THREE.BoxGeometry(0.008, 0.012, 0.012), darkSteel, L(0.245, 0.04), slide);                  // Korn
  add(new THREE.BoxGeometry(0.0032, 0.0032, 0.001), dotMat, L(0.2385, 0.0415), slide);
  for (const sw of [-0.0085, 0.0085]) {                                                              // Kimme (zwei Pfosten)
    add(new THREE.BoxGeometry(0.007, 0.012, 0.012), darkSteel, L(-0.062, 0.04, sw), slide);
    add(new THREE.BoxGeometry(0.0032, 0.0032, 0.001), dotMat, L(-0.0685, 0.0415, sw), slide);
  }
  // Hahn
  hammer = new THREE.Group(); hammer.position.copy(L(-0.086, 0.012)); gun.add(hammer);
  add(new THREE.BoxGeometry(0.009, 0.02, 0.012), darkSteel, new V3(0, 0.01, 0), hammer);

  // Hand, Finger, Unterarm
  add(new THREE.BoxGeometry(0.058, 0.08, 0.075), glove, L(-0.088, -0.088, 0.014));                    // Handballen
  const thumb = add(new THREE.CapsuleGeometry(0.0105, 0.04, 4, 8), glove, L(-0.008, -0.04, -0.0255)); thumb.rotation.x = Math.PI / 2;
  const index = add(new THREE.CapsuleGeometry(0.0095, 0.05, 4, 8), glove, L(0.075, -0.058, -0.0225)); index.rotation.x = Math.PI / 2;
  [[-0.094, 0.0108], [-0.119, 0.0052], [-0.144, -0.0003]].forEach(([y, x]) => { const f = add(new THREE.CapsuleGeometry(0.0108, 0.034, 4, 8), glove, L(x + 0.009, y, 0)); f.rotation.z = Math.PI / 2; });
  const wrist = new V3(0.02, -0.09, 0.115), dArm = new V3(0.3, -0.35, 0.89).normalize();
  const cuff = add(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 12), glove, wrist.clone().addScaledVector(dArm, 0.03)); cuff.quaternion.setFromUnitVectors(UPV, dArm);
  const arm = add(new THREE.CapsuleGeometry(0.036, 0.32, 4, 10), sleeve, wrist.clone().addScaledVector(dArm, 0.04 + 0.16 + 0.036)); arm.quaternion.setFromUnitVectors(UPV, dArm);

  gun.position.set(0.24, -0.2, -0.45);
  gun.scale.setScalar(0.82);
  camera.add(gun);
  camera.add(knife);
}
const flashSprite = (() => {
  const c = mkCanvas(64, (g, s) => { const gr = g.createRadialGradient(32, 32, 1, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(0.3, 'rgba(255,200,90,.8)'); gr.addColorStop(1, 'rgba(255,120,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  sp.position.set(0, 0.005, -0.3); sp.scale.setScalar(0.0001); gun.add(sp); return sp;
})();
const flash = { intensity: 0 };
let recoil = 0, meleeAnim = 0, flashT = 0, kick = 0, drawT = 1, inspectT = -1;

// ---------- Spielzustand ----------
let pitch = 0, state = 'menu', time = 0, locked = false, noLock = false, ads = 0, adsHeld = false, curX = 0, curY = 0, curMoved = false;
let swayX = 0, swayY = 0, bobPhase = 0, landDip = 0, fovCur = 100, camY = EYE, hitT = 0;
const keys = {};

function feed(text, color = '#fff') {
  const d = document.createElement('div'); d.textContent = text; d.style.color = color;
  $('feed').prepend(d); setTimeout(() => d.remove(), 4500);
  while ($('feed').children.length > 5) $('feed').lastChild.remove();
}
function msg(text, ms = 1500) {
  $('msg').textContent = text; $('msg').style.opacity = 1;
  clearTimeout(msg.t); msg.t = setTimeout(() => ($('msg').style.opacity = 0), ms);
}

let netApply = false;
function killEntity(attacker, victim, how, dir, hit, strength = 7) {
  if (mode === 'mp' && attacker.isPlayer && !netApply && Net.role) Net.send({ t: 'k', v: victim.pid, how, d: dir ? [dir.x, dir.y, dir.z] : [0, 0, 0] });
  victim.diedAt = time; victim.alive = false; victim.lives--; attacker.kills++; attacker.ammo++;
  victim.respawn = 2.4; victim.deadT = 0;
  burst(new V3(victim.pos.x, victim.pos.y + 1.1, victim.pos.z), victim.isPlayer ? 0xff5555 : victim.color);
  feed(`${attacker.name} ${how} ${victim.name}`, attacker.isPlayer ? '#9be37a' : victim.isPlayer ? '#ff7a7a' : '#ddd');
  if (attacker.isPlayer) { sfx.kill(); msg('+1 Kugel'); hitT = 0.3; }
  if (victim.isPlayer) { sfx.hurt(); $('hurt').style.opacity = 1; setTimeout(() => ($('hurt').style.opacity = 0), 450); }
  if (victim.lives <= 0) { victim.respawn = -1; feed(`${victim.name} ist raus!`, '#ffcc66'); }
  victim.slideT = -1;
  if (victim.hum) { humanDie(victim.hum); victim.hum.deadYaw = dir && (dir.x || dir.z) ? Math.atan2(dir.x, dir.z) : victim.yaw; }
  else if (victim.rag) startRagdoll(victim, dir || new V3(0, 0, 0), hit, strength);
  checkWin();
}
function checkWin() {
  if (mode === 'zombie') return;
  const left = ents.filter((e) => e.lives > 0);
  if (left.length <= 1 && state === 'play') {
    state = 'over';
    const w = left[0];
    $('endtitle').textContent = !w ? 'Unentschieden' : w.isPlayer ? 'Du hast gewonnen!' : `${w.name} gewinnt`;
    $('endsub').textContent = `Deine Kills: ${player.kills}`;
    $('end').style.display = 'flex'; $('again').style.display = mode === 'mp' ? 'none' : '';
    if (document.pointerLockElement) document.exitPointerLock();
  } else if (player.lives <= 0 && state === 'play') $('spectate').style.display = 'block';
}

function fire(shooter, origin, dir) {
  shooter.ammo--;
  let bestT = wallDist(origin, dir, 90);
  const wallN = lastN.clone(); let target = null;
  const wallT = bestT;
  for (const e of ents) {
    if (e === shooter || !e.alive) continue;
    const t = rayHitsEntity(origin, dir, e);
    if (t < bestT) { bestT = t; target = e; }
  }
  const end = origin.clone().addScaledVector(dir, bestT);
  let start = origin.clone();
  if (mode === 'mp' && shooter.isPlayer && Net.role) Net.send({ t: 'f', o: [origin.x, origin.y, origin.z], d: [dir.x, dir.y, dir.z] });
  if (shooter.hum) humanOverlay(shooter.hum, 'shoot');
  if (shooter.isPlayer && tpv) start = new V3(player.pos.x, player.pos.y + 1.35, player.pos.z).addScaledVector(dir, 0.7);
  else if (shooter.isPlayer) { gun.updateWorldMatrix(true, false); start = gun.localToWorld(new V3(0, 0.01, -0.3)); }
  else start.addScaledVector(dir, 0.5);
  tracer(start, end, shooter.isPlayer ? 0xffe9a0 : 0xff9a8a);
  if (shooter.isPlayer) sfx.shot();
  else { const d = Math.hypot(shooter.pos.x - player.pos.x, shooter.pos.z - player.pos.z); sfx.botshot(clamp(1.3 - d / 25, 0.15, 1), shooter.pos.x, shooter.pos.z); }
  if (target && target.zombie) { const hp = end.clone(); hitZombie(shooter, target, hp.y > target.pos.y + 1.45 ? 100 : 50, dir.clone(), hp); }
  else if (target) { const hp = end.clone(); killEntity(shooter, target, 'erschießt', dir.clone(), hp, hp.y > target.pos.y + 1.45 ? 9 : 7); }
  else if (wallT < 90) impact(end, wallN);
}

function melee(att) {
  if (att.hum) humanOverlay(att.hum, 'punch', 1.7);
  if (mode === 'mp' && att.isPlayer && Net.role) Net.send({ t: 'm' });
  let best = null, bd = MELEE_RANGE;
  const fx = -Math.sin(att.yaw), fz = -Math.cos(att.yaw);
  for (const e of ents) {
    if (e === att || !e.alive) continue;
    const dx = e.pos.x - att.pos.x, dz = e.pos.z - att.pos.z, d = Math.hypot(dx, dz);
    if (d < bd && (dx * fx + dz * fz) / (d || 1) > 0.5 && Math.abs(e.pos.y - att.pos.y) < 1.2) { bd = d; best = e; }
  }
  if (att.isPlayer) { stabT = 0; sfx.melee(); }
  if (best && best.zombie) hitZombie(att, best, 100, new V3(fx, 0.25, fz), new V3(best.pos.x, best.pos.y + 1.3, best.pos.z));
  else if (best) killEntity(att, best, 'erledigt (Nahkampf)', new V3(fx, 0.25, fz), new V3(best.pos.x, best.pos.y + 1.3, best.pos.z), 5);
  att.meleeCd = 0.9;
}

// ---------- Zombie-Modus ----------
let mode = 'oitc';
const ZMAX_LIVES = 5, ZPOOL = 16;
const MAG = 8, RELOAD_T = 1.35; let reloadT = 0, zres = 0;
const zw = { wave: 0, toSpawn: 0, spawnT: 0, breakT: 0, kills: 0, started: false };
const pickups = [];
const pickGeo = new THREE.BoxGeometry(0.4, 0.24, 0.28), pickMat = new THREE.MeshStandardMaterial({ color: 0x3f6b36, roughness: 0.6, emissive: 0x1d4a18, emissiveIntensity: 0.6 });
function dropAmmo(x, z, n) {
  const g = new THREE.Group(), box = new THREE.Mesh(pickGeo, pickMat); g.add(box);
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 8), new THREE.MeshStandardMaterial({ color: 0xd9a63a, metalness: 0.8, roughness: 0.3 })); b.position.set(-0.1 + i * 0.1, 0.17, 0); g.add(b); }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x9dff7a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); glow.scale.set(1.8, 1.8, 1); glow.position.y = 0.2; g.add(glow);
  g.position.set(x, 0.3, z); scene.add(g); pickups.push({ g, x, z, n, t: 0 });
}
function makeZombie() {
  const e = makeEntity('Zombie', false, 0x6bff6b, true);
  e.zombie = true; e.alive = false; e.lives = 0; e.respawn = -1; e.zFree = true;
  e.hum = makeHuman(0x4a1c16, null, null, { zombie: true }); e.hum.root.visible = false; scene.add(e.hum.root);
  return e;
}
function zombieStats(e) {
  const w = zw.wave, runner = w >= 3 && Math.random() < Math.min(0.4, 0.08 * w);
  e.hp = Math.min(220, 100 + w * 8); e.maxHp = e.hp;
  e.zspeed = runner ? rnd(2.0, 2.4) : rnd(0.9, 1.3) + Math.min(0.5, w * 0.05);
  e.zdmgCd = 0; e.meleeWind = 0; e.meleeCd = 0.5;
}
function spawnZombie() {
  let z = ents.find((e) => e.zombie && e.zFree); if (!z) return false;
  let best = null, bd = -1;
  for (const sp of spawns) { const d = Math.hypot(sp.x - player.pos.x, sp.z - player.pos.z) + Math.random() * 8; if (d > bd) { bd = d; best = sp; } }
  z.pos.set(best.x + rnd(-2, 2), 0, best.z + rnd(-2, 2)); resolve(z.pos, 0);
  z.vel.set(0, 0, 0); z.alive = true; z.zFree = false; z.deadT = 0; z.speed = 0; z.slideAmt = 0; z.slideT = -1;
  z.yaw = Math.atan2(player.pos.x - z.pos.x, player.pos.z - z.pos.z) + Math.PI; zombieStats(z); humanReset(z.hum); z.hum.root.visible = true; z.lastPos.copy(z.pos); z.avoid = 0;
  return true;
}
function hurtPlayer() {
  if (!player.alive || player.hurtCd > 0) return;
  player.hurtCd = 1.0; player.lives--; sfx.hurt(); sfx.zatk(); $('hurt').style.opacity = 1; setTimeout(() => ($('hurt').style.opacity = 0), 450); kick = 0.05;
  if (player.lives <= 0) {
    player.alive = false; player.slideT = -1; if (player.hum) { humanDie(player.hum); player.hum.deadYaw = player.yaw; }
    state = 'over'; $('endtitle').textContent = 'Du wurdest überrannt'; $('endsub').textContent = `Welle ${zw.wave} · ${zw.kills} Zombies erledigt`;
    $('end').style.display = 'flex'; if (document.pointerLockElement) document.exitPointerLock();
  }
}
function hitZombie(att, z, dmg, dir, hit) {
  z.hp -= dmg; burst(hit.clone(), 0x7a1010); hitT = 0.2;
  if (z.hp > 0) { z.meleeWind = 0; z.stagger = 0.25; sfx.zhit(z.pos.x, z.pos.z); return; }
  z.alive = false; z.deadT = 0; z.meleeWind = 0; zw.kills++; sfx.kill(); sfx.zdie(z.pos.x, z.pos.z);
  humanDie(z.hum); z.hum.deadYaw = dir && (dir.x || dir.z) ? Math.atan2(dir.x, dir.z) : z.yaw;
  if (Math.random() < 0.3) dropAmmo(z.pos.x, z.pos.z, 4 + (Math.random() < 0.3 ? 2 : 0));
  hudSig = ''; boardSig = '';
}
function zombieThink(z, dt) {
  if (!z.alive) { z.deadT += dt; if (z.deadT > 5 && !z.zFree) { z.zFree = true; z.hum.root.visible = false; } return; }
  if (!player.alive) { z.speed *= 0.9; return; }
  if (z.stagger > 0) { z.stagger -= dt; z.speed *= 0.8; return; }
  z.meleeCd -= dt;
  const dx = player.pos.x - z.pos.x, dz = player.pos.z - z.pos.z, d = Math.hypot(dx, dz);
  const dy = wrap(Math.atan2(-dx, -dz) - z.yaw); z.yaw += clamp(dy, -3.2 * dt, 3.2 * dt);
  let move = 1, strafe = 0;
  if (d < 1.55 && z.meleeCd <= 0 && z.meleeWind <= 0 && Math.abs(player.pos.y - z.pos.y) < 1.0) { z.meleeWind = 0.75; humanOverlay(z.hum, 'zscratch', 1.25); }
  if (z.meleeWind > 0) { z.meleeWind -= dt; move = 0; if (z.meleeWind <= 0) { if (Math.hypot(player.pos.x - z.pos.x, player.pos.z - z.pos.z) < 2.0) hurtPlayer(); z.meleeCd = 1.1; } }
  else if (d < 1.2) move = 0;
  z.stuckT += dt;
  if (z.stuckT > 0.6) { if (move !== 0 && z.pos.distanceTo(z.lastPos) < 0.2) { z.avoid = 0.8; z.avoidDir = Math.random() < 0.5 ? -1 : 1; } z.lastPos.copy(z.pos); z.stuckT = 0; }
  if (z.avoid > 0) { z.avoid -= dt; strafe = z.avoidDir; move *= 0.2; }
  const fx = -Math.sin(z.yaw), fz = -Math.cos(z.yaw), rx = Math.cos(z.yaw), rz = -Math.sin(z.yaw), px = z.pos.x, pz = z.pos.z;
  z.pos.x += (fx * move + rx * strafe) * z.zspeed * dt; z.pos.z += (fz * move + rz * strafe) * z.zspeed * dt;
  for (const o of ents) if (o.zombie && o !== z && o.alive) { const ex = z.pos.x - o.pos.x, ez = z.pos.z - o.pos.z, dd = Math.hypot(ex, ez); if (dd < 0.7 && dd > 0.001) { z.pos.x += (ex / dd) * (0.7 - dd) * 0.5; z.pos.z += (ez / dd) * (0.7 - dd) * 0.5; } }
  resolve(z.pos, 0);
  z.speed += (Math.hypot(z.pos.x - px, z.pos.z - pz) / dt - z.speed) * Math.min(1, dt * 8);
  if (Math.random() < dt * 0.12 && d < 14) sfx.groan(clamp(1 - d / 14, 0.1, 1), z.pos.x, z.pos.z);
}
function zombieWaves(dt) {
  player.hurtCd = Math.max(0, (player.hurtCd || 0) - dt);
  for (let i = pickups.length - 1; i >= 0; i--) {
    const k = pickups[i]; k.t += dt; k.g.rotation.y += dt * 1.4; k.g.position.y = 0.38 + Math.sin(k.t * 3) * 0.06;
    if (player.alive && Math.hypot(player.pos.x - k.x, player.pos.z - k.z) < 1.3 && Math.abs(player.pos.y) < 1.2) {
      zres = Math.min(60, zres + k.n); sfx.pickup(); msg(`+${k.n} Munition`, 1000); scene.remove(k.g); pickups.splice(i, 1); hudSig = '';
    }
  }
  const alive = ents.filter((e) => e.zombie && e.alive).length;
  if (zw.toSpawn > 0) {
    zw.spawnT -= dt;
    if (zw.spawnT <= 0 && alive < 12) { if (spawnZombie()) zw.toSpawn--; zw.spawnT = Math.max(0.5, 2.0 - zw.wave * 0.12); }
  } else if (alive === 0) {
    if (zw.breakT <= 0) { zw.breakT = 5; msg(`Welle ${zw.wave} geschafft`, 2200); player.lives = Math.min(ZMAX_LIVES, player.lives + 1); hudSig = ''; }
    zw.breakT -= dt;
    if (zw.breakT <= 0) startWave();
  }
}
function startWave() {
  zw.wave++; zw.toSpawn = 4 + zw.wave * 3; zw.spawnT = 1.5; zw.breakT = 0; boardSig = '';
  msg(`Welle ${zw.wave}`, 2500); sfx.wave();
  const sp = spawns[(Math.random() * spawns.length) | 0]; dropAmmo(sp.x * 0.6, sp.z * 0.6, 12);
  feed(`Welle ${zw.wave}: ${zw.toSpawn} Zombies`, '#9be37a');
}

// ---------- Bot-KI ----------
// ---------- Online-Mehrspieler ----------
let mpMenu = false, netT = 0;
const mpEnt = new Map();   // pid -> Entität
function setupMp() {
  mpEnt.clear(); player.pid = Net.pid; mpEnt.set(Net.pid, player);
  const bots = ents.filter((e) => !e.isPlayer && !e.zombie); let bi = 0;
  for (const r of Net.roster) {
    if (r.pid === Net.pid) continue;
    const e = bots[bi++]; if (!e) break;
    e.remote = true; e.pid = r.pid; e.name = r.name; mpEnt.set(r.pid, e);
  }
  for (; bi < bots.length; bi++) { const e = bots[bi]; e.hidden = true; e.alive = false; e.lives = 0; e.respawn = -1; if (e.hum) e.hum.root.visible = false; }
  for (const [pid, e] of mpEnt) placeEntity(e, spawns[(pid * 2 + 1) % spawns.length]);
  for (const e of ents) if (e.remote) e.net = { x: e.pos.x, y: e.pos.y, z: e.pos.z, yw: e.yaw, sl: 0, g: 1 };
}
function fireFx(e, o, d) {
  const dist = wallDist(o, d, 90), end = o.clone().addScaledVector(d, dist);
  if (e.hum) humanOverlay(e.hum, 'shoot');
  tracer(o.clone().addScaledVector(d, 0.5), end, 0xff9a8a);
  sfx.botshot(clamp(1.3 - Math.hypot(e.pos.x - player.pos.x, e.pos.z - player.pos.z) / 25, 0.15, 1), e.pos.x, e.pos.z);
  if (dist < 90) impact(end, lastN);
}
Net.onMsg = (m) => {
  if (mode !== 'mp' || state === 'menu') return;
  const e = mpEnt.get(m.p); if (!e) return;
  if (m.t === 's') {
    e.net = { x: m.x, y: m.y, z: m.z, yw: m.yw, sl: m.sl, g: m.g };
    if (m.al && !e.alive && e.lives > 0 && time - (e.diedAt || 0) > 1.2) { placeEntity(e, { x: m.x, z: m.z }); e.pos.y = m.y; }
  } else if (m.t === 'f') fireFx(e, new V3(m.o[0], m.o[1], m.o[2]), new V3(m.d[0], m.d[1], m.d[2]));
  else if (m.t === 'm') { if (e.hum) humanOverlay(e.hum, 'punch', 1.7); }
  else if (m.t === 'k') {
    const v = mpEnt.get(m.v);
    if (v && v.alive) { netApply = true; try { killEntity(e, v, m.how, new V3(m.d[0], m.d[1], m.d[2]), null, 7); } finally { netApply = false; } }
  }
};
Net.onLeft = (pid) => {
  const e = mpEnt.get(pid); if (!e || e === player || mode !== 'mp') return;
  feed(`${e.name} hat das Spiel verlassen`, '#ffcc66');
  e.lives = 0; e.alive = false; e.hidden = true; e.respawn = -1; if (e.hum) e.hum.root.visible = false; mpEnt.delete(pid);
  if (state === 'play') checkWin();
};
function mpTick(dt) {
  netT += dt;
  if (netT > 0.05 && Net.role) {
    netT = 0; const r = (v) => Math.round(v * 100) / 100;
    Net.send({ t: 's', x: r(player.pos.x), y: r(player.pos.y), z: r(player.pos.z), yw: r(player.yaw), sl: player.slideT >= 0 ? 1 : 0, g: player.onGround ? 1 : 0, al: player.alive ? 1 : 0 }, true);
  }
  const k = 1 - Math.exp(-dt * 16);
  for (const e of ents) {
    if (!e.remote || !e.net || !e.alive) continue;
    const n = e.net, ox = e.pos.x, oz = e.pos.z;
    if (Math.hypot(n.x - e.pos.x, n.z - e.pos.z) > 6) e.pos.set(n.x, n.y, n.z);
    e.pos.x += (n.x - e.pos.x) * k; e.pos.y += (n.y - e.pos.y) * k; e.pos.z += (n.z - e.pos.z) * k;
    let dy = n.yw - e.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); e.yaw += dy * k;
    if (dt > 0) { e.vel.x += ((e.pos.x - ox) / dt - e.vel.x) * 0.3; e.vel.z += ((e.pos.z - oz) / dt - e.vel.z) * 0.3; }
    e.speed = Math.hypot(e.vel.x, e.vel.z); e.onGround = !!n.g; e.slideT = n.sl ? 0.9 : -1; e.slideAmt = n.sl ? 1 : 0;
  }
}
// Menü: Lobby-Liste, Lobby erstellen, beitreten
{
  const nm = () => { const v = $('mpname').value.replace(/[<>\x00-\x1f]/g, '').trim().slice(0, 14) || 'Soldat'; try { localStorage.setItem('lr_name', v); } catch (e) { /* ignorieren */ } return v; };
  try { $('mpname').value = localStorage.getItem('lr_name') || ''; } catch (e) { /* ignorieren */ }
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const st = (t, ok) => { $('mpstat').textContent = t || ''; $('mpstat').style.color = ok ? '#7dffb0' : '#ff8a8a'; };
  let listT = 0;
  async function refresh() {
    if (Net.role || $('mp').style.display === 'none') return;
    try {
      const ls = await Net.list();
      const html = ls.length ? ls.map((l) => `<div class="lob"><b>${esc(l.name)}</b> <span>${l.n}/4${l.run ? ' · läuft' : ''}</span> <button data-id="${esc(l.id)}" ${l.run || l.n >= 4 ? 'disabled' : ''}>Beitreten</button></div>`).join('') : '<div style="opacity:.6">Keine offenen Lobbys. Erstelle die erste!</div>';
      if (html !== $('mplist').dataset.h) { $('mplist').innerHTML = html; $('mplist').dataset.h = html; }
    } catch (e) { $('mplist').textContent = 'Lobby-Server nicht erreichbar (nur auf dem Webspace verfügbar).'; }
  }
  function view() {
    const inLobby = !!Net.role;
    $('mpbrowse').style.display = inLobby ? 'none' : 'block'; $('mplobby').style.display = inLobby ? 'block' : 'none';
    if (inLobby) {
      $('mproster').innerHTML = Net.roster.map((p) => `<div>${p.pid === 0 ? '👑 ' : '• '}${esc(p.name)}${p.pid === Net.pid ? ' (du)' : ''}</div>`).join('');
      $('mpgo').style.display = Net.role === 'host' ? '' : 'none'; $('mpgo').disabled = Net.roster.length < 2;
      $('mpwait').textContent = Net.role === 'host' ? (Net.roster.length < 2 ? 'Warte auf Mitspieler … (mind. 2, max. 4)' : 'Bereit. Starte, wenn alle da sind.') : 'Warte, bis der Host das Spiel startet …';
    }
  }
  Net.onRoster = view;
  Net.onStart = () => { $('mp').style.display = 'none'; startGame('mp'); };
  Net.onClosed = (t) => { if (Net.role) Net.leave(); $('tomenu').click(); $('mp').style.display = 'flex'; $('menu').style.display = 'none'; view(); st(t); refresh(); };
  $('mpbtn').addEventListener('click', () => { $('menu').style.display = 'none'; $('mp').style.display = 'flex'; st(''); view(); refresh(); clearInterval(listT); listT = setInterval(refresh, 3000); });
  $('mpback').addEventListener('click', () => { if (Net.role) Net.leave(); clearInterval(listT); $('mp').style.display = 'none'; $('menu').style.display = 'flex'; });
  $('mprefresh').addEventListener('click', refresh);
  $('mpcreate').addEventListener('click', async () => { st('Erstelle Lobby …', true); try { await Net.host(nm()); st(''); } catch (e) { st(e.message); } view(); });
  $('mplist').addEventListener('click', async (ev) => {
    const id = ev.target && ev.target.dataset && ev.target.dataset.id; if (!id) return;
    st('Verbinde …', true); try { await Net.join(id, nm()); st(''); } catch (e) { st(e.message); refresh(); } view();
  });
  $('mpgo').addEventListener('click', () => { Net.start(); });
  $('mpleave').addEventListener('click', () => { Net.leave(); view(); refresh(); });
}

function botThink(b, dt) {
  if (!b.alive) return;
  let t = null, bd = 1e9;
  for (const e of ents) if (e !== b && e.alive) { const d = Math.hypot(e.pos.x - b.pos.x, e.pos.z - b.pos.z); if (d < bd) { bd = d; t = e; } }
  if (!t) return;
  b.meleeCd -= dt;
  const dx = t.pos.x - b.pos.x, dz = t.pos.z - b.pos.z, d = bd;
  const dy = wrap(Math.atan2(-dx, -dz) - b.yaw);
  b.yaw += clamp(dy, -3.2 * dt, 3.2 * dt);
  const eye = new V3(b.pos.x, 1.55, b.pos.z), tc = new V3(t.pos.x, t.pos.y + 1.1, t.pos.z);
  const dir = tc.clone().sub(eye).normalize();
  const dist3 = eye.distanceTo(tc);
  const los = wallDist(eye, dir, dist3) >= dist3 - 0.2;

  let move = 0, strafe = 0;
  if (b.ammo > 0) {
    if (los && d < 24) {
      move = d > 10 ? 1 : d < 5 ? -0.6 : 0;
      strafe = Math.sin(time * 1.2 + b.id * 2.1) * 0.7;
      b.aim += dt;
      if (b.aim > b.aimTime && Math.abs(dy) < 0.12) {
        const err = 0.03 + d * 0.0035;
        fire(b, eye, dir.clone().add(new V3(rnd(-err, err), rnd(-err, err) * 0.6, rnd(-err, err))).normalize());
        b.aim = 0; b.aimTime = rnd(0.8, 1.9);
      }
    } else { move = 1; b.aim = 0; }
  } else { move = 1.2; b.aim = 0; }
  if (d < 1.7 && b.meleeCd <= 0 && b.meleeWind <= 0 && Math.abs(dy) < 0.6) b.meleeWind = 0.35;
  if (b.meleeWind > 0) { b.meleeWind -= dt; if (b.meleeWind <= 0) melee(b); move = 0; }

  b.stuckT += dt;
  if (b.stuckT > 0.6) {
    if (move !== 0 && b.pos.distanceTo(b.lastPos) < 0.25) { b.avoid = 0.9; b.avoidDir = Math.random() < 0.5 ? -1 : 1; }
    b.lastPos.copy(b.pos); b.stuckT = 0;
  }
  if (b.avoid > 0) { b.avoid -= dt; strafe = b.avoidDir; move *= 0.2; }

  const fx = -Math.sin(b.yaw), fz = -Math.cos(b.yaw), rx = Math.cos(b.yaw), rz = -Math.sin(b.yaw);
  const px = b.pos.x, pz = b.pos.z;
  b.pos.x += (fx * move + rx * strafe) * BOT_SPEED * dt;
  b.pos.z += (fz * move + rz * strafe) * BOT_SPEED * dt;
  resolve(b.pos, 0);
  b.speed += (Math.hypot(b.pos.x - px, b.pos.z - pz) / dt - b.speed) * Math.min(1, dt * 10);
}

// ---------- Einstellungen ----------
const cfg = { sens: 1, fov: 100, sfxVol: 1, musVol: 0.5 };
try { Object.assign(cfg, JSON.parse(localStorage.getItem('lr_cfg') || '{}')); } catch (e) { /* ohne Speicher */ }
cfg.fov = clamp(+cfg.fov || 100, 90, 120); cfg.sens = clamp(+cfg.sens || 1, 0.2, 3);
function saveCfg() { try { localStorage.setItem('lr_cfg', JSON.stringify(cfg)); } catch (e) { /* ignorieren */ } }
cfg.sfxVol = clamp(+cfg.sfxVol, 0, 1.5); cfg.musVol = clamp(+cfg.musVol, 0, 1);
$('sens').value = cfg.sens; $('fov').value = cfg.fov; $('sfxv').value = cfg.sfxVol; $('musv').value = cfg.musVol;
const showCfg = () => { $('sensv').textContent = cfg.sens.toFixed(2) + '×'; $('fovv').textContent = cfg.fov + '°'; };
showCfg();
$('sens').addEventListener('input', () => { cfg.sens = +$('sens').value; showCfg(); saveCfg(); });
$('sfxv').addEventListener('input', () => { cfg.sfxVol = +$('sfxv').value; saveCfg(); });
$('musv').addEventListener('input', () => { cfg.musVol = +$('musv').value; saveCfg(); if (music.el) music.el.volume = (music.cur === 'menu.mp3' ? 0.6 : 0.5) * cfg.musVol; });
$('fov').addEventListener('input', () => { cfg.fov = +$('fov').value; showCfg(); saveCfg(); });
let prevState = null;
function openSettings() {
  if ($('settings').style.display === 'flex') return;
  prevState = state;
  if (state === 'play' && mode === 'mp') { mpMenu = true; adsHeld = false; for (const k in keys) keys[k] = false; if (document.pointerLockElement) document.exitPointerLock(); }
  else if (state === 'play') { state = 'paused'; adsHeld = false; if (document.pointerLockElement) document.exitPointerLock(); }
  $('settings').style.display = 'flex';
  const inGame = prevState === 'play';
  $('restart').style.display = inGame ? '' : 'none'; $('tomenu').style.display = inGame ? '' : 'none';
}
function closeSettings() {
  $('settings').style.display = 'none';
  if (prevState === 'play' && (state === 'paused' || mpMenu)) {
    mpMenu = false; state = 'play'; last = performance.now();
    if (!noLock) { try { renderer.domElement.requestPointerLock(); } catch (e) { /* Cursor-Steuerung */ } }
  }
  prevState = null;
}
$('gear').addEventListener('click', () => ($('settings').style.display === 'flex' ? closeSettings() : openSettings()));
$('menucfg').addEventListener('click', openSettings);
$('resume').addEventListener('click', closeSettings);
$('restart').addEventListener('click', () => { $('settings').style.display = 'none'; prevState = null; startGame(lastMode); });
$('endmenu').addEventListener('click', () => $('tomenu').click());
$('tomenu').addEventListener('click', () => {
  if (Net.role) Net.leave();
  mpMenu = false; $('mp').style.display = 'none'; $('settings').style.display = 'none'; prevState = null; state = 'menu'; adsHeld = false; reloadT = 0;
  if (document.pointerLockElement) document.exitPointerLock();
  $('end').style.display = 'none'; $('spectate').style.display = 'none'; $('dz').style.display = 'none'; $('menu').style.display = 'flex';
  musicPlay('menu.mp3', 0.6);
});

// ---------- Eingabe ----------
let mdx = 0, mdy = 0;
function toggleMouseMode() {
  if (state !== 'play') return;
  if (locked) { noLock = true; document.exitPointerLock(); msg('Maus frei: Cursor zur Bildschirmkante = drehen', 2500); }
  else { noLock = false; try { renderer.domElement.requestPointerLock(); } catch (e) { /* nichts */ } msg('Maus-Erfassung: Klick ins Spiel', 2000); }
}
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyQ' || e.code === 'KeyV') tryMelee();
  if (e.code === 'KeyT' && state === 'play' && player.alive && inspectT < 0) inspectT = 0;
  if (e.code === 'KeyM') toggleMouseMode();
  if (e.code === 'KeyR' && !e.repeat) startReload();
  if (e.code === 'Tab') { e.preventDefault(); if (state === 'play' && !e.repeat) { tpv = !tpv; msg(tpv ? '3rd Person' : '1st Person', 900); } }
  if ((e.code === 'KeyC' || e.code === 'ControlLeft') && !e.repeat) { if (e.code === 'ControlLeft') e.preventDefault(); trySlide(); }
  if (e.code === 'Escape') { if ($('settings').style.display === 'flex') closeSettings(); else if (state === 'play') openSettings(); }
  if (e.code === 'Space') e.preventDefault();
});
addEventListener('keyup', (e) => (keys[e.code] = false));
addEventListener('blur', () => { adsHeld = false; for (const k in keys) keys[k] = false; });
addEventListener('contextmenu', (e) => e.preventDefault());
let wasLocked = false;
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === renderer.domElement;
  if (wasLocked && !locked && state === 'play' && !noLock) openSettings();   // Esc = Pause-Menü
  wasLocked = locked;
  $('dz').style.display = state === 'play' && !locked ? 'block' : 'none';
});
document.addEventListener('mouseleave', () => { curX = curY = 0; });
addEventListener('mousemove', (e) => {
  curX = (e.clientX / innerWidth) * 2 - 1; curY = (e.clientY / innerHeight) * 2 - 1; curMoved = true;
  if (state !== 'play' || !player.alive || !locked) return;
  const sens = 0.0022 * cfg.sens * (1 - 0.45 * ads);
  player.yaw -= e.movementX * sens;
  pitch = clamp(pitch - e.movementY * sens, -1.4, 1.4);
  mdx += e.movementX; mdy += e.movementY;
});
addEventListener('mouseup', (e) => { if (e.button === 2) adsHeld = false; });
renderer.domElement.addEventListener('mousedown', (e) => {
  if (state !== 'play') return;
  if (!locked && !noLock) { try { renderer.domElement.requestPointerLock(); } catch (er) { /* Cursor-Steuerung */ } }
  if (e.button === 0) tryShoot();
  if (e.button === 2) adsHeld = true;
});
function startReload() {
  if (mode !== 'zombie' || state !== 'play' || !player.alive || reloadT > 0 || player.ammo >= MAG) return;
  if (zres <= 0) { msg('Keine Reserve-Munition!', 1200); return; }
  reloadT = RELOAD_T; if (player.hum) humanOverlay(player.hum, 'reload', 1.7 / RELOAD_T); sfx.reload(); msg('Nachladen …', 900);
}
function finishReload() { const n = Math.min(MAG - player.ammo, zres); player.ammo += n; zres -= n; hudSig = ''; sfx.click(); }
function tryShoot() {
  if (!player.alive || player.meleeCd > 0) return;
  if (mode === 'zombie') { if (reloadT > 0) return; if (player.ammo <= 0 && zres > 0) { startReload(); return; } }
  if (player.ammo <= 0) { sfx.click(); msg(mode === 'zombie' ? 'Keine Munition! Messer: Q' : 'Keine Kugel! Nahkampf: V oder Rechtsklick', 1400); player.meleeCd = 0.25; return; }
  const dir = new V3(); camera.getWorldDirection(dir);
  fire(player, camera.position.clone(), dir);
  recoil = 1; flashT = 0.06; kick = 0.045; player.meleeCd = 0.35;
  ejectShell();
}
function tryMelee() {
  if (state !== 'play' || !player.alive || player.meleeCd > 0) return;
  melee(player);
}

// ---------- HUD ----------
let hudSig = '', boardSig = '';
function hud() {
  const lv = '♥'.repeat(Math.max(0, player.lives)) + '♡'.repeat(Math.max(0, (mode === 'zombie' ? ZMAX_LIVES : LIVES) - player.lives));
  const am = player.ammo + '|' + lv + '|' + (mode === 'zombie' ? zres : '');
  if (am !== hudSig) {
    hudSig = am;
    $('lives').textContent = lv;
    $('ammo').innerHTML = player.ammo > 0
      ? '<i class="b"></i>'.repeat(Math.min(player.ammo, 8)) + (player.ammo > 8 ? '<span>+' + (player.ammo - 8) + '</span>' : '') + (mode === 'zombie' ? '<span> / ' + zres + '</span>' : '')
      : '<i class="b empty"></i>' + (mode === 'zombie' ? '<span> / ' + zres + (zres > 0 ? ' · R = Nachladen' : '') + '</span>' : '');
  }
  const bs = mode === 'zombie' ? 'z' + zw.wave + ':' + zw.kills + ':' + ents.filter((e) => e.zombie && e.alive).length : ents.map((e) => e.lives + ':' + e.kills + ':' + (e.hidden ? 1 : 0)).join(',');
  if (bs !== boardSig) {
    boardSig = bs;
    if (mode === 'zombie') { $('board').innerHTML = `<div>Welle <b>${zw.wave}</b></div><div>Zombies: ${ents.filter((e) => e.zombie && e.alive).length + zw.toSpawn}</div><div>Erledigt: ${zw.kills}</div>`; } else
    $('board').innerHTML = ents.filter((e) => !e.zombie && !e.hidden).map((e) =>
      `<div style="opacity:${e.lives > 0 ? 1 : 0.4}"><span style="color:#${e.color.toString(16).padStart(6, '0')}">■</span> ${e.name} <span class="h">${'♥'.repeat(Math.max(0, e.lives))}</span> · ${e.kills}</div>`).join('');
  }
}
const radar = $('radar'), rctx = radar.getContext('2d');
function drawRadar() {
  const S = radar.width, sc = S / 50;
  rctx.clearRect(0, 0, S, S);
  rctx.save();
  rctx.beginPath(); rctx.arc(S / 2, S / 2, S / 2 - 1, 0, 7); rctx.clip();
  rctx.fillStyle = 'rgba(10,16,24,.62)'; rctx.fillRect(0, 0, S, S);
  rctx.translate(S / 2, S / 2); rctx.rotate(player.yaw);
  rctx.fillStyle = 'rgba(160,170,190,.45)';
  for (const b of boxes) rctx.fillRect((b.x - player.pos.x - b.hw) * sc, (b.z - player.pos.z - b.hd) * sc, b.hw * 2 * sc, b.hd * 2 * sc);
  for (const e of ents) {
    if (e.isPlayer || e.hidden || e.zFree) continue;
    rctx.fillStyle = e.alive ? '#' + e.color.toString(16).padStart(6, '0') : 'rgba(255,255,255,.25)';
    rctx.beginPath(); rctx.arc((e.pos.x - player.pos.x) * sc, (e.pos.z - player.pos.z) * sc, e.alive ? 3.2 : 2, 0, 7); rctx.fill();
  }
  rctx.restore();
  rctx.fillStyle = '#fff'; rctx.beginPath(); rctx.moveTo(S / 2, S / 2 - 7); rctx.lineTo(S / 2 + 5, S / 2 + 5); rctx.lineTo(S / 2 - 5, S / 2 + 5); rctx.closePath(); rctx.fill();
  rctx.strokeStyle = 'rgba(255,255,255,.35)'; rctx.lineWidth = 2; rctx.beginPath(); rctx.arc(S / 2, S / 2, S / 2 - 1, 0, 7); rctx.stroke();
}

// ---------- Start ----------
let lastMode = 'oitc';
function startGame(m) {
  mode = lastMode = m === 'zombie' ? 'zombie' : m === 'mp' ? 'mp' : 'oitc';
  for (const e of ents) { e.remote = false; e.net = null; }
  if (mode === 'zombie' && !player.hum) { msg('Soldat lädt noch, gleich nochmal klicken', 1500); return; }
  for (const k of pickups) scene.remove(k.g); pickups.length = 0;
  if (mode === 'zombie') {
    while (ents.filter((e) => e.zombie).length < ZPOOL) makeZombie();
    for (const e of ents) if (e.zombie) { e.alive = false; e.zFree = true; e.hum.root.visible = false; } else if (!e.isPlayer) { e.hidden = true; e.alive = false; e.lives = 0; e.respawn = -1; if (e.hum) e.hum.root.visible = false; }
    placeEntity(player, new V3(0, 0, 8)); player.lives = ZMAX_LIVES; player.ammo = MAG; zres = 8; reloadT = 0; player.kills = 0; player.hurtCd = 0;
    Object.assign(zw, { wave: 0, toSpawn: 0, spawnT: 0, breakT: 0, kills: 0 });
    scene.fog.color.set(0x16221b); scene.fog.near = 8; scene.fog.far = 48; scene.background.set(0x16221b);
    ents.forEach((e) => { if (e.zombie) e.kills = 0; });
  } else {
    for (const e of ents) if (e.zombie) { e.alive = false; e.zFree = true; e.hum.root.visible = false; }
    scene.fog.color.set(FOG); scene.fog.near = 22; scene.fog.far = 95; scene.background.set(FOG);
    ents.filter((e) => !e.zombie).forEach((e, i) => { e.hidden = false; e.lives = LIVES; e.kills = 0; e.respawn = 0; placeEntity(e, spawns[(i * 2 + (i > 3 ? 1 : 0)) % spawns.length]); });
    if (mode === 'mp') setupMp();
  }
  mpMenu = false;
  $('restart').style.display = mode === 'mp' ? 'none' : '';
  state = 'play';
  $('menu').style.display = 'none'; $('end').style.display = 'none'; $('spectate').style.display = 'none'; $('feed').innerHTML = '';
  hudSig = ''; boardSig = '';
  adsHeld = false; ads = 0; curMoved = false;
  if (!noLock) { try { renderer.domElement.requestPointerLock(); } catch (e) { /* Cursor-Steuerung */ } }
  $('dz').style.display = 'block';
  setTimeout(() => { if (!locked && state === 'play') msg('Cursor-Steuerung: Maus zum Rand = drehen. M = Maus-Erfassung. Q = Nahkampf', 5000); }, 600);
  if (mode === 'zombie') startWave(); else msg(mode === 'mp' ? 'Online: Der Letzte, der steht, gewinnt.' : 'Eine Kugel. Mach sie zählen.', 2200);
  if (actx && actx.state === 'suspended') actx.resume();
  loadSamples(); sfx.go();
  musicPlay('slow' + (1 + ((Math.random() * 10) | 0)) + '.mp3', 0.5);
}
$('start').addEventListener('click', () => startGame('oitc'));
$('startz').addEventListener('click', () => startGame('zombie'));
$('again').addEventListener('click', () => startGame(lastMode));

// ---------- Spieler-Update ----------
let stepAcc = 0, sprintT = 0;
const SLIDE_DUR = 1.05;
function endSlide() { player.slideT = -1; player.slideCd = 0.7; sprintT = 0; }
function trySlide() {
  if (state !== 'play' || !player.alive || player.slideT >= 0 || player.slideCd > 0 || !player.onGround) return;
  if (sprintT < 0.35 || player.speed < WALK + 0.8) { if (player.speed < WALK + 0.8) msg('Zum Sliden erst sprinten (Shift + W)', 1200); return; }
  const l = player.speed || 1;
  player.slideDir.set(player.vel.x / l, 0, player.vel.z / l);
  player.slideSp0 = Math.max(player.speed * 1.28, 9.2); player.slideSp = player.slideSp0; player.slideT = 0;
  sfx.land();
}
function updatePlayer(dt) {
  player.meleeCd -= dt;
  const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  const sprint = keys.ShiftLeft && f > 0 && ads < 0.3;
  if (sprint && player.onGround && player.speed > WALK + 0.8) sprintT += dt; else if (player.slideT < 0) sprintT = 0;
  player.slideCd -= dt;
  const max = (sprint ? SPRINT : WALK) * (1 - 0.35 * ads);
  const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw), rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
  let wx = fx * f + rx * s, wz = fz * f + rz * s;
  const wl = Math.hypot(wx, wz) || 1; wx = (wx / wl) * max * (f || s ? 1 : 0); wz = (wz / wl) * max * (f || s ? 1 : 0);
  const k = player.onGround ? (f || s ? 11 : 14) : 2.2;
  const a = 1 - Math.exp(-k * dt);
  if (player.slideT >= 0) {   // Rutschen: feste Richtung, Tempo klingt ab
    player.slideT += dt;
    const u = player.slideT / SLIDE_DUR;
    player.slideSp = player.slideSp0 * Math.pow(Math.max(0, 1 - u), 1.3) + 2.2 * (1 - u);
    player.vel.set(player.slideDir.x * player.slideSp, 0, player.slideDir.z * player.slideSp);
    if (u >= 1 || !player.onGround || player.slideSp < 2.6) endSlide();
  } else {
    player.vel.x += (wx - player.vel.x) * a; player.vel.z += (wz - player.vel.z) * a;
  }

  if (keys.Space && player.onGround) { if (player.slideT >= 0) endSlide(); player.vy = JUMP; player.onGround = false; sfx.jump(); }
  player.pos.x += player.vel.x * dt; player.pos.z += player.vel.z * dt;
  resolve(player.pos, player.pos.y);
  const g = groundAt(player.pos, player.pos.y);
  const wasAir = !player.onGround, vyBefore = player.vy;
  player.vy -= GRAV * dt; player.pos.y += player.vy * dt;
  if (player.pos.y <= g) {
    player.pos.y = g;
    if (wasAir && vyBefore < -3) { landDip = clamp(-vyBefore * 0.012, 0.04, 0.2); sfx.land(); }
    player.vy = 0; player.onGround = true;
  } else player.onGround = false;

  if (keys.ArrowLeft) player.yaw += 2.2 * dt;
  if (keys.ArrowRight) player.yaw -= 2.2 * dt;
  if (!locked && curMoved) {   // Cursor-Steuerung: Abstand von der Mitte = Drehgeschwindigkeit
    const dz = 0.12, sc = cfg.sens * (1 - 0.45 * ads);
    const sh = Math.abs(curX) > dz ? Math.sign(curX) * Math.pow((Math.abs(curX) - dz) / (1 - dz), 1.4) : 0;
    const sv = Math.abs(curY) > dz ? Math.sign(curY) * Math.pow((Math.abs(curY) - dz) / (1 - dz), 1.4) : 0;
    player.yaw -= sh * 3.2 * sc * dt; pitch = clamp(pitch - sv * 2.0 * sc * dt, -1.4, 1.4);
  }
  if (keys.ArrowUp) pitch = clamp(pitch + 1.5 * dt, -1.4, 1.4);
  if (keys.ArrowDown) pitch = clamp(pitch - 1.5 * dt, -1.4, 1.4);

  player.speed = Math.hypot(player.vel.x, player.vel.z);
  if (player.onGround && player.speed > 0.5) {
    bobPhase += dt * player.speed * 1.35;
    stepAcc += dt * player.speed;
    if (stepAcc > 2.3) { stepAcc = 0; sfx.step(); }
  }
}

// ---------- Hauptschleife ----------
radarT = 0, ftAvg = 16, ftN = 0, shadowsOn = true;
function setShadows(on) { shadowsOn = on; renderer.shadowMap.enabled = on; sun.castShadow = on; scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); }
addEventListener('keydown', (e) => { if (e.code === 'KeyP') { setShadows(!shadowsOn); msg('Schatten: ' + (shadowsOn ? 'an' : 'aus'), 1200); } });
function adaptQuality() {
  if (state !== 'play' || ftN < 45) return;
  const ms = ftAvg; ftAvg = 16; ftN = 0;
  let np = pr;
  if (ms > 24) np = Math.max(0.55, pr - 0.2);
  else if (ms < 13 && pr < Math.min(devicePixelRatio, 1.25)) np = Math.min(Math.min(devicePixelRatio, 1.25), pr + 0.1);
  if (ms > 30 && pr <= 0.75 && shadowsOn) setShadows(false);
  if (np !== pr) { pr = np; renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight); }
}
const _tmp = new V3();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000); ftAvg += ((now - last) - ftAvg) * 0.1; ftN++; last = now; time += dt; if (window.__skyMat) window.__skyMat.uniforms.time.value = time;
  adaptQuality();

  if (state === 'play') {
    if (player.alive && !mpMenu) updatePlayer(dt);
    if (mode === 'mp') mpTick(dt);
    if (mode === 'zombie') zombieWaves(dt);
    for (const e of ents) {
      if (!e.alive && e.respawn > 0 && !e.zombie && !e.remote) { e.respawn -= dt; if (e.respawn <= 0 && e.lives > 0) placeEntity(e, spawnPoint(e)); }
      if (e.zombie) zombieThink(e, dt); else if (!e.isPlayer && mode === 'oitc') botThink(e, dt);
    }
  }

  // Kamera
  const sf = clamp(player.speed / SPRINT, 0, 1) * (player.onGround ? 1 : 0.2);
  ads += ((adsHeld && player.alive ? 1 : 0) - ads) * Math.min(1, dt * 14);
  const targetFov = cfg.fov * (1 - 0.3 * ads) + (player.alive && player.speed > WALK + 0.6 && ads < 0.2 ? 5 : 0);
  fovCur += (targetFov - fovCur) * Math.min(1, dt * 8);
  if (Math.abs(camera.fov - fovCur) > 0.01) { camera.fov = fovCur; camera.updateProjectionMatrix(); }
  landDip = Math.max(0, landDip - dt * 0.7);
  kick = Math.max(0, kick - dt * 0.35);
  const bobY = Math.sin(bobPhase * 2) * 0.03 * sf * (1 - 0.8 * ads), bobX = Math.cos(bobPhase) * 0.022 * sf * (1 - 0.8 * ads);
  player.slideAmt += ((player.slideT >= 0 ? 1 : 0) - player.slideAmt) * Math.min(1, dt * 12);
  const targetY = player.pos.y + (player.alive ? EYE - 0.85 * player.slideAmt : 0.5);
  camY += (targetY - camY) * Math.min(1, dt * (player.alive ? 22 : 4));
  camera.position.set(player.pos.x, camY + bobY - landDip, player.pos.z);
  if (window.__rings) for (const [m, f] of window.__rings) m.position.set(camera.position.x * f, m.position.y, camera.position.z * f);
  camera.rotation.set(player.alive ? pitch + kick * 1.4 : -0.35, player.yaw, player.alive ? bobX * 0.5 + player.slideAmt * 0.05 : 0.55);
  if (tpv && player.alive) {   // Schulterkamera mit Wandkollision
    const cp = Math.cos(pitch), fdir = new V3(-Math.sin(player.yaw) * cp, Math.sin(pitch), -Math.cos(player.yaw) * cp);
    const rgt = new V3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
    const piv = new V3(player.pos.x, camY + 0.05, player.pos.z).addScaledVector(rgt, 0.35 * (1 - 0.6 * ads));
    const want = piv.clone().addScaledVector(fdir, -3.0 * (1 - 0.45 * ads)).add(new V3(0, 0.25, 0));
    const dv = want.clone().sub(piv), dl = dv.length(); dv.divideScalar(dl);
    const wd = wallDist(piv, dv, dl + 0.3);
    const cd = Math.max(0.4, Math.min(dl, wd - 0.3)); tpvClose = cd < 1.3;
    camera.position.copy(piv).addScaledVector(dv, cd);
    camera.rotation.z = 0;
  }
  camera.updateMatrixWorld();

  // Waffe: Schwanken, Rückstoß, Schlitten
  swayX += (clamp(-mdx * 0.0007, -0.05, 0.05) - swayX) * Math.min(1, dt * 12); swayY += (clamp(mdy * 0.0007, -0.05, 0.05) - swayY) * Math.min(1, dt * 12); mdx = mdy = 0;
  recoil = Math.max(0, recoil - dt * 7); meleeAnim = Math.max(0, meleeAnim - dt * 4);
  flashT = Math.max(0, flashT - dt);
  muzzleLight.intensity = flashT > 0 ? 40 : 0; if (flashT > 0) camera.localToWorld(muzzleLight.position.set(0.2, -0.1, -0.9));
  for (let i = 0; i < dust.seed.length; i++) { dust.pos[i * 3] += Math.sin(time * 0.3 + dust.seed[i]) * dt * 0.25; dust.pos[i * 3 + 1] += Math.cos(time * 0.2 + dust.seed[i] * 2) * dt * 0.12; dust.pos[i * 3 + 2] += Math.cos(time * 0.25 + dust.seed[i]) * dt * 0.25; }
  dust.pts.geometry.attributes.position.needsUpdate = true;
  flashSprite.scale.setScalar(flashT > 0 ? 0.22 + Math.random() * 0.1 : 0.0001);
  const sp = sprintPose() ? 1 : 0, hip = 1 - ads;
  drawT = Math.min(1, drawT + dt / 0.55);
  if (reloadT > 0) { reloadT -= dt; if (reloadT <= 0) { reloadT = 0; finishReload(); } }
  const rld = reloadT > 0 ? Math.sin(Math.PI * clamp(1 - reloadT / RELOAD_T, 0, 1)) : 0;
  const dk = (1 - drawT) * (1 - drawT) + rld * 0.75;
  let insp = 0, inspSlide = 0, inspRoll = 0;
  if (inspectT >= 0) {
    inspectT += dt; const t = inspectT / 2.4;
    if (t >= 1 || ads > 0.5) inspectT = -1;
    else { insp = Math.sin(Math.PI * Math.min(1, t * 1.15)) ; inspRoll = insp; inspSlide = t > 0.35 && t < 0.62 ? Math.sin((t - 0.35) / 0.27 * Math.PI) : 0; }
  }
  const vyLag = clamp(-player.vy * 0.004, -0.03, 0.03);
  gun.position.set(
    (0.24 - meleeAnim * 0.2 + swayX * hip + bobX * 0.8 - insp * 0.06) * hip + 0.0 * ads,
    (-0.2 + swayY * hip + bobY * 0.7 - sp * 0.04 + vyLag - dk * 0.35 + insp * 0.03) * hip + (-0.036 - dk * 0.2) * ads + recoil * 0.025 - meleeAnim * 0.05,
    (-0.45 + insp * 0.08) * hip + (-0.34) * ads + recoil * 0.1 - meleeAnim * 0.25);
  gun.rotation.set(recoil * 0.3 * (1 - 0.5 * ads) + meleeAnim * 0.8 + sp * 0.25 + dk * 0.9 - inspRoll * 0.15,
    meleeAnim * 0.9 + sp * -0.3 + inspRoll * 0.7, dk * -0.5 + inspRoll * -1.1);
  const locked0 = player.ammo <= 0;
  slide.position.z = locked0 && reloadT <= 0 ? 0.075 : recoil * 0.075 + inspSlide * 0.05;
  hammer.rotation.x = -0.65 * (locked0 || recoil > 0.2 || inspSlide > 0 ? 1 : 0.2) ;
  trigger.position.z = -0.058 + (recoil > 0.3 ? 0.006 : 0);
  chamberBrass.visible = player.ammo > 0 && recoil < 0.3;
  if (stabT >= 0) {
    stabT += dt / 0.5; if (stabT >= 1) { stabT = -1; drawT = Math.min(drawT, 0.55); }
  }
  gun.visible = player.alive && !tpv && stabT < 0;
  knife.visible = player.alive && !tpv && stabT >= 0;
  if (stabT >= 0) {
    const K = [[0, 0.32, -0.6, -0.3, 1.0, 0.1], [0.22, 0.2, -0.26, -0.34, 0.65, 0.3], [0.42, 0.04, -0.1, -0.82, -0.04, 0.0], [0.58, 0.05, -0.12, -0.74, 0.0, 0.0], [1, 0.32, -0.6, -0.3, 1.0, 0.1]];
    let i = 0; while (i < K.length - 2 && stabT > K[i + 1][0]) i++;
    const a = K[i], b = K[i + 1], u = Math.min(1, Math.max(0, (stabT - a[0]) / (b[0] - a[0]))), e = u * u * (3 - 2 * u), L = (j) => a[j] + (b[j] - a[j]) * e;
    knife.position.set(L(1), L(2), L(3)); knife.rotation.set(L(4), L(5), -0.25);
  }

  // Soldaten animieren
  for (const e of ents) {
    const h = e.hum; if (!h) continue;
    h.root.visible = e.isPlayer ? ((tpv && !tpvClose) || !e.alive) : !(e.hidden || e.zFree);
    h.root.position.copy(e.pos);
    h.root.rotation.y = e.alive ? e.yaw : (h.deadYaw !== undefined ? h.deadYaw : e.yaw);
    const sl = e.isPlayer || e.remote ? e.slideT : -1;
    const spd = e.isPlayer ? (e.speed = player.speed) : e.speed;
    let ang = 0;
    if (spd > 0.8) { ang = Math.atan2(-e.vel.x, -e.vel.z) - e.yaw; ang = Math.atan2(Math.sin(ang), Math.cos(ang)); }
    humanUpdate(h, dt, spd, sl, e.isPlayer || e.remote, ang, (e.isPlayer || e.remote) && !e.onGround);
  }
  // Bots animieren (Platzhalter, falls Soldat fehlt)
  for (const e of ents) {
    if (!e.mesh) continue;
    const m = e.mesh, rd = e.rag;
    if (e.hum) continue;
    if (e.alive) {
      m.position.copy(e.pos); m.rotation.y = e.yaw;
      const u = m.userData;
      e.walk += dt * e.speed * 2.6;
      const amp = Math.min(1, e.speed / 3.2);
      for (let i = 0; i < 2; i++) {
        const ph = e.walk + (i ? Math.PI : 0), sw = Math.sin(ph) * 0.85 * amp;
        u.thighs[i].rotation.x = sw;
        u.shins[i].rotation.x = -(0.08 + 1.1 * Math.pow(Math.max(0, Math.cos(ph - 0.3)), 3)) * (0.3 + 0.7 * amp);
      }
      u.torso.rotation.z = Math.sin(e.walk) * 0.04 * amp;
      u.arms[0].rotation.set(1.3 - Math.sin(e.walk) * 0.08 * amp, 0.3, 0); u.fores[0].rotation.x = 1.0;
      u.arms[1].rotation.set(1.45 + Math.sin(e.walk) * 0.05 * amp, -0.1, 0); u.fores[1].rotation.x = 0.1;
      m.position.y += Math.abs(Math.sin(e.walk)) * 0.045 * amp;
      m.rotation.x = amp * 0.08;
    } else if (rd && rd.active) {
      e.deadT += dt;
      if (!rd.asleep) {
        rd.acc = (rd.acc || 0) + Math.min(dt, 0.05); let ke = 0, n = 0;
        while (rd.acc >= RH && n++ < 4) { ke = ragStep(rd); rd.acc -= RH; }
        if (n) { rd.still = ke < 0.00002 ? rd.still + dt : 0; if (rd.still > 1) rd.asleep = true; }
        ragPose(rd);
      }
    }
  }
  // Partikel
  for (let i = fxList.length - 1; i >= 0; i--) {
    const p = fxList[i]; p.life -= dt;
    if (p.life <= 0) { scene.remove(p.m); fxList.splice(i, 1); continue; }
    p.vel.y -= p.grav * dt; p.m.position.addScaledVector(p.vel, dt);
    if (p.m.position.y < 0.02) { p.m.position.y = 0.02; p.vel.multiplyScalar(0.4); p.vel.y = Math.abs(p.vel.y) * 0.3; }
    p.m.scale.setScalar(p.size * Math.max(0.1, p.life / p.max));
  }
  for (let i = tracers.length - 1; i >= 0; i--) {
    const t = tracers[i]; t.life -= dt; t.m.material.opacity = Math.max(0, t.life / 0.1);
    if (t.life <= 0) { scene.remove(t.m); t.m.material.dispose(); tracers.splice(i, 1); }
  }
  for (let i = shells.length - 1; i >= 0; i--) {
    const s = shells[i]; s.life -= dt; s.v.y -= 12 * dt; s.m.position.addScaledVector(s.v, dt); s.m.rotation.x += dt * 20; s.m.rotation.z += dt * 13;
    if (s.m.position.y < 0.03) { s.m.position.y = 0.03; s.v.y = Math.abs(s.v.y) * 0.35; s.v.x *= 0.6; s.v.z *= 0.6; }
    if (s.life <= 0) { scene.remove(s.m); s.m.geometry.dispose(); shells.splice(i, 1); }
  }
  // Hitmarker, HUD, Radar
  $('cross').style.opacity = String(tpv ? 1 : 1 - ads); $('vig').style.opacity = String(1 + ads * 0.6);
  hitT = Math.max(0, hitT - dt); $('hit').style.opacity = hitT > 0 ? 1 : 0;
  $('fps').textContent = Math.round(1000 / ftAvg) + ' FPS · ' + Math.round(pr * 100) + '%';
  hud();
  radarT += dt; if (radarT > 0.05) { radarT = 0; drawRadar(); }
  renderer.render(scene, camera);
}
function sprintPose() { return player.alive && player.speed > WALK + 0.6 && player.onGround; }
requestAnimationFrame(loop);

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
});
window.__otc = { Net, setPitch: (v) => { pitch = v; }, ents, player, startGame, fire, boxes, scene, camera, renderer, get state() { return state; } };

addEventListener('pointerdown', () => { loadSamples(); if (actx && actx.state === 'suspended') actx.resume(); if (state === 'menu' && !music.el) musicPlay('menu.mp3', 0.6); }, { once: false });
