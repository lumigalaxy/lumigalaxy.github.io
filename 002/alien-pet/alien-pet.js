/**
 * Alien Pet — 可嵌入的像素外星人组件
 * 基于 clawd-on-desk 桌宠项目抽取的 Web 版本
 *
 * 三种用法：
 *   1. 自定义元素：<alien-pet size="200" state="idle"></alien-pet>
 *   2. JS API：    new AlienPet(container, options)
 *   3. 悬浮挂载：  mountFloatingAlien(options)
 *
 * 零依赖，纯 ES Module。
 */

const STATE_FILE_MAP = {
  idle:           'alien-idle-living.svg',
  'idle-follow':  'alien-idle-follow.svg',
  happy:          'alien-happy.svg',
  thinking:       'alien-working-thinking.svg',
  working:        'alien-working-typing.svg',
  sleeping:       'alien-sleeping.svg',
  notification:   'alien-notification.svg',
  error:          'alien-error.svg',
  static:         'alien-static-base.svg',
  'mini-idle':    'alien-mini-idle.svg',
  'mini-enter':   'alien-mini-enter.svg',
  'mini-peek':    'alien-mini-peek.svg',
};

export const ALIEN_STATES = Object.keys(STATE_FILE_MAP);

/**
 * 解析相对于当前模块的默认资源路径
 */
function defaultBasePath() {
  try {
    return new URL('./assets/', import.meta.url).href;
  } catch (_) {
    return './assets/';
  }
}

/**
 * 简单的点击/悬停日志过滤，避免拖拽误触
 */
function isClickNotDrag(downEvt, upEvt, threshold = 5) {
  if (!downEvt || !upEvt) return true;
  const dx = (upEvt.clientX ?? 0) - (downEvt.clientX ?? 0);
  const dy = (upEvt.clientY ?? 0) - (downEvt.clientY ?? 0);
  return Math.sqrt(dx * dx + dy * dy) <= threshold;
}

const DEFAULT_MESSAGES = [
  '嗨！欢迎来到外星人星球 🛸',
  '你好，地球朋友！',
  '要不要喝口水？',
  '点我试试看～',
  '我是从很远的星系来的',
  '今天过得怎么样？',
];

export class AlienPet {
  constructor(container, options = {}) {
    if (!(container instanceof HTMLElement)) {
      throw new Error('AlienPet: container 必须是 HTMLElement');
    }
    this.container = container;
    this.options = {
      size: 200,
      basePath: defaultBasePath(),
      initialState: 'idle',
      clickReaction: 'happy',
      clickDurationMs: 2800,
      autoIdle: true,
      idleCycleMs: 22000,
      messages: DEFAULT_MESSAGES.slice(),
      enableBubble: true,
      bubbleDurationMs: 3200,
      showShadow: true,
      background: 'transparent',
      petType: 'alien',  // 'alien' | 'clawd' （切换文件名前缀）
      onStateChange: null,
      onClick: null,
      ...options,
    };

    this.state = null;
    this._revertTimer = null;
    this._bubbleTimer = null;
    this._idleTimer = null;
    this._destroyed = false;
    this._downEvt = null;

    this._buildDom();
    this.setState(this.options.initialState, { persistent: true });
    if (this.options.autoIdle) this._startIdleCycle();
  }

  /* ---------- Public API ---------- */

  setState(stateKey, { persistent = false } = {}) {
    if (this._destroyed) return;
    if (!STATE_FILE_MAP[stateKey]) {
      console.warn('[AlienPet] 未知状态:', stateKey, '可用状态:', ALIEN_STATES);
      stateKey = 'idle';
    }
    if (this.state === stateKey) return;

    this.state = stateKey;
    let file = STATE_FILE_MAP[stateKey];
    if (this.options.petType === 'clawd') {
      file = file.replace(/^alien-/, 'clawd-');
    }
    const src = this.options.basePath.replace(/\/?$/, '/') + file;

    // 使用 <img> 加载 SVG：动画（CSS）依然播放，并且 file:// 场景也能工作
    this._img.src = src;
    this._img.alt = `alien-${stateKey}`;

    if (this._revertTimer) {
      clearTimeout(this._revertTimer);
      this._revertTimer = null;
    }

    if (typeof this.options.onStateChange === 'function') {
      try { this.options.onStateChange(stateKey); } catch (e) { console.error(e); }
    }

    if (!persistent) {
      // 临时状态：一段时间后自动回到 idle
      const duration = stateKey === this.options.clickReaction
        ? this.options.clickDurationMs
        : 2500;
      this._revertTimer = setTimeout(() => {
        this._revertTimer = null;
        this.setState('idle', { persistent: true });
      }, duration);
    }
  }

