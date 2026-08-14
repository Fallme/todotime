import test from 'node:test';
import assert from 'node:assert/strict';
import type { Todo } from '../src/types/index.ts';
import { completeTodo, getNextTaskRefreshAt, getTodoCompletionRecords, refreshRecurringTodos } from '../src/utils/taskRecurrence.ts';
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

test('recurring due dates use daily alternate and weekly intervals', () => {
  const at = '2026-08-14T08:00:00.000Z';
  const daily = new Date(getNextTaskRefreshAt(at, 'daily'));
  const alternate = new Date(getNextTaskRefreshAt(at, 'everyOtherDay'));
  const weekly = new Date(getNextTaskRefreshAt(at, 'weekly'));
  assert.equal(daily.getHours(), 0);
  assert.equal(alternate.getHours(), 0);
  assert.equal(weekly.getHours(), 0);
  assert.equal(Math.round((alternate.getTime() - daily.getTime()) / 86_400_000), 1);
  assert.equal(Math.round((weekly.getTime() - daily.getTime()) / 86_400_000), 6);
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
