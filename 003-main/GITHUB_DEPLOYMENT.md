# GitHub 部署和团队协作指南

## 🌐 快速开始：部署到GitHub

### 第一步：创建GitHub仓库

1. 访问 [GitHub](https://github.com) 并登录
2. 点击右上角的 "+" 按钮，选择 "New repository"
3. 填写仓库信息：
   - **Repository name**: `ai-relationship-techniques` （或你喜欢的名称）
   - **Description**: AI技巧：全自动哄老婆四步法则 - 基于数字游牧人Samuel的原创方法
   - **Visibility**: 选择 "Public" （公开）或 "Private" （私有）
   - **重要！**：不要勾选 "Add a README file"、"Add .gitignore" 或 "Choose a license"
4. 点击 "Create repository"

### 第二步：连接本地仓库到GitHub

复制GitHub上显示的命令，在项目目录中运行：

```bash
# 替换为你的GitHub用户名和仓库名
git remote add origin https://github.com/你的用户名/你的仓库名.git

# 推送到GitHub
git branch -M main
git push -u origin main
```

### 第三步：启用GitHub Pages（可选但推荐）

1. 在GitHub仓库页面，点击 "Settings"
2. 左侧菜单选择 "Pages"
3. 在 "Build and deployment" 部分：
   - Source: 选择 "Deploy from a branch"
   - Branch: 选择 `main` 分支，文件夹选择 `/ (root)`
4. 点击 "Save"
5. 几分钟后，你的网站将可以通过 `https://你的用户名.github.io/你的仓库名/` 访问！

## 👥 团队协作设置

### 添加团队成员

1. 在GitHub仓库页面，点击 "Settings"
2. 左侧菜单选择 "Collaborators"
3. 点击 "Add people"
4. 输入团队成员的GitHub用户名或邮箱
5. 选择角色权限：
   - **Read**: 只读访问
   - **Triage**: 可以管理议题和拉取请求
   - **Write**: 可以直接推送代码
   - **Maintain**: 可以管理仓库设置
   - **Admin**: 完全控制权

### 分支保护策略（推荐）

1. 在 "Settings" → "Branches"
2. 点击 "Add branch protection rule"
3. 设置以下规则：
   - **Branch name pattern**: `main`
   - ✅ Require a pull request before merging
   - ✅ Require approvals (可选：设置需要1-2人审批)
   - ✅ Require status checks to pass
   - ✅ Do not allow bypassing the above

## 🔄 Git工作流程

### 日常开发流程

```bash
# 1. 同步最新代码
git checkout main
git pull origin main

# 2. 创建新分支
git checkout -b feature/你的功能名称
# 或
git checkout -b fix/修复的问题

# 3. 进行开发
# ... 修改代码 ...

# 4. 提交更改
git add .
git commit -m "feat: 添加新功能"

# 5. 推送到GitHub
git push -u origin feature/你的功能名称
```

### 提交信息规范

使用清晰的提交信息格式：

- `feat:` - 新功能
- `fix:` - 修复bug
- `docs:` - 文档更新
- `style:` - 代码格式调整
- `refactor:` - 重构代码
- `test:` - 测试相关
- `chore:` - 构建/工具相关

示例：
```
feat: 添加响应式导航栏动画
fix: 修复移动端按钮点击事件
docs: 更新README文档
```

### 创建Pull Request

1. 推送分支后，GitHub会显示 "Compare & pull request" 按钮
2. 点击该按钮
3. 填写PR描述：
   - 简要说明更改内容
   - 关联相关issue（如果有）
   - 添加截图（如果适用）
4. 点击 "Create pull request"
5. 请求团队成员审查
6. 获得批准后点击 "Merge pull request"

## 📋 推荐的分支管理策略

### 分支命名约定

- `main` - 主分支，稳定版本
- `feature/xxx` - 功能分支
- `fix/xxx` - 修复分支
- `hotfix/xxx` - 紧急修复
- `docs/xxx` - 文档更新

### 工作流程示例

```
main (稳定)
    ↓
feature/new-feature (开发)
    ↓ (PR & 审查)
main (合并)
```

## 🛠️ 团队协作最佳实践

### 1. 代码审查

- 每个PR至少需要1人审查
- 提供建设性的反馈
- 及时回应评论

### 2. 保持提交记录清晰

- 每个提交应该是一个完整的逻辑单元
- 避免在一个提交中混合多个不相关的更改

### 3. 沟通协调

- 使用GitHub Issues跟踪任务和bug
- 在PR中充分讨论设计决策
- 使用GitHub Projects或其他项目管理工具

### 4. 同步更新

- 开始新工作前，总是先同步 `main` 分支
- 解决冲突时保持沟通

## 🎯 常见问题解决

### 问题1：权限被拒绝

**解决方案**：确保你被添加为协作者，或者使用自己的fork

### 问题2：合并冲突

**解决方案**：
```bash
# 在你的分支上
git checkout feature/你的分支

# 获取最新的main
git fetch origin main

# 合并main到你的分支
git merge origin/main

# 解决冲突后
git add .
git commit -m "fix: resolve merge conflicts"
git push
```

### 问题3：如何重新提交？

**解决方案**：
```bash
# 如果还没push
git commit --amend

# 如果已经push了
git push --force-with-lease
```

## 📚 学习资源

- [GitHub官方文档](https://docs.github.com/)
- [Git官方教程](https://git-scm.com/docs/gittutorial)
- [GitHub Learning Lab](https://lab.github.com/)

## 🤝 准备好开始了吗？

按照上面的步骤，你的团队很快就能高效协作了！如有任何问题，随时询问。

---

**项目已成功初始化！现在去GitHub创建仓库吧！** 🚀
