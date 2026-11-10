// 3D set dressing: building details, street furniture, and interior furniture built from simple solids.
import * as THREE from 'three';

const { mk, shade, textW } = SPR;
const { rng, COLL } = WORLD;
const HS = 1.25;
export const spinners = []; // things that slowly rotate (gems)

const hdr = (c, k) => new THREE.Color(c).multiplyScalar(k);
export const tickers = [];  // per-frame callbacks (scrolling water)

function ptex(c) { const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; return t; }
// Pixel-art surface textures. Every solid gets one, at one texel per world unit (the same size as a sprite pixel),
// so 3D objects carry the same chunky grain as the characters and facades instead of looking like smooth plastic.
const PIX = {};
function pix(kind) {
  if (PIX[kind]) return PIX[kind];
  const c = mk(32, 32), g = c.getContext('2d'), r = rng(kind.length * 31 + kind.charCodeAt(0));
  const dash = (v, n, wMin, wMax, h = 1) => { g.fillStyle = `rgb(${v},${v},${v})`; for (let i = 0; i < n; i++) g.fillRect(r() * 32 | 0, r() * 32 | 0, wMin + (r() * (wMax - wMin + 1) | 0), h); };
  g.fillStyle = '#fff'; g.fillRect(0, 0, 32, 32);
  if (kind === 'wood') { dash(232, 26, 3, 7); g.fillStyle = 'rgb(196,196,196)'; for (let y = 3; y < 32; y += 4) { g.fillRect(0, y, 32, 1); g.fillRect((y * 7) % 32, y - 3, 1, 3); } }
  else if (kind === 'leaf') { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const v = [255, 255, 226, 196, 160][r() * 5 | 0]; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 1, 1); } dash(140, 14, 1, 2); }
  else if (kind === 'stone') { for (let y = 0; y < 32; y += 2) for (let x = 0; x < 32; x += 2) { const v = [255, 242, 226][r() * 3 | 0]; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 2, 2); } dash(180, 9, 2, 4); dash(180, 5, 1, 1, 3); }
  else { dash(234, 46, 2, 4); dash(212, 18, 2, 3); dash(190, 5, 1, 2); }
  const t = ptex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return (PIX[kind] = t);
}
const std = (c, rough = 0.9, metal = 0, kind = 'grain') => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: rough, metalness: metal, map: pix(kind) });
const glow = (c, k = 2) => new THREE.MeshBasicMaterial({ color: hdr(c, k) });
function add(g, geo, mat, x, y, z, shadow = true) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; g.add(m); return m; }
function uvScale(geo, fn) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) { const [su, sv] = fn(i); uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); } return geo; }
const box = (g, w, h, d, mat, x, y, z, shadow) => add(g, uvScale(new THREE.BoxGeometry(w, h, d), i => { const f = i >> 2; return f < 2 ? [d / 32, h / 32] : f < 4 ? [w / 32, d / 32] : [w / 32, h / 32]; }), mat, x, y, z, shadow);
const cyl = (g, r1, r2, h, mat, x, y, z, seg = 8, shadow) => add(g, uvScale(new THREE.CylinderGeometry(r1, r2, h, seg), () => [(r1 + r2) * Math.PI / 32, Math.max(h, r1 + r2) / 32]), mat, x, y, z, shadow);
const LEAF = ['#3f8f68', '#62b47a', '#2c6b5a', '#8fdc93'].map(c => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: 1, flatShading: true, map: pix('leaf'), emissive: new THREE.Color(c).multiplyScalar(0.07) }));
const BLOB = uvScale(new THREE.IcosahedronGeometry(1, 1), () => [3, 1.5]);
function blob(g, x, y, z, r, i, shadow) { const m = add(g, BLOB, LEAF[i % 4], x, y, z, shadow); m.scale.set(r, r * 0.86, r); return m; }
function bush(g, x, y, z, r, seed) {
  const rnd = rng(seed);
  for (let i = 0; i < 3; i++) blob(g, x + (rnd() - 0.5) * r, y + i * r * 0.5, z + (rnd() - 0.5) * r * 0.6, r * (1 - i * 0.18), i);
}
// a faceted tree: bark trunk and four leafy masses
const BARK = std('#6b4a3a', 1, 0, 'wood');
export function tree3d(k, seed) {
  const g = new THREE.Group(), rnd = rng(seed), j = () => (rnd() - 0.5) * 3 * k;
  box(g, 4.6, 15 * k, 4.6, BARK, 0, 7.5 * k, 0);
  blob(g, j(), 19 * k, j(), 10.5 * k, 0); blob(g, -5 * k + j(), 24 * k, 2 + j(), 7.6 * k, 1); blob(g, 5 * k + j(), 25 * k, -2 + j(), 7.2 * k, 2); blob(g, j(), 30.5 * k, j(), 6 * k, 3);
  return g;
}
// wooden sign: the pixel-art board from the 2D art, as a slab on a post
export function signPost(img, k = 1.3) {
  const g = new THREE.Group(), wood = std('#7a5a40', 1, 0, 'wood'), w = img.width, face = new THREE.MeshStandardMaterial({ map: ptex(crop(img, 0, 0, w, 9)), roughness: 1 });
  box(g, 3.2, 15, 3.2, wood, 0, 7.5, 0);
  add(g, new THREE.BoxGeometry(w * k, 9 * k, 2.6), [wood, wood, wood, wood, face, face], 0, 15 + 4.5 * k, 0);
  return g;
}
export function kiosk3d(img, em) {
  const g = new THREE.Group(), shell = std('#3a3550', 0.6, 0.3), w = img.width, h = img.height;
  const face = new THREE.MeshStandardMaterial({ map: ptex(img), emissive: 0xffffff, emissiveMap: ptex(crop(em, 0, 0, w, h, true)), emissiveIntensity: 1.5, roughness: 0.6 });
  box(g, 22, 3, 13, std('#231f33'), 0, 1.5, -5); add(g, new THREE.BoxGeometry(w * 1.35, h * 1.35, 10), [shell, shell, shell, shell, face, shell], 0, 3 + h * 0.675, -5);
  box(g, 20, 1.6, 12, std('#57506e', 0.5, 0.4), 0, 3.8 + h * 1.35, -5);
  return g;
}
export function mailbox3d() {
  const g = new THREE.Group(), red = std('#d6455a', 0.7, 0.1), dk = std('#3a3550', 0.6, 0.4);
  box(g, 2.6, 13, 2.6, dk, 0, 6.5, 0); box(g, 13, 7, 9, red, 0, 16.5, 0);
  const top = cyl(g, 4.5, 4.5, 13, red, 0, 20, 0, 8); top.rotation.z = Math.PI / 2;
  box(g, 7, 1, 0.5, std('#8f2b3d'), 0, 17.5, 4.6, false); box(g, 0.8, 7, 0.8, std('#ffe066'), 7, 20, 0, false); box(g, 0.8, 3, 3.4, std('#ffe066'), 7, 22, 1.4, false);
  return g;
}
function crop(src, x, y, w, h, black) { const c = mk(w, h), g = c.getContext('2d'); if (black) { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); } g.drawImage(src, x, y, w, h, 0, 0, w, h); return c; }

