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

## 2026-08-17 — 完成按钮独立突出、放弃并入操作行 + 任务卡显示累计用时

### 给人看（Human Summary）
- **改了什么**：任务卡左侧只保留一个「完成 ✓」大按钮（34px、绿色、悬停填充），更突出；「放弃 ✕」从左侧移到第二行的小按钮区，排在删除按钮左边；每张任务卡 🍅 番茄数旁边新增「累计用时」，显示该任务累计专注时长。
- **为什么**：完成是高频操作、需要醒目；放弃与删除同属「结束性操作」，归到一起更清晰；用户想看每项任务到底投入了多少时间。
- **影响范围**：任务清单卡片（含归档里的当前完成项）左侧状态区、第二行操作按钮、辅助信息行。

### 给 AI 看（Technical Details）
- **涉及文件**：
  - `src/App.tsx` — 新增 `focusMinutesByTask` useMemo（从 `dayDataMap` 各日 `pomodoros` + `timer.todayPomodoros` 汇总每个 `taskId` 的 completed 记录 `duration` 之和），传给 `TodoList`；react 导入加入 `useMemo`。
  - `src/components/TodoList/TodoList.tsx` — `TodoListProps` 增 `focusMinutesByTask: Map<string, number>`，两个 `TodoItem` 渲染点透传 `focusMinutes={focusMinutesByTask.get(todo.id) ?? 0}`。
  - `src/components/TodoList/TodoItem.tsx` — 新增 `focusMinutes` prop；lucide 导入加 `X`、`Clock3`；活动态状态区只渲染一个 `.status-dot.check` 大按钮（去掉 abandon）；操作行在 `Repeat2` 与删除之间插入 `card-btn abandon`（`X` 图标、仅 `isActive` 显示）；meta 区 🍅 后新增 `.todo-card-focus`（`Clock3` + `msg('累计','Total')` + `focusText`）。
  - `src/index.css` — `.status-dot.check` 改为 34px/18px 绿色突出 + hover 填充；删除 `.status-dot.abandon:hover`；新增 `.card-btn.abandon:hover`（橙红）与 `.todo-card-focus` 样式。
- **接口 / 数据模型变化**：`TodoListProps` / `TodoItemProps` 增 `focusMinutesByTask` / `focusMinutes`；无存储结构变化（累计用时为渲染期派生值，不入库、不参与同步）。
- **关键实现细节 / 注意事项**：
  - 累计用时 = 所有 `completed && taskId` 的 `PomodoroRecord.duration` 之和，**不**按 `isPomodoroRecord`（≥15min）过滤，因此「<15 分钟的专注」也计入用时；与 🍅 数（只计 ≥15min）口径不同、有意为之（用时=实际投入，番茄数=达标次数）。
  - `focusMinutes` 只统计 `taskId === 父任务 id` 的记录，子任务记录（`taskId = subtask.id`）不计入父任务，与 🍅 `completedPomodoros` 口径一致。
  - `legacyPomodoroCount`（无记录的老番茄）没有 duration 数据，不计入累计用时。
  - 放弃按钮从状态区移到操作行：放弃/恢复仍走原 `onAbandon`/`onRestore`，语义不变；活动态状态区只剩完成大按钮，done/abandoned 态仍显示单个恢复按钮（28px，不放大）。
  - `.status-dot.check` 放大到 34px 仍在 42px 的 status 列宽内；主题对 `.status-dot` 只改 `border-radius`，不冲突。
- **验证方式**：`npm run build`（`tsc -b && vite build` 通过）、`npm run test:logic`（35/35 通过）、`npm run lint` 通过。手测：活动任务左侧一个大绿勾、悬停填充为绿色；第二行按钮顺序为「播放/子任务/重复/放弃/删除」；🍅 旁显示「累计 X 分钟 / X 小时」。
- **后续待办 / 已知问题**：无新增。

---

## 2026-08-17 — 完成/放弃按钮改为左侧独立区域（变大、跨两行居中）

