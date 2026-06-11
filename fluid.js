/* ============================================
   聚尘成礼 · Particle Calligraphy
   微尘聚成「四时有礼」，指尖拂过即散，离开复聚
   ============================================ */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const hero = document.querySelector('.xu');
  const canvas = document.querySelector('.ink-canvas');
  const titleEl = document.querySelector('.xu-name');
  if (!hero || !canvas || !titleEl) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const isMobile = window.matchMedia('(hover: none)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const MAX_PARTICLES = isMobile ? 1500 : 3200;

  let W, H;
  function sizeCanvas() {
    W = hero.clientWidth; H = hero.clientHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  sizeCanvas();

  // ---------- 柔光贴图 ----------
  function makeGlow(size, r, g, b) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g2 = c.getContext('2d');
    const grad = g2.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
    grad.addColorStop(0.4, `rgba(${r},${g},${b},0.5)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    g2.fillStyle = grad;
    g2.fillRect(0, 0, size, size);
    return c;
  }
  const glowPaper = makeGlow(32, 234, 228, 212);
  const glowCinna = makeGlow(32, 196, 84, 64);

  // ---------- 从标题元素采样目标点 ----------
  // 标题 HTML 保留（SEO/无障碍），视觉由粒子呈现
  titleEl.style.opacity = '0';
  titleEl.style.transition = 'none';

  let particles = [];

  function buildTargets() {
    const rect = titleEl.getBoundingClientRect();
    const heroRect = hero.getBoundingClientRect();
    const offX = rect.left - heroRect.left;
    const offY = rect.top - heroRect.top;

    const off = document.createElement('canvas');
    off.width = Math.max(2, Math.round(rect.width));
    off.height = Math.max(2, Math.round(rect.height));
    const o = off.getContext('2d');
    const cs = getComputedStyle(titleEl);
    o.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    o.textBaseline = 'middle';
    o.textAlign = 'center';
    const text = titleEl.textContent.trim();
    // letter-spacing 手动排布
    const ls = parseFloat(cs.letterSpacing) || 0;
    const chars = [...text];
    const widths = chars.map((ch) => o.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + ls * (chars.length - 1);
    let cx = off.width / 2 - total / 2;
    const charRanges = [];
    chars.forEach((ch, i) => {
      const w = widths[i];
      o.fillStyle = '#fff';
      o.fillText(ch, cx + w / 2, off.height / 2);
      charRanges.push([cx, cx + w, ch]);
      cx += w + ls;
    });

    const img = o.getImageData(0, 0, off.width, off.height).data;
    const gap = Math.max(2, Math.round(rect.width / (isMobile ? 130 : 240)));
    const targets = [];
    for (let y = 0; y < off.height; y += gap) {
      for (let x = 0; x < off.width; x += gap) {
        if (img[(y * off.width + x) * 4 + 3] > 128) {
          // 「礼」字用朱砂
          const inLast = charRanges.length && x >= charRanges[charRanges.length - 1][0];
          targets.push({ x: offX + x, y: offY + y, cinna: inLast });
        }
      }
    }
    return targets;
  }

  function initParticles() {
    const targets = buildTargets();
    // 均匀抽样到上限
    let pts = targets;
    if (targets.length > MAX_PARTICLES) {
      pts = [];
      const step = targets.length / MAX_PARTICLES;
      for (let i = 0; i < MAX_PARTICLES; i++) pts.push(targets[Math.floor(i * step)]);
    }
    const settled = location.search.indexOf('settled=1') !== -1;
    particles = pts.map((tg) => ({
      tx: tg.x, ty: tg.y,
      x: settled ? tg.x : Math.random() * W,
      y: settled ? tg.y : Math.random() * H,
      vx: 0, vy: 0,
      spring: 0.022 + Math.random() * 0.03,
      damp: 0.84 + Math.random() * 0.05,
      size: 0.9 + Math.random() * 1.6,
      baseA: 0.5 + Math.random() * 0.5,
      glow: tg.cinna ? glowCinna : glowPaper,
      jx: Math.random() * Math.PI * 2,
      jf: 0.01 + Math.random() * 0.03,
    }));
  }

  // 字体就绪后再采样（否则量到回退字体）
  let ready = false;
  const fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  fontsReady.then(() => {
    // 双重 rAF 确保字体应用后布局稳定
    requestAnimationFrame(() => requestAnimationFrame(() => {
      initParticles();
      ready = true;
    }));
  });

  window.addEventListener('resize', () => {
    sizeCanvas();
    if (ready) initParticles();
  });

  // ---------- 指针 ----------
  let mx = -9999, my = -9999, lastMove = 0;
  hero.addEventListener('pointermove', (e) => {
    const rect = hero.getBoundingClientRect();
    mx = e.clientX - rect.left;
    my = e.clientY - rect.top;
    lastMove = performance.now();
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { mx = -9999; my = -9999; });
  // 点击：全字爆散后复聚
  hero.addEventListener('pointerdown', (e) => {
    const rect = hero.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    for (const p of particles) {
      const dx = p.x - cx, dy = p.y - cy;
      const d = Math.sqrt(dx * dx + dy * dy) + 0.01;
      const f = Math.min(2600 / d, 30);
      p.vx += (dx / d) * f * (0.5 + Math.random());
      p.vy += (dy / d) * f * (0.5 + Math.random());
    }
  });

  // ---------- 主循环 ----------
  let t = 0;
  const REPEL = isMobile ? 70 : 95, REPEL2 = REPEL * REPEL;

  function frame() {
    t++;
    ctx.clearRect(0, 0, W, H);
    if (!particles.length) return;
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // 弹簧归位
      p.vx += (p.tx - p.x) * p.spring;
      p.vy += (p.ty - p.y) * p.spring;

      // 指针吹散
      if (mx > -999) {
        const dx = p.x - mx, dy = p.y - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < REPEL2 && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const f = (1 - d / REPEL) * 2.6;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
      }

      p.vx *= p.damp;
      p.vy *= p.damp;
      p.x += p.vx;
      p.y += p.vy;

      // 呼吸微光 + 距目标越近越实
      const settle = 1 - Math.min(Math.hypot(p.tx - p.x, p.ty - p.y) / 220, 1) * 0.55;
      const breathe = 0.8 + 0.2 * Math.sin(t * p.jf + p.jx);
      ctx.globalAlpha = p.baseA * settle * breathe;
      const s = p.size * 3.2;
      ctx.drawImage(p.glow, p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

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
