# Agent Harness 架构

> 设计目标：UI-agnostic、可抽离的 Agent 框架。业务（zeroDraw 画布/生图）通过 **Tool + Capability** 注入，不与 orchestrator 耦合。

## 1. 总览

```
┌─────────────────────────────────────────────────────────────┐
│  HTTP / SSE（Fastify）                                       │
│  agent.routes → agentService                                │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  AgentRuntimeHost（部署策略）                                 │
│  ├─ InProcessRuntimeHost   AGENT_RUNTIME_HOST=inprocess      │
│  └─ WorkerRuntimeHost      AGENT_RUNTIME_HOST=worker         │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  @zeroDraw/agent-worker（apps/agent-worker，可独立部署）      │
│  runtime: session-store / lane-ops / harness-events / sse    │
│  worker: IPC protocol / child-runtime / startAgentWorkerChild│
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  apps/api Agent 宿主装配                                      │
│  tooling-catalog / harness-store / host/tool-executor        │
└───────────────────────────┬─────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
   pi-agent-core      MySQL Storage      浏览器 FrontendTool
   (harness/lane)     (transcript)       (deferred complete)
```

**要点：**

- **Orchestrator**（harness + lane + LLM）与 **Tool 执行**、**HTTP** 分层。
- Worker 是 **Node 子进程**（`child_process.fork`），**不是** Redis/BullMQ worker。
- 前端 deferred 工具（`place_svg` 等）必须在**主进程**完成：`frontendToolBridge` 持有内存 Promise，浏览器 `complete` 回调主 API。

---

## 2. 目录结构

```
apps/agent-worker/           # ★ 可独立部署的 Agent Worker 应用（共享 runtime 库）
├── src/runtime/             # harness-session、lane-ops、SSE、事件映射
└── src/worker/              # IPC protocol、child-runtime、startAgentWorkerChild

packages/agent/              # ★ Agent 业务模块（@zeroDraw/agent）
├── src/
│   ├── config.ts            # configureAgentModule() 宿主注入
│   ├── agent.routes.ts      # HTTP 路由
│   ├── session/             # 会话 CRUD、service 门面
│   ├── storage/             # pi-agent MySQL storage 适配
│   ├── framework/           # capability、tool registry、sandbox 占位
│   ├── tools/               # 具体工具定义（trusted + frontend 声明）
│   └── runtime/
│       ├── tooling-catalog.ts
│       ├── harness-store.ts
│       └── host/            # inprocess / worker 部署策略

apps/api/src/agent/          # API 宿主装配层
├── setup.ts                 # configureAgentModule + 注入 db/deps/auth
├── prompt-images.ts         # R2/Volc 图片解析（API 特有）
└── agent.worker.ts          # fork 子进程入口

packages/api-contract/src/agent/
├── framework.ts             # ToolKind、HostCapability、FrontendToolCapability
├── tools.ts                 # 工具名、args/result schema
└── sse.ts                   # SSE 帧解析

packages/core/src/features/agent/
├── tools/                   # 浏览器侧 FrontendTool 实现
├── registry.ts
└── dispatcher.ts            # SSE tool_start → 浏览器 execute → complete
```

---

## 3. 工具模型

### 3.1 ToolKind 三分法

| Kind | 执行位置 | 示例 | 说明 |
| --- | --- | --- | --- |
| `trusted` | API 主进程 | `read_project`, `generate_image` | 直接调宿主 capability |
| `frontend` | 用户浏览器 | `get_canvas_state`, `place_svg` | 服务端 deferred + IPC/bridge |
| `sandbox` | 隔离运行时（预留） | — | 通过 `SandboxRuntime` 执行不可信代码 |

注册表见 `tools/index.ts`，元数据由 `framework/registry.ts` 的 `buildRegisteredAgentTools` 附加，并在 `execute` 前裁剪 capability。

### 3.2 Capability-based ToolContext

工具**不再**拿 `deps` 全家桶，只拿声明过的 capability：

```typescript
// 宿主侧 capability（API）
'project.read' | 'generate.submit' | 'frontend.bridge'

// 浏览器侧 capability（FrontendTool 元数据）
'canvas.read' | 'canvas.mutate' | 'canvas.tools'
```

`createAgentToolContext()` 装配完整 capability map；`pickAgentCapabilities()` 在每次 tool execute 前按注册表裁剪。

### 3.3 前端 deferred 工具链路

```
LLM tool_call
  → createFrontendTool.execute()
  → frontendToolBridge.wait()        # 主进程挂起 Promise + DB pending
  → SSE tool_start → 浏览器
  → FrontendToolRegistry.execute()
  → POST /frontend-tools/complete
  → frontendToolBridge.complete()    # resolve Promise，对话续接
```

