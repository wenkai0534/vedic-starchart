import * as THREE from '../vendor/three/build/three.module.js';
import { OrbitControls } from '../vendor/three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from '../vendor/three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/three/examples/jsm/postprocessing/OutputPass.js';
import { LineSegments2 } from '../vendor/three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from '../vendor/three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from '../vendor/three/examples/jsm/lines/LineMaterial.js';
import { computeFromInputs, compute } from './panchanga.js';

const SKY_R = 100;
const params = new URLSearchParams(location.search);
const CLEAN = params.has('clean') || params.get('hideui') === '1';
if (CLEAN) document.documentElement.classList.add('clean');

const VIEW_PRESETS = {
  sphere: { pos: new THREE.Vector3(-83.820, 99.016, -230.294), target: new THREE.Vector3(0, 4, 0), fov: 44 },
  orbits: { pos: new THREE.Vector3(-22.313, 14.838, -8.121), target: new THREE.Vector3(0, 0, 0), fov: 48 },
  close: { pos: new THREE.Vector3(52.775, -22.000, -62.895), target: new THREE.Vector3(23.668, 17.364, -28.207), fov: 70 },
};

const RASIS = [
  'Meṣa', 'Vṛṣabha', 'Mithuna', 'Karka', 'Siṃha', 'Kanyā',
  'Tulā', 'Vṛścika', 'Dhanu', 'Makara', 'Kumbha', 'Mīna',
];
const NAKS = [
  'Aśvinī', 'Bharaṇī', 'Kṛttikā', 'Rohiṇī', 'Mṛgaśīrṣa', 'Ārdrā',
  'Punarvasu', 'Puṣya', 'Aśleṣā', 'Maghā', 'Pū. Phalgunī', 'U. Phalgunī',
  'Hasta', 'Citrā', 'Svātī', 'Viśākhā', 'Anurādhā', 'Jyeṣṭhā',
  'Mūla', 'Pū. Āṣāḍhā', 'U. Āṣāḍhā', 'Śravaṇa', 'Dhaniṣṭhā', 'Śatabhiṣaj',
  'Pū. Bhādrapadā', 'U. Bhādrapadā', 'Revatī',
];

const PLANET_STYLE = {
  sun:     { color: 0xfff1c2, glow: 0xffd27a, size: 0.55, light: 2.4 },
  moon:    { color: 0xe8eef6, glow: 0xc9d4e8, size: 0.22, light: 0.6 },
  mercury: { color: 0xc9c0b0, glow: 0xa89f8e, size: 0.13, light: 0.3 },
  venus:   { color: 0xf5e6c8, glow: 0xe8d4a0, size: 0.20, light: 0.5 },
  earth:   { color: 0x6fa4d2, glow: 0x7ec8ff, size: 0.22, light: 0.4 },
  mars:    { color: 0xd9845b, glow: 0xff8a5c, size: 0.16, light: 0.4 },
  jupiter: { color: 0xf0d2a0, glow: 0xffe0a8, size: 0.34, light: 0.5 },
  saturn:  { color: 0xe8d8a8, glow: 0xffe9b8, size: 0.30, light: 0.45 },
  uranus:  { color: 0x9fd6e6, glow: 0x8fe8ff, size: 0.22, light: 0.3 },
  neptune: { color: 0x5b7fd4, glow: 0x6a8cff, size: 0.21, light: 0.3 },
  rahu:    { color: 0xb8a0d8, glow: 0xc9b0ff, size: 0.16, light: 0.2 },
  ketu:    { color: 0xd8b8a0, glow: 0xffd0a8, size: 0.16, light: 0.2 },
};

function deg(d) { return d * Math.PI / 180; }
function norm360(x) { return ((x % 360) + 360) % 360; }

function eqDir(raDeg, decDeg, r = 1) {
  const ra = deg(raDeg), dec = deg(decDeg);
  const cd = Math.cos(dec);
  return new THREE.Vector3(
    r * cd * Math.cos(ra),
    r * Math.sin(dec),
    r * cd * Math.sin(ra),
  );
}

function eclToEq(lonDeg, latDeg, r, eps) {
  const lon = deg(lonDeg), lat = deg(latDeg);
  const cl = Math.cos(lon), sl = Math.sin(lon);
  const cb = Math.cos(lat), sb = Math.sin(lat);
  const x = r * cb * cl;
  const ye = r * sb;
  const ze = r * cb * sl;
  const ce = Math.cos(eps), se = Math.sin(eps);
  return new THREE.Vector3(x, ye * ce + ze * se, ze * ce - ye * se);
}

function orbitScale(au) {
  if (au == null || au <= 0) return 0;
  return 16.5 * Math.pow(au / 30, 0.58);
}

function bvToColor(bv) {
  let t;
  if (bv < -0.3) t = 0x9bbcff;
  else if (bv < 0.0) t = 0xb9ceff;
  else if (bv < 0.3) t = 0xe4eeff;
  else if (bv < 0.6) t = 0xfff4e8;
  else if (bv < 1.0) t = 0xffe2b0;
  else if (bv < 1.5) t = 0xffc07a;
  else t = 0xff9a5c;
  return t;
}

function makeStarSprite() {
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.18, 'rgba(255,255,255,0.9)');
  grd.addColorStop(0.4, 'rgba(255,255,240,0.35)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeLabel(text, opts = {}) {
  const {
    color = '#d5e6ff', fontSize = 28, font = '"Noto Serif CJK SC", "Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", serif',
    weight = '500', stroke = 'rgba(0,0,0,0.85)', pad = 8,
  } = opts;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = `${weight} ${fontSize}px ${font}`;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  const h = Math.ceil(fontSize * 1.5) + pad;
  c.width = w * 2; c.height = h * 2;
  const g = c.getContext('2d');
  g.scale(2, 2);
  g.font = `${weight} ${fontSize}px ${font}`;
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.strokeStyle = stroke;
  g.lineWidth = 3.2;
  g.lineJoin = 'round';
  g.strokeText(text, pad, h / 2);
  g.fillStyle = color;
  g.fillText(text, pad, h / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, transparent: true, depthTest: true, depthWrite: false,
    sizeAttenuation: true,
  }));
  const worldH = opts.worldH ?? 1.6;
  spr.scale.set(worldH * (w / h), worldH, 1);
  spr.center.set(0, 0.5);
  spr.userData.kind = 'label';
  return spr;
}

