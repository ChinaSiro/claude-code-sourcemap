# Claude Code 架构分析

> 基于 Claude Code 2.1.88 源码分析
> 目标：让新人能照此文档复刻一个完整的 Claude Code

---

## 架构导航

| 文件 | 内容 | 一句话描述 |
|------|------|------------|
| [01-overview.md](./01-overview.md) | 整体架构概览 | 分层架构、技术选型、目录结构 |
| [02-core-loop.md](./02-core-loop.md) | 核心循环 | 消息处理、工具调用、上下文压缩 |
| [03-system-prompt.md](./03-system-prompt.md) | System Prompt 构建 | prompt 模块化组装、output styles 集成 |
| [04-tools.md](./04-tools.md) | 工具系统 | 工具注册、调用、权限、结果处理 |
| [05-memory.md](./05-memory.md) | 记忆系统 | CLAUDE.md 加载、上下文注入 |
| [06-output-styles.md](./06-output-styles.md) | Output Styles | 样式加载、frontmatter 解析、内置/自定义样式 |
| [07-sub-agents.md](./07-sub-agents.md) | 子 Agent 系统 | AgentTool、Team、Coordinator 模式 |

---

## 核心设计原则

1. **Performance First**: 快速路径、懒加载、编译期 DCE
2. **Simplicity**: 最小代码解决问题（30 行 Store vs 100+ Redux）
3. **Extensibility**: 插件化、Hook 注入、Feature Flags
4. **Testability**: 依赖注入、模块化

---

## 快速开始

- 想了解整体架构 → [01-overview.md](./01-overview.md)
- 想了解核心循环 → [02-core-loop.md](./02-core-loop.md)
- 想了解 output styles → [06-output-styles.md](./06-output-styles.md)
- 想了解多 Agent → [07-sub-agents.md](./07-sub-agents.md)