// ---------- buildings ----------
export function dressBuilding(b, { w, d, H, cx, cz }, parent) {
  const g = new THREE.Group(); parent.add(g);
  const z0 = cz + d / 2, x0 = b.x, rnd = rng(b.seed + 9);
  const dark = std(shade(b.wall, 0.58)), trim = std(shade(b.wall, 0.78)), stone = std('#8f8576', 0.95, 0, 'stone');
  const flat = ['accenture', 'synth', 'lvcred'].includes(b.id);

  box(g, w + 3, 4, d + 3, dark, cx, 2, cz);                                           // plinth
  for (const s of [-1, 1]) box(g, 4, H, 4, trim, cx + s * (w / 2 - 1), H / 2, z0 - 0.5); // corner pilasters
  box(g, w + 5, 3, d + 5, dark, cx, H - 1.5, cz);                                      // cornice

  // doorway: steps, posts, lintel, two wall lamps
  const dX = b.doorX;
  box(g, 30, 1, 13, stone, dX, 0.5, z0 + 6.5); box(g, 24, 2.2, 9, stone, dX, 1.1, z0 + 4.5);
  for (const s of [-1, 1]) { box(g, 2.2, 30, 2.6, dark, dX + s * 9, 15, z0 + 1.1); box(g, 1.8, 3.2, 1.8, glow('#ffd9a0', 2.6), dX + s * 13, 26, z0 + 1.6, false); }
  box(g, 23, 2.6, 3.6, dark, dX, 31, z0 + 1.3);

  // shopfront awnings, valances, window ledges and flower boxes
  const dx = (b.w >> 1) - 7, lw = dx - 14;
  if (lw >= 10) {
    const sc = mk(6, 1), sg = sc.getContext('2d'); sg.fillStyle = b.awn; sg.fillRect(0, 0, 3, 1); sg.fillStyle = '#f4f1ff'; sg.fillRect(3, 0, 3, 1);
    const at = ptex(sc); at.wrapS = at.wrapT = THREE.RepeatWrapping; at.repeat.set(32 / 6, 1); // stripes 6 units wide
    const awn = new THREE.MeshStandardMaterial({ map: at, roughness: 0.9 }), val = std(shade(b.awn, 0.7));
    for (const ax of [x0 + 6 + (lw + 4) / 2, x0 + dx + 18 + (lw + 4) / 2]) {
      box(g, lw + 4, 1.2, 12, awn, ax, 34.6, z0 + 5.4).rotation.x = 0.42;
      box(g, lw + 4, 2.6, 0.8, val, ax, 31.4, z0 + 10.7);
      box(g, lw + 2, 1.6, 3.2, dark, ax, 8.2, z0 + 1.6);
      if (rnd() < 0.7) { box(g, lw - 2, 2.6, 3, std('#4a3a34'), ax, 10.3, z0 + 2.2); for (let i = 0; i < 4; i++) add(g, new THREE.IcosahedronGeometry(1.7, 0), std(['#ff9ec4', '#ffe066', '#62b47a', '#e9dcff'][rnd() * 4 | 0]), ax - lw / 2 + 3 + i * (lw - 6) / 3, 12.4, z0 + 2.4, false); }
    }
  }

  // the neon sign as a raised box above the door
  {
    const tw = textW(b.sign), bw = tw + 8, bx = ((b.w - bw) / 2) | 0, by = b.h - 37;
    const face = new THREE.MeshStandardMaterial({ map: ptex(crop(b.img, bx, by, bw, 10)), emissive: 0xffffff, emissiveMap: ptex(crop(b.em, bx, by, bw, 10, true)), emissiveIntensity: 1.7, roughness: 0.6 });
    const frame = std('#15101f', 0.5, 0.4);
    add(g, new THREE.BoxGeometry(bw * 1.2, 15, 3), [frame, frame, frame, frame, face, frame], cx, 41.5, z0 + 2);
    for (const s of [-1, 1]) box(g, 1.2, 5, 1.2, frame, cx + s * bw * 0.45, 51, z0 + 1.2, false);
  }

  // upper windows: sills, lintels, the odd window box
  const n = Math.floor((b.w - 12) / 14), sx0 = ((b.w - (n * 14 - 6)) / 2) | 0;
  for (let y = b.roofH + 7; y + 10 < b.h - 42; y += 16) for (let i = 0; i < n; i++) {
    const wx = x0 + sx0 + i * 14 + 4, wy = (b.h - (y + 10)) * HS;
    box(g, 11.5, 1.4, 2.6, trim, wx, wy - 0.9, z0 + 1.2, false); box(g, 11, 1.1, 1.5, dark, wx, wy + 10 * HS + 1, z0 + 0.7, false);
    if (rnd() < 0.18) { box(g, 9, 2.2, 2.4, std('#4a3a34'), wx, wy + 0.8, z0 + 2.2, false); add(g, new THREE.IcosahedronGeometry(2, 0), std('#62b47a'), wx, wy + 2.6, z0 + 2.3, false); }
  }
  cyl(g, 0.9, 0.9, H, std('#3a3550', 0.5, 0.5), cx - w / 2 - 1.2, H / 2, z0 - 3, 6, false); // drainpipe

  if (flat) { // rooftop plant, glowing edge
    const metal = std('#8a90a8', 0.55, 0.45);
    box(g, 17, 8, 12, metal, cx - w * 0.22, H + 10, cz - 4); box(g, 10, 5, 8, metal, cx + w * 0.2, H + 8.5, cz + d * 0.15);
    box(g, 13, 1, 9, std('#2b2740'), cx - w * 0.22, H + 14.4, cz - 4, false);
    box(g, w + 6, 2.4, 1.6, dark, cx, H + 7.2, z0 + 2.4); box(g, w + 2, 1.2, 1.2, glow(b.neon, 2.2), cx, H + 9, z0 + 2.4, false);
    if (b.id === 'accenture') { cyl(g, 7, 7, 12, std('#6a5a4a'), cx + w * 0.26, H + 14, cz - d * 0.2, 10); add(g, new THREE.ConeGeometry(7.6, 4, 10), std('#4a3a34'), cx + w * 0.26, H + 22, cz - d * 0.2); }
  } else {  // pitched roof: ridge cap, eave board, chimney
    const rh = Math.min(40, d * 0.42);
    box(g, w + 11, 1.8, 2.4, dark, cx, H + rh + 0.5, cz); box(g, w + 10, 2.2, 1.3, dark, cx, H + 0.2, z0 + 5.2);
    const brick = std('#8a5a4a', 1, 0, 'stone');
    box(g, 9, 20, 9, brick, cx + w * 0.27, H + rh * 0.55 + 6, cz - d * 0.14); box(g, 11.5, 2.2, 11.5, std('#5a3a34'), cx + w * 0.27, H + rh * 0.55 + 17, cz - d * 0.14);
  }

  // planters either side of wide shopfronts (solid: you walk around them)
  if (b.w >= 110) for (const s of [-1, 1]) {
    const px = cx + s * (w / 2 - 10);
    box(g, 14, 6, 6.5, std('#4a3a34'), px, 3, z0 + 5.5); bush(g, px, 8.5, z0 + 5.5, 5, b.seed + s);
    COLL.push({ x: px - 7, y: b.base + 1, w: 14, h: 8 });
  }
  return g;
}

