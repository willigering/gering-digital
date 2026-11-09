// DAU TO PRO – programmatisch erzeugte Vorschaubilder (16:9, 1280 × 720).
// Jedes Motiv ist eine eigenständige Vektorgrafik im DAU-TO-PRO-Look:
// dunkler technischer Hintergrund, Orange/Gold als Hauptakzent, dezentes Cyan.
// Neue Lernmodule bekommen hier ein eigenes Motiv (siehe README.md in diesem Ordner).

export const W = 1280, H = 720;
const GOLD = '#eab448', GOLD_LITE = '#ffd98a', ORANGE = '#f39a2b', CREAM = '#f5f0df', MUTED = '#8fa3a8';
// Modulfarbe: ersetzt das frühere Cyan, damit jedes Modul seine eigene Akzentfarbe trägt (Gold bleibt Hauptakzent).
let CYAN = '#00dce8';
const MONO = "'JetBrains Mono','DejaVu Sans Mono',monospace";
const SANS = "Inter,'DejaVu Sans',sans-serif";

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const r = (n) => Math.round(n * 10) / 10;

/** Deterministic pseudo random generator so images are reproducible. */
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Shared frame: background, grid, glow, site-like orange rays and vignette. */
function frame(id, inner, { glowX = 640, glowY = 330, seed = 1, rays = true } = {}) {
  const rand = rng(seed);
  // Faint circuit traces in the background, different per motif.
  let traces = '';
  for (let i = 0; i < 7; i++) {
    const left = i % 2 === 0;
    const y = r(70 + rand() * 580);
    const x1 = left ? -20 : 1300;
    const len = 120 + rand() * 170;
    const x2 = left ? x1 + len : x1 - len;
    const dy = (rand() > .5 ? 1 : -1) * (30 + rand() * 40);
    const x3 = left ? x2 + Math.abs(dy) : x2 - Math.abs(dy);
    const x4 = left ? x3 + 60 + rand() * 90 : x3 - 60 - rand() * 90;
    const color = rand() > .55 ? GOLD : CYAN;
    traces += `<path d="M${x1} ${y} H${r(x2)} L${r(x3)} ${r(y + dy)} H${r(x4)}" stroke="${color}" stroke-opacity=".16" stroke-width="2" fill="none"/>` +
      `<circle cx="${r(x4)}" cy="${r(y + dy)}" r="4" fill="${color}" fill-opacity=".35"/>`;
  }
  const ray = rays ? `
    <g stroke-linecap="round" fill="none">
      <path d="M-140 ${H + 60} L${W * .55} -140" stroke="${ORANGE}" stroke-width="16" stroke-opacity=".08" filter="url(#${id}-soft)"/>
      <path d="M-140 ${H + 60} L${W * .55} -140" stroke="url(#${id}-ray)" stroke-width="2.4" stroke-opacity=".55"/>
      <path d="M${W * .55} ${H + 140} L${W + 140} ${H * .12}" stroke="url(#${id}-ray)" stroke-width="1.6" stroke-opacity=".32"/>
    </g>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="${id}-glow" cx="${glowX / W}" cy="${glowY / H}" r=".55">
      <stop offset="0" stop-color="${CYAN}" stop-opacity=".16"/>
      <stop offset=".55" stop-color="${CYAN}" stop-opacity=".035"/>
      <stop offset="1" stop-color="${CYAN}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${id}-warm" cx=".78" cy=".8" r=".6">
      <stop offset="0" stop-color="${ORANGE}" stop-opacity=".12"/>
      <stop offset="1" stop-color="${ORANGE}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${id}-vignette" cx=".5" cy=".5" r=".75">
      <stop offset=".55" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".62"/>
    </radialGradient>
    <linearGradient id="${id}-gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff1bb"/><stop offset=".55" stop-color="#efc261"/><stop offset="1" stop-color="#cc8f25"/>
    </linearGradient>
    <linearGradient id="${id}-goldv" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe4a1"/><stop offset="1" stop-color="#d79a2c"/>
    </linearGradient>
    <linearGradient id="${id}-ray" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="#d88120" stop-opacity=".2"/><stop offset=".5" stop-color="#ffd27a"/><stop offset="1" stop-color="#ff9c29" stop-opacity=".15"/>
    </linearGradient>
    <linearGradient id="${id}-panel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#16201f"/><stop offset="1" stop-color="#0c1215"/>
    </linearGradient>
    <pattern id="${id}-grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0V40" fill="none" stroke="#9fe9ef" stroke-opacity=".045" stroke-width="1"/>
    </pattern>
    <filter id="${id}-glowf" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="${id}-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="#080c0e"/>
  <rect width="${W}" height="${H}" fill="url(#${id}-grid)"/>
  <rect width="${W}" height="${H}" fill="url(#${id}-glow)"/>
  <rect width="${W}" height="${H}" fill="url(#${id}-warm)"/>
  <g>${traces}</g>
  ${ray}
  ${inner(id)}
  <rect width="${W}" height="${H}" fill="url(#${id}-vignette)" pointer-events="none"/>
</svg>`;
}

