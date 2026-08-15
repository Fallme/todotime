# 更新记录（CHANGELOG）

> 本文件记录 TodoTime 番茄钟项目的每次更新，倒序排列（最新在顶部）。
> **每次更新代码后，必须在本文件顶部追加一条记录。** 每条记录分两节：给人看、给 AI 看。

```markdown
## YYYY-MM-DD — 概述（一句话）

### 给人看（Human Summary）
- **改了什么**：业务层面的改动，不涉及代码细节
- **为什么**：动机 / 背景
- **影响范围**：哪些功能、哪些用户受影响

### 给 AI 看（Technical Details）
- **涉及文件**：精确路径 + 关键函数 / 改动点
- **接口 / 数据模型变化**：API、DB schema、函数签名的增删改
- **关键实现细节 / 注意事项**：gotchas、不变量、易踩的坑
- **验证方式**：可复现的命令 + 手测步骤
- **后续待办 / 已知问题**：下一步该做什么
```

---

## 2026-08-15 — 窄屏任务卡改用 Grid 两行布局 + 加宽内容区

### 给人看（Human Summary）
- **改了什么**：手机窄屏（≤480px）下，任务卡片改为两行网格布局——第一行是「状态点 + 标题 + 操作按钮」，第二行「时间 + 🍅数」缩进对齐到标题下方；同时收窄了内容区左右留白（主内容 12px→8px、清单容器 16px→10px、卡片内边距 12px→10px），卡片整体可用宽度变宽。
- **为什么**：上一版 `flex-wrap` 方案在极窄屏上仍出现标题被挤压、辅助信息拥挤（视觉上重叠），且卡片可用宽度太窄，长标题几乎看不清。
- **影响范围**：手机窄屏（≤480px）任务清单卡片布局。

### 给 AI 看（Technical Details）
- **涉及文件**：
  - `src/index.css` — `@media (max-width: 480px)` 内重写任务卡布局：`.todo-card-row` 由 `flex-wrap` 改为 `display: grid; grid-template-columns: 36px minmax(0, 1fr) auto; grid-template-areas: "status body actions" / ". meta meta";`，`.todo-card-status/body/meta/actions` 各自用 `grid-area` 定位；同时 `.main-content` 左右 padding 降到 8px、`.todo-list-container` padding 改 `12px 10px`、`.todo-card-row` padding 改 `10px`。
- **接口 / 数据模型变化**：无。
- **关键实现细节 / 注意事项**：
  - `minmax(0, 1fr)` 而非 `1fr`：让标题列可收缩到内容以下，标题才能换行/两行截断。
  - `grid-template-areas` 第二行用 `.` 空单元格占住第 1 列（状态列），使 `.todo-card-meta` 从第 2 列开始，自然对齐标题下方、缩进在状态列之后，不再需要之前脆弱的 `margin-left: 46px` 硬编码。
  - grid 项会忽略 flex 相关属性，故 `.todo-card-body` 的 `flex: 1`、`.todo-card-meta` 的 `flex-shrink: 0` 在窄屏下不生效，由 grid 列宽接管。
  - 操作按钮（播放/子任务/重复/删除）仍留在第一行右侧，未改动。
- **验证方式**：`npm run build`（`tsc -b && vite build`）通过；DevTools 切 ≤480px 视口，确认卡片两行、标题最多两行、时间/🍅数缩进在下方、无重叠、内容区比之前更宽。
- **后续待办 / 已知问题**：沿用上一条记录的 `endNow` / `skipRound` 副作用位置问题，本次未处理。

---

## 2026-08-15 — 窄屏任务卡「辅助信息」下沉到第二行

### 给人看（Human Summary）
- **改了什么**：手机窄屏（≤480px）下，任务卡片里「时间 + 番茄数」这类辅助信息从标题右侧挪到标题下方第二行，标题因此能完整显示两行，不再被挤压折叠。
- **为什么**：之前虽然标题改成了两行，但一行里仍塞着状态点、板块、标题、时间/番茄数、操作按钮，窄屏上固定占位把标题挤到几乎不可见（折叠）。
- **影响范围**：手机端任务清单卡片布局（≤480px）。

