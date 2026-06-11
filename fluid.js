/* ============================================
   水墨流体 · WebGL Stable Fluids
   墨与朱砂在首屏晕染，如墨入水
   ============================================ */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const hero = document.querySelector('.xu');
  const canvas = document.querySelector('.ink-canvas');
  if (!hero || !canvas) return;

  // ---------- GL 初始化 ----------
  const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
  let gl = canvas.getContext('webgl2', params);
  const isWebGL2 = !!gl;
  if (!gl) gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
  if (!gl) return;

  let halfFloat, supportLinear;
  if (isWebGL2) {
    gl.getExtension('EXT_color_buffer_float');
    supportLinear = !!gl.getExtension('OES_texture_float_linear');
    halfFloat = gl.HALF_FLOAT;
  } else {
    const ext = gl.getExtension('OES_texture_half_float');
    if (!ext) return;
    supportLinear = !!gl.getExtension('OES_texture_half_float_linear');
    halfFloat = ext.HALF_FLOAT_OES;
  }

  const texType = halfFloat;
  const rgba = isWebGL2 ? { internal: gl.RGBA16F, format: gl.RGBA } : { internal: gl.RGBA, format: gl.RGBA };
  const rg = isWebGL2 ? { internal: gl.RG16F, format: gl.RG } : rgba;
  const r = isWebGL2 ? { internal: gl.R16F, format: gl.RED } : rgba;
  const filtering = supportLinear ? gl.LINEAR : gl.NEAREST;

  // ---------- 着色器 ----------
  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }
  const baseVS = compile(gl.VERTEX_SHADER, `
    precision highp float;
    attribute vec2 aPosition;
    varying vec2 vUv;
    varying vec2 vL, vR, vT, vB;
    uniform vec2 texelSize;
    void main () {
      vUv = aPosition * 0.5 + 0.5;
      vL = vUv - vec2(texelSize.x, 0.0);
      vR = vUv + vec2(texelSize.x, 0.0);
      vT = vUv + vec2(0.0, texelSize.y);
      vB = vUv - vec2(0.0, texelSize.y);
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }`);

  function program(fsSrc) {
    const p = gl.createProgram();
    gl.attachShader(p, baseVS);
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fsSrc));
    gl.bindAttribLocation(p, 0, 'aPosition');
    gl.linkProgram(p);
    const uniforms = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const name = gl.getActiveUniform(p, i).name;
      uniforms[name] = gl.getUniformLocation(p, name);
    }
    return { p, u: uniforms };
  }

  const splatProg = program(`
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTarget;
    uniform float aspectRatio;
    uniform vec3 color;
    uniform vec2 point;
    uniform float radius;
    void main () {
      vec2 d = vUv - point;
      d.x *= aspectRatio;
      vec3 splat = exp(-dot(d, d) / radius) * color;
      vec3 base = texture2D(uTarget, vUv).xyz;
      gl_FragColor = vec4(base + splat, 1.0);
    }`);

  const advectProg = program(`
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform vec2 texelSize;
    uniform float dt;
    uniform float dissipation;
    void main () {
      vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
      gl_FragColor = dissipation * texture2D(uSource, coord);
      gl_FragColor.a = 1.0;
    }`);

  const divergenceProg = program(`
    precision highp float;
    varying vec2 vUv, vL, vR, vT, vB;
    uniform sampler2D uVelocity;
    void main () {
      float L = texture2D(uVelocity, vL).x;
      float R = texture2D(uVelocity, vR).x;
      float T = texture2D(uVelocity, vT).y;
      float B = texture2D(uVelocity, vB).y;
      gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
    }`);

  const pressureProg = program(`
    precision highp float;
    varying vec2 vUv, vL, vR, vT, vB;
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;
    void main () {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      float div = texture2D(uDivergence, vUv).x;
      gl_FragColor = vec4((L + R + T + B - div) * 0.25, 0.0, 0.0, 1.0);
    }`);

  const gradientProg = program(`
    precision highp float;
    varying vec2 vUv, vL, vR, vT, vB;
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;
    void main () {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      vec2 v = texture2D(uVelocity, vUv).xy;
      v -= vec2(R - L, T - B) * 0.5;
      gl_FragColor = vec4(v, 0.0, 1.0);
    }`);

  const displayProg = program(`
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    void main () {
      vec3 c = texture2D(uTexture, vUv).rgb;
      float m = max(c.r, max(c.g, c.b));
      float a = clamp(pow(m, 0.55) * 1.5, 0.0, 0.95);
      gl_FragColor = vec4(c * 1.7, a);
    }`);

  // ---------- 几何 ----------
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  function blit(target) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // ---------- FBO ----------
  function createFBO(w, h, fmt, filter) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, fmt.internal, w, h, 0, fmt.format, texType, null);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { fb, tex, w, h, attach(id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, this.tex); return id; } };
  }
  function doubleFBO(w, h, fmt, filter) {
    let a = createFBO(w, h, fmt, filter), b = createFBO(w, h, fmt, filter);
    return {
      get read() { return a; }, get write() { return b; },
      swap() { const t = a; a = b; b = t; }, w, h,
    };
  }

  const isMobile = window.matchMedia('(hover: none)').matches;
  const SIM = isMobile ? 80 : 120;
  const DYE = isMobile ? 320 : 512;

  let velocity, dye, divergence, pressure;
  let simW, simH, dyeW, dyeH;

  function initFBOs() {
    const aspect = canvas.width / canvas.height;
    simH = SIM; simW = Math.round(SIM * aspect);
    dyeH = DYE; dyeW = Math.round(DYE * aspect);
    velocity = doubleFBO(simW, simH, rg, filtering);
    dye = doubleFBO(dyeW, dyeH, rgba, filtering);
    divergence = createFBO(simW, simH, r, gl.NEAREST);
    pressure = doubleFBO(simW, simH, r, gl.NEAREST);
  }

  function resize() {
    const w = hero.clientWidth, h = hero.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(w * dpr * 0.7);
    canvas.height = Math.round(h * dpr * 0.7);
    initFBOs();
  }
  resize();
  window.addEventListener('resize', resize);

  // ---------- 墨色 ----------
  const palette = [
    [0.62, 0.16, 0.10],   // 朱砂
    [0.78, 0.74, 0.66],   // 宣纸白
    [0.30, 0.07, 0.05],   // 深朱
    [0.42, 0.38, 0.33],   // 淡墨
  ];
  function pickColor(scale) {
    const c = palette[Math.floor(Math.random() * palette.length)];
    const s = scale * (0.7 + Math.random() * 0.6);
    return [c[0] * s, c[1] * s, c[2] * s];
  }

  // ---------- 模拟步骤 ----------
  function splat(x, y, dx, dy, color) {
    gl.useProgram(splatProg.p);
    gl.uniform1i(splatProg.u.uTarget, velocity.read.attach(0));
    gl.uniform1f(splatProg.u.aspectRatio, canvas.width / canvas.height);
    gl.uniform2f(splatProg.u.point, x, y);
    gl.uniform3f(splatProg.u.color, dx, dy, 0);
    gl.uniform1f(splatProg.u.radius, 0.004);
    gl.viewport(0, 0, simW, simH);
    blit(velocity.write.fb);
    velocity.swap();

    gl.uniform1i(splatProg.u.uTarget, dye.read.attach(0));
    gl.uniform3f(splatProg.u.color, color[0], color[1], color[2]);
    gl.uniform1f(splatProg.u.radius, 0.009);
    gl.viewport(0, 0, dyeW, dyeH);
    blit(dye.write.fb);
    dye.swap();
  }

  let lastTime = performance.now();
  function step() {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.016);
    lastTime = now;

    gl.disable(gl.BLEND);

    // 平流速度场
    gl.useProgram(advectProg.p);
    gl.uniform2f(advectProg.u.texelSize, 1 / simW, 1 / simH);
    gl.uniform1i(advectProg.u.uVelocity, velocity.read.attach(0));
    gl.uniform1i(advectProg.u.uSource, velocity.read.attach(0));
    gl.uniform1f(advectProg.u.dt, dt * simW);
    gl.uniform1f(advectProg.u.dissipation, 0.995);
    gl.viewport(0, 0, simW, simH);
    blit(velocity.write.fb);
    velocity.swap();

    // 散度
    gl.useProgram(divergenceProg.p);
    gl.uniform2f(divergenceProg.u.texelSize, 1 / simW, 1 / simH);
    gl.uniform1i(divergenceProg.u.uVelocity, velocity.read.attach(0));
    blit(divergence.fb);

    // 压力求解
    gl.useProgram(pressureProg.p);
    gl.uniform2f(pressureProg.u.texelSize, 1 / simW, 1 / simH);
    gl.uniform1i(pressureProg.u.uDivergence, divergence.attach(0));
    for (let i = 0; i < 18; i++) {
      gl.uniform1i(pressureProg.u.uPressure, pressure.read.attach(1));
      blit(pressure.write.fb);
      pressure.swap();
    }

    // 去散度
    gl.useProgram(gradientProg.p);
    gl.uniform2f(gradientProg.u.texelSize, 1 / simW, 1 / simH);
    gl.uniform1i(gradientProg.u.uPressure, pressure.read.attach(0));
    gl.uniform1i(gradientProg.u.uVelocity, velocity.read.attach(1));
    blit(velocity.write.fb);
    velocity.swap();

    // 平流染料
    gl.useProgram(advectProg.p);
    gl.uniform2f(advectProg.u.texelSize, 1 / simW, 1 / simH);
    gl.uniform1i(advectProg.u.uVelocity, velocity.read.attach(0));
    gl.uniform1i(advectProg.u.uSource, dye.read.attach(1));
    gl.uniform1f(advectProg.u.dt, dt * simW);
    gl.uniform1f(advectProg.u.dissipation, 0.996);
    gl.viewport(0, 0, dyeW, dyeH);
    blit(dye.write.fb);
    dye.swap();

    // 渲染到屏幕
    gl.useProgram(displayProg.p);
    gl.uniform1i(displayProg.u.uTexture, dye.read.attach(0));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    blit(null);
  }

  // ---------- 交互 ----------
  let px = 0.5, py = 0.5, hasPointer = false;
  function pointerPos(e) {
    const rect = hero.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return [cx / rect.width, 1 - cy / rect.height];
  }
  hero.addEventListener('pointermove', (e) => {
    const [x, y] = pointerPos(e);
    if (hasPointer) {
      const dx = (x - px) * 900;
      const dy = (y - py) * 900;
      if (Math.abs(dx) > 0.4 || Math.abs(dy) > 0.4) {
        splat(x, y, dx, dy, pickColor(0.8));
      }
    }
    px = x; py = y; hasPointer = true;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { hasPointer = false; });

  // 闲时自动晕染
  let idleTimer = 0;
  function idleSplat() {
    const x = 0.15 + Math.random() * 0.7;
    const y = 0.2 + Math.random() * 0.6;
    const angle = Math.random() * Math.PI * 2;
    const force = 220 + Math.random() * 300;
    splat(x, y, Math.cos(angle) * force, Math.sin(angle) * force, pickColor(0.85));
  }
  // 开场五笔：立即三笔（并同步渲染一帧），延时两笔
  idleSplat(); idleSplat(); idleSplat();
  step();
  setTimeout(idleSplat, 700);
  setTimeout(idleSplat, 1400);

  // ---------- 主循环（首屏可见时才运行） ----------
  let running = false, rafId = 0;
  function loop(now) {
    idleTimer += 16;
    if (idleTimer > 1700) { idleTimer = 0; idleSplat(); }
    step();
    rafId = requestAnimationFrame(loop);
  }
  // 立即启动；Observer 只负责离屏暂停
  running = true; lastTime = performance.now(); rafId = requestAnimationFrame(loop);
  const visObserver = new IntersectionObserver((entries) => {
    const visible = entries[0].isIntersecting && !document.hidden;
    if (visible && !running) { running = true; lastTime = performance.now(); rafId = requestAnimationFrame(loop); }
    else if (!visible && running) { running = false; cancelAnimationFrame(rafId); }
  }, { threshold: 0.02 });
  visObserver.observe(hero);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && running) { running = false; cancelAnimationFrame(rafId); }
    else if (!document.hidden && !running) { running = true; lastTime = performance.now(); rafId = requestAnimationFrame(loop); }
  });
})();