// ---------- construction site ----------
export function constructionSite(parent, s) {
  const g = new THREE.Group(); parent.add(g);
  const cx = s.x + s.w / 2, z0 = s.y + 8, z1 = s.y + s.h, fx = cx - 6;
  const steel = std('#c9772e', 0.6, 0.4), conc = std('#9a9aa6', 1, 0, 'stone'), wood = std(WOOD, 0.9, 0, 'wood'), pipe = std('#8a90a8', 0.5, 0.6), yel = std('#ffd23a', 0.7, 0.2), brick = std('#a8644e', 1, 0, 'stone');
  box(g, s.w + 8, 1, s.h + 2, std('#7a5a44', 1, 0, 'stone'), cx, 0.5, s.y + s.h / 2 + 3, false);           // churned dirt
  box(g, 52, 3, 46, conc, fx, 2, z0 + 26);                                                              // foundation
  // steel frame: two storeys of columns and beams, with the top corner still missing
  for (const x of [fx - 23, fx, fx + 23]) for (const z of [z0 + 6, z0 + 46]) box(g, 2.6, x > fx && z > z0 + 6 ? 34 : 64, 2.6, steel, x, x > fx && z > z0 + 6 ? 20 : 35, z);
  for (const y of [34, 65]) { for (const z of [z0 + 6, z0 + 46]) if (!(y > 40 && z > z0 + 6)) box(g, 49, 2.4, 2.4, steel, fx, y, z); for (const x of [fx - 23, fx, fx + 23]) if (!(y > 40 && x > fx - 23)) box(g, 2.4, 2.4, 40, steel, x, y, z0 + 26); }
  box(g, 49, 2.4, 2.4, steel, fx, 34, z0 + 46); box(g, 26, 1.6, 42, conc, fx - 11.5, 36, z0 + 26);       // first-floor slab, half poured
  box(g, 49, 20, 3, brick, fx, 13, z0 + 5); box(g, 26, 9, 3, brick, fx - 11.5, 27.5, z0 + 5);            // back wall going up in steps
  // scaffolding across the front
  for (const x of [fx - 26, fx, fx + 26]) for (const z of [z0 + 51, z0 + 58]) box(g, 1.2, 50, 1.2, pipe, x, 25, z);
  for (const y of [17, 35]) { box(g, 55, 1.2, 8, wood, fx, y, z0 + 54.5); box(g, 54, 1, 1, pipe, fx, y + 8, z0 + 58, false); }
  for (const [x, r] of [[fx - 13, 0.62], [fx + 13, -0.62]]) box(g, 1, 32, 1, pipe, x, 17, z0 + 58, false).rotation.z = r;
  { const l = new THREE.Group(); l.position.set(fx + 20, 0, z0 + 62); l.rotation.x = -0.2; g.add(l); for (const x of [-3, 3]) box(l, 1, 38, 1, wood, x, 19, 0, false); for (let y = 4; y < 38; y += 5) box(l, 6, 0.8, 0.8, wood, 0, y, 0, false); } // ladder
  // tower crane with a swinging load
  const mx = cx + 29, mz = z0 + 12;
  box(g, 9, 3, 9, conc, mx, 1.5, mz); box(g, 4.2, 150, 4.2, yel, mx, 76, mz);
  for (let y = 12; y < 148; y += 14) box(g, 5.4, 1, 5.4, std('#c9a020', 0.7, 0.2), mx, y, mz, false);
  box(g, 96, 3, 3, yel, mx - 30, 150, mz); box(g, 12, 8, 7, conc, mx + 14, 147, mz); box(g, 7, 7, 7, std('#f4f1ff', 0.6), mx, 156, mz);
  box(g, 1, 14, 1, yel, mx, 164, mz, false).rotation.z = 0; box(g, 60, 0.6, 0.6, pipe, mx - 30, 158, mz, false).rotation.z = -0.13;
  const hook = new THREE.Group(); hook.position.set(mx - 52, 150, mz); g.add(hook);
  box(hook, 0.5, 62, 0.5, std('#2b2740'), 0, -31, 0, false); box(hook, 3, 3, 3, std('#2b2740', 0.5, 0.5), 0, -63, 0);
  for (const z of [-2.4, 0, 2.4]) box(hook, 26, 2, 2, steel, 0, -68, z);
  tickers.push(t => { hook.rotation.z = Math.sin(t * 0.8) * 0.045; hook.rotation.x = Math.cos(t * 0.6) * 0.03; });
  // materials lying around
  for (let i = 0; i < 3; i++) box(g, 13, 4, 7, brick, s.x + 12, 2 + i * 4, z1 - 26 - (i % 2));
  for (let i = 0; i < 4; i++) box(g, 9, 3, 6, std('#cfd2dc', 1), s.x + 12 + (i % 2) * 2, 13.5 + (i > 1 ? 3 : 0) + (i % 2) * 0, z1 - 26 + (i > 1 ? 1 : 0), false);
  add(g, uvScale(new THREE.ConeGeometry(9, 8, 7), () => [1.6, 0.5]), std('#d9b888', 1, 0, 'stone'), cx + 22, 4, z1 - 16);
  for (let i = 0; i < 4; i++) box(g, 30, 1.6, 2.2, wood, cx + 4, 1.8 + i * 1.6, z1 - 34 + (i % 2) * 2.4).rotation.y = 0.2 + i * 0.05;
  // striped barrier all the way round, with blinking amber lamps on the front posts
  const sc = mk(8, 2), sg = sc.getContext('2d'); sg.fillStyle = '#ffd23a'; sg.fillRect(0, 0, 8, 2); sg.fillStyle = '#1b1626'; sg.fillRect(0, 0, 4, 1); sg.fillRect(4, 1, 4, 1);
  const st = ptex(sc); st.wrapS = st.wrapT = THREE.RepeatWrapping; st.repeat.set(4, 1.5);
  const tape = new THREE.MeshStandardMaterial({ map: st, roughness: 0.8 }), post = std('#3a3550', 0.6, 0.4), lamps = [];
  const rail = (xa, za, xb, zb) => { const len = Math.hypot(xb - xa, zb - za), m = box(g, len, 3.4, 0.9, tape, (xa + xb) / 2, 10, (za + zb) / 2, false); m.rotation.y = Math.atan2(za - zb, xb - xa); box(g, len, 1.4, 0.7, post, (xa + xb) / 2, 4.6, (za + zb) / 2, false).rotation.y = m.rotation.y; };
  const L = s.x - 2, R = s.x + s.w + 2, F = z1 + 1, Bk = s.y + 6, gapL = cx - 13, gapR = cx + 13;
  rail(L, F, gapL, F); rail(gapR, F, R, F); rail(L, Bk, L, F); rail(R, Bk, R, F); rail(L, Bk, R, Bk);
  for (const [x, z, lit] of [[L, F, 1], [gapL, F, 1], [gapR, F, 1], [R, F, 1], [L, Bk, 0], [R, Bk, 0], [L, (F + Bk) / 2, 0], [R, (F + Bk) / 2, 0]]) {
    box(g, 2, 13, 2, post, x, 6.5, z); if (lit) lamps.push(box(g, 2.4, 2.4, 2.4, new THREE.MeshBasicMaterial({ color: hdr('#ffb020', 2.4) }), x, 14.4, z, false));
  }
  tickers.push(t => lamps.forEach((l, i) => { l.material.color.set(0xffb020).multiplyScalar(((t * 1.6 + i * 0.5) % 1) < 0.5 ? 2.6 : 0.25); }));
  for (const x of [L - 6, cx - 22, cx + 22, R + 6]) { const c = add(g, new THREE.ConeGeometry(3, 8, 8), std('#ff7a2a', 0.8), x, 5, F + 9); box(g, 7, 1, 7, std('#ff7a2a', 0.8), x, 0.5, F + 9); cyl(g, 2, 2.5, 1.6, std('#f4f1ff', 0.8), x, 4.6, F + 9, 8, false); }
  // the sign in the gap
  { const str = 'COMING SOON', w = textW(str) + 8, c = mk(w, 11), cg = c.getContext('2d'); cg.fillStyle = '#ffd23a'; cg.fillRect(0, 0, w, 11); cg.fillStyle = '#1b1626'; cg.fillRect(0, 0, w, 1); cg.fillRect(0, 10, w, 1); SPR.text(cg, str, 4, 3, '#1b1626');
    const face = new THREE.MeshStandardMaterial({ map: ptex(c), roughness: 0.8, emissive: 0xffffff, emissiveMap: ptex(c), emissiveIntensity: 0.25 });
    for (const x of [-9, 9]) box(g, 1.6, 22, 1.6, post, cx + x, 11, F + 1.5); add(g, new THREE.BoxGeometry(w * 0.62, 11 * 0.62 + 2, 1.6), [post, post, post, post, face, post], cx, 20, F + 2.2); }
  // work light
  box(g, 1, 30, 1, pipe, s.x + 6, 15, z1 - 8, false); box(g, 7, 5, 2, glow('#fff0d0', 2.6), s.x + 6, 31, z1 - 7.4, false);
  const wl = new THREE.PointLight(0xfff0d0, 1500, 190, 2); wl.position.set(s.x + 10, 32, z1 - 2); g.add(wl);
  return g;
}

