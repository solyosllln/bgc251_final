/* =========================================================
   0) UTILS
========================================================= */
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

/* =========================================================
   1) CUSTOM CURSOR with TRAILS (PNG)
========================================================= */
const cursorLayer = document.getElementById('cursor-layer');

if (cursorLayer) {
  const TRAIL_COUNT = 8;
  const SPEED_MAIN = 0.35;
  const SPEED_TRAIL = 0.18;

  const dots = [];
  for (let i = 0; i < TRAIL_COUNT; i++) {
    const d = document.createElement('div');
    d.className = i === 0 ? 'cursor-dot main' : 'cursor-dot trail';
    d.style.opacity = i === 0 ? 1 : 0.22 - i * 0.02;
    cursorLayer.appendChild(d);
    dots.push({ el: d, x: 0, y: 0 });
  }

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;

  window.addEventListener('mousemove', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
  });

  function animateCursor() {
    dots[0].x += (targetX - dots[0].x) * SPEED_MAIN;
    dots[0].y += (targetY - dots[0].y) * SPEED_MAIN;
    dots[0].el.style.transform = `translate(${dots[0].x}px, ${dots[0].y}px) translate(-50%, -50%)`;

    for (let i = 1; i < dots.length; i++) {
      dots[i].x += (dots[i - 1].x - dots[i].x) * SPEED_TRAIL;
      dots[i].y += (dots[i - 1].y - dots[i].y) * SPEED_TRAIL;
      dots[
        i
      ].el.style.transform = `translate(${dots[i].x}px, ${dots[i].y}px) translate(-50%, -50%)`;
    }

    requestAnimationFrame(animateCursor);
  }
  animateCursor();
}

/* =========================================================
   2) (OLD) INTRO ENTER / POSE
   - 구버전 intro(#intro/#enterBtn/#pose-canvas) 있을 때만 실행
========================================================= */
const intro = document.getElementById('intro');
const enterBtn = document.getElementById('enterBtn');

if (intro && enterBtn) {
  function enterSite() {
    intro.classList.remove('is-visible');
    setTimeout(() => {
      location.href = 'main.html';
    }, 900);
  }

  enterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    enterSite();
  });

  intro.addEventListener('click', (e) => {
    if (e.target.id !== 'enterBtn') enterSite();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') enterSite();
  });
}

