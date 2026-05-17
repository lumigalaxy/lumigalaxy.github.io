# 🛸 Alien Pet · Web 嵌入组件

把 **像素外星人** 嵌到任何网页里，零依赖、纯原生 ES Module。基于 Clawd on Desk 桌宠项目抽出的 Alien 主题改造而来。

---

## 📦 包含什么

```
alien-pet/
├── alien-pet.js          # 核心组件（只有这一个 JS，样式已内联）
├── demo.html             # 3 种用法的完整演示页
├── README.md             # 当前文件
└── assets/               # 12 个带动画的 SVG
    ├── alien-idle-living.svg
    ├── alien-happy.svg
    ├── alien-working-typing.svg
    ├── alien-working-thinking.svg
    ├── alien-sleeping.svg
    ├── alien-notification.svg
    ├── alien-error.svg
    ├── alien-static-base.svg
    ├── alien-idle-follow.svg
    ├── alien-mini-idle.svg
    ├── alien-mini-enter.svg
    └── alien-mini-peek.svg
```

总体积 < 100 KB，无外部依赖。

---

## 🚀 快速开始

### 方式 A：自定义元素（最简单）

```html
<script type="module" src="./alien-pet/alien-pet.js"></script>

<alien-pet size="200" state="idle"></alien-pet>
```

就这一行。属性：

| 属性         | 类型    | 默认      | 说明                                            |
|------------|-------|----------|-----------------------------------------------|
| `size`       | px    | `200`     | 外星人渲染尺寸                                       |
| `state`      | 状态名 | `idle`    | 初始状态，见下方全状态列表                                 |
| `auto-idle`  | bool  | `true`    | 是否自动在 idle / thinking / working 之间循环        |
| `base-path`  | url   | 自动推导   | SVG 资源目录，默认相对于 `alien-pet.js`                  |
| `background` | css   | `transparent` | 背景色                                           |

### 方式 B：JS API（程序化控制）

```html
<div id="my-alien-slot"></div>

<script type="module">
  import { AlienPet } from './alien-pet/alien-pet.js';

  const pet = new AlienPet(document.getElementById('my-alien-slot'), {
    size: 240,
    messages: ['你好，地球朋友！', '欢迎来到外星人星球 🛸'],
    onClick: (evt, pet) => console.log('被点了！'),
  });

  pet.setState('happy');        // 切换到指定状态（持久）
  pet.react('notification');    // 临时反应，几秒后自动回 idle
  pet.say('要喝水吗？');          // 显示一个气泡
  pet.sayRandom();              // 从 messages 里随机说一句
  pet.setSize(180);             // 动态改大小
  pet.destroy();                // 销毁
</script>
```

### 方式 C：悬浮挂载（跟随页面角落）

```html
<script type="module">
  import { mountFloatingAlien } from './alien-pet/alien-pet.js';

  const pet = mountFloatingAlien({
    corner: 'bottom-right',   // bottom-right | bottom-left | top-right | top-left
    offset: 24,               // 距离边缘像素
    size: 160,
    zIndex: 9999,
    messages: ['星球正在苏醒…', '你发现了一位旅行者'],
  });
</script>
```

非常适合作为**网页右下角的吉祥物**。

---

## 🎭 全部状态

| state key        | 效果                                           |
|--------------------|----------------------------------------------|
| `idle`             | 呼吸 + 眨眼 + 左右看（默认空闲状态）                             |
| `idle-follow`      | 空闲时追视鼠标（更有互动感）                                  |
| `happy`            | 弹跳 + 花朵旋转 + ^_^ 眼睛（点击默认反应）                        |
| `thinking`         | 侧身摆动 + 手托下巴 + 思考气泡                             |
| `working`          | 敲小键盘                                         |
| `sleeping`         | 慢呼吸 + 花朵垂下 + Zzz 粒子                             |
| `notification`     | 注意跳动 + 头顶金色感叹号                                 |
| `error`            | 抖动 + 红色闪烁 + XX 眼睛                               |
| `static`           | 静态基础版（不动）                                      |
| `mini-idle`        | 迷你版（窄栏用）                                        |
| `mini-enter`       | 迷你版登场动画                                        |
| `mini-peek`        | 迷你版偷看                                          |

---

## ⚙️ API 参考

### `new AlienPet(container, options)`

| option             | 类型       | 默认              | 说明                                                   |
|--------------------|----------|----------------|------------------------------------------------------|
| `size`               | number   | `200`            | px 尺寸                                                 |
| `basePath`           | string   | 相对 JS 的 `./assets/` | SVG 资源目录                                             |
| `initialState`       | string   | `'idle'`         | 初始状态                                                   |
| `clickReaction`      | string   | `'happy'`        | 点击时切换到的临时状态                                          |
| `clickDurationMs`    | number   | `2800`           | 反应持续多久（ms）后回 idle                                   |
| `autoIdle`           | boolean  | `true`           | 是否自动循环空闲动画                                           |
| `idleCycleMs`        | number   | `22000`          | 空闲循环间隔（ms）                                            |
| `messages`           | string[] | （内置若干）         | 气泡里会说的句子                                             |
| `enableBubble`       | boolean  | `true`           | 是否启用气泡                                               |
| `bubbleDurationMs`   | number   | `3200`           | 气泡显示时长                                                |
| `background`         | css      | `'transparent'`  | 组件外框背景色                                              |
| `onStateChange`      | fn       | —                | `(newState) => void`                                 |
| `onClick`            | fn       | —                | `(evt, pet) => void`                                 |

### 实例方法

- `setState(state, { persistent })` — 切换状态；`persistent=true` 不自动回 idle
- `react(state)` — 临时反应
- `say(text, ms?)` — 显示气泡
- `sayRandom()` — 随机说一句
- `setMessages(arr)` — 动态替换消息池
- `setSize(px)` — 改尺寸
- `destroy()` — 销毁

---

## 🌍 集成到你的外星人星球网页

最简单的集成步骤（假设你的项目是 `my-planet/`）：

1. 把整个 `alien-pet/` 文件夹复制到你项目目录，比如 `my-planet/alien-pet/`
2. 在你的 HTML 里加一行：

```html
<script type="module" src="./alien-pet/alien-pet.js"></script>
<alien-pet size="200" state="idle"></alien-pet>
```

3. 启动一个本地服务器（**不能用 `file://` 直接打开**，ES Module 会被浏览器拦）：

```bash
# 在 my-planet/ 目录下
python3 -m http.server 8080
# 或者
npx serve .
```

4. 浏览器访问 `http://localhost:8080/`，搞定 🎉

### 更好看的融合建议

- **背景透明**：`<alien-pet>` 默认背景透明，直接叠在你的星球图片/视频上就行
- **绑定剧情**：星球某区域被点击时 `pet.say('这是火山平原')`
- **跟随引导**：滚动到某个区块时 `pet.setState('notification')` 提示注意
- **成就解锁**：成就达成瞬间 `pet.react('happy')` 并播放气泡

---

## 🧪 本地预览

在这个包目录下启动任意静态服务器：

```bash
cd alien-pet
python3 -m http.server 8080
```

然后打开 `http://localhost:8080/demo.html`。

---

## 📝 许可 & 来源

- 核心素材来自 [clawd-on-desk](https://github.com/) 项目的 Alien 主题
- 许可：MIT
