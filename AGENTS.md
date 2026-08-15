# AGENTS.md — TodoTime 番茄钟开发指南

> 本文件是项目级持久约定，供所有在此项目上工作的 agent 阅读与遵守。

## 项目简介

TodoTime：一个番茄工作法计时器 + 任务管理 + 数据统计的 Web / Electron 应用。核心功能：

- **专注计时**：工作 / 短休息 / 长休息循环，可关联主任务或子任务，支持跳过、结束本轮、手动补录。
- **任务清单**：主任务 + 子任务，优先级、板块分类、完成/放弃/软删除、循环刷新（每日/隔日/隔二日/每周/每月）。
- **统计**：今日概览、周/月趋势、板块占比、周报/月报、打卡热力图。
- **多端同步**：通过「专属码」绑定 GitHub 私有仓库，离线优先、按记录 ID 合并去重。

## 技术栈

- 前端：React 19 + TypeScript + Vite 8，原生 CSS（`src/index.css`，含 25 套主题），图表用 Chart.js / react-chartjs-2，图标用 lucide-react。
- 样式：Tailwind CSS 4（`@tailwindcss/vite`），但主要样式集中在 `src/index.css`。
- 桌面端：Electron 42（`electron.js`，打包脚本 `electron:build`）。
- 同步：`src/hooks/useGithubSync.ts` + `src/services/github.ts`，GitHub JSON 文件同步，SHA-256 派生 profileId。
- 部署：Vercel（`vercel.json`）/ Render（`render.yaml`）。

## 目录结构

| 路径 | 职责 |
|------|------|
| `src/App.tsx` | 应用入口组件：组装 timer / todos / sync，标签页切换，任务选择器与分配弹窗 |
| `src/main.tsx` | React 挂载入口（`StrictMode` + `LanguageProvider`） |
| `src/hooks/useTimer.ts` | 计时核心：倒计时、循环推进、任务归属、待分配结算（`PendingAssignment` / `GroupPhase`） |
| `src/hooks/useTodos.ts` | 任务增删改、子任务、循环刷新、番茄计数 |
| `src/hooks/useGithubSync.ts` | GitHub 双向同步与冲突合并 |
| `src/hooks/useStats.ts` | 统计数据聚合 |
| `src/components/Timer/` | `CountdownTimer`、`TimerRing`、`TimerControls`、`TaskAssignModal`（分配窗）、`ManualFocusModal` |
| `src/components/TodoList/` | `TodoList`、`TodoItem`、月历等 |
| `src/components/Stats/`、`Settings/`、`Layout/`、`Auth/` | 统计、设置、布局、同步码门 |
| `src/utils/` | `pomodoroRules`、`dateUtils`、`taskRecurrence`、`todoMerge`、`syncMerge`、`syncIdentity` 等纯逻辑 |
| `src/i18n/` | 中英文（`LanguageContext`） |
| `src/types/index.ts` | 全部类型与默认设置 |
| `test/*.test.ts` | 回归测试（`node:test`，含 source 级断言） |
| `docs/` | `FEATURES.md` 功能说明、`TEST_REPORT.md`、`PROMOTION.md` |
| `api/` | Vercel 无服务器函数（`file.ts`） |

## 运行与测试

```bash
npm run dev          # 启动 Vite 开发服务器
npm run build        # tsc -b && vite build
npm run test:logic   # 运行逻辑回归测试（node --test test/*.test.ts）
npm test             # test:logic + lint + build + typecheck:api
npm run lint         # eslint
npm run electron:dev # 构建后启动 Electron
```

## 核心开发规则（必须遵守）

1. **每次更新代码后，必须更新 `CHANGELOG.md`**：在文件顶部追加一条新的更新记录（倒序排列）。
2. **提交前先写记录**：写代码 → 写 CHANGELOG 条目 → 提交，顺序不可颠倒。
3. **每条记录必须分两节，同时覆盖两类读者**：
   - **给人看（Human Summary）**：用通俗语言写清「改了什么、为什么、影响哪些功能」，不出现代码细节。
   - **给 AI 看（Technical Details）**：给出精确文件路径与改动函数、接口/数据模型变化、关键实现细节与注意事项（gotchas）、可复现的验证命令、后续待办，让下一个 agent 无需重读 `git diff` 即可继续开发。
4. 完整字段与格式见 `CHANGELOG.md` 顶部的模板说明，保持一致。

## 关键约定

- 日期统一用**本地时区**（`src/utils/dateUtils.ts` 的 `formatDate` 使用 `getFullYear/getMonth/getDate`），不要用 `toISOString()` 取日期（会产生 UTC 跨时区错误）。
- 计时使用**绝对截止时间**（`deadlineRef = Date.now() + remaining*1000`）计算剩余秒数，不依赖「每秒减一」；后台切回时按真实经过时间校正。
- 任务归属：`currentTaskRef.current` 有 `id` 时，专注结束直接记录到该任务；无任务时才进入待分配（`pendingAssignments`）并触发 `TaskAssignModal`（`groupPhase === 'settle'`）。
- React state **updater 须为纯函数**：不要在 `setState(prev => ...)` 内部调用其它 setState。`useTimer.ts` 的 `endNow`/`skipRound` 目前存在该反模式（见 CHANGELOG 已知问题），新增代码不要效仿。
- 前端用 `escHtml()` 或 React 默认转义防止 XSS；任务标题等用户输入不要直接拼 HTML。