// pose-canvas 있는 구버전 인트로에서만 실행
const poseCanvas = document.getElementById('pose-canvas');
if (poseCanvas) {
  const ctx = poseCanvas.getContext('2d');

  function resizeCanvas() {
    poseCanvas.width = window.innerWidth;
    poseCanvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const camVideo = document.createElement('video');
  camVideo.style.display = 'none';
  camVideo.autoplay = true;
  camVideo.playsInline = true;
  document.body.appendChild(camVideo);

  const particles = [];
  const MAX_PARTICLES = 4200;
  const DOT_R = 1.8;
  const LIFE_MIN = 180;
  const LIFE_MAX = 320;

  function spawnParticle(x, y) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.7,
      vy: (Math.random() - 0.5) * 0.7,
      life: rand(LIFE_MIN, LIFE_MAX),
    });
    if (particles.length > MAX_PARTICLES) {
      particles.splice(0, particles.length - MAX_PARTICLES);
    }
  }

  function drawParticles() {
    ctx.fillStyle = 'rgba(0,0,0,0.02)';
    ctx.fillRect(0, 0, poseCanvas.width, poseCanvas.height);

    for (let p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;

      ctx.beginPath();
      ctx.arc(p.x, p.y, DOT_R, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,1)';
      ctx.fill();
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      if (particles[i].life <= 0) particles.splice(i, 1);
    }

    requestAnimationFrame(drawParticles);
  }
  ctx.clearRect(0, 0, poseCanvas.width, poseCanvas.height);
  drawParticles();

  const pose = new Pose({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
  });

  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    selfieMode: true,
    minDetectionConfidence: 0.65,
    minTrackingConfidence: 0.65,
  });

  function mapToCover(nx, ny) {
    const cw = poseCanvas.width;
    const ch = poseCanvas.height;

    const vw = camVideo.videoWidth || 640;
    const vh = camVideo.videoHeight || 480;

    const scale = Math.max(cw / vw, ch / vh);
    const displayW = vw * scale;
    const displayH = vh * scale;

    const offsetX = (cw - displayW) / 2;
    const offsetY = (ch - displayH) / 2;

    let x = nx * displayW + offsetX;
    let y = ny * displayH + offsetY;

    x = Math.max(0, Math.min(cw, x));
    y = Math.max(0, Math.min(ch, y));
    return { x, y };
  }

  const FACE_IDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const TORSO_IDS = [11, 12, 23, 24];
  const ARM_IDS = [13, 14, 15, 16];
  const LEG_IDS = [25, 26, 27, 28];

  pose.onResults((results) => {
    if (!results.poseLandmarks) return;
    const lm = results.poseLandmarks;

    function emitAt(idList, count, spread) {
      idList.forEach((id) => {
        const pt = lm[id];
        if (!pt) return;
        const { x, y } = mapToCover(pt.x, pt.y);
        for (let i = 0; i < count; i++) {
          spawnParticle(
            x + (Math.random() - 0.5) * spread,
            y + (Math.random() - 0.5) * spread
          );
        }
      });
    }

    emitAt(FACE_IDS, 26, 10);
    emitAt(TORSO_IDS, 22, 12);
    emitAt(ARM_IDS, 12, 12);
    emitAt(LEG_IDS, 14, 12);

    function sprinkleLine(a, b, count = 10) {
      const A = lm[a],
        B = lm[b];
      if (!A || !B) return;
      for (let i = 0; i < count; i++) {
        const t = i / count;
        const nx = A.x * (1 - t) + B.x * t;
        const ny = A.y * (1 - t) + B.y * t;
        const { x, y } = mapToCover(nx, ny);
        spawnParticle(
          x + (Math.random() - 0.5) * 10,
          y + (Math.random() - 0.5) * 10
        );
      }
    }

    sprinkleLine(11, 12, 28);
    sprinkleLine(11, 23, 26);
    sprinkleLine(12, 24, 26);
    sprinkleLine(23, 24, 28);

    sprinkleLine(11, 13, 14);
    sprinkleLine(13, 15, 14);
    sprinkleLine(12, 14, 14);
    sprinkleLine(14, 16, 14);

    sprinkleLine(23, 25, 18);
    sprinkleLine(25, 27, 18);
    sprinkleLine(24, 26, 18);
    sprinkleLine(26, 28, 18);
  });

  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then((stream) => {
      camVideo.srcObject = stream;
      camVideo.onloadedmetadata = () => {
        camVideo.play();

        const camera = new Camera(camVideo, {
          onFrame: async () => {
            await pose.send({ image: camVideo });
          },
          width: 640,
          height: 480,
        });

        camera.start();
      };
    })
    .catch((err) => console.warn('웹캠 권한이 필요합니다:', err));
}

