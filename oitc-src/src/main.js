import * as THREE from 'three';
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
const sfx = {
  shot: () => { noise(0.25, 0.22, 4500); beep(140, 0.2, 'sawtooth', 0.12, -90); },
  botshot: (vol) => { noise(0.2, 0.08 * vol, 2500); },
  click: () => beep(1400, 0.03, 'square', 0.05),
  melee: () => { noise(0.12, 0.12, 1500); beep(240, 0.1, 'triangle', 0.08, -140); },
  kill: () => { beep(520, 0.1, 'square', 0.07); setTimeout(() => beep(780, 0.12, 'square', 0.07), 90); },
  hurt: () => beep(120, 0.35, 'sawtooth', 0.12, -70),
  step: () => noise(0.05, 0.05, 700),
  land: () => noise(0.09, 0.09, 600),
  jump: () => noise(0.06, 0.04, 900),
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
const maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());

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
    uniforms: { top: { value: new THREE.Color(0x24407a) }, mid: { value: new THREE.Color(0x7d8fb5) }, hor: { value: new THREE.Color(0xe0a77f) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 hor;
      void main(){ float h = normalize(vP).y; vec3 c = mix(hor, mid, smoothstep(0.0, 0.25, h)); c = mix(c, top, smoothstep(0.2, 0.85, h));
      vec3 sd = normalize(vec3(-0.55, 0.30, 0.45)); float s = max(dot(normalize(vP), sd), 0.0);
      c += vec3(1.0,0.75,0.45) * (pow(s, 30.0) * 0.45 + pow(s, 1500.0) * 1.6);
      gl_FragColor = vec4(c, 1.0); }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 16, 8), mat);
  scene.add(sky);
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
function mkCanvas(size, fn) { const c = document.createElement('canvas'); c.width = c.height = size; fn(c.getContext('2d'), size); return c; }
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
  g.fillStyle = '#9b9ea4'; g.fillRect(0, 0, s, s); macro(g, s, 0.22); speckle(g, s, 14000, 70, 215, 0.2); pores(g, s, 260); stains(g, s, 8, 0.14); cracks(g, s, 3, 0.35);
  g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 3; g.strokeRect(5, 5, s - 10, s - 10);
  g.strokeStyle = 'rgba(15,15,20,.65)'; g.lineWidth = 5; g.strokeRect(1, 1, s - 2, s - 2);
  g.fillStyle = 'rgba(20,20,24,.55)'; for (const [x, y] of [[s * 0.25, s * 0.25], [s * 0.75, s * 0.25], [s * 0.25, s * 0.75], [s * 0.75, s * 0.75]]) { g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 2; g.stroke(); }
  dirtBottom(g, s, 0.25, 0.3);
});
const floorC = mkCanvas(512, (g, s) => {
  g.fillStyle = '#6f737b'; g.fillRect(0, 0, s, s); macro(g, s, 0.3, 30, 200); speckle(g, s, 30000, 50, 190, 0.2); pores(g, s, 400);
  stains(g, s, 12, 0.22); cracks(g, s, 5, 0.4);
  for (let i = 0; i < 3; i++) { const x = rnd(40, s - 40), y = rnd(40, s - 40), r = rnd(20, 50), gr = g.createRadialGradient(x, y, 2, x, y, r); gr.addColorStop(0, 'rgba(10,10,14,.55)'); gr.addColorStop(0.7, 'rgba(10,10,14,.25)'); gr.addColorStop(1, 'rgba(10,10,14,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  g.strokeStyle = 'rgba(15,15,20,.8)'; g.lineWidth = 6; g.strokeRect(0, 0, s, s);
  g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 2; g.strokeRect(5, 5, s - 10, s - 10);
  g.strokeStyle = 'rgba(15,15,20,.3)'; g.lineWidth = 2; g.beginPath(); g.moveTo(s / 2, 0); g.lineTo(s / 2, s); g.moveTo(0, s / 2); g.lineTo(s, s / 2); g.stroke();
});
const wallC = mkCanvas(512, (g, s) => {
  g.fillStyle = '#867a6f'; g.fillRect(0, 0, s, s); macro(g, s, 0.25); speckle(g, s, 12000, 60, 205, 0.2); pores(g, s, 200); stains(g, s, 10, 0.2);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, s, 50); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, 50, s, 3);
  hazard(g, 0, s - 54, s, 30);
  for (const x of [34, s - 34]) { for (const y of [24, s - 90]) { const gr = g.createLinearGradient(0, y, 0, y + 150); gr.addColorStop(0, 'rgba(120,60,25,.45)'); gr.addColorStop(1, 'rgba(120,60,25,0)'); g.fillStyle = gr; g.fillRect(x - 5, y, 10, 150); g.fillStyle = '#2a2724'; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(x - 2, y - 2, 2.5, 0, 7); g.fill(); } }
  cracks(g, s, 2, 0.3); dirtBottom(g, s, 0.3, 0.45);
  g.strokeStyle = 'rgba(18,16,14,.7)'; g.lineWidth = 5; g.strokeRect(0, 0, s, s);
});
const crateC = mkCanvas(512, (g, s) => {
  const pw = s / 5;
  for (let i = 0; i < 5; i++) {
    const v = rnd(-14, 14); g.fillStyle = `rgb(${168 + v},${118 + v},${66 + v})`; g.fillRect(i * pw, 0, pw, s);
    for (let k = 0; k < 70; k++) { g.strokeStyle = `rgba(70,38,12,${rnd(0.06, 0.22)})`; g.lineWidth = rnd(0.6, 1.6); const x = i * pw + rnd(3, pw - 3); g.beginPath(); g.moveTo(x, rnd(0, s)); g.bezierCurveTo(x + rnd(-4, 4), rnd(0, s), x + rnd(-4, 4), rnd(0, s), x + rnd(-3, 3), rnd(0, s)); g.stroke(); }
    if (Math.random() < 0.7) { const kx = i * pw + rnd(14, pw - 14), ky = rnd(60, s - 60); g.fillStyle = 'rgba(60,32,10,.55)'; g.beginPath(); g.ellipse(kx, ky, 7, 11, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(60,32,10,.3)'; g.lineWidth = 2; g.beginPath(); g.ellipse(kx, ky, 12, 18, 0, 0, 7); g.stroke(); }
    g.fillStyle = 'rgba(30,15,5,.6)'; g.fillRect(i * pw, 0, 3, s);
  }
  g.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < 5; i++) g.fillRect(i * pw + 4, 0, 3, s);
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
    for (let x = 0; x < s; x += 26) { g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x, 0, 9, s); g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(x + 9, 0, 4, s); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x + 13, 0, 3, s); }
    macro(g, s, 0.18); speckle(g, s, 9000, 0, 130, 0.2); stains(g, s, 6, 0.28);
    g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(0, 0, s, 22); g.fillRect(0, s - 22, s, 22);
    g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(0, 22, s, 3); g.fillRect(0, s - 25, s, 3);
    g.fillStyle = 'rgba(15,15,18,.85)'; for (const [x, y] of [[0, 0], [s - 36, 0], [0, s - 36], [s - 36, s - 36]]) g.fillRect(x, y, 36, 36);
    g.fillStyle = 'rgba(245,245,235,.82)'; g.font = 'bold 44px Arial Black, Impact, sans-serif'; g.textAlign = 'left'; g.fillText('GDR 4021 7', 60, 110); g.font = 'bold 22px Arial, sans-serif'; g.fillText('22G1  MAX 30480 KG', 62, 142);
    g.fillStyle = 'rgba(245,245,235,.55)'; g.fillRect(60, 160, 140, 6);
    rust(g, s, 10, 0.4); g.fillStyle = 'rgba(190,190,195,.22)'; for (let i = 0; i < 40; i++) { g.save(); g.translate(rnd(0, s), rnd(0, s)); g.rotate(rnd(0, 3)); g.fillRect(0, 0, rnd(10, 60), 1.5); g.restore(); }
    dirtBottom(g, s, 0.3, 0.45);
  });
}
const barrelC = (color) => mkCanvas(256, (g, s) => {
  g.fillStyle = color; g.fillRect(0, 0, s, s); macro(g, s, 0.2); speckle(g, s, 2600, 0, 140, 0.25); rust(g, s, 6, 0.4);
  for (const y of [14, 70, 186, 236]) { g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, y, s, 10); g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(0, y + 10, s, 3); }
  g.fillStyle = 'rgba(240,235,220,.85)'; g.fillRect(0, 100, s, 62); g.fillStyle = '#1a1a1c'; g.font = 'bold 40px Arial Black, Impact, sans-serif'; g.textAlign = 'center'; g.fillText('FUEL', s / 4, 146); g.fillText('FUEL', s * 0.75, 146);
  g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(40, 0, 10, s); dirtBottom(g, s, 0.3, 0.4);
  for (let i = 0; i < 24; i++) { g.strokeStyle = 'rgba(210,210,215,.3)'; g.lineWidth = 1; g.beginPath(); const x = rnd(0, s), y = rnd(0, s); g.moveTo(x, y); g.lineTo(x + rnd(-20, 20), y + rnd(-8, 8)); g.stroke(); }
});

