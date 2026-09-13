FROM node:20-alpine

RUN npm install -g pnpm@8.15.0

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./

COPY packages/db/package.json ./packages/db/
COPY packages/api-contract/package.json ./packages/api-contract/
COPY packages/common/package.json ./packages/common/
COPY packages/agent/package.json ./packages/agent/
COPY packages/agent-ui/package.json ./packages/agent-ui/
COPY packages/agent-worker/package.json ./packages/agent-worker/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --no-frozen-lockfile

COPY packages/db/ ./packages/db/
COPY packages/api-contract/ ./packages/api-contract/
COPY packages/agent/ ./packages/agent/
COPY packages/agent-worker/ ./packages/agent-worker/
COPY apps/api/ ./apps/api/
COPY tsconfig.base.json ./

WORKDIR /app/packages/db
RUN pnpm exec tsc

EXPOSE 3070

WORKDIR /app/apps/api
CMD ["pnpm", "exec", "tsx", "src/index.ts"]
