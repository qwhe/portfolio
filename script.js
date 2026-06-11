// ---------- 滚动渐显 ----------
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
);
document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

// ---------- 数字滚动 ----------
function animateCount(el) {
  const target = parseInt(el.dataset.count, 10);
  if (reduceMotion) { el.textContent = target.toLocaleString(); return; }
  const duration = 1600;
  const start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 4);
    el.textContent = Math.round(target * eased).toLocaleString();
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
const statObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        statObserver.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.6 }
);
document.querySelectorAll('.stat-num[data-count]').forEach((el) => statObserver.observe(el));

// ---------- 导航滚动状态 + 卷轴进度 ----------
const nav = document.querySelector('.nav');
const progressBar = document.querySelector('.progress span');
window.addEventListener('scroll', () => {
  nav.classList.toggle('is-scrolled', window.scrollY > 10);
  if (progressBar) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
  }
}, { passive: true });

// ---------- 自定义光标 ----------
const cursor = document.querySelector('.cursor');
if (cursor && window.matchMedia('(hover: hover)').matches && !reduceMotion) {
  let cx = -100, cy = -100, tx = -100, ty = -100;
  document.addEventListener('mousemove', (e) => {
    tx = e.clientX; ty = e.clientY;
    cursor.classList.add('is-active');
  });
  document.addEventListener('mouseleave', () => cursor.classList.remove('is-active'));
  (function loop() {
    cx += (tx - cx) * 0.22;
    cy += (ty - cy) * 0.22;
    cursor.style.left = cx + 'px';
    cursor.style.top = cy + 'px';
    requestAnimationFrame(loop);
  })();
  document.querySelectorAll('a, .piece-media, .w-item').forEach((el) => {
    el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
  });
}
