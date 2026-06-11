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

// ---------- 作品详情 ----------
const WORKS = {
  jixiang: {
    chapter: '卷一 · 新岁', title: '「吉祥如易」新年礼盒',
    client: '易车', year: '2023', cat: '节日礼盒全案 / 插画系统',
    role: '创意 · 插画 · 设计 · 打样 · 大货',
    desc: '为易车 2023 新年定制的员工与客户礼盒。以国潮门楼为主视觉，原创插画体系从礼盒延展至手提袋、红包、对联与周边物料；红蓝撞色在浓烈年味中保留品牌识别。项目以双方案并行推进，从插画绘制、结构选型到量产交付全程主导。',
    images: ['assets/img/newyear-2023.jpg', 'assets/img/newyear-2023-alt.jpg'],
  },
  shu: {
    chapter: '卷一 · 新岁', title: '「鼠你最好」新年礼盒',
    client: '百度', year: '2019', cat: '新年员工礼盒',
    role: '创意 · 设计 · 打样',
    desc: '鼠年新年礼。一反新年惯用的大红大金：白瓷质感的圆形礼盒上，仅以金线勾勒一只伏行的小鼠与「鼠你最好」字样——把红色收进盒内的利是封与卷轴里，开盒才见喜气。克制的外壳与浓烈的内里，是这套礼盒的叙事结构。',
    images: ['assets/img/shu-newyear.jpg'],
  },
  disco: {
    chapter: '卷一 · 新岁', title: '「新年DISCO」员工礼盒',
    client: '自如', year: '2020', cat: '新年员工礼盒',
    role: '创意 · 设计 · 打样 · 大货',
    desc: '把新年开成一场迪斯科。磁带造型的提手礼盒、复古台历与金线舞者插画，红金配色致敬八十年代舞厅美学——年轻公司的新年，就该有年轻的过法。',
    images: ['assets/img/disco-newyear.jpg'],
  },
  jiejie: {
    chapter: '卷一 · 新岁', title: '「节节高升」新年礼盒',
    client: '腾讯', year: '2019', cat: '新年礼盒 / 节气台历',
    role: '创意 · 设计 · 监修',
    desc: '二十四节气台历与抽屉式礼盒成套：烫金剪纸工艺的「节节高升」主题字、节气插画卡与红包利是封——把一整年的好彩头，装进一只可以慢慢拆的红盒子。',
    images: ['assets/img/tencent-newyear-2019.jpg'],
  },
  feilong: {
    chapter: '卷二 · 端阳', title: '「飞龙在天 · 利见大人」端午礼盒',
    client: '百度', year: '2020', cat: '端午高端礼盒',
    role: '创意 · 文案 · 设计 · 打样',
    desc: '取《易经》乾卦九五爻辞「飞龙在天，利见大人」为题。深蓝盒面上星图烫金连成龙形，提手袋以青绿山水插画铺陈——端午礼从民俗叙事升维到文人气象。礼盒结构为翻盖与抽屉复合，金砖造型的粽子内衬层层展开。',
    images: ['assets/img/baidu-dragon-2020.jpg'],
  },
  wulin: {
    chapter: '卷二 · 端阳', title: '「午林萌主」端午礼盒',
    client: '百度', year: '2019', cat: '端午员工礼盒 / 插画 IP',
    role: '选品 · 文案 · 设计 · 打样 · 大货',
    desc: '原创「功夫熊」主题插画——一只会功夫的小熊在粽叶林间过招，贯穿翻盖式礼盒内外。除粽子外配套迷你风扇、玻璃杯等实用周边，是一套被员工留下来当摆件的端午礼。',
    images: ['assets/img/baidu-duanwu-2019.jpg', 'assets/img/baidu-duanwu-2019-alt.jpg'],
  },
  qiyuji: {
    chapter: '卷二 · 端阳', title: '「小度熊端午奇遇记」礼盒',
    client: '百度', year: '2018', cat: '端午员工礼盒',
    role: '创意 · 设计 · 打样 · 大货',
    desc: '湖水蓝抽屉盒配粽叶纹理信封袋：本册、徽章、玩偶与织带一格一物，像收到一封来自夏天的信。小度熊 IP 的大富翁式插画地图铺在盒底，拆礼盒的过程就是一场奇遇。',
    images: ['assets/img/xiaodu-duanwu.jpg'],
  },
  longzhou: {
    chapter: '卷二 · 端阳', title: '「粽寻他千百度」龙舟粽盒',
    client: '百度', year: '2015', cat: '高端礼盒 / 结构设计',
    role: '创意 · 文案 · 结构 · 插画 · 打样',
    desc: '木质龙舟造型的端午高端定制：盒盖如船身层层揭开，鳞浪纹样插画呈龙舟竞渡之势；龙头龙尾为原创图腾绘制。结构、插画与「粽寻他千百度」的文案均为原创——这套 2015 年的作品，至今仍是我对「结构讲故事」的最早证明。',
    images: ['assets/img/dragon-zongzi-2015.jpg', 'assets/img/dragon-zongzi-2015-alt.jpg'],
  },
  guiweiban: {
    chapter: '卷三 · 中秋', title: '「桂为伴，脆相随」中秋礼盒',
    client: '腾讯', year: '2021', cat: '高端礼盒 / 图案与包装',
    role: '图案设计 · 包装设计',
    desc: '水墨远山与桂枝在长盒上展开成一幅手卷，企鹅与玉兔守在月亮升起的地方。礼盒以原木色与暖金为基调，几乎不用品牌色——大厂的中秋礼，也可以安静得像一首诗。包装结构经多轮方案调整，与既有成本、数量及工期约束反复磨合后落地。',
    images: ['assets/img/tencent-moon-2021.jpg'],
  },
  tianwai: {
    chapter: '卷三 · 中秋', title: '「天外来物」中秋礼盒',
    client: '易车', year: '2022', cat: '节日礼盒全案',
    role: '选品 · 文案 · 设计 · 打样 · 大货',
    desc: '以「陨石与月球」为概念的中秋礼盒：盒面星点线路图环绕宇航员徽章，月饼做成陨石肌理，开盒即是登月现场。从概念提案、选品、文案到打样与量产全程主导——这套礼盒也是「小饼如嚼月，中有酥和饴」的太空版注脚。',
    images: ['assets/img/mooncake-2022.jpg', 'assets/img/mooncake-2022-alt.jpg'],
  },
  aiwant: {
    chapter: '卷三 · 中秋', title: '《AI WANT TO SEE YOU》中秋礼盒',
    client: '百度', year: '2018', cat: '中秋员工礼盒全案',
    role: '创意 · 文案 · 设计 · 打样 · 大货',
    desc: '主题语「AI WANT TO SEE YOU」一语双关，致意百度的 AI 战略。克莱因蓝礼盒群、橙金线路图桌垫与一盏月球灯构成「AI 的月球漫游」世界观——技术公司的浪漫，是把代码画成星图。',
    images: ['assets/img/baidu-ai-2018.jpg'],
  },
  dengyue: {
    chapter: '卷三 · 中秋', title: '「登月派对」中秋礼盒',
    client: '百度', year: '2018', cat: '员工礼盒 / 结构包装',
    role: '创意 · 结构 · 插画 · 打样',
    desc: '火箭造型的包装结构群：咖啡杯、月饼盒、幸运星罐各自是一节箭体，红蓝单线插画绘出舱体仪表。拆开礼盒的过程，就是一场发射倒计时。',
    images: ['assets/img/moonparty-2021.jpg'],
  },
  kuayue: {
    chapter: '卷三 · 中秋', title: '「跨 · 月」中秋礼盒',
    client: '度小满', year: '2018', cat: '中秋员工礼盒',
    role: '选品 · 文案 · 设计 · 打样 · 大货',
    desc: '金融公司的中秋，稳和雅都要：黑金双色克制铺陈，杯、咖啡、月饼与钥匙扣各居其位；「跨月」既是中秋的月，也是度小满从百度独立后跨出的第一步——礼盒替公司说了这句话。',
    images: ['assets/img/duxiaoman-moon-2018.jpg'],
  },
  kun: {
    chapter: '卷四 · 庆典', title: '支付宝「鲲」高端摆件',
    client: '蚂蚁金服', year: '2020', cat: '科技出海主题定制',
    role: '创意 · 3D 建模渲染 · 方案',
    desc: '「北冥有鱼，其名为鲲。」低多边形的鲲跃出缠绕的银色浪线，电镀玫瑰金与水晶底座上刻着世界地标剪影——致敬支付宝的出海征程。全程以 3D 建模渲染推演造型与工艺可行性。',
    images: ['assets/img/alipay-whale-2020.jpg'],
  },
  fu: {
    chapter: '卷四 · 庆典', title: '「福」高端商务摆件',
    client: '蚂蚁金服', year: '2020', cat: '高端定制',
    role: '创意 · 设计 · 方案',
    desc: '手写「福」字与水墨山水、蚂蚁行迹融合于鎏金圆框之中，配以同语境的品牌礼盒。设计语出蚂蚁金服的初心：「每个人都值得被认真对待」——把企业价值观做成一件可以摆在案头的器物。',
    images: ['assets/img/antfu-2020.jpg'],
  },
  xiangcha: {
    chapter: '卷四 · 庆典', title: '云朵香插',
    client: '腾讯', year: '2018', cat: '高端定制',
    role: '创意 · 设计 · 打样',
    desc: '微信对话气泡 LOGO 立体化为铜质香插：金属曲线悬停在木质底座上，一炷香的烟从「对话」中升起。科技品牌也该有一件让人慢下来的器物——这件作品后来成为腾讯高端礼赠的常青款。',
    images: ['assets/img/wechat-incense-2018.jpg', 'assets/img/wechat-incense-2018-alt.jpg'],
  },
  didi: {
    chapter: '卷四 · 庆典', title: '《滴滴大事记》纪念币',
    client: '滴滴', year: '2018', cat: '纪念定制',
    role: '创意 · 设计 · 监修',
    desc: '六枚铜币铸下滴滴从 2012 到 2017 的六个里程碑，嵌于镂空窗格的亚克力框架中，胡桃木底座承托——把一家公司的历史，做成可以摩挲的实物。',
    images: ['assets/img/didi-coins-2018.jpg'],
  },
  frisbee: {
    chapter: '卷四 · 庆典 / 衍生', title: '「转速系列」联名飞盘',
    client: '易车 × GameBoy / 欧拉 / 坦克300', year: '2022', cat: '活动衍生品',
    role: '创意 · 设计 · 打样 · 大货',
    desc: '把轮毂转进飞盘：为三款车型定制盘面图形，轮辐即转速。汽车品牌借飞盘热接住年轻人——系列海报以天空三色区分车型人格。',
    images: ['assets/img/frisbee-2022.jpg'],
  },
  powerbank: {
    chapter: '卷四 · 庆典 / 衍生', title: '易小鲨太空舱充电宝',
    client: '易车', year: '2021', cat: 'IP 衍生品 / 3C 定制',
    role: '外观设计 · 评估 · OME 落地',
    desc: '品牌 IP「易小鲨」住进太空舱：舱窗里的小鲨鱼是软胶内胆，舱体为充电宝本体。从外观设计、结构评估到产线落地——让 IP 形象成为天天被摸到的实用周边。',
    images: ['assets/img/powerbank-2021.jpg', 'assets/img/powerbank-2021-alt.jpg'],
  },
  xiaodu: {
    chapter: '卷四 · 庆典 / 衍生', title: '小度熊形象衍生',
    client: '百度', year: '2018', cat: 'IP 形象 / 3D 设计',
    role: '3D 建模 · 渲染 · 方案',
    desc: '同一只小度熊的多种材质人格：拉丝金属、透明亚克力、糖果色注塑——全系 3D 建模渲染，为 IP 量产探索材质与工艺边界。',
    images: ['assets/img/xiaodu-robots.jpg'],
  },
  luban: {
    chapter: '卷四 · 庆典 / 衍生', title: '「鲁班」手机支架',
    client: '王者荣耀 IP', year: '2020', cat: 'IP 衍生品',
    role: '创意 · 3D 设计 · 方案',
    desc: '王者荣耀英雄「鲁班七号」坐上 GAME 滑轨：人物盲盒化处理，斜坡即手机支架。游戏 IP 的周边，要让玩家在工位上也能会心一笑。',
    images: ['assets/img/honor-keychains-2020.jpg'],
  },
  meow: {
    chapter: '卷四 · 庆典 / 衍生', title: 'MEOW³ 猫砂盆',
    client: '工业设计项目', year: '2019', cat: '产品 / 工业设计',
    role: '外观设计 · 3D 建模渲染',
    desc: '从礼盒跨进宠物用品：圆角立方体的极简造型、莫兰迪三色，抽屉式清理结构。这件作品证明「全案能力」不止于礼盒——产品外观设计同样在射程之内。',
    images: ['assets/img/meow-2019.jpg'],
  },
  arctic: {
    chapter: '卷四 · 庆典 / 衍生', title: '易车 × 北冰洋限量汽水',
    client: '易车 × 北冰洋', year: '2021', cat: '跨界联名包装',
    role: '罐身设计 · 打样 · 大货',
    desc: '限量版桔汁汽水：律动线条包裹品牌 IP 形象，三款配色构成活动现场的清爽记忆点。老字号汽水与互联网品牌的一次双向年轻化。',
    images: ['assets/img/arctic-soda-2021.jpg', 'assets/img/arctic-soda-2021-alt.jpg'],
  },
};