async function loadJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return r.json();
}

function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';
  } catch {
    return 'Asia/Shanghai';
  }
}

function nowInTimeZone(timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date()).map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
  };
}

function getDefaultInput() {
  const timeZone = getBrowserTimeZone();
  const { date, time } = nowInTimeZone(timeZone);
  return {
    date,
    time,
    timeZone,
    lat: 39.904,
    lon: 116.407,
    place: '北京',
  };
}

const DEFAULT_INPUT = getDefaultInput();

function isMobileView() {
  try {
    return window.matchMedia('(max-width: 820px), (pointer: coarse)').matches;
  } catch {
    return innerWidth <= 820;
  }
}

function preferMobileTexture() {
  const tex = (params.get('tex') || '').toLowerCase();
  if (tex === 'full' || tex === 'desktop') return false;
  if (tex === 'mobile' || tex === 'low') return true;
  try {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const narrow = window.matchMedia('(max-width: 820px)').matches;
    return coarse || narrow;
  } catch {
    return innerWidth <= 820;
  }
}

function readRotatePref() {
  if (params.has('rotate')) {
    const v = (params.get('rotate') || '1').toLowerCase();
    return !(v === '0' || v === 'false' || v === 'off' || v === 'no');
  }
  try {
    const stored = localStorage.getItem('starchart-auto-rotate');
    if (stored === '0') return false;
    if (stored === '1') return true;
  } catch {}
  return true;
}

function parseInputFromUrl() {
  const input = { ...DEFAULT_INPUT };
  const dt = params.get('dt');
  if (dt) {
    const [date, rest = ''] = dt.split('T');
    if (date) input.date = date;
    let time = rest.replace(/[Zz].*$/, '').replace(/[+-]\d{2}:?\d{2}$/, '').slice(0, 8);
    if (time.length === 5) time += ':00';
    if (time) input.time = time;
  }
  if (params.get('date')) input.date = params.get('date');
  if (params.get('time')) {
    let t = params.get('time').replace(/：/g, ':');
    if (/^\d{1,2}:\d{2}$/.test(t)) t += ':00';
    input.time = t;
  }
  const tz = params.get('timezone') || params.get('tz');
  if (tz) input.timeZone = tz;
  if (params.get('lat')) {
    const lat = parseFloat(params.get('lat'));
    if (Number.isFinite(lat)) input.lat = lat;
  }
  if (params.get('lon')) {
    const lon = parseFloat(params.get('lon'));
    if (Number.isFinite(lon)) input.lon = lon;
  }
  if (params.get('place')) input.place = params.get('place');
  return input;
}

function syncForm(input) {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el && value != null && value !== '') el.value = value;
  };
  set('inp-date', input.date);
  set('inp-time', input.time);
  if (input.timeZone) {
    const tz = document.getElementById('inp-tz');
    if (tz) {
      if (![...tz.options].some((o) => o.value === input.timeZone)) {
        const opt = document.createElement('option');
        opt.value = input.timeZone;
        opt.textContent = input.timeZone;
        tz.appendChild(opt);
      }
      tz.value = input.timeZone;
    }
  }
  if (Number.isFinite(+input.lat)) set('inp-lat', Number(input.lat).toFixed(4));
  if (Number.isFinite(+input.lon)) set('inp-lon', Number(input.lon).toFixed(4));
  const placeEl = document.getElementById('place-input');
  if (placeEl && input.place) {
    placeEl.value = (input.place === '北京' || input.place === '北京市') ? '北京市' : input.place;
  }
  if (window.StarchartUI && window.StarchartUI.setPlace && input.place) {
    window.StarchartUI.setPlace(input.place);
  }
}

function chartFromForm(input = DEFAULT_INPUT) {
  return computeFromInputs(input);
}

async function loadChart() {
  const input = parseInputFromUrl();
  syncForm(input);
  return chartFromForm(input);
}

function fillPanel(chart) {
  const fmt = (iso) => {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    // display in the chart's given local clock, not the browser zone
    const raw = chart.datetime_local;
    const [date, time] = raw.split('T');
    const [y, m, day] = date.split('-');
    const t = (time || '').replace(/\+.*$/, '').replace(/Z$/, '').slice(0, 8);
    return `${y}年${Number(m)}月${Number(day)}日  ${t}`;
  };
  const body = document.getElementById('panel-body');
  const rows = [
    ['月日', `<em>${chart.tithi.number}</em>　${chart.tithi.paksha} ${chart.tithi.name}`],
    ['月宿', `<em>${chart.nakshatra.name}</em>　第 ${chart.nakshatra.pada} 足`],
    ['瑜伽', chart.yoga.name],
    ['羯兰那', chart.karana.name],
    ['曜日', `${chart.vara.name}　${chart.vara.name_zh}`],
    ['沙迦年', `${chart.era.saka}　·　Vikram ${chart.era.vikram}`],
    ['岁差', `Lahiri　${chart.ayanamsa.dms}`],
  ];
  const summary = document.getElementById('panel-summary');
  if (summary) {
    summary.textContent = `${chart.tithi.paksha} ${chart.tithi.name} · ${chart.nakshatra.name} · ${chart.vara.name_zh}`;
  }
  body.innerHTML = rows.map(([l, v]) =>
    `<div class="row"><div class="lbl">${l}</div><div class="val">${v}</div></div>`
  ).join('') + `<div class="meta">
      太阳　${chart.sun.dms}　${chart.sun.rasi.name}<br/>
      太阴　${chart.moon.dms}　${chart.moon.nakshatra.name}<br/>
      ${chart.place}　${chart.latitude.toFixed(2)}°N　${chart.longitude.toFixed(2)}°E
    </div>`;
  const timeNote = chart.time_note || '';
  const varaNote = (chart.vara && chart.vara.note) || '';
  document.getElementById('mast-sub').innerHTML =
    `${fmt(chart.datetime_local)}  ·  ${chart.place}` +
    (timeNote ? `<br/><span class="time-note">${timeNote}</span>` : '');
  const meta = document.querySelector('#panel-body .meta');
  if (meta && varaNote) {
    meta.innerHTML += `<br/><span class="time-note">${varaNote}</span>`;
  }
}

