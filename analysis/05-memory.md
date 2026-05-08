# 记忆系统（CLAUDE.md）

## 概述

Claude Code 的记忆系统通过 CLAUDE.md 文件实现，让 AI 能够记住项目规范、用户偏好和工作流程。

## CLAUDE.md 加载层级

```
~/.claude/CLAUDE.md                    # 全局记忆
    │
    ▼
<project-root>/CLAUDE.md               # 项目根目录
    │
    ▼
<project-root>/.claude/CLAUDE.md       # .claude 子目录
    │
    ▼
<subdir>/CLAUDE.md                     # 子目录（按需加载）
```

## 加载时机

| 场景 | 加载内容 |
|------|---------|
| 会话开始 | 全局 + 项目根目录 |
| 进入子目录 | 该目录的 CLAUDE.md |
| 工具调用 | 相关目录的 CLAUDE.md |

## 与 Output Styles 的关系

| 特性 | CLAUDE.md | Output Styles |
|------|-----------|---------------|
| 作用 | 添加上下文 | 修改行为 |
| 位置 | system prompt 之后 | system prompt 之中 |
| 内容 | 项目规范、偏好 | 角色、格式、语气 |
| 编辑 | 用户手动 | 通过 /config 选择 |

## Memory 类型

```typescript
type MemoryType = 
  | 'user'      # 用户偏好
  | 'feedback'  # 用户反馈
  | 'project'   # 项目规范
  | 'reference' # 参考资料
```

## 代码位置

- `src/memdir/` - 记忆目录管理
- `src/memdir/memoryTypes.ts` - 记忆类型定义
- `src/utils/markdownConfigLoader.ts` - CLAUDE.md 加载