/* ---------- IPv4 & Subnetting ---------- */
function ipv4(id) {
  const bits = '11000000101010000000101001000000'; // 192.168.10.64
  const netBits = 26;
  const cw = 27, gap = 5, octGap = 24;
  const total = 4 * (8 * cw + 7 * gap) + 3 * octGap;
  const x0 = (W - total) / 2, y0 = 300;
  let cells = '';
  for (let i = 0; i < 32; i++) {
    const oct = Math.floor(i / 8), k = i % 8;
    const x = x0 + oct * (8 * cw + 7 * gap + octGap) + k * (cw + gap);
    const net = i < netBits;
    const col = net ? GOLD : CYAN;
    cells += `<rect x="${r(x)}" y="${y0}" width="${cw}" height="44" rx="4" fill="${col}" fill-opacity="${bits[i] === '1' ? .28 : .07}" stroke="${col}" stroke-opacity="${net ? .85 : .9}" stroke-width="1.6"/>` +
      `<text x="${r(x + cw / 2)}" y="${y0 + 31}" text-anchor="middle" font-family="${MONO}" font-size="22" font-weight="700" fill="${bits[i] === '1' ? (net ? GOLD_LITE : '#aaf6fa') : (net ? '#9c7a3a' : '#3f8e93')}">${bits[i]}</text>`;
  }
  const xNetEnd = x0 + 3 * (8 * cw + 7 * gap + octGap) + 1 * (cw + gap) + cw; // bit 25 end
  const xHost = xNetEnd + gap;
  const xEnd = x0 + total;
  const bracket = `
    <path d="M${r(x0)} 362 v12 H${r(xNetEnd)} v-12" fill="none" stroke="${GOLD}" stroke-width="2.4"/>
    <text x="${r((x0 + xNetEnd) / 2)}" y="404" text-anchor="middle" font-family="${MONO}" font-size="21" font-weight="800" letter-spacing="6" fill="${GOLD}">NETZANTEIL · 26 BIT</text>
    <path d="M${r(xHost)} 362 v12 H${r(xEnd)} v-12" fill="none" stroke="${CYAN}" stroke-width="2.4"/>
    <text x="${r((xHost + xEnd) / 2)}" y="404" text-anchor="middle" font-family="${MONO}" font-size="21" font-weight="800" fill="${CYAN}">HOST</text>`;
  // Four subnets as segments on a backbone.
  let segs = '';
  const labels = ['.0/26', '.64/26', '.128/26', '.192/26'];
  const sw = 214, sg = 26, sx0 = (W - (4 * sw + 3 * sg)) / 2, sy = 500;
  segs += `<path d="M${r(sx0 + sw / 2)} 470 H${r(sx0 + 3 * (sw + sg) + sw / 2)}" stroke="${CYAN}" stroke-opacity=".55" stroke-width="2.5"/>`;
  labels.forEach((t, i) => {
    const x = sx0 + i * (sw + sg), active = i === 1;
    segs += `<path d="M${r(x + sw / 2)} 470 V${sy}" stroke="${active ? GOLD : CYAN}" stroke-opacity=".7" stroke-width="2.5"/>` +
      `<circle cx="${r(x + sw / 2)}" cy="470" r="6" fill="${active ? GOLD : CYAN}"/>` +
      `<rect x="${r(x)}" y="${sy}" width="${sw}" height="70" rx="10" fill="${active ? 'url(#' + id + '-gold)' : '#0f1a1e'}" fill-opacity="${active ? .95 : 1}" stroke="${active ? GOLD_LITE : CYAN}" stroke-opacity="${active ? 1 : .55}" stroke-width="2"/>` +
      `<text x="${r(x + sw / 2)}" y="${sy + 46}" text-anchor="middle" font-family="${MONO}" font-size="30" font-weight="800" fill="${active ? '#17120a' : '#c9f6f8'}">${labels[i]}</text>`;
  });
  return `
  <text x="${W / 2}" y="238" text-anchor="middle" font-family="${MONO}" font-size="92" font-weight="800" letter-spacing="-2" filter="url(#${id}-glowf)">
    <tspan fill="${CREAM}">192.168.10.64</tspan><tspan fill="url(#${id}-gold)">/26</tspan>
  </text>
  <text x="${W / 2}" y="120" text-anchor="middle" font-family="${MONO}" font-size="22" font-weight="700" letter-spacing="9" fill="${CYAN}" fill-opacity=".85">255.255.255.192</text>
  ${cells}${bracket}${segs}`;
}

/* ---------- OSI-Modell ---------- */
function osi(id) {
  const names = ['Anwendung', 'Darstellung', 'Sitzung', 'Transport', 'Vermittlung', 'Sicherung', 'Bitübertragung'];
  // Obere (anwendungsnahe) Schichten in Cyan, untere (netznahe) in Gold/Orange.
  const palette = [CYAN, CYAN, CYAN, '#ffd27a', '#eab448', '#eda23a', '#f39a2b'];
  const mix = (t) => palette[Math.round(t * 6)];
  const x = 395, w = 500, h = 54, gap = 13, depth = 16, y0 = 108;
  let slabs = '';
  for (let i = 0; i < 7; i++) {
    const y = y0 + i * (h + gap), c = mix(i / 6), n = 7 - i;
    const hl = n === 4;
    slabs += `
    <polygon points="${x},${y} ${x + depth},${y - depth} ${x + w + depth},${y - depth} ${x + w},${y}" fill="${c}" fill-opacity="${hl ? .55 : .26}"/>
    <polygon points="${x + w},${y} ${x + w + depth},${y - depth} ${x + w + depth},${y + h - depth} ${x + w},${y + h}" fill="${c}" fill-opacity="${hl ? .4 : .16}"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${hl ? c : '#0d1619'}" fill-opacity="${hl ? .9 : 1}" stroke="${c}" stroke-width="2"/>
    <rect x="${x}" y="${y}" width="70" height="${h}" fill="${c}" fill-opacity="${hl ? 0 : .2}"/>
    <text x="${x + 35}" y="${y + 39}" text-anchor="middle" font-family="${MONO}" font-size="34" font-weight="800" fill="${hl ? '#14110a' : c}">${n}</text>
    <text x="${x + 96}" y="${y + 37}" font-family="${SANS}" font-size="27" font-weight="800" letter-spacing="-.5" fill="${hl ? '#14110a' : CREAM}">${names[i]}</text>`;
  }
  const yTop = y0 + 4, yBot = y0 + 6 * (h + gap) + h - 4;
  // Encapsulation going down (left), decapsulation going up (right).
  let packets = '';
  [[0, 1], [2, 1.35], [4, 1.7]].forEach(([i, s]) => {
    const y = y0 + i * (h + gap) + h / 2 + 30;
    packets += `<rect x="${r(300 - 18 * s)}" y="${r(y - 11)}" width="${r(36 * s)}" height="22" rx="4" fill="${mix(i / 6)}" fill-opacity=".85"/>`;
  });
  [[6, 1.7], [4, 1.35], [2, 1]].forEach(([i, s]) => {
    const y = y0 + i * (h + gap) + h / 2 - 30;
    packets += `<rect x="${r(1000 - 18 * s)}" y="${r(y - 11)}" width="${r(36 * s)}" height="22" rx="4" fill="${mix(i / 6)}" fill-opacity=".85"/>`;
  });
  return `
  <g filter="url(#${id}-glowf)">${slabs}</g>
  <path d="M300 ${yTop} V${yBot - 18}" stroke="${CYAN}" stroke-width="3" stroke-dasharray="2 12" stroke-linecap="round"/>
  <path d="M286 ${yBot - 30} L300 ${yBot - 8} L314 ${yBot - 30}" fill="none" stroke="${GOLD}" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M1000 ${yBot} V${yTop + 18}" stroke="${GOLD}" stroke-width="3" stroke-dasharray="2 12" stroke-linecap="round"/>
  <path d="M986 ${yTop + 30} L1000 ${yTop + 8} L1014 ${yTop + 30}" fill="none" stroke="${CYAN}" stroke-width="3.5" stroke-linejoin="round"/>
  ${packets}`;
}

