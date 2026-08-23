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

## 2026-08-23 — 固定循环日期位置并精简累计时长

### 给人看（Human Summary）
- **改了什么**：任务卡的循环日期固定在任务名称同一行右侧，即使屏幕很窄也不会单独占一行；累计专注时长改为 `5.4h` 这样的一位小数小时格式，并在手机窄屏下直接隐藏。
- **为什么**：循环日期另起一行会拉高任务卡并打乱信息层级，“累计 5小时26分”也会占用过多横向空间，容易和其他信息及操作按钮拥挤。
- **影响范围**：任务清单主任务卡的标题、循环日期和累计时长显示；计时、番茄统计、循环规则和存储数据均不变。

### 给 AI 看（Technical Details）
- **涉及文件**：
  - `src/components/TodoList/TodoItem.tsx` — 将 `.todo-recurrence-tag` 移入 `.todo-card-heading`，标签文本保留完整 `title`；累计时长改为 `(totalFocus / 60).toFixed(1) + 'h'`，移除“累计 / Total”前缀。
  - `src/index.css` — 标题区改为“分类 / 标题 / 循环日期”三列网格，手机端两侧轨道分别以 28% / 36% 为上限，循环日期右对齐且禁止换行，过长时省略；≤350px 时分类独占上方、名称与循环日期保持下方同一行；`@media (max-width: 480px)` 隐藏 `.todo-card-focus`。
  - `test/mobileLayout.test.ts` — 锁定循环标签的 DOM 归属、同行三列布局、右对齐/不换行、小时格式及手机隐藏规则。
  - `docs/FEATURES.md`、`docs/TEST_REPORT.md` — 同步产品行为和回归结果。
- **接口 / 数据模型变化**：无。只调整渲染结构、展示格式与响应式样式，不修改累计分钟的计算口径或存储结构。
- **关键实现细节 / 注意事项**：小时数使用已取整的累计分钟除以 60 后保留一位小数；手机三列使用 `fit-content()` 约束轨道本身，避免只裁切标签、却仍让不可见文字占据网格宽度。极窄屏把分类拆到上方以给任务名称保留宽度，仅裁切循环标签的可视文本，完整内容仍可通过 `title` 获取，标签本身不会换到新行。
- **验证方式**：`npm test`（逻辑测试 40/40、ESLint、前端生产构建、API 类型检查）；`git diff --check`。
- **后续待办 / 已知问题**：无。

## 2026-08-23 — 重排手机窄屏任务卡并将主题改名为田园像素风格

### 给人看（Human Summary）
- **改了什么**：手机窄屏下的任务卡改为清晰的分层布局：分类与完整标题、循环标签、时间/番茄/累计时长、操作按钮分别占用稳定区域，可自然换行，不再互相遮挡。任务清单标题、补录入口、统计数字和新增任务栏也会随屏幕宽度合理换行；触屏上的子任务操作按钮始终可见。“星露谷·泰拉像素”主题展示名同时改为“田园像素风格”。
- **为什么**：旧布局在第二行同时放置三项统计和最多五个操作按钮，约 440px 及更窄屏幕的可用宽度不足，导致累计时长、循环、放弃、删除图标重叠；长分类和长标题也会彼此挤压。旧主题名还直接引用了游戏名称，需要改成独立、通用的风格名称。
- **影响范围**：任务清单在手机和窄窗口中的标题栏、新增任务区、主任务卡、子任务行与触屏按钮；设置页主题选择器及 README/宣传文案。桌面端布局、主题内部 ID、已有用户主题设置和主题素材均保持不变。

### 给 AI 看（Technical Details）
- **涉及文件**：
  - `src/components/TodoList/TodoItem.tsx` — 新增 `.todo-card-heading` 和 `.todo-card-tags` 语义容器，把分类/标题与循环/放弃标签分组，保持标题完整换行及编辑能力。
  - `src/components/TodoList/TodoList.tsx` — 用 `.todo-list-title` 包装标题图标与文字，使窄屏标题、补录按钮和统计区域可独立布置。
  - `src/index.css` — `@media (max-width: 480px)` 将任务卡改为两列三行网格（`status/body`、`status/meta`、`actions`），meta 允许换行，actions 独占下一行右对齐并使用 32px 触控按钮；限制长分类宽度，标签单独换行。列表头改为两行 grid，新增任务行改为含 `minmax(0, 1fr)` 的 grid；≤350px 时分类独占首行。子任务标题允许换行，meta 后排，触屏下操作按钮常显并扩大点击区域。
  - `src/components/Settings/SettingsPanel.tsx` — `farmcraft` 用户可见名由“星露谷·泰拉像素 / Farm & Terra Pixels”改为“田园像素风格 / Pastoral Pixel Style”；内部 `ThemeId`、CSS 选择器和 `farmcraft_background.webp` 不变，避免旧设置失效。
  - `test/mobileLayout.test.ts`、`test/themes.test.ts` — 新增移动端 DOM/CSS 分层、极窄新增栏、触屏子任务可见性和主题新名称回归断言。
  - `README.md`、`docs/FEATURES.md`、`docs/PROMOTION.md`、`docs/TEST_REPORT.md` — 同步主题名、窄屏行为和验证记录。
