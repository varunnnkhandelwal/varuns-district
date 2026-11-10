// HD-2D renderer: a real 3D district (Three.js) with 2D pixel-art characters standing in it.
// Game logic stays in flat map coordinates (x, y); here that becomes 3D (x, height, z = y).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { dressBuilding, streetFurniture, roomTrim, makeProp, spinners, tickers, tree3d, signPost, kiosk3d, mailbox3d, constructionSite } from './props3d.js';

const { FW, FH, mk, shade } = SPR;
const { B, MAPW, MAPH, TREES, LAMPS, POSTS, ORBS, NPCS, KIOSK, MAILBOX, HELLO, rng } = WORLD;
const HS = 1.25;            // buildings are stretched a little taller than their 2D art
const WALL = 40, WH = 72;   // interior back wall: depth in the room art, height in 3D
const MARK = { main: 0xffd27a, side: 0xbfe0f2, play: 0xff9ec4, about: 0xffffff };

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('view'), antialias: true, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06060f);
scene.fog = new THREE.FogExp2(0x0a0b22, 0.0015);
const camera = new THREE.PerspectiveCamera(30, 1, 10, 2600);

// ---------- helpers ----------
function tex(c, mip = true) {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
  if (mip) { t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4; } else { t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; }
  return t;
}
function crop(src, x, y, w, h) { const c = mk(Math.max(1, w | 0), Math.max(1, h | 0)); c.getContext('2d').drawImage(src, x, y, w, h, 0, 0, w, h); return c; }
// glow map: black, plus a faint copy of the art (so nothing goes pitch black), plus the emissive pixels at full strength
function glowMap(img, em, base = 0.08) {
  const c = mk(img.width, img.height), g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height); g.globalAlpha = base; g.drawImage(img, 0, 0); g.globalAlpha = 1; if (em) g.drawImage(em, 0, 0);
  return c;
}
const hdr = (hex, k) => new THREE.Color(hex).multiplyScalar(k);
// an upright cut-out card that takes light and casts a correctly shaped shadow
function board(map, glow, w, h, glowK = 0.9) {
  const geo = new THREE.PlaneGeometry(w, h); geo.translate(0, h / 2, 0);
  const n = geo.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 0.6, 0.8); // lit as if facing up-and-forward
  const mat = new THREE.MeshLambertMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: glow || map, emissiveIntensity: glow ? glowK : 0.12 });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.5 });
  m.customDistanceMaterial = new THREE.MeshDistanceMaterial({ map, alphaTest: 0.5 });
  return m;
}
const artBoard = (img, em, k = 1) => board(tex(img, false), em ? tex(glowMap(img, em), false) : null, img.width * k, img.height * k);