  /**
   * 触发点击反应（外部程序可调用，比如"定时提醒喝水"）
   */
  react(stateKey = this.options.clickReaction) {
    this.setState(stateKey, { persistent: false });
  }

  /**
   * 显示一个对话气泡
   */
  say(text, durationMs) {
    if (!this.options.enableBubble) return;
    if (this._destroyed) return;
    const ms = durationMs ?? this.options.bubbleDurationMs;
    this._bubble.textContent = text;
    this._bubble.classList.add('alien-pet__bubble--visible');
    if (this._bubbleTimer) clearTimeout(this._bubbleTimer);
    this._bubbleTimer = setTimeout(() => {
      this._bubble.classList.remove('alien-pet__bubble--visible');
      this._bubbleTimer = null;
    }, ms);
  }

  /**
   * 随机挑一条消息说出来
   */
  sayRandom() {
    const list = this.options.messages;
    if (!Array.isArray(list) || list.length === 0) return;
    const msg = list[Math.floor(Math.random() * list.length)];
    this.say(msg);
  }

  setMessages(messages) {
    this.options.messages = Array.isArray(messages) ? messages.slice() : [];
  }

  setSize(pxSize) {
    this.options.size = Number(pxSize) || 200;
    this._applySize();
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    if (this._revertTimer) clearTimeout(this._revertTimer);
    if (this._bubbleTimer) clearTimeout(this._bubbleTimer);
    if (this._idleTimer) clearInterval(this._idleTimer);
    this._root?.remove();
  }

  /* ---------- Internals ---------- */

  _buildDom() {
    this._injectBaseStyles();

    const root = document.createElement('div');
    root.className = 'alien-pet';
    root.style.background = this.options.background;

    const stage = document.createElement('div');
    stage.className = 'alien-pet__stage';

    const img = document.createElement('img');
    img.className = 'alien-pet__img';
    img.draggable = false;
    img.alt = 'alien-pet';

    const bubble = document.createElement('div');
    bubble.className = 'alien-pet__bubble';

    stage.appendChild(img);
    root.appendChild(stage);
    root.appendChild(bubble);
    this.container.appendChild(root);

    this._root = root;
    this._stage = stage;
    this._img = img;
    this._bubble = bubble;

    this._applySize();
    this._bindEvents();
  }

  _applySize() {
    const s = this.options.size;
    this._root.style.width = `${s}px`;
    this._root.style.height = `${s}px`;
  }

  _bindEvents() {
    this._root.addEventListener('pointerdown', (e) => { this._downEvt = e; });
    this._root.addEventListener('pointerup', (e) => {
      const wasClick = isClickNotDrag(this._downEvt, e);
      this._downEvt = null;
      if (!wasClick) return;
      this._handleClick(e);
    });
    this._root.addEventListener('pointerenter', () => {
      if (this.state === 'idle' || this.state === 'idle-follow') {
        this.sayRandom();
      }
    });
    this._root.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.setState('notification', { persistent: false });
      this.say('🛰️ 外星人收到信号！');
    });
  }

  _handleClick(evt) {
    this.react(this.options.clickReaction);
    this.sayRandom();
    if (typeof this.options.onClick === 'function') {
      try { this.options.onClick(evt, this); } catch (e) { console.error(e); }
    }
  }

  _startIdleCycle() {
    const cycleStates = ['idle', 'thinking', 'idle', 'working', 'idle', 'idle-follow'];
    let i = 0;
    this._idleTimer = setInterval(() => {
      if (this._destroyed) return;
      if (this.state && this.state !== 'idle' && this._revertTimer) return;
      i = (i + 1) % cycleStates.length;
      const next = cycleStates[i];
      if (next === 'idle') {
        this.setState('idle', { persistent: true });
      } else {
        // 短暂切换到工作/思考状态，几秒后自动回 idle
        this.setState(next, { persistent: false });
      }
    }, this.options.idleCycleMs);
  }

  _injectBaseStyles() {
    if (document.getElementById('alien-pet-base-styles')) return;
    const style = document.createElement('style');
    style.id = 'alien-pet-base-styles';
    style.textContent = `
.alien-pet {
  position: relative;
  display: inline-block;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  user-select: none;
  -webkit-user-select: none;
  cursor: pointer;
  line-height: 0;
}
.alien-pet__stage {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.alien-pet__img {
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
  -webkit-user-drag: none;
  user-drag: none;
  pointer-events: none;
}
.alien-pet__bubble {
  position: absolute;
  left: 50%;
  top: 0;
  transform: translate(-50%, -110%) scale(0.7);
  min-width: 80px;
  max-width: 220px;
  padding: 10px 14px;
  background: #fff;
  color: #222;
  border: 3px solid #111;
  border-radius: 10px;
  box-shadow: 4px 4px 0 #111;
  font-size: 13px;
  line-height: 1.45;
  text-align: center;
  white-space: pre-wrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 220ms ease, transform 220ms cubic-bezier(.2,1.3,.4,1);
  z-index: 2;
}
.alien-pet__bubble::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -10px;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 10px solid #111;
}
.alien-pet__bubble--visible {
  opacity: 1;
  transform: translate(-50%, -110%) scale(1);
}
`;
    document.head.appendChild(style);
  }
}

