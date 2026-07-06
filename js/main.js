// main.js — FLACE

// ctx.roundRect() 미지원 브라우저 대응 (Chrome 99 미만, Firefox 112 미만)
// topOnly: true 이면 상단 모서리만 둥글게
function drawRoundRect(ctx, x, y, w, h, r, topOnly) {
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  if (topOnly) {
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
  } else {
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  }
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

document.addEventListener('DOMContentLoaded', () => {
  NavMenu.init();
  ContestSlider.init('#contestSlider');
  BubbleManager.init();
  SpriteAnimator.init('spriteCanvas');
  TagPopup.init();
  TabManager.init('.subpage-tabs');
});


/* =============================================
   NAV MENU (햄버거)
   ============================================= */
const NavMenu = {
  toggle: null,
  drawer: null,

  init() {
    this.toggle = document.getElementById('navToggle');
    this.drawer = document.getElementById('navDrawer');
    if (!this.toggle || !this.drawer) return;

    this.toggle.addEventListener('click', () => this.handleToggle());

    // 메뉴 링크 클릭 시 닫기
    this.drawer.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => this.close());
    });

    // 드로어 바깥 클릭 시 닫기
    document.addEventListener('click', (e) => {
      if (
        this.drawer.classList.contains('is-open') &&
        !this.drawer.contains(e.target) &&
        !this.toggle.contains(e.target)
      ) {
        this.close();
      }
    });

    // ESC 키로 닫기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  },

  handleToggle() {
    const isOpen = this.drawer.classList.toggle('is-open');
    this.toggle.classList.toggle('is-open', isOpen);
    this.toggle.setAttribute('aria-expanded', String(isOpen));
    this.toggle.setAttribute('aria-label', isOpen ? '메뉴 닫기' : '메뉴 열기');
  },

  close() {
    this.drawer.classList.remove('is-open');
    this.toggle.classList.remove('is-open');
    this.toggle.setAttribute('aria-expanded', 'false');
    this.toggle.setAttribute('aria-label', '메뉴 열기');
  },
};


/* =============================================
   CONTEST SLIDER
   자동 10초 슬라이드 / 1/N 카운터 / dot 페이지네이션
   ============================================= */
const ContestSlider = {
  el:      null,
  track:   null,
  dots:    [],
  counter: null,
  current: 0,
  total:   0,
  timer:   null,
  INTERVAL: 10000,

  init(selector) {
    this.el = document.querySelector(selector);
    if (!this.el) return;

    this.track   = document.getElementById('sliderTrack');
    this.counter = document.getElementById('sliderCounter');
    this.dots    = Array.from(document.querySelectorAll('.slider__dot'));
    this.total   = this.el.querySelectorAll('.slider__slide').length;

    if (this.total === 0) return;

    // dot 클릭으로 직접 이동
    this.dots.forEach(dot => {
      dot.addEventListener('click', () => {
        this.goTo(Number(dot.dataset.index));
        this.restartAuto();
      });
    });

    // 슬라이더에 호버 시 자동 일시정지
    this.el.addEventListener('mouseenter', () => this.stopAuto());
    this.el.addEventListener('mouseleave', () => this.startAuto());

    this.goTo(0);
    this.startAuto();
  },

  goTo(index) {
    this.current = ((index % this.total) + this.total) % this.total;
    this.track.style.transform = `translateX(-${this.current * 100}%)`;

    this.dots.forEach((d, i) => d.classList.toggle('is-active', i === this.current));

    if (this.counter) {
      this.counter.textContent = `${this.current + 1} / ${this.total}`;
    }
  },

  next() { this.goTo(this.current + 1); },

  startAuto() {
    this.timer = setInterval(() => this.next(), this.INTERVAL);
  },

  stopAuto() {
    clearInterval(this.timer);
    this.timer = null;
  },

  restartAuto() {
    this.stopAuto();
    this.startAuto();
  },
};


/* =============================================
   BUBBLE MANAGER
   페이지 갱신 시 말풍선 이미지를 랜덤 선택
   ─ 이미지 파일 추가 시 주석 해제하면 바로 반영됨
   ============================================= */
