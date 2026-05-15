# zeroDraw

一款运行在浏览器中的矢量 & 位图绘画工具，支持多图层、AI 辅助生图、丰富的画笔与选区工具。

**[在线体验 zerodraw.cn](https://zerodraw.cn/login)**

> 服务器部署在香港，国内访问可能较慢，建议挂梯子以获得更好的体验。

## 功能特性

- **多图层管理** — 支持新建、拖拽排序、显示/隐藏、不透明度、混合模式（正片叠底/滤色/叠加等）、图层滤镜
- **画笔工具** — 自由笔触，可调尺寸、不透明度、硬度、平滑度、压感模拟
- **橡皮擦** — 像素橡皮擦 & 对象橡皮擦（一笔删除整个图元素）
- **图形工具** — 矩形、椭圆、直线，支持渐变填充
- **套索选区** — 自由/矩形/椭圆选区，支持加选、减选、反选、复制/剪切到新图层
- **位图化（Rope）** — 将矢量图层栅格化为位图
- **AI 生图** — 基于画布草图输入 Prompt，AI 生成修改结果
- **自动保存** — 数据存储于 IndexedDB，无需手动保存
- **导出** — 按图层顺序合成，正确应用混合模式与滤镜，支持高分辨率输出
- **快捷键** — 支持撤销/重做、空格平移、滚轮缩放等常用操作
- **触控支持** — iPad / 平板双指缩放与平移

## 技术栈

| 层级      | 技术                         |
| --------- | ---------------------------- |
| 前端框架  | React 18 + TypeScript + Vite |
| 渲染引擎  | Konva（Canvas 2D）           |
| 状态管理  | Zustand                      |
| UI 组件库 | Ant Design                   |
| 后端      | Node.js + Fastify            |
| 包管理    | pnpm + Turborepo（Monorepo） |

## 项目结构

```
zerodraw/
├── apps/
│   ├── web/        # React 前端应用
│   └── api/        # Node.js 后端服务
└── packages/
    ├── core/       # 核心绘图逻辑
    ├── common/     # 公共工具
    ├── db/         # 数据库模型
    ├── api-contract/  # 前后端接口契约
    └── docs/       # 文档站（dumi）
```

## 快速开始

**环境要求：** Node.js >= 18、pnpm >= 8

```bash
# 安装依赖
pnpm install

# 启动全部服务（前端 + 后端）
pnpm dev

# 只启动前端
pnpm dev:web

# 只启动后端
pnpm dev:api

# 启动文档站
pnpm dev:docs
```

复制 `.env.example` 为 `.env` 并填写所需的环境变量后再启动后端。

## 文档

完整使用手册见 [zerodraw.cn/docs/guide](https://zerodraw.cn/docs/guide)，包含：

- [快速开始](https://zerodraw.cn/docs/guide)
- [绘图工具](https://zerodraw.cn/docs/guide/tools)
- [图层管理](https://zerodraw.cn/docs/guide/layers)
- [AI 生图](https://zerodraw.cn/docs/guide/ai)
- [快捷键](https://zerodraw.cn/docs/guide/shortcuts)
- [导出](https://zerodraw.cn/docs/guide/export)

## License

MIT
