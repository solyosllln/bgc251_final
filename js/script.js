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
    desc: '하와이 대표 간식. 스팸과 밥을 김으로 감싼 오니기리 스타일 음식.스팸무스비는 따뜻한 밥 위에 노릇하게 구운 스팸을 올리고 김으로 감싼 하와이식 주먹밥 간식이다. 일본계 이민자들이 가져온 무스비(오니기리) 문화에 전후 하와이에서 쉽게 구할 수 있던 스팸이 더해지며 자연스럽게 로컬 푸드로 자리 잡았다. 기본형은 스팸·밥·김·간장(쇼유) 중심으로 단순하지만, 계란지단이나 후리카케, 데리야키 소스 등 토핑이 더해진 버전도 흔하다. 값이 저렴하고 휴대가 편해 편의점, 슈퍼, 로컬 식당 계산대 근처에서 쉽게 볼 수 있으며, 하와이 사람들의 일상적인 간식이자 한 끼 식사로 사랑받는다.',
    images: [
      { src: 'assets/images/p1.jpg', caption: '하와이 로컬 편의점 대표 간식.' },
      { src: 'assets/images/p1_2.jpg', caption: '군수물자 스팸에서 유래.' },
      { src: 'assets/images/p1_3.jpg', caption: '군수물자 스팸에서 유래.' },
      { src: 'assets/images/p1_4.jpg', caption: '군수물자 스팸에서 유래.' },
    ],
  },
  poke: {
    title: 'Poke',
    subtitle: '포케',
    desc: '포케는 신선한 생선을 한입 크기로 썰어 소금, 간장, 참기름, 해조류(리무) 등으로 버무려 먹는 하와이 전통 해산물 요리다. ‘포케(poke)’는 하와이어로 ‘잘라낸 조각’이라는 뜻으로, 재료를 큼직하게 써는 것이 특징이다. 원래는 어부들이 갓 잡은 생선에 바다소금과 해초를 곁들여 먹던 생활 음식에서 시작했으며, 이후 일본·중국 등 이민자 문화가 더해져 간장과 참기름 베이스의 현대적 포케가 정착했다. 요즘은 밥이나 샐러드 위에 올린 포케 보울 형태로도 널리 즐기며, 참치(아히) 외에도 연어, 문어, 두부 등 다양한 재료로 확장되고 있다. ',
    images: [
      { src: 'assets/images/p2.jpg', caption: '어부들의 전통 식사에서 유래.' },
      { src: 'assets/images/p2_2.jpg', caption: '요즘은 포케볼 형태로 변주.' },
    ],
  },
  plate: {
    title: 'Plate Lunch',
    subtitle: '플레이트런치',
    desc: '플레이트런치는 하와이를 대표하는 한 접시 정식으로, 보통 흰쌀밥 두 스쿱과 마카로니 샐러드 한 스쿱, 그리고 메인 단백질 요리로 구성된다. 19~20세기 플랜테이션(사탕수수 농장)에서 일하던 여러 이민자들이 각자의 음식 문화를 나누어 먹던 ‘노동자 점심’에서 유래했다. 그래서 치킨 가츠, 테리야키, 갈비, 칼루아 포크 등 아시아·미국식 풍미가 한 접시에 자연스럽게 공존한다. ‘믹스 플레이트’처럼 메인을 2가지 이상 고르는 방식도 인기라 하와이 로컬의 다양성과 실용성을 잘 보여준다. 관광객에게는 하와이의 일상 식문화를 가장 쉽게 체험할 수 있는 메뉴로 꼽힌다.',
    images: [{ src: 'assets/images/p3.jpg', caption: '하와이 로컬 런치.' }],
  },
  loco: {
    title: 'Loco Moco',
    subtitle: '로코모코',
    desc: '로코모코는 밥 위에 햄버거 패티를 올리고 달걀 프라이를 얹은 뒤, 진한 그레이비 소스를 끼얹어 먹는 하와이식 덮밥이다. 1949년 빅아일랜드 힐로의 ‘링컨 그릴’에서 저렴하면서도 든든한 음식을 원하던 지역 청소년들의 요청으로 탄생한 것으로 알려져 있다. 재료는 단순하지만 밥·고기·계란·소스가 어우러져 짭짤하고 고소한 풍미가 강하며, 포만감이 큰 편이다. 식당마다 패티 대신 스테이크나 새우, 버섯, 양파볶음 등을 올린 변형 버전을 내기도 한다. 하와이 사람들에게는 집밥 같은 소울푸드이자 대표적인 플레이트런치 메뉴다. ',
    images: [{ src: 'assets/images/p4.jpg', caption: '힐로에서 시작.' }],
  },
  shave: {
    title: 'Shave ice',
    subtitle: '쉐이브 아이스',
    desc: '쉐이브 아이스는 얼음을 아주 곱게 갈아 부드러운 눈처럼 만든 뒤, 알록달록한 과일 시럽을 듬뿍 뿌려 먹는 하와이 대표 디저트다. 일본 이민자들이 가져온 ‘카키고리’ 문화가 플랜테이션 시기에 퍼지면서 하와이식으로 정착했다. 잘게 간 얼음이 시럽을 전체적으로 흡수해 마지막 한 숟갈까지 맛이 고르게 진한 것이 일반 스노우콘과의 차이점이다. 파인애플, 패션프루트, 구아바, 리힌무이 등 하와이 특유의 열대·로컬 맛 시럽이 인기이며, 아이스크림이나 팥, 연유를 추가해 더 달콤하게 즐기기도 한다. 더운 날 해변이나 거리에서 가볍게 즐기기 좋은 ‘하와이 여름의 맛’이다.  ',
    images: [
      { src: 'assets/images/p5.jpg', caption: '무더운 하와이 필수 디저트.' },
    ],
  },
  malasada: {
    title: 'Malasadas',
    subtitle: '말라사다',
    desc: '말라사다는 포르투갈식 도넛에서 유래한 하와이의 인기 간식으로, 가운데 구멍이 없는 둥근 튀김빵에 설탕을 묻혀 먹는다. 20세기 초 포르투갈계 이민자들이 하와이에 전한 전통 과자 문화가 뿌리이며, 호놀룰루의 레오나드 베이커리가 대중화에 큰 역할을 했다. 겉은 바삭하고 속은 폭신·쫀득한 식감이 특징이라 갓 튀긴 따뜻한 상태에서 가장 인기가 높다. 기본 설탕 말라사다 외에도 코코넛 크림(하우피아), 구아바, 초콜릿 등 필링을 넣은 버전이 다양하다. 현지에서는 아침 간식이나 커피와 함께 즐기는 ‘로컬 스위트’로 자리 잡았다.',
    images: [{ src: 'assets/images/p6.jpg', caption: '로컬 스타일 도넛.' }],
  },
  kalua: {
    title: 'Kalua Pig',
    subtitle: '칼루아 피그',
    desc: '칼루아 피그는 하와이 전통 조리법 ‘칼루아(kālua)’로 만든 돼지고기 요리로, 땅을 파 만든 이무(imu)라는 지하 화덕에서 오랜 시간 천천히 익혀낸다. 달군 돌 위에 돼지고기를 올리고 티 잎이나 바나나 잎으로 감싼 뒤 흙으로 덮어 찌듯이 굽는 방식이라, 고기가 결대로 부드럽게 찢어질 만큼 촉촉하고 훈연 향이 은은하게 밴다. 하와이 전통 잔치인 루아우에서 빠지지 않는 핵심 메뉴로, 공동체 축제와 가족 행사의 상징 같은 음식이다. 현대에는 오븐·슬로우쿠커로 간소화해 만들기도 하며, 찢은 칼루아 포크를 양배추와 함께 볶아 플레이트런치에 곁들이는 방식도 흔하다.  ',
    images: [{ src: 'assets/images/p7.jpg', caption: '루아우 잔치 대표.' }],
  },
  laulau: {
    title: 'Laulau',
    subtitle: '라우라우',
    desc: '라우라우는 돼지고기와 염지 생선(버터피시 등)을 타로 잎(루아우 잎)으로 감싸고 바깥을 티 잎이나 바나나 잎으로 더 감싼 뒤 푹 쪄낸 하와이 전통 찜요리다. 오랜 시간 찌는 과정에서 잎이 부드럽게 풀어지며, 고기·생선의 감칠맛이 잎에 스며들어 촉촉하고 깊은 풍미가 난다. 기본은 돼지고기+생선 조합이지만 지역과 가정에 따라 닭, 소고기, 문어 등으로도 만든다. 완성된 라우라우는 밥이나 포이와 함께 먹는 것이 전통적이며, 칼루아 피그와 함께 루아우 테이블의 대표 메뉴로 꼽힌다.',
    images: [{ src: 'assets/images/p8.jpg', caption: '전통 조리법.' }],
  },
  poi: {
    title: 'Poi',
    subtitle: '포이',
    desc: '포이는 타로(토란과 비슷한 뿌리작물)를 쪄서 곱게 으깬 뒤 물을 섞어 만든 하와이의 전통 주식이다. 질감은 걸쭉한 퓌레나 반죽처럼 부드러우며, 농도에 따라 ‘한 손가락·두 손가락 포이’처럼 구분하기도 한다. 갓 만든 포이는 은은하게 달고 담백하지만, 시간이 지나 자연 발효되면 새콤한 맛과 향이 생겨 호불호가 갈리기도 한다. 하와이 원주민 문화에서 타로는 조상 신화와 연결된 신성한 작물이라 포이 역시 단순한 음식 이상의 의미를 가진다. 칼루아 피그, 라우라우 등 짭짤한 요리와 함께 먹으면 맛의 균형이 좋아 전통 식사에서 중요한 역할을 한다.',
    images: [{ src: 'assets/images/p9.jpg', caption: '원주민 식문화 핵심.' }],
  },
  butter: {
    title: 'Butter Mochi',
    subtitle: '버터모치',
    desc: '버터모치는 찹쌀가루(모치코)에 코코넛 밀크, 버터, 설탕, 달걀 등을 섞어 구운 하와이식 디저트 케이크다. 일본계 이민자들의 모치(떡) 문화와 하와이의 코코넛·서양식 베이킹이 만나 탄생한 대표적인 로컬 퓨전 스위트로 알려져 있다. 겉은 살짝 바삭하고 속은 떡처럼 쫀득해 ‘케이크와 모치의 중간 식감’이 매력 포인트다. 코코넛 향과 버터 풍미가 진해 커피나 차와도 잘 어울리며, 가정 행사나 포틀럭(음식 나눔 모임)에서 자주 등장하는 친근한 디저트다. 최근에는 말차, 초콜릿, 타로 등 다양한 맛 버전으로도 발전하고 있다.',
    images: [{ src: 'assets/images/p10.jpg', caption: '모치+로컬 재료 결합.' }],
  },
  saimin: {
    title: 'Salmin',
    subtitle: '사이민',
    desc: '사이민은 하와이에서 탄생한 국물 국수로, 부드러운 밀가루·계란 면을 맑은 육수에 말아 파와 가마보코(어묵 슬라이스)를 올려 먹는다. 이름은 광둥어 ‘가는 면(細麵)’에서 왔다고 알려져 있으며, 플랜테이션 시절 중국·일본·필리핀·한국 등 이민자들의 면 요리가 섞이며 로컬 스타일로 발전했다. 육수는 가쓰오·새우·해산물 베이스가 흔하지만 식당마다 레시피가 달라 ‘집집마다 다른 소울푸드’ 같은 성격을 가진다. 차슈, 스팸, 계란지단, 청경채 등을 추가해 더 푸짐하게 즐기기도 한다. 하와이 사람들에게는 어린 시절부터 익숙한, 편안한 한 그릇 음식이다. ',
    images: [
      { src: 'assets/images/p11.jpg', caption: '농장 노동자 간식에서 시작.' },
    ],
  },
  manapua: {
    title: 'Manapua',
    subtitle: '마나푸아',
    desc: '마나푸아는 달콤짭조름하게 양념한 차슈 돼지고기 소를 넣어 크게 만든 하와이식 찐빵으로, 중국의 차슈바오가 현지화된 음식이다. 플랜테이션 시기 중국인 노동자들이 전한 찐빵 문화가 하와이 입맛에 맞게 발전하면서 ‘하와이 로컬 간식’으로 자리 잡았다. 하와이어 ‘mea ono puaʻa(맛있는 돼지고기 음식)’에서 이름이 유래했다는 설명이 널리 알려져 있다. 전통적인 찐 마나푸아 외에도 구운 버전이나 카레치킨, 칼루아 포크, 타로·우베 같은 달콤한 필링을 넣은 종류도 많다. 시장, 편의점, 베이커리에서 쉽게 구할 수 있어 간편한 한 끼나 간식으로 인기다. ',
    images: [{ src: 'assets/images/p12.jpg', caption: '중국 이민 문화 흔적.' }],
  },
  waikiki: {
    title: 'Waikiki Beach',
    subtitle: '와이키키 해변',
    desc: '와이키키 해변은 오아후 섬 남부 호놀룰루에 위치한 하와이 최고의 관광 해변으로, 다이아몬드 헤드를 배경으로 펼쳐지는 길고 완만한 백사장이 특징이다. 과거에는 하와이 왕족(알리이)들이 휴양과 서핑을 즐기던 장소였고, 20세기 들어 리조트와 호텔이 들어서며 세계적인 휴양지로 성장했다. 파도가 비교적 부드럽고 수심이 완만해 초보자 서핑 레슨, SUP, 카누 체험 같은 해양 액티비티가 활발하다. 해변 뒤로는 쇼핑가와 레스토랑, 숙박시설이 밀집해 있어서 “바다+도시 관광”을 동시에 즐기기 좋은 구조다. 하와이 여행에서 가장 상징적인 풍경과 일상을 경험할 수 있는 대표 명소로 꼽힌다.',
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