### 给人看（Human Summary）
- **改了什么**：任务卡片左侧的「完成 ✓」「放弃 ✕」按钮改成独立区域——按钮变大（20px → 28px），竖排在卡片左侧、跨两行垂直居中，不再挤在标题前面。
- **为什么**：之前两个小圆点挤在标题左侧，太小不好点、位置也不清晰；独立区域更清楚、更好操作。
- **影响范围**：任务清单卡片的完成/放弃按钮外观与位置（含已完成/已放弃任务的恢复按钮）。

### 给 AI 看（Technical Details）
- **涉及文件**：
  - `src/index.css` — `.todo-card-row` 的 grid 列宽 `36px → 42px`，areas 由 `"status body body" / ". meta actions"` 改为 `"status body body" / "status meta actions"`（status 跨两行）；`.todo-card-status` 去掉固定 `width`，改 `flex-direction: column` + `align-self: center` 竖排居中；`.status-dot` 由 `20px → 28px`、`font-size: 11px → 15px`。
  - `src/components/TodoList/TodoItem.tsx` — 恢复按钮图标 `Check` / `RotateCcw` 的 size `15/14 → 16`。
- **接口 / 数据模型变化**：无。
- **关键实现细节 / 注意事项**：
  - status 跨两行靠 grid areas 实现（第一、二行的第一列都是 `status`），容器 `align-items: center` + `align-self: center` 让它在跨行区域内垂直居中。
  - 未完成态竖排两个按钮（✓ 完成在上、✕ 放弃在下）；完成/放弃态只有一个恢复按钮，`column` 布局下自然居中。
  - `pixel` / `farmcraft` 主题对 `.status-dot` 只改 `border-radius`（方角/微圆角），不影响尺寸与布局。
- **验证方式**：`npm run build`（`tsc -b && vite build` 通过）、`npm run test:logic`（35/35 通过）、`npm run lint` 通过。手测：任务卡左侧两个大圆点竖排居中，点完成/放弃正常。
- **后续待办 / 已知问题**：无新增。

---

## 2026-08-17 — 任务卡统一两行布局：标题第一行、按钮状态第二行

### 给人看（Human Summary）
- **改了什么**：任务卡片改成统一的「两行布局」——第一行放状态点 + 标题（标题完整显示），第二行放时间/番茄数 + 操作按钮；不再出现「只有标题文字自己折成两行、按钮还挤在标题旁边」的混乱。
- **为什么**：之前只有窄屏（≤480px）才用两行布局，稍宽一点的窗口里长标题会自己换行，但按钮/时间还悬在第一行右侧，视觉很乱。
- **影响范围**：所有宽度下的任务清单卡片布局。

### 给 AI 看（Technical Details）
- **涉及文件**：
  - `src/index.css` — 把两行 grid 布局从 `@media (max-width: 480px)` 提升为默认 `.todo-card-row`；`.todo-card-status / body / meta / actions` 默认加上 `grid-area`（meta 靠左、actions 靠右）；删除媒体查询里的重复 grid 定义，仅保留 `padding: 10px` 窄屏覆盖。
- **接口 / 数据模型变化**：无。
- **关键实现细节 / 注意事项**：
  - 默认 grid：`grid-template-columns: 36px minmax(0, 1fr) auto`，areas `"status body body" / ". meta actions"`。
  - 第一行 `body` 横跨第 2、3 列，标题占满剩余宽度、长标题换行；第二行 `meta` 落在 `1fr` 列靠左、`actions` 落在 `auto` 列靠右。
  - `.todo-card-status` 保留 `width: 36px` 占满第一列；`.todo-card-body` 的 `flex: 1` 在 grid 下失效但无害（内部仍是 flex 排列 cat / title / tag）。
  - `≤480px` 媒体查询里不再重复定义 grid，只保留 `padding: 10px`（相对默认 `10px 12px` 收窄）。
- **验证方式**：`npm run build`（`tsc -b && vite build` 通过）、`npm run test:logic`（35/35 通过）、`npm run lint` 通过。手测：桌面把窗口调窄、任务名很长时，标题完整显示在第一行，时间/番茄/按钮整齐在第二行。
- **后续待办 / 已知问题**：无新增。

---

## 2026-08-17 — 任务名可点击编辑 + 长标题完整显示