/* =========================================================
   3) INTRO PAGE (NEW): REAL SEAMLESS INFINITE SLIDER
      - 다중 클론 + scrollLeft 보정 방식
      - 끊김 없이 1-2-...-8-1-2... 자연 반복
========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  const isIntro = document.body.classList.contains('intro-page');
  if (!isIntro) return;

  const gallery = document.getElementById('introGallery');
  const track = document.getElementById('introTrack');
  const dotsWrap = document.getElementById('introDots');
  const prevBtn = document.getElementById('introPrev');
  const nextBtn = document.getElementById('introNext');
  const logoBtn = document.getElementById('introLogo');
  const enterBtnTop = document.getElementById('introEnter');

  if (!gallery || !track || !dotsWrap) return;

  // ====== 원본 카드 수집 ======
  const originalCards = Array.from(track.querySelectorAll('.intro-card'));
  const realCount = originalCards.length;
  if (realCount < 2) return;

  // 로고/ENTER → main
  const goMain = () => (location.href = 'main.html');
  logoBtn?.addEventListener('click', goMain);
  enterBtnTop?.addEventListener('click', goMain);

  // track gap px 읽기 (vw라도 computedStyle엔 px로 들어옴)
  const trackStyle = getComputedStyle(track);
  const gapPx = parseFloat(trackStyle.columnGap || trackStyle.gap || '0') || 0;

  // 카드 평균 폭 구해서 “화면을 채울 정도의 클론 개수(K)” 계산
  const avgCardW =
    originalCards.reduce((s, c) => s + c.offsetWidth, 0) / realCount;
  const K = Math.max(
    2,
    Math.ceil(gallery.clientWidth / (avgCardW + gapPx)) + 1
  );

  // ====== loopWidth(원본 한 바퀴의 길이) 계산 ======
  const loopWidth =
    originalCards.reduce((s, c) => s + c.offsetWidth, 0) +
    gapPx * (realCount - 1);

  // ====== 클론 생성 ======
  const prependClones = [];
  const appendClones = [];

  for (let i = 0; i < K; i++) {
    const last = originalCards[realCount - 1 - i].cloneNode(true);
    last.classList.add('is-clone');
    prependClones.unshift(last); // 순서 유지

    const first = originalCards[i].cloneNode(true);
    first.classList.add('is-clone');
    appendClones.push(first);
  }

  // DOM 삽입
  prependClones.forEach((c) => track.insertBefore(c, track.firstChild));
  appendClones.forEach((c) => track.appendChild(c));

  // “전체 카드(클론 포함) / 실제 카드(원본만)” 재수집
  const cardsAll = Array.from(track.querySelectorAll('.intro-card'));
  const realCards = cardsAll.slice(K, K + realCount); // 가운데 원본 구간

  // ====== dots 생성 (원본 기준) ======
  dotsWrap.innerHTML = '';
  realCards.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'intro-dot';
    dot.type = 'button';
    dot.setAttribute('aria-label', `slide ${i + 1}`);
    dot.addEventListener('click', () => scrollToRealIndex(i, true));
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.querySelectorAll('.intro-dot'));

  // ====== scroll helper ======
  const getCenterLeft = (card) => card.offsetLeft + card.offsetWidth / 2;

  function scrollToCard(card, smooth = true) {
    const left = getCenterLeft(card) - gallery.clientWidth / 2;
    gallery.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
  }
  function scrollToRealIndex(i, smooth = true) {
    scrollToCard(realCards[i], smooth);
  }

  // 초기 위치: 원본 첫 카드가 중앙
  scrollToRealIndex(0, false);

  // ====== active index 계산 (원본 기준) ======
  function getActiveRealIndex() {
    const centerX = gallery.scrollLeft + gallery.clientWidth / 2;
    let bestIdx = 0;
    let bestDist = Infinity;

    realCards.forEach((card, i) => {
      const dist = Math.abs(centerX - getCenterLeft(card));
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    });
    return bestIdx;
  }

  let prevActiveCard = null;

  function updateUI() {
    const realIdx = getActiveRealIndex();
    const activeCard = realCards[realIdx];

    if (prevActiveCard && prevActiveCard !== activeCard) {
      prevActiveCard.classList.add('is-leaving');
      setTimeout(() => prevActiveCard.classList.remove('is-leaving'), 550);
    }

    dots.forEach((d, i) => d.classList.toggle('is-active', i === realIdx));

    // active는 “전체 카드 중 중앙에 가까운 것”으로
    const centerX = gallery.scrollLeft + gallery.clientWidth / 2;
    let bestAllIdx = 0;
    let bestAllDist = Infinity;
    cardsAll.forEach((card, i) => {
      const dist = Math.abs(centerX - getCenterLeft(card));
      if (dist < bestAllDist) {
        bestAllDist = dist;
        bestAllIdx = i;
      }
    });
    cardsAll.forEach((c, i) =>
      c.classList.toggle('is-active', i === bestAllIdx)
    );

    prevActiveCard = activeCard;
    return realIdx;
  }

  updateUI();

  // ====== 진짜 무한루프 보정 ======
  function fixInfiniteLoop() {
    const left = gallery.scrollLeft;

    // 원본 구간의 시작/끝 기준선
    const startBoundary = getCenterLeft(realCards[0]) - gallery.clientWidth / 2;
    const endBoundary =
      getCenterLeft(realCards[realCount - 1]) - gallery.clientWidth / 2;

    // 왼쪽 클론 영역으로 너무 들어가면 → 오른쪽으로 loopWidth만큼 점프
    if (left < startBoundary - loopWidth * 0.5) {
      gallery.scrollLeft += loopWidth;
      return;
    }

    // 오른쪽 클론 영역으로 너무 들어가면 → 왼쪽으로 loopWidth만큼 점프
    if (left > endBoundary + loopWidth * 0.5) {
      gallery.scrollLeft -= loopWidth;
      return;
    }
  }

  // scroll-snap 끝나고 “살짝 늦게” 보정 (끊김/후루룩 방지)
  let snapTimer = null;
  gallery.addEventListener('scroll', () => {
    updateUI();
    clearTimeout(snapTimer);
    snapTimer = setTimeout(() => {
      fixInfiniteLoop();
      updateUI();
    }, 120);
  });

  // ====== arrows ======
  function goSlide(dir) {
    const idx = updateUI();
    let next = idx + dir;

    if (next < 0) next = realCount - 1;
    if (next >= realCount) next = 0;

    scrollToRealIndex(next, true);
  }
  prevBtn?.addEventListener('click', () => goSlide(-1));
  nextBtn?.addEventListener('click', () => goSlide(1));

  // ====== wheel → horizontal ======
  gallery.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      gallery.scrollLeft += e.deltaY * 1.1;
    },
    { passive: false }
  );

  // ====== drag / swipe ======
  let isDown = false;
  let startX = 0;
  let startScroll = 0;

  gallery.addEventListener('pointerdown', (e) => {
    isDown = true;
    startX = e.clientX;
    startScroll = gallery.scrollLeft;
    gallery.setPointerCapture(e.pointerId);
    resetAllTilt();
  });
  gallery.addEventListener('pointermove', (e) => {
    if (!isDown) return;
    const dx = e.clientX - startX;
    gallery.scrollLeft = startScroll - dx;
  });
  gallery.addEventListener('pointerup', () => (isDown = false));
  gallery.addEventListener('pointercancel', () => (isDown = false));

  // ====== 3D / PARALLAX HOVER (active 카드만) ======
  const MAX_TILT = 10;
  const IMG_SHIFT = 14;
  const SCALE_HOVER = 1.03;

  function applyTilt(card, clientX, clientY) {
    const frame = card.querySelector('.intro-card-frame');
    const img = frame?.querySelector('img');
    if (!frame || !img) return;

    const rect = frame.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const dx = (clientX - cx) / (rect.width / 2);
    const dy = (clientY - cy) / (rect.height / 2);

    const tiltX = (-dy * MAX_TILT).toFixed(2);
    const tiltY = (dx * MAX_TILT).toFixed(2);

    frame.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(${SCALE_HOVER})`;

    const baseRot =
      getComputedStyle(img).getPropertyValue('--base-rot')?.trim() || '0deg';

    const imgX = (dx * IMG_SHIFT).toFixed(2);
    const imgY = (dy * IMG_SHIFT).toFixed(2);

    img.style.transform = `translate(-50%, -55%) rotate(${baseRot}) translate(${imgX}px, ${imgY}px)`;
  }

  function resetTilt(card) {
    const frame = card.querySelector('.intro-card-frame');
    const img = frame?.querySelector('img');
    if (!frame || !img) return;
    frame.style.transform = '';
    img.style.transform = '';
  }

  function resetAllTilt() {
    realCards.forEach(resetTilt);
  }

  realCards.forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      if (!card.classList.contains('is-active')) {
        resetTilt(card);
        return;
      }
      applyTilt(card, e.clientX, e.clientY);
    });
    card.addEventListener('pointerleave', () => resetTilt(card));
  });
});
/* =========================================================
   4) MAIN PAGE: Hover Preview Gallery
========================================================= */
const items = document.querySelectorAll('.work-item');
const galleryMain = document.getElementById('gallery');

