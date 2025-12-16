/* =========================================================
   0) UTILS
========================================================= */
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

// 줄바꿈(\n)을 <br>로 변환 (캡션/설명에서 줄바꿈 보이게)
function nl2br(str) {
  return String(str || '').replace(/\n/g, '<br>');
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

  const originalCards = Array.from(track.querySelectorAll('.intro-card'));
  const realCount = originalCards.length;
  if (realCount < 2) return;

  const goMain = () => (location.href = 'main.html');
  logoBtn?.addEventListener('click', goMain);
  enterBtnTop?.addEventListener('click', goMain);

  const trackStyle = getComputedStyle(track);
  const gapPx = parseFloat(trackStyle.columnGap || trackStyle.gap || '0') || 0;

  const avgCardW =
    originalCards.reduce((s, c) => s + c.offsetWidth, 0) / realCount;
  const K = Math.max(
    2,
    Math.ceil(gallery.clientWidth / (avgCardW + gapPx)) + 1
  );

  const loopWidth =
    originalCards.reduce((s, c) => s + c.offsetWidth, 0) +
    gapPx * (realCount - 1);

  const prependClones = [];
  const appendClones = [];

  for (let i = 0; i < K; i++) {
    const last = originalCards[realCount - 1 - i].cloneNode(true);
    last.classList.add('is-clone');
    prependClones.unshift(last);

    const first = originalCards[i].cloneNode(true);
    first.classList.add('is-clone');
    appendClones.push(first);
  }

  prependClones.forEach((c) => track.insertBefore(c, track.firstChild));
  appendClones.forEach((c) => track.appendChild(c));

  const cardsAll = Array.from(track.querySelectorAll('.intro-card'));
  const realCards = cardsAll.slice(K, K + realCount);

  dotsWrap.innerHTML = '';
  realCards.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'intro-dot';
    dot.type = 'button';
    dot.textContent = ''; // 점 스타일은 CSS로
    dot.addEventListener('click', () => scrollToRealIndex(i, true));
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.querySelectorAll('.intro-dot'));

  const getCenterLeft = (card) => card.offsetLeft + card.offsetWidth / 2;

  function scrollToCard(card, smooth = true) {
    const left = getCenterLeft(card) - gallery.clientWidth / 2;
    gallery.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
  }
  function scrollToRealIndex(i, smooth = true) {
    scrollToCard(realCards[i], smooth);
  }

  scrollToRealIndex(0, false);

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

  function fixInfiniteLoop() {
    const left = gallery.scrollLeft;

    const startBoundary = getCenterLeft(realCards[0]) - gallery.clientWidth / 2;
    const endBoundary =
      getCenterLeft(realCards[realCount - 1]) - gallery.clientWidth / 2;

    if (left < startBoundary - loopWidth * 0.5) {
      gallery.scrollLeft += loopWidth;
      return;
    }
    if (left > endBoundary + loopWidth * 0.5) {
      gallery.scrollLeft -= loopWidth;
      return;
    }
  }

  let snapTimer = null;
  gallery.addEventListener('scroll', () => {
    updateUI();
    clearTimeout(snapTimer);
    snapTimer = setTimeout(() => {
      fixInfiniteLoop();
      updateUI();
    }, 120);
  });

  function goSlide(dir) {
    const idx = updateUI();
    let next = idx + dir;
    if (next < 0) next = realCount - 1;
    if (next >= realCount) next = 0;
    scrollToRealIndex(next, true);
  }

  prevBtn?.addEventListener('click', () => goSlide(-1));
  nextBtn?.addEventListener('click', () => goSlide(1));

  gallery.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      gallery.scrollLeft += e.deltaY * 1.1;
    },
    { passive: false }
  );

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
   - HTML에서 detailOverlay는 hidden 속성으로 제어
