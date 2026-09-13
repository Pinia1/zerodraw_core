# Agent 观测体系（Phase 1–3）

## 三层模型

| 层 | 存储 | 语义 |
|---|---|---|
| **DB 会话生命周期** | `agent_sessions.status` | `active` / `suspended` / `closed` — 业务会话是否可用 |
| **Harness 内存态** | Redis `agent:runtime:{sessionId}` | `loaded` / `executing` — 进程内是否有 harness、是否在跑 prompt |
| **事件流水** | `agent_session_events` | append-only 审计与时间线 |

> `closed` 只表示用户/系统关闭了会话；关浏览器 tab 仅 abort SSE，**不会**改 DB status。

## Phase 1 — DB 统计基础

`agent_sessions` 扩展字段：

- `project_id` — 关联画布项目
- `prompt_count` / `last_prompt_at` / `last_activity_at`
- `closed_at` / `close_reason` / `runtime_host`

Usage 汇总来源：

1. **Overview / `/usage` 聚合**：`agent_prompt_runs.usage`（单次 prompt 增量，SQL JSON 聚合）
2. Session 详情：`usage_payload`（session 累计）
3. 兜底：`agent_usage_ledger`（每次 LLM 调用明细）

## Phase 2 — 观测台 MVP

### 事件表 `agent_session_events`

事件类型：`session_created`, `prompt_started`, `prompt_completed`, `prompt_failed`, `prompt_suspended`, `session_suspended`, `session_resumed`, `session_closed`, `harness_opened`, `harness_idle_closed`, `worker_assigned`, `worker_crashed`

### Redis Runtime Snapshot

- Key: `agent:runtime:{sessionId}`（`loaded`/`executing` 时 TTL ≈ `AGENT_HARNESS_IDLE_MS`；释放后短 TTL 90s）
- Index: `agent:runtime:index`（SET）
- 无 Redis 时降级为 API 进程内存 Map

### Admin API

需配置 `AGENT_ADMIN_TOKEN`，请求头 `X-Admin-Token`。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/admin/agent/overview` | 会话/prompt/usage/runtime 总览 |
| GET | `/api/admin/agent/runtime` | 内存/Redis 中全部 runtime 快照（loaded/executing） |
| GET | `/api/admin/agent/sessions` | 分页列表（status/userId/projectId） |
| GET | `/api/admin/agent/sessions/:id/timeline` | 事件 + prompt runs + runtime |
| GET | `/api/admin/agent/usage` | 按 user/project/day 聚合 |
| POST | `/api/admin/agent/sessions/:id/close` | 强制关闭（`closeReason`: admin/error/idle） |

## Phase 3 — Prompt Runs

表 `agent_prompt_runs`：每次 prompt 一行，含 `status`, `duration_ms`, `usage`, `runtime_host`, `worker_slot`。

Admin `/usage?groupBy=day|user|project` 基于此表聚合。

## 环境变量

```env
AGENT_ADMIN_TOKEN=your-secret-token   # 未设置则禁用 Admin 路由
AGENT_RUNTIME_HOST=inprocess|worker
AGENT_HARNESS_IDLE_MS=900000
AGENT_PROMPT_RUN_STALE_MS=7200000      # 僵尸 running run 清理阈值（默认 2h）
AGENT_SESSION_IDLE_CLOSE_MS=0          # 启动时 idle 关会话；0=禁用
```

### closeReason

| 值 | 触发 |
|---|---|
| `user_close` | 用户调用 DELETE 关闭 |
| `admin` | Admin POST close（默认） |
| `error` | Admin POST close 指定，或 worker 崩溃后手动处理 |
| `idle` | 启动 reconcile：超 `AGENT_SESSION_IDLE_CLOSE_MS` 无活动且无 runtime |

### Prompt run 可靠性

- `ledger_from_seq` 持久化在 `agent_prompt_runs`，finish 时从 ledger 聚合增量（进程重启可恢复）
- 启动时 `reconcileOnStartup` 清理超时 `running` run → `aborted`
- Worker slot crash → `worker_crashed` 事件 + running prompt → `failed`

## Hook 挂载点

- `AgentService` — create / prompt / resume / close
- `HarnessSessionStore` — harness_opened / harness_idle_closed（inprocess）
- `WorkerRuntimeHost` — worker_assigned
- `AgentObservabilityService` — 统一写 DB + Redis
- **Worker IPC** — 子进程 `HarnessSessionStore` 生命周期 → `harness_lifecycle` 消息 → 父进程 observability

### Runtime snapshot 语义

- `loaded` — 仅由 `harness_opened` / `harness_idle_closed` 更新；`startPromptRun` 只设 `executing=true`
- `executing` — `startPromptRun` → true，`finishPromptRun` / suspend → false
- **inprocess**：`HarnessSessionStore` 回调直连 observability
- **worker**：子进程 IPC `harness_lifecycle`（`harness_opened` / `harness_idle_closed`）→ `WorkerRuntimeHost` → observability