// ---------- outdoor district ----------
const outdoor = new THREE.Group(); scene.add(outdoor);
{
  const far = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshStandardMaterial({ map: (() => { const t = tex(crop(WORLD.ground, 8, 650, 64, 64)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(9000 / 64, 9000 / 64); return t; })(), color: 0x9a9a9a, roughness: 1 }));
  far.rotation.x = -Math.PI / 2; far.position.set(MAPW / 2, -0.6, MAPH / 2); far.receiveShadow = true; outdoor.add(far);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(MAPW, MAPH), new THREE.MeshStandardMaterial({ map: tex(WORLD.ground), roughness: 0.62, metalness: 0.05 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(MAPW / 2, 0, MAPH / 2); ground.receiveShadow = true; outdoor.add(ground);
}

function sideWall(b, w, h, seed) {
  const img = mk(w, h), em = mk(w, h), g = img.getContext('2d'), eg = em.getContext('2d'), rnd = rng(seed);
  g.fillStyle = b.wall; g.fillRect(0, 0, w, h); eg.fillStyle = '#000'; eg.fillRect(0, 0, w, h);
  g.fillStyle = shade(b.wall, 0.88); for (let i = 0; i < (w * h) / 80; i++) g.fillRect(rnd() * (w - 6) | 0, rnd() * (h - 2) | 0, 3 + (rnd() * 3 | 0), 1);
  g.fillStyle = shade(b.wall, 0.6); g.fillRect(0, h - 3, w, 3); g.fillRect(0, 0, w, 2);
  const n = Math.floor((w - 12) / 14), sx = ((w - (n * 14 - 6)) / 2) | 0;
  for (let y = 9; y + 10 < h - 8; y += 16) for (let i = 0; i < n; i++) {
    const x = sx + i * 14, lit = rnd() < 0.45;
    g.fillStyle = shade(b.wall, 0.55); g.fillRect(x - 1, y - 1, 10, 12); g.fillStyle = '#2a2740'; g.fillRect(x, y, 8, 10);
    if (lit) { eg.fillStyle = rnd() < 0.25 ? b.neon : '#ffd98a'; eg.fillRect(x, y, 8, 10); eg.fillStyle = '#3a2f3f'; eg.fillRect(x + 3, y, 1, 10); eg.fillRect(x, y + 4, 8, 1); }
  }
  return new THREE.MeshStandardMaterial({ map: tex(img), emissive: 0xffffff, emissiveMap: tex(em), emissiveIntensity: 1.1, roughness: 0.9 });
}
function prism(W, D, rh) { // pitched roof: ridge runs east-west
  const A = [-W / 2, 0, D / 2], Bv = [W / 2, 0, D / 2], C = [W / 2, rh, 0], Dv = [-W / 2, rh, 0], E = [W / 2, 0, -D / 2], F = [-W / 2, 0, -D / 2];
  const pos = [A, Bv, C, A, C, Dv, E, F, Dv, E, Dv, C, F, A, Dv, Bv, E, C].flat();
  const uv = [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0.5, 1, 0, 0, 1, 0, 0.5, 1];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.addGroup(0, 12, 0); g.addGroup(12, 6, 1); g.computeVertexNormals();
  return g;
}
const beacons = [], markers = [];
for (const b of B) {
  const w = b.w - 6, d = b.h - 14, fh = b.h - b.roofH, H = fh * HS, cx = b.x + b.w / 2, cz = b.y + 14 + d / 2;
  const front = new THREE.MeshStandardMaterial({ map: tex(crop(b.img, 3, b.roofH, w, fh)), emissive: 0xffffff, emissiveMap: tex(glowMap(crop(b.img, 3, b.roofH, w, fh), crop(b.em, 3, b.roofH, w, fh), 0)), emissiveIntensity: 1.15, roughness: 0.85 });
  const side = sideWall(b, d, fh, b.seed + 1), backM = sideWall(b, w, fh, b.seed + 2), cap = new THREE.MeshStandardMaterial({ color: new THREE.Color(b.roof), roughness: 1 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, H, d), [side, side, cap, cap, front, backM]);
  body.position.set(cx, H / 2, cz); body.castShadow = body.receiveShadow = true; body.userData.fb = b; outdoor.add(body);
  const roofTex = tex(crop(b.img, 0, 2, b.w, Math.max(4, b.roofH - 5)));
  if (['accenture', 'synth', 'lvcred'].includes(b.id)) { // flat roof with a parapet
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w + 6, 6, d + 6), new THREE.MeshStandardMaterial({ map: roofTex, roughness: 1 }));
    slab.position.set(cx, H + 3, cz); slab.castShadow = slab.receiveShadow = true; slab.userData.fb = b; outdoor.add(slab);
    if (b.beacon) {
      const mast = new THREE.Mesh(new THREE.BoxGeometry(2, 26, 2), new THREE.MeshStandardMaterial({ color: 0x2b2740 })); mast.position.set(cx, H + 19, cz); outdoor.add(mast);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(2.4, 12, 8), new THREE.MeshBasicMaterial({ color: hdr(0xff4a5e, 4) })); lamp.position.set(cx, H + 33, cz); outdoor.add(lamp); beacons.push(lamp);
    }
  } else {
    const roof = new THREE.Mesh(prism(w + 10, d + 10, Math.min(40, d * 0.42)), [new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.95 }), new THREE.MeshStandardMaterial({ color: new THREE.Color(shade(b.wall, 0.8)), roughness: 1 })]);
    roof.position.set(cx, H, cz); roof.castShadow = roof.receiveShadow = true; roof.userData.fb = b; outdoor.add(roof);
  }
  body.userData.dg = dressBuilding(b, { w, d, H, cx, cz }, outdoor); // sills, awnings, sign, chimney...
  // quest marker over the door: gold = main story, blue = side story, pink = playground
  const s = b.tier === 'main' ? 4.2 : 3;
  const mk3 = new THREE.Mesh(new THREE.OctahedronGeometry(s), new THREE.MeshBasicMaterial({ color: hdr(MARK[b.tier], 2.6), transparent: true }));
  mk3.position.set(b.doorX, Math.min(H - 6, 62), b.base + 7); outdoor.add(mk3); markers.push({ m: mk3, b, y: mk3.position.y });
}
const treeMeshes = [];
// trees: two crossed cut-outs each, so they have volume and throw leafy shadows
{
  const kinds = new Map();
  for (const t of TREES) {
    if (!kinds.has(t.art)) kinds.set(t.art, tex(t.art, false));
    const map = kinds.get(t.art), k = 1.7 + ((t.x * 7 + t.y * 3) % 10) / 22;
    const m = tree3d(k * 0.9, t.x * 13 + t.y); m.position.set(t.x, 0, t.y - 2); m.rotation.y = (t.x * 0.37) % 6.28; outdoor.add(m); treeMeshes.push(m); // solid, faceted trees
  }
}
// street lamps: pole, arm, and a glowing globe that blooms
const lampGlobes = [];
{
  const poleM = new THREE.MeshStandardMaterial({ color: 0x2b2740, roughness: 0.6, metalness: 0.5 });
  for (const l of LAMPS) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.4, 38, 6), poleM); pole.position.set(l.x, 19, l.y); pole.castShadow = true; outdoor.add(pole);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(4.6, 3, 8), poleM); cap.position.set(l.x, 43.5, l.y); outdoor.add(cap);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(3.6, 14, 10), new THREE.MeshBasicMaterial({ color: hdr(0xffdca0, 2.4) })); globe.position.set(l.x, 39.5, l.y); outdoor.add(globe);
    lampGlobes.push(globe);
  }
}
// small props
const put = (m, x, z) => { m.position.set(x, 0, z); outdoor.add(m); return m; };
for (const p of POSTS) put(signPost(p.img), p.x, p.y);
put(kiosk3d(STATICSof(KIOSK).img, STATICSof(KIOSK).em), KIOSK.x, KIOSK.y);
put(mailbox3d(), MAILBOX.x, MAILBOX.y);
put(signPost(STATICSof(HELLO).img, 1.5), HELLO.x, HELLO.y);
function STATICSof(k) { return WORLD.STATICS.find(s => s.by === k.y && Math.abs(s.x + s.img.width / 2 - k.x) < 4); }

