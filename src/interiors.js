// Building interiors: one themed room per project, with procedural furniture, exhibits and indoor lights.
window.INTERIORS = (() => {
  const { mk, shade, text, textW } = SPR, { B, rng } = WORLD;
  const RW = 208, RH = 160, WALL = 40;
  const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  // R(x, y, w, h, colour, emissive?) draws to the sprite and, if emissive, to its glow layer too
  function pair(w, h) {
    const img = mk(w, h), em = mk(w, h), g = img.getContext('2d'), eg = em.getContext('2d');
    const R = (x, y, ww, hh, col, e) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); if (e) { eg.fillStyle = col; eg.fillRect(x, y, ww, hh); } };
    return { img, em, R, eg };
  }
  const WOOD = '#a9825c', WOODD = '#7a5a40', INK = '#2b2740';

  const PROPS = {
    desk(c) {
      const p = pair(30, 24), R = p.R;
      R(9, 0, 12, 9, INK); R(10, 1, 10, 7, c, 1); R(11, 2, 6, 1, shade(c, 0.55), 1); R(11, 4, 8, 1, shade(c, 0.55), 1); R(11, 6, 4, 1, shade(c, 0.55), 1);
      R(14, 9, 2, 2, INK); R(0, 11, 30, 5, WOOD); R(0, 11, 30, 1, shade(WOOD, 1.25)); R(0, 16, 30, 6, WOODD); R(1, 22, 2, 2, INK); R(27, 22, 2, 2, INK);
      R(3, 12, 6, 2, '#f4f1ff'); R(23, 12, 3, 2, '#d6455a');
      return { ...p, depth: 9, lights: [{ dx: 0, dy: 6, r: 42, c: rgb(c), i: 0.55 }] };
    },
    shelf(o, rnd) {
      const p = pair(26, 34), R = p.R;
      R(0, 0, 26, 34, '#5a4034'); R(2, 2, 22, 30, '#3a2a26'); R(0, 0, 26, 1, '#7a5a40');
      for (const by of [11, 21, 32]) { R(2, by, 22, 1, '#5a4034'); for (let x = 3; x < 22; x += 3 + (rnd() * 2 | 0)) { const h = 4 + (rnd() * 4 | 0); R(x, by - h, 2, h, o.cols[rnd() * o.cols.length | 0], o.glow && rnd() < 0.5); } }
      return { ...p, depth: 5, lights: o.glow ? [{ dx: 0, dy: 6, r: 34, c: rgb(o.cols[0]), i: 0.4 }] : [] };
    },
    plant() {
      const p = pair(12, 20), R = p.R;
      R(3, 14, 6, 6, '#c0603f'); R(3, 14, 6, 1, '#e08a66'); R(8, 15, 1, 5, '#8f4530');
      R(4, 6, 4, 8, '#3f8f68'); R(1, 8, 3, 4, '#62b47a'); R(8, 7, 3, 5, '#62b47a'); R(5, 2, 2, 5, '#8fdc93'); R(2, 5, 2, 3, '#8fdc93'); R(9, 4, 2, 3, '#3f8f68');
      return { ...p, depth: 4, lights: [] };
    },
    bed(c) {
      const p = pair(36, 20), R = p.R;
      R(0, 6, 36, 12, '#cfd6ea'); R(1, 4, 34, 10, '#f4f4fa'); R(2, 5, 8, 6, '#bfe8dc'); R(14, 4, 21, 10, c); R(14, 12, 21, 2, shade(c, 0.75));
      R(0, 2, 2, 16, '#9aa3c0'); R(1, 18, 2, 2, INK); R(33, 18, 2, 2, INK);
      return { ...p, depth: 12, lights: [] };
    },
    lamp(c) {
      const p = pair(10, 32), R = p.R;
      R(4, 8, 2, 22, '#3a3550'); R(2, 30, 6, 2, '#3a3550'); R(1, 0, 8, 8, c, 1); R(2, 0, 6, 1, '#ffffff', 1);
      return { ...p, depth: 3, noOcc: true, lights: [{ dx: 0, dy: 3, r: 74, c: rgb(c), i: 0.8, shadow: true }] };
    },
    cabinet(c) {
      const p = pair(18, 32), R = p.R;
      R(0, 0, 18, 32, INK); R(0, 0, 1, 32, '#57506e'); R(2, 2, 14, 4, c, 1); R(3, 8, 12, 10, '#0d1b2a', 1);
      R(4, 14, 2, 3, c, 1); R(7, 11, 2, 6, c, 1); R(10, 9, 2, 8, '#f4f1ff', 1); R(13, 13, 1, 4, c, 1);
      R(1, 20, 16, 4, '#57506e'); R(4, 21, 2, 2, '#ff5a6e', 1); R(8, 21, 2, 2, '#ffe066', 1); R(12, 21, 2, 2, '#6dffb0', 1); R(0, 30, 18, 2, '#15101f');
      return { ...p, depth: 8, lights: [{ dx: 0, dy: 7, r: 48, c: rgb(c), i: 0.6, beat: true }] };
    },
    mirror() {
      const p = pair(22, 38), R = p.R;
      R(0, 0, 22, 36, '#e9dcff'); R(2, 2, 18, 32, '#7de8ff', 1);
      for (let i = 0; i < 26; i++) { R(Math.max(2, 14 - i), 2 + i, 3, 1, '#c9fbff', 1); if (i > 8) R(Math.max(2, 22 - i), 2 + i + 6 > 33 ? 33 : 2 + i + 6, 2, 1, '#e9feff', 1); }
      R(9, 20, 4, 4, '#f4f1ff', 1); R(8, 24, 6, 8, '#4fcfe8', 1); R(4, 36, 14, 2, '#b79bff');
      return { ...p, depth: 5, lights: [{ dx: 0, dy: 6, r: 78, c: [125, 243, 255], i: 0.75, shadow: true }] };
    },
    pedestal(c) {
      const p = pair(12, 22), R = p.R;
      R(2, 10, 8, 12, '#d8d4e6'); R(8, 10, 2, 12, '#a9a4c0'); R(0, 8, 12, 3, '#f4f1ff'); R(0, 10, 12, 1, '#a9a4c0');
      R(5, 0, 2, 7, c, 1); R(4, 1, 4, 5, c, 1); R(3, 2, 6, 3, c, 1); R(5, 2, 2, 2, '#ffffff', 1);
      return { ...p, depth: 6, lights: [{ dx: 0, dy: 4, r: 34, c: rgb(c), i: 0.6, shadow: true }] };
    },
    couch(c) {
      const p = pair(36, 18), R = p.R;
      R(0, 0, 36, 10, shade(c, 0.8)); R(0, 0, 36, 1, shade(c, 1.2)); R(2, 7, 32, 8, c); R(2, 14, 32, 2, shade(c, 0.7)); R(17, 7, 1, 7, shade(c, 0.8));
      R(0, 5, 4, 11, shade(c, 0.65)); R(32, 5, 4, 11, shade(c, 0.65)); R(1, 16, 2, 2, INK); R(33, 16, 2, 2, INK);
      return { ...p, depth: 9, lights: [] };
    },
    tripod() {
      const p = pair(15, 26), R = p.R;
      R(3, 1, 9, 6, INK); R(4, 0, 3, 1, INK); R(12, 2, 2, 4, '#57506e'); R(13, 3, 1, 2, '#8fd0ff', 1); R(4, 2, 2, 1, '#ff5a6e', 1);
      R(6, 7, 3, 4, '#57506e'); R(7, 11, 1, 15, INK); for (let i = 0; i < 14; i++) { R(6 - (i / 3 | 0), 11 + i, 1, 1, INK); R(8 + (i / 3 | 0), 11 + i, 1, 1, INK); }
      return { ...p, depth: 4, noOcc: true, lights: [] };
    },
    rack(o, rnd) {
      const p = pair(32, 26), R = p.R;
      R(0, 2, 32, 1, '#f1d38a'); R(0, 2, 1, 24, '#f1d38a'); R(31, 2, 1, 24, '#f1d38a');
      for (let x = 3; x < 28; x += 5) { const c = o.cols[rnd() * o.cols.length | 0], h = 11 + (rnd() * 6 | 0); R(x + 1, 1, 2, 2, '#f1d38a'); R(x, 3, 4, h, c); R(x + 3, 3, 1, h, shade(c, 0.7)); }
      return { ...p, depth: 4, noOcc: true, lights: [] };
    },
    counter(c) {
      const p = pair(44, 18), R = p.R;
      R(0, 0, 44, 5, '#f4f1ff'); R(0, 4, 44, 1, '#a9a4c0'); R(0, 5, 44, 13, c); R(0, 9, 44, 1, '#f1d38a'); R(42, 5, 2, 13, shade(c, 0.7));
      R(30, -0, 8, 1, INK); R(31, 0, 6, 3, '#b79bff', 1);
      return { ...p, depth: 10, lights: [] };
    }
  };

  // floor pattern, colours, and furniture placement [prop, centre x, base y, arg, exhibit label]
  const BOOKS = { cols: ['#d6455a', '#3aa0ff', '#ffe066', '#6fd3b4', '#f4f1ff'] };
  const THEMES = {
    emr: { pattern: 'check', floor: ['#e9f3f1', '#cfe6e1'], wall: '#bfe0d8', trim: '#5a8f8a',
      items: [['shelf', 28, 52, { cols: ['#6fd3b4', '#f4f4fa', '#ff7d8a'] }], ['desk', 150, 56, '#6dffb0', 'EMR DESK'], ['bed', 44, 112, '#6fd3b4'], ['plant', 192, 54], ['lamp', 178, 126, '#ffe2a8']] },
    accenture: { pattern: 'plain', floor: ['#5a6aa0', '#53639a'], wall: '#39405f', trim: '#b79bff',
      items: [['counter', 104, 64, '#2f3a66', 'FRONT DESK'], ['couch', 38, 58, '#6f7fb0'], ['desk', 40, 122, '#b79bff'], ['desk', 168, 122, '#b79bff'], ['plant', 192, 54], ['lamp', 164, 58, '#e6dcff']] },
    studio: { pattern: 'wood', floor: ['#b98a5e', '#a87a50'], wall: '#e9c9a0', trim: '#c0603f', rug: '#f08a3c',
      items: [['desk', 150, 56, '#ffb46b', 'MY DESK'], ['shelf', 30, 52, BOOKS], ['shelf', 60, 52, BOOKS], ['couch', 36, 122, '#c0603f'], ['plant', 192, 56], ['lamp', 122, 54, '#ffe2a8']] },
    mirror: { pattern: 'plain', floor: ['#4a3f78', '#453a70'], wall: '#2e2650', trim: '#7df3ff', ambient: 'rgb(60,54,112)', fillI: 0.2,
      items: [['mirror', 104, 54, 0, 'THE MIRROR'], ['pedestal', 50, 104, '#7df3ff'], ['pedestal', 158, 104, '#b79bff'], ['plant', 22, 54], ['plant', 188, 54]] },
    iol: { pattern: 'check', floor: ['#e6eef2', '#d2e0e8'], wall: '#cfe2ee', trim: '#3f7fa6',
      items: [['shelf', 30, 52, { cols: ['#8fd0ff', '#dff3ff', '#3f7fa6'], glow: true }], ['shelf', 62, 52, { cols: ['#8fd0ff', '#dff3ff', '#3f7fa6'], glow: true }], ['desk', 160, 56, '#8fd0ff'], ['pedestal', 104, 106, '#8fd0ff', 'LENS'], ['plant', 192, 120]] },
    vytals: { pattern: 'wood', floor: ['#f1d6c2', '#e8c9b2'], wall: '#f6e3d6', trim: '#d2555a', rug: '#ff7d8a',
      items: [['desk', 160, 56, '#ff7d8a', 'VYTALS SITE'], ['shelf', 30, 52, { cols: ['#ff7d8a', '#3aa0ff', '#f4f1ff'] }], ['plant', 192, 124], ['plant', 62, 54], ['lamp', 18, 126, '#ffe2a8']] },
    signbuddy: { pattern: 'wood', floor: ['#e8d28a', '#dcc47a'], wall: '#f4e3a1', trim: '#d99a2b', rug: '#5b6ee1',
      items: [['desk', 50, 56, '#ffe066', 'SIGN BUDDY'], ['couch', 156, 60, '#5b6ee1'], ['plant', 192, 124], ['lamp', 104, 54, '#fff0c8'], ['shelf', 18, 124, BOOKS]] },
    snap: { pattern: 'wood', floor: ['#6b4a35', '#5f4130'], wall: '#3d2a26', trim: '#b23a48', frames: true, ambient: 'rgb(74,30,44)', fill: [255, 70, 70], fillI: 0.45,
      items: [['tripod', 104, 104, 0, 'CAMERA'], ['shelf', 30, 52, { cols: ['#e8d5b0', '#b23a48', '#7a5a3f'] }], ['couch', 160, 60, '#b23a48'], ['plant', 192, 126]] },
    synth: { pattern: 'check', floor: ['#2a2048', '#231a3d'], wall: '#1a1330', trim: '#ff5fd2', ambient: 'rgb(46,40,96)', fillI: 0.12,
      items: [['cabinet', 60, 56, '#ff5fd2'], ['cabinet', 104, 56, '#7df3ff', 'SV-1 SYNTH'], ['cabinet', 148, 56, '#ffe066'], ['couch', 38, 126, '#5a4a9a'], ['plant', 192, 54]] },
    lvcred: { pattern: 'check', floor: ['#2c2a33', '#24222a'], wall: '#16151b', trim: '#f1d38a', ambient: 'rgb(70,66,104)', fillI: 0.5,
      items: [['pedestal', 60, 104, '#f1d38a'], ['pedestal', 104, 104, '#f1d38a', 'LV X CRED'], ['pedestal', 148, 104, '#f1d38a'], ['rack', 44, 56, { cols: ['#f1d38a', '#f4f1ff', '#7a5a3f', '#24222c'] }], ['counter', 160, 60, '#24222c']] }
  };

  // extra furniture that only exists as 3D models (see props3d.js): [prop, centre x, base y]. Size here is just the floor footprint.
  for (const [k, w, h, d] of [['bench', 36, 12, 8], ['screen', 32, 30, 4], ['cooler', 10, 26, 8], ['labtable', 42, 18, 12], ['weights', 30, 20, 8], ['ball', 12, 12, 8], ['easel', 16, 34, 7], ['speaker', 14, 32, 10], ['mannequin', 10, 36, 6], ['darktable', 38, 18, 12], ['console', 34, 24, 10]])
    PROPS[k] = () => ({ ...pair(w, h), depth: d, lights: [] });
  const EXTRA = {
    emr: [['screen', 84, 106], ['bench', 160, 150]],
    accenture: [['cooler', 16, 100], ['bench', 68, 150]],
    studio: [['easel', 178, 120], ['console', 96, 54, 0, 'Console']],
    mirror: [['bench', 40, 150], ['bench', 168, 150]],
    iol: [['labtable', 42, 120], ['cooler', 192, 60]],
    vytals: [['weights', 90, 54], ['ball', 36, 98]],
    signbuddy: [['bench', 160, 150], ['easel', 18, 62]],
    snap: [['darktable', 42, 122]],
    synth: [['speaker', 22, 56], ['speaker', 176, 56]],
    lvcred: [['mannequin', 92, 54], ['mannequin', 114, 54]]
  };
  for (const id in EXTRA) THEMES[id].items.push(...EXTRA[id]);

  function build(b) {
    const t = THEMES[b.id], ground = mk(RW, RH), g = ground.getContext('2d'), rnd = rng(b.seed + 5);
    const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    const line = shade(t.floor[1], 0.85);
    if (t.pattern === 'check') { for (let ty = 0; ty * 16 < RH - WALL; ty++) for (let tx = 0; tx * 16 < RW; tx++) { R(tx * 16, WALL + ty * 16, 16, 16, t.floor[(tx + ty) % 2]); R(tx * 16, WALL + ty * 16 + 15, 16, 1, line); } }
    else if (t.pattern === 'wood') { for (let y = WALL; y < RH; y += 8) { const k = (y / 8) | 0; R(0, y, RW, 8, t.floor[k % 2]); R(0, y + 7, RW, 1, line); for (let x = (k % 3) * 14 + 6; x < RW; x += 42) R(x, y, 1, 7, line); } }
    else { R(0, WALL, RW, RH - WALL, t.floor[0]); for (let i = 0; i < 700; i++) R(rnd() * RW | 0, WALL + (rnd() * (RH - WALL) | 0), 2, 1, t.floor[1]); }
    if (t.rug) { R(64, 92, 80, 44, shade(t.rug, 0.7)); R(66, 94, 76, 40, t.rug); R(70, 98, 68, 32, shade(t.rug, 1.18)); R(72, 100, 64, 28, t.rug); }
    // back wall
    R(0, 0, RW, WALL, t.wall); for (let x = 3; x < RW; x += 8) R(x, 4, 1, WALL - 8, shade(t.wall, 0.92));
    R(0, 0, RW, 4, shade(t.wall, 0.6)); R(0, WALL - 4, RW, 4, t.trim); R(0, WALL - 4, RW, 1, shade(t.trim, 1.3)); R(0, WALL, RW, 2, shade(t.floor[1], 0.7));
    if (t.frames) for (let x = 126; x < 196; x += 17) { R(x, 9, 13, 15, '#e8d5b0'); R(x + 2, 11, 9, 9, ['#7a5a3f', '#5a6a8a', '#b58a64', '#3d3a45'][rnd() * 4 | 0]); R(x + 4, 14, 3, 6, '#2b2740'); }
    // side walls, exit mat
    R(0, 0, 4, RH, '#15101f'); R(RW - 4, 0, 4, RH, '#15101f'); R(0, RH - 3, RW, 3, '#15101f');
    R(RW / 2 - 13, RH - 12, 26, 9, shade(t.trim, 0.6)); R(RW / 2 - 11, RH - 10, 22, 5, t.trim); R(RW / 2 - 11, RH - 3, 22, 3, t.floor[0]);

    const statics = [], coll = [], occ = [], interact = [], lights = [];
    let flashAt = null;
    { // neon sign on the back wall
      const tw = textW(b.sign), s = pair(tw + 8, 11);
      s.R(0, 0, tw + 8, 11, '#15101f'); s.R(0, 0, tw + 8, 11, '#15101f', 1); text(s.img.getContext('2d'), b.sign, 4, 3, b.neon); text(s.eg, b.sign, 4, 3, b.neon);
      statics.push({ img: s.img, em: s.em, x: ((RW - tw - 8) / 2) | 0, y: 7, by: WALL - 2 });
      lights.push({ x: RW / 2, y: WALL + 14, r: 96, c: rgb(b.neon), i: 0.5, shadow: false });
    }
    lights.push({ x: RW / 2, y: RH / 2 + 22, r: 130, c: t.fill || [255, 214, 170], i: t.fillI === undefined ? 0.5 : t.fillI, shadow: true });
    for (const [name, x, y, arg, exhibit] of t.items) {
      const p = PROPS[name](arg, rnd), w = p.img.width, h = p.img.height;
      statics.push({ img: p.img, em: p.em, x: x - (w >> 1), y: y - h, by: y, kind: name, arg });
      const r = { x: x - (w >> 1) + 1, y: y - p.depth, w: w - 2, h: p.depth };
      coll.push(r); if (!p.noOcc) occ.push(r);
      for (const l of p.lights) lights.push({ shadow: false, ...l, x: x + l.dx, y: y + l.dy });
      if (exhibit) interact.push(name === 'console' ? { x, y: y + 4, r: 18, label: exhibit, kind: 'console' } : { x, y: y + 4, r: 20, label: exhibit, kind: 'building', b });
      if (name === 'tripod') flashAt = { x, y: y - 12 };
    }
    return { w: RW, h: RH, ground, statics, coll, occ, interact, npcs: [], orbs: [], lights, flashAt, b, theme: t,
      ambient: t.ambient || 'rgb(92,84,124)', bounds: { x0: 9, x1: RW - 9, y0: WALL + 6, y1: RH - 2 } };
  }

  const rooms = {};
  B.forEach(b => { rooms[b.id] = build(b); });
  return rooms;
})();
