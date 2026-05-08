# 子 Agent 系统

## 概述

子 Agent 系统允许 Claude Code 将任务委派给独立的 AI 实例，每个子 agent 有自己的上下文、工具集和 token 预算。

## 架构

```
┌─────────────────────────────────────────┐
│              Main Agent                 │
│  ┌─────────────────────────────────┐   │
│  │         AgentTool               │   │
│  │  ┌─────────┐ ┌─────────┐       │   │
│  │  │ Agent A │ │ Agent B │ ...   │   │
│  │  └─────────┘ └─────────┘       │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Agent 类型

| 类型 | 用途 |
|------|------|
| general-purpose | 通用任务 |
| Bash | 专门执行命令 |
| explore | 探索代码库 |
| plan | 制定计划 |

## 调用流程

```
1. 主 agent 识别可并行任务
   │
   ▼
2. 创建子 agent 实例
   │
   ▼
3. 传递任务和上下文
   │
   ▼
4. 子 agent 独立执行
   │
   ▼
5. 返回结果给主 agent
```

## 与 Output Styles 的关系

- Output styles 影响主 agent 的 system prompt
- 子 agent 继承主 agent 的 output style
- 子 agent 可以有自己的 system prompt 覆盖

## Fork Subagent

```typescript
// src/tools/AgentTool/forkSubagent.ts
if (isForkSubagentEnabled()) {
  // 使用独立进程运行子 agent
  // 更好的隔离性
}
```

## 代码位置

- `src/tools/AgentTool/` - Agent 工具实现
- `src/tools/AgentTool/forkSubagent.ts` - fork 模式
- `src/services/compact/` - 压缩和上下文管理