streetFurniture(outdoor); // benches, fountain, bollards, crates
constructionSite(outdoor, WORLD.WIP); // the fitness app, not built yet
// skill orbs
const orbMeshes = ORBS.map(o => { const m = new THREE.Mesh(new THREE.OctahedronGeometry(3.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(o.c[0] / 255, o.c[1] / 255, o.c[2] / 255).multiplyScalar(3) })); outdoor.add(m); return m; });
// fireflies and drifting dust
const flyGeo = new THREE.BufferGeometry(); flyGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(16 * 3), 3));
outdoor.add(new THREE.Points(flyGeo, new THREE.PointsMaterial({ color: hdr(0xd6ff8a, 3), size: 2.2, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
const dust = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: hdr(0xffe9c4, 1.4), size: 1.1, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
{ const r = rng(5), a = new Float32Array(260 * 3); for (let i = 0; i < a.length; i += 3) { a[i] = (r() - 0.5) * 520; a[i + 1] = 4 + r() * 90; a[i + 2] = (r() - 0.5) * 420; } dust.geometry.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); }
scene.add(dust);

// ---------- characters ----------
function sprite(sheet, cols, rows, w, h) {
  const t = tex(sheet, false); t.repeat.set(1 / cols, 1 / rows);
  const m = board(t, null, w, h); m.userData = { t, cols, rows };
  // thickness: darker copies stacked behind the front face, so the sprite reads as a solid cut-out from above
  const edge = m.material.clone(); edge.color.setScalar(0.55);
  for (let i = 1; i <= 5; i++) { const l = new THREE.Mesh(m.geometry, edge); l.position.z = -i * 0.6; m.add(l); }
  // soft contact shadow so feet sit on the ground
  const blob = new THREE.Mesh(new THREE.CircleGeometry(w * 0.42, 18), new THREE.MeshBasicMaterial({ color: 0x05040c, transparent: true, opacity: 0.38, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.scale.y = 0.55; blob.position.set(0, 0.25, 0.5); m.add(blob);
  return m;
}
const setFrame = (m, col, row) => m.userData.t.offset.set(col / m.userData.cols, 1 - (row + 1) / m.userData.rows);
function animate(m, id, anim, t) { const a = SPR.chars[id].anims[anim]; setFrame(m, a.start + (Math.floor(t * a.fps) % a.n), a.row); }
const SH = 1.18; // sprites are stretched slightly so they don't look squat from the raised camera
const hero = sprite(SPR.chars.varun.sheet, 6, 4, FW, FH * SH); scene.add(hero);
const npcMeshes = NPCS.map(n => {
  const m = sprite(SPR.chars[n.id].sheet, 6, 4, FW, FH * SH); m.position.set(n.x, 0, n.y); outdoor.add(m);
  if (n.id === 'mira') { m.material.transparent = true; m.material.opacity = 0.82; m.material.emissiveIntensity = 1.4; m.castShadow = false; }
  return m;
});
const catMesh = sprite(SPR.cat, 6, 1, 16, 12); outdoor.add(catMesh);
const workerMeshes = WORLD.WORKERS.map(w => { const m = sprite(SPR.chars[w.id].sheet, 6, 4, FW, FH * SH); m.position.set(w.x, 0, w.y); outdoor.add(m); return m; });
const sparkMesh = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: tex(SPR.spark, false), transparent: true, color: hdr(0xffffff, 2.4), depthWrite: false }));
sparkMesh.material.map.repeat.set(1 / 4, 1); scene.add(sparkMesh);
// jetpack: twin tanks strapped to the hero's back, with nozzle flames, a warm glow and a smoke trail
const jetpack = new THREE.Group(); jetpack.visible = false; scene.add(jetpack);
const jetFlames = [];
{
  const metal = new THREE.MeshStandardMaterial({ color: 0xb8c0d8, roughness: 0.35, metalness: 0.7 }), dark = new THREE.MeshStandardMaterial({ color: 0x2b2740, roughness: 0.6 }), red = new THREE.MeshStandardMaterial({ color: 0xd6455a, roughness: 0.5 });
  const part = (geo, mat, x, y, z, to = jetpack) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); to.add(m); return m; };
  part(new THREE.BoxGeometry(5.6, 7.5, 2.4), dark, 0, 0, 0); part(new THREE.BoxGeometry(11, 1.2, 2.8), dark, 0, 2.4, 0); part(new THREE.BoxGeometry(11, 1.2, 2.8), dark, 0, -2.2, 0);
  part(new THREE.BoxGeometry(1.6, 1.6, 0.6), new THREE.MeshBasicMaterial({ color: hdr(0x6dffb0, 2.2) }), 0, 1, 1.4); part(new THREE.BoxGeometry(1.6, 1.6, 0.6), new THREE.MeshBasicMaterial({ color: hdr(0x6dffb0, 2.2) }), 0, 1, -1.4);
  for (const s of [-1, 1]) {
    part(new THREE.CylinderGeometry(2, 2, 9.5, 8), metal, s * 4.7, 0.4, 0).castShadow = true; part(new THREE.SphereGeometry(2, 8, 6), red, s * 4.7, 5.2, 0);
    part(new THREE.CylinderGeometry(2.15, 2.15, 1.2, 8), red, s * 4.7, -1.5, 0); part(new THREE.CylinderGeometry(1.2, 2.3, 2.6, 8), dark, s * 4.7, -5.6, 0);
    const f = new THREE.Group(); f.position.set(s * 4.7, -6.8, 0); jetpack.add(f); jetFlames.push(f);
    part(new THREE.ConeGeometry(2, 10, 7), new THREE.MeshBasicMaterial({ color: hdr(0xff6a1a, 3) }), 0, -5, 0, f).rotation.x = Math.PI;
    part(new THREE.ConeGeometry(1.1, 6.5, 6), new THREE.MeshBasicMaterial({ color: hdr(0xfff0a0, 4) }), 0, -3.2, 0, f).rotation.x = Math.PI;
  }
}
const jetLight = new THREE.PointLight(0xff9a40, 0, 130, 2); scene.add(jetLight);
const puffs = Array.from({ length: 28 }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xd6d8e4, transparent: true, opacity: 0, depthWrite: false })); m.visible = false; scene.add(m); return m; });
let puffI = 0, puffT = 0;
function updateJet(on, P, hy, k, dt) {
  jetpack.visible = on; jetLight.intensity = on ? 750 + Math.random() * 300 : 0;
  if (on) {
    // "behind" depends on which way the sprite faces: away from the camera, toward it, or to one side
    const back = P.dir === 'up' ? [0, 3.2] : P.dir === 'side' ? [P.flip ? 6.5 : -6.5, 0.8] : [0, -3.8];
    jetpack.position.set(P.x + back[0] * k, hy + 13.5 * k, P.y + back[1] * k); jetpack.scale.setScalar(k);
    jetpack.rotation.y = P.dir === 'side' ? Math.PI / 2 : 0;
    jetpack.rotation.x = P.moving && P.dir !== 'side' ? (P.dir === 'up' ? -0.22 : 0.22) : 0; jetpack.rotation.z = P.moving && P.dir === 'side' ? (P.flip ? 0.25 : -0.25) : 0;
    for (const f of jetFlames) f.scale.set(1, 0.7 + Math.random() * 0.6 + (P.moving ? 0.45 : 0), 1);
    jetLight.position.set(jetpack.position.x, Math.max(4, hy), jetpack.position.z + 2);
    puffT -= dt;
    if (puffT <= 0) { puffT = 0.04; const m = puffs[puffI = (puffI + 1) % puffs.length]; m.visible = true; m.userData.life = 1; m.position.set(jetpack.position.x + (Math.random() - 0.5) * 9 * k, hy + 2 * k, jetpack.position.z + (Math.random() - 0.5) * 3); }
  }
  for (const m of puffs) {
    if (!m.visible) continue;
    const a = (m.userData.life -= dt * 1.5); if (a <= 0) { m.visible = false; continue; }
    m.position.y = Math.max(0.8, m.position.y - 26 * dt); m.scale.setScalar(1.4 + (1 - a) * 5.5); m.material.opacity = a * 0.5;
  }
}
let heroK = 1;

