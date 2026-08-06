# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用命令

```bash
npm run dev       # 启动开发服务器 (http://localhost:3000)
npm run build     # 生产构建
npm start         # 启动生产服务器
npm run lint      # ESLint 代码检查
```

## 项目概述

面向工业企业的企业级智能数据分析平台。纯前端应用，所有数据为模拟数据，AI 能力通过规则匹配 + 延迟模拟实现，无需后端服务。

## 技术栈

- Next.js 14 (App Router) + TypeScript 5
- Tailwind CSS 3（主色 blue-600 系）
- Recharts 3（图表可视化）
- React Context + useReducer（状态管理）
- localStorage（数据持久化：用户、收藏、历史记录）

## 路由架构

项目使用 Next.js App Router 路由组织：

```
/login          — 独立布局（无侧边栏），模拟登录
/(main)/*       — 主布局组，左右结构（左侧导航 + 右侧内容），含登录守卫
/settings/*     — 配置中心独立布局（返回首页 + 左侧二级导航）
/profile        — 个人中心独立布局（返回首页）
```

关键文件：
- [src/app/layout.tsx](src/app/layout.tsx) — 根布局，挂载 AppProvider
- [src/app/(main)/layout.tsx](src/app/(main)/layout.tsx) — 主布局壳（左右结构 + 登录守卫）
- [src/app/settings/layout.tsx](src/app/settings/layout.tsx) — 配置中心布局（返回首页 + 二级导航）
- [src/app/profile/page.tsx](src/app/profile/page.tsx) — 个人中心（修改信息 + 退出）

## 全局状态 (AppContext)

[src/lib/store/AppContext.tsx](src/lib/store/AppContext.tsx) 提供：
- `user / isLoggedIn` — 当前用户和登录状态
- `favorites[]` — 收藏的 AI 回复（持久化 localStorage）
- `history[]` — 历史提问记录（最多100条，持久化 localStorage）
- `login/logout/updateUser` — 认证操作
- `toggleFavorite/addHistory/isFavorited` — 收藏和历史操作

所有页面通过 `useApp()` hook 访问全局状态。

## 模拟 AI 引擎

[src/lib/ai/mock-ai.ts](src/lib/ai/mock-ai.ts)：
- `mockAiResponse(text)` — 关键词匹配 + 延迟模拟，返回单条 AI 回复
- `mockStreamResponse(text)` — 异步生成器，逐字产出文本（用于流式输出效果）
- 匹配逻辑：先用精准规则匹配特定查询（如 AI 演示的案例查询），再用通用关键词匹配预设问答对，最后兜底返回通用提示

## 模拟数据

全部位于 [src/lib/mock-data/](src/lib/mock-data/)：
- `dashboard.ts` — 6项KPI + 3条趋势 + 5条产线 + 产量/能耗分布
- `qa.ts` — 6组关键词-回复预设 + 欢迎消息
- `data-assets.ts` — 4个数据域 + 8张子表 + 8个指标
- `reports.ts` — 6个报告模板 + 内容生成函数
- `ai-demos.ts` — 6个AI演示案例详情
- `settings.ts` — 配置中心各模块模拟数据
- 场景设定：**钢铁制造企业**（高炉、热轧、冷轧、镀锌、连铸）

## 关键设计约定

- 统一使用 emoji 图标，不依赖额外图标库
- 组件通过 `"use client"` 指令标记为客户端组件
- 页面标题行统一使用 `text-xl font-bold text-gray-900` + `text-sm text-gray-500` 副标题
- AI 演示页卡片点击 → 弹窗展示案例详情 → "查看实际效果"按钮 → 跳转到对应功能页（/qa 或 /reports）
- 配置中心左侧二级导航用垂直菜单 + 分组标题（数据配置/AI配置/系统管理）
- 登录守卫在 `(main)/layout.tsx` 中通过轮询 `state.isLoggedIn` 实现
