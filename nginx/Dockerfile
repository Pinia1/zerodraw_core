FROM node:20-alpine AS builder

RUN npm install -g pnpm@8.15.0

WORKDIR /app

# 复制 monorepo 配置文件
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./

# 复制所有 package.json（pnpm workspace 解析需要）
COPY packages/core/package.json ./packages/core/
COPY packages/common/package.json ./packages/common/
COPY packages/api-contract/package.json ./packages/api-contract/
COPY packages/db/package.json ./packages/db/
COPY packages/config/package.json ./packages/config/
COPY packages/docs/package.json ./packages/docs/
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/

# 安装依赖
RUN pnpm install --no-frozen-lockfile

# 复制源码
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/
COPY tsconfig.base.json ./

# 前端构建时注入的环境变量
# VITE_API_URL 留空，请求通过 Nginx 代理，使用相对路径
ARG GITHUB_CLIENT_ID
ARG VITE_API_URL=""
ARG VITE_IMAGE_THUMBNAIL="/api/file/thumbnail"
ARG VITE_IMAGE_FILE="/api/file/volc"

ENV GITHUB_CLIENT_ID=$GITHUB_CLIENT_ID
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_IMAGE_THUMBNAIL=$VITE_IMAGE_THUMBNAIL
ENV VITE_IMAGE_FILE=$VITE_IMAGE_FILE

WORKDIR /app/apps/web
RUN pnpm exec vite build

# ---- 最终镜像 ----
FROM nginx:1.25-alpine

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
