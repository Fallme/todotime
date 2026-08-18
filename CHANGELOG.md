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

## 2026-08-18 — 「其他」分类改为可编辑的暖色兜底分类，不再灰色

### 给人看（Human Summary）
- **改了什么**：未指定任务的专注记录所归入的「其他」分类，默认颜色从灰色改为暖棕色（`#b08968`）；「其他」被设为系统兜底分类——始终存在于分类列表里、可改名改色，但不能删除（删除按钮禁用）。
- **为什么**：此前未分配专注都归到硬编码的「其他」，一旦该分类被删除或缺失，统计页就会出现一个灰色、无法编辑的「其他」；且默认灰色本身不美观。
- **影响范围**：统计页饼图/柱状图中「其他」的颜色、任务选择器里「无任务（其他）」按钮颜色、添加任务分类面板里「其他」的删除按钮；数据模型与同步逻辑不变。

### 给 AI 看（Technical Details）
- **涉及文件**：
  - `src/types/index.ts` — 新增 `OTHER_CATEGORY_NAME = '其他'`、`OTHER_CATEGORY_COLOR = '#b08968'`；`DEFAULT_CATEGORIES` 中「其他」改为引用常量与暖色；`getCategoryColor` 兜底色由 `#636e72` 改为 `OTHER_CATEGORY_COLOR`。
  - `src/App.tsx` — 新增 `ensureOtherCategory(categories)`（缺失时补上「其他」）；`loadSettings` 与 `handleImport` 的分类赋值走 `ensureOtherCategory`；`handleDeleteCategory` 对 `OTHER_CATEGORY_NAME` 直接 return；4 处硬编码 `'其他'` 改常量；任务选择器「无任务（其他）」按钮与分类兜底色 `#636e72` 改为 `OTHER_CATEGORY_COLOR`。
  - `src/hooks/useTimer.ts` — 未分配专注记录 `category` 的 4 处 `'其他'` 改为 `OTHER_CATEGORY_NAME`（值导入用 `../types/index.ts`）。
  - `src/utils/manualFocus.ts` / `src/utils/backup.ts` — 兜底分类 `'其他'` 改为常量（值导入用 `../types/index.ts`）。
  - `src/components/Timer/ManualFocusModal.tsx`、`src/components/Timer/TaskAssignModal.tsx`、`src/components/Stats/StatsOverview.tsx`、`src/components/TodoList/AddTodo.tsx` — 兜底分类 `'其他'` / `t('other')` 改为 `OTHER_CATEGORY_NAME`；AddTodo 的「其他」删除按钮 `disabled`、`title` 用新 i18n `keepOtherCategory`；分类徽章兜底色改为 `OTHER_CATEGORY_COLOR`。
  - `src/i18n/LanguageContext.tsx` — 新增 `keepOtherCategory`（zh「「其他」用于未分配任务的专注，不可删除」/ en「“Other” is used for unassigned focus and cannot be deleted」）。
- **接口 / 数据模型变化**：`Category` / `CategoryItem` 结构不变；新增导出常量 `OTHER_CATEGORY_NAME` / `OTHER_CATEGORY_COLOR`；存储与同步无 schema 变化。
- **关键实现细节 / 注意事项**：
  - Node ESM 测试运行器不支持目录导入 `from '../types'`（报 `ERR_UNSUPPORTED_DIR_IMPORT`），值导入必须写 `from '../types/index.ts'`；`import type` 会被擦除、不受影响。因此 `manualFocus.ts` / `useTimer.ts` / `backup.ts` 的值导入均带 `index.ts` 后缀。
  - 「其他」仍可改名：改名后本会话内未分配专注会短暂落回旧名「其他」，下次加载 `ensureOtherCategory` 会重新补回「其他」；如需彻底跟随改名，需给分类加稳定 id（暂不做）。
  - 删除保护在两层：`handleDeleteCategory`（App 层守卫）+ AddTodo 删除按钮 `disabled`，双保险防止「其他」被删后统计页出现灰色幻影分类。
  - `getCategoryColor` 兜底色改为暖色后，任何不在分类列表里的历史分类（如改名前的旧名）会显示暖棕而非灰，视觉更协调。