function makeGrid(eps, color, opacity = 0.28) {
  const group = new THREE.Group();
  const majorPos = [], minorPos = [];
  for (let ra = 0; ra < 360; ra += 15) {
    const pts = [];
    for (let dec = -90; dec <= 90; dec += 2) pts.push(eqDir(ra, dec, SKY_R * 0.992));
    const dest = (ra % 30 === 0) ? majorPos : minorPos;
    for (let i = 0; i < pts.length - 1; i++) dest.push(pts[i], pts[i + 1]);
  }
  for (let dec = -75; dec <= 75; dec += 15) {
    if (dec === 0) continue;
    const pts = [];
    for (let ra = 0; ra <= 360; ra += 2) pts.push(eqDir(ra, dec, SKY_R * 0.992));
    const dest = (dec % 30 === 0) ? majorPos : minorPos;
    for (let i = 0; i < pts.length - 1; i++) dest.push(pts[i], pts[i + 1]);
  }
  const mk = (pts, op, order) => {
    const lines = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false }),
    );
    lines.renderOrder = order;
    return lines;
  };
  group.add(mk(majorPos, opacity, 1));
  group.add(mk(minorPos, opacity * 0.42, 1));
  // degree labels along the celestial equator and a reference meridian
  for (let ra = 0; ra < 360; ra += 15) {
    const spr = makeLabel(`${ra}°`, { color: '#7dff9a', fontSize: 16, worldH: 1.05, stroke: 'rgba(0,0,0,0.7)' });
    spr.position.copy(eqDir(ra, 1.8, SKY_R * 1.012));
    group.add(spr);
  }
  for (let dec of [-75, -60, -45, -30, -15, 15, 30, 45, 60, 75]) {
    const spr = makeLabel(`${dec}°`, { color: '#7dff9a', fontSize: 16, worldH: 1.0, stroke: 'rgba(0,0,0,0.7)' });
    spr.position.copy(eqDir(2, dec, SKY_R * 1.012));
    group.add(spr);
  }
  return group;
}