const modal = document.getElementById('work-modal');
const modalMedia = modal.querySelector('.modal-media');
const modalChapter = modal.querySelector('.modal-chapter');
const modalTitle = modal.querySelector('.modal-title');
const modalMeta = modal.querySelector('.modal-meta');
const modalDesc = modal.querySelector('.modal-desc');

function openWork(id, pushHash = true) {
  const w = WORKS[id];
  if (!w) return;
  modalMedia.innerHTML = w.images.map((src) => `<img src="${src}" alt="${w.title}">`).join('');
  modalChapter.textContent = w.chapter;
  modalTitle.textContent = w.title;
  modalMeta.innerHTML = [
    ['客户', w.client], ['年份', w.year], ['类别', w.cat], ['职责', w.role],
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  modalDesc.textContent = w.desc;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  modal.querySelector('.modal-body').scrollTop = 0;
  if (pushHash) history.pushState({ work: id }, '', '#w/' + id);
}
function closeWork(popState = false) {
  if (!modal.classList.contains('is-open')) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  if (!popState && location.hash.startsWith('#w/')) history.back();
}
document.querySelectorAll('[data-work]').forEach((el) => {
  el.addEventListener('click', () => openWork(el.dataset.work));
});
modal.querySelector('.modal-close').addEventListener('click', () => closeWork());
modal.querySelector('.modal-backdrop').addEventListener('click', () => closeWork());
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeWork(); });
window.addEventListener('popstate', () => {
  if (location.hash.startsWith('#w/')) openWork(location.hash.slice(3), false);
  else closeWork(true);
});
// 直链打开
if (location.hash.startsWith('#w/')) openWork(location.hash.slice(3), false);

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