- **验证方式**：`npm run build`（`tsc -b && vite build` 通过）、`npm run test:logic`（35/35 通过）、`npm run lint` 通过。手测：统计页未分配专注的「其他」显示暖棕；添加任务分类面板里「其他」的 × 为禁用态、可点 ✎ 改名改色；删除其他分类不受影响。
- **后续待办 / 已知问题**：如需支持「其他」改名后未分配专注也跟随，需为分类引入稳定 id 并改造所有 `category` 字符串引用（涉及存储/同步迁移，暂不实施）。

---

## 2026-08-18 — 统计柱状图配色改为跟随主题

### 给人看（Human Summary）
- **改了什么**：统计页的柱状走势图、以及周报/月报弹窗里的组合柱状图，三根柱子（专注时长 / 番茄 / 完成任务）的颜色不再写死为固定的蓝灰/陶土橙/草绿，而是根据当前主题的强调色动态生成——不同主题下柱子颜色不同，同时保持「时长 / 番茄 / 任务」三种语义仍可区分。
- **为什么**：此前柱状图用固定 hex 色，切换主题后图表颜色不变，和整体主题不协调。
- **影响范围**：统计页「今天 / 近七天 / 近一个月」走势图、周报/月报弹窗的组合柱状图及其 y 轴刻度颜色；饼图（按分类取色）与数据模型不变。

### 给 AI 看（Technical Details）
- **涉及文件**：
  - `src/components/Stats/StatsOverview.tsx` — 新增模块级颜色工具：`type RGB = [number, number, number]`、`hexToRgb(hex)`、`mixRgb(a, b, t)`、`rgba(c, alpha)`、`readCssColor(prop, fallback)`；组件内读取主题变量 `--accent` / `--accent-light`（fallback `#FF6B6B` / `#FFA07A`），派生 `durationColor`（`mixRgb(hexToRgb(accentLight), hexToRgb('#5b8c9e'), 0.45)`）、`pomodoroColor`（`mixRgb(hexToRgb(accent), hexToRgb('#d2704a'), 0.3)`）、`tasksColor`（`mixRgb(hexToRgb(accentLight), hexToRgb('#6f9e6b'), 0.5)`）；`trendData` / `trendOptions` / `combinedBarData` / `combinedBarOpts` 中所有写死的 hex 值替换为 `rgba(...)` 动态色。
- **接口 / 数据模型变化**：无（仅渲染期颜色派生；`StatsOverviewProps`、存储、同步均不变）。
- **关键实现细节 / 注意事项**：
  - Chart.js 渲染到 canvas，`var(--x)` CSS 字符串无法被消费，必须在 JS 里 `getComputedStyle(document.documentElement).getPropertyValue('--accent')` 解析成具体 `rgba()` 字符串。
  - 主题由 `App.tsx` 的 `useEffect` 设置到 `document.documentElement.dataset.theme`；统计页仅在切到设置页时才卸载，因此渲染期读取即可；`readCssColor` 校验结果必须是 hex（3/6 位）才采用，否则回落 fallback，防止拿到空串或 `hsl(...)` 等导致 `hexToRgb` 解析失败。
  - 三色保留语义区分：时长偏蓝灰、番茄偏暖橙红、任务偏绿，但各自按主题强调色做不同程度的混合偏移，保证不同主题整体观感不同。
  - 透明度沿用原固定色语义：分钟柱描边 0.6 / 填充 0.33；番茄、任务描边实色 / 填充 0.6；报告组合柱填充 0.67；y 轴刻度与标题实色。
- **验证方式**：`npm run build`（`tsc -b && vite build` 通过）、`npm run test:logic`（35/35 通过）、`npm run lint` 通过。手测：设置页切换不同主题 → 回统计页，柱状图与周报/月报柱状图三根柱子颜色随主题变化，且三者仍可区分。
- **后续待办 / 已知问题**：`--accent-light` 未注册为 `@property`，`getComputedStyle` 返回的就是 CSS 中定义的原始值（hex），当前各主题均为 hex，无需额外处理；若未来有主题改用 `hsl()` 或 `color-mix()`，`readCssColor` 会回落默认值，届时需扩展解析。