// ---------- interiors ----------
const rooms = {};
for (const b of B) {
  const r = INTERIORS[b.id], g = new THREE.Group(); g.visible = false; scene.add(g); rooms[b.id] = g;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.h - WALL), new THREE.MeshStandardMaterial({ map: tex(crop(r.ground, 0, WALL, r.w, r.h - WALL)), roughness: 0.5, metalness: 0.05 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(r.w / 2, 0, (WALL + r.h) / 2); floor.receiveShadow = true; g.add(floor);
  const wallM = new THREE.MeshStandardMaterial({ map: tex(crop(r.ground, 0, 0, r.w, WALL)), roughness: 0.9 });
  const backW = new THREE.Mesh(new THREE.PlaneGeometry(r.w, WH), wallM); backW.position.set(r.w / 2, WH / 2, WALL); backW.receiveShadow = true; g.add(backW);
  const sideM = new THREE.MeshStandardMaterial({ map: tex(crop(r.ground, 8, 0, 64, WALL)), roughness: 0.9 });
  for (const [x, ry] of [[4, Math.PI / 2], [r.w - 4, -Math.PI / 2]]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(r.h - WALL, WH), sideM); s.position.set(x, WH / 2, (WALL + r.h) / 2); s.rotation.y = ry; s.receiveShadow = true; g.add(s); }
  const sill = new THREE.Mesh(new THREE.BoxGeometry(r.w + 8, 6, 4), new THREE.MeshStandardMaterial({ color: 0x15101f })); sill.position.set(r.w / 2, 1, r.h + 2); g.add(sill);
  roomTrim(g, r, WALL, WH);
  for (const s of r.statics) {
    const w = s.img.width, h = s.img.height, lift = s.by - (s.y + h);
    if (lift > 2) { const m = artBoard(s.img, s.em, 1.5); m.castShadow = false; m.position.set(s.x + w / 2, lift * (WH / WALL) + 8, WALL + 0.6); g.add(m); } // hangs on the back wall
    else { const m = makeProp(s.kind, s.arg, s) || artBoard(s.img, s.em, 1.25); m.position.set(s.x + w / 2, 0, s.by); g.add(m); } // solid 3D furniture
  }
}

