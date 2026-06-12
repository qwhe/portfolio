/* ============================================
   方案B3 · 尘海聚字 Dust Sea Calligraphy
   三维尘海纵深 + 「四时有礼」由粒子汇聚而成
   开场光波左→右扫过，尘随波聚成笔画
   拂过即散、离手复聚、点击爆散（连带尘海震荡）
   ============================================ */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const hero = document.querySelector('.xu');
  const canvas = document.querySelector('.ink-canvas');
  const titleEl = document.querySelector('.xu-name');
  const centerEl = document.querySelector('.xu-center');
  if (!hero || !canvas || !titleEl) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const hintEl = document.querySelector('.xu-hint');
  if (hintEl) hintEl.textContent = '拂过即散，离手复聚 · 点一下试试';

  const isMobile = window.matchMedia('(hover: none)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const MAX_PARTICLES = isMobile ? 1400 : 2800;

  let W, H;
  function sizeCanvas() {
    W = hero.clientWidth; H = hero.clientHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  sizeCanvas();

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
  const glowGold = makeGlow(32, 222, 200, 150);

  // ---------- 字形采样（同原版：末字朱砂） ----------
  titleEl.style.opacity = '0';
  titleEl.style.transition = 'none';
  let particles = [], textRect = null;

  function buildTargets() {
    if (centerEl) centerEl.style.transform = '';
    const rect = titleEl.getBoundingClientRect();
    const heroRect = hero.getBoundingClientRect();
    const offX = rect.left - heroRect.left;
    const offY = rect.top - heroRect.top;
    textRect = { x: offX, y: offY, w: rect.width, h: rect.height };

    const off = document.createElement('canvas');
    off.width = Math.max(2, Math.round(rect.width));
    off.height = Math.max(2, Math.round(rect.height));
    const o = off.getContext('2d');
    const cs = getComputedStyle(titleEl);
    o.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    o.textBaseline = 'middle';
    o.textAlign = 'center';
    const text = titleEl.textContent.trim();
    const ls = parseFloat(cs.letterSpacing) || 0;
    const chars = [...text];
    const widths = chars.map((ch) => o.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + ls * (chars.length - 1);
    let cx = off.width / 2 - total / 2;
    let lastStart = 0;
    chars.forEach((ch, i) => {
      const w = widths[i];
      o.fillStyle = '#fff';
      o.fillText(ch, cx + w / 2, off.height / 2);
      if (i === chars.length - 1) lastStart = cx;
      cx += w + ls;
    });

    const img = o.getImageData(0, 0, off.width, off.height).data;
    const gap = Math.max(2, Math.round(rect.width / (isMobile ? 130 : 230)));
    const targets = [];
    for (let y = 0; y < off.height; y += gap) {
      for (let x = 0; x < off.width; x += gap) {
        if (img[(y * off.width + x) * 4 + 3] > 128) {
          targets.push({ lx: x, ly: y, cinna: x >= lastStart });
        }
      }
    }
    return targets;
  }

  const settled = location.search.indexOf('settled=1') !== -1;

  function initParticles() {
    let pts = buildTargets();
    if (pts.length > MAX_PARTICLES) {
      const out = [], step = pts.length / MAX_PARTICLES;
      for (let i = 0; i < MAX_PARTICLES; i++) out.push(pts[Math.floor(i * step)]);
      pts = out;
    }
    particles = pts.map((tg) => {
      // 出生在「深空」：随机散布，自带深度（远=小且淡）
      const z0 = 1.4 + Math.random() * 1.6;
      return {
        lx: tg.lx, ly: tg.ly,                    // 字形局部目标
        x: Math.random() * W, y: Math.random() * H,
        vx: 0, vy: 0,
        z: settled ? 1 : z0,                     // 汇聚时 z→1，营造从深处飞来
        spring: 0.0085 + Math.random() * 0.013,
        damp: 0.88 + Math.random() * 0.04,
        size: 0.9 + Math.random() * 1.6,
        baseA: 0.5 + Math.random() * 0.5,
        glow: tg.cinna ? glowCinna : glowPaper,
        gold: !tg.cinna && Math.random() < 0.12, // 少量金砂混在白字里
        jx: Math.random() * Math.PI * 2,
        jf: 0.01 + Math.random() * 0.03,
        active: settled,
      };
    });
    if (settled) for (const p of particles) { p.x = textRect.x + p.lx; p.y = textRect.y + p.ly; }
  }

  // ---------- 三维尘海（背景层） ----------
  const N = isMobile ? 240 : 620;
  const Z_NEAR = 0.22, Z_FAR = 3.0;
  let dust = [];
  function initDust() {
    dust = [];
    for (let i = 0; i < N; i++) {
      dust.push({
        x: (Math.random() - 0.5) * W * 1.6,
        y: (Math.random() - 0.5) * H * 1.6,
        z: Z_NEAR + Math.random() * (Z_FAR - Z_NEAR),
        vx: 0, vy: 0,
        size: 1.4 + Math.random() * 2.6,
        a: 0.22 + Math.random() * 0.5,
        sway: Math.random() * Math.PI * 2,
        swayF: 0.003 + Math.random() * 0.007,
        cinna: Math.random() < 0.06,
      });
    }
  }
  initDust();

  // ---------- 指针 / 视差 / 点击 ----------
  let mx = -9999, my = -9999;
  let parX = 0, parY = 0, parTX = 0, parTY = 0;
  hero.addEventListener('pointermove', (e) => {
    const rect = hero.getBoundingClientRect();
    mx = e.clientX - rect.left; my = e.clientY - rect.top;
    parTX = (mx / W - 0.5) * 2;
    parTY = (my / H - 0.5) * 2;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { mx = -9999; my = -9999; parTX = 0; parTY = 0; });

  const pulses = [];
  hero.addEventListener('pointerdown', (e) => {
    const rect = hero.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    pulses.push({ x: cx, y: cy, r: 0, power: 1 });
    if (pulses.length > 4) pulses.shift();
    // 字粒子爆散（同原版）
    for (const p of particles) {
      if (!p.active) continue;
      const dx = p.x - cx, dy = p.y - cy;
      const d = Math.sqrt(dx * dx + dy * dy) + 0.01;
      const f = Math.min(2600 / d, 30);
      p.vx += (dx / d) * f * (0.5 + Math.random());
      p.vy += (dy / d) * f * (0.5 + Math.random());
    }
  });

  let ready = false, bornAt = null;
  const fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  fontsReady.then(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => { initParticles(); ready = true; }));
  });
  window.addEventListener('resize', () => { sizeCanvas(); initDust(); if (ready) initParticles(); });

  const REVEAL_MS = 2600;
  const SWEEP_GAP = 6500;
  const REPEL = isMobile ? 70 : 95, REPEL2 = REPEL * REPEL;
  const LIGHT = 160, LIGHT2 = LIGHT * LIGHT;
  let t = 0;

  function frame(now) {
    t++;
    ctx.clearRect(0, 0, W, H);

    parX += (parTX - parX) * 0.04;
    parY += (parTY - parY) * 0.04;
    const tox = -parX * 12, toy = -parY * 8;
    if (centerEl) centerEl.style.transform = `translate3d(${tox}px, ${toy}px, 0)`;

    ctx.globalCompositeOperation = 'lighter';

    // ----- 尘海（远→近） -----
    dust.sort((p, q) => q.z - p.z);
    const cxs = W / 2, cys = H / 2;
    for (const p of dust) {
      p.z -= 0.0016;
      p.sway += p.swayF;
      p.x += Math.sin(p.sway) * 0.3 + p.vx;
      p.y += Math.cos(p.sway * 0.8) * 0.18 - 0.06 + p.vy;
      p.vx *= 0.94; p.vy *= 0.94;
      if (p.z < Z_NEAR) {
        p.z = Z_FAR;
        p.x = (Math.random() - 0.5) * W * 1.6;
        p.y = (Math.random() - 0.5) * H * 1.6;
      }
      const par = (1 / p.z) * 36;
      const px = cxs + p.x / p.z - parX * par;
      const py = cys + p.y / p.z - parY * par;
      if (px < -30 || px > W + 30 || py < -30 || py > H + 30) continue;
      for (const pu of pulses) {
        const dx = px - pu.x, dy = py - pu.y;
        const d = Math.sqrt(dx * dx + dy * dy) + 0.01;
        const band = Math.exp(-Math.pow((d - pu.r) / 60, 2)) * pu.power;
        if (band > 0.01) {
          p.vx += (dx / d) * band * 3.2 * p.z;
          p.vy += (dy / d) * band * 3.2 * p.z;
        }
      }
      const s = (p.size / p.z) * 3.4;
      let alpha = p.a * Math.min(1, 1.6 / p.z);
      if (p.z < 0.55) alpha *= (p.z - Z_NEAR) / (0.55 - Z_NEAR) * 0.8 + 0.2;
      if (mx > -999) {
        const dx = px - mx, dy = py - my, d2 = dx * dx + dy * dy;
        if (d2 < LIGHT2) alpha += (1 - Math.sqrt(d2) / LIGHT) * 0.3;
      }
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.drawImage(p.cinna ? glowCinna : glowPaper, px - s / 2, py - s / 2, s, s);
    }

    for (let i = pulses.length - 1; i >= 0; i--) {
      pulses[i].r += 9;
      pulses[i].power *= 0.97;
      if (pulses[i].power < 0.03) pulses.splice(i, 1);
    }

    // ----- 聚尘成字 -----
    if (ready && particles.length) {
      if (bornAt === null) bornAt = now;
      const reveal = settled ? 1 : Math.min(1, (now - bornAt) / REVEAL_MS);
      const sweepX = reveal * (textRect.w + 320) - 160;

      // 周期掠光（汇聚完成后）
      let bandX = -1e4;
      if (reveal >= 1) {
        const cyc = ((now - (bornAt + REVEAL_MS)) % SWEEP_GAP) / SWEEP_GAP;
        if (cyc < 0.32) bandX = (cyc / 0.32) * (textRect.w + 300) - 150;
      }

      for (const p of particles) {
        // 光波扫到，开始汇聚
        if (!p.active && p.lx <= sweepX) p.active = true;

        const txp = textRect.x + p.lx + tox;
        const typ = textRect.y + p.ly + toy;

        if (p.active) {
          p.vx += (txp - p.x) * p.spring;
          p.vy += (typ - p.y) * p.spring;
          if (p.z > 1) p.z = Math.max(1, p.z - 0.03);   // 从深处推近
        } else {
          // 未激活：作为浮尘漂着
          p.x += Math.sin(t * 0.008 + p.jx) * 0.25;
          p.y += Math.cos(t * 0.006 + p.jx) * 0.18 - 0.05;
        }

        if (mx > -999 && p.active) {
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

        const dist = Math.hypot(txp - p.x, typ - p.y);
        const settle = 1 - Math.min(dist / 220, 1) * 0.55;
        const breathe = 0.8 + 0.2 * Math.sin(t * p.jf + p.jx);
        let alpha = p.baseA * settle * breathe;
        if (!p.active) alpha = p.baseA * 0.18;          // 未聚时若隐若现
        // 掠光增辉
        alpha += Math.exp(-Math.pow((p.lx - bandX) / 90, 2)) * 0.7;
        // 指尖照亮
        if (mx > -999) {
          const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
          if (d2 < LIGHT2) alpha += (1 - Math.sqrt(d2) / LIGHT) * 0.25;
        }

        const depthScale = 1 / Math.max(1, p.z);
        const s = p.size * 3.2 * (0.55 + 0.45 * depthScale);
        ctx.globalAlpha = Math.min(1, alpha * (0.5 + 0.5 * depthScale));
        const glow = p.gold && breathe > 0.93 ? glowGold : p.glow;
        ctx.drawImage(glow, p.x - s / 2, p.y - s / 2, s, s);
      }
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  let running = true, rafId = requestAnimationFrame(loop);
  function loop(now) { frame(now); rafId = requestAnimationFrame(loop); }

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