- **接口 / 数据模型变化**：无。`ThemeId` 仍为 `farmcraft`，同步设置和旧数据无需迁移。
- **关键实现细节 / 注意事项**：手机任务卡不再让 `.todo-card-meta` 与 `.todo-card-actions` 争抢同一网格行；所有内容列均使用 `minmax(0, 1fr)` / `min-width: 0`，长标题仍完整显示，不恢复省略或 line clamp。媒体断点为 480px，350px 以下再把新增任务分类拆到首行；`@media (hover: none)` 保证子任务操作不依赖 hover。
- **验证方式**：`npm test`（逻辑测试 40/40、ESLint、前端生产构建、API 类型检查）；浏览器以 442px 视口渲染长中英标题、长分类、每周标签、三项 meta 和五个按钮，卡片 `scrollWidth === clientWidth`，meta 与 actions 边界不相交；`git diff --check`。
- **后续待办 / 已知问题**：无。

## 2026-08-21 — 修正手动补录的多番茄计算与全链路统计

### 给人看（Human Summary）
- **改了什么**：手动补录不再每条记录最多只算 1 个番茄，而是按当前设置的一轮工作时长计算完整轮数；最后不足一轮的剩余时长达到 15 分钟，再补算 1 个番茄。补录弹窗会即时预览数量，任务、今日概览、统计图表、周月报告、同步数据和开发者概况都使用同一结果。
- **为什么**：长时间补录过去无论 25 分钟还是数小时都只增加 1 个番茄，低估了实际专注轮次，也造成任务与统计结果不准确。
- **影响范围**：影响新保存的手动补录及其任务/统计/同步聚合；正常计时仍沿用“单次达到 15 分钟计 1 个”的规则，旧数据继续按原有布尔标记或时长兼容，不会被追溯重算。

### 给 AI 看（Technical Details）
- **涉及文件**：
  - `src/types/index.ts`、`src/utils/pomodoroRules.ts`、`src/utils/manualFocus.ts` — `PomodoroRecord` 新增可选 `pomodoroCount`；新增 `calculateManualPomodoroCount`、`getPomodoroCount`、`sumPomodoroCounts`，补录创建时写入明确数量。
  - `src/components/Timer/ManualFocusModal.tsx`、`src/App.tsx`、`src/hooks/useTimer.ts` — 弹窗接收 `workMinutes` 并预览计数；保存时按数量更新今日值和关联任务。
  - `src/utils/syncMerge.ts`、`src/hooks/useTodos.ts` — 多番茄记录派生稳定的 `recordId#1..N` 计数事件；单番茄仍保留原记录 ID，兼容既有去重；记录相等判断增加内容比较，数量变化会触发同步。
  - `src/services/github.ts`、`src/hooks/useGithubSync.ts`、`src/hooks/useStats.ts`、`src/components/Stats/DailyReport.tsx`、`src/components/Stats/StatsOverview.tsx`、`api/developer.ts` — 今日汇总、云端历史、趋势/分类、报告和开发者概况改为累加记录内番茄数量。
  - `src/utils/backup.ts` — 导入导出保留 `pomodoroCount`，缺失该字段的旧备份继续走旧规则。
  - `test/pomodoroRules.test.ts`、`test/concurrentSync.test.ts`、`test/backup.test.ts`、`test/developerAccess.test.ts`、`README.md`、`docs/FEATURES.md`、`docs/TEST_REPORT.md` — 增加计数、任务去重、备份与服务端汇总回归，并同步产品说明。
- **接口 / 数据模型变化**：`PomodoroRecord.pomodoroCount?: number`；`createManualFocusRecord` 输入新增可选 `workMinutes`（缺省为 25）；`ManualFocusModal` 新增必传 `workMinutes`；同步计数事件允许一条记录映射为多个派生 ID。
- **关键实现细节 / 注意事项**：公式为 `floor(duration / workMinutes) + (duration % workMinutes >= 15 ? 1 : 0)`；显式 `pomodoroCount` 优先于旧 `countsAsPomodoro`，旧记录无新字段时仍按布尔值或 15 分钟时长回退。单番茄沿用原 ID，避免升级后重复增加任务数量；旧补录不会按当前设置重新计算。
- **验证方式**：`npm test`（逻辑测试 39/39、ESLint、前端构建、API 类型检查均通过）；示例：设置 25 分钟时，14→0、15→1、35→1、40→2、50→2、65→3；多番茄补录对关联任务累加相同数量。
- **后续待办 / 已知问题**：无。

## 2026-08-20 — 增加服务端授权的开发者用户概况与反馈面板