/* ---------- Netzwerke: Routing & Switching ---------- */
function network(id) {
  const router = [640, 236], sw1 = [360, 432], sw2 = [920, 432];
  const hosts = [[230, 590], [360, 600], [490, 590], [790, 590], [920, 600], [1050, 590]];
  const link = (a, b, c, o = .7) => `<path d="M${a[0]} ${a[1]} L${b[0]} ${b[1]}" stroke="${c}" stroke-opacity="${o}" stroke-width="3"/>`;
  let s = '';
  s += `<path d="M640 92 V${router[1] - 80}" stroke="${GOLD}" stroke-width="3" stroke-dasharray="10 8"/>`;
  s += `<circle cx="640" cy="78" r="28" fill="#0e171a" stroke="${GOLD}" stroke-width="2.5"/><ellipse cx="640" cy="78" rx="12" ry="28" fill="none" stroke="${GOLD}" stroke-width="2"/><path d="M612 78 H668 M616 64 H664 M616 92 H664" stroke="${GOLD}" stroke-width="1.6"/>`;
  s += link(router, sw1, CYAN) + link(router, sw2, CYAN);
  hosts.forEach((h, i) => { s += link(i < 3 ? sw1 : sw2, h, i < 3 ? GOLD : CYAN, .45); });
  // Data packets on links.
  const dot = (x, y, c) => `<circle cx="${x}" cy="${y}" r="9" fill="${c}" filter="url(#${id}-glowf)"/><circle cx="${x}" cy="${y}" r="4" fill="#fff"/>`;
  s += dot(512, 326, GOLD) + dot(790, 347, CYAN) + dot(300, 512, GOLD) + dot(985, 512, CYAN) + dot(640, 140, GOLD);
  // Router
  s += `<g filter="url(#${id}-glowf)"><circle cx="${router[0]}" cy="${router[1]}" r="82" fill="#0f1719" stroke="url(#${id}-gold)" stroke-width="6"/></g>
  <circle cx="${router[0]}" cy="${router[1]}" r="64" fill="none" stroke="${GOLD}" stroke-opacity=".35" stroke-width="2"/>
  <g stroke="${GOLD_LITE}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M608 222 H672 M658 208 L672 222 L658 236"/>
    <path d="M672 250 H608 M622 236 L608 250 L622 264"/>
  </g>
  <text x="${router[0] + 104}" y="${router[1] + 8}" font-family="${MONO}" font-size="24" font-weight="800" fill="${GOLD}">R1</text>`;
  // Switches
  [[sw1, 'SW1 · VLAN 10', GOLD], [sw2, 'SW2 · VLAN 20', CYAN]].forEach(([p, label, c]) => {
    const x = p[0] - 150, y = p[1] - 38;
    s += `<rect x="${x}" y="${y}" width="300" height="76" rx="10" fill="#0e1619" stroke="${c}" stroke-width="3"/>`;
    for (let k = 0; k < 8; k++) {
      const px = x + 22 + k * 33;
      s += `<rect x="${px}" y="${y + 24}" width="22" height="18" rx="2" fill="#081014" stroke="${c}" stroke-opacity=".6" stroke-width="1.5"/>` +
        `<circle cx="${px + 11}" cy="${y + 54}" r="3.5" fill="${k % 3 === 1 ? '#3a4a4d' : c}"/>`;
    }
    s += `<text x="${p[0]}" y="${y - 14}" text-anchor="middle" font-family="${MONO}" font-size="21" font-weight="800" letter-spacing="1" fill="${c}">${label}</text>`;
  });
  // Hosts as small monitors
  hosts.forEach((h, i) => {
    const c = i < 3 ? GOLD : CYAN;
    s += `<rect x="${h[0] - 34}" y="${h[1] - 22}" width="68" height="46" rx="5" fill="#0d1518" stroke="${c}" stroke-width="2.5"/><path d="M${h[0] - 14} ${h[1] + 34} H${h[0] + 14} M${h[0]} ${h[1] + 24} V${h[1] + 34}" stroke="${c}" stroke-width="2.5"/>`;
  });
  return s;
}

/* ---------- Zahlensysteme (A1 · Bits zum bitteren Ende) ---------- */
function numbers(id) {
  const rand = rng(11);
  let rain = '';
  for (let c = 0; c < 26; c++) {
    const x = 30 + c * 49;
    let col = '';
    const start = rand() * 200 - 100;
    for (let k = 0; k < 14; k++) col += `<tspan x="${x}" dy="${k === 0 ? start : 50}">${rand() > .5 ? 1 : 0}</tspan>`;
    rain += `<text font-family="${MONO}" font-size="26" fill="${c % 4 === 0 ? GOLD : CYAN}" fill-opacity="${r(.05 + rand() * .07)}">${col}</text>`;
  }
  const digits = ['1', '0', '1', '1'], values = ['8', '4', '2', '1'];
  const dx = 150, x0 = W / 2 - 1.5 * dx;
  let main = '';
  digits.forEach((d, i) => {
    const x = x0 + i * dx, on = d === '1';
    main += `<text x="${x}" y="178" text-anchor="middle" font-family="${MONO}" font-size="38" font-weight="800" fill="${CYAN}">${values[i]}</text>` +
      `<path d="M${x} 196 V222" stroke="${CYAN}" stroke-opacity=".6" stroke-width="2.5"/>` +
      `<rect x="${x - 62}" y="236" width="124" height="176" rx="14" fill="${on ? GOLD : '#10191c'}" fill-opacity="${on ? .14 : 1}" stroke="${on ? GOLD : '#3c5357'}" stroke-width="3"/>` +
      `<text x="${x}" y="376" text-anchor="middle" font-family="${MONO}" font-size="150" font-weight="800" fill="${on ? 'url(#' + id + '-goldv)' : '#4b6266'}">${d}</text>`;
  });
  return `${rain}
  <g filter="url(#${id}-glowf)">${main}</g>
  <text x="${W / 2}" y="506" text-anchor="middle" font-family="${MONO}" font-size="50" font-weight="800" fill="${CREAM}">
    <tspan fill="${MUTED}">=</tspan> 11<tspan font-size="26" dy="10" fill="${MUTED}">10</tspan><tspan dy="-10" fill="${MUTED}">  =  </tspan><tspan fill="${GOLD}">0xB</tspan>
  </text>
  <text x="${W / 2}" y="574" text-anchor="middle" font-family="${MONO}" font-size="22" font-weight="700" letter-spacing="7" fill="${CYAN}" fill-opacity=".8">8 + 0 + 2 + 1</text>`;
}

