// "Star Sweep": the game on the studio console. Rows of aliens march down; move and shoot.
window.INVADERS = (() => {
  const W = 160, H = 144, COLS = 8, ROWS = 4;
  const SHAPES = [
    [['00100100', '01111110', '11011011', '11111111', '01000010', '10000001'], ['00100100', '01111110', '11011011', '11111111', '00100100', '01000010']],
    [['01000010', '00111100', '01011010', '11111111', '10111101', '10100101'], ['01000010', '00111100', '01011010', '11111111', '10111101', '01011010']],
    [['00011000', '00111100', '01111110', '11011011', '00100100', '01011010'], ['00011000', '00111100', '01111110', '11011011', '00100100', '10100101']]
  ];
  const COLORS = ['#ff9ec4', '#7df3ff', '#6dffb0'], SHIP = ['0001000', '0011100', '0111110', '1111111', '1111111'];
  const stars = Array.from({ length: 40 }, (_, i) => [(i * 53) % W, (i * 97) % H, 0.3 + (i % 5) * 0.15]);
  let g = null, s = null, keys = {}, hi = 0;
  const api = { sfx: () => {}, start, step, key, get score() { return s ? s.score : 0; }, get hi() { return hi; } };
  try { hi = +localStorage.getItem('starsweep-hi') || 0; } catch (e) { /* private mode: no high score kept */ }

  function glyph(rows, x, y, col) { g.fillStyle = col; for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) if (rows[r][c] === '1') g.fillRect(x + c, y + r, 1, 1); }
  function wave(n) {
    s.aliens = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) s.aliens.push({ x: 14 + c * 15, y: 22 + Math.min(n, 4) * 5 + r * 11, type: r === 0 ? 2 : r < 3 ? 1 : 0 });
    s.dir = 1; s.tick = 0; s.frame = 0; s.shots = []; s.bullet = null; s.wave = n;
  }
  function start(canvas) { g = canvas.getContext('2d'); keys = {}; s = { x: W / 2, score: 0, lives: 3, state: 'play', t: 0, fireT: 0, boom: [] }; wave(0); }
  function key(k, down) {
    keys[k] = down;
    if (!down || !s) return;
    if (k === ' ' || k === 'w' || k === 'arrowup' || k === 'e' || k === 'enter') {
      if (s.state === 'over') start(g.canvas);
      else if (!s.bullet) { s.bullet = { x: s.x, y: H - 16 }; api.sfx(880, 0.05, 0.03); }
    }
  }
  function lose() {
    s.lives--; api.sfx(110, 0.3, 0.06); s.boom.push({ x: s.x, y: H - 12, t: 0.5, c: '#ffe066' }); s.shots = [];
    if (s.lives <= 0) over();
  }
  function over() { s.state = 'over'; if (s.score > hi) { hi = s.score; try { localStorage.setItem('starsweep-hi', hi); } catch (e) { /* ignore */ } } }

  function step(dt) {
    if (!g) return;
    s.t += dt;
    if (s.state === 'play') {
      const mv = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
      s.x = Math.max(8, Math.min(W - 8, s.x + mv * 78 * dt));
      // the swarm steps sideways, faster as it thins out; at an edge it drops a row and turns
      s.tick -= dt;
      if (s.tick <= 0) {
        s.tick = 0.07 + 0.55 * (s.aliens.length / (COLS * ROWS)) * Math.max(0.45, 1 - s.wave * 0.12); s.frame ^= 1;
        const edge = s.aliens.some(a => (s.dir > 0 ? a.x + 8 + 3 > W - 4 : a.x - 3 < 4));
        for (const a of s.aliens) { if (edge) a.y += 5; else a.x += s.dir * 3; }
        if (edge) s.dir *= -1;
        api.sfx(s.frame ? 150 : 120, 0.04, 0.02);
      }
      // your shot
      if (s.bullet) {
        s.bullet.y -= 170 * dt;
        const i = s.aliens.findIndex(a => s.bullet.x >= a.x - 1 && s.bullet.x <= a.x + 9 && s.bullet.y >= a.y && s.bullet.y <= a.y + 7);
        if (i >= 0) { const a = s.aliens[i]; s.score += (a.type + 1) * 10; s.boom.push({ x: a.x + 4, y: a.y + 3, t: 0.25, c: COLORS[a.type] }); s.aliens.splice(i, 1); s.bullet = null; api.sfx(300, 0.08, 0.04); }
        else if (s.bullet.y < 10) s.bullet = null;
      }
      // their shots
      s.fireT -= dt;
      if (s.fireT <= 0 && s.aliens.length && s.shots.length < 3) { const a = s.aliens[Math.random() * s.aliens.length | 0]; s.shots.push({ x: a.x + 4, y: a.y + 7 }); s.fireT = 0.5 + Math.random() * 0.9; }
      for (const b of s.shots) b.y += 62 * dt;
      if (s.shots.some(b => Math.abs(b.x - s.x) < 5 && b.y > H - 16 && b.y < H - 8)) lose();
      s.shots = s.shots.filter(b => b.y < H);
      if (s.aliens.some(a => a.y + 6 >= H - 16)) over();
      if (!s.aliens.length && s.state === 'play') { wave(s.wave + 1); api.sfx(1320, 0.2, 0.05); }
    }
    for (const b of s.boom) b.t -= dt;
    s.boom = s.boom.filter(b => b.t > 0);
    draw();
  }

  function draw() {
    g.fillStyle = '#080a1e'; g.fillRect(0, 0, W, H);
    for (const [x, y, v] of stars) { g.fillStyle = `rgba(200,210,255,${v * (0.6 + 0.4 * Math.sin(s.t * 2 + x))})`; g.fillRect(x, (y + s.t * v * 6) % H | 0, 1, 1); }
    for (const a of s.aliens) glyph(SHAPES[a.type][s.frame], a.x, a.y, COLORS[a.type]);
    if (s.state === 'play' || (s.t * 6 | 0) % 2) glyph(SHIP, (s.x | 0) - 3, H - 15, '#f4f1ff');
    g.fillStyle = '#ffe066'; if (s.bullet) g.fillRect(s.bullet.x | 0, s.bullet.y | 0, 1, 4);
    g.fillStyle = '#ff5a6e'; for (const b of s.shots) g.fillRect(b.x | 0, b.y | 0, 1, 3);
    for (const b of s.boom) { g.fillStyle = b.c; const r = (0.5 - b.t) * 14 + 2 | 0; for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) g.fillRect(b.x + dx * r | 0, b.y + dy * r | 0, 1, 1); }
    g.fillStyle = '#2a3a8a'; g.fillRect(0, H - 7, W, 1);
    SPR.text(g, 'SCORE ' + String(s.score).padStart(4, '0'), 4, 3, '#f4f1ff'); SPR.text(g, 'HI ' + String(Math.max(hi, s.score)).padStart(4, '0'), 64, 3, '#ffd98a');
    for (let i = 0; i < s.lives; i++) glyph(SHIP, W - 12 - i * 9, 2, '#6dffb0');
    if (s.state === 'over') {
      g.fillStyle = 'rgba(8,10,30,.75)'; g.fillRect(0, 52, W, 40);
      SPR.text(g, 'GAME OVER', (W - SPR.textW('GAME OVER')) >> 1, 62, '#ff5a6e'); SPR.text(g, 'SPACE TO PLAY AGAIN', (W - SPR.textW('SPACE TO PLAY AGAIN')) >> 1, 76, '#f4f1ff');
    }
  }
  return api;
})();