### 给人看（Human Summary）
- **改了什么**：指定开发者识别码现在仍可正常使用计时、任务、统计和个人同步，同时在设置页“数据管理”中额外显示“查看用户概况”按钮。点击后可查看匿名用户总数、近 7/30 天活跃人数、累计专注时长、番茄数、任务数、各用户使用概况和最新反馈。
- **为什么**：开发者需要在不接触其他用户识别码的前提下了解产品使用情况、集中查看反馈，并继续把该识别码当作普通个人账号使用。
- **影响范围**：仅服务端验证通过的开发者身份增加查看入口；普通识别码的界面、数据权限和同步逻辑保持不变。所有用户仍按 profileId 独立保存数据，面板只显示截断后的匿名编号。

### 给 AI 看（Technical Details）
- **涉及文件**：
  - `api/developer.ts` — 新增开发者接口；`isDeveloperSyncCode` 使用 SHA-256 哈希和 `timingSafeEqual` 校验身份；`mode=status` 仅返回权限状态，`mode=overview` 通过 GitHub Tree/Blob API 汇总私有数据仓库内最多 250 个 profile 的 `config.json`、`history.json`、`feedback.json`，输出匿名用户指标与最近 500 条反馈。
  - `api/tsconfig.json` — API 类型检查范围由单个 `file.ts` 扩展到全部 `api/*.ts`。
  - `vercel.json` — 在通用 `/api/(.*)` 重写前增加 `/api/developer` 专用路由，避免被转发到文件同步函数。
  - `src/services/github.ts` — 新增 `DeveloperOverview` / `DeveloperUserSummary` / `DeveloperFeedbackSummary` 类型，以及 `checkDeveloperAccess`、`loadDeveloperOverview` 请求函数。
  - `src/components/Settings/SettingsPanel.tsx` — 按当前 `settings.syncCode` 异步确认权限；仅授权身份显示按钮；新增可刷新、响应式的开发者概况与反馈弹窗。权限状态带 syncCode 作用域，切换身份时不会沿用旧权限。
  - `src/index.css` — 新增开发者概况卡片、匿名用户表格、反馈列表、加载/错误状态及移动端双列适配。
  - `test/developerAccess.test.ts` — 覆盖哈希校验、大小写归一化、普通码拒绝、明文不进入服务端源码、前端按钮必须依赖服务端授权，以及 Vercel 路由优先级。
  - `docs/FEATURES.md` — 补充开发者视图功能与隐私边界。
- **接口 / 数据模型变化**：新增只读 `GET /api/developer?mode=status|overview`，凭证继续通过 `X-Sync-Code` 发送；无现有 JSON schema 变化。可用环境变量 `DEVELOPER_SYNC_CODE_HASH` 覆盖内置哈希，前端不包含开发者码或其哈希。
- **关键实现细节 / 注意事项**：开发者自己的 profileId 与普通用户相同，正常走原有 `/api/file` 同步；查看权限只作用于新接口。概况以仓库树枚举 profile，读取并聚合总量，不返回任务标题、用户识别码或私有仓库位置。返回头使用 `private, no-store`；树被截断或用户超过 250 时响应设置 `truncated=true` 并在界面提示。
- **验证方式**：`npm test` 通过（37/37 逻辑测试、ESLint、Vite 构建和 API TypeScript 检查）；额外用实际开发者码调用 `isDeveloperSyncCode` 返回授权成功，普通测试码返回拒绝。手测：用普通识别码进入设置无查看按钮；用开发者识别码进入设置出现“查看用户概况”，打开后可刷新指标和反馈。
- **后续待办 / 已知问题**：本地 Vercel CLI 登录令牌已过期，无法通过 `vercel dev` 完成本地路由端到端请求；提交后需依赖 Git 自动部署，并在正式站点验证 `/api/developer` 路由及数据仓库令牌对 Git Tree/Blob API 的读取权限。

## 2026-08-18 — 修复完成任务数统计不准 + 导出/导入/清除/反馈合并为一栏

### 给人看（Human Summary）
- **改了什么**：
  1. 统计页「完成任务」数修复：同一任务在同一天被完成多次（如 toggle 完成→撤销→再完成）现在只计为 1 个完成任务，不再重复计数；周报/月报的已完成任务列表同样按任务去重。
  2. 设置页将「导出数据」「导入数据」「清除数据」与「提交反馈」合并到同一个「数据管理」卡片中，不再单独占一栏。
- **为什么**：此前完成任务数可能超过总量（因重复完成记录被多次计数）；导出/导入/清除与反馈功能上都属于数据管理，合并更紧凑。
- **影响范围**：统计页所有视图（今天/近七天/近一个月）的任务完成数与周报/月报已完成任务列表；设置页数据管理区域布局。