/* ---------- IT-Sicherheit & Datenschutz ---------- */
function security(id) {
  const cx = 640, cy = 352;
  const shield = `M${cx} ${cy - 236} L${cx + 180} ${cy - 170} V${cy - 10} C${cx + 180} ${cy + 120} ${cx + 90} ${cy + 196} ${cx} ${cy + 236} C${cx - 90} ${cy + 196} ${cx - 180} ${cy + 120} ${cx - 180} ${cy - 10} V${cy - 170} Z`;
  const plain = ['Name', 'IBAN', 'Mail'];
  const cipher = ['9F3A', 'C17E', '04BD'];
  let streams = '';
  plain.forEach((t, i) => {
    const y = cy - 70 + i * 70;
    streams += `<path d="M150 ${y} H${cx - 196}" stroke="${CYAN}" stroke-opacity=".45" stroke-width="2.5" stroke-dasharray="3 9" stroke-linecap="round"/>` +
      `<rect x="${170 + i * 26}" y="${y - 22}" width="128" height="44" rx="8" fill="#0d1a1d" stroke="${CYAN}" stroke-width="2"/>` +
      `<text x="${234 + i * 26}" y="${y + 9}" text-anchor="middle" font-family="${MONO}" font-size="23" font-weight="700" fill="${CREAM}">${t}</text>`;
  });
  cipher.forEach((t, i) => {
    const y = cy - 70 + i * 70;
    streams += `<path d="M${cx + 196} ${y} H1130" stroke="${GOLD}" stroke-opacity=".55" stroke-width="2.5" stroke-dasharray="3 9" stroke-linecap="round"/>` +
      `<rect x="${960 - i * 26}" y="${y - 22}" width="128" height="44" rx="8" fill="#1c160b" stroke="${GOLD}" stroke-width="2"/>` +
      `<text x="${1024 - i * 26}" y="${y + 9}" text-anchor="middle" font-family="${MONO}" font-size="23" font-weight="800" fill="${GOLD_LITE}">${t}</text>`;
  });
  return `${streams}
  <path d="${shield}" fill="#0c1416" stroke="${CYAN}" stroke-opacity=".5" stroke-width="3"/>
  <path d="${shield}" fill="none" stroke="${CYAN}" stroke-opacity=".12" stroke-width="22"/>
  <g filter="url(#${id}-glowf)">
    <path d="M${cx - 62} ${cy - 18} V${cy - 66} A62 62 0 0 1 ${cx + 62} ${cy - 66} V${cy - 18}" fill="none" stroke="url(#${id}-gold)" stroke-width="24" stroke-linecap="round"/>
    <rect x="${cx - 108}" y="${cy - 24}" width="216" height="166" rx="22" fill="url(#${id}-gold)"/>
  </g>
  <rect x="${cx - 92}" y="${cy - 8}" width="184" height="134" rx="14" fill="none" stroke="#7a5214" stroke-opacity=".45" stroke-width="2"/>
  <circle cx="${cx}" cy="${cy + 40}" r="22" fill="#14100a"/>
  <path d="M${cx - 9} ${cy + 52} L${cx - 13} ${cy + 96} H${cx + 13} L${cx + 9} ${cy + 52} Z" fill="#14100a"/>`;
}

/* ---------- Prüfungsvorbereitung ---------- */
function exam(id) {
  const cx = 470, cy = 380, R = 178;
  let ticks = '';
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2, big = i % 5 === 0;
    const r1 = R - (big ? 30 : 16), r2 = R - 6;
    ticks += `<path d="M${r(cx + Math.sin(a) * r1)} ${r(cy - Math.cos(a) * r1)} L${r(cx + Math.sin(a) * r2)} ${r(cy - Math.cos(a) * r2)}" stroke="${big ? GOLD : '#5b6f73'}" stroke-width="${big ? 4 : 2}"/>`;
  }
  // Progress arc (3/4 of the time used).
  const a2 = Math.PI * 1.5, rr = R + 22;
  const arc = `M${cx} ${cy - rr} A${rr} ${rr} 0 1 1 ${r(cx + Math.sin(a2) * rr)} ${r(cy - Math.cos(a2) * rr)}`;
  const rows = [['OSI-Modell', true], ['IPv4 & Subnetting', true], ['Datenschutz', true], ['WiSo', false]];
  let list = '';
  rows.forEach(([t, ok], i) => {
    const y = 236 + i * 84;
    list += `<rect x="760" y="${y}" width="40" height="40" rx="8" fill="${ok ? CYAN : 'none'}" fill-opacity="${ok ? .16 : 0}" stroke="${ok ? CYAN : GOLD}" stroke-width="3"/>` +
      (ok ? `<path d="M770 ${y + 21} L777 ${y + 29} L791 ${y + 11}" fill="none" stroke="${CYAN}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>` : '') +
      `<text x="822" y="${y + 30}" font-family="${SANS}" font-size="30" font-weight="800" letter-spacing="-.5" fill="${ok ? CREAM : GOLD_LITE}">${esc(t)}</text>`;
  });
  return `
  <rect x="${cx - 26}" y="${cy - R - 62}" width="52" height="34" rx="6" fill="url(#${id}-gold)"/>
  <rect x="${cx - 12}" y="${cy - R - 30}" width="24" height="26" fill="${GOLD}"/>
  <path d="M${cx + 128} ${cy - R + 6} l26 -26" stroke="${GOLD}" stroke-width="12" stroke-linecap="round"/>
  <circle cx="${cx}" cy="${cy}" r="${R + 22}" fill="none" stroke="#1d2a2d" stroke-width="10"/>
  <path d="${arc}" fill="none" stroke="${CYAN}" stroke-width="10" stroke-linecap="round" filter="url(#${id}-glowf)"/>
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="#0c1416" stroke="url(#${id}-gold)" stroke-width="10"/>
  ${ticks}
  <text x="${cx}" y="${cy + 34}" text-anchor="middle" font-family="${MONO}" font-size="96" font-weight="800" letter-spacing="-3" fill="${CREAM}" filter="url(#${id}-glowf)">90:00</text>
  <text x="${cx}" y="${cy + 84}" text-anchor="middle" font-family="${MONO}" font-size="20" font-weight="800" letter-spacing="8" fill="${GOLD}">MINUTEN</text>
  <rect x="736" y="200" width="430" height="356" rx="16" fill="url(#${id}-panel)" stroke="${GOLD}" stroke-opacity=".45" stroke-width="2"/>
  ${list}`;
}

