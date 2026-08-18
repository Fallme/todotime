import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import type { Todo } from '../src/types/index.ts';
import { buildMonthlyRecurrence, completeTodo, getMonthlyRecurrenceDays, getNextTaskRefreshAt, getTodoCompletionRecords, refreshRecurringTodos, shouldArchiveCompletion } from '../src/utils/taskRecurrence.ts';
import { mergeTodo } from '../src/utils/todoMerge.ts';

function task(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 'task-1', title: 'Read', priority: 'medium', category: 'Study',
    estimatedPomodoros: 0, completedPomodoros: 3, pomodoroRecordIds: ['p1', 'p2', 'p3'],
    legacyPomodoroCount: 0, done: false, abandoned: false,
    createdAt: '2026-08-14T08:00:00.000Z', updatedAt: '2026-08-14T08:00:00.000Z',
    completedAt: '', abandonedAt: '', subtasks: [], deletedAt: '', recurrence: 'daily',
    nextRefreshAt: '', completionHistory: [], ...overrides,
  };
}

test('recurring due dates support day intervals weekdays and monthly dates', async () => {
  const at = '2026-08-14T08:00:00.000Z';
  const daily = new Date(getNextTaskRefreshAt(at, 'daily'));
  const alternate = new Date(getNextTaskRefreshAt(at, 'everyOtherDay'));
  const everyTwoDays = new Date(getNextTaskRefreshAt(at, 'everyTwoDays'));
  const weekly = new Date(getNextTaskRefreshAt(at, 'weekly'));
  const weekdays = new Date(getNextTaskRefreshAt('2026-08-14T08:00:00', 'weekly:1,3'));
  const monthly = new Date(getNextTaskRefreshAt('2026-08-14T08:00:00', 'monthly:20'));
  const monthlyMultiple = new Date(getNextTaskRefreshAt('2026-08-14T08:00:00', 'monthly:10,20,28'));
  const monthEnd = new Date(getNextTaskRefreshAt('2026-08-31T08:00:00', 'monthly:31'));
  assert.equal(daily.getHours(), 0);
  assert.equal(alternate.getHours(), 0);
  assert.equal(weekly.getHours(), 0);
  assert.equal(Math.round((alternate.getTime() - daily.getTime()) / 86_400_000), 1);
  assert.equal(Math.round((everyTwoDays.getTime() - daily.getTime()) / 86_400_000), 2);
  assert.equal(Math.round((weekly.getTime() - daily.getTime()) / 86_400_000), 6);
  assert.equal(weekdays.getDay(), 1);
  assert.equal(monthly.getDate(), 20);
  assert.equal(monthlyMultiple.getDate(), 20);
  assert.equal(monthEnd.getMonth(), 8);
  assert.equal(monthEnd.getDate(), 30);
  assert.equal(buildMonthlyRecurrence([28, 1, 15, 15]), 'monthly:1,15,28');
  assert.deepEqual(getMonthlyRecurrenceDays('monthly:1,15,28'), [1, 15, 28]);

  const addTodo = await readFile(new URL('../src/components/TodoList/AddTodo.tsx', import.meta.url), 'utf8');
  const monthlyCalendar = await readFile(new URL('../src/components/TodoList/MonthlyRecurrenceCalendar.tsx', import.meta.url), 'utf8');
  assert.match(addTodo, /'everyTwoDays'/);
  assert.match(addTodo, /recurrence-modal-options/);
  assert.match(addTodo, /weekdayOptions/);
  assert.match(addTodo, /MonthlyRecurrenceCalendar/);
  assert.match(monthlyCalendar, /length: 31/);
  assert.match(monthlyCalendar, /可多选/);
});

test('only completions before the current month are archived', () => {
  const now = new Date('2026-08-20T12:00:00');
  assert.equal(shouldArchiveCompletion('2026-08-01T08:00:00', now), false);
  assert.equal(shouldArchiveCompletion('2026-07-31T23:59:59', now), true);
  assert.equal(shouldArchiveCompletion('2025-12-20T08:00:00', now), true);
});

test('due recurring tasks reopen without losing counters or completion history', () => {
  const completed = completeTodo(task(), '2026-08-14T08:00:00.000Z', 'done-1');
  const [reopened] = refreshRecurringTodos([completed], '2026-08-15T08:00:00.000Z');
  assert.equal(reopened.done, false);
  assert.equal(reopened.completedPomodoros, 3);
  assert.deepEqual(reopened.pomodoroRecordIds, ['p1', 'p2', 'p3']);
  assert.deepEqual(getTodoCompletionRecords(reopened), [{ id: 'done-1', completedAt: '2026-08-14T08:00:00.000Z' }]);
});

test('weekly tasks stay completed until their due time', () => {
  const completed = completeTodo(task({ recurrence: 'weekly' }), '2026-08-14T08:00:00.000Z', 'done-1');
  const input = [completed];
  const result = refreshRecurringTodos(input, '2026-08-20T08:00:00.000Z');
  assert.equal(result, input);
  assert.equal(result[0].done, true);
});

test('completion history from multiple devices is merged without duplicates', () => {
  const local = completeTodo(task({ updatedAt: '2026-08-14T09:00:00.000Z' }), '2026-08-14T09:00:00.000Z', 'device-a');
  const remote = completeTodo(task({ updatedAt: '2026-08-14T09:01:00.000Z' }), '2026-08-14T09:01:00.000Z', 'device-b');
  assert.deepEqual(getTodoCompletionRecords(mergeTodo(local, remote)).map(record => record.id), ['device-a', 'device-b']);
});