### 给 AI 看（Technical Details）
- **涉及文件**：
  - `src/components/Stats/StatsOverview.tsx` —
    - `computePeriodData`：`doneToday` 由 `flatMap` 改为 `Map<todo.id, …>` 按任务 ID 去重，`tasksDone = doneTodayMap.size`；`categoryTasks` 遍历改用 `doneTodayMap.values()`。
    - `computeTodaySlots`：移除旧的 `doneToday.flatMap` 循环，改为遍历每个 todo 取其当天 `completionRecords`，按 `todo.id` 去重后只计一次。
    - Report modal `periodTasks`：由 `flatMap` 改为 `Map<todo.id, …>` 按任务去重。
  - `src/components/Settings/SettingsPanel.tsx` — 「反馈」section + 底部 `settings-actions` div 合并为一个 `<section className="settings-section">`，标题 `t('dataManagement')`，内含反馈按钮 + 导入 + 导出 + 清除按钮。
  - `src/i18n/LanguageContext.tsx` — 新增 `dataManagement`（zh: `数据管理`，en: `Data`）。
- **接口 / 数据模型变化**：无。
- **关键实现细节 / 注意事项**：
  - 去重逻辑使用 `Map<todo.id, …>` + `if (!map.has(id)) map.set(…)` 保证每任务每天只计一次完成；选择第一个匹配的 completion record 用于分类统计。
  - `totalTasksDay` 仍用 `Math.max(createdToday, tasksDone)` 兜底，确保完成数始终 ≤ 总数。
  - 设置页 `settings-actions` 样式（`display: flex; flex-wrap: wrap; gap: 8px`）复用于新 section 内的按钮行。
- **验证方式**：`npm run lint` 通过、`npm run build`（`tsc -b && vite build`）通过、`npm run test:logic` 35/35 通过。手测：同一任务完成→撤销→再完成，统计页「完成任务」只 +1；设置页「数据管理」卡片包含反馈/导出/导入/清除四个按钮。
- **后续待办 / 已知问题**：无新增。

### 给人看（Human Summary）
- **改了什么**：
  1. 设置页「反馈」板块精简为标题 + 一个按钮（去掉了提示文字），更紧凑。
  2. 识别码输入框右侧内嵌「显示/隐藏」和「复制」两个小图标按钮，操作更直观；生成码、启用新码、加载已有码等按钮保留在下方。
  3. 统计页「今天」走势图从 4 小时一段改为 **2 小时一段**（00:00、02:00、04:00 … 22:00），横轴显示具体时间，tooltip 显示完整时段（如 14:00–16:00）。
- **为什么**：反馈区文字冗余，去掉后更干净；识别码操作按钮与输入框同行更紧凑；2 小时分段比 4 小时更细粒度，能更清楚看到一天中专注的时间分布。
- **影响范围**：设置页反馈区、识别码区布局；统计页「今天」走势图横轴分段与 tooltip。

### 给 AI 看（Technical Details）
- **涉及文件**：
  - `src/components/Settings/SettingsPanel.tsx` — 反馈 section 移除 `<p className="settings-hint">`；识别码 section 重构：input 包裹在 `<div className="sync-code-row">` 内，右侧内嵌 `<button className="btn icon">` 显示 `Eye`/`EyeOff`（切换 `codeVisible`）与 `Copy`（复制识别码）；新增 `Eye`、`EyeOff` icon import；生成码、启用新码、加载已有码按钮留在 `.settings-actions` 下方。
  - `src/components/Stats/StatsOverview.tsx` — `DAY_SLOT_HOURS` 由 `[0, 4, 8, 12, 16, 20]` 改为 `[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]`（12 段）；`slotOf` 由 `Math.floor(hour / 4)` 改为 `Math.floor(hour / 2)`；slot label 由 `"00-03"` 改为 `"00:00"` 格式；`trendPoints` title 改为 `"00:00–02:00"` 格式（tooltip 显示完整时段）。
  - `src/index.css` — 新增 `.sync-code-row`（`display: flex; gap: 4px`，input 用 `flex: 1` 自动填充宽度）、`.btn.icon`（32px 方形图标按钮，边框 + hover 高亮）、`.btn.icon:disabled` 样式。
- **接口 / 数据模型变化**：无。
- **关键实现细节 / 注意事项**：
  - `sync-code-row` 里的 input 从 `.settings-row input` 继承 `width: 200px`，通过 `flex: 1; min-width: 0; width: auto` 覆盖为自适应宽度，确保在不同屏幕宽度下按钮不溢出。
  - 2 小时分段产生 12 个横轴标签，需注意 `maxTicksLimit` 不应低于 12；当前 `isCompact ? 8 : 7` 对 day 模式不适用（`isCompact` 仅 month 为 true），day 模式走 `maxTicksLimit: 7` — 实际渲染时 Chart.js 会自动调整标签密度，12 个标签在正常宽度下可完整显示。
  - tooltip 回调使用 `trendPoints[dataIndex].title`，已更新为 `HH:00–HH+2:00` 格式。
