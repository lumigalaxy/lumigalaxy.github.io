<p align="center">
  <img src="assets/tray-icon.png" width="128" alt="Clawd">
</p>
<h1 align="center">Clawd 桌宠</h1>
<p align="center">
  <a href="README.md">English</a>
</p>

一个能实时感知 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 和 [OpenCode](https://opencode.ai/) 工作状态的桌面宠物。Clawd 住在你的屏幕上——你提问时它思考，工具运行时它打字，子代理工作时它杂耍，任务完成时它庆祝，你离开时它睡觉。

> 仅支持 Windows 11。需要 Node.js 和 Claude Code 或 OpenCode。

## 功能特性

- **实时状态感知** — Claude Code 和 OpenCode 插件自动驱动动画
- **12 种动画状态** — 待机、思考、打字、建造、杂耍、指挥、报错、开心、通知、扫地、搬运、睡觉
- **眼球追踪** — 待机状态下 Clawd 跟随鼠标，身体微倾，影子拉伸
- **睡眠序列** — 60 秒无活动 → 打哈欠 → 打盹 → 倒下 → 睡觉；移动鼠标触发惊醒弹起动画
- **点击穿透** — 透明区域的点击直接穿透到下方窗口，只有角色本体可交互
- **点击反应** — 双击戳戳，连点 4 下东张西望
- **任意状态拖拽** — 随时抓起 Clawd（Pointer Capture 防止快甩丢失），松手恢复当前动画
- **多会话追踪** — 多个 Claude Code 会话自动解析到最高优先级状态
- **子代理感知** — 1 个子代理杂耍，2 个以上指挥
- **位置记忆** — 重启后 Clawd 回到上次的位置
- **单实例锁** — 防止重复启动
- **极简模式** — 拖到右边缘或右键"极简模式"；Clawd 藏在屏幕边缘，悬停探头招手，通知/完成有迷你动画，抛物线跳跃过渡
- **系统托盘** — 调大小（S/M/L）、免打扰模式、开机自启

## 状态映射

| Claude Code 事件 | 桌宠状态 | 动画 | |
|---|---|---|---|
| 无活动 | 待机 | 眼球跟踪 | <img src="assets/gif/clawd-idle.gif" width="200"> |
| UserPromptSubmit | 思考 | 思考泡泡 | <img src="assets/gif/clawd-thinking.gif" width="200"> |
| PreToolUse / PostToolUse | 工作（打字） | 打字 | <img src="assets/gif/clawd-typing.gif" width="200"> |
| PreToolUse（3+ 会话） | 工作（建造） | 建造 | <img src="assets/gif/clawd-building.gif" width="200"> |
| SubagentStart（1 个） | 杂耍 | 杂耍 | <img src="assets/gif/clawd-juggling.gif" width="200"> |
| SubagentStart（2+） | 指挥 | 指挥 | <img src="assets/gif/clawd-conducting.gif" width="200"> |
| PostToolUseFailure | 报错 | ERROR + 冒烟 | <img src="assets/gif/clawd-error.gif" width="200"> |
| Stop / PostCompact | 注意 | 开心蹦跳 | <img src="assets/gif/clawd-happy.gif" width="200"> |
| PermissionRequest / Notification | 通知 | 惊叹跳跃 | <img src="assets/gif/clawd-notification.gif" width="200"> |
| PreCompact | 扫地 | 扫帚清扫 | <img src="assets/gif/clawd-sweeping.gif" width="200"> |
| WorktreeCreate | 搬运 | 搬箱子 | <img src="assets/gif/clawd-carrying.gif" width="200"> |
| 60 秒无事件 | 睡觉 | 睡眠序列 | <img src="assets/gif/clawd-sleeping.gif" width="200"> |

> **OpenCode 用户**：请参阅 [hooks/README.md](hooks/README.md) 了解 OpenCode 事件映射。

### 极简模式

将 Clawd 拖到屏幕右边缘（或右键 →"极简模式"）进入。Clawd 藏在屏幕边缘只露出半身，鼠标悬停时探出来招手。

| 触发 | 极简反应 | |
|---|---|---|
| 默认 | 呼吸 + 眨眼 + 偶尔手臂晃动 + 眼球追踪 | <img src="assets/gif/clawd-mini-idle.gif" width="120"> |
| 鼠标悬停 | 探出身体 + 招手（向屏幕内侧滑出 25px） | <img src="assets/gif/clawd-mini-peek.gif" width="120"> |
| 通知 / 权限请求 | 感叹号弹出 + >< 挤眼 | <img src="assets/gif/clawd-mini-alert.gif" width="120"> |
| 任务完成 | 花花 + ^^ 眯眼 + 星星闪烁 | <img src="assets/gif/clawd-mini-happy.gif" width="120"> |
| Peek 时点击 | 退出极简模式（抛物线跳回） | |

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/rullerzhou-afk/clawd-on-desk.git
cd clawd-on-desk

# 安装依赖
npm install

# 注册 Claude Code hooks
node hooks/install.js

# 启动 Clawd
npm start
```

## OpenCode 支持

Clawd 现已支持 [OpenCode](https://opencode.ai/)！使用 OpenCode 插件获得相同的实时动画体验：

```bash
# 安装 OpenCode 插件
node hooks/install-opencode.js

# 或全局安装
node hooks/install-opencode.js --global

# 重启 OpenCode 加载插件
# Clawd 会像响应 Claude Code 一样响应 OpenCode 事件！
```

详细信息请参阅 [hooks/README.md](hooks/README.md)。

## 工作原理

```
Claude Code 触发 hook 事件
  → hooks/clawd-hook.js（从 stdin 读取事件名 + session_id）
  → HTTP POST 到 127.0.0.1:23333
  → main.js 状态机（多会话追踪 + 优先级 + 最小显示时长）
  → IPC 到 renderer.js（SVG 预加载 + 交叉淡入切换）
```

Clawd 以透明无边框、始终置顶、不可聚焦的 Electron 窗口运行，透明区域点击穿透到下方窗口。永远不会抢焦点或打断你的工作流。

### OpenCode 集成

```
OpenCode 触发插件事件
  → hooks/clawd-opencode.ts（TypeScript 插件）
  → HTTP POST 到 127.0.0.1:23333
  → main.js 状态机（事件规范化 + 多会话追踪）
  → IPC 到 renderer.js（SVG 预加载 + 交叉淡入切换）
```

Claude Code 和 OpenCode 使用相同的 HTTP 端点，因此 Clawd 可以无缝兼容两种工具。

## 手动测试

```bash
# 触发指定状态
curl -X POST http://127.0.0.1:23333/state \
  -H "Content-Type: application/json" \
  -d '{"state":"working","session_id":"test"}'

# 循环播放所有动画（每个 8 秒）
bash test-demo.sh

# 循环播放极简模式动画
bash test-mini.sh

# 测试 OpenCode 事件
bash test-opencode.sh
```

## 项目结构

```
src/
  main.js        # Electron 主进程：状态机、HTTP 服务、窗口管理、系统托盘
  renderer.js    # 渲染进程：拖拽、点击、SVG 切换、眼球跟踪
  preload.js     # IPC 桥接（contextBridge）
  index.html     # 页面结构
hooks/
  clawd-hook.js          # Claude Code hook 脚本（零依赖，1 秒超时）
  clawd-opencode.ts      # OpenCode 插件（TypeScript）
  install-opencode.js    # OpenCode 插件安装器
  install.js             # 安全注册 hook 到 ~/.claude/settings.json
assets/
  svg/           # 39 个像素风 SVG 动画（含 8 个极简模式，CSS 关键帧驱动）
  gif/           # 录制的 GIF（用于文档展示）
```

## 故障排除

### Electron 安装错误

**错误信息：**
```
Error: Electron failed to install correctly, please delete node_modules/electron and try installing again
```

**原因：**
此错误发生在 `npm install` 期间 Electron 的二进制分发文件未能正确下载。可能由以下原因导致：
- 初始安装期间网络问题
- 下载文件损坏
- npm 安装过程不完整

**解决方案：**
```bash
# 删除损坏的 electron 模块
rm -rf node_modules/electron

# 重新安装 electron
npm install electron

# 现在再次尝试启动 Clawd
npm start
```

如果问题仍然存在，尝试清除整个 node_modules 并重新安装：
```bash
rm -rf node_modules package-lock.json
npm install
```

## 致谢

- Clawd 像素画参考自 [clawd-tank](https://github.com/marciogranzotto/clawd-tank) by [@marciogranzotto](https://github.com/marciogranzotto)
- Clawd 角色设计归属 [Anthropic](https://www.anthropic.com)。本项目为社区作品，与 Anthropic 无官方关联。

## 许可证

MIT
