# Agent Studio

基于 `@zeroDraw/agent` 框架的单机版 Agent 工作台：Studio 画布 + Agent 对话 + Admin 监控。

无需 MySQL / Redis 即可本地运行（SQLite + 本地文件存储）。

## 功能

- **Studio** — 流程图画布（Markdown / 图片 / 视频节点），Agent 可通过 client tools 读写画布
- **Agent 对话** — 多轮会话、前端 deferred 工具、SSE 流式输出
- **项目管理** — 创建 / 列表 / 打开项目
- **Admin 监控** — `/admin/agent` 观测 harness runtime、会话与 prompt run
- **Guest 登录** — 无需 GitHub OAuth 即可试用

## 快速开始

### 1. 环境变量

复制 `.env.example` 为 `.env`，至少配置：

```env
DATABASE_URL=file:./data/app.db
JWT_SECRET=change-me
AGENT_API_KEY=your-ark-api-key
```

可选：`AGENT_ADMIN_TOKEN`（Admin API）、`REDIS_HOST`（runtime 快照共享）、TOS 凭证（云上传）。

### 2. 安装与建表

```bash
pnpm install
cd packages/db && npx drizzle-kit push --force
```

### 3. 启动

```bash
pnpm dev          # web + api
pnpm dev:api      # 仅 API（3070）
pnpm dev:web      # 仅前端
```

- 前端：http://localhost:5173
- API：http://localhost:3070
- Admin：http://localhost:5173/admin/agent

### 4. Smoke test

```bash
cd apps/api && pnpm test:agent-smoke
```

## 项目结构

```
zeroDraw/
├── apps/
│   ├── api/           # Fastify API（auth / project / file / agent）
│   ├── web/           # React 前端（Home / Studio / Admin）
│   └── agent-worker/  # Agent harness 子进程运行时
├── packages/
│   ├── agent/         # Agent 框架核心（会话、工具、runtime host）
│   ├── agent-ui/      # 前端 Agent UI 组件与 chat runtime
│   ├── db/            # Drizzle SQLite schema
│   └── api-contract/  # 共享 Zod / TS 契约
└── data/              # SQLite 与本地 uploads（gitignore）
```

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | React 18 + Vite + `@zeroDraw/agent-ui` |
| 后端 | Fastify 5 + `@zeroDraw/agent` |
| 数据库 | SQLite（better-sqlite3 + Drizzle） |
| Agent | pi-agent-core + ARK `/api/plan` 网关 |
| 包管理 | pnpm + Turborepo |

## 说明

- 原 zeroDraw 绘画 / Konva / `@zeroDraw/core` 已移除。
- Agent 会话持久化见 `packages/agent/src/storage/sqlite.storage.ts`。
- Studio 注册的前端工具定义：`apps/web/src/features/agent/tools/studio/clientDefinitions.ts`。