- **验证方式**：`npm run lint` 通过、`npm run build`（`tsc -b && vite build`）通过、`npm run test:logic` 35/35 通过。手测：设置页 → 反馈区仅标题和按钮；识别码输入框右侧有小眼睛和复制图标；统计页 → 今天 → 走势图横轴显示 00:00–22:00 每 2 小时一段。
- **后续待办 / 已知问题**：无新增。

### 给人看（Human Summary）
- **改了什么**：顶部组数圆点左侧新增「−」缩减组数按钮（Minus 图标），与右侧「+」对称排列，整体居中；组数已为最小值 2 时「−」自动变灰禁用。
- **为什么**：此前只能通过顶部「+」增加组数，无法在 UI 中减少组数（只能去设置页改），补充「−」按钮使增减操作对称完整。
- **影响范围**：计时器页顶部组数标记区域；设置页 `longBreakInterval` 输入框行为不变。

### 给 AI 看（Technical Details）
- **涉及文件**：
  - `src/App.tsx` — import 新增 `Minus`；新增 `handleRemoveGroup`（调用 `normalizeSettings({ ...s, longBreakInterval: s.longBreakInterval - 1 })`）；`.cycle-indicator` 内左侧新增 `<button className="add-group-btn" disabled={settings.longBreakInterval <= 2} onClick={handleRemoveGroup} title={t('removeGroup')}><Minus size={14} /></button>`，圆点两侧对称。
  - `src/i18n/LanguageContext.tsx` — 新增 `removeGroup`（zh: `减少组数`，en: `Remove group`）。
  - `src/index.css` — `.cycle-indicator` 新增 `gap: 8px` 统一间距；`.add-group-btn` 去掉 `margin-left`，新增 `:disabled` 样式（`opacity: 0.35; cursor: default`），`:hover:not(:disabled)` 替代原 `:hover`。
- **接口 / 数据模型变化**：无。`longBreakInterval` 范围仍为 `[2, 10]`（由 `normalizeSettings` 中 `clampInteger` 控制），减至 2 时按钮禁用。
- **关键实现细节 / 注意事项**：
  - `handleRemoveGroup` 与 `handleAddGroup` 同样经 `normalizeSettings` 处理，不会跌破最小值；禁用仅作 UI 提示，`normalizeSettings` 本身已有兜底。
  - `.cycle-indicator` 已有 `justify-content: center`，加 `gap: 8px` 后三个子元素（`[-]` `[dots]` `[+]`）自然居中对称。
- **验证方式**：`npm run lint` 通过、`npm run build`（`tsc -b && vite build`）通过、`npm run test:logic` 35/35 通过。手测：顶部圆点左右「−」「+」对称居中；点「−」组数减 1 圆点同步减少；组数为 2 时「−」变灰不可点；组数为 10 时「+」变灰不可点。
- **后续待办 / 已知问题**：无新增。

---

## 2026-08-18 — 恢复「跳过当前阶段」按钮，「增加组数」移到顶部组数标记旁

### 给人看（Human Summary）
- **改了什么**：计时器下方控制区恢复「跳过当前阶段」按钮（SkipForward 图标），专注、短休息、长休息任一阶段都可一键跳到下一阶段；「增加组数」按钮不再占用控制区，改为放在顶部组数标记（圆点）右侧的小「+」按钮。
- **为什么**：此前某次改动把「跳过当前阶段」替换成了「增加组数」，导致跳过阶段的功能消失；用户希望恢复跳过功能，同时把「增加组数」放回顶部组数标记之后，控制区回到「结束并记录本轮 / 开始暂停 / 跳过」三个按钮。
- **影响范围**：计时器页控制区布局与顶部组数标记旁新增小按钮；跳过/增加组数的功能行为不变（分别调用 `timer.skip` 与 `handleAddGroup`）。

### 给 AI 看（Technical Details）
- **涉及文件**：
  - `src/components/Timer/TimerControls.tsx` — import 由 `Plus` 改回 `SkipForward`；props 由 `onAddGroup` 改回 `onSkip`；第三个按钮由「增加组数」改回 `<button className="ctrl-btn secondary" onClick={onSkip} title={t('skipStage')}><SkipForward size={18} /></button>`。
  - `src/App.tsx` — 新增 `import { Plus } from 'lucide-react'`；`.cycle-indicator` 内、`.cycle-dots` 之后新增 `<button className="add-group-btn" onClick={handleAddGroup} title={t('addGroup')}><Plus size={14} /></button>`；`TimerControls` 使用处 `onAddGroup={handleAddGroup}` 改为 `onSkip={timer.skip}`。
  - `src/index.css` — 新增 `.add-group-btn` 样式（22px 圆形虚线边框按钮，hover 变强调色）。
  - `test/timerInteractions.test.ts` — 断言由 `controls` 匹配 `onAddGroup` / 不匹配 `onSkip` 改为匹配 `onSkip` / 不匹配 `onAddGroup`，并新增 `app` 匹配 `add-group-btn`、`onClick={handleAddGroup}` 与 `styles` 匹配 `.add-group-btn`。