/* ---------- Hardware ---------- */
function hardware(id) {
  const cx = 640, cy = 360, half = 132;
  let pins = '', traces = '';
  const rand = rng(23);
  for (let i = 0; i < 9; i++) {
    const o = -half + 26 + i * ((2 * half - 52) / 8);
    // top/bottom/left/right pins
    pins += `<rect x="${r(cx + o - 5)}" y="${cy - half - 26}" width="10" height="26" rx="2" fill="${GOLD}"/>` +
      `<rect x="${r(cx + o - 5)}" y="${cy + half}" width="10" height="26" rx="2" fill="${GOLD}"/>` +
      `<rect x="${cx - half - 26}" y="${r(cy + o - 5)}" width="26" height="10" rx="2" fill="${GOLD}"/>` +
      `<rect x="${cx + half}" y="${r(cy + o - 5)}" width="26" height="10" rx="2" fill="${GOLD}"/>`;
    const c = i % 3 === 0 ? GOLD : CYAN, op = r(.35 + rand() * .4);
    const len = 60 + rand() * 120, bend = (i - 4) * 18;
    // left & right traces
    traces += `<path d="M${cx - half - 26} ${r(cy + o)} H${r(cx - half - 26 - len)} L${r(cx - half - 56 - len)} ${r(cy + o + bend)} H${r(cx - half - 140 - len)}" stroke="${c}" stroke-opacity="${op}" stroke-width="3" fill="none"/>` +
      `<circle cx="${r(cx - half - 140 - len)}" cy="${r(cy + o + bend)}" r="6" fill="#080c0e" stroke="${c}" stroke-width="2.5"/>`;
    traces += `<path d="M${cx + half + 26} ${r(cy + o)} H${r(cx + half + 26 + len)} L${r(cx + half + 56 + len)} ${r(cy + o - bend)} H${r(cx + half + 140 + len)}" stroke="${c}" stroke-opacity="${op}" stroke-width="3" fill="none"/>` +
      `<circle cx="${r(cx + half + 140 + len)}" cy="${r(cy + o - bend)}" r="6" fill="#080c0e" stroke="${c}" stroke-width="2.5"/>`;
    if (i % 2 === 0) {
      traces += `<path d="M${r(cx + o)} ${cy - half - 26} V${r(cy - half - 70 - rand() * 60)}" stroke="${c}" stroke-opacity="${op}" stroke-width="3"/>` +
        `<path d="M${r(cx + o)} ${cy + half + 26} V${r(cy + half + 70 + rand() * 50)}" stroke="${c}" stroke-opacity="${op}" stroke-width="3"/>`;
    }
  }
  return `${traces}${pins}
  <rect x="${cx - half}" y="${cy - half}" width="${2 * half}" height="${2 * half}" rx="18" fill="#121a1c" stroke="${GOLD}" stroke-width="4"/>
  <g filter="url(#${id}-glowf)"><rect x="${cx - 78}" y="${cy - 78}" width="156" height="156" rx="10" fill="url(#${id}-gold)"/></g>
  <rect x="${cx - 62}" y="${cy - 62}" width="124" height="124" rx="6" fill="none" stroke="#7a5214" stroke-opacity=".5" stroke-width="2"/>
  <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-family="${MONO}" font-size="44" font-weight="800" fill="#17120a">CPU</text>
  <circle cx="${cx - half + 24}" cy="${cy - half + 24}" r="7" fill="${CYAN}"/>`;
}

/* ---------- IT-Grundlagen (allgemeines Motiv) ---------- */
function basics(id) {
  const x = 330, y = 150, w = 620, h = 400;
  const lines = [
    [`<tspan fill="${CYAN}">$</tspan> whoami`, CREAM],
    ['dau', MUTED],
    [`<tspan fill="${CYAN}">$</tspan> lernen --verstehen --ueben`, CREAM],
    ['[####################-----] 80 %', GOLD],
    [`<tspan fill="${CYAN}">$</tspan> whoami`, CREAM],
    ['pro', GOLD_LITE]
  ];
  let text = '';
  lines.forEach(([t, c], i) => { text += `<text x="${x + 40}" y="${y + 104 + i * 47}" font-family="${MONO}" font-size="27" font-weight="700" fill="${c}">${t}</text>`; });
  return `
  <text x="1010" y="610" text-anchor="middle" font-family="${MONO}" font-size="250" font-weight="800" fill="${CYAN}" fill-opacity=".07">&lt;/&gt;</text>
  <g filter="url(#${id}-glowf)"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#0b1214" stroke="url(#${id}-gold)" stroke-width="4"/></g>
  <path d="M${x} ${y + 52} H${x + w}" stroke="${GOLD}" stroke-opacity=".4" stroke-width="2"/>
  <circle cx="${x + 32}" cy="${y + 26}" r="8" fill="${ORANGE}"/><circle cx="${x + 58}" cy="${y + 26}" r="8" fill="${GOLD}"/><circle cx="${x + 84}" cy="${y + 26}" r="8" fill="${CYAN}"/>
  <text x="${x + w / 2}" y="${y + 33}" text-anchor="middle" font-family="${MONO}" font-size="17" font-weight="700" letter-spacing="3" fill="${MUTED}">dau-to-pro ~ bash</text>
  ${text}
  <rect x="${x + 128}" y="${y + 104 + 5 * 47 + 12}" width="16" height="30" fill="${CYAN}"/>`;
}