const T = {
  concrete: tex(concreteC), floor: tex(floorC), wall: tex(wallC), crate: tex(crateC),
};
T.floor.repeat.set(HALF / 2, HALF / 2);
const mats = {
  floor: new THREE.MeshStandardMaterial({ map: T.floor, roughness: 0.92 }),
  concrete: new THREE.MeshStandardMaterial({ map: T.concrete, roughness: 0.9 }),
  wall: new THREE.MeshStandardMaterial({ map: T.wall, roughness: 0.9 }),
  crate: new THREE.MeshStandardMaterial({ map: T.crate, roughness: 0.85 }),
};
const containerMats = {};
function containerMat(color) {
  if (!containerMats[color]) { const t = tex(containerC(color)); containerMats[color] = new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, metalness: 0.5 }); }
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
  const t = tex(barrelC(color));
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.1, 20), new THREE.MeshStandardMaterial({ map: t, roughness: 0.45, metalness: 0.6 }));
  m.position.set(x, 0.55, z); m.castShadow = true; m.receiveShadow = true; scene.add(m);
  addCollider(x, z, 0.8, 0.8, 1.1);
}
function addLamp(x, z) {
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

// Skyline hinter den Mauern
{
  const m = new THREE.MeshStandardMaterial({ color: 0x232a3a, roughness: 1 });
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2 + rnd(-0.05, 0.05), r = rnd(48, 70), h = rnd(8, 30), w = rnd(4, 9);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), m);
    b.position.set(Math.cos(a) * r, h / 2 - 1, Math.sin(a) * r); scene.add(b);
  }
}

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
  _sph.set(new V3(e.pos.x, e.pos.y + 1.0, e.pos.z), 0.55);
  let p = _ray.intersectSphere(_sph, _pt); if (p) best = Math.min(best, origin.distanceTo(p));
  _sph.set(new V3(e.pos.x, e.pos.y + 1.62, e.pos.z), 0.27);
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
  part(new THREE.SphereGeometry(0.135, 14, 12), skin, 0, 1.62, 0);
  part(new THREE.SphereGeometry(0.175, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), col, 0, 1.64, 0);
  part(new THREE.BoxGeometry(0.24, 0.07, 0.06), visor, 0, 1.63, -0.13);
  const legs = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(s * 0.12, 0.86, 0); root.add(p);
    part(new THREE.CapsuleGeometry(0.085, 0.55, 4, 8), dark, 0, -0.4, 0, p);
    part(new THREE.BoxGeometry(0.16, 0.1, 0.26), dark, 0, -0.82, -0.04, p);
    return p;
  });
  const arms = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(s * 0.3, 1.38, 0); root.add(p);
    part(new THREE.CapsuleGeometry(0.065, 0.4, 4, 8), col, 0, -0.28, 0, p);
    part(new THREE.SphereGeometry(0.06, 8, 8), skin, 0, -0.55, 0, p);
    return p;
  });
  // Pistole in der rechten Hand (zeigt entlang des Arms nach vorn)
  part(new THREE.BoxGeometry(0.05, 0.22, 0.08), dark, 0, -0.68, 0, arms[1]);
  arms[0].rotation.set(1.35, 0.35, 0);
  arms[1].rotation.set(1.45, -0.12, 0);
  root.rotation.order = 'YXZ';
  root.userData = { legs, torso, arms };
  return root;
}