========================================================= */
const DETAIL_DATA = {
  spam: {
    title: 'Spam Musubi',
    subtitle: '스팸무스비',
    desc:
      '하와이 대표 간식. 스팸과 밥을 김으로 감싼 오니기리 스타일 음식.' +
      '스팸무스비는 따뜻한 밥 위에 노릇하게 구운 스팸을 올리고 김으로 감싼 하와이식 주먹밥 간식이다. ' +
      '일본계 이민자들이 가져온 무스비(오니기리) 문화에 전후 하와이에서 쉽게 구할 수 있던 스팸이 더해지며 자연스럽게 로컬 푸드로 자리 잡았다. ' +
      '기본형은 스팸·밥·김·간장(쇼유) 중심으로 단순하지만, 계란지단이나 후리카케, 데리야키 소스 등 토핑이 더해진 버전도 흔하다. ' +
      '값이 저렴하고 휴대가 편해 편의점, 슈퍼, 로컬 식당 계산대 근처에서 쉽게 볼 수 있으며, 하와이 사람들의 일상적인 간식이자 한 끼 식사로 사랑받는다.',
    images: [
      { src: 'assets/images/p1.jpg', caption: 'spam musubi_1.' },
      { src: 'assets/images/p1_2.jpg', caption: 'spam musubi_2.' },
      { src: 'assets/images/p1_3.jpg', caption: 'spam musubi_3.' },

      { src: 'assets/images/p1_4.jpg', caption: 'spam musubi_4.' },
      {
        title: '맛집소개',
        src: 'assets/images/p1_5.jpg',
        caption:
          '[하와이 스팸무스비 맛집 추천]\n' +
          ' 📝  맛집 이름: Musubi Cafe Iyasume\n' +
          '📍위치: 오아후 섬 호놀룰루(와이키키 등 여러 지점)\n' +
          '✅ 유명한 이유: 현지인과 여행객 모두에게 인기 있는 스팸 무스비 전문점으로, 무려 20가지가 넘는 다양한 스팸 무스비 종류를 판매합니다. 2000년에 작은 와이키키 호텔 로비에서 시작해 입소문을 타고 현재 오아후 전역에 여러 지점을 운영할 만큼 성장했습니다. 갓 만든 따끈한 무스비를 맛볼 수 있으며, 주문하면 원하는 조합으로 바로 만들어주는 서비스도 유명합니다.\n' +
          '🍽️대표 메뉴/가격대: 클래식 스팸 무스비부터 장어·아보카도·베이컨 등을 얹은 “스페셜” 무스비까지 다양하며, 한 개당 약 $2~$3 정도로 저렴합니다. 테리야키 스팸 무스비($2.28), 베이컨에그 스팸 무스비($2.98) 등이 인기이며 여러 개를 담은 세트도 판매합니다.\n' +
          '• 한 줄 요약: 팸 무스비는 구운 스팸 햄을 밥과 김으로 감싼 하와이의 간편식으로, Musubi Cafe Iyasume는 이 스팸 무스비를 가장 잘하기로 유명한 곳입니다. 일본산 타마키골드 쌀을 사용하는 등 재료 선택에도 신경 써 맛과 품질이 뛰어나며 ￼, 종류가 매우 다양해 골라 먹는 재미가 있습니다. 작은 가게이지만 항상 갓 만든 무스비를 찾는 손님들로 북적이며, 하와이를 방문한다면 가볍게 한 끼 또는 간식으로 즐기기에 안성맞춤인 맛집입니다.\n',
      },
    ],
  },

  // 이하 너 원본 그대로 유지 (poke~waikiki)
  poke: {
    title: 'Poke',
    subtitle: '포케',
    desc:
      '포케는 신선한 생선을 한입 크기로 썰어 소금, 간장, 참기름, 해조류(리무) 등으로 버무려 먹는 하와이 전통 해산물 요리다. ' +
      '‘포케(poke)’는 하와이어로 ‘잘라낸 조각’이라는 뜻으로, 재료를 큼직하게 써는 것이 특징이다. ' +
      '원래는 어부들이 갓 잡은 생선에 바다소금과 해초를 곁들여 먹던 생활 음식에서 시작했으며, 이후 일본·중국 등 이민자 문화가 더해져 간장과 참기름 베이스의 현대적 포케가 정착했다. ' +
      '요즘은 밥이나 샐러드 위에 올린 포케 보울 형태로도 널리 즐기며, 참치(아히) 외에도 연어, 문어, 두부 등 다양한 재료로 확장되고 있다.',
    images: [
      { src: 'assets/images/p2.jpg', caption: 'poke_1.' },
      { src: 'assets/images/p2_2.jpg', caption: 'poke_2.' },
      { src: 'assets/images/p2_3.jpg', caption: 'poke_3.' },
      { src: 'assets/images/p2_4.jpg', caption: 'poke_4.' },
      {
        src: 'assets/images/p2_5.jpg',
        caption:
          '[하와이 포케 맛집 추천]\n' +
          ' 📝 맛집 이름:  Da Poke Shack (다 포케 쉑)\n' +
          '📍위치: 하와이 섬 카일루아-코나(Kailua-Kona)\n' +
          '✅유명한 이유: 하와이 현지인들도 인정하는 신선한 포케 전문점으로, 2014년에는 미국 전역 음식점 중 Yelp 이용자 평점 1위에 선정될 정도로 화제를 모았습니다. 콘도 단지 한쪽에 자리한 작은 가게지만, 탱글탱글한 신선한 해산물과 풍부한 양으로 “미국 최고의 식당”에 뽑힐 만큼 높은 평가를 받았습니다. 현지 어부가 잡은 생선을 바로 손질해 사용하기 때문에 포케의 신선도가 뛰어나고, 리뷰에서도 “비리지 않을 정도로 신선하다”는 찬사가 이어집니다\n' +
          '🍽️대표 메뉴/가격대: 투고 스타일의 포케 볼(Poke Bowl)이 인기 있으며, 좋아하는 포케 종류 2가지를 밥과 곁들임과 함께 담아 약 $15~$20 정도에 즐길 수 있습니다. 더욱 다양한 맛을 원한다면 포케 네 가지와 반찬, 밥이 포함된 포케 플레이트도 약 $25~$30 내외로 푸짐하게 나옵니다. 매일 잡히는 어종에 따라 스파이시 갈릭 참치, 셔크 스페셜 등 맛이 바뀌며, 문어 포케(타코)나 새우 포케처럼 특별한 메뉴도 있습니다.\n' +
          '• 한 줄 요약: 포케는 싱싱한 해산물을 간장 양념이나 소스에 버무린 하와이식 해산물 샐러드로, Da Poke Shack은 현지에서도 손꼽히는 포케 맛집입니다. 투박한 가게이지만 직접 만든 다양한 소스와 신선한 해산물 조합으로 맛을 낸 포케는 식감이 쫄깃하고 감칠맛이 좋아 계속 손이 갑니다. 하와이 빅아일랜드 여행 중 가볍지만 든든한 한 끼를 원할 때 들러서 바다를 바라보며 신선한 포케를 맛보면 좋을 곳으로, 높은 인기만큼 이른 시간에 포케가 소진될 수 있으니 서둘러 방문하는 것이 좋습니다.\n',
      },
    ],
  },

  plate: {
    title: 'Plate Lunch',
    subtitle: '플레이트런치',
    desc:
      '플레이트런치는 하와이를 대표하는 한 접시 정식으로, 보통 흰쌀밥 두 스쿱과 마카로니 샐러드 한 스쿱, 그리고 메인 단백질 요리로 구성된다. ' +
      '19~20세기 플랜테이션(사탕수수 농장)에서 일하던 여러 이민자들이 각자의 음식 문화를 나누어 먹던 ‘노동자 점심’에서 유래했다. ' +
      '그래서 치킨 가츠, 테리야키, 갈비, 칼루아 포크 등 아시아·미국식 풍미가 한 접시에 자연스럽게 공존한다. ' +
      '‘믹스 플레이트’처럼 메인을 2가지 이상 고르는 방식도 인기라 하와이 로컬의 다양성과 실용성을 잘 보여준다.',
    images: [
      { src: 'assets/images/p3.jpg', caption: 'plate lunch_1.' },
      { src: 'assets/images/p3_2.jpg', caption: 'plate lunch_2.' },
      { src: 'assets/images/p3_3.jpg', caption: 'plate lunch_3.' },
      { src: 'assets/images/p3_4.jpg', caption: 'plate lunch_4.' },
      {
        src: 'assets/images/p3_5.jpg',
        caption:
          '[하와이 플레이트런치 맛집 추천]\n' +
          '	 📝 맛집 이름: Rainbow Drive-In (레인보우 드라이브인)\n' +
          '	📍	위치: 오아후 섬 호놀룰루(카파훌루 지역)\n' +
          '	✅유명한 이유: 1961년 문을 연 이후 60년 넘게 사랑받아 온 하와이 플레이트 런치의 전설적인 맛집입니다. 두 스쿱의 밥과 마카로니 샐러드, 그리고 푸짐한 메인 요리를 한 접시에 담는 하와이식 플레이트 런치 문화를 대표하는 곳으로, 저렴한 가격과 넉넉한 양으로 현지인들의 소울푸드가 되었습니다. 미국의 유명 방송 Diners, Drive-Ins and Dives(맛집 프로그램)에 소개되고, 2021년에는 개업 60주년을 맞아 하와이 매거진에서도 기념 기사가 실릴 정도로 오랜 세월 지역사회와 관광객 모두에게 사랑받고 있습니다.\n' +
          '	🍽️대표 메뉴 및 가격대: 가장 인기 있는 메뉴는 세 가지 고기를 한 번에 맛볼 수 있는 믹스 플레이트(Mix Plate)로, 바비큐 비프와 프라이드 치킨, 마히마히 생선튀김이 한 접시에 담겨 나옵니다. 가격은 약 $15~$17 정도이며, 이외에도 그레이비 소스를 끼얹은 로코모코 플레이트($13.95), 바비큐 비프나 치킨 커틀릿 등의 단품 플레이트(약 $12~$15) 등 옛날 그대로의 저렴하고 푸짐한 메뉴들이 제공됩니다.\n' +
          '• 한 줄 요약: Rainbow Drive-In은 허름한 드라이브인 스타일 식당이지만 항상 줄이 끊이지 않는 현지 명소입니다. 플레이트 런치는 원래 노동자들을 위해 한 접시에 여러 음식을 담은 데서 유래한 하와이의 대표 음식으로, 이곳의 플레이트 런치는 밥 두 스쿱과 마카로니 샐러드, 그리고 푸짐한 고기 반찬이라는 전형을 확립했습니다. “저렴하고 양 많은 한상차림”이라는 창업 철학대로 현재까지 메뉴와 레시피가 크게 변함없이 유지되어 왔으며, 현지인들은 물론 관광객들도 “하와이에 오면 꼭 들러야 할 곳”으로 입을 모으는 만큼 한 번쯤 가볼 만한 가치가 있는 맛집입니다.\n',
      },
    ],
  },

  loco: {
    title: 'Loco Moco',
    subtitle: '로코모코',
    desc:
      '로코모코는 밥 위에 햄버거 패티를 올리고 달걀 프라이를 얹은 뒤, 진한 그레이비 소스를 끼얹어 먹는 하와이식 덮밥이다. ' +
      '1949년 빅아일랜드 힐로의 ‘링컨 그릴’에서 저렴하면서도 든든한 음식을 원하던 지역 청소년들의 요청으로 탄생한 것으로 알려져 있다.',
    images: [
      { src: 'assets/images/p4.jpg', caption: '힐로에서 시작.' },
      { src: 'assets/images/p4_2.jpg', caption: '요즘은 포케볼 형태로 변주.' },
      { src: 'assets/images/p4_3.jpg', caption: '요즘은 포케볼 형태로 변주.' },
      { src: 'assets/images/p4_4.jpg', caption: '요즘은 포케볼 형태로 변주.' },
      {
        src: 'assets/images/p4_5.jpg',
        caption:
          '[하와이 로코모코 맛집 추천]\n' +
          '	 📝 맛집 이름: Café 100 (카페 100)\n' +
          '	📍 위치: 하와이 섬 힐로(Hilo)\n' +
          '	✅유명한 이유: “로코 모코”의 탄생지로 알려진 곳으로, 1946년 문을 열어 수십 년간 현지인들에게 사랑받아 온 노포 식당입니다. 1940년대 말 힐로에서 처음 고안된 로코 모코를 판매한 집으로 유명하며, 현재까지 무려 30여 가지 종류의 로코 모코를 메뉴로 선보일 정도로 로코 모코의 원조 격인 맛집입니다. 저렴하고 빠른 한끼 식사를 제공하는 현지 드라이브인 스타일을 고수하면서도 메뉴 혁신을 이어와, “로코 모코의 성지”로 불리며 여행객들도 성지순례하듯 방문합니다.\n' +
          '	🍽️대표 메뉴 및 가격대: 가장 인기 있는 메뉴는 세 가지 고기를 한 번에 맛볼 수 있는 믹스 플레이트(Mix Plate)로, 바비큐 비프와 프라이드 치킨, 마히마히 생선튀김이 한 접시에 담겨 나옵니다. 가격은 약 $15~$17 정도이며, 이외에도 그레이비 소스를 끼얹은 로코모코 플레이트($13.95), 바비큐 비프나 치킨 커틀릿 등의 단품 플레이트(약 $12~$15) 등 옛날 그대로의 저렴하고 푸짐한 메뉴들이 제공됩니다.\n' +
          '• 한 줄 요약: Rainbow Drive-In은 허름한 드라이브인 스타일 식당이지만 항상 줄이 끊이지 않는 현지 명소입니다. 플레이트 런치는 원래 노동자들을 위해 한 접시에 여러 음식을 담은 데서 유래한 하와이의 대표 음식으로, 이곳의 플레이트 런치는 밥 두 스쿱과 마카로니 샐러드, 그리고 푸짐한 고기 반찬이라는 전형을 확립했습니다. “저렴하고 양 많은 한상차림”이라는 창업 철학대로 현재까지 메뉴와 레시피가 크게 변함없이 유지되어 왔으며, 현지인들은 물론 관광객들도 “하와이에 오면 꼭 들러야 할 곳”으로 입을 모으는 만큼 한 번쯤 가볼 만한 가치가 있는 맛집입니다.\n',
      },
    ],
  },

  shave: {
    title: 'Shave ice',
    subtitle: '쉐이브 아이스',
    desc:
      '쉐이브 아이스는 얼음을 아주 곱게 갈아 부드러운 눈처럼 만든 뒤, 과일 시럽을 듬뿍 뿌려 먹는 하와이 대표 디저트다. ' +
      '일본 이민자들이 가져온 ‘카키고리’ 문화가 플랜테이션 시기에 퍼지면서 하와이식으로 정착했다.',
    images: [
      { src: 'assets/images/p5.jpg', caption: 'shave ice_1' },
      { src: 'assets/images/p5_2.jpg', caption: 'shave ice_2' },
      { src: 'assets/images/p5_3.jpg', caption: 'shave ice_3' },
      { src: 'assets/images/p5_4.jpg', caption: 'shave ice_4' },
      {
        src: 'assets/images/p5_5.jpg',
        caption:
          '[하와이 쉐이브아이스 맛집 추천]\n' +
          ' 📝 맛집 이름: Matsumoto Shave Ice (마츠모토 쉐이브 아이스)\n' +
          '	📍 위치: 오아후 섬 할레이바(Haleʻiwa, 노스쇼어 지역)\n' +
          '	✅유명한 이유: 1951년부터 영업을 이어온 하와이 최고(最古)의 쉐이브 아이스 가게로, 70년이 넘는 전통을 가진 가족 경영점입니다. 원래 작은 잡화점으로 시작했다가 더운 노스쇼어 날씨에 맞춰 눈꽃처럼 부드러운 빙수를 팔기 시작했으며, 입소문이 퍼져 현재는 하루에 1,000그릇 이상의 쉐이브 아이스를 판매할 정도로 엄청난 인기점을 이루었습니다. 전 세계 여행객들이 일부러 이곳을 찾을 만큼 유명하여 항상 줄이 길게 늘어서 있으며, 가게에서 판매하는 티셔츠나 기념품도 인기일 정도로 할레이바의 랜드마크가 되었습니다.\n' +
          '	🍽️대표 메뉴 및 가격대: 가장 인기 있는 메뉴는 세 가지 시럽을 예쁘게 무지개색으로 뿌린 레인보우 쉐이브 아이스입니다. 기본 작은 사이즈는 약 $3~$4, 큰 사이즈는 약 $4.25 정도이며 원하는 경우 아이스크림 추가(+$1.50)나 모찌 볼, 콩팥 등 토핑을 추가할 수 있습니다. 추천 토핑 조합으로는 빙수 아래에 바닐라 아이스크림을 깔고, 위에 연유를 뿌린 “보올로하”(마츠모토 한정 메뉴)가 유명하며 가격은 토핑 포함 $6 안팎입니다.\n' +
          '• 한 줄 요약: 쉐이브 아이스는 곱게 간 얼음에 과일 시럽을 뿌려 먹는 하와이식 빙수로, Matsumoto Shave Ice는 그 원조 격인 노포입니다. 얼음을 눈처럼 곱게 갈아서 입안에서 부드럽게 녹는 식감을 자랑하며, 망고, 리치, 피냐콜라다 등 30가지가 넘는 과일 시럽 중 취향대로 골라 먹는 재미가 있습니다. 또한 콩단팥(아즈키), 소프트 아이스크림, 한층 달콤하게 해주는 연유 등 토핑도 풍부해 입맛에 맞게 커스터마이징이 가능하지요. 무더운 노스쇼어에서 서핑이나 관광을 즐긴 후 달콤하고 시원한 쉐이브 아이스를 맛볼 수 있는 곳으로, 오래된 사진들과 소박한 가게 풍경이 하와이 옛 정취를 느끼게 해주는 매력도 있습니다.\n',
      },
    ],
  },

  malasada: {
    title: 'Malasadas',
    subtitle: '말라사다',
    desc: '말라사다는 포르투갈식 도넛에서 유래한 하와이의 인기 간식으로, 가운데 구멍이 없는 둥근 튀김빵에 설탕을 묻혀 먹는다.',
    images: [
      { src: 'assets/images/p6.jpg', caption: 'malasadas_1' },
      { src: 'assets/images/p6_2.jpg', caption: 'malasadas_2' },
      { src: 'assets/images/p6_3.jpg', caption: 'malasadas_3' },
      { src: 'assets/images/p6_4.jpg', caption: 'malasadas_4' },
      {
        src: 'assets/images/p6_5.jpg',
        caption:
          '[하와이 말라사다 맛집 추천]\n' +
          ' 📝맛집 이름: Leonard’s Bakery (레오나즈 베이커리)\n' +
          '	📍위치: 오아후 섬 호놀룰루(카파훌루 지역)\n' +
          '	✅	유명한 이유: 1952년 문을 연 이래 하와이 말라사다 열풍의 주역이 된 전설적인 베이커리입니다. 포르투갈 이민자들이 전해준 도넛 말라사다를 하와이에 최초로 소개한 곳으로, 개업 당시 사순절 직전 축제(Shrove Tuesday)에 맞춰 시중에 없던 말라사다를 판매했다가 예상외의 큰 인기를 끌며 하와이에 말라사다 붐을 일으켰습니다. 이후 하와이 오리지널 말라사다 집으로 명성을 떨치며 현지인뿐 아니라 관광객들도 반드시 찾아오는 맛집이 되었고, 시그니처 분홍색 상자에 담긴 말라사다는 하와이 여행 기념품처럼 여겨질 정도입니다.\n' +
          '🍽️대표 메뉴 및 가격대: 갓 튀겨낸 오리지널 말라사다(속이 비어있는 타입)는 개당 $2.00 정도이며, 시나몬 설탕이나 리히몽(매실가루) 등을 묻힌 변형도넛도 같은 가격에 즐길 수 있습니다. 안에 필링이 들어간 말라사다 퍼프(Malasada Puffs)도 인기인데, 하우피아(코코넛푸딩), 초콜릿, 우베(보라색 고구마) 등 크림을 채운 타입으로 개당 $2.45 정도입니다. 한 번에 반죽을 넉넉히 만들어 튀겨내기 때문에 오전 5시30분부터 늦은 저녁까지 상시 구매 가능하며, 6개들이 또는 12개들이 박스로 구매하여 저렴하게 즐길 수도 있습니다.\n' +
          '• 한 줄 요약: 말라사다는 밀가루 반죽을 기름에 튀긴 뒤 설탕에 굴린 포르투갈식 도넛으로, 겉은 바삭하고 속은 폭신한 식감이 일품입니다. Leonard’s Bakery는 하와이에서 말라사다를 가장 처음 대중화한 곳으로, 현재까지도 “하와이 No.1 말라사다”로 손꼽히는 전통 베이커리입니다. 주문을 하면 그때그때 반죽을 튀겨내기 때문에 항상 따끈따끈하고 향긋한 말라사다를 맛볼 수 있으며, 필링이 들어간 말라사다도 개발하여 선택의 폭을 넓혔습니다. 가게 앞에서 찍는 인증샷이 SNS에 많이 올라올 정도로 관광명소가 되었지만, 현지인들에게도 소울푸드로 사랑받는 곳이라 아침 식사나 간식으로 줄 서서 사가는 모습을 쉽게 볼 수 있습니다.\n',
      },
    ],
  },

  kalua: {
    title: 'Kalua Pig',
    subtitle: '칼루아 피그',
    desc: '칼루아 피그는 하와이 전통 조리법 ‘칼루아(kālua)’로 만든 돼지고기 요리로, 이무(imu)라는 지하 화덕에서 오랜 시간 익혀낸다.',
    images: [
      { src: 'assets/images/p7.jpg', caption: 'kalua pig_1' },
      { src: 'assets/images/p7_2.jpg', caption: 'kalua pig_2' },
      { src: 'assets/images/p7_3.jpg', caption: 'kalua pig_3' },
      { src: 'assets/images/p7_4.jpg', caption: 'kalua pig_4' },
      {
        src: 'assets/images/p7_5.jpg',
        caption:
          '[하와이 칼루아피그 맛집 추천]\n' +
          '📝 맛집 이름: Old Lahaina Luau (올드 라하이나 루ау)\n' +
          '📍 위치: 마우이 섬 라하이나(Lahaina)\n' +
          '✅ 유명한 이유: 하와이 전통 루ʻau(루au) 중에서도 가장 autentically 하와이안으로 평가받는 고급 루라우 쇼로, 하와이식 통돼지 바비큐 요리인 칼루아 피그를 전통 방식으로 선보이는 곳입니다. 여러 매체에서 “마우이 최고의 루ау”로 꼽히며, 특히 하와이 현지인들이 운영하고 문화적 디테일을 중시하여 진정한 하와이의 맛과 공연을 체험할 수 있다는 평가를 받습니다. 수백 명 규모의 대형 루ау임에도 음식의 맛이 훌륭하고 서비스가 좋아 예약이 매우 어렵고, 마우이를 찾는 여행자라면 한 번쯤은 경험해야 할 명소로 손꼽힙니다.\n' +
          '🍽️	대표 메뉴 및 가격대: 저녁 시간대에 열리는 루라우 뷔페 형식으로 제공되며, 칼루아 통돼지, 라울라우, 로미로미 연어, 훌리훌리 치킨, 포이 등 전통 하와이 요리를 무제한으로 즐길 수 있습니다. 1인당 가격은 약 $140~$180 수준으로 다소 비싸지만, 남태평양 훌라 공연과 라이브 음악, 환영 칵테일과 꽃레이 등을 모두 포함한 올인클루시브 패키지입니다. 메인 요리인 칼루아 피그는 행사 시작과 함께 전통 이무(imū) 가마에서 꺼내는 세리머니를 선보이며, 바나나 잎에 싸여 8시간 이상 푹 쪄낸 돼지고기는 결대로 부드럽게 찢어져 입안에서 사르르 녹습니다.\n' +
          '• 한 줄 요약:칼루아 피그는 하와이 전통 방식으로 돼지를 통째로 묻어서 구워낸 훈연 돼지고기 요리로, 독특한 향과 촉촉한 식감이 특징입니다. Old Lahaina Luau에서는 이 칼루아 돼지를 직접 땅속 화덕(이무)에서 구워내는 과정을 보여주고, 갓 꺼낸 돼지고기를 뷔페식으로 제공하여 관객들이 정통 칼루아 피그를 맛볼 수 있게 합니다. 또한 식사와 함께 훌라 춤 공연, 라이브 우쿨렐레 연주 등 풍성한 볼거리를 즐길 수 있어, 맛과 문화 체험을 모두 충족시키는 특별한 저녁 만찬이 됩니다. 다만 인기 루ау인 만큼 최소 몇 주 전에는 예약해야 하며, 일몰 시간에 맞춰 진행되는 공연과 하와이식 환대는 가격 이상의 잊지 못할 추억을 선사합니다.\n',
      },
    ],
  },

  laulau: {
    title: 'Laulau',
    subtitle: '라우라우',
    desc: '라우라우는 돼지고기와 생선을 타로 잎으로 감싸고 바깥을 티 잎으로 감싼 뒤 푹 쪄낸 하와이 전통 찜요리다.',
    images: [
      { src: 'assets/images/p8.jpg', caption: 'laulau_1' },
      { src: 'assets/images/p8_2.jpg', caption: 'laulau_2.' },
      { src: 'assets/images/p8_3.jpg', caption: 'laulau_3.' },
      { src: 'assets/images/p8_4.jpg', caption: 'laulau_4.' },
      {
        src: 'assets/images/p8_5.jpg',
        caption:
          '[하와이 라우라우 맛집 추천]\n' +
          '📝 맛집 이름: Helena’s Hawaiian Food (헬레나스 하와이안 푸드))\n' +
          '📍 위치: 오아후 섬 호놀룰루(칼리히 지역)\n' +
          '✅ 유명한 이유: 1946년부터 영업 중인 전통 하와이 음식 전문 식당으로, 하와이 향토요리를 대중화한으로 2000년 제임스 비어드 재단 ‘아메리카 클래식’ 상을 수상한 바 있습니다. 70년 넘게 한 자리를 지키며 3대째 가업을 이으며 운영되고 있고, 현지인들은 물론 세계 각지의 미식가들이 찾아오는 하와이 향토음식의 성지입니다. 메뉴는 옛날 방식 그대로 단출하지만 맛이 뛰어나 “현지인이 추천하는 진짜 하와이 음식”으로 명성이 높고, TV 음식 탐방 프로그램이나 유명 셰프들도 필수로 방문하는 곳으로 널리 알려져 있습니다 \n' +
          '🍽️	대표 메뉴 및 가격대: 하와이 전통 방식으로 만든 라우라우(돼지고기와 생선을 타로 잎에 싸서 찐 요리)가 이 집의 대표 메뉴 중 하나이며, 개당 약 $8.25 정도입니다. 함께 곁들이는 칼루아 피그($9.40 대)& 로미 연어(토마토 양파 무침 연어, $8) 등도 인기이고, 하와이식 세트 메뉴(AD 코스)는 1인 $20$45 선에서 구성되어 있어 여러 가지를 조금씩 맛볼 수 있습니다. 특히 메뉴 D 세트에는 라울라우와 칼루아 피그, 로미 연어, 루아우 스퀴드(타로잎을 끓인 요리)까지 포함되어 있어 둘이서 하나 주문해도 푸짐합니다.\n' +
          '• 한 줄 요약:라우라우는 돼지고기와 때때로 생선을 티 리프(ti 잎)와 타로 잎으로 여러 겹 싸서 찐 하와이 전통 음식으로, 포장지 역할을 한 티 리프는 벗겨내고 안의 타로 잎째로 먹는 담백한 요리입니다. Helena’s Hawaiian Food에서는 이런 전통 라울라우를 옛방식 그대로 푹 쪄내어 촉촉하고 은은한 풍미를 즐길 수 있습니다. 이곳은 허름하고 소박한 식당이지만 언제나 문전성시를 이루며, 현지 할머니들이 손수 만든 듯한 가정식 스타일의 하와이 음식을 맛볼 수 있습니다. 직원들도 친절하게 메뉴를 설명해주어 처음 접하는 사람도 부담 없이 도전할 수 있고, “하와이에 왔다면 꼭 와봐야 한다고 모두가 말하는 곳”이라는 여행객들의 평처럼 하와이 전통 음식을 경험하고 싶다면 빠뜨릴 수 없는 식당입니다.\n',
      },
    ],
  },

  poi: {
    title: 'Poi',
    subtitle: '포이',
    desc: '포이는 타로를 쪄서 곱게 으깬 뒤 물을 섞어 만든 하와이의 전통 주식이다.',
    images: [
      { src: 'assets/images/p9.jpg', caption: 'poi_1' },
      { src: 'assets/images/p9_2.jpg', caption: 'poi_2' },
      { src: 'assets/images/p9_3.jpg', caption: 'poi_3' },
      { src: 'assets/images/p9_4.jpg', caption: 'poi_4' },
      {
        src: 'assets/images/p9_5.jpg',
        caption:
          '[하와이 포이 맛집 추천]\n' +
          '📝 맛집 이름: Waiahole Poi Factory (와이아홀레 포이 팩토리)\n' +
          '📍 위치: 오아후 섬 와이아홀레(Kāneʻohe 인근, 동쪽 해안)\n' +
          '✅ 유명한 이유: 신선한 손 으깬 포이(hand-pounded poi)를 맛볼 수 있는 드문 장소로, 하와이 전통 음식인 포이의 제조 과정을 직접 유지하는 곳입니다. 1905년 문을 연 유서 깊은 가게 건물을 활용하여 1970년대부터 현재 운영자 가족이 하와이 전통 음식을 판매하고 있는데, 공장이라는 이름처럼 포이를 직접 만들어 공급할 만큼 포이에 대한 자부심이 높습니다. 현지 농장에서 재배한 타로 뿌리를 옛 방식대로 찌고 빻아 만들기 때문에 맛이 신선하고 진하며, 하와이 사람들도 “이곳 포이가 아마 가장 신선하고 최고”라고 칭할 정도입니다. 관광지와 떨어진 시골 마을에 있지만 전통 음식을 찾는 이들이 끊이지 않아 주말이면 줄을 설 정도입니다. \n' +
          '🍽️	대표 메뉴 및 가격대: 포이(Poi)는 작은 사이즈 약 $6, 큰 사이즈 $7 미만으로 판매하며, 처음 접하는 사람은 맛보기 용으로 소량을 주문할 수 있습니다. 포이를 단품으로도 팔지만 보통 칼루아 피그 + 포이 플레이트나 비프 스튜 + 포이 플레이트 등 콤보 플레이트로 즐기는 것을 추천하는데, 한 접시에 포이(또는 밥), 고기 요리, 로미 연어, 하우피아(코코넛 디저트)가 제공되고 가격은 보통 $15 안팎입니다. 이 밖에 이 집에서는 달콤한 릴리코이 버터 모찌 아이스크림 등의 디저트도 유명해 후식까지 함께 즐길 수 있습니다.\n' +
          '• 한 줄 요약:포이는 타로 뿌리를 쪄서 물과 함께 으깬 뒤 발효시켜 만든 걸쭉한 보라색 반죽으로, 하와이 전통 주식 중 하나입니다. Waiahole Poi Factory에서는 이 포이를 현대식 기계뿐 아니라 전통 손절구 방식으로도 만들어 판매하며, 막 만든 신선한 포이는 살짝 단맛이 돌고 부드러운 것이 특징입니다. 처음 먹어보는 사람에게는 시큼하고 독특한 풍미가 생소할 수 있지만, 짭조름한 칼루아 돼지나 짭짤한 생선 요리와 함께 곁들이면 조화로운 맛을 느낄 수 있습니다. 와이아홀레 포이 팩토리에서는 포이를 비롯해 다양한 정통 하와이 음식을 맛볼 수 있고, 전통 공예품 체험까지 마련되어 있어 단순한 식사가 아니라 하와이 문화에 대한 이해를 높이는 특별한 방문이 될 것입니다.\n',
      },
    ],
  },

  butter: {
    title: 'Butter Mochi',
    subtitle: '버터모치',
    desc: '버터모치는 찹쌀가루(모치코)에 코코넛 밀크, 버터 등을 섞어 구운 하와이식 디저트 케이크다.',
    images: [
      { src: 'assets/images/p10.jpg', caption: 'butter mochi_1' },
      { src: 'assets/images/p10_2.jpg', caption: 'butter mochi_2' },
      { src: 'assets/images/p10_3.jpg', caption: 'butter mochi_3' },
      { src: 'assets/images/p10_4.jpg', caption: 'butter mochi_4' },
      {
        src: 'assets/images/p10_5.jpg',
        caption:
          '[하와이 버터모치 맛집 추천]\n' +
          '📝 맛집 이름: Diamond Head Market & Grill (다이아몬드 헤드 마켓 & 그릴)\n' +
          '📍 위치: 오아후 섬 호놀룰루(다이아몬드 헤드 인근 몬serrat 애비뉴)\n' +
          '✅ 유명한 이유: 현지인들에게 디저트 천국으로 통하는 마켓 겸 식당으로, 특히 구운 버터 모치가 맛있기로 소문나 있습니다. 다양한 베이커리류와 핫푸드 코너가 있는 곳이지만, 대표 디저트 중 하나인 버터 모치는 “군더더기 없이 클래식한 맛으로 정말 훌륭하다”는 평을 받을 만큼 인기가 높습니다. 매장 내 베이커리 코너에서 직접 구워내기 때문에 신선하고 촉촉하며, 현지 블로그나 입소문을 통해 여행객들 사이에서도 “하와이 오면 꼭 먹어봐야 할 간식”으로 자리잡았습니다. \n' +
          '	🍽️대표 메뉴 및 가격대: 버터 모치는 3인치 정사각형 크기의 두툼한 조각으로 포장되어 판매되며, 조각당 약 $3.5~$4 정도입니다. 쫀득하고 진한 버터 풍미를 자랑하는 기본 버터 모치 외에도, 초콜릿 칩을 넣은 버전이나 코코넛 밀크 풍미를 더한 버전 등 변형도 가끔 선보입니다. 이 밖에도 이 가게는 블루베리 크림치즈 스콘, 펌킨 크런치 케이크 등 베이크 상품들과 가벼운 플레이트 런치 메뉴($10~$15대)도 유명합니다.\n' +
          '• 한 줄 요약:버터 모치는 일본 모치(떡)에서 유래된 하와이식 디저트로, 쌀가루(mochiko)와 코코넛 밀크, 버터 등을 섞어 구워낸 쫄깃하면서도 촉촉한 케이크입니다. Diamond Head Market & Grill의 버터 모치는 번쩍이는 화려함 없이 담백한 홈메이드 스타일로 구워져 나오지만 한 입 먹으면 빠져드는 깊은 맛을 자랑합니다. 꾸덕하면서도 쫀득한 식감에 적당한 단맛이 어우러져 커피나 차와 곁들이기 좋고, 든든한 식사 후 입가심 디저트로도 훌륭합니다. 가게 내 마켓 섹션에서 간편히 테이크아웃할 수 있어 다이아몬드 헤드 등산이나 시내 관광 중 출출할 때 들러서 하와이 현지의 달콤한 간식을 즐겨보기에 안성맞춤입니다.\n',
      },
    ],
  },

  saimin: {
    title: 'Salmin',
    subtitle: '사이민',
    desc: '사이민은 하와이에서 탄생한 국물 국수로, 면을 맑은 육수에 말아 파와 가마보코를 올려 먹는다.',
    images: [
      { src: 'assets/images/p11.jpg', caption: 'saimin_1' },
      { src: 'assets/images/p11_2.jpg', caption: 'saimin_2' },
      { src: 'assets/images/p11_3.jpg', caption: 'saimin_3' },
      { src: 'assets/images/p11_4.jpg', caption: 'saimin_4' },
      {
        src: 'assets/images/p11_5.jpg',
        caption:
          '[하와이 사이민 맛집 추천]\n' +
          '📝 맛집 이름: 맛집 이름: Hamura Saimin Stand (하무라 사이민 스탠드)\n' +
          '📍위치: 카우아이 섬 리후에(Līhuʻe)\n' +
          '✅ 유명한 이유: 1952년부터 운영된 카우아이의 노포 사이민 식당으로, 하와이 현지의 사이민 문화를 대표하는 상징적인 곳입니다. 2006년 미국 James Beard Foundation으로부터 “아메리카 클래식” 상을 수상하며 하와이 향토음식으로서의 가치를 인정받았고 ￼, 현지인뿐만 아니라 수많은 관광객들이 옛날 그대로의 맛을 찾아 줄을 이을 만큼 인기가 높습니다. 허름한 카운터 좌석과 오픈 주방을 갖춘 소박한 분위기지만 70년 역사를 고스란히 느낄 수 있으며, 카우아이 방문객들이 “반드시 먹어봐야 할 리스트”에 꼽는 맛집으로 자리잡았습니다. \n' +
          '🍽️	대표 메뉴 및 가격대: 대표 메뉴는 당연히 사이민(Saimin)으로, 돼지육수와 가쓰오 국물을 기본으로 한 맑은 국물에 쫄깃한 주황빛 에그면, 그리고 차슈 돼지고기, 어묵, 파 등이 고명으로 올라갑니다. 기본 사이민 한 그릇이 약 $8~$9 정도이며, 물만두(원톤)과 스팸 등이 추가된 특별 사이민(Special Saimin)도 $10 안팎으로 인기입니다. 사이드로 곁들이기 좋은 그릴드 테리야키 비프 스틱이나 치킨 스틱은 꼬치 하나에 $2 남짓하고, 식후 디저트로 유명한 릴리코이(패션후르츠) 치폰 파이 한 조각은 약 $3.50 정도로 저렴하게 즐길 수 있습니다.\n' +
          '• 한 줄 요약:사이민은 일본 라멘과 중국 국수의 영향으로 탄생한 하와이 고유의 퓨전 면요리로, 하와이 사람들에게는 어린 시절부터 익숙한 소울 푸드입니다. Hamura Saimin Stand에서는 집에서 만들듯 손수 우려낸 깊은 국물에 쫄깃한 면발, 그리고 차슈와 달걀지단, 어묵 등의 전통 고명을 듬뿍 얹은 옛날 스타일 사이민을 맛볼 수 있습니다 ￼. 비 오는 날이면 특히 생각나는 따뜻하고 담백한 국물 맛으로 유명하며, 함께 제공되는 바삭한 그릴드 바베큐 고기 꼬치와의 조합도 훌륭합니다. 낡은 바 테이블에 둘러앉아 현지인들과 어깨를 맞대고 후루룩 면을 먹다 보면 마치 오래된 하와이 로컬로 돌아간 듯한 정겨운 느낌을 받을 수 있는 곳입니다.\n',
      },
    ],
  },

  manapua: {
    title: 'Manapua',
    subtitle: '마나푸아',
    desc: '마나푸아는 차슈 돼지고기 소를 넣어 크게 만든 하와이식 찐빵으로, 중국의 차슈바오가 현지화된 음식이다.',
    images: [
      { src: 'assets/images/p12.jpg', caption: '중국 이민 문화 흔적.' },
      { src: 'assets/images/p12_2.jpg', caption: '중국 이민 문화 흔적.' },
      { src: 'assets/images/p12_3.jpg', caption: '중국 이민 문화 흔적.' },
      { src: 'assets/images/p12_4.jpg', caption: '중국 이민 문화 흔적.' },
    ],
  },

  waikiki: {
    title: 'Waikiki Beach',
    subtitle: '와이키키 해변',
    desc: '와이키키 해변은 오아후 섬 남부 호놀룰루에 위치한 하와이 최고의 관광 해변으로, 다이아몬드 헤드를 배경으로 펼쳐지는 백사장이 특징이다.',
    images: [{ src: 'assets/images/p13.jpg', caption: '하와이 관광 중심.' }],
  },
};