/* ---------- D1: Datenschutz ---------- */
function privacy(id) {
  const records = [0,1,2].map(i => `<g transform="translate(${180+i*19} ${208-i*19})">
    <path d="M0 0H238L274 36V292H0Z" fill="#17151d" stroke="${CYAN}" stroke-width="3"/>
    <circle cx="65" cy="78" r="22" fill="${CYAN}" opacity=".8"/><path d="M29 136v-12q36-40 72 0v12" fill="${CYAN}" opacity=".55"/>
    <path d="M128 67h100M128 92h74M30 179h198M30 207h165M30 235h198" stroke="${CREAM}" stroke-width="9" opacity=".35"/>
  </g>`).join('');
  return `<text x="640" y="119" text-anchor="middle" font-family="${MONO}" font-size="24" font-weight="700" letter-spacing="7" fill="${CYAN}">D1 // DATENSCHUTZ</text>
    ${records}
    <path d="M505 359H750" stroke="${CYAN}" stroke-width="3" stroke-dasharray="8 10" opacity=".5"/>
    <g filter="url(#${id}-glowf)"><path d="M843 202l154 56v111q0 113-154 170-154-57-154-170V258Z" fill="#17151d" stroke="url(#${id}-gold)" stroke-width="7"/></g>
    <path d="M807 348v-36a36 36 0 0 1 72 0v36" fill="none" stroke="${GOLD_LITE}" stroke-width="13"/>
    <path d="M792 343h102v86H792Z" fill="${GOLD}"/><circle cx="843" cy="376" r="11" fill="#18151b"/><path d="M843 381v21" stroke="#18151b" stroke-width="10"/>
    <path d="M726 500l-33 14-15-35M976 196l30-21 18 31" fill="none" stroke="${CYAN}" stroke-width="3"/>
    <text x="640" y="609" text-anchor="middle" font-family="${SANS}" font-size="42" font-weight="900" fill="${GOLD_LITE}">DEINE DATEN. KEIN BUFFET.</text>
    <text x="640" y="650" text-anchor="middle" font-family="${MONO}" font-size="21" fill="${CREAM}" opacity=".7">Rechte verstehen. Fälle entscheiden.</text>`;
}

function d2Security(id) {
  return `<text x="100" y="196" fill="${CREAM}" font-family="${SANS}" font-size="45" font-weight="900">PASSWORT123</text>
  <text x="100" y="246" fill="${GOLD}" font-family="${SANS}" font-size="35" font-weight="900">IST KEIN KONZEPT.</text>
  <g transform="translate(818 155)"><path d="M0 0 L148 55 V205 Q148 320 0 384 Q-148 320 -148 205 V55 Z" fill="#160f14" stroke="${CYAN}" stroke-width="5"/>
  <path d="M-45 158 V115 A45 45 0 0 1 45 115 V158" fill="none" stroke="${GOLD}" stroke-width="19"/>
  <rect x="-76" y="151" width="152" height="125" rx="7" fill="url(#${id}-gold)"/><circle cy="201" r="14" fill="#171016"/><path d="M-6 211 V239 H6 V211" fill="#171016"/></g>
  <g font-family="${MONO}" font-size="22"><path d="M100 320 H490 M100 400 H490 M100 480 H490" stroke="${CYAN}" stroke-opacity=".35"/><text x="110" y="355" fill="${CREAM}">VERTRAULICHKEIT</text><text x="110" y="435" fill="${CREAM}">INTEGRITÄT</text><text x="110" y="515" fill="${CREAM}">VERFÜGBARKEIT</text></g>
  <text x="100" y="620" fill="${GOLD}" font-family="${MONO}" font-size="22">PRÜFEN · BEGRÜNDEN · HANDELN</text>`;
}
// B4: acht Hex-Blöcke werden zur klaren Kurzform, Präfix und Geräteanteil sichtbar.
function ipv6(id) {
  let blocks='';
  ['2001','0db8','0012','0034','0000','0000','0000','0007'].forEach((v,i)=>{
    const x=130+i*130;
    blocks+=`<rect x="${x}" y="210" width="118" height="90" fill="#0b1615" stroke="${i<4?GOLD:CYAN}" stroke-width="3"/><text x="${x+59}" y="265" text-anchor="middle" fill="${i<4?GOLD_LITE:CYAN}" font-family="${MONO}" font-size="30" font-weight="700">${v}</text>`;
  });
  return `<text x="640" y="155" text-anchor="middle" fill="${CREAM}" font-family="${SANS}" font-size="38" font-weight="800">IPv6 · 128 BIT. EIN KLARER PLAN.</text>
  ${blocks}<path d="M135 325 H640 M650 325 H1160" stroke="${GOLD}" stroke-width="2"/><text x="385" y="365" text-anchor="middle" fill="${GOLD_LITE}" font-family="${MONO}" font-size="25">NETZPRÄFIX /64</text><text x="910" y="365" text-anchor="middle" fill="${CYAN}" font-family="${MONO}" font-size="25">INTERFACE-ID</text>
  <path d="M640 393 V435 M620 418 L640 438 L660 418" fill="none" stroke="${GOLD}" stroke-width="5"/>
  <text x="640" y="515" text-anchor="middle" fill="${CREAM}" font-family="${MONO}" font-size="53" font-weight="800">2001:db8:12:34::7</text>
  <text x="640" y="575" text-anchor="middle" fill="${GOLD_LITE}" font-family="${SANS}" font-size="27" font-weight="700">DOPPELPUNKT, DOPPELPUNKT, DURCHBLICK</text>`;
}

