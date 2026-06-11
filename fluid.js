/* ============================================
   月尘 · Moondust
   柔光微尘缓缓漂浮，指尖拂过，轻轻散开微亮
   ============================================ */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const hero = document.querySelector('.xu');
  const canvas = document.querySelector('.ink-canvas');
  if (!hero || !canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const isMobile = window.matchMedia('(hover: none)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const COUNT = isMobile ? 110 : 230;

  let W, H;
  function resize() {
    W = hero.clientWidth; H = hero.clientHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // ---------- 预渲染柔光光斑（高斯光晕贴图） ----------
  function makeGlow(size, r, g, b) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g2 = c.getContext('2d');
    const grad = g2.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
    grad.addColorStop(0.35, `rgba(${r},${g},${b},0.45)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    g2.fillStyle = grad;
    g2.fillRect(0, 0, size, size);
    return c;
  }
  const glowPaper = makeGlow(64, 232, 226, 210);   // 宣纸暖白
  const glowCinna = makeGlow(64, 212, 110, 90);    // 柔化朱砂
  const glowMoon  = makeGlow(64, 200, 205, 215);   // 月白偏冷

  // ---------- 微尘 ----------
  const motes = [];
  function spawn(m, anywhere) {
    m.x = Math.random() * W;
    m.y = anywhere ? Math.random() * H : H + 20 + Math.random() * 40;
    m.depth = 0.25 + Math.random() * 0.75;          // 景深：远小近大
    m.size = (2.5 + Math.random() * 9) * m.depth;
    m.baseA = (0.10 + Math.random() * 0.35) * m.depth;
    m.vy = -(0.06 + Math.random() * 0.16) * m.depth; // 缓缓上浮
    m.swayAmp = 14 + Math.random() * 30;
    m.swayFreq = 0.0018 + Math.random() * 0.0022;
    m.phase = Math.random() * Math.PI * 2;
    m.twinkleFreq = 0.008 + Math.random() * 0.018;
    m.twinklePhase = Math.random() * Math.PI * 2;
    const r = Math.random();
    m.glow = r < 0.07 ? glowCinna : r < 0.45 ? glowMoon : glowPaper;
    m.ox = 0; m.oy = 0;                              // 指针扰动偏移
    m.bright = 0;                                    // 指针点亮
  }
  for (let i = 0; i < COUNT; i++) {
    const m = {};
    spawn(m, true);
    motes.push(m);
  }

  // ---------- 指针 ----------
  let mx = -9999, my = -9999;
  hero.addEventListener('pointermove', (e) => {
    const rect = hero.getBoundingClientRect();
    mx = e.clientX - rect.left;
    my = e.clientY - rect.top;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { mx = -9999; my = -9999; });

  // ---------- 主循环 ----------
  let t = 0;
  const RADIUS = 150, RADIUS2 = RADIUS * RADIUS;

  function frame() {
    t++;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < COUNT; i++) {
      const m = motes[i];

      // 漂浮：上浮 + 正弦左右摇曳
      m.y += m.vy;
      const sway = Math.sin(t * m.swayFreq * 60 * 0.016 + m.phase) * 0.18 * m.depth;

      // 指针交互：温柔避让 + 点亮
      let targetOx = 0, targetOy = 0, targetBright = 0;
      if (mx > -999) {
        const dx = (m.x + m.ox) - mx, dy = (m.y + m.oy) - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < RADIUS2 && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const f = (1 - d / RADIUS);
          const push = f * f * 46 * m.depth;
          targetOx = (dx / d) * push;
          targetOy = (dy / d) * push;
          targetBright = f * 0.5;
        }
      }
      m.ox += (targetOx - m.ox) * 0.06;
      m.oy += (targetOy - m.oy) * 0.06;
      m.bright += (targetBright - m.bright) * 0.08;
      m.x += sway;

      // 呼吸般的微闪
      const twinkle = 0.75 + 0.25 * Math.sin(t * m.twinkleFreq * 60 * 0.016 + m.twinklePhase);
      const alpha = Math.min(m.baseA * twinkle + m.bright, 0.85);

      const px = m.x + m.ox, py = m.y + m.oy;
      const s = m.size * (1 + m.bright * 0.5);
      ctx.globalAlpha = alpha;
      ctx.drawImage(m.glow, px - s, py - s, s * 2, s * 2);

      // 飘出顶部 → 从底部重生
      if (m.y < -30) spawn(m, false);
      if (m.x < -40) m.x = W + 30;
      if (m.x > W + 40) m.x = -30;
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // 预热一帧，开屏即见
  frame();

  let running = true, rafId = requestAnimationFrame(loop);
  function loop() {
    frame();
    rafId = requestAnimationFrame(loop);
  }

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