export function streetFurniture(parent) {
  const g = new THREE.Group(); parent.add(g);
  const wood = std('#8a6a4a', 1, 0, 'wood'), iron = std('#2b2740', 0.5, 0.5), stone = std('#9a9082', 0.95, 0, 'stone'), T = 16;
  const bench = (x, z) => {
    box(g, 24, 1.8, 7, wood, x, 6, z); box(g, 24, 6, 1.4, wood, x, 10.5, z + 3.2);
    for (const s of [-1, 1]) { box(g, 1.6, 6, 7, iron, x + s * 10, 3, z); box(g, 1.6, 8, 1.4, iron, x + s * 10, 9, z + 3.2); }
    COLL.push({ x: x - 12, y: z - 4, w: 24, h: 8 });
  };
  for (const b of WORLD.BENCHES) bench(b.x, b.y);
  // plaza fountain
  const fx = 31.5 * T, fz = 21.2 * T;
  cyl(g, 21, 23, 5, stone, fx, 2.5, fz, 8); cyl(g, 22.5, 22.5, 1.4, std('#b5ab9c', 0.9, 0, 'stone'), fx, 5.2, fz, 8);
  { // pixel-art water that drifts
    const c = mk(16, 16), wg = c.getContext('2d'), r = rng(77); wg.fillStyle = '#3fb6e8'; wg.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 16; i++) { wg.fillStyle = ['#7ddcff', '#2a94cc', '#c9f4ff'][i % 3]; wg.fillRect(r() * 16 | 0, r() * 16 | 0, 2 + (r() * 3 | 0), 1); }
    const wt = ptex(c); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(2.4, 2.4);
    const water = add(g, new THREE.CircleGeometry(18.5, 8), new THREE.MeshBasicMaterial({ map: wt, color: hdr('#ffffff', 1.15) }), fx, 5.95, fz, false); water.rotation.x = -Math.PI / 2; water.rotation.z = Math.PI / 8;
    tickers.push(t => { wt.offset.set(t * 0.05, Math.sin(t * 0.7) * 0.06); });
  }
  cyl(g, 3, 4, 14, stone, fx, 9, fz, 6); cyl(g, 8, 3, 2.5, stone, fx, 17, fz, 8); add(g, new THREE.SphereGeometry(2.6, 12, 8), glow('#9fe6ff', 2.6), fx, 21, fz, false);
  const fl = new THREE.PointLight(0x7dd8ff, 1100, 170, 2); fl.position.set(fx, 16, fz); g.add(fl);
  COLL.push({ x: fx - 22, y: fz - 14, w: 44, h: 30 });
  // bollards with a glowing cap at the plaza corners
  for (const [x, z] of [[26.3, 17.3], [36.7, 17.3], [26.3, 24.7], [36.7, 24.7]]) { cyl(g, 1.6, 1.9, 9, iron, x * T, 4.5, z * T, 8); cyl(g, 1.3, 1.3, 1.4, glow('#ffd9a0', 2), x * T, 9.6, z * T, 8, false); }
  // crates and a barrel stacked beside the photo booth
  const snap = WORLD.B.find(b => b.id === 'snap'), cx = snap.x - 9, cz = snap.base - 14;
  box(g, 12, 12, 12, wood, cx, 6, cz); box(g, 9, 9, 9, std('#a9825c'), cx + 1, 16.5, cz + 1).rotation.y = 0.4; cyl(g, 5, 5, 12, std('#6b4a35'), cx - 2, 6, cz + 14, 10);
  COLL.push({ x: cx - 8, y: cz - 7, w: 16, h: 28 });
  return g;
}