---

## 4. 两种 Runtime Host

### 4.1 InProcess（默认开发）

```
API 进程
  └─ HarnessSessionStore
       └─ openHarnessSession(bindings: 完整 deps + frontendTools)
            └─ lane.prompt → subscribeHarnessEventsToSse → SSE
```

### 4.2 Worker（生产隔离）

```
API 主进程                          Worker 子进程
├─ HostToolExecutor                 ├─ HarnessSessionStore
├─ frontendToolBridge               ├─ openHarnessSession(bindings:
├─ fork(agent.worker.ts)       IPC     wrapTools: ipc-tools,
└─ parent-host 转发 SSE/events         createToolContext: isolated)
                                    └─ lane.prompt → IPC prompt_event
```

**Worker 模式下工具执行路径：**

1. Worker 内 tool `execute` 被 `ipc-tools` 代理
2. IPC `tool_execute` → 主进程 `HostToolExecutor`
3. 主进程用真实 capability 执行（含 `frontend.bridge.wait`）
4. IPC `tool_result` → Worker resolve → harness 继续

**Worker 崩溃：** 主进程 API 存活；进行中的 prompt 报错；可重启 worker。

---

## 5. HarnessSessionBindings

打开 harness 时的装配策略（`harness-session.ts`）：

```typescript
interface HarnessSessionBindings {
  wrapTools?: (tools) => tools;           // worker: IPC 包装
  createToolContext: (meta) => ToolContext;
}
```

| 模式 | wrapTools | createToolContext |
| --- | --- | --- |
| InProcess | 无 | `createAgentToolContext(deps, bridge)` |
| Worker 子进程 | `ipc-tools.wrapTools` | `createIsolatedToolContext`（空 capability） |

---

## 6. 一次 Prompt 的时序

```
Client          agentService       RuntimeHost        harness/lane       Browser
  │ POST prompt      │                  │                  │                │
  │─────────────────►│ streamPrompt     │                  │                │
  │                  │─────────────────►│ get session      │                │
  │                  │                  │─────────────────►│ prompt()       │
  │◄── SSE delta ────│◄─────────────────│◄── events ───────│                │
  │                  │                  │                  │── tool_start ──►│
  │                  │                  │                  │                │ execute
  │                  │◄── complete ─────│◄── bridge ───────│◄───────────────│
  │◄── SSE done ─────│◄─────────────────│◄── run_end ──────│                │
```

---

## 7. 扩展指南

### 新增 trusted 工具

1. `tools/*.tool.ts` 实现 execute
2. `tools/index.ts` 注册 `{ kind: 'trusted', capabilities: [...] }`
3. 如需新 capability：在 `framework/capabilities.ts` 扩展 map + 装配

### 新增 frontend 工具

1. `api-contract/agent/tools.ts` 加工具名与 schema
2. `apps/api/tools/frontend/` 加 `createFrontendTool`
3. `apps/web/features/agent/tools/` 实现 `FrontendToolDefinition`（含 `kind` + `capabilities`）
4. 注册到 `createDrawingAgentTools`

### 新增 sandbox 工具（未来）

1. 实现 `framework/sandbox.ts` 的 `SandboxRuntime`
2. 注册 `{ kind: 'sandbox', capabilities: [...] }`
3. execute 内调用 `ctx.sandboxRuntime.run()`

---

## 8. 与安全模型的关系

| 机制 | 作用 |
| --- | --- |
| Capability 裁剪 | 工具代码只能调声明过的宿主 API |
| ToolKind | 明确执行位置与管线 |
| Worker 子进程 | harness/LLM 崩溃隔离（**非**安全沙箱） |
| SandboxRuntime | 预留：不可信代码执行隔离 |
| JWT + session 归属 | HTTP 层鉴权 |

当前架构**不执行任意代码**，因此未上 OS 级沙箱。若未来支持用户插件 / `run_script`，走 `sandbox` kind + `SandboxRuntime` 实现。

---

## 9. 相关配置

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `AGENT_RUNTIME_HOST` | `inprocess` | `worker` 启用子进程隔离 |
| `AGENT_MODEL` | — | LLM 模型 id |
| `AGENT_BASE_URL` | — | OpenAI-compatible 中转 |
| `AGENT_API_KEY` | — | 中转 API Key |

---

## 10. 与 pi-agent-core 的关系

底层运行时能力来自 `@earendil-works/pi-agent-core`（harness、lane、StorageBackedSession、compaction 等）。本仓库在其上构建：

- 业务 Tool + Capability 层
- MySQL 持久化
- SSE 协议与前端 deferred 桥
- RuntimeHost 部署抽象

pi-agent 包本身的 API 说明见 [../pi-harness.md](../pi-harness.md)。