---

## 2026-08-18 — 修复已有类别无法编辑名称/颜色（改为铅笔按钮编辑）

### 给人看（Human Summary）
- **改了什么**：添加任务时打开分类选择，每个已有分类标签旁新增一个 ✎ 铅笔按钮（左上角，悬停显示），点击即可编辑该分类的名称和颜色；不再依赖「双击」。
- **为什么**：原来编辑靠「双击标签」，但单击会立即选中分类并关闭选择面板，双击永远无法触发，等于「点不了」。
- **影响范围**：添加任务表单里的分类选择面板（编辑名称/颜色入口）；选择、删除逻辑不变。

### 给 AI 看（Technical Details）
- **涉及文件**：
  - `src/components/TodoList/AddTodo.tsx` — lucide 导入加 `Pencil`；`category-chip` 按钮移除 `onDoubleClick`（原 `startEdit` 入口），在 `category-chip-wrap` 内、`category-chip-del` 之前新增 `category-chip-edit` 按钮（`Pencil` 图标，`onClick` 调 `startEdit(cat)`，`title={t('editCategory')}`）。
  - `src/i18n/LanguageContext.tsx` — 新增 key `editCategory`（zh「编辑分类」/ en「Edit category」）；`editCategoryHint` 文案由「双击标签可编辑名称和颜色」改为「点击标签旁的 ✎ 编辑名称和颜色，× 删除」（en 同步）。
  - `src/index.css` — 新增 `.category-chip-edit`（左上角 16px 圆形、accent 底色、hover 显示，与 `.category-chip-del` 对称）；加入非 tomato 主题的 `border-radius` 覆盖选择器列表，与删除按钮视觉一致。
- **接口 / 数据模型变化**：无（`onRenameCategory`/`onDeleteCategory` 等 props 不变；仅 UI 入口与 i18n 文案）。
- **关键实现细节 / 注意事项**：
  - 根因：`onClick`（`setCategory + setShowCatPicker(false)`）与 `onDoubleClick`（`startEdit`）互斥——第一次单击就把面板关了，第二次点击落到别处，双击事件不触发。
  - 修复采用显式铅笔按钮而非「区分单击/双击延迟」，更可靠、可发现；`startEdit` 会把 `showCatAdd` 关掉并填充 `editName/editColor`，逻辑复用不变。
  - 铅笔与删除按钮都 `position: absolute` 贴角、`opacity: 0` 默认、`.category-chip-wrap:hover` 时显示，避免常驻两个角标造成拥挤。
- **验证方式**：`npm run build`（`tsc -b && vite build` 通过）、`npm run test:logic`（35/35 通过）、`npm run lint` 通过。手测：添加任务 → 点分类标签 → 悬停某分类出现 ✎ 与 × → 点 ✎ 进入编辑面板可改名/改色并保存，点 × 删除正常。
- **后续待办 / 已知问题**：无新增。

---

## 2026-08-18 — 统计页「今天」走势图改为按一天内 4 小时时段统计

### 给人看（Human Summary）
- **改了什么**：统计页选「今天」时，柱状走势图不再只显示一根「今日」柱子，而是把一天拆成 6 个 4 小时时段（00-03 / 04-07 / 08-11 / 12-15 / 16-19 / 20-23），按时段展示专注时长、番茄数、完成任务数。
- **为什么**：单看「今天」只有一根柱子，看不出一天内的时间分布；按时段记录能看清精力集中在哪个时段。
- **影响范围**：统计页「今天」视图的走势柱状图；近七天 / 近一个月视图不变。

### 给 AI 看（Technical Details）
- **涉及文件**：
  - `src/components/Stats/StatsOverview.tsx` — 新增模块级 `DAY_SLOT_HOURS = [0,4,8,12,16,20]`、`getHour(iso)`、`slotOf(hour)`（`Math.floor(hour/4)`）、`computeTodaySlots(records, todos, today, runningMinutes)`；新增 `todayRecords` useMemo（合并去重 `dayDataMap` 今日已完成记录 + `todayPomodoros`，键为 `id || start|end`）与 `daySlots` useMemo；新增 `trendPoints`（`period === 'day'` 时用 `daySlots` 的 `label/minutes/pomodoros/tasksDone`，否则用 `activeData.daily` 的 `date.slice(5)/date/...`）；`trendData` 的 labels 与三个 dataset 的 data 全部改为从 `trendPoints` 取值；tooltip `title` 回调改用 `trendPoints[idx].title`（今天显示时段名，周/月仍显示完整日期）。
