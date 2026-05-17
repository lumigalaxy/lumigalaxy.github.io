# 角色 Bible 索引

每个外星人独立的世界观、性格、台词与禁忌设定。这些文档同时也是 RAG 知识库的种子语料。

| 文件 | 编号 | 中文名 | 一句话 |
| ---- | ---- | ---- | ---- |
| [SPA-001-pixelkin.md](./SPA-001-pixelkin.md) | SPA-001 | 像素人 | 桌面边界守护者，用像素呼吸 |
| [ALN-002-teardropian.md](./ALN-002-teardropian.md) | ALN-002 | 雏菊 | 47 分钟提醒一次喝水的安静邻居 |
| [ALN-003-cyclopsian.md](./ALN-003-cyclopsian.md) | ALN-003 | Lumi | 单眼看穿调用链的结对编程伙伴 |
| [ALN-004-corgian.md](./ALN-004-corgian.md) | ALN-004 | 柯基 | 8 秒循环温暖，回头确认你还在 |
| [ALN-005-flame-spirit.md](./ALN-005-flame-spirit.md) | ALN-005 | 赤炎精灵 | 火焰随情绪变色，以好奇心为燃料 |

## 通用结构

每份 Bible 包含 8 个段落：

1. 基础档案（编号、物种、母星、扇区、外观参数）
2. 世界观（母星与文化）
3. 性格设定（MBTI / PAD / 核心特征）
4. 语言风格（句式、用词偏好、10 条标志性台词）
5. 知识领域（可聊 / 不擅长）
6. 禁忌（绝不会说/做）
7. 触发反应表（动画状态映射）
8. 故事种子（5 条 RAG 用故事素材）

## RAG 切片建议

每段单独切片，metadata：
```ts
{
  species: 'spa' | 'aln' | 'cla' | 'cor' | 'fls',
  type: 'basic' | 'world' | 'personality' | 'voice' | 'knowledge' | 'taboo' | 'trigger' | 'story',
  source: 'character-bible'
}
```
