// World layout, portfolio content, and procedural environment art.
window.WORLD = (() => {
  const { mk, shade, text, textW } = SPR;
  const T = 16, MAPW = 60 * T, MAPH = 45 * T;
  const SITE = 'https://varunkhandelwal.in';
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // ---------- buildings (tile units) + the portfolio content each one holds ----------
  const B = [
    { id: 'emr', tx: 6, ty: 12, tw: 9, th: 7, wall: '#e6e2ef', roof: '#5a8f8a', neon: '#6dffb0', sign: 'EMR +', awn: '#5a8f8a', npc: 'ada',
      card: { title: 'Creating a Generative EMR', tags: ['GENERATIVE AI', 'IN DEVELOPMENT • 2025'], desc: 'An intelligent EMR that adapts to the way doctors work, making documentation faster and more personalized.', url: SITE + '/emr' } },
    { id: 'accenture', tx: 17, ty: 8, tw: 8, th: 11, roofH: 14, wall: '#6f7fb0', roof: '#39405f', neon: '#b79bff', sign: 'BENEFITS', awn: '#39405f', npc: 'client', beacon: true,
      card: { title: "Accenture's employee health benefit program", tags: ['LIVE • 2026'], desc: 'Accenture had already walked away. We redesigned the product around the biggest breakdowns in the booking journey, improved conversion, and gave the client a reason to come back.', url: SITE + '/accenture' } },
    { id: 'studio', tx: 27, ty: 2, tw: 9, th: 6, wall: '#e9c9a0', roof: '#c0603f', neon: '#ffb46b', sign: 'STUDIO', awn: '#c0603f', npc: null, card: { about: true } },
    { id: 'mirror', tx: 37, ty: 12, tw: 8, th: 7, wall: '#cdbfe8', roof: '#7a62b8', neon: '#7df3ff', sign: 'MIRROR', awn: '#7a62b8', npc: 'mira',
      card: { title: 'Smart Health Mirror', tags: ['SPATIAL DESIGN', 'CONCEPT • 2025'], desc: 'Reimagining how users interact with their personal health data.', url: SITE + '/smart-mirror' } },
    { id: 'iol', tx: 47, ty: 12, tw: 9, th: 7, wall: '#d9e6ea', roof: '#3f7fa6', neon: '#8fd0ff', sign: 'EASY IOL', awn: '#3f7fa6', npc: 'lens',
      card: { title: 'Easy IOL', tags: ['INVENTORY MANAGEMENT PLATFORM', 'LIVE • 2024'], desc: 'How healthcare professionals manage intraocular lens inventory in high-stakes surgical environments.', url: 'https://butternut-ball-23a.notion.site/Easy-IOL-2226b6db3e39805abc6fee310280fdb8' } },
    { id: 'vytals', tx: 5, ty: 30, tw: 8, th: 7, wall: '#f0d9c8', roof: '#d2555a', neon: '#ff7d8a', sign: 'VYTALS', awn: '#d2555a', npc: 'vee',
      card: { title: 'Designing Beyond Vytals for Bajaj Finserv Health', tags: ['WEBSITE DESIGN', 'LIVE • 2025'], desc: '', url: 'https://vytals.bajajfinservhealth.in/', cta: 'Visit the live site' } },
    { id: 'signbuddy', tx: 15, ty: 31, tw: 7, th: 6, wall: '#f4e3a1', roof: '#d99a2b', neon: '#ffe066', sign: 'SIGN BUDDY', awn: '#d99a2b', npc: 'buddy',
      card: { title: 'Sign Buddy', tags: ['INCLUSIVE DESIGN & RESEARCH', 'CONCEPT • 2025'], desc: '', url: 'https://butternut-ball-23a.notion.site/Sign-Buddy-2db6b6db3e39805c8fc2def97eebaa6e' } },
    { id: 'snap', tx: 24, ty: 32, tw: 5, th: 5, wall: '#b58a64', roof: '#6b4a35', neon: '#ffd9a0', sign: 'SNAP', awn: '#b23a48', npc: 'snap',
      card: { title: 'Vintage Snap', tags: ['VIBE CODING', 'LIVE • 2025'], desc: '', url: 'https://vintage-snap.onrender.com/', cta: 'Open Vintage Snap' } },
    { id: 'synth', tx: 35, ty: 30, tw: 9, th: 7, wall: '#3b2d5c', roof: '#231a3d', neon: '#ff5fd2', sign: 'SYNTHWAVE', awn: '#ff5fd2', npc: 'sv1',
      card: { title: 'Synthwave SV-1', tags: ['VIBE CODING', 'MODEL SV-1 • 120 BPM'], desc: "A vibecoded platform that lets you create music in 3 unique ways.", url: SITE, cta: 'Try it on the site' } },
    { id: 'lvcred', tx: 46, ty: 30, tw: 8, th: 7, wall: '#2c2a33', roof: '#16151b', neon: '#f1d38a', sign: 'LV X CRED', awn: '#f1d38a', npc: 'louis',
      card: { title: 'LV X Cred', tags: ['VISUAL DESIGN', 'CONCEPT • 2023'], desc: 'What if Cred took over LV and redesigned their entire app according to their style?', url: SITE + '/lvxcred' } }
  ];
  B.forEach((b, i) => { b.x = b.tx * T; b.y = b.ty * T; b.w = b.tw * T; b.h = b.th * T; b.seed = 100 + i * 7; b.roofH = b.roofH || Math.round(b.h * 0.36); b.doorX = b.x + (b.w >> 1); b.base = b.y + b.h; });

  // tier (main / side / play), chapter number, and what the resident says when you talk to them.
  // These lines are placeholders written for the game: replace them with your own words.
  const STORY = {
    emr: ['main', 'I', "I used to stay back an hour every day just to finish my notes. Come in, I'll show you what changed."],
    accenture: ['main', 'II', "Honestly, we'd given up on this product once. The booking flow is the reason we came back."],
    mirror: ['main', 'III', "It's your health data, just somewhere you already look every morning."],
    iol: ['main', 'IV', "Ask me how many lenses we lost track of before this. Actually, don't."],
    vytals: ['side', '', "The site's live. Go have a look, then come back and stretch with me."],
    signbuddy: ['side', '', "Hi! I'm still learning to sign too. That's kind of the point."],
    snap: ['side', '', "Stand there. Don't smile too much. Okay, got it."],
    synth: ['play', '', "SYSTEM ONLINE. Music is on. Go inside and press a few keys."],
    lvcred: ['play', '', "Somebody asked what LV would look like if Cred designed it. So Varun tried."],
    studio: ['about', '', '']
  };
  B.forEach(b => { const s = STORY[b.id]; b.tier = s[0]; b.chapter = s[1]; b.card.quote = s[2]; b.seen = false; });

  // ---------- paths (tile rects) ----------
  const PATHS = [[3, 20, 54, 3], [3, 38, 54, 3], [30, 8, 3, 31], [3, 26, 54, 1]];
  const PLAZA = [26, 17, 11, 8];
  B.forEach(b => { if (b.id !== 'studio') PATHS.push([b.tx + b.tw / 2 - 1, b.ty + b.th, 2, 1]); });

  // ---------- experience trail, props, skills ----------
  const POSTS = [
    { tx: 8, year: '2021', title: 'Freelance Designer', org: 'SELF EMPLOYED', when: '2021 – PRESENT' },
    { tx: 17, year: '2021', title: "Bachelor's in Design", org: 'MIT INSTITUTE OF DESIGN', when: '2021 – 25' },
    { tx: 25, year: '2024', title: 'UX Design Intern', org: 'VARPAS CONCEPTS', when: '2024' },
    { tx: 39, year: '2025', title: 'Design Intern', org: 'BAJAJ FINSERV HEALTH', when: '2025' },
    { tx: 49, year: '2025', title: 'Associate Product Designer', org: 'BAJAJ FINSERV HEALTH', when: '2025' }
  ].map(p => ({ ...p, x: p.tx * T + 8, y: 26 * T - 3 }));
  const ORBS = [
    { name: 'Figma', tx: 15.5, ty: 15.5, c: [255, 122, 89] }, { name: 'Web Design', tx: 12, ty: 28.2, c: [125, 243, 255] },
    { name: 'Product Thinking', tx: 57, ty: 25, c: [183, 155, 255] }, { name: 'Illustration', tx: 3, ty: 43, c: [255, 224, 102] },
    { name: 'Graphic design', tx: 56.5, ty: 7, c: [255, 95, 210] }, { name: 'Vibe Coding', tx: 22, ty: 5, c: [109, 255, 176] }
  ].map(o => ({ ...o, x: o.tx * T, y: o.ty * T, got: false }));
  const KIOSK = { x: 27.5 * T, y: 19 * T + 4 }, MAILBOX = { x: 35.5 * T, y: 19 * T + 4 }, HELLO = { x: 31.5 * T, y: 18 * T + 6 };
  const LAMPS = [[5, 23.4], [15, 23.4], [25, 23.4], [37.5, 23.4], [47, 23.4], [57, 23.4], [4, 41.4], [14, 41.4], [23, 41.4], [34, 41.4], [45, 41.4], [56, 41.4],
    [29.4, 12], [33.6, 15], [29.4, 31], [33.6, 34], [26.4, 17.4], [36.6, 25.2]].map(([x, y], i) => ({ x: x * T, y: y * T, ph: i * 1.7 }));

  // ---------- art ----------
  function makeBuilding(b) {
    const w = b.w, h = b.h, c = mk(w, h), e = mk(w, h), g = c.getContext('2d'), eg = e.getContext('2d');
    const R = (x, y, ww, hh, col, ctx = g) => { ctx.fillStyle = col; ctx.fillRect(x, y, ww, hh); };
    const rnd = rng(b.seed), rh = b.roofH, frame = shade(b.wall, 0.55), warm = '#ffd98a';
    R(3, rh, w - 6, h - rh, b.wall);
    for (let i = 0; i < (w * h) / 80; i++) R(5 + (rnd() * (w - 14) | 0), rh + 3 + (rnd() * (h - rh - 8) | 0), 3 + (rnd() * 3 | 0), 1, shade(b.wall, 0.88));
    R(3, rh, 1, h - rh, shade(b.wall, 1.25)); R(w - 5, rh, 2, h - rh, shade(b.wall, 0.75)); R(3, h - 3, w - 6, 3, shade(b.wall, 0.6));
    // roof
    R(0, 0, w, rh, b.roof);
    for (let y = 5; y < rh - 3; y += 5) { R(0, y, w, 1, shade(b.roof, 0.74)); for (let x = ((y / 5 | 0) % 2) * 4; x < w; x += 8) R(x, y - 4, 1, 4, shade(b.roof, 0.85)); }
    R(0, 0, w, 2, shade(b.roof, 1.35)); R(0, rh - 3, w, 3, shade(b.roof, 0.6)); R(3, rh, w - 6, 2, shade(b.wall, 0.62));
    if (b.beacon) { R(w / 2 - 1, 0, 2, 8, '#2b2740'); }
    // upper windows
    const n = Math.floor((w - 12) / 14), sx = ((w - (n * 14 - 6)) / 2) | 0;
    for (let y = rh + 7; y + 10 < h - 42; y += 16) for (let i = 0; i < n; i++) {
      const x = sx + i * 14, lit = rnd() < 0.7;
      R(x - 1, y - 1, 10, 12, frame); R(x, y, 8, 10, '#2a2740');
      if (lit) { R(x, y, 8, 10, rnd() < 0.25 ? b.neon : warm, eg); R(x + 3, y, 1, 10, frame, eg); R(x, y + 4, 8, 1, frame, eg); }
      else R(x + 1, y + 1, 2, 2, '#5a5878');
    }
    // door
    const dx = (w >> 1) - 7;
    R(dx - 1, h - 24, 16, 24, frame); R(dx, h - 23, 14, 23, b.door || '#4a3550'); R(dx + 2, h - 21, 10, 8, '#2a2740'); R(dx + 2, h - 21, 10, 8, warm, eg);
    R(dx + 6, h - 21, 1, 8, frame, eg); R(dx + 11, h - 10, 1, 2, '#ffe2a8'); R(dx - 2, h - 2, 18, 2, shade(b.wall, 0.45));
    // shop windows + awnings
    const shop = (x0, lw) => {
      if (lw < 10) return;
      R(x0 - 1, h - 23, lw + 2, 16, frame); R(x0, h - 22, lw, 14, '#2a2740'); R(x0, h - 22, lw, 14, warm, eg);
      for (let x = x0 + 2; x < x0 + lw - 3; x += 5) { const hh = 3 + (rnd() * 7 | 0); R(x, h - 8 - hh, 3, hh, rnd() < 0.5 ? '#7a4f5a' : shade(b.neon, 0.6), eg); }
      R(x0, h - 9, lw, 1, frame, eg);
      for (let x = x0 - 2; x < x0 + lw + 2; x += 3) R(x, h - 28, Math.min(3, x0 + lw + 2 - x), 4, ((x - x0) / 3 | 0) % 2 ? '#f4f1ff' : b.awn);
      R(x0 - 2, h - 24, lw + 4, 1, shade(b.awn, 0.6));
    };
    shop(8, dx - 6 - 8); shop(dx + 20, w - 8 - (dx + 20));
    // neon sign
    const tw = textW(b.sign), bw = tw + 8, bx = ((w - bw) / 2) | 0, by = h - 37;
    R(bx, by, bw, 10, '#1c1826'); R(bx, by, bw, 1, '#4a4468'); R(bx, by + 9, bw, 1, '#0f0c16');
    text(g, b.sign, bx + 4, by + 3, shade(b.neon, 0.5)); text(eg, b.sign, bx + 4, by + 3, b.neon);
    return { img: c, em: e };
  }

  function makeTree(seed) {
    const c = mk(28, 34), g = c.getContext('2d'), rnd = rng(seed), cols = ['#8fdc93', '#62b47a', '#3f8f68', '#2c6b5a'];
    g.fillStyle = '#6b4a3a'; g.fillRect(12, 21, 4, 12); g.fillStyle = '#4a3340'; g.fillRect(15, 21, 1, 12); g.fillRect(11, 32, 6, 1);
    for (let y = 0; y < 24; y++) for (let x = 0; x < 28; x++) {
      const d = ((x - 13.5) / 13.5) ** 2 + ((y - 11.5) / 11.5) ** 2;
      if (d > 1 - rnd() * 0.22) continue;
      const v = (x * 0.9 + y * 1.6) / 52 + (rnd() - 0.5) * 0.35 + d * 0.25;
      g.fillStyle = cols[Math.max(0, Math.min(3, (v * 4) | 0))]; g.fillRect(x, y, 1, 1);
    }
    return c;
  }
  function makeLamp() {
    const c = mk(10, 38), e = mk(10, 38), g = c.getContext('2d'), eg = e.getContext('2d');
    g.fillStyle = '#3a3550'; g.fillRect(4, 8, 2, 28); g.fillRect(3, 35, 4, 3); g.fillRect(1, 2, 8, 3); g.fillRect(3, 1, 4, 1);
    g.fillStyle = '#57506e'; g.fillRect(4, 8, 1, 28);
    g.fillStyle = '#ffe2a8'; g.fillRect(2, 5, 6, 3); eg.fillStyle = '#fff0c8'; eg.fillRect(2, 5, 6, 3);
    return { img: c, em: e };
  }
  function makePost(label, col = '#fff3d6') {
    const bw = textW(label) + 6, c = mk(bw, 21), e = mk(bw, 21), g = c.getContext('2d');
    g.fillStyle = '#5a4034'; g.fillRect((bw >> 1) - 1, 9, 3, 12);
    g.fillStyle = '#8a6a4a'; g.fillRect(0, 0, bw, 9); g.fillStyle = '#a98560'; g.fillRect(0, 0, bw, 1); g.fillStyle = '#5a4034'; g.fillRect(0, 8, bw, 1);
    text(g, label, 3, 2, col);
    return { img: c, em: e };
  }
  function makeKiosk() {
    const c = mk(14, 22), e = mk(14, 22), g = c.getContext('2d'), eg = e.getContext('2d');
    g.fillStyle = '#3a3550'; g.fillRect(0, 0, 14, 22); g.fillStyle = '#57506e'; g.fillRect(0, 0, 14, 1); g.fillRect(0, 0, 1, 22);
    g.fillStyle = '#231f33'; g.fillRect(2, 13, 10, 2); g.fillRect(0, 20, 14, 2);
    g.fillStyle = '#0c1a12'; g.fillRect(2, 3, 10, 8); eg.fillStyle = '#0c1a12'; eg.fillRect(2, 3, 10, 8);
    eg.fillStyle = '#6dffb0'; eg.fillRect(3, 4, 1, 1); eg.fillRect(5, 4, 5, 1); eg.fillRect(3, 6, 6, 1); eg.fillRect(3, 8, 3, 1); eg.fillRect(7, 8, 2, 1);
    return { img: c, em: e };
  }
  function makeMailbox() {
    const c = mk(11, 18), g = c.getContext('2d');
    g.fillStyle = '#3a3550'; g.fillRect(4, 8, 2, 10); g.fillStyle = '#d6455a'; g.fillRect(0, 1, 10, 8); g.fillStyle = '#f0707f'; g.fillRect(0, 1, 10, 1);
    g.fillStyle = '#8f2b3d'; g.fillRect(0, 8, 10, 1); g.fillRect(2, 4, 6, 1); g.fillStyle = '#ffe066'; g.fillRect(10, 0, 1, 5); g.fillRect(8, 0, 2, 2);
    return { img: c, em: null };
  }

  function makeGround(trees) {
    const c = mk(MAPW, MAPH), g = c.getContext('2d'), rnd = rng(7);
    g.fillStyle = '#5a9e74'; g.fillRect(0, 0, MAPW, MAPH);
    for (let i = 0; i < 9000; i++) { g.fillStyle = ['#4c8c68', '#6fb383', '#528f6c', '#7cc08d'][rnd() * 4 | 0]; g.fillRect(rnd() * MAPW | 0, rnd() * MAPH | 0, 1 + (rnd() * 2 | 0), 1); }
    const pave = (r, base, a, bcol, edge) => {
      const [x, y, w, h] = r.map(v => v * T);
      g.fillStyle = edge; g.fillRect(x - 1, y - 1, w + 2, h + 2); g.fillStyle = base; g.fillRect(x, y, w, h);
      for (let i = 0; i < (w * h) / 26; i++) { g.fillStyle = rnd() < 0.5 ? a : bcol; g.fillRect(x + (rnd() * (w - 3) | 0), y + (rnd() * (h - 1) | 0), 2 + (rnd() * 2 | 0), 1); }
    };
    PATHS.forEach(r => pave(r, '#c8b8a2', '#b3a28e', '#d9ccb8', '#7f7366'));
    pave(PLAZA, '#d3c7b8', '#c2b5a4', '#e2d8cb', '#7f7366');
    PATHS.slice(0, 3).forEach(r => { const [x, y, w, h] = r.map(v => v * T); g.fillStyle = '#c8b8a2'; g.fillRect(x, y, w, h); for (let i = 0; i < (w * h) / 26; i++) { g.fillStyle = rnd() < 0.5 ? '#b3a28e' : '#d9ccb8'; g.fillRect(x + (rnd() * (w - 3) | 0), y + (rnd() * (h - 1) | 0), 2 + (rnd() * 2 | 0), 1); } });
    for (let i = 0; i < 260; i++) {
      const x = rnd() * MAPW | 0, y = rnd() * MAPH | 0;
      if (onPath(x, y, 3)) continue;
      g.fillStyle = ['#ffe066', '#ff9ec4', '#e9dcff', '#ffffff'][rnd() * 4 | 0]; g.fillRect(x, y, 1, 1); g.fillStyle = '#3f8f68'; g.fillRect(x, y + 1, 1, 1);
    }
    return c;
  }
  function onPath(x, y, pad = 0) {
    for (const r of [...PATHS, PLAZA]) if (x > r[0] * T - pad && x < (r[0] + r[2]) * T + pad && y > r[1] * T - pad && y < (r[1] + r[3]) * T + pad) return true;
    return false;
  }

  // ---------- assemble ----------
  B.forEach(b => Object.assign(b, makeBuilding(b)));
  const treeArt = [makeTree(11), makeTree(23), makeTree(37)];
  const TREES = [];
  {
    const rnd = rng(42), keep = [...POSTS, ...ORBS, KIOSK, MAILBOX, HELLO, ...LAMPS];
    const ok = (x, y) => {
      if (x < 10 || x > MAPW - 10 || y < 26 || y > MAPH - 2 || onPath(x, y, 12)) return false;
      for (const b of B) if (x > b.x - 16 && x < b.x + b.w + 16 && y > b.y - 6 && y < b.base + 34) return false;
      for (const k of keep) if (Math.abs(k.x - x) < 16 && Math.abs(k.y - y) < 22) return false;
      for (const t of TREES) if (Math.abs(t.x - x) < 15 && Math.abs(t.y - y) < 11) return false;
      return true;
    };
    const add = (x, y) => { if (ok(x, y)) TREES.push({ x: x | 0, y: y | 0, art: treeArt[rnd() * 3 | 0] }); };
    for (let x = 12; x < MAPW; x += 19) { add(x + rnd() * 6, 28 + rnd() * 8); add(x + rnd() * 6, MAPH - 4 - rnd() * 8); }
    for (let y = 40; y < MAPH; y += 15) { add(12 + rnd() * 8, y); add(MAPW - 12 - rnd() * 8, y); }
    for (let i = 0; i < 420 && TREES.length < 150; i++) add(rnd() * MAPW, rnd() * MAPH);
  }
  const lampArt = makeLamp(), kioskArt = makeKiosk(), mailArt = makeMailbox(), helloArt = makePost('HELLO', '#ffe2a8');
  POSTS.forEach(p => Object.assign(p, makePost(p.year)));

  const NPCS = B.filter(b => b.npc).map(b => ({ id: b.npc, x: b.doorX + 17, y: b.base + 6, b }));

  // statics: y-sorted drawables
  const STATICS = [];
  B.forEach(b => STATICS.push({ img: b.img, em: b.em, x: b.x, y: b.y, by: b.base - 1 }));
  TREES.forEach(t => STATICS.push({ img: t.art, em: null, x: t.x - 14, y: t.y - 33, by: t.y }));
  LAMPS.forEach(l => STATICS.push({ img: lampArt.img, em: lampArt.em, x: l.x - 5, y: l.y - 38, by: l.y }));
  POSTS.forEach(p => STATICS.push({ img: p.img, em: null, x: p.x - (p.img.width >> 1), y: p.y - 21, by: p.y }));
  STATICS.push({ img: kioskArt.img, em: kioskArt.em, x: KIOSK.x - 7, y: KIOSK.y - 22, by: KIOSK.y });
  STATICS.push({ img: mailArt.img, em: null, x: MAILBOX.x - 5, y: MAILBOX.y - 18, by: MAILBOX.y });
  STATICS.push({ img: helloArt.img, em: null, x: HELLO.x - (helloArt.img.width >> 1), y: HELLO.y - 21, by: HELLO.y });

  // colliders (block movement) and occluders (cast shadows)
  const COLL = [], OCC = [];
  B.forEach(b => { const r = { x: b.x + 3, y: b.y + 14, w: b.w - 6, h: b.h - 14, top: b.y }; COLL.push(r); OCC.push(r); });
  TREES.forEach(t => { const r = { x: t.x - 3, y: t.y - 4, w: 6, h: 4 }; COLL.push(r); OCC.push(r); });
  LAMPS.forEach(l => COLL.push({ x: l.x - 2, y: l.y - 3, w: 4, h: 3 }));
  POSTS.forEach(p => COLL.push({ x: p.x - 2, y: p.y - 3, w: 4, h: 3 }));
  [[KIOSK, 14], [MAILBOX, 6], [HELLO, 4]].forEach(([k, w]) => { const r = { x: k.x - w / 2, y: k.y - 4, w, h: 4 }; COLL.push(r); if (k === KIOSK) OCC.push({ x: r.x, y: r.y - 4, w, h: 8 }); });
  NPCS.forEach(n => COLL.push({ x: n.x - 4, y: n.y - 4, w: 8, h: 4 }));

  // interactables
  const INTERACT = [];
  B.forEach(b => INTERACT.push({ x: b.doorX + 6, y: b.base + 6, r: 24, label: b.npc ? SPR.CAST[b.npc].name : 'STUDIO', kind: 'building', b }));
  POSTS.forEach(p => INTERACT.push({ x: p.x, y: p.y + 2, r: 16, label: p.year, kind: 'post', p }));
  INTERACT.push({ x: KIOSK.x, y: KIOSK.y + 2, r: 17, label: 'TERMINAL', kind: 'kiosk' });
  INTERACT.push({ x: MAILBOX.x, y: MAILBOX.y + 2, r: 16, label: 'CONTACT', kind: 'mail' });
  INTERACT.push({ x: HELLO.x, y: HELLO.y + 2, r: 15, label: 'HELLO', kind: 'hello' });

  // ---------- benches (sit to let time pass) and the construction site beside LV X Cred ----------
  const BENCHES = [[10, 23.3], [20, 23.3], [42, 23.3], [52, 23.3], [9, 41.3], [18.5, 41.3], [39.5, 41.3], [50.5, 41.3]].map(([x, y]) => ({ x: x * T, y: y * T }));
  BENCHES.forEach(b => INTERACT.push({ x: b.x, y: b.y - 8, r: 15, label: 'Sit', kind: 'bench', bench: b }));
  const WIP = { x: 872, y: 496, w: 72, h: 100, card: { title: 'Fitness app', tags: ['UNDER CONSTRUCTION'],
    desc: "A fitness app built around the problems other fitness apps don't cover. Nothing to show yet. The crew is still working on it." } };
  for (let i = TREES.length - 1; i >= 0; i--) { // clear trees off the plot
    const t = TREES[i]; if (t.x < WIP.x - 16 || t.y < WIP.y - 24 || t.y > WIP.y + WIP.h + 34) continue;
    TREES.splice(i, 1);
    for (const list of [COLL, OCC]) { const k = list.findIndex(r => r.x === t.x - 3 && r.y === t.y - 4 && r.w === 6); if (k >= 0) list.splice(k, 1); }
  }
  COLL.push({ x: WIP.x - 3, y: WIP.y + 6, w: WIP.w + 6, h: WIP.h - 4 });
  INTERACT.push({ x: WIP.x + WIP.w / 2, y: WIP.y + WIP.h + 8, r: 20, label: 'Coming soon', kind: 'wip' });
  const WORKERS = [{ id: 'builder1', x: WIP.x + 22, y: WIP.y + 70 }, { id: 'builder2', x: WIP.x + 52, y: WIP.y + 84 }, { id: 'builder3', x: WIP.x + 14, y: WIP.y + 95, walk: [WIP.x + 10, WIP.x + 62] }];

  return { BENCHES, WIP, WORKERS, T, MAPW, MAPH, SITE, B, POSTS, ORBS, LAMPS, TREES, NPCS, STATICS, COLL, OCC, INTERACT, KIOSK, MAILBOX, HELLO, ground: makeGround(TREES), rng };
})();
