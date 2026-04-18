FROM node:20-alpine

RUN npm install -g pnpm@8.15.0

WORKDIR /app

# 复制 monorepo 配置文件（利用 Docker 缓存层）
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./

# 复制所有 package.json（pnpm workspace 解析需要）
COPY packages/db/package.json ./packages/db/
COPY packages/api-contract/package.json ./packages/api-contract/
COPY packages/config/package.json ./packages/config/
COPY packages/docs/package.json ./packages/docs/
COPY packages/core/package.json ./packages/core/
COPY packages/common/package.json ./packages/common/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# 安装依赖（含 devDeps 以获取 tsx）
RUN pnpm install --no-frozen-lockfile

# 复制源码
COPY packages/db/ ./packages/db/
COPY packages/api-contract/ ./packages/api-contract/
COPY apps/api/ ./apps/api/
COPY tsconfig.base.json ./

# 编译 db 包（API 依赖 db/dist）
WORKDIR /app/packages/db
RUN pnpm exec tsc

EXPOSE 3070

WORKDIR /app/apps/api

# api-contract 导出 TS 源码，使用 tsx 直接运行（无需 tsc 编译）
CMD ["pnpm", "exec", "tsx", "src/index.ts"]