// ---------- interiors ----------
export function roomTrim(g, r, WALL, WH) {
  const t = r.theme, w = r.w, capM = std(shade(t.wall, 0.55)), trimM = std(t.trim);
  box(g, w + 8, 3, 6, capM, w / 2, WH + 1.5, WALL - 2);                                  // wall cap
  box(g, w - 8, 5, 1.8, trimM, w / 2, 2.5, WALL + 0.9, false); box(g, w - 8, 1.6, 1.3, capM, w / 2, WH * 0.44, WALL + 0.7, false); // skirting, rail
  for (const x of [4, w - 4]) { box(g, 6, WH + 3, 6, capM, x, WH / 2 + 1.5, WALL + 1); box(g, 1.8, 5, r.h - WALL, trimM, x + (x < w / 2 ? 0.9 : -0.9), 2.5, (WALL + r.h) / 2, false); box(g, 4, 3, r.h - WALL, capM, x, WH + 1.5, (WALL + r.h) / 2); }
  for (const s of [-1, 1]) box(g, 3, 7, 3, capM, w / 2 + s * 15, 3.5, r.h + 1);           // low door posts
  // pendant lamp
  const c = t.fill ? `rgb(${t.fill})` : '#ffe2a8';
  const px = w / 2 + 46;
  cyl(g, 0.4, 0.4, 60, std('#15101f'), px, WH + 28, 112, 5, false); add(g, new THREE.ConeGeometry(7, 6, 12, 1, true), new THREE.MeshStandardMaterial({ color: 0x2b2740, side: THREE.DoubleSide }), px, WH - 1, 112, false);
  add(g, new THREE.SphereGeometry(2.6, 10, 8), glow(c, 2.4), px, WH - 3.4, 112, false);
  // rug as a raised slab instead of a floor print
  if (t.rug) { box(g, 80, 0.7, 44, std(shade(t.rug, 0.7), 1), 104, 0.35, 114, false); box(g, 74, 0.9, 38, std(t.rug, 1), 104, 0.5, 114, false); box(g, 64, 1.05, 28, std(shade(t.rug, 1.18), 1), 104, 0.55, 114, false); }
  // framed pictures high on the back wall
  const frame = (x, y, fw, fh, col, lit) => { box(g, fw + 3, fh + 3, 1.4, std('#2b2233', 0.8, 0, 'wood'), x, y, WALL + 0.9, false); box(g, fw, fh, 0.5, lit ? glow(col, 0.55) : std(col, 0.8), x, y, WALL + 1.6, false); };
  frame(w / 2 - 72, 58, 12, 9, t.trim); frame(w / 2 + 72, 58, 12, 9, r.b.neon);
  if (t.frames) for (let i = 0; i < 4; i++) frame(132 + i * 17, 36, 10, 12, ['#b58a64', '#8a6a5a', '#c9a27a', '#7a5a4a'][i], true);
  // a moonlit window in the left wall, with its light falling across the floor (skipped in the darkroom)
  if (!t.fill) {
    const dk = std('#2b2233', 0.8, 0, 'wood');
    box(g, 1.6, 30, 38, dk, 5, 44, 98, false); box(g, 0.8, 25, 33, glow('#8fa6ff', 1.25), 5.6, 44, 98, false);
    box(g, 1.2, 25, 1.2, dk, 6.2, 44, 98, false); box(g, 1.2, 1.2, 33, dk, 6.2, 44, 98, false); box(g, 3.4, 1.6, 40, dk, 6.4, 28.6, 98, false);
    const c2 = mk(32, 8), cg = c2.getContext('2d'), gr = cg.createLinearGradient(0, 0, 32, 0); gr.addColorStop(0, 'rgba(150,175,255,.55)'); gr.addColorStop(1, 'rgba(150,175,255,0)');
    cg.fillStyle = gr; cg.fillRect(0, 0, 32, 8); cg.clearRect(0, 3, 32, 1); cg.clearRect(15, 0, 1, 8);
    const patch = add(g, new THREE.PlaneGeometry(64, 30), new THREE.MeshBasicMaterial({ map: ptex(c2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 }), 44, 0.3, 104, false);
    patch.rotation.x = -Math.PI / 2; patch.receiveShadow = false;
  }
}

const WOOD = '#a9825c', WOODD = '#6f5038', INK = '#2b2740';
const BUILD = {
  desk(g, c, s) {
    const wood = std(WOOD, 0.9, 0, 'wood'), dk = std(WOODD, 0.9, 0, 'wood');
    box(g, 36, 2, 15, wood, 0, 15, -7); for (const [x, z] of [[-16, -1.5], [16, -1.5], [-16, -12.5], [16, -12.5]]) box(g, 2, 14, 2, dk, x, 7, z);
    box(g, 12, 9, 13, dk, 11, 9.5, -7);                                                   // drawer unit
    box(g, 16, 11, 1.6, std(INK, 0.4, 0.3), -3, 24, -10); box(g, 14, 9, 0.4, glow(c, 1.5), -3, 24, -9.1, false); box(g, 2, 3, 2, std(INK), -3, 17.5, -10); box(g, 7, 0.8, 4, std(INK), -3, 16.4, -10);
    box(g, 10, 0.8, 3.6, std('#e8e4f4'), -4, 16.4, -3.5, false); cyl(g, 1.3, 1.1, 2.6, std('#d6455a'), 9, 17.3, -4, 8, false); box(g, 6, 0.6, 8, std('#f4f1ff'), -14, 16.3, -6, false);
  },
  shelf(g, o, s) {
    const fr = std('#5a4034', 0.9, 0, 'wood'), rnd = rng(s.x * 7 + 3);
    box(g, 32, 44, 1, std('#3a2a26'), 0, 22, -8.5); for (const x of [-15.3, 15.3]) box(g, 1.4, 44, 9, fr, x, 22, -4.5);
    for (const y of [0.8, 11.5, 22.5, 33.5, 43.6]) box(g, 32, 1.4, 9, fr, 0, y, -4.5);
    for (const y of [1.5, 12.2, 23.2, 34.2]) for (let x = -13.5; x < 13; ) {
      const bw = 1.8 + rnd() * 1.6, bh = 5.5 + rnd() * 4, col = o.cols[rnd() * o.cols.length | 0];
      if (rnd() < 0.85) box(g, bw, bh, 6, o.glow && rnd() < 0.45 ? glow(col, 0.85) : std(col, 0.8), x + bw / 2, y + bh / 2, -4.5, false);
      x += bw + 0.35;
    }
  },
  plant(g, a, s) { cyl(g, 4.2, 3.2, 7.5, std('#c0603f'), 0, 3.75, -2.5, 10); cyl(g, 4.5, 4.5, 1, std('#e08a66'), 0, 7.6, -2.5, 10); bush(g, 0, 12, -2.5, 6, s.x); },
  bed(g, c) {
    box(g, 44, 6, 22, std('#cfd6ea'), 0, 6, -11); for (const [x, z] of [[-20, -2], [20, -2], [-20, -20], [20, -20]]) box(g, 2, 3, 2, std(INK), x, 1.5, z);
    box(g, 42, 4, 20, std('#f4f4fa'), 0, 11, -11); box(g, 10, 3, 14, std('#bfe8dc'), -14, 14.5, -11); box(g, 25, 4.8, 20.6, std(c), 8, 11.2, -11); box(g, 2.2, 18, 22, std('#9aa3c0', 0.5, 0.4), -22, 11, -11);
  },
  lamp(g, c) { cyl(g, 4, 4.6, 1.4, std(INK, 0.5, 0.5), 0, 0.7, -1.5, 12); cyl(g, 0.6, 0.6, 32, std(INK, 0.5, 0.5), 0, 16, -1.5, 6); add(g, new THREE.CylinderGeometry(3.6, 6.4, 8, 14, 1, true), new THREE.MeshBasicMaterial({ color: hdr(c, 1.9), side: THREE.DoubleSide }), 0, 35, -1.5, false); },
  cabinet(g, c, s) {
    const body = std(INK, 0.6, 0.2);
    box(g, 22, 22, 15, body, 0, 11, -7.5); box(g, 22, 22, 9, body, 0, 33, -10.5); box(g, 22, 4, 15, body, 0, 46, -7.5);
    box(g, 20, 4.4, 0.6, glow(c, 2), 0, 46, 0.2, false);
    const scr = add(g, new THREE.PlaneGeometry(17, 14), new THREE.MeshBasicMaterial({ map: ptex(crop(s.img, 3, 8, 12, 10)), color: hdr('#ffffff', 1.8) }), 0, 33, -5.6, false); scr.rotation.x = -0.18;
    const panel = box(g, 22, 2, 9, std('#57506e'), 0, 22.6, -3); panel.rotation.x = 0.28;
    ['#ff5a6e', '#ffe066', '#6dffb0'].forEach((b, i) => cyl(g, 0.9, 0.9, 1, glow(b, 2), -4 + i * 4, 24.2, -1.5, 8, false)); cyl(g, 0.5, 0.5, 3.4, std('#15101f'), -8, 24.8, -3, 6, false); add(g, new THREE.SphereGeometry(1.1, 8, 6), std('#ff5a6e', 0.4), -8, 26.8, -3, false);
    for (const x of [-11.2, 11.2]) box(g, 0.5, 48, 15.4, glow(c, 0.9), x, 24, -7.5, false);
  },
  mirror(g) {
    const fr = std('#e9dcff', 0.4, 0.5);
    box(g, 26, 2.5, 9, std('#b79bff'), 0, 1.25, -3); box(g, 27, 48, 2.4, fr, 0, 26, -4); box(g, 22, 43, 0.5, new THREE.MeshBasicMaterial({ color: hdr('#7de8ff', 1.25) }), 0, 26, -2.6, false);
    const shine = box(g, 3, 40, 0.3, glow('#e9feff', 1.5), -4, 26, -2.2, false); shine.rotation.z = 0.3; box(g, 9, 3, 2.6, fr, 0, 51, -4);
  },
  pedestal(g, c) {
    const st = std('#d8d4e6', 0.6);
    cyl(g, 6.5, 7.5, 2.5, st, 0, 1.25, -5, 8); cyl(g, 4.6, 4.6, 15, st, 0, 10, -5, 8); cyl(g, 7.5, 6, 2.6, std('#f4f1ff', 0.5), 0, 18.8, -5, 8);
    const gem = add(g, new THREE.OctahedronGeometry(4.2), glow(c, 2.2), 0, 28, -5, false); spinners.push(gem);
  },
  couch(g, c) {
    const m = std(c, 0.95), d = std(shade(c, 0.7), 0.95);
    box(g, 42, 6, 16, m, 0, 5, -8); box(g, 42, 15, 4.5, d, 0, 12, -14); for (const s of [-1, 1]) { box(g, 4.5, 12, 16, d, s * 19, 8, -8); box(g, 16.4, 3.4, 11, std(shade(c, 1.2), 0.95), s * 8.4, 9.6, -6.5, false); }
    for (const [x, z] of [[-18, -2], [18, -2], [-18, -14], [18, -14]]) box(g, 2, 2, 2, std(INK), x, 1, z, false);
  },
  tripod(g) {
    const ir = std(INK, 0.5, 0.5);
    [[0, 0.28, 5], [-0.28, -0.16, -4], [0.28, -0.16, -4]].forEach(([rz, rx, z], i) => { const l = box(g, 1, 27, 1, ir, i === 1 ? -4.5 : i === 2 ? 4.5 : 0, 13, -2 + (i ? -2.6 : 3)); l.rotation.set(i ? -0.2 : 0.3, 0, i === 1 ? -0.33 : i === 2 ? 0.33 : 0); });
    box(g, 10, 7.5, 8, ir, 0, 30, -2); const lens = cyl(g, 2.6, 2.6, 4.5, std('#57506e', 0.3, 0.6), 0, 30, 4, 12); lens.rotation.x = Math.PI / 2;
    const gl = cyl(g, 2, 2, 0.4, glow('#8fd0ff', 1.6), 0, 30, 6.4, 12, false); gl.rotation.x = Math.PI / 2; box(g, 4, 2.4, 3, std('#f4f1ff'), -2, 35, -2, false);
  },
  rack(g, o, s) {
    const gold = std('#f1d38a', 0.3, 0.8), rnd = rng(s.x + 11);
    const bar = cyl(g, 0.6, 0.6, 38, gold, 0, 31, -3, 6); bar.rotation.z = Math.PI / 2;
    for (const x of [-18.5, 18.5]) { box(g, 1.2, 31, 1.2, gold, x, 15.5, -3); box(g, 1.2, 1.2, 10, gold, x, 0.6, -3); }
    for (let x = -15; x <= 15; x += 5) { const c = o.cols[rnd() * o.cols.length | 0], h = 15 + rnd() * 8; box(g, 4.6, h, 1.6, std(c, 0.95), x, 29.5 - h / 2, -3).rotation.y = (rnd() - 0.5) * 0.5; }
  },
  console(g) { // CRT television on a low stand, with a little console and a game running on screen
    const wood = std(WOODD, 0.9, 0, 'wood');
    box(g, 38, 7, 11, wood, 0, 3.5, -5.5); box(g, 20, 16, 13, std('#3a3550', 0.6, 0.2), -7, 15, -6.5); box(g, 21, 2, 14, std('#2b2740'), -7, 23.6, -6.5, false);
    const c = mk(14, 11), cg = c.getContext('2d'), t2 = ptex(c);
    add(g, new THREE.PlaneGeometry(15.5, 12), new THREE.MeshBasicMaterial({ map: t2, color: hdr('#ffffff', 1.5) }), -7, 15.2, 0.1, false);
    let last = -1;
    tickers.push(t => { const f = Math.floor(t * 8); if (f === last) return; last = f;
      cg.fillStyle = '#10163a'; cg.fillRect(0, 0, 14, 11); cg.fillStyle = '#2a3a8a'; for (let x = (f % 4); x < 14; x += 4) cg.fillRect(x, 9, 2, 1);
      const bx = Math.abs(((f * 0.9) % 20) - 10) + 1, by = 7 - Math.abs(Math.sin(f * 0.55)) * 5;
      cg.fillStyle = '#ffe066'; cg.fillRect(bx | 0, by | 0, 2, 2); cg.fillStyle = '#6dffb0'; cg.fillRect(2, 8, 2, 1); cg.fillStyle = '#ff5a6e'; cg.fillRect(10, 2 + (f % 3), 2, 1); t2.needsUpdate = true; });
    box(g, 9, 2.4, 7, std('#cfd2dc', 0.6), 11, 8.2, -5); box(g, 1, 0.6, 0.6, glow('#ff5a6e', 2), 8.5, 8.4, -1.4, false);
    box(g, 6, 1.2, 3.4, std('#2b2740', 0.6), 10, 0.8, 4, false); box(g, 0.4, 0.4, 5, std('#15101f'), 10.5, 4, 0.5, false).rotation.x = 0.9;
  },
  bench(g) {
    const wood = std(WOOD, 0.9, 0, 'wood'); box(g, 38, 2, 9, wood, 0, 7, -4.5);
    for (const x of [-15, 15]) { box(g, 2, 6, 7, std(INK, 0.5, 0.4), x, 3, -4.5); }
  },
  screen(g) { // folding privacy screen
    [-11, 0, 11].forEach((x, i) => { const p = box(g, 11.6, 30, 0.9, std('#bfe8dc', 1), x, 17, -2); p.rotation.y = i % 2 ? -0.36 : 0.36; box(g, 0.9, 32, 0.9, std('#9aa3c0', 0.5, 0.4), x - 5.6, 16, -2 + (i % 2 ? 2 : -2), false); });
  },
  cooler(g) {
    box(g, 9.5, 20, 8.5, std('#e8ecf6', 0.6), 0, 10, -4.5); box(g, 6, 3, 0.5, std(INK), 0, 13, -0.1, false);
    cyl(g, 3.6, 3.6, 9, new THREE.MeshStandardMaterial({ color: 0x8fd0ff, roughness: 0.15, transparent: true, opacity: 0.75 }), 0, 24.5, -4.5, 8); cyl(g, 1.4, 3.6, 2, std('#8fd0ff', 0.2), 0, 20.6, -4.5, 8, false);
  },
  labtable(g) {
    const steel = std('#c9d2e0', 0.35, 0.6);
    box(g, 44, 2, 14, steel, 0, 16, -7); for (const [x, z] of [[-20, -1.5], [20, -1.5], [-20, -12.5], [20, -12.5]]) box(g, 1.6, 15, 1.6, steel, x, 7.5, z);
    box(g, 42, 1, 12, steel, 0, 5, -7, false);
    box(g, 6, 1.2, 7, std(INK), -10, 17.6, -7); box(g, 1.6, 9, 1.6, std(INK), -10, 22, -9.5); const tube = cyl(g, 1.2, 1.2, 7, std('#e8ecf6', 0.3, 0.5), -10, 24, -7, 8); tube.rotation.x = 0.5;
    box(g, 12, 1, 8, std('#f4f1ff'), 8, 17.5, -7, false); for (let i = 0; i < 4; i++) cyl(g, 1.3, 1.3, 0.6, glow('#8fd0ff', 1.3), 4 + i * 2.8, 18.3, -7, 8, false);
  },
  weights(g) {
    const ir = std(INK, 0.5, 0.5);
    for (const x of [-14, 14]) box(g, 1.6, 20, 9, ir, x, 10, -4.5); for (const y of [6, 15]) box(g, 28, 1.2, 8, ir, 0, y, -4.5);
    ['#ff7d8a', '#3aa0ff', '#ffe066'].forEach((c, i) => { for (const y of [8.4, 17.4]) { const x = -8.5 + i * 8.5, b = cyl(g, 0.7, 0.7, 6, ir, x, y, -4.5, 6, false); b.rotation.x = Math.PI / 2; for (const z of [-7.2, -1.8]) { const pl = cyl(g, 2.2, 2.2, 1.8, std(c, 0.7), x, y, z, 8, false); pl.rotation.x = Math.PI / 2; } } });
  },
  ball(g) { add(g, new THREE.IcosahedronGeometry(6.5, 1), new THREE.MeshStandardMaterial({ color: 0xff7d8a, roughness: 0.6, flatShading: true, map: pix('grain') }), 0, 6.5, -5); },
  easel(g) {
    const wood = std(WOODD, 0.9, 0, 'wood');
    for (const [x, rz] of [[-5, -0.14], [5, 0.14]]) { const l = box(g, 1.2, 34, 1.2, wood, x, 16.5, -2); l.rotation.z = rz; l.rotation.x = -0.12; } const bk = box(g, 1.2, 32, 1.2, wood, 0, 15.5, -7); bk.rotation.x = 0.26;
    box(g, 14, 1.2, 2.4, wood, 0, 11, -1.4);
    const cv = new THREE.Group(); cv.position.set(0, 21, -2.4); cv.rotation.x = -0.14; g.add(cv);
    box(cv, 17, 20, 1, std('#f4f1ff', 1), 0, 0, 0); box(cv, 9, 7, 0.3, std('#f08a3c', 1), -2, 3, 0.6, false); box(cv, 6, 9, 0.3, std('#b79bff', 1), 3.5, -3, 0.6, false); box(cv, 5, 3, 0.3, std('#6dffb0', 1), -4.5, -5.5, 0.6, false);
  },
  speaker(g) {
    box(g, 14, 32, 11, std('#1a1626', 0.7), 0, 16, -5.5);
    for (const [y, r] of [[22, 4.6], [9.5, 3.4]]) { const ring = cyl(g, r, r, 0.6, glow('#ff5fd2', 0.9), 0, y, 0.1, 10, false); ring.rotation.x = Math.PI / 2; const cone = cyl(g, r - 1, r - 1, 0.8, std('#2b2740', 0.5), 0, y, 0.2, 10, false); cone.rotation.x = Math.PI / 2; }
  },
  mannequin(g) {
    const iv = std('#efe6d2', 0.6);
    cyl(g, 4.5, 5, 1.2, std('#f1d38a', 0.3, 0.8), 0, 0.6, -3, 8); cyl(g, 0.6, 0.6, 16, std('#f1d38a', 0.3, 0.8), 0, 9, -3, 6);
    box(g, 9, 13, 5, std('#24222c', 0.95), 0, 23, -3); box(g, 9.4, 3, 5.4, std('#f1d38a', 0.4, 0.6), 0, 19, -3, false); cyl(g, 1.2, 1.2, 2.4, iv, 0, 30.6, -3, 6); add(g, new THREE.IcosahedronGeometry(2.8, 1), iv, 0, 34, -3);
  },
  darktable(g) {
    const wood = std(WOODD, 0.9, 0, 'wood');
    box(g, 40, 2, 14, wood, 0, 15, -7); for (const [x, z] of [[-18, -1.5], [18, -1.5], [-18, -12.5], [18, -12.5]]) box(g, 2, 14, 2, wood, x, 7, z);
    ['#b23a48', '#e8b860', '#e8e4f4'].forEach((c, i) => { box(g, 10, 1.6, 8, std('#2b2233'), -12 + i * 12, 16.8, -7, false); box(g, 8.4, 0.5, 6.4, std(c, 0.2), -12 + i * 12, 17.5, -7, false); });
    box(g, 4, 5, 4, std(INK), 16, 24, -12, false); box(g, 3, 3, 0.6, glow('#ff3a3a', 2.2), 16, 24, -9.8, false); box(g, 1, 8, 1, std(INK), 16, 19, -12.5, false);
  },
  counter(g, c) {
    box(g, 50, 17, 13, std(c, 0.7), 0, 8.5, -6.5); box(g, 53, 2, 15.5, std('#f4f1ff', 0.35), 0, 18, -6.5); box(g, 50.4, 1.1, 13.4, std('#f1d38a', 0.3, 0.8), 0, 11, -6.5, false);
    box(g, 9, 5, 7, std(INK), 13, 21.5, -7); box(g, 7, 4.4, 0.4, glow('#b79bff', 1.5), 13, 24.5, -3.6, false).rotation.x = -0.4; cyl(g, 1.6, 1.3, 3, std('#f1d38a', 0.3, 0.8), -14, 20.5, -6, 8, false);
  }
};
export function makeProp(kind, arg, s) {
  const fn = BUILD[kind]; if (!fn) return null;
  const g = new THREE.Group(); fn(g, arg, s); return g;
}