// ---------- lights ----------
const hemi = new THREE.HemisphereLight(0x4a56a8, 0x1c1630, 0.5); scene.add(hemi);
const moon = new THREE.DirectionalLight(0x8fa6ff, 0.6); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
Object.assign(moon.shadow.camera, { left: -330, right: 330, top: 330, bottom: -330, near: 10, far: 900 }); moon.shadow.camera.updateProjectionMatrix(); moon.shadow.bias = -0.0006; moon.shadow.normalBias = 0.6;
scene.add(moon, moon.target);
const POOL = 14, pool = Array.from({ length: POOL }, () => { const l = new THREE.PointLight(0xffffff, 0, 200, 2); scene.add(l); return l; });
const sparkLight = new THREE.PointLight(0xece0ff, 0, 300, 2); sparkLight.castShadow = true; sparkLight.shadow.mapSize.set(1024, 1024); sparkLight.shadow.bias = -0.004; sparkLight.shadow.camera.near = 2; sparkLight.shadow.camera.far = 320;
const flashLight = new THREE.PointLight(0xffffff, 0, 700, 1.6); scene.add(sparkLight, flashLight);

// ---------- post: tilt-shift blur away from the focus row, then bloom ----------
const TiltShift = {
  uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() }, focus: { value: 0.45 }, amount: { value: 1.5 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 dir; uniform float focus; uniform float amount; varying vec2 vUv;
    void main(){ float r = amount * smoothstep(0.2, 0.62, abs(vUv.y - focus)); vec4 c = vec4(0.0); float t = 0.0;
      for (int i = -6; i <= 6; i++) { float w = exp(-float(i * i) / 16.0); c += texture2D(tDiffuse, vUv + dir * float(i) * r) * w; t += w; }
      gl_FragColor = c / t; }`
};
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const tiltH = new ShaderPass(TiltShift), tiltV = new ShaderPass(TiltShift); composer.addPass(tiltH); composer.addPass(tiltV);
const bloom = new UnrealBloomPass(new THREE.Vector2(2, 2), 0.42, 0.55, 1.0); composer.addPass(bloom);
composer.addPass(new OutputPass());
function resize() {
  const w = innerWidth, h = innerHeight, pr = matchMedia('(pointer: coarse)').matches ? 1 : Math.min(devicePixelRatio || 1, 1.5); // phones render at 1x to keep the frame rate up
  renderer.setPixelRatio(pr); renderer.setSize(w, h, false); composer.setPixelRatio(pr); composer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  tiltH.uniforms.dir.value.set(1 / w, 0); tiltV.uniforms.dir.value.set(0, 1 / h);
}
addEventListener('resize', resize); resize();

// ---------- time of day: night, morning, midday, evening. It only moves when the hero sits on a bench. ----------
const TOD = [
  { sky: 0x06060f, fog: 0x0a0b22, dens: 0.0015, hs: 0x4a56a8, hg: 0x1c1630, hi: 0.5, sc: 0x8fa6ff, si: 0.6, sd: [-150, 300, 190], lamp: 1, emis: 1, bloom: 0.42, stars: 1, disc: [420, 330, -1500] },
  { sky: 0xe8a07e, fog: 0xc98a7a, dens: 0.0011, hs: 0xffcfa8, hg: 0x4a3a50, hi: 0.8, sc: 0xffb078, si: 1.5, sd: [300, 130, 120], lamp: 0.3, emis: 0.45, bloom: 0.34, stars: 0.1, disc: [-640, 90, -1500] },
  { sky: 0x86bdf0, fog: 0xa9cdea, dens: 0.0006, hs: 0xe6f1ff, hg: 0x6a7a5a, hi: 0.8, sc: 0xfff2dc, si: 2.2, sd: [170, 250, 210], lamp: 0, emis: 0.12, bloom: 0.2, stars: 0, disc: [0, 390, -1500] },
  { sky: 0xd0665c, fog: 0xb0605c, dens: 0.0011, hs: 0xff9e78, hg: 0x3a2a48, hi: 0.75, sc: 0xff7a50, si: 1.4, sd: [-300, 115, 130], lamp: 0.75, emis: 0.8, bloom: 0.38, stars: 0.25, disc: [640, 90, -1500] }
];
for (const p of TOD) { for (const k of ['sky', 'fog', 'hs', 'hg', 'sc']) p[k] = new THREE.Color(p[k]); p.sd = new THREE.Vector3(...p.sd); p.disc = new THREE.Vector3(...p.disc); }
// every glowing window and sign outdoors, so they can dim by day
const glowMats = [];
outdoor.traverse(m => { for (const x of [].concat(m.material || [])) if (x.isMeshStandardMaterial && x.emissiveMap && !glowMats.some(r => r.x === x)) glowMats.push({ x, base: x.emissiveIntensity }); });
const sky = new THREE.Group(); scene.add(sky);
const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(44, 20), new THREE.MeshBasicMaterial({ fog: false })); sky.add(sunDisc);
const stars = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: hdr(0xffffff, 1.5), size: 2.2, sizeAttenuation: false, fog: false, transparent: true, depthWrite: false }));
{ const r = rng(21), a = new Float32Array(340 * 3); for (let i = 0; i < a.length; i += 3) { a[i] = (r() - 0.5) * 3400; a[i + 1] = 30 + r() * r() * 800; a[i + 2] = -1700; } stars.geometry.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); }
sky.add(stars);
const sunDir = new THREE.Vector3(-150, 300, 190), env = { lampK: 1 };
let sitK = 0;
function applyTod(tod) {
  const i = Math.floor(tod) % 4, a = TOD[i], b = TOD[(i + 1) % 4], s = tod - Math.floor(tod), L = k => a[k] + (b[k] - a[k]) * s;
  scene.background.lerpColors(a.sky, b.sky, s); scene.fog.color.lerpColors(a.fog, b.fog, s); scene.fog.density = L('dens');
  hemi.color.lerpColors(a.hs, b.hs, s); hemi.groundColor.lerpColors(a.hg, b.hg, s); hemi.intensity = L('hi');
  moon.color.lerpColors(a.sc, b.sc, s); moon.intensity = L('si'); sunDir.lerpVectors(a.sd, b.sd, s);
  bloom.strength = L('bloom'); stars.material.opacity = L('stars');
  const e = L('emis'); for (const r of glowMats) r.x.emissiveIntensity = r.base * e;
  sunDisc.position.lerpVectors(a.disc, b.disc, s); sunDisc.material.color.lerpColors(a.sc, b.sc, s).multiplyScalar(2.6);
  env.lampK = L('lamp');
}

// buildings that can stand between the camera and the hero fade out instead of hiding them
const faders = [];
outdoor.traverse(m => { if (m.userData.fb) { const mats = [].concat(m.material); for (const x of mats) x.transparent = true; faders.push({ m, b: m.userData.fb, mats }); } });

// ---------- per-frame ----------
const target = new THREE.Vector3(504, 0, 392), sparkPos = new THREE.Vector3(504, 28, 396), v = new THREE.Vector3();
let current = null;
function frame(G, dt) {
  const sc = G.scene, P = G.P, t = G.time, inside = !sc.outdoor;
  if (!inside) applyTod(G.tod);
  sitK += ((G.sit ? 1 : 0) - sitK) * Math.min(1, dt * 1.4);
  if (sc !== current) { // entered or left a building
    current = sc; outdoor.visible = !inside;
    for (const id in rooms) rooms[id].visible = inside && sc.b.id === id;
    scene.fog.density = inside ? 0 : 0.0015; moon.intensity = inside ? 0 : 0.6; hemi.intensity = inside ? 0.8 : 0.5;
    hemi.color.set(inside ? 0x8a80b8 : 0x5560b0);
    sky.visible = !inside; if (inside) { scene.background.set(0x06060f); hemi.groundColor.set(0x1c1630); bloom.strength = 0.42; }
    tiltH.uniforms.amount.value = tiltV.uniforms.amount.value = inside ? 0.6 : 1.5; // rooms are small: keep them mostly sharp
    target.set(inside ? sc.w / 2 : P.x, 0, inside ? 100 : P.y); sparkPos.set(P.x, 28, P.y + 4);
  }
  // hero
  const jet = G.cheat.jet, hy = jet ? 24 + Math.sin(t * 4) * 1.5 : G.sit ? 6.5 : 0, big = G.cheat.buff ? 1.7 : 1;
  heroK += (big - heroK) * Math.min(1, dt * 6);
  hero.position.set(P.x, hy, P.y); hero.scale.set((P.flip && P.dir === 'side' ? -1 : 1) * heroK, heroK, heroK);
  updateJet(jet, P, hy, heroK, dt);
  animate(hero, 'varun', (P.moving ? 'walk_' : 'idle_') + P.dir, P.t);
  // spark companion and its shadow-casting light
  v.set(P.x + (P.flip ? 11 : -11) * heroK, 30 * heroK + hy + Math.sin(t * 3) * 2.5, P.y + 5); sparkPos.lerp(v, Math.min(1, dt * 6));
  sparkMesh.position.copy(sparkPos); sparkMesh.quaternion.copy(camera.quaternion); sparkMesh.visible = G.spark.on;
  sparkMesh.material.map.offset.x = (Math.floor(t * 7) % 4) / 4;
  sparkLight.position.copy(sparkPos); sparkLight.intensity = G.spark.on ? (G.got === 6 ? 2600 : 1500) : 0;
  if (!inside) {
    NPCS.forEach((n, i) => { const [anim, at] = G.npcAnim(n); animate(npcMeshes[i], n.id, anim, at); });
    WORLD.WORKERS.forEach((w, i) => { // the crew: two hammering, one pacing the fence
      const m = workerMeshes[i];
      if (w.walk) { const span = w.walk[1] - w.walk[0], u = (t * 14) % (span * 2); m.position.x = w.walk[0] + (u < span ? u : span * 2 - u); m.scale.x = u < span ? 1 : -1; animate(m, w.id, 'walk_side', t); }
      else animate(m, w.id, 'emote', t + i * 0.37);
    });
    const c = G.cat; catMesh.position.set(c.x, 0, c.y); catMesh.scale.x = c.flip ? -1 : 1; setFrame(catMesh, c.moving ? 2 + (Math.floor(t * 8) % 4) : Math.floor(t * 1.2) % 2, 0);
    ORBS.forEach((o, i) => { const m = orbMeshes[i]; m.visible = !o.got; m.position.set(o.x, 9 + Math.sin(t * 3 + o.x) * 2, o.y); m.rotation.y = t * 1.5; });
    for (const k of markers) { k.m.position.y = k.y + Math.sin(t * 2.5 + k.b.seed) * 1.5; k.m.rotation.y = t * 1.2; k.m.material.opacity = k.b.seen ? 0.22 : 1; }
    LAMPS.forEach((l, i) => lampGlobes[i].material.color.set(0xffdca0).multiplyScalar(0.12 + 2.6 * (l.k === undefined ? 0.86 : l.k) * env.lampK));
    for (const bc of beacons) bc.visible = (t % 1.6) < 0.5;
    const ease = Math.min(1, dt * 8);
    for (const f of faders) {
      const b = f.b, hide = P.y < b.y + 14 && P.y > b.y - 150 && Math.abs(P.x - (b.x + b.w / 2)) < b.w / 2 + 40;
      const o = f.mats[0].opacity + ((hide ? 0.1 : 1) - f.mats[0].opacity) * ease; for (const x of f.mats) x.opacity = o; f.m.castShadow = o > 0.5; if (f.m.userData.dg) f.m.userData.dg.visible = o > 0.6;
    }
    for (const m of treeMeshes) { // trees in front of the hero duck out of the way
      const dz = m.position.z - P.y, hide = dz > 6 && dz < 170 && Math.abs(m.position.x - P.x) < 34 + dz * 0.35;
      m.scale.y += ((hide ? 0.03 : 1) - m.scale.y) * ease;
    }
    const fp = flyGeo.attributes.position; G.flies.forEach((f, i) => fp.setXYZ(i, f.x + Math.sin(t * 0.7 + f.ph) * 14, 7 + Math.sin(t * 1.3 + f.ph) * 4, f.y + Math.cos(t * 0.9 + f.ph * 2) * 9)); fp.needsUpdate = true;
    flyGeo.computeBoundingSphere();
  }
  for (const g of spinners) g.rotation.y = t * 1.4;
  for (const f of tickers) f(t);
  // nearest light sources drive a fixed pool of point lights (a fixed count keeps shaders from recompiling)
  const ls = G.lights();
  for (const l of ls) l.d = Math.hypot(l.x - target.x, l.y - target.z) - l.r;
  ls.sort((a, b) => a.d - b.d);
  for (let i = 0; i < POOL; i++) {
    const p = pool[i], l = ls[i];
    if (!l) { p.intensity = 0; continue; }
    p.position.set(l.x, l.h, l.y); p.color.setRGB(l.c[0] / 255, l.c[1] / 255, l.c[2] / 255); p.intensity = l.i * l.r * l.r * (inside ? 0.15 : 0.34 * (0.1 + 0.9 * env.lampK)); p.distance = l.r * 2.6;
  }
  if (G.flash > 0) { const s = sc.flashAt || NPCS.find(n => n.id === 'snap'); flashLight.position.set(s.x, 20, s.y + 6); flashLight.intensity = Math.min(1, G.flash * 1.6) * 9000; } else flashLight.intensity = 0;
  // camera: raised, looking north, eased toward the hero
  if (inside) v.set(sc.w / 2 + (P.x - sc.w / 2) * 0.35, 0, 100 + (P.y - 100) * 0.35); else v.set(P.x, 0, P.y);
  target.lerp(v, Math.min(1, dt * 5));
  const k = inside ? 0.72 : 1;
  const se = sitK * sitK * (3 - 2 * sitK), mix = (a, b) => a + (b - a) * se; // sitting on a bench swings the camera up to the horizon
  camera.position.set(target.x, mix(178 * k, 56), target.z + mix(262 * k, 205)); camera.lookAt(target.x, mix(14, 52), target.z + mix(-30, -330));
  sky.position.set(target.x, 0, target.z);
  moon.position.set(target.x + sunDir.x, sunDir.y, target.z + sunDir.z); moon.target.position.copy(target);
  dust.position.set(target.x, 0, target.z); dust.rotation.y = t * 0.012; dust.position.y = Math.sin(t * 0.2) * 3;
  // keep the hero's row sharp
  v.set(P.x, 12, P.y).project(camera); const fy = v.y * 0.5 + 0.5; tiltH.uniforms.focus.value = tiltV.uniforms.focus.value = fy;
  composer.render();
}
function project(x, h, z) { v.set(x, h, z).project(camera); return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (1 - (v.y * 0.5 + 0.5)) * innerHeight }; }

window.R3D = { frame, project };
