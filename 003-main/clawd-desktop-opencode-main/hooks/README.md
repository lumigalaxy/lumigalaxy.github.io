# Clawd OpenCode 插件

本项目同时支持 **Claude Code** 和 **OpenCode** 两种 AI 编程助手的集成。

## 文件说明

| 文件 | 说明 |
|------|------|
| `clawd-hook.js` | Claude Code 的 hook 脚本（命令行方式） |
| `install.js` | Claude Code hook 安装器 |
| `clawd-opencode.ts` | OpenCode 的 TypeScript 插件 |
| `install-opencode.js` | OpenCode 插件安装器 |

## OpenCode 插件安装

### 方法一：自动安装（推荐）

```bash
# 安装到项目级别（.opencode/plugins/）或全局（~/.config/opencode/plugins/）
node hooks/install-opencode.js

# 安装到全局
node hooks/install-opencode.js --global

# 检查安装状态
node hooks/install-opencode.js check

# 卸载
node hooks/install-opencode.js uninstall
```

### 方法二：手动安装

1. 复制插件文件到 OpenCode 插件目录：

```bash
# 全局安装
mkdir -p ~/.config/opencode/plugins
cp hooks/clawd-opencode.ts ~/.config/opencode/plugins/

# 或项目级别安装
mkdir -p ./.opencode/plugins
cp hooks/clawd-opencode.ts ./.opencode/plugins/
```

2. 重启 OpenCode 以加载插件

3. 启动 Clawd 桌面宠物：

```bash
npm start
```

## 事件映射

| OpenCode 事件 | Clawd 状态 | 说明 |
|---------------|------------|------|
| `session.created` | `idle` | 会话开始 |
| `session.deleted` | `sleeping` | 会话结束 |
| `tui.prompt.append` | `thinking` | 用户输入提示 |
| `tool.execute.before` | `working` | 工具执行前 |
| `tool.execute.after` | `working` | 工具执行后 |
| `tool.execute.failure` | `error` | 工具执行失败 |
| `session.idle` | `attention` | 空闲/停止 |
| `subagent.start` | `juggling` | 子代理开始 |
| `subagent.stop` | `working` | 子代理停止 |
| `experimental.session.compacting` | `sweeping` | 会话压缩前 |
| `session.compacted` | `attention` | 会话压缩后 |
| `tui.toast.show` | `notification` | 通知显示 |
| `permission.asked` | `notification` | 权限请求 |
| `permission.replied` | `notification` | 权限已回复 |
| `message.part.updated` | `notification` | 引导/询问 |
| `file.watcher.updated` | `carrying` | 文件/工作树变化 |

## 技术架构

```
OpenCode 触发事件
    │
    ├─ OpenCode Plugin (clawd-opencode.ts)
    │   ├─ 接收 OpenCode 事件
    │   ├─ 映射到 Clawd 状态
    │   └─ HTTP POST 到 127.0.0.1:23333/state
    │
    ▼
Clawd HTTP Server (src/main.js)
    ├─ 接收状态更新
    ├─ 事件名称规范化（OpenCode → Claude Code）
    └─ 更新会话状态和动画
```

## 与 Claude Code Hook 的区别

| 特性 | Claude Code | OpenCode |
|------|-------------|----------|
| 触发方式 | 命令行 hook 脚本 | TypeScript 插件函数 |
| 配置位置 | `~/.claude/settings.json` | `.opencode/plugins/` 或 `~/.config/opencode/plugins/` |
| 事件数据 | stdin JSON | 函数参数 |
| 语言 | JavaScript | TypeScript (自动转译) |
| HTTP 请求 | 脚本内发送 | 插件内使用 fetch |
| 权限处理 | 双向 HTTP hook | `permission.asked` 事件（通知） |

## 故障排除

### 插件未生效

1. 检查插件是否正确安装：
   ```bash
   node hooks/install-opencode.js check
   ```

2. 确认 OpenCode 已重启

3. 检查 Clawd 是否正在运行（端口 23333）：
   ```bash
   curl http://127.0.0.1:23333/state -X POST \
     -H "Content-Type: application/json" \
     -d '{"state":"thinking","session_id":"test"}'
   ```

### 权限请求未显示气泡

- OpenCode 的 `permission.asked` 事件会触发 Clawd 的通知动画
- 权限的实际处理由 OpenCode 内部管理
- 确保 Clawd 在 OpenCode 启动前已运行，以接收通知事件

### Electron 启动失败

**问题：** 运行 `npm start` 时提示 `Electron failed to install correctly`

**解决方案：**
```bash
# 重新安装 Electron
rm -rf node_modules/electron
npm install electron
npm start
```

## 开发说明

### 修改插件

编辑 `hooks/clawd-opencode.ts` 后，需要重新安装：

```bash
node hooks/install-opencode.js
```

### 添加新事件

1. 在 `clawd-opencode.ts` 中的 `event` 处理器添加新 case
2. 在 `EVENT_TO_STATE` 映射中添加对应关系
3. 在 `src/main.js` 的 `EVENT_NORMALIZATION` 中添加事件名称映射
4. 重新安装插件

## 许可证

MIT