/* ---------------- 自定义元素封装 ---------------- */

class AlienPetElement extends HTMLElement {
  static get observedAttributes() {
    return ['size', 'state', 'base-path', 'auto-idle', 'background', 'pet-type'];
  }

  connectedCallback() {
    if (this._pet) return;
    const size = parseInt(this.getAttribute('size') || '200', 10);
    const initialState = this.getAttribute('state') || 'idle';
    const basePath = this.getAttribute('base-path') || defaultBasePath();
    const autoIdle = this.getAttribute('auto-idle') !== 'false';
    const background = this.getAttribute('background') || 'transparent';
    const petType = this.getAttribute('pet-type') || 'alien';

    this._pet = new AlienPet(this, {
      size,
      initialState,
      basePath,
      autoIdle,
      background,
      petType,
    });
  }

  disconnectedCallback() {
    this._pet?.destroy();
    this._pet = null;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._pet || oldVal === newVal) return;
    if (name === 'state') this._pet.setState(newVal, { persistent: true });
    if (name === 'size') this._pet.setSize(parseInt(newVal, 10));
    if (name === 'background') this._pet._root.style.background = newVal;
    if (name === 'pet-type') {
      this._pet.options.petType = newVal || 'alien';
      // 切换后重走一次当前状态以重新加载对应前缀的 SVG
      const cur = this._pet.state;
      this._pet.state = null;
      this._pet.setState(cur || 'idle', { persistent: true });
    }
  }

  // 暴露给外部脚本的快捷方法
  react(state) { this._pet?.react(state); }
  say(text, ms) { this._pet?.say(text, ms); }
  setState(state) { this._pet?.setState(state, { persistent: true }); }
}

if (typeof customElements !== 'undefined' && !customElements.get('alien-pet')) {
  customElements.define('alien-pet', AlienPetElement);
}

/* ---------------- 悬浮挂载 ---------------- */

/**
 * 在页面角落挂一只外星人（固定定位悬浮）
 * @param {object} options
 *   - corner: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
 *   - offset: 距离边缘像素，默认 24
 *   - 其余参数同 AlienPet 构造器
 * @returns {AlienPet}
 */
export function mountFloatingAlien(options = {}) {
  const {
    corner = 'bottom-right',
    offset = 24,
    size = 160,
    zIndex = 9999,
    ...petOptions
  } = options;

  const host = document.createElement('div');
  host.setAttribute('data-alien-pet-floating', '');
  host.style.position = 'fixed';
  host.style.zIndex = String(zIndex);
  host.style.pointerEvents = 'auto';
  const offsetPx = `${offset}px`;
  if (corner.includes('bottom')) host.style.bottom = offsetPx; else host.style.top = offsetPx;
  if (corner.includes('right'))  host.style.right  = offsetPx; else host.style.left = offsetPx;

  document.body.appendChild(host);
  const pet = new AlienPet(host, { size, ...petOptions });

  // 附加 destroy() 连带移除 host
  const originalDestroy = pet.destroy.bind(pet);
  pet.destroy = () => {
    originalDestroy();
    host.remove();
  };
  return pet;
}

/* ---------------- 默认导出 ---------------- */

export default {
  AlienPet,
  mountFloatingAlien,
  ALIEN_STATES,
};
