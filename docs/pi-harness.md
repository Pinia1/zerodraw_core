# `@earendil-works/pi-agent-core` 接入指南

> 基于代码与 npm 元数据探索得出的接入说明（2026-09-11）。把另一个工程 / 前端 UI 接入该 agent 运行时时的路线图。

## 1. 包定位

`@earendil-works/pi-agent-core` 是 **UI-agnostic 的通用 agent 运行时**，不是开箱即用的 CLI。
它自带了 agent 循环、工具执行、自动上下文压缩、会话/状态模型、遥测等基础设施，但由一个**薄集成层**（本仓库的 `packages/coding-agent`）才能变成可用的产品。你要做的正是**写这个集成层**，但不用从头造运行时。

- 已发布 npm：最新 `0.85.1`，`main`→`dist/index.js`，`types`→`dist/index.d.ts`。
- 运行时依赖少：`diff` `ignore` `typebox` `yaml` + 三个同版本配套包 `@earendil-works/chord` / `@earendil-works/pi-ai` / `@earendil-works/pi-telemetry`（agent 对它们都是 `^0.85.1`，npm 可自动解析）。
- **不依赖 native 的 tui**，无原生编译负担。要求 Node `>=22.19`。

## 2. 开箱即用的能力（全部从 `.` 主入口 re-export）

来自 `packages/agent/src/index.ts`：

- **Agent 循环**：`agentLoop` / `agentLoopContinue` / `agentHarness`（顶层 API）。
- **自动上下文压缩**：`compact` / `generateSummary` / `shouldCompact` / `DEFAULT_COMPACTION_SETTINGS` / `prepareCompaction` / `serializeConversation`，以及 `generateBranchSummary`（分支摘要）。压缩时还会把历史读/写过的文件清单透传到压缩后待续对话（`extractFileOperations`）。
- **内置工具**：`bash` / `read` / `write` / `edit` / `edit-diff` / `image` / `file-mutation-queue`（文件写入串行化）。
- **会话/状态模型**：`Session` / `Entry` / `Branch` / `Value` / `List` / `Storage` 抽象 / `StorageBackedSession` / 内存存储 `MemorySessionRepo`。
- **Node 入口**：`./node` → `NodeExecutionEnv`（`FileSystem` / `Shell` 的 Node 实现）。
- **模型接入**：model / provider 来自 `@earendil-works/pi-ai`，自带一整套 provider（Anthropic / OpenAI / Google / DeepSeek / Groq / Fireworks / Bedrock / Vertex……），不用自己写 LLM 适配，选一个 + 填 key 即可。

## 3. 你需要接线的东西

| 项                                             | 说明                                                         | 是否必须             |
| ---------------------------------------------- | ------------------------------------------------------------ | -------------------- |
| **会话存储** `Storage`                         | 持久化 / 恢复 / 状态快照。默认只有内存实现，重启即失         | 必须（要持久化的话） |
| **自定义 tool** `AgentHarnessTool<TContext>[]` | 你的业务 / 前端交互逻辑                                      | 必须（前端场景）     |
| **toolContext** `TContext`                     | 每轮快照注入的应用程序上下文（UI 句柄 / store）              | 必须（前端场景）     |
| **Model**                                      | 从 pi-ai 选 provider + model，填 `AgentHarnessOptions.model` | 必须（选现成的）     |
| **FileSystem / Shell**                         | 默认文件工具的实现。纯前端 + 只用自定义 tool 时可留空        | 可选                 |

## 4. 最小装配骨架

```ts
import { AgentHarness } from '@earendil-works/pi-agent-core';
import { createApi /* ... */ } from '@earendil-works/pi-ai';

const harness = await AgentHarness.create(
  {
    session, // StorageBackedSession + 你的 Storage（或 MemorySessionRepo）
    models, // 来自 pi-ai
    model, // 例：Anthropic / OpenAI 一个 model
    tools: [yourFrontendTool], // 你的自定义工具
    toolContext, // 前端 UI / store 句柄
  },
  context
);
```

## 5. 自定义 tool 定义

签名在 `packages/agent/src/harness/types.ts`：

```ts
import type { AgentHarnessTool } from '@earendil-works/pi-agent-core';

type MyTool = AgentHarnessTool<MyToolContext>;
const myTool: MyTool = {
  name: 'notify_frontend',
  description: '发送通知到前端',
  schema: {
    type: 'object',
    properties: {
      /* typebox */
    },
  },
  async execute(toolCallId, params, onUpdate, toolContext, invocation, context) {
    toolContext.ui.sendNotification(params.text); // 触达你的前端
    return { content: 'sent' }; // AgentToolResult<TDetails>
  },
};

// toolContext：可传静态值，或 (context) => Promise<TContext> 每轮快照解析
```

`execute` 收到的重要参数：

- `onUpdate`：工具执行过程中的增量进度回调（→ `tool_update` 事件，聊天 UI 靠它实时渲染）。
- `invocation`：`invocationId`（= 结果条目 id，可恢复）+ `getMemo/setMemo`（跨重放持久记忆）。

## 6. 前端交互机制（这套 harness 本来就是为此设计的）

- **生命周期事件**：`events.on("tool_start" | "tool_update" | "tool_end")`；快照 `LaneSnapshotTool[]` 提供 running/settled 状态。
- **人在回环（人工确认）**：`before_tool` / `after_tool` hooks 可拦截、改参、改结果；更完整的机制是 **deferred 工具**——执行中返回 `DeferredHandle` 挂起，harness 发 `run_suspend`，前端放行后 `resume()`。
- **审批/改写请求**：`before_request` / `before_payload` hooks 可改发给模型的请求。
- **控制器**：`AgentLane` 提供 `prompt` / `skill` / `steer` / `followUp` / `abort` / `cancelQueued` / `watch` 等事务化操作，供 UI 调用。

## 7. 会话存储的装配

`Storage` 是接口（`packages/agent/src/harness/session/types.ts`）：`commit` / `getEntries` / `scanBranch` / `getValue` / `scanValues` / `getStats` / `close`。

三种方案：

1. **内存**：`MemorySessionRepo`，原型/测试用。
2. **SQLite**：官方独立包 `@earendil-works/pi-session-backends-sqlite-node`（`node:sqlite` `DatabaseSync`），**Node / Electron 主进程专用**，需单独安装并作为 `Storage` 接入。
3. **自写 `Storage`**：对接你的数据库或后端 API / IndexedDB。**纯浏览器前端必须用这条**，把 `commit/scan` 转发到你的后端。

## 8. 注意事项

- **`./node` 入口（NodeExecutionEnv）是 Node 绑定**，纯浏览器用不了。浏览器场景要自写 `FileSystem` / `Shell` 或只用自定义工具 + 自写 `Storage`。
- 底层 `pi-ai` 走 `fetch`，浏览器能跑。
- **不提供完整权限系统**（`effect-gate` 是工具放行机制，不是审批 UI）——审批交互由你在前端/hook 层实现。
- 迁移最省力的路径：参考 `packages/coding-agent` 如何实例化 harness、注入 resources、消费事件，把它的主循环接线抄一遍指向自己的 UI。

## 9. 结论

核心 agent 运行时 + 自动压缩 + 会话模型 + 工具执行基建全部开箱。真正动手的只有：**存储后端、业务 tool、toolContext、模型选择**（前三样本来就是你的，模型是 pi-ai 白送）。