### 给人看（Human Summary）
- **改了什么**：任务清单里每条任务的标题现在可以点击直接编辑修改；长标题不再被省略号截断，完整换行显示所有文字。
- **为什么**：之前标题最多显示两行、超出就省略号截断，长任务名看不全；且任务名没有编辑入口，改名字只能删了重建。
- **影响范围**：任务清单卡片（含归档里的任务）；新增「点击标题改任务名」能力。

### 给 AI 看（Technical Details）
- **涉及文件**：
  - `src/hooks/useTodos.ts` — 新增 `updateTodoTitle(id, title)`（map 更新 `title` + `updatedAt`，`title` 相同则 no-op），加入 `UseTodosReturn` 接口与返回对象。
  - `src/components/TodoList/TodoItem.tsx` — 新增 `onUpdateTitle` prop、`editingTitle` / `titleDraft` state、`startEditTitle` / `commitTitle`；标题从纯 `<span>` 改为「span 点击进入 input，Enter / blur 保存，Escape 取消」。
  - `src/components/TodoList/TodoList.tsx` — `TodoListProps` 与解构新增 `onUpdateTitle`，两个 `TodoItem` 渲染点（当前列表 + 归档）都透传。
  - `src/App.tsx` — `TodoList` 传 `onUpdateTitle={todosHook.updateTodoTitle}`。
  - `src/index.css` — `.todo-card-title` 去掉 `-webkit-line-clamp: 2` 截断，改为完整换行（`word-break: break-word`）+ `cursor: text`；新增 `.todo-card-title-input` 编辑态样式（`flex: 1; min-width: 0`）。
- **接口 / 数据模型变化**：`UseTodosReturn` 新增 `updateTodoTitle: (id: string, title: string) => void`；`TodoListProps` / `TodoItemProps` 新增 `onUpdateTitle`。
- **关键实现细节 / 注意事项**：
  - `commitTitle`：trim 后空标题不保存；`trimmed !== todo.title` 才调 `onUpdateTitle`。
  - Escape 取消：先 `setTitleDraft(todo.title)` 再 `setEditingTitle(false)`，保证 input 卸载触发的 blur 里 `trimmed === todo.title`，不会误保存。
  - `startEditTitle` 里 `e.stopPropagation()` 防止点击标题时触发卡片 `onSelect`（选中切换）。
  - `updateTodoTitle` 带 `t.title !== title` 守卫，Enter 后 blur 的二次提交幂等。
  - 标题完整显示后卡片高度随内容增长，窄屏 grid 布局不受影响。
- **验证方式**：`npm run build`（`tsc -b && vite build` 通过）、`npm run test:logic`（35/35 通过）、`npm run lint` 通过。手测：点击任务名 → 输入框 → 改内容 → Enter / 点别处保存；Escape 取消；长标题完整换行无省略号。
- **后续待办 / 已知问题**：无新增。

---

## 2026-08-17 — 删除「跳过整轮」按钮，保留「结束本轮结算重置」

### 给人看（Human Summary）
- **改了什么**：删除计时器组次圆点右侧的「跳过整轮」按钮（快进图标），只保留「结束并记录本轮（结算重置）」按钮；同时移除对应的跳过整轮逻辑。
- **为什么**：「跳过整轮」和「结束本轮结算重置」功能重叠，一个结算入口就够了，少一个按钮更清爽。
- **影响范围**：计时器页面的组次指示区；跳过整轮功能被移除。

### 给 AI 看（Technical Details）
- **涉及文件**：
  - `src/App.tsx` — 删除 `.cycle-dots` 内的 `.cycle-skip-btn` 按钮（`FastForward` 图标 + `timer.skipRound()` 调用），删除 `import { FastForward } from 'lucide-react'`。
  - `src/hooks/useTimer.ts` — 删除 `TimerApi.skipRound` 类型、`skipRound` useCallback 实现、返回对象里的 `skipRound` 字段。
  - `src/index.css` — 删除 `.cycle-skip-btn` 与 `.cycle-skip-btn:hover` 规则，删除 `:root:not([data-theme="tomato"]) .cycle-skip-btn,` 选择器。
  - `test/timerInteractions.test.ts` — `cycle-skip-btn` / `timer.skipRound()` / `跳过并结算整轮` / `const skipRound = useCallback` 等断言由 `assert.match` 改为 `assert.doesNotMatch`，删除两处 skipRound 专属断言。
