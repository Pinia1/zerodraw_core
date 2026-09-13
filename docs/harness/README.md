# Agent Harness 文档

本目录记录 zeroDraw Agent 运行时（基于 `@earendil-works/pi-agent-core`）的**框架级架构**，面向后续抽离为独立产品时使用。

## 文档索引

| 文档 | 内容 |
| --- | --- |
| [architecture.md](./architecture.md) | 分层结构、工具模型、Worker 隔离、目录映射 |
| [../pi-harness.md](../pi-harness.md) | pi-agent-core 第三方包接入说明 |

## 代码入口

| 路径 | 说明 |
| --- | --- |
| `packages/agent/` | Agent 业务模块（`@zeroDraw/agent`） |
| `apps/api/src/agent/` | API 宿主装配（db、deps、auth 注入） |
| `packages/api-contract/src/agent/` | 契约（SSE、工具名、framework 类型） |
| `packages/agent-ui/src/tools/` | 前端工具注册与 SSE 分发 |

## 环境变量

```env
# inprocess = harness 跑在 API 进程内（开发默认）
# worker    = harness 跑在 fork 子进程（进程隔离）
AGENT_RUNTIME_HOST=inprocess
```