- **接口 / 数据模型变化**：无（纯渲染期派生，不改变 `PeriodResult` / 存储 / 同步）。
- **关键实现细节 / 注意事项**：
  - 时段按 `start` 时间（番茄记录）与 `completedAt` 时间（完成任务记录）的本地小时数分桶；`runningMinutes`（进行中的实时时长）计入当前小时所在时段。
  - 番茄数仍走 `isPomodoroRecord`（≥15min）口径，与汇总卡、饼图一致；时段 `minutes` 是 `duration` 之和（<15min 也计入），与既有时长口径一致。
  - 6 个时段标签为语言中性的 `00-03` 等，`maxTicksLimit`（非 month 为 7）能完整显示 6 个刻度。
- **验证方式**：`npm run build`（`tsc -b && vite build` 通过）、`npm run test:logic`（35/35 通过）、`npm run lint` 通过。手测：统计页默认「今天」，走势图 x 轴显示 00-03…20-23 六个时段，各时段柱子随今日番茄/任务变化；切到近七天/近一个月仍是按天。
- **后续待办 / 已知问题**：时段粒度固定 4 小时；如需更细可按小时，或做成可切换（暂不实现）。

---

## 2026-08-18 — 修复每月刷新周期的 31 天选择面板被弹窗裁切

### 给人看（Human Summary）
- **改了什么**：设置任务「每月」刷新周期时，31 天的日期选择面板不再被弹窗底部裁切，全部天数都能完整显示；面板改为在弹窗内直接展开。
- **为什么**：之前 31 天面板用绝对定位浮在触发按钮下方，被刷新周期弹窗的滚动容器裁掉下半部分，看不到后面的日期。
- **影响范围**：添加任务弹窗里的「每月」日期选择；任务卡片上原有的内联月份选择（compact）不受影响。

### 给 AI 看（Technical Details）
- **涉及文件**：
  - `src/index.css` — 新增两条规则：`.recurrence-modal-detail .monthly-calendar { flex: 1 0 100%; }`（让日历容器在弹窗详情行内占满整行）与 `.recurrence-modal-detail .monthly-calendar-popover { position: static; margin-top: 6px; width: 100%; box-shadow: none; }`（把绝对定位的浮层改为文档流内联展开，随弹窗 `max-height: 80vh; overflow-y: auto` 自然滚动，不再被裁切）。
- **接口 / 数据模型变化**：无（仅 CSS；`MonthlyRecurrenceCalendar` 组件与 `TaskRecurrence` 模型不变）。
- **关键实现细节 / 注意事项**：
  - 裁切根因：`.modal-content` 有 `overflow-y: auto`，而 `.monthly-calendar-popover` 原本 `position: absolute; top: calc(100% + 6px); right: 0` 向下展开，超出弹窗可视区被裁掉。
  - 只对 `.recurrence-modal-detail` 内的日历做内联化（即 AddTodo 弹窗场景）；TodoItem 的 compact 用法在 `.todo-recurrence-picker` 内，`.todo-card` 为 `overflow: visible`，浮层正常，故保留绝对定位行为不变。
  - 内联化后 `width: 100%` 依赖 `.monthly-calendar` 先 `flex: 1 0 100%` 撑满整行，避免百分比宽度因父容器内容自适应而塌缩。
- **验证方式**：`npm run build`（`tsc -b && vite build` 通过）、`npm run test:logic`（35/35 通过）、`npm run lint` 通过。手测：添加任务 → 点重复按钮 → 选「每月」→ 31 天网格完整显示、可多选、可滚动查看。
- **后续待办 / 已知问题**：无新增。

---

## 2026-08-18 — 统计页改为「时间范围切换 + 汇总 + 饼图 + 走势」的单一布局