// ---------- Entitäten ----------
const ents = [];
const BOT_COLORS = [0xd9534f, 0x4cb5e0, 0xf0a93a, 0x9b59b6];
const BOT_NAMES = ['Rotkehlchen', 'Eisvogel', 'Bernstein', 'Veilchen'];

function makeEntity(name, isPlayer, color) {
  const e = {
    name, isPlayer, color, pos: new V3(), vel: new V3(), vy: 0, onGround: true, yaw: 0, lives: LIVES, ammo: 1, alive: true,
    kills: 0, respawn: 0, mesh: null, meleeCd: 0, aim: 0, aimTime: rnd(0.7, 1.5), meleeWind: 0,
    stuckT: 0, lastPos: new V3(), avoid: 0, avoidDir: 1, id: ents.length, walk: 0, speed: 0, deadT: 0,
  };
  if (!isPlayer) { e.mesh = makeBotMesh(color); scene.add(e.mesh); }
  ents.push(e);
  return e;
}
const player = makeEntity('Du', true, 0xffffff);
for (let i = 0; i < BOT_COUNT; i++) makeEntity(BOT_NAMES[i], false, BOT_COLORS[i]);

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
  if (e.mesh) { e.mesh.rotation.x = 0; e.mesh.visible = true; }
  if (e.isPlayer) { pitch = 0; kick = 0; }
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
  const g = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 6), new THREE.MeshStandardMaterial({ color: 0xd9a93a, metalness: 0.9, roughness: 0.3 }));
  const p = new V3(0.2, -0.12, -0.55).applyMatrix4(camera.matrixWorld);
  g.position.copy(p); scene.add(g);
  const right = new V3(1, 0, 0).applyQuaternion(camera.quaternion), up = new V3(0, 1, 0);
  shells.push({ m: g, v: right.multiplyScalar(rnd(1.5, 2.5)).add(up.multiplyScalar(rnd(1.5, 2.5))), life: 3 });
}

