// Procedural pixel-art sprites: every character, the cat, the spark companion and the 3x5 pixel font
// are drawn in code, then packed into sprite sheets (see sprites.html to view / export them).
window.SPR = (() => {
  const FW = 16, FH = 24;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  // f < 1 darkens with a cool (blue-violet) shift, f > 1 lightens toward white
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    if (f <= 1) { r = r * f * 0.94; g = g * f * 0.96; b = Math.min(255, b * f + (1 - f) * 40); }
    else { const k = f - 1; r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }

  // ---------- 3x5 pixel font ----------
  const GLYPHS = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
    F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
    K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
    P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
    Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
    4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111',
    9: '111101111001110', '-': '000000111000000', '.': '000000000000010', '+': '000010111010000', '!': '010010010000010',
    '/': '001001010100100', ':': '000010000010000'
  };
  const textW = s => s.length * 4 - 1;
  function text(ctx, s, x, y, col) {
    ctx.fillStyle = col;
    s = String(s).toUpperCase();
    for (let i = 0; i < s.length; i++) {
      const gl = GLYPHS[s[i]];
      if (gl) for (let k = 0; k < 15; k++) if (gl[k] === '1') ctx.fillRect(x + i * 4 + (k % 3), y + (k / 3 | 0), 1, 1);
    }
  }

  // ---------- humanoid generator ----------
  function drawHuman(g, s, dir, p) {
    const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    const b = p.bob | 0;
    const skin = s.robot ? s.metal : s.skin, skinD = shade(skin, 0.8);
    const top = s.top, topD = shade(top, 0.72), pants = s.pants, pantsD = shade(pants, 0.72);
    const shoe = s.shoe || '#ecebf5', ink = '#1b1626';
    const legs = p.legs | 0;

    const arm = (side, pose) => {
      const x0 = side < 0 ? 3 : 11;
      if (pose === 'up') {
        const xo = side < 0 ? 1 : 13;
        R(x0, 12 + b, 2, 1, top); R(xo, 8 + b, 2, 5, top); R(xo, 6 + b - (p.wig ? 1 : 0), 2, 2, skin);
      } else if (pose === 'out') {
        if (side < 0) { R(2, 12 + b, 3, 2, top); R(1, 12 + b, 1, 2, skin); }
        else { R(11, 12 + b, 3, 2, top); R(14, 12 + b, 1, 2, skin); }
      } else if (pose === 'hold') {
        R(x0, 12 + b, 2, 3, top); R(side < 0 ? 5 : 9, 14 + b, 2, 2, skin);
      } else {
        const len = pose === 'fwd' ? 3 : pose === 'back' ? 5 : 4;
        R(x0, 12 + b, 2, len, side < 0 ? top : topD); R(x0, 12 + b + len, 2, 1, skin);
      }
    };

    if (dir === 'side') {
      // legs
      if (legs === 1) { R(5, 18, 2, 3, pantsD); R(4, 21, 3, 1, shoe); R(8, 18, 3, 4, pants); R(8, 22, 4, 1, shoe); }
      else if (legs === 3) { R(5, 18, 3, 4, pantsD); R(5, 22, 3, 1, shoe); R(9, 18, 2, 3, pants); R(9, 21, 3, 1, shoe); }
      else { R(6, 18, 4, 4, pants); R(6, 18, 1, 4, pantsD); R(6, 22, 5, 1, shoe); }
      // torso + arm
      R(6, 11 + b, 5, 7 - b, top); R(6, 11 + b, 1, 7 - b, topD);
      if (s.inner) R(10, 11 + b, 1, 7 - b, s.inner);
      const ax = 7 + (p.armL === 'fwd' ? 2 : p.armL === 'back' ? -2 : 0);
      R(ax, 12 + b, 2, 4, topD); R(ax, 16 + b, 2, 1, skin);
      // head
      R(4, 3 + b, 9, 8, skin); R(4, 10 + b, 9, 1, skinD);
      if (s.robot) {
        R(8, 6 + b, 5, 2, '#7df3ff'); R(3, 5 + b, 2, 4, '#ff5fd2'); R(8, 1 + b, 1, 2, skinD); R(8, 0 + b, 1, 1, '#ff5fd2');
      } else {
        R(13, 7 + b, 1, 1, skin);
        hair('side');
        R(10, 6 + b, 1, 2, ink);
        if (s.glasses) { R(9, 6 + b, 3, 2, '#d6ecff'); R(10, 7 + b, 1, 1, ink); R(9, 5 + b, 3, 1, ink); R(6, 6 + b, 3, 1, ink); }
        if (s.mask) R(9, 8 + b, 4, 3, '#dff3ff');
        hat('side');
      }
      return;
    }

    // ---- down / up ----
    if (legs === 1) { R(5, 18, 3, 4, pants); R(5, 22, 3, 1, shoe); R(8, 18, 3, 3, pantsD); R(8, 21, 3, 1, shoe); }
    else if (legs === 3) { R(5, 18, 3, 3, pantsD); R(5, 21, 3, 1, shoe); R(8, 18, 3, 4, pants); R(8, 22, 3, 1, shoe); }
    else { R(5, 18, 6, 4, pants); R(7, 18, 1, 4, pantsD); R(10, 18, 1, 4, pantsD); R(5, 22, 3, 1, shoe); R(8, 22, 3, 1, shoe); }

    R(5, 11 + b, 6, 7 - b, top); R(10, 11 + b, 1, 7 - b, topD); R(5, 17, 6, 1, topD);
    if (dir === 'down') {
      if (s.inner) R(7, 11 + b, 2, 7 - b, s.inner);
      if (s.tie) R(7, 12 + b, 2, 4, s.tie);
      if (s.chain) { R(6, 12 + b, 1, 1, s.chain); R(7, 13 + b, 2, 1, s.chain); R(9, 12 + b, 1, 1, s.chain); }
      if (s.steth) { R(6, 11 + b, 1, 3, '#2b2740'); R(9, 11 + b, 1, 3, '#2b2740'); R(7, 14 + b, 2, 1, '#2b2740'); R(8, 15 + b, 1, 1, '#cfd6ea'); }
      if (s.hood) { R(6, 11 + b, 1, 2, shade(top, 1.35)); R(9, 11 + b, 1, 2, shade(top, 1.35)); }
    }
    const aL = p.armL || 'down', aR = p.armR || 'down';
    if (aL !== 'up') arm(-1, aL);
    if (aR !== 'up') arm(1, aR);

    // head
    R(3, 3 + b, 10, 8, skin); R(3, 10 + b, 10, 1, skinD);
    if (s.robot) {
      R(2, 5 + b, 1, 4, '#ff5fd2'); R(13, 5 + b, 1, 4, '#ff5fd2'); R(8, 1 + b, 1, 2, skinD); R(8, 0 + b, 1, 1, '#ff5fd2');
      R(3, 3 + b, 10, 1, shade(skin, 1.3));
      if (dir === 'down') { R(4, 6 + b, 8, 2, '#0d1b2a'); R(5, 6 + b, 6, 2, '#7df3ff'); R(6, 9 + b, 4, 1, skinD); }
      else { R(5, 5 + b, 6, 1, skinD); R(5, 7 + b, 6, 1, skinD); }
    } else {
      hair(dir);
      if (dir === 'down') {
        if (s.glasses) {
          R(4, 6 + b, 3, 2, '#d6ecff'); R(9, 6 + b, 3, 2, '#d6ecff');
          R(4, 5 + b, 3, 1, ink); R(9, 5 + b, 3, 1, ink); R(7, 6 + b, 2, 1, ink);
          R(5, 7 + b, 1, 1, ink); R(10, 7 + b, 1, 1, ink);
        } else { R(5, 6 + b, 1, 2, ink); R(10, 6 + b, 1, 2, ink); }
        if (s.mask) R(4, 8 + b, 8, 3, '#dff3ff'); else R(7, 9 + b, 2, 1, skinD);
        if (s.band) R(3, 4 + b, 10, 1, s.band);
        if (s.phones) { R(2, 4 + b, 1, 4, '#2b2740'); R(13, 4 + b, 1, 4, '#2b2740'); }
      }
      hat(dir);
    }
    if (aL === 'up') arm(-1, 'up');
    if (aR === 'up') arm(1, 'up');
    if (p.extra) p.extra(R, b);

    function hair(d) {
      const h = s.hair, st = s.hairStyle;
      if (!h || st === 'bald') return;
      const hl = shade(h, 1.3);
      if (d === 'down') {
        R(3, 2 + b, 10, 3, h); R(3, 5 + b, 1, 2, h); R(12, 5 + b, 1, 2, h); R(5, 2 + b, 2, 1, hl);
        if (st === 'curly') { R(3, 1 + b, 10, 1, h); R(2, 2 + b, 1, 5, h); R(13, 2 + b, 1, 5, h); R(4, b, 3, 1, h); R(8, b, 4, 1, h); R(9, 1 + b, 2, 1, hl); R(11, 3 + b, 1, 1, hl); R(3, 3 + b, 1, 1, hl); }
        if (st === 'bun') R(6, b, 4, 2, h);
        if (st === 'long') { R(2, 4 + b, 2, 9, h); R(12, 4 + b, 2, 9, h); }
        if (st === 'bob') { R(2, 4 + b, 2, 6, h); R(12, 4 + b, 2, 6, h); }
      } else if (d === 'up') {
        R(3, 2 + b, 10, 8, h); R(5, 3 + b, 2, 1, hl);
        if (st === 'curly') { R(3, 1 + b, 10, 1, h); R(2, 2 + b, 1, 7, h); R(13, 2 + b, 1, 7, h); R(4, b, 3, 1, h); R(8, b, 4, 1, h); R(9, 5 + b, 2, 1, hl); }
        if (st === 'bun') R(6, b, 4, 2, h);
        if (st === 'long') R(2, 4 + b, 12, 9, h);
        if (st === 'bob') R(2, 4 + b, 12, 6, h);
      } else {
        R(3, 2 + b, 10, 3, h); R(3, 5 + b, 3, 4, h); R(6, 2 + b, 2, 1, hl);
        if (st === 'curly') { R(3, 1 + b, 10, 1, h); R(2, 2 + b, 1, 6, h); R(4, b, 7, 1, h); R(12, 4 + b, 1, 1, h); }
        if (st === 'bun') R(2, 1 + b, 3, 3, h);
        if (st === 'long') R(2, 4 + b, 4, 9, h);
        if (st === 'bob') R(2, 4 + b, 4, 6, h);
      }
    }
    function hat(d) {
      if (!s.hat) return;
      const c = s.hat.color, cd = shade(c, 0.7);
      R(3, 1 + b, 10, d === 'up' ? 5 : 4, c); R(3, (d === 'up' ? 5 : 4) + b, 10, 1, cd); R(4, 1 + b, 3, 1, shade(c, 1.3));
      if (s.hat.type === 'beret') { R(2, 2 + b, 1, 2, c); R(13, 2 + b, 1, 2, c); R(10, b, 2, 1, cd); }
    }
  }

  // ---------- cast ----------
  const P = (armL, armR, bob, extra, wig) => ({ armL, armR, bob, extra, wig });
  const CAST = {
    varun: { name: 'Varun', role: 'Player · Product Designer', skin: '#b97a56', hair: '#2a1c22', hairStyle: 'curly', glasses: true, top: '#f08a3c', hood: true, pants: '#3a3f5c',
      emote: [P('down', 'up', 0), P('down', 'up', 0, null, 1), P('down', 'up', 1), P('down', 'up', 0, null, 1)], emoteName: 'wave' },
    ada: { name: 'Dr. Ada', role: 'Generative EMR clinic', skin: '#e0a67e', hair: '#3b2a2a', hairStyle: 'bun', top: '#f4f4fa', inner: '#6fd3b4', steth: true, pants: '#5a6a8a',
      emote: [0, 1, 0, 1].map(i => P('hold', i ? 'hold' : 'fwd', i, (R, b) => { R(6, 13 + b, 4, 3, '#e9fff6'); R(7, 14 + b, 2 + i, 1, '#6fd3b4'); })), emoteName: 'chart notes' },
    client: { name: 'The Client', role: 'Employee health benefits tower', skin: '#c98f6b', hair: '#1f1a22', hairStyle: 'short', top: '#2f3a66', inner: '#f4f4fa', tie: '#d6455a', pants: '#232a4a', shoe: '#15141c',
      emote: [0, 0, 1, 0].map((i, k) => P('down', 'hold', i, (R, b) => { R(9, 12 + b, 2, 3, '#15141c'); R(9, 12 + b, 2, 2, k % 2 ? '#b79bff' : '#e6dcff'); })), emoteName: 'check phone' },
    mira: { name: 'Mira', role: 'Smart Health Mirror reflection', skin: '#c9fbff', hair: '#4fcfe8', hairStyle: 'long', top: '#7de8ff', pants: '#58c4e8', shoe: '#c9fbff', holo: true,
      emote: [P('up', 'down', 0), P('up', 'down', 0, null, 1), P('up', 'down', 1), P('up', 'down', 0, null, 1)], emoteName: 'mirror wave' },
    lens: { name: 'Dr. Lens', role: 'Easy IOL surgical lab', skin: '#a86f4f', hair: '#2a1c22', hairStyle: 'short', hat: { type: 'cap', color: '#4fb39a' }, mask: true, top: '#5cc7ab', pants: '#4aa88f',
      emote: [0, 1, 2, 1].map(i => P('down', 'up', 0, (R, b) => { R(13, 3 + b, 2, 2, i === 2 ? '#ffffff' : '#8fd0ff'); if (i) { R(12, 2 + b, 1, 1, '#dff3ff'); R(15, 5 + b, 1, 1, '#dff3ff'); } })), emoteName: 'inspect lens' },
    buddy: { name: 'Buddy', role: 'Sign Buddy interpreter', skin: '#f0c09a', hair: '#8a4b2a', hairStyle: 'bob', top: '#ffd447', pants: '#5b6ee1',
      emote: [P('up', 'out', 0), P('hold', 'hold', 1), P('out', 'up', 0), P('up', 'up', 0)], emoteName: 'sign language' },
    snap: { name: 'Snap', role: 'Vintage Snap photographer', skin: '#d19a72', hair: '#5a3a2a', hairStyle: 'short', hat: { type: 'beret', color: '#b23a48' }, top: '#7a5a3f', inner: '#e8d5b0', pants: '#3d3a45',
      emote: [0, 1, 2, 1].map(i => P('hold', 'hold', 0, (R, b) => {
        const y = i ? 6 : 13; R(5, y + b, 6, 3, '#2b2740'); R(7, y + b, 2, 2, i === 2 ? '#ffffff' : '#8fd0ff'); R(5, y - 1 + b, 2, 1, '#2b2740');
        if (i === 2) { R(8, y - 2 + b, 1, 1, '#fff'); R(4, y + 1 + b, 1, 1, '#fff'); R(11, y + 1 + b, 1, 1, '#fff'); }
      })), emoteName: 'camera flash' },
    sv1: { name: 'SV-1', role: 'Synthwave arcade robot', robot: true, metal: '#aeb6d6', top: '#5a4a9a', pants: '#3a3270', shoe: '#ff5fd2',
      emote: [P('up', 'up', 0), P('up', 'out', 1), P('up', 'up', 0), P('out', 'up', 1)], emoteName: 'dance' },
    louis: { name: 'Louis', role: 'LV X Cred concierge', skin: '#8d5a3c', hair: '#111016', hairStyle: 'short', top: '#24222c', chain: '#f1d38a', pants: '#1a1920', shoe: '#f1d38a',
      emote: [P('hold', 'hold', 0), P('hold', 'hold', 1), P('hold', 'hold', 2), P('hold', 'hold', 1)], emoteName: 'bow' },
    vee: { name: 'Vee', role: 'Vytals health coach', skin: '#e3b08a', hair: '#2a2230', hairStyle: 'bun', band: '#ff7d8a', top: '#3aa0ff', pants: '#2a3a6a',
      emote: [P('up', 'up', 0), P('out', 'out', 0), P('up', 'up', 0), P('down', 'down', 1)], emoteName: 'stretch' }
  };
  // construction crew: hard hats, hi-vis vests, and a hammering animation
  const hammer = up => (R, b) => { if (up) { R(13, 2 + b, 2, 4, '#7a5a40'); R(12, 1 + b, 4, 2, '#9aa3c0'); } else { R(9, 12 + b, 2, 4, '#7a5a40'); R(8, 16 + b, 4, 2, '#9aa3c0'); } };
  const crew = (name, skin, vest, pants) => ({ name, role: 'Construction crew · fitness app site', skin, hair: '#2a1c22', hairStyle: 'short', hat: { type: 'cap', color: '#ffd23a' }, top: vest, inner: '#f4f1ff', pants,
    emote: [P('down', 'up', 0, hammer(true)), P('down', 'hold', 1, hammer(false)), P('down', 'up', 0, hammer(true)), P('down', 'hold', 1, hammer(false))], emoteName: 'hammer' });
  CAST.builder1 = crew('Builder', '#c98f6b', '#ff8a3c', '#3a3f5c');
  CAST.builder2 = crew('Builder', '#8d5a3c', '#ffe066', '#4a4458');
  CAST.builder3 = crew('Builder', '#e0a67e', '#ff8a3c', '#2f3a66');

  function outline(c) {
    const g = c.getContext('2d'), w = c.width, h = c.height, im = g.getImageData(0, 0, w, h), d = im.data;
    const a = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) a[i] = d[i * 4 + 3] > 0 ? 1 : 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (a[i]) continue;
      if ((x > 0 && a[i - 1]) || (x < w - 1 && a[i + 1]) || (y > 0 && a[i - w]) || (y < h - 1 && a[i + w])) {
        d[i * 4] = 21; d[i * 4 + 1] = 16; d[i * 4 + 2] = 31; d[i * 4 + 3] = 255;
      }
    }
    g.putImageData(im, 0, 0);
  }

  // sheet: 6 cols x 4 rows. rows = down, side, up, emote. cols = idle0, idle1, walk0..3
  const ANIMS = {
    idle_down: { row: 0, start: 0, n: 2, fps: 2 }, walk_down: { row: 0, start: 2, n: 4, fps: 8 },
    idle_side: { row: 1, start: 0, n: 2, fps: 2 }, walk_side: { row: 1, start: 2, n: 4, fps: 8 },
    idle_up: { row: 2, start: 0, n: 2, fps: 2 }, walk_up: { row: 2, start: 2, n: 4, fps: 8 },
    emote: { row: 3, start: 0, n: 4, fps: 5 }
  };
  const WALK = [{ legs: 1, bob: 0, armL: 'fwd', armR: 'back' }, { legs: 0, bob: 1 }, { legs: 3, bob: 0, armL: 'back', armR: 'fwd' }, { legs: 0, bob: 1 }];
  const chars = {};
  for (const id in CAST) {
    const s = CAST[id], sheet = mk(FW * 6, FH * 4), g = sheet.getContext('2d');
    ['down', 'side', 'up'].forEach((dir, row) => {
      [{ bob: 0 }, { bob: 1 }, ...WALK].forEach((p, col) => {
        g.save(); g.translate(col * FW, row * FH); drawHuman(g, s, dir, p); g.restore();
      });
    });
    s.emote.forEach((p, col) => { g.save(); g.translate(col * FW, 3 * FH); drawHuman(g, s, 'down', p); g.restore(); });
    outline(sheet);
    chars[id] = { id, spec: s, sheet, anims: ANIMS };
  }

  // ---------- cat (16x12, faces right): idle0, idle1, walk0..3 ----------
  const cat = mk(16 * 6, 12);
  {
    const g = cat.getContext('2d'), body = '#57506e', dark = '#3d3852', sock = '#ecebf5';
    for (let f = 0; f < 6; f++) {
      const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(f * 16 + x, y, w, h); };
      const walk = f >= 2, k = f - 2;
      R(4, 5, 8, 4, body); R(4, 8, 8, 1, dark);
      R(10, 2, 5, 4, body); R(10, 1, 1, 1, body); R(14, 1, 1, 1, body); R(12, 4, 1, 1, '#9dff8a'); R(14, 4, 1, 1, '#9dff8a');
      if (f === 1 || k === 1 || k === 3) { R(2, 3, 1, 3, body); R(3, 5, 1, 1, body); } else { R(3, 2, 1, 4, body); }
      const lift = walk ? [[1, 0, 0, 1], [0, 0, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0]][k] : [0, 0, 0, 0];
      [5, 7, 9, 11].forEach((x, i) => { R(x, 9, 1, lift[i] ? 1 : 2, dark); if (!lift[i]) R(x, 10, 1, 1, sock); });
    }
    outline(cat);
  }

  // ---------- spark companion (11x11 x 4 frames) ----------
  const spark = mk(44, 11);
  {
    const g = spark.getContext('2d');
    [2, 3, 5, 3].forEach((len, f) => {
      const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(f * 11 + x, y, w, h); };
      R(5, 5 - len, 1, len * 2 + 1, '#e9dcff'); R(5 - len, 5, len * 2 + 1, 1, '#e9dcff');
      R(4, 4, 3, 3, '#ffffff');
      if (len > 2) { R(3, 3, 1, 1, '#b79bff'); R(7, 3, 1, 1, '#b79bff'); R(3, 7, 1, 1, '#b79bff'); R(7, 7, 1, 1, '#b79bff'); }
    });
  }

  function frame(ctx, id, anim, t, x, y, flip) {
    const ch = chars[id], a = ch.anims[anim], i = a.start + (Math.floor(t * a.fps) % a.n);
    if (flip) { ctx.save(); ctx.translate(x + FW, y); ctx.scale(-1, 1); ctx.drawImage(ch.sheet, i * FW, a.row * FH, FW, FH, 0, 0, FW, FH); ctx.restore(); }
    else ctx.drawImage(ch.sheet, i * FW, a.row * FH, FW, FH, x, y, FW, FH);
  }

  return { FW, FH, mk, shade, text, textW, chars, cat, spark, frame, CAST, ANIMS };
})();
