# @monorepo/server

后端 API 服务，基于 Express + TypeScript + PM2

## 功能

- ✅ Express + TypeScript
- ✅ GitHub OAuth 登录
- ✅ PM2 进程管理
- ✅ CORS 跨域支持
- ✅ 环境变量配置
- ✅ 错误处理和日志

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

然后编辑 `.env` 文件：

```env
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
```

### 3. 开发模式

```bash
# 开发模式（热重载）
pnpm dev

# 或在根目录
pnpm --filter @monorepo/server dev
```

### 4. 生产环境

```bash
# 构建
pnpm build

# 使用 PM2 启动
pnpm pm2:start

# 查看日志
pnpm pm2:logs

# 监控
pnpm pm2:monit

# 重启
pnpm pm2:restart

# 停止
pnpm pm2:stop

# 删除
pnpm pm2:delete
```

## API 文档

### Health Check

```bash
GET /api/health
```

响应：

```json
{
  "status": "ok",
  "message": "Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GitHub OAuth

```bash
POST /api/auth/github
Content-Type: application/json

{
  "code": "github_authorization_code"
}
```

响应：

```json
{
  "success": true,
  "token": "access_token",
  "user": {
    "id": 12345,
    "username": "username",
    "avatar": "https://...",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

## PM2 命令

```bash
# 启动
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs monorepo-server

# 实时监控
pm2 monit

# 重启
pm2 restart monorepo-server

# 停止
pm2 stop monorepo-server

# 删除
pm2 delete monorepo-server

# 保存当前进程列表（开机自启）
pm2 save

# 生成启动脚本
pm2 startup
```

## 目录结构

```
packages/server/
├── src/
│   ├── index.ts              # 入口文件
│   ├── routes/               # 路由
│   │   └── auth.ts
│   └── controllers/          # 控制器
│       └── authController.ts
├── dist/                     # 编译输出
├── logs/                     # PM2 日志
├── ecosystem.config.js       # PM2 配置
├── package.json
├── tsconfig.json
└── .env                      # 环境变量（不提交）
```

## 环境变量

| 变量                   | 说明                       | 默认值                  |
| ---------------------- | -------------------------- | ----------------------- |
| `NODE_ENV`             | 运行环境                   | `development`           |
| `PORT`                 | 服务端口                   | `3001`                  |
| `FRONTEND_URL`         | 前端地址（CORS）           | `http://localhost:3000` |
| `GITHUB_CLIENT_ID`     | GitHub OAuth Client ID     | -                       |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret | -                       |

## 开发建议

1. 开发时使用 `pnpm dev`，支持热重载
2. 生产环境使用 PM2 管理进程
3. 敏感信息放在 `.env` 文件中
4. 定期查看 PM2 日志文件
