# Output Styles 功能详解

## 功能概述

Output styles 是 Claude Code 的一个功能，允许用户自定义 AI 的响应方式。它直接修改 system prompt，改变 AI 的角色、语气和输出格式，同时保留核心能力（运行脚本、读写文件、跟踪 TODO）。

**核心思想**：通过修改 system prompt 来改变 AI 的"人格"，而不是改变它的"能力"。

## 源码实现

### 1. 核心配置文件

**文件**: `src/constants/outputStyles.ts`

```typescript
export type OutputStyleConfig = {
  name: string
  description: string
  prompt: string                    # 插入到 system prompt 的内容
  source: SettingSource | 'built-in' | 'plugin'
  keepCodingInstructions?: boolean  # 是否保留默认编码指令
  forceForPlugin?: boolean          # 插件是否强制使用
}
```

### 2. 内置样式定义

**文件**: `src/constants/outputStyles.ts`

```typescript
export const OUTPUT_STYLE_CONFIG: OutputStyles = {
  default: null,  # null 表示使用默认 system prompt
  
  Explanatory: {
    name: 'Explanatory',
    source: 'built-in',
    description: 'Claude explains its implementation choices and codebase patterns',
    keepCodingInstructions: true,
    prompt: `
# Explanatory Style Active
## Insights
In order to encourage learning, before and after writing code, always provide 
brief educational explanations about implementation choices using (with backticks):
"⭐ Insight ─────────────────────────────────────────────────────────────────"
[2-3 key educational points]
"───────────────────────────────────────────────────────────────────────────"
    `,
  },
  
  Learning: {
    name: 'Learning',
    source: 'built-in',
    description: 'Claude pauses and asks you to write small pieces of code',
    keepCodingInstructions: true,
    prompt: `
# Learning Style Active
## Requesting Human Contributions
In order to encourage learning, ask the human to contribute 2-10 line code pieces 
when generating 20+ lines involving:
- Design decisions (error handling, data structures)
- Business logic with multiple valid approaches  
- Key algorithms or interface definitions

### Request Format
- **Learn by Doing**
- **Context:** [what's built and why this decision matters]
- **Your Task:** [specific function/section in file]
- **Guidance:** [trade-offs and constraints to consider]
    `,
  },
}
```

### 3. 样式加载流程

**文件**: `src/outputStyles/loadOutputStylesDir.ts`

```
用户目录 ~/.claude/output-styles/*.md
         │
         ▼
项目目录 .claude/output-styles/*.md
         │
         ▼
插件 output-styles/*.md
         │
         ▼
┌─────────────────────────────────────┐
│     getOutputStyleDirStyles()       │
│  1. 加载所有 markdown 文件          │
│  2. 解析 frontmatter               │
│  3. 提取 name/description/prompt   │
│  4. 按优先级排序                    │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│       getAllOutputStyles()          │
│  合并内置 + 自定义 + 插件样式       │
│  优先级: 项目 > 用户 > 托管 > 插件  │
└─────────────────────────────────────┘
```

### 4. Frontmatter 解析

**文件**: `src/utils/frontmatterParser.ts`

自定义样式是带 frontmatter 的 Markdown 文件：

```markdown
---
name: My Custom Style
description: A brief description of what this style does
keep-coding-instructions: true
---

# Custom Style Instructions

You are an interactive CLI tool that helps users with software engineering
tasks. [Your custom instructions here...]

## Specific Behaviors

[Define how the assistant should behave in this style...]
```

**支持的 Frontmatter 字段**:

| 字段 | 用途 | 默认值 |
|------|------|--------|
| `name` | 样式名称 | 文件名 |
| `description` | 显示在 /config 菜单 | 无 |
| `keep-coding-instructions` | 保留默认编码指令 | false |
| `force-for-plugin` | 插件强制使用 | false |

### 5. 样式应用到 System Prompt

**文件**: `src/constants/prompts.ts`

```typescript
export async function getSystemPrompt(): Promise<string[]> {
  const [outputStyleConfig] = await Promise.all([
    getOutputStyleConfig(),  // 获取当前样式
    // ...
  ])
  
  return [
    // ... 其他 sections
    systemPromptSection('output_style', () =>
      getOutputStyleSection(outputStyleConfig),  // 插入样式指令
    ),
    getSimpleIntroSection(outputStyleConfig),    // 开头介绍
    // ...
  ]
}

function getOutputStyleSection(
  outputStyleConfig: OutputStyleConfig | null,
): string | null {
  if (outputStyleConfig === null) return null
  
  return `# Output Style: ${outputStyleConfig.name}
${outputStyleConfig.prompt}`
}
```

### 6. 配置存储

**文件**: `.claude/settings.local.json`

```json
{
  "outputStyle": "Explanatory"
}
```

通过 `/config` 命令修改，保存在本地项目级别。

## 样式切换流程

```
用户执行 /config
    │
    ▼
显示样式选择菜单
    │
    ▼
用户选择样式
    │
    ▼
写入 .claude/settings.local.json
    │
    ▼
下次会话启动时生效
    │
    ▼
getSystemPrompt() 读取配置
    │
    ▼
getOutputStyleSection() 插入样式指令
```

## 与相关功能的对比

### Output Styles vs CLAUDE.md

| 特性 | Output Styles | CLAUDE.md |
|------|---------------|-----------|
| 位置 | system prompt 中 | system prompt 之后 |
| 作用 | 修改 AI 行为 | 添加上下文 |
| 内容 | 角色、格式、语气 | 项目规范、偏好 |
| 编辑 | 通过 /config | 手动编辑文件 |

### Output Styles vs --append-system-prompt

| 特性 | Output Styles | --append-system-prompt |
|------|---------------|------------------------|
| 编辑 prompt | 是（替换部分） | 是（追加） |
| 预定义格式 | 是 | 否 |
| 切换方式 | /config | 命令行参数 |

### Output Styles vs Skills

| 特性 | Output Styles | Skills |
|------|---------------|--------|
| 激活方式 | 选择后一直生效 | 按需调用 |
| 作用范围 | 全局响应方式 | 特定任务 |
| 例子 | "Explanatory 风格" | "/test-run 执行测试" |

## 代码位置汇总

| 文件 | 功能 |
|------|------|
| `src/constants/outputStyles.ts` | 核心配置、内置样式定义 |
| `src/commands/output-style/index.ts` | /config 命令入口 |
| `src/outputStyles/loadOutputStylesDir.ts` | 加载自定义样式文件 |
| `src/utils/frontmatterParser.ts` | frontmatter 解析 |
| `src/utils/markdownConfigLoader.ts` | markdown 配置加载 |
| `src/constants/prompts.ts` | system prompt 构建 |