function services(id) {
  const ports = [ ['22','SSH'], ['53','DNS'], ['67','DHCP'], ['80','HTTP'], ['443','HTTPS'], ['993','IMAPS'] ];
  return `<text x="640" y="140" text-anchor="middle" fill="${CREAM}" font-family="${SANS}" font-size="42" font-weight="850">PORT 80, BITTE KOMMEN</text>
    <text x="640" y="185" text-anchor="middle" fill="${CYAN}" font-family="${MONO}" font-size="23">B5 // NETZWERKDIENSTE &amp; PROTOKOLLE</text>
    <path d="M180 360 H1100 M640 235 V555" stroke="${GOLD}" stroke-width="3" stroke-opacity=".5"/>
    ${ports.map(([port,name],i)=>{const x=220+(i%3)*330,y=245+Math.floor(i/3)*170;return `<g><rect x="${x}" y="${y}" width="180" height="120" rx="4" fill="#0c1a28" stroke="${CYAN}" stroke-width="2"/><text x="${x+90}" y="${y+56}" text-anchor="middle" font-family="${MONO}" font-size="44" font-weight="800" fill="${GOLD_LITE}">${port}</text><text x="${x+90}" y="${y+92}" text-anchor="middle" font-family="${MONO}" font-size="24" fill="${CYAN}">${name}</text></g>`}).join('')}
    <text x="640" y="625" text-anchor="middle" fill="${MUTED}" font-family="${MONO}" font-size="23">SYN → SYN-ACK → DURCHBLICK</text>`;
}

function kalkulation(id) {
  return `
  <text x="640" y="110" text-anchor="middle" font-family="${SANS}" font-size="34" font-weight="900" letter-spacing="4" fill="${CYAN}">KALKULATION &amp; BESCHAFFUNG</text>
  <g transform="translate(210 180)">
    <path d="M0 0H340L370 30V390H0Z" fill="#11191b" stroke="${GOLD}" stroke-width="3"/>
    <text x="32" y="57" font-family="${MONO}" font-size="25" font-weight="800" fill="${GOLD_LITE}">ANGEBOT</text>
    <g font-family="${MONO}" font-size="24" fill="${CREAM}">
      <text x="32" y="115">Liste    1.000 €</text>
      <text x="32" y="165">Rabatt   −100 €</text>
      <text x="32" y="215">Skonto    −18 €</text>
      <text x="32" y="265">Fracht    +20 €</text>
    </g>
    <path d="M30 295H335" stroke="${CYAN}" stroke-width="2"/>
    <text x="32" y="351" font-family="${MONO}" font-size="40" font-weight="900" fill="${GOLD_LITE}">902 €</text>
  </g>
  <g transform="translate(700 235)">
    <path d="M0 0H300V290H0Z" fill="#11191b" stroke="${CYAN}" stroke-width="3"/>
    <path d="M34 230H270M34 230V40" fill="none" stroke="${MUTED}" stroke-width="2"/>
    <path d="M34 210L265 50" fill="none" stroke="${GOLD}" stroke-width="7"/>
    <path d="M34 125L265 100" fill="none" stroke="${CYAN}" stroke-width="5"/>
    <circle cx="178" cy="110" r="12" fill="${GOLD_LITE}"/>
    <text x="150" y="272" text-anchor="middle" font-family="${MONO}" font-size="23" font-weight="800" fill="${CYAN}">BREAK-EVEN</text>
  </g>
  <text x="640" y="640" text-anchor="middle" font-family="${SANS}" font-size="38" font-weight="900" fill="${GOLD_LITE}">RECHNET SICH DAS?</text>`;
}

function unternehmen(id) {
  return `
  <text x="640" y="104" text-anchor="middle" font-family="${SANS}" font-size="34" font-weight="900" letter-spacing="4" fill="${CYAN}">UNTERNEHMEN &amp; MÄRKTE</text>
  <g transform="translate(150 250)" font-family="${MONO}" font-weight="800">
    <path d="M0 70L110 0L220 70V250H0Z" fill="#14111c" stroke="${CYAN}" stroke-width="3"/>
    <g stroke="${MUTED}" stroke-width="2"><path d="M30 110H190M30 145H190M30 180H190M30 215H190"/></g>
    <path d="M30 95H190V250H30Z" fill="none" stroke="${CYAN}" stroke-width="3"/>
    <text x="110" y="290" text-anchor="middle" font-size="26" fill="${CREAM}">GARAGE</text>
    <text x="110" y="62" text-anchor="middle" font-size="22" fill="${GOLD_LITE}">e.K.</text>
  </g>
  <path d="M400 410H470" stroke="${GOLD}" stroke-width="6"/><path d="M462 396L486 410L462 424Z" fill="${GOLD}"/>
  <g transform="translate(510 190)" font-family="${MONO}" font-weight="800">
    <path d="M0 0H210V310H0Z" fill="#14111c" stroke="${CYAN}" stroke-width="3"/>
    <g fill="${CYAN}" opacity=".55">${[0,1,2,3].map(r=>[0,1,2].map(c=>`<rect x="${28+c*58}" y="${30+r*62}" width="38" height="36"/>`).join('')).join('')}</g>
    <text x="105" y="350" text-anchor="middle" font-size="26" fill="${CREAM}">GMBH</text>
  </g>
  <path d="M750 410H820" stroke="${GOLD}" stroke-width="6"/><path d="M812 396L836 410L812 424Z" fill="${GOLD}"/>
  <g transform="translate(860 140)" font-family="${MONO}" font-weight="800">
    <path d="M0 0H170V360H0Z" fill="#14111c" stroke="${GOLD}" stroke-width="3"/>
    <path d="M85 -40V0" stroke="${GOLD}" stroke-width="4"/>
    <g fill="${GOLD_LITE}" opacity=".55">${[0,1,2,3,4,5].map(r=>[0,1].map(c=>`<rect x="${32+c*66}" y="${24+r*54}" width="40" height="30"/>`).join('')).join('')}</g>
    <text x="85" y="400" text-anchor="middle" font-size="26" fill="${CREAM}">AG</text>
  </g>
  <g transform="translate(352 425) rotate(-14)">
    <circle r="62" fill="#2a0f16" stroke="#ff6b7d" stroke-width="5"/>
    <circle r="48" fill="none" stroke="#ff6b7d" stroke-width="2" stroke-dasharray="6 5"/>
    <text y="-6" text-anchor="middle" font-family="${SANS}" font-size="17" font-weight="900" fill="#ffb3bd">GEPFÄNDET</text>
    <text y="18" text-anchor="middle" font-family="${MONO}" font-size="15" font-weight="800" fill="#ffb3bd">SOFA</text>
  </g>
  <text x="640" y="655" text-anchor="middle" font-family="${SANS}" font-size="36" font-weight="900" fill="${GOLD_LITE}">GARAGE, GEWINN, GERICHTSVOLLZIEHER</text>`;
}

