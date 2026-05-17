# 像素星球 · Pixel Planet

> 一个由 5 个像素风外星人组成的 AI 原生桌宠产品。每个角色拥有独立世界观、知识库与对话风格，通过 RAG 实现角色化讲述与互动，最终汇聚为可视化"星球"门户。

🛸 在线体验（Web 版）：_待部署_  
🖥️ 桌面端下载：_开发中_  
📄 [产品需求文档 (PRD)](./docs/PRD.md) · [角色 Bible](./docs/character-bibles/) · [迭代日志](./docs/CHANGELOG.md)

---

## 5 位居民

| 编号 | 中文名 | 物种 | 母星 | 一句话定位 |
| ---- | ----- | ---- | ---- | --------- |
| SPA-001 | 像素人 | Pixelkin | Pixelia | 桌面边界守护者，以光标为食 |
| ALN-002 | 雏菊 | Teardropian | Daisya | 安静的屏幕邻居，47 分钟提醒喝水 |
| ALN-003 | Lumi | Cyclopsian | Tera-IX | 单眼穿透代码，结对编程伙伴 |
| ALN-004 | 柯基 | Corgian | Earth / Sofa Belt | 8 秒循环温暖，回头确认你还在 |
| ALN-005 | 赤炎精灵 | Flame Spirit | Pyros-3 | 火焰随情绪变色，数据库里最温热的邻居 |

---

## 仓库结构

```
.
├── apps/
│   ├── web/                # 星球门户网页（v3.2 单文件 → 模块化）
│   └── desktop/            # Tauri 桌面端（5 角色 + 系统托盘 + 透明窗）
├── packages/
│   ├── characters/         # 5 角色定义（单一来源，web & desktop 共享）
│   └── rag/                # RAG 检索 + LLM 调用 + Prompt 拼装
├── docs/
│   ├── PRD.md              # 产品需求文档
│   ├── character-bibles/   # 5 份角色设定 Bible
│   ├── competitive-analysis/
│   ├── architecture.md     # 技术架构图
│   ├── CHANGELOG.md
│   └── ROADMAP.md
├── archive/                # 早期实验（Clawd 调研、旧版形象）
└── assets/                 # 共享原图、Logo
```

---

## 技术栈

- **前端**：HTML/CSS/JS（v3.2 单文件） · React 19 + Vite + TypeScript（桌面端）
- **桌面端**：Tauri 2 (Rust)
- **AI**：LLM API（Claude / GPT-4o / DeepSeek）+ 边缘函数代理
- **RAG**：`@xenova/transformers`（bge-small-zh）+ 内存向量库
- **状态**：PAD 情绪模型（Pleasure/Arousal/Dominance）+ localStorage 持久化

---

## 本地启动

### Web（v3.2 静态页）
```bash
cd apps/web
python3 -m http.server 8080  # 或任意静态服务
```

### 桌面端
```bash
cd apps/desktop
npm install
npm run tauri dev
```

---

## 项目里程碑

- ✅ **v1.0 ~ v3.2**：5 角色形象 + 世界观 + 网页星球门户
- 🚧 **v0.4**：RAG + LLM 接入（角色化对话）
- 🚧 **v0.5**：故事讲述 + 小游戏集成
- 📋 **v1.0**：桌面端 MVP（Tauri，1 角色起步）

详见 [`docs/ROADMAP.md`](./docs/ROADMAP.md)。

---

## License

MIT
