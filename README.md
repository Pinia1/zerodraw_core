# Frontend Monorepo

基于 pnpm 的前端 Monorepo 工程模板

## 📦 项目结构

```
frontend-monorepo/
├── packages/
│   ├── web/                    # Web 应用（Vite + React + TypeScript）
│   └── shared/                 # 共享工具库和类型定义
├── .vscode/                    # VSCode 配置
├── package.json                # 根 package.json
├── pnpm-workspace.yaml         # pnpm workspace 配置
├── tsconfig.base.json          # TypeScript 基础配置
├── .eslintrc.json             # ESLint 配置
├── .prettierrc                # Prettier 配置
├── .editorconfig              # EditorConfig 配置
├── .npmrc                     # npm 配置
└── README.md                  # 项目说明
```

## ✨ 特性

- 🚀 **pnpm workspace** - 高效的 monorepo 包管理
- ⚡️ **Vite** - 极速的开发体验
- ⚛️ **React 18** - 最新的 React 版本
- 📘 **TypeScript** - 完整的类型支持
- 🎨 **ESLint + Prettier** - 代码质量和格式化
- 📦 **tsup** - 快速的库打包工具
- 🔗 **workspace 协议** - 包之间的依赖管理

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 安装依赖

```bash
# 如果还没有安装 pnpm
npm install -g pnpm

# 安装所有依赖
pnpm install
```

### 开发

```bash
# 启动所有包的开发服务器
pnpm dev

# 只启动 web 应用
pnpm --filter @monorepo/web dev

# 只构建 shared 库
pnpm --filter @monorepo/shared build
```

### 构建

```bash
# 构建所有包
pnpm build

# 构建指定包
pnpm --filter @monorepo/web build
```

### 代码检查和格式化

```bash
# 运行 ESLint
pnpm lint

# 格式化代码
pnpm format
```

## 📚 包说明

### @monorepo/web

Web 应用，使用 Vite + React + TypeScript 构建。

```bash
cd packages/web
pnpm dev        # 启动开发服务器（端口：3000）
pnpm build      # 构建生产版本
pnpm preview    # 预览构建结果
```

### @monorepo/shared

共享工具库和类型定义，使用 tsup 打包。

```bash
cd packages/shared
pnpm dev        # 监听模式构建
pnpm build      # 构建库文件
```

包含：
- 工具函数（utils）
- 类型定义（types）
- 支持 ESM 和 CommonJS

## 🔧 添加新包

1. 在 `packages/` 目录下创建新的包文件夹
2. 创建 `package.json`，包名使用 `@monorepo/` 前缀
3. 如果需要引用其他包，在 dependencies 中使用 `workspace:*`

```json
{
  "name": "@monorepo/new-package",
  "dependencies": {
    "@monorepo/shared": "workspace:*"
  }
}
```

4. 运行 `pnpm install` 更新依赖

## 📝 开发建议

### VSCode 配置

项目已包含推荐的 VSCode 设置和扩展：
- Prettier - 代码格式化
- ESLint - 代码检查
- EditorConfig - 编辑器配置

打开项目时，VSCode 会提示安装推荐的扩展。

### 包之间的依赖

使用 `workspace:*` 协议引用本地包：

```json
{
  "dependencies": {
    "@monorepo/shared": "workspace:*"
  }
}
```

### 命令技巧

```bash
# 在所有包中执行命令
pnpm -r <command>

# 在指定包中执行命令
pnpm --filter <package-name> <command>

# 添加依赖到指定包
pnpm --filter @monorepo/web add react-router-dom

# 添加开发依赖到根目录
pnpm add -D -w prettier

# 清理所有 node_modules
pnpm clean
```

## 🎯 下一步

- 添加测试框架（Vitest / Jest）
- 添加 UI 组件库包
- 配置 CI/CD
- 添加 Git Hooks（husky + lint-staged）
- 添加 Changesets 进行版本管理

## 📄 许可证

MIT

## 🤝 贡献

欢迎提交 Issues 和 Pull Requests！