if (items.length && galleryMain) {
  items.forEach((item) => {
    item.addEventListener('mouseenter', () => {
      const id = item.getAttribute('data-target');
      const target = document.getElementById(id);
      if (target) {
        galleryMain.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
      }
    });
  });
}

/* =========================================================
   5) CLICK ONLY: DETAIL OVERLAY
========================================================= */
const DETAIL_DATA = {
  spam: {
    title: 'Spam Musubi',
    subtitle: '스팸무스비',
    desc: '하와이 대표 간식. 스팸과 밥을 김으로 감싼 오니기리 스타일 음식.',
    images: [
      { src: 'assets/images/p1.jpg', caption: '하와이 로컬 편의점 대표 간식.' },
      { src: 'assets/images/p1_2.jpg', caption: '군수물자 스팸에서 유래.' },
    ],
  },
  poke: {
    title: 'Poke',
    subtitle: '포케',
    desc: '신선한 생선을 간장/참기름 소스에 버무려 먹는 하와이식 회 샐러드.',
    images: [
      { src: 'assets/images/p2.jpg', caption: '어부들의 전통 식사에서 유래.' },
      { src: 'assets/images/p2_2.jpg', caption: '요즘은 포케볼 형태로 변주.' },
    ],
  },
  plate: {
    title: 'Plate Lunch',
    subtitle: '플레이트런치',
    desc: '밥+메인+사이드가 한 접시에 나오는 하와이식 정식.',
    images: [{ src: 'assets/images/p3.jpg', caption: '하와이 로컬 런치.' }],
  },
  loco: {
    title: 'Loco Moco',
    subtitle: '로코모코',
    desc: '밥 위에 햄버그+계란프라이+그레이비 소스를 얹은 소울푸드.',
    images: [{ src: 'assets/images/p4.jpg', caption: '힐로에서 시작.' }],
  },
  shave: {
    title: 'Shave ice',
    subtitle: '쉐이브 아이스',
    desc: '가늘게 간 얼음 위에 시럽을 듬뿍 뿌린 하와이식 디저트.',
    images: [
      { src: 'assets/images/p5.jpg', caption: '무더운 하와이 필수 디저트.' },
    ],
  },
  malasada: {
    title: 'Malasadas',
    subtitle: '말라사다',
    desc: '포르투갈 이민자 문화에서 온 하와이식 도넛.',
    images: [{ src: 'assets/images/p6.jpg', caption: '로컬 스타일 도넛.' }],
  },
  kalua: {
    title: 'Kalua Pig',
    subtitle: '칼루아 피그',
    desc: '지하 화덕 이무(imū)로 익힌 돼지고기 전통 요리.',
    images: [{ src: 'assets/images/p7.jpg', caption: '루아우 잔치 대표.' }],
  },
  laulau: {
    title: 'Laulau',
    subtitle: '라우라우',
    desc: '타로잎에 고기나 생선을 싸서 찐 전통 음식.',
    images: [{ src: 'assets/images/p8.jpg', caption: '전통 조리법.' }],
  },
  poi: {
    title: 'Poi',
    subtitle: '포이',
    desc: '타로를 으깨 발효시킨 전통 음식.',
    images: [{ src: 'assets/images/p9.jpg', caption: '원주민 식문화 핵심.' }],
  },
  butter: {
    title: 'Butter Mochi',
    subtitle: '버터모치',
    desc: '찹쌀가루+코코넛+버터로 만든 쫀득 디저트.',
    images: [{ src: 'assets/images/p10.jpg', caption: '모치+로컬 재료 결합.' }],
  },
  saimin: {
    title: 'Salmin',
    subtitle: '사이민',
    desc: '하와이 로컬 라면/국수.',
    images: [
      { src: 'assets/images/p11.jpg', caption: '농장 노동자 간식에서 시작.' },
    ],
  },
  manapua: {
    title: 'Manapua',
    subtitle: '마나푸아',
    desc: '차슈가 들어간 하와이식 찐빵.',
    images: [{ src: 'assets/images/p12.jpg', caption: '중국 이민 문화 흔적.' }],
  },
  waikiki: {
    title: 'Waikiki Beach',
    subtitle: '와이키키 해변',
    desc: '오아후 대표 해변.',
    images: [{ src: 'assets/images/p13.jpg', caption: '하와이 관광 중심.' }],
  },
};