function hash32(n) {
  n |= 0; n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function makeFlameTexture() {
  const w = 2048, h = 160;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.clearRect(0, 0, w, h);
  const mid = h / 2;
  // soft under-glow band
  const base = g.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, 'rgba(255,210,110,0)');
  base.addColorStop(0.32, 'rgba(255,220,140,0.16)');
  base.addColorStop(0.5, 'rgba(255,242,200,0.32)');
  base.addColorStop(0.68, 'rgba(255,210,120,0.16)');
  base.addColorStop(1, 'rgba(255,180,70,0)');
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  // noisy filaments
  for (let k = 0; k < 28; k++) {
    const amp = 6 + hash32(k * 13 + 2) * 22;
    const phase = hash32(k * 17 + 5) * Math.PI * 2;
    const freq = 2.5 + hash32(k * 19 + 7) * 9;
    const y0 = mid + (hash32(k * 23 + 11) - 0.5) * 28;
    const thick = 0.8 + hash32(k * 29 + 3) * 4.2;
    const hot = hash32(k * 31 + 1);
    const col = hot > 0.78
      ? [255, 252, 230]
      : hot > 0.45
        ? [255, 226, 150]
        : [255, 200, 100];
    const alpha = 0.18 + hash32(k * 37) * 0.55;
    g.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const n = Math.sin(x / w * freq * Math.PI * 2 + phase)
        + 0.45 * Math.sin(x / w * freq * 2.3 * Math.PI * 2 + phase * 1.7)
        + 0.25 * Math.sin(x / w * freq * 5.1 * Math.PI * 2 + phase * 0.6);
      const y = y0 + n * amp;
      if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha})`;
    g.lineWidth = thick;
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.stroke();
  }
  // bright knots / flare cores
  for (let i = 0; i < 52; i++) {
    const x = hash32(i * 91 + 4) * w;
    const y = mid + (hash32(i * 53 + 8) - 0.5) * 26;
    const r = 5 + hash32(i * 71 + 9) * 22;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    const hot = hash32(i * 41 + 6);
    if (hot > 0.7) {
      grd.addColorStop(0, 'rgba(255,255,245,0.96)');
      grd.addColorStop(0.28, 'rgba(255,230,160,0.8)');
      grd.addColorStop(0.65, 'rgba(255,200,100,0.3)');
    } else {
      grd.addColorStop(0, 'rgba(255,240,190,0.75)');
      grd.addColorStop(0.4, 'rgba(255,210,120,0.45)');
      grd.addColorStop(0.7, 'rgba(255,180,80,0.16)');
    }
    grd.addColorStop(1, 'rgba(255,170,70,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function makeEclipticFlame(eps) {
  const group = new THREE.Group();
  const tex = makeFlameTexture();
  const uniforms = {
    uTex: { value: tex },
    uTime: { value: 0 },
    uGain: { value: 1.35 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uTex;
      uniform float uTime;
      uniform float uGain;
      varying vec2 vUv;
      void main() {
        vec2 uv = vec2(fract(vUv.x + uTime * 0.018), vUv.y);
        vec4 c = texture2D(uTex, uv);
        float edge = smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
        vec3 col = c.rgb * uGain;
        float a = c.a * edge;
        if (a < 0.02) discard;
        gl_FragColor = vec4(col, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  // layered tubes for depth and irregular width
  const layers = [
    [1.05, 1.05, 1.0],
    [1.75, 0.72, 1.15],
    [2.7, 0.40, 1.3],
    [4.1, 0.20, 1.5],
  ];
  for (const [tube, gain, scaleT] of layers) {
    const m = mat.clone();
    m.uniforms = {
      uTex: { value: tex },
      uTime: uniforms.uTime,
      uGain: { value: gain * 1.05 },
    };
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(SKY_R, tube, 32, 512), m);
    mesh.rotation.x = Math.PI / 2;
    mesh.renderOrder = 4;
    group.add(mesh);
  }
  // ember particles along the trail
  const N = 700;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const sizes = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const lon = hash32(i * 3 + 1) * 360;
    const lat = (hash32(i * 5 + 2) - 0.5) * 1.6;
    const p = eclToEq(lon, lat, SKY_R + (hash32(i * 7 + 3) - 0.5) * 1.4, eps);
    pos.set([p.x, p.y, p.z], i * 3);
    const hot = hash32(i * 11 + 4);
    if (hot > 0.8) { col.set([1.0, 0.97, 0.86], i * 3); sizes[i] = 1.6 + hot; }
    else if (hot > 0.45) { col.set([1.0, 0.86, 0.52], i * 3); sizes[i] = 1.1 + hot; }
    else { col.set([1.0, 0.72, 0.32], i * 3); sizes[i] = 0.7 + hot * 0.6; }
  }
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pgeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  pgeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  const pmat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: makeStarSprite() }, uTime: uniforms.uTime },
    vertexShader: `
      attribute float size;
      varying vec3 vCol;
      uniform float uTime;
      void main() {
        vCol = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float tw = 0.75 + 0.35 * sin(uTime * 3.0 + position.x * 8.0);
        gl_PointSize = size * tw * (260.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform sampler2D uTex;
      varying vec3 vCol;
      void main() {
        vec4 t = texture2D(uTex, gl_PointCoord);
        if (t.a < 0.04) discard;
        gl_FragColor = vec4(vCol * t.rgb, t.a);
      }
    `,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(pgeo, pmat);
  pts.renderOrder = 5;
  group.add(pts);
  group.rotation.x = -eps;
  group.userData.uTime = uniforms.uTime;
  return group;
}

function makeLimbFlame() {
  const group = new THREE.Group();
  const tex = makeFlameTexture();
  tex.repeat.set(2, 1);
  const uTime = { value: 0 };
  const layers = [
    [0.048, 1.20],
    [0.082, 0.80],
    [0.120, 0.42],
    [0.165, 0.20],
  ];
  const mats = [];
  for (const [tube, gain] of layers) {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: tex }, uTime, uGain: { value: gain * 1.35 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTex;
        uniform float uTime;
        uniform float uGain;
        varying vec2 vUv;
        void main() {
          vec2 uv = vec2(fract(vUv.x * 2.0 + uTime * 0.022), vUv.y);
          vec4 c = texture2D(uTex, uv);
          float edge = smoothstep(0.0, 0.16, vUv.y) * smoothstep(1.0, 0.84, vUv.y);
          vec3 gold = vec3(1.0, 0.90, 0.58);
          vec3 col = mix(c.rgb, gold, 0.22) * uGain;
          float a = c.a * edge;
          if (a < 0.02) discard;
          gl_FragColor = vec4(col, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    mats.push(mat);
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(1, tube, 40, 384), mat);
    mesh.renderOrder = 7;
    group.add(mesh);
  }
  const N = 1100;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const sizes = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2 + (hash32(i * 9 + 2) - 0.5) * 0.04;
    const rr = 1 + (hash32(i * 13 + 4) - 0.5) * 0.10;
    // keep embers in the limb plane so they don't project onto the disk
    const z = (hash32(i * 17 + 6) - 0.5) * 0.012;
    // torus lies in XY, axis is +Z (aligned to the camera vector)
    pos.set([rr * Math.cos(th), rr * Math.sin(th), z], i * 3);
    const hot = hash32(i * 19 + 8);
    if (hot > 0.82) { col.set([1.0, 0.97, 0.86], i * 3); sizes[i] = 1.15 + hot * 0.4; }
    else if (hot > 0.4) { col.set([1.0, 0.88, 0.55], i * 3); sizes[i] = 0.85 + hot * 0.3; }
    else { col.set([1.0, 0.75, 0.36], i * 3); sizes[i] = 0.6 + hot * 0.25; }
  }
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pgeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  pgeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  const pmat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: makeStarSprite() }, uTime },
    vertexShader: `
      attribute float size;
      varying vec3 vCol;
      uniform float uTime;
      void main() {
        vCol = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float tw = 0.75 + 0.4 * sin(uTime * 3.2 + position.x * 10.0);
        gl_PointSize = size * tw * (220.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform sampler2D uTex;
      varying vec3 vCol;
      void main() {
        vec4 t = texture2D(uTex, gl_PointCoord);
        if (t.a < 0.04) discard;
        gl_FragColor = vec4(vCol * t.rgb, t.a);
      }
    `,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(pgeo, pmat);
  pts.renderOrder = 8;
  group.add(pts);
  group.visible = false;
  group.userData.uTime = uTime;
  group.userData.occluderR = 40.55;
  return group;
}

function updateLimbFlame(group, camPos) {
  if (!group || !group.visible) return;
  const R = group.userData.occluderR || 40.55;
  const d = camPos.length();
  if (d <= R + 0.4) return;
  const cLen = (R * R) / d;
  const rad = Math.sqrt(Math.max(1e-4, R * R - cLen * cLen));
  group.position.copy(camPos).setLength(cLen);
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), camPos.clone().normalize());
  // keep world tube roughly constant as radius changes
  const s = rad;
  group.scale.set(s, s, s);
}

function addOccluder(scene) {
  const R = 40;
  const mat = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = cameraPosition - w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec3 n = normalize(vN);
        vec3 v = normalize(vV);
        float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.4);
        vec3 gold = vec3(1.0, 0.88, 0.52);
        vec3 warm = vec3(0.78, 0.48, 0.12);
        vec3 base = vec3(0.010, 0.012, 0.018);
        vec3 rim = mix(warm, gold, smoothstep(0.18, 1.0, fres));
        vec3 col = mix(base, rim, smoothstep(0.04, 0.92, fres));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    depthWrite: true,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), mat);
  mesh.renderOrder = 0;
  mesh.visible = false;
  scene.add(mesh);
  // faint outer gold halo just outside the limb
  const haloVert = `
        varying vec3 vN; varying vec3 vV;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vN = normalize(mat3(modelMatrix) * normal);
          vV = cameraPosition - w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }
      `;
  function makeHalo(scale, power, alpha, color) {
    const h = new THREE.Mesh(
      new THREE.SphereGeometry(R * scale, 96, 64),
      new THREE.ShaderMaterial({
        vertexShader: haloVert,
        fragmentShader: `
          varying vec3 vN; varying vec3 vV;
          void main() {
            float fres = pow(1.0 - clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0), ${power.toFixed(2)});
            float a = smoothstep(0.05, 0.96, fres) * ${alpha.toFixed(2)};
            if (a < 0.02) discard;
            gl_FragColor = vec4(${color}, a);
          }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending,
      }),
    );
    h.visible = false;
    h.renderOrder = 6;
    scene.add(h);
    return h;
  }
  const halo = makeHalo(1.018, 3.6, 0.95, '1.0, 0.88, 0.50');
  const halo2 = makeHalo(1.055, 5.2, 0.42, '1.0, 0.78, 0.38');
  return { mesh, halo, halo2, radius: R };
}

