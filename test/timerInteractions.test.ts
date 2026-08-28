import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MOTIVATION_QUOTES, nextQuoteIndex } from '../src/utils/motivation.ts';
import { formatHours } from '../src/utils/dateUtils.ts';

test('motivation library offers varied Chinese and English copy', () => {
  assert.ok(MOTIVATION_QUOTES['zh-CN'].length >= 10);
  assert.equal(MOTIVATION_QUOTES.en.length, MOTIVATION_QUOTES['zh-CN'].length);
  assert.equal(nextQuoteIndex(0, 12, () => 0), 1);
});

test('quick starting a task prepares and plays the fresh-start cue', async () => {
  const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const hook = await readFile(new URL('../src/hooks/useTimer.ts', import.meta.url), 'utf8');

  assert.match(app, /document\.addEventListener\('click', unlock, \{ capture: true, once: true \}\)/);
  assert.match(app, /const handleQuickStart = \(todo: Todo\) => \{[\s\S]*?timer\.startWork\(\);[\s\S]*?\};/);
  assert.match(app, /const handleQuickStartSubtask = \(subtask:[\s\S]*?timer\.startWork\(\);[\s\S]*?\};/);
  assert.match(hook, /const startWork = useCallback\(\(\) => \{[\s\S]*?playSound\(playStart\);[\s\S]*?\}, \[clearTimer, playSound\]\);/);
});

test('focus totals use a compact one-decimal hour format', async () => {
  assert.equal(formatHours(0), '0.0h');
  assert.equal(formatHours(30), '0.5h');
  assert.equal(formatHours(65), '1.1h');
  assert.equal(formatHours(326), '5.4h');

  const overview = await readFile(new URL('../src/components/Stats/StatsOverview.tsx', import.meta.url), 'utf8');
  assert.match(overview, /formatHours\(activeData\.totalMinutes\)/);
  assert.match(overview, /formatHours\(rd\.totalMinutes\)/);
  assert.doesNotMatch(overview, /activeData\.totalMinutes\}m/);
});

test('reset settles the session and clears cycle progress to group zero', async () => {
  const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const hook = await readFile(new URL('../src/hooks/useTimer.ts', import.meta.url), 'utf8');

  assert.match(app, /onNewRound=\{timer\.reset\}/);
  assert.match(hook, /const reset = useCallback\(\(\) => \{[\s\S]*?endNow\(\);[\s\S]*?cycleCountRef\.current = 0;[\s\S]*?setCycleCount\(0\);[\s\S]*?\}, \[endNow\]\);/);
});

test('timer separates whole-cycle settlement from stage skipping', async () => {
  const controls = await readFile(new URL('../src/components/Timer/TimerControls.tsx', import.meta.url), 'utf8');
  const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const hook = await readFile(new URL('../src/hooks/useTimer.ts', import.meta.url), 'utf8');
  const todos = await readFile(new URL('../src/components/TodoList/TodoList.tsx', import.meta.url), 'utf8');
  const stats = await readFile(new URL('../src/components/Stats/StatsOverview.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');
  const assignment = await readFile(new URL('../src/components/Timer/TaskAssignModal.tsx', import.meta.url), 'utf8');
  const todoHook = await readFile(new URL('../src/hooks/useTodos.ts', import.meta.url), 'utf8');
  const manualFocus = await readFile(new URL('../src/components/Timer/ManualFocusModal.tsx', import.meta.url), 'utf8');
  const sound = await readFile(new URL('../src/utils/sound.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(controls, /onFinishRound/);
  assert.doesNotMatch(app, /cycle-skip-btn/);
  assert.match(app, /className="cycle-dots"/);
  assert.doesNotMatch(app, /timer\.skipRound\(\)/);
  assert.doesNotMatch(app, /跳过并结算整轮/);
  assert.doesNotMatch(hook, /const skipRound = useCallback/);
  assert.match(hook, /cycleCountRef\.current = 0/);
  assert.match(hook, /setCycleCount\(0\)/);
  assert.match(controls, /onSkip/);
  assert.doesNotMatch(controls, /onAddGroup/);
  assert.match(app, /add-group-btn/);
  assert.match(app, /onClick=\{handleAddGroup\}/);
  assert.match(styles, /\.add-group-btn/);
  assert.match(styles, /\.tab-nav\s*\{[\s\S]*?background: var\(--bg\);[\s\S]*?backdrop-filter: none/);
  assert.match(styles, /\.cycle-dots\s*\{[^}]*position: relative/);
  assert.doesNotMatch(styles, /\.cycle-skip-btn/);
  assert.doesNotMatch(styles, /:root:not\(\[data-theme="tomato"\]\) \.status-tab,/);
  assert.doesNotMatch(styles, /:root:not\(\[data-theme="tomato"\]\) \.report-tab,/);
  assert.match(todos, /todo-list-header[\s\S]*manual-focus-open[\s\S]*todo-header-stats/);
  assert.doesNotMatch(stats, /type: 'line'/);
  assert.match(assignment, /onSkip/);
  assert.match(assignment, /跳过分配/);
  assert.match(app, /addCompletedTodo\(input\.newTaskTitle, 'medium', input\.category, input\.endAt\)/);
  assert.match(todoHook, /const addCompletedTodo = useCallback/);
  assert.match(todoHook, /completeTodo\(baseTodo, completionTime/);
  assert.match(manualFocus, /新任务名称（保存后自动完成）/);
  assert.match(styles, /data-theme="tomato"[^}]*timer-ring-container\[data-mode="work"\]::after[\s\S]*?right: -5px[\s\S]*?width: 78px/);
  assert.match(sound, /export function playPause/);
  assert.match(sound, /export function playResume/);
  assert.match(sound, /export function playEnd/);
  assert.match(hook, /playSound\(isResume \? playResume : playStart\)/);
  assert.match(hook, /playSound\(playPause\)/);
  assert.match(hook, /playSound\(playEnd\)/);
  assert.match(app, /lazy\(\(\) => import\('\.\/components\/Stats\/StatsOverview'\)/);
  assert.match(app, /timer\.importPomodoros\(data\.todayPomodoros\)/);
  // 已选任务时专注完成直接归到当前任务，不进入待分配结算弹窗
  assert.match(hook, /const requiresAssignment = !task\?\.id/);
  assert.match(hook, /if \(requiresAssignment\) \{[\s\S]*?setGroupPhase\('settle'\)/);
});