- **接口 / 数据模型变化**：`TimerApi` 移除 `skipRound: () => void`。
- **关键实现细节 / 注意事项**：
  - `endNow`（结束并记录本轮）保留，作为唯一「结算」入口；`skip`（跳过当前阶段，仅函数保留、UI 早已移除）与 `skipAssignments`（跳过分配）未改动。
  - `playCycleComplete` 音效仍在 `completeOne` / `skip` 的长休息分支使用，import 未删。
  - `cycleCountRef.current = 0` / `setCycleCount(0)` 仍存在于 reset / endNow 等路径，相关测试断言继续通过。
- **验证方式**：`npm run build`（`tsc -b && vite build` 通过）、`npm run test:logic`（35/35 通过）、`npm run lint` 通过。
- **后续待办 / 已知问题**：无新增。

---

## 2026-08-17 — 窄屏任务卡操作按钮移到第二行

### 给人看（Human Summary）
- **改了什么**：很窄的手机屏（≤480px）下，任务卡片里的操作按钮（播放、子任务、重复、删除）从标题右侧移到第二行，和时间/番茄数排在同一行（时间靠左、按钮靠右）；标题独占第一行剩余宽度。
- **为什么**：极窄屏下第一行仍塞着「状态点 + 标题 + 最多四个按钮」，按钮挤占标题空间，长标题还是看不清。
- **影响范围**：手机窄屏（≤480px）任务清单卡片布局。

### 给 AI 看（Technical Details）
- **涉及文件**：
  - `src/index.css` — `@media (max-width: 480px)` 内 `.todo-card-row` 的 `grid-template-areas` 由 `"status body actions" / ". meta meta"` 改为 `"status body body" / ". meta actions"`；`.todo-card-meta` 加 `justify-self: start`，`.todo-card-actions` 加 `justify-self: end`。
- **接口 / 数据模型变化**：无。
- **关键实现细节 / 注意事项**：
  - 第一行 `body` 横跨第二、三列（`"status body body"`），按钮移走后标题占满剩余宽度，不再被按钮列挤压。
  - 第二行 `meta` 落在第二列（`minmax(0,1fr)`）靠左、`actions` 落在第三列（`auto`）靠右，两端对齐、中间留白，复用原有 `row-gap: 4px` 的两行间距。
  - grid 列定义 `36px minmax(0,1fr) auto` 未改动，仅重排区域（`grid-area` 映射不变，只改 `grid-template-areas` 的摆放）。
  - `todo-card-actions` 始终至少有「重复 + 删除」两个按钮，第二行右侧不会为空。
- **验证方式**：`npm run build`（`tsc -b && vite build` 通过）、`npm run lint` 通过。手测：DevTools 切 ≤480px 视口，确认操作按钮落到第二行、时间/番茄数靠左、按钮靠右、标题独占第一行、无重叠。
- **后续待办 / 已知问题**：无新增。

---

## 2026-08-17 — 修复 updater 内副作用反模式 + App 跨零点「今天」日期滞后

### 给人看（Human Summary）
- **改了什么**：修复两处此前在 CHANGELOG「已知问题」中记录的隐患：① 计时器结束/跳过/结束本轮/长休息结算时，曾在 React state updater 内部调用其它 setState，开发模式 StrictMode 下会导致番茄数双倍累加；② App 常驻跨零点时「今天」这个日期可能滞后，导致今日统计与日期结算用到过期的旧日期。
- **为什么**：updater 内的副作用违反 React「state updater 须为纯函数」约定，StrictMode 会二次调用 updater 重复执行；跨零点后「今天」若不刷新，今天的番茄记录会错配到旧日期。
- **影响范围**：计时结束（含长休息完成）、跳过、结束本轮时的番茄计数与待分配结算；跨天时 App 的今日日期及依赖它的统计。

