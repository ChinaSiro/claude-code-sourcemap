# 工具系统

## 概述

Claude Code 的工具系统是 AI 与外部世界交互的桥梁。每个工具都是一个独立的模块，注册到工具池中供 AI 调用。

## 工具架构

```
┌─────────────────────────────────────────┐
│              Tool Registry              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │  Bash   │ │  Read   │ │  Write  │   │
│  └─────────┘ └─────────┘ └─────────┘   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │  Agent  │ │  Skill  │ │  glob   │   │
│  └─────────┘ └─────────┘ └─────────┘   │
└─────────────────────────────────────────┘
```

## 工具分类

### 核心工具
| 工具 | 功能 |
|------|------|
| Bash | 执行 shell 命令 |
| Read | 读取文件内容 |
| Write | 写入文件 |
| Edit | 编辑文件 |
| glob | 文件搜索 |
| grep | 内容搜索 |

### 扩展工具
| 工具 | 功能 |
|------|------|
| Agent | 调用子 agent |
| Skill | 加载技能 |
| AskUserQuestion | 向用户提问 |
| Sleep | 休眠 |

## 工具调用流程

```
1. AI 生成 tool_use JSON
   │
   ▼
2. 工具路由器匹配工具名
   │
   ▼
3. 参数验证
   │
   ▼
4. 权限检查
   │
   ▼
5. 执行工具
   │
   ▼
6. 返回 tool_result
```

## 权限系统

```typescript
// 工具调用前检查
if (tool.requiresPermission) {
  const granted = await checkPermission(tool, params)
  if (!granted) {
    return { error: "Permission denied" }
  }
}
```

## 代码位置

- `src/tools/` - 工具实现目录
- `src/tools/BashTool/` - Bash 工具
- `src/tools/AgentTool/` - Agent 工具
- `src/tools/SkillTool/` - Skill 工具
