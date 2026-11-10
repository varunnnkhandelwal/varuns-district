// Touch controls: an on-screen stick and three buttons. They press the same keys the keyboard does,
// so everything (walking, talking, the journal, benches, the console game) works without extra wiring.
(() => {
  if (!(matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window)) return;
  window.TOUCH = true;
  document.body.classList.add('touch');
  const send = (type, key) => window.dispatchEvent(new KeyboardEvent(type, { key }));
  const el = (cls, html) => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html || ''; document.body.appendChild(d); return d; };

  // stick: pushes W/A/S/D (eight directions). In the journal a push up or down moves the cursor.
  const stick = el('t-stick', '<i></i>'), knob = stick.firstChild, held = { w: false, a: false, s: false, d: false };
  let id = null;
  function setDir(dx, dy) {
    const want = { a: dx < -0.38, d: dx > 0.38, w: dy < -0.38, s: dy > 0.38 };
    for (const k in want) if (want[k] !== held[k]) { held[k] = want[k]; send(want[k] ? 'keydown' : 'keyup', k); }
  }
  function move(e) {
    const r = stick.getBoundingClientRect(), R = r.width / 2;
    let dx = (e.clientX - r.left - R) / R, dy = (e.clientY - r.top - R) / R; const m = Math.hypot(dx, dy);
    if (m > 1) { dx /= m; dy /= m; }
    knob.style.transform = `translate(${dx * R * 0.55}px, ${dy * R * 0.55}px)`; setDir(dx, dy); e.preventDefault();
  }
  const end = e => { if (e.pointerId !== id) return; id = null; knob.style.transform = ''; setDir(0, 0); };
  stick.addEventListener('pointerdown', e => { id = e.pointerId; try { stick.setPointerCapture(id); } catch (err) { /* capture is a nicety, not required */ } move(e); });
  stick.addEventListener('pointermove', e => { if (e.pointerId === id) move(e); });
  stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);

  // buttons: A = talk / confirm / sit / fire, Journal, Back = close whatever is open
  const btn = (cls, label, key) => {
    const b = el('t-btn ' + cls, label), up = () => { send('keyup', key); b.classList.remove('on'); };
    b.addEventListener('pointerdown', e => { e.preventDefault(); send('keydown', key); b.classList.add('on'); });
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
  };
  btn('t-act', 'A', 'e'); btn('t-jrn', 'Journal', 'j'); btn('t-back', 'Back', 'Escape');
  document.getElementById('talk').addEventListener('click', () => { send('keydown', 'e'); send('keyup', 'e'); }); // tap the dialogue to continue
  document.addEventListener('gesturestart', e => e.preventDefault()); // no pinch-zoom on iOS
})();