function makeRing({ radius, tube, color, opacity = 1, eps = 0, ecliptic = false }) {
  const group = new THREE.Group();
  const geo = new THREE.TorusGeometry(radius, tube, 24, 512);
  const mat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = Math.PI / 2;
  group.add(mesh);
  const sheaths = [
    [tube * 2.2, opacity * 0.28],
    [tube * 4.0, opacity * 0.14],
    [tube * 7.5, opacity * 0.07],
  ];
  for (const [rad, op] of sheaths) {
    const sheath = new THREE.Mesh(
      new THREE.TorusGeometry(radius, rad, 16, 256),
      new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: op, depthWrite: false,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      }),
    );
    sheath.rotation.x = Math.PI / 2;
    group.add(sheath);
  }
  if (ecliptic) group.rotation.x = -eps;
  return group;
}

function addEclipticFurniture(scene, chart, eps) {
  const ayan = chart.ayanamsa.value;
  const ticks = new THREE.Group();
  const labels = new THREE.Group();

  function tick(lon, len, widthColor, thick) {
    const p0 = eclToEq(lon, 0, SKY_R - len, eps);
    const p1 = eclToEq(lon, 0, SKY_R + len, eps);
    const geo = new THREE.BufferGeometry().setFromPoints([p0, p1]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: widthColor, transparent: true, opacity: 0.85, depthWrite: false,
    }));
    ticks.add(line);
  }

  for (let i = 0; i < 36; i++) {
    const lon = i * 10;
    tick(lon, i % 3 === 0 ? 1.15 : 0.55, 0x49d36a, 1);
  }
  for (let i = 0; i < 12; i++) {
    const lon = ayan + i * 30;
    tick(lon, 1.8, 0xf6d78b, 1);
    const pos = eclToEq(lon + 15, 0, SKY_R + 3.4, eps);
    const spr = makeLabel(RASIS[i], { color: '#f3deaa', fontSize: 26, worldH: 2.05 });
    spr.position.copy(pos);
    labels.add(spr);
  }
  for (let i = 0; i < 27; i++) {
    const lon = ayan + i * (360 / 27);
    tick(lon, 0.85, 0xc9a56a, 1);
    const pos = eclToEq(lon + 360 / 54, 0, SKY_R - 3.2, eps);
    const spr = makeLabel(NAKS[i], { color: '#d7c39a', fontSize: 18, worldH: 1.25 });
    spr.position.copy(pos);
    labels.add(spr);
  }
  const group = new THREE.Group();
  group.name = 'eclipticFurniture';
  group.add(ticks, labels);
  scene.add(group);
  return group;
}

function addConstellations(scene, sky) {
  const segs = sky.constellations_zh.segments;
  const positions = new Float32Array(segs.length * 6);
  for (let i = 0; i < segs.length; i++) {
    const [ra1, dec1, ra2, dec2] = segs[i];
    const a = eqDir(ra1, dec1, SKY_R * 0.986);
    const b = eqDir(ra2, dec2, SKY_R * 0.986);
    positions.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6);
  }
  const geo = new LineSegmentsGeometry();
  geo.setPositions(positions);
  const mat = new LineMaterial({
    color: 0x6aa8ff,
    linewidth: 1.15,
    transparent: true,
    opacity: 0.82,
    depthTest: true,
    dashed: false,
  });
  mat.resolution.set(innerWidth, innerHeight);
  const lines = new LineSegments2(geo, mat);
  lines.renderOrder = 2;
  scene.add(lines);

  const labelGroup = new THREE.Group();
  for (const lb of sky.constellations_zh.labels) {
    const major = lb.kind === 'xiu' || lb.kind === 'yuan';
    const pos = eqDir(lb.center[0], lb.center[1], SKY_R * 0.99);
    const spr = makeLabel(lb.name, {
      color: major ? '#cfe4ff' : '#9eb6da',
      fontSize: major ? 24 : 17,
      worldH: major ? 1.7 : 1.15,
    });
    spr.position.copy(pos);
    labelGroup.add(spr);
  }
  scene.add(labelGroup);
  return { lines, mat, labelGroup };
}

