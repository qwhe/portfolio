/* ============================================
   墨线流场 · Ink Flow Field
   几千条墨丝沿风场缓行，如绸、如烟、如风过宣纸
   ============================================ */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const hero = document.querySelector('.xu');
  const canvas = document.querySelector('.ink-canvas');
  if (!hero || !canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  const isMobile = window.matchMedia('(hover: none)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const COUNT = isMobile ? 900 : 2200;
  const BG = '#14120F';

  let W, H;
  function resize() {
    W = hero.clientWidth; H = hero.clientHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
  }
  resize();
  window.addEventListener('resize', resize);

  // ---------- 值噪声（平滑流场） ----------
  const P = new Uint8Array(512);
  (function () {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    let seed = 1357;
    for (let i = 255; i > 0; i--) {
      seed = (seed * 16807) % 2147483647;
      const j = seed % (i + 1);
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    for (let i = 0; i < 512; i++) P[i] = p[i & 255];
  })();
  function fade(t) { return t * t * (3 - 2 * t); }
  function grad2(h, x, y) {
    switch (h & 3) {
      case 0: return x + y;
      case 1: return -x + y;
      case 2: return x - y;
      default: return -x - y;
    }
  }
  function noise2(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const a = P[P[X] + Y], b = P[P[X + 1] + Y];
    const c = P[P[X] + Y + 1], d = P[P[X + 1] + Y + 1];
    return (
      (grad2(a, x, y) * (1 - u) + grad2(b, x - 1, y) * u) * (1 - v) +
      (grad2(c, x, y - 1) * (1 - u) + grad2(d, x - 1, y - 1) * u) * v
    ) * 0.7071;
  }

  // ---------- 色彩：宣纸白为主，朱砂点睛，淡墨陪衬 ----------
  function pickStroke() {
    const r = Math.random();
    if (r < 0.06) return 'rgba(180, 58, 43, A)';     // 朱砂 6%
    if (r < 0.22) return 'rgba(152, 145, 127, A)';   // 淡墨 16%
    return 'rgba(214, 207, 192, A)';                 // 宣纸白 78%
  }

  // ---------- 粒子 ----------
  const particles = [];
  function spawn(p) {
    p.x = Math.random() * W;
    p.y = Math.random() * H;
    p.life = 0;
    p.ttl = 240 + Math.random() * 360;
    p.speed = 0.35 + Math.random() * 0.5;
    p.color = pickStroke();
    p.width = Math.random() < 0.12 ? 1.1 : 0.55;
  }
  for (let i = 0; i < COUNT; i++) {
    const p = {};
    spawn(p);
    p.life = Math.random() * p.ttl;  // 错开生命周期
    particles.push(p);
  }

  // ---------- 指针：温柔地扰动风场 ----------
  let mx = -9999, my = -9999, mvx = 0, mvy = 0;
  hero.addEventListener('pointermove', (e) => {
    const rect = hero.getBoundingClientRect();
    const nx = e.clientX - rect.left, ny = e.clientY - rect.top;
    mvx = nx - (mx === -9999 ? nx : mx);
    mvy = ny - (my === -9999 ? ny : my);
    mx = nx; my = ny;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { mx = -9999; my = -9999; });

  // ---------- 主循环 ----------
  const SCALE = 0.0016;   // 流场空间尺度
  let t = 0;

  function frame() {
    t += 0.0022;

    // 半透明罩出残影轨迹
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(20, 18, 15, 0.07)';
    ctx.fillRect(0, 0, W, H);

    ctx.lineCap = 'round';

    for (let i = 0; i < COUNT; i++) {
      const p = particles[i];
      // 流场角度：双层噪声，缓慢演化
      const n = noise2(p.x * SCALE, p.y * SCALE + t) +
                0.5 * noise2(p.x * SCALE * 2.3 + 40, p.y * SCALE * 2.3 - t * 1.4);
      const angle = n * Math.PI * 2.2;
      let vx = Math.cos(angle) * p.speed;
      let vy = Math.sin(angle) * p.speed * 0.85 + 0.06; // 微微向下飘

      // 指针扰动：邻近墨线被轻轻带动
      if (mx > -999) {
        const dx = p.x - mx, dy = p.y - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < 22000) {
          const f = (1 - d2 / 22000) * 0.25;
          vx += mvx * f;
          vy += mvy * f;
        }
      }

      const nx = p.x + vx, ny2 = p.y + vy;

      // 生命周期淡入淡出
      p.life++;
      const k = p.life / p.ttl;
      const alpha = (k < 0.15 ? k / 0.15 : k > 0.75 ? (1 - k) / 0.25 : 1) * 0.34;

      ctx.strokeStyle = p.color.replace('A', alpha.toFixed(3));
      ctx.lineWidth = p.width;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(nx, ny2);
      ctx.stroke();

      p.x = nx; p.y = ny2;

      // 出界或寿终 → 重生
      if (p.life >= p.ttl || p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) {
        spawn(p);
      }
    }
  }

  // 预热：先跑 40 帧，开屏即有墨线
  for (let i = 0; i < 40; i++) frame();

  let running = false, rafId = 0;
  function loop() {
    frame();
    rafId = requestAnimationFrame(loop);
  }
  running = true;
  rafId = requestAnimationFrame(loop);

  const visObserver = new IntersectionObserver((entries) => {
    const visible = entries[0].isIntersecting && !document.hidden;
    if (visible && !running) { running = true; rafId = requestAnimationFrame(loop); }
    else if (!visible && running) { running = false; cancelAnimationFrame(rafId); }
  }, { threshold: 0.02 });
  visObserver.observe(hero);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && running) { running = false; cancelAnimationFrame(rafId); }
    else if (!document.hidden && !running) { running = true; rafId = requestAnimationFrame(loop); }
  });
})();