const detailOverlay = document.getElementById('detailOverlay');
const detailContent = document.getElementById('detailContent');
const detailClose = document.getElementById('detailClose');

function openDetail(key) {
  const data = DETAIL_DATA[key];
  if (!data || !detailOverlay || !detailContent) return;

  const imgsHTML = (data.images || [])
    .map((img) => {
      const captionHTML = img.caption
        ? `<figcaption class="detail-caption">${nl2br(
            img.caption
          )}</figcaption>`
        : '';
      return `
        <figure class="detail-figure">
          <img src="${img.src}" alt="${data.title}">
          ${captionHTML}
        </figure>
      `;
    })
    .join('');

  detailContent.innerHTML = `
    <h2 class="detail-title">${data.title}</h2>
    <p class="detail-sub">${data.subtitle}</p>
    <p class="detail-desc">${nl2br(data.desc)}</p>
    <div class="detail-gallery">${imgsHTML}</div>
  `;

  detailOverlay.hidden = false;
  detailOverlay.classList.add('is-open');

  // 오버레이 열리면 스크롤 맨 위
  detailOverlay.scrollTop = 0;

  // (선택) 뒤 페이지 스크롤 잠금
  document.documentElement.classList.add('is-detail-open');
}

function closeDetail() {
  if (!detailOverlay) return;
  detailOverlay.classList.remove('is-open');

  // 페이드아웃 애니메이션 후 hidden 처리 (CSS transition 시간과 맞추기)
  setTimeout(() => {
    detailOverlay.hidden = true;
  }, 350);

  document.documentElement.classList.remove('is-detail-open');
}

if (detailOverlay && detailContent && detailClose && items.length) {
  items.forEach((item) => {
    item.addEventListener('click', () => {
      const key = item.getAttribute('data-key');
      openDetail(key);
    });
  });

  detailClose.addEventListener('click', closeDetail);

  // ESC로 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !detailOverlay.hidden) closeDetail();
  });

  // (선택) 오버레이 바깥 클릭으로 닫고 싶으면:
  // detailOverlay.addEventListener('click', (e) => {
  //   if (e.target === detailOverlay) closeDetail();
  // });
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

      const w = window.innerWidth;
      const h = window.innerHeight;
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