- **接口 / 数据模型变化**：无。`timer.skip` 与 `handleAddGroup` 均已存在，本次仅改 UI 挂接与样式。
- **关键实现细节 / 注意事项**：
  - 跳过功能原本就在 `useTimer` 里暴露为 `skip()`，此前只是按钮被 `onAddGroup` 替换掉了；恢复时直接接线 `onSkip={timer.skip}` 即可，无需改 hook。
  - 「增加组数」按钮与顶部组数圆点同处 `.cycle-indicator`（已是 flex 居中容器），因此用 `margin-left: 8px` 排布，无需额外包裹层。
  - `handleAddGroup` 逻辑未变（`longBreakInterval + 1` 并 `normalizeSettings`），仍由 App 层持有。
- **验证方式**：`npm run lint` 通过、`npm run build`（`tsc -b && vite build`）通过、`npm run test:logic`（35/35 通过）。手测：进入计时器，专注/休息阶段点「跳过」按钮可直接切到下一阶段；顶部圆点右侧「+」点击后组数 +1 且圆点数同步增加。
- **后续待办 / 已知问题**：无新增。

---

## 2026-08-18 — 设置页新增「反馈」按钮，反馈内容一并存入数据仓库

### 给人看（Human Summary）
- **改了什么**：设置页新增「反馈」板块与「提交反馈」按钮，点击弹出输入框填写意见后提交；反馈会跟随当前识别码，与任务/番茄数据一样存入你的私有数据仓库（GitHub），实现持久化。
- **为什么**：让用户能直接提交建议或问题，且反馈随个人数据仓库一起保存，便于后续统一查看。
- **影响范围**：设置页新增反馈入口与弹窗；数据仓库新增 `feedback.json` 文件；其余同步、任务、统计逻辑不变。

### 给 AI 看（Technical Details）
- **涉及文件**：
  - `api/file.ts` — `ALLOWED_PATH` 增加 `feedback\.json`，放行反馈文件的读写。
  - `src/types/index.ts` — 新增 `FeedbackEntry`（`id` / `createdAt` / `content` / `language` / `userAgent?`）。
  - `src/services/github.ts` — 新增 `FEEDBACK_PATH = 'feedback.json'` 与 `saveFeedback(syncCode, entry)`：读旧文件 → 追加新条目 → 带 sha 写回，`SyncConflictError` 时最多重试 3 次。
  - `src/App.tsx` — 新增 `handleSubmitFeedback`（构造 `FeedbackEntry` 并调用 `saveFeedback(activeSyncCode, entry)`），把 `onSubmitFeedback` 传给 `SettingsPanel`。
  - `src/components/Settings/SettingsPanel.tsx` — props 增加 `onSubmitFeedback`；新增「反馈」section + 提交按钮 + 反馈弹窗（textarea、提交/取消、loading/成功/失败提示），并引入 `MessageSquare` 图标。
  - `src/i18n/LanguageContext.tsx` — 新增 `feedback` / `feedbackHint` / `submitFeedback` / `feedbackPlaceholder` / `submitting` / `submit`（zh/en）。
  - `src/index.css` — 新增 `.feedback-modal` / `.feedback-textarea` 样式。
- **接口 / 数据模型变化**：
  - 新增类型 `FeedbackEntry`；数据仓库新增文件 `profiles/{profileId}/feedback.json`，结构 `{ items: FeedbackEntry[] }`。
  - 服务端 `ALLOWED_PATH` 放行 `feedback.json`（仍只允许白名单路径，未放宽其他）。
- **关键实现细节 / 注意事项**：
  - 反馈文件复用 `getFile` / `putFile` 与乐观并发（sha）机制，冲突时重试 3 次，与 `history.json` / `config.json` 同模式。
  - 反馈以「追加」方式写入独立文件，不参与 config/history 的合并逻辑，避免污染现有同步合并；也不进 localStorage 缓存。
  - 无识别码时设置页不渲染（`App` 层 `SyncCodeGate` 兜底），故提交时 `activeSyncCode` 必存在。
  - 内容前端 `trim()` + `maxLength={2000}`，空内容禁用提交按钮；提交失败时区分 `Failed to fetch`（网络/服务不可达）与普通错误文案。
- **验证方式**：`npm run build`（`tsc -b && vite build` 通过）、`npm run typecheck:api`（`tsc -p api/tsconfig.json` 通过）、`npm run test:logic`（35/35 通过）、`npm run lint` 通过。手测：设置 → 反馈 → 输入意见 → 提交 → 出现成功提示；到私有数据仓库查看 `profiles/{hash}/feedback.json` 出现新条目。
- **后续待办 / 已知问题**：反馈目前仅落库，无后台查看界面；如需管理端读取/汇总反馈，需另建只读入口（暂不实施）。