const BubbleManager = {
  images: [
    'assets/speech_bubble/bubble_01.png',
    'assets/speech_bubble/bubble_02.png',
    'assets/speech_bubble/bubble_03.png',
    // 말풍선 추가 시 여기에 경로 추가
  ],

  bubbleEl: null,
  imgEl:    null,

  init() {
    this.bubbleEl = document.getElementById('heroBubble');
    this.imgEl    = document.getElementById('heroBubbleImg');
    if (!this.bubbleEl || !this.imgEl) return;

    const chosen = this.pickRandom();
    if (!chosen) return;

    // 이미지 없으면 placeholder 유지 (콘솔 에러 없음)
    this.imgEl.onerror = () => { this.imgEl.removeAttribute('src'); };
    this.imgEl.onload  = () => { this.bubbleEl.classList.add('has-image'); };
    this.imgEl.src = chosen;
  },

  pickRandom() {
    if (this.images.length === 0) return null;
    return this.images[Math.floor(Math.random() * this.images.length)];
  },

  show() { if (this.bubbleEl) this.bubbleEl.classList.remove('is-hidden'); },
  hide() { if (this.bubbleEl) this.bubbleEl.classList.add('is-hidden'); },
};


/* =============================================
   SPRITE ANIMATOR
   상태 머신: idle1 → transition12 → idle2 → transition21 → (반복)
   idle 구간에만 말풍선 표시

   시퀀스별 개별 PNG 파일 사용 (각 파일 = 가로 프레임 스트립)
   프레임 수·FPS 변경 시 SPRITE_CONFIG 만 수정
   ============================================= */

// 시퀀스별 프레임 수 · FPS — 여기만 수정
const SPRITE_CONFIG = {
  idle1:        { frames: 2, fps: 8 },
  transition12: { frames: 4, fps: 8 },
  idle2:        { frames: 2, fps: 8 },
  transition21: { frames: 4, fps: 8 },
};

