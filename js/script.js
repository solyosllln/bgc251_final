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
   3) INTRO PAGE (NEW): TRUE INFINITE SLIDER
      + DOTS + ARROWS + DRAG
      + Active Rotate-in/out + 3D Parallax Hover
      ✅ base rotation(--base-rot) 유지 버전
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

  let cards = Array.from(track.querySelectorAll('.intro-card'));
  if (cards.length < 2) return;

  /* ---------- 로고/ENTER 클릭 → main.html ---------- */
  const goMain = () => (location.href = 'main.html');
  logoBtn?.addEventListener('click', goMain);
  enterBtnTop?.addEventListener('click', goMain);

  /* =========================================================
     1) 앞/뒤 클론 생성 (1장씩)
  ========================================================= */
  const firstClone = cards[0].cloneNode(true);
  const lastClone = cards[cards.length - 1].cloneNode(true);
  firstClone.classList.add('is-clone');
  lastClone.classList.add('is-clone');

  track.appendChild(firstClone);
  track.insertBefore(lastClone, cards[0]);

  // 다시 수집 (클론 포함)
  cards = Array.from(track.querySelectorAll('.intro-card'));
  const realCards = cards.slice(1, cards.length - 1);
  const realCount = realCards.length;

  /* =========================================================
     2) dots 생성 
  ========================================================= */
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

  /* =========================================================
     3) scroll helpers
  ========================================================= */
  function getCardCenterLeft(card) {
    return card.offsetLeft + card.offsetWidth / 2;
  }

  function scrollToCard(card, smooth = true) {
    const left = getCardCenterLeft(card) - gallery.clientWidth / 2;
    gallery.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
  }

  function scrollToRealIndex(i, smooth = true) {
    scrollToCard(realCards[i], smooth);
  }

  // 초기 위치 = 첫 실제 카드
  scrollToRealIndex(0, false);

  /* =========================================================
     4) active 계산 (실제 카드 기준)
  ========================================================= */
  function getCardCenterLeft(card) {
    return card.offsetLeft + card.offsetWidth / 2;
  }

  function getActiveRealIndex() {
    const centerX = gallery.scrollLeft + gallery.clientWidth / 2;
    let bestIdx = 0;
    let bestDist = Infinity;

    realCards.forEach((card, i) => {
      const dist = Math.abs(centerX - getCardCenterLeft(card));
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    });
    return bestIdx;
  }

  // ✅ "전체(cards=클론 포함)" 중 중앙에 가장 가까운 카드 찾기
  function getActiveAllIndex() {
    const centerX = gallery.scrollLeft + gallery.clientWidth / 2;
    let bestIdx = 0;
    let bestDist = Infinity;

    cards.forEach((card, i) => {
      const dist = Math.abs(centerX - getCardCenterLeft(card));
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    });
    return bestIdx;
  }

  let prevActiveCard = null;

  function updateUI() {
    const realIdx = getActiveRealIndex(); // dots/논리용
    const allIdx = getActiveAllIndex(); // 비주얼 active용(클론 포함)

    const activeRealCard = realCards[realIdx];
    const activeAllCard = cards[allIdx];

    // 이전 active rotate-out 표시 (실제 카드 기준)
    if (prevActiveCard && prevActiveCard !== activeRealCard) {
      prevActiveCard.classList.add('is-leaving');
      setTimeout(() => prevActiveCard.classList.remove('is-leaving'), 550);
    }

    // ✅ dots는 실제 카드 기준
    dots.forEach((d, i) => d.classList.toggle('is-active', i === realIdx));

    // ✅ 비주얼 active는 "클론 포함 전체" 기준으로 붙여서 끊김 제거
    cards.forEach((c, i) => c.classList.toggle('is-active', i === allIdx));

    prevActiveCard = activeRealCard;
    return realIdx;
  }

  updateUI();

  /* =========================================================
     5) 클론 구간 도달 시 "스크롤 끝난 뒤" 자연 텔레포트
        (끊김 제거 핵심)
  ========================================================= */
  function fixInfiniteLoopIfNeeded() {
    const centerX = gallery.scrollLeft + gallery.clientWidth / 2;

    const firstCloneCenter = getCardCenterLeft(firstClone);
    const lastCloneCenter = getCardCenterLeft(lastClone);

    const TOL = realCards[0].offsetWidth * 0.35; // ✅ 여유 구간

    // 뒤쪽 클론(=firstClone)이 중앙 근처면 → 0번 실제로 순간이동
    if (Math.abs(centerX - firstCloneCenter) < TOL) {
      scrollToRealIndex(0, false);
    }

    // 앞쪽 클론(=lastClone)이 중앙 근처면 → 마지막 실제로 순간이동
    if (Math.abs(centerX - lastCloneCenter) < TOL) {
      scrollToRealIndex(realCount - 1, false);
    }
  }

  // ✅ scroll debounce로 "스크롤 끝났을 때만" teleport
  let scrollEndTimer = null;
  gallery.addEventListener('scroll', () => {
    updateUI();

    clearTimeout(scrollEndTimer);
    scrollEndTimer = setTimeout(() => {
      fixInfiniteLoopIfNeeded();
    }, 120); // 80~150ms 사이 취향 조절 가능
  });
  /* =========================================================
     5) 스냅 끝나면 클론 구간 보정(텔레포트)
     - 후루룩 돌아감 방지 핵심
  ========================================================= */
  function fixInfiniteLoopIfNeeded() {
    const maxScroll = gallery.scrollWidth - gallery.clientWidth;
    const left = gallery.scrollLeft;

    // 앞쪽 lastClone 영역 도달 → 마지막 real로 순간 이동
    if (left <= 2) {
      scrollToRealIndex(realCount - 1, false);
    }

    // 뒤쪽 firstClone 영역 도달 → 첫 real로 순간 이동
    if (left >= maxScroll - 2) {
      scrollToRealIndex(0, false);
    }
  }

  let snapTimer = null;
  gallery.addEventListener('scroll', () => {
    updateUI();

    clearTimeout(snapTimer);
    snapTimer = setTimeout(() => {
      fixInfiniteLoopIfNeeded();
      updateUI();
    }, 140);
  });

  /* =========================================================
   6) arrows (진짜 무한 루프: 방향 유지)
========================================================= */
  function goSlide(dir) {
    const idx = updateUI();

    // 마지막에서 → 누르면 "뒤에 붙인 firstClone"으로 먼저 이동
    if (dir === 1 && idx === realCount - 1) {
      scrollToCard(firstClone, true);
      return;
    }

    // 첫번째에서 ← 누르면 "앞에 붙인 lastClone"으로 먼저 이동
    if (dir === -1 && idx === 0) {
      scrollToCard(lastClone, true);
      return;
    }

    // 그 외에는 정상 이동
    let nextIdx = idx + dir;
    scrollToRealIndex(nextIdx, true);
  }

  prevBtn?.addEventListener('click', () => goSlide(-1));
  nextBtn?.addEventListener('click', () => goSlide(1));

  /* =========================================================
     7) wheel -> horizontal
  ========================================================= */
  gallery.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      gallery.scrollLeft += e.deltaY * 1.1;
    },
    { passive: false }
  );

  /* =========================================================
     8) drag / swipe
  ========================================================= */
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

  /* =========================================================
     9) 3D / PARALLAX HOVER (active 카드만)
     ✅ base-rot 포함
  ========================================================= */
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
