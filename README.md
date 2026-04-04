# claude-code-sourcemap

[![linux.do](https://img.shields.io/badge/linux.do-huo0-blue?logo=linux&logoColor=white)](https://linux.do)

> [!WARNING]
> This repository is **unofficial** and is reconstructed from the public npm package and source map analysis, **for research purposes only**.
> It does **not** represent the original internal development repository structure.
>
> 本仓库为**非官方**整理版，基于公开 npm 发布包与 source map 分析还原，**仅供研究使用**。
> **不代表**官方原始内部开发仓库结构。
> 一切基于L站"飘然与我同"的情报提供

---

## Overview / 概述

This repository contains TypeScript source code restored from the source map (`cli.js.map`) embedded in the public npm package `@anthropic-ai/claude-code`, version **2.1.88**.

本仓库通过 npm 发布包（`@anthropic-ai/claude-code`）内附带的 source map（`cli.js.map`）还原的 TypeScript 源码，版本为 `2.1.88`。

## Source / 来源

| Field | Value |
|-------|-------|
| npm package | [@anthropic-ai/claude-code](https://www.npmjs.com/package/@anthropic-ai/claude-code) |
| Version | `2.1.88` |
| Restored files | **4,756** (including **1,884** `.ts`/`.tsx` source files) |
| Method | Extracted `sourcesContent` fields from `cli.js.map` |

## How to Use / 使用方法

### Prerequisites / 前置条件

- [Node.js](https://nodejs.org/) >= 18.0.0
- The `source-map` npm package

### Extract Sources / 提取源码

The `extract-sources.js` script reads the source map and writes the original TypeScript source files into the `restored-src/` directory.

`extract-sources.js` 脚本读取 source map 并将还原的 TypeScript 源文件写入 `restored-src/` 目录。

```bash
# Install the source-map dependency
npm install source-map

# Run the extraction script
node extract-sources.js
```

The script will:
1. Read `package/cli.js.map`
2. Extract all embedded source files from `sourcesContent`
3. Write them to `restored-src/` with their original relative paths
4. Report the number of files written and skipped

### Browse the Source / 浏览源码

The restored source is already included in this repository under `restored-src/src/`. No extraction step is required to browse the code.

还原后的源码已包含在本仓库的 `restored-src/src/` 目录下，无需运行提取脚本即可直接浏览。

## Directory Structure / 目录结构

```
restored-src/src/
├── main.tsx              # CLI entry point / CLI 入口
├── QueryEngine.ts        # Core query engine / 核心查询引擎
├── Task.ts               # Task model / 任务模型
├── Tool.ts               # Tool base class / 工具基类
├── tools/                # Tool implementations (Bash, FileEdit, Grep, MCP, etc. 40+) / 工具实现（30+ 个）
├── commands/             # Command implementations (commit, review, config, etc. 100+) / 命令实现（40+ 个）
├── services/             # API, MCP, analytics services / API、MCP、分析等服务
│   ├── api/              # Anthropic API client / API 客户端
│   ├── mcp/              # Model Context Protocol / MCP 协议
│   ├── analytics/        # GrowthBook analytics / 数据分析
│   └── lsp/              # Language Server Protocol / 语言服务器协议
├── utils/                # Utility functions (git, model, auth, env, etc.) / 工具函数
├── context/              # React Context / React Context
├── coordinator/          # Multi-agent coordination / 多 Agent 协调模式
├── assistant/            # Assistant mode (KAIROS) / 助手模式（KAIROS）
├── buddy/                # AI companion UI / AI 伴侣 UI
├── remote/               # Remote sessions / 远程会话
├── plugins/              # Plugin system / 插件系统
├── skills/               # Skills system / 技能系统
├── voice/                # Voice interaction / 语音交互
├── vim/                  # Vim mode / Vim 模式
├── bridge/               # Desktop app bridge / 桌面应用桥接
├── server/               # Server components / 服务端组件
├── schemas/              # Data schemas / 数据模式
├── state/                # State management / 状态管理
└── components/           # UI components / UI 组件
```

## Key Files / 关键文件

| File | Description |
|------|-------------|
| `restored-src/src/main.tsx` | CLI entry point, argument parsing, initialization |
| `restored-src/src/QueryEngine.ts` | Core query processing engine (~1,300 lines) |
| `restored-src/src/tools/BashTool/` | Bash command execution tool |
| `restored-src/src/tools/FileEditTool/` | File editing tool |
| `restored-src/src/commands/commit.ts` | Git commit command |
| `restored-src/src/services/mcp/` | MCP server integration |
| `extract-sources.js` | Source extraction script |

## Disclaimer / 声明

- Source code copyright belongs to [Anthropic](https://www.anthropic.com)
- This repository is for technical research and learning only; commercial use is prohibited
- If there is any infringement, please contact for removal

---

- 源码版权归 [Anthropic](https://www.anthropic.com) 所有
- 本仓库仅用于技术研究与学习，请勿用于商业用途
- 如有侵权，请联系删除