### 给人看（Human Summary）
- **改了什么**：统计页重新布局——顶部一个时间范围切换（今天 / 近七天 / 近一个月，默认「今天」），其下是一行汇总卡（🍅 番茄、时长、完成任务），紧接着就是饼状图（板块占比），再往下是柱状走势图。原来的「今日信息卡」和「一周/一月汇总卡」两套卡片合并为一套，不再重复。柱状图配色改为更自然的蓝灰（时长）、陶土橙（番茄）、草绿（任务）。
- **为什么**：原来顶部「今日卡」和中间「周/月汇总卡」信息重叠，饼图还单独带一套时间切换，页面显得啰嗦；统一一个时间切换驱动所有卡片/图表更清晰，配色也更柔和耐看。
- **影响范围**：统计页布局、时间范围切换、柱状图颜色；周报/月报弹窗功能与数据模型不变。

### 给 AI 看（Technical Details）
- **涉及文件**：
  - `src/components/Stats/StatsOverview.tsx` — `Period` 类型由 `'week' | 'month'` 扩为 `'day' | 'week' | 'month'`；删除 `PiePeriod` 类型与 `piePeriod` state；`period` 默认值由 `'week'` 改为 `'day'`；删除独立 `todayData` useMemo（汇总数据统一走 `computePeriodData` 的 `dayData`）；`activeData` 改为 `period === 'day' ? dayData : period === 'week' ? weekData : monthData`；`activePieData` 删除、饼图改用 `activeData`；删除 `stats-aggregate-card` 汇总卡 JSX 与 `activeDays` 派生变量；新增 `periodLabel` 与单日 `dateRange` 处理；JSX 顶部改为「toolbar(今天/近七天/近一个月 + 周报月报按钮) → stats-top-row 汇总卡(总番茄/总时长/完成任务) → 饼图卡 → 走势图卡」。柱状图配色：时长 `#6c5ce7→#5b8c9e`、番茄 `#FF6B6B→#d2704a`、任务 `#27ae60→#6f9e6b`，同步更新 `trendOptions`/`combinedBarOpts` 的 y 轴刻度色与 `combinedBarData` 背景色。
  - `src/index.css` — 未改动（`stats-top-row`、`stats-card-full`、`pie-layout`、`stats-period-toggle`、`metric-btn` 等复用既有样式；`.stats-aggregate-card`/`.agg-*` 成为死 CSS，暂保留未删）。
- **接口 / 数据模型变化**：无导出接口变化；`StatsOverviewProps` 不变；存储与同步无变化。
- **关键实现细节 / 注意事项**：
  - 单个 `period` state 同时驱动汇总卡、饼图、走势图；「今天」时 `activeData = dayData`（`computePeriodData(count=1)` 已含 `runningMinutes` 实时时长与 `todayPomodoros` 合并去重，与旧 `todayData` 口径一致）。
  - 汇总卡文案由「今日番茄/今日时长/今日完成」改为中性的「番茄/时长/完成任务」，避免切到周/月时语义错误；`t('today')`、`t('lastSevenDays')`、`t('lastMonth')` 均为既有 key。
  - 单日 `dateRange` 显示完整日期（如 `2026-08-18`），周/月显示 `MM-DD ~ MM-DD`，避免「08-18 ~ 08-18」。
  - 删除 `Calendar`（lucide）导入（原 activeDays 用）；`activeDays` 在报告弹窗 IIFE 内仍有局部变量，保留。
  - 源级测试 `test/timerInteractions.test.ts` 仍通过（未引入 `type: 'line'`）。
  - 遗留死 CSS：`.stats-aggregate-card` / `.agg-item` / `.agg-val` / `.agg-label` 及主题 override 选择器中的对应引用已无 JSX 使用，可后续清理。
- **验证方式**：`npm run build`（`tsc -b && vite build` 通过）、`npm run test:logic`（35/35 通过）、`npm run lint` 通过。手测：统计页默认「今天」；切换近七天/近一个月后汇总卡、饼图、走势图同步变化；柱状图三色为蓝灰/陶土橙/草绿。
- **后续待办 / 已知问题**：可清理 `.stats-aggregate-card` 等死 CSS；「今天」走势图只有一根柱，如需更丰富可考虑按小时聚合（暂不实现）。