function addStars(scene, sky) {
  const stars = sky.stars;
  const n = stars.length;
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const sizes = new Float32Array(n);
  const col = new THREE.Color();
  let i = 0;
  for (const s of stars) {
    const [, ra, dec, mag, bv] = s;
    const p = eqDir(ra, dec, SKY_R * 0.988);
    positions.set([p.x, p.y, p.z], i * 3);
    col.setHex(bvToColor(bv));
    // slightly lift faint-star color saturation
    colors.set([col.r, col.g, col.b], i * 3);
    const rel = Math.max(0, 6.8 - mag);
    sizes[i] = 0.28 + Math.pow(rel, 1.35) * 0.55;
    if (mag < 1.2) sizes[i] *= 1.55;
    if (mag > 5.8) sizes[i] *= 0.85;
    i++;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: makeStarSprite() } },
    vertexShader: `
      attribute float size;
      varying vec3 vCol;
      void main() {
        vCol = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Size = size * (280.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `.replace('gl_Size', 'gl_PointSize'),
    fragmentShader: `
      uniform sampler2D uTex;
      varying vec3 vCol;
      void main() {
        vec4 t = texture2D(uTex, gl_PointCoord);
        if (t.a < 0.02) discard;
        gl_FragColor = vec4(vCol * t.rgb, t.a);
      }
    `,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.renderOrder = 3;
  scene.add(pts);
  return pts;
}

function addStarNames(scene, names) {
  const group = new THREE.Group();
  for (const s of names) {
    if (s.mag > 3.0) continue;
    const pos = eqDir(norm360(s.ra), s.dec, SKY_R * 0.993);
    const bright = s.mag <= 1.5;
    const spr = makeLabel(s.name, {
      color: bright ? '#f4f7ff' : '#d5deef',
      fontSize: bright ? 20 : 16,
      worldH: bright ? 1.35 : 1.05,
    });
    spr.position.copy(pos);
    group.add(spr);
  }
  scene.add(group);
  return group;
}

function loadTexture(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      resolve(tex);
    };
    img.onerror = (e) => reject(new Error('texture failed: ' + url));
    img.src = url;
  });
}

async function addMilkyWay(scene) {
  const group = new THREE.Group();
  scene.add(group);
  try {
    const candidates = preferMobileTexture()
      ? ['assets/stellarium_eq_mobile.jpg', 'assets/stellarium_eq.jpg', 'assets/starmap_eq.jpg']
      : ['assets/stellarium_eq.jpg', 'assets/stellarium_eq_mobile.jpg', 'assets/starmap_eq.jpg'];
    let tex = null;
    for (const url of candidates) {
      try {
        tex = await loadTexture(url);
        window.MW_SRC = url;
        break;
      } catch {}
    }
    if (!tex) throw new Error('milky way texture missing');
    window.MW_LOADED = true;
    const segsW = preferMobileTexture() ? 48 : 96;
    const segsH = preferMobileTexture() ? 32 : 64;
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(SKY_R, segsW, segsH), mat);
    mesh.rotation.y = Math.PI;
    mesh.scale.z = -1;
    group.add(mesh);
    const glowMat = new THREE.MeshBasicMaterial({
      map: tex,
      color: 0x88aadd,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(SKY_R * 1.002, segsW, segsH), glowMat);
    glow.rotation.y = Math.PI;
    glow.scale.z = -1;
    group.add(glow);
    return mesh;
  } catch (e) {
    window.MW_ERROR = String(e);
    console.error(e);
    return group;
  }
}

function addEarth(scene) {
  const g = new THREE.Group();
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(0.48, 48, 32),
    new THREE.MeshStandardMaterial({
      color: 0x0b1220, roughness: 0.9, metalness: 0.1, emissive: 0x0a1a33, emissiveIntensity: 0.35,
    }),
  );
  g.add(earth);
  const atm = new THREE.Mesh(
    new THREE.SphereGeometry(0.58, 32, 24),
    new THREE.MeshBasicMaterial({
      color: 0x7ec8ff, transparent: true, opacity: 0.13, side: THREE.BackSide, depthWrite: false,
    }),
  );
  g.add(atm);
  scene.add(g);
  return g;
}

