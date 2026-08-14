import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MOTIVATION_QUOTES, nextQuoteIndex } from '../src/utils/motivation.ts';

test('motivation library offers varied Chinese and English copy', () => {
  assert.ok(MOTIVATION_QUOTES['zh-CN'].length >= 10);
  assert.equal(MOTIVATION_QUOTES.en.length, MOTIVATION_QUOTES['zh-CN'].length);
  assert.equal(nextQuoteIndex(0, 12, () => 0), 1);
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
  assert.doesNotMatch(controls, /onFinishRound/);
  assert.match(app, /className="cycle-skip-btn"/);
  assert.match(app, /className="cycle-dots"/);
  assert.match(app, /timer\.skipRound\(\)/);
  assert.match(app, /跳过并结算整轮/);
  assert.doesNotMatch(app, /timer\.mode === 'work'[\s\S]{0,200}cycle-skip-btn/);
  assert.match(hook, /const skipRound = useCallback/);
  assert.match(hook, /cycleCountRef\.current = 0/);
  assert.match(hook, /setCycleCount\(0\)/);
  assert.match(controls, /skipStage/);
  assert.match(controls, /aria-label={t\('skipStage'\)}/);
  assert.match(styles, /\.tab-nav\s*\{[\s\S]*?background: var\(--bg\);[\s\S]*?backdrop-filter: none/);
  assert.match(styles, /\.cycle-dots\s*\{[^}]*position: relative/);
  assert.match(styles, /\.cycle-skip-btn\s*\{[^}]*position: absolute/);
  assert.match(todos, /todo-list-header[\s\S]*manual-focus-open[\s\S]*todo-header-stats/);
  assert.doesNotMatch(stats, /type: 'line'/);
  assert.match(assignment, /onSkip/);
  assert.match(assignment, /跳过分配/);
  assert.match(app, /addCompletedTodo\(input\.newTaskTitle, 'medium', input\.category, input\.endAt\)/);
  assert.match(todoHook, /const addCompletedTodo = useCallback/);
  assert.match(todoHook, /completeTodo\(baseTodo, completionTime/);
  assert.match(manualFocus, /新任务名称（保存后自动完成）/);
});