function csharp(id) {
  return `
  <text x="640" y="104" text-anchor="middle" font-family="${SANS}" font-size="34" font-weight="900" letter-spacing="4" fill="${CYAN}">PROGRAMMIEREN MIT C#</text>
  <g transform="translate(190 150)">
    <path d="M0 0H900V400H0Z" fill="#11101c" stroke="${CYAN}" stroke-width="3"/>
    <path d="M0 0H900V46H0Z" fill="#1c1830"/>
    <circle cx="28" cy="23" r="8" fill="#ff7b8a"/><circle cx="54" cy="23" r="8" fill="${GOLD}"/><circle cx="80" cy="23" r="8" fill="#9be58f"/>
    <text x="120" y="31" font-family="${MONO}" font-size="20" fill="${MUTED}">Program.cs</text>
    <g font-family="${MONO}" font-size="30" font-weight="700">
      <text x="34" y="105" fill="${MUTED}">1</text><text x="84" y="105"><tspan fill="${CYAN}">for</tspan><tspan fill="${CREAM}"> (</tspan><tspan fill="${CYAN}">int</tspan><tspan fill="${CREAM}"> i = </tspan><tspan fill="${GOLD_LITE}">0</tspan><tspan fill="${CREAM}">; i &lt; </tspan><tspan fill="${GOLD_LITE}">3</tspan><tspan fill="${CREAM}">; i++)</tspan></text>
      <text x="34" y="155" fill="${MUTED}">2</text><text x="84" y="155" fill="${CREAM}">{</text>
      <text x="34" y="205" fill="${MUTED}">3</text><text x="134" y="205"><tspan fill="#7fd6ff">Console</tspan><tspan fill="${CREAM}">.WriteLine(</tspan><tspan fill="#9be58f">"Läuft"</tspan><tspan fill="${CREAM}">)</tspan></text>
      <text x="34" y="255" fill="${MUTED}">4</text><text x="84" y="255" fill="${CREAM}">}</text>
    </g>
    <path d="M612 215q10 10 20 0t20 0t20 0" fill="none" stroke="#ff7b8a" stroke-width="5"/>
    <path d="M0 290H900V400H0Z" fill="#0a0912"/>
    <text x="34" y="338" font-family="${MONO}" font-size="24" font-weight="700" fill="#ff7b8a">CS1002: ; erwartet</text>
    <text x="34" y="376" font-family="${MONO}" font-size="20" fill="${MUTED}">Build fehlgeschlagen. Der Compiler hat recht.</text>
  </g>
  <text x="640" y="630" text-anchor="middle" font-family="${SANS}" font-size="38" font-weight="900" fill="${GOLD_LITE}">DER COMPILER HAT IMMER RECHT</text>`;
}

export const motifs = [
  { id: 'unternehmen', accent: '#ff9a3c', label: 'Unternehmensformen & Märkte', draw: unternehmen, seed: 43, glowX: 640, glowY: 380 },
  { id: 'csharp', accent: '#b794ff', label: 'Programmieren mit C#', draw: csharp, seed: 37, glowX: 640, glowY: 360 },
  { id: 'kalkulation', accent: '#f6c177', label: 'Kalkulation & Beschaffung', draw: kalkulation, seed: 31, glowX: 640, glowY: 360 },
  { id: 'netzwerkdienste', accent: '#7ad0ff', label: 'Netzwerkdienste & Protokolle', draw: services, seed: 31, glowX: 640, glowY: 360 },
  { id:'ipv6', accent:'#4fd1c5', label:'IPv6 · Doppelpunkt, Doppelpunkt, Durchblick', draw:ipv6, seed:31, glowX:640, glowY:360 },
  { id: 'd2-it-sicherheit', accent: '#ff6b6b', label: 'IT-Sicherheit', draw: d2Security, seed: 41, glowX: 818, glowY: 360 },
  { id: 'datenschutz', accent: '#ff8fa3', label: 'Datenschutz · DSGVO', draw: privacy, seed: 31, glowX: 800, glowY: 360 },
  { id: 'ipv4-subnetting', accent: '#5de7e4', label: 'IPv4 & Subnetting', draw: ipv4, seed: 3, glowX: 640, glowY: 360 },
  { id: 'osi-modell', accent: '#c4a8ff', label: 'OSI-Modell', draw: osi, seed: 5, glowX: 660, glowY: 330 },
  { id: 'netzwerke-routing', accent: '#e0977a', label: 'Netzwerke · Routing & Switching', draw: network, seed: 7, glowX: 640, glowY: 300 },
  { id: 'zahlensysteme', accent: '#a6f05a', label: 'Zahlensysteme · Bits & Bytes', draw: numbers, seed: 9, glowX: 640, glowY: 320 },
  { id: 'it-sicherheit', accent: '#ff7f8f', label: 'IT-Sicherheit & Datenschutz', draw: security, seed: 13, glowX: 640, glowY: 360 },
  { id: 'pruefung', accent: '#7aa2ff', label: 'Prüfungsvorbereitung', draw: exam, seed: 17, glowX: 520, glowY: 380 },
  { id: 'hardware', accent: '#6fe3c1', label: 'Hardware & Architektur', draw: hardware, seed: 19, glowX: 640, glowY: 360 },
  { id: 'it-grundlagen', accent: '#b9c4d0', label: 'IT-Grundlagen', draw: basics, seed: 29, glowX: 640, glowY: 350 }
];

export function svgFor(motif) {
  CYAN = motif.accent || '#00dce8';
  return frame(motif.id, motif.draw, { seed: motif.seed, glowX: motif.glowX, glowY: motif.glowY });
}