---

## 2026-08-18 — 添加任务的刷新周期改为「加号前的按钮 + 弹窗」设置

### 给人看（Human Summary）
- **改了什么**：添加任务输入行里，刷新周期不再另起一行用下拉框设置；改为在「+」加号按钮前放一个「🔁 重复」按钮，点击后弹出弹窗，在弹窗里选择刷新周期（不自动刷新 / 每日 / 隔日 / 隔二日 / 每周 / 每月），每周/每月可继续在弹窗内展开选择具体日期。
- **为什么**：原来的下拉框单独占一行，让添加任务区域显得臃肿；收进一个按钮 + 弹窗后，添加行更简洁，与项目其他弹窗（如主题、设置）交互一致。
- **影响范围**：添加任务表单（TodoList 顶部输入行）与刷新周期设置方式；不影响任务数据模型与刷新逻辑。

### 给 AI 看（Technical Details）
- **涉及文件**：
  - `src/components/TodoList/AddTodo.tsx` — 删除内联 `.add-todo-recurrence` 下拉框及每周/每月内联详情块；新增 `showRecurrenceModal` state、`recurrenceOptions`（`TaskRecurrenceKind` + 中英文 label 数组）；`changeRecurrenceKind(kind: TaskRecurrenceKind)` 签名改为接收 kind（weekly→`buildWeeklyRecurrence([1])`、monthly→`buildMonthlyRecurrence(1)` 的默认构造逻辑保持不变）；主输入行在「+」前新增 `.add-todo-repeat-btn`（`Repeat2` 图标，激活态显示 `active` class，`title` 用 `getTaskRecurrenceLabel`）；新增 `.modal-overlay > .recurrence-modal` 弹窗，内含 `recurrence-modal-options`（6 个选项按钮）、weekly 的 `weekday-selector`、monthly 的 `MonthlyRecurrenceCalendar`，底部「完成」按钮关闭弹窗。
  - `src/index.css` — 删除 `.add-todo-recurrence` / `.recurrence-detail` 相关规则；新增 `.add-todo-repeat-btn`（40px 方形、hover/active 高亮）、`.recurrence-modal`、`.recurrence-modal-options`（flex-wrap 选项按钮）、`.recurrence-modal-detail`（含 `.weekday-selector` 小按钮）；并在主题 `border-radius` 覆盖选择器列表中加入 `.add-todo-repeat-btn`、`.recurrence-modal-options button`。
  - `test/taskRecurrence.test.ts` — 源级断言由 `/value="everyTwoDays"/`（旧 `<select><option>`）更新为 `/'everyTwoDays'/` + `/recurrence-modal-options/`（新 `recurrenceOptions` 数组 + 弹窗 class）。
- **接口 / 数据模型变化**：`TaskRecurrence` / `TaskRecurrenceKind` 字符串值不变；`changeRecurrenceKind` 入参类型由隐式改为显式 `TaskRecurrenceKind`（内部函数，非导出接口）。存储与同步无变化。
- **关键实现细节 / 注意事项**：
  - 弹窗遵循既有模态范式：`.modal-overlay` 点击关闭、`.modal-content` `stopPropagation`；`recurrence` state 在弹窗打开期间即可实时变更，点「完成」仅关闭弹窗（无单独确认逻辑）。
  - `toggleWeekday` 保持「至少保留一个工作日」约束（最后一个选中项不可取消），与旧内联行为一致。
  - 加号按钮（`add-todo-btn`）与重复按钮均为 `type="button"`/`type="submit"` 分离，避免弹窗按钮误触发表单提交。
  - 源级回归测试依赖组件源码字符串，JSX 结构调整时须同步更新断言（本次已同步）。
- **验证方式**：`npm run build`（`tsc -b && vite build` 通过）、`npm run test:logic`（35/35 通过）、`npm run lint` 通过。手测：添加行「+」前出现重复按钮；点击弹出弹窗，选择每周后出现星期选择、选择每月后出现月历；选「不自动刷新」则按钮恢复默认态。
- **后续待办 / 已知问题**：无新增。

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