// ---------- Waffe (Ansicht) ----------
const gun = new THREE.Group();
let slide;
{
  const polymer = new THREE.MeshStandardMaterial({ color: 0x1d1f24, roughness: 0.55, metalness: 0.2 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x8c929c, roughness: 0.28, metalness: 0.9 });
  const glove = new THREE.MeshStandardMaterial({ color: 0x20242b, roughness: 0.85 });
  const add = (geo, mat, x, y, z, par = gun) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); par.add(m); return m; };
  add(new THREE.BoxGeometry(0.055, 0.05, 0.3), polymer, 0, -0.045, -0.06);          // Rahmen
  add(new THREE.BoxGeometry(0.052, 0.14, 0.075), polymer, 0, -0.12, 0.07).rotation.x = 0.22; // Griff
  add(new THREE.BoxGeometry(0.02, 0.012, 0.07), polymer, 0, -0.075, -0.02);          // Abzugsbügel
  slide = new THREE.Group(); gun.add(slide);
  add(new THREE.BoxGeometry(0.06, 0.06, 0.34), metal, 0, 0.004, -0.09, slide);
  add(new THREE.BoxGeometry(0.014, 0.02, 0.02), polymer, 0, 0.044, -0.24, slide);   // Korn
  add(new THREE.BoxGeometry(0.03, 0.02, 0.02), polymer, 0, 0.044, 0.06, slide);     // Kimme
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 10), metal, 0, 0.004, -0.275, slide).rotation.x = Math.PI / 2; // Lauf
  // Hand + Unterarm
  add(new THREE.BoxGeometry(0.085, 0.1, 0.1), glove, 0.005, -0.13, 0.075);
  add(new THREE.BoxGeometry(0.1, 0.1, 0.4), glove, 0.06, -0.2, 0.32).rotation.set(-0.15, -0.2, 0);
  gun.position.set(0.24, -0.2, -0.45);
  gun.scale.setScalar(0.82);
  camera.add(gun);
}
const flashSprite = (() => {
  const c = mkCanvas(64, (g, s) => { const gr = g.createRadialGradient(32, 32, 1, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(0.3, 'rgba(255,200,90,.8)'); gr.addColorStop(1, 'rgba(255,120,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  sp.position.set(0, 0.0, -0.33); sp.scale.setScalar(0.0001); gun.add(sp); return sp;
})();
const flash = { intensity: 0 };
let recoil = 0, meleeAnim = 0, flashT = 0, kick = 0;

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

function killEntity(attacker, victim, how) {
  victim.alive = false; victim.lives--; attacker.kills++; attacker.ammo++;
  victim.respawn = 2.4; victim.deadT = 0;
  burst(new V3(victim.pos.x, victim.pos.y + 1.1, victim.pos.z), victim.isPlayer ? 0xff5555 : victim.color);
  feed(`${attacker.name} ${how} ${victim.name}`, attacker.isPlayer ? '#9be37a' : victim.isPlayer ? '#ff7a7a' : '#ddd');
  if (attacker.isPlayer) { sfx.kill(); msg('+1 Kugel'); hitT = 0.3; }
  if (victim.isPlayer) { sfx.hurt(); $('hurt').style.opacity = 1; setTimeout(() => ($('hurt').style.opacity = 0), 450); }
  if (victim.lives <= 0) { victim.respawn = -1; feed(`${victim.name} ist raus!`, '#ffcc66'); }
  checkWin();
}
function checkWin() {
  const left = ents.filter((e) => e.lives > 0);
  if (left.length <= 1 && state === 'play') {
    state = 'over';
    const w = left[0];
    $('endtitle').textContent = !w ? 'Unentschieden' : w.isPlayer ? 'Du hast gewonnen!' : `${w.name} gewinnt`;
    $('endsub').textContent = `Deine Kills: ${player.kills}`;
    $('end').style.display = 'flex';
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
  if (shooter.isPlayer) start = camera.localToWorld(new V3(0.24, -0.15, -0.65));
  else start.addScaledVector(dir, 0.5);
  tracer(start, end, shooter.isPlayer ? 0xffe9a0 : 0xff9a8a);
  if (shooter.isPlayer) sfx.shot();
  else { const d = Math.hypot(shooter.pos.x - player.pos.x, shooter.pos.z - player.pos.z); sfx.botshot(clamp(1.3 - d / 25, 0.15, 1)); }
  if (target) { killEntity(shooter, target, 'erschießt'); }
  else if (wallT < 90) impact(end, wallN);
}

function melee(att) {
  let best = null, bd = MELEE_RANGE;
  const fx = -Math.sin(att.yaw), fz = -Math.cos(att.yaw);
  for (const e of ents) {
    if (e === att || !e.alive) continue;
    const dx = e.pos.x - att.pos.x, dz = e.pos.z - att.pos.z, d = Math.hypot(dx, dz);
    if (d < bd && (dx * fx + dz * fz) / (d || 1) > 0.5 && Math.abs(e.pos.y - att.pos.y) < 1.2) { bd = d; best = e; }
  }
  if (att.isPlayer) { meleeAnim = 1; sfx.melee(); }
  if (best) killEntity(att, best, 'erledigt (Nahkampf)');
  att.meleeCd = 0.9;
}

// ---------- Bot-KI ----------
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
const cfg = { sens: 1, fov: 100 };
try { Object.assign(cfg, JSON.parse(localStorage.getItem('lr_cfg') || '{}')); } catch (e) { /* ohne Speicher */ }
cfg.fov = clamp(+cfg.fov || 100, 90, 120); cfg.sens = clamp(+cfg.sens || 1, 0.2, 3);
function saveCfg() { try { localStorage.setItem('lr_cfg', JSON.stringify(cfg)); } catch (e) { /* ignorieren */ } }
$('sens').value = cfg.sens; $('fov').value = cfg.fov;
const showCfg = () => { $('sensv').textContent = cfg.sens.toFixed(2) + '×'; $('fovv').textContent = cfg.fov + '°'; };
showCfg();
$('sens').addEventListener('input', () => { cfg.sens = +$('sens').value; showCfg(); saveCfg(); });
$('fov').addEventListener('input', () => { cfg.fov = +$('fov').value; showCfg(); saveCfg(); });
let prevState = null;
function openSettings() {
  if ($('settings').style.display === 'flex') return;
  prevState = state;
  if (state === 'play') { state = 'paused'; adsHeld = false; if (document.pointerLockElement) document.exitPointerLock(); }
  $('settings').style.display = 'flex';
}
function closeSettings() {
  $('settings').style.display = 'none';
  if (prevState === 'play' && state === 'paused') {
    state = 'play'; last = performance.now();
    if (!noLock) { try { renderer.domElement.requestPointerLock(); } catch (e) { /* Cursor-Steuerung */ } }
  }
  prevState = null;
}
$('gear').addEventListener('click', () => ($('settings').style.display === 'flex' ? closeSettings() : openSettings()));
$('menucfg').addEventListener('click', openSettings);
$('resume').addEventListener('click', closeSettings);

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
  if (e.code === 'KeyM') toggleMouseMode();
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
function tryShoot() {
  if (!player.alive || player.meleeCd > 0) return;
  if (player.ammo <= 0) { sfx.click(); msg('Keine Kugel! Nahkampf: V oder Rechtsklick', 1400); player.meleeCd = 0.25; return; }
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
  const lv = '♥'.repeat(Math.max(0, player.lives)) + '♡'.repeat(Math.max(0, LIVES - player.lives));
  const am = player.ammo + '|' + lv;
  if (am !== hudSig) {
    hudSig = am;
    $('lives').textContent = lv;
    $('ammo').innerHTML = player.ammo > 0
      ? '<i class="b"></i>'.repeat(Math.min(player.ammo, 8)) + (player.ammo > 8 ? '<span>+' + (player.ammo - 8) + '</span>' : '')
      : '<i class="b empty"></i>';
  }
  const bs = ents.map((e) => e.lives + ':' + e.kills).join(',');
  if (bs !== boardSig) {
    boardSig = bs;
    $('board').innerHTML = ents.map((e) =>
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
    if (e.isPlayer) continue;
    rctx.fillStyle = e.alive ? '#' + e.color.toString(16).padStart(6, '0') : 'rgba(255,255,255,.25)';
    rctx.beginPath(); rctx.arc((e.pos.x - player.pos.x) * sc, (e.pos.z - player.pos.z) * sc, e.alive ? 3.2 : 2, 0, 7); rctx.fill();
  }
  rctx.restore();
  rctx.fillStyle = '#fff'; rctx.beginPath(); rctx.moveTo(S / 2, S / 2 - 7); rctx.lineTo(S / 2 + 5, S / 2 + 5); rctx.lineTo(S / 2 - 5, S / 2 + 5); rctx.closePath(); rctx.fill();
  rctx.strokeStyle = 'rgba(255,255,255,.35)'; rctx.lineWidth = 2; rctx.beginPath(); rctx.arc(S / 2, S / 2, S / 2 - 1, 0, 7); rctx.stroke();
}

// ---------- Start ----------
function startGame() {
  ents.forEach((e, i) => { e.lives = LIVES; e.kills = 0; e.respawn = 0; placeEntity(e, spawns[(i * 2 + (i > 3 ? 1 : 0)) % spawns.length]); });
  state = 'play';
  $('menu').style.display = 'none'; $('end').style.display = 'none'; $('spectate').style.display = 'none'; $('feed').innerHTML = '';
  hudSig = ''; boardSig = '';
  adsHeld = false; ads = 0; curMoved = false;
  if (!noLock) { try { renderer.domElement.requestPointerLock(); } catch (e) { /* Cursor-Steuerung */ } }
  $('dz').style.display = 'block';
  setTimeout(() => { if (!locked && state === 'play') msg('Cursor-Steuerung: Maus zum Rand = drehen. M = Maus-Erfassung. Q = Nahkampf', 5000); }, 600);
  msg('Eine Kugel. Mach sie zählen.', 2200);
  if (actx && actx.state === 'suspended') actx.resume();
}
$('start').addEventListener('click', startGame);
$('again').addEventListener('click', startGame);

// ---------- Spieler-Update ----------
let stepAcc = 0;
function updatePlayer(dt) {
  player.meleeCd -= dt;
  const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  const sprint = keys.ShiftLeft && f > 0 && ads < 0.3;
  const max = (sprint ? SPRINT : WALK) * (1 - 0.35 * ads);
  const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw), rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
  let wx = fx * f + rx * s, wz = fz * f + rz * s;
  const wl = Math.hypot(wx, wz) || 1; wx = (wx / wl) * max * (f || s ? 1 : 0); wz = (wz / wl) * max * (f || s ? 1 : 0);
  const k = player.onGround ? (f || s ? 11 : 14) : 2.2;
  const a = 1 - Math.exp(-k * dt);
  player.vel.x += (wx - player.vel.x) * a; player.vel.z += (wz - player.vel.z) * a;

  if (keys.Space && player.onGround) { player.vy = JUMP; player.onGround = false; sfx.jump(); }
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
  const dt = Math.min(0.05, (now - last) / 1000); ftAvg += ((now - last) - ftAvg) * 0.1; ftN++; last = now; time += dt;
  adaptQuality();

  if (state === 'play') {
    if (player.alive) updatePlayer(dt);
    for (const e of ents) {
      if (!e.alive && e.respawn > 0) { e.respawn -= dt; if (e.respawn <= 0 && e.lives > 0) placeEntity(e, spawnPoint(e)); }
      if (!e.isPlayer) botThink(e, dt);
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
  const targetY = player.pos.y + (player.alive ? EYE : 0.5);
  camY += (targetY - camY) * Math.min(1, dt * (player.alive ? 22 : 4));
  camera.position.set(player.pos.x, camY + bobY - landDip, player.pos.z);
  camera.rotation.set(player.alive ? pitch + kick * 1.4 : -0.35, player.yaw, player.alive ? bobX * 0.5 : 0.55);
  camera.updateMatrixWorld();

  // Waffe: Schwanken, Rückstoß, Schlitten
  swayX += (clamp(-mdx * 0.0007, -0.05, 0.05) - swayX) * Math.min(1, dt * 12); swayY += (clamp(mdy * 0.0007, -0.05, 0.05) - swayY) * Math.min(1, dt * 12); mdx = mdy = 0;
  recoil = Math.max(0, recoil - dt * 7); meleeAnim = Math.max(0, meleeAnim - dt * 4);
  flashT = Math.max(0, flashT - dt);
  flashSprite.scale.setScalar(flashT > 0 ? 0.22 + Math.random() * 0.1 : 0.0001);
  const sp = sprintPose() ? 1 : 0, hip = 1 - ads;
  gun.position.set(
    (0.24 - meleeAnim * 0.2 + swayX * hip + bobX * 0.8) * hip + 0.0 * ads,
    (-0.2 + swayY * hip + bobY * 0.7 - sp * 0.04) * hip + (-0.037) * ads + recoil * 0.025 - meleeAnim * 0.05,
    (-0.45) * hip + (-0.34) * ads + recoil * 0.1 - meleeAnim * 0.25);
  gun.rotation.set(recoil * 0.3 * (1 - 0.5 * ads) + meleeAnim * 0.8 + sp * 0.25, meleeAnim * 0.9 + sp * -0.3, 0);
  slide.position.z = player.ammo <= 0 ? 0.11 : recoil * 0.1;
  gun.visible = player.alive;

  // Bots animieren
  for (const e of ents) {
    if (!e.mesh) continue;
    const m = e.mesh;
    m.position.copy(e.pos); m.rotation.y = e.yaw;
    const u = m.userData;
    if (e.alive) {
      e.walk += dt * e.speed * 2.6;
      const amp = Math.min(1, e.speed / 3.2);
      u.legs[0].rotation.x = Math.sin(e.walk) * 0.85 * amp; u.legs[1].rotation.x = -Math.sin(e.walk) * 0.85 * amp;
      u.torso.rotation.z = Math.sin(e.walk) * 0.05 * amp;
      m.position.y += Math.abs(Math.sin(e.walk)) * 0.05 * amp;
      m.rotation.x = 0;
    } else {
      e.deadT += dt;
      const k = Math.min(1, e.deadT / 0.45), ease = k * k;
      m.rotation.x = ease * (Math.PI / 2 - 0.05); m.position.y += ease * 0.14;
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
  $('cross').style.opacity = String(1 - ads); $('vig').style.opacity = String(1 + ads * 0.6);
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
window.__otc = { ents, player, startGame, fire, boxes, scene, camera, renderer, get state() { return state; } };