const detailOverlay = document.getElementById('detailOverlay');
const detailContent = document.getElementById('detailContent');
const detailClose = document.getElementById('detailClose');

if (detailOverlay && detailContent && detailClose && items.length) {
  items.forEach((item) => {
    item.addEventListener('click', () => {
      const key = item.getAttribute('data-key');
      const data = DETAIL_DATA[key];
      if (!data) return;

      const imgsHTML = data.images
        .map(
          (img) => `
          <figure class="detail-figure">
            <img src="${img.src}" alt="${data.title}">
            ${
              img.caption
                ? `<figcaption class="detail-caption">${img.caption}</figcaption>`
                : ''
            }
          </figure>
        `
        )
        .join('');

      detailContent.innerHTML = `
        <h2 class="detail-title">${data.title}</h2>
        <p class="detail-sub">${data.subtitle}</p>
        <p class="detail-desc">${data.desc}</p>
        <div class="detail-gallery">${imgsHTML}</div>
      `;

      detailOverlay.classList.add('is-open');
      detailOverlay.setAttribute('aria-hidden', 'false');
    });
  });

  detailClose.addEventListener('click', () => {
    detailOverlay.classList.remove('is-open');
    detailOverlay.setAttribute('aria-hidden', 'true');
  });
}

/* =========================================================
   6) FLOATING GRAPHICS
========================================================= */
const floatLayer = document.getElementById('float-layer');

