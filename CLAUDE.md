# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 React + TypeScript + Vite 的智能物业管理系统，使用现代化前端技术栈构建。

## 常用命令

### 开发命令
```bash
# 安装依赖（使用 pnpm）
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 预览构建结果
pnpm preview

# 代码检查
pnpm lint

# 类型检查
pnpm type-check
```

### 测试命令
```bash
# 运行 Playwright 测试
pnpm test

# 安装 Playwright 浏览器
pnpm playwright install
```

## 架构概览

### 技术栈
- **前端**: React 18 + TypeScript + Vite
- **路由**: React Router DOM (使用 Hash Router)
- **样式**: Tailwind CSS + Less
- **状态管理**: Zustand
- **地图**: Mapbox GL JS
- **动画**: Framer Motion
- **测试**: Playwright

### 项目结构
```
src/
├── components/     # 通用组件
├── pages/         # 页面组件
├── store/         # Zustand 状态管理
├── utils/         # 工具函数
├── hooks/         # 自定义 Hooks
├── types/         # TypeScript 类型定义
├── services/      # API 服务
└── assets/        # 静态资源
```

### 路由配置
项目使用 `createHashRouter` 配置路由，参考示例：
```typescript
import { createHashRouter } from "react-router";
import Layout from "./components/Layout";

export const router = createHashRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: MapView },
      { path: "management", Component: ManagementView },
      { path: "stream-view", Component: RealtimeVideoStreaming }
    ]
  }
]);
```

### 样式优先级
1. **Tailwind CSS**（优先使用）
2. **CSS Modules (.less)**（Tailwind 无法实现时）
3. **内联样式**（最后选项）

### 重要特性
- 集成了 Mapbox 3D 地图系统
- 实时数据监控和可视化
- 性能监控和优化工具
- 支持深色模式
- 响应式设计

## 开发注意事项

### 代码规范
- 使用 TypeScript 编写代码
- 遵循 ESLint 规则
- 组件使用函数式组件和 Hooks
- 状态管理使用 Zustand

### 性能优化
- 使用 React.memo 和 useMemo 优化渲染
- 组件懒加载
- 图片和资源优化

### 测试
- 使用 Playwright 进行端到端测试
- 测试文件放在 `tests/` 目录

### 部署
- 项目部署在 Vercel
- 使用 SPA 重写配置处理路由