### 给 AI 看（Technical Details）
- **涉及文件**：
  - `src/hooks/useTimer.ts` — 四处副作用移出 setState updater，全部改读 `pendingAssignRef.current` 取最新值、在 updater 外执行副作用：
    1. `completeOne` 的长休息完成分支：原 `setPendingAssignments(prev => { ...setGroupPhase / setTimeout(showToast)... })` → 先算 `totalMinutes = pendingAssignRef.current.reduce(...)`，updater 外 `setGroupPhase('settle')` 或 `showToast('一轮完成！无记录')`。
    2. `endNow`：原 updater 内 `setTotalPomodoros/setCycleCount/recordPomodoro/setGroupPhase/setPendingAssignments/showToast` 全部移出，读 `prevPending = pendingAssignRef.current`，按 `task?.id` 分支决定是否 `setPendingAssignments([...prevPending, assignment])`。
    3. `skip` 的长休息分支：同第 1 处。
    4. `skipRound`：原 `let next = prev` + updater 内 `recordPomodoro/setTotalPomodoros/setGroupPhase/setTimeout(showToast)` → 读 `prevPending`，updater 外执行全部副作用后 `setPendingAssignments(next)` + `setGroupPhase(next.length > 0 ? 'settle' : 'working')` + `showToast(message)`。
  - `src/App.tsx` — `const today = formatDate(new Date())` 改为 `useState(() => formatDate(new Date()))` + 每 30s 与 `visibilitychange` 时 `setToday(prev => next === prev ? prev : next)` 的 tick effect。
  - `AGENTS.md` — 「关键约定」中 updater 反模式条目更新为「已于 2026-08-17 修复」，说明修复方式（读 `pendingAssignRef.current`、副作用移出 updater）。
- **接口 / 数据模型变化**：无（纯行为重构，无函数签名 / 数据结构变化）。
- **关键实现细节 / 注意事项**：
  - `endNow` 有任务分支原 `return prev` 不动 pending，重构后该分支不再调用 `setPendingAssignments`，等价。
  - 长休息完成 / 长休息跳过分支原「无记录时 `return []` 清空 pending」在重构后不再显式清空：pending 的 `duration` 恒 `Math.max(1, elapsed)` ≥ 1，`totalMinutes === 0` 等价于空数组，清空是 no-op，行为不变。
  - `skipRound` 原 `setTimeout(..., 0)` 是为了规避「在 updater 内同步调用 showToast」的手段，移出 updater 后改为同步 `showToast`。
  - `setPendingAssignments(prev => [...prev, assignment])`（`completeOne` 自然结束路径）与两处 `setTodayPomodoros(prev => ...)`（`recordPomodoro`、日期结算）均为纯 updater，本次未改动。
  - `today` tick 用 `next === prev ? prev : next` 返回原引用，日期不变时不触发多余渲染。
- **验证方式**：`npm run build`（`tsc -b && vite build` 通过）、`npm run test:logic`（35/35 通过）、`npm run lint` 全部通过。
- **后续待办 / 已知问题**：无新增。此前「跨天结算只覆盖 `useTimer` 的 `todayPomodoros`、`App.tsx` 的 `today` 可能滞后」的问题，已由本次 `today` tick 一并解决。

---

## 2026-08-17 — 计时器「跳过」改「增加组数」+ 组次圆点修复 + 跨天结算 + 板块占比时间切换

### 给人看（Human Summary）
- **改了什么**：
  1. 计时器控制栏删除了「跳过当前阶段」按钮，换成「增加组数」按钮（点一下本轮周期多一组、组次圆点相应多一个）。
  2. 组次小圆点改成「未完成=空心圈、已完成=实心」，尺寸统一，不再有实心点被放大导致的底色错位感。
  3. 跨天（过零点或次日打开 App）时自动把昨天的番茄记录结算归档，今日从零开始；未完成的组次顺延到今天。
  4. 统计页「板块占比」新增「今天 / 近七天 / 近一个月」三个时间范围切换。
- **为什么**：跳过按钮和「结束并记录本轮」功能重叠；圆点空心/实心区分不清；跨天后昨天的记录会混进今天；板块占比之前只能跟着顶部周/月切换、看不了当天分布。
- **影响范围**：计时器控制栏、组次指示圆点、跨天数据结算、统计页板块占比图表。

