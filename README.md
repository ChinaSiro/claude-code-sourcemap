# claude-code-sourcemap

[![linux.do](https://img.shields.io/badge/linux.do-huo0-blue?logo=linux&logoColor=white)](https://linux.do)

> [!WARNING]
> This repository is **unofficial** and is reconstructed from the public npm package and source map analysis, **for research purposes only**.
> It does **not** represent the original internal development repository structure.
>
> 本仓库为**非官方**整理版，基于公开 npm 发布包与 source map 分析还原，**仅供研究使用**。
> **不代表**官方原始内部开发仓库结构。
> 一切基于L站"飘然与我同"的情报提供

## 概述

本仓库通过 npm 发布包（`@anthropic-ai/claude-code`）内附带的 source map（`cli.js.map`）还原的 TypeScript 源码，版本为 `2.1.88`。

## 运行

当前仓库里真正可直接运行的是 npm 发布包内的打包产物 `package/cli.js`，不是 `restored-src`。

```bash
npm run version:claude
npm start -- --help
```

重新提取源码可直接执行：

```bash
npm run extract
```

`restored-src` 目前仍是还原后的研究素材，不包含完整官方构建配置，不能视为已恢复成可直接编译运行的源码工程。

如果后续目标是把 `restored-src` 也修到可运行，需要继续补官方构建期宏、路径别名以及还原结果里缺失的依赖文件；当前这一步只把仓库修到“可以直接运行打包版 CLI，并能重新提取源码”。

当前仓库也额外提供了 `restored-src` 的最小启动壳，方便继续排查源码工程的运行阻塞：

```bash
cd restored-src
bun run bootstrap:manifests
```

如果在 Windows 上从 `restored-src` 或其子目录直接执行 `bun`，Bun 1.3.7 目前会额外打印一条与仓库根目录相关的伪 `EPERM`：

```text
error: Cannot read file "F:\Projects\claude-code-sourcemap\": EPERM
```

这条噪音不来自 `restored-src` 源码本身；从仓库根目录启动同一入口则不会出现。为了走干净链路，仓库根还提供了无噪音包装脚本：

```bash
bun run restored:help
bun run restored:version
bun run restored:cli -- --bare -p "ping"
bun run version:claude
bun run help
```

它会先为还原出来但缺少 `package.json` 的依赖包生成最小入口清单，再用 Bun 启动入口；这仍然不代表 `restored-src` 已完全恢复为官方可构建工程。

## 来源

- npm 包：[@anthropic-ai/claude-code](https://www.npmjs.com/package/@anthropic-ai/claude-code)
- 还原版本：`2.1.88`
- 还原文件数：**4756 个**（含 1884 个 `.ts`/`.tsx` 源文件）
- 还原方式：提取 `cli.js.map` 中的 `sourcesContent` 字段

## 目录结构

```
restored-src/src/
├── main.tsx              # CLI 入口
├── tools/                # 工具实现（Bash、FileEdit、Grep、MCP 等 30+ 个）
├── commands/             # 命令实现（commit、review、config 等 40+ 个）
├── services/             # API、MCP、分析等服务
├── utils/                # 工具函数（git、model、auth、env 等）
├── context/              # React Context
├── coordinator/          # 多 Agent 协调模式
├── assistant/            # 助手模式（KAIROS）
├── buddy/                # AI 伴侣 UI
├── remote/               # 远程会话
├── plugins/              # 插件系统
├── skills/               # 技能系统
├── voice/                # 语音交互
└── vim/                  # Vim 模式
```

## 声明

- 源码版权归 [Anthropic](https://www.anthropic.com) 所有
- 本仓库仅用于技术研究与学习，请勿用于商业用途
- 如有侵权，请联系删除