### 给 AI 看（Technical Details）
- **涉及文件**：
  - `src/index.css` — 在 `@media (max-width: 480px)` 内新增 `.todo-card-row { flex-wrap: wrap; row-gap: 4px; }` 与 `.todo-card-meta { order: 10; flex-basis: calc(100% - 46px); margin-left: 46px; }`：把 `.todo-card-meta`（时间 + 番茄数）移到 flex 末行、缩进 46px 对齐标题列。
- **接口 / 数据模型变化**：无。
- **关键实现细节 / 注意事项**：
  - 缩进 46px ≈ 行左 padding 12px + 状态列 36px + 间距 10px，使 meta 对齐正文（标题）起始列；`flex-basis: calc(100% - 46px)` 配合 `margin-left: 46px` 保证不溢出。
  - 操作按钮（播放/子任务/重复/删除）仍留在第一行右侧，未改动。
- **验证方式**：`npm run build` 通过；DevTools 切 ≤480px 视口，确认长标题两行、时间/番茄数移到下方。
- **后续待办 / 已知问题**：无新增，沿用上一条记录。

---

## 2026-08-15 — 任务清单窄屏两行展示 + 计时归属回归锁定

### 给人看（Human Summary）
- **改了什么**：任务清单里过长的任务名，在手机窄屏上从「只显示一行 + 省略号」改成「最多显示两行」，长标题能看清了；另外确认并锁定了「带着具体任务开始计时、快速完成后不会弹出分配窗，而是直接记到当前任务」这条规则。
- **为什么**：窄屏手机上一个长任务名被截断成「…」，用户看不清完整内容；计时归属的「有任务就不弹分配窗」本该如此，但缺少回归测试，容易被后续改动破坏。
- **影响范围**：任务清单卡片在窄屏下的显示效果；计时归属逻辑本身无行为变化（仅补测试加固）。

### 给 AI 看（Technical Details）
- **涉及文件**：
  - `src/index.css` — `.todo-card-title` 由 `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`（单行省略）改为 `display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: break-word; min-width: 0`（两行截断）。`min-width: 0` 让标题作为 flex 子项能被压缩换行。
  - `test/timerInteractions.test.ts` — 新增两条 source 断言：`const requiresAssignment = !task?.id` 与 `if (requiresAssignment) { ... setGroupPhase('settle') }`，锁定「已选任务时专注完成不进入待分配结算」。
- **接口 / 数据模型变化**：无。
- **关键实现细节 / 注意事项**：
  - 计时归属逻辑（`src/hooks/useTimer.ts` 的 `completeOne` / `endNow` / `skip` / `skipRound`）**原本已正确**：`currentTaskRef.current` 有 `id` 时记录到该任务，只有无任务时才 `setPendingAssignments` + `setGroupPhase('settle')` 触发 `TaskAssignModal`（`src/App.tsx` 中 `groupPhase === 'settle' && pendingAssignments.length > 0`）。本次**未改动**该逻辑，只补测试锁定。
  - `currentTaskRef` 由 `setTaskInfo(id, title, category)` 写入，`App.tsx` 的 `handleQuickStart` / `handleSelectTodo` / 任务选择器都同步维护它。
  - **已知问题（本次未修，建议后续处理）**：`endNow` 与 `skipRound` 在 `setPendingAssignments(prev => ...)` 的 updater 内部调用其它 setState（`setTotalPomodoros` / `recordPomodoro` / `setGroupPhase` / `showToast`），违反 React「state updater 须为纯函数」约定。开发模式 `StrictMode`（`src/main.tsx`）会二次调用 updater，导致 `totalPomodoros` 双倍累加；生产模式不受影响。修复方向：把副作用移到 updater 之外，改用已存在的 `pendingAssignRef.current` 读取最新值。
- **验证方式**：`npm run test:logic`（35/35 通过）、`npm run lint`、`npm run build`（`tsc -b && vite build` 通过）。手测：窄屏打开任务清单确认长标题两行显示；用任务「播放」按钮开始专注后点「结束本轮/跳过」确认不弹分配窗、番茄记到该任务。
- **后续待办 / 已知问题**：评估是否重构 `endNow` / `skipRound` 的副作用位置；本批改动**尚未提交**（`index.css`、`test/timerInteractions.test.ts` 已修改，`CHANGELOG.md`、`AGENTS.md` 新增）。
