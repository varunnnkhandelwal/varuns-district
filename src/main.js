// Game logic: input, movement, interaction, UI and audio. Drawing lives in render3d.js.
(() => {
  const { FW, FH, mk } = SPR;
  const { MAPW, MAPH, B, POSTS, ORBS, LAMPS, NPCS, STATICS, COLL, OCC, INTERACT, SITE } = WORLD;
  const $ = id => document.getElementById(id);
  // a scene is anything walkable: the outdoor district, or one building interior
  const OUT = { outdoor: true, w: MAPW, h: MAPH, coll: COLL, interact: INTERACT, npcs: NPCS, orbs: ORBS, bounds: { x0: 6, x1: MAPW - 6, y0: 30, y1: MAPH - 2 } };
  let scene = OUT, fade = 0, back = null, hinted = false;
  let uiZoom = 1; // UI text grows with the window
  function resize() { uiZoom = +Math.max(0.68, Math.min(2.2, innerHeight / 760)).toFixed(2); document.documentElement.style.setProperty('--ui', uiZoom); }
  addEventListener('resize', resize); resize();

  // ---------- audio ----------
  const AU = {
    ctx: null, on: false, t0: 0, step: 0, next: 0, timer: 0, out: null,
    init() {
      if (!this.ctx) { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.out = this.ctx.createGain(); this.out.gain.value = 0.5; this.out.connect(this.ctx.destination); }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    },
    note(f, t, d, type, v, cut) {
      const c = this.ctx, o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
      o.type = type; o.frequency.setValueAtTime(f, t); lp.frequency.value = cut || 2400;
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(lp); lp.connect(g); g.connect(this.out); o.start(t); o.stop(t + d + 0.02);
      return o;
    },
    blip(f = 660, d = 0.09, v = 0.06) { if (this.ctx) this.note(f, this.ctx.currentTime, d, 'square', v); },
    chime() { if (this.ctx) [660, 880, 1320].forEach((f, i) => this.note(f, this.ctx.currentTime + i * 0.07, 0.18, 'triangle', 0.09)); },
    toggle() {
      this.init(); this.on = !this.on;
      if (!this.on) { clearInterval(this.timer); return; }
      this.t0 = this.next = this.ctx.currentTime + 0.05; this.step = 0;
      const roots = [45, 41, 48, 43], chords = [[0, 3, 7], [0, 4, 7], [0, 4, 7], [0, 4, 7]], hz = m => 440 * 2 ** ((m - 69) / 12);
      this.timer = setInterval(() => {
        while (this.next < this.ctx.currentTime + 0.12) {
          const s = this.step, bar = (s >> 4) % 4, t = this.next;
          if (s % 4 === 0) { const k = this.note(130, t, 0.16, 'sine', 0.3, 800); k.frequency.exponentialRampToValueAtTime(42, t + 0.12); }
          if (s % 2 === 0) this.note(hz(roots[bar]), t, 0.16, 'sawtooth', 0.11, 520);
          this.note(hz(roots[bar] + 24 + chords[bar][s % 3] + (s % 8 > 3 ? 12 : 0)), t, 0.1, 'square', 0.035, 1900);
          this.step++; this.next += 0.125;
        }
      }, 30);
    },
    beat() { return this.on ? Math.max(0, (this.ctx.currentTime - this.t0) * 2) : 0; }
  };

  // ---------- your own background music: list files in music/playlist.js ----------
  const BGM = {
    el: null, i: 0, list: window.PLAYLIST || [], muted: false,
    start() { if (!this.list.length || this.el) return; this.el = new Audio(); this.el.volume = 0.45; this.el.addEventListener('ended', () => this.next()); this.el.addEventListener('error', () => { $('np').textContent = '♪ Could not load ' + this.list[this.i].file; }); this.play(); },
    play() { const t = this.list[this.i]; this.el.src = 'music/' + t.file; this.el.play().catch(() => {}); $('np').innerHTML = '♪ ' + (t.title || t.file) + ' <kbd>M</kbd><kbd>N</kbd>'; $('np').classList.add('show'); },
    next() { if (!this.el) return; this.i = (this.i + 1) % this.list.length; this.play(); },
    toggle() { if (!this.el) return; this.muted = !this.muted; if (this.muted) this.el.pause(); else this.el.play().catch(() => {}); $('np').classList.toggle('off', this.muted); },
    duck(on) { if (!this.el || this.muted) return; if (on) this.el.pause(); else this.el.play().catch(() => {}); }
  };

  // ---------- state ----------
  const P = { x: 31.5 * 16, y: 24.5 * 16, dir: 'down', flip: false, moving: false, t: 0 };
  const spark = { on: true };
  const cat = { x: 300, y: 440, tx: 300, ty: 440, wait: 1, flip: false, moving: false };
  const flies = Array.from({ length: 16 }, (_, i) => ({ x: 60 + (i * 137) % 840, y: 388 + (i * 53) % 86, ph: i * 2.3 }));
  const keys = {};
  let time = 0, started = false, cardOpen = false, flash = 0, got = 0, near = null, toastT = 0;
  // cheats: typed on the keyboard, never shown anywhere. Typing one again switches it off.
  const cheat = { jet: false, fast: false, buff: false };
  let typed = '';
  const flipCheat = k => () => { cheat[k] = !cheat[k]; AU.chime(); toast(cheat[k] ? 'Cheat activated' : 'Cheat deactivated'); };
  const CHEATS = { rocketman: flipCheat('jet'), speeditup: flipCheat('fast'), buffmeup: flipCheat('buff') };
  let sit = null, tod = 0, todFrom = 0, todT = -1; // tod: 0 night, 1 morning, 2 midday, 3 evening
  const PHASES = ['Night', 'Morning', 'Midday', 'Evening'];

  // ---------- UI: dialogue box, story panel, journal, area banner ----------
  $('card').classList.add('win'); $('talk').classList.add('win');
  const card = $('card'), talkEl = $('talk'), journalEl = $('journal'), areaEl = $('area'), toastEl = $('toast'), promptEl = $('prompt'), fadeEl = $('fade');
  const TIER = { main: 'Main Story', side: 'Side Story', play: 'Playground', about: 'The Designer' };
  let mode = null, talk = null, areaT = 0, lastZone = null;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); toastT = 3; }
  function banner(sub, title) { areaEl.innerHTML = `<small>${sub}</small><b>${title}</b>`; areaEl.classList.add('show'); areaT = 3.2; $('place').textContent = title; }
  function portrait(id) { const c = mk(FW, FH); c.getContext('2d').drawImage(SPR.chars[id].sheet, 0, 0, FW, FH, 0, 0, FW, FH); return c.toDataURL(); }
  function setMode(m) {
    mode = m; cardOpen = !!m;
    card.classList.toggle('show', m === 'panel'); talkEl.classList.toggle('show', m === 'talk'); journalEl.classList.toggle('show', m === 'journal'); $('arcade').classList.toggle('show', m === 'game');
  }
  function updateHud() { $('skills').innerHTML = `<kbd>J</kbd> Journal ${B.filter(b => b.seen && b.tier !== 'about').length}/9 <i>◆</i> Skills ${got}/6`; }
  const meta = a => `<div class="meta">${a.join('<i>◆</i>')}</div>`;
  const head = (tier, label) => `<header class="t-${tier}"><span>${label}</span></header>`;
  function panel(html) { card.innerHTML = html + '<footer><kbd>E</kbd> Close</footer>'; setMode('panel'); AU.blip(520); }
  function say(id, text, then) {
    talk = { text, n: 0, then };
    talkEl.classList.remove('done');
    talkEl.innerHTML = `<img alt="" src="${portrait(id)}"><div><div class="who">${SPR.CAST[id].name}</div><p></p></div><span class="next">▼</span>`;
    setMode('talk');
  }
  // putting the controller down: Varun has something to say about it
  function quitGame() {
    const sc = INVADERS.score, lines = sc === 0 ? ["We don't talk about that round.", "I was just warming up. Obviously."]
      : sc >= INVADERS.hi && sc > 0 ? ['New high score. Putting that on the portfolio.', "Okay, that's enough. I'm retiring undefeated."]
      : ["Okay, that's enough. These case studies won't write themselves.", 'One more round... no. No. Back to work.', "That's my break done. The aliens can wait.", 'Fine. I blame the controller.'];
    say('varun', lines[Math.random() * lines.length | 0], null);
  }
  function advance() {
    if (mode === 'talk') {
      if (talk.n < talk.text.length) { talk.n = talk.text.length; talkEl.querySelector('p').textContent = talk.text; talkEl.classList.add('done'); }
      else { const t = talk.then; setMode(null); if (t) t(); }
    } else setMode(null);
  }
  function projectPanel(b) {
    const c = b.card; b.seen = true; updateHud();
    panel(`${head(b.tier, TIER[b.tier] + (b.chapter ? ' · Chapter ' + b.chapter : ''))}<h2>${c.title}</h2>${meta(c.tags)}${c.desc ? `<p>${c.desc}</p>` : ''}
      <a class="go" href="${c.url}" target="_blank" rel="noopener">${c.cta || 'Read the case study'}</a>`);
  }
  function aboutPanel() {
    panel(`${head('about', 'The Designer')}<h2>Varun Khandelwal</h2>${meta(['Product Designer', 'Bajaj Finserv Health'])}
      <p>Product designer and expert in UX/UI Design with over 2 years of experience. Expertise extends to Figma and AI Prompting and Implementation, enabling me to create designs both aesthetically pleasing and easily implementable. I currently work as a Product Designer at Bajaj Finserv Health.</p>
      <ul class="xp">${POSTS.slice().reverse().map(p => `<li><b>${p.title}</b><span>${p.org} · ${p.when}</span></li>`).join('')}</ul>
      <a class="go" href="${SITE}" target="_blank" rel="noopener">Open the full portfolio</a>`);
  }
  // journal: a full menu screen. W/S moves the cursor, E opens the selected case study.
  let jSel = 0;
  const jList = () => ['main', 'side', 'play'].flatMap(t => B.filter(b => b.tier === t));
  const WHERE = { main: 'Upper street', side: 'Lower street, west side', play: 'Lower street, east side' };
  function journal(keep) {
    const list = jList(), cur = list[jSel], c = cur.card, seen = list.filter(b => b.seen).length;
    const grp = (tier, label) => `<h3 class="t-${tier}">${label}</h3><ul>${list.map((b, i) => b.tier !== tier ? '' :
      `<li data-i="${i}" class="${i === jSel ? 'sel' : ''}${b.seen ? ' seen' : ''}"><i>☛</i><span>${b.chapter ? b.chapter + '. ' : ''}${b.card.title}</span><em>${b.seen ? '★' : ''}</em></li>`).join('')}</ul>`;
    const bar = (label, n, of) => `<div class="bar"><span>${label}</span><u><i style="width:${n / of * 100}%"></i></u><b>${n}/${of}</b></div>`;
    const clock = String(time / 60 | 0).padStart(2, '0') + ':' + String(time % 60 | 0).padStart(2, '0');
    journalEl.innerHTML = `<div class="jgrid">
      <section class="win jlist"><h2>Journal</h2>${grp('main', 'Main Story')}${grp('side', 'Side Stories')}${grp('play', 'Playground')}</section>
      <section class="win jdetail">${head(cur.tier, TIER[cur.tier] + (cur.chapter ? ' · Chapter ' + cur.chapter : ''))}<h2>${c.title}</h2>${meta(c.tags)}
        ${c.desc ? `<p>${c.desc}</p>` : ''}<p class="dim">${cur.seen ? '★ Visited' : 'Not visited yet'} · ${WHERE[cur.tier]}</p>
        <a class="go" href="${c.url}" target="_blank" rel="noopener">${c.cta || 'Read the case study'}</a></section>
      <section class="win jparty"><img alt="" src="${portrait('varun')}"><div class="who"><b>Varun Khandelwal</b><small>Product Designer</small>${bar('Projects', seen, 9)}${bar('Skills', got, 6)}</div>
        <div class="lv">LV<b>2</b>years</div></section>
      <section class="win jinfo"><div><small>Location</small><b>${$('place').textContent}</b></div><div><small>Time</small><b>${clock}</b></div></section>
      <section class="win jhelp"><span><kbd>W</kbd><kbd>S</kbd>Select</span><span><kbd>E</kbd>Open</span><span><kbd>J</kbd>Close</span></section></div>`;
    journalEl.querySelectorAll('li').forEach(li => { li.onclick = () => { jSel = +li.dataset.i; AU.blip(700, 0.03, 0.03); journal(true); }; });
    if (!keep) { setMode('journal'); AU.blip(520); }
  }
  function jMove(d) { const n = jList().length; jSel = (jSel + d + n) % n; AU.blip(700, 0.03, 0.03); journal(true); }
  function interact(it) {
    if (it.kind === 'building') {
      const b = it.b;
      if (b.card.about) return aboutPanel();
      if (b.id === 'snap') { flash = 1; AU.blip(1800, 0.05, 0.05); }
      if (b.id === 'synth') { AU.toggle(); BGM.duck(AU.on); }
      const off = b.id === 'synth' && !AU.on;
      if (scene.outdoor) say(b.npc, off ? 'POWERING DOWN. Talk to me again when you want the music back.' : b.card.quote, off ? null : () => projectPanel(b));
      else if (off) toast('The music stops.'); else projectPanel(b);
    } else if (it.kind === 'post') {
      panel(`${head('xp', 'Experience')}<h2>${it.p.title}</h2>${meta([it.p.org, it.p.when])}`);
    } else if (it.kind === 'kiosk') {
      panel(`${head('xp', 'Terminal')}<h2>Run this in your terminal</h2><pre class="term">ssh -p 2222 20.219.240.220</pre><button class="go" id="copy">Copy the command</button>`);
      $('copy').onclick = () => { navigator.clipboard && navigator.clipboard.writeText('ssh -p 2222 20.219.240.220'); $('copy').textContent = 'Copied'; };
    } else if (it.kind === 'mail') {
      panel(`${head('xp', 'Contact')}<h2>Let's get in touch</h2><a class="go" href="${SITE}" target="_blank" rel="noopener">varunkhandelwal.in</a>`);
    } else if (it.kind === 'hello') {
      panel(`${head('about', 'Welcome')}<h2>Hello, I’m Varun.</h2><p>A Product Designer. With 2 years of experience in <i>Health Tech, AI and Visual Design</i>.</p>
        <p class="dim">The upper street is my main work. The lower street has side projects on the left and the playground on the right. The trail in between is my experience so far. My studio is up north.</p>`);
    } else if (it.kind === 'bench') { // sit down: the only way time moves forward
      if (todT >= 0) return;
      sit = it.bench; P.x = sit.x; P.y = sit.y - 1; P.dir = 'up'; P.moving = false; todFrom = tod; todT = 0; AU.chime(); toast('You sit down and let time pass.');
    } else if (it.kind === 'wip') {
      panel(head('play', 'Playground · In progress') + '<h2>' + WORLD.WIP.card.title + '</h2>' + meta(WORLD.WIP.card.tags) + '<p>' + WORLD.WIP.card.desc + '</p>');
    } else if (it.kind === 'console') { // play the game on the studio console
      INVADERS.sfx = (f, d, v) => AU.blip(f, d, v); INVADERS.start($('inv')); setMode('game'); AU.chime();
    } else if (it.kind === 'cat') { AU.blip(990, 0.12, 0.04); toast('Kerning purrs.'); }
  }

  addEventListener('keydown', e => {
    if (!started) { start(); return; }
    const k = e.key.toLowerCase();
    if (mode === 'game') { e.preventDefault(); if (k === 'escape') quitGame(); else INVADERS.key(k, true); return; } // the console game owns the keyboard
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'tab'].includes(k)) e.preventDefault();
    if (e.repeat) return;
    keys[k] = true;
    if (k.length === 1 && k >= 'a' && k <= 'z') { typed = (typed + k).slice(-12); for (const c in CHEATS) if (typed.endsWith(c)) { CHEATS[c](); typed = ''; } }
    const midCheat = Object.keys(CHEATS).some(c => { for (let n = Math.min(typed.length, c.length - 1); n >= 3; n--) if (typed.endsWith(c.slice(0, n))) return true; return false; });
    if (mode === 'journal') { // menu navigation
      if (['w', 's', 'arrowup', 'arrowdown'].includes(k)) return jMove(k === 's' || k === 'arrowdown' ? 1 : -1);
      if (k === 'e' || k === 'enter' || k === ' ') return void window.open(jList()[jSel].card.url, '_blank', 'noopener');
    }
    if (k === 'escape') { if (mode) setMode(null); }
    else if ((k === 'e' && !midCheat) || k === 'enter' || k === ' ') { if (mode) advance(); else if (sit) { if (todT < 0) { P.y = sit.y - 9; P.dir = 'down'; sit = null; } } else if (near) interact(near); }
    else if (k === 'j' || k === 'tab') { if (mode === 'journal') setMode(null); else if (!mode) journal(); }
    else if (midCheat) { /* part-way through typing a cheat: letter hotkeys stay quiet */ }
    else if (k === 'f' && !mode) { spark.on = !spark.on; toast(spark.on ? 'Spark lit.' : 'Spark put out.'); }
    else if (k === 'm') BGM.toggle();
    else if (k === 'n') BGM.next();
  });
  addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; if (mode === 'game') INVADERS.key(e.key.toLowerCase(), false); });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  $('title').addEventListener('click', start);
  function start() { if (started) return; started = true; AU.init(); AU.chime(); $('title').classList.add('hide'); $('hud').classList.add('show'); updateHud(); banner('A playable portfolio', 'Varun’s District'); BGM.start(); }

  // ---------- update ----------
  const hit = (x, y) => {
    const bd = scene.bounds;
    if (x < bd.x0 || x > bd.x1 || y < bd.y0 || y > bd.y1) return true;
    for (const r of scene.coll) if (!(cheat.jet && r.w <= 30 && r.h <= 10) && x + 4 > r.x && x - 4 < r.x + r.w && y > r.y && y - 4 < r.y + r.h) return true;
    return false;
  };
  function go(s, x, y, dir) { scene = s; P.x = x; P.y = y; P.dir = dir; fade = 1; near = null; AU.blip(s.outdoor ? 260 : 330, 0.12); }
  function update(dt) {
    time += dt; P.t += dt; fade = Math.max(0, fade - dt * 2.2);
    if (toastT > 0 && (toastT -= dt) <= 0) toastEl.classList.remove('show');
    if (mode === 'game') INVADERS.step(dt);
    if (cheat.fast) P.t += dt; // legs keep up with the speed
    if (areaT > 0 && (areaT -= dt) <= 0) areaEl.classList.remove('show');
    if (mode === 'talk' && talk.n < talk.text.length) { // typewriter
      const a = talk.n | 0; talk.n += dt * 46; const n = Math.min(talk.text.length, talk.n | 0);
      if (n !== a) { talkEl.querySelector('p').textContent = talk.text.slice(0, n); if (n % 3 === 0) AU.blip(380, 0.02, 0.012); if (n >= talk.text.length) talkEl.classList.add('done'); }
    }
    if (scene.outdoor && started) { // street banners
      const ty = P.y / 16, z = ty >= 19.5 && ty < 23.5 ? 'main' : ty >= 37.5 && ty < 41.5 ? (P.x < 31 * 16 ? 'side' : 'play') : ty >= 25.5 && ty < 27.5 ? 'trail' : null;
      if (z && z !== lastZone) { lastZone = z; banner(...{ main: ['Main Story', 'Selected Work'], side: ['Side Stories', 'Additional Projects'], play: ['Playground', 'UI Experiments'], trail: ['2021 to today', 'Experience Trail'] }[z]); }
    }
    flash = Math.max(0, flash - dt * 2.2);
    if (todT >= 0) { // time rolls forward one phase while seated
      todT += dt / 8; const s = Math.min(1, todT); tod = todFrom + s * s * (3 - 2 * s);
      if (s >= 1) { tod = Math.round(tod) % 4; todT = -1; banner('Time passes', PHASES[tod]); toast('Press E to stand up.'); }
    }
    let vx = 0, vy = 0;
    if (started && !cardOpen && !sit) {
      vx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
      vy = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
    }
    P.moving = !!(vx || vy);
    if (P.moving) {
      const n = Math.hypot(vx, vy), sp = 78 * (cheat.fast ? 2 : 1) * (cheat.jet ? 1.5 : 1) * dt;
      const nx = P.x + vx / n * sp, ny = P.y + vy / n * sp;
      if (!hit(nx, P.y)) P.x = nx;
      if (!hit(P.x, ny)) P.y = ny;
      if (vy) P.dir = vy > 0 ? 'down' : 'up'; else { P.dir = 'side'; P.flip = vx < 0; }
      // doors: walk up into a building door to enter, walk down onto the mat to leave
      if (scene.outdoor && vy < 0) {
        for (const b of B) if (Math.abs(P.x - b.doorX) < 6 && P.y < b.base + 6 && P.y > b.base) {
          back = b; const room = INTERIORS[b.id]; go(room, room.w / 2, room.h - 9, 'up');
          banner(TIER[b.tier] + (b.chapter ? ' · Chapter ' + b.chapter : ''), b.card.title || 'Varun’s Studio');
          if (!hinted) toast('Walk back down onto the mat to leave.'); hinted = true; break;
        }
      } else if (!scene.outdoor && vy > 0 && P.y > scene.h - 5 && Math.abs(P.x - scene.w / 2) < 12) { go(OUT, back.doorX, back.base + 9, 'down'); lastZone = null; $('place').textContent = 'Varun’s District'; }
    }
    // cat wanders the park
    if (cat.wait > 0) { cat.wait -= dt; cat.moving = false; if (cat.wait <= 0) { cat.tx = 70 + Math.random() * 820; cat.ty = 418 + Math.random() * 14; } }
    else {
      const dx = cat.tx - cat.x, dy = cat.ty - cat.y, d = Math.hypot(dx, dy);
      if (d < 2) cat.wait = 1.5 + Math.random() * 3; else { cat.x += dx / d * 30 * dt; cat.y += dy / d * 30 * dt; cat.flip = dx < 0; cat.moving = true; }
    }
    for (const o of scene.orbs) if (!o.got && Math.hypot(o.x - P.x, o.y - P.y + 4) < 11) {
      o.got = true; got++; AU.chime(); updateHud();
      toast(got === 6 ? 'All six skills found. Your Spark burns brighter.' : `Skill found: ${o.name}`);
    }
    near = null; let best = 1e9;
    if (!cardOpen && !sit) {
      for (const it of scene.interact) { const d = Math.hypot(it.x - P.x, it.y - P.y); if (d < it.r && d < best) { best = d; near = it; } }
      const dc = Math.hypot(cat.x - P.x, cat.y - P.y); if (scene.outdoor && dc < 16 && dc < best) near = { x: cat.x, y: cat.y, kind: 'cat', label: 'Kerning' };
    }
  }

  // ---------- light sources for the renderer: { x, y (ground position), h (height), r (reach), c, i } ----------
  function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  B.forEach(b => { b.rgb = hexRgb(b.neon); });
  function lights() {
    const ls = [], beat = AU.beat(), pulse = AU.on ? 1 - (beat % 1) : 0;
    if (!scene.outdoor) {
      for (const l of scene.lights) {
        let i = l.i * (0.95 + 0.05 * Math.sin(time * 8 + l.x)), r = l.r;
        if (l.beat && AU.on) { i = l.i * (0.4 + 1.1 * pulse); r = l.r * (1 + 0.35 * pulse); }
        ls.push({ x: l.x, y: l.y, h: l.r > 100 ? 46 : 18, c: l.c, i: Math.min(1, i), r });
      }
      return ls;
    }
    LAMPS.forEach((l, i) => {
      let k = 0.86 + 0.05 * Math.sin(time * 9 + l.ph);
      if (i === 3) k *= (Math.sin(time * 13) + Math.sin(time * 7.3) > -0.6) ? 1 : 0.15; // one dying lamp
      l.k = k; ls.push({ x: l.x, y: l.y + 3, h: 32, r: 84, c: [255, 196, 128], i: k });
    });
    for (const b of B) {
      let c = b.rgb, i = 0.55 + 0.04 * Math.sin(time * 5 + b.seed), r = 62;
      if (b.id === 'synth' && AU.on) { c = (beat | 0) % 2 ? [125, 243, 255] : [255, 95, 210]; i = 0.45 + 0.55 * pulse; r = 70 + 40 * pulse; }
      ls.push({ x: b.doorX, y: b.base + 10, h: 20, r, c, i });
    }
    ls.push({ x: WORLD.KIOSK.x, y: WORLD.KIOSK.y + 6, h: 12, r: 40, c: [109, 255, 176], i: 0.5 + 0.08 * Math.sin(time * 20) });
    const mira = NPCS.find(n => n.id === 'mira'); ls.push({ x: mira.x, y: mira.y + 3, h: 12, r: 46, c: [125, 243, 255], i: 0.6 });
    for (const o of ORBS) if (!o.got) ls.push({ x: o.x, y: o.y, h: 9, r: 30 + 5 * Math.sin(time * 3 + o.x), c: o.c, i: 0.8 });
    return ls;
  }
  // which animation an NPC should be playing right now
  function npcAnim(n) {
    const dancing = n.id === 'sv1' && AU.on, d = Math.hypot(n.x - P.x, n.y - P.y), anim = d < 46 || dancing ? 'emote' : 'idle_down';
    let t = dancing ? AU.beat() * 0.4 + 0.01 : time + n.x;
    if (anim === 'emote' && n.id === 'snap' && flash > 0) t = 0.5;
    return [anim, t];
  }

  window.GAME = { cheat, P, spark, cat, flies, AU, OUT, lights, npcAnim, interact,
    get scene() { return scene; }, get time() { return time; }, get near() { return near; }, get flash() { return flash; }, get got() { return got; }, get started() { return started; }, get sit() { return sit; }, get tod() { return tod; } };

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt);
    fadeEl.style.opacity = fade;
    const R = window.R3D;
    if (R) {
      R.frame(GAME, dt);
      if (near && started) {
        const p = R.project(near.x, scene.outdoor ? 34 : 40, near.y);
        promptEl.innerHTML = `<span>${near.label}</span><kbd>${window.TOUCH ? 'A' : 'E'}</kbd>`; promptEl.style.left = p.x / uiZoom + 'px'; promptEl.style.top = p.y / uiZoom + 'px'; promptEl.classList.add('show');
      } else promptEl.classList.remove('show');
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