if (floatLayer) {
  const FLOAT_IMAGES = [
    'assets/float/f1.png',
    'assets/float/f2.png',
    'assets/float/f3.png',
  ];

  const FLOAT_COUNT = 6;
  const SPAWN_INTERVAL_MS = 1300;
  const LIFE_MS = 11000;
  const FADE_MS = 1200;
  const STOP_SPAWN_AFTER_MS = 15000;

  const floats = [];
  let spawned = 0;
  let allowSpawn = true;

  function pickImage() {
    return FLOAT_IMAGES[Math.floor(Math.random() * FLOAT_IMAGES.length)];
  }

  function spawnOutside(size) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const margin = size * 0.8;
    const side = Math.floor(rand(0, 4));
    if (side === 0) return { x: -margin, y: rand(-margin, h + margin) };
    if (side === 1) return { x: w + margin, y: rand(-margin, h + margin) };
    if (side === 2) return { x: rand(-margin, w + margin), y: -margin };
    return { x: rand(-margin, w + margin), y: h + margin };
  }

  function makeFloat() {
    const el = document.createElement('div');
    el.className = 'float';

    const img = document.createElement('img');
    img.src = pickImage();
    img.alt = '';
    el.appendChild(img);

    const size = rand(220, 380);
    el.style.setProperty('--size', `${size}px`);

    const start = spawnOutside(size);
    const state = {
      el,
      size,
      x: start.x,
      y: start.y,
      tx: rand(0, window.innerWidth),
      ty: rand(0, window.innerHeight),
      speed: rand(0.8, 2.2),
      rot: rand(0, 360),
      rotSpeed: rand(-1.4, 1.4),
      wobble: rand(1.0, 3.4),
      scale: rand(0.95, 1.2),
      t: rand(0, 1000),
      alive: true,
    };

    el.style.left = `${state.x}px`;
    el.style.top = `${state.y}px`;

    floatLayer.appendChild(el);
    floats.push(state);

    requestAnimationFrame(() => el.classList.add('appear'));

    setTimeout(() => {
      state.alive = false;
      el.classList.add('vanish');
      setTimeout(() => {
        el.remove();
        const idx = floats.indexOf(state);
        if (idx > -1) floats.splice(idx, 1);
        if (allowSpawn) scheduleSpawnOne();
      }, FADE_MS);
    }, LIFE_MS);
  }

  function scheduleSpawnOne() {
    if (!allowSpawn) return;
    if (spawned >= FLOAT_COUNT) return;
    makeFloat();
    spawned++;
    setTimeout(scheduleSpawnOne, SPAWN_INTERVAL_MS);
  }

  scheduleSpawnOne();
  setTimeout(() => {
    allowSpawn = false;
  }, STOP_SPAWN_AFTER_MS);

  function tick() {
    for (const s of floats) {
      if (!s.alive) continue;

      const dx = s.tx - s.x;
      const dy = s.ty - s.y;
      const dist = Math.hypot(dx, dy) || 1;

      if (dist < 60) {
        s.tx = rand(-0.2 * window.innerWidth, 1.2 * window.innerWidth);
        s.ty = rand(-0.2 * window.innerHeight, 1.2 * window.innerHeight);
        s.speed = rand(0.4, 1.9);
        s.rotSpeed = rand(-1.1, 1.1);
        s.wobble = rand(0.9, 3.2);
        s.scale = rand(0.9, 1.25);
      }

      s.t += 0.014;
      const wobX = Math.sin(s.t * 2.2) * s.wobble;
      const wobY = Math.cos(s.t * 1.6) * s.wobble;

      s.x += (dx / dist) * s.speed + wobX;
      s.y += (dy / dist) * s.speed + wobY;

      const w = window.innerWidth,
        h = window.innerHeight;
      const outMargin = s.size * 1.4;
      if (
        s.x < -outMargin ||
        s.x > w + outMargin ||
        s.y < -outMargin ||
        s.y > h + outMargin
      ) {
        const ns = spawnOutside(s.size);
        s.x = ns.x;
        s.y = ns.y;
        s.tx = rand(0, w);
        s.ty = rand(0, h);
      }

      s.rot += s.rotSpeed;
      const breathe = 1 + Math.sin(s.t * 3) * 0.03;

      s.el.style.transform = `translate(-50%, -50%) rotate(${s.rot}deg) scale(${
        s.scale * breathe
      })`;
      s.el.style.left = `${s.x}px`;
      s.el.style.top = `${s.y}px`;
    }
    requestAnimationFrame(tick);
  }
  tick();
}
