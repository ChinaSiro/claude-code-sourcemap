# System Prompt 构建

## 概述

System prompt 是 Claude Code 的"灵魂"，决定了 AI 的行为模式。output styles 功能的核心就是修改 system prompt。

## 构建流程

```
getSystemPrompt() [src/constants/prompts.ts]
    │
    ├── getOutputStyleConfig()        ← 获取当前输出样式
    ├── getSkillToolCommands()        ← 获取技能命令
    ├── computeSimpleEnvInfo()        ← 环境信息
    │
    ├── [Dynamic Sections]
    │   ├── getSessionSpecificGuidanceSection()
    │   ├── getOutputStyleSection()   ← 样式指令插入点
    │   └── ...
    │
    └── [Static Sections]
        ├── getSimpleIntroSection()   ← 开头介绍（含样式判断）
        ├── getSimpleSystemSection()
        └── ...
```

## 关键函数

### getOutputStyleSection()

```typescript
// src/constants/prompts.ts
function getOutputStyleSection(
  outputStyleConfig: OutputStyleConfig | null,
): string | null {
  if (outputStyleConfig === null) return null
  
  return `# Output Style: ${outputStyleConfig.name}
${outputStyleConfig.prompt}`
}
```

**作用**：将 output style 的 prompt 插入到 system prompt 中。

### getSimpleIntroSection()

```typescript
function getSimpleIntroSection(
  outputStyleConfig: OutputStyleConfig | null,
): string {
  return `
You are an interactive agent that helps users ${
    outputStyleConfig !== null 
      ? 'according to your "Output Style" below, which describes how you should respond to user queries.' 
      : 'with software engineering tasks.'
  } Use the instructions below and the tools available to you to assist the user.
  `
}
```

**作用**：根据是否有 output style，调整开头介绍语。

## Output Styles 对 System Prompt 的影响

| 样式 | 影响 |
|------|------|
| Default (null) | 使用完整默认 system prompt |
| Explanatory | 保留编码指令，追加 Insight 指令 |
| Learning | 保留编码指令，追加 Learn by Doing 指令 |
| 自定义 | 可选保留编码指令（keep-coding-instructions） |

## 缓存机制

```
┌─────────────────────────────────────────┐
│ Static Prefix (可缓存)                   │
│ - 不依赖 output style 的部分            │
│ - 使用 Blake2b hash 做缓存 key          │
├─────────────────────────────────────────┤
│ Dynamic Suffix (不可缓存)                │
│ - output style 相关的部分               │
│ - 每个 session 可能不同                  │
└─────────────────────────────────────────┘
```

output style 被放在 dynamic 部分，因为它依赖 session 设置，不能跨 session 缓存。

## 代码位置

- `src/constants/prompts.ts` - 主要构建逻辑
- `src/constants/outputStyles.ts` - 样式配置
- `src/constants/systemPromptSections.ts` - section 管理
