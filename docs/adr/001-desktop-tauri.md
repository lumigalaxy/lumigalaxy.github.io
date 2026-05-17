# ADR-001: 桌面端技术选型 — Tauri vs Clawd Fork vs Electron

- **状态**：已采纳 ✅
- **日期**：2026-05-16
- **决策者**：_你的名字_

## 背景

像素星球需要一个桌面端 MVP。之前已有两个调研路径：
1. Fork [Clawd on Desk](https://github.com/...)（基于 Claude Code session hooks 的桌宠）
2. 自建 Tauri 项目 (`apps/desktop` 前身 `桌宠相关文档/`)

需要在 v1.0 之前做出最终路线选择。

## 候选方案

| 方案 | 优势 | 劣势 |
| ---- | ---- | ---- |
| **Fork Clawd** | 已有完整 hooks 生态、12 状态动画、permission bubble | 1. 项目独立性受质疑 2. 强绑定开发者工具定位 3. fork 维护成本高 |
| **Tauri 自建** | 1. 完全自有代码 2. 复用 Web 端 SVG 资产 3. 安装包小（< 30MB） | Rust 学习曲线、生态比 Electron 小 |
| **Electron** | 生态最成熟 | 安装包大、内存占用高、品牌感弱 |

## 决策

**采用 Tauri**。

## 理由

1. **作品独立性**：简历叙述"0→1 独立操盘"，必须是自己写的代码。Clawd 是已有开源项目，fork 不能称为独立。
2. **定位差异**：Clawd 强绑定 Claude Code/Cursor session 状态，是"程序员工具"；像素星球是"陪伴+创意"产品，5 角色不仅服务程序员。
3. **资产复用**：Web 端的 SVG 像素动画与 5 角色组件可以直接搬进 Tauri WebView，零迁移成本。
4. **体积优势**：Tauri WebView 复用系统组件，安装包能压到 30MB 以内，对桌宠这种"轻量陪伴"产品非常重要。
5. **后续路线清晰**：Tauri 2 已支持透明窗 + click-through + 系统托盘 + 全局快捷键，桌宠所需能力全部齐备。

## 后果

- ✅ 简历可写"独立完成 Tauri 桌面端 MVP"
- ✅ Web 与 Desktop 共享 `packages/characters` 单一来源
- ⚠️ 需要补 Rust 基础（实际只需要少量胶水代码）
- ⚠️ Clawd 调研成果归档到 `archive/`，作为"早期方案对比"在 Case Study 中提及