const SpriteAnimator = {
  config: {
    frameWidth:  520,   // 프레임 1장 폭(px)
    frameHeight: 640,   // 프레임 1장 높이(px)
    sequences: {
      idle1:        { src: 'assets/character/haz_idle1.png',           frames: SPRITE_CONFIG.idle1.frames,        fps: SPRITE_CONFIG.idle1.fps,        loop: true  },
      transition12: { src: 'assets/character/haz_transition_1to2.png', frames: SPRITE_CONFIG.transition12.frames,  fps: SPRITE_CONFIG.transition12.fps,  loop: false },
      idle2:        { src: 'assets/character/haz_idle2.png',           frames: SPRITE_CONFIG.idle2.frames,         fps: SPRITE_CONFIG.idle2.fps,         loop: true  },
      transition21: { src: 'assets/character/haz_transition_2to1.png', frames: SPRITE_CONFIG.transition21.frames,  fps: SPRITE_CONFIG.transition21.fps,  loop: false },
    },
    idleMinMs: 3000,
    idleMaxMs: 6000,
  },

  canvas:     null,
  ctx:        null,
  // 시퀀스별 이미지 캐시: { seqName: { img: HTMLImageElement, loaded: boolean } }
  sheets:     {},

  state:      'idle1',
  frame:      0,
  frameTimer: null,
  idleTimer:  null,

  NEXT_STATE: {
    idle1:        'transition12',
    transition12: 'idle2',
    idle2:        'transition21',
    transition21: 'idle1',
  },

  isIdle(state) { return state === 'idle1' || state === 'idle2'; },

  init(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    // 모든 시퀀스 이미지 사전 로드 (없으면 placeholder로 대체, 콘솔 에러 없음)
    Object.entries(this.config.sequences).forEach(([name, seq]) => {
      const entry = { img: new Image(), loaded: false };
      entry.img.onload  = () => { entry.loaded = true; };
      entry.img.onerror = () => { entry.loaded = false; };   // 파일 없어도 무시
      entry.img.src = seq.src;
      this.sheets[name] = entry;
    });

    this.enterState('idle1');
  },

  enterState(newState) {
    clearTimeout(this.idleTimer);
    clearInterval(this.frameTimer);

    this.state = newState;
    this.frame = 0;

    // 말풍선 표시/숨김
    if (this.isIdle(newState)) {
      BubbleManager.show();
    } else {
      BubbleManager.hide();
    }

    this.startFrameLoop();

    // idle 상태면 랜덤 시간 후 다음 상태로 전환
    if (this.isIdle(newState)) {
      const delay = this.config.idleMinMs +
        Math.random() * (this.config.idleMaxMs - this.config.idleMinMs);
      this.idleTimer = setTimeout(() => this.enterState(this.NEXT_STATE[newState]), delay);
    }
  },

  startFrameLoop() {
    const seq = this.config.sequences[this.state];
    const ms  = 1000 / seq.fps;

    this.frameTimer = setInterval(() => {
      this.drawFrame(this.state, this.frame);
      this.frame++;

      // 비루프 시퀀스(전환)가 끝나면 다음 상태로
      if (!seq.loop && this.frame >= seq.frames) {
        clearInterval(this.frameTimer);
        this.enterState(this.NEXT_STATE[this.state]);
      } else {
        this.frame %= seq.frames;
      }
    }, ms);
  },

  drawFrame(state, frameIdx) {
    const { ctx, canvas, config } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const sheet = this.sheets[state];
    if (sheet && sheet.loaded) {
      // 가로 스트립에서 해당 프레임 슬라이싱 (sy = 0, 행은 항상 첫 번째)
      ctx.drawImage(
        sheet.img,
        frameIdx * config.frameWidth, 0,
        config.frameWidth,            config.frameHeight,
        0,                            0,
        canvas.width,                 canvas.height
      );
    } else {
      this.drawPlaceholder(state, frameIdx);
    }
  },

  drawPlaceholder(state, frameIdx) {
    const { ctx, canvas } = this;
    const W = canvas.width;
    const H = canvas.height;

    // 상태별 색상
    const colors = {
      idle1:        '#7ECFC0',
      transition12: '#F4845F',
      idle2:        '#B8A9D9',
      transition21: '#F4845F',
    };
    const bg = colors[state] !== undefined ? colors[state] : '#EAE0D5';

    // 배경
    ctx.fillStyle = bg + '55';
    ctx.beginPath();
    drawRoundRect(ctx, 8, 8, W - 16, H - 16, 16);
    ctx.fill();

    // 외곽선
    ctx.strokeStyle = bg;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 캐릭터 몸통 placeholder (원형)
    const cx = W / 2;
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(cx, H * 0.38, 44, 0, Math.PI * 2);
    ctx.fill();

    // 눈 (프레임에 따라 깜빡임 효과)
    ctx.fillStyle = '#FDF6EE';
    const eyeY  = H * 0.35;
    const blink = (frameIdx === 2);
    const eyeH  = blink ? 2 : 10;
    ctx.beginPath();
    ctx.ellipse(cx - 14, eyeY, 7, eyeH / 2, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 14, eyeY, 7, eyeH / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // 몸통
    ctx.fillStyle = bg + 'AA';
    ctx.beginPath();
    drawRoundRect(ctx, cx - 30, H * 0.58, 60, H * 0.36, 8, true);
    ctx.fill();

    // 상태 텍스트
    ctx.fillStyle = '#3A3228';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(state, cx, H - 10);
  },
};


/* =============================================
   TAB MANAGER (contents.html)
   ============================================= */
const TabManager = {
  init(selector) {
    const container = document.querySelector(selector);
    if (!container) return;

    const btns   = container.querySelectorAll('.tab-btn');
    const panels = container.querySelectorAll('.tab-panel');

    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        btns.forEach(b => b.classList.remove('is-active'));
        panels.forEach(p => p.classList.remove('is-active'));
        btn.classList.add('is-active');
        const panel = container.querySelector(`#tab-${target}`);
        if (panel) panel.classList.add('is-active');
      });
    });
  },
};


/* =============================================
   TAG POPUP (아쿠리 하즈)
   ============================================= */
const TagPopup = {
  overlay:  null,
  closeBtn: null,
  tagBtn:   null,

  init() {
    this.overlay  = document.getElementById('tagPopup');
    this.closeBtn = document.getElementById('tagPopupClose');
    this.tagBtn   = document.getElementById('tagBtn');
    if (!this.overlay) return;

    this.tagBtn?.addEventListener('click', () => this.open());
    this.closeBtn?.addEventListener('click', () => this.close());

    // 오버레이 배경 클릭 시 닫기
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    // ESC 키로 닫기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlay.classList.contains('is-open')) {
        this.close();
      }
    });
  },

  open() {
    this.overlay.classList.add('is-open');
    this.overlay.setAttribute('aria-hidden', 'false');
    this.closeBtn?.focus();
  },

  close() {
    this.overlay.classList.remove('is-open');
    this.overlay.setAttribute('aria-hidden', 'true');
    this.tagBtn?.focus();
  },
};