function addPlanets(scene, chart, eps) {
  const group = new THREE.Group();
  const orrery = new THREE.Group();
  const labels = new THREE.Group();
  const orbitMats = [];
  group.add(orrery);
  orrery.name = 'orrery';

  function orbitRing(dist, color) {
    if (dist < 0.15) return;
    const geo = new THREE.TorusGeometry(dist, 0.025, 8, 256);
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.72, depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2;
    const wrap = new THREE.Group();
    wrap.add(mesh);
    wrap.rotation.x = -eps;
    // faint sheath
    const sh = new THREE.Mesh(
      new THREE.TorusGeometry(dist, 0.07, 8, 128),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, depthWrite: false }),
    );
    sh.rotation.x = Math.PI / 2;
    wrap.add(sh);
    orrery.add(wrap);
  }

  for (const b of chart.bodies) {
    const st = PLANET_STYLE[b.id];
    if (!st) continue;
    if (['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'].includes(b.id)
        && b.helio_dist != null) {
      orbitRing(orbitScale(Math.max(b.helio_dist, 0.01)), 0xf0c36a);
    }
  }

  for (const b of chart.bodies) {
    const st = PLANET_STYLE[b.id];
    if (!st) continue;

    // heliocentric orrery body (skip nodes)
    if (b.helio_lon != null && b.helio_dist != null && b.id !== 'moon') {
      const r = orbitScale(b.helio_dist);
      const pos = eclToEq(b.helio_lon, b.helio_lat || 0, Math.max(r, 0.01), eps);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(st.size, 32, 24),
        new THREE.MeshBasicMaterial({ color: st.color }),
      );
      mesh.position.copy(pos);
      orrery.add(mesh);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeStarSprite(), color: st.glow, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      halo.scale.setScalar(st.size * (b.id === 'sun' ? 14 : 7));
      halo.position.copy(pos);
      orrery.add(halo);
      const lab = makeLabel(b.name_zh, { color: '#ffe9b0', fontSize: 22, worldH: 0.85 });
      lab.position.copy(pos).add(new THREE.Vector3(st.size + 0.15, st.size + 0.05, 0));
      lab.userData.follow = mesh;
      lab.userData.orrery = true;
      labels.add(lab);
    }

    if (b.id === 'moon' && b.helio_lon != null) {
      // place near the Earth
      const earth = chart.bodies.find((x) => x.id === 'earth');
      const er = orbitScale(earth.helio_dist);
      const epos = eclToEq(earth.helio_lon, earth.helio_lat || 0, er, eps);
      const dir = eclToEq(b.geo_lon, b.geo_lat, 1, eps).normalize();
      const pos = epos.clone().add(dir.multiplyScalar(0.7));
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(st.size, 24, 16),
        new THREE.MeshBasicMaterial({ color: st.color }),
      );
      mesh.position.copy(pos);
      orrery.add(mesh);
      const lab = makeLabel(b.name_zh, { color: '#e8eef6', fontSize: 20, worldH: 0.7 });
      lab.position.copy(pos).add(new THREE.Vector3(0.25, 0.2, 0));
      lab.userData.orrery = true;
      labels.add(lab);
    }

    // geocentric bead on / just inside the celestial sphere (true sky direction)
    if (b.geo_lon != null && b.id !== 'earth') {
      const pos = eclToEq(b.geo_lon, b.geo_lat || 0, SKY_R * 0.975, eps);
      const bead = new THREE.Mesh(
        new THREE.SphereGeometry(b.id === 'sun' ? 0.85 : 0.42, 24, 16),
        new THREE.MeshBasicMaterial({ color: st.color }),
      );
      bead.position.copy(pos);
      group.add(bead);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeStarSprite(), color: st.glow, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      halo.scale.setScalar(b.id === 'sun' ? 8 : 3.2);
      halo.position.copy(pos);
      group.add(halo);
      const lab = makeLabel(b.name_zh, { color: '#ffe7b4', fontSize: 22, worldH: 1.7 });
      lab.position.copy(pos);
      labels.add(lab);
    }
  }
  scene.add(group, labels);
  return { group, labels, orrery };
}

async function main() {
  const [chart, sky, starnames] = await Promise.all([
    loadChart(),
    loadJSON('data/sky.json'),
    loadJSON('data/starnames.json').catch(() => []),
  ]);
  fillPanel(chart);
  const eps = deg(chart.obliquity);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.FogExp2(0x000000, 0.0008);

  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.05, 800);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1.0;
  document.getElementById('stage').appendChild(renderer.domElement);
  renderer.domElement.style.touchAction = 'none';

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.rotateSpeed = 0.45;
  controls.minDistance = 1.2;
  controls.maxDistance = 360;
  controls.autoRotateSpeed = 0.35;

  function applyRotateState(on, persist = true) {
    controls.autoRotate = !!on;
    if (persist) {
      try { localStorage.setItem('starchart-auto-rotate', on ? '1' : '0'); } catch {}
    }
    const btn = document.getElementById('btn-rotate');
    if (btn) {
      btn.classList.toggle('on', !!on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.textContent = on ? '自动旋转 · 开' : '自动旋转 · 关';
    }
  }
  applyRotateState(readRotatePref(), false);
  const rotateBtn = document.getElementById('btn-rotate');
  if (rotateBtn) {
    rotateBtn.addEventListener('click', () => applyRotateState(!controls.autoRotate, true));
  }

  const initial = params.get('view') || 'sphere';
  applyView(initial, camera, controls, false);

  const forceNoBloom = params.get('bloom') === '0' || (params.get('bloom') !== '1' && isMobileView());
  const gl = renderer.getContext();
  const dbg = gl.getParameter(gl.RENDERER) || '';
  console.log('WebGL renderer:', dbg, 'maxTex', renderer.capabilities.maxTextureSize);
  let composer = null;
  if (!forceNoBloom) {
    try {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.55, 0.18);
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
    } catch (e) {
      console.warn('bloom init failed, falling back', e);
      composer = null;
    }
  }

  scene.add(new THREE.AmbientLight(0x334055, 0.7));

  await addMilkyWay(scene);
  addStars(scene, sky);
  const cst = addConstellations(scene, sky);
  addStarNames(scene, starnames);
  scene.add(makeGrid(eps, 0x49d36a, 0.22));
  // celestial equator — cool silver
  scene.add(makeRing({ radius: SKY_R, tube: 0.11, color: 0x8aa8b8, opacity: 0.42, eps, ecliptic: false }));
  const flame = makeEclipticFlame(eps);
  scene.add(flame);
  let furniture = addEclipticFurniture(scene, chart, eps);
  const earth = addEarth(scene);
  let planets = addPlanets(scene, chart, eps);
  const occluder = addOccluder(scene);
  const limbFlame = makeLimbFlame();
  scene.add(limbFlame);
  window._viewCtl = { earth, occluder, orrery: planets.orrery, planets, limbFlame };
  setViewMode(initial);
  if (params.get('anim') === 'fly') {
    const delay = parseFloat(params.get('delay') || '0') * 1000;
    const start = () => startFlyaround(camera, controls);
    if (delay > 0) setTimeout(start, delay); else start();
  }

  // faint equatorial poles
  for (const dec of [90, -90]) {
    const p = eqDir(0, dec, SKY_R);
    const spr = makeLabel(dec > 0 ? '北天极' : '南天极', { color: '#9fd0c8', fontSize: 20, worldH: 1.5 });
    spr.position.copy(p);
    scene.add(spr);
  }

  document.querySelectorAll('#views button').forEach((btn) => {
    btn.classList.toggle('on', btn.dataset.view === initial);
    btn.addEventListener('click', () => {
      document.querySelectorAll('#views button').forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      applyView(btn.dataset.view, camera, controls, true);
      currentView = btn.dataset.view;
    });
  });

  let currentView = initial;
  let currentChart = chart;

  function applyNewChart(next) {
    currentChart = next;
    fillPanel(next);
    const nextEps = deg(next.obliquity);
    if (furniture) scene.remove(furniture);
    if (planets) {
      scene.remove(planets.group);
      scene.remove(planets.labels);
    }
    furniture = addEclipticFurniture(scene, next, nextEps);
    planets = addPlanets(scene, next, nextEps);
    window._viewCtl.orrery = planets.orrery;
    window._viewCtl.planets = planets;
    setViewMode(currentView);
  }

  window.Starchart = {
    getChart: () => currentChart,
    applyInput: (input) => {
      const next = chartFromForm(input);
      applyNewChart(next);
      return next;
    },
    setView: (name) => {
      const btn = document.querySelector(`#views button[data-view="${name}"]`);
      if (btn) btn.click();
      else { applyView(name, camera, controls, true); currentView = name; }
    },
    getView: () => currentView,
    renderer,
    camera,
    DEFAULT_INPUT,
    setAutoRotate: (on) => applyRotateState(on, true),
    getAutoRotate: () => controls.autoRotate,
  };

  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    if (composer) composer.setSize(innerWidth, innerHeight);
    cst.mat.resolution.set(innerWidth, innerHeight);
  });

  let readyFrames = 0;
  function tick() {
    requestAnimationFrame(tick);
    controls.update();
    const cam = camera.position;
    const nowS = performance.now() / 1000;
    if (flame.userData.uTime) flame.userData.uTime.value = nowS;
    if (window._fly) stepFlyaround(camera, controls, nowS);
    if (window._viewCtl && window._viewCtl.limbFlame) {
      if (window._viewCtl.limbFlame.userData.uTime)
        window._viewCtl.limbFlame.userData.uTime.value = nowS;
      updateLimbFlame(window._viewCtl.limbFlame, cam);
    }
    const occOn = !!(window._viewCtl && window._viewCtl.occluder.mesh.visible);
    const occR = occOn ? window._viewCtl.occluder.radius : 0;
    scene.traverse((obj) => {
      if (obj.userData && obj.userData.kind === 'label') {
        if (obj.userData.orrery && occOn) { obj.visible = false; return; }
        if (cam.dot(obj.position) <= 0) { obj.visible = false; return; }
        if (occOn) {
          const d = obj.position.clone().sub(cam);
          const a = d.dot(d);
          const b = 2 * cam.dot(d);
          const c0 = cam.dot(cam) - occR * occR;
          const disc = b * b - 4 * a * c0;
          if (disc >= 0) {
            const tHit = (-b - Math.sqrt(disc)) / (2 * a);
            if (tHit >= 0 && tHit <= 1) { obj.visible = false; return; }
          }
        }
        obj.visible = true;
      }
    });
    if (composer) {
      try { composer.render(); }
      catch (e) { console.warn('bloom render failed', e); composer = null; renderer.render(scene, camera); }
    } else {
      renderer.render(scene, camera);
    }
    readyFrames++;
    if (readyFrames === 8) {
      document.getElementById('loader').classList.add('hide');
      window.CHART_READY = true;
      document.documentElement.dataset.ready = '1';
    }
  }
  tick();
}