---

## 2026-08-18 — 统计图「专注时长」柱子改为浅金色

### 给人看（Human Summary）
- **改了什么**：统计页综合走势图与周报/月报组合柱状图中，「专注时长」的柱子由偏蓝改为浅金色；左侧「分钟」坐标轴刻度与标题改用更深的金色以保证浅色卡片上可读。番茄数（暖橙红）、完成任务（绿色）保持不变。
- **为什么**：用户希望专注时长以浅金色呈现，与另外两种指标区分更柔和、更醒目。
- **影响范围**：统计页「今天 / 近七天 / 近一个月」走势图、周报/月报弹窗组合柱状图的时长柱子与左侧坐标轴颜色；数据模型与同步逻辑不变。

### 给 AI 看（Technical Details）
- **涉及文件**：
  - `src/components/Stats/StatsOverview.tsx` — `durationColor` 由 `mixRgb(hexToRgb(accentLight), hexToRgb('#5b8c9e'), 0.65)`（偏蓝）改为 `mixRgb(hexToRgb(accentLight), hexToRgb('#e8c87a'), 0.7)`（浅金，仍随主题强调色轻微偏移）；新增 `durationAxisColor = mixRgb(durationColor, hexToRgb('#8a6a2f'), 0.5)`（更深的金，用于坐标轴文字）。`trendOptions.scales.minutes` 与 `combinedBarOpts.scales.minutes` 的 `ticks.color` / `title.color` 由 `rgba(durationColor, 1)` 改为 `rgba(durationAxisColor, 1)`；柱子本身继续用 `durationColor`。
- **接口 / 数据模型变化**：无（仅渲染期颜色派生）。
- **关键实现细节 / 注意事项**：
  - `durationColor` 同时被柱子（`backgroundColor`/`borderColor`）与左轴文字（`ticks`/`title`）复用；浅金作为文字在浅色卡片上对比度不足，故拆出 `durationAxisColor` 专供轴文字，柱子保持浅金。
  - `pomodoroColor`、`tasksColor` 未改动，避免破坏既有区分度。
- **验证方式**：`npm run build`（`tsc -b && vite build` 通过）、`npm run test:logic`（35/35 通过）、`npm run lint` 通过。手测：统计页走势图「专注时长」为浅金柱子，左轴刻度/标题为可读的深金；切不同主题柱子仍随主题轻微变化。
- **后续待办 / 已知问题**：无新增。

---

## 2026-08-18 — 饼图图例支持点击隐藏/显示对应板块

### 给人看（Human Summary）
- **改了什么**：统计页「板块占比」饼图、以及周报/月报弹窗里的「板块分布」饼图，点击右侧图例的某一项，即可隐藏或重新显示该分类对应的扇形；隐藏的图例会变淡并加删除线，再点一次恢复。综合走势柱状图顶部的图例本就支持点击开关（Chart.js 原生行为），本次未变。
- **为什么**：此前饼图图例是自定义 HTML 列表，只能看不能点；想暂时屏蔽某个分类、只看其余分类的占比对比时做不到。
- **影响范围**：统计页饼图图例、周报/月报弹窗饼图图例；数据模型与同步逻辑不变。

### 给 AI 看（Technical Details）
- **涉及文件**：
  - `src/components/Stats/StatsOverview.tsx` — 新增 scoped 隐藏状态 `hiddenCats` / `reportHiddenCats`（形如 `{ scope: string; labels: ReadonlySet<string> }`）与 `toggleCat` / `toggleReportCat`；主饼与报告饼的 `pieData` 改为由 `visiblePieCategories`（过滤隐藏项）派生，tooltip 百分比分母改用 `visiblePieTotal`；图例项加 `onClick`、`role="button"`、`tabIndex={0}`、`aria-pressed`、键盘 Enter/Space 与 `title`（用新 i18n key）。
  - `src/i18n/LanguageContext.tsx` — 新增 `hideCategory`（zh「点击隐藏该板块」/ en「Click to hide this category」）、`showCategory`（zh「点击显示该板块」/ en「Click to show this category」）。
  - `src/index.css` — `.pie-legend-item` / `.report-pie-item` 增加 `cursor: pointer`，并新增 `.pie-legend-item.hidden` / `.report-pie-item.hidden`（`opacity: 0.4; text-decoration: line-through;`）。
- **接口 / 数据模型变化**：无（仅组件内部 UI 状态与图例交互；存储、同步、图表数据口径均不变）。
- **关键实现细节 / 注意事项**：
  - 隐藏状态带 `scope` 而非用 effect 清空：`react-hooks/set-state-in-effect` 规则禁止在 effect 内同步 setState，故改为「读取时若 `scope` 不匹配当前 `period:chartMetric`（主饼）或 `showReport`（报告饼）就当作空集」，切换指标/周期/打开报告天然回到全显，无需 effect。
  - 全部隐藏后仍保留图例可点回恢复：外层条件从 `pieData ?` 改为 `pieCategories.length > 0`，图表区在 `visiblePieCategories.length === 0` 时显示 `chart-empty`。
  - 柱状图顶部图例的开关是 Chart.js 默认 `onClick`（`chart.hide/show` + `legendItem.hidden`）行为，本项目未覆盖、未改动。
  - 图例项为可聚焦元素（`role="button"` + `tabIndex` + 键盘事件），保证键盘可操作。