### 给 AI 看（Technical Details）
- **涉及文件**：
  - `src/components/Timer/TimerControls.tsx` — 图标 `SkipForward`→`Plus`，`onSkip` prop 换成 `onAddGroup`。
  - `src/App.tsx` — 新增 `handleAddGroup`（`setSettings(s => normalizeSettings({ ...s, longBreakInterval: s.longBreakInterval + 1 }))`）；`TimerControls` 改传 `onAddGroup={handleAddGroup}` 取代 `onSkip={timer.skip}`。
  - `src/i18n/LanguageContext.tsx` — 新增 `addGroup`（增加组数 / Add group）、`today`（今天 / Today）两个 key。
  - `src/index.css` — `.cycle-dot` 改为 `background: transparent; border: 1.5px solid var(--border); box-sizing: border-box`；`.cycle-dot.filled` 改为 `background: var(--accent); border-color: transparent`（去掉 `transform: scale(1.2)`）；≤480px 内为 `.pie-chart-header .stats-period-toggle` / `.period-btn` 补 `width:100%` / `flex:1` 规则。
  - `src/hooks/useTimer.ts` — `cycleCount` 初始值改为从 `todotime_today_cycle` 读取（同日才恢复，并 clamp 到 `longBreakInterval`）；新增 `cycleCount` 持久化 effect；新增日期切换结算 effect（每 30s + visibilitychange 时把 `todayPomodoros` 过滤为当日记录）。
  - `src/components/Stats/StatsOverview.tsx` — 新增 `PiePeriod` 类型与 `piePeriod` state；`dayData = computePeriodData(dayDataMap, todayPomodoros, 1, today, 0, ...)`；`activePieData` 按 `piePeriod` 取 day/week/month；饼图 header 新增 `.stats-period-toggle`（今天/近七天/近一个月）。
  - `test/timerInteractions.test.ts` — 原 `skipStage` 两条断言改为 `assert.match(controls, /onAddGroup/)` + `assert.doesNotMatch(controls, /onSkip/)`。
- **接口 / 数据模型变化**：
  - 新增 localStorage key `todotime_today_cycle`（存组次进度，供跨天顺延）。
  - `TimerControlsProps`：`onSkip` → `onAddGroup`。
  - i18n 新增 `addGroup`、`today`。
- **关键实现细节 / 注意事项**：
  - 「增加组数」走 `normalizeSettings`，`longBreakInterval` 被 clamp 到 [2,10]，到 10 后点击无效果（不会越界）。
  - 组次圆点：`farmcraft` 主题有 `:root[data-theme="farmcraft"] .cycle-dot.filled { background:#72a84e; box-shadow:... }` 覆盖背景，base 的 `border-color: transparent` 仍生效，互不冲突。
  - 跨天结算只过滤 `todayPomodoros`，**不删除** git 里的昨日数据（昨日记录早已由 `App.tsx` 的 `syncDayData` 按记录自身 `date` 归档）。`cycleCount` 持久化依赖 `todotime_today_date` 同日才恢复，避免跨天后沿用旧组次；结算 effect 在无变化时返回原引用避免无谓 re-render。
  - `useTimer.ts` 的 `skip` 函数保留（仅 UI 按钮移除）；`skipRound`（跳过整轮）与 `TaskAssignModal` 的 `onSkip`（跳过分配）未改动。
- **验证方式**：`npm run build`（`tsc -b && vite build`）、`npm run test:logic`（35/35 通过）、`npm run lint` 全部通过。手测：控制栏三按钮为「结束本轮 / 开始暂停 / 增加组数」，点「+」组次圆点多一个；统计页板块占比可切「今天 / 近七天 / 近一个月」。
- **后续待办 / 已知问题**：沿用 `endNow`/`skipRound` 在 state updater 内调用其它 setState 的已知问题；跨天结算目前只覆盖 `useTimer` 的 `todayPomodoros`，`App.tsx` 的 `today` 变量在 App 常驻跨零点且无数据变化时可能滞后到下一次渲染才更新，建议后续补一个日期 tick 强制刷新。

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