function startFlyaround(camera, controls) {
  controls.autoRotate = false;
  const target = VIEW_PRESETS.sphere.target.clone();
  const p0 = VIEW_PRESETS.sphere.pos.clone();
  const rel = p0.clone().sub(target);
  window._fly = {
    t0: performance.now() / 1000,
    dur: 18,
    target,
    r0: rel.length(),
    startAng: Math.atan2(rel.x, rel.z),
    startY: p0.y,
    fov0: VIEW_PRESETS.sphere.fov,
  };
}

function stepFlyaround(camera, controls, nowS) {
  const f = window._fly;
  if (!f) return;
  const u = Math.min(1, (nowS - f.t0) / f.dur);
  const e = u * u * (3 - 2 * u);
  const ang = f.startAng + e * 1.05;
  const r = f.r0 * (1.16 - 0.26 * e);
  const y = f.startY + Math.sin(e * Math.PI) * 10;
  camera.position.set(
    f.target.x + r * Math.sin(ang),
    y,
    f.target.z + r * Math.cos(ang),
  );
  controls.target.copy(f.target);
  camera.fov = f.fov0 - e * 4;
  camera.updateProjectionMatrix();
}

function setViewMode(name) {
  const ctl = window._viewCtl;
  if (!ctl) return;
  const close = name === 'close';
  ctl.occluder.mesh.visible = close;
  ctl.occluder.halo.visible = close;
  if (ctl.occluder.halo2) ctl.occluder.halo2.visible = close;
  if (ctl.limbFlame) ctl.limbFlame.visible = close;
  ctl.earth.visible = !close;
  ctl.orrery.visible = !close;
}

function applyView(name, camera, controls, smooth) {
  const p = VIEW_PRESETS[name] || VIEW_PRESETS.sphere;
  setViewMode(name);
  if (!smooth) {
    camera.position.copy(p.pos);
    camera.fov = p.fov;
    camera.updateProjectionMatrix();
    controls.target.copy(p.target);
    return;
  }
  const fromP = camera.position.clone();
  const fromT = controls.target.clone();
  const fromF = camera.fov;
  const t0 = performance.now();
  const dur = 1400;
  (function step(now) {
    const k = Math.min(1, (now - t0) / dur);
    const e = k * k * (3 - 2 * k);
    camera.position.lerpVectors(fromP, p.pos, e);
    controls.target.lerpVectors(fromT, p.target, e);
    camera.fov = fromF + (p.fov - fromF) * e;
    camera.updateProjectionMatrix();
    if (k < 1) requestAnimationFrame(step);
  })(t0);
}

main().catch((err) => {
  console.error(err);
  const el = document.querySelector('.loader-inner');
  if (el) el.textContent = '载入失败：' + err.message;
});