- **验证方式**：`npm run build`（`tsc -b && vite build` 通过）、`npm run test:logic`（35/35 通过）、`npm run lint` 通过。手测：统计页饼图点图例项 → 对应扇形消失、图例变淡划线，再点恢复；周报/月报弹窗内饼图同理；切换「时长/番茄/任务」指标后隐藏状态重置。
- **后续待办 / 已知问题**：无新增。

---

## 2026-08-18 — 统计图「完成任务」改为绿色系并与「专注时长」明显区分；「其他」改为完全不可修改的固定默认分类

### 给人看（Human Summary）
- **改了什么**：
  1. 统计页柱状图（今天 / 近七天 / 近一个月走势图 + 周报/月报组合柱状图）中，「完成任务」柱子改以绿色系为主（贴近 `#4caf50`），「专注时长」柱子改得更偏蓝（`#5b8c9e` 权重加大），两者色相差异明显，不再相近难辨；「番茄数」柱子保持暖橙红不变。
  2. 「其他」分类由「可改名改色、仅不可删除」收紧为**完全不可修改的固定默认设置**：分类面板里「其他」不再显示 ✎ 编辑按钮，改名/改色入口被封死，名称与颜色恒为默认值。
- **为什么**：上一版「完成任务」用的是偏灰的草绿、与偏蓝的「专注时长」观感接近，用户反馈区分不大；「其他不可修改就是默认设置」——它是未分配专注的系统兜底，不应允许任何自定义。
- **影响范围**：统计页所有柱状图的三色观感；添加任务分类面板里「其他」的编辑入口（删除按钮仍保持禁用，未变）；数据模型与同步逻辑不变。

### 给 AI 看（Technical Details）
- **涉及文件**：
  - `src/components/Stats/StatsOverview.tsx` — 颜色派生三行改为：`durationColor = mixRgb(hexToRgb(accentLight), hexToRgb('#5b8c9e'), 0.65)`（原 0.45，更偏蓝）、`tasksColor = mixRgb(hexToRgb(accentLight), hexToRgb('#4caf50'), 0.72)`（原 `#6f9e6b` 权重 0.5，改为明确绿色且更接近绿色基准）、`pomodoroColor` 不变（`mixRgb(hexToRgb(accent), hexToRgb('#d2704a'), 0.3)`）。
  - `src/components/TodoList/AddTodo.tsx` — `category-chip-edit`（✎）按钮整体包进 `{cat.name !== OTHER_CATEGORY_NAME && (...)}`，「其他」不再渲染编辑按钮。
  - `src/App.tsx` — `handleRenameCategory` 顶部新增 `if (oldName === OTHER_CATEGORY_NAME) return;`，App 层守卫禁止改名/改色「其他」。
  - `src/types/index.ts` — 顶部注释由「名称固定为常量，颜色可改」改为「名称与颜色均为固定默认值，不可修改、不可删除」。
- **接口 / 数据模型变化**：无（`OTHER_CATEGORY_NAME` / `OTHER_CATEGORY_COLOR` 常量不变；仅 UI 入口 + 守卫 + 颜色派生参数）。
- **关键实现细节 / 注意事项**：
  - 「其他」不可修改采用双层防护：UI 层隐藏 ✎（AddTodo）+ 逻辑层守卫 `handleRenameCategory` 直接 return，防止未来新增入口绕过 UI；删除保护沿用上一版的双层（App 守卫 + 删除按钮 disabled）。
  - 三色语义最终定为：时长偏蓝（`accentLight` 与 `#5b8c9e` 0.65 混合）、番茄偏暖橙红（`accent` 与 `#d2704a` 0.3）、任务偏绿（`accentLight` 与 `#4caf50` 0.72），仍各自随主题强调色偏移，保证「不同主题颜色不同」与「三者可区分」同时成立。
  - `pomodoroColor` 未改动，避免与任务绿、时长蓝的既有区分度被破坏。
- **验证方式**：`npm run build`（`tsc -b && vite build` 通过）、`npm run test:logic`（35/35 通过）、`npm run lint` 通过。手测：统计页切不同主题看柱状图，任务绿与时长蓝明显可辨；添加任务 → 分类面板，「其他」无 ✎ 只有禁用的 ×，其余分类 ✎/× 正常。
- **后续待办 / 已知问题**：若未来希望「其他」颜色也能跟随某主题（如深色主题下更柔和），当前仍是固定 `#b08968`，可另行评估；暂不实施。

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
